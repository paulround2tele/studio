-- Rollback Keyword Management Schema

-- Drop indexes
DROP INDEX IF EXISTS idx_keyword_sets_campaign_id;
DROP INDEX IF EXISTS idx_keyword_sets_created_by;
DROP INDEX IF EXISTS idx_keyword_sets_is_active;
DROP INDEX IF EXISTS idx_keyword_sets_name;

DROP INDEX IF EXISTS idx_keyword_rules_keyword_set_id;
DROP INDEX IF EXISTS idx_keyword_rules_rule_type;
DROP INDEX IF EXISTS idx_keyword_rules_is_active;

DROP INDEX IF EXISTS idx_http_keyword_campaign_params_campaign_id;
DROP INDEX IF EXISTS idx_http_keyword_campaign_params_keyword_set_id;
DROP INDEX IF EXISTS idx_http_keyword_campaign_params_proxy_pool_id;

DROP INDEX IF EXISTS idx_http_keyword_results_campaign_id;
DROP INDEX IF EXISTS idx_http_keyword_results_domain_name;
DROP INDEX IF EXISTS idx_http_keyword_results_validation_status;
DROP INDEX IF EXISTS idx_http_keyword_results_created_at;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS http_keyword_results;
DROP TABLE IF EXISTS http_keyword_campaign_params;
DROP TABLE IF EXISTS keyword_rules;
DROP TABLE IF EXISTS keyword_sets;

-- Drop enums
DROP TYPE IF EXISTS keyword_rule_type_enum;