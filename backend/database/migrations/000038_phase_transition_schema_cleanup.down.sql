-- ======================================================================
-- PHASE TRANSITION SCHEMA CLEANUP MIGRATION (DOWN)
-- ======================================================================
-- This migration rolls back the phase transition schema cleanup changes
-- and restores the previous state if needed.
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. RESTORE: Drop new triggers and functions
-- ======================================================================

DROP TRIGGER IF EXISTS trigger_update_domain_counts_insert ON generated_domains;
DROP TRIGGER IF EXISTS trigger_update_domain_counts_update ON generated_domains;
DROP TRIGGER IF EXISTS trigger_update_domain_counts_delete ON generated_domains;

DROP FUNCTION IF EXISTS update_campaign_domain_counts_only();

-- ======================================================================
-- 2. RESTORE: Recreate original triggers from migration 000035
-- ======================================================================

-- Recreate the original function that updates all campaign metrics
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update domain counts and metrics for the affected campaign
    UPDATE campaigns 
    SET 
        domains = (
            SELECT COUNT(*) 
            FROM generated_domains 
            WHERE domain_generation_campaign_id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id)
        ),
        dns_validated_domains = (
            SELECT COUNT(*) 
            FROM generated_domains 
            WHERE domain_generation_campaign_id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id)
            AND dns_status = 'ok'
        ),
        http_validated_domains = (
            SELECT COUNT(*) 
            FROM generated_domains 
            WHERE domain_generation_campaign_id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id)
            AND http_status = 'ok'
        ),
        leads = (
            SELECT COUNT(*) 
            FROM generated_domains 
            WHERE domain_generation_campaign_id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id)
            AND lead_score > 0
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.domain_generation_campaign_id, OLD.domain_generation_campaign_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate original triggers
CREATE TRIGGER trigger_update_campaign_metrics_insert
    AFTER INSERT ON generated_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_metrics();

CREATE TRIGGER trigger_update_campaign_metrics_update
    AFTER UPDATE ON generated_domains
    FOR EACH ROW
    WHEN (OLD.dns_status IS DISTINCT FROM NEW.dns_status 
          OR OLD.http_status IS DISTINCT FROM NEW.http_status 
          OR OLD.lead_score IS DISTINCT FROM NEW.lead_score)
    EXECUTE FUNCTION update_campaign_metrics();

CREATE TRIGGER trigger_update_campaign_metrics_delete
    AFTER DELETE ON generated_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_metrics();

-- ======================================================================
-- 3. RESTORE: Drop new indexes and recreate original ones
-- ======================================================================

DROP INDEX IF EXISTS idx_campaigns_phase_transition_lookup;
DROP INDEX IF EXISTS idx_campaigns_progress_tracking;
DROP INDEX IF EXISTS idx_generated_domains_status_lookup;
DROP INDEX IF EXISTS idx_generated_domains_validation_status;

-- Recreate original indexes from migration 000035
CREATE INDEX IF NOT EXISTS idx_campaigns_domain_metrics 
ON campaigns(domains, leads, dns_validated_domains);

CREATE INDEX IF NOT EXISTS idx_campaigns_phase_updated 
ON campaigns(current_phase, updated_at);

-- ======================================================================
-- 4. RESTORE: Data from backup if it exists
-- ======================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns_backup_000038') THEN
        -- Only restore progress field, leave other improvements
        UPDATE campaigns 
        SET progress = backup.progress
        FROM campaigns_backup_000038 backup
        WHERE campaigns.id = backup.id
        AND backup.progress IS NOT NULL;
        
        RAISE NOTICE 'Restored progress data from backup table';
    END IF;
END $$;

-- ======================================================================
-- 5. CLEANUP: Remove backup table
-- ======================================================================

DROP TABLE IF EXISTS campaigns_backup_000038;

COMMIT;

-- ======================================================================
-- ROLLBACK COMPLETE
-- ======================================================================
-- The phase transition schema cleanup has been rolled back
-- Original state from migration 000035 has been restored
-- ======================================================================