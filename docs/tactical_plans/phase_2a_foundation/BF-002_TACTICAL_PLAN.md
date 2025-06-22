# BF-002: ADDITIONAL CONCURRENCY HAZARDS - TACTICAL PLAN

**Finding ID**: BF-002  
**Priority**: CRITICAL  
**Phase**: 2A Foundation  
**Estimated Effort**: 3-4 days  
**Dependencies**: ✅ SI-001 Transaction Management, ✅ SI-002 State Management

---

## FINDING OVERVIEW

**Problem Statement**: Additional concurrency hazards in domain generation and campaign worker coordination beyond the race conditions already addressed in BF-001.

**Root Cause**: Unsafe concurrent access to shared resources, missing synchronization primitives, and inconsistent locking strategies across worker processes.

**Impact**: 
- Data corruption in domain generation pipelines
- Worker process coordination failures
- Resource leak in concurrent campaign execution
- Performance degradation from lock contention

**Integration Points**: 
- Builds on BF-001 `FOR UPDATE SKIP LOCKED` patterns and current database locking strategies
- Integrates with SI-001 transaction management and SI-002 state coordination
- Enhances campaign worker service and domain generation service

---

## POSTGRESQL MIGRATION

**File**: `backend/database/migrations/008_bf002_concurrency_controls.sql`

```sql
BEGIN;

-- Worker coordination table for distributed locking
CREATE TABLE IF NOT EXISTS worker_coordination (
    worker_id VARCHAR(255) PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id),
    worker_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'idle',
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    assigned_tasks JSONB DEFAULT '[]',
    resource_locks JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worker_coordination_campaign ON worker_coordination(campaign_id);
CREATE INDEX idx_worker_coordination_status ON worker_coordination(status);
CREATE INDEX idx_worker_coordination_heartbeat ON worker_coordination(last_heartbeat);

-- Domain generation batch coordination
CREATE TABLE IF NOT EXISTS domain_generation_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    batch_number INTEGER NOT NULL,
    total_domains INTEGER NOT NULL,
    processed_domains INTEGER DEFAULT 0,
    failed_domains INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_worker VARCHAR(255),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, batch_number)
);

CREATE INDEX idx_domain_batches_campaign ON domain_generation_batches(campaign_id);
CREATE INDEX idx_domain_batches_status ON domain_generation_batches(status);
CREATE INDEX idx_domain_batches_worker ON domain_generation_batches(assigned_worker);

-- Resource locks table for fine-grained locking
CREATE TABLE IF NOT EXISTS resource_locks (
    lock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    lock_holder VARCHAR(255) NOT NULL,
    lock_mode VARCHAR(50) NOT NULL DEFAULT 'exclusive',
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    renewal_count INTEGER DEFAULT 0,
    context JSONB DEFAULT '{}',
    UNIQUE(resource_type, resource_id, lock_mode)
);

CREATE INDEX idx_resource_locks_expires ON resource_locks(expires_at);
CREATE INDEX idx_resource_locks_holder ON resource_locks(lock_holder);
CREATE INDEX idx_resource_locks_resource ON resource_locks(resource_type, resource_id);

-- Function for atomic batch assignment
CREATE OR REPLACE FUNCTION assign_domain_batch(
    p_campaign_id UUID,
    p_worker_id VARCHAR(255),
    p_batch_size INTEGER DEFAULT 1000
) RETURNS UUID AS $$
DECLARE
    batch_id UUID;
    batch_num INTEGER;
BEGIN
    -- Get next available batch
    SELECT batch_id, batch_number INTO batch_id, batch_num
    FROM domain_generation_batches
    WHERE campaign_id = p_campaign_id 
      AND status = 'pending'
      AND assigned_worker IS NULL
    ORDER BY batch_number
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    IF batch_id IS NULL THEN
        RETURN NULL; -- No available batches
    END IF;
    
    -- Assign batch to worker
    UPDATE domain_generation_batches
    SET assigned_worker = p_worker_id,
        status = 'assigned',
        started_at = NOW()
    WHERE batch_id = batch_id;
    
    -- Update worker coordination
    INSERT INTO worker_coordination (worker_id, campaign_id, worker_type, status, assigned_tasks)
    VALUES (p_worker_id, p_campaign_id, 'domain_generator', 'working', 
            jsonb_build_array(jsonb_build_object('batch_id', batch_id, 'batch_number', batch_num)))
    ON CONFLICT (worker_id) DO UPDATE SET
        campaign_id = EXCLUDED.campaign_id,
        status = EXCLUDED.status,
        assigned_tasks = worker_coordination.assigned_tasks || EXCLUDED.assigned_tasks,
        last_heartbeat = NOW(),
        updated_at = NOW();
    
    RETURN batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function for resource lock acquisition
CREATE OR REPLACE FUNCTION acquire_resource_lock(
    p_resource_type VARCHAR(100),
    p_resource_id VARCHAR(255),
    p_lock_holder VARCHAR(255),
    p_lock_mode VARCHAR(50) DEFAULT 'exclusive',
    p_timeout_seconds INTEGER DEFAULT 30
) RETURNS UUID AS $$
DECLARE
    lock_id UUID;
    expiry_time TIMESTAMPTZ := NOW() + (p_timeout_seconds || ' seconds')::INTERVAL;
BEGIN
    -- Clean up expired locks
    DELETE FROM resource_locks WHERE expires_at < NOW();
    
    -- Try to acquire lock
    INSERT INTO resource_locks 
        (resource_type, resource_id, lock_holder, lock_mode, expires_at)
    VALUES 
        (p_resource_type, p_resource_id, p_lock_holder, p_lock_mode, expiry_time)
    ON CONFLICT (resource_type, resource_id, lock_mode) DO NOTHING
    RETURNING lock_id INTO lock_id;
    
    RETURN lock_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## IMPLEMENTATION GUIDANCE

### Step 1: Implement Distributed Worker Coordination

**File**: `backend/internal/services/worker_coordination_service.go`

```go
package services

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "sync"
    "time"
    
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
    "your-project/internal/models"
)

// WorkerCoordinationService manages distributed worker coordination
type WorkerCoordinationService struct {
    db              *sqlx.DB
    workerID        string
    heartbeatTicker *time.Ticker
    resourceLocks   map[string]uuid.UUID
    mu              sync.RWMutex
}

func NewWorkerCoordinationService(db *sqlx.DB, workerID string) *WorkerCoordinationService {
    return &WorkerCoordinationService{
        db:            db,
        workerID:      workerID,
        resourceLocks: make(map[string]uuid.UUID),
    }
}

// RegisterWorker registers worker with coordination system
func (wcs *WorkerCoordinationService) RegisterWorker(
    ctx context.Context,
    campaignID uuid.UUID,
    workerType string,
) error {
    query := `
        INSERT INTO worker_coordination 
            (worker_id, campaign_id, worker_type, status, last_heartbeat)
        VALUES ($1, $2, $3, 'idle', NOW())
        ON CONFLICT (worker_id) DO UPDATE SET
            campaign_id = EXCLUDED.campaign_id,
            worker_type = EXCLUDED.worker_type,
            status = 'idle',
            last_heartbeat = NOW(),
            updated_at = NOW()`
    
    _, err := wcs.db.ExecContext(ctx, query, wcs.workerID, campaignID, workerType)
    if err != nil {
        return fmt.Errorf("failed to register worker: %w", err)
    }
    
    // Start heartbeat
    wcs.startHeartbeat(ctx)
    return nil
}

// startHeartbeat maintains worker liveness
func (wcs *WorkerCoordinationService) startHeartbeat(ctx context.Context) {
    if wcs.heartbeatTicker != nil {
        wcs.heartbeatTicker.Stop()
    }
    
    wcs.heartbeatTicker = time.NewTicker(10 * time.Second)
    go func() {
        for {
            select {
            case <-ctx.Done():
                return
            case <-wcs.heartbeatTicker.C:
                wcs.sendHeartbeat(ctx)
            }
        }
    }()
}

func (wcs *WorkerCoordinationService) sendHeartbeat(ctx context.Context) {
    query := `
        UPDATE worker_coordination 
        SET last_heartbeat = NOW(), updated_at = NOW()
        WHERE worker_id = $1`
    
    _, err := wcs.db.ExecContext(ctx, query, wcs.workerID)
    if err != nil {
        log.Printf("WARNING: Failed to send heartbeat for worker %s: %v", wcs.workerID, err)
    }
}
```

### Step 2: Implement Resource Lock Manager

**Add to**: `backend/internal/services/worker_coordination_service.go`

```go
// ResourceLockManager provides fine-grained resource locking
type ResourceLockManager struct {
    db           *sqlx.DB
    workerID     string
    activeLocks  map[string]uuid.UUID
    mu           sync.RWMutex
}

func NewResourceLockManager(db *sqlx.DB, workerID string) *ResourceLockManager {
    return &ResourceLockManager{
        db:          db,
        workerID:    workerID,
        activeLocks: make(map[string]uuid.UUID),
    }
}

// AcquireResourceLock acquires a lock on a specific resource
func (rlm *ResourceLockManager) AcquireResourceLock(
    ctx context.Context,
    resourceType, resourceID string,
    lockMode string,
    timeout time.Duration,
) (uuid.UUID, error) {
    lockKey := fmt.Sprintf("%s:%s:%s", resourceType, resourceID, lockMode)
    
    rlm.mu.Lock()
    defer rlm.mu.Unlock()
    
    // Check if we already hold this lock
    if existingLockID, exists := rlm.activeLocks[lockKey]; exists {
        return existingLockID, nil
    }
    
    var lockID uuid.UUID
    query := `SELECT acquire_resource_lock($1, $2, $3, $4, $5)`
    
    err := rlm.db.QueryRowContext(
        ctx, query,
        resourceType, resourceID, rlm.workerID, 
        lockMode, int(timeout.Seconds()),
    ).Scan(&lockID)
    
    if err != nil {
        return uuid.Nil, fmt.Errorf("failed to acquire resource lock: %w", err)
    }
    
    if lockID == uuid.Nil {
        return uuid.Nil, fmt.Errorf("resource lock not available: %s", lockKey)
    }
    
    rlm.activeLocks[lockKey] = lockID
    return lockID, nil
}

// ReleaseResourceLock releases a previously acquired lock
func (rlm *ResourceLockManager) ReleaseResourceLock(
    ctx context.Context,
    resourceType, resourceID, lockMode string,
) error {
    lockKey := fmt.Sprintf("%s:%s:%s", resourceType, resourceID, lockMode)
    
    rlm.mu.Lock()
    defer rlm.mu.Unlock()
    
    lockID, exists := rlm.activeLocks[lockKey]
    if !exists {
        return nil // Lock not held
    }
    
    query := `DELETE FROM resource_locks WHERE lock_id = $1 AND lock_holder = $2`
    _, err := rlm.db.ExecContext(ctx, query, lockID, rlm.workerID)
    
    if err != nil {
        return fmt.Errorf("failed to release resource lock: %w", err)
    }
    
    delete(rlm.activeLocks, lockKey)
    return nil
}
```

### Step 3: Enhance Domain Generation Service

**File**: `backend/internal/services/domain_generation_service.go`

**Add batch processing with coordination**:
```go
// ProcessDomainGenerationBatch processes domains in coordinated batches
func (dgs *DomainGenerationService) ProcessDomainGenerationBatch(
    ctx context.Context,
    campaignID uuid.UUID,
) error {
    // Acquire next available batch
    var batchID uuid.UUID
    query := `SELECT assign_domain_batch($1, $2, $3)`
    
    err := dgs.db.QueryRowContext(ctx, query, campaignID, dgs.workerID, 1000).Scan(&batchID)
    if err != nil {
        return fmt.Errorf("failed to assign domain batch: %w", err)
    }
    
    if batchID == uuid.Nil {
        return nil // No available batches
    }
    
    // Acquire resource lock for domain generation
    lockID, err := dgs.resourceLockManager.AcquireResourceLock(
        ctx, "domain_generation", campaignID.String(), "exclusive", 30*time.Second,
    )
    if err != nil {
        return fmt.Errorf("failed to acquire domain generation lock: %w", err)
    }
    defer dgs.resourceLockManager.ReleaseResourceLock(
        ctx, "domain_generation", campaignID.String(), "exclusive",
    )
    
    // Process batch with coordination
    return dgs.processBatchWithCoordination(ctx, batchID, campaignID)
}

func (dgs *DomainGenerationService) processBatchWithCoordination(
    ctx context.Context,
    batchID, campaignID uuid.UUID,
) error {
    // Load batch details
    batch, err := dgs.loadDomainBatch(ctx, batchID)
    if err != nil {
        return fmt.Errorf("failed to load batch: %w", err)
    }
    
    // Process domains with atomic updates
    processedCount := 0
    failedCount := 0
    
    for _, domainSpec := range batch.DomainSpecs {
        if err := dgs.processSingleDomain(ctx, domainSpec, campaignID); err != nil {
            failedCount++
            log.Printf("WARNING: Failed to process domain %s: %v", domainSpec.Name, err)
        } else {
            processedCount++
        }
        
        // Update batch progress atomically
        if err := dgs.updateBatchProgress(ctx, batchID, processedCount, failedCount); err != nil {
            log.Printf("WARNING: Failed to update batch progress: %v", err)
        }
    }
    
    // Mark batch as completed
    return dgs.completeBatch(ctx, batchID, processedCount, failedCount)
}
```

### Step 4: Add Concurrent Campaign Worker Updates

**File**: `backend/internal/services/campaign_worker_service.go`

**Add coordinated worker operations**:
```go
// ConcurrentWorkerOperation performs coordinated operations across workers
func (cws *CampaignWorkerService) ConcurrentWorkerOperation(
    ctx context.Context,
    campaignID uuid.UUID,
    operation string,
    operationFunc func(context.Context, uuid.UUID) error,
) error {
    // Acquire coordination lock
    lockID, err := cws.resourceLockManager.AcquireResourceLock(
        ctx, "campaign_operation", campaignID.String(), "exclusive", 60*time.Second,
    )
    if err != nil {
        return fmt.Errorf("failed to acquire operation lock: %w", err)
    }
    defer cws.resourceLockManager.ReleaseResourceLock(
        ctx, "campaign_operation", campaignID.String(), "exclusive",
    )
    
    // Update worker status
    if err := cws.updateWorkerStatus(ctx, campaignID, "working", operation); err != nil {
        return fmt.Errorf("failed to update worker status: %w", err)
    }
    
    // Execute operation with recovery
    operationErr := operationFunc(ctx, campaignID)
    
    // Update final status
    finalStatus := "idle"
    if operationErr != nil {
        finalStatus = "error"
    }
    
    if err := cws.updateWorkerStatus(ctx, campaignID, finalStatus, ""); err != nil {
        log.Printf("WARNING: Failed to update final worker status: %v", err)
    }
    
    return operationErr
}

func (cws *CampaignWorkerService) updateWorkerStatus(
    ctx context.Context,
    campaignID uuid.UUID,
    status, operation string,
) error {
    metadata := map[string]interface{}{
        "last_operation": operation,
        "timestamp":      time.Now().Unix(),
    }
    
    metadataJSON, _ := json.Marshal(metadata)
    
    query := `
        UPDATE worker_coordination 
        SET status = $1, metadata = $2, last_heartbeat = NOW(), updated_at = NOW()
        WHERE worker_id = $3 AND campaign_id = $4`
    
    _, err := cws.db.ExecContext(ctx, query, status, metadataJSON, cws.workerID, campaignID)
    return err
}
```

### Step 5: Create Integration Tests

**File**: `backend/internal/services/bf002_concurrency_test.go`

```go
package services

import (
    "context"
    "fmt"
    "sync"
    "testing"
    "time"
    
    "github.com/stretchr/testify/suite"
    "github.com/google/uuid"
    "your-project/internal/testutil"
    "your-project/internal/models"
)

type BF002ConcurrencyTestSuite struct {
    testutil.ServiceTestSuite
    workerServices       []*CampaignWorkerService
    domainGenService     *DomainGenerationService
    coordinationService  *WorkerCoordinationService
}

func TestBF002ConcurrencyHazards(t *testing.T) {
    suite.Run(t, &BF002ConcurrencyTestSuite{
        ServiceTestSuite: testutil.ServiceTestSuite{
            UseDatabaseFromEnv: true, // MANDATORY: Use domainflow_production database
        },
    })
}

func (suite *BF002ConcurrencyTestSuite) TestWorkerCoordination() {
    campaignID := uuid.New()
    const numWorkers = 10
    
    // Initialize multiple workers
    var wg sync.WaitGroup
    coordinationErrors := make(chan error, numWorkers)
    
    for workerNum := 0; workerNum < numWorkers; workerNum++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            workerID := fmt.Sprintf("worker-%d", id)
            workerService := NewCampaignWorkerService(suite.db, workerID)
            
            // Register worker
            err := workerService.coordinationService.RegisterWorker(
                context.Background(), campaignID, "test_worker",
            )
            if err != nil {
                coordinationErrors <- fmt.Errorf("worker %d registration failed: %w", id, err)
                return
            }
            
            // Perform coordinated operations
            err = workerService.ConcurrentWorkerOperation(
                context.Background(),
                campaignID,
                "test_operation",
                func(ctx context.Context, cID uuid.UUID) error {
                    // Simulate work
                    time.Sleep(time.Duration(id*10) * time.Millisecond)
                    return nil
                },
            )
            
            if err != nil {
                coordinationErrors <- fmt.Errorf("worker %d operation failed: %w", id, err)
            }
        }(workerNum)
    }
    
    wg.Wait()
    close(coordinationErrors)
    
    // Validate no coordination errors
    var errorList []error
    for err := range coordinationErrors {
        errorList = append(errorList, err)
    }
    suite.Empty(errorList, "Should have no worker coordination errors")
    
    // Validate worker coordination state
    suite.ValidateWorkerCoordination(campaignID, numWorkers)
}

func (suite *BF002ConcurrencyTestSuite) TestResourceLockContention() {
    const numWorkers = 15
    resourceID := uuid.New().String()
    
    var wg sync.WaitGroup
    lockErrors := make(chan error, numWorkers)
    successfulLocks := make(chan string, numWorkers)
    
    for workerNum := 0; workerNum < numWorkers; workerNum++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            workerID := fmt.Sprintf("lock-worker-%d", id)
            lockManager := NewResourceLockManager(suite.db, workerID)
            
            // Try to acquire exclusive lock
            lockID, err := lockManager.AcquireResourceLock(
                context.Background(),
                "test_resource",
                resourceID,
                "exclusive",
                5*time.Second,
            )
            
            if err != nil {
                lockErrors <- fmt.Errorf("worker %d lock acquisition failed: %w", id, err)
                return
            }
            
            if lockID != uuid.Nil {
                successfulLocks <- workerID
                
                // Hold lock briefly
                time.Sleep(50 * time.Millisecond)
                
                // Release lock
                err = lockManager.ReleaseResourceLock(
                    context.Background(),
                    "test_resource",
                    resourceID,
                    "exclusive",
                )
                
                if err != nil {
                    lockErrors <- fmt.Errorf("worker %d lock release failed: %w", id, err)
                }
            }
        }(workerNum)
    }
    
    wg.Wait()
    close(lockErrors)
    close(successfulLocks)
    
    // Validate lock behavior
    var errorList []error
    for err := range lockErrors {
        errorList = append(errorList, err)
    }
    
    // Should have some contention but no deadlocks
    suite.True(len(errorList) < numWorkers, "Should have some lock contention but not all failures")
    
    // Validate at least one successful lock
    var locks []string
    for workerID := range successfulLocks {
        locks = append(locks, workerID)
    }
    suite.True(len(locks) > 0, "Should have at least one successful lock acquisition")
}

func (suite *BF002ConcurrencyTestSuite) ValidateWorkerCoordination(campaignID uuid.UUID, expectedWorkers int) {
    var workerCount int
    err := suite.db.Get(&workerCount, 
        "SELECT COUNT(*) FROM worker_coordination WHERE campaign_id = $1", 
        campaignID)
    suite.NoError(err)
    suite.Equal(expectedWorkers, workerCount, "Should have registered all workers")
    
    // Validate no resource locks are held
    var activeLocks int
    err = suite.db.Get(&activeLocks, 
        "SELECT COUNT(*) FROM resource_locks WHERE expires_at > NOW()")
    suite.NoError(err)
    suite.Equal(0, activeLocks, "Should have no active locks after test completion")
}
```

---

## TESTING REQUIREMENTS

### Environment Setup
```bash
export TEST_POSTGRES_DSN="postgresql://username:password@localhost/domainflow_production"
export USE_REAL_DATABASE=true
export TEST_TIMEOUT=60s
export CONCURRENT_WORKERS=20
export POSTGRES_DATABASE=domainflow_production
```

### Test Execution
```bash
# Run BF-002 specific tests against domainflow_production
go test ./internal/services -run TestBF002 -race -v -timeout 60s -tags=integration

# Test under high concurrency against domainflow_production
go test ./internal/services -run TestWorkerCoordination -race -count=5 -tags=integration
```

---

## CI/CD VALIDATION CHECKLIST

### Mandatory Checks
- [ ] `go test ./... -race` passes with zero data races
- [ ] `golangci-lint run` clean with zero critical issues
- [ ] BF-002 concurrency tests pass with real database
- [ ] Worker coordination tests validate proper locking
- [ ] Resource lock contention tests pass
- [ ] Domain generation batch coordination works

### Database Validation
- [ ] Migration applies cleanly to `domainflow_production`
- [ ] Worker coordination functions work under load
- [ ] Resource locks prevent concurrent access correctly
- [ ] Batch assignment handles concurrent requests properly

### Integration Validation
- [ ] Integration with BF-001 race condition patterns verified
- [ ] SI-001 transaction management compatibility confirmed
- [ ] SI-002 state coordination integration working
- [ ] Campaign worker and domain generation services coordinated

---

## SUCCESS CRITERIA

### Functional Requirements
1. **Worker Coordination**: Distributed workers coordinate without conflicts
2. **Resource Locking**: Fine-grained resource locks prevent data corruption
3. **Batch Processing**: Domain generation batches process without overlap
4. **Heartbeat Monitoring**: Worker liveness detection and cleanup

### Performance Requirements
1. **Coordination Overhead**: < 15ms additional latency for coordinated operations
2. **Lock Contention**: Support 50+ concurrent lock acquisitions
3. **Batch Throughput**: Process 1000+ domains per batch without corruption

### Integration Requirements
1. **Transaction Compatibility**: Works with SI-001 transaction patterns
2. **State Consistency**: Maintains consistency with SI-002 state management
3. **Existing Pattern Integration**: Builds on BF-001 race condition solutions

---

## ROLLBACK PROCEDURES

### Database Rollback
```sql
-- File: backend/database/migrations/008_rollback_bf002.sql
BEGIN;
DROP FUNCTION IF EXISTS acquire_resource_lock(VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS assign_domain_batch(UUID, VARCHAR, INTEGER);
DROP TABLE IF EXISTS resource_locks;
DROP TABLE IF EXISTS domain_generation_batches;
DROP TABLE IF EXISTS worker_coordination;
COMMIT;
```

---

**Implementation Priority**: CRITICAL - Completes Phase 2A Foundation  
**Next Step**: Begin with PostgreSQL migration, then implement worker coordination service  
**Phase 2A Completion**: All three foundation documents (SI-001, SI-002, BF-002) must be implemented before Phase 2B