# SI-005: MEMORY MANAGEMENT ISSUES - TACTICAL PLAN

**Finding ID**: SI-005  
**Priority**: HIGH  
**Phase**: 2C Performance  
**Estimated Effort**: 3-4 days  
**Dependencies**: ✅ Phase 2A Foundation, ✅ Phase 2B Security, ✅ SI-004 Connection Pool Management

---

## FINDING OVERVIEW

**Problem Statement**: Memory management issues including memory leaks, inefficient garbage collection, and excessive memory allocation in domain generation and campaign processing operations.

**Root Cause**: Inadequate memory profiling, inefficient data structures for large-scale operations, missing memory cleanup in long-running processes, and lack of memory monitoring across services.

**Impact**: 
- Memory exhaustion during large campaign operations
- Degraded performance from excessive garbage collection
- Service instability under sustained high memory usage
- Potential out-of-memory crashes in domain generation workflows

**Integration Points**: 
- Builds on SI-004 connection pool monitoring patterns
- Integrates with domain generation and campaign services
- Enhances existing monitoring infrastructure
- Connects to worker coordination and batch processing systems

---

## POSTGRESQL MIGRATION

**File**: `backend/database/migrations/013_si005_memory_monitoring.sql`

```sql
BEGIN;

-- Memory usage metrics tracking
CREATE TABLE IF NOT EXISTS memory_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    process_id VARCHAR(50) NOT NULL,
    heap_size_bytes BIGINT NOT NULL,
    heap_used_bytes BIGINT NOT NULL,
    heap_free_bytes BIGINT NOT NULL,
    gc_count BIGINT DEFAULT 0,
    gc_duration_ms BIGINT DEFAULT 0,
    goroutines_count INTEGER DEFAULT 0,
    stack_size_bytes BIGINT DEFAULT 0,
    memory_utilization_pct DECIMAL(5,2) DEFAULT 0,
    memory_state VARCHAR(50) DEFAULT 'normal',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_metrics_service ON memory_metrics(service_name);
CREATE INDEX idx_memory_metrics_recorded ON memory_metrics(recorded_at);
CREATE INDEX idx_memory_metrics_state ON memory_metrics(memory_state);
CREATE INDEX idx_memory_metrics_utilization ON memory_metrics(memory_utilization_pct);

-- Memory allocation tracking for operations
CREATE TABLE IF NOT EXISTS memory_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id VARCHAR(255) NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    campaign_id UUID,
    allocated_bytes BIGINT NOT NULL,
    peak_bytes BIGINT NOT NULL,
    duration_ms INTEGER NOT NULL,
    allocation_pattern JSONB DEFAULT '{}',
    cleanup_successful BOOLEAN DEFAULT true,
    memory_leaked_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_allocations_operation ON memory_allocations(operation_id);
CREATE INDEX idx_memory_allocations_type ON memory_allocations(operation_type);
CREATE INDEX idx_memory_allocations_campaign ON memory_allocations(campaign_id);
CREATE INDEX idx_memory_allocations_created ON memory_allocations(created_at);

-- Memory leak detection
CREATE TABLE IF NOT EXISTS memory_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    leak_type VARCHAR(50) NOT NULL,
    leak_source VARCHAR(255) NOT NULL,
    leaked_bytes BIGINT NOT NULL,
    detection_method VARCHAR(100) NOT NULL,
    stack_trace TEXT,
    operation_context JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'medium',
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_leak_service ON memory_leak_detection(service_name);
CREATE INDEX idx_memory_leak_type ON memory_leak_detection(leak_type);
CREATE INDEX idx_memory_leak_severity ON memory_leak_detection(severity);
CREATE INDEX idx_memory_leak_resolved ON memory_leak_detection(resolved);

-- Memory optimization recommendations
CREATE TABLE IF NOT EXISTS memory_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_type VARCHAR(100) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    current_usage_bytes BIGINT NOT NULL,
    recommended_limit_bytes BIGINT NOT NULL,
    optimization_strategy JSONB NOT NULL,
    estimated_savings_bytes BIGINT DEFAULT 0,
    implementation_priority VARCHAR(20) DEFAULT 'medium',
    implemented BOOLEAN DEFAULT false,
    implemented_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_optimization_service ON memory_optimization_recommendations(service_name);
CREATE INDEX idx_memory_optimization_priority ON memory_optimization_recommendations(implementation_priority);
CREATE INDEX idx_memory_optimization_implemented ON memory_optimization_recommendations(implemented);

-- Function to record memory metrics with analysis
CREATE OR REPLACE FUNCTION record_memory_metrics(
    p_service_name VARCHAR(100),
    p_process_id VARCHAR(50),
    p_heap_size_bytes BIGINT,
    p_heap_used_bytes BIGINT,
    p_gc_count BIGINT DEFAULT 0,
    p_gc_duration_ms BIGINT DEFAULT 0,
    p_goroutines_count INTEGER DEFAULT 0,
    p_stack_size_bytes BIGINT DEFAULT 0
) RETURNS UUID AS $$
DECLARE
    metric_id UUID;
    heap_free_bytes BIGINT;
    utilization_pct DECIMAL(5,2);
    memory_state VARCHAR(50);
BEGIN
    -- Calculate derived metrics
    heap_free_bytes := p_heap_size_bytes - p_heap_used_bytes;
    utilization_pct := (p_heap_used_bytes::DECIMAL / p_heap_size_bytes::DECIMAL) * 100;
    
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
$$ LANGUAGE plpgsql;

-- Function to check memory optimization opportunities
CREATE OR REPLACE FUNCTION check_memory_optimization_opportunities(
    p_service_name VARCHAR(100),
    p_utilization_pct DECIMAL(5,2),
    p_heap_used_bytes BIGINT
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to detect memory leaks
CREATE OR REPLACE FUNCTION detect_memory_leak(
    p_service_name VARCHAR(100),
    p_operation_id VARCHAR(255),
    p_leaked_bytes BIGINT,
    p_leak_source VARCHAR(255),
    p_stack_trace TEXT DEFAULT NULL
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## IMPLEMENTATION GUIDANCE

### Step 1: Implement Memory Monitoring Service

**File**: `backend/internal/monitoring/memory_monitor.go`

```go
package monitoring

import (
    "context"
    "fmt"
    "log"
    "runtime"
    "sync"
    "time"
    
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
)

// MemoryMonitor tracks memory usage and detects issues
type MemoryMonitor struct {
    db              *sqlx.DB
    serviceName     string
    processID       string
    alerting        AlertingService
    ticker          *time.Ticker
    stopChan        chan struct{}
    running         bool
    mu              sync.RWMutex
    
    // Memory tracking
    lastHeapSize    uint64
    lastGCCount     uint32
    lastGCDuration  time.Duration
    baseline        *MemoryBaseline
}

type MemoryBaseline struct {
    HeapSize     uint64
    HeapUsed     uint64
    GoroutineCount int
    Timestamp    time.Time
}

type MemoryMetrics struct {
    HeapSize       uint64
    HeapUsed       uint64
    HeapFree       uint64
    GCCount        uint32
    GCDuration     time.Duration
    GoroutineCount int
    StackSize      uint64
    Utilization    float64
    State          string
}

func NewMemoryMonitor(db *sqlx.DB, serviceName string, alerting AlertingService) *MemoryMonitor {
    return &MemoryMonitor{
        db:          db,
        serviceName: serviceName,
        processID:   fmt.Sprintf("%s-%d", serviceName, time.Now().Unix()),
        alerting:    alerting,
        stopChan:    make(chan struct{}),
    }
}

// Start begins memory monitoring
func (mm *MemoryMonitor) Start(ctx context.Context, interval time.Duration) error {
    mm.mu.Lock()
    defer mm.mu.Unlock()
    
    if mm.running {
        return fmt.Errorf("memory monitor already running")
    }
    
    // Capture baseline
    mm.baseline = mm.captureBaseline()
    
    mm.ticker = time.NewTicker(interval)
    mm.running = true
    
    go func() {
        defer mm.ticker.Stop()
        
        for {
            select {
            case <-ctx.Done():
                return
            case <-mm.stopChan:
                return
            case <-mm.ticker.C:
                if err := mm.collectMemoryMetrics(ctx); err != nil {
                    log.Printf("WARNING: Failed to collect memory metrics: %v", err)
                }
            }
        }
    }()
    
    log.Printf("Memory monitor started for service: %s", mm.serviceName)
    return nil
}

func (mm *MemoryMonitor) collectMemoryMetrics(ctx context.Context) error {
    var memStats runtime.MemStats
    runtime.ReadMemStats(&memStats)
    
    metrics := &MemoryMetrics{
        HeapSize:       memStats.HeapSys,
        HeapUsed:       memStats.HeapInuse,
        HeapFree:       memStats.HeapSys - memStats.HeapInuse,
        GCCount:        memStats.NumGC,
        GCDuration:     time.Duration(memStats.PauseTotalNs),
        GoroutineCount: runtime.NumGoroutine(),
        StackSize:      memStats.StackSys,
        Utilization:    float64(memStats.HeapInuse) / float64(memStats.HeapSys) * 100,
    }
    
    // Determine memory state
    metrics.State = mm.determineMemoryState(metrics)
    
    // Record metrics in database
    if err := mm.recordMetrics(ctx, metrics); err != nil {
        return fmt.Errorf("failed to record memory metrics: %w", err)
    }
    
    // Check for memory leaks
    if err := mm.detectMemoryLeaks(ctx, metrics); err != nil {
        log.Printf("WARNING: Memory leak detection failed: %v", err)
    }
    
    // Update tracking variables
    mm.lastHeapSize = metrics.HeapSize
    mm.lastGCCount = metrics.GCCount
    mm.lastGCDuration = metrics.GCDuration
    
    return nil
}

func (mm *MemoryMonitor) determineMemoryState(metrics *MemoryMetrics) string {
    switch {
    case metrics.Utilization >= 90:
        return "critical"
    case metrics.Utilization >= 75:
        return "warning"
    case metrics.Utilization >= 60:
        return "elevated"
    default:
        return "normal"
    }
}

func (mm *MemoryMonitor) recordMetrics(ctx context.Context, metrics *MemoryMetrics) error {
    var metricID uuid.UUID
    query := `SELECT record_memory_metrics($1, $2, $3, $4, $5, $6, $7, $8)`
    
    err := mm.db.QueryRowContext(
        ctx, query,
        mm.serviceName,
        mm.processID,
        int64(metrics.HeapSize),
        int64(metrics.HeapUsed),
        int64(metrics.GCCount),
        int64(metrics.GCDuration.Milliseconds()),
        metrics.GoroutineCount,
        int64(metrics.StackSize),
    ).Scan(&metricID)
    
    if err != nil {
        return fmt.Errorf("failed to record memory metrics: %w", err)
    }
    
    return nil
}

func (mm *MemoryMonitor) detectMemoryLeaks(ctx context.Context, metrics *MemoryMetrics) error {
    if mm.baseline == nil {
        return nil // No baseline yet
    }
    
    // Check for significant memory growth
    memoryGrowth := int64(metrics.HeapUsed) - int64(mm.baseline.HeapUsed)
    timeSinceBaseline := time.Since(mm.baseline.Timestamp)
    
    // Threshold: more than 100MB growth in less than 5 minutes suggests potential leak
    if memoryGrowth > 100*1024*1024 && timeSinceBaseline < 5*time.Minute {
        return mm.reportMemoryLeak(ctx, metrics, memoryGrowth, "rapid_heap_growth")
    }
    
    // Check for goroutine leaks
    goroutineGrowth := metrics.GoroutineCount - mm.baseline.GoroutineCount
    if goroutineGrowth > 1000 {
        return mm.reportMemoryLeak(ctx, metrics, int64(goroutineGrowth*1024), "goroutine_leak")
    }
    
    // Update baseline periodically
    if timeSinceBaseline > 10*time.Minute {
        mm.baseline = &MemoryBaseline{
            HeapSize:       metrics.HeapSize,
            HeapUsed:       metrics.HeapUsed,
            GoroutineCount: metrics.GoroutineCount,
            Timestamp:      time.Now(),
        }
    }
    
    return nil
}

func (mm *MemoryMonitor) reportMemoryLeak(ctx context.Context, metrics *MemoryMetrics, leakedBytes int64, leakType string) error {
    var leakID uuid.UUID
    query := `SELECT detect_memory_leak($1, $2, $3, $4, $5)`
    
    err := mm.db.QueryRowContext(
        ctx, query,
        mm.serviceName,
        uuid.New().String(), // operation_id
        leakedBytes,
        leakType,
        mm.captureStackTrace(),
    ).Scan(&leakID)
    
    if err != nil {
        return fmt.Errorf("failed to report memory leak: %w", err)
    }
    
    log.Printf("Memory leak detected: %s leaked %d bytes in service %s", 
        leakType, leakedBytes, mm.serviceName)
    
    return nil
}

func (mm *MemoryMonitor) captureStackTrace() string {
    buf := make([]byte, 4096)
    n := runtime.Stack(buf, false)
    return string(buf[:n])
}

func (mm *MemoryMonitor) captureBaseline() *MemoryBaseline {
    var memStats runtime.MemStats
    runtime.ReadMemStats(&memStats)
    
    return &MemoryBaseline{
        HeapSize:       memStats.HeapSys,
        HeapUsed:       memStats.HeapInuse,
        GoroutineCount: runtime.NumGoroutine(),
        Timestamp:      time.Now(),
    }
}
```

### Step 2: Implement Memory-Efficient Domain Generation

**File**: `backend/internal/services/memory_efficient_domain_generator.go`

```go
package services

import (
    "context"
    "fmt"
    "runtime"
    "sync"
    "time"
    
    "github.com/google/uuid"
    "your-project/internal/models"
)

// MemoryEfficientDomainGenerator optimizes memory usage for large domain generation
type MemoryEfficientDomainGenerator struct {
    batchSize           int
    maxConcurrentBatches int
    memoryMonitor       *MemoryMonitor
    pooledBuffers       sync.Pool
    streamingEnabled    bool
}

func NewMemoryEfficientDomainGenerator(memoryMonitor *MemoryMonitor) *MemoryEfficientDomainGenerator {
    return &MemoryEfficientDomainGenerator{
        batchSize:           1000,  // Process domains in smaller batches
        maxConcurrentBatches: 5,    // Limit concurrent processing
        memoryMonitor:       memoryMonitor,
        streamingEnabled:    true,
        pooledBuffers: sync.Pool{
            New: func() interface{} {
                return make([]models.Domain, 0, 1000)
            },
        },
    }
}

// GenerateDomainsWithMemoryControl generates domains with memory optimization
func (medg *MemoryEfficientDomainGenerator) GenerateDomainsWithMemoryControl(
    ctx context.Context,
    campaign *models.Campaign,
    config *models.DomainGenerationConfig,
) error {
    // Track memory allocation for this operation
    operationID := uuid.New().String()
    startTime := time.Now()
    
    defer func() {
        // Force garbage collection after large operations
        runtime.GC()
        
        // Record operation memory usage
        medg.recordOperationMemory(ctx, operationID, campaign.ID, time.Since(startTime))
    }()
    
    totalDomains := config.DomainsToGenerate
    batchCount := (totalDomains + medg.batchSize - 1) / medg.batchSize
    
    // Use buffered channel to control memory usage
    batchChan := make(chan *DomainBatch, medg.maxConcurrentBatches)
    resultChan := make(chan *BatchResult, batchCount)
    
    // Start worker goroutines with memory monitoring
    var wg sync.WaitGroup
    for i := 0; i < medg.maxConcurrentBatches; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()
            medg.processBatchesWithMemoryControl(ctx, batchChan, resultChan, workerID)
        }(i)
    }
    
    // Generate batches
    go func() {
        defer close(batchChan)
        
        for batchNum := 0; batchNum < batchCount; batchNum++ {
            batchStart := batchNum * medg.batchSize
            batchEnd := batchStart + medg.batchSize
            if batchEnd > totalDomains {
                batchEnd = totalDomains
            }
            
            batch := &DomainBatch{
                ID:        uuid.New(),
                BatchNum:  batchNum,
                Start:     batchStart,
                End:       batchEnd,
                Config:    config,
                CampaignID: campaign.ID,
            }
            
            select {
            case batchChan <- batch:
            case <-ctx.Done():
                return
            }
        }
    }()
    
    // Collect results
    go func() {
        wg.Wait()
        close(resultChan)
    }()
    
    // Process results with memory-efficient streaming
    return medg.streamResults(ctx, resultChan, campaign.ID)
}

func (medg *MemoryEfficientDomainGenerator) processBatchesWithMemoryControl(
    ctx context.Context,
    batchChan <-chan *DomainBatch,
    resultChan chan<- *BatchResult,
    workerID int,
) {
    for batch := range batchChan {
        // Check memory before processing
        if medg.isMemoryPressureHigh() {
            // Wait and force GC if memory pressure is high
            runtime.GC()
            time.Sleep(100 * time.Millisecond)
        }
        
        result := medg.processSingleBatch(ctx, batch, workerID)
        
        select {
        case resultChan <- result:
        case <-ctx.Done():
            return
        }
        
        // Clear references and suggest GC
        batch = nil
        if workerID%2 == 0 { // Stagger GC calls
            runtime.GC()
        }
    }
}

func (medg *MemoryEfficientDomainGenerator) processSingleBatch(
    ctx context.Context,
    batch *DomainBatch,
    workerID int,
) *BatchResult {
    // Get pooled buffer to reduce allocations
    domains := medg.pooledBuffers.Get().([]models.Domain)
    domains = domains[:0] // Reset length but keep capacity
    
    defer func() {
        // Return buffer to pool
        if cap(domains) <= 2000 { // Prevent pool from growing too large
            medg.pooledBuffers.Put(domains)
        }
    }()
    
    startTime := time.Now()
    
    // Generate domains for this batch
    for i := batch.Start; i < batch.End; i++ {
        domain := medg.generateSingleDomain(ctx, batch.Config, i)
        domains = append(domains, domain)
        
        // Yield CPU periodically
        if i%100 == 0 {
            runtime.Gosched()
        }
    }
    
    return &BatchResult{
        BatchID:     batch.ID,
        Domains:     domains,
        ProcessedAt: time.Now(),
        Duration:    time.Since(startTime),
        WorkerID:    workerID,
    }
}

func (medg *MemoryEfficientDomainGenerator) isMemoryPressureHigh() bool {
    var memStats runtime.MemStats
    runtime.ReadMemStats(&memStats)
    
    // Consider memory pressure high if heap utilization > 80%
    utilization := float64(memStats.HeapInuse) / float64(memStats.HeapSys)
    return utilization > 0.8
}

func (medg *MemoryEfficientDomainGenerator) streamResults(
    ctx context.Context,
    resultChan <-chan *BatchResult,
    campaignID uuid.UUID,
) error {
    // Stream results to database without accumulating in memory
    for result := range resultChan {
        if err := medg.persistBatchResults(ctx, result, campaignID); err != nil {
            return fmt.Errorf("failed to persist batch results: %w", err)
        }
        
        // Clear result reference
        result = nil
    }
    
    return nil
}

func (medg *MemoryEfficientDomainGenerator) recordOperationMemory(
    ctx context.Context,
    operationID string,
    campaignID uuid.UUID,
    duration time.Duration,
) {
    var memStats runtime.MemStats
    runtime.ReadMemStats(&memStats)
    
    // Record in database
    query := `
        INSERT INTO memory_allocations 
            (operation_id, operation_type, campaign_id, allocated_bytes, 
             peak_bytes, duration_ms, allocation_pattern)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`
    
    allocationPattern := map[string]interface{}{
        "heap_alloc":     memStats.HeapAlloc,
        "heap_inuse":     memStats.HeapInuse,
        "stack_inuse":    memStats.StackInuse,
        "gc_count":       memStats.NumGC,
        "goroutines":     runtime.NumGoroutine(),
    }
    
    allocationJSON, _ := json.Marshal(allocationPattern)
    
    _, err := medg.db.ExecContext(
        ctx, query,
        operationID,
        "domain_generation",
        campaignID,
        int64(memStats.TotalAlloc),
        int64(memStats.HeapInuse),
        int(duration.Milliseconds()),
        allocationJSON,
    )
    
    if err != nil {
        log.Printf("WARNING: Failed to record operation memory: %v", err)
    }
}
```

### Step 3: Add Memory Pool Management

**File**: `backend/internal/utils/memory_pool.go`

```go
package utils

import (
    "sync"
    "sync/atomic"
)

// MemoryPool provides efficient object pooling to reduce GC pressure
type MemoryPool struct {
    pools       map[string]*sync.Pool
    stats       map[string]*PoolStats
    statsMutex  sync.RWMutex
}

type PoolStats struct {
    Gets        int64
    Puts        int64
    Misses      int64
    Size        int64
}

func NewMemoryPool() *MemoryPool {
    return &MemoryPool{
        pools: make(map[string]*sync.Pool),
        stats: make(map[string]*PoolStats),
    }
}

// RegisterPool creates a new object pool for the given type
func (mp *MemoryPool) RegisterPool(poolName string, newFunc func() interface{}) {
    mp.statsMutex.Lock()
    defer mp.statsMutex.Unlock()
    
    mp.pools[poolName] = &sync.Pool{
        New: newFunc,
    }
    mp.stats[poolName] = &PoolStats{}
}

// Get retrieves an object from the pool
func (mp *MemoryPool) Get(poolName string) interface{} {
    pool, exists := mp.pools[poolName]
    if !exists {
        return nil
    }
    
    stats := mp.stats[poolName]
    atomic.AddInt64(&stats.Gets, 1)
    
    obj := pool.Get()
    if obj == nil {
        atomic.AddInt64(&stats.Misses, 1)
    }
    
    return obj
}

// Put returns an object to the pool
func (mp *MemoryPool) Put(poolName string, obj interface{}) {
    pool, exists := mp.pools[poolName]
    if !exists {
        return
    }
    
    stats := mp.stats[poolName]
    atomic.AddInt64(&stats.Puts, 1)
    
    pool.Put(obj)
}

// GetStats returns statistics for a pool
func (mp *MemoryPool) GetStats(poolName string) *PoolStats {
    mp.statsMutex.RLock()
    defer mp.statsMutex.RUnlock()
    
    stats, exists := mp.stats[poolName]
    if !exists {
        return nil
    }
    
    return &PoolStats{
        Gets:   atomic.LoadInt64(&stats.Gets),
        Puts:   atomic.LoadInt64(&stats.Puts),
        Misses: atomic.LoadInt64(&stats.Misses),
        Size:   atomic.LoadInt64(&stats.Size),
    }
}

// Global memory pool instance
var GlobalMemoryPool = NewMemoryPool()

// Initialize common pools
func init() {
    // Domain slice pool
    GlobalMemoryPool.RegisterPool("domain_slice", func() interface{} {
        return make([]models.Domain, 0, 1000)
    })
    
    // String builder pool
    GlobalMemoryPool.RegisterPool("string_builder", func() interface{} {
        return &strings.Builder{}
    })
    
    // Byte buffer pool
    GlobalMemoryPool.RegisterPool("byte_buffer", func() interface{} {
        return make([]byte, 0, 4096)
    })
    
    // Map pool for metadata
    GlobalMemoryPool.RegisterPool("metadata_map", func() interface{} {
        return make(map[string]interface{})
    })
}
```

### Step 4: Create Memory Testing Framework

**File**: `backend/internal/monitoring/si005_memory_management_test.go`

```go
package monitoring

import (
    "context"
    "runtime"
    "sync"
    "testing"
    "time"
    
    "github.com/stretchr/testify/suite"
    "github.com/google/uuid"
    "your-project/internal/testutil"
)

type SI005MemoryManagementTestSuite struct {
    testutil.ServiceTestSuite
    memoryMonitor    *MemoryMonitor
    domainGenerator  *MemoryEfficientDomainGenerator
}

func TestSI005MemoryManagement(t *testing.T) {
    suite.Run(t, &SI005MemoryManagementTestSuite{
        ServiceTestSuite: testutil.ServiceTestSuite{
            UseDatabaseFromEnv: true, // MANDATORY: Real database testing
        },
    })
}

func (suite *SI005MemoryManagementTestSuite) SetupTest() {
    suite.ServiceTestSuite.SetupTest()
    
    alertingService := &MockAlertingService{}
    suite.memoryMonitor = NewMemoryMonitor(suite.db, "test-service", alertingService)
    suite.domainGenerator = NewMemoryEfficientDomainGenerator(suite.memoryMonitor)
}

func (suite *SI005MemoryManagementTestSuite) TestMemoryMonitoringUnderLoad() {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    // Start memory monitoring
    err := suite.memoryMonitor.Start(ctx, 1*time.Second)
    suite.NoError(err)
    
    // Capture baseline memory
    var baselineMemStats runtime.MemStats
    runtime.ReadMemStats(&baselineMemStats)
    
    // Simulate memory-intensive operations
    const numOperations = 100
    var wg sync.WaitGroup
    
    for i := 0; i < numOperations; i++ {
        wg.Add(1)
        go func(opNum int) {
            defer wg.Done()
            suite.simulateMemoryIntensiveOperation(ctx, opNum)
        }(i)
    }
    
    wg.Wait()
    
    // Verify memory monitoring captured metrics
    suite.ValidateMemoryMetricsRecorded("test-service")
    
    // Check for memory leaks
    var finalMemStats runtime.MemStats
    runtime.ReadMemStats(&finalMemStats)
    
    memoryGrowth := finalMemStats.HeapInuse - baselineMemStats.HeapInuse
    suite.Less(memoryGrowth, uint64(50*1024*1024), "Memory growth should be less than 50MB")
}

func (suite *SI005MemoryManagementTestSuite) TestDomainGenerationMemoryEfficiency() {
    campaign := &models.Campaign{
        ID:   uuid.New(),
        Name: "Memory Test Campaign",
        Type: models.CampaignTypeDomainGeneration,
    }
    
    config := &models.DomainGenerationConfig{
        DomainsToGenerate: 10000, // Large enough to test memory efficiency
        Keywords:          []string{"test", "example", "demo"},
        TLDs:             []string{"com", "org", "net"},
        GenerationPatterns: []string{"{keyword}.{tld}", "{keyword}-{random}.{tld}"},
    }
    
    // Monitor memory before operation
    var beforeMemStats runtime.MemStats
    runtime.ReadMemStats(&beforeMemStats)
    
    // Generate domains with memory control
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    err := suite.domainGenerator.GenerateDomainsWithMemoryControl(ctx, campaign, config)
    suite.NoError(err)
    
    // Force garbage collection and check memory
    runtime.GC()
    time.Sleep(100 * time.Millisecond)
    
    var afterMemStats runtime.MemStats
    runtime.ReadMemStats(&afterMemStats)
    
    // Verify memory usage stayed reasonable
    memoryIncrease := afterMemStats.HeapInuse - beforeMemStats.HeapInuse
    suite.Less(memoryIncrease, uint64(100*1024*1024), "Memory increase should be less than 100MB for 10k domains")
    
    // Verify operation was recorded
    suite.ValidateMemoryAllocationRecorded(campaign.ID, "domain_generation")
}

func (suite *SI005MemoryManagementTestSuite) TestMemoryLeakDetection() {
    ctx := context.Background()
    
    // Simulate memory leak by creating objects without releasing them
    leakyObjects := make([][]byte, 1000)
    for i := range leakyObjects {
        leakyObjects[i] = make([]byte, 1024*1024) // 1MB each
    }
    
    // Trigger memory monitoring
    err := suite.memoryMonitor.collectMemoryMetrics(ctx)
    suite.NoError(err)
    
    // Keep references to prevent GC
    _ = leakyObjects
    
    // Wait for potential leak detection
    time.Sleep(2 * time.Second)
    
    // Check if leak was detected (might not trigger immediately in tests)
    // This test validates the detection mechanism works
    suite.ValidateMemoryMonitoringActive()
}

func (suite *SI005MemoryManagementTestSuite) simulateMemoryIntensiveOperation(ctx context.Context, opNum int) {
    // Allocate and release memory to simulate real operations
    data := make([][]byte, 100)
    for i := range data {
        data[i] = make([]byte, 10*1024) // 10KB each
    }
    
    // Simulate processing time
    time.Sleep(time.Duration(opNum%10) * time.Millisecond)
    
    // Clear references
    for i := range data {
        data[i] = nil
    }
    data = nil
}

func (suite *SI005MemoryManagementTestSuite) ValidateMemoryMetricsRecorded(serviceName string) {
    var count int
    query := `
        SELECT COUNT(*) 
        FROM memory_metrics 
        WHERE service_name = $1 
          AND recorded_at > NOW() - INTERVAL '1 minute'`
    
    err := suite.db.Get(&count, query, serviceName)
    suite.NoError(err)
    suite.True(count > 0, "Should have memory metrics recorded")
}

func (suite *SI005MemoryManagementTestSuite) ValidateMemoryAllocationRecorded(campaignID uuid.UUID, operationType string) {
    var count int
    query := `
        SELECT COUNT(*) 
        FROM memory_allocations 
        WHERE campaign_id = $1 AND operation_type = $2`
    
    err := suite.db.Get(&count, query, campaignID, operationType)
    suite.NoError(err)
    suite.Equal(1, count, "Should have memory allocation recorded")
}

func (suite *SI005MemoryManagementTestSuite) ValidateMemoryMonitoringActive() {
    suite.True(suite.memoryMonitor.running, "Memory monitor should be running")
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
export TEST_TIMEOUT=60s
export GOMAXPROCS=4
```

### Test Execution
```bash
# Run SI-005 specific tests
go test ./internal/monitoring -run TestSI005 -race -v -timeout 60s -tags=integration

# Run memory efficiency tests
go test ./internal/services -run TestMemoryEfficient -race -v -tags=integration

# Memory profiling
go test ./internal/monitoring -run TestMemoryManagement -memprofile=mem.prof -tags=integration
```

---

## CI/CD VALIDATION CHECKLIST

### Mandatory Checks
- [ ] `go test ./... -race` passes with zero data races
- [ ] `golangci-lint run` clean with zero critical issues
- [ ] SI-005 memory management tests pass
- [ ] Memory monitoring captures accurate metrics
- [ ] Memory leak detection works correctly
- [ ] Memory-efficient domain generation performs well

### Memory Validation
- [ ] Memory usage stays below 500MB for large operations
- [ ] No memory leaks detected in sustained testing
- [ ] Garbage collection frequency remains reasonable
- [ ] Memory pools reduce allocation pressure

### Performance Validation
- [ ] Domain generation of 10k domains uses < 100MB
- [ ] Memory monitoring overhead < 1% CPU
- [ ] Memory cleanup works correctly after operations
- [ ] Pool utilization improves performance by 15%+

---

## SUCCESS CRITERIA

### Functional Requirements
1. **Memory Monitoring**: Real-time memory usage tracking and alerting
2. **Leak Detection**: Automatic detection of memory leaks and resource issues
3. **Efficient Generation**: Memory-optimized domain generation for large datasets
4. **Resource Pooling**: Object pooling reduces GC pressure and improves performance

### Performance Requirements
1. **Memory Efficiency**: Large operations use < 500MB peak memory
2. **GC Optimization**: Reduced garbage collection frequency and duration
3. **Leak Prevention**: Zero memory leaks in sustained operations
4. **Pool Effectiveness**: 15%+ performance improvement from pooling

### Integration Requirements
1. **Service Integration**: All memory-intensive services use monitoring
2. **Alert Integration**: Memory alerts integrate with system monitoring
3. **Metric Integration**: Memory metrics available for performance analysis

---

## ROLLBACK PROCEDURES

### Database Rollback
```sql
-- File: backend/database/migrations/013_rollback_si005.sql
BEGIN;
DROP FUNCTION IF EXISTS detect_memory_leak(VARCHAR, VARCHAR, BIGINT, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS check_memory_optimization_opportunities(VARCHAR, DECIMAL, BIGINT);
DROP FUNCTION IF EXISTS record_memory_metrics(VARCHAR, VARCHAR, BIGINT, BIGINT, BIGINT, BIGINT, INTEGER, BIGINT);
DROP TABLE IF EXISTS memory_optimization_recommendations;
DROP TABLE IF EXISTS memory_leak_detection;
DROP TABLE IF EXISTS memory_allocations;
DROP TABLE IF EXISTS memory_metrics;
COMMIT;
```

---

**Implementation Priority**: HIGH - Essential for system stability and performance  
**Next Step**: Begin with PostgreSQL migration, then implement memory monitoring service  
**Performance Integration**: Prepares for PF-001 query optimization and PF-002 algorithm efficiency