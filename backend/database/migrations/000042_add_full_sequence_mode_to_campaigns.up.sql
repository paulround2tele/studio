-- Migration: Add full_sequence_mode field to campaigns table
-- This enables tracking of campaigns that use automatic phase progression

ALTER TABLE campaigns 
ADD COLUMN full_sequence_mode BOOLEAN DEFAULT FALSE;

-- Add index for efficient filtering of full sequence mode campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_full_sequence_mode ON campaigns (full_sequence_mode);

-- Add comment for documentation
COMMENT ON COLUMN campaigns.full_sequence_mode IS 'Whether this campaign uses automatic phase progression from generation through DNS to HTTP validation';