-- 000044_fix_domain_validation_trigger_remove_legacy_columns.up.sql
-- Purpose: Replace broken trigger that referenced removed columns (domains_validated_count, domains_generated_count, validation_completion_rate)
--          with a safe version that:
--          * Updates progress metrics using existing columns (progress_percentage, total_items, processed_items, successful_items, failed_items)
--          * Auto-advances phase dns_validation -> http_keyword_validation -> analysis when all items complete
--          * Never touches legacy / removed columns
--          * Uses enum-typed variable for current_phase and advance_to
-- Assumptions: generated_domains rows hold campaign_id, dns_status (pending|ok|error|timeout), http_status (pending|ok|error|timeout)

BEGIN;

DROP TRIGGER IF EXISTS trigger_domain_validation ON generated_domains;
DROP FUNCTION IF EXISTS trigger_domain_validation_update() CASCADE;

CREATE OR REPLACE FUNCTION trigger_domain_validation_update() RETURNS TRIGGER AS $$
DECLARE
    v_campaign_id UUID := NEW.campaign_id;
    -- DNS stats
    dns_total INT; dns_completed INT; dns_ok INT; dns_error INT; dns_timeout INT;
    -- HTTP stats
    http_total INT; http_completed INT; http_ok INT; http_error INT; http_timeout INT;
    v_current_phase phase_type_enum;
    advance_to phase_type_enum;
    v_progress NUMERIC(5,2);
    v_total INT; v_processed INT; v_success INT; v_failed INT;
BEGIN
    -- Only act when relevant status columns changed
    IF (OLD.dns_status IS DISTINCT FROM NEW.dns_status) OR (OLD.http_status IS DISTINCT FROM NEW.http_status) THEN
        -- Aggregate DNS
        SELECT COUNT(*),
               COUNT(*) FILTER (WHERE dns_status <> 'pending'),
               COUNT(*) FILTER (WHERE dns_status = 'ok'),
               COUNT(*) FILTER (WHERE dns_status = 'error'),
               COUNT(*) FILTER (WHERE dns_status = 'timeout')
          INTO dns_total, dns_completed, dns_ok, dns_error, dns_timeout
          FROM generated_domains WHERE campaign_id = v_campaign_id;

        -- Aggregate HTTP
        SELECT COUNT(*),
               COUNT(*) FILTER (WHERE http_status <> 'pending'),
               COUNT(*) FILTER (WHERE http_status = 'ok'),
               COUNT(*) FILTER (WHERE http_status = 'error'),
               COUNT(*) FILTER (WHERE http_status = 'timeout')
          INTO http_total, http_completed, http_ok, http_error, http_timeout
          FROM generated_domains WHERE campaign_id = v_campaign_id;

        -- Lock + read current phase
        SELECT current_phase INTO v_current_phase FROM lead_generation_campaigns WHERE id = v_campaign_id FOR UPDATE;

        advance_to := NULL;

        -- Compute metrics based on current phase
        IF v_current_phase = 'dns_validation' THEN
            v_total := dns_total;
            v_processed := dns_completed;
            v_success := dns_ok;
            v_failed := dns_error + dns_timeout;
            IF dns_total > 0 THEN
                v_progress := (dns_completed::NUMERIC / dns_total) * 100;
            ELSE
                v_progress := 0;
            END IF;
            IF dns_total > 0 AND dns_completed = dns_total THEN
                advance_to := 'http_keyword_validation';
            END IF;
        ELSIF v_current_phase = 'http_keyword_validation' THEN
            v_total := http_total;
            v_processed := http_completed;
            v_success := http_ok;
            v_failed := http_error + http_timeout;
            IF http_total > 0 THEN
                v_progress := (http_completed::NUMERIC / http_total) * 100;
            ELSE
                v_progress := 0;
            END IF;
            IF http_total > 0 AND http_completed = http_total THEN
                advance_to := 'analysis';
            END IF;
        ELSE
            -- For other phases (domain_generation, analysis) we don't update metrics here
            v_total := NULL; v_processed := NULL; v_success := NULL; v_failed := NULL; v_progress := NULL;
        END IF;

        UPDATE lead_generation_campaigns lgc
           SET current_phase = COALESCE(advance_to, lgc.current_phase),
               total_items = COALESCE(v_total, lgc.total_items),
               processed_items = COALESCE(v_processed, lgc.processed_items),
               successful_items = COALESCE(v_success, lgc.successful_items),
               failed_items = COALESCE(v_failed, lgc.failed_items),
               progress_percentage = COALESCE(v_progress, lgc.progress_percentage),
               updated_at = NOW()
         WHERE lgc.id = v_campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_domain_validation
    AFTER UPDATE ON generated_domains
    FOR EACH ROW EXECUTE FUNCTION trigger_domain_validation_update();

COMMIT;
