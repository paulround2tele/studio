-- Rollback Stored Procedures

-- Drop all stored procedures and functions
DROP FUNCTION IF EXISTS start_campaign(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS setup_campaign_phases(UUID, UUID);
DROP FUNCTION IF EXISTS advance_campaign_phase(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS create_phase_jobs(UUID, phase_type_enum, UUID);
DROP FUNCTION IF EXISTS process_job_queue(VARCHAR, TEXT[], INTEGER);
DROP FUNCTION IF EXISTS complete_job(UUID, BOOLEAN, JSONB, TEXT);
DROP FUNCTION IF EXISTS batch_update_domain_validation(UUID, JSONB);
DROP FUNCTION IF EXISTS generate_campaign_analytics(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS cleanup_old_jobs(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS check_phase_completion(UUID);

-- Drop specialized indexes created for stored procedures
DROP INDEX IF EXISTS idx_campaign_jobs_worker_processing;
DROP INDEX IF EXISTS idx_generated_domains_batch_validation;