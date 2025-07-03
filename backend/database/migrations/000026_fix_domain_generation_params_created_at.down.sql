-- Migration: 000026_fix_domain_generation_params_created_at.down.sql
-- Purpose: Rollback migration that adds created_at column to domain_generation_params table
-- Author: DomainFlow Debug Team
-- Date: 2025-07-03
-- WARNING: This will remove the created_at, updated_at, total_possible_combinations, and current_offset columns

BEGIN;

-- Remove constraint
ALTER TABLE public.domain_generation_params DROP CONSTRAINT IF EXISTS chk_offset_within_bounds;

-- Remove index
DROP INDEX IF EXISTS idx_domain_gen_params_campaign_id;

-- Remove columns (commented out for safety - uncomment only if you're sure)
-- WARNING: This will delete data in these columns
/*
ALTER TABLE public.domain_generation_params DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.domain_generation_params DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.domain_generation_params DROP COLUMN IF EXISTS total_possible_combinations;
ALTER TABLE public.domain_generation_params DROP COLUMN IF EXISTS current_offset;
*/

-- Instead of dropping columns, just log the rollback
DO $$
BEGIN
    RAISE NOTICE 'Migration 000026 rollback: Constraints and indexes removed';
    RAISE NOTICE 'Column removal commented out for data safety';
    RAISE NOTICE 'Manual column removal required if needed:';
    RAISE NOTICE '  ALTER TABLE public.domain_generation_params DROP COLUMN created_at;';
    RAISE NOTICE '  ALTER TABLE public.domain_generation_params DROP COLUMN updated_at;';
    RAISE NOTICE '  ALTER TABLE public.domain_generation_params DROP COLUMN total_possible_combinations;';
    RAISE NOTICE '  ALTER TABLE public.domain_generation_params DROP COLUMN current_offset;';
END $$;

COMMIT;