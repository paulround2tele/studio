# SI-004: DATABASE CONNECTION POOL EXHAUSTION - TACTICAL PLAN

**Finding ID**: SI-004  
**Priority**: HIGH  
**Phase**: 2C Performance  
**Estimated Effort**: 3-4 days  
**Dependencies**: ✅ Phase 2A Foundation, ✅ Phase 2B Security complete

---

## FINDING OVERVIEW

**Problem Statement**: Database connection pool exhaustion under high load causing application timeouts and performance degradation.

**Root Cause**: Insufficient connection pool configuration, connection leaks in transaction handling, and lack of connection pool monitoring leading to resource starvation under concurrent load.

**Impact**: 
- Application timeouts during peak usage periods
- Degraded response times for database operations
- Failed campaign operations due to connection unavailability
- Potential service outages under sustained high load

**Integration Points**: 
- Builds on SI-001 enhanced transaction management patterns
- Integrates with existing [`transaction_helpers.go`](../../../backend/internal/store/postgres/transaction_helpers.go:1)
- Enhances database metrics and monitoring systems
- Connects to campaign orchestrator and worker services

---

## POSTGRESQL MIGRATION

**File**: `backend/database/migrations/012_si004_connection_pool_monitoring.sql`

```sql
BEGIN;

-- Connection pool metrics and monitoring
CREATE TABLE IF NOT EXISTS connection_pool_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_name VARCHAR(100) NOT NULL,
    active_connections INTEGER NOT NULL,
    idle_connections INTEGER NOT NULL,
    max_connections INTEGER NOT NULL,
    total_connections INTEGER NOT NULL,
    connections_in_use INTEGER NOT NULL,
    wait_count INTEGER DEFAULT 0,
    wait_duration_ms INTEGER DEFAULT 0,
    connection_errors INTEGER DEFAULT 0,
    pool_state VARCHAR(50) DEFAULT 'healthy',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connection_pool_metrics_pool ON connection_pool_metrics(pool_name);
CREATE INDEX idx_connection_pool_metrics_recorded ON connection_pool_metrics(recorded_at);
CREATE INDEX idx_connection_pool_metrics_state ON connection_pool_metrics(pool_state);

-- Connection leak detection tracking
CREATE TABLE IF NOT EXISTS connection_leak_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id VARCHAR(255) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL,
    acquired_by VARCHAR(255) NOT NULL,
    operation_context JSONB DEFAULT '{}',
    stack_trace TEXT,
    is_leaked BOOLEAN DEFAULT false,
    leak_detected_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    duration_held_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connection_leak_connection ON connection_leak_detection(connection_id);
CREATE INDEX idx_connection_leak_acquired ON connection_leak_detection(acquired_at);
CREATE INDEX idx_connection_leak_leaked ON connection_leak_detection(is_leaked);

-- Connection pool alerts configuration
CREATE TABLE IF NOT EXISTS connection_pool_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    threshold_value INTEGER NOT NULL,
    alert_enabled BOOLEAN DEFAULT true,
    alert_message TEXT NOT NULL,
    severity_level VARCHAR(20) DEFAULT 'warning',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(alert_type)
);

-- Insert default alert configurations
INSERT INTO connection_pool_alerts (alert_type, threshold_value, alert_message, severity_level) VALUES
    ('high_utilization', 80, 'Connection pool utilization above 80%', 'warning'),
    ('critical_utilization', 95, 'Connection pool utilization above 95%', 'critical'),
    ('connection_wait', 1000, 'Connection wait time exceeding 1 second', 'warning'),
    ('connection_errors', 10, 'More than 10 connection errors per minute', 'error'),
    ('leaked_connections', 5, 'Detected connection leaks', 'error');

-- Function to record connection pool metrics
CREATE OR REPLACE FUNCTION record_connection_pool_metrics(
    p_pool_name VARCHAR(100),
    p_active_connections INTEGER,
    p_idle_connections INTEGER,
    p_max_connections INTEGER,
    p_wait_count INTEGER DEFAULT 0,
    p_wait_duration_ms INTEGER DEFAULT 0,
    p_connection_errors INTEGER DEFAULT 0
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to check connection pool alerts
CREATE OR REPLACE FUNCTION check_connection_pool_alerts(
    p_pool_name VARCHAR(100),
    p_utilization_pct INTEGER,
    p_wait_duration_ms INTEGER,
    p_connection_errors INTEGER
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Create system_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_created ON system_alerts(created_at);

COMMIT;
```

---

## IMPLEMENTATION GUIDANCE

### Step 1: Enhance Database Connection Pool Configuration

**File**: `backend/internal/config/database_config.go`

```go
package config

import (
    "time"
    
    "github.com/jmoiron/sqlx"
    _ "github.com/lib/pq"
)

// DatabasePoolConfig provides optimized connection pool configuration
type DatabasePoolConfig struct {
    MaxOpenConnections     int           `json:"max_open_connections"`
    MaxIdleConnections     int           `json:"max_idle_connections"`
    ConnectionMaxLifetime  time.Duration `json:"connection_max_lifetime"`
    ConnectionMaxIdleTime  time.Duration `json:"connection_max_idle_time"`
    ConnectionTimeout      time.Duration `json:"connection_timeout"`
    EnableMetrics         bool          `json:"enable_metrics"`
    MetricsInterval       time.Duration `json:"metrics_interval"`
    LeakDetectionEnabled  bool          `json:"leak_detection_enabled"`
    LeakDetectionTimeout  time.Duration `json:"leak_detection_timeout"`
}

// OptimizedDatabasePoolConfig returns production-optimized pool settings
func OptimizedDatabasePoolConfig() *DatabasePoolConfig {
    return &DatabasePoolConfig{
        MaxOpenConnections:    50,  // Increased from default
        MaxIdleConnections:    10,  // Reasonable idle pool
        ConnectionMaxLifetime: 30 * time.Minute, // Prevent stale connections
        ConnectionMaxIdleTime: 5 * time.Minute,  // Close idle connections
        ConnectionTimeout:     30 * time.Second, // Connection acquisition timeout
        EnableMetrics:         true,
        MetricsInterval:       30 * time.Second,
        LeakDetectionEnabled:  true,
        LeakDetectionTimeout:  10 * time.Minute,
    }
}

// ConfigureDatabase applies optimized configuration to database connection
func (dpc *DatabasePoolConfig) ConfigureDatabase(db *sqlx.DB) {
    db.SetMaxOpenConns(dpc.MaxOpenConnections)
    db.SetMaxIdleConns(dpc.MaxIdleConnections)
    db.SetConnMaxLifetime(dpc.ConnectionMaxLifetime)
    db.SetConnMaxIdleTime(dpc.ConnectionMaxIdleTime)
}

// LoadTestDatabasePoolConfig provides configuration for load testing
func LoadTestDatabasePoolConfig() *DatabasePoolConfig {
    return &DatabasePoolConfig{
        MaxOpenConnections:    100, // Higher for load testing
        MaxIdleConnections:    20,
        ConnectionMaxLifetime: 15 * time.Minute,
        ConnectionMaxIdleTime: 2 * time.Minute,
        ConnectionTimeout:     10 * time.Second,
        EnableMetrics:         true,
        MetricsInterval:       10 * time.Second,
        LeakDetectionEnabled:  true,
        LeakDetectionTimeout:  5 * time.Minute,
    }
}
```

### Step 2: Implement Connection Pool Monitoring

**File**: `backend/internal/monitoring/connection_pool_monitor.go`

```go
package monitoring

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    "sync"
    "time"
    
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
)

// ConnectionPoolMonitor monitors database connection pool health
type ConnectionPoolMonitor struct {
    db              *sqlx.DB
    poolName        string
    config          *DatabasePoolConfig
    metrics         *ConnectionPoolMetrics
    alerting        AlertingService
    ticker          *time.Ticker
    stopChan        chan struct{}
    running         bool
    mu              sync.RWMutex
}

type ConnectionPoolMetrics struct {
    ActiveConnections  int
    IdleConnections    int
    MaxConnections     int
    WaitCount         int64
    WaitDuration      time.Duration
    ConnectionErrors  int64
    LastUpdate        time.Time
    mu                sync.RWMutex
}

func NewConnectionPoolMonitor(
    db *sqlx.DB, 
    poolName string, 
    config *DatabasePoolConfig,
    alerting AlertingService,
) *ConnectionPoolMonitor {
    return &ConnectionPoolMonitor{
        db:       db,
        poolName: poolName,
        config:   config,
        metrics:  &ConnectionPoolMetrics{},
        alerting: alerting,
        stopChan: make(chan struct{}),
    }
}

// Start begins connection pool monitoring
func (cpm *ConnectionPoolMonitor) Start(ctx context.Context) error {
    cpm.mu.Lock()
    defer cpm.mu.Unlock()
    
    if cpm.running {
        return fmt.Errorf("connection pool monitor already running")
    }
    
    cpm.ticker = time.NewTicker(cpm.config.MetricsInterval)
    cpm.running = true
    
    go func() {
        defer cpm.ticker.Stop()
        
        for {
            select {
            case <-ctx.Done():
                return
            case <-cpm.stopChan:
                return
            case <-cpm.ticker.C:
                if err := cpm.collectMetrics(ctx); err != nil {
                    log.Printf("WARNING: Failed to collect connection pool metrics: %v", err)
                }
            }
        }
    }()
    
    log.Printf("Connection pool monitor started for pool: %s", cpm.poolName)
    return nil
}

func (cpm *ConnectionPoolMonitor) collectMetrics(ctx context.Context) error {
    stats := cpm.db.Stats()
    
    // Update metrics
    cpm.metrics.mu.Lock()
    cpm.metrics.ActiveConnections = stats.OpenConnections - stats.Idle
    cpm.metrics.IdleConnections = stats.Idle
    cpm.metrics.MaxConnections = stats.MaxOpenConnections
    cpm.metrics.WaitCount = stats.WaitCount
    cpm.metrics.WaitDuration = stats.WaitDuration
    cpm.metrics.LastUpdate = time.Now()
    cpm.metrics.mu.Unlock()
    
    // Record metrics in database
    return cpm.recordMetrics(ctx)
}

func (cpm *ConnectionPoolMonitor) recordMetrics(ctx context.Context) error {
    cpm.metrics.mu.RLock()
    defer cpm.metrics.mu.RUnlock()
    
    var metricID uuid.UUID
    query := `SELECT record_connection_pool_metrics($1, $2, $3, $4, $5, $6, $7)`
    
    err := cpm.db.QueryRowContext(
        ctx, query,
        cpm.poolName,
        cpm.metrics.ActiveConnections,
        cpm.metrics.IdleConnections,
        cpm.metrics.MaxConnections,
        int(cpm.metrics.WaitCount),
        int(cpm.metrics.WaitDuration.Milliseconds()),
        int(cpm.metrics.ConnectionErrors),
    ).Scan(&metricID)
    
    if err != nil {
        return fmt.Errorf("failed to record connection pool metrics: %w", err)
    }
    
    // Check for alerts
    if err := cpm.checkAlerts(); err != nil {
        log.Printf("WARNING: Failed to check connection pool alerts: %v", err)
    }
    
    return nil
}

func (cpm *ConnectionPoolMonitor) checkAlerts() error {
    cpm.metrics.mu.RLock()
    defer cpm.metrics.mu.RUnlock()
    
    totalConnections := cpm.metrics.ActiveConnections + cpm.metrics.IdleConnections
    utilizationPct := (totalConnections * 100) / cpm.metrics.MaxConnections
    
    // High utilization alert
    if utilizationPct >= 80 {
        severity := "warning"
        if utilizationPct >= 95 {
            severity = "critical"
        }
        
        alert := &Alert{
            Type:     "connection_pool_utilization",
            Severity: severity,
            Message:  fmt.Sprintf("Connection pool %s utilization at %d%%", cpm.poolName, utilizationPct),
            Context: map[string]interface{}{
                "pool_name":         cpm.poolName,
                "utilization_pct":   utilizationPct,
                "active_connections": cpm.metrics.ActiveConnections,
                "max_connections":   cpm.metrics.MaxConnections,
            },
        }
        
        if err := cpm.alerting.SendAlert(alert); err != nil {
            return fmt.Errorf("failed to send utilization alert: %w", err)
        }
    }
    
    // Wait time alert
    if cpm.metrics.WaitDuration > time.Second {
        alert := &Alert{
            Type:     "connection_wait_time",
            Severity: "warning",
            Message:  fmt.Sprintf("Connection wait time %v for pool %s", cpm.metrics.WaitDuration, cpm.poolName),
            Context: map[string]interface{}{
                "pool_name":     cpm.poolName,
                "wait_duration": cpm.metrics.WaitDuration.String(),
                "wait_count":    cpm.metrics.WaitCount,
            },
        }
        
        if err := cpm.alerting.SendAlert(alert); err != nil {
            return fmt.Errorf("failed to send wait time alert: %w", err)
        }
    }
    
    return nil
}

// GetMetrics returns current connection pool metrics
func (cpm *ConnectionPoolMonitor) GetMetrics() *ConnectionPoolMetrics {
    cpm.metrics.mu.RLock()
    defer cpm.metrics.mu.RUnlock()
    
    return &ConnectionPoolMetrics{
        ActiveConnections: cpm.metrics.ActiveConnections,
        IdleConnections:   cpm.metrics.IdleConnections,
        MaxConnections:    cpm.metrics.MaxConnections,
        WaitCount:         cpm.metrics.WaitCount,
        WaitDuration:      cpm.metrics.WaitDuration,
        ConnectionErrors:  cpm.metrics.ConnectionErrors,
        LastUpdate:        cpm.metrics.LastUpdate,
    }
}
```

### Step 3: Implement Connection Leak Detection

**File**: `backend/internal/store/postgres/connection_leak_detector.go`

```go
package postgres

import (
    "context"
    "fmt"
    "runtime"
    "strings"
    "sync"
    "time"
    
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
)

// ConnectionLeakDetector tracks database connections for leak detection
type ConnectionLeakDetector struct {
    db              *sqlx.DB
    activeConnections map[string]*ConnectionInfo
    mu              sync.RWMutex
    leakTimeout     time.Duration
    enabled         bool
}

type ConnectionInfo struct {
    ID           string
    AcquiredAt   time.Time
    AcquiredBy   string
    StackTrace   string
    Context      map[string]interface{}
    Released     bool
}

func NewConnectionLeakDetector(db *sqlx.DB, leakTimeout time.Duration) *ConnectionLeakDetector {
    return &ConnectionLeakDetector{
        db:                db,
        activeConnections: make(map[string]*ConnectionInfo),
        leakTimeout:       leakTimeout,
        enabled:          true,
    }
}

// TrackConnection registers a new connection acquisition
func (cld *ConnectionLeakDetector) TrackConnection(
    ctx context.Context,
    operation string,
    context map[string]interface{},
) string {
    if !cld.enabled {
        return ""
    }
    
    connectionID := uuid.New().String()
    stackTrace := cld.captureStackTrace()
    
    connectionInfo := &ConnectionInfo{
        ID:         connectionID,
        AcquiredAt: time.Now(),
        AcquiredBy: operation,
        StackTrace: stackTrace,
        Context:    context,
        Released:   false,
    }
    
    cld.mu.Lock()
    cld.activeConnections[connectionID] = connectionInfo
    cld.mu.Unlock()
    
    // Record in database
    go cld.recordConnectionAcquisition(ctx, connectionInfo)
    
    return connectionID
}

// ReleaseConnection marks a connection as released
func (cld *ConnectionLeakDetector) ReleaseConnection(connectionID string) {
    if connectionID == "" || !cld.enabled {
        return
    }
    
    cld.mu.Lock()
    defer cld.mu.Unlock()
    
    if connInfo, exists := cld.activeConnections[connectionID]; exists {
        connInfo.Released = true
        
        // Record release in database
        go cld.recordConnectionRelease(context.Background(), connectionID, time.Since(connInfo.AcquiredAt))
        
        delete(cld.activeConnections, connectionID)
    }
}

func (cld *ConnectionLeakDetector) captureStackTrace() string {
    buf := make([]byte, 4096)
    n := runtime.Stack(buf, false)
    
    // Clean up stack trace to exclude this function
    stackTrace := string(buf[:n])
    lines := strings.Split(stackTrace, "\n")
    
    // Skip first few lines (this function and runtime)
    var relevantLines []string
    skip := 0
    for i, line := range lines {
        if strings.Contains(line, "connection_leak_detector.go") {
            skip = i + 2 // Skip this function and its caller line
            break
        }
    }
    
    if skip < len(lines) {
        relevantLines = lines[skip:]
    } else {
        relevantLines = lines
    }
    
    return strings.Join(relevantLines, "\n")
}

func (cld *ConnectionLeakDetector) recordConnectionAcquisition(ctx context.Context, connInfo *ConnectionInfo) {
    query := `
        INSERT INTO connection_leak_detection 
            (connection_id, acquired_at, acquired_by, operation_context, stack_trace)
        VALUES ($1, $2, $3, $4, $5)`
    
    contextJSON, _ := json.Marshal(connInfo.Context)
    
    _, err := cld.db.ExecContext(
        ctx, query,
        connInfo.ID,
        connInfo.AcquiredAt,
        connInfo.AcquiredBy,
        contextJSON,
        connInfo.StackTrace,
    )
    
    if err != nil {
        log.Printf("WARNING: Failed to record connection acquisition: %v", err)
    }
}

func (cld *ConnectionLeakDetector) recordConnectionRelease(ctx context.Context, connectionID string, duration time.Duration) {
    query := `
        UPDATE connection_leak_detection 
        SET released_at = NOW(), duration_held_ms = $1
        WHERE connection_id = $2`
    
    _, err := cld.db.ExecContext(ctx, query, int(duration.Milliseconds()), connectionID)
    if err != nil {
        log.Printf("WARNING: Failed to record connection release: %v", err)
    }
}

// DetectLeaks identifies potential connection leaks
func (cld *ConnectionLeakDetector) DetectLeaks(ctx context.Context) error {
    cld.mu.RLock()
    defer cld.mu.RUnlock()
    
    now := time.Now()
    var leakedConnections []string
    
    for connID, connInfo := range cld.activeConnections {
        if !connInfo.Released && now.Sub(connInfo.AcquiredAt) > cld.leakTimeout {
            leakedConnections = append(leakedConnections, connID)
            
            // Mark as leaked in database
            go cld.markConnectionLeaked(ctx, connID)
        }
    }
    
    if len(leakedConnections) > 0 {
        log.Printf("WARNING: Detected %d potential connection leaks: %v", 
            len(leakedConnections), leakedConnections)
        
        // Send alert
        return cld.sendLeakAlert(ctx, leakedConnections)
    }
    
    return nil
}

func (cld *ConnectionLeakDetector) markConnectionLeaked(ctx context.Context, connectionID string) {
    query := `
        UPDATE connection_leak_detection 
        SET is_leaked = true, leak_detected_at = NOW()
        WHERE connection_id = $1`
    
    _, err := cld.db.ExecContext(ctx, query, connectionID)
    if err != nil {
        log.Printf("WARNING: Failed to mark connection as leaked: %v", err)
    }
}
```

### Step 4: Enhance Transaction Manager with Pool Monitoring

**File**: `backend/internal/store/postgres/transaction_manager_adapter.go`

**Add connection pool integration**:
```go
// Enhanced TransactionManager with connection pool monitoring
func (tm *TransactionManager) SafeTransactionWithPoolMonitoring(
    ctx context.Context,
    options *TransactionOptions,
    operation string,
    campaignID *uuid.UUID,
    txFunc func(*sqlx.Tx) error,
) error {
    // Track connection acquisition
    connectionID := tm.leakDetector.TrackConnection(ctx, operation, map[string]interface{}{
        "campaign_id": campaignID,
        "operation":   operation,
        "timestamp":   time.Now(),
    })
    defer tm.leakDetector.ReleaseConnection(connectionID)
    
    // Check pool health before acquiring connection
    if err := tm.checkPoolHealth(); err != nil {
        return fmt.Errorf("connection pool health check failed: %w", err)
    }
    
    startTime := time.Now()
    
    // Begin transaction with timeout
    tx, err := tm.beginTransactionWithTimeout(ctx, options)
    if err != nil {
        tm.recordConnectionPoolEvent("transaction_begin_failed", err)
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    
    defer func() {
        // Always rollback on defer - commit will set tx to nil
        if tx != nil {
            if rollbackErr := tx.Rollback(); rollbackErr != nil {
                log.Printf("WARNING: Failed to rollback transaction: %v", rollbackErr)
            }
        }
        
        // Record transaction duration
        duration := time.Since(startTime)
        tm.recordTransactionMetrics(operation, duration, err == nil)
    }()
    
    // Execute transaction function
    if err := txFunc(tx); err != nil {
        tm.recordConnectionPoolEvent("transaction_execution_failed", err)
        return err
    }
    
    // Commit transaction
    if err := tx.Commit(); err != nil {
        tm.recordConnectionPoolEvent("transaction_commit_failed", err)
        return fmt.Errorf("failed to commit transaction: %w", err)
    }
    
    tx = nil // Prevent rollback in defer
    return nil
}

func (tm *TransactionManager) checkPoolHealth() error {
    stats := tm.db.Stats()
    
    // Check if pool is near capacity
    utilization := float64(stats.OpenConnections) / float64(stats.MaxOpenConnections)
    if utilization > 0.9 {
        return fmt.Errorf("connection pool utilization critical: %.1f%%", utilization*100)
    }
    
    // Check for excessive wait times
    if stats.WaitDuration > 5*time.Second {
        return fmt.Errorf("connection pool wait time excessive: %v", stats.WaitDuration)
    }
    
    return nil
}

func (tm *TransactionManager) beginTransactionWithTimeout(ctx context.Context, options *TransactionOptions) (*sqlx.Tx, error) {
    timeout := 30 * time.Second
    if options != nil && options.Timeout > 0 {
        timeout = options.Timeout
    }
    
    ctx, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()
    
    return tm.db.BeginTxx(ctx, &sql.TxOptions{
        Isolation: sql.LevelReadCommitted,
        ReadOnly:  false,
    })
}
```

### Step 5: Create Load Testing Framework

**File**: `backend/internal/store/postgres/si004_connection_pool_test.go`

```go
package postgres

import (
    "context"
    "sync"
    "testing"
    "time"
    
    "github.com/stretchr/testify/suite"
    "github.com/google/uuid"
    "your-project/internal/testutil"
)

type SI004ConnectionPoolTestSuite struct {
    testutil.ServiceTestSuite
    poolMonitor    *ConnectionPoolMonitor
    leakDetector   *ConnectionLeakDetector
    txManager      *TransactionManager
}

func TestSI004ConnectionPool(t *testing.T) {
    suite.Run(t, &SI004ConnectionPoolTestSuite{
        ServiceTestSuite: testutil.ServiceTestSuite{
            UseDatabaseFromEnv: true, // MANDATORY: Real database testing
        },
    })
}

func (suite *SI004ConnectionPoolTestSuite) TestConnectionPoolUnderLoad() {
    const numWorkers = 100
    const operationsPerWorker = 50
    
    var wg sync.WaitGroup
    errors := make(chan error, numWorkers*operationsPerWorker)
    
    // Configure database for load test
    config := LoadTestDatabasePoolConfig()
    config.ConfigureDatabase(suite.db)
    
    // Start monitoring
    suite.poolMonitor.Start(context.Background())
    defer suite.poolMonitor.Stop()
    
    for workerID := 0; workerID < numWorkers; workerID++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            for opNum := 0; opNum < operationsPerWorker; opNum++ {
                err := suite.performDatabaseOperation(context.Background(), id, opNum)
                if err != nil {
                    errors <- err
                }
            }
        }(workerID)
    }
    
    wg.Wait()
    close(errors)
    
    // Validate results
    var errorList []error
    for err := range errors {
        errorList = append(errorList, err)
    }
    
    // Should have minimal errors under load
    errorRate := float64(len(errorList)) / float64(numWorkers*operationsPerWorker)
    suite.Less(errorRate, 0.05, "Error rate should be less than 5%")
    
    // Verify no connection leaks
    suite.NoError(suite.leakDetector.DetectLeaks(context.Background()))
    
    // Verify pool metrics
    metrics := suite.poolMonitor.GetMetrics()
    suite.Less(metrics.ActiveConnections, config.MaxOpenConnections, 
        "Should not exceed max connections")
}

func (suite *SI004ConnectionPoolTestSuite) performDatabaseOperation(ctx context.Context, workerID, opNum int) error {
    return suite.txManager.SafeTransactionWithPoolMonitoring(
        ctx, nil, 
        fmt.Sprintf("load_test_worker_%d_op_%d", workerID, opNum),
        nil,
        func(tx *sqlx.Tx) error {
            // Simulate database work
            time.Sleep(time.Duration(workerID+opNum) * time.Millisecond)
            
            var result int
            return tx.Get(&result, "SELECT 1")
        },
    )
}

func (suite *SI004ConnectionPoolTestSuite) TestConnectionLeakDetection() {
    // Simulate connection leak
    connectionID := suite.leakDetector.TrackConnection(
        context.Background(),
        "test_leak_operation",
        map[string]interface{}{"test": true},
    )
    
    // Don't release connection (simulating leak)
    
    // Wait for leak detection timeout
    time.Sleep(suite.leakDetector.leakTimeout + time.Second)
    
    // Run leak detection
    err := suite.leakDetector.DetectLeaks(context.Background())
    suite.NoError(err, "Leak detection should complete without error")
    
    // Verify leak was detected and logged
    suite.ValidateConnectionLeakLogged(connectionID)
}

func (suite *SI004ConnectionPoolTestSuite) ValidateConnectionLeakLogged(connectionID string) {
    var leakCount int
    query := `
        SELECT COUNT(*) 
        FROM connection_leak_detection 
        WHERE connection_id = $1 AND is_leaked = true`
    
    err := suite.db.Get(&leakCount, query, connectionID)
    suite.NoError(err)
    suite.Equal(1, leakCount, "Connection leak should be logged")
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
export LOAD_TEST_WORKERS=100
```

### Test Execution
```bash
# Run SI-004 specific tests
go test ./internal/store/postgres -run TestSI004 -race -v -timeout 60s -tags=integration

# Run connection pool load tests
go test ./internal/store/postgres -run TestConnectionPoolUnderLoad -race -count=3 -tags=integration
```

---

## CI/CD VALIDATION CHECKLIST

### Mandatory Checks
- [ ] `go test ./... -race` passes with zero data races
- [ ] `golangci-lint run` clean with zero critical issues
- [ ] SI-004 connection pool tests pass under load
- [ ] Connection leak detection works correctly
- [ ] Pool monitoring captures metrics accurately
- [ ] Alerting system responds to pool issues

### Database Validation
- [ ] Migration applies cleanly to `domainflow_production`
- [ ] Connection pool metrics collection works
- [ ] Leak detection tracks connections properly
- [ ] Alert thresholds trigger correctly

### Performance Validation
- [ ] Connection pool handles 100+ concurrent operations
- [ ] Pool utilization stays below 95% under normal load
- [ ] Connection wait times remain under 1 second
- [ ] No connection leaks detected in sustained testing

---

## SUCCESS CRITERIA

### Functional Requirements
1. **Pool Health Monitoring**: Real-time connection pool metrics collection
2. **Leak Detection**: Automatic detection and reporting of connection leaks
3. **Alert System**: Proactive alerting for pool health issues
4. **Performance Optimization**: Optimized pool configuration for high throughput

### Performance Requirements
1. **Concurrent Operations**: Support 100+ concurrent database operations
2. **Pool Utilization**: Maintain healthy utilization under 90%
3. **Response Time**: Database operations complete within 5 seconds
4. **Zero Leaks**: No connection leaks under sustained load

### Integration Requirements
1. **Transaction Integration**: Works with SI-001 transaction management
2. **Monitoring Integration**: Integrates with system monitoring and alerting
3. **Service Integration**: All database services use monitored connections

---

## ROLLBACK PROCEDURES

### Database Rollback
```sql
-- File: backend/database/migrations/012_rollback_si004.sql
BEGIN;
DROP TABLE IF EXISTS system_alerts;
DROP FUNCTION IF EXISTS check_connection_pool_alerts(VARCHAR, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS record_connection_pool_metrics(VARCHAR, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);
DROP TABLE IF EXISTS connection_pool_alerts;
DROP TABLE IF EXISTS connection_leak_detection;
DROP TABLE IF EXISTS connection_pool_metrics;
COMMIT;
```

---

**Implementation Priority**: HIGH - Critical for system stability under load  
**Next Step**: Begin with PostgreSQL migration, then implement connection pool monitoring  
**Performance Foundation**: Essential for SI-005 memory management and PF-001 query optimization