// File: backend/internal/services/audit_context_service.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

// AuditContextService provides comprehensive audit logging with complete authorization context
type AuditContextService interface {
	// Extract user context from Gin context (from auth middleware)
	ExtractUserContext(c *gin.Context) (*AuditUserContext, error)

	// Create audit event with complete user context
	CreateAuditEvent(ctx context.Context, userCtx *AuditUserContext, action, entityType string, entityID *uuid.UUID, details interface{}) error

	// Create audit event from Gin context (convenience method)
	CreateAuditEventFromGin(c *gin.Context, action, entityType string, entityID *uuid.UUID, details interface{}) error

	// Validate audit context completeness
	ValidateAuditContext(userCtx *AuditUserContext) error

	// Create system audit event (for background processes)
	CreateSystemAuditEvent(ctx context.Context, systemIdentifier, action, entityType string, entityID *uuid.UUID, details interface{}) error

	// Create audit event with API key context
	CreateAPIKeyAuditEvent(ctx context.Context, apiKeyIdentifier, action, entityType string, entityID *uuid.UUID, details interface{}) error
}

// AuditUserContext represents comprehensive user context for audit logging
type AuditUserContext struct {
	UserID                 uuid.UUID `json:"userId"`
	SessionID              string    `json:"sessionId"`
	RequestID              string    `json:"requestId"`
	ClientIP               string    `json:"clientIp"`
	UserAgent              string    `json:"userAgent"`
	Roles                  []string  `json:"roles"`
	Permissions            []string  `json:"permissions"`
	AuthenticationType     string    `json:"authenticationType"` // "session", "api_key", "system"
	SessionExpiry          time.Time `json:"sessionExpiry,omitempty"`
	RequiresPasswordChange bool      `json:"requiresPasswordChange,omitempty"`
	RiskScore              int       `json:"riskScore,omitempty"`

	// Request metadata
	HTTPMethod       string    `json:"httpMethod,omitempty"`
	RequestPath      string    `json:"requestPath,omitempty"`
	RequestTimestamp time.Time `json:"requestTimestamp"`

	// API Key context (if applicable)
	APIKeyIdentifier string `json:"apiKeyIdentifier,omitempty"`

	// System context (if applicable)
	SystemIdentifier string `json:"systemIdentifier,omitempty"`
}

// AuditEventDetails represents enhanced audit event details
type AuditEventDetails struct {
	Description          string                 `json:"description,omitempty"`
	UserContext          *AuditUserContext      `json:"userContext"`
	RequestCorrelationID string                 `json:"requestCorrelationId"`
	OperationMetadata    map[string]interface{} `json:"operationMetadata,omitempty"`
	SecurityFlags        []string               `json:"securityFlags,omitempty"`
	ComplianceFlags      []string               `json:"complianceFlags,omitempty"`
	BusinessContext      map[string]interface{} `json:"businessContext,omitempty"`
	Timestamp            time.Time              `json:"timestamp"`
}

// auditContextServiceImpl implements AuditContextService
type auditContextServiceImpl struct {
	auditLogStore store.AuditLogStore
}

// NewAuditContextService creates a new audit context service
func NewAuditContextService(auditLogStore store.AuditLogStore) AuditContextService {
	return &auditContextServiceImpl{
		auditLogStore: auditLogStore,
	}
}

// ExtractUserContext extracts comprehensive user context from Gin context
func (s *auditContextServiceImpl) ExtractUserContext(c *gin.Context) (*AuditUserContext, error) {
	log.Printf("AuditContext: Extracting user context from Gin context")

	// Check for authentication type
	authType, exists := c.Get("auth_type")
	if !exists {
		return nil, fmt.Errorf("no authentication type found in context")
	}

	userCtx := &AuditUserContext{
		RequestTimestamp: time.Now().UTC(),
		ClientIP:         getClientIPFromGin(c),
		UserAgent:        c.GetHeader("User-Agent"),
		HTTPMethod:       c.Request.Method,
		RequestPath:      c.Request.URL.Path,
	}

	// Get request ID if available
	if requestID, exists := c.Get("request_id"); exists {
		userCtx.RequestID = requestID.(string)
	} else {
		userCtx.RequestID = uuid.New().String()
	}

	switch authType {
	case "session":
		if err := s.extractSessionContext(c, userCtx); err != nil {
			return nil, fmt.Errorf("failed to extract session context: %w", err)
		}
		userCtx.AuthenticationType = "session"

	case "api_key":
		if err := s.extractAPIKeyContext(c, userCtx); err != nil {
			return nil, fmt.Errorf("failed to extract API key context: %w", err)
		}
		userCtx.AuthenticationType = "api_key"

	default:
		return nil, fmt.Errorf("unknown authentication type: %s", authType)
	}

	log.Printf("AuditContext: Successfully extracted user context for user %s", userCtx.UserID)
	return userCtx, nil
}

// extractSessionContext extracts session-based authentication context
func (s *auditContextServiceImpl) extractSessionContext(c *gin.Context, userCtx *AuditUserContext) error {
	// Get security context from middleware
	securityContext, exists := c.Get("security_context")
	if !exists {
		return fmt.Errorf("security context not found")
	}

	ctx := securityContext.(*models.SecurityContext)

	userCtx.UserID = ctx.UserID
	userCtx.SessionID = ctx.SessionID
	userCtx.Roles = ctx.Roles
	userCtx.Permissions = ctx.Permissions
	userCtx.SessionExpiry = ctx.SessionExpiry
	userCtx.RequiresPasswordChange = ctx.RequiresPasswordChange
	userCtx.RiskScore = ctx.RiskScore

	return nil
}

// extractAPIKeyContext extracts API key-based authentication context
func (s *auditContextServiceImpl) extractAPIKeyContext(c *gin.Context, userCtx *AuditUserContext) error {
	// For API key authentication, we need to create a system-like context
	// since API keys don't have user sessions
	userCtx.APIKeyIdentifier = "api_key" // This should be enhanced to include actual API key identifier
	userCtx.UserID = uuid.Nil            // API keys don't have associated users in this implementation

	// API keys have limited permissions - define based on your system
	userCtx.Permissions = []string{"api:access"}
	userCtx.Roles = []string{"api_user"}

	return nil
}

// CreateAuditEvent creates a comprehensive audit event with full user context
func (s *auditContextServiceImpl) CreateAuditEvent(ctx context.Context, userCtx *AuditUserContext, action, entityType string, entityID *uuid.UUID, details interface{}) error {
	log.Printf("AuditContext: Creating audit event - Action: %s, EntityType: %s, User: %s", action, entityType, userCtx.UserID)

	// Validate user context completeness
	if err := s.ValidateAuditContext(userCtx); err != nil {
		return fmt.Errorf("audit context validation failed: %w", err)
	}

	// Create enhanced audit event details
	auditDetails := &AuditEventDetails{
		UserContext:          userCtx,
		RequestCorrelationID: userCtx.RequestID,
		Timestamp:            time.Now().UTC(),
		OperationMetadata:    make(map[string]interface{}),
		SecurityFlags:        s.generateSecurityFlags(userCtx, action),
		ComplianceFlags:      s.generateComplianceFlags(action, entityType),
	}

	// Add operation-specific details
	if details != nil {
		auditDetails.OperationMetadata["details"] = details
		if desc, ok := details.(string); ok {
			auditDetails.Description = desc
		}
	}

	// Add business context based on entity type
	auditDetails.BusinessContext = s.generateBusinessContext(entityType, entityID)

	// Marshal audit details to JSON
	detailsJSON, err := json.Marshal(auditDetails)
	if err != nil {
		return fmt.Errorf("failed to marshal audit details: %w", err)
	}

	// Create audit log entry
	auditLog := &models.AuditLog{
		ID:         uuid.New(),
		Timestamp:  time.Now().UTC(),
		Action:     action,
		EntityType: nullStringFromString(entityType),
		ClientIP:   nullStringFromString(userCtx.ClientIP),
		UserAgent:  nullStringFromString(userCtx.UserAgent),
		Details:    (*json.RawMessage)(&detailsJSON),
	}

	// Set UserID based on authentication type
	if userCtx.AuthenticationType == "session" && userCtx.UserID != uuid.Nil {
		auditLog.UserID = uuid.NullUUID{UUID: userCtx.UserID, Valid: true}
	} else if userCtx.AuthenticationType == "api_key" {
		// For API keys, we still want to track the action but mark it as API key access
		auditLog.UserID = uuid.NullUUID{Valid: false} // No specific user for API key
	} else if userCtx.AuthenticationType == "system" {
		auditLog.UserID = uuid.NullUUID{Valid: false} // No specific user for system actions
	}

	// Set EntityID if provided
	if entityID != nil {
		auditLog.EntityID = uuid.NullUUID{UUID: *entityID, Valid: true}
	}

	// Store audit log
	if err := s.auditLogStore.CreateAuditLog(ctx, nil, auditLog); err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	log.Printf("AuditContext: Successfully created audit event %s for user %s", auditLog.ID, userCtx.UserID)
	return nil
}

// CreateAuditEventFromGin creates audit event directly from Gin context
func (s *auditContextServiceImpl) CreateAuditEventFromGin(c *gin.Context, action, entityType string, entityID *uuid.UUID, details interface{}) error {
	userCtx, err := s.ExtractUserContext(c)
	if err != nil {
		return fmt.Errorf("failed to extract user context: %w", err)
	}

	return s.CreateAuditEvent(c.Request.Context(), userCtx, action, entityType, entityID, details)
}

// ValidateAuditContext validates that audit context is complete and compliant
func (s *auditContextServiceImpl) ValidateAuditContext(userCtx *AuditUserContext) error {
	// Check for required fields based on authentication type
	switch userCtx.AuthenticationType {
	case "session":
		if userCtx.UserID == uuid.Nil {
			return fmt.Errorf("user ID is required for session-based authentication")
		}
		if userCtx.SessionID == "" {
			return fmt.Errorf("session ID is required for session-based authentication")
		}
		if len(userCtx.Roles) == 0 {
			log.Printf("AuditContext: Warning - No roles found for user %s", userCtx.UserID)
		}
		if len(userCtx.Permissions) == 0 {
			log.Printf("AuditContext: Warning - No permissions found for user %s", userCtx.UserID)
		}

	case "api_key":
		if userCtx.APIKeyIdentifier == "" {
			return fmt.Errorf("API key identifier is required for API key authentication")
		}

	case "system":
		if userCtx.SystemIdentifier == "" {
			return fmt.Errorf("system identifier is required for system authentication")
		}

	default:
		return fmt.Errorf("unknown authentication type: %s", userCtx.AuthenticationType)
	}

	// Check for required metadata
	if userCtx.RequestID == "" {
		return fmt.Errorf("request ID is required for audit traceability")
	}

	if userCtx.ClientIP == "" {
		log.Printf("AuditContext: Warning - No client IP found for request %s", userCtx.RequestID)
	}

	return nil
}

// CreateSystemAuditEvent creates audit event for system operations
func (s *auditContextServiceImpl) CreateSystemAuditEvent(ctx context.Context, systemIdentifier, action, entityType string, entityID *uuid.UUID, details interface{}) error {
	userCtx := &AuditUserContext{
		SystemIdentifier:   systemIdentifier,
		AuthenticationType: "system",
		RequestID:          uuid.New().String(),
		RequestTimestamp:   time.Now().UTC(),
		ClientIP:           "system",
		UserAgent:          fmt.Sprintf("DomainFlow-System-%s", systemIdentifier),
		Permissions:        []string{"system:operation"},
		Roles:              []string{"system"},
	}

	return s.CreateAuditEvent(ctx, userCtx, action, entityType, entityID, details)
}

// CreateAPIKeyAuditEvent creates audit event for API key operations
func (s *auditContextServiceImpl) CreateAPIKeyAuditEvent(ctx context.Context, apiKeyIdentifier, action, entityType string, entityID *uuid.UUID, details interface{}) error {
	userCtx := &AuditUserContext{
		APIKeyIdentifier:   apiKeyIdentifier,
		AuthenticationType: "api_key",
		RequestID:          uuid.New().String(),
		RequestTimestamp:   time.Now().UTC(),
		ClientIP:           "api",
		UserAgent:          fmt.Sprintf("DomainFlow-API-%s", apiKeyIdentifier),
		Permissions:        []string{"api:access"},
		Roles:              []string{"api_user"},
	}

	return s.CreateAuditEvent(ctx, userCtx, action, entityType, entityID, details)
}

// generateSecurityFlags generates security flags based on user context and action
func (s *auditContextServiceImpl) generateSecurityFlags(userCtx *AuditUserContext, action string) []string {
	var flags []string

	// Add flags based on risk score
	if userCtx.RiskScore > 5 {
		flags = append(flags, "high-risk-user")
	}

	// Add flags for password change requirements
	if userCtx.RequiresPasswordChange {
		flags = append(flags, "password-change-required")
	}

	// Add flags for privileged actions
	privilegedActions := []string{"create", "update", "delete", "execute", "admin"}
	for _, privilegedAction := range privilegedActions {
		if action == privilegedAction {
			flags = append(flags, "privileged-action")
			break
		}
	}

	// Add flags for admin roles
	for _, role := range userCtx.Roles {
		if role == "admin" || role == "super_admin" {
			flags = append(flags, "admin-user")
			break
		}
	}

	return flags
}

// generateComplianceFlags generates compliance flags based on action and entity type
func (s *auditContextServiceImpl) generateComplianceFlags(action, entityType string) []string {
	var flags []string

	// Add compliance flags for critical operations
	criticalEntities := []string{"campaign", "user", "system", "config"}
	for _, entity := range criticalEntities {
		if entityType == entity {
			flags = append(flags, "critical-entity")
			break
		}
	}

	// Add flags for data modification operations
	dataModificationActions := []string{"create", "update", "delete"}
	for _, modAction := range dataModificationActions {
		if action == modAction {
			flags = append(flags, "data-modification")
			break
		}
	}

	// Add flags for security-sensitive operations
	securityActions := []string{"login", "logout", "permission_change", "role_change"}
	for _, secAction := range securityActions {
		if action == secAction {
			flags = append(flags, "security-sensitive")
			break
		}
	}

	return flags
}

// generateBusinessContext generates business context based on entity type
func (s *auditContextServiceImpl) generateBusinessContext(entityType string, entityID *uuid.UUID) map[string]interface{} {
	context := make(map[string]interface{})

	context["entity_type"] = entityType
	if entityID != nil {
		context["entity_id"] = entityID.String()
	}

	// Add entity-specific context
	switch entityType {
	case "campaign":
		context["business_domain"] = "campaign_management"
		context["compliance_category"] = "operational"

	case "user":
		context["business_domain"] = "user_management"
		context["compliance_category"] = "security"

	case "system":
		context["business_domain"] = "system_administration"
		context["compliance_category"] = "security"

	case "config":
		context["business_domain"] = "configuration_management"
		context["compliance_category"] = "operational"

	default:
		context["business_domain"] = "general"
		context["compliance_category"] = "operational"
	}

	return context
}

// Helper functions

func getClientIPFromGin(c *gin.Context) string {
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		return forwarded
	}

	realIP := c.GetHeader("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	return c.ClientIP()
}

func nullStringFromString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}
