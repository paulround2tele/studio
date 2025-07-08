-- Rollback migration to remove domain-centric validation status fields from generated_domains table

BEGIN;

-- Drop the indexes first
DROP INDEX IF EXISTS idx_generated_domains_validation_composite;
DROP INDEX IF EXISTS idx_generated_domains_lead_score;
DROP INDEX IF EXISTS idx_generated_domains_http_status;
DROP INDEX IF EXISTS idx_generated_domains_dns_status;

-- Remove the validation status columns
ALTER TABLE generated_domains 
DROP COLUMN IF EXISTS last_validated_at,
DROP COLUMN IF EXISTS lead_score,
DROP COLUMN IF EXISTS http_status_code,
DROP COLUMN IF EXISTS http_status,
DROP COLUMN IF EXISTS dns_ip,
DROP COLUMN IF EXISTS dns_status;

COMMIT;