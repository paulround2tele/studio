-- ======================================================================
-- ENTERPRISE SCALE DOMAIN OPTIMIZATION - PART 2: CREATE INDEXES CONCURRENTLY
-- ======================================================================
-- NOTE: This migration cannot run in a transaction block due to CONCURRENTLY

-- Generated domains - optimized for cursor-based pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_domains_campaign_offset
ON generated_domains(domain_generation_campaign_id, offset_index);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_domains_campaign_created
ON generated_domains(domain_generation_campaign_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_domains_name
ON generated_domains(domain_name);

-- DNS validation results optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_results_campaign_status_created
ON dns_validation_results(dns_campaign_id, validation_status, business_status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_results_domain_campaign
ON dns_validation_results(domain_name, dns_campaign_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_results_campaign_id_created
ON dns_validation_results(dns_campaign_id, id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_results_status_id
ON dns_validation_results(validation_status, business_status, id);

-- HTTP keyword results optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_results_campaign_status_created
ON http_keyword_results(http_keyword_campaign_id, validation_status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_results_domain_campaign
ON http_keyword_results(domain_name, http_keyword_campaign_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_results_campaign_id_created
ON http_keyword_results(http_keyword_campaign_id, id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_results_status_id
ON http_keyword_results(validation_status, id);

-- Campaign optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_user_status_created
ON campaigns(user_id, status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_type_status_created
ON campaigns(campaign_type, status, created_at);

-- Foreign key relationship optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_results_generated_domain_id
ON dns_validation_results(generated_domain_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_results_dns_result_id
ON http_keyword_results(dns_result_id);

-- Domain generation params optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_gen_params_campaign_offset
ON domain_generation_campaign_params(campaign_id, current_offset);