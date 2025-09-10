-- 000043_fix_trigger_enum_casting.up.sql
-- Purpose: Preserve auto-advance while fixing enum/text CASE mismatch in trigger_domain_validation_update.
-- Strategy: Cast advance_to (TEXT) to phase_type_enum explicitly and compute only when non-null.

BEGIN;

DROP TRIGGER IF EXISTS trigger_domain_validation ON generated_domains;
DROP FUNCTION IF EXISTS trigger_domain_validation_update() CASCADE;

CREATE OR REPLACE FUNCTION trigger_domain_validation_update() RETURNS TRIGGER AS $$
DECLARE
    v_campaign_id UUID := NEW.campaign_id;
    dns_total INT; dns_completed INT; dns_ok INT; dns_error INT; dns_timeout INT;
    http_total INT; http_completed INT; http_ok INT; http_error INT; http_timeout INT;
    domains_generated INT;
    v_current_phase phase_type_enum;
    advance_to phase_type_enum; -- directly typed enum
BEGIN
    IF (OLD.dns_status IS DISTINCT FROM NEW.dns_status) OR (OLD.http_status IS DISTINCT FROM NEW.http_status) THEN
        SELECT COUNT(*),
               COUNT(*) FILTER (WHERE dns_status <> 'pending'),
               COUNT(*) FILTER (WHERE dns_status = 'ok'),
               COUNT(*) FILTER (WHERE dns_status = 'error'),
               COUNT(*) FILTER (WHERE dns_status = 'timeout')
          INTO dns_total, dns_completed, dns_ok, dns_error, dns_timeout
          FROM generated_domains WHERE campaign_id = v_campaign_id;

        SELECT COUNT(*),
               COUNT(*) FILTER (WHERE http_status <> 'pending'),
               COUNT(*) FILTER (WHERE http_status = 'ok'),
               COUNT(*) FILTER (WHERE http_status = 'error'),
               COUNT(*) FILTER (WHERE http_status = 'timeout')
          INTO http_total, http_completed, http_ok, http_error, http_timeout
          FROM generated_domains WHERE campaign_id = v_campaign_id;

        domains_generated := GREATEST(dns_total, http_total);

        SELECT current_phase INTO v_current_phase FROM lead_generation_campaigns WHERE id = v_campaign_id FOR UPDATE;

        advance_to := NULL;
        IF v_current_phase = 'dns_validation' AND dns_total > 0 AND dns_completed = dns_total THEN
            advance_to := 'http_keyword_validation';
        ELSIF v_current_phase = 'http_keyword_validation' AND http_total > 0 AND http_completed = http_total THEN
            advance_to := 'analysis';
        END IF;

        UPDATE lead_generation_campaigns lgc
           SET domains_validated_count = dns_completed,
               domains_generated_count = domains_generated,
               validation_completion_rate = CASE WHEN dns_total > 0 THEN (dns_completed::DECIMAL / dns_total) * 100 ELSE 0 END,
               updated_at = NOW(),
               current_phase = COALESCE(advance_to, lgc.current_phase)
         WHERE lgc.id = v_campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_domain_validation
    AFTER UPDATE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION trigger_domain_validation_update();

COMMIT;
