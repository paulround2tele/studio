-- Ensure unique (campaign_id, offset_index) exists for generated_domains
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_domains_campaign_offset_unique
ON generated_domains(campaign_id, offset_index);
