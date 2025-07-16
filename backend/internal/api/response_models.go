package api

import (
	"github.com/google/uuid"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
)

// Common response models to prevent auto-generated inline schemas

// FeatureFlags represents feature flag settings for OpenAPI schema generation
type FeatureFlags = config.FeatureFlags

// AuthConfig represents authentication configuration for OpenAPI schema generation
type AuthConfig = config.AuthConfig

// DNSValidatorConfigJSON represents DNS validator configuration for OpenAPI schema generation
type DNSValidatorConfigJSON = config.DNSValidatorConfigJSON

// HTTPValidatorConfigJSON represents HTTP validator configuration for OpenAPI schema generation
type HTTPValidatorConfigJSON = config.HTTPValidatorConfigJSON

// LoggingConfig represents logging configuration for OpenAPI schema generation
type LoggingConfig = config.LoggingConfig

// ProxyManagerConfigJSON represents proxy manager configuration for OpenAPI schema generation
type ProxyManagerConfigJSON = config.ProxyManagerConfigJSON

// RateLimiterConfig represents rate limiter configuration for OpenAPI schema generation
type RateLimiterConfig = config.RateLimiterConfig

// WorkerConfig represents worker configuration for OpenAPI schema generation
type WorkerConfig = config.WorkerConfig

// PatternOffsetRequest represents a request to get domain generation pattern offset
type PatternOffsetRequest struct {
	PatternType    string `json:"patternType" binding:"required" validate:"oneof=prefix suffix both"`
	VariableLength int    `json:"variableLength" binding:"required,min=1"`
	CharacterSet   string `json:"characterSet" binding:"required"`
	ConstantString string `json:"constantString" binding:"required"`
	TLD            string `json:"tld" binding:"required"`
}

// PatternOffsetResponse represents the response with current pattern offset
type PatternOffsetResponse struct {
	PatternType               string `json:"patternType"`
	VariableLength            int    `json:"variableLength"`
	CharacterSet              string `json:"characterSet"`
	ConstantString            string `json:"constantString"`
	TLD                       string `json:"tld"`
	CurrentOffset             int64  `json:"currentOffset"`
	TotalPossibleCombinations int64  `json:"totalPossibleCombinations"`
}

// LEGACY RESPONSE TYPES REMOVED - ALL ENDPOINTS NOW USE UNIFIED APIResponse FORMAT
// See response_types.go for the unified APIResponse structure

// SuccessMessageResponse represents a simple success message
type SuccessMessageResponse struct {
	Message string `json:"message"`
}

// DeletionConfirmationResponse represents a deletion confirmation
type DeletionConfirmationResponse struct {
	Deleted bool   `json:"deleted"`
	Message string `json:"message"`
}

// HealthCheckResponse represents a health check response
type HealthCheckResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// TestResultResponse represents a test operation result
type TestResultResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	TestID  string `json:"testId,omitempty"`
	Status  string `json:"status,omitempty"`
}

// DetailedTestResultResponse represents detailed test results with metrics
type DetailedTestResultResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	TestID       string `json:"testId"`
	Status       string `json:"status"`
	Duration     int64  `json:"durationMs"`
	ErrorCount   int    `json:"errorCount"`
	SuccessCount int    `json:"successCount"`
	Details      string `json:"details,omitempty"`
}

// DeletionResponse represents a successful deletion operation
type DeletionResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	ID      string `json:"id"`
}

// ProxyStatusResponse represents proxy status information
type ProxyStatusResponse struct {
	ProxyID      string               `json:"proxyId"`
	Status       string               `json:"status"`
	LastChecked  string               `json:"lastChecked"`
	ResponseTime int64                `json:"responseTimeMs"`
	IsHealthy    bool                 `json:"isHealthy"`
	ProxyDetails ProxyDetailsResponse `json:"proxyDetails,omitempty"`
}

// ProxyDetailsResponse represents detailed proxy information
type ProxyDetailsResponse struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Protocol string `json:"protocol"`
	Username string `json:"username,omitempty"`
}

// ProxyHealthCheckResponse represents detailed health check results for proxies
type ProxyHealthCheckResponse struct {
	ProxyID      string `json:"proxyId"`
	Success      bool   `json:"success"`
	Status       string `json:"status"`
	ResponseTime int64  `json:"responseTimeMs"`
	Message      string `json:"message,omitempty"`
	Timestamp    string `json:"timestamp"`
}

// BulkHealthCheckResponse represents results from bulk health checks
type BulkHealthCheckResponse struct {
	TotalProxies   int                        `json:"totalProxies"`
	HealthyProxies int                        `json:"healthyProxies"`
	FailedProxies  int                        `json:"failedProxies"`
	Results        []ProxyHealthCheckResponse `json:"results"`
}

// CampaignOperationResponse represents campaign management operations
type CampaignOperationResponse struct {
	Success    bool   `json:"success"`
	Message    string `json:"message"`
	CampaignID string `json:"campaignId"`
	Status     string `json:"status,omitempty"`
}

// BulkCampaignDeleteResponse represents bulk campaign deletion results
type BulkCampaignDeleteResponse struct {
	Success          bool     `json:"success"`
	Message          string   `json:"message"`
	DeletedCount     int      `json:"deletedCount"`
	DeletedCampaigns []string `json:"deletedCampaigns"`
}

// ValidationOperationResponse represents validation operation results
type ValidationOperationResponse struct {
	Success        bool   `json:"success"`
	Message        string `json:"message"`
	CampaignID     string `json:"campaignId"`
	ValidationType string `json:"validationType"`
	JobID          string `json:"jobId,omitempty"`
}

// PersonaTestResponse represents persona test results
type PersonaTestResponse struct {
	PersonaID    string                  `json:"personaId"`
	PersonaType  string                  `json:"personaType"`
	PersonaName  string                  `json:"personaName"`
	Success      bool                    `json:"success"`
	TestPassed   bool                    `json:"testPassed"`
	Message      string                  `json:"message"`
	TestResults  PersonaTestResultData   `json:"testResults"`
	Results      PersonaTestResultData   `json:"results,omitempty"`
	Timestamp    string                  `json:"timestamp"`
}

// PersonaTestResultData represents structured test result data
type PersonaTestResultData struct {
	Duration     int64  `json:"durationMs"`
	RequestCount int    `json:"requestCount"`
	SuccessCount int    `json:"successCount"`
	ErrorCount   int    `json:"errorCount"`
	Details      string `json:"details,omitempty"`
}

// SessionResponse represents authentication session data
type SessionResponse struct {
	User         UserPublicResponse `json:"user"`
	Token        string             `json:"token"`
	RefreshToken string             `json:"refreshToken"`
	ExpiresAt    string             `json:"expiresAt"`
}

// UserPublicResponse represents public user data (subset of User model)
type UserPublicResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	IsActive bool   `json:"isActive"`
}

// ServerConfigResponse represents server configuration
type ServerConfigResponse struct {
	Port            string `json:"port"`
	StreamChunkSize int    `json:"streamChunkSize"`
	GinMode         string `json:"ginMode"`
}

// ServerConfigUpdateRequest represents server configuration update
type ServerConfigUpdateRequest struct {
	StreamChunkSize *int    `json:"streamChunkSize,omitempty"`
	GinMode         *string `json:"ginMode,omitempty"`
}

// DNSConfigUpdateRequest represents DNS configuration update request
type DNSConfigUpdateRequest = config.DNSValidatorConfigJSON

// HTTPConfigUpdateRequest represents HTTP configuration update request
type HTTPConfigUpdateRequest = config.HTTPValidatorConfigJSON

// LoggingConfigUpdateRequest represents logging configuration update request
type LoggingConfigUpdateRequest = config.LoggingConfig

// WorkerConfigUpdateRequest represents worker configuration update request
type WorkerConfigUpdateRequest = config.WorkerConfig

// RateLimiterConfigUpdateRequest represents rate limiter configuration update request
type RateLimiterConfigUpdateRequest = config.RateLimiterConfig

// AuthConfigUpdateRequest represents authentication configuration update request
type AuthConfigUpdateRequest = config.AuthConfig

// ProxyManagerConfigUpdateRequest represents proxy manager configuration update request
type ProxyManagerConfigUpdateRequest = config.ProxyManagerConfigJSON

// FeatureFlagsUpdateRequest represents feature flags update request
type FeatureFlagsUpdateRequest = config.FeatureFlags

// LoginSuccessResponse represents a successful login response
type LoginSuccessResponse struct {
	Message string             `json:"message"`
	User    UserPublicResponse `json:"user"`
	Session SessionData        `json:"session,omitempty"`
}

// SessionData represents session information
type SessionData struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refreshToken"`
	ExpiresAt    string `json:"expiresAt"`
}

// PasswordChangeResponse represents password change confirmation
type PasswordChangeResponse struct {
	Message string `json:"message"`
	Success bool   `json:"success"`
}

// SessionRefreshResponse represents session refresh confirmation
type SessionRefreshResponse struct {
	Message   string `json:"message"`
	ExpiresAt string `json:"expiresAt"`
}

// CampaignActionResponse represents campaign action results
type CampaignActionResponse struct {
	Message    string `json:"message"`
	CampaignID string `json:"campaignId"`
	Action     string `json:"action"`
	Success    bool   `json:"success"`
}

// ValidationStartResponse represents validation operation start
type ValidationStartResponse struct {
	Message      string `json:"message"`
	ValidationID string `json:"validationId"`
	CampaignID   string `json:"campaignId"`
}

// OffsetResponse represents pattern offset response
type OffsetResponse struct {
	Pattern string `json:"pattern"`
	Offset  int64  `json:"offset"`
}

// ProxyTestResponse represents proxy test results
type ProxyTestResponse struct {
	ProxyID      string `json:"proxyId"`
	Success      bool   `json:"success"`
	StatusCode   int    `json:"statusCode,omitempty"`
	ResponseTime int64  `json:"responseTime,omitempty"`
	Error        string `json:"error,omitempty"`
}

// ProxyPoolDeleteResponse represents proxy pool deletion
type ProxyPoolDeleteResponse struct {
	Deleted bool   `json:"deleted"`
	PoolID  string `json:"poolId"`
	Message string `json:"message"`
}

// ProxyPoolMembershipResponse represents proxy pool membership operations
type ProxyPoolMembershipResponse struct {
	PoolID  string `json:"poolId"`
	ProxyID string `json:"proxyId"`
	Added   bool   `json:"added,omitempty"`
	Removed bool   `json:"removed,omitempty"`
	Message string `json:"message"`
}

// PersonaDeleteResponse represents persona deletion
type PersonaDeleteResponse struct {
	PersonaID string `json:"personaId"`
	Deleted   bool   `json:"deleted"`
	Message   string `json:"message"`
}

// KeywordSetDeleteResponse represents keyword set deletion
type KeywordSetDeleteResponse struct {
	KeywordSetID string `json:"keywordSetId"`
	Deleted      bool   `json:"deleted"`
	Message      string `json:"message"`
}

// PingResponse represents ping endpoint response
type PingResponse struct {
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

// WebSocketErrorResponse represents WebSocket connection errors
type WebSocketErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code,omitempty"`
}

// BulkDeleteResult represents the result of a bulk delete operation
type BulkDeleteResult struct {
	Message             string   `json:"message"`
	TotalRequested      int      `json:"total_requested"`
	SuccessfullyDeleted int      `json:"successfully_deleted"`
	FailedDeletions     int      `json:"failed_deletions"`
	DeletedCampaignIDs  []string `json:"deleted_campaign_ids"`
}

// CampaignDetailsResponse represents detailed campaign information with additional parameters
type CampaignDetailsResponse struct {
	Campaign CampaignData       `json:"campaign"`
	Params   CampaignParamsData `json:"params,omitempty"`
}

// CampaignData represents campaign information
type CampaignData struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type" enums:"domain_generation,dns_validation,http_keyword_validation"`
	Status      string `json:"status" enums:"pending,queued,running,pausing,paused,completed,failed,archived,cancelled"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	Description string `json:"description,omitempty"`
}

// CampaignParamsData represents campaign parameters
type CampaignParamsData struct {
	DomainCount    int    `json:"domainCount,omitempty"`
	KeywordSetID   string `json:"keywordSetId,omitempty"`
	PersonaID      string `json:"personaId,omitempty"`
	ProxyPoolID    string `json:"proxyPoolId,omitempty"`
	Configuration  string `json:"configuration,omitempty"`
}

// ErrorContext represents error context information with all possible fields
type ErrorContext struct {
	CampaignType     string `json:"campaign_type,omitempty"`
	CampaignID       string `json:"campaign_id,omitempty"`
	CampaignCount    int    `json:"campaign_count,omitempty"`
	ProvidedValue    string `json:"provided_value,omitempty"`
	CampaignStatus   string `json:"campaign_status,omitempty"`
	ValidationJobID  string `json:"validation_job_id,omitempty"`
	SourceCampaignID string `json:"source_campaign_id,omitempty"`
	TargetCampaignID string `json:"target_campaign_id,omitempty"`
	DomainCount      int    `json:"domain_count,omitempty"`
	ResultCount      int    `json:"result_count,omitempty"`
	ErrorType        string `json:"error_type,omitempty"`
	RequiredField    string `json:"required_field,omitempty"`
	Help             string `json:"help,omitempty"`
}

// CampaignStartResponse represents campaign start operation response
type CampaignStartResponse struct {
	Message    string `json:"message"`
	CampaignID string `json:"campaignId"`
	QueuedAt   string `json:"queuedAt,omitempty"`
}

// DNSValidationStartResponse represents DNS validation start response
type DNSValidationStartResponse struct {
	Message          string `json:"message"`
	CampaignID       string `json:"campaignId"`
	ValidationJobID  string `json:"validationJobId"`
	DomainsToProcess int    `json:"domainsToProcess"`
}

// HTTPValidationStartResponse represents HTTP validation start response
type HTTPValidationStartResponse struct {
	Message         string `json:"message"`
	CampaignID      string `json:"campaignId"`
	ValidationJobID string `json:"validationJobId"`
	DomainsToTest   int    `json:"domainsToTest"`
}

// Type aliases for request types to ensure OpenAPI generation works properly
type LoginRequest = models.LoginRequest
type ChangePasswordRequest = models.ChangePasswordRequest
type CreateCampaignRequest = services.CreateCampaignRequest
type UpdateCampaignRequest = services.UpdateCampaignRequest
type CreateProxyRequest = models.CreateProxyRequest
type UpdateProxyRequest = models.UpdateProxyRequest
type DNSValidationAPIRequest struct {
	CampaignID              uuid.UUID   `json:"campaignId" validate:"required"`
	PersonaIDs              []uuid.UUID `json:"personaIds" validate:"omitempty,min=1,dive,uuid"`
	RotationIntervalSeconds int         `json:"rotationIntervalSeconds,omitempty" validate:"gte=0"`
	ProcessingSpeedPerMinute int        `json:"processingSpeedPerMinute,omitempty" validate:"gte=0"`
	BatchSize               int         `json:"batchSize,omitempty" validate:"gt=0"`
	RetryAttempts           int         `json:"retryAttempts,omitempty" validate:"gte=0"`
	OnlyInvalidDomains      bool        `json:"onlyInvalidDomains" validate:"omitempty"`
}

// Request types for handlers with anonymous structs
type ProxyHealthCheckRequest struct {
	IDs []string `json:"ids"`
}

type AddProxyToPoolRequest struct {
	ProxyID string `json:"proxyId" binding:"required"`
	Weight  *int   `json:"weight,omitempty"`
}