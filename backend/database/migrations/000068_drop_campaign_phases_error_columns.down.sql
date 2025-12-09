BEGIN;

ALTER TABLE campaign_phases
    ADD COLUMN IF NOT EXISTS error_message text;

COMMIT;
