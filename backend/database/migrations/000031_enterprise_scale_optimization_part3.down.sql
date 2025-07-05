-- ======================================================================
-- ENTERPRISE SCALE DOMAIN OPTIMIZATION - PART 3: ROLLBACK TABLES AND FUNCTIONS
-- ======================================================================

-- Drop cursor pagination functions
DROP FUNCTION IF EXISTS encode_cursor(TEXT, UUID, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS decode_cursor(TEXT);

-- Drop performance monitoring tables
DROP TABLE IF EXISTS query_performance_metrics;
DROP TABLE IF EXISTS connection_pool_metrics;