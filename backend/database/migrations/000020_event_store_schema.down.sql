-- Reverse migration for event store schema
-- This is a rollback migration, use with caution

BEGIN;

-- Drop the event_store table if it exists
DROP TABLE IF EXISTS event_store;

-- Drop the event_snapshots table if it exists
DROP TABLE IF EXISTS event_snapshots;

COMMIT;
