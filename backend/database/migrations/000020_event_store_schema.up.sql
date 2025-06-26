-- Migration: 009_event_store_schema.sql
-- Purpose: Create tables for event sourcing framework

CREATE TABLE IF NOT EXISTS event_store (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    aggregate_id VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    event_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    causation_id UUID,
    correlation_id UUID,
    stream_position BIGINT NOT NULL,
    global_position BIGSERIAL NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(aggregate_id, stream_position)
);

CREATE TABLE IF NOT EXISTS event_projections (
    id BIGSERIAL PRIMARY KEY,
    projection_name VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    projection_data JSONB NOT NULL,
    last_event_position BIGINT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(projection_name, aggregate_id)
);

CREATE INDEX IF NOT EXISTS idx_event_store_aggregate
    ON event_store(aggregate_id, stream_position);
CREATE INDEX IF NOT EXISTS idx_event_store_global_position
    ON event_store(global_position);
CREATE INDEX IF NOT EXISTS idx_event_store_type_time
    ON event_store(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_projections_name_aggregate
    ON event_projections(projection_name, aggregate_id);

