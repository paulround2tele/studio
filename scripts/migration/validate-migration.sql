-- ======================================================================
-- MIGRATION VALIDATION SCRIPT
-- ======================================================================
-- This script performs comprehensive validation of the phases-based
-- migration to ensure data integrity and performance targets are met.
--
-- USAGE: Run after migration 000035 and data migration scripts
-- SAFETY: Read-only validation - safe to run multiple times
-- ======================================================================

-- Set transaction isolation for consistent reads
SET default_transaction_isolation = 'read committed';

BEGIN;

-- ======================================================================
-- 1. SCHEMA VALIDATION: Verify phases-based schema is correct
-- ======================================================================

\echo '============================================================'
\echo 'PHASES-BASED MIGRATION VALIDATION'
\echo '============================================================'

-- Check that legacy columns are removed
DO $$
DECLARE
    legacy_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for legacy campaign_type column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaigns' AND column_name = 'campaign_type') THEN
        legacy_columns := array_append(legacy_columns, 'campaign_type');
    END IF;
    
    -- Check for legacy status column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaigns' AND column_name = 'status') THEN
        legacy_columns := array_append(legacy_columns, 'status');
    END IF;
    
    -- Check for legacy launch_sequence column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaigns' AND column_name = 'launch_sequence') THEN
        legacy_columns := array_append(legacy_columns, 'launch_sequence');
    END IF;
    
    IF array_length(legacy_columns, 1) > 0 THEN
        RAISE WARNING 'Legacy columns still exist: %', array_to_string(legacy_columns, ', ');
        RAISE EXCEPTION 'Schema validation failed: Legacy dual architecture columns found';
    ELSE
        RAISE NOTICE '✓ Schema validation passed: All legacy columns removed';
    END IF;
END $$;

-- Check that phases-based columns exist with correct constraints
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    constraint_issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for current_phase column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'current_phase') THEN
        missing_columns := array_append(missing_columns, 'current_phase');
    END IF;
    
    -- Check for phase_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'phase_status') THEN
        missing_columns := array_append(missing_columns, 'phase_status');
    END IF;
    
    -- Check for progress column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'progress') THEN
        missing_columns := array_append(missing_columns, 'progress');
    END IF;
    
    -- Check for domain metrics columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'domains') THEN
        missing_columns := array_append(missing_columns, 'domains');
    END IF;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Schema validation failed: Missing phases-based columns: %', 
                        array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✓ Schema validation passed: All phases-based columns present';
    END IF;
END $$;

-- ======================================================================
-- 2. DATA INTEGRITY VALIDATION: Verify all data is valid
-- ======================================================================

\echo ''
\echo 'DATA INTEGRITY VALIDATION'
\echo '============================================================'

-- Create validation results table
CREATE TEMP TABLE validation_results (
    test_name TEXT PRIMARY KEY,
    total_records INTEGER,
    valid_records INTEGER,
    invalid_records INTEGER,
    success_rate DECIMAL(5,2),
    status TEXT,
    details TEXT
);

-- Test 1: All campaigns have valid current_phase values
INSERT INTO validation_results (test_name, total_records, valid_records, invalid_records, success_rate, status, details)
SELECT 
    'current_phase_validation',
    COUNT(*),
    COUNT(*) FILTER (WHERE current_phase IN ('setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis')),
    COUNT(*) FILTER (WHERE current_phase IS NULL OR current_phase NOT IN ('setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis')),
    ROUND((COUNT(*) FILTER (WHERE current_phase IN ('setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis'))::float / NULLIF(COUNT(*), 0)) * 100, 2),
    CASE 
        WHEN COUNT(*) FILTER (WHERE current_phase IS NULL OR current_phase NOT IN ('setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis')) = 0 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END,
    'Valid phases: setup, generation, dns_validation, http_keyword_validation, analysis'
FROM campaigns;

-- Test 2: All campaigns have valid phase_status values
INSERT INTO validation_results (test_name, total_records, valid_records, invalid_records, success_rate, status, details)
SELECT 
    'phase_status_validation',
    COUNT(*),
    COUNT(*) FILTER (WHERE phase_status IN ('not_started', 'in_progress', 'paused', 'completed', 'failed')),
    COUNT(*) FILTER (WHERE phase_status IS NULL OR phase_status NOT IN ('not_started', 'in_progress', 'paused', 'completed', 'failed')),
    ROUND((COUNT(*) FILTER (WHERE phase_status IN ('not_started', 'in_progress', 'paused', 'completed', 'failed'))::float / NULLIF(COUNT(*), 0)) * 100, 2),
    CASE 
        WHEN COUNT(*) FILTER (WHERE phase_status IS NULL OR phase_status NOT IN ('not_started', 'in_progress', 'paused', 'completed', 'failed')) = 0 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END,
    'Valid statuses: not_started, in_progress, paused, completed, failed'
FROM campaigns;

-- Test 3: All campaigns have valid progress values (0-100)
INSERT INTO validation_results (test_name, total_records, valid_records, invalid_records, success_rate, status, details)
SELECT 
    'progress_validation',
    COUNT(*),
    COUNT(*) FILTER (WHERE progress IS NULL OR (progress >= 0 AND progress <= 100)),
    COUNT(*) FILTER (WHERE progress IS NOT NULL AND (progress < 0 OR progress > 100)),
    ROUND((COUNT(*) FILTER (WHERE progress IS NULL OR (progress >= 0 AND progress <= 100))::float / NULLIF(COUNT(*), 0)) * 100, 2),
    CASE 
        WHEN COUNT(*) FILTER (WHERE progress IS NOT NULL AND (progress < 0 OR progress > 100)) = 0 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END,
    'Progress must be NULL or between 0 and 100'
FROM campaigns;

-- Test 4: Domain metrics are non-negative
INSERT INTO validation_results (test_name, total_records, valid_records, invalid_records, success_rate, status, details)
SELECT 
    'domain_metrics_validation',
    COUNT(*),
    COUNT(*) FILTER (WHERE 
        (domains IS NULL OR domains >= 0) AND
        (leads IS NULL OR leads >= 0) AND
        (dns_validated_domains IS NULL OR dns_validated_domains >= 0) AND
        (http_validated_domains IS NULL OR http_validated_domains >= 0)
    ),
    COUNT(*) FILTER (WHERE 
        (domains IS NOT NULL AND domains < 0) OR
        (leads IS NOT NULL AND leads < 0) OR
        (dns_validated_domains IS NOT NULL AND dns_validated_domains < 0) OR
        (http_validated_domains IS NOT NULL AND http_validated_domains < 0)
    ),
    ROUND((COUNT(*) FILTER (WHERE 
        (domains IS NULL OR domains >= 0) AND
        (leads IS NULL OR leads >= 0) AND
        (dns_validated_domains IS NULL OR dns_validated_domains >= 0) AND
        (http_validated_domains IS NULL OR http_validated_domains >= 0)
    )::float / NULLIF(COUNT(*), 0)) * 100, 2),
    CASE 
        WHEN COUNT(*) FILTER (WHERE 
            (domains IS NOT NULL AND domains < 0) OR
            (leads IS NOT NULL AND leads < 0) OR
            (dns_validated_domains IS NOT NULL AND dns_validated_domains < 0) OR
            (http_validated_domains IS NOT NULL AND http_validated_domains < 0)
        ) = 0 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END,
    'All domain metrics must be non-negative'
FROM campaigns;

-- Test 5: Validate domain metrics consistency
INSERT INTO validation_results (test_name, total_records, valid_records, invalid_records, success_rate, status, details)
SELECT 
    'domain_metrics_consistency',
    COUNT(*),
    COUNT(*) FILTER (WHERE 
        (domains IS NULL OR leads IS NULL OR leads <= domains) AND
        (domains IS NULL OR dns_validated_domains IS NULL OR dns_validated_domains <= domains) AND
        (domains IS NULL OR http_validated_domains IS NULL OR http_validated_domains <= domains)
    ),
    COUNT(*) FILTER (WHERE 
        (domains IS NOT NULL AND leads IS NOT NULL AND leads > domains) OR
        (domains IS NOT NULL AND dns_validated_domains IS NOT NULL AND dns_validated_domains > domains) OR
        (domains IS NOT NULL AND http_validated_domains IS NOT NULL AND http_validated_domains > domains)
    ),
    ROUND((COUNT(*) FILTER (WHERE 
        (domains IS NULL OR leads IS NULL OR leads <= domains) AND
        (domains IS NULL OR dns_validated_domains IS NULL OR dns_validated_domains <= domains) AND
        (domains IS NULL OR http_validated_domains IS NULL OR http_validated_domains <= domains)
    )::float / NULLIF(COUNT(*), 0)) * 100, 2),
    CASE 
        WHEN COUNT(*) FILTER (WHERE 
            (domains IS NOT NULL AND leads IS NOT NULL AND leads > domains) OR
            (domains IS NOT NULL AND dns_validated_domains IS NOT NULL AND dns_validated_domains > domains) OR
            (domains IS NOT NULL AND http_validated_domains IS NOT NULL AND http_validated_domains > domains)
        ) = 0 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END,
    'Leads, DNS validated, and HTTP validated counts must not exceed total domains'
FROM campaigns;

-- Display validation results
\echo ''
SELECT 
    test_name as "Test Name",
    total_records as "Total",
    valid_records as "Valid", 
    invalid_records as "Invalid",
    success_rate as "Success %",
    status as "Status",
    details as "Details"
FROM validation_results
ORDER BY test_name;

-- ======================================================================
-- 3. PERFORMANCE VALIDATION: Check index and query performance
-- ======================================================================

\echo ''
\echo 'PERFORMANCE VALIDATION'
\echo '============================================================'

-- Test phases-based indexes exist
DO $$
DECLARE
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
    critical_indexes TEXT[] := ARRAY[
        'idx_campaigns_workflow_primary',
        'idx_campaigns_phase_transitions', 
        'idx_campaigns_user_dashboard',
        'idx_domains_campaign_validation_primary'
    ];
    idx TEXT;
BEGIN
    FOREACH idx IN ARRAY critical_indexes
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = idx) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING 'Missing critical indexes: %', array_to_string(missing_indexes, ', ');
        RAISE EXCEPTION 'Performance validation failed: Critical indexes missing';
    ELSE
        RAISE NOTICE '✓ Performance validation passed: All critical indexes present';
    END IF;
END $$;

-- Test query performance with EXPLAIN ANALYZE (sample queries)
\echo ''
\echo 'Sample Query Performance Analysis:'
\echo '============================================================'

-- Test 1: Phase workflow query performance
\echo 'Test 1: Phase workflow query (most common pattern)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT id, name, current_phase, phase_status, progress, domains 
FROM campaigns 
WHERE current_phase = 'generation' 
  AND phase_status = 'in_progress' 
  AND user_id IS NOT NULL
LIMIT 10;

-- Test 2: User dashboard query performance  
\echo ''
\echo 'Test 2: User dashboard query'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT c.id, c.name, c.current_phase, c.phase_status, c.progress, c.domains, c.leads
FROM campaigns c
WHERE c.user_id IS NOT NULL 
  AND c.phase_status IN ('in_progress', 'completed')
ORDER BY c.updated_at DESC
LIMIT 20;

-- Test 3: Domain validation query performance
\echo ''
\echo 'Test 3: Domain validation lookup'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT gd.domain_name, gd.dns_status, gd.http_status, gd.lead_score
FROM generated_domains gd
WHERE gd.domain_generation_campaign_id IN (
    SELECT id FROM campaigns WHERE current_phase = 'dns_validation'
)
AND gd.dns_status = 'pending'
LIMIT 100;

-- ======================================================================
-- 4. MIGRATION COMPLETENESS: Verify no data loss
-- ======================================================================

\echo ''
\echo 'MIGRATION COMPLETENESS VALIDATION'
\echo '============================================================'

-- Compare with backup tables if they exist
DO $$
DECLARE
    backup_exists BOOLEAN;
    original_count INTEGER := 0;
    migrated_count INTEGER := 0;
    data_loss_count INTEGER := 0;
BEGIN
    -- Check if backup table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'campaigns_pre_migration_backup'
    ) INTO backup_exists;
    
    IF backup_exists THEN
        -- Count original campaigns
        SELECT COUNT(*) INTO original_count FROM campaigns_pre_migration_backup;
        
        -- Count migrated campaigns  
        SELECT COUNT(*) INTO migrated_count FROM campaigns;
        
        data_loss_count := original_count - migrated_count;
        
        RAISE NOTICE 'Migration completeness check:';
        RAISE NOTICE '- Original campaigns: %', original_count;
        RAISE NOTICE '- Migrated campaigns: %', migrated_count;
        RAISE NOTICE '- Data loss count: %', data_loss_count;
        
        IF data_loss_count > 0 THEN
            RAISE WARNING 'Data loss detected: % campaigns missing after migration', data_loss_count;
        ELSE
            RAISE NOTICE '✓ Migration completeness passed: No data loss detected';
        END IF;
    ELSE
        RAISE NOTICE 'No backup table found - skipping completeness check';
    END IF;
END $$;

-- ======================================================================
-- 5. BUSINESS LOGIC VALIDATION: Verify phase transitions make sense  
-- ======================================================================

\echo ''
\echo 'BUSINESS LOGIC VALIDATION'
\echo '============================================================'

-- Check for logical phase/status combinations
WITH phase_status_analysis AS (
    SELECT 
        current_phase,
        phase_status,
        COUNT(*) as campaign_count,
        AVG(progress) as avg_progress,
        AVG(domains) as avg_domains
    FROM campaigns
    WHERE current_phase IS NOT NULL AND phase_status IS NOT NULL
    GROUP BY current_phase, phase_status
)
SELECT 
    current_phase as "Phase",
    phase_status as "Status", 
    campaign_count as "Count",
    ROUND(avg_progress, 1) as "Avg Progress %",
    ROUND(avg_domains, 0) as "Avg Domains"
FROM phase_status_analysis
ORDER BY current_phase, phase_status;

-- Check for suspicious progress values
\echo ''
\echo 'Suspicious Progress Analysis:'
\echo '============================================================'

SELECT 
    'Completed campaigns with low progress' as issue_type,
    COUNT(*) as count
FROM campaigns 
WHERE phase_status = 'completed' AND progress < 90

UNION ALL

SELECT 
    'Failed campaigns with high progress' as issue_type,
    COUNT(*) as count  
FROM campaigns
WHERE phase_status = 'failed' AND progress > 50

UNION ALL

SELECT 
    'In-progress campaigns with 100% progress' as issue_type,
    COUNT(*) as count
FROM campaigns
WHERE phase_status = 'in_progress' AND progress >= 100;

-- ======================================================================
-- 6. FINAL VALIDATION SUMMARY
-- ======================================================================

\echo ''
\echo 'VALIDATION SUMMARY'
\echo '============================================================'

-- Overall validation status
DO $$
DECLARE
    total_tests INTEGER;
    passed_tests INTEGER;
    failed_tests INTEGER;
    overall_status TEXT;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'PASS'),
        COUNT(*) FILTER (WHERE status = 'FAIL')
    INTO total_tests, passed_tests, failed_tests
    FROM validation_results;
    
    IF failed_tests = 0 THEN
        overall_status := 'MIGRATION VALIDATION PASSED';
    ELSE
        overall_status := 'MIGRATION VALIDATION FAILED';
    END IF;
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE '%', overall_status;
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total tests: %', total_tests;
    RAISE NOTICE 'Passed tests: %', passed_tests;
    RAISE NOTICE 'Failed tests: %', failed_tests;
    
    IF failed_tests > 0 THEN
        RAISE NOTICE 'FAILED TESTS:';
        FOR test_name IN 
            SELECT vr.test_name FROM validation_results vr WHERE vr.status = 'FAIL'
        LOOP
            RAISE NOTICE '- %', test_name;
        END LOOP;
        RAISE NOTICE '============================================================';
        RAISE EXCEPTION 'Migration validation failed - % test(s) failed', failed_tests;
    ELSE
        RAISE NOTICE 'All validation tests passed successfully!';
        RAISE NOTICE '============================================================';
    END IF;
END $$;

-- Create validation report for future reference
CREATE OR REPLACE VIEW migration_validation_report AS
SELECT 
    NOW() as validation_timestamp,
    test_name,
    total_records,
    valid_records,
    invalid_records,
    success_rate,
    status,
    details
FROM validation_results;

COMMIT;

\echo ''
\echo 'Migration validation completed successfully!'
\echo 'Check migration_validation_report view for detailed results.'