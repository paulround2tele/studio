-- ======================================================================
-- COMPREHENSIVE SCHEMA ALIGNMENT ROLLBACK MIGRATION
-- ======================================================================
-- This migration rolls back the comprehensive schema alignment changes
-- WARNING: This will remove columns and tables, potentially causing data loss
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. ROLLBACK: Remove architecture monitoring tables
-- ======================================================================

DROP TABLE IF EXISTS service_capacity_metrics CASCADE;
DROP TABLE IF EXISTS communication_patterns CASCADE;
DROP TABLE IF EXISTS architecture_refactor_log CASCADE;
DROP TABLE IF EXISTS service_dependencies CASCADE;
DROP TABLE IF EXISTS service_architecture_metrics CASCADE;

-- ======================================================================
-- 2. ROLLBACK: Remove authorization_decisions table
-- ======================================================================

DROP TABLE IF EXISTS authorization_decisions CASCADE;

-- ======================================================================
-- 3. ROLLBACK: Remove added security_events columns
-- ======================================================================

-- Note: We'll only remove columns that we know we added, to avoid removing existing data
ALTER TABLE security_events 
DROP COLUMN IF EXISTS request_context,
DROP COLUMN IF EXISTS denial_reason,
DROP COLUMN IF EXISTS authorization_result,
DROP COLUMN IF EXISTS action_attempted,
DROP COLUMN IF EXISTS resource_id,
DROP COLUMN IF EXISTS resource_type,
DROP COLUMN IF EXISTS campaign_id,
DROP COLUMN IF EXISTS session_id,
DROP COLUMN IF EXISTS audit_log_id;

-- ======================================================================
-- 4. ROLLBACK: Remove proxy_pool_memberships table
-- ======================================================================

DROP TABLE IF EXISTS proxy_pool_memberships CASCADE;

-- ======================================================================
-- 5. ROLLBACK: Remove keyword_rules table
-- ======================================================================

DROP TABLE IF EXISTS keyword_rules CASCADE;

-- ======================================================================
-- 6. ROLLBACK: Remove added http_keyword_results columns
-- ======================================================================

ALTER TABLE http_keyword_results 
DROP COLUMN IF EXISTS validation_status,
DROP COLUMN IF EXISTS http_status_code,
DROP COLUMN IF EXISTS response_headers,
DROP COLUMN IF EXISTS page_title,
DROP COLUMN IF EXISTS extracted_content_snippet,
DROP COLUMN IF EXISTS found_keywords_from_sets,
DROP COLUMN IF EXISTS found_ad_hoc_keywords,
DROP COLUMN IF EXISTS content_hash,
DROP COLUMN IF EXISTS validated_by_persona_id,
DROP COLUMN IF EXISTS used_proxy_id,
DROP COLUMN IF EXISTS attempts,
DROP COLUMN IF EXISTS last_checked_at;

-- ======================================================================
-- 7. ROLLBACK: Remove business_status from dns_validation_results
-- ======================================================================

ALTER TABLE dns_validation_results 
DROP COLUMN IF EXISTS business_status;

-- ======================================================================
-- 8. ROLLBACK: campaign_jobs table changes
-- ======================================================================

-- Remove added columns
ALTER TABLE campaign_jobs 
DROP COLUMN IF EXISTS business_status,
DROP COLUMN IF EXISTS last_attempted_at,
DROP COLUMN IF EXISTS next_execution_at,
DROP COLUMN IF EXISTS locked_at,
DROP COLUMN IF EXISTS locked_by;

-- Rename columns back (if they were renamed)
DO $$
BEGIN
    -- Rename job_type back to campaign_type if both don't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaign_jobs' AND column_name = 'job_type') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'campaign_jobs' AND column_name = 'campaign_type') THEN
        ALTER TABLE campaign_jobs RENAME COLUMN job_type TO campaign_type;
    END IF;

    -- Rename job_payload back to payload if both don't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaign_jobs' AND column_name = 'job_payload') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'campaign_jobs' AND column_name = 'payload') THEN
        ALTER TABLE campaign_jobs RENAME COLUMN job_payload TO payload;
    END IF;

    -- Rename processing_server_id back to worker_id if both don't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaign_jobs' AND column_name = 'processing_server_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'campaign_jobs' AND column_name = 'worker_id') THEN
        ALTER TABLE campaign_jobs RENAME COLUMN processing_server_id TO worker_id;
    END IF;
END $$;

-- ======================================================================
-- 9. ROLLBACK: Remove created_at and updated_at from domain_generation_campaign_params
-- ======================================================================

ALTER TABLE domain_generation_campaign_params 
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;

-- ======================================================================
-- 10. ROLLBACK: Remove triggers
-- ======================================================================

DROP TRIGGER IF EXISTS update_domain_generation_campaign_params_updated_at ON domain_generation_campaign_params;
DROP TRIGGER IF EXISTS update_service_architecture_metrics_updated_at ON service_architecture_metrics;
DROP TRIGGER IF EXISTS update_communication_patterns_updated_at ON communication_patterns;

-- ======================================================================
-- 11. ROLLBACK: Remove added foreign key constraints
-- ======================================================================

ALTER TABLE dns_validation_results 
DROP CONSTRAINT IF EXISTS fk_dns_validation_results_campaign_id;

ALTER TABLE http_keyword_results 
DROP CONSTRAINT IF EXISTS fk_http_keyword_results_campaign_id;

ALTER TABLE campaign_jobs 
DROP CONSTRAINT IF EXISTS fk_campaign_jobs_campaign_id;

-- ======================================================================
-- 12. ROLLBACK: Remove added indexes
-- ======================================================================

-- Campaign-related indexes
DROP INDEX IF EXISTS idx_domain_generation_params_campaign_id;
DROP INDEX IF EXISTS idx_generated_domains_campaign_id;
DROP INDEX IF EXISTS idx_generated_domains_offset;
DROP INDEX IF EXISTS idx_dns_validation_results_campaign_id;
DROP INDEX IF EXISTS idx_dns_validation_results_status;
DROP INDEX IF EXISTS idx_http_keyword_results_campaign_id;
DROP INDEX IF EXISTS idx_campaign_jobs_status;
DROP INDEX IF EXISTS idx_campaign_jobs_scheduled_at;
DROP INDEX IF EXISTS idx_campaign_jobs_job_type;

-- Security and audit indexes
DROP INDEX IF EXISTS idx_security_events_user_id;
DROP INDEX IF EXISTS idx_security_events_campaign_id;
DROP INDEX IF EXISTS idx_security_events_created_at;

-- Architecture monitoring indexes
DROP INDEX IF EXISTS idx_service_architecture_metrics_service;
DROP INDEX IF EXISTS idx_service_dependencies_source;
DROP INDEX IF EXISTS idx_service_dependencies_target;

-- Keyword rules indexes
DROP INDEX IF EXISTS idx_keyword_rules_keyword_set_id;
DROP INDEX IF EXISTS idx_keyword_rules_pattern;

-- Proxy pool membership indexes
DROP INDEX IF EXISTS idx_proxy_pool_memberships_pool_id;
DROP INDEX IF EXISTS idx_proxy_pool_memberships_proxy_id;

-- Authorization decisions indexes
DROP INDEX IF EXISTS idx_authorization_decisions_user_id;
DROP INDEX IF EXISTS idx_authorization_decisions_decision_id;

-- ======================================================================
-- 13. ROLLBACK: Remove the update_updated_at_column function
-- ======================================================================

DROP FUNCTION IF EXISTS update_updated_at_column();

COMMIT;

-- ======================================================================
-- Rollback complete - Schema reverted to previous state
-- WARNING: Data in removed columns and tables has been lost
-- ======================================================================