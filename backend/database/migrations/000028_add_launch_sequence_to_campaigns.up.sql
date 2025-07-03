-- ======================================================================
-- ADD LAUNCH_SEQUENCE FIELD TO CAMPAIGNS TABLE
-- ======================================================================
-- This migration adds the launch_sequence field to campaigns table
-- to store user preference for automatic campaign chaining
-- ======================================================================

BEGIN;

-- Add launch_sequence field to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS launch_sequence BOOLEAN DEFAULT false NOT NULL;

-- Add comment to document the field purpose
COMMENT ON COLUMN campaigns.launch_sequence IS 'User preference: whether to automatically chain campaigns in sequence (true) or create only the specific campaign type (false)';

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_campaigns_launch_sequence ON campaigns(launch_sequence);

COMMIT;

-- ======================================================================
-- Migration complete - campaigns table now has launch_sequence field
-- ======================================================================