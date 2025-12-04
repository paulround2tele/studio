package featureflags

import (
	"os"
	"testing"
)

func TestFeatureFlags(t *testing.T) {
	// Clean up environment before testing
	defer func() {
		os.Unsetenv("EXTRACTION_KEYWORD_DETAIL_ENABLED")
		os.Unsetenv("MICROCRAWL_ADAPTIVE_MODE")
		os.Unsetenv("ANALYSIS_RESCORING_ENABLED")
		os.Unsetenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE")
	}()

	// Test default values (should all be false)
	if IsExtractionKeywordDetailEnabled() != false {
		t.Error("IsExtractionKeywordDetailEnabled should default to false")
	}

	if IsMicrocrawlAdaptiveModeEnabled() != false {
		t.Error("IsMicrocrawlAdaptiveModeEnabled should default to false")
	}

	if IsAnalysisRescoringEnabled() != false {
		t.Error("IsAnalysisRescoringEnabled should default to false")
	}

	// Test structured output
	flags := GetExtractionAnalysisFlags()
	if flags.ExtractionKeywordDetailEnabled || flags.MicrocrawlAdaptiveMode || flags.AnalysisRescoringEnabled {
		t.Error("GetExtractionAnalysisFlags should default to all false")
	}

	// Set downstream flags and ensure struct reflects them
	os.Setenv("EXTRACTION_KEYWORD_DETAIL_ENABLED", "true")
	os.Setenv("MICROCRAWL_ADAPTIVE_MODE", "true")
	os.Setenv("ANALYSIS_RESCORING_ENABLED", "true")
	flags = GetExtractionAnalysisFlags()
	if !(flags.ExtractionKeywordDetailEnabled && flags.MicrocrawlAdaptiveMode && flags.AnalysisRescoringEnabled) {
		t.Error("GetExtractionAnalysisFlags should reflect env var settings")
	}
}

func TestAnalysisFeatureTableMinCoverage(t *testing.T) {
	defer os.Unsetenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE")

	// Test default value
	coverage := GetAnalysisFeatureTableMinCoverage()
	if coverage != 0.9 {
		t.Errorf("Expected default coverage 0.9, got %f", coverage)
	}

	// Test valid value
	os.Setenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", "0.8")
	coverage = GetAnalysisFeatureTableMinCoverage()
	if coverage != 0.8 {
		t.Errorf("Expected coverage 0.8, got %f", coverage)
	}

	// Test clamping - value above 1.0
	os.Setenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", "1.5")
	coverage = GetAnalysisFeatureTableMinCoverage()
	if coverage != 1.0 {
		t.Errorf("Expected clamped coverage 1.0, got %f", coverage)
	}

	// Test clamping - value below 0.0
	os.Setenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", "-0.5")
	coverage = GetAnalysisFeatureTableMinCoverage()
	if coverage != 0.0 {
		t.Errorf("GetAnalysisFeatureTableMinCoverage should clamp to 0.0, got %f", coverage)
	}

	// Test invalid value fallback
	os.Setenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", "invalid")
	coverage = GetAnalysisFeatureTableMinCoverage()
	if coverage != 0.9 {
		t.Errorf("Expected fallback coverage 0.9, got %f", coverage)
	}
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
}

func TestBoolEnvHelper(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		expected bool
	}{
		{"true", "true", true},
		{"1", "1", true},
		{"yes", "yes", true},
		{"on", "on", true},
		{"false", "false", false},
		{"0", "0", false},
		{"no", "no", false},
		{"off", "off", false},
		{"invalid", "invalid", false},
		{"empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getBoolEnv("TEST_BOOL_VAR", false)
			if tt.value != "" {
				os.Setenv("TEST_BOOL_VAR", tt.value)
				defer os.Unsetenv("TEST_BOOL_VAR")
				result = getBoolEnv("TEST_BOOL_VAR", false)
			}

			if result != tt.expected {
				t.Errorf("getBoolEnv(%q) = %v, expected %v", tt.value, result, tt.expected)
			}
		})
	}
}
