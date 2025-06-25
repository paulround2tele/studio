-- Migration: 010_service_capacity_metrics.sql
-- Purpose: Create table for auto-scaling capacity metrics

CREATE TABLE IF NOT EXISTS service_capacity_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    cpu_utilization NUMERIC(5,2) NOT NULL,
    memory_utilization NUMERIC(5,2) NOT NULL,
    instance_count INTEGER NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capacity_metrics_service_time
    ON service_capacity_metrics(service_name, recorded_at DESC);
