package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/logging"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
)

// AuthMiddleware provides authentication middleware
type AuthMiddleware struct {
	sessionService          *services.SessionService
	auditContextService     services.AuditContextService
	apiAuthorizationService *services.APIAuthorizationService
	config                  *config.SessionSettings
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(
	sessionService *services.SessionService,
	auditContextService services.AuditContextService,
	apiAuthorizationService *services.APIAuthorizationService,
	sessionConfig *config.SessionSettings,
) *AuthMiddleware {
	return &AuthMiddleware{
		sessionService:          sessionService,
		auditContextService:     auditContextService,
		apiAuthorizationService: apiAuthorizationService,
		config:                  sessionConfig,
	}
}

// SessionAuth validates session-based authentication
func (m *AuthMiddleware) SessionAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		requestID := uuid.New().String()
		ipAddress := getClientIP(c)
		userAgent := c.GetHeader("User-Agent")

		// Log middleware execution start
		logging.LogMiddlewareExecution(
			"session_auth",
			nil,
			nil,
			ipAddress,
			userAgent,
			requestID,
			0,
			true,
			0,
			map[string]interface{}{
				"method": c.Request.Method,
				"path":   c.Request.URL.Path,
				"stage":  "start",
			},
		)

		// Skip OPTIONS requests
		if c.Request.Method == http.MethodOptions {
			duration := time.Since(startTime)
			logging.LogMiddlewareExecution(
				"session_auth",
				nil,
				nil,
				ipAddress,
				userAgent,
				requestID,
				duration,
				true,
				http.StatusOK,
				map[string]interface{}{
					"method": c.Request.Method,
					"path":   c.Request.URL.Path,
					"stage":  "options_skip",
				},
			)
			c.Next()
			return
		}

		// Enhanced session-based CSRF protection through origin validation
		if !m.validateRequestOrigin(c) {
			duration := time.Since(startTime)

			logging.LogMiddlewareExecution(
				"session_auth",
				nil,
				nil,
				ipAddress,
				userAgent,
				requestID,
				duration,
				false,
				http.StatusForbidden,
				map[string]interface{}{
					"method":  c.Request.Method,
					"path":    c.Request.URL.Path,
					"stage":   "origin_validation_failed",
					"origin":  c.GetHeader("Origin"),
					"referer": c.GetHeader("Referer"),
				},
			)

			logging.LogSecurityEvent(
				"session_auth_invalid_origin",
				nil,
				nil,
				ipAddress,
				userAgent,
				&logging.SecurityMetrics{
					RiskScore:          7,
					ThreatLevel:        "high",
					FailedAttempts:     0,
					AccountLocked:      false,
					SuspiciousActivity: true,
				},
				map[string]interface{}{
					"path":    c.Request.URL.Path,
					"method":  c.Request.Method,
					"origin":  c.GetHeader("Origin"),
					"referer": c.GetHeader("Referer"),
				},
			)

			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Invalid request origin",
				"code":  "INVALID_ORIGIN",
			})
			return
		}

		// Get session ID from cookie (try new names first, then fallback to legacy)
		cookieStart := time.Now()
		sessionID, err := c.Cookie(m.config.CookieName)
		if err != nil {
			// Try legacy cookie name for backward compatibility
			sessionID, err = c.Cookie(config.LegacySessionCookieName)
		}
		cookieDuration := time.Since(cookieStart)

		if err != nil {
			duration := time.Since(startTime)

			// Log missing session cookie
			logging.LogMiddlewareExecution(
				"session_auth",
				nil,
				nil,
				ipAddress,
				userAgent,
				requestID,
				duration,
				false,
				http.StatusUnauthorized,
				map[string]interface{}{
					"method":                   c.Request.Method,
					"path":                     c.Request.URL.Path,
					"stage":                    "cookie_missing",
					"error":                    err.Error(),
					"cookie_check_duration_ms": cookieDuration.Milliseconds(),
				},
			)

			// Log security event for missing session
			logging.LogSecurityEvent(
				"session_auth_no_cookie",
				nil,
				nil,
				ipAddress,
				userAgent,
				&logging.SecurityMetrics{
					RiskScore:          3,
					ThreatLevel:        "low",
					FailedAttempts:     0,
					AccountLocked:      false,
					SuspiciousActivity: false,
				},
				map[string]interface{}{
					"path":   c.Request.URL.Path,
					"method": c.Request.Method,
				},
			)

			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			return
		}

		// Log session cookie found
		logging.LogSessionEvent(
			"session_cookie_found",
			nil,
			&sessionID,
			ipAddress,
			userAgent,
			true,
			nil,
			map[string]interface{}{
				"cookie_check_duration_ms": cookieDuration.Milliseconds(),
				"session_id_length":        len(sessionID),
			},
		)

		// Validate session using the session service
		validationStart := time.Now()
		sessionData, err := m.sessionService.ValidateSession(sessionID, ipAddress)
		validationDuration := time.Since(validationStart)

		// Create security context from session data
		var securityContext *models.SecurityContext
		if sessionData != nil {
			securityContext = &models.SecurityContext{
				UserID:                 sessionData.UserID,
				SessionID:              sessionData.ID,
				Permissions:            sessionData.Permissions,
				Roles:                  sessionData.Roles,
				SessionExpiry:          sessionData.ExpiresAt,
				RequiresPasswordChange: sessionData.RequiresPasswordChange,
				RiskScore:              0, // Default risk score
			}
		}

		if err != nil {
			duration := time.Since(startTime)

			// Clear invalid session cookies (session-based approach)
			m.clearSessionCookies(c)

			// Log session validation failure
			logging.LogSessionEvent(
				"session_validation_failed",
				nil,
				&sessionID,
				ipAddress,
				userAgent,
				false,
				nil,
				map[string]interface{}{
					"validation_duration_ms": validationDuration.Milliseconds(),
					"error":                  err.Error(),
				},
			)

			// Determine error type and risk score
			var statusCode int
			var errorMsg string
			var riskScore int
			var threatLevel string

			switch err {
			case services.ErrSessionExpired, services.ErrSessionNotFound:
				statusCode = http.StatusUnauthorized
				errorMsg = "Session expired"
				riskScore = 2
				threatLevel = "low"
			case services.ErrSessionSecurityViolation:
				statusCode = http.StatusForbidden
				errorMsg = "Security violation detected"
				riskScore = 6
				threatLevel = "medium"
			default:
				statusCode = http.StatusInternalServerError
				errorMsg = "Authentication failed"
				riskScore = 5
				threatLevel = "medium"
			}

			// Log security event
			logging.LogSecurityEvent(
				"session_auth_failed",
				nil,
				&sessionID,
				ipAddress,
				userAgent,
				&logging.SecurityMetrics{
					RiskScore:          riskScore,
					ThreatLevel:        threatLevel,
					FailedAttempts:     0,
					AccountLocked:      false,
					SuspiciousActivity: riskScore > 5,
				},
				map[string]interface{}{
					"error_type":             err.Error(),
					"validation_duration_ms": validationDuration.Milliseconds(),
					"path":                   c.Request.URL.Path,
					"method":                 c.Request.Method,
				},
			)

			// Log middleware execution failure
			logging.LogMiddlewareExecution(
				"session_auth",
				nil,
				&sessionID,
				ipAddress,
				userAgent,
				requestID,
				duration,
				false,
				statusCode,
				map[string]interface{}{
					"method":                 c.Request.Method,
					"path":                   c.Request.URL.Path,
					"stage":                  "validation_failed",
					"error":                  err.Error(),
					"validation_duration_ms": validationDuration.Milliseconds(),
				},
			)

			c.AbortWithStatusJSON(statusCode, gin.H{
				"error": errorMsg,
				"code":  m.getErrorCode(err),
			})
			return
		}

		// Log successful session validation
		logging.LogSessionEvent(
			"session_validation_success",
			&securityContext.UserID,
			&sessionID,
			ipAddress,
			userAgent,
			true,
			&securityContext.SessionExpiry,
			map[string]interface{}{
				"validation_duration_ms":   validationDuration.Milliseconds(),
				"user_permissions_count":   len(securityContext.Permissions),
				"user_roles_count":         len(securityContext.Roles),
				"requires_password_change": securityContext.RequiresPasswordChange,
				"risk_score":               securityContext.RiskScore,
			},
		)

		// Store security context for use in handlers
		c.Set("security_context", securityContext)
		c.Set("user_id", securityContext.UserID)
		c.Set("session_id", securityContext.SessionID)
		c.Set("request_id", requestID)

		// Log successful middleware execution
		duration := time.Since(startTime)
		logging.LogMiddlewareExecution(
			"session_auth",
			&securityContext.UserID,
			&sessionID,
			ipAddress,
			userAgent,
			requestID,
			duration,
			true,
			http.StatusOK,
			map[string]interface{}{
				"method":                   c.Request.Method,
				"path":                     c.Request.URL.Path,
				"stage":                    "success",
				"cookie_check_duration_ms": cookieDuration.Milliseconds(),
				"validation_duration_ms":   validationDuration.Milliseconds(),
				"user_permissions_count":   len(securityContext.Permissions),
				"user_roles_count":         len(securityContext.Roles),
				"requires_password_change": securityContext.RequiresPasswordChange,
			},
		)

		c.Next()
	}
}

// DualAuth supports both API key and session authentication
func (m *AuthMiddleware) DualAuth(apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip OPTIONS requests
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Check for API key first
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				if parts[1] == apiKey {
					// Valid API key - set a basic context
					c.Set("auth_type", "api_key")
					c.Next()
					return
				} else {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
						"error": "Invalid API key",
					})
					return
				}
			}
		}

		// Fall back to session authentication
		sessionID, err := c.Cookie(m.config.CookieName)
		if err != nil {
			// Try legacy cookie name
			sessionID, err = c.Cookie(config.LegacySessionCookieName)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error": "Authentication required",
					"code":  "AUTH_REQUIRED",
				})
				return
			}
		}

		// Get client IP
		ipAddress := getClientIP(c)

		// Validate session
		sessionData, err := m.sessionService.ValidateSession(sessionID, ipAddress)
		if err != nil {
			// Clear invalid session cookies
			m.clearSessionCookies(c)

			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication failed",
				"code":  m.getErrorCode(err),
			})
			return
		}

		// Create security context from session data
		securityContext := &models.SecurityContext{
			UserID:                 sessionData.UserID,
			SessionID:              sessionData.ID,
			Permissions:            sessionData.Permissions,
			Roles:                  sessionData.Roles,
			SessionExpiry:          sessionData.ExpiresAt,
			RequiresPasswordChange: sessionData.RequiresPasswordChange,
			RiskScore:              0, // Default risk score
		}

		// Store security context for use in handlers
		c.Set("auth_type", "session")
		c.Set("security_context", securityContext)
		c.Set("user_id", securityContext.UserID)
		c.Set("session_id", securityContext.SessionID)

		c.Next()
	}
}

// getSecurityContext is a helper function to extract and validate security context
func (m *AuthMiddleware) getSecurityContext(c *gin.Context) (*models.SecurityContext, bool) {
	securityContext, exists := c.Get("security_context")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return nil, false
	}

	ctx, ok := securityContext.(*models.SecurityContext)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid security context"})
		c.Abort()
		return nil, false
	}

	return ctx, true
}

// RequirePermission checks if the user has a specific permission
func (m *AuthMiddleware) RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, ok := m.getSecurityContext(c)
		if !ok {
			return
		}

		// Check permission
		if !ctx.HasPermission(permission) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
			})
			return
		}

		c.Next()
	}
}

// RequireRole checks if the user has a specific role
func (m *AuthMiddleware) RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, ok := m.getSecurityContext(c)
		if !ok {
			return
		}

		// Check role
		if !ctx.HasRole(role) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Insufficient privileges",
			})
			return
		}

		c.Next()
	}
}

// RequireAnyRole checks if the user has any of the specified roles
func (m *AuthMiddleware) RequireAnyRole(roles []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, ok := m.getSecurityContext(c)
		if !ok {
			return
		}

		// Check roles
		if !ctx.HasAnyRole(roles) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Insufficient privileges",
			})
			return
		}

		c.Next()
	}
}

// RequireResourceAccess checks if the user can access a resource with a specific action
func (m *AuthMiddleware) RequireResourceAccess(resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get security context
		securityContext, exists := c.Get("security_context")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			return
		}

		ctx, ok := securityContext.(*models.SecurityContext)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid security context"})
			c.Abort()
			return
		}

		// Check resource access
		if !ctx.CanAccess(resource, action) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Access denied",
			})
			return
		}

		c.Next()
	}
}

// EndpointAuthorizationMiddleware performs comprehensive API endpoint authorization (BL-005)
func (m *AuthMiddleware) EndpointAuthorizationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		requestID := c.GetString("request_id")
		if requestID == "" {
			requestID = uuid.New().String()
			c.Set("request_id", requestID)
		}

		// Skip OPTIONS requests
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Skip authorization if API authorization service is not available
		if m.apiAuthorizationService == nil {
			c.Next()
			return
		}

		// Get security context
		securityContext, exists := c.Get("security_context")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required for endpoint authorization",
				"code":  "AUTH_REQUIRED",
			})
			return
		}

		ctx, ok := securityContext.(*models.SecurityContext)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid security context",
				"code":  "INVALID_CONTEXT",
			})
			return
		}

		// Extract resource information
		resourceType := m.extractResourceType(c.Request.URL.Path)
		resourceID := m.extractResourceID(c)
		campaignID := m.extractCampaignID(c)

		// Determine endpoint pattern from route
		endpointPattern := m.extractEndpointPattern(c)

		// Get user role from context
		userRole := m.extractUserRole(ctx)

		// Build authorization request
		authRequest := &models.APIAuthorizationRequest{
			UserID:          ctx.UserID,
			SessionID:       ctx.SessionID,
			RequestID:       requestID,
			EndpointPattern: endpointPattern,
			HTTPMethod:      c.Request.Method,
			ResourceType:    resourceType,
			ResourceID:      resourceID,
			CampaignID:      campaignID,
			UserRole:        userRole,
			RequestContext: map[string]interface{}{
				"path":         c.Request.URL.Path,
				"query_params": c.Request.URL.RawQuery,
				"source_ip":    getClientIP(c),
				"user_agent":   c.GetHeader("User-Agent"),
				"referer":      c.GetHeader("Referer"),
				"timestamp":    startTime,
			},
		}

		// Perform authorization check
		authResult, err := m.apiAuthorizationService.AuthorizeAPIAccess(c.Request.Context(), authRequest)
		if err != nil {
			// Log authorization service error
			logging.LogSecurityEvent(
				"endpoint_authorization_service_error",
				&ctx.UserID,
				&ctx.SessionID,
				getClientIP(c),
				c.GetHeader("User-Agent"),
				&logging.SecurityMetrics{
					RiskScore:   60,
					ThreatLevel: "medium",
				},
				map[string]interface{}{
					"error":            err.Error(),
					"endpoint_pattern": endpointPattern,
					"method":           c.Request.Method,
					"path":             c.Request.URL.Path,
				},
			)

			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "Authorization service error",
				"code":  "AUTHZ_SERVICE_ERROR",
			})
			return
		}

		// Check authorization result
		if !authResult.Authorized {
			// Log access violation
			violation := &models.APIAccessViolation{
				UserID:              ctx.UserID,
				SessionID:           ctx.SessionID,
				EndpointPattern:     endpointPattern,
				HTTPMethod:          c.Request.Method,
				ViolationType:       "endpoint_authorization_denied",
				RequiredPermissions: authResult.RequiredPermissions,
				UserPermissions:     ctx.Permissions,
				ResourceID:          resourceID,
				ViolationDetails: map[string]interface{}{
					"denial_reason":             authResult.Reason,
					"endpoint_pattern":          endpointPattern,
					"resource_type":             resourceType,
					"campaign_id":               campaignID,
					"authorization_duration_ms": authResult.AuthorizationDuration.Milliseconds(),
				},
				SourceIP:       getClientIP(c),
				UserAgent:      c.GetHeader("User-Agent"),
				RequestHeaders: m.extractSafeHeaders(c),
				ResponseStatus: http.StatusForbidden,
			}

			// Log violation asynchronously
			go func() {
				if err := m.apiAuthorizationService.LogAccessViolation(context.Background(), violation); err != nil {
					logging.LogSecurityEvent(
						"access_violation_logging_failed",
						&ctx.UserID,
						&ctx.SessionID,
						getClientIP(c),
						c.GetHeader("User-Agent"),
						&logging.SecurityMetrics{
							RiskScore:   40,
							ThreatLevel: "medium",
						},
						map[string]interface{}{
							"error": err.Error(),
							"path":  c.Request.URL.Path,
						},
					)
				}
			}()

			// Log security event for denied access
			logging.LogSecurityEvent(
				"endpoint_authorization_denied",
				&ctx.UserID,
				&ctx.SessionID,
				getClientIP(c),
				c.GetHeader("User-Agent"),
				&logging.SecurityMetrics{
					RiskScore:          authResult.RiskScore,
					ThreatLevel:        m.calculateThreatLevel(authResult.RiskScore),
					SuspiciousActivity: authResult.RiskScore > 50,
				},
				map[string]interface{}{
					"endpoint_pattern":          endpointPattern,
					"method":                    c.Request.Method,
					"path":                      c.Request.URL.Path,
					"denial_reason":             authResult.Reason,
					"required_permissions":      authResult.RequiredPermissions,
					"authorization_duration_ms": authResult.AuthorizationDuration.Milliseconds(),
					"resource_type":             resourceType,
					"resource_id":               resourceID,
					"campaign_id":               campaignID,
				},
			)

			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":  "Access denied",
				"code":   "ACCESS_DENIED",
				"reason": authResult.Reason,
			})
			return
		}

		// Store authorization result in context for potential use by handlers
		c.Set("authorization_result", authResult)
		c.Set("authorization_duration", authResult.AuthorizationDuration)

		// Log successful authorization
		logging.LogSecurityEvent(
			"endpoint_authorization_granted",
			&ctx.UserID,
			&ctx.SessionID,
			getClientIP(c),
			c.GetHeader("User-Agent"),
			&logging.SecurityMetrics{
				RiskScore:   authResult.RiskScore,
				ThreatLevel: m.calculateThreatLevel(authResult.RiskScore),
			},
			map[string]interface{}{
				"endpoint_pattern":          endpointPattern,
				"method":                    c.Request.Method,
				"path":                      c.Request.URL.Path,
				"authorization_duration_ms": authResult.AuthorizationDuration.Milliseconds(),
				"resource_type":             resourceType,
				"resource_id":               resourceID,
				"campaign_id":               campaignID,
			},
		)

		c.Next()
	}
}

// AuthorizationLoggingMiddleware captures authorization decisions (BL-006)
func (m *AuthMiddleware) AuthorizationLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Get security context if available
		securityContextValue, exists := c.Get("security_context")
		var securityContext *models.SecurityContext
		if exists {
			var ok bool
			securityContext, ok = securityContextValue.(*models.SecurityContext)
			if !ok {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid security context"})
				c.Abort()
				return
			}
		}

		// Create a custom response writer to capture status code
		crw := &customResponseWriter{ResponseWriter: c.Writer, statusCode: http.StatusOK}
		c.Writer = crw

		// Process the request
		c.Next()

		// Log authorization decision after request completion
		m.logAuthorizationDecision(c, securityContext, startTime, crw.statusCode)
	}
}

// customResponseWriter wraps gin.ResponseWriter to capture status code
type customResponseWriter struct {
	gin.ResponseWriter
	statusCode int
}

func (crw *customResponseWriter) WriteHeader(code int) {
	crw.statusCode = code
	crw.ResponseWriter.WriteHeader(code)
}

func (m *AuthMiddleware) logAuthorizationDecision(c *gin.Context, securityContext *models.SecurityContext, startTime time.Time, statusCode int) {
	if m.auditContextService == nil {
		return // Skip logging if audit service not available
	}

	// Determine authorization result
	var decision string
	var riskScore int

	switch {
	case statusCode >= 200 && statusCode < 300:
		decision = "allow"
		riskScore = 10
	case statusCode == http.StatusUnauthorized:
		decision = "deny"
		riskScore = 50
	case statusCode == http.StatusForbidden:
		decision = "deny"
		riskScore = 70
	default:
		decision = "error"
		riskScore = 40
	}

	// Extract resource information
	resourceType := m.extractResourceType(c.Request.URL.Path)
	resourceID := m.extractResourceID(c)

	// Build authorization context
	authCtx := &services.EnhancedAuthorizationContext{
		Action:       c.Request.Method,
		Decision:     decision,
		RiskScore:    riskScore,
		ResourceType: resourceType,
		Timestamp:    time.Now(),
		RequestContext: map[string]interface{}{
			"path":             c.Request.URL.Path,
			"method":           c.Request.Method,
			"status_code":      statusCode,
			"ip_address":       getClientIP(c),
			"user_agent":       c.GetHeader("User-Agent"),
			"request_duration": time.Since(startTime).Milliseconds(),
			"request_id":       c.GetString("request_id"),
			"auth_type":        c.GetString("auth_type"),
		},
	}

	// Add user context if available
	if securityContext != nil {
		authCtx.UserID = securityContext.UserID
		authCtx.RequestContext["session_id"] = securityContext.SessionID
		authCtx.RequestContext["user_permissions"] = len(securityContext.Permissions)
		authCtx.RequestContext["user_roles"] = len(securityContext.Roles)
		authCtx.RequestContext["requires_password_change"] = securityContext.RequiresPasswordChange
	}

	// Add resource ID if available
	if resourceID != "" {
		authCtx.ResourceID = resourceID
		authCtx.RequestContext["resource_id"] = resourceID
	}

	// Log authorization decision asynchronously to avoid blocking the response
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := m.auditContextService.LogAuthorizationDecision(ctx, authCtx); err != nil {
			// Log error but don't fail the request
			logging.LogSecurityEvent(
				"authorization_audit_logging_failed",
				&authCtx.UserID,
				nil,
				getClientIP(c),
				c.GetHeader("User-Agent"),
				&logging.SecurityMetrics{
					RiskScore:   30,
					ThreatLevel: "low",
				},
				map[string]interface{}{
					"error": err.Error(),
					"path":  c.Request.URL.Path,
				},
			)
		}
	}()
}

func (m *AuthMiddleware) extractResourceType(path string) string {
	// Extract resource type from URL path
	pathSegments := strings.Split(strings.Trim(path, "/"), "/")

	if len(pathSegments) == 0 {
		return "unknown"
	}

	// Map common API endpoints to resource types
	switch {
	case strings.Contains(path, "/api/campaigns"):
		return "campaign"
	case strings.Contains(path, "/api/domains"):
		return "domain"
	case strings.Contains(path, "/api/users"):
		return "user"
	case strings.Contains(path, "/api/sessions"):
		return "session"
	case strings.Contains(path, "/api/admin"):
		return "admin_panel"
	case strings.Contains(path, "/api/reports"):
		return "report"
	case strings.Contains(path, "/api/analytics"):
		return "analytics"
	default:
		// Use the first segment after 'api' as resource type
		for i, segment := range pathSegments {
			if segment == "api" && i+1 < len(pathSegments) {
				return pathSegments[i+1]
			}
		}
		return pathSegments[0]
	}
}

func (m *AuthMiddleware) extractResourceID(c *gin.Context) string {
	// Try to extract resource ID from URL parameters
	if id := c.Param("id"); id != "" {
		return id
	}
	if id := c.Param("campaign_id"); id != "" {
		return id
	}
	if id := c.Param("domain_id"); id != "" {
		return id
	}
	if id := c.Param("user_id"); id != "" {
		return id
	}

	// Try to extract from query parameters
	if id := c.Query("id"); id != "" {
		return id
	}

	return ""
}

// validateRequestOrigin checks if the request origin is allowed for session-based CSRF protection
func (m *AuthMiddleware) validateRequestOrigin(c *gin.Context) bool {
	origin := c.GetHeader("Origin")
	referer := c.GetHeader("Referer")
	host := c.Request.Host

	// Check if origin validation is required
	if !m.config.RequireOriginValidation {
		return true
	}

	// Build allowed origins list
	allowedOrigins := m.config.AllowedOrigins
	if len(allowedOrigins) == 0 {
		// Default allowed origins based on host
		allowedOrigins = []string{
			fmt.Sprintf("https://%s", host),
			fmt.Sprintf("http://%s", host), // Development only
		}
	}

	// Check origin header
	for _, allowed := range allowedOrigins {
		if origin == allowed {
			return true
		}
	}

	// Check referer header as fallback
	for _, allowed := range allowedOrigins {
		if strings.HasPrefix(referer, allowed) {
			return true
		}
	}

	// For API requests, require custom header as additional session-based CSRF protection
	if m.config.RequireCustomHeader {
		headerValue := c.GetHeader(m.config.CustomHeaderName)
		if !m.config.ValidateCustomHeader(headerValue) {
			return false
		}
		return true // Custom header validated successfully
	}

	return false
}

// clearSessionCookies clears all session-related cookies
func (m *AuthMiddleware) clearSessionCookies(c *gin.Context) {
	// Clear new session cookie
	c.SetCookie(
		m.config.CookieName,
		"",
		-1,
		m.config.CookiePath,
		m.config.CookieDomain,
		m.config.CookieSecure,
		m.config.CookieHttpOnly,
	)

	// Clear legacy cookies for backward compatibility
	c.SetCookie(config.LegacySessionCookieName, "", -1, config.CookiePath, "", config.CookieSecure, config.CookieHttpOnly)
	c.SetCookie(config.AuthTokensCookieName, "", -1, config.CookiePath, "", config.CookieSecure, false)
}

// getErrorCode returns appropriate error code based on the error type
func (m *AuthMiddleware) getErrorCode(err error) string {
	switch err {
	case services.ErrSessionExpired:
		return "SESSION_EXPIRED"
	case services.ErrSessionNotFound:
		return "SESSION_NOT_FOUND"
	case services.ErrSessionSecurityViolation:
		return "SECURITY_VIOLATION"
	case services.ErrSessionSecurityViolation:
		return "SECURITY_VIOLATION"
	default:
		return "INVALID_SESSION"
	}
}

// SecurityHeadersMiddleware adds security headers
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Add security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Only add HSTS in production with HTTPS
		if c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		c.Next()
	}
}

// ContentTypeValidationMiddleware validates content type for enhanced security
func ContentTypeValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodOptions {
			contentType := c.GetHeader("Content-Type")
			if !strings.Contains(contentType, "application/json") {
				c.JSON(http.StatusUnsupportedMediaType, gin.H{
					"error": "Invalid content type",
					"code":  "INVALID_CONTENT_TYPE",
				})
				c.Abort()
				return
			}
		}
		c.Next()
	}
}

// getClientIP extracts the real client IP address
func getClientIP(c *gin.Context) string {
	// Check for forwarded IP first
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		// Take the first IP if multiple are present
		ips := strings.Split(forwarded, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check for real IP header
	realIP := c.GetHeader("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to remote address
	return c.ClientIP()
}

// extractCampaignID extracts campaign ID from the request context
func (m *AuthMiddleware) extractCampaignID(c *gin.Context) string {
	// Try URL parameters first
	if id := c.Param("campaign_id"); id != "" {
		return id
	}

	// Try query parameters
	if id := c.Query("campaign_id"); id != "" {
		return id
	}

	// Check if this is a campaign endpoint with ID parameter
	if id := c.Param("id"); id != "" {
		path := c.Request.URL.Path
		if strings.Contains(path, "/campaigns/") {
			return id
		}
	}

	return ""
}

// extractEndpointPattern converts the current route to an authorization pattern
func (m *AuthMiddleware) extractEndpointPattern(c *gin.Context) string {
	path := c.Request.URL.Path

	// Handle specific patterns based on the tactical plan
	switch {
	case strings.HasPrefix(path, "/api/campaigns/") && strings.Contains(path, "/personas"):
		return "/api/campaigns/:campaign_id/personas*"
	case strings.HasPrefix(path, "/api/campaigns/"):
		if strings.Count(path, "/") == 3 { // /api/campaigns/{id}
			return "/api/campaigns/:id"
		}
		return "/api/campaigns*"
	case strings.HasPrefix(path, "/api/personas/"):
		if strings.Count(path, "/") == 3 { // /api/personas/{id}
			return "/api/personas/:id"
		}
		return "/api/personas*"
	case strings.HasPrefix(path, "/api/admin/"):
		return "/api/admin*"
	case strings.HasPrefix(path, "/api/proxies/"):
		if strings.Count(path, "/") == 3 { // /api/proxies/{id}
			return "/api/proxies/:id"
		}
		return "/api/proxies*"
	case strings.HasPrefix(path, "/api/keywords/"):
		return "/api/keywords*"
	case strings.HasPrefix(path, "/api/health"):
		return "/api/health"
	case strings.HasPrefix(path, "/api/"):
		// Generic API endpoint
		pathParts := strings.Split(strings.Trim(path, "/"), "/")
		if len(pathParts) >= 2 {
			return fmt.Sprintf("/api/%s*", pathParts[1])
		}
		return "/api/*"
	default:
		return path
	}
}

// extractUserRole extracts the user role from security context
func (m *AuthMiddleware) extractUserRole(ctx *models.SecurityContext) string {
	if len(ctx.Roles) == 0 {
		return "user" // Default role
	}

	// Check for admin role first
	for _, role := range ctx.Roles {
		if role == "admin" || role == "administrator" {
			return "admin"
		}
	}

	// Return first role if no admin role found
	return ctx.Roles[0]
}

// extractSafeHeaders extracts safe headers for logging (excluding sensitive data)
func (m *AuthMiddleware) extractSafeHeaders(c *gin.Context) map[string]interface{} {
	safeHeaders := make(map[string]interface{})

	// List of headers that are safe to log
	safeHeaderNames := []string{
		"Content-Type",
		"Accept",
		"User-Agent",
		"X-Forwarded-For",
		"X-Real-IP",
		"Referer",
		"Origin",
		"X-Requested-With",
		"Cache-Control",
		"Pragma",
	}

	for _, headerName := range safeHeaderNames {
		if value := c.GetHeader(headerName); value != "" {
			safeHeaders[headerName] = value
		}
	}

	return safeHeaders
}

// calculateThreatLevel determines threat level based on risk score
func (m *AuthMiddleware) calculateThreatLevel(riskScore int) string {
	switch {
	case riskScore >= 80:
		return "critical"
	case riskScore >= 60:
		return "high"
	case riskScore >= 40:
		return "medium"
	case riskScore >= 20:
		return "low"
	default:
		return "minimal"
	}
}
