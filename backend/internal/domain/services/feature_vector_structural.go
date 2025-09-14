package services

import (
	"bytes"
	"net/url"
	"os"
	"strings"
	"unicode"

	"github.com/abadojack/whatlanggo"
	"golang.org/x/net/html"
)

// StructuralSignals holds lightweight structural & language heuristics extracted from HTML.
type StructuralSignals struct {
	H1Count           int
	LinkInternalCount int
	LinkExternalCount int
	LinkInternalRatio float64
	PrimaryLang       string  // ISO 639-1 where detected otherwise 'und'
	LangConfidence    float64 // 0..1 proportion of ascii letters among all letters (current heuristic)
}

// parseStructuralSignals parses raw HTML and extracts basic structural metrics and a naïve language guess.
// It is intentionally lightweight: a single pass DOM walk, no allocations beyond counters & small buffers.
// Language heuristic (phase 4 baseline): classify as 'en' if >=40 letters and >=85% ASCII letters; else 'und'.
// Trigram tables: minimal weighted sets for language hinting.
// This map is intended to be immutable and should not be modified at runtime.
var languageTrigrams = map[string]map[string]int{
	"en": {" the": 6, "the": 5, "and": 4, "ing": 4, "ion": 3, "ent": 3, "her": 2, "ati": 2, "ver": 1, "est": 1},
	"es": {" que": 7, "que": 6, "ción": 5, " una": 4, " por": 4, " los": 4, " las": 4, "ado": 3, "ente": 3},
	"fr": {" que": 5, "que": 4, "ent": 4, "ion": 3, " les": 4, " des": 4, " une": 3, "ais": 3, "est": 2, "pour": 3},
	"de": {" der": 5, " die": 5, "die": 4, "und": 6, "sch": 4, "ein": 4, "ich": 4, "den": 3, "che": 2, "auf": 3},
}

func parseStructuralSignals(raw []byte, finalURL string) StructuralSignals {
	var out StructuralSignals
	if len(raw) == 0 {
		return out
	}
	advancedLang := false
	if v, ok := os.LookupEnv("ENABLE_ADVANCED_LANG_DETECT"); ok && (v == "1" || strings.EqualFold(v, "true")) {
		advancedLang = true
	}
	// Parse HTML
	doc, err := html.Parse(bytes.NewReader(raw))
	if err != nil {
		return out
	}

	// Determine host for internal/external link classification
	var host string
	if u, err := url.Parse(finalURL); err == nil && u.Host != "" {
		host = strings.ToLower(u.Host)
	}

	// Text accumulation metrics & language scoring sample
	totalLetters := 0
	asciiLetters := 0
	var textSample strings.Builder
	textBudget := 8192 // capture up to 8KB of visible text

	// Node types to skip for text
	skipTags := map[string]struct{}{"script": {}, "style": {}, "noscript": {}, "head": {}, "meta": {}, "title": {}}

	var walk func(*html.Node, bool)
	walk = func(n *html.Node, inSkipped bool) {
		if n.Type == html.ElementNode {
			tag := n.DataAtom.String()
			if _, skip := skipTags[tag]; skip {
				inSkipped = true
			}
			if tag == "h1" {
				out.H1Count++
			}
			if tag == "a" {
				var href string
				for _, attr := range n.Attr {
					if attr.Key == "href" {
						href = strings.TrimSpace(attr.Val)
						break
					}
				}
				if href != "" && !strings.HasPrefix(href, "#") {
					// Filter non-http(s) pseudo schemes
					lower := strings.ToLower(href)
					if strings.HasPrefix(lower, "javascript:") || strings.HasPrefix(lower, "mailto:") || strings.HasPrefix(lower, "tel:") {
						// ignore
					} else {
						internal := false
						if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "//") {
							// Absolute; parse host
							if u, e2 := url.Parse(href); e2 == nil && u.Host != "" && host != "" {
								if strings.ToLower(u.Host) == host {
									internal = true
								}
							} else if strings.HasPrefix(lower, "//") && host != "" { // protocol-relative without parse success fallback
								internal = true
							}
						} else if strings.HasPrefix(lower, "/") { // root-relative
							internal = true
						}
						if internal {
							out.LinkInternalCount++
						} else {
							out.LinkExternalCount++
						}
					}
				}
			}
		} else if n.Type == html.TextNode && !inSkipped {
			data := n.Data
			for _, r := range data {
				if unicode.IsLetter(r) {
					totalLetters++
					if r < 128 && ((r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z')) {
						asciiLetters++
					}
				}
			}
			if textSample.Len() < textBudget {
				// Normalize spaces
				cleaned := strings.TrimSpace(data)
				if cleaned != "" {
					textSample.WriteByte(' ')
					if remain := textBudget - textSample.Len(); remain > 0 && len(cleaned) > remain {
						textSample.WriteString(cleaned[:remain])
					} else {
						textSample.WriteString(cleaned)
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c, inSkipped)
		}
	}
	walk(doc, false)

	denom := out.LinkInternalCount + out.LinkExternalCount
	if denom > 0 {
		out.LinkInternalRatio = float64(out.LinkInternalCount) / float64(denom)
	}

	if totalLetters > 0 {
		out.LangConfidence = float64(asciiLetters) / float64(totalLetters)
	}
	// Trigram scoring if we have a non-trivial sample
	sample := strings.ToLower(textSample.String())

	// Optional advanced language detection (flag-protected) uses whatlanggo which applies trigram-based probabilistic model.
	if advancedLang && out.PrimaryLang == "" && len(sample) >= 40 {
		info := whatlanggo.Detect(sample)
		if info.IsReliable() {
			code := info.Lang.Iso6391()
			if code != "" {
				out.PrimaryLang = code
				// Combine heuristic confidence (ascii proportion) with library confidence probability (0..1) if available.
				if p := info.Confidence; p > 0 {
					out.LangConfidence = (out.LangConfidence + p) / 2.0
				}
			}
		}
	}
	if len(sample) > 60 { // need enough material
		scores := make(map[string]int, len(languageTrigrams))
		// Build simple trigrams (unicode aware but operate on bytes of lowered ASCII subset mainly)
		// We will slide rune-wise to avoid splitting multi-byte sequences mid-rune.
		runes := []rune(sample)
		for i := 0; i < len(runes); i++ {
			// variable length: check 3 and 4 rune grams for certain languages (like 'ción')
			if i+3 <= len(runes) {
				tri := string(runes[i : i+3])
				for lang, table := range languageTrigrams {
					if w, ok := table[tri]; ok {
						scores[lang] += w
					}
				}
			}
			if i+4 <= len(runes) { // 4-gram check
				quad := string(runes[i : i+4])
				for lang, table := range languageTrigrams {
					if w, ok := table[quad]; ok {
						scores[lang] += w
					}
				}
			}
		}
		// Determine best
		bestLang := ""
		bestScore := 0
		totalScore := 0
		for lang, sc := range scores {
			totalScore += sc
			if sc > bestScore {
				bestScore = sc
				bestLang = lang
			}
		}
		if bestLang != "" && totalScore > 0 {
			confidence := float64(bestScore) / float64(totalScore)
			if totalLetters >= 60 {
				// Soft bias towards English when high ASCII ratio and English is close to best score (addresses false FR classification from 'Test'/'est').
				if enScore, ok := scores["en"]; ok && bestLang != "en" && out.LangConfidence >= 0.85 && enScore > 0 && enScore+2 >= bestScore {
					bestLang = "en"
					// recompute confidence relative to english vs total
					confidence = float64(enScore) / float64(totalScore)
				}
				// Allow non-English if confidence >=0.50 and english score not overwhelmingly dominant.
				if bestLang != "en" && confidence >= 0.50 {
					out.PrimaryLang = bestLang
					out.LangConfidence = (out.LangConfidence + confidence) / 2.0
				} else if bestLang == "en" && confidence >= 0.40 {
					out.PrimaryLang = bestLang
					out.LangConfidence = (out.LangConfidence + confidence) / 2.0
				}
			}
		}
	}
	// Fallback to ASCII heuristic English detection if still undetermined
	if out.PrimaryLang == "" && totalLetters >= 40 && out.LangConfidence >= 0.85 {
		out.PrimaryLang = "en"
	}
	if out.PrimaryLang == "" {
		out.PrimaryLang = "und"
	}
	return out
}
