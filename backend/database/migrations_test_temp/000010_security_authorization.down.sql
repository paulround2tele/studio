-- Rollback Security and Authorization Schema

-- Drop indexes
DROP INDEX IF EXISTS idx_security_events_event_type;
DROP INDEX IF EXISTS idx_security_events_user_id;
DROP INDEX IF EXISTS idx_security_events_session_id;
DROP INDEX IF EXISTS idx_security_events_event_timestamp;
DROP INDEX IF EXISTS idx_security_events_ip_address;
DROP INDEX IF EXISTS idx_security_events_severity;
DROP INDEX IF EXISTS idx_security_events_threat_detected;
DROP INDEX IF EXISTS idx_security_events_campaign_id;
DROP INDEX IF EXISTS idx_security_events_resource_type;
DROP INDEX IF EXISTS idx_security_events_investigated;
DROP INDEX IF EXISTS idx_security_events_resolved;
DROP INDEX IF EXISTS idx_security_events_compliance_relevant;
DROP INDEX IF EXISTS idx_security_events_archived;
DROP INDEX IF EXISTS idx_security_events_user_type_time;
DROP INDEX IF EXISTS idx_security_events_ip_type_time;
DROP INDEX IF EXISTS idx_security_events_severity_time;
DROP INDEX IF EXISTS idx_security_events_threat_time;
DROP INDEX IF EXISTS idx_security_events_additional_data_gin;
DROP INDEX IF EXISTS idx_security_events_response_actions_gin;
DROP INDEX IF EXISTS idx_security_events_monitoring;

DROP INDEX IF EXISTS idx_authorization_decisions_user_id;
DROP INDEX IF EXISTS idx_authorization_decisions_session_id;
DROP INDEX IF EXISTS idx_authorization_decisions_resource_type;
DROP INDEX IF EXISTS idx_authorization_decisions_resource_id;
DROP INDEX IF EXISTS idx_authorization_decisions_decision;
DROP INDEX IF EXISTS idx_authorization_decisions_decision_timestamp;
DROP INDEX IF EXISTS idx_authorization_decisions_campaign_id;
DROP INDEX IF EXISTS idx_authorization_decisions_cache_hit;
DROP INDEX IF EXISTS idx_authorization_decisions_follow_up_required;
DROP INDEX IF EXISTS idx_authorization_decisions_reviewed;
DROP INDEX IF EXISTS idx_authorization_decisions_user_resource;
DROP INDEX IF EXISTS idx_authorization_decisions_denied_access;
DROP INDEX IF EXISTS idx_authorization_decisions_resource_decision;
DROP INDEX IF EXISTS idx_authorization_decisions_conditions_met_gin;
DROP INDEX IF EXISTS idx_authorization_decisions_additional_context_gin;
DROP INDEX IF EXISTS idx_authorization_decisions_risk_factors_gin;
DROP INDEX IF EXISTS idx_authorization_decisions_permissions_checked_gin;
DROP INDEX IF EXISTS idx_authorization_decisions_compliance_tags_gin;

DROP INDEX IF EXISTS idx_campaign_access_grants_campaign_id;
DROP INDEX IF EXISTS idx_campaign_access_grants_user_id;
DROP INDEX IF EXISTS idx_campaign_access_grants_access_type;
DROP INDEX IF EXISTS idx_campaign_access_grants_granted_by;
DROP INDEX IF EXISTS idx_campaign_access_grants_granted_at;
DROP INDEX IF EXISTS idx_campaign_access_grants_expires_at;
DROP INDEX IF EXISTS idx_campaign_access_grants_active;
DROP INDEX IF EXISTS idx_campaign_access_grants_revoked;
DROP INDEX IF EXISTS idx_campaign_access_grants_last_used_at;
DROP INDEX IF EXISTS idx_campaign_access_grants_inherited_from;
DROP INDEX IF EXISTS idx_campaign_access_grants_can_delegate;
DROP INDEX IF EXISTS idx_campaign_access_grants_user_campaign;
DROP INDEX IF EXISTS idx_campaign_access_grants_campaign_type;
DROP INDEX IF EXISTS idx_campaign_access_grants_expiring_soon;
DROP INDEX IF EXISTS idx_campaign_access_grants_phase_restrictions_gin;
DROP INDEX IF EXISTS idx_campaign_access_grants_ip_restrictions_gin;
DROP INDEX IF EXISTS idx_campaign_access_grants_time_restrictions_gin;
DROP INDEX IF EXISTS idx_campaign_access_grants_conditions_gin;
DROP INDEX IF EXISTS idx_campaign_access_grants_access_pattern_gin;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS campaign_access_grants;
DROP TABLE IF EXISTS authorization_decisions;
DROP TABLE IF EXISTS security_events;

-- Drop enums
DROP TYPE IF EXISTS access_grant_type_enum;
DROP TYPE IF EXISTS authorization_resource_type_enum;
DROP TYPE IF EXISTS authorization_decision_enum;
DROP TYPE IF EXISTS security_event_type_enum;