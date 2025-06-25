-- Migration: 005_fix_pattern_type_enum.sql
-- Purpose: Align pattern_type constraint with Go enum values (prefix, suffix, both)
-- Author: SchemaAligner
-- Date: 2025-06-21
-- Severity: HIGH - Enum mismatch prevents valid inserts

BEGIN;

-- Apply only if not already executed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_migrations WHERE version = '005_fix_pattern_type_enum'
    ) THEN
        -- Update existing values if using old enum
        UPDATE public.domain_generation_params
        SET pattern_type = CASE pattern_type
            WHEN 'fixed' THEN 'prefix'
            WHEN 'variable' THEN 'suffix'
            WHEN 'hybrid' THEN 'both'
            ELSE pattern_type
        END
        WHERE pattern_type IN ('fixed', 'variable', 'hybrid');

        -- Drop old constraint if exists
        ALTER TABLE public.domain_generation_params
            DROP CONSTRAINT IF EXISTS domain_generation_params_pattern_type_check;

        -- Add new constraint matching Go enums
        ALTER TABLE public.domain_generation_params
            ADD CONSTRAINT domain_generation_params_pattern_type_check
            CHECK (pattern_type IN ('prefix', 'suffix', 'both'));

        -- Record migration
        INSERT INTO public.schema_migrations (version, description)
        VALUES ('005_fix_pattern_type_enum', 'Align pattern_type constraint with Go values');
    END IF;
END $$;

COMMIT;
