// File: backend/internal/services/state_coordinator.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// SI-002: Centralized State Management Components

// CentralizedStateManager manages state coordination across services
type CentralizedStateManager struct {
	db             *sqlx.DB
	eventStore     StateEventStore
	snapshotStore  StateSnapshotStore
	lockManager    *StateCoordinationLockManager
	eventBus       *EventBus
	mu             sync.RWMutex
	activeStates   map[uuid.UUID]*CampaignStateAggregate
	transactionMgr *postgres.TransactionManager
}

// CampaignStateAggregate represents the complete state aggregate for a campaign
type CampaignStateAggregate struct {
	EntityID      uuid.UUID                 `json:"entity_id"`
	Version       int                       `json:"version"`
	State         models.CampaignStatusEnum `json:"state"`
	Metadata      map[string]interface{}    `json:"metadata"`
	LastUpdated   time.Time                 `json:"last_updated"`
	PendingEvents []StateEvent              `json:"pending_events"`
	mu            sync.RWMutex
}

// StateEvent represents a state change event for SI-002
type StateEvent struct {
	ID            uuid.UUID              `json:"id"`
	EntityID      uuid.UUID              `json:"entity_id"`
	EventType     string                 `json:"event_type"`
	EventData     map[string]interface{} `json:"event_data"`
	Version       int                    `json:"version"`
	CorrelationID uuid.UUID              `json:"correlation_id"`
	CausationID   *uuid.UUID             `json:"causation_id,omitempty"`
	Timestamp     time.Time              `json:"timestamp"`
	Metadata      map[string]interface{} `json:"metadata"`
}

// StateCoordinationLockManager manages distributed state coordination locks
type StateCoordinationLockManager struct {
	db *sqlx.DB
}

// StateSnapshotStore interface for state snapshot operations
type StateSnapshotStore interface {
	CreateSnapshot(ctx context.Context, aggregate *CampaignStateAggregate) error
	LoadFromSnapshot(ctx context.Context, entityID uuid.UUID) (*CampaignStateAggregate, error)
	GetLatestSnapshotVersion(ctx context.Context, entityID uuid.UUID) (int, error)
}

// EventBus handles event distribution for SI-002
type EventBus struct {
	subscribers map[string][]EventHandler
	mu          sync.RWMutex
}

// EventHandler handles distributed events
type EventHandler func(ctx context.Context, event StateEvent) error

// NewCentralizedStateManager creates a new centralized state manager
func NewCentralizedStateManager(db *sqlx.DB) *CentralizedStateManager {
	return &CentralizedStateManager{
		db:             db,
		activeStates:   make(map[uuid.UUID]*CampaignStateAggregate),
		lockManager:    NewStateCoordinationLockManager(db),
		eventBus:       NewEventBus(),
		transactionMgr: postgres.NewTransactionManager(db),
	}
}

// NewStateCoordinationLockManager creates a new lock manager
func NewStateCoordinationLockManager(db *sqlx.DB) *StateCoordinationLockManager {
	return &StateCoordinationLockManager{db: db}
}

// NewEventBus creates a new event bus
func NewEventBus() *EventBus {
	return &EventBus{
		subscribers: make(map[string][]EventHandler),
	}
}

// CoordinatedStateUpdate performs coordinated state updates with event sourcing
func (csm *CentralizedStateManager) CoordinatedStateUpdate(
	ctx context.Context,
	entityID uuid.UUID,
	updateFunc func(*CampaignStateAggregate) (*StateEvent, error),
	options *postgres.CampaignTransactionOptions,
) error {
	// Establish distributed coordination lock with retry logic
	lockID := fmt.Sprintf("state-%s", entityID.String())

	var acquired bool
	var err error
	maxRetries := 10
	retryDelay := 100 * time.Millisecond

	for attempt := 0; attempt < maxRetries; attempt++ {
		acquired, err = csm.lockManager.AcquireLock(ctx, lockID, 1*time.Second)
		if err != nil {
			return fmt.Errorf("failed to acquire coordination lock: %w", err)
		}
		if acquired {
			break // Successfully acquired lock
		}

		// Wait before retrying if not the last attempt
		if attempt < maxRetries-1 {
			time.Sleep(retryDelay)
		}
	}

	if !acquired {
		return fmt.Errorf("failed to acquire coordination lock for entity %s after %d attempts", entityID, maxRetries)
	}

	defer func() {
		if releaseErr := csm.lockManager.ReleaseLock(ctx, lockID); releaseErr != nil {
			log.Printf("Failed to release coordination lock %s: %v", lockID, releaseErr)
		}
	}()

	// Load current state aggregate
	aggregate, err := csm.loadOrCreateAggregate(ctx, entityID)
	if err != nil {
		return fmt.Errorf("failed to load state aggregate: %w", err)
	}

	// Apply update function
	aggregate.mu.Lock()
	event, err := updateFunc(aggregate)
	if err != nil {
		aggregate.mu.Unlock()
		return fmt.Errorf("update function failed: %w", err)
	}

	// Set event metadata
	event.Version = aggregate.Version + 1
	event.Timestamp = time.Now()
	if options != nil {
		event.CorrelationID = uuid.New() // Generate correlation ID for tracking
	} else {
		event.CorrelationID = uuid.New()
	}

	// Store event with transactional safety
	var campaignID *uuid.UUID
	if options != nil && options.CampaignID != "" {
		if id, parseErr := uuid.Parse(options.CampaignID); parseErr == nil {
			campaignID = &id
		}
	}

	err = csm.transactionMgr.SafeTransactionWithMetrics(ctx, nil, "coordinated_state_update", campaignID, func(tx *sqlx.Tx) error {
		// Store the event
		if storeErr := csm.storeEvent(ctx, tx, event); storeErr != nil {
			return storeErr
		}

		// Update aggregate version
		aggregate.Version = event.Version
		aggregate.LastUpdated = event.Timestamp

		return nil
	})

	aggregate.mu.Unlock()

	if err != nil {
		return fmt.Errorf("failed to store state event: %w", err)
	}

	// Publish event to event bus
	if err := csm.eventBus.Publish(ctx, *event); err != nil {
		log.Printf("Failed to publish event to bus: %v", err)
	}

	// Update active states
	csm.mu.Lock()
	csm.activeStates[entityID] = aggregate
	csm.mu.Unlock()

	return nil
}

// AcquireLock acquires a distributed coordination lock
func (lm *StateCoordinationLockManager) AcquireLock(ctx context.Context, lockID string, timeout time.Duration) (bool, error) {
	// Use the actual table structure with lock_key as primary key
	query := `
		INSERT INTO state_coordination_locks (lock_key, locked_by, locked_at, expires_at, metadata)
		VALUES ($1, $2, NOW(), NOW() + INTERVAL '%d seconds', '{}')
		ON CONFLICT (lock_key) DO NOTHING
		RETURNING lock_key`

	var returnedKey string
	timeoutSeconds := int(timeout.Seconds())
	fullQuery := fmt.Sprintf(query, timeoutSeconds)

	err := lm.db.GetContext(ctx, &returnedKey, fullQuery, lockID, "state_coordinator")
	if err != nil {
		// If we get an error, might be because the lock already exists
		var count int
		checkQuery := `SELECT COUNT(*) FROM state_coordination_locks WHERE lock_key = $1 AND expires_at > NOW()`
		if checkErr := lm.db.GetContext(ctx, &count, checkQuery, lockID); checkErr == nil && count > 0 {
			return false, nil // Lock already exists and hasn't expired
		}
		return false, fmt.Errorf("failed to acquire lock %s: %w", lockID, err)
	}

	return returnedKey != "", nil
}

// ReleaseLock releases a distributed coordination lock
func (lm *StateCoordinationLockManager) ReleaseLock(ctx context.Context, lockID string) error {
	// Delete locks based on lock_key and locked_by to ensure we only release our own locks
	query := `DELETE FROM state_coordination_locks WHERE lock_key = $1 AND locked_by = $2`
	result, err := lm.db.ExecContext(ctx, query, lockID, "state_coordinator")
	if err != nil {
		return fmt.Errorf("failed to release lock %s: %w", lockID, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected for lock release %s: %w", lockID, err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("lock %s was not released (may not exist or be owned by another session)", lockID)
	}

	return nil
}

// loadOrCreateAggregate loads existing aggregate or creates new one
func (csm *CentralizedStateManager) loadOrCreateAggregate(ctx context.Context, entityID uuid.UUID) (*CampaignStateAggregate, error) {
	csm.mu.RLock()
	if aggregate, exists := csm.activeStates[entityID]; exists {
		csm.mu.RUnlock()
		return aggregate, nil
	}
	csm.mu.RUnlock()

	// Try to load from snapshot first
	aggregate, err := csm.loadFromSnapshot(ctx, entityID)
	if err == nil {
		// Apply events since snapshot
		return csm.replayEventsSinceSnapshot(ctx, aggregate)
	}

	// No snapshot found, rebuild from events
	return csm.rebuildFromEvents(ctx, entityID)
}

// storeEvent stores a state event in the database
func (csm *CentralizedStateManager) storeEvent(ctx context.Context, tx *sqlx.Tx, event *StateEvent) error {
	query := `
		INSERT INTO state_events (
			id, entity_id, event_type, event_data, state_version,
			correlation_id, causation_id, aggregate_type, timestamp, metadata
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)`

	eventDataJSON, err := json.Marshal(event.EventData)
	if err != nil {
		return fmt.Errorf("failed to marshal event data: %w", err)
	}

	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	_, err = tx.ExecContext(ctx, query,
		event.ID,
		event.EntityID,
		event.EventType,
		eventDataJSON,
		event.Version,
		event.CorrelationID,
		event.CausationID,
		"campaign_state", // aggregate_type
		event.Timestamp,
		metadataJSON,
	)

	return err
}

// Publish publishes an event to all subscribers
func (eb *EventBus) Publish(ctx context.Context, event StateEvent) error {
	eb.mu.RLock()
	handlers, exists := eb.subscribers[event.EventType]
	eb.mu.RUnlock()

	if !exists {
		return nil // No subscribers for this event type
	}

	for _, handler := range handlers {
		if err := handler(ctx, event); err != nil {
			log.Printf("Event handler failed for event %s: %v", event.EventType, err)
			// Continue with other handlers
		}
	}

	return nil
}

// Subscribe adds an event handler for a specific event type
func (eb *EventBus) Subscribe(eventType string, handler EventHandler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.subscribers[eventType] = append(eb.subscribers[eventType], handler)
}

// Event Sourcing Methods for State Reconstruction

// loadFromSnapshot loads a state aggregate from the latest snapshot
func (csm *CentralizedStateManager) loadFromSnapshot(ctx context.Context, entityID uuid.UUID) (*CampaignStateAggregate, error) {
	query := `
		SELECT entity_id, snapshot_version, state_data, created_at, metadata
		FROM state_snapshots
		WHERE entity_id = $1 AND entity_type = 'campaign'
		ORDER BY snapshot_version DESC
		LIMIT 1`

	var snapshot struct {
		EntityID        uuid.UUID `db:"entity_id"`
		SnapshotVersion int       `db:"snapshot_version"`
		StateData       []byte    `db:"state_data"`
		CreatedAt       time.Time `db:"created_at"`
		Metadata        []byte    `db:"metadata"`
	}

	err := csm.db.GetContext(ctx, &snapshot, query, entityID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no snapshot found for entity %s", entityID)
		}
		return nil, fmt.Errorf("failed to load snapshot: %w", err)
	}

	// Deserialize state data
	var stateData map[string]interface{}
	if err := json.Unmarshal(snapshot.StateData, &stateData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal state data: %w", err)
	}

	var metadata map[string]interface{}
	if err := json.Unmarshal(snapshot.Metadata, &metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	// Extract campaign status from state data
	var campaignState models.CampaignStatusEnum
	if stateVal, exists := stateData["status"]; exists {
		if statusStr, ok := stateVal.(string); ok {
			campaignState = models.CampaignStatusEnum(statusStr)
		}
	}

	aggregate := &CampaignStateAggregate{
		EntityID:      snapshot.EntityID,
		Version:       snapshot.SnapshotVersion,
		State:         campaignState,
		Metadata:      metadata,
		LastUpdated:   snapshot.CreatedAt,
		PendingEvents: make([]StateEvent, 0),
	}

	return aggregate, nil
}

// replayEventsSinceSnapshot replays events since the snapshot to get current state
func (csm *CentralizedStateManager) replayEventsSinceSnapshot(ctx context.Context, aggregate *CampaignStateAggregate) (*CampaignStateAggregate, error) {
	query := `
		SELECT id, entity_id, event_type, event_data, state_version,
			   correlation_id, causation_id, timestamp, metadata
		FROM state_events
		WHERE entity_id = $1 AND state_version > $2
		ORDER BY state_version ASC`

	var events []StateEvent
	rows, err := csm.db.QueryxContext(ctx, query, aggregate.EntityID, aggregate.Version)
	if err != nil {
		return nil, fmt.Errorf("failed to query events since snapshot: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var event StateEvent
		var eventDataJSON, metadataJSON []byte
		var causationID sql.NullString

		err := rows.Scan(
			&event.ID,
			&event.EntityID,
			&event.EventType,
			&eventDataJSON,
			&event.Version,
			&event.CorrelationID,
			&causationID,
			&event.Timestamp,
			&metadataJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}

		// Unmarshal JSON fields
		if err := json.Unmarshal(eventDataJSON, &event.EventData); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event data: %w", err)
		}
		if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event metadata: %w", err)
		}

		if causationID.Valid {
			if id, parseErr := uuid.Parse(causationID.String); parseErr == nil {
				event.CausationID = &id
			}
		}

		events = append(events, event)
	}

	// Apply events to aggregate
	for _, event := range events {
		if err := csm.applyEventToAggregate(aggregate, event); err != nil {
			return nil, fmt.Errorf("failed to apply event %s: %w", event.ID, err)
		}
	}

	return aggregate, nil
}

// rebuildFromEvents rebuilds the complete state aggregate from all events
func (csm *CentralizedStateManager) rebuildFromEvents(ctx context.Context, entityID uuid.UUID) (*CampaignStateAggregate, error) {
	query := `
		SELECT id, entity_id, event_type, event_data, state_version,
			   correlation_id, causation_id, timestamp, metadata
		FROM state_events
		WHERE entity_id = $1
		ORDER BY state_version ASC`

	var events []StateEvent
	rows, err := csm.db.QueryxContext(ctx, query, entityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query all events: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var event StateEvent
		var eventDataJSON, metadataJSON []byte
		var causationID sql.NullString

		err := rows.Scan(
			&event.ID,
			&event.EntityID,
			&event.EventType,
			&eventDataJSON,
			&event.Version,
			&event.CorrelationID,
			&causationID,
			&event.Timestamp,
			&metadataJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}

		// Unmarshal JSON fields
		if err := json.Unmarshal(eventDataJSON, &event.EventData); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event data: %w", err)
		}
		if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event metadata: %w", err)
		}

		if causationID.Valid {
			if id, parseErr := uuid.Parse(causationID.String); parseErr == nil {
				event.CausationID = &id
			}
		}

		events = append(events, event)
	}

	if len(events) == 0 {
		// Create new aggregate if no events exist
		return &CampaignStateAggregate{
			EntityID:      entityID,
			Version:       0,
			State:         models.CampaignStatusPending,
			Metadata:      make(map[string]interface{}),
			LastUpdated:   time.Now(),
			PendingEvents: make([]StateEvent, 0),
		}, nil
	}

	// Initialize aggregate from first event
	firstEvent := events[0]
	aggregate := &CampaignStateAggregate{
		EntityID:      entityID,
		Version:       0,
		State:         models.CampaignStatusPending,
		Metadata:      make(map[string]interface{}),
		LastUpdated:   firstEvent.Timestamp,
		PendingEvents: make([]StateEvent, 0),
	}

	// Apply all events to rebuild state
	for _, event := range events {
		if err := csm.applyEventToAggregate(aggregate, event); err != nil {
			return nil, fmt.Errorf("failed to apply event %s during rebuild: %w", event.ID, err)
		}
	}

	return aggregate, nil
}

// applyEventToAggregate applies a single event to the state aggregate
func (csm *CentralizedStateManager) applyEventToAggregate(aggregate *CampaignStateAggregate, event StateEvent) error {
	aggregate.Version = event.Version
	aggregate.LastUpdated = event.Timestamp

	// Apply event based on event type
	switch event.EventType {
	case "campaign_status_changed":
		if newStatus, exists := event.EventData["new_status"]; exists {
			if statusStr, ok := newStatus.(string); ok {
				aggregate.State = models.CampaignStatusEnum(statusStr)
			}
		}
	case "campaign_metadata_updated":
		if metadata, exists := event.EventData["metadata"]; exists {
			if metadataMap, ok := metadata.(map[string]interface{}); ok {
				// Merge metadata
				for k, v := range metadataMap {
					aggregate.Metadata[k] = v
				}
			}
		}
	case "campaign_created":
		aggregate.State = models.CampaignStatusPending
		if metadata, exists := event.EventData["metadata"]; exists {
			if metadataMap, ok := metadata.(map[string]interface{}); ok {
				aggregate.Metadata = metadataMap
			}
		}
	case "campaign_queued":
		// Transition to queued state
		if newStatus, exists := event.EventData["new_status"]; exists {
			if statusStr, ok := newStatus.(string); ok {
				aggregate.State = models.CampaignStatusEnum(statusStr)
			}
		} else {
			aggregate.State = models.CampaignStatusQueued
		}
	case "campaign_started":
		// Transition to running state
		if newStatus, exists := event.EventData["new_status"]; exists {
			if statusStr, ok := newStatus.(string); ok {
				aggregate.State = models.CampaignStatusEnum(statusStr)
			}
		} else {
			aggregate.State = models.CampaignStatusRunning
		}
	default:
		// Unknown event type - log but don't fail
		log.Printf("WARNING: Unknown event type %s for entity %s", event.EventType, aggregate.EntityID)
	}

	return nil
}

// CreateSnapshot creates a state snapshot for performance optimization
func (csm *CentralizedStateManager) CreateSnapshot(ctx context.Context, aggregate *CampaignStateAggregate) error {
	stateData := map[string]interface{}{
		"status":   string(aggregate.State),
		"metadata": aggregate.Metadata,
	}

	stateDataJSON, err := json.Marshal(stateData)
	if err != nil {
		return fmt.Errorf("failed to marshal state data: %w", err)
	}

	metadataJSON, err := json.Marshal(aggregate.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO state_snapshots (entity_id, entity_type, snapshot_version, state_data, created_at, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (entity_id, entity_type, snapshot_version) DO NOTHING`

	_, err = csm.db.ExecContext(ctx, query,
		aggregate.EntityID,
		"campaign", // entity_type
		aggregate.Version,
		stateDataJSON,
		aggregate.LastUpdated,
		metadataJSON,
	)

	if err != nil {
		return fmt.Errorf("failed to create snapshot: %w", err)
	}

	log.Printf("STATE_SNAPSHOT_CREATED: Entity %s [Version: %d]", aggregate.EntityID, aggregate.Version)
	return nil
}

// GetStateEvents retrieves state events for testing and debugging
func (csm *CentralizedStateManager) GetStateEvents(ctx context.Context, entityID uuid.UUID, offset, limit int) ([]StateEvent, error) {
	query := `
		SELECT id, entity_id, event_type, event_data, state_version,
			   correlation_id, causation_id, timestamp, metadata
		FROM state_events
		WHERE entity_id = $1
		ORDER BY state_version ASC
		LIMIT $2 OFFSET $3`

	var events []StateEvent
	rows, err := csm.db.QueryxContext(ctx, query, entityID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query state events: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var event StateEvent
		var eventDataJSON, metadataJSON []byte
		var causationID sql.NullString

		err := rows.Scan(
			&event.ID,
			&event.EntityID,
			&event.EventType,
			&eventDataJSON,
			&event.Version,
			&event.CorrelationID,
			&causationID,
			&event.Timestamp,
			&metadataJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}

		// Unmarshal JSON fields
		if err := json.Unmarshal(eventDataJSON, &event.EventData); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event data: %w", err)
		}
		if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event metadata: %w", err)
		}

		if causationID.Valid {
			if id, parseErr := uuid.Parse(causationID.String); parseErr == nil {
				event.CausationID = &id
			}
		}

		events = append(events, event)
	}

	return events, nil
}

// StoreEvent stores a state event (public method for testing)
func (csm *CentralizedStateManager) StoreEvent(ctx context.Context, event *StateEvent) error {
	return csm.transactionMgr.SafeTransactionWithMetrics(ctx, nil, "store_event", nil, func(tx *sqlx.Tx) error {
		return csm.storeEvent(ctx, tx, event)
	})
}

// StateCoordinator defines the interface for state coordination
type StateCoordinator interface {
	TransitionState(ctx context.Context, campaignID uuid.UUID, toState models.CampaignStatusEnum, source models.StateEventSourceEnum, actor, reason string, context *models.StateEventContext) error
	ValidateStateConsistency(ctx context.Context, campaignID uuid.UUID) error
	ReconcileState(ctx context.Context, campaignID uuid.UUID) error
	GetStateHistory(ctx context.Context, campaignID uuid.UUID, limit, offset int) ([]*models.StateChangeEvent, error)
	AddEventHandler(eventType models.StateEventTypeEnum, handler StateEventHandler)
	AddStateValidator(validator StateValidator)
	GetMetrics() map[string]int64
}

// TransactionManagerInterface defines the interface for transaction management
type TransactionManagerInterface interface {
	SafeTransaction(ctx context.Context, opts *sql.TxOptions, operation string, fn func(*sqlx.Tx) error) error
}

// StateCoordinatorImpl provides centralized state management with event sourcing
type StateCoordinatorImpl struct {
	db             *sqlx.DB
	campaignStore  store.CampaignStore
	auditLogStore  store.AuditLogStore
	stateMachine   *CampaignStateMachine
	transactionMgr TransactionManagerInterface

	// Event sourcing components
	eventStore      StateEventStore
	eventHandlers   map[models.StateEventTypeEnum][]StateEventHandler
	stateValidators []StateValidator

	// Concurrency control
	stateLocks      map[uuid.UUID]*sync.RWMutex
	locksMutex      sync.RWMutex
	sequenceCounter int64
	sequenceMutex   sync.Mutex

	// Configuration
	enableValidation     bool
	enableReconciliation bool
	validationInterval   time.Duration

	// Metrics and monitoring
	transitionCount int64
	validationCount int64
	errorCount      int64
	metricsLock     sync.RWMutex
}

// StateEventStore interface for storing and retrieving state events
type StateEventStore interface {
	CreateStateChangeEvent(ctx context.Context, exec store.Querier, event *models.StateChangeEvent) error
	CreateStateTransitionEvent(ctx context.Context, exec store.Querier, event *models.StateTransitionEvent) error
	CreateStateValidationEvent(ctx context.Context, exec store.Querier, event *models.StateValidationEvent) error
	CreateStateReconciliationEvent(ctx context.Context, exec store.Querier, event *models.StateReconciliationEvent) error
	GetStateEventsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, offset int) ([]*models.StateChangeEvent, error)
	GetLastSequenceNumber(ctx context.Context, exec store.Querier) (int64, error)
}

// StateEventHandler handles specific types of state events
type StateEventHandler func(ctx context.Context, event *models.StateChangeEvent) error

// StateValidator validates state consistency
type StateValidator func(ctx context.Context, campaignID uuid.UUID, currentState models.CampaignStatusEnum) error

// StateCoordinatorConfig holds configuration for the state coordinator
type StateCoordinatorConfig struct {
	EnableValidation     bool
	EnableReconciliation bool
	ValidationInterval   time.Duration
}

// NewStateCoordinator creates a new state coordinator with event sourcing
func NewStateCoordinator(
	db *sqlx.DB,
	campaignStore store.CampaignStore,
	auditLogStore store.AuditLogStore,
	config StateCoordinatorConfig,
) StateCoordinator {
	sc := &StateCoordinatorImpl{
		db:                   db,
		campaignStore:        campaignStore,
		auditLogStore:        auditLogStore,
		stateMachine:         NewCampaignStateMachine(),
		transactionMgr:       postgres.NewTransactionManager(db),
		eventHandlers:        make(map[models.StateEventTypeEnum][]StateEventHandler),
		stateValidators:      make([]StateValidator, 0),
		stateLocks:           make(map[uuid.UUID]*sync.RWMutex),
		enableValidation:     config.EnableValidation,
		enableReconciliation: config.EnableReconciliation,
		validationInterval:   config.ValidationInterval,
	}

	// Initialize event store with real database persistence via campaign store
	sc.eventStore = &stateEventStoreImpl{
		campaignStore: campaignStore,
	}

	// Set up default validators
	sc.setupDefaultValidators()

	log.Printf("StateCoordinator: Initialized with validation=%v, reconciliation=%v, validation_interval=%v",
		config.EnableValidation, config.EnableReconciliation, config.ValidationInterval)

	return sc
}

// TransitionState performs a coordinated state transition with full event sourcing
func (sc *StateCoordinatorImpl) TransitionState(
	ctx context.Context,
	campaignID uuid.UUID,
	toState models.CampaignStatusEnum,
	source models.StateEventSourceEnum,
	actor, reason string,
	context *models.StateEventContext,
) error {
	log.Printf("StateCoordinator: Transitioning campaign %s to state %s from source %s", campaignID, toState, source)

	// Acquire campaign-specific lock
	lock := sc.getCampaignLock(campaignID)
	lock.Lock()
	defer lock.Unlock()

	// Use transaction manager for coordinated state transition
	return sc.transactionMgr.SafeTransaction(ctx, nil, "state_transition", func(tx *sqlx.Tx) error {
		return sc.performStateTransition(ctx, tx, campaignID, toState, source, actor, reason, context)
	})
}

// performStateTransition executes the state transition within a transaction
func (sc *StateCoordinatorImpl) performStateTransition(
	ctx context.Context,
	tx *sqlx.Tx,
	campaignID uuid.UUID,
	toState models.CampaignStatusEnum,
	source models.StateEventSourceEnum,
	actor, reason string,
	eventContext *models.StateEventContext,
) error {
	startTime := time.Now()

	// Get current campaign state
	campaign, err := sc.campaignStore.GetCampaignByID(ctx, tx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
	}

	fromState := campaign.Status
	log.Printf("StateCoordinator: Campaign %s current state: %s, target state: %s", campaignID, fromState, toState)

	// Validate transition using state machine
	if err := sc.stateMachine.ValidateTransition(CampaignStatus(fromState), CampaignStatus(toState)); err != nil {
		sc.incrementErrorCount()

		// Create validation failure event
		validationEvent := models.NewStateValidationEvent(
			campaignID, "transition_validation", fromState, toState, false,
		)
		validationEvent.FailureReason = sql.NullString{String: err.Error(), Valid: true}
		validationEvent.CheckedBy = sql.NullString{String: "state_machine", Valid: true}

		if storeErr := sc.eventStore.CreateStateValidationEvent(ctx, tx, validationEvent); storeErr != nil {
			log.Printf("StateCoordinator: Failed to store validation event: %v", storeErr)
		}

		return fmt.Errorf("state transition validation failed: %w", err)
	}

	// Generate sequence number for event ordering
	sequenceNumber := sc.getNextSequenceNumber()

	// Create state change event
	stateChangeEvent := models.NewStateChangeEvent(campaignID, fromState, toState, source, actor, reason)
	stateChangeEvent.SequenceNumber = sequenceNumber

	// Add context if provided
	if eventContext != nil {
		contextJSON, err := eventContext.ToJSON()
		if err != nil {
			log.Printf("StateCoordinator: Failed to serialize context: %v", err)
		} else {
			stateChangeEvent.Context = contextJSON
		}
	}

	// Store state change event
	if err := sc.eventStore.CreateStateChangeEvent(ctx, tx, stateChangeEvent); err != nil {
		return fmt.Errorf("failed to store state change event: %w", err)
	}

	// Create detailed transition event with the state event ID
	transitionEvent := models.NewStateTransitionEvent(stateChangeEvent.ID, campaignID, fromState, toState, source, actor)
	transitionEvent.ProcessingTime = time.Since(startTime).Milliseconds()

	// Add metadata if context provided
	if eventContext != nil {
		metadataJSON, err := eventContext.ToJSON()
		if err != nil {
			log.Printf("StateCoordinator: Failed to serialize metadata: %v", err)
		} else {
			transitionEvent.Metadata = metadataJSON
		}
	}

	if err := sc.eventStore.CreateStateTransitionEvent(ctx, tx, transitionEvent); err != nil {
		return fmt.Errorf("failed to store state transition event: %w", err)
	}

	// Update campaign state
	campaign.Status = toState
	campaign.UpdatedAt = time.Now().UTC()

	// Set completion time for terminal states
	if toState == models.CampaignStatusCompleted ||
		toState == models.CampaignStatusFailed ||
		toState == models.CampaignStatusCancelled {
		campaign.CompletedAt = &campaign.UpdatedAt
	}

	if err := sc.campaignStore.UpdateCampaign(ctx, tx, campaign); err != nil {
		return fmt.Errorf("failed to update campaign state: %w", err)
	}

	// Run state validators if enabled
	if sc.enableValidation {
		if err := sc.validateState(ctx, tx, campaignID, toState); err != nil {
			log.Printf("StateCoordinator: State validation failed for campaign %s: %v", campaignID, err)
			// Don't fail the transaction for validation errors, just log them
		}
	}

	// Trigger event handlers
	if err := sc.triggerEventHandlers(ctx, stateChangeEvent); err != nil {
		log.Printf("StateCoordinator: Event handler error for campaign %s: %v", campaignID, err)
		// Don't fail the transaction for handler errors
	}

	// Create audit log entry
	sc.createAuditLogEntry(ctx, tx, campaign, stateChangeEvent, actor, reason)

	// Update metrics
	sc.incrementTransitionCount()

	log.Printf("StateCoordinator: Successfully transitioned campaign %s from %s to %s (took %v)",
		campaignID, fromState, toState, time.Since(startTime))

	return nil
}

// ValidateStateConsistency performs comprehensive state validation
func (sc *StateCoordinatorImpl) ValidateStateConsistency(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("StateCoordinator: Validating state consistency for campaign %s", campaignID)

	lock := sc.getCampaignLock(campaignID)
	lock.RLock()
	defer lock.RUnlock()

	return sc.transactionMgr.SafeTransaction(ctx, nil, "state_validation", func(tx *sqlx.Tx) error {
		campaign, err := sc.campaignStore.GetCampaignByID(ctx, tx, campaignID)
		if err != nil {
			return fmt.Errorf("failed to get campaign for validation: %w", err)
		}

		return sc.validateState(ctx, tx, campaignID, campaign.Status)
	})
}

// ReconcileState performs state reconciliation across services
func (sc *StateCoordinatorImpl) ReconcileState(ctx context.Context, campaignID uuid.UUID) error {
	if !sc.enableReconciliation {
		return fmt.Errorf("state reconciliation is disabled")
	}

	log.Printf("StateCoordinator: Reconciling state for campaign %s", campaignID)

	lock := sc.getCampaignLock(campaignID)
	lock.Lock()
	defer lock.Unlock()

	return sc.transactionMgr.SafeTransaction(ctx, nil, "state_reconciliation", func(tx *sqlx.Tx) error {
		// Get authoritative state from campaign store
		campaign, err := sc.campaignStore.GetCampaignByID(ctx, tx, campaignID)
		if err != nil {
			return fmt.Errorf("failed to get authoritative state: %w", err)
		}

		authoritativeState := campaign.Status

		// Validate against state machine rules
		if !sc.stateMachine.IsValidState(CampaignStatus(authoritativeState)) {
			// Create reconciliation event
			reconciliationEvent := &models.StateReconciliationEvent{
				ID:                   uuid.New(),
				CampaignID:           campaignID,
				DiscrepancyType:      "invalid_state",
				DetectedState:        authoritativeState,
				AuthorativeState:     models.CampaignStatusFailed, // Force to failed for invalid states
				ReconciliationAction: "force_sync",
				ReconciliationBy:     sql.NullString{String: "state_coordinator", Valid: true},
				Resolution:           sql.NullString{String: "Invalid state corrected to failed", Valid: true},
				Timestamp:            time.Now().UTC(),
				CreatedAt:            time.Now().UTC(),
			}

			if err := sc.eventStore.CreateStateReconciliationEvent(ctx, tx, reconciliationEvent); err != nil {
				log.Printf("StateCoordinator: Failed to store reconciliation event: %v", err)
			}

			// Force state to failed
			campaign.Status = models.CampaignStatusFailed
			campaign.UpdatedAt = time.Now().UTC()
			campaign.ErrorMessage = models.StringPtr("State reconciliation: Invalid state detected and corrected")

			if err := sc.campaignStore.UpdateCampaign(ctx, tx, campaign); err != nil {
				return fmt.Errorf("failed to reconcile invalid state: %w", err)
			}

			log.Printf("StateCoordinator: Reconciled invalid state for campaign %s: %s -> %s",
				campaignID, authoritativeState, models.CampaignStatusFailed)
		}

		return nil
	})
}

// GetStateHistory returns the state transition history for a campaign
func (sc *StateCoordinatorImpl) GetStateHistory(ctx context.Context, campaignID uuid.UUID, limit, offset int) ([]*models.StateChangeEvent, error) {
	lock := sc.getCampaignLock(campaignID)
	lock.RLock()
	defer lock.RUnlock()

	return sc.eventStore.GetStateEventsByCampaign(ctx, sc.db, campaignID, limit, offset)
}

// AddEventHandler registers an event handler for specific event types
func (sc *StateCoordinatorImpl) AddEventHandler(eventType models.StateEventTypeEnum, handler StateEventHandler) {
	if sc.eventHandlers[eventType] == nil {
		sc.eventHandlers[eventType] = make([]StateEventHandler, 0)
	}
	sc.eventHandlers[eventType] = append(sc.eventHandlers[eventType], handler)
	log.Printf("StateCoordinator: Added event handler for type %s", eventType)
}

// AddStateValidator registers a state validator
func (sc *StateCoordinatorImpl) AddStateValidator(validator StateValidator) {
	sc.stateValidators = append(sc.stateValidators, validator)
	log.Printf("StateCoordinator: Added state validator")
}

// Internal helper methods

func (sc *StateCoordinatorImpl) getCampaignLock(campaignID uuid.UUID) *sync.RWMutex {
	sc.locksMutex.Lock()
	defer sc.locksMutex.Unlock()

	if lock, exists := sc.stateLocks[campaignID]; exists {
		return lock
	}

	lock := &sync.RWMutex{}
	sc.stateLocks[campaignID] = lock
	return lock
}

func (sc *StateCoordinatorImpl) getNextSequenceNumber() int64 {
	sc.sequenceMutex.Lock()
	defer sc.sequenceMutex.Unlock()
	sc.sequenceCounter++
	return sc.sequenceCounter
}

func (sc *StateCoordinatorImpl) validateState(ctx context.Context, tx *sqlx.Tx, campaignID uuid.UUID, state models.CampaignStatusEnum) error {
	sc.incrementValidationCount()

	for _, validator := range sc.stateValidators {
		if err := validator(ctx, campaignID, state); err != nil {
			// Create validation failure event
			validationEvent := models.NewStateValidationEvent(
				campaignID, "consistency_check", state, state, false,
			)
			validationEvent.FailureReason = sql.NullString{String: err.Error(), Valid: true}
			validationEvent.CheckedBy = sql.NullString{String: "state_coordinator", Valid: true}

			if storeErr := sc.eventStore.CreateStateValidationEvent(ctx, tx, validationEvent); storeErr != nil {
				log.Printf("StateCoordinator: Failed to store validation event: %v", storeErr)
			}

			return err
		}
	}

	// Create successful validation event
	validationEvent := models.NewStateValidationEvent(
		campaignID, "consistency_check", state, state, true,
	)
	validationEvent.CheckedBy = sql.NullString{String: "state_coordinator", Valid: true}

	if err := sc.eventStore.CreateStateValidationEvent(ctx, tx, validationEvent); err != nil {
		log.Printf("StateCoordinator: Failed to store validation event: %v", err)
	}

	return nil
}

func (sc *StateCoordinatorImpl) triggerEventHandlers(ctx context.Context, event *models.StateChangeEvent) error {
	handlers := sc.eventHandlers[event.EventType]
	for _, handler := range handlers {
		if err := handler(ctx, event); err != nil {
			log.Printf("StateCoordinator: Event handler failed: %v", err)
			// Continue with other handlers even if one fails
		}
	}
	return nil
}

func (sc *StateCoordinatorImpl) createAuditLogEntry(ctx context.Context, tx *sqlx.Tx, campaign *models.Campaign, event *models.StateChangeEvent, actor, reason string) {
	auditDetails := map[string]interface{}{
		"event_id":        event.ID,
		"previous_state":  event.PreviousState,
		"new_state":       event.NewState,
		"event_source":    event.EventSource,
		"sequence_number": event.SequenceNumber,
		"reason":          reason,
		"coordinated_by":  "state_coordinator",
	}

	detailsJSON, err := json.Marshal(auditDetails)
	if err != nil {
		log.Printf("StateCoordinator: Failed to marshal audit details: %v", err)
		return
	}

	var auditUserID uuid.NullUUID
	if campaign.UserID != nil {
		auditUserID = uuid.NullUUID{UUID: *campaign.UserID, Valid: true}
	}

	auditLog := &models.AuditLog{
		Timestamp:  time.Now().UTC(),
		UserID:     auditUserID,
		Action:     fmt.Sprintf("State Transition: %s -> %s", event.PreviousState, event.NewState),
		EntityType: sql.NullString{String: "Campaign", Valid: true},
		EntityID:   uuid.NullUUID{UUID: campaign.ID, Valid: true},
		Details:    models.JSONRawMessagePtr(json.RawMessage(detailsJSON)),
	}

	if err := sc.auditLogStore.CreateAuditLog(ctx, tx, auditLog); err != nil {
		log.Printf("StateCoordinator: Failed to create audit log: %v", err)
	}
}

func (sc *StateCoordinatorImpl) setupDefaultValidators() {
	// Add basic state consistency validator
	sc.AddStateValidator(func(ctx context.Context, campaignID uuid.UUID, currentState models.CampaignStatusEnum) error {
		// Validate that the state is a known state
		switch currentState {
		case models.CampaignStatusPending, models.CampaignStatusQueued, models.CampaignStatusRunning,
			models.CampaignStatusPausing, models.CampaignStatusPaused, models.CampaignStatusCompleted,
			models.CampaignStatusFailed, models.CampaignStatusCancelled:
			return nil
		default:
			return fmt.Errorf("unknown campaign state: %s", currentState)
		}
	})
}

// Metrics methods

func (sc *StateCoordinatorImpl) incrementTransitionCount() {
	sc.metricsLock.Lock()
	defer sc.metricsLock.Unlock()
	sc.transitionCount++
}

func (sc *StateCoordinatorImpl) incrementValidationCount() {
	sc.metricsLock.Lock()
	defer sc.metricsLock.Unlock()
	sc.validationCount++
}

func (sc *StateCoordinatorImpl) incrementErrorCount() {
	sc.metricsLock.Lock()
	defer sc.metricsLock.Unlock()
	sc.errorCount++
}

// GetMetrics returns current state coordinator metrics
func (sc *StateCoordinatorImpl) GetMetrics() map[string]int64 {
	sc.metricsLock.RLock()
	defer sc.metricsLock.RUnlock()

	return map[string]int64{
		"transitions":  sc.transitionCount,
		"validations":  sc.validationCount,
		"errors":       sc.errorCount,
		"active_locks": int64(len(sc.stateLocks)),
	}
}

// Extension for state machine to add validation method
func (sm *CampaignStateMachine) IsValidState(status CampaignStatus) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	_, exists := sm.transitions[status]
	return exists
}

// Real StateEventStore implementation using campaign store database methods
type stateEventStoreImpl struct {
	campaignStore store.CampaignStore
}

func (s *stateEventStoreImpl) CreateStateChangeEvent(ctx context.Context, exec store.Querier, event *models.StateChangeEvent) error {
	// Use the campaign store's CreateStateEvent method
	result, err := s.campaignStore.CreateStateEvent(ctx, exec, event)
	if err != nil {
		return fmt.Errorf("failed to create state change event in database: %w", err)
	}

	// Update the event with the database result
	event.ID = result.EventID
	event.SequenceNumber = result.SequenceNumber
	event.CreatedAt = result.CreatedAt

	if !result.Success {
		return fmt.Errorf("state change event creation failed: %s", result.ErrorMessage)
	}

	log.Printf("StateEventStore: Created state change event %s for campaign %s (sequence: %d)",
		result.EventID, event.CampaignID, result.SequenceNumber)
	return nil
}

func (s *stateEventStoreImpl) CreateStateTransitionEvent(ctx context.Context, exec store.Querier, event *models.StateTransitionEvent) error {
	err := s.campaignStore.CreateStateTransition(ctx, exec, event)
	if err != nil {
		return fmt.Errorf("failed to create state transition event in database: %w", err)
	}

	log.Printf("StateEventStore: Created state transition event %s for campaign %s (%s -> %s)",
		event.ID, event.CampaignID, event.FromState, event.ToState)
	return nil
}

func (s *stateEventStoreImpl) CreateStateValidationEvent(ctx context.Context, exec store.Querier, event *models.StateValidationEvent) error {
	// Convert to state change event for storage (validation events are stored as state events)
	stateEvent := &models.StateChangeEvent{
		ID:               event.ID,
		CampaignID:       event.CampaignID,
		EventType:        models.StateEventTypeValidationResult,
		EventSource:      models.StateEventSourceStateCoordinator,
		PreviousState:    event.CurrentState,
		NewState:         event.ExpectedState,
		ValidationPassed: event.ValidationPassed,
		Timestamp:        event.Timestamp,
		CreatedAt:        event.CreatedAt,
	}

	// Add validation context
	if event.CheckedBy.Valid || event.FailureReason.Valid {
		contextData := map[string]interface{}{
			"validation_type":   event.ValidationType,
			"validation_passed": event.ValidationPassed,
		}
		if event.CheckedBy.Valid {
			contextData["checked_by"] = event.CheckedBy.String
		}
		if event.FailureReason.Valid {
			contextData["failure_reason"] = event.FailureReason.String
		}

		contextJSON, err := json.Marshal(contextData)
		if err == nil {
			rawJSON := json.RawMessage(contextJSON)
			stateEvent.Context = &rawJSON
		}
	}

	result, err := s.campaignStore.CreateStateEvent(ctx, exec, stateEvent)
	if err != nil {
		return fmt.Errorf("failed to create state validation event in database: %w", err)
	}

	// Update the validation event with database result
	event.ID = result.EventID
	event.CreatedAt = result.CreatedAt

	log.Printf("StateEventStore: Created state validation event %s for campaign %s (passed: %v)",
		result.EventID, event.CampaignID, event.ValidationPassed)
	return nil
}

func (s *stateEventStoreImpl) CreateStateReconciliationEvent(ctx context.Context, exec store.Querier, event *models.StateReconciliationEvent) error {
	// Convert to state change event for storage
	stateEvent := &models.StateChangeEvent{
		ID:            event.ID,
		CampaignID:    event.CampaignID,
		EventType:     models.StateEventTypeProgressUpdate,
		EventSource:   models.StateEventSourceStateCoordinator,
		PreviousState: event.DetectedState,
		NewState:      event.AuthorativeState,
		Timestamp:     event.Timestamp,
		CreatedAt:     event.CreatedAt,
	}

	// Add reconciliation context
	contextData := map[string]interface{}{
		"discrepancy_type":      event.DiscrepancyType,
		"reconciliation_action": event.ReconciliationAction,
	}
	if event.ReconciliationBy.Valid {
		contextData["reconciliation_by"] = event.ReconciliationBy.String
	}
	if event.Resolution.Valid {
		contextData["resolution"] = event.Resolution.String
	}

	contextJSON, err := json.Marshal(contextData)
	if err == nil {
		rawJSON := json.RawMessage(contextJSON)
		stateEvent.Context = &rawJSON
	}

	result, err := s.campaignStore.CreateStateEvent(ctx, exec, stateEvent)
	if err != nil {
		return fmt.Errorf("failed to create state reconciliation event in database: %w", err)
	}

	// Update the reconciliation event with database result
	event.ID = result.EventID
	event.CreatedAt = result.CreatedAt

	log.Printf("StateEventStore: Created state reconciliation event %s for campaign %s (%s)",
		result.EventID, event.CampaignID, event.DiscrepancyType)
	return nil
}

func (s *stateEventStoreImpl) GetStateEventsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, offset int) ([]*models.StateChangeEvent, error) {
	// Convert offset to sequence number for the campaign store method
	fromSequence := int64(offset)

	events, err := s.campaignStore.GetStateEventsByCampaign(ctx, exec, campaignID, fromSequence, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get state events from database: %w", err)
	}

	log.Printf("StateEventStore: Retrieved %d state events for campaign %s (from sequence: %d, limit: %d)",
		len(events), campaignID, fromSequence, limit)
	return events, nil
}

func (s *stateEventStoreImpl) GetLastSequenceNumber(ctx context.Context, exec store.Querier) (int64, error) {
	// Query the maximum sequence number across all campaigns
	query := `SELECT COALESCE(MAX(sequence_number), 0) FROM campaign_state_events`

	var lastSequence int64
	err := exec.GetContext(ctx, &lastSequence, query)
	if err != nil {
		return 0, fmt.Errorf("failed to get last sequence number: %w", err)
	}

	return lastSequence, nil
}
