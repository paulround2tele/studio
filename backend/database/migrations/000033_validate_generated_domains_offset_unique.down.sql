-- No-op revert because index existed previously in earlier migrations
-- Drop only if you need to strictly revert
DROP INDEX CONCURRENTLY IF EXISTS idx_generated_domains_campaign_offset_unique;
