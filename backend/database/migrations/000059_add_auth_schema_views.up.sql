-- 000059_add_auth_schema_views.up.sql
-- Purpose: Provide auth.* objects expected by Go code without altering existing public tables.
-- Strategy: Create auth schema; create views auth.users and auth.sessions pointing to public tables.
-- This is non-destructive and reversible. Later you can replace views with real tables if desired.

CREATE SCHEMA IF NOT EXISTS auth;

-- Create users view only if a real table does not already exist in auth
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        CREATE OR REPLACE VIEW auth.users AS SELECT * FROM public.users;
    END IF;
END $$;

-- Create sessions view if sessions table exists in public
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sessions'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'sessions'
    ) THEN
        CREATE OR REPLACE VIEW auth.sessions AS SELECT * FROM public.sessions;
    END IF;
END $$;

-- Optional indexes NOTE: views do not inherit indexes; rely on underlying public indexes.
-- If later you migrate to physical tables in auth, create appropriate indexes then.

-- Record metadata (no-op table to mark versioned auth schema introduction if desired)
-- CREATE TABLE IF NOT EXISTS auth._schema_marker (created_at timestamptz default now());
