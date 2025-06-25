--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Ubuntu 17.5-1.pgdg25.04+1)
-- Dumped by pg_dump version 17.5 (Ubuntu 17.5-1.pgdg25.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- Name: consolidation; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA consolidation;


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
-- Name: campaign_job_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_job_status_enum AS ENUM (
    'pending',
    'queued',
    'running',
    'processing',
    'completed',
    'failed',
    'retry'
);


--
-- Name: TYPE campaign_job_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.campaign_job_status_enum IS 'Maps to Go CampaignJobStatusEnum';


--
-- Name: campaign_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_status_enum AS ENUM (
    'pending',
    'queued',
    'running',
    'pausing',
    'paused',
    'completed',
    'failed',
    'archived',
    'cancelled'
);


--
-- Name: TYPE campaign_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.campaign_status_enum IS 'Maps to Go CampaignStatusEnum - includes archived status';


--
-- Name: campaign_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_type_enum AS ENUM (
    'domain_generation',
    'dns_validation',
    'http_keyword_validation'
);


--
-- Name: TYPE campaign_type_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.campaign_type_enum IS 'Maps to Go CampaignTypeEnum';


--
-- Name: dns_validation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dns_validation_status_enum AS ENUM (
    'resolved',
    'unresolved',
    'timeout',
    'error'
);


--
-- Name: TYPE dns_validation_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.dns_validation_status_enum IS 'Maps to Go DNSValidationStatusEnum';


--
-- Name: http_validation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.http_validation_status_enum AS ENUM (
    'success',
    'failed',
    'timeout',
    'error'
);


--
-- Name: TYPE http_validation_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.http_validation_status_enum IS 'Maps to Go HTTPValidationStatusEnum';


--
-- Name: keyword_rule_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.keyword_rule_type_enum AS ENUM (
    'string',
    'regex'
);


--
-- Name: TYPE keyword_rule_type_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.keyword_rule_type_enum IS 'Maps to Go KeywordRuleTypeEnum';


--
-- Name: persona_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.persona_type_enum AS ENUM (
    'dns',
    'http'
);


--
-- Name: TYPE persona_type_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.persona_type_enum IS 'Maps to Go PersonaTypeEnum';


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
-- Name: TYPE proxy_protocol_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.proxy_protocol_enum IS 'Maps to Go ProxyProtocolEnum';


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
-- Name: TYPE validation_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.validation_status_enum IS 'Maps to Go ValidationStatusEnum';


--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.cleanup_expired_sessions() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired sessions
    WITH deleted AS (
        DELETE FROM auth.sessions
        WHERE expires_at < NOW()
        OR (is_active = FALSE AND last_activity_at < (NOW() - INTERVAL '7 days'))
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log cleanup operation
    INSERT INTO auth.auth_audit_log (event_type, event_status, details)
    VALUES ('session_cleanup', 'success',
            jsonb_build_object('deleted_sessions', deleted_count, 'cleanup_time', NOW()));
    
    RETURN deleted_count;
   END;
   $$;


--
-- Name: FUNCTION cleanup_expired_sessions(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.cleanup_expired_sessions() IS 'Removes expired and inactive sessions from the database';


--
-- Name: update_session_fingerprint(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.update_session_fingerprint() RETURNS trigger
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    -- Generate session fingerprint from IP and user agent
    IF NEW.ip_address IS NOT NULL AND NEW.user_agent IS NOT NULL THEN
        NEW.session_fingerprint := encode(
            digest(
                COALESCE(host(NEW.ip_address), '') || '|' ||
                COALESCE(NEW.user_agent, '') || '|' ||
                COALESCE(NEW.screen_resolution, ''),
                'sha256'
            ),
            'hex'
        );
    END IF;
    
    -- Generate user agent hash
    IF NEW.user_agent IS NOT NULL THEN
        NEW.user_agent_hash := generate_user_agent_hash(NEW.user_agent);
    END IF;
    
    -- Generate browser fingerprint (simplified version)
    IF NEW.user_agent IS NOT NULL THEN
    	NEW.browser_fingerprint := encode(
    		digest(
    			COALESCE(NEW.user_agent, '') || '|' ||
    			COALESCE(NEW.screen_resolution, ''),
    			'sha256'
    		),
    		'hex'
    	);
    END IF;
    
    RETURN NEW;
      END;
      $$;


--
-- Name: validate_session_security(character varying, inet, text, boolean, boolean); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.validate_session_security(p_session_id character varying, p_client_ip inet, p_user_agent text, p_require_ip_match boolean DEFAULT false, p_require_ua_match boolean DEFAULT false) RETURNS TABLE(is_valid boolean, user_id uuid, security_flags jsonb, permissions text[], roles text[])
    LANGUAGE plpgsql
    AS $$
DECLARE
    session_record RECORD;
    current_fingerprint VARCHAR(255);
    security_issues JSONB := '{}'::jsonb;
BEGIN
    -- Get session record with user permissions and roles
    SELECT s.*, array_agg(DISTINCT p.name) as user_permissions, array_agg(DISTINCT r.name) as user_roles
    INTO session_record
    FROM auth.sessions s
    JOIN auth.users u ON s.user_id = u.id
    LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
    LEFT JOIN auth.roles r ON ur.role_id = r.id
    LEFT JOIN auth.role_permissions rp ON r.id = rp.role_id
    LEFT JOIN auth.permissions p ON rp.permission_id = p.id
    WHERE s.id = p_session_id
    AND s.is_active = TRUE
    AND s.expires_at > NOW()
    AND u.is_active = TRUE
    AND u.is_locked = FALSE
    GROUP BY s.id, s.user_id, s.ip_address, s.user_agent, s.session_fingerprint,
             s.browser_fingerprint, s.user_agent_hash, s.is_active, s.expires_at,
             s.last_activity_at, s.created_at, s.screen_resolution;
    
    -- Check if session exists and is valid
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, '{"error": "session_not_found"}'::jsonb, NULL::TEXT[], NULL::TEXT[];
        RETURN;
    END IF;
    
    -- Generate current fingerprint for comparison
    IF p_client_ip IS NOT NULL AND p_user_agent IS NOT NULL THEN
        current_fingerprint := encode(
            digest(
                COALESCE(host(p_client_ip), '') || '|' ||
                COALESCE(p_user_agent, ''),
                'sha256'
            ),
            'hex'
        );
    END IF;
    
    -- Security validations
    IF p_require_ip_match AND session_record.ip_address != p_client_ip THEN
        security_issues := security_issues || '{"ip_mismatch": true}'::jsonb;
    END IF;
    
    IF p_require_ua_match AND session_record.user_agent_hash != generate_user_agent_hash(p_user_agent) THEN
        security_issues := security_issues || '{"user_agent_mismatch": true}'::jsonb;
    END IF;
    
    -- Check for session fingerprint changes
    IF session_record.session_fingerprint IS NOT NULL AND current_fingerprint IS NOT NULL
       AND session_record.session_fingerprint != current_fingerprint THEN
        security_issues := security_issues || '{"fingerprint_mismatch": true}'::jsonb;
    END IF;
    
    -- Check for idle timeout (30 minutes default)
    IF session_record.last_activity_at < (NOW() - INTERVAL '30 minutes') THEN
        security_issues := security_issues || '{"idle_timeout": true}'::jsonb;
    END IF;
    
    -- Return validation result
    IF jsonb_object_keys(security_issues) IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, session_record.user_id, security_issues, NULL::TEXT[], NULL::TEXT[];
    ELSE
        RETURN QUERY SELECT TRUE, session_record.user_id, '{}'::jsonb,
                           session_record.user_permissions, session_record.user_roles;
    END IF;
    
    -- Update last activity
    UPDATE auth.sessions
    SET last_activity_at = NOW()
    WHERE id = p_session_id;
   END;
   $$;


--
-- Name: FUNCTION validate_session_security(p_session_id character varying, p_client_ip inet, p_user_agent text, p_require_ip_match boolean, p_require_ua_match boolean); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.validate_session_security(p_session_id character varying, p_client_ip inet, p_user_agent text, p_require_ip_match boolean, p_require_ua_match boolean) IS 'Validates session security with optional IP and user agent matching';


--
-- Name: acquire_config_lock(text, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone) RETURNS TABLE(success boolean, lock_id uuid, conflict_owner text, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    existing_lock_owner TEXT;
    existing_expires_at TIMESTAMPTZ;
    new_lock_id UUID;
BEGIN
    -- Check for existing active locks
    SELECT owner, expires_at INTO existing_lock_owner, existing_expires_at
    FROM config_locks 
    WHERE config_hash = p_config_hash AND is_active = true
    FOR UPDATE;
    
    -- Check if existing lock is expired
    IF existing_lock_owner IS NOT NULL THEN
        IF existing_expires_at IS NOT NULL AND existing_expires_at <= NOW() THEN
            -- Clean up expired lock
            UPDATE config_locks 
            SET is_active = false, updated_at = NOW()
            WHERE config_hash = p_config_hash AND is_active = true AND expires_at <= NOW();
            existing_lock_owner := NULL;
        END IF;
    END IF;
    
    -- If lock exists and is not expired, return conflict
    IF existing_lock_owner IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, existing_lock_owner, 'Configuration is locked by another owner'::TEXT;
        RETURN;
    END IF;
    
    -- Create new lock
    new_lock_id := uuid_generate_v4();
    
    INSERT INTO config_locks (id, config_hash, lock_type, owner, lock_reason, acquired_at, expires_at, is_active, created_at, updated_at)
    VALUES (new_lock_id, p_config_hash, p_lock_type, p_owner, p_lock_reason, NOW(), p_expires_at, true, NOW(), NOW());
    
    RETURN QUERY SELECT TRUE, new_lock_id, NULL::TEXT, NULL::TEXT;
END;
$$;


--
-- Name: FUNCTION acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone) IS 'Atomically acquires a distributed lock on configuration with conflict detection';


--
-- Name: acquire_resource_lock(character varying, character varying, character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acquire_resource_lock(p_resource_type character varying, p_resource_id character varying, p_lock_holder character varying, p_lock_mode character varying DEFAULT 'exclusive'::character varying, p_timeout_seconds integer DEFAULT 30) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    lock_id UUID;
    expiry_time TIMESTAMPTZ := NOW() + (p_timeout_seconds || ' seconds')::INTERVAL;
    existing_locks INTEGER;
    existing_exclusive INTEGER;
BEGIN
    -- Clean up expired locks
    DELETE FROM resource_locks WHERE expires_at < NOW();
    
    -- Check existing locks on this resource
    SELECT COUNT(*), COUNT(*) FILTER (WHERE lock_mode = 'exclusive')
    INTO existing_locks, existing_exclusive
    FROM resource_locks 
    WHERE resource_type = p_resource_type AND resource_id = p_resource_id;
    
    -- Apply locking rules
    IF p_lock_mode = 'exclusive' THEN
        -- Exclusive lock: cannot acquire if any other locks exist
        IF existing_locks > 0 THEN
            RETURN NULL;
        END IF;
    ELSE
        -- Shared lock: cannot acquire if exclusive lock exists
        IF existing_exclusive > 0 THEN
            RETURN NULL;
        END IF;
    END IF;
    
    -- Acquire the lock
    INSERT INTO resource_locks
        (resource_type, resource_id, lock_holder, lock_mode, expires_at)
    VALUES
        (p_resource_type, p_resource_id, p_lock_holder, p_lock_mode, expiry_time)
    RETURNING resource_locks.lock_id INTO lock_id;
    
    RETURN lock_id;
END;
$$;


--
-- Name: acquire_state_lock(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acquire_state_lock(p_lock_key character varying, p_locked_by character varying, p_timeout_seconds integer DEFAULT 30) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
		BEGIN
			INSERT INTO state_coordination_locks (lock_key, locked_by, locked_at, expires_at)
			VALUES (p_lock_key, p_locked_by, NOW(), NOW() + (p_timeout_seconds || ' seconds')::INTERVAL)
			ON CONFLICT (lock_key) DO NOTHING;
			
			RETURN FOUND;
		END;
		$$;


--
-- Name: acquire_state_lock(uuid, character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acquire_state_lock(p_entity_id uuid, p_entity_type character varying, p_lock_holder character varying, p_lock_duration_seconds integer DEFAULT 30) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    lock_token UUID;
    current_time TIMESTAMPTZ := NOW();
    expiry_time TIMESTAMPTZ := current_time + (p_lock_duration_seconds || ' seconds')::INTERVAL;
BEGIN
    -- Clean up expired locks first
    DELETE FROM state_coordination_locks 
    WHERE expires_at < current_time;
    
    -- Try to acquire lock
    INSERT INTO state_coordination_locks 
        (entity_id, entity_type, lock_holder, lock_token, expires_at)
    VALUES 
        (p_entity_id, p_entity_type, p_lock_holder, gen_random_uuid(), expiry_time)
    ON CONFLICT (entity_id) DO NOTHING
    RETURNING lock_token INTO lock_token;
    
    RETURN lock_token;
END;
$$;


--
-- Name: analyze_index_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analyze_index_usage() RETURNS TABLE(schema_name text, table_name text, index_name text, index_type text, total_scans bigint, tuples_read bigint, tuples_fetched bigint, last_scan timestamp with time zone, usage_ratio numeric, recommendation text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        psi.schemaname::TEXT,
        psi.relname::TEXT,
        psi.indexrelname::TEXT,
        'btree'::TEXT as index_type,
        psi.idx_scan,
        psi.idx_tup_read,
        psi.idx_tup_fetch,
        psi.last_idx_scan,
        CASE 
            WHEN psi.idx_scan > 0 AND psi.idx_tup_read > 0 THEN ROUND((psi.idx_tup_fetch::DECIMAL / psi.idx_tup_read) * 100, 2)
            ELSE 0.00 
        END as usage_ratio,
        CASE 
            WHEN psi.idx_scan = 0 THEN 'Consider dropping unused index'
            WHEN psi.idx_scan < 100 THEN 'Low usage - review necessity'
            ELSE 'Good usage'
        END::TEXT as recommendation
    FROM pg_stat_user_indexes psi
    ORDER BY psi.idx_scan DESC;
END;
$$;


--
-- Name: assign_domain_batch(uuid, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_domain_batch(p_campaign_id uuid, p_worker_id character varying, p_batch_size integer DEFAULT 1000) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_batch_id UUID;
    v_batch_num INTEGER;
BEGIN
    -- Get next available batch
    SELECT dgb.batch_id, dgb.batch_number INTO v_batch_id, v_batch_num
    FROM domain_generation_batches dgb
    WHERE dgb.campaign_id = p_campaign_id
      AND dgb.status = 'pending'
      AND dgb.assigned_worker_id IS NULL
    ORDER BY dgb.batch_number
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_batch_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Assign batch to worker
    UPDATE domain_generation_batches
    SET assigned_worker_id = p_worker_id,
        status = 'assigned',
        started_at = NOW()
    WHERE batch_id = v_batch_id;

    -- Update worker coordination
    INSERT INTO worker_coordination (worker_id, campaign_id, worker_type, status, assigned_tasks)
    VALUES (p_worker_id, p_campaign_id, 'domain_generator', 'working',
            jsonb_build_array(jsonb_build_object('batch_id', v_batch_id, 'batch_number', v_batch_num)))
    ON CONFLICT (worker_id) DO UPDATE SET
        campaign_id = EXCLUDED.campaign_id,
        status = EXCLUDED.status,
        assigned_tasks = worker_coordination.assigned_tasks || EXCLUDED.assigned_tasks,
        last_heartbeat = NOW(),
        updated_at = NOW();

    RETURN v_batch_id;
END;
$$;


--
-- Name: atomic_update_domain_config_state(text, bigint, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb) RETURNS TABLE(success boolean, new_version bigint, conflict_version bigint, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_version BIGINT;
    current_offset BIGINT;
    new_version_val BIGINT;
BEGIN
    -- Acquire row-level lock and get current state
    SELECT version, last_offset INTO current_version, current_offset
    FROM domain_generation_config_states 
    WHERE config_hash = p_config_hash
    FOR UPDATE;
    
    -- Check if config exists
    IF NOT FOUND THEN
        -- Create new config if it doesn't exist
        IF p_expected_version != 0 THEN
            RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT, 'Config does not exist but expected version > 0'::TEXT;
            RETURN;
        END IF;
        
        INSERT INTO domain_generation_config_states 
            (config_hash, last_offset, config_details, version, updated_at, created_at)
        VALUES 
            (p_config_hash, p_new_last_offset, p_config_details, 1, NOW(), NOW());
        
        RETURN QUERY SELECT TRUE, 1::BIGINT, 0::BIGINT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check version for optimistic locking
    IF current_version != p_expected_version THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, current_version, 'Version conflict detected'::TEXT;
        RETURN;
    END IF;
    
    -- Validate that offset is not moving backward (race condition protection)
    IF p_new_last_offset < current_offset THEN
        RETURN QUERY SELECT FALSE, current_version, current_version, 
            format('Offset moving backward from %s to %s', current_offset, p_new_last_offset)::TEXT;
        RETURN;
    END IF;
    
    -- Update with new version
    new_version_val := current_version + 1;
    
    UPDATE domain_generation_config_states 
    SET 
        last_offset = p_new_last_offset,
        config_details = p_config_details,
        version = new_version_val,
        updated_at = NOW()
    WHERE config_hash = p_config_hash 
      AND version = p_expected_version;
    
    -- Verify update succeeded
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, current_version, 'Update failed - concurrent modification'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT TRUE, new_version_val, 0::BIGINT, NULL::TEXT;
END;
$$;


--
-- Name: FUNCTION atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb) IS 'Atomically updates domain generation config state with optimistic locking and race condition protection';


--
-- Name: calculate_efficiency_score(numeric, numeric, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_efficiency_score(p_cpu_util numeric, p_memory_util numeric, p_active_workers integer, p_max_workers integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    cpu_score DECIMAL;
    memory_score DECIMAL;
    worker_score DECIMAL;
    overall_score DECIMAL;
BEGIN
    -- CPU efficiency (optimal range 60-80%)
    cpu_score := CASE
        WHEN p_cpu_util <= 50 THEN 60 + (p_cpu_util * 0.8)
        WHEN p_cpu_util <= 80 THEN 90 + (p_cpu_util - 50) * 0.33
        WHEN p_cpu_util <= 95 THEN 80 - (p_cpu_util - 80) * 2
        ELSE 20
    END;
    
    -- Memory efficiency (optimal range 50-75%)
    memory_score := CASE
        WHEN p_memory_util <= 40 THEN 50 + (p_memory_util * 1.25)
        WHEN p_memory_util <= 75 THEN 90 + (p_memory_util - 40) * 0.29
        WHEN p_memory_util <= 90 THEN 80 - (p_memory_util - 75) * 2
        ELSE 10
    END;
    
    -- Worker utilization efficiency
    worker_score := CASE
        WHEN p_max_workers = 0 THEN 100
        WHEN (p_active_workers::DECIMAL / p_max_workers::DECIMAL) <= 0.5 THEN 60
        WHEN (p_active_workers::DECIMAL / p_max_workers::DECIMAL) <= 0.8 THEN 100
        ELSE 80
    END;
    
    -- Weighted average (CPU: 40%, Memory: 40%, Workers: 20%)
    overall_score := (cpu_score * 0.4) + (memory_score * 0.4) + (worker_score * 0.2);
    
    RETURN ROUND(overall_score, 2);
END;
$$;


--
-- Name: check_connection_pool_alerts(character varying, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_connection_pool_alerts(p_pool_name character varying, p_utilization_pct integer, p_wait_duration_ms integer, p_connection_errors integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    alert_config RECORD;
BEGIN
    -- Check utilization alerts
    FOR alert_config IN 
        SELECT * FROM connection_pool_alerts 
        WHERE alert_enabled = true AND alert_type IN ('high_utilization', 'critical_utilization')
    LOOP
        IF p_utilization_pct >= alert_config.threshold_value THEN
            -- Log alert (would integrate with alerting system)
            INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
            VALUES (
                alert_config.alert_type,
                alert_config.severity_level,
                format('%s for pool %s: %s%%', alert_config.alert_message, p_pool_name, p_utilization_pct),
                jsonb_build_object('pool_name', p_pool_name, 'utilization_pct', p_utilization_pct),
                NOW()
            );
        END IF;
    END LOOP;
    
    -- Check wait time alerts
    IF p_wait_duration_ms > 1000 THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'connection_wait',
            'warning',
            format('Connection wait time %sms for pool %s', p_wait_duration_ms, p_pool_name),
            jsonb_build_object('pool_name', p_pool_name, 'wait_duration_ms', p_wait_duration_ms),
            NOW()
        );
    END IF;
    
    -- Check error alerts
    IF p_connection_errors > 0 THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'connection_errors',
            'error',
            format('%s connection errors for pool %s', p_connection_errors, p_pool_name),
            jsonb_build_object('pool_name', p_pool_name, 'error_count', p_connection_errors),
            NOW()
        );
    END IF;
END;
$$;


--
-- Name: check_endpoint_authorization(character varying, character varying, text[], character varying, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_endpoint_authorization(p_endpoint_pattern character varying, p_http_method character varying, p_user_permissions text[], p_user_role character varying, p_is_resource_owner boolean DEFAULT false, p_has_campaign_access boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    endpoint_config RECORD;
    authorization_result JSONB;
    missing_permissions TEXT[] := '{}'::TEXT[];
    has_required_permissions BOOLEAN := true;
    perm TEXT;
BEGIN
    -- Get endpoint configuration
    SELECT * INTO endpoint_config
    FROM api_endpoint_permissions
    WHERE endpoint_pattern = p_endpoint_pattern 
      AND http_method = p_http_method;
    
    IF NOT FOUND THEN
        -- Default deny for unknown endpoints
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'unknown_endpoint',
            'endpoint_pattern', p_endpoint_pattern,
            'http_method', p_http_method
        );
    END IF;
    
    -- Check role requirement
    IF endpoint_config.minimum_role = 'admin' AND p_user_role != 'admin' THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'insufficient_role',
            'required_role', endpoint_config.minimum_role,
            'user_role', p_user_role
        );
    END IF;
    
    -- Check ownership requirement
    IF endpoint_config.requires_ownership AND NOT p_is_resource_owner THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'ownership_required',
            'resource_type', endpoint_config.resource_type
        );
    END IF;
    
    -- Check campaign access requirement
    IF endpoint_config.requires_campaign_access AND NOT p_has_campaign_access THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'campaign_access_required',
            'resource_type', endpoint_config.resource_type
        );
    END IF;
    
    -- Check required permissions
    FOREACH perm IN ARRAY endpoint_config.required_permissions
    LOOP
        IF NOT (perm = ANY(p_user_permissions)) THEN
            missing_permissions := array_append(missing_permissions, perm);
            has_required_permissions := false;
        END IF;
    END LOOP;
    
    IF NOT has_required_permissions THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'missing_permissions',
            'required_permissions', endpoint_config.required_permissions,
            'missing_permissions', missing_permissions,
            'user_permissions', p_user_permissions
        );
    END IF;
    
    -- Authorization successful
    RETURN jsonb_build_object(
        'authorized', true,
        'required_permissions', endpoint_config.required_permissions,
        'resource_type', endpoint_config.resource_type
    );
END;
$$;


--
-- Name: check_memory_optimization_opportunities(character varying, numeric, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_memory_optimization_opportunities(p_service_name character varying, p_utilization_pct numeric, p_heap_used_bytes bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    avg_utilization DECIMAL(5,2);
    recommendation_exists BOOLEAN;
BEGIN
    -- Calculate average utilization over last hour
    SELECT AVG(memory_utilization_pct) INTO avg_utilization
    FROM memory_metrics
    WHERE service_name = p_service_name
      AND recorded_at > NOW() - INTERVAL '1 hour';
    
    -- Check if recommendation already exists
    SELECT EXISTS(
        SELECT 1 FROM memory_optimization_recommendations
        WHERE service_name = p_service_name
          AND implemented = false
          AND created_at > NOW() - INTERVAL '1 day'
    ) INTO recommendation_exists;
    
    -- Generate recommendations based on patterns
    IF NOT recommendation_exists THEN
        -- High consistent utilization
        IF avg_utilization >= 75 THEN
            INSERT INTO memory_optimization_recommendations 
                (recommendation_type, service_name, current_usage_bytes, 
                 recommended_limit_bytes, optimization_strategy, estimated_savings_bytes,
                 implementation_priority)
            VALUES (
                'increase_heap_size',
                p_service_name,
                p_heap_used_bytes,
                p_heap_used_bytes * 1.5,
                jsonb_build_object(
                    'strategy', 'increase_heap_allocation',
                    'reason', 'consistent_high_utilization',
                    'current_avg_utilization', avg_utilization
                ),
                0,
                'high'
            );
        END IF;
        
        -- Potential memory optimization for low utilization
        IF avg_utilization <= 25 THEN
            INSERT INTO memory_optimization_recommendations 
                (recommendation_type, service_name, current_usage_bytes,
                 recommended_limit_bytes, optimization_strategy, estimated_savings_bytes,
                 implementation_priority)
            VALUES (
                'reduce_heap_size',
                p_service_name,
                p_heap_used_bytes,
                p_heap_used_bytes * 0.6,
                jsonb_build_object(
                    'strategy', 'reduce_heap_allocation',
                    'reason', 'consistent_low_utilization',
                    'current_avg_utilization', avg_utilization
                ),
                p_heap_used_bytes * 0.4,
                'medium'
            );
        END IF;
    END IF;
END;
$$;


--
-- Name: check_query_optimization_needed(character varying, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_query_optimization_needed(p_query_hash character varying, p_execution_time_ms numeric, p_optimization_score numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    avg_execution_time DECIMAL(10,3);
    execution_count INTEGER;
    recommendation_exists BOOLEAN;
BEGIN
    -- Calculate average execution time for this query
    SELECT AVG(execution_time_ms), COUNT(*)
    INTO avg_execution_time, execution_count
    FROM query_performance_metrics
    WHERE query_hash = p_query_hash
      AND executed_at > NOW() - INTERVAL '1 hour';
    
    -- Check if recommendation already exists
    SELECT EXISTS(
        SELECT 1 FROM query_optimization_recommendations
        WHERE query_hash = p_query_hash
          AND implemented = false
          AND created_at > NOW() - INTERVAL '1 day'
    ) INTO recommendation_exists;
    
    -- Generate recommendations based on performance patterns
    IF NOT recommendation_exists AND execution_count >= 3 THEN
        -- Slow query optimization
        IF avg_execution_time > 1000 THEN
            INSERT INTO query_optimization_recommendations 
                (query_hash, recommendation_type, current_performance_ms,
                 estimated_improvement_pct, optimization_strategy, implementation_priority)
            VALUES (
                p_query_hash,
                'slow_query_optimization',
                avg_execution_time,
                60.0,
                jsonb_build_object(
                    'strategy', 'index_optimization',
                    'reason', 'consistent_slow_performance',
                    'avg_execution_time', avg_execution_time,
                    'execution_count', execution_count
                ),
                CASE WHEN avg_execution_time > 5000 THEN 'critical'
                     WHEN avg_execution_time > 2000 THEN 'high'
                     ELSE 'medium' END
            );
        END IF;
        
        -- Low optimization score
        IF p_optimization_score < 50 THEN
            INSERT INTO query_optimization_recommendations 
                (query_hash, recommendation_type, current_performance_ms,
                 estimated_improvement_pct, optimization_strategy, implementation_priority)
            VALUES (
                p_query_hash,
                'efficiency_optimization',
                avg_execution_time,
                40.0,
                jsonb_build_object(
                    'strategy', 'query_rewrite',
                    'reason', 'low_efficiency_score',
                    'optimization_score', p_optimization_score,
                    'execution_count', execution_count
                ),
                'medium'
            );
        END IF;
    END IF;
END;
$$;


--
-- Name: cleanup_expired_cache_entries(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_cache_entries() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired entries
    DELETE FROM cache_entries 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old cache metrics (keep 30 days)
    DELETE FROM cache_metrics 
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old invalidation logs (keep 7 days)
    DELETE FROM cache_invalidation_log 
    WHERE executed_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_expired_config_locks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_config_locks() RETURNS TABLE(cleaned_count integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    count_cleaned INTEGER;
BEGIN
    UPDATE config_locks 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true AND expires_at IS NOT NULL AND expires_at <= NOW();
    
    GET DIAGNOSTICS count_cleaned = ROW_COUNT;
    
    RETURN QUERY SELECT count_cleaned;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_config_locks(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_config_locks() IS 'Cleans up expired configuration locks';


--
-- Name: cleanup_expired_memory_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_memory_metrics() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete memory metrics older than 30 days
    DELETE FROM memory_metrics 
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete completed allocations older than 7 days
    DELETE FROM memory_allocations 
    WHERE deallocated_at IS NOT NULL 
    AND deallocated_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$;


--
-- Name: create_campaign_state_event(uuid, text, text, text, text, text, jsonb, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text DEFAULT NULL::text, p_target_state text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_triggered_by text DEFAULT 'system'::text, p_event_data jsonb DEFAULT '{}'::jsonb, p_operation_context jsonb DEFAULT '{}'::jsonb, p_correlation_id uuid DEFAULT NULL::uuid) RETURNS TABLE(event_id uuid, sequence_number bigint, success boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_event_id UUID;
    new_sequence BIGINT;
BEGIN
    -- Generate new event ID
    new_event_id := gen_random_uuid();
    
    -- Insert the event (sequence_number will be auto-generated)
    INSERT INTO campaign_state_events (
        id, campaign_id, event_type, source_state, target_state, reason,
        triggered_by, event_data, operation_context, correlation_id,
        occurred_at, persisted_at
    ) VALUES (
        new_event_id, p_campaign_id, p_event_type, p_source_state, p_target_state, p_reason,
        p_triggered_by, p_event_data, p_operation_context, p_correlation_id,
        NOW(), NOW()
    ) RETURNING campaign_state_events.sequence_number INTO new_sequence;
    
    -- Return success
    RETURN QUERY SELECT new_event_id, new_sequence, TRUE, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error
        RETURN QUERY SELECT NULL::UUID, 0::BIGINT, FALSE, SQLERRM::TEXT;
END;
$$;


--
-- Name: FUNCTION create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text, p_target_state text, p_reason text, p_triggered_by text, p_event_data jsonb, p_operation_context jsonb, p_correlation_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text, p_target_state text, p_reason text, p_triggered_by text, p_event_data jsonb, p_operation_context jsonb, p_correlation_id uuid) IS 'Creates a new state event with automatic sequence numbering and validation';


--
-- Name: create_campaign_state_snapshot(uuid, text, jsonb, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(snapshot_id uuid, success boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_snapshot_id UUID;
    calculated_checksum TEXT;
BEGIN
    -- Generate snapshot ID
    new_snapshot_id := gen_random_uuid();
    
    -- Calculate checksum for integrity
    calculated_checksum := md5(
        p_campaign_id::text || '|' ||
        p_current_state || '|' ||
        p_state_data::text || '|' ||
        p_last_event_sequence::text
    );
    
    -- Insert snapshot
    INSERT INTO campaign_state_snapshots (
        id, campaign_id, current_state, state_data, last_event_sequence,
        snapshot_metadata, checksum, created_at
    ) VALUES (
        new_snapshot_id, p_campaign_id, p_current_state, p_state_data, p_last_event_sequence,
        p_snapshot_metadata, calculated_checksum, NOW()
    );
    
    RETURN QUERY SELECT new_snapshot_id, TRUE, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$;


--
-- Name: FUNCTION create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb) IS 'Creates a new state snapshot with integrity checksum';


--
-- Name: detect_memory_leak(character varying, character varying, bigint, character varying, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_memory_leak(p_service_name character varying, p_operation_id character varying, p_leaked_bytes bigint, p_leak_source character varying, p_stack_trace text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    leak_id UUID;
    severity VARCHAR(20);
BEGIN
    -- Determine severity based on leaked bytes
    IF p_leaked_bytes >= 100 * 1024 * 1024 THEN -- 100MB
        severity := 'critical';
    ELSIF p_leaked_bytes >= 10 * 1024 * 1024 THEN -- 10MB
        severity := 'high';
    ELSIF p_leaked_bytes >= 1024 * 1024 THEN -- 1MB
        severity := 'medium';
    ELSE
        severity := 'low';
    END IF;
    
    -- Record memory leak
    INSERT INTO memory_leak_detection 
        (service_name, leak_type, leak_source, leaked_bytes, detection_method,
         stack_trace, operation_context, severity)
    VALUES 
        (p_service_name, 'operation_leak', p_leak_source, p_leaked_bytes, 'automatic',
         p_stack_trace, jsonb_build_object('operation_id', p_operation_id), severity)
    RETURNING id INTO leak_id;
    
    -- Create alert for significant leaks
    IF severity IN ('critical', 'high') THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'memory_leak_detected',
            severity,
            format('Memory leak detected in %s: %s bytes leaked from %s', 
                   p_service_name, p_leaked_bytes, p_leak_source),
            jsonb_build_object(
                'service_name', p_service_name,
                'leaked_bytes', p_leaked_bytes,
                'leak_source', p_leak_source,
                'operation_id', p_operation_id
            ),
            NOW()
        );
    END IF;
    
    RETURN leak_id;
END;
$$;


--
-- Name: detect_memory_leaks(text, interval); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_memory_leaks(p_service_name text DEFAULT NULL::text, p_time_window interval DEFAULT '01:00:00'::interval) RETURNS TABLE(service_name text, component text, leak_severity text, active_allocations bigint, total_size_bytes bigint, avg_lifetime interval)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ma.service_name::TEXT,
        ma.component::TEXT,
        CASE 
            WHEN COUNT(*) > 1000 AND AVG(ma.size_bytes) > 1024*1024 THEN 'HIGH'
            WHEN COUNT(*) > 500 OR AVG(ma.size_bytes) > 512*1024 THEN 'MEDIUM'
            ELSE 'LOW'
        END as leak_severity,
        COUNT(*)::BIGINT as active_allocations,
        SUM(ma.size_bytes)::BIGINT as total_size_bytes,
        AVG(NOW() - ma.allocated_at) as avg_lifetime
    FROM memory_allocations ma
    WHERE ma.is_active = true
    AND ma.allocated_at >= NOW() - p_time_window
    AND (p_service_name IS NULL OR ma.service_name = p_service_name)
    GROUP BY ma.service_name, ma.component
    HAVING COUNT(*) > 100  -- Only report significant allocations
    ORDER BY COUNT(*) DESC, SUM(ma.size_bytes) DESC;
END;
$$;


--
-- Name: fn_validate_numeric_safety(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_validate_numeric_safety() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only warn, don't block, as backend can handle large values
    IF NEW.total_items > 9007199254740991 THEN
        RAISE NOTICE 'total_items exceeds JavaScript safe range: %', NEW.total_items;
    END IF;
    IF NEW.processed_items > 9007199254740991 THEN
        RAISE NOTICE 'processed_items exceeds JavaScript safe range: %', NEW.processed_items;
    END IF;
    IF NEW.successful_items > 9007199254740991 THEN
        RAISE NOTICE 'successful_items exceeds JavaScript safe range: %', NEW.successful_items;
    END IF;
    IF NEW.failed_items > 9007199254740991 THEN
        RAISE NOTICE 'failed_items exceeds JavaScript safe range: %', NEW.failed_items;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: generate_user_agent_hash(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_user_agent_hash(user_agent_text text) RETURNS character varying
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    -- Generate SHA-256 hash of user agent for faster comparison
    RETURN encode(digest(user_agent_text, 'sha256'), 'hex');
END;
$$;


--
-- Name: FUNCTION generate_user_agent_hash(user_agent_text text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_user_agent_hash(user_agent_text text) IS 'Generates SHA-256 hash of user agent string';


--
-- Name: get_campaign_state_events_for_replay(uuid, bigint, bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint DEFAULT 0, p_to_sequence bigint DEFAULT NULL::bigint, p_limit integer DEFAULT 1000) RETURNS TABLE(id uuid, event_type text, source_state text, target_state text, reason text, triggered_by text, event_data jsonb, operation_context jsonb, sequence_number bigint, occurred_at timestamp with time zone, correlation_id uuid)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        cse.id, cse.event_type, cse.source_state, cse.target_state, cse.reason,
        cse.triggered_by, cse.event_data, cse.operation_context, cse.sequence_number,
        cse.occurred_at, cse.correlation_id
    FROM campaign_state_events cse
    WHERE cse.campaign_id = p_campaign_id
      AND cse.sequence_number >= p_from_sequence
      AND (p_to_sequence IS NULL OR cse.sequence_number <= p_to_sequence)
      AND cse.event_type = 'state_transition'  -- Only return main transition events
    ORDER BY cse.sequence_number ASC
    LIMIT p_limit;
END;
$$;


--
-- Name: FUNCTION get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint, p_to_sequence bigint, p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint, p_to_sequence bigint, p_limit integer) IS 'Retrieves state events for campaign state replay in sequence order';


--
-- Name: get_config_history(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_config_history(p_config_type character varying, p_config_key character varying, p_limit integer DEFAULT 10) RETURNS TABLE(version bigint, config_value jsonb, checksum character varying, created_at timestamp with time zone, updated_at timestamp with time zone, created_by character varying, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT c.version, c.config_value, c.checksum, c.created_at, c.updated_at, c.created_by, c.metadata
    FROM versioned_configs c
    WHERE c.config_type = p_config_type 
      AND (p_config_key IS NULL OR c.config_key = p_config_key)
    ORDER BY c.updated_at DESC, c.version DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: get_domain_config_state_with_lock(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_domain_config_state_with_lock(p_config_hash text, p_lock_type text DEFAULT 'none'::text) RETURNS TABLE(config_hash text, last_offset bigint, config_details jsonb, version bigint, updated_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_lock_type = 'exclusive' THEN
        RETURN QUERY 
        SELECT dcs.config_hash, dcs.last_offset, dcs.config_details, 
               dcs.version, dcs.updated_at, dcs.created_at
        FROM domain_generation_config_states dcs
        WHERE dcs.config_hash = p_config_hash
        FOR UPDATE;
    ELSIF p_lock_type = 'shared' THEN
        RETURN QUERY 
        SELECT dcs.config_hash, dcs.last_offset, dcs.config_details, 
               dcs.version, dcs.updated_at, dcs.created_at
        FROM domain_generation_config_states dcs
        WHERE dcs.config_hash = p_config_hash
        FOR SHARE;
    ELSE
        RETURN QUERY 
        SELECT dcs.config_hash, dcs.last_offset, dcs.config_details, 
               dcs.version, dcs.updated_at, dcs.created_at
        FROM domain_generation_config_states dcs
        WHERE dcs.config_hash = p_config_hash;
    END IF;
END;
$$;


--
-- Name: FUNCTION get_domain_config_state_with_lock(p_config_hash text, p_lock_type text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_domain_config_state_with_lock(p_config_hash text, p_lock_type text) IS 'Retrieves domain generation config state with optional row-level locking';


--
-- Name: get_latest_campaign_state_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_latest_campaign_state_snapshot(p_campaign_id uuid) RETURNS TABLE(id uuid, current_state text, state_data jsonb, last_event_sequence bigint, snapshot_metadata jsonb, created_at timestamp with time zone, checksum text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        css.id, css.current_state, css.state_data, css.last_event_sequence,
        css.snapshot_metadata, css.created_at, css.checksum
    FROM campaign_state_snapshots css
    WHERE css.campaign_id = p_campaign_id
      AND css.is_valid = true
    ORDER BY css.last_event_sequence DESC, css.created_at DESC
    LIMIT 1;
END;
$$;


--
-- Name: FUNCTION get_latest_campaign_state_snapshot(p_campaign_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_latest_campaign_state_snapshot(p_campaign_id uuid) IS 'Gets the most recent valid state snapshot for a campaign';


--
-- Name: get_memory_pool_status(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_memory_pool_status(p_pool_name text) RETURNS TABLE(pool_name text, current_size integer, max_size integer, utilization_pct numeric, hit_rate numeric, efficiency_score numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.pool_name::TEXT,
        mp.current_size,
        mp.max_size,
        ROUND((mp.current_size::DECIMAL / mp.max_size::DECIMAL) * 100, 2) as utilization_pct,
        mp.hit_rate,
        mp.efficiency_score
    FROM memory_pools mp
    WHERE mp.pool_name = p_pool_name;
END;
$$;


--
-- Name: get_response_time_analytics(character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_response_time_analytics(p_endpoint_filter character varying DEFAULT NULL::character varying, p_hours_back integer DEFAULT 24) RETURNS TABLE(endpoint_path character varying, http_method character varying, avg_response_ms numeric, p95_response_ms numeric, total_requests bigint, slow_requests bigint, error_rate numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rtm.endpoint_path,
        rtm.http_method,
        AVG(rtm.response_time_ms) as avg_response_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY rtm.response_time_ms) as p95_response_ms,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE rtm.response_time_ms > 1000) as slow_requests,
        (COUNT(*) FILTER (WHERE rtm.status_code >= 400)::DECIMAL / COUNT(*) * 100) as error_rate
    FROM response_time_metrics rtm
    WHERE rtm.recorded_at > NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_endpoint_filter IS NULL OR rtm.endpoint_path ILIKE '%' || p_endpoint_filter || '%')
    GROUP BY rtm.endpoint_path, rtm.http_method
    ORDER BY avg_response_ms DESC;
END;
$$;


--
-- Name: get_versioned_config_with_lock(character varying, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_versioned_config_with_lock(p_config_type character varying, p_config_key character varying, p_for_update boolean DEFAULT false) RETURNS TABLE(config_value jsonb, version bigint, checksum character varying, created_at timestamp with time zone, updated_at timestamp with time zone, created_by character varying, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_for_update THEN
        RETURN QUERY
        SELECT c.config_value, c.version, c.checksum, c.created_at, c.updated_at, c.created_by, c.metadata
        FROM versioned_configs c
        WHERE c.config_type = p_config_type AND c.config_key = p_config_key
        FOR UPDATE;
    ELSE
        RETURN QUERY
        SELECT c.config_value, c.version, c.checksum, c.created_at, c.updated_at, c.created_by, c.metadata
        FROM versioned_configs c
        WHERE c.config_type = p_config_type AND c.config_key = p_config_key;
    END IF;
END;
$$;


--
-- Name: invalidate_cache_by_pattern(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invalidate_cache_by_pattern(p_pattern text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Delete matching cache entries
    DELETE FROM cache_entries 
    WHERE cache_key LIKE p_pattern;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    -- Log the invalidation
    INSERT INTO cache_invalidation_log (
        service_name, cache_namespace, invalidation_pattern,
        invalidation_reason, affected_keys_count
    ) VALUES (
        'system', 'pattern_invalidation', p_pattern,
        'manual_pattern_invalidation', affected_count
    );
    
    RETURN affected_count;
END;
$$;


--
-- Name: log_authorization_decision(uuid, character varying, character varying, character varying, character varying, text[], jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[] DEFAULT '{}'::text[], p_context jsonb DEFAULT '{}'::jsonb, p_request_context jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    decision_id VARCHAR(255);
    security_event_id UUID;
    audit_log_id UUID;
    risk_score INTEGER := 0;
BEGIN
    -- Generate unique decision ID
    decision_id := 'auth_' || extract(epoch from now())::bigint || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Calculate risk score based on decision and context
    IF p_decision = 'deny' THEN
        risk_score := 75;
    ELSIF p_decision = 'conditional' THEN
        risk_score := 25;
    END IF;
    
    -- Create audit log entry with correct column name (entity_type instead of resource_type)
    INSERT INTO audit_logs 
        (user_id, action, entity_type, entity_id, authorization_context, 
         access_decision, permission_checked, security_level)
    VALUES 
        (p_user_id, p_action, p_resource_type, p_resource_id::UUID, p_context,
         p_decision, p_policies, CASE WHEN risk_score > 50 THEN 'high' ELSE 'standard' END)
    RETURNING id INTO audit_log_id;
    
    -- Create security event
    INSERT INTO security_events 
        (event_type, user_id, resource_type, resource_id, action_attempted,
         authorization_result, permissions_required, risk_score, request_context, audit_log_id)
    VALUES 
        ('authorization_decision', p_user_id, p_resource_type, p_resource_id, p_action,
         p_decision, p_policies, risk_score, p_request_context, audit_log_id)
    RETURNING id INTO security_event_id;
    
    -- Record authorization decision
    INSERT INTO authorization_decisions 
        (decision_id, user_id, resource_type, resource_id, action, decision,
         evaluated_policies, conditions_met, context, security_event_id)
    VALUES 
        (decision_id, p_user_id, p_resource_type, p_resource_id, p_action, p_decision,
         p_policies, p_context, p_context, security_event_id);
    
    RETURN security_event_id;
END;
$$;


--
-- Name: log_authorization_decision(uuid, character varying, character varying, character varying, character varying, text[], jsonb, jsonb, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[] DEFAULT '{}'::text[], p_context jsonb DEFAULT '{}'::jsonb, p_request_context jsonb DEFAULT '{}'::jsonb, p_risk_score integer DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    decision_id VARCHAR(255);
    security_event_id UUID;
    audit_log_id UUID;
    calculated_risk_score INTEGER := p_risk_score;
BEGIN
    -- Generate unique decision ID
    decision_id := 'auth_' || extract(epoch from now())::bigint || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Use provided risk score, or calculate default if not provided
    IF p_risk_score = 0 THEN
        IF p_decision = 'deny' THEN
            calculated_risk_score := 75;
        ELSIF p_decision = 'conditional' THEN
            calculated_risk_score := 25;
        END IF;
    END IF;
    
    -- Create audit log entry with correct column name (entity_type instead of resource_type)
    INSERT INTO audit_logs 
        (user_id, action, entity_type, entity_id, authorization_context, 
         access_decision, permission_checked, security_level)
    VALUES 
        (p_user_id, p_action, p_resource_type, p_resource_id::UUID, p_context,
         p_decision, p_policies, CASE WHEN calculated_risk_score > 50 THEN 'high' ELSE 'standard' END)
    RETURNING id INTO audit_log_id;
    
    -- Create security event
    INSERT INTO security_events 
        (event_type, user_id, resource_type, resource_id, action_attempted,
         authorization_result, permissions_required, risk_score, request_context, audit_log_id)
    VALUES 
        ('authorization_decision', p_user_id, p_resource_type, p_resource_id, p_action,
         p_decision, p_policies, calculated_risk_score, p_request_context, audit_log_id)
    RETURNING id INTO security_event_id;
    
    -- Record authorization decision
    INSERT INTO authorization_decisions 
        (decision_id, user_id, resource_type, resource_id, action, decision,
         evaluated_policies, conditions_met, context, security_event_id)
    VALUES 
        (decision_id, p_user_id, p_resource_type, p_resource_id, p_action, p_decision,
         p_policies, p_context, p_context, security_event_id);
    
    RETURN security_event_id;
END;
$$;


--
-- Name: record_cache_operation(text, text, text, boolean, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_cache_operation(p_service_name text, p_cache_namespace text, p_operation_type text, p_cache_hit boolean, p_execution_time_ms numeric DEFAULT 0, p_cache_size_bytes integer DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    hit_ratio DECIMAL(5,2);
BEGIN
    -- Calculate current hit ratio for this namespace
    SELECT 
        CASE 
            WHEN SUM(CASE WHEN operation_type IN ('hit', 'miss') THEN 1 ELSE 0 END) > 0 THEN
                ROUND(
                    SUM(CASE WHEN operation_type = 'hit' THEN 1 ELSE 0 END)::DECIMAL / 
                    SUM(CASE WHEN operation_type IN ('hit', 'miss') THEN 1 ELSE 0 END)::DECIMAL * 100, 
                    2
                )
            ELSE 0
        END
    INTO hit_ratio
    FROM cache_metrics
    WHERE service_name = p_service_name 
    AND cache_namespace = p_cache_namespace
    AND recorded_at >= NOW() - INTERVAL '1 hour';
    
    -- Insert metrics
    INSERT INTO cache_metrics (
        service_name, cache_namespace, operation_type, 
        execution_time_ms, cache_size_bytes, hit_ratio_pct
    ) VALUES (
        p_service_name, p_cache_namespace, p_operation_type,
        p_execution_time_ms, p_cache_size_bytes, COALESCE(hit_ratio, 0)
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;


--
-- Name: record_connection_pool_metrics(character varying, integer, integer, integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_connection_pool_metrics(p_pool_name character varying, p_active_connections integer, p_idle_connections integer, p_max_connections integer, p_wait_count integer DEFAULT 0, p_wait_duration_ms integer DEFAULT 0, p_connection_errors integer DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    pool_state VARCHAR(50);
    utilization_pct INTEGER;
BEGIN
    -- Calculate pool utilization
    utilization_pct := ((p_active_connections + p_idle_connections) * 100) / p_max_connections;
    
    -- Determine pool state
    IF utilization_pct >= 95 THEN
        pool_state := 'critical';
    ELSIF utilization_pct >= 80 THEN
        pool_state := 'warning';
    ELSIF p_connection_errors > 0 THEN
        pool_state := 'degraded';
    ELSE
        pool_state := 'healthy';
    END IF;
    
    -- Insert metrics
    INSERT INTO connection_pool_metrics 
        (pool_name, active_connections, idle_connections, max_connections,
         total_connections, connections_in_use, wait_count, wait_duration_ms,
         connection_errors, pool_state)
    VALUES 
        (p_pool_name, p_active_connections, p_idle_connections, p_max_connections,
         p_active_connections + p_idle_connections, p_active_connections,
         p_wait_count, p_wait_duration_ms, p_connection_errors, pool_state)
    RETURNING id INTO metric_id;
    
    -- Check alert thresholds
    PERFORM check_connection_pool_alerts(p_pool_name, utilization_pct, p_wait_duration_ms, p_connection_errors);
    
    RETURN metric_id;
END;
$$;


--
-- Name: record_memory_metrics(character varying, character varying, bigint, bigint, bigint, bigint, integer, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_memory_metrics(p_service_name character varying, p_process_id character varying, p_heap_size_bytes bigint, p_heap_used_bytes bigint, p_gc_count bigint DEFAULT 0, p_gc_duration_ms bigint DEFAULT 0, p_goroutines_count integer DEFAULT 0, p_stack_size_bytes bigint DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    heap_free_bytes BIGINT;
    utilization_pct DECIMAL(5,2);
    memory_state VARCHAR(50);
BEGIN
    -- Calculate derived metrics, handle division by zero
    heap_free_bytes := GREATEST(0, p_heap_size_bytes - p_heap_used_bytes);
    
    IF p_heap_size_bytes > 0 THEN
        utilization_pct := (p_heap_used_bytes::DECIMAL / p_heap_size_bytes::DECIMAL) * 100;
    ELSE
        utilization_pct := 0;
    END IF;
    
    -- Determine memory state
    IF utilization_pct >= 90 THEN
        memory_state := 'critical';
    ELSIF utilization_pct >= 75 THEN
        memory_state := 'warning';
    ELSIF utilization_pct >= 60 THEN
        memory_state := 'elevated';
    ELSE
        memory_state := 'normal';
    END IF;
    
    -- Insert memory metrics
    INSERT INTO memory_metrics 
        (service_name, process_id, heap_size_bytes, heap_used_bytes, heap_free_bytes,
         gc_count, gc_duration_ms, goroutines_count, stack_size_bytes,
         memory_utilization_pct, memory_state)
    VALUES 
        (p_service_name, p_process_id, p_heap_size_bytes, p_heap_used_bytes, heap_free_bytes,
         p_gc_count, p_gc_duration_ms, p_goroutines_count, p_stack_size_bytes,
         utilization_pct, memory_state)
    RETURNING id INTO metric_id;
    
    -- Check for memory optimization opportunities
    PERFORM check_memory_optimization_opportunities(p_service_name, utilization_pct, p_heap_used_bytes);
    
    -- Trigger alerts for critical memory states
    IF memory_state IN ('critical', 'warning') THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'memory_utilization',
            CASE WHEN memory_state = 'critical' THEN 'critical' ELSE 'warning' END,
            format('Memory utilization %s%% for service %s', utilization_pct, p_service_name),
            jsonb_build_object(
                'service_name', p_service_name,
                'utilization_pct', utilization_pct,
                'heap_used_bytes', p_heap_used_bytes,
                'memory_state', memory_state
            ),
            NOW()
        );
    END IF;
    
    RETURN metric_id;
END;
$$;


--
-- Name: record_query_performance(text, character varying, numeric, bigint, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_query_performance(p_query_sql text, p_query_type character varying, p_execution_time_ms numeric, p_rows_examined bigint DEFAULT 0, p_rows_returned bigint DEFAULT 0, p_query_plan jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    query_hash VARCHAR(64);
    optimization_score DECIMAL(5,2);
    table_names VARCHAR[];
BEGIN
    -- Generate query hash for deduplication
    query_hash := encode(sha256(p_query_sql::bytea), 'hex');
    
    -- Calculate optimization score (0-100, higher is better)
    optimization_score := CASE
        WHEN p_execution_time_ms <= 10 THEN 100
        WHEN p_execution_time_ms <= 50 THEN 90
        WHEN p_execution_time_ms <= 100 THEN 80
        WHEN p_execution_time_ms <= 500 THEN 60
        WHEN p_execution_time_ms <= 1000 THEN 40
        WHEN p_execution_time_ms <= 5000 THEN 20
        ELSE 10
    END;
    
    -- Adjust score based on efficiency (rows examined vs returned)
    IF p_rows_examined > 0 AND p_rows_returned > 0 THEN
        optimization_score := optimization_score * (
            LEAST(1.0, p_rows_returned::DECIMAL / p_rows_examined::DECIMAL) * 0.5 + 0.5
        );
    END IF;
    
    -- Extract table names from query plan
    table_names := ARRAY(
        SELECT DISTINCT value::text
        FROM jsonb_array_elements_text(p_query_plan->'tables')
    );
    
    -- Insert performance metrics
    INSERT INTO query_performance_metrics 
        (query_hash, query_sql, query_type, table_names, execution_time_ms,
         rows_examined, rows_returned, query_plan, optimization_score)
    VALUES 
        (query_hash, p_query_sql, p_query_type, table_names, p_execution_time_ms,
         p_rows_examined, p_rows_returned, p_query_plan, optimization_score)
    RETURNING id INTO metric_id;
    
    -- Check if optimization is needed
    PERFORM check_query_optimization_needed(query_hash, p_execution_time_ms, optimization_score);
    
    -- Log slow queries
    IF p_execution_time_ms > 1000 THEN
        INSERT INTO slow_query_log 
            (query_hash, query_sql, execution_time_ms, rows_examined, rows_returned,
             query_plan, severity)
        VALUES 
            (query_hash, p_query_sql, p_execution_time_ms, p_rows_examined, p_rows_returned,
             p_query_plan, 
             CASE WHEN p_execution_time_ms > 5000 THEN 'critical'
                  WHEN p_execution_time_ms > 2000 THEN 'high'
                  ELSE 'warning' END);
    END IF;
    
    RETURN metric_id;
END;
$$;


--
-- Name: record_resource_utilization(text, text, numeric, numeric, numeric, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_resource_utilization(p_service_name text, p_resource_type text, p_current_usage numeric, p_max_capacity numeric, p_utilization_pct numeric, p_bottleneck_detected boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    efficiency_score DECIMAL(5,2);
BEGIN
    -- Calculate efficiency score
    efficiency_score := CASE
        WHEN p_utilization_pct <= 50 THEN 60 + (p_utilization_pct * 0.8)  -- Underutilized
        WHEN p_utilization_pct <= 80 THEN 90 + (p_utilization_pct - 50) * 0.33  -- Optimal range
        WHEN p_utilization_pct <= 95 THEN 80 - (p_utilization_pct - 80) * 2  -- High utilization
        ELSE 20  -- Critical/overutilized
    END;
    
    -- Insert metrics
    INSERT INTO resource_utilization_metrics (
        service_name, resource_type, current_usage, max_capacity,
        utilization_pct, efficiency_score, bottleneck_detected
    ) VALUES (
        p_service_name, p_resource_type, p_current_usage, p_max_capacity,
        p_utilization_pct, efficiency_score, p_bottleneck_detected
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;


--
-- Name: record_response_time(text, text, uuid, numeric, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_response_time(p_service_name text, p_endpoint_path text, p_campaign_id uuid, p_response_time_ms numeric, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    performance_category TEXT;
BEGIN
    -- Categorize performance
    performance_category := CASE
        WHEN p_response_time_ms <= 100 THEN 'fast'
        WHEN p_response_time_ms <= 500 THEN 'normal'
        WHEN p_response_time_ms <= 1000 THEN 'slow'
        ELSE 'critical'
    END;
    
    -- Insert metrics
    INSERT INTO response_time_metrics (
        service_name, endpoint_path, campaign_id, response_time_ms,
        performance_category, status_code, cache_hit
    ) VALUES (
        p_service_name, p_endpoint_path, p_campaign_id, p_response_time_ms,
        performance_category, 
        COALESCE((p_metadata->>'status_code')::INTEGER, 200),
        COALESCE((p_metadata->>'cache_hit')::BOOLEAN, false)
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;


--
-- Name: record_response_time(character varying, character varying, numeric, integer, uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_response_time(p_endpoint character varying, p_method character varying, p_response_time_ms numeric, p_payload_size integer DEFAULT 0, p_user_id uuid DEFAULT NULL::uuid, p_campaign_id uuid DEFAULT NULL::uuid, p_status_code integer DEFAULT 200) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    avg_response_time DECIMAL(10,3);
    slow_threshold DECIMAL(10,3) := 1000; -- 1 second
    critical_threshold DECIMAL(10,3) := 3000; -- 3 seconds
BEGIN
    -- Insert response time metric
    INSERT INTO response_time_metrics 
    (endpoint_path, http_method, response_time_ms, payload_size_bytes, user_id, campaign_id, status_code)
    VALUES (p_endpoint, p_method, p_response_time_ms, p_payload_size, p_user_id, p_campaign_id, p_status_code)
    RETURNING id INTO metric_id;
    
    -- Check if this endpoint needs optimization recommendations
    IF p_response_time_ms > slow_threshold THEN
        -- Calculate recent average response time for this endpoint
        SELECT AVG(response_time_ms) INTO avg_response_time
        FROM response_time_metrics 
        WHERE endpoint_path = p_endpoint 
        AND http_method = p_method
        AND recorded_at > NOW() - INTERVAL '1 hour';
        
        -- Generate optimization recommendation if average is consistently slow
        IF avg_response_time > slow_threshold THEN
            INSERT INTO response_optimization_recommendations 
            (endpoint_path, current_avg_response_ms, target_response_ms, optimization_strategies, priority)
            VALUES (
                p_endpoint,
                avg_response_time,
                CASE 
                    WHEN avg_response_time > critical_threshold THEN avg_response_time * 0.3
                    ELSE avg_response_time * 0.5
                END,
                JSON_BUILD_OBJECT(
                    'strategies', ARRAY[
                        CASE WHEN avg_response_time > critical_threshold THEN 'async_processing' ELSE 'query_optimization' END,
                        'response_compression',
                        'selective_field_loading',
                        'pagination'
                    ],
                    'current_avg_ms', avg_response_time,
                    'samples_analyzed', (
                        SELECT COUNT(*) FROM response_time_metrics 
                        WHERE endpoint_path = p_endpoint AND recorded_at > NOW() - INTERVAL '1 hour'
                    )
                ),
                CASE 
                    WHEN avg_response_time > critical_threshold THEN 'high'
                    WHEN avg_response_time > slow_threshold * 2 THEN 'medium'
                    ELSE 'low'
                END
            )
            ON CONFLICT DO NOTHING; -- Don't create duplicate recommendations
        END IF;
    END IF;
    
    RETURN metric_id;
END;
$$;


--
-- Name: release_config_lock(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_config_lock(p_lock_id uuid, p_owner text) RETURNS TABLE(success boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    lock_owner TEXT;
BEGIN
    -- Get lock owner
    SELECT owner INTO lock_owner
    FROM config_locks 
    WHERE id = p_lock_id AND is_active = true
    FOR UPDATE;
    
    -- Check if lock exists
    IF lock_owner IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Lock not found or already released'::TEXT;
        RETURN;
    END IF;
    
    -- Check ownership
    IF lock_owner != p_owner THEN
        RETURN QUERY SELECT FALSE, format('Lock is owned by %s, cannot release by %s', lock_owner, p_owner)::TEXT;
        RETURN;
    END IF;
    
    -- Release lock
    UPDATE config_locks 
    SET is_active = false, updated_at = NOW()
    WHERE id = p_lock_id;
    
    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;


--
-- Name: FUNCTION release_config_lock(p_lock_id uuid, p_owner text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.release_config_lock(p_lock_id uuid, p_owner text) IS 'Releases a distributed configuration lock with ownership verification';


--
-- Name: release_state_lock(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_state_lock(p_lock_key character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
		BEGIN
			DELETE FROM state_coordination_locks WHERE lock_key = p_lock_key;
			RETURN FOUND;
		END;
		$$;


--
-- Name: release_state_lock(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_state_lock(p_entity_id uuid, p_lock_token uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM state_coordination_locks 
    WHERE entity_id = p_entity_id AND lock_token = p_lock_token;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$;


--
-- Name: sync_domain_config_to_versioned(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_domain_config_to_versioned() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_config_record RECORD;
    v_synced_count INTEGER := 0;
BEGIN
    -- Sync domain generation configs to versioned_configs table
    FOR v_config_record IN 
        SELECT id, config_data, version, checksum, created_at, updated_at
        FROM domain_generation_config_states
        ORDER BY updated_at DESC
    LOOP
        INSERT INTO versioned_configs (
            config_type, config_key, config_value, version, checksum, 
            created_at, updated_at, created_by, metadata
        ) VALUES (
            'domain_generation',
            'config_' || v_config_record.id::TEXT,
            v_config_record.config_data,
            v_config_record.version,
            v_config_record.checksum,
            v_config_record.created_at,
            v_config_record.updated_at,
            'migration_sync',
            jsonb_build_object('source_table', 'domain_generation_config_states', 'source_id', v_config_record.id)
        )
        ON CONFLICT (config_type, config_key) DO UPDATE SET
            config_value = EXCLUDED.config_value,
            version = EXCLUDED.version,
            checksum = EXCLUDED.checksum,
            updated_at = EXCLUDED.updated_at,
            metadata = EXCLUDED.metadata;
        
        v_synced_count := v_synced_count + 1;
    END LOOP;

    RETURN v_synced_count;
END;
$$;


--
-- Name: track_memory_allocation(text, text, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_memory_allocation(p_service_name text, p_component text, p_size_bytes bigint, p_allocation_context jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    allocation_uuid UUID;
BEGIN
    allocation_uuid := gen_random_uuid();
    
    INSERT INTO memory_allocations (
        id, service_name, component, allocation_id, 
        allocation_type, size_bytes, allocation_context
    ) VALUES (
        allocation_uuid, p_service_name, p_component, allocation_uuid::TEXT,
        COALESCE(p_allocation_context->>'type', 'unknown'), p_size_bytes, p_allocation_context
    );
    
    RETURN allocation_uuid;
END;
$$;


--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_keyword_rules_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_keyword_rules_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_proxies_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_proxies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_proxy_pools_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_proxy_pools_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_state_event_processing_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_state_event_processing_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- When a state transition is completed, mark the associated event as processed
    IF TG_OP = 'UPDATE' AND OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
        UPDATE campaign_state_events
        SET processing_status = 'processed'
        WHERE id = NEW.state_event_id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_task_progress(character varying, character varying, numeric, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_progress(p_task_id character varying, p_status character varying, p_progress_percentage numeric DEFAULT NULL::numeric, p_processed_items integer DEFAULT NULL::integer, p_error_message text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- Check if task exists
    SELECT EXISTS(SELECT 1 FROM async_task_status WHERE task_id = p_task_id) INTO task_exists;
    
    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update task status
    UPDATE async_task_status 
    SET 
        status = p_status,
        progress_percentage = COALESCE(p_progress_percentage, progress_percentage),
        processed_items = COALESCE(p_processed_items, processed_items),
        error_message = COALESCE(p_error_message, error_message),
        completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE task_id = p_task_id;
    
    RETURN TRUE;
END;
$$;


--
-- Name: update_versioned_config_atomic(character varying, character varying, jsonb, bigint, character varying, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_versioned_config_atomic(p_config_type character varying, p_config_key character varying, p_config_value jsonb, p_expected_version bigint, p_checksum character varying, p_updated_by character varying DEFAULT 'system'::character varying, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(success boolean, new_version bigint, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_current_version BIGINT;
    v_new_version BIGINT;
    v_rows_affected INTEGER;
BEGIN
    -- Get current version with row-level locking
    SELECT version INTO v_current_version
    FROM versioned_configs
    WHERE config_type = p_config_type AND config_key = p_config_key
    FOR UPDATE;

    -- Check if configuration exists and version matches
    IF NOT FOUND THEN
        -- Insert new configuration
        INSERT INTO versioned_configs (
            config_type, config_key, config_value, version, checksum, created_by, metadata
        ) VALUES (
            p_config_type, p_config_key, p_config_value, 1, p_checksum, p_updated_by, p_metadata
        );
        
        RETURN QUERY SELECT TRUE, 1::BIGINT, NULL::TEXT;
        RETURN;
    END IF;

    -- Verify expected version matches current version (optimistic locking)
    IF v_current_version != p_expected_version THEN
        RETURN QUERY SELECT FALSE, v_current_version, 
            format('Version mismatch: expected %s, current %s', p_expected_version, v_current_version);
        RETURN;
    END IF;

    -- Calculate new version
    v_new_version := v_current_version + 1;

    -- Update configuration atomically
    UPDATE versioned_configs
    SET 
        config_value = p_config_value,
        version = v_new_version,
        checksum = p_checksum,
        updated_at = CURRENT_TIMESTAMP,
        created_by = p_updated_by,
        metadata = p_metadata
    WHERE config_type = p_config_type 
      AND config_key = p_config_key 
      AND version = p_expected_version;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
        RETURN QUERY SELECT FALSE, v_current_version, 
            'Concurrent update detected - version changed during update';
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_new_version, NULL::TEXT;
END;
$$;


--
-- Name: validate_all_enums(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_all_enums() RETURNS TABLE(table_name text, column_name text, invalid_value text, row_count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check campaigns.status
    RETURN QUERY
    SELECT 'campaigns'::text, 'status'::text, c.status::text, COUNT(*)::bigint
    FROM campaigns c
    WHERE c.status NOT IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled')
    GROUP BY c.status;
    
    -- Check campaigns.campaign_type
    RETURN QUERY
    SELECT 'campaigns'::text, 'campaign_type'::text, c.campaign_type::text, COUNT(*)::bigint
    FROM campaigns c
    WHERE c.campaign_type NOT IN ('domain_generation', 'dns_validation', 'http_keyword_validation')
    GROUP BY c.campaign_type;
    
    -- Check personas.persona_type
    RETURN QUERY
    SELECT 'personas'::text, 'persona_type'::text, p.persona_type::text, COUNT(*)::bigint
    FROM personas p
    WHERE p.persona_type NOT IN ('dns', 'http')
    GROUP BY p.persona_type;
    
    -- Check http_keyword_campaign_params.source_type
    RETURN QUERY
    SELECT 'http_keyword_campaign_params'::text, 'source_type'::text, h.source_type::text, COUNT(*)::bigint
    FROM http_keyword_campaign_params h
    WHERE h.source_type NOT IN ('DomainGeneration', 'DNSValidation')
    GROUP BY h.source_type;
END;
$$;


--
-- Name: validate_campaign_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_campaign_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status NOT IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid campaign status: %. Must match Go CampaignStatusEnum', NEW.status;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: validate_column_naming(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_column_naming() RETURNS TABLE(table_schema text, table_name text, column_name text, naming_issue text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.table_schema::TEXT,
        c.table_name::TEXT,
        c.column_name::TEXT,
        CASE 
            WHEN c.column_name ~ '[A-Z]' THEN 'Contains uppercase letters - should be snake_case'
            WHEN c.column_name ~ '^[0-9]' THEN 'Starts with number'
            WHEN c.column_name ~ '[^a-z0-9_]' THEN 'Contains invalid characters'
            ELSE 'Unknown issue'
        END as naming_issue
    FROM information_schema.columns c
    WHERE c.table_schema IN ('public', 'auth')
    AND (
        c.column_name ~ '[A-Z]' OR 
        c.column_name ~ '^[0-9]' OR 
        c.column_name ~ '[^a-z0-9_]'
    )
    ORDER BY c.table_schema, c.table_name, c.column_name;
END;
$$;


--
-- Name: validate_config_consistency(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_config_consistency(p_config_type character varying, p_config_key character varying) RETURNS TABLE(is_consistent boolean, expected_checksum character varying, actual_checksum character varying, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_config_value JSONB;
    v_stored_checksum VARCHAR(64);
    v_calculated_checksum VARCHAR(64);
BEGIN
    -- Get configuration and stored checksum
    SELECT config_value, checksum INTO v_config_value, v_stored_checksum
    FROM versioned_configs
    WHERE config_type = p_config_type AND config_key = p_config_key;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::VARCHAR(64), NULL::VARCHAR(64), 
            'Configuration not found'::TEXT;
        RETURN;
    END IF;

    -- Calculate checksum from stored value
    -- Note: This is a simplified validation - in production, you'd want to use
    -- the same checksum calculation as the application layer
    v_calculated_checksum := encode(sha256(v_config_value::TEXT::BYTEA), 'hex');

    -- Compare checksums
    IF v_stored_checksum = v_calculated_checksum THEN
        RETURN QUERY SELECT TRUE, v_stored_checksum, v_calculated_checksum, NULL::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, v_stored_checksum, v_calculated_checksum,
            'Checksum mismatch detected - configuration may be corrupted'::TEXT;
    END IF;
END;
$$;


--
-- Name: validate_enum_value(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_enum_value(enum_type text, value text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    valid_values TEXT[];
BEGIN
    CASE enum_type
        WHEN 'campaign_status' THEN
            valid_values := ARRAY['pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled'];
        WHEN 'campaign_type' THEN
            valid_values := ARRAY['domain_generation', 'dns_validation', 'http_keyword_validation'];
        WHEN 'http_source_type' THEN
            valid_values := ARRAY['DomainGeneration', 'DNSValidation'];
        WHEN 'persona_type' THEN
            valid_values := ARRAY['dns', 'http'];
        WHEN 'proxy_protocol' THEN
            valid_values := ARRAY['http', 'https', 'socks5', 'socks4'];
        WHEN 'pattern_type' THEN
            valid_values := ARRAY['fixed', 'variable', 'hybrid'];
        WHEN 'job_status' THEN
            valid_values := ARRAY['pending', 'processing', 'completed', 'failed', 'retrying'];
        ELSE
            RETURN FALSE;
    END CASE;
    
    RETURN value = ANY(valid_values);
END;
$$;


--
-- Name: validate_input_field(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_input_field(p_endpoint_pattern text, p_http_method text, p_field_name text, p_field_value text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    validation_rule RECORD;
    config JSONB;
    validation_result JSONB;
    suspicious_pattern RECORD;
    pattern_matches BOOLEAN;
    array_value JSONB;
    int_value INTEGER;
BEGIN
    -- Get validation rule
    SELECT * INTO validation_rule
    FROM input_validation_rules
    WHERE endpoint_pattern = p_endpoint_pattern
      AND http_method = p_http_method
      AND field_name = p_field_name;

    IF NOT FOUND THEN
        -- No specific rule, perform basic suspicious pattern check
        FOR suspicious_pattern IN
            SELECT * FROM suspicious_input_patterns
            WHERE detection_action IN ('block', 'log') AND is_enabled = true
            ORDER BY severity DESC, pattern_name  -- Order by severity to get most specific match
        LOOP
            SELECT p_field_value ~ suspicious_pattern.pattern INTO pattern_matches;
            IF pattern_matches THEN
                IF suspicious_pattern.detection_action = 'block' THEN
                    RETURN jsonb_build_object(
                        'valid', false,
                        'error_type', 'suspicious_pattern',
                        'error_message', suspicious_pattern.description,
                        'severity', suspicious_pattern.severity,
                        'pattern_name', suspicious_pattern.pattern_name
                    );
                END IF;
            END IF;
        END LOOP;

        RETURN jsonb_build_object('valid', true, 'message', 'no_validation_rule');
    END IF;

    config := validation_rule.validation_config;

    -- Perform validation based on type
    CASE validation_rule.validation_type
        WHEN 'string_length' THEN
            IF length(p_field_value) < (config->>'min_length')::integer OR
               length(p_field_value) > (config->>'max_length')::integer THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'string_length',
                    'error_message', validation_rule.error_message,
                    'expected', config
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;

        WHEN 'integer_range' THEN
            BEGIN
                int_value := p_field_value::integer;
                IF int_value < (config->>'min')::integer OR
                   int_value > (config->>'max')::integer THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'integer_range',
                        'error_message', validation_rule.error_message,
                        'expected', config
                    );
                ELSE
                    validation_result := jsonb_build_object('valid', true);
                END IF;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'invalid_integer',
                        'error_message', 'Value must be a valid integer'
                    );
            END;

        WHEN 'enum' THEN
            IF NOT (p_field_value = ANY(ARRAY(SELECT jsonb_array_elements_text(config->'allowed_values')))) THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'enum_violation',
                    'error_message', validation_rule.error_message,
                    'allowed_values', config->'allowed_values'
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;

        WHEN 'json_schema' THEN
            BEGIN
                -- Basic JSON validation
                array_value := p_field_value::jsonb;
                validation_result := jsonb_build_object('valid', true);
            EXCEPTION
                WHEN invalid_text_representation THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'invalid_json',
                        'error_message', 'Value must be valid JSON'
                    );
            END;

        ELSE
            validation_result := jsonb_build_object('valid', true, 'message', 'validation_type_not_implemented');
    END CASE;

    RETURN validation_result;
END;
$$;


--
-- Name: validate_input_field(character varying, character varying, character varying, text, uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_input_field(p_endpoint_pattern character varying, p_http_method character varying, p_field_name character varying, p_field_value text, p_user_id uuid DEFAULT NULL::uuid, p_session_id character varying DEFAULT NULL::character varying) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    validation_rule RECORD;
    config JSONB;
    validation_result JSONB;
    suspicious_pattern RECORD;
    pattern_matches BOOLEAN;
    array_value JSONB;
    array_length INTEGER;
BEGIN
    -- Get validation rule
    SELECT * INTO validation_rule
    FROM input_validation_rules
    WHERE endpoint_pattern = p_endpoint_pattern 
      AND http_method = p_http_method 
      AND field_name = p_field_name;
    
    IF NOT FOUND THEN
        -- No specific rule, perform basic suspicious pattern check
        FOR suspicious_pattern IN 
            SELECT * FROM suspicious_input_patterns 
            WHERE detection_action IN ('block', 'log') AND is_enabled = true
        LOOP
            SELECT p_field_value ~ suspicious_pattern.pattern INTO pattern_matches;
            IF pattern_matches THEN
                IF suspicious_pattern.detection_action = 'block' THEN
                    RETURN jsonb_build_object(
                        'valid', false,
                        'error_type', 'suspicious_pattern',
                        'error_message', suspicious_pattern.description,
                        'severity', suspicious_pattern.severity
                    );
                END IF;
            END IF;
        END LOOP;
        
        RETURN jsonb_build_object('valid', true, 'message', 'no_validation_rule');
    END IF;
    
    config := validation_rule.validation_config;
    
    -- Perform validation based on type
    CASE validation_rule.validation_type
        WHEN 'string_length' THEN
            IF length(p_field_value) < (config->>'min_length')::integer OR 
               length(p_field_value) > (config->>'max_length')::integer THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'string_length',
                    'error_message', validation_rule.error_message,
                    'expected', config
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;
            
        WHEN 'enum' THEN
            IF NOT (p_field_value = ANY(ARRAY(SELECT jsonb_array_elements_text(config->'allowed_values')))) THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'enum_violation',
                    'error_message', validation_rule.error_message,
                    'allowed_values', config->'allowed_values'
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;
            
        WHEN 'json_schema' THEN
            BEGIN
                -- Basic JSON validation
                array_value := p_field_value::jsonb;
                validation_result := jsonb_build_object('valid', true);
            EXCEPTION
                WHEN invalid_text_representation THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'invalid_json',
                        'error_message', 'Value must be valid JSON'
                    );
            END;
            
        ELSE
            validation_result := jsonb_build_object('valid', true, 'message', 'validation_type_not_implemented');
    END CASE;
    
    RETURN validation_result;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auth_audit_log; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.auth_audit_log (
    id bigint NOT NULL,
    user_id uuid,
    session_id character varying(128),
    event_type character varying(50) NOT NULL,
    event_status character varying(20) NOT NULL,
    ip_address inet,
    user_agent text,
    session_fingerprint character varying(255),
    security_flags jsonb DEFAULT '{}'::jsonb,
    details jsonb,
    risk_score integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: auth_audit_log_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.auth_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.auth_audit_log_id_seq OWNED BY auth.auth_audit_log.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: permissions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(150) NOT NULL,
    description text,
    resource character varying(50) NOT NULL,
    action character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE permissions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.permissions IS 'System permissions covering all major resources: campaigns, personas, proxies, system, users, reports';


--
-- Name: rate_limits; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.rate_limits (
    id bigint NOT NULL,
    identifier character varying(255) NOT NULL,
    action character varying(50) NOT NULL,
    attempts integer DEFAULT 1,
    window_start timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    blocked_until timestamp without time zone
);


--
-- Name: rate_limits_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.rate_limits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rate_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.rate_limits_id_seq OWNED BY auth.rate_limits.id;


--
-- Name: role_permissions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    is_system_role boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.roles IS 'System roles with default setup: super_admin (full access), admin (administrative), user (standard), viewer (read-only)';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id character varying(128) NOT NULL,
    user_id uuid NOT NULL,
    ip_address inet,
    user_agent text,
    user_agent_hash character varying(64),
    session_fingerprint character varying(255),
    browser_fingerprint text,
    screen_resolution character varying(20),
    is_active boolean DEFAULT true,
    expires_at timestamp without time zone NOT NULL,
    last_activity_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: COLUMN sessions.user_agent_hash; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.user_agent_hash IS 'SHA-256 hash of user agent for fast comparison';


--
-- Name: COLUMN sessions.session_fingerprint; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.session_fingerprint IS 'SHA-256 hash of IP address, user agent, and screen resolution for session security';


--
-- Name: COLUMN sessions.browser_fingerprint; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.browser_fingerprint IS 'SHA-256 hash of user agent and screen resolution for browser identification';


--
-- Name: COLUMN sessions.screen_resolution; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.screen_resolution IS 'Screen resolution for enhanced browser fingerprinting';


--
-- Name: user_roles; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone
);


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    email_verification_expires_at timestamp without time zone,
    password_hash character varying(255) NOT NULL,
    password_pepper_version integer DEFAULT 1,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    avatar_url text,
    is_active boolean DEFAULT true,
    is_locked boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    last_login_at timestamp without time zone,
    last_login_ip inet,
    password_changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    must_change_password boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_secret_encrypted bytea,
    mfa_backup_codes_encrypted bytea,
    mfa_last_used_at timestamp without time zone,
    encrypted_fields jsonb,
    security_questions_encrypted bytea
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'User records - all columns use snake_case convention';


--
-- Name: COLUMN users.mfa_secret_encrypted; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.mfa_secret_encrypted IS 'Encrypted TOTP secret for MFA authentication';


--
-- Name: COLUMN users.mfa_backup_codes_encrypted; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.mfa_backup_codes_encrypted IS 'Encrypted backup codes for MFA recovery';


--
-- Name: COLUMN users.mfa_last_used_at; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.mfa_last_used_at IS 'Timestamp of last successful MFA authentication';


--
-- Name: COLUMN users.encrypted_fields; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.encrypted_fields IS 'JSONB storage for additional encrypted user data';


--
-- Name: COLUMN users.security_questions_encrypted; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.security_questions_encrypted IS 'Encrypted security questions and answers';


--
-- Name: api_access_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_access_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    violation_type character varying(100) NOT NULL,
    required_permissions text[] DEFAULT '{}'::text[],
    user_permissions text[] DEFAULT '{}'::text[],
    resource_id character varying(255),
    violation_details jsonb DEFAULT '{}'::jsonb,
    source_ip inet,
    user_agent text,
    request_headers jsonb DEFAULT '{}'::jsonb,
    response_status integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_endpoint_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_endpoint_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    required_permissions text[] DEFAULT '{}'::text[] NOT NULL,
    resource_type character varying(100),
    minimum_role character varying(50) DEFAULT 'user'::character varying,
    requires_ownership boolean DEFAULT false,
    requires_campaign_access boolean DEFAULT false,
    bypass_conditions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: async_task_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.async_task_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying(255) NOT NULL,
    task_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'queued'::character varying,
    progress_percentage numeric(5,2) DEFAULT 0,
    total_items integer DEFAULT 0,
    processed_items integer DEFAULT 0,
    user_id uuid,
    campaign_id uuid,
    error_message text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    estimated_completion_at timestamp with time zone
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb,
    client_ip text,
    user_agent text,
    authorization_context jsonb DEFAULT '{}'::jsonb,
    security_level character varying(50) DEFAULT 'standard'::character varying,
    access_decision character varying(50) DEFAULT 'unknown'::character varying,
    permission_checked text[],
    resource_sensitivity character varying(50) DEFAULT 'normal'::character varying
);


--
-- Name: COLUMN audit_logs.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.action IS 'e.g., CampaignCreated, PersonaUpdated, ProxyTested';


--
-- Name: COLUMN audit_logs.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.entity_type IS 'e.g., Campaign, Persona, Proxy';


--
-- Name: authorization_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authorization_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    decision_id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id character varying(255) NOT NULL,
    action character varying(100) NOT NULL,
    decision character varying(20) NOT NULL,
    policy_version character varying(50),
    evaluated_policies text[] DEFAULT '{}'::text[],
    conditions_met jsonb DEFAULT '{}'::jsonb,
    decision_time_ms integer DEFAULT 0,
    context jsonb DEFAULT '{}'::jsonb,
    security_event_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT authorization_decisions_decision_check CHECK (((decision)::text = ANY ((ARRAY['allow'::character varying, 'deny'::character varying, 'conditional'::character varying])::text[])))
);


--
-- Name: cache_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_name character varying(100) NOT NULL,
    cache_type character varying(50) NOT NULL,
    max_size_bytes bigint DEFAULT 0,
    current_size_bytes bigint DEFAULT 0,
    max_entries integer DEFAULT 0,
    current_entries integer DEFAULT 0,
    default_ttl_seconds integer DEFAULT 3600,
    eviction_policy character varying(50) DEFAULT 'lru'::character varying,
    cache_status character varying(50) DEFAULT 'active'::character varying,
    last_cleanup_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cache_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key character varying(255) NOT NULL,
    cache_namespace character varying(100) DEFAULT 'default'::character varying NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    campaign_id uuid,
    cache_value text,
    cache_value_compressed bytea,
    is_compressed boolean DEFAULT false,
    content_type character varying(50) DEFAULT 'text'::character varying,
    size_bytes integer DEFAULT 0,
    hit_count integer DEFAULT 0,
    access_frequency numeric(10,3) DEFAULT 0,
    ttl_seconds integer DEFAULT 3600,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    last_accessed timestamp with time zone DEFAULT now(),
    tags character varying[] DEFAULT '{}'::character varying[],
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: cache_invalidation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_invalidation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    cache_namespace character varying(100) NOT NULL,
    invalidation_pattern character varying(255) NOT NULL,
    invalidation_reason character varying(100) NOT NULL,
    affected_keys_count integer DEFAULT 0,
    campaign_type character varying(50),
    campaign_id uuid,
    triggered_by character varying(100) DEFAULT 'system'::character varying,
    execution_time_ms numeric(10,3) DEFAULT 0,
    success boolean DEFAULT true,
    error_message text,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: cache_invalidations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_invalidations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_name character varying(100) NOT NULL,
    invalidation_type character varying(50) NOT NULL,
    invalidation_reason text,
    keys_invalidated integer DEFAULT 1,
    bytes_freed bigint DEFAULT 0,
    operation_context jsonb DEFAULT '{}'::jsonb,
    invalidated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cache_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    cache_namespace character varying(100) NOT NULL,
    campaign_type character varying(50),
    operation_type character varying(20) NOT NULL,
    cache_key character varying(255) NOT NULL,
    execution_time_ms numeric(10,3) DEFAULT 0,
    cache_size_bytes integer DEFAULT 0,
    ttl_used_seconds integer DEFAULT 0,
    hit_ratio_pct numeric(5,2) DEFAULT 0,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: cache_performance_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cache_performance_summary AS
 SELECT service_name,
    cache_namespace,
    campaign_type,
    count(*) AS total_operations,
    sum(
        CASE
            WHEN ((operation_type)::text = 'hit'::text) THEN 1
            ELSE 0
        END) AS cache_hits,
    sum(
        CASE
            WHEN ((operation_type)::text = 'miss'::text) THEN 1
            ELSE 0
        END) AS cache_misses,
    sum(
        CASE
            WHEN ((operation_type)::text = 'set'::text) THEN 1
            ELSE 0
        END) AS cache_sets,
        CASE
            WHEN (sum(
            CASE
                WHEN ((operation_type)::text = ANY ((ARRAY['hit'::character varying, 'miss'::character varying])::text[])) THEN 1
                ELSE 0
            END) > 0) THEN round((((sum(
            CASE
                WHEN ((operation_type)::text = 'hit'::text) THEN 1
                ELSE 0
            END))::numeric / (sum(
            CASE
                WHEN ((operation_type)::text = ANY ((ARRAY['hit'::character varying, 'miss'::character varying])::text[])) THEN 1
                ELSE 0
            END))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS hit_rate_pct,
    avg(execution_time_ms) AS avg_execution_time_ms,
    avg(cache_size_bytes) AS avg_cache_size_bytes,
    max(recorded_at) AS last_recorded
   FROM public.cache_metrics
  WHERE (recorded_at >= (now() - '24:00:00'::interval))
  GROUP BY service_name, cache_namespace, campaign_type
  ORDER BY
        CASE
            WHEN (sum(
            CASE
                WHEN ((operation_type)::text = ANY ((ARRAY['hit'::character varying, 'miss'::character varying])::text[])) THEN 1
                ELSE 0
            END) > 0) THEN round((((sum(
            CASE
                WHEN ((operation_type)::text = 'hit'::text) THEN 1
                ELSE 0
            END))::numeric / (sum(
            CASE
                WHEN ((operation_type)::text = ANY ((ARRAY['hit'::character varying, 'miss'::character varying])::text[])) THEN 1
                ELSE 0
            END))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END DESC;


--
-- Name: campaign_access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_access_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    user_id uuid NOT NULL,
    access_type character varying(50) DEFAULT 'read'::character varying NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: campaign_cache_efficiency; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.campaign_cache_efficiency AS
 SELECT campaign_type,
    service_name,
    count(DISTINCT cache_namespace) AS cache_namespaces_used,
    sum(
        CASE
            WHEN ((operation_type)::text = 'hit'::text) THEN 1
            ELSE 0
        END) AS total_hits,
    sum(
        CASE
            WHEN ((operation_type)::text = 'miss'::text) THEN 1
            ELSE 0
        END) AS total_misses,
        CASE
            WHEN (sum(
            CASE
                WHEN ((operation_type)::text = ANY ((ARRAY['hit'::character varying, 'miss'::character varying])::text[])) THEN 1
                ELSE 0
            END) > 0) THEN round((((sum(
            CASE
                WHEN ((operation_type)::text = 'hit'::text) THEN 1
                ELSE 0
            END))::numeric / (sum(
            CASE
                WHEN ((operation_type)::text = ANY ((ARRAY['hit'::character varying, 'miss'::character varying])::text[])) THEN 1
                ELSE 0
            END))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS overall_hit_rate_pct,
    avg(execution_time_ms) AS avg_cache_operation_time_ms,
        CASE
            WHEN (avg(execution_time_ms) <= (1)::numeric) THEN 'excellent'::text
            WHEN (avg(execution_time_ms) <= (5)::numeric) THEN 'good'::text
            WHEN (avg(execution_time_ms) <= (10)::numeric) THEN 'acceptable'::text
            ELSE 'needs_optimization'::text
        END AS cache_performance_rating,
    max(recorded_at) AS last_recorded
   FROM public.cache_metrics
  WHERE (recorded_at >= (now() - '24:00:00'::interval))
  GROUP BY campaign_type, service_name
  ORDER BY
        CASE
            WHEN (sum(
            CASE
                WHEN ((operation_type)::text = ANY ((ARRAY['hit'::character varying, 'miss'::character varying])::text[])) THEN 1
                ELSE 0
            END) > 0) THEN round((((sum(
            CASE
                WHEN ((operation_type)::text = 'hit'::text) THEN 1
                ELSE 0
            END))::numeric / (sum(
            CASE
                WHEN ((operation_type)::text = ANY ((ARRAY['hit'::character varying, 'miss'::character varying])::text[])) THEN 1
                ELSE 0
            END))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END DESC;


--
-- Name: campaign_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    job_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    scheduled_at timestamp with time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    last_attempted_at timestamp with time zone,
    last_error text,
    processing_server_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    job_payload jsonb,
    next_execution_at timestamp with time zone,
    locked_at timestamp with time zone,
    locked_by text,
    business_status text,
    CONSTRAINT campaign_jobs_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT campaign_jobs_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT chk_campaign_jobs_business_status_valid CHECK (((business_status IS NULL) OR (business_status = ANY (ARRAY['processing'::text, 'retry'::text, 'priority_queued'::text, 'batch_optimized'::text])))),
    CONSTRAINT chk_campaign_jobs_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT chk_campaign_jobs_type_valid CHECK ((job_type = ANY (ARRAY['domain_generation'::text, 'dns_validation'::text, 'http_keyword_validation'::text])))
);


--
-- Name: COLUMN campaign_jobs.job_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaign_jobs.job_type IS 'e.g., DomainGeneration, DNSValidation, HTTPKeywordScan (matches campaign_type usually)';


--
-- Name: COLUMN campaign_jobs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaign_jobs.status IS 'e.g., Pending, Queued, Running, Completed, Failed, Retry';


--
-- Name: campaign_query_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_query_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_type character varying(50) NOT NULL,
    service_name character varying(100) NOT NULL,
    query_pattern text NOT NULL,
    query_frequency integer DEFAULT 0,
    avg_execution_time_ms numeric(10,3) DEFAULT 0,
    total_cpu_time_ms numeric(10,3) DEFAULT 0,
    optimization_status character varying(20) DEFAULT 'pending'::character varying,
    baseline_performance jsonb DEFAULT '{}'::jsonb,
    optimized_performance jsonb DEFAULT '{}'::jsonb,
    last_analysis timestamp with time zone DEFAULT now()
);


--
-- Name: query_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    query_sql text NOT NULL,
    query_type character varying(50) NOT NULL,
    table_names character varying[] DEFAULT '{}'::character varying[],
    execution_time_ms numeric(10,3) NOT NULL,
    rows_examined bigint DEFAULT 0,
    rows_returned bigint DEFAULT 0,
    index_usage jsonb DEFAULT '{}'::jsonb,
    cpu_time_ms numeric(10,3) DEFAULT 0,
    io_wait_ms numeric(10,3) DEFAULT 0,
    lock_wait_ms numeric(10,3) DEFAULT 0,
    buffer_reads bigint DEFAULT 0,
    buffer_hits bigint DEFAULT 0,
    query_plan jsonb DEFAULT '{}'::jsonb,
    optimization_score numeric(5,2) DEFAULT 0,
    executed_at timestamp with time zone DEFAULT now(),
    service_name character varying(100) DEFAULT 'unknown'::character varying,
    campaign_id uuid,
    campaign_type character varying(50),
    memory_used_bytes bigint DEFAULT 0,
    optimization_applied boolean DEFAULT false,
    optimization_suggestions jsonb DEFAULT '[]'::jsonb,
    user_id uuid,
    performance_category character varying(20) DEFAULT 'normal'::character varying,
    needs_optimization boolean DEFAULT false
);


--
-- Name: campaign_query_performance_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.campaign_query_performance_summary AS
 SELECT campaign_type,
    service_name,
    count(*) AS total_queries,
    avg(execution_time_ms) AS avg_execution_time_ms,
    percentile_cont((0.95)::double precision) WITHIN GROUP (ORDER BY ((execution_time_ms)::double precision)) AS p95_execution_time_ms,
    percentile_cont((0.99)::double precision) WITHIN GROUP (ORDER BY ((execution_time_ms)::double precision)) AS p99_execution_time_ms,
    sum(
        CASE
            WHEN ((performance_category)::text = 'critical'::text) THEN 1
            ELSE 0
        END) AS critical_queries,
    sum(
        CASE
            WHEN ((performance_category)::text = 'slow'::text) THEN 1
            ELSE 0
        END) AS slow_queries,
    sum(
        CASE
            WHEN needs_optimization THEN 1
            ELSE 0
        END) AS queries_needing_optimization,
    max(executed_at) AS last_recorded
   FROM public.query_performance_metrics
  WHERE (executed_at >= (now() - '24:00:00'::interval))
  GROUP BY campaign_type, service_name
  ORDER BY (avg(execution_time_ms)) DESC;


--
-- Name: resource_utilization_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_utilization_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    current_usage numeric(10,3) NOT NULL,
    max_capacity numeric(10,3) NOT NULL,
    utilization_pct numeric(5,2) NOT NULL,
    efficiency_score numeric(5,2) DEFAULT 0,
    bottleneck_detected boolean DEFAULT false,
    recorded_at timestamp with time zone DEFAULT now(),
    campaign_type character varying(50),
    campaign_id uuid,
    component character varying(100),
    optimization_applied jsonb DEFAULT '{}'::jsonb
);


--
-- Name: campaign_resource_usage; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.campaign_resource_usage AS
 SELECT campaign_type,
    service_name,
    resource_type,
    count(*) AS measurement_count,
    avg(utilization_pct) AS avg_utilization_pct,
    max(utilization_pct) AS peak_utilization_pct,
    avg(efficiency_score) AS avg_efficiency_score,
    sum(
        CASE
            WHEN bottleneck_detected THEN 1
            ELSE 0
        END) AS bottleneck_events,
        CASE
            WHEN (avg(utilization_pct) <= (50)::numeric) THEN 'underutilized'::text
            WHEN (avg(utilization_pct) <= (80)::numeric) THEN 'optimal'::text
            WHEN (avg(utilization_pct) <= (95)::numeric) THEN 'high'::text
            ELSE 'critical'::text
        END AS usage_level,
    max(recorded_at) AS last_recorded
   FROM public.resource_utilization_metrics
  WHERE (recorded_at >= (now() - '24:00:00'::interval))
  GROUP BY campaign_type, service_name, resource_type
  ORDER BY (avg(utilization_pct)) DESC;


--
-- Name: campaign_state_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_state_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    event_type text NOT NULL,
    source_state text,
    target_state text,
    reason text,
    triggered_by text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    operation_context jsonb DEFAULT '{}'::jsonb,
    sequence_number bigint NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    persisted_at timestamp with time zone DEFAULT now() NOT NULL,
    processing_status text DEFAULT 'pending'::text NOT NULL,
    processing_error text,
    correlation_id uuid,
    CONSTRAINT campaign_state_events_event_type_check CHECK ((event_type = ANY (ARRAY['state_transition'::text, 'validation_result'::text, 'progress_update'::text, 'error_occurred'::text, 'configuration_change'::text, 'resource_allocation'::text, 'batch_processed'::text, 'worker_assigned'::text, 'checkpoint_created'::text]))),
    CONSTRAINT campaign_state_events_processing_status_check CHECK ((processing_status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text, 'skipped'::text])))
);


--
-- Name: TABLE campaign_state_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaign_state_events IS 'Event sourcing table for campaign state management - stores all state changes for replay and audit';


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
    current_state text NOT NULL,
    state_data jsonb NOT NULL,
    last_event_sequence bigint NOT NULL,
    snapshot_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    checksum text NOT NULL,
    is_valid boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE campaign_state_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaign_state_snapshots IS 'Periodic snapshots of campaign state for faster replay and recovery';


--
-- Name: campaign_state_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_state_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state_event_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    from_state text NOT NULL,
    to_state text NOT NULL,
    is_valid_transition boolean DEFAULT true NOT NULL,
    validation_errors jsonb DEFAULT '[]'::jsonb,
    transition_metadata jsonb DEFAULT '{}'::jsonb,
    triggered_by text NOT NULL,
    initiated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    duration_ms integer
);


--
-- Name: TABLE campaign_state_transitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaign_state_transitions IS 'Tracks specific state transitions with validation and timing information';


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    campaign_type text DEFAULT 'domain_generation'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    user_id uuid,
    total_items bigint DEFAULT 0,
    processed_items bigint DEFAULT 0,
    successful_items bigint DEFAULT 0,
    failed_items bigint DEFAULT 0,
    progress_percentage double precision DEFAULT 0.0,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text,
    estimated_completion_at timestamp with time zone,
    avg_processing_rate double precision,
    last_heartbeat_at timestamp with time zone,
    business_status text,
    CONSTRAINT campaigns_campaign_type_check CHECK ((campaign_type = ANY (ARRAY['domain_generation'::text, 'dns_validation'::text, 'http_keyword_validation'::text]))),
    CONSTRAINT chk_campaign_items_non_negative CHECK (((total_items >= 0) AND (processed_items >= 0) AND (successful_items >= 0) AND (failed_items >= 0))),
    CONSTRAINT chk_campaigns_business_status_valid CHECK (((business_status IS NULL) OR (business_status = ANY (ARRAY['archived'::text, 'priority'::text, 'experimental'::text, 'production_ready'::text])))),
    CONSTRAINT chk_campaigns_failed_items_non_negative CHECK ((failed_items >= 0)),
    CONSTRAINT chk_campaigns_processed_items_non_negative CHECK ((processed_items >= 0)),
    CONSTRAINT chk_campaigns_progress_percentage_range CHECK (((progress_percentage IS NULL) OR ((progress_percentage >= (0)::double precision) AND (progress_percentage <= (100)::double precision)))),
    CONSTRAINT chk_campaigns_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'running'::text, 'pausing'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'archived'::text, 'cancelled'::text]))),
    CONSTRAINT chk_campaigns_successful_items_non_negative CHECK ((successful_items >= 0)),
    CONSTRAINT chk_campaigns_total_items_non_negative CHECK ((total_items >= 0))
);


--
-- Name: TABLE campaigns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaigns IS 'Campaign records - all columns use snake_case convention';


--
-- Name: COLUMN campaigns.campaign_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.campaign_type IS 'Valid values: domain_generation, dns_validation, http_keyword_validation';


--
-- Name: COLUMN campaigns.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.status IS 'Valid values: pending, queued, running, pausing, paused, completed, failed, cancelled';


--
-- Name: COLUMN campaigns.total_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.total_items IS 'Total items in campaign (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.processed_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.processed_items IS 'Items processed (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.successful_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.successful_items IS 'Successful items (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.failed_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.failed_items IS 'Failed items (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.estimated_completion_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.estimated_completion_at IS 'Estimated timestamp when campaign will complete';


--
-- Name: COLUMN campaigns.avg_processing_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.avg_processing_rate IS 'Average processing rate (items per second)';


--
-- Name: COLUMN campaigns.last_heartbeat_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.last_heartbeat_at IS 'Last heartbeat timestamp from campaign processor';


--
-- Name: campaigns_camel_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.campaigns_camel_view AS
 SELECT id,
    name,
    campaign_type AS "campaignType",
    status,
    user_id AS "userId",
    total_items AS "totalItems",
    processed_items AS "processedItems",
    successful_items AS "successfulItems",
    failed_items AS "failedItems",
    progress_percentage AS "progressPercentage",
    metadata,
    created_at AS "createdAt",
    updated_at AS "updatedAt",
    started_at AS "startedAt",
    completed_at AS "completedAt",
    error_message AS "errorMessage",
    estimated_completion_at AS "estimatedCompletionAt",
    avg_processing_rate AS "avgProcessingRate",
    last_heartbeat_at AS "lastHeartbeatAt"
   FROM public.campaigns;


--
-- Name: config_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_hash character varying(255) NOT NULL,
    lock_type character varying(50) DEFAULT 'exclusive'::character varying NOT NULL,
    owner character varying(255) NOT NULL,
    acquired_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_config_locks_expires_future CHECK (((expires_at IS NULL) OR (expires_at > acquired_at)))
);


--
-- Name: config_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_hash character varying(255) NOT NULL,
    version integer NOT NULL,
    lock_type character varying(50) DEFAULT 'none'::character varying NOT NULL,
    config_state jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: connection_leak_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connection_leak_detection (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id character varying(255) NOT NULL,
    acquired_at timestamp with time zone NOT NULL,
    acquired_by character varying(255) NOT NULL,
    operation_context jsonb DEFAULT '{}'::jsonb,
    stack_trace text,
    is_leaked boolean DEFAULT false,
    leak_detected_at timestamp with time zone,
    released_at timestamp with time zone,
    duration_held_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: connection_pool_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connection_pool_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type character varying(50) NOT NULL,
    threshold_value integer NOT NULL,
    alert_enabled boolean DEFAULT true,
    alert_message text NOT NULL,
    severity_level character varying(20) DEFAULT 'warning'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: connection_pool_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connection_pool_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_name character varying(100) NOT NULL,
    active_connections integer NOT NULL,
    idle_connections integer NOT NULL,
    max_connections integer NOT NULL,
    total_connections integer NOT NULL,
    connections_in_use integer NOT NULL,
    wait_count integer DEFAULT 0,
    wait_duration_ms integer DEFAULT 0,
    connection_errors integer DEFAULT 0,
    pool_state character varying(50) DEFAULT 'healthy'::character varying,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: database_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.database_performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_type character varying(100) NOT NULL,
    query_hash character varying(64) NOT NULL,
    execution_time_ms integer NOT NULL,
    rows_affected integer DEFAULT 0,
    rows_returned integer DEFAULT 0,
    index_usage jsonb DEFAULT '{}'::jsonb,
    query_plan_summary text,
    cache_hit boolean DEFAULT false,
    operation_context jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: dns_validation_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dns_validation_params (
    campaign_id uuid NOT NULL,
    source_generation_campaign_id uuid,
    persona_ids uuid[] NOT NULL,
    rotation_interval_seconds integer DEFAULT 0,
    processing_speed_per_minute integer DEFAULT 0,
    batch_size integer DEFAULT 50,
    retry_attempts integer DEFAULT 1,
    metadata jsonb,
    CONSTRAINT chk_dns_validation_processing_speed_non_negative CHECK (((processing_speed_per_minute IS NULL) OR (processing_speed_per_minute >= 0))),
    CONSTRAINT chk_dns_validation_rotation_interval_non_negative CHECK (((rotation_interval_seconds IS NULL) OR (rotation_interval_seconds >= 0))),
    CONSTRAINT dns_validation_params_batch_size_check CHECK ((batch_size > 0)),
    CONSTRAINT dns_validation_params_retry_attempts_check CHECK ((retry_attempts >= 0))
);


--
-- Name: dns_validation_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dns_validation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dns_campaign_id uuid NOT NULL,
    generated_domain_id uuid,
    domain_name text NOT NULL,
    validation_status text NOT NULL,
    dns_records jsonb,
    validated_by_persona_id uuid,
    attempts integer DEFAULT 0,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    business_status text,
    CONSTRAINT chk_dns_business_status_valid CHECK (((business_status IS NULL) OR (business_status = ANY (ARRAY['valid_dns'::text, 'lead_valid'::text, 'http_valid_no_keywords'::text, 'cancelled_during_processing'::text, 'invalid_http_response_error'::text, 'invalid_http_code'::text, 'processing_failed_before_http'::text])))),
    CONSTRAINT chk_dns_validation_status_valid CHECK ((validation_status = ANY (ARRAY['pending'::text, 'resolved'::text, 'unresolved'::text, 'timeout'::text, 'error'::text]))),
    CONSTRAINT dns_validation_results_attempts_check CHECK ((attempts >= 0))
);


--
-- Name: COLUMN dns_validation_results.validation_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dns_validation_results.validation_status IS 'e.g., Resolved, Unresolved, Error, Pending, Skipped';


--
-- Name: domain_generation_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_batches (
    batch_id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    batch_number integer NOT NULL,
    total_domains integer NOT NULL,
    processed_domains integer DEFAULT 0,
    failed_domains integer DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying,
    assigned_worker_id character varying(255),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: domain_generation_campaign_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_campaign_params (
    campaign_id uuid NOT NULL,
    pattern_type text NOT NULL,
    variable_length integer,
    character_set text,
    constant_string text,
    tld text NOT NULL,
    num_domains_to_generate integer NOT NULL,
    total_possible_combinations bigint NOT NULL,
    current_offset bigint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_domain_gen_current_offset_non_negative CHECK ((current_offset >= 0)),
    CONSTRAINT chk_domain_gen_num_domains_positive CHECK ((num_domains_to_generate > 0)),
    CONSTRAINT chk_domain_gen_pattern_type CHECK ((pattern_type = ANY (ARRAY['prefix'::text, 'suffix'::text, 'both'::text]))),
    CONSTRAINT chk_domain_gen_total_combinations_positive CHECK ((total_possible_combinations > 0)),
    CONSTRAINT chk_domain_gen_values_non_negative CHECK (((total_possible_combinations >= 0) AND (current_offset >= 0) AND (current_offset <= total_possible_combinations))),
    CONSTRAINT chk_domain_gen_variable_length_positive CHECK (((variable_length IS NULL) OR (variable_length > 0)))
);


--
-- Name: COLUMN domain_generation_campaign_params.total_possible_combinations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domain_generation_campaign_params.total_possible_combinations IS 'Total combinations (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN domain_generation_campaign_params.current_offset; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domain_generation_campaign_params.current_offset IS 'Current offset (Go: int64, JS: requires SafeBigInt)';


--
-- Name: domain_generation_config_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_config_states (
    config_hash text NOT NULL,
    last_offset bigint NOT NULL,
    config_details jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_domain_config_states_offset_positive CHECK ((last_offset >= 0)),
    CONSTRAINT chk_domain_config_states_version_positive CHECK ((version > 0))
);


--
-- Name: domain_generation_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_params (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    pattern_type text NOT NULL,
    tld text NOT NULL,
    constant_string text,
    variable_length integer NOT NULL,
    character_set text NOT NULL,
    num_domains_to_generate integer DEFAULT 1000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_possible_combinations bigint DEFAULT 0 NOT NULL,
    current_offset bigint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_offset_within_bounds CHECK (((current_offset >= 0) AND (current_offset <= total_possible_combinations))),
    CONSTRAINT domain_generation_params_num_domains_to_generate_check CHECK ((num_domains_to_generate > 0)),
    CONSTRAINT domain_generation_params_pattern_type_check CHECK ((pattern_type = ANY (ARRAY['prefix'::text, 'suffix'::text, 'both'::text]))),
    CONSTRAINT domain_generation_params_variable_length_check CHECK ((variable_length > 0))
);


--
-- Name: enum_validation_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enum_validation_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    column_name text NOT NULL,
    invalid_value text NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    context jsonb
);


--
-- Name: generated_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain_generation_campaign_id uuid NOT NULL,
    domain_name text NOT NULL,
    source_keyword text,
    source_pattern text,
    tld text,
    offset_index bigint DEFAULT 0 NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_generated_domains_offset_non_negative CHECK ((offset_index >= 0))
);


--
-- Name: COLUMN generated_domains.offset_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.offset_index IS 'Generation offset (Go: int64, JS: requires SafeBigInt)';


--
-- Name: http_keyword_campaign_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.http_keyword_campaign_params (
    campaign_id uuid NOT NULL,
    source_campaign_id uuid NOT NULL,
    source_type text NOT NULL,
    persona_ids uuid[] NOT NULL,
    keyword_set_ids uuid[],
    ad_hoc_keywords text[],
    proxy_ids uuid[],
    proxy_pool_id uuid,
    proxy_selection_strategy text,
    rotation_interval_seconds integer DEFAULT 0,
    processing_speed_per_minute integer DEFAULT 0,
    batch_size integer DEFAULT 10,
    retry_attempts integer DEFAULT 1,
    target_http_ports integer[],
    last_processed_domain_name text,
    metadata jsonb,
    CONSTRAINT chk_http_keyword_processing_speed_non_negative CHECK (((processing_speed_per_minute IS NULL) OR (processing_speed_per_minute >= 0))),
    CONSTRAINT chk_http_keyword_rotation_interval_non_negative CHECK (((rotation_interval_seconds IS NULL) OR (rotation_interval_seconds >= 0))),
    CONSTRAINT chk_http_keyword_source_type_valid CHECK ((source_type = ANY (ARRAY['DomainGeneration'::text, 'DNSValidation'::text]))),
    CONSTRAINT http_keyword_campaign_params_batch_size_check CHECK ((batch_size > 0)),
    CONSTRAINT http_keyword_campaign_params_retry_attempts_check CHECK ((retry_attempts >= 0))
);


--
-- Name: COLUMN http_keyword_campaign_params.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.http_keyword_campaign_params.source_type IS 'Source type with exact casing: DomainGeneration or DNSValidation';


--
-- Name: http_keyword_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.http_keyword_params (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    target_url text NOT NULL,
    keyword_set_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source_type text DEFAULT 'DomainGeneration'::text NOT NULL,
    source_campaign_id uuid,
    CONSTRAINT http_keyword_params_source_type_check CHECK ((source_type = ANY (ARRAY['DomainGeneration'::text, 'DNSValidation'::text])))
);


--
-- Name: COLUMN http_keyword_params.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.http_keyword_params.source_type IS 'Valid values: DomainGeneration, DNSValidation (PascalCase required)';


--
-- Name: http_keyword_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.http_keyword_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    http_keyword_campaign_id uuid NOT NULL,
    dns_result_id uuid,
    domain_name text NOT NULL,
    validation_status text NOT NULL,
    http_status_code integer,
    response_headers jsonb,
    page_title text,
    extracted_content_snippet text,
    found_keywords_from_sets jsonb,
    found_ad_hoc_keywords jsonb,
    content_hash text,
    validated_by_persona_id uuid,
    used_proxy_id uuid,
    attempts integer DEFAULT 0,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    business_status text,
    CONSTRAINT chk_http_business_status_valid CHECK ((business_status = ANY (ARRAY['lead_valid'::text, 'http_valid_no_keywords'::text, 'invalid_http_response_error'::text, 'invalid_http_code'::text, 'processing_failed_before_http'::text, 'cancelled_during_processing'::text]))),
    CONSTRAINT chk_http_validation_status_valid CHECK ((validation_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'timeout'::text, 'error'::text])))
);


--
-- Name: COLUMN http_keyword_results.validation_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.http_keyword_results.validation_status IS 'e.g., Success, ContentMismatch, KeywordsNotFound, Unreachable, AccessDenied, ProxyError, DNSError, Timeout, Error, Pending, Skipped';


--
-- Name: index_usage_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.index_usage_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schema_name character varying(100) NOT NULL,
    table_name character varying(100) NOT NULL,
    index_name character varying(100) NOT NULL,
    index_type character varying(50) NOT NULL,
    total_scans bigint DEFAULT 0,
    tuples_read bigint DEFAULT 0,
    tuples_fetched bigint DEFAULT 0,
    blocks_read bigint DEFAULT 0,
    blocks_hit bigint DEFAULT 0,
    index_size_bytes bigint DEFAULT 0,
    index_efficiency_pct numeric(5,2) DEFAULT 0,
    last_used_at timestamp with time zone,
    usage_frequency character varying(20) DEFAULT 'unknown'::character varying,
    recommendation character varying(100),
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: input_validation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.input_validation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    field_name character varying(100) NOT NULL,
    validation_type character varying(50) NOT NULL,
    validation_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text,
    is_required boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: input_validation_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.input_validation_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    field_name character varying(100) NOT NULL,
    violation_type character varying(100) NOT NULL,
    provided_value text,
    expected_format text,
    validation_rule jsonb,
    error_message text,
    source_ip inet,
    user_agent text,
    request_id character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: keyword_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    keyword_set_id uuid NOT NULL,
    pattern text NOT NULL,
    rule_type text NOT NULL,
    is_case_sensitive boolean DEFAULT false,
    category text,
    context_chars integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_keyword_rules_type_valid CHECK ((rule_type = ANY (ARRAY['string'::text, 'regex'::text]))),
    CONSTRAINT keyword_rules_context_chars_check CHECK ((context_chars >= 0))
);


--
-- Name: TABLE keyword_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.keyword_rules IS 'Individual keyword rules expanded from keyword_sets.rules JSONB';


--
-- Name: keyword_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_keyword_sets_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 255)))
);


--
-- Name: COLUMN keyword_sets.rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.keyword_sets.rules IS 'Array of KeywordRule objects: [{"pattern": "findme", "ruleType": "string", ...}]';


--
-- Name: memory_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_id character varying(255) NOT NULL,
    operation_type character varying(100) NOT NULL,
    campaign_id uuid,
    allocated_bytes bigint NOT NULL,
    peak_bytes bigint NOT NULL,
    duration_ms integer NOT NULL,
    allocation_pattern jsonb DEFAULT '{}'::jsonb,
    cleanup_successful boolean DEFAULT true,
    memory_leaked_bytes bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    allocation_type character varying(50) DEFAULT 'unknown'::character varying,
    is_active boolean DEFAULT true,
    allocated_at timestamp with time zone DEFAULT now()
);


--
-- Name: memory_leak_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_leak_detection (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    leak_type character varying(50) NOT NULL,
    leak_source character varying(255) NOT NULL,
    leaked_bytes bigint NOT NULL,
    detection_method character varying(100) NOT NULL,
    stack_trace text,
    operation_context jsonb DEFAULT '{}'::jsonb,
    severity character varying(20) DEFAULT 'medium'::character varying,
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    detected_at timestamp with time zone DEFAULT now()
);


--
-- Name: memory_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    process_id character varying(50) NOT NULL,
    heap_size_bytes bigint NOT NULL,
    heap_used_bytes bigint NOT NULL,
    heap_free_bytes bigint NOT NULL,
    gc_count bigint DEFAULT 0,
    gc_duration_ms bigint DEFAULT 0,
    goroutines_count integer DEFAULT 0,
    stack_size_bytes bigint DEFAULT 0,
    memory_utilization_pct numeric(5,2) DEFAULT 0,
    memory_state character varying(50) DEFAULT 'normal'::character varying,
    recorded_at timestamp with time zone DEFAULT now(),
    component character varying(100) DEFAULT 'unknown'::character varying,
    memory_type character varying(50) DEFAULT 'heap'::character varying,
    allocated_bytes bigint DEFAULT 0,
    used_bytes bigint DEFAULT 0,
    available_bytes bigint DEFAULT 0,
    allocation_count integer DEFAULT 0,
    deallocation_count integer DEFAULT 0,
    gc_cycles integer DEFAULT 0,
    efficiency_score numeric(5,2) DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: memory_optimization_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_optimization_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recommendation_type character varying(100) NOT NULL,
    service_name character varying(100) NOT NULL,
    current_usage_bytes bigint NOT NULL,
    recommended_limit_bytes bigint NOT NULL,
    optimization_strategy jsonb NOT NULL,
    estimated_savings_bytes bigint DEFAULT 0,
    implementation_priority character varying(20) DEFAULT 'medium'::character varying,
    implemented boolean DEFAULT false,
    implemented_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: memory_pools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_name character varying(100) NOT NULL,
    service_name character varying(100) NOT NULL,
    pool_type character varying(50) NOT NULL,
    max_size integer DEFAULT 100 NOT NULL,
    current_size integer DEFAULT 0 NOT NULL,
    total_allocations bigint DEFAULT 0 NOT NULL,
    total_deallocations bigint DEFAULT 0 NOT NULL,
    hit_rate numeric(5,2) DEFAULT 0,
    miss_rate numeric(5,2) DEFAULT 0,
    efficiency_score numeric(5,2) DEFAULT 0,
    configuration jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: performance_baselines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_baselines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    baseline_date timestamp with time zone DEFAULT now(),
    query_count integer DEFAULT 0,
    avg_query_time_ms numeric(10,3) DEFAULT 0,
    p95_query_time_ms numeric(10,3) DEFAULT 0,
    p99_query_time_ms numeric(10,3) DEFAULT 0,
    slow_query_count integer DEFAULT 0,
    total_cpu_time_ms numeric(10,3) DEFAULT 0,
    total_memory_bytes bigint DEFAULT 0,
    database_connections_avg integer DEFAULT 0,
    optimization_phase character varying(50) NOT NULL,
    notes text
);


--
-- Name: performance_optimizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_optimizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    optimization_type character varying(100) NOT NULL,
    target_service character varying(100) NOT NULL,
    target_operation character varying(255) NOT NULL,
    baseline_time_ms integer NOT NULL,
    optimized_time_ms integer NOT NULL,
    improvement_pct numeric(5,2) NOT NULL,
    optimization_technique character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now(),
    validation_status character varying(50) DEFAULT 'pending'::character varying
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    resource character varying(100),
    action character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    persona_type text NOT NULL,
    config_details jsonb NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_personas_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 255))),
    CONSTRAINT personas_persona_type_check CHECK ((persona_type = ANY (ARRAY['dns'::text, 'http'::text])))
);


--
-- Name: TABLE personas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.personas IS 'Persona records - all columns use snake_case convention';


--
-- Name: COLUMN personas.persona_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personas.persona_type IS 'Valid values: dns, http';


--
-- Name: COLUMN personas.config_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personas.config_details IS 'Stores DNSValidatorConfigJSON or HTTPValidatorConfigJSON';


--
-- Name: personas_camel_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.personas_camel_view AS
 SELECT id,
    name,
    description,
    persona_type AS "personaType",
    config_details AS "configDetails",
    is_enabled AS "isEnabled",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
   FROM public.personas;


--
-- Name: proxies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    address text NOT NULL,
    protocol text,
    username text,
    password_hash text,
    host text,
    port integer,
    is_enabled boolean DEFAULT true NOT NULL,
    is_healthy boolean DEFAULT true NOT NULL,
    last_status text,
    last_checked_at timestamp with time zone,
    latency_ms integer,
    city text,
    country_code text,
    provider text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_proxies_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 255))),
    CONSTRAINT chk_proxies_port_range CHECK (((port IS NULL) OR ((port > 0) AND (port <= 65535)))),
    CONSTRAINT chk_proxies_protocol_valid CHECK (((protocol IS NULL) OR (protocol = ANY (ARRAY['http'::text, 'https'::text, 'socks5'::text, 'socks4'::text])))),
    CONSTRAINT proxies_protocol_check CHECK ((protocol = ANY (ARRAY['http'::text, 'https'::text, 'socks5'::text, 'socks4'::text])))
);


--
-- Name: TABLE proxies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proxies IS 'Proxy records - all columns use snake_case convention';


--
-- Name: COLUMN proxies.protocol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proxies.protocol IS 'Valid values: http, https, socks5, socks4';


--
-- Name: proxies_camel_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.proxies_camel_view AS
 SELECT id,
    name,
    description,
    address,
    protocol,
    username,
    host,
    port,
    is_enabled AS "isEnabled",
    is_healthy AS "isHealthy",
    last_status AS "lastStatus",
    last_checked_at AS "lastCheckedAt",
    latency_ms AS "latencyMs",
    city,
    country_code AS "countryCode",
    provider,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
   FROM public.proxies;


--
-- Name: proxy_pool_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxy_pool_memberships (
    pool_id uuid NOT NULL,
    proxy_id uuid NOT NULL,
    weight integer DEFAULT 1,
    is_active boolean DEFAULT true,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE proxy_pool_memberships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proxy_pool_memberships IS 'Junction table for proxy pool memberships';


--
-- Name: proxy_pools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxy_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    pool_strategy text DEFAULT 'round_robin'::text,
    health_check_enabled boolean DEFAULT true,
    health_check_interval_seconds integer DEFAULT 300,
    max_retries integer DEFAULT 3,
    timeout_seconds integer DEFAULT 30,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_proxy_pools_strategy_valid CHECK ((pool_strategy = ANY (ARRAY['round_robin'::text, 'random'::text, 'least_used'::text, 'weighted'::text])))
);


--
-- Name: TABLE proxy_pools; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proxy_pools IS 'Proxy pool configurations for grouping and managing proxies';


--
-- Name: query_optimization_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_optimization_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    recommendation_type character varying(100) NOT NULL,
    current_performance_ms numeric(10,3) NOT NULL,
    estimated_improvement_pct numeric(5,2) NOT NULL,
    optimization_strategy jsonb NOT NULL,
    suggested_indexes text[] DEFAULT '{}'::text[],
    query_rewrite_suggestion text,
    implementation_complexity character varying(20) DEFAULT 'medium'::character varying,
    implementation_priority character varying(20) DEFAULT 'medium'::character varying,
    implemented boolean DEFAULT false,
    implemented_at timestamp with time zone,
    validation_results jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    service_name character varying(100) DEFAULT 'unknown'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying
);


--
-- Name: resource_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_locks (
    lock_id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id character varying(255) NOT NULL,
    lock_holder character varying(255) NOT NULL,
    lock_mode character varying(50) DEFAULT 'exclusive'::character varying NOT NULL,
    acquired_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    renewal_count integer DEFAULT 0,
    context jsonb DEFAULT '{}'::jsonb
);


--
-- Name: resource_optimization_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_optimization_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    campaign_id uuid,
    action_type character varying(50) NOT NULL,
    resource_type character varying(50) NOT NULL,
    action_description text NOT NULL,
    before_metrics jsonb DEFAULT '{}'::jsonb,
    after_metrics jsonb DEFAULT '{}'::jsonb,
    improvement_pct numeric(5,2) DEFAULT 0,
    success boolean DEFAULT true,
    error_message text,
    triggered_by character varying(50) DEFAULT 'automatic'::character varying,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: resource_utilization_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.resource_utilization_summary AS
 SELECT service_name,
    resource_type,
    campaign_type,
    avg(current_usage) AS avg_usage,
    max(current_usage) AS peak_usage,
    avg(utilization_pct) AS avg_utilization_pct,
    max(utilization_pct) AS peak_utilization_pct,
    avg(efficiency_score) AS avg_efficiency_score,
    count(
        CASE
            WHEN bottleneck_detected THEN 1
            ELSE NULL::integer
        END) AS bottleneck_count,
    count(*) AS metric_count,
    max(recorded_at) AS last_recorded
   FROM public.resource_utilization_metrics
  WHERE (recorded_at >= (now() - '24:00:00'::interval))
  GROUP BY service_name, resource_type, campaign_type
  ORDER BY (avg(utilization_pct)) DESC;


--
-- Name: response_optimization_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_optimization_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_path character varying(255) NOT NULL,
    current_avg_response_ms numeric(10,3) NOT NULL,
    target_response_ms numeric(10,3) NOT NULL,
    optimization_strategies jsonb NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    implemented boolean DEFAULT false,
    implementation_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: response_time_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_time_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    measurement_window interval DEFAULT '01:00:00'::interval NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    avg_response_time_ms numeric(10,3) NOT NULL,
    p50_response_time_ms numeric(10,3) NOT NULL,
    p95_response_time_ms numeric(10,3) NOT NULL,
    p99_response_time_ms numeric(10,3) NOT NULL,
    max_response_time_ms numeric(10,3) NOT NULL,
    error_rate_pct numeric(5,2) DEFAULT 0,
    cache_hit_rate_pct numeric(5,2) DEFAULT 0,
    optimization_score numeric(5,2) DEFAULT 0,
    sla_violations integer DEFAULT 0,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: response_time_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_time_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_path character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    response_time_ms numeric(10,3) NOT NULL,
    payload_size_bytes integer DEFAULT 0,
    user_id uuid,
    campaign_id uuid,
    status_code integer DEFAULT 200,
    recorded_at timestamp with time zone DEFAULT now(),
    service_name character varying(100) DEFAULT 'unknown'::character varying,
    campaign_type character varying(50),
    performance_category character varying(20) DEFAULT 'normal'::character varying,
    cache_hit boolean DEFAULT false
);


--
-- Name: response_time_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_time_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    endpoint_pattern character varying(255) NOT NULL,
    campaign_type character varying(50),
    target_p50_ms numeric(10,3) DEFAULT 100 NOT NULL,
    target_p95_ms numeric(10,3) DEFAULT 500 NOT NULL,
    target_p99_ms numeric(10,3) DEFAULT 1000 NOT NULL,
    sla_threshold_ms numeric(10,3) DEFAULT 2000 NOT NULL,
    alert_threshold_ms numeric(10,3) DEFAULT 1500 NOT NULL,
    optimization_priority character varying(20) DEFAULT 'medium'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    dirty boolean NOT NULL
);


--
-- Name: schema_migrations_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations_old (
    version text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    rolled_back_at timestamp with time zone,
    description text
);


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(100) NOT NULL,
    user_id uuid,
    session_id character varying(255),
    campaign_id uuid,
    resource_type character varying(100),
    resource_id character varying(255),
    action_attempted character varying(100) NOT NULL,
    authorization_result character varying(50) NOT NULL,
    permissions_required text[] DEFAULT '{}'::text[],
    permissions_granted text[] DEFAULT '{}'::text[],
    denial_reason text,
    risk_score integer DEFAULT 0,
    source_ip inet,
    user_agent text,
    request_context jsonb DEFAULT '{}'::jsonb,
    audit_log_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: si004_connection_leak_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.si004_connection_leak_detection (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    connection_id character varying(255) NOT NULL,
    duration_ms bigint NOT NULL,
    stack_trace text,
    query_info text
);


--
-- Name: si004_connection_leak_detection_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.si004_connection_leak_detection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: si004_connection_leak_detection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.si004_connection_leak_detection_id_seq OWNED BY public.si004_connection_leak_detection.id;


--
-- Name: si004_connection_pool_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.si004_connection_pool_alerts (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    alert_level character varying(20) NOT NULL,
    alert_message text NOT NULL,
    utilization_percent numeric(5,2),
    wait_duration_ms bigint,
    open_connections integer,
    in_use_connections integer,
    CONSTRAINT si004_connection_pool_alerts_alert_level_check CHECK (((alert_level)::text = ANY ((ARRAY['INFO'::character varying, 'WARNING'::character varying, 'CRITICAL'::character varying])::text[])))
);


--
-- Name: si004_connection_pool_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.si004_connection_pool_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: si004_connection_pool_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.si004_connection_pool_alerts_id_seq OWNED BY public.si004_connection_pool_alerts.id;


--
-- Name: si004_connection_pool_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.si004_connection_pool_metrics (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    max_open_connections integer NOT NULL,
    open_connections integer NOT NULL,
    in_use_connections integer NOT NULL,
    idle_connections integer NOT NULL,
    wait_count bigint DEFAULT 0 NOT NULL,
    wait_duration_ms bigint DEFAULT 0 NOT NULL,
    max_idle_closed bigint DEFAULT 0 NOT NULL,
    max_idle_time_closed bigint DEFAULT 0 NOT NULL,
    max_lifetime_closed bigint DEFAULT 0 NOT NULL,
    utilization_percent numeric(5,2) DEFAULT 0.00 NOT NULL
);


--
-- Name: si004_connection_pool_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.si004_connection_pool_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: si004_connection_pool_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.si004_connection_pool_metrics_id_seq OWNED BY public.si004_connection_pool_metrics.id;


--
-- Name: slow_query_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slow_query_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    query_sql text NOT NULL,
    execution_time_ms numeric(10,3) NOT NULL,
    waiting_time_ms numeric(10,3) DEFAULT 0,
    rows_examined bigint DEFAULT 0,
    rows_returned bigint DEFAULT 0,
    query_plan jsonb DEFAULT '{}'::jsonb,
    session_info jsonb DEFAULT '{}'::jsonb,
    application_context jsonb DEFAULT '{}'::jsonb,
    severity character varying(20) DEFAULT 'warning'::character varying,
    auto_optimization_attempted boolean DEFAULT false,
    optimization_result jsonb DEFAULT '{}'::jsonb,
    logged_at timestamp with time zone DEFAULT now()
);


--
-- Name: state_coordination_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_coordination_locks (
    lock_key character varying(255) NOT NULL,
    locked_by character varying(255) NOT NULL,
    locked_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: state_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_events (
    id uuid NOT NULL,
    entity_id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    event_data jsonb NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    state_version integer DEFAULT 1,
    correlation_id uuid,
    causation_id uuid,
    aggregate_type character varying(50) DEFAULT 'campaign'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: state_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    entity_type character varying(100) DEFAULT 'campaign'::character varying NOT NULL,
    snapshot_version integer NOT NULL,
    state_data jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: suspicious_input_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspicious_input_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    field_name character varying(100) NOT NULL,
    pattern_name character varying(100) NOT NULL,
    provided_value text NOT NULL,
    pattern_matched text NOT NULL,
    category character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    source_ip character varying(45),
    user_agent text,
    request_id character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: suspicious_input_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspicious_input_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pattern_name character varying(100) NOT NULL,
    pattern text NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying,
    description text,
    detection_action character varying(50) DEFAULT 'log'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    category character varying(50) DEFAULT 'security'::character varying,
    is_enabled boolean DEFAULT true
);


--
-- Name: system_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    message text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    acknowledged boolean DEFAULT false,
    acknowledged_by character varying(255),
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: v_enum_documentation; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_enum_documentation AS
 SELECT 'CampaignType'::text AS enum_name,
    unnest(ARRAY['domain_generation'::text, 'dns_validation'::text, 'http_keyword_validation'::text]) AS valid_values
UNION ALL
 SELECT 'CampaignStatus'::text AS enum_name,
    unnest(ARRAY['pending'::text, 'queued'::text, 'running'::text, 'pausing'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]) AS valid_values
UNION ALL
 SELECT 'PersonaType'::text AS enum_name,
    unnest(ARRAY['dns'::text, 'http'::text]) AS valid_values
UNION ALL
 SELECT 'ProxyProtocol'::text AS enum_name,
    unnest(ARRAY['http'::text, 'https'::text, 'socks5'::text, 'socks4'::text]) AS valid_values
UNION ALL
 SELECT 'KeywordRuleType'::text AS enum_name,
    unnest(ARRAY['string'::text, 'regex'::text]) AS valid_values
UNION ALL
 SELECT 'HTTPSourceType'::text AS enum_name,
    unnest(ARRAY['DomainGeneration'::text, 'DNSValidation'::text]) AS valid_values;


--
-- Name: VIEW v_enum_documentation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_enum_documentation IS 'Documentation of valid enum values matching Go backend';


--
-- Name: versioned_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.versioned_configs (
    id bigint NOT NULL,
    config_type character varying(100) NOT NULL,
    config_key character varying(200) NOT NULL,
    config_value jsonb NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    checksum character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by character varying(100) DEFAULT 'system'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT versioned_configs_checksum_format CHECK (((checksum)::text ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT versioned_configs_key_not_empty CHECK (((config_key IS NOT NULL) AND (length(TRIM(BOTH FROM config_key)) > 0))),
    CONSTRAINT versioned_configs_type_not_empty CHECK (((config_type IS NOT NULL) AND (length(TRIM(BOTH FROM config_type)) > 0))),
    CONSTRAINT versioned_configs_version_positive CHECK ((version > 0))
);


--
-- Name: versioned_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.versioned_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: versioned_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.versioned_configs_id_seq OWNED BY public.versioned_configs.id;


--
-- Name: worker_coordination; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_coordination (
    worker_id character varying(255) NOT NULL,
    campaign_id uuid,
    worker_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'idle'::character varying NOT NULL,
    last_heartbeat timestamp with time zone DEFAULT now(),
    assigned_tasks jsonb DEFAULT '[]'::jsonb,
    resource_locks jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: worker_pool_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_pool_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_name character varying(100) NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    min_workers integer DEFAULT 1 NOT NULL,
    max_workers integer DEFAULT 10 NOT NULL,
    current_workers integer DEFAULT 1 NOT NULL,
    active_workers integer DEFAULT 0 NOT NULL,
    queued_tasks integer DEFAULT 0 NOT NULL,
    completed_tasks bigint DEFAULT 0 NOT NULL,
    failed_tasks bigint DEFAULT 0 NOT NULL,
    avg_task_duration_ms numeric(10,3) DEFAULT 0,
    pool_efficiency_pct numeric(5,2) DEFAULT 0,
    scale_up_events integer DEFAULT 0,
    scale_down_events integer DEFAULT 0,
    last_scale_action timestamp with time zone,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: auth_audit_log id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.auth_audit_log ALTER COLUMN id SET DEFAULT nextval('auth.auth_audit_log_id_seq'::regclass);


--
-- Name: rate_limits id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.rate_limits ALTER COLUMN id SET DEFAULT nextval('auth.rate_limits_id_seq'::regclass);


--
-- Name: campaign_state_events sequence_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events ALTER COLUMN sequence_number SET DEFAULT nextval('public.campaign_state_events_sequence_number_seq'::regclass);


--
-- Name: si004_connection_leak_detection id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_leak_detection ALTER COLUMN id SET DEFAULT nextval('public.si004_connection_leak_detection_id_seq'::regclass);


--
-- Name: si004_connection_pool_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_pool_alerts ALTER COLUMN id SET DEFAULT nextval('public.si004_connection_pool_alerts_id_seq'::regclass);


--
-- Name: si004_connection_pool_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_pool_metrics ALTER COLUMN id SET DEFAULT nextval('public.si004_connection_pool_metrics_id_seq'::regclass);


--
-- Name: versioned_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versioned_configs ALTER COLUMN id SET DEFAULT nextval('public.versioned_configs_id_seq'::regclass);


--
-- Name: auth_audit_log auth_audit_log_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.auth_audit_log
    ADD CONSTRAINT auth_audit_log_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_resource_action_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.permissions
    ADD CONSTRAINT permissions_resource_action_key UNIQUE (resource, action);


--
-- Name: rate_limits rate_limits_identifier_action_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.rate_limits
    ADD CONSTRAINT rate_limits_identifier_action_key UNIQUE (identifier, action);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: api_access_violations api_access_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_access_violations
    ADD CONSTRAINT api_access_violations_pkey PRIMARY KEY (id);


--
-- Name: api_endpoint_permissions api_endpoint_permissions_endpoint_pattern_http_method_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_endpoint_permissions
    ADD CONSTRAINT api_endpoint_permissions_endpoint_pattern_http_method_key UNIQUE (endpoint_pattern, http_method);


--
-- Name: api_endpoint_permissions api_endpoint_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_endpoint_permissions
    ADD CONSTRAINT api_endpoint_permissions_pkey PRIMARY KEY (id);


--
-- Name: async_task_status async_task_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.async_task_status
    ADD CONSTRAINT async_task_status_pkey PRIMARY KEY (id);


--
-- Name: async_task_status async_task_status_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.async_task_status
    ADD CONSTRAINT async_task_status_task_id_key UNIQUE (task_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: authorization_decisions authorization_decisions_decision_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_decision_id_key UNIQUE (decision_id);


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
-- Name: cache_entries cache_entries_cache_namespace_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_cache_namespace_cache_key_key UNIQUE (cache_namespace, cache_key);


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
-- Name: campaign_jobs campaign_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_jobs
    ADD CONSTRAINT campaign_jobs_pkey PRIMARY KEY (id);


--
-- Name: campaign_query_patterns campaign_query_patterns_campaign_type_service_name_query_pa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_query_patterns
    ADD CONSTRAINT campaign_query_patterns_campaign_type_service_name_query_pa_key UNIQUE (campaign_type, service_name, query_pattern);


--
-- Name: campaign_query_patterns campaign_query_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_query_patterns
    ADD CONSTRAINT campaign_query_patterns_pkey PRIMARY KEY (id);


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
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: config_locks config_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_locks
    ADD CONSTRAINT config_locks_pkey PRIMARY KEY (id);


--
-- Name: config_versions config_versions_config_hash_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_config_hash_version_key UNIQUE (config_hash, version);


--
-- Name: config_versions config_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_pkey PRIMARY KEY (id);


--
-- Name: connection_leak_detection connection_leak_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_leak_detection
    ADD CONSTRAINT connection_leak_detection_pkey PRIMARY KEY (id);


--
-- Name: connection_pool_alerts connection_pool_alerts_alert_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_pool_alerts
    ADD CONSTRAINT connection_pool_alerts_alert_type_key UNIQUE (alert_type);


--
-- Name: connection_pool_alerts connection_pool_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_pool_alerts
    ADD CONSTRAINT connection_pool_alerts_pkey PRIMARY KEY (id);


--
-- Name: connection_pool_metrics connection_pool_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_pool_metrics
    ADD CONSTRAINT connection_pool_metrics_pkey PRIMARY KEY (id);


--
-- Name: database_performance_metrics database_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_performance_metrics
    ADD CONSTRAINT database_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: dns_validation_params dns_validation_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_params
    ADD CONSTRAINT dns_validation_params_pkey PRIMARY KEY (campaign_id);


--
-- Name: dns_validation_results dns_validation_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_pkey PRIMARY KEY (id);


--
-- Name: domain_generation_batches domain_generation_batches_campaign_id_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_batches
    ADD CONSTRAINT domain_generation_batches_campaign_id_batch_number_key UNIQUE (campaign_id, batch_number);


--
-- Name: domain_generation_batches domain_generation_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_batches
    ADD CONSTRAINT domain_generation_batches_pkey PRIMARY KEY (batch_id);


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
-- Name: domain_generation_params domain_generation_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_params
    ADD CONSTRAINT domain_generation_params_pkey PRIMARY KEY (id);


--
-- Name: enum_validation_failures enum_validation_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enum_validation_failures
    ADD CONSTRAINT enum_validation_failures_pkey PRIMARY KEY (id);


--
-- Name: generated_domains generated_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT generated_domains_pkey PRIMARY KEY (id);


--
-- Name: http_keyword_campaign_params http_keyword_campaign_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_campaign_params
    ADD CONSTRAINT http_keyword_campaign_params_pkey PRIMARY KEY (campaign_id);


--
-- Name: http_keyword_params http_keyword_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_params
    ADD CONSTRAINT http_keyword_params_pkey PRIMARY KEY (id);


--
-- Name: http_keyword_results http_keyword_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_pkey PRIMARY KEY (id);


--
-- Name: index_usage_analytics index_usage_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.index_usage_analytics
    ADD CONSTRAINT index_usage_analytics_pkey PRIMARY KEY (id);


--
-- Name: input_validation_rules input_validation_rules_endpoint_pattern_http_method_field_n_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_validation_rules
    ADD CONSTRAINT input_validation_rules_endpoint_pattern_http_method_field_n_key UNIQUE (endpoint_pattern, http_method, field_name);


--
-- Name: input_validation_rules input_validation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_validation_rules
    ADD CONSTRAINT input_validation_rules_pkey PRIMARY KEY (id);


--
-- Name: input_validation_violations input_validation_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_validation_violations
    ADD CONSTRAINT input_validation_violations_pkey PRIMARY KEY (id);


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
-- Name: memory_allocations memory_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_allocations
    ADD CONSTRAINT memory_allocations_pkey PRIMARY KEY (id);


--
-- Name: memory_leak_detection memory_leak_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_leak_detection
    ADD CONSTRAINT memory_leak_detection_pkey PRIMARY KEY (id);


--
-- Name: memory_metrics memory_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_metrics
    ADD CONSTRAINT memory_metrics_pkey PRIMARY KEY (id);


--
-- Name: memory_optimization_recommendations memory_optimization_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_optimization_recommendations
    ADD CONSTRAINT memory_optimization_recommendations_pkey PRIMARY KEY (id);


--
-- Name: memory_pools memory_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_pools
    ADD CONSTRAINT memory_pools_pkey PRIMARY KEY (id);


--
-- Name: memory_pools memory_pools_pool_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_pools
    ADD CONSTRAINT memory_pools_pool_name_key UNIQUE (pool_name);


--
-- Name: performance_baselines performance_baselines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_baselines
    ADD CONSTRAINT performance_baselines_pkey PRIMARY KEY (id);


--
-- Name: performance_baselines performance_baselines_service_name_campaign_type_optimizati_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_baselines
    ADD CONSTRAINT performance_baselines_service_name_campaign_type_optimizati_key UNIQUE (service_name, campaign_type, optimization_phase);


--
-- Name: performance_optimizations performance_optimizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_optimizations
    ADD CONSTRAINT performance_optimizations_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id);


--
-- Name: proxies proxies_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_address_key UNIQUE (address);


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
-- Name: query_optimization_recommendations query_optimization_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_optimization_recommendations
    ADD CONSTRAINT query_optimization_recommendations_pkey PRIMARY KEY (id);


--
-- Name: query_performance_metrics query_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_performance_metrics
    ADD CONSTRAINT query_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: resource_locks resource_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_locks
    ADD CONSTRAINT resource_locks_pkey PRIMARY KEY (lock_id);


--
-- Name: resource_optimization_actions resource_optimization_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_optimization_actions
    ADD CONSTRAINT resource_optimization_actions_pkey PRIMARY KEY (id);


--
-- Name: resource_utilization_metrics resource_utilization_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_utilization_metrics
    ADD CONSTRAINT resource_utilization_metrics_pkey PRIMARY KEY (id);


--
-- Name: response_optimization_recommendations response_optimization_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_optimization_recommendations
    ADD CONSTRAINT response_optimization_recommendations_pkey PRIMARY KEY (id);


--
-- Name: response_time_history response_time_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_time_history
    ADD CONSTRAINT response_time_history_pkey PRIMARY KEY (id);


--
-- Name: response_time_metrics response_time_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_time_metrics
    ADD CONSTRAINT response_time_metrics_pkey PRIMARY KEY (id);


--
-- Name: response_time_targets response_time_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_time_targets
    ADD CONSTRAINT response_time_targets_pkey PRIMARY KEY (id);


--
-- Name: response_time_targets response_time_targets_service_name_endpoint_pattern_campaig_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_time_targets
    ADD CONSTRAINT response_time_targets_service_name_endpoint_pattern_campaig_key UNIQUE (service_name, endpoint_pattern, campaign_type);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations_old schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations_old
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: schema_migrations schema_migrations_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey1 PRIMARY KEY (version);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: si004_connection_leak_detection si004_connection_leak_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_leak_detection
    ADD CONSTRAINT si004_connection_leak_detection_pkey PRIMARY KEY (id);


--
-- Name: si004_connection_pool_alerts si004_connection_pool_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_pool_alerts
    ADD CONSTRAINT si004_connection_pool_alerts_pkey PRIMARY KEY (id);


--
-- Name: si004_connection_pool_metrics si004_connection_pool_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_pool_metrics
    ADD CONSTRAINT si004_connection_pool_metrics_pkey PRIMARY KEY (id);


--
-- Name: slow_query_log slow_query_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slow_query_log
    ADD CONSTRAINT slow_query_log_pkey PRIMARY KEY (id);


--
-- Name: state_coordination_locks state_coordination_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_coordination_locks
    ADD CONSTRAINT state_coordination_locks_pkey PRIMARY KEY (lock_key);


--
-- Name: state_events state_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_events
    ADD CONSTRAINT state_events_pkey PRIMARY KEY (id);


--
-- Name: state_snapshots state_snapshots_entity_id_entity_type_snapshot_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_snapshots
    ADD CONSTRAINT state_snapshots_entity_id_entity_type_snapshot_version_key UNIQUE (entity_id, entity_type, snapshot_version);


--
-- Name: state_snapshots state_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_snapshots
    ADD CONSTRAINT state_snapshots_pkey PRIMARY KEY (id);


--
-- Name: suspicious_input_alerts suspicious_input_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_input_alerts
    ADD CONSTRAINT suspicious_input_alerts_pkey PRIMARY KEY (id);


--
-- Name: suspicious_input_patterns suspicious_input_patterns_pattern_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_input_patterns
    ADD CONSTRAINT suspicious_input_patterns_pattern_name_key UNIQUE (pattern_name);


--
-- Name: suspicious_input_patterns suspicious_input_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_input_patterns
    ADD CONSTRAINT suspicious_input_patterns_pkey PRIMARY KEY (id);


--
-- Name: system_alerts system_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_pkey PRIMARY KEY (id);


--
-- Name: resource_locks unique_exclusive_locks; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_locks
    ADD CONSTRAINT unique_exclusive_locks EXCLUDE USING btree (resource_type WITH =, resource_id WITH =) WHERE (((lock_mode)::text = 'exclusive'::text));


--
-- Name: index_usage_analytics unique_index_analytics; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.index_usage_analytics
    ADD CONSTRAINT unique_index_analytics UNIQUE (schema_name, table_name, index_name);


--
-- Name: campaign_state_snapshots uq_campaign_snapshots_sequence; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT uq_campaign_snapshots_sequence UNIQUE (campaign_id, last_event_sequence);


--
-- Name: campaign_state_events uq_campaign_state_events_sequence; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT uq_campaign_state_events_sequence UNIQUE (campaign_id, sequence_number);


--
-- Name: dns_validation_results uq_dns_results_campaign_domain; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT uq_dns_results_campaign_domain UNIQUE (dns_campaign_id, domain_name);


--
-- Name: generated_domains uq_generated_domains_campaign_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT uq_generated_domains_campaign_name UNIQUE (domain_generation_campaign_id, domain_name);


--
-- Name: http_keyword_results uq_http_results_campaign_domain; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT uq_http_results_campaign_domain UNIQUE (http_keyword_campaign_id, domain_name);


--
-- Name: personas uq_personas_name_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT uq_personas_name_type UNIQUE (name, persona_type);


--
-- Name: campaign_state_transitions uq_state_transitions_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT uq_state_transitions_event UNIQUE (state_event_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


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
-- Name: versioned_configs versioned_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versioned_configs
    ADD CONSTRAINT versioned_configs_pkey PRIMARY KEY (id);


--
-- Name: versioned_configs versioned_configs_type_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versioned_configs
    ADD CONSTRAINT versioned_configs_type_key_unique UNIQUE (config_type, config_key);


--
-- Name: worker_coordination worker_coordination_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_coordination
    ADD CONSTRAINT worker_coordination_pkey PRIMARY KEY (worker_id);


--
-- Name: worker_pool_metrics worker_pool_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_pool_metrics
    ADD CONSTRAINT worker_pool_metrics_pkey PRIMARY KEY (id);


--
-- Name: idx_auth_audit_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_audit_created_at ON auth.auth_audit_log USING btree (created_at);


--
-- Name: idx_auth_audit_event_type; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_audit_event_type ON auth.auth_audit_log USING btree (event_type);


--
-- Name: idx_auth_audit_risk_score; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_audit_risk_score ON auth.auth_audit_log USING btree (risk_score);


--
-- Name: idx_auth_audit_session_fingerprint; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_audit_session_fingerprint ON auth.auth_audit_log USING btree (session_fingerprint) WHERE (session_fingerprint IS NOT NULL);


--
-- Name: idx_auth_audit_user_id; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_audit_user_id ON auth.auth_audit_log USING btree (user_id);


--
-- Name: idx_password_reset_expires; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_password_reset_expires ON auth.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_user_id; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_password_reset_user_id ON auth.password_reset_tokens USING btree (user_id);


--
-- Name: idx_rate_limits_blocked_until; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_rate_limits_blocked_until ON auth.rate_limits USING btree (blocked_until);


--
-- Name: idx_rate_limits_identifier; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_rate_limits_identifier ON auth.rate_limits USING btree (identifier);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_role_permissions_permission_id ON auth.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON auth.role_permissions USING btree (role_id);


--
-- Name: idx_sessions_active; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_sessions_active ON auth.sessions USING btree (is_active, expires_at);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON auth.sessions USING btree (expires_at);


--
-- Name: idx_sessions_fingerprint; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_sessions_fingerprint ON auth.sessions USING btree (session_fingerprint) WHERE (session_fingerprint IS NOT NULL);


--
-- Name: idx_sessions_ip_address; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_sessions_ip_address ON auth.sessions USING btree (ip_address) WHERE (ip_address IS NOT NULL);


--
-- Name: idx_sessions_last_activity; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_sessions_last_activity ON auth.sessions USING btree (last_activity_at);


--
-- Name: idx_sessions_user_agent_hash; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_sessions_user_agent_hash ON auth.sessions USING btree (user_agent_hash) WHERE (user_agent_hash IS NOT NULL);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_sessions_user_id ON auth.sessions USING btree (user_id);


--
-- Name: idx_sessions_validation; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_sessions_validation ON auth.sessions USING btree (id, is_active, expires_at, user_id);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_roles_role_id ON auth.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON auth.user_roles USING btree (user_id);


--
-- Name: idx_access_violations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_violations_created ON public.api_access_violations USING btree (created_at);


--
-- Name: idx_access_violations_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_violations_endpoint ON public.api_access_violations USING btree (endpoint_pattern);


--
-- Name: idx_access_violations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_violations_type ON public.api_access_violations USING btree (violation_type);


--
-- Name: idx_access_violations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_violations_user ON public.api_access_violations USING btree (user_id);


--
-- Name: idx_api_endpoint_permissions_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_endpoint_permissions_method ON public.api_endpoint_permissions USING btree (http_method);


--
-- Name: idx_api_endpoint_permissions_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_endpoint_permissions_pattern ON public.api_endpoint_permissions USING btree (endpoint_pattern);


--
-- Name: idx_api_endpoint_permissions_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_endpoint_permissions_resource ON public.api_endpoint_permissions USING btree (resource_type);


--
-- Name: idx_async_task_status_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_async_task_status_task_id ON public.async_task_status USING btree (task_id);


--
-- Name: idx_async_task_status_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_async_task_status_type_status ON public.async_task_status USING btree (task_type, status);


--
-- Name: idx_async_task_status_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_async_task_status_user ON public.async_task_status USING btree (user_id, status);


--
-- Name: idx_audit_logs_access_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_access_decision ON public.audit_logs USING btree (access_decision);


--
-- Name: idx_audit_logs_authorization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_authorization ON public.audit_logs USING gin (authorization_context);


--
-- Name: idx_audit_logs_entity_action_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_action_timestamp ON public.audit_logs USING btree (entity_type, action, "timestamp" DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: idx_audit_logs_entity_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_timestamp ON public.audit_logs USING btree (entity_id, "timestamp" DESC) WHERE (entity_id IS NOT NULL);


--
-- Name: idx_audit_logs_entity_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_type_id ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_permissions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_permissions ON public.audit_logs USING gin (permission_checked);


--
-- Name: idx_audit_logs_security_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_security_level ON public.audit_logs USING btree (security_level);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_logs_user_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_timestamp ON public.audit_logs USING btree (user_id, "timestamp" DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_auth_decisions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_decisions_created ON public.authorization_decisions USING btree (created_at);


--
-- Name: idx_auth_decisions_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_decisions_decision ON public.authorization_decisions USING btree (decision);


--
-- Name: idx_auth_decisions_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_decisions_resource ON public.authorization_decisions USING btree (resource_type, resource_id);


--
-- Name: idx_auth_decisions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_decisions_user ON public.authorization_decisions USING btree (user_id);


--
-- Name: idx_cache_config_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_config_name ON public.cache_configurations USING btree (cache_name);


--
-- Name: idx_cache_config_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_config_status ON public.cache_configurations USING btree (cache_status);


--
-- Name: idx_cache_config_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_config_type ON public.cache_configurations USING btree (cache_type);


--
-- Name: idx_cache_entries_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_campaign ON public.cache_entries USING btree (campaign_type, campaign_id);


--
-- Name: idx_cache_entries_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_expires ON public.cache_entries USING btree (expires_at);


--
-- Name: idx_cache_entries_last_accessed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_last_accessed ON public.cache_entries USING btree (last_accessed);


--
-- Name: idx_cache_entries_namespace_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_namespace_key ON public.cache_entries USING btree (cache_namespace, cache_key);


--
-- Name: idx_cache_entries_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_service ON public.cache_entries USING btree (service_name);


--
-- Name: idx_cache_entries_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_entries_tags ON public.cache_entries USING gin (tags);


--
-- Name: idx_cache_inv_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_inv_at ON public.cache_invalidations USING btree (invalidated_at);


--
-- Name: idx_cache_inv_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_inv_name ON public.cache_invalidations USING btree (cache_name);


--
-- Name: idx_cache_inv_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_inv_type ON public.cache_invalidations USING btree (invalidation_type);


--
-- Name: idx_cache_invalidation_namespace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_namespace ON public.cache_invalidation_log USING btree (cache_namespace);


--
-- Name: idx_cache_invalidation_service_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_invalidation_service_time ON public.cache_invalidation_log USING btree (service_name, executed_at DESC);


--
-- Name: idx_cache_metrics_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_campaign ON public.cache_metrics USING btree (campaign_type);


--
-- Name: idx_cache_metrics_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_name ON public.cache_metrics USING btree (cache_namespace);


--
-- Name: idx_cache_metrics_namespace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_namespace ON public.cache_metrics USING btree (cache_namespace);


--
-- Name: idx_cache_metrics_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_operation ON public.cache_metrics USING btree (operation_type);


--
-- Name: idx_cache_metrics_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_recorded ON public.cache_metrics USING btree (recorded_at);


--
-- Name: idx_cache_metrics_service_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_service_time ON public.cache_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_cache_metrics_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_metrics_type ON public.cache_metrics USING btree (operation_type);


--
-- Name: idx_campaign_jobs_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_campaign_id ON public.campaign_jobs USING btree (campaign_id);


--
-- Name: idx_campaign_jobs_status_next_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_status_next_execution ON public.campaign_jobs USING btree (status, next_execution_at) WHERE (status = ANY (ARRAY['pending'::text, 'queued'::text, 'retry'::text]));


--
-- Name: idx_campaign_jobs_status_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_status_scheduled_at ON public.campaign_jobs USING btree (status, scheduled_at);


--
-- Name: idx_campaign_jobs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_type ON public.campaign_jobs USING btree (job_type);


--
-- Name: idx_campaign_state_events_campaign_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_campaign_sequence ON public.campaign_state_events USING btree (campaign_id, sequence_number);


--
-- Name: idx_campaign_state_events_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_correlation ON public.campaign_state_events USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_campaign_state_events_processing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_processing_status ON public.campaign_state_events USING btree (processing_status, occurred_at) WHERE (processing_status = ANY (ARRAY['pending'::text, 'failed'::text]));


--
-- Name: idx_campaign_state_events_type_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_type_campaign ON public.campaign_state_events USING btree (campaign_id, event_type, occurred_at DESC);


--
-- Name: idx_campaign_state_snapshots_campaign_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_campaign_sequence ON public.campaign_state_snapshots USING btree (campaign_id, last_event_sequence DESC);


--
-- Name: idx_campaign_state_snapshots_valid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_valid ON public.campaign_state_snapshots USING btree (campaign_id, created_at DESC) WHERE (is_valid = true);


--
-- Name: idx_campaign_state_transitions_campaign_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_campaign_time ON public.campaign_state_transitions USING btree (campaign_id, initiated_at DESC);


--
-- Name: idx_campaign_state_transitions_invalid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_invalid ON public.campaign_state_transitions USING btree (campaign_id, is_valid_transition, initiated_at DESC) WHERE (is_valid_transition = false);


--
-- Name: idx_campaigns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_created_at ON public.campaigns USING btree (created_at DESC);


--
-- Name: idx_campaigns_large_numeric_values; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_large_numeric_values ON public.campaigns USING btree (id) WHERE ((total_items > '9007199254740991'::bigint) OR (processed_items > '9007199254740991'::bigint) OR (successful_items > '9007199254740991'::bigint) OR (failed_items > '9007199254740991'::bigint));


--
-- Name: idx_campaigns_last_heartbeat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_last_heartbeat ON public.campaigns USING btree (last_heartbeat_at) WHERE (last_heartbeat_at IS NOT NULL);


--
-- Name: idx_campaigns_processed_items; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_processed_items ON public.campaigns USING btree (processed_items) WHERE (processed_items > 0);


--
-- Name: idx_campaigns_progress_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_progress_tracking ON public.campaigns USING btree (status, progress_percentage, updated_at) WHERE (progress_percentage IS NOT NULL);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_status ON public.campaigns USING btree (status);


--
-- Name: idx_campaigns_status_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_status_type_created ON public.campaigns USING btree (status, campaign_type, created_at);


--
-- Name: idx_campaigns_status_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_status_updated ON public.campaigns USING btree (status, updated_at DESC);


--
-- Name: idx_campaigns_total_items; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_total_items ON public.campaigns USING btree (total_items) WHERE (total_items > 0);


--
-- Name: idx_campaigns_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_type ON public.campaigns USING btree (campaign_type);


--
-- Name: idx_campaigns_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_user_active ON public.campaigns USING btree (user_id, status) WHERE ((status = ANY (ARRAY['running'::text, 'pending'::text, 'queued'::text])) AND (user_id IS NOT NULL));


--
-- Name: idx_campaigns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_user_id ON public.campaigns USING btree (user_id);


--
-- Name: idx_config_locks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_active ON public.config_locks USING btree (is_active);


--
-- Name: idx_config_locks_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_config_locks_active_unique ON public.config_locks USING btree (config_hash) WHERE (is_active = true);


--
-- Name: idx_config_locks_config_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_config_hash ON public.config_locks USING btree (config_hash);


--
-- Name: idx_config_locks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_expires ON public.config_locks USING btree (expires_at);


--
-- Name: idx_config_locks_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_owner ON public.config_locks USING btree (owner);


--
-- Name: idx_config_versions_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_hash ON public.config_versions USING btree (config_hash);


--
-- Name: idx_config_versions_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_version ON public.config_versions USING btree (config_hash, version);


--
-- Name: idx_connection_leak_acquired; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_leak_acquired ON public.connection_leak_detection USING btree (acquired_at);


--
-- Name: idx_connection_leak_connection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_leak_connection ON public.connection_leak_detection USING btree (connection_id);


--
-- Name: idx_connection_leak_leaked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_leak_leaked ON public.connection_leak_detection USING btree (is_leaked);


--
-- Name: idx_connection_pool_metrics_pool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_pool ON public.connection_pool_metrics USING btree (pool_name);


--
-- Name: idx_connection_pool_metrics_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_recorded ON public.connection_pool_metrics USING btree (recorded_at);


--
-- Name: idx_connection_pool_metrics_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_state ON public.connection_pool_metrics USING btree (pool_state);


--
-- Name: idx_coordination_locks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coordination_locks_expires ON public.state_coordination_locks USING btree (expires_at);


--
-- Name: idx_db_perf_metrics_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_perf_metrics_hash ON public.database_performance_metrics USING btree (query_hash);


--
-- Name: idx_db_perf_metrics_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_perf_metrics_recorded ON public.database_performance_metrics USING btree (recorded_at);


--
-- Name: idx_db_perf_metrics_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_perf_metrics_time ON public.database_performance_metrics USING btree (execution_time_ms);


--
-- Name: idx_db_perf_metrics_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_db_perf_metrics_type ON public.database_performance_metrics USING btree (query_type);


--
-- Name: idx_dns_results_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_results_campaign_id ON public.dns_validation_results USING btree (dns_campaign_id);


--
-- Name: idx_dns_results_domain_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_results_domain_name ON public.dns_validation_results USING btree (domain_name);


--
-- Name: idx_dns_results_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_results_status ON public.dns_validation_results USING btree (validation_status);


--
-- Name: idx_domain_batches_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_batches_campaign ON public.domain_generation_batches USING btree (campaign_id);


--
-- Name: idx_domain_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_batches_status ON public.domain_generation_batches USING btree (status);


--
-- Name: idx_domain_batches_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_batches_worker ON public.domain_generation_batches USING btree (assigned_worker_id);


--
-- Name: idx_domain_config_states_atomic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_config_states_atomic ON public.domain_generation_config_states USING btree (config_hash, version, last_offset);


--
-- Name: idx_domain_config_states_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_config_states_version ON public.domain_generation_config_states USING btree (config_hash, version);


--
-- Name: idx_domain_gen_offset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_gen_offset ON public.domain_generation_campaign_params USING btree (current_offset);


--
-- Name: idx_domain_gen_params_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_gen_params_campaign_id ON public.domain_generation_params USING btree (campaign_id);


--
-- Name: idx_generated_domains_campaign_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_created ON public.generated_domains USING btree (domain_generation_campaign_id, generated_at);


--
-- Name: idx_generated_domains_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_id ON public.generated_domains USING btree (domain_generation_campaign_id);


--
-- Name: idx_generated_domains_domain_name_tld; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_domain_name_tld ON public.generated_domains USING btree (domain_name, tld) WHERE (tld IS NOT NULL);


--
-- Name: idx_generated_domains_keyword_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_keyword_search ON public.generated_domains USING gin (to_tsvector('english'::regconfig, domain_name));


--
-- Name: idx_generated_domains_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_name ON public.generated_domains USING btree (domain_name);


--
-- Name: idx_generated_domains_offset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_offset ON public.generated_domains USING btree (domain_generation_campaign_id, offset_index);


--
-- Name: idx_generated_domains_offset_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_offset_index ON public.generated_domains USING btree (domain_generation_campaign_id, offset_index) WHERE (offset_index >= 0);


--
-- Name: idx_http_keyword_params_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_params_campaign_id ON public.http_keyword_params USING btree (campaign_id);


--
-- Name: idx_http_keyword_params_source_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_params_source_campaign_id ON public.http_keyword_params USING btree (source_campaign_id);


--
-- Name: idx_http_keyword_results_dns_result_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_dns_result_id ON public.http_keyword_results USING btree (dns_result_id);


--
-- Name: idx_http_results_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_results_campaign_id ON public.http_keyword_results USING btree (http_keyword_campaign_id);


--
-- Name: idx_http_results_domain_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_results_domain_name ON public.http_keyword_results USING btree (domain_name);


--
-- Name: idx_http_results_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_results_status ON public.http_keyword_results USING btree (validation_status);


--
-- Name: idx_index_usage_efficiency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_index_usage_efficiency ON public.index_usage_analytics USING btree (index_efficiency_pct);


--
-- Name: idx_index_usage_frequency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_index_usage_frequency ON public.index_usage_analytics USING btree (usage_frequency);


--
-- Name: idx_index_usage_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_index_usage_name ON public.index_usage_analytics USING btree (index_name);


--
-- Name: idx_index_usage_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_index_usage_table ON public.index_usage_analytics USING btree (schema_name, table_name);


--
-- Name: idx_keyword_rules_keyword_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_keyword_set ON public.keyword_rules USING btree (keyword_set_id);


--
-- Name: idx_keyword_rules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_type ON public.keyword_rules USING btree (rule_type);


--
-- Name: idx_memory_allocations_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_campaign ON public.memory_allocations USING btree (campaign_id);


--
-- Name: idx_memory_allocations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_created ON public.memory_allocations USING btree (created_at);


--
-- Name: idx_memory_allocations_leaked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_leaked ON public.memory_allocations USING btree (memory_leaked_bytes) WHERE (memory_leaked_bytes > 0);


--
-- Name: idx_memory_allocations_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_operation ON public.memory_allocations USING btree (operation_id);


--
-- Name: idx_memory_allocations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_type ON public.memory_allocations USING btree (operation_type);


--
-- Name: idx_memory_leak_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_detected ON public.memory_leak_detection USING btree (detected_at DESC);


--
-- Name: idx_memory_leak_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_resolved ON public.memory_leak_detection USING btree (resolved);


--
-- Name: idx_memory_leak_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_service ON public.memory_leak_detection USING btree (service_name);


--
-- Name: idx_memory_leak_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_severity ON public.memory_leak_detection USING btree (severity);


--
-- Name: idx_memory_leak_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_type ON public.memory_leak_detection USING btree (leak_type);


--
-- Name: idx_memory_metrics_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_component ON public.memory_metrics USING btree (component);


--
-- Name: idx_memory_metrics_efficiency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_efficiency ON public.memory_metrics USING btree (efficiency_score);


--
-- Name: idx_memory_metrics_memory_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_memory_type ON public.memory_metrics USING btree (memory_type);


--
-- Name: idx_memory_metrics_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_recorded ON public.memory_metrics USING btree (recorded_at);


--
-- Name: idx_memory_metrics_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_service ON public.memory_metrics USING btree (service_name);


--
-- Name: idx_memory_metrics_service_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_service_recorded ON public.memory_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_memory_metrics_service_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_service_time ON public.memory_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_memory_metrics_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_state ON public.memory_metrics USING btree (memory_state);


--
-- Name: idx_memory_metrics_utilization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_utilization ON public.memory_metrics USING btree (memory_utilization_pct);


--
-- Name: idx_memory_optimization_implemented; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_optimization_implemented ON public.memory_optimization_recommendations USING btree (implemented);


--
-- Name: idx_memory_optimization_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_optimization_priority ON public.memory_optimization_recommendations USING btree (implementation_priority);


--
-- Name: idx_memory_optimization_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_optimization_service ON public.memory_optimization_recommendations USING btree (service_name);


--
-- Name: idx_memory_pools_efficiency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_pools_efficiency ON public.memory_pools USING btree (efficiency_score);


--
-- Name: idx_memory_pools_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_pools_service ON public.memory_pools USING btree (service_name);


--
-- Name: idx_memory_pools_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_pools_type ON public.memory_pools USING btree (pool_type);


--
-- Name: idx_perf_opt_improvement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perf_opt_improvement ON public.performance_optimizations USING btree (improvement_pct);


--
-- Name: idx_perf_opt_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perf_opt_service ON public.performance_optimizations USING btree (target_service);


--
-- Name: idx_perf_opt_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perf_opt_type ON public.performance_optimizations USING btree (optimization_type);


--
-- Name: idx_personas_is_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_is_enabled ON public.personas USING btree (is_enabled);


--
-- Name: idx_personas_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_type ON public.personas USING btree (persona_type);


--
-- Name: idx_proxies_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_enabled ON public.proxies USING btree (is_enabled);


--
-- Name: idx_proxies_healthy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_healthy ON public.proxies USING btree (is_healthy);


--
-- Name: idx_proxies_is_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_is_enabled ON public.proxies USING btree (is_enabled);


--
-- Name: idx_proxy_pool_memberships_pool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_pool ON public.proxy_pool_memberships USING btree (pool_id);


--
-- Name: idx_proxy_pool_memberships_proxy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_proxy ON public.proxy_pool_memberships USING btree (proxy_id);


--
-- Name: idx_proxy_pools_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pools_enabled ON public.proxy_pools USING btree (is_enabled);


--
-- Name: idx_query_optimization_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_hash ON public.query_optimization_recommendations USING btree (query_hash);


--
-- Name: idx_query_optimization_implemented; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_implemented ON public.query_optimization_recommendations USING btree (implemented);


--
-- Name: idx_query_optimization_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_priority ON public.query_optimization_recommendations USING btree (implementation_priority);


--
-- Name: idx_query_optimization_query_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_query_hash ON public.query_optimization_recommendations USING btree (query_hash);


--
-- Name: idx_query_optimization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_status ON public.query_optimization_recommendations USING btree (status);


--
-- Name: idx_query_optimization_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_type ON public.query_optimization_recommendations USING btree (recommendation_type);


--
-- Name: idx_query_performance_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_campaign_id ON public.query_performance_metrics USING btree (campaign_id);


--
-- Name: idx_query_performance_executed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_executed ON public.query_performance_metrics USING btree (executed_at);


--
-- Name: idx_query_performance_execution_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_execution_time ON public.query_performance_metrics USING btree (execution_time_ms);


--
-- Name: idx_query_performance_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_hash ON public.query_performance_metrics USING btree (query_hash);


--
-- Name: idx_query_performance_optimization_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_optimization_score ON public.query_performance_metrics USING btree (optimization_score);


--
-- Name: idx_query_performance_performance_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_performance_category ON public.query_performance_metrics USING btree (performance_category);


--
-- Name: idx_query_performance_service_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_service_campaign ON public.query_performance_metrics USING btree (service_name, campaign_type);


--
-- Name: idx_query_performance_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_type ON public.query_performance_metrics USING btree (query_type);


--
-- Name: idx_resource_locks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_locks_expires ON public.resource_locks USING btree (expires_at);


--
-- Name: idx_resource_locks_holder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_locks_holder ON public.resource_locks USING btree (lock_holder);


--
-- Name: idx_resource_locks_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_locks_resource ON public.resource_locks USING btree (resource_type, resource_id);


--
-- Name: idx_resource_optimization_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_optimization_campaign ON public.resource_optimization_actions USING btree (campaign_type, campaign_id);


--
-- Name: idx_resource_optimization_service_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_optimization_service_time ON public.resource_optimization_actions USING btree (service_name, executed_at DESC);


--
-- Name: idx_resource_utilization_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_campaign ON public.resource_utilization_metrics USING btree (campaign_type, campaign_id);


--
-- Name: idx_resource_utilization_efficiency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_efficiency ON public.resource_utilization_metrics USING btree (efficiency_score);


--
-- Name: idx_resource_utilization_service_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_service_time ON public.resource_utilization_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_resource_utilization_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_utilization_type ON public.resource_utilization_metrics USING btree (resource_type);


--
-- Name: idx_response_metrics_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_metrics_campaign ON public.response_time_metrics USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_response_metrics_endpoint_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_metrics_endpoint_time ON public.response_time_metrics USING btree (endpoint_path, recorded_at);


--
-- Name: idx_response_metrics_slow_requests; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_metrics_slow_requests ON public.response_time_metrics USING btree (response_time_ms) WHERE (response_time_ms > (1000)::numeric);


--
-- Name: idx_response_metrics_user_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_metrics_user_endpoint ON public.response_time_metrics USING btree (user_id, endpoint_path);


--
-- Name: idx_response_optimization_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_optimization_endpoint ON public.response_optimization_recommendations USING btree (endpoint_path);


--
-- Name: idx_response_optimization_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_optimization_priority ON public.response_optimization_recommendations USING btree (priority, implemented);


--
-- Name: idx_response_time_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_campaign ON public.response_time_metrics USING btree (campaign_id);


--
-- Name: idx_response_time_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_endpoint ON public.response_time_metrics USING btree (endpoint_path);


--
-- Name: idx_response_time_history_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_history_campaign ON public.response_time_history USING btree (campaign_type);


--
-- Name: idx_response_time_history_service_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_history_service_window ON public.response_time_history USING btree (service_name, window_start DESC);


--
-- Name: idx_response_time_metrics_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_metrics_endpoint ON public.response_time_metrics USING btree (endpoint_path);


--
-- Name: idx_response_time_metrics_response_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_metrics_response_time ON public.response_time_metrics USING btree (response_time_ms);


--
-- Name: idx_response_time_ms; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_ms ON public.response_time_metrics USING btree (response_time_ms);


--
-- Name: idx_response_time_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_operation ON public.response_time_metrics USING btree (http_method);


--
-- Name: idx_response_time_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_recorded ON public.response_time_metrics USING btree (recorded_at);


--
-- Name: idx_response_time_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_service ON public.response_time_metrics USING btree (service_name);


--
-- Name: idx_response_time_targets_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_targets_campaign ON public.response_time_targets USING btree (campaign_type);


--
-- Name: idx_response_time_targets_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_time_targets_service ON public.response_time_targets USING btree (service_name);


--
-- Name: idx_security_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_created ON public.security_events USING btree (created_at);


--
-- Name: idx_security_events_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_result ON public.security_events USING btree (authorization_result);


--
-- Name: idx_security_events_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_risk ON public.security_events USING btree (risk_score DESC);


--
-- Name: idx_security_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_type ON public.security_events USING btree (event_type);


--
-- Name: idx_security_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_user ON public.security_events USING btree (user_id);


--
-- Name: idx_slow_query_execution_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slow_query_execution_time ON public.slow_query_log USING btree (execution_time_ms);


--
-- Name: idx_slow_query_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slow_query_hash ON public.slow_query_log USING btree (query_hash);


--
-- Name: idx_slow_query_logged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slow_query_logged ON public.slow_query_log USING btree (logged_at);


--
-- Name: idx_slow_query_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slow_query_severity ON public.slow_query_log USING btree (severity);


--
-- Name: idx_state_events_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_events_correlation ON public.state_events USING btree (correlation_id);


--
-- Name: idx_state_events_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_events_version ON public.state_events USING btree (entity_id, state_version);


--
-- Name: idx_state_snapshots_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_snapshots_entity ON public.state_snapshots USING btree (entity_id, entity_type);


--
-- Name: idx_state_snapshots_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_snapshots_version ON public.state_snapshots USING btree (entity_id, snapshot_version DESC);


--
-- Name: idx_suspicious_alerts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_created_at ON public.suspicious_input_alerts USING btree (created_at);


--
-- Name: idx_suspicious_alerts_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_endpoint ON public.suspicious_input_alerts USING btree (endpoint_pattern);


--
-- Name: idx_suspicious_alerts_pattern_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_pattern_name ON public.suspicious_input_alerts USING btree (pattern_name);


--
-- Name: idx_suspicious_alerts_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_severity ON public.suspicious_input_alerts USING btree (severity);


--
-- Name: idx_suspicious_alerts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_user_id ON public.suspicious_input_alerts USING btree (user_id);


--
-- Name: idx_system_alerts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_created ON public.system_alerts USING btree (created_at);


--
-- Name: idx_system_alerts_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_severity ON public.system_alerts USING btree (severity);


--
-- Name: idx_system_alerts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_type ON public.system_alerts USING btree (alert_type);


--
-- Name: idx_validation_rules_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_rules_endpoint ON public.input_validation_rules USING btree (endpoint_pattern);


--
-- Name: idx_validation_rules_field; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_rules_field ON public.input_validation_rules USING btree (field_name);


--
-- Name: idx_validation_rules_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_rules_method ON public.input_validation_rules USING btree (http_method);


--
-- Name: idx_validation_violations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_created ON public.input_validation_violations USING btree (created_at);


--
-- Name: idx_validation_violations_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_endpoint ON public.input_validation_violations USING btree (endpoint_pattern);


--
-- Name: idx_validation_violations_field; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_field ON public.input_validation_violations USING btree (field_name);


--
-- Name: idx_validation_violations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_type ON public.input_validation_violations USING btree (violation_type);


--
-- Name: idx_validation_violations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_user ON public.input_validation_violations USING btree (user_id);


--
-- Name: idx_versioned_configs_checksum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_checksum ON public.versioned_configs USING btree (checksum);


--
-- Name: idx_versioned_configs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_created_at ON public.versioned_configs USING btree (created_at);


--
-- Name: idx_versioned_configs_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_type_key ON public.versioned_configs USING btree (config_type, config_key);


--
-- Name: idx_versioned_configs_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_updated_at ON public.versioned_configs USING btree (updated_at);


--
-- Name: idx_versioned_configs_validation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_validation ON public.versioned_configs USING btree (config_type, config_key, version, checksum);


--
-- Name: idx_versioned_configs_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_version ON public.versioned_configs USING btree (version);


--
-- Name: idx_worker_coordination_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_coordination_campaign ON public.worker_coordination USING btree (campaign_id);


--
-- Name: idx_worker_coordination_heartbeat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_coordination_heartbeat ON public.worker_coordination USING btree (last_heartbeat);


--
-- Name: idx_worker_coordination_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_coordination_status ON public.worker_coordination USING btree (status);


--
-- Name: idx_worker_pool_metrics_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_pool_metrics_campaign ON public.worker_pool_metrics USING btree (campaign_type);


--
-- Name: idx_worker_pool_metrics_pool_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_pool_metrics_pool_time ON public.worker_pool_metrics USING btree (pool_name, recorded_at DESC);


--
-- Name: idx_worker_pool_metrics_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_pool_metrics_service ON public.worker_pool_metrics USING btree (service_name);


--
-- Name: roles set_timestamp_auth_roles; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER set_timestamp_auth_roles BEFORE UPDATE ON auth.roles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: users set_timestamp_auth_users; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER set_timestamp_auth_users BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: sessions trigger_session_fingerprint; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER trigger_session_fingerprint BEFORE INSERT OR UPDATE ON auth.sessions FOR EACH ROW EXECUTE FUNCTION auth.update_session_fingerprint();


--
-- Name: keyword_rules keyword_rules_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER keyword_rules_updated_at_trigger BEFORE UPDATE ON public.keyword_rules FOR EACH ROW EXECUTE FUNCTION public.update_keyword_rules_updated_at();


--
-- Name: proxies proxies_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER proxies_updated_at_trigger BEFORE UPDATE ON public.proxies FOR EACH ROW EXECUTE FUNCTION public.update_proxies_updated_at();


--
-- Name: proxy_pools proxy_pools_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER proxy_pools_updated_at_trigger BEFORE UPDATE ON public.proxy_pools FOR EACH ROW EXECUTE FUNCTION public.update_proxy_pools_updated_at();


--
-- Name: campaign_jobs set_timestamp_campaign_jobs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_campaign_jobs BEFORE UPDATE ON public.campaign_jobs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: campaigns set_timestamp_campaigns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_campaigns BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: keyword_sets set_timestamp_keyword_sets; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_keyword_sets BEFORE UPDATE ON public.keyword_sets FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: personas set_timestamp_personas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_personas BEFORE UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: proxies set_timestamp_proxies; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_proxies BEFORE UPDATE ON public.proxies FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: campaigns trg_campaigns_numeric_safety; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_campaigns_numeric_safety BEFORE INSERT OR UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.fn_validate_numeric_safety();


--
-- Name: campaign_state_transitions trigger_update_state_event_processing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_state_event_processing AFTER UPDATE ON public.campaign_state_transitions FOR EACH ROW EXECUTE FUNCTION public.update_state_event_processing_status();


--
-- Name: auth_audit_log auth_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.auth_audit_log
    ADD CONSTRAINT auth_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES auth.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: authorization_decisions authorization_decisions_security_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_security_event_id_fkey FOREIGN KEY (security_event_id) REFERENCES public.security_events(id);


--
-- Name: campaign_access_grants campaign_access_grants_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_access_grants campaign_access_grants_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: campaign_access_grants campaign_access_grants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: campaign_jobs campaign_jobs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_jobs
    ADD CONSTRAINT campaign_jobs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_events campaign_state_events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT campaign_state_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_snapshots campaign_state_snapshots_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT campaign_state_snapshots_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_transitions campaign_state_transitions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_transitions campaign_state_transitions_state_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_state_event_id_fkey FOREIGN KEY (state_event_id) REFERENCES public.campaign_state_events(id) ON DELETE CASCADE;


--
-- Name: dns_validation_params dns_validation_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_params
    ADD CONSTRAINT dns_validation_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: dns_validation_params dns_validation_params_source_generation_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_params
    ADD CONSTRAINT dns_validation_params_source_generation_campaign_id_fkey FOREIGN KEY (source_generation_campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: dns_validation_results dns_validation_results_dns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_dns_campaign_id_fkey FOREIGN KEY (dns_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: dns_validation_results dns_validation_results_generated_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_generated_domain_id_fkey FOREIGN KEY (generated_domain_id) REFERENCES public.generated_domains(id) ON DELETE SET NULL;


--
-- Name: dns_validation_results dns_validation_results_validated_by_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_validated_by_persona_id_fkey FOREIGN KEY (validated_by_persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;


--
-- Name: domain_generation_batches domain_generation_batches_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_batches
    ADD CONSTRAINT domain_generation_batches_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: domain_generation_campaign_params domain_generation_campaign_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_campaign_params
    ADD CONSTRAINT domain_generation_campaign_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: domain_generation_params domain_generation_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_params
    ADD CONSTRAINT domain_generation_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: generated_domains generated_domains_domain_generation_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT generated_domains_domain_generation_campaign_id_fkey FOREIGN KEY (domain_generation_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_campaign_params http_keyword_campaign_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_campaign_params
    ADD CONSTRAINT http_keyword_campaign_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_campaign_params http_keyword_campaign_params_source_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_campaign_params
    ADD CONSTRAINT http_keyword_campaign_params_source_campaign_id_fkey FOREIGN KEY (source_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_params http_keyword_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_params
    ADD CONSTRAINT http_keyword_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_params http_keyword_params_source_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_params
    ADD CONSTRAINT http_keyword_params_source_campaign_id_fkey FOREIGN KEY (source_campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_dns_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_dns_result_id_fkey FOREIGN KEY (dns_result_id) REFERENCES public.dns_validation_results(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_http_keyword_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_http_keyword_campaign_id_fkey FOREIGN KEY (http_keyword_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_results http_keyword_results_used_proxy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_used_proxy_id_fkey FOREIGN KEY (used_proxy_id) REFERENCES public.proxies(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_validated_by_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_validated_by_persona_id_fkey FOREIGN KEY (validated_by_persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;


--
-- Name: keyword_rules keyword_rules_keyword_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_rules
    ADD CONSTRAINT keyword_rules_keyword_set_id_fkey FOREIGN KEY (keyword_set_id) REFERENCES public.keyword_sets(id) ON DELETE CASCADE;


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
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: security_events security_events_audit_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_audit_log_id_fkey FOREIGN KEY (audit_log_id) REFERENCES public.audit_logs(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: worker_coordination worker_coordination_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_coordination
    ADD CONSTRAINT worker_coordination_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- PostgreSQL database dump complete
--

