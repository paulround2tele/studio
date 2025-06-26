-- Reverse migration for service capacity metrics
-- This is a rollback migration, use with caution

BEGIN;

-- Drop the service_capacity_metrics table if it exists
DROP TABLE IF EXISTS service_capacity_metrics;

COMMIT;
