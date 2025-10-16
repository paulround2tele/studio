-- Migration 000061: Add missing current_phase column to lead_generation_campaigns
-- Purpose: Runtime error showed column does not exist though application code and schema expect it.
-- This migration adds the column and backfills it using existing campaign_phases data
-- and then (re)invokes sync function if present.

BEGIN;

-- 0. Create missing enum types if base migrations not tracked but schema objects absent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'phase_type_enum') THEN
        CREATE TYPE phase_type_enum AS ENUM (
            'domain_generation',
            'dns_validation',
            'http_keyword_validation',
            'analysis'
        );
        RAISE NOTICE 'Created enum phase_type_enum (late initialization)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'phase_status_enum') THEN
        CREATE TYPE phase_status_enum AS ENUM (
            'not_started',
            'ready',
            'configured',
            'in_progress',
            'paused',
            'completed',
            'failed'
        );
        RAISE NOTICE 'Created enum phase_status_enum (late initialization)';
    END IF;
END;
$$;

-- 1. Add column if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_generation_campaigns' AND column_name = 'current_phase'
    ) THEN
        ALTER TABLE lead_generation_campaigns ADD COLUMN current_phase phase_type_enum NULL;
        COMMENT ON COLUMN lead_generation_campaigns.current_phase IS 'COMPUTED: Derived from campaign_phases table. Updated automatically via sync_campaign_from_phases().';
        RAISE NOTICE 'Added column lead_generation_campaigns.current_phase';
    ELSE
        RAISE NOTICE 'Column lead_generation_campaigns.current_phase already exists - skipping';
    END IF;
END;
$$;

DO $$
BEGIN
    -- If legacy campaign_phases table lacks required columns phase_type/status, perform a conservative default.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='campaign_phases' AND column_name='phase_type'
    ) THEN
        WITH ranked AS (
            SELECT cp.campaign_id,
                   cp.phase_type,
                   cp.status,
                   cp.phase_order,
                   ROW_NUMBER() OVER (PARTITION BY cp.campaign_id ORDER BY cp.phase_order) AS rn_first,
                   ROW_NUMBER() OVER (PARTITION BY cp.campaign_id ORDER BY cp.phase_order DESC) AS rn_last,
                   ROW_NUMBER() OVER (PARTITION BY cp.campaign_id ORDER BY (CASE WHEN cp.status IN ('in_progress','failed') THEN 0 ELSE 1 END), cp.phase_order) AS rn_active_or_failed,
                   ROW_NUMBER() OVER (PARTITION BY cp.campaign_id ORDER BY (CASE WHEN cp.status != 'completed' THEN 0 ELSE 1 END), cp.phase_order) AS rn_not_completed
            FROM campaign_phases cp
        )
        UPDATE lead_generation_campaigns lgc
        SET current_phase = sub.phase_type
        FROM (
            SELECT DISTINCT ON (campaign_id) campaign_id,
                COALESCE(
                    MAX(CASE WHEN rn_active_or_failed = 1 THEN phase_type END) OVER w,
                    MAX(CASE WHEN rn_not_completed = 1 THEN phase_type END) OVER w,
                    MAX(CASE WHEN rn_last = 1 THEN phase_type END) OVER w
                ) AS phase_type
            FROM ranked
            WINDOW w AS (PARTITION BY campaign_id)
        ) sub
                WHERE lgc.id = sub.campaign_id
                    AND (
                            lgc.current_phase IS NULL
                            OR (lgc.current_phase)::text = ''
                    );
    ELSE
        RAISE NOTICE 'Skipping backfill of current_phase; campaign_phases table not found';
    END IF;
END;
$$;

-- 3. Invoke sync function if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_campaign_from_phases') THEN
        PERFORM sync_campaign_from_phases(id) FROM lead_generation_campaigns;
        RAISE NOTICE 'Invoked sync_campaign_from_phases for all campaigns';
    ELSE
        RAISE NOTICE 'sync_campaign_from_phases function absent - skipping';
    END IF;
END; $$;

COMMIT;
