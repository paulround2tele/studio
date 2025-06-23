# PF-003: RESOURCE UTILIZATION EFFICIENCY - TACTICAL PLAN

**Finding ID**: PF-003  
**Priority**: HIGH  
**Phase**: 2C Performance  
**Estimated Effort**: 3-4 days  
**Dependencies**: ✅ Phase 2A Foundation, ✅ Phase 2B Security, ✅ SI-004 Connection Pool, ✅ SI-005 Memory Management, ✅ PF-001 Query Optimization, ✅ PF-002 Response Time

---

## FINDING OVERVIEW

**Problem Statement**: Inefficient resource utilization across CPU, memory, database connections, and worker goroutines leading to resource waste and performance bottlenecks during peak operations.

**Root Cause**: Lack of resource monitoring, inefficient worker pool management, unoptimized CPU-bound operations, missing resource allocation strategies, and absence of dynamic scaling based on load.

**Impact**: 
- CPU utilization spikes during domain generation operations
- Memory waste from inefficient data structures and algorithms
- Database connection saturation under concurrent load
- Worker goroutine leaks and inefficient task distribution
- System resource contention affecting overall performance

**Integration Points**: 
- Builds on SI-005 memory management and PF-001 query optimization patterns
- Integrates with domain generation, campaign processing, and worker coordination
- Enhances existing monitoring infrastructure with resource utilization metrics
- Connects to connection pool management from SI-004

---

## POSTGRESQL MIGRATION

**File**: `backend/database/migrations/016_pf003_resource_utilization.sql`

**Key Components**:
```sql
-- Resource utilization tracking
CREATE TABLE resource_utilization_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'cpu', 'memory', 'goroutines', 'db_connections'
    current_usage DECIMAL(10,3) NOT NULL,
    max_capacity DECIMAL(10,3) NOT NULL,
    utilization_pct DECIMAL(5,2) NOT NULL,
    efficiency_score DECIMAL(5,2) DEFAULT 0,
    bottleneck_detected BOOLEAN DEFAULT false,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker pool performance metrics
CREATE TABLE worker_pool_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    active_workers INTEGER NOT NULL,
    queued_tasks INTEGER NOT NULL,
    completed_tasks_rate DECIMAL(10,2) NOT NULL,
    avg_task_duration_ms DECIMAL(10,3) NOT NULL,
    worker_efficiency_pct DECIMAL(5,2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource optimization recommendations
CREATE TABLE resource_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    current_efficiency_pct DECIMAL(5,2) NOT NULL,
    target_efficiency_pct DECIMAL(5,2) NOT NULL,
    optimization_strategies JSONB NOT NULL,
    estimated_improvement_pct DECIMAL(5,2) NOT NULL,
    implementation_priority VARCHAR(20) DEFAULT 'medium',
    implemented BOOLEAN DEFAULT false
);

-- Function to record resource utilization
CREATE OR REPLACE FUNCTION record_resource_utilization(
    p_service_name VARCHAR(100),
    p_resource_type VARCHAR(50),
    p_current_usage DECIMAL(10,3),
    p_max_capacity DECIMAL(10,3)
) RETURNS UUID;
```

**Strategic Indexes**:
```sql
CREATE INDEX idx_resource_metrics_service_type ON resource_utilization_metrics(service_name, resource_type);
CREATE INDEX idx_resource_metrics_efficiency ON resource_utilization_metrics(efficiency_score);
CREATE INDEX idx_worker_pool_efficiency ON worker_pool_metrics(worker_efficiency_pct);
```

---

## IMPLEMENTATION GUIDANCE

### Step 1: Resource Utilization Monitor

**File**: `backend/internal/monitoring/resource_utilization_monitor.go`

**Core Implementation Approach**:
```go
type ResourceUtilizationMonitor struct {
    db                *sqlx.DB
    tickInterval      time.Duration
    resourceThresholds map[string]float64
    alerting          AlertingService
}

func (rum *ResourceUtilizationMonitor) StartMonitoring(ctx context.Context) error {
    ticker := time.NewTicker(rum.tickInterval)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            return nil
        case <-ticker.C:
            rum.collectResourceMetrics(ctx)
        }
    }
}

func (rum *ResourceUtilizationMonitor) collectResourceMetrics(ctx context.Context) {
    // CPU utilization
    cpuUsage := rum.getCPUUsage()
    rum.recordMetric(ctx, "api_server", "cpu", cpuUsage, 100.0)
    
    // Memory utilization
    memUsage := rum.getMemoryUsage()
    rum.recordMetric(ctx, "api_server", "memory", memUsage.Used, memUsage.Total)
    
    // Goroutine count
    goroutineCount := runtime.NumGoroutine()
    rum.recordMetric(ctx, "api_server", "goroutines", float64(goroutineCount), 10000)
    
    // Database connections
    dbStats := rum.db.Stats()
    rum.recordMetric(ctx, "api_server", "db_connections", 
        float64(dbStats.OpenConnections), float64(dbStats.MaxOpenConnections))
}
```

**Integration Pattern**:
- Start monitoring on service initialization
- Use separate goroutine for metric collection
- Integrate with existing alerting system for threshold breaches

### Step 2: Efficient Worker Pool Management

**File**: `backend/internal/workers/efficient_worker_pool.go`

**Dynamic Worker Pool Strategy**:
```go
type EfficientWorkerPool struct {
    name           string
    minWorkers     int
    maxWorkers     int
    currentWorkers int
    taskQueue      chan Task
    workerMetrics  *WorkerMetrics
    scaleUpChan    chan struct{}
    scaleDownChan  chan struct{}
}

func (ewp *EfficientWorkerPool) Start(ctx context.Context) {
    // Start with minimum workers
    for i := 0; i < ewp.minWorkers; i++ {
        go ewp.worker(ctx, i)
    }
    
    // Monitor and scale workers based on load
    go ewp.autoScaler(ctx)
}

func (ewp *EfficientWorkerPool) autoScaler(ctx context.Context) {
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            ewp.evaluateScaling()
        }
    }
}

func (ewp *EfficientWorkerPool) evaluateScaling() {
    queueSize := len(ewp.taskQueue)
    avgTaskDuration := ewp.workerMetrics.GetAverageTaskDuration()
    
    // Scale up if queue is backing up
    if queueSize > ewp.currentWorkers*2 && ewp.currentWorkers < ewp.maxWorkers {
        ewp.scaleUp()
    }
    
    // Scale down if workers are idle
    if queueSize < ewp.currentWorkers/4 && ewp.currentWorkers > ewp.minWorkers {
        ewp.scaleDown()
    }
}
```

**Task Prioritization Pattern**:
```go
type PriorityTask struct {
    Task     Task
    Priority int // 1=highest, 5=lowest
    Deadline time.Time
}

func (ewp *EfficientWorkerPool) AddPriorityTask(task Task, priority int, deadline time.Time) {
    priorityTask := PriorityTask{
        Task:     task,
        Priority: priority,
        Deadline: deadline,
    }
    
    // Insert into priority queue based on priority and deadline
    ewp.priorityQueue.Insert(priorityTask)
}
```

### Step 3: CPU-Optimized Domain Generation

**File**: `backend/internal/services/cpu_optimized_domain_generation.go`

**CPU Efficiency Strategy**:
```go
type CPUOptimizedDomainGenerator struct {
    cpuCount       int
    batchProcessor *BatchProcessor
    cpuMonitor     *CPUMonitor
}

func (codg *CPUOptimizedDomainGenerator) GenerateDomainsEfficiently(
    ctx context.Context,
    config DomainGenerationConfig,
) error {
    // Determine optimal worker count based on CPU cores
    optimalWorkers := runtime.NumCPU()
    
    // Adjust based on current CPU load
    currentLoad := codg.cpuMonitor.GetCurrentLoad()
    if currentLoad > 0.8 {
        optimalWorkers = max(1, optimalWorkers/2) // Reduce load
    }
    
    // Process in CPU-efficient batches
    batchSize := codg.calculateOptimalBatchSize(config.DomainsToGenerate, optimalWorkers)
    
    return codg.processBatchesConcurrently(ctx, config, batchSize, optimalWorkers)
}

func (codg *CPUOptimizedDomainGenerator) calculateOptimalBatchSize(totalDomains, workers int) int {
    // Balance memory usage and CPU efficiency
    baseSize := totalDomains / workers
    
    // Adjust based on domain complexity
    if baseSize > 10000 {
        return 5000 // Cap to avoid memory pressure
    }
    if baseSize < 100 {
        return 100 // Minimum for efficiency
    }
    
    return baseSize
}
```

**Algorithm Optimization Pattern**:
```go
// Use efficient algorithms for domain generation
func (codg *CPUOptimizedDomainGenerator) generateDomainBatch(
    keywords []string, 
    tlds []string, 
    patterns []string,
) []Domain {
    // Pre-allocate slices to avoid repeated allocations
    domains := make([]Domain, 0, len(keywords)*len(tlds)*len(patterns))
    
    // Use string builder pool to reduce garbage collection
    builder := codg.stringBuilderPool.Get().(*strings.Builder)
    defer func() {
        builder.Reset()
        codg.stringBuilderPool.Put(builder)
    }()
    
    // Nested loops optimized for cache locality
    for _, pattern := range patterns {
        for _, keyword := range keywords {
            for _, tld := range tlds {
                builder.Reset()
                
                // Efficient string building
                domain := codg.buildDomainFromPattern(builder, pattern, keyword, tld)
                domains = append(domains, domain)
            }
        }
    }
    
    return domains
}
```

### Step 4: Memory-Efficient Data Structures

**File**: `backend/internal/utils/efficient_data_structures.go`

**Memory Pool Optimization**:
```go
type MemoryEfficientStructures struct {
    domainPool     sync.Pool
    stringSlicePool sync.Pool
    mapPool        sync.Pool
}

func NewMemoryEfficientStructures() *MemoryEfficientStructures {
    return &MemoryEfficientStructures{
        domainPool: sync.Pool{
            New: func() interface{} {
                return make([]Domain, 0, 1000)
            },
        },
        stringSlicePool: sync.Pool{
            New: func() interface{} {
                return make([]string, 0, 100)
            },
        },
        mapPool: sync.Pool{
            New: func() interface{} {
                return make(map[string]interface{})
            },
        },
    }
}

func (mes *MemoryEfficientStructures) GetDomainSlice() []Domain {
    return mes.domainPool.Get().([]Domain)[:0]
}

func (mes *MemoryEfficientStructures) ReturnDomainSlice(slice []Domain) {
    if cap(slice) <= 2000 { // Prevent pool from growing too large
        mes.domainPool.Put(slice)
    }
}
```

**Efficient Data Processing Pattern**:
```go
func (mes *MemoryEfficientStructures) ProcessLargeDataset(
    data []DataItem,
    processor func([]DataItem) error,
) error {
    batchSize := 1000
    
    for i := 0; i < len(data); i += batchSize {
        end := min(i+batchSize, len(data))
        batch := data[i:end]
        
        if err := processor(batch); err != nil {
            return err
        }
        
        // Force garbage collection periodically for large datasets
        if i%10000 == 0 {
            runtime.GC()
        }
    }
    
    return nil
}
```

### Step 5: Database Resource Optimization

**File**: `backend/internal/database/resource_optimized_operations.go`

**Connection Pool Efficiency**:
```go
type ResourceOptimizedDB struct {
    db                 *sqlx.DB
    connectionMonitor  *ConnectionMonitor
    queryBatcher      *QueryBatcher
}

func (rod *ResourceOptimizedDB) ExecuteWithResourceMonitoring(
    ctx context.Context,
    query string,
    args ...interface{},
) error {
    // Check connection availability before executing
    if rod.connectionMonitor.GetAvailableConnections() < 2 {
        // Wait briefly for connections to become available
        time.Sleep(10 * time.Millisecond)
    }
    
    // Use prepared statements for repeated queries
    stmt, err := rod.db.PreparexContext(ctx, query)
    if err != nil {
        return err
    }
    defer stmt.Close()
    
    return rod.executeWithMetrics(ctx, stmt, args...)
}

func (rod *ResourceOptimizedDB) BulkInsertOptimized(
    ctx context.Context,
    table string,
    data []interface{},
) error {
    // Use batch operations to reduce connection overhead
    return rod.queryBatcher.ExecuteBatch(ctx, func(tx *sqlx.Tx) error {
        return rod.insertBatch(ctx, tx, table, data)
    })
}
```

**Query Batching Strategy**:
```go
type QueryBatcher struct {
    db              *sqlx.DB
    batchSize       int
    batchTimeout    time.Duration
    pendingQueries  []BatchQuery
    mu              sync.Mutex
}

func (qb *QueryBatcher) AddQuery(query BatchQuery) {
    qb.mu.Lock()
    defer qb.mu.Unlock()
    
    qb.pendingQueries = append(qb.pendingQueries, query)
    
    // Execute batch when size threshold reached
    if len(qb.pendingQueries) >= qb.batchSize {
        go qb.executeBatch()
    }
}

func (qb *QueryBatcher) executeBatch() {
    // Execute multiple queries in single transaction
    tx, err := qb.db.Beginx()
    if err != nil {
        return
    }
    defer tx.Rollback()
    
    for _, query := range qb.pendingQueries {
        query.Execute(tx)
    }
    
    tx.Commit()
    qb.clearPendingQueries()
}
```

### Step 6: Resource Utilization Testing

**File**: `backend/internal/monitoring/pf003_resource_utilization_test.go`

**Performance Testing Approach**:
```go
func (suite *PF003ResourceUtilizationTestSuite) TestCPUEfficiency() {
    // Baseline CPU usage
    initialCPU := getCPUUsage()
    
    // Execute CPU-intensive domain generation
    config := DomainGenerationConfig{
        DomainsToGenerate: 50000,
        Keywords:          []string{"test", "demo", "example"},
        TLDs:             []string{"com", "org", "net"},
    }
    
    startTime := time.Now()
    err := suite.domainGenerator.GenerateDomainsEfficiently(ctx, config)
    duration := time.Since(startTime)
    
    suite.NoError(err)
    
    // Verify CPU efficiency
    finalCPU := getCPUUsage()
    cpuIncrease := finalCPU - initialCPU
    
    suite.Less(cpuIncrease, 80.0, "CPU usage should not spike excessively")
    suite.Less(duration, 30*time.Second, "Generation should complete efficiently")
}

func (suite *PF003ResourceUtilizationTestSuite) TestMemoryEfficiency() {
    var initialMem, finalMem runtime.MemStats
    runtime.ReadMemStats(&initialMem)
    
    // Process large dataset with memory-efficient structures
    largeDataset := suite.generateLargeTestDataset(100000)
    
    err := suite.efficientStructures.ProcessLargeDataset(largeDataset, func(batch []DataItem) error {
        // Simulate processing
        return suite.processBatch(batch)
    })
    
    suite.NoError(err)
    
    runtime.GC()
    runtime.ReadMemStats(&finalMem)
    
    memoryGrowth := finalMem.HeapInuse - initialMem.HeapInuse
    suite.Less(memoryGrowth, uint64(200*1024*1024), "Memory growth should be limited to 200MB")
}

func (suite *PF003ResourceUtilizationTestSuite) TestWorkerPoolEfficiency() {
    // Create worker pool
    pool := NewEfficientWorkerPool("test-pool", 2, 10)
    
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    go pool.Start(ctx)
    
    // Submit varying load
    for i := 0; i < 1000; i++ {
        task := TestTask{ID: i, Duration: time.Duration(i%10) * time.Millisecond}
        pool.SubmitTask(task)
        
        if i%100 == 0 {
            time.Sleep(10 * time.Millisecond) // Vary load
        }
    }
    
    // Wait for completion
    pool.WaitForCompletion()
    
    // Verify efficiency metrics
    metrics := pool.GetMetrics()
    suite.Greater(metrics.EfficiencyPct, 75.0, "Worker pool should be at least 75% efficient")
}
```

---

## TESTING REQUIREMENTS

### Environment Setup
```bash
# Use domainflow_production database
export TEST_POSTGRES_DSN="postgresql://username:password@localhost/domainflow_production"
export POSTGRES_DATABASE=domainflow_production
export USE_REAL_DATABASE=true
export RESOURCE_MONITORING=true
export TEST_TIMEOUT=120s
export GOMAXPROCS=4
```

### Test Execution
```bash
# Resource utilization specific tests
go test ./internal/monitoring -run TestPF003 -race -v -timeout 120s -tags=integration

# Performance and efficiency benchmarks
go test ./internal/workers -run TestWorkerPool -bench=. -benchmem -tags=integration
go test ./internal/services -run TestCPUOptimized -bench=. -benchmem -tags=integration
```

---

## CI/CD VALIDATION CHECKLIST

### Mandatory Checks
- [ ] `go test ./... -race` passes with zero data races
- [ ] `golangci-lint run` clean with zero critical issues
- [ ] PF-003 resource utilization tests pass
- [ ] CPU efficiency remains within acceptable bounds
- [ ] Memory usage patterns are optimized
- [ ] Worker pools demonstrate high efficiency

### Performance Validation
- [ ] CPU usage increase <80% during intensive operations
- [ ] Memory growth limited to <200MB for large datasets
- [ ] Worker pool efficiency >75% under varying loads
- [ ] Database connection utilization <80% of pool size
- [ ] Resource monitoring overhead <2% of total usage

### Resource Validation
- [ ] Dynamic worker scaling functions correctly
- [ ] Memory pools reduce allocation pressure
- [ ] CPU-optimized algorithms show measurable improvement
- [ ] Database resource usage remains efficient under load

---

## SUCCESS CRITERIA

### Functional Requirements
1. **Resource Monitoring**: Real-time tracking of CPU, memory, connections, and workers
2. **Dynamic Scaling**: Worker pools automatically adjust to load
3. **Memory Efficiency**: Optimized data structures reduce memory footprint
4. **CPU Optimization**: Algorithms tuned for efficient CPU utilization

### Performance Requirements
1. **CPU Efficiency**: <80% CPU usage during intensive operations
2. **Memory Efficiency**: <200MB memory growth for large datasets
3. **Worker Efficiency**: >75% worker pool efficiency under varying loads
4. **Connection Efficiency**: <80% database connection pool utilization

### Integration Requirements
1. **Monitoring Integration**: Resource metrics available in dashboards
2. **Alerting Integration**: Resource threshold alerts integrate with monitoring
3. **Service Integration**: All CPU/memory intensive services use optimization patterns

---

## ROLLBACK PROCEDURES

### Database Rollback
```sql
-- File: backend/database/migrations/016_rollback_pf003.sql
BEGIN;
DROP FUNCTION IF EXISTS record_resource_utilization(VARCHAR, VARCHAR, DECIMAL, DECIMAL);
DROP TABLE IF EXISTS resource_optimization_recommendations;
DROP TABLE IF EXISTS worker_pool_metrics;
DROP TABLE IF EXISTS resource_utilization_metrics;
COMMIT;
```

### Code Rollback
- Revert to standard worker pool implementations
- Remove CPU optimization patterns if causing issues
- Disable resource monitoring if impacting performance

---

**Implementation Priority**: HIGH - Essential for efficient resource usage and scalability  
**Next Step**: Begin with resource utilization monitoring and worker pool optimization  
**Performance Integration**: Prepares for PF-004 caching implementation and completes Phase 2C Performance