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

-- HTTP keyword campaign parameters are stored in campaign_phases.configuration JSONB
-- This follows the phase-centric architecture where parameters are not separate tables

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

-- HTTP keyword campaign parameters are stored in campaign_phases.configuration JSONB
-- No separate table or indexes needed - parameters are queried via JSONB operations

-- Unique constraint to prevent duplicate keyword rules within a set
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_keyword_rules_set_pattern_unique 
ON keyword_rules(keyword_set_id, pattern, rule_type, is_case_sensitive);