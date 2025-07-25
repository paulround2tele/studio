-- Rollback Campaign Management Core Schema

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_audit_campaigns ON lead_generation_campaigns;
DROP TRIGGER IF EXISTS trigger_timestamp_campaigns ON lead_generation_campaigns;
DROP TRIGGER IF EXISTS trigger_campaign_transitions ON lead_generation_campaigns;

-- Drop indexes
DROP INDEX IF EXISTS idx_lead_generation_campaigns_created_by;
DROP INDEX IF EXISTS idx_lead_generation_campaigns_status;
DROP INDEX IF EXISTS idx_lead_generation_campaigns_current_phase;
DROP INDEX IF EXISTS idx_lead_generation_campaigns_created_at;
DROP INDEX IF EXISTS idx_lead_generation_campaigns_updated_at;
DROP INDEX IF EXISTS idx_lead_generation_campaigns_started_at;
DROP INDEX IF EXISTS idx_lead_generation_campaigns_completed_at;
DROP INDEX IF EXISTS idx_lead_generation_campaigns_name_search_gin;
DROP INDEX IF EXISTS idx_lead_generation_campaigns_tags_gin;

-- Drop tables
DROP TABLE IF EXISTS lead_generation_campaigns;

-- Drop enums
DROP TYPE IF EXISTS campaign_status_enum;
DROP TYPE IF EXISTS phase_type_enum;