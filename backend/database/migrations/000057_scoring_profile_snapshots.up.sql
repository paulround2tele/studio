-- Migration: Add Scoring Profile Snapshots Table
-- Description: Create table for storing scoring profile snapshots to track changes
--              and enable stale score detection (Work Package 8)

-- Create scoring profile snapshots table
CREATE TABLE IF NOT EXISTS scoring_profile_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    profile_version INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Snapshot data
    scoring_configuration JSONB NOT NULL,
    feature_weights JSONB NOT NULL,
    algorithm_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    parameters JSONB,
    
    -- Lifecycle management
    is_active BOOLEAN NOT NULL DEFAULT true,
    replaced_at TIMESTAMP WITH TIME ZONE,
    replaced_by_snapshot_id UUID,
    
    -- Ensure only one active snapshot per campaign
    UNIQUE(campaign_id, profile_version)
);

-- Add scoring_profile_snapshot_id to domain_extraction_features if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domain_extraction_features' 
        AND column_name = 'scoring_profile_snapshot_id'
    ) THEN
        ALTER TABLE domain_extraction_features 
        ADD COLUMN scoring_profile_snapshot_id UUID REFERENCES scoring_profile_snapshots(id);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scoring_profile_snapshots_campaign_active 
    ON scoring_profile_snapshots (campaign_id, is_active) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scoring_profile_snapshots_campaign_version 
    ON scoring_profile_snapshots (campaign_id, profile_version DESC);

CREATE INDEX IF NOT EXISTS idx_domain_extraction_features_snapshot_stale
    ON domain_extraction_features (campaign_id, scoring_profile_snapshot_id, is_stale_score)
    WHERE is_stale_score = true;

-- Add comment
COMMENT ON TABLE scoring_profile_snapshots IS 'Stores point-in-time snapshots of scoring profiles for tracking changes and enabling stale score detection';