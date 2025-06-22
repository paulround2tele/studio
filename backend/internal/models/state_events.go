// File: backend/internal/models/state_events.go
package models

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// StateEventTypeEnum defines the types of state events that can occur
type StateEventTypeEnum string

const (
	StateEventTypeTransition        StateEventTypeEnum = "state_transition"
	StateEventTypeValidationResult  StateEventTypeEnum = "validation_result"
	StateEventTypeProgressUpdate    StateEventTypeEnum = "progress_update"
	StateEventTypeErrorOccurred     StateEventTypeEnum = "error_occurred"
	StateEventTypeConfigChange      StateEventTypeEnum = "configuration_change"
	StateEventTypeResourceAlloc     StateEventTypeEnum = "resource_allocation"
	StateEventTypeBatchProcessed    StateEventTypeEnum = "batch_processed"
	StateEventTypeWorkerAssigned    StateEventTypeEnum = "worker_assigned"
	StateEventTypeCheckpointCreated StateEventTypeEnum = "checkpoint_created"
)

// StateEventSourceEnum defines the source of state events
type StateEventSourceEnum string

const (
	StateEventSourceOrchestrator     StateEventSourceEnum = "orchestrator"
	StateEventSourceDomainGen        StateEventSourceEnum = "domain_generation"
	StateEventSourceDNSValidation    StateEventSourceEnum = "dns_validation"
	StateEventSourceHTTPKeyword      StateEventSourceEnum = "http_keyword"
	StateEventSourceWorker           StateEventSourceEnum = "worker"
	StateEventSourceStateCoordinator StateEventSourceEnum = "state_coordinator"
)

// StateChangeEvent represents a state change event with full context
type StateChangeEvent struct {
	ID               uuid.UUID            `db:"id" json:"id"`
	EventType        StateEventTypeEnum   `db:"event_type" json:"eventType"`
	EventSource      StateEventSourceEnum `db:"event_source" json:"eventSource"`
	CampaignID       uuid.UUID            `db:"campaign_id" json:"campaignId"`
	PreviousState    CampaignStatusEnum   `db:"previous_state" json:"previousState"`
	NewState         CampaignStatusEnum   `db:"new_state" json:"newState"`
	Actor            sql.NullString       `db:"actor" json:"actor,omitempty"`     // Service, user, or system component that triggered the change
	Reason           sql.NullString       `db:"reason" json:"reason,omitempty"`   // Why the transition occurred
	Context          *json.RawMessage     `db:"context" json:"context,omitempty"` // Additional context data
	ValidationPassed bool                 `db:"validation_passed" json:"validationPassed"`
	ErrorMessage     sql.NullString       `db:"error_message" json:"errorMessage,omitempty"`
	Timestamp        time.Time            `db:"timestamp" json:"timestamp"`
	SequenceNumber   int64                `db:"sequence_number" json:"sequenceNumber"` // For ordering events
	CreatedAt        time.Time            `db:"created_at" json:"createdAt"`
}

// StateTransitionEvent represents a state transition with detailed metadata
type StateTransitionEvent struct {
	ID               uuid.UUID            `db:"id" json:"id"`
	StateEventID     uuid.UUID            `db:"state_event_id" json:"stateEventId"` // Foreign key to the state event that created this transition
	CampaignID       uuid.UUID            `db:"campaign_id" json:"campaignId"`
	TransitionID     uuid.UUID            `db:"transition_id" json:"transitionId"` // Unique identifier for this transition
	FromState        CampaignStatusEnum   `db:"from_state" json:"fromState"`
	ToState          CampaignStatusEnum   `db:"to_state" json:"toState"`
	TriggerSource    StateEventSourceEnum `db:"trigger_source" json:"triggerSource"`
	TriggerActor     sql.NullString       `db:"trigger_actor" json:"triggerActor,omitempty"`
	ValidationResult bool                 `db:"validation_result" json:"validationResult"`
	ProcessingTime   int64                `db:"processing_time_ms" json:"processingTimeMs"` // Time taken to process transition in milliseconds
	RetryCount       int                  `db:"retry_count" json:"retryCount"`
	Metadata         *json.RawMessage     `db:"metadata" json:"metadata,omitempty"`
	Timestamp        time.Time            `db:"timestamp" json:"timestamp"`
	CreatedAt        time.Time            `db:"created_at" json:"createdAt"`
}

// StateValidationEvent represents state validation activities
type StateValidationEvent struct {
	ID               uuid.UUID          `db:"id" json:"id"`
	CampaignID       uuid.UUID          `db:"campaign_id" json:"campaignId"`
	ValidationType   string             `db:"validation_type" json:"validationType"` // "consistency", "integrity", "transition"
	CurrentState     CampaignStatusEnum `db:"current_state" json:"currentState"`
	ExpectedState    CampaignStatusEnum `db:"expected_state" json:"expectedState"`
	ValidationPassed bool               `db:"validation_passed" json:"validationPassed"`
	FailureReason    sql.NullString     `db:"failure_reason" json:"failureReason,omitempty"`
	CheckedBy        sql.NullString     `db:"checked_by" json:"checkedBy,omitempty"`
	CheckDetails     *json.RawMessage   `db:"check_details" json:"checkDetails,omitempty"`
	Timestamp        time.Time          `db:"timestamp" json:"timestamp"`
	CreatedAt        time.Time          `db:"created_at" json:"createdAt"`
}

// StateReconciliationEvent represents state reconciliation activities
type StateReconciliationEvent struct {
	ID                   uuid.UUID          `db:"id" json:"id"`
	CampaignID           uuid.UUID          `db:"campaign_id" json:"campaignId"`
	DiscrepancyType      string             `db:"discrepancy_type" json:"discrepancyType"` // "service_mismatch", "orphaned_state", "invalid_sequence"
	DetectedState        CampaignStatusEnum `db:"detected_state" json:"detectedState"`
	AuthorativeState     CampaignStatusEnum `db:"authoritative_state" json:"authoritativeState"`
	ReconciliationAction string             `db:"reconciliation_action" json:"reconciliationAction"` // "force_sync", "rollback", "manual_review"
	AffectedServices     *[]string          `db:"affected_services" json:"affectedServices,omitempty"`
	ReconciliationBy     sql.NullString     `db:"reconciliation_by" json:"reconciliationBy,omitempty"`
	Resolution           sql.NullString     `db:"resolution" json:"resolution,omitempty"`
	Timestamp            time.Time          `db:"timestamp" json:"timestamp"`
	CreatedAt            time.Time          `db:"created_at" json:"createdAt"`
}

// StateEventAggregate represents aggregated state events for reporting and analysis
type StateEventAggregate struct {
	CampaignID           uuid.UUID          `db:"campaign_id" json:"campaignId"`
	TotalTransitions     int64              `db:"total_transitions" json:"totalTransitions"`
	TotalValidations     int64              `db:"total_validations" json:"totalValidations"`
	TotalErrors          int64              `db:"total_errors" json:"totalErrors"`
	TotalReconciliations int64              `db:"total_reconciliations" json:"totalReconciliations"`
	LastTransition       time.Time          `db:"last_transition" json:"lastTransition"`
	LastValidation       time.Time          `db:"last_validation" json:"lastValidation"`
	LastError            time.Time          `db:"last_error" json:"lastError"`
	CurrentState         CampaignStatusEnum `db:"current_state" json:"currentState"`
	CreatedAt            time.Time          `db:"created_at" json:"createdAt"`
	UpdatedAt            time.Time          `db:"updated_at" json:"updatedAt"`
}

// StateEventContext represents the context for state events
type StateEventContext struct {
	ServiceName       string                 `json:"serviceName,omitempty"`
	OperationName     string                 `json:"operationName,omitempty"`
	TransactionID     string                 `json:"transactionId,omitempty"`
	UserID            *uuid.UUID             `json:"userId,omitempty"`
	RequestID         string                 `json:"requestId,omitempty"`
	ProcessingMetrics map[string]interface{} `json:"processingMetrics,omitempty"`
	ErrorDetails      map[string]interface{} `json:"errorDetails,omitempty"`
	BusinessContext   map[string]interface{} `json:"businessContext,omitempty"`
}

// Helper functions for creating state event contexts

// NewStateEventContext creates a new state event context
func NewStateEventContext(serviceName, operationName string) *StateEventContext {
	return &StateEventContext{
		ServiceName:       serviceName,
		OperationName:     operationName,
		ProcessingMetrics: make(map[string]interface{}),
		ErrorDetails:      make(map[string]interface{}),
		BusinessContext:   make(map[string]interface{}),
	}
}

// ToJSON converts StateEventContext to JSON
func (sec *StateEventContext) ToJSON() (*json.RawMessage, error) {
	if sec == nil {
		return nil, nil
	}

	bytes, err := json.Marshal(sec)
	if err != nil {
		return nil, err
	}

	rawMsg := json.RawMessage(bytes)
	return &rawMsg, nil
}

// FromJSON creates StateEventContext from JSON
func StateEventContextFromJSON(data *json.RawMessage) (*StateEventContext, error) {
	if data == nil {
		return nil, nil
	}

	var ctx StateEventContext
	if err := json.Unmarshal(*data, &ctx); err != nil {
		return nil, err
	}

	return &ctx, nil
}

// Helper functions for creating state events

// NewStateChangeEvent creates a new state change event
func NewStateChangeEvent(campaignID uuid.UUID, fromState, toState CampaignStatusEnum, source StateEventSourceEnum, actor, reason string) *StateChangeEvent {
	now := time.Now().UTC()

	return &StateChangeEvent{
		ID:               uuid.New(),
		EventType:        StateEventTypeTransition,
		EventSource:      source,
		CampaignID:       campaignID,
		PreviousState:    fromState,
		NewState:         toState,
		Actor:            sql.NullString{String: actor, Valid: actor != ""},
		Reason:           sql.NullString{String: reason, Valid: reason != ""},
		ValidationPassed: true, // Will be validated by state coordinator
		Timestamp:        now,
		CreatedAt:        now,
	}
}

// NewStateTransitionEvent creates a new state transition event
func NewStateTransitionEvent(stateEventID, campaignID uuid.UUID, fromState, toState CampaignStatusEnum, source StateEventSourceEnum, actor string) *StateTransitionEvent {
	now := time.Now().UTC()

	return &StateTransitionEvent{
		ID:               uuid.New(),
		StateEventID:     stateEventID,
		CampaignID:       campaignID,
		TransitionID:     uuid.New(),
		FromState:        fromState,
		ToState:          toState,
		TriggerSource:    source,
		TriggerActor:     sql.NullString{String: actor, Valid: actor != ""},
		ValidationResult: true,
		RetryCount:       0,
		Timestamp:        now,
		CreatedAt:        now,
	}
}

// NewStateValidationEvent creates a new state validation event
func NewStateValidationEvent(campaignID uuid.UUID, validationType string, currentState, expectedState CampaignStatusEnum, passed bool) *StateValidationEvent {
	now := time.Now().UTC()

	return &StateValidationEvent{
		ID:               uuid.New(),
		CampaignID:       campaignID,
		ValidationType:   validationType,
		CurrentState:     currentState,
		ExpectedState:    expectedState,
		ValidationPassed: passed,
		Timestamp:        now,
		CreatedAt:        now,
	}
}

// StateEventResult represents the result of creating a state event
type StateEventResult struct {
	EventID        uuid.UUID `json:"eventId"`
	SequenceNumber int64     `json:"sequenceNumber"`
	Success        bool      `json:"success"`
	ErrorMessage   string    `json:"errorMessage,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

// StateSnapshotEvent represents a state snapshot for faster replay
type StateSnapshotEvent struct {
	ID                uuid.UUID          `db:"id" json:"id"`
	CampaignID        uuid.UUID          `db:"campaign_id" json:"campaignId"`
	CurrentState      CampaignStatusEnum `db:"current_state" json:"currentState"`
	StateData         *json.RawMessage   `db:"state_data" json:"stateData"`
	LastEventSequence int64              `db:"last_event_sequence" json:"lastEventSequence"`
	SnapshotMetadata  *json.RawMessage   `db:"snapshot_metadata" json:"snapshotMetadata,omitempty"`
	Checksum          string             `db:"checksum" json:"checksum"`
	IsValid           bool               `db:"is_valid" json:"isValid"`
	CreatedAt         time.Time          `db:"created_at" json:"createdAt"`
}

// StateIntegrityResult represents the result of state integrity validation
type StateIntegrityResult struct {
	CampaignID         uuid.UUID             `json:"campaignId"`
	IsValid            bool                  `json:"isValid"`
	TotalEvents        int64                 `json:"totalEvents"`
	LastSequence       int64                 `json:"lastSequence"`
	MissingSequences   []int64               `json:"missingSequences,omitempty"`
	DuplicateSequences []int64               `json:"duplicateSequences,omitempty"`
	ValidationErrors   []string              `json:"validationErrors,omitempty"`
	ValidationChecks   []StateIntegrityCheck `json:"validationChecks"`
	ValidatedAt        time.Time             `json:"validatedAt"`
}

// StateIntegrityCheck represents an individual integrity validation check
type StateIntegrityCheck struct {
	CheckType    string    `json:"checkType"`
	CheckPassed  bool      `json:"checkPassed"`
	ErrorMessage string    `json:"errorMessage,omitempty"`
	CheckedAt    time.Time `json:"checkedAt"`
}

// StateEventSlicePtr returns a pointer to a slice of strings for state events
func StateEventSlicePtr(v []string) *[]string {
	if v == nil {
		return nil
	}
	return &v
}

// NewStateSnapshotEvent creates a new state snapshot event
func NewStateSnapshotEvent(campaignID uuid.UUID, currentState CampaignStatusEnum, stateData *json.RawMessage, lastSequence int64) *StateSnapshotEvent {
	now := time.Now().UTC()

	return &StateSnapshotEvent{
		ID:                uuid.New(),
		CampaignID:        campaignID,
		CurrentState:      currentState,
		StateData:         stateData,
		LastEventSequence: lastSequence,
		IsValid:           true,
		CreatedAt:         now,
	}
}

// NewStateIntegrityResult creates a new state integrity validation result
func NewStateIntegrityResult(campaignID uuid.UUID, isValid bool) *StateIntegrityResult {
	return &StateIntegrityResult{
		CampaignID:       campaignID,
		IsValid:          isValid,
		ValidationChecks: make([]StateIntegrityCheck, 0),
		ValidatedAt:      time.Now().UTC(),
	}
}
