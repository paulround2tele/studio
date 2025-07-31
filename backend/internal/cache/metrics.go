// File: backend/internal/cache/metrics.go
package cache

import (
	"context"
	"fmt"
	"log"
	"sync/atomic"
	"time"
)

// CacheMetricsCollector provides comprehensive cache performance monitoring
type CacheMetricsCollector struct {
	cache         RedisCache
	metricsBuffer []CacheMetricSnapshot
	startTime     time.Time

	// Atomic counters for thread-safe metrics
	totalOperations int64
	cacheHits       int64
	cacheMisses     int64
	cacheErrors     int64
	avgLatencySum   int64
	avgLatencyCount int64

	// Performance tracking
	slowOperations  int64
	slowThresholdMs int64

	// Memory tracking
	estimatedMemoryMB int64
}

// CacheMetricSnapshot represents a point-in-time cache performance measurement
type CacheMetricSnapshot struct {
	Timestamp        time.Time `json:"timestamp"`
	HitCount         int64     `json:"hitCount"`
	MissCount        int64     `json:"missCount"`
	ErrorCount       int64     `json:"errorCount"`
	TotalRequests    int64     `json:"totalRequests"`
	HitRatio         float64   `json:"hitRatio"`
	AvgLatencyMs     float64   `json:"avgLatencyMs"`
	MemoryUsedMB     float64   `json:"memoryUsedMB"`
	SlowOperations   int64     `json:"slowOperations"`
	OperationsPerSec float64   `json:"operationsPerSec"`
}

// CachePerformanceAlert represents a performance alert condition
type CachePerformanceAlert struct {
	AlertType   string    `json:"alertType"`
	Severity    string    `json:"severity"`
	Message     string    `json:"message"`
	Metric      string    `json:"metric"`
	Value       float64   `json:"value"`
	Threshold   float64   `json:"threshold"`
	Timestamp   time.Time `json:"timestamp"`
	Suggestions []string  `json:"suggestions"`
}

// NewCacheMetricsCollector creates a new metrics collector for cache monitoring
func NewCacheMetricsCollector(cache RedisCache) *CacheMetricsCollector {
	return &CacheMetricsCollector{
		cache:           cache,
		metricsBuffer:   make([]CacheMetricSnapshot, 0, 100), // Ring buffer for metrics history
		startTime:       time.Now(),
		slowThresholdMs: 100, // Operations taking longer than 100ms are considered slow
	}
}

// RecordOperation records a cache operation for performance tracking
func (cmc *CacheMetricsCollector) RecordOperation(operationType string, latency time.Duration, isHit bool, hasError bool) {
	atomic.AddInt64(&cmc.totalOperations, 1)

	if hasError {
		atomic.AddInt64(&cmc.cacheErrors, 1)
		return
	}

	if isHit {
		atomic.AddInt64(&cmc.cacheHits, 1)
	} else {
		atomic.AddInt64(&cmc.cacheMisses, 1)
	}

	// Track latency
	latencyMs := latency.Milliseconds()
	atomic.AddInt64(&cmc.avgLatencySum, latencyMs)
	atomic.AddInt64(&cmc.avgLatencyCount, 1)

	// Track slow operations
	if latencyMs > cmc.slowThresholdMs {
		atomic.AddInt64(&cmc.slowOperations, 1)
		log.Printf("CacheMetrics: Slow %s operation detected: %dms", operationType, latencyMs)
	}
}

// GetCurrentSnapshot returns current cache performance metrics
func (cmc *CacheMetricsCollector) GetCurrentSnapshot() CacheMetricSnapshot {
	now := time.Now()
	totalOps := atomic.LoadInt64(&cmc.totalOperations)
	hits := atomic.LoadInt64(&cmc.cacheHits)
	misses := atomic.LoadInt64(&cmc.cacheMisses)
	errors := atomic.LoadInt64(&cmc.cacheErrors)
	latencySum := atomic.LoadInt64(&cmc.avgLatencySum)
	latencyCount := atomic.LoadInt64(&cmc.avgLatencyCount)
	slowOps := atomic.LoadInt64(&cmc.slowOperations)

	var hitRatio float64
	if totalOps > 0 {
		hitRatio = float64(hits) / float64(totalOps)
	}

	var avgLatency float64
	if latencyCount > 0 {
		avgLatency = float64(latencySum) / float64(latencyCount)
	}

	// Calculate operations per second
	uptime := now.Sub(cmc.startTime).Seconds()
	var opsPerSec float64
	if uptime > 0 {
		opsPerSec = float64(totalOps) / uptime
	}

	// Get cache-specific metrics
	cacheMetrics := cmc.cache.GetMetrics()

	return CacheMetricSnapshot{
		Timestamp:        now,
		HitCount:         hits,
		MissCount:        misses,
		ErrorCount:       errors,
		TotalRequests:    totalOps,
		HitRatio:         hitRatio,
		AvgLatencyMs:     avgLatency,
		MemoryUsedMB:     cacheMetrics.MemoryUsedMB,
		SlowOperations:   slowOps,
		OperationsPerSec: opsPerSec,
	}
}

// AddSnapshot adds a metrics snapshot to the buffer (for historical tracking)
func (cmc *CacheMetricsCollector) AddSnapshot(snapshot CacheMetricSnapshot) {
	// Implement ring buffer logic to keep last 100 snapshots
	if len(cmc.metricsBuffer) >= 100 {
		// Remove oldest, add newest
		cmc.metricsBuffer = append(cmc.metricsBuffer[1:], snapshot)
	} else {
		cmc.metricsBuffer = append(cmc.metricsBuffer, snapshot)
	}
}

// GetHistoricalSnapshots returns historical metrics snapshots
func (cmc *CacheMetricsCollector) GetHistoricalSnapshots(limit int) []CacheMetricSnapshot {
	if limit <= 0 || limit > len(cmc.metricsBuffer) {
		limit = len(cmc.metricsBuffer)
	}

	start := len(cmc.metricsBuffer) - limit
	if start < 0 {
		start = 0
	}

	return cmc.metricsBuffer[start:]
}

// CheckPerformanceAlerts analyzes current metrics and returns performance alerts
func (cmc *CacheMetricsCollector) CheckPerformanceAlerts() []CachePerformanceAlert {
	snapshot := cmc.GetCurrentSnapshot()
	var alerts []CachePerformanceAlert

	// Low hit ratio alert
	if snapshot.HitRatio < 0.7 && snapshot.TotalRequests > 100 {
		alerts = append(alerts, CachePerformanceAlert{
			AlertType: "low_hit_ratio",
			Severity:  "warning",
			Message:   fmt.Sprintf("Cache hit ratio is %.2f%%, below recommended threshold of 70%%", snapshot.HitRatio*100),
			Metric:    "hit_ratio",
			Value:     snapshot.HitRatio,
			Threshold: 0.7,
			Timestamp: snapshot.Timestamp,
			Suggestions: []string{
				"Review cache TTL settings",
				"Analyze cache key patterns for optimization",
				"Consider increasing cache memory allocation",
				"Implement cache warming strategies",
			},
		})
	}

	// High latency alert
	if snapshot.AvgLatencyMs > 50 {
		alerts = append(alerts, CachePerformanceAlert{
			AlertType: "high_latency",
			Severity:  "warning",
			Message:   fmt.Sprintf("Average cache latency is %.2fms, above recommended threshold of 50ms", snapshot.AvgLatencyMs),
			Metric:    "avg_latency",
			Value:     snapshot.AvgLatencyMs,
			Threshold: 50,
			Timestamp: snapshot.Timestamp,
			Suggestions: []string{
				"Check Redis server performance",
				"Review network connectivity",
				"Consider connection pooling optimization",
				"Analyze slow operations patterns",
			},
		})
	}

	// High error rate alert
	errorRate := float64(snapshot.ErrorCount) / float64(snapshot.TotalRequests)
	if errorRate > 0.05 && snapshot.TotalRequests > 50 {
		alerts = append(alerts, CachePerformanceAlert{
			AlertType: "high_error_rate",
			Severity:  "critical",
			Message:   fmt.Sprintf("Cache error rate is %.2f%%, above acceptable threshold of 5%%", errorRate*100),
			Metric:    "error_rate",
			Value:     errorRate,
			Threshold: 0.05,
			Timestamp: snapshot.Timestamp,
			Suggestions: []string{
				"Check Redis server health",
				"Review network stability",
				"Verify cache configuration",
				"Implement fallback mechanisms",
			},
		})
	}

	// Too many slow operations
	slowOperationRate := float64(snapshot.SlowOperations) / float64(snapshot.TotalRequests)
	if slowOperationRate > 0.1 && snapshot.TotalRequests > 50 {
		alerts = append(alerts, CachePerformanceAlert{
			AlertType: "slow_operations",
			Severity:  "warning",
			Message:   fmt.Sprintf("%.2f%% of operations are slow (>%dms)", slowOperationRate*100, cmc.slowThresholdMs),
			Metric:    "slow_operation_rate",
			Value:     slowOperationRate,
			Threshold: 0.1,
			Timestamp: snapshot.Timestamp,
			Suggestions: []string{
				"Profile slow cache operations",
				"Optimize data serialization",
				"Review key naming patterns",
				"Consider data structure optimization",
			},
		})
	}

	return alerts
}

// GetPerformanceSummary returns a comprehensive performance summary
func (cmc *CacheMetricsCollector) GetPerformanceSummary() map[string]interface{} {
	snapshot := cmc.GetCurrentSnapshot()
	alerts := cmc.CheckPerformanceAlerts()

	uptime := time.Since(cmc.startTime)

	summary := map[string]interface{}{
		"current_metrics": snapshot,
		"uptime_seconds":  uptime.Seconds(),
		"uptime_human":    uptime.String(),
		"performance_status": func() string {
			if len(alerts) == 0 {
				return "healthy"
			}

			hasCritical := false
			for _, alert := range alerts {
				if alert.Severity == "critical" {
					hasCritical = true
					break
				}
			}

			if hasCritical {
				return "critical"
			}
			return "warning"
		}(),
		"active_alerts":      alerts,
		"alert_count":        len(alerts),
		"recommendations":    cmc.generateRecommendations(snapshot),
		"optimization_score": cmc.calculateOptimizationScore(snapshot),
	}

	return summary
}

// generateRecommendations provides actionable optimization recommendations
func (cmc *CacheMetricsCollector) generateRecommendations(snapshot CacheMetricSnapshot) []string {
	var recommendations []string

	if snapshot.HitRatio < 0.8 {
		recommendations = append(recommendations,
			"Consider increasing TTL values for stable data",
			"Implement cache warming for frequently accessed entities",
			"Review cache invalidation strategies")
	}

	if snapshot.AvgLatencyMs > 20 {
		recommendations = append(recommendations,
			"Optimize Redis configuration for better performance",
			"Consider data compression for large cached objects",
			"Review connection pooling settings")
	}

	if snapshot.OperationsPerSec > 1000 {
		recommendations = append(recommendations,
			"Consider implementing read replicas for high load",
			"Implement request batching where possible",
			"Monitor memory usage and consider scaling")
	}

	if len(recommendations) == 0 {
		recommendations = append(recommendations, "Cache performance is optimal")
	}

	return recommendations
}

// calculateOptimizationScore calculates a performance score from 0-100
func (cmc *CacheMetricsCollector) calculateOptimizationScore(snapshot CacheMetricSnapshot) float64 {
	// Hit ratio impact (40% of score)
	hitRatioScore := snapshot.HitRatio * 40

	// Latency impact (30% of score)
	latencyScore := 30.0
	if snapshot.AvgLatencyMs > 50 {
		latencyScore = latencyScore * (50 / snapshot.AvgLatencyMs)
		if latencyScore < 0 {
			latencyScore = 0
		}
	}

	// Error rate impact (20% of score)
	errorRate := float64(snapshot.ErrorCount) / float64(snapshot.TotalRequests)
	errorScore := 20.0
	if errorRate > 0 {
		errorScore = 20.0 * (1 - errorRate*10) // 10% error rate = 0 score
		if errorScore < 0 {
			errorScore = 0
		}
	}

	// Slow operations impact (10% of score)
	slowRate := float64(snapshot.SlowOperations) / float64(snapshot.TotalRequests)
	slowScore := 10.0
	if slowRate > 0 {
		slowScore = 10.0 * (1 - slowRate*5) // 20% slow rate = 0 score
		if slowScore < 0 {
			slowScore = 0
		}
	}

	totalScore := hitRatioScore + latencyScore + errorScore + slowScore
	if totalScore > 100 {
		totalScore = 100
	}

	return totalScore
}

// StartMetricsCollection begins periodic metrics collection
func (cmc *CacheMetricsCollector) StartMetricsCollection(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("CacheMetrics: Starting metrics collection with %v interval", interval)

	for {
		select {
		case <-ctx.Done():
			log.Printf("CacheMetrics: Stopping metrics collection")
			return
		case <-ticker.C:
			snapshot := cmc.GetCurrentSnapshot()
			cmc.AddSnapshot(snapshot)

			// Log summary every 10 snapshots (adjustable)
			if len(cmc.metricsBuffer)%10 == 0 {
				log.Printf("CacheMetrics: Hit ratio: %.2f%%, Avg latency: %.2fms, Total ops: %d",
					snapshot.HitRatio*100, snapshot.AvgLatencyMs, snapshot.TotalRequests)
			}

			// Check for alerts
			alerts := cmc.CheckPerformanceAlerts()
			for _, alert := range alerts {
				log.Printf("CacheAlert [%s]: %s", alert.Severity, alert.Message)
			}
		}
	}
}
