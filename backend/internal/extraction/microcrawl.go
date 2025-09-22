package extraction

import (
	"context"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/html"
)

// Microcrawler defines contract for shallow breadth-first crawl to enrich keyword signals.
type Microcrawler interface {
	Crawl(ctx context.Context, rootURL string, budgetPages int) (MicrocrawlResult, []KeywordHit, error)
}

// NoopMicrocrawler provides disabled implementation.
type NoopMicrocrawler struct{}

func (n NoopMicrocrawler) Crawl(ctx context.Context, rootURL string, budgetPages int) (MicrocrawlResult, []KeywordHit, error) {
	return MicrocrawlResult{}, nil, nil
}

// HTTPMicrocrawler implements real HTTP-based microcrawl functionality
type HTTPMicrocrawler struct {
	client    *http.Client
	userAgent string
	timeout   time.Duration
}

// NewHTTPMicrocrawler creates a production microcrawler with HTTP client
func NewHTTPMicrocrawler() *HTTPMicrocrawler {
	timeout := 10 * time.Second
	if env := os.Getenv("MICROCRAWL_TIMEOUT_SECONDS"); env != "" {
		if t, err := strconv.Atoi(env); err == nil && t > 0 {
			timeout = time.Duration(t) * time.Second
		}
	}

	return &HTTPMicrocrawler{
		client: &http.Client{
			Timeout: timeout,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 3 {
					return http.ErrUseLastResponse
				}
				return nil
			},
		},
		userAgent: "DomainFlow-Microcrawler/1.0",
		timeout:   timeout,
	}
}

// Crawl performs the actual microcrawl with HTTP fetching and keyword extraction
func (m *HTTPMicrocrawler) Crawl(ctx context.Context, rootURL string, budgetPages int) (MicrocrawlResult, []KeywordHit, error) {
	if budgetPages <= 0 {
		return MicrocrawlResult{}, nil, nil
	}

	// Parse base URL
	baseURL, err := url.Parse(rootURL)
	if err != nil {
		return MicrocrawlResult{}, nil, fmt.Errorf("invalid root URL: %w", err)
	}

	// Initialize tracking
	visited := make(map[string]bool)
	toVisit := []string{rootURL}
	allKeywords := make(map[string]KeywordHit)
	pagesVisited := 0
	baseKeywordCount := 0

	// First pass: extract keywords from root page to establish baseline
	if len(toVisit) > 0 {
		rootKeywords, err := m.extractPageKeywords(ctx, toVisit[0], "microcrawl")
		if err == nil {
			for _, kw := range rootKeywords {
				allKeywords[kw.KeywordID] = kw
			}
			baseKeywordCount = len(allKeywords)
			visited[toVisit[0]] = true
			pagesVisited++
		}
		toVisit = toVisit[1:]
	}

	// Discover additional URLs from root page
	additionalURLs, err := m.extractLinksFromPage(ctx, rootURL, baseURL)
	if err == nil {
		for _, link := range additionalURLs {
			if !visited[link] && len(toVisit) < budgetPages*3 { // limit discovery to avoid explosion
				toVisit = append(toVisit, link)
			}
		}
	}

	// Crawl additional pages up to budget
	initialKeywordCount := len(allKeywords)
	for len(toVisit) > 0 && pagesVisited < budgetPages {
		currentURL := toVisit[0]
		toVisit = toVisit[1:]

		if visited[currentURL] {
			continue
		}

		keywords, err := m.extractPageKeywords(ctx, currentURL, "microcrawl")
		if err != nil {
			continue // Skip failed pages
		}

		visited[currentURL] = true
		pagesVisited++

		// Merge new keywords
		for _, kw := range keywords {
			if existing, exists := allKeywords[kw.KeywordID]; exists {
				// Combine weights and update frequency
				existing.BaseWeight += kw.BaseWeight * 0.5 // Reduce weight for secondary pages
				allKeywords[kw.KeywordID] = existing
			} else {
				kw.BaseWeight *= 0.7 // Secondary page keywords get reduced weight
				allKeywords[kw.KeywordID] = kw
			}
		}

		// Early termination if diminishing returns
		newUniqueCount := len(allKeywords)
		if newUniqueCount > initialKeywordCount {
			gainRatio := float64(newUniqueCount-initialKeywordCount) / float64(pagesVisited-1)
			if gainRatio < 0.5 && pagesVisited >= 2 {
				break // Diminishing returns detected
			}
		}
	}

	// Calculate results
	finalKeywordCount := len(allKeywords)
	addedKeywords := finalKeywordCount - baseKeywordCount
	gainRatio := 0.0
	if baseKeywordCount > 0 {
		gainRatio = float64(addedKeywords) / float64(baseKeywordCount)
	}

	// Convert map to slice
	keywordHits := make([]KeywordHit, 0, len(allKeywords))
	for _, kw := range allKeywords {
		keywordHits = append(keywordHits, kw)
	}

	result := MicrocrawlResult{
		PagesVisited:        pagesVisited,
		AddedUniqueKeywords: addedKeywords,
		BaseUniqueBefore:    baseKeywordCount,
		GainRatio:           gainRatio,
		DiminishingReturns:  gainRatio < 0.3 && pagesVisited >= 2,
	}

	return result, keywordHits, nil
}

// extractPageKeywords fetches a page and extracts keywords from its content
func (m *HTTPMicrocrawler) extractPageKeywords(ctx context.Context, pageURL, signalType string) ([]KeywordHit, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", pageURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", m.userAgent)

	resp, err := m.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	// Limit response size to prevent abuse
	limitedBody := io.LimitReader(resp.Body, 1024*1024) // 1MB limit
	content, err := io.ReadAll(limitedBody)
	if err != nil {
		return nil, err
	}

	return m.parseKeywordsFromHTML(string(content), signalType)
}

// extractLinksFromPage extracts same-domain links from a page for further crawling
func (m *HTTPMicrocrawler) extractLinksFromPage(ctx context.Context, pageURL string, baseURL *url.URL) ([]string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", pageURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", m.userAgent)

	resp, err := m.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	limitedBody := io.LimitReader(resp.Body, 512*1024) // 512KB limit for link extraction
	doc, err := html.Parse(limitedBody)
	if err != nil {
		return nil, err
	}

	var links []string
	var findLinks func(*html.Node)
	findLinks = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "a" {
			for _, attr := range n.Attr {
				if attr.Key == "href" {
					if linkURL, err := url.Parse(attr.Val); err == nil {
						resolvedURL := baseURL.ResolveReference(linkURL)
						if resolvedURL.Host == baseURL.Host && resolvedURL.Path != baseURL.Path {
							links = append(links, resolvedURL.String())
							if len(links) >= 10 { // Limit link discovery
								return
							}
						}
					}
					break
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			findLinks(c)
		}
	}

	findLinks(doc)
	return links, nil
}

// parseKeywordsFromHTML extracts keywords from HTML content
func (m *HTTPMicrocrawler) parseKeywordsFromHTML(content, signalType string) ([]KeywordHit, error) {
	// Simple keyword extraction - in production this would use more sophisticated NLP
	doc, err := html.Parse(strings.NewReader(content))
	if err != nil {
		return nil, err
	}

	var keywords []KeywordHit
	var extractText func(*html.Node, string, float64)
	
	extractText = func(n *html.Node, context string, weight float64) {
		if n.Type == html.TextNode {
			text := strings.TrimSpace(n.Data)
			if len(text) > 3 {
				words := regexp.MustCompile(`\w+`).FindAllString(strings.ToLower(text), -1)
				for i, word := range words {
					if len(word) >= 3 && len(word) <= 20 && isValidKeyword(word) {
						kw := KeywordHit{
							KeywordID:   word,
							SurfaceForm: word,
							SignalType:  signalType,
							Position:    i,
							BaseWeight:  weight,
							ValueScore:  1.0,
						}
						keywords = append(keywords, kw)
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			childWeight := weight
			childContext := context
			if n.Type == html.ElementNode {
				switch n.Data {
				case "title":
					childWeight = 3.0
					childContext = "title"
				case "h1":
					childWeight = 2.5
					childContext = "h1"
				case "h2", "h3":
					childWeight = 2.0
					childContext = "heading"
				case "strong", "b":
					childWeight = weight * 1.2
				case "meta":
					for _, attr := range n.Attr {
						if attr.Key == "name" && (attr.Val == "description" || attr.Val == "keywords") {
							childWeight = 1.5
							childContext = "meta"
						}
					}
				}
			}
			extractText(c, childContext, childWeight)
		}
	}

	extractText(doc, "body", 1.0)
	return keywords, nil
}

// isValidKeyword checks if a word should be considered a valid keyword
func isValidKeyword(word string) bool {
	// Skip common stop words and very short words
	stopWords := map[string]bool{
		"the": true, "and": true, "for": true, "are": true, "but": true, "not": true,
		"you": true, "all": true, "can": true, "had": true, "her": true, "was": true,
		"one": true, "our": true, "out": true, "day": true, "get": true, "has": true,
		"his": true, "how": true, "man": true, "new": true, "now": true, "old": true,
		"see": true, "two": true, "way": true, "who": true, "boy": true, "did": true,
		"its": true, "let": true, "put": true, "say": true, "she": true, "too": true,
		"use": true, "with": true, "have": true, "this": true, "will": true, "your": true,
		"they": true, "from": true, "know": true, "want": true, "been": true, "good": true,
		"much": true, "some": true, "time": true, "very": true, "when": true, "come": true,
		"here": true, "just": true, "like": true, "long": true, "make": true, "many": true,
		"over": true, "such": true, "take": true, "than": true, "them": true, "well": true,
		"were": true,
	}
	
	return len(word) >= 3 && !stopWords[word] && regexp.MustCompile(`^[a-z]+$`).MatchString(word)
}

// AdaptiveMicrocrawlGate decides whether to run microcrawl based on base richness metrics.
func AdaptiveMicrocrawlGate(base FeatureAggregate, params BuilderParams) bool {
	// Configurable thresholds via env; defaults chosen empirically.
	cfg := loadMicrocrawlConfig()
	// Hard disqualifiers
	if base.KwUniqueCount == 0 && base.KwTotalOccurrences == 0 {
		// Likely empty / error fetch; don't waste crawl budget
		return false
	}
	if base.ContentRichnessScore >= cfg.StopRichnessCeiling {
		return false
	}
	if base.KwUniqueCount >= cfg.StopUniqueCeiling {
		return false
	}

	// Expected marginal gain estimation using saturation curve model:
	// We model unique keyword discovery as U(pages) = U0 + a*(1 - exp(-lambda*pages))
	// For gating, invert to estimate lambda from small-sample if we have microcrawl preview (not yet) -> we fallback to heuristic using current diversity gap.
	diversityTarget := 12.0
	if v, ok := base.FeatureVector["diversity_target"]; ok {
		diversityTarget = getFloat(v)
	}
	effectiveUnique := base.KwUniqueCount
	gap := diversityTarget - float64(effectiveUnique)
	if gap <= 0 {
		return false
	}

	// Estimate potential added uniques with configured page budget (cfg.BudgetPages)
	lambda := cfg.EstimatedLambda // discovery rate parameter
	expectedAdded := gap * (1 - math.Exp(-lambda*float64(cfg.BudgetPages)))
	// Convert to relative diversity improvement
	relGain := 0.0
	if diversityTarget > 0 {
		relGain = expectedAdded / diversityTarget
	}
	if relGain < cfg.MinRelativeGain {
		return false
	}

	// Also require that base richness is below dynamic floor combining richness + diversity shortfall
	richness := base.ContentRichnessScore
	diversityNorm := float64(effectiveUnique) / diversityTarget
	if diversityNorm > 1 {
		diversityNorm = 1
	}
	composite := 0.6*richness + 0.4*diversityNorm
	if composite >= cfg.CompositeCeiling {
		return false
	}

	return true
}

// MicrocrawlConfig holds gating thresholds.
type MicrocrawlConfig struct {
	StopRichnessCeiling float64
	StopUniqueCeiling   int
	MinRelativeGain     float64
	EstimatedLambda     float64
	BudgetPages         int
	CompositeCeiling    float64
}

var defaultMicrocrawlConfig = MicrocrawlConfig{
	StopRichnessCeiling: 0.72,
	StopUniqueCeiling:   20,
	MinRelativeGain:     0.10, // expect at least 10% of diversity target improvement
	EstimatedLambda:     0.25,
	BudgetPages:         3,
	CompositeCeiling:    0.62,
}

func loadMicrocrawlConfig() MicrocrawlConfig {
	cfg := defaultMicrocrawlConfig
	if v := os.Getenv("MICROCRAWL_STOP_RICHNESS"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.StopRichnessCeiling = f
		}
	}
	if v := os.Getenv("MICROCRAWL_STOP_UNIQUE"); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			cfg.StopUniqueCeiling = i
		}
	}
	if v := os.Getenv("MICROCRAWL_MIN_REL_GAIN"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.MinRelativeGain = f
		}
	}
	if v := os.Getenv("MICROCRAWL_LAMBDA"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.EstimatedLambda = f
		}
	}
	if v := os.Getenv("MICROCRAWL_BUDGET_PAGES"); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			cfg.BudgetPages = i
		}
	}
	if v := os.Getenv("MICROCRAWL_COMPOSITE_CEIL"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.CompositeCeiling = f
		}
	}
	return cfg
}
