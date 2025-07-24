// File: backend/internal/services/interfaces.go
package services

import (
	"context"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store" // Added for store.ListCampaignsFilter
	"github.com/google/uuid"
)

// --- Campaign Update Request DTOs ---
type UpdateCampaignRequest struct {
	Name                       *string                         `json:"name,omitempty"`
	CampaignType               *models.JobTypeEnum             `json:"campaignType,omitempty"`
	Status                     *models.CampaignPhaseStatusEnum `json:"status,omitempty"`
	SourceGenerationCampaignID *uuid.UUID                      `json:"sourceGenerationCampaignId,omitempty"`
	SourceDnsCampaignID        *uuid.UUID                      `json:"sourceDnsCampaignId,omitempty"`
	KeywordSetIDs              *[]uuid.UUID                    `json:"keywordSetIds,omitempty"`
	AdHocKeywords              *[]string                       `json:"adHocKeywords,omitempty"`
	PersonaIDs                 *[]uuid.UUID                    `json:"personaIds,omitempty"`
	ProxyPoolID                *uuid.UUID                      `json:"proxyPoolId,omitempty"`
	ProxySelectionStrategy     *string                         `json:"proxySelectionStrategy,omitempty"`
	RotationIntervalSeconds    *int                            `json:"rotationIntervalSeconds,omitempty"`
	ProcessingSpeedPerMinute   *int                            `json:"processingSpeedPerMinute,omitempty"`
	BatchSize                  *int                            `json:"batchSize,omitempty"`
	RetryAttempts              *int                            `json:"retryAttempts,omitempty"`
	TargetHTTPPorts            *[]int                          `json:"targetHttpPorts,omitempty"`
	NumDomainsToGenerate       *int64                          `json:"numDomainsToGenerate,omitempty"`
	VariableLength             *int                            `json:"variableLength,omitempty"`
	CharacterSet               *string                         `json:"characterSet,omitempty"`
	ConstantString             *string                         `json:"constantString,omitempty"`
	TLD                        *string                         `json:"tld,omitempty"`
}

// --- Unified Campaign Creation Request DTO ---

type CreateCampaignRequest struct {
	Name           string    `json:"name" validate:"required"`
	Description    string    `json:"description,omitempty"`
	UserID         uuid.UUID `json:"userId,omitempty"`
	LaunchSequence bool      `json:"launchSequence,omitempty"` // Whether to automatically progress through phases when each phase completes

	// Full sequence mode support - when enabled, stores all phase configurations at creation
	FullSequenceMode    bool                          `json:"fullSequenceMode,omitempty"`    // UI toggle for showing all phase configurations
	DNSValidationParams *DNSValidationRequest         `json:"dnsValidationParams,omitempty"` // DNS validation configuration for full sequence mode
	HTTPKeywordParams   *HTTPKeywordValidationRequest `json:"httpKeywordParams,omitempty"`   // HTTP validation configuration for full sequence mode

	// Phases-based architecture - all campaigns start in setup phase with domain generation
	DomainGenerationParams *DomainGenerationParams `json:"domainGenerationParams,omitempty"`
}

type DomainGenerationParams struct {
	PatternType          string `json:"patternType" validate:"required,oneof=prefix suffix both"`
	VariableLength       int    `json:"variableLength" validate:"required,gt=0"`
	CharacterSet         string `json:"characterSet" validate:"required"`
	ConstantString       string `json:"constantString" validate:"required"`
	TLD                  string `json:"tld" validate:"required"`
	NumDomainsToGenerate int64  `json:"numDomainsToGenerate,omitempty" validate:"omitempty,gte=0"`
}

type DnsValidationParams struct {
	SourceGenerationCampaignID *uuid.UUID  `json:"sourceGenerationCampaignId,omitempty"` // For phased validation from domain generation
	SourceCampaignID           *uuid.UUID  `json:"sourceCampaignId,omitempty"`           // For standalone validation from past campaigns
	PersonaIDs                 []uuid.UUID `json:"personaIds" validate:"required,min=1,dive,uuid"`
	RotationIntervalSeconds    int         `json:"rotationIntervalSeconds,omitempty" validate:"gte=0"`
	ProcessingSpeedPerMinute   int         `json:"processingSpeedPerMinute,omitempty" validate:"gte=0"`
	BatchSize                  int         `json:"batchSize,omitempty" validate:"gt=0"`
	RetryAttempts              int         `json:"retryAttempts,omitempty" validate:"gte=0"`
}

type HttpKeywordParams struct {
	SourceCampaignID         uuid.UUID   `json:"sourceCampaignId" validate:"required"`
	KeywordSetIDs            []uuid.UUID `json:"keywordSetIds,omitempty" validate:"omitempty,dive,uuid"`
	AdHocKeywords            []string    `json:"adHocKeywords,omitempty" validate:"omitempty,dive,min=1"`
	PersonaIDs               []uuid.UUID `json:"personaIds" validate:"required,min=1,dive,uuid"`
	ProxyPoolID              *uuid.UUID  `json:"proxyPoolId,omitempty"`
	ProxySelectionStrategy   string      `json:"proxySelectionStrategy,omitempty"`
	RotationIntervalSeconds  int         `json:"rotationIntervalSeconds,omitempty" validate:"gte=0"`
	ProcessingSpeedPerMinute int         `json:"processingSpeedPerMinute,omitempty" validate:"gte=0"`
	BatchSize                int         `json:"batchSize,omitempty" validate:"gt=0"`
	RetryAttempts            int         `json:"retryAttempts,omitempty" validate:"gte=0"`
	TargetHTTPPorts          []int       `json:"targetHttpPorts,omitempty" validate:"omitempty,dive,gt=0,lte=65535"`
}

// --- Phase-centric Lead Generation Campaign Request DTOs ---

type CreateLeadGenerationCampaignRequest struct {
	Name        string    `json:"name" validate:"required"`
	Description string    `json:"description,omitempty"`
	UserID      uuid.UUID `json:"userId,omitempty"`
	// Domain generation config for Phase 1 initialization
	DomainConfig DomainGenerationConfig `json:"domainConfig" validate:"required"`
}

// --- Campaign Result Response DTOs ---

type GeneratedDomainsResponse struct {
	Data       []models.GeneratedDomain `json:"data"`
	NextCursor int64                    `json:"nextCursor,omitempty"` // Represents the last offset_index for the next query
	TotalCount int64                    `json:"totalCount"`
}

type DNSValidationResultsResponse struct {
	Data       []models.DNSValidationResult `json:"data"`
	NextCursor string                       `json:"nextCursor,omitempty"` // Represents the last domain_name for the next query
	TotalCount int64                        `json:"totalCount"`
}

type HTTPKeywordResultsResponse struct {
	Data       []models.HTTPKeywordResult `json:"data"`
	NextCursor string                     `json:"nextCursor,omitempty"` // Represents the last domain_name for the next query
	TotalCount int64                      `json:"totalCount"`
}

// DNSValidationRequest represents the request for phased DNS validation
type DNSValidationRequest struct {
	PersonaIDs               []uuid.UUID `json:"personaIds" validate:"omitempty,min=1,dive,uuid"`
	RotationIntervalSeconds  *int        `json:"rotationIntervalSeconds,omitempty" validate:"omitempty,gte=0"`
	ProcessingSpeedPerMinute *int        `json:"processingSpeedPerMinute,omitempty" validate:"omitempty,gte=0"`
	BatchSize                *int        `json:"batchSize,omitempty" validate:"omitempty,gt=0"`
	RetryAttempts            *int        `json:"retryAttempts,omitempty" validate:"omitempty,gte=0"`
}

// HTTPKeywordValidationRequest represents the request for phased HTTP keyword validation
type HTTPKeywordValidationRequest struct {
	PersonaIDs    []uuid.UUID `json:"personaIds" validate:"omitempty,min=1,dive,uuid"`
	Keywords      []string    `json:"keywords,omitempty" validate:"omitempty,min=1,dive,required"`
	AdHocKeywords []string    `json:"adHocKeywords,omitempty" validate:"omitempty,min=1,dive,required"`
}

// BulkDeleteResult represents the result of a bulk delete operation
type BulkDeleteResult struct {
	SuccessfullyDeleted int         `json:"successfully_deleted"`
	FailedDeletions     int         `json:"failed_deletions"`
	DeletedCampaignIDs  []uuid.UUID `json:"deleted_campaign_ids"`
	FailedCampaignIDs   []uuid.UUID `json:"failed_campaign_ids,omitempty"`
	Errors              []string    `json:"errors,omitempty"`
}

// CampaignDependencyInfo provides information about campaign dependencies
type CampaignDependencyInfo struct {
	Campaign           models.Campaign   `json:"campaign"`
	DependentCampaigns []models.Campaign `json:"dependentCampaigns"`
	HasDependencies    bool              `json:"hasDependencies"`
	CanDelete          bool              `json:"canDelete"`
}

// --- Service Interfaces ---

// CampaignOrchestratorService defines the interface for managing the lifecycle of all campaigns.
type CampaignOrchestratorService interface {
	// Unified campaign creation method (preferred)
	CreateCampaignUnified(ctx context.Context, req CreateCampaignRequest) (*models.Campaign, error)

	// Lead generation campaign creation (phase-centric architecture)
	CreateLeadGenerationCampaign(ctx context.Context, req CreateLeadGenerationCampaignRequest) (*models.Campaign, error)

	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, interface{}, error) // Stays as interface{} for flexibility at orchestrator level
	GetCampaignStatus(ctx context.Context, campaignID uuid.UUID) (models.CampaignPhaseStatusEnum, *float64, error)
	ListCampaigns(ctx context.Context, filter store.ListCampaignsFilter) ([]models.Campaign, int64, error)

	// Methods for fetching campaign results
	GetGeneratedDomainsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor int64) (*GeneratedDomainsResponse, error)
	GetDNSValidationResultsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor string, filter store.ListValidationResultsFilter) (*DNSValidationResultsResponse, error)
	GetHTTPKeywordResultsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor string, filter store.ListValidationResultsFilter) (*HTTPKeywordResultsResponse, error)

	StartCampaign(ctx context.Context, campaignID uuid.UUID) error
	PauseCampaign(ctx context.Context, campaignID uuid.UUID) error
	ResumeCampaign(ctx context.Context, campaignID uuid.UUID) error
	CancelCampaign(ctx context.Context, campaignID uuid.UUID) error
	UpdateCampaign(ctx context.Context, campaignID uuid.UUID, req UpdateCampaignRequest) (*models.Campaign, error)
	DeleteCampaign(ctx context.Context, campaignID uuid.UUID) error
	BulkDeleteCampaigns(ctx context.Context, campaignIDs []uuid.UUID) (*BulkDeleteResult, error)
	SetCampaignErrorStatus(ctx context.Context, campaignID uuid.UUID, errorMessage string) error
	SetCampaignStatus(ctx context.Context, campaignID uuid.UUID, status models.CampaignPhaseStatusEnum) error
	HandleCampaignCompletion(ctx context.Context, campaignID uuid.UUID) error
	GetCampaignDependencies(ctx context.Context, campaignID uuid.UUID) (*CampaignDependencyInfo, error)

	// Clean phase transition methods for single-campaign architecture
	ConfigureDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.DNSPhaseConfigRequest) (*models.Campaign, error)
	ConfigureHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.HTTPPhaseConfigRequest) (*models.Campaign, error)

	// Phase restart methods (except domain generation)
	RestartDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req *DNSValidationRequest) (*models.Campaign, error)
	RestartHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req *HTTPKeywordValidationRequest) (*models.Campaign, error)
}

// LeadGenerationCampaignService defines the interface for campaign lifecycle management and phase coordination.
// This service orchestrates standalone phase services but does NOT implement phase business logic.
type LeadGenerationCampaignService interface {
	// Campaign lifecycle
	CreateCampaign(ctx context.Context, req CreateLeadGenerationCampaignRequest) (*models.LeadGenerationCampaign, error)
	GetCampaign(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, error)
	UpdateCampaignStatus(ctx context.Context, campaignID uuid.UUID, status string) error

	// Phase orchestration (NOT implementation)
	InitializePhase1(ctx context.Context, campaignID uuid.UUID) error
	ConfigurePhase(ctx context.Context, campaignID uuid.UUID, phaseType string, config interface{}) error
	StartPhase(ctx context.Context, campaignID uuid.UUID, phaseType string) error
	TransitionToNextPhase(ctx context.Context, campaignID uuid.UUID) error

	// Campaign management
	GetCampaignProgress(ctx context.Context, campaignID uuid.UUID) (*LeadGenerationProgress, error)
	ListCampaigns(ctx context.Context, userID uuid.UUID) ([]*models.LeadGenerationCampaign, error)
	DeleteCampaign(ctx context.Context, campaignID uuid.UUID) error
}

type LeadGenerationProgress struct {
	CampaignID      uuid.UUID                `json:"campaign_id"`
	CurrentPhase    string                   `json:"current_phase"`
	PhaseProgress   map[string]PhaseProgress `json:"phase_progress"`
	OverallProgress float64                  `json:"overall_progress"`
}

type PhaseProgress struct {
	Status          string     `json:"status"`
	ProgressPercent float64    `json:"progress_percent"`
	ProcessedItems  int64      `json:"processed_items"`
	TotalItems      int64      `json:"total_items"`
	SuccessfulItems int64      `json:"successful_items"`
	FailedItems     int64      `json:"failed_items"`
	StartedAt       *time.Time `json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at"`
	EstimatedEnd    *time.Time `json:"estimated_end"`
}

// DNSCampaignService defines the interface for DNS validation campaign logic.
type DNSCampaignService interface {
	// GetCampaignDetails retrieves the base campaign and its specific DNS validation parameters.
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.DNSValidationCampaignParams, error)
	ProcessDNSValidationCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedCount int, err error)

	// Phase transition methods for single-campaign architecture
	ConfigureDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.DNSPhaseConfigRequest) error
	TransitionToHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID) error
}

// HTTPKeywordCampaignService defines the interface for HTTP & Keyword validation campaign logic.
type HTTPKeywordCampaignService interface {
	// GetCampaignDetails retrieves the base campaign and its specific HTTP & Keyword validation parameters.
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.HTTPKeywordCampaignParams, error)
	ProcessHTTPKeywordCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedCount int, err error)

	// Phase transition methods for single-campaign architecture
	ConfigureHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.HTTPPhaseConfigRequest) error
	TransitionToAnalysisPhase(ctx context.Context, campaignID uuid.UUID) error
}

// CampaignWorkerService manages the pool of background workers that process campaign jobs.
type CampaignWorkerService interface {
	StartWorkers(ctx context.Context, numWorkers int)
}

// DomainGenerationService defines the interface for standalone domain generation
type DomainGenerationService interface {
	// Existing legacy methods (for backward compatibility during refactor)
	CreateCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.Campaign, error)
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.DomainGenerationCampaignParams, error)
	ProcessGenerationCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedInThisBatch int, err error)

	// New standalone service methods
	GenerateDomains(ctx context.Context, req GenerateDomainsRequest) error
	GetGenerationProgress(ctx context.Context, campaignID uuid.UUID) (*DomainGenerationProgress, error)
	PauseGeneration(ctx context.Context, campaignID uuid.UUID) error
	ResumeGeneration(ctx context.Context, campaignID uuid.UUID) error
	CancelGeneration(ctx context.Context, campaignID uuid.UUID) error
	ValidateGenerationConfig(ctx context.Context, config DomainGenerationConfig) error
	GetGenerationStats(ctx context.Context, campaignID uuid.UUID) (*DomainGenerationStats, error)
}

// CreateDomainGenerationCampaignRequest represents a request to create a domain generation campaign
type CreateDomainGenerationCampaignRequest struct {
	Name                 string                        `json:"name" validate:"required"`
	Description          string                        `json:"description,omitempty"`
	UserID               uuid.UUID                     `json:"userId,omitempty"`
	PatternType          string                        `json:"patternType" validate:"required,oneof=prefix suffix both"`
	VariableLength       int                           `json:"variableLength" validate:"required,gt=0"`
	CharacterSet         string                        `json:"characterSet" validate:"required"`
	ConstantString       string                        `json:"constantString" validate:"required"`
	TLD                  string                        `json:"tld" validate:"required"`
	NumDomainsToGenerate int64                         `json:"numDomainsToGenerate,omitempty" validate:"omitempty,gte=0"`
	LaunchSequence       *bool                         `json:"launchSequence,omitempty"`
	DNSValidationParams  *DNSValidationRequest         `json:"dnsValidationParams,omitempty"`
	HTTPKeywordParams    *HTTPKeywordValidationRequest `json:"httpKeywordParams,omitempty"`
}

// GenerateDomainsRequest represents a request to generate domains for standalone service
type GenerateDomainsRequest struct {
	CampaignID uuid.UUID              `json:"campaign_id"`
	Config     DomainGenerationConfig `json:"config"`
}

// DomainGenerationConfig contains all domain generation parameters for standalone service
type DomainGenerationConfig struct {
	PatternType          string `json:"patternType" validate:"required,oneof=prefix suffix both"`
	VariableLength       int    `json:"variableLength" validate:"required,gt=0"`
	CharacterSet         string `json:"characterSet" validate:"required"`
	ConstantString       string `json:"constantString" validate:"required"`
	TLD                  string `json:"tld" validate:"required"`
	NumDomainsToGenerate int64  `json:"numDomainsToGenerate,omitempty" validate:"omitempty,gte=0"`
	BatchSize            int    `json:"batchSize,omitempty" validate:"omitempty,gt=0"`
}

// DomainGenerationProgress represents the current progress of domain generation
type DomainGenerationProgress struct {
	CampaignID       uuid.UUID `json:"campaign_id"`
	Status           string    `json:"status"`
	DomainsGenerated int       `json:"domains_generated"`
	TotalDomains     int       `json:"total_domains"`
	Progress         float64   `json:"progress"`
	StartedAt        time.Time `json:"started_at"`
	EstimatedEnd     time.Time `json:"estimated_end"`
}

// DomainGenerationStats provides statistics about domain generation
type DomainGenerationStats struct {
	CampaignID        uuid.UUID `json:"campaign_id"`
	TotalCombinations int64     `json:"total_combinations"`
	CurrentOffset     int64     `json:"current_offset"`
	DomainsGenerated  int       `json:"domains_generated"`
	GenerationRate    float64   `json:"generation_rate"`
	MemoryUsage       int64     `json:"memory_usage"`
	ConfigHash        string    `json:"config_hash"`
	EstimatedTimeLeft int64     `json:"estimated_time_left"`
}

// ConfigManagerInterface defines the interface for configuration management
type ConfigManagerInterface interface {
	GetDomainGenerationConfig(ctx context.Context, configHash string) (*models.DomainGenerationConfigState, error)
	UpdateDomainGenerationConfig(ctx context.Context, configHash string, updateFn func(currentState *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error)) (*models.DomainGenerationConfigState, error)
}
