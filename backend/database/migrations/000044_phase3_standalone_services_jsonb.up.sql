-- Migration 000044: Phase 3 Standalone Services JSONB Architecture
-- Add JSONB columns to lead_generation_campaigns table for efficient phase data storage

-- Add JSONB columns to campaigns table (will be renamed to lead_generation_campaigns in migration 000045)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS domains_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dns_results JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS http_results JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS analysis_results JSONB DEFAULT '{}';

-- Add GIN indexes for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_campaigns_domains_data
    ON campaigns USING GIN (domains_data);
CREATE INDEX IF NOT EXISTS idx_campaigns_dns_results
    ON campaigns USING GIN (dns_results);
CREATE INDEX IF NOT EXISTS idx_campaigns_http_results
    ON campaigns USING GIN (http_results);
CREATE INDEX IF NOT EXISTS idx_campaigns_analysis_results
    ON campaigns USING GIN (analysis_results);

-- Add partial indexes for common queries on JSONB data
CREATE INDEX IF NOT EXISTS idx_campaigns_domains_data_count
    ON campaigns (CAST(domains_data->>'total_count' AS integer))
    WHERE domains_data IS NOT NULL AND domains_data != '{}';

CREATE INDEX IF NOT EXISTS idx_campaigns_dns_results_validated
    ON campaigns (CAST(dns_results->>'validated_count' AS integer))
    WHERE dns_results IS NOT NULL AND dns_results != '{}';

CREATE INDEX IF NOT EXISTS idx_campaigns_http_results_matches
    ON campaigns (CAST(http_results->>'match_count' AS integer))
    WHERE http_results IS NOT NULL AND http_results != '{}';

-- Update table comment to reflect new JSONB architecture
COMMENT ON TABLE campaigns IS 'Lead generation campaigns with phase-based execution and JSONB storage for standalone service integration';

-- Add comments for new JSONB columns
COMMENT ON COLUMN campaigns.domains_data IS 'JSONB storage for domain generation phase data from standalone service';
COMMENT ON COLUMN campaigns.dns_results IS 'JSONB storage for DNS validation phase results from standalone service';
COMMENT ON COLUMN campaigns.http_results IS 'JSONB storage for HTTP validation phase results from standalone service';
COMMENT ON COLUMN campaigns.analysis_results IS 'JSONB storage for analysis phase results from standalone service';