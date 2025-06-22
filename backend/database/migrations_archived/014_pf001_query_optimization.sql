-- PF-001: Database Query Optimization Migration
-- File: backend/database/migrations/014_pf001_query_optimization.sql

BEGIN;

-- Query performance monitoring
CREATE TABLE IF NOT EXISTS query_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    query_sql TEXT NOT NULL,
    query_type VARCHAR(50) NOT NULL,
    table_names VARCHAR[] DEFAULT '{}',
    execution_time_ms DECIMAL(10,3) NOT NULL,
    rows_examined BIGINT DEFAULT 0,
    rows_returned BIGINT DEFAULT 0,
    index_usage JSONB DEFAULT '{}',
    cpu_time_ms DECIMAL(10,3) DEFAULT 0,
    io_wait_ms DECIMAL(10,3) DEFAULT 0,
    lock_wait_ms DECIMAL(10,3) DEFAULT 0,
    buffer_reads BIGINT DEFAULT 0,
    buffer_hits BIGINT DEFAULT 0,
    query_plan JSONB DEFAULT '{}',
    optimization_score DECIMAL(5,2) DEFAULT 0,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_performance_hash ON query_performance_metrics(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_performance_type ON query_performance_metrics(query_type);
CREATE INDEX IF NOT EXISTS idx_query_performance_executed ON query_performance_metrics(executed_at);
CREATE INDEX IF NOT EXISTS idx_query_performance_execution_time ON query_performance_metrics(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_query_performance_optimization_score ON query_performance_metrics(optimization_score);

-- Query optimization recommendations
CREATE TABLE IF NOT EXISTS query_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    recommendation_type VARCHAR(100) NOT NULL,
    current_performance_ms DECIMAL(10,3) NOT NULL,
    estimated_improvement_pct DECIMAL(5,2) NOT NULL,
    optimization_strategy JSONB NOT NULL,
    suggested_indexes TEXT[] DEFAULT '{}',
    query_rewrite_suggestion TEXT,
    implementation_complexity VARCHAR(20) DEFAULT 'medium',
    implementation_priority VARCHAR(20) DEFAULT 'medium',
    implemented BOOLEAN DEFAULT false,
    implemented_at TIMESTAMPTZ,
    validation_results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_optimization_hash ON query_optimization_recommendations(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_optimization_type ON query_optimization_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_query_optimization_priority ON query_optimization_recommendations(implementation_priority);
CREATE INDEX IF NOT EXISTS idx_query_optimization_implemented ON query_optimization_recommendations(implemented);

-- Index usage analytics
CREATE TABLE IF NOT EXISTS index_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    index_name VARCHAR(100) NOT NULL,
    index_type VARCHAR(50) NOT NULL,
    total_scans BIGINT DEFAULT 0,
    tuples_read BIGINT DEFAULT 0,
    tuples_fetched BIGINT DEFAULT 0,
    blocks_read BIGINT DEFAULT 0,
    blocks_hit BIGINT DEFAULT 0,
    index_size_bytes BIGINT DEFAULT 0,
    index_efficiency_pct DECIMAL(5,2) DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    usage_frequency VARCHAR(20) DEFAULT 'unknown',
    recommendation VARCHAR(100),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_index_usage_table ON index_usage_analytics(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_index_usage_name ON index_usage_analytics(index_name);
CREATE INDEX IF NOT EXISTS idx_index_usage_efficiency ON index_usage_analytics(index_efficiency_pct);
CREATE INDEX IF NOT EXISTS idx_index_usage_frequency ON index_usage_analytics(usage_frequency);

-- Slow query log
CREATE TABLE IF NOT EXISTS slow_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    query_sql TEXT NOT NULL,
    execution_time_ms DECIMAL(10,3) NOT NULL,
    waiting_time_ms DECIMAL(10,3) DEFAULT 0,
    rows_examined BIGINT DEFAULT 0,
    rows_returned BIGINT DEFAULT 0,
    query_plan JSONB DEFAULT '{}',
    session_info JSONB DEFAULT '{}',
    application_context JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'warning',
    auto_optimization_attempted BOOLEAN DEFAULT false,
    optimization_result JSONB DEFAULT '{}',
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slow_query_hash ON slow_query_log(query_hash);
CREATE INDEX IF NOT EXISTS idx_slow_query_execution_time ON slow_query_log(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_slow_query_severity ON slow_query_log(severity);
CREATE INDEX IF NOT EXISTS idx_slow_query_logged ON slow_query_log(logged_at);

-- Strategic indexes for domain and campaign operations based on ACTUAL table structure
-- Optimized indexes for generated_domains (using correct table name)
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_created 
    ON generated_domains(domain_generation_campaign_id, generated_at);

CREATE INDEX IF NOT EXISTS idx_generated_domains_domain_name_tld 
    ON generated_domains(domain_name, tld) 
    WHERE tld IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generated_domains_keyword_search 
    ON generated_domains USING gin(to_tsvector('english', domain_name));

CREATE INDEX IF NOT EXISTS idx_generated_domains_offset_index 
    ON generated_domains(domain_generation_campaign_id, offset_index) 
    WHERE offset_index >= 0;

-- Optimized indexes for campaigns operations (using correct column names)
CREATE INDEX IF NOT EXISTS idx_campaigns_status_type_created 
    ON campaigns(status, campaign_type, created_at);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_active 
    ON campaigns(user_id, status) 
    WHERE status IN ('running', 'pending', 'queued') AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_progress_tracking
    ON campaigns(status, progress_percentage, updated_at)
    WHERE progress_percentage IS NOT NULL;

-- Optimized indexes for audit_logs (using correct column names)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_action_timestamp 
    ON audit_logs(entity_type, action, timestamp DESC)
    WHERE entity_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp 
    ON audit_logs(user_id, timestamp DESC) 
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_timestamp
    ON audit_logs(entity_id, timestamp DESC)
    WHERE entity_id IS NOT NULL;

-- Function to record query performance metrics
CREATE OR REPLACE FUNCTION record_query_performance(
    p_query_sql TEXT,
    p_query_type VARCHAR(50),
    p_execution_time_ms DECIMAL(10,3),
    p_rows_examined BIGINT DEFAULT 0,
    p_rows_returned BIGINT DEFAULT 0,
    p_query_plan JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    metric_id UUID;
    query_hash VARCHAR(64);
    optimization_score DECIMAL(5,2);
    table_names VARCHAR[];
BEGIN
    -- Generate query hash for deduplication
    query_hash := encode(sha256(p_query_sql::bytea), 'hex');
    
    -- Calculate optimization score (0-100, higher is better)
    optimization_score := CASE
        WHEN p_execution_time_ms <= 10 THEN 100
        WHEN p_execution_time_ms <= 50 THEN 90
        WHEN p_execution_time_ms <= 100 THEN 80
        WHEN p_execution_time_ms <= 500 THEN 60
        WHEN p_execution_time_ms <= 1000 THEN 40
        WHEN p_execution_time_ms <= 5000 THEN 20
        ELSE 10
    END;
    
    -- Adjust score based on efficiency (rows examined vs returned)
    IF p_rows_examined > 0 AND p_rows_returned > 0 THEN
        optimization_score := optimization_score * (
            LEAST(1.0, p_rows_returned::DECIMAL / p_rows_examined::DECIMAL) * 0.5 + 0.5
        );
    END IF;
    
    -- Extract table names from query plan
    table_names := ARRAY(
        SELECT DISTINCT value::text
        FROM jsonb_array_elements_text(p_query_plan->'tables')
    );
    
    -- Insert performance metrics
    INSERT INTO query_performance_metrics 
        (query_hash, query_sql, query_type, table_names, execution_time_ms,
         rows_examined, rows_returned, query_plan, optimization_score)
    VALUES 
        (query_hash, p_query_sql, p_query_type, table_names, p_execution_time_ms,
         p_rows_examined, p_rows_returned, p_query_plan, optimization_score)
    RETURNING id INTO metric_id;
    
    -- Check if optimization is needed
    PERFORM check_query_optimization_needed(query_hash, p_execution_time_ms, optimization_score);
    
    -- Log slow queries
    IF p_execution_time_ms > 1000 THEN
        INSERT INTO slow_query_log 
            (query_hash, query_sql, execution_time_ms, rows_examined, rows_returned,
             query_plan, severity)
        VALUES 
            (query_hash, p_query_sql, p_execution_time_ms, p_rows_examined, p_rows_returned,
             p_query_plan, 
             CASE WHEN p_execution_time_ms > 5000 THEN 'critical'
                  WHEN p_execution_time_ms > 2000 THEN 'high'
                  ELSE 'warning' END);
    END IF;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if query optimization is needed
CREATE OR REPLACE FUNCTION check_query_optimization_needed(
    p_query_hash VARCHAR(64),
    p_execution_time_ms DECIMAL(10,3),
    p_optimization_score DECIMAL(5,2)
) RETURNS VOID AS $$
DECLARE
    avg_execution_time DECIMAL(10,3);
    execution_count INTEGER;
    recommendation_exists BOOLEAN;
BEGIN
    -- Calculate average execution time for this query
    SELECT AVG(execution_time_ms), COUNT(*)
    INTO avg_execution_time, execution_count
    FROM query_performance_metrics
    WHERE query_hash = p_query_hash
      AND executed_at > NOW() - INTERVAL '1 hour';
    
    -- Check if recommendation already exists
    SELECT EXISTS(
        SELECT 1 FROM query_optimization_recommendations
        WHERE query_hash = p_query_hash
          AND implemented = false
          AND created_at > NOW() - INTERVAL '1 day'
    ) INTO recommendation_exists;
    
    -- Generate recommendations based on performance patterns
    IF NOT recommendation_exists AND execution_count >= 3 THEN
        -- Slow query optimization
        IF avg_execution_time > 1000 THEN
            INSERT INTO query_optimization_recommendations 
                (query_hash, recommendation_type, current_performance_ms,
                 estimated_improvement_pct, optimization_strategy, implementation_priority)
            VALUES (
                p_query_hash,
                'slow_query_optimization',
                avg_execution_time,
                60.0,
                jsonb_build_object(
                    'strategy', 'index_optimization',
                    'reason', 'consistent_slow_performance',
                    'avg_execution_time', avg_execution_time,
                    'execution_count', execution_count
                ),
                CASE WHEN avg_execution_time > 5000 THEN 'critical'
                     WHEN avg_execution_time > 2000 THEN 'high'
                     ELSE 'medium' END
            );
        END IF;
        
        -- Low optimization score
        IF p_optimization_score < 50 THEN
            INSERT INTO query_optimization_recommendations 
                (query_hash, recommendation_type, current_performance_ms,
                 estimated_improvement_pct, optimization_strategy, implementation_priority)
            VALUES (
                p_query_hash,
                'efficiency_optimization',
                avg_execution_time,
                40.0,
                jsonb_build_object(
                    'strategy', 'query_rewrite',
                    'reason', 'low_efficiency_score',
                    'optimization_score', p_optimization_score,
                    'execution_count', execution_count
                ),
                'medium'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze index usage and generate recommendations
CREATE OR REPLACE FUNCTION analyze_index_usage() RETURNS VOID AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Clear old analytics data (keep last 7 days)
    DELETE FROM index_usage_analytics WHERE recorded_at < NOW() - INTERVAL '7 days';
    
    -- Analyze current index usage patterns
    FOR rec IN 
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan as total_scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
    LOOP
        -- Calculate efficiency and generate recommendations
        INSERT INTO index_usage_analytics 
            (schema_name, table_name, index_name, index_type, total_scans,
             tuples_read, tuples_fetched, index_efficiency_pct, usage_frequency, recommendation)
        VALUES (
            rec.schemaname,
            rec.tablename, 
            rec.indexname,
            'btree', -- Default assumption, could be enhanced
            rec.total_scans,
            rec.tuples_read,
            rec.tuples_fetched,
            CASE 
                WHEN rec.total_scans = 0 THEN 0
                WHEN rec.tuples_read = 0 THEN 100
                ELSE LEAST(100, (rec.tuples_fetched::DECIMAL / rec.tuples_read::DECIMAL) * 100)
            END,
            CASE
                WHEN rec.total_scans = 0 THEN 'unused'
                WHEN rec.total_scans < 10 THEN 'low'
                WHEN rec.total_scans < 100 THEN 'medium'
                ELSE 'high'
            END,
            CASE
                WHEN rec.total_scans = 0 THEN 'consider_dropping'
                WHEN rec.tuples_read > rec.tuples_fetched * 10 THEN 'low_selectivity'
                ELSE 'optimal'
            END
        )
        ON CONFLICT (schema_name, table_name, index_name) 
        DO UPDATE SET
            total_scans = EXCLUDED.total_scans,
            tuples_read = EXCLUDED.tuples_read,
            tuples_fetched = EXCLUDED.tuples_fetched,
            index_efficiency_pct = EXCLUDED.index_efficiency_pct,
            usage_frequency = EXCLUDED.usage_frequency,
            recommendation = EXCLUDED.recommendation,
            recorded_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create unique constraint for index analytics to allow upserts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_index_analytics'
    ) THEN
        ALTER TABLE index_usage_analytics 
        ADD CONSTRAINT unique_index_analytics 
        UNIQUE (schema_name, table_name, index_name);
    END IF;
END $$;

COMMIT;
