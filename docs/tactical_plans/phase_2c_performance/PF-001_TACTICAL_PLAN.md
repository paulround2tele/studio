# PF-001: DATABASE QUERY OPTIMIZATION - TACTICAL PLAN

**Finding ID**: PF-001  
**Priority**: HIGH  
**Phase**: 2C Performance  
**Estimated Effort**: 4-5 days  
**Dependencies**: ✅ Phase 2A Foundation, ✅ Phase 2B Security, ✅ SI-004 Connection Pool, ✅ SI-005 Memory Management

---

## FINDING OVERVIEW

**Problem Statement**: Database query performance issues including inefficient joins, missing indexes, suboptimal query patterns, and lack of query performance monitoring across domain generation and campaign management operations.

**Root Cause**: Inadequate query optimization, missing strategic indexes, inefficient SQL patterns, lack of query performance monitoring, and absence of database-level performance analytics.

**Impact**: 
- Slow query execution affecting user experience
- Database resource contention and bottlenecks
- Inefficient resource utilization during peak loads
- Degraded system performance under concurrent operations
- Potential query timeouts during large-scale domain generation

**Integration Points**: 
- Builds on SI-004 connection pool management and SI-005 memory optimization
- Integrates with domain generation, campaign processing, and audit systems
- Enhances existing PostgreSQL patterns from BF-001/BL-002 implementations
- Connects to monitoring infrastructure and performance analytics

---

## POSTGRESQL MIGRATION

**File**: `backend/database/migrations/014_pf001_query_optimization.sql`

```sql
BEGIN;

-- Query performance monitoring
CREATE TABLE IF NOT EXISTS query_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    query_sql TEXT NOT NULL,
    query_type VARCHAR(50) NOT NULL,
    table_names VARCHAR[] DEFAULT '{}',
    execution_time_ms DECIMAL(10,3) NOT NULL,
    rows_examined BIGINT DEFAULT 0,
    rows_returned BIGINT DEFAULT 0,
    index_usage JSONB DEFAULT '{}',
    cpu_time_ms DECIMAL(10,3) DEFAULT 0,
    io_wait_ms DECIMAL(10,3) DEFAULT 0,
    lock_wait_ms DECIMAL(10,3) DEFAULT 0,
    buffer_reads BIGINT DEFAULT 0,
    buffer_hits BIGINT DEFAULT 0,
    query_plan JSONB DEFAULT '{}',
    optimization_score DECIMAL(5,2) DEFAULT 0,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_query_performance_hash ON query_performance_metrics(query_hash);
CREATE INDEX idx_query_performance_type ON query_performance_metrics(query_type);
CREATE INDEX idx_query_performance_executed ON query_performance_metrics(executed_at);
CREATE INDEX idx_query_performance_execution_time ON query_performance_metrics(execution_time_ms);
CREATE INDEX idx_query_performance_optimization_score ON query_performance_metrics(optimization_score);

-- Query optimization recommendations
CREATE TABLE IF NOT EXISTS query_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    recommendation_type VARCHAR(100) NOT NULL,
    current_performance_ms DECIMAL(10,3) NOT NULL,
    estimated_improvement_pct DECIMAL(5,2) NOT NULL,
    optimization_strategy JSONB NOT NULL,
    suggested_indexes TEXT[] DEFAULT '{}',
    query_rewrite_suggestion TEXT,
    implementation_complexity VARCHAR(20) DEFAULT 'medium',
    implementation_priority VARCHAR(20) DEFAULT 'medium',
    implemented BOOLEAN DEFAULT false,
    implemented_at TIMESTAMPTZ,
    validation_results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_query_optimization_hash ON query_optimization_recommendations(query_hash);
CREATE INDEX idx_query_optimization_type ON query_optimization_recommendations(recommendation_type);
CREATE INDEX idx_query_optimization_priority ON query_optimization_recommendations(implementation_priority);
CREATE INDEX idx_query_optimization_implemented ON query_optimization_recommendations(implemented);

-- Index usage analytics
CREATE TABLE IF NOT EXISTS index_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    index_name VARCHAR(100) NOT NULL,
    index_type VARCHAR(50) NOT NULL,
    total_scans BIGINT DEFAULT 0,
    tuples_read BIGINT DEFAULT 0,
    tuples_fetched BIGINT DEFAULT 0,
    blocks_read BIGINT DEFAULT 0,
    blocks_hit BIGINT DEFAULT 0,
    index_size_bytes BIGINT DEFAULT 0,
    index_efficiency_pct DECIMAL(5,2) DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    usage_frequency VARCHAR(20) DEFAULT 'unknown',
    recommendation VARCHAR(100),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_index_usage_table ON index_usage_analytics(schema_name, table_name);
CREATE INDEX idx_index_usage_name ON index_usage_analytics(index_name);
CREATE INDEX idx_index_usage_efficiency ON index_usage_analytics(index_efficiency_pct);
CREATE INDEX idx_index_usage_frequency ON index_usage_analytics(usage_frequency);

-- Slow query log
CREATE TABLE IF NOT EXISTS slow_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    query_sql TEXT NOT NULL,
    execution_time_ms DECIMAL(10,3) NOT NULL,
    waiting_time_ms DECIMAL(10,3) DEFAULT 0,
    rows_examined BIGINT DEFAULT 0,
    rows_returned BIGINT DEFAULT 0,
    query_plan JSONB DEFAULT '{}',
    session_info JSONB DEFAULT '{}',
    application_context JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'warning',
    auto_optimization_attempted BOOLEAN DEFAULT false,
    optimization_result JSONB DEFAULT '{}',
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slow_query_hash ON slow_query_log(query_hash);
CREATE INDEX idx_slow_query_execution_time ON slow_query_log(execution_time_ms);
CREATE INDEX idx_slow_query_severity ON slow_query_log(severity);
CREATE INDEX idx_slow_query_logged ON slow_query_log(logged_at);

-- Strategic indexes for domain and campaign operations
-- Optimized indexes for domain queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_campaign_status_created 
    ON domains(campaign_id, status, created_at) 
    WHERE status IN ('active', 'pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_tld_status_performance 
    ON domains(tld, status, performance_score) 
    WHERE status = 'active' AND performance_score > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_keyword_search 
    ON domains USING gin(to_tsvector('english', domain_name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_composite_performance 
    ON domains(campaign_id, status, performance_score DESC, created_at DESC) 
    WHERE status = 'active';

-- Optimized indexes for campaign operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_status_type_created 
    ON campaigns(status, campaign_type, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_user_active 
    ON campaigns(user_id, status) 
    WHERE status IN ('active', 'running');

-- Optimized indexes for audit and logging
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_action_timestamp 
    ON audit_logs(entity_type, action, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_recent 
    ON audit_logs(user_id, created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '30 days';

-- Function to record query performance metrics
CREATE OR REPLACE FUNCTION record_query_performance(
    p_query_sql TEXT,
    p_query_type VARCHAR(50),
    p_execution_time_ms DECIMAL(10,3),
    p_rows_examined BIGINT DEFAULT 0,
    p_rows_returned BIGINT DEFAULT 0,
    p_query_plan JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    metric_id UUID;
    query_hash VARCHAR(64);
    optimization_score DECIMAL(5,2);
    table_names VARCHAR[];
BEGIN
    -- Generate query hash for deduplication
    query_hash := encode(sha256(p_query_sql::bytea), 'hex');
    
    -- Calculate optimization score (0-100, higher is better)
    optimization_score := CASE
        WHEN p_execution_time_ms <= 10 THEN 100
        WHEN p_execution_time_ms <= 50 THEN 90
        WHEN p_execution_time_ms <= 100 THEN 80
        WHEN p_execution_time_ms <= 500 THEN 60
        WHEN p_execution_time_ms <= 1000 THEN 40
        WHEN p_execution_time_ms <= 5000 THEN 20
        ELSE 10
    END;
    
    -- Adjust score based on efficiency (rows examined vs returned)
    IF p_rows_examined > 0 AND p_rows_returned > 0 THEN
        optimization_score := optimization_score * (
            LEAST(1.0, p_rows_returned::DECIMAL / p_rows_examined::DECIMAL) * 0.5 + 0.5
        );
    END IF;
    
    -- Extract table names from query plan
    table_names := ARRAY(
        SELECT DISTINCT value::text
        FROM jsonb_array_elements_text(p_query_plan->'tables')
    );
    
    -- Insert performance metrics
    INSERT INTO query_performance_metrics 
        (query_hash, query_sql, query_type, table_names, execution_time_ms,
         rows_examined, rows_returned, query_plan, optimization_score)
    VALUES 
        (query_hash, p_query_sql, p_query_type, table_names, p_execution_time_ms,
         p_rows_examined, p_rows_returned, p_query_plan, optimization_score)
    RETURNING id INTO metric_id;
    
    -- Check if optimization is needed
    PERFORM check_query_optimization_needed(query_hash, p_execution_time_ms, optimization_score);
    
    -- Log slow queries
    IF p_execution_time_ms > 1000 THEN
        INSERT INTO slow_query_log 
            (query_hash, query_sql, execution_time_ms, rows_examined, rows_returned,
             query_plan, severity)
        VALUES 
            (query_hash, p_query_sql, p_execution_time_ms, p_rows_examined, p_rows_returned,
             p_query_plan, 
             CASE WHEN p_execution_time_ms > 5000 THEN 'critical'
                  WHEN p_execution_time_ms > 2000 THEN 'high'
                  ELSE 'warning' END);
    END IF;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if query optimization is needed
CREATE OR REPLACE FUNCTION check_query_optimization_needed(
    p_query_hash VARCHAR(64),
    p_execution_time_ms DECIMAL(10,3),
    p_optimization_score DECIMAL(5,2)
) RETURNS VOID AS $$
DECLARE
    avg_execution_time DECIMAL(10,3);
    execution_count INTEGER;
    recommendation_exists BOOLEAN;
BEGIN
    -- Calculate average execution time for this query
    SELECT AVG(execution_time_ms), COUNT(*)
    INTO avg_execution_time, execution_count
    FROM query_performance_metrics
    WHERE query_hash = p_query_hash
      AND executed_at > NOW() - INTERVAL '1 hour';
    
    -- Check if recommendation already exists
    SELECT EXISTS(
        SELECT 1 FROM query_optimization_recommendations
        WHERE query_hash = p_query_hash
          AND implemented = false
          AND created_at > NOW() - INTERVAL '1 day'
    ) INTO recommendation_exists;
    
    -- Generate recommendations based on performance patterns
    IF NOT recommendation_exists AND execution_count >= 3 THEN
        -- Slow query optimization
        IF avg_execution_time > 1000 THEN
            INSERT INTO query_optimization_recommendations 
                (query_hash, recommendation_type, current_performance_ms,
                 estimated_improvement_pct, optimization_strategy, implementation_priority)
            VALUES (
                p_query_hash,
                'slow_query_optimization',
                avg_execution_time,
                60.0,
                jsonb_build_object(
                    'strategy', 'index_optimization',
                    'reason', 'consistent_slow_performance',
                    'avg_execution_time', avg_execution_time,
                    'execution_count', execution_count
                ),
                CASE WHEN avg_execution_time > 5000 THEN 'critical'
                     WHEN avg_execution_time > 2000 THEN 'high'
                     ELSE 'medium' END
            );
        END IF;
        
        -- Low optimization score
        IF p_optimization_score < 50 THEN
            INSERT INTO query_optimization_recommendations 
                (query_hash, recommendation_type, current_performance_ms,
                 estimated_improvement_pct, optimization_strategy, implementation_priority)
            VALUES (
                p_query_hash,
                'efficiency_optimization',
                avg_execution_time,
                40.0,
                jsonb_build_object(
                    'strategy', 'query_rewrite',
                    'reason', 'low_efficiency_score',
                    'optimization_score', p_optimization_score
                ),
                'medium'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage() RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    index_name TEXT,
    usage_recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH index_stats AS (
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch,
            pg_relation_size(indexrelid) as index_size
        FROM pg_stat_user_indexes
    ),
    usage_analysis AS (
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            index_size,
            CASE 
                WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping'
                WHEN idx_scan < 10 AND index_size > 1024*1024 THEN 'RARELY USED - Review necessity'
                WHEN idx_tup_read::float / GREATEST(idx_scan, 1) > 1000 THEN 'INEFFICIENT - High read ratio'
                WHEN idx_scan > 1000 AND idx_tup_read::float / idx_scan < 10 THEN 'HIGHLY EFFICIENT'
                ELSE 'NORMAL USAGE'
            END as recommendation
        FROM index_stats
        WHERE tablename NOT LIKE 'pg_%'
    )
    SELECT 
        ua.schemaname::TEXT,
        ua.tablename::TEXT,
        ua.indexname::TEXT,
        ua.recommendation::TEXT
    FROM usage_analysis ua
    ORDER BY 
        CASE ua.recommendation
            WHEN 'UNUSED - Consider dropping' THEN 1
            WHEN 'RARELY USED - Review necessity' THEN 2
            WHEN 'INEFFICIENT - High read ratio' THEN 3
            ELSE 4
        END,
        ua.index_size DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get query optimization suggestions
CREATE OR REPLACE FUNCTION get_query_optimization_suggestions(
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
    query_hash TEXT,
    avg_execution_time DECIMAL(10,3),
    execution_count BIGINT,
    optimization_potential TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH query_stats AS (
        SELECT 
            qpm.query_hash,
            AVG(qpm.execution_time_ms) as avg_time,
            COUNT(*) as exec_count,
            AVG(qpm.optimization_score) as avg_score,
            STRING_AGG(DISTINCT qpm.query_type, ', ') as query_types
        FROM query_performance_metrics qpm
        WHERE qpm.executed_at > NOW() - INTERVAL '24 hours'
        GROUP BY qpm.query_hash
        HAVING COUNT(*) >= 3
    )
    SELECT 
        qs.query_hash::TEXT,
        qs.avg_time,
        qs.exec_count,
        CASE 
            WHEN qs.avg_time > 5000 THEN 'CRITICAL - Immediate optimization needed'
            WHEN qs.avg_time > 1000 THEN 'HIGH - Performance optimization recommended'
            WHEN qs.avg_score < 50 THEN 'MEDIUM - Efficiency improvements possible'
            WHEN qs.exec_count > 1000 THEN 'LOW - Consider caching for high-frequency query'
            ELSE 'OPTIMIZED - No immediate action needed'
        END::TEXT
    FROM query_stats qs
    ORDER BY 
        CASE 
            WHEN qs.avg_time > 5000 THEN 1
            WHEN qs.avg_time > 1000 THEN 2
            WHEN qs.avg_score < 50 THEN 3
            ELSE 4
        END,
        qs.avg_time DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## IMPLEMENTATION GUIDANCE

### Step 1: Implement Query Performance Monitor

**File**: `backend/internal/monitoring/query_performance_monitor.go`

```go
package monitoring

import (
    "context"
    "crypto/sha256"
    "fmt"
    "encoding/hex"
    "log"
    "time"
    
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
)

// QueryPerformanceMonitor tracks and optimizes database query performance
type QueryPerformanceMonitor struct {
    db                  *sqlx.DB
    slowQueryThreshold  time.Duration
    alerting           AlertingService
    optimizationEnabled bool
}

type QueryMetrics struct {
    QuerySQL        string
    QueryType       string
    ExecutionTime   time.Duration
    RowsExamined    int64
    RowsReturned    int64
    QueryPlan       map[string]interface{}
    TableNames      []string
}

type QueryOptimizationSuggestion struct {
    QueryHash              string
    RecommendationType     string
    CurrentPerformanceMs   float64
    EstimatedImprovementPct float64
    OptimizationStrategy   map[string]interface{}
    SuggestedIndexes       []string
    QueryRewriteSuggestion string
    Priority              string
}

func NewQueryPerformanceMonitor(db *sqlx.DB, alerting AlertingService) *QueryPerformanceMonitor {
    return &QueryPerformanceMonitor{
        db:                  db,
        slowQueryThreshold:  1000 * time.Millisecond,
        alerting:           alerting,
        optimizationEnabled: true,
    }
}

// MonitorQuery records query performance and suggests optimizations
func (qpm *QueryPerformanceMonitor) MonitorQuery(ctx context.Context, metrics *QueryMetrics) error {
    startTime := time.Now()
    defer func() {
        if time.Since(startTime) > 10*time.Millisecond {
            log.Printf("WARNING: Query monitoring itself took %v", time.Since(startTime))
        }
    }()
    
    // Record query performance metrics
    metricID, err := qpm.recordQueryMetrics(ctx, metrics)
    if err != nil {
        return fmt.Errorf("failed to record query metrics: %w", err)
    }
    
    // Generate optimization suggestions for slow queries
    if metrics.ExecutionTime > qpm.slowQueryThreshold {
        if err := qpm.generateOptimizationSuggestions(ctx, metrics); err != nil {
            log.Printf("WARNING: Failed to generate optimization suggestions: %v", err)
        }
    }
    
    log.Printf("Query monitored: ID=%s, Duration=%v", metricID, metrics.ExecutionTime)
    return nil
}

func (qpm *QueryPerformanceMonitor) recordQueryMetrics(ctx context.Context, metrics *QueryMetrics) (uuid.UUID, error) {
    var metricID uuid.UUID
    query := `SELECT record_query_performance($1, $2, $3, $4, $5, $6)`
    
    err := qpm.db.QueryRowContext(
        ctx, query,
        metrics.QuerySQL,
        metrics.QueryType,
        float64(metrics.ExecutionTime.Nanoseconds())/1e6, // Convert to milliseconds
        metrics.RowsExamined,
        metrics.RowsReturned,
        metrics.QueryPlan,
    ).Scan(&metricID)
    
    if err != nil {
        return uuid.Nil, fmt.Errorf("failed to record query performance: %w", err)
    }
    
    return metricID, nil
}

func (qpm *QueryPerformanceMonitor) generateOptimizationSuggestions(ctx context.Context, metrics *QueryMetrics) error {
    queryHash := qpm.generateQueryHash(metrics.QuerySQL)
    
    suggestions := qpm.analyzeQueryForOptimization(metrics)
    
    for _, suggestion := range suggestions {
        if err := qpm.recordOptimizationSuggestion(ctx, queryHash, suggestion); err != nil {
            return fmt.Errorf("failed to record optimization suggestion: %w", err)
        }
    }
    
    return nil
}

func (qpm *QueryPerformanceMonitor) analyzeQueryForOptimization(metrics *QueryMetrics) []QueryOptimizationSuggestion {
    var suggestions []QueryOptimizationSuggestion
    
    // Analyze for missing indexes
    if qpm.needsIndexOptimization(metrics) {
        suggestions = append(suggestions, QueryOptimizationSuggestion{
            RecommendationType:     "index_optimization",
            CurrentPerformanceMs:   float64(metrics.ExecutionTime.Nanoseconds()) / 1e6,
            EstimatedImprovementPct: 70.0,
            OptimizationStrategy: map[string]interface{}{
                "strategy": "add_missing_indexes",
                "reason":   "high_row_examination_ratio",
                "affected_tables": metrics.TableNames,
            },
            SuggestedIndexes: qpm.suggestIndexes(metrics),
            Priority:        qpm.determinePriority(metrics.ExecutionTime),
        })
    }
    
    // Analyze for query rewrite opportunities
    if qpm.needsQueryRewrite(metrics) {
        suggestions = append(suggestions, QueryOptimizationSuggestion{
            RecommendationType:     "query_rewrite",
            CurrentPerformanceMs:   float64(metrics.ExecutionTime.Nanoseconds()) / 1e6,
            EstimatedImprovementPct: 50.0,
            OptimizationStrategy: map[string]interface{}{
                "strategy": "optimize_joins",
                "reason":   "inefficient_query_pattern",
            },
            QueryRewriteSuggestion: qpm.suggestQueryRewrite(metrics),
            Priority:              qpm.determinePriority(metrics.ExecutionTime),
        })
    }
    
    return suggestions
}

func (qpm *QueryPerformanceMonitor) needsIndexOptimization(metrics *QueryMetrics) bool {
    // High row examination vs return ratio suggests missing indexes
    if metrics.RowsExamined > 0 && metrics.RowsReturned > 0 {
        ratio := float64(metrics.RowsExamined) / float64(metrics.RowsReturned)
        return ratio > 100 // Examining 100x more rows than returned
    }
    
    // Long execution time on SELECT queries
    return metrics.QueryType == "SELECT" && metrics.ExecutionTime > 2*time.Second
}

func (qpm *QueryPerformanceMonitor) needsQueryRewrite(metrics *QueryMetrics) bool {
    // Complex queries that could benefit from rewriting
    return qpm.containsIneffientPatterns(metrics.QuerySQL)
}

func (qpm *QueryPerformanceMonitor) containsIneffientPatterns(querySQL string) bool {
    // Simple pattern detection - in production, use SQL parser
    inefficientPatterns := []string{
        "SELECT *",
        "ORDER BY RAND()",
        "WHERE column LIKE '%value%'",
        "NOT IN (",
        "OR (",
    }
    
    for _, pattern := range inefficientPatterns {
        if contains(querySQL, pattern) {
            return true
        }
    }
    
    return false
}

func (qpm *QueryPerformanceMonitor) suggestIndexes(metrics *QueryMetrics) []string {
    var suggestions []string
    
    // Basic index suggestions based on common patterns
    for _, tableName := range metrics.TableNames {
        // Suggest common composite indexes
        suggestions = append(suggestions, 
            fmt.Sprintf("CREATE INDEX idx_%s_status_created ON %s(status, created_at)", tableName, tableName),
            fmt.Sprintf("CREATE INDEX idx_%s_composite_perf ON %s(id, status, updated_at)", tableName, tableName),
        )
    }
    
    return suggestions
}

func (qpm *QueryPerformanceMonitor) suggestQueryRewrite(metrics *QueryMetrics) string {
    // Basic query rewrite suggestions
    if contains(metrics.QuerySQL, "SELECT *") {
        return "Replace SELECT * with specific column names to reduce data transfer"
    }
    
    if contains(metrics.QuerySQL, "ORDER BY RAND()") {
        return "Replace ORDER BY RAND() with application-level randomization or TABLESAMPLE"
    }
    
    return "Consider query restructuring for better performance"
}

func (qpm *QueryPerformanceMonitor) determinePriority(executionTime time.Duration) string {
    switch {
    case executionTime > 10*time.Second:
        return "critical"
    case executionTime > 5*time.Second:
        return "high"
    case executionTime > 2*time.Second:
        return "medium"
    default:
        return "low"
    }
}

func (qpm *QueryPerformanceMonitor) generateQueryHash(querySQL string) string {
    hash := sha256.Sum256([]byte(querySQL))
    return hex.EncodeToString(hash[:])
}

func (qpm *QueryPerformanceMonitor) recordOptimizationSuggestion(ctx context.Context, queryHash string, suggestion QueryOptimizationSuggestion) error {
    query := `
        INSERT INTO query_optimization_recommendations 
            (query_hash, recommendation_type, current_performance_ms, estimated_improvement_pct,
             optimization_strategy, suggested_indexes, query_rewrite_suggestion, implementation_priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (query_hash, recommendation_type) 
        DO UPDATE SET 
            current_performance_ms = EXCLUDED.current_performance_ms,
            estimated_improvement_pct = EXCLUDED.estimated_improvement_pct,
            created_at = NOW()`
    
    strategyJSON, _ := json.Marshal(suggestion.OptimizationStrategy)
    
    _, err := qpm.db.ExecContext(
        ctx, query,
        queryHash,
        suggestion.RecommendationType,
        suggestion.CurrentPerformanceMs,
        suggestion.EstimatedImprovementPct,
        strategyJSON,
        suggestion.SuggestedIndexes,
        suggestion.QueryRewriteSuggestion,
        suggestion.Priority,
    )
    
    return err
}

// GetOptimizationSuggestions retrieves pending optimization recommendations
func (qpm *QueryPerformanceMonitor) GetOptimizationSuggestions(ctx context.Context, limit int) ([]QueryOptimizationSuggestion, error) {
    query := `SELECT * FROM get_query_optimization_suggestions($1)`
    
    rows, err := qpm.db.QueryContext(ctx, query, limit)
    if err != nil {
        return nil, fmt.Errorf("failed to get optimization suggestions: %w", err)
    }
    defer rows.Close()
    
    var suggestions []QueryOptimizationSuggestion
    for rows.Next() {
        var queryHash string
        var avgExecutionTime float64
        var executionCount int64
        var optimizationPotential string
        
        if err := rows.Scan(&queryHash, &avgExecutionTime, &executionCount, &optimizationPotential); err != nil {
            return nil, fmt.Errorf("failed to scan optimization suggestion: %w", err)
        }
        
        suggestions = append(suggestions, QueryOptimizationSuggestion{
            QueryHash:            queryHash,
            CurrentPerformanceMs: avgExecutionTime,
            Priority:            qpm.determinePriorityFromPotential(optimizationPotential),
        })
    }
    
    return suggestions, nil
}

func (qpm *QueryPerformanceMonitor) determinePriorityFromPotential(potential string) string {
    switch {
    case contains(potential, "CRITICAL"):
        return "critical"
    case contains(potential, "HIGH"):
        return "high"
    case contains(potential, "MEDIUM"):
        return "medium"
    default:
        return "low"
    }
}

// Helper function
func contains(s, substr string) bool {
    return len(s) >= len(substr) && (s == substr || (len(s) > len(substr) && 
        (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || 
         strings.Contains(s, substr))))
}
```

### Step 2: Create Query Interceptor Middleware

**File**: `backend/internal/database/query_interceptor.go`

```go
package database

import (
    "context"
    "database/sql/driver"
    "fmt"
    "regexp"
    "strings"
    "time"
    
    "github.com/jmoiron/sqlx"
    "your-project/internal/monitoring"
)

// QueryInterceptor wraps database operations to monitor performance
type QueryInterceptor struct {
    db                *sqlx.DB
    performanceMonitor *monitoring.QueryPerformanceMonitor
    enableMonitoring   bool
}

func NewQueryInterceptor(db *sqlx.DB, monitor *monitoring.QueryPerformanceMonitor) *QueryInterceptor {
    return &QueryInterceptor{
        db:                db,
        performanceMonitor: monitor,
        enableMonitoring:   true,
    }
}

// InterceptedDB provides query monitoring capabilities
type InterceptedDB struct {
    *sqlx.DB
    interceptor *QueryInterceptor
}

func (qi *QueryInterceptor) WrapDB() *InterceptedDB {
    return &InterceptedDB{
        DB:          qi.db,
        interceptor: qi,
    }
}

// QueryContext intercepts and monitors query execution
func (idb *InterceptedDB) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
    return idb.executeWithMonitoring(ctx, "SELECT", query, args, func() (*sql.Rows, error) {
        return idb.DB.QueryContext(ctx, query, args...)
    })
}

// ExecContext intercepts and monitors exec operations
func (idb *InterceptedDB) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
    queryType := idb.interceptor.determineQueryType(query)
    
    startTime := time.Now()
    result, err := idb.DB.ExecContext(ctx, query, args...)
    executionTime := time.Since(startTime)
    
    if idb.interceptor.enableMonitoring {
        metrics := &monitoring.QueryMetrics{
            QuerySQL:      idb.interceptor.sanitizeQuery(query),
            QueryType:     queryType,
            ExecutionTime: executionTime,
            TableNames:    idb.interceptor.extractTableNames(query),
        }
        
        if result != nil {
            if rowsAffected, err := result.RowsAffected(); err == nil {
                metrics.RowsReturned = rowsAffected
            }
        }
        
        go func() {
            if err := idb.interceptor.performanceMonitor.MonitorQuery(context.Background(), metrics); err != nil {
                log.Printf("WARNING: Failed to monitor query: %v", err)
            }
        }()
    }
    
    return result, err
}

func (idb *InterceptedDB) executeWithMonitoring(
    ctx context.Context,
    queryType string,
    query string,
    args []interface{},
    executor func() (*sql.Rows, error),
) (*sql.Rows, error) {
    startTime := time.Now()
    rows, err := executor()
    executionTime := time.Since(startTime)
    
    if idb.interceptor.enableMonitoring && executionTime > 10*time.Millisecond {
        metrics := &monitoring.QueryMetrics{
            QuerySQL:      idb.interceptor.sanitizeQuery(query),
            QueryType:     queryType,
            ExecutionTime: executionTime,
            TableNames:    idb.interceptor.extractTableNames(query),
        }
        
        // Count rows if query is slow enough to warrant the overhead
        if executionTime > 100*time.Millisecond && rows != nil {
            metrics.RowsReturned = idb.interceptor.countRows(rows)
        }
        
        go func() {
            if err := idb.interceptor.performanceMonitor.MonitorQuery(context.Background(), metrics); err != nil {
                log.Printf("WARNING: Failed to monitor query: %v", err)
            }
        }()
    }
    
    return rows, err
}

func (qi *QueryInterceptor) determineQueryType(query string) string {
    query = strings.TrimSpace(strings.ToUpper(query))
    
    switch {
    case strings.HasPrefix(query, "SELECT"):
        return "SELECT"
    case strings.HasPrefix(query, "INSERT"):
        return "INSERT"
    case strings.HasPrefix(query, "UPDATE"):
        return "UPDATE"
    case strings.HasPrefix(query, "DELETE"):
        return "DELETE"
    case strings.HasPrefix(query, "WITH"):
        return "CTE"
    default:
        return "OTHER"
    }
}

func (qi *QueryInterceptor) sanitizeQuery(query string) string {
    // Remove sensitive data and normalize for monitoring
    query = regexp.MustCompile(`\$\d+`).ReplaceAllString(query, "?")
    query = regexp.MustCompile(`'[^']*'`).ReplaceAllString(query, "'?'")
    query = regexp.MustCompile(`\s+`).ReplaceAllString(query, " ")
    return strings.TrimSpace(query)
}

func (qi *QueryInterceptor) extractTableNames(query string) []string {
    // Simple table name extraction - in production, use SQL parser
    tablePattern := regexp.MustCompile(`(?i)\b(?:FROM|JOIN|INTO|UPDATE)\s+(\w+)`)
    matches := tablePattern.FindAllStringSubmatch(query, -1)
    
    var tables []string
    seen := make(map[string]bool)
    
    for _, match := range matches {
        if len(match) > 1 {
            table := strings.ToLower(match[1])
            if !seen[table] {
                tables = append(tables, table)
                seen[table] = true
            }
        }
    }
    
    return tables
}

func (qi *QueryInterceptor) countRows(rows *sql.Rows) int64 {
    if rows == nil {
        return 0
    }
    
    var count int64
    for rows.Next() {
        count++
    }
    
    return count
}
```

### Step 3: Implement Optimized Query Patterns

**File**: `backend/internal/services/optimized_domain_queries.go`

```go
package services

import (
    "context"
    "fmt"
    "strings"
    
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
    "your-project/internal/models"
)

// OptimizedDomainQueries provides performance-optimized domain query operations
type OptimizedDomainQueries struct {
    db *sqlx.DB
}

func NewOptimizedDomainQueries(db *sqlx.DB) *OptimizedDomainQueries {
    return &OptimizedDomainQueries{db: db}
}

// GetDomainsByCampaignOptimized uses optimized query patterns for campaign domains
func (odq *OptimizedDomainQueries) GetDomainsByCampaignOptimized(
    ctx context.Context,
    campaignID uuid.UUID,
    status string,
    limit int,
    offset int,
) ([]models.Domain, error) {
    // Use optimized composite index and specific column selection
    query := `
        SELECT d.id, d.domain_name, d.tld, d.status, d.performance_score, 
               d.created_at, d.updated_at
        FROM domains d
        WHERE d.campaign_id = $1 
          AND d.status = $2
        ORDER BY d.performance_score DESC, d.created_at DESC
        LIMIT $3 OFFSET $4`
    
    var domains []models.Domain
    err := odq.db.SelectContext(ctx, &domains, query, campaignID, status, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("failed to get domains by campaign: %w", err)
    }
    
    return domains, nil
}

// GetTopPerformingDomainsOptimized retrieves top performing domains efficiently
func (odq *OptimizedDomainQueries) GetTopPerformingDomainsOptimized(
    ctx context.Context,
    limit int,
    minPerformanceScore float64,
) ([]models.Domain, error) {
    // Use covering index to avoid table lookup
    query := `
        SELECT d.id, d.domain_name, d.tld, d.performance_score, d.created_at
        FROM domains d
        WHERE d.status = 'active' 
          AND d.performance_score >= $1
        ORDER BY d.performance_score DESC, d.created_at DESC
        LIMIT $2`
    
    var domains []models.Domain
    err := odq.db.SelectContext(ctx, &domains, query, minPerformanceScore, limit)
    if err != nil {
        return nil, fmt.Errorf("failed to get top performing domains: %w", err)
    }
    
    return domains, nil
}

// SearchDomainsOptimized performs efficient full-text search on domains
func (odq *OptimizedDomainQueries) SearchDomainsOptimized(
    ctx context.Context,
    searchTerm string,
    limit int,
) ([]models.Domain, error) {
    // Use GIN index for full-text search
    query := `
        SELECT d.id, d.domain_name, d.tld, d.status, d.performance_score,
               ts_rank(to_tsvector('english', d.domain_name), plainto_tsquery('english', $1)) as rank
        FROM domains d
        WHERE to_tsvector('english', d.domain_name) @@ plainto_tsquery('english', $1)
          AND d.status = 'active'
        ORDER BY rank DESC, d.performance_score DESC
        LIMIT $2`
    
    var domains []models.Domain
    err := odq.db.SelectContext(ctx, &domains, query, searchTerm, limit)
    if err != nil {
        return nil, fmt.Errorf("failed to search domains: %w", err)
    }
    
    return domains, nil
}

// GetDomainStatisticsOptimized provides efficient aggregate statistics
func (odq *OptimizedDomainQueries) GetDomainStatisticsOptimized(
    ctx context.Context,
    campaignID uuid.UUID,
) (*models.DomainStatistics, error) {
    // Single query with efficient aggregation
    query := `
        SELECT 
            COUNT(*) as total_domains,
            COUNT(*) FILTER (WHERE status = 'active') as active_domains,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_domains,
            COUNT(*) FILTER (WHERE status = 'inactive') as inactive_domains,
            AVG(performance_score) FILTER (WHERE status = 'active') as avg_performance,
            MAX(performance_score) as max_performance,
            COUNT(DISTINCT tld) as unique_tlds
        FROM domains
        WHERE campaign_id = $1`
    
    var stats models.DomainStatistics
    err := odq.db.GetContext(ctx, &stats, query, campaignID)
    if err != nil {
        return nil, fmt.Errorf("failed to get domain statistics: %w", err)
    }
    
    return &stats, nil
}

// BulkUpdateDomainStatusOptimized efficiently updates multiple domain statuses
func (odq *OptimizedDomainQueries) BulkUpdateDomainStatusOptimized(
    ctx context.Context,
    domainIDs []uuid.UUID,
    newStatus string,
) error {
    if len(domainIDs) == 0 {
        return nil
    }
    
    // Use ANY array pattern for efficient bulk operations
    query := `
        UPDATE domains 
        SET status = $1, updated_at = NOW()
        WHERE id = ANY($2)`
    
    _, err := odq.db.ExecContext(ctx, query, newStatus, domainIDs)
    if err != nil {
        return fmt.Errorf("failed to bulk update domain status: %w", err)
    }
    
    return nil
}

// GetRecentDomainActivityOptimized retrieves recent domain activity efficiently
func (odq *OptimizedDomainQueries) GetRecentDomainActivityOptimized(
    ctx context.Context,
    hours int,
    limit int,
) ([]models.DomainActivity, error) {
    // Use partial index on recent records
    query := `
        SELECT d.id, d.domain_name, d.status, d.updated_at,
               c.name as campaign_name,
               COALESCE(lag(d.status) OVER (PARTITION BY d.id ORDER BY d.updated_at), 'new') as previous_status
        FROM domains d
        JOIN campaigns c ON d.campaign_id = c.id
        WHERE d.updated_at > NOW() - INTERVAL '%d hours'
        ORDER BY d.updated_at DESC
        LIMIT $1`
    
    formattedQuery := fmt.Sprintf(query, hours)
    
    var activities []models.DomainActivity
    err := odq.db.SelectContext(ctx, &activities, formattedQuery, limit)
    if err != nil {
        return nil, fmt.Errorf("failed to get recent domain activity: %w", err)
    }
    
    return activities, nil
}
```

### Step 4: Create Performance Testing Suite

**File**: `backend/internal/services/pf001_query_optimization_test.go`

```go
package services

import (
    "context"
    "testing"
    "time"
    
    "github.com/stretchr/testify/suite"
    "github.com/google/uuid"
    "your-project/internal/testutil"
)

type PF001QueryOptimizationTestSuite struct {
    testutil.ServiceTestSuite
    optimizedQueries    *OptimizedDomainQueries
    performanceMonitor  *monitoring.QueryPerformanceMonitor
    queryInterceptor    *database.QueryInterceptor
}

func TestPF001QueryOptimization(t *testing.T) {
    suite.Run(t, &PF001QueryOptimizationTestSuite{
        ServiceTestSuite: testutil.ServiceTestSuite{
            UseDatabaseFromEnv: true, // MANDATORY: Use domainflow_production database
        },
    })
}

func (suite *PF001QueryOptimizationTestSuite) SetupTest() {
    suite.ServiceTestSuite.SetupTest()
    
    alertingService := &MockAlertingService{}
    suite.performanceMonitor = monitoring.NewQueryPerformanceMonitor(suite.db, alertingService)
    suite.queryInterceptor = database.NewQueryInterceptor(suite.db, suite.performanceMonitor)
    suite.optimizedQueries = NewOptimizedDomainQueries(suite.db)
    
    // Create test data
    suite.createTestDomains()
}

func (suite *PF001QueryOptimizationTestSuite) createTestDomains() {
    campaign := suite.CreateTestCampaign("Query Performance Test Campaign")
    
    // Create 10,000 test domains for realistic performance testing
    domains := make([]models.Domain, 10000)
    for i := 0; i < 10000; i++ {
        domains[i] = models.Domain{
            ID:               uuid.New(),
            CampaignID:       campaign.ID,
            DomainName:       fmt.Sprintf("test-domain-%d.com", i),
            TLD:              "com",
            Status:           "active",
            PerformanceScore: float64(i % 100),
        }
    }
    
    suite.BulkInsertDomains(domains)
}

func (suite *PF001QueryOptimizationTestSuite) TestOptimizedDomainQueries() {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    // Test optimized campaign domain retrieval
    startTime := time.Now()
    domains, err := suite.optimizedQueries.GetDomainsByCampaignOptimized(
        ctx, suite.testCampaign.ID, "active", 100, 0)
    executionTime := time.Since(startTime)
    
    suite.NoError(err)
    suite.Equal(100, len(domains))
    suite.Less(executionTime, 100*time.Millisecond, "Query should execute in under 100ms")
    
    // Verify results are ordered correctly
    for i := 1; i < len(domains); i++ {
        suite.True(domains[i-1].PerformanceScore >= domains[i].PerformanceScore,
            "Domains should be ordered by performance score DESC")
    }
}

func (suite *PF001QueryOptimizationTestSuite) TestTopPerformingDomainsQuery() {
    ctx := context.Background()
    
    startTime := time.Now()
    domains, err := suite.optimizedQueries.GetTopPerformingDomainsOptimized(
        ctx, 50, 80.0)
    executionTime := time.Since(startTime)
    
    suite.NoError(err)
    suite.LessOrEqual(len(domains), 50)
    suite.Less(executionTime, 50*time.Millisecond, "Top performing query should be very fast")
    
    // Verify all returned domains meet performance criteria
    for _, domain := range domains {
        suite.GreaterOrEqual(domain.PerformanceScore, 80.0)
    }
}

func (suite *PF001QueryOptimizationTestSuite) TestDomainSearchPerformance() {
    ctx := context.Background()
    
    startTime := time.Now()
    domains, err := suite.optimizedQueries.SearchDomainsOptimized(
        ctx, "test", 25)
    executionTime := time.Since(startTime)
    
    suite.NoError(err)
    suite.LessOrEqual(len(domains), 25)
    suite.Less(executionTime, 200*time.Millisecond, "Search should complete quickly with GIN index")
    
    // Verify search relevance
    for _, domain := range domains {
        suite.Contains(strings.ToLower(domain.DomainName), "test")
    }
}

func (suite *PF001QueryOptimizationTestSuite) TestBulkOperationPerformance() {
    ctx := context.Background()
    
    // Get domain IDs for bulk update
    domainIDs := make([]uuid.UUID, 1000)
    query := `SELECT id FROM domains WHERE campaign_id = $1 LIMIT 1000`
    err := suite.db.Select(&domainIDs, query, suite.testCampaign.ID)
    suite.NoError(err)
    
    startTime := time.Now()
    err = suite.optimizedQueries.BulkUpdateDomainStatusOptimized(
        ctx, domainIDs, "updated")
    executionTime := time.Since(startTime)
    
    suite.NoError(err)
    suite.Less(executionTime, 500*time.Millisecond, "Bulk update should be efficient")
    
    // Verify updates were applied
    var updatedCount int
    countQuery := `SELECT COUNT(*) FROM domains WHERE id = ANY($1) AND status = 'updated'`
    err = suite.db.Get(&updatedCount, countQuery, domainIDs)
    suite.NoError(err)
    suite.Equal(1000, updatedCount)
}

func (suite *PF001QueryOptimizationTestSuite) TestQueryPerformanceMonitoring() {
    ctx := context.Background()
    
    // Execute a query that should be monitored
    startTime := time.Now()
    _, err := suite.optimizedQueries.GetDomainStatisticsOptimized(ctx, suite.testCampaign.ID)
    executionTime := time.Since(startTime)
    
    suite.NoError(err)
    
    // Verify query was monitored
    time.Sleep(100 * time.Millisecond) // Allow monitoring to complete
    
    var monitoredQueries int
    query := `
        SELECT COUNT(*) 
        FROM query_performance_metrics 
        WHERE executed_at > $1`
    
    err = suite.db.Get(&monitoredQueries, query, startTime)
    suite.NoError(err)
    suite.True(monitoredQueries > 0, "Query should have been monitored")
}

func (suite *PF001QueryOptimizationTestSuite) TestSlowQueryDetection() {
    ctx := context.Background()
    
    // Execute an intentionally slow query
    slowQuery := `
        SELECT COUNT(*) 
        FROM domains d1 
        CROSS JOIN domains d2 
        WHERE d1.campaign_id = $1 
        LIMIT 1`
    
    startTime := time.Now()
    var result int
    err := suite.db.GetContext(ctx, &result, slowQuery, suite.testCampaign.ID)
    executionTime := time.Since(startTime)
    
    suite.NoError(err)
    
    // Verify slow query was logged if it took longer than threshold
    if executionTime > 1*time.Second {
        time.Sleep(100 * time.Millisecond) // Allow logging to complete
        
        var slowQueries int
        query := `
            SELECT COUNT(*) 
            FROM slow_query_log 
            WHERE logged_at > $1 
              AND execution_time_ms > 1000`
        
        err = suite.db.Get(&slowQueries, query, startTime)
        suite.NoError(err)
        suite.True(slowQueries > 0, "Slow query should have been logged")
    }
}

func (suite *PF001QueryOptimizationTestSuite) TestIndexUsageAnalysis() {
    ctx := context.Background()
    
    // Execute queries that should use indexes
    _, err := suite.optimizedQueries.GetDomainsByCampaignOptimized(
        ctx, suite.testCampaign.ID, "active", 10, 0)
    suite.NoError(err)
    
    _, err = suite.optimizedQueries.GetTopPerformingDomainsOptimized(ctx, 10, 50.0)
    suite.NoError(err)
    
    // Analyze index usage
    query := `SELECT * FROM analyze_index_usage() WHERE usage_recommendation != 'NORMAL USAGE'`
    
    rows, err := suite.db.QueryContext(ctx, query)
    suite.NoError(err)
    defer rows.Close()
    
    // Log any index usage issues for review
    for rows.Next() {
        var schemaName, tableName, indexName, recommendation string
        err := rows.Scan(&schemaName, &tableName, &indexName, &recommendation)
        suite.NoError(err)
        
        if recommendation == "UNUSED - Consider dropping" {
            suite.T().Logf("WARNING: Unused index detected: %s.%s.%s", 
                schemaName, tableName, indexName)
        }
    }
}

func (suite *PF001QueryOptimizationTestSuite) TestConcurrentQueryPerformance() {
    ctx := context.Background()
    
    // Test concurrent query execution performance
    const numWorkers = 10
    const queriesPerWorker = 50
    
    resultChan := make(chan time.Duration, numWorkers)
    
    for i := 0; i < numWorkers; i++ {
        go func(workerID int) {
            startTime := time.Now()
            
            for j := 0; j < queriesPerWorker; j++ {
                _, err := suite.optimizedQueries.GetDomainsByCampaignOptimized(
                    ctx, suite.testCampaign.ID, "active", 10, j*10)
                suite.NoError(err)
            }
            
            resultChan <- time.Since(startTime)
        }(i)
    }
    
    // Collect results
    totalTime := time.Duration(0)
    for i := 0; i < numWorkers; i++ {
        workerTime := <-resultChan
        totalTime += workerTime
    }
    
    avgTimePerWorker := totalTime / numWorkers
    suite.Less(avgTimePerWorker, 5*time.Second, 
        "Concurrent queries should maintain good performance")
}
```

---

## TESTING REQUIREMENTS

### Environment Setup
```bash
export TEST_POSTGRES_DSN="postgresql://username:password@localhost/domainflow_production"
export USE_REAL_DATABASE=true
export TEST_TIMEOUT=120s
export ENABLE_QUERY_MONITORING=true
export POSTGRES_DATABASE=domainflow_production
```

### Test Execution
```bash
# Run PF-001 specific tests against domainflow_production
go test ./internal/services -run TestPF001 -race -v -timeout 120s -tags=integration

# Run query optimization tests against domainflow_production
go test ./internal/monitoring -run TestQueryPerformance -race -v -tags=integration

# Performance profiling against domainflow_production
go test ./internal/services -run TestQueryOptimization -cpuprofile=cpu.prof -memprofile=mem.prof -tags=integration
```

---

## CI/CD VALIDATION CHECKLIST

### Mandatory Checks
- [ ] `go test ./... -race` passes with zero data races
- [ ] `golangci-lint run` clean with zero critical issues
- [ ] PF-001 query optimization tests pass
- [ ] Query performance monitoring active and functional
- [ ] Optimized queries perform within SLA thresholds
- [ ] Index usage analysis shows efficient utilization

### Performance Validation
- [ ] Domain queries complete in <100ms for 100 records
- [ ] Search queries complete in <200ms with GIN indexes
- [ ] Bulk operations handle 1000+ records efficiently
- [ ] Concurrent query performance remains stable
- [ ] Query monitoring overhead <5ms per query

### Database Validation  
- [ ] All strategic indexes created successfully
- [ ] Query performance metrics captured accurately
- [ ] Slow query detection functions correctly
- [ ] Index usage analytics provide actionable insights

---

## SUCCESS CRITERIA

### Functional Requirements
1. **Query Performance**: Database queries execute within performance thresholds
2. **Monitoring Integration**: All queries monitored and analyzed for optimization
3. **Index Optimization**: Strategic indexes improve query performance significantly
4. **Performance Analytics**: Comprehensive query performance insights available

### Performance Requirements
1. **Query Speed**: Domain queries <100ms, search queries <200ms
2. **Bulk Operations**: Handle 1000+ records efficiently
3. **Concurrent Performance**: Stable performance under concurrent load
4. **Monitoring Overhead**: Query monitoring adds <5ms overhead

### Integration Requirements
1. **Service Integration**: All database services use optimized query patterns
2. **Monitoring Integration**: Query metrics available in performance dashboards
3. **Alert Integration**: Slow query alerts integrate with monitoring systems

---

## ROLLBACK PROCEDURES

### Database Rollback
```sql
-- File: backend/database/migrations/014_rollback_pf001.sql
BEGIN;
DROP FUNCTION IF EXISTS get_query_optimization_suggestions(INTEGER);
DROP FUNCTION IF EXISTS analyze_index_usage();
DROP FUNCTION IF EXISTS check_query_optimization_needed(VARCHAR, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS record_query_performance(TEXT, VARCHAR, DECIMAL, BIGINT, BIGINT, JSONB);
DROP TABLE IF EXISTS slow_query_log;
DROP TABLE IF EXISTS index_usage_analytics;
DROP TABLE IF EXISTS query_optimization_recommendations;
DROP TABLE IF EXISTS query_performance_metrics;
-- Note: Indexes can be dropped manually if needed
COMMIT;
```

---

**Implementation Priority**: HIGH - Critical for system performance and scalability  
**Next Step**: Begin with PostgreSQL migration and index creation, then implement query monitoring  
**Performance Integration**: Prepares for PF-002 response time optimization and PF-003 resource efficiency