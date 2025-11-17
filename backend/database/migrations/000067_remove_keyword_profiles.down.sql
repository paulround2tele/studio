-- 000067_remove_keyword_profiles.down.sql
-- Recreate tables (for backwards migration) matching the original structure from 000051.

CREATE TABLE IF NOT EXISTS keyword_profiles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    keywords JSONB NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_keyword_profile (
    campaign_id UUID PRIMARY KEY REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    keyword_profile_id UUID NOT NULL REFERENCES keyword_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keyword_profiles_created_at ON keyword_profiles(created_at);
