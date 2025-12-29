-- Migration: 000072_add_rejection_reason.down.sql
-- Purpose: Rollback rejection_reason column addition
-- Part of: P0-1 from CAMPAIGN_RESULTS_REFACTOR_PLAN.md

-- Step 1: Drop the partial index for pending
DROP INDEX IF EXISTS public.idx_generated_domains_pending;

-- Step 2: Drop the partial index for qualified leads
DROP INDEX IF EXISTS public.idx_generated_domains_qualified;

-- Step 3: Drop the composite index for rejection reason filtering
DROP INDEX IF EXISTS public.idx_generated_domains_rejection_reason;

-- Step 4: Drop the rejection_reason column
ALTER TABLE public.generated_domains 
DROP COLUMN IF EXISTS rejection_reason;

-- Step 5: Drop the enum type
DROP TYPE IF EXISTS public.domain_rejection_reason_enum;
