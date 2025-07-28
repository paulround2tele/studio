-- Performance Monitoring Schema
-- Based on Go models: QueryPerformanceMetric, ResourceUtilizationMetric, ConnectionPoolMetrics, PaginationPerformanceMetric

-- Query performance metrics table for database query monitoring
CREATE TABLE IF NOT EXISTS query_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    query_sql TEXT NOT NULL,
    query_type VARCHAR(50) NOT NULL,
    table_names TEXT[] NOT NULL,
    execution_time_ms DECIMAL(10,3) NOT NULL CHECK (execution_time_ms >= 0),
    rows_examined BIGINT NOT NULL CHECK (rows_examined >= 0),
    rows_returned BIGINT NOT NULL CHECK (rows_returned >= 0),
    index_usage JSONB,
    cpu_time_ms DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (cpu_time_ms >= 0),
    io_wait_ms DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (io_wait_ms >= 0),
    lock_wait_ms DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (lock_wait_ms >= 0),
    buffer_reads BIGINT NOT NULL DEFAULT 0 CHECK (buffer_reads >= 0),
    buffer_hits BIGINT NOT NULL DEFAULT 0 CHECK (buffer_hits >= 0),
    query_plan JSONB,
    optimization_score DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (optimization_score >= 0 AND optimization_score <= 100),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    service_name VARCHAR(50) NOT NULL,
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    campaign_phase phase_type_enum, -- Phase-based tracking for analytics
    memory_used_bytes BIGINT NOT NULL DEFAULT 0 CHECK (memory_used_bytes >= 0),
    optimization_applied BOOLEAN NOT NULL DEFAULT FALSE,
    optimization_suggestions JSONB,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    performance_category VARCHAR(20) NOT NULL DEFAULT 'normal',
    needs_optimization BOOLEAN NOT NULL DEFAULT FALSE,
    
    CONSTRAINT valid_query_performance_buffer_ratio CHECK (
        buffer_reads = 0 OR buffer_hits <= buffer_reads
    )
);

-- Resource utilization metrics table for system resource monitoring
CREATE TABLE IF NOT EXISTS resource_utilization_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(50) NOT NULL,
    resource_type VARCHAR(30) NOT NULL, -- 'cpu', 'memory', 'disk', 'network'
    current_usage DECIMAL(10,2) NOT NULL CHECK (current_usage >= 0),
    max_capacity DECIMAL(10,2) NOT NULL CHECK (max_capacity > 0),
    utilization_pct DECIMAL(5,2) NOT NULL CHECK (utilization_pct >= 0 AND utilization_pct <= 100),
    efficiency_score DECIMAL(5,2) NOT NULL CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
    bottleneck_detected BOOLEAN NOT NULL DEFAULT FALSE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    campaign_phase phase_type_enum, -- Phase-based tracking for analytics
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    component VARCHAR(50), -- Specific component within the service
    optimization_applied JSONB, -- Applied optimizations
    
    CONSTRAINT valid_resource_utilization CHECK (current_usage <= max_capacity)
);

-- Connection pool metrics table for database connection monitoring
CREATE TABLE IF NOT EXISTS connection_pool_metrics (
    id BIGSERIAL PRIMARY KEY,
    active_connections INTEGER NOT NULL CHECK (active_connections >= 0),
    idle_connections INTEGER NOT NULL CHECK (idle_connections >= 0),
    max_connections INTEGER NOT NULL CHECK (max_connections > 0),
    wait_count INTEGER NOT NULL DEFAULT 0 CHECK (wait_count >= 0),
    wait_duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (wait_duration_ms >= 0),
    connection_errors INTEGER NOT NULL DEFAULT 0 CHECK (connection_errors >= 0),
    pool_utilization_percent DECIMAL(5,2) NOT NULL CHECK (pool_utilization_percent >= 0 AND pool_utilization_percent <= 100),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional metrics for enhanced monitoring
    service_name VARCHAR(50), -- Service using the connection pool
    database_name VARCHAR(50), -- Database being connected to
    peak_connections INTEGER CHECK (peak_connections >= 0), -- Peak connections in this period
    avg_connection_duration_ms DECIMAL(10,2) CHECK (avg_connection_duration_ms >= 0), -- Average connection lifetime
    
    CONSTRAINT valid_connection_pool_totals CHECK (
        (active_connections + idle_connections) <= max_connections
    )
);

-- Pagination performance metrics table for cursor pagination optimization
CREATE TABLE IF NOT EXISTS pagination_performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    pagination_type VARCHAR(20) NOT NULL CHECK (pagination_type IN ('offset', 'cursor')),
    page_size INTEGER NOT NULL CHECK (page_size > 0),
    page_number INTEGER NOT NULL CHECK (page_number > 0),
    total_rows BIGINT NOT NULL CHECK (total_rows >= 0),
    execution_time_ms INTEGER NOT NULL CHECK (execution_time_ms >= 0),
    memory_usage_kb INTEGER NOT NULL DEFAULT 0 CHECK (memory_usage_kb >= 0),
    indexes_used TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional context fields
    query_complexity_score INTEGER CHECK (query_complexity_score BETWEEN 1 AND 10),
    cache_hit_ratio DECIMAL(5,2) CHECK (cache_hit_ratio >= 0 AND cache_hit_ratio <= 100),
    service_name VARCHAR(50),
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT valid_pagination_page_size CHECK (
        page_size <= 10000 -- Reasonable page size limit
    )
);

-- Indexes for query performance metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_query_hash ON query_performance_metrics(query_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_query_type ON query_performance_metrics(query_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_executed_at ON query_performance_metrics(executed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_execution_time ON query_performance_metrics(execution_time_ms);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_service_name ON query_performance_metrics(service_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_campaign_id ON query_performance_metrics(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_campaign_phase ON query_performance_metrics(campaign_phase) WHERE campaign_phase IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_performance_category ON query_performance_metrics(performance_category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_needs_optimization ON query_performance_metrics(needs_optimization) WHERE needs_optimization = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_user_id ON query_performance_metrics(user_id) WHERE user_id IS NOT NULL;

-- Composite indexes for performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_type_time ON query_performance_metrics(query_type, execution_time_ms DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_service_time ON query_performance_metrics(service_name, executed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_slow_queries ON query_performance_metrics(execution_time_ms DESC, executed_at DESC) WHERE execution_time_ms > 1000;

-- GIN indexes for JSONB columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_table_names_gin ON query_performance_metrics USING GIN(table_names);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_index_usage_gin ON query_performance_metrics USING GIN(index_usage) WHERE index_usage IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_query_plan_gin ON query_performance_metrics USING GIN(query_plan) WHERE query_plan IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_metrics_optimization_suggestions_gin ON query_performance_metrics USING GIN(optimization_suggestions) WHERE optimization_suggestions IS NOT NULL;

-- Indexes for resource utilization metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_service_name ON resource_utilization_metrics(service_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_resource_type ON resource_utilization_metrics(resource_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_recorded_at ON resource_utilization_metrics(recorded_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_utilization_pct ON resource_utilization_metrics(utilization_pct);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_bottleneck_detected ON resource_utilization_metrics(bottleneck_detected) WHERE bottleneck_detected = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_campaign_id ON resource_utilization_metrics(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_campaign_phase ON resource_utilization_metrics(campaign_phase) WHERE campaign_phase IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_component ON resource_utilization_metrics(component) WHERE component IS NOT NULL;

-- Composite indexes for resource monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_service_resource ON resource_utilization_metrics(service_name, resource_type, recorded_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_high_utilization ON resource_utilization_metrics(utilization_pct DESC, recorded_at DESC) WHERE utilization_pct > 80;

-- GIN index for optimization data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_metrics_optimization_gin ON resource_utilization_metrics USING GIN(optimization_applied) WHERE optimization_applied IS NOT NULL;

-- Indexes for connection pool metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_metrics_recorded_at ON connection_pool_metrics(recorded_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_metrics_pool_utilization ON connection_pool_metrics(pool_utilization_percent);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_metrics_service_name ON connection_pool_metrics(service_name) WHERE service_name IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_metrics_database_name ON connection_pool_metrics(database_name) WHERE database_name IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_metrics_connection_errors ON connection_pool_metrics(connection_errors) WHERE connection_errors > 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_metrics_wait_count ON connection_pool_metrics(wait_count) WHERE wait_count > 0;

-- Composite indexes for connection pool analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_metrics_service_utilization ON connection_pool_metrics(service_name, pool_utilization_percent DESC, recorded_at DESC) WHERE service_name IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_metrics_high_utilization ON connection_pool_metrics(pool_utilization_percent DESC, recorded_at DESC) WHERE pool_utilization_percent > 80;

-- Indexes for pagination performance metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_table_name ON pagination_performance_metrics(table_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_pagination_type ON pagination_performance_metrics(pagination_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_recorded_at ON pagination_performance_metrics(recorded_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_execution_time ON pagination_performance_metrics(execution_time_ms);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_page_size ON pagination_performance_metrics(page_size);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_service_name ON pagination_performance_metrics(service_name) WHERE service_name IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_campaign_id ON pagination_performance_metrics(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_user_id ON pagination_performance_metrics(user_id) WHERE user_id IS NOT NULL;

-- Composite indexes for pagination analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_table_type ON pagination_performance_metrics(table_name, pagination_type, execution_time_ms DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_slow_pagination ON pagination_performance_metrics(execution_time_ms DESC, recorded_at DESC) WHERE execution_time_ms > 100;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pagination_performance_metrics_large_pages ON pagination_performance_metrics(page_size DESC, execution_time_ms DESC) WHERE page_size > 1000;

-- Add performance category check constraint
ALTER TABLE query_performance_metrics 
ADD CONSTRAINT chk_query_performance_metrics_performance_category 
CHECK (performance_category IN ('excellent', 'good', 'normal', 'poor', 'critical'));

-- Add resource type check constraint
ALTER TABLE resource_utilization_metrics 
ADD CONSTRAINT chk_resource_utilization_metrics_resource_type 
CHECK (resource_type IN ('cpu', 'memory', 'disk', 'network', 'database', 'cache', 'queue'));