-- Reverse migration for communication patterns
-- This is a rollback migration, use with caution

BEGIN;

-- Drop the communication_patterns table if it exists
DROP TABLE IF EXISTS communication_patterns;

COMMIT;
