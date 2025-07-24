-- Migration: Remove JSON configuration fields for DNS and HTTP validation from campaigns table
-- This rollback removes the dns_config and http_config fields

-- Drop indexes first
DROP INDEX IF EXISTS idx_campaigns_dns_config;
DROP INDEX IF EXISTS idx_campaigns_http_config;

-- Remove the JSON configuration columns
ALTER TABLE campaigns 
DROP COLUMN IF EXISTS dns_config,
DROP COLUMN IF EXISTS http_config;