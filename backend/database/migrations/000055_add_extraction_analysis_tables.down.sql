-- Rollback migration for Extraction & Analysis Tables
-- This safely removes the tables and enum created in the up migration

-- Drop indexes first (will be dropped automatically with tables, but explicit for clarity)
DROP INDEX IF EXISTS idx_domain_extraction_features_ready;
DROP INDEX IF EXISTS idx_domain_extracted_keywords_ready;
DROP INDEX IF EXISTS idx_domain_extraction_features_campaign_state;
DROP INDEX IF EXISTS idx_domain_extracted_keywords_campaign_state;

-- Drop tables (foreign key constraints ensure safe deletion)
DROP TABLE IF EXISTS domain_extracted_keywords;
DROP TABLE IF EXISTS domain_extraction_features;

-- Drop the enum type
DROP TYPE IF EXISTS processing_state;

-- Rollback notes:
-- This rollback is safe and can be executed at any time during Phase P0-P2
-- as no production code depends on these tables yet.
-- 
-- After Phase P3+ when analysis reads from these tables, rollback requires:
-- 1. Disable feature flags first: ANALYSIS_READS_FEATURE_TABLE=false
-- 2. Ensure all analysis operations have fallen back to legacy paths
-- 3. Then execute this rollback migration