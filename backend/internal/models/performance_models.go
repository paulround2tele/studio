// File: backend/internal/models/performance_models.go
package models

import (
	"time"
)

// ConnectionPoolMetrics represents database connection pool health metrics
type ConnectionPoolMetrics struct {
	ID                      int64     `db:"id" json:"id"`
	ActiveConnections       int       `db:"active_connections" json:"activeConnections"`
	IdleConnections         int       `db:"idle_connections" json:"idleConnections"`
	MaxConnections          int       `db:"max_connections" json:"maxConnections"`
	WaitCount               int       `db:"wait_count" json:"waitCount"`
	WaitDurationMs          int       `db:"wait_duration_ms" json:"waitDurationMs"`
	ConnectionErrors        int       `db:"connection_errors" json:"connectionErrors"`
	PoolUtilizationPercent  float64   `db:"pool_utilization_percent" json:"poolUtilizationPercent"`
	RecordedAt              time.Time `db:"recorded_at" json:"recordedAt"`
}

// QueryPerformanceReport aggregates performance metrics for analysis
type QueryPerformanceReport struct {
	QueryType           string  `json:"queryType"`
	TotalQueries        int64   `json:"totalQueries"`
	AverageTimeMs       float64 `json:"averageTimeMs"`
	MinTimeMs           int     `json:"minTimeMs"`
	MaxTimeMs           int     `json:"maxTimeMs"`
	P50TimeMs           int     `json:"p50TimeMs"`
	P95TimeMs           int     `json:"p95TimeMs"`
	P99TimeMs           int     `json:"p99TimeMs"`
	AverageRowsReturned float64 `json:"averageRowsReturned"`
	AverageRowsScanned  float64 `json:"averageRowsScanned"`
	IndexUsageRate      float64 `json:"indexUsageRate"`
	ErrorRate           float64 `json:"errorRate"`
	Period              string  `json:"period"`
}

// ConnectionPoolReport aggregates connection pool metrics for analysis
type ConnectionPoolReport struct {
	Period                      string  `json:"period"`
	AverageActiveConnections    float64 `json:"averageActiveConnections"`
	AverageIdleConnections      float64 `json:"averageIdleConnections"`
	MaxActiveConnections        int     `json:"maxActiveConnections"`
	AverageUtilizationPercent   float64 `json:"averageUtilizationPercent"`
	PeakUtilizationPercent      float64 `json:"peakUtilizationPercent"`
	TotalWaitEvents             int64   `json:"totalWaitEvents"`
	AverageWaitTimeMs           float64 `json:"averageWaitTimeMs"`
	TotalConnectionErrors       int64   `json:"totalConnectionErrors"`
	ConnectionErrorRate         float64 `json:"connectionErrorRate"`
}

// DatabaseOptimizationRecommendation represents optimization suggestions
type DatabaseOptimizationRecommendation struct {
	Type        string    `json:"type"`        // "index", "query", "connection_pool", "schema"
	Priority    string    `json:"priority"`    // "critical", "high", "medium", "low"
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Impact      string    `json:"impact"`      // Expected performance improvement
	Effort      string    `json:"effort"`      // Implementation effort required
	SQL         *string   `json:"sql,omitempty"` // SQL to implement the recommendation
	CreatedAt   time.Time `json:"createdAt"`
}

// PaginationPerformanceMetric tracks cursor pagination performance
type PaginationPerformanceMetric struct {
	ID              int64     `db:"id" json:"id"`
	TableName       string    `db:"table_name" json:"tableName"`
	PaginationType  string    `db:"pagination_type" json:"paginationType"` // "offset", "cursor"
	PageSize        int       `db:"page_size" json:"pageSize"`
	PageNumber      int       `db:"page_number" json:"pageNumber"`
	TotalRows       int64     `db:"total_rows" json:"totalRows"`
	ExecutionTimeMs int       `db:"execution_time_ms" json:"executionTimeMs"`
	MemoryUsageKB   int       `db:"memory_usage_kb" json:"memoryUsageKb"`
	IndexesUsed     string    `db:"indexes_used" json:"indexesUsed"`
	RecordedAt      time.Time `db:"recorded_at" json:"recordedAt"`
}

// PerformanceThreshold defines performance thresholds for monitoring
type PerformanceThreshold struct {
	QueryType               string `json:"queryType"`
	MaxExecutionTimeMs      int    `json:"maxExecutionTimeMs"`
	MaxMemoryUsageKB        int    `json:"maxMemoryUsageKb"`
	MaxRowsScannedRatio     float64 `json:"maxRowsScannedRatio"`
	MaxConnectionWaitTimeMs int    `json:"maxConnectionWaitTimeMs"`
	MinIndexUsageRate       float64 `json:"minIndexUsageRate"`
}

// DefaultPerformanceThresholds returns default performance thresholds for enterprise scale
func DefaultPerformanceThresholds() map[string]PerformanceThreshold {
	return map[string]PerformanceThreshold{
		"domain_pagination": {
			QueryType:               "domain_pagination",
			MaxExecutionTimeMs:      100,
			MaxMemoryUsageKB:        10240, // 10MB
			MaxRowsScannedRatio:     2.0,   // Max 2x more rows scanned than returned
			MaxConnectionWaitTimeMs: 50,
			MinIndexUsageRate:       0.95,  // 95% queries should use indexes
		},
		"dns_validation_pagination": {
			QueryType:               "dns_validation_pagination",
			MaxExecutionTimeMs:      100,
			MaxMemoryUsageKB:        10240,
			MaxRowsScannedRatio:     2.0,
			MaxConnectionWaitTimeMs: 50,
			MinIndexUsageRate:       0.95,
		},
		"http_validation_pagination": {
			QueryType:               "http_validation_pagination",
			MaxExecutionTimeMs:      100,
			MaxMemoryUsageKB:        10240,
			MaxRowsScannedRatio:     2.0,
			MaxConnectionWaitTimeMs: 50,
			MinIndexUsageRate:       0.95,
		},
		"campaign_filtering": {
			QueryType:               "campaign_filtering",
			MaxExecutionTimeMs:      50,
			MaxMemoryUsageKB:        5120, // 5MB
			MaxRowsScannedRatio:     1.5,
			MaxConnectionWaitTimeMs: 25,
			MinIndexUsageRate:       0.98,
		},
	}
}