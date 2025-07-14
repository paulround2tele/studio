// File: backend/internal/models/models.go
package models

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// CampaignTypeEnum defines the type of campaign
// @enum string
// @example domain_generation
type CampaignTypeEnum string

const (
	CampaignTypeDomainGeneration      CampaignTypeEnum = "domain_generation"      // @enum domain_generation
	CampaignTypeDNSValidation         CampaignTypeEnum = "dns_validation"         // @enum dns_validation
	CampaignTypeHTTPKeywordValidation CampaignTypeEnum = "http_keyword_validation" // @enum http_keyword_validation
)

// CampaignPhaseEnum defines the current phase of a campaign
// @enum string
// @example setup
type CampaignPhaseEnum string

const (
	CampaignPhaseSetup          CampaignPhaseEnum = "setup"          // @enum setup
	CampaignPhaseGeneration     CampaignPhaseEnum = "generation"     // @enum generation
	CampaignPhaseDNSValidation  CampaignPhaseEnum = "dns_validation" // @enum dns_validation
	CampaignPhaseHTTPValidation CampaignPhaseEnum = "http_validation" // @enum http_validation
	CampaignPhaseAnalysis       CampaignPhaseEnum = "analysis"       // @enum analysis
	CampaignPhaseCleanup        CampaignPhaseEnum = "cleanup"        // @enum cleanup
)

// CampaignPhaseStatusEnum defines the status of a campaign phase
// @enum string
// @example not_started
type CampaignPhaseStatusEnum string

const (
	CampaignPhaseStatusPending    CampaignPhaseStatusEnum = "not_started"  // @enum not_started
	CampaignPhaseStatusInProgress CampaignPhaseStatusEnum = "in_progress"  // @enum in_progress
	CampaignPhaseStatusPaused     CampaignPhaseStatusEnum = "paused"       // @enum paused
	CampaignPhaseStatusSucceeded  CampaignPhaseStatusEnum = "completed"    // @enum completed
	CampaignPhaseStatusFailed     CampaignPhaseStatusEnum = "failed"       // @enum failed
)

// CampaignStatusEnum defines the status of a campaign
// @enum string
// @example pending
type CampaignStatusEnum string

const (
	CampaignStatusPending   CampaignStatusEnum = "pending"   // @enum pending
	CampaignStatusQueued    CampaignStatusEnum = "queued"    // @enum queued
	CampaignStatusRunning   CampaignStatusEnum = "running"   // @enum running
	CampaignStatusPausing   CampaignStatusEnum = "pausing"   // @enum pausing (User or system initiated pause)
	CampaignStatusPaused    CampaignStatusEnum = "paused"    // @enum paused
	CampaignStatusCompleted CampaignStatusEnum = "completed" // @enum completed
	CampaignStatusFailed    CampaignStatusEnum = "failed"    // @enum failed (Terminal failure after retries or critical error)
	CampaignStatusArchived  CampaignStatusEnum = "archived"  // @enum archived (For long-term storage, not active)
	CampaignStatusCancelled CampaignStatusEnum = "cancelled" // @enum cancelled (User initiated cancellation)
)

// PersonaTypeEnum defines the type of persona
type PersonaTypeEnum string

const (
	PersonaTypeDNS  PersonaTypeEnum = "dns"  // Lowercase to match frontend
	PersonaTypeHTTP PersonaTypeEnum = "http" // Lowercase to match frontend
)

// ProxyProtocolEnum defines the protocol for a proxy
// @enum string
// @example http
type ProxyProtocolEnum string

const (
	ProxyProtocolHTTP   ProxyProtocolEnum = "http"   // @enum http
	ProxyProtocolHTTPS  ProxyProtocolEnum = "https"  // @enum https
	ProxyProtocolSOCKS5 ProxyProtocolEnum = "socks5" // @enum socks5
	ProxyProtocolSOCKS4 ProxyProtocolEnum = "socks4" // @enum socks4
)

// ProxyStatusEnum defines the status of a proxy
type ProxyStatusEnum string

const (
	ProxyStatusActive   ProxyStatusEnum = "Active"
	ProxyStatusDisabled ProxyStatusEnum = "Disabled"
	ProxyStatusTesting  ProxyStatusEnum = "Testing"
	ProxyStatusFailed   ProxyStatusEnum = "Failed"
)

// PersonaStatusEnum defines the status of a persona
type PersonaStatusEnum string

const (
	PersonaStatusActive   PersonaStatusEnum = "Active"
	PersonaStatusDisabled PersonaStatusEnum = "Disabled"
	PersonaStatusTesting  PersonaStatusEnum = "Testing"
	PersonaStatusFailed   PersonaStatusEnum = "Failed"
)

// KeywordRuleTypeEnum defines the type of keyword rule
type KeywordRuleTypeEnum string

const (
	KeywordRuleTypeString KeywordRuleTypeEnum = "string"
	KeywordRuleTypeRegex  KeywordRuleTypeEnum = "regex"
)

// CampaignJobStatusEnum defines the status of a background campaign job
type CampaignJobStatusEnum string

const (
	JobStatusPending   CampaignJobStatusEnum = "pending" // Updated to match database
	JobStatusQueued    CampaignJobStatusEnum = "queued"
	JobStatusRunning   CampaignJobStatusEnum = "running" // Updated to match database
	JobStatusCompleted CampaignJobStatusEnum = "completed"
	JobStatusFailed    CampaignJobStatusEnum = "failed"
	JobStatusCancelled CampaignJobStatusEnum = "cancelled"
)

// JobBusinessStatusEnum defines the business status of a campaign job
type JobBusinessStatusEnum string

const (
	JobBusinessStatusProcessing     JobBusinessStatusEnum = "processing"
	JobBusinessStatusRetry          JobBusinessStatusEnum = "retry"
	JobBusinessStatusPriorityQueued JobBusinessStatusEnum = "priority_queued"
	JobBusinessStatusBatchOptimized JobBusinessStatusEnum = "batch_optimized"
)

// ValidationStatusEnum defines domain validation status
type ValidationStatusEnum string

const (
	ValidationStatusPending ValidationStatusEnum = "pending"
	ValidationStatusValid   ValidationStatusEnum = "valid"
	ValidationStatusInvalid ValidationStatusEnum = "invalid"
	ValidationStatusError   ValidationStatusEnum = "error"
	ValidationStatusSkipped ValidationStatusEnum = "skipped"
)

// DNSValidationStatusEnum defines DNS-specific validation status
type DNSValidationStatusEnum string

const (
	DNSValidationStatusResolved   DNSValidationStatusEnum = "resolved"
	DNSValidationStatusUnresolved DNSValidationStatusEnum = "unresolved"
	DNSValidationStatusTimeout    DNSValidationStatusEnum = "timeout"
	DNSValidationStatusError      DNSValidationStatusEnum = "error"
)

// HTTPValidationStatusEnum defines HTTP-specific validation status
type HTTPValidationStatusEnum string

const (
	HTTPValidationStatusSuccess HTTPValidationStatusEnum = "success"
	HTTPValidationStatusFailed  HTTPValidationStatusEnum = "failed"
	HTTPValidationStatusTimeout HTTPValidationStatusEnum = "timeout"
	HTTPValidationStatusError   HTTPValidationStatusEnum = "error"
)

// DNSConfigDetails holds configuration specific to DNS personas
type DNSConfigDetails struct {
	Resolvers                  []string       `json:"resolvers" validate:"dive,hostname_port_or_url"`
	UseSystemResolvers         bool           `json:"useSystemResolvers"`
	QueryTimeoutSeconds        int            `json:"queryTimeoutSeconds" validate:"gte=0"`
	MaxDomainsPerRequest       int            `json:"maxDomainsPerRequest" validate:"gt=0"`
	ResolverStrategy           string         `json:"resolverStrategy" validate:"omitempty,oneof=round_robin random weighted priority"`
	ResolversWeighted          map[string]int `json:"resolversWeighted,omitempty"`
	ResolversPreferredOrder    []string       `json:"resolversPreferredOrder,omitempty"`
	ConcurrentQueriesPerDomain int            `json:"concurrentQueriesPerDomain" validate:"gt=0"`
	QueryDelayMinMs            int            `json:"queryDelayMinMs" validate:"gte=0"`
	QueryDelayMaxMs            int            `json:"queryDelayMaxMs" validate:"gte=0"`
	MaxConcurrentGoroutines    int            `json:"maxConcurrentGoroutines" validate:"gt=0"`
	RateLimitDps               float64        `json:"rateLimitDps" validate:"gte=0"`
	RateLimitBurst             int            `json:"rateLimitBurst" validate:"gte=0"`
}

// HTTPTLSClientHello holds TLS ClientHello fingerprinting details
type HTTPTLSClientHello struct {
	MinVersion       string   `json:"minVersion,omitempty" validate:"omitempty,oneof=TLS10 TLS11 TLS12 TLS13"`
	MaxVersion       string   `json:"maxVersion,omitempty" validate:"omitempty,oneof=TLS10 TLS11 TLS12 TLS13"`
	CipherSuites     []string `json:"cipherSuites,omitempty" validate:"omitempty,dive,alphanum"`
	CurvePreferences []string `json:"curvePreferences,omitempty"`
}

// HTTP2Settings holds HTTP/2 specific settings
type HTTP2Settings struct {
	Enabled bool `json:"enabled"`
}

// HTTPCookieHandling specifies how cookies should be managed
type HTTPCookieHandling struct {
	Mode string `json:"mode,omitempty" validate:"omitempty,oneof=preserve ignore custom"`
}

// HTTPConfigDetails holds configuration specific to HTTP personas (from JSONB/Map)
type HTTPConfigDetails struct {
	UserAgent             string              `json:"userAgent" validate:"required"`
	Headers               map[string]string   `json:"headers,omitempty"`
	HeaderOrder           []string            `json:"headerOrder,omitempty"`
	TLSClientHello        *HTTPTLSClientHello `json:"tlsClientHello,omitempty"`
	HTTP2Settings         *HTTP2Settings      `json:"http2Settings,omitempty"`
	CookieHandling        *HTTPCookieHandling `json:"cookieHandling,omitempty"`
	RequestTimeoutSeconds int                 `json:"requestTimeoutSeconds,omitempty" validate:"gte=0"`
	FollowRedirects       *bool               `json:"followRedirects,omitempty"`
	AllowedStatusCodes    []int               `json:"allowedStatusCodes,omitempty" validate:"omitempty,dive,gte=100,lte=599"`
	RateLimitDps          float64             `json:"rateLimitDps,omitempty" validate:"gte=0"`
	RateLimitBurst        int                 `json:"rateLimitBurst,omitempty" validate:"gte=0"`
	Notes                 string              `json:"notes,omitempty"`
}

// Persona represents a DNS or HTTP persona
type Persona struct {
	ID            uuid.UUID        `db:"id" json:"id"`
	Name          string           `db:"name" json:"name" validate:"required"`
	PersonaType   PersonaTypeEnum  `db:"persona_type" json:"personaType" validate:"required,oneof=dns http"`
	Description   sql.NullString   `db:"description" json:"description,omitempty"`
	ConfigDetails json.RawMessage  `db:"config_details" json:"configDetails" validate:"required"` // Keep as RawMessage for DB compatibility
	IsEnabled     bool             `db:"is_enabled" json:"isEnabled"`
	Status        *PersonaStatusEnum `db:"status" json:"status,omitempty"` // Frontend expects this field
	CreatedAt     time.Time        `db:"created_at" json:"createdAt"`
	UpdatedAt     time.Time        `db:"updated_at" json:"updatedAt"`

	// Frontend-expected properties
	LastTested    *time.Time `db:"last_tested" json:"lastTested,omitempty"`
	LastError     *string    `db:"last_error" json:"lastError,omitempty"`
	Tags          *[]string  `db:"tags" json:"tags,omitempty"`
}

// Proxy represents a proxy server configuration
type Proxy struct {
	ID            uuid.UUID          `db:"id" json:"id"`
	Name          string             `db:"name" json:"name" validate:"required"`
	Description   sql.NullString     `db:"description" json:"description,omitempty"`
	Address       string             `db:"address" json:"address" validate:"required"` // Full proxy address (e.g., 'http://user:pass@host:port')
	Protocol      *ProxyProtocolEnum `db:"protocol" json:"protocol,omitempty"`
	Username      sql.NullString     `db:"username" json:"username,omitempty"` // Username for proxy auth, from DB
	PasswordHash  sql.NullString     `db:"password_hash" json:"-"`             // Hashed password, from DB
	Host          sql.NullString     `db:"host" json:"host,omitempty"`         // Hostname or IP
	Port          sql.NullInt32      `db:"port" json:"port,omitempty"`         // Port number
	IsEnabled     bool               `db:"is_enabled" json:"isEnabled"`
	IsHealthy     bool               `db:"is_healthy" json:"isHealthy"`
	LastStatus    sql.NullString     `db:"last_status" json:"lastStatus,omitempty"`        // e.g., 'Active', 'Inactive', 'Error'
	LastCheckedAt sql.NullTime       `db:"last_checked_at" json:"lastCheckedAt,omitempty"` // Timestamp of last health check
	LatencyMs     sql.NullInt32      `db:"latency_ms" json:"latencyMs,omitempty"`          // Last measured latency
	City          sql.NullString     `db:"city" json:"city,omitempty"`
	CountryCode   sql.NullString     `db:"country_code" json:"countryCode,omitempty"`
	Provider      sql.NullString     `db:"provider" json:"provider,omitempty"`
	CreatedAt     time.Time          `db:"created_at" json:"createdAt"`
	UpdatedAt     time.Time          `db:"updated_at" json:"updatedAt"`

	// Frontend-expected fields
	Status       *ProxyStatusEnum `db:"status" json:"status,omitempty"`                 // Frontend expects this enum field
	Notes        sql.NullString   `db:"notes" json:"notes,omitempty"`                   // Proxy notes/comments
	SuccessCount sql.NullInt32    `db:"success_count" json:"successCount,omitempty"`    // Count of successful operations
	FailureCount sql.NullInt32    `db:"failure_count" json:"failureCount,omitempty"`    // Count of failed operations
	LastTested   sql.NullTime     `db:"last_tested" json:"lastTested,omitempty"`        // Last test timestamp
	LastError    sql.NullString   `db:"last_error" json:"lastError,omitempty"`          // Last error message

	// Fields for input/logic, not direct DB columns if already covered by Address or PasswordHash
	InputUsername sql.NullString `json:"inputUsername,omitempty"` // For API input, to be parsed from/into Address or used for PasswordHash
	InputPassword sql.NullString `json:"inputPassword,omitempty"` // For API input, to be hashed into PasswordHash
}

// KeywordSet represents a collection of keyword rules
type KeywordSet struct {
	ID          uuid.UUID      `db:"id" json:"id"`
	Name        string         `db:"name" json:"name" validate:"required"`
	Description sql.NullString `db:"description" json:"description,omitempty"`
	IsEnabled   bool           `db:"is_enabled" json:"isEnabled"`
	CreatedAt   time.Time      `db:"created_at" json:"createdAt"`
	UpdatedAt   time.Time      `db:"updated_at" json:"updatedAt"`
	Rules       *[]KeywordRule `db:"rules" json:"rules,omitempty"` // Populated from keyword_sets.rules JSONB
}

// KeywordRule represents a specific rule within a KeywordSet
type KeywordRule struct {
	ID              uuid.UUID           `db:"id" json:"id"`
	KeywordSetID    uuid.UUID           `db:"keyword_set_id" json:"keywordSetId,omitempty"`
	Pattern         string              `db:"pattern" json:"pattern" validate:"required"`
	RuleType        KeywordRuleTypeEnum `db:"rule_type" json:"ruleType" validate:"required,oneof=string regex"`
	IsCaseSensitive bool                `db:"is_case_sensitive" json:"isCaseSensitive"`
	Category        sql.NullString      `db:"category" json:"category,omitempty"`
	ContextChars    int                 `db:"context_chars" json:"contextChars,omitempty" validate:"gte=0"`
	CreatedAt       time.Time           `db:"created_at" json:"createdAt"`
	UpdatedAt       time.Time           `db:"updated_at" json:"updatedAt"`
}

// Campaign represents a generic campaign
type Campaign struct {
	ID                 uuid.UUID          `db:"id" json:"id"`
	Name               string             `db:"name" json:"name" validate:"required"`
	CampaignType       CampaignTypeEnum   `db:"campaign_type" json:"campaignType" validate:"required"`
	Status             CampaignStatusEnum `db:"status" json:"status" validate:"required"`
	UserID             *uuid.UUID         `db:"user_id" json:"userId,omitempty"`
	LaunchSequence     bool               `db:"launch_sequence" json:"launchSequence"` // Whether to automatically chain to next campaign types when this campaign completes
	CreatedAt          time.Time          `db:"created_at" json:"createdAt"`
	UpdatedAt          time.Time          `db:"updated_at" json:"updatedAt"`
	StartedAt          *time.Time         `db:"started_at" json:"startedAt,omitempty"`
	CompletedAt        *time.Time         `db:"completed_at" json:"completedAt,omitempty"`
	ProgressPercentage *float64           `db:"progress_percentage" json:"progressPercentage,omitempty" validate:"omitempty,gte=0,lte=100"`
	TotalItems         *int64             `db:"total_items" json:"totalItems,omitempty" validate:"omitempty,gte=0"`
	ProcessedItems     *int64             `db:"processed_items" json:"processedItems,omitempty" validate:"omitempty,gte=0"`
	ErrorMessage       *string            `db:"error_message" json:"errorMessage,omitempty"`
	SuccessfulItems    *int64             `db:"successful_items" json:"successfulItems,omitempty"`
	FailedItems        *int64             `db:"failed_items" json:"failedItems,omitempty"`
	Metadata           *json.RawMessage   `db:"metadata" json:"metadata,omitempty"`

	// Additional tracking fields
	EstimatedCompletionAt *time.Time `db:"estimated_completion_at" json:"estimatedCompletionAt,omitempty"`
	AvgProcessingRate     *float64   `db:"avg_processing_rate" json:"avgProcessingRate,omitempty"`
	LastHeartbeatAt       *time.Time `db:"last_heartbeat_at" json:"lastHeartbeatAt,omitempty"`
	BusinessStatus        *string    `db:"business_status" json:"businessStatus,omitempty"`

	// Frontend-expected properties
	CurrentPhase        *CampaignPhaseEnum       `db:"current_phase" json:"currentPhase,omitempty"`
	PhaseStatus         *CampaignPhaseStatusEnum `db:"phase_status" json:"phaseStatus,omitempty"`
	Progress            *float64                 `db:"progress" json:"progress,omitempty" validate:"omitempty,gte=0,lte=100"`
	Domains             *int64                   `db:"domains" json:"domains,omitempty"`
	Leads               *int64                   `db:"leads" json:"leads,omitempty"`
	DNSValidatedDomains *int64                   `db:"dns_validated_domains" json:"dnsValidatedDomains,omitempty"`

	// Direct access to campaign parameters (flattened for frontend convenience)
	DomainGenerationParams      *DomainGenerationCampaignParams `json:"domainGenerationParams,omitempty"`
	DNSValidationParams         *DNSValidationCampaignParams    `json:"dnsValidationParams,omitempty"`
	HTTPKeywordValidationParams *HTTPKeywordCampaignParams      `json:"httpKeywordValidationParams,omitempty"`

	// Content analysis data expected by frontend
	ExtractedContent *[]ExtractedContentItem `json:"extractedContent,omitempty"`
	LeadItems        *[]LeadItem             `json:"leadItems,omitempty"`
}

// ExtractedContentItem represents content extracted and analyzed from domains
type ExtractedContentItem struct {
	ID                 string                    `json:"id" validate:"required"`
	Text               string                    `json:"text" validate:"required"`
	SimilarityScore    *int                      `json:"similarityScore,omitempty" validate:"omitempty,gte=0,lte=100"`
	SourceURL          *string                   `json:"sourceUrl,omitempty" validate:"omitempty,url"`
	PreviousCampaignID *string                   `json:"previousCampaignId,omitempty"`
	AdvancedAnalysis   *ExtractedContentAnalysis `json:"advancedAnalysis,omitempty"`
}

// ExtractedContentAnalysis represents AI analysis of extracted content
type ExtractedContentAnalysis struct {
	Summary           *string   `json:"summary,omitempty"`
	AdvancedKeywords  *[]string `json:"advancedKeywords,omitempty"`
	Categories        *[]string `json:"categories,omitempty"`
	Sentiment         *string   `json:"sentiment,omitempty" validate:"omitempty,oneof=Positive Negative Neutral"`
}

// LeadItem represents a lead generated from campaign analysis
type LeadItem struct {
	ID                 string  `json:"id" validate:"required"`
	Name               *string `json:"name,omitempty"`
	Email              *string `json:"email,omitempty" validate:"omitempty,email"`
	Company            *string `json:"company,omitempty"`
	SimilarityScore    *int    `json:"similarityScore,omitempty" validate:"omitempty,gte=0,lte=100"`
	SourceURL          *string `json:"sourceUrl,omitempty" validate:"omitempty,url"`
	PreviousCampaignID *string `json:"previousCampaignId,omitempty"`
}

// DomainGenerationCampaignParams holds parameters for a domain generation campaign
type DomainGenerationCampaignParams struct {
	CampaignID                uuid.UUID `db:"campaign_id" json:"-"`
	PatternType               string    `db:"pattern_type" json:"patternType" validate:"required,oneof=prefix_variable suffix_variable both_variable"`
	VariableLength            int       `db:"variable_length" json:"variableLength" validate:"gt=0"`
	CharacterSet              string    `db:"character_set" json:"characterSet" validate:"required"`
	ConstantString            *string   `db:"constant_string" json:"constantString,omitempty" validate:"omitempty"`
	TLD                       string    `db:"tld" json:"tld" validate:"required"`
	NumDomainsToGenerate      int       `db:"num_domains_to_generate" json:"numDomainsToGenerate" validate:"required,gt=0"`
	TotalPossibleCombinations int64     `db:"total_possible_combinations" json:"totalPossibleCombinations" validate:"required,gt=0"`
	CurrentOffset             int64     `db:"current_offset" json:"currentOffset" validate:"gte=0"`
	CreatedAt                 time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt                 time.Time `db:"updated_at" json:"updatedAt"`
}

// NormalizedDomainGenerationParams holds the core, normalized parameters for domain generation hashing and storage.
// These fields are extracted from DomainGenerationCampaignParams and normalized (e.g., sorted CharacterSet).
type NormalizedDomainGenerationParams struct {
	PatternType    string `json:"patternType"`
	VariableLength int    `json:"variableLength"`
	CharacterSet   string `json:"characterSet"` // Should be sorted for consistent hashing
	ConstantString string `json:"constantString"`
	TLD            string `json:"tld"`
}

// DomainGenerationConfigState tracks the global last offset for a unique domain generation configuration.
type DomainGenerationConfigState struct {
	ConfigHash    string                       `db:"config_hash" json:"configHash" firestore:"config_hash"` // Primary Key (e.g., SHA256 of normalized generation parameters)
	LastOffset    int64                        `db:"last_offset" json:"lastOffset" firestore:"last_offset"`
	ConfigDetails json.RawMessage              `db:"config_details" json:"configDetails" firestore:"config_details"` // Stores marshalled NormalizedDomainGenerationParams
	UpdatedAt     time.Time                    `db:"updated_at" json:"updatedAt" firestore:"updated_at"`
	ConfigState   *DomainGenerationConfigState `json:"configState,omitempty"`
}

// DomainDNSStatusEnum defines DNS validation status for domains
type DomainDNSStatusEnum string

const (
	DomainDNSStatusPending DomainDNSStatusEnum = "pending"
	DomainDNSStatusOK      DomainDNSStatusEnum = "ok"
	DomainDNSStatusError   DomainDNSStatusEnum = "error"
	DomainDNSStatusTimeout DomainDNSStatusEnum = "timeout"
)

// DomainHTTPStatusEnum defines HTTP validation status for domains
type DomainHTTPStatusEnum string

const (
	DomainHTTPStatusPending DomainHTTPStatusEnum = "pending"
	DomainHTTPStatusOK      DomainHTTPStatusEnum = "ok"
	DomainHTTPStatusError   DomainHTTPStatusEnum = "error"
	DomainHTTPStatusTimeout DomainHTTPStatusEnum = "timeout"
)

// GeneratedDomain represents a domain name generated by a campaign
type GeneratedDomain struct {
	ID                   uuid.UUID            `db:"id" json:"id" firestore:"id"`
	GenerationCampaignID uuid.UUID            `db:"domain_generation_campaign_id" json:"generationCampaignId" firestore:"generationCampaignId" validate:"required"`
	DomainName           string               `db:"domain_name" json:"domainName" firestore:"domainName" validate:"required,hostname_rfc1123"`
	OffsetIndex          int64                `db:"offset_index" json:"offsetIndex" firestore:"offsetIndex" validate:"gte=0"` // Absolute offset in the total possible generation space for this config
	GeneratedAt          time.Time            `db:"generated_at" json:"generatedAt" firestore:"generatedAt"`
	SourceKeyword        sql.NullString       `db:"source_keyword" json:"sourceKeyword,omitempty" firestore:"sourceKeyword,omitempty"`
	SourcePattern        sql.NullString       `db:"source_pattern" json:"sourcePattern,omitempty" firestore:"sourcePattern,omitempty"`
	TLD                  sql.NullString       `db:"tld" json:"tld,omitempty" firestore:"tld,omitempty"`
	CreatedAt            time.Time            `db:"created_at" json:"createdAt" firestore:"createdAt"`
	
	// Domain-centric validation status fields
	DNSStatus            *DomainDNSStatusEnum `db:"dns_status" json:"dnsStatus,omitempty" firestore:"dnsStatus,omitempty"`
	DNSIP                sql.NullString       `db:"dns_ip" json:"dnsIp,omitempty" firestore:"dnsIp,omitempty"`
	HTTPStatus           *DomainHTTPStatusEnum `db:"http_status" json:"httpStatus,omitempty" firestore:"httpStatus,omitempty"`
	HTTPStatusCode       sql.NullInt32        `db:"http_status_code" json:"httpStatusCode,omitempty" firestore:"httpStatusCode,omitempty"`
	HTTPTitle            sql.NullString       `db:"http_title" json:"httpTitle,omitempty" firestore:"httpTitle,omitempty"`
	HTTPKeywords         sql.NullString       `db:"http_keywords" json:"httpKeywords,omitempty" firestore:"httpKeywords,omitempty"`
	LeadScore            sql.NullFloat64      `db:"lead_score" json:"leadScore,omitempty" firestore:"leadScore,omitempty"`
	LastValidatedAt      sql.NullTime         `db:"last_validated_at" json:"lastValidatedAt,omitempty" firestore:"lastValidatedAt,omitempty"`
}

// DNSValidationCampaignParams holds parameters for a DNS validation campaign
type DNSValidationCampaignParams struct {
	CampaignID                 uuid.UUID        `db:"campaign_id" json:"-" firestore:"-"`
	SourceGenerationCampaignID *uuid.UUID       `db:"source_generation_campaign_id" json:"sourceGenerationCampaignId,omitempty" firestore:"sourceGenerationCampaignId,omitempty" validate:"omitempty,uuid"`
	PersonaIDs                 []uuid.UUID      `db:"persona_ids" json:"personaIds" firestore:"personaIds" validate:"required,min=1,dive,uuid"`
	RotationIntervalSeconds    *int             `db:"rotation_interval_seconds" json:"rotationIntervalSeconds,omitempty" firestore:"rotationIntervalSeconds,omitempty" validate:"omitempty,gte=0"`
	ProcessingSpeedPerMinute   *int             `db:"processing_speed_per_minute" json:"processingSpeedPerMinute,omitempty" firestore:"processingSpeedPerMinute,omitempty" validate:"omitempty,gte=0"`
	BatchSize                  *int             `db:"batch_size" json:"batchSize,omitempty" firestore:"batchSize,omitempty" validate:"omitempty,gt=0"`
	RetryAttempts              *int             `db:"retry_attempts" json:"retryAttempts,omitempty" firestore:"retryAttempts,omitempty" validate:"omitempty,gte=0"`
	Metadata                   *json.RawMessage `db:"metadata" json:"metadata,omitempty" firestore:"metadata,omitempty"`
}

// DNSValidationResult stores the outcome of a DNS validation for a domain
type DNSValidationResult struct {
	ID                   uuid.UUID        `db:"id" json:"id" firestore:"id"`
	DNSCampaignID        uuid.UUID        `db:"dns_campaign_id" json:"dnsCampaignId" firestore:"dnsCampaignId" validate:"required"`
	GeneratedDomainID    uuid.NullUUID    `db:"generated_domain_id" json:"generatedDomainId,omitempty" firestore:"generatedDomainId,omitempty"`
	DomainName           string           `db:"domain_name" json:"domainName" firestore:"domainName" validate:"required"`
	ValidationStatus     string           `db:"validation_status" json:"validationStatus" firestore:"validationStatus" validate:"required"`
	BusinessStatus       *string          `db:"business_status" json:"businessStatus,omitempty" firestore:"businessStatus,omitempty"`
	DNSRecords           *json.RawMessage `db:"dns_records" json:"dnsRecords,omitempty" firestore:"dnsRecords,omitempty"`
	ValidatedByPersonaID uuid.NullUUID    `db:"validated_by_persona_id" json:"validatedByPersonaId,omitempty" firestore:"validatedByPersonaId,omitempty"`
	Attempts             *int             `db:"attempts" json:"attempts,omitempty" firestore:"attempts,omitempty" validate:"omitempty,gte=0"`
	LastCheckedAt        *time.Time       `db:"last_checked_at" json:"lastCheckedAt,omitempty" firestore:"lastCheckedAt,omitempty"`
	CreatedAt            time.Time        `db:"created_at" json:"createdAt" firestore:"createdAt"`
}

// HTTPKeywordCampaignParams holds parameters for an HTTP & Keyword validation campaign
type HTTPKeywordCampaignParams struct {
	CampaignID               uuid.UUID        `db:"campaign_id" json:"-" firestore:"-"`
	SourceCampaignID         uuid.UUID        `db:"source_campaign_id" json:"sourceCampaignId" firestore:"sourceCampaignId" validate:"required"`
	SourceType               string           `db:"source_type" json:"sourceType" firestore:"sourceType" validate:"required"`
	KeywordSetIDs            []uuid.UUID      `db:"keyword_set_ids" json:"keywordSetIds,omitempty" firestore:"keywordSetIds,omitempty"`
	AdHocKeywords            *[]string        `db:"ad_hoc_keywords" json:"adHocKeywords,omitempty" firestore:"adHocKeywords,omitempty"`
	PersonaIDs               []uuid.UUID      `db:"persona_ids" json:"personaIds" firestore:"personaIds" validate:"required,min=1,dive,uuid"`
	ProxyIDs                 *[]uuid.UUID     `db:"proxy_ids" json:"proxyIds,omitempty" firestore:"proxyIds,omitempty"`
	ProxyPoolID              uuid.NullUUID    `db:"proxy_pool_id" json:"proxyPoolId,omitempty" firestore:"proxyPoolId,omitempty"`
	ProxySelectionStrategy   *string          `db:"proxy_selection_strategy" json:"proxySelectionStrategy,omitempty" firestore:"proxySelectionStrategy,omitempty"`
	RotationIntervalSeconds  *int             `db:"rotation_interval_seconds" json:"rotationIntervalSeconds,omitempty" firestore:"rotationIntervalSeconds,omitempty" validate:"omitempty,gte=0"`
	ProcessingSpeedPerMinute *int             `db:"processing_speed_per_minute" json:"processingSpeedPerMinute,omitempty" firestore:"processingSpeedPerMinute,omitempty" validate:"omitempty,gte=0"`
	BatchSize                *int             `db:"batch_size" json:"batchSize,omitempty" firestore:"batchSize,omitempty" validate:"omitempty,gt=0"`
	RetryAttempts            *int             `db:"retry_attempts" json:"retryAttempts,omitempty" firestore:"retryAttempts,omitempty" validate:"omitempty,gte=0"`
	TargetHTTPPorts          *[]int           `db:"target_http_ports" json:"targetHttpPorts,omitempty" firestore:"targetHttpPorts,omitempty"`
	LastProcessedDomainName  *string          `db:"last_processed_domain_name" json:"lastProcessedDomainName,omitempty" firestore:"lastProcessedDomainName,omitempty"`
	Metadata                 *json.RawMessage `db:"metadata" json:"metadata,omitempty" firestore:"metadata,omitempty"`
}

// HTTPKeywordResult stores the outcome of an HTTP validation and keyword search
type HTTPKeywordResult struct {
	ID                      uuid.UUID        `db:"id" json:"id" firestore:"id"`
	HTTPKeywordCampaignID   uuid.UUID        `db:"http_keyword_campaign_id" json:"httpKeywordCampaignId" firestore:"httpKeywordCampaignId" validate:"required"`
	DNSResultID             uuid.NullUUID    `db:"dns_result_id" json:"dnsResultId,omitempty" firestore:"dnsResultId,omitempty"`
	DomainName              string           `db:"domain_name" json:"domainName" firestore:"domainName" validate:"required"`
	ValidationStatus        string           `db:"validation_status" json:"validationStatus" firestore:"validationStatus" validate:"required"`
	HTTPStatusCode          *int32           `db:"http_status_code" json:"httpStatusCode,omitempty" firestore:"httpStatusCode,omitempty"`
	ResponseHeaders         *json.RawMessage `db:"response_headers" json:"responseHeaders,omitempty" firestore:"responseHeaders,omitempty"`
	PageTitle               *string          `db:"page_title" json:"pageTitle,omitempty" firestore:"pageTitle,omitempty"`
	ExtractedContentSnippet *string          `db:"extracted_content_snippet" json:"extractedContentSnippet,omitempty" firestore:"extractedContentSnippet,omitempty"`
	FoundKeywordsFromSets   *json.RawMessage `db:"found_keywords_from_sets" json:"foundKeywordsFromSets,omitempty" firestore:"foundKeywordsFromSets,omitempty"`
	FoundAdHocKeywords      *[]string        `db:"found_ad_hoc_keywords" json:"foundAdHocKeywords,omitempty" firestore:"foundAdHocKeywords,omitempty"`
	ContentHash             *string          `db:"content_hash" json:"contentHash,omitempty" firestore:"contentHash,omitempty"`
	ValidatedByPersonaID    uuid.NullUUID    `db:"validated_by_persona_id" json:"validatedByPersonaId,omitempty" firestore:"validatedByPersonaId,omitempty"`
	UsedProxyID             uuid.NullUUID    `db:"used_proxy_id" json:"usedProxyId,omitempty" firestore:"usedProxyId,omitempty"`
	Attempts                *int             `db:"attempts" json:"attempts,omitempty" firestore:"attempts,omitempty" validate:"omitempty,gte=0"`
	LastCheckedAt           *time.Time       `db:"last_checked_at" json:"lastCheckedAt,omitempty" firestore:"lastCheckedAt,omitempty"`
	CreatedAt               time.Time        `db:"created_at" json:"createdAt" firestore:"createdAt"`
}

// AuditLog represents an audit trail entry
type AuditLog struct {
	ID         uuid.UUID        `db:"id" json:"id" firestore:"id"`
	Timestamp  time.Time        `db:"timestamp" json:"timestamp" firestore:"timestamp"`
	UserID     uuid.NullUUID    `db:"user_id" json:"userId,omitempty" firestore:"userId,omitempty"` // Fixed: UUID type to match database
	Action     string           `db:"action" json:"action" firestore:"action" validate:"required"`
	EntityType sql.NullString   `db:"entity_type" json:"entityType,omitempty" firestore:"entityType,omitempty"`
	EntityID   uuid.NullUUID    `db:"entity_id" json:"entityId,omitempty" firestore:"entityId,omitempty"`
	Details    *json.RawMessage `db:"details" json:"details,omitempty" firestore:"details,omitempty"`
	ClientIP   sql.NullString   `db:"client_ip" json:"clientIp,omitempty" firestore:"clientIp,omitempty"`
	UserAgent  sql.NullString   `db:"user_agent" json:"userAgent,omitempty" firestore:"userAgent,omitempty"`
}

// CampaignJob represents a job for the background worker system.
type CampaignJob struct {
	ID                 uuid.UUID              `db:"id" json:"id" firestore:"id"`
	CampaignID         uuid.UUID              `db:"campaign_id" json:"campaignId" firestore:"campaignId"`
	JobType            CampaignTypeEnum       `db:"job_type" json:"jobType" firestore:"jobType"` // Renamed from CampaignType to JobType
	Status             CampaignJobStatusEnum  `db:"status" json:"status" firestore:"status"`
	ScheduledAt        time.Time              `db:"scheduled_at" json:"scheduledAt" firestore:"scheduledAt"`
	JobPayload         *json.RawMessage       `db:"job_payload" json:"jobPayload,omitempty" firestore:"jobPayload,omitempty"` // Renamed from Payload to JobPayload
	Attempts           int                    `db:"attempts" json:"attempts" firestore:"attempts"`
	MaxAttempts        int                    `db:"max_attempts" json:"maxAttempts" firestore:"maxAttempts"`
	LastError          sql.NullString         `db:"last_error" json:"lastError,omitempty" firestore:"lastError,omitempty"`
	LastAttemptedAt    sql.NullTime           `db:"last_attempted_at" json:"lastAttemptedAt,omitempty" firestore:"lastAttemptedAt,omitempty"`          // Added
	ProcessingServerID sql.NullString         `db:"processing_server_id" json:"processingServerId,omitempty" firestore:"processingServerId,omitempty"` // Changed WorkerID to ProcessingServerID to match DB
	CreatedAt          time.Time              `db:"created_at" json:"createdAt" firestore:"createdAt"`
	UpdatedAt          time.Time              `db:"updated_at" json:"updatedAt" firestore:"updatedAt"`
	NextExecutionAt    sql.NullTime           `db:"next_execution_at" json:"nextExecutionAt,omitempty" firestore:"nextExecutionAt,omitempty"`
	LockedAt           sql.NullTime           `db:"locked_at" json:"lockedAt,omitempty" firestore:"lockedAt,omitempty"`
	LockedBy           sql.NullString         `db:"locked_by" json:"lockedBy,omitempty" firestore:"lockedBy,omitempty"`
	BusinessStatus     *JobBusinessStatusEnum `db:"business_status" json:"businessStatus,omitempty" firestore:"businessStatus,omitempty"`
}

// ProxyPool represents a proxy pool configuration
type ProxyPool struct {
	ID                         uuid.UUID      `db:"id" json:"id"`
	Name                       string         `db:"name" json:"name" validate:"required"`
	Description                sql.NullString `db:"description" json:"description,omitempty"`
	IsEnabled                  bool           `db:"is_enabled" json:"isEnabled"`
	PoolStrategy               sql.NullString `db:"pool_strategy" json:"poolStrategy,omitempty"` // round_robin, random, weighted, failover
	HealthCheckEnabled         bool           `db:"health_check_enabled" json:"healthCheckEnabled"`
	HealthCheckIntervalSeconds *int           `db:"health_check_interval_seconds" json:"healthCheckIntervalSeconds,omitempty"`
	MaxRetries                 *int           `db:"max_retries" json:"maxRetries,omitempty"`
	TimeoutSeconds             *int           `db:"timeout_seconds" json:"timeoutSeconds,omitempty"`
	CreatedAt                  time.Time      `db:"created_at" json:"createdAt"`
	UpdatedAt                  time.Time      `db:"updated_at" json:"updatedAt"`

	// Computed fields (not stored in DB)
	Proxies []Proxy `json:"proxies,omitempty" db:"-"`
}

// ProxyPoolMembership represents the junction between proxy pools and proxies
type ProxyPoolMembership struct {
	PoolID   uuid.UUID `db:"pool_id" json:"poolId" validate:"required"`
	ProxyID  uuid.UUID `db:"proxy_id" json:"proxyId" validate:"required"`
	Weight   *int      `db:"weight" json:"weight,omitempty" validate:"omitempty,gt=0"`
	IsActive bool      `db:"is_active" json:"isActive"`
	AddedAt  time.Time `db:"added_at" json:"addedAt"`
}

// QueryPerformanceMetric represents query performance data from query_performance_metrics table
type QueryPerformanceMetric struct {
	ID                      uuid.UUID       `db:"id" json:"id"`
	QueryHash               string          `db:"query_hash" json:"queryHash"`
	QuerySQL                string          `db:"query_sql" json:"querySQL"`
	QueryType               string          `db:"query_type" json:"queryType"`
	TableNames              []string        `db:"table_names" json:"tableNames"`
	ExecutionTimeMs         float64         `db:"execution_time_ms" json:"executionTimeMs"`
	RowsExamined            int64           `db:"rows_examined" json:"rowsExamined"`
	RowsReturned            int64           `db:"rows_returned" json:"rowsReturned"`
	IndexUsage              json.RawMessage `db:"index_usage" json:"indexUsage"`
	CPUTimeMs               float64         `db:"cpu_time_ms" json:"cpuTimeMs"`
	IOWaitMs                float64         `db:"io_wait_ms" json:"ioWaitMs"`
	LockWaitMs              float64         `db:"lock_wait_ms" json:"lockWaitMs"`
	BufferReads             int64           `db:"buffer_reads" json:"bufferReads"`
	BufferHits              int64           `db:"buffer_hits" json:"bufferHits"`
	QueryPlan               json.RawMessage `db:"query_plan" json:"queryPlan"`
	OptimizationScore       float64         `db:"optimization_score" json:"optimizationScore"`
	ExecutedAt              time.Time       `db:"executed_at" json:"executedAt"`
	ServiceName             string          `db:"service_name" json:"serviceName"`
	CampaignID              *uuid.UUID      `db:"campaign_id" json:"campaignId,omitempty"`
	CampaignType            *string         `db:"campaign_type" json:"campaignType,omitempty"`
	MemoryUsedBytes         int64           `db:"memory_used_bytes" json:"memoryUsedBytes"`
	OptimizationApplied     bool            `db:"optimization_applied" json:"optimizationApplied"`
	OptimizationSuggestions json.RawMessage `db:"optimization_suggestions" json:"optimizationSuggestions"`
	UserID                  *uuid.UUID      `db:"user_id" json:"userId,omitempty"`
	PerformanceCategory     string          `db:"performance_category" json:"performanceCategory"`
	NeedsOptimization       bool            `db:"needs_optimization" json:"needsOptimization"`
}

// ResourceUtilizationMetric represents resource utilization data from resource_utilization_metrics table
type ResourceUtilizationMetric struct {
	ID                  uuid.UUID       `db:"id" json:"id"`
	ServiceName         string          `db:"service_name" json:"serviceName"`
	ResourceType        string          `db:"resource_type" json:"resourceType"`
	CurrentUsage        float64         `db:"current_usage" json:"currentUsage"`
	MaxCapacity         float64         `db:"max_capacity" json:"maxCapacity"`
	UtilizationPct      float64         `db:"utilization_pct" json:"utilizationPct"`
	EfficiencyScore     float64         `db:"efficiency_score" json:"efficiencyScore"`
	BottleneckDetected  bool            `db:"bottleneck_detected" json:"bottleneckDetected"`
	RecordedAt          time.Time       `db:"recorded_at" json:"recordedAt"`
	CampaignType        *string         `db:"campaign_type" json:"campaignType,omitempty"`
	CampaignID          *uuid.UUID      `db:"campaign_id" json:"campaignId,omitempty"`
	Component           *string         `db:"component" json:"component,omitempty"`
	OptimizationApplied json.RawMessage `db:"optimization_applied" json:"optimizationApplied"`
}

// DomainPatternType defines the type of domain generation pattern
type DomainPatternType string

const (
	PatternTypePrefixVariable DomainPatternType = "prefix_variable"
	PatternTypeSuffixVariable DomainPatternType = "suffix_variable"
	PatternTypeBothVariable   DomainPatternType = "both_variable"
)

// DereferenceGeneratedDomainSlice converts a slice of *GeneratedDomain to []GeneratedDomain.
func DereferenceGeneratedDomainSlice(slice []*GeneratedDomain) []GeneratedDomain {
	if slice == nil {
		return nil
	}
	dereferenced := make([]GeneratedDomain, 0, len(slice))
	for _, ptr := range slice {
		if ptr != nil {
			dereferenced = append(dereferenced, *ptr)
		}
	}
	return dereferenced
}

// DereferenceDNSValidationResultSlice converts a slice of *DNSValidationResult to []DNSValidationResult.
func DereferenceDNSValidationResultSlice(slice []*DNSValidationResult) []DNSValidationResult {
	if slice == nil {
		return nil
	}
	dereferenced := make([]DNSValidationResult, 0, len(slice))
	for _, ptr := range slice {
		if ptr != nil {
			dereferenced = append(dereferenced, *ptr)
		}
	}
	return dereferenced
}

// DereferenceHTTPKeywordResultSlice converts a slice of *HTTPKeywordResult to []HTTPKeywordResult.
func DereferenceHTTPKeywordResultSlice(slice []*HTTPKeywordResult) []HTTPKeywordResult {
	if slice == nil {
		return nil
	}
	dereferenced := make([]HTTPKeywordResult, 0, len(slice))
	for _, ptr := range slice {
		if ptr != nil {
			dereferenced = append(dereferenced, *ptr)
		}
	}
	return dereferenced
}

// Helper functions to get pointers to literal values for nullable fields.

// Float64Ptr returns a pointer to a float64 value.
func Float64Ptr(v float64) *float64 {
	return &v
}

// Int64Ptr returns a pointer to an int64 value.
func Int64Ptr(v int64) *int64 {
	return &v
}

// IntPtr returns a pointer to an int value.
func IntPtr(v int) *int {
	return &v
}

// StringPtr returns a pointer to a string value.
func StringPtr(v string) *string {
	return &v
}

// ProxyProtocolEnumPtr returns a pointer to a ProxyProtocolEnum value.
func ProxyProtocolEnumPtr(v ProxyProtocolEnum) *ProxyProtocolEnum {
	return &v
}

// JSONRawMessagePtr returns a pointer to a json.RawMessage value.
func JSONRawMessagePtr(v json.RawMessage) *json.RawMessage {
	// json.RawMessage is a slice, so taking its address directly is usually fine,
	// but this helper provides consistency.
	return &v
}

// StringSlicePtr returns a pointer to a slice of strings.
func StringSlicePtr(v []string) *[]string {
	if v == nil { // Handle nil explicitly if you want to return nil for nil input
		return nil
	}
	// Return address of the original slice if modifications to original are acceptable,
	// or make a copy if a new distinct slice pointer is needed.
	// c := make([]string, len(v)); copy(c, v); return &c; // For a copy
	return &v // If direct reference is okay
}

// IntSlicePtr returns a pointer to a slice of ints.
func IntSlicePtr(v []int) *[]int {
	if v == nil {
		return nil
	}
	return &v
}

// UUIDSlicePtr returns a pointer to a slice of UUIDs.
func UUIDSlicePtr(v []uuid.UUID) *[]uuid.UUID {
	if v == nil {
		return nil
	}
	return &v
}

// SchemaValidationHelper functions are removed as models now directly use nullable types.

// CreateProxyRequest represents a request to create a new proxy
type CreateProxyRequest struct {
	Name        string            `json:"name" validate:"required,min=1,max=255"`
	Description string            `json:"description,omitempty"`
	Address     string            `json:"address" validate:"required"`
	Protocol    ProxyProtocolEnum `json:"protocol,omitempty"`
	Username    string            `json:"username,omitempty"`
	Password    string            `json:"password,omitempty"`
	CountryCode string            `json:"countryCode,omitempty"`
	IsEnabled   *bool             `json:"isEnabled,omitempty"`
	Notes       string            `json:"notes,omitempty"`
}

// UpdateProxyRequest represents a request to update an existing proxy
type UpdateProxyRequest struct {
	Name        *string            `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description *string            `json:"description,omitempty"`
	Address     *string            `json:"address,omitempty"`
	Protocol    *ProxyProtocolEnum `json:"protocol,omitempty"`
	Username    *string            `json:"username,omitempty"`
	Password    *string            `json:"password,omitempty"`
	CountryCode *string            `json:"countryCode,omitempty"`
	IsEnabled   *bool              `json:"isEnabled,omitempty"`
	Notes       *string            `json:"notes,omitempty"`
}
