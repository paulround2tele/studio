-- Domain Generation and Validation Schema
-- Based on Go models: GeneratedDomain, DomainGenerationCampaignParams, DomainGenerationConfigState

-- Generated domains table with inline DNS/HTTP status tracking
CREATE TABLE IF NOT EXISTS generated_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) NOT NULL,
    offset_index BIGINT NOT NULL CHECK (offset_index >= 0),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_keyword VARCHAR(255),
    source_pattern VARCHAR(255),
    tld VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Domain-centric validation status fields
    dns_status domain_dns_status_enum DEFAULT 'pending',
    dns_ip INET,
    http_status domain_http_status_enum DEFAULT 'pending', 
    http_status_code INTEGER CHECK (http_status_code BETWEEN 100 AND 599),
    http_title TEXT,
    http_keywords TEXT,
    lead_status domain_lead_status_enum DEFAULT 'pending',
    lead_score DECIMAL(5,2) DEFAULT 0.0 CHECK (lead_score >= 0 AND lead_score <= 100),
    last_validated_at TIMESTAMPTZ
);

-- Domain generation campaign parameters table
CREATE TABLE IF NOT EXISTS domain_generation_campaign_params (
    campaign_id UUID PRIMARY KEY REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    pattern_type domain_pattern_type_enum NOT NULL,
    variable_length INTEGER NOT NULL CHECK (variable_length > 0),
    character_set VARCHAR(255) NOT NULL,
    constant_string VARCHAR(255),
    tld VARCHAR(50) NOT NULL,
    num_domains_to_generate INTEGER NOT NULL CHECK (num_domains_to_generate > 0),
    total_possible_combinations BIGINT NOT NULL CHECK (total_possible_combinations > 0),
    current_offset BIGINT NOT NULL DEFAULT 0 CHECK (current_offset >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Domain generation config states for global offset tracking
CREATE TABLE IF NOT EXISTS domain_generation_config_states (
    config_hash VARCHAR(64) PRIMARY KEY,
    last_offset BIGINT NOT NULL DEFAULT 0 CHECK (last_offset >= 0),
    config_details JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DNS validation results table (for legacy compatibility)
CREATE TABLE IF NOT EXISTS dns_validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dns_campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    generated_domain_id UUID REFERENCES generated_domains(id) ON DELETE SET NULL,
    domain_name VARCHAR(255) NOT NULL,
    validation_status VARCHAR(50) NOT NULL,
    business_status VARCHAR(50),
    dns_records JSONB,
    validated_by_persona_id UUID,
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HTTP keyword results table (for legacy compatibility)
CREATE TABLE IF NOT EXISTS http_keyword_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    http_keyword_campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id) ON DELETE CASCADE,
    dns_result_id UUID REFERENCES dns_validation_results(id) ON DELETE SET NULL,
    domain_name VARCHAR(255) NOT NULL,
    validation_status VARCHAR(50) NOT NULL,
    http_status_code INTEGER CHECK (http_status_code BETWEEN 100 AND 599),
    response_headers JSONB,
    page_title TEXT,
    extracted_content_snippet TEXT,
    found_keywords_from_sets JSONB,
    found_ad_hoc_keywords TEXT[],
    content_hash VARCHAR(64),
    validated_by_persona_id UUID,
    used_proxy_id UUID,
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for domain generation and validation
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_id ON generated_domains(campaign_id);
CREATE INDEX IF NOT EXISTS idx_generated_domains_domain_name ON generated_domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_generated_domains_offset_index ON generated_domains(offset_index);
CREATE INDEX IF NOT EXISTS idx_generated_domains_generated_at ON generated_domains(generated_at);
CREATE INDEX IF NOT EXISTS idx_generated_domains_dns_status ON generated_domains(dns_status);
CREATE INDEX IF NOT EXISTS idx_generated_domains_http_status ON generated_domains(http_status);
CREATE INDEX IF NOT EXISTS idx_generated_domains_lead_status ON generated_domains(lead_status);
CREATE INDEX IF NOT EXISTS idx_generated_domains_lead_score ON generated_domains(lead_score) WHERE lead_score > 0;
CREATE INDEX IF NOT EXISTS idx_generated_domains_last_validated_at ON generated_domains(last_validated_at) WHERE last_validated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_domains_tld ON generated_domains(tld) WHERE tld IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_offset ON generated_domains(campaign_id, offset_index);
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_dns_status ON generated_domains(campaign_id, dns_status);
CREATE INDEX IF NOT EXISTS idx_generated_domains_campaign_http_status ON generated_domains(campaign_id, http_status);
CREATE INDEX IF NOT EXISTS idx_generated_domains_dns_pending ON generated_domains(campaign_id, offset_index) WHERE dns_status IN ('pending', 'error');
CREATE INDEX IF NOT EXISTS idx_generated_domains_http_pending ON generated_domains(campaign_id, offset_index) WHERE http_status IN ('pending', 'error');

-- Indexes for domain generation parameters
CREATE INDEX IF NOT EXISTS idx_domain_generation_params_pattern_type ON domain_generation_campaign_params(pattern_type);
CREATE INDEX IF NOT EXISTS idx_domain_generation_params_tld ON domain_generation_campaign_params(tld);
CREATE INDEX IF NOT EXISTS idx_domain_generation_params_updated_at ON domain_generation_campaign_params(updated_at);

-- Indexes for domain generation config states
CREATE INDEX IF NOT EXISTS idx_domain_generation_config_states_updated_at ON domain_generation_config_states(updated_at);
CREATE INDEX IF NOT EXISTS idx_domain_generation_config_states_last_offset ON domain_generation_config_states(last_offset);

-- GIN index for config details JSONB
CREATE INDEX IF NOT EXISTS idx_domain_generation_config_states_details_gin ON domain_generation_config_states USING GIN(config_details);

-- Indexes for DNS validation results
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_campaign_id ON dns_validation_results(dns_campaign_id);
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_domain_id ON dns_validation_results(generated_domain_id) WHERE generated_domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_domain_name ON dns_validation_results(domain_name);
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_validation_status ON dns_validation_results(validation_status);
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_persona_id ON dns_validation_results(validated_by_persona_id) WHERE validated_by_persona_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_last_checked ON dns_validation_results(last_checked_at) WHERE last_checked_at IS NOT NULL;

-- Indexes for HTTP keyword results
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_campaign_id ON http_keyword_results(http_keyword_campaign_id);
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_dns_result_id ON http_keyword_results(dns_result_id) WHERE dns_result_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_domain_name ON http_keyword_results(domain_name);
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_validation_status ON http_keyword_results(validation_status);
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_http_status_code ON http_keyword_results(http_status_code) WHERE http_status_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_persona_id ON http_keyword_results(validated_by_persona_id) WHERE validated_by_persona_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_proxy_id ON http_keyword_results(used_proxy_id) WHERE used_proxy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_content_hash ON http_keyword_results(content_hash) WHERE content_hash IS NOT NULL;

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_dns_validation_results_dns_records_gin ON dns_validation_results USING GIN(dns_records) WHERE dns_records IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_response_headers_gin ON http_keyword_results USING GIN(response_headers) WHERE response_headers IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_keywords_gin ON http_keyword_results USING GIN(found_keywords_from_sets) WHERE found_keywords_from_sets IS NOT NULL;

-- GIN index for ad hoc keywords array
CREATE INDEX IF NOT EXISTS idx_http_keyword_results_ad_hoc_keywords_gin ON http_keyword_results USING GIN(found_ad_hoc_keywords) WHERE found_ad_hoc_keywords IS NOT NULL;

-- Unique constraints for domain generation
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_domains_campaign_offset_unique ON generated_domains(campaign_id, offset_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_domains_domain_name_unique ON generated_domains(domain_name);