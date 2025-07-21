-- ======================================================================
-- CAMPAIGN DATA MIGRATION SCRIPT
-- ======================================================================
-- This script handles safe data transformation from campaign-type 
-- architecture to phases-based architecture with comprehensive validation.
--
-- SAFETY: This script can be run multiple times safely (idempotent)
-- USAGE: Run before or alongside migration 000035
-- ======================================================================

-- Set client encoding and transaction isolation
SET client_encoding = 'UTF8';
SET default_transaction_isolation = 'read committed';

BEGIN;

-- ======================================================================
-- 1. PRE-MIGRATION VALIDATION: Check data consistency
-- ======================================================================

-- Create temporary validation table for tracking migration progress
CREATE TEMP TABLE migration_validation (
    step_name TEXT PRIMARY KEY,
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details TEXT[]
);

-- Insert initial validation step
INSERT INTO migration_validation (step_name) VALUES ('pre_migration_validation');

-- Check for campaigns with invalid or missing data
DO $$
DECLARE
    invalid_campaigns INTEGER;
    orphaned_domains INTEGER;
    missing_users INTEGER;
BEGIN
    -- Check for campaigns with NULL essential fields
    SELECT COUNT(*) INTO invalid_campaigns
    FROM campaigns 
    WHERE name IS NULL OR user_id IS NULL;
    
    -- Check for orphaned domains
    SELECT COUNT(*) INTO orphaned_domains
    FROM generated_domains gd
    LEFT JOIN campaigns c ON gd.domain_generation_campaign_id = c.id
    WHERE c.id IS NULL;
    
    -- Check for campaigns with missing users
    SELECT COUNT(*) INTO missing_users
    FROM campaigns c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE u.id IS NULL;
    
    -- Log validation results
    RAISE NOTICE 'Pre-migration validation results:';
    RAISE NOTICE '- Invalid campaigns (NULL fields): %', invalid_campaigns;
    RAISE NOTICE '- Orphaned domains: %', orphaned_domains;
    RAISE NOTICE '- Campaigns with missing users: %', missing_users;
    
    -- Update validation record
    UPDATE migration_validation 
    SET 
        end_time = NOW(),
        records_processed = invalid_campaigns + orphaned_domains + missing_users,
        records_failed = invalid_campaigns + orphaned_domains + missing_users,
        error_details = ARRAY[
            'Invalid campaigns: ' || invalid_campaigns,
            'Orphaned domains: ' || orphaned_domains,
            'Missing users: ' || missing_users
        ]
    WHERE step_name = 'pre_migration_validation';
    
    -- Stop migration if critical issues found
    IF invalid_campaigns > 0 OR missing_users > 0 THEN
        RAISE EXCEPTION 'Critical data integrity issues found - migration aborted';
    END IF;
    
    IF orphaned_domains > 0 THEN
        RAISE WARNING 'Found % orphaned domains - these will be skipped', orphaned_domains;
    END IF;
END $$;

-- ======================================================================
-- 2. BACKUP CREATION: Create safety backups
-- ======================================================================

INSERT INTO migration_validation (step_name) VALUES ('backup_creation');

-- Create comprehensive backup tables
CREATE TABLE IF NOT EXISTS campaigns_pre_migration_backup AS 
SELECT *, NOW() as backup_timestamp FROM campaigns;

CREATE TABLE IF NOT EXISTS generated_domains_pre_migration_backup AS 
SELECT *, NOW() as backup_timestamp FROM generated_domains;

-- Log backup creation
UPDATE migration_validation 
SET 
    end_time = NOW(),
    records_processed = (SELECT COUNT(*) FROM campaigns) + (SELECT COUNT(*) FROM generated_domains),
    records_successful = (SELECT COUNT(*) FROM campaigns_pre_migration_backup) + (SELECT COUNT(*) FROM generated_domains_pre_migration_backup)
WHERE step_name = 'backup_creation';

RAISE NOTICE 'Backup tables created successfully';

-- ======================================================================
-- 3. LEGACY DATA MAPPING: Transform campaign types to phases
-- ======================================================================

INSERT INTO migration_validation (step_name) VALUES ('campaign_type_mapping');

-- Create mapping table for campaign type transformation
CREATE TEMP TABLE campaign_type_mapping AS
SELECT 
    id,
    name,
    campaign_type as legacy_type,
    status as legacy_status,
    CASE 
        WHEN campaign_type = 'domain_generation' THEN 'generation'
        WHEN campaign_type = 'dns_validation' THEN 'dns_validation'
        WHEN campaign_type = 'http_keyword_validation' THEN 'http_keyword_validation'
        WHEN campaign_type = 'analysis' THEN 'analysis'
        WHEN campaign_type = 'comprehensive' THEN 'generation'  -- Comprehensive starts at generation
        WHEN campaign_type = 'automated' THEN 'generation'      -- Automated starts at generation
        WHEN campaign_type ILIKE '%generation%' THEN 'generation'
        WHEN campaign_type ILIKE '%dns%' THEN 'dns_validation'
        WHEN campaign_type ILIKE '%http%' OR campaign_type ILIKE '%keyword%' THEN 'http_keyword_validation'
        WHEN campaign_type ILIKE '%analysis%' OR campaign_type ILIKE '%analyz%' THEN 'analysis'
        ELSE 'generation'  -- Safe default
    END as target_phase,
    CASE 
        WHEN status = 'pending' THEN 'not_started'
        WHEN status = 'queued' THEN 'not_started'
        WHEN status = 'running' THEN 'in_progress'
        WHEN status = 'pausing' THEN 'paused'
        WHEN status = 'paused' THEN 'paused'
        WHEN status = 'completed' THEN 'completed'
        WHEN status = 'failed' THEN 'failed'
        WHEN status = 'archived' THEN 'completed'  -- Treat archived as completed
        WHEN status = 'cancelled' THEN 'failed'    -- Treat cancelled as failed
        WHEN status = 'error' THEN 'failed'        -- Treat error as failed
        ELSE 'not_started'  -- Safe default
    END as target_status,
    user_id,
    created_at,
    updated_at
FROM campaigns
WHERE campaign_type IS NOT NULL OR status IS NOT NULL;

-- Log mapping results
DO $$
DECLARE
    total_campaigns INTEGER;
    mapped_campaigns INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_campaigns FROM campaigns;
    SELECT COUNT(*) INTO mapped_campaigns FROM campaign_type_mapping;
    
    UPDATE migration_validation 
    SET 
        end_time = NOW(),
        records_processed = total_campaigns,
        records_successful = mapped_campaigns,
        records_failed = total_campaigns - mapped_campaigns
    WHERE step_name = 'campaign_type_mapping';
    
    RAISE NOTICE 'Campaign type mapping completed: % of % campaigns mapped', mapped_campaigns, total_campaigns;
END $$;

-- ======================================================================
-- 4. DOMAIN METRICS CALCULATION: Aggregate domain statistics
-- ======================================================================

INSERT INTO migration_validation (step_name) VALUES ('domain_metrics_calculation');

-- Create domain metrics aggregation
CREATE TEMP TABLE campaign_domain_metrics AS
SELECT 
    c.id as campaign_id,
    COALESCE(COUNT(gd.id), 0) as total_domains,
    COALESCE(COUNT(gd.id) FILTER (WHERE gd.dns_status = 'ok'), 0) as dns_validated_domains,
    COALESCE(COUNT(gd.id) FILTER (WHERE gd.http_status = 'ok'), 0) as http_validated_domains,
    COALESCE(COUNT(gd.id) FILTER (WHERE gd.lead_score > 0), 0) as lead_count,
    COALESCE(AVG(gd.lead_score) FILTER (WHERE gd.lead_score > 0), 0) as avg_lead_score,
    COALESCE(MAX(gd.lead_score), 0) as max_lead_score,
    MIN(gd.created_at) as first_domain_created,
    MAX(gd.last_validated_at) as last_validation
FROM campaigns c
LEFT JOIN generated_domains gd ON gd.domain_generation_campaign_id = c.id
GROUP BY c.id;

-- Update validation
UPDATE migration_validation 
SET 
    end_time = NOW(),
    records_processed = (SELECT COUNT(*) FROM campaigns),
    records_successful = (SELECT COUNT(*) FROM campaign_domain_metrics)
WHERE step_name = 'domain_metrics_calculation';

RAISE NOTICE 'Domain metrics calculated for all campaigns';

-- ======================================================================
-- 5. PROGRESS CALCULATION: Determine realistic progress values
-- ======================================================================

INSERT INTO migration_validation (step_name) VALUES ('progress_calculation');

-- Create progress calculation based on campaign state and metrics
CREATE TEMP TABLE campaign_progress_calculation AS
SELECT 
    ctm.id,
    ctm.target_phase,
    ctm.target_status,
    cdm.total_domains,
    cdm.dns_validated_domains,
    cdm.http_validated_domains,
    cdm.lead_count,
    CASE 
        -- Completed campaigns get 100%
        WHEN ctm.target_status = 'completed' THEN 100.0
        
        -- Failed campaigns get 0%
        WHEN ctm.target_status = 'failed' THEN 0.0
        
        -- Not started campaigns get 0%
        WHEN ctm.target_status = 'not_started' THEN 0.0
        
        -- Paused campaigns get partial progress based on phase
        WHEN ctm.target_status = 'paused' THEN
            CASE ctm.target_phase
                WHEN 'generation' THEN LEAST(25.0, 15.0)
                WHEN 'dns_validation' THEN LEAST(50.0, 25.0 + (cdm.dns_validated_domains::float / NULLIF(cdm.total_domains, 0) * 25.0))
                WHEN 'http_keyword_validation' THEN LEAST(75.0, 50.0 + (cdm.http_validated_domains::float / NULLIF(cdm.total_domains, 0) * 25.0))
                WHEN 'analysis' THEN LEAST(95.0, 75.0 + (cdm.lead_count::float / NULLIF(cdm.total_domains, 0) * 20.0))
                ELSE 10.0
            END
            
        -- In progress campaigns get calculated progress based on phase and completion
        WHEN ctm.target_status = 'in_progress' THEN
            CASE ctm.target_phase
                WHEN 'generation' THEN 
                    CASE 
                        WHEN cdm.total_domains = 0 THEN 5.0
                        WHEN cdm.total_domains > 0 THEN LEAST(25.0, 20.0)
                        ELSE 10.0
                    END
                WHEN 'dns_validation' THEN 
                    25.0 + LEAST(25.0, (cdm.dns_validated_domains::float / NULLIF(cdm.total_domains, 0) * 25.0))
                WHEN 'http_keyword_validation' THEN 
                    50.0 + LEAST(25.0, (cdm.http_validated_domains::float / NULLIF(cdm.total_domains, 0) * 25.0))
                WHEN 'analysis' THEN 
                    75.0 + LEAST(20.0, (cdm.lead_count::float / NULLIF(cdm.total_domains, 0) * 20.0))
                ELSE 15.0
            END
        
        -- Default fallback
        ELSE 0.0
    END as calculated_progress
FROM campaign_type_mapping ctm
LEFT JOIN campaign_domain_metrics cdm ON ctm.id = cdm.campaign_id;

-- Update validation
UPDATE migration_validation 
SET 
    end_time = NOW(),
    records_processed = (SELECT COUNT(*) FROM campaign_type_mapping),
    records_successful = (SELECT COUNT(*) FROM campaign_progress_calculation)
WHERE step_name = 'progress_calculation';

RAISE NOTICE 'Progress calculation completed for all campaigns';

-- ======================================================================
-- 6. DATA TRANSFORMATION: Apply the actual migration
-- ======================================================================

INSERT INTO migration_validation (step_name) VALUES ('data_transformation');

DO $$
DECLARE
    campaigns_updated INTEGER := 0;
    campaigns_failed INTEGER := 0;
    error_details TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Update campaigns with phases-based data
    UPDATE campaigns 
    SET 
        current_phase = cpc.target_phase::TEXT,
        phase_status = cpc.target_status::TEXT,
        progress = cpc.calculated_progress,
        domains = cdm.total_domains,
        dns_validated_domains = cdm.dns_validated_domains,
        http_validated_domains = cdm.http_validated_domains,
        leads = cdm.lead_count,
        updated_at = NOW()
    FROM campaign_progress_calculation cpc
    JOIN campaign_domain_metrics cdm ON cpc.id = cdm.campaign_id
    WHERE campaigns.id = cpc.id;
    
    GET DIAGNOSTICS campaigns_updated = ROW_COUNT;
    
    -- Update validation record
    UPDATE migration_validation 
    SET 
        end_time = NOW(),
        records_processed = (SELECT COUNT(*) FROM campaigns),
        records_successful = campaigns_updated,
        records_failed = (SELECT COUNT(*) FROM campaigns) - campaigns_updated
    WHERE step_name = 'data_transformation';
    
    RAISE NOTICE 'Data transformation completed: % campaigns updated', campaigns_updated;
    
    IF campaigns_updated = 0 THEN
        RAISE WARNING 'No campaigns were updated - check data consistency';
    END IF;
END $$;

-- ======================================================================
-- 7. CONSTRAINT VALIDATION: Ensure data meets new constraints
-- ======================================================================

INSERT INTO migration_validation (step_name) VALUES ('constraint_validation');

DO $$
DECLARE
    invalid_phases INTEGER;
    invalid_status INTEGER;
    invalid_progress INTEGER;
BEGIN
    -- Check for invalid current_phase values
    SELECT COUNT(*) INTO invalid_phases
    FROM campaigns 
    WHERE current_phase IS NOT NULL 
    AND current_phase NOT IN ('setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis');
    
    -- Check for invalid phase_status values
    SELECT COUNT(*) INTO invalid_status
    FROM campaigns 
    WHERE phase_status IS NOT NULL 
    AND phase_status NOT IN ('not_started', 'in_progress', 'paused', 'completed', 'failed');
    
    -- Check for invalid progress values
    SELECT COUNT(*) INTO invalid_progress
    FROM campaigns 
    WHERE progress IS NOT NULL 
    AND (progress < 0 OR progress > 100);
    
    -- Log constraint validation results
    RAISE NOTICE 'Constraint validation results:';
    RAISE NOTICE '- Invalid phase values: %', invalid_phases;
    RAISE NOTICE '- Invalid status values: %', invalid_status;
    RAISE NOTICE '- Invalid progress values: %', invalid_progress;
    
    -- Update validation record
    UPDATE migration_validation 
    SET 
        end_time = NOW(),
        records_processed = (SELECT COUNT(*) FROM campaigns),
        records_successful = (SELECT COUNT(*) FROM campaigns) - invalid_phases - invalid_status - invalid_progress,
        records_failed = invalid_phases + invalid_status + invalid_progress,
        error_details = ARRAY[
            'Invalid phases: ' || invalid_phases,
            'Invalid status: ' || invalid_status,
            'Invalid progress: ' || invalid_progress
        ]
    WHERE step_name = 'constraint_validation';
    
    -- Fail migration if constraints violated
    IF invalid_phases > 0 OR invalid_status > 0 OR invalid_progress > 0 THEN
        RAISE EXCEPTION 'Constraint validation failed - data does not meet phases-based requirements';
    END IF;
END $$;

-- ======================================================================
-- 8. FINAL VALIDATION: Comprehensive data integrity check
-- ======================================================================

INSERT INTO migration_validation (step_name) VALUES ('final_validation');

DO $$
DECLARE
    total_campaigns INTEGER;
    migrated_campaigns INTEGER;
    campaigns_with_metrics INTEGER;
    orphaned_data INTEGER;
BEGIN
    -- Count total campaigns
    SELECT COUNT(*) INTO total_campaigns FROM campaigns;
    
    -- Count successfully migrated campaigns
    SELECT COUNT(*) INTO migrated_campaigns 
    FROM campaigns 
    WHERE current_phase IS NOT NULL AND phase_status IS NOT NULL;
    
    -- Count campaigns with proper metrics
    SELECT COUNT(*) INTO campaigns_with_metrics 
    FROM campaigns 
    WHERE domains IS NOT NULL AND leads IS NOT NULL;
    
    -- Check for orphaned data
    SELECT COUNT(*) INTO orphaned_data
    FROM generated_domains gd
    LEFT JOIN campaigns c ON gd.domain_generation_campaign_id = c.id
    WHERE c.id IS NULL;
    
    -- Log final validation results
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'MIGRATION VALIDATION SUMMARY';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total campaigns: %', total_campaigns;
    RAISE NOTICE 'Successfully migrated: %', migrated_campaigns;
    RAISE NOTICE 'Campaigns with metrics: %', campaigns_with_metrics;
    RAISE NOTICE 'Orphaned domains: %', orphaned_data;
    RAISE NOTICE 'Migration success rate: %%%', ROUND((migrated_campaigns::float / NULLIF(total_campaigns, 0)) * 100, 2);
    RAISE NOTICE '============================================================';
    
    -- Update final validation record
    UPDATE migration_validation 
    SET 
        end_time = NOW(),
        records_processed = total_campaigns,
        records_successful = migrated_campaigns,
        records_failed = total_campaigns - migrated_campaigns,
        error_details = ARRAY['Orphaned domains: ' || orphaned_data]
    WHERE step_name = 'final_validation';
    
    -- Require 100% success rate for migration completion
    IF migrated_campaigns < total_campaigns THEN
        RAISE EXCEPTION 'Migration incomplete: % of % campaigns failed to migrate', 
                        total_campaigns - migrated_campaigns, total_campaigns;
    END IF;
    
    RAISE NOTICE 'Data migration completed successfully!';
END $$;

-- ======================================================================
-- 9. MIGRATION REPORT: Generate detailed migration report
-- ======================================================================

-- Create migration report
SELECT 
    step_name,
    start_time,
    end_time,
    EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds,
    records_processed,
    records_successful,
    records_failed,
    ROUND((records_successful::float / NULLIF(records_processed, 0)) * 100, 2) as success_rate_percent,
    error_details
FROM migration_validation
ORDER BY start_time;

COMMIT;

-- ======================================================================
-- DATA MIGRATION COMPLETE
-- ======================================================================
-- All campaign data has been successfully transformed to phases-based architecture
-- Backup tables available for emergency rollback
-- Run validate-migration.sql to perform additional verification
-- ======================================================================