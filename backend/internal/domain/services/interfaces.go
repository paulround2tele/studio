// Package services provides domain service interfaces for campaign phase execution
// These services orchestrate existing engines without replacing them
package services

import (
	"context"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// PhaseService defines the common interface for all phase domain services
// Each service orchestrates existing engines (domainexpert, dnsvalidator, etc.)
type PhaseService interface {
	// Configure sets up the phase with the given configuration
	Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error

	// Execute runs the phase and returns progress updates via channel
	Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error)

	// GetStatus returns current status of the phase
	GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error)

	// Cancel stops execution of the phase
	Cancel(ctx context.Context, campaignID uuid.UUID) error

	// Validate validates the phase configuration
	Validate(ctx context.Context, config interface{}) error

	// GetPhaseType returns the type of phase this service handles
	GetPhaseType() models.PhaseTypeEnum
}

// PhaseProgress represents progress updates during phase execution
type PhaseProgress struct {
	CampaignID     uuid.UUID              `json:"campaign_id"`
	Phase          models.PhaseTypeEnum   `json:"phase"`
	Status         models.PhaseStatusEnum `json:"status"`
	ProgressPct    float64                `json:"progress_pct"`
	ItemsTotal     int64                  `json:"items_total"`
	ItemsProcessed int64                  `json:"items_processed"`
	Message        string                 `json:"message"`
	Error          string                 `json:"error,omitempty"`
	Timestamp      time.Time              `json:"timestamp"`
}

// PhaseStatus represents the current status of a phase
type PhaseStatus struct {
	CampaignID     uuid.UUID              `json:"campaign_id"`
	Phase          models.PhaseTypeEnum   `json:"phase"`
	Status         models.PhaseStatusEnum `json:"status"`
	StartedAt      *time.Time             `json:"started_at,omitempty"`
	CompletedAt    *time.Time             `json:"completed_at,omitempty"`
	ProgressPct    float64                `json:"progress_pct"`
	ItemsTotal     int64                  `json:"items_total"`
	ItemsProcessed int64                  `json:"items_processed"`
	LastError      string                 `json:"last_error,omitempty"`
	Configuration  map[string]interface{} `json:"configuration,omitempty"`
}

// DomainGenerationService handles domain generation phase execution
// Orchestrates domainexpert.DomainGenerator engine
type DomainGenerationService interface {
	PhaseService
	// Domain-specific methods can be added here if needed
}

// DNSValidationService handles DNS validation phase execution
// DNSValidationService handles DNS validation phase execution
// Orchestrates dnsvalidator.DNSValidator engine
type DNSValidationService interface {
	PhaseService
	// DNS-specific methods can be added here if needed
}

// HTTPValidationService handles HTTP validation phase execution
// Orchestrates httpvalidator.HTTPValidator engine
type HTTPValidationService interface {
	PhaseService
	// HTTP-specific methods can be added here if needed
}

// AnalysisService handles analysis phase execution
// Orchestrates contentfetcher.ContentFetcher and keywordextractor engines
type AnalysisService interface {
	PhaseService
	// Analysis-specific methods can be added here if needed
}

// EventBus interface for publishing phase events
type EventBus interface {
	PublishProgress(ctx context.Context, progress PhaseProgress) error
	PublishStatusChange(ctx context.Context, status PhaseStatus) error
}

// Dependencies contains all dependencies needed by domain services
type Dependencies struct {
	EventBus EventBus
	Logger   Logger
	DB       interface{} // Generic database interface - can be store.Querier or specific DB type
}

// Logger interface for structured logging
type Logger interface {
	Debug(ctx context.Context, msg string, fields map[string]interface{})
	Info(ctx context.Context, msg string, fields map[string]interface{})
	Warn(ctx context.Context, msg string, fields map[string]interface{})
	Error(ctx context.Context, msg string, err error, fields map[string]interface{})
}
