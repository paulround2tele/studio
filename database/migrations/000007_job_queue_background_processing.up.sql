-- Job Queue and Background Processing Schema
-- Based on Go models: CampaignJob

-- Campaign jobs table for background processing with sophisticated job queue
CREATE TABLE IF NOT EXISTS campaign_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    job_type job_type_enum NOT NULL,
    status campaign_job_status_enum NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    job_payload JSONB,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
    last_error TEXT,
    last_attempted_at TIMESTAMPTZ,
    processing_server_id VARCHAR(255), -- Worker/server ID processing this job
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_execution_at TIMESTAMPTZ, -- For retry scheduling
    locked_at TIMESTAMPTZ, -- For job locking mechanism
    locked_by VARCHAR(255), -- Worker ID that locked this job
    business_status job_business_status_enum, -- High-level business status
    
    CONSTRAINT valid_job_attempts CHECK (attempts <= max_attempts)
);

-- Indexes for campaign jobs - optimized for job queue operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_campaign_id ON campaign_jobs(campaign_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_job_type ON campaign_jobs(job_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_status ON campaign_jobs(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_scheduled_at ON campaign_jobs(scheduled_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_created_at ON campaign_jobs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_updated_at ON campaign_jobs(updated_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_next_execution_at ON campaign_jobs(next_execution_at) WHERE next_execution_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_processing_server_id ON campaign_jobs(processing_server_id) WHERE processing_server_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_business_status ON campaign_jobs(business_status) WHERE business_status IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_locked_at ON campaign_jobs(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_locked_by ON campaign_jobs(locked_by) WHERE locked_by IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_last_attempted_at ON campaign_jobs(last_attempted_at) WHERE last_attempted_at IS NOT NULL;

-- Composite indexes optimized for job queue queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_status_scheduled ON campaign_jobs(status, scheduled_at) 
WHERE status IN ('queued', 'pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_next_queued ON campaign_jobs(status, scheduled_at, created_at)
WHERE status = 'queued';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_retry_ready ON campaign_jobs(business_status, next_execution_at)
WHERE business_status = 'retry';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_type_status ON campaign_jobs(job_type, status, scheduled_at) 
WHERE status IN ('queued', 'pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_processing_server ON campaign_jobs(processing_server_id, status, updated_at) 
WHERE processing_server_id IS NOT NULL AND status = 'running';

-- Index for job queue worker selection with skip locked optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_queue_worker_selection ON campaign_jobs(
    COALESCE(scheduled_at, '1970-01-01'::timestamptz), 
    created_at
) WHERE (status = 'queued' OR business_status = 'retry');

-- GIN index for job payload JSONB
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_payload_gin ON campaign_jobs USING GIN(job_payload) WHERE job_payload IS NOT NULL;

-- Partial indexes for specific job statuses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_failed ON campaign_jobs(campaign_id, job_type, last_attempted_at) 
WHERE status = 'failed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_completed ON campaign_jobs(campaign_id, job_type, updated_at) 
WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_running ON campaign_jobs(processing_server_id, locked_at) 
WHERE status = 'running';

-- Partial indexes for job cleanup and monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_stale_running ON campaign_jobs(locked_at, processing_server_id)
WHERE status = 'running';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_long_running ON campaign_jobs(locked_at, job_type)
WHERE status = 'running';

-- Index for job retry logic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_retry_candidates ON campaign_jobs(attempts, max_attempts, last_attempted_at) 
WHERE status = 'failed' AND attempts < max_attempts;

-- Unique constraint to prevent duplicate job scheduling
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_jobs_unique_pending 
ON campaign_jobs(campaign_id, job_type) 
WHERE status IN ('pending', 'queued', 'running');

-- Add check constraints for job queue integrity
ALTER TABLE campaign_jobs 
ADD CONSTRAINT chk_campaign_jobs_scheduled_execution_order 
CHECK (next_execution_at IS NULL OR next_execution_at >= scheduled_at);

ALTER TABLE campaign_jobs 
ADD CONSTRAINT chk_campaign_jobs_locked_consistency 
CHECK (
    (locked_at IS NULL AND locked_by IS NULL) OR 
    (locked_at IS NOT NULL AND locked_by IS NOT NULL)
);

ALTER TABLE campaign_jobs 
ADD CONSTRAINT chk_campaign_jobs_running_locked 
CHECK (
    status != 'running' OR 
    (locked_at IS NOT NULL AND locked_by IS NOT NULL AND processing_server_id IS NOT NULL)
);

-- Note: Job type validation against campaign phases will be handled in application layer
-- This ensures proper phase transitions and prevents invalid job creation
-- while avoiding PostgreSQL IMMUTABLE function constraints in CHECK constraints