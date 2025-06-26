-- Reverse migration for bulk operation indexes
-- This is a rollback migration, use with caution

BEGIN;

-- Drop bulk operation indexes
DROP INDEX IF EXISTS idx_campaigns_bulk_ops;
DROP INDEX IF EXISTS idx_domains_bulk_ops;
DROP INDEX IF EXISTS idx_keywords_bulk_ops;
DROP INDEX IF EXISTS idx_dns_records_bulk_ops;
DROP INDEX IF EXISTS idx_http_responses_bulk_ops;
DROP INDEX IF EXISTS idx_domain_keywords_bulk_ops;
DROP INDEX IF EXISTS idx_campaign_domains_bulk_ops;
DROP INDEX IF EXISTS idx_personas_bulk_ops;
DROP INDEX IF EXISTS idx_proxies_bulk_ops;

-- Drop time-based indexes
DROP INDEX IF EXISTS idx_campaigns_time_based;
DROP INDEX IF EXISTS idx_domains_time_based;
DROP INDEX IF EXISTS idx_keywords_time_based;
DROP INDEX IF EXISTS idx_dns_records_time_based;
DROP INDEX IF EXISTS idx_http_responses_time_based;

-- Drop composite indexes
DROP INDEX IF EXISTS idx_campaigns_status_phase_composite;
DROP INDEX IF EXISTS idx_domains_status_validation_composite;
DROP INDEX IF EXISTS idx_keywords_status_validation_composite;

-- Drop performance indexes
DROP INDEX IF EXISTS idx_campaigns_performance;
DROP INDEX IF EXISTS idx_domains_performance;
DROP INDEX IF EXISTS idx_keywords_performance;

COMMIT;
