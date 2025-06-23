# **AR-005: SCALABILITY ARCHITECTURE LIMITATIONS - TACTICAL IMPLEMENTATION PLAN**

**Finding ID**: AR-005  
**Phase**: 2D Architecture  
**Priority**: LOW  
**Estimated Effort**: 2-3 days  
**Dependencies**: AR-004 API Design Inconsistencies  

---

## **FINDING OVERVIEW**

### **Problem Statement**
DomainFlow's current architecture exhibits scalability limitations including inefficient horizontal scaling patterns, lack of auto-scaling capabilities, suboptimal load balancing strategies, and insufficient capacity planning mechanisms. These limitations prevent the system from handling traffic spikes efficiently and increase operational costs.

### **Technical Impact**
- **Manual Scaling Operations**: Lack of auto-scaling requires manual intervention during traffic spikes
- **Resource Underutilization**: Poor capacity planning leads to over-provisioned resources
- **Load Distribution Inefficiency**: Uneven load distribution across service instances
- **Single Points of Failure**: Critical services without proper redundancy and failover
- **Performance Degradation**: System performance degrades unpredictably under high load
- **Cost Optimization**: Inefficient resource allocation increases operational costs

### **Integration Points**
- **Performance Monitoring**: Builds on PF-002 response time optimization and PF-003 resource utilization
- **Database Layer**: Leverages PF-001 query optimization for scalable data access
- **Caching Layer**: Integrates with PF-004 multi-layer caching for performance scaling
- **Service Architecture**: Uses AR-001 service standardization framework
- **Communication Patterns**: Builds on AR-002 microservice communication patterns

---

## **POSTGRESQL MIGRATION**

### **Scalability Metrics and Auto-Scaling Schema**
```sql
-- Migration: 20250622_scalability_architecture.up.sql
CREATE TABLE IF NOT EXISTS service_capacity_metrics (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    instance_id VARCHAR(100) NOT NULL,
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0.0,
    memory_usage_percent DECIMAL(5,2) DEFAULT 0.0,
    disk_usage_percent DECIMAL(5,2) DEFAULT 0.0,
    network_io_mbps DECIMAL(10,2) DEFAULT 0.0,
    request_count INTEGER DEFAULT 0,
    active_connections INTEGER DEFAULT 0,
    queue_depth INTEGER DEFAULT 0,
    response_time_p95_ms DECIMAL(8,2) DEFAULT 0.0,
    error_rate_percent DECIMAL(5,2) DEFAULT 0.0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX (service_name, recorded_at DESC),
    INDEX (recorded_at DESC)
);

CREATE TABLE IF NOT EXISTS scaling_policies (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL UNIQUE,
    min_instances INTEGER NOT NULL DEFAULT 1,
    max_instances INTEGER NOT NULL DEFAULT 10,
    target_cpu_percent DECIMAL(5,2) DEFAULT 70.0,
    target_memory_percent DECIMAL(5,2) DEFAULT 80.0,
    target_response_time_ms DECIMAL(8,2) DEFAULT 200.0,
    scale_up_threshold DECIMAL(5,2) DEFAULT 80.0,
    scale_down_threshold DECIMAL(5,2) DEFAULT 30.0,
    scale_up_cooldown_minutes INTEGER DEFAULT 5,
    scale_down_cooldown_minutes INTEGER DEFAULT 10,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scaling_events (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(20) NOT NULL, -- 'scale_up', 'scale_down', 'scale_failed'
    trigger_metric VARCHAR(50) NOT NULL, -- 'cpu', 'memory', 'response_time', 'request_count'
    trigger_value DECIMAL(10,2) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    instances_before INTEGER NOT NULL,
    instances_after INTEGER NOT NULL,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    execution_time_seconds DECIMAL(8,2) DEFAULT 0.0,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX (service_name, occurred_at DESC),
    INDEX (occurred_at DESC)
);

CREATE TABLE IF NOT EXISTS load_balancer_config (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL UNIQUE,
    algorithm VARCHAR(30) NOT NULL DEFAULT 'round_robin', -- 'round_robin', 'weighted', 'least_connections', 'ip_hash'
    health_check_path VARCHAR(200) NOT NULL DEFAULT '/health',
    health_check_interval_seconds INTEGER DEFAULT 30,
    health_check_timeout_seconds INTEGER DEFAULT 5,
    unhealthy_threshold INTEGER DEFAULT 3,
    healthy_threshold INTEGER DEFAULT 2,
    session_affinity BOOLEAN DEFAULT false,
    circuit_breaker_enabled BOOLEAN DEFAULT true,
    max_retries INTEGER DEFAULT 3,
    retry_timeout_seconds INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capacity_planning_forecasts (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    forecast_type VARCHAR(30) NOT NULL, -- 'linear', 'exponential', 'seasonal', 'ml_based'
    time_horizon_days INTEGER NOT NULL,
    predicted_peak_rps DECIMAL(10,2) NOT NULL,
    predicted_avg_cpu DECIMAL(5,2) NOT NULL,
    predicted_avg_memory DECIMAL(5,2) NOT NULL,
    recommended_instances INTEGER NOT NULL,
    confidence_score DECIMAL(5,2) DEFAULT 0.0,
    forecast_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX (service_name, time_horizon_days),
    INDEX (created_at DESC)
);

CREATE TABLE IF NOT EXISTS resource_quotas (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL UNIQUE,
    max_cpu_cores DECIMAL(5,2) NOT NULL,
    max_memory_gb DECIMAL(8,2) NOT NULL,
    max_storage_gb DECIMAL(10,2) NOT NULL,
    max_network_mbps DECIMAL(10,2) NOT NULL,
    max_instances INTEGER NOT NULL,
    cost_budget_monthly DECIMAL(10,2),
    priority_level INTEGER DEFAULT 3, -- 1=critical, 2=high, 3=medium, 4=low
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Strategic indexes for scalability monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_capacity_metrics_service_time 
    ON service_capacity_metrics(service_name, recorded_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_capacity_metrics_high_usage 
    ON service_capacity_metrics(service_name) WHERE cpu_usage_percent > 80.0 OR memory_usage_percent > 80.0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scaling_events_recent 
    ON scaling_events(occurred_at DESC) WHERE occurred_at > NOW() - INTERVAL '24 hours';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forecasts_horizon 
    ON capacity_planning_forecasts(service_name, time_horizon_days, created_at DESC);

-- Auto-scaling decision function
CREATE OR REPLACE FUNCTION evaluate_scaling_decision(p_service_name VARCHAR(100))
RETURNS TABLE(
    should_scale BOOLEAN,
    scale_direction VARCHAR(10), -- 'up', 'down', 'none'
    recommended_instances INTEGER,
    trigger_metric VARCHAR(50),
    current_value DECIMAL(10,2),
    threshold_value DECIMAL(10,2),
    confidence_score DECIMAL(5,2)
) LANGUAGE plpgsql AS $$
DECLARE
    policy_record RECORD;
    recent_metrics RECORD;
    current_instances INTEGER;
    last_scaling_event TIMESTAMP WITH TIME ZONE;
    cooldown_period INTEGER;
BEGIN
    -- Get scaling policy
    SELECT * INTO policy_record 
    FROM scaling_policies 
    WHERE service_name = p_service_name AND enabled = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'none'::VARCHAR(10), 0, ''::VARCHAR(50), 0.0, 0.0, 0.0;
        RETURN;
    END IF;
    
    -- Get recent metrics (last 5 minutes average)
    SELECT 
        AVG(cpu_usage_percent) as avg_cpu,
        AVG(memory_usage_percent) as avg_memory,
        AVG(response_time_p95_ms) as avg_response_time,
        COUNT(DISTINCT instance_id) as instance_count
    INTO recent_metrics
    FROM service_capacity_metrics 
    WHERE service_name = p_service_name 
    AND recorded_at > NOW() - INTERVAL '5 minutes';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'none'::VARCHAR(10), 0, ''::VARCHAR(50), 0.0, 0.0, 0.0;
        RETURN;
    END IF;
    
    current_instances := COALESCE(recent_metrics.instance_count, policy_record.min_instances);
    
    -- Check for scale up conditions
    IF recent_metrics.avg_cpu > policy_record.scale_up_threshold THEN
        -- Check cooldown period
        SELECT occurred_at INTO last_scaling_event
        FROM scaling_events 
        WHERE service_name = p_service_name 
        ORDER BY occurred_at DESC LIMIT 1;
        
        IF last_scaling_event IS NULL OR 
           last_scaling_event < NOW() - INTERVAL '1 minute' * policy_record.scale_up_cooldown_minutes THEN
            
            IF current_instances < policy_record.max_instances THEN
                RETURN QUERY SELECT 
                    true, 
                    'up'::VARCHAR(10), 
                    LEAST(current_instances + 1, policy_record.max_instances),
                    'cpu'::VARCHAR(50),
                    recent_metrics.avg_cpu,
                    policy_record.scale_up_threshold,
                    85.0;
                RETURN;
            END IF;
        END IF;
    END IF;
    
    -- Check memory threshold
    IF recent_metrics.avg_memory > policy_record.scale_up_threshold THEN
        IF last_scaling_event IS NULL OR 
           last_scaling_event < NOW() - INTERVAL '1 minute' * policy_record.scale_up_cooldown_minutes THEN
            
            IF current_instances < policy_record.max_instances THEN
                RETURN QUERY SELECT 
                    true, 
                    'up'::VARCHAR(10), 
                    LEAST(current_instances + 1, policy_record.max_instances),
                    'memory'::VARCHAR(50),
                    recent_metrics.avg_memory,
                    policy_record.scale_up_threshold,
                    80.0;
                RETURN;
            END IF;
        END IF;
    END IF;
    
    -- Check for scale down conditions
    IF recent_metrics.avg_cpu < policy_record.scale_down_threshold AND 
       recent_metrics.avg_memory < policy_record.scale_down_threshold THEN
        
        IF last_scaling_event IS NULL OR 
           last_scaling_event < NOW() - INTERVAL '1 minute' * policy_record.scale_down_cooldown_minutes THEN
            
            IF current_instances > policy_record.min_instances THEN
                RETURN QUERY SELECT 
                    true, 
                    'down'::VARCHAR(10), 
                    GREATEST(current_instances - 1, policy_record.min_instances),
                    'cpu'::VARCHAR(50),
                    recent_metrics.avg_cpu,
                    policy_record.scale_down_threshold,
                    75.0;
                RETURN;
            END IF;
        END IF;
    END IF;
    
    -- No scaling needed
    RETURN QUERY SELECT false, 'none'::VARCHAR(10), current_instances, ''::VARCHAR(50), 0.0, 0.0, 0.0;
END;
$$;

-- Capacity planning prediction function
CREATE OR REPLACE FUNCTION generate_capacity_forecast(
    p_service_name VARCHAR(100),
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE(
    forecast_date DATE,
    predicted_rps DECIMAL(10,2),
    predicted_cpu DECIMAL(5,2),
    predicted_memory DECIMAL(5,2),
    recommended_instances INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
    base_metrics RECORD;
    growth_rate DECIMAL(5,2);
    seasonal_factor DECIMAL(5,2);
    forecast_day INTEGER;
BEGIN
    -- Calculate baseline metrics from last 30 days
    SELECT 
        AVG(cpu_usage_percent) as avg_cpu,
        AVG(memory_usage_percent) as avg_memory,
        AVG(request_count) as avg_rps
    INTO base_metrics
    FROM service_capacity_metrics 
    WHERE service_name = p_service_name 
    AND recorded_at > NOW() - INTERVAL '30 days';
    
    -- Calculate growth rate (simplified linear growth)
    growth_rate := 0.05; -- 5% monthly growth assumption
    
    -- Generate forecast for each day
    FOR forecast_day IN 1..p_days_ahead LOOP
        seasonal_factor := 1.0 + 0.1 * SIN(2 * PI() * forecast_day / 7); -- Weekly seasonality
        
        RETURN QUERY SELECT 
            (CURRENT_DATE + forecast_day)::DATE,
            (base_metrics.avg_rps * (1 + growth_rate * forecast_day / 30.0) * seasonal_factor)::DECIMAL(10,2),
            (base_metrics.avg_cpu * (1 + growth_rate * forecast_day / 30.0) * seasonal_factor)::DECIMAL(5,2),
            (base_metrics.avg_memory * (1 + growth_rate * forecast_day / 30.0) * seasonal_factor)::DECIMAL(5,2),
            GREATEST(1, CEIL(base_metrics.avg_cpu * (1 + growth_rate * forecast_day / 30.0) * seasonal_factor / 70.0))::INTEGER;
    END LOOP;
END;
$$;
```

---

## **IMPLEMENTATION GUIDANCE**

### **1. Auto-Scaling Implementation**

**Implement comprehensive auto-scaling framework:**

```go
// pkg/scaling/auto_scaler.go
type AutoScaler struct {
    db                *sql.DB
    orchestrator      ContainerOrchestrator
    metricsCollector  *MetricsCollector
    policyManager     *ScalingPolicyManager
    eventRecorder     *ScalingEventRecorder
    logger            *log.Logger
}

type ScalingPolicy struct {
    ServiceName              string  `json:"service_name"`
    MinInstances            int     `json:"min_instances"`
    MaxInstances            int     `json:"max_instances"`
    TargetCPUPercent        float64 `json:"target_cpu_percent"`
    TargetMemoryPercent     float64 `json:"target_memory_percent"`
    TargetResponseTimeMs    float64 `json:"target_response_time_ms"`
    ScaleUpThreshold        float64 `json:"scale_up_threshold"`
    ScaleDownThreshold      float64 `json:"scale_down_threshold"`
    ScaleUpCooldownMinutes  int     `json:"scale_up_cooldown_minutes"`
    ScaleDownCooldownMinutes int    `json:"scale_down_cooldown_minutes"`
    Enabled                 bool    `json:"enabled"`
}

type ScalingDecision struct {
    ShouldScale        bool    `json:"should_scale"`
    ScaleDirection     string  `json:"scale_direction"`
    RecommendedInstances int   `json:"recommended_instances"`
    TriggerMetric      string  `json:"trigger_metric"`
    CurrentValue       float64 `json:"current_value"`
    ThresholdValue     float64 `json:"threshold_value"`
    ConfidenceScore    float64 `json:"confidence_score"`
}

func (as *AutoScaler) EvaluateScaling(ctx context.Context, serviceName string) (*ScalingDecision, error) {
    // Get scaling decision from database function
    row := as.db.QueryRowContext(ctx, "SELECT * FROM evaluate_scaling_decision($1)", serviceName)
    
    decision := &ScalingDecision{}
    err := row.Scan(
        &decision.ShouldScale,
        &decision.ScaleDirection,
        &decision.RecommendedInstances,
        &decision.TriggerMetric,
        &decision.CurrentValue,
        &decision.ThresholdValue,
        &decision.ConfidenceScore,
    )
    
    if err != nil {
        return nil, fmt.Errorf("failed to evaluate scaling decision: %w", err)
    }
    
    return decision, nil
}

func (as *AutoScaler) ExecuteScaling(ctx context.Context, serviceName string, decision *ScalingDecision) error {
    if !decision.ShouldScale {
        return nil // No scaling needed
    }
    
    // Get current instance count
    currentInstances, err := as.orchestrator.GetInstanceCount(serviceName)
    if err != nil {
        return fmt.Errorf("failed to get current instance count: %w", err)
    }
    
    // Execute scaling operation
    start := time.Now()
    var scalingError error
    
    switch decision.ScaleDirection {
    case "up":
        scalingError = as.orchestrator.ScaleUp(serviceName, decision.RecommendedInstances)
    case "down":
        scalingError = as.orchestrator.ScaleDown(serviceName, decision.RecommendedInstances)
    default:
        return fmt.Errorf("invalid scale direction: %s", decision.ScaleDirection)
    }
    
    executionTime := time.Since(start).Seconds()
    
    // Record scaling event
    event := &ScalingEvent{
        ServiceName:         serviceName,
        EventType:           fmt.Sprintf("scale_%s", decision.ScaleDirection),
        TriggerMetric:       decision.TriggerMetric,
        TriggerValue:        decision.CurrentValue,
        ThresholdValue:      decision.ThresholdValue,
        InstancesBefore:     currentInstances,
        InstancesAfter:      decision.RecommendedInstances,
        Success:             scalingError == nil,
        ExecutionTimeSeconds: executionTime,
        OccurredAt:          time.Now(),
    }
    
    if scalingError != nil {
        event.ErrorMessage = scalingError.Error()
    }
    
    if err := as.eventRecorder.RecordEvent(ctx, event); err != nil {
        as.logger.Printf("Failed to record scaling event: %v", err)
    }
    
    if scalingError != nil {
        return fmt.Errorf("scaling execution failed: %w", scalingError)
    }
    
    as.logger.Printf("Successfully scaled %s from %d to %d instances", 
        serviceName, currentInstances, decision.RecommendedInstances)
    
    return nil
}

func (as *AutoScaler) StartAutoScalingLoop(ctx context.Context, interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            as.performAutoScalingCheck(ctx)
        }
    }
}

func (as *AutoScaler) performAutoScalingCheck(ctx context.Context) {
    // Get all services with scaling policies
    policies, err := as.policyManager.GetEnabledPolicies(ctx)
    if err != nil {
        as.logger.Printf("Failed to get scaling policies: %v", err)
        return
    }
    
    for _, policy := range policies {
        // Evaluate scaling decision
        decision, err := as.EvaluateScaling(ctx, policy.ServiceName)
        if err != nil {
            as.logger.Printf("Failed to evaluate scaling for %s: %v", policy.ServiceName, err)
            continue
        }
        
        // Execute scaling if needed
        if decision.ShouldScale {
            if err := as.ExecuteScaling(ctx, policy.ServiceName, decision); err != nil {
                as.logger.Printf("Failed to execute scaling for %s: %v", policy.ServiceName, err)
            }
        }
    }
}
```

**Implementation Steps:**
1. **Policy definition** - Create scaling policies for each service with appropriate thresholds
2. **Metrics collection** - Implement real-time metrics collection for scaling decisions
3. **Orchestrator integration** - Integrate with container orchestration platform (Kubernetes)
4. **Cooldown management** - Implement cooldown periods to prevent scaling oscillation
5. **Event tracking** - Track all scaling events for analysis and optimization

### **2. Load Balancing Strategy**

**Implement intelligent load balancing:**

```go
// pkg/loadbalancer/intelligent_balancer.go
type LoadBalancer struct {
    algorithm        LoadBalancingAlgorithm
    healthChecker   *HealthChecker
    circuitBreaker  *CircuitBreaker
    metricsCollector *LoadBalancerMetrics
    instanceRegistry *InstanceRegistry
}

type LoadBalancingAlgorithm interface {
    SelectInstance(instances []*ServiceInstance, request *Request) (*ServiceInstance, error)
    UpdateMetrics(instance *ServiceInstance, responseTime time.Duration, success bool)
}

type WeightedRoundRobinAlgorithm struct {
    currentWeights map[string]int
    mutex          sync.RWMutex
}

func (wrr *WeightedRoundRobinAlgorithm) SelectInstance(instances []*ServiceInstance, request *Request) (*ServiceInstance, error) {
    wrr.mutex.Lock()
    defer wrr.mutex.Unlock()
    
    if len(instances) == 0 {
        return nil, fmt.Errorf("no healthy instances available")
    }
    
    // Calculate total weight
    totalWeight := 0
    for _, instance := range instances {
        totalWeight += instance.Weight
    }
    
    // Find instance with highest current weight
    var selectedInstance *ServiceInstance
    maxCurrentWeight := -1
    
    for _, instance := range instances {
        if wrr.currentWeights[instance.ID] == 0 {
            wrr.currentWeights[instance.ID] = instance.Weight
        }
        
        if wrr.currentWeights[instance.ID] > maxCurrentWeight {
            maxCurrentWeight = wrr.currentWeights[instance.ID]
            selectedInstance = instance
        }
    }
    
    if selectedInstance == nil {
        return nil, fmt.Errorf("failed to select instance")
    }
    
    // Update current weights
    wrr.currentWeights[selectedInstance.ID] -= totalWeight
    for _, instance := range instances {
        wrr.currentWeights[instance.ID] += instance.Weight
    }
    
    return selectedInstance, nil
}

type LeastConnectionsAlgorithm struct {
    connectionCounts map[string]int
    mutex           sync.RWMutex
}

func (lc *LeastConnectionsAlgorithm) SelectInstance(instances []*ServiceInstance, request *Request) (*ServiceInstance, error) {
    lc.mutex.RLock()
    defer lc.mutex.RUnlock()
    
    if len(instances) == 0 {
        return nil, fmt.Errorf("no healthy instances available")
    }
    
    var selectedInstance *ServiceInstance
    minConnections := math.MaxInt32
    
    for _, instance := range instances {
        connections := lc.connectionCounts[instance.ID]
        if connections < minConnections {
            minConnections = connections
            selectedInstance = instance
        }
    }
    
    return selectedInstance, nil
}

func (lc *LeastConnectionsAlgorithm) UpdateMetrics(instance *ServiceInstance, responseTime time.Duration, success bool) {
    lc.mutex.Lock()
    defer lc.mutex.Unlock()
    
    // Update connection count based on response time and success
    if success {
        // Decrease connection count on successful response
        if lc.connectionCounts[instance.ID] > 0 {
            lc.connectionCounts[instance.ID]--
        }
    } else {
        // Increase connection count on failed response (penalty)
        lc.connectionCounts[instance.ID] += 2
    }
}

type AdaptiveLoadBalancer struct {
    algorithms map[string]LoadBalancingAlgorithm
    selector   *AlgorithmSelector
    metrics    *AdaptiveMetrics
}

func (alb *AdaptiveLoadBalancer) SelectInstance(serviceName string, instances []*ServiceInstance, request *Request) (*ServiceInstance, error) {
    // Select best algorithm based on current conditions
    algorithmName := alb.selector.SelectBestAlgorithm(serviceName, instances, request)
    algorithm := alb.algorithms[algorithmName]
    
    // Select instance using chosen algorithm
    instance, err := algorithm.SelectInstance(instances, request)
    if err != nil {
        return nil, fmt.Errorf("instance selection failed: %w", err)
    }
    
    // Update algorithm metrics
    alb.metrics.RecordAlgorithmUsage(algorithmName, serviceName)
    
    return instance, nil
}

func (alb *AdaptiveLoadBalancer) UpdateInstanceMetrics(instance *ServiceInstance, responseTime time.Duration, success bool) {
    // Update metrics for all algorithms
    for _, algorithm := range alb.algorithms {
        algorithm.UpdateMetrics(instance, responseTime, success)
    }
    
    // Update adaptive metrics
    alb.metrics.RecordInstancePerformance(instance.ID, responseTime, success)
}
```

**Implementation Steps:**
1. **Algorithm implementation** - Implement multiple load balancing algorithms (round-robin, least connections, weighted)
2. **Health checking** - Continuous health checking of service instances
3. **Adaptive selection** - Dynamically select best algorithm based on traffic patterns
4. **Session affinity** - Implement session affinity when required
5. **Performance tracking** - Track performance metrics for algorithm optimization

### **3. Capacity Planning Framework**

**Implement predictive capacity planning:**

```go
// pkg/capacity/planning_engine.go
type CapacityPlanningEngine struct {
    db                    *sql.DB
    forecastingModels     map[string]ForecastingModel
    resourceEstimator     *ResourceEstimator
    costCalculator        *CostCalculator
    alertManager          *AlertManager
}

type ForecastingModel interface {
    GenerateForecast(serviceName string, daysAhead int) (*CapacityForecast, error)
    GetModelAccuracy() float64
    UpdateModel(historicalData []MetricPoint) error
}

type LinearGrowthModel struct {
    growthRate    float64
    seasonality   *SeasonalityPattern
    confidence    float64
}

func (lgm *LinearGrowthModel) GenerateForecast(serviceName string, daysAhead int) (*CapacityForecast, error) {
    // Get historical data
    historicalData, err := lgm.getHistoricalData(serviceName, 90) // 90 days
    if err != nil {
        return nil, fmt.Errorf("failed to get historical data: %w", err)
    }
    
    // Calculate baseline metrics
    baseline := lgm.calculateBaseline(historicalData)
    
    // Generate daily forecasts
    forecasts := make([]DailyForecast, daysAhead)
    for day := 1; day <= daysAhead; day++ {
        // Apply linear growth
        growthFactor := 1.0 + (lgm.growthRate * float64(day) / 30.0)
        
        // Apply seasonality
        seasonalFactor := lgm.seasonality.GetFactor(day)
        
        // Calculate predicted values
        predictedRPS := baseline.AverageRPS * growthFactor * seasonalFactor
        predictedCPU := baseline.AverageCPU * growthFactor * seasonalFactor
        predictedMemory := baseline.AverageMemory * growthFactor * seasonalFactor
        
        // Calculate recommended instances
        recommendedInstances := int(math.Ceil(predictedCPU / 70.0)) // Target 70% CPU
        
        forecasts[day-1] = DailyForecast{
            Date:                 time.Now().AddDate(0, 0, day),
            PredictedRPS:         predictedRPS,
            PredictedCPU:         predictedCPU,
            PredictedMemory:      predictedMemory,
            RecommendedInstances: recommendedInstances,
        }
    }
    
    return &CapacityForecast{
        ServiceName:     serviceName,
        ForecastType:    "linear",
        TimeHorizonDays: daysAhead,
        Forecasts:       forecasts,
        ConfidenceScore: lgm.confidence,
        GeneratedAt:     time.Now(),
    }, nil
}

type MLBasedModel struct {
    modelPath      string
    predictor      MLPredictor
    featureExtractor *FeatureExtractor
}

func (ml *MLBasedModel) GenerateForecast(serviceName string, daysAhead int) (*CapacityForecast, error) {
    // Extract features from historical data
    features, err := ml.featureExtractor.ExtractFeatures(serviceName)
    if err != nil {
        return nil, fmt.Errorf("feature extraction failed: %w", err)
    }
    
    // Generate predictions using ML model
    predictions, err := ml.predictor.Predict(features, daysAhead)
    if err != nil {
        return nil, fmt.Errorf("ML prediction failed: %w", err)
    }
    
    // Convert predictions to capacity forecast
    forecasts := make([]DailyForecast, len(predictions))
    for i, prediction := range predictions {
        forecasts[i] = DailyForecast{
            Date:                 time.Now().AddDate(0, 0, i+1),
            PredictedRPS:         prediction.RPS,
            PredictedCPU:         prediction.CPU,
            PredictedMemory:      prediction.Memory,
            RecommendedInstances: prediction.Instances,
        }
    }
    
    return &CapacityForecast{
        ServiceName:     serviceName,
        ForecastType:    "ml_based",
        TimeHorizonDays: daysAhead,
        Forecasts:       forecasts,
        ConfidenceScore: ml.GetModelAccuracy(),
        GeneratedAt:     time.Now(),
    }, nil
}

func (cpe *CapacityPlanningEngine) GenerateCapacityPlan(ctx context.Context, serviceName string, timeHorizon int) (*CapacityPlan, error) {
    // Generate forecasts using multiple models
    forecasts := make(map[string]*CapacityForecast)
    for modelName, model := range cpe.forecastingModels {
        forecast, err := model.GenerateForecast(serviceName, timeHorizon)
        if err != nil {
            log.Printf("Failed to generate forecast with %s model: %v", modelName, err)
            continue
        }
        forecasts[modelName] = forecast
    }
    
    if len(forecasts) == 0 {
        return nil, fmt.Errorf("no forecasts generated")
    }
    
    // Select best forecast based on model accuracy
    bestForecast := cpe.selectBestForecast(forecasts)
    
    // Calculate resource requirements
    resourcePlan, err := cpe.resourceEstimator.EstimateResources(bestForecast)
    if err != nil {
        return nil, fmt.Errorf("resource estimation failed: %w", err)
    }
    
    // Calculate costs
    costEstimate, err := cpe.costCalculator.CalculateCosts(resourcePlan)
    if err != nil {
        return nil, fmt.Errorf("cost calculation failed: %w", err)
    }
    
    // Store forecast in database
    if err := cpe.storeForecast(ctx, bestForecast); err != nil {
        log.Printf("Failed to store forecast: %v", err)
    }
    
    return &CapacityPlan{
        ServiceName:      serviceName,
        TimeHorizon:      timeHorizon,
        Forecast:         bestForecast,
        ResourcePlan:     resourcePlan,
        CostEstimate:     costEstimate,
        Recommendations:  cpe.generateRecommendations(bestForecast, resourcePlan),
        GeneratedAt:      time.Now(),
    }, nil
}

func (cpe *CapacityPlanningEngine) MonitorCapacityAlerts(ctx context.Context) {
    ticker := time.NewTicker(1 * time.Hour)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            cpe.checkCapacityAlerts(ctx)
        }
    }
}

func (cpe *CapacityPlanningEngine) checkCapacityAlerts(ctx context.Context) {
    // Get all services with capacity monitoring
    services, err := cpe.getMonitoredServices(ctx)
    if err != nil {
        log.Printf("Failed to get monitored services: %v", err)
        return
    }
    
    for _, service := range services {
        // Check if capacity threshold will be exceeded
        forecast, err := cpe.forecastingModels["linear"].GenerateForecast(service, 7) // 7-day forecast
        if err != nil {
            log.Printf("Failed to generate forecast for %s: %v", service, err)
            continue
        }
        
        // Check for capacity issues
        for _, dayForecast := range forecast.Forecasts {
            if dayForecast.PredictedCPU > 90.0 || dayForecast.PredictedMemory > 90.0 {
                alert := &CapacityAlert{
                    ServiceName:     service,
                    AlertType:       "capacity_threshold_exceeded",
                    PredictedDate:   dayForecast.Date,
                    PredictedCPU:    dayForecast.PredictedCPU,
                    PredictedMemory: dayForecast.PredictedMemory,
                    Recommendation:  fmt.Sprintf("Scale to %d instances", dayForecast.RecommendedInstances),
                    Severity:        "high",
                }
                
                cpe.alertManager.SendAlert(alert)
                break
            }
        }
    }
}
```

**Implementation Steps:**
1. **Forecasting models** - Implement multiple forecasting models (linear, seasonal, ML-based)
2. **Historical data analysis** - Analyze historical usage patterns for accurate predictions
3. **Resource estimation** - Calculate required resources based on forecasts
4. **Cost optimization** - Optimize resource allocation to minimize costs
5. **Alerting system** - Alert on predicted capacity issues before they occur

### **4. Horizontal Scaling Patterns**

**Implement horizontal scaling best practices:**

```go
// pkg/scaling/horizontal_scaler.go
type HorizontalScaler struct {
    orchestrator      ContainerOrchestrator
    serviceDiscovery  ServiceDiscovery
    configManager     *ConfigurationManager
    stateManager      *DistributedStateManager
}

type ScalingStrategy interface {
    CanScale(service *Service, currentInstances int) bool
    CalculateTargetInstances(service *Service, metrics *ServiceMetrics) int
    PrepareScaling(service *Service, targetInstances int) (*ScalingPlan, error)
    ExecuteScaling(plan *ScalingPlan) error
    ValidateScaling(service *Service, actualInstances int) error
}

type StatelessServiceStrategy struct {
    loadBalancer    LoadBalancer
    healthChecker   HealthChecker
}

func (sss *StatelessServiceStrategy) CanScale(service *Service, currentInstances int) bool {
    // Stateless services can always scale
    return service.Type == ServiceTypeStateless
}

func (sss *StatelessServiceStrategy) CalculateTargetInstances(service *Service, metrics *ServiceMetrics) int {
    // Calculate based on CPU and memory utilization
    cpuBasedInstances := int(math.Ceil(metrics.CPUUtilization / service.TargetCPUUtilization))
    memoryBasedInstances := int(math.Ceil(metrics.MemoryUtilization / service.TargetMemoryUtilization))
    
    // Use the higher requirement
    targetInstances := int(math.Max(float64(cpuBasedInstances), float64(memoryBasedInstances)))
    
    // Apply min/max constraints
    targetInstances = int(math.Max(float64(targetInstances), float64(service.MinInstances)))
    targetInstances = int(math.Min(float64(targetInstances), float64(service.MaxInstances)))
    
    return targetInstances
}

func (sss *StatelessServiceStrategy) ExecuteScaling(plan *ScalingPlan) error {
    if plan.TargetInstances > plan.CurrentInstances {
        // Scale up
        return sss.scaleUp(plan)
    } else if plan.TargetInstances < plan.CurrentInstances {
        // Scale down
        return sss.scaleDown(plan)
    }
    
    return nil // No scaling needed
}

func (sss *StatelessServiceStrategy) scaleUp(plan *ScalingPlan) error {
    instancesToAdd := plan.TargetInstances - plan.CurrentInstances
    
    for i := 0; i < instancesToAdd; i++ {
        // Create new instance
        instance, err := sss.createInstance(plan.Service)
        if err != nil {
            return fmt.Errorf("failed to create instance: %w", err)
        }
        
        // Wait for instance to become healthy
        if err := sss.waitForHealthy(instance, 5*time.Minute); err != nil {
            // Cleanup failed instance
            sss.destroyInstance(instance)
            return fmt.Errorf("instance failed to become healthy: %w", err)
        }
        
        // Add to load balancer
        if err := sss.loadBalancer.AddInstance(plan.Service.Name, instance); err != nil {
            return fmt.Errorf("failed to add instance to load balancer: %w", err)
        }
    }
    
    return nil
}

func (sss *StatelessServiceStrategy) scaleDown(plan *ScalingPlan) error {
    instancesToRemove := plan.CurrentInstances - plan.TargetInstances
    
    // Get instances ordered by utilization (remove least utilized first)
    instances, err := sss.getInstancesByUtilization(plan.Service.Name)
    if err != nil {
        return fmt.Errorf("failed to get instances: %w", err)
    }
    
    for i := 0; i < instancesToRemove && i < len(instances); i++ {
        instance := instances[i]
        
        // Remove from load balancer first
        if err := sss.loadBalancer.RemoveInstance(plan.Service.Name, instance); err != nil {
            log.Printf("Failed to remove instance from load balancer: %v", err)
        }
        
        // Wait for connections to drain
        if err := sss.drainConnections(instance, 2*time.Minute); err != nil {
            log.Printf("Failed to drain connections: %v", err)
        }
        
        // Destroy instance
        if err := sss.destroyInstance(instance); err != nil {
            return fmt.Errorf("failed to destroy instance: %w", err)
        }
    }
    
    return nil
}

type StatefulServiceStrategy struct {
    stateManager      *DistributedStateManager
    dataReplicator    *DataReplicator
    consensusManager  *ConsensusManager
}

func (sfs *StatefulServiceStrategy) CanScale(service *Service, currentInstances int) bool {
    // Stateful services have more complex scaling requirements
    if service.Type != ServiceTypeStateful {
        return false
    }
    
    // Check if consensus is maintained
    if currentInstances%2 == 0 && service.RequiresConsensus {
        return false // Need odd number for consensus
    }
    
    return true
}

func (sfs *StatefulServiceStrategy) ExecuteScaling(plan *ScalingPlan) error {
    if plan.TargetInstances > plan.CurrentInstances {
        return sfs.scaleUpStateful(plan)
    } else if plan.TargetInstances < plan.CurrentInstances {
        return sfs.scaleDownStateful(plan)
    }
    
    return nil
}

func (sfs *StatefulServiceStrategy) scaleUpStateful(plan *ScalingPlan) error {
    // For stateful services, scaling up requires data replication
    instancesToAdd := plan.TargetInstances - plan.CurrentInstances
    
    for i := 0; i < instancesToAdd; i++ {
        // Create new instance
        instance, err := sfs.createStatefulInstance(plan.Service)
        if err != nil {
            return fmt.Errorf("failed to create stateful instance: %w", err)
        }
        
        // Replicate state to new instance
        if err := sfs.dataReplicator.ReplicateToInstance(plan.Service.Name, instance); err != nil {
            sfs.destroyInstance(instance)
            return fmt.Errorf("failed to replicate state: %w", err)
        }
        
        // Add to consensus group
        if plan.Service.RequiresConsensus {
            if err := sfs.consensusManager.AddMember(plan.Service.Name, instance); err != nil {
                return fmt.Errorf("failed to add to consensus group: %w", err)
            }
        }
    }
    
    return nil
}
```

**Implementation Steps:**
1. **Service categorization** - Classify services as stateless, stateful, or singleton
2. **Scaling strategies** - Implement different strategies for different service types
3. **State management** - Handle state replication for stateful services
4. **Connection draining** - Graceful connection draining during scale-down
5. **Health validation** - Ensure new instances are healthy before adding to load balancer

---

## **INTEGRATION TESTS**

### **Auto-Scaling Testing**
```go
func TestAutoScaling(t *testing.T) {
    // Use domainflow_production database
    suite := testutil.ServiceTestSuite{UseDatabaseFromEnv: true}
    testDB := suite.SetupDatabase(t)
    defer suite.TeardownDatabase(t, testDB)
    
    autoScaler := NewAutoScaler(testDB)
    
    // Test scaling policy evaluation
    t.Run("ScalingPolicyEvaluation", func(t *testing.T) {
        serviceName := "test-service"
        
        // Insert test metrics indicating high CPU usage
        insertTestMetrics(t, testDB, serviceName, 85.0, 60.0, 2) // CPU=85%, Memory=60%, 2 instances
        
        decision, err := autoScaler.EvaluateScaling(context.Background(), serviceName)
        assert.NoError(t, err)
        assert.True(t, decision.ShouldScale)
        assert.Equal(t, "up", decision.ScaleDirection)
        assert.Equal(t, 3, decision.RecommendedInstances)
        assert.Equal(t, "cpu", decision.TriggerMetric)
    })
    
    // Test scaling cooldown
    t.Run("ScalingCooldown", func(t *testing.T) {
        serviceName := "cooldown-service"
        
        // Insert recent scaling event
        insertScalingEvent(t, testDB, serviceName, "scale_up", time.Now().Add(-2*time.Minute))
        
        // Insert metrics indicating need to scale
        insertTestMetrics(t, testDB, serviceName, 90.0, 70.0, 2)
        
        decision, err := autoScaler.EvaluateScaling(context.Background(), serviceName)
        assert.NoError(t, err)
        assert.False(t, decision.ShouldScale) // Should be in cooldown
    })
}

func TestLoadBalancing(t *testing.T) {
    // Test weighted round-robin algorithm
    t.Run("WeightedRoundRobin", func(t *testing.T) {
        algorithm := &WeightedRoundRobinAlgorithm{
            currentWeights: make(map[string]int),
        }
        
        instances := []*ServiceInstance{
            {ID: "instance-1", Weight: 3, Healthy: true},
            {ID: "instance-2", Weight: 2, Healthy: true},
            {ID: "instance-3", Weight: 1, Healthy: true},
        }
        
        // Test distribution over multiple selections
        selections := make(map[string]int)
        for i := 0; i < 60; i++ { // 10 rounds of 6 selections each
            instance, err := algorithm.SelectInstance(instances, &Request{})
            assert.NoError(t, err)
            selections[instance.ID]++
        }
        
        // Verify distribution matches weights (3:2:1 ratio)
        assert.Equal(t, 30, selections["instance-1"]) // 3/6 * 60
        assert.Equal(t, 20, selections["instance-2"]) // 2/6 * 60
        assert.Equal(t, 10, selections["instance-3"]) // 1/6 * 60
    })
    
    // Test least connections algorithm
    t.Run("LeastConnections", func(t *testing.T) {
        algorithm := &LeastConnectionsAlgorithm{
            connectionCounts: map[string]int{
                "instance-1": 5,
                "instance-2": 2,
                "instance-3": 8,
            },
        }
        
        instances := []*ServiceInstance{
            {ID: "instance-1", Healthy: true},
            {ID: "instance-2", Healthy: true},
            {ID: "instance-3", Healthy: true},
        }
        
        instance, err := algorithm.SelectInstance(instances, &Request{})
        assert.NoError(t, err)
        assert.Equal(t, "instance-2", instance.ID) // Least connections
    })
}

func TestCapacityPlanning(t *testing.T) {
    planningEngine := setupCapacityPlanningEngine(t)
    
    // Test linear growth forecast
    t.Run("LinearGrowthForecast", func(t *testing.T) {
        model := &LinearGrowthModel{
            growthRate:  0.05, // 5% monthly growth
            seasonality: &SeasonalityPattern{WeeklyPattern: []float64{1.0, 0.8, 0.8, 0.9, 1.1, 1.2, 0.9}},
            confidence:  0.85,
        }
        
        forecast, err := model.GenerateForecast("test-service", 30)
        assert.NoError(t, err)
        assert.Equal(t, 30, len(forecast.Forecasts))
        assert.Equal(t, "linear", forecast.ForecastType)
        assert.Equal(t, 0.85, forecast.ConfidenceScore)
        
        // Verify growth trend
        assert.Greater(t, forecast.Forecasts[29].PredictedRPS, forecast.Forecasts[0].PredictedRPS)
    })
    
    // Test capacity alerts
    t.Run("CapacityAlerts", func(t *testing.T) {
        // Create service with high predicted usage
        insertHighUsageForecast(t, planningEngine.db, "alert-service")
        
        alerts := []CapacityAlert{}
        alertManager := &MockAlertManager{
            SendAlertFunc: func(alert *CapacityAlert) error {
                alerts = append(alerts, *alert)
                return nil
            },
        }
        planningEngine.alertManager = alertManager
        
        planningEngine.checkCapacityAlerts(context.Background())
        
        assert.Greater(t, len(alerts), 0)
        assert.Equal(t, "capacity_threshold_exceeded", alerts[0].AlertType)
        assert.Equal(t, "high", alerts[0].Severity)
    })
}

func TestHorizontalScaling(t *testing.T) {
    scaler := setupHorizontalScaler(t)
    
    // Test stateless service scaling
    t.Run("StatelessServiceScaling", func(t *testing.T) {
        strategy := &StatelessServiceStrategy{}
        
        service := &Service{
            Name:                   "stateless-service",
            Type:                   ServiceTypeStateless,
            MinInstances:           1,
            MaxInstances:           10,
            TargetCPUUtilization:   70.0,
            TargetMemoryUtilization: 80.0,
        }
        
        metrics := &ServiceMetrics{
            CPUUtilization:    140.0, // 2x target
            MemoryUtilization: 160.0, // 2x target
        }
        
        targetInstances := strategy.CalculateTargetInstances(service, metrics)
        assert.Equal(t, 2, targetInstances) // Should scale to 2 instances
    })
    
    // Test stateful service scaling constraints
    t.Run("StatefulServiceConstraints", func(t *testing.T) {
        strategy := &StatefulServiceStrategy{}
        
        service := &Service{
            Name:              "stateful-service",
            Type:              ServiceTypeStateful,
            RequiresConsensus: true,
        }
        
        // Test that scaling to even number is not allowed for consensus services
        canScale := strategy.CanScale(service, 2) // Even number
        assert.False(t, canScale)
        
        canScale = strategy.CanScale(service, 3) // Odd number
        assert.True(t, canScale)
    })
}
```

---

## **CI/CD VALIDATION CHECKLIST**

### **Scalability Quality Gates**
- [ ] **Auto-Scaling Functionality**: All services have appropriate scaling policies configured
- [ ] **Load Balancing Efficiency**: Load is distributed evenly across healthy instances
- [ ] **Capacity Planning Accuracy**: Forecasts are within 20% of actual usage
- [ ] **Horizontal Scaling Reliability**: Scaling operations complete successfully >95% of time
- [ ] **Resource Utilization Optimization**: No service consistently over-provisioned by >30%
- [ ] **Cost Efficiency**: Scaling decisions optimize for both performance and cost

### **Database Schema Validation**
```bash
# Validate scalability monitoring schema
POSTGRES_DATABASE=domainflow_production go test ./pkg/scaling/... -tags=integration -run=TestScalabilitySchema

# Check auto-scaling decisions
POSTGRES_DATABASE=domainflow_production psql $TEST_POSTGRES_DSN -c "SELECT * FROM evaluate_scaling_decision('test-service');"

# Validate capacity forecasts
POSTGRES_DATABASE=domainflow_production go test ./pkg/capacity/... -tags=integration -run=TestCapacityPlanning -race
```

### **Deployment Pipeline Integration**
```yaml
# .github/workflows/scalability-validation.yml
scalability-validation:
  runs-on: ubuntu-latest
  steps:
    - name: Auto-Scaling Policy Validation
      run: |
        go run ./cmd/scaling-policy-validator --config=.scaling.yml
        
    - name: Load Balancing Tests
      run: |
        POSTGRES_DATABASE=domainflow_production go test ./pkg/loadbalancer/... -tags=integration -timeout=10m
        
    - name: Capacity Planning Tests
      run: |
        POSTGRES_DATABASE=domainflow_production go test ./pkg/capacity/... -tags=integration -race -timeout=5m
```

---

## **SUCCESS CRITERIA**

### **Quantitative Metrics**
- **Auto-Scaling Response Time**: < 2 minutes from trigger to instance availability
- **Load Balancing Efficiency**: < 10% variance in load distribution across instances
- **Capacity Forecast Accuracy**: > 80% accuracy for 30-day forecasts
- **Resource Utilization**: 60-80% average utilization across all services
- **Scaling Success Rate**: > 95% successful scaling operations

### **Qualitative Indicators**
- **Operational Efficiency**: Reduced manual intervention in scaling operations
- **Cost Optimization**: Improved cost efficiency through better resource utilization
- **System Reliability**: Better handling of traffic spikes and failures
- **Predictable Performance**: Consistent performance under varying loads

### **Monitoring Dashboard Integration**
```go
// Integration with existing monitoring (building on PF-002)
func (as *AutoScaler) RegisterMetrics(registry *prometheus.Registry) {
    scalingLatencyHistogram := prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "domainflow_scaling_latency_seconds",
            Help: "Time taken to complete scaling operations",
        },
        []string{"service_name", "scale_direction"},
    )
    
    resourceUtilizationGauge := prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "domainflow_resource_utilization_percent",
            Help: "Resource utilization percentage",
        },
        []string{"service_name", "resource_type"},
    )
    
    registry.MustRegister(scalingLatencyHistogram, resourceUtilizationGauge)
}
```

---

## **ROLLBACK PROCEDURES**

### **Scalability Architecture Rollback Plan**
1. **Auto-Scaling Rollback**: Disable auto-scaling and revert to manual scaling
2. **Load Balancer Rollback**: Revert to previous load balancing configuration
3. **Capacity Planning Rollback**: Use previous capacity planning methodology
4. **Instance Configuration Rollback**: Restore previous instance configurations

### **Database Rollback**
```sql
-- Migration: 20250622_scalability_architecture.down.sql
DROP FUNCTION IF EXISTS generate_capacity_forecast(VARCHAR(100), INTEGER);
DROP FUNCTION IF EXISTS evaluate_scaling_decision(VARCHAR(100));
DROP INDEX IF EXISTS idx_forecasts_horizon;
DROP INDEX IF EXISTS idx_scaling_events_recent;
DROP INDEX IF EXISTS idx_capacity_metrics_high_usage;
DROP INDEX IF EXISTS idx_capacity_metrics_service_time;
DROP TABLE IF EXISTS resource_quotas;
DROP TABLE IF EXISTS capacity_planning_forecasts;
DROP TABLE IF EXISTS load_balancer_config;
DROP TABLE IF EXISTS scaling_events;
DROP TABLE IF EXISTS scaling_policies;
DROP TABLE IF EXISTS service_capacity_metrics;
```

---

**Implementation Priority**: Implement after AR-004 API Design completion  
**Validation Required**: Auto-scaling response time < 2 minutes, load balancing efficiency > 90%  
**Next Document**: AR-006 Configuration Management Architecture