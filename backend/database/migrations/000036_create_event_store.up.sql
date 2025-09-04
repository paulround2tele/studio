-- (Renumbered from 000033) Create campaign_events event sourcing table (original up content was empty placeholder)
CREATE TABLE IF NOT EXISTS campaign_events (
	event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	campaign_id UUID NOT NULL,
	event_type TEXT NOT NULL,
	event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
	sequence_number BIGSERIAL NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_id ON campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_sequence ON campaign_events(sequence_number);
