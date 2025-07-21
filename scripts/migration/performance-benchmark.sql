-- ======================================================================
-- DATABASE MIGRATION PERFORMANCE BENCHMARK
-- ======================================================================
-- This script benchmarks database performance before and after the
-- phases-based migration to validate the 40% improvement target.
--
-- USAGE: Run before and after migration to compare performance
-- TARGET: 40% improvement in query performance after migration
-- ======================================================================

-- Set timing and output formatting
\timing on
\set QUIET off

-- Create performance results table
CREATE TABLE IF NOT EXISTS migration_performance_results (
    id SERIAL PRIMARY KEY,
    test_name TEXT NOT NULL,
    test_category TEXT NOT NULL,
    architecture_type TEXT NOT NULL, -- 'dual' or 'phases_based'
    execution_time_ms NUMERIC(10,3) NOT NULL,
    rows_processed INTEGER,
    query_plan_cost NUMERIC(10,2),
    buffer_usage_mb NUMERIC(10,2),
    test_timestamp TIMESTAMP DEFAULT NOW(),
    test_parameters JSONB,
    notes TEXT
);

-- Set test parameters
\set test_timestamp '''''' `date --iso-8601=seconds` ''''''
\set architecture_type '''dual'''  -- Change to 'phases_based' after migration

BEGIN;

-- ======================================================================
-- 1. CAMPAIGN QUERY PERFORMANCE TESTS
-- ======================================================================

\echo ''
\echo '============================================================'
\echo 'CAMPAIGN QUERY PERFORMANCE BENCHMARKS'
\echo '============================================================'

-- Test 1: User Campaign Dashboard Query (Most Common)
\echo ''
\echo 'Test 1: User Campaign Dashboard Query'
\echo '------------------------------------------------------------'

-- Before migration: Uses campaign_type + status
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT c.id, c.name, c.campaign_type, c.status, c.created_at, c.updated_at,
       COUNT(gd.id) as domain_count,
       COUNT(gd.id) FILTER (WHERE gd.dns_status = 'ok') as dns_valid_count
FROM campaigns c
LEFT JOIN generated_domains gd ON gd.domain_generation_campaign_id = c.id
WHERE c.user_id = (SELECT id FROM users LIMIT 1)
  AND c.status IN ('running', 'completed', 'paused')
GROUP BY c.id, c.name, c.campaign_type, c.status, c.created_at, c.updated_at
ORDER BY c.updated_at DESC
LIMIT 20;

-- Extract and store performance metrics
INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, rows_processed, notes)
VALUES 
('user_campaign_dashboard', 'campaign_queries', :'architecture_type', 
 extract(epoch from (SELECT MAX(total_time) FROM pg_stat_statements WHERE query LIKE '%campaigns c%LEFT JOIN generated_domains%')) * 1000,
 20, 'User dashboard with domain counts - most common query pattern');

-- Test 2: Campaign Type Filtering (Legacy Pattern)
\echo ''
\echo 'Test 2: Campaign Type Filtering'
\echo '------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT c.id, c.name, c.campaign_type, c.status, c.progress_percentage,
       c.total_items, c.processed_items
FROM campaigns c
WHERE c.campaign_type = 'domain_generation'
  AND c.status IN ('running', 'paused')
  AND c.user_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 50;

INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, notes)
VALUES 
('campaign_type_filtering', 'campaign_queries', :'architecture_type',
 extract(epoch from (SELECT MAX(total_time) FROM pg_stat_statements WHERE query LIKE '%campaign_type = %')) * 1000,
 'Campaign filtering by type - legacy dual architecture pattern');

-- Test 3: Campaign Status Aggregation
\echo ''
\echo 'Test 3: Campaign Status Aggregation'
\echo '------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT c.campaign_type, c.status, 
       COUNT(*) as campaign_count,
       AVG(c.progress_percentage) as avg_progress,
       SUM(c.total_items) as total_domains
FROM campaigns c
WHERE c.created_at > NOW() - INTERVAL '30 days'
GROUP BY c.campaign_type, c.status
ORDER BY c.campaign_type, c.status;

INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, notes)
VALUES 
('campaign_status_aggregation', 'campaign_queries', :'architecture_type',
 extract(epoch from (SELECT MAX(total_time) FROM pg_stat_statements WHERE query LIKE '%GROUP BY c.campaign_type, c.status%')) * 1000,
 'Campaign status aggregation for analytics dashboards');

-- ======================================================================
-- 2. BULK DOMAIN PROCESSING TESTS (2M+ DOMAINS)
-- ======================================================================

\echo ''
\echo '============================================================'
\echo 'BULK DOMAIN PROCESSING BENCHMARKS (2M+ DOMAINS)'
\echo '============================================================'

-- Test 4: Bulk Domain Generation Query
\echo ''
\echo 'Test 4: Bulk Domain Generation Query'
\echo '------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT c.id, c.name, c.campaign_type, c.status,
       COUNT(gd.id) as total_domains,
       COUNT(gd.id) FILTER (WHERE gd.dns_status = 'pending') as pending_dns,
       COUNT(gd.id) FILTER (WHERE gd.http_status = 'pending') as pending_http
FROM campaigns c
JOIN generated_domains gd ON gd.domain_generation_campaign_id = c.id
WHERE c.campaign_type = 'domain_generation'
  AND c.status = 'running'
GROUP BY c.id, c.name, c.campaign_type, c.status
HAVING COUNT(gd.id) > 10000  -- Simulate large campaigns
ORDER BY COUNT(gd.id) DESC;

INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, notes)
VALUES 
('bulk_domain_generation', 'bulk_processing', :'architecture_type',
 extract(epoch from (SELECT MAX(total_time) FROM pg_stat_statements WHERE query LIKE '%HAVING COUNT(gd.id) > 10000%')) * 1000,
 'Bulk domain processing for large campaigns (10K+ domains)');

-- Test 5: Domain Validation Status Updates
\echo ''
\echo 'Test 5: Domain Validation Status Updates'
\echo '------------------------------------------------------------'

-- Simulate bulk DNS validation updates
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
UPDATE generated_domains 
SET dns_status = 'ok', 
    dns_ip = '1.2.3.4',
    last_validated_at = NOW()
WHERE domain_generation_campaign_id IN (
    SELECT id FROM campaigns 
    WHERE campaign_type = 'dns_validation' 
    AND status = 'running'
    LIMIT 5
)
AND dns_status = 'pending'
AND id % 10 = 0;  -- Update 10% of pending domains

INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, notes)
VALUES 
('bulk_validation_updates', 'bulk_processing', :'architecture_type',
 extract(epoch from (SELECT MAX(total_time) FROM pg_stat_statements WHERE query LIKE '%UPDATE generated_domains%dns_status%')) * 1000,
 'Bulk DNS validation status updates for active campaigns');

-- Test 6: Lead Generation Analytics
\echo ''
\echo 'Test 6: Lead Generation Analytics'
\echo '------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT c.campaign_type, c.status,
       COUNT(gd.id) as total_domains,
       COUNT(gd.id) FILTER (WHERE gd.lead_score > 0) as leads_found,
       AVG(gd.lead_score) FILTER (WHERE gd.lead_score > 0) as avg_lead_score,
       MAX(gd.lead_score) as max_lead_score
FROM campaigns c
JOIN generated_domains gd ON gd.domain_generation_campaign_id = c.id
WHERE c.created_at > NOW() - INTERVAL '7 days'
  AND gd.http_status = 'ok'
GROUP BY c.campaign_type, c.status
HAVING COUNT(gd.id) > 1000
ORDER BY COUNT(gd.id) FILTER (WHERE gd.lead_score > 0) DESC;

INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, notes)
VALUES 
('lead_generation_analytics', 'bulk_processing', :'architecture_type',
 extract(epoch from (SELECT MAX(total_time) FROM pg_stat_statements WHERE query LIKE '%lead_score%')) * 1000,
 'Lead generation analytics for large campaigns');

-- ======================================================================
-- 3. INDEX PERFORMANCE VALIDATION
-- ======================================================================

\echo ''
\echo '============================================================'
\echo 'INDEX PERFORMANCE VALIDATION'
\echo '============================================================'

-- Test 7: Campaign Type Index Usage
\echo ''
\echo 'Test 7: Campaign Type Index Usage'
\echo '------------------------------------------------------------'

-- Query that should use campaign_type index
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT COUNT(*) 
FROM campaigns 
WHERE campaign_type = 'domain_generation'
  AND status IN ('pending', 'running');

INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, notes)
VALUES 
('campaign_type_index', 'index_performance', :'architecture_type',
 extract(epoch from (SELECT MAX(total_time) FROM pg_stat_statements WHERE query LIKE '%campaign_type = %domain_generation%')) * 1000,
 'Index usage for campaign type filtering');

-- Test 8: Domain Campaign FK Index Usage
\echo ''
\echo 'Test 8: Domain Campaign FK Index Usage'
\echo '------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT COUNT(*) 
FROM generated_domains 
WHERE domain_generation_campaign_id IN (
    SELECT id FROM campaigns WHERE status = 'running'
);

INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, notes)
VALUES 
('domain_fk_index', 'index_performance', :'architecture_type',
 extract(epoch from (SELECT MAX(total_time) FROM pg_stat_statements WHERE query LIKE '%domain_generation_campaign_id IN%')) * 1000,
 'Foreign key index usage for domain-campaign relationships');

-- ======================================================================
-- 4. CONCURRENT ACCESS SIMULATION
-- ======================================================================

\echo ''
\echo '============================================================'
\echo 'CONCURRENT ACCESS SIMULATION'
\echo '============================================================'

-- Test 9: Multiple User Dashboard Queries
\echo ''
\echo 'Test 9: Multiple User Dashboard Queries (Concurrent Simulation)'
\echo '------------------------------------------------------------'

-- Simulate multiple users accessing dashboard simultaneously
DO $$
DECLARE
    user_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    total_duration NUMERIC;
BEGIN
    start_time := clock_timestamp();
    
    -- Simulate 10 concurrent user dashboard queries
    FOR user_record IN 
        SELECT id FROM users LIMIT 10
    LOOP
        PERFORM c.id, c.name, c.campaign_type, c.status
        FROM campaigns c
        WHERE c.user_id = user_record.id
          AND c.status IN ('running', 'completed')
        ORDER BY c.updated_at DESC
        LIMIT 20;
    END LOOP;
    
    end_time := clock_timestamp();
    total_duration := extract(epoch from (end_time - start_time)) * 1000;
    
    INSERT INTO migration_performance_results 
    (test_name, test_category, architecture_type, execution_time_ms, rows_processed, notes)
    VALUES 
    ('concurrent_user_dashboards', 'concurrent_access', 'dual', 
     total_duration, 10, 'Simulated 10 concurrent user dashboard queries');
END $$;

-- ======================================================================
-- 5. MEMORY AND RESOURCE USAGE
-- ======================================================================

\echo ''
\echo '============================================================'
\echo 'MEMORY AND RESOURCE USAGE'
\echo '============================================================'

-- Test 10: Large Result Set Memory Usage
\echo ''
\echo 'Test 10: Large Result Set Memory Usage'
\echo '------------------------------------------------------------'

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT c.id, c.name, c.campaign_type, c.status, 
       gd.domain_name, gd.dns_status, gd.http_status, gd.lead_score
FROM campaigns c
JOIN generated_domains gd ON gd.domain_generation_campaign_id = c.id
WHERE c.created_at > NOW() - INTERVAL '1 day'
  AND gd.lead_score > 0
ORDER BY gd.lead_score DESC, c.updated_at DESC
LIMIT 5000;

INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, rows_processed, notes)
VALUES 
('large_result_set', 'memory_usage', :'architecture_type',
 extract(epoch from (SELECT MAX(total_time) FROM pg_stat_statements WHERE query LIKE '%ORDER BY gd.lead_score DESC%')) * 1000,
 5000, 'Large result set with joins and sorting');

-- ======================================================================
-- 6. PERFORMANCE SUMMARY REPORT
-- ======================================================================

\echo ''
\echo '============================================================'
\echo 'PERFORMANCE BENCHMARK SUMMARY'
\echo '============================================================'

-- Generate performance summary
SELECT 
    test_category,
    COUNT(*) as test_count,
    ROUND(AVG(execution_time_ms), 2) as avg_time_ms,
    ROUND(MIN(execution_time_ms), 2) as min_time_ms,
    ROUND(MAX(execution_time_ms), 2) as max_time_ms,
    ROUND(STDDEV(execution_time_ms), 2) as stddev_time_ms
FROM migration_performance_results 
WHERE architecture_type = :'architecture_type'
  AND test_timestamp::date = CURRENT_DATE
GROUP BY test_category
ORDER BY test_category;

-- Store current database statistics
INSERT INTO migration_performance_results 
(test_name, test_category, architecture_type, execution_time_ms, test_parameters, notes)
SELECT 
    'database_statistics',
    'system_metrics',
    :'architecture_type',
    0,
    json_build_object(
        'total_campaigns', (SELECT COUNT(*) FROM campaigns),
        'total_domains', (SELECT COUNT(*) FROM generated_domains),
        'active_campaigns', (SELECT COUNT(*) FROM campaigns WHERE status = 'running'),
        'database_size_mb', pg_database_size(current_database()) / 1024 / 1024,
        'campaigns_table_size_mb', pg_total_relation_size('campaigns') / 1024 / 1024,
        'domains_table_size_mb', pg_total_relation_size('generated_domains') / 1024 / 1024
    ),
    'Database size and record count metrics';

COMMIT;

-- Update query statistics
SELECT pg_stat_reset();

\echo ''
\echo 'Performance benchmark completed!'
\echo 'Results stored in migration_performance_results table'
\echo ''
\echo 'To compare before/after migration performance, run:'
\echo 'SELECT * FROM migration_performance_comparison_view;'

-- Create comparison view for before/after analysis
CREATE OR REPLACE VIEW migration_performance_comparison AS
WITH before_migration AS (
    SELECT test_name, test_category, execution_time_ms, rows_processed
    FROM migration_performance_results 
    WHERE architecture_type = 'dual'
      AND test_timestamp::date = CURRENT_DATE
),
after_migration AS (
    SELECT test_name, test_category, execution_time_ms, rows_processed
    FROM migration_performance_results 
    WHERE architecture_type = 'phases_based'
      AND test_timestamp::date = CURRENT_DATE
)
SELECT 
    COALESCE(b.test_name, a.test_name) as test_name,
    COALESCE(b.test_category, a.test_category) as test_category,
    b.execution_time_ms as before_time_ms,
    a.execution_time_ms as after_time_ms,
    CASE 
        WHEN a.execution_time_ms IS NOT NULL AND b.execution_time_ms IS NOT NULL THEN
            ROUND(((b.execution_time_ms - a.execution_time_ms) / b.execution_time_ms) * 100, 2)
        ELSE NULL
    END as improvement_percent,
    CASE 
        WHEN a.execution_time_ms IS NOT NULL AND b.execution_time_ms IS NOT NULL THEN
            CASE 
                WHEN ((b.execution_time_ms - a.execution_time_ms) / b.execution_time_ms) * 100 >= 40 THEN '✓ TARGET MET'
                WHEN ((b.execution_time_ms - a.execution_time_ms) / b.execution_time_ms) * 100 >= 20 THEN '~ GOOD'
                WHEN ((b.execution_time_ms - a.execution_time_ms) / b.execution_time_ms) * 100 > 0 THEN '+ IMPROVED'
                ELSE '✗ DEGRADED'
            END
        ELSE 'NO DATA'
    END as performance_status
FROM before_migration b
FULL OUTER JOIN after_migration a ON b.test_name = a.test_name;

\echo 'Use migration_performance_comparison view to analyze before/after results'