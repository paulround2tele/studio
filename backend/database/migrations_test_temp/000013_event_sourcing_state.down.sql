-- Rollback Event Sourcing and State Schema

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_event_sequence ON event_store;

-- Drop indexes
DROP INDEX IF EXISTS idx_event_store_event_id;
DROP INDEX IF EXISTS idx_event_store_event_type;
DROP INDEX IF EXISTS idx_event_store_aggregate_id;
DROP INDEX IF EXISTS idx_event_store_aggregate_type;
DROP INDEX IF EXISTS idx_event_store_event_timestamp;
DROP INDEX IF EXISTS idx_event_store_sequence_number;
DROP INDEX IF EXISTS idx_event_store_user_id;
DROP INDEX IF EXISTS idx_event_store_session_id;
DROP INDEX IF EXISTS idx_event_store_campaign_id;
DROP INDEX IF EXISTS idx_event_store_campaign_phase;
DROP INDEX IF EXISTS idx_event_store_causation_id;
DROP INDEX IF EXISTS idx_event_store_correlation_id;
DROP INDEX IF EXISTS idx_event_store_parent_event_id;
DROP INDEX IF EXISTS idx_event_store_processing_status;
DROP INDEX IF EXISTS idx_event_store_is_snapshot;
DROP INDEX IF EXISTS idx_event_store_compacted;
DROP INDEX IF EXISTS idx_event_store_archived;
DROP INDEX IF EXISTS idx_event_store_partition_key;
DROP INDEX IF EXISTS idx_event_store_retry_after;
DROP INDEX IF EXISTS idx_event_store_aggregate_version;
DROP INDEX IF EXISTS idx_event_store_aggregate_sequence;
DROP INDEX IF EXISTS idx_event_store_type_timestamp;
DROP INDEX IF EXISTS idx_event_store_campaign_type_timestamp;
DROP INDEX IF EXISTS idx_event_store_processing_pending;
DROP INDEX IF EXISTS idx_event_store_user_timestamp;
DROP INDEX IF EXISTS idx_event_store_event_data_gin;
DROP INDEX IF EXISTS idx_event_store_event_metadata_gin;
DROP INDEX IF EXISTS idx_event_store_streaming;
DROP INDEX IF EXISTS idx_event_store_projection_rebuild;
DROP INDEX IF EXISTS idx_event_store_correlation_tracking;

DROP INDEX IF EXISTS idx_event_projections_projection_name;
DROP INDEX IF EXISTS idx_event_projections_projection_type;
DROP INDEX IF EXISTS idx_event_projections_status;
DROP INDEX IF EXISTS idx_event_projections_current_position;
DROP INDEX IF EXISTS idx_event_projections_last_processed_event_id;
DROP INDEX IF EXISTS idx_event_projections_created_by;
DROP INDEX IF EXISTS idx_event_projections_campaign_id;
DROP INDEX IF EXISTS idx_event_projections_campaign_specific;
DROP INDEX IF EXISTS idx_event_projections_monitoring_enabled;
DROP INDEX IF EXISTS idx_event_projections_status_position;
DROP INDEX IF EXISTS idx_event_projections_lag_monitoring;
DROP INDEX IF EXISTS idx_event_projections_event_filters_gin;
DROP INDEX IF EXISTS idx_event_projections_dependencies_gin;

DROP INDEX IF EXISTS idx_config_locks_lock_name;
DROP INDEX IF EXISTS idx_config_locks_lock_type;
DROP INDEX IF EXISTS idx_config_locks_locked_by;
DROP INDEX IF EXISTS idx_config_locks_locked_at;
DROP INDEX IF EXISTS idx_config_locks_expires_at;
DROP INDEX IF EXISTS idx_config_locks_session_id;
DROP INDEX IF EXISTS idx_config_locks_resource_type;
DROP INDEX IF EXISTS idx_config_locks_resource_id;
DROP INDEX IF EXISTS idx_config_locks_parent_lock_id;
DROP INDEX IF EXISTS idx_config_locks_active;
DROP INDEX IF EXISTS idx_config_locks_campaign_id;
DROP INDEX IF EXISTS idx_config_locks_auto_renewal_enabled;
DROP INDEX IF EXISTS idx_config_locks_last_heartbeat;
DROP INDEX IF EXISTS idx_config_locks_resource_active;
DROP INDEX IF EXISTS idx_config_locks_expiring_soon;
DROP INDEX IF EXISTS idx_config_locks_stale_heartbeat;

DROP INDEX IF EXISTS idx_config_versions_config_key;
DROP INDEX IF EXISTS idx_config_versions_version_number;
DROP INDEX IF EXISTS idx_config_versions_created_at;
DROP INDEX IF EXISTS idx_config_versions_created_by;
DROP INDEX IF EXISTS idx_config_versions_is_current;
DROP INDEX IF EXISTS idx_config_versions_is_active;
DROP INDEX IF EXISTS idx_config_versions_change_type;
DROP INDEX IF EXISTS idx_config_versions_validation_status;
DROP INDEX IF EXISTS idx_config_versions_deployed;
DROP INDEX IF EXISTS idx_config_versions_deployed_by;
DROP INDEX IF EXISTS idx_config_versions_deployment_environment;
DROP INDEX IF EXISTS idx_config_versions_rollback_version;
DROP INDEX IF EXISTS idx_config_versions_can_rollback;
DROP INDEX IF EXISTS idx_config_versions_affects_campaigns;
DROP INDEX IF EXISTS idx_config_versions_campaign_id;
DROP INDEX IF EXISTS idx_config_versions_approval_required;
DROP INDEX IF EXISTS idx_config_versions_approved;
DROP INDEX IF EXISTS idx_config_versions_approved_by;
DROP INDEX IF EXISTS idx_config_versions_key_version;
DROP INDEX IF EXISTS idx_config_versions_key_current;
DROP INDEX IF EXISTS idx_config_versions_pending_approval;
DROP INDEX IF EXISTS idx_config_versions_pending_deployment;
DROP INDEX IF EXISTS idx_config_versions_config_value_gin;
DROP INDEX IF EXISTS idx_config_versions_validation_errors_gin;
DROP INDEX IF EXISTS idx_config_versions_rollback_metadata_gin;
DROP INDEX IF EXISTS idx_config_versions_affected_services_gin;
DROP INDEX IF EXISTS idx_config_versions_dependency_configs_gin;
DROP INDEX IF EXISTS idx_config_versions_audit_trail_gin;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS config_versions;
DROP TABLE IF EXISTS config_locks;
DROP TABLE IF EXISTS event_projections;
DROP TABLE IF EXISTS event_store;

-- Drop enums
DROP TYPE IF EXISTS config_lock_type_enum;
DROP TYPE IF EXISTS projection_status_enum;
DROP TYPE IF EXISTS event_type_enum;