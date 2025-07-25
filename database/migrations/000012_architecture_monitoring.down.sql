-- Rollback Architecture Monitoring Schema

-- Drop indexes
DROP INDEX IF EXISTS idx_service_architecture_metrics_service_name;
DROP INDEX IF EXISTS idx_service_architecture_metrics_service_type;
DROP INDEX IF EXISTS idx_service_architecture_metrics_measurement_timestamp;
DROP INDEX IF EXISTS idx_service_architecture_metrics_environment;
DROP INDEX IF EXISTS idx_service_architecture_metrics_health_score;
DROP INDEX IF EXISTS idx_service_architecture_metrics_availability_percent;
DROP INDEX IF EXISTS idx_service_architecture_metrics_campaign_id;
DROP INDEX IF EXISTS idx_service_architecture_metrics_alert_threshold_breached;
DROP INDEX IF EXISTS idx_service_architecture_metrics_service_time;
DROP INDEX IF EXISTS idx_service_architecture_metrics_env_health;

DROP INDEX IF EXISTS idx_service_dependencies_source_service;
DROP INDEX IF EXISTS idx_service_dependencies_target_service;
DROP INDEX IF EXISTS idx_service_dependencies_dependency_type;
DROP INDEX IF EXISTS idx_service_dependencies_is_critical;
DROP INDEX IF EXISTS idx_service_dependencies_health_status;
DROP INDEX IF EXISTS idx_service_dependencies_environment;
DROP INDEX IF EXISTS idx_service_dependencies_active;
DROP INDEX IF EXISTS idx_service_dependencies_campaign_id;
DROP INDEX IF EXISTS idx_service_dependencies_source_target;
DROP INDEX IF EXISTS idx_service_dependencies_critical_unhealthy;

DROP INDEX IF EXISTS idx_architecture_refactor_log_refactor_type;
DROP INDEX IF EXISTS idx_architecture_refactor_log_status;
DROP INDEX IF EXISTS idx_architecture_refactor_log_risk_level;
DROP INDEX IF EXISTS idx_architecture_refactor_log_initiated_by;
DROP INDEX IF EXISTS idx_architecture_refactor_log_approved_by;
DROP INDEX IF EXISTS idx_architecture_refactor_log_created_at;
DROP INDEX IF EXISTS idx_architecture_refactor_log_campaign_id;
DROP INDEX IF EXISTS idx_architecture_refactor_log_services_affected_gin;
DROP INDEX IF EXISTS idx_architecture_refactor_log_dependencies_changed_gin;

DROP INDEX IF EXISTS idx_communication_patterns_source_service;
DROP INDEX IF EXISTS idx_communication_patterns_target_service;
DROP INDEX IF EXISTS idx_communication_patterns_protocol;
DROP INDEX IF EXISTS idx_communication_patterns_environment;
DROP INDEX IF EXISTS idx_communication_patterns_last_observed;
DROP INDEX IF EXISTS idx_communication_patterns_success_rate_percent;
DROP INDEX IF EXISTS idx_communication_patterns_campaign_id;
DROP INDEX IF EXISTS idx_communication_patterns_source_target;
DROP INDEX IF EXISTS idx_communication_patterns_low_success_rate;

DROP INDEX IF EXISTS idx_service_capacity_metrics_service_name;
DROP INDEX IF EXISTS idx_service_capacity_metrics_service_type;
DROP INDEX IF EXISTS idx_service_capacity_metrics_measurement_timestamp;
DROP INDEX IF EXISTS idx_service_capacity_metrics_environment;
DROP INDEX IF EXISTS idx_service_capacity_metrics_capacity_alert_triggered;
DROP INDEX IF EXISTS idx_service_capacity_metrics_scale_up_triggered;
DROP INDEX IF EXISTS idx_service_capacity_metrics_performance_degraded;
DROP INDEX IF EXISTS idx_service_capacity_metrics_campaign_id;
DROP INDEX IF EXISTS idx_service_capacity_metrics_service_time;
DROP INDEX IF EXISTS idx_service_capacity_metrics_high_utilization;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS service_capacity_metrics;
DROP TABLE IF EXISTS communication_patterns;
DROP TABLE IF EXISTS architecture_refactor_log;
DROP TABLE IF EXISTS service_dependencies;
DROP TABLE IF EXISTS service_architecture_metrics;

-- Drop enums
DROP TYPE IF EXISTS refactor_type_enum;
DROP TYPE IF EXISTS communication_protocol_enum;
DROP TYPE IF EXISTS dependency_type_enum;
DROP TYPE IF EXISTS service_type_enum;