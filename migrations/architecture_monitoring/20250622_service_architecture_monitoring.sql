-- Migration: 20250622_service_architecture_monitoring.sql
-- Purpose: Create tables for monitoring service architecture
-- Author: Architecture Team
-- Date: 2025-06-22

BEGIN;

CREATE TABLE IF NOT EXISTS service_architecture_metrics (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    architecture_pattern VARCHAR(50) NOT NULL,
    interface_type VARCHAR(30) NOT NULL,
    dependency_count INTEGER DEFAULT 0,
    coupling_score DECIMAL(5,2) DEFAULT 0.0,
    deployment_complexity_score INTEGER DEFAULT 0,
    last_refactor_date TIMESTAMP WITH TIME ZONE,
    performance_impact DECIMAL(8,2) DEFAULT 0.0,
    error_rate DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_dependencies (
    id BIGSERIAL PRIMARY KEY,
    source_service VARCHAR(100) NOT NULL,
    target_service VARCHAR(100) NOT NULL,
    dependency_type VARCHAR(30) NOT NULL,
    interface_contract TEXT,
    reliability_score DECIMAL(5,2) DEFAULT 100.0,
    latency_p95 DECIMAL(8,2) DEFAULT 0.0,
    failure_count INTEGER DEFAULT 0,
    last_success TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_service, target_service, dependency_type)
);

CREATE TABLE IF NOT EXISTS architecture_refactor_log (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    refactor_type VARCHAR(50) NOT NULL,
    before_pattern VARCHAR(50),
    after_pattern VARCHAR(50),
    complexity_reduction INTEGER DEFAULT 0,
    performance_impact DECIMAL(8,2) DEFAULT 0.0,
    rollback_plan TEXT,
    implemented_by VARCHAR(100),
    implemented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_metrics_pattern
    ON service_architecture_metrics(architecture_pattern, service_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_metrics_coupling
    ON service_architecture_metrics(coupling_score DESC) WHERE coupling_score > 50.0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dependencies_reliability
    ON service_dependencies(reliability_score ASC) WHERE reliability_score < 95.0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refactor_timeline
    ON architecture_refactor_log(implemented_at DESC);

CREATE OR REPLACE FUNCTION get_architecture_health_score()
RETURNS TABLE(
    overall_score DECIMAL(5,2),
    coupling_issues INTEGER,
    reliability_issues INTEGER,
    refactor_recommendations TEXT[]
) LANGUAGE plpgsql AS $$
DECLARE
    avg_coupling DECIMAL(5,2);
    low_reliability_count INTEGER;
    recommendations TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT AVG(coupling_score) INTO avg_coupling
    FROM service_architecture_metrics;

    SELECT COUNT(*) INTO low_reliability_count
    FROM service_dependencies
    WHERE reliability_score < 95.0;

    IF avg_coupling > 70.0 THEN
        recommendations := array_append(recommendations, 'HIGH_COUPLING_DETECTED');
    END IF;

    IF low_reliability_count > 5 THEN
        recommendations := array_append(recommendations, 'RELIABILITY_IMPROVEMENTS_NEEDED');
    END IF;

    RETURN QUERY SELECT
        CASE
            WHEN avg_coupling < 30.0 AND low_reliability_count < 3 THEN 95.0
            WHEN avg_coupling < 50.0 AND low_reliability_count < 5 THEN 80.0
            WHEN avg_coupling < 70.0 AND low_reliability_count < 8 THEN 65.0
            ELSE 40.0
        END,
        (SELECT COUNT(*)::INTEGER FROM service_architecture_metrics WHERE coupling_score > 70.0),
        low_reliability_count,
        recommendations;
END;
$$;

INSERT INTO public.schema_migrations (version, description)
VALUES ('20250622_service_architecture_monitoring', 'Service architecture monitoring schema');

COMMIT;

-- Rollback procedure
/*
BEGIN;
DROP FUNCTION IF EXISTS get_architecture_health_score();
DROP INDEX IF EXISTS idx_refactor_timeline;
DROP INDEX IF EXISTS idx_dependencies_reliability;
DROP INDEX IF EXISTS idx_service_metrics_coupling;
DROP INDEX IF EXISTS idx_service_metrics_pattern;
DROP TABLE IF EXISTS architecture_refactor_log;
DROP TABLE IF EXISTS service_dependencies;
DROP TABLE IF EXISTS service_architecture_metrics;
UPDATE public.schema_migrations
SET rolled_back_at = NOW()
WHERE version = '20250622_service_architecture_monitoring';
COMMIT;
*/
