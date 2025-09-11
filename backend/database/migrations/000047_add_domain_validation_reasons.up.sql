-- 000047_add_domain_validation_reasons.up.sql
-- Phase D (D1): Introduce dns_reason and http_reason columns to capture failure/timeout reasons.
-- Also adjust counters trigger to ignore reason-only updates (so counters not recalculated when status unchanged).
-- Columns are nullable text now (future: constrained enum table if taxonomy stabilizes).
-- Assumptions: generated_domains table exists.

ALTER TABLE generated_domains
  ADD COLUMN IF NOT EXISTS dns_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS http_reason TEXT NULL;

-- Optional future index for filtering by reason category (skipped until query patterns emerge)
-- CREATE INDEX IF NOT EXISTS idx_generated_domains_dns_reason ON generated_domains(dns_reason) WHERE dns_reason IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_generated_domains_http_reason ON generated_domains(http_reason) WHERE http_reason IS NOT NULL;

-- Update existing trigger function(s) if they reference column lists explicitly. We rely on previous triggers using NEW/OLD.* generically.
-- If a counters trigger exists that fires on UPDATE OF specific status columns, ensure reasons not part of that trigger's column filter.
-- (No change needed here based on prior migration 045 which uses AFTER UPDATE ON generated_domains and diff logic limited to *_status columns.)

COMMENT ON COLUMN generated_domains.dns_reason IS 'Human-readable reason for latest DNS validation status (e.g., NXDOMAIN, SERVFAIL, TIMEOUT, BAD_RESPONSE)';
COMMENT ON COLUMN generated_domains.http_reason IS 'Human-readable reason for latest HTTP validation status (e.g., CONNECT_ERROR, TLS_ERROR, TIMEOUT, NON_200, BODY_MISMATCH)';
