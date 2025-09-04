-- Rollback Campaign State Management Schema

-- Drop indexes
DROP INDEX IF EXISTS idx_campaign_phases_campaign_id;
DROP INDEX IF EXISTS idx_campaign_phases_phase_type;
DROP INDEX IF EXISTS idx_campaign_phases_status;
DROP INDEX IF EXISTS idx_campaign_phases_created_by;

DROP INDEX IF EXISTS idx_campaign_state_events_campaign_id;
DROP INDEX IF EXISTS idx_campaign_state_events_event_type;
DROP INDEX IF EXISTS idx_campaign_state_events_created_at;
DROP INDEX IF EXISTS idx_campaign_state_events_user_id;

DROP INDEX IF EXISTS idx_campaign_state_snapshots_campaign_id;
DROP INDEX IF EXISTS idx_campaign_state_snapshots_created_at;

DROP INDEX IF EXISTS idx_campaign_state_transitions_campaign_id;
DROP INDEX IF EXISTS idx_campaign_state_transitions_triggered_by;
DROP INDEX IF EXISTS idx_campaign_state_transitions_transition_timestamp;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS campaign_state_transitions;
DROP TABLE IF EXISTS campaign_state_snapshots;
DROP TABLE IF EXISTS campaign_state_events;
DROP TABLE IF EXISTS campaign_phases;

-- Drop enums
DROP TYPE IF EXISTS phase_status_enum;
DROP TYPE IF EXISTS state_event_type_enum;