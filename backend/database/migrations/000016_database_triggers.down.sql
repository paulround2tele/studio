-- Rollback Database Triggers

-- Drop all triggers
DROP TRIGGER IF EXISTS trigger_audit_users ON users;
DROP TRIGGER IF EXISTS trigger_audit_campaigns ON lead_generation_campaigns;
DROP TRIGGER IF EXISTS trigger_audit_domains ON generated_domains;
DROP TRIGGER IF EXISTS trigger_audit_jobs ON campaign_jobs;
DROP TRIGGER IF EXISTS trigger_audit_personas ON personas;
DROP TRIGGER IF EXISTS trigger_audit_proxies ON proxies;

DROP TRIGGER IF EXISTS trigger_timestamp_campaigns ON lead_generation_campaigns;
DROP TRIGGER IF EXISTS trigger_timestamp_domains ON generated_domains;
DROP TRIGGER IF EXISTS trigger_timestamp_jobs ON campaign_jobs;
DROP TRIGGER IF EXISTS trigger_timestamp_users ON users;

DROP TRIGGER IF EXISTS trigger_campaign_transitions ON lead_generation_campaigns;
DROP TRIGGER IF EXISTS trigger_domain_validation ON generated_domains;
DROP TRIGGER IF EXISTS trigger_job_status ON campaign_jobs;
DROP TRIGGER IF EXISTS trigger_session_management ON user_sessions;
DROP TRIGGER IF EXISTS trigger_cache_lifecycle ON cache_entries;
DROP TRIGGER IF EXISTS trigger_event_sequence ON event_store;
DROP TRIGGER IF EXISTS trigger_proxy_membership_consistency ON proxy_pool_memberships;

-- Drop all trigger functions
DROP FUNCTION IF EXISTS trigger_audit_log();
DROP FUNCTION IF EXISTS trigger_update_timestamp();
DROP FUNCTION IF EXISTS trigger_campaign_state_transition();
DROP FUNCTION IF EXISTS trigger_domain_validation_update();
DROP FUNCTION IF EXISTS trigger_job_status_update();
DROP FUNCTION IF EXISTS trigger_user_session_management();
DROP FUNCTION IF EXISTS trigger_cache_entry_lifecycle();
DROP FUNCTION IF EXISTS trigger_event_store_sequence();
DROP FUNCTION IF EXISTS trigger_proxy_pool_consistency();

-- Drop management functions
DROP FUNCTION IF EXISTS manage_triggers(VARCHAR, VARCHAR);

-- Drop monitoring view
DROP VIEW IF EXISTS trigger_monitoring;

-- Drop performance analysis function
DROP FUNCTION IF EXISTS analyze_trigger_performance();