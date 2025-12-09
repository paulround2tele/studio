BEGIN;

ALTER TABLE campaign_phases
    DROP COLUMN IF EXISTS error_message;

COMMIT;
