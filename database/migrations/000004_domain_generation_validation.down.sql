-- Rollback Domain Generation and Validation Schema

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_audit_domains ON generated_domains;
DROP TRIGGER IF EXISTS trigger_timestamp_domains ON generated_domains;
DROP TRIGGER IF EXISTS trigger_domain_validation ON generated_domains;

-- Drop indexes
DROP INDEX IF EXISTS idx_generated_domains_campaign_id;
DROP INDEX IF EXISTS idx_generated_domains_domain_name;
DROP INDEX IF EXISTS idx_generated_domains_validation_status;
DROP INDEX IF EXISTS idx_generated_domains_dns_validation_status;
DROP INDEX IF EXISTS idx_generated_domains_http_validation_status;
DROP INDEX IF EXISTS idx_generated_domains_created_at;
DROP INDEX IF EXISTS idx_generated_domains_validation_completed_at;

DROP INDEX IF EXISTS idx_domain_generation_campaign_params_campaign_id;
DROP INDEX IF EXISTS idx_domain_generation_config_states_campaign_id;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS domain_generation_config_states;
DROP TABLE IF EXISTS domain_generation_campaign_params;
DROP TABLE IF EXISTS generated_domains;

-- Drop enums
DROP TYPE IF EXISTS validation_status_enum;