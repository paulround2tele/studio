-- Migration: Fix campaign_jobs job_type constraint to match phases-based enums
-- Issue: Database constraint expects 'domain_generation' but Go code uses 'generation'
--
-- Before: ['domain_generation', 'dns_validation', 'http_keyword_validation']
-- After:  ['generation', 'dns_validation', 'http_keyword_validation', 'analysis']

BEGIN;

-- Drop the existing constraint first (so we can update the data)
ALTER TABLE campaign_jobs DROP CONSTRAINT IF EXISTS chk_campaign_jobs_type_valid;

-- Now update any existing invalid job_type values to match phases-based enums
UPDATE campaign_jobs
SET job_type = 'generation'
WHERE job_type = 'domain_generation';

-- Add the updated constraint with phases-based enum values
ALTER TABLE campaign_jobs ADD CONSTRAINT chk_campaign_jobs_type_valid
    CHECK ((job_type = ANY (ARRAY[
        'generation'::text,
        'dns_validation'::text,
        'http_keyword_validation'::text,
        'analysis'::text
    ])));

COMMIT;