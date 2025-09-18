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

func TestGetAnalysisFeatureTableMinCoverage(t *testing.T) {
	// Test default value
	defaultValue := GetAnalysisFeatureTableMinCoverage()
	if defaultValue != 0.9 {
		t.Errorf("GetAnalysisFeatureTableMinCoverage should default to 0.9, got %f", defaultValue)
	}
	
	// Test with environment variable set
	os.Setenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", "0.8")
	value := GetAnalysisFeatureTableMinCoverage()
	if value != 0.8 {
		t.Errorf("GetAnalysisFeatureTableMinCoverage should return 0.8, got %f", value)
	}
	
	// Test with invalid value (should default)
	os.Setenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", "invalid")
	value = GetAnalysisFeatureTableMinCoverage()
	if value != 0.9 {
		t.Errorf("GetAnalysisFeatureTableMinCoverage should default on invalid value, got %f", value)
	}
	
	// Test with out-of-range values (should clamp)
	os.Setenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", "1.5")
	value = GetAnalysisFeatureTableMinCoverage()
	if value != 1.0 {
		t.Errorf("GetAnalysisFeatureTableMinCoverage should clamp to 1.0, got %f", value)
	}
	
	os.Setenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", "-0.5")
	value = GetAnalysisFeatureTableMinCoverage()
	if value != 0.0 {
		t.Errorf("GetAnalysisFeatureTableMinCoverage should clamp to 0.0, got %f", value)
	}
	
	// Clean up
	os.Unsetenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE")
}