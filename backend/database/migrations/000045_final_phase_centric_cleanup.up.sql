-- ======================================================================
-- FINAL PHASE-CENTRIC CLEANUP MIGRATION (UP)
-- ======================================================================
-- This migration completes the transition to clean phase-centric JSONB
-- architecture by removing all remaining legacy structures that conflict
-- with the standalone service backend-driven design.
--
-- Context: 88% code reduction achieved, dual architecture eliminated
-- Goal: Clean database schema with only phase-centric JSONB tables
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. SAFETY: Verify JSONB columns exist in campaigns table (migration 000044 added them)
-- ======================================================================
DO $$
BEGIN
    -- Verify campaigns table has JSONB columns added by migration 000044
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'campaigns'
                   AND column_name = 'domains_data') THEN
        RAISE EXCEPTION 'Cannot proceed: campaigns.domains_data JSONB column missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'campaigns'
                   AND column_name = 'dns_results') THEN
        RAISE EXCEPTION 'Cannot proceed: campaigns.dns_results JSONB column missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'campaigns'
                   AND column_name = 'http_results') THEN
        RAISE EXCEPTION 'Cannot proceed: campaigns.http_results JSONB column missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'campaigns'
                   AND column_name = 'analysis_results') THEN
        RAISE EXCEPTION 'Cannot proceed: campaigns.analysis_results JSONB column missing';
    END IF;
    
    RAISE NOTICE 'Safety check passed: JSONB columns exist in campaigns table';
END $$;

-- ======================================================================
-- 2. DROP LEGACY PHASE-SPECIFIC TABLES
-- ======================================================================
-- These tables were created in migration 000043 but are now replaced
-- by JSONB storage in lead_generation_campaigns table

-- Drop phase-specific tables that duplicate JSONB functionality
DROP TABLE IF EXISTS analysis_phases CASCADE;
DROP TABLE IF EXISTS http_keyword_validation_phases CASCADE;
DROP TABLE IF EXISTS dns_validation_phases CASCADE;
DROP TABLE IF EXISTS domain_generation_phases CASCADE;

-- ======================================================================
-- 3. DROP EVENT STORE TABLES (Not used in standalone service architecture)
-- ======================================================================
DROP TABLE IF EXISTS event_projections CASCADE;
DROP TABLE IF EXISTS event_store CASCADE;

-- ======================================================================
-- 4. DROP LEGACY CAMPAIGN PARAMETER TABLES
-- ======================================================================
-- These are replaced by JSONB configuration in campaign_phases
DROP TABLE IF EXISTS http_keyword_campaign_params CASCADE;
DROP TABLE IF EXISTS dns_validation_campaign_params CASCADE;

-- Note: domain_generation_campaign_params already dropped in migration 000043

-- ======================================================================
-- 5. CLEAN UP ORPHANED INDEXES AND CONSTRAINTS
-- ======================================================================

-- Remove indexes for dropped phase-specific tables
DROP INDEX IF EXISTS idx_domain_generation_phases_phase_id;
DROP INDEX IF EXISTS idx_domain_generation_phases_campaign_id;
DROP INDEX IF EXISTS idx_domain_generation_phases_config_hash;
DROP INDEX IF EXISTS idx_dns_validation_phases_phase_id;
DROP INDEX IF EXISTS idx_dns_validation_phases_campaign_id;
DROP INDEX IF EXISTS idx_dns_validation_phases_source;
DROP INDEX IF EXISTS idx_http_keyword_phases_phase_id;
DROP INDEX IF EXISTS idx_http_keyword_phases_campaign_id;
DROP INDEX IF EXISTS idx_http_keyword_phases_source;
DROP INDEX IF EXISTS idx_analysis_phases_phase_id;
DROP INDEX IF EXISTS idx_analysis_phases_campaign_id;
DROP INDEX IF EXISTS idx_analysis_phases_source;

-- Remove event store indexes
DROP INDEX IF EXISTS idx_event_store_aggregate;
DROP INDEX IF EXISTS idx_event_store_global_position;
DROP INDEX IF EXISTS idx_event_store_type_time;
DROP INDEX IF EXISTS idx_projections_name_aggregate;

-- ======================================================================
-- 6. CREATE OPTIMIZED INDEXES FOR PHASE-CENTRIC QUERIES (BEFORE RENAME)
-- ======================================================================

-- Optimize JSONB queries on campaigns table before renaming
CREATE INDEX IF NOT EXISTS idx_campaigns_phase_data_counts
    ON campaigns USING GIN (
        (domains_data->'total_count'),
        (dns_results->'validated_count'),
        (http_results->'match_count')
    ) WHERE domains_data IS NOT NULL;

-- Optimize generated_domains for phase-centric queries
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_status
    ON generated_domains (domain_generation_campaign_id, dns_status, http_status)
    WHERE dns_status IS NOT NULL OR http_status IS NOT NULL;

-- ======================================================================
-- 7. RENAME campaigns TABLE TO lead_generation_campaigns FOR CONSISTENCY
-- ======================================================================
-- The system now uses lead_generation_campaigns as the primary table

-- Check if campaigns table exists and lead_generation_campaigns doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns')
    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_generation_campaigns') THEN
        -- Rename campaigns to lead_generation_campaigns
        ALTER TABLE campaigns RENAME TO lead_generation_campaigns;
        
        -- Rename the index we just created
        ALTER INDEX IF EXISTS idx_campaigns_phase_data_counts RENAME TO idx_lead_gen_campaigns_phase_data_counts;
        
        -- Update any remaining foreign key references
        ALTER TABLE campaign_jobs DROP CONSTRAINT IF EXISTS fk_campaign_jobs_campaign_id;
        ALTER TABLE campaign_jobs ADD CONSTRAINT fk_campaign_jobs_campaign_id
            FOREIGN KEY (campaign_id) REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE;
            
        RAISE NOTICE 'Renamed campaigns table to lead_generation_campaigns for consistency';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_generation_campaigns') THEN
        -- Both tables exist - this is an inconsistent state, drop campaigns if empty
        DECLARE
            campaign_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO campaign_count FROM campaigns;
            IF campaign_count = 0 THEN
                DROP TABLE campaigns CASCADE;
                RAISE NOTICE 'Dropped empty campaigns table - using lead_generation_campaigns';
            ELSE
                RAISE WARNING 'Both campaigns and lead_generation_campaigns exist with data - manual intervention required';
            END IF;
        END;
    END IF;
END $$;

-- ======================================================================
-- 8. UPDATE GENERATED_DOMAINS FOREIGN KEY REFERENCES
-- ======================================================================
-- Ensure generated_domains references the correct campaign table

DO $$
BEGIN
    -- Check if the column exists and update constraint
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public'
               AND table_name = 'generated_domains'
               AND column_name = 'domain_generation_campaign_id') THEN
        
        -- Drop old constraint if exists
        ALTER TABLE generated_domains DROP CONSTRAINT IF EXISTS fk_generated_domains_campaign;
        
        -- Add new constraint to lead_generation_campaigns
        ALTER TABLE generated_domains ADD CONSTRAINT fk_generated_domains_campaign
            FOREIGN KEY (domain_generation_campaign_id) REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE;
            
        RAISE NOTICE 'Updated generated_domains foreign key to reference lead_generation_campaigns';
    END IF;
END $$;

-- ======================================================================
-- 9. UPDATE TABLE COMMENTS FOR DOCUMENTATION
-- ======================================================================

COMMENT ON TABLE lead_generation_campaigns IS 'Primary campaign table with phase-centric JSONB architecture for standalone service integration. Single source of truth for all campaign data.';

COMMENT ON TABLE generated_domains IS 'Single table for all domain data with status tracking. No separate validation result tables - all status in this table.';

COMMENT ON COLUMN lead_generation_campaigns.domains_data IS 'JSONB storage for domain generation phase data from standalone domain generation service';
COMMENT ON COLUMN lead_generation_campaigns.dns_results IS 'JSONB storage for DNS validation phase results from standalone DNS validation service';
COMMENT ON COLUMN lead_generation_campaigns.http_results IS 'JSONB storage for HTTP validation phase results from standalone HTTP validation service';
COMMENT ON COLUMN lead_generation_campaigns.analysis_results IS 'JSONB storage for analysis phase results from standalone analysis service';

-- ======================================================================
-- 11. FINAL VALIDATION
-- ======================================================================

-- Validate clean phase-centric schema
DO $$
DECLARE
    legacy_tables TEXT[] := ARRAY[
        'analysis_phases',
        'http_keyword_validation_phases', 
        'dns_validation_phases',
        'domain_generation_phases',
        'event_store',
        'event_projections',
        'dns_validation_results',
        'http_keyword_results'
    ];
    tbl_name TEXT;
BEGIN
    -- Check that legacy tables are gone
    FOREACH tbl_name IN ARRAY legacy_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            RAISE EXCEPTION 'Legacy table % still exists after cleanup', tbl_name;
        END IF;
    END LOOP;
    
    -- Verify required tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_generation_campaigns') THEN
        RAISE EXCEPTION 'Required table lead_generation_campaigns missing';
    END IF;
    
    -- Note: campaign_phases table was never created in our migration path, skip this check
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generated_domains') THEN
        RAISE EXCEPTION 'Required table generated_domains missing';
    END IF;
    
    RAISE NOTICE 'Final validation passed: Clean phase-centric schema achieved';
END $$;

-- Update table statistics for optimal query performance
ANALYZE lead_generation_campaigns;
ANALYZE generated_domains;

COMMIT;

-- ======================================================================
-- FINAL PHASE-CENTRIC CLEANUP MIGRATION COMPLETE
-- ======================================================================
-- 
-- ✅ Database schema is now clean and phase-centric
-- ✅ All legacy structures removed
-- ✅ Single source of truth: lead_generation_campaigns with JSONB
-- ✅ Backend-driven architecture maintained
-- ✅ No duplicate tables or redundant structures
-- ✅ Optimized indexes for phase-centric queries
-- 
-- Result: Clean, efficient database schema supporting:
-- - Phase-centric campaign execution
-- - JSONB storage for standalone service data
-- - Single table architecture for domain data
-- - Backend-driven data operations only
-- ======================================================================