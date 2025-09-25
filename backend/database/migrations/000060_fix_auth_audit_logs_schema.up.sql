-- Migration 000060: Fix auth_audit_logs schema to align with trigger expectations
-- Adds missing columns referenced by trigger_user_session_management in 000016
-- Safe to run multiple times (guards) and idempotent for CI rebuilds.

DO $$
BEGIN
    -- Add action_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'auth_audit_logs' AND column_name = 'action_type'
    ) THEN
        ALTER TABLE auth_audit_logs
            ADD COLUMN action_type VARCHAR(50);
    END IF;

    -- Add additional_data column if missing (triggers reference it; table currently has 'details' and 'security_flags')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'auth_audit_logs' AND column_name = 'additional_data'
    ) THEN
        ALTER TABLE auth_audit_logs
            ADD COLUMN additional_data JSONB;
    END IF;
END $$;

-- Create indexes if they do not already exist
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_action_type ON auth_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_ip_address ON auth_audit_logs(ip_address);

-- Backfill: For existing rows copy details into additional_data if additional_data is NULL
UPDATE auth_audit_logs
SET additional_data = details
WHERE additional_data IS NULL AND details IS NOT NULL;

COMMENT ON COLUMN auth_audit_logs.action_type IS 'High level action label used by triggers (e.g., session_created, session_deactivated)';
COMMENT ON COLUMN auth_audit_logs.additional_data IS 'Structured JSON payload inserted by triggers; mirrors older details field temporarily';

-- NOTE: Future refactor: unify event_type + action_type + details/additional_data into consistent naming.

-- Replace session management trigger function to populate NOT NULL event_type/event_status
CREATE OR REPLACE FUNCTION trigger_user_session_management() RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
