-- Adjust unique constraints for generated_domains
-- Switch from global domain_name uniqueness to per-campaign uniqueness

-- Drop global unique index if it exists
DROP INDEX CONCURRENTLY IF EXISTS idx_generated_domains_domain_name_unique;

-- Create composite unique index on (campaign_id, domain_name)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_domains_campaign_domain_unique
ON generated_domains(campaign_id, domain_name);
