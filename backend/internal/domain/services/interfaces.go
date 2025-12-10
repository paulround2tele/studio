// Package services provides domain service interfaces for campaign phase execution
// These services orchestrate existing engines without replacing them
package services

import (
	"context"
	"database/sql"
	"net/http"
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

// PhaseControlCapabilities describes which runtime controls a phase service supports.
type PhaseControlCapabilities struct {
	CanPause   bool `json:"can_pause"`
	CanResume  bool `json:"can_resume"`
	CanStop    bool `json:"can_stop"`
	CanRestart bool `json:"can_restart"`
}

// PhaseController is an optional extension implemented by services that support
// cooperative runtime controls (pause/resume, etc.).
type PhaseController interface {
	Capabilities() PhaseControlCapabilities
	Pause(ctx context.Context, campaignID uuid.UUID) error
	Resume(ctx context.Context, campaignID uuid.UUID) error
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

// EnrichmentService handles enrichment phase execution
// Bridges HTTP results into enrichment feature vectors prior to analysis
type EnrichmentService interface {
	PhaseService
	// Enrichment-specific methods can be added here if needed
}

// AnalysisService handles analysis phase execution
// Orchestrates contentfetcher.ContentFetcher and keywordextractor engines
type AnalysisService interface {
	PhaseService
	// ScoreDomains recomputes domain scores for a campaign (idempotent)
	ScoreDomains(ctx context.Context, campaignID uuid.UUID) error
	// RescoreCampaign recomputes scores (alias; allows differential logic later)
	RescoreCampaign(ctx context.Context, campaignID uuid.UUID) error
}

// EventBus interface for publishing phase events
type EventBus interface {
	PublishProgress(ctx context.Context, progress PhaseProgress) error
	PublishStatusChange(ctx context.Context, status PhaseStatus) error
	PublishSystemEvent(ctx context.Context, name string, payload map[string]interface{}) error
}

// Dependencies contains all dependencies needed by domain services
type Dependencies struct {
	EventBus EventBus
	Logger   Logger
	DB       interface{} // Generic database interface - can be store.Querier or specific DB type

	// Infrastructure Adapters
	AuditLogger        AuditLogger
	MetricsRecorder    MetricsRecorder
	TxManager          TxManager
	WorkerPool         WorkerPool
	ConfigManager      ConfigManager
	Cache              Cache
	SSE                SSE
	StealthIntegration StealthIntegration
}

// Infrastructure Adapter Interfaces

// Job represents a job to be executed by the worker pool
type Job func(ctx context.Context)

// AuditLogger handles auditing operations
type AuditLogger interface {
	LogEvent(event string) error
	GetLogs() ([]string, error)
	ValidateEvent(event string) bool
}

// MetricsRecorder handles metrics recording
type MetricsRecorder interface {
	RecordMetric(name string, value float64) error
	GetMetric(name string) (float64, error)
	ListMetrics() ([]string, error)
}

// TxManager handles database transactions
type TxManager interface {
	BeginTx(ctx context.Context) (*sql.Tx, error)
	Commit(tx *sql.Tx) error
	Rollback(tx *sql.Tx) error
	ExecuteInTx(ctx context.Context, fn func(tx *sql.Tx) error) error
}

// WorkerPool manages a pool of workers for concurrent operations
type WorkerPool interface {
	Start(ctx context.Context)
	AddJob(job Job)
	Stop()
}

// Cache handles caching operations
type Cache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key, value string, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
}

// ConfigManager manages configuration data
type ConfigManager interface {
	Get(key string) (interface{}, error)
	Set(key string, value interface{}) error
}

// SSE handles Server-Sent Events
type SSE interface {
	HandleSSE(w http.ResponseWriter, r *http.Request)
	Send(event string)
}

// StealthIntegration handles stealth operations for validation phases
type StealthIntegration interface {
	RandomizeDomainsForValidation(ctx context.Context, campaignID uuid.UUID, validationType string) ([]string, error)
	ProcessValidationWithStealth(ctx context.Context, campaignID uuid.UUID, domains []string, validationType string) error
}

// Logger interface for structured logging
type Logger interface {
	Debug(ctx context.Context, msg string, fields map[string]interface{})
	Info(ctx context.Context, msg string, fields map[string]interface{})
	Warn(ctx context.Context, msg string, fields map[string]interface{})
	Error(ctx context.Context, msg string, err error, fields map[string]interface{})
}
