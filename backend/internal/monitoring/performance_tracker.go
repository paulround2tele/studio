// File: backend/internal/monitoring/performance_tracker.go
package monitoring

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// ===============================================================================
// WEEK 2 DAY 2: PERFORMANCE TRACKING SERVICE
// Track how long things take and identify bottlenecks
// ===============================================================================

// PerformanceMetric - Individual performance measurement
type PerformanceMetric struct {
	OperationType    string        `json:"operationType"` // "domain_generation", "dns_validation", etc.
	CampaignID       *uuid.UUID    `json:"campaignId,omitempty"`
	StartTime        time.Time     `json:"startTime"`
	EndTime          time.Time     `json:"endTime"`
	Duration         time.Duration `json:"duration"`
	ItemsProcessed   int           `json:"itemsProcessed"` // domains processed, etc.
	Success          bool          `json:"success"`
	ErrorMessage     string        `json:"errorMessage,omitempty"`
	ResponseTimeMs   int64         `json:"responseTimeMs"`
	ThroughputPerSec float64       `json:"throughputPerSec"`
}

// PerformanceSummary - Aggregated performance data
type PerformanceSummary struct {
	OperationType     string    `json:"operationType"`
	TotalOperations   int       `json:"totalOperations"`
	SuccessfulOps     int       `json:"successfulOps"`
	FailedOps         int       `json:"failedOps"`
	SuccessRate       float64   `json:"successRate"`
	AvgResponseTimeMs int64     `json:"avgResponseTimeMs"`
	MinResponseTimeMs int64     `json:"minResponseTimeMs"`
	MaxResponseTimeMs int64     `json:"maxResponseTimeMs"`
	AvgThroughput     float64   `json:"avgThroughput"`
	LastUpdated       time.Time `json:"lastUpdated"`
}

// PerformanceTracker - Tracks operation performance
type PerformanceTracker struct {
	metrics    []PerformanceMetric
	summaries  map[string]*PerformanceSummary
	activeOps  map[string]*PerformanceMetric // operationID -> metric
	mutex      sync.RWMutex
	maxMetrics int // Keep only last N metrics
}

// NewPerformanceTracker - Create performance tracker
func NewPerformanceTracker() *PerformanceTracker {
	return &PerformanceTracker{
		metrics:    make([]PerformanceMetric, 0),
		summaries:  make(map[string]*PerformanceSummary),
		activeOps:  make(map[string]*PerformanceMetric),
		maxMetrics: 1000, // Keep last 1000 operations
	}
}

// StartOperation - Begin tracking an operation
func (pt *PerformanceTracker) StartOperation(operationID, operationType string, campaignID *uuid.UUID) {
	pt.mutex.Lock()
	defer pt.mutex.Unlock()

	metric := &PerformanceMetric{
		OperationType: operationType,
		CampaignID:    campaignID,
		StartTime:     time.Now(),
	}

	pt.activeOps[operationID] = metric
}

// EndOperation - Finish tracking an operation
func (pt *PerformanceTracker) EndOperation(operationID string, itemsProcessed int, success bool, errorMessage string) {
	pt.mutex.Lock()
	defer pt.mutex.Unlock()

	metric, exists := pt.activeOps[operationID]
	if !exists {
		return
	}

	// Complete the metric
	metric.EndTime = time.Now()
	metric.Duration = metric.EndTime.Sub(metric.StartTime)
	metric.ItemsProcessed = itemsProcessed
	metric.Success = success
	metric.ErrorMessage = errorMessage
	metric.ResponseTimeMs = metric.Duration.Milliseconds()

	// Calculate throughput
	if metric.Duration.Seconds() > 0 {
		metric.ThroughputPerSec = float64(itemsProcessed) / metric.Duration.Seconds()
	}

	// Add to metrics history
	pt.metrics = append(pt.metrics, *metric)

	// Keep only last N metrics
	if len(pt.metrics) > pt.maxMetrics {
		pt.metrics = pt.metrics[len(pt.metrics)-pt.maxMetrics:]
	}

	// Update summary
	pt.updateSummary(metric.OperationType, *metric)

	// Remove from active operations
	delete(pt.activeOps, operationID)
}

// updateSummary - Update aggregated performance data
func (pt *PerformanceTracker) updateSummary(operationType string, metric PerformanceMetric) {
	summary, exists := pt.summaries[operationType]
	if !exists {
		summary = &PerformanceSummary{
			OperationType:     operationType,
			MinResponseTimeMs: metric.ResponseTimeMs,
			MaxResponseTimeMs: metric.ResponseTimeMs,
		}
		pt.summaries[operationType] = summary
	}

	// Update counters
	summary.TotalOperations++
	if metric.Success {
		summary.SuccessfulOps++
	} else {
		summary.FailedOps++
	}

	// Update success rate
	summary.SuccessRate = float64(summary.SuccessfulOps) / float64(summary.TotalOperations) * 100

	// Update response time stats
	if metric.ResponseTimeMs < summary.MinResponseTimeMs {
		summary.MinResponseTimeMs = metric.ResponseTimeMs
	}
	if metric.ResponseTimeMs > summary.MaxResponseTimeMs {
		summary.MaxResponseTimeMs = metric.ResponseTimeMs
	}

	// Calculate average response time (simple moving average)
	totalResponseTime := summary.AvgResponseTimeMs * int64(summary.TotalOperations-1)
	summary.AvgResponseTimeMs = (totalResponseTime + metric.ResponseTimeMs) / int64(summary.TotalOperations)

	// Calculate average throughput
	totalThroughput := summary.AvgThroughput * float64(summary.TotalOperations-1)
	summary.AvgThroughput = (totalThroughput + metric.ThroughputPerSec) / float64(summary.TotalOperations)

	summary.LastUpdated = time.Now()
}

// GetRecentMetrics - Get recent performance metrics
func (pt *PerformanceTracker) GetRecentMetrics(limit int) []PerformanceMetric {
	pt.mutex.RLock()
	defer pt.mutex.RUnlock()

	if limit <= 0 || limit > len(pt.metrics) {
		limit = len(pt.metrics)
	}

	// Return most recent metrics
	start := len(pt.metrics) - limit
	if start < 0 {
		start = 0
	}

	metrics := make([]PerformanceMetric, limit)
	copy(metrics, pt.metrics[start:])
	return metrics
}

// GetSummary - Get performance summary for operation type
func (pt *PerformanceTracker) GetSummary(operationType string) (*PerformanceSummary, bool) {
	pt.mutex.RLock()
	defer pt.mutex.RUnlock()

	summary, exists := pt.summaries[operationType]
	if exists {
		// Return copy
		summaryCopy := *summary
		return &summaryCopy, true
	}
	return nil, false
}

// GetAllSummaries - Get all performance summaries
func (pt *PerformanceTracker) GetAllSummaries() map[string]PerformanceSummary {
	pt.mutex.RLock()
	defer pt.mutex.RUnlock()

	summaries := make(map[string]PerformanceSummary)
	for opType, summary := range pt.summaries {
		summaries[opType] = *summary
	}
	return summaries
}

// GetActiveOperations - Get currently running operations
func (pt *PerformanceTracker) GetActiveOperations() []ActiveOperation {
	pt.mutex.RLock()
	defer pt.mutex.RUnlock()

	operations := make([]ActiveOperation, 0, len(pt.activeOps))
	for opID, metric := range pt.activeOps {
		operations = append(operations, ActiveOperation{
			OperationID:   opID,
			OperationType: metric.OperationType,
			CampaignID:    metric.CampaignID,
			StartTime:     metric.StartTime,
			Duration:      time.Since(metric.StartTime),
		})
	}
	return operations
}

// ActiveOperation - Currently running operation
type ActiveOperation struct {
	OperationID   string        `json:"operationId"`
	OperationType string        `json:"operationType"`
	CampaignID    *uuid.UUID    `json:"campaignId,omitempty"`
	StartTime     time.Time     `json:"startTime"`
	Duration      time.Duration `json:"duration"`
}

// GetMetricsByOperationType - Get metrics for specific operation type
func (pt *PerformanceTracker) GetMetricsByOperationType(operationType string, limit int) []PerformanceMetric {
	pt.mutex.RLock()
	defer pt.mutex.RUnlock()

	filtered := make([]PerformanceMetric, 0)
	for i := len(pt.metrics) - 1; i >= 0 && len(filtered) < limit; i-- {
		if pt.metrics[i].OperationType == operationType {
			filtered = append(filtered, pt.metrics[i])
		}
	}
	return filtered
}

// GetSlowOperations - Get operations that took longer than threshold
func (pt *PerformanceTracker) GetSlowOperations(thresholdMs int64, limit int) []PerformanceMetric {
	pt.mutex.RLock()
	defer pt.mutex.RUnlock()

	slow := make([]PerformanceMetric, 0)
	for i := len(pt.metrics) - 1; i >= 0 && len(slow) < limit; i-- {
		if pt.metrics[i].ResponseTimeMs > thresholdMs {
			slow = append(slow, pt.metrics[i])
		}
	}
	return slow
}

// GetFailedOperations - Get recent failed operations
func (pt *PerformanceTracker) GetFailedOperations(limit int) []PerformanceMetric {
	pt.mutex.RLock()
	defer pt.mutex.RUnlock()

	failed := make([]PerformanceMetric, 0)
	for i := len(pt.metrics) - 1; i >= 0 && len(failed) < limit; i-- {
		if !pt.metrics[i].Success {
			failed = append(failed, pt.metrics[i])
		}
	}
	return failed
}

// GetThroughputTrends - Get throughput over time (simplified)
func (pt *PerformanceTracker) GetThroughputTrends(operationType string, hours int) []ThroughputPoint {
	pt.mutex.RLock()
	defer pt.mutex.RUnlock()

	// Simple implementation - just return recent metrics as trend points
	trends := make([]ThroughputPoint, 0)
	cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)

	for _, metric := range pt.metrics {
		if metric.OperationType == operationType && metric.StartTime.After(cutoff) {
			trends = append(trends, ThroughputPoint{
				Timestamp:        metric.StartTime,
				ThroughputPerSec: metric.ThroughputPerSec,
				ItemsProcessed:   metric.ItemsProcessed,
			})
		}
	}
	return trends
}

// ThroughputPoint - Point in throughput trend
type ThroughputPoint struct {
	Timestamp        time.Time `json:"timestamp"`
	ThroughputPerSec float64   `json:"throughputPerSec"`
	ItemsProcessed   int       `json:"itemsProcessed"`
}

// Reset - Clear all metrics (for testing)
func (pt *PerformanceTracker) Reset() {
	pt.mutex.Lock()
	defer pt.mutex.Unlock()

	pt.metrics = make([]PerformanceMetric, 0)
	pt.summaries = make(map[string]*PerformanceSummary)
	pt.activeOps = make(map[string]*PerformanceMetric)
}
