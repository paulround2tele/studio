-- Down migration for default users
-- Removes the 3 default users

DELETE FROM auth.users WHERE email IN (
    'admin@domainflow.com',
    'test@example.com', 
    'dev@domainflow.com'
);