BEGIN;

-- Transaction monitoring and metrics table
CREATE TABLE IF NOT EXISTS transaction_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_name VARCHAR(255) NOT NULL,
    campaign_id UUID REFERENCES campaigns(id),
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    isolation_level VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance monitoring
CREATE INDEX idx_transaction_metrics_operation ON transaction_metrics(operation_name);
CREATE INDEX idx_transaction_metrics_campaign ON transaction_metrics(campaign_id);
CREATE INDEX idx_transaction_metrics_created_at ON transaction_metrics(created_at);

-- Function for recording transaction metrics
CREATE OR REPLACE FUNCTION record_transaction_metric(
    p_operation_name VARCHAR(255),
    p_campaign_id UUID,
    p_duration_ms INTEGER,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_retry_count INTEGER DEFAULT 0,
    p_isolation_level VARCHAR(50) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO transaction_metrics 
        (operation_name, campaign_id, duration_ms, success, error_message, retry_count, isolation_level)
    VALUES 
        (p_operation_name, p_campaign_id, p_duration_ms, p_success, p_error_message, p_retry_count, p_isolation_level)
    RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;