-- Audit and Logging Schema
-- Based on Go models: AuditLog

-- Audit logs table for comprehensive system tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    client_ip INET,
    user_agent TEXT,
    
    -- Additional tracking fields for comprehensive auditing
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE SET NULL,
    request_id UUID, -- For request correlation
    service_name VARCHAR(50), -- Service that generated the audit log
    endpoint VARCHAR(255), -- API endpoint accessed
    http_method VARCHAR(10), -- HTTP method used
    response_status INTEGER, -- HTTP response status
    execution_time_ms INTEGER CHECK (execution_time_ms >= 0), -- Request execution time
    
    -- Security and compliance fields
    data_classification VARCHAR(20), -- 'public', 'internal', 'confidential', 'restricted'
    compliance_tags TEXT[], -- Array of compliance tags like 'GDPR', 'SOX', 'HIPAA'
    retention_policy VARCHAR(50), -- Data retention policy identifier
    
    -- Context and metadata
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    campaign_phase phase_type_enum, -- Track which phase generated this audit event
    
    CONSTRAINT valid_audit_response_status CHECK (
        response_status IS NULL OR (response_status BETWEEN 100 AND 599)
    )
);

-- Indexes for audit logs - optimized for querying and compliance reporting
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type) WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_ip ON audit_logs(client_ip) WHERE client_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_service_name ON audit_logs(service_name) WHERE service_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint ON audit_logs(endpoint) WHERE endpoint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_http_method ON audit_logs(http_method) WHERE http_method IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_response_status ON audit_logs(response_status) WHERE response_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_campaign_id ON audit_logs(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_campaign_phase ON audit_logs(campaign_phase) WHERE campaign_phase IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_data_classification ON audit_logs(data_classification) WHERE data_classification IS NOT NULL;

-- Composite indexes for common audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_timestamp ON audit_logs(entity_type, entity_id, timestamp DESC) WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_campaign_timestamp ON audit_logs(campaign_id, timestamp DESC) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_service_timestamp ON audit_logs(service_name, timestamp DESC) WHERE service_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_timestamp ON audit_logs(client_ip, timestamp DESC) WHERE client_ip IS NOT NULL;

-- Indexes for security and compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_security_events ON audit_logs(action, client_ip, timestamp)
WHERE action IN ('login_failed', 'account_locked', 'permission_denied', 'suspicious_activity');

CREATE INDEX IF NOT EXISTS idx_audit_logs_error_responses ON audit_logs(response_status, timestamp)
WHERE response_status >= 400;

CREATE INDEX IF NOT EXISTS idx_audit_logs_long_requests ON audit_logs(execution_time_ms, timestamp)
WHERE execution_time_ms > 5000; -- Requests taking more than 5 seconds

-- Indexes for data retention and cleanup
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention_policy ON audit_logs(retention_policy, timestamp)
WHERE retention_policy IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_old_records ON audit_logs(timestamp); -- For cleanup of very old records

-- GIN indexes for JSONB and array columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin ON audit_logs USING GIN(details) WHERE details IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance_tags_gin ON audit_logs USING GIN(compliance_tags) WHERE compliance_tags IS NOT NULL;

-- Partial indexes for performance monitoring
CREATE INDEX IF NOT EXISTS idx_audit_logs_slow_endpoints ON audit_logs(endpoint, execution_time_ms, timestamp)
WHERE execution_time_ms > 1000 AND endpoint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_failed_requests ON audit_logs(endpoint, response_status, timestamp)
WHERE response_status >= 400 AND endpoint IS NOT NULL;

-- Time-based partitioning preparation indexes (using timestamp directly for performance)
CREATE INDEX IF NOT EXISTS idx_audit_logs_daily ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_monthly ON audit_logs(timestamp);

-- Index for audit trail reconstruction
CREATE INDEX IF NOT EXISTS idx_audit_logs_trail_reconstruction ON audit_logs(entity_type, entity_id, timestamp ASC)
WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

-- Unique index for request correlation (if needed)
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_correlation ON audit_logs(request_id, timestamp)
WHERE request_id IS NOT NULL;

-- Add check constraints for data quality
ALTER TABLE audit_logs 
ADD CONSTRAINT chk_audit_logs_valid_http_method 
CHECK (
    http_method IS NULL OR 
    http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')
);

ALTER TABLE audit_logs 
ADD CONSTRAINT chk_audit_logs_valid_data_classification 
CHECK (
    data_classification IS NULL OR 
    data_classification IN ('public', 'internal', 'confidential', 'restricted')
);

ALTER TABLE audit_logs 
ADD CONSTRAINT chk_audit_logs_execution_time_reasonable 
CHECK (
    execution_time_ms IS NULL OR 
    execution_time_ms <= 300000 -- Max 5 minutes execution time
);

-- Create a function for automatic audit log cleanup based on retention policy
CREATE OR REPLACE FUNCTION cleanup_audit_logs_by_retention() RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;