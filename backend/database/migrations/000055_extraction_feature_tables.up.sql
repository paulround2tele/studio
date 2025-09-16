-- Migration 000055: Extraction Feature Tables (P0)
-- Creates processing_state enum, domain_extraction_features, domain_extracted_keywords
-- Guarded by feature flag at application layer (no conditional SQL here)

-- 1. Enum for processing state (scoped to extraction pipeline lifecycle)
DO $$
BEGIN
		IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_processing_state_enum') THEN
				CREATE TYPE extraction_processing_state_enum AS ENUM ('pending','building','ready','error','stale');
		END IF;
END$$;

-- 2. Core feature table
CREATE TABLE IF NOT EXISTS domain_extraction_features (
	campaign_id UUID NOT NULL,
	domain_id   UUID NOT NULL,
	domain_name TEXT,
	processing_state extraction_processing_state_enum NOT NULL DEFAULT 'pending',
	attempt_count INT NOT NULL DEFAULT 0,
	last_error TEXT,
	http_status TEXT,
	http_status_code INT,
	fetch_time_ms INT,
	content_hash TEXT,
	content_bytes INT,
	page_lang TEXT,
	kw_unique_count INT,
	kw_total_occurrences INT,
	kw_weight_sum DOUBLE PRECISION,
	kw_top3 JSONB,
	kw_signal_distribution JSONB,
	microcrawl_enabled BOOLEAN,
	microcrawl_pages INT,
	microcrawl_base_kw_count INT,
	microcrawl_added_kw_count INT,
	microcrawl_gain_ratio DOUBLE PRECISION,
	diminishing_returns BOOLEAN,
	is_parked BOOLEAN,
	parked_confidence DOUBLE PRECISION,
	content_richness_score DOUBLE PRECISION,
	page_archetype TEXT,
	crawl_strategy TEXT,
	feature_vector JSONB,
	extraction_version INT NOT NULL DEFAULT 1,
	keyword_dictionary_version INT NOT NULL DEFAULT 1,
	scoring_profile_snapshot_id UUID,
	analysis_version INT,
	is_stale_score BOOLEAN DEFAULT FALSE,
	updated_at TIMESTAMPTZ DEFAULT now(),
	created_at TIMESTAMPTZ DEFAULT now(),
	PRIMARY KEY (campaign_id, domain_id)
);

-- Helpful index for analysis phase queries
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_ready_campaign
	ON domain_extraction_features (campaign_id)
	WHERE processing_state='ready';

-- Optional future index for stale score re-scoring
CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_stale_campaign
	ON domain_extraction_features (campaign_id)
	WHERE is_stale_score = true;

-- 3. Keyword detail table (nullable until feature flag enabled)
CREATE TABLE IF NOT EXISTS domain_extracted_keywords (
	campaign_id UUID NOT NULL,
	domain_id UUID NOT NULL,
	keyword_id UUID NOT NULL,
	surface_form TEXT,
	signal_type TEXT,
	occurrences INT,
	base_weight DOUBLE PRECISION,
	value_score DOUBLE PRECISION,
	effective_weight DOUBLE PRECISION,
	first_seen_position INT,
	source_subphase TEXT,
	created_at TIMESTAMPTZ DEFAULT now(),
	updated_at TIMESTAMPTZ DEFAULT now(),
	PRIMARY KEY (campaign_id, domain_id, keyword_id)
);

-- Secondary index for cross-domain keyword analytics (e.g., TF-like computations)
CREATE INDEX IF NOT EXISTS idx_domain_extracted_keywords_campaign_keyword
	ON domain_extracted_keywords (campaign_id, keyword_id);

-- 4. View to simplify analysis reads (initial minimal projection)
CREATE OR REPLACE VIEW analysis_ready_features AS
SELECT campaign_id, domain_id, kw_unique_count, kw_weight_sum,
			 content_richness_score, microcrawl_gain_ratio, page_archetype,
			 feature_vector, extraction_version, keyword_dictionary_version
FROM domain_extraction_features
WHERE processing_state='ready';

-- 5. Comments for documentation clarity
COMMENT ON TYPE extraction_processing_state_enum IS 'Lifecycle state for extraction feature row (pending|building|ready|error|stale)';
COMMENT ON TABLE domain_extraction_features IS 'Canonical per (campaign, domain) extraction features for analysis/scoring';
COMMENT ON TABLE domain_extracted_keywords IS 'Per-domain keyword detail (deduped per keyword_id) with occurrences and weights';
COMMENT ON VIEW analysis_ready_features IS 'Projection of ready feature rows consumed by analysis/scoring phase';

