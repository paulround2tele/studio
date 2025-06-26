-- Rollback Phase 2C - SI004: Connection Pool Monitoring
-- Description: Remove connection pool monitoring infrastructure
-- Author: Database Performance Team
-- Date: 2025-06-26

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_si004_leak_unresolved;
DROP INDEX IF EXISTS idx_si004_leak_pool_age;
DROP INDEX IF EXISTS idx_si004_alerts_unack;
DROP INDEX IF EXISTS idx_si004_alerts_pool_severity;
DROP INDEX IF EXISTS idx_si004_metrics_threshold;
DROP INDEX IF EXISTS idx_si004_metrics_pool_type;
DROP INDEX IF EXISTS idx_connection_leak_detection_unresolved;
DROP INDEX IF EXISTS idx_connection_leak_detection_pool;
DROP INDEX IF EXISTS idx_connection_pool_alerts_unresolved;
DROP INDEX IF EXISTS idx_connection_pool_alerts_type;
DROP INDEX IF EXISTS idx_connection_pool_alerts_pool;
DROP INDEX IF EXISTS idx_connection_pool_metrics_state;
DROP INDEX IF EXISTS idx_connection_pool_metrics_recorded;
DROP INDEX IF EXISTS idx_connection_pool_metrics_pool;

-- Drop tables
DROP TABLE IF EXISTS si004_connection_leak_detection;
DROP TABLE IF EXISTS si004_connection_pool_alerts;
DROP TABLE IF EXISTS si004_connection_pool_metrics;
DROP TABLE IF EXISTS connection_leak_detection;
DROP TABLE IF EXISTS connection_pool_alerts;
DROP TABLE IF EXISTS connection_pool_metrics;

COMMIT;
