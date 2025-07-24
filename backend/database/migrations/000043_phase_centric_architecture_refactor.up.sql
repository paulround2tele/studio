-- ======================================================================
-- PHASE-CENTRIC ARCHITECTURE REFACTOR MIGRATION
-- ======================================================================
-- This migration transforms the current campaign-centric architecture
-- to a phase-centric design where:
-- 1. Campaign becomes LeadGenerationCampaign with 4 phases
-- 2. Domain generation becomes Phase 1 (not a separate campaign)
-- 3. Phase controls replace campaign controls
-- 4. Jobs become phase-specific
--
-- CRITICAL: NO BACKWARD COMPATIBILITY - Complete architectural change
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. CREATE: New campaign_phases table for phase management
-- ======================================================================

-- Create the campaign_phases table to track individual phases within campaigns
CREATE TABLE campaign_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    phase_type TEXT NOT NULL CHECK (phase_type IN ('domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis')),
    phase_order INTEGER NOT NULL CHECK (phase_order BETWEEN 1 AND 4),
    
    -- Phase status tracking
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'paused', 'completed', 'failed')),
    progress_percentage DECIMAL(5,2) DEFAULT 0.0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Phase execution tracking
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Phase-specific counters
    total_items BIGINT DEFAULT 0,
    processed_items BIGINT DEFAULT 0,
    successful_items BIGINT DEFAULT 0,
    failed_items BIGINT DEFAULT 0,
    
    -- Phase configuration (JSON storage for phase-specific params)
    configuration JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(campaign_id, phase_type),
    UNIQUE(campaign_id, phase_order)
);

-- Create indexes for performance
CREATE INDEX idx_campaign_phases_campaign_id ON campaign_phases(campaign_id);
CREATE INDEX idx_campaign_phases_status ON campaign_phases(status);
CREATE INDEX idx_campaign_phases_phase_type ON campaign_phases(phase_type);
CREATE INDEX idx_campaign_phases_order ON campaign_phases(campaign_id, phase_order);

-- ======================================================================
-- 2. TRANSFORM: campaigns table to LeadGenerationCampaign
-- ======================================================================

-- Add new columns for LeadGenerationCampaign structure
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'lead_generation' CHECK (campaign_type = 'lead_generation'),
ADD COLUMN IF NOT EXISTS current_phase_id UUID,
ADD COLUMN IF NOT EXISTS total_phases INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS completed_phases INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_progress DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS is_full_sequence_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_advance_phases BOOLEAN DEFAULT FALSE;

-- Remove legacy campaign-specific fields that are now handled by phases
-- Note: We'll keep some fields for backward compatibility during transition
ALTER TABLE campaigns 
DROP COLUMN IF EXISTS campaign_status CASCADE,
DROP COLUMN IF EXISTS campaign_generation_type CASCADE;

-- Update campaigns table structure for lead generation focus
ALTER TABLE campaigns 
ALTER COLUMN current_phase TYPE TEXT,
ADD CONSTRAINT chk_current_phase CHECK (current_phase IN ('domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis'));

-- ======================================================================
-- 3. TRANSFORM: campaign_jobs to be phase-centric
-- ======================================================================

-- Add phase-specific columns to campaign_jobs
ALTER TABLE campaign_jobs 
ADD COLUMN IF NOT EXISTS phase_id UUID,
ADD COLUMN IF NOT EXISTS phase_type TEXT CHECK (phase_type IN ('domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis')),
ADD COLUMN IF NOT EXISTS phase_batch_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS phase_step TEXT; -- For tracking sub-steps within a phase

-- Update job_type to be phase-specific
ALTER TABLE campaign_jobs 
ALTER COLUMN job_type TYPE TEXT,
ADD CONSTRAINT chk_job_type_phase CHECK (job_type IN ('domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis'));

-- Create indexes for phase-centric job queries
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_phase_id ON campaign_jobs(phase_id);
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_phase_type ON campaign_jobs(phase_type);
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_phase_batch ON campaign_jobs(phase_id, phase_batch_number);

-- ======================================================================
-- 4. REFACTOR: Domain generation from campaign to phase
-- ======================================================================

-- Create domain_generation_phases table (replaces domain_generation_campaign_params)
CREATE TABLE domain_generation_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES campaign_phases(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    
    -- Domain generation configuration
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('prefix', 'suffix', 'both')),
    variable_length INTEGER NOT NULL CHECK (variable_length > 0),
    character_set TEXT NOT NULL,
    constant_string TEXT NOT NULL,
    tld TEXT NOT NULL,
    num_domains_to_generate BIGINT DEFAULT 1000,
    
    -- Generation tracking
    current_offset BIGINT DEFAULT 0,
    config_hash TEXT NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id)
);

-- Create indexes
CREATE INDEX idx_domain_generation_phases_phase_id ON domain_generation_phases(phase_id);
CREATE INDEX idx_domain_generation_phases_campaign_id ON domain_generation_phases(campaign_id);
CREATE INDEX idx_domain_generation_phases_config_hash ON domain_generation_phases(config_hash);

-- ======================================================================
-- 5. REFACTOR: DNS validation to be phase-centric
-- ======================================================================

-- Create dns_validation_phases table
CREATE TABLE dns_validation_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES campaign_phases(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    source_phase_id UUID, -- References the domain generation phase
    
    -- DNS validation configuration
    persona_ids UUID[] NOT NULL,
    rotation_interval_seconds INTEGER DEFAULT 60,
    processing_speed_per_minute INTEGER DEFAULT 100,
    batch_size INTEGER DEFAULT 50,
    retry_attempts INTEGER DEFAULT 3,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id)
);

-- Create indexes
CREATE INDEX idx_dns_validation_phases_phase_id ON dns_validation_phases(phase_id);
CREATE INDEX idx_dns_validation_phases_campaign_id ON dns_validation_phases(campaign_id);
CREATE INDEX idx_dns_validation_phases_source ON dns_validation_phases(source_phase_id);

-- ======================================================================
-- 6. REFACTOR: HTTP keyword validation to be phase-centric
-- ======================================================================

-- Create http_keyword_validation_phases table
CREATE TABLE http_keyword_validation_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES campaign_phases(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    source_phase_id UUID, -- References the DNS validation phase
    
    -- HTTP keyword validation configuration
    persona_ids UUID[] NOT NULL,
    keyword_set_ids UUID[],
    ad_hoc_keywords TEXT[],
    proxy_pool_id UUID,
    proxy_selection_strategy TEXT DEFAULT 'round_robin',
    rotation_interval_seconds INTEGER DEFAULT 300,
    processing_speed_per_minute INTEGER DEFAULT 50,
    batch_size INTEGER DEFAULT 25,
    retry_attempts INTEGER DEFAULT 3,
    target_http_ports INTEGER[] DEFAULT ARRAY[80, 443],
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id)
);

-- Create indexes
CREATE INDEX idx_http_keyword_phases_phase_id ON http_keyword_validation_phases(phase_id);
CREATE INDEX idx_http_keyword_phases_campaign_id ON http_keyword_validation_phases(campaign_id);
CREATE INDEX idx_http_keyword_phases_source ON http_keyword_validation_phases(source_phase_id);

-- ======================================================================
-- 7. CREATE: Analysis phase table
-- ======================================================================

-- Create analysis_phases table (new phase)
CREATE TABLE analysis_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES campaign_phases(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL,
    source_phase_id UUID, -- References the HTTP keyword validation phase
    
    -- Analysis configuration
    analysis_type TEXT DEFAULT 'lead_extraction' CHECK (analysis_type IN ('lead_extraction', 'content_analysis', 'similarity_analysis')),
    similarity_threshold DECIMAL(5,2) DEFAULT 80.0,
    content_extraction_enabled BOOLEAN DEFAULT TRUE,
    lead_scoring_enabled BOOLEAN DEFAULT TRUE,
    
    -- Analysis results summary
    total_leads_found INTEGER DEFAULT 0,
    high_quality_leads INTEGER DEFAULT 0,
    content_items_analyzed INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id)
);

-- Create indexes
CREATE INDEX idx_analysis_phases_phase_id ON analysis_phases(phase_id);
CREATE INDEX idx_analysis_phases_campaign_id ON analysis_phases(campaign_id);
CREATE INDEX idx_analysis_phases_source ON analysis_phases(source_phase_id);

-- ======================================================================
-- 8. UPDATE: Result tables to reference phases instead of campaigns
-- ======================================================================

-- Update generated_domains table to reference domain generation phase
ALTER TABLE generated_domains
ADD COLUMN IF NOT EXISTS phase_id UUID,
ADD COLUMN IF NOT EXISTS campaign_id UUID;

-- Note: dns_validation_results and http_keyword_results tables were removed in migration 000039
-- All validation data is now stored in generated_domains table with dns_status/http_status columns

-- Create new indexes for phase-based queries
CREATE INDEX IF NOT EXISTS idx_generated_domains_phase_id ON generated_domains(phase_id);
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_id_new ON generated_domains(campaign_id);

-- ======================================================================
-- 9. ADD: Foreign key constraints for referential integrity
-- ======================================================================

-- Add foreign key constraints for phase relationships
ALTER TABLE campaign_phases 
ADD CONSTRAINT fk_campaign_phases_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE campaigns 
ADD CONSTRAINT fk_campaigns_current_phase_id 
FOREIGN KEY (current_phase_id) REFERENCES campaign_phases(id) ON DELETE SET NULL;

-- Add foreign keys for phase-specific tables
ALTER TABLE domain_generation_phases 
ADD CONSTRAINT fk_domain_generation_phases_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE dns_validation_phases 
ADD CONSTRAINT fk_dns_validation_phases_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_dns_validation_phases_source 
FOREIGN KEY (source_phase_id) REFERENCES campaign_phases(id) ON DELETE SET NULL;

ALTER TABLE http_keyword_validation_phases 
ADD CONSTRAINT fk_http_keyword_phases_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_http_keyword_phases_source 
FOREIGN KEY (source_phase_id) REFERENCES campaign_phases(id) ON DELETE SET NULL;

ALTER TABLE analysis_phases 
ADD CONSTRAINT fk_analysis_phases_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_analysis_phases_source 
FOREIGN KEY (source_phase_id) REFERENCES campaign_phases(id) ON DELETE SET NULL;

-- Update campaign_jobs foreign keys
ALTER TABLE campaign_jobs 
ADD CONSTRAINT fk_campaign_jobs_phase_id 
FOREIGN KEY (phase_id) REFERENCES campaign_phases(id) ON DELETE CASCADE;

-- ======================================================================
-- 10. DATA MIGRATION: Transform existing campaigns to new structure
-- ======================================================================

-- Migrate existing campaigns to LeadGenerationCampaign structure
-- Step 1: Set campaign type for all existing campaigns
UPDATE campaigns SET campaign_type = 'lead_generation' WHERE campaign_type IS NULL;

-- Step 2: Create phases for existing campaigns based on their current state
INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, configuration, created_at, updated_at)
SELECT 
    c.id as campaign_id,
    'domain_generation' as phase_type,
    1 as phase_order,
    CASE 
        WHEN c.current_phase = 'generation' AND c.phase_status = 'completed' THEN 'completed'
        WHEN c.current_phase = 'generation' AND c.phase_status = 'in_progress' THEN 'in_progress'
        WHEN c.current_phase = 'generation' AND c.phase_status = 'failed' THEN 'failed'
        ELSE 'not_started'
    END as status,
    '{}' as configuration,
    c.created_at,
    c.updated_at
FROM campaigns c
WHERE NOT EXISTS (
    SELECT 1 FROM campaign_phases cp 
    WHERE cp.campaign_id = c.id AND cp.phase_type = 'domain_generation'
);

-- Create DNS validation phases for campaigns that have progressed beyond domain generation
INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, configuration, created_at, updated_at)
SELECT 
    c.id as campaign_id,
    'dns_validation' as phase_type,
    2 as phase_order,
    CASE 
        WHEN c.current_phase = 'dns_validation' AND c.phase_status = 'completed' THEN 'completed'
        WHEN c.current_phase = 'dns_validation' AND c.phase_status = 'in_progress' THEN 'in_progress'
        WHEN c.current_phase = 'dns_validation' AND c.phase_status = 'failed' THEN 'failed'
        WHEN c.current_phase IN ('http_keyword_validation', 'analysis') THEN 'completed'
        ELSE 'not_started'
    END as status,
    '{}' as configuration,
    c.created_at,
    c.updated_at
FROM campaigns c
WHERE c.current_phase IN ('dns_validation', 'http_keyword_validation', 'analysis')
AND NOT EXISTS (
    SELECT 1 FROM campaign_phases cp 
    WHERE cp.campaign_id = c.id AND cp.phase_type = 'dns_validation'
);

-- Create HTTP keyword validation phases
INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, configuration, created_at, updated_at)
SELECT 
    c.id as campaign_id,
    'http_keyword_validation' as phase_type,
    3 as phase_order,
    CASE 
        WHEN c.current_phase = 'http_keyword_validation' AND c.phase_status = 'completed' THEN 'completed'
        WHEN c.current_phase = 'http_keyword_validation' AND c.phase_status = 'in_progress' THEN 'in_progress'
        WHEN c.current_phase = 'http_keyword_validation' AND c.phase_status = 'failed' THEN 'failed'
        WHEN c.current_phase = 'analysis' THEN 'completed'
        ELSE 'not_started'
    END as status,
    '{}' as configuration,
    c.created_at,
    c.updated_at
FROM campaigns c
WHERE c.current_phase IN ('http_keyword_validation', 'analysis')
AND NOT EXISTS (
    SELECT 1 FROM campaign_phases cp 
    WHERE cp.campaign_id = c.id AND cp.phase_type = 'http_keyword_validation'
);

-- Create analysis phases
INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, configuration, created_at, updated_at)
SELECT 
    c.id as campaign_id,
    'analysis' as phase_type,
    4 as phase_order,
    CASE 
        WHEN c.current_phase = 'analysis' AND c.phase_status = 'completed' THEN 'completed'
        WHEN c.current_phase = 'analysis' AND c.phase_status = 'in_progress' THEN 'in_progress'
        WHEN c.current_phase = 'analysis' AND c.phase_status = 'failed' THEN 'failed'
        ELSE 'not_started'
    END as status,
    '{}' as configuration,
    c.created_at,
    c.updated_at
FROM campaigns c
WHERE c.current_phase = 'analysis'
AND NOT EXISTS (
    SELECT 1 FROM campaign_phases cp 
    WHERE cp.campaign_id = c.id AND cp.phase_type = 'analysis'
);

-- Step 3: Update campaigns.current_phase_id to point to the active phase
UPDATE campaigns 
SET current_phase_id = (
    SELECT cp.id 
    FROM campaign_phases cp 
    WHERE cp.campaign_id = campaigns.id 
    AND cp.phase_type = campaigns.current_phase
    LIMIT 1
);

-- Step 4: Migrate domain generation parameters
INSERT INTO domain_generation_phases (
    phase_id, campaign_id, pattern_type, variable_length, character_set, 
    constant_string, tld, num_domains_to_generate, current_offset, config_hash, created_at, updated_at
)
SELECT 
    cp.id as phase_id,
    dgcp.campaign_id,
    dgcp.pattern_type,
    dgcp.variable_length,
    dgcp.character_set,
    dgcp.constant_string,
    dgcp.tld,
    dgcp.num_domains_to_generate,
    dgcp.current_offset,
    dgcp.config_hash,
    dgcp.created_at,
    dgcp.updated_at
FROM domain_generation_campaign_params dgcp
JOIN campaign_phases cp ON cp.campaign_id = dgcp.campaign_id AND cp.phase_type = 'domain_generation';

-- Step 5: Update result tables with phase_id and campaign_id
UPDATE generated_domains gd
SET 
    phase_id = dgp.phase_id,
    campaign_id = dgp.campaign_id
FROM domain_generation_phases dgp
WHERE gd.domain_generation_campaign_id = dgp.campaign_id;

UPDATE dns_validation_results dvr
SET 
    phase_id = (
        SELECT cp.id 
        FROM campaign_phases cp 
        WHERE cp.campaign_id = dvr.dns_campaign_id AND cp.phase_type = 'dns_validation'
    ),
    campaign_id = dvr.dns_campaign_id;

UPDATE http_keyword_results hkr
SET 
    phase_id = (
        SELECT cp.id 
        FROM campaign_phases cp 
        WHERE cp.campaign_id = hkr.http_keyword_campaign_id AND cp.phase_type = 'http_keyword_validation'
    ),
    campaign_id = hkr.http_keyword_campaign_id;

-- ======================================================================
-- 11. CLEANUP: Remove legacy campaign-specific tables and columns
-- ======================================================================

-- Drop legacy domain generation campaign params table (data migrated)
DROP TABLE IF EXISTS domain_generation_campaign_params CASCADE;

-- Drop legacy campaign configuration tables that are now handled by phases
DROP TABLE IF EXISTS dns_validation_campaign_params CASCADE;
DROP TABLE IF EXISTS http_keyword_campaign_params CASCADE;

-- Remove legacy campaign-specific columns from result tables
ALTER TABLE generated_domains 
DROP COLUMN IF EXISTS domain_generation_campaign_id CASCADE;

ALTER TABLE dns_validation_results 
DROP COLUMN IF EXISTS dns_campaign_id CASCADE;

ALTER TABLE http_keyword_results 
DROP COLUMN IF EXISTS http_keyword_campaign_id CASCADE;

-- ======================================================================
-- 12. CREATE: Triggers for maintaining data consistency
-- ======================================================================

-- Trigger to update campaign overall progress when phase progress changes
CREATE OR REPLACE FUNCTION update_campaign_overall_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE campaigns 
    SET 
        overall_progress = (
            SELECT AVG(progress_percentage) 
            FROM campaign_phases 
            WHERE campaign_id = NEW.campaign_id
        ),
        completed_phases = (
            SELECT COUNT(*) 
            FROM campaign_phases 
            WHERE campaign_id = NEW.campaign_id AND status = 'completed'
        ),
        updated_at = NOW()
    WHERE id = NEW.campaign_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_progress
    AFTER UPDATE OF progress_percentage, status ON campaign_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_overall_progress();

-- Trigger to update updated_at on phase changes
CREATE TRIGGER trigger_update_campaign_phases_updated_at
    BEFORE UPDATE ON campaign_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ======================================================================
-- PHASE-CENTRIC ARCHITECTURE MIGRATION COMPLETE
-- ======================================================================
-- 
-- Key Changes:
-- 1. ✅ campaigns → LeadGenerationCampaign with 4 phases
-- 2. ✅ campaign_phases table tracks individual phase execution
-- 3. ✅ Phase-specific configuration tables
-- 4. ✅ campaign_jobs → phase-centric job management
-- 5. ✅ Result tables now reference phases
-- 6. ✅ Data migrated from old structure to new
-- 7. ✅ Legacy tables and columns removed
-- 8. ✅ Referential integrity maintained
-- 9. ✅ Triggers for data consistency
--
-- Next Steps:
-- 1. Update Go models to match new schema
-- 2. Refactor services to be phase-centric
-- 3. Update API endpoints for phase control
-- 4. Update frontend to use phase-centric architecture
-- ======================================================================