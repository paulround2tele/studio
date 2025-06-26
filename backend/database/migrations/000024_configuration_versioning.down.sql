-- Reverse migration for configuration versioning
-- This is a rollback migration, use with caution

BEGIN;

-- Drop the configuration_versions table if it exists
DROP TABLE IF EXISTS configuration_versions;

-- Drop the configuration_changes table if it exists
DROP TABLE IF EXISTS configuration_changes;

COMMIT;
