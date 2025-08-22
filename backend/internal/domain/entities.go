//go:build exclude

package domain

import (
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// DOMAIN ENTITIES - Pure business logic, no infrastructure concerns
// ============================================================================

// KeywordRule represents the core business concept of a keyword matching rule
type KeywordRule struct {
	ID              uuid.UUID
	Pattern         string
	Type            KeywordRuleType
	IsCaseSensitive bool
	Category        string
	ContextChars    int
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// KeywordRuleType represents the type of keyword matching
type KeywordRuleType string

const (
	KeywordRuleTypeString KeywordRuleType = "string"
	KeywordRuleTypeRegex  KeywordRuleType = "regex"
)

// KeywordSet represents a collection of related keyword rules
type KeywordSet struct {
	ID          uuid.UUID
	Name        string
	Description string
	IsEnabled   bool
	Rules       []KeywordRule
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Proxy represents the core business concept of a network proxy
type Proxy struct {
	ID          uuid.UUID
	Name        string
	Description string
	Address     string
	Protocol    ProxyProtocol
	Username    string
	Password    string
	CountryCode string
	IsEnabled   bool
	Status      ProxyStatus
	Notes       string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	LastChecked *time.Time
}

// ProxyProtocol represents supported proxy protocols
type ProxyProtocol string

const (
	ProxyProtocolHTTP   ProxyProtocol = "http"
	ProxyProtocolHTTPS  ProxyProtocol = "https"
	ProxyProtocolSOCKS4 ProxyProtocol = "socks4"
	ProxyProtocolSOCKS5 ProxyProtocol = "socks5"
)

// ProxyStatus represents the operational status of a proxy
type ProxyStatus string

const (
	ProxyStatusUnknown     ProxyStatus = "unknown"
	ProxyStatusActive      ProxyStatus = "active"
	ProxyStatusInactive    ProxyStatus = "inactive"
	ProxyStatusError       ProxyStatus = "error"
	ProxyStatusMaintenance ProxyStatus = "maintenance"
)

// Campaign represents the core business concept of a lead generation campaign
type Campaign struct {
	ID            uuid.UUID
	Name          string
	UserID        uuid.UUID
	Type          CampaignType
	State         CampaignState
	Configuration CampaignConfig
	CreatedAt     time.Time
	UpdatedAt     time.Time
	StartedAt     *time.Time
	CompletedAt   *time.Time
}

// CampaignType represents the type of campaign
type CampaignType string

const (
	CampaignTypeLeadGeneration CampaignType = "lead_generation"
)

// CampaignState represents the current state of a campaign
type CampaignState string

const (
	CampaignStateDraft     CampaignState = "draft"
	CampaignStateRunning   CampaignState = "running"
	CampaignStatePaused    CampaignState = "paused"
	CampaignStateCompleted CampaignState = "completed"
	CampaignStateFailed    CampaignState = "failed"
	CampaignStateCancelled CampaignState = "cancelled"
)

// CampaignConfig holds the configuration for different campaign phases
type CampaignConfig struct {
	DNSPhase  *DNSPhaseConfig  `json:"dnsPhase,omitempty"`
	HTTPPhase *HTTPPhaseConfig `json:"httpPhase,omitempty"`
}

// DNSPhaseConfig represents DNS validation phase configuration
type DNSPhaseConfig struct {
	PersonaIDs []uuid.UUID `json:"personaIds"`
	Name       string      `json:"name,omitempty"`
}

// HTTPPhaseConfig represents HTTP validation phase configuration
type HTTPPhaseConfig struct {
	PersonaIDs    []uuid.UUID `json:"personaIds"`
	Keywords      []string    `json:"keywords,omitempty"`
	AdHocKeywords []string    `json:"adHocKeywords,omitempty"`
	Name          string      `json:"name,omitempty"`
}

// User represents the core business concept of a system user
type User struct {
	ID                 uuid.UUID
	Email              string
	EmailVerified      bool
	FirstName          string
	LastName           string
	AvatarURL          string
	IsActive           bool
	IsLocked           bool
	LastLoginAt        *time.Time
	MustChangePassword bool
	MFAEnabled         bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// UserSecrets represents sensitive user data (separate from public user data)
type UserSecrets struct {
	UserID                     uuid.UUID
	PasswordHash               string
	PasswordPepperVersion      int
	EmailVerificationToken     string
	EmailVerificationExpires   *time.Time
	FailedLoginAttempts        int
	LockedUntil                *time.Time
	LastLoginIP                string
	PasswordChangedAt          time.Time
	MFASecretEncrypted         []byte
	MFABackupCodesEncrypted    []byte
	MFALastUsedAt              *time.Time
	EncryptedFields            string
	SecurityQuestionsEncrypted []byte
}
