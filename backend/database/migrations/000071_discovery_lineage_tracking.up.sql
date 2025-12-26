-- Migration: 000071_discovery_lineage_tracking
-- Purpose: Add discovery config lineage tracking to campaigns
-- - discovery_config_hash: Links campaigns sharing the same pattern
-- - discovery_offset_start/end: Records the offset range used by this campaign
-- These fields enable transparency about which offset range a campaign covers
-- and allow querying related campaigns by shared discovery configuration.

-- Add discovery lineage columns to lead_generation_campaigns
ALTER TABLE lead_generation_campaigns
ADD COLUMN IF NOT EXISTS discovery_config_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS discovery_offset_start BIGINT CHECK (discovery_offset_start >= 0),
ADD COLUMN IF NOT EXISTS discovery_offset_end BIGINT CHECK (discovery_offset_end >= 0);

-- Index for efficient lineage queries (find campaigns sharing same config)
CREATE INDEX IF NOT EXISTS idx_campaigns_discovery_config_hash 
ON lead_generation_campaigns(discovery_config_hash) 
WHERE discovery_config_hash IS NOT NULL;

-- Constraint to ensure offset_end >= offset_start when both are set
ALTER TABLE lead_generation_campaigns
ADD CONSTRAINT chk_discovery_offset_range 
CHECK (discovery_offset_end IS NULL OR discovery_offset_start IS NULL OR discovery_offset_end >= discovery_offset_start);

-- Backfill: Attempt to populate discovery_config_hash from phase_configurations
-- for existing campaigns that have domain_generation config
UPDATE lead_generation_campaigns lc
SET discovery_config_hash = sub.config_hash
FROM (
    SELECT 
        pc.campaign_id,
        encode(sha256(
            (COALESCE(pc.config->>'patternType', '') || '|' ||
             COALESCE(pc.config->>'constantString', '') || '|' ||
             COALESCE(pc.config->>'prefixVariableLength', '0') || '|' ||
             COALESCE(pc.config->>'suffixVariableLength', '0') || '|' ||
             COALESCE(pc.config->>'characterSet', '') || '|' ||
             COALESCE(pc.config->>'tld', ''))::bytea
        ), 'hex') as config_hash
    FROM phase_configurations pc
    WHERE pc.phase = 'domain_generation'
      AND pc.config IS NOT NULL
      AND pc.config != '{}'::jsonb
) sub
WHERE lc.id = sub.campaign_id
  AND lc.discovery_config_hash IS NULL;

-- Backfill: Populate offset ranges from generated_domains for existing campaigns
UPDATE lead_generation_campaigns lc
SET 
    discovery_offset_start = sub.min_offset,
    discovery_offset_end = sub.max_offset
FROM (
    SELECT 
        campaign_id,
        MIN(offset_index) as min_offset,
        MAX(offset_index) as max_offset
    FROM generated_domains
    GROUP BY campaign_id
) sub
WHERE lc.id = sub.campaign_id
  AND lc.discovery_offset_start IS NULL;

COMMENT ON COLUMN lead_generation_campaigns.discovery_config_hash IS 'SHA-256 hash of normalized discovery config for lineage tracking';
COMMENT ON COLUMN lead_generation_campaigns.discovery_offset_start IS 'First offset_index generated for this campaign';
COMMENT ON COLUMN lead_generation_campaigns.discovery_offset_end IS 'Last offset_index generated for this campaign';
