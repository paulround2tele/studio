-- Migration 46: Drop deprecated domains_data JSONB column and associated partial GIN index
-- Phase C (Deprecation Cleanup)
-- Assumes no critical data remains in domains_data (confirmed disposable).

BEGIN;

-- Safety check: only proceed if column exists
ALTER TABLE lead_generation_campaigns DROP COLUMN IF EXISTS domains_data;
-- Drop related index if it still exists
DROP INDEX IF EXISTS idx_lead_generation_campaigns_domains_data_gin;

COMMIT;
