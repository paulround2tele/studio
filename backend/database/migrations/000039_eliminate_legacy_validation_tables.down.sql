-- ======================================================================
-- ELIMINATE LEGACY VALIDATION TABLES MIGRATION (DOWN/ROLLBACK)
-- ======================================================================
-- This migration restores dns_validation_results and http_keyword_results
-- tables for emergency rollback purposes.
-- 
-- WARNING: This rollback will restore dual architecture conflicts
-- USE ONLY in emergency situations
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. RECREATE DNS VALIDATION RESULTS TABLE
-- ======================================================================
CREATE TABLE IF NOT EXISTS dns_validation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dns_campaign_id uuid NOT NULL,
    generated_domain_id uuid,
    domain_name text NOT NULL,
    validation_status text NOT NULL,
    dns_records jsonb,
    validated_by_persona_id uuid,
    attempts integer DEFAULT 0,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    business_status text,
    CONSTRAINT chk_dns_business_status_valid CHECK (((business_status IS NULL) OR (business_status = ANY (ARRAY['valid_dns'::text, 'lead_valid'::text, 'http_valid_no_keywords'::text, 'cancelled_during_processing'::text, 'invalid_http_response_error'::text, 'invalid_http_code'::text, 'processing_failed_before_http'::text])))),
    CONSTRAINT chk_dns_validation_status_valid CHECK ((validation_status = ANY (ARRAY['pending'::text, 'resolved'::text, 'unresolved'::text, 'timeout'::text, 'error'::text]))),
    CONSTRAINT dns_validation_results_attempts_check CHECK ((attempts >= 0))
);

-- ======================================================================
-- 2. RECREATE HTTP KEYWORD RESULTS TABLE
-- ======================================================================
CREATE TABLE IF NOT EXISTS http_keyword_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    http_keyword_campaign_id uuid NOT NULL,
    dns_result_id uuid,
    domain_name text NOT NULL,
    validation_status text NOT NULL,
    http_status_code integer,
    response_headers jsonb,
    page_title text,
    extracted_content_snippet text,
    found_keywords_from_sets jsonb,
    found_ad_hoc_keywords jsonb,
    content_hash text,
    validated_by_persona_id uuid,
    used_proxy_id uuid,
    attempts integer DEFAULT 0,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    business_status text,
    CONSTRAINT chk_http_business_status_valid CHECK ((business_status = ANY (ARRAY['lead_valid'::text, 'http_valid_no_keywords'::text, 'invalid_http_response_error'::text, 'invalid_http_code'::text, 'processing_failed_before_http'::text, 'cancelled_during_processing'::text]))),
    CONSTRAINT chk_http_validation_status_valid CHECK ((validation_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'timeout'::text, 'error'::text])))
);

-- ======================================================================
-- 3. ADD PRIMARY KEYS AND INDEXES
-- ======================================================================
ALTER TABLE ONLY dns_validation_results ADD CONSTRAINT dns_validation_results_pkey PRIMARY KEY (id);
ALTER TABLE ONLY http_keyword_results ADD CONSTRAINT http_keyword_results_pkey PRIMARY KEY (id);

-- Basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_campaign_id ON dns_validation_results(dns_campaign_id);
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_domain_name ON dns_validation_results(domain_name);
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_campaign_id ON http_keyword_results(http_keyword_campaign_id);
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_domain_name ON http_keyword_results(domain_name);

-- ======================================================================
-- 4. VALIDATION: Confirm rollback
-- ======================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'dns_validation_results') THEN
        RAISE EXCEPTION 'Rollback failed: dns_validation_results table not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'http_keyword_results') THEN
        RAISE EXCEPTION 'Rollback failed: http_keyword_results table not created';
    END IF;
    
    RAISE NOTICE 'Legacy validation tables restored - DUAL ARCHITECTURE CONFLICT REINTRODUCED';
END $$;

COMMIT;

-- ======================================================================
-- ROLLBACK COMPLETE - DUAL ARCHITECTURE RESTORED
-- ======================================================================
-- WARNING: This creates data conflicts again
-- Backend services will need to handle both table systems
-- Consider re-running forward migration after fixing issues
-- ======================================================================