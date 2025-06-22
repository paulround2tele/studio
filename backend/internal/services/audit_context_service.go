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

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

const (
	authTypeSession       = "session"
	authTypeAPIKey        = "api_key"
	authTypeSystem        = "system"
	complianceOperational = "operational"
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

	// BL-006: Enhanced authorization context logging
	LogAuthorizationDecision(ctx context.Context, authCtx *EnhancedAuthorizationContext) error
}

// EnhancedAuthorizationContext captures complete authorization decision context (BL-006)
type EnhancedAuthorizationContext struct {
	UserID              uuid.UUID              `json:"user_id"`
	SessionID           string                 `json:"session_id"`
	RequestID           string                 `json:"request_id"`
	ResourceType        string                 `json:"resource_type"`
	ResourceID          string                 `json:"resource_id"`
	Action              string                 `json:"action"`
	Decision            string                 `json:"decision"`
	PolicyVersion       string                 `json:"policy_version"`
	EvaluatedPolicies   []string               `json:"evaluated_policies"`
	PermissionsRequired []string               `json:"permissions_required"`
	PermissionsGranted  []string               `json:"permissions_granted"`
	DenialReason        string                 `json:"denial_reason,omitempty"`
	RiskScore           int                    `json:"risk_score"`
	RequestContext      map[string]interface{} `json:"request_context"`
	Timestamp           time.Time              `json:"timestamp"`
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
	db            *sqlx.DB // For direct database operations (BL-006)
}

// NewAuditContextService creates a new audit context service
func NewAuditContextService(auditLogStore store.AuditLogStore) AuditContextService {
	return &auditContextServiceImpl{
		auditLogStore: auditLogStore,
	}
}

// NewAuditContextServiceWithDB creates a new audit context service with database support (BL-006)
func NewAuditContextServiceWithDB(auditLogStore store.AuditLogStore, db *sqlx.DB) AuditContextService {
	return &auditContextServiceImpl{
		auditLogStore: auditLogStore,
		db:            db,
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
		if reqIDStr, ok := requestID.(string); ok {
			userCtx.RequestID = reqIDStr
		}
	} else {
		userCtx.RequestID = uuid.New().String()
	}

	switch authType {
	case authTypeSession:
		if err := s.extractSessionContext(c, userCtx); err != nil {
			return nil, fmt.Errorf("failed to extract session context: %w", err)
		}
		userCtx.AuthenticationType = authTypeSession

	case authTypeAPIKey:
		s.extractAPIKeyContext(userCtx)
		userCtx.AuthenticationType = authTypeAPIKey

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

	ctx, ok := securityContext.(*models.SecurityContext)
	if !ok {
		return fmt.Errorf("invalid security context type")
	}

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
func (s *auditContextServiceImpl) extractAPIKeyContext(userCtx *AuditUserContext) {
	// For API key authentication, we need to create a system-like context
	// since API keys don't have user sessions
	userCtx.APIKeyIdentifier = authTypeAPIKey // This should be enhanced to include actual API key identifier
	userCtx.UserID = uuid.Nil                 // API keys don't have associated users in this implementation

	// API keys have limited permissions - define based on your system
	userCtx.Permissions = []string{"api:access"}
	userCtx.Roles = []string{"api_user"}
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
	} else if userCtx.AuthenticationType == authTypeSystem {
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
		context["compliance_category"] = complianceOperational

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

// LogAuthorizationDecision logs comprehensive authorization context (BL-006)
func (s *auditContextServiceImpl) LogAuthorizationDecision(
	ctx context.Context,
	authCtx *EnhancedAuthorizationContext,
) error {
	// Validate required fields
	if authCtx.UserID == uuid.Nil || authCtx.Action == "" || authCtx.Decision == "" {
		return fmt.Errorf("invalid authorization context: missing required fields")
	}

	// If no database connection available, fall back to standard audit logging
	if s.db == nil {
		log.Printf("WARNING: No database connection for enhanced authorization logging, falling back to standard audit")
		return s.logAuthorizationFallback(ctx, authCtx)
	}

	// Prepare context for database
	contextJSON, err := json.Marshal(authCtx.RequestContext)
	if err != nil {
		return fmt.Errorf("failed to marshal request context: %w", err)
	}

	// Log using PostgreSQL function
	var securityEventID uuid.UUID
	query := `SELECT log_authorization_decision($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	err = s.db.QueryRowContext(
		ctx, query,
		authCtx.UserID,
		authCtx.ResourceType,
		authCtx.ResourceID,
		authCtx.Action,
		authCtx.Decision,
		pq.Array(authCtx.EvaluatedPolicies),
		json.RawMessage(contextJSON),
		json.RawMessage(contextJSON),
		authCtx.RiskScore,
	).Scan(&securityEventID)

	if err != nil {
		return fmt.Errorf("failed to log authorization decision: %w", err)
	}

	// Emit security event for real-time monitoring
	if authCtx.RiskScore > 50 {
		s.emitHighRiskSecurityEvent(securityEventID, authCtx)
	}

	return nil
}

// logAuthorizationFallback provides fallback logging when database connection is unavailable
func (s *auditContextServiceImpl) logAuthorizationFallback(ctx context.Context, authCtx *EnhancedAuthorizationContext) error {
	// Create standard audit log entry with authorization context
	details := map[string]interface{}{
		"authorization_decision": authCtx.Decision,
		"permissions_required":   authCtx.PermissionsRequired,
		"permissions_granted":    authCtx.PermissionsGranted,
		"risk_score":             authCtx.RiskScore,
		"denial_reason":          authCtx.DenialReason,
		"request_context":        authCtx.RequestContext,
		"evaluated_policies":     authCtx.EvaluatedPolicies,
		"policy_version":         authCtx.PolicyVersion,
	}

	// Use existing audit context service for fallback
	userCtx := &AuditUserContext{
		UserID:             authCtx.UserID,
		SessionID:          authCtx.SessionID,
		RequestID:          authCtx.RequestID,
		RequestTimestamp:   authCtx.Timestamp,
		AuthenticationType: "session", // Default assumption
	}

	// Extract request context if available
	if authCtx.RequestContext != nil {
		if clientIP, ok := authCtx.RequestContext["source_ip"].(string); ok {
			userCtx.ClientIP = clientIP
		}
		if userAgent, ok := authCtx.RequestContext["user_agent"].(string); ok {
			userCtx.UserAgent = userAgent
		}
		if method, ok := authCtx.RequestContext["method"].(string); ok {
			userCtx.HTTPMethod = method
		}
		if path, ok := authCtx.RequestContext["path"].(string); ok {
			userCtx.RequestPath = path
		}
	}

	var entityID *uuid.UUID
	if authCtx.ResourceID != "" {
		if id, err := uuid.Parse(authCtx.ResourceID); err == nil {
			entityID = &id
		}
	}

	return s.CreateAuditEvent(ctx, userCtx, authCtx.Action, authCtx.ResourceType, entityID, details)
}

// emitHighRiskSecurityEvent emits security events for high-risk authorization decisions
func (s *auditContextServiceImpl) emitHighRiskSecurityEvent(securityEventID uuid.UUID, authCtx *EnhancedAuthorizationContext) {
	log.Printf("HIGH RISK SECURITY EVENT: User %s, Action %s, Decision %s, Risk Score %d, Event ID %s",
		authCtx.UserID, authCtx.Action, authCtx.Decision, authCtx.RiskScore, securityEventID)

	// Additional alerting logic could be added here
	// For example: integration with monitoring systems, webhooks, etc.
}
