-- Revert Migration 000064: remove enrichment phase and restore four-phase workflow

-- 1. Delete enrichment phase rows and reset analysis ordering.
DELETE FROM campaign_phases WHERE phase_type = 'enrichment';

UPDATE campaign_phases
SET phase_order = 4,
    updated_at = NOW()
WHERE phase_type = 'analysis'
  AND phase_order = 5;

-- 2. Clamp campaign metadata back to four phases.
UPDATE lead_generation_campaigns
SET completed_phases = LEAST(completed_phases, 4),
    total_phases = 4
WHERE total_phases <> 4 OR completed_phases > 4;

ALTER TABLE lead_generation_campaigns DROP CONSTRAINT IF EXISTS lead_generation_campaigns_completed_phases_check;
ALTER TABLE lead_generation_campaigns
    ADD CONSTRAINT lead_generation_campaigns_completed_phases_check
    CHECK ((completed_phases >= 0) AND (completed_phases <= 4));

ALTER TABLE lead_generation_campaigns ALTER COLUMN total_phases SET DEFAULT 4;

ALTER TABLE campaign_phases DROP CONSTRAINT IF EXISTS campaign_phases_phase_order_check;
ALTER TABLE campaign_phases
    ADD CONSTRAINT campaign_phases_phase_order_check
    CHECK ((phase_order >= 1) AND (phase_order <= 4));

-- 3. Recreate enum types without the enrichment value.
DO $$
DECLARE
    has_enrichment boolean := EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'phase_type_enum' AND e.enumlabel = 'enrichment'
    );
BEGIN
    IF has_enrichment THEN
        -- Ensure no residual references remain
        UPDATE lead_generation_campaigns SET current_phase = 'http_keyword_validation' WHERE current_phase = 'enrichment';

        CREATE TYPE phase_type_enum_old AS ENUM ('domain_generation','dns_validation','http_keyword_validation','analysis');

        ALTER TABLE campaign_phases
            ALTER COLUMN phase_type TYPE phase_type_enum_old
            USING phase_type::text::phase_type_enum_old;
        ALTER TABLE lead_generation_campaigns
            ALTER COLUMN current_phase TYPE phase_type_enum_old
            USING current_phase::text::phase_type_enum_old;

        DROP TYPE phase_type_enum;
        ALTER TYPE phase_type_enum_old RENAME TO phase_type_enum;
    END IF;
END $$;

DO $$
DECLARE
    has_enrichment boolean := EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'job_type_enum' AND e.enumlabel = 'enrichment'
    );
BEGIN
    IF has_enrichment THEN
        DELETE FROM campaign_jobs WHERE job_type = 'enrichment';

        CREATE TYPE job_type_enum_old AS ENUM ('generation','dns_validation','http_keyword_validation','analysis');

        ALTER TABLE campaign_jobs
            ALTER COLUMN job_type TYPE job_type_enum_old
            USING job_type::text::job_type_enum_old;

        DROP TYPE job_type_enum;
        ALTER TYPE job_type_enum_old RENAME TO job_type_enum;
    END IF;
END $$;
