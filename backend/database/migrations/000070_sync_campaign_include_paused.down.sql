-- Down migration: 000070_sync_campaign_include_paused
-- Reverts to previous behavior (paused not in priority selection)

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

    SELECT phase_type, status INTO computed_current_phase, computed_phase_status
    FROM campaign_phases
    WHERE campaign_id = campaign_uuid
      AND status IN ('in_progress', 'failed')
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
