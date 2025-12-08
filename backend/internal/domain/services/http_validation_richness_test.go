package services

import (
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
)

func TestBuildKeywordHitsFromCounts(t *testing.T) {
	counts := map[string]int{"Beta": 1, "Alpha": 2}
	micro := map[string]struct{}{"Beta": {}}
	hits := buildKeywordHitsFromCounts(counts, micro, "Alpha Partners")
	if len(hits) != 2 {
		t.Fatalf("expected 2 hits, got %d", len(hits))
	}
	for _, hit := range hits {
		switch hit.KeywordID {
		case "Alpha":
			if hit.SignalType != "title" {
				t.Fatalf("expected Alpha to be title signal, got %s", hit.SignalType)
			}
		case "Beta":
			if hit.SignalType != "microcrawl" {
				t.Fatalf("expected Beta to be microcrawl signal, got %s", hit.SignalType)
			}
		default:
			t.Fatalf("unexpected keyword %s", hit.KeywordID)
		}
	}
}

func TestEnrichFeatureVectorWithRichnessSetsRichness(t *testing.T) {
	fv := map[string]interface{}{}
	counts := map[string]int{"alpha": 1, "beta": 1}
	result := &httpvalidator.ValidationResult{
		StatusCode:              200,
		ContentLength:           4096,
		ExtractedTitle:          "Alpha Beta",
		ExtractedContentSnippet: "Alpha services for beta partners",
	}
	ss := StructuralSignals{PrimaryLang: "en"}
	enrichFeatureVectorWithRichness(fv, counts, map[string]struct{}{}, result, ss, false, 0.15)
	if _, ok := fv["page_title"]; !ok {
		t.Fatalf("expected page_title to be set")
	}
	if _, ok := fv["keyword_snippets"]; !ok {
		t.Fatalf("expected keyword_snippets to be set")
	}
	score, ok := fv["content_richness_score"].(float64)
	if !ok {
		t.Fatalf("expected content_richness_score to be float64")
	}
	if score < 0 {
		t.Fatalf("expected richness score to be non-negative, got %f", score)
	}
}
