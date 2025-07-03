-- ======================================================================
-- COMPREHENSIVE SCHEMA ALIGNMENT MIGRATION
-- ======================================================================
-- This migration addresses critical schema mismatches between backend code 
-- expectations and actual database schema identified in the audit.
--
-- Priority: CRITICAL - Fixes campaign creation and core functionality
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. CRITICAL FIX: domain_generation_campaign_params table
-- ======================================================================
-- Add missing created_at and updated_at columns
ALTER TABLE domain_generation_campaign_params 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to have proper timestamps
UPDATE domain_generation_campaign_params 
SET created_at = NOW(), updated_at = NOW() 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Make the columns NOT NULL after setting defaults
ALTER TABLE domain_generation_campaign_params 
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- ======================================================================
-- 2. CRITICAL FIX: campaign_jobs table schema alignment
-- ======================================================================
-- Add missing business_status column
ALTER TABLE campaign_jobs 
ADD COLUMN IF NOT EXISTS business_status TEXT;

-- Fix column naming inconsistencies if they exist
-- Note: We'll check and rename columns carefully to avoid conflicts

-- Ensure we have all the expected columns with correct names
DO $$
BEGIN
    -- Check if we need to rename campaign_type to job_type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaign_jobs' AND column_name = 'campaign_type') THEN
        -- If job_type doesn't exist, rename campaign_type to job_type
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'campaign_jobs' AND column_name = 'job_type') THEN
            ALTER TABLE campaign_jobs RENAME COLUMN campaign_type TO job_type;
        END IF;
    END IF;

    -- Check if we need to rename payload to job_payload
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaign_jobs' AND column_name = 'payload') THEN
        -- If job_payload doesn't exist, rename payload to job_payload
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'campaign_jobs' AND column_name = 'job_payload') THEN
            ALTER TABLE campaign_jobs RENAME COLUMN payload TO job_payload;
        END IF;
    END IF;

    -- Check if we need to rename worker_id to processing_server_id
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaign_jobs' AND column_name = 'worker_id') THEN
        -- If processing_server_id doesn't exist, rename worker_id to processing_server_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'campaign_jobs' AND column_name = 'processing_server_id') THEN
            ALTER TABLE campaign_jobs RENAME COLUMN worker_id TO processing_server_id;
        END IF;
    END IF;
END $$;

-- Add missing columns that the models expect
ALTER TABLE campaign_jobs 
ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_execution_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- Ensure job_type column exists with proper type
ALTER TABLE campaign_jobs 
ADD COLUMN IF NOT EXISTS job_type TEXT;

-- Ensure job_payload column exists
ALTER TABLE campaign_jobs 
ADD COLUMN IF NOT EXISTS job_payload JSONB;

-- Ensure processing_server_id column exists
ALTER TABLE campaign_jobs 
ADD COLUMN IF NOT EXISTS processing_server_id TEXT;

-- ======================================================================
-- 3. CRITICAL FIX: dns_validation_results table
-- ======================================================================
-- Add missing business_status column that queries expect
ALTER TABLE dns_validation_results 
ADD COLUMN IF NOT EXISTS business_status TEXT;

-- Update existing records to have a default business status
UPDATE dns_validation_results 
SET business_status = CASE 
    WHEN validation_status = 'resolved' THEN 'valid_dns'
    WHEN validation_status = 'unresolved' THEN 'invalid_dns'
    ELSE 'pending'
END
WHERE business_status IS NULL;

-- ======================================================================
-- 4. FIX: http_keyword_results table
-- ======================================================================
-- Ensure http_keyword_results table has all expected columns
ALTER TABLE http_keyword_results 
ADD COLUMN IF NOT EXISTS validation_status TEXT,
ADD COLUMN IF NOT EXISTS http_status_code INTEGER,
ADD COLUMN IF NOT EXISTS response_headers JSONB,
ADD COLUMN IF NOT EXISTS page_title TEXT,
ADD COLUMN IF NOT EXISTS extracted_content_snippet TEXT,
ADD COLUMN IF NOT EXISTS found_keywords_from_sets JSONB,
ADD COLUMN IF NOT EXISTS found_ad_hoc_keywords TEXT[],
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS validated_by_persona_id UUID,
ADD COLUMN IF NOT EXISTS used_proxy_id UUID,
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ======================================================================
-- 5. FIX: keyword_rules table
-- ======================================================================
-- Create keyword_rules table if it doesn't exist
CREATE TABLE IF NOT EXISTS keyword_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_set_id UUID NOT NULL REFERENCES keyword_sets(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('string', 'regex')),
    is_case_sensitive BOOLEAN DEFAULT false,
    category TEXT,
    context_chars INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_keyword_rules_keyword_set_id ON keyword_rules(keyword_set_id);
CREATE INDEX IF NOT EXISTS idx_keyword_rules_pattern ON keyword_rules(pattern);

-- ======================================================================
-- 6. FIX: proxy_pool_memberships table
-- ======================================================================
-- Create proxy_pool_memberships table if it doesn't exist
CREATE TABLE IF NOT EXISTS proxy_pool_memberships (
    pool_id UUID NOT NULL REFERENCES proxy_pools(id) ON DELETE CASCADE,
    proxy_id UUID NOT NULL REFERENCES proxies(id) ON DELETE CASCADE,
    weight INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (pool_id, proxy_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_proxy_pool_memberships_pool_id ON proxy_pool_memberships(pool_id);
CREATE INDEX IF NOT EXISTS idx_proxy_pool_memberships_proxy_id ON proxy_pool_memberships(proxy_id);

-- ======================================================================
-- 7. FIX: security_events table
-- ======================================================================
-- Ensure security_events table has all expected columns
ALTER TABLE security_events 
ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS campaign_id UUID,
ADD COLUMN IF NOT EXISTS resource_type TEXT,
ADD COLUMN IF NOT EXISTS resource_id TEXT,
ADD COLUMN IF NOT EXISTS action_attempted TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS authorization_result TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS denial_reason TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS source_ip INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS request_context JSONB,
ADD COLUMN IF NOT EXISTS audit_log_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ======================================================================
-- 8. FIX: authorization_decisions table
-- ======================================================================
-- Create authorization_decisions table if it doesn't exist
CREATE TABLE IF NOT EXISTS authorization_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    action TEXT NOT NULL,
    decision TEXT NOT NULL,
    policy_version TEXT,
    evaluated_policies TEXT[],
    conditions_met JSONB,
    decision_time_ms INTEGER DEFAULT 0,
    context JSONB,
    security_event_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_authorization_decisions_user_id ON authorization_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_authorization_decisions_decision_id ON authorization_decisions(decision_id);

-- ======================================================================
-- 9. CREATE: Architecture monitoring tables
-- ======================================================================

-- service_architecture_metrics table
CREATE TABLE IF NOT EXISTS service_architecture_metrics (
    id BIGSERIAL PRIMARY KEY,
    service_name TEXT NOT NULL,
    architecture_pattern TEXT NOT NULL,
    interface_type TEXT NOT NULL,
    dependency_count INTEGER DEFAULT 0,
    coupling_score DECIMAL(5,2) DEFAULT 0.0,
    deployment_complexity_score INTEGER DEFAULT 0,
    last_refactor_date TIMESTAMP WITH TIME ZONE,
    performance_impact DECIMAL(5,2) DEFAULT 0.0,
    error_rate DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- service_dependencies table
CREATE TABLE IF NOT EXISTS service_dependencies (
    id BIGSERIAL PRIMARY KEY,
    source_service TEXT NOT NULL,
    target_service TEXT NOT NULL,
    dependency_type TEXT NOT NULL,
    interface_contract TEXT,
    reliability_score DECIMAL(5,2) DEFAULT 0.0,
    latency_p95 DECIMAL(10,2) DEFAULT 0.0,
    failure_count INTEGER DEFAULT 0,
    last_success TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- architecture_refactor_log table
CREATE TABLE IF NOT EXISTS architecture_refactor_log (
    id BIGSERIAL PRIMARY KEY,
    service_name TEXT NOT NULL,
    refactor_type TEXT NOT NULL,
    before_pattern TEXT,
    after_pattern TEXT,
    complexity_reduction INTEGER DEFAULT 0,
    performance_impact DECIMAL(5,2) DEFAULT 0.0,
    rollback_plan TEXT,
    implemented_by TEXT,
    implemented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- communication_patterns table
CREATE TABLE IF NOT EXISTS communication_patterns (
    id BIGSERIAL PRIMARY KEY,
    source_service TEXT NOT NULL,
    target_service TEXT NOT NULL,
    communication_type TEXT NOT NULL,
    protocol TEXT NOT NULL,
    message_format TEXT NOT NULL,
    avg_latency_ms DECIMAL(10,2) DEFAULT 0.0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    throughput_rps DECIMAL(10,2) DEFAULT 0.0,
    error_rate DECIMAL(5,2) DEFAULT 0.0,
    retry_count INTEGER DEFAULT 0,
    circuit_breaker_state TEXT DEFAULT 'closed',
    last_health_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- service_capacity_metrics table
CREATE TABLE IF NOT EXISTS service_capacity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    cpu_utilization DECIMAL(5,2) DEFAULT 0.0,
    memory_utilization DECIMAL(5,2) DEFAULT 0.0,
    instance_count INTEGER DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================================================
-- 10. ENSURE: Standard timestamp columns across all tables
-- ======================================================================

-- Add updated_at triggers for tables that need them
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
DO $$
BEGIN
    -- Only create trigger if updated_at column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'domain_generation_campaign_params' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_domain_generation_campaign_params_updated_at ON domain_generation_campaign_params;
        CREATE TRIGGER update_domain_generation_campaign_params_updated_at
            BEFORE UPDATE ON domain_generation_campaign_params
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'service_architecture_metrics' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_service_architecture_metrics_updated_at ON service_architecture_metrics;
        CREATE TRIGGER update_service_architecture_metrics_updated_at
            BEFORE UPDATE ON service_architecture_metrics
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'communication_patterns' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_communication_patterns_updated_at ON communication_patterns;
        CREATE TRIGGER update_communication_patterns_updated_at
            BEFORE UPDATE ON communication_patterns
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ======================================================================
-- 11. CREATE: Essential indexes for performance
-- ======================================================================

-- Campaign-related indexes
CREATE INDEX IF NOT EXISTS idx_domain_generation_params_campaign_id ON domain_generation_campaign_params(campaign_id);
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_id ON generated_domains(domain_generation_campaign_id);
CREATE INDEX IF NOT EXISTS idx_generated_domains_offset ON generated_domains(offset_index);
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_campaign_id ON dns_validation_results(dns_campaign_id);
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_status ON dns_validation_results(validation_status, business_status);
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_campaign_id ON http_keyword_results(http_keyword_campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_status ON campaign_jobs(status);
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_scheduled_at ON campaign_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_job_type ON campaign_jobs(job_type);

-- Security and audit indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_campaign_id ON security_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

-- Architecture monitoring indexes
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_service ON service_architecture_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_source ON service_dependencies(source_service);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_target ON service_dependencies(target_service);

-- ======================================================================
-- 12. ADD: Foreign key constraints where missing
-- ======================================================================

-- Add foreign key constraints that might be missing
DO $$
BEGIN
    -- Add foreign key for dns_validation_results to campaigns
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_dns_validation_results_campaign_id') THEN
        ALTER TABLE dns_validation_results 
        ADD CONSTRAINT fk_dns_validation_results_campaign_id 
        FOREIGN KEY (dns_campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for http_keyword_results to campaigns
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_http_keyword_results_campaign_id') THEN
        ALTER TABLE http_keyword_results 
        ADD CONSTRAINT fk_http_keyword_results_campaign_id 
        FOREIGN KEY (http_keyword_campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for campaign_jobs to campaigns
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_campaign_jobs_campaign_id') THEN
        ALTER TABLE campaign_jobs 
        ADD CONSTRAINT fk_campaign_jobs_campaign_id 
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ======================================================================
-- 13. FINAL: Data consistency fixes
-- ======================================================================

-- Ensure all campaigns have proper status values
UPDATE campaigns 
SET status = 'pending' 
WHERE status IS NULL OR status NOT IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'archived', 'cancelled');

-- Ensure all job statuses are valid
UPDATE campaign_jobs 
SET status = 'pending' 
WHERE status IS NULL OR status NOT IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled');

-- Set default business_status for DNS validation results where null
UPDATE dns_validation_results 
SET business_status = CASE 
    WHEN validation_status = 'resolved' THEN 'valid_dns'
    ELSE 'pending'
END
WHERE business_status IS NULL;

COMMIT;

-- ======================================================================
-- Migration complete - Schema should now be aligned with backend code
-- ======================================================================