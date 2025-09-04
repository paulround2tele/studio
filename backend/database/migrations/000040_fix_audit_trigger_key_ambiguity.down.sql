-- Down migration: restore original trigger_audit_log function with unqualified key (reintroduces ambiguity)
-- This intentionally mirrors prior definition from 000016_database_triggers.up.sql

CREATE OR REPLACE FUNCTION trigger_audit_log() RETURNS TRIGGER AS $$
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
                SELECT jsonb_object_agg(key, jsonb_build_object('old', OLD_json.value, 'new', NEW_json.value))
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
