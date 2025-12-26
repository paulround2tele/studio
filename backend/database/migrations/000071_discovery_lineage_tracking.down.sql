-- Down migration: 000071_discovery_lineage_tracking

ALTER TABLE lead_generation_campaigns DROP CONSTRAINT IF EXISTS chk_discovery_offset_range;
DROP INDEX IF EXISTS idx_campaigns_discovery_config_hash;
ALTER TABLE lead_generation_campaigns DROP COLUMN IF EXISTS discovery_config_hash;
ALTER TABLE lead_generation_campaigns DROP COLUMN IF EXISTS discovery_offset_start;
ALTER TABLE lead_generation_campaigns DROP COLUMN IF EXISTS discovery_offset_end;
