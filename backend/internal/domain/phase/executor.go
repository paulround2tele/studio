// Package phase provides domain logic for campaign phase execution
package phase

import (
	"context"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// ExecutionStatus represents the current status of a phase execution
type ExecutionStatus string

const (
	StatusNotStarted ExecutionStatus = "not_started"
	StatusInProgress ExecutionStatus = "in_progress"
	StatusCompleted  ExecutionStatus = "completed"
	StatusFailed     ExecutionStatus = "failed"
	StatusPaused     ExecutionStatus = "paused"
	StatusCancelled  ExecutionStatus = "cancelled"
)

// ExecutionContext provides all necessary context for phase execution
type ExecutionContext struct {
	CampaignID    uuid.UUID              `json:"campaign_id"`
	PhaseType     models.PhaseTypeEnum   `json:"phase_type"`
	Configuration map[string]interface{} `json:"configuration"`
	Resources     map[string]interface{} `json:"resources,omitempty"`
	UserID        string                 `json:"user_id,omitempty"`
	RequestID     string                 `json:"request_id,omitempty"`
	Timestamp     time.Time              `json:"timestamp"`
}

// ExecutionResult contains the outcome of phase execution
type ExecutionResult struct {
	Status       ExecutionStatus        `json:"status"`
	Progress     float64                `json:"progress"`
	Metrics      map[string]interface{} `json:"metrics"`
	Outputs      map[string]interface{} `json:"outputs,omitempty"`
	ErrorDetails *ErrorDetails          `json:"error_details,omitempty"`
	Duration     time.Duration          `json:"duration"`
	CompletedAt  *time.Time             `json:"completed_at,omitempty"`
}

// ErrorDetails provides structured error information
type ErrorDetails struct {
	Code        string                 `json:"code"`
	Message     string                 `json:"message"`
	Details     map[string]interface{} `json:"details,omitempty"`
	Recoverable bool                   `json:"recoverable"`
	RetryAfter  *time.Duration         `json:"retry_after,omitempty"`
}

// ProgressUpdate represents a real-time progress update during execution
type ProgressUpdate struct {
	CampaignID uuid.UUID              `json:"campaign_id"`
	PhaseType  string                 `json:"phase_type"`
	Progress   float64                `json:"progress"`
	Message    string                 `json:"message,omitempty"`
	Timestamp  time.Time              `json:"timestamp"`
	Details    map[string]interface{} `json:"details,omitempty"`
}

// ValidationResult represents the result of configuration validation
type ValidationResult struct {
	Valid    bool                `json:"valid"`
	Errors   []ValidationError   `json:"errors,omitempty"`
	Warnings []ValidationWarning `json:"warnings,omitempty"`
}

// ValidationError represents a configuration validation error
type ValidationError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ValidationWarning represents a configuration validation warning
type ValidationWarning struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// PhaseExecutor defines the interface for executing campaign phases
type PhaseExecutor interface {
	// GetPhaseType returns the phase type this executor handles
	GetPhaseType() models.PhaseTypeEnum

	// ValidateConfiguration validates the phase configuration before execution
	ValidateConfiguration(ctx context.Context, config map[string]interface{}) ValidationResult

	// PrepareExecution prepares resources and validates preconditions
	PrepareExecution(ctx context.Context, execCtx ExecutionContext) error

	// Execute runs the actual phase logic
	Execute(ctx context.Context, execCtx ExecutionContext, progressChan chan<- ProgressUpdate) (*ExecutionResult, error)

	// Pause temporarily stops the phase execution (if supported)
	Pause(ctx context.Context, campaignID uuid.UUID) error

	// Resume continues a paused phase execution (if supported)
	Resume(ctx context.Context, campaignID uuid.UUID) error

	// Cancel permanently stops and cleans up the phase execution
	Cancel(ctx context.Context, campaignID uuid.UUID) error

	// GetStatus returns the current status of the phase execution
	GetStatus(ctx context.Context, campaignID uuid.UUID) (*ExecutionResult, error)

	// Cleanup performs any necessary cleanup after execution completion or failure
	Cleanup(ctx context.Context, campaignID uuid.UUID) error

	// EstimateResourceRequirements estimates resource needs for the phase
	EstimateResourceRequirements(ctx context.Context, config map[string]interface{}) (map[string]interface{}, error)

	// SupportsFeature checks if the executor supports a specific feature
	SupportsFeature(feature string) bool
}

// PhaseExecutorRegistry manages all available phase executors
type PhaseExecutorRegistry interface {
	// RegisterExecutor registers a new phase executor
	RegisterExecutor(executor PhaseExecutor) error

	// GetExecutor retrieves an executor for a specific phase type
	GetExecutor(phaseType models.PhaseTypeEnum) (PhaseExecutor, error)

	// ListExecutors returns all registered executors
	ListExecutors() []PhaseExecutor

	// ValidateAllConfigurations validates configurations for all phases
	ValidateAllConfigurations(ctx context.Context, configurations map[models.PhaseTypeEnum]map[string]interface{}) map[models.PhaseTypeEnum]ValidationResult
}

// ExecutorFeatures defines common feature flags that executors might support
const (
	FeaturePauseResume        = "pause_resume"
	FeatureCancellation       = "cancellation"
	FeatureProgressTracking   = "progress_tracking"
	FeatureResourceEstimation = "resource_estimation"
	FeatureBatchProcessing    = "batch_processing"
	FeatureRollback           = "rollback"
	FeatureRetry              = "retry"
	FeatureParallelExecution  = "parallel_execution"
)
