package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// PipelineConfig contains all configuration for the unified extraction/analysis pipeline
type PipelineConfig struct {
	// Coverage minimum threshold for feature table usage
	CoverageMin float64

	// Reconciliation settings
	ReconcileEnabled      bool
	ReconcileInterval     time.Duration
	StuckRunningMaxAge    time.Duration
	StuckPendingMaxAge    time.Duration
	MissingFeatureGrace   time.Duration
	MaxRetries            int

	// Stale score detection
	StaleScoreDetectionEnabled bool
	StaleScoreMaxAge           time.Duration
}

// LoadPipelineConfig loads pipeline configuration from environment variables
// with defaults and proper clamping of values
func LoadPipelineConfig() *PipelineConfig {
	return &PipelineConfig{
		CoverageMin:                getFloatEnvClamped("ANALYSIS_FEATURE_TABLE_MIN_COVERAGE", 0.9, 0.0, 1.0),
		ReconcileEnabled:           getBoolEnv("PIPELINE_RECONCILE_ENABLED", true),
		ReconcileInterval:          getDurationEnv("PIPELINE_RECONCILE_INTERVAL", 10*time.Minute),
		StuckRunningMaxAge:         getDurationEnv("PIPELINE_STUCK_RUNNING_MAX_AGE", 30*time.Minute),
		StuckPendingMaxAge:         getDurationEnv("PIPELINE_STUCK_PENDING_MAX_AGE", 20*time.Minute),
		MissingFeatureGrace:        getDurationEnv("PIPELINE_MISSING_FEATURE_GRACE", 5*time.Minute),
		MaxRetries:                 getIntEnvClamped("PIPELINE_MAX_RETRIES", 3, 0, 10),
		StaleScoreDetectionEnabled: getBoolEnv("PIPELINE_STALE_SCORE_DETECTION_ENABLED", true),
		StaleScoreMaxAge:           getDurationEnv("PIPELINE_STALE_SCORE_MAX_AGE", 1*time.Hour),
	}
}

// getBoolEnv reads a boolean environment variable with a default value
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

// getFloatEnvClamped reads a float environment variable with clamping to valid range
func getFloatEnvClamped(key string, defaultValue, min, max float64) float64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}
	
	if floatVal, err := strconv.ParseFloat(value, 64); err == nil {
		// Clamp to valid range
		if floatVal < min {
			return min
		}
		if floatVal > max {
			return max
		}
		return floatVal
	}
	return defaultValue
}

// getIntEnvClamped reads an integer environment variable with clamping
func getIntEnvClamped(key string, defaultValue, min, max int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}
	
	if intVal, err := strconv.Atoi(value); err == nil {
		// Clamp to valid range
		if intVal < min {
			return min
		}
		if intVal > max {
			return max
		}
		return intVal
	}
	return defaultValue
}

// getDurationEnv reads a duration environment variable with fallback to default
func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}
	
	if duration, err := time.ParseDuration(value); err == nil {
		// Ensure minimum reasonable values
		if duration < time.Second {
			return time.Second
		}
		if duration > 24*time.Hour {
			return 24*time.Hour
		}
		return duration
	}
	return defaultValue
}