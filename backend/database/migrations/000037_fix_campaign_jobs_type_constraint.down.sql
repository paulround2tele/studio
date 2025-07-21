-- Migration rollback: Restore old campaign_jobs job_type constraint
-- This reverts the constraint back to the legacy values

BEGIN;

-- Drop the phases-based constraint
ALTER TABLE campaign_jobs DROP CONSTRAINT IF EXISTS chk_campaign_jobs_type_valid;

-- Restore the original constraint with legacy enum values
ALTER TABLE campaign_jobs ADD CONSTRAINT chk_campaign_jobs_type_valid 
    CHECK ((job_type = ANY (ARRAY[
        'domain_generation'::text, 
        'dns_validation'::text, 
        'http_keyword_validation'::text
    ])));

COMMIT;