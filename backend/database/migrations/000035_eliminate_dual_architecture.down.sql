-- ======================================================================
-- ELIMINATE DUAL ARCHITECTURE MIGRATION (DOWN/ROLLBACK)
-- ======================================================================
-- This migration rolls back the dual architecture elimination,
-- restoring legacy campaign-type fields and indexes.
--
-- WARNING: This rollback will restore dual architecture performance issues
-- USE ONLY in emergency situations
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. EMERGENCY ROLLBACK: Restore from backup if available
-- ======================================================================

-- Check if backup table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'campaigns_backup_000035') THEN
        RAISE NOTICE 'Backup table found - emergency rollback available';
    ELSE
        RAISE NOTICE 'No backup table found - proceeding with schema rollback only';
    END IF;
END $$;

-- ======================================================================
-- 2. RESTORE LEGACY COLUMNS: Add back dual architecture fields
-- ======================================================================

-- Add back legacy campaign_type column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS campaign_type TEXT;

-- Add back legacy status column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS status TEXT;

-- Add back launch_sequence column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS launch_sequence BOOLEAN DEFAULT false;

-- ======================================================================
-- 3. DATA RESTORATION: Map phases-based data back to legacy format
-- ======================================================================

-- Map current_phase back to campaign_type
UPDATE campaigns 
SET campaign_type = CASE 
    WHEN current_phase = 'generation' THEN 'domain_generation'
    WHEN current_phase = 'dns_validation' THEN 'dns_validation'
    WHEN current_phase = 'http_keyword_validation' THEN 'http_keyword_validation'
    WHEN current_phase = 'analysis' THEN 'analysis'
    WHEN current_phase = 'setup' THEN 'domain_generation'  -- Default setup to domain_generation
    ELSE 'domain_generation'  -- Fallback
END
WHERE campaign_type IS NULL;

-- Map phase_status back to legacy status
UPDATE campaigns 
SET status = CASE 
    WHEN phase_status = 'not_started' THEN 'pending'
    WHEN phase_status = 'in_progress' THEN 'running'
    WHEN phase_status = 'paused' THEN 'paused'
    WHEN phase_status = 'completed' THEN 'completed'
    WHEN phase_status = 'failed' THEN 'failed'
    ELSE 'pending'  -- Fallback
END
WHERE status IS NULL;

-- Set default launch_sequence to false for all campaigns
UPDATE campaigns 
SET launch_sequence = false 
WHERE launch_sequence IS NULL;

-- ======================================================================
-- 4. RESTORE LEGACY CONSTRAINTS: Add back original checks
-- ======================================================================

-- Add legacy campaign_type constraint
ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_campaign_type_check 
CHECK (campaign_type IN ('domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis', 'comprehensive', 'automated'));

-- Add legacy status constraint
ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'archived', 'cancelled'));

-- Make legacy columns NOT NULL
ALTER TABLE campaigns 
ALTER COLUMN campaign_type SET NOT NULL,
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN launch_sequence SET NOT NULL;

-- ======================================================================
-- 5. REMOVE PHASES-BASED OPTIMIZATION: Drop new indexes
-- ======================================================================

-- Drop phases-based indexes
DROP INDEX IF EXISTS idx_campaigns_current_phase;
DROP INDEX IF EXISTS idx_campaigns_phase_status;
DROP INDEX IF EXISTS idx_campaigns_phase_status_user;
DROP INDEX IF EXISTS idx_campaigns_phase_updated;
DROP INDEX IF EXISTS idx_campaigns_phase_created;
DROP INDEX IF EXISTS idx_campaigns_progress_tracking;
DROP INDEX IF EXISTS idx_campaigns_domain_metrics;

-- Drop generated_domains optimization indexes
DROP INDEX IF EXISTS idx_generated_domains_campaign_dns_status;
DROP INDEX IF EXISTS idx_generated_domains_campaign_http_status;
DROP INDEX IF EXISTS idx_generated_domains_lead_score;
DROP INDEX IF EXISTS idx_generated_domains_validation_pending;

-- ======================================================================
-- 6. RESTORE LEGACY INDEXES: Recreate original campaign-type indexes
-- ======================================================================

-- Restore legacy campaign indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_type 
ON campaigns(campaign_type);

CREATE INDEX IF NOT EXISTS idx_campaigns_status 
ON campaigns(status);

CREATE INDEX IF NOT EXISTS idx_campaigns_launch_sequence 
ON campaigns(launch_sequence);

-- Restore composite indexes for legacy query patterns
CREATE INDEX IF NOT EXISTS idx_campaigns_type_status 
ON campaigns(campaign_type, status);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_type_status 
ON campaigns(user_id, campaign_type, status);

-- ======================================================================
-- 7. REMOVE PHASES-BASED TRIGGERS: Clean up automation
-- ======================================================================

-- Drop phases-based triggers
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_insert ON generated_domains;
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_update ON generated_domains;
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_delete ON generated_domains;

-- Drop the phases-based metrics function
DROP FUNCTION IF EXISTS update_campaign_metrics();

-- ======================================================================
-- 8. REMOVE PHASES-BASED VIEWS: Clean up performance monitoring
-- ======================================================================

-- Drop phases-based performance view
DROP VIEW IF EXISTS campaign_performance_metrics;

-- ======================================================================
-- 9. EMERGENCY DATA RESTORE: If backup exists, offer to restore
-- ======================================================================

-- Create emergency restore procedure (commented out for safety)
/*
-- EMERGENCY RESTORE PROCEDURE - UNCOMMENT ONLY IN DIRE EMERGENCY
-- This will completely restore campaigns table from backup

DO $$
DECLARE
    backup_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'campaigns_backup_000035'
    ) INTO backup_exists;
    
    IF backup_exists THEN
        -- DANGER: This will lose all data changes since migration
        -- DELETE FROM campaigns;
        -- INSERT INTO campaigns SELECT * FROM campaigns_backup_000035;
        RAISE NOTICE 'Emergency restore available but not executed - uncomment if needed';
    END IF;
END $$;
*/

-- ======================================================================
-- 10. OPTIONAL: Remove phases-based columns (if full rollback desired)
-- ======================================================================

-- WARNING: Uncomment these lines only if you want to completely remove phases-based architecture
-- This will cause data loss and is generally not recommended

/*
-- Drop phases-based constraints first
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_current_phase_check;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_phase_status_check;

-- Drop phases-based columns
ALTER TABLE campaigns 
DROP COLUMN IF EXISTS current_phase,
DROP COLUMN IF EXISTS phase_status,
DROP COLUMN IF EXISTS progress,
DROP COLUMN IF EXISTS domains,
DROP COLUMN IF EXISTS leads,
DROP COLUMN IF EXISTS dns_validated_domains,
DROP COLUMN IF EXISTS http_validated_domains;
*/

-- ======================================================================
-- 11. UPDATE STATISTICS: Optimize for legacy query patterns
-- ======================================================================

-- Update statistics for legacy indexes
ANALYZE campaigns;

-- ======================================================================
-- 12. VALIDATION: Ensure rollback integrity
-- ======================================================================

-- Validate all campaigns have valid legacy data
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM campaigns 
    WHERE campaign_type IS NULL 
       OR status IS NULL 
       OR campaign_type NOT IN ('domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis', 'comprehensive', 'automated')
       OR status NOT IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'archived', 'cancelled');
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Rollback integrity check failed: % campaigns have invalid legacy data', invalid_count;
    END IF;
    
    RAISE NOTICE 'Rollback integrity validated: All campaigns have valid legacy data';
END $$;

COMMIT;

-- ======================================================================
-- ROLLBACK COMPLETE - DUAL ARCHITECTURE RESTORED
-- ======================================================================
-- WARNING: Performance degradation expected due to dual architecture
-- Phases-based optimizations have been removed
-- Legacy campaign-type architecture has been restored
-- Consider running VACUUM ANALYZE for optimal performance
-- ======================================================================

-- Cleanup instructions
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ROLLBACK COMPLETE - IMPORTANT NEXT STEPS:';
    RAISE NOTICE '1. Run VACUUM ANALYZE campaigns; for performance optimization';
    RAISE NOTICE '2. Monitor query performance - expect degradation vs phases-based architecture';
    RAISE NOTICE '3. Consider re-running phases migration after fixing issues';
    RAISE NOTICE '4. Backup table campaigns_backup_000035 can be dropped if rollback is stable';
    RAISE NOTICE '============================================================';
END $$;