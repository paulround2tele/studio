-- Rollback Persona and Proxy Infrastructure Schema

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_audit_personas ON personas;
DROP TRIGGER IF EXISTS trigger_audit_proxies ON proxies;
DROP TRIGGER IF EXISTS trigger_proxy_membership_consistency ON proxy_pool_memberships;

-- Drop indexes
DROP INDEX IF EXISTS idx_personas_created_by;
DROP INDEX IF EXISTS idx_personas_status;
DROP INDEX IF EXISTS idx_personas_persona_type;
DROP INDEX IF EXISTS idx_personas_last_used_at;

DROP INDEX IF EXISTS idx_proxies_created_by;
DROP INDEX IF EXISTS idx_proxies_status;
DROP INDEX IF EXISTS idx_proxies_proxy_type;
DROP INDEX IF EXISTS idx_proxies_ip_address;
DROP INDEX IF EXISTS idx_proxies_health_check_status;
DROP INDEX IF EXISTS idx_proxies_last_used_at;

DROP INDEX IF EXISTS idx_proxy_pools_created_by;
DROP INDEX IF EXISTS idx_proxy_pools_is_active;
DROP INDEX IF EXISTS idx_proxy_pools_name;

DROP INDEX IF EXISTS idx_proxy_pool_memberships_proxy_pool_id;
DROP INDEX IF EXISTS idx_proxy_pool_memberships_proxy_id;
DROP INDEX IF EXISTS idx_proxy_pool_memberships_is_active;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS proxy_pool_memberships;
DROP TABLE IF EXISTS proxy_pools;
DROP TABLE IF EXISTS proxies;
DROP TABLE IF EXISTS personas;

-- Drop enums
DROP TYPE IF EXISTS persona_status_enum;
DROP TYPE IF EXISTS proxy_status_enum;
DROP TYPE IF EXISTS proxy_type_enum;
DROP TYPE IF EXISTS health_check_status_enum;