-- 000045_campaign_domain_counters.down.sql
BEGIN;
DROP TRIGGER IF EXISTS trg_campaign_domain_counters_insert ON generated_domains;
DROP TRIGGER IF EXISTS trg_campaign_domain_counters_update ON generated_domains;
DROP TRIGGER IF EXISTS trg_campaign_domain_counters_delete ON generated_domains;
DROP FUNCTION IF EXISTS campaign_domain_counters_upsert();
DROP TABLE IF EXISTS campaign_domain_counters;
COMMIT;
