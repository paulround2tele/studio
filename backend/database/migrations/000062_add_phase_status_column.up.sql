-- Migration 000062: Add missing phase_status column to lead_generation_campaigns
-- Purpose: Application queries select phase_status; runtime error indicates column absent in live DB.
-- Strategy: Add column if missing, derive initial value from campaign_phases if possible.

BEGIN;

-- 1. Add column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='lead_generation_campaigns' AND column_name='phase_status'
    ) THEN
        ALTER TABLE lead_generation_campaigns ADD COLUMN phase_status phase_status_enum NULL;
        COMMENT ON COLUMN lead_generation_campaigns.phase_status IS 'COMPUTED: Derived from campaign_phases table. Updated automatically via sync logic.';
    END IF;
END; $$;

-- 2. Backfill from campaign_phases if that table + needed columns exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_phases' AND column_name='status') THEN
        WITH ranked AS (
            SELECT cp.campaign_id,
                   cp.phase_type,
                   cp.status,
                   cp.phase_order,
                   ROW_NUMBER() OVER (PARTITION BY cp.campaign_id ORDER BY (CASE WHEN cp.status IN ('in_progress','failed') THEN 0 ELSE 1 END), cp.phase_order) AS rn_active_or_failed,
                   ROW_NUMBER() OVER (PARTITION BY cp.campaign_id ORDER BY (CASE WHEN cp.status != 'completed' THEN 0 ELSE 1 END), cp.phase_order) AS rn_not_completed,
                   ROW_NUMBER() OVER (PARTITION BY cp.campaign_id ORDER BY cp.phase_order DESC) AS rn_last
            FROM campaign_phases cp
        )
        UPDATE lead_generation_campaigns lgc
        SET phase_status = sub.status
        FROM (
            SELECT DISTINCT ON (campaign_id) campaign_id,
                COALESCE(
                    MAX(CASE WHEN rn_active_or_failed = 1 THEN status END) OVER w,
                    MAX(CASE WHEN rn_not_completed = 1 THEN status END) OVER w,
                    MAX(CASE WHEN rn_last = 1 THEN status END) OVER w
                ) AS status
            FROM ranked
            WINDOW w AS (PARTITION BY campaign_id)
        ) sub
        WHERE lgc.id = sub.campaign_id
          AND lgc.phase_status IS NULL;
    ELSE
        RAISE NOTICE 'Skipping phase_status backfill: campaign_phases.status not present';
    END IF;
END; $$;

COMMIT;
