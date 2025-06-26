-- Phase 2C - SI005: Memory Monitoring and Optimization
-- Description: Create comprehensive memory monitoring and leak detection infrastructure  
-- Author: Database Performance Team
-- Date: 2025-06-26

BEGIN;

-- Memory Metrics Table
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
    memory_utilization_pct NUMERIC(5,2) DEFAULT 0,
    memory_state VARCHAR(50) DEFAULT 'normal',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    component VARCHAR(100) DEFAULT 'unknown',
    memory_type VARCHAR(50) DEFAULT 'heap',
    allocated_bytes BIGINT DEFAULT 0,
    used_bytes BIGINT DEFAULT 0
);

-- Memory Leak Detection Table
CREATE TABLE IF NOT EXISTS memory_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    process_id VARCHAR(50) NOT NULL,
    leak_type VARCHAR(50) NOT NULL,
    leak_source VARCHAR(200) NOT NULL,
    memory_growth_rate_mb_per_hour NUMERIC(10,2) NOT NULL,
    detection_confidence NUMERIC(3,2) DEFAULT 0.0,
    impact_severity VARCHAR(20) DEFAULT 'low',
    auto_resolved BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Memory Allocations Tracking Table
CREATE TABLE IF NOT EXISTS memory_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    allocation_type VARCHAR(50) NOT NULL,
    allocation_size_bytes BIGINT NOT NULL,
    allocation_source VARCHAR(200) NOT NULL,
    allocation_stack_trace TEXT,
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deallocated_at TIMESTAMP WITH TIME ZONE,
    is_leaked BOOLEAN DEFAULT FALSE
);

-- Memory Pools Table
CREATE TABLE IF NOT EXISTS memory_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    pool_type VARCHAR(50) NOT NULL,
    total_size_bytes BIGINT NOT NULL,
    used_size_bytes BIGINT NOT NULL,
    free_size_bytes BIGINT NOT NULL,
    allocation_count INTEGER DEFAULT 0,
    deallocation_count INTEGER DEFAULT 0,
    fragmentation_pct NUMERIC(5,2) DEFAULT 0.0,
    pool_efficiency_pct NUMERIC(5,2) DEFAULT 100.0,
    last_reset_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory Optimization Recommendations Table
CREATE TABLE IF NOT EXISTS memory_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    recommendation_text TEXT NOT NULL,
    potential_memory_savings_mb INTEGER DEFAULT 0,
    implementation_effort VARCHAR(20) DEFAULT 'medium',
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    implemented_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_memory_metrics_service ON memory_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_metrics_recorded ON memory_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_memory_metrics_utilization ON memory_metrics(memory_utilization_pct) WHERE memory_utilization_pct > 80.0;
CREATE INDEX IF NOT EXISTS idx_memory_metrics_state ON memory_metrics(memory_state) WHERE memory_state != 'normal';

CREATE INDEX IF NOT EXISTS idx_memory_leak_service ON memory_leak_detection(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_leak_unresolved ON memory_leak_detection(detected_at) WHERE auto_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_memory_leak_severity ON memory_leak_detection(impact_severity, detected_at);

CREATE INDEX IF NOT EXISTS idx_memory_allocations_service ON memory_allocations(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_allocations_leaked ON memory_allocations(allocated_at) WHERE is_leaked = TRUE;
CREATE INDEX IF NOT EXISTS idx_memory_allocations_size ON memory_allocations(allocation_size_bytes) WHERE allocation_size_bytes > 1048576; -- > 1MB

CREATE INDEX IF NOT EXISTS idx_memory_pools_name ON memory_pools(pool_name);
CREATE INDEX IF NOT EXISTS idx_memory_pools_efficiency ON memory_pools(pool_efficiency_pct) WHERE pool_efficiency_pct < 80.0;
CREATE INDEX IF NOT EXISTS idx_memory_pools_fragmentation ON memory_pools(fragmentation_pct) WHERE fragmentation_pct > 20.0;

CREATE INDEX IF NOT EXISTS idx_memory_optimization_service ON memory_optimization_recommendations(service_name);
CREATE INDEX IF NOT EXISTS idx_memory_optimization_pending ON memory_optimization_recommendations(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_memory_optimization_priority ON memory_optimization_recommendations(priority, created_at);

COMMIT;