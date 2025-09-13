-- Drop indexes introduced for Phase 2 Filtering Enablement
DROP INDEX IF EXISTS idx_generated_domains_campaign_domain_score_desc;
DROP INDEX IF EXISTS idx_generated_domains_campaign_last_http_fetched_at_desc;
