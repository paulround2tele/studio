package models

import (
	"encoding/json"
	"os"
)

// Configuration for the MCP Studio Backend server
type Config struct {
	StudioBackendPath     string             `json:"studio_backend_path"`
	DatabaseConnection    string             `json:"database_connection"`
	AnalysisDepth         string             `json:"analysis_depth"`
	CacheTTL              int                `json:"cache_ttl"`
	IncludeTestFiles      bool               `json:"include_test_files"`
	IncludeVendorDeps     bool               `json:"include_vendor_deps"`
	PerformanceMonitoring bool               `json:"performance_monitoring"`
	RealTimeSync          bool               `json:"real_time_sync"`
	DomainSpecific        DomainSpecificConfig `json:"domain_specific"`
	SearchCapabilities    SearchConfig       `json:"search_capabilities"`
}

type DomainSpecificConfig struct {
	CampaignAnalysis      bool `json:"campaign_analysis"`
	PerformanceTracking   bool `json:"performance_tracking"`
	StateMachineAnalysis  bool `json:"state_machine_analysis"`
	TransactionMonitoring bool `json:"transaction_monitoring"`
	ResiliencePatterns    bool `json:"resilience_patterns"`
}

type SearchConfig struct {
	FuzzySearch           bool `json:"fuzzy_search"`
	SemanticSearch        bool `json:"semantic_search"`
	CodePatternMatching   bool `json:"code_pattern_matching"`
	CrossReferenceAnalysis bool `json:"cross_reference_analysis"`
}

// LoadConfig loads configuration from a JSON file
func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var config Config
	err = json.Unmarshal(data, &config)
	if err != nil {
		return nil, err
	}

	return &config, nil
}

// DefaultConfig returns a default configuration
func DefaultConfig() *Config {
	return &Config{
		StudioBackendPath:     "../backend",
		DatabaseConnection:    "postgresql://localhost:5432/studio",
		AnalysisDepth:         "deep",
		CacheTTL:              300,
		IncludeTestFiles:      true,
		IncludeVendorDeps:     false,
		PerformanceMonitoring: true,
		RealTimeSync:          true,
		DomainSpecific: DomainSpecificConfig{
			CampaignAnalysis:      true,
			PerformanceTracking:   true,
			StateMachineAnalysis:  true,
			TransactionMonitoring: true,
			ResiliencePatterns:    true,
		},
		SearchCapabilities: SearchConfig{
			FuzzySearch:           true,
			SemanticSearch:        true,
			CodePatternMatching:   true,
			CrossReferenceAnalysis: true,
		},
	}
}