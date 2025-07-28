-- Rollback Keyword Management Schema

-- Drop indexes
DROP INDEX IF EXISTS idx_keyword_sets_campaign_id;
DROP INDEX IF EXISTS idx_keyword_sets_created_by;
DROP INDEX IF EXISTS idx_keyword_sets_is_active;
DROP INDEX IF EXISTS idx_keyword_sets_name;

DROP INDEX IF EXISTS idx_keyword_rules_keyword_set_id;
DROP INDEX IF EXISTS idx_keyword_rules_rule_type;
DROP INDEX IF EXISTS idx_keyword_rules_is_active;

-- No http_keyword_campaign_params indexes to drop (table doesn't exist in phase-centric architecture)

DROP INDEX IF EXISTS idx_http_keyword_results_campaign_id;
DROP INDEX IF EXISTS idx_http_keyword_results_domain_name;
DROP INDEX IF EXISTS idx_http_keyword_results_validation_status;
DROP INDEX IF EXISTS idx_http_keyword_results_created_at;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS http_keyword_results;
-- http_keyword_campaign_params table doesn't exist (phase-centric architecture)
DROP TABLE IF EXISTS keyword_rules;
DROP TABLE IF EXISTS keyword_sets;

-- Drop enums
DROP TYPE IF EXISTS keyword_rule_type_enum;