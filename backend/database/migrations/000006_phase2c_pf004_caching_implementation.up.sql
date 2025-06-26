-- Phase 2C - PF004: Caching Implementation and Optimization
-- Description: Create comprehensive caching infrastructure for performance optimization
-- Author: Database Performance Team
-- Date: 2025-06-26

BEGIN;

-- Cache Configurations Table
CREATE TABLE IF NOT EXISTS cache_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL,
    cache_type VARCHAR(50) NOT NULL,
    max_size_bytes BIGINT DEFAULT 0,
    current_size_bytes BIGINT DEFAULT 0,
    max_entries INTEGER DEFAULT 0,
    current_entries INTEGER DEFAULT 0,
    default_ttl_seconds INTEGER DEFAULT 3600,
    eviction_policy VARCHAR(50) DEFAULT 'lru',
    cache_status VARCHAR(50) DEFAULT 'active',
    last_cleanup_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cache_name)
);

-- Cache Entries Table
CREATE TABLE IF NOT EXISTS cache_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL,
    cache_key VARCHAR(500) NOT NULL,
    cache_value_hash VARCHAR(64),
    value_size_bytes INTEGER DEFAULT 0,
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cache_name, cache_key)
);

-- Cache Metrics Table
CREATE TABLE IF NOT EXISTS cache_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC(15,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_window_minutes INTEGER DEFAULT 5
);

-- Cache Invalidations Table
CREATE TABLE IF NOT EXISTS cache_invalidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL,
    invalidation_type VARCHAR(50) NOT NULL,
    invalidation_pattern VARCHAR(500),
    keys_invalidated INTEGER DEFAULT 0,
    reason VARCHAR(200),
    initiated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache Invalidation Log Table
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL,
    cache_key VARCHAR(500) NOT NULL,
    invalidation_reason VARCHAR(200) NOT NULL,
    invalidated_by VARCHAR(100),
    value_age_seconds INTEGER DEFAULT 0,
    hit_count_at_invalidation INTEGER DEFAULT 0,
    invalidated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache Hit/Miss Analytics Table
CREATE TABLE IF NOT EXISTS cache_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL,
    endpoint_path VARCHAR(255) NOT NULL,
    cache_key_pattern VARCHAR(200) NOT NULL,
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    hit_ratio NUMERIC(5,4) DEFAULT 0.0,
    avg_response_time_cached_ms NUMERIC(10,3) DEFAULT 0.0,
    avg_response_time_uncached_ms NUMERIC(10,3) DEFAULT 0.0,
    performance_improvement_pct NUMERIC(5,2) DEFAULT 0.0,
    time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache Optimization Recommendations Table
CREATE TABLE IF NOT EXISTS cache_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    current_hit_ratio NUMERIC(5,4) NOT NULL,
    target_hit_ratio NUMERIC(5,4) NOT NULL,
    recommendation_text TEXT NOT NULL,
    estimated_performance_gain_pct NUMERIC(5,2) DEFAULT 0.0,
    implementation_effort VARCHAR(20) DEFAULT 'medium',
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    implemented_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_cache_configurations_name ON cache_configurations(cache_name);
CREATE INDEX IF NOT EXISTS idx_cache_configurations_status ON cache_configurations(cache_status);
CREATE INDEX IF NOT EXISTS idx_cache_configurations_type ON cache_configurations(cache_type);

CREATE INDEX IF NOT EXISTS idx_cache_entries_cache_key ON cache_entries(cache_name, cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires ON cache_entries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_entries_hit_count ON cache_entries(hit_count) WHERE hit_count > 0;
CREATE INDEX IF NOT EXISTS idx_cache_entries_size ON cache_entries(value_size_bytes) WHERE value_size_bytes > 1048576; -- > 1MB

CREATE INDEX IF NOT EXISTS idx_cache_metrics_cache_type ON cache_metrics(cache_name, metric_type);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_recorded ON cache_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_value ON cache_metrics(metric_value) WHERE metric_type = 'hit_ratio';

CREATE INDEX IF NOT EXISTS idx_cache_invalidations_cache ON cache_invalidations(cache_name);
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_type ON cache_invalidations(invalidation_type);
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_created ON cache_invalidations(created_at);

CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_cache ON cache_invalidation_log(cache_name);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_key ON cache_invalidation_log(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_invalidated ON cache_invalidation_log(invalidated_at);

CREATE INDEX IF NOT EXISTS idx_cache_analytics_cache_endpoint ON cache_analytics(cache_name, endpoint_path);
CREATE INDEX IF NOT EXISTS idx_cache_analytics_hit_ratio ON cache_analytics(hit_ratio) WHERE hit_ratio < 0.8;
CREATE INDEX IF NOT EXISTS idx_cache_analytics_window ON cache_analytics(time_window_start, time_window_end);

CREATE INDEX IF NOT EXISTS idx_cache_optimization_cache ON cache_optimization_recommendations(cache_name);
CREATE INDEX IF NOT EXISTS idx_cache_optimization_pending ON cache_optimization_recommendations(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_cache_optimization_priority ON cache_optimization_recommendations(priority, created_at);

COMMIT;