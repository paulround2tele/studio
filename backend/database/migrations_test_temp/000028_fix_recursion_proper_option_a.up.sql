-- Migration: Fix recursion issues and properly implement Option A
-- Remove any potential trigger conflicts and ensure single source of truth

-- Drop existing trigger and recreate with better safeguards
DROP TRIGGER IF EXISTS trigger_campaign_phase_sync ON campaign_phases;

-- Recreate the sync function with recursion protection
CREATE OR REPLACE FUNCTION sync_campaign_from_phases(campaign_uuid UUID) RETURNS VOID AS $$
DECLARE
    computed_current_phase phase_type_enum;
    computed_phase_status phase_status_enum;
    completed_count INTEGER;
    current_campaign_phase phase_type_enum;
    current_campaign_status phase_status_enum;
BEGIN
    -- Get current campaign values to check if sync is actually needed
    SELECT current_phase, phase_status INTO current_campaign_phase, current_campaign_status
    FROM lead_generation_campaigns 
    WHERE id = campaign_uuid;
    
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
    
    -- Only update if values have actually changed (prevent unnecessary updates)
    IF computed_current_phase IS DISTINCT FROM current_campaign_phase OR 
       computed_phase_status IS DISTINCT FROM current_campaign_status THEN
        
        -- Update campaign with computed values (derived from phases)
        UPDATE lead_generation_campaigns 
        SET 
            current_phase = computed_current_phase,
            phase_status = computed_phase_status,
            completed_phases = completed_count,
            updated_at = NOW()
        WHERE id = campaign_uuid;
        
        -- Log the sync operation
        RAISE NOTICE 'Campaign % synced: % -> %, % -> %, completed_phases=%', 
            campaign_uuid, 
            current_campaign_phase, computed_current_phase,
            current_campaign_status, computed_phase_status, 
            completed_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger function with the same protection
CREATE OR REPLACE FUNCTION trigger_sync_campaign_from_phases() RETURNS TRIGGER AS $$
BEGIN
    -- Sync the campaign whenever a phase status changes
    PERFORM sync_campaign_from_phases(NEW.campaign_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_campaign_phase_sync
    AFTER INSERT OR UPDATE ON campaign_phases
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_campaign_from_phases();

-- Add helper function to start a phase (used by services)
CREATE OR REPLACE FUNCTION start_campaign_phase(campaign_uuid UUID, phase_name phase_type_enum) RETURNS VOID AS $$
BEGIN
    -- Update the specific phase to 'in_progress' status
    UPDATE campaign_phases 
    SET 
        status = 'in_progress',
        started_at = NOW(),
        updated_at = NOW()
    WHERE campaign_id = campaign_uuid 
    AND phase_type = phase_name;
    
    -- The trigger will automatically sync the campaign
    RAISE NOTICE 'Phase % started for campaign %', phase_name, campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- Add helper function to complete a phase (used by services)
CREATE OR REPLACE FUNCTION complete_campaign_phase(campaign_uuid UUID, phase_name phase_type_enum) RETURNS VOID AS $$
BEGIN
    -- Update the specific phase to 'completed' status
    UPDATE campaign_phases 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE campaign_id = campaign_uuid 
    AND phase_type = phase_name;
    
    -- The trigger will automatically sync the campaign
    RAISE NOTICE 'Phase % completed for campaign %', phase_name, campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- Add helper function to fail a phase (used by services)
CREATE OR REPLACE FUNCTION fail_campaign_phase(campaign_uuid UUID, phase_name phase_type_enum, error_msg TEXT) RETURNS VOID AS $$
BEGIN
    -- Update the specific phase to 'failed' status
    UPDATE campaign_phases 
    SET 
        status = 'failed',
        failed_at = NOW(),
        error_message = error_msg,
        updated_at = NOW()
    WHERE campaign_id = campaign_uuid 
    AND phase_type = phase_name;
    
    -- The trigger will automatically sync the campaign
    RAISE NOTICE 'Phase % failed for campaign %: %', phase_name, campaign_uuid, error_msg;
END;
$$ LANGUAGE plpgsql;
