-- 000050_phase_runs_ledger.up.sql
CREATE TABLE IF NOT EXISTS phase_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    phase_type TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    success BOOLEAN,
    error TEXT,
    duration_ms BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phase_runs_campaign_phase ON phase_runs(campaign_id, phase_type);
