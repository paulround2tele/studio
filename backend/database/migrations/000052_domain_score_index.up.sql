-- Phase 2 Filtering Enablement: Optional performance index for score-sorted queries
-- Creates a composite index to accelerate lookups constrained by campaign_id and ordered / filtered by domain_score.
-- Safe to run multiple times due to IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_domain_score_desc
    ON generated_domains (campaign_id, domain_score DESC);

-- Secondary index to support last_http_fetched_at sorting if needed (kept narrow for better selectivity)
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_last_http_fetched_at_desc
    ON generated_domains (campaign_id, last_http_fetched_at DESC);
