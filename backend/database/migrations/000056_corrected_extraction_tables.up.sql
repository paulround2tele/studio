-- REWRITTEN MIGRATION (Corrected incremental form)
-- This migration originally attempted to recreate extraction tables with a new enum and schema.
-- The canonical extraction schema was established in 000055_extraction_feature_tables.* using
-- extraction_processing_state_enum and composite PKs. We convert this migration into a strictly
-- incremental addition of missing indexes / triggers / comments, idempotent and safe.

-- 1. Ensure required indexes (skip those already created in 000055)
--    000055 already created:
--      idx_domain_extraction_features_ready_campaign
--      idx_domain_extraction_features_stale_campaign
--      idx_domain_extracted_keywords_campaign_keyword
--    We add additional helpful indexes only if absent.

-- Fast lookup by domain for ready rows
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_ready 
    ON domain_extraction_features (domain_id) 
    WHERE processing_state = 'ready';


-- Aggregation indexes
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_campaign_state 
    ON domain_extraction_features (campaign_id, processing_state);


-- Domain + campaign partial ready index
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_domain_ready
    ON domain_extraction_features (domain_id, campaign_id) 
    WHERE processing_state = 'ready';

-- Stale score extended index (different from existing *_stale_campaign)
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_stale
    ON domain_extraction_features (campaign_id, is_stale_score, updated_at)
    WHERE is_stale_score = TRUE;

-- 2. Triggers to maintain updated_at (created unconditionally; migration runs once)
CREATE OR REPLACE FUNCTION update_domain_extraction_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_extraction_features_updated_at_trigger
    BEFORE UPDATE ON domain_extraction_features
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_extraction_features_updated_at();

CREATE OR REPLACE FUNCTION update_domain_extracted_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_extracted_keywords_updated_at_trigger
    BEFORE UPDATE ON domain_extracted_keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_extracted_keywords_updated_at();

-- 3. Comments (idempotent)
COMMENT ON TABLE domain_extraction_features IS 'Canonical extraction feature rows (campaign,domain) with enrichment & scoring attributes';
COMMENT ON TABLE domain_extracted_keywords IS 'Per-domain keyword extraction detail (one row per keyword)';

-- NOTE: No enum created here; using existing extraction_processing_state_enum from migration 000055.