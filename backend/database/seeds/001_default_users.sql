-- Default Users and Roles Seed File
-- This file creates default users for development and testing
-- Run with: psql -h localhost -U domainflow -d domainflow_production -f seeds/001_default_users.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert default roles if they don't exist
INSERT INTO auth.roles (id, name, description, permissions, created_at, updated_at) 
VALUES 
    (uuid_generate_v4(), 'admin', 'System Administrator', '["*"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'user', 'Regular User', '["read"]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

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
-- Password: TestPassword123!
INSERT INTO auth.users (
    id, email, email_verified, password_hash, password_pepper_version,
    first_name, last_name, is_active, is_locked, failed_login_attempts,
    password_changed_at, must_change_password, mfa_enabled, created_at, updated_at
) VALUES (
    uuid_generate_v4(), 
    'test@example.com', 
    true, 
    crypt('TestPassword123!', gen_salt('bf')), 
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
ON CONFLICT (email) DO NOTHING;

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

-- Assign admin role to admin user
INSERT INTO auth.user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, CURRENT_TIMESTAMP
FROM auth.users u, auth.roles r
WHERE u.email = 'admin@domainflow.com' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Assign user role to test users
INSERT INTO auth.user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, CURRENT_TIMESTAMP
FROM auth.users u, auth.roles r
WHERE u.email IN ('test@example.com', 'dev@domainflow.com') AND r.name = 'user'
ON CONFLICT (user_id, role_id) DO NOTHING;

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

-- Display user roles
SELECT 
    u.email,
    r.name as role_name,
    ur.assigned_at
FROM auth.users u
JOIN auth.user_roles ur ON u.id = ur.user_id
JOIN auth.roles r ON ur.role_id = r.id
WHERE u.email IN ('admin@domainflow.com', 'test@example.com', 'dev@domainflow.com')
ORDER BY u.email, r.name;
