-- PF-004: Caching Implementation Migration
-- Phase 2c Performance Enhancement
-- Creates tables for tracking cache metrics and performance
BEGIN;

-- Cache performance metrics
CREATE TABLE IF NOT EXISTS cache_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL,
    cache_type VARCHAR(50) NOT NULL, -- 'memory', 'redis', 'database', etc.
    cache_operation VARCHAR(50) NOT NULL, -- 'hit', 'miss', 'set', 'delete', 'evict'
    key_hash VARCHAR(64) NOT NULL,
    value_size_bytes INTEGER DEFAULT 0,
    access_time_ms INTEGER DEFAULT 0,
    ttl_seconds INTEGER DEFAULT 0,
    hit_rate_pct DECIMAL(5,2) DEFAULT 0,
    operation_context JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_metrics_name ON cache_metrics(cache_namespace);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_type ON cache_metrics(operation_type);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_operation ON cache_metrics(operation_type);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_recorded ON cache_metrics(recorded_at);

-- Cache configuration and status
CREATE TABLE IF NOT EXISTS cache_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL UNIQUE,
    cache_type VARCHAR(50) NOT NULL,
    max_size_bytes BIGINT DEFAULT 0,
    current_size_bytes BIGINT DEFAULT 0,
    max_entries INTEGER DEFAULT 0,
    current_entries INTEGER DEFAULT 0,
    default_ttl_seconds INTEGER DEFAULT 3600,
    eviction_policy VARCHAR(50) DEFAULT 'lru',
    cache_status VARCHAR(50) DEFAULT 'active',
    last_cleanup_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_config_name ON cache_configurations(cache_name);
CREATE INDEX IF NOT EXISTS idx_cache_config_type ON cache_configurations(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_config_status ON cache_configurations(cache_status);

-- Cache invalidation tracking
CREATE TABLE IF NOT EXISTS cache_invalidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL,
    invalidation_type VARCHAR(50) NOT NULL, -- 'manual', 'ttl', 'size_limit', 'dependency'
    invalidation_reason TEXT,
    keys_invalidated INTEGER DEFAULT 1,
    bytes_freed BIGINT DEFAULT 0,
    operation_context JSONB DEFAULT '{}',
    invalidated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_inv_name ON cache_invalidations(cache_name);
CREATE INDEX IF NOT EXISTS idx_cache_inv_type ON cache_invalidations(invalidation_type);
CREATE INDEX IF NOT EXISTS idx_cache_inv_at ON cache_invalidations(invalidated_at);

COMMIT;
