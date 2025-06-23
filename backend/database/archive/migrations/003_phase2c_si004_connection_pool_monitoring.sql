-- SI-004: Database Connection Pool Monitoring Migration
-- Phase 2c Performance Enhancement
-- Creates tables for tracking connection pool metrics and monitoring
BEGIN;

-- Connection pool metrics and monitoring
CREATE TABLE IF NOT EXISTS connection_pool_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    active_connections INTEGER NOT NULL,
    idle_connections INTEGER NOT NULL,
    max_connections INTEGER NOT NULL,
    total_connections INTEGER NOT NULL,
    connections_in_use INTEGER NOT NULL,
    wait_count INTEGER DEFAULT 0,
    wait_duration_ms INTEGER DEFAULT 0,
    connection_errors INTEGER DEFAULT 0,
    pool_state VARCHAR(50) DEFAULT 'healthy',
    cpu_usage_pct DECIMAL(5,2) DEFAULT 0,
    memory_usage_bytes BIGINT DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connection_pool_metrics_pool ON connection_pool_metrics(pool_name);
CREATE INDEX idx_connection_pool_metrics_recorded ON connection_pool_metrics(recorded_at);
CREATE INDEX idx_connection_pool_metrics_state ON connection_pool_metrics(pool_state);

-- Connection pool alerts and thresholds
CREATE TABLE IF NOT EXISTS connection_pool_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    threshold_value INTEGER NOT NULL,
    current_value INTEGER NOT NULL,
    alert_severity VARCHAR(20) DEFAULT 'warning',
    alert_message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connection_pool_alerts_pool ON connection_pool_alerts(pool_name);
CREATE INDEX idx_connection_pool_alerts_type ON connection_pool_alerts(alert_type);
CREATE INDEX idx_connection_pool_alerts_severity ON connection_pool_alerts(alert_severity);
CREATE INDEX idx_connection_pool_alerts_resolved ON connection_pool_alerts(resolved);

-- Database performance metrics for PF-001 (Database Query Optimization)
CREATE TABLE IF NOT EXISTS database_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type VARCHAR(100) NOT NULL,
    query_hash VARCHAR(64) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    rows_affected INTEGER DEFAULT 0,
    rows_returned INTEGER DEFAULT 0,
    index_usage JSONB DEFAULT '{}',
    query_plan_summary TEXT,
    cache_hit BOOLEAN DEFAULT false,
    operation_context JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_db_perf_metrics_type ON database_performance_metrics(query_type);
CREATE INDEX idx_db_perf_metrics_hash ON database_performance_metrics(query_hash);
CREATE INDEX idx_db_perf_metrics_time ON database_performance_metrics(execution_time_ms);
CREATE INDEX idx_db_perf_metrics_recorded ON database_performance_metrics(recorded_at);

COMMIT;
