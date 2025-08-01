-- Migration: Establish campaign_phases as single source of truth for phase status
-- Mark campaign-level phase fields as computed/derived fields

-- Add comments to indicate these are now computed
COMMENT ON COLUMN lead_generation_campaigns.current_phase IS 'COMPUTED: Derived from campaign_phases table. Updated automatically via sync_campaign_from_phases().';
COMMENT ON COLUMN lead_generation_campaigns.phase_status IS 'COMPUTED: Derived from campaign_phases table. Updated automatically via sync_campaign_from_phases().';

-- Create function to sync campaign fields from phases (single source of truth)
CREATE OR REPLACE FUNCTION sync_campaign_from_phases(campaign_uuid UUID) RETURNS VOID AS $$
DECLARE
    computed_current_phase phase_type_enum;
    computed_phase_status phase_status_enum;
    completed_count INTEGER;
BEGIN
    -- BUSINESS LOGIC: Derive current phase and status from campaign_phases table
    -- Priority 1: Find any in_progress or failed phase (that's the active one)
    SELECT phase_type, status INTO computed_current_phase, computed_phase_status
    FROM campaign_phases 
    WHERE campaign_id = campaign_uuid 
    AND status IN ('in_progress', 'failed')
    ORDER BY phase_order
    LIMIT 1;
    
    -- Priority 2: If no active phase, find first non-completed phase (ready to start)
    IF computed_current_phase IS NULL THEN
        SELECT phase_type, status INTO computed_current_phase, computed_phase_status
        FROM campaign_phases 
        WHERE campaign_id = campaign_uuid 
        AND status != 'completed'
        ORDER BY phase_order
        LIMIT 1;
    END IF;
    
    -- Priority 3: If all phases completed, use the last phase
    IF computed_current_phase IS NULL THEN
        SELECT phase_type, status INTO computed_current_phase, computed_phase_status
        FROM campaign_phases 
        WHERE campaign_id = campaign_uuid 
        ORDER BY phase_order DESC
        LIMIT 1;
    END IF;
    
    -- Count completed phases for progress tracking
    SELECT COUNT(*) INTO completed_count
    FROM campaign_phases 
    WHERE campaign_id = campaign_uuid 
    AND status = 'completed';
    
    -- Update campaign with computed values (derived from phases)
    UPDATE lead_generation_campaigns 
    SET 
        current_phase = computed_current_phase,
        phase_status = computed_phase_status,
        completed_phases = completed_count,
        updated_at = NOW()
    WHERE id = campaign_uuid;
    
    -- Log the sync operation
    RAISE NOTICE 'Campaign % synced: current_phase=%, phase_status=%, completed_phases=%', 
        campaign_uuid, computed_current_phase, computed_phase_status, completed_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync campaign when phases change
CREATE OR REPLACE FUNCTION trigger_sync_campaign_from_phases() RETURNS TRIGGER AS $$
BEGIN
    -- Sync the campaign whenever a phase status changes
    PERFORM sync_campaign_from_phases(NEW.campaign_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on campaign_phases table
DROP TRIGGER IF EXISTS trigger_campaign_phase_sync ON campaign_phases;
CREATE TRIGGER trigger_campaign_phase_sync
    AFTER INSERT OR UPDATE ON campaign_phases
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_campaign_from_phases();

-- Add utility function to reset phase status (for retry scenarios)
CREATE OR REPLACE FUNCTION reset_phase_for_retry(campaign_uuid UUID, phase_name phase_type_enum) RETURNS VOID AS $$
BEGIN
    -- Reset the specific phase to 'ready' status for retry
    UPDATE campaign_phases 
    SET 
        status = 'ready',
        started_at = NULL,
        completed_at = NULL,
        failed_at = NULL,
        error_message = NULL,
        progress_percentage = NULL,
        processed_items = NULL,
        successful_items = NULL,
        failed_items = NULL
    WHERE campaign_id = campaign_uuid 
    AND phase_type = phase_name;
    
    -- The trigger will automatically sync the campaign
    RAISE NOTICE 'Phase % reset for retry in campaign %', phase_name, campaign_uuid;
END;
$$ LANGUAGE plpgsql;
