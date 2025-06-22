BEGIN;

-- Centralized state events table (extends existing state_events)
ALTER TABLE state_events ADD COLUMN IF NOT EXISTS state_version INTEGER DEFAULT 1;
ALTER TABLE state_events ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE state_events ADD COLUMN IF NOT EXISTS causation_id UUID;
ALTER TABLE state_events ADD COLUMN IF NOT EXISTS aggregate_type VARCHAR(100) DEFAULT 'campaign';

-- Create index for event ordering and correlation
CREATE INDEX IF NOT EXISTS idx_state_events_version ON state_events(entity_id, state_version);
CREATE INDEX IF NOT EXISTS idx_state_events_correlation ON state_events(correlation_id);

-- State snapshots table for performance optimization
CREATE TABLE IF NOT EXISTS state_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(100) NOT NULL DEFAULT 'campaign',
    snapshot_version INTEGER NOT NULL,
    state_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_id, entity_type, snapshot_version)
);

CREATE INDEX idx_state_snapshots_entity ON state_snapshots(entity_id, entity_type);
CREATE INDEX idx_state_snapshots_version ON state_snapshots(entity_id, snapshot_version DESC);

-- State coordination locks table
CREATE TABLE IF NOT EXISTS state_coordination_locks (
    entity_id UUID PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL DEFAULT 'campaign',
    lock_holder VARCHAR(255) NOT NULL,
    lock_token UUID NOT NULL DEFAULT gen_random_uuid(),
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    operation_context JSONB DEFAULT '{}'
);

CREATE INDEX idx_coordination_locks_expires ON state_coordination_locks(expires_at);

-- Function to acquire coordination lock
CREATE OR REPLACE FUNCTION acquire_state_lock(
    p_entity_id UUID,
    p_entity_type VARCHAR(100),
    p_lock_holder VARCHAR(255),
    p_lock_duration_seconds INTEGER DEFAULT 30
) RETURNS UUID AS $$
DECLARE
    lock_token UUID;
    current_time TIMESTAMPTZ := NOW();
    expiry_time TIMESTAMPTZ := current_time + (p_lock_duration_seconds || ' seconds')::INTERVAL;
BEGIN
    -- Clean up expired locks first
    DELETE FROM state_coordination_locks 
    WHERE expires_at < current_time;
    
    -- Try to acquire lock
    INSERT INTO state_coordination_locks 
        (entity_id, entity_type, lock_holder, lock_token, expires_at)
    VALUES 
        (p_entity_id, p_entity_type, p_lock_holder, gen_random_uuid(), expiry_time)
    ON CONFLICT (entity_id) DO NOTHING
    RETURNING lock_token INTO lock_token;
    
    RETURN lock_token;
END;
$$ LANGUAGE plpgsql;

-- Function to release coordination lock
CREATE OR REPLACE FUNCTION release_state_lock(
    p_entity_id UUID,
    p_lock_token UUID
) RETURNS BOOLEAN AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM state_coordination_locks 
    WHERE entity_id = p_entity_id AND lock_token = p_lock_token;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMIT;