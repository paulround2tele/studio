package api

import (
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// Common response models to prevent auto-generated inline schemas

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

// INFRASTRUCTURE COMPLIANCE NOTE: These response models should be auto-generated
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
	PersonaID   string                `json:"personaId"`
	PersonaType string                `json:"personaType"`
	PersonaName string                `json:"personaName"`
	Success     bool                  `json:"success"`
	TestPassed  bool                  `json:"testPassed"`
	Message     string                `json:"message"`
	TestResults PersonaTestResultData `json:"testResults"`
	Results     PersonaTestResultData `json:"results,omitempty"`
	Timestamp   string                `json:"timestamp"`
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

// BulkProxyTestResponse represents bulk proxy test results
type BulkProxyTestResponse struct {
	TotalRequested int                 `json:"totalRequested"`
	SuccessCount   int                 `json:"successCount"`
	ErrorCount     int                 `json:"errorCount"`
	TestResults    []ProxyTestResponse `json:"testResults"`
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

// NOTE: WebSocketErrorResponse removed for API response consolidation
// WebSocket errors now use the unified api.APIResponse structure

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

// LeadGenerationCampaignResponse represents a complete lead generation campaign response
// @Description Complete lead generation campaign with phase-centric architecture
type LeadGenerationCampaignResponse struct {
	ID           string  `json:"id" validate:"required" example:"550e8400-e29b-41d4-a716-446655440000" description:"Campaign UUID"`
	Name         string  `json:"name" validate:"required" example:"Domain Generation Campaign" description:"Campaign name"`
	CampaignType string  `json:"campaignType" validate:"required,eq=lead_generation" example:"lead_generation" description:"Campaign type"`
	CreatedAt    string  `json:"createdAt" validate:"required" example:"2024-01-15T10:30:00Z" description:"Campaign creation timestamp"`
	UpdatedAt    string  `json:"updatedAt" validate:"required" example:"2024-01-15T15:45:30Z" description:"Last update timestamp"`
	StartedAt    *string `json:"startedAt,omitempty" description:"Campaign start timestamp"`
	CompletedAt  *string `json:"completedAt,omitempty" description:"Campaign completion timestamp"`

	// Phase management
	CurrentPhase    *models.PhaseTypeEnum   `json:"currentPhase,omitempty" enums:"domain_generation,dns_validation,http_keyword_validation,analysis"`
	PhaseStatus     *models.PhaseStatusEnum `json:"phaseStatus,omitempty" enums:"not_started,ready,configured,in_progress,paused,completed,failed"`
	TotalPhases     int                     `json:"totalPhases" example:"4" description:"Total number of phases (always 4)"`
	CompletedPhases int                     `json:"completedPhases" example:"2" description:"Number of completed phases"`
	OverallProgress *float64                `json:"overallProgress,omitempty" example:"75.5" description:"Overall campaign progress (0-100)"`

	// Phase execution details
	Phases []PhaseProgressResponse `json:"phases,omitempty" description:"Individual phase progress details"`

	// Campaign-level tracking
	TotalItems      *int64  `json:"totalItems,omitempty" description:"Total items to process"`
	ProcessedItems  *int64  `json:"processedItems,omitempty" description:"Items processed so far"`
	SuccessfulItems *int64  `json:"successfulItems,omitempty" description:"Successfully processed items"`
	FailedItems     *int64  `json:"failedItems,omitempty" description:"Failed processing items"`
	ErrorMessage    *string `json:"errorMessage,omitempty" description:"Error message if campaign failed"`

	// Summary metrics
	Domains             *int64 `json:"domains,omitempty" description:"Total domains generated"`
	DNSValidatedDomains *int64 `json:"dnsValidatedDomains,omitempty" description:"Domains that passed DNS validation"`
	Leads               *int64 `json:"leads,omitempty" description:"Total leads identified"`
}

// PhaseProgressResponse represents progress information for a single phase
// @Description Progress and status information for a campaign phase
type PhaseProgressResponse struct {
	PhaseType       models.PhaseTypeEnum   `json:"phaseType" enums:"domain_generation,dns_validation,http_keyword_validation,analysis"`
	Status          models.PhaseStatusEnum `json:"status" enums:"not_started,ready,configured,in_progress,paused,completed,failed"`
	Progress        float64                `json:"progress" example:"85.5" description:"Phase progress percentage (0-100)"`
	ProcessedItems  int64                  `json:"processedItems" example:"850" description:"Items processed in this phase"`
	TotalItems      int64                  `json:"totalItems" example:"1000" description:"Total items to process in this phase"`
	SuccessfulItems int64                  `json:"successfulItems" example:"820" description:"Successfully processed items"`
	FailedItems     int64                  `json:"failedItems" example:"30" description:"Failed processing items"`
	StartedAt       *string                `json:"startedAt,omitempty" description:"Phase start timestamp"`
	CompletedAt     *string                `json:"completedAt,omitempty" description:"Phase completion timestamp"`
	ErrorMessage    *string                `json:"errorMessage,omitempty" description:"Error message if phase failed"`
}

// CampaignProgressResponse represents overall campaign progress
// @Description Overall campaign progress across all phases
type CampaignProgressResponse struct {
	CampaignID             string                  `json:"campaignId"`
	OverallProgress        float64                 `json:"overallProgress" example:"75.5" description:"Overall campaign progress (0-100)"`
	CurrentPhase           models.PhaseTypeEnum    `json:"currentPhase" enums:"domain_generation,dns_validation,http_keyword_validation,analysis"`
	PhaseStatus            models.PhaseStatusEnum  `json:"phaseStatus" enums:"not_started,ready,configured,in_progress,paused,completed,failed"`
	Phases                 []PhaseProgressResponse `json:"phases" description:"Progress for each phase"`
	EstimatedTimeRemaining *string                 `json:"estimatedTimeRemaining,omitempty" description:"Estimated time to completion"`
}

// CampaignData represents campaign information (legacy compatibility)
// @Description Campaign data with phases-based architecture
type CampaignData struct {
	ID          string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000" description:"Campaign UUID"`
	Name        string `json:"name" example:"Domain Generation Campaign" description:"Campaign name"`
	CreatedAt   string `json:"createdAt" example:"2024-01-15T10:30:00Z" description:"Campaign creation timestamp"`
	UpdatedAt   string `json:"updatedAt" example:"2024-01-15T15:45:30Z" description:"Last update timestamp"`
	Description string `json:"description,omitempty" example:"Campaign for generating and validating domains" description:"Optional campaign description"`

	// Phases-based architecture fields
	// @Description Current phase of campaign execution
	// @Example "domain_generation"
	CurrentPhase *models.PhaseTypeEnum `json:"currentPhase,omitempty" enums:"domain_generation,dns_validation,http_keyword_validation,analysis"`

	// @Description Status of the current phase
	// @Example "in_progress"
	PhaseStatus *models.PhaseStatusEnum `json:"phaseStatus,omitempty" enums:"not_started,ready,configured,in_progress,paused,completed,failed"`

	// @Description Phase-specific progress information
	Progress PhaseProgressData `json:"progress,omitempty" description:"Phase-specific progress information"`
}

// PhaseProgressData represents progress information for different phase types
type PhaseProgressData struct {
	// Common fields for all phases
	Percentage     float64 `json:"percentage" example:"75.5" description:"Progress percentage (0-100)"`
	ProcessedItems int64   `json:"processedItems" example:"750" description:"Number of items processed"`
	TotalItems     int64   `json:"totalItems" example:"1000" description:"Total items to process"`

	// Phase-specific details
	DomainGeneration *DomainGenerationProgress `json:"domainGeneration,omitempty" description:"Domain generation progress details"`
	DNSValidation    *DNSValidationProgress    `json:"dnsValidation,omitempty" description:"DNS validation progress details"`
	HTTPValidation   *HTTPValidationProgress   `json:"httpValidation,omitempty" description:"HTTP validation progress details"`
	Analysis         *AnalysisProgress         `json:"analysis,omitempty" description:"Analysis progress details"`
}

// DomainGenerationProgress represents domain generation phase progress
type DomainGenerationProgress struct {
	DomainsGenerated int `json:"domainsGenerated" example:"500" description:"Number of domains generated"`
	GenerationRate   int `json:"generationRate" example:"50" description:"Domains generated per minute"`
}

// DNSValidationProgress represents DNS validation phase progress
type DNSValidationProgress struct {
	ValidDomains   int `json:"validDomains" example:"400" description:"Number of domains with valid DNS"`
	InvalidDomains int `json:"invalidDomains" example:"100" description:"Number of domains with invalid DNS"`
	ValidationRate int `json:"validationRate" example:"25" description:"Domains validated per minute"`
}

// HTTPValidationProgress represents HTTP validation phase progress
type HTTPValidationProgress struct {
	MatchingDomains int     `json:"matchingDomains" example:"150" description:"Number of domains matching keywords"`
	ScannedDomains  int     `json:"scannedDomains" example:"300" description:"Number of domains scanned"`
	MatchRate       float64 `json:"matchRate" example:"50.0" description:"Percentage of domains with keyword matches"`
}

// AnalysisProgress represents analysis phase progress
type AnalysisProgress struct {
	CompletedAnalyses int `json:"completedAnalyses" example:"75" description:"Number of completed analyses"`
	ReportsGenerated  int `json:"reportsGenerated" example:"20" description:"Number of reports generated"`
}

// CampaignParamsData represents campaign parameters
type CampaignParamsData struct {
	DomainCount   int    `json:"domainCount,omitempty"`
	KeywordSetID  string `json:"keywordSetId,omitempty"`
	PersonaID     string `json:"personaId,omitempty"`
	ProxyPoolID   string `json:"proxyPoolId,omitempty"`
	Configuration string `json:"configuration,omitempty"`
}

// EnrichedCampaignData represents enriched data for a single campaign
type EnrichedCampaignData struct {
	Campaign            CampaignData               `json:"campaign"`
	Domains             []models.GeneratedDomain   `json:"domains"`             // CRITICAL FIX: Full domain objects with status
	DNSValidatedDomains []string                   `json:"dnsValidatedDomains"` // String array format
	Leads               []models.LeadItem          `json:"leads"`
	HTTPKeywordResults  []models.HTTPKeywordResult `json:"httpKeywordResults"` // FIXED: Proper typed HTTP keyword results
}

// ErrorContext represents error context information with all possible fields
// @Description Error context information for API responses
type ErrorContext struct {
	CampaignID       string `json:"campaign_id,omitempty" example:"550e8400-e29b-41d4-a716-446655440000" description:"Campaign UUID"`
	CampaignCount    int    `json:"campaign_count,omitempty" example:"5" description:"Number of campaigns involved"`
	ProvidedValue    string `json:"provided_value,omitempty" example:"invalid_phase" description:"Value that caused the error"`
	CampaignPhase    string `json:"campaign_phase,omitempty" example:"generation" description:"Current campaign phase when error occurred"`
	PhaseStatus      string `json:"phase_status,omitempty" example:"failed" description:"Phase status when error occurred"`
	ValidationJobID  string `json:"validation_job_id,omitempty" example:"job-uuid-123" description:"Validation job ID if applicable"`
	SourceCampaignID string `json:"source_campaign_id,omitempty" example:"src-campaign-uuid" description:"Source campaign ID for operations"`
	TargetCampaignID string `json:"target_campaign_id,omitempty" example:"target-campaign-uuid" description:"Target campaign ID for operations"`
	DomainCount      int    `json:"domain_count,omitempty" example:"1000" description:"Number of domains involved"`
	ResultCount      int    `json:"result_count,omitempty" example:"250" description:"Number of results processed"`
	ErrorType        string `json:"error_type,omitempty" example:"validation_error" description:"Type of error that occurred"`
	RequiredField    string `json:"required_field,omitempty" example:"currentPhase" description:"Field that is required but missing"`
	Help             string `json:"help,omitempty" example:"Ensure campaign is in valid phase" description:"Help message for resolving the error"`
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

// Direct request type definitions
type DNSValidationAPIRequest struct {
	CampaignID               uuid.UUID   `json:"campaignId" validate:"required"`
	PersonaIDs               []uuid.UUID `json:"personaIds" validate:"omitempty,min=1,dive,uuid"`
	RotationIntervalSeconds  int         `json:"rotationIntervalSeconds,omitempty" validate:"gte=0"`
	ProcessingSpeedPerMinute int         `json:"processingSpeedPerMinute,omitempty" validate:"gte=0"`
	BatchSize                int         `json:"batchSize,omitempty" validate:"gt=0"`
	RetryAttempts            int         `json:"retryAttempts,omitempty" validate:"gte=0"`
	OnlyInvalidDomains       bool        `json:"onlyInvalidDomains" validate:"omitempty"`
}

// Request types for handlers with anonymous structs
type ProxyHealthCheckRequest struct {
	IDs []string `json:"ids"`
}

type AddProxyToPoolRequest struct {
	ProxyID string `json:"proxyId" binding:"required"`
	Weight  *int   `json:"weight,omitempty"`
}

// Bulk API request/response types for B2B scale operations

// BulkEnrichedDataRequest represents a request for bulk enriched campaign data
// @Description Request payload for retrieving enriched data for multiple campaigns
type BulkEnrichedDataRequest struct {
	CampaignIDs []string `json:"campaignIds" binding:"max=1000" validate:"max=1000,dive,uuid" example:"['550e8400-e29b-41d4-a716-446655440000']" description:"List of campaign UUIDs (empty = all campaigns, max 1000 specific campaigns)"`
	Limit       int      `json:"limit,omitempty" validate:"omitempty,min=1,max=1000" example:"100" description:"Maximum number of items per campaign (1-1000)"`
	Offset      int      `json:"offset,omitempty" validate:"omitempty,min=0" example:"0" description:"Number of items to skip per campaign"`
}

// BulkEnrichedDataResponse represents enriched campaign data for multiple campaigns
// @Description Response containing enriched data for multiple campaigns
type BulkEnrichedDataResponse struct {
	Campaigns  map[string]EnrichedCampaignData `json:"campaigns" description:"Map of campaign ID to enriched campaign data"`
	TotalCount int                             `json:"totalCount" example:"25" description:"Total number of successfully processed campaigns"`
}

// BulkDomainsRequest represents a request for bulk domain data
// @Description Request payload for retrieving domain data for multiple campaigns
type BulkDomainsRequest struct {
	CampaignIDs []string `json:"campaignIds" binding:"required,min=1,max=1000" validate:"required,min=1,max=1000,dive,uuid" example:"['550e8400-e29b-41d4-a716-446655440000']" description:"List of campaign UUIDs (1-1000 campaigns)"`
	Limit       int      `json:"limit,omitempty" validate:"omitempty,min=1,max=100000" example:"10000" description:"Maximum number of domains per campaign (1-100,000)"`
	Offset      int      `json:"offset,omitempty" validate:"omitempty,min=0" example:"0" description:"Number of domains to skip per campaign"`
}

// BulkDomainsResponse represents domain data for multiple campaigns
// @Description Response containing domain data for multiple campaigns
type BulkDomainsResponse struct {
	Domains    map[string][]string `json:"domains" description:"Map of campaign ID to list of domains"`
	TotalCount int                 `json:"totalCount" example:"150" description:"Total number of domains across all campaigns"`
}

// BulkLogsRequest represents a request for bulk log data
// @Description Request payload for retrieving log data for multiple campaigns
type BulkLogsRequest struct {
	CampaignIDs []string `json:"campaignIds" binding:"required,min=1,max=50" validate:"required,min=1,max=50,dive,uuid" example:"['550e8400-e29b-41d4-a716-446655440000']" description:"List of campaign UUIDs (1-50 campaigns)"`
	Limit       int      `json:"limit,omitempty" validate:"omitempty,min=1,max=1000" example:"100" description:"Maximum number of log entries per campaign (1-1000)"`
	Offset      int      `json:"offset,omitempty" validate:"omitempty,min=0" example:"0" description:"Number of log entries to skip per campaign"`
}

// BulkLogsResponse represents log data for multiple campaigns
// @Description Response containing log data for multiple campaigns
type BulkLogsResponse struct {
	Logs       map[string][]models.AuditLog `json:"logs" description:"Map of campaign ID to list of log entries"`
	TotalCount int                          `json:"totalCount" example:"500" description:"Total number of log entries across all campaigns"`
}

// BulkLeadsRequest represents a request for bulk lead data
// @Description Request payload for retrieving lead data for multiple campaigns
type BulkLeadsRequest struct {
	CampaignIDs []string `json:"campaignIds" binding:"required,min=1,max=50" validate:"required,min=1,max=50,dive,uuid" example:"['550e8400-e29b-41d4-a716-446655440000']" description:"List of campaign UUIDs (1-50 campaigns)"`
	Limit       int      `json:"limit,omitempty" validate:"omitempty,min=1,max=1000" example:"100" description:"Maximum number of leads per campaign (1-1000)"`
	Offset      int      `json:"offset,omitempty" validate:"omitempty,min=0" example:"0" description:"Number of leads to skip per campaign"`
}

// BulkLeadsResponse represents lead data for multiple campaigns
// @Description Response containing lead data for multiple campaigns
type BulkLeadsResponse struct {
	Leads      map[string][]models.LeadItem `json:"leads" description:"Map of campaign ID to list of leads"`
	TotalCount int                          `json:"totalCount" example:"75" description:"Total number of leads across all campaigns"`
}

// Database API Models for Enterprise Bulk Operations

// BulkDatabaseQueryRequest represents a bulk database query request
// @Description Request payload for executing multiple database queries in a single operation
type BulkDatabaseQueryRequest struct {
	Queries []DatabaseQuery `json:"queries" binding:"required,min=1,max=50" validate:"required,min=1,max=50,dive" description:"List of SQL queries to execute (1-50 queries)"`
	Limit   int             `json:"limit,omitempty" validate:"omitempty,min=1,max=10000" example:"1000" description:"Maximum number of rows per query (1-10000)"`
	Timeout int             `json:"timeout,omitempty" validate:"omitempty,min=1,max=300" example:"30" description:"Query timeout in seconds (1-300)"`
}

// DatabaseQuery represents a single query in a bulk operation
// @Description Individual query with identifier for bulk operations
type DatabaseQuery struct {
	ID  string `json:"id" binding:"required" validate:"required" example:"query_1" description:"Unique identifier for this query"`
	SQL string `json:"sql" binding:"required" validate:"required" example:"SELECT * FROM campaigns LIMIT 10" description:"SQL query to execute"`
}

// BulkDatabaseQueryResponse represents the response from bulk database queries
// @Description Response containing results from multiple database queries
type BulkDatabaseQueryResponse struct {
	Results    map[string]DatabaseQueryResult `json:"results" description:"Map of query ID to query results"`
	TotalCount int                            `json:"totalCount" example:"5" description:"Total number of queries processed"`
}

// DatabaseQueryResult represents the result of a database query
// @Description Response containing query results with metadata
type DatabaseQueryResult struct {
	Columns       []string          `json:"columns" example:"['id','name','status']" description:"Column names from the query result"`
	Rows          [][]DatabaseValue `json:"rows" description:"Query result rows, each row is an array of database values"`
	RowCount      int               `json:"rowCount" example:"25" description:"Number of rows returned"`
	ExecutionTime int64             `json:"executionTime" example:"125" description:"Query execution time in milliseconds"`
	Success       bool              `json:"success" example:"true" description:"Whether the query executed successfully"`
	Error         string            `json:"error,omitempty" example:"" description:"Error message if query failed"`
}

// DatabaseValue represents a value that can be returned from a database query
// @Description A database value that can be string, number, boolean, or null
type DatabaseValue struct {
	StringValue *string  `json:"stringValue,omitempty" description:"String value"`
	IntValue    *int64   `json:"intValue,omitempty" description:"Integer value"`
	FloatValue  *float64 `json:"floatValue,omitempty" description:"Float value"`
	BoolValue   *bool    `json:"boolValue,omitempty" description:"Boolean value"`
	IsNull      bool     `json:"isNull" description:"Whether the value is null"`
	RawValue    string   `json:"rawValue" description:"Raw string representation of the value"`
}

// BulkDatabaseStatsRequest represents a bulk database statistics request
// @Description Request payload for retrieving database statistics for multiple schemas/databases
type BulkDatabaseStatsRequest struct {
	Schemas  []string `json:"schemas,omitempty" validate:"omitempty,max=20,dive,min=1" example:"['public','analytics']" description:"List of database schemas to analyze (max 20)"`
	Tables   []string `json:"tables,omitempty" validate:"omitempty,max=100,dive,min=1" example:"['campaigns','users']" description:"List of specific tables to analyze (max 100)"`
	Detailed bool     `json:"detailed,omitempty" example:"false" description:"Whether to include detailed table-level statistics"`
}

// BulkDatabaseStatsResponse represents the response from bulk database statistics
// @Description Response containing database statistics
type BulkDatabaseStatsResponse struct {
	DatabaseStats DatabaseStats          `json:"databaseStats" description:"Overall database statistics"`
	SchemaStats   map[string]SchemaStats `json:"schemaStats,omitempty" description:"Statistics by schema (if requested)"`
	TableStats    map[string]TableStats  `json:"tableStats,omitempty" description:"Statistics by table (if requested)"`
	TotalCount    int                    `json:"totalCount" example:"3" description:"Total number of analyzed schemas/tables"`
}

// DatabaseStats represents database statistics
// @Description Database statistics and health information
type DatabaseStats struct {
	TotalTables   int    `json:"totalTables" example:"23" description:"Total number of tables in the database"`
	TotalUsers    int    `json:"totalUsers" example:"5" description:"Total number of users in the system"`
	TotalSessions int    `json:"totalSessions" example:"3" description:"Total number of active sessions"`
	DatabaseSize  string `json:"databaseSize" example:"156 MB" description:"Current database size"`
	SchemaVersion string `json:"schemaVersion" example:"v2.1" description:"Current database schema version"`
	Uptime        string `json:"uptime" example:"2d 14h 30m" description:"Database uptime"`
	Version       string `json:"version" example:"PostgreSQL 15.4" description:"Database version"`
	IsHealthy     bool   `json:"isHealthy" example:"true" description:"Whether the database is healthy"`
}

// SchemaStats represents statistics for a database schema
// @Description Statistics for a specific database schema
type SchemaStats struct {
	Name       string `json:"name" example:"public" description:"Schema name"`
	TableCount int    `json:"tableCount" example:"15" description:"Number of tables in the schema"`
	TotalRows  int64  `json:"totalRows" example:"1250000" description:"Total number of rows across all tables"`
	TotalSize  string `json:"totalSize" example:"45 MB" description:"Total size of the schema"`
}

// TableStats represents statistics for a database table
// @Description Statistics for a specific database table
type TableStats struct {
	Name       string `json:"name" example:"campaigns" description:"Table name"`
	Schema     string `json:"schema" example:"public" description:"Schema name"`
	RowCount   int64  `json:"rowCount" example:"125000" description:"Number of rows in the table"`
	Size       string `json:"size" example:"12 MB" description:"Table size"`
	IndexCount int    `json:"indexCount" example:"5" description:"Number of indexes on the table"`
}

// === STANDALONE SERVICES ARCHITECTURE RESPONSE MODELS ===

// PhaseConfigureRequest represents a request to configure a specific campaign phase
// @Description Request payload for configuring campaign phase parameters
type PhaseConfigureRequest struct {
	PhaseType string      `json:"phaseType" validate:"required,oneof=dns_validation http_keyword_validation analysis" example:"dns_validation" description:"Type of phase to configure"`
	Config    PhaseConfig `json:"config" validate:"required" description:"Phase-specific configuration object"`
}

// PhaseConfig is a union type for all possible phase configurations
// @Description Phase configuration that can be DNS validation, HTTP validation, or analysis configuration
type PhaseConfig struct {
	// Exactly one of these fields should be populated based on PhaseType
	DNSValidation  *DNSValidationConfig  `json:"dnsValidation,omitempty" description:"DNS validation configuration (when phaseType=dns_validation)"`
	HTTPValidation *HTTPValidationConfig `json:"httpValidation,omitempty" description:"HTTP validation configuration (when phaseType=http_keyword_validation)"`
	Analysis       *AnalysisConfig       `json:"analysis,omitempty" description:"Analysis configuration (when phaseType=analysis)"`
}

// DNSValidationConfig represents DNS validation phase configuration
// @Description Configuration for DNS validation phase - all technical parameters derived from persona ConfigDetails
type DNSValidationConfig struct {
	PersonaIDs []string `json:"personaIds" validate:"required,min=1" example:"[\"550e8400-e29b-41d4-a716-446655440000\"]" description:"Array of persona IDs to use for DNS validation"`
	Name       *string  `json:"name,omitempty" example:"My DNS Campaign" description:"Optional name for the campaign"`
}

// HTTPValidationConfig represents HTTP validation phase configuration
// @Description Configuration for HTTP keyword validation phase - all technical parameters derived from persona ConfigDetails
type HTTPValidationConfig struct {
	PersonaIDs    []string `json:"personaIds" validate:"required,min=1" example:"[\"550e8400-e29b-41d4-a716-446655440000\"]" description:"Array of persona IDs to use for HTTP validation"`
	KeywordSetIDs []string `json:"keywordSetIds,omitempty" example:"[\"set1\", \"set2\"]" description:"Array of predefined keyword set IDs"`
	AdHocKeywords []string `json:"adHocKeywords,omitempty" example:"[\"custom1\", \"custom2\"]" description:"Array of custom keywords to search for"`
	Name          *string  `json:"name,omitempty" example:"My HTTP Campaign" description:"Optional name for the campaign"`
}

// AnalysisConfig represents analysis phase configuration
// @Description Configuration for analysis phase
type AnalysisConfig struct {
	AnalysisType       string   `json:"analysisType" validate:"required,oneof=basic comprehensive custom" example:"comprehensive" description:"Type of analysis to perform"`
	IncludeScreenshots bool     `json:"includeScreenshots,omitempty" example:"true" description:"Whether to capture screenshots during analysis"`
	GenerateReport     bool     `json:"generateReport,omitempty" example:"true" description:"Whether to generate a final analysis report"`
	CustomRules        []string `json:"customRules,omitempty" example:"[\"rule1\", \"rule2\"]" description:"Array of custom analysis rules to apply"`
}

// PhaseStartRequest represents a request to start a configured campaign phase
// @Description Request payload for starting a campaign phase
type PhaseStartRequest struct {
	PhaseType string `json:"phaseType" validate:"required,oneof=domain_generation dns_validation http_keyword_validation analysis" example:"dns_validation" description:"Type of phase to start"`
}

// Note: LeadGenerationCampaignResponse, PhaseProgressResponse, and CampaignProgressResponse
// are defined above with proper enum types for better type safety

// ======================================================================
// PHASE-CENTRIC CAMPAIGN CONFIGURATION REQUESTS
// ======================================================================

// Removed duplicate type definitions - using the versions defined earlier in the file

// ======================================================================
// BULK OPERATIONS RESPONSE MODELS - Enterprise-scale API responses
// ======================================================================

// BulkOperationStatusResponse represents the current status of a bulk operation
type BulkOperationStatusResponse struct {
	OperationID     string                `json:"operationId"`
	Type            string                `json:"type"`                  // "domain_generation", "dns_validation", "http_validation", "analytics"
	Status          string                `json:"status"`                // "queued", "running", "completed", "failed", "cancelled"
	Progress        float64               `json:"progress"`              // 0.0 to 100.0
	StartedAt       string                `json:"startedAt"`             // ISO 8601
	CompletedAt     *string               `json:"completedAt,omitempty"` // ISO 8601
	EstimatedTime   *int64                `json:"estimatedTimeMs,omitempty"`
	ProcessingTime  int64                 `json:"processingTimeMs"`
	TotalOperations int                   `json:"totalOperations"`
	CompletedOps    int                   `json:"completedOps"`
	FailedOps       int                   `json:"failedOps"`
	Results         *BulkOperationResults `json:"results,omitempty" description:"Operation-specific results"`
	ErrorMessage    *string               `json:"errorMessage,omitempty"`
}

// BulkOperationResults represents typed results for different bulk operations
// @Description Operation results that vary by operation type
type BulkOperationResults struct {
	// Domain generation results
	DomainGeneration *DomainGenerationResults `json:"domainGeneration,omitempty" description:"Domain generation operation results"`

	// DNS validation results
	DNSValidation *DNSValidationResults `json:"dnsValidation,omitempty" description:"DNS validation operation results"`

	// HTTP validation results
	HTTPValidation *HTTPValidationResults `json:"httpValidation,omitempty" description:"HTTP validation operation results"`

	// Analytics results
	Analytics *AnalyticsResults `json:"analytics,omitempty" description:"Analytics operation results"`
}

// DomainGenerationResults represents domain generation operation results
type DomainGenerationResults struct {
	GeneratedDomains []string `json:"generatedDomains" description:"List of generated domains"`
	TotalGenerated   int      `json:"totalGenerated" description:"Total number of domains generated"`
	UniqueCount      int      `json:"uniqueCount" description:"Number of unique domains generated"`
}

// DNSValidationResults represents DNS validation operation results
type DNSValidationResults struct {
	ValidDomains   []string `json:"validDomains" description:"Domains with valid DNS resolution"`
	InvalidDomains []string `json:"invalidDomains" description:"Domains with invalid DNS"`
	TotalValidated int      `json:"totalValidated" description:"Total domains validated"`
	ValidationRate float64  `json:"validationRate" description:"Percentage of valid domains"`
}

// HTTPValidationResults represents HTTP validation operation results
type HTTPValidationResults struct {
	MatchingDomains []string                   `json:"matchingDomains" description:"Domains matching search criteria"`
	KeywordMatches  []models.HTTPKeywordResult `json:"keywordMatches" description:"Detailed keyword match results"`
	TotalScanned    int                        `json:"totalScanned" description:"Total domains scanned"`
	MatchPercentage float64                    `json:"matchPercentage" description:"Percentage of domains with matches"`
}

// AnalyticsResults represents analytics operation results
type AnalyticsResults struct {
	ProcessedCampaigns int                        `json:"processedCampaigns" description:"Number of campaigns analyzed"`
	AnalyticsData      []models.CampaignAnalytics `json:"analyticsData" description:"Campaign analytics data"`
	AggregatedMetrics  models.AggregatedAnalytics `json:"aggregatedMetrics" description:"Aggregated analytics across campaigns"`
}

// BulkResourceStatusResponse represents current resource utilization
type BulkResourceStatusResponse struct {
	CPUUsage          float64 `json:"cpuUsage"`     // Percentage 0-100
	MemoryUsage       float64 `json:"memoryUsage"`  // Percentage 0-100
	NetworkUsage      float64 `json:"networkUsage"` // Percentage 0-100
	ActiveOperations  int     `json:"activeOperations"`
	QueuedOperations  int     `json:"queuedOperations"`
	AvailableProxies  int     `json:"availableProxies"`
	AvailablePersonas int     `json:"availablePersonas"`
	MaxConcurrent     int     `json:"maxConcurrent"`
	ResourceLimits    struct {
		MaxCPU     float64 `json:"maxCpu"`
		MaxMemory  float64 `json:"maxMemory"`
		MaxNetwork float64 `json:"maxNetwork"`
	} `json:"resourceLimits"`
}

// BulkResourceAllocationResponse represents resource allocation results
type BulkResourceAllocationResponse struct {
	AllocationID      string  `json:"allocationId"`
	Status            string  `json:"status"` // "allocated", "queued", "failed"
	AllocatedCPU      int     `json:"allocatedCpu"`
	AllocatedMemory   int     `json:"allocatedMemory"`
	AllocatedProxies  int     `json:"allocatedProxies"`
	AllocatedPersonas int     `json:"allocatedPersonas"`
	ScheduledTime     *string `json:"scheduledTime,omitempty"` // ISO 8601
	Priority          string  `json:"priority"`
	EstimatedDuration int64   `json:"estimatedDurationMs"`
}

// OperationCancellationResponse represents bulk operation cancellation results
type OperationCancellationResponse struct {
	OperationID      string `json:"operationId"`
	Status           string `json:"status"` // "cancelled", "cancelling", "cannot_cancel"
	Message          string `json:"message"`
	ResourcesFreed   bool   `json:"resourcesFreed"`
	PartialResults   bool   `json:"partialResults"`
	CancellationTime string `json:"cancellationTime"` // ISO 8601
}
