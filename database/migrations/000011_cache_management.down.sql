-- Rollback Cache Management Schema

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_cache_lifecycle ON cache_entries;

-- Drop indexes
DROP INDEX IF EXISTS idx_cache_configurations_cache_name;
DROP INDEX IF EXISTS idx_cache_configurations_cache_type;
DROP INDEX IF EXISTS idx_cache_configurations_active;
DROP INDEX IF EXISTS idx_cache_configurations_service_name;
DROP INDEX IF EXISTS idx_cache_configurations_environment;
DROP INDEX IF EXISTS idx_cache_configurations_created_by;
DROP INDEX IF EXISTS idx_cache_configurations_eviction_policy_gin;
DROP INDEX IF EXISTS idx_cache_configurations_connection_config_gin;

DROP INDEX IF EXISTS idx_cache_entries_cache_configuration_id;
DROP INDEX IF EXISTS idx_cache_entries_cache_key;
DROP INDEX IF EXISTS idx_cache_entries_expires_at;
DROP INDEX IF EXISTS idx_cache_entries_status;
DROP INDEX IF EXISTS idx_cache_entries_last_accessed_at;
DROP INDEX IF EXISTS idx_cache_entries_campaign_id;
DROP INDEX IF EXISTS idx_cache_entries_user_id;
DROP INDEX IF EXISTS idx_cache_entries_locked;
DROP INDEX IF EXISTS idx_cache_entries_size_bytes;
DROP INDEX IF EXISTS idx_cache_entries_access_count;
DROP INDEX IF EXISTS idx_cache_entries_config_status;
DROP INDEX IF EXISTS idx_cache_entries_config_key_status;
DROP INDEX IF EXISTS idx_cache_entries_expired;
DROP INDEX IF EXISTS idx_cache_entries_lru_eviction;
DROP INDEX IF EXISTS idx_cache_entries_dependency_keys_gin;
DROP INDEX IF EXISTS idx_cache_entries_invalidation_tags_gin;
DROP INDEX IF EXISTS idx_cache_entries_lookup;
DROP INDEX IF EXISTS idx_cache_entries_expiration;

DROP INDEX IF EXISTS idx_cache_invalidation_log_cache_configuration_id;
DROP INDEX IF EXISTS idx_cache_invalidation_log_invalidation_type;
DROP INDEX IF EXISTS idx_cache_invalidation_log_invalidated_at;
DROP INDEX IF EXISTS idx_cache_invalidation_log_triggered_by;
DROP INDEX IF EXISTS idx_cache_invalidation_log_automatic;
DROP INDEX IF EXISTS idx_cache_invalidation_log_success;
DROP INDEX IF EXISTS idx_cache_invalidation_log_campaign_id;
DROP INDEX IF EXISTS idx_cache_invalidation_log_keys_invalidated_gin;
DROP INDEX IF EXISTS idx_cache_invalidation_log_tags_used_gin;

DROP INDEX IF EXISTS idx_cache_invalidations_cache_configuration_id;
DROP INDEX IF EXISTS idx_cache_invalidations_invalidation_type;
DROP INDEX IF EXISTS idx_cache_invalidations_status;
DROP INDEX IF EXISTS idx_cache_invalidations_scheduled_for;
DROP INDEX IF EXISTS idx_cache_invalidations_priority;
DROP INDEX IF EXISTS idx_cache_invalidations_requested_by;
DROP INDEX IF EXISTS idx_cache_invalidations_campaign_id;
DROP INDEX IF EXISTS idx_cache_invalidations_depends_on;
DROP INDEX IF EXISTS idx_cache_invalidations_pending;
DROP INDEX IF EXISTS idx_cache_invalidations_processing;
DROP INDEX IF EXISTS idx_cache_invalidations_tags_gin;

DROP INDEX IF EXISTS idx_cache_metrics_cache_configuration_id;
DROP INDEX IF EXISTS idx_cache_metrics_period_start;
DROP INDEX IF EXISTS idx_cache_metrics_period_end;
DROP INDEX IF EXISTS idx_cache_metrics_recorded_at;
DROP INDEX IF EXISTS idx_cache_metrics_hit_ratio;
DROP INDEX IF EXISTS idx_cache_metrics_service_name;
DROP INDEX IF EXISTS idx_cache_metrics_environment;
DROP INDEX IF EXISTS idx_cache_metrics_config_period;
DROP INDEX IF EXISTS idx_cache_metrics_performance;
DROP INDEX IF EXISTS idx_cache_metrics_analysis;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS cache_metrics;
DROP TABLE IF EXISTS cache_invalidations;
DROP TABLE IF EXISTS cache_invalidation_log;
DROP TABLE IF EXISTS cache_entries;
DROP TABLE IF EXISTS cache_configurations;

-- Drop enums
DROP TYPE IF EXISTS cache_entry_status_enum;
DROP TYPE IF EXISTS cache_invalidation_type_enum;
DROP TYPE IF EXISTS cache_strategy_enum;
DROP TYPE IF EXISTS cache_type_enum;