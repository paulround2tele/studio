package featureflags

import (
	"os"
	"testing"
)

func TestFeatureFlags(t *testing.T) {
	// Test default values (should all be false)
	if IsExtractionFeatureTableEnabled() != false {
		t.Error("IsExtractionFeatureTableEnabled should default to false")
	}
	
	if IsExtractionKeywordDetailEnabled() != false {
		t.Error("IsExtractionKeywordDetailEnabled should default to false")
	}
	
	if IsAnalysisReadsFeatureTableEnabled() != false {
		t.Error("IsAnalysisReadsFeatureTableEnabled should default to false")
	}
	
	if IsMicrocrawlAdaptiveModeEnabled() != false {
		t.Error("IsMicrocrawlAdaptiveModeEnabled should default to false")
	}
	
	if IsAnalysisRescoringEnabled() != false {
		t.Error("IsAnalysisRescoringEnabled should default to false")
	}
	
	// Test with environment variable set
	os.Setenv("EXTRACTION_FEATURE_TABLE_ENABLED", "true")
	if IsExtractionFeatureTableEnabled() != true {
		t.Error("IsExtractionFeatureTableEnabled should return true when env var is set")
	}
	
	// Test structured output
	flags := GetExtractionAnalysisFlags()
	if !flags.ExtractionFeatureTableEnabled {
		t.Error("GetExtractionAnalysisFlags should reflect env var setting")
	}
	
	// Clean up
	os.Unsetenv("EXTRACTION_FEATURE_TABLE_ENABLED")
}