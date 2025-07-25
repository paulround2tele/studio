-- Comprehensive Performance Indexes
-- Strategic indexes for high-performance queries across the entire schema

-- =============================================
-- CAMPAIGN MANAGEMENT PERFORMANCE INDEXES
-- =============================================

-- Campaign dashboard and listing queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_dashboard_active ON lead_generation_campaigns(phase_status, created_at DESC) WHERE phase_status IN ('in_progress', 'ready');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_user_recent ON lead_generation_campaigns(user_id, created_at DESC, phase_status) WHERE phase_status IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_phase_status ON lead_generation_campaigns(current_phase, phase_status, updated_at DESC);

-- Campaign progress and analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_progress_tracking ON lead_generation_campaigns(id, current_phase, phase_status, total_items, processed_items);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_completion_analytics ON lead_generation_campaigns(phase_status, completed_at, created_at) WHERE completed_at IS NOT NULL;

-- Campaign filtering and search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_name_search ON lead_generation_campaigns USING GIN(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_business_status ON lead_generation_campaigns(business_status, created_at DESC) WHERE business_status IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_progress_percentage ON lead_generation_campaigns(progress_percentage DESC, phase_status, created_at DESC) WHERE progress_percentage IS NOT NULL;

-- =============================================
-- DOMAIN GENERATION AND VALIDATION INDEXES
-- =============================================

-- Domain pagination and listing (high-volume operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_campaign_pagination ON generated_domains(campaign_id, created_at DESC, id) INCLUDE (domain_name, dns_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_validation_status_pagination ON generated_domains(dns_status, created_at DESC, id) INCLUDE (domain_name, campaign_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_cursor_pagination ON generated_domains(id, created_at) WHERE dns_status IS NOT NULL;

-- Domain validation lookup optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_validation_lookup ON generated_domains(domain_name, dns_status) INCLUDE (http_status, lead_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_dns_validation_pending ON generated_domains(campaign_id, dns_status, generated_at) WHERE dns_status = 'pending';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_http_validation_pending ON generated_domains(campaign_id, http_status, generated_at) WHERE http_status = 'pending';

-- Domain analytics and reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_campaign_analytics ON generated_domains(campaign_id, dns_status, http_status, lead_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_failure_analysis ON generated_domains(lead_status, dns_status, generated_at DESC) WHERE lead_status = 'error';

-- =============================================
-- JOB QUEUE OPTIMIZATION INDEXES
-- =============================================

-- Job processing queue optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_processing_queue ON campaign_jobs(status, scheduled_at, created_at) WHERE status IN ('pending', 'queued');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_retry_queue ON campaign_jobs(status, attempts, next_execution_at) WHERE status = 'failed' AND attempts > 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_worker_assignment ON campaign_jobs(status, job_type, processing_server_id, last_attempted_at) WHERE status = 'running';

-- Job monitoring and analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_campaign_status ON campaign_jobs(campaign_id, status, job_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_performance_analysis ON campaign_jobs(job_type, status, attempts, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_failure_analysis ON campaign_jobs(status, last_error, attempts, created_at DESC) WHERE status = 'failed';

-- Job cleanup and maintenance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_cleanup_completed ON campaign_jobs(status, updated_at) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_stale_running ON campaign_jobs(status, last_attempted_at) WHERE status = 'running';

-- =============================================
-- USER SESSION AND AUTHENTICATION INDEXES
-- =============================================

-- Session lookup and validation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_token_lookup ON sessions(id) INCLUDE (user_id, expires_at, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active, created_at DESC) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_cleanup_expired ON sessions(expires_at, is_active) WHERE is_active = TRUE;

-- Rate limiting and security
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_enforcement ON rate_limits(identifier, action, blocked_until) WHERE blocked_until IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_audit_security ON auth_audit_logs(user_id, event_type, created_at DESC, ip_address) WHERE event_type IN ('login_failed', 'suspicious_activity');

-- =============================================
-- PROXY AND PERSONA INFRASTRUCTURE INDEXES
-- =============================================

-- Proxy assignment and availability
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proxies_availability ON proxies(status, last_checked_at, is_healthy) WHERE status = 'Active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proxies_pool_assignment ON proxy_pool_memberships(pool_id, proxy_id, is_active) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proxies_campaign_usage ON proxies(id, status) INCLUDE (host, port, last_checked_at);

-- Persona assignment optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personas_availability ON personas(status, last_tested) WHERE status = 'Active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personas_campaign_assignment ON personas(id, status, persona_type) INCLUDE (name, last_tested);

-- =============================================
-- KEYWORD AND HTTP VALIDATION INDEXES
-- =============================================

-- Keyword set management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_sets_enabled ON keyword_sets(is_enabled, created_at DESC) WHERE is_enabled = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_set ON keyword_rules(keyword_set_id, rule_type, created_at DESC);

-- HTTP validation results
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_results_campaign ON http_keyword_results(http_keyword_campaign_id, domain_name, validation_status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_results_domain_lookup ON http_keyword_results(domain_name, validation_status) INCLUDE (http_status_code, created_at);

-- =============================================
-- AUDIT AND LOGGING PERFORMANCE INDEXES
-- =============================================

-- Audit log queries and compliance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_timeline ON audit_logs(user_id, timestamp DESC, action) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_campaign_timeline ON audit_logs(entity_id, timestamp DESC, action) WHERE entity_type = 'campaign';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_compliance ON audit_logs(timestamp, action, user_id);

-- Security event monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_monitoring ON security_events(event_type, event_timestamp DESC, severity) WHERE threat_detected = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_ip_tracking ON security_events(ip_address, event_timestamp DESC, event_type);

-- =============================================
-- PERFORMANCE MONITORING INDEXES
-- =============================================

-- Query performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_trending ON query_performance_metrics(service_name, executed_at DESC, execution_time_ms);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_slow_queries ON query_performance_metrics(execution_time_ms DESC, executed_at DESC) WHERE execution_time_ms > 1000;

-- Resource utilization monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_alerts ON resource_utilization_metrics(service_name, utilization_pct DESC, recorded_at DESC) WHERE utilization_pct > 80;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_monitoring ON connection_pool_metrics(pool_utilization_percent DESC, recorded_at DESC) WHERE pool_utilization_percent > 80;

-- =============================================
-- CACHE MANAGEMENT PERFORMANCE INDEXES
-- =============================================

-- Cache entry lookup and management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_entries_lookup ON cache_entries(cache_configuration_id, cache_key) INCLUDE (cache_value, expires_at, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_entries_expiration ON cache_entries(expires_at, status) WHERE status = 'active' AND expires_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_entries_lru_eviction ON cache_entries(cache_configuration_id, last_accessed_at, status) WHERE status = 'active';

-- Cache invalidation processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_invalidations_processing ON cache_invalidations(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_metrics_analysis ON cache_metrics(cache_configuration_id, period_end DESC, hit_ratio);

-- =============================================
-- EVENT SOURCING PERFORMANCE INDEXES
-- =============================================

-- Event store streaming and replay
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_streaming ON event_store(aggregate_type, sequence_number) WHERE processing_status = 'processed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_projection_rebuild ON event_store(event_type, sequence_number) INCLUDE (aggregate_id, event_data);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_correlation_tracking ON event_store(correlation_id, sequence_number) WHERE correlation_id IS NOT NULL;

-- Event projection management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_projections_lag_monitoring ON event_projections(status, processing_lag_ms DESC) WHERE status = 'current' AND processing_lag_ms > 1000;

-- =============================================
-- CROSS-TABLE JOIN OPTIMIZATION INDEXES
-- =============================================

-- Campaign-Domain joins (most frequent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_domains_join ON generated_domains(campaign_id) INCLUDE (id, domain_name, dns_status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_campaign_status_join ON lead_generation_campaigns(id) INCLUDE (phase_status, current_phase, name, user_id);

-- Campaign-Job joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_join ON campaign_jobs(campaign_id) INCLUDE (id, job_type, status, created_at, attempts);

-- User-Campaign joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_campaigns_join ON lead_generation_campaigns(user_id) INCLUDE (id, name, phase_status, created_at, current_phase);

-- Campaign-Audit joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_audit_join ON audit_logs(entity_id, entity_type) INCLUDE (user_id, action, timestamp) WHERE entity_type = 'campaign';

-- =============================================
-- PAGINATION OPTIMIZATION INDEXES
-- =============================================

-- Cursor-based pagination for large tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_cursor_forward ON generated_domains(created_at, id) WHERE dns_status IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_cursor_forward ON campaign_jobs(created_at, id) WHERE status != 'cancelled';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_cursor_forward ON audit_logs(timestamp, id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_cursor_forward ON event_store(sequence_number, event_id) WHERE processing_status = 'processed';

-- Offset pagination fallback (for compatibility)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_offset_pagination ON lead_generation_campaigns(created_at DESC, id) WHERE phase_status IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_offset_pagination ON users(created_at DESC, id) WHERE is_active = TRUE;

-- =============================================
-- ANALYTICS AND REPORTING INDEXES
-- =============================================

-- Campaign success rate analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_success_analytics ON lead_generation_campaigns(phase_status, created_at, completed_at) INCLUDE (total_items, processed_items);

-- Domain validation success rates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_validation_analytics ON generated_domains(campaign_id, dns_status) INCLUDE (http_status, lead_status, created_at);

-- Job performance analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_performance_analytics ON campaign_jobs(job_type, status, created_at) INCLUDE (attempts, last_attempted_at);

-- User activity analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_analytics ON audit_logs(user_id, timestamp) INCLUDE (action, entity_type) WHERE user_id IS NOT NULL;

-- =============================================
-- MAINTENANCE AND CLEANUP INDEXES
-- =============================================

-- Data retention and cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expired_sessions_cleanup ON sessions(expires_at) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_old_audit_logs_cleanup ON audit_logs(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_completed_jobs_cleanup ON campaign_jobs(status, updated_at) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expired_cache_cleanup ON cache_entries(expires_at, status) WHERE status = 'active';

-- Archive and maintenance operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_archival_candidates ON event_store(archived, event_timestamp) WHERE archived = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compaction_candidates ON event_store(compacted, aggregate_id, sequence_number) WHERE compacted = FALSE;

-- =============================================
-- REAL-TIME MONITORING INDEXES
-- =============================================

-- Live dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_campaign_stats ON lead_generation_campaigns(phase_status, updated_at DESC) WHERE phase_status IN ('in_progress', 'ready');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_job_queue_stats ON campaign_jobs(status, created_at DESC) WHERE status IN ('pending', 'running');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_domain_stats ON generated_domains(dns_status, created_at DESC);

-- System health monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_health_monitoring ON resource_utilization_metrics(service_name, recorded_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_rate_monitoring ON campaign_jobs(status, created_at DESC) WHERE status = 'failed';