-- ======================================================================
-- PHASE-CENTRIC ARCHITECTURE REFACTOR ROLLBACK MIGRATION
-- ======================================================================
-- This migration rolls back the phase-centric architecture changes
-- and restores the original campaign-centric design.
--
-- WARNING: This rollback will result in data loss for phase-specific
-- configurations and may not preserve all data relationships.
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. RESTORE: Original campaign-specific tables
-- ======================================================================

-- Recreate domain_generation_campaign_params table
CREATE TABLE domain_generation_campaign_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('prefix', 'suffix', 'both')),
    variable_length INTEGER NOT NULL CHECK (variable_length > 0),
    character_set TEXT NOT NULL,
    constant_string TEXT NOT NULL,
    tld TEXT NOT NULL,
    num_domains_to_generate BIGINT DEFAULT 1000,
    current_offset BIGINT DEFAULT 0,
    config_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id)
);

-- Recreate dns_validation_campaign_params table
CREATE TABLE dns_validation_campaign_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    source_generation_campaign_id UUID,
    persona_ids UUID[] NOT NULL,
    rotation_interval_seconds INTEGER DEFAULT 60,
    processing_speed_per_minute INTEGER DEFAULT 100,
    batch_size INTEGER DEFAULT 50,
    retry_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id)
);

-- Recreate http_keyword_campaign_params table
CREATE TABLE http_keyword_campaign_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    source_campaign_id UUID NOT NULL,
    keyword_set_ids UUID[],
    ad_hoc_keywords TEXT[],
    persona_ids UUID[] NOT NULL,
    proxy_pool_id UUID,
    proxy_selection_strategy TEXT DEFAULT 'round_robin',
    rotation_interval_seconds INTEGER DEFAULT 300,
    processing_speed_per_minute INTEGER DEFAULT 50,
    batch_size INTEGER DEFAULT 25,
    retry_attempts INTEGER DEFAULT 3,
    target_http_ports INTEGER[] DEFAULT ARRAY[80, 443],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id)
);

-- ======================================================================
-- 2. MIGRATE DATA: From phases back to campaign-specific tables
-- ======================================================================

-- Migrate domain generation phase data back to domain_generation_campaign_params
INSERT INTO domain_generation_campaign_params (
    campaign_id, pattern_type, variable_length, character_set, 
    constant_string, tld, num_domains_to_generate, current_offset, 
    config_hash, created_at, updated_at
)
SELECT 
    dgp.campaign_id,
    dgp.pattern_type,
    dgp.variable_length,
    dgp.character_set,
    dgp.constant_string,
    dgp.tld,
    dgp.num_domains_to_generate,
    dgp.current_offset,
    dgp.config_hash,
    dgp.created_at,
    dgp.updated_at
FROM domain_generation_phases dgp;

-- Migrate DNS validation phase data
INSERT INTO dns_validation_campaign_params (
    campaign_id, persona_ids, rotation_interval_seconds,
    processing_speed_per_minute, batch_size, retry_attempts,
    created_at, updated_at
)
SELECT 
    dvp.campaign_id,
    dvp.persona_ids,
    dvp.rotation_interval_seconds,
    dvp.processing_speed_per_minute,
    dvp.batch_size,
    dvp.retry_attempts,
    dvp.created_at,
    dvp.updated_at
FROM dns_validation_phases dvp;

-- Migrate HTTP keyword validation phase data
INSERT INTO http_keyword_campaign_params (
    campaign_id, keyword_set_ids, ad_hoc_keywords, persona_ids,
    proxy_pool_id, proxy_selection_strategy, rotation_interval_seconds,
    processing_speed_per_minute, batch_size, retry_attempts,
    target_http_ports, created_at, updated_at
)
SELECT 
    hkp.campaign_id,
    hkp.keyword_set_ids,
    hkp.ad_hoc_keywords,
    hkp.persona_ids,
    hkp.proxy_pool_id,
    hkp.proxy_selection_strategy,
    hkp.rotation_interval_seconds,
    hkp.processing_speed_per_minute,
    hkp.batch_size,
    hkp.retry_attempts,
    hkp.target_http_ports,
    hkp.created_at,
    hkp.updated_at
FROM http_keyword_validation_phases hkp;

-- ======================================================================
-- 3. RESTORE: Original result table columns
-- ======================================================================

-- Restore original foreign key columns in result tables
ALTER TABLE generated_domains 
ADD COLUMN IF NOT EXISTS domain_generation_campaign_id UUID;

ALTER TABLE dns_validation_results 
ADD COLUMN IF NOT EXISTS dns_campaign_id UUID;

ALTER TABLE http_keyword_results 
ADD COLUMN IF NOT EXISTS http_keyword_campaign_id UUID;

-- Migrate data back to original columns
UPDATE generated_domains 
SET domain_generation_campaign_id = campaign_id 
WHERE domain_generation_campaign_id IS NULL;

UPDATE dns_validation_results 
SET dns_campaign_id = campaign_id 
WHERE dns_campaign_id IS NULL;

UPDATE http_keyword_results 
SET http_keyword_campaign_id = campaign_id 
WHERE http_keyword_campaign_id IS NULL;

-- ======================================================================
-- 4. RESTORE: Original campaigns table structure
-- ======================================================================

-- Remove phase-centric columns from campaigns table
ALTER TABLE campaigns 
DROP COLUMN IF EXISTS campaign_type CASCADE,
DROP COLUMN IF EXISTS current_phase_id CASCADE,
DROP COLUMN IF EXISTS total_phases CASCADE,
DROP COLUMN IF EXISTS completed_phases CASCADE,
DROP COLUMN IF EXISTS overall_progress CASCADE,
DROP COLUMN IF EXISTS is_full_sequence_mode CASCADE,
DROP COLUMN IF EXISTS auto_advance_phases CASCADE;

-- Restore original campaign status and type columns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS campaign_status TEXT,
ADD COLUMN IF NOT EXISTS campaign_generation_type TEXT;

-- Update campaigns based on phase status
UPDATE campaigns 
SET campaign_status = CASE 
    WHEN EXISTS (
        SELECT 1 FROM campaign_phases cp 
        WHERE cp.campaign_id = campaigns.id AND cp.status = 'in_progress'
    ) THEN 'running'
    WHEN EXISTS (
        SELECT 1 FROM campaign_phases cp 
        WHERE cp.campaign_id = campaigns.id AND cp.status = 'completed'
    ) THEN 'completed'
    WHEN EXISTS (
        SELECT 1 FROM campaign_phases cp 
        WHERE cp.campaign_id = campaigns.id AND cp.status = 'failed'
    ) THEN 'failed'
    ELSE 'pending'
END;

-- ======================================================================
-- 5. RESTORE: Original campaign_jobs structure
-- ======================================================================

-- Remove phase-specific columns from campaign_jobs
ALTER TABLE campaign_jobs 
DROP COLUMN IF EXISTS phase_id CASCADE,
DROP COLUMN IF EXISTS phase_type CASCADE,
DROP COLUMN IF EXISTS phase_batch_number CASCADE,
DROP COLUMN IF EXISTS phase_step CASCADE;

-- Restore original job_type values
UPDATE campaign_jobs 
SET job_type = 'generation' 
WHERE job_type = 'domain_generation';

-- ======================================================================
-- 6. RESTORE: Original foreign key constraints
-- ======================================================================

-- Add back original foreign key constraints
ALTER TABLE domain_generation_campaign_params 
ADD CONSTRAINT fk_domain_generation_campaign_params_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE dns_validation_campaign_params 
ADD CONSTRAINT fk_dns_validation_campaign_params_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE http_keyword_campaign_params 
ADD CONSTRAINT fk_http_keyword_campaign_params_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

-- Restore original result table foreign keys
ALTER TABLE generated_domains 
ADD CONSTRAINT fk_generated_domains_campaign_id 
FOREIGN KEY (domain_generation_campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE dns_validation_results 
ADD CONSTRAINT fk_dns_validation_results_campaign_id 
FOREIGN KEY (dns_campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE http_keyword_results 
ADD CONSTRAINT fk_http_keyword_results_campaign_id 
FOREIGN KEY (http_keyword_campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

-- ======================================================================
-- 7. RESTORE: Original indexes
-- ======================================================================

-- Recreate original indexes
CREATE INDEX IF NOT EXISTS idx_domain_generation_params_campaign_id 
ON domain_generation_campaign_params(campaign_id);

CREATE INDEX IF NOT EXISTS idx_dns_validation_params_campaign_id 
ON dns_validation_campaign_params(campaign_id);

CREATE INDEX IF NOT EXISTS idx_http_keyword_params_campaign_id 
ON http_keyword_campaign_params(campaign_id);

CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_id_original 
ON generated_domains(domain_generation_campaign_id);

CREATE INDEX IF NOT EXISTS idx_dns_validation_results_campaign_id_original 
ON dns_validation_results(dns_campaign_id);

CREATE INDEX IF NOT EXISTS idx_http_keyword_results_campaign_id_original 
ON http_keyword_results(http_keyword_campaign_id);

-- ======================================================================
-- 8. CLEANUP: Remove phase-centric tables and constraints
-- ======================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_campaign_progress ON campaign_phases;
DROP TRIGGER IF EXISTS trigger_update_campaign_phases_updated_at ON campaign_phases;
DROP FUNCTION IF EXISTS update_campaign_overall_progress();

-- Drop phase-specific tables
DROP TABLE IF EXISTS analysis_phases CASCADE;
DROP TABLE IF EXISTS http_keyword_validation_phases CASCADE;
DROP TABLE IF EXISTS dns_validation_phases CASCADE;
DROP TABLE IF EXISTS domain_generation_phases CASCADE;
DROP TABLE IF EXISTS campaign_phases CASCADE;

-- Remove phase-centric columns from result tables
ALTER TABLE generated_domains 
DROP COLUMN IF EXISTS phase_id CASCADE,
DROP COLUMN IF EXISTS campaign_id CASCADE;

ALTER TABLE dns_validation_results 
DROP COLUMN IF EXISTS phase_id CASCADE,
DROP COLUMN IF EXISTS campaign_id CASCADE;

ALTER TABLE http_keyword_results 
DROP COLUMN IF EXISTS phase_id CASCADE,
DROP COLUMN IF EXISTS campaign_id CASCADE;

-- ======================================================================
-- 9. RESTORE: Original triggers and functions
-- ======================================================================

-- Recreate original updated_at triggers
CREATE TRIGGER update_domain_generation_campaign_params_updated_at
    BEFORE UPDATE ON domain_generation_campaign_params
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dns_validation_campaign_params_updated_at
    BEFORE UPDATE ON dns_validation_campaign_params
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_http_keyword_campaign_params_updated_at
    BEFORE UPDATE ON http_keyword_campaign_params
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ======================================================================
-- ROLLBACK COMPLETE - ORIGINAL CAMPAIGN-CENTRIC ARCHITECTURE RESTORED
-- ======================================================================
-- 
-- WARNING: Some data may have been lost during this rollback:
-- 1. Phase-specific progress tracking
-- 2. Phase execution timestamps
-- 3. Phase-specific error messages
-- 4. Analysis phase configurations and results
--
-- The system is now back to the original campaign-centric design.
-- ======================================================================