-- ======================================================================
-- ROLLBACK: REMOVE LAUNCH_SEQUENCE FIELD FROM CAMPAIGNS TABLE
-- ======================================================================
-- This migration removes the launch_sequence field from campaigns table
-- ======================================================================

BEGIN;

-- Remove index first
DROP INDEX IF EXISTS idx_campaigns_launch_sequence;

-- Remove the launch_sequence column
ALTER TABLE campaigns 
DROP COLUMN IF EXISTS launch_sequence;

COMMIT;

-- ======================================================================
-- Rollback complete - launch_sequence field removed from campaigns table
-- ======================================================================