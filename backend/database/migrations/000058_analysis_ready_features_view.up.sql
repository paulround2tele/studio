-- Migration: Create analysis_ready_features view
-- Description: SQL view abstraction for clean analysis reads (EXT-39)

-- Create the analysis-ready features view that provides clean interface for analysis service
DROP VIEW IF EXISTS analysis_ready_features;

CREATE VIEW analysis_ready_features AS
SELECT 
    def.campaign_id AS campaign_id,
    def.domain_id   AS domain_id,
    gd.domain_name  AS domain_name,
    def.processing_state AS processing_state,
    
    -- Core metrics
    def.kw_unique_count,
    def.kw_total_occurrences,
    def.kw_weight_sum,
    def.content_richness_score,
    
    -- Advanced features
    def.kw_top3,
    def.kw_signal_distribution,
    def.microcrawl_gain_ratio,
    def.is_parked,
    def.parked_confidence,
    
    -- Full feature vector for analysis
    def.feature_vector,
    
    -- Metadata
    def.content_bytes,
    def.page_lang,
    def.http_status_code,
    def.is_stale_score,
    def.updated_at
    
FROM domain_extraction_features def
JOIN generated_domains gd ON gd.id = def.domain_id
WHERE def.processing_state = 'ready'
    AND def.feature_vector IS NOT NULL;

-- Add indexes to support the view performance
CREATE INDEX IF NOT EXISTS idx_analysis_ready_features_campaign_ready
    ON domain_extraction_features (campaign_id, processing_state)
    WHERE processing_state = 'ready' AND feature_vector IS NOT NULL;

-- Index for momentum queries (campaign_id, updated_at)
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_momentum
    ON domain_extraction_features (campaign_id, updated_at DESC)
    WHERE processing_state = 'ready';

-- Add comment
COMMENT ON VIEW analysis_ready_features IS 'Analysis-ready feature view (extracted_at omitted; not in canonical table) filtering to ready domains with feature vectors';