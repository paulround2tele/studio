BEGIN;

-- Connection pool metrics and monitoring
CREATE TABLE IF NOT EXISTS connection_pool_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    active_connections INTEGER NOT NULL,
    idle_connections INTEGER NOT NULL,
    max_connections INTEGER NOT NULL,
    total_connections INTEGER NOT NULL,
    connections_in_use INTEGER NOT NULL,
    wait_count INTEGER DEFAULT 0,
    wait_duration_ms INTEGER DEFAULT 0,
    connection_errors INTEGER DEFAULT 0,
    pool_state VARCHAR(50) DEFAULT 'healthy',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connection_pool_metrics_pool ON connection_pool_metrics(pool_name);
CREATE INDEX idx_connection_pool_metrics_recorded ON connection_pool_metrics(recorded_at);
CREATE INDEX idx_connection_pool_metrics_state ON connection_pool_metrics(pool_state);

-- Connection leak detection tracking
CREATE TABLE IF NOT EXISTS connection_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id VARCHAR(255) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL,
    acquired_by VARCHAR(255) NOT NULL,
    operation_context JSONB DEFAULT '{}',
    stack_trace TEXT,
    is_leaked BOOLEAN DEFAULT false,
    leak_detected_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    duration_held_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connection_leak_connection ON connection_leak_detection(connection_id);
CREATE INDEX idx_connection_leak_acquired ON connection_leak_detection(acquired_at);
CREATE INDEX idx_connection_leak_leaked ON connection_leak_detection(is_leaked);

-- Connection pool alerts configuration
CREATE TABLE IF NOT EXISTS connection_pool_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    threshold_value INTEGER NOT NULL,
    alert_enabled BOOLEAN DEFAULT true,
    alert_message TEXT NOT NULL,
    severity_level VARCHAR(20) DEFAULT 'warning',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alert_type)
);

-- Insert default alert configurations
INSERT INTO connection_pool_alerts (alert_type, threshold_value, alert_message, severity_level) VALUES
    ('high_utilization', 80, 'Connection pool utilization above 80%', 'warning'),
    ('critical_utilization', 95, 'Connection pool utilization above 95%', 'critical'),
    ('connection_wait', 1000, 'Connection wait time exceeding 1 second', 'warning'),
    ('connection_errors', 10, 'More than 10 connection errors per minute', 'error'),
    ('leaked_connections', 5, 'Detected connection leaks', 'error');

-- Function to record connection pool metrics
CREATE OR REPLACE FUNCTION record_connection_pool_metrics(
    p_pool_name VARCHAR(100),
    p_active_connections INTEGER,
    p_idle_connections INTEGER,
    p_max_connections INTEGER,
    p_wait_count INTEGER DEFAULT 0,
    p_wait_duration_ms INTEGER DEFAULT 0,
    p_connection_errors INTEGER DEFAULT 0
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to check connection pool alerts
CREATE OR REPLACE FUNCTION check_connection_pool_alerts(
    p_pool_name VARCHAR(100),
    p_utilization_pct INTEGER,
    p_wait_duration_ms INTEGER,
    p_connection_errors INTEGER
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Create system_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_created ON system_alerts(created_at);

COMMIT;