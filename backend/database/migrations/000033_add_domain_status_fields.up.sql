-- Migration to add domain-centric validation status fields to generated_domains table
-- This migration implements the domain-centric architecture where validation results
-- are stored directly on the domain records rather than in separate result tables.

-- Add all validation and content fields (transactional operations)
ALTER TABLE generated_domains
ADD COLUMN IF NOT EXISTS dns_status TEXT CHECK (dns_status IN ('pending', 'ok', 'error', 'timeout')),
ADD COLUMN IF NOT EXISTS dns_ip TEXT,
ADD COLUMN IF NOT EXISTS http_status TEXT CHECK (http_status IN ('pending', 'ok', 'error', 'timeout')),
ADD COLUMN IF NOT EXISTS http_status_code INTEGER,
ADD COLUMN IF NOT EXISTS http_title TEXT,
ADD COLUMN IF NOT EXISTS http_keywords TEXT,
ADD COLUMN IF NOT EXISTS lead_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE;

-- Set default DNS status to 'pending' for existing domains that don't have a status
UPDATE generated_domains
SET dns_status = 'pending'
WHERE dns_status IS NULL;