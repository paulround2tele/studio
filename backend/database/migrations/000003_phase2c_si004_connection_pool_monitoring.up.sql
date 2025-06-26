-- Phase 2C - SI004: Connection Pool Monitoring
-- Description: Create comprehensive connection pool monitoring infrastructure
-- Author: Database Performance Team
-- Date: 2025-06-26

BEGIN;

-- Connection Pool Metrics Table
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
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connection Pool Alerts Table
CREATE TABLE IF NOT EXISTS connection_pool_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    alert_message TEXT NOT NULL,
    threshold_value NUMERIC(10,2),
    current_value NUMERIC(10,2),
    severity VARCHAR(20) DEFAULT 'warning',
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Connection Leak Detection Table
CREATE TABLE IF NOT EXISTS connection_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    connection_id VARCHAR(100) NOT NULL,
    allocated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    stack_trace TEXT,
    leak_duration_seconds INTEGER NOT NULL,
    leak_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- SI004 Specific Connection Pool Metrics (Enhanced)
CREATE TABLE IF NOT EXISTS si004_connection_pool_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC(15,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    threshold_breach BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SI004 Connection Pool Alerts (Enhanced)
CREATE TABLE IF NOT EXISTS si004_connection_pool_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    alert_code VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- SI004 Connection Leak Detection (Enhanced)
CREATE TABLE IF NOT EXISTS si004_connection_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    connection_signature VARCHAR(200) NOT NULL,
    leak_source VARCHAR(200) NOT NULL,
    leak_age_seconds INTEGER NOT NULL,
    impact_score INTEGER DEFAULT 0,
    auto_resolved BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_connection_pool_metrics_pool ON connection_pool_metrics(pool_name);
CREATE INDEX IF NOT EXISTS idx_connection_pool_metrics_recorded ON connection_pool_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_connection_pool_metrics_state ON connection_pool_metrics(pool_state);

CREATE INDEX IF NOT EXISTS idx_connection_pool_alerts_pool ON connection_pool_alerts(pool_name);
CREATE INDEX IF NOT EXISTS idx_connection_pool_alerts_type ON connection_pool_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_connection_pool_alerts_unresolved ON connection_pool_alerts(created_at) WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_connection_leak_detection_pool ON connection_leak_detection(pool_name);
CREATE INDEX IF NOT EXISTS idx_connection_leak_detection_unresolved ON connection_leak_detection(allocated_at) WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_si004_metrics_pool_type ON si004_connection_pool_metrics(pool_name, metric_type);
CREATE INDEX IF NOT EXISTS idx_si004_metrics_threshold ON si004_connection_pool_metrics(recorded_at) WHERE threshold_breach = TRUE;

CREATE INDEX IF NOT EXISTS idx_si004_alerts_pool_severity ON si004_connection_pool_alerts(pool_name, severity);
CREATE INDEX IF NOT EXISTS idx_si004_alerts_unack ON si004_connection_pool_alerts(created_at) WHERE acknowledged = FALSE;

CREATE INDEX IF NOT EXISTS idx_si004_leak_pool_age ON si004_connection_leak_detection(pool_name, leak_age_seconds);
CREATE INDEX IF NOT EXISTS idx_si004_leak_unresolved ON si004_connection_leak_detection(detected_at) WHERE auto_resolved = FALSE;

COMMIT;