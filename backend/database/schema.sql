--
-- PostgreSQL database dump
--

\restrict 5H5yiCInLaHIJNjoHk4YdlKPtxe0L5boHpWxjwb2Pp0jlHckMBcYVUN7cbMYUnf

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: access_grant_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.access_grant_type_enum AS ENUM (
    'read',
    'write',
    'delete',
    'admin',
    'owner',
    'viewer',
    'collaborator',
    'manager'
);


--
-- Name: authorization_decision_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.authorization_decision_enum AS ENUM (
    'allow',
    'deny',
    'conditional_allow'
);


--
-- Name: authorization_resource_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.authorization_resource_type_enum AS ENUM (
    'campaign',
    'domain',
    'persona',
    'proxy',
    'proxy_pool',
    'keyword_set',
    'audit_log',
    'user_management',
    'system_settings',
    'performance_metrics',
    'security_events',
    'api_access',
    'data_export',
    'admin_panel'
);


--
-- Name: cache_entry_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cache_entry_status_enum AS ENUM (
    'active',
    'expired',
    'invalidated',
    'evicted',
    'locked',
    'warming'
);


--
-- Name: cache_invalidation_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cache_invalidation_type_enum AS ENUM (
    'manual',
    'ttl_expired',
    'dependency_changed',
    'memory_pressure',
    'pattern_match',
    'tag_based',
    'cascade',
    'scheduled',
    'event_triggered',
    'size_limit_exceeded'
);


--
-- Name: cache_strategy_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cache_strategy_enum AS ENUM (
    'lru',
    'lfu',
    'fifo',
    'lifo',
    'ttl',
    'write_through',
    'write_back',
    'write_around'
);


--
-- Name: cache_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cache_type_enum AS ENUM (
    'redis',
    'memcached',
    'in_memory',
    'database',
    'file_system',
    'distributed'
);


--
-- Name: campaign_job_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_job_status_enum AS ENUM (
    'pending',
    'queued',
    'running',
    'completed',
    'failed',
    'cancelled'
);


--
-- Name: campaign_mode_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_mode_enum AS ENUM (
    'full_sequence',
    'step_by_step'
);


--
-- Name: campaign_state_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_state_enum AS ENUM (
    'draft',
    'running',
    'paused',
    'completed',
    'failed',
    'cancelled',
    'archived'
);


--
-- Name: communication_protocol_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.communication_protocol_enum AS ENUM (
    'http',
    'https',
    'grpc',
    'websocket',
    'tcp',
    'udp',
    'message_queue',
    'database',
    'file_system',
    'redis',
    'sql'
);


--
-- Name: config_lock_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.config_lock_type_enum AS ENUM (
    'read_lock',
    'write_lock',
    'exclusive_lock',
    'shared_lock'
);


--
-- Name: dependency_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dependency_type_enum AS ENUM (
    'synchronous',
    'asynchronous',
    'database',
    'cache',
    'queue',
    'http_api',
    'grpc',
    'websocket',
    'file_system',
    'external_api',
    'third_party_service'
);


--
-- Name: domain_dns_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.domain_dns_status_enum AS ENUM (
    'pending',
    'ok',
    'error',
    'timeout'
);


--
-- Name: domain_http_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.domain_http_status_enum AS ENUM (
    'pending',
    'ok',
    'error',
    'timeout'
);


--
-- Name: domain_lead_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.domain_lead_status_enum AS ENUM (
    'pending',
    'match',
    'no_match',
    'error',
    'timeout'
);


--
-- Name: domain_pattern_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.domain_pattern_type_enum AS ENUM (
    'prefix_variable',
    'suffix_variable',
    'both_variable'
);


--
-- Name: event_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type_enum AS ENUM (
    'campaign_created',
    'campaign_updated',
    'campaign_deleted',
    'campaign_started',
    'campaign_paused',
    'campaign_resumed',
    'campaign_completed',
    'campaign_failed',
    'phase_started',
    'phase_completed',
    'phase_failed',
    'domain_generated',
    'domain_validated',
    'domain_failed_validation',
    'dns_validation_started',
    'dns_validation_completed',
    'dns_validation_failed',
    'http_validation_started',
    'http_validation_completed',
    'http_validation_failed',
    'keyword_validation_started',
    'keyword_validation_completed',
    'keyword_validation_failed',
    'job_created',
    'job_started',
    'job_completed',
    'job_failed',
    'job_retried',
    'user_created',
    'user_updated',
    'user_login',
    'user_logout',
    'session_created',
    'session_expired',
    'proxy_assigned',
    'proxy_released',
    'proxy_failed',
    'persona_assigned',
    'persona_released',
    'config_updated',
    'config_locked',
    'config_unlocked',
    'audit_event',
    'security_event',
    'performance_alert',
    'capacity_alert',
    'system_alert'
);


--
-- Name: execution_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.execution_status_enum AS ENUM (
    'not_started',
    'ready',
    'configured',
    'in_progress',
    'paused',
    'completed',
    'failed'
);


--
-- Name: extraction_processing_state_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.extraction_processing_state_enum AS ENUM (
    'pending',
    'building',
    'ready',
    'error',
    'stale'
);


--
-- Name: TYPE extraction_processing_state_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.extraction_processing_state_enum IS 'Lifecycle state for extraction feature row (pending|building|ready|error|stale)';


--
-- Name: job_business_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_business_status_enum AS ENUM (
    'processing',
    'retry',
    'priority_queued',
    'batch_optimized'
);


--
-- Name: job_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_type_enum AS ENUM (
    'generation',
    'dns_validation',
    'http_keyword_validation',
    'enrichment',
    'analysis'
);


--
-- Name: keyword_rule_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.keyword_rule_type_enum AS ENUM (
    'string',
    'regex'
);


--
-- Name: persona_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.persona_status_enum AS ENUM (
    'Active',
    'Disabled',
    'Testing',
    'Failed'
);


--
-- Name: persona_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.persona_type_enum AS ENUM (
    'dns',
    'http'
);


--
-- Name: phase_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.phase_status_enum AS ENUM (
    'not_started',
    'ready',
    'configured',
    'in_progress',
    'paused',
    'completed',
    'failed'
);


--
-- Name: phase_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.phase_type_enum AS ENUM (
    'domain_generation',
    'dns_validation',
    'http_keyword_validation',
    'enrichment',
    'analysis'
);


--
-- Name: projection_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.projection_status_enum AS ENUM (
    'building',
    'current',
    'stale',
    'failed',
    'rebuilding'
);


--
-- Name: proxy_protocol_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proxy_protocol_enum AS ENUM (
    'http',
    'https',
    'socks5',
    'socks4'
);


--
-- Name: proxy_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proxy_status_enum AS ENUM (
    'Active',
    'Disabled',
    'Testing',
    'Failed'
);


--
-- Name: refactor_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.refactor_type_enum AS ENUM (
    'service_split',
    'service_merge',
    'api_versioning',
    'database_migration',
    'dependency_injection',
    'interface_change',
    'data_structure_change',
    'performance_optimization',
    'security_enhancement',
    'monitoring_improvement',
    'configuration_change',
    'deployment_strategy',
    'scaling_modification'
);


--
-- Name: security_event_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.security_event_type_enum AS ENUM (
    'login_attempt',
    'login_success',
    'login_failure',
    'logout',
    'password_change',
    'password_reset_request',
    'password_reset_complete',
    'account_locked',
    'account_unlocked',
    'session_timeout',
    'session_hijack_attempt',
    'unauthorized_access_attempt',
    'privilege_escalation_attempt',
    'data_access_violation',
    'campaign_access_denied',
    'api_key_created',
    'api_key_revoked',
    'suspicious_activity',
    'brute_force_detected',
    'rate_limit_exceeded',
    'invalid_token',
    'token_expired',
    'mfa_enabled',
    'mfa_disabled',
    'mfa_challenge_failed',
    'mfa_challenge_success',
    'security_policy_violation',
    'admin_action_performed',
    'data_export_request',
    'data_deletion_request',
    'compliance_audit_triggered'
);


--
-- Name: service_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_type_enum AS ENUM (
    'api_server',
    'web_server',
    'background_worker',
    'database',
    'cache',
    'message_queue',
    'load_balancer',
    'proxy',
    'auth_service',
    'monitoring',
    'logging',
    'file_storage',
    'cdn',
    'notification_service',
    'analytics_service'
);


--
-- Name: validation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validation_status_enum AS ENUM (
    'pending',
    'valid',
    'invalid',
    'error',
    'skipped'
);


--
-- Name: advance_campaign_phase(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.advance_campaign_phase(p_campaign_id uuid, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: FUNCTION advance_campaign_phase(p_campaign_id uuid, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.advance_campaign_phase(p_campaign_id uuid, p_user_id uuid) IS 'Fixed to use triggered_by and operation_context columns instead of user_id only';


--
-- Name: advance_campaign_phase(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.advance_campaign_phase(p_campaign_id uuid, p_user_id uuid, p_completion_threshold numeric DEFAULT 95.0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: analyze_trigger_performance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analyze_trigger_performance() RETURNS TABLE(table_name text, trigger_name text, avg_execution_time_ms numeric, total_executions bigint)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: FUNCTION analyze_trigger_performance(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.analyze_trigger_performance() IS 'Analyze trigger execution performance - placeholder for monitoring implementation';


--
-- Name: batch_update_domain_validation(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.batch_update_domain_validation(p_campaign_id uuid, p_domain_updates jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: campaign_domain_counters_upsert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.campaign_domain_counters_upsert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_exists BOOLEAN;
    d_total_delta INT := 0;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Ensure row exists
        INSERT INTO campaign_domain_counters (campaign_id, total_domains)
            VALUES (NEW.campaign_id, 0)
            ON CONFLICT (campaign_id) DO NOTHING;
        -- Total always increments on insert
        UPDATE campaign_domain_counters
           SET total_domains = total_domains + 1,
               dns_pending = dns_pending + CASE WHEN NEW.dns_status = 'pending' THEN 1 ELSE 0 END,
               dns_ok = dns_ok + CASE WHEN NEW.dns_status = 'ok' THEN 1 ELSE 0 END,
               dns_error = dns_error + CASE WHEN NEW.dns_status = 'error' THEN 1 ELSE 0 END,
               dns_timeout = dns_timeout + CASE WHEN NEW.dns_status = 'timeout' THEN 1 ELSE 0 END,
               http_pending = http_pending + CASE WHEN NEW.http_status = 'pending' THEN 1 ELSE 0 END,
               http_ok = http_ok + CASE WHEN NEW.http_status = 'ok' THEN 1 ELSE 0 END,
               http_error = http_error + CASE WHEN NEW.http_status = 'error' THEN 1 ELSE 0 END,
               http_timeout = http_timeout + CASE WHEN NEW.http_status = 'timeout' THEN 1 ELSE 0 END,
               lead_pending = lead_pending + CASE WHEN NEW.lead_status = 'pending' THEN 1 ELSE 0 END,
               lead_match = lead_match + CASE WHEN NEW.lead_status = 'match' THEN 1 ELSE 0 END,
               lead_no_match = lead_no_match + CASE WHEN NEW.lead_status = 'no_match' THEN 1 ELSE 0 END,
               lead_error = lead_error + CASE WHEN NEW.lead_status = 'error' THEN 1 ELSE 0 END,
               lead_timeout = lead_timeout + CASE WHEN NEW.lead_status = 'timeout' THEN 1 ELSE 0 END,
               updated_at = NOW()
         WHERE campaign_id = NEW.campaign_id;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only adjust when status fields change
        IF (NEW.dns_status IS DISTINCT FROM OLD.dns_status) OR (NEW.http_status IS DISTINCT FROM OLD.http_status) OR (NEW.lead_status IS DISTINCT FROM OLD.lead_status) THEN
            UPDATE campaign_domain_counters SET
                dns_pending = dns_pending + CASE WHEN NEW.dns_status = 'pending' THEN 1 ELSE 0 END - CASE WHEN OLD.dns_status = 'pending' THEN 1 ELSE 0 END,
                dns_ok = dns_ok + CASE WHEN NEW.dns_status = 'ok' THEN 1 ELSE 0 END - CASE WHEN OLD.dns_status = 'ok' THEN 1 ELSE 0 END,
                dns_error = dns_error + CASE WHEN NEW.dns_status = 'error' THEN 1 ELSE 0 END - CASE WHEN OLD.dns_status = 'error' THEN 1 ELSE 0 END,
                dns_timeout = dns_timeout + CASE WHEN NEW.dns_status = 'timeout' THEN 1 ELSE 0 END - CASE WHEN OLD.dns_status = 'timeout' THEN 1 ELSE 0 END,
                http_pending = http_pending + CASE WHEN NEW.http_status = 'pending' THEN 1 ELSE 0 END - CASE WHEN OLD.http_status = 'pending' THEN 1 ELSE 0 END,
                http_ok = http_ok + CASE WHEN NEW.http_status = 'ok' THEN 1 ELSE 0 END - CASE WHEN OLD.http_status = 'ok' THEN 1 ELSE 0 END,
                http_error = http_error + CASE WHEN NEW.http_status = 'error' THEN 1 ELSE 0 END - CASE WHEN OLD.http_status = 'error' THEN 1 ELSE 0 END,
                http_timeout = http_timeout + CASE WHEN NEW.http_status = 'timeout' THEN 1 ELSE 0 END - CASE WHEN OLD.http_status = 'timeout' THEN 1 ELSE 0 END,
                lead_pending = lead_pending + CASE WHEN NEW.lead_status = 'pending' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'pending' THEN 1 ELSE 0 END,
                lead_match = lead_match + CASE WHEN NEW.lead_status = 'match' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'match' THEN 1 ELSE 0 END,
                lead_no_match = lead_no_match + CASE WHEN NEW.lead_status = 'no_match' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'no_match' THEN 1 ELSE 0 END,
                lead_error = lead_error + CASE WHEN NEW.lead_status = 'error' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'error' THEN 1 ELSE 0 END,
                lead_timeout = lead_timeout + CASE WHEN NEW.lead_status = 'timeout' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'timeout' THEN 1 ELSE 0 END,
                updated_at = NOW()
            WHERE campaign_id = NEW.campaign_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Adjust counts downward (rare path; if deletions introduced later)
        UPDATE campaign_domain_counters SET
            total_domains = total_domains - 1,
            dns_pending = dns_pending - CASE WHEN OLD.dns_status = 'pending' THEN 1 ELSE 0 END,
            dns_ok = dns_ok - CASE WHEN OLD.dns_status = 'ok' THEN 1 ELSE 0 END,
            dns_error = dns_error - CASE WHEN OLD.dns_status = 'error' THEN 1 ELSE 0 END,
            dns_timeout = dns_timeout - CASE WHEN OLD.dns_status = 'timeout' THEN 1 ELSE 0 END,
            http_pending = http_pending - CASE WHEN OLD.http_status = 'pending' THEN 1 ELSE 0 END,
            http_ok = http_ok - CASE WHEN OLD.http_status = 'ok' THEN 1 ELSE 0 END,
            http_error = http_error - CASE WHEN OLD.http_status = 'error' THEN 1 ELSE 0 END,
            http_timeout = http_timeout - CASE WHEN OLD.http_status = 'timeout' THEN 1 ELSE 0 END,
            lead_pending = lead_pending - CASE WHEN OLD.lead_status = 'pending' THEN 1 ELSE 0 END,
            lead_match = lead_match - CASE WHEN OLD.lead_status = 'match' THEN 1 ELSE 0 END,
            lead_no_match = lead_no_match - CASE WHEN OLD.lead_status = 'no_match' THEN 1 ELSE 0 END,
            lead_error = lead_error - CASE WHEN OLD.lead_status = 'error' THEN 1 ELSE 0 END,
            lead_timeout = lead_timeout - CASE WHEN OLD.lead_status = 'timeout' THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE campaign_id = OLD.campaign_id;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: check_phase_completion(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_phase_completion(p_campaign_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: cleanup_audit_logs_by_retention(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_audit_logs_by_retention() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER := 0;
BEGIN
    -- Delete records older than their retention policy allows
    -- This is a basic implementation - real retention policies would be more complex
    
    -- Delete public data older than 3 years
    DELETE FROM audit_logs
    WHERE data_classification = 'public'
      AND timestamp < (NOW() - INTERVAL '3 years');
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Delete internal data older than 5 years
    DELETE FROM audit_logs
    WHERE data_classification = 'internal'
      AND timestamp < (NOW() - INTERVAL '5 years');
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Delete confidential data older than 7 years
    DELETE FROM audit_logs
    WHERE data_classification = 'confidential'
      AND timestamp < (NOW() - INTERVAL '7 years');
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Delete records without classification older than 1 year
    DELETE FROM audit_logs
    WHERE data_classification IS NULL
      AND timestamp < (NOW() - INTERVAL '1 year');
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_jobs(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_jobs(p_retention_days integer DEFAULT 90, p_batch_size integer DEFAULT 1000) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: complete_campaign_phase(uuid, public.phase_type_enum); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_campaign_phase(campaign_uuid uuid, phase_name public.phase_type_enum) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update the specific phase to 'completed' status
    UPDATE campaign_phases 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE campaign_id = campaign_uuid 
    AND phase_type = phase_name;
    
    -- The trigger will automatically sync the campaign
    RAISE NOTICE 'Phase % completed for campaign %', phase_name, campaign_uuid;
END;
$$;


--
-- Name: complete_job(uuid, boolean, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_job(p_job_id uuid, p_success boolean, p_result_data jsonb DEFAULT NULL::jsonb, p_error_message text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: create_phase_jobs(uuid, public.phase_type_enum, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_phase_jobs(p_campaign_id uuid, p_phase_type public.phase_type_enum, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: fail_campaign_phase(uuid, public.phase_type_enum, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fail_campaign_phase(campaign_uuid uuid, phase_name public.phase_type_enum, error_msg text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update the specific phase to 'failed' status
    UPDATE campaign_phases 
    SET 
        status = 'failed',
        failed_at = NOW(),
        error_message = error_msg,
        updated_at = NOW()
    WHERE campaign_id = campaign_uuid 
    AND phase_type = phase_name;
    
    -- The trigger will automatically sync the campaign
    RAISE NOTICE 'Phase % failed for campaign %: %', phase_name, campaign_uuid, error_msg;
END;
$$;


--
-- Name: generate_campaign_analytics(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_campaign_analytics(p_campaign_id uuid, p_include_details boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: generate_campaign_analytics(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_campaign_analytics(p_job_id uuid, p_success boolean, p_error_message text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: FUNCTION generate_campaign_analytics(p_job_id uuid, p_success boolean, p_error_message text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_campaign_analytics(p_job_id uuid, p_success boolean, p_error_message text) IS 'Fixed to use triggered_by and operation_context columns instead of user_id only';


--
-- Name: manage_triggers(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.manage_triggers(action character varying, table_name character varying DEFAULT NULL::character varying) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: process_job_queue(character varying, text[], integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_job_queue(p_processing_server_id character varying, p_job_types text[] DEFAULT NULL::text[], p_max_jobs integer DEFAULT 10) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: reset_phase_for_retry(uuid, public.phase_type_enum); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_phase_for_retry(campaign_uuid uuid, phase_name public.phase_type_enum) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Reset the specific phase to 'ready' status for retry
    UPDATE campaign_phases 
    SET 
        status = 'ready',
        started_at = NULL,
        completed_at = NULL,
        failed_at = NULL,
        error_message = NULL,
        progress_percentage = NULL,
        processed_items = NULL,
        successful_items = NULL,
        failed_items = NULL
    WHERE campaign_id = campaign_uuid 
    AND phase_type = phase_name;
    
    -- The trigger will automatically sync the campaign
    RAISE NOTICE 'Phase % reset for retry in campaign %', phase_name, campaign_uuid;
END;
$$;


--
-- Name: setup_campaign_phases(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.setup_campaign_phases(p_campaign_id uuid, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    phases phase_type_enum[] := ARRAY['domain_generation', 'dns_validation', 'http_keyword_validation', 'enrichment', 'analysis'];
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
            CASE WHEN phase_order = 1 THEN 'in_progress' ELSE 'not_started' END,
            p_user_id
        );

        created_phases := created_phases || jsonb_build_object(
            'phase_type', phase_type,
            'phase_order', phase_order,
            'status', CASE WHEN phase_order = 1 THEN 'in_progress' ELSE 'not_started' END
        );

        phase_order := phase_order + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'phases_created', created_phases,
        'total_phases', array_length(phases, 1)
    );
END;
$$;


--
-- Name: start_campaign(uuid, uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_campaign(p_campaign_id uuid, p_user_id uuid, p_async boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: FUNCTION start_campaign(p_campaign_id uuid, p_user_id uuid, p_async boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.start_campaign(p_campaign_id uuid, p_user_id uuid, p_async boolean) IS 'Fixed to use triggered_by and operation_context columns instead of user_id only';


--
-- Name: start_campaign_phase(uuid, public.phase_type_enum); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_campaign_phase(campaign_uuid uuid, phase_name public.phase_type_enum) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update the specific phase to 'in_progress' status
    UPDATE campaign_phases 
    SET 
        status = 'in_progress',
        started_at = NOW(),
        updated_at = NOW()
    WHERE campaign_id = campaign_uuid 
    AND phase_type = phase_name;
    
    -- The trigger will automatically sync the campaign
    RAISE NOTICE 'Phase % started for campaign %', phase_name, campaign_uuid;
END;
$$;


--
-- Name: sync_campaign_from_phases(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_campaign_from_phases(campaign_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    computed_current_phase phase_type_enum;
    computed_phase_status phase_status_enum;
    completed_count INTEGER;
    current_campaign_phase phase_type_enum;
    current_campaign_status phase_status_enum;
BEGIN
    -- Get current campaign values to check if sync is actually needed
    SELECT current_phase, phase_status INTO current_campaign_phase, current_campaign_status
    FROM lead_generation_campaigns 
    WHERE id = campaign_uuid;
    
    -- BUSINESS LOGIC: Derive current phase and status from campaign_phases table
    -- Priority 1: Find any in_progress or failed phase (that's the active one)
    SELECT phase_type, status INTO computed_current_phase, computed_phase_status
    FROM campaign_phases 
    WHERE campaign_id = campaign_uuid 
    AND status IN ('in_progress', 'failed')
    ORDER BY phase_order
    LIMIT 1;
    
    -- Priority 2: If no active phase, find first non-completed phase (ready to start)
    IF computed_current_phase IS NULL THEN
        SELECT phase_type, status INTO computed_current_phase, computed_phase_status
        FROM campaign_phases 
        WHERE campaign_id = campaign_uuid 
        AND status != 'completed'
        ORDER BY phase_order
        LIMIT 1;
    END IF;
    
    -- Priority 3: If all phases completed, use the last phase
    IF computed_current_phase IS NULL THEN
        SELECT phase_type, status INTO computed_current_phase, computed_phase_status
        FROM campaign_phases 
        WHERE campaign_id = campaign_uuid 
        ORDER BY phase_order DESC
        LIMIT 1;
    END IF;
    
    -- Count completed phases for progress tracking
    SELECT COUNT(*) INTO completed_count
    FROM campaign_phases 
    WHERE campaign_id = campaign_uuid 
    AND status = 'completed';
    
    -- Only update if values have actually changed (prevent unnecessary updates)
    IF computed_current_phase IS DISTINCT FROM current_campaign_phase OR 
       computed_phase_status IS DISTINCT FROM current_campaign_status THEN
        
        -- Update campaign with computed values (derived from phases)
        UPDATE lead_generation_campaigns 
        SET 
            current_phase = computed_current_phase,
            phase_status = computed_phase_status,
            completed_phases = completed_count,
            updated_at = NOW()
        WHERE id = campaign_uuid;
        
        -- Log the sync operation
        RAISE NOTICE 'Campaign % synced: % -> %, % -> %, completed_phases=%', 
            campaign_uuid, 
            current_campaign_phase, computed_current_phase,
            current_campaign_status, computed_phase_status, 
            completed_count;
    END IF;
END;
$$;


--
-- Name: trigger_audit_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_audit_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    audit_data JSONB;
    old_data JSONB;
    new_data JSONB;
    audit_action VARCHAR(10);
    resource_id UUID;
    user_id_val UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        audit_action := 'DELETE';
        audit_data := to_jsonb(OLD);
        old_data := to_jsonb(OLD);
        new_data := NULL;
        IF OLD ? 'id' THEN
            resource_id := (OLD.id)::UUID;
        END IF;
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
                SELECT jsonb_object_agg(OLD_json.key, jsonb_build_object('old', OLD_json.value, 'new', NEW_json.value))
                FROM jsonb_each(to_jsonb(OLD)) AS OLD_json(key, value)
                JOIN jsonb_each(to_jsonb(NEW)) AS NEW_json(key, value) ON OLD_json.key = NEW_json.key
                WHERE OLD_json.value IS DISTINCT FROM NEW_json.value
            )
        );
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        resource_id := (NEW.id)::UUID;
        IF to_jsonb(NEW) ? 'user_id' THEN
            user_id_val := (NEW.user_id)::UUID;
        ELSIF to_jsonb(NEW) ? 'created_by' THEN
            user_id_val := (NEW.created_by)::UUID;
        ELSIF to_jsonb(NEW) ? 'updated_by' THEN
            user_id_val := (NEW.updated_by)::UUID;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        audit_action := 'INSERT';
        audit_data := to_jsonb(NEW);
        old_data := NULL;
        new_data := to_jsonb(NEW);
        resource_id := (NEW.id)::UUID;
        IF to_jsonb(NEW) ? 'user_id' THEN
            user_id_val := (NEW.user_id)::UUID;
        ELSIF to_jsonb(NEW) ? 'created_by' THEN
            user_id_val := (NEW.created_by)::UUID;
        END IF;
    END IF;

    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        client_ip,
        user_agent
    ) VALUES (
        user_id_val,
        audit_action,
        TG_TABLE_NAME,
        resource_id,
        audit_data,
        COALESCE(current_setting('app.current_ip', true), '127.0.0.1')::INET,
        current_setting('app.current_user_agent', true)
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


--
-- Name: trigger_cache_entry_lifecycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_cache_entry_lifecycle() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: trigger_domain_validation_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_domain_validation_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_campaign_id UUID := NEW.campaign_id;
    -- DNS stats
    dns_total INT; dns_completed INT; dns_ok INT; dns_error INT; dns_timeout INT;
    -- HTTP stats
    http_total INT; http_completed INT; http_ok INT; http_error INT; http_timeout INT;
    v_current_phase phase_type_enum;
    advance_to phase_type_enum;
    v_progress NUMERIC(5,2);
    v_total INT; v_processed INT; v_success INT; v_failed INT;
BEGIN
    -- Only act when relevant status columns changed
    IF (OLD.dns_status IS DISTINCT FROM NEW.dns_status) OR (OLD.http_status IS DISTINCT FROM NEW.http_status) THEN
        -- Aggregate DNS
        SELECT COUNT(*),
               COUNT(*) FILTER (WHERE dns_status <> 'pending'),
               COUNT(*) FILTER (WHERE dns_status = 'ok'),
               COUNT(*) FILTER (WHERE dns_status = 'error'),
               COUNT(*) FILTER (WHERE dns_status = 'timeout')
          INTO dns_total, dns_completed, dns_ok, dns_error, dns_timeout
          FROM generated_domains WHERE campaign_id = v_campaign_id;

        -- Aggregate HTTP
        SELECT COUNT(*),
               COUNT(*) FILTER (WHERE http_status <> 'pending'),
               COUNT(*) FILTER (WHERE http_status = 'ok'),
               COUNT(*) FILTER (WHERE http_status = 'error'),
               COUNT(*) FILTER (WHERE http_status = 'timeout')
          INTO http_total, http_completed, http_ok, http_error, http_timeout
          FROM generated_domains WHERE campaign_id = v_campaign_id;

        -- Lock + read current phase
        SELECT current_phase INTO v_current_phase FROM lead_generation_campaigns WHERE id = v_campaign_id FOR UPDATE;

        advance_to := NULL;

        -- Compute metrics based on current phase
        IF v_current_phase = 'dns_validation' THEN
            v_total := dns_total;
            v_processed := dns_completed;
            v_success := dns_ok;
            v_failed := dns_error + dns_timeout;
            IF dns_total > 0 THEN
                v_progress := (dns_completed::NUMERIC / dns_total) * 100;
            ELSE
                v_progress := 0;
            END IF;
            IF dns_total > 0 AND dns_completed = dns_total THEN
                advance_to := 'http_keyword_validation';
            END IF;
        ELSIF v_current_phase = 'http_keyword_validation' THEN
            v_total := http_total;
            v_processed := http_completed;
            v_success := http_ok;
            v_failed := http_error + http_timeout;
            IF http_total > 0 THEN
                v_progress := (http_completed::NUMERIC / http_total) * 100;
            ELSE
                v_progress := 0;
            END IF;
            IF http_total > 0 AND http_completed = http_total THEN
                advance_to := 'analysis';
            END IF;
        ELSE
            -- For other phases (domain_generation, analysis) we don't update metrics here
            v_total := NULL; v_processed := NULL; v_success := NULL; v_failed := NULL; v_progress := NULL;
        END IF;

        UPDATE lead_generation_campaigns lgc
           SET current_phase = COALESCE(advance_to, lgc.current_phase),
               total_items = COALESCE(v_total, lgc.total_items),
               processed_items = COALESCE(v_processed, lgc.processed_items),
               successful_items = COALESCE(v_success, lgc.successful_items),
               failed_items = COALESCE(v_failed, lgc.failed_items),
               progress_percentage = COALESCE(v_progress, lgc.progress_percentage),
               updated_at = NOW()
         WHERE lgc.id = v_campaign_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trigger_event_store_sequence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_event_store_sequence() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: trigger_job_status_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_job_status_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: trigger_proxy_pool_consistency(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_proxy_pool_consistency() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: trigger_sync_campaign_from_phases(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_sync_campaign_from_phases() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Sync the campaign whenever a phase status changes
    PERFORM sync_campaign_from_phases(NEW.campaign_id);
    RETURN NEW;
END;
$$;


--
-- Name: trigger_update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: trigger_user_session_management(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_user_session_management() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Handle session creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO auth_audit_logs (
            user_id,
            event_type,
            event_status,
            action_type,
            ip_address,
            user_agent,
            additional_data
        ) VALUES (
            NEW.user_id,
            'session',            -- normalized event category
            'success',            -- status of the session creation
            'session_created',    -- action label
            NEW.ip_address,
            NEW.user_agent,
            jsonb_build_object(
                'session_id', NEW.id,
                'expires_at', NEW.expires_at
            )
        );

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
        IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
            INSERT INTO auth_audit_logs (
                user_id,
                event_type,
                event_status,
                action_type,
                ip_address,
                user_agent,
                additional_data
            ) VALUES (
                NEW.user_id,
                'session',
                'success',
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
$$;


--
-- Name: update_domain_extracted_keywords_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_domain_extracted_keywords_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_domain_extraction_features_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_domain_extraction_features_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_keyword_set_rules_jsonb(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_keyword_set_rules_jsonb() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Update the keyword_sets.rules JSONB column with current rules
    UPDATE keyword_sets 
    SET rules = (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', kr.id,
                'pattern', kr.pattern,
                'ruleType', kr.rule_type,
                'isCaseSensitive', kr.is_case_sensitive,
                'category', kr.category,
                'contextChars', kr.context_chars,
                'createdAt', kr.created_at,
                'updatedAt', kr.updated_at
            )
        ), '[]'::jsonb)
        FROM keyword_rules kr 
        WHERE kr.keyword_set_id = COALESCE(NEW.keyword_set_id, OLD.keyword_set_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.keyword_set_id, OLD.keyword_set_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: FUNCTION update_keyword_set_rules_jsonb(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_keyword_set_rules_jsonb() IS 'Automatically syncs keyword_rules table changes to keyword_sets.rules JSONB for high-performance scanning';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    ip_address inet,
    user_agent text,
    user_agent_hash character varying(64),
    session_fingerprint character varying(64),
    browser_fingerprint character varying(64),
    screen_resolution character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: VIEW; Schema: auth; Owner: -
--

CREATE VIEW auth.sessions AS
 SELECT id,
    user_id,
    ip_address,
    user_agent,
    user_agent_hash,
    session_fingerprint,
    browser_fingerprint,
    screen_resolution,
    is_active,
    expires_at,
    last_activity_at,
    created_at
   FROM public.sessions;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_token character varying(255),
    email_verification_expires_at timestamp with time zone,
    password_hash text NOT NULL,
    password_pepper_version integer DEFAULT 1 NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    last_login_ip inet,
    password_changed_at timestamp with time zone DEFAULT now() NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_secret_encrypted bytea,
    mfa_backup_codes_encrypted bytea,
    mfa_last_used_at timestamp with time zone,
    encrypted_fields jsonb,
    security_questions_encrypted bytea,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: VIEW; Schema: auth; Owner: -
--

CREATE VIEW auth.users AS
 SELECT id,
    email,
    email_verified,
    email_verification_token,
    email_verification_expires_at,
    password_hash,
    password_pepper_version,
    first_name,
    last_name,
    avatar_url,
    is_active,
    is_locked,
    failed_login_attempts,
    locked_until,
    last_login_at,
    last_login_ip,
    password_changed_at,
    must_change_password,
    mfa_enabled,
    mfa_secret_encrypted,
    mfa_backup_codes_encrypted,
    mfa_last_used_at,
    encrypted_fields,
    security_questions_encrypted,
    created_at,
    updated_at
   FROM public.users;


--
-- Name: domain_extraction_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_extraction_features (
    campaign_id uuid NOT NULL,
    domain_id uuid NOT NULL,
    domain_name text,
    processing_state public.extraction_processing_state_enum DEFAULT 'pending'::public.extraction_processing_state_enum NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    http_status text,
    http_status_code integer,
    fetch_time_ms integer,
    content_hash text,
    content_bytes integer,
    page_lang text,
    kw_unique_count integer,
    kw_total_occurrences integer,
    kw_weight_sum double precision,
    kw_top3 jsonb,
    kw_signal_distribution jsonb,
    microcrawl_enabled boolean,
    microcrawl_pages integer,
    microcrawl_base_kw_count integer,
    microcrawl_added_kw_count integer,
    microcrawl_gain_ratio double precision,
    diminishing_returns boolean,
    is_parked boolean,
    parked_confidence double precision,
    content_richness_score double precision,
    page_archetype text,
    crawl_strategy text,
    feature_vector jsonb,
    extraction_version integer DEFAULT 1 NOT NULL,
    keyword_dictionary_version integer DEFAULT 1 NOT NULL,
    scoring_profile_snapshot_id uuid,
    analysis_version integer,
    is_stale_score boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE domain_extraction_features; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.domain_extraction_features IS 'Canonical extraction feature rows (campaign,domain) with enrichment & scoring attributes';


--
-- Name: generated_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    domain_name character varying(255) NOT NULL,
    offset_index bigint NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    source_keyword character varying(255),
    source_pattern character varying(255),
    tld character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dns_status public.domain_dns_status_enum DEFAULT 'pending'::public.domain_dns_status_enum,
    dns_ip inet,
    http_status public.domain_http_status_enum DEFAULT 'pending'::public.domain_http_status_enum,
    http_status_code integer,
    http_title text,
    http_keywords text,
    lead_status public.domain_lead_status_enum DEFAULT 'pending'::public.domain_lead_status_enum,
    lead_score numeric(5,2) DEFAULT 0.0,
    last_validated_at timestamp with time zone,
    dns_reason text,
    http_reason text,
    relevance_score numeric(6,3),
    domain_score numeric(6,3),
    feature_vector jsonb,
    is_parked boolean,
    parked_confidence numeric(5,3),
    contacts jsonb,
    secondary_pages_examined smallint DEFAULT 0 NOT NULL,
    microcrawl_exhausted boolean DEFAULT false NOT NULL,
    content_lang text,
    last_http_fetched_at timestamp with time zone,
    CONSTRAINT generated_domains_http_status_code_check CHECK (((http_status_code >= 100) AND (http_status_code <= 599))),
    CONSTRAINT generated_domains_lead_score_check CHECK (((lead_score >= (0)::numeric) AND (lead_score <= (100)::numeric))),
    CONSTRAINT generated_domains_offset_index_check CHECK ((offset_index >= 0))
);


--
-- Name: COLUMN generated_domains.dns_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.dns_reason IS 'Human-readable reason for latest DNS validation status (e.g., NXDOMAIN, SERVFAIL, TIMEOUT, BAD_RESPONSE)';


--
-- Name: COLUMN generated_domains.http_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.http_reason IS 'Human-readable reason for latest HTTP validation status (e.g., CONNECT_ERROR, TLS_ERROR, TIMEOUT, NON_200, BODY_MISMATCH)';


--
-- Name: COLUMN generated_domains.relevance_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.relevance_score IS 'Intermediate relevance score (0-100 scaled)';


--
-- Name: COLUMN generated_domains.domain_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.domain_score IS 'Final composite score (0-100)';


--
-- Name: COLUMN generated_domains.feature_vector; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.feature_vector IS 'Normalized enrichment signals for scoring/rescore';


--
-- Name: COLUMN generated_domains.is_parked; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.is_parked IS 'Parked domain classification (NULL unknown)';


--
-- Name: COLUMN generated_domains.parked_confidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.parked_confidence IS 'Confidence 0..1 for parked classification';


--
-- Name: COLUMN generated_domains.contacts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.contacts IS 'Contact data array (email/phone/etc)';


--
-- Name: COLUMN generated_domains.secondary_pages_examined; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.secondary_pages_examined IS 'Count of micro-crawl secondary pages fetched';


--
-- Name: COLUMN generated_domains.microcrawl_exhausted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.microcrawl_exhausted IS 'TRUE if crawl aborted due to limits/budget';


--
-- Name: COLUMN generated_domains.content_lang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.content_lang IS 'Primary language code';


--
-- Name: COLUMN generated_domains.last_http_fetched_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.last_http_fetched_at IS 'Timestamp of last successful HTTP fetch/enrichment';


--
-- Name: analysis_ready_features; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.analysis_ready_features AS
 SELECT def.campaign_id,
    def.domain_id,
    gd.domain_name,
    def.processing_state,
    def.kw_unique_count,
    def.kw_total_occurrences,
    def.kw_weight_sum,
    def.content_richness_score,
    def.kw_top3,
    def.kw_signal_distribution,
    def.microcrawl_gain_ratio,
    def.is_parked,
    def.parked_confidence,
    def.feature_vector,
    def.content_bytes,
    def.page_lang,
    def.http_status_code,
    def.is_stale_score,
    def.updated_at
   FROM (public.domain_extraction_features def
     JOIN public.generated_domains gd ON ((gd.id = def.domain_id)))
  WHERE ((def.processing_state = 'ready'::public.extraction_processing_state_enum) AND (def.feature_vector IS NOT NULL));


--
-- Name: VIEW analysis_ready_features; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.analysis_ready_features IS 'Analysis-ready feature view (extracted_at omitted; not in canonical table) filtering to ready domains with feature vectors';


--
-- Name: architecture_refactor_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.architecture_refactor_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refactor_type public.refactor_type_enum NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    services_affected text[] NOT NULL,
    dependencies_changed text[],
    apis_modified text[],
    planned_start_date timestamp with time zone,
    actual_start_date timestamp with time zone,
    planned_end_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    initiated_by uuid,
    approved_by uuid,
    team_responsible character varying(100),
    risk_level character varying(10) DEFAULT 'medium'::character varying NOT NULL,
    impact_assessment text,
    rollback_plan text,
    success_criteria jsonb,
    performance_impact jsonb,
    business_impact text,
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    completion_percentage integer DEFAULT 0,
    documentation_links text[],
    communication_plan text,
    stakeholder_notifications jsonb,
    campaign_id uuid,
    lessons_learned text,
    follow_up_actions text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_refactor_log_completion_percentage_check CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100))),
    CONSTRAINT architecture_refactor_log_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT architecture_refactor_log_status_check CHECK (((status)::text = ANY ((ARRAY['planned'::character varying, 'in_progress'::character varying, 'testing'::character varying, 'completed'::character varying, 'rolled_back'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT valid_architecture_refactor_actual_dates CHECK (((actual_end_date IS NULL) OR (actual_start_date IS NULL) OR (actual_end_date >= actual_start_date))),
    CONSTRAINT valid_architecture_refactor_dates CHECK (((planned_end_date IS NULL) OR (planned_start_date IS NULL) OR (planned_end_date >= planned_start_date)))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    details jsonb,
    client_ip inet,
    user_agent text,
    session_id character varying(255),
    request_id uuid,
    service_name character varying(50),
    endpoint character varying(255),
    http_method character varying(10),
    response_status integer,
    execution_time_ms integer,
    data_classification character varying(20),
    compliance_tags text[],
    retention_policy character varying(50),
    campaign_id uuid,
    campaign_phase public.phase_type_enum,
    CONSTRAINT audit_logs_execution_time_ms_check CHECK ((execution_time_ms >= 0)),
    CONSTRAINT chk_audit_logs_execution_time_reasonable CHECK (((execution_time_ms IS NULL) OR (execution_time_ms <= 300000))),
    CONSTRAINT chk_audit_logs_valid_data_classification CHECK (((data_classification IS NULL) OR ((data_classification)::text = ANY ((ARRAY['public'::character varying, 'internal'::character varying, 'confidential'::character varying, 'restricted'::character varying])::text[])))),
    CONSTRAINT chk_audit_logs_valid_http_method CHECK (((http_method IS NULL) OR ((http_method)::text = ANY ((ARRAY['GET'::character varying, 'POST'::character varying, 'PUT'::character varying, 'DELETE'::character varying, 'PATCH'::character varying, 'HEAD'::character varying, 'OPTIONS'::character varying])::text[])))),
    CONSTRAINT valid_audit_response_status CHECK (((response_status IS NULL) OR ((response_status >= 100) AND (response_status <= 599))))
);


--
-- Name: auth_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_audit_logs (
    id bigint NOT NULL,
    user_id uuid,
    session_id character varying(255),
    event_type character varying(50) NOT NULL,
    event_status character varying(20) NOT NULL,
    ip_address inet,
    user_agent text,
    session_fingerprint character varying(64),
    security_flags jsonb,
    details jsonb,
    risk_score integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    action_type character varying(50),
    additional_data jsonb
);


--
-- Name: COLUMN auth_audit_logs.action_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auth_audit_logs.action_type IS 'High level action label used by triggers (e.g., session_created, session_deactivated)';


--
-- Name: COLUMN auth_audit_logs.additional_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auth_audit_logs.additional_data IS 'Structured JSON payload inserted by triggers; mirrors older details field temporarily';


--
-- Name: auth_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_audit_logs_id_seq OWNED BY public.auth_audit_logs.id;


--
-- Name: authorization_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authorization_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    resource_type public.authorization_resource_type_enum NOT NULL,
    resource_id uuid,
    action character varying(50) NOT NULL,
    decision public.authorization_decision_enum NOT NULL,
    decision_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text,
    request_method character varying(10),
    request_path text,
    policy_evaluated text NOT NULL,
    conditions_met jsonb,
    permissions_checked text[],
    reason text,
    additional_context jsonb,
    evaluation_time_ms integer,
    cache_hit boolean DEFAULT false NOT NULL,
    campaign_id uuid,
    campaign_phase public.phase_type_enum,
    risk_factors jsonb,
    compliance_tags text[],
    follow_up_required boolean DEFAULT false NOT NULL,
    follow_up_notes text,
    reviewed boolean DEFAULT false NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    CONSTRAINT authorization_decisions_evaluation_time_ms_check CHECK ((evaluation_time_ms >= 0))
);


--
-- Name: cache_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_name character varying(100) NOT NULL,
    cache_type public.cache_type_enum NOT NULL,
    cache_strategy public.cache_strategy_enum NOT NULL,
    max_size_bytes bigint,
    max_entries integer,
    default_ttl_seconds integer,
    max_ttl_seconds integer,
    eviction_policy jsonb,
    compression_enabled boolean DEFAULT false NOT NULL,
    encryption_enabled boolean DEFAULT false NOT NULL,
    connection_config jsonb,
    cluster_config jsonb,
    replication_factor integer DEFAULT 1,
    health_check_interval_seconds integer DEFAULT 30,
    metrics_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    active boolean DEFAULT true NOT NULL,
    environment character varying(50) DEFAULT 'production'::character varying NOT NULL,
    service_name character varying(100),
    version character varying(20),
    CONSTRAINT cache_configurations_default_ttl_seconds_check CHECK ((default_ttl_seconds > 0)),
    CONSTRAINT cache_configurations_health_check_interval_seconds_check CHECK ((health_check_interval_seconds > 0)),
    CONSTRAINT cache_configurations_max_entries_check CHECK ((max_entries > 0)),
    CONSTRAINT cache_configurations_max_size_bytes_check CHECK ((max_size_bytes > 0)),
    CONSTRAINT cache_configurations_max_ttl_seconds_check CHECK ((max_ttl_seconds > 0)),
    CONSTRAINT cache_configurations_replication_factor_check CHECK ((replication_factor > 0)),
    CONSTRAINT valid_cache_configuration_ttl CHECK (((max_ttl_seconds IS NULL) OR (default_ttl_seconds IS NULL) OR (max_ttl_seconds >= default_ttl_seconds)))
);


--
-- Name: cache_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_configuration_id uuid NOT NULL,
    cache_key character varying(500) NOT NULL,
    cache_value bytea,
    cache_value_compressed boolean DEFAULT false NOT NULL,
    cache_value_encrypted boolean DEFAULT false NOT NULL,
    data_type character varying(50),
    size_bytes integer NOT NULL,
    content_hash character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    access_count integer DEFAULT 0 NOT NULL,
    status public.cache_entry_status_enum DEFAULT 'active'::public.cache_entry_status_enum NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    locked_by uuid,
    locked_at timestamp with time zone,
    dependency_keys text[],
    invalidation_tags text[],
    campaign_id uuid,
    user_id uuid,
    session_id character varying(255),
    generation_time_ms integer,
    last_hit_at timestamp with time zone,
    hit_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT cache_entries_generation_time_ms_check CHECK ((generation_time_ms >= 0)),
    CONSTRAINT cache_entries_size_bytes_check CHECK ((size_bytes >= 0)),
    CONSTRAINT valid_cache_entry_expiry CHECK (((expires_at IS NULL) OR (expires_at > created_at))),
    CONSTRAINT valid_cache_entry_lock CHECK (((locked = false) OR ((locked = true) AND (locked_by IS NOT NULL) AND (locked_at IS NOT NULL))))
);


--
-- Name: cache_invalidation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_invalidation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_configuration_id uuid NOT NULL,
    invalidation_type public.cache_invalidation_type_enum NOT NULL,
    keys_invalidated text[],
    pattern_used character varying(500),
    tags_used text[],
    total_entries_invalidated integer DEFAULT 0 NOT NULL,
    invalidated_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_ms integer,
    triggered_by uuid,
    trigger_reason text,
    automatic boolean DEFAULT false NOT NULL,
    campaign_id uuid,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    performance_impact jsonb,
    cascade_invalidations integer DEFAULT 0,
    downstream_effects jsonb,
    CONSTRAINT cache_invalidation_log_cascade_invalidations_check CHECK ((cascade_invalidations >= 0)),
    CONSTRAINT cache_invalidation_log_duration_ms_check CHECK ((duration_ms >= 0))
);


--
-- Name: cache_invalidations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_invalidations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_configuration_id uuid NOT NULL,
    invalidation_type public.cache_invalidation_type_enum NOT NULL,
    cache_key character varying(500),
    key_pattern character varying(500),
    tags text[],
    all_entries boolean DEFAULT false NOT NULL,
    scheduled_for timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    completed_at timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    requested_by uuid,
    reason text,
    campaign_id uuid,
    entries_affected integer DEFAULT 0,
    success boolean,
    error_message text,
    depends_on uuid,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    CONSTRAINT cache_invalidations_entries_affected_check CHECK ((entries_affected >= 0)),
    CONSTRAINT cache_invalidations_max_retries_check CHECK ((max_retries >= 0)),
    CONSTRAINT cache_invalidations_priority_check CHECK (((priority >= 1) AND (priority <= 10))),
    CONSTRAINT cache_invalidations_retry_count_check CHECK ((retry_count >= 0)),
    CONSTRAINT cache_invalidations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT valid_cache_invalidation_completion CHECK ((((status)::text <> 'completed'::text) OR (completed_at IS NOT NULL))),
    CONSTRAINT valid_cache_invalidation_processing CHECK ((((status)::text <> 'processing'::text) OR (processed_at IS NOT NULL)))
);


--
-- Name: cache_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_metrics (
    id bigint NOT NULL,
    cache_configuration_id uuid NOT NULL,
    hit_count integer DEFAULT 0 NOT NULL,
    miss_count integer DEFAULT 0 NOT NULL,
    eviction_count integer DEFAULT 0 NOT NULL,
    invalidation_count integer DEFAULT 0 NOT NULL,
    avg_response_time_ms numeric(10,3),
    max_response_time_ms numeric(10,3),
    min_response_time_ms numeric(10,3),
    current_entries integer DEFAULT 0 NOT NULL,
    current_size_bytes bigint DEFAULT 0 NOT NULL,
    max_entries_reached integer DEFAULT 0,
    max_size_bytes_reached bigint DEFAULT 0,
    hit_ratio numeric(5,4),
    memory_efficiency numeric(5,4),
    compression_ratio numeric(5,4),
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    service_name character varying(100),
    environment character varying(50),
    CONSTRAINT cache_metrics_avg_response_time_ms_check CHECK ((avg_response_time_ms >= (0)::numeric)),
    CONSTRAINT cache_metrics_compression_ratio_check CHECK ((compression_ratio >= (0)::numeric)),
    CONSTRAINT cache_metrics_current_entries_check CHECK ((current_entries >= 0)),
    CONSTRAINT cache_metrics_current_size_bytes_check CHECK ((current_size_bytes >= 0)),
    CONSTRAINT cache_metrics_eviction_count_check CHECK ((eviction_count >= 0)),
    CONSTRAINT cache_metrics_hit_count_check CHECK ((hit_count >= 0)),
    CONSTRAINT cache_metrics_hit_ratio_check CHECK (((hit_ratio >= (0)::numeric) AND (hit_ratio <= (1)::numeric))),
    CONSTRAINT cache_metrics_invalidation_count_check CHECK ((invalidation_count >= 0)),
    CONSTRAINT cache_metrics_max_entries_reached_check CHECK ((max_entries_reached >= 0)),
    CONSTRAINT cache_metrics_max_response_time_ms_check CHECK ((max_response_time_ms >= (0)::numeric)),
    CONSTRAINT cache_metrics_max_size_bytes_reached_check CHECK ((max_size_bytes_reached >= 0)),
    CONSTRAINT cache_metrics_memory_efficiency_check CHECK (((memory_efficiency >= (0)::numeric) AND (memory_efficiency <= (1)::numeric))),
    CONSTRAINT cache_metrics_min_response_time_ms_check CHECK ((min_response_time_ms >= (0)::numeric)),
    CONSTRAINT cache_metrics_miss_count_check CHECK ((miss_count >= 0)),
    CONSTRAINT valid_cache_metrics_period CHECK ((period_end > period_start)),
    CONSTRAINT valid_cache_metrics_response_times CHECK (((min_response_time_ms IS NULL) OR (max_response_time_ms IS NULL) OR (min_response_time_ms <= max_response_time_ms)))
);


--
-- Name: cache_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cache_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cache_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cache_metrics_id_seq OWNED BY public.cache_metrics.id;


--
-- Name: campaign_access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_access_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    user_id uuid NOT NULL,
    access_type public.access_grant_type_enum NOT NULL,
    granted_by uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    phase_restrictions public.phase_type_enum[],
    read_only boolean DEFAULT false NOT NULL,
    can_modify_settings boolean DEFAULT false NOT NULL,
    can_manage_access boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    ip_restrictions inet[],
    time_restrictions jsonb,
    conditions jsonb,
    active boolean DEFAULT true NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    revoked_at timestamp with time zone,
    revoked_by uuid,
    revocation_reason text,
    last_used_at timestamp with time zone,
    usage_count integer DEFAULT 0 NOT NULL,
    access_pattern jsonb,
    inherited_from uuid,
    can_delegate boolean DEFAULT false NOT NULL,
    delegation_level integer DEFAULT 0 NOT NULL,
    CONSTRAINT campaign_access_grants_delegation_level_check CHECK ((delegation_level >= 0)),
    CONSTRAINT valid_campaign_access_grant_delegation_level CHECK ((delegation_level <= 5)),
    CONSTRAINT valid_campaign_access_grant_expiry CHECK (((expires_at IS NULL) OR (expires_at > granted_at))),
    CONSTRAINT valid_campaign_access_grant_revocation CHECK (((revoked = false) OR ((revoked = true) AND (revoked_at IS NOT NULL) AND (revoked_by IS NOT NULL))))
);


--
-- Name: campaign_domain_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_domain_counters (
    campaign_id uuid NOT NULL,
    total_domains bigint DEFAULT 0 NOT NULL,
    dns_pending bigint DEFAULT 0 NOT NULL,
    dns_ok bigint DEFAULT 0 NOT NULL,
    dns_error bigint DEFAULT 0 NOT NULL,
    dns_timeout bigint DEFAULT 0 NOT NULL,
    http_pending bigint DEFAULT 0 NOT NULL,
    http_ok bigint DEFAULT 0 NOT NULL,
    http_error bigint DEFAULT 0 NOT NULL,
    http_timeout bigint DEFAULT 0 NOT NULL,
    lead_pending bigint DEFAULT 0 NOT NULL,
    lead_match bigint DEFAULT 0 NOT NULL,
    lead_no_match bigint DEFAULT 0 NOT NULL,
    lead_error bigint DEFAULT 0 NOT NULL,
    lead_timeout bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: campaign_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_events (
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    sequence_number bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: campaign_events_sequence_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_events_sequence_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_events_sequence_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_events_sequence_number_seq OWNED BY public.campaign_events.sequence_number;


--
-- Name: campaign_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    job_type public.job_type_enum NOT NULL,
    status public.campaign_job_status_enum DEFAULT 'pending'::public.campaign_job_status_enum NOT NULL,
    scheduled_at timestamp with time zone DEFAULT now() NOT NULL,
    job_payload jsonb,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    last_error text,
    last_attempted_at timestamp with time zone,
    processing_server_id character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    next_execution_at timestamp with time zone,
    locked_at timestamp with time zone,
    locked_by character varying(255),
    business_status public.job_business_status_enum,
    CONSTRAINT campaign_jobs_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT campaign_jobs_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT chk_campaign_jobs_locked_consistency CHECK ((((locked_at IS NULL) AND (locked_by IS NULL)) OR ((locked_at IS NOT NULL) AND (locked_by IS NOT NULL)))),
    CONSTRAINT chk_campaign_jobs_running_locked CHECK (((status <> 'running'::public.campaign_job_status_enum) OR ((locked_at IS NOT NULL) AND (locked_by IS NOT NULL) AND (processing_server_id IS NOT NULL)))),
    CONSTRAINT chk_campaign_jobs_scheduled_execution_order CHECK (((next_execution_at IS NULL) OR (next_execution_at >= scheduled_at))),
    CONSTRAINT valid_job_attempts CHECK ((attempts <= max_attempts))
);


--
-- Name: campaign_phases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_phases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    phase_type public.phase_type_enum NOT NULL,
    phase_order integer NOT NULL,
    status public.phase_status_enum DEFAULT 'not_started'::public.phase_status_enum NOT NULL,
    progress_percentage numeric(5,2),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    paused_at timestamp with time zone,
    failed_at timestamp with time zone,
    error_message text,
    total_items bigint,
    processed_items bigint,
    successful_items bigint,
    failed_items bigint,
    configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT campaign_phases_failed_items_check CHECK ((failed_items >= 0)),
    CONSTRAINT campaign_phases_phase_order_check CHECK (((phase_order >= 1) AND (phase_order <= 5))),
    CONSTRAINT campaign_phases_processed_items_check CHECK ((processed_items >= 0)),
    CONSTRAINT campaign_phases_progress_percentage_check CHECK (((progress_percentage >= (0)::numeric) AND (progress_percentage <= (100)::numeric))),
    CONSTRAINT campaign_phases_successful_items_check CHECK ((successful_items >= 0)),
    CONSTRAINT campaign_phases_total_items_check CHECK ((total_items >= 0)),
    CONSTRAINT valid_phase_progress_items CHECK (((processed_items IS NULL) OR (total_items IS NULL) OR (processed_items <= total_items))),
    CONSTRAINT valid_phase_success_failure_items CHECK (((successful_items IS NULL) OR (failed_items IS NULL) OR (processed_items IS NULL) OR ((successful_items + failed_items) <= processed_items)))
);


--
-- Name: campaign_scoring_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_scoring_profile (
    campaign_id uuid NOT NULL,
    scoring_profile_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE campaign_scoring_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaign_scoring_profile IS 'Association of a campaign to a single scoring profile';


--
-- Name: campaign_state_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_state_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    source_state character varying(50),
    target_state character varying(50),
    reason text,
    triggered_by character varying(100) NOT NULL,
    event_data jsonb NOT NULL,
    operation_context jsonb NOT NULL,
    sequence_number bigint NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    persisted_at timestamp with time zone DEFAULT now() NOT NULL,
    processing_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    processing_error text,
    correlation_id uuid
);


--
-- Name: campaign_state_events_sequence_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_state_events_sequence_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_state_events_sequence_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_state_events_sequence_number_seq OWNED BY public.campaign_state_events.sequence_number;


--
-- Name: campaign_state_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_state_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    current_state character varying(50) NOT NULL,
    state_data jsonb NOT NULL,
    last_event_sequence bigint NOT NULL,
    snapshot_metadata jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    checksum character varying(64) NOT NULL,
    is_valid boolean DEFAULT true NOT NULL
);


--
-- Name: campaign_state_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_state_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state_event_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    from_state character varying(50) NOT NULL,
    to_state character varying(50) NOT NULL,
    is_valid_transition boolean DEFAULT true NOT NULL,
    validation_errors jsonb,
    transition_metadata jsonb,
    triggered_by character varying(100) NOT NULL,
    initiated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    duration_ms integer
);


--
-- Name: campaign_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_states (
    campaign_id uuid NOT NULL,
    current_state public.campaign_state_enum DEFAULT 'draft'::public.campaign_state_enum NOT NULL,
    mode public.campaign_mode_enum NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_campaign_states_version_positive CHECK ((version > 0))
);


--
-- Name: communication_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_service character varying(100) NOT NULL,
    target_service character varying(100) NOT NULL,
    protocol public.communication_protocol_enum NOT NULL,
    pattern_name character varying(100),
    is_synchronous boolean DEFAULT true NOT NULL,
    is_bidirectional boolean DEFAULT false NOT NULL,
    requests_per_minute numeric(10,2),
    avg_payload_size_bytes integer,
    peak_requests_per_minute numeric(10,2),
    avg_latency_ms numeric(10,3),
    p95_latency_ms numeric(10,3),
    p99_latency_ms numeric(10,3),
    timeout_ms integer,
    success_rate_percent numeric(5,2),
    retry_strategy jsonb,
    circuit_breaker_config jsonb,
    fallback_strategy text,
    authentication_method character varying(50),
    encryption_enabled boolean DEFAULT false NOT NULL,
    authorization_required boolean DEFAULT false NOT NULL,
    tracing_enabled boolean DEFAULT false NOT NULL,
    metrics_collected jsonb,
    logging_level character varying(20) DEFAULT 'info'::character varying,
    api_contract jsonb,
    schema_version character varying(20),
    content_type character varying(100),
    environment character varying(50) DEFAULT 'production'::character varying NOT NULL,
    first_observed timestamp with time zone DEFAULT now() NOT NULL,
    last_observed timestamp with time zone DEFAULT now() NOT NULL,
    observation_count integer DEFAULT 1 NOT NULL,
    campaign_id uuid,
    pattern_health_score numeric(5,2),
    optimization_suggestions jsonb,
    CONSTRAINT communication_patterns_avg_latency_ms_check CHECK ((avg_latency_ms >= (0)::numeric)),
    CONSTRAINT communication_patterns_avg_payload_size_bytes_check CHECK ((avg_payload_size_bytes >= 0)),
    CONSTRAINT communication_patterns_observation_count_check CHECK ((observation_count > 0)),
    CONSTRAINT communication_patterns_p95_latency_ms_check CHECK ((p95_latency_ms >= (0)::numeric)),
    CONSTRAINT communication_patterns_p99_latency_ms_check CHECK ((p99_latency_ms >= (0)::numeric)),
    CONSTRAINT communication_patterns_pattern_health_score_check CHECK (((pattern_health_score >= (0)::numeric) AND (pattern_health_score <= (100)::numeric))),
    CONSTRAINT communication_patterns_peak_requests_per_minute_check CHECK ((peak_requests_per_minute >= (0)::numeric)),
    CONSTRAINT communication_patterns_requests_per_minute_check CHECK ((requests_per_minute >= (0)::numeric)),
    CONSTRAINT communication_patterns_success_rate_percent_check CHECK (((success_rate_percent >= (0)::numeric) AND (success_rate_percent <= (100)::numeric))),
    CONSTRAINT communication_patterns_timeout_ms_check CHECK ((timeout_ms > 0)),
    CONSTRAINT no_self_communication CHECK (((source_service)::text <> (target_service)::text))
);


--
-- Name: config_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lock_name character varying(200) NOT NULL,
    lock_type public.config_lock_type_enum DEFAULT 'write_lock'::public.config_lock_type_enum NOT NULL,
    locked_by uuid NOT NULL,
    locked_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    session_id character varying(255),
    resource_type character varying(100) NOT NULL,
    resource_id uuid,
    purpose text NOT NULL,
    lock_metadata jsonb,
    operation_context jsonb,
    parent_lock_id uuid,
    child_locks_count integer DEFAULT 0 NOT NULL,
    auto_renewal_enabled boolean DEFAULT false NOT NULL,
    heartbeat_interval_seconds integer DEFAULT 30,
    last_heartbeat timestamp with time zone,
    active boolean DEFAULT true NOT NULL,
    acquired_count integer DEFAULT 1 NOT NULL,
    renewed_count integer DEFAULT 0 NOT NULL,
    campaign_id uuid,
    warning_threshold_seconds integer DEFAULT 300,
    escalation_threshold_seconds integer DEFAULT 600,
    warning_sent boolean DEFAULT false NOT NULL,
    escalation_sent boolean DEFAULT false NOT NULL,
    CONSTRAINT config_locks_acquired_count_check CHECK ((acquired_count > 0)),
    CONSTRAINT config_locks_child_locks_count_check CHECK ((child_locks_count >= 0)),
    CONSTRAINT config_locks_escalation_threshold_seconds_check CHECK ((escalation_threshold_seconds > 0)),
    CONSTRAINT config_locks_heartbeat_interval_seconds_check CHECK ((heartbeat_interval_seconds > 0)),
    CONSTRAINT config_locks_renewed_count_check CHECK ((renewed_count >= 0)),
    CONSTRAINT config_locks_warning_threshold_seconds_check CHECK ((warning_threshold_seconds > 0)),
    CONSTRAINT valid_config_lock_expiry CHECK ((expires_at > locked_at)),
    CONSTRAINT valid_config_lock_heartbeat CHECK (((auto_renewal_enabled = false) OR (last_heartbeat IS NOT NULL)))
);


--
-- Name: config_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key character varying(200) NOT NULL,
    version_number integer NOT NULL,
    config_value jsonb NOT NULL,
    config_schema_version character varying(20) DEFAULT '1.0'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    change_description text,
    change_reason character varying(500),
    change_type character varying(50) DEFAULT 'update'::character varying NOT NULL,
    config_hash character varying(64) NOT NULL,
    validation_status character varying(20) DEFAULT 'valid'::character varying NOT NULL,
    validation_errors jsonb,
    deployed boolean DEFAULT false NOT NULL,
    deployed_at timestamp with time zone,
    deployed_by uuid,
    deployment_environment character varying(50) DEFAULT 'production'::character varying,
    rollback_version integer,
    can_rollback boolean DEFAULT true NOT NULL,
    rollback_metadata jsonb,
    affects_campaigns boolean DEFAULT false NOT NULL,
    affected_services text[],
    dependency_configs text[],
    campaign_id uuid,
    approval_required boolean DEFAULT false NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    compliance_reviewed boolean DEFAULT false NOT NULL,
    audit_trail jsonb,
    retention_period_days integer DEFAULT 2555,
    CONSTRAINT config_versions_change_type_check CHECK (((change_type)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying, 'rollback'::character varying])::text[]))),
    CONSTRAINT config_versions_retention_period_days_check CHECK ((retention_period_days > 0)),
    CONSTRAINT config_versions_validation_status_check CHECK (((validation_status)::text = ANY ((ARRAY['valid'::character varying, 'invalid'::character varying, 'pending_validation'::character varying, 'validation_failed'::character varying])::text[]))),
    CONSTRAINT config_versions_version_number_check CHECK ((version_number > 0)),
    CONSTRAINT valid_config_version_approval CHECK (((approval_required = false) OR ((approved = true) AND (approved_by IS NOT NULL) AND (approved_at IS NOT NULL)))),
    CONSTRAINT valid_config_version_deployment CHECK (((deployed = false) OR ((deployed = true) AND (deployed_at IS NOT NULL) AND (deployed_by IS NOT NULL))))
);


--
-- Name: connection_pool_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connection_pool_metrics (
    id bigint NOT NULL,
    active_connections integer NOT NULL,
    idle_connections integer NOT NULL,
    max_connections integer NOT NULL,
    wait_count integer DEFAULT 0 NOT NULL,
    wait_duration_ms integer DEFAULT 0 NOT NULL,
    connection_errors integer DEFAULT 0 NOT NULL,
    pool_utilization_percent numeric(5,2) NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    service_name character varying(50),
    database_name character varying(50),
    peak_connections integer,
    avg_connection_duration_ms numeric(10,2),
    CONSTRAINT connection_pool_metrics_active_connections_check CHECK ((active_connections >= 0)),
    CONSTRAINT connection_pool_metrics_avg_connection_duration_ms_check CHECK ((avg_connection_duration_ms >= (0)::numeric)),
    CONSTRAINT connection_pool_metrics_connection_errors_check CHECK ((connection_errors >= 0)),
    CONSTRAINT connection_pool_metrics_idle_connections_check CHECK ((idle_connections >= 0)),
    CONSTRAINT connection_pool_metrics_max_connections_check CHECK ((max_connections > 0)),
    CONSTRAINT connection_pool_metrics_peak_connections_check CHECK ((peak_connections >= 0)),
    CONSTRAINT connection_pool_metrics_pool_utilization_percent_check CHECK (((pool_utilization_percent >= (0)::numeric) AND (pool_utilization_percent <= (100)::numeric))),
    CONSTRAINT connection_pool_metrics_wait_count_check CHECK ((wait_count >= 0)),
    CONSTRAINT connection_pool_metrics_wait_duration_ms_check CHECK ((wait_duration_ms >= 0)),
    CONSTRAINT valid_connection_pool_totals CHECK (((active_connections + idle_connections) <= max_connections))
);


--
-- Name: connection_pool_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.connection_pool_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: connection_pool_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.connection_pool_metrics_id_seq OWNED BY public.connection_pool_metrics.id;


--
-- Name: dns_validation_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dns_validation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dns_campaign_id uuid NOT NULL,
    generated_domain_id uuid,
    domain_name character varying(255) NOT NULL,
    validation_status character varying(50) NOT NULL,
    business_status character varying(50),
    dns_records jsonb,
    validated_by_persona_id uuid,
    attempts integer DEFAULT 0,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dns_validation_results_attempts_check CHECK ((attempts >= 0))
);


--
-- Name: domain_extracted_keywords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_extracted_keywords (
    campaign_id uuid NOT NULL,
    domain_id uuid NOT NULL,
    keyword_id uuid NOT NULL,
    surface_form text,
    signal_type text,
    occurrences integer,
    base_weight double precision,
    value_score double precision,
    effective_weight double precision,
    first_seen_position integer,
    source_subphase text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE domain_extracted_keywords; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.domain_extracted_keywords IS 'Per-domain keyword extraction detail (one row per keyword)';


--
-- Name: domain_generation_campaign_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_campaign_params (
    campaign_id uuid NOT NULL,
    pattern_type public.domain_pattern_type_enum NOT NULL,
    variable_length integer NOT NULL,
    character_set character varying(255) NOT NULL,
    constant_string character varying(255),
    tld character varying(50) NOT NULL,
    num_domains_to_generate integer NOT NULL,
    total_possible_combinations bigint NOT NULL,
    current_offset bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    prefix_variable_length integer,
    suffix_variable_length integer,
    CONSTRAINT chk_domain_generation_params_prefix_length_non_negative CHECK (((prefix_variable_length IS NULL) OR (prefix_variable_length >= 0))),
    CONSTRAINT chk_domain_generation_params_suffix_length_non_negative CHECK (((suffix_variable_length IS NULL) OR (suffix_variable_length >= 0))),
    CONSTRAINT domain_generation_campaign_pa_total_possible_combinations_check CHECK ((total_possible_combinations > 0)),
    CONSTRAINT domain_generation_campaign_params_current_offset_check CHECK ((current_offset >= 0)),
    CONSTRAINT domain_generation_campaign_params_num_domains_to_generate_check CHECK ((num_domains_to_generate > 0)),
    CONSTRAINT domain_generation_campaign_params_variable_length_check CHECK ((variable_length > 0))
);


--
-- Name: domain_generation_config_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_config_states (
    config_hash character varying(64) NOT NULL,
    last_offset bigint DEFAULT 0 NOT NULL,
    config_details jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT domain_generation_config_states_last_offset_check CHECK ((last_offset >= 0))
);


--
-- Name: event_projections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_projections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    projection_name character varying(100) NOT NULL,
    projection_type character varying(50) NOT NULL,
    status public.projection_status_enum DEFAULT 'building'::public.projection_status_enum NOT NULL,
    current_position bigint DEFAULT 0 NOT NULL,
    last_processed_event_id uuid,
    last_processed_timestamp timestamp with time zone,
    query_definition text NOT NULL,
    event_filters jsonb,
    batch_size integer DEFAULT 100 NOT NULL,
    processing_interval_seconds integer DEFAULT 10 NOT NULL,
    processing_lag_ms integer,
    events_processed_count bigint DEFAULT 0 NOT NULL,
    events_failed_count bigint DEFAULT 0 NOT NULL,
    last_success_timestamp timestamp with time zone,
    last_failure_timestamp timestamp with time zone,
    error_threshold integer DEFAULT 10 NOT NULL,
    current_error_count integer DEFAULT 0 NOT NULL,
    auto_recovery_enabled boolean DEFAULT true NOT NULL,
    last_recovery_attempt timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    version character varying(20) DEFAULT '1.0'::character varying NOT NULL,
    dependencies text[],
    rebuild_on_failure boolean DEFAULT true NOT NULL,
    parallel_processing_enabled boolean DEFAULT false NOT NULL,
    monitoring_enabled boolean DEFAULT true NOT NULL,
    alert_on_lag_ms integer DEFAULT 30000,
    alert_on_failure_count integer DEFAULT 5,
    target_table_name character varying(100),
    target_schema_name character varying(100) DEFAULT 'public'::character varying,
    campaign_specific boolean DEFAULT false NOT NULL,
    campaign_id uuid,
    CONSTRAINT event_projections_alert_on_failure_count_check CHECK ((alert_on_failure_count > 0)),
    CONSTRAINT event_projections_alert_on_lag_ms_check CHECK ((alert_on_lag_ms > 0)),
    CONSTRAINT event_projections_batch_size_check CHECK ((batch_size > 0)),
    CONSTRAINT event_projections_current_error_count_check CHECK ((current_error_count >= 0)),
    CONSTRAINT event_projections_current_position_check CHECK ((current_position >= 0)),
    CONSTRAINT event_projections_error_threshold_check CHECK ((error_threshold > 0)),
    CONSTRAINT event_projections_events_failed_count_check CHECK ((events_failed_count >= 0)),
    CONSTRAINT event_projections_events_processed_count_check CHECK ((events_processed_count >= 0)),
    CONSTRAINT event_projections_processing_interval_seconds_check CHECK ((processing_interval_seconds > 0)),
    CONSTRAINT event_projections_processing_lag_ms_check CHECK ((processing_lag_ms >= 0))
);


--
-- Name: event_store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_store (
    id bigint NOT NULL,
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type public.event_type_enum NOT NULL,
    aggregate_id uuid NOT NULL,
    aggregate_type character varying(100) NOT NULL,
    aggregate_version integer NOT NULL,
    event_data jsonb NOT NULL,
    event_metadata jsonb,
    event_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    sequence_number bigint NOT NULL,
    causation_id uuid,
    correlation_id uuid,
    parent_event_id uuid,
    user_id uuid,
    session_id character varying(255),
    campaign_id uuid,
    campaign_phase public.phase_type_enum,
    event_source character varying(100) DEFAULT 'api_server'::character varying NOT NULL,
    event_version character varying(20) DEFAULT '1.0'::character varying NOT NULL,
    processing_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    is_snapshot boolean DEFAULT false NOT NULL,
    compacted boolean DEFAULT false NOT NULL,
    compaction_timestamp timestamp with time zone,
    processing_attempts integer DEFAULT 0 NOT NULL,
    last_processing_error text,
    retry_after timestamp with time zone,
    partition_key character varying(100) DEFAULT 'default'::character varying NOT NULL,
    shard_key character varying(50),
    retention_policy character varying(50) DEFAULT 'standard'::character varying,
    archived boolean DEFAULT false NOT NULL,
    archive_timestamp timestamp with time zone,
    CONSTRAINT event_store_aggregate_version_check CHECK ((aggregate_version > 0)),
    CONSTRAINT event_store_processing_attempts_check CHECK ((processing_attempts >= 0)),
    CONSTRAINT event_store_processing_status_check CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processed'::character varying, 'failed'::character varying, 'skipped'::character varying])::text[])))
);


--
-- Name: event_store_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_store_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_store_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_store_id_seq OWNED BY public.event_store.id;


--
-- Name: foreign_key_violations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.foreign_key_violations AS
 SELECT schemaname,
    relname AS tablename,
    'Missing referenced record'::text AS violation_type,
    count(*) AS violation_count
   FROM pg_stat_user_tables
  WHERE (schemaname = 'public'::name)
  GROUP BY schemaname, relname;


--
-- Name: VIEW foreign_key_violations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.foreign_key_violations IS 'Monitor potential foreign key constraint violations - for maintenance purposes';


--
-- Name: http_keyword_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.http_keyword_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    http_keyword_campaign_id uuid NOT NULL,
    dns_result_id uuid,
    domain_name character varying(255) NOT NULL,
    validation_status character varying(50) NOT NULL,
    http_status_code integer,
    response_headers jsonb,
    page_title text,
    extracted_content_snippet text,
    found_keywords_from_sets jsonb,
    found_ad_hoc_keywords text[],
    content_hash character varying(64),
    validated_by_persona_id uuid,
    used_proxy_id uuid,
    attempts integer DEFAULT 0,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT http_keyword_results_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT http_keyword_results_http_status_code_check CHECK (((http_status_code >= 100) AND (http_status_code <= 599)))
);


--
-- Name: keyword_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    keyword_set_id uuid NOT NULL,
    pattern text NOT NULL,
    rule_type public.keyword_rule_type_enum NOT NULL,
    is_case_sensitive boolean DEFAULT false NOT NULL,
    category character varying(100),
    context_chars integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT keyword_rules_context_chars_check CHECK ((context_chars >= 0))
);


--
-- Name: keyword_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rules jsonb
);


--
-- Name: lead_generation_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_generation_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    campaign_type character varying(50) DEFAULT 'lead_generation'::character varying NOT NULL,
    current_phase_id uuid,
    current_phase public.phase_type_enum,
    total_phases integer DEFAULT 5 NOT NULL,
    completed_phases integer DEFAULT 0 NOT NULL,
    overall_progress numeric(5,2),
    is_full_sequence_mode boolean DEFAULT false NOT NULL,
    auto_advance_phases boolean DEFAULT true NOT NULL,
    dns_results jsonb,
    http_results jsonb,
    analysis_results jsonb,
    progress_percentage numeric(5,2),
    total_items bigint,
    processed_items bigint,
    successful_items bigint,
    failed_items bigint,
    error_message text,
    metadata jsonb,
    estimated_completion_at timestamp with time zone,
    avg_processing_rate numeric(10,2),
    last_heartbeat_at timestamp with time zone,
    business_status character varying(50),
    phase_status public.phase_status_enum,
    dns_config jsonb,
    http_config jsonb,
    state_version integer DEFAULT 1 NOT NULL,
    state_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT lead_generation_campaigns_completed_phases_check CHECK (((completed_phases >= 0) AND (completed_phases <= 5))),
    CONSTRAINT lead_generation_campaigns_failed_items_check CHECK ((failed_items >= 0)),
    CONSTRAINT lead_generation_campaigns_overall_progress_check CHECK (((overall_progress >= (0)::numeric) AND (overall_progress <= (100)::numeric))),
    CONSTRAINT lead_generation_campaigns_processed_items_check CHECK ((processed_items >= 0)),
    CONSTRAINT lead_generation_campaigns_progress_percentage_check CHECK (((progress_percentage >= (0)::numeric) AND (progress_percentage <= (100)::numeric))),
    CONSTRAINT lead_generation_campaigns_successful_items_check CHECK ((successful_items >= 0)),
    CONSTRAINT lead_generation_campaigns_total_items_check CHECK ((total_items >= 0)),
    CONSTRAINT valid_progress_items CHECK (((processed_items IS NULL) OR (total_items IS NULL) OR (processed_items <= total_items))),
    CONSTRAINT valid_success_failure_items CHECK (((successful_items IS NULL) OR (failed_items IS NULL) OR (processed_items IS NULL) OR ((successful_items + failed_items) <= processed_items)))
);


--
-- Name: TABLE lead_generation_campaigns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lead_generation_campaigns IS 'State transitions now managed by application layer with state.CampaignStateMachine';


--
-- Name: COLUMN lead_generation_campaigns.current_phase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_generation_campaigns.current_phase IS 'COMPUTED: Derived from campaign_phases table. Updated automatically via sync_campaign_from_phases().';


--
-- Name: COLUMN lead_generation_campaigns.phase_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_generation_campaigns.phase_status IS 'COMPUTED: Derived from campaign_phases table. Updated automatically via sync_campaign_from_phases().';


--
-- Name: pagination_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagination_performance_metrics (
    id bigint NOT NULL,
    table_name character varying(100) NOT NULL,
    pagination_type character varying(20) NOT NULL,
    page_size integer NOT NULL,
    page_number integer NOT NULL,
    total_rows bigint NOT NULL,
    execution_time_ms integer NOT NULL,
    memory_usage_kb integer DEFAULT 0 NOT NULL,
    indexes_used text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    query_complexity_score integer,
    cache_hit_ratio numeric(5,2),
    service_name character varying(50),
    campaign_id uuid,
    user_id uuid,
    CONSTRAINT pagination_performance_metrics_cache_hit_ratio_check CHECK (((cache_hit_ratio >= (0)::numeric) AND (cache_hit_ratio <= (100)::numeric))),
    CONSTRAINT pagination_performance_metrics_execution_time_ms_check CHECK ((execution_time_ms >= 0)),
    CONSTRAINT pagination_performance_metrics_memory_usage_kb_check CHECK ((memory_usage_kb >= 0)),
    CONSTRAINT pagination_performance_metrics_page_number_check CHECK ((page_number > 0)),
    CONSTRAINT pagination_performance_metrics_page_size_check CHECK ((page_size > 0)),
    CONSTRAINT pagination_performance_metrics_pagination_type_check CHECK (((pagination_type)::text = ANY ((ARRAY['offset'::character varying, 'cursor'::character varying])::text[]))),
    CONSTRAINT pagination_performance_metrics_query_complexity_score_check CHECK (((query_complexity_score >= 1) AND (query_complexity_score <= 10))),
    CONSTRAINT pagination_performance_metrics_total_rows_check CHECK ((total_rows >= 0)),
    CONSTRAINT valid_pagination_page_size CHECK ((page_size <= 10000))
);


--
-- Name: pagination_performance_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagination_performance_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagination_performance_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagination_performance_metrics_id_seq OWNED BY public.pagination_performance_metrics.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    persona_type public.persona_type_enum NOT NULL,
    description text,
    config_details jsonb NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    status public.persona_status_enum,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_tested timestamp with time zone,
    last_error text,
    tags text[]
);


--
-- Name: phase_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phase_configurations (
    campaign_id uuid NOT NULL,
    phase text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: phase_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phase_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    phase_type public.phase_type_enum NOT NULL,
    status public.execution_status_enum DEFAULT 'not_started'::public.execution_status_enum NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    paused_at timestamp with time zone,
    failed_at timestamp with time zone,
    progress_percentage numeric(5,2) DEFAULT 0.0,
    total_items bigint DEFAULT 0,
    processed_items bigint DEFAULT 0,
    successful_items bigint DEFAULT 0,
    failed_items bigint DEFAULT 0,
    configuration jsonb,
    error_details jsonb,
    metrics jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_phase_executions_items_consistency CHECK ((processed_items <= total_items)),
    CONSTRAINT check_phase_executions_items_non_negative CHECK (((total_items >= 0) AND (processed_items >= 0) AND (successful_items >= 0) AND (failed_items >= 0))),
    CONSTRAINT check_phase_executions_progress_range CHECK (((progress_percentage >= 0.0) AND (progress_percentage <= 100.0)))
);


--
-- Name: phase_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phase_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    phase_type text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    success boolean,
    error text,
    duration_ms bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proxies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    address text NOT NULL,
    protocol public.proxy_protocol_enum,
    username character varying(255),
    password_hash text,
    host character varying(255),
    port integer,
    is_enabled boolean DEFAULT true NOT NULL,
    is_healthy boolean DEFAULT false NOT NULL,
    last_status character varying(50),
    last_checked_at timestamp with time zone,
    latency_ms integer,
    city character varying(100),
    country_code character varying(2),
    provider character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.proxy_status_enum,
    notes text,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    last_tested timestamp with time zone,
    last_error text,
    CONSTRAINT proxies_failure_count_check CHECK ((failure_count >= 0)),
    CONSTRAINT proxies_latency_ms_check CHECK ((latency_ms >= 0)),
    CONSTRAINT proxies_port_check CHECK (((port >= 1) AND (port <= 65535))),
    CONSTRAINT proxies_success_count_check CHECK ((success_count >= 0))
);


--
-- Name: proxy_pool_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxy_pool_memberships (
    pool_id uuid NOT NULL,
    proxy_id uuid NOT NULL,
    weight integer,
    is_active boolean DEFAULT true NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT proxy_pool_memberships_weight_check CHECK ((weight > 0))
);


--
-- Name: proxy_pools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxy_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    pool_strategy character varying(50),
    health_check_enabled boolean DEFAULT true NOT NULL,
    health_check_interval_seconds integer,
    max_retries integer,
    timeout_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT proxy_pools_health_check_interval_seconds_check CHECK ((health_check_interval_seconds > 0)),
    CONSTRAINT proxy_pools_max_retries_check CHECK ((max_retries >= 0)),
    CONSTRAINT proxy_pools_timeout_seconds_check CHECK ((timeout_seconds > 0))
);


--
-- Name: query_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    query_sql text NOT NULL,
    query_type character varying(50) NOT NULL,
    table_names text[] NOT NULL,
    execution_time_ms numeric(10,3) NOT NULL,
    rows_examined bigint NOT NULL,
    rows_returned bigint NOT NULL,
    index_usage jsonb,
    cpu_time_ms numeric(10,3) DEFAULT 0 NOT NULL,
    io_wait_ms numeric(10,3) DEFAULT 0 NOT NULL,
    lock_wait_ms numeric(10,3) DEFAULT 0 NOT NULL,
    buffer_reads bigint DEFAULT 0 NOT NULL,
    buffer_hits bigint DEFAULT 0 NOT NULL,
    query_plan jsonb,
    optimization_score numeric(5,2) DEFAULT 0 NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    service_name character varying(50) NOT NULL,
    campaign_id uuid,
    campaign_phase public.phase_type_enum,
    memory_used_bytes bigint DEFAULT 0 NOT NULL,
    optimization_applied boolean DEFAULT false NOT NULL,
    optimization_suggestions jsonb,
    user_id uuid,
    performance_category character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    needs_optimization boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_query_performance_metrics_performance_category CHECK (((performance_category)::text = ANY ((ARRAY['excellent'::character varying, 'good'::character varying, 'normal'::character varying, 'poor'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT query_performance_metrics_buffer_hits_check CHECK ((buffer_hits >= 0)),
    CONSTRAINT query_performance_metrics_buffer_reads_check CHECK ((buffer_reads >= 0)),
    CONSTRAINT query_performance_metrics_cpu_time_ms_check CHECK ((cpu_time_ms >= (0)::numeric)),
    CONSTRAINT query_performance_metrics_execution_time_ms_check CHECK ((execution_time_ms >= (0)::numeric)),
    CONSTRAINT query_performance_metrics_io_wait_ms_check CHECK ((io_wait_ms >= (0)::numeric)),
    CONSTRAINT query_performance_metrics_lock_wait_ms_check CHECK ((lock_wait_ms >= (0)::numeric)),
    CONSTRAINT query_performance_metrics_memory_used_bytes_check CHECK ((memory_used_bytes >= 0)),
    CONSTRAINT query_performance_metrics_optimization_score_check CHECK (((optimization_score >= (0)::numeric) AND (optimization_score <= (100)::numeric))),
    CONSTRAINT query_performance_metrics_rows_examined_check CHECK ((rows_examined >= 0)),
    CONSTRAINT query_performance_metrics_rows_returned_check CHECK ((rows_returned >= 0)),
    CONSTRAINT valid_query_performance_buffer_ratio CHECK (((buffer_reads = 0) OR (buffer_hits <= buffer_reads)))
);


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    id bigint NOT NULL,
    identifier character varying(255) NOT NULL,
    action character varying(100) NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    window_start timestamp with time zone NOT NULL,
    blocked_until timestamp with time zone
);


--
-- Name: rate_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rate_limits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rate_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rate_limits_id_seq OWNED BY public.rate_limits.id;


--
-- Name: resource_utilization_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_utilization_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(50) NOT NULL,
    resource_type character varying(30) NOT NULL,
    current_usage numeric(10,2) NOT NULL,
    max_capacity numeric(10,2) NOT NULL,
    utilization_pct numeric(5,2) NOT NULL,
    efficiency_score numeric(5,2) NOT NULL,
    bottleneck_detected boolean DEFAULT false NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    campaign_phase public.phase_type_enum,
    campaign_id uuid,
    component character varying(50),
    optimization_applied jsonb,
    CONSTRAINT chk_resource_utilization_metrics_resource_type CHECK (((resource_type)::text = ANY ((ARRAY['cpu'::character varying, 'memory'::character varying, 'disk'::character varying, 'network'::character varying, 'database'::character varying, 'cache'::character varying, 'queue'::character varying])::text[]))),
    CONSTRAINT resource_utilization_metrics_current_usage_check CHECK ((current_usage >= (0)::numeric)),
    CONSTRAINT resource_utilization_metrics_efficiency_score_check CHECK (((efficiency_score >= (0)::numeric) AND (efficiency_score <= (100)::numeric))),
    CONSTRAINT resource_utilization_metrics_max_capacity_check CHECK ((max_capacity > (0)::numeric)),
    CONSTRAINT resource_utilization_metrics_utilization_pct_check CHECK (((utilization_pct >= (0)::numeric) AND (utilization_pct <= (100)::numeric))),
    CONSTRAINT valid_resource_utilization CHECK ((current_usage <= max_capacity))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    dirty boolean NOT NULL
);


--
-- Name: scoring_profile_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scoring_profile_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    profile_version integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    scoring_configuration jsonb NOT NULL,
    feature_weights jsonb NOT NULL,
    algorithm_version character varying(50) DEFAULT '1.0'::character varying NOT NULL,
    parameters jsonb,
    is_active boolean DEFAULT true NOT NULL,
    replaced_at timestamp with time zone,
    replaced_by_snapshot_id uuid
);


--
-- Name: TABLE scoring_profile_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scoring_profile_snapshots IS 'Stores point-in-time snapshots of scoring profiles for tracking changes and enabling stale score detection';


--
-- Name: scoring_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scoring_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    weights jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parked_penalty_factor double precision DEFAULT 0.5
);


--
-- Name: TABLE scoring_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scoring_profiles IS 'Scoring weight profiles (JSON weights object validated in application)';


--
-- Name: COLUMN scoring_profiles.parked_penalty_factor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scoring_profiles.parked_penalty_factor IS 'Multiplicative factor applied to relevance score when parked penalty conditions met (range 0..1, default 0.5)';


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type public.security_event_type_enum NOT NULL,
    user_id uuid,
    session_id character varying(255),
    ip_address inet NOT NULL,
    user_agent text,
    event_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    severity character varying(10) DEFAULT 'info'::character varying NOT NULL,
    description text NOT NULL,
    additional_data jsonb,
    country_code character(2),
    city character varying(100),
    organization character varying(200),
    risk_score integer,
    threat_detected boolean DEFAULT false NOT NULL,
    automated_response_triggered boolean DEFAULT false NOT NULL,
    response_actions jsonb,
    campaign_id uuid,
    resource_type public.authorization_resource_type_enum,
    resource_id uuid,
    investigated boolean DEFAULT false NOT NULL,
    investigation_notes text,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    compliance_relevant boolean DEFAULT false NOT NULL,
    retention_period_days integer DEFAULT 2555,
    archived boolean DEFAULT false NOT NULL,
    alert_sent boolean DEFAULT false NOT NULL,
    alert_recipients text[],
    CONSTRAINT security_events_retention_period_days_check CHECK ((retention_period_days > 0)),
    CONSTRAINT security_events_risk_score_check CHECK (((risk_score >= 0) AND (risk_score <= 100))),
    CONSTRAINT security_events_severity_check CHECK (((severity)::text = ANY ((ARRAY['critical'::character varying, 'high'::character varying, 'medium'::character varying, 'low'::character varying, 'info'::character varying])::text[]))),
    CONSTRAINT valid_security_event_resolution CHECK (((resolved = false) OR ((resolved = true) AND (resolved_at IS NOT NULL))))
);


--
-- Name: service_architecture_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_architecture_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    service_type public.service_type_enum NOT NULL,
    service_version character varying(50),
    uptime_seconds bigint,
    availability_percent numeric(5,2),
    health_score numeric(5,2),
    avg_response_time_ms numeric(10,3),
    p95_response_time_ms numeric(10,3),
    p99_response_time_ms numeric(10,3),
    throughput_requests_per_second numeric(10,2),
    cpu_usage_percent numeric(5,2),
    memory_usage_percent numeric(5,2),
    disk_usage_percent numeric(5,2),
    network_usage_mbps numeric(10,2),
    error_rate_percent numeric(5,2),
    crash_count integer DEFAULT 0 NOT NULL,
    restart_count integer DEFAULT 0 NOT NULL,
    current_instances integer DEFAULT 1 NOT NULL,
    max_instances integer,
    auto_scaling_enabled boolean DEFAULT false NOT NULL,
    scale_events_count integer DEFAULT 0 NOT NULL,
    dependency_count integer DEFAULT 0 NOT NULL,
    complexity_score numeric(5,2),
    technical_debt_score numeric(5,2),
    environment character varying(50) DEFAULT 'production'::character varying NOT NULL,
    deployment_id character varying(100),
    build_version character varying(100),
    measurement_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    measurement_period_minutes integer DEFAULT 5 NOT NULL,
    campaign_id uuid,
    alert_threshold_breached boolean DEFAULT false NOT NULL,
    alert_details jsonb,
    CONSTRAINT service_architecture_metrics_availability_percent_check CHECK (((availability_percent >= (0)::numeric) AND (availability_percent <= (100)::numeric))),
    CONSTRAINT service_architecture_metrics_avg_response_time_ms_check CHECK ((avg_response_time_ms >= (0)::numeric)),
    CONSTRAINT service_architecture_metrics_complexity_score_check CHECK ((complexity_score >= (0)::numeric)),
    CONSTRAINT service_architecture_metrics_cpu_usage_percent_check CHECK (((cpu_usage_percent >= (0)::numeric) AND (cpu_usage_percent <= (100)::numeric))),
    CONSTRAINT service_architecture_metrics_crash_count_check CHECK ((crash_count >= 0)),
    CONSTRAINT service_architecture_metrics_current_instances_check CHECK ((current_instances > 0)),
    CONSTRAINT service_architecture_metrics_dependency_count_check CHECK ((dependency_count >= 0)),
    CONSTRAINT service_architecture_metrics_disk_usage_percent_check CHECK (((disk_usage_percent >= (0)::numeric) AND (disk_usage_percent <= (100)::numeric))),
    CONSTRAINT service_architecture_metrics_error_rate_percent_check CHECK (((error_rate_percent >= (0)::numeric) AND (error_rate_percent <= (100)::numeric))),
    CONSTRAINT service_architecture_metrics_health_score_check CHECK (((health_score >= (0)::numeric) AND (health_score <= (100)::numeric))),
    CONSTRAINT service_architecture_metrics_max_instances_check CHECK ((max_instances > 0)),
    CONSTRAINT service_architecture_metrics_measurement_period_minutes_check CHECK ((measurement_period_minutes > 0)),
    CONSTRAINT service_architecture_metrics_memory_usage_percent_check CHECK (((memory_usage_percent >= (0)::numeric) AND (memory_usage_percent <= (100)::numeric))),
    CONSTRAINT service_architecture_metrics_network_usage_mbps_check CHECK ((network_usage_mbps >= (0)::numeric)),
    CONSTRAINT service_architecture_metrics_p95_response_time_ms_check CHECK ((p95_response_time_ms >= (0)::numeric)),
    CONSTRAINT service_architecture_metrics_p99_response_time_ms_check CHECK ((p99_response_time_ms >= (0)::numeric)),
    CONSTRAINT service_architecture_metrics_restart_count_check CHECK ((restart_count >= 0)),
    CONSTRAINT service_architecture_metrics_scale_events_count_check CHECK ((scale_events_count >= 0)),
    CONSTRAINT service_architecture_metrics_technical_debt_score_check CHECK ((technical_debt_score >= (0)::numeric)),
    CONSTRAINT service_architecture_metrics_throughput_requests_per_seco_check CHECK ((throughput_requests_per_second >= (0)::numeric)),
    CONSTRAINT service_architecture_metrics_uptime_seconds_check CHECK ((uptime_seconds >= 0)),
    CONSTRAINT valid_service_architecture_metrics_instances CHECK (((max_instances IS NULL) OR (current_instances <= max_instances)))
);


--
-- Name: service_capacity_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_capacity_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    service_type public.service_type_enum NOT NULL,
    max_concurrent_requests integer,
    current_concurrent_requests integer DEFAULT 0 NOT NULL,
    max_memory_gb numeric(10,2),
    current_memory_gb numeric(10,2) DEFAULT 0 NOT NULL,
    max_cpu_cores numeric(5,2),
    current_cpu_usage numeric(5,2) DEFAULT 0 NOT NULL,
    max_database_connections integer,
    current_database_connections integer DEFAULT 0 NOT NULL,
    max_thread_pool_size integer,
    current_active_threads integer DEFAULT 0 NOT NULL,
    max_queue_size integer,
    current_queue_size integer DEFAULT 0 NOT NULL,
    max_buffer_size_mb numeric(10,2),
    current_buffer_size_mb numeric(10,2) DEFAULT 0 NOT NULL,
    scaling_threshold_percent numeric(5,2) DEFAULT 80,
    scale_up_triggered boolean DEFAULT false NOT NULL,
    scale_down_triggered boolean DEFAULT false NOT NULL,
    auto_scaling_enabled boolean DEFAULT false NOT NULL,
    degradation_threshold_percent numeric(5,2) DEFAULT 90,
    performance_degraded boolean DEFAULT false NOT NULL,
    circuit_breaker_triggered boolean DEFAULT false NOT NULL,
    request_capacity_utilization_percent numeric(5,2),
    memory_capacity_utilization_percent numeric(5,2),
    cpu_capacity_utilization_percent numeric(5,2),
    environment character varying(50) DEFAULT 'production'::character varying NOT NULL,
    measurement_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    measurement_window_minutes integer DEFAULT 5 NOT NULL,
    campaign_id uuid,
    capacity_alert_triggered boolean DEFAULT false NOT NULL,
    recommendations jsonb,
    CONSTRAINT service_capacity_metrics_cpu_capacity_utilization_percent_check CHECK (((cpu_capacity_utilization_percent >= (0)::numeric) AND (cpu_capacity_utilization_percent <= (100)::numeric))),
    CONSTRAINT service_capacity_metrics_current_active_threads_check CHECK ((current_active_threads >= 0)),
    CONSTRAINT service_capacity_metrics_current_buffer_size_mb_check CHECK ((current_buffer_size_mb >= (0)::numeric)),
    CONSTRAINT service_capacity_metrics_current_concurrent_requests_check CHECK ((current_concurrent_requests >= 0)),
    CONSTRAINT service_capacity_metrics_current_cpu_usage_check CHECK ((current_cpu_usage >= (0)::numeric)),
    CONSTRAINT service_capacity_metrics_current_database_connections_check CHECK ((current_database_connections >= 0)),
    CONSTRAINT service_capacity_metrics_current_memory_gb_check CHECK ((current_memory_gb >= (0)::numeric)),
    CONSTRAINT service_capacity_metrics_current_queue_size_check CHECK ((current_queue_size >= 0)),
    CONSTRAINT service_capacity_metrics_degradation_threshold_percent_check CHECK (((degradation_threshold_percent >= (0)::numeric) AND (degradation_threshold_percent <= (100)::numeric))),
    CONSTRAINT service_capacity_metrics_max_buffer_size_mb_check CHECK ((max_buffer_size_mb > (0)::numeric)),
    CONSTRAINT service_capacity_metrics_max_concurrent_requests_check CHECK ((max_concurrent_requests > 0)),
    CONSTRAINT service_capacity_metrics_max_cpu_cores_check CHECK ((max_cpu_cores > (0)::numeric)),
    CONSTRAINT service_capacity_metrics_max_database_connections_check CHECK ((max_database_connections > 0)),
    CONSTRAINT service_capacity_metrics_max_memory_gb_check CHECK ((max_memory_gb > (0)::numeric)),
    CONSTRAINT service_capacity_metrics_max_queue_size_check CHECK ((max_queue_size > 0)),
    CONSTRAINT service_capacity_metrics_max_thread_pool_size_check CHECK ((max_thread_pool_size > 0)),
    CONSTRAINT service_capacity_metrics_measurement_window_minutes_check CHECK ((measurement_window_minutes > 0)),
    CONSTRAINT service_capacity_metrics_memory_capacity_utilization_perc_check CHECK (((memory_capacity_utilization_percent >= (0)::numeric) AND (memory_capacity_utilization_percent <= (100)::numeric))),
    CONSTRAINT service_capacity_metrics_request_capacity_utilization_per_check CHECK (((request_capacity_utilization_percent >= (0)::numeric) AND (request_capacity_utilization_percent <= (100)::numeric))),
    CONSTRAINT service_capacity_metrics_scaling_threshold_percent_check CHECK (((scaling_threshold_percent >= (0)::numeric) AND (scaling_threshold_percent <= (100)::numeric))),
    CONSTRAINT valid_service_capacity_connections CHECK (((max_database_connections IS NULL) OR (current_database_connections <= max_database_connections))),
    CONSTRAINT valid_service_capacity_memory CHECK (((max_memory_gb IS NULL) OR (current_memory_gb <= max_memory_gb))),
    CONSTRAINT valid_service_capacity_queue CHECK (((max_queue_size IS NULL) OR (current_queue_size <= max_queue_size))),
    CONSTRAINT valid_service_capacity_requests CHECK (((max_concurrent_requests IS NULL) OR (current_concurrent_requests <= max_concurrent_requests)))
);


--
-- Name: service_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_service character varying(100) NOT NULL,
    target_service character varying(100) NOT NULL,
    dependency_type public.dependency_type_enum NOT NULL,
    is_critical boolean DEFAULT false NOT NULL,
    is_optional boolean DEFAULT false NOT NULL,
    timeout_ms integer,
    retry_count integer DEFAULT 0 NOT NULL,
    circuit_breaker_enabled boolean DEFAULT false NOT NULL,
    success_rate_percent numeric(5,2),
    avg_latency_ms numeric(10,3),
    error_count integer DEFAULT 0 NOT NULL,
    total_requests integer DEFAULT 0 NOT NULL,
    api_version character varying(20),
    protocol_version character varying(20),
    configuration jsonb,
    last_health_check timestamp with time zone,
    health_status character varying(20) DEFAULT 'unknown'::character varying,
    health_check_interval_seconds integer DEFAULT 30,
    discovery_method character varying(50) DEFAULT 'static'::character varying,
    load_balancing_strategy character varying(50),
    endpoints jsonb,
    environment character varying(50) DEFAULT 'production'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    campaign_id uuid,
    CONSTRAINT no_self_dependency CHECK (((source_service)::text <> (target_service)::text)),
    CONSTRAINT service_dependencies_avg_latency_ms_check CHECK ((avg_latency_ms >= (0)::numeric)),
    CONSTRAINT service_dependencies_error_count_check CHECK ((error_count >= 0)),
    CONSTRAINT service_dependencies_health_check_interval_seconds_check CHECK ((health_check_interval_seconds > 0)),
    CONSTRAINT service_dependencies_health_status_check CHECK (((health_status)::text = ANY ((ARRAY['healthy'::character varying, 'degraded'::character varying, 'unhealthy'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT service_dependencies_retry_count_check CHECK ((retry_count >= 0)),
    CONSTRAINT service_dependencies_success_rate_percent_check CHECK (((success_rate_percent >= (0)::numeric) AND (success_rate_percent <= (100)::numeric))),
    CONSTRAINT service_dependencies_timeout_ms_check CHECK ((timeout_ms > 0)),
    CONSTRAINT service_dependencies_total_requests_check CHECK ((total_requests >= 0))
);


--
-- Name: trigger_monitoring; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.trigger_monitoring AS
 SELECT n.nspname AS schemaname,
    c.relname AS tablename,
    t.tgname AS triggername,
    t.tgenabled,
    t.tgtype,
    (t.tgfoid)::regproc AS trigger_function
   FROM ((pg_trigger t
     JOIN pg_class c ON ((t.tgrelid = c.oid)))
     JOIN pg_namespace n ON ((c.relnamespace = n.oid)))
  WHERE (n.nspname = 'public'::name)
  ORDER BY c.relname, t.tgname;


--
-- Name: VIEW trigger_monitoring; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.trigger_monitoring IS 'Monitor trigger status and configuration across all tables';


--
-- Name: auth_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.auth_audit_logs_id_seq'::regclass);


--
-- Name: cache_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_metrics ALTER COLUMN id SET DEFAULT nextval('public.cache_metrics_id_seq'::regclass);


--
-- Name: campaign_events sequence_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_events ALTER COLUMN sequence_number SET DEFAULT nextval('public.campaign_events_sequence_number_seq'::regclass);


--
-- Name: campaign_state_events sequence_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events ALTER COLUMN sequence_number SET DEFAULT nextval('public.campaign_state_events_sequence_number_seq'::regclass);


--
-- Name: connection_pool_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_pool_metrics ALTER COLUMN id SET DEFAULT nextval('public.connection_pool_metrics_id_seq'::regclass);


--
-- Name: event_store id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store ALTER COLUMN id SET DEFAULT nextval('public.event_store_id_seq'::regclass);


--
-- Name: pagination_performance_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagination_performance_metrics ALTER COLUMN id SET DEFAULT nextval('public.pagination_performance_metrics_id_seq'::regclass);


--
-- Name: rate_limits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits ALTER COLUMN id SET DEFAULT nextval('public.rate_limits_id_seq'::regclass);


--
-- Name: architecture_refactor_log architecture_refactor_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.architecture_refactor_log
    ADD CONSTRAINT architecture_refactor_log_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_audit_logs auth_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: authorization_decisions authorization_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_pkey PRIMARY KEY (id);


--
-- Name: cache_configurations cache_configurations_cache_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_configurations
    ADD CONSTRAINT cache_configurations_cache_name_key UNIQUE (cache_name);


--
-- Name: cache_configurations cache_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_configurations
    ADD CONSTRAINT cache_configurations_pkey PRIMARY KEY (id);


--
-- Name: cache_entries cache_entries_cache_configuration_id_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_cache_configuration_id_cache_key_key UNIQUE (cache_configuration_id, cache_key);


--
-- Name: cache_entries cache_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_pkey PRIMARY KEY (id);


--
-- Name: cache_invalidation_log cache_invalidation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_invalidation_log
    ADD CONSTRAINT cache_invalidation_log_pkey PRIMARY KEY (id);


--
-- Name: cache_invalidations cache_invalidations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_invalidations
    ADD CONSTRAINT cache_invalidations_pkey PRIMARY KEY (id);


--
-- Name: cache_metrics cache_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_metrics
    ADD CONSTRAINT cache_metrics_pkey PRIMARY KEY (id);


--
-- Name: campaign_access_grants campaign_access_grants_campaign_id_user_id_access_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_campaign_id_user_id_access_type_key UNIQUE (campaign_id, user_id, access_type);


--
-- Name: campaign_access_grants campaign_access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_pkey PRIMARY KEY (id);


--
-- Name: campaign_domain_counters campaign_domain_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_domain_counters
    ADD CONSTRAINT campaign_domain_counters_pkey PRIMARY KEY (campaign_id);


--
-- Name: campaign_events campaign_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_events
    ADD CONSTRAINT campaign_events_pkey PRIMARY KEY (event_id);


--
-- Name: campaign_jobs campaign_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_jobs
    ADD CONSTRAINT campaign_jobs_pkey PRIMARY KEY (id);


--
-- Name: campaign_phases campaign_phases_campaign_id_phase_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_phases
    ADD CONSTRAINT campaign_phases_campaign_id_phase_order_key UNIQUE (campaign_id, phase_order);


--
-- Name: campaign_phases campaign_phases_campaign_id_phase_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_phases
    ADD CONSTRAINT campaign_phases_campaign_id_phase_type_key UNIQUE (campaign_id, phase_type);


--
-- Name: campaign_phases campaign_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_phases
    ADD CONSTRAINT campaign_phases_pkey PRIMARY KEY (id);


--
-- Name: campaign_scoring_profile campaign_scoring_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_scoring_profile
    ADD CONSTRAINT campaign_scoring_profile_pkey PRIMARY KEY (campaign_id);


--
-- Name: campaign_state_events campaign_state_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT campaign_state_events_pkey PRIMARY KEY (id);


--
-- Name: campaign_state_snapshots campaign_state_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT campaign_state_snapshots_pkey PRIMARY KEY (id);


--
-- Name: campaign_state_transitions campaign_state_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_pkey PRIMARY KEY (id);


--
-- Name: campaign_states campaign_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_states
    ADD CONSTRAINT campaign_states_pkey PRIMARY KEY (campaign_id);


--
-- Name: communication_patterns communication_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_patterns
    ADD CONSTRAINT communication_patterns_pkey PRIMARY KEY (id);


--
-- Name: config_locks config_locks_lock_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_locks
    ADD CONSTRAINT config_locks_lock_name_key UNIQUE (lock_name);


--
-- Name: config_locks config_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_locks
    ADD CONSTRAINT config_locks_pkey PRIMARY KEY (id);


--
-- Name: config_versions config_versions_config_key_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_config_key_version_number_key UNIQUE (config_key, version_number);


--
-- Name: config_versions config_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_pkey PRIMARY KEY (id);


--
-- Name: connection_pool_metrics connection_pool_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_pool_metrics
    ADD CONSTRAINT connection_pool_metrics_pkey PRIMARY KEY (id);


--
-- Name: dns_validation_results dns_validation_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_pkey PRIMARY KEY (id);


--
-- Name: domain_extracted_keywords domain_extracted_keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_extracted_keywords
    ADD CONSTRAINT domain_extracted_keywords_pkey PRIMARY KEY (campaign_id, domain_id, keyword_id);


--
-- Name: domain_extraction_features domain_extraction_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_extraction_features
    ADD CONSTRAINT domain_extraction_features_pkey PRIMARY KEY (campaign_id, domain_id);


--
-- Name: domain_generation_campaign_params domain_generation_campaign_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_campaign_params
    ADD CONSTRAINT domain_generation_campaign_params_pkey PRIMARY KEY (campaign_id);


--
-- Name: domain_generation_config_states domain_generation_config_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_config_states
    ADD CONSTRAINT domain_generation_config_states_pkey PRIMARY KEY (config_hash);


--
-- Name: event_projections event_projections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_projections
    ADD CONSTRAINT event_projections_pkey PRIMARY KEY (id);


--
-- Name: event_projections event_projections_projection_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_projections
    ADD CONSTRAINT event_projections_projection_name_key UNIQUE (projection_name);


--
-- Name: event_store event_store_aggregate_id_aggregate_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_aggregate_id_aggregate_version_key UNIQUE (aggregate_id, aggregate_version);


--
-- Name: event_store event_store_aggregate_id_sequence_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_aggregate_id_sequence_number_key UNIQUE (aggregate_id, sequence_number);


--
-- Name: event_store event_store_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_event_id_key UNIQUE (event_id);


--
-- Name: event_store event_store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_pkey PRIMARY KEY (id);


--
-- Name: generated_domains generated_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT generated_domains_pkey PRIMARY KEY (id);


--
-- Name: http_keyword_results http_keyword_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_pkey PRIMARY KEY (id);


--
-- Name: keyword_rules keyword_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_rules
    ADD CONSTRAINT keyword_rules_pkey PRIMARY KEY (id);


--
-- Name: keyword_sets keyword_sets_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_sets
    ADD CONSTRAINT keyword_sets_name_key UNIQUE (name);


--
-- Name: keyword_sets keyword_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_sets
    ADD CONSTRAINT keyword_sets_pkey PRIMARY KEY (id);


--
-- Name: lead_generation_campaigns lead_generation_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_generation_campaigns
    ADD CONSTRAINT lead_generation_campaigns_pkey PRIMARY KEY (id);


--
-- Name: CONSTRAINT lead_generation_campaigns_pkey ON lead_generation_campaigns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT lead_generation_campaigns_pkey ON public.lead_generation_campaigns IS 'Primary key for campaigns - central entity referenced by domain, job, and audit tables';


--
-- Name: pagination_performance_metrics pagination_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagination_performance_metrics
    ADD CONSTRAINT pagination_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: personas personas_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_name_key UNIQUE (name);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id);


--
-- Name: phase_configurations phase_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phase_configurations
    ADD CONSTRAINT phase_configurations_pkey PRIMARY KEY (campaign_id, phase);


--
-- Name: phase_executions phase_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phase_executions
    ADD CONSTRAINT phase_executions_pkey PRIMARY KEY (id);


--
-- Name: phase_runs phase_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phase_runs
    ADD CONSTRAINT phase_runs_pkey PRIMARY KEY (id);


--
-- Name: proxies proxies_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_name_key UNIQUE (name);


--
-- Name: proxies proxies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_pkey PRIMARY KEY (id);


--
-- Name: proxy_pool_memberships proxy_pool_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pool_memberships
    ADD CONSTRAINT proxy_pool_memberships_pkey PRIMARY KEY (pool_id, proxy_id);


--
-- Name: proxy_pools proxy_pools_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pools
    ADD CONSTRAINT proxy_pools_name_key UNIQUE (name);


--
-- Name: proxy_pools proxy_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pools
    ADD CONSTRAINT proxy_pools_pkey PRIMARY KEY (id);


--
-- Name: query_performance_metrics query_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_performance_metrics
    ADD CONSTRAINT query_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_identifier_action_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_identifier_action_key UNIQUE (identifier, action);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: resource_utilization_metrics resource_utilization_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_utilization_metrics
    ADD CONSTRAINT resource_utilization_metrics_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: scoring_profile_snapshots scoring_profile_snapshots_campaign_id_profile_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_profile_snapshots
    ADD CONSTRAINT scoring_profile_snapshots_campaign_id_profile_version_key UNIQUE (campaign_id, profile_version);


--
-- Name: scoring_profile_snapshots scoring_profile_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_profile_snapshots
    ADD CONSTRAINT scoring_profile_snapshots_pkey PRIMARY KEY (id);


--
-- Name: scoring_profiles scoring_profiles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_profiles
    ADD CONSTRAINT scoring_profiles_name_key UNIQUE (name);


--
-- Name: scoring_profiles scoring_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_profiles
    ADD CONSTRAINT scoring_profiles_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: service_architecture_metrics service_architecture_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_architecture_metrics
    ADD CONSTRAINT service_architecture_metrics_pkey PRIMARY KEY (id);


--
-- Name: service_capacity_metrics service_capacity_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_capacity_metrics
    ADD CONSTRAINT service_capacity_metrics_pkey PRIMARY KEY (id);


--
-- Name: service_dependencies service_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_pkey PRIMARY KEY (id);


--
-- Name: service_dependencies service_dependencies_source_service_target_service_dependen_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_source_service_target_service_dependen_key UNIQUE (source_service, target_service, dependency_type, environment);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: phase_executions unique_campaign_phase; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phase_executions
    ADD CONSTRAINT unique_campaign_phase UNIQUE (campaign_id, phase_type);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: CONSTRAINT users_pkey ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT users_pkey ON public.users IS 'Primary key for users table - referenced by most other tables for user tracking';


--
-- Name: idx_analysis_ready_features_campaign_ready; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analysis_ready_features_campaign_ready ON public.domain_extraction_features USING btree (campaign_id, processing_state) WHERE ((processing_state = 'ready'::public.extraction_processing_state_enum) AND (feature_vector IS NOT NULL));


--
-- Name: idx_architecture_refactor_log_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_architecture_refactor_log_approved_by ON public.architecture_refactor_log USING btree (approved_by) WHERE (approved_by IS NOT NULL);


--
-- Name: idx_architecture_refactor_log_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_architecture_refactor_log_campaign_id ON public.architecture_refactor_log USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_architecture_refactor_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_architecture_refactor_log_created_at ON public.architecture_refactor_log USING btree (created_at);


--
-- Name: idx_architecture_refactor_log_dependencies_changed_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_architecture_refactor_log_dependencies_changed_gin ON public.architecture_refactor_log USING gin (dependencies_changed) WHERE (dependencies_changed IS NOT NULL);


--
-- Name: idx_architecture_refactor_log_initiated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_architecture_refactor_log_initiated_by ON public.architecture_refactor_log USING btree (initiated_by) WHERE (initiated_by IS NOT NULL);


--
-- Name: idx_architecture_refactor_log_refactor_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_architecture_refactor_log_refactor_type ON public.architecture_refactor_log USING btree (refactor_type);


--
-- Name: idx_architecture_refactor_log_risk_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_architecture_refactor_log_risk_level ON public.architecture_refactor_log USING btree (risk_level);


--
-- Name: idx_architecture_refactor_log_services_affected_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_architecture_refactor_log_services_affected_gin ON public.architecture_refactor_log USING gin (services_affected);


--
-- Name: idx_architecture_refactor_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_architecture_refactor_log_status ON public.architecture_refactor_log USING btree (status);


--
-- Name: idx_archival_candidates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_archival_candidates ON public.event_store USING btree (archived, event_timestamp) WHERE (archived = false);


--
-- Name: idx_audit_cursor_forward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_cursor_forward ON public.audit_logs USING btree ("timestamp", id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_action_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action_timestamp ON public.audit_logs USING btree (action, "timestamp" DESC);


--
-- Name: idx_audit_logs_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_campaign_id ON public.audit_logs USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_audit_logs_campaign_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_campaign_phase ON public.audit_logs USING btree (campaign_phase) WHERE (campaign_phase IS NOT NULL);


--
-- Name: idx_audit_logs_campaign_timeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_campaign_timeline ON public.audit_logs USING btree (entity_id, "timestamp" DESC, action) WHERE ((entity_type)::text = 'campaign'::text);


--
-- Name: idx_audit_logs_campaign_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_campaign_timestamp ON public.audit_logs USING btree (campaign_id, "timestamp" DESC) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_audit_logs_client_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_client_ip ON public.audit_logs USING btree (client_ip) WHERE (client_ip IS NOT NULL);


--
-- Name: idx_audit_logs_compliance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_compliance ON public.audit_logs USING btree ("timestamp", action, user_id);


--
-- Name: idx_audit_logs_compliance_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_compliance_tags_gin ON public.audit_logs USING gin (compliance_tags) WHERE (compliance_tags IS NOT NULL);


--
-- Name: idx_audit_logs_daily; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_daily ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_audit_logs_data_classification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_data_classification ON public.audit_logs USING btree (data_classification) WHERE (data_classification IS NOT NULL);


--
-- Name: idx_audit_logs_details_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_details_gin ON public.audit_logs USING gin (details) WHERE (details IS NOT NULL);


--
-- Name: idx_audit_logs_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_endpoint ON public.audit_logs USING btree (endpoint) WHERE (endpoint IS NOT NULL);


--
-- Name: idx_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs USING btree (entity_id) WHERE (entity_id IS NOT NULL);


--
-- Name: idx_audit_logs_entity_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_timestamp ON public.audit_logs USING btree (entity_type, entity_id, "timestamp" DESC) WHERE ((entity_type IS NOT NULL) AND (entity_id IS NOT NULL));


--
-- Name: idx_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type) WHERE (entity_type IS NOT NULL);


--
-- Name: idx_audit_logs_error_responses; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_error_responses ON public.audit_logs USING btree (response_status, "timestamp") WHERE (response_status >= 400);


--
-- Name: idx_audit_logs_failed_requests; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_failed_requests ON public.audit_logs USING btree (endpoint, response_status, "timestamp") WHERE ((response_status >= 400) AND (endpoint IS NOT NULL));


--
-- Name: idx_audit_logs_http_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_http_method ON public.audit_logs USING btree (http_method) WHERE (http_method IS NOT NULL);


--
-- Name: idx_audit_logs_ip_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_ip_timestamp ON public.audit_logs USING btree (client_ip, "timestamp" DESC) WHERE (client_ip IS NOT NULL);


--
-- Name: idx_audit_logs_long_requests; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_long_requests ON public.audit_logs USING btree (execution_time_ms, "timestamp") WHERE (execution_time_ms > 5000);


--
-- Name: idx_audit_logs_monthly; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_monthly ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_audit_logs_old_records; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_old_records ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_audit_logs_request_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_request_correlation ON public.audit_logs USING btree (request_id, "timestamp") WHERE (request_id IS NOT NULL);


--
-- Name: idx_audit_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_request_id ON public.audit_logs USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_audit_logs_response_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_response_status ON public.audit_logs USING btree (response_status) WHERE (response_status IS NOT NULL);


--
-- Name: idx_audit_logs_retention_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_retention_policy ON public.audit_logs USING btree (retention_policy, "timestamp") WHERE (retention_policy IS NOT NULL);


--
-- Name: idx_audit_logs_security_events; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_security_events ON public.audit_logs USING btree (action, client_ip, "timestamp") WHERE ((action)::text = ANY ((ARRAY['login_failed'::character varying, 'account_locked'::character varying, 'permission_denied'::character varying, 'suspicious_activity'::character varying])::text[]));


--
-- Name: idx_audit_logs_service_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_service_name ON public.audit_logs USING btree (service_name) WHERE (service_name IS NOT NULL);


--
-- Name: idx_audit_logs_service_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_service_timestamp ON public.audit_logs USING btree (service_name, "timestamp" DESC) WHERE (service_name IS NOT NULL);


--
-- Name: idx_audit_logs_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_session_id ON public.audit_logs USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_audit_logs_slow_endpoints; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_slow_endpoints ON public.audit_logs USING btree (endpoint, execution_time_ms, "timestamp") WHERE ((execution_time_ms > 1000) AND (endpoint IS NOT NULL));


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_audit_logs_trail_reconstruction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_trail_reconstruction ON public.audit_logs USING btree (entity_type, entity_id, "timestamp") WHERE ((entity_type IS NOT NULL) AND (entity_id IS NOT NULL));


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_audit_logs_user_timeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_timeline ON public.audit_logs USING btree (user_id, "timestamp" DESC, action) WHERE (user_id IS NOT NULL);


--
-- Name: idx_audit_logs_user_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_timestamp ON public.audit_logs USING btree (user_id, "timestamp" DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_auth_audit_logs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_action_type ON public.auth_audit_logs USING btree (action_type);


--
-- Name: idx_auth_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_created_at ON public.auth_audit_logs USING btree (created_at);


--
-- Name: idx_auth_audit_logs_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_event_type ON public.auth_audit_logs USING btree (event_type);


--
-- Name: idx_auth_audit_logs_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_ip_address ON public.auth_audit_logs USING btree (ip_address);


--
-- Name: idx_auth_audit_logs_risk_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_risk_score ON public.auth_audit_logs USING btree (risk_score) WHERE (risk_score > 50);


--
-- Name: idx_auth_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_logs_user_id ON public.auth_audit_logs USING btree (user_id);


--
-- Name: idx_auth_audit_security; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_audit_security ON public.auth_audit_logs USING btree (user_id, event_type, created_at DESC, ip_address) WHERE ((event_type)::text = ANY ((ARRAY['login_failed'::character varying, 'suspicious_activity'::character varying])::text[]));


--
-- Name: idx_authorization_decisions_additional_context_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_additional_context_gin ON public.authorization_decisions USING gin (additional_context) WHERE (additional_context IS NOT NULL);


--
-- Name: idx_authorization_decisions_cache_hit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_cache_hit ON public.authorization_decisions USING btree (cache_hit);


--
-- Name: idx_authorization_decisions_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_campaign_id ON public.authorization_decisions USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_authorization_decisions_compliance_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_compliance_tags_gin ON public.authorization_decisions USING gin (compliance_tags) WHERE (compliance_tags IS NOT NULL);


--
-- Name: idx_authorization_decisions_conditions_met_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_conditions_met_gin ON public.authorization_decisions USING gin (conditions_met) WHERE (conditions_met IS NOT NULL);


--
-- Name: idx_authorization_decisions_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_decision ON public.authorization_decisions USING btree (decision);


--
-- Name: idx_authorization_decisions_decision_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_decision_timestamp ON public.authorization_decisions USING btree (decision_timestamp);


--
-- Name: idx_authorization_decisions_denied_access; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_denied_access ON public.authorization_decisions USING btree (decision, decision_timestamp DESC) WHERE (decision = 'deny'::public.authorization_decision_enum);


--
-- Name: idx_authorization_decisions_follow_up_required; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_follow_up_required ON public.authorization_decisions USING btree (follow_up_required) WHERE (follow_up_required = true);


--
-- Name: idx_authorization_decisions_permissions_checked_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_permissions_checked_gin ON public.authorization_decisions USING gin (permissions_checked) WHERE (permissions_checked IS NOT NULL);


--
-- Name: idx_authorization_decisions_resource_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_resource_decision ON public.authorization_decisions USING btree (resource_type, resource_id, decision, decision_timestamp DESC) WHERE (resource_id IS NOT NULL);


--
-- Name: idx_authorization_decisions_resource_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_resource_id ON public.authorization_decisions USING btree (resource_id) WHERE (resource_id IS NOT NULL);


--
-- Name: idx_authorization_decisions_resource_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_resource_type ON public.authorization_decisions USING btree (resource_type);


--
-- Name: idx_authorization_decisions_reviewed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_reviewed ON public.authorization_decisions USING btree (reviewed) WHERE (reviewed = false);


--
-- Name: idx_authorization_decisions_risk_factors_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_risk_factors_gin ON public.authorization_decisions USING gin (risk_factors) WHERE (risk_factors IS NOT NULL);


--
-- Name: idx_authorization_decisions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_session_id ON public.authorization_decisions USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_authorization_decisions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_user_id ON public.authorization_decisions USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_authorization_decisions_user_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authorization_decisions_user_resource ON public.authorization_decisions USING btree (user_id, resource_type, decision_timestamp DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_cache_configurations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_configurations_active ON public.cache_configurations USING btree (active) WHERE (active = true);


--
-- Name: idx_cache_configurations_cache_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_configurations_cache_name ON public.cache_configurations USING btree (cache_name);


--
-- Name: idx_cache_configurations_cache_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_configurations_cache_type ON public.cache_configurations USING btree (cache_type);


--
-- Name: idx_cache_configurations_connection_config_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_configurations_connection_config_gin ON public.cache_configurations USING gin (connection_config) WHERE (connection_config IS NOT NULL);


--
-- Name: idx_cache_configurations_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_configurations_created_by ON public.cache_configurations USING btree (created_by) WHERE (created_by IS NOT NULL);


--
-- Name: idx_cache_configurations_environment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_configurations_environment ON public.cache_configurations USING btree (environment);


--
-- Name: idx_cache_configurations_eviction_policy_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_configurations_eviction_policy_gin ON public.cache_configurations USING gin (eviction_policy) WHERE (eviction_policy IS NOT NULL);


--
-- Name: idx_cache_configurations_service_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_configurations_service_name ON public.cache_configurations USING btree (service_name) WHERE (service_name IS NOT NULL);


--
-- Name: idx_cache_entries_access_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_access_count ON public.cache_entries USING btree (access_count);


--
-- Name: idx_cache_entries_cache_configuration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_cache_configuration_id ON public.cache_entries USING btree (cache_configuration_id);


--
-- Name: idx_cache_entries_cache_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_cache_key ON public.cache_entries USING btree (cache_key);


--
-- Name: idx_cache_entries_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_campaign_id ON public.cache_entries USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_cache_entries_config_key_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_config_key_status ON public.cache_entries USING btree (cache_configuration_id, cache_key, status);


--
-- Name: idx_cache_entries_config_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_config_status ON public.cache_entries USING btree (cache_configuration_id, status);


--
-- Name: idx_cache_entries_dependency_keys_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_dependency_keys_gin ON public.cache_entries USING gin (dependency_keys) WHERE (dependency_keys IS NOT NULL);


--
-- Name: idx_cache_entries_expiration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_expiration ON public.cache_entries USING btree (expires_at, status) WHERE ((status = 'active'::public.cache_entry_status_enum) AND (expires_at IS NOT NULL));


--
-- Name: idx_cache_entries_expired; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_expired ON public.cache_entries USING btree (expires_at, status) WHERE (status = 'active'::public.cache_entry_status_enum);


--
-- Name: idx_cache_entries_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_expires_at ON public.cache_entries USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_cache_entries_invalidation_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_invalidation_tags_gin ON public.cache_entries USING gin (invalidation_tags) WHERE (invalidation_tags IS NOT NULL);


--
-- Name: idx_cache_entries_last_accessed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_last_accessed_at ON public.cache_entries USING btree (last_accessed_at);


--
-- Name: idx_cache_entries_locked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_locked ON public.cache_entries USING btree (locked) WHERE (locked = true);


--
-- Name: idx_cache_entries_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_lookup ON public.cache_entries USING btree (cache_configuration_id, cache_key) INCLUDE (cache_value, expires_at, status);


--
-- Name: idx_cache_entries_lru_eviction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_lru_eviction ON public.cache_entries USING btree (cache_configuration_id, last_accessed_at) WHERE (status = 'active'::public.cache_entry_status_enum);


--
-- Name: idx_cache_entries_size_bytes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_size_bytes ON public.cache_entries USING btree (size_bytes);


--
-- Name: idx_cache_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_status ON public.cache_entries USING btree (status);


--
-- Name: idx_cache_entries_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_user_id ON public.cache_entries USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_cache_invalidation_log_automatic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_log_automatic ON public.cache_invalidation_log USING btree (automatic);


--
-- Name: idx_cache_invalidation_log_cache_configuration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_log_cache_configuration_id ON public.cache_invalidation_log USING btree (cache_configuration_id);


--
-- Name: idx_cache_invalidation_log_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_log_campaign_id ON public.cache_invalidation_log USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_cache_invalidation_log_invalidated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_log_invalidated_at ON public.cache_invalidation_log USING btree (invalidated_at);


--
-- Name: idx_cache_invalidation_log_invalidation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_log_invalidation_type ON public.cache_invalidation_log USING btree (invalidation_type);


--
-- Name: idx_cache_invalidation_log_keys_invalidated_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_log_keys_invalidated_gin ON public.cache_invalidation_log USING gin (keys_invalidated) WHERE (keys_invalidated IS NOT NULL);


--
-- Name: idx_cache_invalidation_log_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_log_success ON public.cache_invalidation_log USING btree (success) WHERE (success = false);


--
-- Name: idx_cache_invalidation_log_tags_used_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_log_tags_used_gin ON public.cache_invalidation_log USING gin (tags_used) WHERE (tags_used IS NOT NULL);


--
-- Name: idx_cache_invalidation_log_triggered_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_log_triggered_by ON public.cache_invalidation_log USING btree (triggered_by) WHERE (triggered_by IS NOT NULL);


--
-- Name: idx_cache_invalidations_cache_configuration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_cache_configuration_id ON public.cache_invalidations USING btree (cache_configuration_id);


--
-- Name: idx_cache_invalidations_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_campaign_id ON public.cache_invalidations USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_cache_invalidations_depends_on; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_depends_on ON public.cache_invalidations USING btree (depends_on) WHERE (depends_on IS NOT NULL);


--
-- Name: idx_cache_invalidations_invalidation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_invalidation_type ON public.cache_invalidations USING btree (invalidation_type);


--
-- Name: idx_cache_invalidations_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_pending ON public.cache_invalidations USING btree (status, priority DESC, scheduled_for) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_cache_invalidations_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_priority ON public.cache_invalidations USING btree (priority);


--
-- Name: idx_cache_invalidations_processing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_processing ON public.cache_invalidations USING btree (status, processed_at) WHERE ((status)::text = 'processing'::text);


--
-- Name: idx_cache_invalidations_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_requested_by ON public.cache_invalidations USING btree (requested_by) WHERE (requested_by IS NOT NULL);


--
-- Name: idx_cache_invalidations_scheduled_for; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_scheduled_for ON public.cache_invalidations USING btree (scheduled_for);


--
-- Name: idx_cache_invalidations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_status ON public.cache_invalidations USING btree (status);


--
-- Name: idx_cache_invalidations_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidations_tags_gin ON public.cache_invalidations USING gin (tags) WHERE (tags IS NOT NULL);


--
-- Name: idx_cache_metrics_analysis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_analysis ON public.cache_metrics USING btree (cache_configuration_id, period_end DESC, hit_ratio);


--
-- Name: idx_cache_metrics_cache_configuration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_cache_configuration_id ON public.cache_metrics USING btree (cache_configuration_id);


--
-- Name: idx_cache_metrics_config_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_config_period ON public.cache_metrics USING btree (cache_configuration_id, period_start DESC);


--
-- Name: idx_cache_metrics_environment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_environment ON public.cache_metrics USING btree (environment) WHERE (environment IS NOT NULL);


--
-- Name: idx_cache_metrics_hit_ratio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_hit_ratio ON public.cache_metrics USING btree (hit_ratio);


--
-- Name: idx_cache_metrics_performance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_performance ON public.cache_metrics USING btree (cache_configuration_id, hit_ratio DESC, avg_response_time_ms);


--
-- Name: idx_cache_metrics_period_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_period_end ON public.cache_metrics USING btree (period_end);


--
-- Name: idx_cache_metrics_period_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_period_start ON public.cache_metrics USING btree (period_start);


--
-- Name: idx_cache_metrics_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_recorded_at ON public.cache_metrics USING btree (recorded_at);


--
-- Name: idx_cache_metrics_service_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_service_name ON public.cache_metrics USING btree (service_name) WHERE (service_name IS NOT NULL);


--
-- Name: idx_campaign_access_grants_access_pattern_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_access_pattern_gin ON public.campaign_access_grants USING gin (access_pattern) WHERE (access_pattern IS NOT NULL);


--
-- Name: idx_campaign_access_grants_access_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_access_type ON public.campaign_access_grants USING btree (access_type);


--
-- Name: idx_campaign_access_grants_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_active ON public.campaign_access_grants USING btree (active) WHERE (active = true);


--
-- Name: idx_campaign_access_grants_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_campaign_id ON public.campaign_access_grants USING btree (campaign_id);


--
-- Name: idx_campaign_access_grants_campaign_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_campaign_type ON public.campaign_access_grants USING btree (campaign_id, access_type, active) WHERE (active = true);


--
-- Name: idx_campaign_access_grants_can_delegate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_can_delegate ON public.campaign_access_grants USING btree (can_delegate) WHERE (can_delegate = true);


--
-- Name: idx_campaign_access_grants_conditions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_conditions_gin ON public.campaign_access_grants USING gin (conditions) WHERE (conditions IS NOT NULL);


--
-- Name: idx_campaign_access_grants_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_expires_at ON public.campaign_access_grants USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_campaign_access_grants_expiring_soon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_expiring_soon ON public.campaign_access_grants USING btree (expires_at, active) WHERE ((expires_at IS NOT NULL) AND (active = true));


--
-- Name: idx_campaign_access_grants_granted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_granted_at ON public.campaign_access_grants USING btree (granted_at);


--
-- Name: idx_campaign_access_grants_granted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_granted_by ON public.campaign_access_grants USING btree (granted_by);


--
-- Name: idx_campaign_access_grants_inherited_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_inherited_from ON public.campaign_access_grants USING btree (inherited_from) WHERE (inherited_from IS NOT NULL);


--
-- Name: idx_campaign_access_grants_ip_restrictions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_ip_restrictions_gin ON public.campaign_access_grants USING gin (ip_restrictions) WHERE (ip_restrictions IS NOT NULL);


--
-- Name: idx_campaign_access_grants_last_used_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_last_used_at ON public.campaign_access_grants USING btree (last_used_at) WHERE (last_used_at IS NOT NULL);


--
-- Name: idx_campaign_access_grants_phase_restrictions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_phase_restrictions_gin ON public.campaign_access_grants USING gin (phase_restrictions) WHERE (phase_restrictions IS NOT NULL);


--
-- Name: idx_campaign_access_grants_revoked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_revoked ON public.campaign_access_grants USING btree (revoked) WHERE (revoked = true);


--
-- Name: idx_campaign_access_grants_time_restrictions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_time_restrictions_gin ON public.campaign_access_grants USING gin (time_restrictions) WHERE (time_restrictions IS NOT NULL);


--
-- Name: idx_campaign_access_grants_user_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_user_campaign ON public.campaign_access_grants USING btree (user_id, campaign_id, active) WHERE (active = true);


--
-- Name: idx_campaign_access_grants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_access_grants_user_id ON public.campaign_access_grants USING btree (user_id);


--
-- Name: idx_campaign_audit_join; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_audit_join ON public.audit_logs USING btree (entity_id, entity_type) INCLUDE (user_id, action, "timestamp") WHERE ((entity_type)::text = 'campaign'::text);


--
-- Name: idx_campaign_domains_join; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_domains_join ON public.generated_domains USING btree (campaign_id) INCLUDE (id, domain_name, dns_status, created_at);


--
-- Name: idx_campaign_events_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_events_campaign_id ON public.campaign_events USING btree (campaign_id);


--
-- Name: idx_campaign_events_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_events_sequence ON public.campaign_events USING btree (sequence_number);


--
-- Name: idx_campaign_jobs_business_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_business_status ON public.campaign_jobs USING btree (business_status) WHERE (business_status IS NOT NULL);


--
-- Name: idx_campaign_jobs_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_campaign_id ON public.campaign_jobs USING btree (campaign_id);


--
-- Name: idx_campaign_jobs_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_completed ON public.campaign_jobs USING btree (campaign_id, job_type, updated_at) WHERE (status = 'completed'::public.campaign_job_status_enum);


--
-- Name: idx_campaign_jobs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_created_at ON public.campaign_jobs USING btree (created_at);


--
-- Name: idx_campaign_jobs_failed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_failed ON public.campaign_jobs USING btree (campaign_id, job_type, last_attempted_at) WHERE (status = 'failed'::public.campaign_job_status_enum);


--
-- Name: idx_campaign_jobs_job_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_job_type ON public.campaign_jobs USING btree (job_type);


--
-- Name: idx_campaign_jobs_join; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_join ON public.campaign_jobs USING btree (campaign_id) INCLUDE (id, job_type, status, created_at, attempts);


--
-- Name: idx_campaign_jobs_last_attempted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_last_attempted_at ON public.campaign_jobs USING btree (last_attempted_at) WHERE (last_attempted_at IS NOT NULL);


--
-- Name: idx_campaign_jobs_locked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_locked_at ON public.campaign_jobs USING btree (locked_at) WHERE (locked_at IS NOT NULL);


--
-- Name: idx_campaign_jobs_locked_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_locked_by ON public.campaign_jobs USING btree (locked_by) WHERE (locked_by IS NOT NULL);


--
-- Name: idx_campaign_jobs_long_running; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_long_running ON public.campaign_jobs USING btree (locked_at, job_type) WHERE (status = 'running'::public.campaign_job_status_enum);


--
-- Name: idx_campaign_jobs_next_execution_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_next_execution_at ON public.campaign_jobs USING btree (next_execution_at) WHERE (next_execution_at IS NOT NULL);


--
-- Name: idx_campaign_jobs_next_queued; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_next_queued ON public.campaign_jobs USING btree (status, scheduled_at, created_at) WHERE (status = 'queued'::public.campaign_job_status_enum);


--
-- Name: idx_campaign_jobs_payload_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_payload_gin ON public.campaign_jobs USING gin (job_payload) WHERE (job_payload IS NOT NULL);


--
-- Name: idx_campaign_jobs_processing_server; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_processing_server ON public.campaign_jobs USING btree (processing_server_id, status, updated_at) WHERE ((processing_server_id IS NOT NULL) AND (status = 'running'::public.campaign_job_status_enum));


--
-- Name: idx_campaign_jobs_processing_server_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_processing_server_id ON public.campaign_jobs USING btree (processing_server_id) WHERE (processing_server_id IS NOT NULL);


--
-- Name: idx_campaign_jobs_queue_worker_selection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_queue_worker_selection ON public.campaign_jobs USING btree (COALESCE(scheduled_at, '1970-01-01 00:00:00+00'::timestamp with time zone), created_at) WHERE ((status = 'queued'::public.campaign_job_status_enum) OR (business_status = 'retry'::public.job_business_status_enum));


--
-- Name: idx_campaign_jobs_retry_candidates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_retry_candidates ON public.campaign_jobs USING btree (attempts, max_attempts, last_attempted_at) WHERE ((status = 'failed'::public.campaign_job_status_enum) AND (attempts < max_attempts));


--
-- Name: idx_campaign_jobs_retry_ready; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_retry_ready ON public.campaign_jobs USING btree (business_status, next_execution_at) WHERE (business_status = 'retry'::public.job_business_status_enum);


--
-- Name: idx_campaign_jobs_running; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_running ON public.campaign_jobs USING btree (processing_server_id, locked_at) WHERE (status = 'running'::public.campaign_job_status_enum);


--
-- Name: idx_campaign_jobs_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_scheduled_at ON public.campaign_jobs USING btree (scheduled_at);


--
-- Name: idx_campaign_jobs_stale_running; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_stale_running ON public.campaign_jobs USING btree (locked_at, processing_server_id) WHERE (status = 'running'::public.campaign_job_status_enum);


--
-- Name: idx_campaign_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_status ON public.campaign_jobs USING btree (status);


--
-- Name: idx_campaign_jobs_status_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_status_scheduled ON public.campaign_jobs USING btree (status, scheduled_at) WHERE (status = ANY (ARRAY['queued'::public.campaign_job_status_enum, 'pending'::public.campaign_job_status_enum]));


--
-- Name: idx_campaign_jobs_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_type_status ON public.campaign_jobs USING btree (job_type, status, scheduled_at) WHERE (status = ANY (ARRAY['queued'::public.campaign_job_status_enum, 'pending'::public.campaign_job_status_enum]));


--
-- Name: idx_campaign_jobs_unique_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_campaign_jobs_unique_pending ON public.campaign_jobs USING btree (campaign_id, job_type) WHERE (status = ANY (ARRAY['pending'::public.campaign_job_status_enum, 'queued'::public.campaign_job_status_enum, 'running'::public.campaign_job_status_enum]));


--
-- Name: idx_campaign_jobs_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_updated_at ON public.campaign_jobs USING btree (updated_at);


--
-- Name: idx_campaign_jobs_worker_processing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_worker_processing ON public.campaign_jobs USING btree (processing_server_id, status, created_at) WHERE (status = ANY (ARRAY['pending'::public.campaign_job_status_enum, 'running'::public.campaign_job_status_enum]));


--
-- Name: idx_campaign_phases_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_phases_campaign_id ON public.campaign_phases USING btree (campaign_id);


--
-- Name: idx_campaign_phases_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_phases_completed_at ON public.campaign_phases USING btree (completed_at) WHERE (completed_at IS NOT NULL);


--
-- Name: idx_campaign_phases_configuration_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_phases_configuration_gin ON public.campaign_phases USING gin (configuration) WHERE (configuration IS NOT NULL);


--
-- Name: idx_campaign_phases_phase_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_phases_phase_order ON public.campaign_phases USING btree (phase_order);


--
-- Name: idx_campaign_phases_phase_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_phases_phase_type ON public.campaign_phases USING btree (phase_type);


--
-- Name: idx_campaign_phases_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_phases_started_at ON public.campaign_phases USING btree (started_at) WHERE (started_at IS NOT NULL);


--
-- Name: idx_campaign_phases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_phases_status ON public.campaign_phases USING btree (status);


--
-- Name: idx_campaign_state_events_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_campaign_id ON public.campaign_state_events USING btree (campaign_id);


--
-- Name: idx_campaign_state_events_correlation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_correlation_id ON public.campaign_state_events USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_campaign_state_events_event_data_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_event_data_gin ON public.campaign_state_events USING gin (event_data);


--
-- Name: idx_campaign_state_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_event_type ON public.campaign_state_events USING btree (event_type);


--
-- Name: idx_campaign_state_events_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_occurred_at ON public.campaign_state_events USING btree (occurred_at);


--
-- Name: idx_campaign_state_events_operation_context_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_operation_context_gin ON public.campaign_state_events USING gin (operation_context);


--
-- Name: idx_campaign_state_events_processing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_processing_status ON public.campaign_state_events USING btree (processing_status);


--
-- Name: idx_campaign_state_events_sequence_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_sequence_number ON public.campaign_state_events USING btree (sequence_number);


--
-- Name: idx_campaign_state_events_sequence_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_campaign_state_events_sequence_unique ON public.campaign_state_events USING btree (campaign_id, sequence_number);


--
-- Name: idx_campaign_state_events_source_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_source_target ON public.campaign_state_events USING btree (source_state, target_state) WHERE ((source_state IS NOT NULL) AND (target_state IS NOT NULL));


--
-- Name: idx_campaign_state_snapshots_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_campaign_id ON public.campaign_state_snapshots USING btree (campaign_id);


--
-- Name: idx_campaign_state_snapshots_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_created_at ON public.campaign_state_snapshots USING btree (created_at);


--
-- Name: idx_campaign_state_snapshots_current_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_current_state ON public.campaign_state_snapshots USING btree (current_state);


--
-- Name: idx_campaign_state_snapshots_is_valid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_is_valid ON public.campaign_state_snapshots USING btree (is_valid) WHERE (is_valid = true);


--
-- Name: idx_campaign_state_snapshots_last_event_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_last_event_sequence ON public.campaign_state_snapshots USING btree (last_event_sequence);


--
-- Name: idx_campaign_state_snapshots_latest; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_campaign_state_snapshots_latest ON public.campaign_state_snapshots USING btree (campaign_id, created_at DESC);


--
-- Name: idx_campaign_state_snapshots_snapshot_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_snapshot_metadata_gin ON public.campaign_state_snapshots USING gin (snapshot_metadata);


--
-- Name: idx_campaign_state_snapshots_state_data_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_state_data_gin ON public.campaign_state_snapshots USING gin (state_data);


--
-- Name: idx_campaign_state_transitions_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_campaign_id ON public.campaign_state_transitions USING btree (campaign_id);


--
-- Name: idx_campaign_state_transitions_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_completed_at ON public.campaign_state_transitions USING btree (completed_at) WHERE (completed_at IS NOT NULL);


--
-- Name: idx_campaign_state_transitions_from_to_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_from_to_state ON public.campaign_state_transitions USING btree (from_state, to_state);


--
-- Name: idx_campaign_state_transitions_initiated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_initiated_at ON public.campaign_state_transitions USING btree (initiated_at);


--
-- Name: idx_campaign_state_transitions_is_valid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_is_valid ON public.campaign_state_transitions USING btree (is_valid_transition);


--
-- Name: idx_campaign_state_transitions_state_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_state_event_id ON public.campaign_state_transitions USING btree (state_event_id);


--
-- Name: idx_campaign_state_transitions_transition_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_transition_metadata_gin ON public.campaign_state_transitions USING gin (transition_metadata) WHERE (transition_metadata IS NOT NULL);


--
-- Name: idx_campaign_state_transitions_validation_errors_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_validation_errors_gin ON public.campaign_state_transitions USING gin (validation_errors) WHERE (validation_errors IS NOT NULL);


--
-- Name: idx_campaign_states_configuration_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_states_configuration_gin ON public.campaign_states USING gin (configuration);


--
-- Name: idx_campaign_states_current_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_states_current_state ON public.campaign_states USING btree (current_state);


--
-- Name: idx_campaign_states_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_states_mode ON public.campaign_states USING btree (mode);


--
-- Name: idx_campaign_states_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_states_updated_at ON public.campaign_states USING btree (updated_at);


--
-- Name: idx_campaigns_business_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_business_status ON public.lead_generation_campaigns USING btree (business_status, created_at DESC) WHERE (business_status IS NOT NULL);


--
-- Name: idx_campaigns_completion_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_completion_analytics ON public.lead_generation_campaigns USING btree (phase_status, completed_at, created_at) WHERE (completed_at IS NOT NULL);


--
-- Name: idx_campaigns_current_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_current_phase ON public.lead_generation_campaigns USING btree (current_phase);


--
-- Name: idx_campaigns_dashboard_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_dashboard_active ON public.lead_generation_campaigns USING btree (phase_status, created_at DESC) WHERE (phase_status = ANY (ARRAY['in_progress'::public.phase_status_enum, 'ready'::public.phase_status_enum]));


--
-- Name: idx_campaigns_name_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_name_search ON public.lead_generation_campaigns USING gin (to_tsvector('english'::regconfig, (name)::text));


--
-- Name: idx_campaigns_offset_pagination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_offset_pagination ON public.lead_generation_campaigns USING btree (created_at DESC, id) WHERE (phase_status IS NOT NULL);


--
-- Name: idx_campaigns_phase_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_phase_status ON public.lead_generation_campaigns USING btree (current_phase, phase_status, updated_at DESC);


--
-- Name: idx_campaigns_progress_percentage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_progress_percentage ON public.lead_generation_campaigns USING btree (progress_percentage DESC, phase_status, created_at DESC) WHERE (progress_percentage IS NOT NULL);


--
-- Name: idx_campaigns_progress_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_progress_tracking ON public.lead_generation_campaigns USING btree (id, current_phase, phase_status, total_items, processed_items);


--
-- Name: idx_campaigns_state_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_state_data ON public.lead_generation_campaigns USING gin (state_data);


--
-- Name: idx_campaigns_state_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_state_version ON public.lead_generation_campaigns USING btree (state_version);


--
-- Name: idx_campaigns_success_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_success_analytics ON public.lead_generation_campaigns USING btree (phase_status, created_at, completed_at) INCLUDE (total_items, processed_items);


--
-- Name: idx_campaigns_user_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_user_recent ON public.lead_generation_campaigns USING btree (user_id, created_at DESC, phase_status) WHERE (phase_status IS NOT NULL);


--
-- Name: idx_communication_patterns_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_patterns_campaign_id ON public.communication_patterns USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_communication_patterns_environment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_patterns_environment ON public.communication_patterns USING btree (environment);


--
-- Name: idx_communication_patterns_last_observed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_patterns_last_observed ON public.communication_patterns USING btree (last_observed);


--
-- Name: idx_communication_patterns_low_success_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_patterns_low_success_rate ON public.communication_patterns USING btree (success_rate_percent, last_observed DESC) WHERE (success_rate_percent < (95)::numeric);


--
-- Name: idx_communication_patterns_protocol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_patterns_protocol ON public.communication_patterns USING btree (protocol);


--
-- Name: idx_communication_patterns_source_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_patterns_source_service ON public.communication_patterns USING btree (source_service);


--
-- Name: idx_communication_patterns_source_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_patterns_source_target ON public.communication_patterns USING btree (source_service, target_service, protocol);


--
-- Name: idx_communication_patterns_success_rate_percent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_patterns_success_rate_percent ON public.communication_patterns USING btree (success_rate_percent);


--
-- Name: idx_communication_patterns_target_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_patterns_target_service ON public.communication_patterns USING btree (target_service);


--
-- Name: idx_compaction_candidates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compaction_candidates ON public.event_store USING btree (compacted, aggregate_id, sequence_number) WHERE (compacted = false);


--
-- Name: idx_completed_jobs_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_completed_jobs_cleanup ON public.campaign_jobs USING btree (status, updated_at) WHERE (status = 'completed'::public.campaign_job_status_enum);


--
-- Name: idx_config_locks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_active ON public.config_locks USING btree (active) WHERE (active = true);


--
-- Name: idx_config_locks_auto_renewal_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_auto_renewal_enabled ON public.config_locks USING btree (auto_renewal_enabled) WHERE (auto_renewal_enabled = true);


--
-- Name: idx_config_locks_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_campaign_id ON public.config_locks USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_config_locks_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_expires_at ON public.config_locks USING btree (expires_at);


--
-- Name: idx_config_locks_expiring_soon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_expiring_soon ON public.config_locks USING btree (expires_at, active) WHERE (active = true);


--
-- Name: idx_config_locks_last_heartbeat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_last_heartbeat ON public.config_locks USING btree (last_heartbeat) WHERE (auto_renewal_enabled = true);


--
-- Name: idx_config_locks_lock_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_lock_name ON public.config_locks USING btree (lock_name);


--
-- Name: idx_config_locks_lock_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_lock_type ON public.config_locks USING btree (lock_type);


--
-- Name: idx_config_locks_locked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_locked_at ON public.config_locks USING btree (locked_at);


--
-- Name: idx_config_locks_locked_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_locked_by ON public.config_locks USING btree (locked_by);


--
-- Name: idx_config_locks_parent_lock_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_parent_lock_id ON public.config_locks USING btree (parent_lock_id) WHERE (parent_lock_id IS NOT NULL);


--
-- Name: idx_config_locks_resource_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_resource_active ON public.config_locks USING btree (resource_type, resource_id, active) WHERE (active = true);


--
-- Name: idx_config_locks_resource_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_resource_id ON public.config_locks USING btree (resource_id) WHERE (resource_id IS NOT NULL);


--
-- Name: idx_config_locks_resource_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_resource_type ON public.config_locks USING btree (resource_type);


--
-- Name: idx_config_locks_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_session_id ON public.config_locks USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_config_locks_stale_heartbeat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_stale_heartbeat ON public.config_locks USING btree (last_heartbeat, auto_renewal_enabled, active) WHERE ((auto_renewal_enabled = true) AND (active = true));


--
-- Name: idx_config_versions_affected_services_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_affected_services_gin ON public.config_versions USING gin (affected_services) WHERE (affected_services IS NOT NULL);


--
-- Name: idx_config_versions_affects_campaigns; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_affects_campaigns ON public.config_versions USING btree (affects_campaigns) WHERE (affects_campaigns = true);


--
-- Name: idx_config_versions_approval_required; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_approval_required ON public.config_versions USING btree (approval_required) WHERE (approval_required = true);


--
-- Name: idx_config_versions_approved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_approved ON public.config_versions USING btree (approved) WHERE (approval_required = true);


--
-- Name: idx_config_versions_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_approved_by ON public.config_versions USING btree (approved_by) WHERE (approved_by IS NOT NULL);


--
-- Name: idx_config_versions_audit_trail_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_audit_trail_gin ON public.config_versions USING gin (audit_trail) WHERE (audit_trail IS NOT NULL);


--
-- Name: idx_config_versions_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_campaign_id ON public.config_versions USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_config_versions_can_rollback; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_can_rollback ON public.config_versions USING btree (can_rollback) WHERE (can_rollback = true);


--
-- Name: idx_config_versions_change_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_change_type ON public.config_versions USING btree (change_type);


--
-- Name: idx_config_versions_config_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_config_key ON public.config_versions USING btree (config_key);


--
-- Name: idx_config_versions_config_value_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_config_value_gin ON public.config_versions USING gin (config_value);


--
-- Name: idx_config_versions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_created_at ON public.config_versions USING btree (created_at);


--
-- Name: idx_config_versions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_created_by ON public.config_versions USING btree (created_by);


--
-- Name: idx_config_versions_dependency_configs_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_dependency_configs_gin ON public.config_versions USING gin (dependency_configs) WHERE (dependency_configs IS NOT NULL);


--
-- Name: idx_config_versions_deployed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_deployed ON public.config_versions USING btree (deployed);


--
-- Name: idx_config_versions_deployed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_deployed_by ON public.config_versions USING btree (deployed_by) WHERE (deployed_by IS NOT NULL);


--
-- Name: idx_config_versions_deployment_environment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_deployment_environment ON public.config_versions USING btree (deployment_environment) WHERE (deployment_environment IS NOT NULL);


--
-- Name: idx_config_versions_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_is_active ON public.config_versions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_config_versions_is_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_is_current ON public.config_versions USING btree (is_current) WHERE (is_current = true);


--
-- Name: idx_config_versions_key_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_key_current ON public.config_versions USING btree (config_key, is_current) WHERE (is_current = true);


--
-- Name: idx_config_versions_key_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_key_version ON public.config_versions USING btree (config_key, version_number);


--
-- Name: idx_config_versions_pending_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_pending_approval ON public.config_versions USING btree (approval_required, approved, created_at DESC) WHERE ((approval_required = true) AND (approved = false));


--
-- Name: idx_config_versions_pending_deployment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_pending_deployment ON public.config_versions USING btree (deployed, approved, created_at DESC) WHERE ((deployed = false) AND ((approval_required = false) OR (approved = true)));


--
-- Name: idx_config_versions_rollback_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_rollback_metadata_gin ON public.config_versions USING gin (rollback_metadata) WHERE (rollback_metadata IS NOT NULL);


--
-- Name: idx_config_versions_rollback_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_rollback_version ON public.config_versions USING btree (rollback_version) WHERE (rollback_version IS NOT NULL);


--
-- Name: idx_config_versions_validation_errors_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_validation_errors_gin ON public.config_versions USING gin (validation_errors) WHERE (validation_errors IS NOT NULL);


--
-- Name: idx_config_versions_validation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_validation_status ON public.config_versions USING btree (validation_status);


--
-- Name: idx_config_versions_version_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_version_number ON public.config_versions USING btree (version_number);


--
-- Name: idx_connection_pool_metrics_connection_errors; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_connection_errors ON public.connection_pool_metrics USING btree (connection_errors) WHERE (connection_errors > 0);


--
-- Name: idx_connection_pool_metrics_database_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_database_name ON public.connection_pool_metrics USING btree (database_name) WHERE (database_name IS NOT NULL);


--
-- Name: idx_connection_pool_metrics_high_utilization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_high_utilization ON public.connection_pool_metrics USING btree (pool_utilization_percent DESC, recorded_at DESC) WHERE (pool_utilization_percent > (80)::numeric);


--
-- Name: idx_connection_pool_metrics_pool_utilization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_pool_utilization ON public.connection_pool_metrics USING btree (pool_utilization_percent);


--
-- Name: idx_connection_pool_metrics_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_recorded_at ON public.connection_pool_metrics USING btree (recorded_at);


--
-- Name: idx_connection_pool_metrics_service_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_service_name ON public.connection_pool_metrics USING btree (service_name) WHERE (service_name IS NOT NULL);


--
-- Name: idx_connection_pool_metrics_service_utilization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_service_utilization ON public.connection_pool_metrics USING btree (service_name, pool_utilization_percent DESC, recorded_at DESC) WHERE (service_name IS NOT NULL);


--
-- Name: idx_connection_pool_metrics_wait_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_wait_count ON public.connection_pool_metrics USING btree (wait_count) WHERE (wait_count > 0);


--
-- Name: idx_connection_pool_monitoring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_monitoring ON public.connection_pool_metrics USING btree (pool_utilization_percent DESC, recorded_at DESC) WHERE (pool_utilization_percent > (80)::numeric);


--
-- Name: idx_dns_validation_results_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_validation_results_campaign_id ON public.dns_validation_results USING btree (dns_campaign_id);


--
-- Name: idx_dns_validation_results_dns_records_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_validation_results_dns_records_gin ON public.dns_validation_results USING gin (dns_records) WHERE (dns_records IS NOT NULL);


--
-- Name: idx_dns_validation_results_domain_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_validation_results_domain_id ON public.dns_validation_results USING btree (generated_domain_id) WHERE (generated_domain_id IS NOT NULL);


--
-- Name: idx_dns_validation_results_domain_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_validation_results_domain_name ON public.dns_validation_results USING btree (domain_name);


--
-- Name: idx_dns_validation_results_last_checked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_validation_results_last_checked ON public.dns_validation_results USING btree (last_checked_at) WHERE (last_checked_at IS NOT NULL);


--
-- Name: idx_dns_validation_results_persona_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_validation_results_persona_id ON public.dns_validation_results USING btree (validated_by_persona_id) WHERE (validated_by_persona_id IS NOT NULL);


--
-- Name: idx_dns_validation_results_validation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_validation_results_validation_status ON public.dns_validation_results USING btree (validation_status);


--
-- Name: idx_domain_campaign_status_join; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_campaign_status_join ON public.lead_generation_campaigns USING btree (id) INCLUDE (phase_status, current_phase, name, user_id);


--
-- Name: idx_domain_extracted_keywords_campaign_keyword; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_extracted_keywords_campaign_keyword ON public.domain_extracted_keywords USING btree (campaign_id, keyword_id);


--
-- Name: idx_domain_extraction_features_campaign_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_extraction_features_campaign_state ON public.domain_extraction_features USING btree (campaign_id, processing_state);


--
-- Name: idx_domain_extraction_features_domain_ready; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_extraction_features_domain_ready ON public.domain_extraction_features USING btree (domain_id, campaign_id) WHERE (processing_state = 'ready'::public.extraction_processing_state_enum);


--
-- Name: idx_domain_extraction_features_momentum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_extraction_features_momentum ON public.domain_extraction_features USING btree (campaign_id, updated_at DESC) WHERE (processing_state = 'ready'::public.extraction_processing_state_enum);


--
-- Name: idx_domain_extraction_features_ready; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_extraction_features_ready ON public.domain_extraction_features USING btree (domain_id) WHERE (processing_state = 'ready'::public.extraction_processing_state_enum);


--
-- Name: idx_domain_extraction_features_ready_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_extraction_features_ready_campaign ON public.domain_extraction_features USING btree (campaign_id) WHERE (processing_state = 'ready'::public.extraction_processing_state_enum);


--
-- Name: idx_domain_extraction_features_snapshot_stale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_extraction_features_snapshot_stale ON public.domain_extraction_features USING btree (campaign_id, scoring_profile_snapshot_id, is_stale_score) WHERE (is_stale_score = true);


--
-- Name: idx_domain_extraction_features_stale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_extraction_features_stale ON public.domain_extraction_features USING btree (campaign_id, is_stale_score, updated_at) WHERE (is_stale_score = true);


--
-- Name: idx_domain_extraction_features_stale_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_extraction_features_stale_campaign ON public.domain_extraction_features USING btree (campaign_id) WHERE (is_stale_score = true);


--
-- Name: idx_domain_generation_config_states_details_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_generation_config_states_details_gin ON public.domain_generation_config_states USING gin (config_details);


--
-- Name: idx_domain_generation_config_states_last_offset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_generation_config_states_last_offset ON public.domain_generation_config_states USING btree (last_offset);


--
-- Name: idx_domain_generation_config_states_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_generation_config_states_updated_at ON public.domain_generation_config_states USING btree (updated_at);


--
-- Name: idx_domain_generation_params_pattern_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_generation_params_pattern_type ON public.domain_generation_campaign_params USING btree (pattern_type);


--
-- Name: idx_domain_generation_params_tld; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_generation_params_tld ON public.domain_generation_campaign_params USING btree (tld);


--
-- Name: idx_domain_generation_params_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_generation_params_updated_at ON public.domain_generation_campaign_params USING btree (updated_at);


--
-- Name: idx_domains_campaign_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_campaign_analytics ON public.generated_domains USING btree (campaign_id, dns_status, http_status, lead_status);


--
-- Name: idx_domains_campaign_pagination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_campaign_pagination ON public.generated_domains USING btree (campaign_id, created_at DESC, id) INCLUDE (domain_name, dns_status);


--
-- Name: idx_domains_cursor_forward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_cursor_forward ON public.generated_domains USING btree (created_at, id) WHERE (dns_status IS NOT NULL);


--
-- Name: idx_domains_cursor_pagination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_cursor_pagination ON public.generated_domains USING btree (id, created_at) WHERE (dns_status IS NOT NULL);


--
-- Name: idx_domains_dns_validation_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_dns_validation_pending ON public.generated_domains USING btree (campaign_id, dns_status, generated_at) WHERE (dns_status = 'pending'::public.domain_dns_status_enum);


--
-- Name: idx_domains_failure_analysis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_failure_analysis ON public.generated_domains USING btree (lead_status, dns_status, generated_at DESC) WHERE (lead_status = 'error'::public.domain_lead_status_enum);


--
-- Name: idx_domains_http_validation_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_http_validation_pending ON public.generated_domains USING btree (campaign_id, http_status, generated_at) WHERE (http_status = 'pending'::public.domain_http_status_enum);


--
-- Name: idx_domains_validation_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_validation_analytics ON public.generated_domains USING btree (campaign_id, dns_status) INCLUDE (http_status, lead_status, created_at);


--
-- Name: idx_domains_validation_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_validation_lookup ON public.generated_domains USING btree (domain_name, dns_status) INCLUDE (http_status, lead_status);


--
-- Name: idx_domains_validation_status_pagination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_validation_status_pagination ON public.generated_domains USING btree (dns_status, created_at DESC, id) INCLUDE (domain_name, campaign_id);


--
-- Name: idx_error_rate_monitoring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_rate_monitoring ON public.campaign_jobs USING btree (status, created_at DESC) WHERE (status = 'failed'::public.campaign_job_status_enum);


--
-- Name: idx_event_projections_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_campaign_id ON public.event_projections USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_event_projections_campaign_specific; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_campaign_specific ON public.event_projections USING btree (campaign_specific) WHERE (campaign_specific = true);


--
-- Name: idx_event_projections_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_created_by ON public.event_projections USING btree (created_by) WHERE (created_by IS NOT NULL);


--
-- Name: idx_event_projections_current_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_current_position ON public.event_projections USING btree (current_position);


--
-- Name: idx_event_projections_dependencies_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_dependencies_gin ON public.event_projections USING gin (dependencies) WHERE (dependencies IS NOT NULL);


--
-- Name: idx_event_projections_event_filters_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_event_filters_gin ON public.event_projections USING gin (event_filters) WHERE (event_filters IS NOT NULL);


--
-- Name: idx_event_projections_lag_monitoring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_lag_monitoring ON public.event_projections USING btree (processing_lag_ms DESC, status) WHERE (monitoring_enabled = true);


--
-- Name: idx_event_projections_last_processed_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_last_processed_event_id ON public.event_projections USING btree (last_processed_event_id) WHERE (last_processed_event_id IS NOT NULL);


--
-- Name: idx_event_projections_monitoring_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_monitoring_enabled ON public.event_projections USING btree (monitoring_enabled) WHERE (monitoring_enabled = true);


--
-- Name: idx_event_projections_projection_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_projection_name ON public.event_projections USING btree (projection_name);


--
-- Name: idx_event_projections_projection_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_projection_type ON public.event_projections USING btree (projection_type);


--
-- Name: idx_event_projections_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_status ON public.event_projections USING btree (status);


--
-- Name: idx_event_projections_status_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_projections_status_position ON public.event_projections USING btree (status, current_position);


--
-- Name: idx_event_store_aggregate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_aggregate_id ON public.event_store USING btree (aggregate_id);


--
-- Name: idx_event_store_aggregate_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_aggregate_sequence ON public.event_store USING btree (aggregate_id, sequence_number);


--
-- Name: idx_event_store_aggregate_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_aggregate_type ON public.event_store USING btree (aggregate_type);


--
-- Name: idx_event_store_aggregate_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_aggregate_version ON public.event_store USING btree (aggregate_id, aggregate_version);


--
-- Name: idx_event_store_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_archived ON public.event_store USING btree (archived) WHERE (archived = false);


--
-- Name: idx_event_store_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_campaign_id ON public.event_store USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_event_store_campaign_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_campaign_phase ON public.event_store USING btree (campaign_phase) WHERE (campaign_phase IS NOT NULL);


--
-- Name: idx_event_store_campaign_type_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_campaign_type_timestamp ON public.event_store USING btree (campaign_id, event_type, event_timestamp DESC) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_event_store_causation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_causation_id ON public.event_store USING btree (causation_id) WHERE (causation_id IS NOT NULL);


--
-- Name: idx_event_store_compacted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_compacted ON public.event_store USING btree (compacted) WHERE (compacted = false);


--
-- Name: idx_event_store_correlation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_correlation_id ON public.event_store USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_event_store_correlation_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_correlation_tracking ON public.event_store USING btree (correlation_id, sequence_number) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_event_store_event_data_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_event_data_gin ON public.event_store USING gin (event_data);


--
-- Name: idx_event_store_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_event_id ON public.event_store USING btree (event_id);


--
-- Name: idx_event_store_event_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_event_metadata_gin ON public.event_store USING gin (event_metadata) WHERE (event_metadata IS NOT NULL);


--
-- Name: idx_event_store_event_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_event_timestamp ON public.event_store USING btree (event_timestamp);


--
-- Name: idx_event_store_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_event_type ON public.event_store USING btree (event_type);


--
-- Name: idx_event_store_is_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_is_snapshot ON public.event_store USING btree (is_snapshot) WHERE (is_snapshot = true);


--
-- Name: idx_event_store_parent_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_parent_event_id ON public.event_store USING btree (parent_event_id) WHERE (parent_event_id IS NOT NULL);


--
-- Name: idx_event_store_partition_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_partition_key ON public.event_store USING btree (partition_key);


--
-- Name: idx_event_store_processing_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_processing_pending ON public.event_store USING btree (processing_status, sequence_number) WHERE ((processing_status)::text = 'pending'::text);


--
-- Name: idx_event_store_processing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_processing_status ON public.event_store USING btree (processing_status);


--
-- Name: idx_event_store_projection_rebuild; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_projection_rebuild ON public.event_store USING btree (event_type, sequence_number) INCLUDE (aggregate_id, event_data);


--
-- Name: idx_event_store_retry_after; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_retry_after ON public.event_store USING btree (retry_after) WHERE (retry_after IS NOT NULL);


--
-- Name: idx_event_store_sequence_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_sequence_number ON public.event_store USING btree (sequence_number);


--
-- Name: idx_event_store_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_session_id ON public.event_store USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_event_store_streaming; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_streaming ON public.event_store USING btree (aggregate_type, sequence_number) WHERE ((processing_status)::text = 'processed'::text);


--
-- Name: idx_event_store_type_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_type_timestamp ON public.event_store USING btree (event_type, event_timestamp DESC);


--
-- Name: idx_event_store_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_user_id ON public.event_store USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_event_store_user_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_user_timestamp ON public.event_store USING btree (user_id, event_timestamp DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_events_cursor_forward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_cursor_forward ON public.event_store USING btree (sequence_number, event_id) WHERE ((processing_status)::text = 'processed'::text);


--
-- Name: idx_expired_cache_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expired_cache_cleanup ON public.cache_entries USING btree (expires_at, status) WHERE (status = 'active'::public.cache_entry_status_enum);


--
-- Name: idx_expired_sessions_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expired_sessions_cleanup ON public.sessions USING btree (expires_at) WHERE (is_active = true);


--
-- Name: idx_generated_domains_batch_validation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_batch_validation ON public.generated_domains USING btree (campaign_id, lead_status, created_at) WHERE (lead_status = ANY (ARRAY['pending'::public.domain_lead_status_enum, 'no_match'::public.domain_lead_status_enum]));


--
-- Name: idx_generated_domains_campaign_dns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_dns_status ON public.generated_domains USING btree (campaign_id, dns_status);


--
-- Name: idx_generated_domains_campaign_domain_score_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_domain_score_desc ON public.generated_domains USING btree (campaign_id, domain_score DESC);


--
-- Name: idx_generated_domains_campaign_domain_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_generated_domains_campaign_domain_unique ON public.generated_domains USING btree (campaign_id, domain_name);


--
-- Name: idx_generated_domains_campaign_feature_vector_present; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_feature_vector_present ON public.generated_domains USING btree (campaign_id) WHERE (feature_vector IS NOT NULL);


--
-- Name: idx_generated_domains_campaign_http_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_http_status ON public.generated_domains USING btree (campaign_id, http_status);


--
-- Name: idx_generated_domains_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_id ON public.generated_domains USING btree (campaign_id);


--
-- Name: idx_generated_domains_campaign_last_http_fetched_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_last_http_fetched_at_desc ON public.generated_domains USING btree (campaign_id, last_http_fetched_at DESC);


--
-- Name: idx_generated_domains_campaign_offset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_offset ON public.generated_domains USING btree (campaign_id, offset_index);


--
-- Name: idx_generated_domains_campaign_offset_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_generated_domains_campaign_offset_unique ON public.generated_domains USING btree (campaign_id, offset_index);


--
-- Name: idx_generated_domains_dns_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_dns_pending ON public.generated_domains USING btree (campaign_id, offset_index) WHERE (dns_status = ANY (ARRAY['pending'::public.domain_dns_status_enum, 'error'::public.domain_dns_status_enum]));


--
-- Name: idx_generated_domains_dns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_dns_status ON public.generated_domains USING btree (dns_status);


--
-- Name: idx_generated_domains_domain_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_domain_name ON public.generated_domains USING btree (domain_name);


--
-- Name: idx_generated_domains_generated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_generated_at ON public.generated_domains USING btree (generated_at);


--
-- Name: idx_generated_domains_http_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_http_pending ON public.generated_domains USING btree (campaign_id, offset_index) WHERE (http_status = ANY (ARRAY['pending'::public.domain_http_status_enum, 'error'::public.domain_http_status_enum]));


--
-- Name: idx_generated_domains_http_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_http_status ON public.generated_domains USING btree (http_status);


--
-- Name: idx_generated_domains_last_validated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_last_validated_at ON public.generated_domains USING btree (last_validated_at) WHERE (last_validated_at IS NOT NULL);


--
-- Name: idx_generated_domains_lead_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_lead_score ON public.generated_domains USING btree (lead_score) WHERE (lead_score > (0)::numeric);


--
-- Name: idx_generated_domains_lead_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_lead_status ON public.generated_domains USING btree (lead_status);


--
-- Name: idx_generated_domains_offset_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_offset_index ON public.generated_domains USING btree (offset_index);


--
-- Name: idx_generated_domains_tld; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_tld ON public.generated_domains USING btree (tld) WHERE (tld IS NOT NULL);


--
-- Name: idx_http_keyword_results_ad_hoc_keywords_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_ad_hoc_keywords_gin ON public.http_keyword_results USING gin (found_ad_hoc_keywords) WHERE (found_ad_hoc_keywords IS NOT NULL);


--
-- Name: idx_http_keyword_results_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_campaign_id ON public.http_keyword_results USING btree (http_keyword_campaign_id);


--
-- Name: idx_http_keyword_results_content_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_content_hash ON public.http_keyword_results USING btree (content_hash) WHERE (content_hash IS NOT NULL);


--
-- Name: idx_http_keyword_results_dns_result_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_dns_result_id ON public.http_keyword_results USING btree (dns_result_id) WHERE (dns_result_id IS NOT NULL);


--
-- Name: idx_http_keyword_results_domain_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_domain_name ON public.http_keyword_results USING btree (domain_name);


--
-- Name: idx_http_keyword_results_http_status_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_http_status_code ON public.http_keyword_results USING btree (http_status_code) WHERE (http_status_code IS NOT NULL);


--
-- Name: idx_http_keyword_results_keywords_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_keywords_gin ON public.http_keyword_results USING gin (found_keywords_from_sets) WHERE (found_keywords_from_sets IS NOT NULL);


--
-- Name: idx_http_keyword_results_persona_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_persona_id ON public.http_keyword_results USING btree (validated_by_persona_id) WHERE (validated_by_persona_id IS NOT NULL);


--
-- Name: idx_http_keyword_results_proxy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_proxy_id ON public.http_keyword_results USING btree (used_proxy_id) WHERE (used_proxy_id IS NOT NULL);


--
-- Name: idx_http_keyword_results_response_headers_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_response_headers_gin ON public.http_keyword_results USING gin (response_headers) WHERE (response_headers IS NOT NULL);


--
-- Name: idx_http_keyword_results_validation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_validation_status ON public.http_keyword_results USING btree (validation_status);


--
-- Name: idx_http_results_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_results_campaign ON public.http_keyword_results USING btree (http_keyword_campaign_id, domain_name, validation_status, created_at DESC);


--
-- Name: idx_http_results_domain_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_results_domain_lookup ON public.http_keyword_results USING btree (domain_name, validation_status) INCLUDE (http_status_code, created_at);


--
-- Name: idx_jobs_campaign_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_campaign_status ON public.campaign_jobs USING btree (campaign_id, status, job_type, created_at DESC);


--
-- Name: idx_jobs_cleanup_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_cleanup_completed ON public.campaign_jobs USING btree (status, updated_at) WHERE (status = 'completed'::public.campaign_job_status_enum);


--
-- Name: idx_jobs_cursor_forward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_cursor_forward ON public.campaign_jobs USING btree (created_at, id) WHERE (status <> 'cancelled'::public.campaign_job_status_enum);


--
-- Name: idx_jobs_failure_analysis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_failure_analysis ON public.campaign_jobs USING btree (status, last_error, attempts, created_at DESC) WHERE (status = 'failed'::public.campaign_job_status_enum);


--
-- Name: idx_jobs_performance_analysis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_performance_analysis ON public.campaign_jobs USING btree (job_type, status, attempts, created_at DESC);


--
-- Name: idx_jobs_performance_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_performance_analytics ON public.campaign_jobs USING btree (job_type, status, created_at) INCLUDE (attempts, last_attempted_at);


--
-- Name: idx_jobs_processing_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_processing_queue ON public.campaign_jobs USING btree (status, scheduled_at, created_at) WHERE (status = ANY (ARRAY['pending'::public.campaign_job_status_enum, 'queued'::public.campaign_job_status_enum]));


--
-- Name: idx_jobs_retry_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_retry_queue ON public.campaign_jobs USING btree (status, attempts, next_execution_at) WHERE ((status = 'failed'::public.campaign_job_status_enum) AND (attempts > 0));


--
-- Name: idx_jobs_stale_running; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_stale_running ON public.campaign_jobs USING btree (status, last_attempted_at) WHERE (status = 'running'::public.campaign_job_status_enum);


--
-- Name: idx_jobs_worker_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_worker_assignment ON public.campaign_jobs USING btree (status, job_type, processing_server_id, last_attempted_at) WHERE (status = 'running'::public.campaign_job_status_enum);


--
-- Name: idx_keyword_rules_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_category ON public.keyword_rules USING btree (category) WHERE (category IS NOT NULL);


--
-- Name: idx_keyword_rules_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_created_at ON public.keyword_rules USING btree (created_at);


--
-- Name: idx_keyword_rules_is_case_sensitive; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_is_case_sensitive ON public.keyword_rules USING btree (is_case_sensitive);


--
-- Name: idx_keyword_rules_keyword_set_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_keyword_set_id ON public.keyword_rules USING btree (keyword_set_id);


--
-- Name: idx_keyword_rules_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_pattern ON public.keyword_rules USING btree (pattern);


--
-- Name: idx_keyword_rules_rule_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_rule_type ON public.keyword_rules USING btree (rule_type);


--
-- Name: idx_keyword_rules_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_set ON public.keyword_rules USING btree (keyword_set_id, rule_type, created_at DESC);


--
-- Name: idx_keyword_rules_set_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_set_pattern ON public.keyword_rules USING btree (keyword_set_id, pattern);


--
-- Name: idx_keyword_rules_set_pattern_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_keyword_rules_set_pattern_unique ON public.keyword_rules USING btree (keyword_set_id, pattern, rule_type, is_case_sensitive);


--
-- Name: idx_keyword_rules_set_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_set_type ON public.keyword_rules USING btree (keyword_set_id, rule_type);


--
-- Name: idx_keyword_rules_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_updated_at ON public.keyword_rules USING btree (updated_at);


--
-- Name: idx_keyword_sets_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_sets_created_at ON public.keyword_sets USING btree (created_at);


--
-- Name: idx_keyword_sets_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_sets_enabled ON public.keyword_sets USING btree (is_enabled, created_at DESC) WHERE (is_enabled = true);


--
-- Name: idx_keyword_sets_is_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_sets_is_enabled ON public.keyword_sets USING btree (is_enabled) WHERE (is_enabled = true);


--
-- Name: idx_keyword_sets_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_sets_name ON public.keyword_sets USING btree (name);


--
-- Name: idx_keyword_sets_rules_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_sets_rules_gin ON public.keyword_sets USING gin (rules) WHERE (rules IS NOT NULL);


--
-- Name: idx_keyword_sets_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_sets_updated_at ON public.keyword_sets USING btree (updated_at);


--
-- Name: idx_lead_generation_campaigns_analysis_results_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_analysis_results_gin ON public.lead_generation_campaigns USING gin (analysis_results) WHERE (analysis_results IS NOT NULL);


--
-- Name: idx_lead_generation_campaigns_business_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_business_status ON public.lead_generation_campaigns USING btree (business_status) WHERE (business_status IS NOT NULL);


--
-- Name: idx_lead_generation_campaigns_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_completed_at ON public.lead_generation_campaigns USING btree (completed_at) WHERE (completed_at IS NOT NULL);


--
-- Name: idx_lead_generation_campaigns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_created_at ON public.lead_generation_campaigns USING btree (created_at);


--
-- Name: idx_lead_generation_campaigns_current_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_current_phase ON public.lead_generation_campaigns USING btree (current_phase);


--
-- Name: idx_lead_generation_campaigns_dns_results_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_dns_results_gin ON public.lead_generation_campaigns USING gin (dns_results) WHERE (dns_results IS NOT NULL);


--
-- Name: idx_lead_generation_campaigns_http_results_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_http_results_gin ON public.lead_generation_campaigns USING gin (http_results) WHERE (http_results IS NOT NULL);


--
-- Name: idx_lead_generation_campaigns_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_metadata_gin ON public.lead_generation_campaigns USING gin (metadata) WHERE (metadata IS NOT NULL);


--
-- Name: idx_lead_generation_campaigns_phase_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_phase_status ON public.lead_generation_campaigns USING btree (phase_status);


--
-- Name: idx_lead_generation_campaigns_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_updated_at ON public.lead_generation_campaigns USING btree (updated_at);


--
-- Name: idx_lead_generation_campaigns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_generation_campaigns_user_id ON public.lead_generation_campaigns USING btree (user_id);


--
-- Name: idx_live_campaign_stats; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_campaign_stats ON public.lead_generation_campaigns USING btree (phase_status, updated_at DESC) WHERE (phase_status = ANY (ARRAY['in_progress'::public.phase_status_enum, 'ready'::public.phase_status_enum]));


--
-- Name: idx_live_domain_stats; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_domain_stats ON public.generated_domains USING btree (dns_status, created_at DESC);


--
-- Name: idx_live_job_queue_stats; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_job_queue_stats ON public.campaign_jobs USING btree (status, created_at DESC) WHERE (status = ANY (ARRAY['pending'::public.campaign_job_status_enum, 'running'::public.campaign_job_status_enum]));


--
-- Name: idx_old_audit_logs_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_old_audit_logs_cleanup ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_pagination_performance_metrics_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_campaign_id ON public.pagination_performance_metrics USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_pagination_performance_metrics_execution_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_execution_time ON public.pagination_performance_metrics USING btree (execution_time_ms);


--
-- Name: idx_pagination_performance_metrics_large_pages; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_large_pages ON public.pagination_performance_metrics USING btree (page_size DESC, execution_time_ms DESC) WHERE (page_size > 1000);


--
-- Name: idx_pagination_performance_metrics_page_size; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_page_size ON public.pagination_performance_metrics USING btree (page_size);


--
-- Name: idx_pagination_performance_metrics_pagination_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_pagination_type ON public.pagination_performance_metrics USING btree (pagination_type);


--
-- Name: idx_pagination_performance_metrics_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_recorded_at ON public.pagination_performance_metrics USING btree (recorded_at);


--
-- Name: idx_pagination_performance_metrics_service_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_service_name ON public.pagination_performance_metrics USING btree (service_name) WHERE (service_name IS NOT NULL);


--
-- Name: idx_pagination_performance_metrics_slow_pagination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_slow_pagination ON public.pagination_performance_metrics USING btree (execution_time_ms DESC, recorded_at DESC) WHERE (execution_time_ms > 100);


--
-- Name: idx_pagination_performance_metrics_table_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_table_name ON public.pagination_performance_metrics USING btree (table_name);


--
-- Name: idx_pagination_performance_metrics_table_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_table_type ON public.pagination_performance_metrics USING btree (table_name, pagination_type, execution_time_ms DESC);


--
-- Name: idx_pagination_performance_metrics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagination_performance_metrics_user_id ON public.pagination_performance_metrics USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_password_reset_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_token_hash ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_personas_availability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_availability ON public.personas USING btree (status, last_tested) WHERE (status = 'Active'::public.persona_status_enum);


--
-- Name: idx_personas_campaign_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_campaign_assignment ON public.personas USING btree (id, status, persona_type) INCLUDE (name, last_tested);


--
-- Name: idx_personas_config_details_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_config_details_gin ON public.personas USING gin (config_details);


--
-- Name: idx_personas_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_created_at ON public.personas USING btree (created_at);


--
-- Name: idx_personas_is_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_is_enabled ON public.personas USING btree (is_enabled) WHERE (is_enabled = true);


--
-- Name: idx_personas_last_tested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_last_tested ON public.personas USING btree (last_tested) WHERE (last_tested IS NOT NULL);


--
-- Name: idx_personas_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_name ON public.personas USING btree (name);


--
-- Name: idx_personas_persona_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_persona_type ON public.personas USING btree (persona_type);


--
-- Name: idx_personas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_status ON public.personas USING btree (status) WHERE (status IS NOT NULL);


--
-- Name: idx_personas_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_tags_gin ON public.personas USING gin (tags) WHERE (tags IS NOT NULL);


--
-- Name: idx_personas_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_updated_at ON public.personas USING btree (updated_at);


--
-- Name: idx_phase_configurations_campaign_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_configurations_campaign_phase ON public.phase_configurations USING btree (campaign_id, phase);


--
-- Name: idx_phase_executions_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_executions_campaign_id ON public.phase_executions USING btree (campaign_id);


--
-- Name: idx_phase_executions_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_executions_completed_at ON public.phase_executions USING btree (completed_at) WHERE (completed_at IS NOT NULL);


--
-- Name: idx_phase_executions_configuration_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_executions_configuration_gin ON public.phase_executions USING gin (configuration) WHERE (configuration IS NOT NULL);


--
-- Name: idx_phase_executions_error_details_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_executions_error_details_gin ON public.phase_executions USING gin (error_details) WHERE (error_details IS NOT NULL);


--
-- Name: idx_phase_executions_metrics_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_executions_metrics_gin ON public.phase_executions USING gin (metrics) WHERE (metrics IS NOT NULL);


--
-- Name: idx_phase_executions_phase_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_executions_phase_type ON public.phase_executions USING btree (phase_type);


--
-- Name: idx_phase_executions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_executions_started_at ON public.phase_executions USING btree (started_at) WHERE (started_at IS NOT NULL);


--
-- Name: idx_phase_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_executions_status ON public.phase_executions USING btree (status);


--
-- Name: idx_phase_runs_campaign_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phase_runs_campaign_phase ON public.phase_runs USING btree (campaign_id, phase_type);


--
-- Name: idx_proxies_availability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_availability ON public.proxies USING btree (status, last_checked_at, is_healthy) WHERE (status = 'Active'::public.proxy_status_enum);


--
-- Name: idx_proxies_campaign_usage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_campaign_usage ON public.proxies USING btree (id, status) INCLUDE (host, port, last_checked_at);


--
-- Name: idx_proxies_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_country_code ON public.proxies USING btree (country_code) WHERE (country_code IS NOT NULL);


--
-- Name: idx_proxies_country_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_country_enabled ON public.proxies USING btree (country_code, is_enabled) WHERE ((country_code IS NOT NULL) AND (is_enabled = true));


--
-- Name: idx_proxies_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_created_at ON public.proxies USING btree (created_at);


--
-- Name: idx_proxies_enabled_healthy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_enabled_healthy ON public.proxies USING btree (is_enabled, is_healthy) WHERE (is_enabled = true);


--
-- Name: idx_proxies_host; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_host ON public.proxies USING btree (host) WHERE (host IS NOT NULL);


--
-- Name: idx_proxies_is_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_is_enabled ON public.proxies USING btree (is_enabled) WHERE (is_enabled = true);


--
-- Name: idx_proxies_is_healthy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_is_healthy ON public.proxies USING btree (is_healthy);


--
-- Name: idx_proxies_last_checked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_last_checked_at ON public.proxies USING btree (last_checked_at) WHERE (last_checked_at IS NOT NULL);


--
-- Name: idx_proxies_last_tested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_last_tested ON public.proxies USING btree (last_tested) WHERE (last_tested IS NOT NULL);


--
-- Name: idx_proxies_latency_ms; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_latency_ms ON public.proxies USING btree (latency_ms) WHERE (latency_ms IS NOT NULL);


--
-- Name: idx_proxies_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_name ON public.proxies USING btree (name);


--
-- Name: idx_proxies_pool_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_pool_assignment ON public.proxy_pool_memberships USING btree (pool_id, proxy_id, is_active) WHERE (is_active = true);


--
-- Name: idx_proxies_port; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_port ON public.proxies USING btree (port) WHERE (port IS NOT NULL);


--
-- Name: idx_proxies_protocol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_protocol ON public.proxies USING btree (protocol) WHERE (protocol IS NOT NULL);


--
-- Name: idx_proxies_protocol_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_protocol_enabled ON public.proxies USING btree (protocol, is_enabled) WHERE (is_enabled = true);


--
-- Name: idx_proxies_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_provider ON public.proxies USING btree (provider) WHERE (provider IS NOT NULL);


--
-- Name: idx_proxies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_status ON public.proxies USING btree (status) WHERE (status IS NOT NULL);


--
-- Name: idx_proxies_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_updated_at ON public.proxies USING btree (updated_at);


--
-- Name: idx_proxy_pool_memberships_added_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_added_at ON public.proxy_pool_memberships USING btree (added_at);


--
-- Name: idx_proxy_pool_memberships_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_is_active ON public.proxy_pool_memberships USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_proxy_pool_memberships_pool_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_pool_active ON public.proxy_pool_memberships USING btree (pool_id, is_active) WHERE (is_active = true);


--
-- Name: idx_proxy_pool_memberships_pool_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_pool_id ON public.proxy_pool_memberships USING btree (pool_id);


--
-- Name: idx_proxy_pool_memberships_pool_weight; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_pool_weight ON public.proxy_pool_memberships USING btree (pool_id, weight DESC) WHERE ((is_active = true) AND (weight IS NOT NULL));


--
-- Name: idx_proxy_pool_memberships_proxy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_proxy_id ON public.proxy_pool_memberships USING btree (proxy_id);


--
-- Name: idx_proxy_pool_memberships_weight; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_weight ON public.proxy_pool_memberships USING btree (weight) WHERE (weight IS NOT NULL);


--
-- Name: idx_proxy_pools_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pools_created_at ON public.proxy_pools USING btree (created_at);


--
-- Name: idx_proxy_pools_health_check_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pools_health_check_enabled ON public.proxy_pools USING btree (health_check_enabled) WHERE (health_check_enabled = true);


--
-- Name: idx_proxy_pools_is_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pools_is_enabled ON public.proxy_pools USING btree (is_enabled) WHERE (is_enabled = true);


--
-- Name: idx_proxy_pools_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pools_name ON public.proxy_pools USING btree (name);


--
-- Name: idx_proxy_pools_pool_strategy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pools_pool_strategy ON public.proxy_pools USING btree (pool_strategy) WHERE (pool_strategy IS NOT NULL);


--
-- Name: idx_proxy_pools_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pools_updated_at ON public.proxy_pools USING btree (updated_at);


--
-- Name: idx_query_performance_metrics_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_campaign_id ON public.query_performance_metrics USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_query_performance_metrics_campaign_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_campaign_phase ON public.query_performance_metrics USING btree (campaign_phase) WHERE (campaign_phase IS NOT NULL);


--
-- Name: idx_query_performance_metrics_executed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_executed_at ON public.query_performance_metrics USING btree (executed_at);


--
-- Name: idx_query_performance_metrics_execution_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_execution_time ON public.query_performance_metrics USING btree (execution_time_ms);


--
-- Name: idx_query_performance_metrics_index_usage_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_index_usage_gin ON public.query_performance_metrics USING gin (index_usage) WHERE (index_usage IS NOT NULL);


--
-- Name: idx_query_performance_metrics_needs_optimization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_needs_optimization ON public.query_performance_metrics USING btree (needs_optimization) WHERE (needs_optimization = true);


--
-- Name: idx_query_performance_metrics_optimization_suggestions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_optimization_suggestions_gin ON public.query_performance_metrics USING gin (optimization_suggestions) WHERE (optimization_suggestions IS NOT NULL);


--
-- Name: idx_query_performance_metrics_performance_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_performance_category ON public.query_performance_metrics USING btree (performance_category);


--
-- Name: idx_query_performance_metrics_query_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_query_hash ON public.query_performance_metrics USING btree (query_hash);


--
-- Name: idx_query_performance_metrics_query_plan_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_query_plan_gin ON public.query_performance_metrics USING gin (query_plan) WHERE (query_plan IS NOT NULL);


--
-- Name: idx_query_performance_metrics_query_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_query_type ON public.query_performance_metrics USING btree (query_type);


--
-- Name: idx_query_performance_metrics_service_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_service_name ON public.query_performance_metrics USING btree (service_name);


--
-- Name: idx_query_performance_metrics_service_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_service_time ON public.query_performance_metrics USING btree (service_name, executed_at DESC);


--
-- Name: idx_query_performance_metrics_slow_queries; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_slow_queries ON public.query_performance_metrics USING btree (execution_time_ms DESC, executed_at DESC) WHERE (execution_time_ms > (1000)::numeric);


--
-- Name: idx_query_performance_metrics_table_names_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_table_names_gin ON public.query_performance_metrics USING gin (table_names);


--
-- Name: idx_query_performance_metrics_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_type_time ON public.query_performance_metrics USING btree (query_type, execution_time_ms DESC);


--
-- Name: idx_query_performance_metrics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_metrics_user_id ON public.query_performance_metrics USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_query_performance_slow_queries; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_slow_queries ON public.query_performance_metrics USING btree (execution_time_ms DESC, executed_at DESC) WHERE (execution_time_ms > (1000)::numeric);


--
-- Name: idx_query_performance_trending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_trending ON public.query_performance_metrics USING btree (service_name, executed_at DESC, execution_time_ms);


--
-- Name: idx_rate_limits_blocked_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_blocked_until ON public.rate_limits USING btree (blocked_until) WHERE (blocked_until IS NOT NULL);


--
-- Name: idx_rate_limits_enforcement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_enforcement ON public.rate_limits USING btree (identifier, action, blocked_until) WHERE (blocked_until IS NOT NULL);


--
-- Name: idx_rate_limits_identifier_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_identifier_action ON public.rate_limits USING btree (identifier, action);


--
-- Name: idx_rate_limits_window_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_window_start ON public.rate_limits USING btree (window_start);


--
-- Name: idx_resource_utilization_alerts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_alerts ON public.resource_utilization_metrics USING btree (service_name, utilization_pct DESC, recorded_at DESC) WHERE (utilization_pct > (80)::numeric);


--
-- Name: idx_resource_utilization_metrics_bottleneck_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_bottleneck_detected ON public.resource_utilization_metrics USING btree (bottleneck_detected) WHERE (bottleneck_detected = true);


--
-- Name: idx_resource_utilization_metrics_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_campaign_id ON public.resource_utilization_metrics USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_resource_utilization_metrics_campaign_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_campaign_phase ON public.resource_utilization_metrics USING btree (campaign_phase) WHERE (campaign_phase IS NOT NULL);


--
-- Name: idx_resource_utilization_metrics_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_component ON public.resource_utilization_metrics USING btree (component) WHERE (component IS NOT NULL);


--
-- Name: idx_resource_utilization_metrics_high_utilization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_high_utilization ON public.resource_utilization_metrics USING btree (utilization_pct DESC, recorded_at DESC) WHERE (utilization_pct > (80)::numeric);


--
-- Name: idx_resource_utilization_metrics_optimization_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_optimization_gin ON public.resource_utilization_metrics USING gin (optimization_applied) WHERE (optimization_applied IS NOT NULL);


--
-- Name: idx_resource_utilization_metrics_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_recorded_at ON public.resource_utilization_metrics USING btree (recorded_at);


--
-- Name: idx_resource_utilization_metrics_resource_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_resource_type ON public.resource_utilization_metrics USING btree (resource_type);


--
-- Name: idx_resource_utilization_metrics_service_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_service_name ON public.resource_utilization_metrics USING btree (service_name);


--
-- Name: idx_resource_utilization_metrics_service_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_service_resource ON public.resource_utilization_metrics USING btree (service_name, resource_type, recorded_at DESC);


--
-- Name: idx_resource_utilization_metrics_utilization_pct; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_metrics_utilization_pct ON public.resource_utilization_metrics USING btree (utilization_pct);


--
-- Name: idx_scoring_profile_snapshots_campaign_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scoring_profile_snapshots_campaign_active ON public.scoring_profile_snapshots USING btree (campaign_id, is_active) WHERE (is_active = true);


--
-- Name: idx_scoring_profile_snapshots_campaign_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scoring_profile_snapshots_campaign_version ON public.scoring_profile_snapshots USING btree (campaign_id, profile_version DESC);


--
-- Name: idx_security_events_additional_data_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_additional_data_gin ON public.security_events USING gin (additional_data) WHERE (additional_data IS NOT NULL);


--
-- Name: idx_security_events_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_archived ON public.security_events USING btree (archived) WHERE (archived = false);


--
-- Name: idx_security_events_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_campaign_id ON public.security_events USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_security_events_compliance_relevant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_compliance_relevant ON public.security_events USING btree (compliance_relevant) WHERE (compliance_relevant = true);


--
-- Name: idx_security_events_event_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_event_timestamp ON public.security_events USING btree (event_timestamp);


--
-- Name: idx_security_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_event_type ON public.security_events USING btree (event_type);


--
-- Name: idx_security_events_investigated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_investigated ON public.security_events USING btree (investigated) WHERE (investigated = false);


--
-- Name: idx_security_events_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_ip_address ON public.security_events USING btree (ip_address);


--
-- Name: idx_security_events_ip_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_ip_tracking ON public.security_events USING btree (ip_address, event_timestamp DESC, event_type);


--
-- Name: idx_security_events_ip_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_ip_type_time ON public.security_events USING btree (ip_address, event_type, event_timestamp DESC);


--
-- Name: idx_security_events_monitoring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_monitoring ON public.security_events USING btree (event_type, event_timestamp DESC, severity) WHERE (threat_detected = true);


--
-- Name: idx_security_events_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_resolved ON public.security_events USING btree (resolved) WHERE (resolved = false);


--
-- Name: idx_security_events_resource_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_resource_type ON public.security_events USING btree (resource_type) WHERE (resource_type IS NOT NULL);


--
-- Name: idx_security_events_response_actions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_response_actions_gin ON public.security_events USING gin (response_actions) WHERE (response_actions IS NOT NULL);


--
-- Name: idx_security_events_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_session_id ON public.security_events USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_security_events_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_severity ON public.security_events USING btree (severity);


--
-- Name: idx_security_events_severity_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_severity_time ON public.security_events USING btree (severity, event_timestamp DESC) WHERE ((severity)::text = ANY ((ARRAY['critical'::character varying, 'high'::character varying])::text[]));


--
-- Name: idx_security_events_threat_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_threat_detected ON public.security_events USING btree (threat_detected) WHERE (threat_detected = true);


--
-- Name: idx_security_events_threat_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_threat_time ON public.security_events USING btree (threat_detected, event_timestamp DESC) WHERE (threat_detected = true);


--
-- Name: idx_security_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_security_events_user_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_user_type_time ON public.security_events USING btree (user_id, event_type, event_timestamp DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_service_architecture_metrics_alert_threshold_breached; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_alert_threshold_breached ON public.service_architecture_metrics USING btree (alert_threshold_breached) WHERE (alert_threshold_breached = true);


--
-- Name: idx_service_architecture_metrics_availability_percent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_availability_percent ON public.service_architecture_metrics USING btree (availability_percent);


--
-- Name: idx_service_architecture_metrics_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_campaign_id ON public.service_architecture_metrics USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_service_architecture_metrics_env_health; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_env_health ON public.service_architecture_metrics USING btree (environment, health_score DESC, measurement_timestamp DESC);


--
-- Name: idx_service_architecture_metrics_environment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_environment ON public.service_architecture_metrics USING btree (environment);


--
-- Name: idx_service_architecture_metrics_health_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_health_score ON public.service_architecture_metrics USING btree (health_score);


--
-- Name: idx_service_architecture_metrics_measurement_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_measurement_timestamp ON public.service_architecture_metrics USING btree (measurement_timestamp);


--
-- Name: idx_service_architecture_metrics_service_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_service_name ON public.service_architecture_metrics USING btree (service_name);


--
-- Name: idx_service_architecture_metrics_service_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_service_time ON public.service_architecture_metrics USING btree (service_name, measurement_timestamp DESC);


--
-- Name: idx_service_architecture_metrics_service_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_architecture_metrics_service_type ON public.service_architecture_metrics USING btree (service_type);


--
-- Name: idx_service_capacity_metrics_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_campaign_id ON public.service_capacity_metrics USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_service_capacity_metrics_capacity_alert_triggered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_capacity_alert_triggered ON public.service_capacity_metrics USING btree (capacity_alert_triggered) WHERE (capacity_alert_triggered = true);


--
-- Name: idx_service_capacity_metrics_environment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_environment ON public.service_capacity_metrics USING btree (environment);


--
-- Name: idx_service_capacity_metrics_high_utilization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_high_utilization ON public.service_capacity_metrics USING btree (request_capacity_utilization_percent DESC, memory_capacity_utilization_percent DESC) WHERE ((request_capacity_utilization_percent > (80)::numeric) OR (memory_capacity_utilization_percent > (80)::numeric));


--
-- Name: idx_service_capacity_metrics_measurement_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_measurement_timestamp ON public.service_capacity_metrics USING btree (measurement_timestamp);


--
-- Name: idx_service_capacity_metrics_performance_degraded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_performance_degraded ON public.service_capacity_metrics USING btree (performance_degraded) WHERE (performance_degraded = true);


--
-- Name: idx_service_capacity_metrics_scale_up_triggered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_scale_up_triggered ON public.service_capacity_metrics USING btree (scale_up_triggered) WHERE (scale_up_triggered = true);


--
-- Name: idx_service_capacity_metrics_service_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_service_name ON public.service_capacity_metrics USING btree (service_name);


--
-- Name: idx_service_capacity_metrics_service_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_service_time ON public.service_capacity_metrics USING btree (service_name, measurement_timestamp DESC);


--
-- Name: idx_service_capacity_metrics_service_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_capacity_metrics_service_type ON public.service_capacity_metrics USING btree (service_type);


--
-- Name: idx_service_dependencies_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_active ON public.service_dependencies USING btree (active) WHERE (active = true);


--
-- Name: idx_service_dependencies_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_campaign_id ON public.service_dependencies USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_service_dependencies_critical_unhealthy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_critical_unhealthy ON public.service_dependencies USING btree (is_critical, health_status) WHERE ((is_critical = true) AND ((health_status)::text <> 'healthy'::text));


--
-- Name: idx_service_dependencies_dependency_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_dependency_type ON public.service_dependencies USING btree (dependency_type);


--
-- Name: idx_service_dependencies_environment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_environment ON public.service_dependencies USING btree (environment);


--
-- Name: idx_service_dependencies_health_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_health_status ON public.service_dependencies USING btree (health_status);


--
-- Name: idx_service_dependencies_is_critical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_is_critical ON public.service_dependencies USING btree (is_critical) WHERE (is_critical = true);


--
-- Name: idx_service_dependencies_source_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_source_service ON public.service_dependencies USING btree (source_service);


--
-- Name: idx_service_dependencies_source_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_source_target ON public.service_dependencies USING btree (source_service, target_service, active) WHERE (active = true);


--
-- Name: idx_service_dependencies_target_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_dependencies_target_service ON public.service_dependencies USING btree (target_service);


--
-- Name: idx_sessions_cleanup_expired; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_cleanup_expired ON public.sessions USING btree (expires_at, is_active) WHERE (is_active = true);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_is_active ON public.sessions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_sessions_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_last_activity ON public.sessions USING btree (last_activity_at);


--
-- Name: idx_sessions_token_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token_lookup ON public.sessions USING btree (id) INCLUDE (user_id, expires_at, is_active);


--
-- Name: idx_sessions_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_active ON public.sessions USING btree (user_id, is_active, created_at DESC) WHERE (is_active = true);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_system_health_monitoring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_health_monitoring ON public.resource_utilization_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_user_activity_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_analytics ON public.audit_logs USING btree (user_id, "timestamp") INCLUDE (action, entity_type) WHERE (user_id IS NOT NULL);


--
-- Name: idx_user_campaigns_join; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_campaigns_join ON public.lead_generation_campaigns USING btree (user_id) INCLUDE (id, name, phase_status, created_at, current_phase);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_verified ON public.users USING btree (email_verified) WHERE (email_verified = true);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_users_locked_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_locked_until ON public.users USING btree (locked_until) WHERE (locked_until IS NOT NULL);


--
-- Name: idx_users_offset_pagination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_offset_pagination ON public.users USING btree (created_at DESC, id) WHERE (is_active = true);


--
-- Name: domain_extracted_keywords domain_extracted_keywords_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER domain_extracted_keywords_updated_at_trigger BEFORE UPDATE ON public.domain_extracted_keywords FOR EACH ROW EXECUTE FUNCTION public.update_domain_extracted_keywords_updated_at();


--
-- Name: domain_extraction_features domain_extraction_features_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER domain_extraction_features_updated_at_trigger BEFORE UPDATE ON public.domain_extraction_features FOR EACH ROW EXECUTE FUNCTION public.update_domain_extraction_features_updated_at();


--
-- Name: keyword_rules sync_keyword_rules_to_jsonb; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_keyword_rules_to_jsonb AFTER INSERT OR DELETE OR UPDATE ON public.keyword_rules FOR EACH ROW EXECUTE FUNCTION public.update_keyword_set_rules_jsonb();


--
-- Name: TRIGGER sync_keyword_rules_to_jsonb ON keyword_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER sync_keyword_rules_to_jsonb ON public.keyword_rules IS 'Maintains hybrid storage: relational keyword_rules for management, JSONB for Phase 3 HTTP scanning performance';


--
-- Name: generated_domains trg_campaign_domain_counters_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_campaign_domain_counters_delete AFTER DELETE ON public.generated_domains FOR EACH ROW EXECUTE FUNCTION public.campaign_domain_counters_upsert();


--
-- Name: generated_domains trg_campaign_domain_counters_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_campaign_domain_counters_insert AFTER INSERT ON public.generated_domains FOR EACH ROW EXECUTE FUNCTION public.campaign_domain_counters_upsert();


--
-- Name: generated_domains trg_campaign_domain_counters_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_campaign_domain_counters_update AFTER UPDATE ON public.generated_domains FOR EACH ROW EXECUTE FUNCTION public.campaign_domain_counters_upsert();


--
-- Name: lead_generation_campaigns trigger_audit_campaigns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_campaigns AFTER INSERT OR DELETE OR UPDATE ON public.lead_generation_campaigns FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();


--
-- Name: generated_domains trigger_audit_domains; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_domains AFTER INSERT OR DELETE OR UPDATE ON public.generated_domains FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();


--
-- Name: campaign_jobs trigger_audit_jobs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_jobs AFTER INSERT OR DELETE OR UPDATE ON public.campaign_jobs FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();


--
-- Name: personas trigger_audit_personas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_personas AFTER INSERT OR DELETE OR UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();


--
-- Name: proxies trigger_audit_proxies; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_proxies AFTER INSERT OR DELETE OR UPDATE ON public.proxies FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();


--
-- Name: users trigger_audit_users; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_users AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();


--
-- Name: cache_entries trigger_cache_lifecycle; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_cache_lifecycle BEFORE INSERT OR UPDATE ON public.cache_entries FOR EACH ROW EXECUTE FUNCTION public.trigger_cache_entry_lifecycle();


--
-- Name: campaign_phases trigger_campaign_phase_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_campaign_phase_sync AFTER INSERT OR UPDATE ON public.campaign_phases FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_campaign_from_phases();


--
-- Name: generated_domains trigger_domain_validation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_domain_validation AFTER UPDATE ON public.generated_domains FOR EACH ROW EXECUTE FUNCTION public.trigger_domain_validation_update();


--
-- Name: event_store trigger_event_sequence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_event_sequence BEFORE INSERT ON public.event_store FOR EACH ROW EXECUTE FUNCTION public.trigger_event_store_sequence();


--
-- Name: campaign_jobs trigger_job_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_job_status BEFORE UPDATE ON public.campaign_jobs FOR EACH ROW EXECUTE FUNCTION public.trigger_job_status_update();


--
-- Name: proxy_pool_memberships trigger_proxy_membership_consistency; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_proxy_membership_consistency BEFORE INSERT OR UPDATE ON public.proxy_pool_memberships FOR EACH ROW EXECUTE FUNCTION public.trigger_proxy_pool_consistency();


--
-- Name: sessions trigger_session_management; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_session_management AFTER INSERT OR UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.trigger_user_session_management();


--
-- Name: lead_generation_campaigns trigger_timestamp_campaigns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_timestamp_campaigns BEFORE UPDATE ON public.lead_generation_campaigns FOR EACH ROW EXECUTE FUNCTION public.trigger_update_timestamp();


--
-- Name: campaign_jobs trigger_timestamp_jobs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_timestamp_jobs BEFORE UPDATE ON public.campaign_jobs FOR EACH ROW EXECUTE FUNCTION public.trigger_update_timestamp();


--
-- Name: users trigger_timestamp_users; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_timestamp_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_update_timestamp();


--
-- Name: architecture_refactor_log architecture_refactor_log_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.architecture_refactor_log
    ADD CONSTRAINT architecture_refactor_log_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: architecture_refactor_log architecture_refactor_log_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.architecture_refactor_log
    ADD CONSTRAINT architecture_refactor_log_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: architecture_refactor_log architecture_refactor_log_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.architecture_refactor_log
    ADD CONSTRAINT architecture_refactor_log_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auth_audit_logs auth_audit_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: auth_audit_logs auth_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: authorization_decisions authorization_decisions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: authorization_decisions authorization_decisions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: authorization_decisions authorization_decisions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: authorization_decisions authorization_decisions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cache_configurations cache_configurations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_configurations
    ADD CONSTRAINT cache_configurations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cache_entries cache_entries_cache_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_cache_configuration_id_fkey FOREIGN KEY (cache_configuration_id) REFERENCES public.cache_configurations(id) ON DELETE CASCADE;


--
-- Name: cache_entries cache_entries_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: cache_entries cache_entries_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cache_entries cache_entries_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: cache_entries cache_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cache_invalidation_log cache_invalidation_log_cache_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_invalidation_log
    ADD CONSTRAINT cache_invalidation_log_cache_configuration_id_fkey FOREIGN KEY (cache_configuration_id) REFERENCES public.cache_configurations(id) ON DELETE CASCADE;


--
-- Name: cache_invalidation_log cache_invalidation_log_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_invalidation_log
    ADD CONSTRAINT cache_invalidation_log_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: cache_invalidation_log cache_invalidation_log_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_invalidation_log
    ADD CONSTRAINT cache_invalidation_log_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cache_invalidations cache_invalidations_cache_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_invalidations
    ADD CONSTRAINT cache_invalidations_cache_configuration_id_fkey FOREIGN KEY (cache_configuration_id) REFERENCES public.cache_configurations(id) ON DELETE CASCADE;


--
-- Name: cache_invalidations cache_invalidations_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_invalidations
    ADD CONSTRAINT cache_invalidations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: cache_invalidations cache_invalidations_depends_on_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_invalidations
    ADD CONSTRAINT cache_invalidations_depends_on_fkey FOREIGN KEY (depends_on) REFERENCES public.cache_invalidations(id) ON DELETE SET NULL;


--
-- Name: cache_invalidations cache_invalidations_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_invalidations
    ADD CONSTRAINT cache_invalidations_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cache_metrics cache_metrics_cache_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_metrics
    ADD CONSTRAINT cache_metrics_cache_configuration_id_fkey FOREIGN KEY (cache_configuration_id) REFERENCES public.cache_configurations(id) ON DELETE CASCADE;


--
-- Name: campaign_access_grants campaign_access_grants_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_access_grants campaign_access_grants_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: campaign_access_grants campaign_access_grants_inherited_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_inherited_from_fkey FOREIGN KEY (inherited_from) REFERENCES public.campaign_access_grants(id) ON DELETE SET NULL;


--
-- Name: campaign_access_grants campaign_access_grants_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: campaign_access_grants campaign_access_grants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: campaign_domain_counters campaign_domain_counters_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_domain_counters
    ADD CONSTRAINT campaign_domain_counters_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_jobs campaign_jobs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_jobs
    ADD CONSTRAINT campaign_jobs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_phases campaign_phases_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_phases
    ADD CONSTRAINT campaign_phases_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_scoring_profile campaign_scoring_profile_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_scoring_profile
    ADD CONSTRAINT campaign_scoring_profile_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_scoring_profile campaign_scoring_profile_scoring_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_scoring_profile
    ADD CONSTRAINT campaign_scoring_profile_scoring_profile_id_fkey FOREIGN KEY (scoring_profile_id) REFERENCES public.scoring_profiles(id) ON DELETE CASCADE;


--
-- Name: campaign_state_events campaign_state_events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT campaign_state_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_snapshots campaign_state_snapshots_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT campaign_state_snapshots_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_transitions campaign_state_transitions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_transitions campaign_state_transitions_state_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_state_event_id_fkey FOREIGN KEY (state_event_id) REFERENCES public.campaign_state_events(id) ON DELETE CASCADE;


--
-- Name: communication_patterns communication_patterns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_patterns
    ADD CONSTRAINT communication_patterns_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: config_locks config_locks_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_locks
    ADD CONSTRAINT config_locks_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: config_locks config_locks_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_locks
    ADD CONSTRAINT config_locks_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: config_locks config_locks_parent_lock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_locks
    ADD CONSTRAINT config_locks_parent_lock_id_fkey FOREIGN KEY (parent_lock_id) REFERENCES public.config_locks(id) ON DELETE CASCADE;


--
-- Name: config_locks config_locks_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_locks
    ADD CONSTRAINT config_locks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: config_versions config_versions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: config_versions config_versions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: config_versions config_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: config_versions config_versions_deployed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_deployed_by_fkey FOREIGN KEY (deployed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: dns_validation_results dns_validation_results_dns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_dns_campaign_id_fkey FOREIGN KEY (dns_campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: dns_validation_results dns_validation_results_generated_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_generated_domain_id_fkey FOREIGN KEY (generated_domain_id) REFERENCES public.generated_domains(id) ON DELETE SET NULL;


--
-- Name: domain_generation_campaign_params domain_generation_campaign_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_campaign_params
    ADD CONSTRAINT domain_generation_campaign_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: event_projections event_projections_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_projections
    ADD CONSTRAINT event_projections_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: event_projections event_projections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_projections
    ADD CONSTRAINT event_projections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: event_projections event_projections_last_processed_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_projections
    ADD CONSTRAINT event_projections_last_processed_event_id_fkey FOREIGN KEY (last_processed_event_id) REFERENCES public.event_store(event_id) ON DELETE SET NULL;


--
-- Name: event_store event_store_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: event_store event_store_parent_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_parent_event_id_fkey FOREIGN KEY (parent_event_id) REFERENCES public.event_store(event_id) ON DELETE SET NULL;


--
-- Name: event_store event_store_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: event_store event_store_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: campaign_states fk_campaign_states_campaign_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_states
    ADD CONSTRAINT fk_campaign_states_campaign_id FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: dns_validation_results fk_dns_validation_results_persona_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT fk_dns_validation_results_persona_id FOREIGN KEY (validated_by_persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results fk_http_keyword_results_campaign_proper; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT fk_http_keyword_results_campaign_proper FOREIGN KEY (http_keyword_campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_results fk_http_keyword_results_persona_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT fk_http_keyword_results_persona_id FOREIGN KEY (validated_by_persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results fk_http_keyword_results_proxy_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT fk_http_keyword_results_proxy_id FOREIGN KEY (used_proxy_id) REFERENCES public.proxies(id) ON DELETE SET NULL;


--
-- Name: lead_generation_campaigns fk_lead_generation_campaigns_current_phase_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_generation_campaigns
    ADD CONSTRAINT fk_lead_generation_campaigns_current_phase_id FOREIGN KEY (current_phase_id) REFERENCES public.campaign_phases(id) ON DELETE SET NULL;


--
-- Name: phase_executions fk_phase_executions_campaign_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phase_executions
    ADD CONSTRAINT fk_phase_executions_campaign_id FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: generated_domains generated_domains_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT generated_domains_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT generated_domains_campaign_id_fkey ON generated_domains; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT generated_domains_campaign_id_fkey ON public.generated_domains IS 'Ensures all domains belong to valid campaigns';


--
-- Name: http_keyword_results http_keyword_results_dns_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_dns_result_id_fkey FOREIGN KEY (dns_result_id) REFERENCES public.dns_validation_results(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_http_keyword_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_http_keyword_campaign_id_fkey FOREIGN KEY (http_keyword_campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: keyword_rules keyword_rules_keyword_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_rules
    ADD CONSTRAINT keyword_rules_keyword_set_id_fkey FOREIGN KEY (keyword_set_id) REFERENCES public.keyword_sets(id) ON DELETE CASCADE;


--
-- Name: lead_generation_campaigns lead_generation_campaigns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_generation_campaigns
    ADD CONSTRAINT lead_generation_campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pagination_performance_metrics pagination_performance_metrics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagination_performance_metrics
    ADD CONSTRAINT pagination_performance_metrics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: pagination_performance_metrics pagination_performance_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagination_performance_metrics
    ADD CONSTRAINT pagination_performance_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: phase_configurations phase_configurations_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phase_configurations
    ADD CONSTRAINT phase_configurations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: phase_runs phase_runs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phase_runs
    ADD CONSTRAINT phase_runs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: proxy_pool_memberships proxy_pool_memberships_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pool_memberships
    ADD CONSTRAINT proxy_pool_memberships_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.proxy_pools(id) ON DELETE CASCADE;


--
-- Name: proxy_pool_memberships proxy_pool_memberships_proxy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pool_memberships
    ADD CONSTRAINT proxy_pool_memberships_proxy_id_fkey FOREIGN KEY (proxy_id) REFERENCES public.proxies(id) ON DELETE CASCADE;


--
-- Name: query_performance_metrics query_performance_metrics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_performance_metrics
    ADD CONSTRAINT query_performance_metrics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: query_performance_metrics query_performance_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_performance_metrics
    ADD CONSTRAINT query_performance_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: resource_utilization_metrics resource_utilization_metrics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_utilization_metrics
    ADD CONSTRAINT resource_utilization_metrics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: scoring_profile_snapshots scoring_profile_snapshots_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_profile_snapshots
    ADD CONSTRAINT scoring_profile_snapshots_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE CASCADE;


--
-- Name: security_events security_events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: security_events security_events_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: security_events security_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: service_architecture_metrics service_architecture_metrics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_architecture_metrics
    ADD CONSTRAINT service_architecture_metrics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: service_capacity_metrics service_capacity_metrics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_capacity_metrics
    ADD CONSTRAINT service_capacity_metrics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: service_dependencies service_dependencies_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.lead_generation_campaigns(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO domainflow;


--
-- PostgreSQL database dump complete
--

\unrestrict 5H5yiCInLaHIJNjoHk4YdlKPtxe0L5boHpWxjwb2Pp0jlHckMBcYVUN7cbMYUnf

