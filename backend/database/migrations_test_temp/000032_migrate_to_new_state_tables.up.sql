-- Phase 2.1: Migrate existing data to new campaign_states and phase_executions tables
-- Part of Database Architecture Cleanup

-- Migrate data from lead_generation_campaigns to campaign_states
INSERT INTO campaign_states (
    campaign_id,
    current_state,
    mode,
    configuration,
    version,
    created_at,
    updated_at
)
SELECT 
    id as campaign_id,
    
    -- Map business_status to new campaign_state_enum
    CASE 
        WHEN business_status IS NULL THEN 'draft'::campaign_state_enum
        WHEN business_status = 'draft' THEN 'draft'::campaign_state_enum
        WHEN business_status = 'running' THEN 'running'::campaign_state_enum
        WHEN business_status = 'paused' THEN 'paused'::campaign_state_enum
        WHEN business_status = 'completed' THEN 'completed'::campaign_state_enum
        WHEN business_status = 'failed' THEN 'failed'::campaign_state_enum
        WHEN business_status = 'cancelled' THEN 'cancelled'::campaign_state_enum
        WHEN business_status = 'archived' THEN 'archived'::campaign_state_enum
        ELSE 'draft'::campaign_state_enum
    END as current_state,
    
    -- Map is_full_sequence_mode to new campaign_mode_enum
    CASE 
        WHEN is_full_sequence_mode = true THEN 'full_sequence'::campaign_mode_enum
        ELSE 'step_by_step'::campaign_mode_enum
    END as mode,
    
    -- Use existing metadata as configuration, or empty object
    COALESCE(metadata, '{}'::jsonb) as configuration,
    
    -- Use existing state_version or default to 1
    COALESCE(state_version, 1) as version,
    
    created_at,
    updated_at
    
FROM lead_generation_campaigns
WHERE id IS NOT NULL;

-- Migrate data from campaign_phases to phase_executions
INSERT INTO phase_executions (
    id,
    campaign_id,
    phase_type,
    status,
    started_at,
    completed_at,
    paused_at,
    failed_at,
    progress_percentage,
    total_items,
    processed_items,
    successful_items,
    failed_items,
    configuration,
    error_details,
    created_at,
    updated_at
)
SELECT 
    id,
    campaign_id,
    phase_type,
    
    -- Map phase_status_enum to execution_status_enum (they have same values)
    status::text::execution_status_enum as status,
    
    started_at,
    completed_at,
    paused_at,
    failed_at,
    progress_percentage,
    total_items,
    processed_items,
    successful_items,
    failed_items,
    configuration,
    
    -- Create error_details from error_message if it exists
    CASE 
        WHEN error_message IS NOT NULL THEN 
            json_build_object('message', error_message, 'timestamp', failed_at)::jsonb
        ELSE NULL
    END as error_details,
    
    created_at,
    updated_at
    
FROM campaign_phases
WHERE campaign_id IS NOT NULL;

-- Log migration results
DO $$
DECLARE
    campaigns_migrated INTEGER;
    phases_migrated INTEGER;
BEGIN
    SELECT COUNT(*) INTO campaigns_migrated FROM campaign_states;
    SELECT COUNT(*) INTO phases_migrated FROM phase_executions;
    
    RAISE NOTICE 'Migration completed: % campaigns and % phase executions migrated', 
        campaigns_migrated, phases_migrated;
END $$;
