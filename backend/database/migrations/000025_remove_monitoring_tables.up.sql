-- Migration: remove_monitoring_tables
-- Description: Drop legacy monitoring and performance tables
-- Author: SchemaAligner
-- Date: 2025-07-05

BEGIN;

-- Drop indexes from connection pool monitoring
DROP INDEX IF EXISTS idx_si004_leak_unresolved;
DROP INDEX IF EXISTS idx_si004_leak_pool_age;
DROP INDEX IF EXISTS idx_si004_alerts_unack;
DROP INDEX IF EXISTS idx_si004_alerts_pool_severity;
DROP INDEX IF EXISTS idx_si004_metrics_threshold;
DROP INDEX IF EXISTS idx_si004_metrics_pool_type;
DROP INDEX IF EXISTS idx_connection_leak_detection_unresolved;
DROP INDEX IF EXISTS idx_connection_leak_detection_pool;
DROP INDEX IF EXISTS idx_connection_pool_alerts_unresolved;
DROP INDEX IF EXISTS idx_connection_pool_alerts_type;
DROP INDEX IF EXISTS idx_connection_pool_alerts_pool;
DROP INDEX IF EXISTS idx_connection_pool_metrics_state;
DROP INDEX IF EXISTS idx_connection_pool_metrics_recorded;
DROP INDEX IF EXISTS idx_connection_pool_metrics_pool;

-- Drop indexes from memory monitoring
DROP INDEX IF EXISTS idx_memory_optimization_priority;
DROP INDEX IF EXISTS idx_memory_optimization_pending;
DROP INDEX IF EXISTS idx_memory_optimization_service;
DROP INDEX IF EXISTS idx_memory_pools_fragmentation;
DROP INDEX IF EXISTS idx_memory_pools_efficiency;
DROP INDEX IF EXISTS idx_memory_pools_name;
DROP INDEX IF EXISTS idx_memory_allocations_size;
DROP INDEX IF EXISTS idx_memory_allocations_leaked;
DROP INDEX IF EXISTS idx_memory_allocations_service;
DROP INDEX IF EXISTS idx_memory_leak_severity;
DROP INDEX IF EXISTS idx_memory_leak_unresolved;
DROP INDEX IF EXISTS idx_memory_leak_service;
DROP INDEX IF EXISTS idx_memory_metrics_state;
DROP INDEX IF EXISTS idx_memory_metrics_utilization;
DROP INDEX IF EXISTS idx_memory_metrics_recorded;
DROP INDEX IF EXISTS idx_memory_metrics_service;

-- Drop indexes from response time monitoring
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

-- Drop connection pool monitoring tables
DROP TABLE IF EXISTS si004_connection_leak_detection;
DROP TABLE IF EXISTS si004_connection_pool_alerts;
DROP TABLE IF EXISTS si004_connection_pool_metrics;
DROP TABLE IF EXISTS connection_leak_detection;
DROP TABLE IF EXISTS connection_pool_alerts;
DROP TABLE IF EXISTS connection_pool_metrics;

-- Drop memory monitoring tables
DROP TABLE IF EXISTS memory_optimization_recommendations;
DROP TABLE IF EXISTS memory_pools;
DROP TABLE IF EXISTS memory_allocations;
DROP TABLE IF EXISTS memory_leak_detection;
DROP TABLE IF EXISTS memory_metrics;

-- Drop response time monitoring tables
DROP TABLE IF EXISTS performance_optimizations;
DROP TABLE IF EXISTS performance_baselines;
DROP TABLE IF EXISTS response_optimization_recommendations;
DROP TABLE IF EXISTS response_time_targets;
DROP TABLE IF EXISTS response_time_history;
DROP TABLE IF EXISTS response_time_metrics;

COMMIT;
