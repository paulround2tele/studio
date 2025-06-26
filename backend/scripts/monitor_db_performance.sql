-- Database Performance Monitoring Script
-- File: backend/scripts/monitor_db_performance.sql
-- Purpose: Monitor bulk operation performance and index effectiveness
-- Usage: psql -d database_name -f scripts/monitor_db_performance.sql

\echo '==================================================================='
\echo 'DATABASE PERFORMANCE MONITORING - BULK OPERATIONS'
\echo '==================================================================='
\echo ''

-- 1. INDEX USAGE STATISTICS
\echo '📊 INDEX USAGE STATISTICS'
\echo '--------------------------'
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as "Index Scans",
    idx_tup_read as "Tuples Read via Index",
    idx_tup_fetch as "Tuples Fetched via Index",
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED ❌'
        WHEN idx_scan < 100 THEN 'LOW USAGE ⚠️'
        WHEN idx_scan < 1000 THEN 'MODERATE ✅'
        ELSE 'HIGH USAGE 🚀'
    END as "Usage Level"
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC, tablename, indexname;

\echo ''

-- 2. TABLE SCAN STATISTICS
\echo '🔍 TABLE SCAN ANALYSIS'
\echo '----------------------'
SELECT 
    schemaname,
    tablename,
    seq_scan as "Sequential Scans",
    seq_tup_read as "Rows Read via Seq Scan",
    idx_scan as "Index Scans", 
    idx_tup_fetch as "Rows Fetched via Index",
    ROUND(
        CASE 
            WHEN (seq_scan + idx_scan) = 0 THEN 0
            ELSE (seq_scan::float / (seq_scan + idx_scan) * 100)
        END, 2
    ) as "Seq Scan %",
    CASE 
        WHEN seq_scan > idx_scan AND seq_scan > 1000 THEN 'NEEDS OPTIMIZATION ❌'
        WHEN seq_scan > idx_scan THEN 'COULD BE OPTIMIZED ⚠️'
        ELSE 'WELL OPTIMIZED ✅'
    END as "Status"
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

\echo ''

-- 3. BULK OPERATION TABLE SIZES
\echo '📦 TABLE SIZES AND ROW COUNTS'
\echo '-----------------------------'
SELECT 
    schemaname,
    tablename,
    n_tup_ins as "Inserts",
    n_tup_upd as "Updates", 
    n_tup_del as "Deletes",
    n_live_tup as "Live Rows",
    n_dead_tup as "Dead Rows",
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Total Size",
    CASE 
        WHEN n_dead_tup > n_live_tup * 0.2 THEN 'NEEDS VACUUM ❌'
        WHEN n_dead_tup > n_live_tup * 0.1 THEN 'VACUUM RECOMMENDED ⚠️'
        ELSE 'HEALTHY ✅'
    END as "Health Status"
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''

-- 4. QUERY PERFORMANCE INSIGHTS
\echo '⚡ SLOW QUERY ANALYSIS'
\echo '---------------------'
-- Note: Requires pg_stat_statements extension
SELECT 
    LEFT(query, 100) as "Query Start",
    calls,
    ROUND(total_exec_time::numeric, 2) as "Total Time (ms)",
    ROUND(mean_exec_time::numeric, 2) as "Avg Time (ms)",
    ROUND((100 * total_exec_time / sum(total_exec_time) OVER())::numeric, 2) as "% of Total Time"
FROM pg_stat_statements 
WHERE query ILIKE ANY(ARRAY['%campaign%', '%domain_result%', '%dns_result%', '%http_keyword%'])
ORDER BY total_exec_time DESC 
LIMIT 10;

\echo ''

-- 5. CONNECTION AND LOCK ANALYSIS
\echo '🔒 CONNECTION AND LOCK STATUS'
\echo '-----------------------------'
SELECT 
    COUNT(*) as "Total Connections",
    COUNT(*) FILTER (WHERE state = 'active') as "Active Connections",
    COUNT(*) FILTER (WHERE state = 'idle') as "Idle Connections",
    COUNT(*) FILTER (WHERE state = 'idle in transaction') as "Idle in Transaction",
    COUNT(*) FILTER (WHERE waiting) as "Waiting for Locks"
FROM pg_stat_activity;

\echo ''

-- 6. BULK OPERATION RECOMMENDATIONS
\echo '💡 OPTIMIZATION RECOMMENDATIONS'
\echo '-------------------------------'

-- Find tables with high sequential scan ratios
WITH scan_analysis AS (
    SELECT 
        tablename,
        seq_scan,
        idx_scan,
        CASE 
            WHEN (seq_scan + idx_scan) = 0 THEN 0
            ELSE ROUND((seq_scan::float / (seq_scan + idx_scan) * 100), 2)
        END as seq_scan_ratio
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
)
SELECT 
    'High sequential scan ratio on ' || tablename || ' (' || seq_scan_ratio || '%)' as "Recommendation",
    CASE 
        WHEN seq_scan_ratio > 80 THEN 'HIGH PRIORITY ❌'
        WHEN seq_scan_ratio > 50 THEN 'MEDIUM PRIORITY ⚠️'
        ELSE 'LOW PRIORITY ✅'
    END as "Priority"
FROM scan_analysis 
WHERE seq_scan_ratio > 30 AND seq_scan > 100
ORDER BY seq_scan_ratio DESC;

-- Find unused indexes
SELECT 
    'Consider dropping unused index: ' || indexname || ' on ' || tablename as "Recommendation",
    'LOW PRIORITY 💡' as "Priority"
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

\echo ''

-- 7. BULK OPERATIONS HEALTH CHECK
\echo '🏥 BULK OPERATIONS HEALTH CHECK'
\echo '-------------------------------'

-- Check if bulk optimization indexes exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_bulk_ops') 
        THEN '✅ Campaign bulk operations index: PRESENT'
        ELSE '❌ Campaign bulk operations index: MISSING'
    END as "Campaign Indexes";

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaign_jobs_status_priority') 
        THEN '✅ Job queue optimization index: PRESENT'
        ELSE '❌ Job queue optimization index: MISSING'
    END as "Job Queue Indexes";

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_domain_results_bulk_analysis') 
        THEN '✅ Domain results bulk index: PRESENT'
        ELSE '❌ Domain results bulk index: MISSING'
    END as "Domain Results Indexes";

\echo ''
\echo '==================================================================='
\echo 'MONITORING COMPLETE'
\echo '==================================================================='
\echo ''
\echo 'For continuous monitoring, run this script periodically:'
\echo 'psql -d your_database -f backend/scripts/monitor_db_performance.sql'
\echo ''
\echo 'To get real-time performance metrics:'
\echo 'SELECT * FROM pg_stat_activity WHERE state = '\''active'\'';'
\echo 'SELECT * FROM pg_stat_user_tables WHERE schemaname = '\''public'\'';'
