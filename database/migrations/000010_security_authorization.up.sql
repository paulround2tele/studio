-- Security and Authorization Schema
-- Based on Go models: SecurityEvent, AuthorizationDecision, CampaignAccessGrant

-- Create security event types enum
CREATE TYPE security_event_type_enum AS ENUM (
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

-- Create authorization decision types enum
CREATE TYPE authorization_decision_enum AS ENUM (
    'allow',
    'deny',
    'conditional_allow'
);

-- Create authorization resource types enum
CREATE TYPE authorization_resource_type_enum AS ENUM (
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

-- Create access grant types enum
CREATE TYPE access_grant_type_enum AS ENUM (
    'read',
    'write',
    'delete',
    'admin',
    'owner',
    'viewer',
    'collaborator',
    'manager'
);

-- Security events table for comprehensive security monitoring
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type security_event_type_enum NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE SET NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity VARCHAR(10) NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    description TEXT NOT NULL,
    additional_data JSONB,
    
    -- Geographic and network context
    country_code CHAR(2),
    city VARCHAR(100),
    organization VARCHAR(200),
    
    -- Risk assessment fields
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    threat_detected BOOLEAN NOT NULL DEFAULT FALSE,
    automated_response_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    response_actions JSONB,
    
    -- Campaign and resource context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    resource_type authorization_resource_type_enum,
    resource_id UUID,
    
    -- Investigation and resolution
    investigated BOOLEAN NOT NULL DEFAULT FALSE,
    investigation_notes TEXT,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Compliance and audit
    compliance_relevant BOOLEAN NOT NULL DEFAULT FALSE,
    retention_period_days INTEGER DEFAULT 2555 CHECK (retention_period_days > 0), -- 7 years default
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Alert and notification
    alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
    alert_recipients TEXT[],
    
    CONSTRAINT valid_security_event_resolution CHECK (
        (resolved = FALSE) OR (resolved = TRUE AND resolved_at IS NOT NULL)
    )
);

-- Authorization decisions table for access control auditing
CREATE TABLE IF NOT EXISTS authorization_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE SET NULL,
    resource_type authorization_resource_type_enum NOT NULL,
    resource_id UUID,
    action VARCHAR(50) NOT NULL,
    decision authorization_decision_enum NOT NULL,
    decision_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Decision context
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    
    -- Authorization logic
    policy_evaluated TEXT NOT NULL, -- Which policy was evaluated
    conditions_met JSONB, -- Conditions that were checked
    permissions_checked TEXT[], -- List of permissions that were verified
    
    -- Decision details
    reason TEXT, -- Why the decision was made
    additional_context JSONB,
    
    -- Performance tracking
    evaluation_time_ms INTEGER CHECK (evaluation_time_ms >= 0),
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    campaign_phase phase_type_enum,
    
    -- Risk and compliance
    risk_factors JSONB,
    compliance_tags TEXT[],
    
    -- Follow-up actions
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_notes TEXT,
    reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Campaign access grants table for granular campaign permissions
CREATE TABLE IF NOT EXISTS campaign_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_type access_grant_type_enum NOT NULL,
    granted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Access scope and limitations
    phase_restrictions phase_type_enum[], -- Restrict access to specific phases
    read_only BOOLEAN NOT NULL DEFAULT FALSE,
    can_modify_settings BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_access BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Conditional access
    ip_restrictions INET[], -- IP addresses/ranges allowed
    time_restrictions JSONB, -- Time-based access rules
    conditions JSONB, -- Additional access conditions
    
    -- Status and lifecycle
    active BOOLEAN NOT NULL DEFAULT TRUE,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    
    -- Audit and compliance
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER NOT NULL DEFAULT 0,
    access_pattern JSONB, -- Track usage patterns
    
    -- Inheritance and delegation
    inherited_from UUID REFERENCES campaign_access_grants(id) ON DELETE SET NULL,
    can_delegate BOOLEAN NOT NULL DEFAULT FALSE,
    delegation_level INTEGER NOT NULL DEFAULT 0 CHECK (delegation_level >= 0),
    
    -- Unique constraint to prevent duplicate grants
    UNIQUE(campaign_id, user_id, access_type),
    
    CONSTRAINT valid_campaign_access_grant_expiry CHECK (
        expires_at IS NULL OR expires_at > granted_at
    ),
    CONSTRAINT valid_campaign_access_grant_revocation CHECK (
        (revoked = FALSE) OR (revoked = TRUE AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
    ),
    CONSTRAINT valid_campaign_access_grant_delegation_level CHECK (
        delegation_level <= 5 -- Prevent excessive delegation chains
    )
);

-- Indexes for security events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_user_id ON security_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_session_id ON security_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_event_timestamp ON security_events(event_timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_threat_detected ON security_events(threat_detected) WHERE threat_detected = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_campaign_id ON security_events(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_resource_type ON security_events(resource_type) WHERE resource_type IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_investigated ON security_events(investigated) WHERE investigated = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_resolved ON security_events(resolved) WHERE resolved = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_compliance_relevant ON security_events(compliance_relevant) WHERE compliance_relevant = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_archived ON security_events(archived) WHERE archived = FALSE;

-- Composite indexes for security analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_user_type_time ON security_events(user_id, event_type, event_timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_ip_type_time ON security_events(ip_address, event_type, event_timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_severity_time ON security_events(severity, event_timestamp DESC) WHERE severity IN ('critical', 'high');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_threat_time ON security_events(threat_detected, event_timestamp DESC) WHERE threat_detected = TRUE;

-- GIN indexes for JSONB columns in security events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_additional_data_gin ON security_events USING GIN(additional_data) WHERE additional_data IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_response_actions_gin ON security_events USING GIN(response_actions) WHERE response_actions IS NOT NULL;

-- Indexes for authorization decisions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_user_id ON authorization_decisions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_session_id ON authorization_decisions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_resource_type ON authorization_decisions(resource_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_resource_id ON authorization_decisions(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_decision ON authorization_decisions(decision);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_decision_timestamp ON authorization_decisions(decision_timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_campaign_id ON authorization_decisions(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_cache_hit ON authorization_decisions(cache_hit);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_follow_up_required ON authorization_decisions(follow_up_required) WHERE follow_up_required = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_reviewed ON authorization_decisions(reviewed) WHERE reviewed = FALSE;

-- Composite indexes for authorization analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_user_resource ON authorization_decisions(user_id, resource_type, decision_timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_denied_access ON authorization_decisions(decision, decision_timestamp DESC) WHERE decision = 'deny';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_resource_decision ON authorization_decisions(resource_type, resource_id, decision, decision_timestamp DESC) WHERE resource_id IS NOT NULL;

-- GIN indexes for JSONB columns in authorization decisions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_conditions_met_gin ON authorization_decisions USING GIN(conditions_met) WHERE conditions_met IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_additional_context_gin ON authorization_decisions USING GIN(additional_context) WHERE additional_context IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_risk_factors_gin ON authorization_decisions USING GIN(risk_factors) WHERE risk_factors IS NOT NULL;

-- GIN indexes for array columns in authorization decisions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_permissions_checked_gin ON authorization_decisions USING GIN(permissions_checked) WHERE permissions_checked IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorization_decisions_compliance_tags_gin ON authorization_decisions USING GIN(compliance_tags) WHERE compliance_tags IS NOT NULL;

-- Indexes for campaign access grants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_campaign_id ON campaign_access_grants(campaign_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_user_id ON campaign_access_grants(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_access_type ON campaign_access_grants(access_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_granted_by ON campaign_access_grants(granted_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_granted_at ON campaign_access_grants(granted_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_expires_at ON campaign_access_grants(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_active ON campaign_access_grants(active) WHERE active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_revoked ON campaign_access_grants(revoked) WHERE revoked = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_last_used_at ON campaign_access_grants(last_used_at) WHERE last_used_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_inherited_from ON campaign_access_grants(inherited_from) WHERE inherited_from IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_can_delegate ON campaign_access_grants(can_delegate) WHERE can_delegate = TRUE;

-- Composite indexes for campaign access management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_user_campaign ON campaign_access_grants(user_id, campaign_id, active) WHERE active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_campaign_type ON campaign_access_grants(campaign_id, access_type, active) WHERE active = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_expiring_soon ON campaign_access_grants(expires_at, active) WHERE expires_at IS NOT NULL AND active = TRUE;

-- GIN indexes for array and JSONB columns in campaign access grants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_phase_restrictions_gin ON campaign_access_grants USING GIN(phase_restrictions) WHERE phase_restrictions IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_ip_restrictions_gin ON campaign_access_grants USING GIN(ip_restrictions) WHERE ip_restrictions IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_time_restrictions_gin ON campaign_access_grants USING GIN(time_restrictions) WHERE time_restrictions IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_conditions_gin ON campaign_access_grants USING GIN(conditions) WHERE conditions IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_access_grants_access_pattern_gin ON campaign_access_grants USING GIN(access_pattern) WHERE access_pattern IS NOT NULL;