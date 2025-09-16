-- Revert Migration 000055: Drop extraction feature tables, view, indexes, and enum
DROP VIEW IF EXISTS analysis_ready_features;
DROP INDEX IF EXISTS idx_domain_extraction_features_stale_campaign;
DROP INDEX IF EXISTS idx_domain_extraction_features_ready_campaign;
DROP INDEX IF EXISTS idx_domain_extracted_keywords_campaign_keyword;
DROP TABLE IF EXISTS domain_extracted_keywords;
DROP TABLE IF EXISTS domain_extraction_features;
-- Drop enum last (only if no dependencies remain)
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_processing_state_enum') THEN
		DROP TYPE extraction_processing_state_enum;
	END IF;
END$$;

