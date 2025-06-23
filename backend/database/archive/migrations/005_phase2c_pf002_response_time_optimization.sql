-- PF-002: Response Time Optimization Migration
-- Phase 2c Performance Enhancement
-- Creates tables for tracking response times and performance optimization
BEGIN;

-- Response time tracking
CREATE TABLE IF NOT EXISTS response_time_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    response_time_ms INTEGER NOT NULL,
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_type VARCHAR(100),
    user_agent VARCHAR(255),
    request_id VARCHAR(255),
    campaign_id UUID,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_time_service ON response_time_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_response_time_endpoint ON response_time_metrics(endpoint_path);
CREATE INDEX IF NOT EXISTS idx_response_time_operation ON response_time_metrics(http_method);
CREATE INDEX IF NOT EXISTS idx_response_time_ms ON response_time_metrics(response_time_ms);
CREATE INDEX IF NOT EXISTS idx_response_time_recorded ON response_time_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_response_time_campaign ON response_time_metrics(campaign_id);

-- Performance optimization tracking
CREATE TABLE IF NOT EXISTS performance_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optimization_type VARCHAR(100) NOT NULL,
    target_service VARCHAR(100) NOT NULL,
    target_operation VARCHAR(255) NOT NULL,
    baseline_time_ms INTEGER NOT NULL,
    optimized_time_ms INTEGER NOT NULL,
    improvement_pct DECIMAL(5,2) NOT NULL,
    optimization_technique VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    validation_status VARCHAR(50) DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_perf_opt_type ON performance_optimizations(optimization_type);
CREATE INDEX IF NOT EXISTS idx_perf_opt_service ON performance_optimizations(target_service);
CREATE INDEX IF NOT EXISTS idx_perf_opt_improvement ON performance_optimizations(improvement_pct);

COMMIT;
