-- Fix BL-007 missing tables and components
BEGIN;

-- Create suspicious input patterns table if it doesn't exist
CREATE TABLE IF NOT EXISTS suspicious_input_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(100) NOT NULL,
    pattern TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'security',
    severity VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    detection_action VARCHAR(50) DEFAULT 'log',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pattern_name)
);

-- Create suspicious input alerts table if it doesn't exist
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

-- Create indexes for suspicious_input_alerts
CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_user ON suspicious_input_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_pattern ON suspicious_input_alerts(pattern_name);
CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_created ON suspicious_input_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_suspicious_alerts_severity ON suspicious_input_alerts(severity);

-- Insert suspicious patterns if table is empty
INSERT INTO suspicious_input_patterns (pattern_name, pattern, category, severity, description, detection_action, is_enabled) 
SELECT * FROM (VALUES
    ('sql_injection', '(\''|(union\s+select)|(drop\s+table)|(insert\s+into)|(delete\s+from)|(update\s+set))', 'security', 'high', 'Potential SQL injection attempt', 'block', true),
    ('xss_script', '(<script[^>]*>|<\/script>|javascript:|on\w+\s*=)', 'security', 'high', 'Potential XSS attack', 'block', true),
    ('path_traversal', '(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)', 'security', 'medium', 'Path traversal attempt', 'log', true),
    ('command_injection', '(;|\||&|`|\$\(|\${)', 'security', 'high', 'Potential command injection', 'block', true),
    ('null_byte', '(%00|\\x00|\\0)', 'security', 'medium', 'Null byte injection', 'log', true),
    ('excessive_length', '.{10000,}', 'validation', 'low', 'Unusually long input', 'log', true),
    ('html_injection', '(<[^>]*>|&lt;[^&]*&gt;)', 'security', 'medium', 'HTML injection attempt', 'log', true),
    ('ldap_injection', '(\*|\(|\)|\\|\||&)', 'security', 'medium', 'LDAP injection attempt', 'log', true)
) AS v(pattern_name, pattern, category, severity, description, detection_action, is_enabled)
WHERE NOT EXISTS (SELECT 1 FROM suspicious_input_patterns WHERE suspicious_input_patterns.pattern_name = v.pattern_name);

-- Add missing validation rules if they don't exist
INSERT INTO input_validation_rules 
    (endpoint_pattern, http_method, field_name, validation_type, validation_config, error_message, is_required) 
SELECT * FROM (VALUES
    ('/api/campaigns', 'POST', 'domainGenerationParams', 'json_schema', '{"schema": "domain_generation_params"}', 'Invalid domain generation parameters', false),
    ('/api/campaigns', 'POST', 'dnsValidationParams', 'json_schema', '{"schema": "dns_validation_params"}', 'Invalid DNS validation parameters', false),
    ('/api/campaigns', 'POST', 'httpKeywordParams', 'json_schema', '{"schema": "http_keyword_params"}', 'Invalid HTTP keyword parameters', false),
    ('/api/admin/roles', 'POST', 'name', 'string_length', '{"min_length": 3, "max_length": 50}', 'Role name must be between 3 and 50 characters', true),
    ('/api/admin/roles', 'PUT', 'name', 'string_length', '{"min_length": 3, "max_length": 50}', 'Role name must be between 3 and 50 characters', false),
    ('/api/admin/users', 'POST', 'email', 'string_length', '{"min_length": 5, "max_length": 255}', 'Email must be between 5 and 255 characters', true),
    ('/api/admin/users', 'POST', 'username', 'string_length', '{"min_length": 3, "max_length": 50}', 'Username must be between 3 and 50 characters', true),
    ('/api/admin/users', 'POST', 'role', 'enum', '{"allowed_values": ["user", "admin"]}', 'Role must be user or admin', false)
) AS v(endpoint_pattern, http_method, field_name, validation_type, validation_config, error_message, is_required)
WHERE NOT EXISTS (
    SELECT 1 FROM input_validation_rules 
    WHERE input_validation_rules.endpoint_pattern = v.endpoint_pattern 
    AND input_validation_rules.http_method = v.http_method 
    AND input_validation_rules.field_name = v.field_name
);

-- Create or replace the validation function
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
            WHERE detection_action IN ('block', 'log') AND is_enabled = true
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
                
                -- Log to suspicious_input_alerts table
                INSERT INTO suspicious_input_alerts 
                    (user_id, session_id, endpoint_pattern, http_method, field_name, 
                     pattern_name, provided_value, pattern_matched, category, severity)
                VALUES 
                    (p_user_id, p_session_id, p_endpoint_pattern, p_http_method, p_field_name,
                     suspicious_pattern.pattern_name, p_field_value, suspicious_pattern.pattern,
                     suspicious_pattern.category, suspicious_pattern.severity);
                
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