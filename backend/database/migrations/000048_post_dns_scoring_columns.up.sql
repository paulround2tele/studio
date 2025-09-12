-- 000048_post_dns_scoring_columns.up.sql
-- Add enrichment & scoring columns to generated_domains (additive, nullable)
ALTER TABLE generated_domains
    ADD COLUMN IF NOT EXISTS relevance_score NUMERIC(6,3),
    ADD COLUMN IF NOT EXISTS domain_score NUMERIC(6,3),
    ADD COLUMN IF NOT EXISTS feature_vector JSONB,
    ADD COLUMN IF NOT EXISTS is_parked BOOLEAN,
    ADD COLUMN IF NOT EXISTS parked_confidence NUMERIC(5,3),
    ADD COLUMN IF NOT EXISTS contacts JSONB,
    ADD COLUMN IF NOT EXISTS secondary_pages_examined SMALLINT DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS microcrawl_exhausted BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS content_lang TEXT,
    ADD COLUMN IF NOT EXISTS last_http_fetched_at TIMESTAMPTZ;

-- Add comments for psql \d+ visibility
COMMENT ON COLUMN generated_domains.relevance_score IS 'Intermediate relevance score (0-100 scaled)';
COMMENT ON COLUMN generated_domains.domain_score IS 'Final composite score (0-100)';
COMMENT ON COLUMN generated_domains.feature_vector IS 'Normalized enrichment signals for scoring/rescore';
COMMENT ON COLUMN generated_domains.is_parked IS 'Parked domain classification (NULL unknown)';
COMMENT ON COLUMN generated_domains.parked_confidence IS 'Confidence 0..1 for parked classification';
COMMENT ON COLUMN generated_domains.contacts IS 'Contact data array (email/phone/etc)';
COMMENT ON COLUMN generated_domains.secondary_pages_examined IS 'Count of micro-crawl secondary pages fetched';
COMMENT ON COLUMN generated_domains.microcrawl_exhausted IS 'TRUE if crawl aborted due to limits/budget';
COMMENT ON COLUMN generated_domains.content_lang IS 'Primary language code';
COMMENT ON COLUMN generated_domains.last_http_fetched_at IS 'Timestamp of last successful HTTP fetch/enrichment';
