-- Campaign State Management Schema for Event Sourcing
-- Based on Go models: CampaignStateEvent, CampaignStateSnapshot, CampaignStateTransition

-- Campaign state events table for event sourcing
CREATE TABLE IF NOT EXISTS campaign_state_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    source_state VARCHAR(50),
    target_state VARCHAR(50),
    reason TEXT,
    triggered_by VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    operation_context JSONB NOT NULL,
    sequence_number BIGSERIAL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    persisted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    processing_error TEXT,
    correlation_id UUID
);

-- Campaign state snapshots table for performance optimization
CREATE TABLE IF NOT EXISTS campaign_state_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    current_state VARCHAR(50) NOT NULL,
    state_data JSONB NOT NULL,
    last_event_sequence BIGINT NOT NULL,
    snapshot_metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum VARCHAR(64) NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE
);

-- Campaign state transitions table for tracking state changes
CREATE TABLE IF NOT EXISTS campaign_state_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_event_id UUID NOT NULL REFERENCES campaign_state_events(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    from_state VARCHAR(50) NOT NULL,
    to_state VARCHAR(50) NOT NULL,
    is_valid_transition BOOLEAN NOT NULL DEFAULT TRUE,
    validation_errors JSONB,
    transition_metadata JSONB,
    triggered_by VARCHAR(100) NOT NULL,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

-- Domain pattern type enum for domain generation
CREATE TYPE domain_pattern_type_enum AS ENUM (
    'prefix_variable',
    'suffix_variable', 
    'both_variable'
);

-- Keyword rule type enum
CREATE TYPE keyword_rule_type_enum AS ENUM (
    'string',
    'regex'
);

-- Indexes for campaign state management
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_campaign_id ON campaign_state_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_event_type ON campaign_state_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_sequence_number ON campaign_state_events(sequence_number);
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_occurred_at ON campaign_state_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_processing_status ON campaign_state_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_correlation_id ON campaign_state_events(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_source_target ON campaign_state_events(source_state, target_state) WHERE source_state IS NOT NULL AND target_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_state_snapshots_campaign_id ON campaign_state_snapshots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_state_snapshots_current_state ON campaign_state_snapshots(current_state);
CREATE INDEX IF NOT EXISTS idx_campaign_state_snapshots_last_event_sequence ON campaign_state_snapshots(last_event_sequence);
CREATE INDEX IF NOT EXISTS idx_campaign_state_snapshots_created_at ON campaign_state_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_state_snapshots_is_valid ON campaign_state_snapshots(is_valid) WHERE is_valid = TRUE;

CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_state_event_id ON campaign_state_transitions(state_event_id);
CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_campaign_id ON campaign_state_transitions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_from_to_state ON campaign_state_transitions(from_state, to_state);
CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_is_valid ON campaign_state_transitions(is_valid_transition);
CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_initiated_at ON campaign_state_transitions(initiated_at);
CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_completed_at ON campaign_state_transitions(completed_at) WHERE completed_at IS NOT NULL;

-- GIN indexes for JSONB columns in state management
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_event_data_gin ON campaign_state_events USING GIN(event_data);
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_operation_context_gin ON campaign_state_events USING GIN(operation_context);
CREATE INDEX IF NOT EXISTS idx_campaign_state_snapshots_state_data_gin ON campaign_state_snapshots USING GIN(state_data);
CREATE INDEX IF NOT EXISTS idx_campaign_state_snapshots_snapshot_metadata_gin ON campaign_state_snapshots USING GIN(snapshot_metadata);
CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_validation_errors_gin ON campaign_state_transitions USING GIN(validation_errors) WHERE validation_errors IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_transition_metadata_gin ON campaign_state_transitions USING GIN(transition_metadata) WHERE transition_metadata IS NOT NULL;

-- Unique constraints for state management
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_state_events_sequence_unique ON campaign_state_events(campaign_id, sequence_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_state_snapshots_latest ON campaign_state_snapshots(campaign_id, created_at DESC);

-- Add foreign key constraint to link current_phase_id in campaigns to campaign_phases
ALTER TABLE lead_generation_campaigns 
ADD CONSTRAINT fk_lead_generation_campaigns_current_phase_id 
FOREIGN KEY (current_phase_id) REFERENCES campaign_phases(id) ON DELETE SET NULL;