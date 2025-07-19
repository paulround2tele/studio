package observability

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"
)

// BulkOperationMetrics provides comprehensive monitoring for enterprise-scale operations
type BulkOperationMetrics struct {
	// Performance tracking
	operationCounts    map[string]*int64
	operationDurations map[string]*OperationDuration
	errorCounts        map[string]*int64
	retryAttempts      map[string]*int64

	// Memory and resource tracking
	memoryUsage       *int64
	activeConnections *int64
	peakConnections   *int64

	// Bulk operation specific metrics
	domainsProcessed    *int64
	campaignsProcessed  *int64
	averageResponseTime *int64 // microseconds
	throughputPerSecond *int64

	// Worker pool metrics
	activeWorkers     map[string]*int64
	workerUtilization map[string]*int64
	queueDepth        map[string]*int64

	// Database performance
	dbQueryCount          *int64
	dbQueryDuration       *int64 // total microseconds
	dbConnectionPoolUsage *int64

	// Real-time tracking
	startTime     time.Time
	lastResetTime time.Time

	// Thread safety
	mutex sync.RWMutex

	// Metric aggregation
	aggregationInterval time.Duration
	metricsHistory      []MetricsSnapshot
	maxHistorySize      int
}

// OperationDuration tracks timing metrics for operations
type OperationDuration struct {
	TotalDuration int64 // microseconds
	Count         int64
	MinDuration   int64
	MaxDuration   int64
}

// MetricsSnapshot represents a point-in-time snapshot of all metrics
type MetricsSnapshot struct {
	Timestamp           time.Time        `json:"timestamp"`
	OperationCounts     map[string]int64 `json:"operation_counts"`
	ErrorCounts         map[string]int64 `json:"error_counts"`
	AverageResponseTime int64            `json:"average_response_time_us"`
	ThroughputPerSecond int64            `json:"throughput_per_second"`
	MemoryUsage         int64            `json:"memory_usage"`
	ActiveConnections   int64            `json:"active_connections"`
	DomainsProcessed    int64            `json:"domains_processed"`
	CampaignsProcessed  int64            `json:"campaigns_processed"`
	WorkerUtilization   map[string]int64 `json:"worker_utilization"`
	DatabaseMetrics     DatabaseMetrics  `json:"database_metrics"`
}

// DatabaseMetrics tracks database performance
type DatabaseMetrics struct {
	QueryCount          int64 `json:"query_count"`
	AverageQueryTime    int64 `json:"average_query_time_us"`
	ConnectionPoolUsage int64 `json:"connection_pool_usage"`
	SlowQueries         int64 `json:"slow_queries"`
}

// NewBulkOperationMetrics creates a new metrics tracking system
func NewBulkOperationMetrics() *BulkOperationMetrics {
	return &BulkOperationMetrics{
		operationCounts:    make(map[string]*int64),
		operationDurations: make(map[string]*OperationDuration),
		errorCounts:        make(map[string]*int64),
		retryAttempts:      make(map[string]*int64),
		activeWorkers:      make(map[string]*int64),
		workerUtilization:  make(map[string]*int64),
		queueDepth:         make(map[string]*int64),

		memoryUsage:           new(int64),
		activeConnections:     new(int64),
		peakConnections:       new(int64),
		domainsProcessed:      new(int64),
		campaignsProcessed:    new(int64),
		averageResponseTime:   new(int64),
		throughputPerSecond:   new(int64),
		dbQueryCount:          new(int64),
		dbQueryDuration:       new(int64),
		dbConnectionPoolUsage: new(int64),

		startTime:           time.Now(),
		lastResetTime:       time.Now(),
		aggregationInterval: 5 * time.Second,
		metricsHistory:      make([]MetricsSnapshot, 0),
		maxHistorySize:      288, // 24 hours of 5-second intervals
	}
}

// IncrementOperationCount increments the count for a specific operation
func (bom *BulkOperationMetrics) IncrementOperationCount(operation string) {
	bom.mutex.Lock()
	defer bom.mutex.Unlock()

	if bom.operationCounts[operation] == nil {
		bom.operationCounts[operation] = new(int64)
	}
	atomic.AddInt64(bom.operationCounts[operation], 1)
}

// RecordOperationDuration records timing for an operation
func (bom *BulkOperationMetrics) RecordOperationDuration(operation string, duration time.Duration) {
	bom.mutex.Lock()
	defer bom.mutex.Unlock()

	durationMicros := duration.Microseconds()

	if bom.operationDurations[operation] == nil {
		bom.operationDurations[operation] = &OperationDuration{
			MinDuration: durationMicros,
			MaxDuration: durationMicros,
		}
	}

	od := bom.operationDurations[operation]
	atomic.AddInt64(&od.TotalDuration, durationMicros)
	atomic.AddInt64(&od.Count, 1)

	// Update min/max
	if durationMicros < od.MinDuration {
		od.MinDuration = durationMicros
	}
	if durationMicros > od.MaxDuration {
		od.MaxDuration = durationMicros
	}

	// Update average response time
	if od.Count > 0 {
		avgTime := od.TotalDuration / od.Count
		atomic.StoreInt64(bom.averageResponseTime, avgTime)
	}
}

// IncrementErrorCount increments error count for an operation
func (bom *BulkOperationMetrics) IncrementErrorCount(operation string) {
	bom.mutex.Lock()
	defer bom.mutex.Unlock()

	if bom.errorCounts[operation] == nil {
		bom.errorCounts[operation] = new(int64)
	}
	atomic.AddInt64(bom.errorCounts[operation], 1)
}

// RecordDomainsProcessed adds to the total domains processed count
func (bom *BulkOperationMetrics) RecordDomainsProcessed(count int64) {
	atomic.AddInt64(bom.domainsProcessed, count)
	bom.updateThroughput()
}

// RecordCampaignsProcessed adds to the total campaigns processed count
func (bom *BulkOperationMetrics) RecordCampaignsProcessed(count int64) {
	atomic.AddInt64(bom.campaignsProcessed, count)
}

// UpdateWorkerUtilization updates worker pool utilization metrics
func (bom *BulkOperationMetrics) UpdateWorkerUtilization(workerType string, active, total int64) {
	bom.mutex.Lock()
	defer bom.mutex.Unlock()

	if bom.activeWorkers[workerType] == nil {
		bom.activeWorkers[workerType] = new(int64)
		bom.workerUtilization[workerType] = new(int64)
	}

	atomic.StoreInt64(bom.activeWorkers[workerType], active)

	var utilization int64
	if total > 0 {
		utilization = (active * 100) / total
	}
	atomic.StoreInt64(bom.workerUtilization[workerType], utilization)
}

// UpdateDatabaseMetrics updates database performance metrics
func (bom *BulkOperationMetrics) UpdateDatabaseMetrics(queryDuration time.Duration) {
	atomic.AddInt64(bom.dbQueryCount, 1)
	atomic.AddInt64(bom.dbQueryDuration, queryDuration.Microseconds())
}

// UpdateConnectionCount updates active database connections
func (bom *BulkOperationMetrics) UpdateConnectionCount(active int64) {
	atomic.StoreInt64(bom.activeConnections, active)

	// Update peak connections if necessary
	current := atomic.LoadInt64(bom.peakConnections)
	if active > current {
		atomic.CompareAndSwapInt64(bom.peakConnections, current, active)
	}
}

// UpdateMemoryUsage updates memory usage metrics
func (bom *BulkOperationMetrics) UpdateMemoryUsage(bytes int64) {
	atomic.StoreInt64(bom.memoryUsage, bytes)
}

// GetCurrentMetrics returns current metrics snapshot
func (bom *BulkOperationMetrics) GetCurrentMetrics() MetricsSnapshot {
	bom.mutex.RLock()
	defer bom.mutex.RUnlock()

	snapshot := MetricsSnapshot{
		Timestamp:           time.Now(),
		OperationCounts:     make(map[string]int64),
		ErrorCounts:         make(map[string]int64),
		WorkerUtilization:   make(map[string]int64),
		AverageResponseTime: atomic.LoadInt64(bom.averageResponseTime),
		ThroughputPerSecond: atomic.LoadInt64(bom.throughputPerSecond),
		MemoryUsage:         atomic.LoadInt64(bom.memoryUsage),
		ActiveConnections:   atomic.LoadInt64(bom.activeConnections),
		DomainsProcessed:    atomic.LoadInt64(bom.domainsProcessed),
		CampaignsProcessed:  atomic.LoadInt64(bom.campaignsProcessed),
	}

	// Copy operation counts
	for op, count := range bom.operationCounts {
		if count != nil {
			snapshot.OperationCounts[op] = atomic.LoadInt64(count)
		}
	}

	// Copy error counts
	for op, count := range bom.errorCounts {
		if count != nil {
			snapshot.ErrorCounts[op] = atomic.LoadInt64(count)
		}
	}

	// Copy worker utilization
	for worker, util := range bom.workerUtilization {
		if util != nil {
			snapshot.WorkerUtilization[worker] = atomic.LoadInt64(util)
		}
	}

	// Database metrics
	totalQueries := atomic.LoadInt64(bom.dbQueryCount)
	totalDuration := atomic.LoadInt64(bom.dbQueryDuration)

	var avgQueryTime int64
	if totalQueries > 0 {
		avgQueryTime = totalDuration / totalQueries
	}

	snapshot.DatabaseMetrics = DatabaseMetrics{
		QueryCount:          totalQueries,
		AverageQueryTime:    avgQueryTime,
		ConnectionPoolUsage: atomic.LoadInt64(bom.dbConnectionPoolUsage),
		SlowQueries:         0, // Can be enhanced to track slow queries
	}

	return snapshot
}

// GetMetricsHistory returns historical metrics
func (bom *BulkOperationMetrics) GetMetricsHistory() []MetricsSnapshot {
	bom.mutex.RLock()
	defer bom.mutex.RUnlock()

	// Return a copy of the history
	history := make([]MetricsSnapshot, len(bom.metricsHistory))
	copy(history, bom.metricsHistory)
	return history
}

// GetPerformanceSummary returns a performance summary
func (bom *BulkOperationMetrics) GetPerformanceSummary() map[string]interface{} {
	snapshot := bom.GetCurrentMetrics()

	uptime := time.Since(bom.startTime)

	summary := map[string]interface{}{
		"uptime_seconds":        uptime.Seconds(),
		"total_domains":         snapshot.DomainsProcessed,
		"total_campaigns":       snapshot.CampaignsProcessed,
		"average_response_time": fmt.Sprintf("%.2fms", float64(snapshot.AverageResponseTime)/1000.0),
		"throughput_per_second": snapshot.ThroughputPerSecond,
		"current_memory_mb":     snapshot.MemoryUsage / (1024 * 1024),
		"active_connections":    snapshot.ActiveConnections,
		"peak_connections":      atomic.LoadInt64(bom.peakConnections),
		"database_queries":      snapshot.DatabaseMetrics.QueryCount,
		"avg_query_time":        fmt.Sprintf("%.2fms", float64(snapshot.DatabaseMetrics.AverageQueryTime)/1000.0),
		"worker_utilization":    snapshot.WorkerUtilization,
		"operation_counts":      snapshot.OperationCounts,
		"error_counts":          snapshot.ErrorCounts,
	}

	return summary
}

// LogMetrics logs current metrics for monitoring
func (bom *BulkOperationMetrics) LogMetrics() {
	summary := bom.GetPerformanceSummary()
	summaryJSON, _ := json.MarshalIndent(summary, "", "  ")
	log.Printf("BulkOperationMetrics: Performance Summary:\n%s", string(summaryJSON))
}

// StartMetricsAggregation starts periodic metrics collection
func (bom *BulkOperationMetrics) StartMetricsAggregation(ctx context.Context) {
	ticker := time.NewTicker(bom.aggregationInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("BulkOperationMetrics: Stopping metrics aggregation")
			return
		case <-ticker.C:
			bom.aggregateMetrics()
		}
	}
}

// Reset resets all metrics counters
func (bom *BulkOperationMetrics) Reset() {
	bom.mutex.Lock()
	defer bom.mutex.Unlock()

	// Reset atomic counters
	atomic.StoreInt64(bom.memoryUsage, 0)
	atomic.StoreInt64(bom.activeConnections, 0)
	atomic.StoreInt64(bom.peakConnections, 0)
	atomic.StoreInt64(bom.domainsProcessed, 0)
	atomic.StoreInt64(bom.campaignsProcessed, 0)
	atomic.StoreInt64(bom.averageResponseTime, 0)
	atomic.StoreInt64(bom.throughputPerSecond, 0)
	atomic.StoreInt64(bom.dbQueryCount, 0)
	atomic.StoreInt64(bom.dbQueryDuration, 0)

	// Reset maps
	for op := range bom.operationCounts {
		atomic.StoreInt64(bom.operationCounts[op], 0)
	}
	for op := range bom.errorCounts {
		atomic.StoreInt64(bom.errorCounts[op], 0)
	}

	bom.lastResetTime = time.Now()
	log.Printf("BulkOperationMetrics: All metrics reset")
}

// Private helper methods

func (bom *BulkOperationMetrics) updateThroughput() {
	elapsed := time.Since(bom.lastResetTime).Seconds()
	if elapsed > 0 {
		totalDomains := atomic.LoadInt64(bom.domainsProcessed)
		throughput := int64(float64(totalDomains) / elapsed)
		atomic.StoreInt64(bom.throughputPerSecond, throughput)
	}
}

func (bom *BulkOperationMetrics) aggregateMetrics() {
	snapshot := bom.GetCurrentMetrics()

	bom.mutex.Lock()
	defer bom.mutex.Unlock()

	// Add to history
	bom.metricsHistory = append(bom.metricsHistory, snapshot)

	// Trim history if too large
	if len(bom.metricsHistory) > bom.maxHistorySize {
		bom.metricsHistory = bom.metricsHistory[1:]
	}
}
