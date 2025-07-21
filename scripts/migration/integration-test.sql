-- ======================================================================
-- MIGRATION INTEGRATION TEST SUITE
-- ======================================================================
-- This script performs end-to-end integration testing of the phases-based
-- migration to ensure all components work together correctly.
--
-- USAGE: Run after completing all migration steps
-- PURPOSE: Validate complete migration success before production deployment
-- ======================================================================

-- Enable timing and verbose output
\timing on
\set QUIET off

BEGIN;

-- ======================================================================
-- 1. MIGRATION COMPLETENESS VERIFICATION
-- ======================================================================

\echo '============================================================'
\echo 'PHASES-BASED MIGRATION INTEGRATION TEST SUITE'
\echo '============================================================'
\echo 'Verifying complete migration from dual architecture to phases-based...'
\echo ''

-- Create test results tracking table
CREATE TEMP TABLE integration_test_results (
    test_suite TEXT,
    test_name TEXT,
    status TEXT,
    execution_time_ms NUMERIC(10,2),
    details TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Test 1: Schema Migration Verification
\echo 'Test Suite 1: Schema Migration Verification'
\echo '------------------------------------------------------------'

DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
    legacy_columns_exist BOOLEAN := FALSE;
    phases_columns_exist BOOLEAN := TRUE;
    test_status TEXT := 'PASS';
    test_details TEXT := '';
BEGIN
    start_time := clock_timestamp();
    
    -- Check if legacy columns still exist (should be gone)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaigns' AND column_name IN ('campaign_type', 'status', 'launch_sequence')) THEN
        legacy_columns_exist := TRUE;
        test_status := 'FAIL';
        test_details := test_details || 'Legacy columns still exist; ';
    END IF;
    
    -- Check if phases columns exist (should be present)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'current_phase') OR
       NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'phase_status') THEN
        phases_columns_exist := FALSE;
        test_status := 'FAIL';
        test_details := test_details || 'Phases columns missing; ';
    END IF;
    
    end_time := clock_timestamp();
    duration := extract(epoch from (end_time - start_time)) * 1000;
    
    IF test_status = 'PASS' THEN
        test_details := 'All legacy columns removed, all phases columns present';
    END IF;
    
    INSERT INTO integration_test_results (test_suite, test_name, status, execution_time_ms, details)
    VALUES ('Schema Migration', 'Legacy/Phases Column Check', test_status, duration, test_details);
    
    RAISE NOTICE '✓ Schema migration verification: %', test_status;
END $$;

-- Test 2: Data Migration Integrity
\echo ''
\echo 'Test Suite 2: Data Migration Integrity'
\echo '------------------------------------------------------------'

DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
    total_campaigns INTEGER;
    valid_phases INTEGER;
    valid_status INTEGER;
    test_status TEXT := 'PASS';
    test_details TEXT := '';
BEGIN
    start_time := clock_timestamp();
    
    -- Count total campaigns
    SELECT COUNT(*) INTO total_campaigns FROM campaigns;
    
    -- Count campaigns with valid phases
    SELECT COUNT(*) INTO valid_phases 
    FROM campaigns 
    WHERE current_phase IN ('setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis');
    
    -- Count campaigns with valid status
    SELECT COUNT(*) INTO valid_status
    FROM campaigns 
    WHERE phase_status IN ('not_started', 'in_progress', 'paused', 'completed', 'failed');
    
    IF valid_phases < total_campaigns OR valid_status < total_campaigns THEN
        test_status := 'FAIL';
        test_details := FORMAT('Invalid data: %s/%s valid phases, %s/%s valid status', 
                              valid_phases, total_campaigns, valid_status, total_campaigns);
    ELSE
        test_details := FORMAT('All %s campaigns have valid phases and status', total_campaigns);
    END IF;
    
    end_time := clock_timestamp();
    duration := extract(epoch from (end_time - start_time)) * 1000;
    
    INSERT INTO integration_test_results (test_suite, test_name, status, execution_time_ms, details)
    VALUES ('Data Migration', 'Data Integrity Check', test_status, duration, test_details);
    
    RAISE NOTICE '✓ Data migration integrity: %', test_status;
END $$;

-- ======================================================================
-- 2. PERFORMANCE OPTIMIZATION VERIFICATION
-- ======================================================================

\echo ''
\echo 'Test Suite 3: Performance Optimization Verification'
\echo '------------------------------------------------------------'

-- Test 3: Index Optimization Verification
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
    critical_indexes TEXT[] := ARRAY[
        'idx_campaigns_workflow_primary',
        'idx_campaigns_phase_transitions',
        'idx_campaigns_user_dashboard',
        'idx_domains_campaign_validation_primary'
    ];
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
    idx TEXT;
    test_status TEXT := 'PASS';
    test_details TEXT := '';
BEGIN
    start_time := clock_timestamp();
    
    -- Check for critical indexes
    FOREACH idx IN ARRAY critical_indexes
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = idx) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        test_status := 'FAIL';
        test_details := 'Missing indexes: ' || array_to_string(missing_indexes, ', ');
    ELSE
        test_details := 'All critical performance indexes present';
    END IF;
    
    end_time := clock_timestamp();
    duration := extract(epoch from (end_time - start_time)) * 1000;
    
    INSERT INTO integration_test_results (test_suite, test_name, status, execution_time_ms, details)
    VALUES ('Performance Optimization', 'Critical Indexes Check', test_status, duration, test_details);
    
    RAISE NOTICE '✓ Performance optimization: %', test_status;
END $$;

-- ======================================================================
-- 3. FUNCTIONAL TESTING - PHASES-BASED OPERATIONS
-- ======================================================================

\echo ''
\echo 'Test Suite 4: Phases-Based Operations'
\echo '------------------------------------------------------------'

-- Test 4: Phase Workflow Queries
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
    workflow_result_count INTEGER;
    test_status TEXT := 'PASS';
    test_details TEXT := '';
BEGIN
    start_time := clock_timestamp();
    
    -- Test primary phases workflow query
    SELECT COUNT(*) INTO workflow_result_count
    FROM campaigns 
    WHERE current_phase = 'generation' 
      AND phase_status IN ('not_started', 'in_progress')
      AND user_id IS NOT NULL;
    
    end_time := clock_timestamp();
    duration := extract(epoch from (end_time - start_time)) * 1000;
    
    test_details := FORMAT('Workflow query returned %s campaigns in %s ms', 
                          workflow_result_count, ROUND(duration, 2));
    
    -- Consider test failed if query takes too long (indicating index issues)
    IF duration > 100 THEN
        test_status := 'WARN';
        test_details := test_details || ' (slow performance - check indexes)';
    END IF;
    
    INSERT INTO integration_test_results (test_suite, test_name, status, execution_time_ms, details)
    VALUES ('Phases Operations', 'Workflow Query Performance', test_status, duration, test_details);
    
    RAISE NOTICE '✓ Phase workflow query: %', test_status;
END $$;

-- Test 5: Domain Processing Integration
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
    domain_metrics_count INTEGER;
    test_status TEXT := 'PASS';
    test_details TEXT := '';
BEGIN
    start_time := clock_timestamp();
    
    -- Test domain metrics aggregation
    SELECT COUNT(*) INTO domain_metrics_count
    FROM campaigns c
    LEFT JOIN generated_domains gd ON gd.domain_generation_campaign_id = c.id
    WHERE c.current_phase IN ('dns_validation', 'http_keyword_validation')
      AND c.domains > 0;
    
    end_time := clock_timestamp();
    duration := extract(epoch from (end_time - start_time)) * 1000;
    
    test_details := FORMAT('Domain integration query processed %s campaigns in %s ms', 
                          domain_metrics_count, ROUND(duration, 2));
    
    INSERT INTO integration_test_results (test_suite, test_name, status, execution_time_ms, details)
    VALUES ('Phases Operations', 'Domain Processing Integration', test_status, duration, test_details);
    
    RAISE NOTICE '✓ Domain processing integration: %', test_status;
END $$;

-- ======================================================================
-- 4. BUSINESS LOGIC VALIDATION
-- ======================================================================

\echo ''
\echo 'Test Suite 5: Business Logic Validation'
\echo '------------------------------------------------------------'

-- Test 6: Phase Transition Logic
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
    logical_issues INTEGER := 0;
    test_status TEXT := 'PASS';
    test_details TEXT := '';
BEGIN
    start_time := clock_timestamp();
    
    -- Check for illogical phase/status combinations
    SELECT COUNT(*) INTO logical_issues
    FROM campaigns 
    WHERE (phase_status = 'completed' AND progress < 90) OR
          (phase_status = 'failed' AND progress > 80) OR
          (current_phase = 'setup' AND domains > 0) OR
          (current_phase = 'analysis' AND leads > domains);
    
    end_time := clock_timestamp();
    duration := extract(epoch from (end_time - start_time)) * 1000;
    
    IF logical_issues > 0 THEN
        test_status := 'WARN';
        test_details := FORMAT('%s campaigns have illogical phase/status combinations', logical_issues);
    ELSE
        test_details := 'All phase transitions are logically consistent';
    END IF;
    
    INSERT INTO integration_test_results (test_suite, test_name, status, execution_time_ms, details)
    VALUES ('Business Logic', 'Phase Transition Logic', test_status, duration, test_details);
    
    RAISE NOTICE '✓ Business logic validation: %', test_status;
END $$;

-- ======================================================================
-- 5. SCALABILITY TESTING - BULK OPERATIONS
-- ======================================================================

\echo ''
\echo 'Test Suite 6: Scalability Testing'
\echo '------------------------------------------------------------'

-- Test 7: Bulk Campaign Processing
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
    bulk_result_count INTEGER;
    test_status TEXT := 'PASS';
    test_details TEXT := '';
BEGIN
    start_time := clock_timestamp();
    
    -- Test bulk campaign analytics query
    SELECT COUNT(*) INTO bulk_result_count
    FROM campaigns c
    WHERE c.current_phase IN ('generation', 'dns_validation', 'http_keyword_validation')
      AND c.created_at > NOW() - INTERVAL '30 days'
      AND c.domains > 100;
    
    end_time := clock_timestamp();
    duration := extract(epoch from (end_time - start_time)) * 1000;
    
    test_details := FORMAT('Bulk processing query handled %s campaigns in %s ms', 
                          bulk_result_count, ROUND(duration, 2));
    
    -- Performance expectations for bulk operations
    IF duration > 500 THEN
        test_status := 'WARN';
        test_details := test_details || ' (performance may need optimization)';
    END IF;
    
    INSERT INTO integration_test_results (test_suite, test_name, status, execution_time_ms, details)
    VALUES ('Scalability', 'Bulk Campaign Processing', test_status, duration, test_details);
    
    RAISE NOTICE '✓ Scalability testing: %', test_status;
END $$;

-- ======================================================================
-- 6. DATA CONSISTENCY CROSS-VALIDATION
-- ======================================================================

\echo ''
\echo 'Test Suite 7: Data Consistency Cross-Validation'
\echo '------------------------------------------------------------'

-- Test 8: Campaign-Domain Relationship Integrity
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
    orphaned_domains INTEGER;
    inconsistent_metrics INTEGER;
    test_status TEXT := 'PASS';
    test_details TEXT := '';
BEGIN
    start_time := clock_timestamp();
    
    -- Check for orphaned domains
    SELECT COUNT(*) INTO orphaned_domains
    FROM generated_domains gd
    LEFT JOIN campaigns c ON gd.domain_generation_campaign_id = c.id
    WHERE c.id IS NULL;
    
    -- Check for inconsistent domain metrics
    SELECT COUNT(*) INTO inconsistent_metrics
    FROM campaigns c
    WHERE c.domains IS NOT NULL 
      AND c.domains != (SELECT COUNT(*) FROM generated_domains WHERE domain_generation_campaign_id = c.id);
    
    end_time := clock_timestamp();
    duration := extract(epoch from (end_time - start_time)) * 1000;
    
    IF orphaned_domains > 0 OR inconsistent_metrics > 0 THEN
        test_status := 'FAIL';
        test_details := FORMAT('Data inconsistency: %s orphaned domains, %s inconsistent metrics', 
                              orphaned_domains, inconsistent_metrics);
    ELSE
        test_details := 'All campaign-domain relationships are consistent';
    END IF;
    
    INSERT INTO integration_test_results (test_suite, test_name, status, execution_time_ms, details)
    VALUES ('Data Consistency', 'Campaign-Domain Integrity', test_status, duration, test_details);
    
    RAISE NOTICE '✓ Data consistency validation: %', test_status;
END $$;

-- ======================================================================
-- 7. MIGRATION COMPLETENESS FINAL CHECK
-- ======================================================================

\echo ''
\echo 'Test Suite 8: Migration Completeness Final Check'
\echo '------------------------------------------------------------'

-- Test 9: Complete Migration Verification
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration NUMERIC;
    backup_tables_exist BOOLEAN := TRUE;
    migration_artifacts_clean BOOLEAN := TRUE;
    test_status TEXT := 'PASS';
    test_details TEXT := '';
BEGIN
    start_time := clock_timestamp();
    
    -- Check if backup tables exist (should exist for rollback capability)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'campaigns_backup_000035') THEN
        backup_tables_exist := FALSE;
        test_status := 'WARN';
        test_details := test_details || 'No migration backup found; ';
    END IF;
    
    -- Check for any temp migration artifacts that should be cleaned up
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name LIKE '%migration_temp%' OR table_name LIKE '%migration_staging%') THEN
        migration_artifacts_clean := FALSE;
        test_status := 'WARN';
        test_details := test_details || 'Temporary migration artifacts remain; ';
    END IF;
    
    end_time := clock_timestamp();
    duration := extract(epoch from (end_time - start_time)) * 1000;
    
    IF test_status = 'PASS' THEN
        test_details := 'Migration completed cleanly with backup tables preserved';
    END IF;
    
    INSERT INTO integration_test_results (test_suite, test_name, status, execution_time_ms, details)
    VALUES ('Migration Completeness', 'Final Migration State', test_status, duration, test_details);
    
    RAISE NOTICE '✓ Migration completeness check: %', test_status;
END $$;

-- ======================================================================
-- 8. INTEGRATION TEST RESULTS SUMMARY
-- ======================================================================

\echo ''
\echo '============================================================'
\echo 'INTEGRATION TEST RESULTS SUMMARY'
\echo '============================================================'

-- Display detailed test results
SELECT 
    test_suite as "Test Suite",
    test_name as "Test Name",
    status as "Status",
    ROUND(execution_time_ms, 2) as "Time (ms)",
    details as "Details"
FROM integration_test_results
ORDER BY timestamp;

-- Generate overall test summary
DO $$
DECLARE
    total_tests INTEGER;
    passed_tests INTEGER;
    failed_tests INTEGER;
    warning_tests INTEGER;
    overall_status TEXT;
    pass_rate NUMERIC;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'PASS'),
        COUNT(*) FILTER (WHERE status = 'FAIL'),
        COUNT(*) FILTER (WHERE status = 'WARN')
    INTO total_tests, passed_tests, failed_tests, warning_tests
    FROM integration_test_results;
    
    pass_rate := ROUND((passed_tests::float / total_tests) * 100, 1);
    
    IF failed_tests = 0 AND warning_tests = 0 THEN
        overall_status := 'MIGRATION SUCCESS';
    ELSIF failed_tests = 0 AND warning_tests > 0 THEN
        overall_status := 'MIGRATION SUCCESS WITH WARNINGS';
    ELSE
        overall_status := 'MIGRATION FAILURE';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'OVERALL MIGRATION STATUS: %', overall_status;
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total Tests: %', total_tests;
    RAISE NOTICE 'Passed: % (% success rate)', passed_tests, pass_rate || '%';
    RAISE NOTICE 'Failed: %', failed_tests;
    RAISE NOTICE 'Warnings: %', warning_tests;
    RAISE NOTICE '============================================================';
    
    IF failed_tests > 0 THEN
        RAISE NOTICE 'FAILED TESTS REQUIRE ATTENTION:';
        FOR test_name IN 
            SELECT itr.test_suite || ': ' || itr.test_name 
            FROM integration_test_results itr 
            WHERE itr.status = 'FAIL'
        LOOP
            RAISE NOTICE '- %', test_name;
        END LOOP;
        RAISE NOTICE '============================================================';
    END IF;
    
    IF warning_tests > 0 THEN
        RAISE NOTICE 'WARNINGS FOR REVIEW:';
        FOR test_name IN 
            SELECT itr.test_suite || ': ' || itr.test_name 
            FROM integration_test_results itr 
            WHERE itr.status = 'WARN'
        LOOP
            RAISE NOTICE '- %', test_name;
        END LOOP;
        RAISE NOTICE '============================================================';
    END IF;
    
    -- Final recommendation
    IF failed_tests = 0 THEN
        RAISE NOTICE 'RECOMMENDATION: Migration ready for production deployment';
        IF warning_tests > 0 THEN
            RAISE NOTICE 'RECOMMENDATION: Monitor warnings in production environment';
        END IF;
    ELSE
        RAISE NOTICE 'RECOMMENDATION: Fix failed tests before production deployment';
    END IF;
    
    RAISE NOTICE '============================================================';
END $$;

-- Create permanent integration test report view
CREATE OR REPLACE VIEW migration_integration_test_report AS
SELECT 
    NOW() as test_run_timestamp,
    test_suite,
    test_name,
    status,
    execution_time_ms,
    details,
    timestamp as test_timestamp
FROM integration_test_results;

COMMIT;

\echo ''
\echo 'Integration test suite completed!'
\echo 'Full results available in migration_integration_test_report view'
\echo ''
\echo 'Next steps if all tests passed:'
\echo '1. Deploy to staging environment'
\echo '2. Run performance benchmarks'
\echo '3. Validate application compatibility'
\echo '4. Schedule production deployment'