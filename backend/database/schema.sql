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
ALTER TABLE IF EXISTS ONLY public.security_events DROP CONSTRAINT IF EXISTS security_events_audit_log_id_fkey;
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
ALTER TABLE IF EXISTS ONLY auth.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.user_roles DROP CONSTRAINT IF EXISTS user_roles_assigned_by_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.auth_audit_log DROP CONSTRAINT IF EXISTS auth_audit_log_user_id_fkey;
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
DROP TRIGGER IF EXISTS trigger_session_fingerprint ON auth.sessions;
DROP TRIGGER IF EXISTS set_timestamp_auth_users ON auth.users;
DROP TRIGGER IF EXISTS set_timestamp_auth_roles ON auth.roles;
DROP INDEX IF EXISTS public.idx_worker_pool_metrics_service;
DROP INDEX IF EXISTS public.idx_worker_pool_metrics_pool_time;
DROP INDEX IF EXISTS public.idx_worker_pool_metrics_campaign;
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
DROP INDEX IF EXISTS public.idx_service_metrics_pattern;
DROP INDEX IF EXISTS public.idx_service_metrics_coupling;
DROP INDEX IF EXISTS public.idx_security_events_user;
DROP INDEX IF EXISTS public.idx_security_events_type;
DROP INDEX IF EXISTS public.idx_security_events_risk;
DROP INDEX IF EXISTS public.idx_security_events_result;
DROP INDEX IF EXISTS public.idx_security_events_created;
DROP INDEX IF EXISTS public.idx_response_time_targets_service;
DROP INDEX IF EXISTS public.idx_response_time_targets_campaign;
DROP INDEX IF EXISTS public.idx_response_time_service;
DROP INDEX IF EXISTS public.idx_response_time_recorded;
DROP INDEX IF EXISTS public.idx_response_time_operation;
DROP INDEX IF EXISTS public.idx_response_time_ms;
DROP INDEX IF EXISTS public.idx_response_time_metrics_response_time;
DROP INDEX IF EXISTS public.idx_response_time_metrics_endpoint;
DROP INDEX IF EXISTS public.idx_response_time_history_service_window;
DROP INDEX IF EXISTS public.idx_response_time_history_campaign;
DROP INDEX IF EXISTS public.idx_response_time_endpoint;
DROP INDEX IF EXISTS public.idx_response_time_campaign;
DROP INDEX IF EXISTS public.idx_response_optimization_priority;
DROP INDEX IF EXISTS public.idx_response_optimization_endpoint;
DROP INDEX IF EXISTS public.idx_response_metrics_user_endpoint;
DROP INDEX IF EXISTS public.idx_response_metrics_slow_requests;
DROP INDEX IF EXISTS public.idx_response_metrics_endpoint_time;
DROP INDEX IF EXISTS public.idx_response_metrics_campaign;
DROP INDEX IF EXISTS public.idx_resource_utilization_type;
DROP INDEX IF EXISTS public.idx_resource_utilization_service_time;
DROP INDEX IF EXISTS public.idx_resource_utilization_efficiency;
DROP INDEX IF EXISTS public.idx_resource_utilization_campaign;
DROP INDEX IF EXISTS public.idx_resource_optimization_service_time;
DROP INDEX IF EXISTS public.idx_resource_optimization_campaign;
DROP INDEX IF EXISTS public.idx_resource_locks_resource;
DROP INDEX IF EXISTS public.idx_resource_locks_holder;
DROP INDEX IF EXISTS public.idx_resource_locks_expires;
DROP INDEX IF EXISTS public.idx_refactor_timeline;
DROP INDEX IF EXISTS public.idx_query_performance_type;
DROP INDEX IF EXISTS public.idx_query_performance_service_campaign;
DROP INDEX IF EXISTS public.idx_query_performance_performance_category;
DROP INDEX IF EXISTS public.idx_query_performance_optimization_score;
DROP INDEX IF EXISTS public.idx_query_performance_hash;
DROP INDEX IF EXISTS public.idx_query_performance_execution_time;
DROP INDEX IF EXISTS public.idx_query_performance_executed;
DROP INDEX IF EXISTS public.idx_query_performance_campaign_id;
DROP INDEX IF EXISTS public.idx_query_optimization_type;
DROP INDEX IF EXISTS public.idx_query_optimization_status;
DROP INDEX IF EXISTS public.idx_query_optimization_query_hash;
DROP INDEX IF EXISTS public.idx_query_optimization_priority;
DROP INDEX IF EXISTS public.idx_query_optimization_implemented;
DROP INDEX IF EXISTS public.idx_query_optimization_hash;
DROP INDEX IF EXISTS public.idx_proxy_pools_enabled;
DROP INDEX IF EXISTS public.idx_proxy_pool_memberships_proxy;
DROP INDEX IF EXISTS public.idx_proxy_pool_memberships_pool;
DROP INDEX IF EXISTS public.idx_proxies_is_enabled;
DROP INDEX IF EXISTS public.idx_proxies_healthy;
DROP INDEX IF EXISTS public.idx_proxies_enabled;
DROP INDEX IF EXISTS public.idx_projections_name_aggregate;
DROP INDEX IF EXISTS public.idx_personas_type;
DROP INDEX IF EXISTS public.idx_personas_is_enabled;
DROP INDEX IF EXISTS public.idx_personas_http_config;
DROP INDEX IF EXISTS public.idx_personas_dns_config;
DROP INDEX IF EXISTS public.idx_personas_active;
DROP INDEX IF EXISTS public.idx_perf_opt_type;
DROP INDEX IF EXISTS public.idx_perf_opt_service;
DROP INDEX IF EXISTS public.idx_perf_opt_improvement;
DROP INDEX IF EXISTS public.idx_memory_pools_type;
DROP INDEX IF EXISTS public.idx_memory_pools_service;
DROP INDEX IF EXISTS public.idx_memory_pools_efficiency;
DROP INDEX IF EXISTS public.idx_memory_optimization_service;
DROP INDEX IF EXISTS public.idx_memory_optimization_priority;
DROP INDEX IF EXISTS public.idx_memory_optimization_implemented;
DROP INDEX IF EXISTS public.idx_memory_metrics_utilization;
DROP INDEX IF EXISTS public.idx_memory_metrics_state;
DROP INDEX IF EXISTS public.idx_memory_metrics_service_time;
DROP INDEX IF EXISTS public.idx_memory_metrics_service_recorded;
DROP INDEX IF EXISTS public.idx_memory_metrics_service;
DROP INDEX IF EXISTS public.idx_memory_metrics_recorded;
DROP INDEX IF EXISTS public.idx_memory_metrics_memory_type;
DROP INDEX IF EXISTS public.idx_memory_metrics_efficiency;
DROP INDEX IF EXISTS public.idx_memory_metrics_component;
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
DROP INDEX IF EXISTS public.idx_http_results_status_time;
DROP INDEX IF EXISTS public.idx_http_results_status;
DROP INDEX IF EXISTS public.idx_http_results_keywords;
DROP INDEX IF EXISTS public.idx_http_results_errors;
DROP INDEX IF EXISTS public.idx_http_results_domain_name;
DROP INDEX IF EXISTS public.idx_http_results_campaign_id;
DROP INDEX IF EXISTS public.idx_http_results_bulk_ops;
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
DROP INDEX IF EXISTS public.idx_event_store_type_time;
DROP INDEX IF EXISTS public.idx_event_store_global_position;
DROP INDEX IF EXISTS public.idx_event_store_aggregate;
DROP INDEX IF EXISTS public.idx_domain_gen_params_campaign_id;
DROP INDEX IF EXISTS public.idx_domain_gen_offset;
DROP INDEX IF EXISTS public.idx_domain_config_states_version;
DROP INDEX IF EXISTS public.idx_domain_config_states_atomic;
DROP INDEX IF EXISTS public.idx_domain_batches_worker;
DROP INDEX IF EXISTS public.idx_domain_batches_status;
DROP INDEX IF EXISTS public.idx_domain_batches_campaign;
DROP INDEX IF EXISTS public.idx_dns_validation_results_status_time;
DROP INDEX IF EXISTS public.idx_dns_validation_results_failed;
DROP INDEX IF EXISTS public.idx_dns_validation_results_bulk_ops;
DROP INDEX IF EXISTS public.idx_dns_results_status;
DROP INDEX IF EXISTS public.idx_dns_results_domain_name;
DROP INDEX IF EXISTS public.idx_dns_results_campaign_id;
DROP INDEX IF EXISTS public.idx_dependencies_reliability;
DROP INDEX IF EXISTS public.idx_db_perf_metrics_type;
DROP INDEX IF EXISTS public.idx_db_perf_metrics_time;
DROP INDEX IF EXISTS public.idx_db_perf_metrics_recorded;
DROP INDEX IF EXISTS public.idx_db_perf_metrics_hash;
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
DROP INDEX IF EXISTS public.idx_communication_patterns_latency;
DROP INDEX IF EXISTS public.idx_communication_patterns_errors;
DROP INDEX IF EXISTS public.idx_capacity_metrics_service_time;
DROP INDEX IF EXISTS public.idx_campaigns_user_id_status;
DROP INDEX IF EXISTS public.idx_campaigns_user_id;
DROP INDEX IF EXISTS public.idx_campaigns_user_active;
DROP INDEX IF EXISTS public.idx_campaigns_type_status;
DROP INDEX IF EXISTS public.idx_campaigns_type;
DROP INDEX IF EXISTS public.idx_campaigns_total_items;
DROP INDEX IF EXISTS public.idx_campaigns_status_updated;
DROP INDEX IF EXISTS public.idx_campaigns_status_type_created;
DROP INDEX IF EXISTS public.idx_campaigns_status_created_at;
DROP INDEX IF EXISTS public.idx_campaigns_status;
DROP INDEX IF EXISTS public.idx_campaigns_progress_tracking;
DROP INDEX IF EXISTS public.idx_campaigns_processed_items;
DROP INDEX IF EXISTS public.idx_campaigns_name_search;
DROP INDEX IF EXISTS public.idx_campaigns_last_heartbeat;
DROP INDEX IF EXISTS public.idx_campaigns_large_numeric_values;
DROP INDEX IF EXISTS public.idx_campaigns_created_at;
DROP INDEX IF EXISTS public.idx_campaigns_bulk_ops;
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
DROP INDEX IF EXISTS public.idx_campaign_jobs_status_scheduled;
DROP INDEX IF EXISTS public.idx_campaign_jobs_status_next_execution;
DROP INDEX IF EXISTS public.idx_campaign_jobs_processing;
DROP INDEX IF EXISTS public.idx_campaign_jobs_completion;
DROP INDEX IF EXISTS public.idx_campaign_jobs_campaign_type;
DROP INDEX IF EXISTS public.idx_campaign_jobs_campaign_id;
DROP INDEX IF EXISTS public.idx_campaign_jobs_bulk_update;
DROP INDEX IF EXISTS public.idx_cache_metrics_type;
DROP INDEX IF EXISTS public.idx_cache_metrics_service_time;
DROP INDEX IF EXISTS public.idx_cache_metrics_recorded;
DROP INDEX IF EXISTS public.idx_cache_metrics_operation;
DROP INDEX IF EXISTS public.idx_cache_metrics_namespace;
DROP INDEX IF EXISTS public.idx_cache_metrics_name;
DROP INDEX IF EXISTS public.idx_cache_metrics_campaign;
DROP INDEX IF EXISTS public.idx_cache_invalidation_service_time;
DROP INDEX IF EXISTS public.idx_cache_invalidation_namespace;
DROP INDEX IF EXISTS public.idx_cache_inv_type;
DROP INDEX IF EXISTS public.idx_cache_inv_name;
DROP INDEX IF EXISTS public.idx_cache_inv_at;
DROP INDEX IF EXISTS public.idx_cache_entries_tags;
DROP INDEX IF EXISTS public.idx_cache_entries_service;
DROP INDEX IF EXISTS public.idx_cache_entries_namespace_key;
DROP INDEX IF EXISTS public.idx_cache_entries_last_accessed;
DROP INDEX IF EXISTS public.idx_cache_entries_expires;
DROP INDEX IF EXISTS public.idx_cache_entries_campaign;
DROP INDEX IF EXISTS public.idx_cache_config_type;
DROP INDEX IF EXISTS public.idx_cache_config_status;
DROP INDEX IF EXISTS public.idx_cache_config_name;
DROP INDEX IF EXISTS public.idx_auth_decisions_user;
DROP INDEX IF EXISTS public.idx_auth_decisions_resource;
DROP INDEX IF EXISTS public.idx_auth_decisions_decision;
DROP INDEX IF EXISTS public.idx_auth_decisions_created;
DROP INDEX IF EXISTS public.idx_audit_logs_user_timestamp;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;
DROP INDEX IF EXISTS public.idx_audit_logs_user_action;
DROP INDEX IF EXISTS public.idx_audit_logs_timestamp;
DROP INDEX IF EXISTS public.idx_audit_logs_security_level;
DROP INDEX IF EXISTS public.idx_audit_logs_permissions;
DROP INDEX IF EXISTS public.idx_audit_logs_entity_type_id;
DROP INDEX IF EXISTS public.idx_audit_logs_entity_timestamp;
DROP INDEX IF EXISTS public.idx_audit_logs_entity_action_timestamp;
DROP INDEX IF EXISTS public.idx_audit_logs_campaign;
DROP INDEX IF EXISTS public.idx_audit_logs_authorization;
DROP INDEX IF EXISTS public.idx_audit_logs_access_decision;
DROP INDEX IF EXISTS public.idx_async_task_status_user;
DROP INDEX IF EXISTS public.idx_async_task_status_type_status;
DROP INDEX IF EXISTS public.idx_async_task_status_task_id;
DROP INDEX IF EXISTS public.idx_access_violations_user;
DROP INDEX IF EXISTS public.idx_access_violations_type;
DROP INDEX IF EXISTS public.idx_access_violations_endpoint;
DROP INDEX IF EXISTS public.idx_access_violations_created;
DROP INDEX IF EXISTS auth.idx_user_roles_user_id;
DROP INDEX IF EXISTS auth.idx_user_roles_role_id;
DROP INDEX IF EXISTS auth.idx_sessions_validation;
DROP INDEX IF EXISTS auth.idx_sessions_user_id;
DROP INDEX IF EXISTS auth.idx_sessions_user_agent_hash;
DROP INDEX IF EXISTS auth.idx_sessions_last_activity;
DROP INDEX IF EXISTS auth.idx_sessions_ip_address;
DROP INDEX IF EXISTS auth.idx_sessions_fingerprint;
DROP INDEX IF EXISTS auth.idx_sessions_expires_at;
DROP INDEX IF EXISTS auth.idx_sessions_active;
DROP INDEX IF EXISTS auth.idx_role_permissions_role_id;
DROP INDEX IF EXISTS auth.idx_role_permissions_permission_id;
DROP INDEX IF EXISTS auth.idx_rate_limits_identifier;
DROP INDEX IF EXISTS auth.idx_rate_limits_blocked_until;
DROP INDEX IF EXISTS auth.idx_password_reset_user_id;
DROP INDEX IF EXISTS auth.idx_password_reset_expires;
DROP INDEX IF EXISTS auth.idx_auth_audit_user_id;
DROP INDEX IF EXISTS auth.idx_auth_audit_session_fingerprint;
DROP INDEX IF EXISTS auth.idx_auth_audit_risk_score;
DROP INDEX IF EXISTS auth.idx_auth_audit_event_type;
DROP INDEX IF EXISTS auth.idx_auth_audit_created_at;
ALTER TABLE IF EXISTS ONLY public.worker_pool_metrics DROP CONSTRAINT IF EXISTS worker_pool_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.worker_coordination DROP CONSTRAINT IF EXISTS worker_coordination_pkey;
ALTER TABLE IF EXISTS ONLY public.versioned_configs DROP CONSTRAINT IF EXISTS versioned_configs_type_key_unique;
ALTER TABLE IF EXISTS ONLY public.versioned_configs DROP CONSTRAINT IF EXISTS versioned_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
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
ALTER TABLE IF EXISTS ONLY public.service_dependencies DROP CONSTRAINT IF EXISTS service_dependencies_source_service_target_service_dependen_key;
ALTER TABLE IF EXISTS ONLY public.service_dependencies DROP CONSTRAINT IF EXISTS service_dependencies_pkey;
ALTER TABLE IF EXISTS ONLY public.service_capacity_metrics DROP CONSTRAINT IF EXISTS service_capacity_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.service_architecture_metrics DROP CONSTRAINT IF EXISTS service_architecture_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.security_events DROP CONSTRAINT IF EXISTS security_events_pkey;
ALTER TABLE IF EXISTS ONLY public.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey1;
ALTER TABLE IF EXISTS ONLY public.schema_migrations_old DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.response_time_targets DROP CONSTRAINT IF EXISTS response_time_targets_service_name_endpoint_pattern_campaig_key;
ALTER TABLE IF EXISTS ONLY public.response_time_targets DROP CONSTRAINT IF EXISTS response_time_targets_pkey;
ALTER TABLE IF EXISTS ONLY public.response_time_metrics DROP CONSTRAINT IF EXISTS response_time_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.response_time_history DROP CONSTRAINT IF EXISTS response_time_history_pkey;
ALTER TABLE IF EXISTS ONLY public.response_optimization_recommendations DROP CONSTRAINT IF EXISTS response_optimization_recommendations_pkey;
ALTER TABLE IF EXISTS ONLY public.resource_utilization_metrics DROP CONSTRAINT IF EXISTS resource_utilization_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.resource_optimization_actions DROP CONSTRAINT IF EXISTS resource_optimization_actions_pkey;
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
ALTER TABLE IF EXISTS ONLY public.performance_optimizations DROP CONSTRAINT IF EXISTS performance_optimizations_pkey;
ALTER TABLE IF EXISTS ONLY public.performance_baselines DROP CONSTRAINT IF EXISTS performance_baselines_service_name_campaign_type_optimizati_key;
ALTER TABLE IF EXISTS ONLY public.performance_baselines DROP CONSTRAINT IF EXISTS performance_baselines_pkey;
ALTER TABLE IF EXISTS ONLY public.memory_pools DROP CONSTRAINT IF EXISTS memory_pools_pool_name_key;
ALTER TABLE IF EXISTS ONLY public.memory_pools DROP CONSTRAINT IF EXISTS memory_pools_pkey;
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
ALTER TABLE IF EXISTS ONLY public.event_store DROP CONSTRAINT IF EXISTS event_store_pkey;
ALTER TABLE IF EXISTS ONLY public.event_store DROP CONSTRAINT IF EXISTS event_store_event_id_key;
ALTER TABLE IF EXISTS ONLY public.event_store DROP CONSTRAINT IF EXISTS event_store_aggregate_id_stream_position_key;
ALTER TABLE IF EXISTS ONLY public.event_projections DROP CONSTRAINT IF EXISTS event_projections_projection_name_aggregate_id_key;
ALTER TABLE IF EXISTS ONLY public.event_projections DROP CONSTRAINT IF EXISTS event_projections_pkey;
ALTER TABLE IF EXISTS ONLY public.enum_validation_failures DROP CONSTRAINT IF EXISTS enum_validation_failures_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_params DROP CONSTRAINT IF EXISTS domain_generation_params_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_config_states DROP CONSTRAINT IF EXISTS domain_generation_config_states_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_campaign_params DROP CONSTRAINT IF EXISTS domain_generation_campaign_params_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_batches DROP CONSTRAINT IF EXISTS domain_generation_batches_pkey;
ALTER TABLE IF EXISTS ONLY public.domain_generation_batches DROP CONSTRAINT IF EXISTS domain_generation_batches_campaign_id_batch_number_key;
ALTER TABLE IF EXISTS ONLY public.dns_validation_results DROP CONSTRAINT IF EXISTS dns_validation_results_pkey;
ALTER TABLE IF EXISTS ONLY public.dns_validation_params DROP CONSTRAINT IF EXISTS dns_validation_params_pkey;
ALTER TABLE IF EXISTS ONLY public.database_performance_metrics DROP CONSTRAINT IF EXISTS database_performance_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.connection_pool_metrics DROP CONSTRAINT IF EXISTS connection_pool_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.connection_pool_alerts DROP CONSTRAINT IF EXISTS connection_pool_alerts_pkey;
ALTER TABLE IF EXISTS ONLY public.connection_pool_alerts DROP CONSTRAINT IF EXISTS connection_pool_alerts_alert_type_key;
ALTER TABLE IF EXISTS ONLY public.connection_leak_detection DROP CONSTRAINT IF EXISTS connection_leak_detection_pkey;
ALTER TABLE IF EXISTS ONLY public.config_versions DROP CONSTRAINT IF EXISTS config_versions_pkey;
ALTER TABLE IF EXISTS ONLY public.config_versions DROP CONSTRAINT IF EXISTS config_versions_config_hash_version_key;
ALTER TABLE IF EXISTS ONLY public.config_locks DROP CONSTRAINT IF EXISTS config_locks_pkey;
ALTER TABLE IF EXISTS ONLY public.communication_patterns DROP CONSTRAINT IF EXISTS communication_patterns_source_service_target_service_protoc_key;
ALTER TABLE IF EXISTS ONLY public.communication_patterns DROP CONSTRAINT IF EXISTS communication_patterns_pkey;
ALTER TABLE IF EXISTS ONLY public.campaigns DROP CONSTRAINT IF EXISTS campaigns_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_transitions DROP CONSTRAINT IF EXISTS campaign_state_transitions_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_snapshots DROP CONSTRAINT IF EXISTS campaign_state_snapshots_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_state_events DROP CONSTRAINT IF EXISTS campaign_state_events_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_query_patterns DROP CONSTRAINT IF EXISTS campaign_query_patterns_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_query_patterns DROP CONSTRAINT IF EXISTS campaign_query_patterns_campaign_type_service_name_query_pa_key;
ALTER TABLE IF EXISTS ONLY public.campaign_jobs DROP CONSTRAINT IF EXISTS campaign_jobs_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_access_grants DROP CONSTRAINT IF EXISTS campaign_access_grants_pkey;
ALTER TABLE IF EXISTS ONLY public.campaign_access_grants DROP CONSTRAINT IF EXISTS campaign_access_grants_campaign_id_user_id_access_type_key;
ALTER TABLE IF EXISTS ONLY public.cache_metrics DROP CONSTRAINT IF EXISTS cache_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.cache_invalidations DROP CONSTRAINT IF EXISTS cache_invalidations_pkey;
ALTER TABLE IF EXISTS ONLY public.cache_invalidation_log DROP CONSTRAINT IF EXISTS cache_invalidation_log_pkey;
ALTER TABLE IF EXISTS ONLY public.cache_entries DROP CONSTRAINT IF EXISTS cache_entries_pkey;
ALTER TABLE IF EXISTS ONLY public.cache_entries DROP CONSTRAINT IF EXISTS cache_entries_cache_namespace_cache_key_key;
ALTER TABLE IF EXISTS ONLY public.cache_configurations DROP CONSTRAINT IF EXISTS cache_configurations_pkey;
ALTER TABLE IF EXISTS ONLY public.cache_configurations DROP CONSTRAINT IF EXISTS cache_configurations_cache_name_key;
ALTER TABLE IF EXISTS ONLY public.authorization_decisions DROP CONSTRAINT IF EXISTS authorization_decisions_pkey;
ALTER TABLE IF EXISTS ONLY public.authorization_decisions DROP CONSTRAINT IF EXISTS authorization_decisions_decision_id_key;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.async_task_status DROP CONSTRAINT IF EXISTS async_task_status_task_id_key;
ALTER TABLE IF EXISTS ONLY public.async_task_status DROP CONSTRAINT IF EXISTS async_task_status_pkey;
ALTER TABLE IF EXISTS ONLY public.architecture_refactor_log DROP CONSTRAINT IF EXISTS architecture_refactor_log_pkey;
ALTER TABLE IF EXISTS ONLY public.api_access_violations DROP CONSTRAINT IF EXISTS api_access_violations_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY auth.user_roles DROP CONSTRAINT IF EXISTS user_roles_pkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY auth.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY auth.roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE IF EXISTS ONLY auth.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_pkey;
ALTER TABLE IF EXISTS ONLY auth.rate_limits DROP CONSTRAINT IF EXISTS rate_limits_pkey;
ALTER TABLE IF EXISTS ONLY auth.rate_limits DROP CONSTRAINT IF EXISTS rate_limits_identifier_action_key;
ALTER TABLE IF EXISTS ONLY auth.permissions DROP CONSTRAINT IF EXISTS permissions_resource_action_key;
ALTER TABLE IF EXISTS ONLY auth.permissions DROP CONSTRAINT IF EXISTS permissions_pkey;
ALTER TABLE IF EXISTS ONLY auth.permissions DROP CONSTRAINT IF EXISTS permissions_name_key;
ALTER TABLE IF EXISTS ONLY auth.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.auth_audit_log DROP CONSTRAINT IF EXISTS auth_audit_log_pkey;
ALTER TABLE IF EXISTS public.versioned_configs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.si004_connection_pool_metrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.si004_connection_pool_alerts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.si004_connection_leak_detection ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.service_dependencies ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.service_architecture_metrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.event_store ALTER COLUMN global_position DROP DEFAULT;
ALTER TABLE IF EXISTS public.event_store ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.event_projections ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.communication_patterns ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.campaign_state_events ALTER COLUMN sequence_number DROP DEFAULT;
ALTER TABLE IF EXISTS public.architecture_refactor_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS auth.rate_limits ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS auth.auth_audit_log ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.worker_pool_metrics;
DROP TABLE IF EXISTS public.worker_coordination;
DROP SEQUENCE IF EXISTS public.versioned_configs_id_seq;
DROP TABLE IF EXISTS public.versioned_configs;
DROP VIEW IF EXISTS public.v_enum_documentation;
DROP TABLE IF EXISTS public.users;
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
DROP SEQUENCE IF EXISTS public.service_dependencies_id_seq;
DROP TABLE IF EXISTS public.service_dependencies;
DROP TABLE IF EXISTS public.service_capacity_metrics;
DROP SEQUENCE IF EXISTS public.service_architecture_metrics_id_seq;
DROP TABLE IF EXISTS public.service_architecture_metrics;
DROP TABLE IF EXISTS public.security_events;
DROP TABLE IF EXISTS public.schema_migrations_old;
DROP TABLE IF EXISTS public.schema_migrations;
DROP TABLE IF EXISTS public.response_time_targets;
DROP TABLE IF EXISTS public.response_time_metrics;
DROP TABLE IF EXISTS public.response_time_history;
DROP TABLE IF EXISTS public.response_optimization_recommendations;
DROP VIEW IF EXISTS public.resource_utilization_summary;
DROP TABLE IF EXISTS public.resource_optimization_actions;
DROP TABLE IF EXISTS public.resource_locks;
DROP TABLE IF EXISTS public.query_optimization_recommendations;
DROP TABLE IF EXISTS public.proxy_pools;
DROP TABLE IF EXISTS public.proxy_pool_memberships;
DROP VIEW IF EXISTS public.proxies_camel_view;
DROP TABLE IF EXISTS public.proxies;
DROP VIEW IF EXISTS public.personas_camel_view;
DROP TABLE IF EXISTS public.personas;
DROP TABLE IF EXISTS public.performance_optimizations;
DROP TABLE IF EXISTS public.performance_baselines;
DROP TABLE IF EXISTS public.memory_pools;
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
DROP SEQUENCE IF EXISTS public.event_store_id_seq;
DROP SEQUENCE IF EXISTS public.event_store_global_position_seq;
DROP TABLE IF EXISTS public.event_store;
DROP SEQUENCE IF EXISTS public.event_projections_id_seq;
DROP TABLE IF EXISTS public.event_projections;
DROP TABLE IF EXISTS public.enum_validation_failures;
DROP TABLE IF EXISTS public.domain_generation_params;
DROP TABLE IF EXISTS public.domain_generation_config_states;
DROP TABLE IF EXISTS public.domain_generation_campaign_params;
DROP TABLE IF EXISTS public.domain_generation_batches;
DROP TABLE IF EXISTS public.dns_validation_results;
DROP TABLE IF EXISTS public.dns_validation_params;
DROP TABLE IF EXISTS public.database_performance_metrics;
DROP TABLE IF EXISTS public.connection_pool_metrics;
DROP TABLE IF EXISTS public.connection_pool_alerts;
DROP TABLE IF EXISTS public.connection_leak_detection;
DROP TABLE IF EXISTS public.config_versions;
DROP TABLE IF EXISTS public.config_locks;
DROP SEQUENCE IF EXISTS public.communication_patterns_id_seq;
DROP TABLE IF EXISTS public.communication_patterns;
DROP VIEW IF EXISTS public.campaigns_camel_view;
DROP TABLE IF EXISTS public.campaigns;
DROP TABLE IF EXISTS public.campaign_state_transitions;
DROP TABLE IF EXISTS public.campaign_state_snapshots;
DROP SEQUENCE IF EXISTS public.campaign_state_events_sequence_number_seq;
DROP TABLE IF EXISTS public.campaign_state_events;
DROP VIEW IF EXISTS public.campaign_resource_usage;
DROP TABLE IF EXISTS public.resource_utilization_metrics;
DROP VIEW IF EXISTS public.campaign_query_performance_summary;
DROP TABLE IF EXISTS public.query_performance_metrics;
DROP TABLE IF EXISTS public.campaign_query_patterns;
DROP TABLE IF EXISTS public.campaign_jobs;
DROP VIEW IF EXISTS public.campaign_cache_efficiency;
DROP TABLE IF EXISTS public.campaign_access_grants;
DROP VIEW IF EXISTS public.cache_performance_summary;
DROP TABLE IF EXISTS public.cache_metrics;
DROP TABLE IF EXISTS public.cache_invalidations;
DROP TABLE IF EXISTS public.cache_invalidation_log;
DROP TABLE IF EXISTS public.cache_entries;
DROP TABLE IF EXISTS public.cache_configurations;
DROP TABLE IF EXISTS public.authorization_decisions;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.async_task_status;
DROP SEQUENCE IF EXISTS public.architecture_refactor_log_id_seq;
DROP TABLE IF EXISTS public.architecture_refactor_log;
DROP TABLE IF EXISTS public.api_access_violations;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.user_roles;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.roles;
DROP TABLE IF EXISTS auth.role_permissions;
DROP SEQUENCE IF EXISTS auth.rate_limits_id_seq;
DROP TABLE IF EXISTS auth.rate_limits;
DROP TABLE IF EXISTS auth.permissions;
DROP TABLE IF EXISTS auth.password_reset_tokens;
DROP SEQUENCE IF EXISTS auth.auth_audit_log_id_seq;
DROP TABLE IF EXISTS auth.auth_audit_log;
DROP FUNCTION IF EXISTS public.validate_input_field(p_endpoint_pattern character varying, p_http_method character varying, p_field_name character varying, p_field_value text, p_user_id uuid, p_session_id character varying);
DROP FUNCTION IF EXISTS public.validate_input_field(p_endpoint_pattern text, p_http_method text, p_field_name text, p_field_value text);
DROP FUNCTION IF EXISTS public.validate_enum_value(enum_type text, value text);
DROP FUNCTION IF EXISTS public.validate_config_consistency(p_config_type character varying, p_config_key character varying);
DROP FUNCTION IF EXISTS public.validate_column_naming();
DROP FUNCTION IF EXISTS public.validate_campaign_status();
DROP FUNCTION IF EXISTS public.validate_all_enums();
DROP FUNCTION IF EXISTS public.update_versioned_config_atomic(p_config_type character varying, p_config_key character varying, p_config_value jsonb, p_expected_version bigint, p_checksum character varying, p_updated_by character varying, p_metadata jsonb);
DROP FUNCTION IF EXISTS public.update_task_progress(p_task_id character varying, p_status character varying, p_progress_percentage numeric, p_processed_items integer, p_error_message text);
DROP FUNCTION IF EXISTS public.update_state_event_processing_status();
DROP FUNCTION IF EXISTS public.update_proxy_pools_updated_at();
DROP FUNCTION IF EXISTS public.update_proxies_updated_at();
DROP FUNCTION IF EXISTS public.update_keyword_rules_updated_at();
DROP FUNCTION IF EXISTS public.trigger_set_timestamp();
DROP FUNCTION IF EXISTS public.track_memory_allocation(p_service_name text, p_component text, p_size_bytes bigint, p_allocation_context jsonb);
DROP FUNCTION IF EXISTS public.sync_domain_config_to_versioned();
DROP FUNCTION IF EXISTS public.release_state_lock(p_entity_id uuid, p_lock_token uuid);
DROP FUNCTION IF EXISTS public.release_state_lock(p_lock_key character varying);
DROP FUNCTION IF EXISTS public.release_config_lock(p_lock_id uuid, p_owner text);
DROP FUNCTION IF EXISTS public.record_response_time(p_endpoint character varying, p_method character varying, p_response_time_ms numeric, p_payload_size integer, p_user_id uuid, p_campaign_id uuid, p_status_code integer);
DROP FUNCTION IF EXISTS public.record_response_time(p_service_name text, p_endpoint_path text, p_campaign_id uuid, p_response_time_ms numeric, p_metadata jsonb);
DROP FUNCTION IF EXISTS public.record_resource_utilization(p_service_name text, p_resource_type text, p_current_usage numeric, p_max_capacity numeric, p_utilization_pct numeric, p_bottleneck_detected boolean);
DROP FUNCTION IF EXISTS public.record_query_performance(p_query_sql text, p_query_type character varying, p_execution_time_ms numeric, p_rows_examined bigint, p_rows_returned bigint, p_query_plan jsonb);
DROP FUNCTION IF EXISTS public.record_memory_metrics(p_service_name character varying, p_process_id character varying, p_heap_size_bytes bigint, p_heap_used_bytes bigint, p_gc_count bigint, p_gc_duration_ms bigint, p_goroutines_count integer, p_stack_size_bytes bigint);
DROP FUNCTION IF EXISTS public.record_connection_pool_metrics(p_pool_name character varying, p_active_connections integer, p_idle_connections integer, p_max_connections integer, p_wait_count integer, p_wait_duration_ms integer, p_connection_errors integer);
DROP FUNCTION IF EXISTS public.record_cache_operation(p_service_name text, p_cache_namespace text, p_operation_type text, p_cache_hit boolean, p_execution_time_ms numeric, p_cache_size_bytes integer);
DROP FUNCTION IF EXISTS public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[], p_context jsonb, p_request_context jsonb, p_risk_score integer);
DROP FUNCTION IF EXISTS public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[], p_context jsonb, p_request_context jsonb);
DROP FUNCTION IF EXISTS public.invalidate_cache_by_pattern(p_pattern text);
DROP FUNCTION IF EXISTS public.get_versioned_config_with_lock(p_config_type character varying, p_config_key character varying, p_for_update boolean);
DROP FUNCTION IF EXISTS public.get_response_time_analytics(p_endpoint_filter character varying, p_hours_back integer);
DROP FUNCTION IF EXISTS public.get_memory_pool_status(p_pool_name text);
DROP FUNCTION IF EXISTS public.get_latest_campaign_state_snapshot(p_campaign_id uuid);
DROP FUNCTION IF EXISTS public.get_domain_config_state_with_lock(p_config_hash text, p_lock_type text);
DROP FUNCTION IF EXISTS public.get_config_history(p_config_type character varying, p_config_key character varying, p_limit integer);
DROP FUNCTION IF EXISTS public.get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint, p_to_sequence bigint, p_limit integer);
DROP FUNCTION IF EXISTS public.get_architecture_health_score();
DROP FUNCTION IF EXISTS public.generate_user_agent_hash(user_agent_text text);
DROP FUNCTION IF EXISTS public.fn_validate_numeric_safety();
DROP FUNCTION IF EXISTS public.detect_memory_leaks(p_service_name text, p_time_window interval);
DROP FUNCTION IF EXISTS public.detect_memory_leak(p_service_name character varying, p_operation_id character varying, p_leaked_bytes bigint, p_leak_source character varying, p_stack_trace text);
DROP FUNCTION IF EXISTS public.create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb);
DROP FUNCTION IF EXISTS public.create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text, p_target_state text, p_reason text, p_triggered_by text, p_event_data jsonb, p_operation_context jsonb, p_correlation_id uuid);
DROP FUNCTION IF EXISTS public.cleanup_expired_memory_metrics();
DROP FUNCTION IF EXISTS public.cleanup_expired_config_locks();
DROP FUNCTION IF EXISTS public.cleanup_expired_cache_entries();
DROP FUNCTION IF EXISTS public.check_query_optimization_needed(p_query_hash character varying, p_execution_time_ms numeric, p_optimization_score numeric);
DROP FUNCTION IF EXISTS public.check_memory_optimization_opportunities(p_service_name character varying, p_utilization_pct numeric, p_heap_used_bytes bigint);
DROP FUNCTION IF EXISTS public.check_endpoint_authorization(p_endpoint_pattern character varying, p_http_method character varying, p_user_permissions text[], p_user_role character varying, p_is_resource_owner boolean, p_has_campaign_access boolean);
DROP FUNCTION IF EXISTS public.check_connection_pool_alerts(p_pool_name character varying, p_utilization_pct integer, p_wait_duration_ms integer, p_connection_errors integer);
DROP FUNCTION IF EXISTS public.calculate_efficiency_score(p_cpu_util numeric, p_memory_util numeric, p_active_workers integer, p_max_workers integer);
DROP FUNCTION IF EXISTS public.atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb);
DROP FUNCTION IF EXISTS public.assign_domain_batch(p_campaign_id uuid, p_worker_id character varying, p_batch_size integer);
DROP FUNCTION IF EXISTS public.analyze_index_usage();
DROP FUNCTION IF EXISTS public.acquire_state_lock(p_entity_id uuid, p_entity_type character varying, p_lock_holder character varying, p_lock_duration_seconds integer);
DROP FUNCTION IF EXISTS public.acquire_state_lock(p_lock_key character varying, p_locked_by character varying, p_timeout_seconds integer);
DROP FUNCTION IF EXISTS public.acquire_resource_lock(p_resource_type character varying, p_resource_id character varying, p_lock_holder character varying, p_lock_mode character varying, p_timeout_seconds integer);
DROP FUNCTION IF EXISTS public.acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone);
DROP FUNCTION IF EXISTS auth.validate_session_security(p_session_id character varying, p_client_ip inet, p_user_agent text, p_require_ip_match boolean, p_require_ua_match boolean);
DROP FUNCTION IF EXISTS auth.update_session_fingerprint();
DROP FUNCTION IF EXISTS auth.cleanup_expired_sessions();
DROP TYPE IF EXISTS public.validation_status_enum;
DROP TYPE IF EXISTS public.proxy_protocol_enum;
DROP TYPE IF EXISTS public.persona_type_enum;
DROP TYPE IF EXISTS public.keyword_rule_type_enum;
DROP TYPE IF EXISTS public.http_validation_status_enum;
DROP TYPE IF EXISTS public.dns_validation_status_enum;
DROP TYPE IF EXISTS public.campaign_type_enum;
DROP TYPE IF EXISTS public.campaign_status_enum;
DROP TYPE IF EXISTS public.campaign_job_status_enum;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
-- *not* dropping schema, since initdb creates it
DROP SCHEMA IF EXISTS consolidation;
DROP SCHEMA IF EXISTS auth;
--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: domainflow
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO domainflow;

--
-- Name: consolidation; Type: SCHEMA; Schema: -; Owner: domainflow
--

CREATE SCHEMA consolidation;


ALTER SCHEMA consolidation OWNER TO domainflow;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: domainflow
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO domainflow;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: domainflow
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: campaign_job_status_enum; Type: TYPE; Schema: public; Owner: domainflow
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


ALTER TYPE public.campaign_job_status_enum OWNER TO domainflow;

--
-- Name: TYPE campaign_job_status_enum; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TYPE public.campaign_job_status_enum IS 'Maps to Go CampaignJobStatusEnum';


--
-- Name: campaign_status_enum; Type: TYPE; Schema: public; Owner: domainflow
--

CREATE TYPE public.campaign_status_enum AS ENUM (
    'pending',
    'queued',
    'running',
    'pausing',
    'paused',
    'completed',
    'failed',
    'cancelled',
    'archived'
);


ALTER TYPE public.campaign_status_enum OWNER TO domainflow;

--
-- Name: TYPE campaign_status_enum; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TYPE public.campaign_status_enum IS 'Maps to Go CampaignStatusEnum - includes archived status';


--
-- Name: campaign_type_enum; Type: TYPE; Schema: public; Owner: domainflow
--

CREATE TYPE public.campaign_type_enum AS ENUM (
    'domain_generation',
    'dns_validation',
    'http_keyword_validation'
);


ALTER TYPE public.campaign_type_enum OWNER TO domainflow;

--
-- Name: TYPE campaign_type_enum; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TYPE public.campaign_type_enum IS 'Maps to Go CampaignTypeEnum';


--
-- Name: dns_validation_status_enum; Type: TYPE; Schema: public; Owner: domainflow
--

CREATE TYPE public.dns_validation_status_enum AS ENUM (
    'resolved',
    'unresolved',
    'timeout',
    'error'
);


ALTER TYPE public.dns_validation_status_enum OWNER TO domainflow;

--
-- Name: TYPE dns_validation_status_enum; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TYPE public.dns_validation_status_enum IS 'Maps to Go DNSValidationStatusEnum';


--
-- Name: http_validation_status_enum; Type: TYPE; Schema: public; Owner: domainflow
--

CREATE TYPE public.http_validation_status_enum AS ENUM (
    'success',
    'failed',
    'timeout',
    'error'
);


ALTER TYPE public.http_validation_status_enum OWNER TO domainflow;

--
-- Name: TYPE http_validation_status_enum; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TYPE public.http_validation_status_enum IS 'Maps to Go HTTPValidationStatusEnum';


--
-- Name: keyword_rule_type_enum; Type: TYPE; Schema: public; Owner: domainflow
--

CREATE TYPE public.keyword_rule_type_enum AS ENUM (
    'string',
    'regex'
);


ALTER TYPE public.keyword_rule_type_enum OWNER TO domainflow;

--
-- Name: TYPE keyword_rule_type_enum; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TYPE public.keyword_rule_type_enum IS 'Maps to Go KeywordRuleTypeEnum';


--
-- Name: persona_type_enum; Type: TYPE; Schema: public; Owner: domainflow
--

CREATE TYPE public.persona_type_enum AS ENUM (
    'dns',
    'http'
);


ALTER TYPE public.persona_type_enum OWNER TO domainflow;

--
-- Name: TYPE persona_type_enum; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TYPE public.persona_type_enum IS 'Maps to Go PersonaTypeEnum';


--
-- Name: proxy_protocol_enum; Type: TYPE; Schema: public; Owner: domainflow
--

CREATE TYPE public.proxy_protocol_enum AS ENUM (
    'http',
    'https',
    'socks5',
    'socks4'
);


ALTER TYPE public.proxy_protocol_enum OWNER TO domainflow;

--
-- Name: TYPE proxy_protocol_enum; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TYPE public.proxy_protocol_enum IS 'Maps to Go ProxyProtocolEnum';


--
-- Name: validation_status_enum; Type: TYPE; Schema: public; Owner: domainflow
--

CREATE TYPE public.validation_status_enum AS ENUM (
    'pending',
    'valid',
    'invalid',
    'error',
    'skipped'
);


ALTER TYPE public.validation_status_enum OWNER TO domainflow;

--
-- Name: TYPE validation_status_enum; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TYPE public.validation_status_enum IS 'Maps to Go ValidationStatusEnum';


--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: auth; Owner: domainflow
--

CREATE FUNCTION auth.cleanup_expired_sessions() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired sessions
    WITH deleted AS (
        DELETE FROM auth.sessions
        WHERE expires_at < NOW()
        OR (is_active = FALSE AND last_activity_at < (NOW() - INTERVAL '7 days'))
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log cleanup operation
    INSERT INTO auth.auth_audit_log (event_type, event_status, details)
    VALUES ('session_cleanup', 'success',
            jsonb_build_object('deleted_sessions', deleted_count, 'cleanup_time', NOW()));
    
    RETURN deleted_count;
   END;
   $$;


ALTER FUNCTION auth.cleanup_expired_sessions() OWNER TO domainflow;

--
-- Name: FUNCTION cleanup_expired_sessions(); Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON FUNCTION auth.cleanup_expired_sessions() IS 'Removes expired and inactive sessions from the database';


--
-- Name: update_session_fingerprint(); Type: FUNCTION; Schema: auth; Owner: domainflow
--

CREATE FUNCTION auth.update_session_fingerprint() RETURNS trigger
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    -- Generate session fingerprint from IP and user agent
    IF NEW.ip_address IS NOT NULL AND NEW.user_agent IS NOT NULL THEN
        NEW.session_fingerprint := encode(
            digest(
                COALESCE(host(NEW.ip_address), '') || '|' ||
                COALESCE(NEW.user_agent, '') || '|' ||
                COALESCE(NEW.screen_resolution, ''),
                'sha256'
            ),
            'hex'
        );
    END IF;
    
    -- Generate user agent hash
    IF NEW.user_agent IS NOT NULL THEN
        NEW.user_agent_hash := generate_user_agent_hash(NEW.user_agent);
    END IF;
    
    -- Generate browser fingerprint (simplified version)
    IF NEW.user_agent IS NOT NULL THEN
    	NEW.browser_fingerprint := encode(
    		digest(
    			COALESCE(NEW.user_agent, '') || '|' ||
    			COALESCE(NEW.screen_resolution, ''),
    			'sha256'
    		),
    		'hex'
    	);
    END IF;
    
    RETURN NEW;
      END;
      $$;


ALTER FUNCTION auth.update_session_fingerprint() OWNER TO domainflow;

--
-- Name: validate_session_security(character varying, inet, text, boolean, boolean); Type: FUNCTION; Schema: auth; Owner: domainflow
--

CREATE FUNCTION auth.validate_session_security(p_session_id character varying, p_client_ip inet, p_user_agent text, p_require_ip_match boolean DEFAULT false, p_require_ua_match boolean DEFAULT false) RETURNS TABLE(is_valid boolean, user_id uuid, security_flags jsonb, permissions text[], roles text[])
    LANGUAGE plpgsql
    AS $$
DECLARE
    session_record RECORD;
    current_fingerprint VARCHAR(255);
    security_issues JSONB := '{}'::jsonb;
BEGIN
    -- Get session record with user permissions and roles
    SELECT s.*, array_agg(DISTINCT p.name) as user_permissions, array_agg(DISTINCT r.name) as user_roles
    INTO session_record
    FROM auth.sessions s
    JOIN auth.users u ON s.user_id = u.id
    LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
    LEFT JOIN auth.roles r ON ur.role_id = r.id
    LEFT JOIN auth.role_permissions rp ON r.id = rp.role_id
    LEFT JOIN auth.permissions p ON rp.permission_id = p.id
    WHERE s.id = p_session_id
    AND s.is_active = TRUE
    AND s.expires_at > NOW()
    AND u.is_active = TRUE
    AND u.is_locked = FALSE
    GROUP BY s.id, s.user_id, s.ip_address, s.user_agent, s.session_fingerprint,
             s.browser_fingerprint, s.user_agent_hash, s.is_active, s.expires_at,
             s.last_activity_at, s.created_at, s.screen_resolution;
    
    -- Check if session exists and is valid
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, '{"error": "session_not_found"}'::jsonb, NULL::TEXT[], NULL::TEXT[];
        RETURN;
    END IF;
    
    -- Generate current fingerprint for comparison
    IF p_client_ip IS NOT NULL AND p_user_agent IS NOT NULL THEN
        current_fingerprint := encode(
            digest(
                COALESCE(host(p_client_ip), '') || '|' ||
                COALESCE(p_user_agent, ''),
                'sha256'
            ),
            'hex'
        );
    END IF;
    
    -- Security validations
    IF p_require_ip_match AND session_record.ip_address != p_client_ip THEN
        security_issues := security_issues || '{"ip_mismatch": true}'::jsonb;
    END IF;
    
    IF p_require_ua_match AND session_record.user_agent_hash != generate_user_agent_hash(p_user_agent) THEN
        security_issues := security_issues || '{"user_agent_mismatch": true}'::jsonb;
    END IF;
    
    -- Check for session fingerprint changes
    IF session_record.session_fingerprint IS NOT NULL AND current_fingerprint IS NOT NULL
       AND session_record.session_fingerprint != current_fingerprint THEN
        security_issues := security_issues || '{"fingerprint_mismatch": true}'::jsonb;
    END IF;
    
    -- Check for idle timeout (30 minutes default)
    IF session_record.last_activity_at < (NOW() - INTERVAL '30 minutes') THEN
        security_issues := security_issues || '{"idle_timeout": true}'::jsonb;
    END IF;
    
    -- Return validation result
    IF jsonb_object_keys(security_issues) IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, session_record.user_id, security_issues, NULL::TEXT[], NULL::TEXT[];
    ELSE
        RETURN QUERY SELECT TRUE, session_record.user_id, '{}'::jsonb,
                           session_record.user_permissions, session_record.user_roles;
    END IF;
    
    -- Update last activity
    UPDATE auth.sessions
    SET last_activity_at = NOW()
    WHERE id = p_session_id;
   END;
   $$;


ALTER FUNCTION auth.validate_session_security(p_session_id character varying, p_client_ip inet, p_user_agent text, p_require_ip_match boolean, p_require_ua_match boolean) OWNER TO domainflow;

--
-- Name: FUNCTION validate_session_security(p_session_id character varying, p_client_ip inet, p_user_agent text, p_require_ip_match boolean, p_require_ua_match boolean); Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON FUNCTION auth.validate_session_security(p_session_id character varying, p_client_ip inet, p_user_agent text, p_require_ip_match boolean, p_require_ua_match boolean) IS 'Validates session security with optional IP and user agent matching';


--
-- Name: acquire_config_lock(text, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone) OWNER TO domainflow;

--
-- Name: FUNCTION acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.acquire_config_lock(p_config_hash text, p_lock_type text, p_owner text, p_lock_reason text, p_expires_at timestamp with time zone) IS 'Atomically acquires a distributed lock on configuration with conflict detection';


--
-- Name: acquire_resource_lock(character varying, character varying, character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.acquire_resource_lock(p_resource_type character varying, p_resource_id character varying, p_lock_holder character varying, p_lock_mode character varying, p_timeout_seconds integer) OWNER TO domainflow;

--
-- Name: acquire_state_lock(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.acquire_state_lock(p_lock_key character varying, p_locked_by character varying, p_timeout_seconds integer) OWNER TO domainflow;

--
-- Name: acquire_state_lock(uuid, character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.acquire_state_lock(p_entity_id uuid, p_entity_type character varying, p_lock_holder character varying, p_lock_duration_seconds integer) OWNER TO domainflow;

--
-- Name: analyze_index_usage(); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.analyze_index_usage() OWNER TO domainflow;

--
-- Name: assign_domain_batch(uuid, character varying, integer); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.assign_domain_batch(p_campaign_id uuid, p_worker_id character varying, p_batch_size integer) OWNER TO domainflow;

--
-- Name: atomic_update_domain_config_state(text, bigint, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb) OWNER TO domainflow;

--
-- Name: FUNCTION atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.atomic_update_domain_config_state(p_config_hash text, p_expected_version bigint, p_new_last_offset bigint, p_config_details jsonb) IS 'Atomically updates domain generation config state with optimistic locking and race condition protection';


--
-- Name: calculate_efficiency_score(numeric, numeric, integer, integer); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.calculate_efficiency_score(p_cpu_util numeric, p_memory_util numeric, p_active_workers integer, p_max_workers integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    cpu_score DECIMAL;
    memory_score DECIMAL;
    worker_score DECIMAL;
    overall_score DECIMAL;
BEGIN
    -- CPU efficiency (optimal range 60-80%)
    cpu_score := CASE
        WHEN p_cpu_util <= 50 THEN 60 + (p_cpu_util * 0.8)
        WHEN p_cpu_util <= 80 THEN 90 + (p_cpu_util - 50) * 0.33
        WHEN p_cpu_util <= 95 THEN 80 - (p_cpu_util - 80) * 2
        ELSE 20
    END;
    
    -- Memory efficiency (optimal range 50-75%)
    memory_score := CASE
        WHEN p_memory_util <= 40 THEN 50 + (p_memory_util * 1.25)
        WHEN p_memory_util <= 75 THEN 90 + (p_memory_util - 40) * 0.29
        WHEN p_memory_util <= 90 THEN 80 - (p_memory_util - 75) * 2
        ELSE 10
    END;
    
    -- Worker utilization efficiency
    worker_score := CASE
        WHEN p_max_workers = 0 THEN 100
        WHEN (p_active_workers::DECIMAL / p_max_workers::DECIMAL) <= 0.5 THEN 60
        WHEN (p_active_workers::DECIMAL / p_max_workers::DECIMAL) <= 0.8 THEN 100
        ELSE 80
    END;
    
    -- Weighted average (CPU: 40%, Memory: 40%, Workers: 20%)
    overall_score := (cpu_score * 0.4) + (memory_score * 0.4) + (worker_score * 0.2);
    
    RETURN ROUND(overall_score, 2);
END;
$$;


ALTER FUNCTION public.calculate_efficiency_score(p_cpu_util numeric, p_memory_util numeric, p_active_workers integer, p_max_workers integer) OWNER TO domainflow;

--
-- Name: check_connection_pool_alerts(character varying, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.check_connection_pool_alerts(p_pool_name character varying, p_utilization_pct integer, p_wait_duration_ms integer, p_connection_errors integer) OWNER TO domainflow;

--
-- Name: check_endpoint_authorization(character varying, character varying, text[], character varying, boolean, boolean); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.check_endpoint_authorization(p_endpoint_pattern character varying, p_http_method character varying, p_user_permissions text[], p_user_role character varying, p_is_resource_owner boolean, p_has_campaign_access boolean) OWNER TO domainflow;

--
-- Name: check_memory_optimization_opportunities(character varying, numeric, bigint); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.check_memory_optimization_opportunities(p_service_name character varying, p_utilization_pct numeric, p_heap_used_bytes bigint) OWNER TO domainflow;

--
-- Name: check_query_optimization_needed(character varying, numeric, numeric); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.check_query_optimization_needed(p_query_hash character varying, p_execution_time_ms numeric, p_optimization_score numeric) OWNER TO domainflow;

--
-- Name: cleanup_expired_cache_entries(); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.cleanup_expired_cache_entries() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired entries
    DELETE FROM cache_entries 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old cache metrics (keep 30 days)
    DELETE FROM cache_metrics 
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old invalidation logs (keep 7 days)
    DELETE FROM cache_invalidation_log 
    WHERE executed_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_expired_cache_entries() OWNER TO domainflow;

--
-- Name: cleanup_expired_config_locks(); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.cleanup_expired_config_locks() OWNER TO domainflow;

--
-- Name: FUNCTION cleanup_expired_config_locks(); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.cleanup_expired_config_locks() IS 'Cleans up expired configuration locks';


--
-- Name: cleanup_expired_memory_metrics(); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.cleanup_expired_memory_metrics() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete memory metrics older than 30 days
    DELETE FROM memory_metrics 
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete completed allocations older than 7 days
    DELETE FROM memory_allocations 
    WHERE deallocated_at IS NOT NULL 
    AND deallocated_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_expired_memory_metrics() OWNER TO domainflow;

--
-- Name: create_campaign_state_event(uuid, text, text, text, text, text, jsonb, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text, p_target_state text, p_reason text, p_triggered_by text, p_event_data jsonb, p_operation_context jsonb, p_correlation_id uuid) OWNER TO domainflow;

--
-- Name: FUNCTION create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text, p_target_state text, p_reason text, p_triggered_by text, p_event_data jsonb, p_operation_context jsonb, p_correlation_id uuid); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.create_campaign_state_event(p_campaign_id uuid, p_event_type text, p_source_state text, p_target_state text, p_reason text, p_triggered_by text, p_event_data jsonb, p_operation_context jsonb, p_correlation_id uuid) IS 'Creates a new state event with automatic sequence numbering and validation';


--
-- Name: create_campaign_state_snapshot(uuid, text, jsonb, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb) OWNER TO domainflow;

--
-- Name: FUNCTION create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.create_campaign_state_snapshot(p_campaign_id uuid, p_current_state text, p_state_data jsonb, p_last_event_sequence bigint, p_snapshot_metadata jsonb) IS 'Creates a new state snapshot with integrity checksum';


--
-- Name: detect_memory_leak(character varying, character varying, bigint, character varying, text); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.detect_memory_leak(p_service_name character varying, p_operation_id character varying, p_leaked_bytes bigint, p_leak_source character varying, p_stack_trace text) OWNER TO domainflow;

--
-- Name: detect_memory_leaks(text, interval); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.detect_memory_leaks(p_service_name text DEFAULT NULL::text, p_time_window interval DEFAULT '01:00:00'::interval) RETURNS TABLE(service_name text, component text, leak_severity text, active_allocations bigint, total_size_bytes bigint, avg_lifetime interval)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ma.service_name::TEXT,
        ma.component::TEXT,
        CASE 
            WHEN COUNT(*) > 1000 AND AVG(ma.size_bytes) > 1024*1024 THEN 'HIGH'
            WHEN COUNT(*) > 500 OR AVG(ma.size_bytes) > 512*1024 THEN 'MEDIUM'
            ELSE 'LOW'
        END as leak_severity,
        COUNT(*)::BIGINT as active_allocations,
        SUM(ma.size_bytes)::BIGINT as total_size_bytes,
        AVG(NOW() - ma.allocated_at) as avg_lifetime
    FROM memory_allocations ma
    WHERE ma.is_active = true
    AND ma.allocated_at >= NOW() - p_time_window
    AND (p_service_name IS NULL OR ma.service_name = p_service_name)
    GROUP BY ma.service_name, ma.component
    HAVING COUNT(*) > 100  -- Only report significant allocations
    ORDER BY COUNT(*) DESC, SUM(ma.size_bytes) DESC;
END;
$$;


ALTER FUNCTION public.detect_memory_leaks(p_service_name text, p_time_window interval) OWNER TO domainflow;

--
-- Name: fn_validate_numeric_safety(); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.fn_validate_numeric_safety() OWNER TO domainflow;

--
-- Name: generate_user_agent_hash(text); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.generate_user_agent_hash(user_agent_text text) RETURNS character varying
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    -- Generate SHA-256 hash of user agent for faster comparison
    RETURN encode(digest(user_agent_text, 'sha256'), 'hex');
END;
$$;


ALTER FUNCTION public.generate_user_agent_hash(user_agent_text text) OWNER TO domainflow;

--
-- Name: FUNCTION generate_user_agent_hash(user_agent_text text); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.generate_user_agent_hash(user_agent_text text) IS 'Generates SHA-256 hash of user agent string';


--
-- Name: get_architecture_health_score(); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.get_architecture_health_score() RETURNS TABLE(overall_score numeric, coupling_issues integer, reliability_issues integer, refactor_recommendations text[])
    LANGUAGE plpgsql
    AS $$
DECLARE
    avg_coupling DECIMAL(5,2);
    low_reliability_count INTEGER;
    recommendations TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT AVG(coupling_score) INTO avg_coupling
    FROM service_architecture_metrics;

    SELECT COUNT(*) INTO low_reliability_count
    FROM service_dependencies
    WHERE reliability_score < 95.0;

    IF avg_coupling > 70.0 THEN
        recommendations := array_append(recommendations, 'HIGH_COUPLING_DETECTED');
    END IF;

    IF low_reliability_count > 5 THEN
        recommendations := array_append(recommendations, 'RELIABILITY_IMPROVEMENTS_NEEDED');
    END IF;

    RETURN QUERY SELECT
        CASE
            WHEN avg_coupling < 30.0 AND low_reliability_count < 3 THEN 95.0
            WHEN avg_coupling < 50.0 AND low_reliability_count < 5 THEN 80.0
            WHEN avg_coupling < 70.0 AND low_reliability_count < 8 THEN 65.0
            ELSE 40.0
        END,
        (SELECT COUNT(*)::INTEGER FROM service_architecture_metrics WHERE coupling_score > 70.0),
        low_reliability_count,
        recommendations;
END;
$$;


ALTER FUNCTION public.get_architecture_health_score() OWNER TO domainflow;

--
-- Name: get_campaign_state_events_for_replay(uuid, bigint, bigint, integer); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint, p_to_sequence bigint, p_limit integer) OWNER TO domainflow;

--
-- Name: FUNCTION get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint, p_to_sequence bigint, p_limit integer); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.get_campaign_state_events_for_replay(p_campaign_id uuid, p_from_sequence bigint, p_to_sequence bigint, p_limit integer) IS 'Retrieves state events for campaign state replay in sequence order';


--
-- Name: get_config_history(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.get_config_history(p_config_type character varying, p_config_key character varying, p_limit integer) OWNER TO domainflow;

--
-- Name: get_domain_config_state_with_lock(text, text); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.get_domain_config_state_with_lock(p_config_hash text, p_lock_type text) OWNER TO domainflow;

--
-- Name: FUNCTION get_domain_config_state_with_lock(p_config_hash text, p_lock_type text); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.get_domain_config_state_with_lock(p_config_hash text, p_lock_type text) IS 'Retrieves domain generation config state with optional row-level locking';


--
-- Name: get_latest_campaign_state_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.get_latest_campaign_state_snapshot(p_campaign_id uuid) OWNER TO domainflow;

--
-- Name: FUNCTION get_latest_campaign_state_snapshot(p_campaign_id uuid); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.get_latest_campaign_state_snapshot(p_campaign_id uuid) IS 'Gets the most recent valid state snapshot for a campaign';


--
-- Name: get_memory_pool_status(text); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.get_memory_pool_status(p_pool_name text) RETURNS TABLE(pool_name text, current_size integer, max_size integer, utilization_pct numeric, hit_rate numeric, efficiency_score numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.pool_name::TEXT,
        mp.current_size,
        mp.max_size,
        ROUND((mp.current_size::DECIMAL / mp.max_size::DECIMAL) * 100, 2) as utilization_pct,
        mp.hit_rate,
        mp.efficiency_score
    FROM memory_pools mp
    WHERE mp.pool_name = p_pool_name;
END;
$$;


ALTER FUNCTION public.get_memory_pool_status(p_pool_name text) OWNER TO domainflow;

--
-- Name: get_response_time_analytics(character varying, integer); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.get_response_time_analytics(p_endpoint_filter character varying DEFAULT NULL::character varying, p_hours_back integer DEFAULT 24) RETURNS TABLE(endpoint_path character varying, http_method character varying, avg_response_ms numeric, p95_response_ms numeric, total_requests bigint, slow_requests bigint, error_rate numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rtm.endpoint_path,
        rtm.http_method,
        AVG(rtm.response_time_ms) as avg_response_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY rtm.response_time_ms) as p95_response_ms,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE rtm.response_time_ms > 1000) as slow_requests,
        (COUNT(*) FILTER (WHERE rtm.status_code >= 400)::DECIMAL / COUNT(*) * 100) as error_rate
    FROM response_time_metrics rtm
    WHERE rtm.recorded_at > NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_endpoint_filter IS NULL OR rtm.endpoint_path ILIKE '%' || p_endpoint_filter || '%')
    GROUP BY rtm.endpoint_path, rtm.http_method
    ORDER BY avg_response_ms DESC;
END;
$$;


ALTER FUNCTION public.get_response_time_analytics(p_endpoint_filter character varying, p_hours_back integer) OWNER TO domainflow;

--
-- Name: get_versioned_config_with_lock(character varying, character varying, boolean); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.get_versioned_config_with_lock(p_config_type character varying, p_config_key character varying, p_for_update boolean) OWNER TO domainflow;

--
-- Name: invalidate_cache_by_pattern(text); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.invalidate_cache_by_pattern(p_pattern text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Delete matching cache entries
    DELETE FROM cache_entries 
    WHERE cache_key LIKE p_pattern;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    -- Log the invalidation
    INSERT INTO cache_invalidation_log (
        service_name, cache_namespace, invalidation_pattern,
        invalidation_reason, affected_keys_count
    ) VALUES (
        'system', 'pattern_invalidation', p_pattern,
        'manual_pattern_invalidation', affected_count
    );
    
    RETURN affected_count;
END;
$$;


ALTER FUNCTION public.invalidate_cache_by_pattern(p_pattern text) OWNER TO domainflow;

--
-- Name: log_authorization_decision(uuid, character varying, character varying, character varying, character varying, text[], jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[], p_context jsonb, p_request_context jsonb) OWNER TO domainflow;

--
-- Name: log_authorization_decision(uuid, character varying, character varying, character varying, character varying, text[], jsonb, jsonb, integer); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.log_authorization_decision(p_user_id uuid, p_resource_type character varying, p_resource_id character varying, p_action character varying, p_decision character varying, p_policies text[], p_context jsonb, p_request_context jsonb, p_risk_score integer) OWNER TO domainflow;

--
-- Name: record_cache_operation(text, text, text, boolean, numeric, integer); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.record_cache_operation(p_service_name text, p_cache_namespace text, p_operation_type text, p_cache_hit boolean, p_execution_time_ms numeric DEFAULT 0, p_cache_size_bytes integer DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    hit_ratio DECIMAL(5,2);
BEGIN
    -- Calculate current hit ratio for this namespace
    SELECT 
        CASE 
            WHEN SUM(CASE WHEN operation_type IN ('hit', 'miss') THEN 1 ELSE 0 END) > 0 THEN
                ROUND(
                    SUM(CASE WHEN operation_type = 'hit' THEN 1 ELSE 0 END)::DECIMAL / 
                    SUM(CASE WHEN operation_type IN ('hit', 'miss') THEN 1 ELSE 0 END)::DECIMAL * 100, 
                    2
                )
            ELSE 0
        END
    INTO hit_ratio
    FROM cache_metrics
    WHERE service_name = p_service_name 
    AND cache_namespace = p_cache_namespace
    AND recorded_at >= NOW() - INTERVAL '1 hour';
    
    -- Insert metrics
    INSERT INTO cache_metrics (
        service_name, cache_namespace, operation_type, 
        execution_time_ms, cache_size_bytes, hit_ratio_pct
    ) VALUES (
        p_service_name, p_cache_namespace, p_operation_type,
        p_execution_time_ms, p_cache_size_bytes, COALESCE(hit_ratio, 0)
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;


ALTER FUNCTION public.record_cache_operation(p_service_name text, p_cache_namespace text, p_operation_type text, p_cache_hit boolean, p_execution_time_ms numeric, p_cache_size_bytes integer) OWNER TO domainflow;

--
-- Name: record_connection_pool_metrics(character varying, integer, integer, integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.record_connection_pool_metrics(p_pool_name character varying, p_active_connections integer, p_idle_connections integer, p_max_connections integer, p_wait_count integer, p_wait_duration_ms integer, p_connection_errors integer) OWNER TO domainflow;

--
-- Name: record_memory_metrics(character varying, character varying, bigint, bigint, bigint, bigint, integer, bigint); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.record_memory_metrics(p_service_name character varying, p_process_id character varying, p_heap_size_bytes bigint, p_heap_used_bytes bigint, p_gc_count bigint, p_gc_duration_ms bigint, p_goroutines_count integer, p_stack_size_bytes bigint) OWNER TO domainflow;

--
-- Name: record_query_performance(text, character varying, numeric, bigint, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.record_query_performance(p_query_sql text, p_query_type character varying, p_execution_time_ms numeric, p_rows_examined bigint, p_rows_returned bigint, p_query_plan jsonb) OWNER TO domainflow;

--
-- Name: record_resource_utilization(text, text, numeric, numeric, numeric, boolean); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.record_resource_utilization(p_service_name text, p_resource_type text, p_current_usage numeric, p_max_capacity numeric, p_utilization_pct numeric, p_bottleneck_detected boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    efficiency_score DECIMAL(5,2);
BEGIN
    -- Calculate efficiency score
    efficiency_score := CASE
        WHEN p_utilization_pct <= 50 THEN 60 + (p_utilization_pct * 0.8)  -- Underutilized
        WHEN p_utilization_pct <= 80 THEN 90 + (p_utilization_pct - 50) * 0.33  -- Optimal range
        WHEN p_utilization_pct <= 95 THEN 80 - (p_utilization_pct - 80) * 2  -- High utilization
        ELSE 20  -- Critical/overutilized
    END;
    
    -- Insert metrics
    INSERT INTO resource_utilization_metrics (
        service_name, resource_type, current_usage, max_capacity,
        utilization_pct, efficiency_score, bottleneck_detected
    ) VALUES (
        p_service_name, p_resource_type, p_current_usage, p_max_capacity,
        p_utilization_pct, efficiency_score, p_bottleneck_detected
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;


ALTER FUNCTION public.record_resource_utilization(p_service_name text, p_resource_type text, p_current_usage numeric, p_max_capacity numeric, p_utilization_pct numeric, p_bottleneck_detected boolean) OWNER TO domainflow;

--
-- Name: record_response_time(text, text, uuid, numeric, jsonb); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.record_response_time(p_service_name text, p_endpoint_path text, p_campaign_id uuid, p_response_time_ms numeric, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    performance_category TEXT;
BEGIN
    -- Categorize performance
    performance_category := CASE
        WHEN p_response_time_ms <= 100 THEN 'fast'
        WHEN p_response_time_ms <= 500 THEN 'normal'
        WHEN p_response_time_ms <= 1000 THEN 'slow'
        ELSE 'critical'
    END;
    
    -- Insert metrics
    INSERT INTO response_time_metrics (
        service_name, endpoint_path, campaign_id, response_time_ms,
        performance_category, status_code, cache_hit
    ) VALUES (
        p_service_name, p_endpoint_path, p_campaign_id, p_response_time_ms,
        performance_category, 
        COALESCE((p_metadata->>'status_code')::INTEGER, 200),
        COALESCE((p_metadata->>'cache_hit')::BOOLEAN, false)
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;


ALTER FUNCTION public.record_response_time(p_service_name text, p_endpoint_path text, p_campaign_id uuid, p_response_time_ms numeric, p_metadata jsonb) OWNER TO domainflow;

--
-- Name: record_response_time(character varying, character varying, numeric, integer, uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.record_response_time(p_endpoint character varying, p_method character varying, p_response_time_ms numeric, p_payload_size integer DEFAULT 0, p_user_id uuid DEFAULT NULL::uuid, p_campaign_id uuid DEFAULT NULL::uuid, p_status_code integer DEFAULT 200) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    metric_id UUID;
    avg_response_time DECIMAL(10,3);
    slow_threshold DECIMAL(10,3) := 1000; -- 1 second
    critical_threshold DECIMAL(10,3) := 3000; -- 3 seconds
BEGIN
    -- Insert response time metric
    INSERT INTO response_time_metrics 
    (endpoint_path, http_method, response_time_ms, payload_size_bytes, user_id, campaign_id, status_code)
    VALUES (p_endpoint, p_method, p_response_time_ms, p_payload_size, p_user_id, p_campaign_id, p_status_code)
    RETURNING id INTO metric_id;
    
    -- Check if this endpoint needs optimization recommendations
    IF p_response_time_ms > slow_threshold THEN
        -- Calculate recent average response time for this endpoint
        SELECT AVG(response_time_ms) INTO avg_response_time
        FROM response_time_metrics 
        WHERE endpoint_path = p_endpoint 
        AND http_method = p_method
        AND recorded_at > NOW() - INTERVAL '1 hour';
        
        -- Generate optimization recommendation if average is consistently slow
        IF avg_response_time > slow_threshold THEN
            INSERT INTO response_optimization_recommendations 
            (endpoint_path, current_avg_response_ms, target_response_ms, optimization_strategies, priority)
            VALUES (
                p_endpoint,
                avg_response_time,
                CASE 
                    WHEN avg_response_time > critical_threshold THEN avg_response_time * 0.3
                    ELSE avg_response_time * 0.5
                END,
                JSON_BUILD_OBJECT(
                    'strategies', ARRAY[
                        CASE WHEN avg_response_time > critical_threshold THEN 'async_processing' ELSE 'query_optimization' END,
                        'response_compression',
                        'selective_field_loading',
                        'pagination'
                    ],
                    'current_avg_ms', avg_response_time,
                    'samples_analyzed', (
                        SELECT COUNT(*) FROM response_time_metrics 
                        WHERE endpoint_path = p_endpoint AND recorded_at > NOW() - INTERVAL '1 hour'
                    )
                ),
                CASE 
                    WHEN avg_response_time > critical_threshold THEN 'high'
                    WHEN avg_response_time > slow_threshold * 2 THEN 'medium'
                    ELSE 'low'
                END
            )
            ON CONFLICT DO NOTHING; -- Don't create duplicate recommendations
        END IF;
    END IF;
    
    RETURN metric_id;
END;
$$;


ALTER FUNCTION public.record_response_time(p_endpoint character varying, p_method character varying, p_response_time_ms numeric, p_payload_size integer, p_user_id uuid, p_campaign_id uuid, p_status_code integer) OWNER TO domainflow;

--
-- Name: release_config_lock(uuid, text); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.release_config_lock(p_lock_id uuid, p_owner text) OWNER TO domainflow;

--
-- Name: FUNCTION release_config_lock(p_lock_id uuid, p_owner text); Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON FUNCTION public.release_config_lock(p_lock_id uuid, p_owner text) IS 'Releases a distributed configuration lock with ownership verification';


--
-- Name: release_state_lock(character varying); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.release_state_lock(p_lock_key character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
		BEGIN
			DELETE FROM state_coordination_locks WHERE lock_key = p_lock_key;
			RETURN FOUND;
		END;
		$$;


ALTER FUNCTION public.release_state_lock(p_lock_key character varying) OWNER TO domainflow;

--
-- Name: release_state_lock(uuid, uuid); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.release_state_lock(p_entity_id uuid, p_lock_token uuid) OWNER TO domainflow;

--
-- Name: sync_domain_config_to_versioned(); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.sync_domain_config_to_versioned() OWNER TO domainflow;

--
-- Name: track_memory_allocation(text, text, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.track_memory_allocation(p_service_name text, p_component text, p_size_bytes bigint, p_allocation_context jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    allocation_uuid UUID;
BEGIN
    allocation_uuid := gen_random_uuid();
    
    INSERT INTO memory_allocations (
        id, service_name, component, allocation_id, 
        allocation_type, size_bytes, allocation_context
    ) VALUES (
        allocation_uuid, p_service_name, p_component, allocation_uuid::TEXT,
        COALESCE(p_allocation_context->>'type', 'unknown'), p_size_bytes, p_allocation_context
    );
    
    RETURN allocation_uuid;
END;
$$;


ALTER FUNCTION public.track_memory_allocation(p_service_name text, p_component text, p_size_bytes bigint, p_allocation_context jsonb) OWNER TO domainflow;

--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_timestamp() OWNER TO domainflow;

--
-- Name: update_keyword_rules_updated_at(); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.update_keyword_rules_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_keyword_rules_updated_at() OWNER TO domainflow;

--
-- Name: update_proxies_updated_at(); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.update_proxies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_proxies_updated_at() OWNER TO domainflow;

--
-- Name: update_proxy_pools_updated_at(); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.update_proxy_pools_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_proxy_pools_updated_at() OWNER TO domainflow;

--
-- Name: update_state_event_processing_status(); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.update_state_event_processing_status() OWNER TO domainflow;

--
-- Name: update_task_progress(character varying, character varying, numeric, integer, text); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.update_task_progress(p_task_id character varying, p_status character varying, p_progress_percentage numeric DEFAULT NULL::numeric, p_processed_items integer DEFAULT NULL::integer, p_error_message text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- Check if task exists
    SELECT EXISTS(SELECT 1 FROM async_task_status WHERE task_id = p_task_id) INTO task_exists;
    
    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update task status
    UPDATE async_task_status 
    SET 
        status = p_status,
        progress_percentage = COALESCE(p_progress_percentage, progress_percentage),
        processed_items = COALESCE(p_processed_items, processed_items),
        error_message = COALESCE(p_error_message, error_message),
        completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE task_id = p_task_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.update_task_progress(p_task_id character varying, p_status character varying, p_progress_percentage numeric, p_processed_items integer, p_error_message text) OWNER TO domainflow;

--
-- Name: update_versioned_config_atomic(character varying, character varying, jsonb, bigint, character varying, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.update_versioned_config_atomic(p_config_type character varying, p_config_key character varying, p_config_value jsonb, p_expected_version bigint, p_checksum character varying, p_updated_by character varying, p_metadata jsonb) OWNER TO domainflow;

--
-- Name: validate_all_enums(); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.validate_all_enums() OWNER TO domainflow;

--
-- Name: validate_campaign_status(); Type: FUNCTION; Schema: public; Owner: domainflow
--

CREATE FUNCTION public.validate_campaign_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status NOT IN ('pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled', 'archived') THEN
        RAISE EXCEPTION 'Invalid campaign status: %. Must match Go CampaignStatusEnum', NEW.status;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_campaign_status() OWNER TO domainflow;

--
-- Name: validate_column_naming(); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.validate_column_naming() OWNER TO domainflow;

--
-- Name: validate_config_consistency(character varying, character varying); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.validate_config_consistency(p_config_type character varying, p_config_key character varying) OWNER TO domainflow;

--
-- Name: validate_enum_value(text, text); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.validate_enum_value(enum_type text, value text) OWNER TO domainflow;

--
-- Name: validate_input_field(text, text, text, text); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.validate_input_field(p_endpoint_pattern text, p_http_method text, p_field_name text, p_field_value text) OWNER TO domainflow;

--
-- Name: validate_input_field(character varying, character varying, character varying, text, uuid, character varying); Type: FUNCTION; Schema: public; Owner: domainflow
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


ALTER FUNCTION public.validate_input_field(p_endpoint_pattern character varying, p_http_method character varying, p_field_name character varying, p_field_value text, p_user_id uuid, p_session_id character varying) OWNER TO domainflow;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auth_audit_log; Type: TABLE; Schema: auth; Owner: domainflow
--

CREATE TABLE auth.auth_audit_log (
    id bigint NOT NULL,
    user_id uuid,
    session_id character varying(128),
    event_type character varying(50) NOT NULL,
    event_status character varying(20) NOT NULL,
    ip_address inet,
    user_agent text,
    session_fingerprint character varying(255),
    security_flags jsonb DEFAULT '{}'::jsonb,
    details jsonb,
    risk_score integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE auth.auth_audit_log OWNER TO domainflow;

--
-- Name: auth_audit_log_id_seq; Type: SEQUENCE; Schema: auth; Owner: domainflow
--

CREATE SEQUENCE auth.auth_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.auth_audit_log_id_seq OWNER TO domainflow;

--
-- Name: auth_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: domainflow
--

ALTER SEQUENCE auth.auth_audit_log_id_seq OWNED BY auth.auth_audit_log.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: auth; Owner: domainflow
--

CREATE TABLE auth.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE auth.password_reset_tokens OWNER TO domainflow;

--
-- Name: permissions; Type: TABLE; Schema: auth; Owner: domainflow
--

CREATE TABLE auth.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(150) NOT NULL,
    description text,
    resource character varying(50) NOT NULL,
    action character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE auth.permissions OWNER TO domainflow;

--
-- Name: TABLE permissions; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON TABLE auth.permissions IS 'System permissions covering all major resources: campaigns, personas, proxies, system, users, reports';


--
-- Name: rate_limits; Type: TABLE; Schema: auth; Owner: domainflow
--

CREATE TABLE auth.rate_limits (
    id bigint NOT NULL,
    identifier character varying(255) NOT NULL,
    action character varying(50) NOT NULL,
    attempts integer DEFAULT 1,
    window_start timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    blocked_until timestamp without time zone
);


ALTER TABLE auth.rate_limits OWNER TO domainflow;

--
-- Name: rate_limits_id_seq; Type: SEQUENCE; Schema: auth; Owner: domainflow
--

CREATE SEQUENCE auth.rate_limits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.rate_limits_id_seq OWNER TO domainflow;

--
-- Name: rate_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: domainflow
--

ALTER SEQUENCE auth.rate_limits_id_seq OWNED BY auth.rate_limits.id;


--
-- Name: role_permissions; Type: TABLE; Schema: auth; Owner: domainflow
--

CREATE TABLE auth.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


ALTER TABLE auth.role_permissions OWNER TO domainflow;

--
-- Name: roles; Type: TABLE; Schema: auth; Owner: domainflow
--

CREATE TABLE auth.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    is_system_role boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE auth.roles OWNER TO domainflow;

--
-- Name: TABLE roles; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON TABLE auth.roles IS 'System roles with default setup: super_admin (full access), admin (administrative), user (standard), viewer (read-only)';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: domainflow
--

CREATE TABLE auth.sessions (
    id character varying(128) NOT NULL,
    user_id uuid NOT NULL,
    ip_address inet,
    user_agent text,
    user_agent_hash character varying(64),
    session_fingerprint character varying(255),
    browser_fingerprint text,
    screen_resolution character varying(20),
    is_active boolean DEFAULT true,
    expires_at timestamp without time zone NOT NULL,
    last_activity_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE auth.sessions OWNER TO domainflow;

--
-- Name: COLUMN sessions.user_agent_hash; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON COLUMN auth.sessions.user_agent_hash IS 'SHA-256 hash of user agent for fast comparison';


--
-- Name: COLUMN sessions.session_fingerprint; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON COLUMN auth.sessions.session_fingerprint IS 'SHA-256 hash of IP address, user agent, and screen resolution for session security';


--
-- Name: COLUMN sessions.browser_fingerprint; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON COLUMN auth.sessions.browser_fingerprint IS 'SHA-256 hash of user agent and screen resolution for browser identification';


--
-- Name: COLUMN sessions.screen_resolution; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON COLUMN auth.sessions.screen_resolution IS 'Screen resolution for enhanced browser fingerprinting';


--
-- Name: user_roles; Type: TABLE; Schema: auth; Owner: domainflow
--

CREATE TABLE auth.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone
);


ALTER TABLE auth.user_roles OWNER TO domainflow;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: domainflow
--

CREATE TABLE auth.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    email_verification_expires_at timestamp without time zone,
    password_hash character varying(255) NOT NULL,
    password_pepper_version integer DEFAULT 1,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    avatar_url text,
    is_active boolean DEFAULT true,
    is_locked boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    last_login_at timestamp without time zone,
    last_login_ip inet,
    password_changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    must_change_password boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_secret_encrypted bytea,
    mfa_backup_codes_encrypted bytea,
    mfa_last_used_at timestamp without time zone,
    encrypted_fields jsonb,
    security_questions_encrypted bytea
);


ALTER TABLE auth.users OWNER TO domainflow;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON TABLE auth.users IS 'User records - all columns use snake_case convention';


--
-- Name: COLUMN users.mfa_secret_encrypted; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON COLUMN auth.users.mfa_secret_encrypted IS 'Encrypted TOTP secret for MFA authentication';


--
-- Name: COLUMN users.mfa_backup_codes_encrypted; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON COLUMN auth.users.mfa_backup_codes_encrypted IS 'Encrypted backup codes for MFA recovery';


--
-- Name: COLUMN users.mfa_last_used_at; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON COLUMN auth.users.mfa_last_used_at IS 'Timestamp of last successful MFA authentication';


--
-- Name: COLUMN users.encrypted_fields; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON COLUMN auth.users.encrypted_fields IS 'JSONB storage for additional encrypted user data';


--
-- Name: COLUMN users.security_questions_encrypted; Type: COMMENT; Schema: auth; Owner: domainflow
--

COMMENT ON COLUMN auth.users.security_questions_encrypted IS 'Encrypted security questions and answers';


--
-- Name: api_access_violations; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.api_access_violations OWNER TO domainflow;

--
-- Name: architecture_refactor_log; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.architecture_refactor_log (
    id bigint NOT NULL,
    service_name character varying(100) NOT NULL,
    refactor_type character varying(50) NOT NULL,
    before_pattern character varying(50),
    after_pattern character varying(50),
    complexity_reduction integer DEFAULT 0,
    performance_impact numeric(8,2) DEFAULT 0.0,
    rollback_plan text,
    implemented_by character varying(100),
    implemented_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.architecture_refactor_log OWNER TO domainflow;

--
-- Name: architecture_refactor_log_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.architecture_refactor_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.architecture_refactor_log_id_seq OWNER TO domainflow;

--
-- Name: architecture_refactor_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.architecture_refactor_log_id_seq OWNED BY public.architecture_refactor_log.id;


--
-- Name: async_task_status; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.async_task_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying(255) NOT NULL,
    task_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'queued'::character varying,
    progress_percentage numeric(5,2) DEFAULT 0,
    total_items integer DEFAULT 0,
    processed_items integer DEFAULT 0,
    user_id uuid,
    campaign_id uuid,
    error_message text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    estimated_completion_at timestamp with time zone
);


ALTER TABLE public.async_task_status OWNER TO domainflow;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: domainflow
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
)
WITH (fillfactor='80');


ALTER TABLE public.audit_logs OWNER TO domainflow;

--
-- Name: COLUMN audit_logs.action; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.audit_logs.action IS 'e.g., CampaignCreated, PersonaUpdated, ProxyTested';


--
-- Name: COLUMN audit_logs.entity_type; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.audit_logs.entity_type IS 'e.g., Campaign, Persona, Proxy';


--
-- Name: authorization_decisions; Type: TABLE; Schema: public; Owner: domainflow
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
    CONSTRAINT authorization_decisions_decision_check CHECK (((decision)::text = ANY (ARRAY[('allow'::character varying)::text, ('deny'::character varying)::text, ('conditional'::character varying)::text])))
);


ALTER TABLE public.authorization_decisions OWNER TO domainflow;

--
-- Name: cache_configurations; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.cache_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_name character varying(100) NOT NULL,
    cache_type character varying(50) NOT NULL,
    max_size_bytes bigint DEFAULT 0,
    current_size_bytes bigint DEFAULT 0,
    max_entries integer DEFAULT 0,
    current_entries integer DEFAULT 0,
    default_ttl_seconds integer DEFAULT 3600,
    eviction_policy character varying(50) DEFAULT 'lru'::character varying,
    cache_status character varying(50) DEFAULT 'active'::character varying,
    last_cleanup_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cache_configurations OWNER TO domainflow;

--
-- Name: cache_entries; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.cache_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key character varying(255) NOT NULL,
    cache_namespace character varying(100) DEFAULT 'default'::character varying NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    campaign_id uuid,
    cache_value text,
    cache_value_compressed bytea,
    is_compressed boolean DEFAULT false,
    content_type character varying(50) DEFAULT 'text'::character varying,
    size_bytes integer DEFAULT 0,
    hit_count integer DEFAULT 0,
    access_frequency numeric(10,3) DEFAULT 0,
    ttl_seconds integer DEFAULT 3600,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    last_accessed timestamp with time zone DEFAULT now(),
    tags character varying[] DEFAULT '{}'::character varying[],
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.cache_entries OWNER TO domainflow;

--
-- Name: cache_invalidation_log; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.cache_invalidation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    cache_namespace character varying(100) NOT NULL,
    invalidation_pattern character varying(255) NOT NULL,
    invalidation_reason character varying(100) NOT NULL,
    affected_keys_count integer DEFAULT 0,
    campaign_type character varying(50),
    campaign_id uuid,
    triggered_by character varying(100) DEFAULT 'system'::character varying,
    execution_time_ms numeric(10,3) DEFAULT 0,
    success boolean DEFAULT true,
    error_message text,
    executed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cache_invalidation_log OWNER TO domainflow;

--
-- Name: cache_invalidations; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.cache_invalidations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_name character varying(100) NOT NULL,
    invalidation_type character varying(50) NOT NULL,
    invalidation_reason text,
    keys_invalidated integer DEFAULT 1,
    bytes_freed bigint DEFAULT 0,
    operation_context jsonb DEFAULT '{}'::jsonb,
    invalidated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cache_invalidations OWNER TO domainflow;

--
-- Name: cache_metrics; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.cache_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    cache_namespace character varying(100) NOT NULL,
    campaign_type character varying(50),
    operation_type character varying(20) NOT NULL,
    cache_key character varying(255) NOT NULL,
    execution_time_ms numeric(10,3) DEFAULT 0,
    cache_size_bytes integer DEFAULT 0,
    ttl_used_seconds integer DEFAULT 0,
    hit_ratio_pct numeric(5,2) DEFAULT 0,
    recorded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cache_metrics OWNER TO domainflow;

--
-- Name: cache_performance_summary; Type: VIEW; Schema: public; Owner: domainflow
--

CREATE VIEW public.cache_performance_summary AS
 SELECT service_name,
    cache_namespace,
    campaign_type,
    count(*) AS total_operations,
    sum(
        CASE
            WHEN ((operation_type)::text = 'hit'::text) THEN 1
            ELSE 0
        END) AS cache_hits,
    sum(
        CASE
            WHEN ((operation_type)::text = 'miss'::text) THEN 1
            ELSE 0
        END) AS cache_misses,
    sum(
        CASE
            WHEN ((operation_type)::text = 'set'::text) THEN 1
            ELSE 0
        END) AS cache_sets,
        CASE
            WHEN (sum(
            CASE
                WHEN ((operation_type)::text = ANY (ARRAY[('hit'::character varying)::text, ('miss'::character varying)::text])) THEN 1
                ELSE 0
            END) > 0) THEN round((((sum(
            CASE
                WHEN ((operation_type)::text = 'hit'::text) THEN 1
                ELSE 0
            END))::numeric / (sum(
            CASE
                WHEN ((operation_type)::text = ANY (ARRAY[('hit'::character varying)::text, ('miss'::character varying)::text])) THEN 1
                ELSE 0
            END))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS hit_rate_pct,
    avg(execution_time_ms) AS avg_execution_time_ms,
    avg(cache_size_bytes) AS avg_cache_size_bytes,
    max(recorded_at) AS last_recorded
   FROM public.cache_metrics
  WHERE (recorded_at >= (now() - '24:00:00'::interval))
  GROUP BY service_name, cache_namespace, campaign_type
  ORDER BY
        CASE
            WHEN (sum(
            CASE
                WHEN ((operation_type)::text = ANY (ARRAY[('hit'::character varying)::text, ('miss'::character varying)::text])) THEN 1
                ELSE 0
            END) > 0) THEN round((((sum(
            CASE
                WHEN ((operation_type)::text = 'hit'::text) THEN 1
                ELSE 0
            END))::numeric / (sum(
            CASE
                WHEN ((operation_type)::text = ANY (ARRAY[('hit'::character varying)::text, ('miss'::character varying)::text])) THEN 1
                ELSE 0
            END))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END DESC;


ALTER VIEW public.cache_performance_summary OWNER TO domainflow;

--
-- Name: campaign_access_grants; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.campaign_access_grants OWNER TO domainflow;

--
-- Name: campaign_cache_efficiency; Type: VIEW; Schema: public; Owner: domainflow
--

CREATE VIEW public.campaign_cache_efficiency AS
 SELECT campaign_type,
    service_name,
    count(DISTINCT cache_namespace) AS cache_namespaces_used,
    sum(
        CASE
            WHEN ((operation_type)::text = 'hit'::text) THEN 1
            ELSE 0
        END) AS total_hits,
    sum(
        CASE
            WHEN ((operation_type)::text = 'miss'::text) THEN 1
            ELSE 0
        END) AS total_misses,
        CASE
            WHEN (sum(
            CASE
                WHEN ((operation_type)::text = ANY (ARRAY[('hit'::character varying)::text, ('miss'::character varying)::text])) THEN 1
                ELSE 0
            END) > 0) THEN round((((sum(
            CASE
                WHEN ((operation_type)::text = 'hit'::text) THEN 1
                ELSE 0
            END))::numeric / (sum(
            CASE
                WHEN ((operation_type)::text = ANY (ARRAY[('hit'::character varying)::text, ('miss'::character varying)::text])) THEN 1
                ELSE 0
            END))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS overall_hit_rate_pct,
    avg(execution_time_ms) AS avg_cache_operation_time_ms,
        CASE
            WHEN (avg(execution_time_ms) <= (1)::numeric) THEN 'excellent'::text
            WHEN (avg(execution_time_ms) <= (5)::numeric) THEN 'good'::text
            WHEN (avg(execution_time_ms) <= (10)::numeric) THEN 'acceptable'::text
            ELSE 'needs_optimization'::text
        END AS cache_performance_rating,
    max(recorded_at) AS last_recorded
   FROM public.cache_metrics
  WHERE (recorded_at >= (now() - '24:00:00'::interval))
  GROUP BY campaign_type, service_name
  ORDER BY
        CASE
            WHEN (sum(
            CASE
                WHEN ((operation_type)::text = ANY (ARRAY[('hit'::character varying)::text, ('miss'::character varying)::text])) THEN 1
                ELSE 0
            END) > 0) THEN round((((sum(
            CASE
                WHEN ((operation_type)::text = 'hit'::text) THEN 1
                ELSE 0
            END))::numeric / (sum(
            CASE
                WHEN ((operation_type)::text = ANY (ARRAY[('hit'::character varying)::text, ('miss'::character varying)::text])) THEN 1
                ELSE 0
            END))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END DESC;


ALTER VIEW public.campaign_cache_efficiency OWNER TO domainflow;

--
-- Name: campaign_jobs; Type: TABLE; Schema: public; Owner: domainflow
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
)
WITH (fillfactor='90');
ALTER TABLE ONLY public.campaign_jobs ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE ONLY public.campaign_jobs ALTER COLUMN created_at SET STATISTICS 500;


ALTER TABLE public.campaign_jobs OWNER TO domainflow;

--
-- Name: COLUMN campaign_jobs.job_type; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaign_jobs.job_type IS 'e.g., DomainGeneration, DNSValidation, HTTPKeywordScan (matches campaign_type usually)';


--
-- Name: COLUMN campaign_jobs.status; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaign_jobs.status IS 'e.g., Pending, Queued, Running, Completed, Failed, Retry';


--
-- Name: campaign_query_patterns; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.campaign_query_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_type character varying(50) NOT NULL,
    service_name character varying(100) NOT NULL,
    query_pattern text NOT NULL,
    query_frequency integer DEFAULT 0,
    avg_execution_time_ms numeric(10,3) DEFAULT 0,
    total_cpu_time_ms numeric(10,3) DEFAULT 0,
    optimization_status character varying(20) DEFAULT 'pending'::character varying,
    baseline_performance jsonb DEFAULT '{}'::jsonb,
    optimized_performance jsonb DEFAULT '{}'::jsonb,
    last_analysis timestamp with time zone DEFAULT now()
);


ALTER TABLE public.campaign_query_patterns OWNER TO domainflow;

--
-- Name: query_performance_metrics; Type: TABLE; Schema: public; Owner: domainflow
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
    executed_at timestamp with time zone DEFAULT now(),
    service_name character varying(100) DEFAULT 'unknown'::character varying,
    campaign_id uuid,
    campaign_type character varying(50),
    memory_used_bytes bigint DEFAULT 0,
    optimization_applied boolean DEFAULT false,
    optimization_suggestions jsonb DEFAULT '[]'::jsonb,
    user_id uuid,
    performance_category character varying(20) DEFAULT 'normal'::character varying,
    needs_optimization boolean DEFAULT false
);


ALTER TABLE public.query_performance_metrics OWNER TO domainflow;

--
-- Name: campaign_query_performance_summary; Type: VIEW; Schema: public; Owner: domainflow
--

CREATE VIEW public.campaign_query_performance_summary AS
 SELECT campaign_type,
    service_name,
    count(*) AS total_queries,
    avg(execution_time_ms) AS avg_execution_time_ms,
    percentile_cont((0.95)::double precision) WITHIN GROUP (ORDER BY ((execution_time_ms)::double precision)) AS p95_execution_time_ms,
    percentile_cont((0.99)::double precision) WITHIN GROUP (ORDER BY ((execution_time_ms)::double precision)) AS p99_execution_time_ms,
    sum(
        CASE
            WHEN ((performance_category)::text = 'critical'::text) THEN 1
            ELSE 0
        END) AS critical_queries,
    sum(
        CASE
            WHEN ((performance_category)::text = 'slow'::text) THEN 1
            ELSE 0
        END) AS slow_queries,
    sum(
        CASE
            WHEN needs_optimization THEN 1
            ELSE 0
        END) AS queries_needing_optimization,
    max(executed_at) AS last_recorded
   FROM public.query_performance_metrics
  WHERE (executed_at >= (now() - '24:00:00'::interval))
  GROUP BY campaign_type, service_name
  ORDER BY (avg(execution_time_ms)) DESC;


ALTER VIEW public.campaign_query_performance_summary OWNER TO domainflow;

--
-- Name: resource_utilization_metrics; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.resource_utilization_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    current_usage numeric(10,3) NOT NULL,
    max_capacity numeric(10,3) NOT NULL,
    utilization_pct numeric(5,2) NOT NULL,
    efficiency_score numeric(5,2) DEFAULT 0,
    bottleneck_detected boolean DEFAULT false,
    recorded_at timestamp with time zone DEFAULT now(),
    campaign_type character varying(50),
    campaign_id uuid,
    component character varying(100),
    optimization_applied jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.resource_utilization_metrics OWNER TO domainflow;

--
-- Name: campaign_resource_usage; Type: VIEW; Schema: public; Owner: domainflow
--

CREATE VIEW public.campaign_resource_usage AS
 SELECT campaign_type,
    service_name,
    resource_type,
    count(*) AS measurement_count,
    avg(utilization_pct) AS avg_utilization_pct,
    max(utilization_pct) AS peak_utilization_pct,
    avg(efficiency_score) AS avg_efficiency_score,
    sum(
        CASE
            WHEN bottleneck_detected THEN 1
            ELSE 0
        END) AS bottleneck_events,
        CASE
            WHEN (avg(utilization_pct) <= (50)::numeric) THEN 'underutilized'::text
            WHEN (avg(utilization_pct) <= (80)::numeric) THEN 'optimal'::text
            WHEN (avg(utilization_pct) <= (95)::numeric) THEN 'high'::text
            ELSE 'critical'::text
        END AS usage_level,
    max(recorded_at) AS last_recorded
   FROM public.resource_utilization_metrics
  WHERE (recorded_at >= (now() - '24:00:00'::interval))
  GROUP BY campaign_type, service_name, resource_type
  ORDER BY (avg(utilization_pct)) DESC;


ALTER VIEW public.campaign_resource_usage OWNER TO domainflow;

--
-- Name: campaign_state_events; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.campaign_state_events OWNER TO domainflow;

--
-- Name: TABLE campaign_state_events; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TABLE public.campaign_state_events IS 'Event sourcing table for campaign state management - stores all state changes for replay and audit';


--
-- Name: campaign_state_events_sequence_number_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.campaign_state_events_sequence_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_state_events_sequence_number_seq OWNER TO domainflow;

--
-- Name: campaign_state_events_sequence_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.campaign_state_events_sequence_number_seq OWNED BY public.campaign_state_events.sequence_number;


--
-- Name: campaign_state_snapshots; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.campaign_state_snapshots OWNER TO domainflow;

--
-- Name: TABLE campaign_state_snapshots; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TABLE public.campaign_state_snapshots IS 'Periodic snapshots of campaign state for faster replay and recovery';


--
-- Name: campaign_state_transitions; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.campaign_state_transitions OWNER TO domainflow;

--
-- Name: TABLE campaign_state_transitions; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TABLE public.campaign_state_transitions IS 'Tracks specific state transitions with validation and timing information';


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: domainflow
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
    archived_at timestamp with time zone,
    archived_reason text,
    CONSTRAINT campaigns_campaign_type_check CHECK ((campaign_type = ANY (ARRAY['domain_generation'::text, 'dns_validation'::text, 'http_keyword_validation'::text]))),
    CONSTRAINT chk_campaign_items_non_negative CHECK (((total_items >= 0) AND (processed_items >= 0) AND (successful_items >= 0) AND (failed_items >= 0))),
    CONSTRAINT chk_campaigns_business_status_valid CHECK (((business_status IS NULL) OR (business_status = ANY (ARRAY['archived'::text, 'priority'::text, 'experimental'::text, 'production_ready'::text])))),
    CONSTRAINT chk_campaigns_failed_items_non_negative CHECK ((failed_items >= 0)),
    CONSTRAINT chk_campaigns_processed_items_non_negative CHECK ((processed_items >= 0)),
    CONSTRAINT chk_campaigns_progress_percentage_range CHECK (((progress_percentage IS NULL) OR ((progress_percentage >= (0)::double precision) AND (progress_percentage <= (100)::double precision)))),
    CONSTRAINT chk_campaigns_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'running'::text, 'pausing'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'archived'::text]))),
    CONSTRAINT chk_campaigns_successful_items_non_negative CHECK ((successful_items >= 0)),
    CONSTRAINT chk_campaigns_total_items_non_negative CHECK ((total_items >= 0))
);
ALTER TABLE ONLY public.campaigns ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE ONLY public.campaigns ALTER COLUMN created_at SET STATISTICS 500;


ALTER TABLE public.campaigns OWNER TO domainflow;

--
-- Name: TABLE campaigns; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TABLE public.campaigns IS 'Campaign records - all columns use snake_case convention';


--
-- Name: COLUMN campaigns.campaign_type; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaigns.campaign_type IS 'Valid values: domain_generation, dns_validation, http_keyword_validation';


--
-- Name: COLUMN campaigns.status; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaigns.status IS 'Valid values: pending, queued, running, pausing, paused, completed, failed, cancelled';


--
-- Name: COLUMN campaigns.total_items; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaigns.total_items IS 'Total items in campaign (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.processed_items; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaigns.processed_items IS 'Items processed (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.successful_items; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaigns.successful_items IS 'Successful items (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.failed_items; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaigns.failed_items IS 'Failed items (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN campaigns.estimated_completion_at; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaigns.estimated_completion_at IS 'Estimated timestamp when campaign will complete';


--
-- Name: COLUMN campaigns.avg_processing_rate; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaigns.avg_processing_rate IS 'Average processing rate (items per second)';


--
-- Name: COLUMN campaigns.last_heartbeat_at; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.campaigns.last_heartbeat_at IS 'Last heartbeat timestamp from campaign processor';


--
-- Name: campaigns_camel_view; Type: VIEW; Schema: public; Owner: domainflow
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


ALTER VIEW public.campaigns_camel_view OWNER TO domainflow;

--
-- Name: communication_patterns; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.communication_patterns (
    id bigint NOT NULL,
    source_service character varying(100) NOT NULL,
    target_service character varying(100) NOT NULL,
    communication_type character varying(30) NOT NULL,
    protocol character varying(20) NOT NULL,
    message_format character varying(20) NOT NULL,
    avg_latency_ms numeric(8,2) DEFAULT 0.0,
    success_rate numeric(5,2) DEFAULT 100.0,
    throughput_rps numeric(10,2) DEFAULT 0.0,
    error_rate numeric(5,2) DEFAULT 0.0,
    retry_count integer DEFAULT 0,
    circuit_breaker_state character varying(20) DEFAULT 'closed'::character varying,
    last_health_check timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.communication_patterns OWNER TO domainflow;

--
-- Name: communication_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.communication_patterns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_patterns_id_seq OWNER TO domainflow;

--
-- Name: communication_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.communication_patterns_id_seq OWNED BY public.communication_patterns.id;


--
-- Name: config_locks; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.config_locks OWNER TO domainflow;

--
-- Name: config_versions; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.config_versions OWNER TO domainflow;

--
-- Name: connection_leak_detection; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.connection_leak_detection OWNER TO domainflow;

--
-- Name: connection_pool_alerts; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.connection_pool_alerts OWNER TO domainflow;

--
-- Name: connection_pool_metrics; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.connection_pool_metrics OWNER TO domainflow;

--
-- Name: database_performance_metrics; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.database_performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_type character varying(100) NOT NULL,
    query_hash character varying(64) NOT NULL,
    execution_time_ms integer NOT NULL,
    rows_affected integer DEFAULT 0,
    rows_returned integer DEFAULT 0,
    index_usage jsonb DEFAULT '{}'::jsonb,
    query_plan_summary text,
    cache_hit boolean DEFAULT false,
    operation_context jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.database_performance_metrics OWNER TO domainflow;

--
-- Name: dns_validation_params; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.dns_validation_params OWNER TO domainflow;

--
-- Name: dns_validation_results; Type: TABLE; Schema: public; Owner: domainflow
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
)
WITH (fillfactor='85');
ALTER TABLE ONLY public.dns_validation_results ALTER COLUMN validation_status SET STATISTICS 1000;
ALTER TABLE ONLY public.dns_validation_results ALTER COLUMN created_at SET STATISTICS 500;


ALTER TABLE public.dns_validation_results OWNER TO domainflow;

--
-- Name: COLUMN dns_validation_results.validation_status; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.dns_validation_results.validation_status IS 'e.g., Resolved, Unresolved, Error, Pending, Skipped';


--
-- Name: domain_generation_batches; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.domain_generation_batches OWNER TO domainflow;

--
-- Name: domain_generation_campaign_params; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.domain_generation_campaign_params OWNER TO domainflow;

--
-- Name: COLUMN domain_generation_campaign_params.total_possible_combinations; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.domain_generation_campaign_params.total_possible_combinations IS 'Total combinations (Go: int64, JS: requires SafeBigInt)';


--
-- Name: COLUMN domain_generation_campaign_params.current_offset; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.domain_generation_campaign_params.current_offset IS 'Current offset (Go: int64, JS: requires SafeBigInt)';


--
-- Name: domain_generation_config_states; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.domain_generation_config_states OWNER TO domainflow;

--
-- Name: domain_generation_params; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.domain_generation_params OWNER TO domainflow;

--
-- Name: enum_validation_failures; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.enum_validation_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    column_name text NOT NULL,
    invalid_value text NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    context jsonb
);


ALTER TABLE public.enum_validation_failures OWNER TO domainflow;

--
-- Name: event_projections; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.event_projections (
    id bigint NOT NULL,
    projection_name character varying(100) NOT NULL,
    aggregate_id character varying(100) NOT NULL,
    projection_data jsonb NOT NULL,
    last_event_position bigint NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_projections OWNER TO domainflow;

--
-- Name: event_projections_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.event_projections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_projections_id_seq OWNER TO domainflow;

--
-- Name: event_projections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.event_projections_id_seq OWNED BY public.event_projections.id;


--
-- Name: event_store; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.event_store (
    id bigint NOT NULL,
    event_id uuid NOT NULL,
    aggregate_id character varying(100) NOT NULL,
    aggregate_type character varying(50) NOT NULL,
    event_type character varying(100) NOT NULL,
    event_version integer DEFAULT 1 NOT NULL,
    event_data jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    causation_id uuid,
    correlation_id uuid,
    stream_position bigint NOT NULL,
    global_position bigint NOT NULL,
    occurred_at timestamp with time zone DEFAULT now(),
    recorded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_store OWNER TO domainflow;

--
-- Name: event_store_global_position_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.event_store_global_position_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_store_global_position_seq OWNER TO domainflow;

--
-- Name: event_store_global_position_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.event_store_global_position_seq OWNED BY public.event_store.global_position;


--
-- Name: event_store_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.event_store_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_store_id_seq OWNER TO domainflow;

--
-- Name: event_store_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.event_store_id_seq OWNED BY public.event_store.id;


--
-- Name: generated_domains; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.generated_domains OWNER TO domainflow;

--
-- Name: COLUMN generated_domains.offset_index; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.generated_domains.offset_index IS 'Generation offset (Go: int64, JS: requires SafeBigInt)';


--
-- Name: http_keyword_campaign_params; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.http_keyword_campaign_params OWNER TO domainflow;

--
-- Name: COLUMN http_keyword_campaign_params.source_type; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.http_keyword_campaign_params.source_type IS 'Source type with exact casing: DomainGeneration or DNSValidation';


--
-- Name: http_keyword_params; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.http_keyword_params OWNER TO domainflow;

--
-- Name: COLUMN http_keyword_params.source_type; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.http_keyword_params.source_type IS 'Valid values: DomainGeneration, DNSValidation (PascalCase required)';


--
-- Name: http_keyword_results; Type: TABLE; Schema: public; Owner: domainflow
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
)
WITH (fillfactor='85');
ALTER TABLE ONLY public.http_keyword_results ALTER COLUMN validation_status SET STATISTICS 1000;


ALTER TABLE public.http_keyword_results OWNER TO domainflow;

--
-- Name: COLUMN http_keyword_results.validation_status; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.http_keyword_results.validation_status IS 'e.g., Success, ContentMismatch, KeywordsNotFound, Unreachable, AccessDenied, ProxyError, DNSError, Timeout, Error, Pending, Skipped';


--
-- Name: index_usage_analytics; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.index_usage_analytics OWNER TO domainflow;

--
-- Name: input_validation_rules; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.input_validation_rules OWNER TO domainflow;

--
-- Name: input_validation_violations; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.input_validation_violations OWNER TO domainflow;

--
-- Name: keyword_rules; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.keyword_rules OWNER TO domainflow;

--
-- Name: TABLE keyword_rules; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TABLE public.keyword_rules IS 'Individual keyword rules expanded from keyword_sets.rules JSONB';


--
-- Name: keyword_sets; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.keyword_sets OWNER TO domainflow;

--
-- Name: COLUMN keyword_sets.rules; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.keyword_sets.rules IS 'Array of KeywordRule objects: [{"pattern": "findme", "ruleType": "string", ...}]';


--
-- Name: memory_allocations; Type: TABLE; Schema: public; Owner: domainflow
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
    created_at timestamp with time zone DEFAULT now(),
    allocation_type character varying(50) DEFAULT 'unknown'::character varying,
    is_active boolean DEFAULT true,
    allocated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.memory_allocations OWNER TO domainflow;

--
-- Name: memory_leak_detection; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.memory_leak_detection OWNER TO domainflow;

--
-- Name: memory_metrics; Type: TABLE; Schema: public; Owner: domainflow
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
    recorded_at timestamp with time zone DEFAULT now(),
    component character varying(100) DEFAULT 'unknown'::character varying,
    memory_type character varying(50) DEFAULT 'heap'::character varying,
    allocated_bytes bigint DEFAULT 0,
    used_bytes bigint DEFAULT 0,
    available_bytes bigint DEFAULT 0,
    allocation_count integer DEFAULT 0,
    deallocation_count integer DEFAULT 0,
    gc_cycles integer DEFAULT 0,
    efficiency_score numeric(5,2) DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.memory_metrics OWNER TO domainflow;

--
-- Name: memory_optimization_recommendations; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.memory_optimization_recommendations OWNER TO domainflow;

--
-- Name: memory_pools; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.memory_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_name character varying(100) NOT NULL,
    service_name character varying(100) NOT NULL,
    pool_type character varying(50) NOT NULL,
    max_size integer DEFAULT 100 NOT NULL,
    current_size integer DEFAULT 0 NOT NULL,
    total_allocations bigint DEFAULT 0 NOT NULL,
    total_deallocations bigint DEFAULT 0 NOT NULL,
    hit_rate numeric(5,2) DEFAULT 0,
    miss_rate numeric(5,2) DEFAULT 0,
    efficiency_score numeric(5,2) DEFAULT 0,
    configuration jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.memory_pools OWNER TO domainflow;

--
-- Name: performance_baselines; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.performance_baselines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    baseline_date timestamp with time zone DEFAULT now(),
    query_count integer DEFAULT 0,
    avg_query_time_ms numeric(10,3) DEFAULT 0,
    p95_query_time_ms numeric(10,3) DEFAULT 0,
    p99_query_time_ms numeric(10,3) DEFAULT 0,
    slow_query_count integer DEFAULT 0,
    total_cpu_time_ms numeric(10,3) DEFAULT 0,
    total_memory_bytes bigint DEFAULT 0,
    database_connections_avg integer DEFAULT 0,
    optimization_phase character varying(50) NOT NULL,
    notes text
);


ALTER TABLE public.performance_baselines OWNER TO domainflow;

--
-- Name: performance_optimizations; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.performance_optimizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    optimization_type character varying(100) NOT NULL,
    target_service character varying(100) NOT NULL,
    target_operation character varying(255) NOT NULL,
    baseline_time_ms integer NOT NULL,
    optimized_time_ms integer NOT NULL,
    improvement_pct numeric(5,2) NOT NULL,
    optimization_technique character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now(),
    validation_status character varying(50) DEFAULT 'pending'::character varying
);


ALTER TABLE public.performance_optimizations OWNER TO domainflow;

--
-- Name: personas; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.personas OWNER TO domainflow;

--
-- Name: TABLE personas; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TABLE public.personas IS 'Persona records - all columns use snake_case convention';


--
-- Name: COLUMN personas.persona_type; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.personas.persona_type IS 'Valid values: dns, http';


--
-- Name: COLUMN personas.config_details; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.personas.config_details IS 'Stores DNSValidatorConfigJSON or HTTPValidatorConfigJSON';


--
-- Name: personas_camel_view; Type: VIEW; Schema: public; Owner: domainflow
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


ALTER VIEW public.personas_camel_view OWNER TO domainflow;

--
-- Name: proxies; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.proxies OWNER TO domainflow;

--
-- Name: TABLE proxies; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TABLE public.proxies IS 'Proxy records - all columns use snake_case convention';


--
-- Name: COLUMN proxies.protocol; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON COLUMN public.proxies.protocol IS 'Valid values: http, https, socks5, socks4';


--
-- Name: proxies_camel_view; Type: VIEW; Schema: public; Owner: domainflow
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


ALTER VIEW public.proxies_camel_view OWNER TO domainflow;

--
-- Name: proxy_pool_memberships; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.proxy_pool_memberships (
    pool_id uuid NOT NULL,
    proxy_id uuid NOT NULL,
    weight integer DEFAULT 1,
    is_active boolean DEFAULT true,
    added_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.proxy_pool_memberships OWNER TO domainflow;

--
-- Name: TABLE proxy_pool_memberships; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TABLE public.proxy_pool_memberships IS 'Junction table for proxy pool memberships';


--
-- Name: proxy_pools; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.proxy_pools OWNER TO domainflow;

--
-- Name: TABLE proxy_pools; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON TABLE public.proxy_pools IS 'Proxy pool configurations for grouping and managing proxies';


--
-- Name: query_optimization_recommendations; Type: TABLE; Schema: public; Owner: domainflow
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
    created_at timestamp with time zone DEFAULT now(),
    service_name character varying(100) DEFAULT 'unknown'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying
);


ALTER TABLE public.query_optimization_recommendations OWNER TO domainflow;

--
-- Name: resource_locks; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.resource_locks OWNER TO domainflow;

--
-- Name: resource_optimization_actions; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.resource_optimization_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    campaign_id uuid,
    action_type character varying(50) NOT NULL,
    resource_type character varying(50) NOT NULL,
    action_description text NOT NULL,
    before_metrics jsonb DEFAULT '{}'::jsonb,
    after_metrics jsonb DEFAULT '{}'::jsonb,
    improvement_pct numeric(5,2) DEFAULT 0,
    success boolean DEFAULT true,
    error_message text,
    triggered_by character varying(50) DEFAULT 'automatic'::character varying,
    executed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.resource_optimization_actions OWNER TO domainflow;

--
-- Name: resource_utilization_summary; Type: VIEW; Schema: public; Owner: domainflow
--

CREATE VIEW public.resource_utilization_summary AS
 SELECT service_name,
    resource_type,
    campaign_type,
    avg(current_usage) AS avg_usage,
    max(current_usage) AS peak_usage,
    avg(utilization_pct) AS avg_utilization_pct,
    max(utilization_pct) AS peak_utilization_pct,
    avg(efficiency_score) AS avg_efficiency_score,
    count(
        CASE
            WHEN bottleneck_detected THEN 1
            ELSE NULL::integer
        END) AS bottleneck_count,
    count(*) AS metric_count,
    max(recorded_at) AS last_recorded
   FROM public.resource_utilization_metrics
  WHERE (recorded_at >= (now() - '24:00:00'::interval))
  GROUP BY service_name, resource_type, campaign_type
  ORDER BY (avg(utilization_pct)) DESC;


ALTER VIEW public.resource_utilization_summary OWNER TO domainflow;

--
-- Name: response_optimization_recommendations; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.response_optimization_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_path character varying(255) NOT NULL,
    current_avg_response_ms numeric(10,3) NOT NULL,
    target_response_ms numeric(10,3) NOT NULL,
    optimization_strategies jsonb NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    implemented boolean DEFAULT false,
    implementation_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.response_optimization_recommendations OWNER TO domainflow;

--
-- Name: response_time_history; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.response_time_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    measurement_window interval DEFAULT '01:00:00'::interval NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    avg_response_time_ms numeric(10,3) NOT NULL,
    p50_response_time_ms numeric(10,3) NOT NULL,
    p95_response_time_ms numeric(10,3) NOT NULL,
    p99_response_time_ms numeric(10,3) NOT NULL,
    max_response_time_ms numeric(10,3) NOT NULL,
    error_rate_pct numeric(5,2) DEFAULT 0,
    cache_hit_rate_pct numeric(5,2) DEFAULT 0,
    optimization_score numeric(5,2) DEFAULT 0,
    sla_violations integer DEFAULT 0,
    recorded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.response_time_history OWNER TO domainflow;

--
-- Name: response_time_metrics; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.response_time_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_path character varying(255) NOT NULL,
    http_method character varying(10) NOT NULL,
    response_time_ms numeric(10,3) NOT NULL,
    payload_size_bytes integer DEFAULT 0,
    user_id uuid,
    campaign_id uuid,
    status_code integer DEFAULT 200,
    recorded_at timestamp with time zone DEFAULT now(),
    service_name character varying(100) DEFAULT 'unknown'::character varying,
    campaign_type character varying(50),
    performance_category character varying(20) DEFAULT 'normal'::character varying,
    cache_hit boolean DEFAULT false
);


ALTER TABLE public.response_time_metrics OWNER TO domainflow;

--
-- Name: response_time_targets; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.response_time_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    endpoint_pattern character varying(255) NOT NULL,
    campaign_type character varying(50),
    target_p50_ms numeric(10,3) DEFAULT 100 NOT NULL,
    target_p95_ms numeric(10,3) DEFAULT 500 NOT NULL,
    target_p99_ms numeric(10,3) DEFAULT 1000 NOT NULL,
    sla_threshold_ms numeric(10,3) DEFAULT 2000 NOT NULL,
    alert_threshold_ms numeric(10,3) DEFAULT 1500 NOT NULL,
    optimization_priority character varying(20) DEFAULT 'medium'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.response_time_targets OWNER TO domainflow;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    dirty boolean NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO domainflow;

--
-- Name: schema_migrations_old; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.schema_migrations_old (
    version text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    rolled_back_at timestamp with time zone,
    description text
);


ALTER TABLE public.schema_migrations_old OWNER TO domainflow;

--
-- Name: security_events; Type: TABLE; Schema: public; Owner: domainflow
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
    denial_reason text,
    risk_score integer DEFAULT 0,
    source_ip inet,
    user_agent text,
    request_context jsonb DEFAULT '{}'::jsonb,
    audit_log_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.security_events OWNER TO domainflow;

--
-- Name: service_architecture_metrics; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.service_architecture_metrics (
    id bigint NOT NULL,
    service_name character varying(100) NOT NULL,
    architecture_pattern character varying(50) NOT NULL,
    interface_type character varying(30) NOT NULL,
    dependency_count integer DEFAULT 0,
    coupling_score numeric(5,2) DEFAULT 0.0,
    deployment_complexity_score integer DEFAULT 0,
    last_refactor_date timestamp with time zone,
    performance_impact numeric(8,2) DEFAULT 0.0,
    error_rate numeric(5,2) DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.service_architecture_metrics OWNER TO domainflow;

--
-- Name: service_architecture_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.service_architecture_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_architecture_metrics_id_seq OWNER TO domainflow;

--
-- Name: service_architecture_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.service_architecture_metrics_id_seq OWNED BY public.service_architecture_metrics.id;


--
-- Name: service_capacity_metrics; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.service_capacity_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(100) NOT NULL,
    cpu_utilization numeric(5,2) NOT NULL,
    memory_utilization numeric(5,2) NOT NULL,
    instance_count integer NOT NULL,
    recorded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.service_capacity_metrics OWNER TO domainflow;

--
-- Name: service_dependencies; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.service_dependencies (
    id bigint NOT NULL,
    source_service character varying(100) NOT NULL,
    target_service character varying(100) NOT NULL,
    dependency_type character varying(30) NOT NULL,
    interface_contract text,
    reliability_score numeric(5,2) DEFAULT 100.0,
    latency_p95 numeric(8,2) DEFAULT 0.0,
    failure_count integer DEFAULT 0,
    last_success timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.service_dependencies OWNER TO domainflow;

--
-- Name: service_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.service_dependencies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_dependencies_id_seq OWNER TO domainflow;

--
-- Name: service_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.service_dependencies_id_seq OWNED BY public.service_dependencies.id;


--
-- Name: si004_connection_leak_detection; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.si004_connection_leak_detection (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    connection_id character varying(255) NOT NULL,
    duration_ms bigint NOT NULL,
    stack_trace text,
    query_info text
);


ALTER TABLE public.si004_connection_leak_detection OWNER TO domainflow;

--
-- Name: si004_connection_leak_detection_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.si004_connection_leak_detection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.si004_connection_leak_detection_id_seq OWNER TO domainflow;

--
-- Name: si004_connection_leak_detection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.si004_connection_leak_detection_id_seq OWNED BY public.si004_connection_leak_detection.id;


--
-- Name: si004_connection_pool_alerts; Type: TABLE; Schema: public; Owner: domainflow
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
    CONSTRAINT si004_connection_pool_alerts_alert_level_check CHECK (((alert_level)::text = ANY (ARRAY[('INFO'::character varying)::text, ('WARNING'::character varying)::text, ('CRITICAL'::character varying)::text])))
);


ALTER TABLE public.si004_connection_pool_alerts OWNER TO domainflow;

--
-- Name: si004_connection_pool_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.si004_connection_pool_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.si004_connection_pool_alerts_id_seq OWNER TO domainflow;

--
-- Name: si004_connection_pool_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.si004_connection_pool_alerts_id_seq OWNED BY public.si004_connection_pool_alerts.id;


--
-- Name: si004_connection_pool_metrics; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.si004_connection_pool_metrics OWNER TO domainflow;

--
-- Name: si004_connection_pool_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.si004_connection_pool_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.si004_connection_pool_metrics_id_seq OWNER TO domainflow;

--
-- Name: si004_connection_pool_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.si004_connection_pool_metrics_id_seq OWNED BY public.si004_connection_pool_metrics.id;


--
-- Name: slow_query_log; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.slow_query_log OWNER TO domainflow;

--
-- Name: state_coordination_locks; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.state_coordination_locks (
    lock_key character varying(255) NOT NULL,
    locked_by character varying(255) NOT NULL,
    locked_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.state_coordination_locks OWNER TO domainflow;

--
-- Name: state_events; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.state_events OWNER TO domainflow;

--
-- Name: state_snapshots; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.state_snapshots OWNER TO domainflow;

--
-- Name: suspicious_input_alerts; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.suspicious_input_alerts OWNER TO domainflow;

--
-- Name: suspicious_input_patterns; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.suspicious_input_patterns OWNER TO domainflow;

--
-- Name: system_alerts; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.system_alerts OWNER TO domainflow;

--
-- Name: users; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO domainflow;

--
-- Name: v_enum_documentation; Type: VIEW; Schema: public; Owner: domainflow
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


ALTER VIEW public.v_enum_documentation OWNER TO domainflow;

--
-- Name: VIEW v_enum_documentation; Type: COMMENT; Schema: public; Owner: domainflow
--

COMMENT ON VIEW public.v_enum_documentation IS 'Documentation of valid enum values matching Go backend';


--
-- Name: versioned_configs; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.versioned_configs OWNER TO domainflow;

--
-- Name: versioned_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: domainflow
--

CREATE SEQUENCE public.versioned_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.versioned_configs_id_seq OWNER TO domainflow;

--
-- Name: versioned_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: domainflow
--

ALTER SEQUENCE public.versioned_configs_id_seq OWNED BY public.versioned_configs.id;


--
-- Name: worker_coordination; Type: TABLE; Schema: public; Owner: domainflow
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


ALTER TABLE public.worker_coordination OWNER TO domainflow;

--
-- Name: worker_pool_metrics; Type: TABLE; Schema: public; Owner: domainflow
--

CREATE TABLE public.worker_pool_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_name character varying(100) NOT NULL,
    service_name character varying(100) NOT NULL,
    campaign_type character varying(50),
    min_workers integer DEFAULT 1 NOT NULL,
    max_workers integer DEFAULT 10 NOT NULL,
    current_workers integer DEFAULT 1 NOT NULL,
    active_workers integer DEFAULT 0 NOT NULL,
    queued_tasks integer DEFAULT 0 NOT NULL,
    completed_tasks bigint DEFAULT 0 NOT NULL,
    failed_tasks bigint DEFAULT 0 NOT NULL,
    avg_task_duration_ms numeric(10,3) DEFAULT 0,
    pool_efficiency_pct numeric(5,2) DEFAULT 0,
    scale_up_events integer DEFAULT 0,
    scale_down_events integer DEFAULT 0,
    last_scale_action timestamp with time zone,
    recorded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.worker_pool_metrics OWNER TO domainflow;

--
-- Name: auth_audit_log id; Type: DEFAULT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.auth_audit_log ALTER COLUMN id SET DEFAULT nextval('auth.auth_audit_log_id_seq'::regclass);


--
-- Name: rate_limits id; Type: DEFAULT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.rate_limits ALTER COLUMN id SET DEFAULT nextval('auth.rate_limits_id_seq'::regclass);


--
-- Name: architecture_refactor_log id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.architecture_refactor_log ALTER COLUMN id SET DEFAULT nextval('public.architecture_refactor_log_id_seq'::regclass);


--
-- Name: campaign_state_events sequence_number; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_events ALTER COLUMN sequence_number SET DEFAULT nextval('public.campaign_state_events_sequence_number_seq'::regclass);


--
-- Name: communication_patterns id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.communication_patterns ALTER COLUMN id SET DEFAULT nextval('public.communication_patterns_id_seq'::regclass);


--
-- Name: event_projections id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.event_projections ALTER COLUMN id SET DEFAULT nextval('public.event_projections_id_seq'::regclass);


--
-- Name: event_store id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.event_store ALTER COLUMN id SET DEFAULT nextval('public.event_store_id_seq'::regclass);


--
-- Name: event_store global_position; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.event_store ALTER COLUMN global_position SET DEFAULT nextval('public.event_store_global_position_seq'::regclass);


--
-- Name: service_architecture_metrics id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.service_architecture_metrics ALTER COLUMN id SET DEFAULT nextval('public.service_architecture_metrics_id_seq'::regclass);


--
-- Name: service_dependencies id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.service_dependencies ALTER COLUMN id SET DEFAULT nextval('public.service_dependencies_id_seq'::regclass);


--
-- Name: si004_connection_leak_detection id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.si004_connection_leak_detection ALTER COLUMN id SET DEFAULT nextval('public.si004_connection_leak_detection_id_seq'::regclass);


--
-- Name: si004_connection_pool_alerts id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.si004_connection_pool_alerts ALTER COLUMN id SET DEFAULT nextval('public.si004_connection_pool_alerts_id_seq'::regclass);


--
-- Name: si004_connection_pool_metrics id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.si004_connection_pool_metrics ALTER COLUMN id SET DEFAULT nextval('public.si004_connection_pool_metrics_id_seq'::regclass);


--
-- Name: versioned_configs id; Type: DEFAULT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.versioned_configs ALTER COLUMN id SET DEFAULT nextval('public.versioned_configs_id_seq'::regclass);


--
-- Data for Name: auth_audit_log; Type: TABLE DATA; Schema: auth; Owner: domainflow
--

COPY auth.auth_audit_log (id, user_id, session_id, event_type, event_status, ip_address, user_agent, session_fingerprint, security_flags, details, risk_score, created_at) FROM stdin;
1	\N	\N	login	failure	::1	\N	\N	{}	{"reason": "user not found", "timestamp": "2025-06-29T03:25:52Z"}	3	2025-06-29 03:25:52.422753
2	\N	\N	login	failure	::1	\N	\N	{}	{"reason": "user not found", "timestamp": "2025-06-29T03:26:58Z"}	3	2025-06-29 03:26:58.813986
3	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	failure	::1	\N	\N	{}	{"reason": "invalid password", "timestamp": "2025-06-29T03:39:08Z"}	3	2025-06-29 03:39:08.290401
4	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	success	::1	\N	\N	{}	{"timestamp": "2025-06-29T03:47:51Z"}	1	2025-06-29 03:47:51.87286
5	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	success	::1	\N	\N	{}	{"timestamp": "2025-06-29T03:48:09Z"}	1	2025-06-29 03:48:09.645496
6	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	success	::1	\N	\N	{}	{"timestamp": "2025-06-29T03:50:48Z"}	1	2025-06-29 03:50:48.351184
7	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	success	::1	\N	\N	{}	{"timestamp": "2025-06-29T03:51:15Z"}	1	2025-06-29 03:51:15.650296
8	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	success	::1	\N	\N	{}	{"timestamp": "2025-06-29T03:54:24Z"}	1	2025-06-29 03:54:24.662596
9	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	success	::1	\N	\N	{}	{"timestamp": "2025-06-29T03:55:02Z"}	1	2025-06-29 03:55:02.612106
10	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	success	::1	\N	\N	{}	{"timestamp": "2025-06-29T03:56:41Z"}	1	2025-06-29 03:56:41.363848
11	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	success	::1	\N	\N	{}	{"timestamp": "2025-06-29T04:04:09Z"}	1	2025-06-29 04:04:09.468526
12	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	\N	login	success	::1	\N	\N	{}	{"timestamp": "2025-06-29T04:06:24Z"}	1	2025-06-29 04:06:24.118201
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: auth; Owner: domainflow
--

COPY auth.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: auth; Owner: domainflow
--

COPY auth.permissions (id, name, display_name, description, resource, action, created_at) FROM stdin;
00000000-0000-0000-0001-000000000001	campaigns:create	Create Campaigns	Create new campaigns	campaigns	create	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000002	campaigns:read	Read Campaigns	View campaign details	campaigns	read	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000003	campaigns:update	Update Campaigns	Modify existing campaigns	campaigns	update	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000004	campaigns:delete	Delete Campaigns	Remove campaigns from system	campaigns	delete	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000005	campaigns:execute	Execute Campaigns	Start and stop campaign execution	campaigns	execute	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000006	personas:create	Create Personas	Create new validation personas	personas	create	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000007	personas:read	Read Personas	View persona configurations	personas	read	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000008	personas:update	Update Personas	Modify existing personas	personas	update	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000009	personas:delete	Delete Personas	Remove personas from system	personas	delete	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000010	proxies:create	Create Proxies	Add new proxy servers	proxies	create	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000011	proxies:read	Read Proxies	View proxy configurations and status	proxies	read	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000012	proxies:update	Update Proxies	Modify existing proxy settings	proxies	update	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000013	proxies:delete	Delete Proxies	Remove proxy servers	proxies	delete	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000014	system:admin	System Administration	Full administrative access to system	system	admin	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000015	system:config	System Configuration	Modify system configuration settings	system	config	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000016	users:manage	User Management	Create, update, and delete user accounts	users	manage	2025-06-17 15:10:46.091558
00000000-0000-0000-0001-000000000017	reports:generate	Generate Reports	Generate and export system reports	reports	generate	2025-06-17 15:10:46.091558
\.


--
-- Data for Name: rate_limits; Type: TABLE DATA; Schema: auth; Owner: domainflow
--

COPY auth.rate_limits (id, identifier, action, attempts, window_start, blocked_until) FROM stdin;
2	::1	login	2	2025-06-29 04:04:09.420287	\N
1	::1	ip	2	2025-06-29 04:16:24.375943	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: auth; Owner: domainflow
--

COPY auth.role_permissions (role_id, permission_id) FROM stdin;
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000001
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000002
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000003
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000004
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000005
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000006
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000007
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000008
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000009
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000010
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000011
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000012
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000013
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000014
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000015
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000016
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0001-000000000017
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000001
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000002
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000003
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000004
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000005
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000006
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000007
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000008
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000009
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000010
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000011
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000012
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000013
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000016
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0001-000000000017
00000000-0000-0000-0000-000000000003	00000000-0000-0000-0001-000000000001
00000000-0000-0000-0000-000000000003	00000000-0000-0000-0001-000000000002
00000000-0000-0000-0000-000000000003	00000000-0000-0000-0001-000000000003
00000000-0000-0000-0000-000000000003	00000000-0000-0000-0001-000000000005
00000000-0000-0000-0000-000000000003	00000000-0000-0000-0001-000000000007
00000000-0000-0000-0000-000000000003	00000000-0000-0000-0001-000000000011
00000000-0000-0000-0000-000000000004	00000000-0000-0000-0001-000000000002
00000000-0000-0000-0000-000000000004	00000000-0000-0000-0001-000000000007
00000000-0000-0000-0000-000000000004	00000000-0000-0000-0001-000000000011
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: auth; Owner: domainflow
--

COPY auth.roles (id, name, display_name, description, is_system_role, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	super_admin	Super Administrator	Full system access with all permissions	t	2025-06-17 15:10:46.089483	2025-06-17 15:10:46.089483
00000000-0000-0000-0000-000000000002	admin	Administrator	Administrative access to most system features	t	2025-06-17 15:10:46.089483	2025-06-17 15:10:46.089483
00000000-0000-0000-0000-000000000003	user	Standard User	Standard user with basic access permissions	t	2025-06-17 15:10:46.089483	2025-06-17 15:10:46.089483
00000000-0000-0000-0000-000000000004	viewer	Viewer	Read-only access to system resources	t	2025-06-17 15:10:46.089483	2025-06-17 15:10:46.089483
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: domainflow
--

COPY auth.sessions (id, user_id, ip_address, user_agent, user_agent_hash, session_fingerprint, browser_fingerprint, screen_resolution, is_active, expires_at, last_activity_at, created_at) FROM stdin;
067f9af9f38df55055eb31ef60c48a6482a39111c65b8698e032437caedeaa5beee99fe2e51869c6103db39ba6147dac9ad9b4c941b682e5c377b485c7b5a9c3	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	f873cb3aaeeccc99c1b70220d27bf89c734cfb356149aad1cb9e36f855bf126d	f238d12ea9c3231511776f091a7620aa6d44acfa6e08995a1268d512782acdb8	1b4145fc97cb1d67c53d03f0965ab435f649494c73488d0245e4e25d04825733	\N	f	2025-06-29 05:47:51.849037	2025-06-29 03:47:51.849037	2025-06-29 03:47:51.849037
4a20c1a3c026383ca4ef96db387bcfde6dae6891a5b09ea723d30854f3f8eb8baf086cf3582a62a148c2701a4c26170e5d4307835d90910d722c03ae0f91c9c7	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	::1	curl/8.12.1	6244b0b0f8bc783ee513d6e0f7de72eb0824fc62071ea908a925772caffdee3f	3db99287df9af8089aa93c0ffaa0740c4394c80ea0d353b2d778ad02477ff814	47423b4e7cac9ff4da16b3447963343d3f8e4ae00b0f385ed73ea109c1608e97	\N	f	2025-06-29 05:48:09.63977	2025-06-29 03:48:09.63977	2025-06-29 03:48:09.63977
038175c2fed077a7b27222f44216fdc53a3dcf08bc79bd9fa3521b1aa6a23ff9c01e1b5e5d46596d2ebc7096ea0969c5ab4e27f5087955f2ea64661675eacfd7	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	::1	node	545ea538461003efdc8c81c244531b003f6f26cfccf6c0073b3239fdedf49446	d3795cfefe99967eb94d39fd42b2d19b95b48457ebb370683b222979035cc0d1	a983fee6808d26730c4b761d7b78c670d4ea5a52a8ded9f459ba2f6d5e561081	\N	f	2025-06-29 05:50:48.344527	2025-06-29 03:50:48.344527	2025-06-29 03:50:48.344527
405f4cf11026994dec1fc6dcc74f9051920885c85b02f63404907f48ccad7ac5ee9c85884e70e5fd42f97cf589a2154baa29022b60161aa49a6c3e638c750410	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	::1	node	545ea538461003efdc8c81c244531b003f6f26cfccf6c0073b3239fdedf49446	d3795cfefe99967eb94d39fd42b2d19b95b48457ebb370683b222979035cc0d1	a983fee6808d26730c4b761d7b78c670d4ea5a52a8ded9f459ba2f6d5e561081	\N	f	2025-06-29 05:51:15.641657	2025-06-29 03:51:15.666688	2025-06-29 03:51:15.641657
08ca146538e7d386db0a9f3ae632209d45100e279285bdab03b1b2c005a5244a6e73da505e81d4810dad9180f58a919a970a29129546610f1cc6b30552d1e26b	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	f873cb3aaeeccc99c1b70220d27bf89c734cfb356149aad1cb9e36f855bf126d	f238d12ea9c3231511776f091a7620aa6d44acfa6e08995a1268d512782acdb8	1b4145fc97cb1d67c53d03f0965ab435f649494c73488d0245e4e25d04825733	\N	f	2025-06-29 05:54:24.648289	2025-06-29 03:54:24.648289	2025-06-29 03:54:24.648289
4a8d282de8377b343995f52cea157e35b9ed9258a3943394c25179bce46a307e0a2ee9c611f83a6ef3973a3a7457e68250cc3d514b58e0752007de7f060dec7a	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	f873cb3aaeeccc99c1b70220d27bf89c734cfb356149aad1cb9e36f855bf126d	f238d12ea9c3231511776f091a7620aa6d44acfa6e08995a1268d512782acdb8	1b4145fc97cb1d67c53d03f0965ab435f649494c73488d0245e4e25d04825733	\N	f	2025-06-29 05:55:02.600789	2025-06-29 03:55:06.348321	2025-06-29 03:55:02.600789
28ce61ce531bd0a8149fdf949a6c7ce46de84d0dc906416d7a518183e8d3e3a5a1c845b2597708ff2ca2772d037f340e10d31c2db6a23aa89761a017ee518dd6	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/138.0.7204.23 Safari/537.36	990e2919205ea8271f21c41a66f866ffb9560dcd0e3c2403b6417f251aa135c9	114a42dd71e7d08f63c0f376e603b1a7843c95d0b39dc7e233553bdb3417c9d7	ba3a64a9dbd1161165e86c8e4d49b3cfec4d6b9d781be1550975b1c05918a5fb	\N	f	2025-06-29 05:56:41.356248	2025-06-29 03:56:42.386936	2025-06-29 03:56:41.356248
8ea1ae02b5f41b71913917f51a655624c94ff61c8a0c24bba251f4e1fc6e62a7cb42166787c060634e76d234c158265a5876b35cf2bf77eb487cea84a785bdca	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	f873cb3aaeeccc99c1b70220d27bf89c734cfb356149aad1cb9e36f855bf126d	f238d12ea9c3231511776f091a7620aa6d44acfa6e08995a1268d512782acdb8	1b4145fc97cb1d67c53d03f0965ab435f649494c73488d0245e4e25d04825733	\N	f	2025-06-29 06:04:09.450543	2025-06-29 04:04:15.009535	2025-06-29 04:04:09.450543
3fabc7f67cb418629dcc71def268a5da982f1201019d8bc3444417b651113f1ff1817b6623c7d54fa077030d13add0f0b4f33c1084f217c85e5d107628fa5475	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	::1	curl/8.12.1	6244b0b0f8bc783ee513d6e0f7de72eb0824fc62071ea908a925772caffdee3f	3db99287df9af8089aa93c0ffaa0740c4394c80ea0d353b2d778ad02477ff814	47423b4e7cac9ff4da16b3447963343d3f8e4ae00b0f385ed73ea109c1608e97	\N	f	2025-06-29 06:06:24.109379	2025-06-29 04:06:24.109379	2025-06-29 04:06:24.109379
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: auth; Owner: domainflow
--

COPY auth.user_roles (user_id, role_id, assigned_by, assigned_at, expires_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: domainflow
--

COPY auth.users (id, email, email_verified, email_verification_token, email_verification_expires_at, password_hash, password_pepper_version, first_name, last_name, avatar_url, is_active, is_locked, failed_login_attempts, locked_until, last_login_at, last_login_ip, password_changed_at, must_change_password, created_at, updated_at, mfa_enabled, mfa_secret_encrypted, mfa_backup_codes_encrypted, mfa_last_used_at, encrypted_fields, security_questions_encrypted) FROM stdin;
10dea062-e5cc-4bef-8cbc-9271545e0970	admin@domainflow.com	t	\N	\N	$2a$06$5VYWbzyw5BRcB62Wtg0/e.KAviBmAujyoqa6mKctjoljA08g4Ol8O	1	Admin	User	\N	t	f	0	\N	\N	\N	2025-06-29 03:44:19.082407	f	2025-06-29 03:44:19.082407	2025-06-29 03:44:19.082407	f	\N	\N	\N	\N	\N
47ecb8b8-2fab-4d84-9447-f1adfe6dd078	dev@domainflow.com	t	\N	\N	$2a$06$AlqKHzIroX6I5QPv8BJjZ.XjCnnQocpzVjRrqtAiFPiq.5.jlAK2i	1	Developer	User	\N	t	f	0	\N	\N	\N	2025-06-29 03:44:19.10384	f	2025-06-29 03:44:19.10384	2025-06-29 03:44:19.10384	f	\N	\N	\N	\N	\N
26a0d6b7-207a-4775-98d5-2a2e9953b1b7	test@example.com	t	\N	\N	$2a$06$7E5CFIWeQF8tQzD6dQIJbuXGML19dOSRjXcRlp4HeNW8GGnDHGAIm	1	Test	User	\N	t	f	0	\N	2025-06-29 04:06:24.116521	::1	2025-06-29 03:37:04.58106	f	2025-06-29 03:37:04.58106	2025-06-29 04:30:12.445904	f	\N	\N	\N	\N	\N
\.


--
-- Data for Name: api_access_violations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.api_access_violations (id, user_id, session_id, endpoint_pattern, http_method, violation_type, required_permissions, user_permissions, resource_id, violation_details, source_ip, user_agent, request_headers, response_status, created_at) FROM stdin;
c23c0ae5-9c2b-4150-98cd-0697a8bbd999	a68c013a-7301-4997-a1ad-9aff3ebc2079	8b690d6722fe5985af04902c733466af3a5b74caa5a7222c8a75873d51987ae18dc01e8d438aa345584027f02f3ce0294eb38362aaa4681aae389dbbffbc5f06	/api/admin/*	GET	unauthorized_access	\N	\N		{"reason": "unknown_endpoint", "request_id": "test-request-dbe411ae-5370-44ca-9a3a-e012e107f9fa", "risk_score": 80, "campaign_id": "", "resource_type": "admin"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:32:39.94503+00
de5c0c92-3996-4b98-b51c-c865849bfbbe	a68c013a-7301-4997-a1ad-9aff3ebc2079	8b690d6722fe5985af04902c733466af3a5b74caa5a7222c8a75873d51987ae18dc01e8d438aa345584027f02f3ce0294eb38362aaa4681aae389dbbffbc5f06	/api/campaigns/:id	DELETE	unauthorized_access	\N	\N		{"reason": "ownership_required", "request_id": "test-request-0e04be76-4094-4a14-b098-c30c94292ddf", "risk_score": 85, "campaign_id": "", "resource_type": "campaign"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:32:40.322039+00
ec0527f0-1f61-409b-a7ec-992bf2932d32	a68c013a-7301-4997-a1ad-9aff3ebc2079	8b690d6722fe5985af04902c733466af3a5b74caa5a7222c8a75873d51987ae18dc01e8d438aa345584027f02f3ce0294eb38362aaa4681aae389dbbffbc5f06	/api/admin/*	GET	unauthorized_access	\N	\N		{"reason": "unknown_endpoint", "request_id": "test-request-a7b8e624-f2d0-409f-96c5-11d048097f3d", "risk_score": 80, "campaign_id": "", "resource_type": "admin"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:32:40.325507+00
c39270f4-9ae6-4cab-8051-9f57de44ca1b	a68c013a-7301-4997-a1ad-9aff3ebc2079	8b690d6722fe5985af04902c733466af3a5b74caa5a7222c8a75873d51987ae18dc01e8d438aa345584027f02f3ce0294eb38362aaa4681aae389dbbffbc5f06	/api/campaigns/:id	GET	unauthorized_access	\N	\N	24ff75c6-f2a4-4730-9982-758d809bf876	{"reason": "campaign_access_required", "request_id": "test-request-e79bd7ac-7a91-48b6-98d1-6938e46bf1d4", "risk_score": 65, "campaign_id": "24ff75c6-f2a4-4730-9982-758d809bf876", "resource_type": "campaign"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:32:40.343251+00
b87bebd2-2a06-4a6e-9695-82b777809529	949b1367-6790-43a5-aaa0-d1284f70e194	58f146e281e7e3ca4ceb67a3f1ca7ee212477c5129036914cfeffaa85f26817adeed88e4ac10cee3e1e7429ceec656b6a911b1bdb5a8244e6e89a9f8e498652a	/api/admin/*	GET	unauthorized_access	\N	\N		{"reason": "unknown_endpoint", "request_id": "test-request-19012ba5-2fec-4ee2-9d53-c08cce14755a", "risk_score": 80, "campaign_id": "", "resource_type": "admin"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:33:19.636382+00
c028e7fd-03ad-45fd-af5f-effa36231f9d	949b1367-6790-43a5-aaa0-d1284f70e194	58f146e281e7e3ca4ceb67a3f1ca7ee212477c5129036914cfeffaa85f26817adeed88e4ac10cee3e1e7429ceec656b6a911b1bdb5a8244e6e89a9f8e498652a	/api/campaigns/:id	DELETE	unauthorized_access	\N	\N		{"reason": "ownership_required", "request_id": "test-request-4f566ac8-9669-499a-8087-b121960a15ea", "risk_score": 85, "campaign_id": "", "resource_type": "campaign"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:33:20.183744+00
55b1b350-0adf-49d2-890e-11be190189b1	949b1367-6790-43a5-aaa0-d1284f70e194	58f146e281e7e3ca4ceb67a3f1ca7ee212477c5129036914cfeffaa85f26817adeed88e4ac10cee3e1e7429ceec656b6a911b1bdb5a8244e6e89a9f8e498652a	/api/admin/*	GET	unauthorized_access	\N	\N		{"reason": "unknown_endpoint", "request_id": "test-request-c3bd72af-088f-4fbe-9312-ae4c290df09e", "risk_score": 80, "campaign_id": "", "resource_type": "admin"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:33:20.211747+00
46a2eb6b-0d86-4402-be01-9629f1635b14	949b1367-6790-43a5-aaa0-d1284f70e194	58f146e281e7e3ca4ceb67a3f1ca7ee212477c5129036914cfeffaa85f26817adeed88e4ac10cee3e1e7429ceec656b6a911b1bdb5a8244e6e89a9f8e498652a	/api/campaigns/:id	GET	unauthorized_access	\N	\N	79e0151a-ea0f-48f0-82bb-797719b57f76	{"reason": "campaign_access_required", "request_id": "test-request-54267633-616e-4e53-bf3e-358b93acd81c", "risk_score": 65, "campaign_id": "79e0151a-ea0f-48f0-82bb-797719b57f76", "resource_type": "campaign"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:33:20.261632+00
6fb900c0-7a78-49f5-a174-f8da0f09814d	ceffe4f8-0b91-4860-98a2-bbdb2aafbda9	c386e5b962ab0976c9759775bbb9d08f21355a6de898fdda0c2fb7c46095eea212ccb1d7a1a7b5c6725bd54130d540feca8f10c7901ed95b92069a2971b7facd	/api/admin/*	GET	unauthorized_access	\N	\N		{"reason": "unknown_endpoint", "request_id": "test-request-fb1a4195-a25e-4850-a3fc-508f6d53236a", "risk_score": 80, "campaign_id": "", "resource_type": "admin"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:35:42.827463+00
63c4d569-6582-4370-90ce-bfa29994b2e8	ceffe4f8-0b91-4860-98a2-bbdb2aafbda9	c386e5b962ab0976c9759775bbb9d08f21355a6de898fdda0c2fb7c46095eea212ccb1d7a1a7b5c6725bd54130d540feca8f10c7901ed95b92069a2971b7facd	/api/campaigns/:id	DELETE	unauthorized_access	\N	\N		{"reason": "ownership_required", "request_id": "test-request-12590af0-c1ce-4b28-b6a7-05458987be29", "risk_score": 85, "campaign_id": "", "resource_type": "campaign"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:35:43.22972+00
7e9d4c36-3f7f-499f-9882-64903eb48440	ceffe4f8-0b91-4860-98a2-bbdb2aafbda9	c386e5b962ab0976c9759775bbb9d08f21355a6de898fdda0c2fb7c46095eea212ccb1d7a1a7b5c6725bd54130d540feca8f10c7901ed95b92069a2971b7facd	/api/admin/*	GET	unauthorized_access	\N	\N		{"reason": "unknown_endpoint", "request_id": "test-request-db40aa46-be9c-405d-904d-027800086c2d", "risk_score": 80, "campaign_id": "", "resource_type": "admin"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:35:43.243251+00
5adcfb0a-32fc-4e0e-a039-2cd691e3a82f	ceffe4f8-0b91-4860-98a2-bbdb2aafbda9	c386e5b962ab0976c9759775bbb9d08f21355a6de898fdda0c2fb7c46095eea212ccb1d7a1a7b5c6725bd54130d540feca8f10c7901ed95b92069a2971b7facd	/api/campaigns/:id	GET	unauthorized_access	\N	\N	88e75538-ebf7-428a-b189-982ae95c9152	{"reason": "campaign_access_required", "request_id": "test-request-9aeff6f0-b002-410d-9283-f2f8b00ee7d7", "risk_score": 65, "campaign_id": "88e75538-ebf7-428a-b189-982ae95c9152", "resource_type": "campaign"}	127.0.0.1		{"test": "context"}	403	2025-06-22 20:35:43.282199+00
\.


--
-- Data for Name: architecture_refactor_log; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.architecture_refactor_log (id, service_name, refactor_type, before_pattern, after_pattern, complexity_reduction, performance_impact, rollback_plan, implemented_by, implemented_at) FROM stdin;
\.


--
-- Data for Name: async_task_status; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.async_task_status (id, task_id, task_type, status, progress_percentage, total_items, processed_items, user_id, campaign_id, error_message, started_at, completed_at, estimated_completion_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.audit_logs (id, "timestamp", user_id, action, entity_type, entity_id, details, client_ip, user_agent, authorization_context, security_level, access_decision, permission_checked, resource_sensitivity) FROM stdin;
33cdcc92-44d7-47df-a91a-8ea240b3293f	2025-06-29 02:55:27.669834+00	\N	Domain Generation Campaign Created (Service)	Campaign	97cb0c6e-51df-4e27-bf25-473cb5be7725	{"description": "Name: test-pf001-query-1751165727664868289, ConfigHash: 9cf474ae1ebbc228e26dc9f13a6afee5e35af9fbe12bed39aa90b2c0663535f2, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-pf001-query-1751165727664868289"}	\N	\N	{}	standard	unknown	\N	normal
e5f70444-f566-48ab-ba54-086299d8ca1c	2025-06-29 02:55:27.696545+00	\N	Domain Generation Campaign Created (Service)	Campaign	3802d334-279b-44b9-b26d-3cd5cc1aa794	{"description": "Name: pf002-response-test, ConfigHash: b11aa71328d3585139f4dfeadbac52719d1cb44c03bc1d33727a1e4cb437cdcb, StartOffset: 0, RequestedForInstance: 2000, ActualTotalItemsForThisRun: 2000", "campaign_name": "pf002-response-test"}	\N	\N	{}	standard	unknown	\N	normal
7d75461e-a624-4791-881a-4d97f0bedec1	2025-06-29 02:55:27.703407+00	\N	Domain Generation Campaign Created (Service)	Campaign	dfdbc118-4973-46de-a1f9-2302f95fc1fd	{"description": "Name: test-pf002-response-1751165727701059496, ConfigHash: 18d11a49c03538b745fceb71a30c614063fb13e0d9ac893eaabebe3ce34ec13a, StartOffset: 0, RequestedForInstance: 256, ActualTotalItemsForThisRun: 256", "campaign_name": "test-pf002-response-1751165727701059496"}	\N	\N	{}	standard	unknown	\N	normal
1fdc0e45-4c10-4d69-aecd-f90b01046e8c	2025-06-29 02:55:27.708637+00	\N	Domain Generation Campaign Created (Service)	Campaign	ccd78f24-012e-45e9-8478-18a0f99eeaa4	{"description": "Name: test-pf003-batch-0-1751165727706633423, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-0-1751165727706633423"}	\N	\N	{}	standard	unknown	\N	normal
586e9f57-d1f2-4e85-8e67-dea2b1d5161c	2025-06-29 02:55:27.713638+00	\N	Domain Generation Campaign Created (Service)	Campaign	ef61a0e5-43f9-4ff9-94f1-5fcb189d5dd5	{"description": "Name: test-pf003-batch-1-1751165727711563906, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-1-1751165727711563906"}	\N	\N	{}	standard	unknown	\N	normal
524cc324-614f-4e57-8c79-a781502f4207	2025-06-29 02:55:27.718404+00	\N	Domain Generation Campaign Created (Service)	Campaign	43f68735-5be4-4f2e-b2c5-6ad4bcb9a3bb	{"description": "Name: test-pf003-batch-2-1751165727716669109, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-2-1751165727716669109"}	\N	\N	{}	standard	unknown	\N	normal
f5b6ec5f-6118-4740-978c-740a9c403c6a	2025-06-29 02:55:27.723273+00	\N	Domain Generation Campaign Created (Service)	Campaign	6f74e2ca-a6cf-4426-9172-6ee055cb5396	{"description": "Name: test-pf003-batch-3-1751165727721200319, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-3-1751165727721200319"}	\N	\N	{}	standard	unknown	\N	normal
3943229c-6cc8-4ad5-9393-f8d8f1e575a6	2025-06-29 02:55:27.727786+00	\N	Domain Generation Campaign Created (Service)	Campaign	339f10be-a2c2-4e2b-bad3-ac53336c8161	{"description": "Name: test-pf003-batch-4-1751165727725918989, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-4-1751165727725918989"}	\N	\N	{}	standard	unknown	\N	normal
eac81557-099e-4d28-8549-dc36dc6e6150	2025-06-29 02:55:27.732264+00	\N	Domain Generation Campaign Created (Service)	Campaign	97e37fcc-8e2e-4364-8d49-6936448c1dbf	{"description": "Name: test-pf003-batch-5-1751165727730363197, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-5-1751165727730363197"}	\N	\N	{}	standard	unknown	\N	normal
e8e65a0a-3266-44d1-a43b-1863e496e609	2025-06-29 02:55:27.737686+00	\N	Domain Generation Campaign Created (Service)	Campaign	f297a9af-2a68-4fbb-ac94-d175b09ba4bd	{"description": "Name: test-pf003-batch-6-1751165727735229216, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-6-1751165727735229216"}	\N	\N	{}	standard	unknown	\N	normal
f33e0640-5ea5-46d3-a6ce-4248a23ea619	2025-06-29 02:55:27.742059+00	\N	Domain Generation Campaign Created (Service)	Campaign	7872e621-1131-48f8-a775-53e908a6cbd0	{"description": "Name: test-pf003-batch-7-1751165727740091445, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-7-1751165727740091445"}	\N	\N	{}	standard	unknown	\N	normal
bd9baa05-6ef1-4157-bf0f-a6ef26e50ac2	2025-06-29 02:55:27.746845+00	\N	Domain Generation Campaign Created (Service)	Campaign	93049707-bb8c-464e-96e2-558a49697d12	{"description": "Name: test-pf003-batch-8-1751165727745014602, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-8-1751165727745014602"}	\N	\N	{}	standard	unknown	\N	normal
e45b80e6-56e5-4117-9ead-93c106245d6f	2025-06-29 02:55:27.754726+00	\N	Domain Generation Campaign Created (Service)	Campaign	be5bc755-dff3-4704-8540-30faac9f96a9	{"description": "Name: test-pf003-batch-9-1751165727752306230, ConfigHash: 09539807cab11f34b20aef33826b19f9184e60579becca1be95946c5e3316b36, StartOffset: 0, RequestedForInstance: 16, ActualTotalItemsForThisRun: 16", "campaign_name": "test-pf003-batch-9-1751165727752306230"}	\N	\N	{}	standard	unknown	\N	normal
7dc3ffa1-0207-4a0b-ad6d-d9db6821e847	2025-06-29 02:55:27.784989+00	\N	Domain Generation Campaign Created (Service)	Campaign	f484cd2e-d849-43a6-b5f6-f210eddd84ff	{"description": "Name: test-pf004-cache-original-1751165727782855988, ConfigHash: 25fac8e52d22fddc9f5ccdafa9a70aaf5b134e1838a896201a207c53cb10c92d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-pf004-cache-original-1751165727782855988"}	\N	\N	{}	standard	unknown	\N	normal
d94e5ce2-5632-4e16-8c44-a3c5a922c56c	2025-06-29 02:55:27.790075+00	\N	Domain Generation Campaign Created (Service)	Campaign	bc1fc58a-dbd6-4c30-983e-542819c456dc	{"description": "Name: test-pf004-cache-similar-1751165727788042177, ConfigHash: 25fac8e52d22fddc9f5ccdafa9a70aaf5b134e1838a896201a207c53cb10c92d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-pf004-cache-similar-1751165727788042177"}	\N	\N	{}	standard	unknown	\N	normal
417e9625-a507-4598-8d47-709aaed5850c	2025-06-29 02:55:27.797416+00	\N	Domain Generation Campaign Created (Service)	Campaign	180b3bb6-cec6-46da-a940-99310c20c627	{"description": "Name: test-integration-si004-1751165727794979447-0, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727794979447-0"}	\N	\N	{}	standard	unknown	\N	normal
0ea7a097-716f-4ab7-86a1-ad16578558ea	2025-06-29 02:55:27.807362+00	\N	Domain Generation Campaign Created (Service)	Campaign	2b7e0d22-8d84-40ee-a7e4-488c98884c20	{"description": "Name: test-integration-si004-1751165727805183243-1, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727805183243-1"}	\N	\N	{}	standard	unknown	\N	normal
786fdfc4-d8aa-4d01-a09d-4e87733e52a0	2025-06-29 02:55:27.812085+00	\N	Domain Generation Campaign Created (Service)	Campaign	87f239e0-0fe8-4005-8f0c-ee5b549634e9	{"description": "Name: test-integration-si004-1751165727810033676-2, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727810033676-2"}	\N	\N	{}	standard	unknown	\N	normal
effcb2a6-87a1-43fa-a09c-c6703db06f85	2025-06-29 02:55:27.817043+00	\N	Domain Generation Campaign Created (Service)	Campaign	e6fd8a5e-3e1e-43ff-9866-39ea6ce05d6f	{"description": "Name: test-integration-si004-1751165727814836219-3, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727814836219-3"}	\N	\N	{}	standard	unknown	\N	normal
a3ae49ca-4345-4e32-aece-1adf0247e671	2025-06-29 02:55:27.821166+00	\N	Domain Generation Campaign Created (Service)	Campaign	b9fb796a-2f61-4b14-bb84-f0a5d309b93a	{"description": "Name: test-integration-si004-1751165727819187792-4, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727819187792-4"}	\N	\N	{}	standard	unknown	\N	normal
15e28920-6378-4810-8a6c-5db601977ee1	2025-06-29 02:55:27.825226+00	\N	Domain Generation Campaign Created (Service)	Campaign	ab8b2216-0969-4d26-8a02-2d141130c638	{"description": "Name: test-integration-si004-1751165727823998035-5, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727823998035-5"}	\N	\N	{}	standard	unknown	\N	normal
0922ff0e-e985-49cd-a097-10ae1107ba44	2025-06-29 02:55:27.827667+00	\N	Domain Generation Campaign Created (Service)	Campaign	2b0b1b73-5913-42fe-a8f6-aca2e0b983a7	{"description": "Name: test-integration-si004-1751165727826563621-6, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727826563621-6"}	\N	\N	{}	standard	unknown	\N	normal
cf9f7ed7-8563-4e94-9e3f-de7b70ae5563	2025-06-29 02:55:27.833623+00	\N	Domain Generation Campaign Created (Service)	Campaign	4060103c-adfc-4609-bf2b-16e6dbbbe1d0	{"description": "Name: test-integration-si004-1751165727829139081-7, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727829139081-7"}	\N	\N	{}	standard	unknown	\N	normal
5af7f9cc-8ca2-453a-83d1-07cd907303bb	2025-06-29 02:55:27.83851+00	\N	Domain Generation Campaign Created (Service)	Campaign	bcd9123b-0607-4ffc-b3cd-8273fe1107a6	{"description": "Name: test-integration-si004-1751165727836293504-8, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727836293504-8"}	\N	\N	{}	standard	unknown	\N	normal
48b70f9d-9986-4970-b83a-bbb13c350bb3	2025-06-29 02:55:27.843167+00	\N	Domain Generation Campaign Created (Service)	Campaign	39a0fd00-a3eb-4972-b264-ee8afcedbf46	{"description": "Name: test-integration-si004-1751165727841314085-9, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727841314085-9"}	\N	\N	{}	standard	unknown	\N	normal
4a1b04ea-6b3a-408c-9c4e-934514934619	2025-06-29 02:55:27.848559+00	\N	Domain Generation Campaign Created (Service)	Campaign	611ea2dc-30c2-4853-9dab-8b52c6e8efa6	{"description": "Name: test-integration-si004-1751165727845821202-10, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727845821202-10"}	\N	\N	{}	standard	unknown	\N	normal
f70e711e-0dbb-45c8-a558-54c0bcdb7e80	2025-06-29 02:55:27.853262+00	\N	Domain Generation Campaign Created (Service)	Campaign	cac344e6-49e5-4b6c-b002-66976e485609	{"description": "Name: test-integration-si004-1751165727851249130-11, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727851249130-11"}	\N	\N	{}	standard	unknown	\N	normal
3291dd18-27b4-4626-9151-43afabf26f23	2025-06-29 02:55:27.861652+00	\N	Domain Generation Campaign Created (Service)	Campaign	15b7f0eb-4734-4e8d-890c-110ddf145254	{"description": "Name: test-integration-si004-1751165727856051803-12, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727856051803-12"}	\N	\N	{}	standard	unknown	\N	normal
1d9aaa3d-9526-4db7-932b-c5484dfcd21b	2025-06-29 02:55:27.866648+00	\N	Domain Generation Campaign Created (Service)	Campaign	c8d86e00-41fb-469b-a0b6-e50f44e2f3a9	{"description": "Name: test-integration-si004-1751165727864574851-13, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727864574851-13"}	\N	\N	{}	standard	unknown	\N	normal
6de06e34-5f2d-4ef6-bf64-632fe4693da1	2025-06-29 02:55:27.871524+00	\N	Domain Generation Campaign Created (Service)	Campaign	04ee839d-5991-4a26-96fe-14d23bf8a526	{"description": "Name: test-integration-si004-1751165727869518566-14, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727869518566-14"}	\N	\N	{}	standard	unknown	\N	normal
b5ea715f-afd6-4b63-ad05-a5554c295be6	2025-06-29 02:55:27.876203+00	\N	Domain Generation Campaign Created (Service)	Campaign	7859097f-2538-44c7-a65a-746808d6ec88	{"description": "Name: test-integration-si004-1751165727874361927-15, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727874361927-15"}	\N	\N	{}	standard	unknown	\N	normal
c722005c-707d-4a5d-9f01-a141bcc02278	2025-06-29 02:55:27.883411+00	\N	Domain Generation Campaign Created (Service)	Campaign	6c5b074e-22ab-449b-aecf-91a3ee48ad1c	{"description": "Name: test-integration-si004-1751165727879179583-16, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727879179583-16"}	\N	\N	{}	standard	unknown	\N	normal
6348df3a-98e1-499b-b066-4391bd4f341d	2025-06-29 02:55:27.888207+00	\N	Domain Generation Campaign Created (Service)	Campaign	4bae218d-5cea-4ede-a1b2-f3ce15b604df	{"description": "Name: test-integration-si004-1751165727886338724-17, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727886338724-17"}	\N	\N	{}	standard	unknown	\N	normal
e2b7337b-34c3-4e86-9d1d-5c2f6f8160ab	2025-06-29 02:55:27.893107+00	\N	Domain Generation Campaign Created (Service)	Campaign	f65e7d07-9418-4804-b4ba-be83e3513384	{"description": "Name: test-integration-si004-1751165727891058203-18, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727891058203-18"}	\N	\N	{}	standard	unknown	\N	normal
ccd571d8-ab88-4ca4-9100-447850bab24c	2025-06-29 02:55:27.899846+00	\N	Domain Generation Campaign Created (Service)	Campaign	59cc807d-c2c1-4c5b-b225-451815ab4c1f	{"description": "Name: test-integration-si004-1751165727896928471-19, ConfigHash: b4caa9f5cdcc264f357b9aea21d978549be5f99eb5963b69ef3e88a996ed3be4, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si004-1751165727896928471-19"}	\N	\N	{}	standard	unknown	\N	normal
038b8e4a-6ed3-4984-b7e9-8c9200989d65	2025-06-29 02:55:27.905233+00	\N	Domain Generation Campaign Created (Service)	Campaign	9d9b175a-de0e-45e3-89dd-f0a3e9ac8e6f	{"description": "Name: test-integration-si005-1751165727902420463, ConfigHash: b3085e7ed6e20cc85c01b0be7c58f724a26a82d8e9df0f70277d2bb25e13e39b, StartOffset: 0, RequestedForInstance: 4, ActualTotalItemsForThisRun: 4", "campaign_name": "test-integration-si005-1751165727902420463"}	\N	\N	{}	standard	unknown	\N	normal
f3443fc0-3452-4ce3-bb4d-75b4dacc8570	2025-06-29 02:55:27.925753+00	\N	Domain Generation Campaign Created (Service)	Campaign	6f15e0cb-9c76-4959-89d4-fd66107d2624	{"description": "Name: test-si004-campaign-49-1751165727913369885, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-49-1751165727913369885"}	\N	\N	{}	standard	unknown	\N	normal
c325d81e-e460-4ad4-94ee-724db89e7dad	2025-06-29 02:55:27.966036+00	\N	Domain Generation Campaign Created (Service)	Campaign	9589c218-2a60-407a-b8ce-5cbff00e78ef	{"description": "Name: test-si004-campaign-23-1751165727922536441, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-23-1751165727922536441"}	\N	\N	{}	standard	unknown	\N	normal
0061c6ef-cac2-405c-8e2c-61f499546dcb	2025-06-29 02:55:27.974383+00	\N	Domain Generation Campaign Created (Service)	Campaign	d3c3a0d1-aafb-4efd-a774-20d9d0c185fc	{"description": "Name: test-si004-campaign-42-1751165727914276348, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-42-1751165727914276348"}	\N	\N	{}	standard	unknown	\N	normal
ee04e6f1-89c3-4c66-a272-a3643e40b7bc	2025-06-29 02:55:27.975843+00	\N	Domain Generation Campaign Created (Service)	Campaign	bbd0cb32-dbb1-4435-8549-30bd48656117	{"description": "Name: test-si004-campaign-24-1751165727913842388, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-24-1751165727913842388"}	\N	\N	{}	standard	unknown	\N	normal
5d3986c7-6e11-4f91-9026-1990bfed8ce7	2025-06-29 02:55:27.974249+00	\N	Domain Generation Campaign Created (Service)	Campaign	4018abf6-3780-4973-aa6d-735474d77c4b	{"description": "Name: test-si004-campaign-1-1751165727914195009, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-1-1751165727914195009"}	\N	\N	{}	standard	unknown	\N	normal
e059a98b-b92a-485f-8360-ee22c1be6615	2025-06-29 02:55:27.994536+00	\N	Domain Generation Campaign Created (Service)	Campaign	6f682b4d-e0c1-48a9-90fa-ccd5cb9c0b1a	{"description": "Name: test-si004-campaign-41-1751165727914241549, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-41-1751165727914241549"}	\N	\N	{}	standard	unknown	\N	normal
8cb02bc2-666e-416b-8dcd-b8277b6949f9	2025-06-29 02:55:27.98154+00	\N	Domain Generation Campaign Created (Service)	Campaign	67565dc1-76f1-41db-b2ab-dcbf765e2c30	{"description": "Name: test-si004-campaign-25-1751165727914150792, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-25-1751165727914150792"}	\N	\N	{}	standard	unknown	\N	normal
917e3d1e-9ef5-476d-b825-2aad76267dc6	2025-06-29 02:55:27.976146+00	\N	Domain Generation Campaign Created (Service)	Campaign	eacd36f2-4cb2-4dc1-a45b-d5326df8026a	{"description": "Name: test-si004-campaign-0-1751165727913539954, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-0-1751165727913539954"}	\N	\N	{}	standard	unknown	\N	normal
2535dd0d-048a-4df4-9bf0-f7e781ff6162	2025-06-29 02:55:28.01713+00	\N	Domain Generation Campaign Created (Service)	Campaign	07b70964-acdb-40cf-b6cc-dc6a0bbbb1cb	{"description": "Name: test-si004-campaign-27-1751165727914366601, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-27-1751165727914366601"}	\N	\N	{}	standard	unknown	\N	normal
3878b3c1-79f2-4871-85ef-2d8a7d7383bc	2025-06-29 02:55:28.017595+00	\N	Domain Generation Campaign Created (Service)	Campaign	34cbdc91-f13d-4371-a254-977ee8ff1c37	{"description": "Name: test-si004-campaign-40-1751165727914088166, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-40-1751165727914088166"}	\N	\N	{}	standard	unknown	\N	normal
3faff4b4-9a39-40ee-a4c0-b8d79d2a5ad9	2025-06-29 02:55:27.981971+00	\N	Domain Generation Campaign Created (Service)	Campaign	aeef9d75-f192-4a6a-b65b-05e6b032364d	{"description": "Name: test-si004-campaign-37-1751165727913935630, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-37-1751165727913935630"}	\N	\N	{}	standard	unknown	\N	normal
519c5235-8add-44fb-b02d-483cc3f0929e	2025-06-29 02:55:28.016758+00	\N	Domain Generation Campaign Created (Service)	Campaign	df87239c-6c0b-49c7-b092-e791efdaa738	{"description": "Name: test-si004-campaign-38-1751165727914043466, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-38-1751165727914043466"}	\N	\N	{}	standard	unknown	\N	normal
d060d151-bd75-4865-ba2b-891120c8815c	2025-06-29 02:55:27.992269+00	\N	Domain Generation Campaign Created (Service)	Campaign	0ba93720-102e-4f40-ab10-43476c825426	{"description": "Name: test-si004-campaign-36-1751165727913849312, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-36-1751165727913849312"}	\N	\N	{}	standard	unknown	\N	normal
47fd6413-91f5-42e9-9b3a-7662ba27b9da	2025-06-29 02:55:28.066321+00	\N	Domain Generation Campaign Created (Service)	Campaign	e11f9e93-ab6e-41d3-8736-0b41a50d466c	{"description": "Name: test-si004-campaign-39-1751165727914068878, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-39-1751165727914068878"}	\N	\N	{}	standard	unknown	\N	normal
750cd1ee-38f2-4bf4-83c1-cb90ee3570ad	2025-06-29 02:55:28.065821+00	\N	Domain Generation Campaign Created (Service)	Campaign	4e18a503-c0a4-48f5-a804-4b106715d3eb	{"description": "Name: test-si004-campaign-31-1751165727916831909, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-31-1751165727916831909"}	\N	\N	{}	standard	unknown	\N	normal
05d76de3-4de4-4e6a-ada1-e06cd88fab0c	2025-06-29 02:55:27.989012+00	\N	Domain Generation Campaign Created (Service)	Campaign	f4e11983-4aa2-4db9-9049-e3192ec42330	{"description": "Name: test-si004-campaign-16-1751165727922273226, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-16-1751165727922273226"}	\N	\N	{}	standard	unknown	\N	normal
76799c44-275f-4cba-b9a4-ebdc0f372ab5	2025-06-29 02:55:28.093673+00	\N	Domain Generation Campaign Created (Service)	Campaign	0c40c73f-f9f2-4ca4-a5ca-18b08f908112	{"description": "Name: test-si004-campaign-33-1751165727919096344, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-33-1751165727919096344"}	\N	\N	{}	standard	unknown	\N	normal
994ca2e3-21fa-4384-bd00-06ec72db8945	2025-06-29 02:55:28.085578+00	\N	Domain Generation Campaign Created (Service)	Campaign	07e582e7-6e18-4418-acb4-b785dda37626	{"description": "Name: test-si004-campaign-29-1751165727914407144, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-29-1751165727914407144"}	\N	\N	{}	standard	unknown	\N	normal
033fe1d7-ec4b-4754-beb7-5ed69594eb73	2025-06-29 02:55:28.093618+00	\N	Domain Generation Campaign Created (Service)	Campaign	1c54ea35-f46c-42d1-a38a-0e2c5162cdb9	{"description": "Name: test-si004-campaign-19-1751165727922528342, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-19-1751165727922528342"}	\N	\N	{}	standard	unknown	\N	normal
78da1c5a-1d65-4e0c-ab24-7e9b818b69c4	2025-06-29 02:55:28.09548+00	\N	Domain Generation Campaign Created (Service)	Campaign	3e1a5cf6-70f5-4ff3-92b7-7680bcb57607	{"description": "Name: test-si004-campaign-47-1751165727923124253, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-47-1751165727923124253"}	\N	\N	{}	standard	unknown	\N	normal
b7ab2eb6-af59-41c0-8f2e-ac3c14ce2a7c	2025-06-29 02:55:28.094745+00	\N	Domain Generation Campaign Created (Service)	Campaign	b9362ffb-d7e5-4239-ba0e-864990fea84a	{"description": "Name: test-si004-campaign-14-1751165727923087733, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-14-1751165727923087733"}	\N	\N	{}	standard	unknown	\N	normal
f278f013-6b45-4816-91f1-75be02faa336	2025-06-29 02:55:28.085567+00	\N	Domain Generation Campaign Created (Service)	Campaign	fef60d2e-ab9d-48e2-b1fe-71a5d792518b	{"description": "Name: test-si004-campaign-13-1751165727923044871, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-13-1751165727923044871"}	\N	\N	{}	standard	unknown	\N	normal
0b5ad20c-d49e-4528-813c-a6454af0ec71	2025-06-29 02:55:28.120409+00	\N	Domain Generation Campaign Created (Service)	Campaign	59d0a789-1d4d-4e7c-87d5-7f2424b0f280	{"description": "Name: test-si004-campaign-10-1751165727922190090, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-10-1751165727922190090"}	\N	\N	{}	standard	unknown	\N	normal
88841f77-4cac-4a2c-b0fd-d5423ac93000	2025-06-29 02:55:28.121014+00	\N	Domain Generation Campaign Created (Service)	Campaign	fa46dc16-a180-4691-9211-649d485f369f	{"description": "Name: test-si004-campaign-28-1751165727914387956, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-28-1751165727914387956"}	\N	\N	{}	standard	unknown	\N	normal
c02aac7b-5f34-4ec1-87a2-3857aa10c22e	2025-06-29 02:55:28.144106+00	\N	Domain Generation Campaign Created (Service)	Campaign	15c9c830-3610-478c-81ed-65e511d705ae	{"description": "Name: test-si004-campaign-44-1751165727919918790, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-44-1751165727919918790"}	\N	\N	{}	standard	unknown	\N	normal
a63f63cb-d39e-44de-bc85-5d3a6f10400c	2025-06-29 02:55:28.144342+00	\N	Domain Generation Campaign Created (Service)	Campaign	6eaa23b8-ce25-409e-8e3a-18e7fb8c05e6	{"description": "Name: test-si004-campaign-3-1751165727914415255, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-3-1751165727914415255"}	\N	\N	{}	standard	unknown	\N	normal
ed3e83cf-8277-42fe-b01a-8453c6fbe20e	2025-06-29 02:55:28.133926+00	\N	Domain Generation Campaign Created (Service)	Campaign	daa5c354-5367-4cb7-a765-059e230ed861	{"description": "Name: test-si004-campaign-9-1751165727922107767, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-9-1751165727922107767"}	\N	\N	{}	standard	unknown	\N	normal
e5143618-a203-495f-b68d-228918611190	2025-06-29 02:55:28.145522+00	\N	Domain Generation Campaign Created (Service)	Campaign	8a8cc72a-7543-4c3d-a8f2-46b881c90851	{"description": "Name: test-si004-campaign-4-1751165727914449777, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-4-1751165727914449777"}	\N	\N	{}	standard	unknown	\N	normal
e78e29cb-0bf0-405b-9ad5-9be103e877c4	2025-06-29 02:55:28.150079+00	\N	Domain Generation Campaign Created (Service)	Campaign	26636576-83be-49e2-b507-b8a9cb31018d	{"description": "Name: test-si004-campaign-2-1751165727914236265, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-2-1751165727914236265"}	\N	\N	{}	standard	unknown	\N	normal
33b8489a-d771-47da-93c8-4a0ab3b856dd	2025-06-29 02:55:28.132656+00	\N	Domain Generation Campaign Created (Service)	Campaign	cd9c2749-9432-42be-b3c3-c079c3621e49	{"description": "Name: test-si004-campaign-21-1751165727922532307, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-21-1751165727922532307"}	\N	\N	{}	standard	unknown	\N	normal
4c6611c2-5a73-4229-a281-af72ff99ef1f	2025-06-29 02:55:28.150629+00	\N	Domain Generation Campaign Created (Service)	Campaign	064dfb75-41e2-4f4b-a1d8-7c9eca7e6bec	{"description": "Name: test-si004-campaign-17-1751165727922520677, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-17-1751165727922520677"}	\N	\N	{}	standard	unknown	\N	normal
79f88422-357b-4ca0-8ca4-9f1af418eb9d	2025-06-29 02:55:28.093116+00	\N	Domain Generation Campaign Created (Service)	Campaign	3c6b38ca-7138-4c7a-8a1d-6b8ed2e6dbc2	{"description": "Name: test-si004-campaign-30-1751165727916792910, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-30-1751165727916792910"}	\N	\N	{}	standard	unknown	\N	normal
790cc9cc-4f00-4231-8e5f-0d147814d365	2025-06-29 02:55:28.149777+00	\N	Domain Generation Campaign Created (Service)	Campaign	5b21bdde-a1c5-453c-a572-8eb9a30766e4	{"description": "Name: test-si004-campaign-48-1751165727923107172, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-48-1751165727923107172"}	\N	\N	{}	standard	unknown	\N	normal
7c45924e-bb6e-4a2c-82a7-6a70271dc6a0	2025-06-29 02:55:28.094792+00	\N	Domain Generation Campaign Created (Service)	Campaign	fd1618d3-be81-4fd6-9c4c-71b92c6a9cce	{"description": "Name: test-si004-campaign-32-1751165727919055435, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-32-1751165727919055435"}	\N	\N	{}	standard	unknown	\N	normal
d4097ce4-aa8c-43d8-9d39-5d6d69add0de	2025-06-29 02:55:28.179363+00	\N	Domain Generation Campaign Created (Service)	Campaign	2531cb33-c440-4c4b-a768-8b2846644c18	{"description": "Name: test-si004-campaign-12-1751165727922166494, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-12-1751165727922166494"}	\N	\N	{}	standard	unknown	\N	normal
552fdb6b-f327-4a7a-ac6e-151cff77b46e	2025-06-29 02:55:28.164221+00	\N	Domain Generation Campaign Created (Service)	Campaign	eee979dc-f4ad-42dd-893c-ba11a6d7f4bb	{"description": "Name: test-si004-campaign-43-1751165727914298376, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-43-1751165727914298376"}	\N	\N	{}	standard	unknown	\N	normal
76571b42-e7a1-4567-85ac-1a6f7708c905	2025-06-29 02:55:28.173139+00	\N	Domain Generation Campaign Created (Service)	Campaign	9ed4ac1f-6986-4081-9a6c-250a0c87b367	{"description": "Name: test-si004-campaign-20-1751165727922530079, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-20-1751165727922530079"}	\N	\N	{}	standard	unknown	\N	normal
db04d827-89d4-4794-8a5d-35b6aebddd1b	2025-06-29 02:55:28.196883+00	\N	Domain Generation Campaign Created (Service)	Campaign	7c7244fc-4fd8-4406-a3ac-f3f1b9f8653b	{"description": "Name: test-si004-campaign-46-1751165727923123558, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-46-1751165727923123558"}	\N	\N	{}	standard	unknown	\N	normal
c99cfd51-ac6d-456c-b590-883f3d21dee1	2025-06-29 02:55:28.08581+00	\N	Domain Generation Campaign Created (Service)	Campaign	f8721da9-66ce-472f-827e-a3bbd05ef9cb	{"description": "Name: test-si004-campaign-6-1751165727922555092, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-6-1751165727922555092"}	\N	\N	{}	standard	unknown	\N	normal
9f1c063b-e94b-4856-9945-4eec32341518	2025-06-29 02:55:28.183301+00	\N	Domain Generation Campaign Created (Service)	Campaign	2be1630c-4aab-4e8e-a226-a2737a100314	{"description": "Name: test-si004-campaign-5-1751165727914567827, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-5-1751165727914567827"}	\N	\N	{}	standard	unknown	\N	normal
560a20c3-3894-4282-bb1c-69808d556145	2025-06-29 02:55:28.213322+00	\N	Domain Generation Campaign Created (Service)	Campaign	2a23ae16-2b75-4585-a84b-06b0791c2ca2	{"description": "Name: test-si004-campaign-45-1751165727923121776, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-45-1751165727923121776"}	\N	\N	{}	standard	unknown	\N	normal
3e9bac5f-2ed9-40d0-a9f5-03bcf1dbb3aa	2025-06-29 02:55:28.109045+00	\N	Domain Generation Campaign Created (Service)	Campaign	2a51ec76-36a1-4c9c-a5a6-5defbcb89206	{"description": "Name: test-si004-campaign-26-1751165727914326285, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-26-1751165727914326285"}	\N	\N	{}	standard	unknown	\N	normal
1ce1b5d1-91b8-4c3f-87d7-9b1b77fa8608	2025-06-29 02:55:28.216186+00	\N	Domain Generation Campaign Created (Service)	Campaign	73daf8eb-abaa-4ac6-8dfe-79e2ff9acf03	{"description": "Name: test-si004-campaign-18-1751165727922529362, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-18-1751165727922529362"}	\N	\N	{}	standard	unknown	\N	normal
d5c558ba-5b18-4863-b795-af2f2aae3000	2025-06-29 02:55:28.213193+00	\N	Domain Generation Campaign Created (Service)	Campaign	67a1db60-8723-4cda-8754-e070edffd769	{"description": "Name: test-si004-campaign-7-1751165727921912974, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-7-1751165727921912974"}	\N	\N	{}	standard	unknown	\N	normal
fced6ef4-4f30-4deb-aa71-bdf87ca114af	2025-06-29 02:55:28.178105+00	\N	Domain Generation Campaign Created (Service)	Campaign	28193bd2-d124-49cb-9b66-7d5e802f6dca	{"description": "Name: test-si004-campaign-11-1751165727922380879, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-11-1751165727922380879"}	\N	\N	{}	standard	unknown	\N	normal
4e114518-7653-4ad0-a7d5-add9946b916c	2025-06-29 02:55:28.180607+00	\N	Domain Generation Campaign Created (Service)	Campaign	027042c3-44a6-4829-af47-dc3abd4e4a2c	{"description": "Name: test-si004-campaign-22-1751165727922534416, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-22-1751165727922534416"}	\N	\N	{}	standard	unknown	\N	normal
40d766cb-ac60-4098-bc24-892009115d2b	2025-06-29 02:55:28.213048+00	\N	Domain Generation Campaign Created (Service)	Campaign	207c4885-0fe0-4d54-90d2-a58146a055f6	{"description": "Name: test-si004-campaign-34-1751165727919117253, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-34-1751165727919117253"}	\N	\N	{}	standard	unknown	\N	normal
28e2649d-0617-49d2-9152-c206aa121066	2025-06-29 02:55:28.217253+00	\N	Domain Generation Campaign Created (Service)	Campaign	db99c80b-61da-4eab-8c63-9e70e7eb4a97	{"description": "Name: test-si004-campaign-35-1751165727921877876, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-35-1751165727921877876"}	\N	\N	{}	standard	unknown	\N	normal
98db4f9b-9adf-4e17-b3ff-0e3b6bdbf269	2025-06-29 02:55:28.178275+00	\N	Domain Generation Campaign Created (Service)	Campaign	351437c8-1cf9-4392-8e39-1a5370b12975	{"description": "Name: test-si004-campaign-8-1751165727922330132, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-8-1751165727922330132"}	\N	\N	{}	standard	unknown	\N	normal
594a5af7-f1bf-453a-b639-d18201a8acc5	2025-06-29 02:55:28.095254+00	\N	Domain Generation Campaign Created (Service)	Campaign	2e50e629-25be-4e4c-8589-2518d998cb3d	{"description": "Name: test-si004-campaign-15-1751165727922263726, ConfigHash: 3e0111e22313e11cbb34896274af253874111a1924d8b19106044abec39b583d, StartOffset: 0, RequestedForInstance: 27, ActualTotalItemsForThisRun: 27", "campaign_name": "test-si004-campaign-15-1751165727922263726"}	\N	\N	{}	standard	unknown	\N	normal
9d5215dc-1f1d-4501-ba50-ab1379f3ca64	2025-06-29 02:55:28.399629+00	\N	Domain Generation Campaign Created (Service)	Campaign	084ed9a6-3d4e-43c8-bf2e-6c492c56bbc1	{"description": "Name: test-si005-memory-1751165728392127553, ConfigHash: 3a8e6f0c4b4ba1228fedf33fe36ce9626f52b9b5d4b83a9592d4b3573230161c, StartOffset: 0, RequestedForInstance: 256, ActualTotalItemsForThisRun: 256", "campaign_name": "test-si005-memory-1751165728392127553"}	\N	\N	{}	standard	unknown	\N	normal
1dd94822-41e4-4274-8532-bb495f5cb430	2025-06-29 02:55:28.405369+00	\N	Domain Generation Campaign Created (Service)	Campaign	b599f218-b116-4afe-90d9-c9ed2e776f8a	{"description": "Name: test-si005-cache-0-1751165728403126573, ConfigHash: c1f55d475e53352faa3b41f416015b27e51d2d1f2b51d092820e64316ab084a8, StartOffset: 0, RequestedForInstance: 1000, ActualTotalItemsForThisRun: 256", "campaign_name": "test-si005-cache-0-1751165728403126573"}	\N	\N	{}	standard	unknown	\N	normal
a7f9777e-87a0-416b-b400-362c83c48a9b	2025-06-29 02:55:28.45321+00	\N	Domain Generation Campaign Created (Service)	Campaign	aaaea58f-1526-4894-9f8e-8ada643b94bb	{"description": "Name: test-si005-cache-1-1751165728442842908, ConfigHash: c1f55d475e53352faa3b41f416015b27e51d2d1f2b51d092820e64316ab084a8, StartOffset: 0, RequestedForInstance: 1000, ActualTotalItemsForThisRun: 256", "campaign_name": "test-si005-cache-1-1751165728442842908"}	\N	\N	{}	standard	unknown	\N	normal
bbeefd4d-9063-48a8-b97e-458d0dd1f4c7	2025-06-29 02:55:28.459837+00	\N	Domain Generation Campaign Created (Service)	Campaign	fdba28e1-faa3-4eca-aa49-8d970de93e5c	{"description": "Name: test-si005-cache-2-1751165728458048561, ConfigHash: c1f55d475e53352faa3b41f416015b27e51d2d1f2b51d092820e64316ab084a8, StartOffset: 0, RequestedForInstance: 1000, ActualTotalItemsForThisRun: 256", "campaign_name": "test-si005-cache-2-1751165728458048561"}	\N	\N	{}	standard	unknown	\N	normal
43841676-03f5-496d-999b-f5bf4bc43fdb	2025-06-29 02:55:28.496452+00	\N	Domain Generation Campaign Created (Service)	Campaign	1bd55609-ddf7-42da-bc12-ba76790d4172	{"description": "Name: test-si005-cache-3-1751165728472714682, ConfigHash: c1f55d475e53352faa3b41f416015b27e51d2d1f2b51d092820e64316ab084a8, StartOffset: 0, RequestedForInstance: 1000, ActualTotalItemsForThisRun: 256", "campaign_name": "test-si005-cache-3-1751165728472714682"}	\N	\N	{}	standard	unknown	\N	normal
e8e0d802-4da8-42ef-b88c-0ddb3f97f053	2025-06-29 02:55:28.510109+00	\N	Domain Generation Campaign Created (Service)	Campaign	47dff414-27e9-4406-8a89-e677f4a91a0b	{"description": "Name: test-si005-cache-4-1751165728507751118, ConfigHash: c1f55d475e53352faa3b41f416015b27e51d2d1f2b51d092820e64316ab084a8, StartOffset: 0, RequestedForInstance: 1000, ActualTotalItemsForThisRun: 256", "campaign_name": "test-si005-cache-4-1751165728507751118"}	\N	\N	{}	standard	unknown	\N	normal
5893d625-43f0-4b7a-9ac5-69b269785b7d	2025-06-29 03:47:51.863929+00	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	session_created	session	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	{"session_id": "067f9af9f38df55055eb31ef60c48a6482a39111c65b8698e032437caedeaa5beee99fe2e51869c6103db39ba6147dac9ad9b4c941b682e5c377b485c7b5a9c3", "description": "Session created for user 26a0d6b7-207a-4775-98d5-2a2e9953b1b7"}	\N	\N	{}	standard	unknown	\N	normal
ba87afdd-f5ac-425d-8f2e-79b23b118a76	2025-06-29 03:48:09.642796+00	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	session_created	session	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	{"session_id": "4a20c1a3c026383ca4ef96db387bcfde6dae6891a5b09ea723d30854f3f8eb8baf086cf3582a62a148c2701a4c26170e5d4307835d90910d722c03ae0f91c9c7", "description": "Session created for user 26a0d6b7-207a-4775-98d5-2a2e9953b1b7"}	\N	\N	{}	standard	unknown	\N	normal
0eac0b87-e374-4883-ba5d-e87862a830e7	2025-06-29 03:50:48.347114+00	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	session_created	session	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	{"session_id": "038175c2fed077a7b27222f44216fdc53a3dcf08bc79bd9fa3521b1aa6a23ff9c01e1b5e5d46596d2ebc7096ea0969c5ab4e27f5087955f2ea64661675eacfd7", "description": "Session created for user 26a0d6b7-207a-4775-98d5-2a2e9953b1b7"}	\N	\N	{}	standard	unknown	\N	normal
0c8ffbd1-a7c0-4a5a-9926-752e91273e21	2025-06-29 03:51:15.644887+00	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	session_created	session	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	{"session_id": "405f4cf11026994dec1fc6dcc74f9051920885c85b02f63404907f48ccad7ac5ee9c85884e70e5fd42f97cf589a2154baa29022b60161aa49a6c3e638c750410", "description": "Session created for user 26a0d6b7-207a-4775-98d5-2a2e9953b1b7"}	\N	\N	{}	standard	unknown	\N	normal
ec113330-51b2-49ac-8dff-4c4fe7738efd	2025-06-29 03:54:24.653993+00	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	session_created	session	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	{"session_id": "08ca146538e7d386db0a9f3ae632209d45100e279285bdab03b1b2c005a5244a6e73da505e81d4810dad9180f58a919a970a29129546610f1cc6b30552d1e26b", "description": "Session created for user 26a0d6b7-207a-4775-98d5-2a2e9953b1b7"}	\N	\N	{}	standard	unknown	\N	normal
60512ad4-ef78-497a-9412-03e02a3f1009	2025-06-29 03:55:02.607214+00	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	session_created	session	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	{"session_id": "4a8d282de8377b343995f52cea157e35b9ed9258a3943394c25179bce46a307e0a2ee9c611f83a6ef3973a3a7457e68250cc3d514b58e0752007de7f060dec7a", "description": "Session created for user 26a0d6b7-207a-4775-98d5-2a2e9953b1b7"}	\N	\N	{}	standard	unknown	\N	normal
a26df895-79a7-4799-b34e-a05cd90facb7	2025-06-29 03:56:41.35894+00	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	session_created	session	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	{"session_id": "28ce61ce531bd0a8149fdf949a6c7ce46de84d0dc906416d7a518183e8d3e3a5a1c845b2597708ff2ca2772d037f340e10d31c2db6a23aa89761a017ee518dd6", "description": "Session created for user 26a0d6b7-207a-4775-98d5-2a2e9953b1b7"}	\N	\N	{}	standard	unknown	\N	normal
f2aeda24-4799-4d0f-9b8c-b192ba965ae4	2025-06-29 04:04:09.457067+00	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	session_created	session	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	{"session_id": "8ea1ae02b5f41b71913917f51a655624c94ff61c8a0c24bba251f4e1fc6e62a7cb42166787c060634e76d234c158265a5876b35cf2bf77eb487cea84a785bdca", "description": "Session created for user 26a0d6b7-207a-4775-98d5-2a2e9953b1b7"}	\N	\N	{}	standard	unknown	\N	normal
6f8a650a-4ba7-4082-8bfa-be9bf6eb0d92	2025-06-29 04:06:24.113457+00	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	session_created	session	26a0d6b7-207a-4775-98d5-2a2e9953b1b7	{"session_id": "3fabc7f67cb418629dcc71def268a5da982f1201019d8bc3444417b651113f1ff1817b6623c7d54fa077030d13add0f0b4f33c1084f217c85e5d107628fa5475", "description": "Session created for user 26a0d6b7-207a-4775-98d5-2a2e9953b1b7"}	\N	\N	{}	standard	unknown	\N	normal
\.


--
-- Data for Name: authorization_decisions; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.authorization_decisions (id, decision_id, user_id, resource_type, resource_id, action, decision, policy_version, evaluated_policies, conditions_met, decision_time_ms, context, security_event_id, created_at) FROM stdin;
\.


--
-- Data for Name: cache_configurations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.cache_configurations (id, cache_name, cache_type, max_size_bytes, current_size_bytes, max_entries, current_entries, default_ttl_seconds, eviction_policy, cache_status, last_cleanup_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cache_entries; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.cache_entries (id, cache_key, cache_namespace, service_name, campaign_type, campaign_id, cache_value, cache_value_compressed, is_compressed, content_type, size_bytes, hit_count, access_frequency, ttl_seconds, expires_at, created_at, last_accessed, tags, metadata) FROM stdin;
\.


--
-- Data for Name: cache_invalidation_log; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.cache_invalidation_log (id, service_name, cache_namespace, invalidation_pattern, invalidation_reason, affected_keys_count, campaign_type, campaign_id, triggered_by, execution_time_ms, success, error_message, executed_at) FROM stdin;
\.


--
-- Data for Name: cache_invalidations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.cache_invalidations (id, cache_name, invalidation_type, invalidation_reason, keys_invalidated, bytes_freed, operation_context, invalidated_at) FROM stdin;
\.


--
-- Data for Name: cache_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.cache_metrics (id, service_name, cache_namespace, campaign_type, operation_type, cache_key, execution_time_ms, cache_size_bytes, ttl_used_seconds, hit_ratio_pct, recorded_at) FROM stdin;
\.


--
-- Data for Name: campaign_access_grants; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.campaign_access_grants (id, campaign_id, user_id, access_type, granted_by, granted_at, expires_at, created_at, is_active) FROM stdin;
\.


--
-- Data for Name: campaign_jobs; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.campaign_jobs (id, campaign_id, job_type, status, scheduled_at, attempts, max_attempts, last_attempted_at, last_error, processing_server_id, created_at, updated_at, job_payload, next_execution_at, locked_at, locked_by, business_status) FROM stdin;
1230754c-293e-49a0-862f-c53b06c06d1b	4060103c-adfc-4609-bf2b-16e6dbbbe1d0	domain_generation	failed	2025-06-29 02:55:27.834335+00	3	3	\N	pq: column "created_at" does not exist	Lino-3	2025-06-29 02:55:27.834335+00	2025-06-29 02:56:11.433483+00	\N	2025-06-29 02:56:06.506131+00	\N	\N	\N
cfd55156-4482-4fe5-bd96-864bb2be056d	2b0b1b73-5913-42fe-a8f6-aca2e0b983a7	domain_generation	failed	2025-06-29 02:55:27.827997+00	3	3	\N	pq: column "created_at" does not exist	Lino-1	2025-06-29 02:55:27.827997+00	2025-06-29 02:56:11.44818+00	\N	2025-06-29 02:56:06.506625+00	\N	\N	\N
1641844d-20e2-4e8f-be70-1f1d06d3b893	39a0fd00-a3eb-4972-b264-ee8afcedbf46	domain_generation	failed	2025-06-29 02:55:27.844008+00	3	3	\N	pq: column "created_at" does not exist	Lino-4	2025-06-29 02:55:27.844008+00	2025-06-29 02:56:11.461183+00	\N	2025-06-29 02:56:06.510501+00	\N	\N	\N
7d00f134-9f5f-4b63-a373-e8692976131e	ab8b2216-0969-4d26-8a02-2d141130c638	domain_generation	failed	2025-06-29 02:55:27.825423+00	3	3	\N	pq: column "created_at" does not exist	Lino-2	2025-06-29 02:55:27.825423+00	2025-06-29 02:56:11.461227+00	\N	2025-06-29 02:56:06.509129+00	\N	\N	\N
915be3fc-7df5-410d-a024-fe1ac79919d0	bcd9123b-0607-4ffc-b3cd-8273fe1107a6	domain_generation	failed	2025-06-29 02:55:27.839374+00	3	3	\N	pq: column "created_at" does not exist	Lino-0	2025-06-29 02:55:27.839374+00	2025-06-29 02:56:11.467405+00	\N	2025-06-29 02:56:06.509149+00	\N	\N	\N
55a7f3fe-d286-4d38-be47-71c3c982ae2a	04ee839d-5991-4a26-96fe-14d23bf8a526	domain_generation	failed	2025-06-29 02:55:27.872284+00	3	3	\N	pq: column "created_at" does not exist	Lino-1	2025-06-29 02:55:27.872284+00	2025-06-29 02:56:26.39861+00	\N	2025-06-29 02:56:21.520424+00	\N	\N	\N
6562af1a-f302-4bff-9f60-8dfbf841fc35	611ea2dc-30c2-4853-9dab-8b52c6e8efa6	domain_generation	failed	2025-06-29 02:55:27.84942+00	3	3	\N	pq: column "created_at" does not exist	Lino-0	2025-06-29 02:55:27.84942+00	2025-06-29 02:56:26.401255+00	\N	2025-06-29 02:56:21.524265+00	\N	\N	\N
123d73c2-504d-410e-9eef-3b3a074890a7	15b7f0eb-4734-4e8d-890c-110ddf145254	domain_generation	failed	2025-06-29 02:55:27.862482+00	3	3	\N	pq: column "created_at" does not exist	Lino-2	2025-06-29 02:55:27.862482+00	2025-06-29 02:56:26.404346+00	\N	2025-06-29 02:56:21.524228+00	\N	\N	\N
cc9b67f1-5288-497a-98f6-bd8ca0ba7360	c8d86e00-41fb-469b-a0b6-e50f44e2f3a9	domain_generation	failed	2025-06-29 02:55:27.867588+00	3	3	\N	pq: column "created_at" does not exist	Lino-3	2025-06-29 02:55:27.867588+00	2025-06-29 02:56:26.405191+00	\N	2025-06-29 02:56:21.523562+00	\N	\N	\N
7adab223-3ade-433e-a28b-7f4a23346873	cac344e6-49e5-4b6c-b002-66976e485609	domain_generation	failed	2025-06-29 02:55:27.854131+00	3	3	\N	pq: column "created_at" does not exist	Lino-4	2025-06-29 02:55:27.854131+00	2025-06-29 02:56:26.40564+00	\N	2025-06-29 02:56:21.523943+00	\N	\N	\N
a36a7a46-8da0-4617-b62c-113acb78041f	97cb0c6e-51df-4e27-bf25-473cb5be7725	domain_generation	failed	2025-06-29 02:55:27.670974+00	3	3	\N	pq: column "created_at" does not exist	Lino-2	2025-06-29 02:55:27.670974+00	2025-06-29 02:55:41.41197+00	\N	2025-06-29 02:55:36.487221+00	\N	\N	\N
b2b43de1-2a77-44d6-8411-98edfb9c2058	3802d334-279b-44b9-b26d-3cd5cc1aa794	domain_generation	failed	2025-06-29 02:55:27.698526+00	3	3	\N	pq: column "created_at" does not exist	Lino-4	2025-06-29 02:55:27.698526+00	2025-06-29 02:55:41.42333+00	\N	2025-06-29 02:55:36.484903+00	\N	\N	\N
31293f80-c898-41d9-96bb-1787c0d94d14	ccd78f24-012e-45e9-8478-18a0f99eeaa4	domain_generation	failed	2025-06-29 02:55:27.709513+00	3	3	\N	pq: column "created_at" does not exist	Lino-3	2025-06-29 02:55:27.709513+00	2025-06-29 02:55:41.42404+00	\N	2025-06-29 02:55:36.486082+00	\N	\N	\N
3e2c0645-8542-46f4-a304-bcc890ec0ff4	f484cd2e-d849-43a6-b5f6-f210eddd84ff	domain_generation	failed	2025-06-29 02:55:27.785831+00	3	3	\N	pq: column "created_at" does not exist	Lino-1	2025-06-29 02:55:27.785831+00	2025-06-29 02:55:41.424886+00	\N	2025-06-29 02:55:36.487249+00	\N	\N	\N
f5585853-c2b7-4101-8625-68f1013f7ff8	dfdbc118-4973-46de-a1f9-2302f95fc1fd	domain_generation	failed	2025-06-29 02:55:27.704288+00	3	3	\N	pq: column "created_at" does not exist	Lino-0	2025-06-29 02:55:27.704288+00	2025-06-29 02:55:41.424955+00	\N	2025-06-29 02:55:36.487147+00	\N	\N	\N
0ab39225-9953-4eb5-aedf-a2f2374e4cfd	f65e7d07-9418-4804-b4ba-be83e3513384	domain_generation	failed	2025-06-29 02:55:27.893864+00	3	3	\N	pq: column "created_at" does not exist	Lino-4	2025-06-29 02:55:27.893864+00	2025-06-29 02:56:41.429648+00	\N	2025-06-29 02:56:36.504192+00	\N	\N	\N
00d85b25-9b6d-46d4-aaae-9656d693e2fa	6c5b074e-22ab-449b-aecf-91a3ee48ad1c	domain_generation	failed	2025-06-29 02:55:27.884287+00	3	3	\N	pq: column "created_at" does not exist	Lino-2	2025-06-29 02:55:27.884287+00	2025-06-29 02:56:41.429862+00	\N	2025-06-29 02:56:36.5016+00	\N	\N	\N
25fe765c-dfce-4c1e-8900-65bd8247d175	59cc807d-c2c1-4c5b-b225-451815ab4c1f	domain_generation	failed	2025-06-29 02:55:27.900495+00	3	3	\N	pq: column "created_at" does not exist	Lino-0	2025-06-29 02:55:27.900495+00	2025-06-29 02:56:41.429964+00	\N	2025-06-29 02:56:36.505657+00	\N	\N	\N
bbadb019-5642-4062-aba2-a5d7f0a58bc2	180b3bb6-cec6-46da-a940-99310c20c627	domain_generation	failed	2025-06-29 02:55:27.802947+00	3	3	\N	pq: column "created_at" does not exist	Lino-3	2025-06-29 02:55:27.802947+00	2025-06-29 02:55:56.382941+00	\N	2025-06-29 02:55:51.490432+00	\N	\N	\N
4fdf6b08-979c-4244-8657-e4828d679e01	2b7e0d22-8d84-40ee-a7e4-488c98884c20	domain_generation	failed	2025-06-29 02:55:27.808164+00	3	3	\N	pq: column "created_at" does not exist	Lino-2	2025-06-29 02:55:27.808164+00	2025-06-29 02:55:56.391485+00	\N	2025-06-29 02:55:51.503334+00	\N	\N	\N
6ce4adc8-3a6c-4cd1-9eeb-a6497f1e42ef	87f239e0-0fe8-4005-8f0c-ee5b549634e9	domain_generation	failed	2025-06-29 02:55:27.81284+00	3	3	\N	pq: column "created_at" does not exist	Lino-4	2025-06-29 02:55:27.81284+00	2025-06-29 02:55:56.392+00	\N	2025-06-29 02:55:51.509112+00	\N	\N	\N
fa5959f2-469a-4639-bde7-66f2e6c55dee	e6fd8a5e-3e1e-43ff-9866-39ea6ce05d6f	domain_generation	failed	2025-06-29 02:55:27.817581+00	3	3	\N	pq: column "created_at" does not exist	Lino-1	2025-06-29 02:55:27.817581+00	2025-06-29 02:55:56.392522+00	\N	2025-06-29 02:55:51.507309+00	\N	\N	\N
dfd67a19-95e4-4789-818c-57f66d1e35dc	b9fb796a-2f61-4b14-bb84-f0a5d309b93a	domain_generation	failed	2025-06-29 02:55:27.822079+00	3	3	\N	pq: column "created_at" does not exist	Lino-0	2025-06-29 02:55:27.822079+00	2025-06-29 02:55:56.393821+00	\N	2025-06-29 02:55:51.501893+00	\N	\N	\N
eb365c54-9e9a-41ee-b976-7714129e6d99	4bae218d-5cea-4ede-a1b2-f3ce15b604df	domain_generation	failed	2025-06-29 02:55:27.889145+00	3	3	\N	pq: column "created_at" does not exist	Lino-1	2025-06-29 02:55:27.889145+00	2025-06-29 02:56:41.436434+00	\N	2025-06-29 02:56:36.502006+00	\N	\N	\N
25c51145-01eb-4f96-815a-119df7d19aa1	7859097f-2538-44c7-a65a-746808d6ec88	domain_generation	failed	2025-06-29 02:55:27.877022+00	3	3	\N	pq: column "created_at" does not exist	Lino-3	2025-06-29 02:55:27.877022+00	2025-06-29 02:56:41.446108+00	\N	2025-06-29 02:56:36.499043+00	\N	\N	\N
6218f04b-3ea7-45a7-83ae-c82242759913	9d9b175a-de0e-45e3-89dd-f0a3e9ac8e6f	domain_generation	failed	2025-06-29 02:55:27.905991+00	3	3	\N	pq: column "created_at" does not exist	Lino-1	2025-06-29 02:55:27.905991+00	2025-06-29 02:56:56.391385+00	\N	2025-06-29 02:56:51.491754+00	\N	\N	\N
349aca32-2ae5-4624-a5bf-c536921fdb1c	eacd36f2-4cb2-4dc1-a45b-d5326df8026a	domain_generation	failed	2025-06-29 02:55:28.015543+00	3	3	\N	pq: column "created_at" does not exist	Lino-2	2025-06-29 02:55:28.015543+00	2025-06-29 02:56:56.394002+00	\N	2025-06-29 02:56:51.492252+00	\N	\N	\N
\.


--
-- Data for Name: campaign_query_patterns; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.campaign_query_patterns (id, campaign_type, service_name, query_pattern, query_frequency, avg_execution_time_ms, total_cpu_time_ms, optimization_status, baseline_performance, optimized_performance, last_analysis) FROM stdin;
\.


--
-- Data for Name: campaign_state_events; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.campaign_state_events (id, campaign_id, event_type, source_state, target_state, reason, triggered_by, event_data, operation_context, sequence_number, occurred_at, persisted_at, processing_status, processing_error, correlation_id) FROM stdin;
\.


--
-- Data for Name: campaign_state_snapshots; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.campaign_state_snapshots (id, campaign_id, current_state, state_data, last_event_sequence, snapshot_metadata, created_at, checksum, is_valid) FROM stdin;
\.


--
-- Data for Name: campaign_state_transitions; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.campaign_state_transitions (id, state_event_id, campaign_id, from_state, to_state, is_valid_transition, validation_errors, transition_metadata, triggered_by, initiated_at, completed_at, duration_ms) FROM stdin;
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.campaigns (id, name, campaign_type, status, user_id, total_items, processed_items, successful_items, failed_items, progress_percentage, metadata, created_at, updated_at, started_at, completed_at, error_message, estimated_completion_at, avg_processing_rate, last_heartbeat_at, business_status, archived_at, archived_reason) FROM stdin;
97cb0c6e-51df-4e27-bf25-473cb5be7725	test-pf001-query-1751165727664868289	domain_generation	pending	\N	27	0	\N	\N	0	\N	2025-06-29 02:55:27.664872+00	2025-06-29 02:55:27.664872+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
3802d334-279b-44b9-b26d-3cd5cc1aa794	pf002-response-test	domain_generation	pending	\N	2000	0	\N	\N	0	\N	2025-06-29 02:55:27.694089+00	2025-06-29 02:55:27.694089+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
dfdbc118-4973-46de-a1f9-2302f95fc1fd	test-pf002-response-1751165727701059496	domain_generation	pending	\N	256	0	\N	\N	0	\N	2025-06-29 02:55:27.701062+00	2025-06-29 02:55:27.701062+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
ccd78f24-012e-45e9-8478-18a0f99eeaa4	test-pf003-batch-0-1751165727706633423	domain_generation	pending	\N	16	0	\N	\N	0	\N	2025-06-29 02:55:27.706636+00	2025-06-29 02:55:27.706636+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
f484cd2e-d849-43a6-b5f6-f210eddd84ff	test-pf004-cache-original-1751165727782855988	domain_generation	pending	\N	27	0	\N	\N	0	\N	2025-06-29 02:55:27.782861+00	2025-06-29 02:55:27.782861+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
180b3bb6-cec6-46da-a940-99310c20c627	test-integration-si004-1751165727794979447-0	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.794982+00	2025-06-29 02:55:27.794982+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
2b7e0d22-8d84-40ee-a7e4-488c98884c20	test-integration-si004-1751165727805183243-1	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.805187+00	2025-06-29 02:55:27.805187+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
87f239e0-0fe8-4005-8f0c-ee5b549634e9	test-integration-si004-1751165727810033676-2	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.810036+00	2025-06-29 02:55:27.810036+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
e6fd8a5e-3e1e-43ff-9866-39ea6ce05d6f	test-integration-si004-1751165727814836219-3	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.814839+00	2025-06-29 02:55:27.814839+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
b9fb796a-2f61-4b14-bb84-f0a5d309b93a	test-integration-si004-1751165727819187792-4	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.81919+00	2025-06-29 02:55:27.81919+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
ab8b2216-0969-4d26-8a02-2d141130c638	test-integration-si004-1751165727823998035-5	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.824+00	2025-06-29 02:55:27.824+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
2b0b1b73-5913-42fe-a8f6-aca2e0b983a7	test-integration-si004-1751165727826563621-6	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.826566+00	2025-06-29 02:55:27.826566+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
4060103c-adfc-4609-bf2b-16e6dbbbe1d0	test-integration-si004-1751165727829139081-7	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.829141+00	2025-06-29 02:55:27.829141+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
bcd9123b-0607-4ffc-b3cd-8273fe1107a6	test-integration-si004-1751165727836293504-8	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.836296+00	2025-06-29 02:55:27.836296+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
39a0fd00-a3eb-4972-b264-ee8afcedbf46	test-integration-si004-1751165727841314085-9	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.841317+00	2025-06-29 02:55:27.841317+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
611ea2dc-30c2-4853-9dab-8b52c6e8efa6	test-integration-si004-1751165727845821202-10	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.845823+00	2025-06-29 02:55:27.845823+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
cac344e6-49e5-4b6c-b002-66976e485609	test-integration-si004-1751165727851249130-11	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.851252+00	2025-06-29 02:55:27.851252+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
15b7f0eb-4734-4e8d-890c-110ddf145254	test-integration-si004-1751165727856051803-12	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.856054+00	2025-06-29 02:55:27.856054+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
c8d86e00-41fb-469b-a0b6-e50f44e2f3a9	test-integration-si004-1751165727864574851-13	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.864577+00	2025-06-29 02:55:27.864577+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
04ee839d-5991-4a26-96fe-14d23bf8a526	test-integration-si004-1751165727869518566-14	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.869521+00	2025-06-29 02:55:27.869521+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
7859097f-2538-44c7-a65a-746808d6ec88	test-integration-si004-1751165727874361927-15	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.874364+00	2025-06-29 02:55:27.874364+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
6c5b074e-22ab-449b-aecf-91a3ee48ad1c	test-integration-si004-1751165727879179583-16	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.879182+00	2025-06-29 02:55:27.879182+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
4bae218d-5cea-4ede-a1b2-f3ce15b604df	test-integration-si004-1751165727886338724-17	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.886345+00	2025-06-29 02:55:27.886345+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
f65e7d07-9418-4804-b4ba-be83e3513384	test-integration-si004-1751165727891058203-18	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.89106+00	2025-06-29 02:55:27.89106+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
59cc807d-c2c1-4c5b-b225-451815ab4c1f	test-integration-si004-1751165727896928471-19	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.896931+00	2025-06-29 02:55:27.896931+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
9d9b175a-de0e-45e3-89dd-f0a3e9ac8e6f	test-integration-si005-1751165727902420463	domain_generation	pending	\N	4	0	\N	\N	0	\N	2025-06-29 02:55:27.902422+00	2025-06-29 02:55:27.902422+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
eacd36f2-4cb2-4dc1-a45b-d5326df8026a	test-si004-campaign-0-1751165727913539954	domain_generation	pending	\N	27	0	\N	\N	0	\N	2025-06-29 02:55:27.913549+00	2025-06-29 02:55:27.913549+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: communication_patterns; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.communication_patterns (id, source_service, target_service, communication_type, protocol, message_format, avg_latency_ms, success_rate, throughput_rps, error_rate, retry_count, circuit_breaker_state, last_health_check, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: config_locks; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.config_locks (id, config_hash, lock_type, owner, acquired_at, expires_at, is_active, metadata, created_at, updated_at) FROM stdin;
7c8ba3a7-ee97-4496-a5f2-792b5772e47a	test-concurrent-read-929cb9e9-294e-4032-947b-d59f93d25506	exclusive	config_manager_1750598259513966298	2025-06-22 13:17:39.516655+00	2025-06-22 13:18:09.516655+00	f	\N	2025-06-22 13:17:39.516655+00	2025-06-22 13:17:39.563332+00
4ea778ff-e728-48c1-a602-69e9fa5bde79	test-concurrent-write-346a68b6-db55-4d6f-baf9-c9f45eebd027	exclusive	config_manager_1750598259571342269	2025-06-22 13:17:39.572153+00	2025-06-22 13:18:09.572153+00	f	\N	2025-06-22 13:17:39.572153+00	2025-06-22 13:17:39.607961+00
c44915b5-5734-4ce4-beb0-4686b98e15a5	test-concurrent-write-346a68b6-db55-4d6f-baf9-c9f45eebd027	exclusive	config_manager_1750598259571444669	2025-06-22 13:17:39.663805+00	2025-06-22 13:18:09.663805+00	f	\N	2025-06-22 13:17:39.663805+00	2025-06-22 13:17:39.683654+00
8302f0ba-9d32-49c3-86c7-0fd41f7caf5e	test-concurrent-write-346a68b6-db55-4d6f-baf9-c9f45eebd027	exclusive	config_manager_1750598259571737187	2025-06-22 13:17:39.685272+00	2025-06-22 13:18:09.685272+00	f	\N	2025-06-22 13:17:39.685272+00	2025-06-22 13:17:39.693212+00
8eda72aa-3976-41dd-9b7d-54923f6a2ec3	test-cow-semantics-95384097-35f9-495a-8a76-6048a86a39c5	exclusive	config_manager_1750598259696755679	2025-06-22 13:17:39.69768+00	2025-06-22 13:18:09.69768+00	f	\N	2025-06-22 13:17:39.69768+00	2025-06-22 13:17:39.702954+00
5c812036-f95e-44d6-8131-ded8c48907d6	test-distributed-locking-90276241-1097-4e2f-aa41-5d0019fcfc71	exclusive	test-owner-1	2025-06-22 13:17:39.705885+00	2025-06-22 13:17:49.705885+00	f	\N	2025-06-22 13:17:39.705885+00	2025-06-22 13:17:39.711031+00
6dbf021f-baca-4f01-a602-ee7f425a2899	test-distributed-locking-90276241-1097-4e2f-aa41-5d0019fcfc71	exclusive	test-owner-2	2025-06-22 13:17:39.713934+00	2025-06-22 13:17:49.713934+00	f	\N	2025-06-22 13:17:39.713934+00	2025-06-22 13:17:39.71758+00
5af962b7-6cf7-4a67-820e-8084e395f1da	test-race-prevention-d6590025-39c1-41ea-83eb-b04789b2d972	exclusive	config_manager_1750598259754360734	2025-06-22 13:17:39.765625+00	2025-06-22 13:18:09.765625+00	f	\N	2025-06-22 13:17:39.765625+00	2025-06-22 13:17:39.804836+00
a243027e-ebe5-4e1e-a70a-b367934ce2f2	test-corruption-detection-46ec1ccd-1100-4548-be68-7323052798ed	exclusive	config_manager_1750598259808052558	2025-06-22 13:17:39.809702+00	2025-06-22 13:18:09.809702+00	f	\N	2025-06-22 13:17:39.809702+00	2025-06-22 13:17:39.859301+00
71436c11-67a8-406d-beeb-6b91eb8718ef	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-mixed	exclusive	config_manager_1750598259862258500	2025-06-22 13:17:39.863346+00	2025-06-22 13:18:09.863346+00	f	\N	2025-06-22 13:17:39.863346+00	2025-06-22 13:17:39.868855+00
cdfc9c3e-37ac-4037-872c-8d6138f553a5	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-highfreq	exclusive	config_manager_1750598259885004409	2025-06-22 13:17:39.885643+00	2025-06-22 13:18:09.885643+00	f	\N	2025-06-22 13:17:39.885643+00	2025-06-22 13:17:39.918991+00
7946a978-5004-4d13-b423-c4c5f1eed866	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-highfreq	exclusive	config_manager_1750598259887686894	2025-06-22 13:17:39.968799+00	2025-06-22 13:18:09.968799+00	f	\N	2025-06-22 13:17:39.968799+00	2025-06-22 13:17:40.028384+00
1944dcf9-e647-4d0d-adb0-812ef9d77db5	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-highfreq	exclusive	config_manager_1750598259887832078	2025-06-22 13:17:40.042432+00	2025-06-22 13:18:10.042432+00	f	\N	2025-06-22 13:17:40.042432+00	2025-06-22 13:17:40.055042+00
990bdef8-5033-4f2d-ade0-087eada9d1a4	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-highfreq	exclusive	config_manager_1750598259889266113	2025-06-22 13:17:40.05972+00	2025-06-22 13:18:10.05972+00	f	\N	2025-06-22 13:17:40.05972+00	2025-06-22 13:17:40.107652+00
bc935cd2-87b9-463f-b4c0-dcd9c293cc03	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-highfreq	exclusive	config_manager_1750598259889447668	2025-06-22 13:17:40.150447+00	2025-06-22 13:18:10.150447+00	f	\N	2025-06-22 13:17:40.150447+00	2025-06-22 13:17:40.165699+00
394961b5-75e5-4fa1-a793-a618c68be9b7	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-highfreq	exclusive	config_manager_1750598259910189204	2025-06-22 13:17:40.169194+00	2025-06-22 13:18:10.169194+00	f	\N	2025-06-22 13:17:40.169194+00	2025-06-22 13:17:40.17641+00
9f35ec2a-a961-44e7-86e2-0362d630d873	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-highfreq	exclusive	config_manager_1750598260046413266	2025-06-22 13:17:40.179877+00	2025-06-22 13:18:10.179877+00	f	\N	2025-06-22 13:17:40.179877+00	2025-06-22 13:17:40.216256+00
9ff4c55e-7cd0-48df-853f-d4d8fbbbeee9	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-highfreq	exclusive	config_manager_1750598260046627157	2025-06-22 13:17:40.223388+00	2025-06-22 13:18:10.223388+00	f	\N	2025-06-22 13:17:40.223388+00	2025-06-22 13:17:40.257608+00
172a7a89-9199-4e32-9bc2-f606317600fa	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-highfreq	exclusive	config_manager_1750598260134012428	2025-06-22 13:17:40.269969+00	2025-06-22 13:18:10.269969+00	f	\N	2025-06-22 13:17:40.269969+00	2025-06-22 13:17:40.276829+00
e9a37a67-cdf0-4dc7-8583-156d08c04bb6	test-multi-worker-d2e0b244-21ca-4f7a-ac6c-b20bb21d6ba7-coordinated	exclusive	config_manager_1750598260284467265	2025-06-22 13:17:40.285284+00	2025-06-22 13:18:10.285284+00	f	\N	2025-06-22 13:17:40.285284+00	2025-06-22 13:17:40.28998+00
aaf1b7ec-0bd9-464d-b4ac-7f52248f8b35	test-concurrent-read-d5a995b2-7052-45b0-8fd4-99b98dba11a0	exclusive	config_manager_1750598695590849508	2025-06-22 13:24:55.593792+00	2025-06-22 13:25:25.593792+00	f	\N	2025-06-22 13:24:55.593792+00	2025-06-22 13:24:55.617792+00
ef10a45e-2cd6-4abf-9688-87be63c8db6f	test-concurrent-write-a15d88be-1014-43c7-9e76-a185c448c10b	exclusive	config_manager_1750598695619301091	2025-06-22 13:24:55.620661+00	2025-06-22 13:25:25.620661+00	f	\N	2025-06-22 13:24:55.620661+00	2025-06-22 13:24:55.630395+00
fb823e60-e024-4cbe-b461-cc04530b6420	test-concurrent-write-a15d88be-1014-43c7-9e76-a185c448c10b	exclusive	config_manager_1750598695619383748	2025-06-22 13:24:55.634395+00	2025-06-22 13:25:25.634395+00	f	\N	2025-06-22 13:24:55.634395+00	2025-06-22 13:24:55.645561+00
532dd147-117a-4ee0-ba1d-016506458826	test-cow-semantics-ea3e6b25-4e96-4acd-a782-0df963cd82f7	exclusive	config_manager_1750598695648383266	2025-06-22 13:24:55.650916+00	2025-06-22 13:25:25.650916+00	f	\N	2025-06-22 13:24:55.650916+00	2025-06-22 13:24:55.6732+00
09045af9-93e9-499d-9bad-33b3416e9238	test-distributed-locking-a22b1ef9-6b52-4114-8279-f185172ed928	exclusive	test-owner-1	2025-06-22 13:24:55.703363+00	2025-06-22 13:25:05.703363+00	f	\N	2025-06-22 13:24:55.703363+00	2025-06-22 13:24:55.710116+00
1cdd3992-970c-484a-967f-d45cc52c1966	test-distributed-locking-a22b1ef9-6b52-4114-8279-f185172ed928	exclusive	test-owner-2	2025-06-22 13:24:55.712906+00	2025-06-22 13:25:05.712906+00	f	\N	2025-06-22 13:24:55.712906+00	2025-06-22 13:24:55.717613+00
18ab20c7-c9f1-416f-bdae-e78ca5ebec83	test-race-prevention-1e450075-11a7-4492-8600-8cc6e51daf10	exclusive	config_manager_1750598695722938920	2025-06-22 13:24:55.723936+00	2025-06-22 13:25:25.723936+00	f	\N	2025-06-22 13:24:55.723936+00	2025-06-22 13:24:55.734375+00
3fcf58b7-b391-4596-933c-5ef97e4f8fb8	test-corruption-detection-3a609c84-02d6-47da-bd8d-4f2818956efd	exclusive	config_manager_1750598695736377865	2025-06-22 13:24:55.737281+00	2025-06-22 13:25:25.737281+00	f	\N	2025-06-22 13:24:55.737281+00	2025-06-22 13:24:55.746104+00
36aecfa1-cb5a-4f62-bf21-73eb88fce5ef	test-multi-worker-14270708-b1d7-497a-95aa-64054314797f-mixed	exclusive	config_manager_1750598695747996677	2025-06-22 13:24:55.748561+00	2025-06-22 13:25:25.748561+00	f	\N	2025-06-22 13:24:55.748561+00	2025-06-22 13:24:55.763718+00
d14c0261-3a8f-4218-8e5e-03b73dba6867	test-multi-worker-14270708-b1d7-497a-95aa-64054314797f-highfreq	exclusive	config_manager_1750598695765586651	2025-06-22 13:24:55.767084+00	2025-06-22 13:25:25.767084+00	f	\N	2025-06-22 13:24:55.767084+00	2025-06-22 13:24:55.805739+00
d5f7695d-c150-4de9-9070-984d8bf84a62	test-multi-worker-14270708-b1d7-497a-95aa-64054314797f-highfreq	exclusive	config_manager_1750598695794343991	2025-06-22 13:24:55.829727+00	2025-06-22 13:25:25.829727+00	f	\N	2025-06-22 13:24:55.829727+00	2025-06-22 13:24:55.868989+00
2f814ef0-5fc2-4f35-9f95-8bf10ffe2f87	test-multi-worker-14270708-b1d7-497a-95aa-64054314797f-highfreq	exclusive	config_manager_1750598695794369099	2025-06-22 13:24:55.873789+00	2025-06-22 13:25:25.873789+00	f	\N	2025-06-22 13:24:55.873789+00	2025-06-22 13:24:55.882201+00
dedbdf09-66ae-4f8d-81de-8441f5cae679	test-multi-worker-14270708-b1d7-497a-95aa-64054314797f-coordinated	exclusive	config_manager_1750598695888533885	2025-06-22 13:24:55.889548+00	2025-06-22 13:25:25.889548+00	f	\N	2025-06-22 13:24:55.889548+00	2025-06-22 13:24:55.903058+00
945813b8-6921-490b-bb77-77fd32a11f7c	test-concurrent-read-e34d0142-7495-44c8-a108-d36dc4754024	exclusive	config_manager_1750599107963878243	2025-06-22 13:31:47.966613+00	2025-06-22 13:32:17.966613+00	f	\N	2025-06-22 13:31:47.966613+00	2025-06-22 13:31:48.02117+00
d333d95a-dff6-40b1-a478-83081e084bd7	test-concurrent-write-7297eaa6-47fc-46b9-a9fb-9ff4346da626	exclusive	config_manager_1750599108056693341	2025-06-22 13:31:48.060086+00	2025-06-22 13:32:18.060086+00	f	\N	2025-06-22 13:31:48.060086+00	2025-06-22 13:31:48.115925+00
15c836ff-d390-42c3-9479-308e58a603fd	test-cow-semantics-79c01a38-dd94-4d10-bc0c-5c637f52b11a	exclusive	config_manager_1750599108118188950	2025-06-22 13:31:48.120334+00	2025-06-22 13:32:18.120334+00	f	\N	2025-06-22 13:31:48.120334+00	2025-06-22 13:31:48.149676+00
c74c89ad-17c6-44e0-b187-a1747e15cbdb	test-distributed-locking-970e88b4-c934-422e-9953-1f86f06502af	exclusive	test-owner-1	2025-06-22 13:31:48.179075+00	2025-06-22 13:31:58.179075+00	f	\N	2025-06-22 13:31:48.179075+00	2025-06-22 13:31:48.2148+00
80ddb706-58f3-4f79-a1a2-d4daa9c5d65a	test-distributed-locking-970e88b4-c934-422e-9953-1f86f06502af	exclusive	test-owner-2	2025-06-22 13:31:48.230095+00	2025-06-22 13:31:58.230095+00	f	\N	2025-06-22 13:31:48.230095+00	2025-06-22 13:31:48.233482+00
920177ff-0b80-4e91-8cd0-b05106991439	test-race-prevention-7c0f26aa-078b-4ed7-a4b1-16f9ef64eaa2	exclusive	config_manager_1750599108240908186	2025-06-22 13:31:48.242414+00	2025-06-22 13:32:18.242414+00	f	\N	2025-06-22 13:31:48.242414+00	2025-06-22 13:31:48.304837+00
e36f5ac9-8b81-4e76-9fa3-715148806dc6	test-corruption-detection-afee4223-bffb-4ea9-ab7c-bc2005849ae7	exclusive	config_manager_1750599108309166605	2025-06-22 13:31:48.310281+00	2025-06-22 13:32:18.310281+00	f	\N	2025-06-22 13:31:48.310281+00	2025-06-22 13:31:48.32518+00
c322f7da-c93d-4b91-ac6f-31faa5cae334	test-concurrent-read-d240817c-948c-4aab-8334-21670c4f7d7b	exclusive	config_manager_1750599796488567286	2025-06-22 13:43:16.53639+00	2025-06-22 13:43:46.53639+00	f	\N	2025-06-22 13:43:16.53639+00	2025-06-22 13:43:16.606642+00
78cf9d23-2e59-45fc-a956-2f60eac26d53	test-multi-worker-6fe66e5b-65e4-4f21-90ec-1e3910101dc7-mixed	exclusive	config_manager_1750599108327906132	2025-06-22 13:31:48.328923+00	2025-06-22 13:32:18.328923+00	f	\N	2025-06-22 13:31:48.328923+00	2025-06-22 13:31:48.376857+00
9327d465-22f9-49aa-99a5-51d3f430e45c	test-concurrent-read-f45bbaf8-075d-4eb3-b90e-5bd2f57bd18f	exclusive	config_manager_1750612478480155869	2025-06-22 17:14:38.500327+00	2025-06-22 17:15:08.500327+00	f	\N	2025-06-22 17:14:38.500327+00	2025-06-22 17:14:38.567063+00
73383115-e600-4ce4-af6c-1e80f098bcc7	test-multi-worker-6fe66e5b-65e4-4f21-90ec-1e3910101dc7-highfreq	exclusive	config_manager_1750599108382083797	2025-06-22 13:31:48.384347+00	2025-06-22 13:32:18.384347+00	f	\N	2025-06-22 13:31:48.384347+00	2025-06-22 13:31:48.463406+00
9d41e8e1-cca9-4fbe-b8f9-9e11131bcd0f	test-concurrent-write-a6eb134d-b057-42f9-8231-a4dbd2f9b810	exclusive	config_manager_1750599796625392705	2025-06-22 13:43:16.627538+00	2025-06-22 13:43:46.627538+00	f	\N	2025-06-22 13:43:16.627538+00	2025-06-22 13:43:16.890823+00
71209f3e-0d1f-44f7-827c-b431befb2867	test-multi-worker-6fe66e5b-65e4-4f21-90ec-1e3910101dc7-highfreq	exclusive	config_manager_1750599108425770511	2025-06-22 13:31:48.547429+00	2025-06-22 13:32:18.547429+00	f	\N	2025-06-22 13:31:48.547429+00	2025-06-22 13:31:48.60607+00
dd6a75e8-77f5-45aa-a587-2b5143c5f835	test-multi-worker-6fe66e5b-65e4-4f21-90ec-1e3910101dc7-highfreq	exclusive	config_manager_1750599108452339650	2025-06-22 13:31:48.611212+00	2025-06-22 13:32:18.611212+00	f	\N	2025-06-22 13:31:48.611212+00	2025-06-22 13:31:48.700005+00
62433899-7636-4859-b63c-31291fb7d032	test-cow-semantics-590ad41f-2afd-4f4c-bbbe-b381bc0bf648	exclusive	config_manager_1750599797061435298	2025-06-22 13:43:17.105415+00	2025-06-22 13:43:47.105415+00	f	\N	2025-06-22 13:43:17.105415+00	2025-06-22 13:43:17.619682+00
d048c546-a898-4af5-9a6f-2379bee8853c	test-distributed-locking-ba2a5abe-aa11-4b90-9d17-a87201209043	exclusive	test-owner-1	2025-06-22 13:43:17.634277+00	2025-06-22 13:43:27.634277+00	f	\N	2025-06-22 13:43:17.634277+00	2025-06-22 13:43:17.720733+00
ce6dcfe4-50d4-47b5-a79c-dfbbc4337bf5	test-distributed-locking-ba2a5abe-aa11-4b90-9d17-a87201209043	exclusive	test-owner-2	2025-06-22 13:43:17.742286+00	2025-06-22 13:43:27.742286+00	f	\N	2025-06-22 13:43:17.742286+00	2025-06-22 13:43:17.762817+00
52ae7318-2423-4532-b90e-37bbc5bbf5f6	test-race-prevention-52282cc8-bfb5-4107-a0c1-c72e54c6795d	exclusive	config_manager_1750599797860475189	2025-06-22 13:43:17.89016+00	2025-06-22 13:43:47.89016+00	f	\N	2025-06-22 13:43:17.89016+00	2025-06-22 13:43:17.952655+00
83a58517-7390-4fe3-a43b-6ab5b5540d8a	test-corruption-detection-36f46cce-0e7b-480e-b967-475f0e4e458a	exclusive	config_manager_1750599797964666293	2025-06-22 13:43:17.977014+00	2025-06-22 13:43:47.977014+00	f	\N	2025-06-22 13:43:17.977014+00	2025-06-22 13:43:18.056347+00
40c85dfb-9202-4455-8f2d-67599a1f52a2	test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-mixed	exclusive	config_manager_1750599798082288237	2025-06-22 13:43:18.084231+00	2025-06-22 13:43:48.084231+00	f	\N	2025-06-22 13:43:18.084231+00	2025-06-22 13:43:18.140631+00
61c6e194-e052-458a-a0b7-afdc9015a1a6	test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-highfreq	exclusive	config_manager_1750599798154240097	2025-06-22 13:43:18.169117+00	2025-06-22 13:43:48.169117+00	f	\N	2025-06-22 13:43:18.169117+00	2025-06-22 13:43:18.885874+00
7485b87a-8718-42c1-9ed6-e0e46586bc98	test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-highfreq	exclusive	config_manager_1750599798922411795	2025-06-22 13:43:18.929679+00	2025-06-22 13:43:48.929679+00	f	\N	2025-06-22 13:43:18.929679+00	2025-06-22 13:43:18.967641+00
6986094a-94fe-47df-a316-c671cd072e6b	test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-coordinated	exclusive	config_manager_1750599798975796209	2025-06-22 13:43:18.980568+00	2025-06-22 13:43:48.980568+00	f	\N	2025-06-22 13:43:18.980568+00	2025-06-22 13:43:19.059246+00
7610c87e-bd85-43b2-b73a-c86dadb87787	test-concurrent-write-9df616b1-f6b6-4fcf-b053-d89f2e1a6bee	exclusive	config_manager_1750600033303263039	2025-06-22 13:47:13.309684+00	2025-06-22 13:47:43.309684+00	f	\N	2025-06-22 13:47:13.309684+00	2025-06-22 13:47:13.414465+00
b3773ad3-32f2-42f8-aab0-b09f36456a75	test-cow-semantics-c5688633-513a-4f98-b530-fe825ebda43f	exclusive	config_manager_1750600033442107802	2025-06-22 13:47:13.448184+00	2025-06-22 13:47:43.448184+00	f	\N	2025-06-22 13:47:13.448184+00	2025-06-22 13:47:13.652746+00
a9537bc8-b53f-42a6-b0fc-a58095334fde	test-corruption-detection-a0f5b87b-190e-4653-ae65-533863157f7b	exclusive	config_manager_1750600034170516460	2025-06-22 13:47:14.174179+00	2025-06-22 13:47:44.174179+00	f	\N	2025-06-22 13:47:14.174179+00	2025-06-22 13:47:14.399712+00
7959d24b-c5db-4e54-bf99-cafa70e156fb	test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-mixed	exclusive	config_manager_1750600034473500721	2025-06-22 13:47:14.478754+00	2025-06-22 13:47:44.478754+00	f	\N	2025-06-22 13:47:14.478754+00	2025-06-22 13:47:14.599386+00
4ba8b263-21de-43ca-991a-7357ae0fd451	test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-highfreq	exclusive	config_manager_1750600034910784094	2025-06-22 13:47:15.079435+00	2025-06-22 13:47:45.079435+00	f	\N	2025-06-22 13:47:15.079435+00	2025-06-22 13:47:15.107949+00
dea0d3d7-6ab9-435b-9fa3-cc0eb82f1c19	test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-highfreq	exclusive	config_manager_1750600034980545916	2025-06-22 13:47:15.148743+00	2025-06-22 13:47:45.148743+00	f	\N	2025-06-22 13:47:15.148743+00	2025-06-22 13:47:15.32094+00
6cbbab56-828c-4056-9a0f-406d1c6cca1c	test-concurrent-read-c9c10b48-730a-4aa8-afa7-282890a6d765	exclusive	config_manager_1750600330314475859	2025-06-22 13:52:10.384373+00	2025-06-22 13:52:40.384373+00	f	\N	2025-06-22 13:52:10.384373+00	2025-06-22 13:52:10.524711+00
eabb60cb-9728-4d6d-b2f7-9e428a66b48f	test-concurrent-write-a1b9c363-6ae8-47b6-b66d-d9dedd969da3	exclusive	config_manager_1750600330532299660	2025-06-22 13:52:10.539361+00	2025-06-22 13:52:40.539361+00	f	\N	2025-06-22 13:52:10.539361+00	2025-06-22 13:52:10.99894+00
cd5dba21-941b-485c-852f-0a3e56e50227	test-cow-semantics-2fc5dcbc-fef9-4f7a-9bcd-7b8b595f8d8b	exclusive	config_manager_1750600331272191901	2025-06-22 13:52:11.281387+00	2025-06-22 13:52:41.281387+00	f	\N	2025-06-22 13:52:11.281387+00	2025-06-22 13:52:11.442778+00
d019d81e-7b2b-49cc-9395-6c2e2eb86dae	test-cow-semantics-2fc5dcbc-fef9-4f7a-9bcd-7b8b595f8d8b	exclusive	config_manager_1750600331446047410	2025-06-22 13:52:11.447386+00	2025-06-22 13:52:41.447386+00	f	\N	2025-06-22 13:52:11.447386+00	2025-06-22 13:52:11.526704+00
afa667e4-9aef-4035-af1f-2f8cf9201ba8	test-distributed-locking-e44a355b-fabf-4498-8351-be7c72f0c40e	exclusive	test-owner-1	2025-06-22 13:52:11.532445+00	2025-06-22 13:52:21.532445+00	f	\N	2025-06-22 13:52:11.532445+00	2025-06-22 13:52:11.55274+00
12aa2fb0-db18-4adb-a825-4b67655da5de	test-distributed-locking-e44a355b-fabf-4498-8351-be7c72f0c40e	exclusive	test-owner-2	2025-06-22 13:52:11.651166+00	2025-06-22 13:52:21.651166+00	f	\N	2025-06-22 13:52:11.651166+00	2025-06-22 13:52:11.706613+00
c73f3bb4-c15e-4272-9959-91323049f548	test-race-prevention-3e42be78-f85b-4b0a-a3ed-f4889bdcb84f	exclusive	config_manager_1750600331890339933	2025-06-22 13:52:11.908932+00	2025-06-22 13:52:41.908932+00	f	\N	2025-06-22 13:52:11.908932+00	2025-06-22 13:52:12.137174+00
4a65b45c-2a14-4cb6-abbd-bfd3019c5217	test-race-prevention-3e42be78-f85b-4b0a-a3ed-f4889bdcb84f	exclusive	config_manager_1750600332201903300	2025-06-22 13:52:12.230341+00	2025-06-22 13:52:42.230341+00	f	\N	2025-06-22 13:52:12.230341+00	2025-06-22 13:52:12.373784+00
a2eb7b9a-0543-44e7-9d7f-07339c324cb4	test-race-prevention-3e42be78-f85b-4b0a-a3ed-f4889bdcb84f	exclusive	config_manager_1750600332207057246	2025-06-22 13:52:12.395739+00	2025-06-22 13:52:42.395739+00	f	\N	2025-06-22 13:52:12.395739+00	2025-06-22 13:52:12.519197+00
d64944e4-3da6-4593-83bb-128a0c899449	test-corruption-detection-a0a3c25a-0591-40f9-98c7-b7f7d3f87569	exclusive	config_manager_1750600332583444799	2025-06-22 13:52:12.588638+00	2025-06-22 13:52:42.588638+00	f	\N	2025-06-22 13:52:12.588638+00	2025-06-22 13:52:12.746501+00
8fa1b319-0602-4794-9fbb-3a46093b04c1	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-mixed	exclusive	config_manager_1750600333051846406	2025-06-22 13:52:13.229219+00	2025-06-22 13:52:43.229219+00	f	\N	2025-06-22 13:52:13.229219+00	2025-06-22 13:52:13.279001+00
83c6c3e9-45cb-4613-ace3-cef024e16a9a	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-highfreq	exclusive	config_manager_1750600333283515540	2025-06-22 13:52:13.287267+00	2025-06-22 13:52:43.287267+00	f	\N	2025-06-22 13:52:13.287267+00	2025-06-22 13:52:13.361442+00
e3bab76c-9342-4dde-b9c3-c12c17bcbe7c	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-highfreq	exclusive	config_manager_1750600333292827619	2025-06-22 13:52:13.378563+00	2025-06-22 13:52:43.378563+00	f	\N	2025-06-22 13:52:13.378563+00	2025-06-22 13:52:14.067713+00
0de52f55-b65e-4249-b2f7-6c5dd9d22d4b	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-highfreq	exclusive	config_manager_1750600334074884176	2025-06-22 13:52:14.077069+00	2025-06-22 13:52:44.077069+00	f	\N	2025-06-22 13:52:14.077069+00	2025-06-22 13:52:14.378914+00
0cb59723-ef9a-46d8-9dec-e1a039a6ce0b	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-coordinated	exclusive	config_manager_1750600334393998106	2025-06-22 13:52:14.403167+00	2025-06-22 13:52:44.403167+00	f	\N	2025-06-22 13:52:14.403167+00	2025-06-22 13:52:14.670173+00
af38c9e5-c1f9-40a1-ba07-ccdd85cf83bc	test-concurrent-read-2e6f5b8a-ff0f-4537-898c-dd4835239738	exclusive	config_manager_1750600448425842465	2025-06-22 13:54:08.460429+00	2025-06-22 13:54:38.460429+00	f	\N	2025-06-22 13:54:08.460429+00	2025-06-22 13:54:08.774332+00
394be00f-1988-473e-88db-4285a5029e0f	test-cow-semantics-03174397-23dd-45fa-87e8-ae77879e90ba	exclusive	config_manager_1750600449012916033	2025-06-22 13:54:09.015141+00	2025-06-22 13:54:39.015141+00	f	\N	2025-06-22 13:54:09.015141+00	2025-06-22 13:54:09.189725+00
d009ae6b-dacf-4594-8abb-b7a76f4b157a	test-multi-worker-6fe66e5b-65e4-4f21-90ec-1e3910101dc7-highfreq	exclusive	config_manager_1750599108386020449	2025-06-22 13:31:48.476273+00	2025-06-22 13:32:18.476273+00	f	\N	2025-06-22 13:31:48.476273+00	2025-06-22 13:31:48.540908+00
f5e2c26f-3d8b-4e62-b135-6182720e6b05	test-concurrent-read-6741f740-750a-4ad9-944b-ed4db468ec2f	exclusive	config_manager_1750624412038060841	2025-06-22 20:33:32.05362+00	2025-06-22 20:34:02.05362+00	f	\N	2025-06-22 20:33:32.05362+00	2025-06-22 20:33:32.078786+00
b7af6aff-120b-40b5-b722-ea711da47511	test-multi-worker-6fe66e5b-65e4-4f21-90ec-1e3910101dc7-coordinated	exclusive	config_manager_1750599108709709391	2025-06-22 13:31:48.711551+00	2025-06-22 13:32:18.711551+00	f	\N	2025-06-22 13:31:48.711551+00	2025-06-22 13:31:48.729109+00
e6929dbf-8309-4fd3-adb5-b00a36370323	test-concurrent-write-a6eb134d-b057-42f9-8231-a4dbd2f9b810	exclusive	config_manager_1750599796625653589	2025-06-22 13:43:16.936118+00	2025-06-22 13:43:46.936118+00	f	\N	2025-06-22 13:43:16.936118+00	2025-06-22 13:43:16.9889+00
5bb60d22-1d9d-4af1-8c89-e4ca00704765	test-concurrent-read-f3b089d4-00da-4530-8d49-d26720e6b1a7	exclusive	config_manager_1750599557201541645	2025-06-22 13:39:17.253362+00	2025-06-22 13:39:47.253362+00	f	\N	2025-06-22 13:39:17.253362+00	2025-06-22 13:39:17.464283+00
6cf8eec7-d3a3-4cc3-ab6c-c306bd0b4a95	test-concurrent-write-251d3fc5-0d78-47a7-a887-b491b9309322	exclusive	config_manager_1750599557505310566	2025-06-22 13:39:17.523669+00	2025-06-22 13:39:47.523669+00	f	\N	2025-06-22 13:39:17.523669+00	2025-06-22 13:39:17.833185+00
fb568e51-6b58-4ce7-8f56-1584b76dee71	test-concurrent-read-2e176b19-5a03-49fe-931d-a921344b887b	exclusive	config_manager_1750600032503755805	2025-06-22 13:47:12.561384+00	2025-06-22 13:47:42.561384+00	f	\N	2025-06-22 13:47:12.561384+00	2025-06-22 13:47:13.234125+00
2ba551ec-8d70-4f3d-81d7-6667cd9a137b	test-cow-semantics-bb7dee28-c92f-4051-8ae0-c25ffcd578ad	exclusive	config_manager_1750599557856035797	2025-06-22 13:39:17.858031+00	2025-06-22 13:39:47.858031+00	f	\N	2025-06-22 13:39:17.858031+00	2025-06-22 13:39:17.974599+00
339a7707-d31b-4b80-a990-c4a9d7191be9	test-distributed-locking-a5678564-7b15-45cf-8b3a-f7538e3627d4	exclusive	test-owner-1	2025-06-22 13:39:18.074599+00	2025-06-22 13:39:28.074599+00	f	\N	2025-06-22 13:39:18.074599+00	2025-06-22 13:39:18.224575+00
f8c425f1-6a0d-446b-9b34-66c77bd04124	test-distributed-locking-1fceac7d-fd72-47fd-97c4-498ede7c5d09	exclusive	test-owner-1	2025-06-22 13:47:13.724384+00	2025-06-22 13:47:23.724384+00	f	\N	2025-06-22 13:47:13.724384+00	2025-06-22 13:47:13.800205+00
8c7c9303-aa5b-4fad-a90b-d85fb8b85c70	test-distributed-locking-a5678564-7b15-45cf-8b3a-f7538e3627d4	exclusive	test-owner-2	2025-06-22 13:39:18.239375+00	2025-06-22 13:39:28.239375+00	f	\N	2025-06-22 13:39:18.239375+00	2025-06-22 13:39:18.247186+00
a1095148-d6f6-416b-9040-629e9df4d7f5	test-race-prevention-6e7a6b4b-b71d-4777-8037-0dfc063daf19	exclusive	config_manager_1750599558309341582	2025-06-22 13:39:18.311524+00	2025-06-22 13:39:48.311524+00	f	\N	2025-06-22 13:39:18.311524+00	2025-06-22 13:39:18.462413+00
c12f656a-c52a-44dd-b182-0616745f15db	test-distributed-locking-1fceac7d-fd72-47fd-97c4-498ede7c5d09	exclusive	test-owner-2	2025-06-22 13:47:13.859+00	2025-06-22 13:47:23.859+00	f	\N	2025-06-22 13:47:13.859+00	2025-06-22 13:47:13.989719+00
a5da6ea1-af0f-4331-800c-1f4115b63a93	test-corruption-detection-0baec44a-cf74-47b4-8d05-df34ce6f28be	exclusive	config_manager_1750599558466139409	2025-06-22 13:39:18.468214+00	2025-06-22 13:39:48.468214+00	f	\N	2025-06-22 13:39:18.468214+00	2025-06-22 13:39:18.600784+00
5df3af2b-e373-411e-a57b-77911dd513f6	test-multi-worker-f455cf91-c651-4601-a3db-e3d3d535add2-mixed	exclusive	config_manager_1750599558637190508	2025-06-22 13:39:18.641622+00	2025-06-22 13:39:48.641622+00	f	\N	2025-06-22 13:39:18.641622+00	2025-06-22 13:39:18.668588+00
f6513fcc-246d-4265-b028-bfed6118e701	test-race-prevention-878bdf46-e7ac-454e-9815-12c4f9d6efc8	exclusive	config_manager_1750600034048851621	2025-06-22 13:47:14.050928+00	2025-06-22 13:47:44.050928+00	f	\N	2025-06-22 13:47:14.050928+00	2025-06-22 13:47:14.152447+00
93551c2b-3b1c-4fb1-ba22-78a18434ff3e	test-multi-worker-f455cf91-c651-4601-a3db-e3d3d535add2-highfreq	exclusive	config_manager_1750599558673988323	2025-06-22 13:39:18.675482+00	2025-06-22 13:39:48.675482+00	f	\N	2025-06-22 13:39:18.675482+00	2025-06-22 13:39:18.786416+00
6732bd8f-89e5-4864-8589-7d6fcdc2b347	test-multi-worker-f455cf91-c651-4601-a3db-e3d3d535add2-highfreq	exclusive	config_manager_1750599558674675599	2025-06-22 13:39:18.794765+00	2025-06-22 13:39:48.794765+00	f	\N	2025-06-22 13:39:18.794765+00	2025-06-22 13:39:18.85478+00
57e2a924-1357-43d8-a75a-03c25683d92e	test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-highfreq	exclusive	config_manager_1750600034668411928	2025-06-22 13:47:14.689463+00	2025-06-22 13:47:44.689463+00	f	\N	2025-06-22 13:47:14.689463+00	2025-06-22 13:47:15.005085+00
862af101-b3d2-42a9-a26b-8e03b719b419	test-multi-worker-f455cf91-c651-4601-a3db-e3d3d535add2-highfreq	exclusive	config_manager_1750599558674730924	2025-06-22 13:39:18.897545+00	2025-06-22 13:39:48.897545+00	f	\N	2025-06-22 13:39:18.897545+00	2025-06-22 13:39:19.021738+00
ea75164e-e6f3-4156-9604-76695b814ac0	test-multi-worker-f455cf91-c651-4601-a3db-e3d3d535add2-highfreq	exclusive	config_manager_1750599558784820659	2025-06-22 13:39:19.05291+00	2025-06-22 13:39:49.05291+00	f	\N	2025-06-22 13:39:19.05291+00	2025-06-22 13:39:19.192217+00
46529200-99dc-4b1b-a0b3-cb597828f728	test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-highfreq	exclusive	config_manager_1750600034688756234	2025-06-22 13:47:15.011666+00	2025-06-22 13:47:45.011666+00	f	\N	2025-06-22 13:47:15.011666+00	2025-06-22 13:47:15.075692+00
7e7df5a8-e104-4fb7-b379-4d261184d827	test-multi-worker-f455cf91-c651-4601-a3db-e3d3d535add2-highfreq	exclusive	config_manager_1750599558888017393	2025-06-22 13:39:19.245746+00	2025-06-22 13:39:49.245746+00	f	\N	2025-06-22 13:39:19.245746+00	2025-06-22 13:39:19.266124+00
10d913ec-e1ef-417d-8d95-fe575d416175	test-multi-worker-f455cf91-c651-4601-a3db-e3d3d535add2-highfreq	exclusive	config_manager_1750599559048017778	2025-06-22 13:39:19.301619+00	2025-06-22 13:39:49.301619+00	f	\N	2025-06-22 13:39:19.301619+00	2025-06-22 13:39:19.337523+00
bb432950-5cc6-4028-a135-a61fe9586adc	test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-coordinated	exclusive	config_manager_1750600035339678676	2025-06-22 13:47:15.345631+00	2025-06-22 13:47:45.345631+00	f	\N	2025-06-22 13:47:15.345631+00	2025-06-22 13:47:15.6095+00
7b63934d-6e6f-4cb6-926d-7561e8e11dfc	test-multi-worker-f455cf91-c651-4601-a3db-e3d3d535add2-coordinated	exclusive	config_manager_1750599559363690262	2025-06-22 13:39:19.383484+00	2025-06-22 13:39:49.383484+00	f	\N	2025-06-22 13:39:19.383484+00	2025-06-22 13:39:19.483733+00
2d7952be-4555-4efe-8a46-82974c9f4514	test-concurrent-write-a1b9c363-6ae8-47b6-b66d-d9dedd969da3	exclusive	config_manager_1750600330536006941	2025-06-22 13:52:11.021593+00	2025-06-22 13:52:41.021593+00	f	\N	2025-06-22 13:52:11.021593+00	2025-06-22 13:52:11.259962+00
08a328a9-df75-41eb-82a1-d514eebc9a2a	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-mixed	exclusive	config_manager_1750600332809063053	2025-06-22 13:52:12.822278+00	2025-06-22 13:52:42.822278+00	f	\N	2025-06-22 13:52:12.822278+00	2025-06-22 13:52:13.019367+00
dc806f39-812d-4873-a1aa-16cee084a547	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-mixed	exclusive	config_manager_1750600333031152610	2025-06-22 13:52:13.049737+00	2025-06-22 13:52:43.049737+00	f	\N	2025-06-22 13:52:13.049737+00	2025-06-22 13:52:13.112152+00
9b7034f8-68f7-4327-aa31-2d82ba84d254	test-concurrent-write-a3391a27-2d2f-487b-aaf3-498ec0570bce	exclusive	config_manager_1750600448828926448	2025-06-22 13:54:08.854148+00	2025-06-22 13:54:38.854148+00	f	\N	2025-06-22 13:54:08.854148+00	2025-06-22 13:54:09.006235+00
537daf79-fba6-4510-a4d1-337bf2ece665	test-cow-semantics-03174397-23dd-45fa-87e8-ae77879e90ba	exclusive	config_manager_1750600449201580981	2025-06-22 13:54:09.203672+00	2025-06-22 13:54:39.203672+00	f	\N	2025-06-22 13:54:09.203672+00	2025-06-22 13:54:09.294927+00
d0d32c7d-d76a-4d4c-9195-780bfe2e73c8	test-distributed-locking-c477fd41-4f76-48d9-b9a8-7e09e8846907	exclusive	test-owner-1	2025-06-22 13:54:09.345266+00	2025-06-22 13:54:19.345266+00	f	\N	2025-06-22 13:54:09.345266+00	2025-06-22 13:54:09.363707+00
4dabca01-5cbe-451c-88d5-e2c7ed59dde0	test-distributed-locking-c477fd41-4f76-48d9-b9a8-7e09e8846907	exclusive	test-owner-2	2025-06-22 13:54:09.406255+00	2025-06-22 13:54:19.406255+00	f	\N	2025-06-22 13:54:09.406255+00	2025-06-22 13:54:09.467968+00
1f6f3668-196a-48bf-a1ac-27b79994bef6	test-race-prevention-7428d253-04c6-48d1-b967-6d78c8488758	exclusive	config_manager_1750600449545993585	2025-06-22 13:54:09.549725+00	2025-06-22 13:54:39.549725+00	f	\N	2025-06-22 13:54:09.549725+00	2025-06-22 13:54:09.713137+00
2ee49aec-0fc6-4772-91cf-40d935c42396	test-race-prevention-7428d253-04c6-48d1-b967-6d78c8488758	exclusive	config_manager_1750600449719357041	2025-06-22 13:54:09.72533+00	2025-06-22 13:54:39.72533+00	f	\N	2025-06-22 13:54:09.72533+00	2025-06-22 13:54:09.824543+00
2d214c4f-a7cf-464b-ba59-d695388a66e4	test-race-prevention-7428d253-04c6-48d1-b967-6d78c8488758	exclusive	config_manager_1750600449723352539	2025-06-22 13:54:09.874108+00	2025-06-22 13:54:39.874108+00	f	\N	2025-06-22 13:54:09.874108+00	2025-06-22 13:54:09.939307+00
4fcb8349-e8d3-4ff0-9ee1-5146d6178007	test-corruption-detection-b7a77fa2-4bc9-4f6e-be01-622472e59145	exclusive	config_manager_1750600449952280418	2025-06-22 13:54:09.955015+00	2025-06-22 13:54:39.955015+00	f	\N	2025-06-22 13:54:09.955015+00	2025-06-22 13:54:10.069091+00
05c20811-a2ce-460d-82e7-eb95c5308e68	test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-mixed	exclusive	config_manager_1750600450144863309	2025-06-22 13:54:10.147831+00	2025-06-22 13:54:40.147831+00	f	\N	2025-06-22 13:54:10.147831+00	2025-06-22 13:54:10.298033+00
f27f3c0a-90df-41c6-9ef1-fba67e890cf5	test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-mixed	exclusive	config_manager_1750600450350901550	2025-06-22 13:54:10.354117+00	2025-06-22 13:54:40.354117+00	f	\N	2025-06-22 13:54:10.354117+00	2025-06-22 13:54:10.451178+00
e4f34334-3a6d-498f-b507-fcc2418ab4b2	test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-highfreq	exclusive	config_manager_1750600450464858705	2025-06-22 13:54:10.481021+00	2025-06-22 13:54:40.481021+00	f	\N	2025-06-22 13:54:10.481021+00	2025-06-22 13:54:10.621533+00
62d789b2-5f27-48dd-bb05-47bff1ddad6f	test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-highfreq	exclusive	config_manager_1750600450477998633	2025-06-22 13:54:10.627191+00	2025-06-22 13:54:40.627191+00	f	\N	2025-06-22 13:54:10.627191+00	2025-06-22 13:54:10.975969+00
1068777b-df3e-4d5b-b331-d4a4c60253c7	test-concurrent-write-1e333a9a-b632-4d3d-9232-87f292e3f948	exclusive	config_manager_1750612478581979931	2025-06-22 17:14:38.583412+00	2025-06-22 17:15:08.583412+00	f	\N	2025-06-22 17:14:38.583412+00	2025-06-22 17:14:38.660099+00
ff60db75-65d7-48e0-9f79-ca27ffd6002b	test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-highfreq	exclusive	config_manager_1750600451011145507	2025-06-22 13:54:11.016829+00	2025-06-22 13:54:41.016829+00	f	\N	2025-06-22 13:54:11.016829+00	2025-06-22 13:54:11.052306+00
84b20aa8-df45-4c3b-89a2-7c25f24d91e5	test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-coordinated	exclusive	config_manager_1750600451092893563	2025-06-22 13:54:11.098061+00	2025-06-22 13:54:41.098061+00	f	\N	2025-06-22 13:54:11.098061+00	2025-06-22 13:54:11.126296+00
94578bb5-de6b-4eef-a31d-b5e4a9aedc4d	test-cow-semantics-75bfc7c9-eb98-48a8-aeb6-9a75f4fc3fe2	exclusive	config_manager_1750612478670028040	2025-06-22 17:14:38.671711+00	2025-06-22 17:15:08.671711+00	f	\N	2025-06-22 17:14:38.671711+00	2025-06-22 17:14:38.701059+00
47dfcdbc-27e5-4180-ae95-b3789e02e77c	test-concurrent-read-acb1fed9-4d65-4c5f-9509-dd961b0e4eda	exclusive	config_manager_1750601682551303863	2025-06-22 14:14:42.577183+00	2025-06-22 14:15:12.577183+00	f	\N	2025-06-22 14:14:42.577183+00	2025-06-22 14:14:42.785937+00
0b6ae748-3363-437f-8b2e-047d69eda58d	test-concurrent-write-d275ab59-5337-4001-9fd9-f0b668fc1f05	exclusive	config_manager_1750601682844618790	2025-06-22 14:14:42.875989+00	2025-06-22 14:15:12.875989+00	f	\N	2025-06-22 14:14:42.875989+00	2025-06-22 14:14:43.010809+00
26900c11-4e38-48af-a3fa-dfb61a3615c5	test-cow-semantics-75bfc7c9-eb98-48a8-aeb6-9a75f4fc3fe2	exclusive	config_manager_1750612478702930448	2025-06-22 17:14:38.704049+00	2025-06-22 17:15:08.704049+00	f	\N	2025-06-22 17:14:38.704049+00	2025-06-22 17:14:38.712302+00
a19b508f-13a8-4e35-985b-2ad9bd2066fd	test-cow-semantics-c346041b-6e5e-46aa-bf8e-3a717af8f505	exclusive	config_manager_1750601683026021244	2025-06-22 14:14:43.055767+00	2025-06-22 14:15:13.055767+00	f	\N	2025-06-22 14:14:43.055767+00	2025-06-22 14:14:43.10972+00
9093fbaf-ea13-4b1b-aa15-f1e1cc21d976	test-cow-semantics-c346041b-6e5e-46aa-bf8e-3a717af8f505	exclusive	config_manager_1750601683115256414	2025-06-22 14:14:43.125177+00	2025-06-22 14:15:13.125177+00	f	\N	2025-06-22 14:14:43.125177+00	2025-06-22 14:14:43.288871+00
2a993f3d-58be-4da5-a315-9d565dcba577	test-distributed-locking-dedfcec8-bded-4bcd-bc2c-2fa312c50edb	exclusive	test-owner-1	2025-06-22 17:14:38.721724+00	2025-06-22 17:14:48.721724+00	f	\N	2025-06-22 17:14:38.721724+00	2025-06-22 17:14:38.740114+00
d6ad688a-6bb2-44ee-8653-3b6a758d752f	test-distributed-locking-25011969-f639-41f7-9618-b461ddb48df7	exclusive	test-owner-1	2025-06-22 14:14:43.352749+00	2025-06-22 14:14:53.352749+00	f	\N	2025-06-22 14:14:43.352749+00	2025-06-22 14:14:43.412875+00
811c9f9d-b2d2-4b87-b5a6-42a4aa54cbbb	test-distributed-locking-25011969-f639-41f7-9618-b461ddb48df7	exclusive	test-owner-2	2025-06-22 14:14:43.433136+00	2025-06-22 14:14:53.433136+00	f	\N	2025-06-22 14:14:43.433136+00	2025-06-22 14:14:43.490212+00
d6a06fe4-dd4e-4534-bef2-970324ddbc10	test-distributed-locking-dedfcec8-bded-4bcd-bc2c-2fa312c50edb	exclusive	test-owner-2	2025-06-22 17:14:38.742932+00	2025-06-22 17:14:48.742932+00	f	\N	2025-06-22 17:14:38.742932+00	2025-06-22 17:14:38.746965+00
2b9462b5-3544-4755-8726-bd003bb74fde	test-race-prevention-4ac3760d-3f6d-4d66-80f4-0910c68ef966	exclusive	config_manager_1750601683524272741	2025-06-22 14:14:43.527163+00	2025-06-22 14:15:13.527163+00	f	\N	2025-06-22 14:14:43.527163+00	2025-06-22 14:14:43.768499+00
6a7c1cc8-2533-43fe-a61e-413f44c2e172	test-race-prevention-4ac3760d-3f6d-4d66-80f4-0910c68ef966	exclusive	config_manager_1750601683809401120	2025-06-22 14:14:43.841172+00	2025-06-22 14:15:13.841172+00	f	\N	2025-06-22 14:14:43.841172+00	2025-06-22 14:14:44.019715+00
ee0a09a0-a362-4932-9690-aa5bb01a9d9e	test-race-prevention-e1caf7d1-b69a-4cc7-b796-b83664c6aa16	exclusive	config_manager_1750612478754100817	2025-06-22 17:14:38.754905+00	2025-06-22 17:15:08.754905+00	f	\N	2025-06-22 17:14:38.754905+00	2025-06-22 17:14:38.774591+00
9225eb4c-4105-473c-923b-42c0b2a8dd37	test-corruption-detection-5e3b4eda-c0c6-4eb9-bc43-013d856b2e22	exclusive	config_manager_1750601684029016261	2025-06-22 14:14:44.0321+00	2025-06-22 14:15:14.0321+00	f	\N	2025-06-22 14:14:44.0321+00	2025-06-22 14:14:44.075818+00
37da5fa2-28f7-4b5a-a4c6-67c20b23fc00	test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-mixed	exclusive	config_manager_1750601684122220471	2025-06-22 14:14:44.124199+00	2025-06-22 14:15:14.124199+00	f	\N	2025-06-22 14:14:44.124199+00	2025-06-22 14:14:44.159976+00
5a72ca5d-bf77-4910-8921-190225261820	test-race-prevention-e1caf7d1-b69a-4cc7-b796-b83664c6aa16	exclusive	config_manager_1750612478776084712	2025-06-22 17:14:38.777581+00	2025-06-22 17:15:08.777581+00	f	\N	2025-06-22 17:14:38.777581+00	2025-06-22 17:14:38.808355+00
10a5b730-c5cb-481b-8a82-cd499c9fb6f7	test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-mixed	exclusive	config_manager_1750601684167565141	2025-06-22 14:14:44.168877+00	2025-06-22 14:15:14.168877+00	f	\N	2025-06-22 14:14:44.168877+00	2025-06-22 14:14:44.210191+00
36283bf6-1b52-4875-a62a-d1532581d5bf	test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-highfreq	exclusive	config_manager_1750601684213643117	2025-06-22 14:14:44.215872+00	2025-06-22 14:15:14.215872+00	f	\N	2025-06-22 14:14:44.215872+00	2025-06-22 14:14:44.316062+00
90131ff3-8c5d-4239-a56f-1a25b939528d	test-corruption-detection-315dfcc0-417a-44b0-8a0f-8dd9cacc1339	exclusive	config_manager_1750612478811004077	2025-06-22 17:14:38.812317+00	2025-06-22 17:15:08.812317+00	f	\N	2025-06-22 17:14:38.812317+00	2025-06-22 17:14:38.836055+00
7f371f59-489c-43de-96b9-90f18a2981fa	test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-highfreq	exclusive	config_manager_1750601684250492769	2025-06-22 14:14:44.321494+00	2025-06-22 14:15:14.321494+00	f	\N	2025-06-22 14:14:44.321494+00	2025-06-22 14:14:44.346976+00
ea325a76-e276-4325-b5ab-39b11aadbe4c	test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-highfreq	exclusive	config_manager_1750601684305039067	2025-06-22 14:14:44.35273+00	2025-06-22 14:15:14.35273+00	f	\N	2025-06-22 14:14:44.35273+00	2025-06-22 14:14:44.376813+00
5bc2c247-8942-4d48-9d21-723680f627d3	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-mixed	exclusive	config_manager_1750612478860865853	2025-06-22 17:14:38.861859+00	2025-06-22 17:15:08.861859+00	f	\N	2025-06-22 17:14:38.861859+00	2025-06-22 17:14:38.875617+00
072b4df8-ae05-4136-9142-78db628d8845	test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-coordinated	exclusive	config_manager_1750601684385838439	2025-06-22 14:14:44.387946+00	2025-06-22 14:15:14.387946+00	f	\N	2025-06-22 14:14:44.387946+00	2025-06-22 14:14:44.433721+00
56340bed-9800-4443-9299-8f95c467f2f4	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-mixed	exclusive	config_manager_1750612478878348003	2025-06-22 17:14:38.880167+00	2025-06-22 17:15:08.880167+00	f	\N	2025-06-22 17:14:38.880167+00	2025-06-22 17:14:38.917152+00
5ba74a7f-ebd1-4e99-879f-844d8204300c	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-highfreq	exclusive	config_manager_1750612478918528580	2025-06-22 17:14:38.919054+00	2025-06-22 17:15:08.919054+00	f	\N	2025-06-22 17:14:38.919054+00	2025-06-22 17:14:38.946147+00
3eceda9a-35b2-4341-a902-24c8fb9c2de2	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-highfreq	exclusive	config_manager_1750612478918929304	2025-06-22 17:14:38.947544+00	2025-06-22 17:15:08.947544+00	f	\N	2025-06-22 17:14:38.947544+00	2025-06-22 17:14:39.046522+00
9f87c9e0-2413-49f1-af11-f672319243cd	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-highfreq	exclusive	config_manager_1750612478976453451	2025-06-22 17:14:39.062976+00	2025-06-22 17:15:09.062976+00	f	\N	2025-06-22 17:14:39.062976+00	2025-06-22 17:14:39.070447+00
c4651b58-44b7-44e8-bf19-d2715c81c582	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-highfreq	exclusive	config_manager_1750612479064078230	2025-06-22 17:14:39.072445+00	2025-06-22 17:15:09.072445+00	f	\N	2025-06-22 17:14:39.072445+00	2025-06-22 17:14:39.08114+00
ab0c71cd-0e5d-4e1c-9aef-e7823ff5fcf7	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-coordinated	exclusive	config_manager_1750612479086983336	2025-06-22 17:14:39.087867+00	2025-06-22 17:15:09.087867+00	f	\N	2025-06-22 17:14:39.087867+00	2025-06-22 17:14:39.12447+00
50d4dee8-8e46-4556-a5ee-1659a3357962	test-concurrent-read-5d997b6a-0f69-4871-a8cd-a7a5ce5ced7f	exclusive	config_manager_1750612901350260706	2025-06-22 17:21:41.352731+00	2025-06-22 17:22:11.352731+00	f	\N	2025-06-22 17:21:41.352731+00	2025-06-22 17:21:41.378823+00
9a8eeb0a-c73a-4372-8308-d503bec1fb15	test-concurrent-write-b4620760-7673-44b4-942a-d6c40089854e	exclusive	config_manager_1750612901381042268	2025-06-22 17:21:41.381433+00	2025-06-22 17:22:11.381433+00	f	\N	2025-06-22 17:21:41.381433+00	2025-06-22 17:21:41.426868+00
ffb40ba7-c2af-419d-9c80-ce955ec21f6b	test-concurrent-write-b4620760-7673-44b4-942a-d6c40089854e	exclusive	config_manager_1750612901382182364	2025-06-22 17:21:41.453218+00	2025-06-22 17:22:11.453218+00	f	\N	2025-06-22 17:21:41.453218+00	2025-06-22 17:21:41.482201+00
3d62e1ed-443e-4a76-a55b-86fe12c59474	test-cow-semantics-d721e985-2f21-4b3f-9db8-a0b93ec06709	exclusive	config_manager_1750612901490122711	2025-06-22 17:21:41.491355+00	2025-06-22 17:22:11.491355+00	f	\N	2025-06-22 17:21:41.491355+00	2025-06-22 17:21:41.508672+00
159080a6-6dad-458c-a51b-fe68c7bad801	test-cow-semantics-d721e985-2f21-4b3f-9db8-a0b93ec06709	exclusive	config_manager_1750612901510259841	2025-06-22 17:21:41.511156+00	2025-06-22 17:22:11.511156+00	f	\N	2025-06-22 17:21:41.511156+00	2025-06-22 17:21:41.538081+00
efb49890-30e2-4532-8ba1-fc43f9858779	test-distributed-locking-3585c76a-2cce-4195-a2df-fa69e0647d08	exclusive	test-owner-1	2025-06-22 17:21:41.555298+00	2025-06-22 17:21:51.555298+00	f	\N	2025-06-22 17:21:41.555298+00	2025-06-22 17:21:41.566528+00
c41ab1ff-fd0d-4977-a0b7-fce14cc2756d	test-distributed-locking-3585c76a-2cce-4195-a2df-fa69e0647d08	exclusive	test-owner-2	2025-06-22 17:21:41.569747+00	2025-06-22 17:21:51.569747+00	f	\N	2025-06-22 17:21:41.569747+00	2025-06-22 17:21:41.573185+00
91c9530a-639b-4ec1-b9cc-962c12d4fbf2	test-race-prevention-ae427cf1-c5e1-4012-ad50-c17c5c1ce166	exclusive	config_manager_1750612901588961792	2025-06-22 17:21:41.589865+00	2025-06-22 17:22:11.589865+00	f	\N	2025-06-22 17:21:41.589865+00	2025-06-22 17:21:41.603566+00
27bcf9d3-467b-45e5-a1cb-7751612d4f37	test-concurrent-write-a0e8dc54-3364-4d52-a655-361df87ffdf4	exclusive	config_manager_1750624412082148371	2025-06-22 20:33:32.083347+00	2025-06-22 20:34:02.083347+00	f	\N	2025-06-22 20:33:32.083347+00	2025-06-22 20:33:32.157038+00
18a03355-1a40-4d8a-afd5-265fb9ab432e	test-race-prevention-ae427cf1-c5e1-4012-ad50-c17c5c1ce166	exclusive	config_manager_1750612901608405157	2025-06-22 17:21:41.609+00	2025-06-22 17:22:11.609+00	f	\N	2025-06-22 17:21:41.609+00	2025-06-22 17:21:41.631723+00
3d8d39cf-86e0-4801-b967-344894a90e5c	test-corruption-detection-d936c9c9-f3b1-46ef-a9bc-7bfeacb933bb	exclusive	config_manager_1750612901634040186	2025-06-22 17:21:41.63521+00	2025-06-22 17:22:11.63521+00	f	\N	2025-06-22 17:21:41.63521+00	2025-06-22 17:21:41.672198+00
7ef13155-cd55-4862-b423-f322a2880e56	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-mixed	exclusive	config_manager_1750612901694969311	2025-06-22 17:21:41.695922+00	2025-06-22 17:22:11.695922+00	f	\N	2025-06-22 17:21:41.695922+00	2025-06-22 17:21:41.715902+00
697a1131-1a07-4b6b-a45c-2f50d55816a3	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-mixed	exclusive	config_manager_1750612901727331584	2025-06-22 17:21:41.731158+00	2025-06-22 17:22:11.731158+00	f	\N	2025-06-22 17:21:41.731158+00	2025-06-22 17:21:41.761423+00
5bab39b1-61f4-4974-91c0-eb6b86c62fad	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-highfreq	exclusive	config_manager_1750612901765866649	2025-06-22 17:21:41.767553+00	2025-06-22 17:22:11.767553+00	f	\N	2025-06-22 17:21:41.767553+00	2025-06-22 17:21:41.80486+00
e6e46428-0fa8-4c29-8063-6bb4e8599d6e	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-highfreq	exclusive	config_manager_1750612901767160930	2025-06-22 17:21:41.806587+00	2025-06-22 17:22:11.806587+00	f	\N	2025-06-22 17:21:41.806587+00	2025-06-22 17:21:41.813846+00
6a9badc7-7db5-4e2b-bc26-311e0a560d19	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-highfreq	exclusive	config_manager_1750612901767427986	2025-06-22 17:21:41.815874+00	2025-06-22 17:22:11.815874+00	f	\N	2025-06-22 17:21:41.815874+00	2025-06-22 17:21:41.822156+00
bf7278bf-f1dc-43b5-8c4e-9503c79f435a	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-highfreq	exclusive	config_manager_1750612901803280959	2025-06-22 17:21:41.825052+00	2025-06-22 17:22:11.825052+00	f	\N	2025-06-22 17:21:41.825052+00	2025-06-22 17:21:41.900534+00
cf2d6dac-9f56-4b45-bfe3-b037a488701f	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-highfreq	exclusive	config_manager_1750612901814152172	2025-06-22 17:21:41.90424+00	2025-06-22 17:22:11.90424+00	f	\N	2025-06-22 17:21:41.90424+00	2025-06-22 17:21:41.91254+00
0ca9f2ed-adcf-4da4-99ce-d632c5749cc6	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-coordinated	exclusive	config_manager_1750612901918450909	2025-06-22 17:21:41.919833+00	2025-06-22 17:22:11.919833+00	f	\N	2025-06-22 17:21:41.919833+00	2025-06-22 17:21:41.985381+00
c1bb1347-45fc-4183-97ba-82c484204098	test-concurrent-read-5d85eda8-1f83-408f-bf4a-028d883c54d4	exclusive	config_manager_1750612991666251343	2025-06-22 17:23:11.679665+00	2025-06-22 17:23:41.679665+00	f	\N	2025-06-22 17:23:11.679665+00	2025-06-22 17:23:11.74124+00
1bd6f829-bf00-4c08-8d22-53ec57704e38	test-concurrent-write-f220fad3-ac68-4f73-834f-37be83d4fa56	exclusive	config_manager_1750612991745950120	2025-06-22 17:23:11.747449+00	2025-06-22 17:23:41.747449+00	f	\N	2025-06-22 17:23:11.747449+00	2025-06-22 17:23:11.801277+00
544fdf52-50f4-4adc-87ba-c6e2ebcaa472	test-cow-semantics-a1ee6fb4-4a80-456f-9ac5-9ba4475af8c8	exclusive	config_manager_1750612991802952126	2025-06-22 17:23:11.803645+00	2025-06-22 17:23:41.803645+00	f	\N	2025-06-22 17:23:11.803645+00	2025-06-22 17:23:11.814336+00
0f8f65ac-51fc-4aaa-b49d-b91efe3eecc9	test-cow-semantics-a1ee6fb4-4a80-456f-9ac5-9ba4475af8c8	exclusive	config_manager_1750612991815596265	2025-06-22 17:23:11.816639+00	2025-06-22 17:23:41.816639+00	f	\N	2025-06-22 17:23:11.816639+00	2025-06-22 17:23:11.844817+00
5932e82c-292c-4624-941f-10bded31a229	test-distributed-locking-c0092a9b-ac2e-418b-8fc3-6b2924010871	exclusive	test-owner-1	2025-06-22 17:23:11.858369+00	2025-06-22 17:23:21.858369+00	f	\N	2025-06-22 17:23:11.858369+00	2025-06-22 17:23:11.86059+00
f8fb591e-d05c-4409-8344-e8b2e630e91d	test-distributed-locking-c0092a9b-ac2e-418b-8fc3-6b2924010871	exclusive	test-owner-2	2025-06-22 17:23:11.86202+00	2025-06-22 17:23:21.86202+00	f	\N	2025-06-22 17:23:11.86202+00	2025-06-22 17:23:11.863475+00
b858d0f8-381f-4eec-82a1-233719894e55	test-race-prevention-8bbdfd3f-0258-4177-a1bd-d0395c979dfb	exclusive	config_manager_1750612991868291796	2025-06-22 17:23:11.86868+00	2025-06-22 17:23:41.86868+00	f	\N	2025-06-22 17:23:11.86868+00	2025-06-22 17:23:11.876134+00
058e3da5-e3d8-4691-9abe-57f1f6000743	test-race-prevention-8bbdfd3f-0258-4177-a1bd-d0395c979dfb	exclusive	config_manager_1750612991878138071	2025-06-22 17:23:11.879359+00	2025-06-22 17:23:41.879359+00	f	\N	2025-06-22 17:23:11.879359+00	2025-06-22 17:23:11.911812+00
9e1eabac-924d-4f0d-b0b4-b19e13e0963f	test-race-prevention-8bbdfd3f-0258-4177-a1bd-d0395c979dfb	exclusive	config_manager_1750612991878370535	2025-06-22 17:23:11.918224+00	2025-06-22 17:23:41.918224+00	f	\N	2025-06-22 17:23:11.918224+00	2025-06-22 17:23:11.945189+00
cb6e3c05-3ecc-4d81-8946-6966a7878b89	test-corruption-detection-0a585f48-855f-4739-a571-f5094d835db6	exclusive	config_manager_1750612991947142234	2025-06-22 17:23:11.948597+00	2025-06-22 17:23:41.948597+00	f	\N	2025-06-22 17:23:11.948597+00	2025-06-22 17:23:11.992182+00
357727e9-b899-4717-9bf4-d5b3189ef283	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-mixed	exclusive	config_manager_1750612991998512872	2025-06-22 17:23:12.000155+00	2025-06-22 17:23:42.000155+00	f	\N	2025-06-22 17:23:12.000155+00	2025-06-22 17:23:12.012439+00
dfb9a58e-68c5-4c73-9853-bd7d3d5d7052	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-mixed	exclusive	config_manager_1750612992017075695	2025-06-22 17:23:12.024616+00	2025-06-22 17:23:42.024616+00	f	\N	2025-06-22 17:23:12.024616+00	2025-06-22 17:23:12.052208+00
33df01df-8796-4cae-91db-ef69d61d0b4f	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-highfreq	exclusive	config_manager_1750612992084300344	2025-06-22 17:23:12.08618+00	2025-06-22 17:23:42.08618+00	f	\N	2025-06-22 17:23:12.08618+00	2025-06-22 17:23:12.138401+00
3e465bf5-8634-4794-95da-fb5db344ee11	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-highfreq	exclusive	config_manager_1750612992085260823	2025-06-22 17:23:12.141799+00	2025-06-22 17:23:42.141799+00	f	\N	2025-06-22 17:23:12.141799+00	2025-06-22 17:23:12.1684+00
a9e70370-5fde-4418-98c1-2764a1dd0c63	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-highfreq	exclusive	config_manager_1750612992096453002	2025-06-22 17:23:12.169881+00	2025-06-22 17:23:42.169881+00	f	\N	2025-06-22 17:23:12.169881+00	2025-06-22 17:23:12.18123+00
32af859e-0a84-4ca0-90c0-fc9040471f77	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-highfreq	exclusive	config_manager_1750612992143703387	2025-06-22 17:23:12.185631+00	2025-06-22 17:23:42.185631+00	f	\N	2025-06-22 17:23:12.185631+00	2025-06-22 17:23:12.194085+00
d296f5f0-2db6-4e81-8acf-a3c9c4829b3f	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-highfreq	exclusive	config_manager_1750612992173283986	2025-06-22 17:23:12.195209+00	2025-06-22 17:23:42.195209+00	f	\N	2025-06-22 17:23:12.195209+00	2025-06-22 17:23:12.200816+00
a591c0c8-0af2-45ed-b8bc-99ba8cab947b	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-coordinated	exclusive	config_manager_1750612992215862019	2025-06-22 17:23:12.220093+00	2025-06-22 17:23:42.220093+00	f	\N	2025-06-22 17:23:12.220093+00	2025-06-22 17:23:12.238032+00
c2600a29-162b-46d1-a9d3-2fff2b576989	test-concurrent-read-3db89ebe-b077-45a0-a895-24b03d385bd5	exclusive	config_manager_1750614041634006789	2025-06-22 17:40:41.635569+00	2025-06-22 17:41:11.635569+00	f	\N	2025-06-22 17:40:41.635569+00	2025-06-22 17:40:41.64998+00
64da6a2e-519d-4f93-b11f-a59449ba411c	test-concurrent-write-466cd2b1-f6b0-4ace-8561-3780d0e8dce5	exclusive	config_manager_1750614041651874845	2025-06-22 17:40:41.652292+00	2025-06-22 17:41:11.652292+00	f	\N	2025-06-22 17:40:41.652292+00	2025-06-22 17:40:41.688925+00
0ab96281-17c8-46f2-9acb-f5a12bf4c46e	test-concurrent-write-466cd2b1-f6b0-4ace-8561-3780d0e8dce5	exclusive	config_manager_1750614041651992256	2025-06-22 17:40:41.708409+00	2025-06-22 17:41:11.708409+00	f	\N	2025-06-22 17:40:41.708409+00	2025-06-22 17:40:41.723886+00
66ab2ccb-33a6-4018-8f09-d71757fee554	test-cow-semantics-a3201ddd-a4da-4507-a541-4cd9d83d0357	exclusive	config_manager_1750614041729018026	2025-06-22 17:40:41.730328+00	2025-06-22 17:41:11.730328+00	f	\N	2025-06-22 17:40:41.730328+00	2025-06-22 17:40:41.742415+00
ad534606-a00d-4297-94ab-253f6ab2b49a	test-cow-semantics-a3201ddd-a4da-4507-a541-4cd9d83d0357	exclusive	config_manager_1750614041743720523	2025-06-22 17:40:41.745186+00	2025-06-22 17:41:11.745186+00	f	\N	2025-06-22 17:40:41.745186+00	2025-06-22 17:40:41.814715+00
b943a219-dd87-4239-ba6b-bac7045cf8ca	test-distributed-locking-f6940b7e-45bd-4cc4-a897-b13bee56e6bb	exclusive	test-owner-1	2025-06-22 17:40:41.833651+00	2025-06-22 17:40:51.833651+00	f	\N	2025-06-22 17:40:41.833651+00	2025-06-22 17:40:41.841395+00
9ab55575-91b3-459c-a494-9586b314e1b9	test-distributed-locking-f6940b7e-45bd-4cc4-a897-b13bee56e6bb	exclusive	test-owner-2	2025-06-22 17:40:41.878924+00	2025-06-22 17:40:51.878924+00	f	\N	2025-06-22 17:40:41.878924+00	2025-06-22 17:40:41.884342+00
79e35d56-66ef-4142-8113-17292809c985	test-race-prevention-0ad08549-dce1-4fbd-a903-5b7c5b54f7fa	exclusive	config_manager_1750614041912069583	2025-06-22 17:40:41.920905+00	2025-06-22 17:41:11.920905+00	f	\N	2025-06-22 17:40:41.920905+00	2025-06-22 17:40:41.936836+00
56118d28-9517-4112-9201-e22fd64786f9	test-race-prevention-0ad08549-dce1-4fbd-a903-5b7c5b54f7fa	exclusive	config_manager_1750614041959197191	2025-06-22 17:40:41.973658+00	2025-06-22 17:41:11.973658+00	f	\N	2025-06-22 17:40:41.973658+00	2025-06-22 17:40:42.017288+00
d92f61de-d21b-497d-a5c3-5306432fad7b	test-corruption-detection-b181eec6-6ff4-46db-8602-a41b95d87903	exclusive	config_manager_1750614042031705412	2025-06-22 17:40:42.032957+00	2025-06-22 17:41:12.032957+00	f	\N	2025-06-22 17:40:42.032957+00	2025-06-22 17:40:42.094952+00
1895a157-aaa3-48cb-834d-3957b7273d1e	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-mixed	exclusive	config_manager_1750614042102399995	2025-06-22 17:40:42.10355+00	2025-06-22 17:41:12.10355+00	f	\N	2025-06-22 17:40:42.10355+00	2025-06-22 17:40:42.147016+00
e51db10f-7800-4359-8943-4708ea8aa0ac	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-mixed	exclusive	config_manager_1750614042158203639	2025-06-22 17:40:42.159416+00	2025-06-22 17:41:12.159416+00	f	\N	2025-06-22 17:40:42.159416+00	2025-06-22 17:40:42.166284+00
deb9d895-abaf-4c81-bc2e-98013c596f02	test-cow-semantics-b2598368-b14f-4fa6-b005-c98f08c1ba3b	exclusive	config_manager_1750624412159527870	2025-06-22 20:33:32.160064+00	2025-06-22 20:34:02.160064+00	f	\N	2025-06-22 20:33:32.160064+00	2025-06-22 20:33:32.191462+00
e2ba8894-199a-4c19-987f-64c4b0dbc352	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-highfreq	exclusive	config_manager_1750614042198461045	2025-06-22 17:40:42.203373+00	2025-06-22 17:41:12.203373+00	f	\N	2025-06-22 17:40:42.203373+00	2025-06-22 17:40:42.218818+00
ba2244b4-3c1d-426c-90b2-5874c45539bd	test-distributed-locking-825ba1d8-4834-4216-a5a5-f22b57fd2d65	exclusive	test-owner-2	2025-06-22 20:33:32.233188+00	2025-06-22 20:33:42.233188+00	f	\N	2025-06-22 20:33:32.233188+00	2025-06-22 20:33:32.245214+00
0847f31c-ec60-4ef2-899e-efdbd3e506e0	test-race-prevention-2543233b-563c-44c2-b421-08be9007acec	exclusive	config_manager_1750624412263095636	2025-06-22 20:33:32.264467+00	2025-06-22 20:34:02.264467+00	f	\N	2025-06-22 20:33:32.264467+00	2025-06-22 20:33:32.297015+00
8336a115-3223-465f-bb74-886101417dd7	test-race-prevention-2543233b-563c-44c2-b421-08be9007acec	exclusive	config_manager_1750624412299565853	2025-06-22 20:33:32.300491+00	2025-06-22 20:34:02.300491+00	f	\N	2025-06-22 20:33:32.300491+00	2025-06-22 20:33:32.339645+00
66ae634a-cfd6-4ba9-a475-5cc1a7ebbf41	test-corruption-detection-8e23e951-c0b4-4d19-a789-7fc51b884d68	exclusive	config_manager_1750624412347049806	2025-06-22 20:33:32.34794+00	2025-06-22 20:34:02.34794+00	f	\N	2025-06-22 20:33:32.34794+00	2025-06-22 20:33:32.368818+00
64570456-732d-4811-b7fe-6f1815c0a50f	test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-mixed	exclusive	config_manager_1750624412374660078	2025-06-22 20:33:32.375916+00	2025-06-22 20:34:02.375916+00	f	\N	2025-06-22 20:33:32.375916+00	2025-06-22 20:33:32.410403+00
49f919ef-098b-44ea-a4e1-df64fdc48dce	test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-mixed	exclusive	config_manager_1750624412412476046	2025-06-22 20:33:32.41304+00	2025-06-22 20:34:02.41304+00	f	\N	2025-06-22 20:33:32.41304+00	2025-06-22 20:33:32.448539+00
59075470-1dc0-47b2-9cb9-c1de47c56b6b	test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-highfreq	exclusive	config_manager_1750624412450322176	2025-06-22 20:33:32.451032+00	2025-06-22 20:34:02.451032+00	f	\N	2025-06-22 20:33:32.451032+00	2025-06-22 20:33:32.539842+00
d45a3d73-602b-4575-9d57-6cfb22c07738	test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-highfreq	exclusive	config_manager_1750624412460441015	2025-06-22 20:33:32.543181+00	2025-06-22 20:34:02.543181+00	f	\N	2025-06-22 20:33:32.543181+00	2025-06-22 20:33:32.562409+00
ae68d7a8-b34c-4636-8ac3-331851cb973a	test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-highfreq	exclusive	config_manager_1750624412519277149	2025-06-22 20:33:32.576523+00	2025-06-22 20:34:02.576523+00	f	\N	2025-06-22 20:33:32.576523+00	2025-06-22 20:33:32.585776+00
f0d9ff7b-6311-4f4c-9c8d-02ae9f66bec6	test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-coordinated	exclusive	config_manager_1750624412590195222	2025-06-22 20:33:32.591258+00	2025-06-22 20:34:02.591258+00	f	\N	2025-06-22 20:33:32.591258+00	2025-06-22 20:33:32.609609+00
8a2bd9dc-b04e-48e0-b081-c48c5cf1b511	test-concurrent-read-2e104c79-2617-49b7-8b38-23c7d83690c8	exclusive	config_manager_1750624574404004138	2025-06-22 20:36:14.405825+00	2025-06-22 20:36:44.405825+00	f	\N	2025-06-22 20:36:14.405825+00	2025-06-22 20:36:14.437075+00
21fa42cb-2714-4831-baa7-a2fe0bb48266	test-concurrent-write-44e61f3c-1c1e-45e4-8fde-266fedb2d113	exclusive	config_manager_1750624574440108617	2025-06-22 20:36:14.441048+00	2025-06-22 20:36:44.441048+00	f	\N	2025-06-22 20:36:14.441048+00	2025-06-22 20:36:14.482176+00
e06a03d8-e8ac-4b3b-918e-46674d270193	test-concurrent-write-44e61f3c-1c1e-45e4-8fde-266fedb2d113	exclusive	config_manager_1750624574440517358	2025-06-22 20:36:14.496032+00	2025-06-22 20:36:44.496032+00	f	\N	2025-06-22 20:36:14.496032+00	2025-06-22 20:36:14.543851+00
bd32263b-93db-44cf-a0b5-1713f3867c16	test-cow-semantics-3af4471d-6a0b-498c-8f04-8aae85b14389	exclusive	config_manager_1750624574552141690	2025-06-22 20:36:14.553998+00	2025-06-22 20:36:44.553998+00	f	\N	2025-06-22 20:36:14.553998+00	2025-06-22 20:36:14.58625+00
aae9ae01-b7e3-49c9-85c9-ccb12ef4a6e1	test-cow-semantics-3af4471d-6a0b-498c-8f04-8aae85b14389	exclusive	config_manager_1750624574588095101	2025-06-22 20:36:14.589455+00	2025-06-22 20:36:44.589455+00	f	\N	2025-06-22 20:36:14.589455+00	2025-06-22 20:36:14.603602+00
6a5d209a-2be0-466e-8d0c-88c07c16cc7b	test-distributed-locking-f1b7942e-2195-49e9-a500-29ea7d989299	exclusive	test-owner-1	2025-06-22 20:36:14.609011+00	2025-06-22 20:36:24.609011+00	f	\N	2025-06-22 20:36:14.609011+00	2025-06-22 20:36:14.613522+00
88d7be57-87f3-4b0f-b44e-661939336e49	test-distributed-locking-f1b7942e-2195-49e9-a500-29ea7d989299	exclusive	test-owner-2	2025-06-22 20:36:14.617176+00	2025-06-22 20:36:24.617176+00	f	\N	2025-06-22 20:36:14.617176+00	2025-06-22 20:36:14.623014+00
a37ac5dd-3c36-4b67-81aa-f1e2d9c49f12	test-race-prevention-79a9082c-e32c-47f0-89e6-f438cd2df719	exclusive	config_manager_1750624574630401091	2025-06-22 20:36:14.631479+00	2025-06-22 20:36:44.631479+00	f	\N	2025-06-22 20:36:14.631479+00	2025-06-22 20:36:14.643522+00
b150150f-99ea-4bd7-8897-27fb46acbf7c	test-race-prevention-79a9082c-e32c-47f0-89e6-f438cd2df719	exclusive	config_manager_1750624574646130082	2025-06-22 20:36:14.647125+00	2025-06-22 20:36:44.647125+00	f	\N	2025-06-22 20:36:14.647125+00	2025-06-22 20:36:14.682708+00
3a848b86-11db-487e-9654-729d570bda14	test-corruption-detection-b1f14ac0-0e00-4ac7-88e4-ce5dc4c6d94f	exclusive	config_manager_1750624574688211681	2025-06-22 20:36:14.695885+00	2025-06-22 20:36:44.695885+00	f	\N	2025-06-22 20:36:14.695885+00	2025-06-22 20:36:14.712975+00
64c969ee-e4ac-4e71-9c53-85339233d25c	test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-mixed	exclusive	config_manager_1750624574727382371	2025-06-22 20:36:14.729636+00	2025-06-22 20:36:44.729636+00	f	\N	2025-06-22 20:36:14.729636+00	2025-06-22 20:36:14.753714+00
c92a40e5-cc3b-4beb-917a-95ac764d3675	test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-mixed	exclusive	config_manager_1750624574756325311	2025-06-22 20:36:14.75818+00	2025-06-22 20:36:44.75818+00	f	\N	2025-06-22 20:36:14.75818+00	2025-06-22 20:36:14.788942+00
86f2d490-5998-4102-a080-df9821672075	test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-highfreq	exclusive	config_manager_1750624574801180804	2025-06-22 20:36:14.802269+00	2025-06-22 20:36:44.802269+00	f	\N	2025-06-22 20:36:14.802269+00	2025-06-22 20:36:14.867339+00
881ae612-c855-4aa1-8612-b4d92dff5f02	test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-highfreq	exclusive	config_manager_1750624574848129994	2025-06-22 20:36:14.881043+00	2025-06-22 20:36:44.881043+00	f	\N	2025-06-22 20:36:14.881043+00	2025-06-22 20:36:14.902021+00
4dc18da7-df04-4bbc-ac06-def05a69e2d7	test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-highfreq	exclusive	config_manager_1750624574867235215	2025-06-22 20:36:14.90469+00	2025-06-22 20:36:44.90469+00	f	\N	2025-06-22 20:36:14.90469+00	2025-06-22 20:36:14.910272+00
75c3ef08-2bbf-4a3c-b10d-70ef84677f99	test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-coordinated	exclusive	config_manager_1750624574914195144	2025-06-22 20:36:14.914891+00	2025-06-22 20:36:44.914891+00	f	\N	2025-06-22 20:36:14.914891+00	2025-06-22 20:36:14.947072+00
d54bb644-f5d1-4dc4-927d-99108c364b22	test-concurrent-read-25f36eef-6535-4ddf-a133-429dd5afbaa6	exclusive	config_manager_1750625404169831332	2025-06-22 20:50:04.179135+00	2025-06-22 20:50:34.179135+00	f	\N	2025-06-22 20:50:04.179135+00	2025-06-22 20:50:04.221428+00
8f95e799-07dc-434a-aabd-2c30f739c562	test-concurrent-write-1f068e87-3fdf-40d6-baaf-7411878771bc	exclusive	config_manager_1750625404227901567	2025-06-22 20:50:04.228905+00	2025-06-22 20:50:34.228905+00	f	\N	2025-06-22 20:50:04.228905+00	2025-06-22 20:50:04.240098+00
8117b5f1-a1fe-4c9f-ab02-86a6acdd42d3	test-concurrent-write-1f068e87-3fdf-40d6-baaf-7411878771bc	exclusive	config_manager_1750625404228008350	2025-06-22 20:50:04.287476+00	2025-06-22 20:50:34.287476+00	f	\N	2025-06-22 20:50:04.287476+00	2025-06-22 20:50:04.301177+00
e4f5c5e6-7129-4c89-a8ed-fa8f703da1aa	test-cow-semantics-941b5a50-1dd0-4ce4-ac89-12e06955128c	exclusive	config_manager_1750625404302377349	2025-06-22 20:50:04.303142+00	2025-06-22 20:50:34.303142+00	f	\N	2025-06-22 20:50:04.303142+00	2025-06-22 20:50:04.318997+00
e58de2ea-8260-4769-8fe8-1923b32bfb80	test-cow-semantics-941b5a50-1dd0-4ce4-ac89-12e06955128c	exclusive	config_manager_1750625404321001986	2025-06-22 20:50:04.321919+00	2025-06-22 20:50:34.321919+00	f	\N	2025-06-22 20:50:04.321919+00	2025-06-22 20:50:04.329469+00
11187cd8-67f6-41a7-880a-eb5799c0f810	test-distributed-locking-916a77e5-f449-4ba5-9221-c400702147ee	exclusive	test-owner-1	2025-06-22 20:50:04.335192+00	2025-06-22 20:50:14.335192+00	f	\N	2025-06-22 20:50:04.335192+00	2025-06-22 20:50:04.337178+00
e32a08d6-e367-4206-a31e-a44666fc6c4c	test-distributed-locking-916a77e5-f449-4ba5-9221-c400702147ee	exclusive	test-owner-2	2025-06-22 20:50:04.339191+00	2025-06-22 20:50:14.339191+00	f	\N	2025-06-22 20:50:04.339191+00	2025-06-22 20:50:04.341926+00
34c7efc8-550a-494f-9dc4-377848417f49	test-race-prevention-4ae4d8ea-2912-412a-8f5f-a333cff71bfe	exclusive	config_manager_1750625404349700552	2025-06-22 20:50:04.355062+00	2025-06-22 20:50:34.355062+00	f	\N	2025-06-22 20:50:04.355062+00	2025-06-22 20:50:04.364863+00
47a09721-acf8-45cf-8306-799f04e2cbf0	test-race-prevention-4ae4d8ea-2912-412a-8f5f-a333cff71bfe	exclusive	config_manager_1750625404367037280	2025-06-22 20:50:04.369235+00	2025-06-22 20:50:34.369235+00	f	\N	2025-06-22 20:50:04.369235+00	2025-06-22 20:50:04.389459+00
414a0f02-1ddb-4344-9cc3-4301b5a36dbb	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-highfreq	exclusive	config_manager_1750614042198620595	2025-06-22 17:40:42.223855+00	2025-06-22 17:41:12.223855+00	f	\N	2025-06-22 17:40:42.223855+00	2025-06-22 17:40:42.25852+00
cad86885-f683-44f9-a832-f387d25dbbb2	test-cow-semantics-b2598368-b14f-4fa6-b005-c98f08c1ba3b	exclusive	config_manager_1750624412194124048	2025-06-22 20:33:32.194925+00	2025-06-22 20:34:02.194925+00	f	\N	2025-06-22 20:33:32.194925+00	2025-06-22 20:33:32.204063+00
40cc51c8-4f79-458a-8255-988f3c32d154	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-highfreq	exclusive	config_manager_1750614042217690476	2025-06-22 17:40:42.260416+00	2025-06-22 17:41:12.260416+00	f	\N	2025-06-22 17:40:42.260416+00	2025-06-22 17:40:42.26639+00
85743189-65b2-49ab-9aa2-a1fd281dc154	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-highfreq	exclusive	config_manager_1750614042222201392	2025-06-22 17:40:42.268439+00	2025-06-22 17:41:12.268439+00	f	\N	2025-06-22 17:40:42.268439+00	2025-06-22 17:40:42.319749+00
f4adf300-42ee-4078-92e0-9fa38ae85c50	test-distributed-locking-825ba1d8-4834-4216-a5a5-f22b57fd2d65	exclusive	test-owner-1	2025-06-22 20:33:32.206662+00	2025-06-22 20:33:42.206662+00	f	\N	2025-06-22 20:33:32.206662+00	2025-06-22 20:33:32.212656+00
4be94b22-7b6a-4fc2-9991-ad2cc993c43a	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-highfreq	exclusive	config_manager_1750614042235662295	2025-06-22 17:40:42.326612+00	2025-06-22 17:41:12.326612+00	f	\N	2025-06-22 17:40:42.326612+00	2025-06-22 17:40:42.33591+00
0a28c776-0b2a-4d14-bc0c-01506f97006e	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-coordinated	exclusive	config_manager_1750614042341019508	2025-06-22 17:40:42.34743+00	2025-06-22 17:41:12.34743+00	f	\N	2025-06-22 17:40:42.34743+00	2025-06-22 17:40:42.380101+00
bf2712c4-8892-4271-93a6-eeb4ef29c8fa	test-concurrent-read-101d9804-e3af-4733-854b-d88a2bf52070	exclusive	config_manager_1750614087043414051	2025-06-22 17:41:27.045356+00	2025-06-22 17:41:57.045356+00	f	\N	2025-06-22 17:41:27.045356+00	2025-06-22 17:41:27.125433+00
775b097d-a073-475f-9881-11007ebeb39b	test-concurrent-write-06c11180-68ff-4c67-b0de-129f0a043f10	exclusive	config_manager_1750614087128242844	2025-06-22 17:41:27.129836+00	2025-06-22 17:41:57.129836+00	f	\N	2025-06-22 17:41:27.129836+00	2025-06-22 17:41:27.188977+00
e93dab9d-ae63-4725-a0c4-c00df327836e	test-cow-semantics-8236153d-ce2c-4384-92d6-05d89fc41b8a	exclusive	config_manager_1750614087200550442	2025-06-22 17:41:27.203519+00	2025-06-22 17:41:57.203519+00	f	\N	2025-06-22 17:41:27.203519+00	2025-06-22 17:41:27.222627+00
1999011c-4047-4768-985f-6639241af259	test-cow-semantics-8236153d-ce2c-4384-92d6-05d89fc41b8a	exclusive	config_manager_1750614087223860485	2025-06-22 17:41:27.224132+00	2025-06-22 17:41:57.224132+00	f	\N	2025-06-22 17:41:27.224132+00	2025-06-22 17:41:27.23154+00
7b37cff2-fe1e-410a-a045-a23d34b2c3b1	test-distributed-locking-11547382-6e71-4421-b9b1-9886a94eb703	exclusive	test-owner-1	2025-06-22 17:41:27.265959+00	2025-06-22 17:41:37.265959+00	f	\N	2025-06-22 17:41:27.265959+00	2025-06-22 17:41:27.26845+00
a287b966-d949-4b9c-b969-e8f2eb92cfa7	test-distributed-locking-11547382-6e71-4421-b9b1-9886a94eb703	exclusive	test-owner-2	2025-06-22 17:41:27.272387+00	2025-06-22 17:41:37.272387+00	f	\N	2025-06-22 17:41:27.272387+00	2025-06-22 17:41:27.27591+00
6ab58a18-5728-4a84-ba05-639af5948dc3	test-race-prevention-a01fa282-294b-4680-8e3c-3b3f1177c62b	exclusive	config_manager_1750614087279448299	2025-06-22 17:41:27.279677+00	2025-06-22 17:41:57.279677+00	f	\N	2025-06-22 17:41:27.279677+00	2025-06-22 17:41:27.314251+00
edc13640-d8b6-4098-be90-40a7555fe438	test-race-prevention-a01fa282-294b-4680-8e3c-3b3f1177c62b	exclusive	config_manager_1750614087315964157	2025-06-22 17:41:27.329323+00	2025-06-22 17:41:57.329323+00	f	\N	2025-06-22 17:41:27.329323+00	2025-06-22 17:41:27.408378+00
4cd3c290-42a5-4d0c-ae7e-d9d7d16527e5	test-corruption-detection-bace5d99-69a7-4632-ad8c-19f320ae3bd4	exclusive	config_manager_1750614087410059890	2025-06-22 17:41:27.410724+00	2025-06-22 17:41:57.410724+00	f	\N	2025-06-22 17:41:27.410724+00	2025-06-22 17:41:27.455371+00
ec266545-e204-4e46-8bbc-31c5e63ea375	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-mixed	exclusive	config_manager_1750614087459701947	2025-06-22 17:41:27.460222+00	2025-06-22 17:41:57.460222+00	f	\N	2025-06-22 17:41:27.460222+00	2025-06-22 17:41:27.475026+00
da4a8926-a339-463a-a584-9491795e069a	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-mixed	exclusive	config_manager_1750614087487611526	2025-06-22 17:41:27.495882+00	2025-06-22 17:41:57.495882+00	f	\N	2025-06-22 17:41:27.495882+00	2025-06-22 17:41:27.506353+00
34ca4468-d410-49fc-af89-97912bec320f	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-mixed	exclusive	config_manager_1750614087487747655	2025-06-22 17:41:27.507519+00	2025-06-22 17:41:57.507519+00	f	\N	2025-06-22 17:41:27.507519+00	2025-06-22 17:41:27.513905+00
70fd4699-3856-4813-85c6-64f73ce378b4	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-highfreq	exclusive	config_manager_1750614087516879440	2025-06-22 17:41:27.51862+00	2025-06-22 17:41:57.51862+00	f	\N	2025-06-22 17:41:27.51862+00	2025-06-22 17:41:27.553529+00
c7351832-b728-4cf3-b9cc-fa3aa6163136	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-highfreq	exclusive	config_manager_1750614087518518523	2025-06-22 17:41:27.55604+00	2025-06-22 17:41:57.55604+00	f	\N	2025-06-22 17:41:27.55604+00	2025-06-22 17:41:27.559565+00
85aa38ff-9bf1-4e1f-99a2-53305d4c5297	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-highfreq	exclusive	config_manager_1750614087516553558	2025-06-22 17:41:27.563182+00	2025-06-22 17:41:57.563182+00	f	\N	2025-06-22 17:41:27.563182+00	2025-06-22 17:41:27.567666+00
f4c0b261-7271-428a-87da-7bec374e3f13	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-highfreq	exclusive	config_manager_1750614087555919444	2025-06-22 17:41:27.57018+00	2025-06-22 17:41:57.57018+00	f	\N	2025-06-22 17:41:27.57018+00	2025-06-22 17:41:27.612912+00
911d92b1-b96f-467a-968f-a9d08bd0e26b	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-highfreq	exclusive	config_manager_1750614087563776613	2025-06-22 17:41:27.628831+00	2025-06-22 17:41:57.628831+00	f	\N	2025-06-22 17:41:27.628831+00	2025-06-22 17:41:27.640747+00
45f2b19b-7b66-4b74-9f26-e6289140df4d	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-coordinated	exclusive	config_manager_1750614087644791632	2025-06-22 17:41:27.645407+00	2025-06-22 17:41:57.645407+00	f	\N	2025-06-22 17:41:27.645407+00	2025-06-22 17:41:27.67476+00
68887669-873d-44fa-af22-66dd86d7ce8c	test-concurrent-read-51635dc8-fd3e-4725-9fb6-c0e8f606ce97	exclusive	config_manager_1750616167605979144	2025-06-22 18:16:07.609962+00	2025-06-22 18:16:37.609962+00	f	\N	2025-06-22 18:16:07.609962+00	2025-06-22 18:16:07.643709+00
5155e2c2-c841-4496-8646-658e8ead68ac	test-concurrent-write-14c8cee5-64bf-4f94-af69-3a060175906e	exclusive	config_manager_1750616167645369262	2025-06-22 18:16:07.646772+00	2025-06-22 18:16:37.646772+00	f	\N	2025-06-22 18:16:07.646772+00	2025-06-22 18:16:07.660166+00
e23160a9-416a-46eb-92c5-deff47db918c	test-cow-semantics-98810438-2650-451f-b828-3f6a15d13e8d	exclusive	config_manager_1750616167665153432	2025-06-22 18:16:07.665749+00	2025-06-22 18:16:37.665749+00	f	\N	2025-06-22 18:16:07.665749+00	2025-06-22 18:16:07.675405+00
bddbef7b-7c33-4504-971f-fe46ca4d8893	test-cow-semantics-98810438-2650-451f-b828-3f6a15d13e8d	exclusive	config_manager_1750616167677333302	2025-06-22 18:16:07.678386+00	2025-06-22 18:16:37.678386+00	f	\N	2025-06-22 18:16:07.678386+00	2025-06-22 18:16:07.685667+00
77889859-6215-4662-88cb-0d84fdc384b4	test-distributed-locking-b4e78a7f-8e61-449f-afc5-8808754c95de	exclusive	test-owner-1	2025-06-22 18:16:07.68747+00	2025-06-22 18:16:17.68747+00	f	\N	2025-06-22 18:16:07.68747+00	2025-06-22 18:16:07.692598+00
492d1ac7-d2d2-40fe-8423-0881d5772582	test-distributed-locking-b4e78a7f-8e61-449f-afc5-8808754c95de	exclusive	test-owner-2	2025-06-22 18:16:07.695372+00	2025-06-22 18:16:17.695372+00	f	\N	2025-06-22 18:16:07.695372+00	2025-06-22 18:16:07.728689+00
4edc95fa-4255-4a94-b320-baa661938402	test-race-prevention-2b2047ae-67e1-4c08-8829-52288331e820	exclusive	config_manager_1750616167747496204	2025-06-22 18:16:07.749864+00	2025-06-22 18:16:37.749864+00	f	\N	2025-06-22 18:16:07.749864+00	2025-06-22 18:16:07.768966+00
ecf70f17-9d35-4b53-ac20-8db1f7bec46b	test-race-prevention-2b2047ae-67e1-4c08-8829-52288331e820	exclusive	config_manager_1750616167771000012	2025-06-22 18:16:07.77144+00	2025-06-22 18:16:37.77144+00	f	\N	2025-06-22 18:16:07.77144+00	2025-06-22 18:16:07.791657+00
94fafe4a-ff8a-4b6e-b00d-e8503c02c47b	test-corruption-detection-d44afecf-8c68-4955-9801-69699331a7d6	exclusive	config_manager_1750616167793008136	2025-06-22 18:16:07.793299+00	2025-06-22 18:16:37.793299+00	f	\N	2025-06-22 18:16:07.793299+00	2025-06-22 18:16:07.800163+00
bca0480c-7843-4045-bc65-29043f2dfd9b	test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-mixed	exclusive	config_manager_1750616167806949197	2025-06-22 18:16:07.807547+00	2025-06-22 18:16:37.807547+00	f	\N	2025-06-22 18:16:07.807547+00	2025-06-22 18:16:07.816438+00
7e86b487-e719-41d5-9ba7-0c4eadb832e8	test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-mixed	exclusive	config_manager_1750616167817670965	2025-06-22 18:16:07.819221+00	2025-06-22 18:16:37.819221+00	f	\N	2025-06-22 18:16:07.819221+00	2025-06-22 18:16:07.827975+00
55325cb9-ed76-48bb-aa42-55e1453dbc0c	test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-highfreq	exclusive	config_manager_1750616167834489335	2025-06-22 18:16:07.835559+00	2025-06-22 18:16:37.835559+00	f	\N	2025-06-22 18:16:07.835559+00	2025-06-22 18:16:07.911737+00
36848e69-36da-4120-9c2f-460159cfb929	test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-highfreq	exclusive	config_manager_1750616167923105221	2025-06-22 18:16:07.924334+00	2025-06-22 18:16:37.924334+00	f	\N	2025-06-22 18:16:07.924334+00	2025-06-22 18:16:07.963101+00
fdc05d95-c9d9-47d7-aa57-a77a881a7b39	test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-coordinated	exclusive	config_manager_1750616167971749969	2025-06-22 18:16:07.983744+00	2025-06-22 18:16:37.983744+00	f	\N	2025-06-22 18:16:07.983744+00	2025-06-22 18:16:07.996526+00
6dd614ab-2e94-4cca-b6b8-dec03ef1a1ac	test-corruption-detection-a1e49e09-daa6-4e53-a163-41b1a963e58e	exclusive	config_manager_1750625404392942148	2025-06-22 20:50:04.393442+00	2025-06-22 20:50:34.393442+00	f	\N	2025-06-22 20:50:04.393442+00	2025-06-22 20:50:04.401126+00
68de105a-f6fd-43b5-b275-b576569f0b58	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-mixed	exclusive	config_manager_1750625404404721517	2025-06-22 20:50:04.405251+00	2025-06-22 20:50:34.405251+00	f	\N	2025-06-22 20:50:04.405251+00	2025-06-22 20:50:04.429502+00
f273c8c6-2711-4c8b-a542-b4b596c1ad77	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-mixed	exclusive	config_manager_1750625404452660704	2025-06-22 20:50:04.452961+00	2025-06-22 20:50:34.452961+00	f	\N	2025-06-22 20:50:04.452961+00	2025-06-22 20:50:04.466594+00
658a76b9-c1c4-47d2-9589-141187a0ce99	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-mixed	exclusive	config_manager_1750625404452869551	2025-06-22 20:50:04.473315+00	2025-06-22 20:50:34.473315+00	f	\N	2025-06-22 20:50:04.473315+00	2025-06-22 20:50:04.478701+00
67dbcd8d-1096-401a-a20c-4690b4ee9bcf	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-highfreq	exclusive	config_manager_1750625404480236246	2025-06-22 20:50:04.480936+00	2025-06-22 20:50:34.480936+00	f	\N	2025-06-22 20:50:04.480936+00	2025-06-22 20:50:04.505286+00
b3a46fcd-4264-403c-b1d0-a43da5d42649	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-highfreq	exclusive	config_manager_1750625404495241697	2025-06-22 20:50:04.511905+00	2025-06-22 20:50:34.511905+00	f	\N	2025-06-22 20:50:04.511905+00	2025-06-22 20:50:04.516132+00
5024fbd3-3380-4514-8c40-4f3e6dd6f4e2	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-highfreq	exclusive	config_manager_1750625404505539543	2025-06-22 20:50:04.519238+00	2025-06-22 20:50:34.519238+00	f	\N	2025-06-22 20:50:04.519238+00	2025-06-22 20:50:04.531554+00
1f38ebc9-71d9-4a27-9791-2437b4f8dd00	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-highfreq	exclusive	config_manager_1750625404507620956	2025-06-22 20:50:04.549397+00	2025-06-22 20:50:34.549397+00	f	\N	2025-06-22 20:50:04.549397+00	2025-06-22 20:50:04.604371+00
d03a0510-314c-4936-a161-ab3348b87d8f	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-coordinated	exclusive	config_manager_1750625404609046679	2025-06-22 20:50:04.610113+00	2025-06-22 20:50:34.610113+00	f	\N	2025-06-22 20:50:04.610113+00	2025-06-22 20:50:04.620479+00
39d8d788-7267-49d3-86e3-71ed584a65a9	test-concurrent-read-e11a6d28-2752-4018-83ca-86d469e74be8	exclusive	config_manager_1750629054227211238	2025-06-22 21:50:54.229639+00	2025-06-22 21:51:24.229639+00	f	\N	2025-06-22 21:50:54.229639+00	2025-06-22 21:50:54.256353+00
efc22cad-14d6-4744-91cb-4966c2540c73	test-concurrent-write-95e6bca0-ef6d-44f9-9d57-5e020e8e3e29	exclusive	config_manager_1750629054260081696	2025-06-22 21:50:54.261039+00	2025-06-22 21:51:24.261039+00	f	\N	2025-06-22 21:50:54.261039+00	2025-06-22 21:50:54.269287+00
e309efef-3068-4964-a52e-7e742fd16931	test-cow-semantics-5e6f2857-b3df-4729-a215-8e467c56b7ce	exclusive	config_manager_1750629054271461200	2025-06-22 21:50:54.272002+00	2025-06-22 21:51:24.272002+00	f	\N	2025-06-22 21:50:54.272002+00	2025-06-22 21:50:54.279133+00
eb43283f-4aff-4a55-87b8-b5530f185efc	test-cow-semantics-5e6f2857-b3df-4729-a215-8e467c56b7ce	exclusive	config_manager_1750629054280897529	2025-06-22 21:50:54.281464+00	2025-06-22 21:51:24.281464+00	f	\N	2025-06-22 21:50:54.281464+00	2025-06-22 21:50:54.288426+00
df696aa0-9947-40eb-86eb-29a162feda70	test-distributed-locking-1ae3ccaf-6b6f-4a13-8df9-729943ccce93	exclusive	test-owner-1	2025-06-22 21:50:54.290641+00	2025-06-22 21:51:04.290641+00	f	\N	2025-06-22 21:50:54.290641+00	2025-06-22 21:50:54.295121+00
6db823b7-0239-438f-a7de-a6057af17da4	test-distributed-locking-1ae3ccaf-6b6f-4a13-8df9-729943ccce93	exclusive	test-owner-2	2025-06-22 21:50:54.297912+00	2025-06-22 21:51:04.297912+00	f	\N	2025-06-22 21:50:54.297912+00	2025-06-22 21:50:54.300677+00
90a2c0f7-fc0f-4a85-8f18-7006bd4b8f90	test-race-prevention-03dc2776-80c4-44a9-96ca-0acfa2792851	exclusive	config_manager_1750629054305903421	2025-06-22 21:50:54.308582+00	2025-06-22 21:51:24.308582+00	f	\N	2025-06-22 21:50:54.308582+00	2025-06-22 21:50:54.32012+00
404cc75c-903d-4c6b-b452-4c219d6aea62	test-race-prevention-03dc2776-80c4-44a9-96ca-0acfa2792851	exclusive	config_manager_1750629054321574336	2025-06-22 21:50:54.322348+00	2025-06-22 21:51:24.322348+00	f	\N	2025-06-22 21:50:54.322348+00	2025-06-22 21:50:54.340656+00
9bad481b-9513-472f-a5ae-ab10417118f6	test-corruption-detection-0f2f5c56-6586-4d12-bc18-e19b69e49bfc	exclusive	config_manager_1750629054342187427	2025-06-22 21:50:54.343212+00	2025-06-22 21:51:24.343212+00	f	\N	2025-06-22 21:50:54.343212+00	2025-06-22 21:50:54.353392+00
29d527a8-7e71-4e62-a7c1-84ec6b227c4a	test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-mixed	exclusive	config_manager_1750629054358130895	2025-06-22 21:50:54.359161+00	2025-06-22 21:51:24.359161+00	f	\N	2025-06-22 21:50:54.359161+00	2025-06-22 21:50:54.371608+00
bff3ef78-9e32-4fa0-8c64-e86fb8f51449	test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-mixed	exclusive	config_manager_1750629054374974974	2025-06-22 21:50:54.376074+00	2025-06-22 21:51:24.376074+00	f	\N	2025-06-22 21:50:54.376074+00	2025-06-22 21:50:54.383856+00
84262079-2147-417d-8cce-2f672c391173	test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-highfreq	exclusive	config_manager_1750629054393560958	2025-06-22 21:50:54.395361+00	2025-06-22 21:51:24.395361+00	f	\N	2025-06-22 21:50:54.395361+00	2025-06-22 21:50:54.404519+00
b8023fc6-ab00-4314-868f-be05fd7c6437	test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-highfreq	exclusive	config_manager_1750629054393522809	2025-06-22 21:50:54.406421+00	2025-06-22 21:51:24.406421+00	f	\N	2025-06-22 21:50:54.406421+00	2025-06-22 21:50:54.44434+00
2439da8d-709a-460c-bd00-158e3db3dadd	test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-highfreq	exclusive	config_manager_1750629054448130234	2025-06-22 21:50:54.449212+00	2025-06-22 21:51:24.449212+00	f	\N	2025-06-22 21:50:54.449212+00	2025-06-22 21:50:54.456932+00
9cd8c815-7f07-4959-ad4d-b16decf277ef	test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-coordinated	exclusive	config_manager_1750629054461207850	2025-06-22 21:50:54.461984+00	2025-06-22 21:51:24.461984+00	f	\N	2025-06-22 21:50:54.461984+00	2025-06-22 21:50:54.472305+00
8afb6c28-2740-44f7-980f-a107cc4f608a	test-concurrent-read-12a96b93-30f3-47b4-a4d0-d66aa91e8733	exclusive	config_manager_1750638146913530864	2025-06-23 00:22:26.918643+00	2025-06-23 00:22:56.918643+00	f	\N	2025-06-23 00:22:26.918643+00	2025-06-23 00:22:26.996864+00
db7c8d99-3a9c-4498-b442-fd3d4942ccc7	test-concurrent-write-48a5922c-9c2c-4508-b519-8a6082fc4405	exclusive	config_manager_1750638146998518973	2025-06-23 00:22:27.00397+00	2025-06-23 00:22:57.00397+00	f	\N	2025-06-23 00:22:27.00397+00	2025-06-23 00:22:27.017447+00
4a0d724b-4c5e-4e9f-98b7-9d33065d31ab	test-concurrent-write-48a5922c-9c2c-4508-b519-8a6082fc4405	exclusive	config_manager_1750638146998962865	2025-06-23 00:22:27.033845+00	2025-06-23 00:22:57.033845+00	f	\N	2025-06-23 00:22:27.033845+00	2025-06-23 00:22:27.085401+00
7a044f88-798d-4ac2-8236-995536209985	test-cow-semantics-643bb747-0afc-4292-8dc5-7745f6e2747d	exclusive	config_manager_1750638147087131090	2025-06-23 00:22:27.087649+00	2025-06-23 00:22:57.087649+00	f	\N	2025-06-23 00:22:27.087649+00	2025-06-23 00:22:27.13355+00
256d3760-b81f-4628-bb00-7e1cd2a4c920	test-cow-semantics-643bb747-0afc-4292-8dc5-7745f6e2747d	exclusive	config_manager_1750638147134974256	2025-06-23 00:22:27.135176+00	2025-06-23 00:22:57.135176+00	f	\N	2025-06-23 00:22:27.135176+00	2025-06-23 00:22:27.140891+00
0572dcc4-25af-468c-b76a-f1048a1f7a41	test-distributed-locking-bf278ed5-f108-458b-b96b-61d7bb212d8d	exclusive	test-owner-1	2025-06-23 00:22:27.143149+00	2025-06-23 00:22:37.143149+00	f	\N	2025-06-23 00:22:27.143149+00	2025-06-23 00:22:27.15464+00
3e9c1da6-6b75-413b-b467-e321d94a0e12	test-distributed-locking-bf278ed5-f108-458b-b96b-61d7bb212d8d	exclusive	test-owner-2	2025-06-23 00:22:27.164424+00	2025-06-23 00:22:37.164424+00	f	\N	2025-06-23 00:22:27.164424+00	2025-06-23 00:22:27.173613+00
1161773b-534f-4f52-87f6-872d6487cc3a	test-race-prevention-fb214e36-33e2-4cb2-8f7c-7be8cd469471	exclusive	config_manager_1750638147191276693	2025-06-23 00:22:27.19176+00	2025-06-23 00:22:57.19176+00	f	\N	2025-06-23 00:22:27.19176+00	2025-06-23 00:22:27.232401+00
8d9d2a71-b39b-40ea-ad3a-72a5dd98b4e4	test-race-prevention-fb214e36-33e2-4cb2-8f7c-7be8cd469471	exclusive	config_manager_1750638147234900210	2025-06-23 00:22:27.235613+00	2025-06-23 00:22:57.235613+00	f	\N	2025-06-23 00:22:27.235613+00	2025-06-23 00:22:27.264795+00
baa26797-8613-4e3d-9a1b-5c58c895fc65	test-corruption-detection-cc61df68-e9a6-4900-bdfa-712875846133	exclusive	config_manager_1750638147267204169	2025-06-23 00:22:27.26798+00	2025-06-23 00:22:57.26798+00	f	\N	2025-06-23 00:22:27.26798+00	2025-06-23 00:22:27.277455+00
3b242f1c-cf0d-44ca-9ec6-0ae49a0071d7	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-mixed	exclusive	config_manager_1750638147331741969	2025-06-23 00:22:27.332438+00	2025-06-23 00:22:57.332438+00	f	\N	2025-06-23 00:22:27.332438+00	2025-06-23 00:22:27.386184+00
6ac14932-83f9-4ec5-ab46-2fe4176ef587	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-mixed	exclusive	config_manager_1750638147388542942	2025-06-23 00:22:27.391565+00	2025-06-23 00:22:57.391565+00	f	\N	2025-06-23 00:22:27.391565+00	2025-06-23 00:22:27.430142+00
b79ea04a-abf9-4034-b89d-432891c5f930	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-highfreq	exclusive	config_manager_1750638147432008516	2025-06-23 00:22:27.432921+00	2025-06-23 00:22:57.432921+00	f	\N	2025-06-23 00:22:27.432921+00	2025-06-23 00:22:27.453801+00
38500791-5cd3-4f34-8d7e-06b0a6b38cb6	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-highfreq	exclusive	config_manager_1750638147432234882	2025-06-23 00:22:27.482035+00	2025-06-23 00:22:57.482035+00	f	\N	2025-06-23 00:22:27.482035+00	2025-06-23 00:22:27.531172+00
5eb6f52c-0549-4972-8f88-f1ea14ebcf85	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-highfreq	exclusive	config_manager_1750638147432292078	2025-06-23 00:22:27.532784+00	2025-06-23 00:22:57.532784+00	f	\N	2025-06-23 00:22:27.532784+00	2025-06-23 00:22:27.540223+00
00f89f21-abcf-4f1b-8f2e-02a843c11e37	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-highfreq	exclusive	config_manager_1750638147439901810	2025-06-23 00:22:27.542397+00	2025-06-23 00:22:57.542397+00	f	\N	2025-06-23 00:22:27.542397+00	2025-06-23 00:22:27.583937+00
8db9c9c7-1821-47e2-8265-6b05e8d65ec5	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-highfreq	exclusive	config_manager_1750638147446915568	2025-06-23 00:22:27.588045+00	2025-06-23 00:22:57.588045+00	f	\N	2025-06-23 00:22:27.588045+00	2025-06-23 00:22:27.631759+00
f5d06457-ff43-46d4-a0c3-e8399384a7ee	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-highfreq	exclusive	config_manager_1750638147525705866	2025-06-23 00:22:27.634846+00	2025-06-23 00:22:57.634846+00	f	\N	2025-06-23 00:22:27.634846+00	2025-06-23 00:22:27.642452+00
e32c8e05-0e22-47de-b506-1d9b98dde7fb	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-coordinated	exclusive	config_manager_1750638147648395799	2025-06-23 00:22:27.649379+00	2025-06-23 00:22:57.649379+00	f	\N	2025-06-23 00:22:27.649379+00	2025-06-23 00:22:27.664055+00
2848c34d-7958-40f4-a2b6-813bdde2d591	test-concurrent-read-5dde5a14-a3da-4a01-9a9e-ab2cc3d9c6c3	exclusive	config_manager_1750638179089063003	2025-06-23 00:22:59.090866+00	2025-06-23 00:23:29.090866+00	f	\N	2025-06-23 00:22:59.090866+00	2025-06-23 00:22:59.144808+00
9def9ba9-f545-4202-bb3c-feb093bc5753	test-concurrent-write-7170eab6-cbcc-474a-83aa-744119049f3e	exclusive	config_manager_1750638179147411890	2025-06-23 00:22:59.148363+00	2025-06-23 00:23:29.148363+00	f	\N	2025-06-23 00:22:59.148363+00	2025-06-23 00:22:59.159905+00
65f55977-7887-41b6-bea2-e37cd4646d2a	test-cow-semantics-4b48a20b-7bc8-4842-a1dd-f0f8b3231dba	exclusive	config_manager_1750638179161233923	2025-06-23 00:22:59.161937+00	2025-06-23 00:23:29.161937+00	f	\N	2025-06-23 00:22:59.161937+00	2025-06-23 00:22:59.190776+00
213771f4-3472-4625-a88e-ef7a9413b664	test-cow-semantics-4b48a20b-7bc8-4842-a1dd-f0f8b3231dba	exclusive	config_manager_1750638179191852157	2025-06-23 00:22:59.192457+00	2025-06-23 00:23:29.192457+00	f	\N	2025-06-23 00:22:59.192457+00	2025-06-23 00:22:59.212707+00
11171fbb-b487-43d6-ab94-fceff9b8117c	test-distributed-locking-b95f48fc-1ba4-4053-8354-7c2b8a9da898	exclusive	test-owner-1	2025-06-23 00:22:59.215513+00	2025-06-23 00:23:09.215513+00	f	\N	2025-06-23 00:22:59.215513+00	2025-06-23 00:22:59.219914+00
e92ae747-9bea-46a9-9e89-e8a02d634190	test-distributed-locking-b95f48fc-1ba4-4053-8354-7c2b8a9da898	exclusive	test-owner-2	2025-06-23 00:22:59.222599+00	2025-06-23 00:23:09.222599+00	f	\N	2025-06-23 00:22:59.222599+00	2025-06-23 00:22:59.225658+00
70511f88-f7b7-4a67-8b5d-87968e9204c8	test-race-prevention-e4e899bc-24c8-4196-9d87-3fc7b76c42a8	exclusive	config_manager_1750638179230720017	2025-06-23 00:22:59.231522+00	2025-06-23 00:23:29.231522+00	f	\N	2025-06-23 00:22:59.231522+00	2025-06-23 00:22:59.274615+00
6642f43f-cd5e-4ce4-adca-70d809b1fdc5	test-race-prevention-e4e899bc-24c8-4196-9d87-3fc7b76c42a8	exclusive	config_manager_1750638179276667350	2025-06-23 00:22:59.277519+00	2025-06-23 00:23:29.277519+00	f	\N	2025-06-23 00:22:59.277519+00	2025-06-23 00:22:59.296912+00
d106f241-edcf-4840-bb60-ca7b24268863	test-corruption-detection-81e97307-35c0-4b17-ae06-20331b660c4f	exclusive	config_manager_1750638179298333939	2025-06-23 00:22:59.299198+00	2025-06-23 00:23:29.299198+00	f	\N	2025-06-23 00:22:59.299198+00	2025-06-23 00:22:59.3159+00
28fb463e-b632-44d1-bf9a-c704ed0fa828	test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-mixed	exclusive	config_manager_1750638179337432217	2025-06-23 00:22:59.340513+00	2025-06-23 00:23:29.340513+00	f	\N	2025-06-23 00:22:59.340513+00	2025-06-23 00:22:59.35389+00
b807cc9a-e82b-4531-b49f-9661add1eea3	test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-mixed	exclusive	config_manager_1750638179355105796	2025-06-23 00:22:59.355886+00	2025-06-23 00:23:29.355886+00	f	\N	2025-06-23 00:22:59.355886+00	2025-06-23 00:22:59.363749+00
30f017c2-63dc-4f82-bd2c-8e655504b01f	test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-highfreq	exclusive	config_manager_1750638179377715518	2025-06-23 00:22:59.378833+00	2025-06-23 00:23:29.378833+00	f	\N	2025-06-23 00:22:59.378833+00	2025-06-23 00:22:59.438872+00
e924f0e5-1f91-440c-a555-36489d63e83a	test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-highfreq	exclusive	config_manager_1750638179389506084	2025-06-23 00:22:59.452908+00	2025-06-23 00:23:29.452908+00	f	\N	2025-06-23 00:22:59.452908+00	2025-06-23 00:22:59.465402+00
14ce3951-92f1-478f-87be-f0e4550a973e	test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-highfreq	exclusive	config_manager_1750638179449517387	2025-06-23 00:22:59.466398+00	2025-06-23 00:23:29.466398+00	f	\N	2025-06-23 00:22:59.466398+00	2025-06-23 00:22:59.49503+00
a16ea450-6456-4d54-917a-7575332bc9f3	test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-coordinated	exclusive	config_manager_1750638179500062795	2025-06-23 00:22:59.506883+00	2025-06-23 00:23:29.506883+00	f	\N	2025-06-23 00:22:59.506883+00	2025-06-23 00:22:59.520543+00
d9848df9-2632-4264-948e-99a038ec373f	test-concurrent-read-44ed0d30-af9d-4610-a5a4-db4babf59c33	exclusive	config_manager_1750701036511742605	2025-06-23 17:50:36.533586+00	2025-06-23 17:51:06.533586+00	f	\N	2025-06-23 17:50:36.533586+00	2025-06-23 17:50:36.634319+00
6aa4c2d7-3e65-4697-a012-6d5d2c59edb0	test-concurrent-write-8ecff0b8-0d99-4c91-9147-2a9caaa548ee	exclusive	config_manager_1750701036638412811	2025-06-23 17:50:36.64289+00	2025-06-23 17:51:06.64289+00	f	\N	2025-06-23 17:50:36.64289+00	2025-06-23 17:50:36.780332+00
11992cd6-8e4b-45f9-8d08-497281fee1e6	test-cow-semantics-6c12393d-8b96-468c-a95f-9b86bef89311	exclusive	config_manager_1750701036783281716	2025-06-23 17:50:36.789681+00	2025-06-23 17:51:06.789681+00	f	\N	2025-06-23 17:50:36.789681+00	2025-06-23 17:50:36.861332+00
997b87b7-a576-4fa9-9622-a9b3fbcb997a	test-cow-semantics-6c12393d-8b96-468c-a95f-9b86bef89311	exclusive	config_manager_1750701036891527576	2025-06-23 17:50:36.910537+00	2025-06-23 17:51:06.910537+00	f	\N	2025-06-23 17:50:36.910537+00	2025-06-23 17:50:36.996541+00
55702912-a27d-475d-81da-57e9f710fb8a	test-distributed-locking-85a345e2-7539-4770-8d95-192fafe060f4	exclusive	test-owner-1	2025-06-23 17:50:37.05353+00	2025-06-23 17:50:47.05353+00	f	\N	2025-06-23 17:50:37.05353+00	2025-06-23 17:50:37.07042+00
7f59a219-74c1-4e7e-982c-62ea2ca6a1af	test-distributed-locking-85a345e2-7539-4770-8d95-192fafe060f4	exclusive	test-owner-2	2025-06-23 17:50:37.079338+00	2025-06-23 17:50:47.079338+00	f	\N	2025-06-23 17:50:37.079338+00	2025-06-23 17:50:37.12372+00
e210f2ce-d73b-4d47-8d45-e1e5c20f0359	test-race-prevention-30e8f26f-f2a6-4162-ab70-0ff33ae4b30f	exclusive	config_manager_1750701037137911016	2025-06-23 17:50:37.141919+00	2025-06-23 17:51:07.141919+00	f	\N	2025-06-23 17:50:37.141919+00	2025-06-23 17:50:37.199829+00
608e7efb-f400-47b3-9592-fc2f7fdf9b52	test-race-prevention-30e8f26f-f2a6-4162-ab70-0ff33ae4b30f	exclusive	config_manager_1750701037226209411	2025-06-23 17:50:37.249615+00	2025-06-23 17:51:07.249615+00	f	\N	2025-06-23 17:50:37.249615+00	2025-06-23 17:50:37.314629+00
422d76c3-4181-4ddb-8d13-c42462e3a106	test-corruption-detection-434d1c2e-f0c0-4211-afb8-000bba2b1c74	exclusive	config_manager_1750701037316227564	2025-06-23 17:50:37.31711+00	2025-06-23 17:51:07.31711+00	f	\N	2025-06-23 17:50:37.31711+00	2025-06-23 17:50:37.430117+00
755105d5-b3dc-43ec-afcd-4fc72b1ffc2c	test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-mixed	exclusive	config_manager_1750701037499934696	2025-06-23 17:50:37.506838+00	2025-06-23 17:51:07.506838+00	f	\N	2025-06-23 17:50:37.506838+00	2025-06-23 17:50:37.537079+00
a4a7dc1e-1fc9-4fa8-97fc-ead412d9a019	test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-mixed	exclusive	config_manager_1750701037556782759	2025-06-23 17:50:37.575693+00	2025-06-23 17:51:07.575693+00	f	\N	2025-06-23 17:50:37.575693+00	2025-06-23 17:50:37.636146+00
fb609ef1-8290-4319-a1fb-8a2c6e0bad96	test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-highfreq	exclusive	config_manager_1750701037638846021	2025-06-23 17:50:37.639761+00	2025-06-23 17:51:07.639761+00	f	\N	2025-06-23 17:50:37.639761+00	2025-06-23 17:50:37.724712+00
4e137d5c-458f-4715-b403-a2520ddc2bd1	test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-highfreq	exclusive	config_manager_1750701037651279221	2025-06-23 17:50:37.733149+00	2025-06-23 17:51:07.733149+00	f	\N	2025-06-23 17:50:37.733149+00	2025-06-23 17:50:37.847349+00
91bcf4a5-1a18-4267-a3e5-1600b74eb77d	test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-highfreq	exclusive	config_manager_1750701037741982630	2025-06-23 17:50:37.855623+00	2025-06-23 17:51:07.855623+00	f	\N	2025-06-23 17:50:37.855623+00	2025-06-23 17:50:37.881137+00
a5d0932b-39ab-48a1-8849-c6756fe43c5f	test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-coordinated	exclusive	config_manager_1750701037900419134	2025-06-23 17:50:37.923069+00	2025-06-23 17:51:07.923069+00	f	\N	2025-06-23 17:50:37.923069+00	2025-06-23 17:50:37.962111+00
\.


--
-- Data for Name: config_versions; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.config_versions (id, config_hash, version, lock_type, config_state, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: connection_leak_detection; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.connection_leak_detection (id, connection_id, acquired_at, acquired_by, operation_context, stack_trace, is_leaked, leak_detected_at, released_at, duration_held_ms, created_at) FROM stdin;
\.


--
-- Data for Name: connection_pool_alerts; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.connection_pool_alerts (id, alert_type, threshold_value, alert_enabled, alert_message, severity_level, created_at, updated_at) FROM stdin;
dac0698b-3588-43c1-9dec-f3ddf7d4b7e0	high_utilization	80	t	Connection pool utilization above 80%	warning	2025-06-22 21:41:54.941217+00	2025-06-22 21:41:54.941217+00
c1742c45-13f4-4013-bd8f-54b164cab116	critical_utilization	95	t	Connection pool utilization above 95%	critical	2025-06-22 21:41:54.941217+00	2025-06-22 21:41:54.941217+00
daa83598-9e29-445b-8a91-35175861b010	connection_wait	1000	t	Connection wait time exceeding 1 second	warning	2025-06-22 21:41:54.941217+00	2025-06-22 21:41:54.941217+00
dc5baf47-741b-45c7-822b-96f2838d8bf7	connection_errors	10	t	More than 10 connection errors per minute	error	2025-06-22 21:41:54.941217+00	2025-06-22 21:41:54.941217+00
af461183-85b8-4004-ac93-2527cdc044fb	leaked_connections	5	t	Detected connection leaks	error	2025-06-22 21:41:54.941217+00	2025-06-22 21:41:54.941217+00
\.


--
-- Data for Name: connection_pool_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.connection_pool_metrics (id, pool_name, active_connections, idle_connections, max_connections, total_connections, connections_in_use, wait_count, wait_duration_ms, connection_errors, pool_state, recorded_at) FROM stdin;
\.


--
-- Data for Name: database_performance_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.database_performance_metrics (id, query_type, query_hash, execution_time_ms, rows_affected, rows_returned, index_usage, query_plan_summary, cache_hit, operation_context, recorded_at) FROM stdin;
\.


--
-- Data for Name: dns_validation_params; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.dns_validation_params (campaign_id, source_generation_campaign_id, persona_ids, rotation_interval_seconds, processing_speed_per_minute, batch_size, retry_attempts, metadata) FROM stdin;
\.


--
-- Data for Name: dns_validation_results; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.dns_validation_results (id, dns_campaign_id, generated_domain_id, domain_name, validation_status, dns_records, validated_by_persona_id, attempts, last_checked_at, created_at, business_status) FROM stdin;
\.


--
-- Data for Name: domain_generation_batches; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.domain_generation_batches (batch_id, campaign_id, batch_number, total_domains, processed_domains, failed_domains, status, assigned_worker_id, started_at, completed_at, error_details, created_at) FROM stdin;
\.


--
-- Data for Name: domain_generation_campaign_params; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.domain_generation_campaign_params (campaign_id, pattern_type, variable_length, character_set, constant_string, tld, num_domains_to_generate, total_possible_combinations, current_offset) FROM stdin;
97cb0c6e-51df-4e27-bf25-473cb5be7725	prefix	3	abc	testdomain	.net	27	27	0
3802d334-279b-44b9-b26d-3cd5cc1aa794	prefix	8	abcdefghijklmnopqrstuvwxyz	test	.com	2000	208827064576	0
dfdbc118-4973-46de-a1f9-2302f95fc1fd	suffix	4	abcd	test	.io	256	256	0
ccd78f24-012e-45e9-8478-18a0f99eeaa4	both	2	ab	test	.com	16	16	0
f484cd2e-d849-43a6-b5f6-f210eddd84ff	prefix	3	abc	cached	.cache	27	27	0
180b3bb6-cec6-46da-a940-99310c20c627	prefix	2	ab	integ	.int	4	4	0
2b7e0d22-8d84-40ee-a7e4-488c98884c20	prefix	2	ab	integ	.int	4	4	0
87f239e0-0fe8-4005-8f0c-ee5b549634e9	prefix	2	ab	integ	.int	4	4	0
e6fd8a5e-3e1e-43ff-9866-39ea6ce05d6f	prefix	2	ab	integ	.int	4	4	0
b9fb796a-2f61-4b14-bb84-f0a5d309b93a	prefix	2	ab	integ	.int	4	4	0
ab8b2216-0969-4d26-8a02-2d141130c638	prefix	2	ab	integ	.int	4	4	0
2b0b1b73-5913-42fe-a8f6-aca2e0b983a7	prefix	2	ab	integ	.int	4	4	0
4060103c-adfc-4609-bf2b-16e6dbbbe1d0	prefix	2	ab	integ	.int	4	4	0
bcd9123b-0607-4ffc-b3cd-8273fe1107a6	prefix	2	ab	integ	.int	4	4	0
39a0fd00-a3eb-4972-b264-ee8afcedbf46	prefix	2	ab	integ	.int	4	4	0
611ea2dc-30c2-4853-9dab-8b52c6e8efa6	prefix	2	ab	integ	.int	4	4	0
cac344e6-49e5-4b6c-b002-66976e485609	prefix	2	ab	integ	.int	4	4	0
15b7f0eb-4734-4e8d-890c-110ddf145254	prefix	2	ab	integ	.int	4	4	0
c8d86e00-41fb-469b-a0b6-e50f44e2f3a9	prefix	2	ab	integ	.int	4	4	0
04ee839d-5991-4a26-96fe-14d23bf8a526	prefix	2	ab	integ	.int	4	4	0
7859097f-2538-44c7-a65a-746808d6ec88	prefix	2	ab	integ	.int	4	4	0
6c5b074e-22ab-449b-aecf-91a3ee48ad1c	prefix	2	ab	integ	.int	4	4	0
4bae218d-5cea-4ede-a1b2-f3ce15b604df	prefix	2	ab	integ	.int	4	4	0
f65e7d07-9418-4804-b4ba-be83e3513384	prefix	2	ab	integ	.int	4	4	0
59cc807d-c2c1-4c5b-b225-451815ab4c1f	prefix	2	ab	integ	.int	4	4	0
9d9b175a-de0e-45e3-89dd-f0a3e9ac8e6f	prefix	2	xy	mem	.mem	4	4	0
eacd36f2-4cb2-4dc1-a45b-d5326df8026a	prefix	3	abc	test	.com	27	27	0
\.


--
-- Data for Name: domain_generation_config_states; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.domain_generation_config_states (config_hash, last_offset, config_details, updated_at, version, created_at) FROM stdin;
b11aa71328d3585139f4dfeadbac52719d1cb44c03bc1d33727a1e4cb437cdcb	0	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdefghijklmnopqrstuvwxyz", "constantString": "test", "variableLength": 8}	2025-06-23 18:05:12.936403+00	3	2025-06-23 17:55:24.539644+00
621ae4db375062ac821ca390178960c309fe5b97ef77855fb91a2e9c9e5f6a83	21	{"tld": ".test", "patternType": "prefix", "characterSet": "abc", "constantString": "", "variableLength": 3}	2025-06-23 17:50:35.166641+00	40	2025-06-22 18:41:25.211686+00
ee2575f3a10d5d3d9cfbce706ba335832d8643e0519af0c2b15487aa50ba7c98	50	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdef", "constantString": "bl002test598a85de", "variableLength": 4}	2025-06-22 17:40:44.357763+00	20	2025-06-22 17:40:44.141898+00
a9c7e62e8659d7e14f412fa59075a3f83b40efe3643c6111284c07e3b4121b3f	50	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdef", "constantString": "bl002test2b2b7d97", "variableLength": 4}	2025-06-22 17:41:30.205077+00	20	2025-06-22 17:41:29.877866+00
57f6926868a5501c6f41845758ddfd5fe4c7b46bb050fbc24790763322cc94ac	0	{"tld": ".com", "patternType": "prefix", "characterSet": "123abc", "constantString": "test", "variableLength": 3}	2025-06-23 17:50:48.603247+00	10	2025-06-22 17:40:44.987468+00
2c87e2cd542800585762bd2683d787193b42428954f545df169d458add1a511a	0	{"tld": ".com", "patternType": "prefix", "characterSet": "0123456789abcdefghijklmnopqrstuvwxyz", "constantString": "cancel", "variableLength": 1}	2025-06-23 17:50:48.876919+00	10	2025-06-22 17:40:45.067108+00
ca0c09c0b3b5d59f13f0803783877668bc7d82b80408dda4d1e32ad3b82cf586	50	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdef", "constantString": "bl002testae04670c", "variableLength": 4}	2025-06-22 20:36:18.692166+00	20	2025-06-22 20:36:18.371293+00
7969fe5d9eb7aade2f2cfbb645e24adf86f7f4666763bb6738a2fb0bcc1608ab	0	{"tld": ".com", "patternType": "prefix", "characterSet": "0123456789abcdefghijklmnopqrstuvwxyz", "constantString": "fail", "variableLength": 1}	2025-06-23 17:50:50.28467+00	10	2025-06-22 17:40:46.391162+00
f128edf479766ed3815b4639d8ff23e0b6356ecd356ea6c17d8efc366a92c315	36	{"tld": ".com", "patternType": "prefix", "characterSet": "0123456789abcdefghijklmnopqrstuvwxyz", "constantString": "dbfail", "variableLength": 1}	2025-06-23 17:50:55.231389+00	20	2025-06-22 17:40:49.49807+00
27ba9a6df3e1a404c6758c9c6c39165509ccdd3a8c233fd03b7e7cdd921bd8af	50	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdef", "constantString": "bl002test88405c0d", "variableLength": 4}	2025-06-22 20:50:09.309298+00	20	2025-06-22 20:50:09.073958+00
d9d2f803b3951936729e116da3d92110aff27c8c86a34b858a84c6ffd140a99e	50	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdef", "constantString": "bl002testa1314ff6", "variableLength": 4}	2025-06-23 00:22:32.548497+00	20	2025-06-23 00:22:32.223292+00
6113554c30d450802467453dc878d85515fa95eaa7a4598f6e3b7a1c9c0e91f2	50	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdef", "constantString": "bl002test645b8b59", "variableLength": 4}	2025-06-22 21:50:56.616109+00	20	2025-06-22 21:50:56.450876+00
72852c137270de11d92b33c51a93296deffdd64c0b69272f1ce430f900c2e26e	50	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdef", "constantString": "bl002testa6c2aa94", "variableLength": 4}	2025-06-22 20:33:36.1229+00	20	2025-06-22 20:33:35.78104+00
dd1f0378ae01bcefafbeae262176536020012887e54f08233d9b1a16b1f64425	50	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdef", "constantString": "bl002testc61fa2d6", "variableLength": 4}	2025-06-23 00:23:02.609437+00	20	2025-06-23 00:23:02.336567+00
4957c04a6a69bb3c2edd1a77de8fcef85c4624d69fc68f7194a49e58378b8366	34	{"tld": ".com", "patternType": "prefix", "characterSet": "0123456789abcdefghijklmnopqrstuvwxyz", "constantString": "retry", "variableLength": 1}	2025-06-23 00:23:12.972206+00	18	2025-06-22 17:40:51.947122+00
ca5f4e531b2307a39367a22344ab5a53ed44d58cdd16f57ee7f8995dbc80863a	4	{"tld": ".com", "patternType": "prefix", "characterSet": "ab", "constantString": "test", "variableLength": 2}	2025-06-23 00:23:13.488879+00	11	2025-06-22 17:40:54.473262+00
56385dc0c59741d2e75d9fd6f89a3c5eed424577f72d84c14f680ddcd4649895	0	{"tld": ".com", "patternType": "prefix", "characterSet": "abc", "constantString": "prefix", "variableLength": 3}	2025-06-23 00:23:15.401795+00	11	2025-06-22 17:40:56.453078+00
a3d09b5bdc1828a5ab7ec3f084f497020b6dc8f31efb196689be0355ce78e7ae	0	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdefghijklmnopqrstuvwxyz", "constantString": "test", "variableLength": 5}	2025-06-23 00:23:15.697097+00	63	2025-06-22 17:40:56.096998+00
74bb4677737cf4101b576c65c53e668863255a6f2f5f24c7c7cc5ba51f3d4b8a	50	{"tld": ".com", "patternType": "prefix", "characterSet": "abcdef", "constantString": "bl002test56dd0928", "variableLength": 4}	2025-06-23 17:50:47.224169+00	30	2025-06-23 17:50:45.381209+00
test_versioned_retrieval_1acf91bb-cb27-49fe-a655-fe92561c025a	500	{"length": 5, "pattern": "test"}	2025-06-23 17:50:48.492892+00	1	2025-06-23 17:50:48.492892+00
\.


--
-- Data for Name: domain_generation_params; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.domain_generation_params (id, campaign_id, pattern_type, tld, constant_string, variable_length, character_set, num_domains_to_generate, created_at, updated_at, total_possible_combinations, current_offset) FROM stdin;
\.


--
-- Data for Name: enum_validation_failures; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.enum_validation_failures (id, table_name, column_name, invalid_value, attempted_at, context) FROM stdin;
\.


--
-- Data for Name: event_projections; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.event_projections (id, projection_name, aggregate_id, projection_data, last_event_position, version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: event_store; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.event_store (id, event_id, aggregate_id, aggregate_type, event_type, event_version, event_data, metadata, causation_id, correlation_id, stream_position, global_position, occurred_at, recorded_at) FROM stdin;
\.


--
-- Data for Name: generated_domains; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.generated_domains (id, domain_generation_campaign_id, domain_name, source_keyword, source_pattern, tld, offset_index, generated_at, created_at) FROM stdin;
\.


--
-- Data for Name: http_keyword_campaign_params; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.http_keyword_campaign_params (campaign_id, source_campaign_id, source_type, persona_ids, keyword_set_ids, ad_hoc_keywords, proxy_ids, proxy_pool_id, proxy_selection_strategy, rotation_interval_seconds, processing_speed_per_minute, batch_size, retry_attempts, target_http_ports, last_processed_domain_name, metadata) FROM stdin;
\.


--
-- Data for Name: http_keyword_params; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.http_keyword_params (id, campaign_id, target_url, keyword_set_id, created_at, updated_at, source_type, source_campaign_id) FROM stdin;
\.


--
-- Data for Name: http_keyword_results; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.http_keyword_results (id, http_keyword_campaign_id, dns_result_id, domain_name, validation_status, http_status_code, response_headers, page_title, extracted_content_snippet, found_keywords_from_sets, found_ad_hoc_keywords, content_hash, validated_by_persona_id, used_proxy_id, attempts, last_checked_at, created_at, business_status) FROM stdin;
\.


--
-- Data for Name: index_usage_analytics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.index_usage_analytics (id, schema_name, table_name, index_name, index_type, total_scans, tuples_read, tuples_fetched, blocks_read, blocks_hit, index_size_bytes, index_efficiency_pct, last_used_at, usage_frequency, recommendation, recorded_at) FROM stdin;
e85609c4-cf25-44d4-83d7-ac69f423038f	public	campaigns	campaigns_pkey	btree	8968	14484	7844	0	0	0	54.16	2025-06-23 00:23:15.819853+00	high	Good usage	2025-06-23 00:56:17.020912+00
02f6f591-7c15-4089-8f31-914327879b5a	public	memory_metrics	idx_memory_metrics_recorded	btree	4576	10773	7150	0	0	0	66.37	2025-06-22 22:59:27.835356+00	high	Good usage	2025-06-23 00:56:17.020912+00
7500fbc4-20fd-49f8-8956-2382beed7c0a	public	memory_optimization_recommendations	idx_memory_optimization_service	btree	4227	4083	4083	0	0	0	100.00	2025-06-22 22:59:27.835356+00	high	Good usage	2025-06-23 00:56:17.020912+00
ec94dbfe-21a8-4a2e-9bf2-262fa687a2aa	public	memory_metrics	idx_memory_metrics_service	btree	3764	100879	92344	0	0	0	91.54	2025-06-22 22:59:27.835356+00	high	Good usage	2025-06-23 00:56:17.020912+00
ce496606-68d1-474f-a514-ef0d8f39c4d8	public	query_optimization_recommendations	idx_query_optimization_hash	btree	2873	875	862	0	0	0	98.51	2025-06-23 00:28:21.970848+00	high	Good usage	2025-06-23 00:56:17.020912+00
eaa06079-8b2d-405f-aad1-1c9ec39a4922	public	state_coordination_locks	state_coordination_locks_pkey	btree	1940	2127	1300	0	0	0	61.12	2025-06-23 00:23:01.656794+00	high	Good usage	2025-06-23 00:56:17.020912+00
374b5f2f-c611-44d9-b6dd-bbdaf7103927	public	query_performance_metrics	idx_query_performance_hash	btree	1634	2365	1784	0	0	0	75.43	2025-06-23 00:28:21.970848+00	high	Good usage	2025-06-23 00:56:17.020912+00
45f14ea3-2630-4b41-ba1f-86d58090c1e3	public	security_events	security_events_pkey	btree	1266	1266	573	0	0	0	45.26	2025-06-23 00:22:59.029393+00	high	Good usage	2025-06-23 00:56:17.020912+00
e87fb903-4e9b-468b-baf1-72d65c1a228e	public	domain_generation_config_states	domain_generation_config_states_pkey	btree	1250	2433	1122	0	0	0	46.12	2025-06-23 00:23:15.726373+00	high	Good usage	2025-06-23 00:56:17.020912+00
79f5c3fe-504d-4104-8209-571e6f375e43	public	http_keyword_campaign_params	http_keyword_campaign_params_pkey	btree	1135	13	12	0	0	0	92.31	2025-06-23 00:23:54.489026+00	high	Good usage	2025-06-23 00:56:17.020912+00
9e90c67d-e7a0-427a-887f-7ecf1d9b595d	public	dns_validation_results	idx_dns_results_campaign_id	btree	1135	50	0	0	0	0	0.00	2025-06-23 00:23:54.489026+00	high	Good usage	2025-06-23 00:56:17.020912+00
54ddaee6-7e29-4858-ba6b-6065cd3df960	public	dns_validation_params	dns_validation_params_pkey	btree	1123	13	13	0	0	0	100.00	2025-06-23 00:23:54.489026+00	high	Good usage	2025-06-23 00:56:17.020912+00
334ba3ec-c582-4719-9121-5bd1b989eb1e	public	campaign_state_snapshots	idx_campaign_state_snapshots_campaign_sequence	btree	1111	0	0	0	0	0	0.00	2025-06-23 00:23:54.489026+00	high	Good usage	2025-06-23 00:56:17.020912+00
8e3d92f6-dd22-4d7f-8d73-0b6866f16851	public	http_keyword_params	idx_http_keyword_params_source_campaign_id	btree	1111	0	0	0	0	0	0.00	2025-06-23 00:23:54.489026+00	high	Good usage	2025-06-23 00:56:17.020912+00
755f6f72-1658-4f5b-831d-803faa64d6ef	public	http_keyword_params	idx_http_keyword_params_campaign_id	btree	1111	0	0	0	0	0	0.00	2025-06-23 00:23:54.489026+00	high	Good usage	2025-06-23 00:56:17.020912+00
630d1ccc-4e53-400f-b074-81847dba3d39	public	domain_generation_params	idx_domain_gen_params_campaign_id	btree	1111	0	0	0	0	0	0.00	2025-06-23 00:23:54.489026+00	high	Good usage	2025-06-23 00:56:17.020912+00
1e74062c-d512-4c73-a40d-f22440af7f10	public	http_keyword_results	idx_http_results_campaign_id	btree	1111	0	0	0	0	0	0.00	2025-06-23 00:23:54.489026+00	high	Good usage	2025-06-23 00:56:17.020912+00
53be8964-f786-464c-b1b8-1dc60d03ab1f	public	input_validation_rules	idx_validation_rules_method	btree	1074	21964	21962	0	0	0	99.99	2025-06-22 22:03:10.541233+00	high	Good usage	2025-06-23 00:56:17.020912+00
e199c4ad-e91e-4bc1-8f8a-02af19eb9f81	public	audit_logs	audit_logs_pkey	btree	1041	1041	466	0	0	0	44.76	2025-06-23 00:22:59.029393+00	high	Good usage	2025-06-23 00:56:17.020912+00
e679612a-b497-4cec-b28c-88077180e8a2	public	campaigns	idx_campaigns_user_id	btree	1026	2232	1752	0	0	0	78.49	2025-06-23 00:22:56.771532+00	high	Good usage	2025-06-23 00:56:17.020912+00
bcdb6813-d182-4903-9134-eac3819f7b8d	public	domain_generation_campaign_params	domain_generation_campaign_params_pkey	btree	1014	369	325	0	0	0	88.08	2025-06-23 00:23:15.819853+00	high	Good usage	2025-06-23 00:56:17.020912+00
3f1e09cf-0488-4017-b7cc-af9f21a5b6f0	public	campaign_jobs	campaign_jobs_pkey	btree	984	1457	984	0	0	0	67.54	2025-06-23 00:23:15.022636+00	medium	Good usage	2025-06-23 00:56:17.020912+00
35e8a220-2d89-4e97-8004-71e2a2d3b084	public	config_locks	idx_config_locks_active	btree	948	922	724	0	0	0	78.52	2025-06-23 00:22:59.52066+00	medium	Good usage	2025-06-23 00:56:17.020912+00
4155a03d-ca9f-4537-a4f0-e1b1155162e8	public	campaign_state_events	idx_campaign_state_events_type_campaign	btree	799	85	85	0	0	0	100.00	2025-06-23 00:23:02.247768+00	medium	Good usage	2025-06-23 00:56:17.020912+00
80e2735a-1b4b-42ac-9722-53bdd03c41ba	public	campaign_state_transitions	idx_campaign_state_transitions_campaign_time	btree	730	11	11	0	0	0	100.00	2025-06-23 00:23:01.899835+00	medium	Good usage	2025-06-23 00:56:17.020912+00
57ea8d90-da63-4cfd-a823-b1f12aa6d035	public	campaign_access_grants	campaign_access_grants_campaign_id_user_id_access_type_key	btree	602	0	0	0	0	0	0.00	2025-06-23 00:23:54.489026+00	medium	Good usage	2025-06-23 00:56:17.020912+00
a93cd681-a92a-4273-82c8-2a7d13d04ebb	public	worker_coordination	worker_coordination_pkey	btree	569	725	245	0	0	0	33.79	2025-06-23 00:22:58.755141+00	medium	Good usage	2025-06-23 00:56:17.020912+00
4bd9afb3-6ee5-49a6-bc49-640a29206be8	public	campaign_state_events	campaign_state_events_pkey	btree	549	549	549	0	0	0	100.00	2025-06-23 00:23:07.921606+00	medium	Good usage	2025-06-23 00:56:17.020912+00
a7b02265-23c5-4995-9734-a8214df19601	public	generated_domains	idx_generated_domains_campaign_id	btree	534	1564	864	0	0	0	55.24	2025-06-23 00:23:15.022636+00	medium	Good usage	2025-06-23 00:56:17.020912+00
67778522-2a97-4e4e-ae89-8b775c617ba1	public	api_endpoint_permissions	api_endpoint_permissions_endpoint_pattern_http_method_key	btree	525	525	525	0	0	0	100.00	2025-06-22 21:50:49.32468+00	medium	Good usage	2025-06-23 00:56:17.020912+00
52a8ec0e-4ebe-4cbc-9db4-8458cc1541b0	public	domain_generation_batches	idx_domain_batches_campaign	btree	464	309	210	0	0	0	67.96	2025-06-23 00:22:58.655378+00	medium	Good usage	2025-06-23 00:56:17.020912+00
5890d0c9-0b62-4e8e-826a-7aa87f2d7e7f	public	campaign_jobs	idx_campaign_jobs_campaign_id	btree	457	514	120	0	0	0	23.35	2025-06-23 00:23:15.018724+00	medium	Good usage	2025-06-23 00:56:17.020912+00
bcf5143b-cc41-4608-9354-f0de22661534	public	worker_coordination	idx_worker_coordination_campaign	btree	441	711	128	0	0	0	18.00	2025-06-23 00:22:58.655378+00	medium	Good usage	2025-06-23 00:56:17.020912+00
54cfd9a5-2eeb-4c6b-bf40-cdd0cb81cc72	public	api_endpoint_permissions	idx_api_endpoint_permissions_method	btree	405	984	984	0	0	0	100.00	2025-06-22 20:35:43.43508+00	medium	Good usage	2025-06-23 00:56:17.020912+00
9574a582-c6b2-445b-b052-822e5a1a3bf0	public	user_roles	user_roles_pkey	btree	399	0	0	0	0	0	0.00	2025-06-22 20:35:43.43508+00	medium	Good usage	2025-06-23 00:56:17.020912+00
761cbbfa-86b8-427a-9d6a-067b4d850444	public	config_locks	config_locks_pkey	btree	274	274	274	0	0	0	100.00	2025-06-23 00:22:59.52066+00	medium	Good usage	2025-06-23 00:56:17.020912+00
229e7e75-dd71-42ac-b3fe-fe2a94c347e0	public	campaigns	idx_campaigns_created_at	btree	260	59	39	0	0	0	66.10	2025-06-22 22:59:27.835356+00	medium	Good usage	2025-06-23 00:56:17.020912+00
0e42e617-39cc-4fba-a5aa-0a784c76628e	public	domain_generation_config_states	idx_domain_config_states_atomic	btree	208	444	162	0	0	0	36.49	2025-06-23 00:23:03.179267+00	medium	Good usage	2025-06-23 00:56:17.020912+00
96071779-0d06-49c5-ab20-74d494c4bd21	public	campaign_state_events	idx_campaign_state_events_campaign_sequence	btree	181	1139	660	0	0	0	57.95	2025-06-23 00:23:02.247768+00	medium	Good usage	2025-06-23 00:56:17.020912+00
b008ce75-ff21-4ce1-a9eb-e0d22a4a21da	public	domain_generation_batches	domain_generation_batches_pkey	btree	144	256	144	0	0	0	56.25	2025-06-23 00:22:58.655378+00	medium	Good usage	2025-06-23 00:56:17.020912+00
705536d2-8925-44fa-b684-dc85ff01fdea	public	input_validation_rules	idx_validation_rules_field	btree	126	114	114	0	0	0	100.00	2025-06-22 22:03:06.867293+00	medium	Good usage	2025-06-23 00:56:17.020912+00
98a58dd1-b729-4d2f-acf3-e8bd0c86cbee	public	security_events	idx_security_events_created	btree	118	1342	641	0	0	0	47.76	2025-06-23 00:22:59.029393+00	medium	Good usage	2025-06-23 00:56:17.020912+00
ad970543-41d1-4169-9a02-4d07653f75e2	public	versioned_configs	idx_versioned_configs_validation	btree	112	55	52	0	0	0	94.55	2025-06-23 00:22:59.52066+00	medium	Good usage	2025-06-23 00:56:17.020912+00
2027ed0c-779e-478a-a3aa-b7c0755d3de1	public	versioned_configs	versioned_configs_type_key_unique	btree	110	17	14	0	0	0	82.35	2025-06-23 00:22:59.52066+00	medium	Good usage	2025-06-23 00:56:17.020912+00
40096095-02c6-4be4-a166-3b5870ebbe27	public	personas	personas_pkey	btree	97	83	80	0	0	0	96.39	2025-06-23 00:23:15.819853+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
c603c3a9-9811-4558-adbf-28f830958985	public	suspicious_input_alerts	idx_suspicious_alerts_user_id	btree	90	102	76	0	0	0	74.51	2025-06-22 21:31:05.119074+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
bef495a7-907a-4ec0-a0c2-75a69fa33fbc	public	worker_coordination	idx_worker_coordination_heartbeat	btree	87	271	69	0	0	0	25.46	2025-06-23 00:22:58.755141+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
f0623c89-0f9a-44a7-b583-791ba00483d9	auth	users	users_pkey	btree	82	60	26	0	0	0	43.33	2025-06-22 20:35:43.43508+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
6197b490-cc0f-4caf-9ed2-6f961ee142dd	public	input_validation_violations	idx_validation_violations_user	btree	73	22	22	0	0	0	100.00	2025-06-22 22:03:10.810958+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
c408882e-6255-4f57-9cb9-ced52075f3df	public	security_events	idx_security_events_user	btree	70	306	306	0	0	0	100.00	2025-06-23 00:22:59.029393+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
cc73354c-277d-4653-8cec-176bd881e2d1	public	security_events	idx_security_events_result	btree	66	746	588	0	0	0	78.82	2025-06-23 00:22:59.029393+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
33440610-02b9-4b9c-b5eb-d6169edc3c2d	public	query_optimization_recommendations	query_optimization_recommendations_pkey	btree	54	54	40	0	0	0	74.07	2025-06-23 00:28:21.960134+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
0bffe560-1c0a-49a8-89f8-284822d8695b	public	state_events	idx_state_events_version	btree	54	467	467	0	0	0	100.00	2025-06-23 00:23:00.991893+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
169187f2-5766-4c1e-9be6-392ac871d3b0	public	authorization_decisions	idx_auth_decisions_user	btree	53	53	53	0	0	0	100.00	2025-06-23 00:22:59.029393+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
df346789-0f41-4df7-a533-a1ccfc91780f	public	state_snapshots	idx_state_snapshots_version	btree	52	52	52	0	0	0	100.00	2025-06-23 00:23:00.991893+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
c6c66eeb-cb03-47d7-9a27-2b96510e09fb	public	state_snapshots	state_snapshots_entity_id_entity_type_snapshot_version_key	btree	52	0	0	0	0	0	0.00	2025-06-23 00:23:00.991893+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
fd5b374e-36eb-461b-a83c-03a04719dbf4	public	memory_metrics	idx_memory_metrics_service_recorded	btree	47	2114	1060	0	0	0	50.14	2025-06-22 22:57:12.227705+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
1b3168ec-8aa2-4990-9e95-3a188703a15d	public	domain_generation_batches	domain_generation_batches_campaign_id_batch_number_key	btree	41	87	63	0	0	0	72.41	2025-06-22 20:36:13.832509+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
00c7d99a-79ff-446a-af30-d48536bc6636	auth	user_roles	idx_user_roles_user_id	btree	39	0	0	0	0	0	0.00	2025-06-22 20:35:43.43508+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
6561146e-b1fd-4df2-b05e-0e6b30c01193	public	resource_locks	idx_resource_locks_holder	btree	38	67	41	0	0	0	61.19	2025-06-22 18:27:02.106856+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
cdb9a3f0-94cb-4e00-83a9-c629f5c65022	public	input_validation_rules	idx_validation_rules_endpoint	btree	36	157	155	0	0	0	98.73	2025-06-22 22:03:10.810958+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
64af4b3b-6367-422d-8b9a-ee6de2538a06	public	resource_locks	idx_resource_locks_resource	btree	34	34	22	0	0	0	64.71	2025-06-22 18:27:02.106856+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
4ade27e4-e388-492c-a5a8-779c3652942c	public	query_performance_metrics	idx_query_performance_executed	btree	32	0	0	0	0	0	0.00	2025-06-23 00:28:21.960134+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
172567a7-6a44-441f-bfc9-d2807e85dead	auth	sessions	idx_sessions_user_id	btree	26	18	9	0	0	0	50.00	2025-06-22 20:35:43.43508+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
eafc9ad7-a4fc-4d20-b6e0-7a6bc2f42208	public	dns_validation_results	uq_dns_results_campaign_domain	btree	24	0	0	0	0	0	0.00	2025-06-23 00:23:15.819853+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
ff89ef32-9f5a-46ef-8e8e-85cc51c726ae	public	query_performance_metrics	query_performance_metrics_pkey	btree	21	26	16	0	0	0	61.54	2025-06-23 00:24:47.993386+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
32f2e9c1-889f-4699-8f8e-f2a37d67f7e4	public	audit_logs	idx_audit_logs_entity_type_id	btree	20	20	20	0	0	0	100.00	2025-06-22 21:51:08.57987+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
6491c61a-073f-42b0-8669-2a20613968e3	public	input_validation_rules	input_validation_rules_endpoint_pattern_http_method_field_n_key	btree	19	115	115	0	0	0	100.00	2025-06-22 22:03:05.747447+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
1b6f9e09-0b53-4291-b851-8188ac28dd53	auth	password_reset_tokens	idx_password_reset_user_id	btree	17	0	0	0	0	0	0.00	2025-06-22 20:35:43.43508+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
a6ad970e-1a74-4155-b0b9-d0f56e4d9154	auth	auth_audit_log	idx_auth_audit_user_id	btree	17	0	0	0	0	0	0.00	2025-06-22 20:35:43.43508+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
d0bd200d-e2bf-4865-977a-f0512dd9cf15	public	domain_generation_batches	idx_domain_batches_status	btree	16	253	219	0	0	0	86.56	2025-06-22 18:42:27.950192+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
ac9e1774-584f-4182-a0f5-a68e2793ee9a	public	proxies	proxies_pkey	btree	15	13	9	0	0	0	69.23	2025-06-22 17:23:56.494967+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
5e9c1490-ba32-4b3a-889b-38a65da32552	public	campaign_state_snapshots	idx_campaign_state_snapshots_valid	btree	15	15	15	0	0	0	100.00	2025-06-23 00:23:02.247768+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
a03e0055-6133-448e-9438-bfc9baf9343c	public	proxy_pool_memberships	idx_proxy_pool_memberships_proxy	btree	13	0	0	0	0	0	0.00	2025-06-22 17:23:56.494967+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
96fa03db-01a5-4b36-892b-87968209c110	public	slow_query_log	idx_slow_query_logged	btree	13	53	27	0	0	0	50.94	2025-06-22 23:27:52.618831+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
2f1bf7c5-5ca6-4352-b4ce-bccdc988f134	public	keyword_sets	keyword_sets_pkey	btree	12	12	12	0	0	0	100.00	2025-06-23 00:23:15.819853+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
6391fd1a-be3b-4604-94ed-f8376ba1a4e1	public	authorization_decisions	idx_auth_decisions_decision	btree	9	9	7	0	0	0	77.78	2025-06-22 19:25:58.24743+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
d023e544-f3bd-4f41-b7d6-a809cc9207d4	auth	sessions	idx_sessions_validation	btree	9	9	9	0	0	0	100.00	2025-06-22 20:35:43.075022+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
9842e5c5-34aa-4f7d-91d9-3fdcaa75b2b7	public	memory_metrics	memory_metrics_pkey	btree	8	8	2	0	0	0	25.00	2025-06-22 22:59:27.835356+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
7b943b83-fba5-4bbd-9c99-f778ea2a78b9	public	security_events	idx_security_events_risk	btree	6	106	78	0	0	0	73.58	2025-06-23 00:22:59.001662+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
439412e9-48f4-4040-ae20-144a0529e36c	public	audit_logs	idx_audit_logs_user_id	btree	6	16	16	0	0	0	100.00	2025-06-22 21:50:54.20285+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
a02d5d69-189b-4a84-ae5a-078e275035e5	public	generated_domains	idx_generated_domains_offset	btree	6	6	6	0	0	0	100.00	2025-06-22 20:33:47.94271+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
12a6e4e0-5c78-4ffd-bc83-1ed043a03c6c	public	audit_logs	idx_audit_logs_entity_timestamp	btree	6	6	6	0	0	0	100.00	2025-06-23 00:23:15.493057+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
7a2dc463-6586-4e05-848d-8b04f7d640d9	public	api_access_violations	idx_access_violations_user	btree	5	12	12	0	0	0	100.00	2025-06-22 20:35:43.43508+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
4e2e73b0-1a15-4b55-9021-eddd865908d2	public	schema_migrations	schema_migrations_pkey1	btree	5	0	0	0	0	0	0.00	2025-06-22 22:39:03.519496+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
7e881864-5fa5-4a84-88c8-732279ed5533	public	suspicious_input_patterns	suspicious_input_patterns_pattern_name_key	btree	4	6	2	0	0	0	33.33	2025-06-22 21:26:33.610467+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
fd76ffa4-de37-4803-aa4d-fa6a822debe3	public	personas	idx_personas_type	btree	4	16	8	0	0	0	50.00	2025-06-22 17:23:56.494967+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
5a869737-9ecb-49ad-b4ea-9df65b313c16	public	versioned_configs	idx_versioned_configs_type_key	btree	4	1	1	0	0	0	100.00	2025-06-22 20:33:32.609706+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
991151d1-c309-4aa1-8ed5-c7133ffba3c2	public	config_locks	idx_config_locks_config_hash	btree	4	2	0	0	0	0	0.00	2025-06-23 00:22:59.52066+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
72fa96c3-506b-4c43-b1b5-490e1e6b22dc	public	personas	uq_personas_name_type	btree	3	5	4	0	0	0	80.00	2025-06-22 17:23:56.494967+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
0aff8d96-dadf-41cf-9ad8-e7e4fc84aafe	public	api_access_violations	idx_access_violations_created	btree	2	4	4	0	0	0	100.00	2025-06-22 20:32:47.750001+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
b1bc074f-c55e-4f5b-a9aa-410f3b1260b4	public	suspicious_input_alerts	idx_suspicious_alerts_created_at	btree	2	27	7	0	0	0	25.93	2025-06-22 21:27:53.667403+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
4b39c879-f663-4b6a-bcbe-d5a700c7da03	public	http_keyword_results	idx_http_keyword_results_dns_result_id	btree	2	0	0	0	0	0	0.00	2025-06-22 22:41:28.135343+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
c9e734e1-f63b-4efb-a8b3-f3565a0ee4c0	public	audit_logs	idx_audit_logs_user_timestamp	btree	2	2	2	0	0	0	100.00	2025-06-23 00:22:59.029393+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
4dd7c190-f776-497c-996f-5579f0416e6a	public	campaign_jobs	idx_campaign_jobs_type	btree	1	0	0	0	0	0	0.00	2025-06-22 17:24:05.292038+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
85230282-2e63-43a4-ad5a-027d5d507036	public	personas	idx_personas_is_enabled	btree	1	7	2	0	0	0	28.57	2025-06-22 17:23:56.494967+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
8d03241f-68e7-41c3-a758-814e079a0e36	public	audit_logs	idx_audit_logs_timestamp	btree	1	2	2	0	0	0	100.00	2025-06-22 17:23:55.248107+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
bbc63918-7f48-44ee-8aef-18cc23ada4dc	public	proxies	proxies_name_key	btree	1	8	3	0	0	0	37.50	2025-06-22 17:23:56.494967+00	low	Low usage - review necessity	2025-06-23 00:56:17.020912+00
a7ed6fea-5e75-490e-8ef5-ff5f2cd11b91	public	domain_generation_campaign_params	idx_domain_gen_offset	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
2d570c49-27e5-4bd2-b55a-c120aa78823f	public	domain_generation_params	domain_generation_params_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
c493ce9e-8976-4bcb-9895-dc5f4913a3a3	public	http_keyword_params	http_keyword_params_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
31985d31-a039-445f-b605-3d1af7e343f6	public	campaigns	idx_campaigns_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
860d79ee-37e9-452d-b676-eb0a6daee7f3	auth	rate_limits	idx_rate_limits_blocked_until	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
f6dbc1c4-d7d0-49ee-9329-5c5a40cc2e64	auth	rate_limits	idx_rate_limits_identifier	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
06f209a1-a322-4cad-8488-c960e779c303	public	campaigns	idx_campaigns_last_heartbeat	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
385b28d5-48ff-4d07-8f38-ad19984e0d8f	public	enum_validation_failures	enum_validation_failures_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
13b05289-ea69-4e2b-b87a-4b8ba444b1f6	public	domain_generation_config_states	idx_domain_config_states_version	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
85237848-cbbe-4439-bdab-c331056d3016	auth	rate_limits	rate_limits_identifier_action_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
39e5d647-0ae9-4ad0-b7bf-ddb4a1cf34c9	auth	rate_limits	rate_limits_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
eb580b7a-3323-4325-8d8c-f33e7166e341	public	campaign_state_events	uq_campaign_state_events_sequence	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
252fd757-508b-46a3-8dc8-e448fb67b3d5	public	campaign_state_transitions	campaign_state_transitions_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e599a137-0ea6-4292-9a74-3312ec013c76	public	campaign_state_transitions	uq_state_transitions_event	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
b92181e3-f116-421a-893d-d04ba256a9e6	public	campaign_state_snapshots	campaign_state_snapshots_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e556c84a-281b-47ba-aff7-cf0c87a54350	public	campaign_state_snapshots	uq_campaign_snapshots_sequence	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
b06c7ea0-2609-401d-a112-373258919bca	auth	auth_audit_log	idx_auth_audit_session_fingerprint	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
b2b9e15e-1dff-4464-b82d-18630f657244	auth	auth_audit_log	idx_auth_audit_risk_score	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
052b0dfb-6431-4820-a7f0-09965359c325	auth	auth_audit_log	idx_auth_audit_created_at	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
2581c2bf-dd3c-47bb-b322-cc4f46df07aa	public	config_locks	idx_config_locks_active_unique	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
1a3e37d9-edc9-4cfd-987f-0dc0a2689a3e	public	versioned_configs	versioned_configs_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
5dc6031c-0ce4-4547-a88e-be9413fd7a41	auth	auth_audit_log	idx_auth_audit_event_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
0a854137-0c3f-403b-81a5-2dbd8f8eeb97	public	versioned_configs	idx_versioned_configs_version	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
9372739e-8302-40d7-a40c-35fccbdedcb3	public	versioned_configs	idx_versioned_configs_created_at	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
57b72d21-d5d4-4cdb-94b3-6473dcdd646a	public	versioned_configs	idx_versioned_configs_updated_at	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
8242a54b-5e5b-48ad-b4c2-036621be9ed8	public	versioned_configs	idx_versioned_configs_checksum	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
eb526ebe-51df-4ee7-9675-22adcca3d1ae	public	state_events	state_events_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
aa8676de-40e3-4281-a614-ab470ab26400	auth	auth_audit_log	auth_audit_log_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
13af4928-0347-4b98-b534-e43f6484020f	auth	password_reset_tokens	idx_password_reset_expires	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
a1f39807-0852-47eb-a699-734481f3f6b8	public	state_events	idx_state_events_correlation	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
ffa6dca8-8bcd-4409-b63c-bd72bfe8bb2e	public	state_snapshots	state_snapshots_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
9fbc27ac-89f2-40d2-a1ea-b5fe2d493e65	public	async_task_status	idx_async_task_status_type_status	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
fe0e9c57-dc66-452e-9f55-a5c7a9ce80c0	public	state_snapshots	idx_state_snapshots_entity	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
44a9e481-e32e-42bd-bc7e-71537317767a	public	state_coordination_locks	idx_coordination_locks_expires	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
df6ccdfd-5927-4e75-bf62-f5703fa8b47d	auth	password_reset_tokens	password_reset_tokens_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
2d5a1dd3-7ce5-4400-9e08-b60b6b37b39d	auth	role_permissions	idx_role_permissions_permission_id	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
54f63218-4aa9-4bf5-b8c9-86b34145d5fd	public	worker_coordination	idx_worker_coordination_status	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
91fb10e1-0af8-4e33-90b7-c2983efaedbd	auth	role_permissions	idx_role_permissions_role_id	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
51482a54-8cb0-4696-a52b-dc4f5a61b025	auth	role_permissions	role_permissions_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
00612809-7cad-4082-a91a-d2c3c233c1a4	auth	user_roles	idx_user_roles_role_id	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
289999d2-b10c-4544-8e88-37619a827d6b	public	resource_locks	resource_locks_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e3730b0c-477d-4cce-9716-b0662548db0c	public	resource_locks	idx_resource_locks_expires	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
fa0db758-d598-47e4-a81f-a6b4c7e46eab	public	resource_locks	unique_exclusive_locks	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
a4c43658-22fb-41a9-aeea-3130f054d3dc	public	domain_generation_batches	idx_domain_batches_worker	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
22921899-5f70-45ef-82bc-0b4c94d10361	public	audit_logs	idx_audit_logs_authorization	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
3a02ef36-e8da-42d9-a2d2-01250840bd85	auth	user_roles	user_roles_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
47ec0beb-ef94-46e4-bd04-8c2b5264048e	public	security_events	idx_security_events_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
144c6a10-0064-483a-90f3-5e781d015f0b	auth	permissions	permissions_resource_action_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
48e2cac2-4dce-484f-bd95-9663283d4d85	auth	permissions	permissions_name_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
49a6876d-a3f8-4cb9-b7c3-cd5fdd6f865d	public	authorization_decisions	authorization_decisions_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
eb31e02c-68cb-4624-88b8-d19b22b5b6ff	public	authorization_decisions	authorization_decisions_decision_id_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
07bb7891-4f51-411d-827b-bdf054c51340	auth	permissions	permissions_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
d4cc017d-9b48-4585-b502-1a0373ec823f	public	authorization_decisions	idx_auth_decisions_resource	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
bbd6b081-e419-4462-a282-05f1baf37592	public	authorization_decisions	idx_auth_decisions_created	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
19e2b080-5d08-4704-84db-36840a589db8	public	query_performance_metrics	idx_query_performance_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
c19538cb-1fc4-4c8f-a999-e8ef3c953229	public	query_performance_metrics	idx_query_performance_execution_time	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
a6802392-fd5f-432c-a7ab-b442d00e3712	public	query_performance_metrics	idx_query_performance_optimization_score	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
cc76b551-cc7c-4962-b26c-686b38a08411	auth	roles	roles_name_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
42e8c9f5-8993-4441-bb3c-95969c7286b3	public	api_endpoint_permissions	api_endpoint_permissions_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
ed77b837-09b6-493f-8e6d-6f3b1d997979	auth	roles	roles_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
36763a8f-080e-4da8-b507-0335a2ebae1e	public	api_endpoint_permissions	idx_api_endpoint_permissions_pattern	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
3ef8ab13-5779-44a3-b9d6-9c644add96e9	public	api_endpoint_permissions	idx_api_endpoint_permissions_resource	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
40d53331-88b3-4418-8d66-a4746d8ec29a	public	api_access_violations	api_access_violations_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
5a64efe9-0799-44ea-9b0e-a4d8973cb7a7	public	api_access_violations	idx_access_violations_endpoint	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
ec4a60ac-c17a-48a1-a1fa-e159d2350033	public	api_access_violations	idx_access_violations_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
c8440dc5-40f0-466f-82c2-20812984b21b	public	users	users_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
5506dfa7-f89a-4044-ad93-29af37aa010d	public	users	users_email_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
ee7bbc88-d789-4e5d-8dc7-a6d550b42db7	public	roles	roles_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
17bac548-fdc3-4897-86dc-7bfd352777e2	public	roles	roles_name_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e8e2d881-dc6d-40c3-a3ea-cc5cf8792622	auth	sessions	idx_sessions_ip_address	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
ad18923d-6429-4e2d-9ed7-f53b156b9e89	public	permissions	permissions_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
1eef2436-d46e-4f09-bcfe-da0d652a2255	public	permissions	permissions_name_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
71e89f41-2cf2-4492-955f-24ab08c3d7a6	public	role_permissions	role_permissions_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e70c36ae-f74c-4a09-a858-f0356db6938b	public	campaign_access_grants	campaign_access_grants_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
94c89475-fe33-4240-9c6e-efdf4e494b8a	public	campaigns	idx_campaigns_status	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
c7c5202f-8dde-46e3-9892-b4b989e4ae44	public	input_validation_rules	input_validation_rules_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
9d79fa73-001d-47a2-80d8-4383ff2cb6c0	auth	sessions	idx_sessions_user_agent_hash	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
771bb4b2-04af-41f3-b0fd-e7bf0ee65fff	auth	sessions	idx_sessions_fingerprint	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
203610f9-4c96-42be-b4aa-d7b56abd798a	public	input_validation_violations	input_validation_violations_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
fc34fdbb-8ec0-434f-a9b7-a4549903a3b7	auth	sessions	idx_sessions_last_activity	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
0cc0f9ca-b4c0-4b2c-bdf4-a88d7ac227d0	public	input_validation_violations	idx_validation_violations_endpoint	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
886415e9-9515-41b1-8390-19b759e00341	public	input_validation_violations	idx_validation_violations_field	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
f0b2128d-4306-425b-bec4-06a32c67a691	public	input_validation_violations	idx_validation_violations_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
4275674a-99ec-46a5-a6ce-bc7333480c1c	public	input_validation_violations	idx_validation_violations_created	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
c4e1f16f-5571-4bd3-88c9-d2b61865d3ae	public	suspicious_input_patterns	suspicious_input_patterns_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
b8e5965a-dc6a-41b3-853e-3053b61bb380	auth	sessions	idx_sessions_active	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
46a30ebf-d53a-4ff3-b72f-83377786bbac	public	query_optimization_recommendations	idx_query_optimization_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
7294a4be-6b27-4174-a9ac-78a76917a10f	public	query_optimization_recommendations	idx_query_optimization_priority	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
2ee12462-ac4a-4575-940f-d667ee1fe1bd	public	query_optimization_recommendations	idx_query_optimization_implemented	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
b61635f6-13ee-4535-ba1a-610edd658ad6	public	index_usage_analytics	index_usage_analytics_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
0aec3f10-db02-4b2b-a0bd-44ced647a520	public	suspicious_input_alerts	suspicious_input_alerts_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
0e12b64a-4747-4a5e-8bd1-20cf47db659f	public	suspicious_input_alerts	idx_suspicious_alerts_endpoint	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
2fd07aa3-1f5a-4239-b94a-412cd28218ac	auth	sessions	idx_sessions_expires_at	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e7d6f491-d3ed-4bd8-a80c-b2b6d61b276d	public	suspicious_input_alerts	idx_suspicious_alerts_severity	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
9d679b92-3f58-4242-b89b-d593f4de82db	public	suspicious_input_alerts	idx_suspicious_alerts_pattern_name	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
79506f28-65b5-46a4-ae81-6108ceabca44	public	connection_pool_metrics	connection_pool_metrics_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
9182edd0-deb2-4149-9c03-569afa0198e9	public	connection_pool_metrics	idx_connection_pool_metrics_pool	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
cb1b0f14-67af-4afc-80de-114ad1a0ea5d	public	connection_pool_metrics	idx_connection_pool_metrics_recorded	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
5e47276a-a6a6-4300-b081-8740cc184dbf	public	connection_pool_metrics	idx_connection_pool_metrics_state	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
8627311a-7708-4c39-a932-1e1e224ebe9b	public	connection_leak_detection	connection_leak_detection_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
3b0b9022-e509-40b4-88c6-f03435975bef	public	connection_leak_detection	idx_connection_leak_connection	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
752706af-1dc7-4b1d-bb76-b5718cc7d483	public	connection_leak_detection	idx_connection_leak_acquired	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
a5a68a09-14cb-4075-812d-ed6f85fac031	public	connection_leak_detection	idx_connection_leak_leaked	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e96a18d0-7882-4581-88d2-f68279eb54b4	public	connection_pool_alerts	connection_pool_alerts_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
f3f1efe7-2c8f-4886-984b-f9cb640b79df	public	connection_pool_alerts	connection_pool_alerts_alert_type_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
dface51c-3ca6-4014-916d-ef5735a24811	public	system_alerts	system_alerts_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
47c52019-9664-4f47-bd9f-31e265f0a485	public	system_alerts	idx_system_alerts_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
bbd93671-5c2b-42f8-a6d4-696c4612322c	public	system_alerts	idx_system_alerts_severity	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
6a3473bb-27fb-4464-aa86-0e1ab14fb49a	public	system_alerts	idx_system_alerts_created	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
66f34a78-0a25-423c-94cd-227dfe3a828d	public	si004_connection_pool_metrics	si004_connection_pool_metrics_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
970e1ee8-f7f5-4c30-9c4c-305108253b01	public	si004_connection_pool_alerts	si004_connection_pool_alerts_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
862819c6-60db-42af-9f05-0b1a3893211c	public	si004_connection_leak_detection	si004_connection_leak_detection_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
3827d204-cd40-41d6-9e60-7bf32a3c30d0	public	index_usage_analytics	idx_index_usage_table	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
030f9942-7686-423e-a6e9-edbe22472e6f	public	index_usage_analytics	idx_index_usage_name	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
39db1c7c-c46c-4cfe-9084-7c4d7b179677	public	index_usage_analytics	idx_index_usage_efficiency	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
3dabdd9b-beec-4ae1-a2c4-a18a48b33ec3	public	index_usage_analytics	idx_index_usage_frequency	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
da0cb96d-4a58-4210-923d-c46cdc1f099a	public	slow_query_log	slow_query_log_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
f3f5ce4c-253c-4f49-b753-07ded3e9268c	public	slow_query_log	idx_slow_query_hash	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e1c3807e-ba3f-4194-89b5-ee822361d643	public	slow_query_log	idx_slow_query_execution_time	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e800e3ba-9991-468c-a0fc-202974596efd	public	slow_query_log	idx_slow_query_severity	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
5476e1a4-9fff-4656-ae7d-8d6c821526d8	public	generated_domains	idx_generated_domains_campaign_created	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
5e63df5f-dc69-481f-a339-e57f69981bb9	public	generated_domains	idx_generated_domains_domain_name_tld	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
64981047-4073-4d5c-bb18-2d8eb0ef6084	public	generated_domains	idx_generated_domains_keyword_search	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
073e6ecc-a221-4b6e-aa5d-31227d329eec	public	generated_domains	idx_generated_domains_offset_index	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
ed795fc4-21fa-4d0a-af51-0de6cb1ad371	public	campaigns	idx_campaigns_status_type_created	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
dd020d9a-22da-45d2-8f18-f01334d02ec8	public	campaigns	idx_campaigns_user_active	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
f11f3ead-88c3-469a-b57a-2875feb6ce74	public	campaigns	idx_campaigns_progress_tracking	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
6fcb86c8-5fc4-4e0c-b8e7-a9a1285ab51e	public	audit_logs	idx_audit_logs_entity_action_timestamp	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
1a652a5e-b13b-4cc5-ba18-89f476d53935	public	index_usage_analytics	unique_index_analytics	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
a2708292-6cb2-40cc-9ec7-08d692ce13d5	public	response_time_metrics	response_time_metrics_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
50438a1e-c583-446e-a7f1-77433210d6d2	public	response_optimization_recommendations	response_optimization_recommendations_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
5e6080c1-38b0-4b23-8952-7e92bcb50b43	public	dns_validation_results	dns_validation_results_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
83e61d45-8dee-496e-9a47-d3eefccdee24	public	memory_metrics	idx_memory_metrics_state	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
4c8eb109-8974-4cb6-bcbb-79335d7fcf08	public	memory_metrics	idx_memory_metrics_utilization	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e2a6d9a6-4e85-4a67-aebc-3f3296230984	public	memory_allocations	memory_allocations_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
24e89657-e20e-4ba5-832a-4d25c9772cf2	public	memory_allocations	idx_memory_allocations_operation	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
cd7d8e03-0020-425b-988f-af89d53f957d	public	memory_allocations	idx_memory_allocations_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
8f6203b7-6d28-419f-847d-a24be495793e	public	memory_allocations	idx_memory_allocations_campaign	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
87c09e0e-c2cd-4360-b2da-76ebd3c17e46	public	memory_allocations	idx_memory_allocations_created	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
ccf56391-c2ed-4018-9190-4c697cbc5c20	public	memory_allocations	idx_memory_allocations_leaked	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
3e71486c-eb6b-4eea-b763-3ca37b9e48b6	public	memory_leak_detection	memory_leak_detection_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
27522684-ab14-424f-895f-ac02b153e0ca	public	memory_leak_detection	idx_memory_leak_service	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
4d42c8e7-60a6-42f5-9237-3f197495e067	public	memory_leak_detection	idx_memory_leak_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
6db3a683-9849-4706-a90c-899f3dc7956c	public	memory_leak_detection	idx_memory_leak_severity	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
b48c4835-e36a-4837-bb5f-8bf2dca11941	public	memory_leak_detection	idx_memory_leak_resolved	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
f4892533-5dde-4d99-b528-cb2c8e80c213	public	memory_leak_detection	idx_memory_leak_detected	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
9df53327-23bf-4ff2-9203-16ea8fd3d7a4	public	memory_optimization_recommendations	memory_optimization_recommendations_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
efcd390f-f043-46c3-8732-bfbf466e5c99	auth	users	users_email_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
c102b1cc-da96-4bfe-9065-ea2090ac9f33	public	memory_optimization_recommendations	idx_memory_optimization_priority	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
f3d06e66-a716-49e5-98cd-7be2addcfba3	public	memory_optimization_recommendations	idx_memory_optimization_implemented	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
39eaf292-db33-495a-b514-0b8385cb9ed2	public	async_task_status	async_task_status_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
869cf9dc-1a2b-4887-923f-08a9b6586b75	public	async_task_status	async_task_status_task_id_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
3a16b055-a15f-43df-ab29-6ef9084433cf	public	response_time_metrics	idx_response_metrics_endpoint_time	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
c3993824-b2dd-4fc4-8f1a-02eca648f908	public	response_time_metrics	idx_response_metrics_slow_requests	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
eca186fc-61af-408e-a622-22f7a579f5d6	public	response_time_metrics	idx_response_metrics_user_endpoint	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
191056b2-71a7-48c4-a086-5edfc1a73a89	public	response_time_metrics	idx_response_metrics_campaign	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
4e72528d-2a3a-4119-a478-78ac9edc3a32	public	response_optimization_recommendations	idx_response_optimization_endpoint	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
23f1eb80-f725-4e82-a2e5-b7913d4397e8	public	response_optimization_recommendations	idx_response_optimization_priority	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
abd603e5-bff2-433b-840d-3becdd363a8e	public	async_task_status	idx_async_task_status_user	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
ee40cc55-7113-444b-ab5d-fe6f6aff004a	public	async_task_status	idx_async_task_status_task_id	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
8683df12-a118-4612-8e55-121883936047	auth	sessions	sessions_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
37796167-4d88-48ab-8150-1ebce28441bc	public	dns_validation_results	idx_dns_results_domain_name	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
61259187-1bfa-4af2-8d56-b2cf7cc49353	public	dns_validation_results	idx_dns_results_status	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
480d2554-7c4c-4938-9469-a5495891984b	public	keyword_sets	keyword_sets_name_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
7e7bbf9b-547d-49e0-8027-921e73057d8e	public	proxies	proxies_address_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
dc18f422-5073-40a8-a00a-cd832dacc542	public	proxies	idx_proxies_is_enabled	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
931c06c3-ed56-4610-bd16-062d7be265f0	public	http_keyword_results	http_keyword_results_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
3fa94e13-f71c-45f2-9142-063731a0015e	public	http_keyword_results	uq_http_results_campaign_domain	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
c4b7e115-a15c-42bf-a6fb-bccf2d039b23	public	http_keyword_results	idx_http_results_domain_name	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
17bed6c6-cfe2-4711-b87f-96b102ce565a	public	http_keyword_results	idx_http_results_status	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
d5f688bd-d06a-4e91-aebe-8e242619612a	public	campaign_jobs	idx_campaign_jobs_status_scheduled_at	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
5a6382f4-b967-4e91-b840-91f46b13485d	public	generated_domains	idx_generated_domains_name	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
8eaf2277-23b0-4f90-bbbd-4c8fc7e0cd52	public	proxy_pools	proxy_pools_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
55e25628-ad98-49e5-91d0-8dee17149acd	public	proxy_pools	proxy_pools_name_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
d36bbdae-9b64-41cb-9d37-be70d5051a7d	public	proxy_pool_memberships	proxy_pool_memberships_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
68c039d5-6342-464a-9fe2-d417634b779c	public	keyword_rules	keyword_rules_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
aed1e237-709f-4f94-adb4-b85068e3243e	public	proxy_pools	idx_proxy_pools_enabled	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
a04ade18-4ea3-4248-bed0-67a206e0353f	public	proxies	idx_proxies_enabled	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
9fdd9474-f16a-493a-9e4f-829a473ea12c	public	proxies	idx_proxies_healthy	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
1bf18a37-dd4d-41a4-ad6c-4eed1c988624	public	proxy_pool_memberships	idx_proxy_pool_memberships_pool	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
51b635ba-ff9e-419d-9ef9-a94725390f53	public	keyword_rules	idx_keyword_rules_keyword_set	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
05b57777-18af-436f-9433-4c42872a8825	public	keyword_rules	idx_keyword_rules_type	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e631a474-a915-4a4c-aabf-c41881244994	public	campaigns	idx_campaigns_status_updated	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
41c20702-c4c2-43b9-8a84-1c18303cfaef	public	campaign_jobs	idx_campaign_jobs_status_next_execution	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
b2ea105c-ec84-45d5-907e-6c2d9fc7d5fd	public	schema_migrations_old	schema_migrations_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
4461ef64-00d0-47d7-bc66-a59983e36ac3	public	campaign_state_events	idx_campaign_state_events_processing_status	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
80796c50-380a-4ec8-a94f-31db21085c6b	public	campaign_state_events	idx_campaign_state_events_correlation	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
a0d6532b-fd48-47c7-8b8f-e0a0d74c2338	public	generated_domains	uq_generated_domains_campaign_name	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
7d2cf39f-8e9d-486d-8071-c767893542ce	public	campaign_state_transitions	idx_campaign_state_transitions_invalid	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
9dc427ed-7c5f-4727-b6d7-e169913669c7	public	generated_domains	generated_domains_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
1755bc5a-4b04-4467-9d97-b3fb7eca04da	public	config_locks	idx_config_locks_owner	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
032a1ea2-2c21-4322-b4b4-783b93ffc629	public	config_locks	idx_config_locks_expires	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
184815e8-62e3-415d-9d4c-73713499cb7e	public	config_versions	config_versions_pkey	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
856beefc-8501-4971-9570-478061752f66	public	config_versions	config_versions_config_hash_version_key	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
9c71daae-3489-42ee-8423-734567c5903e	public	config_versions	idx_config_versions_hash	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
cb9126f8-27d3-4157-b892-1b1811e2bc17	public	config_versions	idx_config_versions_version	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
0dcfee7a-a5f4-433e-b2df-60c8b9972059	public	audit_logs	idx_audit_logs_security_level	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
0f3aa9fe-c443-4b2a-a91d-634e6fead906	public	audit_logs	idx_audit_logs_access_decision	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
fcb3732d-ac00-4291-8d70-79269159a5bc	public	audit_logs	idx_audit_logs_permissions	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
4855a8df-6204-4db6-b547-d31b739ad365	public	campaigns	idx_campaigns_large_numeric_values	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
8f7cae90-41ce-47a0-bb0c-644bd9023489	public	campaigns	idx_campaigns_total_items	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
e76c702a-5fb0-4968-8504-c483dee5ebc6	public	campaigns	idx_campaigns_processed_items	btree	0	0	0	0	0	0	0.00	\N	unused	Consider dropping unused index	2025-06-23 00:56:17.020912+00
\.


--
-- Data for Name: input_validation_rules; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.input_validation_rules (id, endpoint_pattern, http_method, field_name, validation_type, validation_config, error_message, is_required, created_at, updated_at) FROM stdin;
e5f45cf2-0e49-4473-80d1-ba687df92688	/api/campaigns	POST	name	string_length	{"max_length": 100, "min_length": 3}	Campaign name must be between 3 and 100 characters	t	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
9d73841e-982c-42e1-b97e-19d183689dc6	/api/campaigns	POST	campaignType	enum	{"allowed_values": ["domain_generation", "dns_validation", "http_keyword_validation"]}	Invalid campaign type	t	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
6b4f331a-8deb-477e-8abb-a0bebce23504	/api/campaigns	POST	description	string_length	{"max_length": 1000, "min_length": 0}	Description cannot exceed 1000 characters	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
17c70f3e-ac95-44f9-bd3b-3cb2bd7b472c	/api/campaigns/:id	PUT	name	string_length	{"max_length": 100, "min_length": 3}	Campaign name must be between 3 and 100 characters	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
19cde86a-56fa-41bd-8758-210e953bd87a	/api/campaigns/:id	PUT	status	enum	{"allowed_values": ["pending", "queued", "running", "pausing", "paused", "completed", "failed", "archived", "cancelled"]}	Invalid campaign status	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
23022951-71e3-4d99-97ef-8219a34f813c	/api/campaigns	POST	numDomainsToGenerate	integer_range	{"max": 100000, "min": 1}	Domains to generate must be between 1 and 100,000	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
12ef67f3-a55b-49d6-9567-9b017f01ae59	/api/campaigns	POST	variableLength	integer_range	{"max": 20, "min": 1}	Variable length must be between 1 and 20	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
504457df-310b-40bc-8a4f-bf54246b3fe1	/api/campaigns	POST	characterSet	string_length	{"max_length": 100, "min_length": 1}	Character set must be between 1 and 100 characters	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
0d6061b0-446e-4447-9343-b95d70094d14	/api/campaigns	POST	constantString	string_length	{"max_length": 50, "min_length": 1}	Constant string must be between 1 and 50 characters	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
bf14e53b-b0c4-482e-986e-064370ffd1ad	/api/campaigns	POST	tld	string_length	{"max_length": 10, "min_length": 2}	TLD must be between 2 and 10 characters	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
ec4dd9da-cb2c-4d99-8eed-85181844260f	/api/personas	POST	name	string_length	{"max_length": 50, "min_length": 3}	Persona name must be between 3 and 50 characters	t	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
7d3dab7d-cec2-437a-a762-3ba7b507fb8e	/api/admin/users/:id	PUT	role	enum	{"allowed_values": ["user", "admin"]}	Role must be user or admin	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
f4a2e210-f95d-4b94-a44a-cae34786a44c	/api/admin/users/:id	PUT	isActive	boolean	{}	isActive must be boolean	f	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
7e3cdb58-b257-48f3-8839-f7c96be6377c	/api/proxies	POST	host	string_length	{"max_length": 255, "min_length": 1}	Proxy host must be between 1 and 255 characters	t	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
55dbc586-56c0-43ac-b1c4-8a184c1c4f13	/api/proxies	POST	port	integer_range	{"max": 65535, "min": 1}	Proxy port must be between 1 and 65535	t	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
e02b9dda-72a0-48b7-b38d-f9c76d488e03	/api/keywords	POST	name	string_length	{"max_length": 100, "min_length": 1}	Keyword name must be between 1 and 100 characters	t	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
8a5318fb-3c8b-4b0b-af60-a00c9e67d7f6	/api/keywords	POST	keywords	array_validation	{"item_type": "string", "max_items": 1000, "min_items": 1}	Keywords must be array of 1-1000 strings	t	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
618dac57-3706-4fa0-93d8-e2ce23771cf0	/api/personas	POST	personaType	enum	{"allowed_values": ["dns", "http"]}	Persona type must be dns or http	t	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
d8463e00-f7b1-4477-819c-3cf1442438d3	/api/personas	POST	configDetails	json_schema	{"schema": "persona_config"}	Invalid persona configuration	t	2025-06-22 20:42:12.532521+00	2025-06-22 20:42:12.532521+00
5c76e300-68a6-4b16-8eda-503098d02059	/api/campaigns	POST	domainGenerationParams	json_schema	{"schema": "domain_generation_params"}	Invalid domain generation parameters	f	2025-06-22 21:15:05.81686+00	2025-06-22 21:15:05.81686+00
8b0098ae-a6e2-4fd0-a9e1-447f67eba484	/api/campaigns	POST	dnsValidationParams	json_schema	{"schema": "dns_validation_params"}	Invalid DNS validation parameters	f	2025-06-22 21:15:05.81686+00	2025-06-22 21:15:05.81686+00
16a9f383-03d6-4c4e-b747-9325c5118c5a	/api/campaigns	POST	httpKeywordParams	json_schema	{"schema": "http_keyword_params"}	Invalid HTTP keyword parameters	f	2025-06-22 21:15:05.81686+00	2025-06-22 21:15:05.81686+00
46aac7c9-e7d7-4c5b-93da-84e2f5bbdff8	/api/admin/roles	POST	name	string_length	{"max_length": 50, "min_length": 3}	Role name must be between 3 and 50 characters	t	2025-06-22 21:15:05.81686+00	2025-06-22 21:15:05.81686+00
89ba58e1-af23-47b7-a14f-a0bce36e6f1c	/api/admin/roles	PUT	name	string_length	{"max_length": 50, "min_length": 3}	Role name must be between 3 and 50 characters	f	2025-06-22 21:15:05.81686+00	2025-06-22 21:15:05.81686+00
26a3abfd-087b-4136-abc9-1926bd40c4e1	/api/admin/users	POST	email	string_length	{"max_length": 255, "min_length": 5}	Email must be between 5 and 255 characters	t	2025-06-22 21:15:05.81686+00	2025-06-22 21:15:05.81686+00
0307e17e-031d-4624-aff0-e8dfc5c973e6	/api/admin/users	POST	username	string_length	{"max_length": 50, "min_length": 3}	Username must be between 3 and 50 characters	t	2025-06-22 21:15:05.81686+00	2025-06-22 21:15:05.81686+00
8385e719-d1ee-44e7-8bcc-b45fabf1f2de	/api/admin/users	POST	role	enum	{"allowed_values": ["user", "admin"]}	Role must be user or admin	f	2025-06-22 21:15:05.81686+00	2025-06-22 21:15:05.81686+00
\.


--
-- Data for Name: input_validation_violations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.input_validation_violations (id, user_id, session_id, endpoint_pattern, http_method, field_name, violation_type, provided_value, expected_format, validation_rule, error_message, source_ip, user_agent, request_id, created_at) FROM stdin;
1fc1d985-6b9c-4212-847c-6ca36553f302	\N	\N	/api/campaigns	POST	name	required_field_missing	\N	Field is required	\N	Campaign name must be between 3 and 100 characters	192.0.2.1	\N	57777f40-a72b-40c3-af74-f8c786827d28	2025-06-22 21:07:55.449313+00
090810ab-aed0-46f1-81ba-40ffb5b38c0b	\N	\N	/api/campaigns	POST	name	required_field_missing	\N	Field is required	\N	Campaign name must be between 3 and 100 characters	192.0.2.1	\N	5fcc9e66-7a02-4eda-8c1f-8bc4c72d5157	2025-06-22 21:11:31.855531+00
90748e9e-2f04-4dec-908d-79101c5f11d7	\N	\N	/api/campaigns	POST	name	required_field_missing	\N	Field is required	\N	Campaign name must be between 3 and 100 characters	192.0.2.1	\N	d27bba88-1f95-4e29-961c-dc92274443bf	2025-06-22 21:17:44.009159+00
01317ffc-79cb-45df-be97-4965aed11f69	\N	\N	/api/campaigns	POST	name	required_field_missing	\N	Field is required	\N	Campaign name must be between 3 and 100 characters	192.0.2.1	\N	39e42dc0-23b0-49b3-9fa1-af811d15cf56	2025-06-22 21:20:21.630497+00
634c972e-36e3-4da5-9795-da32706fd6d7	\N	\N	/api/campaigns	POST	name	required_field_missing	\N	Field is required	\N	Campaign name must be between 3 and 100 characters	192.0.2.1	\N	eeecd0b4-b4a2-4b3c-8bd1-b8c84d8280ce	2025-06-22 21:24:05.637071+00
8f8a7b6e-d866-4774-b3ad-964441f42d4f	\N	\N	/api/campaigns	POST	name	required_field_missing	\N	Field is required	\N	Campaign name must be between 3 and 100 characters	192.0.2.1	\N	8c0df49c-3a01-44e2-bae0-4a9a94ed10d6	2025-06-22 21:27:37.611993+00
\.


--
-- Data for Name: keyword_rules; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.keyword_rules (id, keyword_set_id, pattern, rule_type, is_case_sensitive, category, context_chars, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: keyword_sets; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.keyword_sets (id, name, description, rules, is_enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: memory_allocations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.memory_allocations (id, operation_id, operation_type, campaign_id, allocated_bytes, peak_bytes, duration_ms, allocation_pattern, cleanup_successful, memory_leaked_bytes, created_at, allocation_type, is_active, allocated_at) FROM stdin;
0e58b97b-257e-4edf-9185-ed300ffcd40f	79ef8c76-b763-4fb2-9955-2133b4ba4ba3	domain_generation	17dcce9a-1c86-4fdc-b181-3f7820820187	1980112	1916928	251	{"gc_count": 2, "goroutines": 5, "heap_alloc": 549112, "heap_inuse": 1916928, "stack_inuse": 753664}	t	0	2025-06-22 22:41:28.519638+00	unknown	t	2025-06-23 10:03:10.003657+00
434a4ef8-f71f-423e-981d-012ad18f3bef	8a0dba43-2605-42fd-8641-b13c21eec337	domain_generation	7e591cbd-a89a-4266-a94b-9ef08e8bf195	1993600	1859584	126	{"gc_count": 2, "goroutines": 5, "heap_alloc": 528728, "heap_inuse": 1859584, "stack_inuse": 688128}	t	0	2025-06-22 22:49:46.972887+00	unknown	t	2025-06-23 10:03:10.003657+00
532efa63-33fe-4e50-b140-c06dfb8670e1	019579d1-6961-43c9-b1ae-e6e6eaa24781	domain_generation	72d2e089-226f-4a93-a665-825d2f796416	1920512	1843200	234	{"gc_count": 2, "goroutines": 5, "heap_alloc": 514096, "heap_inuse": 1843200, "stack_inuse": 688128}	t	0	2025-06-22 22:52:21.535063+00	unknown	t	2025-06-23 10:03:10.003657+00
eeb9cc01-704a-46a1-9130-4f998746b712	6e8d736f-1ab1-4b3d-85c0-8afbabd1e74b	domain_generation	5d88a950-f813-4192-983a-23bda23b5bb4	1935712	1875968	314	{"gc_count": 2, "goroutines": 5, "heap_alloc": 527872, "heap_inuse": 1875968, "stack_inuse": 753664}	t	0	2025-06-22 22:52:45.554601+00	unknown	t	2025-06-23 10:03:10.003657+00
ad90d034-59e9-4865-a0e1-d165a51e4b54	dfdaab01-c45f-4f49-a2c3-0aa2c256200c	domain_generation	d8047ce1-0c14-450d-935f-56f4e8718c74	1982104	1949696	178	{"gc_count": 2, "goroutines": 5, "heap_alloc": 529288, "heap_inuse": 1949696, "stack_inuse": 688128}	t	0	2025-06-22 22:52:59.670272+00	unknown	t	2025-06-23 10:03:10.003657+00
51b45058-c1b7-4877-b021-bb0123ac6810	63c7cdc1-1f04-447f-9d13-0378b70657f6	domain_generation	f4ef6551-9ece-41fd-b0f2-50e4de420436	3437064	1933312	223	{"gc_count": 5, "goroutines": 5, "heap_alloc": 588296, "heap_inuse": 1933312, "stack_inuse": 1114112}	t	0	2025-06-22 22:56:53.712388+00	unknown	t	2025-06-23 10:03:10.003657+00
2e7177bd-dad2-4baf-9dc3-3e0ddd0d7438	0a5fbd79-bf1b-4efe-8f5e-ea36f607e3ca	domain_generation	edfb0a3e-c587-40a7-aacb-03284e6f26cb	3330528	1900544	136	{"gc_count": 5, "goroutines": 5, "heap_alloc": 573856, "heap_inuse": 1900544, "stack_inuse": 983040}	t	0	2025-06-22 22:57:02.333692+00	unknown	t	2025-06-23 10:03:10.003657+00
36b46532-e608-4a26-98a1-ee101d1738ba	f22a8c48-6dad-491a-ac35-3c0b266b1017	domain_generation	98350d93-8204-450a-a87c-1ef9d045f47b	3412928	1794048	192	{"gc_count": 5, "goroutines": 5, "heap_alloc": 570920, "heap_inuse": 1794048, "stack_inuse": 1015808}	t	0	2025-06-22 22:57:31.028336+00	unknown	t	2025-06-23 10:03:10.003657+00
4512150e-2904-4441-a7e0-584fd0c3c52a	25680beb-3875-4a4b-b7fd-2208211d1da9	domain_generation	614abfac-fe74-4193-8eb4-2fa83f7db91c	1537352	1490944	262	{"gc_count": 2, "goroutines": 5, "heap_alloc": 508840, "heap_inuse": 1490944, "stack_inuse": 622592}	t	0	2025-06-22 22:57:39.712666+00	unknown	t	2025-06-23 10:03:10.003657+00
a6782004-0e12-4cbb-83df-09e2fd9e52a7	a022df02-5ddc-4871-b05a-de331186c7d3	domain_generation	4773f47f-a460-4de8-9837-8e2f12e16184	1573496	1597440	198	{"gc_count": 2, "goroutines": 5, "heap_alloc": 508344, "heap_inuse": 1597440, "stack_inuse": 622592}	t	0	2025-06-22 22:58:17.579968+00	unknown	t	2025-06-23 10:03:10.003657+00
eca75e40-ae4c-4b19-bfec-6d9b775f6710	d6d83d48-db3c-4402-9339-bf6b196f46c0	domain_generation	33b6d84c-55de-4979-be5b-7caf1cc31aa1	3315688	1818624	46	{"gc_count": 5, "goroutines": 5, "heap_alloc": 582272, "heap_inuse": 1818624, "stack_inuse": 1114112}	t	0	2025-06-22 22:58:44.004916+00	unknown	t	2025-06-23 10:03:10.003657+00
87a001f3-94b9-4837-8167-2ac86f87b167	b2bf210e-d501-4ec9-82d2-9ecf3c92e761	domain_generation	2a6c4c28-069c-4de2-82e0-9d13fd8d5d4a	3427600	1826816	265	{"gc_count": 5, "goroutines": 5, "heap_alloc": 567344, "heap_inuse": 1826816, "stack_inuse": 1015808}	t	0	2025-06-22 22:59:10.458812+00	unknown	t	2025-06-23 10:03:10.003657+00
5923d23a-7784-4300-b1ab-1bd2013d4013	95e3d98a-35d5-46b6-bdf9-ca3de2431cc5	domain_generation	be456cd1-f431-492d-937b-d7bb9022090f	3454632	1859584	143	{"gc_count": 5, "goroutines": 5, "heap_alloc": 561480, "heap_inuse": 1859584, "stack_inuse": 950272}	t	0	2025-06-22 22:59:18.861665+00	unknown	t	2025-06-23 10:03:10.003657+00
05d437d8-a10e-4415-9e26-fa2ae2123d1e	c5af5ac5-4981-4706-9a34-f62d5ddd9af2	domain_generation	0afe1d1f-ef5b-46e0-ba96-e50531f33c1e	3483576	1818624	225	{"gc_count": 5, "goroutines": 5, "heap_alloc": 574792, "heap_inuse": 1818624, "stack_inuse": 1081344}	t	0	2025-06-22 22:59:27.452227+00	unknown	t	2025-06-23 10:03:10.003657+00
\.


--
-- Data for Name: memory_leak_detection; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.memory_leak_detection (id, service_name, leak_type, leak_source, leaked_bytes, detection_method, stack_trace, operation_context, severity, resolved, resolved_at, detected_at) FROM stdin;
\.


--
-- Data for Name: memory_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.memory_metrics (id, service_name, process_id, heap_size_bytes, heap_used_bytes, heap_free_bytes, gc_count, gc_duration_ms, goroutines_count, stack_size_bytes, memory_utilization_pct, memory_state, recorded_at, component, memory_type, allocated_bytes, used_bytes, available_bytes, allocation_count, deallocation_count, gc_cycles, efficiency_score, metadata) FROM stdin;
4be5b8c6-2903-479f-887b-579dc938896d	test_service_old	test_process_old	1000	800	200	10	50	5	100	80.00	warning	2025-03-23 22:58:44.106141+00	unknown	heap	1000	800	200	0	0	10	0.00	{}
e44c3bed-ea49-4b02-a0b2-568ead8a662f	test_service_old	test_process_old	1000	800	200	10	50	5	100	80.00	warning	2025-03-23 22:56:53.814247+00	unknown	heap	1000	800	200	0	0	10	0.00	{}
30afc166-eba3-4034-b489-6af1bbc986d1	test_service_old	test_process_old	1000	800	200	10	50	5	100	80.00	warning	2025-03-23 22:57:31.071125+00	unknown	heap	1000	800	200	0	0	10	0.00	{}
efdc3120-5335-4793-b049-74ba49b75acf	test_service_old	test_process_old	1000	800	200	10	50	5	100	80.00	warning	2025-03-23 22:59:18.895737+00	unknown	heap	1000	800	200	0	0	10	0.00	{}
3ae984dc-c9e0-4b9d-b0fb-3c1638f92ab8	test_service_old	test_process_old	1000	800	200	10	50	5	100	80.00	warning	2025-03-23 22:59:27.559788+00	unknown	heap	1000	800	200	0	0	10	0.00	{}
5723f946-4f07-4c6f-a189-9ec847613fdb	test_service_old	test_process_old	1000	800	200	10	50	5	100	80.00	warning	2025-03-23 22:58:00.949102+00	unknown	heap	1000	800	200	0	0	10	0.00	{}
e2a0c125-40a7-44ae-8491-ae85805b8b13	test_service_old	test_process_old	1000	800	200	10	50	5	100	80.00	warning	2025-03-23 22:59:10.537122+00	unknown	heap	1000	800	200	0	0	10	0.00	{}
15d33ab4-ab20-4ef3-81be-a14717e4a201	test_service_old	test_process_old	1000	800	200	10	50	5	100	80.00	warning	2025-03-23 22:57:02.452652+00	unknown	heap	1000	800	200	0	0	10	0.00	{}
\.


--
-- Data for Name: memory_optimization_recommendations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.memory_optimization_recommendations (id, recommendation_type, service_name, current_usage_bytes, recommended_limit_bytes, optimization_strategy, estimated_savings_bytes, implementation_priority, implemented, implemented_at, created_at) FROM stdin;
88c09f8f-c32f-47f3-ba41-ce3fbbb6e471	increase_heap_size	test-service	800	1200	{"reason": "consistent_high_utilization", "strategy": "increase_heap_allocation", "current_avg_utilization": 80.00}	0	high	f	\N	2025-06-22 22:46:02.584826+00
083185c5-4528-4115-9cc4-0f2b23849c3f	reduce_heap_size	worker_9	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.698376+00
9639e265-1820-473e-81d3-7fe356b6b6e2	reduce_heap_size	worker_2	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.741371+00
20b6111c-e3f3-444a-86bc-4bacba902d5b	reduce_heap_size	worker_7	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.740581+00
95e13efb-d648-4a8a-b657-026ae8347062	reduce_heap_size	worker_8	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.737101+00
6a35e6b4-8e49-4022-999e-9010bc206022	reduce_heap_size	worker_6	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.745121+00
56881439-1e63-4c3b-a5d2-42a5f42e3f4c	reduce_heap_size	worker_1	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.761041+00
b4e1d115-a69b-4697-83fc-07565115079c	reduce_heap_size	worker_4	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.74338+00
704a0c71-4772-4871-8cc6-3d363927d368	reduce_heap_size	worker_3	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.75919+00
3fece875-7e4f-4eac-adff-d1ede1eedb7e	reduce_heap_size	worker_0	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.777688+00
c4093b0d-b199-4ee5-afd7-4207b3027cdc	reduce_heap_size	worker_5	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:52.777441+00
903e80f0-6b37-4a14-a40c-39048dc60022	increase_heap_size	test_service_old	800	1200	{"reason": "consistent_high_utilization", "strategy": "increase_heap_allocation", "current_avg_utilization": 80.00}	0	high	f	\N	2025-06-22 22:56:53.819647+00
e709f130-ebb6-494a-9096-2a96e04da9ec	increase_heap_size	test_service_recent	1600	2400	{"reason": "consistent_high_utilization", "strategy": "increase_heap_allocation", "current_avg_utilization": 80.00}	0	high	f	\N	2025-06-22 22:56:53.847621+00
f2d183a8-102c-449f-be9a-fde8ccf053ff	reduce_heap_size	perf_test	0	0	{"reason": "consistent_low_utilization", "strategy": "reduce_heap_allocation", "current_avg_utilization": 0.00}	0	medium	f	\N	2025-06-22 22:56:53.890444+00
\.


--
-- Data for Name: memory_pools; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.memory_pools (id, pool_name, service_name, pool_type, max_size, current_size, total_allocations, total_deallocations, hit_rate, miss_rate, efficiency_score, configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: performance_baselines; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.performance_baselines (id, service_name, campaign_type, baseline_date, query_count, avg_query_time_ms, p95_query_time_ms, p99_query_time_ms, slow_query_count, total_cpu_time_ms, total_memory_bytes, database_connections_avg, optimization_phase, notes) FROM stdin;
\.


--
-- Data for Name: performance_optimizations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.performance_optimizations (id, optimization_type, target_service, target_operation, baseline_time_ms, optimized_time_ms, improvement_pct, optimization_technique, applied_at, validation_status) FROM stdin;
\.


--
-- Data for Name: personas; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.personas (id, name, description, persona_type, config_details, is_enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: proxies; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.proxies (id, name, description, address, protocol, username, password_hash, host, port, is_enabled, is_healthy, last_status, last_checked_at, latency_ms, city, country_code, provider, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: proxy_pool_memberships; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.proxy_pool_memberships (pool_id, proxy_id, weight, is_active, added_at) FROM stdin;
\.


--
-- Data for Name: proxy_pools; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.proxy_pools (id, name, description, is_enabled, pool_strategy, health_check_enabled, health_check_interval_seconds, max_retries, timeout_seconds, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: query_optimization_recommendations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.query_optimization_recommendations (id, query_hash, recommendation_type, current_performance_ms, estimated_improvement_pct, optimization_strategy, suggested_indexes, query_rewrite_suggestion, implementation_complexity, implementation_priority, implemented, implemented_at, validation_results, created_at, service_name, status) FROM stdin;
3014ec0c-c213-4778-8db1-0aef28c29ac3		invalid_type	-1.000	25.00	{}	{}	\N	medium	invalid_priority	f	\N	{}	2025-06-22 23:13:01.833659+00	unknown	pending
41808203-0c09-4e67-873f-1506c8e36d5f	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	slow_query_optimization	1700.000	60.00	{"reason": "consistent_slow_performance", "strategy": "index_optimization", "execution_count": 3, "avg_execution_time": 1700.000}	{}	\N	medium	medium	t	2025-06-22 23:13:01.988446+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-22 23:13:01.926605+00	unknown	pending
512c12b6-78d7-425e-bf6f-45bbc855b0f5		invalid_type	-1.000	25.00	{}	{}	\N	medium	invalid_priority	f	\N	{}	2025-06-22 23:19:26.822226+00	unknown	pending
93f81d2c-063c-4280-b918-ec97379dda5d	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	efficiency_optimization	1700.000	40.00	{"reason": "low_efficiency_score", "strategy": "query_rewrite", "execution_count": 3, "optimization_score": 10.20}	{}	\N	medium	medium	t	2025-06-22 23:19:26.929121+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-22 23:13:01.926605+00	unknown	pending
368413d8-c30d-4bcd-89a6-8d182818ff5c	326488b6657b4baefe95db47aacbd1f4734579fda1f814e65d3f2548c2a84697	efficiency_optimization	250.000	40.00	{"reason": "low_efficiency_score", "strategy": "query_rewrite", "execution_count": 3, "optimization_score": 32.50}	{}	\N	medium	medium	f	\N	{}	2025-06-22 23:19:30.017252+00	unknown	pending
067bfd46-e72d-4a5e-b4c1-d758574697b8		invalid_type	-1.000	25.00	{}	{}	\N	medium	invalid_priority	f	\N	{}	2025-06-22 23:24:56.527824+00	unknown	pending
df893b92-52b6-4379-bafa-bf937fefe9d3	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	slow_query_optimization	1700.000	60.00	{"reason": "consistent_slow_performance", "strategy": "index_optimization", "execution_count": 3, "avg_execution_time": 1700.000}	{}	\N	medium	medium	t	2025-06-22 23:24:56.647022+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-22 23:24:56.597787+00	unknown	pending
516423de-516b-4f46-95a5-1d52eb92c072	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-22 23:24:59.726139+00	unknown	pending
83b6fc1f-f228-40c9-8e4f-dd9f6b8cf268		invalid_type	-1.000	25.00	{}	{}	\N	medium	invalid_priority	f	\N	{}	2025-06-22 23:25:14.667507+00	unknown	pending
047d207b-722a-473b-89a5-32ef95d45a95	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	efficiency_optimization	1700.000	40.00	{"reason": "low_efficiency_score", "strategy": "query_rewrite", "execution_count": 3, "optimization_score": 10.20}	{}	\N	medium	medium	t	2025-06-22 23:25:14.795043+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-22 23:24:56.597787+00	unknown	pending
985fc44c-d2bc-405e-86d1-3a56611817cf	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-22 23:25:17.829495+00	unknown	pending
8f149b47-d0c3-4da0-8727-1e74a76e72e0		invalid_type	-1.000	25.00	{}	{}	\N	medium	invalid_priority	f	\N	{}	2025-06-22 23:25:28.642139+00	unknown	pending
ea10e79d-f405-4af8-9d66-25cceb5ca082	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	slow_query_optimization	1700.000	60.00	{"reason": "consistent_slow_performance", "strategy": "index_optimization", "execution_count": 3, "avg_execution_time": 1700.000}	{}	\N	medium	medium	t	2025-06-22 23:25:28.826811+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-22 23:25:28.753144+00	unknown	pending
f07740f0-a2d6-413b-8325-656dba28cad8	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-22 23:25:31.930348+00	unknown	pending
6e9d7747-71b7-4ca8-be50-19291b96c77d	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	efficiency_optimization	1700.000	40.00	{"reason": "low_efficiency_score", "strategy": "query_rewrite", "execution_count": 3, "optimization_score": 10.20}	{}	\N	medium	medium	t	2025-06-22 23:27:23.190225+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-22 23:25:28.753144+00	unknown	pending
0195b789-949c-4d6d-b387-52c62ce52d97	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-22 23:27:26.269335+00	unknown	pending
611a8ffe-7fab-4123-a24e-efbe68ef9195	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	slow_query_optimization	1700.000	60.00	{"reason": "consistent_slow_performance", "strategy": "index_optimization", "execution_count": 3, "avg_execution_time": 1700.000}	{}	\N	medium	medium	t	2025-06-22 23:27:47.46633+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-22 23:27:47.448485+00	unknown	pending
bdd4d55b-845c-41f3-913c-de4c38ec7e26	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-22 23:27:50.575442+00	unknown	pending
d38ff2b1-2809-493b-b841-8504580fa571	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	efficiency_optimization	1700.000	40.00	{"reason": "low_efficiency_score", "strategy": "query_rewrite", "execution_count": 3, "optimization_score": 10.20}	{}	\N	medium	medium	t	2025-06-22 23:29:03.063764+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-22 23:27:47.448485+00	unknown	pending
5c68f99e-e6df-41ab-82ce-4df306557f1f	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-22 23:29:06.14483+00	unknown	pending
1ca87a07-ed2e-4069-abc3-ec4bb1510a04	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	slow_query_optimization	1700.000	60.00	{"reason": "consistent_slow_performance", "strategy": "index_optimization", "execution_count": 3, "avg_execution_time": 1700.000}	{}	\N	medium	medium	t	2025-06-23 00:10:58.151899+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-23 00:10:58.058738+00	unknown	pending
d32c49b0-95d8-4365-b2f6-1b032db96d85	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-23 00:11:01.251886+00	unknown	pending
efa5a596-bba2-40e4-bd0f-bda54edefe4d	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	efficiency_optimization	1700.000	40.00	{"reason": "low_efficiency_score", "strategy": "query_rewrite", "execution_count": 3, "optimization_score": 10.20}	{}	\N	medium	medium	t	2025-06-23 00:12:23.989855+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-23 00:10:58.058738+00	unknown	pending
15a50aba-b298-48e0-87a2-5e617f338fa2	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-23 00:12:27.071153+00	unknown	pending
90fc9c23-5c81-4b3d-bc5c-10ea4f58dba1	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	slow_query_optimization	1700.000	60.00	{"reason": "consistent_slow_performance", "strategy": "index_optimization", "execution_count": 3, "avg_execution_time": 1700.000}	{}	\N	medium	medium	t	2025-06-23 00:21:25.449673+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-23 00:21:25.437533+00	unknown	pending
64f81add-8747-4194-9350-3fb380f8c206	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-23 00:21:28.540453+00	unknown	pending
c95c5883-e1da-4a64-b866-da9612bb241f	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	efficiency_optimization	1700.000	40.00	{"reason": "low_efficiency_score", "strategy": "query_rewrite", "execution_count": 3, "optimization_score": 10.20}	{}	\N	medium	medium	t	2025-06-23 00:24:23.008777+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-23 00:21:25.437533+00	unknown	pending
7bd6bb04-65b4-4cec-b9cc-8f87a6f324b8	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-23 00:24:26.067073+00	unknown	pending
24403b24-33c7-4458-962f-f64f7eca174b	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	slow_query_optimization	1700.000	60.00	{"reason": "consistent_slow_performance", "strategy": "index_optimization", "execution_count": 3, "avg_execution_time": 1700.000}	{}	\N	medium	medium	t	2025-06-23 00:24:47.611646+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-23 00:24:47.515106+00	unknown	pending
30f4b0e2-7d0b-4aec-b361-e5f934dc1b30	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-23 00:24:50.67203+00	unknown	pending
5d3fdc3a-6164-47e4-9710-45d9300e4751	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	efficiency_optimization	1700.000	40.00	{"reason": "low_efficiency_score", "strategy": "query_rewrite", "execution_count": 3, "optimization_score": 10.20}	{}	\N	medium	medium	t	2025-06-23 00:28:16.913333+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-23 00:24:47.515106+00	unknown	pending
479b33fa-4d74-4697-8c3d-7d15ba11a361	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-23 00:28:19.952489+00	unknown	pending
5de88c49-77d4-4e7a-b76a-847efba8fb33	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	efficiency_optimization	1700.000	40.00	{"reason": "low_efficiency_score", "strategy": "query_rewrite", "execution_count": 3, "optimization_score": 10.20}	{}	\N	medium	medium	f	\N	{}	2025-06-23 00:56:17.105305+00	unknown	pending
36a0e60c-278d-4b77-b0e9-829470ec45ea	ebdb1bda8893829872897b4811fb7cf41a9d3a33627f4bc3b485e8183212aed0	slow_query_optimization	1700.000	60.00	{"reason": "consistent_slow_performance", "strategy": "index_optimization", "execution_count": 3, "avg_execution_time": 1700.000}	{}	\N	medium	medium	t	2025-06-23 00:56:17.149394+00	{"status": "implemented", "performance_improvement": "25%"}	2025-06-23 00:56:17.105305+00	unknown	pending
eef44edd-11d0-4cef-bf66-cb1bad50d2ab	82fa0c9721d9c6ed2fe11fa8ecd286e50c63b3fbe4d7c17ff68b7b73ba2d00a1	index_optimization	300.000	50.00	{"type": "index_optimization", "reason": "missing_index_on_user_id"}	{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"}	\N	low	medium	f	\N	{}	2025-06-23 00:56:20.229099+00	unknown	pending
\.


--
-- Data for Name: query_performance_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.query_performance_metrics (id, query_hash, query_sql, query_type, table_names, execution_time_ms, rows_examined, rows_returned, index_usage, cpu_time_ms, io_wait_ms, lock_wait_ms, buffer_reads, buffer_hits, query_plan, optimization_score, executed_at, service_name, campaign_id, campaign_type, memory_used_bytes, optimization_applied, optimization_suggestions, user_id, performance_category, needs_optimization) FROM stdin;
\.


--
-- Data for Name: resource_locks; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.resource_locks (lock_id, resource_type, resource_id, lock_holder, lock_mode, acquired_at, expires_at, renewal_count, context) FROM stdin;
\.


--
-- Data for Name: resource_optimization_actions; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.resource_optimization_actions (id, service_name, campaign_type, campaign_id, action_type, resource_type, action_description, before_metrics, after_metrics, improvement_pct, success, error_message, triggered_by, executed_at) FROM stdin;
\.


--
-- Data for Name: resource_utilization_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.resource_utilization_metrics (id, service_name, resource_type, current_usage, max_capacity, utilization_pct, efficiency_score, bottleneck_detected, recorded_at, campaign_type, campaign_id, component, optimization_applied) FROM stdin;
\.


--
-- Data for Name: response_optimization_recommendations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.response_optimization_recommendations (id, endpoint_path, current_avg_response_ms, target_response_ms, optimization_strategies, priority, implemented, implementation_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: response_time_history; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.response_time_history (id, service_name, campaign_type, measurement_window, window_start, window_end, request_count, avg_response_time_ms, p50_response_time_ms, p95_response_time_ms, p99_response_time_ms, max_response_time_ms, error_rate_pct, cache_hit_rate_pct, optimization_score, sla_violations, recorded_at) FROM stdin;
\.


--
-- Data for Name: response_time_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.response_time_metrics (id, endpoint_path, http_method, response_time_ms, payload_size_bytes, user_id, campaign_id, status_code, recorded_at, service_name, campaign_type, performance_category, cache_hit) FROM stdin;
\.


--
-- Data for Name: response_time_targets; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.response_time_targets (id, service_name, endpoint_pattern, campaign_type, target_p50_ms, target_p95_ms, target_p99_ms, sla_threshold_ms, alert_threshold_ms, optimization_priority, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.schema_migrations (version, dirty) FROM stdin;
3	f
4	f
5	f
6	f
18	f
19	f
20	f
21	f
22	f
23	f
24	f
\.


--
-- Data for Name: schema_migrations_old; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.schema_migrations_old (version, applied_at, rolled_back_at, description) FROM stdin;
001_critical_int64_fields	2025-06-20 13:09:39.992008+00	\N	Ensure all int64 fields are BIGINT to prevent numeric overflow
002_missing_required_columns	2025-06-20 13:09:46.383855+00	\N	Add missing required columns for domain generation, HTTP keywords, and user management
003_enum_constraints_alignment	2025-06-20 13:09:55.608537+00	\N	Align enum constraints with Go backend, fix case sensitivity issues
004_naming_convention_fixes	2025-06-20 13:10:05.068097+00	\N	Standardize all column names to snake_case convention
cv007_campaign_bigint_fix	2025-06-20 13:10:23.40532+00	\N	CV-007: Verified all campaign counter columns are BIGINT (no changes needed)
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.security_events (id, event_type, user_id, session_id, campaign_id, resource_type, resource_id, action_attempted, authorization_result, denial_reason, risk_score, source_ip, user_agent, request_context, audit_log_id, created_at) FROM stdin;
\.


--
-- Data for Name: service_architecture_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.service_architecture_metrics (id, service_name, architecture_pattern, interface_type, dependency_count, coupling_score, deployment_complexity_score, last_refactor_date, performance_impact, error_rate, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_capacity_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.service_capacity_metrics (id, service_name, cpu_utilization, memory_utilization, instance_count, recorded_at) FROM stdin;
\.


--
-- Data for Name: service_dependencies; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.service_dependencies (id, source_service, target_service, dependency_type, interface_contract, reliability_score, latency_p95, failure_count, last_success, created_at) FROM stdin;
\.


--
-- Data for Name: si004_connection_leak_detection; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.si004_connection_leak_detection (id, "timestamp", connection_id, duration_ms, stack_trace, query_info) FROM stdin;
1	2025-06-22 21:43:03.804998+00	36a705e4-c038-4c29-a4d2-bd3788b9e8de	25005	goroutine 50 [running]:\ngithub.com/fntelecomllc/studio/backend/internal/monitoring.(*ConnectionLeakDetector).TrackConnection(0xc000266f00, {0xc0001ae060, 0x24}, {0xcbcaa3, 0xf})\n\t/home/vboxuser/studio/backend/internal/monitoring/connection_leak_detector.go:127 +0xab\ngithub.com/fntelecomllc/studio/backend/tests.testConnectionLeakDetection(0xc0001d8000, 0xc000266f00, 0x4af96f?)\n\t/home/vboxuser/studio/backend/tests/si004_connection_pool_test.go:96 +0xd4\ngithub.com/fntelecomllc/studio/backend/tests.TestSI004ConnectionPoolMonitoring.func3(0xc0001d8000?)\n\t/home/vboxuser/studio/backend/tests/si004_connection_pool_test.go:52 +0x1b\ntesting.tRunner(0xc0001d8000, 0xc0001a00d8)\n\t/home/vboxuser/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.23.4.linux-amd64/src/testing/testing.go:1690 +0xf4\ncreated by testing.(*T).Run in goroutine 36\n\t/home/vboxuser/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.23.4.linux-amd64/src/testing/testing.go:1743 +0x390\n	test_leak_query
2	2025-06-22 21:44:07.027011+00	test_conn_123	600000	test stack trace	SELECT * FROM test
3	2025-06-22 21:47:56.153286+00	ecd7f1a3-8ffa-4934-9d10-bbf4f08652ca	24991	goroutine 10 [running]:\ngithub.com/fntelecomllc/studio/backend/internal/monitoring.(*ConnectionLeakDetector).TrackConnection(0xc0002a40a0, {0xc00003eab0, 0x24}, {0xcbdaa3, 0xf})\n\t/home/vboxuser/studio/backend/internal/monitoring/connection_leak_detector.go:127 +0xab\ngithub.com/fntelecomllc/studio/backend/tests.testConnectionLeakDetection(0xc0000e36c0, 0xc0002a40a0, 0x4af96f?)\n\t/home/vboxuser/studio/backend/tests/si004_connection_pool_test.go:96 +0xd4\ngithub.com/fntelecomllc/studio/backend/tests.TestSI004ConnectionPoolMonitoring.func3(0xc0000e36c0?)\n\t/home/vboxuser/studio/backend/tests/si004_connection_pool_test.go:52 +0x1b\ntesting.tRunner(0xc0000e36c0, 0xc000012f78)\n\t/home/vboxuser/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.23.4.linux-amd64/src/testing/testing.go:1690 +0xf4\ncreated by testing.(*T).Run in goroutine 5\n\t/home/vboxuser/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.23.4.linux-amd64/src/testing/testing.go:1743 +0x390\n	test_leak_query
4	2025-06-22 21:50:12.189912+00	test_conn_123	600000	test stack trace	SELECT * FROM test
5	2025-06-22 21:51:52.027738+00	a8647974-5993-4bbb-857a-6eb79c4c7262	24993	goroutine 147 [running]:\ngithub.com/fntelecomllc/studio/backend/internal/monitoring.(*ConnectionLeakDetector).TrackConnection(0xc0000e46e0, {0xc000410180, 0x24}, {0x11cbeac, 0xf})\n\t/home/vboxuser/studio/backend/internal/monitoring/connection_leak_detector.go:127 +0xff\ngithub.com/fntelecomllc/studio/backend/tests.testConnectionLeakDetection(0xc000478340, 0xc0000e46e0, 0x0?)\n\t/home/vboxuser/studio/backend/tests/si004_connection_pool_test.go:96 +0xe5\ngithub.com/fntelecomllc/studio/backend/tests.TestSI004ConnectionPoolMonitoring.func3(0xc000478340)\n\t/home/vboxuser/studio/backend/tests/si004_connection_pool_test.go:52 +0x45\ntesting.tRunner(0xc000478340, 0xc0000138f0)\n\t/home/vboxuser/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.23.4.linux-amd64/src/testing/testing.go:1690 +0x227\ncreated by testing.(*T).Run in goroutine 121\n\t/home/vboxuser/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.23.4.linux-amd64/src/testing/testing.go:1743 +0x826\n	test_leak_query
6	2025-06-22 22:00:01.927834+00	db743072-eb76-48d3-9163-700c22686b95	25004	goroutine 50 [running]:\ngithub.com/fntelecomllc/studio/backend/internal/monitoring.(*ConnectionLeakDetector).TrackConnection(0xc00019c0a0, {0xc00021e060, 0x24}, {0x7588be, 0xf})\n\t/home/vboxuser/studio/backend/internal/monitoring/connection_leak_detector.go:127 +0xab\ncommand-line-arguments.testConnectionLeakDetection(0xc000248000, 0xc00019c0a0, 0x49da8f?)\n\t/home/vboxuser/studio/backend/tests/si004_connection_pool_test.go:96 +0xd4\ncommand-line-arguments.TestSI004ConnectionPoolMonitoring.func3(0xc000248000?)\n\t/home/vboxuser/studio/backend/tests/si004_connection_pool_test.go:52 +0x1b\ntesting.tRunner(0xc000248000, 0xc000202a38)\n\t/home/vboxuser/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.23.4.linux-amd64/src/testing/testing.go:1690 +0xf4\ncreated by testing.(*T).Run in goroutine 22\n\t/home/vboxuser/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.23.4.linux-amd64/src/testing/testing.go:1743 +0x390\n	test_leak_query
7	2025-06-22 22:02:19.349855+00	test_conn_123	600000	test stack trace	SELECT * FROM test
\.


--
-- Data for Name: si004_connection_pool_alerts; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.si004_connection_pool_alerts (id, "timestamp", alert_level, alert_message, utilization_percent, wait_duration_ms, open_connections, in_use_connections) FROM stdin;
1	2025-06-22 21:44:07.001041+00	WARNING	Test alert	85.00	1000	40	35
2	2025-06-22 21:49:26.157826+00	WARNING	Connection pool utilization high	85.00	0	85	85
3	2025-06-22 21:49:36.157728+00	WARNING	Connection pool utilization high	85.00	0	86	85
4	2025-06-22 21:49:46.161742+00	WARNING	Connection pool utilization high	85.00	0	86	85
5	2025-06-22 21:49:56.162354+00	WARNING	Connection pool utilization high	85.00	0	86	85
6	2025-06-22 21:50:12.181571+00	WARNING	Test alert	85.00	1000	40	35
7	2025-06-22 21:53:22.02726+00	WARNING	Connection pool utilization high	85.00	0	85	85
8	2025-06-22 21:53:32.029943+00	WARNING	Connection pool utilization high	85.00	0	86	85
9	2025-06-22 21:53:42.034307+00	WARNING	Connection pool utilization high	85.00	0	86	85
10	2025-06-22 22:01:31.923787+00	WARNING	Connection pool utilization high	85.00	0	85	85
11	2025-06-22 22:01:41.915591+00	WARNING	Connection pool utilization high	85.00	0	86	85
12	2025-06-22 22:01:51.931589+00	WARNING	Connection pool utilization high	85.00	0	86	85
13	2025-06-22 22:02:01.923237+00	WARNING	Connection pool utilization high	85.00	0	86	85
14	2025-06-22 22:02:19.339137+00	WARNING	Test alert	85.00	1000	40	35
\.


--
-- Data for Name: si004_connection_pool_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.si004_connection_pool_metrics (id, "timestamp", max_open_connections, open_connections, in_use_connections, idle_connections, wait_count, wait_duration_ms, max_idle_closed, max_idle_time_closed, max_lifetime_closed, utilization_percent) FROM stdin;
1	2025-06-22 21:42:13.799209+00	100	1	0	1	0	0	0	0	0	0.00
2	2025-06-22 21:42:23.804117+00	100	1	0	1	0	0	0	0	0	0.00
3	2025-06-22 21:42:33.805171+00	100	1	0	1	0	0	0	0	0	0.00
4	2025-06-22 21:42:43.80067+00	100	1	0	1	0	0	0	0	0	0.00
5	2025-06-22 21:42:53.800515+00	100	20	0	20	0	0	39	0	0	0.00
6	2025-06-22 21:43:03.805327+00	100	20	0	20	0	0	39	0	0	0.00
7	2025-06-22 21:43:13.796895+00	100	20	0	20	0	0	39	0	0	0.00
8	2025-06-22 21:43:23.795085+00	100	45	45	0	0	0	39	0	0	45.00
9	2025-06-22 21:43:33.797901+00	100	46	45	1	0	0	39	0	0	45.00
10	2025-06-22 21:43:43.802731+00	100	46	45	1	0	0	39	0	0	45.00
11	2025-06-22 21:43:53.795688+00	100	20	0	20	0	0	65	0	0	0.00
12	2025-06-22 21:44:03.795722+00	100	20	0	20	0	0	65	0	0	0.00
13	2025-06-22 21:44:06.994043+00	50	10	5	5	0	0	0	0	0	20.00
14	2025-06-22 21:47:06.16419+00	100	1	0	1	0	0	0	0	0	0.00
15	2025-06-22 21:47:16.163902+00	100	1	0	1	0	0	0	0	0	0.00
16	2025-06-22 21:47:26.158526+00	100	1	0	1	0	0	0	0	0	0.00
17	2025-06-22 21:47:36.158688+00	100	1	0	1	0	0	0	0	0	0.00
18	2025-06-22 21:47:46.159483+00	100	1	0	1	0	0	0	0	0	0.00
19	2025-06-22 21:47:56.152981+00	100	1	0	1	0	0	0	0	0	0.00
20	2025-06-22 21:48:06.16723+00	100	2	0	2	0	0	0	0	0	0.00
21	2025-06-22 21:48:16.158211+00	100	2	0	2	0	0	0	0	0	0.00
22	2025-06-22 21:48:26.161921+00	100	2	0	2	0	0	0	0	0	0.00
23	2025-06-22 21:48:36.166074+00	100	2	0	2	0	0	0	0	0	0.00
24	2025-06-22 21:48:46.156971+00	100	20	0	20	0	0	59	0	0	0.00
25	2025-06-22 21:48:56.161905+00	100	20	0	20	0	0	59	0	0	0.00
26	2025-06-22 21:49:06.169256+00	100	20	0	20	0	0	59	0	0	0.00
27	2025-06-22 21:49:16.16339+00	100	20	0	20	0	0	59	0	0	0.00
28	2025-06-22 21:49:26.157826+00	100	85	85	0	0	0	59	0	0	85.00
29	2025-06-22 21:49:36.157728+00	100	86	85	1	0	0	59	0	0	85.00
30	2025-06-22 21:49:46.161742+00	100	86	85	1	0	0	59	0	0	85.00
31	2025-06-22 21:49:56.162354+00	100	86	85	1	0	0	59	0	0	85.00
32	2025-06-22 21:50:06.152586+00	100	20	0	20	0	0	125	0	0	0.00
33	2025-06-22 21:50:12.161488+00	50	10	5	5	0	0	0	0	0	20.00
34	2025-06-22 21:51:02.041883+00	100	1	0	1	0	0	0	0	0	0.00
35	2025-06-22 21:51:12.027227+00	100	1	0	1	0	0	0	0	0	0.00
36	2025-06-22 21:51:22.029957+00	100	1	0	1	0	0	0	0	0	0.00
37	2025-06-22 21:51:32.027486+00	100	1	0	1	0	0	0	0	0	0.00
38	2025-06-22 21:51:42.031695+00	100	1	0	1	0	0	0	0	0	0.00
39	2025-06-22 21:51:52.027919+00	100	1	0	1	0	0	0	0	0	0.00
40	2025-06-22 21:52:02.035055+00	100	2	0	2	0	0	0	0	0	0.00
41	2025-06-22 21:52:12.034907+00	100	2	0	2	0	0	0	0	0	0.00
42	2025-06-22 21:52:22.034333+00	100	2	0	2	0	0	0	0	0	0.00
43	2025-06-22 21:52:32.02827+00	100	2	0	2	0	0	0	0	0	0.00
44	2025-06-22 21:52:42.029379+00	100	20	0	20	0	0	32	0	0	0.00
45	2025-06-22 21:52:52.036349+00	100	20	0	20	0	0	32	0	0	0.00
46	2025-06-22 21:53:02.039311+00	100	20	0	20	0	0	32	0	0	0.00
47	2025-06-22 21:53:12.029463+00	100	20	0	20	0	0	32	0	0	0.00
48	2025-06-22 21:53:22.02726+00	100	85	85	0	0	0	32	0	0	85.00
49	2025-06-22 21:53:32.029943+00	100	86	85	1	0	0	32	0	0	85.00
50	2025-06-22 21:53:42.034307+00	100	86	85	1	0	0	32	0	0	85.00
51	2025-06-22 21:59:11.924423+00	100	1	0	1	0	0	0	0	0	0.00
52	2025-06-22 21:59:21.919513+00	100	1	0	1	0	0	0	0	0	0.00
53	2025-06-22 21:59:31.92473+00	100	1	0	1	0	0	0	0	0	0.00
54	2025-06-22 21:59:41.918158+00	100	1	0	1	0	0	0	0	0	0.00
55	2025-06-22 21:59:51.934145+00	100	1	0	1	0	0	0	0	0	0.00
56	2025-06-22 22:00:01.935914+00	100	1	1	0	0	0	0	0	0	1.00
57	2025-06-22 22:00:11.913272+00	100	2	0	2	0	0	0	0	0	0.00
58	2025-06-22 22:00:21.916013+00	100	2	0	2	0	0	0	0	0	0.00
59	2025-06-22 22:00:31.926856+00	100	2	0	2	0	0	0	0	0	0.00
60	2025-06-22 22:00:41.924001+00	100	2	0	2	0	0	0	0	0	0.00
61	2025-06-22 22:00:51.918293+00	100	20	0	20	0	0	50	0	0	0.00
62	2025-06-22 22:01:01.92451+00	100	20	0	20	0	0	50	0	0	0.00
63	2025-06-22 22:01:11.922993+00	100	20	0	20	0	0	50	0	0	0.00
64	2025-06-22 22:01:21.92993+00	100	20	0	20	0	0	50	0	0	0.00
65	2025-06-22 22:01:31.923787+00	100	85	85	0	0	0	50	0	0	85.00
66	2025-06-22 22:01:41.915591+00	100	86	85	1	0	0	50	0	0	85.00
67	2025-06-22 22:01:51.931589+00	100	86	85	1	0	0	50	0	0	85.00
68	2025-06-22 22:02:01.923237+00	100	86	85	1	0	0	50	0	0	85.00
69	2025-06-22 22:02:11.915278+00	100	20	0	20	0	0	116	0	0	0.00
70	2025-06-22 22:02:19.315379+00	50	10	5	5	0	0	0	0	0	20.00
\.


--
-- Data for Name: slow_query_log; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.slow_query_log (id, query_hash, query_sql, execution_time_ms, waiting_time_ms, rows_examined, rows_returned, query_plan, session_info, application_context, severity, auto_optimization_attempted, optimization_result, logged_at) FROM stdin;
\.


--
-- Data for Name: state_coordination_locks; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.state_coordination_locks (lock_key, locked_by, locked_at, expires_at, metadata) FROM stdin;
\.


--
-- Data for Name: state_events; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.state_events (id, entity_id, event_type, event_data, "timestamp", state_version, correlation_id, causation_id, aggregate_type, metadata, created_at) FROM stdin;
93e954e3-b3bd-42fd-9b85-cd30af8616e3	aa40b2b3-e4a9-4a22-b867-29f3dcadd148	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 17:45:22.690019+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:50:22.692566+00
785760db-368e-442d-8864-88f744e29215	aa40b2b3-e4a9-4a22-b867-29f3dcadd148	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 17:46:22.69002+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:50:22.738725+00
396885f1-9bce-43d9-a1d3-a8ee6677d0e5	aa40b2b3-e4a9-4a22-b867-29f3dcadd148	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 17:47:22.69002+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:50:22.748429+00
1c3538e7-4c63-4da2-82dc-f2f3dace3434	b089dce8-c4d8-435d-8b61-fbe42efe65eb	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 17:47:22.353354+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:52:22.353416+00
0fe8046d-3a9c-4194-9a8c-715ced3e190a	b089dce8-c4d8-435d-8b61-fbe42efe65eb	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 17:48:22.353355+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:52:22.380808+00
fdeae471-8b76-4471-ae09-4eada29a3b2e	b089dce8-c4d8-435d-8b61-fbe42efe65eb	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 17:49:22.353356+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:52:22.390908+00
820acb80-8072-4178-9d1d-7b4c5578edcf	4ea0784d-0f65-4082-bcc9-fe855c98839e	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 17:48:15.20506+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:53:15.205383+00
d720ba27-d6b6-46e5-9f45-ffaa38fc0623	4ea0784d-0f65-4082-bcc9-fe855c98839e	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 17:49:15.205061+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:53:15.21962+00
abd32bb0-34eb-4261-85ea-e983ba2915a5	4ea0784d-0f65-4082-bcc9-fe855c98839e	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 17:50:15.205062+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:53:15.254469+00
50017df3-f40e-41c4-a289-a06c70b95654	168d4d10-ba42-45ef-bdd5-dfb6f071f1eb	concurrent_update	{"timestamp": 1750614867, "update_id": 0, "goroutine_id": 9}	2025-06-22 17:54:27.70349+00	2	f330e1d4-d75e-484b-b294-39555fa798d0	\N	campaign_state	null	2025-06-22 17:54:27.703508+00
f84cf783-6ec2-4a8f-80e2-a2aded3c2124	168d4d10-ba42-45ef-bdd5-dfb6f071f1eb	concurrent_update	{"timestamp": 1750614867, "update_id": 1, "goroutine_id": 9}	2025-06-22 17:54:27.744587+00	3	75fff341-5597-424f-a62a-017fb60cab3d	\N	campaign_state	null	2025-06-22 17:54:27.752083+00
e069cde4-a778-44d7-9168-62739f4f9f96	168d4d10-ba42-45ef-bdd5-dfb6f071f1eb	concurrent_update	{"timestamp": 1750614867, "update_id": 1, "goroutine_id": 5}	2025-06-22 17:54:27.782338+00	4	646402e3-f103-445b-b06d-6da6986ba67d	\N	campaign_state	null	2025-06-22 17:54:27.78472+00
8296dc0e-4532-449e-a412-876beeaf0ab7	168d4d10-ba42-45ef-bdd5-dfb6f071f1eb	concurrent_update	{"timestamp": 1750614867, "update_id": 3, "goroutine_id": 8}	2025-06-22 17:54:27.81314+00	5	5b4afa74-af98-467a-af29-23ab48c49916	\N	campaign_state	null	2025-06-22 17:54:27.813285+00
5608bf19-9fef-48b0-acc0-0ec0b1e321d9	168d4d10-ba42-45ef-bdd5-dfb6f071f1eb	concurrent_update	{"timestamp": 1750614867, "update_id": 3, "goroutine_id": 7}	2025-06-22 17:54:27.848423+00	6	4f635eaa-525a-40a2-9923-72cee71d9056	\N	campaign_state	null	2025-06-22 17:54:27.850587+00
0cadb438-0117-4262-9e12-62a37c6871cb	168d4d10-ba42-45ef-bdd5-dfb6f071f1eb	concurrent_update	{"timestamp": 1750614867, "update_id": 4, "goroutine_id": 7}	2025-06-22 17:54:27.889891+00	7	37f66f3a-11ed-46b1-827c-8bdcb8a66db6	\N	campaign_state	null	2025-06-22 17:54:27.894352+00
c04c9bfa-905f-4fc0-b51a-4cef24bd4954	400b42ee-cf39-48c8-8b23-1f8f113e78e9	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 17:49:28.137656+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:54:28.139089+00
9d335df4-e3a4-4a82-a3b6-9c544747ee28	400b42ee-cf39-48c8-8b23-1f8f113e78e9	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 17:50:28.137657+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:54:28.150819+00
82dd7e4b-8db1-42cc-8def-bef3ee469f59	400b42ee-cf39-48c8-8b23-1f8f113e78e9	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 17:51:28.137658+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:54:28.181265+00
5e9802a5-31a7-4ca8-9939-e065262792bd	0aaf1156-cdd7-47b6-bb4b-577ffe019cb1	race_condition_test	{"update_id": 19, "new_version": 2, "old_version": 1}	2025-06-22 17:54:28.388231+00	2	e98a8254-f774-4740-9642-1ce30efd14d4	\N	campaign_state	null	2025-06-22 17:54:28.401334+00
1448fd8b-32b7-4e96-b881-f4abbf22b699	0aaf1156-cdd7-47b6-bb4b-577ffe019cb1	race_condition_test	{"update_id": 11, "new_version": 3, "old_version": 2}	2025-06-22 17:54:28.502276+00	3	da0475b8-8a38-4940-bf14-057029a42da5	\N	campaign_state	null	2025-06-22 17:54:28.506658+00
e162e869-e9ff-4b87-8d46-abf77ac7330d	601e7cba-be50-48e8-a6e1-d8cdb6028a7b	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 17:50:13.60412+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:55:13.604259+00
fb3ae44a-ae17-439e-8a8a-242216a7057a	601e7cba-be50-48e8-a6e1-d8cdb6028a7b	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 17:51:13.604121+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:55:13.640913+00
62e4b849-0a73-4b5e-ae74-d605c9f5d663	601e7cba-be50-48e8-a6e1-d8cdb6028a7b	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 17:52:13.604122+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 17:55:13.663447+00
d0c0c394-32d6-46ad-92e7-0169efee22d1	0201e50c-ba77-4dbc-9bf8-574db8f425e9	concurrent_update	{"timestamp": 1750615130, "update_id": 0, "goroutine_id": 9}	2025-06-22 17:58:50.794555+00	2	6dc11e92-915f-4574-b4b1-a98ab2e5b01d	\N	campaign_state	null	2025-06-22 17:58:50.794816+00
172b1ddb-d1d8-4207-82c7-24f1445a9d53	0201e50c-ba77-4dbc-9bf8-574db8f425e9	concurrent_update	{"timestamp": 1750615130, "update_id": 3, "goroutine_id": 1}	2025-06-22 17:58:50.8815+00	3	023653de-26a0-4290-97fb-5e88c9b46dc8	\N	campaign_state	null	2025-06-22 17:58:50.881815+00
25efa8ce-a60c-439b-8417-d4e868a8ad45	0201e50c-ba77-4dbc-9bf8-574db8f425e9	concurrent_update	{"timestamp": 1750615130, "update_id": 4, "goroutine_id": 1}	2025-06-22 17:58:50.890025+00	4	8ded8369-020f-480f-ba98-4a26314def07	\N	campaign_state	null	2025-06-22 17:58:50.890491+00
5513c865-5447-4d6d-a82a-8c5cec706fb6	0201e50c-ba77-4dbc-9bf8-574db8f425e9	concurrent_update	{"timestamp": 1750615130, "update_id": 4, "goroutine_id": 8}	2025-06-22 17:58:50.900952+00	5	aff0f0a0-1a48-400c-81ee-b73a7207bee7	\N	campaign_state	null	2025-06-22 17:58:50.900979+00
0b3d71c5-fdf0-4321-ac66-a88ae2acfd26	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 0, "goroutine_id": 0}	2025-06-22 18:00:09.455949+00	2	a8c5b08c-44e4-4ede-a4e0-c22e53e974f0	\N	campaign_state	null	2025-06-22 18:00:09.456864+00
5163c15b-d75f-4cef-b6fa-1461f52cc3f6	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 0, "goroutine_id": 5}	2025-06-22 18:00:09.501789+00	3	1d1145b5-e040-4e05-8804-455ef60bb363	\N	campaign_state	null	2025-06-22 18:00:09.501914+00
0a279d78-37a6-4dac-86a2-f0405f1b6aaf	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 1, "goroutine_id": 5}	2025-06-22 18:00:09.542646+00	4	aab34051-f6a2-4c5f-9a95-a9cc7efb5a4d	\N	campaign_state	null	2025-06-22 18:00:09.542853+00
3b3126be-3fd6-45a0-8fab-dfa382268177	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 0, "goroutine_id": 2}	2025-06-22 18:00:09.608127+00	5	7ee726fa-56a6-467d-91a5-0f5c60cafb0c	\N	campaign_state	null	2025-06-22 18:00:09.608232+00
ca3abf18-dc90-443d-b297-cf951a96d995	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 1, "goroutine_id": 2}	2025-06-22 18:00:09.636347+00	6	8ed3aaa2-e2d3-4d01-acf9-2320d5830045	\N	campaign_state	null	2025-06-22 18:00:09.636521+00
5fa3f04d-cd99-4d29-a440-a1521142009e	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 2, "goroutine_id": 2}	2025-06-22 18:00:09.647224+00	7	97735157-2e3f-41ab-94c9-7943e51efc17	\N	campaign_state	null	2025-06-22 18:00:09.64733+00
281f02ed-85dc-47ab-9b2d-d8b107898838	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 3, "goroutine_id": 2}	2025-06-22 18:00:09.665137+00	8	04e2c04c-af4f-4f91-bc2d-088c9ea8f4b1	\N	campaign_state	null	2025-06-22 18:00:09.667542+00
c012d113-8815-42c2-8ef1-9bba5c1bd71a	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 4, "goroutine_id": 2}	2025-06-22 18:00:09.706857+00	9	35ecbf13-6eb9-47b9-800d-3b530a2e78f3	\N	campaign_state	null	2025-06-22 18:00:09.706952+00
93a8fbff-3e17-4809-88d9-53393dbcd33b	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 0, "goroutine_id": 8}	2025-06-22 18:00:09.815457+00	10	dc0e00be-f767-4b5e-acb6-0f43aa1d317f	\N	campaign_state	null	2025-06-22 18:00:09.815483+00
7a5d8128-0ea0-421a-a1fc-75c5d02960bd	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 1, "goroutine_id": 8}	2025-06-22 18:00:09.841449+00	11	bde4f1a0-580b-4cdd-bdec-adab72e70a1f	\N	campaign_state	null	2025-06-22 18:00:09.841544+00
c18d0062-30cd-453d-82ec-4ce94256f28b	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 2, "goroutine_id": 8}	2025-06-22 18:00:09.853976+00	12	7219dc64-fc90-462b-8583-e2c2bb771769	\N	campaign_state	null	2025-06-22 18:00:09.854119+00
d60df379-23e5-493c-a9f2-76c2bb655a34	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 0, "goroutine_id": 1}	2025-06-22 18:00:09.891012+00	13	06d76fe8-f758-48ed-b0e1-daa3fab60101	\N	campaign_state	null	2025-06-22 18:00:09.891027+00
62a3b701-041c-4e2e-9c12-8b041182f7ff	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 1, "goroutine_id": 1}	2025-06-22 18:00:09.90787+00	14	91d06ba5-0ce7-4dc0-bdab-56cb03d23fe1	\N	campaign_state	null	2025-06-22 18:00:09.920596+00
d375dd28-d249-4f49-90f2-5c0bc1375b12	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 2, "goroutine_id": 1}	2025-06-22 18:00:09.959186+00	15	e746f06b-b944-4a6d-9def-e3ef46fd4552	\N	campaign_state	null	2025-06-22 18:00:09.959331+00
8d95f510-7c5b-40ec-8b21-ab8a69653d92	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 0, "goroutine_id": 7}	2025-06-22 18:00:10.19973+00	24	32231639-26fc-4450-9b10-0eeead61580e	\N	campaign_state	null	2025-06-22 18:00:10.203852+00
7aa9d820-075e-4086-938f-fa60c103b340	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 0, "goroutine_id": 4}	2025-06-22 18:00:10.415381+00	34	49acf284-321e-42dd-bdb8-fb0399392cee	\N	campaign_state	null	2025-06-22 18:00:10.415475+00
c5fd663a-d030-48ed-bf8b-314cf11d7dbc	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 1, "goroutine_id": 4}	2025-06-22 18:00:10.420944+00	35	7d2e8be5-c04b-44dd-8d1a-37c4eb7b8c36	\N	campaign_state	null	2025-06-22 18:00:10.42106+00
63cb3496-3404-4849-94fa-9231eae2c7ac	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 2, "goroutine_id": 4}	2025-06-22 18:00:10.435337+00	36	cbf5fdb5-0f5a-41f7-aa87-cf08b7fb053c	\N	campaign_state	null	2025-06-22 18:00:10.435497+00
7259d064-5285-4851-893f-96fa3f76b299	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 3, "goroutine_id": 4}	2025-06-22 18:00:10.440476+00	37	d35813bf-bfd4-4c6f-aa13-08ab6e25df09	\N	campaign_state	null	2025-06-22 18:00:10.440748+00
76df1d8c-4915-4a64-bf03-88bc4e7b6617	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 4, "goroutine_id": 4}	2025-06-22 18:00:10.455067+00	38	f56b4ab3-deb6-4980-b1a7-4c428c37e6f5	\N	campaign_state	null	2025-06-22 18:00:10.455079+00
a4dc146e-7c70-46b8-9a21-183507c0583f	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 0, "goroutine_id": 6}	2025-06-22 18:00:10.470713+00	39	6cdca771-71aa-4ceb-84e7-d23306a93f58	\N	campaign_state	null	2025-06-22 18:00:10.471925+00
c86d6e8d-68c9-46e1-a92e-4610c9a40256	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 2, "goroutine_id": 5}	2025-06-22 18:00:09.981326+00	16	cbc6d6f9-db54-4a58-be45-4c778f28440d	\N	campaign_state	null	2025-06-22 18:00:09.981428+00
b30e6be4-6622-47fa-8224-4f0fa10576b5	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 3, "goroutine_id": 5}	2025-06-22 18:00:09.987208+00	17	1282ba2a-d947-4689-be2f-e463a7435d7d	\N	campaign_state	null	2025-06-22 18:00:09.987302+00
090e07ce-4af8-425c-b78f-e7c08812a140	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615209, "update_id": 4, "goroutine_id": 5}	2025-06-22 18:00:09.99347+00	18	e9601092-0cb0-4ecd-9ea7-d853b3bae805	\N	campaign_state	null	2025-06-22 18:00:09.995665+00
ff4ca1ad-0954-4bab-bf19-685529aec2f4	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 0, "goroutine_id": 3}	2025-06-22 18:00:10.040984+00	19	31d7171e-db66-407f-8c4d-247e6963e66a	\N	campaign_state	null	2025-06-22 18:00:10.041017+00
a07d3670-20d0-45dd-b17c-03d0d20db998	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 1, "goroutine_id": 3}	2025-06-22 18:00:10.046631+00	20	5170f400-1c99-426e-9232-50a404fb86f5	\N	campaign_state	null	2025-06-22 18:00:10.046771+00
bfcfd728-77b7-43f6-9a01-cae1b9cf8af2	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 2, "goroutine_id": 3}	2025-06-22 18:00:10.09126+00	21	1bb3074d-bab7-4aba-bbfa-170a8ea4c299	\N	campaign_state	null	2025-06-22 18:00:10.091354+00
2304ac83-94f6-444b-88d1-760de1e39317	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 3, "goroutine_id": 3}	2025-06-22 18:00:10.099563+00	22	f9728938-2d62-4437-aead-d7c38894d3b0	\N	campaign_state	null	2025-06-22 18:00:10.099853+00
dbe92a54-b4b8-4899-ab6a-c39b9267277c	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 4, "goroutine_id": 3}	2025-06-22 18:00:10.113281+00	23	c83a817d-79a5-43ac-bee2-e4d38c31f418	\N	campaign_state	null	2025-06-22 18:00:10.113301+00
0702bb9b-94c6-4897-8548-7b4de973ab0d	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 3, "goroutine_id": 1}	2025-06-22 18:00:10.213461+00	25	3d9e960b-4b74-4a1f-853d-5f3f641615e8	\N	campaign_state	null	2025-06-22 18:00:10.213478+00
1e175726-a1cc-42a7-97cf-c627cdf2decf	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 4, "goroutine_id": 1}	2025-06-22 18:00:10.220341+00	26	56462b3d-c1d0-468b-b8c5-e830532c3f89	\N	campaign_state	null	2025-06-22 18:00:10.220352+00
f83f702d-4b8d-4faa-8582-cbc9700384df	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 1, "goroutine_id": 0}	2025-06-22 18:00:10.228583+00	27	2d0f319b-d855-4f9f-84fd-cb4b47cd326a	\N	campaign_state	null	2025-06-22 18:00:10.228825+00
210aa124-f276-418c-8647-e78275bf5d32	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 2, "goroutine_id": 0}	2025-06-22 18:00:10.238986+00	28	a14ae532-df19-4723-99f1-1099cdf7d98c	\N	campaign_state	null	2025-06-22 18:00:10.239219+00
ecbe70c4-18cf-48b3-b113-3864595e57bd	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 3, "goroutine_id": 0}	2025-06-22 18:00:10.282214+00	29	8a1b65df-2930-4652-b471-d8c9804ca575	\N	campaign_state	null	2025-06-22 18:00:10.282351+00
a7545944-452b-4623-bdaa-11503d3ca63a	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 4, "goroutine_id": 0}	2025-06-22 18:00:10.288251+00	30	d8598a09-f91f-4d39-88a3-040518871b64	\N	campaign_state	null	2025-06-22 18:00:10.28837+00
73a5e873-61dc-454a-99bb-c0f9f27db8d1	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 0, "goroutine_id": 9}	2025-06-22 18:00:10.306924+00	31	8b4f2501-0de9-4069-a1e0-e4f80c4ca154	\N	campaign_state	null	2025-06-22 18:00:10.307103+00
98d5562c-6c40-4df2-9631-2e47ae774103	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 1, "goroutine_id": 9}	2025-06-22 18:00:10.31411+00	32	5d01a0f1-dceb-4087-8f89-85b21481ddcb	\N	campaign_state	null	2025-06-22 18:00:10.314248+00
8246b695-ca61-4848-97eb-437a5a76fba4	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 2, "goroutine_id": 9}	2025-06-22 18:00:10.368097+00	33	23d159bd-d06e-47e7-83b0-9d33a07a293d	\N	campaign_state	null	2025-06-22 18:00:10.368196+00
3ff08231-f57b-4a59-a272-801ccdcbcc6a	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 1, "goroutine_id": 6}	2025-06-22 18:00:10.7168+00	40	7d00f927-909e-4d6b-91c5-c5427f7b0b57	\N	campaign_state	null	2025-06-22 18:00:10.718121+00
fc85f139-0e4a-4806-879d-83f23ee0438f	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 2, "goroutine_id": 6}	2025-06-22 18:00:10.73141+00	41	796572df-7fe9-4e1f-84a0-79be4314fe03	\N	campaign_state	null	2025-06-22 18:00:10.734508+00
68470c99-af7a-437f-b9d3-20655f08fbeb	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 3, "goroutine_id": 6}	2025-06-22 18:00:10.770219+00	42	44c18ec6-c28a-41c9-9fbe-de6666258896	\N	campaign_state	null	2025-06-22 18:00:10.770326+00
e2868e66-c5df-45a7-b018-9531ce384028	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 4, "goroutine_id": 6}	2025-06-22 18:00:10.806119+00	43	6be451b0-4584-4e98-8f34-32040f67d604	\N	campaign_state	null	2025-06-22 18:00:10.806292+00
1fc16551-1b9b-4645-8dc7-249a5e279b2d	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 3, "goroutine_id": 9}	2025-06-22 18:00:10.829641+00	44	344c0754-0b33-4b1b-aa4d-3bf1d17c3167	\N	campaign_state	null	2025-06-22 18:00:10.829663+00
7105e0c9-65e7-4172-a191-424431dd570d	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 4, "goroutine_id": 9}	2025-06-22 18:00:10.834051+00	45	b07233be-50da-4331-9f64-ad61a2590261	\N	campaign_state	null	2025-06-22 18:00:10.834072+00
97754c40-a464-4759-8166-43c7f8423c39	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 1, "goroutine_id": 7}	2025-06-22 18:00:10.943996+00	46	f2014849-9c60-4fec-9cd9-775cd203f3d8	\N	campaign_state	null	2025-06-22 18:00:10.944832+00
800a2e8b-bb32-4682-8755-462419a2cda4	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615210, "update_id": 2, "goroutine_id": 7}	2025-06-22 18:00:10.987034+00	47	04fc3163-8c23-4e51-a0e4-cc489f849631	\N	campaign_state	null	2025-06-22 18:00:10.987079+00
ccada858-ea24-4ab5-aa72-43e620b852cd	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615211, "update_id": 3, "goroutine_id": 7}	2025-06-22 18:00:11.024374+00	48	31d19068-960d-457f-a319-f663b3e10cd4	\N	campaign_state	null	2025-06-22 18:00:11.024396+00
3acdf127-8f80-406e-b423-ef3f0b855bd8	626c758d-4292-4128-ab11-fa2b766470fb	concurrent_update	{"timestamp": 1750615211, "update_id": 4, "goroutine_id": 7}	2025-06-22 18:00:11.034207+00	49	39ee1409-b752-4c95-80e4-e51a85a58e31	\N	campaign_state	null	2025-06-22 18:00:11.03431+00
e722095b-6784-4bd0-a10d-c8ff3a94b04c	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615223, "update_id": 0, "goroutine_id": 9}	2025-06-22 18:00:23.822785+00	2	0672890d-dd4b-4380-96e6-622f31a4a167	\N	campaign_state	null	2025-06-22 18:00:23.825639+00
325f2713-8ee6-4029-a213-31d0b9813792	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615223, "update_id": 1, "goroutine_id": 9}	2025-06-22 18:00:23.846606+00	3	b344787e-3925-4181-89a6-de0f151dbbb9	\N	campaign_state	null	2025-06-22 18:00:23.846701+00
b8d52682-b1e2-4ea7-9a4b-a1c7c0e3026d	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615223, "update_id": 2, "goroutine_id": 9}	2025-06-22 18:00:23.886954+00	4	324cc37c-46c4-4b45-866d-0bffa443e71e	\N	campaign_state	null	2025-06-22 18:00:23.88705+00
feba0186-7715-4a93-a2e6-8b3d2234ebb7	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615223, "update_id": 3, "goroutine_id": 9}	2025-06-22 18:00:23.897202+00	5	7af00b44-44bd-4b59-82c2-86c274b71eea	\N	campaign_state	null	2025-06-22 18:00:23.89731+00
320cc30c-9a61-493f-ba27-c36a5ff5f07c	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615223, "update_id": 4, "goroutine_id": 9}	2025-06-22 18:00:23.94051+00	6	703d2099-7ceb-4fc6-bfd9-2f877943816d	\N	campaign_state	null	2025-06-22 18:00:23.940535+00
92c532e7-c25e-420d-b1a8-5af6cd38e692	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615223, "update_id": 0, "goroutine_id": 5}	2025-06-22 18:00:23.963774+00	7	2f1cf0f8-62f7-4431-aa10-ea4dd52230d7	\N	campaign_state	null	2025-06-22 18:00:23.963942+00
f1609059-aa24-4520-b0d2-352beff1f1a7	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 1, "goroutine_id": 5}	2025-06-22 18:00:24.014867+00	8	5bd23889-19b9-4d21-ac3a-322e3ef1585e	\N	campaign_state	null	2025-06-22 18:00:24.014894+00
2404d6dd-b9bf-46f8-af5f-2d7abda46044	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 2, "goroutine_id": 5}	2025-06-22 18:00:24.021797+00	9	b42e82f6-abb9-4dad-83ca-8cd596775fa7	\N	campaign_state	null	2025-06-22 18:00:24.021908+00
e50faf48-ef81-4b24-b7c1-77222cbb7e29	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 3, "goroutine_id": 5}	2025-06-22 18:00:24.029038+00	10	8536a1e2-62bf-4f42-8cc7-c9c3cd01801e	\N	campaign_state	null	2025-06-22 18:00:24.029238+00
95cffc22-5695-4570-86aa-39a2dba6459b	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 4, "goroutine_id": 5}	2025-06-22 18:00:24.036658+00	11	015a0429-2178-4ecc-9b54-9f3404be7dc9	\N	campaign_state	null	2025-06-22 18:00:24.036814+00
e7a79ae1-1a57-4d1b-b1ec-fd4779d6a956	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 0, "goroutine_id": 3}	2025-06-22 18:00:24.047635+00	12	2497e912-2e93-483a-897a-dfa5f11e47dd	\N	campaign_state	null	2025-06-22 18:00:24.050216+00
89541cd4-1e2d-4915-84df-c720f7032bb4	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 0, "goroutine_id": 4}	2025-06-22 18:00:24.122785+00	13	6bbaddb8-0386-4774-a401-1f16d4c9da22	\N	campaign_state	null	2025-06-22 18:00:24.125767+00
dd437619-b453-436f-8834-ffcd37661094	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 0, "goroutine_id": 8}	2025-06-22 18:00:24.134119+00	14	83c32110-c53f-4fde-b01d-de040f7d88f6	\N	campaign_state	null	2025-06-22 18:00:24.134246+00
92889229-67c5-46b0-bf93-a558f9de5c8d	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 1, "goroutine_id": 2}	2025-06-22 18:00:24.152567+00	15	161234a8-a3d3-489b-9306-af11e9f3cb93	\N	campaign_state	null	2025-06-22 18:00:24.152672+00
8cc86a81-e81f-4a06-aabe-99bacaf38a93	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 2, "goroutine_id": 2}	2025-06-22 18:00:24.169677+00	16	b812081c-190f-46d8-9158-b4e9be7d8ace	\N	campaign_state	null	2025-06-22 18:00:24.169786+00
33b5fe63-24df-43c3-a58f-fd3dd89eab66	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 3, "goroutine_id": 2}	2025-06-22 18:00:24.177531+00	17	129ef394-abac-4070-9437-48338a2edcf1	\N	campaign_state	null	2025-06-22 18:00:24.177807+00
61d25074-9e16-44e3-95c7-c6ec40069f30	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 4, "goroutine_id": 2}	2025-06-22 18:00:24.187025+00	18	825161e2-b563-4fcb-9dd1-0c1db276da21	\N	campaign_state	null	2025-06-22 18:00:24.187123+00
bed22313-ca71-43e5-b36f-d0261dd94229	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 1, "goroutine_id": 3}	2025-06-22 18:00:24.247762+00	19	5677a56f-ec63-4cd8-a252-20c5cc816274	\N	campaign_state	null	2025-06-22 18:00:24.251458+00
c5e51d32-6ea6-4462-a05c-eb8d2ef3382f	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 2, "goroutine_id": 3}	2025-06-22 18:00:24.29419+00	20	22056ea6-c101-4143-8d3e-1452103e6e4e	\N	campaign_state	null	2025-06-22 18:00:24.294285+00
51e721d4-760d-4828-bd88-5b482936de72	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 0, "goroutine_id": 7}	2025-06-22 18:00:24.309546+00	21	c01c3283-a8f2-4ad7-996b-9764e4c9b6cc	\N	campaign_state	null	2025-06-22 18:00:24.309673+00
2c3ee9aa-50aa-43dd-bbcb-2293e1bdde94	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 1, "goroutine_id": 7}	2025-06-22 18:00:24.328378+00	22	28b8d442-ec4c-4cd4-bcd1-3f639bf37918	\N	campaign_state	null	2025-06-22 18:00:24.328637+00
21d3ea61-516b-45b0-882a-d0404afc469f	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 2, "goroutine_id": 7}	2025-06-22 18:00:24.369359+00	23	aa3da64b-b0b4-458b-8d85-72b01b1c7f49	\N	campaign_state	null	2025-06-22 18:00:24.369478+00
aee7a71b-ee06-4657-869c-ccf8085cf8d8	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 3, "goroutine_id": 7}	2025-06-22 18:00:24.416817+00	24	d2726dae-21c1-4cec-b431-3f5d29931735	\N	campaign_state	null	2025-06-22 18:00:24.416964+00
04d125a2-f569-465f-9be7-69190dd5eac2	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 1, "goroutine_id": 8}	2025-06-22 18:00:24.427272+00	25	e929142d-36c5-4adf-9e91-b0677cef52f3	\N	campaign_state	null	2025-06-22 18:00:24.427487+00
8dee604c-867b-4846-a9ed-3e92651cc84c	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 2, "goroutine_id": 8}	2025-06-22 18:00:24.439295+00	26	f6c8951b-62ef-4085-943a-b349ec610f06	\N	campaign_state	null	2025-06-22 18:00:24.439513+00
af82c4c1-13c9-477c-973b-ab4983770691	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 3, "goroutine_id": 8}	2025-06-22 18:00:24.446268+00	27	ac42da0c-88a1-4d2f-aaec-78091bb317ae	\N	campaign_state	null	2025-06-22 18:00:24.446374+00
01259ecc-ebb2-464b-a24a-7b53f62a82c3	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 4, "goroutine_id": 8}	2025-06-22 18:00:24.452902+00	28	f5a1b668-c57c-402b-b6d8-49e825f5d293	\N	campaign_state	null	2025-06-22 18:00:24.453028+00
4f4f53bf-bdda-4dc9-9413-ce52e181c26b	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 0, "goroutine_id": 6}	2025-06-22 18:00:24.521934+00	29	e4677e97-e94c-4679-8bde-9d2b6481a89c	\N	campaign_state	null	2025-06-22 18:00:24.525245+00
4bba705e-8de7-4d5d-bb22-080f9bf73a4d	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 1, "goroutine_id": 6}	2025-06-22 18:00:24.568605+00	30	7eed31b1-10e0-4b60-9db8-afd246a9bc9d	\N	campaign_state	null	2025-06-22 18:00:24.568635+00
87b0cfb9-a8f2-4283-b73f-260686ca2181	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 2, "goroutine_id": 6}	2025-06-22 18:00:24.595191+00	31	f655c497-76b7-4aca-ba41-cfaaef212264	\N	campaign_state	null	2025-06-22 18:00:24.597188+00
ece1140b-ab66-45f2-abf1-6dde3ee99dad	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 3, "goroutine_id": 6}	2025-06-22 18:00:24.634068+00	32	9f2ad058-c17f-46fd-9d75-84b3404cf8b0	\N	campaign_state	null	2025-06-22 18:00:24.634256+00
ce4912cc-8e7a-4078-a2ea-0376f0ae9ea7	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 4, "goroutine_id": 6}	2025-06-22 18:00:24.667547+00	33	2339605a-73a1-4c72-968a-143c0d371090	\N	campaign_state	null	2025-06-22 18:00:24.667627+00
59597b76-1685-496f-8917-334ff1ea3276	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 4, "goroutine_id": 7}	2025-06-22 18:00:24.683184+00	34	efbc29fe-af3e-4fb9-bee7-91fe777addbf	\N	campaign_state	null	2025-06-22 18:00:24.68333+00
bae236b1-4eed-47ba-a401-48957ebb1884	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 1, "goroutine_id": 4}	2025-06-22 18:00:24.767926+00	35	8e8fe015-fa0d-4553-b39b-b640a46104e5	\N	campaign_state	null	2025-06-22 18:00:24.768612+00
1d030718-c72f-4c64-850d-b17d627a0fcf	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 2, "goroutine_id": 4}	2025-06-22 18:00:24.78056+00	36	47977628-a692-4360-85f6-dcf8053abb80	\N	campaign_state	null	2025-06-22 18:00:24.780977+00
24fca9b9-6035-42ff-88d5-2fd275f4c4a9	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 3, "goroutine_id": 4}	2025-06-22 18:00:24.792454+00	37	bb709b09-0659-449c-894d-41094ac32c1c	\N	campaign_state	null	2025-06-22 18:00:24.795602+00
37c2351c-02ae-4fa5-a8f2-87c8e61455aa	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 4, "goroutine_id": 4}	2025-06-22 18:00:24.838037+00	38	522d09a7-fd54-40df-b1b9-12752bbeda4e	\N	campaign_state	null	2025-06-22 18:00:24.841417+00
8882289e-46b3-4d07-afd7-380dc49642c7	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 0, "goroutine_id": 0}	2025-06-22 18:00:24.888835+00	39	dca63cbd-ea96-47ba-8211-2c1296d794b3	\N	campaign_state	null	2025-06-22 18:00:24.888871+00
a1a49362-2293-4181-951d-ec9a345eceba	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 3, "goroutine_id": 3}	2025-06-22 18:00:24.932751+00	40	37ee3d02-651a-4cdd-83e4-2bd3a4c52c1a	\N	campaign_state	null	2025-06-22 18:00:24.933004+00
6b9828b6-8a59-4dbc-9709-0406d216bd23	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615224, "update_id": 4, "goroutine_id": 3}	2025-06-22 18:00:24.940051+00	41	06a9280e-69e1-4ed9-b3ec-a8fa501c68e6	\N	campaign_state	null	2025-06-22 18:00:24.940156+00
545c28a6-1be4-4ce8-95e7-1d9b21d76a40	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615225, "update_id": 1, "goroutine_id": 0}	2025-06-22 18:00:25.044112+00	42	652acbf3-3cfa-4d5d-a71a-b16070960fc7	\N	campaign_state	null	2025-06-22 18:00:25.048662+00
62487a6d-9382-4748-9a84-44dc45ab0b0f	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615225, "update_id": 2, "goroutine_id": 0}	2025-06-22 18:00:25.095964+00	43	153f3128-ba22-40e0-a12b-dc83b0702243	\N	campaign_state	null	2025-06-22 18:00:25.096057+00
0c0d95d3-792a-45d3-8ace-15064383c654	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615225, "update_id": 3, "goroutine_id": 0}	2025-06-22 18:00:25.106807+00	44	3b00ce00-5964-45cf-bdd0-dade889eaf8f	\N	campaign_state	null	2025-06-22 18:00:25.106901+00
e947616b-1364-46df-b292-b09b97ab420e	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615225, "update_id": 4, "goroutine_id": 0}	2025-06-22 18:00:25.112392+00	45	0949d1ec-7402-4a08-ad86-6c8030cbc72d	\N	campaign_state	null	2025-06-22 18:00:25.112521+00
cebab1a7-bc5d-404a-a323-d01cbdd14ef6	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615225, "update_id": 1, "goroutine_id": 1}	2025-06-22 18:00:25.168265+00	46	bebf7f5e-e671-4dd7-b6aa-efb89723df13	\N	campaign_state	null	2025-06-22 18:00:25.168412+00
d7efe4fb-4d0f-4f6d-b8eb-75cb87e3920e	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615225, "update_id": 2, "goroutine_id": 1}	2025-06-22 18:00:25.209002+00	47	2fbfe09a-75c7-4698-8426-1655fd56d924	\N	campaign_state	null	2025-06-22 18:00:25.209027+00
02bf55d8-c448-42e7-a856-de7df1c72a87	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615225, "update_id": 3, "goroutine_id": 1}	2025-06-22 18:00:25.236886+00	48	713565f4-8877-4ff1-ab54-46b55baceaad	\N	campaign_state	null	2025-06-22 18:00:25.23701+00
94d95c3b-150d-4edf-b61a-59b16a655cd0	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	concurrent_update	{"timestamp": 1750615225, "update_id": 4, "goroutine_id": 1}	2025-06-22 18:00:25.243943+00	49	c383a9e4-84a3-4933-98a8-3067cfebb064	\N	campaign_state	null	2025-06-22 18:00:25.244065+00
3ec3a6d6-7892-4cea-a266-62c0afe2b2cc	ebf080b3-78d0-47cf-9d94-3006b7df4d60	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 17:55:25.438009+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 18:00:25.438253+00
0c4a3838-49a1-4fa6-8dec-27ecd34befc6	ebf080b3-78d0-47cf-9d94-3006b7df4d60	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 17:56:25.43801+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 18:00:25.449853+00
2e8cea56-8d47-4e84-a6ce-bf7c2bab215d	ebf080b3-78d0-47cf-9d94-3006b7df4d60	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 17:57:25.43801+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 18:00:25.460334+00
135ffb15-ee47-4fac-a661-a44b833cd891	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 19, "new_version": 2, "old_version": 1}	2025-06-22 18:00:25.652864+00	2	0ed3c682-4cc6-4506-9456-3a61f2aa7044	\N	campaign_state	null	2025-06-22 18:00:25.653154+00
6a8b7e32-b608-4111-804c-72b07fc679c5	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 16, "new_version": 3, "old_version": 2}	2025-06-22 18:00:25.733858+00	3	5e6229a6-063c-49a1-b6eb-da3c5c069b2a	\N	campaign_state	null	2025-06-22 18:00:25.734545+00
3e1691ae-2a42-4730-b90a-34c2ed815589	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 8, "new_version": 4, "old_version": 3}	2025-06-22 18:00:25.745692+00	4	ad452f66-e998-456f-94a5-07fde9583154	\N	campaign_state	null	2025-06-22 18:00:25.745835+00
bf6f5dea-6da8-4a3a-b483-413d23bad60f	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 1, "new_version": 5, "old_version": 4}	2025-06-22 18:00:25.793639+00	5	c0ad5871-e5c8-443c-a7c3-ae90f9b39c3b	\N	campaign_state	null	2025-06-22 18:00:25.795474+00
7da0f615-7f7b-4100-878a-b41896a1044e	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 17, "new_version": 6, "old_version": 5}	2025-06-22 18:00:25.835672+00	6	d06a346d-9119-48ba-9683-4a64db6dfc54	\N	campaign_state	null	2025-06-22 18:00:25.836477+00
9bf93857-14ff-4b45-939d-2082255b1618	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 9, "new_version": 7, "old_version": 6}	2025-06-22 18:00:25.842899+00	7	c25d8f67-bb78-40cb-9030-a94ecc09a2ca	\N	campaign_state	null	2025-06-22 18:00:25.843001+00
c90584c7-c35d-4d5d-b0a9-bb8931688657	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 15, "new_version": 8, "old_version": 7}	2025-06-22 18:00:25.908441+00	8	022ea60c-4cf8-4e17-b3a6-a65976794e7a	\N	campaign_state	null	2025-06-22 18:00:25.908617+00
d1dfe164-d22d-4d6e-8506-062b4c6de116	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 3, "new_version": 9, "old_version": 8}	2025-06-22 18:00:25.91822+00	9	9e1c760b-c89c-4845-ab6d-6035d902911e	\N	campaign_state	null	2025-06-22 18:00:25.918331+00
86dd1c3f-332c-40d0-be39-11af891e1627	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 7, "new_version": 10, "old_version": 9}	2025-06-22 18:00:25.96061+00	10	d1e15231-9eb2-48ac-8553-e4960070cdab	\N	campaign_state	null	2025-06-22 18:00:25.960631+00
2fc93708-a30b-4511-919d-7f8b48888aed	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 10, "new_version": 11, "old_version": 10}	2025-06-22 18:00:25.970315+00	11	a71fb4c9-a057-4db9-8cf8-be7aaeb479e5	\N	campaign_state	null	2025-06-22 18:00:25.970351+00
ae41047f-dc69-43c8-bbce-151fc510ec38	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 14, "new_version": 12, "old_version": 11}	2025-06-22 18:00:26.013537+00	12	44bd9e86-689b-4ecd-98eb-f3b584de556a	\N	campaign_state	null	2025-06-22 18:00:26.013662+00
581ae601-52b2-471f-a5dd-49816f432436	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 4, "new_version": 13, "old_version": 12}	2025-06-22 18:00:26.023844+00	13	e5ddd019-aece-4b18-b9e4-474eb57142bf	\N	campaign_state	null	2025-06-22 18:00:26.023979+00
b24aee9e-ec71-4803-a416-b74a7a031075	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 5, "new_version": 14, "old_version": 13}	2025-06-22 18:00:26.066168+00	14	03ecbbf0-b7d8-4e15-b746-e1f25b1fd879	\N	campaign_state	null	2025-06-22 18:00:26.066268+00
d842ece1-5475-4045-a9cd-0e0201a36cbd	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 13, "new_version": 15, "old_version": 14}	2025-06-22 18:00:26.123583+00	15	39dc989b-ff05-450a-9756-64b571ebba2b	\N	campaign_state	null	2025-06-22 18:00:26.123963+00
47881e44-eb25-4f67-8d78-132b85aba491	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 18, "new_version": 16, "old_version": 15}	2025-06-22 18:00:26.133725+00	16	dbc1e75d-0121-4e49-9670-b8332afb2158	\N	campaign_state	null	2025-06-22 18:00:26.133978+00
47a8df09-9ad6-4752-a99e-326d065baaa7	256d6037-b48b-4e18-b34e-e6cdd37a416f	race_condition_test	{"update_id": 0, "new_version": 17, "old_version": 16}	2025-06-22 18:00:26.195448+00	17	a73bd6be-341c-420f-bb37-5195cbd97df8	\N	campaign_state	null	2025-06-22 18:00:26.195588+00
9c7d90e2-50c5-4146-a0a7-6e35cc75818c	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 0, "goroutine_id": 9}	2025-06-22 18:16:09.411401+00	2	70620d32-8e23-42ac-94c6-60e39566fdff	\N	campaign_state	null	2025-06-22 18:16:09.411411+00
3b7794af-54a0-456d-85ce-d85c32bb02fd	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 0, "goroutine_id": 4}	2025-06-22 18:16:09.454721+00	3	a487873f-a613-41d7-8e56-1c4f1b9ee0e1	\N	campaign_state	null	2025-06-22 18:16:09.457921+00
c5c94f72-c490-43db-9beb-9d2a81ea46d3	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 1, "goroutine_id": 7}	2025-06-22 18:16:09.472276+00	4	3b4df93d-329e-42b9-ac3d-c48f6f7735b8	\N	campaign_state	null	2025-06-22 18:16:09.472502+00
2900bbee-529b-4aee-954b-93cf98563ef2	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 2, "goroutine_id": 7}	2025-06-22 18:16:09.505034+00	5	e7b346d7-6e32-437b-871f-ea1452d6ff30	\N	campaign_state	null	2025-06-22 18:16:09.507162+00
b3ec820c-c1cf-4ed1-a9f7-86dd9c305c22	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 3, "goroutine_id": 7}	2025-06-22 18:16:09.549098+00	6	349281ce-5544-4218-ac08-4388366635e4	\N	campaign_state	null	2025-06-22 18:16:09.549112+00
8a76a120-c8f0-4e2a-b69e-c4857a83d5f1	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 4, "goroutine_id": 7}	2025-06-22 18:16:09.554573+00	7	e57a2de4-38d8-4ce9-a4cd-90b4e4909766	\N	campaign_state	null	2025-06-22 18:16:09.555125+00
9a12dbaf-e418-4c9e-b6a9-efa1c8a763f7	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 0, "goroutine_id": 3}	2025-06-22 18:16:09.599288+00	8	8094f0c2-5e82-4c95-b5f2-16bde310700f	\N	campaign_state	null	2025-06-22 18:16:09.599388+00
9a21b6e7-329f-40e7-a53f-4bca8e7b311d	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 1, "goroutine_id": 3}	2025-06-22 18:16:09.61032+00	9	fa00f271-3a11-45e9-8bb8-cb5d8c43b65b	\N	campaign_state	null	2025-06-22 18:16:09.610335+00
5f30510e-3ddd-4334-b93c-bc3ca6558252	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 2, "goroutine_id": 3}	2025-06-22 18:16:09.656638+00	10	fe5d8414-f17c-4991-b1b2-dbbf46482fd9	\N	campaign_state	null	2025-06-22 18:16:09.656858+00
edce6c82-d1ef-4184-91c7-e1fc2e697657	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 3, "goroutine_id": 3}	2025-06-22 18:16:09.698412+00	11	b75226bf-b223-4bc6-aa56-14071a8d782f	\N	campaign_state	null	2025-06-22 18:16:09.69863+00
5363b0b1-96f7-49c7-8f10-7f92df6105bd	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 4, "goroutine_id": 3}	2025-06-22 18:16:09.717067+00	12	b564191d-8c60-41c4-aa90-0280a993bc4a	\N	campaign_state	null	2025-06-22 18:16:09.720595+00
24700520-5485-47f8-a264-a02ed21fbf7d	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 1, "goroutine_id": 4}	2025-06-22 18:16:09.74325+00	13	727c4784-e6e2-4a47-8dbe-6c6652d03235	\N	campaign_state	null	2025-06-22 18:16:09.743406+00
a0dddddf-c420-4f35-b40d-5634e010bd03	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 2, "goroutine_id": 4}	2025-06-22 18:16:09.755948+00	14	46f6fbb2-0802-48f8-840c-3da0542ab065	\N	campaign_state	null	2025-06-22 18:16:09.756051+00
793698e3-df6a-40fa-98d4-e68b4cd69803	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 3, "goroutine_id": 4}	2025-06-22 18:16:09.761334+00	15	d6060fdc-4005-4a5a-80a6-7fc19dc5cbeb	\N	campaign_state	null	2025-06-22 18:16:09.761446+00
a16c68bd-0603-45e0-8022-8100b3aecf8d	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 4, "goroutine_id": 4}	2025-06-22 18:16:09.766997+00	16	91bf09a2-a179-4fd4-b284-28108f87dc37	\N	campaign_state	null	2025-06-22 18:16:09.767017+00
0ccc5b86-7186-441e-89fa-4bbc97826b50	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 1, "goroutine_id": 9}	2025-06-22 18:16:09.812834+00	17	5e79a4a3-67c6-4202-b28a-212a6c2f80ed	\N	campaign_state	null	2025-06-22 18:16:09.812962+00
8b67f8bc-4212-4e6e-aa17-907ad7f2823a	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 2, "goroutine_id": 9}	2025-06-22 18:16:09.824309+00	18	1159025f-e33b-4096-a630-8076859abbb3	\N	campaign_state	null	2025-06-22 18:16:09.824449+00
47c251c3-fe75-4a32-b4af-7bf71e3b0adc	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 3, "goroutine_id": 9}	2025-06-22 18:16:09.867436+00	19	5bac84d6-0fb7-43cb-a087-374149e4fe31	\N	campaign_state	null	2025-06-22 18:16:09.867535+00
5b6d6ef6-7380-4b73-a01c-8e5627b69bb6	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 0, "goroutine_id": 6}	2025-06-22 18:16:09.9055+00	20	2030c10b-1b49-4a97-8cf1-510f273bc18c	\N	campaign_state	null	2025-06-22 18:16:09.905523+00
aeb18401-8dc8-41c9-95df-0699cff54f09	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 1, "goroutine_id": 6}	2025-06-22 18:16:09.915865+00	21	4392441e-edab-416b-a9d5-6d49ce069b01	\N	campaign_state	null	2025-06-22 18:16:09.915966+00
c2bd1d9d-3a4e-482c-9676-e2995139c05b	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616169, "update_id": 2, "goroutine_id": 6}	2025-06-22 18:16:09.925829+00	22	5ced2f27-f8d3-4955-93f2-0f568417949a	\N	campaign_state	null	2025-06-22 18:16:09.925948+00
8efd268e-cb9c-401c-a759-629fe17246b5	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 3, "goroutine_id": 6}	2025-06-22 18:16:10.010492+00	23	1f1705f7-37e0-46e7-8b20-6ff08b990982	\N	campaign_state	null	2025-06-22 18:16:10.010693+00
82379e14-69e0-471f-a031-52e084927ca4	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 4, "goroutine_id": 6}	2025-06-22 18:16:10.04692+00	24	5ad70ac3-b5bc-4a62-9dd1-b1b655b6905c	\N	campaign_state	null	2025-06-22 18:16:10.047184+00
281fe039-d3c7-4d1d-af1f-134fe00cd21a	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 0, "goroutine_id": 1}	2025-06-22 18:16:10.103493+00	25	79e4b5fc-9174-4051-8018-3d03f4710ad9	\N	campaign_state	null	2025-06-22 18:16:10.103637+00
847669e2-94ec-4db2-a802-a64a1d06465e	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 1, "goroutine_id": 1}	2025-06-22 18:16:10.111916+00	26	4e944b59-3c5f-48e9-9d3a-a2c5af20e3ed	\N	campaign_state	null	2025-06-22 18:16:10.112116+00
731b988b-7f56-45bc-a68b-170b94046f1c	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 0, "goroutine_id": 0}	2025-06-22 18:16:10.154363+00	27	532d333f-4564-433e-a47e-1edcb90a694c	\N	campaign_state	null	2025-06-22 18:16:10.154793+00
df72b3ac-da40-405e-a208-012c974e81a1	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 1, "goroutine_id": 0}	2025-06-22 18:16:10.169626+00	28	279a1dc0-cf68-417d-af5b-834e967749f9	\N	campaign_state	null	2025-06-22 18:16:10.169907+00
421f0d2a-1b06-4254-a47b-b48b7ff1a1a3	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 2, "goroutine_id": 0}	2025-06-22 18:16:10.179857+00	29	da33fd31-538a-448b-b64d-de844e39f0b4	\N	campaign_state	null	2025-06-22 18:16:10.18007+00
cc312005-c50c-4820-a61e-3f8b1141f148	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 3, "goroutine_id": 0}	2025-06-22 18:16:10.189386+00	30	e582780b-138c-4989-8c24-84d10de3829c	\N	campaign_state	null	2025-06-22 18:16:10.189672+00
df41865f-e347-44b0-a8d4-14db206718a8	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 4, "goroutine_id": 0}	2025-06-22 18:16:10.229027+00	31	1fbb316f-e6a6-4acb-975a-3f67b5b42342	\N	campaign_state	null	2025-06-22 18:16:10.229136+00
8112f3e2-db5d-426a-bc8f-484dd2bd1ae7	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 2, "goroutine_id": 1}	2025-06-22 18:16:10.266429+00	32	8c30984b-0235-4011-8837-a235b9e6aaed	\N	campaign_state	null	2025-06-22 18:16:10.266501+00
a9a668a0-3d8e-4738-8cd6-dd5ad3e0e883	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 3, "goroutine_id": 1}	2025-06-22 18:16:10.274017+00	33	7b131217-3d9d-45f7-9bc2-cdcc2f87c4ce	\N	campaign_state	null	2025-06-22 18:16:10.274135+00
da498d9c-a745-4db3-892c-9f6d6061be03	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 4, "goroutine_id": 1}	2025-06-22 18:16:10.280044+00	34	c7bfb367-623a-456f-94b7-755d17157996	\N	campaign_state	null	2025-06-22 18:16:10.280162+00
bb993e09-658d-4c54-a301-41fc3e559a09	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 0, "goroutine_id": 2}	2025-06-22 18:16:10.326969+00	35	2c312a6f-7927-4ac6-8414-dbc9b212624c	\N	campaign_state	null	2025-06-22 18:16:10.327062+00
31b156de-0007-4960-86e0-3662a2a02757	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 1, "goroutine_id": 2}	2025-06-22 18:16:10.3407+00	36	b5d5e759-3131-4eb1-b046-1713806087d3	\N	campaign_state	null	2025-06-22 18:16:10.343562+00
67f1245a-d3ab-4fd0-a896-45f6e2d92abd	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 2, "goroutine_id": 2}	2025-06-22 18:16:10.384885+00	37	123d2f3e-344d-45d8-9bde-58b481ef7803	\N	campaign_state	null	2025-06-22 18:16:10.384904+00
04b8c950-91c1-484f-b842-d04a36d5e0f6	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 3, "goroutine_id": 2}	2025-06-22 18:16:10.390976+00	38	00e51fcc-18f5-4c8e-bad3-6d58c22d6e37	\N	campaign_state	null	2025-06-22 18:16:10.390994+00
de644f6b-de09-45e8-98d7-6f428c73f957	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 4, "goroutine_id": 2}	2025-06-22 18:16:10.399225+00	39	223e6350-93f3-4f63-ae35-2edd4a71de96	\N	campaign_state	null	2025-06-22 18:16:10.399239+00
37166525-3332-43f5-b5f1-e48c5e767d93	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 1, "goroutine_id": 5}	2025-06-22 18:16:10.491844+00	40	22f2ecfa-0513-430e-916d-053b2dc66f0a	\N	campaign_state	null	2025-06-22 18:16:10.491942+00
a59d36ca-c08e-4c1b-b0f8-d4fde7ae1f86	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 2, "goroutine_id": 8}	2025-06-22 18:16:10.520231+00	41	242dd2ca-2149-4c2f-9564-f0fa04bf8e5a	\N	campaign_state	null	2025-06-22 18:16:10.520342+00
8fec9411-d600-42b7-840b-537de5509baa	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 3, "goroutine_id": 8}	2025-06-22 18:16:10.53795+00	42	b599f9b5-bbb2-4173-af02-bb6f3b9e5538	\N	campaign_state	null	2025-06-22 18:16:10.538099+00
8173234d-1d96-47be-b6f7-715c99f5d8c5	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 4, "goroutine_id": 8}	2025-06-22 18:16:10.551613+00	43	b2ed8fc5-4d07-4a47-8d1e-0f32cb103cdc	\N	campaign_state	null	2025-06-22 18:16:10.551632+00
6efb375c-b2b1-4b8d-a739-23f0cef5f29b	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 2, "goroutine_id": 5}	2025-06-22 18:16:10.625486+00	44	8201acf6-d691-4ba4-814e-1e303882eb6c	\N	campaign_state	null	2025-06-22 18:16:10.62562+00
9aa7ee60-8d49-4ebf-b24a-cc9fa4d50284	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 3, "goroutine_id": 5}	2025-06-22 18:16:10.633473+00	45	170dad88-0bac-4339-a673-e0b45c315fbf	\N	campaign_state	null	2025-06-22 18:16:10.633829+00
87e3d1ea-bc3d-4c42-8ba9-8c97f1e61e55	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 4, "goroutine_id": 5}	2025-06-22 18:16:10.658127+00	46	b7a2933b-a880-4a99-a234-dd89a617f2e1	\N	campaign_state	null	2025-06-22 18:16:10.658143+00
ffde63c2-6a14-4c90-a3dc-b626f49dff7c	cbf6764d-de08-4075-8b0e-c97fc571d31b	concurrent_update	{"timestamp": 1750616170, "update_id": 4, "goroutine_id": 9}	2025-06-22 18:16:10.794458+00	47	5f99ae67-6c14-4f2c-9a29-7fc9ce0bad50	\N	campaign_state	null	2025-06-22 18:16:10.794496+00
f2fecbff-f348-4fd1-84f2-23c22ec2f808	fd91b9c1-3909-4342-a119-f5fa15e3f52e	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 18:11:11.007863+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 18:16:11.007898+00
03880486-e731-41a4-809c-fdd363717663	fd91b9c1-3909-4342-a119-f5fa15e3f52e	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 18:12:11.007864+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 18:16:11.012222+00
3ddfb5ea-93e3-465f-afc3-80c47cd33320	fd91b9c1-3909-4342-a119-f5fa15e3f52e	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 18:13:11.007865+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 18:16:11.014353+00
199c3b71-2c8b-4c79-9a7a-de049e273721	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 19, "new_version": 2, "old_version": 1}	2025-06-22 18:16:11.080361+00	2	f5f884be-9601-4732-8224-0b05a9c98417	\N	campaign_state	null	2025-06-22 18:16:11.080394+00
51b9960b-36e2-43ed-8fa0-7af74a04810d	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 3, "new_version": 3, "old_version": 2}	2025-06-22 18:16:11.095976+00	3	8399ef54-4be3-4b33-93d3-a5371d2dd007	\N	campaign_state	null	2025-06-22 18:16:11.097106+00
7566c81e-cb61-46d0-b8b2-e6e3ea6a796c	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 10, "new_version": 4, "old_version": 3}	2025-06-22 18:16:11.194171+00	4	ee1295fd-570a-4dd2-b3eb-4633e3817454	\N	campaign_state	null	2025-06-22 18:16:11.19436+00
4245fa50-637d-474a-a4f2-e2e8a95c62dc	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 0, "new_version": 5, "old_version": 4}	2025-06-22 18:16:11.228873+00	5	fbe877de-7c8b-45ab-bdc7-3ff279c180c9	\N	campaign_state	null	2025-06-22 18:16:11.228967+00
a62f467d-5afd-48fa-adde-c048b3f4a8d2	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 14, "new_version": 6, "old_version": 5}	2025-06-22 18:16:11.241646+00	6	f101effb-ba44-4280-8e2e-43e7a5df0ac1	\N	campaign_state	null	2025-06-22 18:16:11.242024+00
0c70eb96-465f-4fc8-93cf-3a324712e8ca	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 4, "new_version": 7, "old_version": 6}	2025-06-22 18:16:11.250486+00	7	fefdfd42-dd09-4276-9603-b6fd77d9d145	\N	campaign_state	null	2025-06-22 18:16:11.250647+00
962b58fb-138e-422b-a664-716fea6eda46	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 6, "new_version": 8, "old_version": 7}	2025-06-22 18:16:11.30179+00	8	f388ddea-63e6-4cd3-a969-fa2dc09f3eaf	\N	campaign_state	null	2025-06-22 18:16:11.302385+00
6037e00e-8ffb-48ab-b6e3-365eb3ef66ca	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 2, "new_version": 9, "old_version": 8}	2025-06-22 18:16:11.381321+00	9	8a46239d-558c-4d0c-b600-71cacb123a27	\N	campaign_state	null	2025-06-22 18:16:11.381337+00
ebccd2e5-8e77-49d8-90e6-0e583302b810	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 12, "new_version": 10, "old_version": 9}	2025-06-22 18:16:11.396146+00	10	62dfa702-46e5-43d2-8b1f-0dee1d2fa4a9	\N	campaign_state	null	2025-06-22 18:16:11.396271+00
c9871bd2-5247-4578-a9e3-48801f658f5f	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 7, "new_version": 11, "old_version": 10}	2025-06-22 18:16:11.422254+00	11	75dcbefb-3657-47d7-afa9-ec2c5865a238	\N	campaign_state	null	2025-06-22 18:16:11.422281+00
80c58263-c074-4faa-a469-afb798bd5403	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 5, "new_version": 12, "old_version": 11}	2025-06-22 18:16:11.49+00	12	b6cc57b7-10ed-4b5c-8961-03a0a08ef8ab	\N	campaign_state	null	2025-06-22 18:16:11.49041+00
b1edac20-dd85-46a3-af8f-f5d1d63db82c	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 9, "new_version": 13, "old_version": 12}	2025-06-22 18:16:11.500811+00	13	04dcd029-7ad0-488c-b5b2-df0ffcbfef51	\N	campaign_state	null	2025-06-22 18:16:11.501027+00
9d14abd5-96f9-4410-a7c5-e6b7fb0c9bcf	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 17, "new_version": 14, "old_version": 13}	2025-06-22 18:16:11.519525+00	14	27e18d2c-7e8e-4642-9ce2-b8508cbc4efd	\N	campaign_state	null	2025-06-22 18:16:11.519865+00
5615fd3f-26c2-4cee-932c-572322dd56ba	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 16, "new_version": 15, "old_version": 14}	2025-06-22 18:16:11.601429+00	15	760dd628-ab37-47c0-9941-793f8b58c394	\N	campaign_state	null	2025-06-22 18:16:11.601682+00
f99b25cb-a4e1-4834-a55b-0f7542c7f5af	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 8, "new_version": 16, "old_version": 15}	2025-06-22 18:16:11.617363+00	16	23cb6731-27ee-4e5a-a4e8-c691db89f3da	\N	campaign_state	null	2025-06-22 18:16:11.617468+00
861a01f5-bd59-4926-82b2-d97272ad344e	4f44e8ea-d235-4cd4-80ba-70504689bb34	race_condition_test	{"update_id": 15, "new_version": 17, "old_version": 16}	2025-06-22 18:16:11.711956+00	17	35b6f43f-f6e5-4d9c-919f-60f1c8a00d94	\N	campaign_state	null	2025-06-22 18:16:11.711988+00
7872e642-72ec-407b-941e-c13880d09124	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624412, "update_id": 0, "goroutine_id": 7}	2025-06-22 20:33:32.948897+00	2	47c7af2a-e792-4536-9472-b75eba2c5324	\N	campaign_state	null	2025-06-22 20:33:32.94918+00
1bd81ff2-1fae-4b8d-8fea-74422133a586	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 1, "goroutine_id": 7}	2025-06-22 20:33:33.002517+00	3	77b97197-3643-4096-ad71-09a96ca557ab	\N	campaign_state	null	2025-06-22 20:33:33.002825+00
1b2a311e-2bc1-4c14-8d27-0842116c55de	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 2, "goroutine_id": 7}	2025-06-22 20:33:33.008346+00	4	bd42f1f8-ebba-40d4-878f-61be2086c0e6	\N	campaign_state	null	2025-06-22 20:33:33.008443+00
9a1ba462-1127-4261-98db-c9b85479ddf9	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 3, "goroutine_id": 7}	2025-06-22 20:33:33.013315+00	5	d8bbaf3e-3ca2-4849-8225-9e703d907436	\N	campaign_state	null	2025-06-22 20:33:33.013412+00
c2dcc07b-ed0d-4bd1-9cfa-e9fba4892e8d	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 4, "goroutine_id": 7}	2025-06-22 20:33:33.028152+00	6	57d347e4-f57f-474f-b4b1-7a7f67b1660f	\N	campaign_state	null	2025-06-22 20:33:33.028373+00
5a61a5af-c2f1-41b4-86cf-5e5f86d8e9f7	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 0, "goroutine_id": 5}	2025-06-22 20:33:33.068729+00	7	dba0c537-35d6-4cdd-b7f9-4ef8e900b810	\N	campaign_state	null	2025-06-22 20:33:33.086648+00
4ca5449a-e9dc-4460-a3f7-46978b3101f2	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 1, "goroutine_id": 5}	2025-06-22 20:33:33.097584+00	8	d910fac7-1139-45f3-a397-13a14444b85f	\N	campaign_state	null	2025-06-22 20:33:33.097889+00
84721f7c-693a-4867-af03-dfeb0f40dcf2	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 0, "goroutine_id": 3}	2025-06-22 20:33:33.12935+00	9	2219814d-fda4-40ca-ba92-8402d00ee6b2	\N	campaign_state	null	2025-06-22 20:33:33.129455+00
fd4fa4e1-4058-4e91-aa80-61d185d4cbae	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 1, "goroutine_id": 3}	2025-06-22 20:33:33.138592+00	10	bd775426-33d9-4b7f-a041-3587e03116ca	\N	campaign_state	null	2025-06-22 20:33:33.138617+00
6227246a-9ae7-4bf4-9f58-7548b812faa4	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 2, "goroutine_id": 3}	2025-06-22 20:33:33.145211+00	11	26085e1e-f6f6-4f86-8d52-ff3c82095b08	\N	campaign_state	null	2025-06-22 20:33:33.145338+00
8203e3a6-6759-4836-9f56-aa1c4e405502	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 3, "goroutine_id": 3}	2025-06-22 20:33:33.152405+00	12	e75d458e-70c5-4384-8552-b4a3254829f4	\N	campaign_state	null	2025-06-22 20:33:33.152512+00
2099eeae-5be4-45e0-bdb4-0a1099986b86	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 4, "goroutine_id": 3}	2025-06-22 20:33:33.203281+00	13	5b9b28b3-f7d9-4daa-a18e-960a1b3b5ac3	\N	campaign_state	null	2025-06-22 20:33:33.203327+00
b1d5a201-9899-4a18-a644-3781b41d7fd9	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 1, "goroutine_id": 1}	2025-06-22 20:33:33.222767+00	14	9d957146-43ed-49e4-aee4-cf0c677dda2b	\N	campaign_state	null	2025-06-22 20:33:33.223062+00
282ce5ac-3eea-4f72-8b1f-145938b59f2b	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 2, "goroutine_id": 1}	2025-06-22 20:33:33.230929+00	15	af68de45-a167-45c1-a03f-040f19fe53b4	\N	campaign_state	null	2025-06-22 20:33:33.231038+00
ce2075e2-8abd-47a5-a0cc-c561bc158daa	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 3, "goroutine_id": 1}	2025-06-22 20:33:33.263367+00	16	3215a1a3-8dcc-41b1-bc7b-0cf263c0a707	\N	campaign_state	null	2025-06-22 20:33:33.263471+00
17a7165b-b1c1-467c-bdad-6cbef9f96b94	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 4, "goroutine_id": 1}	2025-06-22 20:33:33.291786+00	17	0957b6fd-597b-4812-8bfd-66a3649f73fe	\N	campaign_state	null	2025-06-22 20:33:33.293729+00
34714553-a2e4-4ead-96a6-c71bb9699675	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 2, "goroutine_id": 2}	2025-06-22 20:33:33.30203+00	18	210f2fbd-c5a0-41b5-838a-33efbe1e94fd	\N	campaign_state	null	2025-06-22 20:33:33.302136+00
331d357a-33ea-4bf2-842d-afefe4371060	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 3, "goroutine_id": 2}	2025-06-22 20:33:33.313265+00	19	3184029b-caca-4e84-b2d8-1f1508595ade	\N	campaign_state	null	2025-06-22 20:33:33.313363+00
8a725dcb-b5aa-4a51-b676-486959a79ef7	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 4, "goroutine_id": 2}	2025-06-22 20:33:33.342508+00	20	ec8ba40e-b935-494a-a718-395dd31c935c	\N	campaign_state	null	2025-06-22 20:33:33.342624+00
5746593b-cdc0-4429-a135-77bad2d519e3	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 2, "goroutine_id": 5}	2025-06-22 20:33:33.364977+00	21	055bfc7c-bfee-4efe-84fa-51a6bdf610ab	\N	campaign_state	null	2025-06-22 20:33:33.365096+00
3d16e55f-c92b-46dd-9822-f89300c7dd3f	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 3, "goroutine_id": 5}	2025-06-22 20:33:33.393276+00	22	69b86e6d-7ab6-4e09-aed6-48fd02276d8f	\N	campaign_state	null	2025-06-22 20:33:33.396317+00
9012d6e6-3298-4558-89f1-ebcfffbcd786	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 0, "goroutine_id": 6}	2025-06-22 20:33:33.402519+00	23	dd0d47f7-f3d1-4299-84c4-3920ca4f19e5	\N	campaign_state	null	2025-06-22 20:33:33.402576+00
4ccb3a8c-efe6-4ecd-a450-34d7a33ed929	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 1, "goroutine_id": 6}	2025-06-22 20:33:33.409294+00	24	ecc488ac-dfd6-43d9-a928-2b6b670b8b79	\N	campaign_state	null	2025-06-22 20:33:33.409404+00
77bed804-6a38-49bc-a958-67dcbe5f3e04	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 2, "goroutine_id": 6}	2025-06-22 20:33:33.418872+00	25	5ab14da2-e3d7-4064-96ef-cee97db21c99	\N	campaign_state	null	2025-06-22 20:33:33.419017+00
f9029b54-3962-4c19-90eb-3f5fecfb1da1	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 3, "goroutine_id": 6}	2025-06-22 20:33:33.44568+00	26	f0a033fe-3fc9-4fd1-9be6-7a4f22394f60	\N	campaign_state	null	2025-06-22 20:33:33.447683+00
a4e15edc-da62-4b38-ac95-94d736f5f653	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 4, "goroutine_id": 6}	2025-06-22 20:33:33.472591+00	27	baaf382f-b37b-42a2-b62a-2cce49fcfb08	\N	campaign_state	null	2025-06-22 20:33:33.472679+00
c0168b7d-d3e1-4f8e-a9e1-7ce9425b86ba	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 0, "goroutine_id": 4}	2025-06-22 20:33:33.516186+00	28	51b4eca8-a61f-43ef-ac63-b8a00cce4923	\N	campaign_state	null	2025-06-22 20:33:33.516216+00
24a0380f-f87a-4fae-8b2a-428ad9bedf70	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 1, "goroutine_id": 4}	2025-06-22 20:33:33.540535+00	29	ad3cd259-a471-4367-9224-f095cc05a814	\N	campaign_state	null	2025-06-22 20:33:33.542359+00
329f89fe-e64a-4065-9001-9b80dfb56eb2	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 2, "goroutine_id": 4}	2025-06-22 20:33:33.549868+00	30	0cc55d1d-2834-4a40-a473-4f11099553f5	\N	campaign_state	null	2025-06-22 20:33:33.549988+00
3b1ea362-f3f8-486b-8529-8c44018a619b	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 3, "goroutine_id": 4}	2025-06-22 20:33:33.557143+00	31	c60a70b3-06a2-4baa-bb58-fbaaff3c542c	\N	campaign_state	null	2025-06-22 20:33:33.557292+00
1cff9b20-fddb-46da-94b3-897890dd703b	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 4, "goroutine_id": 4}	2025-06-22 20:33:33.565213+00	32	4cce16d8-f841-49ba-82c9-90422653ba64	\N	campaign_state	null	2025-06-22 20:33:33.565341+00
0fc59ab3-7177-4cc2-be19-199d2bb5f5e8	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 4, "goroutine_id": 5}	2025-06-22 20:33:33.613888+00	33	fd1c8b26-cfb9-424b-9338-38deb9f2472f	\N	campaign_state	null	2025-06-22 20:33:33.614015+00
a24fcf45-6507-460e-875d-b19d3acd9373	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 0, "goroutine_id": 8}	2025-06-22 20:33:33.648096+00	34	1d6045e6-3d95-4bbb-8586-286ce1cb0521	\N	campaign_state	null	2025-06-22 20:33:33.648128+00
c21723e9-9415-472b-9d3d-9d3a2cff87c2	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 1, "goroutine_id": 8}	2025-06-22 20:33:33.663503+00	35	ba634e01-6fb3-4dcb-961b-422340430432	\N	campaign_state	null	2025-06-22 20:33:33.664209+00
6c97f317-49d2-494c-9c03-761726ea40d7	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 2, "goroutine_id": 8}	2025-06-22 20:33:33.689319+00	36	b7c8d943-e18f-434d-885b-129430459f62	\N	campaign_state	null	2025-06-22 20:33:33.689474+00
3a52de44-ce5f-445f-bf31-2cba35e217d3	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 3, "goroutine_id": 8}	2025-06-22 20:33:33.70883+00	37	e0549531-423d-43c0-8296-9f4d210dd3b3	\N	campaign_state	null	2025-06-22 20:33:33.708955+00
efcb675d-911d-463d-a92e-4ae6a283beca	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 4, "goroutine_id": 8}	2025-06-22 20:33:33.729697+00	38	c02d9fd1-2041-4bd9-b537-444d5a605cd0	\N	campaign_state	null	2025-06-22 20:33:33.729942+00
59efc998-4d18-46f9-8bdd-d44bd67ee8f3	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 0, "goroutine_id": 9}	2025-06-22 20:33:33.789869+00	39	5635b4b9-959f-4acf-b093-e8d65f7fb53f	\N	campaign_state	null	2025-06-22 20:33:33.789998+00
b2983945-2e1e-469c-afdd-72b4964fff09	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 1, "goroutine_id": 9}	2025-06-22 20:33:33.797446+00	40	b640978b-95fb-42f9-a691-3955a4900e91	\N	campaign_state	null	2025-06-22 20:33:33.797575+00
ae3c9d4f-b7f7-4fb5-82c2-0788af6f6f1f	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 2, "goroutine_id": 9}	2025-06-22 20:33:33.818587+00	41	54c599cf-3d85-46b6-8162-25f6fcfad7f7	\N	campaign_state	null	2025-06-22 20:33:33.818827+00
64fc2874-e5a6-45e4-8864-60bc4fc399c1	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 3, "goroutine_id": 9}	2025-06-22 20:33:33.851822+00	42	7850f89f-01ef-4bd5-aa71-24e39f1aea85	\N	campaign_state	null	2025-06-22 20:33:33.851935+00
564fc8bd-f81e-4e9c-a6cb-fca7c5c80876	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 4, "goroutine_id": 9}	2025-06-22 20:33:33.858306+00	43	b60b7c68-3aa8-4b2f-987a-4617dfcd03de	\N	campaign_state	null	2025-06-22 20:33:33.858431+00
48c9e572-8c7a-4eb6-8726-665e503a4713	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 0, "goroutine_id": 0}	2025-06-22 20:33:33.957901+00	44	4025ade2-514f-467e-9db4-aeafeeab0a07	\N	campaign_state	null	2025-06-22 20:33:33.957965+00
2e1428bf-e97e-4cdf-8bc0-40d6bee68d80	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624413, "update_id": 1, "goroutine_id": 0}	2025-06-22 20:33:33.978007+00	45	7359645c-4f4e-4c71-bb03-63781e97755e	\N	campaign_state	null	2025-06-22 20:33:33.978131+00
6986f1ae-c07d-4bdd-aaf0-d9b2d780fab6	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624414, "update_id": 2, "goroutine_id": 0}	2025-06-22 20:33:34.00324+00	46	5038272e-a709-4b09-9e3b-e78ff6538fd6	\N	campaign_state	null	2025-06-22 20:33:34.003281+00
9b1bce93-98fc-4569-b267-89a5d2d7ed08	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624414, "update_id": 3, "goroutine_id": 0}	2025-06-22 20:33:34.009137+00	47	e5ec27e6-e1c8-4cd3-8b2d-cea9e447f617	\N	campaign_state	null	2025-06-22 20:33:34.009288+00
f59b3ad8-44f8-43e0-904c-6b20197c7515	762ee366-2c78-41b6-8d78-dd865988a315	concurrent_update	{"timestamp": 1750624414, "update_id": 4, "goroutine_id": 0}	2025-06-22 20:33:34.015532+00	48	ba70c653-232a-4b1a-b51f-a93cfe6deb0b	\N	campaign_state	null	2025-06-22 20:33:34.015709+00
5ea23833-8298-4382-b849-e126997f9a51	718bdb50-1479-4c20-b3ad-5e86672afa52	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 20:28:34.205421+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 20:33:34.205533+00
07f0fdc5-c839-4dab-81f6-5b6be2078ad8	718bdb50-1479-4c20-b3ad-5e86672afa52	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 20:29:34.205422+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 20:33:34.21797+00
4d602f8b-491b-4e49-8559-1401ae5d3d62	718bdb50-1479-4c20-b3ad-5e86672afa52	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 20:30:34.205423+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 20:33:34.234334+00
5049b86b-9919-4b21-9938-f40ef28bae54	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 0, "new_version": 2, "old_version": 1}	2025-06-22 20:33:34.341083+00	2	772257c2-66ea-4c85-827d-74ce7c355cfb	\N	campaign_state	null	2025-06-22 20:33:34.341186+00
e236f7f8-2d62-4649-85b6-80c1890a1ea0	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 5, "new_version": 3, "old_version": 2}	2025-06-22 20:33:34.391909+00	3	7b245998-8c5b-4c79-9709-e5746a1c39f9	\N	campaign_state	null	2025-06-22 20:33:34.394206+00
9cf4d3e8-e057-4f5e-82f6-5403363cbf93	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 7, "new_version": 4, "old_version": 3}	2025-06-22 20:33:34.444608+00	4	4aebcb0b-1087-4028-9f7c-53e517a473e1	\N	campaign_state	null	2025-06-22 20:33:34.444942+00
e8e0b65e-59fc-4232-9d14-0c91e386d118	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 9, "new_version": 5, "old_version": 4}	2025-06-22 20:33:34.456727+00	5	2996b21e-1caf-41fa-b19a-89bb40962feb	\N	campaign_state	null	2025-06-22 20:33:34.457037+00
e83e6bab-7541-4d1a-b74b-a1ab060ec4a4	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 6, "new_version": 6, "old_version": 5}	2025-06-22 20:33:34.465195+00	6	dacc5f69-ef96-4bbf-b522-734f56ad6075	\N	campaign_state	null	2025-06-22 20:33:34.465316+00
42bc3b18-0df5-4544-b9cb-8b1ae5ec283b	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 15, "new_version": 7, "old_version": 6}	2025-06-22 20:33:34.513495+00	7	b3fa4feb-d1f0-43a8-b3f6-fd5c3bdb0435	\N	campaign_state	null	2025-06-22 20:33:34.513847+00
1d981f97-50f2-4375-9ad0-c243a2b581c7	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 12, "new_version": 8, "old_version": 7}	2025-06-22 20:33:34.570656+00	8	06c20565-9c47-4340-b38a-99fefca3be81	\N	campaign_state	null	2025-06-22 20:33:34.570887+00
598d041c-5611-47af-9d64-e4c417585965	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 8, "new_version": 9, "old_version": 8}	2025-06-22 20:33:34.589087+00	9	cce18232-0a71-4483-86e9-36730ee4a679	\N	campaign_state	null	2025-06-22 20:33:34.589313+00
4c17e5ee-1fa3-4213-b806-2ae8b454bf4c	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 2, "new_version": 10, "old_version": 9}	2025-06-22 20:33:34.601254+00	10	730b787c-2782-474c-ba96-994a5360de77	\N	campaign_state	null	2025-06-22 20:33:34.601383+00
8fa96a5a-2c67-4934-9956-8cc62a2c95b4	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 10, "new_version": 11, "old_version": 10}	2025-06-22 20:33:34.644798+00	11	7d1d9cfb-9897-4267-9d60-e9cb7e7526cf	\N	campaign_state	null	2025-06-22 20:33:34.644832+00
8c77a91e-efd3-473a-92e7-c93642972fbc	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 14, "new_version": 12, "old_version": 11}	2025-06-22 20:33:34.678793+00	12	b6a3670d-71ad-4f4d-94a5-c213b11e828c	\N	campaign_state	null	2025-06-22 20:33:34.678997+00
5f156ffd-86bb-45f7-9dd3-6267bfea8bf2	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 17, "new_version": 13, "old_version": 12}	2025-06-22 20:33:34.695093+00	13	28407e12-562e-4561-ac59-62370e10d12f	\N	campaign_state	null	2025-06-22 20:33:34.695287+00
4bd7da69-7c2f-4f71-afc6-453b495940ef	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 18, "new_version": 14, "old_version": 13}	2025-06-22 20:33:34.714994+00	14	20e83574-d632-4482-8ca1-a9dee749bc62	\N	campaign_state	null	2025-06-22 20:33:34.715157+00
4da9e640-d8da-4c53-8887-aa49c8e1650c	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 3, "new_version": 15, "old_version": 14}	2025-06-22 20:33:34.740584+00	15	341900fd-0931-4216-817b-d10285224d87	\N	campaign_state	null	2025-06-22 20:33:34.741062+00
79347d28-ebcf-4b81-a489-66bb65671e9d	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 1, "new_version": 16, "old_version": 15}	2025-06-22 20:33:34.800921+00	16	e61632c9-6c90-4256-883e-e948aec1b066	\N	campaign_state	null	2025-06-22 20:33:34.801213+00
83a7e642-3b27-4447-80d4-8009c9422441	8844cabf-daee-40f7-bb5d-1be743182613	race_condition_test	{"update_id": 13, "new_version": 17, "old_version": 16}	2025-06-22 20:33:34.844961+00	17	2c69d5ab-af9a-49e4-bba9-bf4af71b60f3	\N	campaign_state	null	2025-06-22 20:33:34.845157+00
5efdaa64-9f0e-47ff-8ffb-7c7b241f3f8b	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 0, "goroutine_id": 8}	2025-06-22 20:36:15.227405+00	2	bda6c689-198f-4653-8abe-8d076a525334	\N	campaign_state	null	2025-06-22 20:36:15.228827+00
dbe8aaf9-56da-4564-8681-f70487c3def7	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 0, "goroutine_id": 4}	2025-06-22 20:36:15.241585+00	3	021f15b0-18bd-4efe-8093-6be4fd7c4267	\N	campaign_state	null	2025-06-22 20:36:15.241625+00
a84232f9-7e26-4f19-94d9-054c2f59bf36	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 1, "goroutine_id": 4}	2025-06-22 20:36:15.260677+00	4	dc33c169-4693-4258-b7ae-944d40b52eac	\N	campaign_state	null	2025-06-22 20:36:15.260714+00
bdb9c564-8ddb-490f-a13b-e58819494f64	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 0, "goroutine_id": 1}	2025-06-22 20:36:15.281665+00	5	edb657b6-b06f-44fe-978b-465a9fb118fe	\N	campaign_state	null	2025-06-22 20:36:15.281782+00
a69c12d4-bcfa-4df2-a6a5-b521b4781d2e	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 1, "goroutine_id": 1}	2025-06-22 20:36:15.290044+00	6	78f233b9-efc8-48e1-9c08-34d2623b88d7	\N	campaign_state	null	2025-06-22 20:36:15.290097+00
5a2b4e37-aaad-45b3-bd09-5db1bcab4ba7	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 2, "goroutine_id": 1}	2025-06-22 20:36:15.298039+00	7	a711e99a-b9f0-4b68-9655-51a55e44535f	\N	campaign_state	null	2025-06-22 20:36:15.298172+00
f55c3ca0-7557-4b54-bd99-2e28103726a9	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 3, "goroutine_id": 1}	2025-06-22 20:36:15.319514+00	8	e31762e6-cfdb-4eeb-90e7-cf5b7e2b65f5	\N	campaign_state	null	2025-06-22 20:36:15.319784+00
c36a142e-2a5d-46cb-81c0-647bb9d1a843	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 4, "goroutine_id": 1}	2025-06-22 20:36:15.341999+00	9	59e16dde-05c5-4c95-b004-e0ac5a0630ba	\N	campaign_state	null	2025-06-22 20:36:15.342027+00
69ffb83f-f00b-4e9b-945b-71326121e060	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 0, "goroutine_id": 6}	2025-06-22 20:36:15.383406+00	10	1c37d12f-a182-48b6-8426-985ffa5a0679	\N	campaign_state	null	2025-06-22 20:36:15.383438+00
04c7bf67-0ab0-4216-8e0b-430d5b78ed2b	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 1, "goroutine_id": 6}	2025-06-22 20:36:15.393197+00	11	93ca4374-9c9a-44a3-b521-00e0c534eebb	\N	campaign_state	null	2025-06-22 20:36:15.393221+00
749ede43-b197-4de9-b5c1-6e2125cc21c1	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 2, "goroutine_id": 6}	2025-06-22 20:36:15.397985+00	12	38cf31de-b6ab-4921-baf2-19c12d5cc1cf	\N	campaign_state	null	2025-06-22 20:36:15.39801+00
57c08af8-68af-4236-afba-d771fb660091	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 3, "goroutine_id": 6}	2025-06-22 20:36:15.425569+00	13	8560b919-99c2-4d8b-b20f-c1f6eee000a7	\N	campaign_state	null	2025-06-22 20:36:15.431603+00
292cc2c0-d344-407c-b49b-5fc62585159c	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 0, "goroutine_id": 2}	2025-06-22 20:36:15.440754+00	14	dcd3d12d-0203-4669-9343-facf8f48daa8	\N	campaign_state	null	2025-06-22 20:36:15.440856+00
1f1c86c2-ca0a-4a1c-bc3f-62b0a5cb11eb	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 0, "goroutine_id": 5}	2025-06-22 20:36:15.447882+00	15	e6beb840-678b-4c4a-a90e-318232d51aca	\N	campaign_state	null	2025-06-22 20:36:15.447905+00
6b53941c-d433-41bb-9071-ede412e72136	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 1, "goroutine_id": 5}	2025-06-22 20:36:15.465149+00	16	566b9dc9-ae1d-44cf-a264-db3266ba39c2	\N	campaign_state	null	2025-06-22 20:36:15.465365+00
6bac5524-e49c-4d19-9f0f-1defab5a1a87	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 2, "goroutine_id": 5}	2025-06-22 20:36:15.475691+00	17	7435f3bb-ca50-4b83-b680-23f9b896b92b	\N	campaign_state	null	2025-06-22 20:36:15.477561+00
b94cac1d-91ed-4337-846a-1c39f11f6a62	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 3, "goroutine_id": 5}	2025-06-22 20:36:15.485146+00	18	b188c8ac-b2e7-4782-85b6-a7b97c6893c8	\N	campaign_state	null	2025-06-22 20:36:15.485275+00
9f7cf5dd-5342-4c4d-a923-40cf61e68460	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 4, "goroutine_id": 5}	2025-06-22 20:36:15.510279+00	19	27202f6c-8cf6-4ab1-92c4-b0fed8dd8941	\N	campaign_state	null	2025-06-22 20:36:15.512159+00
84afdb8c-8d6a-44d9-a391-1fefedcda68e	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 0, "goroutine_id": 3}	2025-06-22 20:36:15.542281+00	20	9c7bf9f6-91cc-4d31-a958-896e1f946b17	\N	campaign_state	null	2025-06-22 20:36:15.542311+00
0294db49-5fd7-4a68-b82b-ecfc5e700f13	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 1, "goroutine_id": 3}	2025-06-22 20:36:15.549028+00	21	0c7f0a87-4e39-4318-bda6-6bd4d2a2feb3	\N	campaign_state	null	2025-06-22 20:36:15.549056+00
529acf0a-708e-41de-b778-3cf19b17e2b2	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 2, "goroutine_id": 3}	2025-06-22 20:36:15.584467+00	22	2828a758-4f62-42a2-b78b-9b44e2a7a9d0	\N	campaign_state	null	2025-06-22 20:36:15.584688+00
a9c2e324-de92-449f-aece-7b35870e36d4	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 3, "goroutine_id": 3}	2025-06-22 20:36:15.592176+00	23	8efda803-0024-418d-9bf1-f336aa435fa8	\N	campaign_state	null	2025-06-22 20:36:15.592334+00
58e71030-2bbb-4b5c-8137-a661c4f1ae8a	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 4, "goroutine_id": 3}	2025-06-22 20:36:15.633661+00	24	44590f1e-dbea-45d1-930b-2b312a331e02	\N	campaign_state	null	2025-06-22 20:36:15.634186+00
e9346127-2ca0-4e3a-ab7f-8e82a6145d92	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 1, "goroutine_id": 2}	2025-06-22 20:36:15.664104+00	25	9ed8568c-940c-4ef5-b81d-883196eed90a	\N	campaign_state	null	2025-06-22 20:36:15.664218+00
2d56e663-13a9-40a7-b388-63c8d8ee19a7	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 2, "goroutine_id": 2}	2025-06-22 20:36:15.670562+00	26	4d21a925-87ed-4934-bcd8-365129c8d1a2	\N	campaign_state	null	2025-06-22 20:36:15.670796+00
1029ca35-05ae-4c64-8cba-ba7d7d8236a4	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 3, "goroutine_id": 2}	2025-06-22 20:36:15.698006+00	27	2b33739f-4481-4fa3-a028-8f74c93a9a07	\N	campaign_state	null	2025-06-22 20:36:15.698225+00
fea97563-d224-40fb-abe6-82a1c64bc978	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 4, "goroutine_id": 2}	2025-06-22 20:36:15.732478+00	28	d9ada02f-be6f-4308-a11a-0e6202465d84	\N	campaign_state	null	2025-06-22 20:36:15.73282+00
d0ba6e39-ec42-4b58-82ec-ca03842392b2	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 1, "goroutine_id": 8}	2025-06-22 20:36:15.758645+00	29	48cc5b55-e0c1-49e2-8cd1-e9523b79864f	\N	campaign_state	null	2025-06-22 20:36:15.760688+00
9c239f35-fc0d-445e-8d47-85f53de60134	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 2, "goroutine_id": 8}	2025-06-22 20:36:15.786408+00	30	40c0812d-8047-411e-b62c-35573d454ce0	\N	campaign_state	null	2025-06-22 20:36:15.786529+00
aa5cd414-ceb6-47c1-8459-27309a0f0db3	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 3, "goroutine_id": 8}	2025-06-22 20:36:15.824534+00	31	25390138-d396-4170-9656-8935761da86b	\N	campaign_state	null	2025-06-22 20:36:15.824676+00
459491ba-eab6-4ad8-9ec0-4e90a9659a0b	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 2, "goroutine_id": 4}	2025-06-22 20:36:15.831529+00	32	a5b4f47e-0a2b-441e-86c5-0fc65d5464e8	\N	campaign_state	null	2025-06-22 20:36:15.831576+00
a240985e-7905-4563-9dfd-324bb70a5786	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 3, "goroutine_id": 4}	2025-06-22 20:36:15.8671+00	33	ae2f1749-37f5-4420-99b5-ecc9668041cf	\N	campaign_state	null	2025-06-22 20:36:15.867326+00
176b2dcf-a659-46cc-b808-104a31d959b0	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 4, "goroutine_id": 4}	2025-06-22 20:36:15.874965+00	34	ec6248e4-3af1-49be-a471-aaf5f11b1ea8	\N	campaign_state	null	2025-06-22 20:36:15.875065+00
b76da780-4d23-4a3b-8b05-80b5ca3096ce	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 0, "goroutine_id": 0}	2025-06-22 20:36:15.884006+00	35	93687898-1807-4e29-ab05-d9e1f62bea73	\N	campaign_state	null	2025-06-22 20:36:15.88417+00
116021c6-c645-474d-9ea7-c0bada9edf05	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 1, "goroutine_id": 0}	2025-06-22 20:36:15.912737+00	36	1246c868-5143-4a7e-86c1-3e9c71f883bf	\N	campaign_state	null	2025-06-22 20:36:15.912771+00
a38bd0b5-dac6-4317-b175-a8964da56a0c	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624575, "update_id": 2, "goroutine_id": 0}	2025-06-22 20:36:15.950514+00	37	7bef1d89-cb6e-484f-820d-bd8e58bd763e	\N	campaign_state	null	2025-06-22 20:36:15.993017+00
72fbc0a7-611a-4552-b2a9-9b672b7d2b50	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 3, "goroutine_id": 0}	2025-06-22 20:36:16.025071+00	38	9996d867-2efe-4812-a81a-8b419ea7d74d	\N	campaign_state	null	2025-06-22 20:36:16.025108+00
3d378ca0-549e-4ab7-a6c5-8ec9ee044a9b	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 4, "goroutine_id": 0}	2025-06-22 20:36:16.032041+00	39	72a3004c-2e6f-4deb-84fd-deaaf28a60e1	\N	campaign_state	null	2025-06-22 20:36:16.032183+00
08b87a80-33f3-4df8-83f3-3806847f4b08	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 0, "goroutine_id": 7}	2025-06-22 20:36:16.056566+00	40	7c8a2aa2-1b75-4749-a481-1e7c6b9fe0c2	\N	campaign_state	null	2025-06-22 20:36:16.056859+00
3dd9c1f7-7f28-4a4f-9e39-44067d53a22e	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 1, "goroutine_id": 7}	2025-06-22 20:36:16.061572+00	41	b59ede0e-c18c-4934-920e-e5bca4fd0901	\N	campaign_state	null	2025-06-22 20:36:16.0616+00
3ddea72c-4d9c-4d57-a214-7e6a4cc6e9b3	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 2, "goroutine_id": 7}	2025-06-22 20:36:16.068014+00	42	6f64bf4e-59d6-470d-a41e-9b5d9e4e2590	\N	campaign_state	null	2025-06-22 20:36:16.069894+00
5e8d59be-5665-4370-85c0-febf9129d98e	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 3, "goroutine_id": 7}	2025-06-22 20:36:16.101296+00	43	9520e171-0eb3-4257-bfba-9b6f7e764cd2	\N	campaign_state	null	2025-06-22 20:36:16.101322+00
eebc2732-0e1b-424a-8c89-e13976fbd912	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 4, "goroutine_id": 7}	2025-06-22 20:36:16.107553+00	44	d9c40f2f-345a-4431-bc85-dcde7c5ba5a2	\N	campaign_state	null	2025-06-22 20:36:16.107706+00
fd714a9d-fa2f-4d06-96e7-d2eda54a9bc2	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 0, "goroutine_id": 9}	2025-06-22 20:36:16.160754+00	45	aeba50df-f2d6-45cb-89b0-5eba02c4dc27	\N	campaign_state	null	2025-06-22 20:36:16.16089+00
7ab79e0c-b26b-45c8-bdcc-b63082d36452	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 1, "goroutine_id": 9}	2025-06-22 20:36:16.167178+00	46	8f59071c-ee86-46b2-8b2e-f12dc1ebbcef	\N	campaign_state	null	2025-06-22 20:36:16.167408+00
87923e7e-8a0d-4a64-87d1-93bb4a0c0c17	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 4, "goroutine_id": 8}	2025-06-22 20:36:16.204002+00	47	f701f331-2bbd-4cf3-827d-dfb04a4b8e7a	\N	campaign_state	null	2025-06-22 20:36:16.204034+00
d1ea0a55-62ab-4e83-89fc-093e44251cf9	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 4, "goroutine_id": 6}	2025-06-22 20:36:16.238989+00	48	ec7f21c6-8251-4300-b9e6-117500926bdc	\N	campaign_state	null	2025-06-22 20:36:16.239144+00
5163d313-0119-4b4d-8c84-6c62d2641bbe	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 2, "goroutine_id": 9}	2025-06-22 20:36:16.320076+00	49	cf3a9bc0-ea3b-4d66-b978-024760b26b62	\N	campaign_state	null	2025-06-22 20:36:16.323137+00
ec8b172f-642d-4468-b630-0c607f792869	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 3, "goroutine_id": 9}	2025-06-22 20:36:16.329083+00	50	5e689b9d-a59f-4d03-9dd6-64d28e6ba600	\N	campaign_state	null	2025-06-22 20:36:16.329112+00
3cf08dfa-9dee-44d6-86bf-877114327120	a7784123-784a-4e78-9388-9e32e9aceeec	concurrent_update	{"timestamp": 1750624576, "update_id": 4, "goroutine_id": 9}	2025-06-22 20:36:16.357228+00	51	0a739fe8-be48-4c60-96ac-1214d5578165	\N	campaign_state	null	2025-06-22 20:36:16.357358+00
070dbd81-7e5d-4a7a-8e42-b02674a8c834	4b876d82-15f6-4491-b025-0586cc613f25	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 20:31:16.556094+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 20:36:16.556188+00
2eaf41e7-4d59-477f-81b0-e00def4b4795	4b876d82-15f6-4491-b025-0586cc613f25	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 20:32:16.556144+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 20:36:16.587429+00
3401601d-a7b2-4724-bd4d-f658280d57c5	4b876d82-15f6-4491-b025-0586cc613f25	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 20:33:16.556146+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 20:36:16.593004+00
b8894d37-04a4-4c36-875a-7031cbc0b894	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 19, "new_version": 2, "old_version": 1}	2025-06-22 20:36:16.722449+00	2	6944252b-0df9-4045-8492-822923e779a2	\N	campaign_state	null	2025-06-22 20:36:16.722583+00
46d45243-9d17-4f58-8c0a-06af6382022a	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 11, "new_version": 3, "old_version": 2}	2025-06-22 20:36:16.771718+00	3	07cac293-0992-4673-a7ba-a1fcb25f11d6	\N	campaign_state	null	2025-06-22 20:36:16.772053+00
3f2d8060-f47e-4255-b07b-fd07a81191d9	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 16, "new_version": 4, "old_version": 3}	2025-06-22 20:36:16.823907+00	4	ee66356a-9382-4212-85c3-f9bdca7aa696	\N	campaign_state	null	2025-06-22 20:36:16.825237+00
046a0b0f-b916-4ee1-bdf0-1c8fa026f9a6	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 5, "new_version": 5, "old_version": 4}	2025-06-22 20:36:16.877447+00	5	c115a2a1-3c1d-4299-8097-c6f7bef91f0c	\N	campaign_state	null	2025-06-22 20:36:16.877595+00
2ed8b059-7201-434e-b7f9-19027c443db6	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 8, "new_version": 6, "old_version": 5}	2025-06-22 20:36:16.921574+00	6	9ce18f17-e2b9-449e-91cd-8aa1c78aadcc	\N	campaign_state	null	2025-06-22 20:36:16.924641+00
75fea736-8742-408b-bb3a-e3032fba1304	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 12, "new_version": 7, "old_version": 6}	2025-06-22 20:36:16.952286+00	7	6a9b55ab-d22e-430e-8505-d9438eacceda	\N	campaign_state	null	2025-06-22 20:36:16.952409+00
3d6ad1e3-14f1-4901-a5f2-68189407e8a2	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 10, "new_version": 8, "old_version": 7}	2025-06-22 20:36:16.993303+00	8	7b99794c-839f-4d89-b1a1-5bbdb54a107a	\N	campaign_state	null	2025-06-22 20:36:16.994506+00
775896c9-d757-44dc-a2e3-dbcf858ebb69	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 3, "new_version": 9, "old_version": 8}	2025-06-22 20:36:17.006056+00	9	0dfd911e-2a60-43a0-a559-39139e16224b	\N	campaign_state	null	2025-06-22 20:36:17.006201+00
056c6ac7-b111-4171-8414-2455755b30ae	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 1, "new_version": 10, "old_version": 9}	2025-06-22 20:36:17.060221+00	10	995c0873-bd17-4174-99c6-a7d5bf89dc50	\N	campaign_state	null	2025-06-22 20:36:17.060278+00
72ff74ae-c822-4688-b6a4-fbdd3c41d883	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 15, "new_version": 11, "old_version": 10}	2025-06-22 20:36:17.066342+00	11	8e41b3b8-6acc-484f-b8f9-f6c975b37ab4	\N	campaign_state	null	2025-06-22 20:36:17.066377+00
29d5adf0-f997-47b4-b013-d5a2d2053cbb	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 18, "new_version": 12, "old_version": 11}	2025-06-22 20:36:17.097013+00	12	a9ce46c6-e8dc-4f1b-8836-f706e006be5c	\N	campaign_state	null	2025-06-22 20:36:17.097127+00
65dbfdca-efe5-483e-89da-6f9c16584316	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 13, "new_version": 13, "old_version": 12}	2025-06-22 20:36:17.138631+00	13	d40bacd4-c15a-4813-92f0-3a43ddb464ce	\N	campaign_state	null	2025-06-22 20:36:17.138661+00
0ee7a5b4-2d13-40ed-baa0-e07f869a0cc4	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 9, "new_version": 14, "old_version": 13}	2025-06-22 20:36:17.152602+00	14	90a478db-efa0-4cdc-b13e-8edff7dab2cc	\N	campaign_state	null	2025-06-22 20:36:17.152641+00
c1901a88-8960-4f4d-8e79-45feaf5b0311	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 7, "new_version": 15, "old_version": 14}	2025-06-22 20:36:17.181473+00	15	f0178218-2e43-4265-87f0-c514d30be72c	\N	campaign_state	null	2025-06-22 20:36:17.181875+00
503cbd71-415d-426e-a29d-4c2f5edc8fa1	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 2, "new_version": 16, "old_version": 15}	2025-06-22 20:36:17.197614+00	16	ffccc118-0087-4fce-9778-2a8c86933d24	\N	campaign_state	null	2025-06-22 20:36:17.197728+00
ff39f06a-40d2-40db-b119-14c39f5ad37e	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 17, "new_version": 17, "old_version": 16}	2025-06-22 20:36:17.204195+00	17	e53ccad0-11c8-4440-aa24-d8d3009625b9	\N	campaign_state	null	2025-06-22 20:36:17.204298+00
511f76e7-1bb7-4d04-9316-e541fc25ff03	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 4, "new_version": 18, "old_version": 17}	2025-06-22 20:36:17.246097+00	18	9f31d71d-0e13-4614-afde-8812bbf722c2	\N	campaign_state	null	2025-06-22 20:36:17.246148+00
3e462aaa-75d7-4188-8760-0bf24f679ecf	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 0, "new_version": 19, "old_version": 18}	2025-06-22 20:36:17.283716+00	19	259fd2bd-ebe1-4255-bc68-abbddf6c8801	\N	campaign_state	null	2025-06-22 20:36:17.283917+00
3ceb5532-770e-4c1a-9635-1e3406b8c73a	03e9a3e1-67fa-405b-8277-78ff7e4c6034	race_condition_test	{"update_id": 14, "new_version": 20, "old_version": 19}	2025-06-22 20:36:17.394815+00	20	745ee604-f42a-4da2-bf95-860da23de833	\N	campaign_state	null	2025-06-22 20:36:17.395148+00
b2adac1a-b3b1-49eb-98f7-9f1a6d4526ce	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 0, "goroutine_id": 9}	2025-06-22 20:50:06.129715+00	2	461cfe69-b7dd-476d-a16f-c8d734686245	\N	campaign_state	null	2025-06-22 20:50:06.129826+00
8e46bf68-874b-4b53-8e25-da8908ed489f	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 0, "goroutine_id": 8}	2025-06-22 20:50:06.14204+00	3	c1c09cee-7e4a-4861-b0d7-5ab6a5279a94	\N	campaign_state	null	2025-06-22 20:50:06.14214+00
247dbe3f-5fc4-4a99-b3f7-c21c58cd0dc2	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 1, "goroutine_id": 8}	2025-06-22 20:50:06.150786+00	4	9185d68d-b744-4334-bf16-89d4b6776c23	\N	campaign_state	null	2025-06-22 20:50:06.150885+00
d28efcf4-f401-4807-9f70-d1a25424fcc9	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 2, "goroutine_id": 8}	2025-06-22 20:50:06.160948+00	5	2761dcba-a140-467f-87d8-973108930d35	\N	campaign_state	null	2025-06-22 20:50:06.160965+00
8d8464d3-e1cf-49b2-a13e-63cec1271346	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 3, "goroutine_id": 8}	2025-06-22 20:50:06.167908+00	6	d40627d0-a503-4039-8dfa-2f2adc0dbd57	\N	campaign_state	null	2025-06-22 20:50:06.167942+00
903cb8f0-2c8e-44ad-9093-f342e69d063c	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 4, "goroutine_id": 8}	2025-06-22 20:50:06.176376+00	7	7a97613a-dda6-4034-ac7a-ddb70382c89e	\N	campaign_state	null	2025-06-22 20:50:06.176551+00
519a5025-aa82-457c-8a67-0b8623212e32	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 0, "goroutine_id": 4}	2025-06-22 20:50:06.236583+00	8	712cbe7c-2910-4dc0-a4ef-dde14664cc0d	\N	campaign_state	null	2025-06-22 20:50:06.236772+00
fa4ac2e4-85be-41eb-baba-3cf7b944a11d	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 0, "goroutine_id": 2}	2025-06-22 20:50:06.293965+00	9	c5eed665-3e75-4653-8fe3-893119e57da3	\N	campaign_state	null	2025-06-22 20:50:06.299051+00
ea4a1ccf-732a-4b96-b79c-5a1829803832	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 1, "goroutine_id": 2}	2025-06-22 20:50:06.329359+00	10	3b62fff7-e8e7-405f-ab00-d371d4d9c093	\N	campaign_state	null	2025-06-22 20:50:06.329796+00
3aca4d76-e95a-4382-a653-6b039f1fbb29	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 2, "goroutine_id": 2}	2025-06-22 20:50:06.356917+00	11	ea2bbca2-8b46-4e72-930e-37328ddc5db0	\N	campaign_state	null	2025-06-22 20:50:06.357049+00
973db787-9827-4665-9b5b-af5ff02724af	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 3, "goroutine_id": 2}	2025-06-22 20:50:06.372489+00	12	6d46b500-2189-4adb-8bdb-bfbd7193bc25	\N	campaign_state	null	2025-06-22 20:50:06.372671+00
0d3624a4-96c1-4255-85b1-42a55fe43f08	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 4, "goroutine_id": 2}	2025-06-22 20:50:06.387398+00	13	c6ec960f-5755-40d0-8cc7-c0b39e76f6b4	\N	campaign_state	null	2025-06-22 20:50:06.387427+00
f6107272-0dce-47da-9c21-cada86145bc0	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 1, "goroutine_id": 4}	2025-06-22 20:50:06.425428+00	14	4068c3c3-733b-4b6a-add1-9d960c8ee8fe	\N	campaign_state	null	2025-06-22 20:50:06.425471+00
125e1f61-d0bf-405c-a633-21e49e8b8df0	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 2, "goroutine_id": 4}	2025-06-22 20:50:06.474681+00	15	5be66d1b-e43b-47a4-87fe-44235a86ef09	\N	campaign_state	null	2025-06-22 20:50:06.474934+00
eb0c179b-f5be-4552-8cfc-a667d5a36421	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 3, "goroutine_id": 4}	2025-06-22 20:50:06.484411+00	16	6f04e18e-2bf0-479e-b60e-beb1f9a019f5	\N	campaign_state	null	2025-06-22 20:50:06.484542+00
72bb76fc-051b-4d5e-a5d5-83ed8553a549	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 4, "goroutine_id": 4}	2025-06-22 20:50:06.496325+00	17	32fc9a06-b68d-42be-aabb-d257b607c94b	\N	campaign_state	null	2025-06-22 20:50:06.50237+00
45e24921-13c0-40cc-8df8-0ec1704ab5f2	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 0, "goroutine_id": 5}	2025-06-22 20:50:06.544938+00	18	34be44af-4b3e-418f-9f18-0da08273bc22	\N	campaign_state	null	2025-06-22 20:50:06.545084+00
79c5c81b-68bf-4f72-a94e-920ded00e6c1	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 1, "goroutine_id": 5}	2025-06-22 20:50:06.582213+00	19	f36da972-d466-4790-a591-d5b9cd98f3b4	\N	campaign_state	null	2025-06-22 20:50:06.582921+00
e7d3068c-dde4-49a8-96f9-7253a1cf8d01	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 2, "goroutine_id": 5}	2025-06-22 20:50:06.59146+00	20	a9883fb0-2caa-4b01-9c9c-91ec46cc3843	\N	campaign_state	null	2025-06-22 20:50:06.591625+00
d2d024b0-35be-4207-96bf-cfcab8a083df	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 3, "goroutine_id": 5}	2025-06-22 20:50:06.601924+00	21	cfd6a334-17e3-40b2-9b63-4b5960f5bddc	\N	campaign_state	null	2025-06-22 20:50:06.602157+00
a5027340-128f-4f15-b4d3-1fd2c29f6c3f	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 0, "goroutine_id": 0}	2025-06-22 20:50:06.613344+00	22	b34c1f49-df05-4617-8334-19022c063ca3	\N	campaign_state	null	2025-06-22 20:50:06.613541+00
06465a11-9658-42a5-ba25-175760fd173c	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 1, "goroutine_id": 0}	2025-06-22 20:50:06.618207+00	23	d6bf5eb2-80cf-4dbc-ba6f-41c3cf61eef9	\N	campaign_state	null	2025-06-22 20:50:06.618231+00
9def5987-0e0e-4b08-b56b-fcfb1e276ae0	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 2, "goroutine_id": 0}	2025-06-22 20:50:06.625276+00	24	d5b5acbe-0c08-43ed-8346-1e9e082ed416	\N	campaign_state	null	2025-06-22 20:50:06.625372+00
f1f66a15-f41a-4ce8-879e-b120f0ed5cdc	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 3, "goroutine_id": 0}	2025-06-22 20:50:06.633168+00	25	2e5a74df-e7cd-4a6d-b10f-d9de0a64ced3	\N	campaign_state	null	2025-06-22 20:50:06.633369+00
51567de8-a826-4137-8945-b142f9bfa990	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 4, "goroutine_id": 0}	2025-06-22 20:50:06.667492+00	26	77cfa4eb-22b3-4f75-84ed-a1980ed78e6c	\N	campaign_state	null	2025-06-22 20:50:06.667519+00
c50cb7c1-f0e6-4f7d-9705-ac7ef6395e05	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 1, "goroutine_id": 3}	2025-06-22 20:50:06.686023+00	27	2ce68c16-00c4-4aa2-a503-950605c894a5	\N	campaign_state	null	2025-06-22 20:50:06.686147+00
42dc296f-4d1b-492e-9f87-2b7556ddceac	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 0, "goroutine_id": 7}	2025-06-22 20:50:06.719242+00	28	4d858df5-40f7-4d03-bc70-f2517198b724	\N	campaign_state	null	2025-06-22 20:50:06.71926+00
63d2a1de-84d6-4b68-b4e5-dea791ace909	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 1, "goroutine_id": 7}	2025-06-22 20:50:06.746541+00	29	96a62a13-c0c3-4b85-bd2e-4b58f3412968	\N	campaign_state	null	2025-06-22 20:50:06.746561+00
d3b1f4f1-cc44-4e57-81aa-3f75213df8c7	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 2, "goroutine_id": 7}	2025-06-22 20:50:06.755753+00	30	d5ba7641-1359-4b98-ac56-985b6453168d	\N	campaign_state	null	2025-06-22 20:50:06.755768+00
b314e798-c39b-4561-8401-91ceedd21449	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 4, "goroutine_id": 5}	2025-06-22 20:50:06.762584+00	31	5cceff11-4664-4318-84a2-466b601d4b02	\N	campaign_state	null	2025-06-22 20:50:06.763074+00
6621dcdd-807d-4a94-aede-de0dc69a4189	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 0, "goroutine_id": 1}	2025-06-22 20:50:06.791092+00	32	6a05ff0a-3876-4d5d-9f5c-e0f06e6d2178	\N	campaign_state	null	2025-06-22 20:50:06.791242+00
2ea002ae-4ae4-45be-bcfd-6ba8ec3eb573	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 1, "goroutine_id": 1}	2025-06-22 20:50:06.799433+00	33	12124f73-c8d8-4b11-b6ff-5a5cfe3fb917	\N	campaign_state	null	2025-06-22 20:50:06.799563+00
e6e4934c-e31d-4f67-b543-c5bbff376559	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 2, "goroutine_id": 1}	2025-06-22 20:50:06.806688+00	34	b83f7c0a-ca54-43f5-9a64-e2b247b4615c	\N	campaign_state	null	2025-06-22 20:50:06.806826+00
76ae4734-813a-4e68-9f22-3e6f77350b9e	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 3, "goroutine_id": 1}	2025-06-22 20:50:06.814487+00	35	d923da8c-1a27-445c-abf6-8ff815293041	\N	campaign_state	null	2025-06-22 20:50:06.81607+00
af203054-47d1-4285-987b-293221109d46	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 4, "goroutine_id": 1}	2025-06-22 20:50:06.825096+00	36	4bdcae8d-fbd2-4ab5-ac4e-665228a8e763	\N	campaign_state	null	2025-06-22 20:50:06.825221+00
951e8a8c-3b6f-42ff-860f-706ef332d913	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 3, "goroutine_id": 7}	2025-06-22 20:50:06.874127+00	37	46ad8d80-8bec-4020-82c7-5019f78f58fc	\N	campaign_state	null	2025-06-22 20:50:06.875464+00
ce490692-b40a-4746-b06b-8277d858961d	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 4, "goroutine_id": 7}	2025-06-22 20:50:06.883296+00	38	a963980a-66c2-4dc8-a72e-54e55d6b5a67	\N	campaign_state	null	2025-06-22 20:50:06.88342+00
58ccdabb-41b4-4318-b5fd-fa9d454f10a4	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 0, "goroutine_id": 6}	2025-06-22 20:50:06.888468+00	39	341db67b-e8d6-4333-adf5-41564b51cb8e	\N	campaign_state	null	2025-06-22 20:50:06.888491+00
c76a90af-803c-4778-b242-a0c9a30fafa2	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 1, "goroutine_id": 6}	2025-06-22 20:50:06.91999+00	40	2d0a5bd7-96cc-4f0f-95ff-ee38d6248d04	\N	campaign_state	null	2025-06-22 20:50:06.920016+00
3a15066f-45c5-4f66-81d7-0c8a9fb89cd6	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 2, "goroutine_id": 6}	2025-06-22 20:50:06.942617+00	41	a0c9e430-b43b-48ba-9c3a-f17987f85ddd	\N	campaign_state	null	2025-06-22 20:50:06.942632+00
11d1413e-a28b-45d5-8402-8fead2c86a40	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 3, "goroutine_id": 6}	2025-06-22 20:50:06.954272+00	42	e0a3fc9c-7e64-437c-bbeb-38f67030af33	\N	campaign_state	null	2025-06-22 20:50:06.954395+00
af680e6c-789b-4014-a53b-abe2e0e959a0	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 4, "goroutine_id": 6}	2025-06-22 20:50:06.963+00	43	24ded989-44bf-4cad-b411-c4015be5c505	\N	campaign_state	null	2025-06-22 20:50:06.963158+00
a542b7f7-aab1-41c2-9ae3-36fbcfe4efa5	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625406, "update_id": 2, "goroutine_id": 3}	2025-06-22 20:50:06.982548+00	44	d0209bd5-9c8c-489d-b9a9-40e214b2e7bd	\N	campaign_state	null	2025-06-22 20:50:06.982564+00
e247b422-2b00-4eab-829f-c21f655357c5	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625407, "update_id": 1, "goroutine_id": 9}	2025-06-22 20:50:07.010265+00	45	9638312f-1b1d-407e-b27b-2efe94d2965a	\N	campaign_state	null	2025-06-22 20:50:07.010799+00
c4cc67bc-c246-4deb-8aa1-eb3e54f552b5	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625407, "update_id": 2, "goroutine_id": 9}	2025-06-22 20:50:07.039664+00	46	e9ef760b-0416-4582-9bf1-1a26c6a77543	\N	campaign_state	null	2025-06-22 20:50:07.039858+00
965bd406-d3d9-45d7-b8dd-d122d8705d08	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625407, "update_id": 3, "goroutine_id": 9}	2025-06-22 20:50:07.084462+00	47	23e91ebc-5723-4785-b8b1-40486466f896	\N	campaign_state	null	2025-06-22 20:50:07.084629+00
bf4ada22-40ae-45ae-a3fd-be9e7eba92aa	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625407, "update_id": 4, "goroutine_id": 9}	2025-06-22 20:50:07.09413+00	48	5919ead7-a854-4827-97c6-489cd14dbdd6	\N	campaign_state	null	2025-06-22 20:50:07.094291+00
905ec0f9-085a-4c61-99f4-308e17b2232b	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625407, "update_id": 3, "goroutine_id": 3}	2025-06-22 20:50:07.133345+00	49	4591c155-057e-4bea-a63a-47c6c5808641	\N	campaign_state	null	2025-06-22 20:50:07.135742+00
319be972-8c12-4572-a206-2ba64daa20d2	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	concurrent_update	{"timestamp": 1750625407, "update_id": 4, "goroutine_id": 3}	2025-06-22 20:50:07.195803+00	50	71b6f1a4-7423-4c3b-bb5c-192d7141358c	\N	campaign_state	null	2025-06-22 20:50:07.199415+00
a07151c8-32a5-461f-9520-219bb07df117	bf6d7337-7c0e-4ab4-860c-bbc93e2b2ac5	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 20:45:07.380133+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 20:50:07.380203+00
72801544-9349-44db-91cd-49dd6163f1d1	bf6d7337-7c0e-4ab4-860c-bbc93e2b2ac5	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 20:46:07.380135+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 20:50:07.384271+00
9ae96cb0-3f43-4aaf-9f2a-6d4001da8aad	bf6d7337-7c0e-4ab4-860c-bbc93e2b2ac5	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 20:47:07.380135+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 20:50:07.387378+00
4390069a-0129-4fc2-8612-10af5caf5d24	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 19, "new_version": 2, "old_version": 1}	2025-06-22 20:50:07.44494+00	2	dc9eb32a-b176-472e-9736-c496f7b1e6c5	\N	campaign_state	null	2025-06-22 20:50:07.446275+00
9ce57f3e-99d5-4e8c-85a8-87dcdef082c2	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 10, "new_version": 3, "old_version": 2}	2025-06-22 20:50:07.47435+00	3	09c0ace5-cece-4395-89c3-78acccbc05b5	\N	campaign_state	null	2025-06-22 20:50:07.474668+00
605d2ac7-4d4e-49a5-b8e9-d7d4537e5e16	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 6, "new_version": 4, "old_version": 3}	2025-06-22 20:50:07.728695+00	4	142acc09-4742-4ce8-9ed2-4e4a917ff95b	\N	campaign_state	null	2025-06-22 20:50:07.728901+00
5d1c6ab0-2a54-41fb-91c6-1e8d52ff0cf9	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 2, "new_version": 5, "old_version": 4}	2025-06-22 20:50:07.749148+00	5	723bb241-e95b-4be8-b91d-c195fd40a93a	\N	campaign_state	null	2025-06-22 20:50:07.749256+00
c90cf583-fbdd-4c9f-b8a5-1106ff08498b	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 17, "new_version": 6, "old_version": 5}	2025-06-22 20:50:07.848759+00	6	81a1599f-0ab9-4245-82df-f1f3cf4ea32d	\N	campaign_state	null	2025-06-22 20:50:07.84887+00
bf3d1a66-a64f-4b5c-bf6d-53424ea3a179	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 13, "new_version": 7, "old_version": 6}	2025-06-22 20:50:07.886748+00	7	63515d31-72c0-4dd3-a153-dabee9437c85	\N	campaign_state	null	2025-06-22 20:50:07.886959+00
097f6dfb-c1d3-417f-b986-5274f184e1ff	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 5, "new_version": 8, "old_version": 7}	2025-06-22 20:50:07.900597+00	8	8e143f3f-087b-4296-bff2-8e828eaf2b58	\N	campaign_state	null	2025-06-22 20:50:07.900665+00
2b5c4bf6-4850-4bb9-90b1-063b4ade2545	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 1, "new_version": 9, "old_version": 8}	2025-06-22 20:50:07.959667+00	9	6ea040d4-5c9f-408f-a1ab-c7f9fb2b3ccd	\N	campaign_state	null	2025-06-22 20:50:07.95991+00
326069ed-bbd2-47d5-950e-f68a720a30e0	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 12, "new_version": 10, "old_version": 9}	2025-06-22 20:50:07.970094+00	10	09ce2963-bfac-4e61-951b-fd3842750927	\N	campaign_state	null	2025-06-22 20:50:07.970215+00
962c3526-1455-4bb6-963b-cf922e127584	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 8, "new_version": 11, "old_version": 10}	2025-06-22 20:50:07.978107+00	11	6c77d491-1479-418b-9d08-7b3d3e4ff1e6	\N	campaign_state	null	2025-06-22 20:50:07.97822+00
5b19cc71-1be3-4103-b4a5-b6a16a96ae96	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 15, "new_version": 12, "old_version": 11}	2025-06-22 20:50:07.994487+00	12	33d04f3d-e134-4e8b-b727-58d8bb263958	\N	campaign_state	null	2025-06-22 20:50:07.994644+00
8b919a01-6da5-467f-8857-c3baa1a64e65	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 18, "new_version": 13, "old_version": 12}	2025-06-22 20:50:08.082277+00	13	b2c22582-f430-4342-b445-23596abb2416	\N	campaign_state	null	2025-06-22 20:50:08.094229+00
e19cece9-ef8b-4cb6-a50c-0261fb6d9617	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 9, "new_version": 14, "old_version": 13}	2025-06-22 20:50:08.103162+00	14	c4f04299-b063-4977-809e-91779e4b0d06	\N	campaign_state	null	2025-06-22 20:50:08.104722+00
36494f53-82d5-4f8b-9fe0-8c9a306dc3d7	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 11, "new_version": 15, "old_version": 14}	2025-06-22 20:50:08.162098+00	15	d58eb4ad-9b7b-43fe-a540-182e5c7e8fe2	\N	campaign_state	null	2025-06-22 20:50:08.162244+00
0e5a63bc-c6ed-4c17-af4c-ad3fb21d9eb6	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 0, "new_version": 16, "old_version": 15}	2025-06-22 20:50:08.203894+00	16	051dabb8-ec14-467a-90c4-a82c8bfee9cd	\N	campaign_state	null	2025-06-22 20:50:08.204176+00
c220a104-22d5-4de2-b743-aa8d1a7584ff	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 14, "new_version": 17, "old_version": 16}	2025-06-22 20:50:08.217139+00	17	e9b9d83e-4e83-488d-91b7-3a3394120f0d	\N	campaign_state	null	2025-06-22 20:50:08.21834+00
e9f283f1-469b-44b8-96ae-277ce6fb4f0a	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 16, "new_version": 18, "old_version": 17}	2025-06-22 20:50:08.227083+00	18	e61cfacf-8c5e-4391-bd03-c96b7aa90c14	\N	campaign_state	null	2025-06-22 20:50:08.227125+00
089d8f56-2a6d-4b67-9a4a-f75301579671	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 3, "new_version": 19, "old_version": 18}	2025-06-22 20:50:08.338394+00	19	a54681fb-2520-42eb-b6a4-f054c478a9e1	\N	campaign_state	null	2025-06-22 20:50:08.338685+00
5b55660d-b411-4669-b13c-57958154a0e3	9a49df2e-4319-49d7-969f-3df68f3ad183	race_condition_test	{"update_id": 4, "new_version": 20, "old_version": 19}	2025-06-22 20:50:08.453962+00	20	098f614f-2290-484f-b297-9e0d04aacccc	\N	campaign_state	null	2025-06-22 20:50:08.454085+00
cffd57d9-4360-469c-b644-cc21eee92caf	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 0, "goroutine_id": 9}	2025-06-22 21:50:54.615235+00	2	52f5d394-1b00-468c-af3a-08abe25a169a	\N	campaign_state	null	2025-06-22 21:50:54.615255+00
ba09b94e-af90-4a6e-a488-085d52e1d5d7	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 1, "goroutine_id": 9}	2025-06-22 21:50:54.632222+00	3	f3e4e3e2-27c7-4842-b0c3-08755282a3ca	\N	campaign_state	null	2025-06-22 21:50:54.632322+00
08b674c5-8d66-4d4a-a7f6-c6b099ce3d00	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 2, "goroutine_id": 9}	2025-06-22 21:50:54.642569+00	4	889a6f86-20a3-4a52-ba71-fccee1493f69	\N	campaign_state	null	2025-06-22 21:50:54.642726+00
7165a30c-3042-4bcd-884b-898b18b9274d	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 0, "goroutine_id": 1}	2025-06-22 21:50:54.650486+00	5	c3a4b8f0-4c9c-4c2b-b7a4-eca27115d3fe	\N	campaign_state	null	2025-06-22 21:50:54.65076+00
77af4c97-8cdd-4f49-80e9-2fc01b4d9ba5	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 1, "goroutine_id": 1}	2025-06-22 21:50:54.659113+00	6	3541b3da-cac3-472c-b67c-d1263f9d2aec	\N	campaign_state	null	2025-06-22 21:50:54.659293+00
8890c745-1ba6-4677-be75-e8945f3fa4e1	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 2, "goroutine_id": 1}	2025-06-22 21:50:54.665264+00	7	ae05ccf8-15f3-4750-8001-4db8eaf6e779	\N	campaign_state	null	2025-06-22 21:50:54.665382+00
0d8f7edf-9eb9-4000-9d66-c8c9591f58bc	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 3, "goroutine_id": 1}	2025-06-22 21:50:54.674371+00	8	1d2a54fc-0e1d-446a-b361-f8bf057447fa	\N	campaign_state	null	2025-06-22 21:50:54.674487+00
184aa514-ad71-420b-956f-25ca0ed9643b	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 4, "goroutine_id": 1}	2025-06-22 21:50:54.680769+00	9	5cd2abba-b77a-44d6-a080-21474772bcdb	\N	campaign_state	null	2025-06-22 21:50:54.68108+00
b4055317-5018-43e7-b9a9-130ab03d5aa8	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 0, "goroutine_id": 6}	2025-06-22 21:50:54.72008+00	10	a3082e2e-6c40-48b4-9f8e-5a7c70eb16da	\N	campaign_state	null	2025-06-22 21:50:54.720304+00
3900b42f-177f-4fc9-80f7-6e8f90a72792	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 0, "goroutine_id": 4}	2025-06-22 21:50:54.739016+00	11	72b4990b-4720-42fe-9fcf-649940a0d0cb	\N	campaign_state	null	2025-06-22 21:50:54.739175+00
8e3222d0-e5f6-4d0e-a148-820b6fddde86	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 0, "goroutine_id": 5}	2025-06-22 21:50:54.747249+00	12	3a5a5a87-ca53-4927-a45d-186572a893ac	\N	campaign_state	null	2025-06-22 21:50:54.747337+00
d2390145-4c91-4210-bc35-cef38f813df8	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 1, "goroutine_id": 5}	2025-06-22 21:50:54.779866+00	13	9f8e38c4-6969-4bdd-9210-d2dc43071b0c	\N	campaign_state	null	2025-06-22 21:50:54.780029+00
b8c4cd5b-0f6f-4882-a5e8-4764d3d8d950	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 2, "goroutine_id": 5}	2025-06-22 21:50:54.786323+00	14	b60e4033-efe0-4a89-b7a6-2763d1e90a7f	\N	campaign_state	null	2025-06-22 21:50:54.786451+00
76437043-f020-4844-a714-e1a67cbfdfd6	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 3, "goroutine_id": 5}	2025-06-22 21:50:54.79086+00	15	a4ee717b-cd7c-411e-90bb-64ae04fb3b52	\N	campaign_state	null	2025-06-22 21:50:54.790882+00
e313eaa1-4708-4595-8811-a1f0bdef67b2	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 4, "goroutine_id": 5}	2025-06-22 21:50:54.795925+00	16	8efa5d3a-6a2d-4bc3-bee8-e10b1a7b5c26	\N	campaign_state	null	2025-06-22 21:50:54.796103+00
8ea7b82f-ed39-4bc3-a399-0344992aaa5b	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 0, "goroutine_id": 0}	2025-06-22 21:50:54.829098+00	17	5251fb7b-f8ce-41b7-b768-4aff6436ae20	\N	campaign_state	null	2025-06-22 21:50:54.829387+00
b49a397c-e67c-440c-9b70-6d0e4b28850a	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 1, "goroutine_id": 0}	2025-06-22 21:50:54.834218+00	18	0f239ef3-29dc-4934-a508-53b93e2d8511	\N	campaign_state	null	2025-06-22 21:50:54.834239+00
a71b4966-51f1-4752-9494-4559fc3a1912	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 2, "goroutine_id": 0}	2025-06-22 21:50:54.839471+00	19	a9c19267-c437-4dd0-afd3-d11d6e0b0e3f	\N	campaign_state	null	2025-06-22 21:50:54.839633+00
9d4add75-18f1-4123-bed9-3d9adb950910	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 3, "goroutine_id": 0}	2025-06-22 21:50:54.845509+00	20	997f5a53-a317-4c3a-8357-ecc93f7c68e1	\N	campaign_state	null	2025-06-22 21:50:54.845645+00
46168585-a4b9-43fe-b843-39e4417ba29b	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 4, "goroutine_id": 0}	2025-06-22 21:50:54.853316+00	21	78894e8c-4d45-45d7-b751-3f3e45463887	\N	campaign_state	null	2025-06-22 21:50:54.853517+00
831a6cbb-b7a5-4d0a-b3f5-9adea003b976	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 0, "goroutine_id": 3}	2025-06-22 21:50:54.865114+00	22	eb041d08-8fd4-434f-ae16-651d28218101	\N	campaign_state	null	2025-06-22 21:50:54.865234+00
12a7ba51-7058-4939-a626-bae1a5c0cd12	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 1, "goroutine_id": 3}	2025-06-22 21:50:54.880402+00	23	1592c308-ea96-46bd-a491-a361b8cedd46	\N	campaign_state	null	2025-06-22 21:50:54.88042+00
aca95ed7-06aa-46ef-b240-33292ca755b9	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 2, "goroutine_id": 3}	2025-06-22 21:50:54.888392+00	24	67fce417-b4c1-4152-8d43-507141d32b5f	\N	campaign_state	null	2025-06-22 21:50:54.888409+00
1702977f-3ec1-449f-9ac0-120a464d33d9	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 3, "goroutine_id": 3}	2025-06-22 21:50:54.89437+00	25	ce8bc771-57d1-45f1-99a5-d0b76ac5e4e2	\N	campaign_state	null	2025-06-22 21:50:54.894556+00
df654db0-af82-4e51-b94a-32f65a6226cd	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 1, "goroutine_id": 7}	2025-06-22 21:50:54.901625+00	26	ce2753b8-d800-4e03-8aae-ed9873dfc67b	\N	campaign_state	null	2025-06-22 21:50:54.901829+00
2651aa14-eeaa-4f78-a3a9-3034aeaab7d4	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 2, "goroutine_id": 7}	2025-06-22 21:50:54.90702+00	27	4930b9ec-2c3c-4c13-8e9f-80f0435c3dbd	\N	campaign_state	null	2025-06-22 21:50:54.907113+00
24eb285b-9b27-410c-87a1-31b20e519b66	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 3, "goroutine_id": 7}	2025-06-22 21:50:54.911976+00	28	fdffde2a-76cc-40ed-8a2a-8268db7efafa	\N	campaign_state	null	2025-06-22 21:50:54.912068+00
db104ed1-425b-4b6f-9a67-75c858648e77	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 4, "goroutine_id": 7}	2025-06-22 21:50:54.915948+00	29	85c305e4-ebca-4bf6-a2c8-e3b7875a52b9	\N	campaign_state	null	2025-06-22 21:50:54.915971+00
ec6d83aa-c633-4d83-9af3-2dd1ffa6fbfa	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 1, "goroutine_id": 6}	2025-06-22 21:50:54.950982+00	30	b666bf9c-0a41-4d75-8f3d-a043a25406b2	\N	campaign_state	null	2025-06-22 21:50:54.951088+00
80de7bbe-1dcd-403b-8546-e5ff4deb7c41	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629054, "update_id": 3, "goroutine_id": 9}	2025-06-22 21:50:54.980188+00	31	5e1d02df-4f6e-4762-b0d4-dee39ef63795	\N	campaign_state	null	2025-06-22 21:50:54.980862+00
f259fc4f-fe41-47ad-8f76-0479fa2d204b	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 4, "goroutine_id": 3}	2025-06-22 21:50:55.015758+00	32	18c4031b-6a52-4dcb-ac27-92b5bf746881	\N	campaign_state	null	2025-06-22 21:50:55.016061+00
5fbb59b3-81cb-4b9b-a9df-d0c00cf18570	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 1, "goroutine_id": 4}	2025-06-22 21:50:55.059464+00	33	beb9513c-ed5d-4338-a2b1-4ef50a7a71d3	\N	campaign_state	null	2025-06-22 21:50:55.059615+00
750a159f-141c-44f0-82ce-ce29de83fcae	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 2, "goroutine_id": 4}	2025-06-22 21:50:55.066656+00	34	1866132f-3fdc-451c-bbf1-889cdc8db9df	\N	campaign_state	null	2025-06-22 21:50:55.066846+00
a36494d6-0be4-4d87-a772-b85ebfbcf42e	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 3, "goroutine_id": 4}	2025-06-22 21:50:55.072299+00	35	207ef4be-11c2-4e36-b26a-a123d87500e6	\N	campaign_state	null	2025-06-22 21:50:55.072412+00
8b911d7e-d2ce-4bdd-b846-2139ca8b8b83	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 4, "goroutine_id": 4}	2025-06-22 21:50:55.078035+00	36	405c73d7-7266-44c1-a04e-b15f0b9c10bb	\N	campaign_state	null	2025-06-22 21:50:55.078147+00
2ff178d4-8ca8-4ce1-a29b-24f90a0e9a0d	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 2, "goroutine_id": 6}	2025-06-22 21:50:55.090937+00	37	a6e42682-0ef7-48d1-9870-7c7327bafec7	\N	campaign_state	null	2025-06-22 21:50:55.091131+00
551cffe2-c2ba-49aa-9fb6-f896bc97d475	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 3, "goroutine_id": 6}	2025-06-22 21:50:55.096205+00	38	cfee273c-8b06-4008-b678-ab761ce0bbaa	\N	campaign_state	null	2025-06-22 21:50:55.096319+00
b79d50d0-c7d8-44ee-97fa-f8369ccb224b	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 4, "goroutine_id": 6}	2025-06-22 21:50:55.10343+00	39	a3db5a88-de7c-4343-ad50-c176835a14b5	\N	campaign_state	null	2025-06-22 21:50:55.103582+00
a1a674a6-025e-4407-be17-4c3a1bf2aedc	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 1, "goroutine_id": 8}	2025-06-22 21:50:55.111638+00	40	2a8aadef-9100-476f-9737-ade017d97f40	\N	campaign_state	null	2025-06-22 21:50:55.11184+00
9db3926e-b447-40d1-9e9f-5b958b4e738e	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 2, "goroutine_id": 8}	2025-06-22 21:50:55.131782+00	41	543b25e1-6ba2-4c33-9439-0c9c31115645	\N	campaign_state	null	2025-06-22 21:50:55.131978+00
94e5514e-f415-4ff4-b656-0b768565c315	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 3, "goroutine_id": 8}	2025-06-22 21:50:55.138368+00	42	3e8ed8d4-ce63-4243-a18a-9861b97181ad	\N	campaign_state	null	2025-06-22 21:50:55.138578+00
da49ed78-553b-400d-bd26-9a5ff310ef26	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 4, "goroutine_id": 8}	2025-06-22 21:50:55.145207+00	43	0a291f65-06c5-46f4-9e31-04a8ce2cb507	\N	campaign_state	null	2025-06-22 21:50:55.145299+00
71cdaf02-2de7-45f2-9393-db8197edbba5	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 4, "goroutine_id": 9}	2025-06-22 21:50:55.223195+00	44	97156e5b-1df1-44b4-a70f-d5690dd19249	\N	campaign_state	null	2025-06-22 21:50:55.223718+00
472da94e-bc68-4bad-8f78-969e168e8127	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 0, "goroutine_id": 2}	2025-06-22 21:50:55.239484+00	45	b9ca3e31-e8ac-4b74-8ad2-928629db334b	\N	campaign_state	null	2025-06-22 21:50:55.23981+00
70f85086-d46b-4b89-80a8-b776c08ace8c	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 1, "goroutine_id": 2}	2025-06-22 21:50:55.247335+00	46	7a781d00-af44-4725-9784-c742742fe344	\N	campaign_state	null	2025-06-22 21:50:55.247502+00
a4651c4a-cb5c-4f59-b137-ebd41e2df6a3	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 2, "goroutine_id": 2}	2025-06-22 21:50:55.255161+00	47	4220104a-4f84-4aa4-bb15-eeee1ca39f4f	\N	campaign_state	null	2025-06-22 21:50:55.255305+00
f2e71c5a-d9bc-4f4d-96ac-a3f0a5c5c59f	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 3, "goroutine_id": 2}	2025-06-22 21:50:55.261786+00	48	fae74677-18be-4e0b-85ce-a3b82aebfb63	\N	campaign_state	null	2025-06-22 21:50:55.261921+00
c2e16c57-1c83-4323-afbd-07e460ef1012	c02b7c23-d661-411f-89e9-94f559568a2f	concurrent_update	{"timestamp": 1750629055, "update_id": 4, "goroutine_id": 2}	2025-06-22 21:50:55.268043+00	49	d9cb0da4-26e2-4afe-a783-602984d7432e	\N	campaign_state	null	2025-06-22 21:50:55.268074+00
35132607-2348-41d4-a57e-3622caeb801a	bde7fbc3-9967-4a82-a017-f1cd11017ca3	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-22 21:45:55.428596+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 21:50:55.428793+00
cd92701e-f062-4a41-bb94-5564db87d425	bde7fbc3-9967-4a82-a017-f1cd11017ca3	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-22 21:46:55.428597+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 21:50:55.432428+00
167b366b-3949-4cd1-9619-eef573e778d2	bde7fbc3-9967-4a82-a017-f1cd11017ca3	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-22 21:47:55.428598+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-22 21:50:55.434944+00
f58bf0a2-d11e-4e0a-a606-831573633c68	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 19, "new_version": 2, "old_version": 1}	2025-06-22 21:50:55.545305+00	2	7fc77698-fac7-4813-b984-8bd50f84e892	\N	campaign_state	null	2025-06-22 21:50:55.54544+00
c058166e-3ad4-4861-894b-5fc61494e7f6	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 7, "new_version": 3, "old_version": 2}	2025-06-22 21:50:55.554954+00	3	4d31a4d6-0d09-4c60-a408-60abe8864e85	\N	campaign_state	null	2025-06-22 21:50:55.55498+00
a1d9334c-e5f8-46dc-b945-4bedfa07ae35	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 13, "new_version": 4, "old_version": 3}	2025-06-22 21:50:55.567655+00	4	b7226706-0544-42e6-b2dc-96467ce191ca	\N	campaign_state	null	2025-06-22 21:50:55.567932+00
e6b3fcac-bf37-4119-bd98-f821fab83c57	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 15, "new_version": 5, "old_version": 4}	2025-06-22 21:50:55.595729+00	5	8724ea00-9f28-4e74-86f7-25e3ac10093c	\N	campaign_state	null	2025-06-22 21:50:55.595853+00
fd20c60f-05a0-4ff6-94de-b08fa286b608	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 1, "new_version": 6, "old_version": 5}	2025-06-22 21:50:55.609696+00	6	10b951df-c80f-46e4-9b46-6af0b0568e27	\N	campaign_state	null	2025-06-22 21:50:55.609847+00
f268975e-c6e0-41e8-b5b7-3e3cca2cdd20	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 14, "new_version": 7, "old_version": 6}	2025-06-22 21:50:55.620096+00	7	a9a31555-957a-4a06-9db5-7a5df010243e	\N	campaign_state	null	2025-06-22 21:50:55.620233+00
c2c18cc0-5d3c-4e00-b5bc-1ef6526a19e0	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 12, "new_version": 8, "old_version": 7}	2025-06-22 21:50:55.646709+00	8	7ac1a633-dd40-49fc-9135-83dd4ef33af9	\N	campaign_state	null	2025-06-22 21:50:55.647129+00
ce108ce6-2b35-4ca5-b418-95e31f0daf30	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 9, "new_version": 9, "old_version": 8}	2025-06-22 21:50:55.665153+00	9	d23abaf1-e6a9-4cb9-a9ef-fcfc71c6c78c	\N	campaign_state	null	2025-06-22 21:50:55.665192+00
6e03e0a9-7c3e-402d-8064-c81366488e53	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 2, "new_version": 10, "old_version": 9}	2025-06-22 21:50:55.674049+00	10	cce1db7e-54fd-4665-a21c-89f1bcb86c1c	\N	campaign_state	null	2025-06-22 21:50:55.674149+00
f1b8a250-9ca1-46ed-9669-016b5b33294c	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 4, "new_version": 11, "old_version": 10}	2025-06-22 21:50:55.685321+00	11	8bcc9ab6-d477-4024-9587-48937c5e6325	\N	campaign_state	null	2025-06-22 21:50:55.686098+00
44b32d66-d875-4dc4-9c15-4a404d63a814	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 5, "new_version": 12, "old_version": 11}	2025-06-22 21:50:55.699862+00	12	d57835a8-668d-4027-8d55-9752af2d9e52	\N	campaign_state	null	2025-06-22 21:50:55.699965+00
0a4c8e09-7e66-47aa-a844-7fe1e04ac51e	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 0, "new_version": 13, "old_version": 12}	2025-06-22 21:50:55.713623+00	13	2bdcd7c6-253b-4929-b4dc-fc151e7903ce	\N	campaign_state	null	2025-06-22 21:50:55.713846+00
5c35f1ef-f7a9-4f24-ba27-9e50de68532a	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 17, "new_version": 14, "old_version": 13}	2025-06-22 21:50:55.751042+00	14	17c2b538-fe9a-436b-b904-54159f862b58	\N	campaign_state	null	2025-06-22 21:50:55.75116+00
0091724f-77b1-4c92-aac7-769ae90063f0	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 18, "new_version": 15, "old_version": 14}	2025-06-22 21:50:55.777847+00	15	cfcdc389-216e-476b-8d86-6d7c0807406a	\N	campaign_state	null	2025-06-22 21:50:55.777998+00
ab310732-9e4f-4d2d-8379-b805e97ad65b	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 16, "new_version": 16, "old_version": 15}	2025-06-22 21:50:55.799096+00	16	8b9a3d8f-52e5-43f1-ac04-64ccd2a0f007	\N	campaign_state	null	2025-06-22 21:50:55.799145+00
2769897c-0141-4df4-9452-9229869d3e8e	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 3, "new_version": 17, "old_version": 16}	2025-06-22 21:50:55.883886+00	17	db76b7dd-1b99-4fe2-b2ce-3801073e433d	\N	campaign_state	null	2025-06-22 21:50:55.884067+00
bf73fa78-d915-434c-bcbb-92b27d447738	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 10, "new_version": 18, "old_version": 17}	2025-06-22 21:50:55.900426+00	18	b0e5f3ba-d540-4b53-9528-13fdb1fb06f0	\N	campaign_state	null	2025-06-22 21:50:55.900591+00
af205a51-9877-4f5f-a6bc-ce385fd55a50	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 6, "new_version": 19, "old_version": 18}	2025-06-22 21:50:55.9205+00	19	9ee5fa06-afc7-453c-b13f-50fe0bad29b1	\N	campaign_state	null	2025-06-22 21:50:55.922356+00
156539b7-368b-4701-9bd3-c630e1b603ee	fc73b630-6e15-4e5c-b192-907b1ce30efd	race_condition_test	{"update_id": 11, "new_version": 20, "old_version": 19}	2025-06-22 21:50:56.00652+00	20	67ae42a7-0bce-47e0-a42e-7b1e79baf9d8	\N	campaign_state	null	2025-06-22 21:50:56.006552+00
dd7a2e14-1b95-442f-b5eb-3ef86035f7ce	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 0, "goroutine_id": 9}	2025-06-23 00:22:28.588225+00	2	ecb8089b-d722-45f5-ab08-1e4185f59952	\N	campaign_state	null	2025-06-23 00:22:28.590901+00
4fdeaf46-ce82-4486-a0e3-2ce4f45a25a4	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 0, "goroutine_id": 1}	2025-06-23 00:22:28.641603+00	3	02578bd1-3001-43d4-87eb-139fbc8738ea	\N	campaign_state	null	2025-06-23 00:22:28.6417+00
6a733bfd-a658-465f-9f6d-2417f4150871	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 1, "goroutine_id": 1}	2025-06-23 00:22:28.683878+00	4	cd0e1816-a6af-4491-8245-6a234667a47c	\N	campaign_state	null	2025-06-23 00:22:28.683903+00
642a48e4-d216-4129-8b22-0fde4f665e0b	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 2, "goroutine_id": 1}	2025-06-23 00:22:28.691999+00	5	5c1943a6-78b9-4cfa-825b-802e608957be	\N	campaign_state	null	2025-06-23 00:22:28.692192+00
1e275003-cab0-4c66-9ded-d7d1129456f0	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 3, "goroutine_id": 1}	2025-06-23 00:22:28.702349+00	6	c29cc71a-1e43-4126-93f2-dff5c27bdab8	\N	campaign_state	null	2025-06-23 00:22:28.702491+00
86fb33ae-ae74-4948-ae16-e0006962fe8c	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 0, "goroutine_id": 8}	2025-06-23 00:22:28.751123+00	7	f4058bc2-0429-4cb2-a61d-a1fa92a440be	\N	campaign_state	null	2025-06-23 00:22:28.751304+00
5df0ff16-37e5-482b-b36c-2892ea9cc7de	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 0, "goroutine_id": 6}	2025-06-23 00:22:28.797167+00	8	e7b67e27-2523-44cb-9953-fa89dae725d9	\N	campaign_state	null	2025-06-23 00:22:28.797396+00
5417948a-9ce9-474c-a597-c9074afededa	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 0, "goroutine_id": 3}	2025-06-23 00:22:28.84047+00	9	e2c3b33c-b9f7-407a-a3e7-03c7dfb3584f	\N	campaign_state	null	2025-06-23 00:22:28.840488+00
636e5568-6a61-4e4b-9e72-08c398dbd9fd	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 1, "goroutine_id": 3}	2025-06-23 00:22:28.875647+00	10	a16b6a58-9180-4f8d-a099-fd147d662b09	\N	campaign_state	null	2025-06-23 00:22:28.875754+00
4a089814-d391-4559-9c83-7fda635315a2	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 2, "goroutine_id": 3}	2025-06-23 00:22:28.889885+00	11	5dbd43bd-d9e0-476d-9729-63c0bce498cd	\N	campaign_state	null	2025-06-23 00:22:28.890071+00
a6466f28-3ed8-4f1a-ad7e-a44a6e192f22	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638148, "update_id": 3, "goroutine_id": 3}	2025-06-23 00:22:28.945345+00	12	3e2556c1-df2a-4ad1-86c5-7789c5d750fc	\N	campaign_state	null	2025-06-23 00:22:28.945487+00
4638ece5-2db5-455f-8507-d21e0774b8b0	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 3}	2025-06-23 00:22:29.004831+00	13	cb2e55db-5fcb-4098-9680-ac01356f7b3e	\N	campaign_state	null	2025-06-23 00:22:29.004959+00
93fe0d50-82df-4925-9c3a-e8714dc2fd6c	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 0, "goroutine_id": 7}	2025-06-23 00:22:29.057269+00	14	4a6fc20e-831d-4686-aac9-20b0e24358fb	\N	campaign_state	null	2025-06-23 00:22:29.057547+00
17412240-76ca-46c1-a3cf-4fce68f74742	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 1, "goroutine_id": 7}	2025-06-23 00:22:29.066227+00	15	7a18c3a6-7dd6-4f4e-bb09-6a7f8c8f3f39	\N	campaign_state	null	2025-06-23 00:22:29.067824+00
a8db86c9-1e6c-4e5a-9e66-c935d79a3020	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 1, "goroutine_id": 9}	2025-06-23 00:22:29.07631+00	16	f5640c09-b9fe-47ee-8015-b963528abf3b	\N	campaign_state	null	2025-06-23 00:22:29.076376+00
de0953af-7f61-4751-9095-6e36c28480a3	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 2, "goroutine_id": 9}	2025-06-23 00:22:29.152503+00	17	0339b5dd-622e-4cc3-917e-96ced6700e2f	\N	campaign_state	null	2025-06-23 00:22:29.152736+00
206e6a53-8952-40b8-a6a7-537051038083	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 3, "goroutine_id": 9}	2025-06-23 00:22:29.158477+00	18	e01ca8f8-53d5-4eef-b8dc-af72849238ee	\N	campaign_state	null	2025-06-23 00:22:29.158495+00
b4ba7bc1-8951-46af-9450-f5c5ef9122f5	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 9}	2025-06-23 00:22:29.180652+00	19	2d5009ff-f36d-43d7-bb71-9581b39840b0	\N	campaign_state	null	2025-06-23 00:22:29.182533+00
cbdb8550-80f2-4b91-8a35-6ad816575364	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 1, "goroutine_id": 6}	2025-06-23 00:22:29.220956+00	20	b7156593-9a13-4889-b3b1-899995168eaf	\N	campaign_state	null	2025-06-23 00:22:29.221047+00
c3a89bf9-bd46-411d-b024-d1ba044535f3	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 1, "goroutine_id": 0}	2025-06-23 00:22:29.234275+00	21	36523429-7b0d-47be-b984-4b6b07e0074c	\N	campaign_state	null	2025-06-23 00:22:29.234442+00
b635e8b7-a98e-4f11-924b-cada406ea5e2	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 2, "goroutine_id": 0}	2025-06-23 00:22:29.242043+00	22	746e138d-526f-4dc8-abfd-9a1b7a735e9c	\N	campaign_state	null	2025-06-23 00:22:29.242209+00
001bc94f-9e29-4ea6-8458-9f75f182faaa	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 3, "goroutine_id": 0}	2025-06-23 00:22:29.280739+00	23	1257f939-63ab-4fd3-950d-06450e8c94bd	\N	campaign_state	null	2025-06-23 00:22:29.280976+00
8d47d854-115a-49d9-86e0-f616d192db5c	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 0}	2025-06-23 00:22:29.325472+00	24	86a9b596-2836-4c8a-b3fd-d62effb05081	\N	campaign_state	null	2025-06-23 00:22:29.325523+00
9118760d-18cb-4971-8f42-1be33dff0ebd	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 2, "goroutine_id": 6}	2025-06-23 00:22:29.346029+00	25	56c7f347-f49a-4afe-9901-cac5f5950091	\N	campaign_state	null	2025-06-23 00:22:29.346608+00
18ff8228-d56e-4ab9-9f88-7c6397f01b2a	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 3, "goroutine_id": 6}	2025-06-23 00:22:29.368876+00	26	d95c3077-b4a9-4b67-9eb7-ed97c3180585	\N	campaign_state	null	2025-06-23 00:22:29.369059+00
da7eca32-d6c9-4bf5-a333-4bfcf263251a	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 6}	2025-06-23 00:22:29.376439+00	27	c7955249-dce2-4d3a-8f1f-efe5ae764f82	\N	campaign_state	null	2025-06-23 00:22:29.376462+00
587acd98-9920-420e-ab58-1dd01ef3a1de	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 0, "goroutine_id": 4}	2025-06-23 00:22:29.431251+00	28	8509063d-bdd4-4f13-8060-b375dd1859de	\N	campaign_state	null	2025-06-23 00:22:29.43272+00
276ede96-66de-4205-80fe-22b393080b17	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 2, "goroutine_id": 8}	2025-06-23 00:22:29.480357+00	29	71c093dd-fa57-43ec-a7d9-3b35ecc6c733	\N	campaign_state	null	2025-06-23 00:22:29.480456+00
4842fe04-d2be-4b77-be1d-a4d1399d4ec1	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 3, "goroutine_id": 8}	2025-06-23 00:22:29.490833+00	30	48e33879-2394-4ba7-b066-8f3e0ff89759	\N	campaign_state	null	2025-06-23 00:22:29.490956+00
d640f125-2da4-40f0-bb00-b50251b3cdec	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 8}	2025-06-23 00:22:29.533013+00	31	fa5437f1-0b8e-4daf-89b8-4663e2249cde	\N	campaign_state	null	2025-06-23 00:22:29.53305+00
91077634-bc7b-4f10-8db8-60abfbee0a1a	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 0, "goroutine_id": 2}	2025-06-23 00:22:29.541431+00	32	449983ff-eaca-4578-ae6a-6c8f07e3bb28	\N	campaign_state	null	2025-06-23 00:22:29.541458+00
102d792d-98ec-4429-b37d-7bb9c0295b02	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 1, "goroutine_id": 2}	2025-06-23 00:22:29.547954+00	33	db932c0c-785b-4a61-9a10-541361c0eb16	\N	campaign_state	null	2025-06-23 00:22:29.547991+00
59b80568-382a-451b-8b37-a2b08229c975	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 2, "goroutine_id": 2}	2025-06-23 00:22:29.582835+00	34	7c1681f3-f324-4110-be32-2fcf7571e02c	\N	campaign_state	null	2025-06-23 00:22:29.583057+00
b052d398-047e-4ddd-af34-feb991fa29ab	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 3, "goroutine_id": 2}	2025-06-23 00:22:29.590645+00	35	58d98670-fad0-4b89-9ca3-e0202572c843	\N	campaign_state	null	2025-06-23 00:22:29.590761+00
67a07b8e-6a4b-4287-95e8-8f1cb0460425	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 2}	2025-06-23 00:22:29.59704+00	36	0e185f26-252a-4740-85fb-0f6de10bd0a2	\N	campaign_state	null	2025-06-23 00:22:29.597243+00
b44cc93a-9c3f-4345-aced-9cc1e01fb997	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 0, "goroutine_id": 5}	2025-06-23 00:22:29.692484+00	37	94779ae6-3965-4e83-98c1-60b4361ed2cb	\N	campaign_state	null	2025-06-23 00:22:29.692609+00
2b4493d9-889b-47d8-93d8-d37a52d74b3e	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 1, "goroutine_id": 5}	2025-06-23 00:22:29.700687+00	38	70110442-6b18-4f4b-ac04-aabf68ea117c	\N	campaign_state	null	2025-06-23 00:22:29.70088+00
e5aefa69-662d-454f-9ebd-a3b543e28712	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 2, "goroutine_id": 5}	2025-06-23 00:22:29.710871+00	39	e22f9da7-afe8-4ab2-a416-5eb2414e9f71	\N	campaign_state	null	2025-06-23 00:22:29.711028+00
aa94d416-878e-41f4-9629-e35f304fb07c	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 2, "goroutine_id": 7}	2025-06-23 00:22:29.756888+00	40	11a72842-d456-4c22-a548-250fb95045a6	\N	campaign_state	null	2025-06-23 00:22:29.758928+00
b480f51e-6593-433b-abe9-f474f04b8a30	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 3, "goroutine_id": 7}	2025-06-23 00:22:29.773967+00	41	5ca805df-926a-4ed0-8ef4-dd690c400de3	\N	campaign_state	null	2025-06-23 00:22:29.775158+00
131cb929-b912-46ee-b43b-d8028575c2ad	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 7}	2025-06-23 00:22:29.795235+00	42	6c1a8e4c-e422-40b2-99cb-a63851f5f183	\N	campaign_state	null	2025-06-23 00:22:29.795403+00
0fcf7b24-4bea-4c33-b738-dd0bcfece7a6	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 1}	2025-06-23 00:22:29.833982+00	43	7ff0f57e-01d6-4ac3-9b89-03fa349c4d91	\N	campaign_state	null	2025-06-23 00:22:29.834121+00
c4079e70-892c-46c5-947f-844658b3a66c	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 3, "goroutine_id": 5}	2025-06-23 00:22:29.863837+00	44	1eaf64fa-a135-43a2-83c8-0ed6505613d5	\N	campaign_state	null	2025-06-23 00:22:29.863998+00
e2229263-2aad-4c9a-bd49-b7b0330bfd8b	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 5}	2025-06-23 00:22:29.869003+00	45	4cbfc8dc-6552-42e9-9b91-b80e0a0ed441	\N	campaign_state	null	2025-06-23 00:22:29.869017+00
199993f9-bad0-42c1-95fe-689075244076	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 1, "goroutine_id": 4}	2025-06-23 00:22:29.926038+00	46	fe7aaed7-f0a3-4403-ab14-b727d0ad19cb	\N	campaign_state	null	2025-06-23 00:22:29.926087+00
bd9739ce-34f1-43bc-abfa-b620f8818824	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 2, "goroutine_id": 4}	2025-06-23 00:22:29.931422+00	47	c917242a-e5ed-4ff7-87a5-823ca832a713	\N	campaign_state	null	2025-06-23 00:22:29.931439+00
b3c3cf8b-49f8-48fa-b3d5-cde383c4d7af	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 3, "goroutine_id": 4}	2025-06-23 00:22:29.970543+00	48	95c14fe3-b4cf-46ed-941c-34a4cbf3033a	\N	campaign_state	null	2025-06-23 00:22:29.970688+00
17a92be2-12b0-4090-8bfa-d12916631fb3	26812ec7-9541-4dc2-9a01-a3f2c1694e02	concurrent_update	{"timestamp": 1750638149, "update_id": 4, "goroutine_id": 4}	2025-06-23 00:22:29.97906+00	49	7e1b27b1-3821-444f-b9be-a2061405677e	\N	campaign_state	null	2025-06-23 00:22:29.979169+00
138f4c3b-2a84-477c-8e57-bc82a53370ee	78a225b5-9904-451b-92e5-9a4f142b913b	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-23 00:17:30.150254+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-23 00:22:30.15027+00
e0e53277-af08-4bed-abfd-25fc83cd7b44	78a225b5-9904-451b-92e5-9a4f142b913b	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-23 00:18:30.150255+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-23 00:22:30.153479+00
962a1988-d638-493d-ae13-ff1e4904797e	78a225b5-9904-451b-92e5-9a4f142b913b	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-23 00:19:30.150256+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-23 00:22:30.155356+00
4f32ddf6-c7b8-4e04-af84-fd412fce68cf	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 19, "new_version": 2, "old_version": 1}	2025-06-23 00:22:30.284958+00	2	e5cb4df1-027c-4359-ab5f-f67e5bf2aaa6	\N	campaign_state	null	2025-06-23 00:22:30.285238+00
a616b41d-2d55-4dbe-8c1e-5b30cca4d6ec	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 16, "new_version": 3, "old_version": 2}	2025-06-23 00:22:30.379756+00	3	c19dca9d-b44e-4214-9872-b9d1bbd23335	\N	campaign_state	null	2025-06-23 00:22:30.379918+00
7fd827c7-4e3b-4f43-9cdc-b6173e712767	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 4, "new_version": 4, "old_version": 3}	2025-06-23 00:22:30.419646+00	4	7d47e908-da34-4a27-9954-b460b89c427c	\N	campaign_state	null	2025-06-23 00:22:30.419864+00
d469563c-bf37-4a23-bb9e-6ee26f49467c	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 1, "new_version": 5, "old_version": 4}	2025-06-23 00:22:30.445313+00	5	36bfa4cd-c6e3-4cdd-bc17-ad15bdc39368	\N	campaign_state	null	2025-06-23 00:22:30.446073+00
69c3bbcf-24ff-475f-90ed-8fddad11f6fb	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 14, "new_version": 6, "old_version": 5}	2025-06-23 00:22:30.519482+00	6	ba288ee6-5722-4ee9-8673-d26c8f739e7b	\N	campaign_state	null	2025-06-23 00:22:30.519516+00
80e9b8fb-d8bd-43b2-81d2-bd9587239bfa	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 0, "new_version": 7, "old_version": 6}	2025-06-23 00:22:30.54914+00	7	36a1e688-7198-453e-98e9-cc1505489dec	\N	campaign_state	null	2025-06-23 00:22:30.550747+00
64c6a5a3-c398-4dfe-98a4-8e57b35a7281	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 18, "new_version": 8, "old_version": 7}	2025-06-23 00:22:30.586789+00	8	ebe1d164-5d6f-40d7-84c3-81f95dd600d2	\N	campaign_state	null	2025-06-23 00:22:30.586818+00
4ae4912c-dda1-43dc-973f-262c238cd5b8	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 12, "new_version": 9, "old_version": 8}	2025-06-23 00:22:30.610116+00	9	f96239f8-bfc8-4a4c-9c7f-c75b1a2267b8	\N	campaign_state	null	2025-06-23 00:22:30.610134+00
dda61916-3bc8-43aa-9f32-e5fb7d61cea5	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 9, "new_version": 10, "old_version": 9}	2025-06-23 00:22:30.626272+00	10	dbd4271a-cecb-4e84-8fcd-f310aa106ebb	\N	campaign_state	null	2025-06-23 00:22:30.629022+00
e273151d-566a-42a1-b6b4-05c8950c526f	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 6, "new_version": 11, "old_version": 10}	2025-06-23 00:22:30.651551+00	11	c5cf952a-018d-402b-b7fd-ccf50015ff65	\N	campaign_state	null	2025-06-23 00:22:30.652039+00
f55dfd0c-6902-4bbb-a1b9-44de744f14d1	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 11, "new_version": 12, "old_version": 11}	2025-06-23 00:22:30.682253+00	12	88ac99a9-10d5-4751-8e2d-402af89823b1	\N	campaign_state	null	2025-06-23 00:22:30.685981+00
5ebeb465-d2e1-4457-b1a9-c12d1b8a5794	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 13, "new_version": 13, "old_version": 12}	2025-06-23 00:22:30.728111+00	13	17fa58a7-34ef-4f66-b5bc-a1d92bb627d7	\N	campaign_state	null	2025-06-23 00:22:30.728128+00
08611c1c-3519-4a90-85fe-090ba937f409	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 7, "new_version": 14, "old_version": 13}	2025-06-23 00:22:30.766197+00	14	4621dbe2-2f64-46fe-a83e-4ca4ccd3fe11	\N	campaign_state	null	2025-06-23 00:22:30.766582+00
400e717f-8ce5-4359-8ae6-d226a95dac00	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 15, "new_version": 15, "old_version": 14}	2025-06-23 00:22:30.791448+00	15	de5ca308-0d49-4451-8470-01fb81411be9	\N	campaign_state	null	2025-06-23 00:22:30.791582+00
0fb366b8-d05c-4484-9dd4-944f66894c12	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 17, "new_version": 16, "old_version": 15}	2025-06-23 00:22:30.802587+00	16	b4ab8553-9f53-4867-8d55-cc5a366cdd31	\N	campaign_state	null	2025-06-23 00:22:30.805231+00
ceb01210-90b7-4ad2-8101-f9bdf0cf1fb9	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 8, "new_version": 17, "old_version": 16}	2025-06-23 00:22:30.844548+00	17	c69ab089-4d74-4e46-9066-0d9b7e9eb656	\N	campaign_state	null	2025-06-23 00:22:30.84471+00
bebba252-32e2-4bcf-bb69-08ac68a346f3	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 10, "new_version": 18, "old_version": 17}	2025-06-23 00:22:30.895057+00	18	1a2f4627-1af7-46db-9dda-a0f714c6c169	\N	campaign_state	null	2025-06-23 00:22:30.895165+00
684cb870-2c2b-4959-8700-debd16163f66	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 3, "new_version": 19, "old_version": 18}	2025-06-23 00:22:30.927579+00	19	eed3b5b6-ba56-45b8-94c4-d599a14666e6	\N	campaign_state	null	2025-06-23 00:22:30.927722+00
6bf276b8-724b-44ee-9bcb-b874e1f5fe24	0c08e72d-c771-412b-93ee-9a07e1183ba3	race_condition_test	{"update_id": 5, "new_version": 20, "old_version": 19}	2025-06-23 00:22:31.002922+00	20	12dcf372-4822-416b-a55c-e2897a815199	\N	campaign_state	null	2025-06-23 00:22:31.003029+00
4c429684-4642-4146-b825-7223f14bb675	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 0, "goroutine_id": 9}	2025-06-23 00:22:59.665439+00	2	fe2d7a06-0397-4f6e-a8f4-d0728e1b1218	\N	campaign_state	null	2025-06-23 00:22:59.665932+00
688a575a-00cc-4036-a0cf-ffc027da1521	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 0, "goroutine_id": 4}	2025-06-23 00:22:59.702589+00	3	d5032725-6df8-45ae-b0bf-82aef120c686	\N	campaign_state	null	2025-06-23 00:22:59.702967+00
63c92057-6ab0-40d4-aef7-3d6d13e4ec1f	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 1, "goroutine_id": 4}	2025-06-23 00:22:59.739277+00	4	22b495c3-9521-47fb-8353-3f294025af69	\N	campaign_state	null	2025-06-23 00:22:59.739528+00
3d7b3da7-63b6-47f8-b484-3e772716bf84	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 2, "goroutine_id": 4}	2025-06-23 00:22:59.747195+00	5	13c563ee-df16-4480-b68e-29d8cb86aba5	\N	campaign_state	null	2025-06-23 00:22:59.747349+00
82e2c921-8af2-4890-8d34-d71f79c7d6ee	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 3, "goroutine_id": 4}	2025-06-23 00:22:59.753456+00	6	1c72114e-e135-45b8-9947-4b733b4e4ad2	\N	campaign_state	null	2025-06-23 00:22:59.753573+00
6714df3d-6b75-44bf-9a8a-39ddbb38194d	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 4, "goroutine_id": 4}	2025-06-23 00:22:59.780999+00	7	50dab455-df37-47d3-8470-6463998b1856	\N	campaign_state	null	2025-06-23 00:22:59.781123+00
20d40458-711d-43ac-910c-f7f200923901	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 0, "goroutine_id": 5}	2025-06-23 00:22:59.811525+00	8	13b4dd9a-e53d-479d-bfe2-292d9ad6bc88	\N	campaign_state	null	2025-06-23 00:22:59.811986+00
ce9b3727-405e-4836-88da-760d17098eda	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 1, "goroutine_id": 5}	2025-06-23 00:22:59.829023+00	9	23dceb9a-b498-4447-8bae-e94a0b2a8780	\N	campaign_state	null	2025-06-23 00:22:59.831206+00
8896bf8e-8420-4d2d-ad6b-9191beea20d7	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 2, "goroutine_id": 5}	2025-06-23 00:22:59.861703+00	10	235b45c3-6886-41f8-85a4-2c071660abef	\N	campaign_state	null	2025-06-23 00:22:59.861932+00
5ee072d3-368e-4de4-a60d-62bb4fdb084a	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 1, "goroutine_id": 9}	2025-06-23 00:22:59.867555+00	11	310a84e9-cade-4380-ba27-4cdde5b13c55	\N	campaign_state	null	2025-06-23 00:22:59.867579+00
2ccdf81c-3e19-40bd-8136-67ae97aecc2a	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 2, "goroutine_id": 9}	2025-06-23 00:22:59.877608+00	12	26b13e48-11f8-45f2-a0b5-7915c365898b	\N	campaign_state	null	2025-06-23 00:22:59.878046+00
b6b42d12-7720-421a-abef-b0472feaf8cb	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 3, "goroutine_id": 9}	2025-06-23 00:22:59.894198+00	13	5a2e3eea-10e9-4724-adfd-e4e7a23bd8ba	\N	campaign_state	null	2025-06-23 00:22:59.894433+00
a93b55ba-abbb-46f9-bd93-f59a2ea3166c	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 0, "goroutine_id": 1}	2025-06-23 00:22:59.926388+00	14	05a4be74-a06c-4e38-b9c6-4b7d62814bb8	\N	campaign_state	null	2025-06-23 00:22:59.926593+00
b1130ce5-1ad7-4430-9ffe-700677a672ae	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 0, "goroutine_id": 6}	2025-06-23 00:22:59.934617+00	15	bb0f498d-62fc-447a-a55a-a0a3a41ee737	\N	campaign_state	null	2025-06-23 00:22:59.934643+00
6b7df72d-0099-485c-92e8-cf87631318d5	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 1, "goroutine_id": 6}	2025-06-23 00:22:59.963331+00	16	38da7b47-d425-4d5b-bf23-b36835462bf6	\N	campaign_state	null	2025-06-23 00:22:59.96349+00
68987600-88e3-49f0-b58b-e542661aac46	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638179, "update_id": 2, "goroutine_id": 6}	2025-06-23 00:22:59.969518+00	17	64699596-68e8-489c-91f7-d85fbe67fe30	\N	campaign_state	null	2025-06-23 00:22:59.969655+00
dc6f4815-450a-45a4-9eb0-4b730ff16e5c	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 1, "goroutine_id": 8}	2025-06-23 00:23:00.010739+00	18	e83f6e6a-93c9-4d89-a7fa-b62fd019b882	\N	campaign_state	null	2025-06-23 00:23:00.010961+00
c483dc9e-0533-43ad-a93c-ce6eced4a37a	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 2, "goroutine_id": 8}	2025-06-23 00:23:00.019233+00	19	fb66343c-8582-4fb6-b89b-e96a46148d63	\N	campaign_state	null	2025-06-23 00:23:00.019325+00
b94212a5-fa89-4637-a07d-50dd74048eb7	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 4, "goroutine_id": 9}	2025-06-23 00:23:00.037648+00	20	e953c642-2f9b-4c6d-822b-b3a4b5c6905b	\N	campaign_state	null	2025-06-23 00:23:00.039638+00
13ee5783-2f1e-45df-96f4-8b0bda3d429d	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 1, "goroutine_id": 1}	2025-06-23 00:23:00.057726+00	21	e1b27a5b-b127-43b1-93a8-4045f527d04c	\N	campaign_state	null	2025-06-23 00:23:00.057881+00
9fb33181-2589-48f6-9249-a6055b160d8c	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 2, "goroutine_id": 1}	2025-06-23 00:23:00.065044+00	22	0f3ced48-3f8c-412a-ba3c-9f06c3534e9e	\N	campaign_state	null	2025-06-23 00:23:00.065228+00
e6fb8af8-a353-46a4-8974-f91b7125886a	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 3, "goroutine_id": 1}	2025-06-23 00:23:00.070626+00	23	a261f926-d589-4e38-a279-f0153417ce1b	\N	campaign_state	null	2025-06-23 00:23:00.070776+00
dd37bb35-e7c2-4296-afb2-ffe8d5bd6758	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 4, "goroutine_id": 1}	2025-06-23 00:23:00.1044+00	24	3484bcbc-3726-40ba-88b9-e34b21d5563b	\N	campaign_state	null	2025-06-23 00:23:00.106877+00
874d6c8d-36d9-40d3-a550-1e1e34ed9a96	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 3, "goroutine_id": 6}	2025-06-23 00:23:00.135594+00	25	6791708e-5f03-427a-996c-183c8c6f31cb	\N	campaign_state	null	2025-06-23 00:23:00.13588+00
41120960-2d05-4d17-8b0f-048b1486f6d9	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 4, "goroutine_id": 6}	2025-06-23 00:23:00.14541+00	26	81928202-c52e-4b2c-83b2-b4143c9a5d3d	\N	campaign_state	null	2025-06-23 00:23:00.14551+00
860a1e68-59e0-497c-8444-6a19cc0c069e	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 0, "goroutine_id": 3}	2025-06-23 00:23:00.172305+00	27	c1558118-6ed4-4d9d-a11e-4d597c02f0ea	\N	campaign_state	null	2025-06-23 00:23:00.174421+00
5c89c184-1c18-43ac-9d79-a4cb08434782	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 1, "goroutine_id": 3}	2025-06-23 00:23:00.197258+00	28	77dc49c9-b1e5-45cb-a97f-9ed544b6e6cc	\N	campaign_state	null	2025-06-23 00:23:00.197372+00
4c994bd4-39c5-4aa7-9a9e-10f368da862e	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 2, "goroutine_id": 3}	2025-06-23 00:23:00.22817+00	29	cf2d00f6-51bf-4d08-a16a-39afbd127db5	\N	campaign_state	null	2025-06-23 00:23:00.228311+00
051c2c71-01bd-438d-8066-670ff1252587	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 3, "goroutine_id": 3}	2025-06-23 00:23:00.234521+00	30	89fbfcd3-23ba-43a6-9dc3-aaa82996dae1	\N	campaign_state	null	2025-06-23 00:23:00.235893+00
232925ad-a1a5-4581-b398-899a44732915	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 4, "goroutine_id": 3}	2025-06-23 00:23:00.261984+00	31	24b7dce4-25bf-424d-8f96-918a174c74c3	\N	campaign_state	null	2025-06-23 00:23:00.262002+00
2eae067c-f0aa-4eec-b60d-12e1be36513b	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 3, "goroutine_id": 8}	2025-06-23 00:23:00.268323+00	32	05c6a12e-f3c7-47a2-9339-27396b194708	\N	campaign_state	null	2025-06-23 00:23:00.268447+00
7c2e5440-84dd-4f0c-bb64-58f2127644bb	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 4, "goroutine_id": 8}	2025-06-23 00:23:00.305487+00	33	e352c4a5-7633-4f7e-9790-e79481f88e0a	\N	campaign_state	null	2025-06-23 00:23:00.305608+00
0aed86e4-7d90-4512-97a3-9692d30687f9	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 0, "goroutine_id": 7}	2025-06-23 00:23:00.327299+00	34	73a5f44d-67bc-4d78-a033-d2adad6f45da	\N	campaign_state	null	2025-06-23 00:23:00.327477+00
f9a6c883-1a3f-4c89-8d08-7f7ee4951839	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 1, "goroutine_id": 7}	2025-06-23 00:23:00.335435+00	35	a1dff6c0-4bfa-4c20-8e03-c8fa643d5643	\N	campaign_state	null	2025-06-23 00:23:00.335612+00
a2841fd0-a200-47c6-915c-0d9a00fc5032	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 2, "goroutine_id": 7}	2025-06-23 00:23:00.347162+00	36	7b794a94-20c8-4089-9d8d-e1757f1fe1b4	\N	campaign_state	null	2025-06-23 00:23:00.349806+00
21ba4e52-c165-4a22-9722-529f2eea5950	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 3, "goroutine_id": 7}	2025-06-23 00:23:00.362693+00	37	a5bb3f9d-0ae5-4865-a8da-e5ffc5b42db5	\N	campaign_state	null	2025-06-23 00:23:00.362867+00
3a845995-daeb-4144-9840-c70f033680d6	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 4, "goroutine_id": 7}	2025-06-23 00:23:00.368949+00	38	64ecaf06-fee3-47e5-ba21-be4362b11edc	\N	campaign_state	null	2025-06-23 00:23:00.369188+00
d372f1a4-4569-470e-b437-f602e272ae5c	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 0, "goroutine_id": 2}	2025-06-23 00:23:00.405958+00	39	e8b23264-0ff6-41a1-aa8d-7726bb92b24e	\N	campaign_state	null	2025-06-23 00:23:00.4085+00
e8f86a4f-82f2-4c38-91d9-1f73d58f143d	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 1, "goroutine_id": 2}	2025-06-23 00:23:00.430116+00	40	53abe1d0-fa87-4e9a-baab-552662ac0323	\N	campaign_state	null	2025-06-23 00:23:00.430166+00
03a1cc14-c6d4-4fb5-b9b4-11103d2dab43	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 0, "goroutine_id": 0}	2025-06-23 00:23:00.463689+00	41	f735b348-9a12-4939-83e7-9403ef39c596	\N	campaign_state	null	2025-06-23 00:23:00.46371+00
7f6c36ca-5071-4e03-ba81-8402a6830c65	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 1, "goroutine_id": 0}	2025-06-23 00:23:00.469746+00	42	340b8e06-77e3-4577-bfc1-98a28d6dc95d	\N	campaign_state	null	2025-06-23 00:23:00.469887+00
6187dc10-5e87-44ac-a442-90c43285cb42	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 2, "goroutine_id": 0}	2025-06-23 00:23:00.479684+00	43	5496d4cf-d1cc-4281-a4c2-fdd1ff03c788	\N	campaign_state	null	2025-06-23 00:23:00.479832+00
f6c226f2-8f78-48d8-be07-d299a63d3d43	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 3, "goroutine_id": 0}	2025-06-23 00:23:00.486835+00	44	7cd12382-1a0f-4f93-b30e-3afa9589d58a	\N	campaign_state	null	2025-06-23 00:23:00.487201+00
9f71a742-db71-48d7-a283-7752f0e0c678	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 4, "goroutine_id": 0}	2025-06-23 00:23:00.493534+00	45	efc23818-25ea-4e4d-8122-e9ef6f2cbbdc	\N	campaign_state	null	2025-06-23 00:23:00.493678+00
52fcef10-6f05-480d-b770-32366b5f376c	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 3, "goroutine_id": 5}	2025-06-23 00:23:00.564096+00	46	3278b7d2-3671-480b-ba52-f8167cf2f9eb	\N	campaign_state	null	2025-06-23 00:23:00.564195+00
3805b08d-855d-4d9b-932f-284071c1a1f2	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 4, "goroutine_id": 5}	2025-06-23 00:23:00.575325+00	47	7a7d3502-e209-4d47-ab07-5b4a0411a006	\N	campaign_state	null	2025-06-23 00:23:00.578022+00
87fd2a27-2762-41c2-96fa-1434f3ebe089	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 2, "goroutine_id": 2}	2025-06-23 00:23:00.670687+00	48	86f54819-fe87-478c-b95d-999bd22bf240	\N	campaign_state	null	2025-06-23 00:23:00.671105+00
33fe143c-2ba0-40d3-a30b-57d7d1248601	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 3, "goroutine_id": 2}	2025-06-23 00:23:00.697005+00	49	fbcb2728-b8b6-42bf-8cc3-4147bee9f242	\N	campaign_state	null	2025-06-23 00:23:00.697124+00
8195eb64-609b-498e-aca0-470c7eddec92	59e472d7-bec0-4540-8cc2-45cb60ce5e76	concurrent_update	{"timestamp": 1750638180, "update_id": 4, "goroutine_id": 2}	2025-06-23 00:23:00.70985+00	50	3616b4f3-526a-470f-be6b-bcd50e245a9f	\N	campaign_state	null	2025-06-23 00:23:00.70999+00
b7262ac4-26ec-4481-ad25-e751899e1a57	faa82de3-d319-432b-90a2-0a3bba620be0	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-23 00:18:00.865855+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-23 00:23:00.865867+00
cb59d642-ddd2-4c06-9deb-c7be281a303b	faa82de3-d319-432b-90a2-0a3bba620be0	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-23 00:19:00.865856+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-23 00:23:00.873233+00
6bf87071-d6ed-45c7-a304-eff1aabe2831	faa82de3-d319-432b-90a2-0a3bba620be0	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-23 00:20:00.865857+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-23 00:23:00.875859+00
0e29d246-d2db-490b-9980-4b89bff21ff3	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 19, "new_version": 2, "old_version": 1}	2025-06-23 00:23:00.961098+00	2	7a63dc45-0be6-4db3-8522-069a1ed214e9	\N	campaign_state	null	2025-06-23 00:23:00.964701+00
5e38a5f1-13f9-4872-97b0-a8b514039f77	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 2, "new_version": 3, "old_version": 2}	2025-06-23 00:23:01.016935+00	3	af1e449b-76f0-4b4a-b801-9cae34531347	\N	campaign_state	null	2025-06-23 00:23:01.024601+00
a233f6af-dbe5-49d8-b63c-70a3ef143750	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 10, "new_version": 4, "old_version": 3}	2025-06-23 00:23:01.082296+00	4	2021be65-2e36-4f57-a36a-a53b00453e2c	\N	campaign_state	null	2025-06-23 00:23:01.082647+00
bb21984e-cdb6-4d78-9efe-1fdcd911b917	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 11, "new_version": 5, "old_version": 4}	2025-06-23 00:23:01.109702+00	5	6b7cfd43-09b7-49ec-a440-5d55d3fd519c	\N	campaign_state	null	2025-06-23 00:23:01.118107+00
f6d70dc8-5e04-4d31-8199-3428a4e264b3	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 17, "new_version": 6, "old_version": 5}	2025-06-23 00:23:01.129135+00	6	7982dd31-6c01-4c6b-ae15-708d1c5ae2dd	\N	campaign_state	null	2025-06-23 00:23:01.12916+00
415043a4-3d46-4047-bdcb-a288e6c3adbd	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 5, "new_version": 7, "old_version": 6}	2025-06-23 00:23:01.192043+00	7	cd794dc0-6c12-4388-87a4-f3c54fd58433	\N	campaign_state	null	2025-06-23 00:23:01.192059+00
fab81952-cd4c-47de-b3db-a380931ce20f	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 13, "new_version": 8, "old_version": 7}	2025-06-23 00:23:01.222543+00	8	07c32ab2-e556-4253-ae00-bc7ca8ded497	\N	campaign_state	null	2025-06-23 00:23:01.222566+00
4e694071-9dfa-437b-9150-1442a8a3f652	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 6, "new_version": 9, "old_version": 8}	2025-06-23 00:23:01.297744+00	9	0b75a2d1-8bf7-41c3-ae8a-a39faab874e2	\N	campaign_state	null	2025-06-23 00:23:01.299235+00
a9ffa040-9c81-443e-b323-a8dee8061696	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 7, "new_version": 10, "old_version": 9}	2025-06-23 00:23:01.359442+00	10	5e8b7a07-879d-456c-a558-1abe1dbd45ba	\N	campaign_state	null	2025-06-23 00:23:01.359461+00
a17d64ba-969c-4232-8b40-ab489283d17f	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 14, "new_version": 11, "old_version": 10}	2025-06-23 00:23:01.373788+00	11	25718c2f-faf3-42be-a0cf-9542d7f35938	\N	campaign_state	null	2025-06-23 00:23:01.37395+00
d231d4f8-0404-4190-b751-836b8c091763	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 15, "new_version": 12, "old_version": 11}	2025-06-23 00:23:01.411617+00	12	74df5b57-f95e-44ca-afcd-9cf27db38800	\N	campaign_state	null	2025-06-23 00:23:01.41188+00
2239bc31-5139-4593-8be7-70e4d1d42f0e	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 18, "new_version": 13, "old_version": 12}	2025-06-23 00:23:01.467354+00	13	36eb85e1-e0d6-470d-8e82-672bd8144379	\N	campaign_state	null	2025-06-23 00:23:01.467476+00
4cfa6a39-e416-49af-93cf-2b9bb8797de7	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 4, "new_version": 14, "old_version": 13}	2025-06-23 00:23:01.4909+00	14	e2c44ec5-8329-49d6-84d1-7faa32d75acd	\N	campaign_state	null	2025-06-23 00:23:01.490928+00
27cf49c5-2272-4796-b00b-3fae7eb54c15	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 9, "new_version": 15, "old_version": 14}	2025-06-23 00:23:01.506487+00	15	ee82c0aa-50a9-4bbc-a1b0-4795d2dbbd54	\N	campaign_state	null	2025-06-23 00:23:01.506512+00
2ffec2dd-de38-4b7d-88b5-f2861ff4f1f9	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 1, "new_version": 16, "old_version": 15}	2025-06-23 00:23:01.532001+00	16	167b2837-30ee-4749-be80-d0d925d7e02e	\N	campaign_state	null	2025-06-23 00:23:01.532121+00
1fec36d3-3064-4741-b87e-a3c6d5b2370c	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 8, "new_version": 17, "old_version": 16}	2025-06-23 00:23:01.544869+00	17	d190cb5f-f344-46a1-bff9-a1c4cb1227e0	\N	campaign_state	null	2025-06-23 00:23:01.545046+00
aa9c5130-0bd6-445d-9776-fc5d446a770f	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 12, "new_version": 18, "old_version": 17}	2025-06-23 00:23:01.60334+00	18	3d0ca2f2-1a21-4817-ad78-d9fe55e4249e	\N	campaign_state	null	2025-06-23 00:23:01.603496+00
86b058cb-36da-4838-bbe9-53e1a47b66d4	ad895fa4-93f3-490e-89e1-63fd05721c30	race_condition_test	{"update_id": 16, "new_version": 19, "old_version": 18}	2025-06-23 00:23:01.653397+00	19	65743c17-0c17-4034-bef6-b36c46fdfa8e	\N	campaign_state	null	2025-06-23 00:23:01.653561+00
bf555d96-d5e1-4d03-b56d-84ccff9b46a9	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 0, "goroutine_id": 9}	2025-06-23 17:50:39.257544+00	2	e5767483-9076-496d-8d4f-ccf8e69419a0	\N	campaign_state	null	2025-06-23 17:50:39.257669+00
612a2fc1-5af8-4eb4-be56-828a587f53e6	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 1, "goroutine_id": 9}	2025-06-23 17:50:39.330668+00	3	f9f28f37-fa91-423a-ab87-e6fc8e5d5d3c	\N	campaign_state	null	2025-06-23 17:50:39.331814+00
2d55c498-4528-4cf0-9106-80e895d02cea	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 1, "goroutine_id": 0}	2025-06-23 17:50:39.399675+00	4	9d460f78-2ab4-477d-8d26-63106fd9c541	\N	campaign_state	null	2025-06-23 17:50:39.401986+00
83486a51-219b-403f-9150-c15aa5de5894	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 0, "goroutine_id": 6}	2025-06-23 17:50:39.428051+00	5	1efef3f3-01be-4796-b70e-ce49f2da4def	\N	campaign_state	null	2025-06-23 17:50:39.430274+00
7801a88b-ce48-49da-a4cf-969824b03d3f	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 2, "goroutine_id": 9}	2025-06-23 17:50:39.536653+00	6	39b70913-faf4-49c7-ac21-2a8083e7905b	\N	campaign_state	null	2025-06-23 17:50:39.536675+00
0abc222b-9051-478c-864f-ee702feaba25	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 3, "goroutine_id": 9}	2025-06-23 17:50:39.551343+00	7	9f70178c-4a98-42aa-885e-a79f46f06213	\N	campaign_state	null	2025-06-23 17:50:39.551503+00
9abd785a-93da-4fb7-b0fb-0569a12d8df1	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 0, "goroutine_id": 5}	2025-06-23 17:50:39.627783+00	8	00287d3c-e464-4d68-ba20-aa012f955976	\N	campaign_state	null	2025-06-23 17:50:39.628155+00
0d5fe65c-3ac2-4688-8a7d-89be3e6daaf4	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 1, "goroutine_id": 5}	2025-06-23 17:50:39.69322+00	9	5776b1df-75ee-4535-9c9c-f100d32a2b60	\N	campaign_state	null	2025-06-23 17:50:39.69538+00
838563c8-9cef-4cfe-96f1-15c10f86c922	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 0, "goroutine_id": 4}	2025-06-23 17:50:39.773133+00	10	3ab0e2b5-4188-41a1-add4-9882a2ec8ec3	\N	campaign_state	null	2025-06-23 17:50:39.773759+00
586d583f-759e-4700-83a1-1526a66e0391	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 4, "goroutine_id": 9}	2025-06-23 17:50:39.83587+00	11	6f8391fb-e089-443b-8fcb-f1e8c5e1b4c0	\N	campaign_state	null	2025-06-23 17:50:39.838204+00
a7fefdd6-fafc-456a-82f5-98e2a89c76a6	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 0, "goroutine_id": 3}	2025-06-23 17:50:39.919473+00	12	46aa7144-5bbc-477e-9bfa-d06a10b06300	\N	campaign_state	null	2025-06-23 17:50:39.92214+00
880d1a3a-3699-4932-8439-f52f307bfbe3	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701039, "update_id": 0, "goroutine_id": 2}	2025-06-23 17:50:39.993558+00	13	16d17696-e6f7-4ed9-959b-db112276d3c5	\N	campaign_state	null	2025-06-23 17:50:39.997772+00
f243f116-3d55-4660-84a3-78a41302a40b	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 1, "goroutine_id": 2}	2025-06-23 17:50:40.04396+00	14	06764cc3-f435-4135-baea-1385a5b41c2a	\N	campaign_state	null	2025-06-23 17:50:40.044138+00
7872a584-754f-4cdf-9f2c-fbaad01b34cb	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 2, "goroutine_id": 2}	2025-06-23 17:50:40.052078+00	15	0e39d9b8-6f08-46c2-ba1c-8470f53df6a1	\N	campaign_state	null	2025-06-23 17:50:40.052483+00
b03567f7-1cc8-42d7-a860-3f653b5c8331	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 3, "goroutine_id": 2}	2025-06-23 17:50:40.097717+00	16	2b660c32-70e5-45cf-9494-d835c888acbe	\N	campaign_state	null	2025-06-23 17:50:40.09785+00
b2e95aca-ae08-4f8b-abba-ea8331c3e522	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 1, "goroutine_id": 3}	2025-06-23 17:50:40.177309+00	17	17d9e4f7-9753-4bb0-a942-5c164f904ab8	\N	campaign_state	null	2025-06-23 17:50:40.177605+00
c53ba800-41b6-4ccf-a125-612c52640da7	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 2, "goroutine_id": 5}	2025-06-23 17:50:40.192137+00	18	c60379a7-4fb5-4fdc-8e98-41f5ad1d9b63	\N	campaign_state	null	2025-06-23 17:50:40.192161+00
5329e7f5-693c-48eb-9708-804eb073440b	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 0, "goroutine_id": 1}	2025-06-23 17:50:40.279803+00	19	1e1a0a50-084e-40ea-b260-d3fda7161279	\N	campaign_state	null	2025-06-23 17:50:40.285086+00
0f5ff1c0-b35b-4891-a981-2d9c72439e47	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 1, "goroutine_id": 6}	2025-06-23 17:50:40.358461+00	20	c87e0cc3-c83c-426e-9533-c320fb19059e	\N	campaign_state	null	2025-06-23 17:50:40.358603+00
8066c494-bd4b-47bf-8e69-69a38a8b080e	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 2, "goroutine_id": 6}	2025-06-23 17:50:40.417859+00	21	b0468f38-9825-4848-a9fc-655311677aa5	\N	campaign_state	null	2025-06-23 17:50:40.417871+00
34c4cac5-25ad-42b6-92db-682c87e85fe1	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 3, "goroutine_id": 6}	2025-06-23 17:50:40.426161+00	22	81ae4255-945d-41b0-b63f-8d1b33d6f22e	\N	campaign_state	null	2025-06-23 17:50:40.426193+00
c01d1f45-9b9c-4028-ad0e-e99f0db3c89e	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 4, "goroutine_id": 6}	2025-06-23 17:50:40.434724+00	23	b3b0005e-ed55-478c-af89-7b1077257771	\N	campaign_state	null	2025-06-23 17:50:40.434844+00
184e3aea-5a42-4e88-99c5-19eecde6ac15	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 1, "goroutine_id": 4}	2025-06-23 17:50:40.460449+00	24	9fe03608-3ca4-4094-8c07-8674b08be19f	\N	campaign_state	null	2025-06-23 17:50:40.462953+00
d2b9e705-758f-4a38-b626-b4914d418923	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 2, "goroutine_id": 4}	2025-06-23 17:50:40.568734+00	25	fdbac925-33d9-43f1-a950-46bcbb48fd58	\N	campaign_state	null	2025-06-23 17:50:40.569136+00
beec244e-9cf7-4c95-bbd0-a00472aded99	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 4, "goroutine_id": 2}	2025-06-23 17:50:40.636116+00	26	72e492a3-d918-42e2-9f04-63480c93391f	\N	campaign_state	null	2025-06-23 17:50:40.636218+00
fe3496a0-4e62-425d-bfa4-c23bee8a9f39	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 2, "goroutine_id": 3}	2025-06-23 17:50:40.69264+00	27	8cd43273-363a-47a0-b6fb-75cfb02b23d5	\N	campaign_state	null	2025-06-23 17:50:40.692654+00
e88085a3-8f29-44bd-bff5-24609a41770d	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 3, "goroutine_id": 3}	2025-06-23 17:50:40.761221+00	28	91925061-9c48-415b-8be2-48d7ae7689a8	\N	campaign_state	null	2025-06-23 17:50:40.763293+00
0a78e1dc-0782-4c85-b16d-c071661a4de8	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 4, "goroutine_id": 3}	2025-06-23 17:50:40.791419+00	29	fd1e36c6-5c80-48ed-8e03-0ac220d33210	\N	campaign_state	null	2025-06-23 17:50:40.79144+00
b3f88ec6-39f0-41a6-9784-6913ad4cc441	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 2, "goroutine_id": 0}	2025-06-23 17:50:40.848763+00	30	c75f11a9-03d7-430b-b3f4-0c66c62e5528	\N	campaign_state	null	2025-06-23 17:50:40.848794+00
4ce7368c-d7ac-43cb-ac3c-38e26ccc867a	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 3, "goroutine_id": 0}	2025-06-23 17:50:40.856655+00	31	c6de477f-0dc0-46e2-846e-0ad35599f33e	\N	campaign_state	null	2025-06-23 17:50:40.856834+00
d570d7d6-a641-42db-a022-7c6056346336	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 4, "goroutine_id": 0}	2025-06-23 17:50:40.867765+00	32	63451d25-5e46-48b7-9634-c0042180b5f2	\N	campaign_state	null	2025-06-23 17:50:40.867916+00
b9366186-0916-48bc-a571-7a02e71d4f73	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 1, "goroutine_id": 8}	2025-06-23 17:50:40.919759+00	33	1b57ed9e-9961-43c2-9c74-d0064c6afead	\N	campaign_state	null	2025-06-23 17:50:40.92374+00
8aa2cfb2-a8f3-4ec2-a7ba-1bf770103317	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701040, "update_id": 4, "goroutine_id": 5}	2025-06-23 17:50:40.985234+00	34	6ec3ec29-e89d-433f-946c-bf07c6861cbc	\N	campaign_state	null	2025-06-23 17:50:40.985467+00
bd800ae0-dd65-4f4b-b6df-9b88308edbad	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 1, "goroutine_id": 1}	2025-06-23 17:50:41.045511+00	35	13c8b8c3-4bcb-4904-8a49-7b51cc91e0d1	\N	campaign_state	null	2025-06-23 17:50:41.045747+00
bd56c452-6cf5-4037-9332-09ab17835757	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 2, "goroutine_id": 8}	2025-06-23 17:50:41.113311+00	36	16fe11ed-1c15-4904-a793-8105535e944f	\N	campaign_state	null	2025-06-23 17:50:41.115631+00
d98b82d9-7534-48a8-8101-17b214132e8d	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 3, "goroutine_id": 8}	2025-06-23 17:50:41.155241+00	37	a4fee6d4-655c-4661-b6ed-bdbab70f466b	\N	campaign_state	null	2025-06-23 17:50:41.155261+00
16f6bcb4-06ad-456f-ac48-a0a0b0734e26	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 4, "goroutine_id": 8}	2025-06-23 17:50:41.247563+00	38	e4e8f7fb-78f1-43e3-998b-0ec80843730e	\N	campaign_state	null	2025-06-23 17:50:41.24938+00
21f371ee-edcc-4c1c-ae66-b1a441fb91e1	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 1, "goroutine_id": 7}	2025-06-23 17:50:41.321147+00	39	90d61e4d-011d-4b78-96fe-2c427b46a102	\N	campaign_state	null	2025-06-23 17:50:41.321319+00
da7dbc46-2955-45e2-964f-acd311888711	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 2, "goroutine_id": 7}	2025-06-23 17:50:41.329151+00	40	a77324b5-488a-47f3-8d88-6787dd173af1	\N	campaign_state	null	2025-06-23 17:50:41.329303+00
e5be1b05-1c39-4af0-8ebc-0bac78d0a4b7	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 2, "goroutine_id": 1}	2025-06-23 17:50:41.365848+00	41	958bd84b-d26d-423d-a190-1ccbb3e84144	\N	campaign_state	null	2025-06-23 17:50:41.36605+00
cf4654a3-463f-4985-81ed-1d0114135e64	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 3, "goroutine_id": 1}	2025-06-23 17:50:41.388511+00	42	24c10544-630b-4ea0-badb-77de21bee560	\N	campaign_state	null	2025-06-23 17:50:41.391121+00
a6ac31f6-58b1-4915-ba78-f262e798623c	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 4, "goroutine_id": 1}	2025-06-23 17:50:41.480336+00	43	1823ce42-1e9b-4dee-965c-be8c4d2b97b1	\N	campaign_state	null	2025-06-23 17:50:41.480603+00
801981fa-02b3-4269-92e0-5d91f34eceab	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 4, "goroutine_id": 4}	2025-06-23 17:50:41.551821+00	44	72faa219-61e4-4c0e-8730-56ee95135162	\N	campaign_state	null	2025-06-23 17:50:41.552096+00
09344601-3412-4185-8c43-18952e41531d	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 3, "goroutine_id": 7}	2025-06-23 17:50:41.60318+00	45	03835f12-0e59-4441-992b-51ed1424f766	\N	campaign_state	null	2025-06-23 17:50:41.603196+00
72b954cb-cda8-4012-b274-07ff4524141a	24351ad9-145a-465d-b745-27e8efe32920	concurrent_update	{"timestamp": 1750701041, "update_id": 4, "goroutine_id": 7}	2025-06-23 17:50:41.64014+00	46	92588231-9eb1-4f23-8147-b0332923ac3e	\N	campaign_state	null	2025-06-23 17:50:41.640169+00
5ff40975-5de4-4b7e-aec4-6c51abb5d411	e0b0f317-8ebf-4105-92a3-64f432b0cb40	campaign_created	{"created_by": "test_user", "initial_status": "pending"}	2025-06-23 17:45:41.948742+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-23 17:50:41.950456+00
15028009-4799-4fde-8731-a796df03d4f8	e0b0f317-8ebf-4105-92a3-64f432b0cb40	campaign_queued	{"new_status": "queued", "old_status": "pending"}	2025-06-23 17:46:41.948743+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-23 17:50:41.981814+00
213fc87a-d066-46b8-9d04-78c7b8609865	e0b0f317-8ebf-4105-92a3-64f432b0cb40	campaign_started	{"new_status": "running", "old_status": "queued"}	2025-06-23 17:47:41.948744+00	0	00000000-0000-0000-0000-000000000000	\N	campaign_state	null	2025-06-23 17:50:42.006146+00
174cf312-e181-4518-9a7a-49bc04c21b20	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 19, "new_version": 2, "old_version": 1}	2025-06-23 17:50:42.290158+00	2	5241996e-0c1a-41f1-97f8-037b271f415e	\N	campaign_state	null	2025-06-23 17:50:42.291521+00
4fc814f8-99dc-49d2-a41d-a67f1a943fc6	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 12, "new_version": 3, "old_version": 2}	2025-06-23 17:50:42.348108+00	3	03a107e4-0219-4e35-a972-e8cb5c594fc4	\N	campaign_state	null	2025-06-23 17:50:42.348222+00
56405f61-b851-4ea7-9b88-ff02c13d3563	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 15, "new_version": 4, "old_version": 3}	2025-06-23 17:50:42.406952+00	4	a8d70c1f-e1b2-4c34-9fca-1d8fdd90eaf2	\N	campaign_state	null	2025-06-23 17:50:42.407214+00
bf738083-e411-4e39-a21a-e1dc205aa10b	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 4, "new_version": 5, "old_version": 4}	2025-06-23 17:50:42.435486+00	5	dc713d71-c931-4b05-8c5e-ad8feae96dbd	\N	campaign_state	null	2025-06-23 17:50:42.438911+00
a5d209bc-5e14-4cda-b1bf-b0b8b33a9a4b	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 8, "new_version": 6, "old_version": 5}	2025-06-23 17:50:42.494945+00	6	aed17ed7-fcab-4a91-9c13-8b1240fbec77	\N	campaign_state	null	2025-06-23 17:50:42.497749+00
4929384a-2dd8-4656-8f57-70dbea315cf9	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 1, "new_version": 7, "old_version": 6}	2025-06-23 17:50:42.592994+00	7	04380b54-4a35-4393-8353-c9bf3baf3e39	\N	campaign_state	null	2025-06-23 17:50:42.597211+00
3ed9b3db-3bad-4bed-b209-2eee8024d510	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 9, "new_version": 8, "old_version": 7}	2025-06-23 17:50:42.617228+00	8	dff925e2-e46e-47b8-81e8-dead2feb0f7a	\N	campaign_state	null	2025-06-23 17:50:42.617461+00
08748a93-b096-4dd7-9fa8-0a6b187efdf3	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 6, "new_version": 9, "old_version": 8}	2025-06-23 17:50:42.654613+00	9	6064588e-e246-4c85-beaf-4948b06f1781	\N	campaign_state	null	2025-06-23 17:50:42.654808+00
d71e7c8c-64e6-4f6c-9bff-01ffc493fc59	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 13, "new_version": 10, "old_version": 9}	2025-06-23 17:50:42.710975+00	10	029d9a61-b8ba-4907-988b-06de96c53e99	\N	campaign_state	null	2025-06-23 17:50:42.718018+00
4bcf58e3-ec94-4f30-ac01-a0345c528b24	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 16, "new_version": 11, "old_version": 10}	2025-06-23 17:50:42.750965+00	11	06de1e6b-1b89-4a76-b57a-3512effcd231	\N	campaign_state	null	2025-06-23 17:50:42.751095+00
7e692c1c-8cba-4a1a-849c-3df401313a31	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 5, "new_version": 12, "old_version": 11}	2025-06-23 17:50:42.798072+00	12	7acf0906-69a7-4533-b30d-7358bf623dc1	\N	campaign_state	null	2025-06-23 17:50:42.798472+00
e1d8f855-accc-4406-9249-22d2a1e236f1	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 10, "new_version": 13, "old_version": 12}	2025-06-23 17:50:42.891837+00	13	bc4c48c7-5df8-4de0-a367-7c0b6dee066f	\N	campaign_state	null	2025-06-23 17:50:42.892013+00
e1e50e30-ef20-4e5e-8771-772895fe8061	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 14, "new_version": 14, "old_version": 13}	2025-06-23 17:50:42.944972+00	14	c38554e5-6c2c-46a9-8052-b59f06afdc70	\N	campaign_state	null	2025-06-23 17:50:42.945096+00
7c78bbaf-7c13-4f20-9f99-1dc5177a9b1f	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 2, "new_version": 15, "old_version": 14}	2025-06-23 17:50:43.0101+00	15	a0a96d0a-8c80-4dda-9874-513c9dc5db58	\N	campaign_state	null	2025-06-23 17:50:43.010208+00
facfc6a0-aae9-4d7d-a227-8f1c1e0e3c15	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 0, "new_version": 16, "old_version": 15}	2025-06-23 17:50:43.07786+00	16	112c9b04-e665-4c80-b41e-ebb90cdb090f	\N	campaign_state	null	2025-06-23 17:50:43.079902+00
723c8b4a-e6f8-41c4-a542-8547b95757d9	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 3, "new_version": 17, "old_version": 16}	2025-06-23 17:50:43.175227+00	17	5dc92482-5637-4626-ae4f-28527ab86a5c	\N	campaign_state	null	2025-06-23 17:50:43.175251+00
1e9cb4d8-0072-49da-9566-dee9b0a2446c	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 17, "new_version": 18, "old_version": 17}	2025-06-23 17:50:43.200817+00	18	bdd372d1-6abf-4bf7-8533-d538569319b4	\N	campaign_state	null	2025-06-23 17:50:43.200933+00
fe0da886-3f66-47a6-b6ed-66b80daa93b6	92f2c022-d366-4f83-8e8c-f2444b632763	race_condition_test	{"update_id": 11, "new_version": 19, "old_version": 18}	2025-06-23 17:50:43.262408+00	19	ef10e5cc-9130-42a5-9610-8142b3f572a0	\N	campaign_state	null	2025-06-23 17:50:43.262445+00
\.


--
-- Data for Name: state_snapshots; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.state_snapshots (id, entity_id, entity_type, snapshot_version, state_data, metadata, created_at) FROM stdin;
08a74ade-cac1-4784-af65-7af02e4c876c	168d4d10-ba42-45ef-bdd5-dfb6f071f1eb	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 17:54:27.68944+00
5fb1211c-5f83-4f6a-9b5a-8c6834871c67	400b42ee-cf39-48c8-8b23-1f8f113e78e9	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-22 17:51:28.137658+00
7246b268-1e61-4dbe-8e84-48dde846523c	fafde498-6464-40a5-acfa-7b5b0dadd892	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-22 17:54:28.235755+00
28f136f2-db4f-45ef-a5f2-03cda84f0297	fafde498-6464-40a5-acfa-7b5b0dadd892	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-22 17:54:28.235755+00
1b638bf4-9bc3-47bc-b802-555aaed8bdde	0aaf1156-cdd7-47b6-bb4b-577ffe019cb1	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 17:54:28.318791+00
e1fb4b82-adc2-463d-b751-f87f55d62516	cfd3a7c1-3551-43ce-b828-78599a34a9eb	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 17:55:13.391205+00
42ddb040-9531-4abc-a59f-1b310ec01c3a	601e7cba-be50-48e8-a6e1-d8cdb6028a7b	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-22 17:52:13.604122+00
20e5faf1-7c4a-45ca-9be6-c5b5a6f351e3	77e7d6ca-f626-49d8-8dd0-a48ac4c3cc22	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-22 17:55:13.705488+00
72817508-8b63-4c59-9b19-0190f695da24	77e7d6ca-f626-49d8-8dd0-a48ac4c3cc22	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-22 17:55:13.705488+00
78b2cbb3-dca9-4309-8d7c-edf75826a033	b79b1b27-def9-4abf-a3df-4fa19e3df9e4	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 17:55:13.73632+00
23811326-e85f-4a23-b6b8-df32b5b165e0	0201e50c-ba77-4dbc-9bf8-574db8f425e9	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 17:58:50.750779+00
fccd60fd-c547-491a-b682-5633f6fb9927	626c758d-4292-4128-ab11-fa2b766470fb	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 18:00:09.392356+00
f784b25a-82e1-44fd-9e64-29491a536491	1cdf5514-cbf6-4c40-bfe0-8f6cb01810a6	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 18:00:23.776437+00
6a41c8ef-0c37-4e25-b04f-0e297feeec09	ebf080b3-78d0-47cf-9d94-3006b7df4d60	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-22 17:57:25.43801+00
3781a73c-e56a-469f-be2e-1b4ce329db1e	a3386387-2902-4765-acd9-4ef96ee9b3db	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-22 18:00:25.577856+00
e5a23f51-8d8a-40c9-af61-6ad5b2198fa4	a3386387-2902-4765-acd9-4ef96ee9b3db	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-22 18:00:25.577856+00
b7a64578-0d5e-43d2-85b6-c865715cd289	256d6037-b48b-4e18-b34e-e6cdd37a416f	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 18:00:25.596389+00
b4b8dcc8-77ed-4bb9-9a5a-d4789f6cb9c6	cbf6764d-de08-4075-8b0e-c97fc571d31b	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 18:16:09.359693+00
41a9c9f6-7613-4fb3-a781-e092dee09742	fd91b9c1-3909-4342-a119-f5fa15e3f52e	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-22 18:13:11.007865+00
73dddb8d-9f53-47de-b9aa-b4cbfded4961	c379869f-fd14-4165-a826-9693dcdbdce9	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-22 18:16:11.035109+00
445d8e06-bbc0-4290-9c6b-cc54a68e2b44	c379869f-fd14-4165-a826-9693dcdbdce9	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-22 18:16:11.035109+00
58288ef7-310e-4e4f-bf03-080ad271553a	4f44e8ea-d235-4cd4-80ba-70504689bb34	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 18:16:11.04905+00
37bfbd9d-933d-43ba-9b6d-322b594b3458	762ee366-2c78-41b6-8d78-dd865988a315	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 20:33:32.887131+00
8b751a64-5b5f-436a-97c4-2d135b6fa5b5	718bdb50-1479-4c20-b3ad-5e86672afa52	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-22 20:30:34.205423+00
67d109e3-08ed-444e-aff6-d391f7c39e73	a0db7161-79ae-4fa6-8a3d-5993b2d5026b	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-22 20:33:34.278196+00
1f3cb5b4-2c73-48b5-aca5-4fd609371843	a0db7161-79ae-4fa6-8a3d-5993b2d5026b	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-22 20:33:34.278196+00
d7fb8bcb-7a61-488e-ba5c-827f041f073c	8844cabf-daee-40f7-bb5d-1be743182613	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 20:33:34.322472+00
c854e593-a954-4b0e-834f-11fefb1faaf5	a7784123-784a-4e78-9388-9e32e9aceeec	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 20:36:15.189238+00
a277cd83-b701-41a0-9b19-1e800a8f4a74	4b876d82-15f6-4491-b025-0586cc613f25	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-22 20:33:16.556146+00
c2587f11-a1d6-416a-8519-b7549b5d4771	115e3598-8d9a-4be0-8dcd-ad825c7ed981	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-22 20:36:16.623625+00
94eabaa9-e074-48f2-a674-e56959bbb65d	115e3598-8d9a-4be0-8dcd-ad825c7ed981	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-22 20:36:16.623625+00
1354d056-92fa-4b63-8730-3947849a0692	03e9a3e1-67fa-405b-8277-78ff7e4c6034	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 20:36:16.649361+00
63e13ead-3dba-4f06-9118-f33aca23aab6	ccb5cc1e-80bd-4bb3-bd08-844c3b5ed1e0	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 20:50:06.110014+00
00d2bf35-263e-4acc-bf1e-ad3dac60a841	bf6d7337-7c0e-4ab4-860c-bbc93e2b2ac5	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-22 20:47:07.380135+00
adf1920a-79d4-4820-8112-1ff57a33c3a6	798f9eea-4d0a-4c79-a353-9566b8a2d6ea	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-22 20:50:07.407076+00
f5e54eb0-df44-4666-8638-799655553dbf	798f9eea-4d0a-4c79-a353-9566b8a2d6ea	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-22 20:50:07.407076+00
5407bf40-7aa9-440d-98ec-9617527d307c	9a49df2e-4319-49d7-969f-3df68f3ad183	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 20:50:07.42422+00
30145446-6ff4-4e99-b7d4-f7906d14d15b	c02b7c23-d661-411f-89e9-94f559568a2f	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 21:50:54.586599+00
23d12761-74a7-4321-842d-7f4f4393d0dd	bde7fbc3-9967-4a82-a017-f1cd11017ca3	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-22 21:47:55.428598+00
4406f015-c784-4d34-b3a6-86eb020621d0	50f9dc3f-a7c2-40c3-babd-340eb406b8d8	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-22 21:50:55.458078+00
79d257cf-e7ee-44fc-9402-57e3605683d8	50f9dc3f-a7c2-40c3-babd-340eb406b8d8	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-22 21:50:55.458078+00
58951359-7f93-4d29-a74d-70a5eefa7dc6	fc73b630-6e15-4e5c-b192-907b1ce30efd	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-22 21:50:55.479144+00
4aef60b4-b7fa-4c26-944a-1bcc13d36b28	26812ec7-9541-4dc2-9a01-a3f2c1694e02	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-23 00:22:28.574766+00
d45596b8-324a-423a-a4c1-63270e1640ef	78a225b5-9904-451b-92e5-9a4f142b913b	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-23 00:19:30.150256+00
839538ee-db3b-46e7-9229-77ae6cd289a8	f9053739-3141-4623-ae60-b6bbad0d649a	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-23 00:22:30.22666+00
d083844e-b2c2-4500-8e21-fac515db5c94	f9053739-3141-4623-ae60-b6bbad0d649a	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-23 00:22:30.22666+00
e26f4a66-313d-4a69-8a71-e825d4f6b235	0c08e72d-c771-412b-93ee-9a07e1183ba3	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-23 00:22:30.251107+00
cb4ef495-a0a5-489d-b275-36bfd84e935d	59e472d7-bec0-4540-8cc2-45cb60ce5e76	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-23 00:22:59.635994+00
ff2ccfaf-54bd-4b04-857b-bafb18ced8b4	faa82de3-d319-432b-90a2-0a3bba620be0	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-23 00:20:00.865857+00
4378e6e0-1725-4cb4-92db-dcc9a2c3eb2d	e139829c-9c81-440b-a08a-d6cc867a4ddd	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-23 00:23:00.905606+00
dea72e00-6af5-4d02-b840-8becdda5cbb7	e139829c-9c81-440b-a08a-d6cc867a4ddd	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-23 00:23:00.905606+00
fa6acde9-3fbb-429d-a259-1fa6bcc65cdb	ad895fa4-93f3-490e-89e1-63fd05721c30	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-23 00:23:00.919093+00
8fccee49-f9ec-47b9-9914-06a481927d20	24351ad9-145a-465d-b745-27e8efe32920	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-23 17:50:39.144427+00
d81a3e39-17fd-4d87-870c-e6c4d6c4ae30	e0b0f317-8ebf-4105-92a3-64f432b0cb40	campaign	0	{"status": "running", "metadata": {}}	{}	2025-06-23 17:47:41.948744+00
5f96edda-40cf-44d9-b241-6f4d196a2b36	b876ff3a-a078-46a3-ab0b-82b6dda422ac	campaign	5	{"status": "running", "metadata": {"version": 5, "test_data": "snapshot_test"}}	{"version": 5, "test_data": "snapshot_test"}	2025-06-23 17:50:42.086163+00
cb8d05a1-45fe-499f-bc28-2226ad0a59b7	b876ff3a-a078-46a3-ab0b-82b6dda422ac	campaign	6	{"status": "completed", "metadata": {"version": 5, "test_data": "snapshot_test", "final_status": "completed"}}	{"version": 5, "test_data": "snapshot_test", "final_status": "completed"}	2025-06-23 17:50:42.086163+00
82b563b3-bd62-4867-ab3c-40e9f71575cd	92f2c022-d366-4f83-8e8c-f2444b632763	campaign	1	{"status": "pending", "metadata": {}}	{}	2025-06-23 17:50:42.132306+00
\.


--
-- Data for Name: suspicious_input_alerts; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.suspicious_input_alerts (id, user_id, session_id, endpoint_pattern, http_method, field_name, pattern_name, provided_value, pattern_matched, category, severity, source_ip, user_agent, request_id, created_at) FROM stdin;
15ebedd0-806c-4229-b384-7358eeb0fc87	\N	\N	/api/campaigns	POST	description	command_injection	'; DROP TABLE campaigns; --	(;|\\||&|`|\\$\\(|\\${)	security	high	192.0.2.1	\N	e46f2bb4-638b-488b-9fb1-7495d89f4de4	2025-06-22 21:20:21.66891+00
d0a3ec0f-0397-4fa9-855f-56d2feb9a9a9	\N	\N	/api/campaigns	POST	description	sql_injection	'; DROP TABLE campaigns; --	(\\'|(union\\s+select)|(drop\\s+table)|(insert\\s+into)|(delete\\s+from)|(update\\s+set))	security	high	192.0.2.1	\N	e46f2bb4-638b-488b-9fb1-7495d89f4de4	2025-06-22 21:20:21.669709+00
0ef66344-7b5f-4137-8edf-e22d91b266b6	\N	\N	/api/campaigns	POST	description	command_injection	'; DROP TABLE campaigns; --	(;|\\||&|`|\\$\\(|\\${)	security	high	192.0.2.1	\N	5ef6e39f-326e-48bb-9802-603032e7bb5a	2025-06-22 21:24:05.647628+00
3c4afe63-438d-4cb7-aa1d-14620405b1c2	\N	\N	/api/campaigns	POST	description	sql_injection	'; DROP TABLE campaigns; --	(\\'|(union\\s+select)|(drop\\s+table)|(insert\\s+into)|(delete\\s+from)|(update\\s+set))	security	high	192.0.2.1	\N	5ef6e39f-326e-48bb-9802-603032e7bb5a	2025-06-22 21:24:05.647938+00
49cfb4cb-1539-44ae-a574-970ae050f456	\N	\N	/api/campaigns	POST	description	command_injection	'; DROP TABLE campaigns; --	(;|\\||&|`|\\$\\(|\\${)	security	high	192.0.2.1	\N	97ffd25b-30d6-4da1-be13-49f24b76d5c7	2025-06-22 21:27:37.661064+00
ed024214-b8d7-4486-9afd-2e7b03e535ca	\N	\N	/api/campaigns	POST	description	sql_injection	'; DROP TABLE campaigns; --	(\\'|(union\\s+select)|(drop\\s+table)|(insert\\s+into)|(delete\\s+from)|(update\\s+set))	security	high	192.0.2.1	\N	97ffd25b-30d6-4da1-be13-49f24b76d5c7	2025-06-22 21:27:37.668623+00
639e091a-3722-4aa9-9dc9-f91fe6127286	368b759a-0212-4e95-b694-031e1db890ad	0cb14236-293e-4dd0-9c8a-e69ef76b885a	/api/campaigns	POST	description	sql_injection	'; DROP TABLE campaigns; --	(\\'|(union\\s+select)|(drop\\s+table)|(insert\\s+into)|(delete\\s+from)|(update\\s+set))	security	high	192.0.2.1	\N	46d5d3fd-661d-44f7-bf08-e014325ba27e	2025-06-22 21:50:49.618012+00
\.


--
-- Data for Name: suspicious_input_patterns; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.suspicious_input_patterns (id, pattern_name, pattern, severity, description, detection_action, created_at, category, is_enabled) FROM stdin;
86f370ed-7f60-4a67-8593-221e93d228d2	sql_injection	(\\'|(union\\s+select)|(drop\\s+table)|(insert\\s+into)|(delete\\s+from)|(update\\s+set))	high	Potential SQL injection attempt	block	2025-06-22 20:42:12.532521+00	security	t
2a9b6a83-5242-48d8-a438-4af0af427b13	path_traversal	(\\.\\.\\/|\\.\\.\\\\|%2e%2e%2f|%2e%2e\\\\)	medium	Path traversal attempt	log	2025-06-22 20:42:12.532521+00	security	t
2703c92d-23d6-46f2-bc22-275ec3572d2a	command_injection	(;|\\||&|`|\\$\\(|\\${)	high	Potential command injection	block	2025-06-22 20:42:12.532521+00	security	t
030dec12-fd8f-4a5d-a1ad-d339b7ca982a	null_byte	(%00|\\\\x00|\\\\0)	medium	Null byte injection	log	2025-06-22 20:42:12.532521+00	security	t
ea0fa581-bf45-4eec-a4e7-1cea15b3385d	excessive_length	.{10000,}	low	Unusually long input	log	2025-06-22 20:42:12.532521+00	security	t
ab12c270-b141-4bfe-b265-5aea58000d20	html_injection	(<[^>]*>|&lt;[^&]*&gt;)	medium	HTML injection attempt	log	2025-06-22 20:42:12.532521+00	security	t
0a97d0b0-d87e-445b-b4a4-91057277c80b	ldap_injection	(cn=.*\\*|objectclass=\\*|\\(.*=.*\\).*\\*|ldap://|uid=.*\\*)	medium	LDAP injection attempt	log	2025-06-22 20:42:12.532521+00	security	t
744c058b-dafa-4bfa-acbc-73f061a465b7	xss_script	(<script[^>]*>|<\\/script>|javascript:|on\\w+\\s*=)	critical	Potential XSS attack	block	2025-06-22 20:42:12.532521+00	security	t
\.


--
-- Data for Name: system_alerts; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.system_alerts (id, alert_type, severity, message, context, acknowledged, acknowledged_by, acknowledged_at, created_at) FROM stdin;
7f2c691d-b6ed-4460-a80e-9ccbf4a2cd55	memory_utilization	warning	Memory utilization 80.00% for service test-service	{"memory_state": "warning", "service_name": "test-service", "heap_used_bytes": 800, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:46:02.584826+00
5bdeb39b-b140-4b85-93f9-2aa6bb6e8e2e	memory_utilization	critical	Memory utilization 100.00% for service worker_9	{"memory_state": "critical", "service_name": "worker_9", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.724486+00
db64c660-81e1-4955-a8e3-53bbc3541de3	memory_utilization	warning	Memory utilization 75.00% for service worker_9	{"memory_state": "warning", "service_name": "worker_9", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.762609+00
1107748f-4b10-45bb-9fbb-f92a7451a66b	memory_utilization	critical	Memory utilization 100.00% for service worker_1	{"memory_state": "critical", "service_name": "worker_1", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.778054+00
8140d05b-bd81-4e16-9f75-bd0eb8487937	memory_utilization	critical	Memory utilization 100.00% for service worker_2	{"memory_state": "critical", "service_name": "worker_2", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.777982+00
7f73a4f6-08d4-4a9d-a6b7-a4961a8675b4	memory_utilization	critical	Memory utilization 100.00% for service worker_8	{"memory_state": "critical", "service_name": "worker_8", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.780066+00
8fd51077-3c3c-47d7-9cac-8749818dc966	memory_utilization	critical	Memory utilization 100.00% for service worker_6	{"memory_state": "critical", "service_name": "worker_6", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.78197+00
789af300-497b-450e-87c6-f699c1805c85	memory_utilization	critical	Memory utilization 100.00% for service worker_3	{"memory_state": "critical", "service_name": "worker_3", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.783222+00
ea4c6ccf-4108-46ab-8753-be6a93cb3124	memory_utilization	warning	Memory utilization 75.00% for service worker_1	{"memory_state": "warning", "service_name": "worker_1", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.788081+00
59a3c22a-7f27-4a6e-a62b-c4a7bd91e2ac	memory_utilization	warning	Memory utilization 75.00% for service worker_2	{"memory_state": "warning", "service_name": "worker_2", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.787983+00
b85587fd-8999-4e43-b472-98af07cfdb15	memory_utilization	warning	Memory utilization 75.00% for service worker_8	{"memory_state": "warning", "service_name": "worker_8", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.78968+00
b941519a-926d-4340-a8f3-43dc89dfc2ea	memory_utilization	critical	Memory utilization 100.00% for service worker_0	{"memory_state": "critical", "service_name": "worker_0", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.791211+00
a5470c4d-cfb3-4523-bb7b-88c2aa8838b9	memory_utilization	warning	Memory utilization 75.00% for service worker_3	{"memory_state": "warning", "service_name": "worker_3", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.791571+00
72abb22b-4435-4653-af00-ff1b7b80fca5	memory_utilization	critical	Memory utilization 100.00% for service worker_7	{"memory_state": "critical", "service_name": "worker_7", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.79769+00
930f6a83-5e28-4820-a819-6db9541bbb6f	memory_utilization	critical	Memory utilization 100.00% for service worker_4	{"memory_state": "critical", "service_name": "worker_4", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.800649+00
fca6792f-dc48-4ba6-b451-8964fc88d175	memory_utilization	warning	Memory utilization 75.00% for service worker_6	{"memory_state": "warning", "service_name": "worker_6", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.808797+00
ad1e45ab-3dce-4fd4-a0f0-0455bdf1f0e1	memory_utilization	warning	Memory utilization 75.00% for service worker_0	{"memory_state": "warning", "service_name": "worker_0", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.83347+00
b1ffd757-8823-4639-a0d9-43a8949f6e7f	memory_utilization	critical	Memory utilization 100.00% for service worker_5	{"memory_state": "critical", "service_name": "worker_5", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:56:52.833503+00
8e451c57-e6ea-40e6-a116-01eebe53894c	memory_utilization	warning	Memory utilization 75.00% for service worker_7	{"memory_state": "warning", "service_name": "worker_7", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.835185+00
57bcbf2d-11a4-4c1f-8a04-bc79a7991489	memory_utilization	warning	Memory utilization 75.00% for service worker_4	{"memory_state": "warning", "service_name": "worker_4", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.839038+00
189b2c6f-9752-4042-bd78-4e2a0dceb8ba	memory_utilization	warning	Memory utilization 75.00% for service worker_5	{"memory_state": "warning", "service_name": "worker_5", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:56:52.848008+00
03df7082-e6f7-4850-b6a4-c9c8d3c650c2	memory_utilization	warning	Memory utilization 80.00% for service test_service_old	{"memory_state": "warning", "service_name": "test_service_old", "heap_used_bytes": 800, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:56:53.819647+00
d59aa634-d236-47d7-a2e8-04280baa619b	memory_utilization	warning	Memory utilization 80.00% for service test_service_recent	{"memory_state": "warning", "service_name": "test_service_recent", "heap_used_bytes": 1600, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:56:53.847621+00
344d3349-9e43-4137-a8e2-615c3d773f39	memory_utilization	critical	Memory utilization 100.00% for service worker_9	{"memory_state": "critical", "service_name": "worker_9", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.284541+00
367c79b9-6ed6-47ef-b55d-92fee505f069	memory_utilization	critical	Memory utilization 100.00% for service worker_6	{"memory_state": "critical", "service_name": "worker_6", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.310636+00
0762de79-9206-465f-8315-0defab31e629	memory_utilization	critical	Memory utilization 100.00% for service worker_2	{"memory_state": "critical", "service_name": "worker_2", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.311509+00
62b8527b-78c9-448c-840c-5b76db5bc2d8	memory_utilization	critical	Memory utilization 100.00% for service worker_8	{"memory_state": "critical", "service_name": "worker_8", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.343082+00
ca4a0a42-ce07-4e52-937d-ce9e48ab174d	memory_utilization	warning	Memory utilization 75.00% for service worker_9	{"memory_state": "warning", "service_name": "worker_9", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.348027+00
6a624331-a883-4733-b71d-5dbacc881861	memory_utilization	critical	Memory utilization 100.00% for service worker_7	{"memory_state": "critical", "service_name": "worker_7", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.348265+00
36e0e6e4-487d-48dd-b8d6-9809980d3564	memory_utilization	critical	Memory utilization 100.00% for service worker_3	{"memory_state": "critical", "service_name": "worker_3", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.349175+00
930ae9e7-ebb0-4c99-bb1c-8b9061cbec5d	memory_utilization	critical	Memory utilization 100.00% for service worker_5	{"memory_state": "critical", "service_name": "worker_5", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.345208+00
029e5251-09df-47b9-86ec-9c8ef50a669a	memory_utilization	warning	Memory utilization 75.00% for service worker_5	{"memory_state": "warning", "service_name": "worker_5", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.371722+00
1778874e-fa94-43d6-ae86-82eba61b60f7	memory_utilization	critical	Memory utilization 100.00% for service worker_0	{"memory_state": "critical", "service_name": "worker_0", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.348485+00
9a07fe20-f222-4101-b884-2a14584584ba	memory_utilization	warning	Memory utilization 75.00% for service worker_8	{"memory_state": "warning", "service_name": "worker_8", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.357138+00
1f7ec1f9-f988-4d2d-8d70-ac514943b674	memory_utilization	warning	Memory utilization 75.00% for service worker_1	{"memory_state": "warning", "service_name": "worker_1", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.364039+00
bbdb6207-ad25-4222-b37b-83a111bb4b3b	memory_utilization	warning	Memory utilization 75.00% for service worker_9	{"memory_state": "warning", "service_name": "worker_9", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.11631+00
aff22531-588b-46fd-aa1c-c39e2735dc3e	memory_utilization	critical	Memory utilization 100.00% for service worker_5	{"memory_state": "critical", "service_name": "worker_5", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.119089+00
68b6fdd4-6c1e-4d4a-a1c1-5cb5dfc03a18	memory_utilization	critical	Memory utilization 100.00% for service worker_6	{"memory_state": "critical", "service_name": "worker_6", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.152709+00
40e22beb-509b-4682-acb0-8e7b7a6c0a70	memory_utilization	warning	Memory utilization 75.00% for service worker_5	{"memory_state": "warning", "service_name": "worker_5", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.154148+00
f48f50c9-21ab-48d4-ab0e-d1567d6d73a1	memory_utilization	critical	Memory utilization 100.00% for service worker_0	{"memory_state": "critical", "service_name": "worker_0", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.154559+00
51f3c929-5dff-4d5d-acc4-5409a2847143	memory_utilization	critical	Memory utilization 100.00% for service worker_1	{"memory_state": "critical", "service_name": "worker_1", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.184422+00
09a5016e-22a2-46a4-ac89-31e88d1fee67	memory_utilization	critical	Memory utilization 100.00% for service worker_8	{"memory_state": "critical", "service_name": "worker_8", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.189322+00
a5659dcf-9cdd-4681-998a-2b92bc45a58e	memory_utilization	warning	Memory utilization 75.00% for service worker_6	{"memory_state": "warning", "service_name": "worker_6", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.19966+00
0f76071e-01c3-48c0-ba21-c49f91913ee0	memory_utilization	critical	Memory utilization 100.00% for service worker_2	{"memory_state": "critical", "service_name": "worker_2", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.20187+00
c156a896-edfe-46aa-8bdc-b8fdec1763bc	memory_utilization	critical	Memory utilization 100.00% for service worker_3	{"memory_state": "critical", "service_name": "worker_3", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.203197+00
cf845cbe-e198-4f14-8b6d-4ac502470d62	memory_utilization	critical	Memory utilization 100.00% for service worker_7	{"memory_state": "critical", "service_name": "worker_7", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.202351+00
7b6c609c-fef8-462c-972d-2687f0b521d3	memory_utilization	warning	Memory utilization 75.00% for service worker_8	{"memory_state": "warning", "service_name": "worker_8", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.207485+00
916ddd60-b0b4-44ae-b84b-67d2b27dff16	memory_utilization	warning	Memory utilization 75.00% for service worker_0	{"memory_state": "warning", "service_name": "worker_0", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.203727+00
398ce8b1-0f03-4335-9908-b340ba8967ae	memory_utilization	warning	Memory utilization 75.00% for service worker_1	{"memory_state": "warning", "service_name": "worker_1", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.209264+00
dbec7b07-ff90-466a-b84b-eedf262821a0	memory_utilization	warning	Memory utilization 75.00% for service worker_3	{"memory_state": "warning", "service_name": "worker_3", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.227507+00
75ea55de-82a2-4ab2-b9c4-2442e58f0766	memory_utilization	warning	Memory utilization 75.00% for service worker_2	{"memory_state": "warning", "service_name": "worker_2", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.237451+00
4747b03f-12d8-4f6c-af73-23804fb43401	memory_utilization	critical	Memory utilization 100.00% for service worker_4	{"memory_state": "critical", "service_name": "worker_4", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.238642+00
72070935-fc52-4275-87a0-95bd3c15d832	memory_utilization	warning	Memory utilization 75.00% for service worker_7	{"memory_state": "warning", "service_name": "worker_7", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.23166+00
d1ef1035-1df9-4872-87dd-84f00c284d48	memory_utilization	warning	Memory utilization 75.00% for service worker_4	{"memory_state": "warning", "service_name": "worker_4", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:08.297456+00
23c60973-37be-4a5a-ad41-703813a7564c	memory_utilization	critical	Memory utilization 100.00% for service worker_9	{"memory_state": "critical", "service_name": "worker_9", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.170203+00
e738a0a2-4628-46b8-99ba-7ed6cbee1f83	memory_utilization	critical	Memory utilization 100.00% for service worker_5	{"memory_state": "critical", "service_name": "worker_5", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.183575+00
fb0279f2-122a-4e45-b801-78691bbadc28	memory_utilization	critical	Memory utilization 100.00% for service worker_2	{"memory_state": "critical", "service_name": "worker_2", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.180422+00
d01c36c4-b453-409f-a57e-7b983b479b83	memory_utilization	critical	Memory utilization 100.00% for service worker_0	{"memory_state": "critical", "service_name": "worker_0", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.180556+00
770d6875-1413-4fb9-9193-10439a605000	memory_utilization	critical	Memory utilization 100.00% for service worker_1	{"memory_state": "critical", "service_name": "worker_1", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.20359+00
43cc7b3c-531c-47ca-a52e-87e2e07035e0	memory_utilization	critical	Memory utilization 100.00% for service worker_3	{"memory_state": "critical", "service_name": "worker_3", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.219851+00
93e3f0fe-3519-48e6-8e16-66e36e04aeb4	memory_utilization	critical	Memory utilization 100.00% for service worker_6	{"memory_state": "critical", "service_name": "worker_6", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.221254+00
0d2a3027-710e-482d-b177-6deb1c5132b7	memory_utilization	critical	Memory utilization 100.00% for service worker_8	{"memory_state": "critical", "service_name": "worker_8", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.223015+00
3defe6f6-c18c-44e6-86c4-5274adf464b6	memory_utilization	warning	Memory utilization 75.00% for service worker_5	{"memory_state": "warning", "service_name": "worker_5", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.221169+00
207ebf00-0683-48bb-ac1c-4a98961561e2	memory_utilization	warning	Memory utilization 75.00% for service worker_6	{"memory_state": "warning", "service_name": "worker_6", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.352001+00
2f7a0cc9-4bdf-4d02-9357-13afffb97d1f	memory_utilization	warning	Memory utilization 75.00% for service worker_2	{"memory_state": "warning", "service_name": "worker_2", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.352024+00
6f186de0-e7f3-47c4-aad2-7ae95c33da4b	memory_utilization	warning	Memory utilization 75.00% for service worker_0	{"memory_state": "warning", "service_name": "worker_0", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.362532+00
90e0c033-c4be-4e03-ac83-0e773ea608bf	memory_utilization	critical	Memory utilization 100.00% for service worker_1	{"memory_state": "critical", "service_name": "worker_1", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.349174+00
6d3a0064-020e-4401-b2ce-4dc0e6b16e10	memory_utilization	warning	Memory utilization 75.00% for service worker_3	{"memory_state": "warning", "service_name": "worker_3", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.358799+00
91b31ab5-9652-484d-a1ba-08b9f1af0801	memory_utilization	critical	Memory utilization 100.00% for service worker_4	{"memory_state": "critical", "service_name": "worker_4", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:01.357749+00
517713f9-4842-428c-8cc5-73017814e31b	memory_utilization	warning	Memory utilization 75.00% for service worker_7	{"memory_state": "warning", "service_name": "worker_7", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.364116+00
cd1a4e9c-8947-4539-9eb4-e66e241274dd	memory_utilization	warning	Memory utilization 75.00% for service worker_4	{"memory_state": "warning", "service_name": "worker_4", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:01.370105+00
6a49e876-895d-4661-b5cd-85fc40f33945	memory_utilization	warning	Memory utilization 80.00% for service test_service_old	{"memory_state": "warning", "service_name": "test_service_old", "heap_used_bytes": 800, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:57:02.454066+00
f849fe75-87f7-4f85-a047-2de5e8e870d5	memory_utilization	warning	Memory utilization 80.00% for service test_service_recent	{"memory_state": "warning", "service_name": "test_service_recent", "heap_used_bytes": 1600, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:57:02.458307+00
d042c36b-642b-411f-9dfa-6a524f3ba7d9	memory_utilization	critical	Memory utilization 100.00% for service worker_9	{"memory_state": "critical", "service_name": "worker_9", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:29.957986+00
109fcd9c-e3b0-4d4c-affd-a4fa497fa763	memory_utilization	warning	Memory utilization 75.00% for service worker_9	{"memory_state": "warning", "service_name": "worker_9", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:29.966356+00
c9d69377-c7f7-40ca-ad6f-da963260a3f7	memory_utilization	critical	Memory utilization 100.00% for service worker_5	{"memory_state": "critical", "service_name": "worker_5", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:29.967523+00
b3dad020-2282-40fc-b86e-5db7e1f4a907	memory_utilization	critical	Memory utilization 100.00% for service worker_6	{"memory_state": "critical", "service_name": "worker_6", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:29.97227+00
5d281e0f-e5fa-4ba9-a824-b089a68e7278	memory_utilization	critical	Memory utilization 100.00% for service worker_7	{"memory_state": "critical", "service_name": "worker_7", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:29.972095+00
d9ac6411-2346-47a1-b5a0-92347306afe7	memory_utilization	critical	Memory utilization 100.00% for service worker_8	{"memory_state": "critical", "service_name": "worker_8", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:29.978463+00
38b3ea90-435d-4521-a06e-4aa75c153024	memory_utilization	critical	Memory utilization 100.00% for service worker_0	{"memory_state": "critical", "service_name": "worker_0", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:30.001325+00
86463b5d-a4a3-468d-8f03-06d61404f2ec	memory_utilization	warning	Memory utilization 75.00% for service worker_5	{"memory_state": "warning", "service_name": "worker_5", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:30.007589+00
cdfaa0eb-951b-47a5-a5b7-cbdfc5d5084e	memory_utilization	critical	Memory utilization 100.00% for service worker_2	{"memory_state": "critical", "service_name": "worker_2", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:30.007712+00
688b8c21-9b09-4242-8a7a-b88793e6f4b0	memory_utilization	critical	Memory utilization 100.00% for service worker_4	{"memory_state": "critical", "service_name": "worker_4", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:30.008029+00
8597db5b-1972-4a49-b1dc-302076a2d1d2	memory_utilization	critical	Memory utilization 100.00% for service worker_3	{"memory_state": "critical", "service_name": "worker_3", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:30.005524+00
62bc6e6b-d897-4271-a09a-73b688f79c91	memory_utilization	critical	Memory utilization 100.00% for service worker_1	{"memory_state": "critical", "service_name": "worker_1", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:57:30.007087+00
d1dcde26-3d11-4f27-915e-af609114c8ed	memory_utilization	warning	Memory utilization 75.00% for service worker_6	{"memory_state": "warning", "service_name": "worker_6", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:30.011999+00
167f7c47-dc4d-4fe8-b589-3623fd83c7d0	memory_utilization	warning	Memory utilization 75.00% for service worker_8	{"memory_state": "warning", "service_name": "worker_8", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:30.012741+00
8c1f8c37-7dc6-4f27-928a-1493ff660919	memory_utilization	warning	Memory utilization 75.00% for service worker_7	{"memory_state": "warning", "service_name": "worker_7", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:30.034615+00
b1798989-a0f9-4699-87ae-338805df39c0	memory_utilization	warning	Memory utilization 75.00% for service worker_0	{"memory_state": "warning", "service_name": "worker_0", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:30.047402+00
40a6def8-8897-4bac-8680-3fc433fccc65	memory_utilization	warning	Memory utilization 75.00% for service worker_3	{"memory_state": "warning", "service_name": "worker_3", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:30.050176+00
ef9ee1b8-e7e7-498b-84a5-aced953d4d03	memory_utilization	warning	Memory utilization 75.00% for service worker_1	{"memory_state": "warning", "service_name": "worker_1", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:30.050407+00
4afbce62-23f1-4a7f-ae87-370179ec1726	memory_utilization	warning	Memory utilization 75.00% for service worker_4	{"memory_state": "warning", "service_name": "worker_4", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:30.051328+00
2bf61501-9969-4ee4-80b7-f5ed4b91da29	memory_utilization	warning	Memory utilization 75.00% for service worker_2	{"memory_state": "warning", "service_name": "worker_2", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:57:30.055017+00
1686f0f0-e1cd-4c31-8a75-842ff10c6eea	memory_utilization	warning	Memory utilization 80.00% for service test_service_old	{"memory_state": "warning", "service_name": "test_service_old", "heap_used_bytes": 800, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:57:31.071548+00
3ad514d2-c321-46c9-b93d-3c1c9cf9bc97	memory_utilization	warning	Memory utilization 80.00% for service test_service_recent	{"memory_state": "warning", "service_name": "test_service_recent", "heap_used_bytes": 1600, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:57:31.086257+00
b15fe3b4-faef-4e8c-a30c-82dfd6393001	memory_utilization	warning	Memory utilization 80.00% for service test_service_old	{"memory_state": "warning", "service_name": "test_service_old", "heap_used_bytes": 800, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:58:00.949702+00
86eaa305-1269-4463-beb3-96eaefe802ad	memory_utilization	warning	Memory utilization 80.00% for service test_service_recent	{"memory_state": "warning", "service_name": "test_service_recent", "heap_used_bytes": 1600, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:58:00.959163+00
c8e0eb45-6f92-4f74-9293-60ca6f8d34f2	memory_utilization	critical	Memory utilization 100.00% for service worker_9	{"memory_state": "critical", "service_name": "worker_9", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:08.106341+00
c0c6550c-89d3-48bc-865e-2b0f1587b57f	memory_utilization	critical	Memory utilization 100.00% for service worker_7	{"memory_state": "critical", "service_name": "worker_7", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.221792+00
bb996687-aaee-44c2-9472-3da19c4c4220	memory_utilization	warning	Memory utilization 75.00% for service worker_9	{"memory_state": "warning", "service_name": "worker_9", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.221065+00
32a49ee1-dae1-48ec-a689-d14a57e70adb	memory_utilization	warning	Memory utilization 75.00% for service worker_2	{"memory_state": "warning", "service_name": "worker_2", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.244805+00
f7c638d9-7de7-4112-9aab-2ac24a5ddb97	memory_utilization	warning	Memory utilization 75.00% for service worker_1	{"memory_state": "warning", "service_name": "worker_1", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.265921+00
6b0c4727-bde5-4deb-989c-3c0ca7d79137	memory_utilization	warning	Memory utilization 75.00% for service worker_4	{"memory_state": "warning", "service_name": "worker_4", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.285539+00
380895b6-b3db-4720-a277-c3e3c6588ff9	memory_utilization	warning	Memory utilization 75.00% for service worker_6	{"memory_state": "warning", "service_name": "worker_6", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.266619+00
8f2259da-1ee4-4b68-970e-e5eea7576ec7	memory_utilization	warning	Memory utilization 75.00% for service worker_3	{"memory_state": "warning", "service_name": "worker_3", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.268844+00
533a8d46-a41a-413a-a05d-7dea5bafb119	memory_utilization	warning	Memory utilization 75.00% for service worker_8	{"memory_state": "warning", "service_name": "worker_8", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.271863+00
373d21ff-906d-41ae-9eac-0a42a7a4b443	memory_utilization	critical	Memory utilization 100.00% for service worker_4	{"memory_state": "critical", "service_name": "worker_4", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:58:43.270804+00
ae353b7e-93c1-4f17-bc67-f89ee77866b0	memory_utilization	warning	Memory utilization 75.00% for service worker_0	{"memory_state": "warning", "service_name": "worker_0", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.276311+00
4d087e93-c41d-4334-be4a-6ed0b83b1181	memory_utilization	warning	Memory utilization 75.00% for service worker_7	{"memory_state": "warning", "service_name": "worker_7", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:58:43.276368+00
42ff62a8-fac6-473a-9660-9ff3d6062842	memory_utilization	warning	Memory utilization 80.00% for service test_service_old	{"memory_state": "warning", "service_name": "test_service_old", "heap_used_bytes": 800, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:58:44.112815+00
5952d382-077b-417a-b5d7-6d25637c3ced	memory_utilization	warning	Memory utilization 80.00% for service test_service_recent	{"memory_state": "warning", "service_name": "test_service_recent", "heap_used_bytes": 1600, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:58:44.134116+00
abfa1418-b29b-4185-8689-ed1687022b8c	memory_utilization	critical	Memory utilization 100.00% for service worker_9	{"memory_state": "critical", "service_name": "worker_9", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.355782+00
c239172f-f4f5-44dd-b50d-574dabfda318	memory_utilization	critical	Memory utilization 100.00% for service worker_3	{"memory_state": "critical", "service_name": "worker_3", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.378872+00
79586804-c986-4f4f-b262-52d0b2829112	memory_utilization	critical	Memory utilization 100.00% for service worker_1	{"memory_state": "critical", "service_name": "worker_1", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.380346+00
4318a4aa-f447-45f1-8b95-031cd4efd11b	memory_utilization	warning	Memory utilization 75.00% for service worker_9	{"memory_state": "warning", "service_name": "worker_9", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.380951+00
1efbeab9-6492-4b39-875c-aa511e6a42a2	memory_utilization	warning	Memory utilization 75.00% for service worker_3	{"memory_state": "warning", "service_name": "worker_3", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.400795+00
52135f00-7192-43ec-a7eb-9a9fa9e0b976	memory_utilization	critical	Memory utilization 100.00% for service worker_7	{"memory_state": "critical", "service_name": "worker_7", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.401538+00
e16e4c64-adae-4b23-a01d-109e7ab38f33	memory_utilization	critical	Memory utilization 100.00% for service worker_6	{"memory_state": "critical", "service_name": "worker_6", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.398514+00
c60c9a94-10ce-44f1-9e89-1922d054d4dc	memory_utilization	critical	Memory utilization 100.00% for service worker_5	{"memory_state": "critical", "service_name": "worker_5", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.402663+00
755e122b-d16d-49b3-b2ec-854f16bff752	memory_utilization	critical	Memory utilization 100.00% for service worker_8	{"memory_state": "critical", "service_name": "worker_8", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.409512+00
9c5865f5-2504-4977-a978-e59be9e3765a	memory_utilization	warning	Memory utilization 75.00% for service worker_1	{"memory_state": "warning", "service_name": "worker_1", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.426671+00
85da889e-d83f-44ab-b40b-58e617d09c9f	memory_utilization	critical	Memory utilization 100.00% for service worker_0	{"memory_state": "critical", "service_name": "worker_0", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.424707+00
91f45d3c-16fb-4a0b-ab2c-e16727ccb3df	memory_utilization	critical	Memory utilization 100.00% for service worker_2	{"memory_state": "critical", "service_name": "worker_2", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.426347+00
41518a69-cfba-4821-83d4-de46a3aec99c	memory_utilization	critical	Memory utilization 100.00% for service worker_4	{"memory_state": "critical", "service_name": "worker_4", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:09.427736+00
b809f457-1e43-4c4a-8e73-f4ebb3852d7b	memory_utilization	warning	Memory utilization 75.00% for service worker_8	{"memory_state": "warning", "service_name": "worker_8", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.428903+00
3d507f89-18c7-4a68-8249-406ce910eff3	memory_utilization	warning	Memory utilization 75.00% for service worker_6	{"memory_state": "warning", "service_name": "worker_6", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.439341+00
557188be-4de4-4f17-b182-f632f27690bc	memory_utilization	warning	Memory utilization 75.00% for service worker_2	{"memory_state": "warning", "service_name": "worker_2", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.44307+00
6912f3fc-dd55-46b6-b052-5a39fb520b84	memory_utilization	warning	Memory utilization 75.00% for service worker_4	{"memory_state": "warning", "service_name": "worker_4", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.443328+00
babc15d5-ca73-4928-85a7-0049f5d48068	memory_utilization	warning	Memory utilization 75.00% for service worker_7	{"memory_state": "warning", "service_name": "worker_7", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.43992+00
5c35b3fd-0d11-4252-a80f-3170aebf84cc	memory_utilization	warning	Memory utilization 75.00% for service worker_0	{"memory_state": "warning", "service_name": "worker_0", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.490926+00
43101604-b7b5-4a6e-8252-9f04011775a2	memory_utilization	warning	Memory utilization 75.00% for service worker_5	{"memory_state": "warning", "service_name": "worker_5", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:09.491023+00
a1d86fc9-3fb3-451c-99d2-b46998511955	memory_utilization	warning	Memory utilization 80.00% for service test_service_old	{"memory_state": "warning", "service_name": "test_service_old", "heap_used_bytes": 800, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:59:10.542355+00
1e404ac2-475b-4217-af80-eb17f03bb8eb	memory_utilization	warning	Memory utilization 80.00% for service test_service_recent	{"memory_state": "warning", "service_name": "test_service_recent", "heap_used_bytes": 1600, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:59:10.572496+00
4282fa44-fa6b-4f63-a357-e9a68a8b0e44	memory_utilization	critical	Memory utilization 100.00% for service worker_9	{"memory_state": "critical", "service_name": "worker_9", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.858126+00
ef6c9473-c4a7-4197-8635-539d346647b1	memory_utilization	critical	Memory utilization 100.00% for service worker_8	{"memory_state": "critical", "service_name": "worker_8", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.887827+00
82efd6f8-299a-4626-8bf3-3285294e7d7c	memory_utilization	critical	Memory utilization 100.00% for service worker_5	{"memory_state": "critical", "service_name": "worker_5", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.891622+00
350e1f77-12c5-4dc3-8a30-06096f559995	memory_utilization	warning	Memory utilization 75.00% for service worker_9	{"memory_state": "warning", "service_name": "worker_9", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.903516+00
1b2c040e-5d0d-4c8f-b9d1-92b3a62a1a5e	memory_utilization	critical	Memory utilization 100.00% for service worker_1	{"memory_state": "critical", "service_name": "worker_1", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.906563+00
e37d23a4-b18c-447e-8241-37d12423d053	memory_utilization	critical	Memory utilization 100.00% for service worker_2	{"memory_state": "critical", "service_name": "worker_2", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.906522+00
aa9b98b5-ad65-4d7f-8ca6-19f9fd473fe1	memory_utilization	critical	Memory utilization 100.00% for service worker_3	{"memory_state": "critical", "service_name": "worker_3", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.907301+00
4940f150-85f5-4707-9d48-4e5965b06243	memory_utilization	warning	Memory utilization 75.00% for service worker_5	{"memory_state": "warning", "service_name": "worker_5", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.909333+00
2544d8c1-e5f1-4c37-b643-eff2758af702	memory_utilization	warning	Memory utilization 75.00% for service worker_8	{"memory_state": "warning", "service_name": "worker_8", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.911397+00
954e3227-4fb0-45f6-8941-885eafa1f35a	memory_utilization	warning	Memory utilization 75.00% for service worker_3	{"memory_state": "warning", "service_name": "worker_3", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.954968+00
e4efaeca-7647-455d-bc23-888ddb504a78	memory_utilization	warning	Memory utilization 75.00% for service worker_2	{"memory_state": "warning", "service_name": "worker_2", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.95794+00
c998725f-3a77-4fa7-b0e6-97ac45e7ce16	memory_utilization	warning	Memory utilization 75.00% for service worker_1	{"memory_state": "warning", "service_name": "worker_1", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.927867+00
ee96e735-0fe7-4914-b0d3-1698e2c3e287	memory_utilization	critical	Memory utilization 100.00% for service worker_4	{"memory_state": "critical", "service_name": "worker_4", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.953911+00
4f218379-7fd1-4e22-9222-c4f7c77f4dd7	memory_utilization	critical	Memory utilization 100.00% for service worker_6	{"memory_state": "critical", "service_name": "worker_6", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.953804+00
3311223d-f298-4cd2-8c43-cf50af32f0b1	memory_utilization	critical	Memory utilization 100.00% for service worker_7	{"memory_state": "critical", "service_name": "worker_7", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.952824+00
47fbb298-d4e3-4f57-8c9e-ed7237c0616c	memory_utilization	critical	Memory utilization 100.00% for service worker_0	{"memory_state": "critical", "service_name": "worker_0", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:17.954293+00
af8d63da-7dc7-43ad-8479-d1677ba724c6	memory_utilization	warning	Memory utilization 75.00% for service worker_6	{"memory_state": "warning", "service_name": "worker_6", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.961277+00
8fddfe87-26eb-4754-9d2b-702fe80b7ab7	memory_utilization	warning	Memory utilization 75.00% for service worker_4	{"memory_state": "warning", "service_name": "worker_4", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.963061+00
3f8260b0-4afd-4692-ac1c-93783f5e321e	memory_utilization	warning	Memory utilization 75.00% for service worker_7	{"memory_state": "warning", "service_name": "worker_7", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.966054+00
d2aabc56-1177-4187-a3f6-086aeda1e0c2	memory_utilization	warning	Memory utilization 75.00% for service worker_0	{"memory_state": "warning", "service_name": "worker_0", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:17.966398+00
b5f8e797-23eb-45f9-8d96-7391dfaa98da	memory_utilization	warning	Memory utilization 80.00% for service test_service_old	{"memory_state": "warning", "service_name": "test_service_old", "heap_used_bytes": 800, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:59:18.896166+00
e8aca77e-a66c-47d4-9db5-49bfff5c92ff	memory_utilization	warning	Memory utilization 80.00% for service test_service_recent	{"memory_state": "warning", "service_name": "test_service_recent", "heap_used_bytes": 1600, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:59:18.899478+00
6ef633cf-73e0-40c2-8045-17899f13060c	memory_utilization	critical	Memory utilization 100.00% for service worker_9	{"memory_state": "critical", "service_name": "worker_9", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.451488+00
f934904e-e1e9-455c-a855-bf65ca03ca12	memory_utilization	critical	Memory utilization 100.00% for service worker_4	{"memory_state": "critical", "service_name": "worker_4", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.460447+00
8f4a0750-cc12-40e1-bb72-a443556984be	memory_utilization	warning	Memory utilization 75.00% for service worker_9	{"memory_state": "warning", "service_name": "worker_9", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.464089+00
97142e3e-de7b-4f14-b5a4-1634df606fba	memory_utilization	critical	Memory utilization 100.00% for service worker_1	{"memory_state": "critical", "service_name": "worker_1", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.466331+00
2b3e2919-3621-43da-8674-c3ae77bfc839	memory_utilization	critical	Memory utilization 100.00% for service worker_2	{"memory_state": "critical", "service_name": "worker_2", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.466666+00
18bcc45c-4db1-4eac-ad4f-6661df8f5425	memory_utilization	critical	Memory utilization 100.00% for service worker_3	{"memory_state": "critical", "service_name": "worker_3", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.467892+00
3128b18e-9f17-4133-9270-ead743a24311	memory_utilization	warning	Memory utilization 75.00% for service worker_4	{"memory_state": "warning", "service_name": "worker_4", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.468903+00
d9ae5de2-3972-4589-99e7-710fd961f230	memory_utilization	critical	Memory utilization 100.00% for service worker_8	{"memory_state": "critical", "service_name": "worker_8", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.47365+00
b326375a-02c4-4a79-9682-90da13d4d63a	memory_utilization	warning	Memory utilization 75.00% for service worker_3	{"memory_state": "warning", "service_name": "worker_3", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.474277+00
c7b63a66-efc5-4e80-b97c-96cf707f6b3c	memory_utilization	critical	Memory utilization 100.00% for service worker_7	{"memory_state": "critical", "service_name": "worker_7", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.468871+00
126b25f5-ea27-4d8a-946e-a830f0775f62	memory_utilization	warning	Memory utilization 75.00% for service worker_1	{"memory_state": "warning", "service_name": "worker_1", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.474585+00
c0e7222a-6ec7-4f2f-ba7d-f69555f01672	memory_utilization	critical	Memory utilization 100.00% for service worker_0	{"memory_state": "critical", "service_name": "worker_0", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.468056+00
e3594ddb-11c5-4c12-a70a-9d5daaae0ed8	memory_utilization	warning	Memory utilization 75.00% for service worker_2	{"memory_state": "warning", "service_name": "worker_2", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.480613+00
56f532c4-7313-472c-97ed-965daaf6189a	memory_utilization	warning	Memory utilization 75.00% for service worker_7	{"memory_state": "warning", "service_name": "worker_7", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.520639+00
0b836fc1-7c25-480a-8fe0-b39a07cf578b	memory_utilization	warning	Memory utilization 75.00% for service worker_8	{"memory_state": "warning", "service_name": "worker_8", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.521245+00
8a55e452-ffaf-4b10-9cf4-0ff396d7aeb0	memory_utilization	warning	Memory utilization 75.00% for service worker_0	{"memory_state": "warning", "service_name": "worker_0", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.520919+00
ac8727f5-cef6-4caf-9fdd-35ea58ffa53d	memory_utilization	critical	Memory utilization 100.00% for service worker_6	{"memory_state": "critical", "service_name": "worker_6", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.523068+00
85920d57-c648-41af-a764-b0c73b679448	memory_utilization	critical	Memory utilization 100.00% for service worker_5	{"memory_state": "critical", "service_name": "worker_5", "heap_used_bytes": 1, "utilization_pct": 100.00}	f	\N	\N	2025-06-22 22:59:26.521359+00
c37ee7d0-5fbf-43b9-b6e7-ffbe269f9183	memory_utilization	warning	Memory utilization 75.00% for service worker_6	{"memory_state": "warning", "service_name": "worker_6", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.573408+00
a2f640b0-21ab-4f3c-83a3-e9f5b76020df	memory_utilization	warning	Memory utilization 75.00% for service worker_5	{"memory_state": "warning", "service_name": "worker_5", "heap_used_bytes": 3, "utilization_pct": 75.00}	f	\N	\N	2025-06-22 22:59:26.573898+00
dac741c5-bd2f-48e2-adf3-cdad5889436f	memory_utilization	warning	Memory utilization 80.00% for service test_service_old	{"memory_state": "warning", "service_name": "test_service_old", "heap_used_bytes": 800, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:59:27.560239+00
aa5efd8f-23cc-4f22-8851-b3f97045145d	memory_utilization	warning	Memory utilization 80.00% for service test_service_recent	{"memory_state": "warning", "service_name": "test_service_recent", "heap_used_bytes": 1600, "utilization_pct": 80.00}	f	\N	\N	2025-06-22 22:59:27.56418+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.users (id, email, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: versioned_configs; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.versioned_configs (id, config_type, config_key, config_value, version, checksum, created_at, updated_at, created_by, metadata) FROM stdin;
1	system	test_config	{"test": true, "environment": "development"}	1	e02171bce10d02621e5f5496f6faa41416237938df85c83e28c808c7e36d1a42	2025-06-22 13:30:59.978443+00	2025-06-22 13:30:59.978443+00	system_migration	{"purpose": "BF-005 validation test", "migration": "005_bf005_versioned_configs"}
2	migration	005_bf005_versioned_configs	{"status": "completed", "timestamp": "2025-06-22T13:31:00.00311+00:00", "tables_created": ["versioned_configs"], "indexes_created": ["idx_versioned_configs_type_key", "idx_versioned_configs_version", "idx_versioned_configs_created_at", "idx_versioned_configs_updated_at", "idx_versioned_configs_checksum", "idx_versioned_configs_validation"], "functions_created": ["update_versioned_config_atomic", "get_versioned_config_with_lock", "validate_config_consistency", "get_config_history", "sync_domain_config_to_versioned"]}	1	bb3ef1d1fef826418de4cac56efabb598e3e5e5a7dbd2e4efb817951da37e45f	2025-06-22 13:31:00.00311+00	2025-06-22 13:31:00.00311+00	migration_system	{"phase": "2A", "finding": "BF-005", "purpose": "Concurrent Config State Corruption remediation", "priority": "CRITICAL"}
3	test_concurrent	test-concurrent-read-d240817c-948c-4aab-8334-21670c4f7d7b	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 13:43:16.918833+00	2025-06-22 13:43:16.918833+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-d240817c-948c-4aab-8334-21670c4f7d7b", "sync_timestamp": "2025-06-22T13:43:16.604074497Z"}
4	test_concurrent	test-concurrent-write-a6eb134d-b057-42f9-8231-a4dbd2f9b810	{"test": "concurrent_write", "worker": 3}	1	1496c2f1a56892f01743d01519bb041217b5426c1b42375b43677ef404197d0e	2025-06-22 13:43:16.964141+00	2025-06-22 13:43:16.964141+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-a6eb134d-b057-42f9-8231-a4dbd2f9b810", "sync_timestamp": "2025-06-22T13:43:16.888249044Z"}
5	test_cow	test-cow-semantics-590ad41f-2afd-4f4c-bbbe-b381bc0bf648	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 13:43:17.614223+00	2025-06-22 13:43:17.614223+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-590ad41f-2afd-4f4c-bbbe-b381bc0bf648", "sync_timestamp": "2025-06-22T13:43:17.611216772Z"}
6	test_race	test-race-prevention-52282cc8-bfb5-4107-a0c1-c72e54c6795d	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 13:43:17.938167+00	2025-06-22 13:43:17.938167+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-52282cc8-bfb5-4107-a0c1-c72e54c6795d", "sync_timestamp": "2025-06-22T13:43:17.93289257Z"}
7	test_corruption	test-corruption-detection-36f46cce-0e7b-480e-b967-475f0e4e458a	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 13:43:18.04661+00	2025-06-22 13:43:18.04661+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-36f46cce-0e7b-480e-b967-475f0e4e458a", "sync_timestamp": "2025-06-22T13:43:18.043110159Z"}
8	test_multi	test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 13:43:18.141864+00	2025-06-22 13:43:18.141864+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-mixed", "sync_timestamp": "2025-06-22T13:43:18.139637009Z"}
9	test_multi	test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-highfreq	{"test": "high_frequency", "update": 0, "worker": 9}	1	9539cfd309436558d7c82a9cc6481308832fafeceb2c64d5a690032a202a0ab7	2025-06-22 13:43:18.546335+00	2025-06-22 13:43:18.546335+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-highfreq", "sync_timestamp": "2025-06-22T13:43:18.543103456Z"}
10	test_multi	test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 13:43:19.056561+00	2025-06-22 13:43:19.056561+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-0cc72c86-8386-4c5c-be8e-541e33e285be-coordinated", "sync_timestamp": "2025-06-22T13:43:19.054553838Z"}
11	test_concurrent	test-concurrent-read-2e176b19-5a03-49fe-931d-a921344b887b	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 13:47:12.896753+00	2025-06-22 13:47:12.896753+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-2e176b19-5a03-49fe-931d-a921344b887b", "sync_timestamp": "2025-06-22T13:47:12.863541804Z"}
12	test_concurrent	test-concurrent-write-9df616b1-f6b6-4fcf-b053-d89f2e1a6bee	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 13:47:13.406053+00	2025-06-22 13:47:13.406053+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-9df616b1-f6b6-4fcf-b053-d89f2e1a6bee", "sync_timestamp": "2025-06-22T13:47:13.404549935Z"}
13	test_cow	test-cow-semantics-c5688633-513a-4f98-b530-fe825ebda43f	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 13:47:13.617837+00	2025-06-22 13:47:13.617837+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-c5688633-513a-4f98-b530-fe825ebda43f", "sync_timestamp": "2025-06-22T13:47:13.609036193Z"}
14	test_race	test-race-prevention-878bdf46-e7ac-454e-9815-12c4f9d6efc8	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 13:47:14.142703+00	2025-06-22 13:47:14.142703+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-878bdf46-e7ac-454e-9815-12c4f9d6efc8", "sync_timestamp": "2025-06-22T13:47:14.14060274Z"}
15	test_corruption	test-corruption-detection-a0f5b87b-190e-4653-ae65-533863157f7b	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 13:47:14.397991+00	2025-06-22 13:47:14.397991+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-a0f5b87b-190e-4653-ae65-533863157f7b", "sync_timestamp": "2025-06-22T13:47:14.396353192Z"}
16	test_multi	test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 13:47:14.582934+00	2025-06-22 13:47:14.582934+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-mixed", "sync_timestamp": "2025-06-22T13:47:14.57997699Z"}
17	test_multi	test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-highfreq	{"test": "high_frequency", "update": 1, "worker": 3}	1	2a230f62c495fab3aeddcaa4b3be1f41aca9c1d7f13e019b8c1e7e1ae953fcad	2025-06-22 13:47:15.097652+00	2025-06-22 13:47:15.339949+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-highfreq", "sync_timestamp": "2025-06-22T13:47:15.104025604Z"}
20	test_multi	test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 13:47:15.598129+00	2025-06-22 13:47:15.598129+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-4bc2ab61-a274-4478-aa7a-36e26458c82d-coordinated", "sync_timestamp": "2025-06-22T13:47:15.595878334Z"}
21	test_concurrent	test-concurrent-write-a1b9c363-6ae8-47b6-b66d-d9dedd969da3	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 13:52:10.714842+00	2025-06-22 13:52:10.714842+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-a1b9c363-6ae8-47b6-b66d-d9dedd969da3", "sync_timestamp": "2025-06-22T13:52:10.713897615Z"}
22	test_concurrent	test-concurrent-read-c9c10b48-730a-4aa8-afa7-282890a6d765	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 13:52:10.836886+00	2025-06-22 13:52:10.836886+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-c9c10b48-730a-4aa8-afa7-282890a6d765", "sync_timestamp": "2025-06-22T13:52:10.500343065Z"}
23	test_cow	test-cow-semantics-2fc5dcbc-fef9-4f7a-9bcd-7b8b595f8d8b	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 13:52:11.442115+00	2025-06-22 13:52:11.442115+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-2fc5dcbc-fef9-4f7a-9bcd-7b8b595f8d8b", "sync_timestamp": "2025-06-22T13:52:11.441293756Z"}
24	test_race	test-race-prevention-3e42be78-f85b-4b0a-a3ed-f4889bdcb84f	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 13:52:12.107434+00	2025-06-22 13:52:12.107434+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-3e42be78-f85b-4b0a-a3ed-f4889bdcb84f", "sync_timestamp": "2025-06-22T13:52:12.092580182Z"}
25	test_corruption	test-corruption-detection-a0a3c25a-0591-40f9-98c7-b7f7d3f87569	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 13:52:12.721842+00	2025-06-22 13:52:12.721842+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-a0a3c25a-0591-40f9-98c7-b7f7d3f87569", "sync_timestamp": "2025-06-22T13:52:12.715915938Z"}
26	test_multi	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 13:52:13.031182+00	2025-06-22 13:52:13.031182+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-mixed", "sync_timestamp": "2025-06-22T13:52:13.02870692Z"}
27	test_multi	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-highfreq	{"test": "high_frequency", "update": 0, "worker": 19}	1	01719637ac62e76dd0e57ac9a250f8bb8677c9616d859218d1a4274166202f4b	2025-06-22 13:52:13.556531+00	2025-06-22 13:52:13.82387+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-highfreq", "sync_timestamp": "2025-06-22T13:52:13.346638381Z"}
29	test_multi	test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 13:52:14.66977+00	2025-06-22 13:52:14.66977+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-703c8767-61d8-4347-8a48-96ef8a1a6a76-coordinated", "sync_timestamp": "2025-06-22T13:52:14.654297503Z"}
30	test_concurrent	test-concurrent-read-2e6f5b8a-ff0f-4537-898c-dd4835239738	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 13:54:08.586739+00	2025-06-22 13:54:08.586739+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-2e6f5b8a-ff0f-4537-898c-dd4835239738", "sync_timestamp": "2025-06-22T13:54:08.586226928Z"}
31	test_concurrent	test-concurrent-write-a3391a27-2d2f-487b-aaf3-498ec0570bce	{"test": "concurrent_write", "worker": 0}	1	92993cab8415231f23c3775a2dd00ca842432721edf9a7c56c2e452e64996d54	2025-06-22 13:54:08.999291+00	2025-06-22 13:54:08.999291+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-a3391a27-2d2f-487b-aaf3-498ec0570bce", "sync_timestamp": "2025-06-22T13:54:08.997714363Z"}
32	test_cow	test-cow-semantics-03174397-23dd-45fa-87e8-ae77879e90ba	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 13:54:09.187502+00	2025-06-22 13:54:09.187502+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-03174397-23dd-45fa-87e8-ae77879e90ba", "sync_timestamp": "2025-06-22T13:54:09.170835567Z"}
33	test_race	test-race-prevention-7428d253-04c6-48d1-b967-6d78c8488758	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 13:54:09.705756+00	2025-06-22 13:54:09.705756+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-7428d253-04c6-48d1-b967-6d78c8488758", "sync_timestamp": "2025-06-22T13:54:09.694433217Z"}
34	test_corruption	test-corruption-detection-b7a77fa2-4bc9-4f6e-be01-622472e59145	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 13:54:10.066864+00	2025-06-22 13:54:10.066864+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-b7a77fa2-4bc9-4f6e-be01-622472e59145", "sync_timestamp": "2025-06-22T13:54:10.064922559Z"}
35	test_multi	test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 13:54:10.293375+00	2025-06-22 13:54:10.293375+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-mixed", "sync_timestamp": "2025-06-22T13:54:10.246214344Z"}
36	test_multi	test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-highfreq	{"test": "high_frequency", "update": 0, "worker": 15}	1	2c797be7fa57e04a26cdd447c67c6c9ebe1f48f7cfaa83a894b8530218498fa0	2025-06-22 13:54:10.713214+00	2025-06-22 13:54:10.728063+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-highfreq", "sync_timestamp": "2025-06-22T13:54:10.60750203Z"}
38	test_multi	test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 13:54:11.151643+00	2025-06-22 13:54:11.151643+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-55b2969a-4f4b-42fe-89b4-a15fcc8ce943-coordinated", "sync_timestamp": "2025-06-22T13:54:11.145323397Z"}
39	test_concurrent	test-concurrent-read-acb1fed9-4d65-4c5f-9509-dd961b0e4eda	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 14:14:42.716527+00	2025-06-22 14:14:42.716527+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-acb1fed9-4d65-4c5f-9509-dd961b0e4eda", "sync_timestamp": "2025-06-22T14:14:42.678038418Z"}
40	test_concurrent	test-concurrent-write-d275ab59-5337-4001-9fd9-f0b668fc1f05	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 14:14:42.988711+00	2025-06-22 14:14:42.988711+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-d275ab59-5337-4001-9fd9-f0b668fc1f05", "sync_timestamp": "2025-06-22T14:14:42.988139715Z"}
41	test_cow	test-cow-semantics-c346041b-6e5e-46aa-bf8e-3a717af8f505	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 14:14:43.108047+00	2025-06-22 14:14:43.108047+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-c346041b-6e5e-46aa-bf8e-3a717af8f505", "sync_timestamp": "2025-06-22T14:14:43.10696423Z"}
42	test_race	test-race-prevention-4ac3760d-3f6d-4d66-80f4-0910c68ef966	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 14:14:43.742855+00	2025-06-22 14:14:43.742855+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-4ac3760d-3f6d-4d66-80f4-0910c68ef966", "sync_timestamp": "2025-06-22T14:14:43.741101449Z"}
43	test_corruption	test-corruption-detection-5e3b4eda-c0c6-4eb9-bc43-013d856b2e22	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 14:14:44.075135+00	2025-06-22 14:14:44.075135+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-5e3b4eda-c0c6-4eb9-bc43-013d856b2e22", "sync_timestamp": "2025-06-22T14:14:44.073092858Z"}
44	test_multi	test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 14:14:44.154588+00	2025-06-22 14:14:44.154588+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-mixed", "sync_timestamp": "2025-06-22T14:14:44.153256446Z"}
45	test_multi	test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-highfreq	{"test": "high_frequency", "update": 0, "worker": 19}	1	01719637ac62e76dd0e57ac9a250f8bb8677c9616d859218d1a4274166202f4b	2025-06-22 14:14:44.257692+00	2025-06-22 14:14:44.257692+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-highfreq", "sync_timestamp": "2025-06-22T14:14:44.253337365Z"}
46	test_multi	test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 14:14:44.432018+00	2025-06-22 14:14:44.432018+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-d3211b81-79f5-44a8-a239-ee7e5528619c-coordinated", "sync_timestamp": "2025-06-22T14:14:44.430572233Z"}
47	test_concurrent	test-concurrent-read-f45bbaf8-075d-4eb3-b90e-5bd2f57bd18f	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 17:14:38.627139+00	2025-06-22 17:14:38.627139+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-f45bbaf8-075d-4eb3-b90e-5bd2f57bd18f", "sync_timestamp": "2025-06-22T17:14:38.549444797Z"}
48	test_cow	test-cow-semantics-75bfc7c9-eb98-48a8-aeb6-9a75f4fc3fe2	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 17:14:38.700345+00	2025-06-22 17:14:38.700345+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-75bfc7c9-eb98-48a8-aeb6-9a75f4fc3fe2", "sync_timestamp": "2025-06-22T17:14:38.69988367Z"}
49	test_concurrent	test-concurrent-write-1e333a9a-b632-4d3d-9232-87f292e3f948	{"test": "concurrent_write", "worker": 1}	1	d208079343bf371b708d3e6b47e13bb21d6bfd3ccd30908d67fc691abc792210	2025-06-22 17:14:38.701156+00	2025-06-22 17:14:38.701156+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-1e333a9a-b632-4d3d-9232-87f292e3f948", "sync_timestamp": "2025-06-22T17:14:38.6450442Z"}
50	test_race	test-race-prevention-e1caf7d1-b69a-4cc7-b796-b83664c6aa16	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 17:14:38.773376+00	2025-06-22 17:14:38.773376+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-e1caf7d1-b69a-4cc7-b796-b83664c6aa16", "sync_timestamp": "2025-06-22T17:14:38.772650363Z"}
51	test_corruption	test-corruption-detection-315dfcc0-417a-44b0-8a0f-8dd9cacc1339	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 17:14:38.834598+00	2025-06-22 17:14:38.834598+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-315dfcc0-417a-44b0-8a0f-8dd9cacc1339", "sync_timestamp": "2025-06-22T17:14:38.834044491Z"}
52	test_multi	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 17:14:38.87546+00	2025-06-22 17:14:38.87546+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-mixed", "sync_timestamp": "2025-06-22T17:14:38.874575757Z"}
53	test_multi	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-highfreq	{"test": "high_frequency", "update": 0, "worker": 18}	1	29442b7826563ab13fcf20f0de6c55c412942c799fa6621183840b1e972098fc	2025-06-22 17:14:38.975893+00	2025-06-22 17:14:38.982652+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-highfreq", "sync_timestamp": "2025-06-22T17:14:38.945615709Z"}
55	test_multi	test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 17:14:39.113587+00	2025-06-22 17:14:39.113587+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-b4ccee33-955b-481f-8053-e60da300248b-coordinated", "sync_timestamp": "2025-06-22T17:14:39.109061143Z"}
56	test_concurrent	test-concurrent-read-5d997b6a-0f69-4871-a8cd-a7a5ce5ced7f	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 17:21:41.451279+00	2025-06-22 17:21:41.451279+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-5d997b6a-0f69-4871-a8cd-a7a5ce5ced7f", "sync_timestamp": "2025-06-22T17:21:41.377848756Z"}
57	test_concurrent	test-concurrent-write-b4620760-7673-44b4-942a-d6c40089854e	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 17:21:41.469665+00	2025-06-22 17:21:41.479721+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-b4620760-7673-44b4-942a-d6c40089854e", "sync_timestamp": "2025-06-22T17:21:41.426366002Z"}
59	test_cow	test-cow-semantics-d721e985-2f21-4b3f-9db8-a0b93ec06709	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 17:21:41.506934+00	2025-06-22 17:21:41.506934+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-d721e985-2f21-4b3f-9db8-a0b93ec06709", "sync_timestamp": "2025-06-22T17:21:41.506174215Z"}
60	test_race	test-race-prevention-ae427cf1-c5e1-4012-ad50-c17c5c1ce166	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 17:21:41.60401+00	2025-06-22 17:21:41.60401+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-ae427cf1-c5e1-4012-ad50-c17c5c1ce166", "sync_timestamp": "2025-06-22T17:21:41.603503132Z"}
61	test_corruption	test-corruption-detection-d936c9c9-f3b1-46ef-a9bc-7bfeacb933bb	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 17:21:41.670311+00	2025-06-22 17:21:41.670311+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-d936c9c9-f3b1-46ef-a9bc-7bfeacb933bb", "sync_timestamp": "2025-06-22T17:21:41.669852784Z"}
62	test_multi	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 17:21:41.70849+00	2025-06-22 17:21:41.70849+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-mixed", "sync_timestamp": "2025-06-22T17:21:41.708078744Z"}
63	test_multi	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-highfreq	{"test": "high_frequency", "update": 0, "worker": 7}	1	4e032db355785deea68ec337d8c41ba7f9fe69fa975f54f72d590f52e1958eb8	2025-06-22 17:21:41.868565+00	2025-06-22 17:21:41.890306+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-highfreq", "sync_timestamp": "2025-06-22T17:21:41.813518059Z"}
67	test_multi	test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 17:21:41.981339+00	2025-06-22 17:21:41.981339+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-0aef5798-70f3-49e3-8de4-64a0ef29784c-coordinated", "sync_timestamp": "2025-06-22T17:21:41.973950786Z"}
68	test_concurrent	test-concurrent-read-5d85eda8-1f83-408f-bf4a-028d883c54d4	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 17:23:11.722795+00	2025-06-22 17:23:11.722795+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-5d85eda8-1f83-408f-bf4a-028d883c54d4", "sync_timestamp": "2025-06-22T17:23:11.722168139Z"}
69	test_concurrent	test-concurrent-write-f220fad3-ac68-4f73-834f-37be83d4fa56	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 17:23:11.80166+00	2025-06-22 17:23:11.80166+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-f220fad3-ac68-4f73-834f-37be83d4fa56", "sync_timestamp": "2025-06-22T17:23:11.801113704Z"}
70	test_cow	test-cow-semantics-a1ee6fb4-4a80-456f-9ac5-9ba4475af8c8	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 17:23:11.812501+00	2025-06-22 17:23:11.812501+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-a1ee6fb4-4a80-456f-9ac5-9ba4475af8c8", "sync_timestamp": "2025-06-22T17:23:11.811768615Z"}
71	test_race	test-race-prevention-8bbdfd3f-0258-4177-a1bd-d0395c979dfb	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 17:23:11.87798+00	2025-06-22 17:23:11.87798+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-8bbdfd3f-0258-4177-a1bd-d0395c979dfb", "sync_timestamp": "2025-06-22T17:23:11.875922713Z"}
72	test_corruption	test-corruption-detection-0a585f48-855f-4739-a571-f5094d835db6	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 17:23:11.989465+00	2025-06-22 17:23:11.989465+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-0a585f48-855f-4739-a571-f5094d835db6", "sync_timestamp": "2025-06-22T17:23:11.988945803Z"}
73	test_multi	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 17:23:12.010463+00	2025-06-22 17:23:12.010463+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-mixed", "sync_timestamp": "2025-06-22T17:23:12.010236184Z"}
74	test_multi	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-highfreq	{"test": "high_frequency", "update": 0, "worker": 11}	1	b744274405b27aed5799963b842411de744dc7cbdfe3a791464e72f76f0f516b	2025-06-22 17:23:12.171667+00	2025-06-22 17:23:12.187286+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-highfreq", "sync_timestamp": "2025-06-22T17:23:12.168099633Z"}
76	test_multi	test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 17:23:12.237255+00	2025-06-22 17:23:12.237255+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-48f2755c-8d5a-4e5a-8e5e-da03e0f04e20-coordinated", "sync_timestamp": "2025-06-22T17:23:12.236654172Z"}
77	test_concurrent	test-concurrent-read-3db89ebe-b077-45a0-a895-24b03d385bd5	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 17:40:41.69169+00	2025-06-22 17:40:41.69169+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-3db89ebe-b077-45a0-a895-24b03d385bd5", "sync_timestamp": "2025-06-22T17:40:41.648438249Z"}
78	test_concurrent	test-concurrent-write-466cd2b1-f6b0-4ace-8561-3780d0e8dce5	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 17:40:41.716512+00	2025-06-22 17:40:41.716512+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-466cd2b1-f6b0-4ace-8561-3780d0e8dce5", "sync_timestamp": "2025-06-22T17:40:41.678881522Z"}
79	test_cow	test-cow-semantics-a3201ddd-a4da-4507-a541-4cd9d83d0357	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 17:40:41.739067+00	2025-06-22 17:40:41.739067+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-a3201ddd-a4da-4507-a541-4cd9d83d0357", "sync_timestamp": "2025-06-22T17:40:41.738461644Z"}
80	test_race	test-race-prevention-0ad08549-dce1-4fbd-a903-5b7c5b54f7fa	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 17:40:41.936508+00	2025-06-22 17:40:41.936508+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-0ad08549-dce1-4fbd-a903-5b7c5b54f7fa", "sync_timestamp": "2025-06-22T17:40:41.936110934Z"}
81	test_corruption	test-corruption-detection-b181eec6-6ff4-46db-8602-a41b95d87903	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 17:40:42.094018+00	2025-06-22 17:40:42.094018+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-b181eec6-6ff4-46db-8602-a41b95d87903", "sync_timestamp": "2025-06-22T17:40:42.093327643Z"}
82	test_multi	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 17:40:42.128923+00	2025-06-22 17:40:42.128923+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-mixed", "sync_timestamp": "2025-06-22T17:40:42.124156743Z"}
83	test_multi	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-highfreq	{"test": "high_frequency", "update": 0, "worker": 19}	1	01719637ac62e76dd0e57ac9a250f8bb8677c9616d859218d1a4274166202f4b	2025-06-22 17:40:42.231371+00	2025-06-22 17:40:42.231371+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-highfreq", "sync_timestamp": "2025-06-22T17:40:42.215424613Z"}
84	test_multi	test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 17:40:42.376452+00	2025-06-22 17:40:42.376452+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-725005db-98b8-4306-8cb0-db7236f1e2b0-coordinated", "sync_timestamp": "2025-06-22T17:40:42.375009301Z"}
85	test_concurrent	test-concurrent-read-101d9804-e3af-4733-854b-d88a2bf52070	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 17:41:27.091996+00	2025-06-22 17:41:27.091996+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-101d9804-e3af-4733-854b-d88a2bf52070", "sync_timestamp": "2025-06-22T17:41:27.087654892Z"}
86	test_concurrent	test-concurrent-write-06c11180-68ff-4c67-b0de-129f0a043f10	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 17:41:27.177097+00	2025-06-22 17:41:27.177097+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-06c11180-68ff-4c67-b0de-129f0a043f10", "sync_timestamp": "2025-06-22T17:41:27.176512764Z"}
87	test_cow	test-cow-semantics-8236153d-ce2c-4384-92d6-05d89fc41b8a	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 17:41:27.223261+00	2025-06-22 17:41:27.223261+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-8236153d-ce2c-4384-92d6-05d89fc41b8a", "sync_timestamp": "2025-06-22T17:41:27.222121394Z"}
88	test_race	test-race-prevention-a01fa282-294b-4680-8e3c-3b3f1177c62b	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 17:41:27.310984+00	2025-06-22 17:41:27.310984+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-a01fa282-294b-4680-8e3c-3b3f1177c62b", "sync_timestamp": "2025-06-22T17:41:27.309039637Z"}
89	test_corruption	test-corruption-detection-bace5d99-69a7-4632-ad8c-19f320ae3bd4	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 17:41:27.454831+00	2025-06-22 17:41:27.454831+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-bace5d99-69a7-4632-ad8c-19f320ae3bd4", "sync_timestamp": "2025-06-22T17:41:27.45437914Z"}
90	test_multi	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 17:41:27.471932+00	2025-06-22 17:41:27.471932+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-mixed", "sync_timestamp": "2025-06-22T17:41:27.465952836Z"}
91	test_multi	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-highfreq	{"test": "high_frequency", "update": 0, "worker": 19}	1	01719637ac62e76dd0e57ac9a250f8bb8677c9616d859218d1a4274166202f4b	2025-06-22 17:41:27.573401+00	2025-06-22 17:41:27.586938+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-highfreq", "sync_timestamp": "2025-06-22T17:41:27.567491321Z"}
94	test_multi	test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 17:41:27.65126+00	2025-06-22 17:41:27.65126+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-c661d4b6-bda4-470a-9654-c4eb98a00e07-coordinated", "sync_timestamp": "2025-06-22T17:41:27.651146057Z"}
95	test_concurrent	test-concurrent-read-51635dc8-fd3e-4725-9fb6-c0e8f606ce97	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 18:16:07.627463+00	2025-06-22 18:16:07.627463+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-51635dc8-fd3e-4725-9fb6-c0e8f606ce97", "sync_timestamp": "2025-06-22T18:16:07.626905344Z"}
96	test_concurrent	test-concurrent-write-14c8cee5-64bf-4f94-af69-3a060175906e	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 18:16:07.659566+00	2025-06-22 18:16:07.659566+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-14c8cee5-64bf-4f94-af69-3a060175906e", "sync_timestamp": "2025-06-22T18:16:07.658678705Z"}
97	test_cow	test-cow-semantics-98810438-2650-451f-b828-3f6a15d13e8d	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 18:16:07.674155+00	2025-06-22 18:16:07.674155+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-98810438-2650-451f-b828-3f6a15d13e8d", "sync_timestamp": "2025-06-22T18:16:07.673620463Z"}
98	test_race	test-race-prevention-2b2047ae-67e1-4c08-8829-52288331e820	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 18:16:07.76826+00	2025-06-22 18:16:07.76826+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-2b2047ae-67e1-4c08-8829-52288331e820", "sync_timestamp": "2025-06-22T18:16:07.767587289Z"}
99	test_corruption	test-corruption-detection-d44afecf-8c68-4955-9801-69699331a7d6	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 18:16:07.799222+00	2025-06-22 18:16:07.799222+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-d44afecf-8c68-4955-9801-69699331a7d6", "sync_timestamp": "2025-06-22T18:16:07.798647686Z"}
100	test_multi	test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 18:16:07.814957+00	2025-06-22 18:16:07.814957+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-mixed", "sync_timestamp": "2025-06-22T18:16:07.814539124Z"}
101	test_multi	test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-highfreq	{"test": "high_frequency", "update": 0, "worker": 19}	1	01719637ac62e76dd0e57ac9a250f8bb8677c9616d859218d1a4274166202f4b	2025-06-22 18:16:07.900133+00	2025-06-22 18:16:07.900133+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-highfreq", "sync_timestamp": "2025-06-22T18:16:07.899667227Z"}
102	test_multi	test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 18:16:07.996817+00	2025-06-22 18:16:07.996817+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-f15afa1e-f463-428f-a573-cd22decc37a4-coordinated", "sync_timestamp": "2025-06-22T18:16:07.99610318Z"}
103	test_concurrent	test-concurrent-write-a0e8dc54-3364-4d52-a655-361df87ffdf4	{"test": "concurrent_write", "worker": 2}	1	41dc7a91f5af850b6c797d3d10b6ffe831a4b9e32ade1b95905b23b3e40056e2	2025-06-22 20:33:32.094121+00	2025-06-22 20:33:32.094121+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-a0e8dc54-3364-4d52-a655-361df87ffdf4", "sync_timestamp": "2025-06-22T20:33:32.093790058Z"}
104	test_concurrent	test-concurrent-read-6741f740-750a-4ad9-944b-ed4db468ec2f	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 20:33:32.111789+00	2025-06-22 20:33:32.111789+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-6741f740-750a-4ad9-944b-ed4db468ec2f", "sync_timestamp": "2025-06-22T20:33:32.077765064Z"}
105	test_cow	test-cow-semantics-b2598368-b14f-4fa6-b005-c98f08c1ba3b	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 20:33:32.190855+00	2025-06-22 20:33:32.190855+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-b2598368-b14f-4fa6-b005-c98f08c1ba3b", "sync_timestamp": "2025-06-22T20:33:32.189395927Z"}
106	test_race	test-race-prevention-2543233b-563c-44c2-b421-08be9007acec	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 20:33:32.295164+00	2025-06-22 20:33:32.295164+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-2543233b-563c-44c2-b421-08be9007acec", "sync_timestamp": "2025-06-22T20:33:32.28268072Z"}
107	test_corruption	test-corruption-detection-8e23e951-c0b4-4d19-a789-7fc51b884d68	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 20:33:32.367596+00	2025-06-22 20:33:32.367596+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-8e23e951-c0b4-4d19-a789-7fc51b884d68", "sync_timestamp": "2025-06-22T20:33:32.367126649Z"}
108	test_multi	test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 20:33:32.410472+00	2025-06-22 20:33:32.410472+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-mixed", "sync_timestamp": "2025-06-22T20:33:32.409890545Z"}
109	test_multi	test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-highfreq	{"test": "high_frequency", "update": 0, "worker": 17}	1	be42a0b68aacbba94044e2590c8413999e38c072081ac65affa66d3bfb3915d8	2025-06-22 20:33:32.463504+00	2025-06-22 20:33:32.463504+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-highfreq", "sync_timestamp": "2025-06-22T20:33:32.462321686Z"}
110	test_multi	test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 20:33:32.608938+00	2025-06-22 20:33:32.608938+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-6d937a51-bd74-4fcd-9209-3e43368ca91d-coordinated", "sync_timestamp": "2025-06-22T20:33:32.608120122Z"}
111	test_concurrent	test-concurrent-read-2e104c79-2617-49b7-8b38-23c7d83690c8	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 20:36:14.497848+00	2025-06-22 20:36:14.497848+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-2e104c79-2617-49b7-8b38-23c7d83690c8", "sync_timestamp": "2025-06-22T20:36:14.436546912Z"}
112	test_concurrent	test-concurrent-write-44e61f3c-1c1e-45e4-8fde-266fedb2d113	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 20:36:14.523939+00	2025-06-22 20:36:14.523939+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-44e61f3c-1c1e-45e4-8fde-266fedb2d113", "sync_timestamp": "2025-06-22T20:36:14.480452777Z"}
113	test_cow	test-cow-semantics-3af4471d-6a0b-498c-8f04-8aae85b14389	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 20:36:14.585229+00	2025-06-22 20:36:14.585229+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-3af4471d-6a0b-498c-8f04-8aae85b14389", "sync_timestamp": "2025-06-22T20:36:14.584552357Z"}
114	test_race	test-race-prevention-79a9082c-e32c-47f0-89e6-f438cd2df719	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 20:36:14.643131+00	2025-06-22 20:36:14.643131+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-79a9082c-e32c-47f0-89e6-f438cd2df719", "sync_timestamp": "2025-06-22T20:36:14.642339227Z"}
115	test_corruption	test-corruption-detection-b1f14ac0-0e00-4ac7-88e4-ce5dc4c6d94f	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 20:36:14.711614+00	2025-06-22 20:36:14.711614+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-b1f14ac0-0e00-4ac7-88e4-ce5dc4c6d94f", "sync_timestamp": "2025-06-22T20:36:14.71091269Z"}
116	test_multi	test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 20:36:14.752755+00	2025-06-22 20:36:14.752755+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-mixed", "sync_timestamp": "2025-06-22T20:36:14.752293516Z"}
117	test_multi	test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-highfreq	{"test": "high_frequency", "update": 0, "worker": 19}	1	01719637ac62e76dd0e57ac9a250f8bb8677c9616d859218d1a4274166202f4b	2025-06-22 20:36:14.845622+00	2025-06-22 20:36:14.845622+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-highfreq", "sync_timestamp": "2025-06-22T20:36:14.844911229Z"}
118	test_multi	test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 20:36:14.945994+00	2025-06-22 20:36:14.945994+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-f88ca839-fcfa-4fa6-b35f-1a444e2c20ba-coordinated", "sync_timestamp": "2025-06-22T20:36:14.945393538Z"}
119	test_concurrent	test-concurrent-read-25f36eef-6535-4ddf-a133-429dd5afbaa6	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 20:50:04.234076+00	2025-06-22 20:50:04.234076+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-25f36eef-6535-4ddf-a133-429dd5afbaa6", "sync_timestamp": "2025-06-22T20:50:04.219814819Z"}
120	test_concurrent	test-concurrent-write-1f068e87-3fdf-40d6-baaf-7411878771bc	{"test": "concurrent_write", "worker": 0}	1	92993cab8415231f23c3775a2dd00ca842432721edf9a7c56c2e452e64996d54	2025-06-22 20:50:04.28387+00	2025-06-22 20:50:04.28387+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-1f068e87-3fdf-40d6-baaf-7411878771bc", "sync_timestamp": "2025-06-22T20:50:04.236342013Z"}
121	test_cow	test-cow-semantics-941b5a50-1dd0-4ce4-ac89-12e06955128c	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 20:50:04.318271+00	2025-06-22 20:50:04.318271+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-941b5a50-1dd0-4ce4-ac89-12e06955128c", "sync_timestamp": "2025-06-22T20:50:04.317571725Z"}
122	test_race	test-race-prevention-4ae4d8ea-2912-412a-8f5f-a333cff71bfe	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 20:50:04.364345+00	2025-06-22 20:50:04.364345+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-4ae4d8ea-2912-412a-8f5f-a333cff71bfe", "sync_timestamp": "2025-06-22T20:50:04.363804562Z"}
123	test_corruption	test-corruption-detection-a1e49e09-daa6-4e53-a163-41b1a963e58e	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 20:50:04.400908+00	2025-06-22 20:50:04.400908+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-a1e49e09-daa6-4e53-a163-41b1a963e58e", "sync_timestamp": "2025-06-22T20:50:04.40030284Z"}
124	test_multi	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 20:50:04.440346+00	2025-06-22 20:50:04.440346+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-mixed", "sync_timestamp": "2025-06-22T20:50:04.430838436Z"}
125	test_multi	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-highfreq	{"test": "high_frequency", "update": 1, "worker": 4}	1	cbff27ccec7a57babd671f330e184ef73708c652af5394ecefd0557d721c37c0	2025-06-22 20:50:04.522526+00	2025-06-22 20:50:04.52901+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-highfreq", "sync_timestamp": "2025-06-22T20:50:04.516067691Z"}
127	test_multi	test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 20:50:04.620564+00	2025-06-22 20:50:04.620564+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-e3c30dba-6bff-4d07-a171-d27c2641891a-coordinated", "sync_timestamp": "2025-06-22T20:50:04.620211665Z"}
128	test_concurrent	test-concurrent-read-e11a6d28-2752-4018-83ca-86d469e74be8	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-22 21:50:54.241304+00	2025-06-22 21:50:54.241304+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-e11a6d28-2752-4018-83ca-86d469e74be8", "sync_timestamp": "2025-06-22T21:50:54.240908355Z"}
129	test_concurrent	test-concurrent-write-95e6bca0-ef6d-44f9-9d57-5e020e8e3e29	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-22 21:50:54.268641+00	2025-06-22 21:50:54.268641+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-95e6bca0-ef6d-44f9-9d57-5e020e8e3e29", "sync_timestamp": "2025-06-22T21:50:54.268211933Z"}
130	test_cow	test-cow-semantics-5e6f2857-b3df-4729-a215-8e467c56b7ce	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-22 21:50:54.278165+00	2025-06-22 21:50:54.278165+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-5e6f2857-b3df-4729-a215-8e467c56b7ce", "sync_timestamp": "2025-06-22T21:50:54.278022557Z"}
131	test_race	test-race-prevention-03dc2776-80c4-44a9-96ca-0acfa2792851	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-22 21:50:54.319246+00	2025-06-22 21:50:54.319246+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-03dc2776-80c4-44a9-96ca-0acfa2792851", "sync_timestamp": "2025-06-22T21:50:54.318910262Z"}
132	test_corruption	test-corruption-detection-0f2f5c56-6586-4d12-bc18-e19b69e49bfc	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-22 21:50:54.352804+00	2025-06-22 21:50:54.352804+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-0f2f5c56-6586-4d12-bc18-e19b69e49bfc", "sync_timestamp": "2025-06-22T21:50:54.35237873Z"}
133	test_multi	test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-22 21:50:54.371113+00	2025-06-22 21:50:54.371113+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-mixed", "sync_timestamp": "2025-06-22T21:50:54.3705138Z"}
134	test_multi	test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-highfreq	{"test": "high_frequency", "update": 0, "worker": 7}	1	4e032db355785deea68ec337d8c41ba7f9fe69fa975f54f72d590f52e1958eb8	2025-06-22 21:50:54.421251+00	2025-06-22 21:50:54.426473+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-highfreq", "sync_timestamp": "2025-06-22T21:50:54.424999916Z"}
136	test_multi	test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-22 21:50:54.472056+00	2025-06-22 21:50:54.472056+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-e3538797-0d61-45c9-a27c-c1490e55100b-coordinated", "sync_timestamp": "2025-06-22T21:50:54.471241197Z"}
137	test_concurrent	test-concurrent-read-12a96b93-30f3-47b4-a4d0-d66aa91e8733	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-23 00:22:27.008188+00	2025-06-23 00:22:27.008188+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-12a96b93-30f3-47b4-a4d0-d66aa91e8733", "sync_timestamp": "2025-06-23T00:22:26.979396637Z"}
138	test_concurrent	test-concurrent-write-48a5922c-9c2c-4508-b519-8a6082fc4405	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-23 00:22:27.028578+00	2025-06-23 00:22:27.028578+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-48a5922c-9c2c-4508-b519-8a6082fc4405", "sync_timestamp": "2025-06-23T00:22:27.013941541Z"}
139	test_cow	test-cow-semantics-643bb747-0afc-4292-8dc5-7745f6e2747d	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-23 00:22:27.134458+00	2025-06-23 00:22:27.134458+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-643bb747-0afc-4292-8dc5-7745f6e2747d", "sync_timestamp": "2025-06-23T00:22:27.133204136Z"}
140	test_race	test-race-prevention-fb214e36-33e2-4cb2-8f7c-7be8cd469471	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-23 00:22:27.231424+00	2025-06-23 00:22:27.231424+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-fb214e36-33e2-4cb2-8f7c-7be8cd469471", "sync_timestamp": "2025-06-23T00:22:27.230865894Z"}
141	test_corruption	test-corruption-detection-cc61df68-e9a6-4900-bdfa-712875846133	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-23 00:22:27.277904+00	2025-06-23 00:22:27.277904+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-cc61df68-e9a6-4900-bdfa-712875846133", "sync_timestamp": "2025-06-23T00:22:27.276571199Z"}
142	test_multi	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-23 00:22:27.380244+00	2025-06-23 00:22:27.380244+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-mixed", "sync_timestamp": "2025-06-23T00:22:27.379849234Z"}
143	test_multi	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-highfreq	{"test": "high_frequency", "update": 0, "worker": 13}	1	59d33a936f32146aa171dcbbcd32e28c2142962c2072cf970e5b5dd7153401ae	2025-06-23 00:22:27.499252+00	2025-06-23 00:22:27.531224+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-highfreq", "sync_timestamp": "2025-06-23T00:22:27.530539874Z"}
145	test_multi	test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-23 00:22:27.671622+00	2025-06-23 00:22:27.671622+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-158ac74b-7c93-4dc1-b9a9-d35e0f627393-coordinated", "sync_timestamp": "2025-06-23T00:22:27.658699146Z"}
146	test_concurrent	test-concurrent-read-5dde5a14-a3da-4a01-9a9e-ab2cc3d9c6c3	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-23 00:22:59.123587+00	2025-06-23 00:22:59.123587+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-5dde5a14-a3da-4a01-9a9e-ab2cc3d9c6c3", "sync_timestamp": "2025-06-23T00:22:59.123433579Z"}
147	test_concurrent	test-concurrent-write-7170eab6-cbcc-474a-83aa-744119049f3e	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-23 00:22:59.158217+00	2025-06-23 00:22:59.158217+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-7170eab6-cbcc-474a-83aa-744119049f3e", "sync_timestamp": "2025-06-23T00:22:59.158079593Z"}
148	test_cow	test-cow-semantics-4b48a20b-7bc8-4842-a1dd-f0f8b3231dba	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-23 00:22:59.192349+00	2025-06-23 00:22:59.192349+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-4b48a20b-7bc8-4842-a1dd-f0f8b3231dba", "sync_timestamp": "2025-06-23T00:22:59.191014294Z"}
149	test_race	test-race-prevention-e4e899bc-24c8-4196-9d87-3fc7b76c42a8	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-23 00:22:59.274418+00	2025-06-23 00:22:59.274418+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-e4e899bc-24c8-4196-9d87-3fc7b76c42a8", "sync_timestamp": "2025-06-23T00:22:59.273557013Z"}
150	test_corruption	test-corruption-detection-81e97307-35c0-4b17-ae06-20331b660c4f	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-23 00:22:59.315607+00	2025-06-23 00:22:59.315607+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-81e97307-35c0-4b17-ae06-20331b660c4f", "sync_timestamp": "2025-06-23T00:22:59.314717419Z"}
151	test_multi	test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-23 00:22:59.352055+00	2025-06-23 00:22:59.352055+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-mixed", "sync_timestamp": "2025-06-23T00:22:59.351420496Z"}
152	test_multi	test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-highfreq	{"test": "high_frequency", "update": 0, "worker": 19}	1	01719637ac62e76dd0e57ac9a250f8bb8677c9616d859218d1a4274166202f4b	2025-06-23 00:22:59.400878+00	2025-06-23 00:22:59.400878+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-highfreq", "sync_timestamp": "2025-06-23T00:22:59.390415741Z"}
153	test_multi	test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-23 00:22:59.519096+00	2025-06-23 00:22:59.519096+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-6fb10b95-c6ba-49ab-80ed-fca2901587c0-coordinated", "sync_timestamp": "2025-06-23T00:22:59.518403942Z"}
154	test_concurrent	test-concurrent-read-44ed0d30-af9d-4610-a5a4-db4babf59c33	{"test": "concurrent_read", "worker": "initial"}	1	f0ef8f178e23efa4d37e17ff174e4de8f2b824feb937a6c4d1d7d26a9029fe11	2025-06-23 17:50:36.655429+00	2025-06-23 17:50:36.655429+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-read-44ed0d30-af9d-4610-a5a4-db4babf59c33", "sync_timestamp": "2025-06-23T17:50:36.633064973Z"}
155	test_concurrent	test-concurrent-write-8ecff0b8-0d99-4c91-9147-2a9caaa548ee	{"test": "concurrent_write", "worker": 4}	1	6a5d7166d539e695faf75928b8c5e0235e3b97123b24eabdd0f19289efdeb843	2025-06-23 17:50:36.779915+00	2025-06-23 17:50:36.779915+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-concurrent-write-8ecff0b8-0d99-4c91-9147-2a9caaa548ee", "sync_timestamp": "2025-06-23T17:50:36.779109222Z"}
156	test_cow	test-cow-semantics-6c12393d-8b96-468c-a95f-9b86bef89311	{"test": "cow_semantics", "value": "original"}	1	8e184f87673f0a5a3678e77ad9d3f61bbc1724fff75bfc055aaf045dd828012a	2025-06-23 17:50:36.868481+00	2025-06-23 17:50:36.868481+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-cow-semantics-6c12393d-8b96-468c-a95f-9b86bef89311", "sync_timestamp": "2025-06-23T17:50:36.861117645Z"}
157	test_race	test-race-prevention-30e8f26f-f2a6-4162-ab70-0ff33ae4b30f	{"test": "race_prevention", "counter": 0}	1	8e01b77db09059f42027760c2e51764f62344807844bce66dc6ea38233eb31a0	2025-06-23 17:50:37.194157+00	2025-06-23 17:50:37.194157+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-race-prevention-30e8f26f-f2a6-4162-ab70-0ff33ae4b30f", "sync_timestamp": "2025-06-23T17:50:37.193781355Z"}
158	test_corruption	test-corruption-detection-434d1c2e-f0c0-4211-afb8-000bba2b1c74	{"test": "corruption_detection", "integrity": true}	1	469a3f14cddbbecec40bef9f4ca41611d2aaeec76422431bebe1e4e277502554	2025-06-23 17:50:37.423333+00	2025-06-23 17:50:37.423333+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-corruption-detection-434d1c2e-f0c0-4211-afb8-000bba2b1c74", "sync_timestamp": "2025-06-23T17:50:37.412280642Z"}
159	test_multi	test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-mixed	{"test": "multi_worker_mixed", "phase": "initial"}	1	f6cb322f883a77ec0faed036e11429087e0089aba9ac54d83cd9dacf1f1ea087	2025-06-23 17:50:37.530932+00	2025-06-23 17:50:37.530932+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-mixed", "sync_timestamp": "2025-06-23T17:50:37.528657358Z"}
160	test_multi	test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-highfreq	{"test": "high_frequency", "update": 0, "worker": 19}	1	01719637ac62e76dd0e57ac9a250f8bb8677c9616d859218d1a4274166202f4b	2025-06-23 17:50:37.779411+00	2025-06-23 17:50:37.779411+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-highfreq", "sync_timestamp": "2025-06-23T17:50:37.722306973Z"}
161	test_multi	test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-coordinated	{"test": "coordinated_access", "phase": "initial"}	1	9c5b610a238214b82e78060da981dfc7b036f87fa3928f7ef9c3d16270ed66d2	2025-06-23 17:50:37.94593+00	2025-06-23 17:50:37.94593+00	consistency_validator_sync	{"synced_from": "domain_generation_config_states", "original_hash": "test-multi-worker-0846624f-493a-49a8-8dfa-7d277bbe38cc-coordinated", "sync_timestamp": "2025-06-23T17:50:37.937659214Z"}
\.


--
-- Data for Name: worker_coordination; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.worker_coordination (worker_id, campaign_id, worker_type, status, last_heartbeat, assigned_tasks, resource_locks, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: worker_pool_metrics; Type: TABLE DATA; Schema: public; Owner: domainflow
--

COPY public.worker_pool_metrics (id, pool_name, service_name, campaign_type, min_workers, max_workers, current_workers, active_workers, queued_tasks, completed_tasks, failed_tasks, avg_task_duration_ms, pool_efficiency_pct, scale_up_events, scale_down_events, last_scale_action, recorded_at) FROM stdin;
\.


--
-- Name: auth_audit_log_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: domainflow
--

SELECT pg_catalog.setval('auth.auth_audit_log_id_seq', 12, true);


--
-- Name: rate_limits_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: domainflow
--

SELECT pg_catalog.setval('auth.rate_limits_id_seq', 2, true);


--
-- Name: architecture_refactor_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.architecture_refactor_log_id_seq', 1, false);


--
-- Name: campaign_state_events_sequence_number_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.campaign_state_events_sequence_number_seq', 1, false);


--
-- Name: communication_patterns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.communication_patterns_id_seq', 1, false);


--
-- Name: event_projections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.event_projections_id_seq', 1, false);


--
-- Name: event_store_global_position_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.event_store_global_position_seq', 1, false);


--
-- Name: event_store_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.event_store_id_seq', 1, false);


--
-- Name: service_architecture_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.service_architecture_metrics_id_seq', 1, false);


--
-- Name: service_dependencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.service_dependencies_id_seq', 1, false);


--
-- Name: si004_connection_leak_detection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.si004_connection_leak_detection_id_seq', 7, true);


--
-- Name: si004_connection_pool_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.si004_connection_pool_alerts_id_seq', 14, true);


--
-- Name: si004_connection_pool_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.si004_connection_pool_metrics_id_seq', 70, true);


--
-- Name: versioned_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: domainflow
--

SELECT pg_catalog.setval('public.versioned_configs_id_seq', 161, true);


--
-- Name: auth_audit_log auth_audit_log_pkey; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.auth_audit_log
    ADD CONSTRAINT auth_audit_log_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_resource_action_key; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.permissions
    ADD CONSTRAINT permissions_resource_action_key UNIQUE (resource, action);


--
-- Name: rate_limits rate_limits_identifier_action_key; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.rate_limits
    ADD CONSTRAINT rate_limits_identifier_action_key UNIQUE (identifier, action);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: api_access_violations api_access_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.api_access_violations
    ADD CONSTRAINT api_access_violations_pkey PRIMARY KEY (id);


--
-- Name: architecture_refactor_log architecture_refactor_log_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.architecture_refactor_log
    ADD CONSTRAINT architecture_refactor_log_pkey PRIMARY KEY (id);


--
-- Name: async_task_status async_task_status_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.async_task_status
    ADD CONSTRAINT async_task_status_pkey PRIMARY KEY (id);


--
-- Name: async_task_status async_task_status_task_id_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.async_task_status
    ADD CONSTRAINT async_task_status_task_id_key UNIQUE (task_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: authorization_decisions authorization_decisions_decision_id_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_decision_id_key UNIQUE (decision_id);


--
-- Name: authorization_decisions authorization_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_pkey PRIMARY KEY (id);


--
-- Name: cache_configurations cache_configurations_cache_name_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.cache_configurations
    ADD CONSTRAINT cache_configurations_cache_name_key UNIQUE (cache_name);


--
-- Name: cache_configurations cache_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.cache_configurations
    ADD CONSTRAINT cache_configurations_pkey PRIMARY KEY (id);


--
-- Name: cache_entries cache_entries_cache_namespace_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_cache_namespace_cache_key_key UNIQUE (cache_namespace, cache_key);


--
-- Name: cache_entries cache_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.cache_entries
    ADD CONSTRAINT cache_entries_pkey PRIMARY KEY (id);


--
-- Name: cache_invalidation_log cache_invalidation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.cache_invalidation_log
    ADD CONSTRAINT cache_invalidation_log_pkey PRIMARY KEY (id);


--
-- Name: cache_invalidations cache_invalidations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.cache_invalidations
    ADD CONSTRAINT cache_invalidations_pkey PRIMARY KEY (id);


--
-- Name: cache_metrics cache_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.cache_metrics
    ADD CONSTRAINT cache_metrics_pkey PRIMARY KEY (id);


--
-- Name: campaign_access_grants campaign_access_grants_campaign_id_user_id_access_type_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_campaign_id_user_id_access_type_key UNIQUE (campaign_id, user_id, access_type);


--
-- Name: campaign_access_grants campaign_access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_pkey PRIMARY KEY (id);


--
-- Name: campaign_jobs campaign_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_jobs
    ADD CONSTRAINT campaign_jobs_pkey PRIMARY KEY (id);


--
-- Name: campaign_query_patterns campaign_query_patterns_campaign_type_service_name_query_pa_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_query_patterns
    ADD CONSTRAINT campaign_query_patterns_campaign_type_service_name_query_pa_key UNIQUE (campaign_type, service_name, query_pattern);


--
-- Name: campaign_query_patterns campaign_query_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_query_patterns
    ADD CONSTRAINT campaign_query_patterns_pkey PRIMARY KEY (id);


--
-- Name: campaign_state_events campaign_state_events_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT campaign_state_events_pkey PRIMARY KEY (id);


--
-- Name: campaign_state_snapshots campaign_state_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT campaign_state_snapshots_pkey PRIMARY KEY (id);


--
-- Name: campaign_state_transitions campaign_state_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: communication_patterns communication_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.communication_patterns
    ADD CONSTRAINT communication_patterns_pkey PRIMARY KEY (id);


--
-- Name: communication_patterns communication_patterns_source_service_target_service_protoc_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.communication_patterns
    ADD CONSTRAINT communication_patterns_source_service_target_service_protoc_key UNIQUE (source_service, target_service, protocol);


--
-- Name: config_locks config_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.config_locks
    ADD CONSTRAINT config_locks_pkey PRIMARY KEY (id);


--
-- Name: config_versions config_versions_config_hash_version_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_config_hash_version_key UNIQUE (config_hash, version);


--
-- Name: config_versions config_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.config_versions
    ADD CONSTRAINT config_versions_pkey PRIMARY KEY (id);


--
-- Name: connection_leak_detection connection_leak_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.connection_leak_detection
    ADD CONSTRAINT connection_leak_detection_pkey PRIMARY KEY (id);


--
-- Name: connection_pool_alerts connection_pool_alerts_alert_type_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.connection_pool_alerts
    ADD CONSTRAINT connection_pool_alerts_alert_type_key UNIQUE (alert_type);


--
-- Name: connection_pool_alerts connection_pool_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.connection_pool_alerts
    ADD CONSTRAINT connection_pool_alerts_pkey PRIMARY KEY (id);


--
-- Name: connection_pool_metrics connection_pool_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.connection_pool_metrics
    ADD CONSTRAINT connection_pool_metrics_pkey PRIMARY KEY (id);


--
-- Name: database_performance_metrics database_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.database_performance_metrics
    ADD CONSTRAINT database_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: dns_validation_params dns_validation_params_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.dns_validation_params
    ADD CONSTRAINT dns_validation_params_pkey PRIMARY KEY (campaign_id);


--
-- Name: dns_validation_results dns_validation_results_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_pkey PRIMARY KEY (id);


--
-- Name: domain_generation_batches domain_generation_batches_campaign_id_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.domain_generation_batches
    ADD CONSTRAINT domain_generation_batches_campaign_id_batch_number_key UNIQUE (campaign_id, batch_number);


--
-- Name: domain_generation_batches domain_generation_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.domain_generation_batches
    ADD CONSTRAINT domain_generation_batches_pkey PRIMARY KEY (batch_id);


--
-- Name: domain_generation_campaign_params domain_generation_campaign_params_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.domain_generation_campaign_params
    ADD CONSTRAINT domain_generation_campaign_params_pkey PRIMARY KEY (campaign_id);


--
-- Name: domain_generation_config_states domain_generation_config_states_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.domain_generation_config_states
    ADD CONSTRAINT domain_generation_config_states_pkey PRIMARY KEY (config_hash);


--
-- Name: domain_generation_params domain_generation_params_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.domain_generation_params
    ADD CONSTRAINT domain_generation_params_pkey PRIMARY KEY (id);


--
-- Name: enum_validation_failures enum_validation_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.enum_validation_failures
    ADD CONSTRAINT enum_validation_failures_pkey PRIMARY KEY (id);


--
-- Name: event_projections event_projections_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.event_projections
    ADD CONSTRAINT event_projections_pkey PRIMARY KEY (id);


--
-- Name: event_projections event_projections_projection_name_aggregate_id_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.event_projections
    ADD CONSTRAINT event_projections_projection_name_aggregate_id_key UNIQUE (projection_name, aggregate_id);


--
-- Name: event_store event_store_aggregate_id_stream_position_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_aggregate_id_stream_position_key UNIQUE (aggregate_id, stream_position);


--
-- Name: event_store event_store_event_id_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_event_id_key UNIQUE (event_id);


--
-- Name: event_store event_store_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_pkey PRIMARY KEY (id);


--
-- Name: generated_domains generated_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT generated_domains_pkey PRIMARY KEY (id);


--
-- Name: http_keyword_campaign_params http_keyword_campaign_params_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_campaign_params
    ADD CONSTRAINT http_keyword_campaign_params_pkey PRIMARY KEY (campaign_id);


--
-- Name: http_keyword_params http_keyword_params_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_params
    ADD CONSTRAINT http_keyword_params_pkey PRIMARY KEY (id);


--
-- Name: http_keyword_results http_keyword_results_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_pkey PRIMARY KEY (id);


--
-- Name: index_usage_analytics index_usage_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.index_usage_analytics
    ADD CONSTRAINT index_usage_analytics_pkey PRIMARY KEY (id);


--
-- Name: input_validation_rules input_validation_rules_endpoint_pattern_http_method_field_n_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.input_validation_rules
    ADD CONSTRAINT input_validation_rules_endpoint_pattern_http_method_field_n_key UNIQUE (endpoint_pattern, http_method, field_name);


--
-- Name: input_validation_rules input_validation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.input_validation_rules
    ADD CONSTRAINT input_validation_rules_pkey PRIMARY KEY (id);


--
-- Name: input_validation_violations input_validation_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.input_validation_violations
    ADD CONSTRAINT input_validation_violations_pkey PRIMARY KEY (id);


--
-- Name: keyword_rules keyword_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.keyword_rules
    ADD CONSTRAINT keyword_rules_pkey PRIMARY KEY (id);


--
-- Name: keyword_sets keyword_sets_name_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.keyword_sets
    ADD CONSTRAINT keyword_sets_name_key UNIQUE (name);


--
-- Name: keyword_sets keyword_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.keyword_sets
    ADD CONSTRAINT keyword_sets_pkey PRIMARY KEY (id);


--
-- Name: memory_allocations memory_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.memory_allocations
    ADD CONSTRAINT memory_allocations_pkey PRIMARY KEY (id);


--
-- Name: memory_leak_detection memory_leak_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.memory_leak_detection
    ADD CONSTRAINT memory_leak_detection_pkey PRIMARY KEY (id);


--
-- Name: memory_metrics memory_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.memory_metrics
    ADD CONSTRAINT memory_metrics_pkey PRIMARY KEY (id);


--
-- Name: memory_optimization_recommendations memory_optimization_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.memory_optimization_recommendations
    ADD CONSTRAINT memory_optimization_recommendations_pkey PRIMARY KEY (id);


--
-- Name: memory_pools memory_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.memory_pools
    ADD CONSTRAINT memory_pools_pkey PRIMARY KEY (id);


--
-- Name: memory_pools memory_pools_pool_name_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.memory_pools
    ADD CONSTRAINT memory_pools_pool_name_key UNIQUE (pool_name);


--
-- Name: performance_baselines performance_baselines_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.performance_baselines
    ADD CONSTRAINT performance_baselines_pkey PRIMARY KEY (id);


--
-- Name: performance_baselines performance_baselines_service_name_campaign_type_optimizati_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.performance_baselines
    ADD CONSTRAINT performance_baselines_service_name_campaign_type_optimizati_key UNIQUE (service_name, campaign_type, optimization_phase);


--
-- Name: performance_optimizations performance_optimizations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.performance_optimizations
    ADD CONSTRAINT performance_optimizations_pkey PRIMARY KEY (id);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id);


--
-- Name: proxies proxies_address_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_address_key UNIQUE (address);


--
-- Name: proxies proxies_name_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_name_key UNIQUE (name);


--
-- Name: proxies proxies_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.proxies
    ADD CONSTRAINT proxies_pkey PRIMARY KEY (id);


--
-- Name: proxy_pool_memberships proxy_pool_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.proxy_pool_memberships
    ADD CONSTRAINT proxy_pool_memberships_pkey PRIMARY KEY (pool_id, proxy_id);


--
-- Name: proxy_pools proxy_pools_name_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.proxy_pools
    ADD CONSTRAINT proxy_pools_name_key UNIQUE (name);


--
-- Name: proxy_pools proxy_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.proxy_pools
    ADD CONSTRAINT proxy_pools_pkey PRIMARY KEY (id);


--
-- Name: query_optimization_recommendations query_optimization_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.query_optimization_recommendations
    ADD CONSTRAINT query_optimization_recommendations_pkey PRIMARY KEY (id);


--
-- Name: query_performance_metrics query_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.query_performance_metrics
    ADD CONSTRAINT query_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: resource_locks resource_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.resource_locks
    ADD CONSTRAINT resource_locks_pkey PRIMARY KEY (lock_id);


--
-- Name: resource_optimization_actions resource_optimization_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.resource_optimization_actions
    ADD CONSTRAINT resource_optimization_actions_pkey PRIMARY KEY (id);


--
-- Name: resource_utilization_metrics resource_utilization_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.resource_utilization_metrics
    ADD CONSTRAINT resource_utilization_metrics_pkey PRIMARY KEY (id);


--
-- Name: response_optimization_recommendations response_optimization_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.response_optimization_recommendations
    ADD CONSTRAINT response_optimization_recommendations_pkey PRIMARY KEY (id);


--
-- Name: response_time_history response_time_history_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.response_time_history
    ADD CONSTRAINT response_time_history_pkey PRIMARY KEY (id);


--
-- Name: response_time_metrics response_time_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.response_time_metrics
    ADD CONSTRAINT response_time_metrics_pkey PRIMARY KEY (id);


--
-- Name: response_time_targets response_time_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.response_time_targets
    ADD CONSTRAINT response_time_targets_pkey PRIMARY KEY (id);


--
-- Name: response_time_targets response_time_targets_service_name_endpoint_pattern_campaig_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.response_time_targets
    ADD CONSTRAINT response_time_targets_service_name_endpoint_pattern_campaig_key UNIQUE (service_name, endpoint_pattern, campaign_type);


--
-- Name: schema_migrations_old schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.schema_migrations_old
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: schema_migrations schema_migrations_pkey1; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey1 PRIMARY KEY (version);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: service_architecture_metrics service_architecture_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.service_architecture_metrics
    ADD CONSTRAINT service_architecture_metrics_pkey PRIMARY KEY (id);


--
-- Name: service_capacity_metrics service_capacity_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.service_capacity_metrics
    ADD CONSTRAINT service_capacity_metrics_pkey PRIMARY KEY (id);


--
-- Name: service_dependencies service_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_pkey PRIMARY KEY (id);


--
-- Name: service_dependencies service_dependencies_source_service_target_service_dependen_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.service_dependencies
    ADD CONSTRAINT service_dependencies_source_service_target_service_dependen_key UNIQUE (source_service, target_service, dependency_type);


--
-- Name: si004_connection_leak_detection si004_connection_leak_detection_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.si004_connection_leak_detection
    ADD CONSTRAINT si004_connection_leak_detection_pkey PRIMARY KEY (id);


--
-- Name: si004_connection_pool_alerts si004_connection_pool_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.si004_connection_pool_alerts
    ADD CONSTRAINT si004_connection_pool_alerts_pkey PRIMARY KEY (id);


--
-- Name: si004_connection_pool_metrics si004_connection_pool_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.si004_connection_pool_metrics
    ADD CONSTRAINT si004_connection_pool_metrics_pkey PRIMARY KEY (id);


--
-- Name: slow_query_log slow_query_log_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.slow_query_log
    ADD CONSTRAINT slow_query_log_pkey PRIMARY KEY (id);


--
-- Name: state_coordination_locks state_coordination_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.state_coordination_locks
    ADD CONSTRAINT state_coordination_locks_pkey PRIMARY KEY (lock_key);


--
-- Name: state_events state_events_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.state_events
    ADD CONSTRAINT state_events_pkey PRIMARY KEY (id);


--
-- Name: state_snapshots state_snapshots_entity_id_entity_type_snapshot_version_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.state_snapshots
    ADD CONSTRAINT state_snapshots_entity_id_entity_type_snapshot_version_key UNIQUE (entity_id, entity_type, snapshot_version);


--
-- Name: state_snapshots state_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.state_snapshots
    ADD CONSTRAINT state_snapshots_pkey PRIMARY KEY (id);


--
-- Name: suspicious_input_alerts suspicious_input_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.suspicious_input_alerts
    ADD CONSTRAINT suspicious_input_alerts_pkey PRIMARY KEY (id);


--
-- Name: suspicious_input_patterns suspicious_input_patterns_pattern_name_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.suspicious_input_patterns
    ADD CONSTRAINT suspicious_input_patterns_pattern_name_key UNIQUE (pattern_name);


--
-- Name: suspicious_input_patterns suspicious_input_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.suspicious_input_patterns
    ADD CONSTRAINT suspicious_input_patterns_pkey PRIMARY KEY (id);


--
-- Name: system_alerts system_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_pkey PRIMARY KEY (id);


--
-- Name: resource_locks unique_exclusive_locks; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.resource_locks
    ADD CONSTRAINT unique_exclusive_locks EXCLUDE USING btree (resource_type WITH =, resource_id WITH =) WHERE (((lock_mode)::text = 'exclusive'::text));


--
-- Name: index_usage_analytics unique_index_analytics; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.index_usage_analytics
    ADD CONSTRAINT unique_index_analytics UNIQUE (schema_name, table_name, index_name);


--
-- Name: campaign_state_snapshots uq_campaign_snapshots_sequence; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT uq_campaign_snapshots_sequence UNIQUE (campaign_id, last_event_sequence);


--
-- Name: campaign_state_events uq_campaign_state_events_sequence; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT uq_campaign_state_events_sequence UNIQUE (campaign_id, sequence_number);


--
-- Name: dns_validation_results uq_dns_results_campaign_domain; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT uq_dns_results_campaign_domain UNIQUE (dns_campaign_id, domain_name);


--
-- Name: generated_domains uq_generated_domains_campaign_name; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT uq_generated_domains_campaign_name UNIQUE (domain_generation_campaign_id, domain_name);


--
-- Name: http_keyword_results uq_http_results_campaign_domain; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT uq_http_results_campaign_domain UNIQUE (http_keyword_campaign_id, domain_name);


--
-- Name: personas uq_personas_name_type; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT uq_personas_name_type UNIQUE (name, persona_type);


--
-- Name: campaign_state_transitions uq_state_transitions_event; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT uq_state_transitions_event UNIQUE (state_event_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: versioned_configs versioned_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.versioned_configs
    ADD CONSTRAINT versioned_configs_pkey PRIMARY KEY (id);


--
-- Name: versioned_configs versioned_configs_type_key_unique; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.versioned_configs
    ADD CONSTRAINT versioned_configs_type_key_unique UNIQUE (config_type, config_key);


--
-- Name: worker_coordination worker_coordination_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.worker_coordination
    ADD CONSTRAINT worker_coordination_pkey PRIMARY KEY (worker_id);


--
-- Name: worker_pool_metrics worker_pool_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.worker_pool_metrics
    ADD CONSTRAINT worker_pool_metrics_pkey PRIMARY KEY (id);


--
-- Name: idx_auth_audit_created_at; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_auth_audit_created_at ON auth.auth_audit_log USING btree (created_at);


--
-- Name: idx_auth_audit_event_type; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_auth_audit_event_type ON auth.auth_audit_log USING btree (event_type);


--
-- Name: idx_auth_audit_risk_score; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_auth_audit_risk_score ON auth.auth_audit_log USING btree (risk_score);


--
-- Name: idx_auth_audit_session_fingerprint; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_auth_audit_session_fingerprint ON auth.auth_audit_log USING btree (session_fingerprint) WHERE (session_fingerprint IS NOT NULL);


--
-- Name: idx_auth_audit_user_id; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_auth_audit_user_id ON auth.auth_audit_log USING btree (user_id);


--
-- Name: idx_password_reset_expires; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_password_reset_expires ON auth.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_user_id; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_password_reset_user_id ON auth.password_reset_tokens USING btree (user_id);


--
-- Name: idx_rate_limits_blocked_until; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_rate_limits_blocked_until ON auth.rate_limits USING btree (blocked_until);


--
-- Name: idx_rate_limits_identifier; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_rate_limits_identifier ON auth.rate_limits USING btree (identifier);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_role_permissions_permission_id ON auth.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_role_permissions_role_id ON auth.role_permissions USING btree (role_id);


--
-- Name: idx_sessions_active; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_sessions_active ON auth.sessions USING btree (is_active, expires_at);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_sessions_expires_at ON auth.sessions USING btree (expires_at);


--
-- Name: idx_sessions_fingerprint; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_sessions_fingerprint ON auth.sessions USING btree (session_fingerprint) WHERE (session_fingerprint IS NOT NULL);


--
-- Name: idx_sessions_ip_address; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_sessions_ip_address ON auth.sessions USING btree (ip_address) WHERE (ip_address IS NOT NULL);


--
-- Name: idx_sessions_last_activity; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_sessions_last_activity ON auth.sessions USING btree (last_activity_at);


--
-- Name: idx_sessions_user_agent_hash; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_sessions_user_agent_hash ON auth.sessions USING btree (user_agent_hash) WHERE (user_agent_hash IS NOT NULL);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_sessions_user_id ON auth.sessions USING btree (user_id);


--
-- Name: idx_sessions_validation; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_sessions_validation ON auth.sessions USING btree (id, is_active, expires_at, user_id);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_user_roles_role_id ON auth.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: auth; Owner: domainflow
--

CREATE INDEX idx_user_roles_user_id ON auth.user_roles USING btree (user_id);


--
-- Name: idx_access_violations_created; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_access_violations_created ON public.api_access_violations USING btree (created_at);


--
-- Name: idx_access_violations_endpoint; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_access_violations_endpoint ON public.api_access_violations USING btree (endpoint_pattern);


--
-- Name: idx_access_violations_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_access_violations_type ON public.api_access_violations USING btree (violation_type);


--
-- Name: idx_access_violations_user; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_access_violations_user ON public.api_access_violations USING btree (user_id);


--
-- Name: idx_async_task_status_task_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_async_task_status_task_id ON public.async_task_status USING btree (task_id);


--
-- Name: idx_async_task_status_type_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_async_task_status_type_status ON public.async_task_status USING btree (task_type, status);


--
-- Name: idx_async_task_status_user; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_async_task_status_user ON public.async_task_status USING btree (user_id, status);


--
-- Name: idx_audit_logs_access_decision; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_access_decision ON public.audit_logs USING btree (access_decision);


--
-- Name: idx_audit_logs_authorization; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_authorization ON public.audit_logs USING gin (authorization_context);


--
-- Name: idx_audit_logs_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_campaign ON public.audit_logs USING btree (entity_id, entity_type, "timestamp") WHERE (entity_type = 'campaign'::text);


--
-- Name: idx_audit_logs_entity_action_timestamp; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_entity_action_timestamp ON public.audit_logs USING btree (entity_type, action, "timestamp" DESC) WHERE (entity_type IS NOT NULL);


--
-- Name: idx_audit_logs_entity_timestamp; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_entity_timestamp ON public.audit_logs USING btree (entity_id, "timestamp" DESC) WHERE (entity_id IS NOT NULL);


--
-- Name: idx_audit_logs_entity_type_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_entity_type_id ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_permissions; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_permissions ON public.audit_logs USING gin (permission_checked);


--
-- Name: idx_audit_logs_security_level; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_security_level ON public.audit_logs USING btree (security_level);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_audit_logs_user_action; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_user_action ON public.audit_logs USING btree (user_id, action, "timestamp");


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_logs_user_timestamp; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_audit_logs_user_timestamp ON public.audit_logs USING btree (user_id, "timestamp" DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_auth_decisions_created; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_auth_decisions_created ON public.authorization_decisions USING btree (created_at);


--
-- Name: idx_auth_decisions_decision; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_auth_decisions_decision ON public.authorization_decisions USING btree (decision);


--
-- Name: idx_auth_decisions_resource; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_auth_decisions_resource ON public.authorization_decisions USING btree (resource_type, resource_id);


--
-- Name: idx_auth_decisions_user; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_auth_decisions_user ON public.authorization_decisions USING btree (user_id);


--
-- Name: idx_cache_config_name; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_config_name ON public.cache_configurations USING btree (cache_name);


--
-- Name: idx_cache_config_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_config_status ON public.cache_configurations USING btree (cache_status);


--
-- Name: idx_cache_config_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_config_type ON public.cache_configurations USING btree (cache_type);


--
-- Name: idx_cache_entries_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_entries_campaign ON public.cache_entries USING btree (campaign_type, campaign_id);


--
-- Name: idx_cache_entries_expires; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_entries_expires ON public.cache_entries USING btree (expires_at);


--
-- Name: idx_cache_entries_last_accessed; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_entries_last_accessed ON public.cache_entries USING btree (last_accessed);


--
-- Name: idx_cache_entries_namespace_key; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_entries_namespace_key ON public.cache_entries USING btree (cache_namespace, cache_key);


--
-- Name: idx_cache_entries_service; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_entries_service ON public.cache_entries USING btree (service_name);


--
-- Name: idx_cache_entries_tags; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_entries_tags ON public.cache_entries USING gin (tags);


--
-- Name: idx_cache_inv_at; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_inv_at ON public.cache_invalidations USING btree (invalidated_at);


--
-- Name: idx_cache_inv_name; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_inv_name ON public.cache_invalidations USING btree (cache_name);


--
-- Name: idx_cache_inv_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_inv_type ON public.cache_invalidations USING btree (invalidation_type);


--
-- Name: idx_cache_invalidation_namespace; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_invalidation_namespace ON public.cache_invalidation_log USING btree (cache_namespace);


--
-- Name: idx_cache_invalidation_service_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_invalidation_service_time ON public.cache_invalidation_log USING btree (service_name, executed_at DESC);


--
-- Name: idx_cache_metrics_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_metrics_campaign ON public.cache_metrics USING btree (campaign_type);


--
-- Name: idx_cache_metrics_name; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_metrics_name ON public.cache_metrics USING btree (cache_namespace);


--
-- Name: idx_cache_metrics_namespace; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_metrics_namespace ON public.cache_metrics USING btree (cache_namespace);


--
-- Name: idx_cache_metrics_operation; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_metrics_operation ON public.cache_metrics USING btree (operation_type);


--
-- Name: idx_cache_metrics_recorded; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_metrics_recorded ON public.cache_metrics USING btree (recorded_at);


--
-- Name: idx_cache_metrics_service_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_metrics_service_time ON public.cache_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_cache_metrics_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_cache_metrics_type ON public.cache_metrics USING btree (operation_type);


--
-- Name: idx_campaign_jobs_bulk_update; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_jobs_bulk_update ON public.campaign_jobs USING btree (status, job_type, created_at);


--
-- Name: idx_campaign_jobs_campaign_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_jobs_campaign_id ON public.campaign_jobs USING btree (campaign_id);


--
-- Name: idx_campaign_jobs_campaign_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_jobs_campaign_type ON public.campaign_jobs USING btree (campaign_id, job_type);


--
-- Name: idx_campaign_jobs_completion; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_jobs_completion ON public.campaign_jobs USING btree (updated_at, status) WHERE (status = ANY (ARRAY['completed'::text, 'failed'::text, 'cancelled'::text]));


--
-- Name: idx_campaign_jobs_processing; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_jobs_processing ON public.campaign_jobs USING btree (status, last_attempted_at) WHERE (status = ANY (ARRAY['pending'::text, 'running'::text]));


--
-- Name: idx_campaign_jobs_status_next_execution; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_jobs_status_next_execution ON public.campaign_jobs USING btree (status, next_execution_at) WHERE (status = ANY (ARRAY['pending'::text, 'queued'::text, 'retry'::text]));


--
-- Name: idx_campaign_jobs_status_scheduled; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_jobs_status_scheduled ON public.campaign_jobs USING btree (status, scheduled_at);


--
-- Name: idx_campaign_jobs_status_scheduled_at; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_jobs_status_scheduled_at ON public.campaign_jobs USING btree (status, scheduled_at);


--
-- Name: idx_campaign_jobs_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_jobs_type ON public.campaign_jobs USING btree (job_type);


--
-- Name: idx_campaign_state_events_campaign_sequence; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_state_events_campaign_sequence ON public.campaign_state_events USING btree (campaign_id, sequence_number);


--
-- Name: idx_campaign_state_events_correlation; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_state_events_correlation ON public.campaign_state_events USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_campaign_state_events_processing_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_state_events_processing_status ON public.campaign_state_events USING btree (processing_status, occurred_at) WHERE (processing_status = ANY (ARRAY['pending'::text, 'failed'::text]));


--
-- Name: idx_campaign_state_events_type_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_state_events_type_campaign ON public.campaign_state_events USING btree (campaign_id, event_type, occurred_at DESC);


--
-- Name: idx_campaign_state_snapshots_campaign_sequence; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_state_snapshots_campaign_sequence ON public.campaign_state_snapshots USING btree (campaign_id, last_event_sequence DESC);


--
-- Name: idx_campaign_state_snapshots_valid; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_state_snapshots_valid ON public.campaign_state_snapshots USING btree (campaign_id, created_at DESC) WHERE (is_valid = true);


--
-- Name: idx_campaign_state_transitions_campaign_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_state_transitions_campaign_time ON public.campaign_state_transitions USING btree (campaign_id, initiated_at DESC);


--
-- Name: idx_campaign_state_transitions_invalid; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaign_state_transitions_invalid ON public.campaign_state_transitions USING btree (campaign_id, is_valid_transition, initiated_at DESC) WHERE (is_valid_transition = false);


--
-- Name: idx_campaigns_bulk_ops; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_bulk_ops ON public.campaigns USING btree (status, campaign_type, created_at);


--
-- Name: idx_campaigns_created_at; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_created_at ON public.campaigns USING btree (created_at DESC);


--
-- Name: idx_campaigns_large_numeric_values; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_large_numeric_values ON public.campaigns USING btree (id) WHERE ((total_items > '9007199254740991'::bigint) OR (processed_items > '9007199254740991'::bigint) OR (successful_items > '9007199254740991'::bigint) OR (failed_items > '9007199254740991'::bigint));


--
-- Name: idx_campaigns_last_heartbeat; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_last_heartbeat ON public.campaigns USING btree (last_heartbeat_at) WHERE (last_heartbeat_at IS NOT NULL);


--
-- Name: idx_campaigns_name_search; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_name_search ON public.campaigns USING gin (to_tsvector('english'::regconfig, name));


--
-- Name: idx_campaigns_processed_items; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_processed_items ON public.campaigns USING btree (processed_items) WHERE (processed_items > 0);


--
-- Name: idx_campaigns_progress_tracking; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_progress_tracking ON public.campaigns USING btree (status, progress_percentage, updated_at) WHERE (progress_percentage IS NOT NULL);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_status ON public.campaigns USING btree (status);


--
-- Name: idx_campaigns_status_created_at; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_status_created_at ON public.campaigns USING btree (status, created_at);


--
-- Name: idx_campaigns_status_type_created; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_status_type_created ON public.campaigns USING btree (status, campaign_type, created_at);


--
-- Name: idx_campaigns_status_updated; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_status_updated ON public.campaigns USING btree (status, updated_at DESC);


--
-- Name: idx_campaigns_total_items; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_total_items ON public.campaigns USING btree (total_items) WHERE (total_items > 0);


--
-- Name: idx_campaigns_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_type ON public.campaigns USING btree (campaign_type);


--
-- Name: idx_campaigns_type_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_type_status ON public.campaigns USING btree (campaign_type, status);


--
-- Name: idx_campaigns_user_active; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_user_active ON public.campaigns USING btree (user_id, status) WHERE ((status = ANY (ARRAY['running'::text, 'pending'::text, 'queued'::text])) AND (user_id IS NOT NULL));


--
-- Name: idx_campaigns_user_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_user_id ON public.campaigns USING btree (user_id);


--
-- Name: idx_campaigns_user_id_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_campaigns_user_id_status ON public.campaigns USING btree (user_id, status);


--
-- Name: idx_capacity_metrics_service_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_capacity_metrics_service_time ON public.service_capacity_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_communication_patterns_errors; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_communication_patterns_errors ON public.communication_patterns USING btree (error_rate DESC) WHERE (error_rate > 1.0);


--
-- Name: idx_communication_patterns_latency; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_communication_patterns_latency ON public.communication_patterns USING btree (avg_latency_ms DESC) WHERE (avg_latency_ms > 100.0);


--
-- Name: idx_config_locks_active; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_config_locks_active ON public.config_locks USING btree (is_active);


--
-- Name: idx_config_locks_active_unique; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE UNIQUE INDEX idx_config_locks_active_unique ON public.config_locks USING btree (config_hash) WHERE (is_active = true);


--
-- Name: idx_config_locks_config_hash; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_config_locks_config_hash ON public.config_locks USING btree (config_hash);


--
-- Name: idx_config_locks_expires; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_config_locks_expires ON public.config_locks USING btree (expires_at);


--
-- Name: idx_config_locks_owner; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_config_locks_owner ON public.config_locks USING btree (owner);


--
-- Name: idx_config_versions_hash; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_config_versions_hash ON public.config_versions USING btree (config_hash);


--
-- Name: idx_config_versions_version; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_config_versions_version ON public.config_versions USING btree (config_hash, version);


--
-- Name: idx_connection_leak_acquired; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_connection_leak_acquired ON public.connection_leak_detection USING btree (acquired_at);


--
-- Name: idx_connection_leak_connection; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_connection_leak_connection ON public.connection_leak_detection USING btree (connection_id);


--
-- Name: idx_connection_leak_leaked; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_connection_leak_leaked ON public.connection_leak_detection USING btree (is_leaked);


--
-- Name: idx_connection_pool_metrics_pool; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_connection_pool_metrics_pool ON public.connection_pool_metrics USING btree (pool_name);


--
-- Name: idx_connection_pool_metrics_recorded; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_connection_pool_metrics_recorded ON public.connection_pool_metrics USING btree (recorded_at);


--
-- Name: idx_connection_pool_metrics_state; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_connection_pool_metrics_state ON public.connection_pool_metrics USING btree (pool_state);


--
-- Name: idx_coordination_locks_expires; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_coordination_locks_expires ON public.state_coordination_locks USING btree (expires_at);


--
-- Name: idx_db_perf_metrics_hash; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_db_perf_metrics_hash ON public.database_performance_metrics USING btree (query_hash);


--
-- Name: idx_db_perf_metrics_recorded; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_db_perf_metrics_recorded ON public.database_performance_metrics USING btree (recorded_at);


--
-- Name: idx_db_perf_metrics_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_db_perf_metrics_time ON public.database_performance_metrics USING btree (execution_time_ms);


--
-- Name: idx_db_perf_metrics_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_db_perf_metrics_type ON public.database_performance_metrics USING btree (query_type);


--
-- Name: idx_dependencies_reliability; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_dependencies_reliability ON public.service_dependencies USING btree (reliability_score) WHERE (reliability_score < 95.0);


--
-- Name: idx_dns_results_campaign_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_dns_results_campaign_id ON public.dns_validation_results USING btree (dns_campaign_id);


--
-- Name: idx_dns_results_domain_name; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_dns_results_domain_name ON public.dns_validation_results USING btree (domain_name);


--
-- Name: idx_dns_results_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_dns_results_status ON public.dns_validation_results USING btree (validation_status);


--
-- Name: idx_dns_validation_results_bulk_ops; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_dns_validation_results_bulk_ops ON public.dns_validation_results USING btree (dns_campaign_id, validation_status, created_at);


--
-- Name: idx_dns_validation_results_failed; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_dns_validation_results_failed ON public.dns_validation_results USING btree (dns_campaign_id, validation_status) WHERE (validation_status = 'failed'::text);


--
-- Name: idx_dns_validation_results_status_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_dns_validation_results_status_time ON public.dns_validation_results USING btree (validation_status, last_checked_at);


--
-- Name: idx_domain_batches_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_domain_batches_campaign ON public.domain_generation_batches USING btree (campaign_id);


--
-- Name: idx_domain_batches_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_domain_batches_status ON public.domain_generation_batches USING btree (status);


--
-- Name: idx_domain_batches_worker; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_domain_batches_worker ON public.domain_generation_batches USING btree (assigned_worker_id);


--
-- Name: idx_domain_config_states_atomic; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_domain_config_states_atomic ON public.domain_generation_config_states USING btree (config_hash, version, last_offset);


--
-- Name: idx_domain_config_states_version; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_domain_config_states_version ON public.domain_generation_config_states USING btree (config_hash, version);


--
-- Name: idx_domain_gen_offset; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_domain_gen_offset ON public.domain_generation_campaign_params USING btree (current_offset);


--
-- Name: idx_domain_gen_params_campaign_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_domain_gen_params_campaign_id ON public.domain_generation_params USING btree (campaign_id);


--
-- Name: idx_event_store_aggregate; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_event_store_aggregate ON public.event_store USING btree (aggregate_id, stream_position);


--
-- Name: idx_event_store_global_position; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_event_store_global_position ON public.event_store USING btree (global_position);


--
-- Name: idx_event_store_type_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_event_store_type_time ON public.event_store USING btree (event_type, occurred_at DESC);


--
-- Name: idx_generated_domains_campaign_created; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_generated_domains_campaign_created ON public.generated_domains USING btree (domain_generation_campaign_id, generated_at);


--
-- Name: idx_generated_domains_campaign_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_generated_domains_campaign_id ON public.generated_domains USING btree (domain_generation_campaign_id);


--
-- Name: idx_generated_domains_domain_name_tld; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_generated_domains_domain_name_tld ON public.generated_domains USING btree (domain_name, tld) WHERE (tld IS NOT NULL);


--
-- Name: idx_generated_domains_keyword_search; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_generated_domains_keyword_search ON public.generated_domains USING gin (to_tsvector('english'::regconfig, domain_name));


--
-- Name: idx_generated_domains_name; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_generated_domains_name ON public.generated_domains USING btree (domain_name);


--
-- Name: idx_generated_domains_offset; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_generated_domains_offset ON public.generated_domains USING btree (domain_generation_campaign_id, offset_index);


--
-- Name: idx_generated_domains_offset_index; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_generated_domains_offset_index ON public.generated_domains USING btree (domain_generation_campaign_id, offset_index) WHERE (offset_index >= 0);


--
-- Name: idx_http_keyword_params_campaign_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_keyword_params_campaign_id ON public.http_keyword_params USING btree (campaign_id);


--
-- Name: idx_http_keyword_params_source_campaign_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_keyword_params_source_campaign_id ON public.http_keyword_params USING btree (source_campaign_id);


--
-- Name: idx_http_keyword_results_dns_result_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_keyword_results_dns_result_id ON public.http_keyword_results USING btree (dns_result_id);


--
-- Name: idx_http_results_bulk_ops; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_results_bulk_ops ON public.http_keyword_results USING btree (http_keyword_campaign_id, validation_status, created_at);


--
-- Name: idx_http_results_campaign_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_results_campaign_id ON public.http_keyword_results USING btree (http_keyword_campaign_id);


--
-- Name: idx_http_results_domain_name; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_results_domain_name ON public.http_keyword_results USING btree (domain_name);


--
-- Name: idx_http_results_errors; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_results_errors ON public.http_keyword_results USING btree (http_keyword_campaign_id, validation_status) WHERE (validation_status = ANY (ARRAY['failed'::text, 'error'::text]));


--
-- Name: idx_http_results_keywords; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_results_keywords ON public.http_keyword_results USING btree (http_keyword_campaign_id, found_keywords_from_sets);


--
-- Name: idx_http_results_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_results_status ON public.http_keyword_results USING btree (validation_status);


--
-- Name: idx_http_results_status_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_http_results_status_time ON public.http_keyword_results USING btree (validation_status, last_checked_at);


--
-- Name: idx_index_usage_efficiency; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_index_usage_efficiency ON public.index_usage_analytics USING btree (index_efficiency_pct);


--
-- Name: idx_index_usage_frequency; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_index_usage_frequency ON public.index_usage_analytics USING btree (usage_frequency);


--
-- Name: idx_index_usage_name; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_index_usage_name ON public.index_usage_analytics USING btree (index_name);


--
-- Name: idx_index_usage_table; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_index_usage_table ON public.index_usage_analytics USING btree (schema_name, table_name);


--
-- Name: idx_keyword_rules_keyword_set; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_keyword_rules_keyword_set ON public.keyword_rules USING btree (keyword_set_id);


--
-- Name: idx_keyword_rules_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_keyword_rules_type ON public.keyword_rules USING btree (rule_type);


--
-- Name: idx_memory_allocations_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_allocations_campaign ON public.memory_allocations USING btree (campaign_id);


--
-- Name: idx_memory_allocations_created; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_allocations_created ON public.memory_allocations USING btree (created_at);


--
-- Name: idx_memory_allocations_leaked; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_allocations_leaked ON public.memory_allocations USING btree (memory_leaked_bytes) WHERE (memory_leaked_bytes > 0);


--
-- Name: idx_memory_allocations_operation; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_allocations_operation ON public.memory_allocations USING btree (operation_id);


--
-- Name: idx_memory_allocations_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_allocations_type ON public.memory_allocations USING btree (operation_type);


--
-- Name: idx_memory_leak_detected; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_leak_detected ON public.memory_leak_detection USING btree (detected_at DESC);


--
-- Name: idx_memory_leak_resolved; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_leak_resolved ON public.memory_leak_detection USING btree (resolved);


--
-- Name: idx_memory_leak_service; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_leak_service ON public.memory_leak_detection USING btree (service_name);


--
-- Name: idx_memory_leak_severity; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_leak_severity ON public.memory_leak_detection USING btree (severity);


--
-- Name: idx_memory_leak_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_leak_type ON public.memory_leak_detection USING btree (leak_type);


--
-- Name: idx_memory_metrics_component; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_metrics_component ON public.memory_metrics USING btree (component);


--
-- Name: idx_memory_metrics_efficiency; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_metrics_efficiency ON public.memory_metrics USING btree (efficiency_score);


--
-- Name: idx_memory_metrics_memory_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_metrics_memory_type ON public.memory_metrics USING btree (memory_type);


--
-- Name: idx_memory_metrics_recorded; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_metrics_recorded ON public.memory_metrics USING btree (recorded_at);


--
-- Name: idx_memory_metrics_service; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_metrics_service ON public.memory_metrics USING btree (service_name);


--
-- Name: idx_memory_metrics_service_recorded; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_metrics_service_recorded ON public.memory_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_memory_metrics_service_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_metrics_service_time ON public.memory_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_memory_metrics_state; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_metrics_state ON public.memory_metrics USING btree (memory_state);


--
-- Name: idx_memory_metrics_utilization; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_metrics_utilization ON public.memory_metrics USING btree (memory_utilization_pct);


--
-- Name: idx_memory_optimization_implemented; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_optimization_implemented ON public.memory_optimization_recommendations USING btree (implemented);


--
-- Name: idx_memory_optimization_priority; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_optimization_priority ON public.memory_optimization_recommendations USING btree (implementation_priority);


--
-- Name: idx_memory_optimization_service; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_optimization_service ON public.memory_optimization_recommendations USING btree (service_name);


--
-- Name: idx_memory_pools_efficiency; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_pools_efficiency ON public.memory_pools USING btree (efficiency_score);


--
-- Name: idx_memory_pools_service; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_pools_service ON public.memory_pools USING btree (service_name);


--
-- Name: idx_memory_pools_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_memory_pools_type ON public.memory_pools USING btree (pool_type);


--
-- Name: idx_perf_opt_improvement; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_perf_opt_improvement ON public.performance_optimizations USING btree (improvement_pct);


--
-- Name: idx_perf_opt_service; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_perf_opt_service ON public.performance_optimizations USING btree (target_service);


--
-- Name: idx_perf_opt_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_perf_opt_type ON public.performance_optimizations USING btree (optimization_type);


--
-- Name: idx_personas_active; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_personas_active ON public.personas USING btree (is_enabled, persona_type);


--
-- Name: idx_personas_dns_config; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_personas_dns_config ON public.personas USING btree (persona_type, is_enabled) WHERE (persona_type = 'dns'::text);


--
-- Name: idx_personas_http_config; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_personas_http_config ON public.personas USING btree (persona_type, is_enabled) WHERE (persona_type = 'http'::text);


--
-- Name: idx_personas_is_enabled; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_personas_is_enabled ON public.personas USING btree (is_enabled);


--
-- Name: idx_personas_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_personas_type ON public.personas USING btree (persona_type);


--
-- Name: idx_projections_name_aggregate; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_projections_name_aggregate ON public.event_projections USING btree (projection_name, aggregate_id);


--
-- Name: idx_proxies_enabled; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_proxies_enabled ON public.proxies USING btree (is_enabled);


--
-- Name: idx_proxies_healthy; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_proxies_healthy ON public.proxies USING btree (is_healthy);


--
-- Name: idx_proxies_is_enabled; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_proxies_is_enabled ON public.proxies USING btree (is_enabled);


--
-- Name: idx_proxy_pool_memberships_pool; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_proxy_pool_memberships_pool ON public.proxy_pool_memberships USING btree (pool_id);


--
-- Name: idx_proxy_pool_memberships_proxy; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_proxy_pool_memberships_proxy ON public.proxy_pool_memberships USING btree (proxy_id);


--
-- Name: idx_proxy_pools_enabled; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_proxy_pools_enabled ON public.proxy_pools USING btree (is_enabled);


--
-- Name: idx_query_optimization_hash; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_optimization_hash ON public.query_optimization_recommendations USING btree (query_hash);


--
-- Name: idx_query_optimization_implemented; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_optimization_implemented ON public.query_optimization_recommendations USING btree (implemented);


--
-- Name: idx_query_optimization_priority; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_optimization_priority ON public.query_optimization_recommendations USING btree (implementation_priority);


--
-- Name: idx_query_optimization_query_hash; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_optimization_query_hash ON public.query_optimization_recommendations USING btree (query_hash);


--
-- Name: idx_query_optimization_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_optimization_status ON public.query_optimization_recommendations USING btree (status);


--
-- Name: idx_query_optimization_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_optimization_type ON public.query_optimization_recommendations USING btree (recommendation_type);


--
-- Name: idx_query_performance_campaign_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_performance_campaign_id ON public.query_performance_metrics USING btree (campaign_id);


--
-- Name: idx_query_performance_executed; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_performance_executed ON public.query_performance_metrics USING btree (executed_at);


--
-- Name: idx_query_performance_execution_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_performance_execution_time ON public.query_performance_metrics USING btree (execution_time_ms);


--
-- Name: idx_query_performance_hash; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_performance_hash ON public.query_performance_metrics USING btree (query_hash);


--
-- Name: idx_query_performance_optimization_score; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_performance_optimization_score ON public.query_performance_metrics USING btree (optimization_score);


--
-- Name: idx_query_performance_performance_category; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_performance_performance_category ON public.query_performance_metrics USING btree (performance_category);


--
-- Name: idx_query_performance_service_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_performance_service_campaign ON public.query_performance_metrics USING btree (service_name, campaign_type);


--
-- Name: idx_query_performance_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_query_performance_type ON public.query_performance_metrics USING btree (query_type);


--
-- Name: idx_refactor_timeline; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_refactor_timeline ON public.architecture_refactor_log USING btree (implemented_at DESC);


--
-- Name: idx_resource_locks_expires; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_resource_locks_expires ON public.resource_locks USING btree (expires_at);


--
-- Name: idx_resource_locks_holder; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_resource_locks_holder ON public.resource_locks USING btree (lock_holder);


--
-- Name: idx_resource_locks_resource; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_resource_locks_resource ON public.resource_locks USING btree (resource_type, resource_id);


--
-- Name: idx_resource_optimization_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_resource_optimization_campaign ON public.resource_optimization_actions USING btree (campaign_type, campaign_id);


--
-- Name: idx_resource_optimization_service_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_resource_optimization_service_time ON public.resource_optimization_actions USING btree (service_name, executed_at DESC);


--
-- Name: idx_resource_utilization_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_resource_utilization_campaign ON public.resource_utilization_metrics USING btree (campaign_type, campaign_id);


--
-- Name: idx_resource_utilization_efficiency; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_resource_utilization_efficiency ON public.resource_utilization_metrics USING btree (efficiency_score);


--
-- Name: idx_resource_utilization_service_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_resource_utilization_service_time ON public.resource_utilization_metrics USING btree (service_name, recorded_at DESC);


--
-- Name: idx_resource_utilization_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_resource_utilization_type ON public.resource_utilization_metrics USING btree (resource_type);


--
-- Name: idx_response_metrics_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_metrics_campaign ON public.response_time_metrics USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_response_metrics_endpoint_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_metrics_endpoint_time ON public.response_time_metrics USING btree (endpoint_path, recorded_at);


--
-- Name: idx_response_metrics_slow_requests; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_metrics_slow_requests ON public.response_time_metrics USING btree (response_time_ms) WHERE (response_time_ms > (1000)::numeric);


--
-- Name: idx_response_metrics_user_endpoint; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_metrics_user_endpoint ON public.response_time_metrics USING btree (user_id, endpoint_path);


--
-- Name: idx_response_optimization_endpoint; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_optimization_endpoint ON public.response_optimization_recommendations USING btree (endpoint_path);


--
-- Name: idx_response_optimization_priority; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_optimization_priority ON public.response_optimization_recommendations USING btree (priority, implemented);


--
-- Name: idx_response_time_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_campaign ON public.response_time_metrics USING btree (campaign_id);


--
-- Name: idx_response_time_endpoint; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_endpoint ON public.response_time_metrics USING btree (endpoint_path);


--
-- Name: idx_response_time_history_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_history_campaign ON public.response_time_history USING btree (campaign_type);


--
-- Name: idx_response_time_history_service_window; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_history_service_window ON public.response_time_history USING btree (service_name, window_start DESC);


--
-- Name: idx_response_time_metrics_endpoint; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_metrics_endpoint ON public.response_time_metrics USING btree (endpoint_path);


--
-- Name: idx_response_time_metrics_response_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_metrics_response_time ON public.response_time_metrics USING btree (response_time_ms);


--
-- Name: idx_response_time_ms; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_ms ON public.response_time_metrics USING btree (response_time_ms);


--
-- Name: idx_response_time_operation; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_operation ON public.response_time_metrics USING btree (http_method);


--
-- Name: idx_response_time_recorded; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_recorded ON public.response_time_metrics USING btree (recorded_at);


--
-- Name: idx_response_time_service; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_service ON public.response_time_metrics USING btree (service_name);


--
-- Name: idx_response_time_targets_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_targets_campaign ON public.response_time_targets USING btree (campaign_type);


--
-- Name: idx_response_time_targets_service; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_response_time_targets_service ON public.response_time_targets USING btree (service_name);


--
-- Name: idx_security_events_created; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_security_events_created ON public.security_events USING btree (created_at);


--
-- Name: idx_security_events_result; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_security_events_result ON public.security_events USING btree (authorization_result);


--
-- Name: idx_security_events_risk; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_security_events_risk ON public.security_events USING btree (risk_score DESC);


--
-- Name: idx_security_events_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_security_events_type ON public.security_events USING btree (event_type);


--
-- Name: idx_security_events_user; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_security_events_user ON public.security_events USING btree (user_id);


--
-- Name: idx_service_metrics_coupling; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_service_metrics_coupling ON public.service_architecture_metrics USING btree (coupling_score DESC) WHERE (coupling_score > 50.0);


--
-- Name: idx_service_metrics_pattern; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_service_metrics_pattern ON public.service_architecture_metrics USING btree (architecture_pattern, service_name);


--
-- Name: idx_slow_query_execution_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_slow_query_execution_time ON public.slow_query_log USING btree (execution_time_ms);


--
-- Name: idx_slow_query_hash; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_slow_query_hash ON public.slow_query_log USING btree (query_hash);


--
-- Name: idx_slow_query_logged; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_slow_query_logged ON public.slow_query_log USING btree (logged_at);


--
-- Name: idx_slow_query_severity; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_slow_query_severity ON public.slow_query_log USING btree (severity);


--
-- Name: idx_state_events_correlation; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_state_events_correlation ON public.state_events USING btree (correlation_id);


--
-- Name: idx_state_events_version; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_state_events_version ON public.state_events USING btree (entity_id, state_version);


--
-- Name: idx_state_snapshots_entity; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_state_snapshots_entity ON public.state_snapshots USING btree (entity_id, entity_type);


--
-- Name: idx_state_snapshots_version; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_state_snapshots_version ON public.state_snapshots USING btree (entity_id, snapshot_version DESC);


--
-- Name: idx_suspicious_alerts_created_at; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_suspicious_alerts_created_at ON public.suspicious_input_alerts USING btree (created_at);


--
-- Name: idx_suspicious_alerts_endpoint; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_suspicious_alerts_endpoint ON public.suspicious_input_alerts USING btree (endpoint_pattern);


--
-- Name: idx_suspicious_alerts_pattern_name; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_suspicious_alerts_pattern_name ON public.suspicious_input_alerts USING btree (pattern_name);


--
-- Name: idx_suspicious_alerts_severity; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_suspicious_alerts_severity ON public.suspicious_input_alerts USING btree (severity);


--
-- Name: idx_suspicious_alerts_user_id; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_suspicious_alerts_user_id ON public.suspicious_input_alerts USING btree (user_id);


--
-- Name: idx_system_alerts_created; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_system_alerts_created ON public.system_alerts USING btree (created_at);


--
-- Name: idx_system_alerts_severity; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_system_alerts_severity ON public.system_alerts USING btree (severity);


--
-- Name: idx_system_alerts_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_system_alerts_type ON public.system_alerts USING btree (alert_type);


--
-- Name: idx_validation_rules_endpoint; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_validation_rules_endpoint ON public.input_validation_rules USING btree (endpoint_pattern);


--
-- Name: idx_validation_rules_field; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_validation_rules_field ON public.input_validation_rules USING btree (field_name);


--
-- Name: idx_validation_rules_method; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_validation_rules_method ON public.input_validation_rules USING btree (http_method);


--
-- Name: idx_validation_violations_created; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_validation_violations_created ON public.input_validation_violations USING btree (created_at);


--
-- Name: idx_validation_violations_endpoint; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_validation_violations_endpoint ON public.input_validation_violations USING btree (endpoint_pattern);


--
-- Name: idx_validation_violations_field; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_validation_violations_field ON public.input_validation_violations USING btree (field_name);


--
-- Name: idx_validation_violations_type; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_validation_violations_type ON public.input_validation_violations USING btree (violation_type);


--
-- Name: idx_validation_violations_user; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_validation_violations_user ON public.input_validation_violations USING btree (user_id);


--
-- Name: idx_versioned_configs_checksum; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_versioned_configs_checksum ON public.versioned_configs USING btree (checksum);


--
-- Name: idx_versioned_configs_created_at; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_versioned_configs_created_at ON public.versioned_configs USING btree (created_at);


--
-- Name: idx_versioned_configs_type_key; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_versioned_configs_type_key ON public.versioned_configs USING btree (config_type, config_key);


--
-- Name: idx_versioned_configs_updated_at; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_versioned_configs_updated_at ON public.versioned_configs USING btree (updated_at);


--
-- Name: idx_versioned_configs_validation; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_versioned_configs_validation ON public.versioned_configs USING btree (config_type, config_key, version, checksum);


--
-- Name: idx_versioned_configs_version; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_versioned_configs_version ON public.versioned_configs USING btree (version);


--
-- Name: idx_worker_coordination_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_worker_coordination_campaign ON public.worker_coordination USING btree (campaign_id);


--
-- Name: idx_worker_coordination_heartbeat; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_worker_coordination_heartbeat ON public.worker_coordination USING btree (last_heartbeat);


--
-- Name: idx_worker_coordination_status; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_worker_coordination_status ON public.worker_coordination USING btree (status);


--
-- Name: idx_worker_pool_metrics_campaign; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_worker_pool_metrics_campaign ON public.worker_pool_metrics USING btree (campaign_type);


--
-- Name: idx_worker_pool_metrics_pool_time; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_worker_pool_metrics_pool_time ON public.worker_pool_metrics USING btree (pool_name, recorded_at DESC);


--
-- Name: idx_worker_pool_metrics_service; Type: INDEX; Schema: public; Owner: domainflow
--

CREATE INDEX idx_worker_pool_metrics_service ON public.worker_pool_metrics USING btree (service_name);


--
-- Name: roles set_timestamp_auth_roles; Type: TRIGGER; Schema: auth; Owner: domainflow
--

CREATE TRIGGER set_timestamp_auth_roles BEFORE UPDATE ON auth.roles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: users set_timestamp_auth_users; Type: TRIGGER; Schema: auth; Owner: domainflow
--

CREATE TRIGGER set_timestamp_auth_users BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: sessions trigger_session_fingerprint; Type: TRIGGER; Schema: auth; Owner: domainflow
--

CREATE TRIGGER trigger_session_fingerprint BEFORE INSERT OR UPDATE ON auth.sessions FOR EACH ROW EXECUTE FUNCTION auth.update_session_fingerprint();


--
-- Name: keyword_rules keyword_rules_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER keyword_rules_updated_at_trigger BEFORE UPDATE ON public.keyword_rules FOR EACH ROW EXECUTE FUNCTION public.update_keyword_rules_updated_at();


--
-- Name: proxies proxies_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER proxies_updated_at_trigger BEFORE UPDATE ON public.proxies FOR EACH ROW EXECUTE FUNCTION public.update_proxies_updated_at();


--
-- Name: proxy_pools proxy_pools_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER proxy_pools_updated_at_trigger BEFORE UPDATE ON public.proxy_pools FOR EACH ROW EXECUTE FUNCTION public.update_proxy_pools_updated_at();


--
-- Name: campaign_jobs set_timestamp_campaign_jobs; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER set_timestamp_campaign_jobs BEFORE UPDATE ON public.campaign_jobs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: campaigns set_timestamp_campaigns; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER set_timestamp_campaigns BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: keyword_sets set_timestamp_keyword_sets; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER set_timestamp_keyword_sets BEFORE UPDATE ON public.keyword_sets FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: personas set_timestamp_personas; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER set_timestamp_personas BEFORE UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: proxies set_timestamp_proxies; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER set_timestamp_proxies BEFORE UPDATE ON public.proxies FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: campaigns trg_campaigns_numeric_safety; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER trg_campaigns_numeric_safety BEFORE INSERT OR UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.fn_validate_numeric_safety();


--
-- Name: campaign_state_transitions trigger_update_state_event_processing; Type: TRIGGER; Schema: public; Owner: domainflow
--

CREATE TRIGGER trigger_update_state_event_processing AFTER UPDATE ON public.campaign_state_transitions FOR EACH ROW EXECUTE FUNCTION public.update_state_event_processing_status();


--
-- Name: auth_audit_log auth_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.auth_audit_log
    ADD CONSTRAINT auth_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES auth.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: domainflow
--

ALTER TABLE ONLY auth.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: authorization_decisions authorization_decisions_security_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.authorization_decisions
    ADD CONSTRAINT authorization_decisions_security_event_id_fkey FOREIGN KEY (security_event_id) REFERENCES public.security_events(id);


--
-- Name: campaign_access_grants campaign_access_grants_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_access_grants campaign_access_grants_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: campaign_access_grants campaign_access_grants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_access_grants
    ADD CONSTRAINT campaign_access_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: campaign_jobs campaign_jobs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_jobs
    ADD CONSTRAINT campaign_jobs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_events campaign_state_events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_events
    ADD CONSTRAINT campaign_state_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_snapshots campaign_state_snapshots_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_snapshots
    ADD CONSTRAINT campaign_state_snapshots_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_transitions campaign_state_transitions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_state_transitions campaign_state_transitions_state_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.campaign_state_transitions
    ADD CONSTRAINT campaign_state_transitions_state_event_id_fkey FOREIGN KEY (state_event_id) REFERENCES public.campaign_state_events(id) ON DELETE CASCADE;


--
-- Name: dns_validation_params dns_validation_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.dns_validation_params
    ADD CONSTRAINT dns_validation_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: dns_validation_params dns_validation_params_source_generation_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.dns_validation_params
    ADD CONSTRAINT dns_validation_params_source_generation_campaign_id_fkey FOREIGN KEY (source_generation_campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: dns_validation_results dns_validation_results_dns_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_dns_campaign_id_fkey FOREIGN KEY (dns_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: dns_validation_results dns_validation_results_generated_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_generated_domain_id_fkey FOREIGN KEY (generated_domain_id) REFERENCES public.generated_domains(id) ON DELETE SET NULL;


--
-- Name: dns_validation_results dns_validation_results_validated_by_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.dns_validation_results
    ADD CONSTRAINT dns_validation_results_validated_by_persona_id_fkey FOREIGN KEY (validated_by_persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;


--
-- Name: domain_generation_batches domain_generation_batches_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.domain_generation_batches
    ADD CONSTRAINT domain_generation_batches_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: domain_generation_campaign_params domain_generation_campaign_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.domain_generation_campaign_params
    ADD CONSTRAINT domain_generation_campaign_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: domain_generation_params domain_generation_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.domain_generation_params
    ADD CONSTRAINT domain_generation_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: generated_domains generated_domains_domain_generation_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.generated_domains
    ADD CONSTRAINT generated_domains_domain_generation_campaign_id_fkey FOREIGN KEY (domain_generation_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_campaign_params http_keyword_campaign_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_campaign_params
    ADD CONSTRAINT http_keyword_campaign_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_campaign_params http_keyword_campaign_params_source_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_campaign_params
    ADD CONSTRAINT http_keyword_campaign_params_source_campaign_id_fkey FOREIGN KEY (source_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_params http_keyword_params_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_params
    ADD CONSTRAINT http_keyword_params_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_params http_keyword_params_source_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_params
    ADD CONSTRAINT http_keyword_params_source_campaign_id_fkey FOREIGN KEY (source_campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_dns_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_dns_result_id_fkey FOREIGN KEY (dns_result_id) REFERENCES public.dns_validation_results(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_http_keyword_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_http_keyword_campaign_id_fkey FOREIGN KEY (http_keyword_campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: http_keyword_results http_keyword_results_used_proxy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_used_proxy_id_fkey FOREIGN KEY (used_proxy_id) REFERENCES public.proxies(id) ON DELETE SET NULL;


--
-- Name: http_keyword_results http_keyword_results_validated_by_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.http_keyword_results
    ADD CONSTRAINT http_keyword_results_validated_by_persona_id_fkey FOREIGN KEY (validated_by_persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;


--
-- Name: keyword_rules keyword_rules_keyword_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.keyword_rules
    ADD CONSTRAINT keyword_rules_keyword_set_id_fkey FOREIGN KEY (keyword_set_id) REFERENCES public.keyword_sets(id) ON DELETE CASCADE;


--
-- Name: proxy_pool_memberships proxy_pool_memberships_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.proxy_pool_memberships
    ADD CONSTRAINT proxy_pool_memberships_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.proxy_pools(id) ON DELETE CASCADE;


--
-- Name: proxy_pool_memberships proxy_pool_memberships_proxy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.proxy_pool_memberships
    ADD CONSTRAINT proxy_pool_memberships_proxy_id_fkey FOREIGN KEY (proxy_id) REFERENCES public.proxies(id) ON DELETE CASCADE;


--
-- Name: security_events security_events_audit_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_audit_log_id_fkey FOREIGN KEY (audit_log_id) REFERENCES public.audit_logs(id);


--
-- Name: worker_coordination worker_coordination_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: domainflow
--

ALTER TABLE ONLY public.worker_coordination
    ADD CONSTRAINT worker_coordination_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: domainflow
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

