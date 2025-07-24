-- ======================================================================
-- ADD LEAD STATUS TO GENERATED DOMAINS MIGRATION (DOWN)
-- ======================================================================
-- This migration removes the lead_status column from generated_domains
-- table to rollback the phase-transition architecture changes.
-- 
-- WARNING: Migrations must ONLY be run through backend tool, NEVER psql!
-- SAFETY: Transaction-based with data verification
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. SAFETY: Verify generated_domains table exists
-- ======================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'generated_domains' 
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Cannot proceed: generated_domains table missing';
    END IF;
    
    RAISE NOTICE 'Safety check passed: generated_domains table exists';
END $$;

-- ======================================================================
-- 2. DROP INDEXES FIRST
-- ======================================================================

-- Drop composite index
DROP INDEX IF EXISTS idx_generated_domains_status_composite;

-- Drop lead_status index
DROP INDEX IF EXISTS idx_generated_domains_lead_status;

-- ======================================================================
-- 3. DROP CONSTRAINTS
-- ======================================================================

-- Drop check constraint for lead_status
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'generated_domains' 
        AND constraint_name = 'chk_lead_status_valid'
    ) THEN
        ALTER TABLE public.generated_domains
        DROP CONSTRAINT chk_lead_status_valid;
        
        RAISE NOTICE 'Dropped lead_status validation constraint from generated_domains table';
    END IF;
END $$;

-- ======================================================================
-- 4. DROP LEAD_STATUS COLUMN
-- ======================================================================

-- Remove lead_status column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'generated_domains' 
        AND column_name = 'lead_status'
    ) THEN
        ALTER TABLE public.generated_domains 
        DROP COLUMN lead_status;
        
        RAISE NOTICE 'Removed lead_status column from generated_domains table';
    ELSE
        RAISE NOTICE 'lead_status column does not exist in generated_domains table';
    END IF;
END $$;

-- ======================================================================
-- 5. VALIDATION: Verify column was removed successfully
-- ======================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'generated_domains' 
               AND column_name = 'lead_status'
               AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Rollback failed: lead_status column still exists';
    END IF;
    
    RAISE NOTICE 'Rollback successful: lead_status column removed from generated_domains';
END $$;

-- Update table statistics
ANALYZE generated_domains;

COMMIT;

-- ======================================================================
-- ROLLBACK COMPLETE - LEAD STATUS SUPPORT REMOVED
-- ======================================================================
-- Phase transition architecture partially rolled back:
-- - DNS validation: dns_status, dns_ip (preserved)
-- - HTTP validation: http_status, http_status_code, http_keywords, http_title (preserved)
-- - Lead processing: lead_score (preserved), lead_status (REMOVED)
-- ======================================================================