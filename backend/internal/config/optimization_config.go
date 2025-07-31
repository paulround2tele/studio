package config

import (
	"time"
)

// OptimizationConfig contains all configuration for N+1 optimization features
type OptimizationConfig struct {
	Enabled      bool              `yaml:"enabled" json:"enabled"`
	Phases       PhaseConfig       `yaml:"phases" json:"phases"`
	Redis        RedisConfig       `yaml:"redis" json:"redis"`
	Performance  PerformanceConfig `yaml:"performance" json:"performance"`
	FeatureFlags FeatureFlagConfig `yaml:"feature_flags" json:"feature_flags"`
}

// PhaseConfig controls which optimization phases are enabled
type PhaseConfig struct {
	BatchQueries        bool `yaml:"batch_queries" json:"batch_queries"`
	ServiceOptimization bool `yaml:"service_optimization" json:"service_optimization"`
	ExternalValidation  bool `yaml:"external_validation" json:"external_validation"`
	Caching             bool `yaml:"caching" json:"caching"`
}

// PerformanceConfig contains performance tuning parameters
type PerformanceConfig struct {
	BatchSize             int            `yaml:"batch_size" json:"batch_size"`
	MaxConcurrentRequests int            `yaml:"max_concurrent_requests" json:"max_concurrent_requests"`
	DNSTimeout            time.Duration  `yaml:"dns_timeout" json:"dns_timeout"`
	HTTPTimeout           time.Duration  `yaml:"http_timeout" json:"http_timeout"`
	CacheTTL              CacheTTLConfig `yaml:"cache_ttl" json:"cache_ttl"`
}

// CacheTTLConfig contains TTL settings for different entity types
type CacheTTLConfig struct {
	Personas       time.Duration `yaml:"personas" json:"personas"`
	KeywordSets    time.Duration `yaml:"keyword_sets" json:"keyword_sets"`
	Keywords       time.Duration `yaml:"keywords" json:"keywords"`
	Proxies        time.Duration `yaml:"proxies" json:"proxies"`
	DNSValidation  time.Duration `yaml:"dns_validation" json:"dns_validation"`
	HTTPValidation time.Duration `yaml:"http_validation" json:"http_validation"`
}

// FeatureFlagConfig controls gradual rollout and feature flags
type FeatureFlagConfig struct {
	GradualRollout    bool `yaml:"gradual_rollout" json:"gradual_rollout"`
	RolloutPercentage int  `yaml:"rollout_percentage" json:"rollout_percentage"`
	FallbackOnError   bool `yaml:"fallback_on_error" json:"fallback_on_error"`
	DebugLogging      bool `yaml:"debug_logging" json:"debug_logging"`
}

// GetDefaultOptimizationConfig returns default optimization configuration
func GetDefaultOptimizationConfig() OptimizationConfig {
	return OptimizationConfig{
		Enabled: true,
		Phases: PhaseConfig{
			BatchQueries:        true,
			ServiceOptimization: true,
			ExternalValidation:  true,
			Caching:             true,
		},
		Redis: DefaultRedisConfig(),
		Performance: PerformanceConfig{
			BatchSize:             100,
			MaxConcurrentRequests: 50,
			DNSTimeout:            10 * time.Second,
			HTTPTimeout:           30 * time.Second,
			CacheTTL: CacheTTLConfig{
				Personas:       5 * time.Minute,
				KeywordSets:    10 * time.Minute,
				Keywords:       15 * time.Minute,
				Proxies:        5 * time.Minute,
				DNSValidation:  2 * time.Minute,
				HTTPValidation: 1 * time.Minute,
			},
		},
		FeatureFlags: FeatureFlagConfig{
			GradualRollout:    false,
			RolloutPercentage: 100,
			FallbackOnError:   true,
			DebugLogging:      false,
		},
	}
}

// GetDevelopmentOptimizationConfig returns development-specific configuration
func GetDevelopmentOptimizationConfig() OptimizationConfig {
	config := GetDefaultOptimizationConfig()
	config.FeatureFlags.DebugLogging = true
	config.Performance.BatchSize = 50 // Smaller batch sizes for development
	return config
}

// GetStagingOptimizationConfig returns staging-specific configuration
func GetStagingOptimizationConfig() OptimizationConfig {
	config := GetDefaultOptimizationConfig()
	config.FeatureFlags.GradualRollout = true
	config.FeatureFlags.RolloutPercentage = 50
	return config
}

// GetProductionOptimizationConfig returns production-specific configuration
func GetProductionOptimizationConfig() OptimizationConfig {
	config := GetDefaultOptimizationConfig()
	config.FeatureFlags.GradualRollout = true
	config.FeatureFlags.RolloutPercentage = 100
	return config
}
