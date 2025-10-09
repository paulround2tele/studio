-- Down Migration 000062: Remove phase_status column (only if it exists)
BEGIN;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='lead_generation_campaigns' AND column_name='phase_status'
    ) THEN
        ALTER TABLE lead_generation_campaigns DROP COLUMN phase_status;
    END IF;
END; $$;
COMMIT;
