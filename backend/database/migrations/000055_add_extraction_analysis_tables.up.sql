-- Migration: Add Extraction & Analysis Tables for Modular Processing
-- Description: Introduces new tables for domain extraction features and keywords
--              to support the Extraction → Analysis redesign (Phase P0)
-- 
-- This migration is additive and safe - it creates new tables without modifying
-- existing schemas or runtime behavior.

-- Create processing state enum for extraction workflow tracking
CREATE TYPE processing_state AS ENUM (
    'pending',
    'processing', 
    'completed',
    'failed',
    'skipped'
);

-- Table for storing detailed domain feature extraction results
-- Separates feature extraction from analysis for better modularity
CREATE TABLE domain_extraction_features (
    id BIGSERIAL PRIMARY KEY,
    domain_id BIGINT NOT NULL REFERENCES generated_domains(id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    processing_state processing_state NOT NULL DEFAULT 'pending',
    
    -- Feature extraction results
    title TEXT,
    meta_description TEXT,
    headings JSONB,
    content_length INTEGER,
    language_code VARCHAR(10),
    structured_data JSONB,
    social_signals JSONB,
    technical_metrics JSONB,
    
    -- Processing metadata
    extraction_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    extracted_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing detailed keyword extraction and analysis results
-- Enables sophisticated keyword processing separate from main analysis
CREATE TABLE domain_extracted_keywords (
    id BIGSERIAL PRIMARY KEY,
    domain_id BIGINT NOT NULL REFERENCES generated_domains(id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    processing_state processing_state NOT NULL DEFAULT 'pending',
    
    -- Keyword extraction results
    primary_keywords TEXT[],
    secondary_keywords TEXT[],
    keyword_density JSONB,
    semantic_clusters JSONB,
    sentiment_score DECIMAL(5,3),
    relevance_scores JSONB,
    
    -- Processing metadata
    extraction_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    extracted_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance optimization indexes as specified in the redesign plan
-- These support the common query patterns for extraction processing

-- Index for fast lookups by domain when extraction is ready
CREATE INDEX idx_domain_extraction_features_ready 
    ON domain_extraction_features (domain_id) 
    WHERE processing_state = 'completed';

CREATE INDEX idx_domain_extracted_keywords_ready 
    ON domain_extracted_keywords (domain_id) 
    WHERE processing_state = 'completed';

-- Indexes for campaign-level aggregations and monitoring
CREATE INDEX idx_domain_extraction_features_campaign_state 
    ON domain_extraction_features (campaign_id, processing_state);

CREATE INDEX idx_domain_extracted_keywords_campaign_state 
    ON domain_extracted_keywords (campaign_id, processing_state);

-- Add comments for documentation
COMMENT ON TABLE domain_extraction_features IS 'Stores detailed feature extraction results for domains, supporting modular extraction/analysis pipeline';
COMMENT ON TABLE domain_extracted_keywords IS 'Stores detailed keyword extraction and semantic analysis results for domains';
COMMENT ON TYPE processing_state IS 'Enum for tracking extraction processing workflow state';

-- These tables support the new Extraction → Analysis architecture:
-- 
-- TODO Phase P1: Implement FeatureExtractionService to write to domain_extraction_features
-- TODO Phase P2: Implement KeywordExtractionService to write to domain_extracted_keywords  
-- TODO Phase P3: Modify AnalysisService to read from these tables
-- TODO Phase P4: Implement adaptive crawling based on extraction results
-- TODO Phase P5: Implement advanced scoring using detailed extraction data
-- TODO Phase P6: Add batch processing and performance optimizations
-- TODO Phase P7: Migrate legacy feature_vector data and remove dual-write
-- TODO Phase P8: Clean up legacy extraction code and update documentation