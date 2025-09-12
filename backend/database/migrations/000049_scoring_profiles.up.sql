-- 000049_scoring_profiles.up.sql
CREATE TABLE IF NOT EXISTS scoring_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    weights JSONB NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_scoring_profile (
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    scoring_profile_id UUID NOT NULL REFERENCES scoring_profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scoring_profiles IS 'Scoring weight profiles (JSON weights object validated in application)';
COMMENT ON TABLE campaign_scoring_profile IS 'Association of a campaign to a single scoring profile';
