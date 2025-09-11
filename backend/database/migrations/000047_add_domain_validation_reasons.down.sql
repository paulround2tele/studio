-- 000047_add_domain_validation_reasons.down.sql
-- Revert addition of dns_reason and http_reason columns.
ALTER TABLE generated_domains
  DROP COLUMN IF EXISTS dns_reason,
  DROP COLUMN IF EXISTS http_reason;
