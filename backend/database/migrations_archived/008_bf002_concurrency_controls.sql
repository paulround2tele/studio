BEGIN;

-- Campaigns table (required for batch coordination)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    campaign_type TEXT NOT NULL DEFAULT 'domain_generation' CHECK (campaign_type IN ('domain_generation', 'dns_validation', 'http_keyword_validation')),
    status TEXT NOT NULL,
    user_id UUID,
    total_items BIGINT DEFAULT 0,
    processed_items BIGINT DEFAULT 0,
    successful_items BIGINT DEFAULT 0,
    failed_items BIGINT DEFAULT 0,
    progress_percentage DOUBLE PRECISION DEFAULT 0.0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

-- Domain generation campaign parameters table (required for batch coordination)
CREATE TABLE IF NOT EXISTS domain_generation_campaign_params (
    campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL,
    variable_length INT,
    character_set TEXT,
    constant_string TEXT,
    tld TEXT NOT NULL,
    num_domains_to_generate INT NOT NULL,
    total_possible_combinations BIGINT NOT NULL,
    current_offset BIGINT NOT NULL DEFAULT 0
);

-- Generated domains table (required for test cleanup)
CREATE TABLE IF NOT EXISTS generated_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_generation_campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    domain_name TEXT NOT NULL,
    source_keyword TEXT,
    source_pattern TEXT,
    tld TEXT,
    offset_index BIGINT NOT NULL DEFAULT 0,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_generated_domains_campaign_name UNIQUE (domain_generation_campaign_id, domain_name)
);

-- Worker coordination table for distributed locking
CREATE TABLE IF NOT EXISTS worker_coordination (
    worker_id VARCHAR(255) PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id),
    worker_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'idle',
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    assigned_tasks JSONB DEFAULT '[]',
    resource_locks JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worker_coordination_campaign ON worker_coordination(campaign_id);
CREATE INDEX idx_worker_coordination_status ON worker_coordination(status);
CREATE INDEX idx_worker_coordination_heartbeat ON worker_coordination(last_heartbeat);

-- Domain generation batch coordination
CREATE TABLE IF NOT EXISTS domain_generation_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    batch_number INTEGER NOT NULL,
    total_domains INTEGER NOT NULL,
    processed_domains INTEGER DEFAULT 0,
    failed_domains INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_worker_id VARCHAR(255),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, batch_number)
);

CREATE INDEX idx_domain_batches_campaign ON domain_generation_batches(campaign_id);
CREATE INDEX idx_domain_batches_status ON domain_generation_batches(status);
CREATE INDEX idx_domain_batches_worker ON domain_generation_batches(assigned_worker_id);

-- Resource locks table for fine-grained locking
CREATE TABLE IF NOT EXISTS resource_locks (
    lock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    lock_holder VARCHAR(255) NOT NULL,
    lock_mode VARCHAR(50) NOT NULL DEFAULT 'exclusive',
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    renewal_count INTEGER DEFAULT 0,
    context JSONB DEFAULT '{}',
    UNIQUE(resource_type, resource_id, lock_mode)
);

CREATE INDEX idx_resource_locks_expires ON resource_locks(expires_at);
CREATE INDEX idx_resource_locks_holder ON resource_locks(lock_holder);
CREATE INDEX idx_resource_locks_resource ON resource_locks(resource_type, resource_id);

-- Function for atomic batch assignment
CREATE OR REPLACE FUNCTION assign_domain_batch(
    p_campaign_id UUID,
    p_worker_id VARCHAR(255),
    p_batch_size INTEGER DEFAULT 1000
) RETURNS UUID AS $$
DECLARE
    batch_id UUID;
    batch_num INTEGER;
BEGIN
    -- Get next available batch
    SELECT dgb.batch_id, dgb.batch_number INTO batch_id, batch_num
    FROM domain_generation_batches dgb
    WHERE dgb.campaign_id = p_campaign_id 
      AND dgb.status = 'pending'
      AND dgb.assigned_worker_id IS NULL
    ORDER BY dgb.batch_number
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    IF batch_id IS NULL THEN
        RETURN NULL; -- No available batches
    END IF;
    
    -- Assign batch to worker
    UPDATE domain_generation_batches
    SET assigned_worker_id = p_worker_id,
        status = 'assigned',
        started_at = NOW()
    WHERE domain_generation_batches.batch_id = batch_id;
    
    -- Update worker coordination
    INSERT INTO worker_coordination (worker_id, campaign_id, worker_type, status, assigned_tasks)
    VALUES (p_worker_id, p_campaign_id, 'domain_generator', 'working', 
            jsonb_build_array(jsonb_build_object('batch_id', batch_id, 'batch_number', batch_num)))
    ON CONFLICT (worker_id) DO UPDATE SET
        campaign_id = EXCLUDED.campaign_id,
        status = EXCLUDED.status,
        assigned_tasks = worker_coordination.assigned_tasks || EXCLUDED.assigned_tasks,
        last_heartbeat = NOW(),
        updated_at = NOW();
    
    RETURN batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function for resource lock acquisition
CREATE OR REPLACE FUNCTION acquire_resource_lock(
    p_resource_type VARCHAR(100),
    p_resource_id VARCHAR(255),
    p_lock_holder VARCHAR(255),
    p_lock_mode VARCHAR(50) DEFAULT 'exclusive',
    p_timeout_seconds INTEGER DEFAULT 30
) RETURNS UUID AS $$
DECLARE
    lock_id UUID;
    expiry_time TIMESTAMPTZ := NOW() + (p_timeout_seconds || ' seconds')::INTERVAL;
BEGIN
    -- Clean up expired locks
    DELETE FROM resource_locks WHERE expires_at < NOW();
    
    -- Try to acquire lock
    INSERT INTO resource_locks 
        (resource_type, resource_id, lock_holder, lock_mode, expires_at)
    VALUES 
        (p_resource_type, p_resource_id, p_lock_holder, p_lock_mode, expiry_time)
    ON CONFLICT (resource_type, resource_id, lock_mode) DO NOTHING
    RETURNING resource_locks.lock_id INTO lock_id;
    
    RETURN lock_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;