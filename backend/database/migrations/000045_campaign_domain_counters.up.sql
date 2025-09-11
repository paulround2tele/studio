-- 000045_campaign_domain_counters.up.sql
-- Purpose: Introduce per-campaign domain counters to allow O(1) listing metadata and fast progress metrics without scanning generated_domains.
-- Strategy:
--   * Create table campaign_domain_counters keyed by campaign_id (FK -> lead_generation_campaigns.id)
--   * Columns track total domains plus per-status counts for dns/http/lead layers.
--   * Backfill counts from existing generated_domains.
--   * Create trigger function to maintain counters on INSERT / UPDATE of generated_domains (status transitions only).
-- Notes:
--   * We DON'T decrement counts on status changes by recomputing whole; we detect OLD -> NEW transitions and adjust deltas.
--   * Future phases (HTTP/lead) already covered; unused counters remain zero until activity.

BEGIN;

CREATE TABLE IF NOT EXISTS campaign_domain_counters (
    campaign_id UUID PRIMARY KEY REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    total_domains BIGINT NOT NULL DEFAULT 0,
    dns_pending BIGINT NOT NULL DEFAULT 0,
    dns_ok BIGINT NOT NULL DEFAULT 0,
    dns_error BIGINT NOT NULL DEFAULT 0,
    dns_timeout BIGINT NOT NULL DEFAULT 0,
    http_pending BIGINT NOT NULL DEFAULT 0,
    http_ok BIGINT NOT NULL DEFAULT 0,
    http_error BIGINT NOT NULL DEFAULT 0,
    http_timeout BIGINT NOT NULL DEFAULT 0,
    lead_pending BIGINT NOT NULL DEFAULT 0,
    lead_match BIGINT NOT NULL DEFAULT 0,
    lead_no_match BIGINT NOT NULL DEFAULT 0,
    lead_error BIGINT NOT NULL DEFAULT 0,
    lead_timeout BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill existing campaigns
INSERT INTO campaign_domain_counters (campaign_id, total_domains, dns_pending, dns_ok, dns_error, dns_timeout,
                                      http_pending, http_ok, http_error, http_timeout,
                                      lead_pending, lead_match, lead_no_match, lead_error, lead_timeout)
SELECT c.id,
       COUNT(gd.*) AS total_domains,
       COUNT(*) FILTER (WHERE gd.dns_status = 'pending') AS dns_pending,
       COUNT(*) FILTER (WHERE gd.dns_status = 'ok') AS dns_ok,
       COUNT(*) FILTER (WHERE gd.dns_status = 'error') AS dns_error,
       COUNT(*) FILTER (WHERE gd.dns_status = 'timeout') AS dns_timeout,
       COUNT(*) FILTER (WHERE gd.http_status = 'pending') AS http_pending,
       COUNT(*) FILTER (WHERE gd.http_status = 'ok') AS http_ok,
       COUNT(*) FILTER (WHERE gd.http_status = 'error') AS http_error,
       COUNT(*) FILTER (WHERE gd.http_status = 'timeout') AS http_timeout,
       COUNT(*) FILTER (WHERE gd.lead_status = 'pending') AS lead_pending,
       COUNT(*) FILTER (WHERE gd.lead_status = 'match') AS lead_match,
       COUNT(*) FILTER (WHERE gd.lead_status = 'no_match') AS lead_no_match,
       COUNT(*) FILTER (WHERE gd.lead_status = 'error') AS lead_error,
       COUNT(*) FILTER (WHERE gd.lead_status = 'timeout') AS lead_timeout
FROM lead_generation_campaigns c
LEFT JOIN generated_domains gd ON gd.campaign_id = c.id
GROUP BY c.id
ON CONFLICT (campaign_id) DO NOTHING;

-- Trigger function to maintain counters
CREATE OR REPLACE FUNCTION campaign_domain_counters_upsert() RETURNS TRIGGER AS $$
DECLARE
    v_exists BOOLEAN;
    d_total_delta INT := 0;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Ensure row exists
        INSERT INTO campaign_domain_counters (campaign_id, total_domains)
            VALUES (NEW.campaign_id, 0)
            ON CONFLICT (campaign_id) DO NOTHING;
        -- Total always increments on insert
        UPDATE campaign_domain_counters
           SET total_domains = total_domains + 1,
               dns_pending = dns_pending + CASE WHEN NEW.dns_status = 'pending' THEN 1 ELSE 0 END,
               dns_ok = dns_ok + CASE WHEN NEW.dns_status = 'ok' THEN 1 ELSE 0 END,
               dns_error = dns_error + CASE WHEN NEW.dns_status = 'error' THEN 1 ELSE 0 END,
               dns_timeout = dns_timeout + CASE WHEN NEW.dns_status = 'timeout' THEN 1 ELSE 0 END,
               http_pending = http_pending + CASE WHEN NEW.http_status = 'pending' THEN 1 ELSE 0 END,
               http_ok = http_ok + CASE WHEN NEW.http_status = 'ok' THEN 1 ELSE 0 END,
               http_error = http_error + CASE WHEN NEW.http_status = 'error' THEN 1 ELSE 0 END,
               http_timeout = http_timeout + CASE WHEN NEW.http_status = 'timeout' THEN 1 ELSE 0 END,
               lead_pending = lead_pending + CASE WHEN NEW.lead_status = 'pending' THEN 1 ELSE 0 END,
               lead_match = lead_match + CASE WHEN NEW.lead_status = 'match' THEN 1 ELSE 0 END,
               lead_no_match = lead_no_match + CASE WHEN NEW.lead_status = 'no_match' THEN 1 ELSE 0 END,
               lead_error = lead_error + CASE WHEN NEW.lead_status = 'error' THEN 1 ELSE 0 END,
               lead_timeout = lead_timeout + CASE WHEN NEW.lead_status = 'timeout' THEN 1 ELSE 0 END,
               updated_at = NOW()
         WHERE campaign_id = NEW.campaign_id;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only adjust when status fields change
        IF (NEW.dns_status IS DISTINCT FROM OLD.dns_status) OR (NEW.http_status IS DISTINCT FROM OLD.http_status) OR (NEW.lead_status IS DISTINCT FROM OLD.lead_status) THEN
            UPDATE campaign_domain_counters SET
                dns_pending = dns_pending + CASE WHEN NEW.dns_status = 'pending' THEN 1 ELSE 0 END - CASE WHEN OLD.dns_status = 'pending' THEN 1 ELSE 0 END,
                dns_ok = dns_ok + CASE WHEN NEW.dns_status = 'ok' THEN 1 ELSE 0 END - CASE WHEN OLD.dns_status = 'ok' THEN 1 ELSE 0 END,
                dns_error = dns_error + CASE WHEN NEW.dns_status = 'error' THEN 1 ELSE 0 END - CASE WHEN OLD.dns_status = 'error' THEN 1 ELSE 0 END,
                dns_timeout = dns_timeout + CASE WHEN NEW.dns_status = 'timeout' THEN 1 ELSE 0 END - CASE WHEN OLD.dns_status = 'timeout' THEN 1 ELSE 0 END,
                http_pending = http_pending + CASE WHEN NEW.http_status = 'pending' THEN 1 ELSE 0 END - CASE WHEN OLD.http_status = 'pending' THEN 1 ELSE 0 END,
                http_ok = http_ok + CASE WHEN NEW.http_status = 'ok' THEN 1 ELSE 0 END - CASE WHEN OLD.http_status = 'ok' THEN 1 ELSE 0 END,
                http_error = http_error + CASE WHEN NEW.http_status = 'error' THEN 1 ELSE 0 END - CASE WHEN OLD.http_status = 'error' THEN 1 ELSE 0 END,
                http_timeout = http_timeout + CASE WHEN NEW.http_status = 'timeout' THEN 1 ELSE 0 END - CASE WHEN OLD.http_status = 'timeout' THEN 1 ELSE 0 END,
                lead_pending = lead_pending + CASE WHEN NEW.lead_status = 'pending' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'pending' THEN 1 ELSE 0 END,
                lead_match = lead_match + CASE WHEN NEW.lead_status = 'match' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'match' THEN 1 ELSE 0 END,
                lead_no_match = lead_no_match + CASE WHEN NEW.lead_status = 'no_match' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'no_match' THEN 1 ELSE 0 END,
                lead_error = lead_error + CASE WHEN NEW.lead_status = 'error' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'error' THEN 1 ELSE 0 END,
                lead_timeout = lead_timeout + CASE WHEN NEW.lead_status = 'timeout' THEN 1 ELSE 0 END - CASE WHEN OLD.lead_status = 'timeout' THEN 1 ELSE 0 END,
                updated_at = NOW()
            WHERE campaign_id = NEW.campaign_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Adjust counts downward (rare path; if deletions introduced later)
        UPDATE campaign_domain_counters SET
            total_domains = total_domains - 1,
            dns_pending = dns_pending - CASE WHEN OLD.dns_status = 'pending' THEN 1 ELSE 0 END,
            dns_ok = dns_ok - CASE WHEN OLD.dns_status = 'ok' THEN 1 ELSE 0 END,
            dns_error = dns_error - CASE WHEN OLD.dns_status = 'error' THEN 1 ELSE 0 END,
            dns_timeout = dns_timeout - CASE WHEN OLD.dns_status = 'timeout' THEN 1 ELSE 0 END,
            http_pending = http_pending - CASE WHEN OLD.http_status = 'pending' THEN 1 ELSE 0 END,
            http_ok = http_ok - CASE WHEN OLD.http_status = 'ok' THEN 1 ELSE 0 END,
            http_error = http_error - CASE WHEN OLD.http_status = 'error' THEN 1 ELSE 0 END,
            http_timeout = http_timeout - CASE WHEN OLD.http_status = 'timeout' THEN 1 ELSE 0 END,
            lead_pending = lead_pending - CASE WHEN OLD.lead_status = 'pending' THEN 1 ELSE 0 END,
            lead_match = lead_match - CASE WHEN OLD.lead_status = 'match' THEN 1 ELSE 0 END,
            lead_no_match = lead_no_match - CASE WHEN OLD.lead_status = 'no_match' THEN 1 ELSE 0 END,
            lead_error = lead_error - CASE WHEN OLD.lead_status = 'error' THEN 1 ELSE 0 END,
            lead_timeout = lead_timeout - CASE WHEN OLD.lead_status = 'timeout' THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE campaign_id = OLD.campaign_id;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaign_domain_counters_insert ON generated_domains;
DROP TRIGGER IF EXISTS trg_campaign_domain_counters_update ON generated_domains;
DROP TRIGGER IF EXISTS trg_campaign_domain_counters_delete ON generated_domains;

CREATE TRIGGER trg_campaign_domain_counters_insert
    AFTER INSERT ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION campaign_domain_counters_upsert();

CREATE TRIGGER trg_campaign_domain_counters_update
    AFTER UPDATE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION campaign_domain_counters_upsert();

-- (Optional) If deletes are possible
CREATE TRIGGER trg_campaign_domain_counters_delete
    AFTER DELETE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION campaign_domain_counters_upsert();

COMMIT;
