-- ======================================================================
-- EMERGENCY DATA ROLLBACK SCRIPT
-- ======================================================================
-- This script provides emergency rollback capabilities for the phases-based
-- migration, restoring data from backup tables to previous state.
--
-- WARNING: This will LOSE all changes made after migration
-- USE ONLY in emergency situations when migration cannot be fixed
-- ======================================================================

-- Set transaction isolation for data consistency
SET default_transaction_isolation = 'serializable';

BEGIN;

-- ======================================================================
-- 1. PRE-ROLLBACK VALIDATION: Ensure rollback is safe and necessary
-- ======================================================================

\echo '============================================================'
\echo 'EMERGENCY DATA ROLLBACK - DANGER ZONE'
\echo '============================================================'
\echo 'WARNING: This will restore all campaign data to pre-migration state'
\echo 'All changes made after migration will be PERMANENTLY LOST'
\echo '============================================================'

-- Check if backup tables exist
DO $$
DECLARE
    campaigns_backup_exists BOOLEAN;
    domains_backup_exists BOOLEAN;
    backup_timestamp TIMESTAMP;
    current_campaigns INTEGER;
    backup_campaigns INTEGER;
BEGIN
    -- Check for campaign backup
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'campaigns_pre_migration_backup'
    ) INTO campaigns_backup_exists;
    
    -- Check for domains backup  
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'generated_domains_pre_migration_backup'
    ) INTO domains_backup_exists;
    
    IF NOT campaigns_backup_exists THEN
        RAISE EXCEPTION 'ROLLBACK ABORTED: No campaign backup table found';
    END IF;
    
    IF NOT domains_backup_exists THEN
        RAISE WARNING 'No domains backup table found - domain data rollback skipped';
    END IF;
    
    -- Get backup information
    IF campaigns_backup_exists THEN
        SELECT MIN(backup_timestamp) INTO backup_timestamp 
        FROM campaigns_pre_migration_backup;
        
        SELECT COUNT(*) INTO current_campaigns FROM campaigns;
        SELECT COUNT(*) INTO backup_campaigns FROM campaigns_pre_migration_backup;
        
        RAISE NOTICE 'Backup information:';
        RAISE NOTICE '- Backup timestamp: %', backup_timestamp;
        RAISE NOTICE '- Current campaigns: %', current_campaigns;
        RAISE NOTICE '- Backup campaigns: %', backup_campaigns;
        
        -- Require manual confirmation for rollback
        IF backup_timestamp < NOW() - INTERVAL '7 days' THEN
            RAISE WARNING 'Backup is older than 7 days - rollback may not be advisable';
        END IF;
    END IF;
    
    RAISE NOTICE 'Backup validation completed - proceeding with rollback';
END $$;

-- ======================================================================
-- 2. CREATE CURRENT STATE BACKUP: Backup current state before rollback
-- ======================================================================

\echo ''
\echo 'Creating current state backup before rollback...'

-- Create backup of current state for potential re-rollback
CREATE TABLE IF NOT EXISTS campaigns_pre_rollback_backup AS 
SELECT *, NOW() as rollback_backup_timestamp FROM campaigns;

CREATE TABLE IF NOT EXISTS generated_domains_pre_rollback_backup AS 
SELECT *, NOW() as rollback_backup_timestamp FROM generated_domains;

RAISE NOTICE 'Current state backed up to *_pre_rollback_backup tables';

-- ======================================================================
-- 3. ROLLBACK CAMPAIGNS TABLE: Restore from backup
-- ======================================================================

\echo ''
\echo 'Rolling back campaigns table...'

DO $$
DECLARE
    campaigns_restored INTEGER;
    campaigns_deleted INTEGER;
BEGIN
    -- Get count before rollback
    SELECT COUNT(*) INTO campaigns_deleted FROM campaigns;
    
    -- Delete all current campaign data
    DELETE FROM campaigns;
    
    -- Restore from backup (exclude backup_timestamp column)
    INSERT INTO campaigns (
        id, name, description, user_id, parameters, created_at, updated_at,
        started_at, completed_at, progress_percentage, total_items, processed_items,
        error_message, successful_items, failed_items, metadata,
        estimated_completion_at, avg_processing_rate, last_heartbeat_at, business_status,
        current_phase, phase_status, progress, domains, leads, dns_validated_domains, http_validated_domains
    )
    SELECT 
        id, name, description, user_id, parameters, created_at, updated_at,
        started_at, completed_at, progress_percentage, total_items, processed_items,
        error_message, successful_items, failed_items, metadata,
        estimated_completion_at, avg_processing_rate, last_heartbeat_at, business_status,
        NULL, NULL, NULL, NULL, NULL, NULL, NULL  -- Clear phases-based data
    FROM campaigns_pre_migration_backup;
    
    GET DIAGNOSTICS campaigns_restored = ROW_COUNT;
    
    RAISE NOTICE 'Campaigns rollback completed:';
    RAISE NOTICE '- Deleted current campaigns: %', campaigns_deleted;
    RAISE NOTICE '- Restored backup campaigns: %', campaigns_restored;
END $$;

-- ======================================================================
-- 4. ROLLBACK GENERATED DOMAINS: Restore domain data if backup exists
-- ======================================================================

\echo ''
\echo 'Rolling back generated domains table...'

DO $$
DECLARE
    domains_backup_exists BOOLEAN;
    domains_restored INTEGER;
    domains_deleted INTEGER;
BEGIN
    -- Check if domains backup exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'generated_domains_pre_migration_backup'
    ) INTO domains_backup_exists;
    
    IF domains_backup_exists THEN
        -- Get count before rollback
        SELECT COUNT(*) INTO domains_deleted FROM generated_domains;
        
        -- Delete all current domain data
        DELETE FROM generated_domains;
        
        -- Restore from backup (exclude backup_timestamp column)
        INSERT INTO generated_domains (
            id, domain_generation_campaign_id, domain_name, offset_index, 
            ip_address, dns_response_time_ms, created_at, dns_status, dns_ip,
            http_status, http_status_code, http_title, http_keywords, 
            lead_score, last_validated_at
        )
        SELECT 
            id, domain_generation_campaign_id, domain_name, offset_index,
            ip_address, dns_response_time_ms, created_at, dns_status, dns_ip,
            http_status, http_status_code, http_title, http_keywords,
            lead_score, last_validated_at
        FROM generated_domains_pre_migration_backup;
        
        GET DIAGNOSTICS domains_restored = ROW_COUNT;
        
        RAISE NOTICE 'Generated domains rollback completed:';
        RAISE NOTICE '- Deleted current domains: %', domains_deleted;
        RAISE NOTICE '- Restored backup domains: %', domains_restored;
    ELSE
        RAISE WARNING 'No generated domains backup found - domain rollback skipped';
    END IF;
END $$;

-- ======================================================================
-- 5. RESTORE LEGACY SCHEMA: Re-add legacy columns if needed
-- ======================================================================

\echo ''
\echo 'Restoring legacy schema columns...'

-- Add back legacy columns that may have been dropped
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS campaign_type TEXT,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS launch_sequence BOOLEAN DEFAULT false;

-- Restore legacy data from backup
UPDATE campaigns 
SET 
    campaign_type = backup.campaign_type,
    status = backup.status,
    launch_sequence = COALESCE(backup.launch_sequence, false)
FROM campaigns_pre_migration_backup backup
WHERE campaigns.id = backup.id;

-- Add legacy constraints
ALTER TABLE campaigns 
ADD CONSTRAINT IF NOT EXISTS campaigns_campaign_type_check 
CHECK (campaign_type IN ('domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis', 'comprehensive', 'automated'));

ALTER TABLE campaigns 
ADD CONSTRAINT IF NOT EXISTS campaigns_status_check 
CHECK (status IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'archived', 'cancelled'));

RAISE NOTICE 'Legacy schema columns restored';

-- ======================================================================
-- 6. REMOVE PHASES-BASED DATA: Clean phases columns if rollback complete
-- ======================================================================

\echo ''
\echo 'Cleaning phases-based data (optional)...'

-- Option to completely remove phases-based columns (commented for safety)
/*
-- WARNING: Uncomment these lines only if complete rollback to legacy architecture is desired
-- This will permanently remove all phases-based data

-- Drop phases-based constraints
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_current_phase_check;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_phase_status_check;

-- Clear phases-based data
UPDATE campaigns 
SET 
    current_phase = NULL,
    phase_status = NULL,
    progress = NULL,
    domains = NULL,
    leads = NULL,
    dns_validated_domains = NULL,
    http_validated_domains = NULL;

-- Optionally drop phases-based columns entirely
-- ALTER TABLE campaigns 
-- DROP COLUMN IF EXISTS current_phase,
-- DROP COLUMN IF EXISTS phase_status,
-- DROP COLUMN IF EXISTS progress,
-- DROP COLUMN IF EXISTS domains,
-- DROP COLUMN IF EXISTS leads,
-- DROP COLUMN IF EXISTS dns_validated_domains,
-- DROP COLUMN IF EXISTS http_validated_domains;
*/

-- Clear phases-based data while keeping columns for potential re-migration
UPDATE campaigns 
SET 
    current_phase = NULL,
    phase_status = NULL,
    progress = NULL,
    domains = NULL,
    leads = NULL,
    dns_validated_domains = NULL,
    http_validated_domains = NULL;

RAISE NOTICE 'Phases-based data cleared (columns preserved for potential re-migration)';

-- ======================================================================
-- 7. RESTORE LEGACY INDEXES: Re-create legacy indexes for performance
-- ======================================================================

\echo ''
\echo 'Restoring legacy indexes...'

-- Drop phases-based indexes
DROP INDEX IF EXISTS idx_campaigns_workflow_primary;
DROP INDEX IF EXISTS idx_campaigns_phase_transitions;
DROP INDEX IF EXISTS idx_campaigns_user_dashboard;
DROP INDEX IF EXISTS idx_campaigns_current_phase;
DROP INDEX IF EXISTS idx_campaigns_phase_status;

-- Restore legacy indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_launch_sequence ON campaigns(launch_sequence);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_type_status ON campaigns(user_id, campaign_type, status);

RAISE NOTICE 'Legacy indexes restored';

-- ======================================================================
-- 8. VALIDATION: Verify rollback integrity
-- ======================================================================

\echo ''
\echo 'Validating rollback integrity...'

DO $$
DECLARE
    current_count INTEGER;
    backup_count INTEGER;
    campaigns_with_legacy INTEGER;
    campaigns_without_phases INTEGER;
    integrity_issues INTEGER := 0;
BEGIN
    -- Count current vs backup campaigns
    SELECT COUNT(*) INTO current_count FROM campaigns;
    SELECT COUNT(*) INTO backup_count FROM campaigns_pre_migration_backup;
    
    -- Count campaigns with legacy data
    SELECT COUNT(*) INTO campaigns_with_legacy 
    FROM campaigns 
    WHERE campaign_type IS NOT NULL AND status IS NOT NULL;
    
    -- Count campaigns without phases data
    SELECT COUNT(*) INTO campaigns_without_phases
    FROM campaigns 
    WHERE current_phase IS NULL AND phase_status IS NULL;
    
    RAISE NOTICE 'Rollback validation results:';
    RAISE NOTICE '- Current campaigns: %', current_count;
    RAISE NOTICE '- Backup campaigns: %', backup_count;
    RAISE NOTICE '- Campaigns with legacy data: %', campaigns_with_legacy;
    RAISE NOTICE '- Campaigns without phases data: %', campaigns_without_phases;
    
    -- Check for integrity issues
    IF current_count != backup_count THEN
        integrity_issues := integrity_issues + 1;
        RAISE WARNING 'Campaign count mismatch: current % vs backup %', current_count, backup_count;
    END IF;
    
    IF campaigns_with_legacy < current_count THEN
        integrity_issues := integrity_issues + 1;
        RAISE WARNING 'Some campaigns missing legacy data: % of %', 
                      current_count - campaigns_with_legacy, current_count;
    END IF;
    
    IF integrity_issues > 0 THEN
        RAISE WARNING 'Rollback validation found % integrity issues', integrity_issues;
    ELSE
        RAISE NOTICE '✓ Rollback validation passed: Data integrity confirmed';
    END IF;
END $$;

-- ======================================================================
-- 9. UPDATE STATISTICS: Optimize for legacy query patterns  
-- ======================================================================

\echo ''
\echo 'Updating database statistics...'

-- Update statistics for legacy query patterns
ANALYZE campaigns;
ANALYZE generated_domains;

-- ======================================================================
-- 10. ROLLBACK SUMMARY AND CLEANUP INSTRUCTIONS
-- ======================================================================

\echo ''
\echo 'ROLLBACK COMPLETED'
\echo '============================================================'

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'EMERGENCY DATA ROLLBACK COMPLETED';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'WHAT WAS RESTORED:';
    RAISE NOTICE '- Campaign data restored from pre-migration backup';
    RAISE NOTICE '- Legacy schema columns (campaign_type, status) restored';
    RAISE NOTICE '- Legacy indexes re-created for performance';
    RAISE NOTICE '- Phases-based data cleared but columns preserved';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'WHAT WAS PRESERVED:';
    RAISE NOTICE '- Current state backed up to *_pre_rollback_backup tables';
    RAISE NOTICE '- Phases-based columns kept for potential re-migration';
    RAISE NOTICE '- Original backup tables preserved';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'CLEANUP RECOMMENDATIONS:';
    RAISE NOTICE '1. Run VACUUM ANALYZE for optimal performance';
    RAISE NOTICE '2. Monitor application functionality with legacy data';
    RAISE NOTICE '3. Consider dropping *_pre_rollback_backup tables if stable';
    RAISE NOTICE '4. Investigate and fix issues that required rollback';
    RAISE NOTICE '5. Plan re-migration after fixing root causes';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'EMERGENCY CONTACTS:';
    RAISE NOTICE '- Database Administrator for performance issues';
    RAISE NOTICE '- Development Team for application compatibility';
    RAISE NOTICE '- Migration Team for re-migration planning';
    RAISE NOTICE '============================================================';
END $$;

-- Create rollback status view
CREATE OR REPLACE VIEW rollback_status AS
SELECT 
    NOW() as rollback_timestamp,
    'EMERGENCY ROLLBACK COMPLETED' as status,
    (SELECT COUNT(*) FROM campaigns) as current_campaigns,
    (SELECT COUNT(*) FROM campaigns_pre_migration_backup) as backup_campaigns,
    (SELECT COUNT(*) FROM campaigns WHERE campaign_type IS NOT NULL) as campaigns_with_legacy_data,
    (SELECT COUNT(*) FROM campaigns WHERE current_phase IS NULL) as campaigns_without_phases_data;

COMMIT;

\echo ''
\echo 'Emergency rollback transaction committed successfully!'
\echo 'Check rollback_status view for summary information.'
\echo 'WARNING: All migration changes have been reverted!'