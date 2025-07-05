-- ======================================================================
-- ENTERPRISE SCALE DOMAIN OPTIMIZATION - PART 2: ROLLBACK INDEXES
-- ======================================================================

-- Drop all the new optimized indexes
DROP INDEX IF EXISTS idx_generated_domains_campaign_offset;
DROP INDEX IF EXISTS idx_generated_domains_campaign_created;
DROP INDEX IF EXISTS idx_generated_domains_name;
DROP INDEX IF EXISTS idx_dns_results_campaign_status_created;
DROP INDEX IF EXISTS idx_dns_results_domain_campaign;
DROP INDEX IF EXISTS idx_dns_results_campaign_id_created;
DROP INDEX IF EXISTS idx_dns_results_status_id;
DROP INDEX IF EXISTS idx_http_results_campaign_status_created;
DROP INDEX IF EXISTS idx_http_results_domain_campaign;
DROP INDEX IF EXISTS idx_http_results_campaign_id_created;
DROP INDEX IF EXISTS idx_http_results_status_id;
DROP INDEX IF EXISTS idx_campaigns_user_status_created;
DROP INDEX IF EXISTS idx_campaigns_type_status_created;
DROP INDEX IF EXISTS idx_dns_results_generated_domain_id;
DROP INDEX IF EXISTS idx_http_results_dns_result_id;
DROP INDEX IF EXISTS idx_domain_gen_params_campaign_offset;