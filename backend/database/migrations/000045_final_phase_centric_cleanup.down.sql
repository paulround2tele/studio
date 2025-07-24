-- ======================================================================
-- FINAL PHASE-CENTRIC CLEANUP MIGRATION (DOWN/ROLLBACK)
-- ======================================================================
-- This migration safely rolls back the final cleanup by recreating
-- the legacy structures that were removed in the up migration.
--
-- WARNING: This rollback should only be used in emergency situations
-- as it recreates legacy structures that conflict with the clean
-- phase-centric architecture.
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. RECREATE LEGACY PHASE-SPECIFIC TABLES
-- ======================================================================

-- Recreate domain_generation_phases table
CREATE TABLE IF NOT EXISTS domain_generation_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID,
    campaign_id UUID,
    
    -- Domain generation configuration
    pattern_type TEXT CHECK (pattern_type IN ('prefix', 'suffix', 'both')),
    variable_length INTEGER CHECK (variable_length > 0),
    character_set TEXT,
    constant_string TEXT,
    tld TEXT,
    num_domains_to_generate BIGINT DEFAULT 1000,
    
    -- Generation tracking
    current_offset BIGINT DEFAULT 0,
    config_hash TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate dns_validation_phases table
CREATE TABLE IF NOT EXISTS dns_validation_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID,
    campaign_id UUID,
    source_phase_id UUID,
    
    -- DNS validation configuration
    persona_ids UUID[],
    rotation_interval_seconds INTEGER DEFAULT 60,
    processing_speed_per_minute INTEGER DEFAULT 100,
    batch_size INTEGER DEFAULT 50,
    retry_attempts INTEGER DEFAULT 3,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate http_keyword_validation_phases table
CREATE TABLE IF NOT EXISTS http_keyword_validation_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID,
    campaign_id UUID,
    source_phase_id UUID,
    
    -- HTTP keyword validation configuration
    persona_ids UUID[],
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate analysis_phases table
CREATE TABLE IF NOT EXISTS analysis_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID,
    campaign_id UUID,
    source_phase_id UUID,
    
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================================================
-- 2. RECREATE EVENT STORE TABLES
-- ======================================================================

CREATE TABLE IF NOT EXISTS event_store (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    aggregate_id VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    event_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    causation_id UUID,
    correlation_id UUID,
    stream_position BIGINT NOT NULL,
    global_position BIGSERIAL NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(aggregate_id, stream_position)
);

CREATE TABLE IF NOT EXISTS event_projections (
    id BIGSERIAL PRIMARY KEY,
    projection_name VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    projection_data JSONB NOT NULL,
    last_event_position BIGINT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(projection_name, aggregate_id)
);

-- ======================================================================
-- 3. RECREATE LEGACY CAMPAIGN PARAMETER TABLES
-- ======================================================================

CREATE TABLE IF NOT EXISTS dns_validation_campaign_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID,
    persona_ids UUID[],
    rotation_interval_seconds INTEGER DEFAULT 60,
    processing_speed_per_minute INTEGER DEFAULT 100,
    batch_size INTEGER DEFAULT 50,
    retry_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS http_keyword_campaign_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID,
    persona_ids UUID[],
    keyword_set_ids UUID[],
    ad_hoc_keywords TEXT[],
    proxy_pool_id UUID,
    proxy_selection_strategy TEXT DEFAULT 'round_robin',
    rotation_interval_seconds INTEGER DEFAULT 300,
    processing_speed_per_minute INTEGER DEFAULT 50,
    batch_size INTEGER DEFAULT 25,
    retry_attempts INTEGER DEFAULT 3,
    target_http_ports INTEGER[] DEFAULT ARRAY[80, 443],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================================================
-- 4. RECREATE INDEXES FOR LEGACY TABLES
-- ======================================================================

-- Phase-specific table indexes
CREATE INDEX IF NOT EXISTS idx_domain_generation_phases_phase_id ON domain_generation_phases(phase_id);
CREATE INDEX IF NOT EXISTS idx_domain_generation_phases_campaign_id ON domain_generation_phases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_domain_generation_phases_config_hash ON domain_generation_phases(config_hash);

CREATE INDEX IF NOT EXISTS idx_dns_validation_phases_phase_id ON dns_validation_phases(phase_id);
CREATE INDEX IF NOT EXISTS idx_dns_validation_phases_campaign_id ON dns_validation_phases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dns_validation_phases_source ON dns_validation_phases(source_phase_id);

CREATE INDEX IF NOT EXISTS idx_http_keyword_phases_phase_id ON http_keyword_validation_phases(phase_id);
CREATE INDEX IF NOT EXISTS idx_http_keyword_phases_campaign_id ON http_keyword_validation_phases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_http_keyword_phases_source ON http_keyword_validation_phases(source_phase_id);

CREATE INDEX IF NOT EXISTS idx_analysis_phases_phase_id ON analysis_phases(phase_id);
CREATE INDEX IF NOT EXISTS idx_analysis_phases_campaign_id ON analysis_phases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analysis_phases_source ON analysis_phases(source_phase_id);

-- Event store indexes
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate ON event_store(aggregate_id, stream_position);
CREATE INDEX IF NOT EXISTS idx_event_store_global_position ON event_store(global_position);
CREATE INDEX IF NOT EXISTS idx_event_store_type_time ON event_store(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_projections_name_aggregate ON event_projections(projection_name, aggregate_id);

-- ======================================================================
-- 5. RESTORE campaigns TABLE NAME (if needed)
-- ======================================================================

DO $$
BEGIN
    -- If lead_generation_campaigns exists but campaigns doesn't, rename it back
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_generation_campaigns')
    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        
        -- Drop foreign key constraints first
        ALTER TABLE campaign_phases DROP CONSTRAINT IF EXISTS fk_campaign_phases_campaign_id;
        ALTER TABLE campaign_jobs DROP CONSTRAINT IF EXISTS fk_campaign_jobs_campaign_id;
        
        -- Rename table back
        ALTER TABLE lead_generation_campaigns RENAME TO campaigns;
        
        -- Recreate foreign key constraints
        ALTER TABLE campaign_phases ADD CONSTRAINT fk_campaign_phases_campaign_id 
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
            
        ALTER TABLE campaign_jobs ADD CONSTRAINT fk_campaign_jobs_campaign_id 
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
            
        RAISE NOTICE 'Renamed lead_generation_campaigns back to campaigns';
    END IF;
END $$;

-- ======================================================================
-- 6. UPDATE generated_domains FOREIGN KEY REFERENCES
-- ======================================================================

DO $$
BEGIN
    -- Update foreign key to reference campaigns (not lead_generation_campaigns)
    ALTER TABLE generated_domains DROP CONSTRAINT IF EXISTS fk_generated_domains_campaign;
    
    -- Add constraint back to campaigns table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        ALTER TABLE generated_domains ADD CONSTRAINT fk_generated_domains_campaign 
            FOREIGN KEY (domain_generation_campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ======================================================================
-- 7. ADD FOREIGN KEY CONSTRAINTS FOR RECREATED TABLES
-- ======================================================================

-- Add foreign keys for phase-specific tables (if campaign_phases exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_phases') THEN
        -- Domain generation phases
        ALTER TABLE domain_generation_phases ADD CONSTRAINT fk_domain_generation_phases_phase_id 
            FOREIGN KEY (phase_id) REFERENCES campaign_phases(id) ON DELETE CASCADE;
            
        -- DNS validation phases  
        ALTER TABLE dns_validation_phases ADD CONSTRAINT fk_dns_validation_phases_phase_id 
            FOREIGN KEY (phase_id) REFERENCES campaign_phases(id) ON DELETE CASCADE;
        ALTER TABLE dns_validation_phases ADD CONSTRAINT fk_dns_validation_phases_source 
            FOREIGN KEY (source_phase_id) REFERENCES campaign_phases(id) ON DELETE SET NULL;
            
        -- HTTP keyword validation phases
        ALTER TABLE http_keyword_validation_phases ADD CONSTRAINT fk_http_keyword_phases_phase_id 
            FOREIGN KEY (phase_id) REFERENCES campaign_phases(id) ON DELETE CASCADE;
        ALTER TABLE http_keyword_validation_phases ADD CONSTRAINT fk_http_keyword_phases_source 
            FOREIGN KEY (source_phase_id) REFERENCES campaign_phases(id) ON DELETE SET NULL;
            
        -- Analysis phases
        ALTER TABLE analysis_phases ADD CONSTRAINT fk_analysis_phases_phase_id 
            FOREIGN KEY (phase_id) REFERENCES campaign_phases(id) ON DELETE CASCADE;
        ALTER TABLE analysis_phases ADD CONSTRAINT fk_analysis_phases_source 
            FOREIGN KEY (source_phase_id) REFERENCES campaign_phases(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ======================================================================
-- 8. REMOVE CLEANUP-SPECIFIC INDEXES
-- ======================================================================

-- Remove indexes created in the cleanup migration
DROP INDEX IF EXISTS idx_lead_gen_campaigns_phase_data_counts;
DROP INDEX IF EXISTS idx_campaign_phases_active_phases;
DROP INDEX IF EXISTS idx_generated_domains_campaign_status;

-- ======================================================================
-- 9. RESTORE ORIGINAL TABLE COMMENTS
-- ======================================================================

DO $$
BEGIN
    -- Update table comments to reflect rollback state
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        COMMENT ON TABLE campaigns IS 'Campaign table with dual architecture support (phase-centric and legacy)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_generation_campaigns') THEN
        COMMENT ON TABLE lead_generation_campaigns IS 'Lead generation campaigns with JSONB storage (rollback state)';
    END IF;
    
    COMMENT ON TABLE campaign_phases IS 'Phase tracking table with legacy phase-specific table support';
    COMMENT ON TABLE generated_domains IS 'Domain data table with legacy validation result table support';
END $$;

-- ======================================================================
-- 10. VALIDATION
-- ======================================================================

DO $$
BEGIN
    RAISE NOTICE 'ROLLBACK COMPLETE: Legacy structures have been recreated';
    RAISE WARNING 'Database is now in a dual architecture state - this is not recommended for production';
    RAISE WARNING 'Consider running the up migration again to return to clean phase-centric architecture';
END $$;

-- Update table statistics
ANALYZE domain_generation_phases;
ANALYZE dns_validation_phases;
ANALYZE http_keyword_validation_phases;
ANALYZE analysis_phases;
ANALYZE event_store;
ANALYZE event_projections;

COMMIT;

-- ======================================================================
-- ROLLBACK MIGRATION COMPLETE
-- ======================================================================
-- 
-- ⚠️  WARNING: Database is now in dual architecture state
-- ⚠️  Legacy structures have been recreated
-- ⚠️  This conflicts with the clean phase-centric design
-- 
-- Recommendation: Run the up migration to return to clean state
-- ======================================================================