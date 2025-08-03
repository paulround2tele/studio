package events

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// EventType represents the type of event
type EventType string

const (
	EventTypeCampaignCreated   EventType = "campaign_created"
	EventTypeCampaignUpdated   EventType = "campaign_updated"
	EventTypeCampaignDeleted   EventType = "campaign_deleted"
	EventTypeCampaignStarted   EventType = "campaign_started"
	EventTypeCampaignPaused    EventType = "campaign_paused"
	EventTypeCampaignResumed   EventType = "campaign_resumed"
	EventTypeCampaignCompleted EventType = "campaign_completed"
	EventTypeCampaignFailed    EventType = "campaign_failed"
	EventTypePhaseStarted      EventType = "phase_started"
	EventTypePhaseCompleted    EventType = "phase_completed"
	EventTypePhaseFailed       EventType = "phase_failed"
)

// CampaignEvent represents a single event in the campaign event store
type CampaignEvent struct {
	ID               uuid.UUID       `db:"id" json:"id"`
	CampaignID       uuid.UUID       `db:"campaign_id" json:"campaignId"`
	EventType        EventType       `db:"event_type" json:"eventType"`
	AggregateVersion int             `db:"aggregate_version" json:"aggregateVersion"`
	SequenceNumber   int64           `db:"sequence_number" json:"sequenceNumber"`
	EventData        json.RawMessage `db:"event_data" json:"eventData"`
	Metadata         json.RawMessage `db:"metadata" json:"metadata"`
	OccurredAt       time.Time       `db:"occurred_at" json:"occurredAt"`
	PersistedAt      time.Time       `db:"persisted_at" json:"persistedAt"`
	ProcessingStatus string          `db:"processing_status" json:"processingStatus"`
	ProcessingError  *string         `db:"processing_error" json:"processingError,omitempty"`
	CorrelationID    *uuid.UUID      `db:"correlation_id" json:"correlationId,omitempty"`
}

// CampaignStateSnapshot represents a point-in-time snapshot of campaign state
type CampaignStateSnapshot struct {
	ID                uuid.UUID       `db:"id" json:"id"`
	CampaignID        uuid.UUID       `db:"campaign_id" json:"campaignId"`
	CurrentState      string          `db:"current_state" json:"currentState"`
	StateData         json.RawMessage `db:"state_data" json:"stateData"`
	LastEventSequence int64           `db:"last_event_sequence" json:"lastEventSequence"`
	SnapshotMetadata  json.RawMessage `db:"snapshot_metadata" json:"snapshotMetadata"`
	CreatedAt         time.Time       `db:"created_at" json:"createdAt"`
	Checksum          string          `db:"checksum" json:"checksum"`
	IsValid           bool            `db:"is_valid" json:"isValid"`
}

// CampaignStateTransition represents a validated state transition
type CampaignStateTransition struct {
	ID                 uuid.UUID       `db:"id" json:"id"`
	StateEventID       uuid.UUID       `db:"state_event_id" json:"stateEventId"`
	CampaignID         uuid.UUID       `db:"campaign_id" json:"campaignId"`
	FromState          string          `db:"from_state" json:"fromState"`
	ToState            string          `db:"to_state" json:"toState"`
	IsValidTransition  bool            `db:"is_valid_transition" json:"isValidTransition"`
	ValidationErrors   json.RawMessage `db:"validation_errors" json:"validationErrors"`
	TransitionMetadata json.RawMessage `db:"transition_metadata" json:"transitionMetadata"`
	OccurredAt         time.Time       `db:"occurred_at" json:"occurredAt"`
}

// EventStore defines the interface for event storage operations
type EventStore interface {
	// Event operations
	AppendEvent(ctx context.Context, event *CampaignEvent) error
	GetEvents(ctx context.Context, campaignID uuid.UUID, fromVersion int) ([]*CampaignEvent, error)
	GetEventsAfterSequence(ctx context.Context, sequenceNumber int64, limit int) ([]*CampaignEvent, error)

	// Snapshot operations
	SaveSnapshot(ctx context.Context, snapshot *CampaignStateSnapshot) error
	GetSnapshot(ctx context.Context, campaignID uuid.UUID) (*CampaignStateSnapshot, error)

	// Transition tracking
	RecordTransition(ctx context.Context, transition *CampaignStateTransition) error
	GetTransitions(ctx context.Context, campaignID uuid.UUID, limit int) ([]*CampaignStateTransition, error)

	// Aggregate operations
	GetAggregateVersion(ctx context.Context, campaignID uuid.UUID) (int, error)
	ReplayEvents(ctx context.Context, campaignID uuid.UUID, toVersion int) (interface{}, error)
}
