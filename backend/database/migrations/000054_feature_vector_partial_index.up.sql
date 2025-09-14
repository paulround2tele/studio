-- Performance optimization: accelerate feature_vector presence counts & scoring scans
-- Rationale: Analysis preflight & scoring paths frequently execute
--   SELECT COUNT(*) FROM generated_domains WHERE campaign_id=$1 AND feature_vector IS NOT NULL
--   SELECT domain_name, feature_vector ... FROM generated_domains WHERE campaign_id=$1 AND feature_vector IS NOT NULL
-- A partial index on (campaign_id) WHERE feature_vector IS NOT NULL drastically reduces
-- sequential scans and enables index-only count (depending on planner & visibility).
-- Safe + idempotent via IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_feature_vector_present
    ON generated_domains (campaign_id)
    WHERE feature_vector IS NOT NULL;
