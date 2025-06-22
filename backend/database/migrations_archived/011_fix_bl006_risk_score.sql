BEGIN;

-- Update the log_authorization_decision function to accept and use input risk score
CREATE OR REPLACE FUNCTION log_authorization_decision(
    p_user_id UUID,
    p_resource_type VARCHAR(100),
    p_resource_id VARCHAR(255),
    p_action VARCHAR(100),
    p_decision VARCHAR(20),
    p_policies TEXT[] DEFAULT '{}',
    p_context JSONB DEFAULT '{}',
    p_request_context JSONB DEFAULT '{}',
    p_risk_score INTEGER DEFAULT 0
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

COMMIT;