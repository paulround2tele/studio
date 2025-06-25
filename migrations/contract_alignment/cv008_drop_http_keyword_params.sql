-- Migration: cv008_drop_http_keyword_params.sql
-- Purpose: Remove obsolete http_keyword_params table now replaced by http_keyword_campaign_params
-- Author: Contract Alignment Team
-- Date: 2025-07-20
-- Severity: LOW - cleanup only

BEGIN;

-- Abort if this migration has already been applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = 'cv008_drop_http_keyword_params') THEN
        RAISE EXCEPTION 'Migration cv008_drop_http_keyword_params already applied';
    END IF;
END $$;

-- Drop table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='http_keyword_params'
    ) THEN
        DROP TABLE public.http_keyword_params;
    END IF;
END $$;

-- Record migration
INSERT INTO public.schema_migrations(version, description)
VALUES ('cv008_drop_http_keyword_params', 'Drop obsolete http_keyword_params table')
ON CONFLICT DO NOTHING;

COMMIT;
