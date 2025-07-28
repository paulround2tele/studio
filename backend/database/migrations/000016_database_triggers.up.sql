-- Database Triggers for Audit Logging, State Transitions, and Data Consistency
-- Comprehensive trigger system to ensure data integrity and automated audit trails

-- =============================================
-- TRIGGER FUNCTIONS FOR AUDIT LOGGING
-- =============================================

-- Generic audit logging function for all tables
CREATE OR REPLACE FUNCTION trigger_audit_log() RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
    old_data JSONB;
    new_data JSONB;
    audit_action VARCHAR(10);
    resource_id UUID;
    user_id_val UUID;
BEGIN
    -- Determine the action type
    IF TG_OP = 'DELETE' THEN
        audit_action := 'DELETE';
        audit_data := to_jsonb(OLD);
        old_data := to_jsonb(OLD);
        new_data := NULL;
        -- Try to extract resource_id from OLD record
        IF OLD ? 'id' THEN
            resource_id := (OLD.id)::UUID;
        END IF;
        -- Try to extract user context
        IF OLD ? 'user_id' THEN
            user_id_val := (OLD.user_id)::UUID;
        ELSIF OLD ? 'created_by' THEN
            user_id_val := (OLD.created_by)::UUID;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        audit_action := 'UPDATE';
        audit_data := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW),
            'changed_fields', (
                SELECT jsonb_object_agg(key, jsonb_build_object('old', OLD_json.value, 'new', NEW_json.value))
                FROM jsonb_each(to_jsonb(OLD)) AS OLD_json(key, value)
                JOIN jsonb_each(to_jsonb(NEW)) AS NEW_json(key, value) ON OLD_json.key = NEW_json.key
                WHERE OLD_json.value IS DISTINCT FROM NEW_json.value
            )
        );
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        resource_id := (NEW.id)::UUID;
        -- Try to extract user context from NEW record
        IF NEW ? 'user_id' THEN
            user_id_val := (NEW.user_id)::UUID;
        ELSIF NEW ? 'created_by' THEN
            user_id_val := (NEW.created_by)::UUID;
        ELSIF NEW ? 'updated_by' THEN
            user_id_val := (NEW.updated_by)::UUID;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        audit_action := 'INSERT';
        audit_data := to_jsonb(NEW);
        old_data := NULL;
        new_data := to_jsonb(NEW);
        resource_id := (NEW.id)::UUID;
        -- Try to extract user context from NEW record
        IF NEW ? 'user_id' THEN
            user_id_val := (NEW.user_id)::UUID;
        ELSIF NEW ? 'created_by' THEN
            user_id_val := (NEW.created_by)::UUID;
        END IF;
    END IF;

    -- Insert audit log entry
    INSERT INTO audit_logs (
        user_id,
        action_type,
        resource_type,
        resource_id,
        old_data,
        new_data,
        additional_data,
        ip_address,
        user_agent
    ) VALUES (
        user_id_val,
        audit_action,
        TG_TABLE_NAME,
        resource_id,
        old_data,
        new_data,
        audit_data,
        COALESCE(current_setting('app.current_ip', true), '127.0.0.1')::INET,
        current_setting('app.current_user_agent', true)
    );

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION trigger_update_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CAMPAIGN STATE TRANSITION TRIGGERS
-- =============================================

-- Campaign state transition validation and logging
CREATE OR REPLACE FUNCTION trigger_campaign_state_transition() RETURNS TRIGGER AS $$
DECLARE
    valid_transition BOOLEAN := FALSE;
    state_change_data JSONB;
    current_user_id UUID;
BEGIN
    -- Get current user from session context
    current_user_id := COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        NEW.created_by
    );

    -- Only process if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Validate state transitions
        valid_transition := CASE 
            WHEN OLD.status = 'draft' AND NEW.status IN ('running', 'deleted') THEN TRUE
            WHEN OLD.status = 'running' AND NEW.status IN ('paused', 'completed', 'failed', 'cancelled') THEN TRUE
            WHEN OLD.status = 'paused' AND NEW.status IN ('running', 'cancelled', 'completed') THEN TRUE
            WHEN OLD.status = 'failed' AND NEW.status IN ('running', 'cancelled') THEN TRUE
            WHEN OLD.status = 'completed' AND NEW.status = 'archived' THEN TRUE
            WHEN OLD.status = 'cancelled' AND NEW.status = 'archived' THEN TRUE
            ELSE FALSE
        END;

        -- Reject invalid transitions
        IF NOT valid_transition THEN
            RAISE EXCEPTION 'Invalid campaign state transition from % to %', OLD.status, NEW.status;
        END IF;

        -- Prepare state change data
        state_change_data := jsonb_build_object(
            'campaign_id', NEW.id,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'current_phase', NEW.current_phase,
            'transition_timestamp', NOW(),
            'triggered_by', current_user_id
        );

        -- Log state transition
        INSERT INTO campaign_state_transitions (
            campaign_id,
            from_status,
            to_status,
            triggered_by,
            trigger_reason,
            metadata
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            current_user_id,
            COALESCE(current_setting('app.state_change_reason', true), 'Manual update'),
            state_change_data
        );

        -- Create state snapshot for significant changes
        IF NEW.status IN ('running', 'completed', 'failed', 'cancelled') THEN
            INSERT INTO campaign_state_snapshots (
                campaign_id,
                snapshot_data,
                snapshot_reason
            ) VALUES (
                NEW.id,
                to_jsonb(NEW),
                'State transition to ' || NEW.status
            );
        END IF;

        -- Update campaign phase status if transitioning to running
        IF NEW.status = 'running' AND OLD.status != 'running' THEN
            NEW.started_at = COALESCE(NEW.started_at, NOW());
        END IF;

        -- Update completion timestamp
        IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
            NEW.completed_at = NOW();
        END IF;
    END IF;

    -- Handle phase transitions
    IF OLD.current_phase IS DISTINCT FROM NEW.current_phase THEN
        -- Log phase transition
        INSERT INTO campaign_state_events (
            campaign_id,
            event_type,
            event_data,
            user_id
        ) VALUES (
            NEW.id,
            'phase_transition',
            jsonb_build_object(
                'old_phase', OLD.current_phase,
                'new_phase', NEW.current_phase,
                'timestamp', NOW()
            ),
            current_user_id
        );

        -- Update phase completion status
        IF OLD.current_phase IS NOT NULL THEN
            UPDATE campaign_phases 
            SET 
                status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE campaign_id = NEW.id AND phase_type = OLD.current_phase;
        END IF;

        -- Start new phase
        IF NEW.current_phase IS NOT NULL THEN
            UPDATE campaign_phases 
            SET 
                status = 'running',
                started_at = COALESCE(started_at, NOW()),
                updated_at = NOW()
            WHERE campaign_id = NEW.id AND phase_type = NEW.current_phase;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DOMAIN VALIDATION STATE TRIGGERS
-- =============================================

-- Domain validation status update trigger
CREATE OR REPLACE FUNCTION trigger_domain_validation_update() RETURNS TRIGGER AS $$
DECLARE
    campaign_domains_total INTEGER;
    campaign_domains_validated INTEGER;
    validation_completion_rate DECIMAL(5,2);
BEGIN
    -- Only process if validation status changed
    IF OLD.validation_status IS DISTINCT FROM NEW.validation_status OR
       OLD.dns_validation_status IS DISTINCT FROM NEW.dns_validation_status OR
       OLD.http_validation_status IS DISTINCT FROM NEW.http_validation_status THEN
        
        -- Update campaign validation counters
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE validation_status = 'validated')
        INTO campaign_domains_total, campaign_domains_validated
        FROM generated_domains 
        WHERE campaign_id = NEW.campaign_id;

        -- Calculate completion rate
        validation_completion_rate := CASE 
            WHEN campaign_domains_total > 0 THEN 
                (campaign_domains_validated::DECIMAL / campaign_domains_total) * 100
            ELSE 0
        END;

        -- Update campaign validation statistics
        UPDATE lead_generation_campaigns 
        SET 
            domains_validated_count = campaign_domains_validated,
            validation_completion_rate = validation_completion_rate,
            updated_at = NOW()
        WHERE id = NEW.campaign_id;

        -- Log validation event
        INSERT INTO campaign_state_events (
            campaign_id,
            event_type,
            event_data,
            user_id
        ) VALUES (
            NEW.campaign_id,
            'domain_validation_update',
            jsonb_build_object(
                'domain_name', NEW.domain_name,
                'old_validation_status', OLD.validation_status,
                'new_validation_status', NEW.validation_status,
                'dns_status', NEW.dns_validation_status,
                'http_status', NEW.http_validation_status,
                'completion_rate', validation_completion_rate
            ),
            COALESCE(current_setting('app.current_user_id', true)::UUID, NEW.created_by)
        );

        -- Check if campaign phase should advance
        IF validation_completion_rate >= 95 AND NEW.validation_status = 'validated' THEN
            -- Update campaign to next phase if appropriate
            UPDATE lead_generation_campaigns 
            SET 
                current_phase = CASE current_phase
                    WHEN 'dns_validation' THEN 'http_keyword_validation'
                    WHEN 'http_keyword_validation' THEN 'analysis'
                    ELSE current_phase
                END,
                updated_at = NOW()
            WHERE id = NEW.campaign_id 
            AND current_phase IN ('dns_validation', 'http_keyword_validation');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- JOB QUEUE STATE TRIGGERS
-- =============================================

-- Job status update trigger
CREATE OR REPLACE FUNCTION trigger_job_status_update() RETURNS TRIGGER AS $$
DECLARE
    campaign_job_stats JSONB;
BEGIN
    -- Only process if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Update job timing
        CASE NEW.status
            WHEN 'running' THEN
                NEW.started_at = COALESCE(NEW.started_at, NOW());
            WHEN 'completed', 'failed', 'cancelled' THEN
                NEW.completed_at = COALESCE(NEW.completed_at, NOW());
                IF NEW.started_at IS NOT NULL THEN
                    NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
                END IF;
        END CASE;

        -- Calculate campaign job statistics
        WITH job_stats AS (
            SELECT 
                COUNT(*) as total_jobs,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
                COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
                COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
                AVG(duration_ms) FILTER (WHERE status = 'completed' AND duration_ms IS NOT NULL) as avg_duration_ms
            FROM campaign_jobs 
            WHERE campaign_id = NEW.campaign_id
        )
        SELECT to_jsonb(job_stats.*) INTO campaign_job_stats FROM job_stats;

        -- Log job status change event
        INSERT INTO campaign_state_events (
            campaign_id,
            event_type,
            event_data,
            user_id
        ) VALUES (
            NEW.campaign_id,
            'job_status_change',
            jsonb_build_object(
                'job_id', NEW.id,
                'job_type', NEW.job_type,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'duration_ms', NEW.duration_ms,
                'campaign_job_stats', campaign_job_stats
            ),
            COALESCE(NEW.assigned_to, NEW.created_by)
        );

        -- Auto-retry failed jobs if configured
        IF NEW.status = 'failed' AND NEW.retry_count < NEW.max_retries THEN
            NEW.status = 'retry_scheduled';
            NEW.retry_count = NEW.retry_count + 1;
            NEW.next_retry_at = NOW() + (INTERVAL '1 minute' * POWER(2, NEW.retry_count)); -- Exponential backoff
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- USER SESSION AND SECURITY TRIGGERS
-- =============================================

-- User session management trigger
CREATE OR REPLACE FUNCTION trigger_user_session_management() RETURNS TRIGGER AS $$
BEGIN
    -- Handle session creation
    IF TG_OP = 'INSERT' THEN
        -- Log session creation
        INSERT INTO auth_audit_logs (
            user_id,
            action_type,
            ip_address,
            user_agent,
            additional_data
        ) VALUES (
            NEW.user_id,
            'session_created',
            NEW.ip_address,
            NEW.user_agent,
            jsonb_build_object(
                'session_id', NEW.id,
                'expires_at', NEW.expires_at
            )
        );

        -- Update user last login
        UPDATE users 
        SET 
            last_login_at = NOW(),
            last_login_ip = NEW.ip_address,
            updated_at = NOW()
        WHERE id = NEW.user_id;

        RETURN NEW;
    END IF;

    -- Handle session updates
    IF TG_OP = 'UPDATE' THEN
        -- Log session deactivation
        IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
            INSERT INTO auth_audit_logs (
                user_id,
                action_type,
                ip_address,
                user_agent,
                additional_data
            ) VALUES (
                NEW.user_id,
                'session_deactivated',
                COALESCE(NEW.ip_address, OLD.ip_address),
                COALESCE(NEW.user_agent, OLD.user_agent),
                jsonb_build_object(
                    'session_id', NEW.id,
                    'deactivation_reason', COALESCE(current_setting('app.session_deactivation_reason', true), 'Manual')
                )
            );
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CACHE MANAGEMENT TRIGGERS
-- =============================================

-- Cache entry lifecycle trigger
CREATE OR REPLACE FUNCTION trigger_cache_entry_lifecycle() RETURNS TRIGGER AS $$
DECLARE
    cache_config RECORD;
BEGIN
    -- Get cache configuration
    SELECT * INTO cache_config 
    FROM cache_configurations 
    WHERE id = NEW.cache_configuration_id;

    -- Handle cache entry creation
    IF TG_OP = 'INSERT' THEN
        -- Set expiration if not provided
        IF NEW.expires_at IS NULL AND cache_config.default_ttl_seconds IS NOT NULL THEN
            NEW.expires_at = NOW() + (cache_config.default_ttl_seconds || ' seconds')::INTERVAL;
        END IF;

        -- Log cache entry creation for monitoring
        INSERT INTO cache_metrics (
            cache_configuration_id,
            current_entries,
            current_size_bytes,
            period_start,
            period_end
        ) VALUES (
            NEW.cache_configuration_id,
            (SELECT COUNT(*) FROM cache_entries WHERE cache_configuration_id = NEW.cache_configuration_id AND status = 'active'),
            (SELECT COALESCE(SUM(size_bytes), 0) FROM cache_entries WHERE cache_configuration_id = NEW.cache_configuration_id AND status = 'active'),
            NOW(),
            NOW()
        );

        RETURN NEW;
    END IF;

    -- Handle cache entry updates
    IF TG_OP = 'UPDATE' THEN
        -- Update access tracking
        IF NEW.status = 'active' AND OLD.last_accessed_at IS DISTINCT FROM NEW.last_accessed_at THEN
            NEW.access_count = OLD.access_count + 1;
            NEW.hit_count = OLD.hit_count + 1;
            NEW.last_hit_at = NOW();
        END IF;

        -- Handle expiration
        IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= NOW() AND NEW.status = 'active' THEN
            NEW.status = 'expired';
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- EVENT SOURCING TRIGGERS
-- =============================================

-- Event store sequence trigger
CREATE OR REPLACE FUNCTION trigger_event_store_sequence() RETURNS TRIGGER AS $$
DECLARE
    next_sequence BIGINT;
BEGIN
    -- Auto-generate sequence number if not provided
    IF NEW.sequence_number IS NULL THEN
        SELECT COALESCE(MAX(sequence_number), 0) + 1 
        INTO next_sequence
        FROM event_store 
        WHERE aggregate_id = NEW.aggregate_id;
        
        NEW.sequence_number = next_sequence;
    END IF;

    -- Auto-generate aggregate version if not provided
    IF NEW.aggregate_version IS NULL THEN
        NEW.aggregate_version = NEW.sequence_number;
    END IF;

    -- Log event creation
    INSERT INTO audit_logs (
        action_type,
        resource_type,
        resource_id,
        new_data,
        additional_data
    ) VALUES (
        'event_created',
        'event_store',
        NEW.event_id,
        to_jsonb(NEW),
        jsonb_build_object(
            'event_type', NEW.event_type,
            'aggregate_type', NEW.aggregate_type,
            'sequence_number', NEW.sequence_number
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DATA CONSISTENCY TRIGGERS
-- =============================================

-- Proxy pool membership consistency trigger
CREATE OR REPLACE FUNCTION trigger_proxy_pool_consistency() RETURNS TRIGGER AS $$
BEGIN
    -- Ensure only one active membership per proxy
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = TRUE) THEN
        -- Deactivate other memberships for this proxy
        UPDATE proxy_pool_memberships 
        SET 
            is_active = FALSE,
            updated_at = NOW()
        WHERE proxy_id = NEW.proxy_id 
        AND id != NEW.id 
        AND is_active = TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CREATE TRIGGERS ON TABLES
-- =============================================

-- Audit logging triggers for critical tables
CREATE TRIGGER trigger_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER trigger_audit_campaigns
    AFTER INSERT OR UPDATE OR DELETE ON lead_generation_campaigns
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER trigger_audit_domains
    AFTER INSERT OR UPDATE OR DELETE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER trigger_audit_jobs
    AFTER INSERT OR UPDATE OR DELETE ON campaign_jobs
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER trigger_audit_personas
    AFTER INSERT OR UPDATE OR DELETE ON personas
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER trigger_audit_proxies
    AFTER INSERT OR UPDATE OR DELETE ON proxies
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- Timestamp update triggers
CREATE TRIGGER trigger_timestamp_campaigns
    BEFORE UPDATE ON lead_generation_campaigns
    FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER trigger_timestamp_domains
    BEFORE UPDATE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER trigger_timestamp_jobs
    BEFORE UPDATE ON campaign_jobs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER trigger_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_update_timestamp();

-- Campaign state transition triggers
CREATE TRIGGER trigger_campaign_transitions
    BEFORE UPDATE ON lead_generation_campaigns
    FOR EACH ROW EXECUTE FUNCTION trigger_campaign_state_transition();

-- Domain validation triggers
CREATE TRIGGER trigger_domain_validation
    AFTER UPDATE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION trigger_domain_validation_update();

-- Job status triggers
CREATE TRIGGER trigger_job_status
    BEFORE UPDATE ON campaign_jobs
    FOR EACH ROW EXECUTE FUNCTION trigger_job_status_update();

-- User session triggers
CREATE TRIGGER trigger_session_management
    AFTER INSERT OR UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_user_session_management();

-- Cache entry triggers
CREATE TRIGGER trigger_cache_lifecycle
    BEFORE INSERT OR UPDATE ON cache_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_cache_entry_lifecycle();

-- Event store triggers
CREATE TRIGGER trigger_event_sequence
    BEFORE INSERT ON event_store
    FOR EACH ROW EXECUTE FUNCTION trigger_event_store_sequence();

-- Data consistency triggers
CREATE TRIGGER trigger_proxy_membership_consistency
    BEFORE INSERT OR UPDATE ON proxy_pool_memberships
    FOR EACH ROW EXECUTE FUNCTION trigger_proxy_pool_consistency();

-- =============================================
-- TRIGGER MANAGEMENT AND MONITORING
-- =============================================

-- Function to enable/disable triggers
CREATE OR REPLACE FUNCTION manage_triggers(action VARCHAR, table_name VARCHAR DEFAULT NULL) 
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    trigger_rec RECORD;
BEGIN
    IF action NOT IN ('enable', 'disable') THEN
        RAISE EXCEPTION 'Action must be either enable or disable';
    END IF;

    FOR trigger_rec IN
        SELECT n.nspname as schemaname, c.relname as tablename, t.tgname as triggername
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND (table_name IS NULL OR c.relname = table_name)
        AND t.tgname LIKE 'trigger_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I %s TRIGGER %I', 
                      trigger_rec.schemaname, 
                      trigger_rec.tablename, 
                      UPPER(action), 
                      trigger_rec.triggername);
        
        result := result || format('%s trigger %s on %s.%s\n', 
                                  INITCAP(action || 'd'), 
                                  trigger_rec.triggername, 
                                  trigger_rec.schemaname, 
                                  trigger_rec.tablename);
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger monitoring view
CREATE OR REPLACE VIEW trigger_monitoring AS
SELECT
    n.nspname as schemaname,
    c.relname as tablename,
    t.tgname as triggername,
    t.tgenabled,
    t.tgtype,
    t.tgfoid::regproc as trigger_function
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY c.relname, t.tgname;

COMMENT ON VIEW trigger_monitoring IS 
'Monitor trigger status and configuration across all tables';

-- =============================================
-- TRIGGER PERFORMANCE OPTIMIZATION
-- =============================================

-- Function to analyze trigger performance
CREATE OR REPLACE FUNCTION analyze_trigger_performance() 
RETURNS TABLE(
    table_name TEXT,
    trigger_name TEXT,
    avg_execution_time_ms NUMERIC,
    total_executions BIGINT
) AS $$
BEGIN
    -- This is a placeholder for trigger performance analysis
    -- In a real implementation, this would analyze pg_stat_user_tables
    -- and custom performance metrics
    
    RETURN QUERY
    SELECT 
        'placeholder'::TEXT,
        'placeholder'::TEXT,
        0::NUMERIC,
        0::BIGINT
    WHERE FALSE; -- Return empty result set for now
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION analyze_trigger_performance() IS 
'Analyze trigger execution performance - placeholder for monitoring implementation';