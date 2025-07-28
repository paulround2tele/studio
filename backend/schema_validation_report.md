# Schema Validation Report

## Missing Tables

These models don't have corresponding tables in the database:

- dns_validation_campaign_params
- campaigns
- d_n_s_validation_result
- http_keyword_campaign_params
- h_t_t_p_keyword_result

## Missing Models

These tables don't have corresponding models in the code:

- cache_invalidation_log
- cache_invalidations
- campaign_access_grants
- proxy_pool_memberships
- users
- keyword_rules
- lead_generation_campaigns
- architecture_refactor_log
- auth_audit_logs
- cache_configurations
- communication_patterns
- dns_validation_results
- pagination_performance_metrics
- password_reset_tokens
- proxy_pools
- authorization_decisions
- campaign_state_events
- campaign_state_snapshots
- connection_pool_metrics
- security_events
- service_dependencies
- cache_entries
- config_versions
- http_keyword_results
- cache_metrics
- config_locks
- event_projections
- query_performance_metrics
- rate_limits
- campaign_phases
- event_store
- service_capacity_metrics
- sessions
- campaign_state_transitions
- resource_utilization_metrics
- service_architecture_metrics

## Field Mismatches

### Table: domain_generation_config_states

#### Missing Columns

These fields in the model don't have corresponding columns in the database:

| Field | Type |
|-------|------|
| ConfigState | *models.DomainGenerationConfigState |

### Table: generated_domains

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| http_status | HTTPStatus | USER-DEFINED | *models.DomainHTTPStatusEnum |
| lead_status | LeadStatus | USER-DEFINED | *models.DomainLeadStatusEnum |
| dns_ip | DNSIP | inet | sql.NullString |
| dns_status | DNSStatus | USER-DEFINED | *models.DomainDNSStatusEnum |

### Table: personas

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| persona_type | PersonaType | USER-DEFINED | models.PersonaTypeEnum |
| status | Status | USER-DEFINED | *models.PersonaStatusEnum |

### Table: audit_logs

#### Missing Fields

These columns in the database don't have corresponding fields in the model:

| Column | Type |
|--------|------|
| session_id | character varying |
| endpoint | character varying |
| compliance_tags | ARRAY |
| campaign_phase | USER-DEFINED |
| service_name | character varying |
| execution_time_ms | integer |
| request_id | uuid |
| data_classification | character varying |
| retention_policy | character varying |
| campaign_id | uuid |
| http_method | character varying |
| response_status | integer |

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| client_ip | ClientIP | inet | sql.NullString |

### Table: proxies

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| protocol | Protocol | USER-DEFINED | *models.ProxyProtocolEnum |
| status | Status | USER-DEFINED | *models.ProxyStatusEnum |

### Table: campaign_jobs

#### Type Mismatches

These fields have type mismatches between the database and the model:

| Column | Field | Database Type | Model Type |
|--------|-------|---------------|------------|
| job_type | JobType | USER-DEFINED | models.JobTypeEnum |
| business_status | BusinessStatus | USER-DEFINED | *models.JobBusinessStatusEnum |
| status | Status | USER-DEFINED | models.CampaignJobStatusEnum |

