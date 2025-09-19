package featureflags

import (
	"os"
	"strconv"
	"strings"
)

// Extraction → Analysis Redesign Feature Flags
// These constants control the phased rollout of the new extraction and analysis architecture.
// All flags default to false for safe deployment.

// IsExtractionFeatureTableEnabled returns true if the system should write
// feature extraction results to the domain_extraction_features table.
// 
// Phase: P1 - Feature extraction table integration
// Environment Variable: EXTRACTION_FEATURE_TABLE_ENABLED
// Default: false
//
// TODO Phase P1: Wire this flag into FeatureExtractionService
// TODO Phase P1: Implement dual-write mode (legacy + new table)
// TODO Phase P1: Add monitoring for extraction processing states
func IsExtractionFeatureTableEnabled() bool {
	return getBoolEnv("EXTRACTION_FEATURE_TABLE_ENABLED", false)
}

// IsExtractionKeywordDetailEnabled returns true if the system should perform
// detailed keyword extraction and write results to domain_extracted_keywords table.
//
// Phase: P2 - Keyword extraction enhancement  
// Environment Variable: EXTRACTION_KEYWORD_DETAIL_ENABLED
// Default: false
//
// TODO Phase P2: Wire this flag into DetailedKeywordExtractionService
// TODO Phase P2: Implement semantic clustering and sentiment analysis
// TODO Phase P2: Add keyword density and relevance scoring
func IsExtractionKeywordDetailEnabled() bool {
	return getBoolEnv("EXTRACTION_KEYWORD_DETAIL_ENABLED", false)
}

// IsAnalysisReadsFeatureTableEnabled returns true if the analysis phase should
// read feature data from the new extraction tables instead of legacy feature_vector.
//
// Phase: P3 - Analysis reading migration
// Environment Variable: ANALYSIS_READS_FEATURE_TABLE  
// Default: false
//
// TODO Phase P3: Wire this flag into AnalysisService
// TODO Phase P3: Implement fallback logic for incomplete extractions
// TODO Phase P3: Add data mapping between old and new schemas
func IsAnalysisReadsFeatureTableEnabled() bool {
	return getBoolEnv("ANALYSIS_READS_FEATURE_TABLE", false)
}

// IsMicrocrawlAdaptiveModeEnabled returns true if the system should use
// adaptive crawling strategies based on site characteristics and extraction results.
//
// Phase: P4 - Adaptive crawling implementation
// Environment Variable: MICROCRAWL_ADAPTIVE_MODE
// Default: false  
//
// TODO Phase P4: Wire this flag into MicrocrawlAdaptiveService
// TODO Phase P4: Implement site complexity analysis
// TODO Phase P4: Add dynamic crawl depth adjustment
func IsMicrocrawlAdaptiveModeEnabled() bool {
	return getBoolEnv("MICROCRAWL_ADAPTIVE_MODE", false)
}

// IsAnalysisRescoringEnabled returns true if the system should use
// advanced scoring algorithms based on detailed extraction data.
//
// Phase: P5 - Advanced scoring implementation (Future)
// Environment Variable: ANALYSIS_RESCORING_ENABLED
// Default: false
//
// TODO Phase P5: Wire this flag into DetailedScoringService  
// TODO Phase P5: Implement feature-weighted scoring algorithms
// TODO Phase P5: Add keyword relevance and technical metrics scoring
func IsAnalysisRescoringEnabled() bool {
	return getBoolEnv("ANALYSIS_RESCORING_ENABLED", false)
}

// GetDualReadVarianceThreshold returns the threshold for dual-read variance detection.
// This controls when variance between legacy and new feature vectors is considered "high".
// 
// Environment Variable: DUAL_READ_VARIANCE_THRESHOLD
// Default: 0.25 (25% variance threshold)
// Range: 0.0 to 1.0 (0% to 100% variance)
func GetDualReadVarianceThreshold() float64 {
	return getFloatEnv("DUAL_READ_VARIANCE_THRESHOLD", 0.25)
// IsAnalysisDualReadEnabled returns true if the analysis phase should
// perform dual read comparison between legacy and new extraction data.
//
// Phase: P1 - Flag unification (Current)
// Environment Variable: ANALYSIS_DUAL_READ
// Default: false
//
// Used for non-blocking comparison and validation during migration.
func IsAnalysisDualReadEnabled() bool {
	return getBoolEnv("ANALYSIS_DUAL_READ", false)
}

// ExtractionAnalysisFeatureFlags returns a structured view of all extraction/analysis
// feature flags for monitoring and debugging purposes.
type ExtractionAnalysisFeatureFlags struct {
	ExtractionFeatureTableEnabled  bool `json:"extractionFeatureTableEnabled"`
	ExtractionKeywordDetailEnabled bool `json:"extractionKeywordDetailEnabled"`
	AnalysisReadsFeatureTable     bool `json:"analysisReadsFeatureTable"`
	MicrocrawlAdaptiveMode        bool `json:"microcrawlAdaptiveMode"`
	AnalysisRescoringEnabled      bool `json:"analysisRescoringEnabled"`
	AnalysisDualReadEnabled       bool `json:"analysisDualReadEnabled"`
}

// GetExtractionAnalysisFlags returns the current state of all extraction/analysis
// feature flags for API responses and monitoring.
func GetExtractionAnalysisFlags() ExtractionAnalysisFeatureFlags {
	return ExtractionAnalysisFeatureFlags{
		ExtractionFeatureTableEnabled:  IsExtractionFeatureTableEnabled(),
		ExtractionKeywordDetailEnabled: IsExtractionKeywordDetailEnabled(),
		AnalysisReadsFeatureTable:      IsAnalysisReadsFeatureTableEnabled(),
		MicrocrawlAdaptiveMode:         IsMicrocrawlAdaptiveModeEnabled(),
		AnalysisRescoringEnabled:       IsAnalysisRescoringEnabled(),
		AnalysisDualReadEnabled:        IsAnalysisDualReadEnabled(),
	}
}

// Helper Functions

// getBoolEnv reads a boolean environment variable with a default value.
// Accepts: "true", "1", "yes", "on" (case insensitive) as true values.
// Everything else (including empty/missing) returns the default value.
func getBoolEnv(key string, defaultValue bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}
	
	// Parse boolean-like values
	lowerValue := strings.ToLower(value)
	switch lowerValue {
	case "true", "1", "yes", "on":
		return true
	case "false", "0", "no", "off":
		return false
	default:
		// Try parsing as integer (non-zero = true)
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal != 0
		}
		return defaultValue
	}
}

// getFloatEnv reads a float environment variable with a default value.
// Ensures the value is within bounds (0.0 to 1.0) for thresholds.

// getFloatEnv reads a float64 environment variable with a default value.
// The value must be a valid float string and greater than 0.
// If the value is invalid or <= 0, returns the default value.
func getFloatEnv(key string, defaultValue float64) float64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}
	
	if floatVal, err := strconv.ParseFloat(value, 64); err == nil {
		// Clamp to valid threshold range
		if floatVal < 0.0 {
			return 0.0
		}
		if floatVal > 1.0 {
			return 1.0
		}
		return floatVal
	}
	return defaultValue
}


	if floatVal, err := strconv.ParseFloat(value, 64); err == nil && floatVal > 0 {
		return floatVal
	}
	
	return defaultValue
}

// GetDualReadVarianceThreshold returns the variance threshold for dual read comparison.
// Values are clamped to be > 0. 
//
// Environment Variable: DUAL_READ_VARIANCE_THRESHOLD
// Default: 0.25
// Format: float64 string (e.g., "0.25", "0.1", "0.5")
//
// Used to determine when variance between legacy and new extraction data
// is significant enough to warrant investigation.
func GetDualReadVarianceThreshold() float64 {
	return getFloatEnv("DUAL_READ_VARIANCE_THRESHOLD", 0.25)
}

// Phase Implementation Notes:
//
// Phase P0 (Current): Infrastructure setup - no runtime integration yet
// - [x] Feature flag constants defined
// - [x] Database migration created  
// - [x] Documentation complete
// - [ ] Migration testing and verification
//
// Phase P1 (Next): Feature extraction table integration
// - [ ] Implement FeatureExtractionService.SaveFeatures()
// - [ ] Add dual-write logic in extraction handlers
// - [ ] Wire IsExtractionFeatureTableEnabled() into extraction flow
// - [ ] Add processing state tracking and retry logic
//
// Phase P2: Enhanced keyword extraction 
// - [ ] Implement DetailedKeywordExtractionService
// - [ ] Wire IsExtractionKeywordDetailEnabled() into keyword flow
// - [ ] Add semantic analysis and clustering algorithms
//
// Phase P3: Analysis migration to new tables
// - [ ] Modify AnalysisService to support dual read paths
// - [ ] Wire IsAnalysisReadsFeatureTableEnabled() into analysis flow  
// - [ ] Implement fallback and data mapping logic
//
// Phase P4: Adaptive crawling
// - [ ] Implement MicrocrawlAdaptiveService
// - [ ] Wire IsMicrocrawlAdaptiveModeEnabled() into crawl orchestration
// - [ ] Add site analysis and dynamic strategy selection
//
// Phase P5: Advanced scoring
// - [ ] Implement DetailedScoringService with new algorithms
// - [ ] Wire IsAnalysisRescoringEnabled() into scoring flow
// - [ ] Add feature-weighted and keyword-relevance scoring
//
// Subsequent phases (P6-P8) will focus on optimization, migration, and cleanup.