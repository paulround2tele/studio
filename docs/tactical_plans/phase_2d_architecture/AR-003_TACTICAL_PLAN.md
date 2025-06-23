# **AR-003: EVENT-DRIVEN ARCHITECTURE GAPS - TACTICAL IMPLEMENTATION PLAN**

**Finding ID**: AR-003  
**Phase**: 2D Architecture  
**Priority**: MEDIUM  
**Estimated Effort**: 2-3 days  
**Dependencies**: AR-002 Microservice Communication Patterns  

---

## **FINDING OVERVIEW**

### **Problem Statement**
DomainFlow's event-driven architecture lacks consistency in event handling, event sourcing implementation, and CQRS patterns. Event schemas are not standardized, event ordering is not guaranteed, and event replay capabilities are missing, leading to data inconsistency and reduced system reliability.

### **Technical Impact**
- **Event Schema Inconsistency**: Multiple event formats and versioning approaches across services
- **Event Ordering Issues**: Lack of guaranteed event processing order causing race conditions
- **Event Replay Limitations**: Missing capability to replay events for system recovery
- **CQRS Pattern Gaps**: Incomplete command-query separation affecting performance
- **Event Sourcing Inconsistency**: Mixed approaches to event storage and projection updates
- **Event Consistency**: Eventual consistency patterns not properly implemented

### **Integration Points**
- **Communication Layer**: Builds on AR-002 async messaging patterns
- **Database Layer**: Leverages PF-001 query optimization for event storage
- **Caching Layer**: Integrates with PF-004 for projection caching
- **State Management**: Extends SI-002 centralized state management
- **Performance Monitoring**: Uses PF-002 monitoring infrastructure

---

## **POSTGRESQL MIGRATION**

### **Event-Driven Architecture Schema**
```sql
-- Migration: 20250622_event_driven_architecture.up.sql
CREATE TABLE IF NOT EXISTS event_store (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    aggregate_id VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    event_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    causation_id UUID, -- Event that caused this event
    correlation_id UUID, -- Request/saga that originated this event
    stream_position BIGINT NOT NULL, -- Position in the aggregate stream
    global_position BIGSERIAL NOT NULL, -- Global ordering position
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(aggregate_id, stream_position)
);

CREATE TABLE IF NOT EXISTS event_projections (
    id BIGSERIAL PRIMARY KEY,
    projection_name VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    projection_data JSONB NOT NULL,
    last_event_position BIGINT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(projection_name, aggregate_id)
);

CREATE TABLE IF NOT EXISTS event_schemas (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL,
    schema_definition JSONB NOT NULL,
    backward_compatible BOOLEAN DEFAULT true,
    deprecated BOOLEAN DEFAULT false,
    migration_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_type, version)
);

CREATE TABLE IF NOT EXISTS event_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    subscription_name VARCHAR(100) NOT NULL UNIQUE,
    service_name VARCHAR(100) NOT NULL,
    event_types TEXT[] NOT NULL,
    filter_criteria JSONB DEFAULT '{}',
    checkpoint_position BIGINT DEFAULT 0,
    processing_status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'error'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_details TEXT,
    last_processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saga_instances (
    id BIGSERIAL PRIMARY KEY,
    saga_id UUID NOT NULL UNIQUE,
    saga_type VARCHAR(100) NOT NULL,
    correlation_id UUID NOT NULL,
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    saga_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'started', -- 'started', 'completed', 'compensating', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_details TEXT,
    compensation_data JSONB DEFAULT '{}'
);

-- Strategic indexes for event sourcing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_aggregate 
    ON event_store(aggregate_id, stream_position);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_global_position 
    ON event_store(global_position);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_store_type_time 
    ON event_store(event_type, occurred_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projections_name_aggregate 
    ON event_projections(projection_name, aggregate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_checkpoint 
    ON event_subscriptions(checkpoint_position) WHERE processing_status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_correlation 
    ON saga_instances(correlation_id, status);

-- Event sourcing utility functions
CREATE OR REPLACE FUNCTION get_aggregate_events(
    p_aggregate_id VARCHAR(100),
    p_from_position BIGINT DEFAULT 0
)
RETURNS TABLE(
    event_id UUID,
    event_type VARCHAR(100),
    event_data JSONB,
    stream_position BIGINT,
    occurred_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.event_id,
        es.event_type,
        es.event_data,
        es.stream_position,
        es.occurred_at
    FROM event_store es
    WHERE es.aggregate_id = p_aggregate_id
    AND es.stream_position > p_from_position
    ORDER BY es.stream_position;
END;
$$;

CREATE OR REPLACE FUNCTION append_event(
    p_event_id UUID,
    p_aggregate_id VARCHAR(100),
    p_aggregate_type VARCHAR(50),
    p_event_type VARCHAR(100),
    p_event_data JSONB,
    p_metadata JSONB DEFAULT '{}',
    p_causation_id UUID DEFAULT NULL,
    p_correlation_id UUID DEFAULT NULL,
    p_expected_version BIGINT DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
    current_version BIGINT;
    new_position BIGINT;
BEGIN
    -- Get current version for optimistic concurrency control
    SELECT COALESCE(MAX(stream_position), 0) INTO current_version
    FROM event_store
    WHERE aggregate_id = p_aggregate_id;
    
    -- Check expected version if provided
    IF p_expected_version IS NOT NULL AND current_version != p_expected_version THEN
        RAISE EXCEPTION 'Concurrency conflict: expected version %, actual version %', 
            p_expected_version, current_version;
    END IF;
    
    new_position := current_version + 1;
    
    -- Insert the event
    INSERT INTO event_store (
        event_id, aggregate_id, aggregate_type, event_type,
        event_data, metadata, causation_id, correlation_id, stream_position
    ) VALUES (
        p_event_id, p_aggregate_id, p_aggregate_type, p_event_type,
        p_event_data, p_metadata, p_causation_id, p_correlation_id, new_position
    );
    
    RETURN new_position;
END;
$$;

CREATE OR REPLACE FUNCTION get_event_stream(
    p_from_position BIGINT DEFAULT 0,
    p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE(
    event_id UUID,
    aggregate_id VARCHAR(100),
    event_type VARCHAR(100),
    event_data JSONB,
    global_position BIGINT,
    occurred_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.event_id,
        es.aggregate_id,
        es.event_type,
        es.event_data,
        es.global_position,
        es.occurred_at
    FROM event_store es
    WHERE es.global_position > p_from_position
    ORDER BY es.global_position
    LIMIT p_limit;
END;
$$;
```

---

## **IMPLEMENTATION GUIDANCE**

### **1. Event Sourcing Implementation**

**Implement comprehensive event sourcing framework:**

```go
// pkg/eventsourcing/event_store.go
type Event struct {
    ID            uuid.UUID              `json:"id"`
    AggregateID   string                 `json:"aggregate_id"`
    AggregateType string                 `json:"aggregate_type"`
    EventType     string                 `json:"event_type"`
    EventVersion  int                    `json:"event_version"`
    Data          map[string]interface{} `json:"data"`
    Metadata      map[string]interface{} `json:"metadata"`
    CausationID   *uuid.UUID             `json:"causation_id,omitempty"`
    CorrelationID *uuid.UUID             `json:"correlation_id,omitempty"`
    StreamPosition int64                 `json:"stream_position"`
    GlobalPosition int64                 `json:"global_position"`
    OccurredAt    time.Time              `json:"occurred_at"`
}

type EventStore interface {
    AppendEvent(ctx context.Context, event *Event, expectedVersion *int64) error
    GetAggregateEvents(ctx context.Context, aggregateID string, fromVersion int64) ([]*Event, error)
    GetEventStream(ctx context.Context, fromPosition int64, limit int) ([]*Event, error)
    Subscribe(ctx context.Context, subscription *EventSubscription) error
}

type PostgreSQLEventStore struct {
    db             *sql.DB
    eventPublisher EventPublisher
    metrics        *EventStoreMetrics
}

func (es *PostgreSQLEventStore) AppendEvent(ctx context.Context, event *Event, expectedVersion *int64) error {
    // Begin transaction for consistency
    tx, err := es.db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback()
    
    // Call append_event function with optimistic concurrency control
    var newPosition int64
    err = tx.QueryRowContext(ctx, `
        SELECT append_event($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        event.ID, event.AggregateID, event.AggregateType, event.EventType,
        event.Data, event.Metadata, event.CausationID, event.CorrelationID,
        expectedVersion,
    ).Scan(&newPosition)
    
    if err != nil {
        es.metrics.RecordAppendError(event.EventType, err)
        return fmt.Errorf("failed to append event: %w", err)
    }
    
    event.StreamPosition = newPosition
    
    // Commit transaction
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }
    
    // Publish event asynchronously
    go es.eventPublisher.PublishEvent(context.Background(), event)
    
    es.metrics.RecordAppendSuccess(event.EventType)
    return nil
}

func (es *PostgreSQLEventStore) GetAggregateEvents(ctx context.Context, aggregateID string, fromVersion int64) ([]*Event, error) {
    rows, err := es.db.QueryContext(ctx, `
        SELECT event_id, event_type, event_data, stream_position, occurred_at
        FROM get_aggregate_events($1, $2)`,
        aggregateID, fromVersion,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to query aggregate events: %w", err)
    }
    defer rows.Close()
    
    var events []*Event
    for rows.Next() {
        event := &Event{AggregateID: aggregateID}
        var eventData []byte
        
        err := rows.Scan(
            &event.ID, &event.EventType, &eventData,
            &event.StreamPosition, &event.OccurredAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan event: %w", err)
        }
        
        if err := json.Unmarshal(eventData, &event.Data); err != nil {
            return nil, fmt.Errorf("failed to unmarshal event data: %w", err)
        }
        
        events = append(events, event)
    }
    
    return events, nil
}
```

**Implementation Steps:**
1. **Event store setup** - Implement PostgreSQL-based event store with ACID guarantees
2. **Aggregate root pattern** - Define base aggregate with event sourcing capabilities
3. **Event versioning** - Implement event schema versioning and migration
4. **Optimistic concurrency** - Use expected version for conflict detection
5. **Event replay** - Implement event replay for system recovery

### **2. CQRS Pattern Implementation**

**Implement Command Query Responsibility Segregation:**

```go
// pkg/cqrs/command_handler.go
type Command interface {
    GetID() uuid.UUID
    GetAggregateID() string
    GetCommandType() string
    Validate() error
}

type CommandHandler interface {
    Handle(ctx context.Context, command Command) error
    GetCommandType() string
}

type CommandBus struct {
    handlers map[string]CommandHandler
    metrics  *CommandMetrics
    logger   *log.Logger
}

func (cb *CommandBus) RegisterHandler(handler CommandHandler) {
    cb.handlers[handler.GetCommandType()] = handler
}

func (cb *CommandBus) Send(ctx context.Context, command Command) error {
    // Validate command
    if err := command.Validate(); err != nil {
        cb.metrics.RecordCommandValidationError(command.GetCommandType())
        return fmt.Errorf("command validation failed: %w", err)
    }
    
    // Find handler
    handler, exists := cb.handlers[command.GetCommandType()]
    if !exists {
        cb.metrics.RecordCommandHandlerNotFound(command.GetCommandType())
        return fmt.Errorf("no handler found for command type: %s", command.GetCommandType())
    }
    
    // Execute command
    start := time.Now()
    err := handler.Handle(ctx, command)
    duration := time.Since(start)
    
    if err != nil {
        cb.metrics.RecordCommandError(command.GetCommandType(), duration)
        return fmt.Errorf("command handling failed: %w", err)
    }
    
    cb.metrics.RecordCommandSuccess(command.GetCommandType(), duration)
    return nil
}

// pkg/cqrs/query_handler.go
type Query interface {
    GetID() uuid.UUID
    GetQueryType() string
    Validate() error
}

type QueryResult interface{}

type QueryHandler interface {
    Handle(ctx context.Context, query Query) (QueryResult, error)
    GetQueryType() string
}

type QueryBus struct {
    handlers map[string]QueryHandler
    cache    cache.Cache
    metrics  *QueryMetrics
}

func (qb *QueryBus) Send(ctx context.Context, query Query) (QueryResult, error) {
    // Validate query
    if err := query.Validate(); err != nil {
        qb.metrics.RecordQueryValidationError(query.GetQueryType())
        return nil, fmt.Errorf("query validation failed: %w", err)
    }
    
    // Check cache first
    if cached := qb.getCachedResult(query); cached != nil {
        qb.metrics.RecordQueryCacheHit(query.GetQueryType())
        return cached, nil
    }
    
    // Find handler
    handler, exists := qb.handlers[query.GetQueryType()]
    if !exists {
        qb.metrics.RecordQueryHandlerNotFound(query.GetQueryType())
        return nil, fmt.Errorf("no handler found for query type: %s", query.GetQueryType())
    }
    
    // Execute query
    start := time.Now()
    result, err := handler.Handle(ctx, query)
    duration := time.Since(start)
    
    if err != nil {
        qb.metrics.RecordQueryError(query.GetQueryType(), duration)
        return nil, fmt.Errorf("query handling failed: %w", err)
    }
    
    // Cache result
    qb.cacheResult(query, result)
    
    qb.metrics.RecordQuerySuccess(query.GetQueryType(), duration)
    return result, nil
}
```

**Implementation Steps:**
1. **Command/Query separation** - Implement separate command and query buses
2. **Handler registration** - Create handler registry with automatic discovery
3. **Validation framework** - Implement consistent validation across commands/queries
4. **Result caching** - Cache query results for performance optimization
5. **Metrics integration** - Track command/query performance and success rates

### **3. Event Projection Management**

**Implement robust event projection system:**

```go
// pkg/projections/projection_manager.go
type Projection interface {
    GetName() string
    GetEventTypes() []string
    Handle(ctx context.Context, event *Event) error
    Rebuild(ctx context.Context, fromPosition int64) error
}

type ProjectionManager struct {
    eventStore    EventStore
    projections   map[string]Projection
    checkpointer  *ProjectionCheckpointer
    metrics       *ProjectionMetrics
    rebuilder     *ProjectionRebuilder
}

func (pm *ProjectionManager) RegisterProjection(projection Projection) {
    pm.projections[projection.GetName()] = projection
    
    // Start subscription for this projection
    subscription := &EventSubscription{
        Name:       projection.GetName(),
        EventTypes: projection.GetEventTypes(),
        Handler:    pm.createProjectionHandler(projection),
    }
    
    go pm.eventStore.Subscribe(context.Background(), subscription)
}

func (pm *ProjectionManager) createProjectionHandler(projection Projection) EventHandler {
    return func(ctx context.Context, event *Event) error {
        // Check if projection should handle this event
        if !pm.shouldHandle(projection, event) {
            return nil
        }
        
        // Handle event with projection
        start := time.Now()
        err := projection.Handle(ctx, event)
        duration := time.Since(start)
        
        if err != nil {
            pm.metrics.RecordProjectionError(projection.GetName(), event.EventType, duration)
            return fmt.Errorf("projection handling failed: %w", err)
        }
        
        // Update checkpoint
        if err := pm.checkpointer.UpdateCheckpoint(projection.GetName(), event.GlobalPosition); err != nil {
            pm.metrics.RecordCheckpointError(projection.GetName())
            return fmt.Errorf("checkpoint update failed: %w", err)
        }
        
        pm.metrics.RecordProjectionSuccess(projection.GetName(), event.EventType, duration)
        return nil
    }
}

func (pm *ProjectionManager) RebuildProjection(ctx context.Context, projectionName string) error {
    projection, exists := pm.projections[projectionName]
    if !exists {
        return fmt.Errorf("projection not found: %s", projectionName)
    }
    
    // Get current checkpoint
    checkpoint, err := pm.checkpointer.GetCheckpoint(projectionName)
    if err != nil {
        return fmt.Errorf("failed to get checkpoint: %w", err)
    }
    
    // Reset checkpoint to force rebuild
    if err := pm.checkpointer.ResetCheckpoint(projectionName); err != nil {
        return fmt.Errorf("failed to reset checkpoint: %w", err)
    }
    
    // Rebuild projection
    return pm.rebuilder.RebuildProjection(ctx, projection, checkpoint)
}

// pkg/projections/domain_projection.go
type DomainProjection struct {
    db      *sql.DB
    cache   cache.Cache
    name    string
    metrics *ProjectionMetrics
}

func (dp *DomainProjection) Handle(ctx context.Context, event *Event) error {
    switch event.EventType {
    case "DomainCreated":
        return dp.handleDomainCreated(ctx, event)
    case "DomainUpdated":
        return dp.handleDomainUpdated(ctx, event)
    case "DomainDeleted":
        return dp.handleDomainDeleted(ctx, event)
    default:
        return nil // Ignore unknown events
    }
}

func (dp *DomainProjection) handleDomainCreated(ctx context.Context, event *Event) error {
    // Extract domain data from event
    domainData := event.Data
    
    // Begin transaction
    tx, err := dp.db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback()
    
    // Update projection table
    _, err = tx.ExecContext(ctx, `
        INSERT INTO event_projections (projection_name, aggregate_id, projection_data, last_event_position, version)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (projection_name, aggregate_id)
        DO UPDATE SET 
            projection_data = $3,
            last_event_position = $4,
            version = event_projections.version + 1,
            updated_at = NOW()`,
        dp.name, event.AggregateID, domainData, event.GlobalPosition,
    )
    
    if err != nil {
        return fmt.Errorf("failed to update projection: %w", err)
    }
    
    // Commit transaction
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }
    
    // Invalidate cache
    dp.cache.Delete(fmt.Sprintf("domain:%s", event.AggregateID))
    
    return nil
}
```

**Implementation Steps:**
1. **Projection registration** - Automatic projection discovery and registration
2. **Event subscription** - Durable event subscriptions for projections
3. **Checkpoint management** - Track projection progress with PostgreSQL checkpoints
4. **Projection rebuilding** - Support for projection rebuilding from event history
5. **Cache integration** - Integrate projections with caching layer for performance

### **4. Saga Pattern Implementation**

**Implement distributed saga orchestration:**

```go
// pkg/saga/saga_orchestrator.go
type SagaStep struct {
    StepID             string                 `json:"step_id"`
    ServiceName        string                 `json:"service_name"`
    Command            Command                `json:"command"`
    CompensationCommand Command               `json:"compensation_command"`
    RetryPolicy        *RetryPolicy          `json:"retry_policy"`
    Timeout            time.Duration         `json:"timeout"`
    Metadata           map[string]interface{} `json:"metadata"`
}

type SagaInstance struct {
    ID            uuid.UUID              `json:"id"`
    SagaType      string                 `json:"saga_type"`
    CorrelationID uuid.UUID              `json:"correlation_id"`
    CurrentStep   int                    `json:"current_step"`
    TotalSteps    int                    `json:"total_steps"`
    Status        SagaStatus             `json:"status"`
    SagaData      map[string]interface{} `json:"saga_data"`
    Steps         []SagaStep             `json:"steps"`
    StartedAt     time.Time              `json:"started_at"`
    CompletedAt   *time.Time             `json:"completed_at,omitempty"`
    ErrorDetails  string                 `json:"error_details,omitempty"`
}

type SagaOrchestrator struct {
    db           *sql.DB
    commandBus   *CommandBus
    eventStore   EventStore
    lockManager  *DistributedLockManager
    metrics      *SagaMetrics
}

func (so *SagaOrchestrator) StartSaga(ctx context.Context, sagaType string, correlationID uuid.UUID, steps []SagaStep, initialData map[string]interface{}) (*SagaInstance, error) {
    saga := &SagaInstance{
        ID:            uuid.New(),
        SagaType:      sagaType,
        CorrelationID: correlationID,
        CurrentStep:   0,
        TotalSteps:    len(steps),
        Status:        SagaStatusStarted,
        SagaData:      initialData,
        Steps:         steps,
        StartedAt:     time.Now(),
    }
    
    // Store saga instance
    if err := so.storeSagaInstance(ctx, saga); err != nil {
        return nil, fmt.Errorf("failed to store saga instance: %w", err)
    }
    
    // Execute first step
    if err := so.executeNextStep(ctx, saga); err != nil {
        return nil, fmt.Errorf("failed to execute first step: %w", err)
    }
    
    so.metrics.RecordSagaStarted(sagaType)
    return saga, nil
}

func (so *SagaOrchestrator) executeNextStep(ctx context.Context, saga *SagaInstance) error {
    if saga.CurrentStep >= saga.TotalSteps {
        return so.completeSaga(ctx, saga)
    }
    
    step := saga.Steps[saga.CurrentStep]
    
    // Acquire distributed lock for saga execution
    lock := fmt.Sprintf("saga:%s", saga.ID.String())
    if err := so.lockManager.AcquireLock(ctx, lock, 30*time.Second); err != nil {
        return fmt.Errorf("failed to acquire saga lock: %w", err)
    }
    defer so.lockManager.ReleaseLock(ctx, lock)
    
    // Execute step with timeout
    stepCtx, cancel := context.WithTimeout(ctx, step.Timeout)
    defer cancel()
    
    err := so.commandBus.Send(stepCtx, step.Command)
    if err != nil {
        so.metrics.RecordSagaStepError(saga.SagaType, step.StepID)
        return so.handleStepFailure(ctx, saga, step, err)
    }
    
    // Move to next step
    saga.CurrentStep++
    if err := so.updateSagaInstance(ctx, saga); err != nil {
        return fmt.Errorf("failed to update saga instance: %w", err)
    }
    
    so.metrics.RecordSagaStepSuccess(saga.SagaType, step.StepID)
    
    // Continue with next step
    return so.executeNextStep(ctx, saga)
}

func (so *SagaOrchestrator) handleStepFailure(ctx context.Context, saga *SagaInstance, failedStep SagaStep, err error) error {
    saga.Status = SagaStatusCompensating
    saga.ErrorDetails = err.Error()
    
    // Start compensation from current step backwards
    return so.startCompensation(ctx, saga)
}

func (so *SagaOrchestrator) startCompensation(ctx context.Context, saga *SagaInstance) error {
    // Execute compensation commands in reverse order
    for i := saga.CurrentStep - 1; i >= 0; i-- {
        step := saga.Steps[i]
        if step.CompensationCommand == nil {
            continue // Skip steps without compensation
        }
        
        stepCtx, cancel := context.WithTimeout(ctx, step.Timeout)
        err := so.commandBus.Send(stepCtx, step.CompensationCommand)
        cancel()
        
        if err != nil {
            so.metrics.RecordSagaCompensationError(saga.SagaType, step.StepID)
            // Log error but continue compensation
            log.Printf("Compensation failed for step %s: %v", step.StepID, err)
        } else {
            so.metrics.RecordSagaCompensationSuccess(saga.SagaType, step.StepID)
        }
    }
    
    saga.Status = SagaStatusFailed
    completedAt := time.Now()
    saga.CompletedAt = &completedAt
    
    return so.updateSagaInstance(ctx, saga)
}
```

**Implementation Steps:**
1. **Saga definition** - Define saga types with steps and compensation actions
2. **Orchestration engine** - Implement saga orchestrator with state management
3. **Distributed locking** - Prevent concurrent saga execution conflicts
4. **Compensation handling** - Implement reliable compensation for failed sagas
5. **Saga monitoring** - Track saga execution and failure patterns

---

## **INTEGRATION TESTS**

### **Event Sourcing Testing**
```go
func TestEventSourcing(t *testing.T) {
    // Use domainflow_production database
    suite := testutil.ServiceTestSuite{UseDatabaseFromEnv: true}
    testDB := suite.SetupDatabase(t)
    defer testDB.Close()
    
    eventStore := NewPostgreSQLEventStore(testDB)
    
    // Test event appending
    t.Run("AppendEvent", func(t *testing.T) {
        event := &Event{
            ID:            uuid.New(),
            AggregateID:   "domain-123",
            AggregateType: "Domain",
            EventType:     "DomainCreated",
            Data:          map[string]interface{}{"name": "test.com"},
            OccurredAt:    time.Now(),
        }
        
        err := eventStore.AppendEvent(context.Background(), event, nil)
        assert.NoError(t, err)
        assert.Equal(t, int64(1), event.StreamPosition)
    })
    
    // Test optimistic concurrency
    t.Run("OptimisticConcurrency", func(t *testing.T) {
        aggregateID := "domain-456"
        
        // First event
        event1 := &Event{
            ID:            uuid.New(),
            AggregateID:   aggregateID,
            AggregateType: "Domain",
            EventType:     "DomainCreated",
            Data:          map[string]interface{}{"name": "test1.com"},
        }
        
        err := eventStore.AppendEvent(context.Background(), event1, nil)
        assert.NoError(t, err)
        
        // Second event with wrong expected version should fail
        event2 := &Event{
            ID:            uuid.New(),
            AggregateID:   aggregateID,
            AggregateType: "Domain",
            EventType:     "DomainUpdated",
            Data:          map[string]interface{}{"name": "test2.com"},
        }
        
        wrongVersion := int64(5)
        err = eventStore.AppendEvent(context.Background(), event2, &wrongVersion)
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "Concurrency conflict")
    })
}

func TestCQRSPattern(t *testing.T) {
    commandBus := setupCommandBus(t)
    queryBus := setupQueryBus(t)
    
    // Test command handling
    t.Run("CommandHandling", func(t *testing.T) {
        command := &CreateDomainCommand{
            ID:          uuid.New(),
            AggregateID: "domain-789",
            Name:        "example.com",
        }
        
        err := commandBus.Send(context.Background(), command)
        assert.NoError(t, err)
    })
    
    // Test query handling with caching
    t.Run("QueryHandling", func(t *testing.T) {
        query := &GetDomainQuery{
            ID:       uuid.New(),
            DomainID: "domain-789",
        }
        
        // First query should hit the database
        result1, err := queryBus.Send(context.Background(), query)
        assert.NoError(t, err)
        assert.NotNil(t, result1)
        
        // Second query should hit the cache
        result2, err := queryBus.Send(context.Background(), query)
        assert.NoError(t, err)
        assert.Equal(t, result1, result2)
    })
}

func TestSagaOrchestration(t *testing.T) {
    orchestrator := setupSagaOrchestrator(t)
    
    // Test successful saga execution
    t.Run("SuccessfulSaga", func(t *testing.T) {
        steps := []SagaStep{
            {
                StepID:      "reserve-funds",
                ServiceName: "payment-service",
                Command:     &ReserveFundsCommand{Amount: 100},
                CompensationCommand: &ReleaseFundsCommand{Amount: 100},
                Timeout:     5 * time.Second,
            },
            {
                StepID:      "create-order",
                ServiceName: "order-service",
                Command:     &CreateOrderCommand{Items: []string{"item1"}},
                CompensationCommand: &CancelOrderCommand{},
                Timeout:     5 * time.Second,
            },
        }
        
        saga, err := orchestrator.StartSaga(
            context.Background(),
            "order-saga",
            uuid.New(),
            steps,
            map[string]interface{}{"customer_id": "cust-123"},
        )
        
        assert.NoError(t, err)
        assert.Equal(t, SagaStatusStarted, saga.Status)
        
        // Wait for saga completion
        time.Sleep(100 * time.Millisecond)
        
        // Verify saga completed
        updatedSaga, err := orchestrator.GetSaga(context.Background(), saga.ID)
        assert.NoError(t, err)
        assert.Equal(t, SagaStatusCompleted, updatedSaga.Status)
    })
}
```

---

## **CI/CD VALIDATION CHECKLIST**

### **Event-Driven Architecture Quality Gates**
- [ ] **Event Schema Validation**: All events conform to registered schemas
- [ ] **Event Sourcing Integrity**: Event store maintains consistency and ordering
- [ ] **CQRS Pattern Compliance**: Clear separation between commands and queries
- [ ] **Projection Consistency**: All projections are up-to-date with event stream
- [ ] **Saga Reliability**: All sagas have proper compensation handling
- [ ] **Event Replay Capability**: System can recover through event replay

### **Database Schema Validation**
```bash
# Validate event sourcing schema
POSTGRES_DATABASE=domainflow_production go test ./pkg/eventsourcing/... -tags=integration -run=TestEventSourcingSchema

# Check event store consistency
POSTGRES_DATABASE=domainflow_production psql $TEST_POSTGRES_DSN -c "SELECT COUNT(*) FROM event_store WHERE aggregate_id = 'test';"

# Validate projection consistency
POSTGRES_DATABASE=domainflow_production go test ./pkg/projections/... -tags=integration -run=TestProjectionConsistency -race
```

### **Deployment Pipeline Integration**
```yaml
# .github/workflows/event-driven-validation.yml
event-driven-validation:
  runs-on: ubuntu-latest
  steps:
    - name: Event Schema Validation
      run: |
        go run ./cmd/event-schema-validator --schemas=./schemas/events/
        
    - name: Event Sourcing Tests
      run: |
        POSTGRES_DATABASE=domainflow_production go test ./pkg/eventsourcing/... -tags=integration -timeout=10m
      env:
        POSTGRES_DATABASE: domainflow_production
        
    - name: CQRS Pattern Tests
      run: |
        POSTGRES_DATABASE=domainflow_production go test ./pkg/cqrs/... -tags=integration -race -timeout=5m
      env:
        POSTGRES_DATABASE: domainflow_production
        
    - name: Saga Orchestration Tests
      run: |
        POSTGRES_DATABASE=domainflow_production go test ./pkg/saga/... -tags=integration -timeout=10m
      env:
        POSTGRES_DATABASE: domainflow_production
```

---

## **SUCCESS CRITERIA**

### **Quantitative Metrics**
- **Event Processing Latency**: < 10ms p95 for event handling
- **Projection Lag**: < 100ms behind event stream
- **Saga Success Rate**: > 99.5% successful saga completion
- **Event Schema Compliance**: 100% events follow registered schemas
- **Event Replay Speed**: Complete system replay within 1 hour

### **Qualitative Indicators**
- **Data Consistency**: Eventual consistency guarantees across all projections
- **System Reliability**: Improved fault tolerance through event sourcing
- **Debugging Capability**: Complete event history for system debugging
- **Scalability**: Horizontal scaling through event-driven patterns

### **Monitoring Dashboard Integration**
```go
// Integration with existing monitoring (building on PF-002)
func (es *PostgreSQLEventStore) RegisterMetrics(registry *prometheus.Registry) {
    eventAppendLatencyHistogram := prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "domainflow_event_append_latency_seconds",
            Help: "Event append latency",
        },
        []string{"event_type"},
    )
    
    projectionLagGauge := prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "domainflow_projection_lag_seconds",
            Help: "Projection lag behind event stream",
        },
        []string{"projection_name"},
    )
    
    registry.MustRegister(eventAppendLatencyHistogram, projectionLagGauge)
}
```

---

## **ROLLBACK PROCEDURES**

### **Event-Driven Architecture Rollback Plan**
1. **Event Schema Rollback**: Support backward compatible event schemas
2. **Projection Rollback**: Rebuild projections from previous checkpoint
3. **Saga Rollback**: Complete in-flight sagas before system rollback
4. **Event Store Rollback**: Point-in-time restore of event store

### **Database Rollback**
```sql
-- Migration: 20250622_event_driven_architecture.down.sql
DROP TABLE IF EXISTS saga_instances;
DROP TABLE IF EXISTS event_subscriptions;
DROP TABLE IF EXISTS event_schemas;
DROP TABLE IF EXISTS event_projections;
DROP FUNCTION IF EXISTS get_event_stream(BIGINT, INTEGER);
DROP FUNCTION IF EXISTS append_event(UUID, VARCHAR(100), VARCHAR(50), VARCHAR(100), JSONB, JSONB, UUID, UUID, BIGINT);
DROP FUNCTION IF EXISTS get_aggregate_events(VARCHAR(100), BIGINT);
DROP TABLE IF EXISTS event_store;
```

---

**Implementation Priority**: Implement after AR-002 Communication Patterns completion  
**Validation Required**: Event processing latency < 10ms p95, projection lag < 100ms  
**Next Document**: AR-004 API Design Inconsistencies