-- Restore database triggers for campaign state management
-- Rollback for Phase 1: Remove state triggers migration

-- Restore indexes (these might already exist)
DROP INDEX IF EXISTS idx_campaigns_current_phase;
DROP INDEX IF EXISTS idx_campaigns_business_status;

-- Note: The trigger function and trigger would need to be restored from the original migration
-- This is intentionally left incomplete as the new state management should not be rolled back
-- If rollback is absolutely necessary, restore from migration 000016_database_triggers.up.sql

COMMENT ON TABLE lead_generation_campaigns IS 'Warning: Rollback incomplete - manual restoration of triggers required from 000016_database_triggers.up.sql';
