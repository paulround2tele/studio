-- Phase 2C - PF002: Response Time Optimization
-- Description: Create response time monitoring and optimization infrastructure
-- Author: Database Performance Team
-- Date: 2025-06-26

BEGIN;

-- Response Time Metrics Table
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

-- Response Time History Table
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

-- Response Time Targets Table
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

-- Response Optimization Recommendations Table
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

-- Performance Baselines Table
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

-- Performance Optimizations Table
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

-- Indexes for Performance
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