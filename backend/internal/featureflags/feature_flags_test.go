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
	
	if IsAnalysisDualReadEnabled() != false {
		t.Error("IsAnalysisDualReadEnabled should default to false")
	}
	
	// Test with environment variable set
	os.Setenv("EXTRACTION_FEATURE_TABLE_ENABLED", "true")
	if IsExtractionFeatureTableEnabled() != true {
		t.Error("IsExtractionFeatureTableEnabled should return true when env var is set")
	}
	
	// Test ANALYSIS_DUAL_READ flag
	os.Setenv("ANALYSIS_DUAL_READ", "true")
	if IsAnalysisDualReadEnabled() != true {
		t.Error("IsAnalysisDualReadEnabled should return true when env var is set")
	}
	
	// Test structured output
	flags := GetExtractionAnalysisFlags()
	if !flags.ExtractionFeatureTableEnabled {
		t.Error("GetExtractionAnalysisFlags should reflect env var setting")
	}
	if !flags.AnalysisDualReadEnabled {
		t.Error("GetExtractionAnalysisFlags should reflect AnalysisDualReadEnabled setting")
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

	os.Unsetenv("ANALYSIS_DUAL_READ")
}

func TestGetDualReadVarianceThreshold(t *testing.T) {
	// Test default value
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.25 {
		t.Errorf("GetDualReadVarianceThreshold should default to 0.25, got %f", threshold)
	}
	
	// Test custom value
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "0.5")
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.5 {
		t.Errorf("GetDualReadVarianceThreshold should return 0.5, got %f", threshold)
	}
	
	// Test invalid value (should return default)
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "invalid")
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.25 {
		t.Errorf("GetDualReadVarianceThreshold should return default 0.25 for invalid value, got %f", threshold)
	}
	
	// Test zero value (should return default since it's <= 0)
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "0")
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.25 {
		t.Errorf("GetDualReadVarianceThreshold should return default 0.25 for zero value, got %f", threshold)
	}
	
	// Test negative value (should return default since it's <= 0)
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "-0.1")
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.25 {
		t.Errorf("GetDualReadVarianceThreshold should return default 0.25 for negative value, got %f", threshold)
	}
	
	// Test very small positive value
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "0.001")
	if threshold := GetDualReadVarianceThreshold(); threshold != 0.001 {
		t.Errorf("GetDualReadVarianceThreshold should return 0.001, got %f", threshold)
	}
	
	// Clean up
	os.Unsetenv("DUAL_READ_VARIANCE_THRESHOLD")
}