-- ======================================================================
-- OPTIMIZE PHASES INDEXES MIGRATION (DOWN/ROLLBACK)
-- ======================================================================
-- This migration removes phases-optimized indexes and restores
-- basic indexing patterns for emergency rollback scenarios.
--
-- WARNING: This will significantly degrade query performance
-- USE ONLY in emergency situations
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. REMOVE SPECIALIZED PHASES INDEXES: Drop optimization indexes
-- ======================================================================

-- Drop core phases optimization indexes
DROP INDEX IF EXISTS idx_campaigns_workflow_primary;
DROP INDEX IF EXISTS idx_campaigns_phase_transitions;
DROP INDEX IF EXISTS idx_campaigns_user_dashboard;

-- Drop bulk processing optimization indexes
DROP INDEX IF EXISTS idx_campaigns_bulk_generation;
DROP INDEX IF EXISTS idx_campaigns_bulk_dns_validation;
DROP INDEX IF EXISTS idx_campaigns_bulk_http_validation;

-- ======================================================================
-- 2. REMOVE DOMAIN-CENTRIC OPTIMIZATION: Drop domain performance indexes
-- ======================================================================

-- Drop primary domain optimization indexes
DROP INDEX IF EXISTS idx_domains_campaign_validation_primary;
DROP INDEX IF EXISTS idx_domains_pending_validation;
DROP INDEX IF EXISTS idx_domains_lead_analytics;
DROP INDEX IF EXISTS idx_domains_validation_lookup;

-- ======================================================================
-- 3. REMOVE ANALYTICS INDEXES: Drop reporting optimization
-- ======================================================================

-- Drop analytics and reporting indexes
DROP INDEX IF EXISTS idx_campaigns_analytics_success;
DROP INDEX IF EXISTS idx_campaigns_temporal_analytics;
DROP INDEX IF EXISTS idx_campaigns_user_performance;

-- ======================================================================
-- 4. REMOVE SPECIALIZED INDEXES: Drop edge case optimization
-- ======================================================================

-- Drop specialized detection and monitoring indexes
DROP INDEX IF EXISTS idx_campaigns_stuck_detection;
DROP INDEX IF EXISTS idx_campaigns_cleanup;
DROP INDEX IF EXISTS idx_campaigns_progress_monitoring;

-- ======================================================================
-- 5. REMOVE BACKGROUND JOB OPTIMIZATION: Drop job processing indexes
-- ======================================================================

-- Drop campaign jobs optimization indexes
DROP INDEX IF EXISTS idx_campaign_jobs_processing;
DROP INDEX IF EXISTS idx_campaign_jobs_monitoring;

-- ======================================================================
-- 6. REMOVE FOREIGN KEY OPTIMIZATION: Drop relationship indexes
-- ======================================================================

-- Drop optimized foreign key indexes
DROP INDEX IF EXISTS idx_generated_domains_fk_campaign;
DROP INDEX IF EXISTS idx_campaign_jobs_fk_campaign;

-- ======================================================================
-- 7. REMOVE PARTIAL INDEXES: Drop memory-efficient indexes
-- ======================================================================

-- Drop partial indexes for active, recent, and high-value campaigns
DROP INDEX IF EXISTS idx_campaigns_active_only;
DROP INDEX IF EXISTS idx_campaigns_recent_only;
DROP INDEX IF EXISTS idx_campaigns_high_value;

-- ======================================================================
-- 8. REMOVE TEXT SEARCH OPTIMIZATION: Drop search indexes
-- ======================================================================

-- Drop text search indexes
DROP INDEX IF EXISTS idx_campaigns_name_search;
DROP INDEX IF EXISTS idx_domains_name_prefix;

-- ======================================================================
-- 9. REMOVE MAINTENANCE FUNCTIONS: Clean up optimization functions
-- ======================================================================

-- Drop maintenance function
DROP FUNCTION IF EXISTS maintain_phases_indexes();

-- Drop performance monitoring view
DROP VIEW IF EXISTS phases_index_performance;

-- ======================================================================
-- 10. RESTORE BASIC INDEXES: Add back simple single-column indexes
-- ======================================================================

-- Restore basic campaign indexes (non-optimized)
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id 
ON campaigns(user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_created_at 
ON campaigns(created_at);

CREATE INDEX IF NOT EXISTS idx_campaigns_updated_at 
ON campaigns(updated_at);

-- Restore basic current_phase and phase_status indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_campaigns_current_phase 
ON campaigns(current_phase);

CREATE INDEX IF NOT EXISTS idx_campaigns_phase_status 
ON campaigns(phase_status);

-- ======================================================================
-- 11. RESTORE BASIC DOMAIN INDEXES: Simple domain relationship indexes
-- ======================================================================

-- Restore basic generated_domains indexes
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_id 
ON generated_domains(domain_generation_campaign_id);

CREATE INDEX IF NOT EXISTS idx_generated_domains_dns_status 
ON generated_domains(dns_status);

CREATE INDEX IF NOT EXISTS idx_generated_domains_http_status 
ON generated_domains(http_status);

-- ======================================================================
-- 12. RESTORE BASIC JOB INDEXES: Simple job processing indexes
-- ======================================================================

-- Restore basic campaign_jobs indexes
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_status 
ON campaign_jobs(status);

CREATE INDEX IF EXISTS idx_campaign_jobs_campaign_id 
ON campaign_jobs(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_jobs_scheduled_at 
ON campaign_jobs(scheduled_at);

-- ======================================================================
-- 13. UPDATE STATISTICS: Optimize for basic query patterns
-- ======================================================================

-- Update statistics for basic query planning
ANALYZE campaigns;
ANALYZE generated_domains;
ANALYZE campaign_jobs;

-- ======================================================================
-- 14. PERFORMANCE WARNING: Document expected degradation
-- ======================================================================

-- Create performance warning view
CREATE OR REPLACE VIEW index_rollback_warning AS
SELECT 
    'PERFORMANCE DEGRADATION WARNING' as notice,
    'Phases optimization indexes have been removed' as status,
    'Query performance will be significantly slower' as impact,
    'Consider re-running optimization migration 000036' as recommendation;

COMMENT ON VIEW index_rollback_warning IS 'Warning about performance impact of index optimization rollback';

COMMIT;

-- ======================================================================
-- INDEX OPTIMIZATION ROLLBACK COMPLETE
-- ======================================================================
-- WARNING: Database performance will be significantly degraded
-- Phases optimization indexes have been removed
-- Basic indexes restored for emergency operation
-- ======================================================================

-- Post-rollback warnings
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'INDEX OPTIMIZATION ROLLBACK COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE WARNING 'PERFORMANCE IMPACT:';
    RAISE WARNING '- Phase workflow queries will be 60-80%% slower';
    RAISE WARNING '- Bulk domain processing will be 50-70%% slower';
    RAISE WARNING '- User dashboard queries will be 40-60%% slower';
    RAISE WARNING '- Analytics queries will be 30-50%% slower';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'EMERGENCY RECOMMENDATIONS:';
    RAISE NOTICE '1. Monitor database performance closely';
    RAISE NOTICE '2. Consider re-running optimization migration after fixing issues';
    RAISE NOTICE '3. Limit bulk operations until optimization is restored';
    RAISE NOTICE '4. Run VACUUM ANALYZE frequently to maintain basic performance';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Query the view index_rollback_warning for status information';
    RAISE NOTICE '============================================================';
END $$;