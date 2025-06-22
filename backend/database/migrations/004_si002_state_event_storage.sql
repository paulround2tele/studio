-- Migration 004: SI-002 Centralized State Management - State Event Storage
-- Creates tables for persistent state event storage and replay capability

BEGIN;

-- Enable pgcrypto extension for digest functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Campaign State Events Table: Core event sourcing table for state transitions
CREATE TABLE IF NOT EXISTS campaign_state_events (
    -- Unique identifier for the state event
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Foreign key to campaigns table
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    -- Type of state event (state_transition, validation_result, progress_update, error_occurred, etc.)
    event_type TEXT NOT NULL CHECK (event_type IN (
        'state_transition', 'validation_result', 'progress_update', 
        'error_occurred', 'configuration_change', 'resource_allocation',
        'batch_processed', 'worker_assigned', 'checkpoint_created'
    )),
    -- Source state before transition (NULL for initial events)
    source_state TEXT,
    -- Target state after transition (NULL for non-transition events)
    target_state TEXT,
    -- Reason for the state change
    reason TEXT,
    -- Actor that triggered the event (system, user_id, worker_id, etc.)
    triggered_by TEXT NOT NULL,
    -- Structured event data (campaign-specific context, metadata, etc.)
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Campaign operation context
    operation_context JSONB DEFAULT '{}'::jsonb,
    -- Version for optimistic locking on event ordering
    sequence_number BIGSERIAL,
    -- Timestamp when event occurred
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Timestamp when event was persisted to database
    persisted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Processing status of the event
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processed', 'failed', 'skipped'
    )),
    -- Error message if processing failed
    processing_error TEXT,
    -- Correlation ID for tracing related events
    correlation_id UUID,
    -- Ensures events are ordered per campaign
    CONSTRAINT uq_campaign_state_events_sequence UNIQUE (campaign_id, sequence_number)
);

-- Campaign State Transitions Table: Specific tracking for state transitions
CREATE TABLE IF NOT EXISTS campaign_state_transitions (
    -- Unique identifier for the transition
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Foreign key to the state event that created this transition
    state_event_id UUID NOT NULL REFERENCES campaign_state_events(id) ON DELETE CASCADE,
    -- Campaign this transition belongs to
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    -- Source state (where we came from)
    from_state TEXT NOT NULL,
    -- Target state (where we're going)
    to_state TEXT NOT NULL,
    -- Whether this transition is valid according to state machine rules
    is_valid_transition BOOLEAN NOT NULL DEFAULT true,
    -- Validation errors if transition was invalid
    validation_errors JSONB DEFAULT '[]'::jsonb,
    -- Transition metadata (duration, resources, etc.)
    transition_metadata JSONB DEFAULT '{}'::jsonb,
    -- Who/what triggered this transition
    triggered_by TEXT NOT NULL,
    -- When the transition was initiated
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- When the transition completed (NULL if still in progress)
    completed_at TIMESTAMPTZ,
    -- Duration of the transition in milliseconds
    duration_ms INTEGER,
    -- Ensures one transition per state event
    CONSTRAINT uq_state_transitions_event UNIQUE (state_event_id)
);

-- Campaign State Snapshots Table: Periodic state snapshots for faster replay
CREATE TABLE IF NOT EXISTS campaign_state_snapshots (
    -- Unique identifier for the snapshot
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Campaign this snapshot belongs to
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    -- Current state at time of snapshot
    current_state TEXT NOT NULL,
    -- Complete state data at time of snapshot
    state_data JSONB NOT NULL,
    -- Last processed event sequence number
    last_event_sequence BIGINT NOT NULL,
    -- Snapshot metadata (trigger reason, size, etc.)
    snapshot_metadata JSONB DEFAULT '{}'::jsonb,
    -- When this snapshot was created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Checksum for snapshot integrity validation
    checksum TEXT NOT NULL,
    -- Whether this snapshot is valid/usable
    is_valid BOOLEAN NOT NULL DEFAULT true,
    -- Ensures only one snapshot per sequence per campaign
    CONSTRAINT uq_campaign_snapshots_sequence UNIQUE (campaign_id, last_event_sequence)
);

-- Indexes for Performance

-- Primary query patterns: get events by campaign, ordered by sequence
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_campaign_sequence 
ON campaign_state_events(campaign_id, sequence_number ASC);

-- Query by event type and campaign
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_type_campaign 
ON campaign_state_events(campaign_id, event_type, occurred_at DESC);

-- Query by processing status for retry/cleanup
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_processing_status 
ON campaign_state_events(processing_status, occurred_at ASC) 
WHERE processing_status IN ('pending', 'failed');

-- Correlation ID for distributed tracing
CREATE INDEX IF NOT EXISTS idx_campaign_state_events_correlation 
ON campaign_state_events(correlation_id) 
WHERE correlation_id IS NOT NULL;

-- State transitions by campaign and time
CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_campaign_time 
ON campaign_state_transitions(campaign_id, initiated_at DESC);

-- Invalid transitions for monitoring
CREATE INDEX IF NOT EXISTS idx_campaign_state_transitions_invalid 
ON campaign_state_transitions(campaign_id, is_valid_transition, initiated_at DESC) 
WHERE is_valid_transition = false;

-- Snapshots by campaign and sequence for replay
CREATE INDEX IF NOT EXISTS idx_campaign_state_snapshots_campaign_sequence 
ON campaign_state_snapshots(campaign_id, last_event_sequence DESC);

-- Valid snapshots for quick access
CREATE INDEX IF NOT EXISTS idx_campaign_state_snapshots_valid 
ON campaign_state_snapshots(campaign_id, created_at DESC) 
WHERE is_valid = true;

-- Functions for State Event Management

-- Function to create state event with automatic sequence numbering
CREATE OR REPLACE FUNCTION create_campaign_state_event(
    p_campaign_id UUID,
    p_event_type TEXT,
    p_source_state TEXT DEFAULT NULL,
    p_target_state TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_triggered_by TEXT DEFAULT 'system',
    p_event_data JSONB DEFAULT '{}'::jsonb,
    p_operation_context JSONB DEFAULT '{}'::jsonb,
    p_correlation_id UUID DEFAULT NULL
) RETURNS TABLE(
    event_id UUID,
    sequence_number BIGINT,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    new_event_id UUID;
    new_sequence BIGINT;
BEGIN
    -- Generate new event ID
    new_event_id := gen_random_uuid();
    
    -- Insert the event (sequence_number will be auto-generated)
    INSERT INTO campaign_state_events (
        id, campaign_id, event_type, source_state, target_state, reason,
        triggered_by, event_data, operation_context, correlation_id,
        occurred_at, persisted_at
    ) VALUES (
        new_event_id, p_campaign_id, p_event_type, p_source_state, p_target_state, p_reason,
        p_triggered_by, p_event_data, p_operation_context, p_correlation_id,
        NOW(), NOW()
    ) RETURNING campaign_state_events.sequence_number INTO new_sequence;
    
    -- Return success
    RETURN QUERY SELECT new_event_id, new_sequence, TRUE, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error
        RETURN QUERY SELECT NULL::UUID, 0::BIGINT, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get state events for replay (with optional sequence range)
CREATE OR REPLACE FUNCTION get_campaign_state_events_for_replay(
    p_campaign_id UUID,
    p_from_sequence BIGINT DEFAULT 0,
    p_to_sequence BIGINT DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000
) RETURNS TABLE(
    id UUID,
    event_type TEXT,
    source_state TEXT,
    target_state TEXT,
    reason TEXT,
    triggered_by TEXT,
    event_data JSONB,
    operation_context JSONB,
    sequence_number BIGINT,
    occurred_at TIMESTAMPTZ,
    correlation_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cse.id, cse.event_type, cse.source_state, cse.target_state, cse.reason,
        cse.triggered_by, cse.event_data, cse.operation_context, cse.sequence_number,
        cse.occurred_at, cse.correlation_id
    FROM campaign_state_events cse
    WHERE cse.campaign_id = p_campaign_id
      AND cse.sequence_number >= p_from_sequence
      AND (p_to_sequence IS NULL OR cse.sequence_number <= p_to_sequence)
      AND cse.event_type = 'state_transition'  -- Only return main transition events
    ORDER BY cse.sequence_number ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to create state snapshot
CREATE OR REPLACE FUNCTION create_campaign_state_snapshot(
    p_campaign_id UUID,
    p_current_state TEXT,
    p_state_data JSONB,
    p_last_event_sequence BIGINT,
    p_snapshot_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE(
    snapshot_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    new_snapshot_id UUID;
    calculated_checksum TEXT;
BEGIN
    -- Generate snapshot ID
    new_snapshot_id := gen_random_uuid();
    
    -- Calculate checksum for integrity
    calculated_checksum := md5(
        p_campaign_id::text || '|' ||
        p_current_state || '|' ||
        p_state_data::text || '|' ||
        p_last_event_sequence::text
    );
    
    -- Insert snapshot
    INSERT INTO campaign_state_snapshots (
        id, campaign_id, current_state, state_data, last_event_sequence,
        snapshot_metadata, checksum, created_at
    ) VALUES (
        new_snapshot_id, p_campaign_id, p_current_state, p_state_data, p_last_event_sequence,
        p_snapshot_metadata, calculated_checksum, NOW()
    );
    
    RETURN QUERY SELECT new_snapshot_id, TRUE, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get latest valid snapshot for campaign
CREATE OR REPLACE FUNCTION get_latest_campaign_state_snapshot(
    p_campaign_id UUID
) RETURNS TABLE(
    id UUID,
    current_state TEXT,
    state_data JSONB,
    last_event_sequence BIGINT,
    snapshot_metadata JSONB,
    created_at TIMESTAMPTZ,
    checksum TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        css.id, css.current_state, css.state_data, css.last_event_sequence,
        css.snapshot_metadata, css.created_at, css.checksum
    FROM campaign_state_snapshots css
    WHERE css.campaign_id = p_campaign_id
      AND css.is_valid = true
    ORDER BY css.last_event_sequence DESC, css.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update processing_status for completed transitions
CREATE OR REPLACE FUNCTION update_state_event_processing_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a state transition is completed, mark the associated event as processed
    IF TG_OP = 'UPDATE' AND OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
        UPDATE campaign_state_events
        SET processing_status = 'processed'
        WHERE id = NEW.state_event_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to state transitions table
DROP TRIGGER IF EXISTS trigger_update_state_event_processing ON campaign_state_transitions;
CREATE TRIGGER trigger_update_state_event_processing
    AFTER UPDATE ON campaign_state_transitions
    FOR EACH ROW
    EXECUTE FUNCTION update_state_event_processing_status();

-- Comments for documentation
COMMENT ON TABLE campaign_state_events IS 'Event sourcing table for campaign state management - stores all state changes for replay and audit';
COMMENT ON TABLE campaign_state_transitions IS 'Tracks specific state transitions with validation and timing information';
COMMENT ON TABLE campaign_state_snapshots IS 'Periodic snapshots of campaign state for faster replay and recovery';

COMMENT ON FUNCTION create_campaign_state_event IS 'Creates a new state event with automatic sequence numbering and validation';
COMMENT ON FUNCTION get_campaign_state_events_for_replay IS 'Retrieves state events for campaign state replay in sequence order';
COMMENT ON FUNCTION create_campaign_state_snapshot IS 'Creates a new state snapshot with integrity checksum';
COMMENT ON FUNCTION get_latest_campaign_state_snapshot IS 'Gets the most recent valid state snapshot for a campaign';

COMMIT;