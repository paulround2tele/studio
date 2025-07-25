-- Keyword Management Schema
-- Based on Go models: KeywordSet, KeywordRule

-- Keyword sets table for collections of keyword rules
CREATE TABLE IF NOT EXISTS keyword_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- JSONB column for storing rules directly (optional approach)
    rules JSONB
);

-- Keyword rules table for specific rules within keyword sets
CREATE TABLE IF NOT EXISTS keyword_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_set_id UUID NOT NULL REFERENCES keyword_sets(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL,
    rule_type keyword_rule_type_enum NOT NULL,
    is_case_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    category VARCHAR(100),
    context_chars INTEGER NOT NULL DEFAULT 0 CHECK (context_chars >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HTTP keyword campaign parameters table
CREATE TABLE IF NOT EXISTS http_keyword_campaign_params (
    campaign_id UUID PRIMARY KEY REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    source_campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    keyword_set_ids UUID[], -- Array of keyword set IDs
    ad_hoc_keywords TEXT[], -- Array of ad hoc keywords
    persona_ids UUID[] NOT NULL, -- Array of persona IDs
    proxy_ids UUID[], -- Array of proxy IDs
    proxy_pool_id UUID REFERENCES proxy_pools(id) ON DELETE SET NULL,
    proxy_selection_strategy VARCHAR(50),
    rotation_interval_seconds INTEGER CHECK (rotation_interval_seconds >= 0),
    processing_speed_per_minute INTEGER CHECK (processing_speed_per_minute >= 0),
    batch_size INTEGER CHECK (batch_size > 0),
    retry_attempts INTEGER CHECK (retry_attempts >= 0),
    target_http_ports INTEGER[],
    last_processed_domain_name VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for keyword sets table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_sets_name ON keyword_sets(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_sets_is_enabled ON keyword_sets(is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_sets_created_at ON keyword_sets(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_sets_updated_at ON keyword_sets(updated_at);

-- GIN index for keyword sets rules JSONB
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_sets_rules_gin ON keyword_sets USING GIN(rules) WHERE rules IS NOT NULL;

-- Indexes for keyword rules table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_keyword_set_id ON keyword_rules(keyword_set_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_rule_type ON keyword_rules(rule_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_pattern ON keyword_rules(pattern);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_category ON keyword_rules(category) WHERE category IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_is_case_sensitive ON keyword_rules(is_case_sensitive);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_created_at ON keyword_rules(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_updated_at ON keyword_rules(updated_at);

-- Composite indexes for keyword rules queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_set_type ON keyword_rules(keyword_set_id, rule_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_set_pattern ON keyword_rules(keyword_set_id, pattern);

-- Indexes for HTTP keyword campaign parameters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_source_campaign_id ON http_keyword_campaign_params(source_campaign_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_source_type ON http_keyword_campaign_params(source_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_proxy_pool_id ON http_keyword_campaign_params(proxy_pool_id) WHERE proxy_pool_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_created_at ON http_keyword_campaign_params(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_updated_at ON http_keyword_campaign_params(updated_at);

-- GIN indexes for array columns in HTTP keyword parameters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_keyword_set_ids_gin ON http_keyword_campaign_params USING GIN(keyword_set_ids) WHERE keyword_set_ids IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_ad_hoc_keywords_gin ON http_keyword_campaign_params USING GIN(ad_hoc_keywords) WHERE ad_hoc_keywords IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_persona_ids_gin ON http_keyword_campaign_params USING GIN(persona_ids);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_proxy_ids_gin ON http_keyword_campaign_params USING GIN(proxy_ids) WHERE proxy_ids IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_target_ports_gin ON http_keyword_campaign_params USING GIN(target_http_ports) WHERE target_http_ports IS NOT NULL;

-- GIN index for HTTP keyword parameters metadata JSONB
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_http_keyword_params_metadata_gin ON http_keyword_campaign_params USING GIN(metadata) WHERE metadata IS NOT NULL;

-- Add foreign key constraints for keyword set references in HTTP keyword parameters
-- Note: We cannot add FK constraints for UUID arrays directly in PostgreSQL
-- These would need to be enforced at the application level or through triggers

-- Add check constraint to ensure keyword_set_ids references valid keyword sets
-- This is a simplified approach - more complex validation could be done with triggers
ALTER TABLE http_keyword_campaign_params 
ADD CONSTRAINT chk_http_keyword_params_arrays_not_empty 
CHECK (
    (keyword_set_ids IS NULL OR array_length(keyword_set_ids, 1) > 0) AND
    (ad_hoc_keywords IS NULL OR array_length(ad_hoc_keywords, 1) > 0) AND
    (persona_ids IS NOT NULL AND array_length(persona_ids, 1) > 0) AND
    (proxy_ids IS NULL OR array_length(proxy_ids, 1) > 0) AND
    (target_http_ports IS NULL OR array_length(target_http_ports, 1) > 0)
);

-- Unique constraint to prevent duplicate keyword rules within a set
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_set_pattern_unique 
ON keyword_rules(keyword_set_id, pattern, rule_type, is_case_sensitive);