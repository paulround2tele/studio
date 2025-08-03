-- Remove database triggers for campaign state management
-- Part of Phase 1: Replace with application-managed state

-- Remove the trigger first (this removes the dependency)
DROP TRIGGER IF EXISTS trigger_campaign_state_transition ON lead_generation_campaigns;

-- Remove any other triggers that might use this function
DROP TRIGGER IF EXISTS campaign_state_transition_trigger ON lead_generation_campaigns;

-- Now remove the trigger function (with CASCADE to handle remaining dependencies)
DROP FUNCTION IF EXISTS trigger_campaign_state_transition() CASCADE;

-- Add comment to document the change
COMMENT ON TABLE lead_generation_campaigns IS 'State transitions now managed by application layer with state.CampaignStateMachine';

-- Create index to support application-managed state queries
CREATE INDEX IF NOT EXISTS idx_campaigns_business_status ON lead_generation_campaigns(business_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_current_phase ON lead_generation_campaigns(current_phase);
