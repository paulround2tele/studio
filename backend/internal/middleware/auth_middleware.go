package middleware

import (
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
	"github.com/fntelecomllc/studio/backend/internal/utils"
)

// AuthMiddleware provides authentication middleware
type AuthMiddleware struct {
	sessionService *services.SessionService
	config         *config.SessionSettings
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(sessionService *services.SessionService, sessionConfig *config.SessionSettings) *AuthMiddleware {
	return &AuthMiddleware{
		sessionService: sessionService,
		config:         sessionConfig,
	}
}

// SessionAuth validates session-based authentication
func (m *AuthMiddleware) SessionAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		requestID := uuid.New().String()
		ipAddress := utils.GetClientIP(c)
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

			respondWithErrorMiddleware(c, http.StatusForbidden, ErrorCodeForbidden, "Invalid request origin")
			return
		}

		// DIAGNOSTIC: Log all cookies received
		allCookies := c.Request.Header.Get("Cookie")
		fmt.Printf("[DIAGNOSTIC] Auth middleware cookie check: path=%s, allCookies=%s, timestamp=%s\n",
			c.Request.URL.Path, allCookies, time.Now().Format(time.RFC3339))

		// Get session ID from cookie (try new names first, then fallback to legacy)
		cookieStart := time.Now()
		sessionID, err := c.Cookie(m.config.CookieName)
		cookieSource := m.config.CookieName
		if err != nil {
			// Try legacy cookie name for backward compatibility
			sessionID, err = c.Cookie(config.LegacySessionCookieName)
			cookieSource = config.LegacySessionCookieName
		}
		cookieDuration := time.Since(cookieStart)

		// DIAGNOSTIC: Log cookie extraction result
		fmt.Printf("[DIAGNOSTIC] Cookie extraction: cookieName=%s, found=%v, sessionIDLength=%d, error=%v\n",
			cookieSource, err == nil, len(sessionID), err)

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

			respondWithErrorMiddleware(c, http.StatusUnauthorized, ErrorCodeUnauthorized, "Authentication required")
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

			errorCode := ErrorCodeInternalServer
			switch statusCode {
			case http.StatusUnauthorized:
				errorCode = ErrorCodeUnauthorized
			case http.StatusForbidden:
				errorCode = ErrorCodeForbidden
			default:
				errorCode = ErrorCodeInternalServer
			}
			respondWithErrorMiddleware(c, statusCode, errorCode, errorMsg)
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
					respondWithErrorMiddleware(c, http.StatusUnauthorized, ErrorCodeUnauthorized, "Invalid API key")
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
				respondWithErrorMiddleware(c, http.StatusUnauthorized, ErrorCodeUnauthorized, "Authentication required")
				return
			}
		}

		// Get client IP
		ipAddress := utils.GetClientIP(c)

		// Validate session
		sessionData, err := m.sessionService.ValidateSession(sessionID, ipAddress)
		if err != nil {
			// Clear invalid session cookies
			m.clearSessionCookies(c)

			respondWithErrorMiddleware(c, http.StatusUnauthorized, ErrorCodeUnauthorized, "Authentication failed")
			return
		}

		// Create security context from session data
		securityContext := &models.SecurityContext{
			UserID:                 sessionData.UserID,
			SessionID:              sessionData.ID,
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
	// For localhost development, set domain to empty string to avoid domain issues
	domain := ""
	if m.config.CookieDomain != "localhost" && m.config.CookieDomain != "" {
		domain = m.config.CookieDomain
	}

	// Use configured SameSite setting for consistency
	var sameSiteMode http.SameSite
	switch m.config.CookieSameSite {
	case "Strict":
		sameSiteMode = http.SameSiteStrictMode
	case "None":
		sameSiteMode = http.SameSiteNoneMode
	default: // "Lax" or any other value
		sameSiteMode = http.SameSiteLaxMode
	}
	c.SetSameSite(sameSiteMode)
	c.SetCookie(
		m.config.CookieName,
		"",
		-1,
		m.config.CookiePath,
		domain,
		m.config.CookieSecure,
		m.config.CookieHttpOnly,
	)

	// Clear legacy cookies for backward compatibility
	c.SetCookie(config.LegacySessionCookieName, "", -1, "/", "", m.config.CookieSecure, true)
	c.SetCookie(config.AuthTokensCookieName, "", -1, "/", "", m.config.CookieSecure, false)
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
		if c.Request.Method != "GET" && c.Request.Method != "OPTIONS" {
			contentType := c.GetHeader("Content-Type")
			if !strings.Contains(contentType, "application/json") {
				requestID := c.GetHeader("X-Request-ID")
				if requestID == "" {
					requestID = uuid.New().String()
				}
				respondWithErrorMiddleware(c, http.StatusUnsupportedMediaType, ErrorCodeBadRequest, "Invalid content type")
				c.Abort()
				return
			}
		}
		c.Next()
	}
}
