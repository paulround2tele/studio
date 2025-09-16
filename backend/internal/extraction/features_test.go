package extraction

import (
	"os"
	"testing"
)

func TestFlagEnabled(t *testing.T) {
	os.Setenv("EXTRACTION_FEATURE_TABLE_ENABLED", "true")
	if !EnabledFeatureTable() {
		t.Fatalf("expected feature table flag to be enabled")
	}
	os.Unsetenv("EXTRACTION_FEATURE_TABLE_ENABLED")
	if EnabledFeatureTable() {
		t.Fatalf("expected flag disabled after unset")
	}
}

func TestBuildFeaturesBasic(t *testing.T) {
	agg := BuildFeatures(RawSignals{ParsedKeywordHits: []KeywordHit{{KeywordID: "k1", BaseWeight: 1}, {KeywordID: "k2", BaseWeight: 2}, {KeywordID: "k1", BaseWeight: 1}}}, BuilderParams{})
	if agg.KwUniqueCount != 2 {
		t.Fatalf("expected 2 unique, got %d", agg.KwUniqueCount)
	}
	if agg.KwTotalOccurrences != 3 {
		t.Fatalf("expected 3 total, got %d", agg.KwTotalOccurrences)
	}
	if agg.KwWeightSum <= 0 {
		t.Fatalf("expected weight sum >0")
	}
	if len(agg.Top3) == 0 {
		t.Fatalf("expected top3 not empty")
	}
}
