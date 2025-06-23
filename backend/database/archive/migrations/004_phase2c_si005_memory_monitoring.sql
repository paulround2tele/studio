-- SI-005: Memory Management Monitoring Migration
-- Phase 2c Performance Enhancement
-- Creates tables for tracking memory usage and leak detection
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

CREATE INDEX IF NOT EXISTS idx_memory_metrics_service ON memory_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_metrics_recorded ON memory_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_memory_metrics_state ON memory_metrics(memory_state);
CREATE INDEX IF NOT EXISTS idx_memory_metrics_utilization ON memory_metrics(memory_utilization_pct);

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

CREATE INDEX IF NOT EXISTS idx_memory_allocations_operation ON memory_allocations(operation_id);
CREATE INDEX IF NOT EXISTS idx_memory_allocations_type ON memory_allocations(operation_type);
CREATE INDEX IF NOT EXISTS idx_memory_allocations_campaign ON memory_allocations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_memory_allocations_created ON memory_allocations(created_at);

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

CREATE INDEX IF NOT EXISTS idx_memory_leak_service ON memory_leak_detection(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_leak_type ON memory_leak_detection(leak_type);
CREATE INDEX IF NOT EXISTS idx_memory_leak_severity ON memory_leak_detection(severity);
CREATE INDEX IF NOT EXISTS idx_memory_leak_resolved ON memory_leak_detection(resolved);

COMMIT;
