-- Migration 003: BL-002 Domain Generation Config Race Condition Remediation
-- Adds versioning and optimistic locking to domain_generation_config_states

BEGIN;

-- Add version column to domain_generation_config_states for optimistic locking
ALTER TABLE domain_generation_config_states 
ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- Add created_at timestamp for audit trail
ALTER TABLE domain_generation_config_states 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create index for version-based queries
CREATE INDEX IF NOT EXISTS idx_domain_config_states_version 
ON domain_generation_config_states(config_hash, version);

-- Create composite index for atomic operations
CREATE INDEX IF NOT EXISTS idx_domain_config_states_atomic 
ON domain_generation_config_states(config_hash, version, last_offset);

-- Add constraint to ensure version is always positive
ALTER TABLE domain_generation_config_states 
ADD CONSTRAINT chk_domain_config_states_version_positive 
CHECK (version > 0);

-- Add constraint to ensure last_offset is non-negative
ALTER TABLE domain_generation_config_states 
ADD CONSTRAINT chk_domain_config_states_offset_positive 
CHECK (last_offset >= 0);

-- Create function for atomic config update with optimistic locking
CREATE OR REPLACE FUNCTION atomic_update_domain_config_state(
    p_config_hash TEXT,
    p_expected_version BIGINT,
    p_new_last_offset BIGINT,
    p_config_details JSONB
) RETURNS TABLE(
    success BOOLEAN,
    new_version BIGINT,
    conflict_version BIGINT,
    error_message TEXT
) AS $$
DECLARE
    current_version BIGINT;
    current_offset BIGINT;
    new_version_val BIGINT;
BEGIN
    -- Acquire row-level lock and get current state
    SELECT version, last_offset INTO current_version, current_offset
    FROM domain_generation_config_states 
    WHERE config_hash = p_config_hash
    FOR UPDATE;
    
    -- Check if config exists
    IF NOT FOUND THEN
        -- Create new config if it doesn't exist
        IF p_expected_version != 0 THEN
            RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT, 'Config does not exist but expected version > 0'::TEXT;
            RETURN;
        END IF;
        
        INSERT INTO domain_generation_config_states 
            (config_hash, last_offset, config_details, version, updated_at, created_at)
        VALUES 
            (p_config_hash, p_new_last_offset, p_config_details, 1, NOW(), NOW());
        
        RETURN QUERY SELECT TRUE, 1::BIGINT, 0::BIGINT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check version for optimistic locking
    IF current_version != p_expected_version THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, current_version, 'Version conflict detected'::TEXT;
        RETURN;
    END IF;
    
    -- Validate that offset is not moving backward (race condition protection)
    IF p_new_last_offset < current_offset THEN
        RETURN QUERY SELECT FALSE, current_version, current_version, 
            format('Offset moving backward from %s to %s', current_offset, p_new_last_offset)::TEXT;
        RETURN;
    END IF;
    
    -- Update with new version
    new_version_val := current_version + 1;
    
    UPDATE domain_generation_config_states 
    SET 
        last_offset = p_new_last_offset,
        config_details = p_config_details,
        version = new_version_val,
        updated_at = NOW()
    WHERE config_hash = p_config_hash 
      AND version = p_expected_version;
    
    -- Verify update succeeded
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, current_version, 'Update failed - concurrent modification'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT TRUE, new_version_val, 0::BIGINT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function for safe config retrieval with locking options
CREATE OR REPLACE FUNCTION get_domain_config_state_with_lock(
    p_config_hash TEXT,
    p_lock_type TEXT DEFAULT 'none' -- 'none', 'shared', 'exclusive'
) RETURNS TABLE(
    config_hash TEXT,
    last_offset BIGINT,
    config_details JSONB,
    version BIGINT,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_lock_type = 'exclusive' THEN
        RETURN QUERY 
        SELECT dcs.config_hash, dcs.last_offset, dcs.config_details, 
               dcs.version, dcs.updated_at, dcs.created_at
        FROM domain_generation_config_states dcs
        WHERE dcs.config_hash = p_config_hash
        FOR UPDATE;
    ELSIF p_lock_type = 'shared' THEN
        RETURN QUERY 
        SELECT dcs.config_hash, dcs.last_offset, dcs.config_details, 
               dcs.version, dcs.updated_at, dcs.created_at
        FROM domain_generation_config_states dcs
        WHERE dcs.config_hash = p_config_hash
        FOR SHARE;
    ELSE
        RETURN QUERY 
        SELECT dcs.config_hash, dcs.last_offset, dcs.config_details, 
               dcs.version, dcs.updated_at, dcs.created_at
        FROM domain_generation_config_states dcs
        WHERE dcs.config_hash = p_config_hash;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the new functions
COMMENT ON FUNCTION atomic_update_domain_config_state IS 'Atomically updates domain generation config state with optimistic locking and race condition protection';
COMMENT ON FUNCTION get_domain_config_state_with_lock IS 'Retrieves domain generation config state with optional row-level locking';

-- Update existing data to have version 1
UPDATE domain_generation_config_states 
SET version = 1, created_at = updated_at 
WHERE version IS NULL OR version = 0;

COMMIT;