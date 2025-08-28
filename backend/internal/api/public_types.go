//go:build legacy_gin
// +build legacy_gin

package api

// API-local enums and DTO building blocks to avoid leaking internal model types into the public schema.

// PersonaType defines allowed persona categories for the public API.
type PersonaType string

const (
	PersonaTypeDNS  PersonaType = "dns"
	PersonaTypeHTTP PersonaType = "http"
)

// ProxyProtocol defines allowed proxy protocols for the public API.
type ProxyProtocol string

const (
	ProxyProtocolHTTP   ProxyProtocol = "http"
	ProxyProtocolHTTPS  ProxyProtocol = "https"
	ProxyProtocolSOCKS5 ProxyProtocol = "socks5"
	ProxyProtocolSOCKS4 ProxyProtocol = "socks4"
)

// PhaseType defines high-level campaign phase identifiers for the public API.
type PhaseType string

const (
	PhaseTypeDomainGeneration      PhaseType = "domain_generation"
	PhaseTypeDNSValidation         PhaseType = "dns_validation"
	PhaseTypeHTTPKeywordValidation PhaseType = "http_keyword_validation"
	PhaseTypeAnalysis              PhaseType = "analysis"
	PhaseTypeSetup                 PhaseType = "setup"
)

// PhaseStatus defines the lifecycle state of a phase for the public API.
type PhaseStatus string

const (
	PhaseStatusNotStarted PhaseStatus = "not_started"
	PhaseStatusReady      PhaseStatus = "ready"
	PhaseStatusConfigured PhaseStatus = "configured"
	PhaseStatusInProgress PhaseStatus = "in_progress"
	PhaseStatusPaused     PhaseStatus = "paused"
	PhaseStatusCompleted  PhaseStatus = "completed"
	PhaseStatusFailed     PhaseStatus = "failed"
)

// KeywordRuleType defines the rule type for keyword matching in the public API.
type KeywordRuleType string

const (
	KeywordRuleTypeString KeywordRuleType = "string"
	KeywordRuleTypeRegex  KeywordRuleType = "regex"
)
