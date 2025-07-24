-- Migration rollback: Remove full_sequence_mode field from campaigns table

-- Drop the index first
DROP INDEX IF EXISTS idx_campaigns_full_sequence_mode;

-- Remove the column
ALTER TABLE campaigns 
DROP COLUMN IF EXISTS full_sequence_mode;