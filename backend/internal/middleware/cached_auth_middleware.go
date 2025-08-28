//go:build legacy_gin
// +build legacy_gin

package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/logging"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/utils"
)

// CachedAuthMiddleware provides high-performance authentication with distributed caching
type CachedAuthMiddleware struct {
	cachedSessionService *services.CachedSessionService
	config               *config.SessionSettings
}

// NewCachedAuthMiddleware creates a new cached authentication middleware
func NewCachedAuthMiddleware(
	cachedSessionService *services.CachedSessionService,
	sessionConfig *config.SessionSettings,
) *CachedAuthMiddleware {
	return &CachedAuthMiddleware{
		cachedSessionService: cachedSessionService,
		config:               sessionConfig,
	}
}

// FastSessionAuth provides lightning-fast session validation with Redis caching
func (m *CachedAuthMiddleware) FastSessionAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		requestID := uuid.New().String()
		ipAddress := utils.GetClientIP(c)
		userAgent := c.GetHeader("User-Agent")

		// Skip OPTIONS requests immediately
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Enhanced origin validation for session-based CSRF protection
		if !m.validateRequestOrigin(c) {
			duration := time.Since(startTime)

			logging.LogSecurityEvent(
				"cached_auth_invalid_origin",
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
					"path":                   c.Request.URL.Path,
					"method":                 c.Request.Method,
					"origin":                 c.GetHeader("Origin"),
					"referer":                c.GetHeader("Referer"),
					"validation_duration_ms": duration.Milliseconds(),
				},
			)

			respondWithErrorMiddleware(c, http.StatusForbidden, ErrorCodeForbidden, "Invalid request origin")
			return
		}

		// Get session ID from cookie
		sessionID, err := c.Cookie(m.config.CookieName)
		cookieSource := m.config.CookieName

		if err != nil {
			duration := time.Since(startTime)

			// Log missing session efficiently (reduced verbosity)
			logging.LogSessionEvent(
				"cached_auth_no_cookie",
				nil,
				nil,
				ipAddress,
				userAgent,
				false,
				nil,
				map[string]interface{}{
					"path":                   c.Request.URL.Path,
					"method":                 c.Request.Method,
					"validation_duration_ms": duration.Milliseconds(),
				},
			)

			respondWithErrorMiddleware(c, http.StatusUnauthorized, ErrorCodeUnauthorized, "Authentication required")
			return
		}

		// FAST PATH: Use cached session validation (eliminates database hit)
		validationStart := time.Now()
		sessionData, err := m.cachedSessionService.ValidateSession(sessionID, ipAddress)
		validationDuration := time.Since(validationStart)

		if err != nil {
			duration := time.Since(startTime)

			// Clear invalid session cookies
			m.clearSessionCookies(c)

			// Determine error type for appropriate response
			var statusCode int
			var errorMsg string
			var riskScore int

			switch err {
			case services.ErrSessionExpired, services.ErrSessionNotFound:
				statusCode = http.StatusUnauthorized
				errorMsg = "Session expired"
				riskScore = 2
			case services.ErrSessionSecurityViolation:
				statusCode = http.StatusForbidden
				errorMsg = "Security violation detected"
				riskScore = 6
			default:
				statusCode = http.StatusInternalServerError
				errorMsg = "Authentication failed"
				riskScore = 5
			}

			// Log authentication failure (reduced verbosity)
			if validationDuration > 100*time.Millisecond || riskScore > 3 {
				threatLevel := "medium"
				if riskScore > 5 {
					threatLevel = "high"
				}

				logging.LogSecurityEvent(
					"cached_auth_failed",
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
						"total_duration_ms":      duration.Milliseconds(),
						"path":                   c.Request.URL.Path,
						"cookie_source":          cookieSource,
					},
				)
			}

			errorCode := ErrorCodeInternalServer
			switch statusCode {
			case http.StatusUnauthorized:
				errorCode = ErrorCodeUnauthorized
			case http.StatusForbidden:
				errorCode = ErrorCodeForbidden
			}

			respondWithErrorMiddleware(c, statusCode, errorCode, errorMsg)
			return
		}

		// Create security context from validated session
		securityContext := &models.SecurityContext{
			UserID:                 sessionData.UserID,
			SessionID:              sessionData.ID,
			SessionExpiry:          sessionData.ExpiresAt,
			RequiresPasswordChange: sessionData.RequiresPasswordChange,
			RiskScore:              0, // Default risk score
		}

		// Store security context for handlers
		c.Set("security_context", securityContext)
		c.Set("user_id", securityContext.UserID)
		c.Set("session_id", securityContext.SessionID)
		c.Set("request_id", requestID)

		duration := time.Since(startTime)

		// Log successful authentication (only for slow operations to reduce noise)
		if validationDuration > 50*time.Millisecond {
			logging.LogSessionEvent(
				"cached_auth_success_slow",
				&securityContext.UserID,
				&sessionID,
				ipAddress,
				userAgent,
				true,
				&securityContext.SessionExpiry,
				map[string]interface{}{
					"validation_duration_ms": validationDuration.Milliseconds(),
					"total_duration_ms":      duration.Milliseconds(),
					"path":                   c.Request.URL.Path,
					"cookie_source":          cookieSource,
				},
			)
		}

		c.Next()
	}
}

// FastDualAuth supports both API key and cached session authentication
func (m *CachedAuthMiddleware) FastDualAuth(apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip OPTIONS requests
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Check for API key first (no caching needed for API keys)
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				providedKey := authHeader[7:]
				if providedKey == apiKey {
					// Valid API key - set basic context
					c.Set("auth_type", "api_key")
					c.Next()
					return
				} else {
					respondWithErrorMiddleware(c, http.StatusUnauthorized, ErrorCodeUnauthorized, "Invalid API key")
					return
				}
			}
		}

		// Fall back to cached session authentication
		sessionID, err := c.Cookie(m.config.CookieName)
		if err != nil {
			respondWithErrorMiddleware(c, http.StatusUnauthorized, ErrorCodeUnauthorized, "Authentication required")
			return
		}

		// Get client IP
		ipAddress := utils.GetClientIP(c)

		// Use cached session validation
		sessionData, err := m.cachedSessionService.ValidateSession(sessionID, ipAddress)
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
			RiskScore:              0,
		}

		// Store security context for handlers
		c.Set("auth_type", "session")
		c.Set("security_context", securityContext)
		c.Set("user_id", securityContext.UserID)
		c.Set("session_id", securityContext.SessionID)

		c.Next()
	}
}

// GetCacheMetrics returns authentication cache performance metrics
func (m *CachedAuthMiddleware) GetCacheMetrics() map[string]interface{} {
	if m.cachedSessionService == nil {
		return map[string]interface{}{
			"status": "not_available",
		}
	}

	metrics := m.cachedSessionService.GetCacheMetrics()
	metrics["middleware_type"] = "cached_auth"
	metrics["timestamp"] = time.Now().Format(time.RFC3339)

	return metrics
}

// HealthCheck verifies cached authentication system health
func (m *CachedAuthMiddleware) HealthCheck() map[string]interface{} {
	health := map[string]interface{}{
		"middleware_status": "healthy",
		"timestamp":         time.Now().Format(time.RFC3339),
	}

	if m.cachedSessionService != nil {
		serviceHealth := m.cachedSessionService.HealthCheck()
		health["session_service"] = serviceHealth
	} else {
		health["session_service"] = map[string]interface{}{
			"status": "not_configured",
		}
	}

	return health
}

// Private helper methods

func (m *CachedAuthMiddleware) validateRequestOrigin(c *gin.Context) bool {
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
		if len(referer) > len(allowed) && referer[:len(allowed)] == allowed {
			return true
		}
	}

	// For API requests, require custom header as additional CSRF protection
	if m.config.RequireCustomHeader {
		headerValue := c.GetHeader(m.config.CustomHeaderName)
		if !m.config.ValidateCustomHeader(headerValue) {
			return false
		}
		return true
	}

	return false
}

func (m *CachedAuthMiddleware) clearSessionCookies(c *gin.Context) {
	// For localhost development, set domain to empty string
	domain := ""
	if m.config.CookieDomain != "localhost" && m.config.CookieDomain != "" {
		domain = m.config.CookieDomain
	}

	// Use configured SameSite setting
	var sameSiteMode http.SameSite
	switch m.config.CookieSameSite {
	case "Strict":
		sameSiteMode = http.SameSiteStrictMode
	case "None":
		sameSiteMode = http.SameSiteNoneMode
	default:
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

	// Clear auth tokens cookie
	c.SetCookie(config.AuthTokensCookieName, "", -1, "/", "", m.config.CookieSecure, false)
}
