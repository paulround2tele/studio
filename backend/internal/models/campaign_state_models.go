package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// CampaignStateEnum represents the high-level campaign state
type CampaignStateEnum string

const (
	CampaignStateDraft     CampaignStateEnum = "draft"
	CampaignStateRunning   CampaignStateEnum = "running"
	CampaignStatePaused    CampaignStateEnum = "paused"
	CampaignStateCompleted CampaignStateEnum = "completed"
	CampaignStateFailed    CampaignStateEnum = "failed"
	CampaignStateCancelled CampaignStateEnum = "cancelled"
	CampaignStateArchived  CampaignStateEnum = "archived"
)

// CampaignModeEnum represents the campaign execution mode
type CampaignModeEnum string

const (
	CampaignModeFullSequence CampaignModeEnum = "full_sequence"
	CampaignModeStepByStep   CampaignModeEnum = "step_by_step"
)

// ExecutionStatusEnum represents the phase execution status
type ExecutionStatusEnum string

const (
	ExecutionStatusNotStarted ExecutionStatusEnum = "not_started"
	ExecutionStatusReady      ExecutionStatusEnum = "ready"
	ExecutionStatusConfigured ExecutionStatusEnum = "configured"
	ExecutionStatusInProgress ExecutionStatusEnum = "in_progress"
	ExecutionStatusPaused     ExecutionStatusEnum = "paused"
	ExecutionStatusCompleted  ExecutionStatusEnum = "completed"
	ExecutionStatusFailed     ExecutionStatusEnum = "failed"
)

// CampaignState represents the new centralized campaign state management
type CampaignState struct {
	CampaignID    uuid.UUID         `db:"campaign_id" json:"campaignId"`
	CurrentState  CampaignStateEnum `db:"current_state" json:"currentState"`
	Mode          CampaignModeEnum  `db:"mode" json:"mode"`
	Configuration json.RawMessage   `db:"configuration" json:"configuration"`
	Version       int               `db:"version" json:"version"`
	CreatedAt     time.Time         `db:"created_at" json:"createdAt"`
	UpdatedAt     time.Time         `db:"updated_at" json:"updatedAt"`
}

// PhaseExecution represents the new phase execution tracking
type PhaseExecution struct {
	ID         uuid.UUID           `db:"id" json:"id"`
	CampaignID uuid.UUID           `db:"campaign_id" json:"campaignId"`
	PhaseType  PhaseTypeEnum       `db:"phase_type" json:"phaseType"`
	Status     ExecutionStatusEnum `db:"status" json:"status"`

	// Execution timing
	StartedAt   *time.Time `db:"started_at" json:"startedAt,omitempty"`
	CompletedAt *time.Time `db:"completed_at" json:"completedAt,omitempty"`
	PausedAt    *time.Time `db:"paused_at" json:"pausedAt,omitempty"`
	FailedAt    *time.Time `db:"failed_at" json:"failedAt,omitempty"`

	// Progress tracking
	ProgressPercentage *float64 `db:"progress_percentage" json:"progressPercentage,omitempty"`
	TotalItems         *int64   `db:"total_items" json:"totalItems,omitempty"`
	ProcessedItems     *int64   `db:"processed_items" json:"processedItems,omitempty"`
	SuccessfulItems    *int64   `db:"successful_items" json:"successfulItems,omitempty"`
	FailedItems        *int64   `db:"failed_items" json:"failedItems,omitempty"`

	// Data storage
	Configuration *json.RawMessage `db:"configuration" json:"configuration,omitempty"`
	ErrorDetails  *json.RawMessage `db:"error_details" json:"errorDetails,omitempty"`
	Metrics       *json.RawMessage `db:"metrics" json:"metrics,omitempty"`

	// Metadata
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

// CampaignStateWithExecution combines campaign state with its phase executions
type CampaignStateWithExecution struct {
	CampaignState
	PhaseExecutions []PhaseExecution `json:"phaseExecutions"`
}
