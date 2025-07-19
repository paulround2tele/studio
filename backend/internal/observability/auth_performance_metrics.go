package observability

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// AuthPerformanceMetrics tracks authentication performance and optimization gains
type AuthPerformanceMetrics struct {
	// Session validation metrics
	TotalValidations int64 `json:"total_validations"`
	CacheHits        int64 `json:"cache_hits"`
	CacheMisses      int64 `json:"cache_misses"`
	DatabaseHits     int64 `json:"database_hits"`
	RedisHits        int64 `json:"redis_hits"`

	// Performance timing metrics
	AvgValidationTime  time.Duration `json:"avg_validation_time_ms"`
	AvgCacheHitTime    time.Duration `json:"avg_cache_hit_time_ms"`
	AvgDatabaseHitTime time.Duration `json:"avg_database_hit_time_ms"`

	// Request patterns
	RequestsPerSecond  float64       `json:"requests_per_second"`
	PeakValidationTime time.Duration `json:"peak_validation_time_ms"`

	// Cache efficiency
	CacheHitRate float64 `json:"cache_hit_rate"`
	RedisHitRate float64 `json:"redis_hit_rate"`

	// Performance improvements
	DatabaseLoadReduction float64 `json:"database_load_reduction_percent"`
	AvgTimeReduction      float64 `json:"avg_time_reduction_percent"`

	// Timestamps
	StartTime time.Time `json:"start_time"`
	LastReset time.Time `json:"last_reset"`

	mutex sync.RWMutex
}

// AuthPerformanceLogger provides comprehensive auth performance tracking
type AuthPerformanceLogger struct {
	metrics         *AuthPerformanceMetrics
	validationTimes []time.Duration
	cacheHitTimes   []time.Duration
	dbHitTimes      []time.Duration
	requestTimes    []time.Time
	maxSamples      int

	// Baseline metrics for comparison (before optimization)
	baselineMetrics *AuthPerformanceMetrics

	mutex sync.RWMutex
}

// ValidationResult represents the result of a session validation
type ValidationResult struct {
	Success        bool          `json:"success"`
	Duration       time.Duration `json:"duration"`
	Source         string        `json:"source"` // "redis_cache", "memory_cache", "database"
	SessionID      string        `json:"session_id,omitempty"`
	UserID         *uuid.UUID    `json:"user_id,omitempty"`
	Error          string        `json:"error,omitempty"`
	CacheHit       bool          `json:"cache_hit"`
	SecurityEvents int           `json:"security_events"`
}

// NewAuthPerformanceLogger creates a new auth performance logger
func NewAuthPerformanceLogger(maxSamples int) *AuthPerformanceLogger {
	if maxSamples <= 0 {
		maxSamples = 1000 // Default sample size
	}

	return &AuthPerformanceLogger{
		metrics: &AuthPerformanceMetrics{
			StartTime: time.Now(),
			LastReset: time.Now(),
		},
		validationTimes: make([]time.Duration, 0, maxSamples),
		cacheHitTimes:   make([]time.Duration, 0, maxSamples),
		dbHitTimes:      make([]time.Duration, 0, maxSamples),
		requestTimes:    make([]time.Time, 0, maxSamples),
		maxSamples:      maxSamples,
	}
}

// LogValidationResult logs a session validation result for performance tracking
func (apl *AuthPerformanceLogger) LogValidationResult(result ValidationResult) {
	apl.mutex.Lock()
	defer apl.mutex.Unlock()

	now := time.Now()

	// Update counters
	apl.metrics.TotalValidations++

	// Track validation timing
	apl.addValidationTime(result.Duration)
	apl.addRequestTime(now)

	// Track cache performance
	switch result.Source {
	case "redis_cache":
		apl.metrics.RedisHits++
		apl.metrics.CacheHits++
		apl.addCacheHitTime(result.Duration)
	case "memory_cache":
		apl.metrics.CacheHits++
		apl.addCacheHitTime(result.Duration)
	case "database":
		apl.metrics.DatabaseHits++
		apl.metrics.CacheMisses++
		apl.addDatabaseHitTime(result.Duration)
	}

	// Update peak validation time
	if result.Duration > apl.metrics.PeakValidationTime {
		apl.metrics.PeakValidationTime = result.Duration
	}

	// Recalculate derived metrics
	apl.recalculateMetrics()
}

// LogLegacyValidation logs a validation from the old (non-cached) system for comparison
func (apl *AuthPerformanceLogger) LogLegacyValidation(duration time.Duration, success bool) {
	// Store baseline metrics for comparison
	if apl.baselineMetrics == nil {
		apl.baselineMetrics = &AuthPerformanceMetrics{
			StartTime: time.Now(),
		}
	}

	apl.baselineMetrics.TotalValidations++
	apl.baselineMetrics.DatabaseHits++

	// All legacy validations hit the database
	apl.baselineMetrics.AvgDatabaseHitTime =
		(apl.baselineMetrics.AvgDatabaseHitTime*time.Duration(apl.baselineMetrics.TotalValidations-1) + duration) /
			time.Duration(apl.baselineMetrics.TotalValidations)
}

// GetCurrentMetrics returns a snapshot of current performance metrics
func (apl *AuthPerformanceLogger) GetCurrentMetrics() AuthPerformanceMetrics {
	apl.mutex.RLock()
	defer apl.mutex.RUnlock()

	return *apl.metrics
}

// GetPerformanceReport generates a comprehensive performance report
func (apl *AuthPerformanceLogger) GetPerformanceReport() map[string]interface{} {
	apl.mutex.RLock()
	defer apl.mutex.RUnlock()

	report := map[string]interface{}{
		"current_metrics": *apl.metrics,
		"performance_summary": map[string]interface{}{
			"total_validations":        apl.metrics.TotalValidations,
			"cache_hit_rate_percent":   apl.metrics.CacheHitRate * 100,
			"redis_hit_rate_percent":   apl.metrics.RedisHitRate * 100,
			"avg_validation_time_ms":   apl.metrics.AvgValidationTime.Milliseconds(),
			"avg_cache_hit_time_ms":    apl.metrics.AvgCacheHitTime.Milliseconds(),
			"avg_database_hit_time_ms": apl.metrics.AvgDatabaseHitTime.Milliseconds(),
			"requests_per_second":      apl.metrics.RequestsPerSecond,
			"database_load_reduction":  apl.metrics.DatabaseLoadReduction,
		},
		"optimization_gains": apl.calculateOptimizationGains(),
		"recommendations":    apl.generateRecommendations(),
		"timestamp":          time.Now().Format(time.RFC3339),
	}

	return report
}

// ResetMetrics resets all performance metrics (useful for testing)
func (apl *AuthPerformanceLogger) ResetMetrics() {
	apl.mutex.Lock()
	defer apl.mutex.Unlock()

	apl.metrics = &AuthPerformanceMetrics{
		StartTime: time.Now(),
		LastReset: time.Now(),
	}
	apl.validationTimes = apl.validationTimes[:0]
	apl.cacheHitTimes = apl.cacheHitTimes[:0]
	apl.dbHitTimes = apl.dbHitTimes[:0]
	apl.requestTimes = apl.requestTimes[:0]
}

// Private helper methods

func (apl *AuthPerformanceLogger) addValidationTime(duration time.Duration) {
	if len(apl.validationTimes) >= apl.maxSamples {
		// Remove oldest sample
		apl.validationTimes = apl.validationTimes[1:]
	}
	apl.validationTimes = append(apl.validationTimes, duration)
}

func (apl *AuthPerformanceLogger) addCacheHitTime(duration time.Duration) {
	if len(apl.cacheHitTimes) >= apl.maxSamples {
		apl.cacheHitTimes = apl.cacheHitTimes[1:]
	}
	apl.cacheHitTimes = append(apl.cacheHitTimes, duration)
}

func (apl *AuthPerformanceLogger) addDatabaseHitTime(duration time.Duration) {
	if len(apl.dbHitTimes) >= apl.maxSamples {
		apl.dbHitTimes = apl.dbHitTimes[1:]
	}
	apl.dbHitTimes = append(apl.dbHitTimes, duration)
}

func (apl *AuthPerformanceLogger) addRequestTime(t time.Time) {
	if len(apl.requestTimes) >= apl.maxSamples {
		apl.requestTimes = apl.requestTimes[1:]
	}
	apl.requestTimes = append(apl.requestTimes, t)
}

func (apl *AuthPerformanceLogger) recalculateMetrics() {
	// Calculate average validation time
	if len(apl.validationTimes) > 0 {
		total := time.Duration(0)
		for _, duration := range apl.validationTimes {
			total += duration
		}
		apl.metrics.AvgValidationTime = total / time.Duration(len(apl.validationTimes))
	}

	// Calculate average cache hit time
	if len(apl.cacheHitTimes) > 0 {
		total := time.Duration(0)
		for _, duration := range apl.cacheHitTimes {
			total += duration
		}
		apl.metrics.AvgCacheHitTime = total / time.Duration(len(apl.cacheHitTimes))
	}

	// Calculate average database hit time
	if len(apl.dbHitTimes) > 0 {
		total := time.Duration(0)
		for _, duration := range apl.dbHitTimes {
			total += duration
		}
		apl.metrics.AvgDatabaseHitTime = total / time.Duration(len(apl.dbHitTimes))
	}

	// Calculate cache hit rate
	if apl.metrics.TotalValidations > 0 {
		apl.metrics.CacheHitRate = float64(apl.metrics.CacheHits) / float64(apl.metrics.TotalValidations)
		apl.metrics.RedisHitRate = float64(apl.metrics.RedisHits) / float64(apl.metrics.TotalValidations)
	}

	// Calculate requests per second
	if len(apl.requestTimes) > 1 {
		timeDiff := apl.requestTimes[len(apl.requestTimes)-1].Sub(apl.requestTimes[0])
		if timeDiff > 0 {
			apl.metrics.RequestsPerSecond = float64(len(apl.requestTimes)) / timeDiff.Seconds()
		}
	}

	// Calculate database load reduction
	if apl.metrics.TotalValidations > 0 {
		apl.metrics.DatabaseLoadReduction = apl.metrics.CacheHitRate * 100
	}
}

func (apl *AuthPerformanceLogger) calculateOptimizationGains() map[string]interface{} {
	gains := map[string]interface{}{
		"cache_enabled": apl.metrics.CacheHits > 0,
	}

	if apl.baselineMetrics != nil && apl.baselineMetrics.TotalValidations > 0 {
		// Compare with baseline
		if apl.baselineMetrics.AvgDatabaseHitTime > 0 && apl.metrics.AvgValidationTime > 0 {
			timeReduction := (apl.baselineMetrics.AvgDatabaseHitTime - apl.metrics.AvgValidationTime).Seconds() /
				apl.baselineMetrics.AvgDatabaseHitTime.Seconds() * 100
			gains["avg_response_time_improvement_percent"] = timeReduction
		}

		gains["database_load_reduction_percent"] = apl.metrics.CacheHitRate * 100
		gains["baseline_avg_db_time_ms"] = apl.baselineMetrics.AvgDatabaseHitTime.Milliseconds()
		gains["optimized_avg_time_ms"] = apl.metrics.AvgValidationTime.Milliseconds()
	}

	return gains
}

func (apl *AuthPerformanceLogger) generateRecommendations() []string {
	recommendations := []string{}

	if apl.metrics.CacheHitRate < 0.8 {
		recommendations = append(recommendations, "Cache hit rate is below 80% - consider increasing cache TTL")
	}

	if apl.metrics.AvgValidationTime > 100*time.Millisecond {
		recommendations = append(recommendations, "Average validation time is above 100ms - investigate slow validations")
	}

	if apl.metrics.DatabaseHits > apl.metrics.TotalValidations/2 {
		recommendations = append(recommendations, "More than 50% of validations hit database - cache may need tuning")
	}

	if apl.metrics.RequestsPerSecond > 100 {
		recommendations = append(recommendations, "High request rate detected - consider implementing request rate limiting")
	}

	if len(recommendations) == 0 {
		recommendations = append(recommendations, "Authentication performance is optimal")
	}

	return recommendations
}

// Global auth performance logger instance
var globalAuthPerfLogger *AuthPerformanceLogger
var authPerfLoggerOnce sync.Once

// GetGlobalAuthPerformanceLogger returns the global auth performance logger
func GetGlobalAuthPerformanceLogger() *AuthPerformanceLogger {
	authPerfLoggerOnce.Do(func() {
		globalAuthPerfLogger = NewAuthPerformanceLogger(1000)
	})
	return globalAuthPerfLogger
}

// Helper functions for easy logging

// LogCachedValidation logs a successful cached validation
func LogCachedValidation(sessionID string, userID *uuid.UUID, duration time.Duration, source string) {
	logger := GetGlobalAuthPerformanceLogger()
	logger.LogValidationResult(ValidationResult{
		Success:   true,
		Duration:  duration,
		Source:    source,
		SessionID: sessionID,
		UserID:    userID,
		CacheHit:  source != "database",
	})
}

// LogFailedValidation logs a failed validation attempt
func LogFailedValidation(sessionID string, duration time.Duration, source string, error string) {
	logger := GetGlobalAuthPerformanceLogger()
	logger.LogValidationResult(ValidationResult{
		Success:   false,
		Duration:  duration,
		Source:    source,
		SessionID: sessionID,
		Error:     error,
		CacheHit:  source != "database",
	})
}

// GetAuthPerformanceReport returns a comprehensive performance report
func GetAuthPerformanceReport() map[string]interface{} {
	return GetGlobalAuthPerformanceLogger().GetPerformanceReport()
}
