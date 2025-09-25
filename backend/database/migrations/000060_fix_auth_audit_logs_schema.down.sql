-- Down Migration 000060: Revert auth_audit_logs schema fix
-- WARNING: Dropping columns will lose data. Proceed only if intentional.

ALTER TABLE auth_audit_logs
    DROP COLUMN IF EXISTS additional_data,
    DROP COLUMN IF EXISTS action_type;

DROP INDEX IF EXISTS idx_auth_audit_logs_action_type;
DROP INDEX IF EXISTS idx_auth_audit_logs_ip_address;
