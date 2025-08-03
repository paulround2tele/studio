-- Phase 2.1: Rollback campaign_states and phase_executions tables
-- Part of Database Architecture Cleanup

-- Drop tables in reverse order (foreign key dependencies)
DROP TABLE IF EXISTS phase_executions;
DROP TABLE IF EXISTS campaign_states;

-- Drop enums
DROP TYPE IF EXISTS execution_status_enum;
DROP TYPE IF EXISTS campaign_mode_enum; 
DROP TYPE IF EXISTS campaign_state_enum;
