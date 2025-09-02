-- Revert unique constraints for generated_domains
-- Restore global domain_name uniqueness, drop per-campaign uniqueness

-- Drop composite index
DROP INDEX CONCURRENTLY IF EXISTS idx_generated_domains_campaign_domain_unique;

-- Restore global unique index on domain_name
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_domains_domain_name_unique
ON generated_domains(domain_name);
