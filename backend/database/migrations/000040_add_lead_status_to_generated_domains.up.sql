-- ======================================================================
-- ADD LEAD STATUS TO GENERATED DOMAINS MIGRATION (UP)
-- ======================================================================
-- This migration adds the missing lead_status column to generated_domains
-- table to complete the phase-transition architecture support.
-- 
-- WARNING: Migrations must ONLY be run through backend tool, NEVER psql!
-- SAFETY: Transaction-based with data verification
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. SAFETY: Verify generated_domains table exists and has lead_score
-- ======================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'generated_domains' 
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Cannot proceed: generated_domains table missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_domains' 
                   AND column_name = 'lead_score'
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Cannot proceed: generated_domains.lead_score column missing';
    END IF;
    
    RAISE NOTICE 'Safety check passed: generated_domains table ready for lead_status addition';
END $$;

-- ======================================================================
-- 2. ADD LEAD_STATUS COLUMN
-- ======================================================================

-- Add lead_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'generated_domains' 
        AND column_name = 'lead_status'
    ) THEN
        ALTER TABLE public.generated_domains 
        ADD COLUMN lead_status TEXT DEFAULT 'pending';
        
        RAISE NOTICE 'Added lead_status column to generated_domains table';
    ELSE
        RAISE NOTICE 'lead_status column already exists in generated_domains table';
    END IF;
END $$;

-- ======================================================================
-- 3. ADD CONSTRAINTS AND VALIDATION
-- ======================================================================

-- Add check constraint for valid lead_status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'generated_domains' 
        AND constraint_name = 'chk_lead_status_valid'
    ) THEN
        ALTER TABLE public.generated_domains
        ADD CONSTRAINT chk_lead_status_valid 
        CHECK (lead_status IN ('pending', 'processing', 'qualified', 'unqualified', 'error'));
        
        RAISE NOTICE 'Added lead_status validation constraint to generated_domains table';
    END IF;
END $$;

-- ======================================================================
-- 4. ADD INDEXING FOR PERFORMANCE
-- ======================================================================

-- Create index for lead_status queries
CREATE INDEX IF NOT EXISTS idx_generated_domains_lead_status 
ON public.generated_domains(lead_status);

-- Create composite index for status-based queries
CREATE INDEX IF NOT EXISTS idx_generated_domains_status_composite 
ON public.generated_domains(dns_status, http_status, lead_status);

-- ======================================================================
-- 5. VALIDATION: Verify column was added successfully
-- ======================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_domains' 
                   AND column_name = 'lead_status'
                   AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Migration failed: lead_status column was not added';
    END IF;
    
    RAISE NOTICE 'Migration successful: lead_status column added to generated_domains';
END $$;

-- Update table statistics
ANALYZE generated_domains;

COMMIT;

-- ======================================================================
-- MIGRATION COMPLETE - LEAD STATUS SUPPORT ADDED
-- ======================================================================
-- Phase transition architecture now complete:
-- - DNS validation: dns_status, dns_ip
-- - HTTP validation: http_status, http_status_code, http_keywords, http_title  
-- - Lead processing: lead_status, lead_score
-- Single source of truth: generated_domains table
-- ======================================================================