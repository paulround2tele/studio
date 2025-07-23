-- ======================================================================
-- ELIMINATE LEGACY VALIDATION TABLES MIGRATION (UP)
-- ======================================================================
-- This migration removes dns_validation_results and http_keyword_results
-- tables that conflict with the phase-transition architecture.
-- 
-- WARNING: Migrations must ONLY be run through backend tool, NEVER psql!
-- SAFETY: Transaction-based with data verification
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. SAFETY: Verify generated_domains table has status fields
-- ======================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_domains' 
                   AND column_name = 'dns_status') THEN
        RAISE EXCEPTION 'Cannot proceed: generated_domains.dns_status column missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generated_domains' 
                   AND column_name = 'http_status') THEN
        RAISE EXCEPTION 'Cannot proceed: generated_domains.http_status column missing';
    END IF;
    
    RAISE NOTICE 'Safety check passed: generated_domains has required status fields';
END $$;

-- ======================================================================
-- 2. DATA MIGRATION: Ensure all validation data is in generated_domains
-- ======================================================================

-- Migrate any missing DNS validation status from legacy table
UPDATE generated_domains gd
SET dns_status = CASE 
    WHEN dvr.validation_status = 'resolved' THEN 'ok'
    WHEN dvr.validation_status IN ('unresolved', 'timeout', 'error') THEN 'error'
    ELSE 'pending'
END,
last_validated_at = CASE 
    WHEN dvr.last_checked_at IS NOT NULL THEN dvr.last_checked_at
    ELSE gd.last_validated_at
END
FROM dns_validation_results dvr
WHERE gd.id = dvr.generated_domain_id
AND (gd.dns_status IS NULL OR gd.dns_status = 'pending')
AND dvr.validation_status IS NOT NULL;

-- Migrate any missing HTTP validation status from legacy table  
UPDATE generated_domains gd
SET http_status = CASE
    WHEN hkr.validation_status = 'success' THEN 'ok'
    WHEN hkr.validation_status IN ('failed', 'timeout', 'error') THEN 'error'
    ELSE 'pending'
END,
last_validated_at = CASE 
    WHEN hkr.last_checked_at IS NOT NULL THEN hkr.last_checked_at
    ELSE gd.last_validated_at
END
FROM http_keyword_results hkr
WHERE gd.domain_name = hkr.domain_name
AND (gd.http_status IS NULL OR gd.http_status = 'pending')
AND hkr.validation_status IS NOT NULL;

-- ======================================================================
-- 3. DROP LEGACY VALIDATION TABLES
-- ======================================================================

-- Drop foreign key constraints first
DROP TABLE IF EXISTS dns_validation_results CASCADE;
DROP TABLE IF EXISTS http_keyword_results CASCADE;

-- Drop related parameter tables if they exist
DROP TABLE IF EXISTS dns_validation_params CASCADE;
DROP TABLE IF EXISTS http_keyword_params CASCADE;

-- ======================================================================
-- 4. VALIDATION: Verify legacy tables are gone
-- ======================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'dns_validation_results') THEN
        RAISE EXCEPTION 'Migration failed: dns_validation_results table still exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'http_keyword_results') THEN
        RAISE EXCEPTION 'Migration failed: http_keyword_results table still exists';
    END IF;
    
    RAISE NOTICE 'Legacy validation tables successfully eliminated';
END $$;

-- Update statistics
ANALYZE generated_domains;

COMMIT;

-- ======================================================================
-- MIGRATION COMPLETE - LEGACY VALIDATION TABLES ELIMINATED
-- ======================================================================
-- Single source of truth: generated_domains table only
-- Backend services must be updated to stop referencing legacy tables
-- ======================================================================