-- Migration 000069: add extraction phase/runtime metadata parity
-- Adds the extraction phase to enums, expands campaign metadata to six phases,
-- shifts enrichment to the final slot, and backfills extraction rows.

-- 1. Extend enums with the extraction phase/job values.
ALTER TYPE public.phase_type_enum ADD VALUE IF NOT EXISTS 'extraction' AFTER 'http_keyword_validation';
ALTER TYPE public.job_type_enum ADD VALUE IF NOT EXISTS 'extraction' AFTER 'http_keyword_validation';

-- 2. Allow six phases per campaign and update constraints/defaults.
ALTER TABLE lead_generation_campaigns DROP CONSTRAINT IF EXISTS lead_generation_campaigns_completed_phases_check;
ALTER TABLE lead_generation_campaigns
    ADD CONSTRAINT lead_generation_campaigns_completed_phases_check
    CHECK ((completed_phases >= 0) AND (completed_phases <= 6));

ALTER TABLE lead_generation_campaigns ALTER COLUMN total_phases SET DEFAULT 6;
UPDATE lead_generation_campaigns SET total_phases = 6 WHERE total_phases < 6;

ALTER TABLE campaign_phases DROP CONSTRAINT IF EXISTS campaign_phases_phase_order_check;
ALTER TABLE campaign_phases
    ADD CONSTRAINT campaign_phases_phase_order_check
    CHECK ((phase_order >= 1) AND (phase_order <= 6));

-- 3. Realign existing phase ordering for analysis/enrichment.
UPDATE campaign_phases
SET phase_order = 5,
    updated_at = NOW()
WHERE phase_type = 'analysis'
  AND phase_order <> 5;

UPDATE campaign_phases
SET phase_order = 6,
    updated_at = NOW()
WHERE phase_type = 'enrichment'
  AND phase_order <> 6;

-- 4. Backfill extraction phase rows when absent.
INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, created_at, updated_at)
SELECT c.id,
       'extraction'::public.phase_type_enum,
       4,
       'not_started'::public.phase_status_enum,
       NOW(),
       NOW()
FROM lead_generation_campaigns c
LEFT JOIN campaign_phases cp
       ON cp.campaign_id = c.id
      AND cp.phase_type = 'extraction'
WHERE cp.id IS NULL;
