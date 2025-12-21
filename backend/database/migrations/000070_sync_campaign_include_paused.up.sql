-- Migration: 000070_sync_campaign_include_paused
-- P0 Fix: Include 'paused' status in sync_campaign_from_phases trigger priority.
-- Risk Closed: Moderate Risk 4 - Campaign row can drift when phase is paused.
--
-- The previous logic only prioritized 'in_progress' and 'failed' statuses.
-- This caused lead_generation_campaigns.phase_status to not reflect 'paused' immediately,
-- which broke exclusivity checks and findRunningPhase lookups.

CREATE OR REPLACE FUNCTION public.sync_campaign_from_phases(campaign_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    computed_current_phase phase_type_enum;
    computed_phase_status phase_status_enum;
    completed_count INTEGER;
    current_campaign_phase phase_type_enum;
    current_campaign_status phase_status_enum;
BEGIN
    SELECT current_phase, phase_status INTO current_campaign_phase, current_campaign_status
    FROM lead_generation_campaigns
    WHERE id = campaign_uuid;

    -- P0 Fix: Include 'paused' in the active status check alongside 'in_progress' and 'failed'.
    -- This ensures the campaign row reflects paused phases immediately.
    SELECT phase_type, status INTO computed_current_phase, computed_phase_status
    FROM campaign_phases
    WHERE campaign_id = campaign_uuid
      AND status IN ('in_progress', 'paused', 'failed')
    ORDER BY phase_order
    LIMIT 1;

    IF computed_current_phase IS NULL THEN
        SELECT phase_type, status INTO computed_current_phase, computed_phase_status
        FROM campaign_phases
        WHERE campaign_id = campaign_uuid
          AND status NOT IN ('completed', 'skipped')
        ORDER BY phase_order
        LIMIT 1;
    END IF;

    IF computed_current_phase IS NULL THEN
        SELECT phase_type, status INTO computed_current_phase, computed_phase_status
        FROM campaign_phases
        WHERE campaign_id = campaign_uuid
        ORDER BY phase_order DESC
        LIMIT 1;
    END IF;

    SELECT COUNT(*) INTO completed_count
    FROM campaign_phases
    WHERE campaign_id = campaign_uuid
      AND status IN ('completed', 'skipped');

    IF computed_current_phase IS DISTINCT FROM current_campaign_phase OR
       computed_phase_status IS DISTINCT FROM current_campaign_status THEN
        UPDATE lead_generation_campaigns
        SET current_phase = computed_current_phase,
            phase_status = computed_phase_status,
            completed_phases = completed_count,
            updated_at = NOW()
        WHERE id = campaign_uuid;

        RAISE NOTICE 'Campaign % synced: % -> %, % -> %, completed_phases=%',
            campaign_uuid,
            current_campaign_phase, computed_current_phase,
            current_campaign_status, computed_phase_status,
            completed_count;
    END IF;
END;
$$;

-- Verify the change
COMMENT ON FUNCTION public.sync_campaign_from_phases(uuid) IS 'P0 Fix: Now includes paused status in priority selection (migration 000070)';
