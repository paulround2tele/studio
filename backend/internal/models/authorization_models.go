package models

import (
	"time"

	"github.com/google/uuid"
)

// AuthorizationResult represents the result of an authorization check
type AuthorizationResult struct {
	Authorized          bool     `json:"authorized"`
	Reason              string   `json:"reason,omitempty"`
	RequiredPermissions []string `json:"required_permissions,omitempty"`
	MissingPermissions  []string `json:"missing_permissions,omitempty"`
	UserPermissions     []string `json:"user_permissions,omitempty"`
	RequiredRole        string   `json:"required_role,omitempty"`
	UserRole            string   `json:"user_role,omitempty"`
	ResourceType        string   `json:"resource_type,omitempty"`
	EndpointPattern     string   `json:"endpoint_pattern,omitempty"`
	HTTPMethod          string   `json:"http_method,omitempty"`
}

// UserContext represents the user context for authorization
type UserContext struct {
	UserID      uuid.UUID `json:"user_id"`
	SessionID   string    `json:"session_id"`
	Role        string    `json:"role"`
	Permissions []string  `json:"permissions"`
	RequestID   string    `json:"request_id"`
}

// APIAccessViolation represents an API access violation record
type APIAccessViolation struct {
	ID                  uuid.UUID              `json:"id" db:"id"`
	UserID              uuid.UUID              `json:"user_id" db:"user_id"`
	SessionID           string                 `json:"session_id" db:"session_id"`
	EndpointPattern     string                 `json:"endpoint_pattern" db:"endpoint_pattern"`
	HTTPMethod          string                 `json:"http_method" db:"http_method"`
	ViolationType       string                 `json:"violation_type" db:"violation_type"`
	RequiredPermissions []string               `json:"required_permissions" db:"required_permissions"`
	UserPermissions     []string               `json:"user_permissions" db:"user_permissions"`
	ResourceID          string                 `json:"resource_id" db:"resource_id"`
	ViolationDetails    map[string]interface{} `json:"violation_details" db:"violation_details"`
	SourceIP            string                 `json:"source_ip" db:"source_ip"`
	UserAgent           string                 `json:"user_agent" db:"user_agent"`
	RequestHeaders      map[string]interface{} `json:"request_headers" db:"request_headers"`
	ResponseStatus      int                    `json:"response_status" db:"response_status"`
	CreatedAt           time.Time              `json:"created_at" db:"created_at"`
}

// APIAuthorizationRequest represents a request for API authorization
type APIAuthorizationRequest struct {
	UserID          uuid.UUID              `json:"user_id"`
	SessionID       string                 `json:"session_id"`
	RequestID       string                 `json:"request_id"`
	EndpointPattern string                 `json:"endpoint_pattern"`
	HTTPMethod      string                 `json:"http_method"`
	ResourceType    string                 `json:"resource_type"`
	ResourceID      string                 `json:"resource_id"`
	CampaignID      string                 `json:"campaign_id"`
	UserRole        string                 `json:"user_role"`
	RequestContext  map[string]interface{} `json:"request_context"`
}

// APIAuthorizationResult represents the result of API authorization
type APIAuthorizationResult struct {
	Authorized            bool                   `json:"authorized"`
	Reason                string                 `json:"reason,omitempty"`
	RequiredPermissions   []string               `json:"required_permissions,omitempty"`
	MissingPermissions    []string               `json:"missing_permissions,omitempty"`
	ResourceType          string                 `json:"resource_type,omitempty"`
	RiskScore             int                    `json:"risk_score,omitempty"`
	AuthorizationDuration time.Duration          `json:"authorization_duration,omitempty"`
	RequestContext        map[string]interface{} `json:"request_context,omitempty"`
}
