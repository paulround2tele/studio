-- Add state management columns to lead_generation_campaigns table
-- Part of Phase 1: State Machine Foundation

-- Add optimistic locking and state data columns
ALTER TABLE lead_generation_campaigns 
ADD COLUMN IF NOT EXISTS state_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS state_data JSONB DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_state_version ON lead_generation_campaigns(state_version);
CREATE INDEX IF NOT EXISTS idx_campaigns_state_data ON lead_generation_campaigns USING gin(state_data);

-- Update existing campaigns to have initial state version
UPDATE lead_generation_campaigns 
SET state_version = 1, state_data = '{}' 
WHERE state_version IS NULL OR state_data IS NULL;

-- Make columns NOT NULL after populating existing data
ALTER TABLE lead_generation_campaigns 
ALTER COLUMN state_version SET NOT NULL,
ALTER COLUMN state_data SET NOT NULL;
