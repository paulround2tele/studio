-- ======================================================================
-- PHASE TRANSITION SCHEMA CLEANUP MIGRATION (UP)
-- ======================================================================
-- This migration resolves critical schema conflicts that prevent proper
-- phase transition functionality, including domain disappearance and
-- progress reset issues.
--
-- FIXES:
-- 1. Progress calculation conflicts between old (25/50/75%) and new (33/66/100%) systems
-- 2. Auto-update trigger interference with phase transition logic
-- 3. Domain metrics update race conditions
-- 4. Schema inconsistencies from dual architecture elimination
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. BACKUP: Create backup tables for rollback safety
-- ======================================================================
CREATE TABLE IF NOT EXISTS campaigns_backup_000038 AS 
SELECT * FROM campaigns LIMIT 0;

INSERT INTO campaigns_backup_000038 SELECT * FROM campaigns;

COMMENT ON TABLE campaigns_backup_000038 IS 'Backup table for migration 000038 - phase transition schema cleanup';

-- ======================================================================
-- 2. CRITICAL FIX: Remove conflicting auto-update triggers
-- ======================================================================
-- These triggers from migration 000035 interfere with phase transition logic
-- by automatically updating campaign metrics when domains change, potentially
-- overriding our manual progress tracking during transitions

DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_insert ON generated_domains;
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_update ON generated_domains;
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_delete ON generated_domains;

-- Drop the function as well to prevent conflicts
DROP FUNCTION IF EXISTS update_campaign_metrics();

-- ======================================================================
-- 3. CRITICAL FIX: Create NON-INTERFERING trigger for domain metrics
-- ======================================================================
-- Create a new trigger that ONLY updates domain counts, NOT progress
-- This prevents interference with phase transition progress tracking

CREATE OR REPLACE FUNCTION update_campaign_domain_counts_only()
RETURNS TRIGGER AS $$
BEGIN
    -- ONLY update domain counts, DO NOT touch progress or phase fields
    -- This prevents interference with phase transition logic
    UPDATE campaigns 
    SET 
        domains = (
            SELECT COUNT(*) 
            FROM generated_domains 
            WHERE domain_generation_campaign_id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id)
        ),
        dns_validated_domains = (
            SELECT COUNT(*) 
            FROM generated_domains 
            WHERE domain_generation_campaign_id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id)
            AND dns_status = 'ok'
        ),
        http_validated_domains = (
            SELECT COUNT(*) 
            FROM generated_domains 
            WHERE domain_generation_campaign_id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id)
            AND http_status = 'ok'
        ),
        leads = (
            SELECT COUNT(*) 
            FROM generated_domains 
            WHERE domain_generation_campaign_id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id)
            AND lead_score > 0
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id)
    -- CRITICAL: DO NOT update progress, current_phase, or phase_status
    -- Let the application handle those during phase transitions
    ;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create new non-interfering triggers
CREATE TRIGGER trigger_update_domain_counts_insert
    AFTER INSERT ON generated_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_domain_counts_only();

CREATE TRIGGER trigger_update_domain_counts_update
    AFTER UPDATE ON generated_domains
    FOR EACH ROW
    WHEN (OLD.dns_status IS DISTINCT FROM NEW.dns_status 
          OR OLD.http_status IS DISTINCT FROM NEW.http_status 
          OR OLD.lead_score IS DISTINCT FROM NEW.lead_score)
    EXECUTE FUNCTION update_campaign_domain_counts_only();

CREATE TRIGGER trigger_update_domain_counts_delete
    AFTER DELETE ON generated_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_domain_counts_only();

-- ======================================================================
-- 4. CRITICAL FIX: Update hardcoded progress calculation logic
-- ======================================================================
-- Migration 000035 had hardcoded progress ranges that conflict with our
-- new multi-phase system (0-33% generation, 33-66% DNS, 66-100% HTTP)

-- Remove the old hardcoded progress calculation from migration 000035
-- and replace with proper phase-based progress initialization

-- Reset any campaigns that have old hardcoded progress values
UPDATE campaigns 
SET progress = CASE 
    -- Phase-based progress calculation (NEW SYSTEM)
    WHEN current_phase = 'setup' THEN 0.0
    WHEN current_phase = 'generation' THEN 
        CASE 
            WHEN phase_status = 'completed' THEN 33.0
            WHEN phase_status = 'in_progress' THEN LEAST(33.0, COALESCE(progress_percentage, 10.0) * 0.33)
            ELSE 0.0
        END
    WHEN current_phase = 'dns_validation' THEN 
        CASE 
            WHEN phase_status = 'completed' THEN 66.0
            WHEN phase_status = 'in_progress' THEN 33.0 + LEAST(33.0, COALESCE(progress_percentage, 10.0) * 0.33)
            ELSE 33.0
        END
    WHEN current_phase = 'http_keyword_validation' THEN 
        CASE 
            WHEN phase_status = 'completed' THEN 100.0
            WHEN phase_status = 'in_progress' THEN 66.0 + LEAST(34.0, COALESCE(progress_percentage, 10.0) * 0.34)
            ELSE 66.0
        END
    WHEN current_phase = 'analysis' THEN 100.0
    ELSE COALESCE(progress, 0.0)
END
WHERE progress IS NULL 
   OR progress NOT BETWEEN 0.0 AND 100.0
   OR (current_phase = 'generation' AND phase_status = 'completed' AND progress != 33.0)
   OR (current_phase = 'dns_validation' AND phase_status = 'completed' AND progress != 66.0)
   OR (current_phase = 'http_keyword_validation' AND phase_status = 'completed' AND progress != 100.0);

-- ======================================================================
-- 5. SCHEMA CONSISTENCY: Ensure all required columns exist
-- ======================================================================

-- Ensure domains status fields exist with proper constraints
ALTER TABLE generated_domains 
ADD COLUMN IF NOT EXISTS dns_status TEXT CHECK (dns_status IN ('pending', 'ok', 'error', 'timeout')),
ADD COLUMN IF NOT EXISTS http_status TEXT CHECK (http_status IN ('pending', 'ok', 'error', 'timeout')),
ADD COLUMN IF NOT EXISTS lead_score DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE;

-- Initialize domain status for domains that don't have status set
UPDATE generated_domains 
SET dns_status = 'pending' 
WHERE dns_status IS NULL;

UPDATE generated_domains 
SET http_status = 'pending' 
WHERE http_status IS NULL;

UPDATE generated_domains 
SET lead_score = 0.0 
WHERE lead_score IS NULL;

-- ======================================================================
-- 6. DNS VALIDATION RESULTS: Fix business status consistency
-- ======================================================================

-- Ensure DNS validation results have consistent business status
-- Map validation_status to allowed business_status values only
UPDATE dns_validation_results
SET business_status = CASE
    WHEN validation_status = 'resolved' THEN 'valid_dns'
    WHEN validation_status = 'unresolved' THEN 'processing_failed_before_http'
    WHEN validation_status = 'timeout' THEN 'processing_failed_before_http'
    WHEN validation_status = 'error' THEN 'processing_failed_before_http'
    ELSE NULL  -- Leave as NULL if no clear mapping
END
WHERE business_status IS NULL OR business_status = '';

-- ======================================================================
-- 7. CAMPAIGN JOBS: Ensure job type consistency
-- ======================================================================

-- Ensure all campaign job types use phase-based enums
UPDATE campaign_jobs 
SET job_type = CASE 
    WHEN job_type = 'domain_generation' THEN 'generation'
    WHEN job_type IN ('generation', 'dns_validation', 'http_keyword_validation', 'analysis') THEN job_type
    ELSE 'generation'
END;

-- ======================================================================
-- 8. PERFORMANCE: Add optimized indexes for phase transitions
-- ======================================================================

-- Remove any old indexes that might conflict
DROP INDEX IF EXISTS idx_campaigns_domain_metrics;
DROP INDEX IF EXISTS idx_campaigns_phase_updated;

-- Create optimized indexes for phase transition queries
CREATE INDEX IF NOT EXISTS idx_campaigns_phase_transition_lookup 
ON campaigns(current_phase, phase_status, id);

CREATE INDEX IF NOT EXISTS idx_campaigns_progress_tracking 
ON campaigns(current_phase, progress, updated_at);

-- Domain status lookup optimization
CREATE INDEX IF NOT EXISTS idx_generated_domains_status_lookup 
ON generated_domains(domain_generation_campaign_id, dns_status, http_status);

-- Phase transition validation index
CREATE INDEX IF NOT EXISTS idx_generated_domains_validation_status 
ON generated_domains(dns_status, http_status, last_validated_at);

-- ======================================================================
-- 9. DATA INTEGRITY: Cleanup orphaned records
-- ======================================================================

-- Remove DNS validation results for campaigns that don't exist
DELETE FROM dns_validation_results 
WHERE dns_campaign_id NOT IN (SELECT id FROM campaigns);

-- Remove HTTP keyword results for campaigns that don't exist
DELETE FROM http_keyword_results 
WHERE http_keyword_campaign_id NOT IN (SELECT id FROM campaigns);

-- Remove campaign jobs for campaigns that don't exist
DELETE FROM campaign_jobs 
WHERE campaign_id NOT IN (SELECT id FROM campaigns);

-- Remove generated domains for campaigns that don't exist
DELETE FROM generated_domains 
WHERE domain_generation_campaign_id NOT IN (SELECT id FROM campaigns);

-- ======================================================================
-- 10. FINAL VALIDATION: Ensure data consistency
-- ======================================================================

-- Validate all campaigns have proper phase data
DO $$
DECLARE
    invalid_count INTEGER;
    progress_issues INTEGER;
BEGIN
    -- Check for invalid phase data
    SELECT COUNT(*) INTO invalid_count
    FROM campaigns 
    WHERE current_phase IS NULL 
       OR phase_status IS NULL 
       OR current_phase NOT IN ('setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis')
       OR phase_status NOT IN ('not_started', 'in_progress', 'paused', 'completed', 'failed');
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Data integrity check failed: % campaigns have invalid phase data', invalid_count;
    END IF;
    
    -- Check for progress consistency issues
    SELECT COUNT(*) INTO progress_issues
    FROM campaigns 
    WHERE progress IS NULL 
       OR progress < 0.0 
       OR progress > 100.0
       OR (current_phase = 'generation' AND phase_status = 'completed' AND progress < 30.0)
       OR (current_phase = 'dns_validation' AND phase_status = 'completed' AND progress < 60.0);
    
    IF progress_issues > 0 THEN
        RAISE WARNING 'Found % campaigns with progress consistency issues - these will be auto-corrected by the application', progress_issues;
    END IF;
    
    RAISE NOTICE 'Phase transition schema cleanup validated: % campaigns checked', (SELECT COUNT(*) FROM campaigns);
END $$;

-- Update statistics for query planner
ANALYZE campaigns;
ANALYZE generated_domains;
ANALYZE dns_validation_results;
ANALYZE http_keyword_results;

COMMIT;

-- ======================================================================
-- MIGRATION COMPLETE - PHASE TRANSITION SCHEMA CLEANED UP
-- ======================================================================
-- Key fixes applied:
-- 1. Removed interfering auto-update triggers
-- 2. Fixed progress calculation conflicts (33/66/100% system)
-- 3. Enhanced domain status consistency
-- 4. Optimized indexes for phase transitions
-- 5. Cleaned up orphaned data
-- 
-- Domain disappearance and progress reset issues should now be resolved
-- ======================================================================