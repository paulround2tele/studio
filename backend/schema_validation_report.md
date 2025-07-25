# Schema Validation Report

## Missing Tables

These models don't have corresponding tables in the database:

- campaigns
- dns_validation_campaign_params
- d_n_s_validation_result
- h_t_t_p_keyword_result

## Missing Models

These tables don't have corresponding models in the code:

- cache_entries
- campaign_state_events
- event_store
- service_capacity_metrics
- auth_audit_logs
- cache_configurations
- config_versions
- pagination_performance_metrics
- campaign_state_snapshots
- campaign_state_transitions
- communication_patterns
- keyword_rules
- proxy_pools
- resource_utilization_metrics
- sessions
- users
- cache_metrics
- campaign_phases
- config_locks
- dns_validation_results
- http_keyword_results
- architecture_refactor_log
- campaign_access_grants
- query_performance_metrics
- service_dependencies
- authorization_decisions
- connection_pool_metrics
- event_projections
- proxy_pool_memberships
- cache_invalidation_log
- cache_invalidations
- lead_generation_campaigns
- password_reset_tokens
- rate_limits
- security_events
- service_architecture_metrics

## Field Mismatches

### Table: personas

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| persona_type | PersonaType | USER-DEFINED | models.PersonaTypeEnum |
| status | Status | USER-DEFINED | *models.PersonaStatusEnum |

### Table: campaign_jobs

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| status | Status | USER-DEFINED | models.CampaignJobStatusEnum |
| business_status | BusinessStatus | USER-DEFINED | *models.JobBusinessStatusEnum |
| job_type | JobType | USER-DEFINED | models.JobTypeEnum |

### Table: http_keyword_campaign_params

#### Missing Fields

These columns in the database don't have corresponding fields in the model:

| Column | Type |
|--------|------|
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |

#### Nullable Mismatches

These fields have nullable mismatches between the database and the model:

| Column | Field | Database Type | Model Type | Suggested Fix |
|--------|-------|---------------|------------|---------------|
| keyword_set_ids | KeywordSetIDs | ARRAY (nullable) | []uuid.UUID | *[]uuid.UUID |

### Table: domain_generation_config_states

#### Missing Columns

These fields in the model don't have corresponding columns in the database:

| Field | Type |
|-------|------|
| ConfigState | *models.DomainGenerationConfigState |

### Table: generated_domains

#### Missing Columns

These fields in the model don't have corresponding columns in the database:

| Field | Type |
|-------|------|
| CampaignID | uuid.UUID |

#### Missing Fields

These columns in the database don't have corresponding fields in the model:

| Column | Type |
|--------|------|
| domain_generation_campaign_id | uuid |

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| dns_ip | DNSIP | inet | sql.NullString |
| dns_status | DNSStatus | USER-DEFINED | *models.DomainDNSStatusEnum |
| http_status | HTTPStatus | USER-DEFINED | *models.DomainHTTPStatusEnum |
| lead_status | LeadStatus | USER-DEFINED | *models.DomainLeadStatusEnum |

### Table: proxies

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| status | Status | USER-DEFINED | *models.ProxyStatusEnum |
| protocol | Protocol | USER-DEFINED | *models.ProxyProtocolEnum |

### Table: audit_logs

#### Missing Fields

These columns in the database don't have corresponding fields in the model:

| Column | Type |
|--------|------|
| session_id | character varying |
| service_name | character varying |
| endpoint | character varying |
| http_method | character varying |
| response_status | integer |
| campaign_id | uuid |
| request_id | uuid |
| execution_time_ms | integer |
| retention_policy | character varying |
| campaign_phase | USER-DEFINED |
| data_classification | character varying |
| compliance_tags | ARRAY |

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| client_ip | ClientIP | inet | sql.NullString |

