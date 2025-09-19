package featureflags

import (
	"os"
	"testing"
)

func TestFeatureFlags(t *testing.T) {
	// Clean up environment before testing
	defer func() {
		os.Unsetenv("EXTRACTION_FEATURE_TABLE_ENABLED")
		os.Unsetenv("EXTRACTION_KEYWORD_DETAIL_ENABLED")
		os.Unsetenv("MICROCRAWL_ADAPTIVE_MODE")
		os.Unsetenv("ANALYSIS_RESCORING_ENABLED")
		os.Unsetenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE")
	}()

	// Test default values (should all be false)
	if IsExtractionFeatureTableEnabled() != false {
		t.Error("IsExtractionFeatureTableEnabled should default to false")
	}
	
	if IsExtractionKeywordDetailEnabled() != false {
		t.Error("IsExtractionKeywordDetailEnabled should default to false")
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
	
	// Clean up for next test
	os.Unsetenv("EXTRACTION_FEATURE_TABLE_ENABLED")
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
		t.Errorf("Expected clamped coverage 0.0, got %f", coverage)
	}
	
	// Test invalid value fallback
	os.Setenv("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", "invalid")
	coverage = GetAnalysisFeatureTableMinCoverage()
	if coverage != 0.9 {
		t.Errorf("Expected fallback coverage 0.9, got %f", coverage)
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