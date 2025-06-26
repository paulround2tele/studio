-- Migration: 20250701_configuration_versioning.sql
-- Purpose: Create configuration versioning tables
-- Author: Architecture Team
-- Date: 2025-07-01

BEGIN;

CREATE TABLE IF NOT EXISTS config_locks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_hash VARCHAR(255) NOT NULL,
    lock_type VARCHAR(50) DEFAULT 'exclusive' NOT NULL,
    owner VARCHAR(255) NOT NULL,
    acquired_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_config_locks_expires_future CHECK (expires_at IS NULL OR expires_at > acquired_at)
);

CREATE TABLE IF NOT EXISTS config_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_hash VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL,
    lock_type VARCHAR(50) DEFAULT 'none' NOT NULL,
    config_state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT config_versions_config_hash_version_key UNIQUE (config_hash, version)
);

CREATE INDEX IF NOT EXISTS idx_config_locks_active ON config_locks(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_locks_active_unique ON config_locks(config_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_config_locks_config_hash ON config_locks(config_hash);
CREATE INDEX IF NOT EXISTS idx_config_locks_expires ON config_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_config_locks_owner ON config_locks(owner);

CREATE INDEX IF NOT EXISTS idx_config_versions_hash ON config_versions(config_hash);
CREATE INDEX IF NOT EXISTS idx_config_versions_version ON config_versions(config_hash, version);

COMMIT;

-- Rollback procedure
/*
BEGIN;
DROP TABLE IF EXISTS config_versions;
DROP TABLE IF EXISTS config_locks;
DELETE FROM public.schema_migrations WHERE version = '20250701_configuration_versioning';
COMMIT;
*/
