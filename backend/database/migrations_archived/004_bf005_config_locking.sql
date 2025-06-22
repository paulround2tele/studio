-- Migration 004: BF-005 Concurrent Config State Corruption Remediation
-- Creates distributed locking infrastructure for configuration updates

BEGIN;

-- Create config_locks table for distributed configuration locking
CREATE TABLE IF NOT EXISTS config_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_hash TEXT NOT NULL,
    lock_type TEXT NOT NULL CHECK (lock_type IN ('none', 'shared', 'exclusive')),
    owner TEXT NOT NULL,
    lock_reason TEXT,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient lock management
CREATE INDEX IF NOT EXISTS idx_config_locks_config_hash 
ON config_locks(config_hash);

CREATE INDEX IF NOT EXISTS idx_config_locks_active 
ON config_locks(config_hash, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_config_locks_expires 
ON config_locks(expires_at) WHERE is_active = true AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_config_locks_owner 
ON config_locks(owner, is_active) WHERE is_active = true;

-- Create composite index for atomic lock operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_locks_active_unique 
ON config_locks(config_hash) WHERE is_active = true;

-- Add constraint to ensure expires_at is in the future when set
ALTER TABLE config_locks 
ADD CONSTRAINT chk_config_locks_expires_future 
CHECK (expires_at IS NULL OR expires_at > acquired_at);

-- Create function for atomic lock acquisition
CREATE OR REPLACE FUNCTION acquire_config_lock(
    p_config_hash TEXT,
    p_lock_type TEXT,
    p_owner TEXT,
    p_lock_reason TEXT,
    p_expires_at TIMESTAMPTZ
) RETURNS TABLE(
    success BOOLEAN,
    lock_id UUID,
    conflict_owner TEXT,
    error_message TEXT
) AS $$
DECLARE
    existing_lock_owner TEXT;
    existing_expires_at TIMESTAMPTZ;
    new_lock_id UUID;
BEGIN
    -- Check for existing active locks
    SELECT owner, expires_at INTO existing_lock_owner, existing_expires_at
    FROM config_locks 
    WHERE config_hash = p_config_hash AND is_active = true
    FOR UPDATE;
    
    -- Check if existing lock is expired
    IF existing_lock_owner IS NOT NULL THEN
        IF existing_expires_at IS NOT NULL AND existing_expires_at <= NOW() THEN
            -- Clean up expired lock
            UPDATE config_locks 
            SET is_active = false, updated_at = NOW()
            WHERE config_hash = p_config_hash AND is_active = true AND expires_at <= NOW();
            existing_lock_owner := NULL;
        END IF;
    END IF;
    
    -- If lock exists and is not expired, return conflict
    IF existing_lock_owner IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, existing_lock_owner, 'Configuration is locked by another owner'::TEXT;
        RETURN;
    END IF;
    
    -- Create new lock
    new_lock_id := uuid_generate_v4();
    
    INSERT INTO config_locks (id, config_hash, lock_type, owner, lock_reason, acquired_at, expires_at, is_active, created_at, updated_at)
    VALUES (new_lock_id, p_config_hash, p_lock_type, p_owner, p_lock_reason, NOW(), p_expires_at, true, NOW(), NOW());
    
    RETURN QUERY SELECT TRUE, new_lock_id, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function for lock release
CREATE OR REPLACE FUNCTION release_config_lock(
    p_lock_id UUID,
    p_owner TEXT
) RETURNS TABLE(
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    lock_owner TEXT;
BEGIN
    -- Get lock owner
    SELECT owner INTO lock_owner
    FROM config_locks 
    WHERE id = p_lock_id AND is_active = true
    FOR UPDATE;
    
    -- Check if lock exists
    IF lock_owner IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Lock not found or already released'::TEXT;
        RETURN;
    END IF;
    
    -- Check ownership
    IF lock_owner != p_owner THEN
        RETURN QUERY SELECT FALSE, format('Lock is owned by %s, cannot release by %s', lock_owner, p_owner)::TEXT;
        RETURN;
    END IF;
    
    -- Release lock
    UPDATE config_locks 
    SET is_active = false, updated_at = NOW()
    WHERE id = p_lock_id;
    
    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function for lock cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_config_locks()
RETURNS TABLE(
    cleaned_count INTEGER
) AS $$
DECLARE
    count_cleaned INTEGER;
BEGIN
    UPDATE config_locks 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true AND expires_at IS NOT NULL AND expires_at <= NOW();
    
    GET DIAGNOSTICS count_cleaned = ROW_COUNT;
    
    RETURN QUERY SELECT count_cleaned;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the new functions
COMMENT ON FUNCTION acquire_config_lock IS 'Atomically acquires a distributed lock on configuration with conflict detection';
COMMENT ON FUNCTION release_config_lock IS 'Releases a distributed configuration lock with ownership verification';
COMMENT ON FUNCTION cleanup_expired_config_locks IS 'Cleans up expired configuration locks';

COMMIT;