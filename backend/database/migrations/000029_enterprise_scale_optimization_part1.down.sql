-- ======================================================================
-- ENTERPRISE SCALE DOMAIN OPTIMIZATION - PART 1: ROLLBACK
-- ======================================================================

-- Recreate the old indexes that were dropped
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_id ON generated_domains(domain_generation_campaign_id);
CREATE INDEX IF NOT EXISTS idx_generated_domains_offset ON generated_domains(offset_index);
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_campaign_id ON dns_validation_results(dns_campaign_id);
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_status ON dns_validation_results(validation_status);
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_campaign_id ON http_keyword_results(http_keyword_campaign_id);