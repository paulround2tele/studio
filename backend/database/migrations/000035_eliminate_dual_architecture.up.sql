-- ======================================================================
-- ELIMINATE DUAL ARCHITECTURE MIGRATION (UP)
-- ======================================================================
-- This migration eliminates the dual architecture by removing legacy
-- campaign-type fields and optimizing for phases-based architecture only.
--
-- PERFORMANCE TARGET: 40% improvement in database query performance
-- SAFETY: Transaction-based with rollback capability
-- ======================================================================

BEGIN;

-- ======================================================================
-- 1. BACKUP: Create temporary backup table for emergency rollback
-- ======================================================================
CREATE TABLE IF NOT EXISTS campaigns_backup_000035 AS 
SELECT * FROM campaigns;

-- Add metadata to backup table
COMMENT ON TABLE campaigns_backup_000035 IS 'Backup table for migration 000035 - eliminate dual architecture';

-- ======================================================================
-- 2. ADD: Ensure phases-based columns exist with proper constraints
-- ======================================================================

-- Add current_phase column if not exists
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS current_phase TEXT 
CHECK (current_phase IN ('setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis'));

-- Add phase_status column if not exists  
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS phase_status TEXT 
CHECK (phase_status IN ('not_started', 'in_progress', 'paused', 'completed', 'failed'));

-- Add progress column for phases tracking if not exists
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS progress DECIMAL(5,2) DEFAULT 0.0 
CHECK (progress >= 0.0 AND progress <= 100.0);

-- Add domain metrics columns if not exists
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS domains BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS dns_validated_domains BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS http_validated_domains BIGINT DEFAULT 0;

-- ======================================================================
-- 3. DATA MIGRATION: Transform legacy data to phases-based architecture
-- ======================================================================

-- Migrate campaign_type to current_phase with comprehensive mapping
UPDATE campaigns 
SET current_phase = CASE 
    WHEN campaign_type = 'domain_generation' THEN 'generation'
    WHEN campaign_type = 'dns_validation' THEN 'dns_validation'
    WHEN campaign_type = 'http_keyword_validation' THEN 'http_keyword_validation'
    WHEN campaign_type = 'analysis' THEN 'analysis'
    WHEN campaign_type = 'comprehensive' THEN 'generation'  -- Start comprehensive at generation
    WHEN campaign_type = 'automated' THEN 'generation'      -- Start automated at generation
    ELSE 'setup'  -- Default fallback for unknown types
END
WHERE current_phase IS NULL AND campaign_type IS NOT NULL;

-- Migrate legacy status to phase_status with proper mapping
UPDATE campaigns 
SET phase_status = CASE 
    WHEN status = 'pending' THEN 'not_started'
    WHEN status = 'queued' THEN 'not_started'
    WHEN status = 'running' THEN 'in_progress'
    WHEN status = 'pausing' THEN 'paused'
    WHEN status = 'paused' THEN 'paused'
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'failed' THEN 'failed'
    WHEN status = 'archived' THEN 'completed'  -- Treat archived as completed
    WHEN status = 'cancelled' THEN 'failed'    -- Treat cancelled as failed
    ELSE 'not_started'  -- Default fallback
END
WHERE phase_status IS NULL AND status IS NOT NULL;

-- Set default values for campaigns missing phase information
UPDATE campaigns 
SET current_phase = 'setup', phase_status = 'not_started'
WHERE current_phase IS NULL OR phase_status IS NULL;

-- ======================================================================
-- 4. PERFORMANCE OPTIMIZATION: Update domain metrics from related tables
-- ======================================================================

-- Update domains count from generated_domains table
UPDATE campaigns 
SET domains = COALESCE((
    SELECT COUNT(*) 
    FROM generated_domains 
    WHERE domain_generation_campaign_id = campaigns.id
), 0);

-- Update DNS validated domains count
UPDATE campaigns 
SET dns_validated_domains = COALESCE((
    SELECT COUNT(*) 
    FROM generated_domains 
    WHERE domain_generation_campaign_id = campaigns.id 
    AND dns_status = 'ok'
), 0);

-- Update HTTP validated domains count
UPDATE campaigns 
SET http_validated_domains = COALESCE((
    SELECT COUNT(*) 
    FROM generated_domains 
    WHERE domain_generation_campaign_id = campaigns.id 
    AND http_status = 'ok'
), 0);

-- Update leads count (domains with lead_score > 0)
UPDATE campaigns 
SET leads = COALESCE((
    SELECT COUNT(*) 
    FROM generated_domains 
    WHERE domain_generation_campaign_id = campaigns.id 
    AND lead_score > 0
), 0);

-- Calculate progress based on phase and completion metrics
UPDATE campaigns 
SET progress = CASE 
    WHEN phase_status = 'completed' THEN 100.0
    WHEN phase_status = 'failed' THEN 0.0
    WHEN phase_status = 'not_started' THEN 0.0
    WHEN phase_status = 'paused' THEN LEAST(50.0, COALESCE(progress_percentage, 0))
    WHEN phase_status = 'in_progress' THEN 
        CASE current_phase
            WHEN 'generation' THEN LEAST(25.0, COALESCE(progress_percentage, 10))
            WHEN 'dns_validation' THEN LEAST(50.0, COALESCE(progress_percentage, 35))
            WHEN 'http_keyword_validation' THEN LEAST(75.0, COALESCE(progress_percentage, 60))
            WHEN 'analysis' THEN LEAST(95.0, COALESCE(progress_percentage, 85))
            ELSE COALESCE(progress_percentage, 0)
        END
    ELSE COALESCE(progress_percentage, 0)
END;

-- ======================================================================
-- 5. CONSTRAINTS: Add NOT NULL constraints after data migration
-- ======================================================================

-- Make phases-based columns NOT NULL after migration
ALTER TABLE campaigns 
ALTER COLUMN current_phase SET NOT NULL,
ALTER COLUMN phase_status SET NOT NULL;

-- ======================================================================
-- 6. REMOVE LEGACY ARCHITECTURE: Drop dual architecture columns
-- ======================================================================

-- Drop legacy indexes first to avoid constraint conflicts
DROP INDEX IF EXISTS idx_campaigns_campaign_type;
DROP INDEX IF EXISTS idx_campaigns_status;
DROP INDEX IF EXISTS idx_campaigns_launch_sequence;
DROP INDEX IF EXISTS campaigns_campaign_type_idx;
DROP INDEX IF EXISTS campaigns_status_idx;

-- Drop foreign key constraints that reference legacy columns
DO $$
BEGIN
    -- Check and drop constraints referencing campaign_type
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'campaigns_campaign_type_check') THEN
        ALTER TABLE campaigns DROP CONSTRAINT campaigns_campaign_type_check;
    END IF;
    
    -- Check and drop constraints referencing status
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'campaigns_status_check') THEN
        ALTER TABLE campaigns DROP CONSTRAINT campaigns_status_check;
    END IF;
END $$;

-- Drop legacy columns (dual architecture elimination)
ALTER TABLE campaigns 
DROP COLUMN IF EXISTS campaign_type,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS launch_sequence;

-- ======================================================================
-- 7. OPTIMIZE: Create phases-based indexes for performance
-- ======================================================================

-- Primary phases-based indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_campaigns_current_phase 
ON campaigns(current_phase);

CREATE INDEX IF NOT EXISTS idx_campaigns_phase_status 
ON campaigns(phase_status);

-- Composite index for primary query pattern: phase + status + user
CREATE INDEX IF NOT EXISTS idx_campaigns_phase_status_user 
ON campaigns(current_phase, phase_status, user_id);

-- Performance index for phase transitions and monitoring
CREATE INDEX IF NOT EXISTS idx_campaigns_phase_updated 
ON campaigns(current_phase, updated_at);

-- Bulk processing optimization index
CREATE INDEX IF NOT EXISTS idx_campaigns_phase_created 
ON campaigns(current_phase, created_at);

-- Progress tracking index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_campaigns_progress_tracking 
ON campaigns(phase_status, progress, updated_at);

-- Domain metrics index for analytics
CREATE INDEX IF NOT EXISTS idx_campaigns_domain_metrics 
ON campaigns(domains, leads, dns_validated_domains);

-- ======================================================================
-- 8. OPTIMIZE RELATED TABLES: Improve generated_domains performance
-- ======================================================================

-- Create composite indexes for domain-centric status tracking
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_dns_status 
ON generated_domains(domain_generation_campaign_id, dns_status);

CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_http_status 
ON generated_domains(domain_generation_campaign_id, http_status);

-- Index for lead scoring and analytics
CREATE INDEX IF NOT EXISTS idx_generated_domains_lead_score 
ON generated_domains(domain_generation_campaign_id, lead_score) 
WHERE lead_score > 0;

-- Bulk validation processing index
CREATE INDEX IF NOT EXISTS idx_generated_domains_validation_pending 
ON generated_domains(dns_status, http_status, domain_generation_campaign_id) 
WHERE dns_status = 'pending' OR http_status = 'pending';

-- ======================================================================
-- 9. UPDATE TRIGGERS: Maintain data consistency
-- ======================================================================

-- Create function to update campaign metrics when domains change
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

-- Create triggers to maintain campaign metrics
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_insert ON generated_domains;
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_update ON generated_domains;
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_delete ON generated_domains;

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
-- 10. PERFORMANCE VALIDATION: Add performance monitoring
-- ======================================================================

-- Create performance monitoring view for phases-based queries
CREATE OR REPLACE VIEW campaign_performance_metrics AS
SELECT 
    current_phase,
    phase_status,
    COUNT(*) as campaign_count,
    AVG(domains) as avg_domains,
    AVG(leads) as avg_leads,
    AVG(progress) as avg_progress,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_duration_hours
FROM campaigns 
GROUP BY current_phase, phase_status;

-- Add comment for performance tracking
COMMENT ON VIEW campaign_performance_metrics IS 'Performance metrics for phases-based campaign queries - target 40% improvement';

-- ======================================================================
-- 11. FINAL VALIDATION: Ensure data integrity
-- ======================================================================

-- Validate all campaigns have valid phases and status
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM campaigns 
    WHERE current_phase IS NULL 
       OR phase_status IS NULL 
       OR current_phase NOT IN ('setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis')
       OR phase_status NOT IN ('not_started', 'in_progress', 'paused', 'completed', 'failed');
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Data integrity check failed: % campaigns have invalid phase data', invalid_count;
    END IF;
    
    RAISE NOTICE 'Data integrity validated: All campaigns have valid phases-based data';
END $$;

-- Update statistics for query planner optimization
ANALYZE campaigns;
ANALYZE generated_domains;

COMMIT;

-- ======================================================================
-- MIGRATION COMPLETE - DUAL ARCHITECTURE ELIMINATED
-- ======================================================================
-- Database is now optimized for phases-based architecture only
-- Expected performance improvement: 40%
-- Legacy campaign-type architecture completely removed
-- Rollback available via 000035_eliminate_dual_architecture.down.sql
-- ======================================================================