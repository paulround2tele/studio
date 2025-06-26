-- Rollback Phase 2C - SI005: Memory Monitoring
-- Description: Remove memory monitoring infrastructure
-- Author: Database Performance Team
-- Date: 2025-06-26

BEGIN;

-- Drop indexes first
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

-- Drop tables
DROP TABLE IF EXISTS memory_optimization_recommendations;
DROP TABLE IF EXISTS memory_pools;
DROP TABLE IF EXISTS memory_allocations;
DROP TABLE IF EXISTS memory_leak_detection;
DROP TABLE IF EXISTS memory_metrics;

COMMIT;
