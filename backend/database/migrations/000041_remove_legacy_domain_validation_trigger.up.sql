-- 000041_remove_legacy_domain_validation_trigger.up.sql
-- Purpose: Remove legacy domain validation trigger/function referencing obsolete columns (validation_status, dns_validation_status, http_validation_status, created_by)
-- These cause runtime errors during DNS bulk updates: "record \"old\" has no field \"validation_status\"".
-- Strategy: Drop dependent trigger & function safely if they exist. (A lighter, correct replacement can be added later when campaign-level validation metrics are redesigned.)

BEGIN;

-- Drop trigger if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = 'trigger_domain_validation' AND c.relname = 'generated_domains'
    ) THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_domain_validation ON generated_domains';
    END IF;
END$$;

-- Drop function if it exists
DROP FUNCTION IF EXISTS trigger_domain_validation_update() CASCADE;

-- Create lightweight correct replacement to maintain basic updated_at propagation without legacy columns
CREATE OR REPLACE FUNCTION trigger_domain_validation_update() RETURNS TRIGGER AS $$
DECLARE
    v_campaign_id UUID := NEW.campaign_id;
    dns_total INT;
    dns_completed INT;
    dns_ok INT;
    dns_error INT;
    dns_timeout INT;
    http_total INT;
    http_completed INT;
    http_ok INT;
    http_error INT;
    http_timeout INT;
    domains_generated INT;
    current_phase TEXT;
    advance_to TEXT;
BEGIN
    -- Only react if a status column relevant to validation changed
    IF (OLD.dns_status IS DISTINCT FROM NEW.dns_status) OR (OLD.http_status IS DISTINCT FROM NEW.http_status) THEN
        -- Aggregate DNS stats for this campaign
        SELECT COUNT(*),
               COUNT(*) FILTER (WHERE dns_status <> 'pending'),
               COUNT(*) FILTER (WHERE dns_status = 'ok'),
               COUNT(*) FILTER (WHERE dns_status = 'error'),
               COUNT(*) FILTER (WHERE dns_status = 'timeout')
        INTO dns_total, dns_completed, dns_ok, dns_error, dns_timeout
        FROM generated_domains WHERE campaign_id = v_campaign_id;

        -- Aggregate HTTP stats for this campaign
        SELECT COUNT(*),
               COUNT(*) FILTER (WHERE http_status <> 'pending'),
               COUNT(*) FILTER (WHERE http_status = 'ok'),
               COUNT(*) FILTER (WHERE http_status = 'error'),
               COUNT(*) FILTER (WHERE http_status = 'timeout')
        INTO http_total, http_completed, http_ok, http_error, http_timeout
        FROM generated_domains WHERE campaign_id = v_campaign_id;

        domains_generated := GREATEST(dns_total, http_total); -- They should match; defensive.

        -- Read current phase once (avoid race)
        SELECT current_phase INTO current_phase FROM lead_generation_campaigns WHERE id = v_campaign_id FOR UPDATE;

        -- Phase auto-advance policy (bulk-oriented):
        -- 1. If in dns_validation and all domains have non-pending dns_status, move to http_keyword_validation.
        -- 2. If in http_keyword_validation and all domains have non-pending http_status, move to analysis.
        advance_to := NULL;
        IF current_phase = 'dns_validation' AND dns_total > 0 AND dns_completed = dns_total THEN
            advance_to := 'http_keyword_validation';
        ELSIF current_phase = 'http_keyword_validation' AND http_total > 0 AND http_completed = http_total THEN
            advance_to := 'analysis';
        END IF;

        UPDATE lead_generation_campaigns
        SET
            domains_validated_count = dns_completed,
            domains_generated_count = domains_generated,
            validation_completion_rate = CASE WHEN dns_total > 0 THEN (dns_completed::DECIMAL / dns_total) * 100 ELSE 0 END,
            updated_at = NOW(),
            current_phase = COALESCE(advance_to, current_phase)
        WHERE id = v_campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_domain_validation
    AFTER UPDATE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION trigger_domain_validation_update();

COMMIT;
