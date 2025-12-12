-- Revert Migration 000069: remove extraction phase metadata adjustments
-- Note: enum value removal is intentionally skipped to avoid widespread object rebuilds.

-- 1. Remove extraction-specific phase rows and restore enrichment ordering.
DELETE FROM campaign_phases WHERE phase_type = 'extraction';

UPDATE campaign_phases
SET phase_order = 4,
    updated_at = NOW()
WHERE phase_type = 'enrichment'
  AND phase_order <> 4;

-- 2. Reset campaign phase metadata to five stages.
ALTER TABLE campaign_phases DROP CONSTRAINT IF EXISTS campaign_phases_phase_order_check;
ALTER TABLE campaign_phases
    ADD CONSTRAINT campaign_phases_phase_order_check
    CHECK ((phase_order >= 1) AND (phase_order <= 5));

ALTER TABLE lead_generation_campaigns DROP CONSTRAINT IF EXISTS lead_generation_campaigns_completed_phases_check;
ALTER TABLE lead_generation_campaigns
    ADD CONSTRAINT lead_generation_campaigns_completed_phases_check
    CHECK ((completed_phases >= 0) AND (completed_phases <= 5));

ALTER TABLE lead_generation_campaigns ALTER COLUMN total_phases SET DEFAULT 5;

UPDATE lead_generation_campaigns
SET total_phases = 5
WHERE total_phases > 5;

UPDATE lead_generation_campaigns
SET completed_phases = LEAST(completed_phases, 5)
WHERE completed_phases > 5;
