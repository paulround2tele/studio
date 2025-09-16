package extraction

import (
	"os"
	"testing"
)

func TestRichnessV2WeightProfileEmission(t *testing.T) {
	os.Setenv("RICHNESS_V2_ENABLED", "true")
	os.Setenv("RICHNESS_WEIGHT_JSON", `{"V":0.31,"P":0.24,"bonus_max":0.30}`)
	agg := BuildFeatures(RawSignals{ContentBytes: 4096, ParsedKeywordHits: []KeywordHit{{KeywordID: "a", SignalType: "title", BaseWeight: 1}, {KeywordID: "b", SignalType: "body", BaseWeight: 1}, {KeywordID: "c", SignalType: "body", BaseWeight: 1}}}, BuilderParams{})
	prof, ok := agg.FeatureVector["richness_weight_profile"].(map[string]any)
	if !ok {
		t.Fatalf("expected richness_weight_profile present")
	}
	if prof["V"].(float64) != 0.31 {
		t.Fatalf("expected overridden V weight")
	}
	if prof["bonus_max"].(float64) != 0.30 {
		t.Fatalf("expected overridden bonus_max")
	}
}

func TestAdaptiveMicrocrawlGate(t *testing.T) {
	os.Unsetenv("MICROCRAWL_STOP_RICHNESS")
	base := FeatureAggregate{KwUniqueCount: 5, KwTotalOccurrences: 10, ContentRichnessScore: 0.4, FeatureVector: map[string]any{"diversity_target": 12.0}}
	if !AdaptiveMicrocrawlGate(base, BuilderParams{}) {
		t.Fatalf("expected gate allow with low richness & diversity gap")
	}
	// High richness should block
	baseHigh := base
	baseHigh.ContentRichnessScore = 0.9
	if AdaptiveMicrocrawlGate(baseHigh, BuilderParams{}) {
		t.Fatalf("expected gate deny for high richness")
	}
}

func TestRichnessPenaltiesStuffingAndAnchor(t *testing.T) {
	os.Setenv("RICHNESS_V2_ENABLED", "true")
	// Construct signals with heavy stuffing: one keyword dominates >60% occurrences and high anchor share
	hits := []KeywordHit{}
	// Dominant keyword k1 appears 15 times in body
	for i := 0; i < 15; i++ {
		hits = append(hits, KeywordHit{KeywordID: "k1", SignalType: "body", BaseWeight: 1})
	}
	// Other keywords sparse
	hits = append(hits, KeywordHit{KeywordID: "k2", SignalType: "anchor", BaseWeight: 1})
	hits = append(hits, KeywordHit{KeywordID: "k3", SignalType: "anchor", BaseWeight: 1})
	// Add anchors for dominant keyword to raise anchor share significantly
	for i := 0; i < 30; i++ {
		hits = append(hits, KeywordHit{KeywordID: "k1", SignalType: "anchor", BaseWeight: 1})
	}
	total := len(hits)
	if total < 26 {
		t.Fatalf("expected at least 26 hits, got %d", total)
	}
	agg := BuildFeatures(RawSignals{ContentBytes: 8192, ParsedKeywordHits: hits}, BuilderParams{})
	fv := agg.FeatureVector
	stuffing := fv["stuffing_penalty"].(float64)
	if stuffing <= 0 {
		t.Fatalf("expected stuffing penalty >0 got %f", stuffing)
	}
	anchorShare := fv["anchor_share"].(float64)
	if anchorShare <= 0.55 {
		t.Fatalf("expected anchor_share >0.55 got %f", anchorShare)
	}
	// repetition_index should match dominant share
	rep := fv["repetition_index"].(float64)
	if rep <= 0.35 {
		t.Fatalf("expected repetition_index trigger >0.35 got %f", rep)
	}
}

func TestRichnessPenaltyRepetitionOnly(t *testing.T) {
	os.Setenv("RICHNESS_V2_ENABLED", "true")
	hits := []KeywordHit{}
	// Dominant keyword 12 occurrences body; others dispersed across different signals to avoid high anchor share
	for i := 0; i < 12; i++ {
		hits = append(hits, KeywordHit{KeywordID: "core", SignalType: "body", BaseWeight: 1})
	}
	hits = append(hits, KeywordHit{KeywordID: "aux1", SignalType: "title", BaseWeight: 1})
	hits = append(hits, KeywordHit{KeywordID: "aux2", SignalType: "h1", BaseWeight: 1})
	hits = append(hits, KeywordHit{KeywordID: "aux3", SignalType: "body", BaseWeight: 1})
	agg := BuildFeatures(RawSignals{ContentBytes: 4096, ParsedKeywordHits: hits}, BuilderParams{})
	fv := agg.FeatureVector
	rep := fv["repetition_index"].(float64)
	if rep <= 0.35 {
		t.Fatalf("expected repetition_index > 0.35 got %f", rep)
	}
	anchorShare := fv["anchor_share"].(float64)
	if anchorShare != 0 {
		t.Fatalf("expected anchor_share 0 got %f", anchorShare)
	}
}

func TestRichnessPenaltyAnchorOnly(t *testing.T) {
	os.Setenv("RICHNESS_V2_ENABLED", "true")
	hits := []KeywordHit{}
	// Balanced keywords but many anchors to exceed anchor threshold without single keyword dominance >35%
	for i := 0; i < 8; i++ {
		hits = append(hits, KeywordHit{KeywordID: "kA", SignalType: "anchor", BaseWeight: 1})
	}
	for i := 0; i < 8; i++ {
		hits = append(hits, KeywordHit{KeywordID: "kB", SignalType: "anchor", BaseWeight: 1})
	}
	for i := 0; i < 8; i++ {
		hits = append(hits, KeywordHit{KeywordID: "kC", SignalType: "anchor", BaseWeight: 1})
	}
	// Body occurrences to keep each keyword share ~0.33
	for i := 0; i < 6; i++ {
		hits = append(hits, KeywordHit{KeywordID: "kA", SignalType: "body", BaseWeight: 1})
	}
	for i := 0; i < 6; i++ {
		hits = append(hits, KeywordHit{KeywordID: "kB", SignalType: "body", BaseWeight: 1})
	}
	for i := 0; i < 6; i++ {
		hits = append(hits, KeywordHit{KeywordID: "kC", SignalType: "body", BaseWeight: 1})
	}
	agg := BuildFeatures(RawSignals{ContentBytes: 8192, ParsedKeywordHits: hits}, BuilderParams{})
	fv := agg.FeatureVector
	anchorShare := fv["anchor_share"].(float64)
	if anchorShare <= 0.55 {
		t.Fatalf("expected anchor_share > 0.55 got %f", anchorShare)
	}
	rep := fv["repetition_index"].(float64)
	if rep > 0.35 {
		t.Fatalf("expected repetition_index <= 0.35 (no repetition penalty scenario) got %f", rep)
	}
}
