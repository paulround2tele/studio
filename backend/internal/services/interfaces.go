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
	Name                     *string                 `json:"name,omitempty"`
	CampaignType             *models.JobTypeEnum     `json:"campaignType,omitempty"`
	Status                   *models.PhaseStatusEnum `json:"status,omitempty"`
	KeywordSetIDs            *[]uuid.UUID            `json:"keywordSetIds,omitempty"`
	AdHocKeywords            *[]string               `json:"adHocKeywords,omitempty"`
	PersonaIDs               *[]uuid.UUID            `json:"personaIds,omitempty"`
	ProxyPoolID              *uuid.UUID              `json:"proxyPoolId,omitempty"`
	ProxySelectionStrategy   *string                 `json:"proxySelectionStrategy,omitempty"`
	RotationIntervalSeconds  *int                    `json:"rotationIntervalSeconds,omitempty"`
	ProcessingSpeedPerMinute *int                    `json:"processingSpeedPerMinute,omitempty"`
	BatchSize                *int                    `json:"batchSize,omitempty"`
	RetryAttempts            *int                    `json:"retryAttempts,omitempty"`
	TargetHTTPPorts          *[]int                  `json:"targetHttpPorts,omitempty"`
	NumDomainsToGenerate     *int64                  `json:"numDomainsToGenerate,omitempty"`
	VariableLength           *int                    `json:"variableLength,omitempty"`
	CharacterSet             *string                 `json:"characterSet,omitempty"`
	ConstantString           *string                 `json:"constantString,omitempty"`
	TLD                      *string                 `json:"tld,omitempty"`
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
	SourceCampaignID         *uuid.UUID  `json:"sourceCampaignId,omitempty"` // For standalone validation from past campaigns
	PersonaIDs               []uuid.UUID `json:"personaIds" validate:"required,min=1,dive,uuid"`
	RotationIntervalSeconds  int         `json:"rotationIntervalSeconds,omitempty" validate:"gte=0"`
	ProcessingSpeedPerMinute int         `json:"processingSpeedPerMinute,omitempty" validate:"gte=0"`
	BatchSize                int         `json:"batchSize,omitempty" validate:"gt=0"`
	RetryAttempts            int         `json:"retryAttempts,omitempty" validate:"gte=0"`
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
	DomainConfig DomainGenerationPhaseConfig `json:"domainConfig" validate:"required"`
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
	Campaign           models.LeadGenerationCampaign   `json:"campaign"`
	DependentCampaigns []models.LeadGenerationCampaign `json:"dependentCampaigns"`
	HasDependencies    bool                            `json:"hasDependencies"`
	CanDelete          bool                            `json:"canDelete"`
}

// --- Service Interfaces ---

// CampaignOrchestratorService - ELIMINATED: Replaced by PhaseExecutionService for unified architecture

// DomainGenerationService defines interface for domain generation operations
type DomainGenerationService interface {
	ProcessGenerationCampaignBatch(ctx context.Context, campaignID uuid.UUID, batchSize int) (batchDone bool, processedCount int, err error)
}

// CreateDomainGenerationCampaignRequest defines request for creating domain generation campaigns
type CreateDomainGenerationCampaignRequest struct {
	Name                 string                     `json:"name" validate:"required,min=1,max=100"`
	PatternType          string                     `json:"patternType" validate:"required,oneof=prefix suffix both"`
	Keywords             []string                   `json:"keywords" validate:"required,min=1,dive,min=1,max=50"`
	TLDs                 []string                   `json:"tlds" validate:"required,min=1,dive,min=2,max=10"`
	MaxResults           int                        `json:"maxResults" validate:"required,min=1,max=100000"`
	EnableDNSValidation  bool                       `json:"enableDnsValidation"`
	EnableHTTPValidation bool                       `json:"enableHttpValidation"`
	DNSValidationConfig  *DNSValidationPhaseConfig  `json:"dnsValidationConfig,omitempty"`
	HTTPValidationConfig *HTTPValidationPhaseConfig `json:"httpValidationConfig,omitempty"`

	// Domain generation fields
	VariableLength       int                  `json:"variableLength" validate:"required,min=1,max=50"`
	CharacterSet         string               `json:"characterSet" validate:"required,min=1"`
	ConstantString       string               `json:"constantString,omitempty"`
	TLD                  string               `json:"tld" validate:"required,min=3,max=10"`
	NumDomainsToGenerate int                  `json:"numDomainsToGenerate" validate:"required,min=1"`
	UserID               uuid.UUID            `json:"userId,omitempty"`
	LaunchSequence       *bool                `json:"launchSequence,omitempty"`
	DNSValidationParams  *DNSValidationParams `json:"dnsValidationParams,omitempty"`
	HTTPKeywordParams    *HTTPKeywordParams   `json:"httpKeywordParams,omitempty"`
}

// DNSValidationParams defines DNS validation parameters
type DNSValidationParams struct {
	PersonaIDs               []uuid.UUID `json:"personaIds" validate:"required,min=1"`
	RotationIntervalSeconds  *int        `json:"rotationIntervalSeconds,omitempty"`
	ProcessingSpeedPerMinute *int        `json:"processingSpeedPerMinute,omitempty"`
	BatchSize                *int        `json:"batchSize,omitempty"`
	RetryAttempts            *int        `json:"retryAttempts,omitempty"`
}

// HTTPKeywordParams defines HTTP keyword validation parameters
type HTTPKeywordParams struct {
	PersonaIDs    []uuid.UUID `json:"personaIds" validate:"required,min=1"`
	Keywords      []string    `json:"keywords,omitempty"`
	AdHocKeywords []string    `json:"adHocKeywords,omitempty"`
}

// HTTPValidationPhaseConfig defines HTTP validation phase configuration
type HTTPValidationPhaseConfig struct {
	PersonaIDs               []uuid.UUID `json:"personaIds" validate:"required,min=1"`
	Keywords                 []string    `json:"keywords,omitempty"`
	AdHocKeywords            []string    `json:"adHocKeywords,omitempty"`
	RotationIntervalSeconds  *int        `json:"rotationIntervalSeconds,omitempty"`
	ProcessingSpeedPerMinute *int        `json:"processingSpeedPerMinute,omitempty"`
	BatchSize                *int        `json:"batchSize,omitempty"`
	RetryAttempts            *int        `json:"retryAttempts,omitempty"`
}

// GenerateDomainsRequest defines request for domain generation
type GenerateDomainsRequest struct {
	CampaignID      uuid.UUID               `json:"campaignId" validate:"required"`
	BatchSize       int                     `json:"batchSize" validate:"required,min=1,max=10000"`
	StartFromOffset int64                   `json:"startFromOffset"`
	Config          *DomainGenerationConfig `json:"config" validate:"required"`
}

// DomainGenerationProgress tracks domain generation progress
type DomainGenerationProgress struct {
	CampaignID         uuid.UUID `json:"campaignId"`
	Status             string    `json:"status"`
	DomainsGenerated   int       `json:"domainsGenerated"`
	TotalDomains       int       `json:"totalDomains"`
	Progress           float64   `json:"progress"`
	StartedAt          time.Time `json:"startedAt"`
	EstimatedEnd       time.Time `json:"estimatedEnd"`
	ProcessedCount     int       `json:"processedCount"`
	SuccessfulCount    int       `json:"successfulCount"`
	FailedCount        int       `json:"failedCount"`
	ProgressPercentage float64   `json:"progressPercentage"`
}

// DomainGenerationConfig defines domain generation configuration
type DomainGenerationConfig struct {
	PatternType          string   `json:"patternType" validate:"required,oneof=prefix suffix both"`
	Keywords             []string `json:"keywords" validate:"required,min=1"`
	TLDs                 []string `json:"tlds" validate:"required,min=1"`
	MaxResults           int      `json:"maxResults" validate:"required,min=1"`
	VariableLength       int      `json:"variableLength" validate:"required,min=1"`
	CharacterSet         string   `json:"characterSet" validate:"required,min=1"`
	ConstantString       string   `json:"constantString,omitempty"`
	TLD                  string   `json:"tld" validate:"required,min=3"`
	NumDomainsToGenerate int      `json:"numDomainsToGenerate" validate:"required,min=1"`
	BatchSize            int      `json:"batchSize,omitempty"`
}

// DomainGenerationStats tracks domain generation statistics
type DomainGenerationStats struct {
	CampaignID         uuid.UUID `json:"campaignId"`
	TotalCombinations  int64     `json:"totalCombinations"`
	CurrentOffset      int64     `json:"currentOffset"`
	DomainsGenerated   int       `json:"domainsGenerated"`
	GenerationRate     float64   `json:"generationRate"`
	MemoryUsage        int64     `json:"memoryUsage"`
	ConfigHash         string    `json:"configHash"`
	EstimatedTimeLeft  int64     `json:"estimatedTimeLeft"`
	TotalGenerated     int64     `json:"totalGenerated"`
	UniqueDomainsCount int64     `json:"uniqueDomainsCount"`
	DuplicatesSkipped  int64     `json:"duplicatesSkipped"`
	ErrorCount         int64     `json:"errorCount"`
}

type LeadGenerationProgress struct {
	CampaignID      uuid.UUID                `json:"campaign_id"`
	CurrentPhase    models.PhaseTypeEnum     `json:"current_phase"`
	PhaseProgress   map[string]PhaseProgress `json:"phase_progress"`
	OverallProgress float64                  `json:"overall_progress"`
}

// DNSCampaignService defines the interface for DNS validation campaign logic.
type DNSCampaignService interface {
	// GetCampaignDetails retrieves the base campaign and its specific DNS validation parameters.
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, *models.DNSValidationCampaignParams, error)
	ProcessDNSValidationCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedCount int, err error)

	// Phase transition methods for single-campaign architecture
	ConfigureDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.DNSPhaseConfigRequest) error
	TransitionToHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID) error
}

// HTTPKeywordCampaignService defines the interface for HTTP & Keyword validation campaign logic.
type HTTPKeywordCampaignService interface {
	// GetCampaignDetails retrieves the base campaign and its specific HTTP & Keyword validation parameters.
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, *models.HTTPKeywordCampaignParams, error)
	ProcessHTTPKeywordCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedCount int, err error)

	// Phase transition methods for single-campaign architecture
	ConfigureHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.HTTPPhaseConfigRequest) error
	TransitionToAnalysisPhase(ctx context.Context, campaignID uuid.UUID) error
}

// AnalysisService defines the interface for content analysis and lead extraction from HTTP results.
type AnalysisService interface {
	// ProcessAnalysisCampaignBatch performs content analysis on HTTP results and stores analysis results
	ProcessAnalysisCampaignBatch(ctx context.Context, campaignID uuid.UUID, batchSize int) (done bool, processedCount int64, err error)
}

// CampaignWorkerService manages the pool of background workers that process campaign jobs.
type CampaignWorkerService interface {
	StartWorkers(ctx context.Context, numWorkers int)
}

// PhaseExecutionService defines the universal interface for campaign lifecycle management and phase execution.
// This service replaces both LeadGenerationCampaignService and CampaignOrchestratorService for simplified architecture.
type PhaseExecutionService interface {
	// Campaign lifecycle operations
	CreateCampaign(ctx context.Context, req CreateLeadGenerationCampaignRequest) (*models.LeadGenerationCampaign, error)
	StartCampaign(ctx context.Context, campaignID uuid.UUID) error
	PauseCampaign(ctx context.Context, campaignID uuid.UUID) error
	ResumeCampaign(ctx context.Context, campaignID uuid.UUID) error
	CancelCampaign(ctx context.Context, campaignID uuid.UUID) error

	// Campaign CRUD operations
	GetCampaign(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, error)
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, interface{}, error)
	UpdateCampaign(ctx context.Context, campaignID uuid.UUID, req UpdateCampaignRequest) (*models.LeadGenerationCampaign, error)
	DeleteCampaign(ctx context.Context, campaignID uuid.UUID) error
	BulkDeleteCampaigns(ctx context.Context, campaignIDs []uuid.UUID) (*BulkDeleteResult, error)

	// Campaign listing and status
	ListCampaigns(ctx context.Context, filter store.ListCampaignsFilter) ([]models.LeadGenerationCampaign, int64, error)
	GetCampaignStatus(ctx context.Context, campaignID uuid.UUID) (models.PhaseStatusEnum, *float64, error)
	SetCampaignErrorStatus(ctx context.Context, campaignID uuid.UUID, errorMessage string) error
	SetCampaignStatus(ctx context.Context, campaignID uuid.UUID, status models.PhaseStatusEnum) error

	// Phase execution - Phase 4.11: User-controlled phase management (JobTypeEnum routing eliminated)
	StartPhase(ctx context.Context, campaignID uuid.UUID, phaseType string) error
	ConfigurePhase(ctx context.Context, campaignID uuid.UUID, phaseType string, config interface{}) error
	TransitionToNextPhase(ctx context.Context, campaignID uuid.UUID) error

	// Campaign progress and results
	GetCampaignProgress(ctx context.Context, campaignID uuid.UUID) (*LeadGenerationProgress, error)
	GetGeneratedDomainsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor int64) (*GeneratedDomainsResponse, error)
	GetDNSValidationResultsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor string, filter store.ListValidationResultsFilter) (*DNSValidationResultsResponse, error)
	GetHTTPKeywordResultsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor string, filter store.ListValidationResultsFilter) (*HTTPKeywordResultsResponse, error)

	// Phase configuration methods
	ConfigureDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.DNSPhaseConfigRequest) (*models.LeadGenerationCampaign, error)
	ConfigureHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.HTTPPhaseConfigRequest) (*models.LeadGenerationCampaign, error)

	// Phase restart methods
	RestartDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req *DNSValidationRequest) (*models.LeadGenerationCampaign, error)
	RestartHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req *HTTPKeywordValidationRequest) (*models.LeadGenerationCampaign, error)

	// Campaign completion and dependency management
	HandleCampaignCompletion(ctx context.Context, campaignID uuid.UUID) error
	GetCampaignDependencies(ctx context.Context, campaignID uuid.UUID) (*CampaignDependencyInfo, error)
}

// PhaseConfig contains configuration for any phase type in a lead generation campaign
type PhaseConfig struct {
	PhaseType models.PhaseTypeEnum `json:"phaseType"`

	// Domain Generation Phase Config
	DomainGeneration *DomainGenerationPhaseConfig `json:"domainGeneration,omitempty"`

	// DNS Validation Phase Config
	DNSValidation *DNSValidationPhaseConfig `json:"dnsValidation,omitempty"`

	// HTTP Keyword Validation Phase Config
	HTTPKeywordValidation *HTTPKeywordValidationPhaseConfig `json:"httpKeywordValidation,omitempty"`

	// Analysis Phase Config
	Analysis *AnalysisPhaseConfig `json:"analysis,omitempty"`
}

// DomainGenerationPhaseConfig contains domain generation phase parameters
type DomainGenerationPhaseConfig struct {
	PatternType          string `json:"patternType" validate:"required,oneof=prefix suffix both"`
	VariableLength       int    `json:"variableLength" validate:"required,gt=0"`
	CharacterSet         string `json:"characterSet" validate:"required"`
	ConstantString       string `json:"constantString" validate:"required"`
	TLD                  string `json:"tld" validate:"required"`
	NumDomainsToGenerate int64  `json:"numDomainsToGenerate,omitempty" validate:"omitempty,gte=0"`
	BatchSize            int    `json:"batchSize,omitempty" validate:"omitempty,gt=0"`
}

// DNSValidationPhaseConfig contains DNS validation phase parameters
type DNSValidationPhaseConfig struct {
	PersonaIDs []string `json:"personaIds" validate:"required,min=1"`
	BatchSize  int      `json:"batchSize,omitempty" validate:"omitempty,gt=0"`
	Timeout    int      `json:"timeout,omitempty"`
	MaxRetries int      `json:"maxRetries,omitempty"`
}

// HTTPKeywordValidationPhaseConfig contains HTTP keyword validation phase parameters
type HTTPKeywordValidationPhaseConfig struct {
	PersonaIDs    []string `json:"personaIds" validate:"required,min=1"`
	Keywords      []string `json:"keywords,omitempty"`
	AdHocKeywords []string `json:"adHocKeywords,omitempty"`
	BatchSize     int      `json:"batchSize,omitempty" validate:"omitempty,gt=0"`
	Timeout       int      `json:"timeout,omitempty"`
	MaxRetries    int      `json:"maxRetries,omitempty"`
}

// AnalysisPhaseConfig contains analysis phase parameters
type AnalysisPhaseConfig struct {
	MinLeadScore   float64  `json:"minLeadScore,omitempty"`
	RequiredFields []string `json:"requiredFields,omitempty"`
	AnalysisRules  []string `json:"analysisRules,omitempty"`
}

// PhaseProgress represents the current progress of any phase in a lead generation campaign
type PhaseProgress struct {
	CampaignID      uuid.UUID              `json:"campaignId"`
	PhaseType       models.PhaseTypeEnum   `json:"phaseType"`
	Status          models.PhaseStatusEnum `json:"status"`
	ItemsTotal      int64                  `json:"itemsTotal"`
	ItemsProcessed  int64                  `json:"itemsProcessed"`
	ItemsSuccessful int64                  `json:"itemsSuccessful"`
	ItemsFailed     int64                  `json:"itemsFailed"`
	Progress        float64                `json:"progress"`
	StartedAt       *time.Time             `json:"startedAt,omitempty"`
	EstimatedEnd    *time.Time             `json:"estimatedEnd,omitempty"`
	ErrorMessage    *string                `json:"errorMessage,omitempty"`
}

// PhaseStats provides statistics about any phase execution
type PhaseStats struct {
	CampaignID     uuid.UUID            `json:"campaignId"`
	PhaseType      models.PhaseTypeEnum `json:"phaseType"`
	ProcessingRate float64              `json:"processingRate"`
	MemoryUsage    int64                `json:"memoryUsage"`
	Duration       time.Duration        `json:"duration"`
	TotalResults   int64                `json:"totalResults"`
	SuccessRate    float64              `json:"successRate"`
	ErrorCounts    map[string]int64     `json:"errorCounts,omitempty"`
}

// ConfigManagerInterface defines the interface for configuration management
type ConfigManagerInterface interface {
	GetDomainGenerationConfig(ctx context.Context, configHash string) (*models.DomainGenerationConfigState, error)
	UpdateDomainGenerationConfig(ctx context.Context, configHash string, updateFn func(currentState *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error)) (*models.DomainGenerationConfigState, error)
}
