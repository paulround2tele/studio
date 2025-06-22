--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Ubuntu 17.5-1.pgdg25.04+1)
-- Dumped by pg_dump version 17.5 (Ubuntu 17.5-1.pgdg25.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.worker_coordination DROP CONSTRAINT IF EXISTS worker_coordination_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.security_events DROP CONSTRAINT IF EXISTS security_events_audit_log_id_fkey;
ALTER TABLE IF EXISTS ONLY public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE IF EXISTS ONLY public.proxy_pool_memberships DROP CONSTRAINT IF EXISTS proxy_pool_memberships_proxy_id_fkey;
ALTER TABLE IF EXISTS ONLY public.proxy_pool_memberships DROP CONSTRAINT IF EXISTS proxy_pool_memberships_pool_id_fkey;
ALTER TABLE IF EXISTS ONLY public.keyword_rules DROP CONSTRAINT IF EXISTS keyword_rules_keyword_set_id_fkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_results DROP CONSTRAINT IF EXISTS http_keyword_results_validated_by_persona_id_fkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_results DROP CONSTRAINT IF EXISTS http_keyword_results_used_proxy_id_fkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_results DROP CONSTRAINT IF EXISTS http_keyword_results_http_keyword_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_results DROP CONSTRAINT IF EXISTS http_keyword_results_dns_result_id_fkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_params DROP CONSTRAINT IF EXISTS http_keyword_params_source_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_params DROP CONSTRAINT IF EXISTS http_keyword_params_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_campaign_params DROP CONSTRAINT IF EXISTS http_keyword_campaign_params_source_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_campaign_params DROP CONSTRAINT IF EXISTS http_keyword_campaign_params_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.generated_domains DROP CONSTRAINT IF EXISTS generated_domains_domain_generation_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_params DROP CONSTRAINT IF EXISTS domain_generation_params_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_campaign_params DROP CONSTRAINT IF EXISTS domain_generation_campaign_params_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_batches DROP CONSTRAINT IF EXISTS domain_generation_batches_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dns_validation_results DROP CONSTRAINT IF EXISTS dns_validation_results_validated_by_persona_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dns_validation_results DROP CONSTRAINT IF EXISTS dns_validation_results_generated_domain_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dns_validation_results DROP CONSTRAINT IF EXISTS dns_validation_results_dns_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dns_validation_params DROP CONSTRAINT IF EXISTS dns_validation_params_source_generation_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dns_validation_params DROP CONSTRAINT IF EXISTS dns_validation_params_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_transitions DROP CONSTRAINT IF EXISTS campaign_state_transitions_state_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_transitions DROP CONSTRAINT IF EXISTS campaign_state_transitions_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_snapshots DROP CONSTRAINT IF EXISTS campaign_state_snapshots_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_events DROP CONSTRAINT IF EXISTS campaign_state_events_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.campaign_jobs DROP CONSTRAINT IF EXISTS campaign_jobs_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.campaign_access_grants DROP CONSTRAINT IF EXISTS campaign_access_grants_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.campaign_access_grants DROP CONSTRAINT IF EXISTS campaign_access_grants_granted_by_fkey;
ALTER TABLE IF EXISTS ONLY public.campaign_access_grants DROP CONSTRAINT IF EXISTS campaign_access_grants_campaign_id_fkey;
ALTER TABLE IF EXISTS ONLY public.authorization_decisions DROP CONSTRAINT IF EXISTS authorization_decisions_security_event_id_fkey;
DROP TRIGGER IF EXISTS trigger_update_state_event_processing ON public.campaign_state_transitions;
DROP TRIGGER IF EXISTS trg_campaigns_numeric_safety ON public.campaigns;
DROP TRIGGER IF EXISTS set_timestamp_proxies ON public.proxies;
DROP TRIGGER IF EXISTS set_timestamp_personas ON public.personas;
DROP TRIGGER IF EXISTS set_timestamp_keyword_sets ON public.keyword_sets;
DROP TRIGGER IF EXISTS set_timestamp_campaigns ON public.campaigns;
DROP TRIGGER IF EXISTS set_timestamp_campaign_jobs ON public.campaign_jobs;
DROP TRIGGER IF EXISTS proxy_pools_updated_at_trigger ON public.proxy_pools;
DROP TRIGGER IF EXISTS proxies_updated_at_trigger ON public.proxies;
DROP TRIGGER IF EXISTS keyword_rules_updated_at_trigger ON public.keyword_rules;
DROP INDEX IF EXISTS public.idx_worker_coordination_status;
DROP INDEX IF EXISTS public.idx_worker_coordination_heartbeat;
DROP INDEX IF EXISTS public.idx_worker_coordination_campaign;
DROP INDEX IF EXISTS public.idx_versioned_configs_version;
DROP INDEX IF EXISTS public.idx_versioned_configs_validation;
DROP INDEX IF EXISTS public.idx_versioned_configs_updated_at;
DROP INDEX IF EXISTS public.idx_versioned_configs_type_key;
DROP INDEX IF EXISTS public.idx_versioned_configs_created_at;
DROP INDEX IF EXISTS public.idx_versioned_configs_checksum;
DROP INDEX IF EXISTS public.idx_validation_violations_user;
DROP INDEX IF EXISTS public.idx_validation_violations_type;
DROP INDEX IF EXISTS public.idx_validation_violations_field;
DROP INDEX IF EXISTS public.idx_validation_violations_endpoint;
DROP INDEX IF EXISTS public.idx_validation_violations_created;
DROP INDEX IF EXISTS public.idx_validation_rules_method;
DROP INDEX IF EXISTS public.idx_validation_rules_field;
DROP INDEX IF EXISTS public.idx_validation_rules_endpoint;
DROP INDEX IF EXISTS public.idx_system_alerts_type;
DROP INDEX IF EXISTS public.idx_system_alerts_severity;
DROP INDEX IF EXISTS public.idx_system_alerts_created;
DROP INDEX IF EXISTS public.idx_suspicious_alerts_user_id;
DROP INDEX IF EXISTS public.idx_suspicious_alerts_severity;
DROP INDEX IF EXISTS public.idx_suspicious_alerts_pattern_name;
DROP INDEX IF EXISTS public.idx_suspicious_alerts_endpoint;
DROP INDEX IF EXISTS public.idx_suspicious_alerts_created_at;
DROP INDEX IF EXISTS public.idx_state_snapshots_version;
DROP INDEX IF EXISTS public.idx_state_snapshots_entity;
DROP INDEX IF EXISTS public.idx_state_events_version;
DROP INDEX IF EXISTS public.idx_state_events_correlation;
DROP INDEX IF EXISTS public.idx_slow_query_severity;
DROP INDEX IF EXISTS public.idx_slow_query_logged;
DROP INDEX IF EXISTS public.idx_slow_query_hash;
DROP INDEX IF EXISTS public.idx_slow_query_execution_time;
DROP INDEX IF EXISTS public.idx_security_events_user;
DROP INDEX IF EXISTS public.idx_security_events_type;
DROP INDEX IF EXISTS public.idx_security_events_risk;
DROP INDEX IF EXISTS public.idx_security_events_result;
DROP INDEX IF EXISTS public.idx_security_events_created;
DROP INDEX IF EXISTS public.idx_resource_locks_resource;
DROP INDEX IF EXISTS public.idx_resource_locks_holder;
DROP INDEX IF EXISTS public.idx_resource_locks_expires;
DROP INDEX IF EXISTS public.idx_query_performance_type;
DROP INDEX IF EXISTS public.idx_query_performance_optimization_score;
DROP INDEX IF EXISTS public.idx_query_performance_hash;
DROP INDEX IF EXISTS public.idx_query_performance_execution_time;
DROP INDEX IF EXISTS public.idx_query_performance_executed;
DROP INDEX IF EXISTS public.idx_query_optimization_type;
DROP INDEX IF EXISTS public.idx_query_optimization_priority;
DROP INDEX IF EXISTS public.idx_query_optimization_implemented;
DROP INDEX IF EXISTS public.idx_query_optimization_hash;
DROP INDEX IF EXISTS public.idx_proxy_pools_enabled;
DROP INDEX IF EXISTS public.idx_proxy_pool_memberships_proxy;
DROP INDEX IF EXISTS public.idx_proxy_pool_memberships_pool;
DROP INDEX IF EXISTS public.idx_proxies_is_enabled;
DROP INDEX IF EXISTS public.idx_proxies_healthy;
DROP INDEX IF EXISTS public.idx_proxies_enabled;
DROP INDEX IF EXISTS public.idx_personas_type;
DROP INDEX IF EXISTS public.idx_personas_is_enabled;
DROP INDEX IF EXISTS public.idx_memory_optimization_service;
DROP INDEX IF EXISTS public.idx_memory_optimization_priority;
DROP INDEX IF EXISTS public.idx_memory_optimization_implemented;
DROP INDEX IF EXISTS public.idx_memory_metrics_utilization;
DROP INDEX IF EXISTS public.idx_memory_metrics_state;
DROP INDEX IF EXISTS public.idx_memory_metrics_service_recorded;
DROP INDEX IF EXISTS public.idx_memory_metrics_service;
DROP INDEX IF EXISTS public.idx_memory_metrics_recorded;
DROP INDEX IF EXISTS public.idx_memory_leak_type;
DROP INDEX IF EXISTS public.idx_memory_leak_severity;
DROP INDEX IF EXISTS public.idx_memory_leak_service;
DROP INDEX IF EXISTS public.idx_memory_leak_resolved;
DROP INDEX IF EXISTS public.idx_memory_leak_detected;
DROP INDEX IF EXISTS public.idx_memory_allocations_type;
DROP INDEX IF EXISTS public.idx_memory_allocations_operation;
DROP INDEX IF EXISTS public.idx_memory_allocations_leaked;
DROP INDEX IF EXISTS public.idx_memory_allocations_created;
DROP INDEX IF EXISTS public.idx_memory_allocations_campaign;
DROP INDEX IF EXISTS public.idx_keyword_rules_type;
DROP INDEX IF EXISTS public.idx_keyword_rules_keyword_set;
DROP INDEX IF EXISTS public.idx_index_usage_table;
DROP INDEX IF EXISTS public.idx_index_usage_name;
DROP INDEX IF EXISTS public.idx_index_usage_frequency;
DROP INDEX IF EXISTS public.idx_index_usage_efficiency;
DROP INDEX IF EXISTS public.idx_http_results_status;
DROP INDEX IF EXISTS public.idx_http_results_domain_name;
DROP INDEX IF EXISTS public.idx_http_results_campaign_id;
DROP INDEX IF EXISTS public.idx_http_keyword_results_dns_result_id;
DROP INDEX IF EXISTS public.idx_http_keyword_params_source_campaign_id;
DROP INDEX IF EXISTS public.idx_http_keyword_params_campaign_id;
DROP INDEX IF EXISTS public.idx_generated_domains_offset_index;
DROP INDEX IF EXISTS public.idx_generated_domains_offset;
DROP INDEX IF EXISTS public.idx_generated_domains_name;
DROP INDEX IF EXISTS public.idx_generated_domains_keyword_search;
DROP INDEX IF EXISTS public.idx_generated_domains_domain_name_tld;
DROP INDEX IF EXISTS public.idx_generated_domains_campaign_id;
DROP INDEX IF EXISTS public.idx_generated_domains_campaign_created;
DROP INDEX IF EXISTS public.idx_domain_gen_params_campaign_id;
DROP INDEX IF EXISTS public.idx_domain_gen_offset;
DROP INDEX IF EXISTS public.idx_domain_config_states_version;
DROP INDEX IF EXISTS public.idx_domain_config_states_atomic;
DROP INDEX IF EXISTS public.idx_domain_batches_worker;
DROP INDEX IF EXISTS public.idx_domain_batches_status;
DROP INDEX IF EXISTS public.idx_domain_batches_campaign;
DROP INDEX IF EXISTS public.idx_dns_results_status;
DROP INDEX IF EXISTS public.idx_dns_results_domain_name;
DROP INDEX IF EXISTS public.idx_dns_results_campaign_id;
DROP INDEX IF EXISTS public.idx_coordination_locks_expires;
DROP INDEX IF EXISTS public.idx_connection_pool_metrics_state;
DROP INDEX IF EXISTS public.idx_connection_pool_metrics_recorded;
DROP INDEX IF EXISTS public.idx_connection_pool_metrics_pool;
DROP INDEX IF EXISTS public.idx_connection_leak_leaked;
DROP INDEX IF EXISTS public.idx_connection_leak_connection;
DROP INDEX IF EXISTS public.idx_connection_leak_acquired;
DROP INDEX IF EXISTS public.idx_config_versions_version;
DROP INDEX IF EXISTS public.idx_config_versions_hash;
DROP INDEX IF EXISTS public.idx_config_locks_owner;
DROP INDEX IF EXISTS public.idx_config_locks_expires;
DROP INDEX IF EXISTS public.idx_config_locks_config_hash;
DROP INDEX IF EXISTS public.idx_config_locks_active_unique;
DROP INDEX IF EXISTS public.idx_config_locks_active;
DROP INDEX IF EXISTS public.idx_campaigns_user_id;
DROP INDEX IF EXISTS public.idx_campaigns_user_active;
DROP INDEX IF EXISTS public.idx_campaigns_type;
DROP INDEX IF EXISTS public.idx_campaigns_total_items;
DROP INDEX IF EXISTS public.idx_campaigns_status_updated;
DROP INDEX IF EXISTS public.idx_campaigns_status_type_created;
DROP INDEX IF EXISTS public.idx_campaigns_status;
DROP INDEX IF EXISTS public.idx_campaigns_progress_tracking;
DROP INDEX IF EXISTS public.idx_campaigns_processed_items;
DROP INDEX IF EXISTS public.idx_campaigns_last_heartbeat;
DROP INDEX IF EXISTS public.idx_campaigns_large_numeric_values;
DROP INDEX IF EXISTS public.idx_campaigns_created_at;
DROP INDEX IF EXISTS public.idx_campaign_state_transitions_invalid;
DROP INDEX IF EXISTS public.idx_campaign_state_transitions_campaign_time;
DROP INDEX IF EXISTS public.idx_campaign_state_snapshots_valid;
DROP INDEX IF EXISTS public.idx_campaign_state_snapshots_campaign_sequence;
DROP INDEX IF EXISTS public.idx_campaign_state_events_type_campaign;
DROP INDEX IF EXISTS public.idx_campaign_state_events_processing_status;
DROP INDEX IF EXISTS public.idx_campaign_state_events_correlation;
DROP INDEX IF EXISTS public.idx_campaign_state_events_campaign_sequence;
DROP INDEX IF EXISTS public.idx_campaign_jobs_type;
DROP INDEX IF EXISTS public.idx_campaign_jobs_status_scheduled_at;
DROP INDEX IF EXISTS public.idx_campaign_jobs_status_next_execution;
DROP INDEX IF EXISTS public.idx_campaign_jobs_campaign_id;
DROP INDEX IF EXISTS public.idx_auth_decisions_user;
DROP INDEX IF EXISTS public.idx_auth_decisions_resource;
DROP INDEX IF EXISTS public.idx_auth_decisions_decision;
DROP INDEX IF EXISTS public.idx_auth_decisions_created;
DROP INDEX IF EXISTS public.idx_audit_logs_user_timestamp;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;
DROP INDEX IF EXISTS public.idx_audit_logs_timestamp;
DROP INDEX IF EXISTS public.idx_audit_logs_security_level;
DROP INDEX IF EXISTS public.idx_audit_logs_permissions;
DROP INDEX IF EXISTS public.idx_audit_logs_entity_type_id;
DROP INDEX IF EXISTS public.idx_audit_logs_entity_timestamp;
DROP INDEX IF EXISTS public.idx_audit_logs_entity_action_timestamp;
DROP INDEX IF EXISTS public.idx_audit_logs_authorization;
DROP INDEX IF EXISTS public.idx_audit_logs_access_decision;
DROP INDEX IF EXISTS public.idx_api_endpoint_permissions_resource;
DROP INDEX IF EXISTS public.idx_api_endpoint_permissions_pattern;
DROP INDEX IF EXISTS public.idx_api_endpoint_permissions_method;
DROP INDEX IF EXISTS public.idx_access_violations_user;
DROP INDEX IF EXISTS public.idx_access_violations_type;
DROP INDEX IF EXISTS public.idx_access_violations_endpoint;
DROP INDEX IF EXISTS public.idx_access_violations_created;
ALTER TABLE IF EXISTS ONLY public.worker_coordination DROP CONSTRAINT IF EXISTS worker_coordination_pkey;
ALTER TABLE IF EXISTS ONLY public.versioned_configs DROP CONSTRAINT IF EXISTS versioned_configs_type_key_unique;
ALTER TABLE IF EXISTS ONLY public.versioned_configs DROP CONSTRAINT IF EXISTS versioned_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_roles DROP CONSTRAINT IF EXISTS user_roles_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_transitions DROP CONSTRAINT IF EXISTS uq_state_transitions_event;
ALTER TABLE IF EXISTS ONLY public.personas DROP CONSTRAINT IF EXISTS uq_personas_name_type;
ALTER TABLE IF EXISTS ONLY public.http_keyword_results DROP CONSTRAINT IF EXISTS uq_http_results_campaign_domain;
ALTER TABLE IF EXISTS ONLY public.generated_domains DROP CONSTRAINT IF EXISTS uq_generated_domains_campaign_name;
ALTER TABLE IF EXISTS ONLY public.dns_validation_results DROP CONSTRAINT IF EXISTS uq_dns_results_campaign_domain;
ALTER TABLE IF EXISTS ONLY public.campaign_state_events DROP CONSTRAINT IF EXISTS uq_campaign_state_events_sequence;
ALTER TABLE IF EXISTS ONLY public.campaign_state_snapshots DROP CONSTRAINT IF EXISTS uq_campaign_snapshots_sequence;
ALTER TABLE IF EXISTS ONLY public.index_usage_analytics DROP CONSTRAINT IF EXISTS unique_index_analytics;
ALTER TABLE IF EXISTS ONLY public.resource_locks DROP CONSTRAINT IF EXISTS unique_exclusive_locks;
ALTER TABLE IF EXISTS ONLY public.system_alerts DROP CONSTRAINT IF EXISTS system_alerts_pkey;
ALTER TABLE IF EXISTS ONLY public.suspicious_input_patterns DROP CONSTRAINT IF EXISTS suspicious_input_patterns_pkey;
ALTER TABLE IF EXISTS ONLY public.suspicious_input_patterns DROP CONSTRAINT IF EXISTS suspicious_input_patterns_pattern_name_key;
ALTER TABLE IF EXISTS ONLY public.suspicious_input_alerts DROP CONSTRAINT IF EXISTS suspicious_input_alerts_pkey;
ALTER TABLE IF EXISTS ONLY public.state_snapshots DROP CONSTRAINT IF EXISTS state_snapshots_pkey;
ALTER TABLE IF EXISTS ONLY public.state_snapshots DROP CONSTRAINT IF EXISTS state_snapshots_entity_id_entity_type_snapshot_version_key;
ALTER TABLE IF EXISTS ONLY public.state_events DROP CONSTRAINT IF EXISTS state_events_pkey;
ALTER TABLE IF EXISTS ONLY public.state_coordination_locks DROP CONSTRAINT IF EXISTS state_coordination_locks_pkey;
ALTER TABLE IF EXISTS ONLY public.slow_query_log DROP CONSTRAINT IF EXISTS slow_query_log_pkey;
ALTER TABLE IF EXISTS ONLY public.si004_connection_pool_metrics DROP CONSTRAINT IF EXISTS si004_connection_pool_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.si004_connection_pool_alerts DROP CONSTRAINT IF EXISTS si004_connection_pool_alerts_pkey;
ALTER TABLE IF EXISTS ONLY public.si004_connection_leak_detection DROP CONSTRAINT IF EXISTS si004_connection_leak_detection_pkey;
ALTER TABLE IF EXISTS ONLY public.security_events DROP CONSTRAINT IF EXISTS security_events_pkey;
ALTER TABLE IF EXISTS ONLY public.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey1;
ALTER TABLE IF EXISTS ONLY public.schema_migrations_old DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE IF EXISTS ONLY public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.resource_locks DROP CONSTRAINT IF EXISTS resource_locks_pkey;
ALTER TABLE IF EXISTS ONLY public.query_performance_metrics DROP CONSTRAINT IF EXISTS query_performance_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.query_optimization_recommendations DROP CONSTRAINT IF EXISTS query_optimization_recommendations_pkey;
ALTER TABLE IF EXISTS ONLY public.proxy_pools DROP CONSTRAINT IF EXISTS proxy_pools_pkey;
ALTER TABLE IF EXISTS ONLY public.proxy_pools DROP CONSTRAINT IF EXISTS proxy_pools_name_key;
ALTER TABLE IF EXISTS ONLY public.proxy_pool_memberships DROP CONSTRAINT IF EXISTS proxy_pool_memberships_pkey;
ALTER TABLE IF EXISTS ONLY public.proxies DROP CONSTRAINT IF EXISTS proxies_pkey;
ALTER TABLE IF EXISTS ONLY public.proxies DROP CONSTRAINT IF EXISTS proxies_name_key;
ALTER TABLE IF EXISTS ONLY public.proxies DROP CONSTRAINT IF EXISTS proxies_address_key;
ALTER TABLE IF EXISTS ONLY public.personas DROP CONSTRAINT IF EXISTS personas_pkey;
ALTER TABLE IF EXISTS ONLY public.permissions DROP CONSTRAINT IF EXISTS permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.permissions DROP CONSTRAINT IF EXISTS permissions_name_key;
ALTER TABLE IF EXISTS ONLY public.memory_optimization_recommendations DROP CONSTRAINT IF EXISTS memory_optimization_recommendations_pkey;
ALTER TABLE IF EXISTS ONLY public.memory_metrics DROP CONSTRAINT IF EXISTS memory_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.memory_leak_detection DROP CONSTRAINT IF EXISTS memory_leak_detection_pkey;
ALTER TABLE IF EXISTS ONLY public.memory_allocations DROP CONSTRAINT IF EXISTS memory_allocations_pkey;
ALTER TABLE IF EXISTS ONLY public.keyword_sets DROP CONSTRAINT IF EXISTS keyword_sets_pkey;
ALTER TABLE IF EXISTS ONLY public.keyword_sets DROP CONSTRAINT IF EXISTS keyword_sets_name_key;
ALTER TABLE IF EXISTS ONLY public.keyword_rules DROP CONSTRAINT IF EXISTS keyword_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.input_validation_violations DROP CONSTRAINT IF EXISTS input_validation_violations_pkey;
ALTER TABLE IF EXISTS ONLY public.input_validation_rules DROP CONSTRAINT IF EXISTS input_validation_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.input_validation_rules DROP CONSTRAINT IF EXISTS input_validation_rules_endpoint_pattern_http_method_field_n_key;
ALTER TABLE IF EXISTS ONLY public.index_usage_analytics DROP CONSTRAINT IF EXISTS index_usage_analytics_pkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_results DROP CONSTRAINT IF EXISTS http_keyword_results_pkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_params DROP CONSTRAINT IF EXISTS http_keyword_params_pkey;
ALTER TABLE IF EXISTS ONLY public.http_keyword_campaign_params DROP CONSTRAINT IF EXISTS http_keyword_campaign_params_pkey;
ALTER TABLE IF EXISTS ONLY public.generated_domains DROP CONSTRAINT IF EXISTS generated_domains_pkey;
ALTER TABLE IF EXISTS ONLY public.enum_validation_failures DROP CONSTRAINT IF EXISTS enum_validation_failures_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_params DROP CONSTRAINT IF EXISTS domain_generation_params_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_config_states DROP CONSTRAINT IF EXISTS domain_generation_config_states_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_campaign_params DROP CONSTRAINT IF EXISTS domain_generation_campaign_params_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_batches DROP CONSTRAINT IF EXISTS domain_generation_batches_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_batches DROP CONSTRAINT IF EXISTS domain_generation_batches_campaign_id_batch_number_key;
ALTER TABLE IF EXISTS ONLY public.dns_validation_results DROP CONSTRAINT IF EXISTS dns_validation_results_pkey;
ALTER TABLE IF EXISTS ONLY public.dns_validation_params DROP CONSTRAINT IF EXISTS dns_validation_params_pkey;
ALTER TABLE IF EXISTS ONLY public.connection_pool_metrics DROP CONSTRAINT IF EXISTS connection_pool_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.connection_pool_alerts DROP CONSTRAINT IF EXISTS connection_pool_alerts_pkey;
ALTER TABLE IF EXISTS ONLY public.connection_pool_alerts DROP CONSTRAINT IF EXISTS connection_pool_alerts_alert_type_key;
ALTER TABLE IF EXISTS ONLY public.connection_leak_detection DROP CONSTRAINT IF EXISTS connection_leak_detection_pkey;
ALTER TABLE IF EXISTS ONLY public.config_versions DROP CONSTRAINT IF EXISTS config_versions_pkey;
ALTER TABLE IF EXISTS ONLY public.config_versions DROP CONSTRAINT IF EXISTS config_versions_config_hash_version_key;
ALTER TABLE IF EXISTS ONLY public.config_locks DROP CONSTRAINT IF EXISTS config_locks_pkey;
ALTER TABLE IF EXISTS ONLY public.campaigns DROP CONSTRAINT IF EXISTS campaigns_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_transitions DROP CONSTRAINT IF EXISTS campaign_state_transitions_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_snapshots DROP CONSTRAINT IF EXISTS campaign_state_snapshots_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_events DROP CONSTRAINT IF EXISTS campaign_state_events_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_jobs DROP CONSTRAINT IF EXISTS campaign_jobs_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_access_grants DROP CONSTRAINT IF EXISTS campaign_access_grants_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_access_grants DROP CONSTRAINT IF EXISTS campaign_access_grants_campaign_id_user_id_access_type_key;
ALTER TABLE IF EXISTS ONLY public.authorization_decisions DROP CONSTRAINT IF EXISTS authorization_decisions_pkey;
ALTER TABLE IF EXISTS ONLY public.authorization_decisions DROP CONSTRAINT IF EXISTS authorization_decisions_decision_id_key;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.api_endpoint_permissions DROP CONSTRAINT IF EXISTS api_endpoint_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.api_endpoint_permissions DROP CONSTRAINT IF EXISTS api_endpoint_permissions_endpoint_pattern_http_method_key;
ALTER TABLE IF EXISTS ONLY public.api_access_violations DROP CONSTRAINT IF EXISTS api_access_violations_pkey;
ALTER TABLE IF EXISTS public.versioned_configs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.si004_connection_pool_metrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.si004_connection_pool_alerts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.si004_connection_leak_detection ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.campaign_state_events ALTER COLUMN sequence_number DROP DEFAULT;
DROP TABLE IF EXISTS public.worker_coordination;
DROP SEQUENCE IF EXISTS public.versioned_configs_id_seq;
DROP TABLE IF EXISTS public.versioned_configs;
DROP VIEW IF EXISTS public.v_enum_documentation;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_roles;
DROP TABLE IF EXISTS public.system_alerts;
DROP TABLE IF EXISTS public.suspicious_input_patterns;
DROP TABLE IF EXISTS public.suspicious_input_alerts;
DROP TABLE IF EXISTS public.state_snapshots;
DROP TABLE IF EXISTS public.state_events;
DROP TABLE IF EXISTS public.state_coordination_locks;
DROP TABLE IF EXISTS public.slow_query_log;
DROP SEQUENCE IF EXISTS public.si004_connection_pool_metrics_id_seq;
DROP TABLE IF EXISTS public.si004_connection_pool_metrics;
DROP SEQUENCE IF EXISTS public.si004_connection_pool_alerts_id_seq;
DROP TABLE IF EXISTS public.si004_connection_pool_alerts;
DROP SEQUENCE IF EXISTS public.si004_connection_leak_detection_id_seq;
DROP TABLE IF EXISTS public.si004_connection_leak_detection;
DROP TABLE IF EXISTS public.security_events;
DROP TABLE IF EXISTS public.schema_migrations_old;
DROP TABLE IF EXISTS public.schema_migrations;
DROP TABLE IF EXISTS public.roles;
DROP TABLE IF EXISTS public.role_permissions;
DROP TABLE IF EXISTS public.resource_locks;
DROP TABLE IF EXISTS public.query_performance_metrics;
DROP TABLE IF EXISTS public.query_optimization_recommendations;
DROP TABLE IF EXISTS public.proxy_pools;
DROP TABLE IF EXISTS public.proxy_pool_memberships;
DROP VIEW IF EXISTS public.proxies_camel_view;
DROP TABLE IF EXISTS public.proxies;
DROP VIEW IF EXISTS public.personas_camel_view;
DROP TABLE IF EXISTS public.personas;
DROP TABLE IF EXISTS public.permissions;
DROP TABLE IF EXISTS public.memory_optimization_recommendations;
DROP TABLE IF EXISTS public.memory_metrics;
DROP TABLE IF EXISTS public.memory_leak_detection;
DROP TABLE IF EXISTS public.memory_allocations;
DROP TABLE IF EXISTS public.keyword_sets;
DROP TABLE IF EXISTS public.keyword_rules;
DROP TABLE IF EXISTS public.input_validation_violations;
DROP TABLE IF EXISTS public.input_validation_rules;
DROP TABLE IF EXISTS public.index_usage_analytics;
DROP TABLE IF EXISTS public.http_keyword_results;
DROP TABLE IF EXISTS public.http_keyword_params;
DROP TABLE IF EXISTS public.http_keyword_campaign_params;
DROP TABLE IF EXISTS public.generated_domains;
DROP TABLE IF EXISTS public.enum_validation_failures;
DROP TABLE IF EXISTS public.domain_generation_params;
DROP TABLE IF EXISTS public.domain_generation_config_states;
DROP TABLE IF EXISTS public.domain_generation_campaign_params;
DROP TABLE IF EXISTS public.domain_generation_batches;
DROP TABLE IF EXISTS public.dns_validation_results;
DROP TABLE IF EXISTS public.dns_validation_params;
DROP TABLE IF EXISTS public.connection_pool_metrics;
DROP TABLE IF EXISTS public.connection_pool_alerts;
DROP TABLE IF EXISTS public.connection_leak_detection;
DROP TABLE IF EXISTS public.config_versions;
DROP TABLE IF EXISTS public.config_locks;
DROP VIEW IF EXISTS public.campaigns_camel_view;
DROP TABLE IF EXISTS public.campaigns;
DROP TABLE IF EXISTS public.campaign_state_transitions;
DROP TABLE IF EXISTS public.campaign_state_snapshots;
DROP SEQUENCE IF EXISTS public.campaign_state_events_sequence_number_seq;
DROP TABLE IF EXISTS public.campaign_state_events;
DROP TABLE IF EXISTS public.campaign_jobs;
DROP TABLE IF EXISTS public.campaign_access_grants;
DROP TABLE IF EXISTS public.authorization_decisions;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.api_endpoint_permissions;
DROP TABLE IF EXISTS public.api_access_violations;
DROP FUNCTION IF EXISTS public.validate_input_field(p_endpoint_pattern character varying, p_http_method character varying, p_field_name character varying, p_field_value text, p_user_id uuid, p_session_id character varying);
DROP FUNCTION IF EXISTS public.validate_input_field(p_endpoint_pattern text, p_http_method text, p_field_name text, p_field_value text);
DROP FUNCTION IF EXISTS public.validate_enum_value(enum_type text, value text);
DROP FUNCTION IF EXISTS public.validate_config_consistency(p_config_type character varying, p_config_key character varying);
DROP FUNCTION IF EXISTS public.validate_column_naming();
DROP FUNCTION IF EXISTS public.validate_campaign_status();
DROP FUNCTION IF EXISTS public.validate_all_enums();
DROP FUNCTION IF EXISTS public.update_versioned_config_atomic(p_config_type character varying, p_config_key character varying, p_config_value jsonb, p_expected_version bigint, p_checksum character varying, p_updated_by character varying, p_metadata jsonb);
DROP FUNCTION IF EXISTS public.update_state_event_processing_status();
DROP FUNCTION IF EXISTS public.update_proxy_pools_updated_at();
DROP FUNCTION IF EXISTS public.update_proxies_updated_at();
DROP FUNCTION IF EXISTS public.update_keyword_rules_updated_at();
DROP FUNCTION IF EXISTS public.trigger_set_timestamp();
DROP FUNCTION IF EXISTS public.sync_domain_config_to_versioned();
DROP FUNCTION IF EXISTS public.release_state_lock(p_entity_id uuid, p_lock_token uuid);
DROP FUNCTION IF EXISTS public.release_state_lock(p_lock_key character varying);
DROP FUNCTION IF EXISTS public.release_config_lock(p_lock_id uuid, p_owner text);
DROP FUNCTION IF EXISTS public.record_query_performance(p_query_sql text, p_query_type character varying, p_execution_time_ms numeric, p_rows_examined bigint, p_rows_returned bigint, p_query_plan jsonb);
DROP FUNCTION IF EXISTS public.record_memory_metrics(p_service_name character varying, p_process_id character varying, p_heap_size_bytes bigint, p_heap_used_bytes bigint, p_gc_count bigint, p_gc_duration_ms bigint, p_goroutines_count integer, p_stack_size_bytes bigint);
DROP FUNCTION IF EXISTS public.record_connection_pool_metrics(p_pool_name character varying, p_active_connections integer, p_idle_connections integer, p_max_connections integer, p_wait_count integer, p_wait_duration_ms integer, p_connection_errors integer);
DROP FUNCTION IF EXISTS public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[], p_context jsonb, p_request_context jsonb, p_risk_score integer);
DROP FUNCTION IF EXISTS public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[], p_context jsonb, p_request_context jsonb);
DROP FUNCTION IF EXISTS public.get_versioned_config_with_lock(p_config_type character varying, p_config_key character varying, p_for_update boolean);
DROP FUNCTION IF EXISTS public.get_latest_campaign_state_snapshot(p_campaign_id uuid);
DROP FUNCTION IF EXISTS public.get_domain_config_state_with_lock(p_config_hash text, p_lock_type text);
DROP FUNCTION IF EXISTS public.get_config_history(p_config_type character varying, p_config_key character varying, p_limit integer);
DROP FUNCTION IF EXISTS public.get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint, p_to_sequence bigint, p_limit integer);
DROP FUNCTION IF EXISTS public.generate_user_agent_hash(user_agent_text text);
DROP FUNCTION IF EXISTS public.fn_validate_numeric_safety();
DROP FUNCTION IF EXISTS public.detect_memory_leak(p_service_name character varying, p_operation_id character varying, p_leaked_bytes bigint, p_leak_source character varying, p_stack_trace text);
DROP FUNCTION IF EXISTS public.create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb);
DROP FUNCTION IF EXISTS public.create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text, p_target_state text, p_reason text, p_triggered_by text, p_event_data jsonb, p_operation_context jsonb, p_correlation_id uuid);
DROP FUNCTION IF EXISTS public.cleanup_expired_config_locks();
DROP FUNCTION IF EXISTS public.check_query_optimization_needed(p_query_hash character varying, p_execution_time_ms numeric, p_optimization_score numeric);
DROP FUNCTION IF EXISTS public.check_memory_optimization_opportunities(p_service_name character varying, p_utilization_pct numeric, p_heap_used_bytes bigint);
DROP FUNCTION IF EXISTS public.check_endpoint_authorization(p_endpoint_pattern character varying, p_http_method character varying, p_user_permissions text[], p_user_role character varying, p_is_resource_owner boolean, p_has_campaign_access boolean);
DROP FUNCTION IF EXISTS public.check_connection_pool_alerts(p_pool_name character varying, p_utilization_pct integer, p_wait_duration_ms integer, p_connection_errors integer);
DROP FUNCTION IF EXISTS public.atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb);
DROP FUNCTION IF EXISTS public.assign_domain_batch(p_campaign_id uuid, p_worker_id character varying, p_batch_size integer);
DROP FUNCTION IF EXISTS public.analyze_index_usage();
DROP FUNCTION IF EXISTS public.acquire_state_lock(p_entity_id uuid, p_entity_type character varying, p_lock_holder character varying, p_lock_duration_seconds integer);
DROP FUNCTION IF EXISTS public.acquire_state_lock(p_lock_key character varying, p_locked_by character varying, p_timeout_seconds integer);
DROP FUNCTION IF EXISTS public.acquire_resource_lock(p_resource_type character varying, p_resource_id character varying, p_lock_holder character varying, p_lock_mode character varying, p_timeout_seconds integer);
DROP FUNCTION IF EXISTS public.acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone);
DROP TYPE IF EXISTS public.validation_status_enum;
DROP TYPE IF EXISTS public.proxy_protocol_enum;
DROP TYPE IF EXISTS public.persona_type_enum;
DROP TYPE IF EXISTS public.keyword_rule_type_enum;
DROP TYPE IF EXISTS public.http_validation_status_enum;
DROP TYPE IF EXISTS public.dns_validation_status_enum;
DROP TYPE IF EXISTS public.campaign_type_enum;
DROP TYPE IF EXISTS public.campaign_status_enum;
DROP TYPE IF EXISTS public.campaign_job_status_enum;
DROP SCHEMA IF EXISTS public;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: campaign_job_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_job_status_enum AS ENUM (
    'pending',
    'queued',
    'running',
    'processing',
    'completed',
    'failed',
    'retry'
);


--
-- Name: TYPE campaign_job_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.campaign_job_status_enum IS 'Maps to Go CampaignJobStatusEnum';


--
-- Name: campaign_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_status_enum AS ENUM (
    'pending',
    'queued',
    'running',
    'pausing',
    'paused',
    'completed',
    'failed',
    'cancelled'
);


--
-- Name: TYPE campaign_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.campaign_status_enum IS 'Maps to Go CampaignStatusEnum - no archived status';


--
-- Name: campaign_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_type_enum AS ENUM (
    'domain_generation',
    'dns_validation',
    'http_keyword_validation'
);


--
-- Name: TYPE campaign_type_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.campaign_type_enum IS 'Maps to Go CampaignTypeEnum';


--
-- Name: dns_validation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dns_validation_status_enum AS ENUM (
    'resolved',
    'unresolved',
    'timeout',
    'error'
);


--
-- Name: TYPE dns_validation_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.dns_validation_status_enum IS 'Maps to Go DNSValidationStatusEnum';


--
-- Name: http_validation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.http_validation_status_enum AS ENUM (
    'success',
    'failed',
    'timeout',
    'error'
);


--
-- Name: TYPE http_validation_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.http_validation_status_enum IS 'Maps to Go HTTPValidationStatusEnum';


--
-- Name: keyword_rule_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.keyword_rule_type_enum AS ENUM (
    'string',
    'regex'
);


--
-- Name: TYPE keyword_rule_type_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.keyword_rule_type_enum IS 'Maps to Go KeywordRuleTypeEnum';


--
-- Name: persona_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.persona_type_enum AS ENUM (
    'dns',
    'http'
);


--
-- Name: TYPE persona_type_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.persona_type_enum IS 'Maps to Go PersonaTypeEnum';


--
-- Name: proxy_protocol_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proxy_protocol_enum AS ENUM (
    'http',
    'https',
    'socks5',
    'socks4'
);


--
-- Name: TYPE proxy_protocol_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.proxy_protocol_enum IS 'Maps to Go ProxyProtocolEnum';


--
-- Name: validation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validation_status_enum AS ENUM (
    'pending',
    'valid',
    'invalid',
    'error',
    'skipped'
);


--
-- Name: TYPE validation_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.validation_status_enum IS 'Maps to Go ValidationStatusEnum';


--
-- Name: acquire_config_lock(text, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone) RETURNS TABLE(success boolean, lock_id uuid, conflict_owner text, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    existing_lock_owner TEXT;
    existing_expires_at TIMESTAMPTZ;
    new_lock_id UUID;
BEGIN
    -- Check for existing active locks
    SELECT owner, expires_at INTO existing_lock_owner, existing_expires_at
    FROM config_locks 
    WHERE config_hash = p_config_hash AND is_active = true
    FOR UPDATE;
    
    -- Check if existing lock is expired
    IF existing_lock_owner IS NOT NULL THEN
        IF existing_expires_at IS NOT NULL AND existing_expires_at <= NOW() THEN
            -- Clean up expired lock
            UPDATE config_locks 
            SET is_active = false, updated_at = NOW()
            WHERE config_hash = p_config_hash AND is_active = true AND expires_at <= NOW();
            existing_lock_owner := NULL;
        END IF;
    END IF;
    
    -- If lock exists and is not expired, return conflict
    IF existing_lock_owner IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, existing_lock_owner, 'Configuration is locked by another owner'::TEXT;
        RETURN;
    END IF;
    
    -- Create new lock
    new_lock_id := uuid_generate_v4();
    
    INSERT INTO config_locks (id, config_hash, lock_type, owner, lock_reason, acquired_at, expires_at, is_active, created_at, updated_at)
    VALUES (new_lock_id, p_config_hash, p_lock_type, p_owner, p_lock_reason, NOW(), p_expires_at, true, NOW(), NOW());
    
    RETURN QUERY SELECT TRUE, new_lock_id, NULL::TEXT, NULL::TEXT;
END;
$$;


--
-- Name: FUNCTION acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone) IS 'Atomically acquires a distributed lock on configuration with conflict detection';


--
-- Name: acquire_resource_lock(character varying, character varying, character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acquire_resource_lock(p_resource_type character varying, p_resource_id character varying, p_lock_holder character varying, p_lock_mode character varying DEFAULT 'exclusive'::character varying, p_timeout_seconds integer DEFAULT 30) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    lock_id UUID;
    expiry_time TIMESTAMPTZ := NOW() + (p_timeout_seconds || ' seconds')::INTERVAL;
    existing_locks INTEGER;
    existing_exclusive INTEGER;
BEGIN
    -- Clean up expired locks
    DELETE FROM resource_locks WHERE expires_at < NOW();
    
    -- Check existing locks on this resource
    SELECT COUNT(*), COUNT(*) FILTER (WHERE lock_mode = 'exclusive')
    INTO existing_locks, existing_exclusive
    FROM resource_locks 
    WHERE resource_type = p_resource_type AND resource_id = p_resource_id;
    
    -- Apply locking rules
    IF p_lock_mode = 'exclusive' THEN
        -- Exclusive lock: cannot acquire if any other locks exist
        IF existing_locks > 0 THEN
            RETURN NULL;
        END IF;
    ELSE
        -- Shared lock: cannot acquire if exclusive lock exists
        IF existing_exclusive > 0 THEN
            RETURN NULL;
        END IF;
    END IF;
    
    -- Acquire the lock
    INSERT INTO resource_locks
        (resource_type, resource_id, lock_holder, lock_mode, expires_at)
    VALUES
        (p_resource_type, p_resource_id, p_lock_holder, p_lock_mode, expiry_time)
    RETURNING resource_locks.lock_id INTO lock_id;
    
    RETURN lock_id;
END;
$$;


--
-- Name: acquire_state_lock(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acquire_state_lock(p_lock_key character varying, p_locked_by character varying, p_timeout_seconds integer DEFAULT 30) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
		BEGIN
			INSERT INTO state_coordination_locks (lock_key, locked_by, locked_at, expires_at)
			VALUES (p_lock_key, p_locked_by, NOW(), NOW() + (p_timeout_seconds || ' seconds')::INTERVAL)
			ON CONFLICT (lock_key) DO NOTHING;
			
			RETURN FOUND;
		END;
		$$;


--
-- Name: acquire_state_lock(uuid, character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acquire_state_lock(p_entity_id uuid, p_entity_type character varying, p_lock_holder character varying, p_lock_duration_seconds integer DEFAULT 30) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    lock_token UUID;
    current_time TIMESTAMPTZ := NOW();
    expiry_time TIMESTAMPTZ := current_time + (p_lock_duration_seconds || ' seconds')::INTERVAL;
BEGIN
    -- Clean up expired locks first
    DELETE FROM state_coordination_locks 
    WHERE expires_at < current_time;
    
    -- Try to acquire lock
    INSERT INTO state_coordination_locks 
        (entity_id, entity_type, lock_holder, lock_token, expires_at)
    VALUES 
        (p_entity_id, p_entity_type, p_lock_holder, gen_random_uuid(), expiry_time)
    ON CONFLICT (entity_id) DO NOTHING
    RETURNING lock_token INTO lock_token;
    
    RETURN lock_token;
END;
$$;


--
-- Name: analyze_index_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analyze_index_usage() RETURNS TABLE(schema_name text, table_name text, index_name text, index_type text, total_scans bigint, tuples_read bigint, tuples_fetched bigint, last_scan timestamp with time zone, usage_ratio numeric, recommendation text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        psi.schemaname::TEXT,
        psi.relname::TEXT,
        psi.indexrelname::TEXT,
        'btree'::TEXT as index_type,
        psi.idx_scan,
        psi.idx_tup_read,
        psi.idx_tup_fetch,
        psi.last_idx_scan,
        CASE 
            WHEN psi.idx_scan > 0 AND psi.idx_tup_read > 0 THEN ROUND((psi.idx_tup_fetch::DECIMAL / psi.idx_tup_read) * 100, 2)
            ELSE 0.00 
        END as usage_ratio,
        CASE 
            WHEN psi.idx_scan = 0 THEN 'Consider dropping unused index'
            WHEN psi.idx_scan < 100 THEN 'Low usage - review necessity'
            ELSE 'Good usage'
        END::TEXT as recommendation
    FROM pg_stat_user_indexes psi
    ORDER BY psi.idx_scan DESC;
END;
$$;


--
-- Name: assign_domain_batch(uuid, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_domain_batch(p_campaign_id uuid, p_worker_id character varying, p_batch_size integer DEFAULT 1000) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_batch_id UUID;
    v_batch_num INTEGER;
BEGIN
    -- Get next available batch
    SELECT dgb.batch_id, dgb.batch_number INTO v_batch_id, v_batch_num
    FROM domain_generation_batches dgb
    WHERE dgb.campaign_id = p_campaign_id
      AND dgb.status = 'pending'
      AND dgb.assigned_worker_id IS NULL
    ORDER BY dgb.batch_number
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_batch_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Assign batch to worker
    UPDATE domain_generation_batches
    SET assigned_worker_id = p_worker_id,
        status = 'assigned',
        started_at = NOW()
    WHERE batch_id = v_batch_id;

    -- Update worker coordination
    INSERT INTO worker_coordination (worker_id, campaign_id, worker_type, status, assigned_tasks)
    VALUES (p_worker_id, p_campaign_id, 'domain_generator', 'working',
            jsonb_build_array(jsonb_build_object('batch_id', v_batch_id, 'batch_number', v_batch_num)))
    ON CONFLICT (worker_id) DO UPDATE SET
        campaign_id = EXCLUDED.campaign_id,
        status = EXCLUDED.status,
        assigned_tasks = worker_coordination.assigned_tasks || EXCLUDED.assigned_tasks,
        last_heartbeat = NOW(),
        updated_at = NOW();

    RETURN v_batch_id;
END;
$$;


--
-- Name: atomic_update_domain_config_state(text, bigint, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb) RETURNS TABLE(success boolean, new_version bigint, conflict_version bigint, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_version BIGINT;
    current_offset BIGINT;
    new_version_val BIGINT;
BEGIN
    -- Acquire row-level lock and get current state
    SELECT version, last_offset INTO current_version, current_offset
    FROM domain_generation_config_states 
    WHERE config_hash = p_config_hash
    FOR UPDATE;
    
    -- Check if config exists
    IF NOT FOUND THEN
        -- Create new config if it doesn't exist
        IF p_expected_version != 0 THEN
            RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT, 'Config does not exist but expected version > 0'::TEXT;
            RETURN;
        END IF;
        
        INSERT INTO domain_generation_config_states 
            (config_hash, last_offset, config_details, version, updated_at, created_at)
        VALUES 
            (p_config_hash, p_new_last_offset, p_config_details, 1, NOW(), NOW());
        
        RETURN QUERY SELECT TRUE, 1::BIGINT, 0::BIGINT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check version for optimistic locking
    IF current_version != p_expected_version THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, current_version, 'Version conflict detected'::TEXT;
        RETURN;
    END IF;
    
    -- Validate that offset is not moving backward (race condition protection)
    IF p_new_last_offset < current_offset THEN
        RETURN QUERY SELECT FALSE, current_version, current_version, 
            format('Offset moving backward from %s to %s', current_offset, p_new_last_offset)::TEXT;
        RETURN;
    END IF;
    
    -- Update with new version
    new_version_val := current_version + 1;
    
    UPDATE domain_generation_config_states 
    SET 
        last_offset = p_new_last_offset,
        config_details = p_config_details,
        version = new_version_val,
        updated_at = NOW()
    WHERE config_hash = p_config_hash 
      AND version = p_expected_version;
    
    -- Verify update succeeded
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, current_version, 'Update failed - concurrent modification'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT TRUE, new_version_val, 0::BIGINT, NULL::TEXT;
END;
$$;


--
-- Name: FUNCTION atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb) IS 'Atomically updates domain generation config state with optimistic locking and race condition protection';


--
-- Name: check_connection_pool_alerts(character varying, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_connection_pool_alerts(p_pool_name character varying, p_utilization_pct integer, p_wait_duration_ms integer, p_connection_errors integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    alert_config RECORD;
BEGIN
    -- Check utilization alerts
    FOR alert_config IN 
        SELECT * FROM connection_pool_alerts 
        WHERE alert_enabled = true AND alert_type IN ('high_utilization', 'critical_utilization')
    LOOP
        IF p_utilization_pct >= alert_config.threshold_value THEN
            -- Log alert (would integrate with alerting system)
            INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
            VALUES (
                alert_config.alert_type,
                alert_config.severity_level,
                format('%s for pool %s: %s%%', alert_config.alert_message, p_pool_name, p_utilization_pct),
                jsonb_build_object('pool_name', p_pool_name, 'utilization_pct', p_utilization_pct),
                NOW()
            );
        END IF;
    END LOOP;
    
    -- Check wait time alerts
    IF p_wait_duration_ms > 1000 THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'connection_wait',
            'warning',
            format('Connection wait time %sms for pool %s', p_wait_duration_ms, p_pool_name),
            jsonb_build_object('pool_name', p_pool_name, 'wait_duration_ms', p_wait_duration_ms),
            NOW()
        );
    END IF;
    
    -- Check error alerts
    IF p_connection_errors > 0 THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'connection_errors',
            'error',
            format('%s connection errors for pool %s', p_connection_errors, p_pool_name),
            jsonb_build_object('pool_name', p_pool_name, 'error_count', p_connection_errors),
            NOW()
        );
    END IF;
END;
$$;


--
-- Name: check_endpoint_authorization(character varying, character varying, text[], character varying, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_endpoint_authorization(p_endpoint_pattern character varying, p_http_method character varying, p_user_permissions text[], p_user_role character varying, p_is_resource_owner boolean DEFAULT false, p_has_campaign_access boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    endpoint_config RECORD;
    authorization_result JSONB;
    missing_permissions TEXT[] := '{}'::TEXT[];
    has_required_permissions BOOLEAN := true;
    perm TEXT;
BEGIN
    -- Get endpoint configuration
    SELECT * INTO endpoint_config
    FROM api_endpoint_permissions
    WHERE endpoint_pattern = p_endpoint_pattern 
      AND http_method = p_http_method;
    
    IF NOT FOUND THEN
        -- Default deny for unknown endpoints
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'unknown_endpoint',
            'endpoint_pattern', p_endpoint_pattern,
            'http_method', p_http_method
        );
    END IF;
    
    -- Check role requirement
    IF endpoint_config.minimum_role = 'admin' AND p_user_role != 'admin' THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'insufficient_role',
            'required_role', endpoint_config.minimum_role,
            'user_role', p_user_role
        );
    END IF;
    
    -- Check ownership requirement
    IF endpoint_config.requires_ownership AND NOT p_is_resource_owner THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'ownership_required',
            'resource_type', endpoint_config.resource_type
        );
    END IF;
    
    -- Check campaign access requirement
    IF endpoint_config.requires_campaign_access AND NOT p_has_campaign_access THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'campaign_access_required',
            'resource_type', endpoint_config.resource_type
        );
    END IF;
    
    -- Check required permissions
    FOREACH perm IN ARRAY endpoint_config.required_permissions
    LOOP
        IF NOT (perm = ANY(p_user_permissions)) THEN
            missing_permissions := array_append(missing_permissions, perm);
            has_required_permissions := false;
        END IF;
    END LOOP;
    
    IF NOT has_required_permissions THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'missing_permissions',
            'required_permissions', endpoint_config.required_permissions,
            'missing_permissions', missing_permissions,
            'user_permissions', p_user_permissions
        );
    END IF;
    
    -- Authorization successful
    RETURN jsonb_build_object(
        'authorized', true,
        'required_permissions', endpoint_config.required_permissions,
        'resource_type', endpoint_config.resource_type
    );
END;
$$;


--
-- Name: check_memory_optimization_opportunities(character varying, numeric, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_memory_optimization_opportunities(p_service_name character varying, p_utilization_pct numeric, p_heap_used_bytes bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    avg_utilization DECIMAL(5,2);
    recommendation_exists BOOLEAN;
BEGIN
    -- Calculate average utilization over last hour
    SELECT AVG(memory_utilization_pct) INTO avg_utilization
    FROM memory_metrics
    WHERE service_name = p_service_name
      AND recorded_at > NOW() - INTERVAL '1 hour';
    
    -- Check if recommendation already exists
    SELECT EXISTS(
        SELECT 1 FROM memory_optimization_recommendations
        WHERE service_name = p_service_name
          AND implemented = false
          AND created_at > NOW() - INTERVAL '1 day'
    ) INTO recommendation_exists;
    
    -- Generate recommendations based on patterns
    IF NOT recommendation_exists THEN
        -- High consistent utilization
        IF avg_utilization >= 75 THEN
            INSERT INTO memory_optimization_recommendations 
                (recommendation_type, service_name, current_usage_bytes, 
                 recommended_limit_bytes, optimization_strategy, estimated_savings_bytes,
                 implementation_priority)
            VALUES (
                'increase_heap_size',
                p_service_name,
                p_heap_used_bytes,
                p_heap_used_bytes * 1.5,
                jsonb_build_object(
                    'strategy', 'increase_heap_allocation',
                    'reason', 'consistent_high_utilization',
                    'current_avg_utilization', avg_utilization
                ),
                0,
                'high'
            );
        END IF;
        
        -- Potential memory optimization for low utilization
        IF avg_utilization <= 25 THEN
            INSERT INTO memory_optimization_recommendations 
                (recommendation_type, service_name, current_usage_bytes,
                 recommended_limit_bytes, optimization_strategy, estimated_savings_bytes,
                 implementation_priority)
            VALUES (
                'reduce_heap_size',
                p_service_name,
                p_heap_used_bytes,
                p_heap_used_bytes * 0.6,
                jsonb_build_object(
                    'strategy', 'reduce_heap_allocation',
                    'reason', 'consistent_low_utilization',
                    'current_avg_utilization', avg_utilization
                ),
                p_heap_used_bytes * 0.4,
                'medium'
            );
        END IF;
    END IF;
END;
$$;


--
-- Name: check_query_optimization_needed(character varying, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_query_optimization_needed(p_query_hash character varying, p_execution_time_ms numeric, p_optimization_score numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    avg_execution_time DECIMAL(10,3);
    execution_count INTEGER;
    recommendation_exists BOOLEAN;
BEGIN
    -- Calculate average execution time for this query
    SELECT AVG(execution_time_ms), COUNT(*)
    INTO avg_execution_time, execution_count
    FROM query_performance_metrics
    WHERE query_hash = p_query_hash
      AND executed_at > NOW() - INTERVAL '1 hour';
    
    -- Check if recommendation already exists
    SELECT EXISTS(
        SELECT 1 FROM query_optimization_recommendations
        WHERE query_hash = p_query_hash
          AND implemented = false
          AND created_at > NOW() - INTERVAL '1 day'
    ) INTO recommendation_exists;
    
    -- Generate recommendations based on performance patterns
    IF NOT recommendation_exists AND execution_count >= 3 THEN
        -- Slow query optimization
        IF avg_execution_time > 1000 THEN
            INSERT INTO query_optimization_recommendations 
                (query_hash, recommendation_type, current_performance_ms,
                 estimated_improvement_pct, optimization_strategy, implementation_priority)
            VALUES (
                p_query_hash,
                'slow_query_optimization',
                avg_execution_time,
                60.0,
                jsonb_build_object(
                    'strategy', 'index_optimization',
                    'reason', 'consistent_slow_performance',
                    'avg_execution_time', avg_execution_time,
                    'execution_count', execution_count
                ),
                CASE WHEN avg_execution_time > 5000 THEN 'critical'
                     WHEN avg_execution_time > 2000 THEN 'high'
                     ELSE 'medium' END
            );
        END IF;
        
        -- Low optimization score
        IF p_optimization_score < 50 THEN
            INSERT INTO query_optimization_recommendations 
                (query_hash, recommendation_type, current_performance_ms,
                 estimated_improvement_pct, optimization_strategy, implementation_priority)
            VALUES (
                p_query_hash,
                'efficiency_optimization',
                avg_execution_time,
                40.0,
                jsonb_build_object(
                    'strategy', 'query_rewrite',
                    'reason', 'low_efficiency_score',
                    'optimization_score', p_optimization_score,
                    'execution_count', execution_count
                ),
                'medium'
            );
        END IF;
    END IF;
END;
$$;


--
-- Name: cleanup_expired_config_locks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_config_locks() RETURNS TABLE(cleaned_count integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    count_cleaned INTEGER;
BEGIN
    UPDATE config_locks 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true AND expires_at IS NOT NULL AND expires_at <= NOW();
    
    GET DIAGNOSTICS count_cleaned = ROW_COUNT;
    
    RETURN QUERY SELECT count_cleaned;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_config_locks(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_config_locks() IS 'Cleans up expired configuration locks';


--
-- Name: create_campaign_state_event(uuid, text, text, text, text, text, jsonb, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text DEFAULT NULL::text, p_target_state text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_triggered_by text DEFAULT 'system'::text, p_event_data jsonb DEFAULT '{}'::jsonb, p_operation_context jsonb DEFAULT '{}'::jsonb, p_correlation_id uuid DEFAULT NULL::uuid) RETURNS TABLE(event_id uuid, sequence_number bigint, success boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_event_id UUID;
    new_sequence BIGINT;
BEGIN
    -- Generate new event ID
    new_event_id := gen_random_uuid();
    
    -- Insert the event (sequence_number will be auto-generated)
    INSERT INTO campaign_state_events (
        id, campaign_id, event_type, source_state, target_state, reason,
        triggered_by, event_data, operation_context, correlation_id,
        occurred_at, persisted_at
    ) VALUES (
        new_event_id, p_campaign_id, p_event_type, p_source_state, p_target_state, p_reason,
        p_triggered_by, p_event_data, p_operation_context, p_correlation_id,
        NOW(), NOW()
    ) RETURNING campaign_state_events.sequence_number INTO new_sequence;
    
    -- Return success
    RETURN QUERY SELECT new_event_id, new_sequence, TRUE, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error
        RETURN QUERY SELECT NULL::UUID, 0::BIGINT, FALSE, SQLERRM::TEXT;
END;
$$;


--
-- Name: FUNCTION create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text, p_target_state text, p_reason text, p_triggered_by text, p_event_data jsonb, p_operation_context jsonb, p_correlation_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text, p_target_state text, p_reason text, p_triggered_by text, p_event_data jsonb, p_operation_context jsonb, p_correlation_id uuid) IS 'Creates a new state event with automatic sequence numbering and validation';


--
-- Name: create_campaign_state_snapshot(uuid, text, jsonb, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(snapshot_id uuid, success boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_snapshot_id UUID;
    calculated_checksum TEXT;
BEGIN
    -- Generate snapshot ID
    new_snapshot_id := gen_random_uuid();
    
    -- Calculate checksum for integrity
    calculated_checksum := md5(
        p_campaign_id::text || '|' ||
        p_current_state || '|' ||
        p_state_data::text || '|' ||
        p_last_event_sequence::text
    );
    
    -- Insert snapshot
    INSERT INTO campaign_state_snapshots (
        id, campaign_id, current_state, state_data, last_event_sequence,
        snapshot_metadata, checksum, created_at
    ) VALUES (
        new_snapshot_id, p_campaign_id, p_current_state, p_state_data, p_last_event_sequence,
        p_snapshot_metadata, calculated_checksum, NOW()
    );
    
    RETURN QUERY SELECT new_snapshot_id, TRUE, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$;


--
-- Name: FUNCTION create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb) IS 'Creates a new state snapshot with integrity checksum';


--
-- Name: detect_memory_leak(character varying, character varying, bigint, character varying, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_memory_leak(p_service_name character varying, p_operation_id character varying, p_leaked_bytes bigint, p_leak_source character varying, p_stack_trace text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    leak_id UUID;
    severity VARCHAR(20);
BEGIN
    -- Determine severity based on leaked bytes
    IF p_leaked_bytes >= 100 * 1024 * 1024 THEN -- 100MB
        severity := 'critical';
    ELSIF p_leaked_bytes >= 10 * 1024 * 1024 THEN -- 10MB
        severity := 'high';
    ELSIF p_leaked_bytes >= 1024 * 1024 THEN -- 1MB
        severity := 'medium';
    ELSE
        severity := 'low';
    END IF;
    
    -- Record memory leak
    INSERT INTO memory_leak_detection 
        (service_name, leak_type, leak_source, leaked_bytes, detection_method,
         stack_trace, operation_context, severity)
    VALUES 
        (p_service_name, 'operation_leak', p_leak_source, p_leaked_bytes, 'automatic',
         p_stack_trace, jsonb_build_object('operation_id', p_operation_id), severity)
    RETURNING id INTO leak_id;
    
    -- Create alert for significant leaks
    IF severity IN ('critical', 'high') THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'memory_leak_detected',
            severity,
            format('Memory leak detected in %s: %s bytes leaked from %s', 
                   p_service_name, p_leaked_bytes, p_leak_source),
            jsonb_build_object(
                'service_name', p_service_name,
                'leaked_bytes', p_leaked_bytes,
                'leak_source', p_leak_source,
                'operation_id', p_operation_id
            ),
            NOW()
        );
    END IF;
    
    RETURN leak_id;
END;
$$;


--
-- Name: fn_validate_numeric_safety(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_validate_numeric_safety() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only warn, don't block, as backend can handle large values
    IF NEW.total_items > 9007199254740991 THEN
        RAISE NOTICE 'total_items exceeds JavaScript safe range: %', NEW.total_items;
    END IF;
    IF NEW.processed_items > 9007199254740991 THEN
        RAISE NOTICE 'processed_items exceeds JavaScript safe range: %', NEW.processed_items;
    END IF;
    IF NEW.successful_items > 9007199254740991 THEN
        RAISE NOTICE 'successful_items exceeds JavaScript safe range: %', NEW.successful_items;
    END IF;
    IF NEW.failed_items > 9007199254740991 THEN
        RAISE NOTICE 'failed_items exceeds JavaScript safe range: %', NEW.failed_items;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: generate_user_agent_hash(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_user_agent_hash(user_agent_text text) RETURNS character varying
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    -- Generate SHA-256 hash of user agent for faster comparison
    RETURN encode(digest(user_agent_text, 'sha256'), 'hex');
END;
$$;


--
-- Name: FUNCTION generate_user_agent_hash(user_agent_text text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_user_agent_hash(user_agent_text text) IS 'Generates SHA-256 hash of user agent string';


--
-- Name: get_campaign_state_events_for_replay(uuid, bigint, bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint DEFAULT 0, p_to_sequence bigint DEFAULT NULL::bigint, p_limit integer DEFAULT 1000) RETURNS TABLE(id uuid, event_type text, source_state text, target_state text, reason text, triggered_by text, event_data jsonb, operation_context jsonb, sequence_number bigint, occurred_at timestamp with time zone, correlation_id uuid)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        cse.id, cse.event_type, cse.source_state, cse.target_state, cse.reason,
        cse.triggered_by, cse.event_data, cse.operation_context, cse.sequence_number,
        cse.occurred_at, cse.correlation_id
    FROM campaign_state_events cse
    WHERE cse.campaign_id = p_campaign_id
      AND cse.sequence_number >= p_from_sequence
      AND (p_to_sequence IS NULL OR cse.sequence_number <= p_to_sequence)
      AND cse.event_type = 'state_transition'  -- Only return main transition events
    ORDER BY cse.sequence_number ASC
    LIMIT p_limit;
END;
$$;


--
-- Name: FUNCTION get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint, p_to_sequence bigint, p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint, p_to_sequence bigint, p_limit integer) IS 'Retrieves state events for campaign state replay in sequence order';


--
-- Name: get_config_history(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_config_history(p_config_type character varying, p_config_key character varying, p_limit integer DEFAULT 10) RETURNS TABLE(version bigint, config_value jsonb, checksum character varying, created_at timestamp with time zone, updated_at timestamp with time zone, created_by character varying, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT c.version, c.config_value, c.checksum, c.created_at, c.updated_at, c.created_by, c.metadata
    FROM versioned_configs c
    WHERE c.config_type = p_config_type 
      AND (p_config_key IS NULL OR c.config_key = p_config_key)
    ORDER BY c.updated_at DESC, c.version DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: get_domain_config_state_with_lock(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_domain_config_state_with_lock(p_config_hash text, p_lock_type text DEFAULT 'none'::text) RETURNS TABLE(config_hash text, last_offset bigint, config_details jsonb, version bigint, updated_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_lock_type = 'exclusive' THEN
        RETURN QUERY 
        SELECT dcs.config_hash, dcs.last_offset, dcs.config_details, 
               dcs.version, dcs.updated_at, dcs.created_at
        FROM domain_generation_config_states dcs
        WHERE dcs.config_hash = p_config_hash
        FOR UPDATE;
    ELSIF p_lock_type = 'shared' THEN
        RETURN QUERY 
        SELECT dcs.config_hash, dcs.last_offset, dcs.config_details, 
               dcs.version, dcs.updated_at, dcs.created_at
        FROM domain_generation_config_states dcs
        WHERE dcs.config_hash = p_config_hash
        FOR SHARE;
    ELSE
        RETURN QUERY 
        SELECT dcs.config_hash, dcs.last_offset, dcs.config_details, 
               dcs.version, dcs.updated_at, dcs.created_at
        FROM domain_generation_config_states dcs
        WHERE dcs.config_hash = p_config_hash;
    END IF;
END;
$$;


--
-- Name: FUNCTION get_domain_config_state_with_lock(p_config_hash text, p_lock_type text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_domain_config_state_with_lock(p_config_hash text, p_lock_type text) IS 'Retrieves domain generation config state with optional row-level locking';


--
-- Name: get_latest_campaign_state_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_latest_campaign_state_snapshot(p_campaign_id uuid) RETURNS TABLE(id uuid, current_state text, state_data jsonb, last_event_sequence bigint, snapshot_metadata jsonb, created_at timestamp with time zone, checksum text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        css.id, css.current_state, css.state_data, css.last_event_sequence,
        css.snapshot_metadata, css.created_at, css.checksum
    FROM campaign_state_snapshots css
    WHERE css.campaign_id = p_campaign_id
      AND css.is_valid = true
    ORDER BY css.last_event_sequence DESC, css.created_at DESC
    LIMIT 1;
END;
$$;


--
-- Name: FUNCTION get_latest_campaign_state_snapshot(p_campaign_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_latest_campaign_state_snapshot(p_campaign_id uuid) IS 'Gets the most recent valid state snapshot for a campaign';


--
-- Name: get_versioned_config_with_lock(character varying, character varying, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_versioned_config_with_lock(p_config_type character varying, p_config_key character varying, p_for_update boolean DEFAULT false) RETURNS TABLE(config_value jsonb, version bigint, checksum character varying, created_at timestamp with time zone, updated_at timestamp with time zone, created_by character varying, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_for_update THEN
        RETURN QUERY
        SELECT c.config_value, c.version, c.checksum, c.created_at, c.updated_at, c.created_by, c.metadata
        FROM versioned_configs c
        WHERE c.config_type = p_config_type AND c.config_key = p_config_key
        FOR UPDATE;
    ELSE
        RETURN QUERY
        SELECT c.config_value, c.version, c.checksum, c.created_at, c.updated_at, c.created_by, c.metadata
        FROM versioned_configs c
        WHERE c.config_type = p_config_type AND c.config_key = p_config_key;
    END IF;
END;
$$;


--
-- Name: log_authorization_decision(uuid, character varying, character varying, character varying, character varying, text[], jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[] DEFAULT '{}'::text[], p_context jsonb DEFAULT '{}'::jsonb, p_request_context jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    decision_id VARCHAR(255);
    security_event_id UUID;
    audit_log_id UUID;
    risk_score INTEGER := 0;
BEGIN
    -- Generate unique decision ID
    decision_id := 'auth_' || extract(epoch from now())::bigint || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Calculate risk score based on decision and context
    IF p_decision = 'deny' THEN
        risk_score := 75;
    ELSIF p_decision = 'conditional' THEN
        risk_score := 25;
    END IF;
    
    -- Create audit log entry with correct column name (entity_type instead of resource_type)
    INSERT INTO audit_logs 
        (user_id, action, entity_type, entity_id, authorization_context, 
         access_decision, permission_checked, security_level)
    VALUES 
        (p_user_id, p_action, p_resource_type, p_resource_id::UUID, p_context,
         p_decision, p_policies, CASE WHEN risk_score > 50 THEN 'high' ELSE 'standard' END)
    RETURNING id INTO audit_log_id;
    
    -- Create security event
    INSERT INTO security_events 
        (event_type, user_id, resource_type, resource_id, action_attempted,
         authorization_result, permissions_required, risk_score, request_context, audit_log_id)
    VALUES 
        ('authorization_decision', p_user_id, p_resource_type, p_resource_id, p_action,
         p_decision, p_policies, risk_score, p_request_context, audit_log_id)
    RETURNING id INTO security_event_id;
    
    -- Record authorization decision
    INSERT INTO authorization_decisions 
        (decision_id, user_id, resource_type, resource_id, action, decision,
         evaluated_policies, conditions_met, context, security_event_id)
    VALUES 
        (decision_id, p_user_id, p_resource_type, p_resource_id, p_action, p_decision,
         p_policies, p_context, p_context, security_event_id);
    
    RETURN security_event_id;
END;
$$;


--
-- Name: log_authorization_decision(uuid, character varying, character varying, character varying, character varying, text[], jsonb, jsonb, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[] DEFAULT '{}'::text[], p_context jsonb DEFAULT '{}'::jsonb, p_request_context jsonb DEFAULT '{}'::jsonb, p_risk_score integer DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    decision_id VARCHAR(255);
    security_event_id UUID;
    audit_log_id UUID;
    calculated_risk_score INTEGER := p_risk_score;
BEGIN
    -- Generate unique decision ID
    decision_id := 'auth_' || extract(epoch from now())::bigint || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Use provided risk score, or calculate default if not provided
    IF p_risk_score = 0 THEN
        IF p_decision = 'deny' THEN
            calculated_risk_score := 75;
        ELSIF p_decision = 'conditional' THEN
            calculated_risk_score := 25;
        END IF;
    END IF;
    
    -- Create audit log entry with correct column name (entity_type instead of resource_type)
    INSERT INTO audit_logs 
        (user_id, action, entity_type, entity_id, authorization_context, 
         access_decision, permission_checked, security_level)
    VALUES 
        (p_user_id, p_action, p_resource_type, p_resource_id::UUID, p_context,
         p_decision, p_policies, CASE WHEN calculated_risk_score > 50 THEN 'high' ELSE 'standard' END)
    RETURNING id INTO audit_log_id;
    
    -- Create security event
    INSERT INTO security_events 
        (event_type, user_id, resource_type, resource_id, action_attempted,
         authorization_result, permissions_required, risk_score, request_context, audit_log_id)
    VALUES 
        ('authorization_decision', p_user_id, p_resource_type, p_resource_id, p_action,
         p_decision, p_policies, calculated_risk_score, p_request_context, audit_log_id)
    RETURNING id INTO security_event_id;
    
    -- Record authorization decision
    INSERT INTO authorization_decisions 
        (decision_id, user_id, resource_type, resource_id, action, decision,
         evaluated_policies, conditions_met, context, security_event_id)
    VALUES 
        (decision_id, p_user_id, p_resource_type, p_resource_id, p_action, p_decision,
         p_policies, p_context, p_context, security_event_id);
    
    RETURN security_event_id;
END;
$$;


--
-- Name: record_connection_pool_metrics(character varying, integer, integer, integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_connection_pool_metrics(p_pool_name character varying, p_active_connections integer, p_idle_connections integer, p_max_connections integer, p_wait_count integer DEFAULT 0, p_wait_duration_ms integer DEFAULT 0, p_connection_errors integer DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    pool_state VARCHAR(50);
    utilization_pct INTEGER;
BEGIN
    -- Calculate pool utilization
    utilization_pct := ((p_active_connections + p_idle_connections) * 100) / p_max_connections;
    
    -- Determine pool state
    IF utilization_pct >= 95 THEN
        pool_state := 'critical';
    ELSIF utilization_pct >= 80 THEN
        pool_state := 'warning';
    ELSIF p_connection_errors > 0 THEN
        pool_state := 'degraded';
    ELSE
        pool_state := 'healthy';
    END IF;
    
    -- Insert metrics
    INSERT INTO connection_pool_metrics 
        (pool_name, active_connections, idle_connections, max_connections,
         total_connections, connections_in_use, wait_count, wait_duration_ms,
         connection_errors, pool_state)
    VALUES 
        (p_pool_name, p_active_connections, p_idle_connections, p_max_connections,
         p_active_connections + p_idle_connections, p_active_connections,
         p_wait_count, p_wait_duration_ms, p_connection_errors, pool_state)
    RETURNING id INTO metric_id;
    
    -- Check alert thresholds
    PERFORM check_connection_pool_alerts(p_pool_name, utilization_pct, p_wait_duration_ms, p_connection_errors);
    
    RETURN metric_id;
END;
$$;


--
-- Name: record_memory_metrics(character varying, character varying, bigint, bigint, bigint, bigint, integer, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_memory_metrics(p_service_name character varying, p_process_id character varying, p_heap_size_bytes bigint, p_heap_used_bytes bigint, p_gc_count bigint DEFAULT 0, p_gc_duration_ms bigint DEFAULT 0, p_goroutines_count integer DEFAULT 0, p_stack_size_bytes bigint DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    heap_free_bytes BIGINT;
    utilization_pct DECIMAL(5,2);
    memory_state VARCHAR(50);
BEGIN
    -- Calculate derived metrics, handle division by zero
    heap_free_bytes := GREATEST(0, p_heap_size_bytes - p_heap_used_bytes);
    
    IF p_heap_size_bytes > 0 THEN
        utilization_pct := (p_heap_used_bytes::DECIMAL / p_heap_size_bytes::DECIMAL) * 100;
    ELSE
        utilization_pct := 0;
    END IF;
    
    -- Determine memory state
    IF utilization_pct >= 90 THEN
        memory_state := 'critical';
    ELSIF utilization_pct >= 75 THEN
        memory_state := 'warning';
    ELSIF utilization_pct >= 60 THEN
        memory_state := 'elevated';
    ELSE
        memory_state := 'normal';
    END IF;
    
    -- Insert memory metrics
    INSERT INTO memory_metrics 
        (service_name, process_id, heap_size_bytes, heap_used_bytes, heap_free_bytes,
         gc_count, gc_duration_ms, goroutines_count, stack_size_bytes,
         memory_utilization_pct, memory_state)
    VALUES 
        (p_service_name, p_process_id, p_heap_size_bytes, p_heap_used_bytes, heap_free_bytes,
         p_gc_count, p_gc_duration_ms, p_goroutines_count, p_stack_size_bytes,
         utilization_pct, memory_state)
    RETURNING id INTO metric_id;
    
    -- Check for memory optimization opportunities
    PERFORM check_memory_optimization_opportunities(p_service_name, utilization_pct, p_heap_used_bytes);
    
    -- Trigger alerts for critical memory states
    IF memory_state IN ('critical', 'warning') THEN
        INSERT INTO system_alerts (alert_type, severity, message, context, created_at)
        VALUES (
            'memory_utilization',
            CASE WHEN memory_state = 'critical' THEN 'critical' ELSE 'warning' END,
            format('Memory utilization %s%% for service %s', utilization_pct, p_service_name),
            jsonb_build_object(
                'service_name', p_service_name,
                'utilization_pct', utilization_pct,
                'heap_used_bytes', p_heap_used_bytes,
                'memory_state', memory_state
            ),
            NOW()
        );
    END IF;
    
    RETURN metric_id;
END;
$$;


--
-- Name: record_query_performance(text, character varying, numeric, bigint, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_query_performance(p_query_sql text, p_query_type character varying, p_execution_time_ms numeric, p_rows_examined bigint DEFAULT 0, p_rows_returned bigint DEFAULT 0, p_query_plan jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    query_hash VARCHAR(64);
    optimization_score DECIMAL(5,2);
    table_names VARCHAR[];
BEGIN
    -- Generate query hash for deduplication
    query_hash := encode(sha256(p_query_sql::bytea), 'hex');
    
    -- Calculate optimization score (0-100, higher is better)
    optimization_score := CASE
        WHEN p_execution_time_ms <= 10 THEN 100
        WHEN p_execution_time_ms <= 50 THEN 90
        WHEN p_execution_time_ms <= 100 THEN 80
        WHEN p_execution_time_ms <= 500 THEN 60
        WHEN p_execution_time_ms <= 1000 THEN 40
        WHEN p_execution_time_ms <= 5000 THEN 20
        ELSE 10
    END;
    
    -- Adjust score based on efficiency (rows examined vs returned)
    IF p_rows_examined > 0 AND p_rows_returned > 0 THEN
        optimization_score := optimization_score * (
            LEAST(1.0, p_rows_returned::DECIMAL / p_rows_examined::DECIMAL) * 0.5 + 0.5
        );
    END IF;
    
    -- Extract table names from query plan
    table_names := ARRAY(
        SELECT DISTINCT value::text
        FROM jsonb_array_elements_text(p_query_plan->'tables')
    );
    
    -- Insert performance metrics
    INSERT INTO query_performance_metrics 
        (query_hash, query_sql, query_type, table_names, execution_time_ms,
         rows_examined, rows_returned, query_plan, optimization_score)
    VALUES 
        (query_hash, p_query_sql, p_query_type, table_names, p_execution_time_ms,
         p_rows_examined, p_rows_returned, p_query_plan, optimization_score)
    RETURNING id INTO metric_id;
    
    -- Check if optimization is needed
    PERFORM check_query_optimization_needed(query_hash, p_execution_time_ms, optimization_score);
    
    -- Log slow queries
    IF p_execution_time_ms > 1000 THEN
        INSERT INTO slow_query_log 
            (query_hash, query_sql, execution_time_ms, rows_examined, rows_returned,
             query_plan, severity)
        VALUES 
            (query_hash, p_query_sql, p_execution_time_ms, p_rows_examined, p_rows_returned,
             p_query_plan, 
             CASE WHEN p_execution_time_ms > 5000 THEN 'critical'
                  WHEN p_execution_time_ms > 2000 THEN 'high'
                  ELSE 'warning' END);
    END IF;
    
    RETURN metric_id;
END;
$$;


--
-- Name: release_config_lock(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_config_lock(p_lock_id uuid, p_owner text) RETURNS TABLE(success boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    lock_owner TEXT;
BEGIN
    -- Get lock owner
    SELECT owner INTO lock_owner
    FROM config_locks 
    WHERE id = p_lock_id AND is_active = true
    FOR UPDATE;
    
    -- Check if lock exists
    IF lock_owner IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Lock not found or already released'::TEXT;
        RETURN;
    END IF;
    
    -- Check ownership
    IF lock_owner != p_owner THEN
        RETURN QUERY SELECT FALSE, format('Lock is owned by %s, cannot release by %s', lock_owner, p_owner)::TEXT;
        RETURN;
    END IF;
    
    -- Release lock
    UPDATE config_locks 
    SET is_active = false, updated_at = NOW()
    WHERE id = p_lock_id;
    
    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;


--
-- Name: FUNCTION release_config_lock(p_lock_id uuid, p_owner text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.release_config_lock(p_lock_id uuid, p_owner text) IS 'Releases a distributed configuration lock with ownership verification';


--
-- Name: release_state_lock(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_state_lock(p_lock_key character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
		BEGIN
			DELETE FROM state_coordination_locks WHERE lock_key = p_lock_key;
			RETURN FOUND;
		END;
		$$;


--
-- Name: release_state_lock(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_state_lock(p_entity_id uuid, p_lock_token uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM state_coordination_locks 
    WHERE entity_id = p_entity_id AND lock_token = p_lock_token;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$;


--
-- Name: sync_domain_config_to_versioned(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_domain_config_to_versioned() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_config_record RECORD;
    v_synced_count INTEGER := 0;
BEGIN
    -- Sync domain generation configs to versioned_configs table
    FOR v_config_record IN 
        SELECT id, config_data, version, checksum, created_at, updated_at
        FROM domain_generation_config_states
        ORDER BY updated_at DESC
    LOOP
        INSERT INTO versioned_configs (
            config_type, config_key, config_value, version, checksum, 
            created_at, updated_at, created_by, metadata
        ) VALUES (
            'domain_generation',
            'config_' || v_config_record.id::TEXT,
            v_config_record.config_data,
            v_config_record.version,
            v_config_record.checksum,
            v_config_record.created_at,
            v_config_record.updated_at,
            'migration_sync',
            jsonb_build_object('source_table', 'domain_generation_config_states', 'source_id', v_config_record.id)
        )
        ON CONFLICT (config_type, config_key) DO UPDATE SET
            config_value = EXCLUDED.config_value,
            version = EXCLUDED.version,
            checksum = EXCLUDED.checksum,
            updated_at = EXCLUDED.updated_at,
            metadata = EXCLUDED.metadata;
        
        v_synced_count := v_synced_count + 1;
    END LOOP;

    RETURN v_synced_count;
END;
$$;


--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_keyword_rules_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_keyword_rules_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_proxies_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_proxies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_proxy_pools_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_proxy_pools_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_state_event_processing_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_state_event_processing_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- When a state transition is completed, mark the associated event as processed
    IF TG_OP = 'UPDATE' AND OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
        UPDATE campaign_state_events
        SET processing_status = 'processed'
        WHERE id = NEW.state_event_id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_versioned_config_atomic(character varying, character varying, jsonb, bigint, character varying, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_versioned_config_atomic(p_config_type character varying, p_config_key character varying, p_config_value jsonb, p_expected_version bigint, p_checksum character varying, p_updated_by character varying DEFAULT 'system'::character varying, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(success boolean, new_version bigint, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_current_version BIGINT;
    v_new_version BIGINT;
    v_rows_affected INTEGER;
BEGIN
    -- Get current version with row-level locking
    SELECT version INTO v_current_version
    FROM versioned_configs
    WHERE config_type = p_config_type AND config_key = p_config_key
    FOR UPDATE;

    -- Check if configuration exists and version matches
    IF NOT FOUND THEN
        -- Insert new configuration
        INSERT INTO versioned_configs (
            config_type, config_key, config_value, version, checksum, created_by, metadata
        ) VALUES (
            p_config_type, p_config_key, p_config_value, 1, p_checksum, p_updated_by, p_metadata
        );
        
        RETURN QUERY SELECT TRUE, 1::BIGINT, NULL::TEXT;
        RETURN;
    END IF;

    -- Verify expected version matches current version (optimistic locking)
    IF v_current_version != p_expected_version THEN
        RETURN QUERY SELECT FALSE, v_current_version, 
            format('Version mismatch: expected %s, current %s', p_expected_version, v_current_version);
        RETURN;
    END IF;

    -- Calculate new version
    v_new_version := v_current_version + 1;

    -- Update configuration atomically
    UPDATE versioned_configs
    SET 
        config_value = p_config_value,
        version = v_new_version,
        checksum = p_checksum,
        updated_at = CURRENT_TIMESTAMP,
        created_by = p_updated_by,
        metadata = p_metadata
    WHERE config_type = p_config_type 
      AND config_key = p_config_key 
      AND version = p_expected_version;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
        RETURN QUERY SELECT FALSE, v_current_version, 
            'Concurrent update detected - version changed during update';
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_new_version, NULL::TEXT;
END;
$$;


--
-- Name: validate_all_enums(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_all_enums() RETURNS TABLE(table_name text, column_name text, invalid_value text, row_count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check campaigns.status
    RETURN QUERY
    SELECT 'campaigns'::text, 'status'::text, c.status::text, COUNT(*)::bigint
    FROM campaigns c
    WHERE c.status NOT IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled')
    GROUP BY c.status;
    
    -- Check campaigns.campaign_type
    RETURN QUERY
    SELECT 'campaigns'::text, 'campaign_type'::text, c.campaign_type::text, COUNT(*)::bigint
    FROM campaigns c
    WHERE c.campaign_type NOT IN ('domain_generation', 'dns_validation', 'http_keyword_validation')
    GROUP BY c.campaign_type;
    
    -- Check personas.persona_type
    RETURN QUERY
    SELECT 'personas'::text, 'persona_type'::text, p.persona_type::text, COUNT(*)::bigint
    FROM personas p
    WHERE p.persona_type NOT IN ('dns', 'http')
    GROUP BY p.persona_type;
    
    -- Check http_keyword_campaign_params.source_type
    RETURN QUERY
    SELECT 'http_keyword_campaign_params'::text, 'source_type'::text, h.source_type::text, COUNT(*)::bigint
    FROM http_keyword_campaign_params h
    WHERE h.source_type NOT IN ('DomainGeneration', 'DNSValidation')
    GROUP BY h.source_type;
END;
$$;


--
-- Name: validate_campaign_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_campaign_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status NOT IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid campaign status: %. Must match Go CampaignStatusEnum', NEW.status;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: validate_column_naming(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_column_naming() RETURNS TABLE(table_schema text, table_name text, column_name text, naming_issue text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.table_schema::TEXT,
        c.table_name::TEXT,
        c.column_name::TEXT,
        CASE 
            WHEN c.column_name ~ '[A-Z]' THEN 'Contains uppercase letters - should be snake_case'
            WHEN c.column_name ~ '^[0-9]' THEN 'Starts with number'
            WHEN c.column_name ~ '[^a-z0-9_]' THEN 'Contains invalid characters'
            ELSE 'Unknown issue'
        END as naming_issue
    FROM information_schema.columns c
    WHERE c.table_schema IN ('public', 'auth')
    AND (
        c.column_name ~ '[A-Z]' OR 
        c.column_name ~ '^[0-9]' OR 
        c.column_name ~ '[^a-z0-9_]'
    )
    ORDER BY c.table_schema, c.table_name, c.column_name;
END;
$$;


--
-- Name: validate_config_consistency(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_config_consistency(p_config_type character varying, p_config_key character varying) RETURNS TABLE(is_consistent boolean, expected_checksum character varying, actual_checksum character varying, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_config_value JSONB;
    v_stored_checksum VARCHAR(64);
    v_calculated_checksum VARCHAR(64);
BEGIN
    -- Get configuration and stored checksum
    SELECT config_value, checksum INTO v_config_value, v_stored_checksum
    FROM versioned_configs
    WHERE config_type = p_config_type AND config_key = p_config_key;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::VARCHAR(64), NULL::VARCHAR(64), 
            'Configuration not found'::TEXT;
        RETURN;
    END IF;

    -- Calculate checksum from stored value
    -- Note: This is a simplified validation - in production, you'd want to use
    -- the same checksum calculation as the application layer
    v_calculated_checksum := encode(sha256(v_config_value::TEXT::BYTEA), 'hex');

    -- Compare checksums
    IF v_stored_checksum = v_calculated_checksum THEN
        RETURN QUERY SELECT TRUE, v_stored_checksum, v_calculated_checksum, NULL::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, v_stored_checksum, v_calculated_checksum,
            'Checksum mismatch detected - configuration may be corrupted'::TEXT;
    END IF;
END;
$$;


--
-- Name: validate_enum_value(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_enum_value(enum_type text, value text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    valid_values TEXT[];
BEGIN
    CASE enum_type
        WHEN 'campaign_status' THEN
            valid_values := ARRAY['pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled'];
        WHEN 'campaign_type' THEN
            valid_values := ARRAY['domain_generation', 'dns_validation', 'http_keyword_validation'];
        WHEN 'http_source_type' THEN
            valid_values := ARRAY['DomainGeneration', 'DNSValidation'];
        WHEN 'persona_type' THEN
            valid_values := ARRAY['dns', 'http'];
        WHEN 'proxy_protocol' THEN
            valid_values := ARRAY['http', 'https', 'socks5', 'socks4'];
        WHEN 'pattern_type' THEN
            valid_values := ARRAY['fixed', 'variable', 'hybrid'];
        WHEN 'job_status' THEN
            valid_values := ARRAY['pending', 'processing', 'completed', 'failed', 'retrying'];
        ELSE
            RETURN FALSE;
    END CASE;
    
    RETURN value = ANY(valid_values);
END;
$$;


--
-- Name: validate_input_field(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_input_field(p_endpoint_pattern text, p_http_method text, p_field_name text, p_field_value text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    validation_rule RECORD;
    config JSONB;
    validation_result JSONB;
    suspicious_pattern RECORD;
    pattern_matches BOOLEAN;
    array_value JSONB;
    int_value INTEGER;
BEGIN
    -- Get validation rule
    SELECT * INTO validation_rule
    FROM input_validation_rules
    WHERE endpoint_pattern = p_endpoint_pattern
      AND http_method = p_http_method
      AND field_name = p_field_name;

    IF NOT FOUND THEN
        -- No specific rule, perform basic suspicious pattern check
        FOR suspicious_pattern IN
            SELECT * FROM suspicious_input_patterns
            WHERE detection_action IN ('block', 'log') AND is_enabled = true
            ORDER BY severity DESC, pattern_name  -- Order by severity to get most specific match
        LOOP
            SELECT p_field_value ~ suspicious_pattern.pattern INTO pattern_matches;
            IF pattern_matches THEN
                IF suspicious_pattern.detection_action = 'block' THEN
                    RETURN jsonb_build_object(
                        'valid', false,
                        'error_type', 'suspicious_pattern',
                        'error_message', suspicious_pattern.description,
                        'severity', suspicious_pattern.severity,
                        'pattern_name', suspicious_pattern.pattern_name
                    );
                END IF;
            END IF;
        END LOOP;

        RETURN jsonb_build_object('valid', true, 'message', 'no_validation_rule');
    END IF;

    config := validation_rule.validation_config;

    -- Perform validation based on type
    CASE validation_rule.validation_type
        WHEN 'string_length' THEN
            IF length(p_field_value) < (config->>'min_length')::integer OR
               length(p_field_value) > (config->>'max_length')::integer THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'string_length',
                    'error_message', validation_rule.error_message,
                    'expected', config
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;

        WHEN 'integer_range' THEN
            BEGIN
                int_value := p_field_value::integer;
                IF int_value < (config->>'min')::integer OR
                   int_value > (config->>'max')::integer THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'integer_range',
                        'error_message', validation_rule.error_message,
                        'expected', config
                    );
                ELSE
                    validation_result := jsonb_build_object('valid', true);
                END IF;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'invalid_integer',
                        'error_message', 'Value must be a valid integer'
                    );
            END;

        WHEN 'enum' THEN
            IF NOT (p_field_value = ANY(ARRAY(SELECT jsonb_array_elements_text(config->'allowed_values')))) THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'enum_violation',
                    'error_message', validation_rule.error_message,
                    'allowed_values', config->'allowed_values'
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;

        WHEN 'json_schema' THEN
            BEGIN
                -- Basic JSON validation
                array_value := p_field_value::jsonb;
                validation_result := jsonb_build_object('valid', true);
            EXCEPTION
                WHEN invalid_text_representation THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'invalid_json',
                        'error_message', 'Value must be valid JSON'
                    );
            END;

        ELSE
            validation_result := jsonb_build_object('valid', true, 'message', 'validation_type_not_implemented');
    END CASE;

    RETURN validation_result;
END;
$$;


--
-- Name: validate_input_field(character varying, character varying, character varying, text, uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_input_field(p_endpoint_pattern character varying, p_http_method character varying, p_field_name character varying, p_field_value text, p_user_id uuid DEFAULT NULL::uuid, p_session_id character varying DEFAULT NULL::character varying) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    validation_rule RECORD;
    config JSONB;
    validation_result JSONB;
    suspicious_pattern RECORD;
    pattern_matches BOOLEAN;
    array_value JSONB;
    array_length INTEGER;
BEGIN
    -- Get validation rule
    SELECT * INTO validation_rule
    FROM input_validation_rules
    WHERE endpoint_pattern = p_endpoint_pattern 
      AND http_method = p_http_method 
      AND field_name = p_field_name;
    
    IF NOT FOUND THEN
        -- No specific rule, perform basic suspicious pattern check
        FOR suspicious_pattern IN 
            SELECT * FROM suspicious_input_patterns 
            WHERE detection_action IN ('block', 'log') AND is_enabled = true
        LOOP
            SELECT p_field_value ~ suspicious_pattern.pattern INTO pattern_matches;
            IF pattern_matches THEN
                IF suspicious_pattern.detection_action = 'block' THEN
                    RETURN jsonb_build_object(
                        'valid', false,
                        'error_type', 'suspicious_pattern',
                        'error_message', suspicious_pattern.description,
                        'severity', suspicious_pattern.severity
                    );
                END IF;
            END IF;
        END LOOP;
        
        RETURN jsonb_build_object('valid', true, 'message', 'no_validation_rule');
    END IF;
    
    config := validation_rule.validation_config;
    
    -- Perform validation based on type
    CASE validation_rule.validation_type
        WHEN 'string_length' THEN
            IF length(p_field_value) < (config->>'min_length')::integer OR 
               length(p_field_value) > (config->>'max_length')::integer THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'string_length',
                    'error_message', validation_rule.error_message,
                    'expected', config
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;
            
        WHEN 'enum' THEN
            IF NOT (p_field_value = ANY(ARRAY(SELECT jsonb_array_elements_text(config->'allowed_values')))) THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'enum_violation',
                    'error_message', validation_rule.error_message,
                    'allowed_values', config->'allowed_values'
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;
            
        WHEN 'json_schema' THEN
            BEGIN
                -- Basic JSON validation
                array_value := p_field_value::jsonb;
                validation_result := jsonb_build_object('valid', true);
            EXCEPTION
                WHEN invalid_text_representation THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'invalid_json',
                        'error_message', 'Value must be valid JSON'
                    );
            END;
            
        ELSE
            validation_result := jsonb_build_object('valid', true, 'message', 'validation_type_not_implemented');
    END CASE;
    
    RETURN validation_result;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_access_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_access_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    violation_type character varying(100) NOT NULL,
    required_permissions text[] DEFAULT '{}'::text[],
    user_permissions text[] DEFAULT '{}'::text[],
    resource_id character varying(255),
    violation_details jsonb DEFAULT '{}'::jsonb,
    source_ip inet,
    user_agent text,
    request_headers jsonb DEFAULT '{}'::jsonb,
    response_status integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_endpoint_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_endpoint_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    required_permissions text[] DEFAULT '{}'::text[] NOT NULL,
    resource_type character varying(100),
    minimum_role character varying(50) DEFAULT 'user'::character varying,
    requires_ownership boolean DEFAULT false,
    requires_campaign_access boolean DEFAULT false,
    bypass_conditions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb,
    client_ip text,
    user_agent text,
    authorization_context jsonb DEFAULT '{}'::jsonb,
    security_level character varying(50) DEFAULT 'standard'::character varying,
    access_decision character varying(50) DEFAULT 'unknown'::character varying,
    permission_checked text[],
    resource_sensitivity character varying(50) DEFAULT 'normal'::character varying
);


--
-- Name: COLUMN audit_logs.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.action IS 'e.g., CampaignCreated, PersonaUpdated, ProxyTested';


--
-- Name: COLUMN audit_logs.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.entity_type IS 'e.g., Campaign, Persona, Proxy';


--
-- Name: authorization_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authorization_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    decision_id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id character varying(255) NOT NULL,
    action character varying(100) NOT NULL,
    decision character varying(20) NOT NULL,
    policy_version character varying(50),
    evaluated_policies text[] DEFAULT '{}'::text[],
    conditions_met jsonb DEFAULT '{}'::jsonb,
    decision_time_ms integer DEFAULT 0,
    context jsonb DEFAULT '{}'::jsonb,
    security_event_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT authorization_decisions_decision_check CHECK (((decision)::text = ANY ((ARRAY['allow'::character varying, 'deny'::character varying, 'conditional'::character varying])::text[])))
);


--
-- Name: campaign_access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_access_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    user_id uuid NOT NULL,
    access_type character varying(50) DEFAULT 'read'::character varying NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: campaign_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    job_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    scheduled_at timestamp with time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    last_attempted_at timestamp with time zone,
    last_error text,
    processing_server_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    job_payload jsonb,
    next_execution_at timestamp with time zone,
    locked_at timestamp with time zone,
    locked_by text,
    business_status text,
    CONSTRAINT campaign_jobs_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT campaign_jobs_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT chk_campaign_jobs_business_status_valid CHECK (((business_status IS NULL) OR (business_status = ANY (ARRAY['processing'::text, 'retry'::text, 'priority_queued'::text, 'batch_optimized'::text])))),
    CONSTRAINT chk_campaign_jobs_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT chk_campaign_jobs_type_valid CHECK ((job_type = ANY (ARRAY['domain_generation'::text, 'dns_validation'::text, 'http_keyword_validation'::text])))
);


--
-- Name: COLUMN campaign_jobs.job_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaign_jobs.job_type IS 'e.g., DomainGeneration, DNSValidation, HTTPKeywordScan (matches campaign_type usually)';


--
-- Name: COLUMN campaign_jobs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaign_jobs.status IS 'e.g., Pending, Queued, Running, Completed, Failed, Retry';


--
-- Name: campaign_state_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_state_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    event_type text NOT NULL,
    source_state text,
    target_state text,
    reason text,
    triggered_by text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    operation_context jsonb DEFAULT '{}'::jsonb,
    sequence_number bigint NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    persisted_at timestamp with time zone DEFAULT now() NOT NULL,
    processing_status text DEFAULT 'pending'::text NOT NULL,
    processing_error text,
    correlation_id uuid,
    CONSTRAINT campaign_state_events_event_type_check CHECK ((event_type = ANY (ARRAY['state_transition'::text, 'validation_result'::text, 'progress_update'::text, 'error_occurred'::text, 'configuration_change'::text, 'resource_allocation'::text, 'batch_processed'::text, 'worker_assigned'::text, 'checkpoint_created'::text]))),
    CONSTRAINT campaign_state_events_processing_status_check CHECK ((processing_status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text, 'skipped'::text])))
);


--
-- Name: TABLE campaign_state_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaign_state_events IS 'Event sourcing table for campaign state management - stores all state changes for replay and audit';


--
-- Name: campaign_state_events_sequence_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_state_events_sequence_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_state_events_sequence_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_state_events_sequence_number_seq OWNED BY public.campaign_state_events.sequence_number;


--
-- Name: campaign_state_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_state_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    current_state text NOT NULL,
    state_data jsonb NOT NULL,
    last_event_sequence bigint NOT NULL,
    snapshot_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    checksum text NOT NULL,
    is_valid boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE campaign_state_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaign_state_snapshots IS 'Periodic snapshots of campaign state for faster replay and recovery';


--
-- Name: campaign_state_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_state_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state_event_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    from_state text NOT NULL,
    to_state text NOT NULL,
    is_valid_transition boolean DEFAULT true NOT NULL,
    validation_errors jsonb DEFAULT '[]'::jsonb,
    transition_metadata jsonb DEFAULT '{}'::jsonb,
    triggered_by text NOT NULL,
    initiated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    duration_ms integer
);


--
-- Name: TABLE campaign_state_transitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaign_state_transitions IS 'Tracks specific state transitions with validation and timing information';


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    campaign_type text DEFAULT 'domain_generation'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    user_id uuid,
    total_items bigint DEFAULT 0,
    processed_items bigint DEFAULT 0,
    successful_items bigint DEFAULT 0,
    failed_items bigint DEFAULT 0,
    progress_percentage double precision DEFAULT 0.0,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text,
    estimated_completion_at timestamp with time zone,
    avg_processing_rate double precision,
    last_heartbeat_at timestamp with time zone,
    business_status text,
    CONSTRAINT campaigns_campaign_type_check CHECK ((campaign_type = ANY (ARRAY['domain_generation'::text, 'dns_validation'::text, 'http_keyword_validation'::text]))),
    CONSTRAINT chk_campaign_items_non_negative CHECK (((total_items >= 0) AND (processed_items >= 0) AND (successful_items >= 0) AND (failed_items >= 0))),
    CONSTRAINT chk_campaigns_business_status_valid CHECK (((business_status IS NULL) OR (business_status = ANY (ARRAY['archived'::text, 'priority'::text, 'experimental'::text, 'production_ready'::text])))),
    CONSTRAINT chk_campaigns_failed_items_non_negative CHECK ((failed_items >= 0)),
    CONSTRAINT chk_campaigns_processed_items_non_negative CHECK ((processed_items >= 0)),
    CONSTRAINT chk_campaigns_progress_percentage_range CHECK (((progress_percentage IS NULL) OR ((progress_percentage >= (0)::double precision) AND (progress_percentage <= (100)::double precision)))),
    CONSTRAINT chk_campaigns_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'running'::text, 'pausing'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT chk_campaigns_successful_items_non_negative CHECK ((successful_items >= 0)),
    CONSTRAINT chk_campaigns_total_items_non_negative CHECK ((total_items >= 0))
);


--
-- Name: TABLE campaigns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.campaigns IS 'Campaign records - all columns use snake_case convention';


--
-- Name: COLUMN campaigns.campaign_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.campaign_type IS 'Valid values: domain_generation, dns_validation, http_keyword_validation';


--
-- Name: COLUMN campaigns.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.status IS 'Valid values: pending, queued, running, pausing, paused, completed, failed, cancelled';


--
-- Name: COLUMN campaigns.total_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.total_items IS 'Total items in campaign (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.processed_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.processed_items IS 'Items processed (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.successful_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.successful_items IS 'Successful items (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.failed_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.failed_items IS 'Failed items (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.estimated_completion_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.estimated_completion_at IS 'Estimated timestamp when campaign will complete';


--
-- Name: COLUMN campaigns.avg_processing_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.avg_processing_rate IS 'Average processing rate (items per second)';


--
-- Name: COLUMN campaigns.last_heartbeat_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.last_heartbeat_at IS 'Last heartbeat timestamp from campaign processor';


--
-- Name: campaigns_camel_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.campaigns_camel_view AS
 SELECT id,
    name,
    campaign_type AS "campaignType",
    status,
    user_id AS "userId",
    total_items AS "totalItems",
    processed_items AS "processedItems",
    successful_items AS "successfulItems",
    failed_items AS "failedItems",
    progress_percentage AS "progressPercentage",
    metadata,
    created_at AS "createdAt",
    updated_at AS "updatedAt",
    started_at AS "startedAt",
    completed_at AS "completedAt",
    error_message AS "errorMessage",
    estimated_completion_at AS "estimatedCompletionAt",
    avg_processing_rate AS "avgProcessingRate",
    last_heartbeat_at AS "lastHeartbeatAt"
   FROM public.campaigns;


--
-- Name: config_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_hash character varying(255) NOT NULL,
    lock_type character varying(50) DEFAULT 'exclusive'::character varying NOT NULL,
    owner character varying(255) NOT NULL,
    acquired_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_config_locks_expires_future CHECK (((expires_at IS NULL) OR (expires_at > acquired_at)))
);


--
-- Name: config_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_hash character varying(255) NOT NULL,
    version integer NOT NULL,
    lock_type character varying(50) DEFAULT 'none'::character varying NOT NULL,
    config_state jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: connection_leak_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connection_leak_detection (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id character varying(255) NOT NULL,
    acquired_at timestamp with time zone NOT NULL,
    acquired_by character varying(255) NOT NULL,
    operation_context jsonb DEFAULT '{}'::jsonb,
    stack_trace text,
    is_leaked boolean DEFAULT false,
    leak_detected_at timestamp with time zone,
    released_at timestamp with time zone,
    duration_held_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: connection_pool_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connection_pool_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type character varying(50) NOT NULL,
    threshold_value integer NOT NULL,
    alert_enabled boolean DEFAULT true,
    alert_message text NOT NULL,
    severity_level character varying(20) DEFAULT 'warning'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: connection_pool_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connection_pool_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_name character varying(100) NOT NULL,
    active_connections integer NOT NULL,
    idle_connections integer NOT NULL,
    max_connections integer NOT NULL,
    total_connections integer NOT NULL,
    connections_in_use integer NOT NULL,
    wait_count integer DEFAULT 0,
    wait_duration_ms integer DEFAULT 0,
    connection_errors integer DEFAULT 0,
    pool_state character varying(50) DEFAULT 'healthy'::character varying,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: dns_validation_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dns_validation_params (
    campaign_id uuid NOT NULL,
    source_generation_campaign_id uuid,
    persona_ids uuid[] NOT NULL,
    rotation_interval_seconds integer DEFAULT 0,
    processing_speed_per_minute integer DEFAULT 0,
    batch_size integer DEFAULT 50,
    retry_attempts integer DEFAULT 1,
    metadata jsonb,
    CONSTRAINT chk_dns_validation_processing_speed_non_negative CHECK (((processing_speed_per_minute IS NULL) OR (processing_speed_per_minute >= 0))),
    CONSTRAINT chk_dns_validation_rotation_interval_non_negative CHECK (((rotation_interval_seconds IS NULL) OR (rotation_interval_seconds >= 0))),
    CONSTRAINT dns_validation_params_batch_size_check CHECK ((batch_size > 0)),
    CONSTRAINT dns_validation_params_retry_attempts_check CHECK ((retry_attempts >= 0))
);


--
-- Name: dns_validation_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dns_validation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dns_campaign_id uuid NOT NULL,
    generated_domain_id uuid,
    domain_name text NOT NULL,
    validation_status text NOT NULL,
    dns_records jsonb,
    validated_by_persona_id uuid,
    attempts integer DEFAULT 0,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    business_status text,
    CONSTRAINT chk_dns_business_status_valid CHECK (((business_status IS NULL) OR (business_status = ANY (ARRAY['valid_dns'::text, 'lead_valid'::text, 'http_valid_no_keywords'::text, 'cancelled_during_processing'::text, 'invalid_http_response_error'::text, 'invalid_http_code'::text, 'processing_failed_before_http'::text])))),
    CONSTRAINT chk_dns_validation_status_valid CHECK ((validation_status = ANY (ARRAY['pending'::text, 'resolved'::text, 'unresolved'::text, 'timeout'::text, 'error'::text]))),
    CONSTRAINT dns_validation_results_attempts_check CHECK ((attempts >= 0))
);


--
-- Name: COLUMN dns_validation_results.validation_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dns_validation_results.validation_status IS 'e.g., Resolved, Unresolved, Error, Pending, Skipped';


--
-- Name: domain_generation_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_batches (
    batch_id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    batch_number integer NOT NULL,
    total_domains integer NOT NULL,
    processed_domains integer DEFAULT 0,
    failed_domains integer DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying,
    assigned_worker_id character varying(255),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: domain_generation_campaign_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_campaign_params (
    campaign_id uuid NOT NULL,
    pattern_type text NOT NULL,
    variable_length integer,
    character_set text,
    constant_string text,
    tld text NOT NULL,
    num_domains_to_generate integer NOT NULL,
    total_possible_combinations bigint NOT NULL,
    current_offset bigint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_domain_gen_current_offset_non_negative CHECK ((current_offset >= 0)),
    CONSTRAINT chk_domain_gen_num_domains_positive CHECK ((num_domains_to_generate > 0)),
    CONSTRAINT chk_domain_gen_pattern_type CHECK ((pattern_type = ANY (ARRAY['prefix'::text, 'suffix'::text, 'both'::text]))),
    CONSTRAINT chk_domain_gen_total_combinations_positive CHECK ((total_possible_combinations > 0)),
    CONSTRAINT chk_domain_gen_values_non_negative CHECK (((total_possible_combinations >= 0) AND (current_offset >= 0) AND (current_offset <= total_possible_combinations))),
    CONSTRAINT chk_domain_gen_variable_length_positive CHECK (((variable_length IS NULL) OR (variable_length > 0)))
);


--
-- Name: COLUMN domain_generation_campaign_params.total_possible_combinations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domain_generation_campaign_params.total_possible_combinations IS 'Total combinations (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN domain_generation_campaign_params.current_offset; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domain_generation_campaign_params.current_offset IS 'Current offset (Go: int64, JS: requires SafeBigInt)';


--
-- Name: domain_generation_config_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_config_states (
    config_hash text NOT NULL,
    last_offset bigint NOT NULL,
    config_details jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_domain_config_states_offset_positive CHECK ((last_offset >= 0)),
    CONSTRAINT chk_domain_config_states_version_positive CHECK ((version > 0))
);


--
-- Name: domain_generation_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_generation_params (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    pattern_type text NOT NULL,
    tld text NOT NULL,
    constant_string text,
    variable_length integer NOT NULL,
    character_set text NOT NULL,
    num_domains_to_generate integer DEFAULT 1000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_possible_combinations bigint DEFAULT 0 NOT NULL,
    current_offset bigint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_offset_within_bounds CHECK (((current_offset >= 0) AND (current_offset <= total_possible_combinations))),
    CONSTRAINT domain_generation_params_num_domains_to_generate_check CHECK ((num_domains_to_generate > 0)),
    CONSTRAINT domain_generation_params_pattern_type_check CHECK ((pattern_type = ANY (ARRAY['fixed'::text, 'variable'::text, 'hybrid'::text]))),
    CONSTRAINT domain_generation_params_variable_length_check CHECK ((variable_length > 0))
);


--
-- Name: enum_validation_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enum_validation_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    column_name text NOT NULL,
    invalid_value text NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    context jsonb
);


--
-- Name: generated_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain_generation_campaign_id uuid NOT NULL,
    domain_name text NOT NULL,
    source_keyword text,
    source_pattern text,
    tld text,
    offset_index bigint DEFAULT 0 NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_generated_domains_offset_non_negative CHECK ((offset_index >= 0))
);


--
-- Name: COLUMN generated_domains.offset_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generated_domains.offset_index IS 'Generation offset (Go: int64, JS: requires SafeBigInt)';


--
-- Name: http_keyword_campaign_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.http_keyword_campaign_params (
    campaign_id uuid NOT NULL,
    source_campaign_id uuid NOT NULL,
    source_type text NOT NULL,
    persona_ids uuid[] NOT NULL,
    keyword_set_ids uuid[],
    ad_hoc_keywords text[],
    proxy_ids uuid[],
    proxy_pool_id uuid,
    proxy_selection_strategy text,
    rotation_interval_seconds integer DEFAULT 0,
    processing_speed_per_minute integer DEFAULT 0,
    batch_size integer DEFAULT 10,
    retry_attempts integer DEFAULT 1,
    target_http_ports integer[],
    last_processed_domain_name text,
    metadata jsonb,
    CONSTRAINT chk_http_keyword_processing_speed_non_negative CHECK (((processing_speed_per_minute IS NULL) OR (processing_speed_per_minute >= 0))),
    CONSTRAINT chk_http_keyword_rotation_interval_non_negative CHECK (((rotation_interval_seconds IS NULL) OR (rotation_interval_seconds >= 0))),
    CONSTRAINT chk_http_keyword_source_type_valid CHECK ((source_type = ANY (ARRAY['DomainGeneration'::text, 'DNSValidation'::text]))),
    CONSTRAINT http_keyword_campaign_params_batch_size_check CHECK ((batch_size > 0)),
    CONSTRAINT http_keyword_campaign_params_retry_attempts_check CHECK ((retry_attempts >= 0))
);


--
-- Name: COLUMN http_keyword_campaign_params.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.http_keyword_campaign_params.source_type IS 'Source type with exact casing: DomainGeneration or DNSValidation';


--
-- Name: http_keyword_params; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.http_keyword_params (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    target_url text NOT NULL,
    keyword_set_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source_type text DEFAULT 'DomainGeneration'::text NOT NULL,
    source_campaign_id uuid,
    CONSTRAINT http_keyword_params_source_type_check CHECK ((source_type = ANY (ARRAY['DomainGeneration'::text, 'DNSValidation'::text])))
);


--
-- Name: COLUMN http_keyword_params.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.http_keyword_params.source_type IS 'Valid values: DomainGeneration, DNSValidation (PascalCase required)';


--
-- Name: http_keyword_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.http_keyword_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    http_keyword_campaign_id uuid NOT NULL,
    dns_result_id uuid,
    domain_name text NOT NULL,
    validation_status text NOT NULL,
    http_status_code integer,
    response_headers jsonb,
    page_title text,
    extracted_content_snippet text,
    found_keywords_from_sets jsonb,
    found_ad_hoc_keywords jsonb,
    content_hash text,
    validated_by_persona_id uuid,
    used_proxy_id uuid,
    attempts integer DEFAULT 0,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    business_status text,
    CONSTRAINT chk_http_business_status_valid CHECK ((business_status = ANY (ARRAY['lead_valid'::text, 'http_valid_no_keywords'::text, 'invalid_http_response_error'::text, 'invalid_http_code'::text, 'processing_failed_before_http'::text, 'cancelled_during_processing'::text]))),
    CONSTRAINT chk_http_validation_status_valid CHECK ((validation_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'timeout'::text, 'error'::text])))
);


--
-- Name: COLUMN http_keyword_results.validation_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.http_keyword_results.validation_status IS 'e.g., Success, ContentMismatch, KeywordsNotFound, Unreachable, AccessDenied, ProxyError, DNSError, Timeout, Error, Pending, Skipped';


--
-- Name: index_usage_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.index_usage_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schema_name character varying(100) NOT NULL,
    table_name character varying(100) NOT NULL,
    index_name character varying(100) NOT NULL,
    index_type character varying(50) NOT NULL,
    total_scans bigint DEFAULT 0,
    tuples_read bigint DEFAULT 0,
    tuples_fetched bigint DEFAULT 0,
    blocks_read bigint DEFAULT 0,
    blocks_hit bigint DEFAULT 0,
    index_size_bytes bigint DEFAULT 0,
    index_efficiency_pct numeric(5,2) DEFAULT 0,
    last_used_at timestamp with time zone,
    usage_frequency character varying(20) DEFAULT 'unknown'::character varying,
    recommendation character varying(100),
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: input_validation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.input_validation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    field_name character varying(100) NOT NULL,
    validation_type character varying(50) NOT NULL,
    validation_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text,
    is_required boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: input_validation_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.input_validation_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    field_name character varying(100) NOT NULL,
    violation_type character varying(100) NOT NULL,
    provided_value text,
    expected_format text,
    validation_rule jsonb,
    error_message text,
    source_ip inet,
    user_agent text,
    request_id character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: keyword_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    keyword_set_id uuid NOT NULL,
    pattern text NOT NULL,
    rule_type text NOT NULL,
    is_case_sensitive boolean DEFAULT false,
    category text,
    context_chars integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_keyword_rules_type_valid CHECK ((rule_type = ANY (ARRAY['string'::text, 'regex'::text]))),
    CONSTRAINT keyword_rules_context_chars_check CHECK ((context_chars >= 0))
);


--
-- Name: TABLE keyword_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.keyword_rules IS 'Individual keyword rules expanded from keyword_sets.rules JSONB';


--
-- Name: keyword_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_keyword_sets_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 255)))
);


--
-- Name: COLUMN keyword_sets.rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.keyword_sets.rules IS 'Array of KeywordRule objects: [{"pattern": "findme", "ruleType": "string", ...}]';


--
-- Name: memory_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_id character varying(255) NOT NULL,
    operation_type character varying(100) NOT NULL,
    campaign_id uuid,
    allocated_bytes bigint NOT NULL,
    peak_bytes bigint NOT NULL,
    duration_ms integer NOT NULL,
    allocation_pattern jsonb DEFAULT '{}'::jsonb,
    cleanup_successful boolean DEFAULT true,
    memory_leaked_bytes bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: memory_leak_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_leak_detection (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    leak_type character varying(50) NOT NULL,
    leak_source character varying(255) NOT NULL,
    leaked_bytes bigint NOT NULL,
    detection_method character varying(100) NOT NULL,
    stack_trace text,
    operation_context jsonb DEFAULT '{}'::jsonb,
    severity character varying(20) DEFAULT 'medium'::character varying,
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    detected_at timestamp with time zone DEFAULT now()
);


--
-- Name: memory_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    process_id character varying(50) NOT NULL,
    heap_size_bytes bigint NOT NULL,
    heap_used_bytes bigint NOT NULL,
    heap_free_bytes bigint NOT NULL,
    gc_count bigint DEFAULT 0,
    gc_duration_ms bigint DEFAULT 0,
    goroutines_count integer DEFAULT 0,
    stack_size_bytes bigint DEFAULT 0,
    memory_utilization_pct numeric(5,2) DEFAULT 0,
    memory_state character varying(50) DEFAULT 'normal'::character varying,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: memory_optimization_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_optimization_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recommendation_type character varying(100) NOT NULL,
    service_name character varying(100) NOT NULL,
    current_usage_bytes bigint NOT NULL,
    recommended_limit_bytes bigint NOT NULL,
    optimization_strategy jsonb NOT NULL,
    estimated_savings_bytes bigint DEFAULT 0,
    implementation_priority character varying(20) DEFAULT 'medium'::character varying,
    implemented boolean DEFAULT false,
    implemented_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    resource character varying(100),
    action character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    persona_type text NOT NULL,
    config_details jsonb NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_personas_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 255))),
    CONSTRAINT personas_persona_type_check CHECK ((persona_type = ANY (ARRAY['dns'::text, 'http'::text])))
);


--
-- Name: TABLE personas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.personas IS 'Persona records - all columns use snake_case convention';


--
-- Name: COLUMN personas.persona_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personas.persona_type IS 'Valid values: dns, http';


--
-- Name: COLUMN personas.config_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personas.config_details IS 'Stores DNSValidatorConfigJSON or HTTPValidatorConfigJSON';


--
-- Name: personas_camel_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.personas_camel_view AS
 SELECT id,
    name,
    description,
    persona_type AS "personaType",
    config_details AS "configDetails",
    is_enabled AS "isEnabled",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
   FROM public.personas;


--
-- Name: proxies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    address text NOT NULL,
    protocol text,
    username text,
    password_hash text,
    host text,
    port integer,
    is_enabled boolean DEFAULT true NOT NULL,
    is_healthy boolean DEFAULT true NOT NULL,
    last_status text,
    last_checked_at timestamp with time zone,
    latency_ms integer,
    city text,
    country_code text,
    provider text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_proxies_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 255))),
    CONSTRAINT chk_proxies_port_range CHECK (((port IS NULL) OR ((port > 0) AND (port <= 65535)))),
    CONSTRAINT chk_proxies_protocol_valid CHECK (((protocol IS NULL) OR (protocol = ANY (ARRAY['http'::text, 'https'::text, 'socks5'::text, 'socks4'::text])))),
    CONSTRAINT proxies_protocol_check CHECK ((protocol = ANY (ARRAY['http'::text, 'https'::text, 'socks5'::text, 'socks4'::text])))
);


--
-- Name: TABLE proxies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proxies IS 'Proxy records - all columns use snake_case convention';


--
-- Name: COLUMN proxies.protocol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proxies.protocol IS 'Valid values: http, https, socks5, socks4';


--
-- Name: proxies_camel_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.proxies_camel_view AS
 SELECT id,
    name,
    description,
    address,
    protocol,
    username,
    host,
    port,
    is_enabled AS "isEnabled",
    is_healthy AS "isHealthy",
    last_status AS "lastStatus",
    last_checked_at AS "lastCheckedAt",
    latency_ms AS "latencyMs",
    city,
    country_code AS "countryCode",
    provider,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
   FROM public.proxies;


--
-- Name: proxy_pool_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxy_pool_memberships (
    pool_id uuid NOT NULL,
    proxy_id uuid NOT NULL,
    weight integer DEFAULT 1,
    is_active boolean DEFAULT true,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE proxy_pool_memberships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proxy_pool_memberships IS 'Junction table for proxy pool memberships';


--
-- Name: proxy_pools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxy_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    pool_strategy text DEFAULT 'round_robin'::text,
    health_check_enabled boolean DEFAULT true,
    health_check_interval_seconds integer DEFAULT 300,
    max_retries integer DEFAULT 3,
    timeout_seconds integer DEFAULT 30,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_proxy_pools_strategy_valid CHECK ((pool_strategy = ANY (ARRAY['round_robin'::text, 'random'::text, 'least_used'::text, 'weighted'::text])))
);


--
-- Name: TABLE proxy_pools; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proxy_pools IS 'Proxy pool configurations for grouping and managing proxies';


--
-- Name: query_optimization_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_optimization_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    recommendation_type character varying(100) NOT NULL,
    current_performance_ms numeric(10,3) NOT NULL,
    estimated_improvement_pct numeric(5,2) NOT NULL,
    optimization_strategy jsonb NOT NULL,
    suggested_indexes text[] DEFAULT '{}'::text[],
    query_rewrite_suggestion text,
    implementation_complexity character varying(20) DEFAULT 'medium'::character varying,
    implementation_priority character varying(20) DEFAULT 'medium'::character varying,
    implemented boolean DEFAULT false,
    implemented_at timestamp with time zone,
    validation_results jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: query_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    query_sql text NOT NULL,
    query_type character varying(50) NOT NULL,
    table_names character varying[] DEFAULT '{}'::character varying[],
    execution_time_ms numeric(10,3) NOT NULL,
    rows_examined bigint DEFAULT 0,
    rows_returned bigint DEFAULT 0,
    index_usage jsonb DEFAULT '{}'::jsonb,
    cpu_time_ms numeric(10,3) DEFAULT 0,
    io_wait_ms numeric(10,3) DEFAULT 0,
    lock_wait_ms numeric(10,3) DEFAULT 0,
    buffer_reads bigint DEFAULT 0,
    buffer_hits bigint DEFAULT 0,
    query_plan jsonb DEFAULT '{}'::jsonb,
    optimization_score numeric(5,2) DEFAULT 0,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: resource_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_locks (
    lock_id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id character varying(255) NOT NULL,
    lock_holder character varying(255) NOT NULL,
    lock_mode character varying(50) DEFAULT 'exclusive'::character varying NOT NULL,
    acquired_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    renewal_count integer DEFAULT 0,
    context jsonb DEFAULT '{}'::jsonb
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    dirty boolean NOT NULL
);


--
-- Name: schema_migrations_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations_old (
    version text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    rolled_back_at timestamp with time zone,
    description text
);


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(100) NOT NULL,
    user_id uuid,
    session_id character varying(255),
    campaign_id uuid,
    resource_type character varying(100),
    resource_id character varying(255),
    action_attempted character varying(100) NOT NULL,
    authorization_result character varying(50) NOT NULL,
    permissions_required text[] DEFAULT '{}'::text[],
    permissions_granted text[] DEFAULT '{}'::text[],
    denial_reason text,
    risk_score integer DEFAULT 0,
    source_ip inet,
    user_agent text,
    request_context jsonb DEFAULT '{}'::jsonb,
    audit_log_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: si004_connection_leak_detection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.si004_connection_leak_detection (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    connection_id character varying(255) NOT NULL,
    duration_ms bigint NOT NULL,
    stack_trace text,
    query_info text
);


--
-- Name: si004_connection_leak_detection_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.si004_connection_leak_detection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: si004_connection_leak_detection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.si004_connection_leak_detection_id_seq OWNED BY public.si004_connection_leak_detection.id;


--
-- Name: si004_connection_pool_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.si004_connection_pool_alerts (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    alert_level character varying(20) NOT NULL,
    alert_message text NOT NULL,
    utilization_percent numeric(5,2),
    wait_duration_ms bigint,
    open_connections integer,
    in_use_connections integer,
    CONSTRAINT si004_connection_pool_alerts_alert_level_check CHECK (((alert_level)::text = ANY ((ARRAY['INFO'::character varying, 'WARNING'::character varying, 'CRITICAL'::character varying])::text[])))
);


--
-- Name: si004_connection_pool_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.si004_connection_pool_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: si004_connection_pool_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.si004_connection_pool_alerts_id_seq OWNED BY public.si004_connection_pool_alerts.id;


--
-- Name: si004_connection_pool_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.si004_connection_pool_metrics (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    max_open_connections integer NOT NULL,
    open_connections integer NOT NULL,
    in_use_connections integer NOT NULL,
    idle_connections integer NOT NULL,
    wait_count bigint DEFAULT 0 NOT NULL,
    wait_duration_ms bigint DEFAULT 0 NOT NULL,
    max_idle_closed bigint DEFAULT 0 NOT NULL,
    max_idle_time_closed bigint DEFAULT 0 NOT NULL,
    max_lifetime_closed bigint DEFAULT 0 NOT NULL,
    utilization_percent numeric(5,2) DEFAULT 0.00 NOT NULL
);


--
-- Name: si004_connection_pool_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.si004_connection_pool_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: si004_connection_pool_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.si004_connection_pool_metrics_id_seq OWNED BY public.si004_connection_pool_metrics.id;


--
-- Name: slow_query_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slow_query_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    query_sql text NOT NULL,
    execution_time_ms numeric(10,3) NOT NULL,
    waiting_time_ms numeric(10,3) DEFAULT 0,
    rows_examined bigint DEFAULT 0,
    rows_returned bigint DEFAULT 0,
    query_plan jsonb DEFAULT '{}'::jsonb,
    session_info jsonb DEFAULT '{}'::jsonb,
    application_context jsonb DEFAULT '{}'::jsonb,
    severity character varying(20) DEFAULT 'warning'::character varying,
    auto_optimization_attempted boolean DEFAULT false,
    optimization_result jsonb DEFAULT '{}'::jsonb,
    logged_at timestamp with time zone DEFAULT now()
);


--
-- Name: state_coordination_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_coordination_locks (
    lock_key character varying(255) NOT NULL,
    locked_by character varying(255) NOT NULL,
    locked_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: state_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_events (
    id uuid NOT NULL,
    entity_id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    event_data jsonb NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    state_version integer DEFAULT 1,
    correlation_id uuid,
    causation_id uuid,
    aggregate_type character varying(50) DEFAULT 'campaign'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: state_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    entity_type character varying(100) DEFAULT 'campaign'::character varying NOT NULL,
    snapshot_version integer NOT NULL,
    state_data jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: suspicious_input_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspicious_input_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    endpoint_pattern character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    field_name character varying(100) NOT NULL,
    pattern_name character varying(100) NOT NULL,
    provided_value text NOT NULL,
    pattern_matched text NOT NULL,
    category character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    source_ip character varying(45),
    user_agent text,
    request_id character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: suspicious_input_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspicious_input_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pattern_name character varying(100) NOT NULL,
    pattern text NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying,
    description text,
    detection_action character varying(50) DEFAULT 'log'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    category character varying(50) DEFAULT 'security'::character varying,
    is_enabled boolean DEFAULT true
);


--
-- Name: system_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    message text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    acknowledged boolean DEFAULT false,
    acknowledged_by character varying(255),
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: v_enum_documentation; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_enum_documentation AS
 SELECT 'CampaignType'::text AS enum_name,
    unnest(ARRAY['domain_generation'::text, 'dns_validation'::text, 'http_keyword_validation'::text]) AS valid_values
UNION ALL
 SELECT 'CampaignStatus'::text AS enum_name,
    unnest(ARRAY['pending'::text, 'queued'::text, 'running'::text, 'pausing'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]) AS valid_values
UNION ALL
 SELECT 'PersonaType'::text AS enum_name,
    unnest(ARRAY['dns'::text, 'http'::text]) AS valid_values
UNION ALL
 SELECT 'ProxyProtocol'::text AS enum_name,
    unnest(ARRAY['http'::text, 'https'::text, 'socks5'::text, 'socks4'::text]) AS valid_values
UNION ALL
 SELECT 'KeywordRuleType'::text AS enum_name,
    unnest(ARRAY['string'::text, 'regex'::text]) AS valid_values
UNION ALL
 SELECT 'HTTPSourceType'::text AS enum_name,
    unnest(ARRAY['DomainGeneration'::text, 'DNSValidation'::text]) AS valid_values;


--
-- Name: VIEW v_enum_documentation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_enum_documentation IS 'Documentation of valid enum values matching Go backend';


--
-- Name: versioned_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.versioned_configs (
    id bigint NOT NULL,
    config_type character varying(100) NOT NULL,
    config_key character varying(200) NOT NULL,
    config_value jsonb NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    checksum character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by character varying(100) DEFAULT 'system'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT versioned_configs_checksum_format CHECK (((checksum)::text ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT versioned_configs_key_not_empty CHECK (((config_key IS NOT NULL) AND (length(TRIM(BOTH FROM config_key)) > 0))),
    CONSTRAINT versioned_configs_type_not_empty CHECK (((config_type IS NOT NULL) AND (length(TRIM(BOTH FROM config_type)) > 0))),
    CONSTRAINT versioned_configs_version_positive CHECK ((version > 0))
);


--
-- Name: versioned_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.versioned_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: versioned_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.versioned_configs_id_seq OWNED BY public.versioned_configs.id;


--
-- Name: worker_coordination; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_coordination (
    worker_id character varying(255) NOT NULL,
    campaign_id uuid,
    worker_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'idle'::character varying NOT NULL,
    last_heartbeat timestamp with time zone DEFAULT now(),
    assigned_tasks jsonb DEFAULT '[]'::jsonb,
    resource_locks jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: campaign_state_events sequence_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events ALTER COLUMN sequence_number SET DEFAULT nextval('public.campaign_state_events_sequence_number_seq'::regclass);


--
-- Name: si004_connection_leak_detection id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_leak_detection ALTER COLUMN id SET DEFAULT nextval('public.si004_connection_leak_detection_id_seq'::regclass);


--
-- Name: si004_connection_pool_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_pool_alerts ALTER COLUMN id SET DEFAULT nextval('public.si004_connection_pool_alerts_id_seq'::regclass);


--
-- Name: si004_connection_pool_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_pool_metrics ALTER COLUMN id SET DEFAULT nextval('public.si004_connection_pool_metrics_id_seq'::regclass);


--
-- Name: versioned_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versioned_configs ALTER COLUMN id SET DEFAULT nextval('public.versioned_configs_id_seq'::regclass);


--
-- Name: api_access_violations api_access_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_access_violations
    ADD CONSTRAINT api_access_violations_pkey PRIMARY KEY (id);


--
-- Name: api_endpoint_permissions api_endpoint_permissions_endpoint_pattern_http_method_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_endpoint_permissions
    ADD CONSTRAINT api_endpoint_permissions_endpoint_pattern_http_method_key UNIQUE (endpoint_pattern, http_method);


--
-- Name: api_endpoint_permissions api_endpoint_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_endpoint_permissions
    ADD CONSTRAINT api_endpoint_permissions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: authorization_decisions authorization_decisions_decision_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_decision_id_key UNIQUE (decision_id);


--
-- Name: authorization_decisions authorization_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_pkey PRIMARY KEY (id);


--
-- Name: campaign_access_grants campaign_access_grants_campaign_id_user_id_access_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_campaign_id_user_id_access_type_key UNIQUE (campaign_id, user_id, access_type);


--
-- Name: campaign_access_grants campaign_access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_pkey PRIMARY KEY (id);


--
-- Name: campaign_jobs campaign_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_jobs
    ADD CONSTRAINT campaign_jobs_pkey PRIMARY KEY (id);


--
-- Name: campaign_state_events campaign_state_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT campaign_state_events_pkey PRIMARY KEY (id);


--
-- Name: campaign_state_snapshots campaign_state_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT campaign_state_snapshots_pkey PRIMARY KEY (id);


--
-- Name: campaign_state_transitions campaign_state_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: config_locks config_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_locks
    ADD CONSTRAINT config_locks_pkey PRIMARY KEY (id);


--
-- Name: config_versions config_versions_config_hash_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_config_hash_version_key UNIQUE (config_hash, version);


--
-- Name: config_versions config_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_pkey PRIMARY KEY (id);


--
-- Name: connection_leak_detection connection_leak_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_leak_detection
    ADD CONSTRAINT connection_leak_detection_pkey PRIMARY KEY (id);


--
-- Name: connection_pool_alerts connection_pool_alerts_alert_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_pool_alerts
    ADD CONSTRAINT connection_pool_alerts_alert_type_key UNIQUE (alert_type);


--
-- Name: connection_pool_alerts connection_pool_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_pool_alerts
    ADD CONSTRAINT connection_pool_alerts_pkey PRIMARY KEY (id);


--
-- Name: connection_pool_metrics connection_pool_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_pool_metrics
    ADD CONSTRAINT connection_pool_metrics_pkey PRIMARY KEY (id);


--
-- Name: dns_validation_params dns_validation_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_params
    ADD CONSTRAINT dns_validation_params_pkey PRIMARY KEY (campaign_id);


--
-- Name: dns_validation_results dns_validation_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_pkey PRIMARY KEY (id);


--
-- Name: domain_generation_batches domain_generation_batches_campaign_id_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_batches
    ADD CONSTRAINT domain_generation_batches_campaign_id_batch_number_key UNIQUE (campaign_id, batch_number);


--
-- Name: domain_generation_batches domain_generation_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_batches
    ADD CONSTRAINT domain_generation_batches_pkey PRIMARY KEY (batch_id);


--
-- Name: domain_generation_campaign_params domain_generation_campaign_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_campaign_params
    ADD CONSTRAINT domain_generation_campaign_params_pkey PRIMARY KEY (campaign_id);


--
-- Name: domain_generation_config_states domain_generation_config_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_config_states
    ADD CONSTRAINT domain_generation_config_states_pkey PRIMARY KEY (config_hash);


--
-- Name: domain_generation_params domain_generation_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_params
    ADD CONSTRAINT domain_generation_params_pkey PRIMARY KEY (id);


--
-- Name: enum_validation_failures enum_validation_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enum_validation_failures
    ADD CONSTRAINT enum_validation_failures_pkey PRIMARY KEY (id);


--
-- Name: generated_domains generated_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT generated_domains_pkey PRIMARY KEY (id);


--
-- Name: http_keyword_campaign_params http_keyword_campaign_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_campaign_params
    ADD CONSTRAINT http_keyword_campaign_params_pkey PRIMARY KEY (campaign_id);


--
-- Name: http_keyword_params http_keyword_params_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_params
    ADD CONSTRAINT http_keyword_params_pkey PRIMARY KEY (id);


--
-- Name: http_keyword_results http_keyword_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_pkey PRIMARY KEY (id);


--
-- Name: index_usage_analytics index_usage_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.index_usage_analytics
    ADD CONSTRAINT index_usage_analytics_pkey PRIMARY KEY (id);


--
-- Name: input_validation_rules input_validation_rules_endpoint_pattern_http_method_field_n_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_validation_rules
    ADD CONSTRAINT input_validation_rules_endpoint_pattern_http_method_field_n_key UNIQUE (endpoint_pattern, http_method, field_name);


--
-- Name: input_validation_rules input_validation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_validation_rules
    ADD CONSTRAINT input_validation_rules_pkey PRIMARY KEY (id);


--
-- Name: input_validation_violations input_validation_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.input_validation_violations
    ADD CONSTRAINT input_validation_violations_pkey PRIMARY KEY (id);


--
-- Name: keyword_rules keyword_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_rules
    ADD CONSTRAINT keyword_rules_pkey PRIMARY KEY (id);


--
-- Name: keyword_sets keyword_sets_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_sets
    ADD CONSTRAINT keyword_sets_name_key UNIQUE (name);


--
-- Name: keyword_sets keyword_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_sets
    ADD CONSTRAINT keyword_sets_pkey PRIMARY KEY (id);


--
-- Name: memory_allocations memory_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_allocations
    ADD CONSTRAINT memory_allocations_pkey PRIMARY KEY (id);


--
-- Name: memory_leak_detection memory_leak_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_leak_detection
    ADD CONSTRAINT memory_leak_detection_pkey PRIMARY KEY (id);


--
-- Name: memory_metrics memory_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_metrics
    ADD CONSTRAINT memory_metrics_pkey PRIMARY KEY (id);


--
-- Name: memory_optimization_recommendations memory_optimization_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_optimization_recommendations
    ADD CONSTRAINT memory_optimization_recommendations_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id);


--
-- Name: proxies proxies_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_address_key UNIQUE (address);


--
-- Name: proxies proxies_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_name_key UNIQUE (name);


--
-- Name: proxies proxies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_pkey PRIMARY KEY (id);


--
-- Name: proxy_pool_memberships proxy_pool_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pool_memberships
    ADD CONSTRAINT proxy_pool_memberships_pkey PRIMARY KEY (pool_id, proxy_id);


--
-- Name: proxy_pools proxy_pools_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pools
    ADD CONSTRAINT proxy_pools_name_key UNIQUE (name);


--
-- Name: proxy_pools proxy_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pools
    ADD CONSTRAINT proxy_pools_pkey PRIMARY KEY (id);


--
-- Name: query_optimization_recommendations query_optimization_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_optimization_recommendations
    ADD CONSTRAINT query_optimization_recommendations_pkey PRIMARY KEY (id);


--
-- Name: query_performance_metrics query_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_performance_metrics
    ADD CONSTRAINT query_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: resource_locks resource_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_locks
    ADD CONSTRAINT resource_locks_pkey PRIMARY KEY (lock_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations_old schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations_old
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: schema_migrations schema_migrations_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey1 PRIMARY KEY (version);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: si004_connection_leak_detection si004_connection_leak_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_leak_detection
    ADD CONSTRAINT si004_connection_leak_detection_pkey PRIMARY KEY (id);


--
-- Name: si004_connection_pool_alerts si004_connection_pool_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_pool_alerts
    ADD CONSTRAINT si004_connection_pool_alerts_pkey PRIMARY KEY (id);


--
-- Name: si004_connection_pool_metrics si004_connection_pool_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.si004_connection_pool_metrics
    ADD CONSTRAINT si004_connection_pool_metrics_pkey PRIMARY KEY (id);


--
-- Name: slow_query_log slow_query_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slow_query_log
    ADD CONSTRAINT slow_query_log_pkey PRIMARY KEY (id);


--
-- Name: state_coordination_locks state_coordination_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_coordination_locks
    ADD CONSTRAINT state_coordination_locks_pkey PRIMARY KEY (lock_key);


--
-- Name: state_events state_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_events
    ADD CONSTRAINT state_events_pkey PRIMARY KEY (id);


--
-- Name: state_snapshots state_snapshots_entity_id_entity_type_snapshot_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_snapshots
    ADD CONSTRAINT state_snapshots_entity_id_entity_type_snapshot_version_key UNIQUE (entity_id, entity_type, snapshot_version);


--
-- Name: state_snapshots state_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_snapshots
    ADD CONSTRAINT state_snapshots_pkey PRIMARY KEY (id);


--
-- Name: suspicious_input_alerts suspicious_input_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_input_alerts
    ADD CONSTRAINT suspicious_input_alerts_pkey PRIMARY KEY (id);


--
-- Name: suspicious_input_patterns suspicious_input_patterns_pattern_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_input_patterns
    ADD CONSTRAINT suspicious_input_patterns_pattern_name_key UNIQUE (pattern_name);


--
-- Name: suspicious_input_patterns suspicious_input_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_input_patterns
    ADD CONSTRAINT suspicious_input_patterns_pkey PRIMARY KEY (id);


--
-- Name: system_alerts system_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_pkey PRIMARY KEY (id);


--
-- Name: resource_locks unique_exclusive_locks; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_locks
    ADD CONSTRAINT unique_exclusive_locks EXCLUDE USING btree (resource_type WITH =, resource_id WITH =) WHERE (((lock_mode)::text = 'exclusive'::text));


--
-- Name: index_usage_analytics unique_index_analytics; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.index_usage_analytics
    ADD CONSTRAINT unique_index_analytics UNIQUE (schema_name, table_name, index_name);


--
-- Name: campaign_state_snapshots uq_campaign_snapshots_sequence; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT uq_campaign_snapshots_sequence UNIQUE (campaign_id, last_event_sequence);


--
-- Name: campaign_state_events uq_campaign_state_events_sequence; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT uq_campaign_state_events_sequence UNIQUE (campaign_id, sequence_number);


--
-- Name: dns_validation_results uq_dns_results_campaign_domain; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT uq_dns_results_campaign_domain UNIQUE (dns_campaign_id, domain_name);


--
-- Name: generated_domains uq_generated_domains_campaign_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT uq_generated_domains_campaign_name UNIQUE (domain_generation_campaign_id, domain_name);


--
-- Name: http_keyword_results uq_http_results_campaign_domain; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT uq_http_results_campaign_domain UNIQUE (http_keyword_campaign_id, domain_name);


--
-- Name: personas uq_personas_name_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT uq_personas_name_type UNIQUE (name, persona_type);


--
-- Name: campaign_state_transitions uq_state_transitions_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT uq_state_transitions_event UNIQUE (state_event_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: versioned_configs versioned_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versioned_configs
    ADD CONSTRAINT versioned_configs_pkey PRIMARY KEY (id);


--
-- Name: versioned_configs versioned_configs_type_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versioned_configs
    ADD CONSTRAINT versioned_configs_type_key_unique UNIQUE (config_type, config_key);


--
-- Name: worker_coordination worker_coordination_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_coordination
    ADD CONSTRAINT worker_coordination_pkey PRIMARY KEY (worker_id);


--
-- Name: idx_access_violations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_violations_created ON public.api_access_violations USING btree (created_at);


--
-- Name: idx_access_violations_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_violations_endpoint ON public.api_access_violations USING btree (endpoint_pattern);


--
-- Name: idx_access_violations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_violations_type ON public.api_access_violations USING btree (violation_type);


--
-- Name: idx_access_violations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_violations_user ON public.api_access_violations USING btree (user_id);


--
-- Name: idx_api_endpoint_permissions_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_endpoint_permissions_method ON public.api_endpoint_permissions USING btree (http_method);


--
-- Name: idx_api_endpoint_permissions_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_endpoint_permissions_pattern ON public.api_endpoint_permissions USING btree (endpoint_pattern);


--
-- Name: idx_api_endpoint_permissions_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_endpoint_permissions_resource ON public.api_endpoint_permissions USING btree (resource_type);


--
-- Name: idx_audit_logs_access_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_access_decision ON public.audit_logs USING btree (access_decision);


--
-- Name: idx_audit_logs_authorization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_authorization ON public.audit_logs USING gin (authorization_context);


--
-- Name: idx_audit_logs_entity_action_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_action_timestamp ON public.audit_logs USING btree (entity_type, action, "timestamp" DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: idx_audit_logs_entity_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_timestamp ON public.audit_logs USING btree (entity_id, "timestamp" DESC) WHERE (entity_id IS NOT NULL);


--
-- Name: idx_audit_logs_entity_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_type_id ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_permissions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_permissions ON public.audit_logs USING gin (permission_checked);


--
-- Name: idx_audit_logs_security_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_security_level ON public.audit_logs USING btree (security_level);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_logs_user_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_timestamp ON public.audit_logs USING btree (user_id, "timestamp" DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_auth_decisions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_decisions_created ON public.authorization_decisions USING btree (created_at);


--
-- Name: idx_auth_decisions_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_decisions_decision ON public.authorization_decisions USING btree (decision);


--
-- Name: idx_auth_decisions_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_decisions_resource ON public.authorization_decisions USING btree (resource_type, resource_id);


--
-- Name: idx_auth_decisions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_decisions_user ON public.authorization_decisions USING btree (user_id);


--
-- Name: idx_campaign_jobs_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_campaign_id ON public.campaign_jobs USING btree (campaign_id);


--
-- Name: idx_campaign_jobs_status_next_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_status_next_execution ON public.campaign_jobs USING btree (status, next_execution_at) WHERE (status = ANY (ARRAY['pending'::text, 'queued'::text, 'retry'::text]));


--
-- Name: idx_campaign_jobs_status_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_status_scheduled_at ON public.campaign_jobs USING btree (status, scheduled_at);


--
-- Name: idx_campaign_jobs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_jobs_type ON public.campaign_jobs USING btree (job_type);


--
-- Name: idx_campaign_state_events_campaign_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_campaign_sequence ON public.campaign_state_events USING btree (campaign_id, sequence_number);


--
-- Name: idx_campaign_state_events_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_correlation ON public.campaign_state_events USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_campaign_state_events_processing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_processing_status ON public.campaign_state_events USING btree (processing_status, occurred_at) WHERE (processing_status = ANY (ARRAY['pending'::text, 'failed'::text]));


--
-- Name: idx_campaign_state_events_type_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_events_type_campaign ON public.campaign_state_events USING btree (campaign_id, event_type, occurred_at DESC);


--
-- Name: idx_campaign_state_snapshots_campaign_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_campaign_sequence ON public.campaign_state_snapshots USING btree (campaign_id, last_event_sequence DESC);


--
-- Name: idx_campaign_state_snapshots_valid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_snapshots_valid ON public.campaign_state_snapshots USING btree (campaign_id, created_at DESC) WHERE (is_valid = true);


--
-- Name: idx_campaign_state_transitions_campaign_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_campaign_time ON public.campaign_state_transitions USING btree (campaign_id, initiated_at DESC);


--
-- Name: idx_campaign_state_transitions_invalid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_state_transitions_invalid ON public.campaign_state_transitions USING btree (campaign_id, is_valid_transition, initiated_at DESC) WHERE (is_valid_transition = false);


--
-- Name: idx_campaigns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_created_at ON public.campaigns USING btree (created_at DESC);


--
-- Name: idx_campaigns_large_numeric_values; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_large_numeric_values ON public.campaigns USING btree (id) WHERE ((total_items > '9007199254740991'::bigint) OR (processed_items > '9007199254740991'::bigint) OR (successful_items > '9007199254740991'::bigint) OR (failed_items > '9007199254740991'::bigint));


--
-- Name: idx_campaigns_last_heartbeat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_last_heartbeat ON public.campaigns USING btree (last_heartbeat_at) WHERE (last_heartbeat_at IS NOT NULL);


--
-- Name: idx_campaigns_processed_items; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_processed_items ON public.campaigns USING btree (processed_items) WHERE (processed_items > 0);


--
-- Name: idx_campaigns_progress_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_progress_tracking ON public.campaigns USING btree (status, progress_percentage, updated_at) WHERE (progress_percentage IS NOT NULL);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_status ON public.campaigns USING btree (status);


--
-- Name: idx_campaigns_status_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_status_type_created ON public.campaigns USING btree (status, campaign_type, created_at);


--
-- Name: idx_campaigns_status_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_status_updated ON public.campaigns USING btree (status, updated_at DESC);


--
-- Name: idx_campaigns_total_items; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_total_items ON public.campaigns USING btree (total_items) WHERE (total_items > 0);


--
-- Name: idx_campaigns_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_type ON public.campaigns USING btree (campaign_type);


--
-- Name: idx_campaigns_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_user_active ON public.campaigns USING btree (user_id, status) WHERE ((status = ANY (ARRAY['running'::text, 'pending'::text, 'queued'::text])) AND (user_id IS NOT NULL));


--
-- Name: idx_campaigns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_user_id ON public.campaigns USING btree (user_id);


--
-- Name: idx_config_locks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_active ON public.config_locks USING btree (is_active);


--
-- Name: idx_config_locks_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_config_locks_active_unique ON public.config_locks USING btree (config_hash) WHERE (is_active = true);


--
-- Name: idx_config_locks_config_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_config_hash ON public.config_locks USING btree (config_hash);


--
-- Name: idx_config_locks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_expires ON public.config_locks USING btree (expires_at);


--
-- Name: idx_config_locks_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_locks_owner ON public.config_locks USING btree (owner);


--
-- Name: idx_config_versions_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_hash ON public.config_versions USING btree (config_hash);


--
-- Name: idx_config_versions_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_versions_version ON public.config_versions USING btree (config_hash, version);


--
-- Name: idx_connection_leak_acquired; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_leak_acquired ON public.connection_leak_detection USING btree (acquired_at);


--
-- Name: idx_connection_leak_connection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_leak_connection ON public.connection_leak_detection USING btree (connection_id);


--
-- Name: idx_connection_leak_leaked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_leak_leaked ON public.connection_leak_detection USING btree (is_leaked);


--
-- Name: idx_connection_pool_metrics_pool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_pool ON public.connection_pool_metrics USING btree (pool_name);


--
-- Name: idx_connection_pool_metrics_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_recorded ON public.connection_pool_metrics USING btree (recorded_at);


--
-- Name: idx_connection_pool_metrics_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_pool_metrics_state ON public.connection_pool_metrics USING btree (pool_state);


--
-- Name: idx_coordination_locks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coordination_locks_expires ON public.state_coordination_locks USING btree (expires_at);


--
-- Name: idx_dns_results_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_results_campaign_id ON public.dns_validation_results USING btree (dns_campaign_id);


--
-- Name: idx_dns_results_domain_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_results_domain_name ON public.dns_validation_results USING btree (domain_name);


--
-- Name: idx_dns_results_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dns_results_status ON public.dns_validation_results USING btree (validation_status);


--
-- Name: idx_domain_batches_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_batches_campaign ON public.domain_generation_batches USING btree (campaign_id);


--
-- Name: idx_domain_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_batches_status ON public.domain_generation_batches USING btree (status);


--
-- Name: idx_domain_batches_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_batches_worker ON public.domain_generation_batches USING btree (assigned_worker_id);


--
-- Name: idx_domain_config_states_atomic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_config_states_atomic ON public.domain_generation_config_states USING btree (config_hash, version, last_offset);


--
-- Name: idx_domain_config_states_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_config_states_version ON public.domain_generation_config_states USING btree (config_hash, version);


--
-- Name: idx_domain_gen_offset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_gen_offset ON public.domain_generation_campaign_params USING btree (current_offset);


--
-- Name: idx_domain_gen_params_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_gen_params_campaign_id ON public.domain_generation_params USING btree (campaign_id);


--
-- Name: idx_generated_domains_campaign_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_created ON public.generated_domains USING btree (domain_generation_campaign_id, generated_at);


--
-- Name: idx_generated_domains_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_campaign_id ON public.generated_domains USING btree (domain_generation_campaign_id);


--
-- Name: idx_generated_domains_domain_name_tld; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_domain_name_tld ON public.generated_domains USING btree (domain_name, tld) WHERE (tld IS NOT NULL);


--
-- Name: idx_generated_domains_keyword_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_keyword_search ON public.generated_domains USING gin (to_tsvector('english'::regconfig, domain_name));


--
-- Name: idx_generated_domains_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_name ON public.generated_domains USING btree (domain_name);


--
-- Name: idx_generated_domains_offset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_offset ON public.generated_domains USING btree (domain_generation_campaign_id, offset_index);


--
-- Name: idx_generated_domains_offset_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_domains_offset_index ON public.generated_domains USING btree (domain_generation_campaign_id, offset_index) WHERE (offset_index >= 0);


--
-- Name: idx_http_keyword_params_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_params_campaign_id ON public.http_keyword_params USING btree (campaign_id);


--
-- Name: idx_http_keyword_params_source_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_params_source_campaign_id ON public.http_keyword_params USING btree (source_campaign_id);


--
-- Name: idx_http_keyword_results_dns_result_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_keyword_results_dns_result_id ON public.http_keyword_results USING btree (dns_result_id);


--
-- Name: idx_http_results_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_results_campaign_id ON public.http_keyword_results USING btree (http_keyword_campaign_id);


--
-- Name: idx_http_results_domain_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_results_domain_name ON public.http_keyword_results USING btree (domain_name);


--
-- Name: idx_http_results_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_results_status ON public.http_keyword_results USING btree (validation_status);


--
-- Name: idx_index_usage_efficiency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_index_usage_efficiency ON public.index_usage_analytics USING btree (index_efficiency_pct);


--
-- Name: idx_index_usage_frequency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_index_usage_frequency ON public.index_usage_analytics USING btree (usage_frequency);


--
-- Name: idx_index_usage_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_index_usage_name ON public.index_usage_analytics USING btree (index_name);


--
-- Name: idx_index_usage_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_index_usage_table ON public.index_usage_analytics USING btree (schema_name, table_name);


--
-- Name: idx_keyword_rules_keyword_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_keyword_set ON public.keyword_rules USING btree (keyword_set_id);


--
-- Name: idx_keyword_rules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_rules_type ON public.keyword_rules USING btree (rule_type);


--
-- Name: idx_memory_allocations_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_campaign ON public.memory_allocations USING btree (campaign_id);


--
-- Name: idx_memory_allocations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_created ON public.memory_allocations USING btree (created_at);


--
-- Name: idx_memory_allocations_leaked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_leaked ON public.memory_allocations USING btree (memory_leaked_bytes) WHERE (memory_leaked_bytes > 0);


--
-- Name: idx_memory_allocations_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_operation ON public.memory_allocations USING btree (operation_id);


--
-- Name: idx_memory_allocations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_allocations_type ON public.memory_allocations USING btree (operation_type);


--
-- Name: idx_memory_leak_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_detected ON public.memory_leak_detection USING btree (detected_at DESC);


--
-- Name: idx_memory_leak_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_resolved ON public.memory_leak_detection USING btree (resolved);


--
-- Name: idx_memory_leak_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_service ON public.memory_leak_detection USING btree (service_name);


--
-- Name: idx_memory_leak_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_severity ON public.memory_leak_detection USING btree (severity);


--
-- Name: idx_memory_leak_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_leak_type ON public.memory_leak_detection USING btree (leak_type);


--
-- Name: idx_memory_metrics_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_recorded ON public.memory_metrics USING btree (recorded_at);


--
-- Name: idx_memory_metrics_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_service ON public.memory_metrics USING btree (service_name);


--
-- Name: idx_memory_metrics_service_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_service_recorded ON public.memory_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_memory_metrics_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_state ON public.memory_metrics USING btree (memory_state);


--
-- Name: idx_memory_metrics_utilization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_metrics_utilization ON public.memory_metrics USING btree (memory_utilization_pct);


--
-- Name: idx_memory_optimization_implemented; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_optimization_implemented ON public.memory_optimization_recommendations USING btree (implemented);


--
-- Name: idx_memory_optimization_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_optimization_priority ON public.memory_optimization_recommendations USING btree (implementation_priority);


--
-- Name: idx_memory_optimization_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_optimization_service ON public.memory_optimization_recommendations USING btree (service_name);


--
-- Name: idx_personas_is_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_is_enabled ON public.personas USING btree (is_enabled);


--
-- Name: idx_personas_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_type ON public.personas USING btree (persona_type);


--
-- Name: idx_proxies_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_enabled ON public.proxies USING btree (is_enabled);


--
-- Name: idx_proxies_healthy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_healthy ON public.proxies USING btree (is_healthy);


--
-- Name: idx_proxies_is_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxies_is_enabled ON public.proxies USING btree (is_enabled);


--
-- Name: idx_proxy_pool_memberships_pool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_pool ON public.proxy_pool_memberships USING btree (pool_id);


--
-- Name: idx_proxy_pool_memberships_proxy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pool_memberships_proxy ON public.proxy_pool_memberships USING btree (proxy_id);


--
-- Name: idx_proxy_pools_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_pools_enabled ON public.proxy_pools USING btree (is_enabled);


--
-- Name: idx_query_optimization_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_hash ON public.query_optimization_recommendations USING btree (query_hash);


--
-- Name: idx_query_optimization_implemented; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_implemented ON public.query_optimization_recommendations USING btree (implemented);


--
-- Name: idx_query_optimization_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_priority ON public.query_optimization_recommendations USING btree (implementation_priority);


--
-- Name: idx_query_optimization_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_optimization_type ON public.query_optimization_recommendations USING btree (recommendation_type);


--
-- Name: idx_query_performance_executed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_executed ON public.query_performance_metrics USING btree (executed_at);


--
-- Name: idx_query_performance_execution_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_execution_time ON public.query_performance_metrics USING btree (execution_time_ms);


--
-- Name: idx_query_performance_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_hash ON public.query_performance_metrics USING btree (query_hash);


--
-- Name: idx_query_performance_optimization_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_optimization_score ON public.query_performance_metrics USING btree (optimization_score);


--
-- Name: idx_query_performance_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_performance_type ON public.query_performance_metrics USING btree (query_type);


--
-- Name: idx_resource_locks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_locks_expires ON public.resource_locks USING btree (expires_at);


--
-- Name: idx_resource_locks_holder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_locks_holder ON public.resource_locks USING btree (lock_holder);


--
-- Name: idx_resource_locks_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_locks_resource ON public.resource_locks USING btree (resource_type, resource_id);


--
-- Name: idx_security_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_created ON public.security_events USING btree (created_at);


--
-- Name: idx_security_events_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_result ON public.security_events USING btree (authorization_result);


--
-- Name: idx_security_events_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_risk ON public.security_events USING btree (risk_score DESC);


--
-- Name: idx_security_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_type ON public.security_events USING btree (event_type);


--
-- Name: idx_security_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_user ON public.security_events USING btree (user_id);


--
-- Name: idx_slow_query_execution_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slow_query_execution_time ON public.slow_query_log USING btree (execution_time_ms);


--
-- Name: idx_slow_query_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slow_query_hash ON public.slow_query_log USING btree (query_hash);


--
-- Name: idx_slow_query_logged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slow_query_logged ON public.slow_query_log USING btree (logged_at);


--
-- Name: idx_slow_query_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slow_query_severity ON public.slow_query_log USING btree (severity);


--
-- Name: idx_state_events_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_events_correlation ON public.state_events USING btree (correlation_id);


--
-- Name: idx_state_events_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_events_version ON public.state_events USING btree (entity_id, state_version);


--
-- Name: idx_state_snapshots_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_snapshots_entity ON public.state_snapshots USING btree (entity_id, entity_type);


--
-- Name: idx_state_snapshots_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_snapshots_version ON public.state_snapshots USING btree (entity_id, snapshot_version DESC);


--
-- Name: idx_suspicious_alerts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_created_at ON public.suspicious_input_alerts USING btree (created_at);


--
-- Name: idx_suspicious_alerts_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_endpoint ON public.suspicious_input_alerts USING btree (endpoint_pattern);


--
-- Name: idx_suspicious_alerts_pattern_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_pattern_name ON public.suspicious_input_alerts USING btree (pattern_name);


--
-- Name: idx_suspicious_alerts_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_severity ON public.suspicious_input_alerts USING btree (severity);


--
-- Name: idx_suspicious_alerts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspicious_alerts_user_id ON public.suspicious_input_alerts USING btree (user_id);


--
-- Name: idx_system_alerts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_created ON public.system_alerts USING btree (created_at);


--
-- Name: idx_system_alerts_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_severity ON public.system_alerts USING btree (severity);


--
-- Name: idx_system_alerts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_type ON public.system_alerts USING btree (alert_type);


--
-- Name: idx_validation_rules_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_rules_endpoint ON public.input_validation_rules USING btree (endpoint_pattern);


--
-- Name: idx_validation_rules_field; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_rules_field ON public.input_validation_rules USING btree (field_name);


--
-- Name: idx_validation_rules_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_rules_method ON public.input_validation_rules USING btree (http_method);


--
-- Name: idx_validation_violations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_created ON public.input_validation_violations USING btree (created_at);


--
-- Name: idx_validation_violations_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_endpoint ON public.input_validation_violations USING btree (endpoint_pattern);


--
-- Name: idx_validation_violations_field; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_field ON public.input_validation_violations USING btree (field_name);


--
-- Name: idx_validation_violations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_type ON public.input_validation_violations USING btree (violation_type);


--
-- Name: idx_validation_violations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_violations_user ON public.input_validation_violations USING btree (user_id);


--
-- Name: idx_versioned_configs_checksum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_checksum ON public.versioned_configs USING btree (checksum);


--
-- Name: idx_versioned_configs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_created_at ON public.versioned_configs USING btree (created_at);


--
-- Name: idx_versioned_configs_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_type_key ON public.versioned_configs USING btree (config_type, config_key);


--
-- Name: idx_versioned_configs_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_updated_at ON public.versioned_configs USING btree (updated_at);


--
-- Name: idx_versioned_configs_validation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_validation ON public.versioned_configs USING btree (config_type, config_key, version, checksum);


--
-- Name: idx_versioned_configs_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versioned_configs_version ON public.versioned_configs USING btree (version);


--
-- Name: idx_worker_coordination_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_coordination_campaign ON public.worker_coordination USING btree (campaign_id);


--
-- Name: idx_worker_coordination_heartbeat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_coordination_heartbeat ON public.worker_coordination USING btree (last_heartbeat);


--
-- Name: idx_worker_coordination_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worker_coordination_status ON public.worker_coordination USING btree (status);


--
-- Name: keyword_rules keyword_rules_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER keyword_rules_updated_at_trigger BEFORE UPDATE ON public.keyword_rules FOR EACH ROW EXECUTE FUNCTION public.update_keyword_rules_updated_at();


--
-- Name: proxies proxies_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER proxies_updated_at_trigger BEFORE UPDATE ON public.proxies FOR EACH ROW EXECUTE FUNCTION public.update_proxies_updated_at();


--
-- Name: proxy_pools proxy_pools_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER proxy_pools_updated_at_trigger BEFORE UPDATE ON public.proxy_pools FOR EACH ROW EXECUTE FUNCTION public.update_proxy_pools_updated_at();


--
-- Name: campaign_jobs set_timestamp_campaign_jobs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_campaign_jobs BEFORE UPDATE ON public.campaign_jobs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: campaigns set_timestamp_campaigns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_campaigns BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: keyword_sets set_timestamp_keyword_sets; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_keyword_sets BEFORE UPDATE ON public.keyword_sets FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: personas set_timestamp_personas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_personas BEFORE UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: proxies set_timestamp_proxies; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_proxies BEFORE UPDATE ON public.proxies FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: campaigns trg_campaigns_numeric_safety; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_campaigns_numeric_safety BEFORE INSERT OR UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.fn_validate_numeric_safety();


--
-- Name: campaign_state_transitions trigger_update_state_event_processing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_state_event_processing AFTER UPDATE ON public.campaign_state_transitions FOR EACH ROW EXECUTE FUNCTION public.update_state_event_processing_status();


--
-- Name: authorization_decisions authorization_decisions_security_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_security_event_id_fkey FOREIGN KEY (security_event_id) REFERENCES public.security_events(id);


--
-- Name: campaign_access_grants campaign_access_grants_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_access_grants campaign_access_grants_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: campaign_access_grants campaign_access_grants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: campaign_jobs campaign_jobs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_jobs
    ADD CONSTRAINT campaign_jobs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_events campaign_state_events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT campaign_state_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_snapshots campaign_state_snapshots_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT campaign_state_snapshots_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_transitions campaign_state_transitions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_transitions campaign_state_transitions_state_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_state_event_id_fkey FOREIGN KEY (state_event_id) REFERENCES public.campaign_state_events(id) ON DELETE CASCADE;


--
-- Name: dns_validation_params dns_validation_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_params
    ADD CONSTRAINT dns_validation_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: dns_validation_params dns_validation_params_source_generation_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_params
    ADD CONSTRAINT dns_validation_params_source_generation_campaign_id_fkey FOREIGN KEY (source_generation_campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: dns_validation_results dns_validation_results_dns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_dns_campaign_id_fkey FOREIGN KEY (dns_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: dns_validation_results dns_validation_results_generated_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_generated_domain_id_fkey FOREIGN KEY (generated_domain_id) REFERENCES public.generated_domains(id) ON DELETE SET NULL;


--
-- Name: dns_validation_results dns_validation_results_validated_by_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_validated_by_persona_id_fkey FOREIGN KEY (validated_by_persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;


--
-- Name: domain_generation_batches domain_generation_batches_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_batches
    ADD CONSTRAINT domain_generation_batches_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: domain_generation_campaign_params domain_generation_campaign_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_campaign_params
    ADD CONSTRAINT domain_generation_campaign_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: domain_generation_params domain_generation_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_generation_params
    ADD CONSTRAINT domain_generation_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: generated_domains generated_domains_domain_generation_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT generated_domains_domain_generation_campaign_id_fkey FOREIGN KEY (domain_generation_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_campaign_params http_keyword_campaign_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_campaign_params
    ADD CONSTRAINT http_keyword_campaign_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_campaign_params http_keyword_campaign_params_source_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_campaign_params
    ADD CONSTRAINT http_keyword_campaign_params_source_campaign_id_fkey FOREIGN KEY (source_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_params http_keyword_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_params
    ADD CONSTRAINT http_keyword_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_params http_keyword_params_source_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_params
    ADD CONSTRAINT http_keyword_params_source_campaign_id_fkey FOREIGN KEY (source_campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_dns_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_dns_result_id_fkey FOREIGN KEY (dns_result_id) REFERENCES public.dns_validation_results(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_http_keyword_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_http_keyword_campaign_id_fkey FOREIGN KEY (http_keyword_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_results http_keyword_results_used_proxy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_used_proxy_id_fkey FOREIGN KEY (used_proxy_id) REFERENCES public.proxies(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_validated_by_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_validated_by_persona_id_fkey FOREIGN KEY (validated_by_persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;


--
-- Name: keyword_rules keyword_rules_keyword_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_rules
    ADD CONSTRAINT keyword_rules_keyword_set_id_fkey FOREIGN KEY (keyword_set_id) REFERENCES public.keyword_sets(id) ON DELETE CASCADE;


--
-- Name: proxy_pool_memberships proxy_pool_memberships_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pool_memberships
    ADD CONSTRAINT proxy_pool_memberships_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.proxy_pools(id) ON DELETE CASCADE;


--
-- Name: proxy_pool_memberships proxy_pool_memberships_proxy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_pool_memberships
    ADD CONSTRAINT proxy_pool_memberships_proxy_id_fkey FOREIGN KEY (proxy_id) REFERENCES public.proxies(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: security_events security_events_audit_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_audit_log_id_fkey FOREIGN KEY (audit_log_id) REFERENCES public.audit_logs(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: worker_coordination worker_coordination_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_coordination
    ADD CONSTRAINT worker_coordination_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- PostgreSQL database dump complete
--

