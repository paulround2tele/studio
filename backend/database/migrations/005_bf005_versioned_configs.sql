-- Migration: 005_bf005_versioned_configs.sql
-- Description: Create versioned_configs table for BF-005 configuration consistency validation
-- Dependencies: 003_bl002_config_versioning.sql, 004_bf005_config_locking.sql
-- Date: 2024-12-19

-- ============================================================================
-- BF-005: Concurrent Config State Corruption - Generic Versioned Configs Table
-- ============================================================================

-- Create versioned_configs table for generic configuration versioning
-- This table supports the ConfigConsistencyValidator and provides a unified
-- interface for configuration state management across different config types
CREATE TABLE IF NOT EXISTS versioned_configs (
    id BIGSERIAL PRIMARY KEY,
    config_type VARCHAR(100) NOT NULL,
    config_key VARCHAR(200) NOT NULL,
    config_value JSONB NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    checksum VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system',
    metadata JSONB DEFAULT '{}',
    
    -- Ensure unique config_type + config_key combinations
    CONSTRAINT versioned_configs_type_key_unique UNIQUE (config_type, config_key),
    
    -- Validate checksum format (SHA-256 hex)
    CONSTRAINT versioned_configs_checksum_format CHECK (
        checksum ~ '^[a-f0-9]{64}$'
    ),
    
    -- Validate version is positive
    CONSTRAINT versioned_configs_version_positive CHECK (version > 0),
    
    -- Validate config_type is not empty
    CONSTRAINT versioned_configs_type_not_empty CHECK (
        config_type IS NOT NULL AND LENGTH(TRIM(config_type)) > 0
    ),
    
    -- Validate config_key is not empty
    CONSTRAINT versioned_configs_key_not_empty CHECK (
        config_key IS NOT NULL AND LENGTH(TRIM(config_key)) > 0
    )
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_versioned_configs_type_key ON versioned_configs (config_type, config_key);
CREATE INDEX IF NOT EXISTS idx_versioned_configs_version ON versioned_configs (version);
CREATE INDEX IF NOT EXISTS idx_versioned_configs_created_at ON versioned_configs (created_at);
CREATE INDEX IF NOT EXISTS idx_versioned_configs_updated_at ON versioned_configs (updated_at);
CREATE INDEX IF NOT EXISTS idx_versioned_configs_checksum ON versioned_configs (checksum);

-- Create composite index for consistency validation queries
CREATE INDEX IF NOT EXISTS idx_versioned_configs_validation ON versioned_configs (config_type, config_key, version, checksum);

-- ============================================================================
-- Atomic Configuration Update Functions
-- ============================================================================

-- Function to atomically update configuration with optimistic locking
CREATE OR REPLACE FUNCTION update_versioned_config_atomic(
    p_config_type VARCHAR(100),
    p_config_key VARCHAR(200),
    p_config_value JSONB,
    p_expected_version BIGINT,
    p_checksum VARCHAR(64),
    p_updated_by VARCHAR(100) DEFAULT 'system',
    p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(
    success BOOLEAN,
    new_version BIGINT,
    error_message TEXT
) AS $$
DECLARE
    v_current_version BIGINT;
    v_new_version BIGINT;
    v_rows_affected INTEGER;
BEGIN
    -- Get current version with row-level locking
    SELECT version INTO v_current_version
    FROM versioned_configs
    WHERE config_type = p_config_type AND config_key = p_config_key
    FOR UPDATE;

    -- Check if configuration exists and version matches
    IF NOT FOUND THEN
        -- Insert new configuration
        INSERT INTO versioned_configs (
            config_type, config_key, config_value, version, checksum, created_by, metadata
        ) VALUES (
            p_config_type, p_config_key, p_config_value, 1, p_checksum, p_updated_by, p_metadata
        );
        
        RETURN QUERY SELECT TRUE, 1::BIGINT, NULL::TEXT;
        RETURN;
    END IF;

    -- Verify expected version matches current version (optimistic locking)
    IF v_current_version != p_expected_version THEN
        RETURN QUERY SELECT FALSE, v_current_version, 
            format('Version mismatch: expected %s, current %s', p_expected_version, v_current_version);
        RETURN;
    END IF;

    -- Calculate new version
    v_new_version := v_current_version + 1;

    -- Update configuration atomically
    UPDATE versioned_configs
    SET 
        config_value = p_config_value,
        version = v_new_version,
        checksum = p_checksum,
        updated_at = CURRENT_TIMESTAMP,
        created_by = p_updated_by,
        metadata = p_metadata
    WHERE config_type = p_config_type 
      AND config_key = p_config_key 
      AND version = p_expected_version;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
        RETURN QUERY SELECT FALSE, v_current_version, 
            'Concurrent update detected - version changed during update';
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_new_version, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get configuration with version information
CREATE OR REPLACE FUNCTION get_versioned_config_with_lock(
    p_config_type VARCHAR(100),
    p_config_key VARCHAR(200),
    p_for_update BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
    config_value JSONB,
    version BIGINT,
    checksum VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    metadata JSONB
) AS $$
BEGIN
    IF p_for_update THEN
        RETURN QUERY
        SELECT c.config_value, c.version, c.checksum, c.created_at, c.updated_at, c.created_by, c.metadata
        FROM versioned_configs c
        WHERE c.config_type = p_config_type AND c.config_key = p_config_key
        FOR UPDATE;
    ELSE
        RETURN QUERY
        SELECT c.config_value, c.version, c.checksum, c.created_at, c.updated_at, c.created_by, c.metadata
        FROM versioned_configs c
        WHERE c.config_type = p_config_type AND c.config_key = p_config_key;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to validate configuration consistency
CREATE OR REPLACE FUNCTION validate_config_consistency(
    p_config_type VARCHAR(100),
    p_config_key VARCHAR(200)
) RETURNS TABLE(
    is_consistent BOOLEAN,
    expected_checksum VARCHAR(64),
    actual_checksum VARCHAR(64),
    error_message TEXT
) AS $$
DECLARE
    v_config_value JSONB;
    v_stored_checksum VARCHAR(64);
    v_calculated_checksum VARCHAR(64);
BEGIN
    -- Get configuration and stored checksum
    SELECT config_value, checksum INTO v_config_value, v_stored_checksum
    FROM versioned_configs
    WHERE config_type = p_config_type AND config_key = p_config_key;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::VARCHAR(64), NULL::VARCHAR(64), 
            'Configuration not found'::TEXT;
        RETURN;
    END IF;

    -- Calculate checksum from stored value
    -- Note: This is a simplified validation - in production, you'd want to use
    -- the same checksum calculation as the application layer
    v_calculated_checksum := encode(sha256(v_config_value::TEXT::BYTEA), 'hex');

    -- Compare checksums
    IF v_stored_checksum = v_calculated_checksum THEN
        RETURN QUERY SELECT TRUE, v_stored_checksum, v_calculated_checksum, NULL::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, v_stored_checksum, v_calculated_checksum,
            'Checksum mismatch detected - configuration may be corrupted'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Configuration History and Audit Functions
-- ============================================================================

-- Function to get configuration history
CREATE OR REPLACE FUNCTION get_config_history(
    p_config_type VARCHAR(100),
    p_config_key VARCHAR(200),
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
    version BIGINT,
    config_value JSONB,
    checksum VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.version, c.config_value, c.checksum, c.created_at, c.updated_at, c.created_by, c.metadata
    FROM versioned_configs c
    WHERE c.config_type = p_config_type 
      AND (p_config_key IS NULL OR c.config_key = p_config_key)
    ORDER BY c.updated_at DESC, c.version DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Bridge Functions for Domain Generation Config Integration
-- ============================================================================

-- Function to sync domain generation configs to versioned_configs
CREATE OR REPLACE FUNCTION sync_domain_config_to_versioned()
RETURNS INTEGER AS $$
DECLARE
    v_config_record RECORD;
    v_synced_count INTEGER := 0;
BEGIN
    -- Sync domain generation configs to versioned_configs table
    FOR v_config_record IN 
        SELECT id, config_data, version, checksum, created_at, updated_at
        FROM domain_generation_config_states
        ORDER BY updated_at DESC
    LOOP
        INSERT INTO versioned_configs (
            config_type, config_key, config_value, version, checksum, 
            created_at, updated_at, created_by, metadata
        ) VALUES (
            'domain_generation',
            'config_' || v_config_record.id::TEXT,
            v_config_record.config_data,
            v_config_record.version,
            v_config_record.checksum,
            v_config_record.created_at,
            v_config_record.updated_at,
            'migration_sync',
            jsonb_build_object('source_table', 'domain_generation_config_states', 'source_id', v_config_record.id)
        )
        ON CONFLICT (config_type, config_key) DO UPDATE SET
            config_value = EXCLUDED.config_value,
            version = EXCLUDED.version,
            checksum = EXCLUDED.checksum,
            updated_at = EXCLUDED.updated_at,
            metadata = EXCLUDED.metadata;
        
        v_synced_count := v_synced_count + 1;
    END LOOP;

    RETURN v_synced_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Initial Data Sync and Validation
-- ============================================================================

-- Sync existing domain generation configs
SELECT sync_domain_config_to_versioned();

-- Create a test configuration for validation
INSERT INTO versioned_configs (config_type, config_key, config_value, checksum, created_by, metadata)
VALUES (
    'system',
    'test_config',
    '{"test": true, "environment": "development"}',
    encode(sha256('{"test": true, "environment": "development"}'::BYTEA), 'hex'),
    'system_migration',
    '{"purpose": "BF-005 validation test", "migration": "005_bf005_versioned_configs"}'
)
ON CONFLICT (config_type, config_key) DO NOTHING;

-- Validate the migration
DO $$
DECLARE
    v_test_result RECORD;
    v_config_count INTEGER;
BEGIN
    -- Check if test configuration was created
    SELECT COUNT(*) INTO v_config_count FROM versioned_configs WHERE config_type = 'system' AND config_key = 'test_config';
    
    IF v_config_count = 0 THEN
        RAISE EXCEPTION 'BF-005 Migration Validation Failed: Test configuration not created';
    END IF;

    -- Test consistency validation function
    SELECT * INTO v_test_result FROM validate_config_consistency('system', 'test_config');
    
    IF NOT v_test_result.is_consistent THEN
        RAISE EXCEPTION 'BF-005 Migration Validation Failed: Consistency validation failed - %', v_test_result.error_message;
    END IF;

    RAISE NOTICE 'BF-005 Migration Validation Successful: versioned_configs table created and functional';
END;
$$;

-- ============================================================================
-- Performance and Maintenance
-- ============================================================================

-- Analyze tables for query optimization
ANALYZE versioned_configs;

-- Migration completion log
INSERT INTO versioned_configs (config_type, config_key, config_value, checksum, created_by, metadata)
VALUES (
    'migration',
    '005_bf005_versioned_configs',
    jsonb_build_object(
        'status', 'completed',
        'timestamp', CURRENT_TIMESTAMP,
        'tables_created', array['versioned_configs'],
        'functions_created', array[
            'update_versioned_config_atomic',
            'get_versioned_config_with_lock',
            'validate_config_consistency',
            'get_config_history',
            'sync_domain_config_to_versioned'
        ],
        'indexes_created', array[
            'idx_versioned_configs_type_key',
            'idx_versioned_configs_version',
            'idx_versioned_configs_created_at',
            'idx_versioned_configs_updated_at',
            'idx_versioned_configs_checksum',
            'idx_versioned_configs_validation'
        ]
    ),
    encode(sha256('BF-005 versioned_configs migration completed'::BYTEA), 'hex'),
    'migration_system',
    jsonb_build_object(
        'finding', 'BF-005',
        'phase', '2A',
        'priority', 'CRITICAL',
        'purpose', 'Concurrent Config State Corruption remediation'
    )
)
ON CONFLICT (config_type, config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    checksum = EXCLUDED.checksum,
    updated_at = CURRENT_TIMESTAMP,
    metadata = EXCLUDED.metadata;