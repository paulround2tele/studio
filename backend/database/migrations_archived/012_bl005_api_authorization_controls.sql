BEGIN;

-- BL-005: API endpoint permissions mapping
CREATE TABLE IF NOT EXISTS api_endpoint_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_pattern VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    required_permissions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    resource_type VARCHAR(100),
    minimum_role VARCHAR(50) DEFAULT 'user',
    requires_ownership BOOLEAN DEFAULT false,
    requires_campaign_access BOOLEAN DEFAULT false,
    bypass_conditions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint_pattern, http_method)
);

CREATE INDEX IF NOT EXISTS idx_api_endpoint_permissions_pattern ON api_endpoint_permissions(endpoint_pattern);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_permissions_method ON api_endpoint_permissions(http_method);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_permissions_resource ON api_endpoint_permissions(resource_type);

-- Insert comprehensive API endpoint permissions
INSERT INTO api_endpoint_permissions 
    (endpoint_pattern, http_method, required_permissions, resource_type, minimum_role, requires_ownership, requires_campaign_access) 
VALUES
    -- Campaign endpoints
    ('/api/campaigns', 'GET', ARRAY['campaign:list'], 'campaign', 'user', false, false),
    ('/api/campaigns', 'POST', ARRAY['campaign:create'], 'campaign', 'user', false, false),
    ('/api/campaigns/:id', 'GET', ARRAY['campaign:read'], 'campaign', 'user', false, true),
    ('/api/campaigns/:id', 'PUT', ARRAY['campaign:update'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id', 'DELETE', ARRAY['campaign:delete'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id/start', 'POST', ARRAY['campaign:execute'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id/stop', 'POST', ARRAY['campaign:execute'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id/pause', 'POST', ARRAY['campaign:execute'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id/resume', 'POST', ARRAY['campaign:execute'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id/cancel', 'POST', ARRAY['campaign:execute'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id/status', 'GET', ARRAY['campaign:read'], 'campaign', 'user', false, true),
    ('/api/campaigns/:id/results', 'GET', ARRAY['campaign:read'], 'campaign', 'user', false, true),
    
    -- Persona endpoints
    ('/api/personas', 'GET', ARRAY['persona:list'], 'persona', 'user', false, false),
    ('/api/personas', 'POST', ARRAY['persona:create'], 'persona', 'user', false, false),
    ('/api/personas/:id', 'GET', ARRAY['persona:read'], 'persona', 'user', false, false),
    ('/api/personas/:id', 'PUT', ARRAY['persona:update'], 'persona', 'user', true, false),
    ('/api/personas/:id', 'DELETE', ARRAY['persona:delete'], 'persona', 'user', true, false),
    
    -- Admin endpoints
    ('/api/admin/users', 'GET', ARRAY['admin:user_management'], 'user', 'admin', false, false),
    ('/api/admin/users', 'POST', ARRAY['admin:user_management'], 'user', 'admin', false, false),
    ('/api/admin/users/:id', 'GET', ARRAY['admin:user_management'], 'user', 'admin', false, false),
    ('/api/admin/users/:id', 'PUT', ARRAY['admin:user_management'], 'user', 'admin', false, false),
    ('/api/admin/users/:id', 'DELETE', ARRAY['admin:user_management'], 'user', 'admin', false, false),
    ('/api/admin/system/stats', 'GET', ARRAY['admin:system_access'], 'system', 'admin', false, false),
    
    -- Proxy endpoints
    ('/api/proxies', 'GET', ARRAY['proxy:list'], 'proxy', 'user', false, false),
    ('/api/proxies', 'POST', ARRAY['proxy:create'], 'proxy', 'user', false, false),
    ('/api/proxies/:id', 'GET', ARRAY['proxy:read'], 'proxy', 'user', false, false),
    ('/api/proxies/:id', 'PUT', ARRAY['proxy:update'], 'proxy', 'user', true, false),
    ('/api/proxies/:id', 'DELETE', ARRAY['proxy:delete'], 'proxy', 'user', true, false),
    
    -- Keyword endpoints
    ('/api/keywords', 'GET', ARRAY['keyword:list'], 'keyword', 'user', false, false),
    ('/api/keywords', 'POST', ARRAY['keyword:create'], 'keyword', 'user', false, false),
    ('/api/keywords/:id', 'GET', ARRAY['keyword:read'], 'keyword', 'user', false, false),
    ('/api/keywords/:id', 'PUT', ARRAY['keyword:update'], 'keyword', 'user', true, false),
    ('/api/keywords/:id', 'DELETE', ARRAY['keyword:delete'], 'keyword', 'user', true, false),
    
    -- Health and ping endpoints (minimal permissions)
    ('/api/health', 'GET', ARRAY[]::TEXT[], 'system', 'user', false, false),
    ('/api/ping', 'GET', ARRAY[]::TEXT[], 'system', 'user', false, false)
ON CONFLICT (endpoint_pattern, http_method) DO NOTHING;

-- API access violations tracking
CREATE TABLE IF NOT EXISTS api_access_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id VARCHAR(255),
    endpoint_pattern VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    required_permissions TEXT[] DEFAULT '{}'::TEXT[],
    user_permissions TEXT[] DEFAULT '{}'::TEXT[],
    resource_id VARCHAR(255),
    violation_details JSONB DEFAULT '{}',
    source_ip INET,
    user_agent TEXT,
    request_headers JSONB DEFAULT '{}',
    response_status INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_violations_user ON api_access_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_access_violations_endpoint ON api_access_violations(endpoint_pattern);
CREATE INDEX IF NOT EXISTS idx_access_violations_type ON api_access_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_access_violations_created ON api_access_violations(created_at);

-- Function to check endpoint authorization
CREATE OR REPLACE FUNCTION check_endpoint_authorization(
    p_endpoint_pattern VARCHAR(255),
    p_http_method VARCHAR(10),
    p_user_permissions TEXT[],
    p_user_role VARCHAR(50),
    p_is_resource_owner BOOLEAN DEFAULT false,
    p_has_campaign_access BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;

COMMIT;