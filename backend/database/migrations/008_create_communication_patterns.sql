-- Migration to add communication_patterns table and indexes
CREATE TABLE IF NOT EXISTS communication_patterns (
    id BIGSERIAL PRIMARY KEY,
    source_service VARCHAR(100) NOT NULL,
    target_service VARCHAR(100) NOT NULL,
    communication_type VARCHAR(30) NOT NULL,
    protocol VARCHAR(20) NOT NULL,
    message_format VARCHAR(20) NOT NULL,
    avg_latency_ms DECIMAL(8,2) DEFAULT 0.0,
    success_rate DECIMAL(5,2) DEFAULT 100.0,
    throughput_rps DECIMAL(10,2) DEFAULT 0.0,
    error_rate DECIMAL(5,2) DEFAULT 0.0,
    retry_count INTEGER DEFAULT 0,
    circuit_breaker_state VARCHAR(20) DEFAULT 'closed',
    last_health_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_service, target_service, protocol)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communication_patterns_latency
    ON communication_patterns(avg_latency_ms DESC) WHERE avg_latency_ms > 100.0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communication_patterns_errors
    ON communication_patterns(error_rate DESC) WHERE error_rate > 1.0;
