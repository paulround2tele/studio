-- Migration: 000072_add_rejection_reason.up.sql
-- Purpose: Add rejection_reason column to generated_domains for tracking domain exclusion reasons
-- Part of: P0-1 from CAMPAIGN_RESULTS_REFACTOR_PLAN.md
-- 
-- ENUM VALUES:
--   qualified    - Not rejected, became a lead (lead_status = 'match')
--   low_score    - Keywords found but score below threshold
--   no_keywords  - HTTP OK but no keyword matches found
--   parked       - Domain is parked/placeholder
--   dns_error    - DNS validation returned error
--   dns_timeout  - DNS validation timed out
--   http_error   - HTTP validation returned error
--   http_timeout - HTTP validation timed out
--   pending      - Validation not yet complete (used for in-progress rows)

-- Step 1: Create the rejection_reason enum type (idempotent - skip if exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'domain_rejection_reason_enum') THEN
        CREATE TYPE public.domain_rejection_reason_enum AS ENUM (
            'qualified',
            'low_score',
            'no_keywords',
            'parked',
            'dns_error',
            'dns_timeout',
            'http_error',
            'http_timeout',
            'pending'
        );
    END IF;
END
$$;

COMMENT ON TYPE public.domain_rejection_reason_enum IS 
'Enum representing why a domain was excluded from qualified leads. All values are deterministic.';

-- Step 2: Add the rejection_reason column to generated_domains (idempotent - skip if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'generated_domains' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.generated_domains 
        ADD COLUMN rejection_reason public.domain_rejection_reason_enum;
    END IF;
END
$$;

COMMENT ON COLUMN public.generated_domains.rejection_reason IS 
'Reason domain was excluded from leads. Set during validation/analysis phases. NOT NULL after migration.';

-- Step 3: Create composite index for efficient filtering by campaign and rejection reason (idempotent)
CREATE INDEX IF NOT EXISTS idx_generated_domains_rejection_reason 
ON public.generated_domains(campaign_id, rejection_reason);

-- Step 4: Backfill existing data deterministically
-- Priority order is critical for correct classification:
--   1. qualified (lead_status = 'match')
--   2. dns_timeout (dns timed out - most specific failure)
--   3. dns_error (dns failed)
--   4. http_timeout (http timed out)
--   5. http_error (http failed)
--   6. parked (passed validation but is parked)
--   7. low_score (has keywords but score below threshold)
--   8. no_keywords (passed validation, no keywords found)
--   9. pending (still processing)
UPDATE public.generated_domains 
SET rejection_reason = 
  CASE
    -- 1. Qualified leads (matched keywords with good score)
    WHEN lead_status = 'match' THEN 'qualified'::domain_rejection_reason_enum
    
    -- 2. DNS timeout (specific timeout reason)
    WHEN dns_status = 'timeout' THEN 'dns_timeout'::domain_rejection_reason_enum
    
    -- 3. DNS error (failed DNS validation)
    WHEN dns_status = 'error' THEN 'dns_error'::domain_rejection_reason_enum
    
    -- 4. HTTP timeout (specific timeout reason)
    WHEN http_status = 'timeout' THEN 'http_timeout'::domain_rejection_reason_enum
    
    -- 5. HTTP error (failed HTTP validation)
    WHEN http_status = 'error' THEN 'http_error'::domain_rejection_reason_enum
    
    -- 6. Parked domains (passed validation but detected as parked)
    WHEN is_parked = true AND http_status = 'ok' THEN 'parked'::domain_rejection_reason_enum
    
    -- 7. Low score: has keywords found (http_keywords not empty) but score below threshold
    -- This must come BEFORE no_keywords to be reachable
    WHEN lead_status = 'no_match' 
         AND http_status = 'ok' 
         AND http_keywords IS NOT NULL 
         AND http_keywords != '' 
         AND lead_score < 50 
    THEN 'low_score'::domain_rejection_reason_enum
    
    -- 8. No keywords: passed validation but no keyword matches found
    WHEN lead_status = 'no_match' 
         AND http_status = 'ok' 
         AND (http_keywords IS NULL OR http_keywords = '')
    THEN 'no_keywords'::domain_rejection_reason_enum
    
    -- 9. Pending: still processing (dns_status or http_status or lead_status = 'pending')
    ELSE 'pending'::domain_rejection_reason_enum
  END
WHERE rejection_reason IS NULL;

-- Step 5: Enforce NOT NULL constraint after backfill (idempotent - check first)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'generated_domains' 
        AND column_name = 'rejection_reason' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.generated_domains
        ALTER COLUMN rejection_reason SET NOT NULL;
    END IF;
END
$$;

-- Step 6: Add partial index for qualified leads (common query pattern) (idempotent)
CREATE INDEX IF NOT EXISTS idx_generated_domains_qualified 
ON public.generated_domains(campaign_id) 
WHERE rejection_reason = 'qualified';

-- Step 7: Add partial index for pending (useful for finding incomplete work) (idempotent)
CREATE INDEX IF NOT EXISTS idx_generated_domains_pending 
ON public.generated_domains(campaign_id, created_at) 
WHERE rejection_reason = 'pending';

-- Step 8: Update statistics for query planner
ANALYZE public.generated_domains;
