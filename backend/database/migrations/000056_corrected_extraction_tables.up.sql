-- Migration: Add Corrected Extraction & Analysis Tables for Modular Processing (UUID-based)
-- Description: Introduces new tables for domain extraction features and keywords
--              to support the Extraction → Analysis redesign (Phase P0)

-- Create extraction processing state enum for extraction workflow tracking
-- Note: We use a different enum name to avoid conflicts with existing processing_state
CREATE TYPE extraction_processing_state AS ENUM (
    'pending',
    'building', 
    'ready',
    'error',
    'stale'
);

-- Table for storing detailed domain feature extraction results
-- Separates feature extraction from analysis for better modularity
CREATE TABLE IF NOT EXISTS domain_extraction_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES generated_domains(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    domain_name TEXT,
    processing_state extraction_processing_state NOT NULL DEFAULT 'pending',
    attempt_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    
    -- HTTP fetch metrics
    http_status TEXT,
    http_status_code INT,
    fetch_time_ms INT,
    content_hash TEXT,
    content_bytes INT,
    page_lang TEXT,
    
    -- Feature extraction results (compatible with existing feature_vector)
    kw_unique_count INT,
    kw_total_occurrences INT,
    kw_weight_sum DOUBLE PRECISION,
    kw_top3 JSONB,
    kw_signal_distribution JSONB,
    content_richness_score DOUBLE PRECISION,
    
    -- Microcrawl features
    microcrawl_enabled BOOLEAN,
    microcrawl_pages INT,
    microcrawl_base_kw_count INT,
    microcrawl_added_kw_count INT,
    microcrawl_gain_ratio DOUBLE PRECISION,
    diminishing_returns BOOLEAN,
    
    -- Parking detection
    is_parked BOOLEAN,
    parked_confidence DOUBLE PRECISION,
    
    -- Scoring
    is_stale_score BOOLEAN DEFAULT FALSE,
    
    -- Processing metadata
    extracted_at TIMESTAMP WITH TIME ZONE,
    feature_vector JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing detailed keyword extraction results
CREATE TABLE IF NOT EXISTS domain_extracted_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES generated_domains(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    processing_state extraction_processing_state NOT NULL DEFAULT 'pending',
    
    -- Keyword extraction results
    keyword_id TEXT NOT NULL,
    keyword_text TEXT NOT NULL,
    frequency INT NOT NULL DEFAULT 0,
    weight DOUBLE PRECISION,
    position_avg DOUBLE PRECISION,
    sentiment_score DOUBLE PRECISION,
    relevance_score DOUBLE PRECISION,
    source_type TEXT, -- 'page_title', 'h1', 'h2', 'content', 'meta', 'microcrawl'
    
    -- Processing metadata
    extracted_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate keywords per domain
    UNIQUE(domain_id, keyword_id)
);

-- Performance optimization indexes as specified in the redesign plan
-- Index for fast lookups by domain when extraction is ready
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_ready 
    ON domain_extraction_features (domain_id) 
    WHERE processing_state = 'ready'::extraction_processing_state;

CREATE INDEX IF NOT EXISTS idx_domain_extracted_keywords_ready 
    ON domain_extracted_keywords (domain_id) 
    WHERE processing_state = 'ready'::extraction_processing_state;

-- Indexes for campaign-level aggregations and monitoring
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_campaign_state 
    ON domain_extraction_features (campaign_id, processing_state);

CREATE INDEX IF NOT EXISTS idx_domain_extracted_keywords_campaign_state 
    ON domain_extracted_keywords (campaign_id, processing_state);

-- Performance index for domain lookup with state filtering (partial index)
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_domain_ready
    ON domain_extraction_features (domain_id, campaign_id) 
    WHERE processing_state = 'ready'::extraction_processing_state;

-- Index for stale score detection and cleanup
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_stale
    ON domain_extraction_features (campaign_id, is_stale_score, updated_at)
    WHERE is_stale_score = TRUE;

-- Add updated_at trigger for domain_extraction_features
CREATE OR REPLACE FUNCTION update_domain_extraction_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER domain_extraction_features_updated_at_trigger
    BEFORE UPDATE ON domain_extraction_features
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_extraction_features_updated_at();

-- Add updated_at trigger for domain_extracted_keywords
CREATE OR REPLACE FUNCTION update_domain_extracted_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER domain_extracted_keywords_updated_at_trigger
    BEFORE UPDATE ON domain_extracted_keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_extracted_keywords_updated_at();

-- Add comments for documentation
COMMENT ON TABLE domain_extraction_features IS 'Stores detailed feature extraction results for domains, supporting modular extraction/analysis pipeline with UUID-based foreign keys';
COMMENT ON TABLE domain_extracted_keywords IS 'Stores detailed keyword extraction and semantic analysis results for domains';
COMMENT ON TYPE extraction_processing_state IS 'Enum for tracking extraction processing workflow state (pending->building->ready/error/stale)';