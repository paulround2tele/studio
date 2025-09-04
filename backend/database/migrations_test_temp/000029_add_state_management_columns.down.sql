-- Rollback state management columns
-- Part of Phase 1: State Machine Foundation rollback

-- Remove indexes
DROP INDEX IF EXISTS idx_campaigns_state_data;
DROP INDEX IF EXISTS idx_campaigns_state_version;

-- Remove columns
ALTER TABLE lead_generation_campaigns 
DROP COLUMN IF EXISTS state_data,
DROP COLUMN IF EXISTS state_version;
