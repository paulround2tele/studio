-- Reverse migration for service architecture monitoring
-- This is a rollback migration, use with caution

BEGIN;

-- Drop the service_architecture_monitoring table if it exists
DROP TABLE IF EXISTS service_architecture_monitoring;

-- Drop the service_health_metrics table if it exists
DROP TABLE IF EXISTS service_health_metrics;

-- Drop the performance_bottlenecks table if it exists
DROP TABLE IF EXISTS performance_bottlenecks;

COMMIT;
