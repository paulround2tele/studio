// File: backend/internal/services/interfaces.go
package services

import (
	"context"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store" // Added for store.ListCampaignsFilter
	"github.com/google/uuid"
)

// --- Campaign Update Request DTOs ---
type UpdateCampaignRequest struct {
	Name                       *string                         `json:"name,omitempty"`
	CampaignType               *models.CampaignTypeEnum        `json:"campaignType,omitempty"`
	Status                     *models.CampaignStatusEnum      `json:"status,omitempty"`
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
	CampaignType   string    `json:"campaignType" validate:"required,oneof=domain_generation dns_validation http_keyword_validation"`
	Name           string    `json:"name" validate:"required"`
	Description    string    `json:"description,omitempty"`
	UserID         uuid.UUID `json:"userId,omitempty"`
	LaunchSequence bool      `json:"launchSequence,omitempty"` // Whether to automatically chain to next campaign types when this campaign completes

	// Domain Generation specific fields
	DomainGenerationParams *DomainGenerationParams `json:"domainGenerationParams,omitempty"`

	// DNS Validation specific fields
	DnsValidationParams *DnsValidationParams `json:"dnsValidationParams,omitempty"`

	// HTTP Keyword Validation specific fields
	HttpKeywordParams *HttpKeywordParams `json:"httpKeywordParams,omitempty"`
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
	SourceGenerationCampaignID *uuid.UUID   `json:"sourceGenerationCampaignId,omitempty"` // For phased validation from domain generation
	SourceCampaignID          *uuid.UUID   `json:"sourceCampaignId,omitempty"`           // For standalone validation from past campaigns
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

// --- Campaign Creation Request DTOs (specific to each campaign type) ---

type CreateDomainGenerationCampaignRequest struct {
	Name                 string    `json:"name" validate:"required"`
	PatternType          string    `json:"patternType" validate:"required,oneof=prefix suffix both"`
	VariableLength       int       `json:"variableLength" validate:"required,gt=0"`
	CharacterSet         string    `json:"characterSet" validate:"required"`
	ConstantString       string    `json:"constantString" validate:"required"`
	TLD                  string    `json:"tld" validate:"required"`
	NumDomainsToGenerate int64     `json:"numDomainsToGenerate,omitempty" validate:"omitempty,gte=0"`
	UserID               uuid.UUID `json:"userId,omitempty"`
}

type CreateDNSValidationCampaignRequest struct {
	Name                       string      `json:"name" validate:"required"`
	SourceGenerationCampaignID uuid.UUID   `json:"sourceCampaignId" validate:"required"`
	PersonaIDs                 []uuid.UUID `json:"personaIds" validate:"required,min=1,dive,uuid"`
	RotationIntervalSeconds    int         `json:"rotationIntervalSeconds,omitempty" validate:"gte=0"`
	ProcessingSpeedPerMinute   int         `json:"processingSpeedPerMinute,omitempty" validate:"gte=0"`
	BatchSize                  int         `json:"batchSize,omitempty" validate:"gt=0"`
	RetryAttempts              int         `json:"retryAttempts,omitempty" validate:"gte=0"`
	UserID                     uuid.UUID   `json:"userId,omitempty"`
}

type CreateHTTPKeywordCampaignRequest struct {
	Name                     string      `json:"name" validate:"required"`
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
	UserID                   uuid.UUID   `json:"userId,omitempty"`
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
	PersonaIDs              []uuid.UUID `json:"personaIds" validate:"omitempty,min=1,dive,uuid"`
	RotationIntervalSeconds *int        `json:"rotationIntervalSeconds,omitempty" validate:"omitempty,gte=0"`
	ProcessingSpeedPerMinute *int       `json:"processingSpeedPerMinute,omitempty" validate:"omitempty,gte=0"`
	BatchSize               *int        `json:"batchSize,omitempty" validate:"omitempty,gt=0"`
	RetryAttempts           *int        `json:"retryAttempts,omitempty" validate:"omitempty,gte=0"`
}

// InPlaceDNSValidationRequest for validating domains on existing campaigns
type InPlaceDNSValidationRequest struct {
	CampaignID              uuid.UUID   `json:"campaignId" validate:"required"`
	PersonaIDs              []uuid.UUID `json:"personaIds" validate:"omitempty,min=1,dive,uuid"`
	RotationIntervalSeconds int         `json:"rotationIntervalSeconds,omitempty" validate:"gte=0"`
	ProcessingSpeedPerMinute int        `json:"processingSpeedPerMinute,omitempty" validate:"gte=0"`
	BatchSize               int         `json:"batchSize,omitempty" validate:"gt=0"`
	RetryAttempts           int         `json:"retryAttempts,omitempty" validate:"gte=0"`
	OnlyInvalidDomains      bool        `json:"onlyInvalidDomains" validate:"omitempty"`
}

// BulkDeleteResult represents the result of a bulk delete operation
type BulkDeleteResult struct {
	SuccessfullyDeleted   int         `json:"successfully_deleted"`
	FailedDeletions      int         `json:"failed_deletions"`
	DeletedCampaignIDs   []uuid.UUID `json:"deleted_campaign_ids"`
	FailedCampaignIDs    []uuid.UUID `json:"failed_campaign_ids,omitempty"`
	Errors               []string    `json:"errors,omitempty"`
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

	// Legacy campaign creation methods (deprecated but maintained for backward compatibility)
	CreateDomainGenerationCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.Campaign, error)
	CreateDNSValidationCampaign(ctx context.Context, req CreateDNSValidationCampaignRequest) (*models.Campaign, error)
	CreateHTTPKeywordCampaign(ctx context.Context, req CreateHTTPKeywordCampaignRequest) (*models.Campaign, error)

	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, interface{}, error) // Stays as interface{} for flexibility at orchestrator level
	GetCampaignStatus(ctx context.Context, campaignID uuid.UUID) (models.CampaignStatusEnum, *float64, error)
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
	SetCampaignStatus(ctx context.Context, campaignID uuid.UUID, status models.CampaignStatusEnum) error
	HandleCampaignCompletion(ctx context.Context, campaignID uuid.UUID) error
	GetCampaignDependencies(ctx context.Context, campaignID uuid.UUID) (*CampaignDependencyInfo, error)
}

// DomainGenerationService defines the interface for domain generation campaign logic.
type DomainGenerationService interface {
	// CreateCampaign creates a new domain generation campaign and its associated parameters.
	// It handles the specific logic for domain generation setup, including config hashing and state management.
	CreateCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.Campaign, error)
	// GetCampaignDetails retrieves the base campaign and its specific domain generation parameters.
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.DomainGenerationCampaignParams, error)
	ProcessGenerationCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedCount int, err error)
}

// DNSCampaignService defines the interface for DNS validation campaign logic.
type DNSCampaignService interface {
	// CreateCampaign creates a new DNS validation campaign and its associated parameters.
	CreateCampaign(ctx context.Context, req CreateDNSValidationCampaignRequest) (*models.Campaign, error)
	// GetCampaignDetails retrieves the base campaign and its specific DNS validation parameters.
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.DNSValidationCampaignParams, error)
	ProcessDNSValidationCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedCount int, err error)
	// StartInPlaceDNSValidation starts DNS validation on an existing domain generation campaign
	StartInPlaceDNSValidation(ctx context.Context, req InPlaceDNSValidationRequest) error
}

// HTTPKeywordCampaignService defines the interface for HTTP & Keyword validation campaign logic.
type HTTPKeywordCampaignService interface {
	// CreateCampaign creates a new HTTP & Keyword campaign and its associated parameters.
	CreateCampaign(ctx context.Context, req CreateHTTPKeywordCampaignRequest) (*models.Campaign, error)
	// GetCampaignDetails retrieves the base campaign and its specific HTTP & Keyword validation parameters.
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.HTTPKeywordCampaignParams, error)
	ProcessHTTPKeywordCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedCount int, err error)
}

// CampaignWorkerService manages the pool of background workers that process campaign jobs.
type CampaignWorkerService interface {
	StartWorkers(ctx context.Context, numWorkers int)
}

// ConfigManagerInterface defines the interface for configuration management
type ConfigManagerInterface interface {
	GetDomainGenerationConfig(ctx context.Context, configHash string) (*models.DomainGenerationConfigState, error)
	UpdateDomainGenerationConfig(ctx context.Context, configHash string, updateFn func(currentState *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error)) (*models.DomainGenerationConfigState, error)
}
