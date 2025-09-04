-- Fix trigger function to use correct enum value 'in_progress' instead of 'running'
-- The campaign_phases.status column uses phase_status_enum which has 'in_progress' not 'running'

CREATE OR REPLACE FUNCTION trigger_campaign_state_transition()
RETURNS TRIGGER AS $$
DECLARE
    valid_transition BOOLEAN := FALSE;
    state_change_data JSONB;
    current_user_id UUID;
BEGIN
    -- Get current user from session context
    current_user_id := COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        NEW.user_id  -- Fixed: changed from created_by to user_id
    );

    -- Only process if business_status actually changed
    IF OLD.business_status IS DISTINCT FROM NEW.business_status THEN

        -- Validate state transitions
        valid_transition := CASE
            WHEN OLD.business_status = 'draft' AND NEW.business_status IN ('running', 'deleted') THEN TRUE
            WHEN OLD.business_status = 'running' AND NEW.business_status IN ('paused', 'completed', 'failed', 'cancelled') THEN TRUE
            WHEN OLD.business_status = 'paused' AND NEW.business_status IN ('running', 'cancelled', 'completed') THEN TRUE
            WHEN OLD.business_status = 'failed' AND NEW.business_status IN ('running', 'cancelled') THEN TRUE
            WHEN OLD.business_status = 'completed' AND NEW.business_status = 'archived' THEN TRUE
            WHEN OLD.business_status = 'cancelled' AND NEW.business_status = 'archived' THEN TRUE
            ELSE FALSE
        END;

        -- Reject invalid transitions
        IF NOT valid_transition THEN
            RAISE EXCEPTION 'Invalid campaign state transition from % to %', OLD.business_status, NEW.business_status;
        END IF;

        -- Prepare state change data
        state_change_data := jsonb_build_object(
            'campaign_id', NEW.id,
            'old_status', OLD.business_status,
            'new_status', NEW.business_status,
            'current_phase', NEW.current_phase,
            'transition_timestamp', NOW(),
            'triggered_by', current_user_id
        );

        -- Log state transition
        INSERT INTO campaign_state_transitions (
            campaign_id,
            from_status,
            to_status,
            triggered_by,
            trigger_reason,
            metadata
        ) VALUES (
            NEW.id,
            OLD.business_status,
            NEW.business_status,
            current_user_id,
            COALESCE(current_setting('app.state_change_reason', true), 'Manual update'),
            state_change_data
        );

        -- Create campaign snapshot
        INSERT INTO campaign_snapshots (
            campaign_id,
            snapshot_data,
            snapshot_reason
        ) VALUES (
            NEW.id,
            to_jsonb(NEW),
            'State transition to ' || NEW.business_status
        );
    END IF;

    -- Handle phase transitions
    IF OLD.current_phase IS DISTINCT FROM NEW.current_phase THEN
        -- Log phase transition to campaign_state_events with correct column names
        INSERT INTO campaign_state_events (
            campaign_id,
            event_type,
            source_state,
            target_state,
            reason,
            triggered_by,                    -- ✅ Fixed: use triggered_by instead of user_id
            event_data,
            operation_context,               -- ✅ Fixed: include required operation_context
            user_id                          -- ✅ Keep user_id for backward compatibility
        ) VALUES (
            NEW.id,
            'phase_transition',
            OLD.current_phase,
            NEW.current_phase,
            'Phase transition triggered by campaign update',
            COALESCE(current_user_id::text, 'system'),  -- ✅ Fixed: ensure NOT NULL and convert to text
            jsonb_build_object(
                'old_phase', OLD.current_phase,
                'new_phase', NEW.current_phase,
                'timestamp', NOW()
            ),
            jsonb_build_object(                -- ✅ Fixed: provide operation_context
                'trigger_type', 'automatic',
                'source', 'campaign_update',
                'user_id', current_user_id,
                'session_id', current_setting('app.session_id', true)
            ),
            current_user_id                    -- ✅ Keep user_id populated
        );

        -- Update phase completion status
        IF OLD.current_phase IS NOT NULL THEN
            UPDATE campaign_phases
            SET
                status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE campaign_id = NEW.id AND phase_type = OLD.current_phase;
        END IF;

        -- ✅ FIXED: Start new phase with correct enum value
        IF NEW.current_phase IS NOT NULL THEN
            UPDATE campaign_phases
            SET
                status = 'in_progress',              -- ✅ Fixed: use 'in_progress' instead of 'running'
                started_at = COALESCE(started_at, NOW()),
                updated_at = NOW()
            WHERE campaign_id = NEW.id AND phase_type = NEW.current_phase;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the fix
COMMENT ON FUNCTION trigger_campaign_state_transition() IS 'Fixed to use in_progress instead of running for phase_status_enum compatibility';
