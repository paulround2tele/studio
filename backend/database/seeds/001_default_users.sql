-- Default Users Seed File
-- This file creates default users for development and testing
-- Run with: PGPASSWORD=pNpTHxEWr2SmY270p1IjGn3dP psql -h localhost -U domainflow -d domainflow_production -f backend/database/seeds/001_default_users.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create default admin user
-- Email: admin@domainflow.com
-- Password: AdminPassword123!
INSERT INTO auth.users (
    id, email, email_verified, password_hash, password_pepper_version,
    first_name, last_name, is_active, is_locked, failed_login_attempts,
    password_changed_at, must_change_password, mfa_enabled, created_at, updated_at
) VALUES (
    uuid_generate_v4(), 
    'admin@domainflow.com', 
    true, 
    crypt('AdminPassword123!', gen_salt('bf')), 
    1,
    'Admin', 
    'User', 
    true, 
    false, 
    0,
    CURRENT_TIMESTAMP, 
    false, 
    false, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Create default test user
-- Email: test@example.com  
-- Password: password123 (for UI testing)
INSERT INTO auth.users (
    id, email, email_verified, password_hash, password_pepper_version,
    first_name, last_name, is_active, is_locked, failed_login_attempts,
    password_changed_at, must_change_password, mfa_enabled, created_at, updated_at
) VALUES (
    uuid_generate_v4(), 
    'test@example.com', 
    true, 
    crypt('password123', gen_salt('bf')), 
    1,
    'Test', 
    'User', 
    true, 
    false, 
    0,
    CURRENT_TIMESTAMP, 
    false, 
    false, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
    email_verified = EXCLUDED.email_verified,
    password_hash = EXCLUDED.password_hash,
    updated_at = CURRENT_TIMESTAMP;

-- Create developer user for UI testing
-- Email: dev@domainflow.com
-- Password: DevPassword123!
INSERT INTO auth.users (
    id, email, email_verified, password_hash, password_pepper_version,
    first_name, last_name, is_active, is_locked, failed_login_attempts,
    password_changed_at, must_change_password, mfa_enabled, created_at, updated_at
) VALUES (
    uuid_generate_v4(), 
    'dev@domainflow.com', 
    true, 
    crypt('DevPassword123!', gen_salt('bf')), 
    1,
    'Developer', 
    'User', 
    true, 
    false, 
    0,
    CURRENT_TIMESTAMP, 
    false, 
    false, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Display created users
SELECT 
    email, 
    first_name, 
    last_name, 
    is_active, 
    email_verified,
    created_at
FROM auth.users 
WHERE email IN ('admin@domainflow.com', 'test@example.com', 'dev@domainflow.com')
ORDER BY email;
