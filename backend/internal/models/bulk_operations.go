package models

import (
	"github.com/google/uuid"
)

// ===============================================================================
// BULK DOMAIN GENERATION OPERATIONS - Enterprise domain generation at scale
// ===============================================================================

// BulkDomainGenerationRequest - Generate domains across multiple campaigns
type BulkDomainGenerationRequest struct {
	Operations []DomainGenerationOperation `json:"operations" binding:"required,min=1,max=100" validate:"required,min=1,max=100,dive"`
	BatchSize  int                         `json:"batchSize,omitempty" validate:"omitempty,gt=0,lte=10000"`
	Parallel   bool                        `json:"parallel" validate:"omitempty"`
}

// DomainGenerationOperation - Single campaign generation operation
type DomainGenerationOperation struct {
	CampaignID uuid.UUID   `json:"campaignId" validate:"required,uuid"`
	Config     interface{} `json:"config" validate:"required"` // DomainGenerationPhaseConfig
	StartFrom  int64       `json:"startFrom,omitempty" validate:"omitempty,gte=0"`
	MaxDomains int         `json:"maxDomains,omitempty" validate:"omitempty,gt=0,lte=1000000"`
}

// BulkDomainGenerationResponse - Results from bulk generation
type BulkDomainGenerationResponse struct {
	Operations     map[string]DomainGenerationResult `json:"operations"`
	TotalGenerated int64                             `json:"totalGenerated"`
	TotalRequested int64                             `json:"totalRequested"`
	SuccessfulOps  int                               `json:"successfulOps"`
	FailedOps      int                               `json:"failedOps"`
	ProcessingTime int64                             `json:"processingTimeMs"`
	OperationID    string                            `json:"operationId"`
	Status         string                            `json:"status"` // "running", "completed", "failed", "partial"
}

// DomainGenerationResult - Result for single campaign
type DomainGenerationResult struct {
	CampaignID       uuid.UUID `json:"campaignId"`
	DomainsGenerated int       `json:"domainsGenerated"`
	StartOffset      int64     `json:"startOffset"`
	EndOffset        int64     `json:"endOffset"`
	Success          bool      `json:"success"`
	Error            string    `json:"error,omitempty"`
	Duration         int64     `json:"durationMs"`
}

// ===============================================================================
// BULK VALIDATION OPERATIONS - Stealth-aware validation at enterprise scale
// ===============================================================================

// BulkDNSValidationRequest - DNS validation across campaigns/domains
type BulkDNSValidationRequest struct {
	Operations []DNSValidationOperation `json:"operations" binding:"required,min=1,max=50" validate:"required,min=1,max=50,dive"`
	BatchSize  int                      `json:"batchSize,omitempty" validate:"omitempty,gt=0,lte=1000"`
	Stealth    *StealthValidationConfig `json:"stealth,omitempty"`
}

// DNSValidationOperation - Single DNS validation operation
type DNSValidationOperation struct {
	CampaignID    uuid.UUID     `json:"campaignId" validate:"required,uuid"`
	PersonaIDs    []uuid.UUID   `json:"personaIds" validate:"required,min=1,dive,uuid"`
	DomainFilter  *DomainFilter `json:"domainFilter,omitempty"`
	MaxDomains    int           `json:"maxDomains,omitempty" validate:"omitempty,gt=0,lte=100000"`
	RetryAttempts int           `json:"retryAttempts,omitempty" validate:"omitempty,gte=0,lte=5"`
}

// BulkHTTPValidationRequest - HTTP validation with stealth integration
type BulkHTTPValidationRequest struct {
	Operations []HTTPValidationOperation `json:"operations" binding:"required,min=1,max=25" validate:"required,min=1,max=25,dive"`
	BatchSize  int                       `json:"batchSize,omitempty" validate:"omitempty,gt=0,lte=500"`
	Stealth    *StealthValidationConfig  `json:"stealth,omitempty"`
	Concurrent int                       `json:"concurrent,omitempty" validate:"omitempty,gt=0,lte=50"`
}

// HTTPValidationOperation - Single HTTP validation operation
type HTTPValidationOperation struct {
	CampaignID    uuid.UUID     `json:"campaignId" validate:"required,uuid"`
	PersonaIDs    []uuid.UUID   `json:"personaIds" validate:"required,min=1,dive,uuid"`
	Keywords      []string      `json:"keywords,omitempty" validate:"omitempty,max=1000"`
	KeywordSetIDs []uuid.UUID   `json:"keywordSetIds,omitempty" validate:"omitempty,max=100,dive,uuid"`
	DomainFilter  *DomainFilter `json:"domainFilter,omitempty"`
	MaxDomains    int           `json:"maxDomains,omitempty" validate:"omitempty,gt=0,lte=50000"`
}

// StealthValidationConfig - Enterprise stealth mode configuration for detection avoidance
type StealthValidationConfig struct {
	Enabled             bool    `json:"enabled"`
	RandomizationLevel  string  `json:"randomizationLevel" validate:"omitempty,oneof=low medium high extreme"`
	TemporalJitter      bool    `json:"temporalJitter"`
	PatternAvoidance    bool    `json:"patternAvoidance"`
	RequestSpacing      *int    `json:"requestSpacing,omitempty" validate:"omitempty,gte=100,lte=30000"` // milliseconds
	UserAgentRotation   bool    `json:"userAgentRotation"`
	ProxyRotationForced bool    `json:"proxyRotationForced"`
	DetectionThreshold  float64 `json:"detectionThreshold,omitempty" validate:"omitempty,gte=0.1,lte=1.0"`

	// Enterprise-grade enhancements for Day 3
	AdvancedPolicy    *AdvancedStealthPolicy   `json:"advancedPolicy,omitempty"`
	BehavioralMimicry *BehavioralMimicryConfig `json:"behavioralMimicry,omitempty"`
	ProxyStrategy     *EnterpriseProxyStrategy `json:"proxyStrategy,omitempty"`
	DetectionEvasion  *DetectionEvasionConfig  `json:"detectionEvasion,omitempty"`
}

// AdvancedStealthPolicy - Enterprise-grade stealth policies
type AdvancedStealthPolicy struct {
	Profile                string   `json:"profile" validate:"omitempty,oneof=conservative moderate aggressive extreme_stealth"`
	MaxConcurrentRequests  int      `json:"maxConcurrentRequests" validate:"omitempty,gte=1,lte=50"`
	RequestBurstLimit      int      `json:"requestBurstLimit" validate:"omitempty,gte=1,lte=100"`
	CooldownPeriods        []int    `json:"cooldownPeriods,omitempty" validate:"omitempty,max=10"` // seconds
	AdaptiveThrottling     bool     `json:"adaptiveThrottling"`
	GeographicDistribution bool     `json:"geographicDistribution"`
	TimeZoneSimulation     bool     `json:"timeZoneSimulation"`
	HumanBehaviorPatterns  []string `json:"humanBehaviorPatterns,omitempty" validate:"omitempty,max=20"`
}

// BehavioralMimicryConfig - Human-like behavior simulation
type BehavioralMimicryConfig struct {
	Enabled             bool  `json:"enabled"`
	BrowserBehavior     bool  `json:"browserBehavior"`                                                // Simulate real browser behavior
	SearchPatterns      bool  `json:"searchPatterns"`                                                 // Mimic search engine patterns
	SocialMediaPatterns bool  `json:"socialMediaPatterns"`                                            // Mimic social media crawling
	RandomMouseMovement bool  `json:"randomMouseMovement"`                                            // Simulate user interactions
	TypingDelays        bool  `json:"typingDelays"`                                                   // Human typing speed simulation
	ScrollingBehavior   bool  `json:"scrollingBehavior"`                                              // Natural scrolling patterns
	SessionDuration     *int  `json:"sessionDuration,omitempty" validate:"omitempty,gte=60,lte=3600"` // seconds
	IdlePeriods         []int `json:"idlePeriods,omitempty" validate:"omitempty,max=10"`              // seconds
}

// EnterpriseProxyStrategy - Advanced proxy management
type EnterpriseProxyStrategy struct {
	Strategy              string   `json:"strategy" validate:"omitempty,oneof=round_robin weighted_random geographic intelligent_failover"`
	ProxyPools            []string `json:"proxyPools,omitempty" validate:"omitempty,max=10"`
	HealthCheckInterval   int      `json:"healthCheckInterval" validate:"omitempty,gte=30,lte=3600"` // seconds
	FailoverThreshold     float64  `json:"failoverThreshold" validate:"omitempty,gte=0.1,lte=1.0"`
	ProxyRotationRate     string   `json:"proxyRotationRate" validate:"omitempty,oneof=per_request per_domain per_batch adaptive"`
	GeoTargeting          bool     `json:"geoTargeting"`
	ProxyQualityFiltering bool     `json:"proxyQualityFiltering"`
	BackupProxyPools      []string `json:"backupProxyPools,omitempty" validate:"omitempty,max=5"`
}

// DetectionEvasionConfig - Advanced detection avoidance techniques
type DetectionEvasionConfig struct {
	Enabled                   bool     `json:"enabled"`
	FingerprintRandomization  bool     `json:"fingerprintRandomization"`
	TLSFingerprintRotation    bool     `json:"tlsFingerprintRotation"`
	HTTPHeaderRandomization   bool     `json:"httpHeaderRandomization"`
	RequestOrderRandomization bool     `json:"requestOrderRandomization"`
	PayloadObfuscation        bool     `json:"payloadObfuscation"`
	TimingAttackPrevention    bool     `json:"timingAttackPrevention"`
	RateLimitEvasion          bool     `json:"rateLimitEvasion"`
	HoneypotDetection         bool     `json:"honeypotDetection"`
	CAPTCHABypass             bool     `json:"captchaBypass"`
	AntiAnalysisFeatures      []string `json:"antiAnalysisFeatures,omitempty" validate:"omitempty,max=15"`
}

// DomainFilter - Filter domains for bulk operations
type DomainFilter struct {
	Status      []string `json:"status,omitempty" validate:"omitempty,max=10"` // ["generated", "dns_validated", "http_validated"]
	TLDs        []string `json:"tlds,omitempty" validate:"omitempty,max=100"`  // [".com", ".net", ".org"]
	MinLength   *int     `json:"minLength,omitempty" validate:"omitempty,gte=1,lte=253"`
	MaxLength   *int     `json:"maxLength,omitempty" validate:"omitempty,gte=1,lte=253"`
	Pattern     string   `json:"pattern,omitempty"`                                    // Regex pattern
	ExcludeList []string `json:"excludeList,omitempty" validate:"omitempty,max=10000"` // Domains to exclude
	OnlyFailed  bool     `json:"onlyFailed"`                                           // Only retry failed domains
}

// BulkValidationResponse - Universal validation response
type BulkValidationResponse struct {
	Operations      map[string]ValidationOperationResult `json:"operations"`
	TotalProcessed  int64                                `json:"totalProcessed"`
	TotalSuccessful int64                                `json:"totalSuccessful"`
	TotalFailed     int64                                `json:"totalFailed"`
	SuccessfulOps   int                                  `json:"successfulOps"`
	FailedOps       int                                  `json:"failedOps"`
	ProcessingTime  int64                                `json:"processingTimeMs"`
	OperationID     string                               `json:"operationId"`
	Status          string                               `json:"status"`
	StealthMetrics  *StealthOperationMetrics             `json:"stealthMetrics,omitempty"`
}

// ValidationOperationResult - Result for single validation operation
type ValidationOperationResult struct {
	CampaignID        uuid.UUID                    `json:"campaignId"`
	ValidationType    string                       `json:"validationType"` // "dns", "http"
	DomainsProcessed  int                          `json:"domainsProcessed"`
	DomainsSuccessful int                          `json:"domainsSuccessful"`
	DomainsFailed     int                          `json:"domainsFailed"`
	Success           bool                         `json:"success"`
	Error             string                       `json:"error,omitempty"`
	Duration          int64                        `json:"durationMs"`
	Results           []BulkValidationDomainResult `json:"results,omitempty"`
}

// BulkValidationDomainResult - Individual domain validation result
type BulkValidationDomainResult struct {
	DomainName     string                 `json:"domainName"`
	Status         string                 `json:"status"` // "success", "failed", "timeout", "error"
	ResponseTime   int64                  `json:"responseTimeMs"`
	StatusCode     *int                   `json:"statusCode,omitempty"`
	Error          string                 `json:"error,omitempty"`
	DNSResolved    *bool                  `json:"dnsResolved,omitempty"`
	HTTPAccessible *bool                  `json:"httpAccessible,omitempty"`
	Keywords       []string               `json:"keywords,omitempty"`
	Content        string                 `json:"content,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}

// StealthOperationMetrics - Stealth detection avoidance metrics
type StealthOperationMetrics struct {
	RandomizationEvents  int     `json:"randomizationEvents"`
	TemporalJitterEvents int     `json:"temporalJitterEvents"`
	PatternBreaks        int     `json:"patternBreaks"`
	ProxyRotations       int     `json:"proxyRotations"`
	UserAgentRotations   int     `json:"userAgentRotations"`
	DetectionScore       float64 `json:"detectionScore"`    // 0.0 = undetectable, 1.0 = highly detectable
	AvgRequestSpacing    int64   `json:"avgRequestSpacing"` // milliseconds
}

// ===============================================================================
// BULK CAMPAIGN OPERATIONS - Campaign lifecycle management at scale
// ===============================================================================

// BulkCampaignOperationRequest - Manage multiple campaigns
type BulkCampaignOperationRequest struct {
	Operation   string                 `json:"operation" binding:"required" validate:"required,oneof=start stop pause resume delete configure"`
	CampaignIDs []uuid.UUID            `json:"campaignIds" binding:"required,min=1,max=100" validate:"required,min=1,max=100,dive,uuid"`
	Config      map[string]interface{} `json:"config,omitempty"`
	Force       bool                   `json:"force"` // Force operation even if campaign state conflicts
}

// BulkCampaignOperationResponse - Results from bulk campaign operations
type BulkCampaignOperationResponse struct {
	Operation      string                             `json:"operation"`
	Results        map[string]CampaignOperationResult `json:"results"`
	SuccessfulOps  int                                `json:"successfulOps"`
	FailedOps      int                                `json:"failedOps"`
	ProcessingTime int64                              `json:"processingTimeMs"`
	OperationID    string                             `json:"operationId"`
}

// CampaignOperationResult - Result for single campaign operation
type CampaignOperationResult struct {
	CampaignID    uuid.UUID `json:"campaignId"`
	PreviousState string    `json:"previousState"`
	NewState      string    `json:"newState"`
	Success       bool      `json:"success"`
	Error         string    `json:"error,omitempty"`
	Duration      int64     `json:"durationMs"`
}

// ===============================================================================
// BULK ANALYTICS AND REPORTING - Enterprise intelligence at scale
// ===============================================================================

// BulkAnalyticsRequest - Analytics across campaigns
type BulkAnalyticsRequest struct {
	CampaignIDs []uuid.UUID            `json:"campaignIds" binding:"max=1000" validate:"max=1000,dive,uuid"`
	TimeRange   *TimeRangeFilter       `json:"timeRange,omitempty"`
	Metrics     []string               `json:"metrics" validate:"required,min=1"` // ["domains", "success_rate", "performance", "costs"]
	Granularity string                 `json:"granularity" validate:"omitempty,oneof=hour day week month"`
	GroupBy     []string               `json:"groupBy,omitempty"` // ["campaign", "phase", "tld", "persona"]
	Filters     map[string]interface{} `json:"filters,omitempty"`
}

// TimeRangeFilter - Time range for analytics
type TimeRangeFilter struct {
	StartTime string `json:"startTime" validate:"required"` // ISO 8601
	EndTime   string `json:"endTime" validate:"required"`   // ISO 8601
	Timezone  string `json:"timezone,omitempty"`            // "UTC", "America/New_York", etc.
}

// BulkAnalyticsResponse - Analytics results
type BulkAnalyticsResponse struct {
	CampaignMetrics map[string]CampaignAnalytics `json:"campaignMetrics"`
	AggregatedData  AggregatedAnalytics          `json:"aggregatedData"`
	ProcessingTime  int64                        `json:"processingTimeMs"`
	DataPoints      int                          `json:"dataPoints"`
	Metadata        *BulkMetadata                `json:"metadata,omitempty"`
}

// CampaignAnalytics - Analytics for single campaign
type CampaignAnalytics struct {
	CampaignID       uuid.UUID               `json:"campaignId"`
	DomainsGenerated int64                   `json:"domainsGenerated"`
	DomainsValidated int64                   `json:"domainsValidated"`
	LeadsGenerated   int64                   `json:"leadsGenerated"`
	SuccessRate      float64                 `json:"successRate"`
	AvgResponseTime  int64                   `json:"avgResponseTimeMs"`
	CostPerLead      float64                 `json:"costPerLead"`
	PhaseBreakdown   map[string]PhaseMetrics `json:"phaseBreakdown"`
	TimeSeriesData   []TimeSeriesPoint       `json:"timeSeriesData,omitempty"`
}

// PhaseMetrics - Metrics for campaign phase
type PhaseMetrics struct {
	Phase          string  `json:"phase"`
	ItemsProcessed int64   `json:"itemsProcessed"`
	SuccessCount   int64   `json:"successCount"`
	FailureCount   int64   `json:"failureCount"`
	SuccessRate    float64 `json:"successRate"`
	AvgDuration    int64   `json:"avgDurationMs"`
	TotalDuration  int64   `json:"totalDurationMs"`
}

// TimeSeriesPoint - Data point in time series
type TimeSeriesPoint struct {
	Timestamp string                 `json:"timestamp"`
	Values    map[string]interface{} `json:"values"`
}

// AggregatedAnalytics - Cross-campaign aggregated data
type AggregatedAnalytics struct {
	TotalCampaigns      int                        `json:"totalCampaigns"`
	TotalDomains        int64                      `json:"totalDomains"`
	TotalLeads          int64                      `json:"totalLeads"`
	OverallSuccessRate  float64                    `json:"overallSuccessRate"`
	TopPerformingTLDs   []TLDPerformance           `json:"topPerformingTlds"`
	TopPerformingPhases []PhasePerformance         `json:"topPerformingPhases"`
	ResourceUtilization ResourceUtilizationMetrics `json:"resourceUtilization"`
}

// TLDPerformance - Performance metrics by TLD
type TLDPerformance struct {
	TLD         string  `json:"tld"`
	Domains     int64   `json:"domains"`
	Leads       int64   `json:"leads"`
	SuccessRate float64 `json:"successRate"`
	Rank        int     `json:"rank"`
}

// PhasePerformance - Performance metrics by phase
type PhasePerformance struct {
	Phase       string  `json:"phase"`
	Campaigns   int     `json:"campaigns"`
	Items       int64   `json:"items"`
	SuccessRate float64 `json:"successRate"`
	AvgDuration int64   `json:"avgDurationMs"`
}

// ResourceUtilizationMetrics - System resource usage metrics
type ResourceUtilizationMetrics struct {
	CPUUsage        float64 `json:"cpuUsage"`        // Percentage
	MemoryUsage     float64 `json:"memoryUsage"`     // Percentage
	NetworkIO       int64   `json:"networkIO"`       // Bytes
	DatabaseQueries int64   `json:"databaseQueries"` // Count
	ProxyRequests   int64   `json:"proxyRequests"`   // Count
}

// ===============================================================================
// BULK OPERATION STATUS AND MONITORING - Real-time operation tracking
// ===============================================================================

// BulkOperationStatus - Status of long-running bulk operation
type BulkOperationStatus struct {
	OperationID string                 `json:"operationId"`
	Type        string                 `json:"type"`   // "domain_generation", "dns_validation", "http_validation", "analytics"
	Status      string                 `json:"status"` // "queued", "running", "completed", "failed", "cancelled"
	Progress    OperationProgress      `json:"progress"`
	StartTime   string                 `json:"startTime"`
	EndTime     string                 `json:"endTime,omitempty"`
	Duration    int64                  `json:"durationMs,omitempty"`
	Error       string                 `json:"error,omitempty"`
	Results     map[string]interface{} `json:"results,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// OperationProgress - Progress tracking for bulk operations
type OperationProgress struct {
	TotalItems      int64   `json:"totalItems"`
	ProcessedItems  int64   `json:"processedItems"`
	SuccessfulItems int64   `json:"successfulItems"`
	FailedItems     int64   `json:"failedItems"`
	Percentage      float64 `json:"percentage"`
	EstimatedTime   int64   `json:"estimatedTimeMs,omitempty"`
	CurrentPhase    string  `json:"currentPhase,omitempty"`
	RemainingItems  int64   `json:"remainingItems"`
}

// BulkOperationListRequest - List bulk operations
type BulkOperationListRequest struct {
	Status    []string   `json:"status,omitempty" validate:"omitempty,max=10"`
	Type      []string   `json:"type,omitempty" validate:"omitempty,max=10"`
	UserID    *uuid.UUID `json:"userId,omitempty" validate:"omitempty,uuid"`
	StartTime string     `json:"startTime,omitempty"`
	EndTime   string     `json:"endTime,omitempty"`
	Limit     int        `json:"limit,omitempty" validate:"omitempty,gt=0,lte=1000"`
	Offset    int        `json:"offset,omitempty" validate:"omitempty,gte=0"`
}

// BulkOperationListResponse - List of bulk operations
type BulkOperationListResponse struct {
	Operations []BulkOperationStatus `json:"operations"`
	TotalCount int                   `json:"totalCount"`
	Metadata   *BulkMetadata         `json:"metadata,omitempty"`
}

// ===============================================================================
// ENTERPRISE SCALE RESOURCE MANAGEMENT
// ===============================================================================

// BulkResourceRequest - Request bulk resource allocation
type BulkResourceRequest struct {
	Operations     []ResourceOperation `json:"operations" binding:"required,min=1,max=50" validate:"required,min=1,max=50,dive"`
	Priority       string              `json:"priority" validate:"omitempty,oneof=low normal high critical"`
	ScheduledTime  string              `json:"scheduledTime,omitempty"`
	MaxDuration    int64               `json:"maxDuration,omitempty" validate:"omitempty,gt=0"`
	ResourceLimits *ResourceLimits     `json:"resourceLimits,omitempty"`
}

// ResourceOperation - Single resource operation
type ResourceOperation struct {
	Type       string                 `json:"type" validate:"required,oneof=domain_generation dns_validation http_validation analytics"`
	CampaignID uuid.UUID              `json:"campaignId" validate:"required,uuid"`
	Config     map[string]interface{} `json:"config"`
	Priority   string                 `json:"priority" validate:"omitempty,oneof=low normal high critical"`
	Resources  *RequiredResources     `json:"resources,omitempty"`
}

// RequiredResources - Resources required for operation
type RequiredResources struct {
	CPUCores    int `json:"cpuCores,omitempty" validate:"omitempty,gt=0,lte=64"`
	MemoryMB    int `json:"memoryMB,omitempty" validate:"omitempty,gt=0,lte=65536"`
	StorageMB   int `json:"storageMB,omitempty" validate:"omitempty,gt=0"`
	NetworkMbps int `json:"networkMbps,omitempty" validate:"omitempty,gt=0,lte=10000"`
	Proxies     int `json:"proxies,omitempty" validate:"omitempty,gte=0,lte=1000"`
	Personas    int `json:"personas,omitempty" validate:"omitempty,gt=0,lte=100"`
}

// ResourceLimits - System-wide resource limits
type ResourceLimits struct {
	MaxCPUPercent    float64 `json:"maxCpuPercent" validate:"omitempty,gt=0,lte=100"`
	MaxMemoryPercent float64 `json:"maxMemoryPercent" validate:"omitempty,gt=0,lte=100"`
	MaxDiskIO        int64   `json:"maxDiskIO,omitempty" validate:"omitempty,gt=0"`
	MaxNetworkIO     int64   `json:"maxNetworkIO,omitempty" validate:"omitempty,gt=0"`
	MaxConcurrent    int     `json:"maxConcurrent" validate:"omitempty,gt=0,lte=1000"`
}

// BulkResourceResponse - Response from resource allocation
type BulkResourceResponse struct {
	Operations     map[string]ResourceAllocationResult `json:"operations"`
	TotalAllocated ResourceUtilizationMetrics          `json:"totalAllocated"`
	SuccessfulOps  int                                 `json:"successfulOps"`
	FailedOps      int                                 `json:"failedOps"`
	AllocationID   string                              `json:"allocationId"`
	ExpirationTime string                              `json:"expirationTime"`
	ProcessingTime int64                               `json:"processingTimeMs"`
}

// ResourceAllocationResult - Result for single resource allocation
type ResourceAllocationResult struct {
	CampaignID         uuid.UUID         `json:"campaignId"`
	Type               string            `json:"type"`
	AllocatedResources RequiredResources `json:"allocatedResources"`
	Success            bool              `json:"success"`
	Error              string            `json:"error,omitempty"`
	AllocationTime     string            `json:"allocationTime"`
	ExpirationTime     string            `json:"expirationTime"`
}

// BulkMetadata - Metadata for bulk operations
type BulkMetadata struct {
	RequestID     string                 `json:"requestId"`
	UserID        *uuid.UUID             `json:"userId,omitempty"`
	Timestamp     string                 `json:"timestamp"`
	Version       string                 `json:"version"`
	ExecutionNode string                 `json:"executionNode,omitempty"`
	Debug         map[string]interface{} `json:"debug,omitempty"`
}
