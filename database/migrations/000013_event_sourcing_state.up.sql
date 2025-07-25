-- Event Sourcing and State Schema
-- Based on Go models: Event Store, Event Projections, Config Locks, Config Versions

-- Create event types enum
CREATE TYPE event_type_enum AS ENUM (
    'campaign_created',
    'campaign_updated',
    'campaign_deleted',
    'campaign_started',
    'campaign_paused',
    'campaign_resumed',
    'campaign_completed',
    'campaign_failed',
    'phase_started',
    'phase_completed',
    'phase_failed',
    'domain_generated',
    'domain_validated',
    'domain_failed_validation',
    'dns_validation_started',
    'dns_validation_completed',
    'dns_validation_failed',
    'http_validation_started',
    'http_validation_completed',
    'http_validation_failed',
    'keyword_validation_started',
    'keyword_validation_completed',
    'keyword_validation_failed',
    'job_created',
    'job_started',
    'job_completed',
    'job_failed',
    'job_retried',
    'user_created',
    'user_updated',
    'user_login',
    'user_logout',
    'session_created',
    'session_expired',
    'proxy_assigned',
    'proxy_released',
    'proxy_failed',
    'persona_assigned',
    'persona_released',
    'config_updated',
    'config_locked',
    'config_unlocked',
    'audit_event',
    'security_event',
    'performance_alert',
    'capacity_alert',
    'system_alert'
);

-- Create projection status enum
CREATE TYPE projection_status_enum AS ENUM (
    'building',
    'current',
    'stale',
    'failed',
    'rebuilding'
);

-- Create config lock types enum
CREATE TYPE config_lock_type_enum AS ENUM (
    'read_lock',
    'write_lock',
    'exclusive_lock',
    'shared_lock'
);

-- Event store table for comprehensive event sourcing
CREATE TABLE IF NOT EXISTS event_store (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    event_type event_type_enum NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_version INTEGER NOT NULL CHECK (aggregate_version > 0),
    
    -- Event data and metadata
    event_data JSONB NOT NULL,
    event_metadata JSONB,
    
    -- Timing and sequence
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sequence_number BIGINT NOT NULL,
    
    -- Causation and correlation
    causation_id UUID, -- The command that caused this event
    correlation_id UUID, -- Groups related events together
    parent_event_id UUID REFERENCES event_store(event_id) ON DELETE SET NULL,
    
    -- User and session context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    campaign_phase phase_type_enum,
    
    -- Event source and processing
    event_source VARCHAR(100) NOT NULL DEFAULT 'api_server',
    event_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'skipped')),
    
    -- Snapshot and compaction
    is_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
    compacted BOOLEAN NOT NULL DEFAULT FALSE,
    compaction_timestamp TIMESTAMPTZ,
    
    -- Error handling and retry
    processing_attempts INTEGER NOT NULL DEFAULT 0 CHECK (processing_attempts >= 0),
    last_processing_error TEXT,
    retry_after TIMESTAMPTZ,
    
    -- Partitioning and sharding
    partition_key VARCHAR(100) NOT NULL DEFAULT 'default',
    shard_key VARCHAR(50),
    
    -- Compliance and retention
    retention_policy VARCHAR(50) DEFAULT 'standard',
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archive_timestamp TIMESTAMPTZ,
    
    -- Unique constraint for aggregate versioning
    UNIQUE(aggregate_id, aggregate_version),
    
    -- Ensure sequence is monotonic per aggregate
    UNIQUE(aggregate_id, sequence_number)
);

-- Event projections table for materialized views of event data
CREATE TABLE IF NOT EXISTS event_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_name VARCHAR(100) NOT NULL UNIQUE,
    projection_type VARCHAR(50) NOT NULL,
    
    -- Projection state and status
    status projection_status_enum NOT NULL DEFAULT 'building',
    current_position BIGINT NOT NULL DEFAULT 0 CHECK (current_position >= 0),
    last_processed_event_id UUID REFERENCES event_store(event_id) ON DELETE SET NULL,
    last_processed_timestamp TIMESTAMPTZ,
    
    -- Projection configuration
    query_definition TEXT NOT NULL,
    event_filters JSONB, -- Which events this projection cares about
    batch_size INTEGER NOT NULL DEFAULT 100 CHECK (batch_size > 0),
    processing_interval_seconds INTEGER NOT NULL DEFAULT 10 CHECK (processing_interval_seconds > 0),
    
    -- Performance and health
    processing_lag_ms INTEGER CHECK (processing_lag_ms >= 0),
    events_processed_count BIGINT NOT NULL DEFAULT 0 CHECK (events_processed_count >= 0),
    events_failed_count BIGINT NOT NULL DEFAULT 0 CHECK (events_failed_count >= 0),
    last_success_timestamp TIMESTAMPTZ,
    last_failure_timestamp TIMESTAMPTZ,
    
    -- Error handling and recovery
    error_threshold INTEGER NOT NULL DEFAULT 10 CHECK (error_threshold > 0),
    current_error_count INTEGER NOT NULL DEFAULT 0 CHECK (current_error_count >= 0),
    auto_recovery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_recovery_attempt TIMESTAMPTZ,
    
    -- Lifecycle and versioning
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    
    -- Configuration and dependencies
    dependencies TEXT[], -- Other projections this depends on
    rebuild_on_failure BOOLEAN NOT NULL DEFAULT TRUE,
    parallel_processing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Monitoring and alerting
    monitoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    alert_on_lag_ms INTEGER DEFAULT 30000 CHECK (alert_on_lag_ms > 0),
    alert_on_failure_count INTEGER DEFAULT 5 CHECK (alert_on_failure_count > 0),
    
    -- Target table information
    target_table_name VARCHAR(100),
    target_schema_name VARCHAR(100) DEFAULT 'public',
    
    -- Campaign context
    campaign_specific BOOLEAN NOT NULL DEFAULT FALSE,
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL
);

-- Config locks table for configuration management concurrency control
CREATE TABLE IF NOT EXISTS config_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lock_name VARCHAR(200) NOT NULL UNIQUE,
    lock_type config_lock_type_enum NOT NULL DEFAULT 'write_lock',
    
    -- Lock ownership
    locked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Lock context
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    
    -- Lock purpose and metadata
    purpose TEXT NOT NULL,
    lock_metadata JSONB,
    operation_context JSONB,
    
    -- Lock hierarchy and dependencies
    parent_lock_id UUID REFERENCES config_locks(id) ON DELETE CASCADE,
    child_locks_count INTEGER NOT NULL DEFAULT 0 CHECK (child_locks_count >= 0),
    
    -- Auto-renewal and heartbeat
    auto_renewal_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    heartbeat_interval_seconds INTEGER DEFAULT 30 CHECK (heartbeat_interval_seconds > 0),
    last_heartbeat TIMESTAMPTZ,
    
    -- Lock state and status
    active BOOLEAN NOT NULL DEFAULT TRUE,
    acquired_count INTEGER NOT NULL DEFAULT 1 CHECK (acquired_count > 0),
    renewed_count INTEGER NOT NULL DEFAULT 0 CHECK (renewed_count >= 0),
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    
    -- Warning and escalation
    warning_threshold_seconds INTEGER DEFAULT 300 CHECK (warning_threshold_seconds > 0),
    escalation_threshold_seconds INTEGER DEFAULT 600 CHECK (escalation_threshold_seconds > 0),
    warning_sent BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_sent BOOLEAN NOT NULL DEFAULT FALSE,
    
    CONSTRAINT valid_config_lock_expiry CHECK (expires_at > locked_at),
    CONSTRAINT valid_config_lock_heartbeat CHECK (
        auto_renewal_enabled = FALSE OR last_heartbeat IS NOT NULL
    )
);

-- Config versions table for configuration version management
CREATE TABLE IF NOT EXISTS config_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(200) NOT NULL,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    
    -- Configuration data
    config_value JSONB NOT NULL,
    config_schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    
    -- Versioning and lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Change tracking
    change_description TEXT,
    change_reason VARCHAR(500),
    change_type VARCHAR(50) NOT NULL DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'delete', 'rollback')),
    
    -- Validation and integrity
    config_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of config_value
    validation_status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (validation_status IN ('valid', 'invalid', 'pending_validation', 'validation_failed')),
    validation_errors JSONB,
    
    -- Deployment and rollout
    deployed BOOLEAN NOT NULL DEFAULT FALSE,
    deployed_at TIMESTAMPTZ,
    deployed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deployment_environment VARCHAR(50) DEFAULT 'production',
    
    -- Rollback and recovery
    rollback_version INTEGER, -- References version_number, but constraint added later
    can_rollback BOOLEAN NOT NULL DEFAULT TRUE,
    rollback_metadata JSONB,
    
    -- Impact and dependencies
    affects_campaigns BOOLEAN NOT NULL DEFAULT FALSE,
    affected_services TEXT[],
    dependency_configs TEXT[],
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    
    -- Approval and governance
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    
    -- Compliance and audit
    compliance_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    audit_trail JSONB,
    retention_period_days INTEGER DEFAULT 2555 CHECK (retention_period_days > 0),
    
    -- Unique constraint for config key and version
    UNIQUE(config_key, version_number),
    
    CONSTRAINT valid_config_version_deployment CHECK (
        (deployed = FALSE) OR (deployed = TRUE AND deployed_at IS NOT NULL AND deployed_by IS NOT NULL)
    ),
    CONSTRAINT valid_config_version_approval CHECK (
        (approval_required = FALSE) OR (approved = TRUE AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    )
);

-- Indexes for event store
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_event_id ON event_store(event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_event_type ON event_store(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_aggregate_id ON event_store(aggregate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_aggregate_type ON event_store(aggregate_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_event_timestamp ON event_store(event_timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_sequence_number ON event_store(sequence_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_user_id ON event_store(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_session_id ON event_store(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_campaign_id ON event_store(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_campaign_phase ON event_store(campaign_phase) WHERE campaign_phase IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_causation_id ON event_store(causation_id) WHERE causation_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_correlation_id ON event_store(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_parent_event_id ON event_store(parent_event_id) WHERE parent_event_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_processing_status ON event_store(processing_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_is_snapshot ON event_store(is_snapshot) WHERE is_snapshot = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_compacted ON event_store(compacted) WHERE compacted = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_archived ON event_store(archived) WHERE archived = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_partition_key ON event_store(partition_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_retry_after ON event_store(retry_after) WHERE retry_after IS NOT NULL;

-- Composite indexes for event store
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_aggregate_version ON event_store(aggregate_id, aggregate_version);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_aggregate_sequence ON event_store(aggregate_id, sequence_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_type_timestamp ON event_store(event_type, event_timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_campaign_type_timestamp ON event_store(campaign_id, event_type, event_timestamp DESC) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_processing_pending ON event_store(processing_status, sequence_number) WHERE processing_status = 'pending';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_user_timestamp ON event_store(user_id, event_timestamp DESC) WHERE user_id IS NOT NULL;

-- GIN indexes for JSONB columns in event store
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_event_data_gin ON event_store USING GIN(event_data);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_event_metadata_gin ON event_store USING GIN(event_metadata) WHERE event_metadata IS NOT NULL;

-- Indexes for event projections
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_projection_name ON event_projections(projection_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_projection_type ON event_projections(projection_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_status ON event_projections(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_current_position ON event_projections(current_position);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_last_processed_event_id ON event_projections(last_processed_event_id) WHERE last_processed_event_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_created_by ON event_projections(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_campaign_id ON event_projections(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_campaign_specific ON event_projections(campaign_specific) WHERE campaign_specific = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_monitoring_enabled ON event_projections(monitoring_enabled) WHERE monitoring_enabled = TRUE;

-- Composite indexes for event projections
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_status_position ON event_projections(status, current_position);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_lag_monitoring ON event_projections(processing_lag_ms DESC, status) WHERE monitoring_enabled = TRUE;

-- GIN indexes for array and JSONB columns in event projections
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_event_filters_gin ON event_projections USING GIN(event_filters) WHERE event_filters IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_dependencies_gin ON event_projections USING GIN(dependencies) WHERE dependencies IS NOT NULL;

-- Indexes for config locks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_lock_name ON config_locks(lock_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_lock_type ON config_locks(lock_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_locked_by ON config_locks(locked_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_locked_at ON config_locks(locked_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_expires_at ON config_locks(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_session_id ON config_locks(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_resource_type ON config_locks(resource_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_resource_id ON config_locks(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_parent_lock_id ON config_locks(parent_lock_id) WHERE parent_lock_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_active ON config_locks(active) WHERE active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_campaign_id ON config_locks(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_auto_renewal_enabled ON config_locks(auto_renewal_enabled) WHERE auto_renewal_enabled = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_last_heartbeat ON config_locks(last_heartbeat) WHERE auto_renewal_enabled = TRUE;

-- Composite indexes for config locks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_resource_active ON config_locks(resource_type, resource_id, active) WHERE active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_expiring_soon ON config_locks(expires_at, active) WHERE active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_locks_stale_heartbeat ON config_locks(last_heartbeat, auto_renewal_enabled, active) WHERE auto_renewal_enabled = TRUE AND active = TRUE;

-- Indexes for config versions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_config_key ON config_versions(config_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_version_number ON config_versions(version_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_created_at ON config_versions(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_created_by ON config_versions(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_is_current ON config_versions(is_current) WHERE is_current = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_is_active ON config_versions(is_active) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_change_type ON config_versions(change_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_validation_status ON config_versions(validation_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_deployed ON config_versions(deployed);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_deployed_by ON config_versions(deployed_by) WHERE deployed_by IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_deployment_environment ON config_versions(deployment_environment) WHERE deployment_environment IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_rollback_version ON config_versions(rollback_version) WHERE rollback_version IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_can_rollback ON config_versions(can_rollback) WHERE can_rollback = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_affects_campaigns ON config_versions(affects_campaigns) WHERE affects_campaigns = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_campaign_id ON config_versions(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_approval_required ON config_versions(approval_required) WHERE approval_required = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_approved ON config_versions(approved) WHERE approval_required = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_approved_by ON config_versions(approved_by) WHERE approved_by IS NOT NULL;

-- Composite indexes for config versions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_key_version ON config_versions(config_key, version_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_key_current ON config_versions(config_key, is_current) WHERE is_current = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_pending_approval ON config_versions(approval_required, approved, created_at DESC) WHERE approval_required = TRUE AND approved = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_pending_deployment ON config_versions(deployed, approved, created_at DESC) WHERE deployed = FALSE AND (approval_required = FALSE OR approved = TRUE);

-- GIN indexes for array and JSONB columns in config versions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_config_value_gin ON config_versions USING GIN(config_value);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_validation_errors_gin ON config_versions USING GIN(validation_errors) WHERE validation_errors IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_rollback_metadata_gin ON config_versions USING GIN(rollback_metadata) WHERE rollback_metadata IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_affected_services_gin ON config_versions USING GIN(affected_services) WHERE affected_services IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_dependency_configs_gin ON config_versions USING GIN(dependency_configs) WHERE dependency_configs IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_config_versions_audit_trail_gin ON config_versions USING GIN(audit_trail) WHERE audit_trail IS NOT NULL;