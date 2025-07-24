-- Migration 000044 Down: Rollback Phase 3 Standalone Services JSONB Architecture
-- Remove JSONB columns and indexes added for standalone service integration

-- Drop partial indexes first
DROP INDEX IF EXISTS idx_lead_gen_campaigns_analysis_results_matches;
DROP INDEX IF EXISTS idx_lead_gen_campaigns_http_results_matches;
DROP INDEX IF EXISTS idx_lead_gen_campaigns_dns_results_validated;
DROP INDEX IF EXISTS idx_lead_gen_campaigns_domains_data_count;

-- Drop GIN indexes
DROP INDEX IF EXISTS idx_lead_gen_campaigns_analysis_results;
DROP INDEX IF EXISTS idx_lead_gen_campaigns_http_results;
DROP INDEX IF EXISTS idx_lead_gen_campaigns_dns_results;
DROP INDEX IF EXISTS idx_lead_gen_campaigns_domains_data;

-- Remove JSONB columns from lead_generation_campaigns table
ALTER TABLE lead_generation_campaigns 
DROP COLUMN IF EXISTS analysis_results,
DROP COLUMN IF EXISTS http_results,
DROP COLUMN IF EXISTS dns_results,
DROP COLUMN IF EXISTS domains_data;

-- Reset table comment
COMMENT ON TABLE lead_generation_campaigns IS 'Lead generation campaigns with phase-based execution';