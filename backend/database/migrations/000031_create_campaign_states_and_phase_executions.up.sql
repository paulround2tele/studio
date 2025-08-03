-- Phase 2.1: Create new campaign_states and phase_executions tables
-- Part of Database Architecture Cleanup

-- Create campaign_state_enum for the new state system
CREATE TYPE campaign_state_enum AS ENUM (
    'draft',
    'running', 
    'paused',
    'completed',
    'failed',
    'cancelled',
    'archived'
);

-- Create campaign_mode_enum for the new mode system
CREATE TYPE campaign_mode_enum AS ENUM (
    'full_sequence',
    'step_by_step'
);

-- Create execution_status_enum for the new phase execution system
CREATE TYPE execution_status_enum AS ENUM (
    'not_started',
    'ready',
    'configured', 
    'in_progress',
    'paused',
    'completed',
    'failed'
);

-- Create campaign_states table (new centralized state management)
CREATE TABLE campaign_states (
    campaign_id UUID PRIMARY KEY,
    current_state campaign_state_enum NOT NULL DEFAULT 'draft',
    mode campaign_mode_enum NOT NULL DEFAULT 'step_by_step',
    configuration JSONB NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to existing campaigns
    CONSTRAINT fk_campaign_states_campaign_id 
        FOREIGN KEY (campaign_id) 
        REFERENCES lead_generation_campaigns(id) 
        ON DELETE CASCADE
);

-- Create phase_executions table (replaces campaign_phases with better design)
CREATE TABLE phase_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    phase_type phase_type_enum NOT NULL,
    status execution_status_enum NOT NULL DEFAULT 'not_started',
    
    -- Execution tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Progress and metrics
    progress_percentage NUMERIC(5,2) DEFAULT 0.0,
    total_items BIGINT DEFAULT 0,
    processed_items BIGINT DEFAULT 0,
    successful_items BIGINT DEFAULT 0,
    failed_items BIGINT DEFAULT 0,
    
    -- Configuration and error handling
    configuration JSONB,
    error_details JSONB,
    metrics JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_phase_executions_campaign_id 
        FOREIGN KEY (campaign_id) 
        REFERENCES lead_generation_campaigns(id) 
        ON DELETE CASCADE,
        
    -- Ensure one execution per phase per campaign
    CONSTRAINT unique_campaign_phase 
        UNIQUE (campaign_id, phase_type)
);

-- Create indexes for performance
CREATE INDEX idx_campaign_states_current_state ON campaign_states(current_state);
CREATE INDEX idx_campaign_states_mode ON campaign_states(mode);
CREATE INDEX idx_campaign_states_updated_at ON campaign_states(updated_at);

CREATE INDEX idx_phase_executions_campaign_id ON phase_executions(campaign_id);
CREATE INDEX idx_phase_executions_phase_type ON phase_executions(phase_type);
CREATE INDEX idx_phase_executions_status ON phase_executions(status);
CREATE INDEX idx_phase_executions_started_at ON phase_executions(started_at) WHERE started_at IS NOT NULL;
CREATE INDEX idx_phase_executions_completed_at ON phase_executions(completed_at) WHERE completed_at IS NOT NULL;

-- GIN indexes for JSONB columns
CREATE INDEX idx_campaign_states_configuration_gin ON campaign_states USING gin(configuration);
CREATE INDEX idx_phase_executions_configuration_gin ON phase_executions USING gin(configuration) WHERE configuration IS NOT NULL;
CREATE INDEX idx_phase_executions_error_details_gin ON phase_executions USING gin(error_details) WHERE error_details IS NOT NULL;
CREATE INDEX idx_phase_executions_metrics_gin ON phase_executions USING gin(metrics) WHERE metrics IS NOT NULL;

-- Add constraints for data integrity
ALTER TABLE campaign_states ADD CONSTRAINT check_campaign_states_version_positive 
    CHECK (version > 0);

ALTER TABLE phase_executions ADD CONSTRAINT check_phase_executions_progress_range 
    CHECK (progress_percentage >= 0.0 AND progress_percentage <= 100.0);

ALTER TABLE phase_executions ADD CONSTRAINT check_phase_executions_items_non_negative 
    CHECK (total_items >= 0 AND processed_items >= 0 AND successful_items >= 0 AND failed_items >= 0);

ALTER TABLE phase_executions ADD CONSTRAINT check_phase_executions_items_consistency 
    CHECK (processed_items <= total_items);
