-- Migration to add missing 'archived' status to campaign_status_enum
-- This aligns the database with the Go CampaignStatusEnum

BEGIN;

-- Add 'archived' to the campaign_status_enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'archived' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'campaign_status_enum')) THEN
        ALTER TYPE public.campaign_status_enum ADD VALUE 'archived';
    END IF;
END $$;

-- Add archived_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'archived_at') THEN
        ALTER TABLE public.campaigns ADD COLUMN archived_at timestamp with time zone;
    END IF;
END $$;

-- Add archived_reason column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'archived_reason') THEN
        ALTER TABLE public.campaigns ADD COLUMN archived_reason text;
    END IF;
END $$;

-- Update the validation function
CREATE OR REPLACE FUNCTION public.validate_campaign_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status NOT IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled', 'archived') THEN
        RAISE EXCEPTION 'Invalid campaign status: %. Must match Go CampaignStatusEnum', NEW.status;
    END IF;
    RETURN NEW;
END;
$$;

-- Update the comment to reflect alignment
COMMENT ON TYPE public.campaign_status_enum IS 'Maps to Go CampaignStatusEnum - fully aligned';

COMMIT;
