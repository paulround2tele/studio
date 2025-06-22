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
			"validation_type": event.ValidationType,
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
		"discrepancy_type": event.DiscrepancyType,
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
