-- Rollback Phase 2C - PF004: Caching Implementation
-- Description: Remove caching infrastructure
-- Author: Database Performance Team
-- Date: 2025-06-26

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_cache_optimization_priority;
DROP INDEX IF EXISTS idx_cache_optimization_pending;
DROP INDEX IF EXISTS idx_cache_optimization_cache;
DROP INDEX IF EXISTS idx_cache_analytics_window;
DROP INDEX IF EXISTS idx_cache_analytics_hit_ratio;
DROP INDEX IF EXISTS idx_cache_analytics_cache_endpoint;
DROP INDEX IF EXISTS idx_cache_invalidation_log_invalidated;
DROP INDEX IF EXISTS idx_cache_invalidation_log_key;
DROP INDEX IF EXISTS idx_cache_invalidation_log_cache;
DROP INDEX IF EXISTS idx_cache_invalidations_created;
DROP INDEX IF EXISTS idx_cache_invalidations_type;
DROP INDEX IF EXISTS idx_cache_invalidations_cache;
DROP INDEX IF EXISTS idx_cache_metrics_value;
DROP INDEX IF EXISTS idx_cache_metrics_recorded;
DROP INDEX IF EXISTS idx_cache_metrics_cache_type;
DROP INDEX IF EXISTS idx_cache_entries_size;
DROP INDEX IF EXISTS idx_cache_entries_hit_count;
DROP INDEX IF EXISTS idx_cache_entries_expires;
DROP INDEX IF EXISTS idx_cache_entries_cache_key;
DROP INDEX IF EXISTS idx_cache_configurations_type;
DROP INDEX IF EXISTS idx_cache_configurations_status;
DROP INDEX IF EXISTS idx_cache_configurations_name;

-- Drop tables
DROP TABLE IF EXISTS cache_optimization_recommendations;
DROP TABLE IF EXISTS cache_analytics;
DROP TABLE IF EXISTS cache_invalidation_log;
DROP TABLE IF EXISTS cache_invalidations;
DROP TABLE IF EXISTS cache_metrics;
DROP TABLE IF EXISTS cache_entries;
DROP TABLE IF EXISTS cache_configurations;

COMMIT;
