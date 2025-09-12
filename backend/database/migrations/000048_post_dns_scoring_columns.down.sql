-- 000048_post_dns_scoring_columns.down.sql
ALTER TABLE generated_domains
    DROP COLUMN IF EXISTS relevance_score,
    DROP COLUMN IF EXISTS domain_score,
    DROP COLUMN IF EXISTS feature_vector,
    DROP COLUMN IF EXISTS is_parked,
    DROP COLUMN IF EXISTS parked_confidence,
    DROP COLUMN IF EXISTS contacts,
    DROP COLUMN IF EXISTS secondary_pages_examined,
    DROP COLUMN IF EXISTS microcrawl_exhausted,
    DROP COLUMN IF EXISTS content_lang,
    DROP COLUMN IF EXISTS last_http_fetched_at;
