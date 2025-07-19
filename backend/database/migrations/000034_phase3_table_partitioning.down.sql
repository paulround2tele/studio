-- Phase 3: Bulletproof Enterprise Performance Optimization Migration (DOWN)
-- This migration reverses all bulletproof performance optimizations

-- =============================================================================
-- 1. DROP PERFORMANCE MONITORING TRIGGERS
-- =============================================================================

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_campaigns_analytics ON campaigns;
DROP TRIGGER IF EXISTS trigger_generated_domains_analytics ON generated_domains;
DROP TRIGGER IF EXISTS trigger_dns_validation_analytics ON dns_validation_results;
DROP TRIGGER IF EXISTS trigger_http_keyword_analytics ON http_keyword_results;

-- Drop trigger function
DROP FUNCTION IF EXISTS trigger_analytics_refresh();

-- =============================================================================
-- 2. DROP AUTOMATED FUNCTIONS
-- =============================================================================

-- Drop enterprise functions
DROP FUNCTION IF EXISTS get_enterprise_summary();
DROP FUNCTION IF EXISTS refresh_enterprise_analytics();

-- =============================================================================
-- 3. DROP BULLETPROOF QUERY OPTIMIZATION VIEWS
-- =============================================================================

-- Drop optimized view
DROP VIEW IF EXISTS v_bulk_domains_optimized;

-- =============================================================================
-- 4. DROP BULLETPROOF MATERIALIZED VIEWS
-- =============================================================================

-- Drop materialized view indexes
DROP INDEX IF EXISTS idx_mv_unified_domain_name_status;
DROP INDEX IF EXISTS idx_mv_unified_domain_primary_campaign;
DROP INDEX IF EXISTS idx_mv_campaign_performance_campaign_id;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS mv_unified_domain_analysis;
DROP MATERIALIZED VIEW IF EXISTS mv_campaign_performance_enterprise;

-- =============================================================================
-- 5. DROP COMPREHENSIVE INDEXING STRATEGY
-- =============================================================================

-- Drop Campaign Table indexes
DROP INDEX IF EXISTS idx_campaigns_user_type_status;
DROP INDEX IF EXISTS idx_campaigns_type_status_date;

-- Drop Generated Domains indexes
DROP INDEX IF EXISTS idx_generated_domains_valid_domains;
DROP INDEX IF EXISTS idx_generated_domains_domain_lookup;
DROP INDEX IF EXISTS idx_generated_domains_campaign_bulk_ops;

-- Drop DNS Validation Results indexes
DROP INDEX IF EXISTS idx_dns_validation_status_bulk;
DROP INDEX IF EXISTS idx_dns_validation_domain_status;
DROP INDEX IF EXISTS idx_dns_validation_bulk_ops;

-- Drop HTTP Keyword Results indexes
DROP INDEX IF EXISTS idx_http_keyword_success_analysis;
DROP INDEX IF EXISTS idx_http_keyword_domain_status;
DROP INDEX IF EXISTS idx_http_keyword_bulk_ops;

-- =============================================================================
-- VERIFICATION MESSAGE
-- =============================================================================

-- Log successful rollback
DO $$
BEGIN
    RAISE NOTICE 'Phase 3 Bulletproof Enterprise Performance Optimization has been successfully rolled back';
    RAISE NOTICE 'All performance indexes, materialized views, triggers, and functions have been removed';
    RAISE NOTICE 'System returned to pre-optimization state';
END $$;