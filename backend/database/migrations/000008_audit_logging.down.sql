-- Rollback Audit Logging Schema

-- Drop indexes
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_action_type;
DROP INDEX IF EXISTS idx_audit_logs_resource_type;
DROP INDEX IF EXISTS idx_audit_logs_resource_id;
DROP INDEX IF EXISTS idx_audit_logs_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_ip_address;
DROP INDEX IF EXISTS idx_audit_logs_user_timeline;
DROP INDEX IF EXISTS idx_audit_logs_campaign_timeline;
DROP INDEX IF EXISTS idx_audit_logs_compliance;

-- Drop table
DROP TABLE IF EXISTS audit_logs;