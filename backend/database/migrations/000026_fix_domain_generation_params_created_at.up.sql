-- Migration: 000026_fix_domain_generation_params_created_at.up.sql
-- Purpose: Add missing created_at column to domain_generation_params table
-- Author: DomainFlow Debug Team
-- Date: 2025-07-03
-- Severity: CRITICAL - Required for campaign creation and domain generation

BEGIN;

-- Add missing created_at and updated_at columns to domain_generation_params table
-- This fixes the "pq: column 'created_at' does not exist" error during campaign processing

DO $$
BEGIN
    -- Ensure domain_generation_params table exists
    CREATE TABLE IF NOT EXISTS public.domain_generation_params (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
        pattern_type TEXT NOT NULL,
        tld TEXT NOT NULL,
        constant_string TEXT,
        variable_length INTEGER NOT NULL CHECK (variable_length > 0),
        character_set TEXT NOT NULL,
        num_domains_to_generate INTEGER NOT NULL DEFAULT 1000 CHECK (num_domains_to_generate > 0)
    );

    -- Add created_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'domain_generation_params' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.domain_generation_params 
        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        
        RAISE NOTICE 'Added created_at column to domain_generation_params table';
    END IF;

    -- Add updated_at if not exists  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'domain_generation_params' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.domain_generation_params 
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        
        RAISE NOTICE 'Added updated_at column to domain_generation_params table';
    END IF;

    -- Add total_possible_combinations if not exists (critical for domain generation)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'domain_generation_params' 
        AND column_name = 'total_possible_combinations'
    ) THEN
        ALTER TABLE public.domain_generation_params 
        ADD COLUMN total_possible_combinations BIGINT NOT NULL DEFAULT 0;
        
        RAISE NOTICE 'Added total_possible_combinations column to domain_generation_params table';
    END IF;

    -- Add current_offset if not exists (critical for resumable generation)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'domain_generation_params' 
        AND column_name = 'current_offset'
    ) THEN
        ALTER TABLE public.domain_generation_params 
        ADD COLUMN current_offset BIGINT NOT NULL DEFAULT 0;
        
        RAISE NOTICE 'Added current_offset column to domain_generation_params table';
    END IF;
END $$;

-- Create index for campaign_id if not exists
CREATE INDEX IF NOT EXISTS idx_domain_gen_params_campaign_id ON public.domain_generation_params(campaign_id);

-- Add constraint for offset bounds if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'domain_generation_params' 
        AND constraint_name = 'chk_offset_within_bounds'
    ) THEN
        ALTER TABLE public.domain_generation_params
        ADD CONSTRAINT chk_offset_within_bounds 
        CHECK (current_offset >= 0 AND current_offset <= total_possible_combinations);
        
        RAISE NOTICE 'Added offset bounds constraint to domain_generation_params table';
    END IF;
END $$;

COMMIT;