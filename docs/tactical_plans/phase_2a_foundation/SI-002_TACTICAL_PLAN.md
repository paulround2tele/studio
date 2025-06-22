# SI-002: CENTRALIZED STATE MANAGEMENT - TACTICAL PLAN

**Finding ID**: SI-002  
**Priority**: CRITICAL  
**Phase**: 2A Foundation  
**Estimated Effort**: 4-5 days  
**Dependencies**: ✅ SI-001 Transaction Management completed

---

## FINDING OVERVIEW

**Problem Statement**: Fragmented state management across campaign operations leading to state inconsistency and coordination failures.

**Root Cause**: Multiple services maintaining separate state representations without centralized coordination, causing state drift and synchronization issues.

**Impact**: 
- Campaign state inconsistency between workers and orchestrator
- Lost state transitions during concurrent operations
- Ineffective rollback and recovery procedures
- Performance degradation from state reconciliation overhead

**Integration Points**: 
- Builds on SI-001 enhanced transaction management
- Integrates with existing state coordination patterns and `store.Querier`/`store.Transactor` interfaces
- Connects to campaign orchestrator and worker services

---

## POSTGRESQL MIGRATION

**File**: `backend/database/migrations/007_si002_centralized_state.sql`

```sql
BEGIN;

-- Centralized state events table (extends existing state_events)
ALTER TABLE state_events ADD COLUMN IF NOT EXISTS state_version INTEGER DEFAULT 1;
ALTER TABLE state_events ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE state_events ADD COLUMN IF NOT EXISTS causation_id UUID;
ALTER TABLE state_events ADD COLUMN IF NOT EXISTS aggregate_type VARCHAR(100) DEFAULT 'campaign';

-- Create index for event ordering and correlation
CREATE INDEX IF NOT EXISTS idx_state_events_version ON state_events(entity_id, state_version);
CREATE INDEX IF NOT EXISTS idx_state_events_correlation ON state_events(correlation_id);

-- State snapshots table for performance optimization
CREATE TABLE IF NOT EXISTS state_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(100) NOT NULL DEFAULT 'campaign',
    snapshot_version INTEGER NOT NULL,
    state_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_id, entity_type, snapshot_version)
);

CREATE INDEX idx_state_snapshots_entity ON state_snapshots(entity_id, entity_type);
CREATE INDEX idx_state_snapshots_version ON state_snapshots(entity_id, snapshot_version DESC);

-- State coordination locks table
CREATE TABLE IF NOT EXISTS state_coordination_locks (
    entity_id UUID PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL DEFAULT 'campaign',
    lock_holder VARCHAR(255) NOT NULL,
    lock_token UUID NOT NULL DEFAULT gen_random_uuid(),
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    operation_context JSONB DEFAULT '{}'
);

CREATE INDEX idx_coordination_locks_expires ON state_coordination_locks(expires_at);

-- Function to acquire coordination lock
CREATE OR REPLACE FUNCTION acquire_state_lock(
    p_entity_id UUID,
    p_entity_type VARCHAR(100),
    p_lock_holder VARCHAR(255),
    p_lock_duration_seconds INTEGER DEFAULT 30
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to release coordination lock
CREATE OR REPLACE FUNCTION release_state_lock(
    p_entity_id UUID,
    p_lock_token UUID
) RETURNS BOOLEAN AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM state_coordination_locks 
    WHERE entity_id = p_entity_id AND lock_token = p_lock_token;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## IMPLEMENTATION GUIDANCE

### Step 1: Enhance State Coordinator

**File**: `backend/internal/services/state_coordinator.go`

**Add Centralized State Manager**:
```go
// CentralizedStateManager manages state coordination across services
type CentralizedStateManager struct {
    db              *sqlx.DB
    eventStore      store.StateEventStore
    snapshotStore   store.StateSnapshotStore
    lockManager     *StateCoordinationLockManager
    eventBus        *EventBus
    mu              sync.RWMutex
    activeStates    map[uuid.UUID]*CampaignStateAggregate
}

// State aggregate for campaign coordination
type CampaignStateAggregate struct {
    EntityID      uuid.UUID                 `json:"entity_id"`
    Version       int                       `json:"version"`
    State         models.CampaignStatus     `json:"state"`
    Metadata      map[string]interface{}    `json:"metadata"`
    LastUpdated   time.Time                 `json:"last_updated"`
    PendingEvents []StateEvent              `json:"pending_events"`
    mu            sync.RWMutex
}

func NewCentralizedStateManager(db *sqlx.DB) *CentralizedStateManager {
    return &CentralizedStateManager{
        db:           db,
        activeStates: make(map[uuid.UUID]*CampaignStateAggregate),
        lockManager:  NewStateCoordinationLockManager(db),
        eventBus:     NewEventBus(),
    }
}
```

**Add Coordinated State Updates**:
```go
// CoordinatedStateUpdate performs atomic state updates with locking
func (csm *CentralizedStateManager) CoordinatedStateUpdate(
    ctx context.Context,
    entityID uuid.UUID,
    operation string,
    updateFunc func(*CampaignStateAggregate) error,
) error {
    // Acquire coordination lock
    lockToken, err := csm.lockManager.AcquireLock(ctx, entityID, operation, 30*time.Second)
    if err != nil {
        return fmt.Errorf("failed to acquire state lock: %w", err)
    }
    defer csm.lockManager.ReleaseLock(ctx, entityID, lockToken)
    
    // Load current state aggregate
    aggregate, err := csm.LoadStateAggregate(ctx, entityID)
    if err != nil {
        return fmt.Errorf("failed to load state aggregate: %w", err)
    }
    
    // Apply update within aggregate lock
    aggregate.mu.Lock()
    originalVersion := aggregate.Version
    
    if err := updateFunc(aggregate); err != nil {
        aggregate.mu.Unlock()
        return fmt.Errorf("state update failed: %w", err)
    }
    
    // Increment version and validate
    aggregate.Version++
    aggregate.LastUpdated = time.Now()
    aggregate.mu.Unlock()
    
    // Persist state changes atomically
    return csm.PersistStateChanges(ctx, aggregate, originalVersion)
}
```

### Step 2: Implement Event Sourcing Pattern

**Add to**: `backend/internal/services/state_coordinator.go`

```go
// StateEvent represents a state change event
type StateEvent struct {
    ID            uuid.UUID                `json:"id"`
    EntityID      uuid.UUID                `json:"entity_id"`
    EventType     string                   `json:"event_type"`
    EventData     map[string]interface{}   `json:"event_data"`
    Version       int                      `json:"version"`
    CorrelationID uuid.UUID                `json:"correlation_id"`
    CausationID   *uuid.UUID               `json:"causation_id,omitempty"`
    Timestamp     time.Time                `json:"timestamp"`
    Metadata      map[string]interface{}   `json:"metadata"`
}

// Apply state events to rebuild aggregate state
func (aggregate *CampaignStateAggregate) ApplyEvents(events []StateEvent) error {
    aggregate.mu.Lock()
    defer aggregate.mu.Unlock()
    
    for _, event := range events {
        if err := aggregate.applyEvent(event); err != nil {
            return fmt.Errorf("failed to apply event %s: %w", event.ID, err)
        }
        
        aggregate.Version = event.Version
        aggregate.LastUpdated = event.Timestamp
    }
    
    return nil
}

func (aggregate *CampaignStateAggregate) applyEvent(event StateEvent) error {
    switch event.EventType {
    case "CampaignCreated":
        return aggregate.handleCampaignCreated(event)
    case "CampaignStatusChanged":
        return aggregate.handleStatusChanged(event)
    case "CampaignConfigUpdated":
        return aggregate.handleConfigUpdated(event)
    case "CampaignCompleted":
        return aggregate.handleCampaignCompleted(event)
    default:
        return fmt.Errorf("unknown event type: %s", event.EventType)
    }
}
```

### Step 3: Add Snapshot Management

**Add to**: `backend/internal/services/state_coordinator.go`

```go
// StateSnapshotManager handles state snapshots for performance
type StateSnapshotManager struct {
    db                *sqlx.DB
    snapshotInterval  int // Create snapshot every N events
}

// CreateSnapshot saves current aggregate state as snapshot
func (ssm *StateSnapshotManager) CreateSnapshot(
    ctx context.Context,
    aggregate *CampaignStateAggregate,
) error {
    aggregate.mu.RLock()
    defer aggregate.mu.RUnlock()
    
    snapshotData := map[string]interface{}{
        "entity_id":    aggregate.EntityID,
        "version":      aggregate.Version,
        "state":        aggregate.State,
        "metadata":     aggregate.Metadata,
        "last_updated": aggregate.LastUpdated,
    }
    
    jsonData, err := json.Marshal(snapshotData)
    if err != nil {
        return fmt.Errorf("failed to marshal snapshot data: %w", err)
    }
    
    query := `
        INSERT INTO state_snapshots (entity_id, entity_type, snapshot_version, state_data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (entity_id, entity_type, snapshot_version) 
        DO UPDATE SET state_data = EXCLUDED.state_data`
    
    _, err = ssm.db.ExecContext(ctx, query, 
        aggregate.EntityID, 
        "campaign", 
        aggregate.Version,
        jsonData,
    )
    
    return err
}

// LoadFromSnapshot reconstructs aggregate from latest snapshot
func (ssm *StateSnapshotManager) LoadFromSnapshot(
    ctx context.Context,
    entityID uuid.UUID,
) (*CampaignStateAggregate, error) {
    var snapshotData []byte
    var version int
    
    query := `
        SELECT state_data, snapshot_version 
        FROM state_snapshots 
        WHERE entity_id = $1 AND entity_type = 'campaign'
        ORDER BY snapshot_version DESC 
        LIMIT 1`
    
    err := ssm.db.QueryRowContext(ctx, query, entityID).Scan(&snapshotData, &version)
    if err != nil {
        return nil, fmt.Errorf("failed to load snapshot: %w", err)
    }
    
    var data map[string]interface{}
    if err := json.Unmarshal(snapshotData, &data); err != nil {
        return nil, fmt.Errorf("failed to unmarshal snapshot: %w", err)
    }
    
    // Reconstruct aggregate from snapshot data
    aggregate := &CampaignStateAggregate{
        EntityID:    entityID,
        Version:     version,
        LastUpdated: time.Now(), // Will be updated from events
        Metadata:    make(map[string]interface{}),
    }
    
    // Apply snapshot data to aggregate
    return aggregate, aggregate.applySnapshotData(data)
}
```

### Step 4: Update Campaign Orchestrator Integration

**File**: `backend/internal/services/campaign_orchestrator_service.go`

**Add state coordination to campaign operations**:
```go
func (c *CampaignOrchestratorService) UpdateCampaignStatusWithCoordination(
    ctx context.Context,
    campaignID uuid.UUID,
    newStatus models.CampaignStatus,
    metadata map[string]interface{},
) error {
    return c.stateManager.CoordinatedStateUpdate(
        ctx,
        campaignID,
        fmt.Sprintf("status_update_%s", newStatus),
        func(aggregate *CampaignStateAggregate) error {
            // Validate state transition
            if !c.validateStateTransition(aggregate.State, newStatus) {
                return fmt.Errorf("invalid state transition from %s to %s", 
                    aggregate.State, newStatus)
            }
            
            // Record state change event
            event := StateEvent{
                ID:          uuid.New(),
                EntityID:    campaignID,
                EventType:   "CampaignStatusChanged",
                EventData: map[string]interface{}{
                    "old_status": aggregate.State,
                    "new_status": newStatus,
                    "metadata":   metadata,
                },
                Version:       aggregate.Version + 1,
                CorrelationID: uuid.New(),
                Timestamp:     time.Now(),
            }
            
            // Apply event to aggregate
            aggregate.State = newStatus
            if aggregate.Metadata == nil {
                aggregate.Metadata = make(map[string]interface{})
            }
            for k, v := range metadata {
                aggregate.Metadata[k] = v
            }
            
            aggregate.PendingEvents = append(aggregate.PendingEvents, event)
            return nil
        },
    )
}
```

### Step 5: Create Integration Tests

**File**: `backend/internal/services/si002_state_coordination_test.go`

```go
package services

import (
    "context"
    "sync"
    "testing"
    "time"
    
    "github.com/stretchr/testify/suite"
    "github.com/google/uuid"
    "your-project/internal/testutil"
    "your-project/internal/models"
)

type SI002StateCoordinationTestSuite struct {
    testutil.ServiceTestSuite
    stateManager         *CentralizedStateManager
    campaignOrchestrator *CampaignOrchestratorService
}

func TestSI002StateCoordination(t *testing.T) {
    suite.Run(t, &SI002StateCoordinationTestSuite{
        ServiceTestSuite: testutil.ServiceTestSuite{
            UseDatabaseFromEnv: true, // MANDATORY: Use domainflow_production database
        },
    })
}

func (suite *SI002StateCoordinationTestSuite) TestConcurrentStateUpdates() {
    campaignID := uuid.New()
    
    // Initialize campaign state
    err := suite.stateManager.InitializeCampaignState(context.Background(), campaignID)
    suite.NoError(err)
    
    const numWorkers = 15
    const updatesPerWorker = 10
    
    var wg sync.WaitGroup
    errors := make(chan error, numWorkers*updatesPerWorker)
    
    // Simulate concurrent state updates
    for workerID := 0; workerID < numWorkers; workerID++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            for updateNum := 0; updateNum < updatesPerWorker; updateNum++ {
                err := suite.campaignOrchestrator.UpdateCampaignStatusWithCoordination(
                    context.Background(),
                    campaignID,
                    models.CampaignStatusRunning,
                    map[string]interface{}{
                        "worker_id": id,
                        "update_num": updateNum,
                        "timestamp": time.Now().Unix(),
                    },
                )
                
                if err != nil {
                    errors <- err
                }
            }
        }(workerID)
    }
    
    wg.Wait()
    close(errors)
    
    // Validate no errors occurred
    var errorList []error
    for err := range errors {
        errorList = append(errorList, err)
    }
    suite.Empty(errorList, "Should have no coordination errors")
    
    // Validate final state consistency
    suite.ValidateStateConsistency(campaignID)
}

func (suite *SI002StateCoordinationTestSuite) ValidateStateConsistency(campaignID uuid.UUID) {
    // Load final aggregate state
    aggregate, err := suite.stateManager.LoadStateAggregate(context.Background(), campaignID)
    suite.NoError(err)
    
    // Validate version consistency
    var maxVersion int
    err = suite.db.Get(&maxVersion, 
        "SELECT COALESCE(MAX(state_version), 0) FROM state_events WHERE entity_id = $1", 
        campaignID)
    suite.NoError(err)
    suite.Equal(maxVersion, aggregate.Version, "Aggregate version should match max event version")
    
    // Validate no gaps in event sequence
    var eventCount int
    err = suite.db.Get(&eventCount, 
        "SELECT COUNT(*) FROM state_events WHERE entity_id = $1", 
        campaignID)
    suite.NoError(err)
    suite.True(eventCount > 0, "Should have state events recorded")
}
```

---

## TESTING REQUIREMENTS

### Environment Setup
```bash
export TEST_POSTGRES_DSN="postgresql://username:password@localhost/domainflow_production"
export USE_REAL_DATABASE=true
export TEST_TIMEOUT=45s
export POSTGRES_DATABASE=domainflow_production
```

### Test Execution
```bash
# Run SI-002 specific tests against domainflow_production
go test ./internal/services -run TestSI002 -race -v -timeout 45s -tags=integration

# Test state coordination under load against domainflow_production
go test ./internal/services -run TestConcurrentState -race -count=3 -tags=integration
```

---

## CI/CD VALIDATION CHECKLIST

### Mandatory Checks
- [ ] `go test ./... -race` passes with zero data races
- [ ] `golangci-lint run` clean with zero critical issues
- [ ] SI-002 integration tests pass with real database
- [ ] Concurrent state update tests validate consistency
- [ ] Event sourcing rebuild tests pass
- [ ] State snapshot and recovery tests pass

### Database Validation
- [ ] Migration applies cleanly to `domainflow_production`
- [ ] State coordination locks function correctly
- [ ] Event sourcing tables handle concurrent writes
- [ ] Snapshot performance meets requirements (< 100ms reconstruction)

### Integration Validation
- [ ] Integration with SI-001 transaction management verified
- [ ] Campaign orchestrator state coordination working
- [ ] Worker service state synchronization validated
- [ ] Error recovery and rollback procedures tested

---

## SUCCESS CRITERIA

### Functional Requirements
1. **State Consistency**: All services maintain consistent state view
2. **Coordination Locking**: Prevents concurrent state modification conflicts
3. **Event Sourcing**: Complete audit trail of state changes
4. **Recovery**: Fast state reconstruction from events/snapshots

### Performance Requirements
1. **Coordination Overhead**: < 10ms additional latency for state updates
2. **Concurrent Throughput**: Support 100+ concurrent state operations
3. **Recovery Time**: < 500ms aggregate reconstruction from events

### Integration Requirements
1. **Transaction Integration**: Works seamlessly with SI-001 patterns
2. **Service Coordination**: Orchestrator and workers use centralized state
3. **Event Consistency**: Events maintain causal relationships

---

## ROLLBACK PROCEDURES

### Database Rollback
```sql
-- File: backend/database/migrations/007_rollback_si002.sql
BEGIN;
DROP FUNCTION IF EXISTS release_state_lock(UUID, UUID);
DROP FUNCTION IF EXISTS acquire_state_lock(UUID, VARCHAR, VARCHAR, INTEGER);
DROP TABLE IF EXISTS state_coordination_locks;
DROP TABLE IF EXISTS state_snapshots;
-- Remove added columns from state_events
ALTER TABLE state_events DROP COLUMN IF EXISTS aggregate_type;
ALTER TABLE state_events DROP COLUMN IF EXISTS causation_id;
ALTER TABLE state_events DROP COLUMN IF EXISTS correlation_id;
ALTER TABLE state_events DROP COLUMN IF EXISTS state_version;
COMMIT;
```

---

**Implementation Priority**: CRITICAL - Foundation for Phase 2B security features  
**Next Step**: Begin with PostgreSQL migration, then implement centralized state manager
