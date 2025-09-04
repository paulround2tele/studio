-- Cache Management Schema
-- Based on Go models: CacheConfiguration, CacheEntry, CacheInvalidationLog, CacheInvalidation, CacheMetrics

-- Create cache types enum
CREATE TYPE cache_type_enum AS ENUM (
    'redis',
    'memcached',
    'in_memory',
    'database',
    'file_system',
    'distributed'
);

-- Create cache strategy enum
CREATE TYPE cache_strategy_enum AS ENUM (
    'lru',
    'lfu',
    'fifo',
    'lifo',
    'ttl',
    'write_through',
    'write_back',
    'write_around'
);

-- Create cache invalidation types enum
CREATE TYPE cache_invalidation_type_enum AS ENUM (
    'manual',
    'ttl_expired',
    'dependency_changed',
    'memory_pressure',
    'pattern_match',
    'tag_based',
    'cascade',
    'scheduled',
    'event_triggered',
    'size_limit_exceeded'
);

-- Create cache entry status enum
CREATE TYPE cache_entry_status_enum AS ENUM (
    'active',
    'expired',
    'invalidated',
    'evicted',
    'locked',
    'warming'
);

-- Cache configurations table for managing cache settings
CREATE TABLE IF NOT EXISTS cache_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_name VARCHAR(100) NOT NULL UNIQUE,
    cache_type cache_type_enum NOT NULL,
    cache_strategy cache_strategy_enum NOT NULL,
    
    -- Configuration settings
    max_size_bytes BIGINT CHECK (max_size_bytes > 0),
    max_entries INTEGER CHECK (max_entries > 0),
    default_ttl_seconds INTEGER CHECK (default_ttl_seconds > 0),
    max_ttl_seconds INTEGER CHECK (max_ttl_seconds > 0),
    
    -- Performance settings
    eviction_policy JSONB,
    compression_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    encryption_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Connection and clustering
    connection_config JSONB,
    cluster_config JSONB,
    replication_factor INTEGER DEFAULT 1 CHECK (replication_factor > 0),
    
    -- Monitoring and health
    health_check_interval_seconds INTEGER DEFAULT 30 CHECK (health_check_interval_seconds > 0),
    metrics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Environment and deployment
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    service_name VARCHAR(100),
    version VARCHAR(20),
    
    -- Validation constraints
    CONSTRAINT valid_cache_configuration_ttl CHECK (
        max_ttl_seconds IS NULL OR default_ttl_seconds IS NULL OR max_ttl_seconds >= default_ttl_seconds
    )
);

-- Cache entries table for storing cached data
CREATE TABLE IF NOT EXISTS cache_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_configuration_id UUID NOT NULL REFERENCES cache_configurations(id) ON DELETE CASCADE,
    cache_key VARCHAR(500) NOT NULL,
    cache_value BYTEA, -- Stored as binary to support any data type
    cache_value_compressed BOOLEAN NOT NULL DEFAULT FALSE,
    cache_value_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    data_type VARCHAR(50),
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    content_hash VARCHAR(64), -- For integrity checking
    
    -- Timing and lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    access_count INTEGER NOT NULL DEFAULT 0,
    
    -- Status and state
    status cache_entry_status_enum NOT NULL DEFAULT 'active',
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    locked_at TIMESTAMPTZ,
    
    -- Dependencies and invalidation
    dependency_keys TEXT[], -- Keys this entry depends on
    invalidation_tags TEXT[], -- Tags for batch invalidation
    
    -- Campaign and user context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Performance tracking
    generation_time_ms INTEGER CHECK (generation_time_ms >= 0),
    last_hit_at TIMESTAMPTZ,
    hit_count INTEGER NOT NULL DEFAULT 0,
    
    -- Unique constraint for cache key within configuration
    UNIQUE(cache_configuration_id, cache_key),
    
    CONSTRAINT valid_cache_entry_lock CHECK (
        (locked = FALSE) OR (locked = TRUE AND locked_by IS NOT NULL AND locked_at IS NOT NULL)
    ),
    CONSTRAINT valid_cache_entry_expiry CHECK (
        expires_at IS NULL OR expires_at > created_at
    )
);

-- Cache invalidation log table for tracking invalidation events
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_configuration_id UUID NOT NULL REFERENCES cache_configurations(id) ON DELETE CASCADE,
    invalidation_type cache_invalidation_type_enum NOT NULL,
    
    -- Invalidation scope
    keys_invalidated TEXT[],
    pattern_used VARCHAR(500),
    tags_used TEXT[],
    total_entries_invalidated INTEGER NOT NULL DEFAULT 0,
    
    -- Timing
    invalidated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER CHECK (duration_ms >= 0),
    
    -- Context
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    trigger_reason TEXT,
    automatic BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    
    -- Results and impact
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    performance_impact JSONB,
    
    -- Cascade effects
    cascade_invalidations INTEGER DEFAULT 0 CHECK (cascade_invalidations >= 0),
    downstream_effects JSONB
);

-- Cache invalidations table for managing invalidation requests
CREATE TABLE IF NOT EXISTS cache_invalidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_configuration_id UUID NOT NULL REFERENCES cache_configurations(id) ON DELETE CASCADE,
    invalidation_type cache_invalidation_type_enum NOT NULL,
    
    -- Invalidation specification
    cache_key VARCHAR(500),
    key_pattern VARCHAR(500),
    tags TEXT[],
    all_entries BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Scheduling and timing
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Status and lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- Context and tracking
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    
    -- Results
    entries_affected INTEGER DEFAULT 0 CHECK (entries_affected >= 0),
    success BOOLEAN,
    error_message TEXT,
    
    -- Dependencies
    depends_on UUID REFERENCES cache_invalidations(id) ON DELETE SET NULL,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    max_retries INTEGER NOT NULL DEFAULT 3 CHECK (max_retries >= 0),
    
    CONSTRAINT valid_cache_invalidation_completion CHECK (
        (status != 'completed') OR (completed_at IS NOT NULL)
    ),
    CONSTRAINT valid_cache_invalidation_processing CHECK (
        (status != 'processing') OR (processed_at IS NOT NULL)
    )
);

-- Cache metrics table for performance monitoring
CREATE TABLE IF NOT EXISTS cache_metrics (
    id BIGSERIAL PRIMARY KEY,
    cache_configuration_id UUID NOT NULL REFERENCES cache_configurations(id) ON DELETE CASCADE,
    
    -- Basic metrics
    hit_count INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
    miss_count INTEGER NOT NULL DEFAULT 0 CHECK (miss_count >= 0),
    eviction_count INTEGER NOT NULL DEFAULT 0 CHECK (eviction_count >= 0),
    invalidation_count INTEGER NOT NULL DEFAULT 0 CHECK (invalidation_count >= 0),
    
    -- Performance metrics
    avg_response_time_ms DECIMAL(10,3) CHECK (avg_response_time_ms >= 0),
    max_response_time_ms DECIMAL(10,3) CHECK (max_response_time_ms >= 0),
    min_response_time_ms DECIMAL(10,3) CHECK (min_response_time_ms >= 0),
    
    -- Capacity metrics
    current_entries INTEGER NOT NULL DEFAULT 0 CHECK (current_entries >= 0),
    current_size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (current_size_bytes >= 0),
    max_entries_reached INTEGER DEFAULT 0 CHECK (max_entries_reached >= 0),
    max_size_bytes_reached BIGINT DEFAULT 0 CHECK (max_size_bytes_reached >= 0),
    
    -- Efficiency metrics
    hit_ratio DECIMAL(5,4) CHECK (hit_ratio BETWEEN 0 AND 1),
    memory_efficiency DECIMAL(5,4) CHECK (memory_efficiency BETWEEN 0 AND 1),
    compression_ratio DECIMAL(5,4) CHECK (compression_ratio >= 0),
    
    -- Time period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional context
    service_name VARCHAR(100),
    environment VARCHAR(50),
    
    CONSTRAINT valid_cache_metrics_period CHECK (period_end > period_start),
    CONSTRAINT valid_cache_metrics_response_times CHECK (
        min_response_time_ms IS NULL OR max_response_time_ms IS NULL OR min_response_time_ms <= max_response_time_ms
    )
);

-- Indexes for cache configurations
CREATE INDEX IF NOT EXISTS idx_cache_configurations_cache_name ON cache_configurations(cache_name);
CREATE INDEX IF NOT EXISTS idx_cache_configurations_cache_type ON cache_configurations(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_configurations_active ON cache_configurations(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cache_configurations_service_name ON cache_configurations(service_name) WHERE service_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_configurations_environment ON cache_configurations(environment);
CREATE INDEX IF NOT EXISTS idx_cache_configurations_created_by ON cache_configurations(created_by) WHERE created_by IS NOT NULL;

-- GIN indexes for JSONB columns in cache configurations
CREATE INDEX IF NOT EXISTS idx_cache_configurations_eviction_policy_gin ON cache_configurations USING GIN(eviction_policy) WHERE eviction_policy IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_configurations_connection_config_gin ON cache_configurations USING GIN(connection_config) WHERE connection_config IS NOT NULL;

-- Indexes for cache entries
CREATE INDEX IF NOT EXISTS idx_cache_entries_cache_configuration_id ON cache_entries(cache_configuration_id);
CREATE INDEX IF NOT EXISTS idx_cache_entries_cache_key ON cache_entries(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at ON cache_entries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_entries_status ON cache_entries(status);
CREATE INDEX IF NOT EXISTS idx_cache_entries_last_accessed_at ON cache_entries(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_cache_entries_campaign_id ON cache_entries(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_entries_user_id ON cache_entries(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_entries_locked ON cache_entries(locked) WHERE locked = TRUE;
CREATE INDEX IF NOT EXISTS idx_cache_entries_size_bytes ON cache_entries(size_bytes);
CREATE INDEX IF NOT EXISTS idx_cache_entries_access_count ON cache_entries(access_count);

-- Composite indexes for cache entries
CREATE INDEX IF NOT EXISTS idx_cache_entries_config_status ON cache_entries(cache_configuration_id, status);
CREATE INDEX IF NOT EXISTS idx_cache_entries_config_key_status ON cache_entries(cache_configuration_id, cache_key, status);
CREATE INDEX IF NOT EXISTS idx_cache_entries_expired ON cache_entries(expires_at, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_cache_entries_lru_eviction ON cache_entries(cache_configuration_id, last_accessed_at) WHERE status = 'active';

-- GIN indexes for array columns in cache entries
CREATE INDEX IF NOT EXISTS idx_cache_entries_dependency_keys_gin ON cache_entries USING GIN(dependency_keys) WHERE dependency_keys IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_entries_invalidation_tags_gin ON cache_entries USING GIN(invalidation_tags) WHERE invalidation_tags IS NOT NULL;

-- Indexes for cache invalidation log
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_cache_configuration_id ON cache_invalidation_log(cache_configuration_id);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_invalidation_type ON cache_invalidation_log(invalidation_type);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_invalidated_at ON cache_invalidation_log(invalidated_at);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_triggered_by ON cache_invalidation_log(triggered_by) WHERE triggered_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_automatic ON cache_invalidation_log(automatic);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_success ON cache_invalidation_log(success) WHERE success = FALSE;
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_campaign_id ON cache_invalidation_log(campaign_id) WHERE campaign_id IS NOT NULL;

-- GIN indexes for array columns in cache invalidation log
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_keys_invalidated_gin ON cache_invalidation_log USING GIN(keys_invalidated) WHERE keys_invalidated IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_tags_used_gin ON cache_invalidation_log USING GIN(tags_used) WHERE tags_used IS NOT NULL;

-- Indexes for cache invalidations
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_cache_configuration_id ON cache_invalidations(cache_configuration_id);
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_invalidation_type ON cache_invalidations(invalidation_type);
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_status ON cache_invalidations(status);
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_scheduled_for ON cache_invalidations(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_priority ON cache_invalidations(priority);
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_requested_by ON cache_invalidations(requested_by) WHERE requested_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_campaign_id ON cache_invalidations(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_depends_on ON cache_invalidations(depends_on) WHERE depends_on IS NOT NULL;

-- Composite indexes for cache invalidations processing
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_pending ON cache_invalidations(status, priority DESC, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_processing ON cache_invalidations(status, processed_at) WHERE status = 'processing';

-- GIN indexes for array columns in cache invalidations
CREATE INDEX IF NOT EXISTS idx_cache_invalidations_tags_gin ON cache_invalidations USING GIN(tags) WHERE tags IS NOT NULL;

-- Indexes for cache metrics
CREATE INDEX IF NOT EXISTS idx_cache_metrics_cache_configuration_id ON cache_metrics(cache_configuration_id);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_period_start ON cache_metrics(period_start);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_period_end ON cache_metrics(period_end);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_recorded_at ON cache_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_hit_ratio ON cache_metrics(hit_ratio);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_service_name ON cache_metrics(service_name) WHERE service_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_metrics_environment ON cache_metrics(environment) WHERE environment IS NOT NULL;

-- Composite indexes for cache metrics analysis
CREATE INDEX IF NOT EXISTS idx_cache_metrics_config_period ON cache_metrics(cache_configuration_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_performance ON cache_metrics(cache_configuration_id, hit_ratio DESC, avg_response_time_ms);