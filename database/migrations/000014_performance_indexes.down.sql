-- Rollback Performance Indexes

-- Campaign Management Performance Indexes
DROP INDEX IF EXISTS idx_campaigns_dashboard_active;
DROP INDEX IF EXISTS idx_campaigns_user_recent;
DROP INDEX IF EXISTS idx_campaigns_phase_status;
DROP INDEX IF EXISTS idx_campaigns_progress_tracking;
DROP INDEX IF EXISTS idx_campaigns_completion_analytics;
DROP INDEX IF EXISTS idx_campaigns_name_search;
DROP INDEX IF EXISTS idx_campaigns_tags_filter;
DROP INDEX IF EXISTS idx_campaigns_priority_status;

-- Domain Generation and Validation Indexes
DROP INDEX IF EXISTS idx_domains_campaign_pagination;
DROP INDEX IF EXISTS idx_domains_validation_status_pagination;
DROP INDEX IF EXISTS idx_domains_cursor_pagination;
DROP INDEX IF EXISTS idx_domains_validation_lookup;
DROP INDEX IF EXISTS idx_domains_dns_validation_pending;
DROP INDEX IF EXISTS idx_domains_http_validation_pending;
DROP INDEX IF EXISTS idx_domains_campaign_analytics;
DROP INDEX IF EXISTS idx_domains_failure_analysis;

-- Job Queue Optimization Indexes
DROP INDEX IF EXISTS idx_jobs_processing_queue;
DROP INDEX IF EXISTS idx_jobs_retry_queue;
DROP INDEX IF EXISTS idx_jobs_worker_assignment;
DROP INDEX IF EXISTS idx_jobs_campaign_status;
DROP INDEX IF EXISTS idx_jobs_performance_analysis;
DROP INDEX IF EXISTS idx_jobs_failure_analysis;
DROP INDEX IF EXISTS idx_jobs_cleanup_completed;
DROP INDEX IF EXISTS idx_jobs_stale_running;

-- User Session and Authentication Indexes
DROP INDEX IF EXISTS idx_sessions_token_lookup;
DROP INDEX IF EXISTS idx_sessions_user_active;
DROP INDEX IF EXISTS idx_sessions_cleanup_expired;
DROP INDEX IF EXISTS idx_rate_limits_enforcement;
DROP INDEX IF EXISTS idx_auth_audit_security;

-- Proxy and Persona Infrastructure Indexes
DROP INDEX IF EXISTS idx_proxies_availability;
DROP INDEX IF EXISTS idx_proxies_pool_assignment;
DROP INDEX IF EXISTS idx_proxies_campaign_usage;
DROP INDEX IF EXISTS idx_personas_availability;
DROP INDEX IF EXISTS idx_personas_campaign_assignment;

-- Keyword and HTTP Validation Indexes
DROP INDEX IF EXISTS idx_keyword_sets_campaign;
DROP INDEX IF EXISTS idx_keyword_rules_set;
DROP INDEX IF EXISTS idx_http_results_campaign;
DROP INDEX IF EXISTS idx_http_results_domain_lookup;

-- Audit and Logging Performance Indexes
DROP INDEX IF EXISTS idx_audit_logs_user_timeline;
DROP INDEX IF EXISTS idx_audit_logs_campaign_timeline;
DROP INDEX IF EXISTS idx_audit_logs_compliance;
DROP INDEX IF EXISTS idx_security_events_monitoring;
DROP INDEX IF EXISTS idx_security_events_ip_tracking;

-- Performance Monitoring Indexes
DROP INDEX IF EXISTS idx_query_performance_trending;
DROP INDEX IF EXISTS idx_query_performance_slow_queries;
DROP INDEX IF EXISTS idx_resource_utilization_alerts;
DROP INDEX IF EXISTS idx_connection_pool_monitoring;

-- Cache Management Performance Indexes
DROP INDEX IF EXISTS idx_cache_entries_lookup;
DROP INDEX IF EXISTS idx_cache_entries_expiration;
DROP INDEX IF EXISTS idx_cache_entries_lru_eviction;
DROP INDEX IF EXISTS idx_cache_invalidations_processing;
DROP INDEX IF EXISTS idx_cache_metrics_analysis;

-- Event Sourcing Performance Indexes
DROP INDEX IF EXISTS idx_event_store_streaming;
DROP INDEX IF EXISTS idx_event_store_projection_rebuild;
DROP INDEX IF EXISTS idx_event_store_correlation_tracking;
DROP INDEX IF EXISTS idx_event_projections_lag_monitoring;

-- Cross-table Join Optimization Indexes
DROP INDEX IF EXISTS idx_campaign_domains_join;
DROP INDEX IF EXISTS idx_domain_campaign_status_join;
DROP INDEX IF EXISTS idx_campaign_jobs_join;
DROP INDEX IF EXISTS idx_user_campaigns_join;
DROP INDEX IF EXISTS idx_campaign_audit_join;

-- Pagination Optimization Indexes
DROP INDEX IF EXISTS idx_domains_cursor_forward;
DROP INDEX IF EXISTS idx_jobs_cursor_forward;
DROP INDEX IF EXISTS idx_audit_cursor_forward;
DROP INDEX IF EXISTS idx_events_cursor_forward;
DROP INDEX IF EXISTS idx_campaigns_offset_pagination;
DROP INDEX IF EXISTS idx_users_offset_pagination;

-- Analytics and Reporting Indexes
DROP INDEX IF EXISTS idx_campaigns_success_analytics;
DROP INDEX IF EXISTS idx_domains_validation_analytics;
DROP INDEX IF EXISTS idx_jobs_performance_analytics;
DROP INDEX IF EXISTS idx_user_activity_analytics;

-- Maintenance and Cleanup Indexes
DROP INDEX IF EXISTS idx_expired_sessions_cleanup;
DROP INDEX IF EXISTS idx_old_audit_logs_cleanup;
DROP INDEX IF EXISTS idx_completed_jobs_cleanup;
DROP INDEX IF EXISTS idx_expired_cache_cleanup;
DROP INDEX IF EXISTS idx_archival_candidates;
DROP INDEX IF EXISTS idx_compaction_candidates;

-- Real-time Monitoring Indexes
DROP INDEX IF EXISTS idx_live_campaign_stats;
DROP INDEX IF EXISTS idx_live_job_queue_stats;
DROP INDEX IF EXISTS idx_live_domain_stats;
DROP INDEX IF EXISTS idx_system_health_monitoring;
DROP INDEX IF EXISTS idx_error_rate_monitoring;