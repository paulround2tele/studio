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

func TestGetDualReadVarianceThreshold(t *testing.T) {
	// Store original value
	originalVal := os.Getenv("DUAL_READ_VARIANCE_THRESHOLD")
	defer os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", originalVal)
	
	// Test default value
	os.Unsetenv("DUAL_READ_VARIANCE_THRESHOLD")
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.25 {
		t.Errorf("Expected default threshold 0.25, got %f", threshold)
	}
	
	// Test valid value
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "0.5")
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.5 {
		t.Errorf("Expected threshold 0.5, got %f", threshold)
	}
	
	// Test boundary clamping - high
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "1.5")
	if threshold := GetDualReadVarianceThreshold(); threshold != 1.0 {
		t.Errorf("Expected threshold clamped to 1.0, got %f", threshold)
	}
	
	// Test boundary clamping - low
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "-0.5")
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.0 {
		t.Errorf("Expected threshold clamped to 0.0, got %f", threshold)
	}
	
	// Test invalid value falls back to default
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "invalid")
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.25 {
		t.Errorf("Expected threshold to fallback to default 0.25, got %f", threshold)
	}
}