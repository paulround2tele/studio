-- ======================================================================
-- ENTERPRISE SCALE DOMAIN OPTIMIZATION - PART 1: DROP OLD INDEXES
-- ======================================================================

-- Generated domains - remove old indexes
DROP INDEX IF EXISTS idx_generated_domains_campaign_id;
DROP INDEX IF EXISTS idx_generated_domains_offset;

-- DNS validation results - remove old indexes
DROP INDEX IF EXISTS idx_dns_validation_results_campaign_id;
DROP INDEX IF EXISTS idx_dns_validation_results_status;

-- HTTP keyword results - remove old indexes
DROP INDEX IF EXISTS idx_http_keyword_results_campaign_id;