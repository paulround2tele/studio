-- Persona and Proxy Infrastructure Schema
-- Based on Go models: Persona, Proxy, ProxyPool, ProxyPoolMembership

-- Persona type enum for DNS and HTTP personas
CREATE TYPE persona_type_enum AS ENUM (
    'dns',
    'http'
);

-- Persona status enum
CREATE TYPE persona_status_enum AS ENUM (
    'Active',
    'Disabled', 
    'Testing',
    'Failed'
);

-- Proxy protocol enum
CREATE TYPE proxy_protocol_enum AS ENUM (
    'http',
    'https',
    'socks5',
    'socks4'
);

-- Proxy status enum
CREATE TYPE proxy_status_enum AS ENUM (
    'Active',
    'Disabled',
    'Testing', 
    'Failed'
);

-- Personas table for DNS and HTTP validation configurations
CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    persona_type persona_type_enum NOT NULL,
    description TEXT,
    config_details JSONB NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status persona_status_enum,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Frontend-expected properties
    last_tested TIMESTAMPTZ,
    last_error TEXT,
    tags TEXT[]
);

-- Proxies table for proxy server configurations
CREATE TABLE IF NOT EXISTS proxies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    address TEXT NOT NULL, -- Full proxy address (e.g., 'http://user:pass@host:port')
    protocol proxy_protocol_enum,
    username VARCHAR(255),
    password_hash TEXT, -- Hashed password
    host VARCHAR(255), -- Hostname or IP
    port INTEGER CHECK (port BETWEEN 1 AND 65535),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_healthy BOOLEAN NOT NULL DEFAULT FALSE,
    last_status VARCHAR(50), -- e.g., 'Active', 'Inactive', 'Error'
    last_checked_at TIMESTAMPTZ,
    latency_ms INTEGER CHECK (latency_ms >= 0),
    city VARCHAR(100),
    country_code VARCHAR(2),
    provider VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Frontend-expected fields
    status proxy_status_enum,
    notes TEXT,
    success_count INTEGER DEFAULT 0 CHECK (success_count >= 0),
    failure_count INTEGER DEFAULT 0 CHECK (failure_count >= 0),
    last_tested TIMESTAMPTZ,
    last_error TEXT
);

-- Proxy pools table for managing groups of proxies
CREATE TABLE IF NOT EXISTS proxy_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    pool_strategy VARCHAR(50), -- 'round_robin', 'random', 'weighted', 'failover'
    health_check_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    health_check_interval_seconds INTEGER CHECK (health_check_interval_seconds > 0),
    max_retries INTEGER CHECK (max_retries >= 0),
    timeout_seconds INTEGER CHECK (timeout_seconds > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proxy pool memberships junction table
CREATE TABLE IF NOT EXISTS proxy_pool_memberships (
    pool_id UUID NOT NULL REFERENCES proxy_pools(id) ON DELETE CASCADE,
    proxy_id UUID NOT NULL REFERENCES proxies(id) ON DELETE CASCADE,
    weight INTEGER CHECK (weight > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (pool_id, proxy_id)
);

-- Indexes for personas table
CREATE INDEX IF NOT EXISTS idx_personas_name ON personas(name);
CREATE INDEX IF NOT EXISTS idx_personas_persona_type ON personas(persona_type);
CREATE INDEX IF NOT EXISTS idx_personas_is_enabled ON personas(is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_personas_status ON personas(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personas_created_at ON personas(created_at);
CREATE INDEX IF NOT EXISTS idx_personas_updated_at ON personas(updated_at);
CREATE INDEX IF NOT EXISTS idx_personas_last_tested ON personas(last_tested) WHERE last_tested IS NOT NULL;

-- GIN index for persona config details JSONB
CREATE INDEX IF NOT EXISTS idx_personas_config_details_gin ON personas USING GIN(config_details);

-- GIN index for persona tags array
CREATE INDEX IF NOT EXISTS idx_personas_tags_gin ON personas USING GIN(tags) WHERE tags IS NOT NULL;

-- Indexes for proxies table
CREATE INDEX IF NOT EXISTS idx_proxies_name ON proxies(name);
CREATE INDEX IF NOT EXISTS idx_proxies_protocol ON proxies(protocol) WHERE protocol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxies_is_enabled ON proxies(is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_proxies_is_healthy ON proxies(is_healthy);
CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxies_host ON proxies(host) WHERE host IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxies_port ON proxies(port) WHERE port IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxies_last_checked_at ON proxies(last_checked_at) WHERE last_checked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxies_latency_ms ON proxies(latency_ms) WHERE latency_ms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxies_country_code ON proxies(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxies_provider ON proxies(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxies_created_at ON proxies(created_at);
CREATE INDEX IF NOT EXISTS idx_proxies_updated_at ON proxies(updated_at);
CREATE INDEX IF NOT EXISTS idx_proxies_last_tested ON proxies(last_tested) WHERE last_tested IS NOT NULL;

-- Composite indexes for common proxy queries
CREATE INDEX IF NOT EXISTS idx_proxies_enabled_healthy ON proxies(is_enabled, is_healthy) WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_proxies_protocol_enabled ON proxies(protocol, is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_proxies_country_enabled ON proxies(country_code, is_enabled) WHERE country_code IS NOT NULL AND is_enabled = TRUE;

-- Indexes for proxy pools table
CREATE INDEX IF NOT EXISTS idx_proxy_pools_name ON proxy_pools(name);
CREATE INDEX IF NOT EXISTS idx_proxy_pools_is_enabled ON proxy_pools(is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_proxy_pools_pool_strategy ON proxy_pools(pool_strategy) WHERE pool_strategy IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxy_pools_health_check_enabled ON proxy_pools(health_check_enabled) WHERE health_check_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_proxy_pools_created_at ON proxy_pools(created_at);
CREATE INDEX IF NOT EXISTS idx_proxy_pools_updated_at ON proxy_pools(updated_at);

-- Indexes for proxy pool memberships table
CREATE INDEX IF NOT EXISTS idx_proxy_pool_memberships_pool_id ON proxy_pool_memberships(pool_id);
CREATE INDEX IF NOT EXISTS idx_proxy_pool_memberships_proxy_id ON proxy_pool_memberships(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_pool_memberships_is_active ON proxy_pool_memberships(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_proxy_pool_memberships_weight ON proxy_pool_memberships(weight) WHERE weight IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxy_pool_memberships_added_at ON proxy_pool_memberships(added_at);

-- Composite indexes for pool membership queries
CREATE INDEX IF NOT EXISTS idx_proxy_pool_memberships_pool_active ON proxy_pool_memberships(pool_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_proxy_pool_memberships_pool_weight ON proxy_pool_memberships(pool_id, weight DESC) WHERE is_active = TRUE AND weight IS NOT NULL;

-- Add foreign key constraints for personas referenced in validation results
ALTER TABLE dns_validation_results 
ADD CONSTRAINT fk_dns_validation_results_persona_id 
FOREIGN KEY (validated_by_persona_id) REFERENCES personas(id) ON DELETE SET NULL;

ALTER TABLE http_keyword_results 
ADD CONSTRAINT fk_http_keyword_results_persona_id 
FOREIGN KEY (validated_by_persona_id) REFERENCES personas(id) ON DELETE SET NULL;

ALTER TABLE http_keyword_results 
ADD CONSTRAINT fk_http_keyword_results_proxy_id 
FOREIGN KEY (used_proxy_id) REFERENCES proxies(id) ON DELETE SET NULL;