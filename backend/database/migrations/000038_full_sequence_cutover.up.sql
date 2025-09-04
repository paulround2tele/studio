-- (Renumbered from 000034) Full sequence cutover introducing phase_configurations
-- Copy of earlier 000034_full_sequence_cutover.up.sql

ALTER TABLE campaign_states ADD COLUMN IF NOT EXISTS mode campaign_mode_enum NOT NULL DEFAULT 'step_by_step';
ALTER TABLE campaign_states ALTER COLUMN mode DROP DEFAULT;

CREATE TABLE IF NOT EXISTS phase_configurations (
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (campaign_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_phase_configurations_campaign_phase ON phase_configurations(campaign_id, phase);
