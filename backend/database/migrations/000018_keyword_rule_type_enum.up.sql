-- Create missing keyword_rule_type_enum type
-- This enum is referenced in 000006_keyword_management.up.sql but was never defined

-- Check if the type already exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'keyword_rule_type_enum') THEN
        CREATE TYPE public.keyword_rule_type_enum AS ENUM (
            'string',
            'regex'
        );
        
        COMMENT ON TYPE public.keyword_rule_type_enum IS
        'Defines the type of keyword rule pattern matching - string for exact matches, regex for pattern matching';
    END IF;
END$$;