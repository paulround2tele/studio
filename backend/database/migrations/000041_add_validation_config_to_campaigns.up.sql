-- Migration: Add JSON configuration fields for DNS and HTTP validation to campaigns table
-- This replaces the removed dns_validation_params and http_validation_params tables
-- with JSON fields in campaigns table for better campaign-specific persistence

ALTER TABLE campaigns 
ADD COLUMN dns_config JSONB,
ADD COLUMN http_config JSONB;

-- Add indexes for JSON fields to enable efficient queries
CREATE INDEX IF NOT EXISTS idx_campaigns_dns_config ON campaigns USING GIN (dns_config);
CREATE INDEX IF NOT EXISTS idx_campaigns_http_config ON campaigns USING GIN (http_config);

-- Add comments for documentation
COMMENT ON COLUMN campaigns.dns_config IS 'JSON configuration for DNS validation phase including personas, intervals, and processing settings';
COMMENT ON COLUMN campaigns.http_config IS 'JSON configuration for HTTP validation phase including personas, keywords, and scanning settings';