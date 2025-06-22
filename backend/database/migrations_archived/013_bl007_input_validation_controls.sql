BEGIN;

-- Input validation rules configuration
CREATE TABLE IF NOT EXISTS input_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_pattern VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    validation_type VARCHAR(50) NOT NULL,
    validation_config JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint_pattern, http_method, field_name)
);

CREATE INDEX idx_validation_rules_endpoint ON input_validation_rules(endpoint_pattern);
CREATE INDEX idx_validation_rules_method ON input_validation_rules(http_method);
CREATE INDEX idx_validation_rules_field ON input_validation_rules(field_name);

-- Insert comprehensive validation rules
INSERT INTO input_validation_rules 
    (endpoint_pattern, http_method, field_name, validation_type, validation_config, error_message, is_required) 
VALUES
    -- Campaign validation rules
    ('/api/campaigns', 'POST', 'name', 'string_length', '{"min_length": 3, "max_length": 100}', 'Campaign name must be between 3 and 100 characters', true),
    ('/api/campaigns', 'POST', 'campaignType', 'enum', '{"allowed_values": ["domain_generation", "dns_validation", "http_keyword_validation"]}', 'Invalid campaign type', true),
    ('/api/campaigns', 'POST', 'description', 'string_length', '{"min_length": 0, "max_length": 1000}', 'Description cannot exceed 1000 characters', false),
    
    -- Campaign update validation
    ('/api/campaigns/:id', 'PUT', 'name', 'string_length', '{"min_length": 3, "max_length": 100}', 'Campaign name must be between 3 and 100 characters', false),
    ('/api/campaigns/:id', 'PUT', 'status', 'enum', '{"allowed_values": ["pending", "queued", "running", "pausing", "paused", "completed", "failed", "archived", "cancelled"]}', 'Invalid campaign status', false),
    
    -- Domain generation validation
    ('/api/campaigns', 'POST', 'numDomainsToGenerate', 'integer_range', '{"min": 1, "max": 100000}', 'Domains to generate must be between 1 and 100,000', false),
    ('/api/campaigns', 'POST', 'variableLength', 'integer_range', '{"min": 1, "max": 20}', 'Variable length must be between 1 and 20', false),
    ('/api/campaigns', 'POST', 'characterSet', 'string_length', '{"min_length": 1, "max_length": 100}', 'Character set must be between 1 and 100 characters', false),
    ('/api/campaigns', 'POST', 'constantString', 'string_length', '{"min_length": 1, "max_length": 50}', 'Constant string must be between 1 and 50 characters', false),
    ('/api/campaigns', 'POST', 'tld', 'string_length', '{"min_length": 2, "max_length": 10}', 'TLD must be between 2 and 10 characters', false),
    
    -- Persona validation rules
    ('/api/personas', 'POST', 'name', 'string_length', '{"min_length": 3, "max_length": 50}', 'Persona name must be between 3 and 50 characters', true),
    ('/api/personas', 'POST', 'personaType', 'enum', '{"allowed_values": ["dns", "http"]}', 'Persona type must be dns or http', true),
    ('/api/personas', 'POST', 'configDetails', 'json_schema', '{"schema": "persona_config"}', 'Invalid persona configuration', true),
    
    -- Admin endpoints validation
    ('/api/admin/users/:id', 'PUT', 'role', 'enum', '{"allowed_values": ["user", "admin"]}', 'Role must be user or admin', false),
    ('/api/admin/users/:id', 'PUT', 'isActive', 'boolean', '{}', 'isActive must be boolean', false),
    
    -- Proxy validation
    ('/api/proxies', 'POST', 'host', 'string_length', '{"min_length": 1, "max_length": 255}', 'Proxy host must be between 1 and 255 characters', true),
    ('/api/proxies', 'POST', 'port', 'integer_range', '{"min": 1, "max": 65535}', 'Proxy port must be between 1 and 65535', true),
    
    -- Keywords validation
    ('/api/keywords', 'POST', 'name', 'string_length', '{"min_length": 1, "max_length": 100}', 'Keyword name must be between 1 and 100 characters', true),
    ('/api/keywords', 'POST', 'keywords', 'array_validation', '{"min_items": 1, "max_items": 1000, "item_type": "string"}', 'Keywords must be array of 1-1000 strings', true),
    
    -- Additional campaign parameter validations
    ('/api/campaigns', 'POST', 'domainGenerationParams', 'json_schema', '{"schema": "domain_generation_params"}', 'Invalid domain generation parameters', false),
    ('/api/campaigns', 'POST', 'dnsValidationParams', 'json_schema', '{"schema": "dns_validation_params"}', 'Invalid DNS validation parameters', false),
    ('/api/campaigns', 'POST', 'httpKeywordParams', 'json_schema', '{"schema": "http_keyword_params"}', 'Invalid HTTP keyword parameters', false),
    
    -- Admin roles endpoint
    ('/api/admin/roles', 'POST', 'name', 'string_length', '{"min_length": 3, "max_length": 50}', 'Role name must be between 3 and 50 characters', true),
    ('/api/admin/roles', 'PUT', 'name', 'string_length', '{"min_length": 3, "max_length": 50}', 'Role name must be between 3 and 50 characters', false),
    
    -- Admin users endpoint
    ('/api/admin/users', 'POST', 'email', 'string_length', '{"min_length": 5, "max_length": 255}', 'Email must be between 5 and 255 characters', true),
    ('/api/admin/users', 'POST', 'username', 'string_length', '{"min_length": 3, "max_length": 50}', 'Username must be between 3 and 50 characters', true),
    ('/api/admin/users', 'POST', 'role', 'enum', '{"allowed_values": ["user", "admin"]}', 'Role must be user or admin', false);

-- Input validation violations tracking
CREATE TABLE IF NOT EXISTS input_validation_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id VARCHAR(255),
    endpoint_pattern VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    provided_value TEXT,
    expected_format TEXT,
    validation_rule JSONB,
    error_message TEXT,
    source_ip INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validation_violations_user ON input_validation_violations(user_id);
CREATE INDEX idx_validation_violations_endpoint ON input_validation_violations(endpoint_pattern);
CREATE INDEX idx_validation_violations_field ON input_validation_violations(field_name);
CREATE INDEX idx_validation_violations_type ON input_validation_violations(violation_type);
CREATE INDEX idx_validation_violations_created ON input_validation_violations(created_at);

-- Suspicious input alerts tracking
CREATE TABLE IF NOT EXISTS suspicious_input_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id VARCHAR(255),
    endpoint_pattern VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    pattern_name VARCHAR(100) NOT NULL,
    provided_value TEXT,
    pattern_matched TEXT,
    category VARCHAR(50),
    severity VARCHAR(20),
    source_ip INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suspicious_alerts_user ON suspicious_input_alerts(user_id);
CREATE INDEX idx_suspicious_alerts_pattern ON suspicious_input_alerts(pattern_name);
CREATE INDEX idx_suspicious_alerts_created ON suspicious_input_alerts(created_at);
CREATE INDEX idx_suspicious_alerts_severity ON suspicious_input_alerts(severity);

-- Suspicious input patterns detection
CREATE TABLE IF NOT EXISTS suspicious_input_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(100) NOT NULL,
    pattern TEXT NOT NULL, -- Renamed from pattern_regex to match code
    category VARCHAR(50) NOT NULL DEFAULT 'security', -- Added category column
    severity VARCHAR(20) DEFAULT 'medium', -- Renamed from risk_level to match code
    description TEXT,
    detection_action VARCHAR(50) DEFAULT 'log',
    is_enabled BOOLEAN DEFAULT true, -- Added is_enabled column
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pattern_name)
);

-- Insert common suspicious patterns
INSERT INTO suspicious_input_patterns (pattern_name, pattern, category, severity, description, detection_action, is_enabled) VALUES
    ('sql_injection', '(\''|(union\s+select)|(drop\s+table)|(insert\s+into)|(delete\s+from)|(update\s+set))', 'security', 'high', 'Potential SQL injection attempt', 'block', true),
    ('xss_script', '(<script[^>]*>|<\/script>|javascript:|on\w+\s*=)', 'security', 'high', 'Potential XSS attack', 'block', true),
    ('path_traversal', '(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)', 'security', 'medium', 'Path traversal attempt', 'log', true),
    ('command_injection', '(;|\||&|`|\$\(|\${)', 'security', 'high', 'Potential command injection', 'block', true),
    ('null_byte', '(%00|\\x00|\\0)', 'security', 'medium', 'Null byte injection', 'log', true),
    ('excessive_length', '.{10000,}', 'validation', 'low', 'Unusually long input', 'log', true),
    ('html_injection', '(<[^>]*>|&lt;[^&]*&gt;)', 'security', 'medium', 'HTML injection attempt', 'log', true),
    ('ldap_injection', '(\*|\(|\)|\\|\||&)', 'security', 'medium', 'LDAP injection attempt', 'log', true);

-- Function to validate input against rules
CREATE OR REPLACE FUNCTION validate_input_field(
    p_endpoint_pattern VARCHAR(255),
    p_http_method VARCHAR(10),
    p_field_name VARCHAR(100),
    p_field_value TEXT,
    p_user_id UUID DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    validation_rule RECORD;
    config JSONB;
    validation_result JSONB;
    violation_id UUID;
    suspicious_pattern RECORD;
    pattern_matches BOOLEAN;
    array_value JSONB;
    array_length INTEGER;
    array_item TEXT;
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
            WHERE detection_action IN ('block', 'log')
        LOOP
            SELECT p_field_value ~ suspicious_pattern.pattern INTO pattern_matches;
            IF pattern_matches THEN
                -- Log suspicious pattern
                INSERT INTO input_validation_violations 
                    (user_id, session_id, endpoint_pattern, http_method, field_name, 
                     violation_type, provided_value, validation_rule, error_message)
                VALUES 
                    (p_user_id, p_session_id, p_endpoint_pattern, p_http_method, p_field_name,
                     'suspicious_pattern', p_field_value, 
                     jsonb_build_object('pattern', suspicious_pattern.pattern_name, 'severity', suspicious_pattern.severity),
                     suspicious_pattern.description);
                
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
            
        WHEN 'integer_range' THEN
            BEGIN
                IF p_field_value::integer < (config->>'min')::integer OR 
                   p_field_value::integer > (config->>'max')::integer THEN
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
            
        WHEN 'boolean' THEN
            BEGIN
                -- Try to parse as boolean
                IF p_field_value::boolean IS NOT NULL THEN
                    validation_result := jsonb_build_object('valid', true);
                END IF;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'invalid_boolean',
                        'error_message', 'Value must be true or false'
                    );
            END;
            
        WHEN 'array_validation' THEN
            BEGIN
                array_value := p_field_value::jsonb;
                array_length := jsonb_array_length(array_value);
                
                IF array_length < (config->>'min_items')::integer OR 
                   array_length > (config->>'max_items')::integer THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'array_length',
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
                        'error_type', 'invalid_array',
                        'error_message', 'Value must be a valid JSON array'
                    );
            END;
            
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
            validation_result := jsonb_build_object(
                'valid', true,
                'message', 'validation_type_not_implemented'
            );
    END CASE;
    
    -- Check for suspicious patterns even if basic validation passes
    IF (validation_result->>'valid')::boolean THEN
        FOR suspicious_pattern IN 
            SELECT * FROM suspicious_input_patterns 
            WHERE detection_action IN ('block', 'log')
        LOOP
            SELECT p_field_value ~ suspicious_pattern.pattern INTO pattern_matches;
            IF pattern_matches THEN
                -- Log suspicious pattern
                INSERT INTO input_validation_violations 
                    (user_id, session_id, endpoint_pattern, http_method, field_name, 
                     violation_type, provided_value, validation_rule, error_message)
                VALUES 
                    (p_user_id, p_session_id, p_endpoint_pattern, p_http_method, p_field_name,
                     'suspicious_pattern', p_field_value, 
                     jsonb_build_object('pattern', suspicious_pattern.pattern_name, 'severity', suspicious_pattern.severity),
                     suspicious_pattern.description);
                
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
    END IF;
    
    -- Log validation violation if invalid
    IF NOT (validation_result->>'valid')::boolean THEN
        INSERT INTO input_validation_violations 
            (user_id, session_id, endpoint_pattern, http_method, field_name, 
             violation_type, provided_value, expected_format, validation_rule, error_message)
        VALUES 
            (p_user_id, p_session_id, p_endpoint_pattern, p_http_method, p_field_name,
             validation_result->>'error_type', p_field_value, config::text, 
             row_to_json(validation_rule)::jsonb, validation_result->>'error_message');
    END IF;
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

COMMIT;