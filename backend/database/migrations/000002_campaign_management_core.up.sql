-- Campaign Management Core Schema
-- Based on Go models: LeadGenerationCampaign with phase-based architecture

-- Phase type enum for lead generation campaigns
CREATE TYPE phase_type_enum AS ENUM (
    'domain_generation',
    'dns_validation', 
    'http_keyword_validation',
    'analysis'
);

-- Phase status enum for tracking phase execution
CREATE TYPE phase_status_enum AS ENUM (
    'not_started',
    'ready',
    'configured', 
    'in_progress',
    'paused',
    'completed',
    'failed'
);

-- Job type enum for background processing
CREATE TYPE job_type_enum AS ENUM (
    'generation',
    'dns_validation',
    'http_keyword_validation', 
    'analysis'
);

-- Campaign job status enum
CREATE TYPE campaign_job_status_enum AS ENUM (
    'pending',
    'queued',
    'running',
    'completed',
    'failed',
    'cancelled'
);

-- Job business status enum
CREATE TYPE job_business_status_enum AS ENUM (
    'processing',
    'retry',
    'priority_queued',
    'batch_optimized'
);

-- Validation status enum
CREATE TYPE validation_status_enum AS ENUM (
    'pending',
    'valid',
    'invalid', 
    'error',
    'skipped'
);

-- Domain DNS status enum
CREATE TYPE domain_dns_status_enum AS ENUM (
    'pending',
    'ok',
    'error',
    'timeout'
);

-- Domain HTTP status enum  
CREATE TYPE domain_http_status_enum AS ENUM (
    'pending',
    'ok',
    'error',
    'timeout'
);

-- Domain lead status enum
CREATE TYPE domain_lead_status_enum AS ENUM (
    'pending',
    'match',
    'no_match',
    'error',
    'timeout'
);

-- Lead generation campaigns table with phase-based architecture
CREATE TABLE IF NOT EXISTS lead_generation_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Campaign lifecycle timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Campaign type (always 'lead_generation' in new architecture)
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'lead_generation',
    
    -- Phase management
    current_phase_id UUID,
    current_phase phase_type_enum,
    total_phases INTEGER NOT NULL DEFAULT 4,
    completed_phases INTEGER NOT NULL DEFAULT 0 CHECK (completed_phases >= 0 AND completed_phases <= 4),
    overall_progress DECIMAL(5,2) CHECK (overall_progress >= 0 AND overall_progress <= 100),
    
    -- Sequence mode configuration
    is_full_sequence_mode BOOLEAN NOT NULL DEFAULT FALSE,
    auto_advance_phases BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- JSONB columns for efficient phase data storage
    domains_data JSONB,
    dns_results JSONB,
    http_results JSONB,
    analysis_results JSONB,
    
    -- Progress tracking
    progress_percentage DECIMAL(5,2) CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    total_items BIGINT CHECK (total_items >= 0),
    processed_items BIGINT CHECK (processed_items >= 0),
    successful_items BIGINT CHECK (successful_items >= 0),
    failed_items BIGINT CHECK (failed_items >= 0),
    error_message TEXT,
    metadata JSONB,
    
    -- Campaign-level tracking (aggregated from phases)
    estimated_completion_at TIMESTAMPTZ,
    avg_processing_rate DECIMAL(10,2),
    last_heartbeat_at TIMESTAMPTZ,
    business_status VARCHAR(50),
    
    -- Phase status tracking
    phase_status phase_status_enum,
    
    -- Configuration storage for phases
    dns_config JSONB,
    http_config JSONB,
    
    CONSTRAINT valid_progress_items CHECK (
        processed_items IS NULL OR total_items IS NULL OR processed_items <= total_items
    ),
    CONSTRAINT valid_success_failure_items CHECK (
        successful_items IS NULL OR failed_items IS NULL OR processed_items IS NULL OR 
        (successful_items + failed_items) <= processed_items
    )
);

-- Campaign phases table for tracking individual phase execution
CREATE TABLE IF NOT EXISTS campaign_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    phase_type phase_type_enum NOT NULL,
    phase_order INTEGER NOT NULL CHECK (phase_order >= 1 AND phase_order <= 4),
    
    -- Phase execution status
    status phase_status_enum NOT NULL DEFAULT 'not_started',
    progress_percentage DECIMAL(5,2) CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Phase lifecycle timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Phase execution counters
    total_items BIGINT CHECK (total_items >= 0),
    processed_items BIGINT CHECK (processed_items >= 0),
    successful_items BIGINT CHECK (successful_items >= 0),
    failed_items BIGINT CHECK (failed_items >= 0),
    
    -- Phase configuration (JSON storage for phase-specific params)
    configuration JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(campaign_id, phase_type),
    UNIQUE(campaign_id, phase_order),
    CONSTRAINT valid_phase_progress_items CHECK (
        processed_items IS NULL OR total_items IS NULL OR processed_items <= total_items
    ),
    CONSTRAINT valid_phase_success_failure_items CHECK (
        successful_items IS NULL OR failed_items IS NULL OR processed_items IS NULL OR 
        (successful_items + failed_items) <= processed_items
    )
);

-- Indexes for campaign management core
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_user_id ON lead_generation_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_current_phase ON lead_generation_campaigns(current_phase);
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_phase_status ON lead_generation_campaigns(phase_status);
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_created_at ON lead_generation_campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_updated_at ON lead_generation_campaigns(updated_at);
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_business_status ON lead_generation_campaigns(business_status) WHERE business_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_completed_at ON lead_generation_campaigns(completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_phases_campaign_id ON campaign_phases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_phases_phase_type ON campaign_phases(phase_type);
CREATE INDEX IF NOT EXISTS idx_campaign_phases_status ON campaign_phases(status);
CREATE INDEX IF NOT EXISTS idx_campaign_phases_phase_order ON campaign_phases(phase_order);
CREATE INDEX IF NOT EXISTS idx_campaign_phases_started_at ON campaign_phases(started_at) WHERE started_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_phases_completed_at ON campaign_phases(completed_at) WHERE completed_at IS NOT NULL;

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_domains_data_gin ON lead_generation_campaigns USING GIN(domains_data) WHERE domains_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_dns_results_gin ON lead_generation_campaigns USING GIN(dns_results) WHERE dns_results IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_http_results_gin ON lead_generation_campaigns USING GIN(http_results) WHERE http_results IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_analysis_results_gin ON lead_generation_campaigns USING GIN(analysis_results) WHERE analysis_results IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_metadata_gin ON lead_generation_campaigns USING GIN(metadata) WHERE metadata IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_phases_configuration_gin ON campaign_phases USING GIN(configuration) WHERE configuration IS NOT NULL;