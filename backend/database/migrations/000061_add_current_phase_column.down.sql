-- Down Migration 000061: Remove current_phase column ONLY if safe
-- NOTE: Only run if you intentionally want to revert adding the column.
-- If other migrations or code rely on this column, reverting may break the application.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_generation_campaigns' AND column_name = 'current_phase'
    ) THEN
        ALTER TABLE lead_generation_campaigns DROP COLUMN current_phase;
    END IF;
END;
$$;

COMMIT;
