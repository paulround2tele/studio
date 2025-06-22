BEGIN;

-- Enhanced audit logs with authorization context
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS authorization_context JSONB DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS security_level VARCHAR(50) DEFAULT 'standard';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS access_decision VARCHAR(50) DEFAULT 'unknown';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS permission_checked TEXT[];
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_sensitivity VARCHAR(50) DEFAULT 'normal';

-- Create indexes for security queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_authorization ON audit_logs USING gin(authorization_context);
CREATE INDEX IF NOT EXISTS idx_audit_logs_security_level ON audit_logs(security_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_access_decision ON audit_logs(access_decision);
CREATE INDEX IF NOT EXISTS idx_audit_logs_permissions ON audit_logs USING gin(permission_checked);

-- Security events table for detailed authorization tracking
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID,
    session_id VARCHAR(255),
    campaign_id UUID,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action_attempted VARCHAR(100) NOT NULL,
    authorization_result VARCHAR(50) NOT NULL,
    permissions_required TEXT[] DEFAULT '{}',
    permissions_granted TEXT[] DEFAULT '{}',
    denial_reason TEXT,
    risk_score INTEGER DEFAULT 0,
    source_ip INET,
    user_agent TEXT,
    request_context JSONB DEFAULT '{}',
    audit_log_id UUID REFERENCES audit_logs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_result ON security_events(authorization_result);
CREATE INDEX idx_security_events_risk ON security_events(risk_score DESC);
CREATE INDEX idx_security_events_created ON security_events(created_at);

-- Authorization decision tracking
CREATE TABLE IF NOT EXISTS authorization_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('allow', 'deny', 'conditional')),
    policy_version VARCHAR(50),
    evaluated_policies TEXT[] DEFAULT '{}',
    conditions_met JSONB DEFAULT '{}',
    decision_time_ms INTEGER DEFAULT 0,
    context JSONB DEFAULT '{}',
    security_event_id UUID REFERENCES security_events(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_decisions_user ON authorization_decisions(user_id);
CREATE INDEX idx_auth_decisions_resource ON authorization_decisions(resource_type, resource_id);
CREATE INDEX idx_auth_decisions_decision ON authorization_decisions(decision);
CREATE INDEX idx_auth_decisions_created ON authorization_decisions(created_at);

-- Function to log authorization decision with context
CREATE OR REPLACE FUNCTION log_authorization_decision(
    p_user_id UUID,
    p_resource_type VARCHAR(100),
    p_resource_id VARCHAR(255),
    p_action VARCHAR(100),
    p_decision VARCHAR(20),
    p_policies TEXT[] DEFAULT '{}',
    p_context JSONB DEFAULT '{}',
    p_request_context JSONB DEFAULT '{}'
) RETURNS UUID AS $$
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
    
    -- Create audit log entry
    INSERT INTO audit_logs 
        (user_id, action, resource_type, resource_id, authorization_context, 
         access_decision, permission_checked, security_level)
    VALUES 
        (p_user_id, p_action, p_resource_type, p_resource_id, p_context,
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
$$ LANGUAGE plpgsql;

COMMIT;