-- Stored Procedures for Complex Campaign State Management and Job Queue Operations
-- High-performance procedures for complex business logic and batch operations

-- =============================================
-- CAMPAIGN STATE MANAGEMENT PROCEDURES
-- =============================================

-- Procedure to start a campaign with full validation and setup
CREATE OR REPLACE FUNCTION start_campaign(
    p_campaign_id UUID,
    p_user_id UUID,
    p_force_start BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    campaign_record RECORD;
    validation_results JSONB := '{}';
    phase_setup_result JSONB;
    result JSONB;
BEGIN
    -- Get campaign details
    SELECT * INTO campaign_record 
    FROM lead_generation_campaigns 
    WHERE id = p_campaign_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Campaign not found'
        );
    END IF;

    -- Validate campaign can be started
    IF campaign_record.status NOT IN ('draft', 'paused') AND NOT p_force_start THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Campaign cannot be started from status: ' || campaign_record.status
        );
    END IF;

    -- Validate required configurations
    validation_results := jsonb_build_object(
        'domain_generation_config', EXISTS(
            SELECT 1 FROM domain_generation_campaign_params 
            WHERE campaign_id = p_campaign_id
        ),
        'keyword_sets', EXISTS(
            SELECT 1 FROM keyword_sets 
            WHERE campaign_id = p_campaign_id AND is_active = TRUE
        ),
        'proxy_pools', EXISTS(
            SELECT 1 FROM http_keyword_campaign_params 
            WHERE campaign_id = p_campaign_id AND proxy_pool_id IS NOT NULL
        )
    );

    -- Check if all validations pass
    IF NOT (validation_results->>'domain_generation_config')::BOOLEAN OR
       NOT (validation_results->>'keyword_sets')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Campaign configuration incomplete',
            'validation_results', validation_results
        );
    END IF;

    -- Set application context for triggers
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
    PERFORM set_config('app.state_change_reason', 'Campaign started via procedure', true);

    -- Update campaign status to running
    UPDATE lead_generation_campaigns 
    SET 
        status = 'running',
        current_phase = 'domain_generation',
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = p_campaign_id;

    -- Initialize campaign phases
    phase_setup_result := setup_campaign_phases(p_campaign_id, p_user_id);

    -- Create initial domain generation jobs
    INSERT INTO campaign_jobs (
        campaign_id,
        job_type,
        status,
        job_payload
    ) VALUES (
        p_campaign_id,
        'domain_generation',
        'pending',
        jsonb_build_object(
            'batch_size', 100,
            'initial_generation', true,
            'created_by', p_user_id
        )
    );

    -- Log campaign start event
    INSERT INTO campaign_state_events (
        campaign_id,
        event_type,
        event_data,
        user_id
    ) VALUES (
        p_campaign_id,
        'campaign_started',
        jsonb_build_object(
            'validation_results', validation_results,
            'phase_setup', phase_setup_result,
            'started_by', p_user_id
        ),
        p_user_id
    );

    result := jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'status', 'running',
        'current_phase', 'domain_generation',
        'validation_results', validation_results,
        'phase_setup', phase_setup_result
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure to setup campaign phases
CREATE OR REPLACE FUNCTION setup_campaign_phases(
    p_campaign_id UUID,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    phases phase_type_enum[] := ARRAY['domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis'];
    phase_type phase_type_enum;
    phase_order INTEGER := 1;
    created_phases JSONB := '[]';
BEGIN
    -- Create phase records for each campaign phase
    FOREACH phase_type IN ARRAY phases
    LOOP
        INSERT INTO campaign_phases (
            campaign_id,
            phase_type,
            phase_order,
            status,
            created_by
        ) VALUES (
            p_campaign_id,
            phase_type,
            phase_order,
            CASE WHEN phase_order = 1 THEN 'running' ELSE 'pending' END,
            p_user_id
        );

        created_phases := created_phases || jsonb_build_object(
            'phase_type', phase_type,
            'phase_order', phase_order,
            'status', CASE WHEN phase_order = 1 THEN 'running' ELSE 'pending' END
        );

        phase_order := phase_order + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'phases_created', created_phases,
        'total_phases', array_length(phases, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure to advance campaign to next phase
CREATE OR REPLACE FUNCTION advance_campaign_phase(
    p_campaign_id UUID,
    p_user_id UUID,
    p_completion_threshold DECIMAL DEFAULT 95.0
) RETURNS JSONB AS $$
DECLARE
    campaign_record RECORD;
    current_phase_record RECORD;
    next_phase phase_type_enum;
    completion_rate DECIMAL;
    phase_advancement_data JSONB;
BEGIN
    -- Get campaign details
    SELECT * INTO campaign_record 
    FROM lead_generation_campaigns 
    WHERE id = p_campaign_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
    END IF;

    -- Get current phase details
    SELECT * INTO current_phase_record
    FROM campaign_phases 
    WHERE campaign_id = p_campaign_id 
    AND phase_type = campaign_record.current_phase;

    -- Calculate completion rate based on current phase
    completion_rate := CASE campaign_record.current_phase
        WHEN 'domain_generation' THEN 
            CASE WHEN campaign_record.target_domain_count > 0 
                 THEN (campaign_record.domains_generated_count::DECIMAL / campaign_record.target_domain_count) * 100
                 ELSE 0 END
        WHEN 'dns_validation' THEN
            CASE WHEN campaign_record.domains_generated_count > 0
                 THEN (campaign_record.domains_validated_count::DECIMAL / campaign_record.domains_generated_count) * 100
                 ELSE 0 END
        WHEN 'http_keyword_validation' THEN
            (SELECT COALESCE(
                (COUNT(*) FILTER (WHERE validation_status = 'validated')::DECIMAL / COUNT(*)) * 100, 0
            ) FROM http_keyword_results WHERE http_keyword_campaign_id = p_campaign_id)
        ELSE 100
    END;

    -- Check if phase can be advanced
    IF completion_rate < p_completion_threshold THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Phase completion rate insufficient',
            'current_completion_rate', completion_rate,
            'required_threshold', p_completion_threshold
        );
    END IF;

    -- Determine next phase
    next_phase := CASE campaign_record.current_phase
        WHEN 'domain_generation' THEN 'dns_validation'
        WHEN 'dns_validation' THEN 'http_keyword_validation'
        WHEN 'http_keyword_validation' THEN 'analysis'
        ELSE NULL
    END;

    -- If no next phase, complete the campaign
    IF next_phase IS NULL THEN
        UPDATE lead_generation_campaigns 
        SET 
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_campaign_id;

        RETURN jsonb_build_object(
            'success', true,
            'campaign_completed', true,
            'final_phase', campaign_record.current_phase
        );
    END IF;

    -- Set application context
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
    PERFORM set_config('app.state_change_reason', 'Phase advancement', true);

    -- Complete current phase
    UPDATE campaign_phases 
    SET 
        status = 'completed',
        completed_at = NOW(),
        completion_rate = completion_rate,
        updated_at = NOW()
    WHERE campaign_id = p_campaign_id AND phase_type = campaign_record.current_phase;

    -- Start next phase
    UPDATE campaign_phases 
    SET 
        status = 'running',
        started_at = NOW(),
        updated_at = NOW()
    WHERE campaign_id = p_campaign_id AND phase_type = next_phase;

    -- Update campaign current phase
    UPDATE lead_generation_campaigns 
    SET 
        current_phase = next_phase,
        updated_at = NOW()
    WHERE id = p_campaign_id;

    -- Create jobs for new phase
    PERFORM create_phase_jobs(p_campaign_id, next_phase, p_user_id);

    phase_advancement_data := jsonb_build_object(
        'success', true,
        'previous_phase', campaign_record.current_phase,
        'new_phase', next_phase,
        'completion_rate', completion_rate,
        'advanced_by', p_user_id
    );

    -- Log phase advancement
    INSERT INTO campaign_state_events (
        campaign_id,
        event_type,
        event_data,
        user_id
    ) VALUES (
        p_campaign_id,
        'phase_advanced',
        phase_advancement_data,
        p_user_id
    );

    RETURN phase_advancement_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- JOB QUEUE MANAGEMENT PROCEDURES
-- =============================================

-- Procedure to create phase-specific jobs
CREATE OR REPLACE FUNCTION create_phase_jobs(
    p_campaign_id UUID,
    p_phase_type phase_type_enum,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    job_count INTEGER := 0;
    jobs_created JSONB := '[]';
    batch_size INTEGER := 50;
    domain_count INTEGER;
BEGIN
    CASE p_phase_type
        WHEN 'domain_generation' THEN
            -- Create domain generation jobs
            INSERT INTO campaign_jobs (
                campaign_id,
                job_type,
                status,
                priority,
                created_by,
                job_data
            ) VALUES (
                p_campaign_id,
                'domain_generation',
                'pending',
                5,
                p_user_id,
                jsonb_build_object('batch_size', batch_size)
            );
            job_count := 1;

        WHEN 'dns_validation' THEN
            -- Create DNS validation jobs in batches
            SELECT COUNT(*) INTO domain_count
            FROM generated_domains
            WHERE campaign_id = p_campaign_id AND dns_status = 'pending';

            FOR i IN 1..(CEIL(domain_count::DECIMAL / batch_size))::INTEGER LOOP
                INSERT INTO campaign_jobs (
                    campaign_id,
                    job_type,
                    status,
                    job_payload
                ) VALUES (
                    p_campaign_id,
                    'dns_validation',
                    'pending',
                    jsonb_build_object(
                        'batch_number', i,
                        'batch_size', batch_size,
                        'offset', (i - 1) * batch_size,
                        'created_by', p_user_id
                    )
                );
                job_count := job_count + 1;
            END LOOP;

        WHEN 'http_keyword_validation' THEN
            -- Create HTTP validation jobs
            SELECT COUNT(*) INTO domain_count
            FROM generated_domains
            WHERE campaign_id = p_campaign_id AND http_status = 'pending';

            FOR i IN 1..(CEIL(domain_count::DECIMAL / batch_size))::INTEGER LOOP
                INSERT INTO campaign_jobs (
                    campaign_id,
                    job_type,
                    status,
                    job_payload
                ) VALUES (
                    p_campaign_id,
                    'http_keyword_validation',
                    'pending',
                    jsonb_build_object(
                        'batch_number', i,
                        'batch_size', batch_size,
                        'offset', (i - 1) * batch_size,
                        'created_by', p_user_id
                    )
                );
                job_count := job_count + 1;
            END LOOP;

        WHEN 'analysis' THEN
            -- Create analysis jobs
            INSERT INTO campaign_jobs (
                campaign_id,
                job_type,
                status,
                job_payload
            ) VALUES (
                p_campaign_id,
                'analysis',
                'pending',
                jsonb_build_object(
                    'analysis_type', 'comprehensive',
                    'created_by', p_user_id
                )
            );
            job_count := 1;
    END CASE;

    RETURN jsonb_build_object(
        'phase_type', p_phase_type,
        'jobs_created', job_count,
        'batch_size', batch_size
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure to process job queue with worker assignment
CREATE OR REPLACE FUNCTION process_job_queue(
    p_processing_server_id VARCHAR(100),
    p_job_types TEXT[] DEFAULT NULL,
    p_max_jobs INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    job_record RECORD;
    processed_jobs JSONB := '[]';
    job_count INTEGER := 0;
BEGIN
    -- Process jobs in priority order
    FOR job_record IN
        SELECT *
        FROM campaign_jobs
        WHERE status = 'pending'
        AND (p_job_types IS NULL OR job_type = ANY(p_job_types))
        AND scheduled_at <= NOW()
        ORDER BY created_at ASC
        LIMIT p_max_jobs
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Assign job to processing server
        UPDATE campaign_jobs
        SET
            status = 'running',
            processing_server_id = p_processing_server_id,
            last_attempted_at = NOW(),
            updated_at = NOW()
        WHERE id = job_record.id;

        processed_jobs := processed_jobs || jsonb_build_object(
            'job_id', job_record.id,
            'job_type', job_record.job_type,
            'campaign_id', job_record.campaign_id,
            'assigned_to_server', p_processing_server_id
        );

        job_count := job_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'processing_server_id', p_processing_server_id,
        'jobs_assigned', job_count,
        'jobs', processed_jobs
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure to complete a job with results
CREATE OR REPLACE FUNCTION complete_job(
    p_job_id UUID,
    p_success BOOLEAN,
    p_result_data JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    job_record RECORD;
    campaign_id UUID;
    completion_data JSONB;
    execution_duration_ms BIGINT;
BEGIN
    -- Get job details
    SELECT * INTO job_record
    FROM campaign_jobs
    WHERE id = p_job_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job not found');
    END IF;

    campaign_id := job_record.campaign_id;

    -- Calculate execution duration if last_attempted_at exists
    execution_duration_ms := CASE
        WHEN job_record.last_attempted_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (NOW() - job_record.last_attempted_at)) * 1000
        ELSE NULL
    END;

    -- Update job status
    UPDATE campaign_jobs
    SET
        status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
        last_error = CASE WHEN NOT p_success THEN p_error_message ELSE last_error END,
        job_payload = CASE
            WHEN p_result_data IS NOT NULL
            THEN COALESCE(job_payload, '{}'::jsonb) || jsonb_build_object('result_data', p_result_data)
            ELSE job_payload
        END,
        updated_at = NOW()
    WHERE id = p_job_id;

    completion_data := jsonb_build_object(
        'job_id', p_job_id,
        'job_type', job_record.job_type,
        'campaign_id', campaign_id,
        'success', p_success,
        'execution_duration_ms', execution_duration_ms
    );

    -- Log job completion
    INSERT INTO campaign_state_events (
        campaign_id,
        event_type,
        event_data,
        user_id
    ) VALUES (
        campaign_id,
        'job_completed',
        completion_data,
        NULL -- No user_id available in job_record
    );

    -- Check if phase can be advanced
    IF p_success AND job_record.job_type IN ('domain_generation', 'dns_validation', 'http_keyword_validation') THEN
        PERFORM check_phase_completion(campaign_id);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'job_completed', completion_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- BATCH OPERATIONS PROCEDURES
-- =============================================

-- Procedure to batch update domain validation status
CREATE OR REPLACE FUNCTION batch_update_domain_validation(
    p_campaign_id UUID,
    p_domain_updates JSONB
) RETURNS JSONB AS $$
DECLARE
    domain_update JSONB;
    updated_count INTEGER := 0;
    failed_count INTEGER := 0;
    update_results JSONB := '[]';
BEGIN
    -- Process each domain update
    FOR domain_update IN SELECT * FROM jsonb_array_elements(p_domain_updates)
    LOOP
        BEGIN
            UPDATE generated_domains
            SET
                dns_status = COALESCE((domain_update->>'dns_status')::domain_dns_status_enum, dns_status),
                http_status = COALESCE((domain_update->>'http_status')::domain_http_status_enum, http_status),
                lead_status = CASE
                    WHEN (domain_update->>'dns_status') = 'ok'
                     AND (domain_update->>'http_status') = 'ok'
                    THEN 'match'::domain_lead_status_enum
                    WHEN (domain_update->>'dns_status') = 'error'
                      OR (domain_update->>'http_status') = 'error'
                    THEN 'error'::domain_lead_status_enum
                    ELSE lead_status
                END,
                last_validated_at = CASE
                    WHEN (domain_update->>'dns_status') = 'ok'
                     AND (domain_update->>'http_status') = 'ok'
                    THEN NOW()
                    ELSE last_validated_at
                END
            WHERE campaign_id = p_campaign_id
            AND domain_name = (domain_update->>'domain_name');

            IF FOUND THEN
                updated_count := updated_count + 1;
                update_results := update_results || jsonb_build_object(
                    'domain_name', domain_update->>'domain_name',
                    'status', 'updated'
                );
            ELSE
                failed_count := failed_count + 1;
                update_results := update_results || jsonb_build_object(
                    'domain_name', domain_update->>'domain_name',
                    'status', 'not_found'
                );
            END IF;

        EXCEPTION WHEN OTHERS THEN
            failed_count := failed_count + 1;
            update_results := update_results || jsonb_build_object(
                'domain_name', domain_update->>'domain_name',
                'status', 'error',
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'campaign_id', p_campaign_id,
        'updated_count', updated_count,
        'failed_count', failed_count,
        'results', update_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ANALYTICS AND REPORTING PROCEDURES
-- =============================================

-- Procedure to generate campaign analytics
CREATE OR REPLACE FUNCTION generate_campaign_analytics(
    p_campaign_id UUID,
    p_include_details BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    campaign_stats JSONB;
    domain_stats JSONB;
    job_stats JSONB;
    performance_stats JSONB;
    phase_stats JSONB;
    detailed_data JSONB := '{}';
BEGIN
    -- Get campaign basic stats
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'status', status,
        'current_phase', current_phase,
        'created_at', created_at,
        'started_at', started_at,
        'completed_at', completed_at,
        'target_domain_count', target_domain_count,
        'domains_generated_count', domains_generated_count,
        'domains_validated_count', domains_validated_count
    ) INTO campaign_stats
    FROM lead_generation_campaigns
    WHERE id = p_campaign_id;

    -- Get domain statistics
    SELECT jsonb_build_object(
        'total_domains', COUNT(*),
        'validated_domains', COUNT(*) FILTER (WHERE lead_status = 'match'),
        'failed_domains', COUNT(*) FILTER (WHERE lead_status = 'error'),
        'pending_domains', COUNT(*) FILTER (WHERE lead_status = 'pending'),
        'dns_validated', COUNT(*) FILTER (WHERE dns_status = 'ok'),
        'http_validated', COUNT(*) FILTER (WHERE http_status = 'ok'),
        'validation_success_rate',
            CASE WHEN COUNT(*) > 0
                 THEN ROUND((COUNT(*) FILTER (WHERE lead_status = 'match')::DECIMAL / COUNT(*)) * 100, 2)
                 ELSE 0
            END
    ) INTO domain_stats
    FROM generated_domains
    WHERE campaign_id = p_campaign_id;

    -- Get job statistics
    SELECT jsonb_build_object(
        'total_jobs', COUNT(*),
        'completed_jobs', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_jobs', COUNT(*) FILTER (WHERE status = 'failed'),
        'running_jobs', COUNT(*) FILTER (WHERE status = 'running'),
        'pending_jobs', COUNT(*) FILTER (WHERE status = 'pending'),
        'avg_attempts', AVG(attempts) FILTER (WHERE attempts > 0),
        'job_success_rate',
            CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) > 0
                 THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL /
                           COUNT(*) FILTER (WHERE status IN ('completed', 'failed'))) * 100, 2)
                 ELSE 0
            END
    ) INTO job_stats
    FROM campaign_jobs
    WHERE campaign_id = p_campaign_id;

    -- Get phase statistics
    SELECT jsonb_object_agg(
        phase_type, 
        jsonb_build_object(
            'status', status,
            'started_at', started_at,
            'completed_at', completed_at,
            'completion_rate', completion_rate,
            'phase_order', phase_order
        )
    ) INTO phase_stats
    FROM campaign_phases
    WHERE campaign_id = p_campaign_id;

    -- Get performance statistics
    SELECT jsonb_build_object(
        'campaign_duration_hours', 
            CASE WHEN started_at IS NOT NULL 
                 THEN EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) / 3600
                 ELSE NULL 
            END,
        'domains_per_hour',
            CASE WHEN started_at IS NOT NULL AND domains_generated_count > 0
                 THEN domains_generated_count / (EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) / 3600)
                 ELSE 0
            END
    ) INTO performance_stats
    FROM lead_generation_campaigns
    WHERE id = p_campaign_id;

    -- Include detailed data if requested
    IF p_include_details THEN
        SELECT jsonb_build_object(
            'recent_domains', (
                SELECT jsonb_agg(jsonb_build_object(
                    'domain_name', domain_name,
                    'lead_status', lead_status,
                    'created_at', created_at
                ))
                FROM (
                    SELECT domain_name, lead_status, created_at
                    FROM generated_domains
                    WHERE campaign_id = p_campaign_id
                    ORDER BY created_at DESC
                    LIMIT 20
                ) recent
            ),
            'recent_jobs', (
                SELECT jsonb_agg(jsonb_build_object(
                    'job_type', job_type,
                    'status', status,
                    'attempts', attempts,
                    'created_at', created_at
                ))
                FROM (
                    SELECT job_type, status, attempts, created_at
                    FROM campaign_jobs
                    WHERE campaign_id = p_campaign_id
                    ORDER BY created_at DESC
                    LIMIT 20
                ) recent
            )
        ) INTO detailed_data;
    END IF;

    RETURN jsonb_build_object(
        'campaign', campaign_stats,
        'domains', domain_stats,
        'jobs', job_stats,
        'phases', phase_stats,
        'performance', performance_stats,
        'details', detailed_data,
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MAINTENANCE AND CLEANUP PROCEDURES
-- =============================================

-- Procedure to cleanup old completed jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs(
    p_retention_days INTEGER DEFAULT 90,
    p_batch_size INTEGER DEFAULT 1000
) RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    LOOP
        DELETE FROM campaign_jobs
        WHERE id IN (
            SELECT id
            FROM campaign_jobs
            WHERE status = 'completed'
            AND updated_at < NOW() - (p_retention_days || ' days')::INTERVAL
            LIMIT p_batch_size
        );

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;

        EXIT WHEN deleted_count = 0;
    END LOOP;

    RETURN jsonb_build_object(
        'total_deleted', total_deleted,
        'retention_days', p_retention_days,
        'cleanup_completed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check phase completion
CREATE OR REPLACE FUNCTION check_phase_completion(p_campaign_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    campaign_record RECORD;
    completion_rate DECIMAL;
    threshold DECIMAL := 95.0;
BEGIN
    SELECT * INTO campaign_record 
    FROM lead_generation_campaigns 
    WHERE id = p_campaign_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Calculate completion based on current phase
    completion_rate := CASE campaign_record.current_phase
        WHEN 'domain_generation' THEN
            CASE WHEN campaign_record.target_domain_count > 0 
                 THEN (campaign_record.domains_generated_count::DECIMAL / campaign_record.target_domain_count) * 100
                 ELSE 0 END
        WHEN 'dns_validation' THEN
            CASE WHEN campaign_record.domains_generated_count > 0
                 THEN (campaign_record.domains_validated_count::DECIMAL / campaign_record.domains_generated_count) * 100
                 ELSE 0 END
        ELSE 100
    END;

    -- Auto-advance if threshold reached
    IF completion_rate >= threshold THEN
        PERFORM advance_campaign_phase(p_campaign_id, campaign_record.created_by);
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes on commonly used stored procedure parameters
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_worker_processing
ON campaign_jobs(processing_server_id, status, created_at)
WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_generated_domains_batch_validation
ON generated_domains(campaign_id, lead_status, created_at)
WHERE lead_status IN ('pending', 'no_match');