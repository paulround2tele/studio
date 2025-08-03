package events

import (
	"encoding/json"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// CampaignCreatedData represents data for campaign creation events
type CampaignCreatedData struct {
	CampaignID    uuid.UUID                `json:"campaignId"`
	Name          string                   `json:"name"`
	UserID        uuid.UUID                `json:"userId"`
	CampaignType  string                   `json:"campaignType"`
	Mode          models.CampaignModeEnum  `json:"mode"`
	State         models.CampaignStateEnum `json:"state"`
	Configuration json.RawMessage          `json:"configuration"`
	CreatedAt     time.Time                `json:"createdAt"`
}

// CampaignUpdatedData represents data for campaign update events
type CampaignUpdatedData struct {
	CampaignID       uuid.UUID       `json:"campaignId"`
	UpdatedFields    []string        `json:"updatedFields"`
	OldConfiguration json.RawMessage `json:"oldConfiguration,omitempty"`
	NewConfiguration json.RawMessage `json:"newConfiguration,omitempty"`
	UpdatedBy        string          `json:"updatedBy"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// CampaignStateChangedData represents data for state change events
type CampaignStateChangedData struct {
	CampaignID uuid.UUID                `json:"campaignId"`
	FromState  models.CampaignStateEnum `json:"fromState"`
	ToState    models.CampaignStateEnum `json:"toState"`
	Reason     string                   `json:"reason"`
	ChangedAt  time.Time                `json:"changedAt"`
	ChangedBy  string                   `json:"changedBy"`
}

// PhaseStartedData represents data for phase start events
type PhaseStartedData struct {
	CampaignID    uuid.UUID            `json:"campaignId"`
	PhaseType     models.PhaseTypeEnum `json:"phaseType"`
	ExecutionID   uuid.UUID            `json:"executionId"`
	StartedAt     time.Time            `json:"startedAt"`
	StartedBy     string               `json:"startedBy"`
	Configuration json.RawMessage      `json:"configuration"`
}

// PhaseCompletedData represents data for phase completion events
type PhaseCompletedData struct {
	CampaignID     uuid.UUID            `json:"campaignId"`
	PhaseType      models.PhaseTypeEnum `json:"phaseType"`
	ExecutionID    uuid.UUID            `json:"executionId"`
	CompletedAt    time.Time            `json:"completedAt"`
	Duration       time.Duration        `json:"duration"`
	ItemsProcessed int64                `json:"itemsProcessed"`
	ItemsSucceeded int64                `json:"itemsSucceeded"`
	ItemsFailed    int64                `json:"itemsFailed"`
	Results        json.RawMessage      `json:"results"`
}

// PhaseFailedData represents data for phase failure events
type PhaseFailedData struct {
	CampaignID   uuid.UUID            `json:"campaignId"`
	PhaseType    models.PhaseTypeEnum `json:"phaseType"`
	ExecutionID  uuid.UUID            `json:"executionId"`
	FailedAt     time.Time            `json:"failedAt"`
	ErrorType    string               `json:"errorType"`
	ErrorMessage string               `json:"errorMessage"`
	ErrorDetails json.RawMessage      `json:"errorDetails"`
	Context      json.RawMessage      `json:"context"`
}

// EventBuilder provides convenience methods for creating campaign events
type EventBuilder struct {
	campaignID    uuid.UUID
	correlationID *uuid.UUID
	version       int
}

// NewEventBuilder creates a new event builder for a campaign
func NewEventBuilder(campaignID uuid.UUID, version int) *EventBuilder {
	return &EventBuilder{
		campaignID: campaignID,
		version:    version,
	}
}

// WithCorrelation sets the correlation ID for the events
func (eb *EventBuilder) WithCorrelation(correlationID uuid.UUID) *EventBuilder {
	eb.correlationID = &correlationID
	return eb
}

// CampaignCreated creates a campaign creation event
func (eb *EventBuilder) CampaignCreated(data CampaignCreatedData) (*CampaignEvent, error) {
	eventData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &CampaignEvent{
		ID:               uuid.New(),
		CampaignID:       eb.campaignID,
		EventType:        EventTypeCampaignCreated,
		AggregateVersion: eb.version,
		EventData:        eventData,
		OccurredAt:       time.Now(),
		ProcessingStatus: "pending",
		CorrelationID:    eb.correlationID,
	}, nil
}

// CampaignUpdated creates a campaign update event
func (eb *EventBuilder) CampaignUpdated(data CampaignUpdatedData) (*CampaignEvent, error) {
	eventData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &CampaignEvent{
		ID:               uuid.New(),
		CampaignID:       eb.campaignID,
		EventType:        EventTypeCampaignUpdated,
		AggregateVersion: eb.version,
		EventData:        eventData,
		OccurredAt:       time.Now(),
		ProcessingStatus: "pending",
		CorrelationID:    eb.correlationID,
	}, nil
}

// CampaignDeleted creates a campaign deletion event
func (eb *EventBuilder) CampaignDeleted(reason string) (*CampaignEvent, error) {
	data := map[string]interface{}{
		"campaignId": eb.campaignID,
		"reason":     reason,
		"deletedAt":  time.Now(),
	}

	eventData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &CampaignEvent{
		ID:               uuid.New(),
		CampaignID:       eb.campaignID,
		EventType:        EventTypeCampaignDeleted,
		AggregateVersion: eb.version,
		EventData:        eventData,
		OccurredAt:       time.Now(),
		ProcessingStatus: "pending",
		CorrelationID:    eb.correlationID,
	}, nil
}

// CampaignStarted creates a campaign start event
func (eb *EventBuilder) CampaignStarted(startedBy string) (*CampaignEvent, error) {
	data := CampaignStateChangedData{
		CampaignID: eb.campaignID,
		FromState:  models.CampaignStateDraft,
		ToState:    models.CampaignStateRunning,
		Reason:     "Campaign started",
		ChangedAt:  time.Now(),
		ChangedBy:  startedBy,
	}

	eventData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &CampaignEvent{
		ID:               uuid.New(),
		CampaignID:       eb.campaignID,
		EventType:        EventTypeCampaignStarted,
		AggregateVersion: eb.version,
		EventData:        eventData,
		OccurredAt:       time.Now(),
		ProcessingStatus: "pending",
		CorrelationID:    eb.correlationID,
	}, nil
}

// PhaseStarted creates a phase start event
func (eb *EventBuilder) PhaseStarted(data PhaseStartedData) (*CampaignEvent, error) {
	eventData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &CampaignEvent{
		ID:               uuid.New(),
		CampaignID:       eb.campaignID,
		EventType:        EventTypePhaseStarted,
		AggregateVersion: eb.version,
		EventData:        eventData,
		OccurredAt:       time.Now(),
		ProcessingStatus: "pending",
		CorrelationID:    eb.correlationID,
	}, nil
}

// PhaseCompleted creates a phase completion event
func (eb *EventBuilder) PhaseCompleted(data PhaseCompletedData) (*CampaignEvent, error) {
	eventData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &CampaignEvent{
		ID:               uuid.New(),
		CampaignID:       eb.campaignID,
		EventType:        EventTypePhaseCompleted,
		AggregateVersion: eb.version,
		EventData:        eventData,
		OccurredAt:       time.Now(),
		ProcessingStatus: "pending",
		CorrelationID:    eb.correlationID,
	}, nil
}

// PhaseFailed creates a phase failure event
func (eb *EventBuilder) PhaseFailed(data PhaseFailedData) (*CampaignEvent, error) {
	eventData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &CampaignEvent{
		ID:               uuid.New(),
		CampaignID:       eb.campaignID,
		EventType:        EventTypePhaseFailed,
		AggregateVersion: eb.version,
		EventData:        eventData,
		OccurredAt:       time.Now(),
		ProcessingStatus: "pending",
		CorrelationID:    eb.correlationID,
	}, nil
}
