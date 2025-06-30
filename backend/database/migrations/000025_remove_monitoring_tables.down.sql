-- Recreate legacy monitoring and performance tables
-- Used to rollback removal if necessary
-- Author: SchemaAligner
-- Date: 2025-07-05

BEGIN;

-- Connection Pool Metrics Table
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
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connection_pool_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    alert_message TEXT NOT NULL,
    threshold_value NUMERIC(10,2),
    current_value NUMERIC(10,2),
    severity VARCHAR(20) DEFAULT 'warning',
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS connection_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    connection_id VARCHAR(100) NOT NULL,
    allocated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    stack_trace TEXT,
    leak_duration_seconds INTEGER NOT NULL,
    leak_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS si004_connection_pool_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC(15,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    threshold_breach BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS si004_connection_pool_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    alert_code VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS si004_connection_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    connection_signature VARCHAR(200) NOT NULL,
    leak_source VARCHAR(200) NOT NULL,
    leak_age_seconds INTEGER NOT NULL,
    impact_score INTEGER DEFAULT 0,
    auto_resolved BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Memory Monitoring Tables
CREATE TABLE IF NOT EXISTS memory_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    process_id VARCHAR(50) NOT NULL,
    heap_size_bytes BIGINT NOT NULL,
    heap_used_bytes BIGINT NOT NULL,
    heap_free_bytes BIGINT NOT NULL,
    gc_count BIGINT DEFAULT 0,
    gc_duration_ms BIGINT DEFAULT 0,
    goroutines_count INTEGER DEFAULT 0,
    stack_size_bytes BIGINT DEFAULT 0,
    memory_utilization_pct NUMERIC(5,2) DEFAULT 0,
    memory_state VARCHAR(50) DEFAULT 'normal',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    component VARCHAR(100) DEFAULT 'unknown',
    memory_type VARCHAR(50) DEFAULT 'heap',
    allocated_bytes BIGINT DEFAULT 0,
    used_bytes BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS memory_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    process_id VARCHAR(50) NOT NULL,
    leak_type VARCHAR(50) NOT NULL,
    leak_source VARCHAR(200) NOT NULL,
    memory_growth_rate_mb_per_hour NUMERIC(10,2) NOT NULL,
    detection_confidence NUMERIC(3,2) DEFAULT 0.0,
    impact_severity VARCHAR(20) DEFAULT 'low',
    auto_resolved BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS memory_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    allocation_type VARCHAR(50) NOT NULL,
    allocation_size_bytes BIGINT NOT NULL,
    allocation_source VARCHAR(200) NOT NULL,
    allocation_stack_trace TEXT,
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deallocated_at TIMESTAMP WITH TIME ZONE,
    is_leaked BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS memory_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    pool_type VARCHAR(50) NOT NULL,
    total_size_bytes BIGINT NOT NULL,
    used_size_bytes BIGINT NOT NULL,
    free_size_bytes BIGINT NOT NULL,
    allocation_count INTEGER DEFAULT 0,
    deallocation_count INTEGER DEFAULT 0,
    fragmentation_pct NUMERIC(5,2) DEFAULT 0.0,
    pool_efficiency_pct NUMERIC(5,2) DEFAULT 100.0,
    last_reset_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    recommendation_text TEXT NOT NULL,
    potential_memory_savings_mb INTEGER DEFAULT 0,
    implementation_effort VARCHAR(20) DEFAULT 'medium',
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    implemented_at TIMESTAMP WITH TIME ZONE
);

-- Response Time Monitoring Tables
CREATE TABLE IF NOT EXISTS response_time_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    response_time_ms NUMERIC(10,3) NOT NULL,
    payload_size_bytes INTEGER DEFAULT 0,
    user_id UUID,
    campaign_id UUID,
    status_code INTEGER DEFAULT 200,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    service_name VARCHAR(100) DEFAULT 'unknown',
    campaign_type VARCHAR(50),
    performance_category VARCHAR(20) DEFAULT 'normal',
    cache_hit BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS response_time_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    avg_response_time_ms NUMERIC(10,3) NOT NULL,
    min_response_time_ms NUMERIC(10,3) NOT NULL,
    max_response_time_ms NUMERIC(10,3) NOT NULL,
    p50_response_time_ms NUMERIC(10,3) NOT NULL,
    p90_response_time_ms NUMERIC(10,3) NOT NULL,
    p95_response_time_ms NUMERIC(10,3) NOT NULL,
    p99_response_time_ms NUMERIC(10,3) NOT NULL,
    request_count INTEGER NOT NULL,
    error_count INTEGER DEFAULT 0,
    time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS response_time_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    target_p50_ms NUMERIC(10,3) NOT NULL,
    target_p90_ms NUMERIC(10,3) NOT NULL,
    target_p95_ms NUMERIC(10,3) NOT NULL,
    target_p99_ms NUMERIC(10,3) NOT NULL,
    alert_threshold_ms NUMERIC(10,3) NOT NULL,
    service_name VARCHAR(100) DEFAULT 'unknown',
    business_priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(endpoint_path, http_method, service_name)
);

CREATE TABLE IF NOT EXISTS response_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    current_avg_response_time_ms NUMERIC(10,3) NOT NULL,
    target_response_time_ms NUMERIC(10,3) NOT NULL,
    optimization_type VARCHAR(50) NOT NULL,
    recommendation_text TEXT NOT NULL,
    estimated_improvement_pct NUMERIC(5,2) DEFAULT 0.0,
    implementation_effort VARCHAR(20) DEFAULT 'medium',
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    implemented_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS performance_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    baseline_p50_ms NUMERIC(10,3) NOT NULL,
    baseline_p90_ms NUMERIC(10,3) NOT NULL,
    baseline_p95_ms NUMERIC(10,3) NOT NULL,
    baseline_p99_ms NUMERIC(10,3) NOT NULL,
    baseline_date TIMESTAMP WITH TIME ZONE NOT NULL,
    environment VARCHAR(50) DEFAULT 'production',
    load_conditions VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(255) NOT NULL,
    optimization_name VARCHAR(100) NOT NULL,
    optimization_type VARCHAR(50) NOT NULL,
    before_avg_response_time_ms NUMERIC(10,3) NOT NULL,
    after_avg_response_time_ms NUMERIC(10,3) NOT NULL,
    improvement_pct NUMERIC(5,2) NOT NULL,
    implementation_details TEXT,
    rollback_plan TEXT,
    implemented_by VARCHAR(100),
    implemented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rollback_at TIMESTAMP WITH TIME ZONE
);

-- Recreate indexes for connection pool monitoring
CREATE INDEX IF NOT EXISTS idx_connection_pool_metrics_pool ON connection_pool_metrics(pool_name);
CREATE INDEX IF NOT EXISTS idx_connection_pool_metrics_recorded ON connection_pool_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_connection_pool_metrics_state ON connection_pool_metrics(pool_state);
CREATE INDEX IF NOT EXISTS idx_connection_pool_alerts_pool ON connection_pool_alerts(pool_name);
CREATE INDEX IF NOT EXISTS idx_connection_pool_alerts_type ON connection_pool_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_connection_pool_alerts_unresolved ON connection_pool_alerts(created_at) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_connection_leak_detection_pool ON connection_leak_detection(pool_name);
CREATE INDEX IF NOT EXISTS idx_connection_leak_detection_unresolved ON connection_leak_detection(allocated_at) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_si004_metrics_pool_type ON si004_connection_pool_metrics(pool_name, metric_type);
CREATE INDEX IF NOT EXISTS idx_si004_metrics_threshold ON si004_connection_pool_metrics(recorded_at) WHERE threshold_breach = TRUE;
CREATE INDEX IF NOT EXISTS idx_si004_alerts_pool_severity ON si004_connection_pool_alerts(pool_name, severity);
CREATE INDEX IF NOT EXISTS idx_si004_alerts_unack ON si004_connection_pool_alerts(created_at) WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_si004_leak_pool_age ON si004_connection_leak_detection(pool_name, leak_age_seconds);
CREATE INDEX IF NOT EXISTS idx_si004_leak_unresolved ON si004_connection_leak_detection(detected_at) WHERE auto_resolved = FALSE;

-- Recreate indexes for memory monitoring
CREATE INDEX IF NOT EXISTS idx_memory_metrics_service ON memory_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_metrics_recorded ON memory_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_memory_metrics_utilization ON memory_metrics(memory_utilization_pct) WHERE memory_utilization_pct > 80.0;
CREATE INDEX IF NOT EXISTS idx_memory_metrics_state ON memory_metrics(memory_state) WHERE memory_state != 'normal';
CREATE INDEX IF NOT EXISTS idx_memory_leak_service ON memory_leak_detection(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_leak_unresolved ON memory_leak_detection(detected_at) WHERE auto_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_memory_leak_severity ON memory_leak_detection(impact_severity, detected_at);
CREATE INDEX IF NOT EXISTS idx_memory_allocations_service ON memory_allocations(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_allocations_leaked ON memory_allocations(allocated_at) WHERE is_leaked = TRUE;
CREATE INDEX IF NOT EXISTS idx_memory_allocations_size ON memory_allocations(allocation_size_bytes) WHERE allocation_size_bytes > 1048576;
CREATE INDEX IF NOT EXISTS idx_memory_pools_name ON memory_pools(pool_name);
CREATE INDEX IF NOT EXISTS idx_memory_pools_efficiency ON memory_pools(pool_efficiency_pct) WHERE pool_efficiency_pct < 80.0;
CREATE INDEX IF NOT EXISTS idx_memory_pools_fragmentation ON memory_pools(fragmentation_pct) WHERE fragmentation_pct > 20.0;
CREATE INDEX IF NOT EXISTS idx_memory_optimization_service ON memory_optimization_recommendations(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_optimization_pending ON memory_optimization_recommendations(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_memory_optimization_priority ON memory_optimization_recommendations(priority, created_at);

-- Recreate indexes for response time monitoring
CREATE INDEX IF NOT EXISTS idx_response_metrics_endpoint_time ON response_time_metrics(endpoint_path, recorded_at);
CREATE INDEX IF NOT EXISTS idx_response_metrics_campaign ON response_time_metrics(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_response_metrics_slow ON response_time_metrics(response_time_ms, recorded_at) WHERE response_time_ms > 1000;
CREATE INDEX IF NOT EXISTS idx_response_metrics_method ON response_time_metrics(http_method, endpoint_path);
CREATE INDEX IF NOT EXISTS idx_response_history_endpoint ON response_time_history(endpoint_path, time_window_start);
CREATE INDEX IF NOT EXISTS idx_response_history_window ON response_time_history(time_window_start, time_window_end);
CREATE INDEX IF NOT EXISTS idx_response_targets_endpoint ON response_time_targets(endpoint_path, http_method);
CREATE INDEX IF NOT EXISTS idx_response_targets_service ON response_time_targets(service_name);
CREATE INDEX IF NOT EXISTS idx_response_optimization_endpoint ON response_optimization_recommendations(endpoint_path);
CREATE INDEX IF NOT EXISTS idx_response_optimization_pending ON response_optimization_recommendations(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_response_optimization_priority ON response_optimization_recommendations(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_performance_baselines_endpoint ON performance_baselines(endpoint_path, baseline_date);
CREATE INDEX IF NOT EXISTS idx_performance_baselines_env ON performance_baselines(environment, baseline_date);
CREATE INDEX IF NOT EXISTS idx_performance_optimizations_endpoint ON performance_optimizations(endpoint_path, implemented_at);
CREATE INDEX IF NOT EXISTS idx_performance_optimizations_improvement ON performance_optimizations(improvement_pct) WHERE improvement_pct > 10.0;

COMMIT;
