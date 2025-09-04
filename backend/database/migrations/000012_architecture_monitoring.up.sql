-- Architecture Monitoring Schema
-- Based on Go models: ServiceArchitectureMetric, ServiceDependency, ArchitectureRefactorLog, CommunicationPattern, ServiceCapacityMetric

-- Create service types enum
CREATE TYPE service_type_enum AS ENUM (
    'api_server',
    'web_server',
    'background_worker',
    'database',
    'cache',
    'message_queue',
    'load_balancer',
    'proxy',
    'auth_service',
    'monitoring',
    'logging',
    'file_storage',
    'cdn',
    'notification_service',
    'analytics_service'
);

-- Create dependency types enum
CREATE TYPE dependency_type_enum AS ENUM (
    'synchronous',
    'asynchronous',
    'database',
    'cache',
    'queue',
    'http_api',
    'grpc',
    'websocket',
    'file_system',
    'external_api',
    'third_party_service'
);

-- Create communication protocol enum
CREATE TYPE communication_protocol_enum AS ENUM (
    'http',
    'https',
    'grpc',
    'websocket',
    'tcp',
    'udp',
    'message_queue',
    'database',
    'file_system',
    'redis',
    'sql'
);

-- Create refactor types enum
CREATE TYPE refactor_type_enum AS ENUM (
    'service_split',
    'service_merge',
    'api_versioning',
    'database_migration',
    'dependency_injection',
    'interface_change',
    'data_structure_change',
    'performance_optimization',
    'security_enhancement',
    'monitoring_improvement',
    'configuration_change',
    'deployment_strategy',
    'scaling_modification'
);

-- Service architecture metrics table for tracking service health and performance
CREATE TABLE IF NOT EXISTS service_architecture_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    service_type service_type_enum NOT NULL,
    service_version VARCHAR(50),
    
    -- Health and availability metrics
    uptime_seconds BIGINT CHECK (uptime_seconds >= 0),
    availability_percent DECIMAL(5,2) CHECK (availability_percent BETWEEN 0 AND 100),
    health_score DECIMAL(5,2) CHECK (health_score BETWEEN 0 AND 100),
    
    -- Performance metrics
    avg_response_time_ms DECIMAL(10,3) CHECK (avg_response_time_ms >= 0),
    p95_response_time_ms DECIMAL(10,3) CHECK (p95_response_time_ms >= 0),
    p99_response_time_ms DECIMAL(10,3) CHECK (p99_response_time_ms >= 0),
    throughput_requests_per_second DECIMAL(10,2) CHECK (throughput_requests_per_second >= 0),
    
    -- Resource utilization
    cpu_usage_percent DECIMAL(5,2) CHECK (cpu_usage_percent BETWEEN 0 AND 100),
    memory_usage_percent DECIMAL(5,2) CHECK (memory_usage_percent BETWEEN 0 AND 100),
    disk_usage_percent DECIMAL(5,2) CHECK (disk_usage_percent BETWEEN 0 AND 100),
    network_usage_mbps DECIMAL(10,2) CHECK (network_usage_mbps >= 0),
    
    -- Error and reliability metrics
    error_rate_percent DECIMAL(5,2) CHECK (error_rate_percent BETWEEN 0 AND 100),
    crash_count INTEGER NOT NULL DEFAULT 0 CHECK (crash_count >= 0),
    restart_count INTEGER NOT NULL DEFAULT 0 CHECK (restart_count >= 0),
    
    -- Capacity and scaling
    current_instances INTEGER NOT NULL DEFAULT 1 CHECK (current_instances > 0),
    max_instances INTEGER CHECK (max_instances > 0),
    auto_scaling_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    scale_events_count INTEGER NOT NULL DEFAULT 0 CHECK (scale_events_count >= 0),
    
    -- Dependencies and complexity
    dependency_count INTEGER NOT NULL DEFAULT 0 CHECK (dependency_count >= 0),
    complexity_score DECIMAL(5,2) CHECK (complexity_score >= 0),
    technical_debt_score DECIMAL(5,2) CHECK (technical_debt_score >= 0),
    
    -- Environment and deployment
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    deployment_id VARCHAR(100),
    build_version VARCHAR(100),
    
    -- Time tracking
    measurement_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    measurement_period_minutes INTEGER NOT NULL DEFAULT 5 CHECK (measurement_period_minutes > 0),
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    
    -- Alerts and notifications
    alert_threshold_breached BOOLEAN NOT NULL DEFAULT FALSE,
    alert_details JSONB,
    
    CONSTRAINT valid_service_architecture_metrics_instances CHECK (
        max_instances IS NULL OR current_instances <= max_instances
    )
);

-- Service dependencies table for tracking inter-service relationships
CREATE TABLE IF NOT EXISTS service_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_service VARCHAR(100) NOT NULL,
    target_service VARCHAR(100) NOT NULL,
    dependency_type dependency_type_enum NOT NULL,
    
    -- Dependency characteristics
    is_critical BOOLEAN NOT NULL DEFAULT FALSE,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    timeout_ms INTEGER CHECK (timeout_ms > 0),
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    circuit_breaker_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Performance and reliability
    success_rate_percent DECIMAL(5,2) CHECK (success_rate_percent BETWEEN 0 AND 100),
    avg_latency_ms DECIMAL(10,3) CHECK (avg_latency_ms >= 0),
    error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    total_requests INTEGER NOT NULL DEFAULT 0 CHECK (total_requests >= 0),
    
    -- Configuration and versioning
    api_version VARCHAR(20),
    protocol_version VARCHAR(20),
    configuration JSONB,
    
    -- Health monitoring
    last_health_check TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    health_check_interval_seconds INTEGER DEFAULT 30 CHECK (health_check_interval_seconds > 0),
    
    -- Discovery and routing
    discovery_method VARCHAR(50) DEFAULT 'static',
    load_balancing_strategy VARCHAR(50),
    endpoints JSONB, -- Array of endpoint configurations
    
    -- Environment and lifecycle
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    
    -- Prevent self-dependencies
    CONSTRAINT no_self_dependency CHECK (source_service != target_service),
    
    -- Unique constraint for service pair and dependency type
    UNIQUE(source_service, target_service, dependency_type, environment)
);

-- Architecture refactor log table for tracking architectural changes
CREATE TABLE IF NOT EXISTS architecture_refactor_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refactor_type refactor_type_enum NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- Services affected
    services_affected TEXT[] NOT NULL,
    dependencies_changed TEXT[],
    apis_modified TEXT[],
    
    -- Planning and execution
    planned_start_date TIMESTAMPTZ,
    actual_start_date TIMESTAMPTZ,
    planned_end_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    
    -- Ownership and approval
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    team_responsible VARCHAR(100),
    
    -- Risk assessment
    risk_level VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    impact_assessment TEXT,
    rollback_plan TEXT,
    
    -- Success metrics
    success_criteria JSONB,
    performance_impact JSONB,
    business_impact TEXT,
    
    -- Status and completion
    status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'testing', 'completed', 'rolled_back', 'cancelled')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    
    -- Documentation and communication
    documentation_links TEXT[],
    communication_plan TEXT,
    stakeholder_notifications JSONB,
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    
    -- Lessons learned
    lessons_learned TEXT,
    follow_up_actions TEXT[],
    
    -- Time tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_architecture_refactor_dates CHECK (
        planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date
    ),
    CONSTRAINT valid_architecture_refactor_actual_dates CHECK (
        actual_end_date IS NULL OR actual_start_date IS NULL OR actual_end_date >= actual_start_date
    )
);

-- Communication patterns table for tracking service communication
CREATE TABLE IF NOT EXISTS communication_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_service VARCHAR(100) NOT NULL,
    target_service VARCHAR(100) NOT NULL,
    protocol communication_protocol_enum NOT NULL,
    
    -- Pattern characteristics
    pattern_name VARCHAR(100),
    is_synchronous BOOLEAN NOT NULL DEFAULT TRUE,
    is_bidirectional BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Traffic and volume
    requests_per_minute DECIMAL(10,2) CHECK (requests_per_minute >= 0),
    avg_payload_size_bytes INTEGER CHECK (avg_payload_size_bytes >= 0),
    peak_requests_per_minute DECIMAL(10,2) CHECK (peak_requests_per_minute >= 0),
    
    -- Performance characteristics
    avg_latency_ms DECIMAL(10,3) CHECK (avg_latency_ms >= 0),
    p95_latency_ms DECIMAL(10,3) CHECK (p95_latency_ms >= 0),
    p99_latency_ms DECIMAL(10,3) CHECK (p99_latency_ms >= 0),
    timeout_ms INTEGER CHECK (timeout_ms > 0),
    
    -- Reliability and error handling
    success_rate_percent DECIMAL(5,2) CHECK (success_rate_percent BETWEEN 0 AND 100),
    retry_strategy JSONB,
    circuit_breaker_config JSONB,
    fallback_strategy TEXT,
    
    -- Security and authentication
    authentication_method VARCHAR(50),
    encryption_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    authorization_required BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Monitoring and observability
    tracing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    metrics_collected JSONB,
    logging_level VARCHAR(20) DEFAULT 'info',
    
    -- API and contract details
    api_contract JSONB,
    schema_version VARCHAR(20),
    content_type VARCHAR(100),
    
    -- Environment and lifecycle
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    first_observed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_observed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observation_count INTEGER NOT NULL DEFAULT 1 CHECK (observation_count > 0),
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    
    -- Pattern analysis
    pattern_health_score DECIMAL(5,2) CHECK (pattern_health_score BETWEEN 0 AND 100),
    optimization_suggestions JSONB,
    
    CONSTRAINT no_self_communication CHECK (source_service != target_service)
);

-- Service capacity metrics table for tracking service capacity and limits
CREATE TABLE IF NOT EXISTS service_capacity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    service_type service_type_enum NOT NULL,
    
    -- Capacity limits and current usage
    max_concurrent_requests INTEGER CHECK (max_concurrent_requests > 0),
    current_concurrent_requests INTEGER NOT NULL DEFAULT 0 CHECK (current_concurrent_requests >= 0),
    max_memory_gb DECIMAL(10,2) CHECK (max_memory_gb > 0),
    current_memory_gb DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (current_memory_gb >= 0),
    max_cpu_cores DECIMAL(5,2) CHECK (max_cpu_cores > 0),
    current_cpu_usage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (current_cpu_usage >= 0),
    
    -- Connection and threading limits
    max_database_connections INTEGER CHECK (max_database_connections > 0),
    current_database_connections INTEGER NOT NULL DEFAULT 0 CHECK (current_database_connections >= 0),
    max_thread_pool_size INTEGER CHECK (max_thread_pool_size > 0),
    current_active_threads INTEGER NOT NULL DEFAULT 0 CHECK (current_active_threads >= 0),
    
    -- Queue and buffer capacities
    max_queue_size INTEGER CHECK (max_queue_size > 0),
    current_queue_size INTEGER NOT NULL DEFAULT 0 CHECK (current_queue_size >= 0),
    max_buffer_size_mb DECIMAL(10,2) CHECK (max_buffer_size_mb > 0),
    current_buffer_size_mb DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (current_buffer_size_mb >= 0),
    
    -- Scaling and capacity planning
    scaling_threshold_percent DECIMAL(5,2) DEFAULT 80 CHECK (scaling_threshold_percent BETWEEN 0 AND 100),
    scale_up_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    scale_down_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    auto_scaling_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Performance under load
    degradation_threshold_percent DECIMAL(5,2) DEFAULT 90 CHECK (degradation_threshold_percent BETWEEN 0 AND 100),
    performance_degraded BOOLEAN NOT NULL DEFAULT FALSE,
    circuit_breaker_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Capacity utilization rates
    request_capacity_utilization_percent DECIMAL(5,2) CHECK (request_capacity_utilization_percent BETWEEN 0 AND 100),
    memory_capacity_utilization_percent DECIMAL(5,2) CHECK (memory_capacity_utilization_percent BETWEEN 0 AND 100),
    cpu_capacity_utilization_percent DECIMAL(5,2) CHECK (cpu_capacity_utilization_percent BETWEEN 0 AND 100),
    
    -- Environment and time
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    measurement_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    measurement_window_minutes INTEGER NOT NULL DEFAULT 5 CHECK (measurement_window_minutes > 0),
    
    -- Campaign context
    campaign_id UUID REFERENCES lead_generation_campaigns(id) ON DELETE SET NULL,
    
    -- Alerts and recommendations
    capacity_alert_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    recommendations JSONB,
    
    CONSTRAINT valid_service_capacity_requests CHECK (
        max_concurrent_requests IS NULL OR current_concurrent_requests <= max_concurrent_requests
    ),
    CONSTRAINT valid_service_capacity_memory CHECK (
        max_memory_gb IS NULL OR current_memory_gb <= max_memory_gb
    ),
    CONSTRAINT valid_service_capacity_connections CHECK (
        max_database_connections IS NULL OR current_database_connections <= max_database_connections
    ),
    CONSTRAINT valid_service_capacity_queue CHECK (
        max_queue_size IS NULL OR current_queue_size <= max_queue_size
    )
);

-- Indexes for service architecture metrics
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_service_name ON service_architecture_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_service_type ON service_architecture_metrics(service_type);
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_measurement_timestamp ON service_architecture_metrics(measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_environment ON service_architecture_metrics(environment);
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_health_score ON service_architecture_metrics(health_score);
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_availability_percent ON service_architecture_metrics(availability_percent);
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_campaign_id ON service_architecture_metrics(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_alert_threshold_breached ON service_architecture_metrics(alert_threshold_breached) WHERE alert_threshold_breached = TRUE;

-- Composite indexes for service metrics analysis
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_service_time ON service_architecture_metrics(service_name, measurement_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_service_architecture_metrics_env_health ON service_architecture_metrics(environment, health_score DESC, measurement_timestamp DESC);

-- Indexes for service dependencies
CREATE INDEX IF NOT EXISTS idx_service_dependencies_source_service ON service_dependencies(source_service);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_target_service ON service_dependencies(target_service);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_dependency_type ON service_dependencies(dependency_type);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_is_critical ON service_dependencies(is_critical) WHERE is_critical = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_dependencies_health_status ON service_dependencies(health_status);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_environment ON service_dependencies(environment);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_active ON service_dependencies(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_dependencies_campaign_id ON service_dependencies(campaign_id) WHERE campaign_id IS NOT NULL;

-- Composite indexes for dependency analysis
CREATE INDEX IF NOT EXISTS idx_service_dependencies_source_target ON service_dependencies(source_service, target_service, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_dependencies_critical_unhealthy ON service_dependencies(is_critical, health_status) WHERE is_critical = TRUE AND health_status != 'healthy';

-- Indexes for architecture refactor log
CREATE INDEX IF NOT EXISTS idx_architecture_refactor_log_refactor_type ON architecture_refactor_log(refactor_type);
CREATE INDEX IF NOT EXISTS idx_architecture_refactor_log_status ON architecture_refactor_log(status);
CREATE INDEX IF NOT EXISTS idx_architecture_refactor_log_risk_level ON architecture_refactor_log(risk_level);
CREATE INDEX IF NOT EXISTS idx_architecture_refactor_log_initiated_by ON architecture_refactor_log(initiated_by) WHERE initiated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_architecture_refactor_log_approved_by ON architecture_refactor_log(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_architecture_refactor_log_created_at ON architecture_refactor_log(created_at);
CREATE INDEX IF NOT EXISTS idx_architecture_refactor_log_campaign_id ON architecture_refactor_log(campaign_id) WHERE campaign_id IS NOT NULL;

-- GIN indexes for array columns in refactor log
CREATE INDEX IF NOT EXISTS idx_architecture_refactor_log_services_affected_gin ON architecture_refactor_log USING GIN(services_affected);
CREATE INDEX IF NOT EXISTS idx_architecture_refactor_log_dependencies_changed_gin ON architecture_refactor_log USING GIN(dependencies_changed) WHERE dependencies_changed IS NOT NULL;

-- Indexes for communication patterns
CREATE INDEX IF NOT EXISTS idx_communication_patterns_source_service ON communication_patterns(source_service);
CREATE INDEX IF NOT EXISTS idx_communication_patterns_target_service ON communication_patterns(target_service);
CREATE INDEX IF NOT EXISTS idx_communication_patterns_protocol ON communication_patterns(protocol);
CREATE INDEX IF NOT EXISTS idx_communication_patterns_environment ON communication_patterns(environment);
CREATE INDEX IF NOT EXISTS idx_communication_patterns_last_observed ON communication_patterns(last_observed);
CREATE INDEX IF NOT EXISTS idx_communication_patterns_success_rate_percent ON communication_patterns(success_rate_percent);
CREATE INDEX IF NOT EXISTS idx_communication_patterns_campaign_id ON communication_patterns(campaign_id) WHERE campaign_id IS NOT NULL;

-- Composite indexes for communication analysis
CREATE INDEX IF NOT EXISTS idx_communication_patterns_source_target ON communication_patterns(source_service, target_service, protocol);
CREATE INDEX IF NOT EXISTS idx_communication_patterns_low_success_rate ON communication_patterns(success_rate_percent, last_observed DESC) WHERE success_rate_percent < 95;

-- Indexes for service capacity metrics
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_service_name ON service_capacity_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_service_type ON service_capacity_metrics(service_type);
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_measurement_timestamp ON service_capacity_metrics(measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_environment ON service_capacity_metrics(environment);
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_capacity_alert_triggered ON service_capacity_metrics(capacity_alert_triggered) WHERE capacity_alert_triggered = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_scale_up_triggered ON service_capacity_metrics(scale_up_triggered) WHERE scale_up_triggered = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_performance_degraded ON service_capacity_metrics(performance_degraded) WHERE performance_degraded = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_campaign_id ON service_capacity_metrics(campaign_id) WHERE campaign_id IS NOT NULL;

-- Composite indexes for capacity analysis
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_service_time ON service_capacity_metrics(service_name, measurement_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_service_capacity_metrics_high_utilization ON service_capacity_metrics(request_capacity_utilization_percent DESC, memory_capacity_utilization_percent DESC) WHERE request_capacity_utilization_percent > 80 OR memory_capacity_utilization_percent > 80;