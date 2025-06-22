BEGIN;

-- Memory usage metrics tracking
CREATE TABLE IF NOT EXISTS memory_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    process_id VARCHAR(50) NOT NULL,
    heap_size_bytes BIGINT NOT NULL,
    heap_used_bytes BIGINT NOT NULL,
    heap_free_bytes BIGINT NOT NULL,
    gc_count BIGINT DEFAULT 0,
    gc_duration_ms BIGINT DEFAULT 0,
    goroutines_count INTEGER DEFAULT 0,
    stack_size_bytes BIGINT DEFAULT 0,
    memory_utilization_pct DECIMAL(5,2) DEFAULT 0,
    memory_state VARCHAR(50) DEFAULT 'normal',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_metrics_service ON memory_metrics(service_name);
CREATE INDEX idx_memory_metrics_recorded ON memory_metrics(recorded_at);
CREATE INDEX idx_memory_metrics_state ON memory_metrics(memory_state);
CREATE INDEX idx_memory_metrics_utilization ON memory_metrics(memory_utilization_pct);

-- Memory allocation tracking for operations
CREATE TABLE IF NOT EXISTS memory_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id VARCHAR(255) NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    campaign_id UUID,
    allocated_bytes BIGINT NOT NULL,
    peak_bytes BIGINT NOT NULL,
    duration_ms INTEGER NOT NULL,
    allocation_pattern JSONB DEFAULT '{}',
    cleanup_successful BOOLEAN DEFAULT true,
    memory_leaked_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_allocations_operation ON memory_allocations(operation_id);
CREATE INDEX idx_memory_allocations_type ON memory_allocations(operation_type);
CREATE INDEX idx_memory_allocations_campaign ON memory_allocations(campaign_id);
CREATE INDEX idx_memory_allocations_created ON memory_allocations(created_at);

-- Memory leak detection
CREATE TABLE IF NOT EXISTS memory_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    leak_type VARCHAR(50) NOT NULL,
    leak_source VARCHAR(255) NOT NULL,
    leaked_bytes BIGINT NOT NULL,
    detection_method VARCHAR(100) NOT NULL,
    stack_trace TEXT,
    operation_context JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'medium',
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_leak_service ON memory_leak_detection(service_name);
CREATE INDEX idx_memory_leak_type ON memory_leak_detection(leak_type);
CREATE INDEX idx_memory_leak_severity ON memory_leak_detection(severity);
CREATE INDEX idx_memory_leak_resolved ON memory_leak_detection(resolved);

-- Memory optimization recommendations
CREATE TABLE IF NOT EXISTS memory_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_type VARCHAR(100) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    current_usage_bytes BIGINT NOT NULL,
    recommended_limit_bytes BIGINT NOT NULL,
    optimization_strategy JSONB NOT NULL,
    estimated_savings_bytes BIGINT DEFAULT 0,
    implementation_priority VARCHAR(20) DEFAULT 'medium',
    implemented BOOLEAN DEFAULT false,
    implemented_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_optimization_service ON memory_optimization_recommendations(service_name);
CREATE INDEX idx_memory_optimization_priority ON memory_optimization_recommendations(implementation_priority);
CREATE INDEX idx_memory_optimization_implemented ON memory_optimization_recommendations(implemented);

-- Function to record memory metrics with analysis
CREATE OR REPLACE FUNCTION record_memory_metrics(
    p_service_name VARCHAR(100),
    p_process_id VARCHAR(50),
    p_heap_size_bytes BIGINT,
    p_heap_used_bytes BIGINT,
    p_gc_count BIGINT DEFAULT 0,
    p_gc_duration_ms BIGINT DEFAULT 0,
    p_goroutines_count INTEGER DEFAULT 0,
    p_stack_size_bytes BIGINT DEFAULT 0
) RETURNS UUID AS $$
DECLARE
    metric_id UUID;
    heap_free_bytes BIGINT;
    utilization_pct DECIMAL(5,2);
    memory_state VARCHAR(50);
BEGIN
    -- Calculate derived metrics
    heap_free_bytes := p_heap_size_bytes - p_heap_used_bytes;
    utilization_pct := (p_heap_used_bytes::DECIMAL / p_heap_size_bytes::DECIMAL) * 100;
    
    -- Determine memory state
    IF utilization_pct >= 90 THEN
        memory_state := 'critical';
    ELSIF utilization_pct >= 75 THEN
        memory_state := 'warning';
    ELSIF utilization_pct >= 60 THEN
        memory_state := 'elevated';
    ELSE
        memory_state := 'normal';
    END IF;
    
    -- Insert memory metrics
    INSERT INTO memory_metrics 
        (service_name, process_id, heap_size_bytes, heap_used_bytes, heap_free_bytes,
         gc_count, gc_duration_ms, goroutines_count, stack_size_bytes,
         memory_utilization_pct, memory_state)
    VALUES 
        (p_service_name, p_process_id, p_heap_size_bytes, p_heap_used_bytes, heap_free_bytes,
         p_gc_count, p_gc_duration_ms, p_goroutines_count, p_stack_size_bytes,
         utilization_pct, memory_state)
    RETURNING id INTO metric_id;
    
    -- Check for memory optimization opportunities
    PERFORM check_memory_optimization_opportunities(p_service_name, utilization_pct, p_heap_used_bytes);
    
    -- Trigger alerts for critical memory states
    IF memory_state IN ('critical', 'warning') THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'memory_utilization',
            CASE WHEN memory_state = 'critical' THEN 'critical' ELSE 'warning' END,
            format('Memory utilization %s%% for service %s', utilization_pct, p_service_name),
            jsonb_build_object(
                'service_name', p_service_name,
                'utilization_pct', utilization_pct,
                'heap_used_bytes', p_heap_used_bytes,
                'memory_state', memory_state
            ),
            NOW()
        );
    END IF;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check memory optimization opportunities
CREATE OR REPLACE FUNCTION check_memory_optimization_opportunities(
    p_service_name VARCHAR(100),
    p_utilization_pct DECIMAL(5,2),
    p_heap_used_bytes BIGINT
) RETURNS VOID AS $$
DECLARE
    avg_utilization DECIMAL(5,2);
    recommendation_exists BOOLEAN;
BEGIN
    -- Calculate average utilization over last hour
    SELECT AVG(memory_utilization_pct) INTO avg_utilization
    FROM memory_metrics
    WHERE service_name = p_service_name
      AND recorded_at > NOW() - INTERVAL '1 hour';
    
    -- Check if recommendation already exists
    SELECT EXISTS(
        SELECT 1 FROM memory_optimization_recommendations
        WHERE service_name = p_service_name
          AND implemented = false
          AND created_at > NOW() - INTERVAL '1 day'
    ) INTO recommendation_exists;
    
    -- Generate recommendations based on patterns
    IF NOT recommendation_exists THEN
        -- High consistent utilization
        IF avg_utilization >= 75 THEN
            INSERT INTO memory_optimization_recommendations 
                (recommendation_type, service_name, current_usage_bytes, 
                 recommended_limit_bytes, optimization_strategy, estimated_savings_bytes,
                 implementation_priority)
            VALUES (
                'increase_heap_size',
                p_service_name,
                p_heap_used_bytes,
                p_heap_used_bytes * 1.5,
                jsonb_build_object(
                    'strategy', 'increase_heap_allocation',
                    'reason', 'consistent_high_utilization',
                    'current_avg_utilization', avg_utilization
                ),
                0,
                'high'
            );
        END IF;
        
        -- Potential memory optimization for low utilization
        IF avg_utilization <= 25 THEN
            INSERT INTO memory_optimization_recommendations 
                (recommendation_type, service_name, current_usage_bytes,
                 recommended_limit_bytes, optimization_strategy, estimated_savings_bytes,
                 implementation_priority)
            VALUES (
                'reduce_heap_size',
                p_service_name,
                p_heap_used_bytes,
                p_heap_used_bytes * 0.6,
                jsonb_build_object(
                    'strategy', 'reduce_heap_allocation',
                    'reason', 'consistent_low_utilization',
                    'current_avg_utilization', avg_utilization
                ),
                p_heap_used_bytes * 0.4,
                'medium'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to detect memory leaks
CREATE OR REPLACE FUNCTION detect_memory_leak(
    p_service_name VARCHAR(100),
    p_operation_id VARCHAR(255),
    p_leaked_bytes BIGINT,
    p_leak_source VARCHAR(255),
    p_stack_trace TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    leak_id UUID;
    severity VARCHAR(20);
BEGIN
    -- Determine severity based on leaked bytes
    IF p_leaked_bytes >= 100 * 1024 * 1024 THEN -- 100MB
        severity := 'critical';
    ELSIF p_leaked_bytes >= 10 * 1024 * 1024 THEN -- 10MB
        severity := 'high';
    ELSIF p_leaked_bytes >= 1024 * 1024 THEN -- 1MB
        severity := 'medium';
    ELSE
        severity := 'low';
    END IF;
    
    -- Record memory leak
    INSERT INTO memory_leak_detection 
        (service_name, leak_type, leak_source, leaked_bytes, detection_method,
         stack_trace, operation_context, severity)
    VALUES 
        (p_service_name, 'operation_leak', p_leak_source, p_leaked_bytes, 'automatic',
         p_stack_trace, jsonb_build_object('operation_id', p_operation_id), severity)
    RETURNING id INTO leak_id;
    
    -- Create alert for significant leaks
    IF severity IN ('critical', 'high') THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'memory_leak_detected',
            severity,
            format('Memory leak detected in %s: %s bytes leaked from %s', 
                   p_service_name, p_leaked_bytes, p_leak_source),
            jsonb_build_object(
                'service_name', p_service_name,
                'leaked_bytes', p_leaked_bytes,
                'leak_source', p_leak_source,
                'operation_id', p_operation_id
            ),
            NOW()
        );
    END IF;
    
    RETURN leak_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;