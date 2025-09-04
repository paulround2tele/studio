-- Rollback: Remove phase sync infrastructure
DROP TRIGGER IF EXISTS trigger_campaign_phase_sync ON campaign_phases;
DROP FUNCTION IF EXISTS trigger_sync_campaign_from_phases();
DROP FUNCTION IF EXISTS sync_campaign_from_phases(UUID);
DROP FUNCTION IF EXISTS reset_phase_for_retry(UUID, phase_type_enum);

-- Remove comments
COMMENT ON COLUMN lead_generation_campaigns.current_phase IS NULL;
COMMENT ON COLUMN lead_generation_campaigns.phase_status IS NULL;
