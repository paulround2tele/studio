-- Migration to add missing 'archived' status to campaign_status_enum
-- This aligns the database with the Go CampaignStatusEnum

-- Add 'archived' to the campaign_status_enum type
ALTER TYPE public.campaign_status_enum ADD VALUE 'archived';

-- Update the constraint to include 'archived'
ALTER TABLE public.campaigns 
DROP CONSTRAINT chk_campaigns_status_valid;

ALTER TABLE public.campaigns 
ADD CONSTRAINT chk_campaigns_status_valid 
CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'running'::text, 'pausing'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'archived'::text])));

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
