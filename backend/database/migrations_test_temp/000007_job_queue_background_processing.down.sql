-- Rollback Job Queue and Background Processing Schema

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_audit_jobs ON campaign_jobs;
DROP TRIGGER IF EXISTS trigger_timestamp_jobs ON campaign_jobs;
DROP TRIGGER IF EXISTS trigger_job_status ON campaign_jobs;

-- Drop indexes
DROP INDEX IF EXISTS idx_campaign_jobs_campaign_id;
DROP INDEX IF EXISTS idx_campaign_jobs_job_type;
DROP INDEX IF EXISTS idx_campaign_jobs_status;
DROP INDEX IF EXISTS idx_campaign_jobs_priority;
DROP INDEX IF EXISTS idx_campaign_jobs_created_by;
DROP INDEX IF EXISTS idx_campaign_jobs_assigned_to;
DROP INDEX IF EXISTS idx_campaign_jobs_worker_id;
DROP INDEX IF EXISTS idx_campaign_jobs_scheduled_for;
DROP INDEX IF EXISTS idx_campaign_jobs_next_retry_at;
DROP INDEX IF EXISTS idx_campaign_jobs_created_at;
DROP INDEX IF EXISTS idx_campaign_jobs_started_at;
DROP INDEX IF EXISTS idx_campaign_jobs_completed_at;
DROP INDEX IF EXISTS idx_campaign_jobs_retry_count;
DROP INDEX IF EXISTS idx_campaign_jobs_worker_processing;
DROP INDEX IF EXISTS idx_generated_domains_batch_validation;

-- Drop table
DROP TABLE IF EXISTS campaign_jobs;

-- Drop enums
DROP TYPE IF EXISTS job_type_enum;
DROP TYPE IF EXISTS job_status_enum;