-- 000059_add_auth_schema_views.down.sql
-- Revert auth schema objects created by 000059 up migration.

DROP VIEW IF EXISTS auth.sessions;
DROP VIEW IF EXISTS auth.users;
-- Do not drop schema if other objects might have been added later; comment the next line if unsafe.
-- DROP SCHEMA IF EXISTS auth CASCADE;