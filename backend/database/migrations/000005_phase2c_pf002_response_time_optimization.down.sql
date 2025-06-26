-- Rollback Phase 2C - PF002: Response Time Optimization
-- Description: Remove response time optimization infrastructure
-- Author: Database Performance Team
-- Date: 2025-06-26

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_performance_optimizations_improvement;
DROP INDEX IF EXISTS idx_performance_optimizations_endpoint;
DROP INDEX IF EXISTS idx_performance_baselines_env;
DROP INDEX IF EXISTS idx_performance_baselines_endpoint;
DROP INDEX IF EXISTS idx_response_optimization_priority;
DROP INDEX IF EXISTS idx_response_optimization_pending;
DROP INDEX IF EXISTS idx_response_optimization_endpoint;
DROP INDEX IF EXISTS idx_response_targets_service;
DROP INDEX IF EXISTS idx_response_targets_endpoint;
DROP INDEX IF EXISTS idx_response_history_window;
DROP INDEX IF EXISTS idx_response_history_endpoint;
DROP INDEX IF EXISTS idx_response_metrics_method;
DROP INDEX IF EXISTS idx_response_metrics_slow;
DROP INDEX IF EXISTS idx_response_metrics_campaign;
DROP INDEX IF EXISTS idx_response_metrics_endpoint_time;

-- Drop tables
DROP TABLE IF EXISTS performance_optimizations;
DROP TABLE IF EXISTS performance_baselines;
DROP TABLE IF EXISTS response_optimization_recommendations;
DROP TABLE IF EXISTS response_time_targets;
DROP TABLE IF EXISTS response_time_history;
DROP TABLE IF EXISTS response_time_metrics;

COMMIT;
