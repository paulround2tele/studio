-- Revert Migration 46: Re-add domains_data JSONB column and index (best-effort)
BEGIN;
ALTER TABLE lead_generation_campaigns ADD COLUMN IF NOT EXISTS domains_data JSONB;
CREATE INDEX IF NOT EXISTS idx_lead_generation_campaigns_domains_data_gin ON lead_generation_campaigns USING GIN(domains_data) WHERE domains_data IS NOT NULL;
COMMIT;
