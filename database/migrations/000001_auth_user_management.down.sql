-- Rollback Authentication and User Management Schema

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_audit_users ON users;
DROP TRIGGER IF EXISTS trigger_timestamp_users ON users;
DROP TRIGGER IF EXISTS trigger_session_management ON user_sessions;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_last_login_at;
DROP INDEX IF EXISTS idx_users_created_at;

DROP INDEX IF EXISTS idx_user_sessions_user_id;
DROP INDEX IF EXISTS idx_user_sessions_session_token;
DROP INDEX IF EXISTS idx_user_sessions_expires_at;
DROP INDEX IF EXISTS idx_user_sessions_is_active;
DROP INDEX IF EXISTS idx_user_sessions_cleanup_expired;

DROP INDEX IF EXISTS idx_auth_audit_logs_user_id;
DROP INDEX IF EXISTS idx_auth_audit_logs_action_type;
DROP INDEX IF EXISTS idx_auth_audit_logs_created_at;
DROP INDEX IF EXISTS idx_auth_audit_logs_ip_address;

DROP INDEX IF EXISTS idx_password_reset_tokens_user_id;
DROP INDEX IF EXISTS idx_password_reset_tokens_token;
DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at;

DROP INDEX IF EXISTS idx_rate_limits_user_id;
DROP INDEX IF EXISTS idx_rate_limits_action_type;
DROP INDEX IF EXISTS idx_rate_limits_reset_time;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS auth_audit_logs;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;

-- Drop enums
DROP TYPE IF EXISTS user_role_enum;