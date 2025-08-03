-- Phase 2.1: Rollback data migration to new state tables
-- Part of Database Architecture Cleanup

-- Clear the migrated data (the tables will be dropped in the previous migration rollback)
-- This is mainly for completeness - the down migration of 000031 will drop the tables entirely

DELETE FROM phase_executions;
DELETE FROM campaign_states;

-- Log rollback
DO $$
BEGIN
    RAISE NOTICE 'Data migration rollback completed - cleared campaign_states and phase_executions tables';
END $$;
