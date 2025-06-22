// File: backend/internal/services/query_performance_monitor.go
package services

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// QueryPerformanceMonitor monitors and analyzes database query performance
type QueryPerformanceMonitor struct {
	db            *sqlx.DB
	ctx           context.Context
	cancel        context.CancelFunc
	wg            sync.WaitGroup
	mu            sync.RWMutex
	config        *QueryPerformanceConfig
	metricsBuffer []models.QueryPerformanceMetric
	bufferSize    int
	flushInterval time.Duration
	lastFlush     time.Time
}

// QueryPerformanceConfig holds configuration for query performance monitoring
type QueryPerformanceConfig struct {
	EnableMonitoring     bool          `json:"enableMonitoring"`
	SlowQueryThresholdMs float64       `json:"slowQueryThresholdMs"`
	BufferSize           int           `json:"bufferSize"`
	FlushInterval        time.Duration `json:"flushInterval"`
	AnalysisInterval     time.Duration `json:"analysisInterval"`
	RetentionDays        int           `json:"retentionDays"`
}

// DefaultQueryPerformanceConfig returns default configuration
func DefaultQueryPerformanceConfig() *QueryPerformanceConfig {
	return &QueryPerformanceConfig{
		EnableMonitoring:     true,
		SlowQueryThresholdMs: 1000.0, // 1 second
		BufferSize:           100,
		FlushInterval:        30 * time.Second,
		AnalysisInterval:     5 * time.Minute,
		RetentionDays:        30,
	}
}

// NewQueryPerformanceMonitor creates a new query performance monitor
func NewQueryPerformanceMonitor(db *sqlx.DB, config *QueryPerformanceConfig) *QueryPerformanceMonitor {
	if config == nil {
		config = DefaultQueryPerformanceConfig()
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &QueryPerformanceMonitor{
		db:            db,
		ctx:           ctx,
		cancel:        cancel,
		config:        config,
		metricsBuffer: make([]models.QueryPerformanceMetric, 0, config.BufferSize),
		bufferSize:    config.BufferSize,
		flushInterval: config.FlushInterval,
		lastFlush:     time.Now(),
	}
}

// Start begins query performance monitoring
func (qpm *QueryPerformanceMonitor) Start() error {
	if !qpm.config.EnableMonitoring {
		return nil
	}

	qpm.wg.Add(2)
	go qpm.flushLoop()
	go qpm.analysisLoop()

	log.Printf("Query performance monitor started")
	return nil
}

// Stop stops query performance monitoring
func (qpm *QueryPerformanceMonitor) Stop() error {
	qpm.cancel()
	qpm.wg.Wait()

	// Flush any remaining metrics
	qpm.flushMetrics()

	log.Printf("Query performance monitor stopped")
	return nil
}

// RecordQueryPerformance records performance metrics for a query
func (qpm *QueryPerformanceMonitor) RecordQueryPerformance(
	querySQL string,
	queryType string,
	executionTimeMs float64,
	rowsExamined int64,
	rowsReturned int64,
	queryPlan json.RawMessage,
) error {
	if !qpm.config.EnableMonitoring {
		return nil
	}

	metric := models.QueryPerformanceMetric{
		ID:              uuid.New(),
		QueryHash:       qpm.GenerateQueryHash(querySQL),
		QuerySQL:        querySQL,
		QueryType:       queryType,
		ExecutionTimeMs: executionTimeMs,
		RowsExamined:    rowsExamined,
		RowsReturned:    rowsReturned,
		QueryPlan:       queryPlan,
		ExecutedAt:      time.Now(),
	}

	qpm.mu.Lock()
	defer qpm.mu.Unlock()

	qpm.metricsBuffer = append(qpm.metricsBuffer, metric)

	// Flush if buffer is full
	if len(qpm.metricsBuffer) >= qpm.bufferSize {
		go qpm.flushMetrics()
	}

	return nil
}

// RecordQueryPerformanceDB records performance using database function
func (qpm *QueryPerformanceMonitor) RecordQueryPerformanceDB(
	querySQL string,
	queryType string,
	executionTimeMs float64,
	rowsExamined int64,
	rowsReturned int64,
	queryPlan json.RawMessage,
) (uuid.UUID, error) {
	if !qpm.config.EnableMonitoring {
		return uuid.Nil, nil
	}

	var metricID uuid.UUID
	err := qpm.db.QueryRow(`
		SELECT record_query_performance($1, $2, $3, $4, $5, $6)`,
		querySQL, queryType, executionTimeMs, rowsExamined, rowsReturned, queryPlan,
	).Scan(&metricID)

	return metricID, err
}

// GetQueryAnalysis returns performance analysis for a specific query
func (qpm *QueryPerformanceMonitor) GetQueryAnalysis(queryHash string) (*models.QueryPerformanceAnalysis, error) {
	// Get average and P95 execution times
	var avgTime, p95Time sql.NullFloat64
	var count sql.NullInt64

	err := qpm.db.QueryRow(`
		SELECT 
			AVG(execution_time_ms) as avg_time,
			PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_time,
			COUNT(*) as execution_count
		FROM query_performance_metrics 
		WHERE query_hash = $1 
		  AND executed_at > NOW() - INTERVAL '24 hours'`,
		queryHash,
	).Scan(&avgTime, &p95Time, &count)

	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get query statistics: %w", err)
	}

	// Get latest optimization score
	var optimizationScore sql.NullFloat64
	err = qpm.db.QueryRow(`
		SELECT optimization_score 
		FROM query_performance_metrics 
		WHERE query_hash = $1 
		ORDER BY executed_at DESC 
		LIMIT 1`,
		queryHash,
	).Scan(&optimizationScore)

	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get optimization score: %w", err)
	}

	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get optimization score: %w", err)
	}

	// Get recommendations
	var recommendations []models.QueryOptimizationRecommendation
	err = qpm.db.Select(&recommendations, `
		SELECT * FROM query_optimization_recommendations 
		WHERE query_hash = $1 AND implemented = false
		ORDER BY created_at DESC`,
		queryHash,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get recommendations: %w", err)
	}

	// Extract values from sql.Null types with defaults
	avgTimeValue := 0.0
	if avgTime.Valid {
		avgTimeValue = avgTime.Float64
	}

	p95TimeValue := 0.0
	if p95Time.Valid {
		p95TimeValue = p95Time.Float64
	}

	countValue := int64(0)
	if count.Valid {
		countValue = count.Int64
	}

	optimizationScoreValue := 0.0
	if optimizationScore.Valid {
		optimizationScoreValue = optimizationScore.Float64
	}

	// Determine impact level and trend
	impactLevel := qpm.calculateImpactLevel(avgTimeValue, countValue)
	trend := qpm.calculatePerformanceTrend(queryHash)

	return &models.QueryPerformanceAnalysis{
		QueryHash:              queryHash,
		AverageExecutionTimeMs: avgTimeValue,
		P95ExecutionTimeMs:     p95TimeValue,
		ExecutionCount:         countValue,
		OptimizationScore:      optimizationScoreValue,
		Recommendations:        recommendations,
		RecentPerformanceTrend: trend,
		ImpactLevel:            impactLevel,
	}, nil
}

// GetSlowQueries returns recent slow queries
func (qpm *QueryPerformanceMonitor) GetSlowQueries(limit int) ([]models.SlowQueryLog, error) {
	var slowQueries []models.SlowQueryLog

	err := qpm.db.Select(&slowQueries, `
		SELECT * FROM slow_query_log 
		ORDER BY logged_at DESC 
		LIMIT $1`,
		limit,
	)

	return slowQueries, err
}

// AnalyzeIndexUsage analyzes index usage patterns
func (qpm *QueryPerformanceMonitor) AnalyzeIndexUsage() error {
	_, err := qpm.db.Exec("SELECT analyze_index_usage()")
	return err
}

// GetIndexAnalytics returns index usage analytics
func (qpm *QueryPerformanceMonitor) GetIndexAnalytics() ([]models.IndexUsageAnalytic, error) {
	var analytics []models.IndexUsageAnalytic

	err := qpm.db.Select(&analytics, `
		SELECT * FROM index_usage_analytics 
		ORDER BY recorded_at DESC, index_efficiency_pct ASC`)

	return analytics, err
}

// flushLoop periodically flushes metrics buffer
func (qpm *QueryPerformanceMonitor) flushLoop() {
	defer qpm.wg.Done()

	ticker := time.NewTicker(qpm.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-qpm.ctx.Done():
			return
		case <-ticker.C:
			qpm.flushMetrics()
		}
	}
}

// analysisLoop periodically runs performance analysis
func (qpm *QueryPerformanceMonitor) analysisLoop() {
	defer qpm.wg.Done()

	ticker := time.NewTicker(qpm.config.AnalysisInterval)
	defer ticker.Stop()

	for {
		select {
		case <-qpm.ctx.Done():
			return
		case <-ticker.C:
			if err := qpm.AnalyzeIndexUsage(); err != nil {
				log.Printf("Error analyzing index usage: %v", err)
			}
			qpm.cleanupOldMetrics()
		}
	}
}

// flushMetrics flushes metrics buffer to database
func (qpm *QueryPerformanceMonitor) flushMetrics() {
	qpm.mu.Lock()
	if len(qpm.metricsBuffer) == 0 {
		qpm.mu.Unlock()
		return
	}

	metrics := make([]models.QueryPerformanceMetric, len(qpm.metricsBuffer))
	copy(metrics, qpm.metricsBuffer)
	qpm.metricsBuffer = qpm.metricsBuffer[:0]
	qpm.lastFlush = time.Now()
	qpm.mu.Unlock()

	// Batch insert metrics
	for _, metric := range metrics {
		_, err := qpm.RecordQueryPerformanceDB(
			metric.QuerySQL,
			metric.QueryType,
			metric.ExecutionTimeMs,
			metric.RowsExamined,
			metric.RowsReturned,
			metric.QueryPlan,
		)
		if err != nil {
			log.Printf("Error recording query performance metric: %v", err)
		}
	}

	log.Printf("Flushed %d query performance metrics", len(metrics))
}

// cleanupOldMetrics removes old metrics based on retention policy
func (qpm *QueryPerformanceMonitor) cleanupOldMetrics() {
	cutoffDate := time.Now().AddDate(0, 0, -qpm.config.RetentionDays)

	_, err := qpm.db.Exec(`
		DELETE FROM query_performance_metrics 
		WHERE executed_at < $1`,
		cutoffDate,
	)

	if err != nil {
		log.Printf("Error cleaning up old query metrics: %v", err)
	}

	_, err = qpm.db.Exec(`
		DELETE FROM slow_query_log 
		WHERE logged_at < $1`,
		cutoffDate,
	)

	if err != nil {
		log.Printf("Error cleaning up old slow query logs: %v", err)
	}
}

// generateQueryHash generates a hash for query deduplication
func (qpm *QueryPerformanceMonitor) GenerateQueryHash(querySQL string) string {
	hash := sha256.Sum256([]byte(querySQL))
	return hex.EncodeToString(hash[:])
}

// calculateImpactLevel determines the impact level of a query's performance
func (qpm *QueryPerformanceMonitor) calculateImpactLevel(avgTimeMs float64, executionCount int64) string {
	if avgTimeMs > 5000 || (avgTimeMs > 1000 && executionCount > 100) {
		return "critical"
	} else if avgTimeMs > 1000 || (avgTimeMs > 500 && executionCount > 50) {
		return "high"
	} else if avgTimeMs > 500 || executionCount > 20 {
		return "medium"
	}
	return "low"
}

// calculatePerformanceTrend calculates the recent performance trend
func (qpm *QueryPerformanceMonitor) calculatePerformanceTrend(queryHash string) string {
	var recentAvg, olderAvg sql.NullFloat64

	// Get average from last hour
	qpm.db.QueryRow(`
		SELECT AVG(execution_time_ms) 
		FROM query_performance_metrics 
		WHERE query_hash = $1 
		  AND executed_at > NOW() - INTERVAL '1 hour'`,
		queryHash,
	).Scan(&recentAvg)

	// Get average from previous hour
	qpm.db.QueryRow(`
		SELECT AVG(execution_time_ms) 
		FROM query_performance_metrics 
		WHERE query_hash = $1 
		  AND executed_at BETWEEN NOW() - INTERVAL '2 hours' AND NOW() - INTERVAL '1 hour'`,
		queryHash,
	).Scan(&olderAvg)

	if !recentAvg.Valid || !olderAvg.Valid {
		return "insufficient_data"
	}

	diff := recentAvg.Float64 - olderAvg.Float64
	changePercent := (diff / olderAvg.Float64) * 100

	if changePercent > 20 {
		return "degrading"
	} else if changePercent < -20 {
		return "improving"
	}
	return "stable"
}
