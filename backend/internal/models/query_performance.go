// File: backend/internal/models/query_performance.go
package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// QueryPerformanceMetric represents a query performance monitoring record
type QueryPerformanceMetric struct {
	ID                uuid.UUID       `db:"id" json:"id"`
	QueryHash         string          `db:"query_hash" json:"queryHash"`
	QuerySQL          string          `db:"query_sql" json:"querySQL"`
	QueryType         string          `db:"query_type" json:"queryType"`
	TableNames        pq.StringArray  `db:"table_names" json:"tableNames"`
	ExecutionTimeMs   float64         `db:"execution_time_ms" json:"executionTimeMs"`
	RowsExamined      int64           `db:"rows_examined" json:"rowsExamined"`
	RowsReturned      int64           `db:"rows_returned" json:"rowsReturned"`
	IndexUsage        json.RawMessage `db:"index_usage" json:"indexUsage"`
	CPUTimeMs         float64         `db:"cpu_time_ms" json:"cpuTimeMs"`
	IOWaitMs          float64         `db:"io_wait_ms" json:"ioWaitMs"`
	LockWaitMs        float64         `db:"lock_wait_ms" json:"lockWaitMs"`
	BufferReads       int64           `db:"buffer_reads" json:"bufferReads"`
	BufferHits        int64           `db:"buffer_hits" json:"bufferHits"`
	QueryPlan         json.RawMessage `db:"query_plan" json:"queryPlan"`
	OptimizationScore float64         `db:"optimization_score" json:"optimizationScore"`
	ExecutedAt        time.Time       `db:"executed_at" json:"executedAt"`
}

// QueryOptimizationRecommendation represents an optimization recommendation
type QueryOptimizationRecommendation struct {
	ID                       uuid.UUID       `db:"id" json:"id"`
	QueryHash                string          `db:"query_hash" json:"queryHash"`
	RecommendationType       string          `db:"recommendation_type" json:"recommendationType"`
	CurrentPerformanceMs     float64         `db:"current_performance_ms" json:"currentPerformanceMs"`
	EstimatedImprovementPct  float64         `db:"estimated_improvement_pct" json:"estimatedImprovementPct"`
	OptimizationStrategy     json.RawMessage `db:"optimization_strategy" json:"optimizationStrategy"`
	SuggestedIndexes         pq.StringArray  `db:"suggested_indexes" json:"suggestedIndexes"`
	QueryRewriteSuggestion   *string         `db:"query_rewrite_suggestion" json:"queryRewriteSuggestion,omitempty"`
	ImplementationComplexity string          `db:"implementation_complexity" json:"implementationComplexity"`
	ImplementationPriority   string          `db:"implementation_priority" json:"implementationPriority"`
	Implemented              bool            `db:"implemented" json:"implemented"`
	ImplementedAt            *time.Time      `db:"implemented_at" json:"implementedAt,omitempty"`
	ValidationResults        json.RawMessage `db:"validation_results" json:"validationResults"`
	CreatedAt                time.Time       `db:"created_at" json:"createdAt"`
}

// IndexUsageAnalytic represents index usage analytics
type IndexUsageAnalytic struct {
	ID                 uuid.UUID  `db:"id" json:"id"`
	SchemaName         string     `db:"schema_name" json:"schemaName"`
	TableName          string     `db:"table_name" json:"tableName"`
	IndexName          string     `db:"index_name" json:"indexName"`
	IndexType          string     `db:"index_type" json:"indexType"`
	TotalScans         int64      `db:"total_scans" json:"totalScans"`
	TuplesRead         int64      `db:"tuples_read" json:"tuplesRead"`
	TuplesFetched      int64      `db:"tuples_fetched" json:"tuplesFetched"`
	BlocksRead         int64      `db:"blocks_read" json:"blocksRead"`
	BlocksHit          int64      `db:"blocks_hit" json:"blocksHit"`
	IndexSizeBytes     int64      `db:"index_size_bytes" json:"indexSizeBytes"`
	IndexEfficiencyPct float64    `db:"index_efficiency_pct" json:"indexEfficiencyPct"`
	LastUsedAt         *time.Time `db:"last_used_at" json:"lastUsedAt,omitempty"`
	UsageFrequency     string     `db:"usage_frequency" json:"usageFrequency"`
	Recommendation     *string    `db:"recommendation" json:"recommendation,omitempty"`
	RecordedAt         time.Time  `db:"recorded_at" json:"recordedAt"`
}

// SlowQueryLog represents a slow query log entry
type SlowQueryLog struct {
	ID                        uuid.UUID       `db:"id" json:"id"`
	QueryHash                 string          `db:"query_hash" json:"queryHash"`
	QuerySQL                  string          `db:"query_sql" json:"querySQL"`
	ExecutionTimeMs           float64         `db:"execution_time_ms" json:"executionTimeMs"`
	WaitingTimeMs             float64         `db:"waiting_time_ms" json:"waitingTimeMs"`
	RowsExamined              int64           `db:"rows_examined" json:"rowsExamined"`
	RowsReturned              int64           `db:"rows_returned" json:"rowsReturned"`
	QueryPlan                 json.RawMessage `db:"query_plan" json:"queryPlan"`
	SessionInfo               json.RawMessage `db:"session_info" json:"sessionInfo"`
	ApplicationContext        json.RawMessage `db:"application_context" json:"applicationContext"`
	Severity                  string          `db:"severity" json:"severity"`
	AutoOptimizationAttempted bool            `db:"auto_optimization_attempted" json:"autoOptimizationAttempted"`
	OptimizationResult        json.RawMessage `db:"optimization_result" json:"optimizationResult"`
	LoggedAt                  time.Time       `db:"logged_at" json:"loggedAt"`
}

// QueryPerformanceRequest represents a request to record query performance
type QueryPerformanceRequest struct {
	QuerySQL        string          `json:"querySQL" validate:"required"`
	QueryType       string          `json:"queryType" validate:"required"`
	ExecutionTimeMs float64         `json:"executionTimeMs" validate:"gte=0"`
	RowsExamined    int64           `json:"rowsExamined" validate:"gte=0"`
	RowsReturned    int64           `json:"rowsReturned" validate:"gte=0"`
	QueryPlan       json.RawMessage `json:"queryPlan,omitempty"`
}

// QueryPerformanceAnalysis represents analysis results for a query
type QueryPerformanceAnalysis struct {
	QueryHash              string                            `json:"queryHash"`
	AverageExecutionTimeMs float64                           `json:"averageExecutionTimeMs"`
	P95ExecutionTimeMs     float64                           `json:"p95ExecutionTimeMs"`
	ExecutionCount         int64                             `json:"executionCount"`
	OptimizationScore      float64                           `json:"optimizationScore"`
	Recommendations        []QueryOptimizationRecommendation `json:"recommendations"`
	RecentPerformanceTrend string                            `json:"recentPerformanceTrend"`
	ImpactLevel            string                            `json:"impactLevel"`
}

// Ensure pq.StringArray implements the necessary interfaces
var _ driver.Valuer = (*pq.StringArray)(nil)
