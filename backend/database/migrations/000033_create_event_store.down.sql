-- Rollback Phase 2.2: Restore legacy event tracking system

-- Restore legacy event tracking tables
CREATE TABLE campaign_state_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    current_state campaign_state_enum NOT NULL,
    state_data JSONB NOT NULL,
    last_event_sequence BIGINT NOT NULL,
    snapshot_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id)
);

CREATE TABLE campaign_state_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    state_event_id UUID NOT NULL REFERENCES campaign_state_events(id) ON DELETE CASCADE,
    from_state campaign_state_enum,
    to_state campaign_state_enum NOT NULL,
    transition_type VARCHAR(50) NOT NULL,
    validation_rules JSONB,
    is_valid BOOLEAN DEFAULT true,
    validation_errors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop the new event sourcing table
DROP TABLE IF EXISTS campaign_events CASCADE;

-- Restore indexes for legacy tables
CREATE INDEX idx_campaign_state_snapshots_campaign_id ON campaign_state_snapshots(campaign_id);
CREATE INDEX idx_campaign_state_snapshots_state ON campaign_state_snapshots(current_state);
CREATE INDEX idx_campaign_state_transitions_campaign_id ON campaign_state_transitions(campaign_id);
CREATE INDEX idx_campaign_state_transitions_event_id ON campaign_state_transitions(state_event_id);
