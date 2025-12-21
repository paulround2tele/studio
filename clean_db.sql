-- Truncate all tables in public schema
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Truncate auth schema tables
TRUNCATE TABLE auth.sessions CASCADE;
TRUNCATE TABLE auth.users CASCADE;
