-- Fix stored procedures to use correct column names for campaign_state_events
-- All stored procedures were using 'user_id' but table schema requires 'triggered_by' and 'operation_context'

-- =============================================
-- Fix start_campaign stored procedure
-- =============================================
CREATE OR REPLACE FUNCTION start_campaign(
    p_campaign_id UUID,
    p_user_id UUID,
    p_async BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
    campaign_record lead_generation_campaigns%ROWTYPE;
    validation_results JSONB;
    phase_setup_result JSONB;
BEGIN
    -- Get campaign details
    SELECT * INTO campaign_record 
    FROM lead_generation_campaigns 
    WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign % not found', p_campaign_id;
    END IF;
    
    -- Validate campaign can be started
    IF campaign_record.business_status != 'draft' THEN
        RAISE EXCEPTION 'Campaign % cannot be started. Current status: %', p_campaign_id, campaign_record.business_status;
    END IF;
    
    -- Set up phases
    phase_setup_result := setup_campaign_phases(p_campaign_id, p_user_id);
    
    -- Update campaign status to running
    UPDATE lead_generation_campaigns 
    SET 
        business_status = 'running',
        updated_at = NOW(),
        user_id = p_user_id
    WHERE id = p_campaign_id;
    
    -- Validation success response
    validation_results := jsonb_build_object(
        'campaign_ready', true,
        'phase_count', jsonb_array_length(phase_setup_result->'phases'),
        'configuration', jsonb_build_object(
            'batch_size', 100,
            'initial_generation', true,
            'created_by', p_user_id
        )
    );

    -- ✅ FIXED: Log campaign start event with correct column names
    INSERT INTO campaign_state_events (
        campaign_id,
        event_type,
        source_state,
        target_state,
        reason,
        triggered_by,                    -- ✅ Fixed: use triggered_by instead of user_id
        event_data,
        operation_context,               -- ✅ Fixed: include required operation_context
        user_id                          -- ✅ Keep user_id for backward compatibility
    ) VALUES (
        p_campaign_id,
        'campaign_started',
        'draft',
        'running',
        'Campaign started by user',
        p_user_id::text,                 -- ✅ Fixed: ensure NOT NULL and convert to text
        jsonb_build_object(
            'validation_results', validation_results,
            'phase_setup', phase_setup_result,
            'started_by', p_user_id
        ),
        jsonb_build_object(               -- ✅ Fixed: provide operation_context
            'operation_type', 'start_campaign',
            'user_id', p_user_id,
            'async_mode', p_async,
            'timestamp', NOW()
        ),
        p_user_id                        -- ✅ Keep user_id populated
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'status', 'running',
        'validation_results', validation_results,
        'phase_setup', phase_setup_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Fix advance_campaign_phase stored procedure
-- =============================================
CREATE OR REPLACE FUNCTION advance_campaign_phase(
    p_campaign_id UUID,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    campaign_record lead_generation_campaigns%ROWTYPE;
    current_phase_record campaign_phases%ROWTYPE;
    next_phase_record campaign_phases%ROWTYPE;
    phase_advancement_data JSONB;
BEGIN
    -- Get campaign details
    SELECT * INTO campaign_record 
    FROM lead_generation_campaigns 
    WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign % not found', p_campaign_id;
    END IF;
    
    -- Get current phase
    SELECT * INTO current_phase_record
    FROM campaign_phases 
    WHERE campaign_id = p_campaign_id 
    AND status = 'running'
    ORDER BY phase_order ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No running phase found for campaign %', p_campaign_id;
    END IF;
    
    -- Complete current phase
    UPDATE campaign_phases 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = current_phase_record.id;
    
    -- Get next phase
    SELECT * INTO next_phase_record
    FROM campaign_phases 
    WHERE campaign_id = p_campaign_id 
    AND phase_order > current_phase_record.phase_order
    AND status = 'pending'
    ORDER BY phase_order ASC
    LIMIT 1;
    
    IF FOUND THEN
        -- Start next phase
        UPDATE campaign_phases 
        SET 
            status = 'running',
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = next_phase_record.id;
        
        -- Update campaign current phase
        UPDATE lead_generation_campaigns 
        SET 
            current_phase = next_phase_record.phase_type,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        phase_advancement_data := jsonb_build_object(
            'previous_phase', current_phase_record.phase_type,
            'current_phase', next_phase_record.phase_type,
            'phase_order', next_phase_record.phase_order,
            'advanced_at', NOW(),
            'advanced_by', p_user_id
        );
    ELSE
        -- No more phases, complete campaign
        UPDATE lead_generation_campaigns 
        SET 
            business_status = 'completed',
            current_phase = NULL,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        phase_advancement_data := jsonb_build_object(
            'previous_phase', current_phase_record.phase_type,
            'current_phase', NULL,
            'campaign_completed', true,
            'completed_at', NOW(),
            'advanced_by', p_user_id
        );
    END IF;

    -- ✅ FIXED: Log phase advancement with correct column names
    INSERT INTO campaign_state_events (
        campaign_id,
        event_type,
        source_state,
        target_state,
        reason,
        triggered_by,                    -- ✅ Fixed: use triggered_by instead of user_id
        event_data,
        operation_context,               -- ✅ Fixed: include required operation_context
        user_id                          -- ✅ Keep user_id for backward compatibility
    ) VALUES (
        p_campaign_id,
        'phase_advanced',
        current_phase_record.phase_type,
        COALESCE(next_phase_record.phase_type, 'completed'),
        'Phase advanced by user',
        p_user_id::text,                 -- ✅ Fixed: ensure NOT NULL and convert to text
        phase_advancement_data,
        jsonb_build_object(               -- ✅ Fixed: provide operation_context
            'operation_type', 'advance_phase',
            'user_id', p_user_id,
            'current_phase_id', current_phase_record.id,
            'next_phase_id', next_phase_record.id,
            'timestamp', NOW()
        ),
        p_user_id                        -- ✅ Keep user_id populated
    );

    RETURN phase_advancement_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Fix generate_campaign_analytics stored procedure
-- =============================================
CREATE OR REPLACE FUNCTION generate_campaign_analytics(
    p_job_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    job_record campaign_jobs%ROWTYPE;
    campaign_id UUID;
    completion_data JSONB;
    execution_duration_ms BIGINT;
BEGIN
    -- Get job details
    SELECT * INTO job_record FROM campaign_jobs WHERE id = p_job_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job % not found', p_job_id;
    END IF;
    
    campaign_id := job_record.campaign_id;
    
    -- Calculate execution duration
    execution_duration_ms := EXTRACT(EPOCH FROM (NOW() - job_record.created_at)) * 1000;
    
    -- Update job status
    UPDATE campaign_jobs 
    SET 
        status = CASE WHEN p_success THEN 'completed'::job_status_enum ELSE 'failed'::job_status_enum END,
        last_error = CASE WHEN p_success THEN NULL ELSE p_error_message END,
        updated_at = NOW()
    WHERE id = p_job_id;
    
    -- Prepare completion data
    completion_data := jsonb_build_object(
        'job_id', p_job_id,
        'job_type', job_record.job_type,
        'campaign_id', campaign_id,
        'success', p_success,
        'execution_duration_ms', execution_duration_ms
    );

    -- ✅ FIXED: Log job completion with correct column names
    INSERT INTO campaign_state_events (
        campaign_id,
        event_type,
        source_state,
        target_state,
        reason,
        triggered_by,                    -- ✅ Fixed: use triggered_by instead of user_id
        event_data,
        operation_context,               -- ✅ Fixed: include required operation_context
        user_id                          -- ✅ Keep user_id for backward compatibility
    ) VALUES (
        campaign_id,
        'job_completed',
        job_record.status::text,
        CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
        'Job completion processed',
        'system',                        -- ✅ Fixed: provide system as triggered_by (NOT NULL)
        completion_data,
        jsonb_build_object(               -- ✅ Fixed: provide operation_context
            'operation_type', 'job_completion',
            'job_id', p_job_id,
            'job_type', job_record.job_type,
            'execution_duration_ms', execution_duration_ms,
            'timestamp', NOW()
        ),
        NULL                             -- ✅ No user_id available in job_record
    );

    -- Check if phase can be advanced
    IF p_success AND job_record.job_type IN ('domain_generation', 'dns_validation', 'http_keyword_validation') THEN
        -- Could call advance_campaign_phase here if needed
        NULL;
    END IF;
    
    RETURN completion_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the fix
COMMENT ON FUNCTION start_campaign(UUID, UUID, BOOLEAN) IS 'Fixed to use triggered_by and operation_context columns instead of user_id only';
COMMENT ON FUNCTION advance_campaign_phase(UUID, UUID) IS 'Fixed to use triggered_by and operation_context columns instead of user_id only';
COMMENT ON FUNCTION generate_campaign_analytics(UUID, BOOLEAN, TEXT) IS 'Fixed to use triggered_by and operation_context columns instead of user_id only';
