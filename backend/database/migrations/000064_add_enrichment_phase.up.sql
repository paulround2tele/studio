-- Migration 000064: introduce enrichment phase and expand campaign sequencing to five stages
-- Adds the enrichment phase/job enum value, adjusts campaign phase ordering,
-- and backfills enrichment rows for existing campaigns.

-- 1. Extend enums with the new enrichment value.
ALTER TYPE public.phase_type_enum ADD VALUE IF NOT EXISTS 'enrichment' AFTER 'http_keyword_validation';
ALTER TYPE public.job_type_enum ADD VALUE IF NOT EXISTS 'enrichment' AFTER 'http_keyword_validation';

-- 2. Allow five phases per campaign and update defaults/constraints.
ALTER TABLE lead_generation_campaigns ALTER COLUMN total_phases SET DEFAULT 5;
ALTER TABLE lead_generation_campaigns DROP CONSTRAINT IF EXISTS lead_generation_campaigns_completed_phases_check;
ALTER TABLE lead_generation_campaigns
    ADD CONSTRAINT lead_generation_campaigns_completed_phases_check
    CHECK ((completed_phases >= 0) AND (completed_phases <= 5));

ALTER TABLE campaign_phases DROP CONSTRAINT IF EXISTS campaign_phases_phase_order_check;
ALTER TABLE campaign_phases
    ADD CONSTRAINT campaign_phases_phase_order_check
    CHECK ((phase_order >= 1) AND (phase_order <= 5));

-- Update existing campaign metadata to the new default.
UPDATE lead_generation_campaigns SET total_phases = 5 WHERE total_phases < 5;

-- 3. Shift analysis phase to the fifth slot to make room for enrichment.
UPDATE campaign_phases
SET phase_order = 5,
    updated_at = NOW()
WHERE phase_type = 'analysis'
  AND phase_order = 4;

-- 4. Create enrichment phase rows when missing.
INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, created_at, updated_at)
SELECT c.id,
     'enrichment'::public.phase_type_enum,
       4,
       CASE
       WHEN cp_analysis.status = 'completed' THEN 'completed'::public.phase_status_enum
       ELSE 'not_started'::public.phase_status_enum
       END,
       NOW(),
       NOW()
FROM lead_generation_campaigns c
LEFT JOIN campaign_phases cp_enrichment
       ON cp_enrichment.campaign_id = c.id AND cp_enrichment.phase_type = 'enrichment'
LEFT JOIN campaign_phases cp_analysis
       ON cp_analysis.campaign_id = c.id AND cp_analysis.phase_type = 'analysis'
WHERE cp_enrichment.id IS NULL;

-- 5. Synchronise completed phase counters for campaigns that already finished analysis.
WITH finished AS (
    SELECT DISTINCT c.id
    FROM lead_generation_campaigns c
    JOIN campaign_phases cp ON cp.campaign_id = c.id
    WHERE cp.phase_type = 'analysis'
      AND cp.status = 'completed'
)
UPDATE lead_generation_campaigns c
SET completed_phases = LEAST(5, GREATEST(completed_phases, 5))
FROM finished f
WHERE c.id = f.id;
