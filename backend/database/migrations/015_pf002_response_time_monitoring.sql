-- PF-002: Response Time Optimization Migration
-- Implementation Date: June 22, 2025
-- Dependencies: PF-001 Query Optimization

BEGIN;

-- Response time tracking table
CREATE TABLE IF NOT EXISTS response_time_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    response_time_ms DECIMAL(10,3) NOT NULL,
    payload_size_bytes INTEGER DEFAULT 0,
    user_id UUID,
    campaign_id UUID,
    status_code INTEGER DEFAULT 200,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Response time optimization recommendations
CREATE TABLE IF NOT EXISTS response_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(255) NOT NULL,
    current_avg_response_ms DECIMAL(10,3) NOT NULL,
    target_response_ms DECIMAL(10,3) NOT NULL,
    optimization_strategies JSONB NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    implemented BOOLEAN DEFAULT false,
    implementation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Async task status tracking
CREATE TABLE IF NOT EXISTS async_task_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) UNIQUE NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'queued',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    user_id UUID,
    campaign_id UUID,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    estimated_completion_at TIMESTAMPTZ
);

-- Strategic indexes for performance
CREATE INDEX IF NOT EXISTS idx_response_metrics_endpoint_time ON response_time_metrics(endpoint_path, recorded_at);
CREATE INDEX IF NOT EXISTS idx_response_metrics_slow_requests ON response_time_metrics(response_time_ms) WHERE response_time_ms > 1000;
CREATE INDEX IF NOT EXISTS idx_response_metrics_user_endpoint ON response_time_metrics(user_id, endpoint_path);
CREATE INDEX IF NOT EXISTS idx_response_metrics_campaign ON response_time_metrics(campaign_id) WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_response_optimization_endpoint ON response_optimization_recommendations(endpoint_path);
CREATE INDEX IF NOT EXISTS idx_response_optimization_priority ON response_optimization_recommendations(priority, implemented);

CREATE INDEX IF NOT EXISTS idx_async_task_status_user ON async_task_status(user_id, status);
CREATE INDEX IF NOT EXISTS idx_async_task_status_task_id ON async_task_status(task_id);
CREATE INDEX IF NOT EXISTS idx_async_task_status_type_status ON async_task_status(task_type, status);

-- Function to record response times and generate alerts
CREATE OR REPLACE FUNCTION record_response_time(
    p_endpoint VARCHAR(255),
    p_method VARCHAR(10),
    p_response_time_ms DECIMAL(10,3),
    p_payload_size INTEGER DEFAULT 0,
    p_user_id UUID DEFAULT NULL,
    p_campaign_id UUID DEFAULT NULL,
    p_status_code INTEGER DEFAULT 200
) RETURNS UUID AS $$
DECLARE
    metric_id UUID;
    avg_response_time DECIMAL(10,3);
    slow_threshold DECIMAL(10,3) := 1000; -- 1 second
    critical_threshold DECIMAL(10,3) := 3000; -- 3 seconds
BEGIN
    -- Insert response time metric
    INSERT INTO response_time_metrics 
    (endpoint_path, http_method, response_time_ms, payload_size_bytes, user_id, campaign_id, status_code)
    VALUES (p_endpoint, p_method, p_response_time_ms, p_payload_size, p_user_id, p_campaign_id, p_status_code)
    RETURNING id INTO metric_id;
    
    -- Check if this endpoint needs optimization recommendations
    IF p_response_time_ms > slow_threshold THEN
        -- Calculate recent average response time for this endpoint
        SELECT AVG(response_time_ms) INTO avg_response_time
        FROM response_time_metrics 
        WHERE endpoint_path = p_endpoint 
        AND http_method = p_method
        AND recorded_at > NOW() - INTERVAL '1 hour';
        
        -- Generate optimization recommendation if average is consistently slow
        IF avg_response_time > slow_threshold THEN
            INSERT INTO response_optimization_recommendations 
            (endpoint_path, current_avg_response_ms, target_response_ms, optimization_strategies, priority)
            VALUES (
                p_endpoint,
                avg_response_time,
                CASE 
                    WHEN avg_response_time > critical_threshold THEN avg_response_time * 0.3
                    ELSE avg_response_time * 0.5
                END,
                JSON_BUILD_OBJECT(
                    'strategies', ARRAY[
                        CASE WHEN avg_response_time > critical_threshold THEN 'async_processing' ELSE 'query_optimization' END,
                        'response_compression',
                        'selective_field_loading',
                        'pagination'
                    ],
                    'current_avg_ms', avg_response_time,
                    'samples_analyzed', (
                        SELECT COUNT(*) FROM response_time_metrics 
                        WHERE endpoint_path = p_endpoint AND recorded_at > NOW() - INTERVAL '1 hour'
                    )
                ),
                CASE 
                    WHEN avg_response_time > critical_threshold THEN 'high'
                    WHEN avg_response_time > slow_threshold * 2 THEN 'medium'
                    ELSE 'low'
                END
            )
            ON CONFLICT DO NOTHING; -- Don't create duplicate recommendations
        END IF;
    END IF;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update async task progress
CREATE OR REPLACE FUNCTION update_task_progress(
    p_task_id VARCHAR(255),
    p_status VARCHAR(50),
    p_progress_percentage DECIMAL(5,2) DEFAULT NULL,
    p_processed_items INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- Check if task exists
    SELECT EXISTS(SELECT 1 FROM async_task_status WHERE task_id = p_task_id) INTO task_exists;
    
    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update task status
    UPDATE async_task_status 
    SET 
        status = p_status,
        progress_percentage = COALESCE(p_progress_percentage, progress_percentage),
        processed_items = COALESCE(p_processed_items, processed_items),
        error_message = COALESCE(p_error_message, error_message),
        completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE task_id = p_task_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get response time analytics
CREATE OR REPLACE FUNCTION get_response_time_analytics(
    p_endpoint_filter VARCHAR(255) DEFAULT NULL,
    p_hours_back INTEGER DEFAULT 24
) RETURNS TABLE (
    endpoint_path VARCHAR(255),
    http_method VARCHAR(10),
    avg_response_ms DECIMAL(10,3),
    p95_response_ms DECIMAL(10,3),
    total_requests BIGINT,
    slow_requests BIGINT,
    error_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rtm.endpoint_path,
        rtm.http_method,
        AVG(rtm.response_time_ms) as avg_response_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY rtm.response_time_ms) as p95_response_ms,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE rtm.response_time_ms > 1000) as slow_requests,
        (COUNT(*) FILTER (WHERE rtm.status_code >= 400)::DECIMAL / COUNT(*) * 100) as error_rate
    FROM response_time_metrics rtm
    WHERE rtm.recorded_at > NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_endpoint_filter IS NULL OR rtm.endpoint_path ILIKE '%' || p_endpoint_filter || '%')
    GROUP BY rtm.endpoint_path, rtm.http_method
    ORDER BY avg_response_ms DESC;
END;
$$ LANGUAGE plpgsql;

COMMIT;
