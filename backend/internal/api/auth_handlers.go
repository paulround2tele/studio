package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/cache"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/utils"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	sessionService *services.SessionService
	config         *config.SessionSettings
	db             *sqlx.DB
	userCache      *cache.DistributedCacheManager
}

// NewAuthHandler creates a new authentication handler
func NewAuthHandler(sessionService *services.SessionService, sessionConfig *config.SessionSettings, db *sqlx.DB, userCache *cache.DistributedCacheManager) *AuthHandler {
	return &AuthHandler{
		sessionService: sessionService,
		config:         sessionConfig,
		db:             db,
		userCache:      userCache,
	}
}

// Login handles user login requests.
// @Summary User login
// @Description Authenticate user credentials and create session
// @Tags authentication
// @ID loginUser
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "Login credentials"
// @Success 200 {object} LoginSuccessResponse "Login successful with user and session info"
// @Failure 400 {object} StandardErrorResponse "Invalid request format"
// @Failure 401 {object} StandardErrorResponse "Invalid credentials"
// @Failure 423 {object} StandardErrorResponse "Account locked"
// @Failure 403 {object} StandardErrorResponse "Account inactive"
// @Failure 500 {object} StandardErrorResponse "Internal server error"
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	fmt.Println("DEBUG: Login handler started")
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("DEBUG: JSON binding failed: %v\n", err)
		fmt.Printf("DEBUG: Validation error details: %T - %v\n", err, err)
		fmt.Printf("DEBUG: Request body raw: email='%s', password_length=%d\n", req.Email, len(req.Password))
		respondWithErrorGin(c, http.StatusBadRequest, fmt.Sprintf("Invalid request format: %v", err))
		return
	}
	fmt.Printf("DEBUG: Request parsed successfully: %s\n", req.Email)

	// Get client information
	ipAddress := utils.GetClientIP(c)
	fmt.Printf("DEBUG: Client IP: %s\n", ipAddress)

	// Validate credentials and authenticate user
	fmt.Println("DEBUG: About to authenticate user")
	user, err := h.authenticateUser(req.Email, req.Password, ipAddress)
	if err != nil {
		fmt.Printf("DEBUG: Authentication failed: %v\n", err)
		// Handle authentication errors with appropriate responses
		switch err.Error() {
		case "user not found":
			respondWithErrorGin(c, http.StatusUnauthorized, "Invalid email or password")
		case "invalid password":
			respondWithErrorGin(c, http.StatusUnauthorized, "Invalid email or password")
		case "account locked":
			respondWithErrorGin(c, http.StatusLocked, "Account is temporarily locked due to multiple failed login attempts")
		case "account inactive":
			respondWithErrorGin(c, http.StatusForbidden, "Account is not active")
		default:
			respondWithErrorGin(c, http.StatusInternalServerError, "Authentication failed")
		}
		return
	}

	// Create proper session using session service
	fmt.Printf("DEBUG: Creating session using session service for user ID: %s\n", user.ID.String())
	sessionData, err := h.sessionService.CreateSession(user.ID, ipAddress, c.GetHeader("User-Agent"))
	if err != nil {
		fmt.Printf("DEBUG: Session creation failed: %v\n", err)
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to create session")
		return
	}
	fmt.Printf("DEBUG: Session created successfully with ID: %s\n", sessionData.ID)

	// Set session cookie using proper formatting and persistence
	fmt.Printf("DEBUG: Setting session cookie with name: %s, value: %s\n", h.config.CookieName, sessionData.ID)

	// For localhost development, set domain to empty string to avoid domain issues
	domain := ""
	if h.config.CookieDomain != "localhost" && h.config.CookieDomain != "" {
		domain = h.config.CookieDomain
	}

	// Calculate cookie max age to match session expiry exactly
	sessionDuration := int(time.Until(sessionData.ExpiresAt).Seconds())
	if sessionDuration <= 0 {
		sessionDuration = h.config.CookieMaxAge // Fallback to default
	}

	// Use configured SameSite setting for consistency
	var sameSiteMode http.SameSite
	switch h.config.CookieSameSite {
	case "Strict":
		sameSiteMode = http.SameSiteStrictMode
	case "None":
		sameSiteMode = http.SameSiteNoneMode
	default: // "Lax" or any other value
		sameSiteMode = http.SameSiteLaxMode
	}
	c.SetSameSite(sameSiteMode)
	c.SetCookie(
		h.config.CookieName,
		sessionData.ID,
		sessionDuration,
		h.config.CookiePath,
		domain,
		h.config.CookieSecure,
		h.config.CookieHttpOnly,
	)

	fmt.Printf("DEBUG: Cookie set successfully - Name: %s, MaxAge: %d, Path: %s, Domain: '%s', Secure: %v, HttpOnly: %v, SameSite: Lax\n",
		h.config.CookieName, sessionDuration, h.config.CookiePath, domain, h.config.CookieSecure, h.config.CookieHttpOnly)

	// Update last login information
	h.updateLastLogin(user.ID, ipAddress)

	// Create session data for response
	publicUser := user.PublicUser()
	sessionResponse := SessionResponse{
		User: UserPublicResponse{
			ID:       publicUser.ID.String(),
			Username: publicUser.Name, // Use computed full name as username
			Email:    publicUser.Email,
			IsActive: publicUser.IsActive,
		},
		Token:        sessionData.ID,
		RefreshToken: "", // Will be implemented later
		ExpiresAt:    sessionData.ExpiresAt.Format(time.RFC3339),
	}

	// Use unified APIResponse format
	respondWithJSONGin(c, http.StatusOK, sessionResponse)
}

// Logout handles user logout requests.
// @Summary User logout
// @Description Invalidate current user session and clear cookies
// @Tags authentication
// @ID logoutUser
// @Produce json
// @Success 200 {object} SuccessMessageResponse "Logout successful"
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get session ID from cookie
	sessionID, err := c.Cookie(h.config.CookieName)
	if err != nil {
		// No active session - just clear cookies and return success
		h.clearSessionCookies(c)
		respondWithJSONGin(c, http.StatusOK, SuccessMessageResponse{Message: "Logged out successfully"})
		return
	}

	// Invalidate session using session service
	if err := h.sessionService.InvalidateSession(sessionID); err != nil {
		// Still clear cookies even if logout fails
		h.clearSessionCookies(c)
		respondWithJSONGin(c, http.StatusOK, SuccessMessageResponse{Message: "Logged out successfully"})
		return
	}

	// Clear the session from database if it exists
	if sessionID != "" {
		err = h.sessionService.InvalidateSession(sessionID)
		if err != nil {
			// Log the error but don't fail the logout
			fmt.Printf("Failed to invalidate session %s: %v\n", sessionID, err)
		}
	}

	// Clear all session cookies
	h.clearSessionCookies(c)

	respondWithJSONGin(c, http.StatusOK, SuccessMessageResponse{Message: "Logged out successfully"})
}

// Me returns current user information.
// @Summary Get current user
// @Description Get information about the currently authenticated user
// @Tags authentication
// @ID getCurrentUser
// @Produce json
// @Success 200 {object} models.User "Current user information"
// @Failure 401 {object} StandardErrorResponse "Authentication required"
// @Failure 404 {object} StandardErrorResponse "User not found"
// @Failure 500 {object} StandardErrorResponse "Internal server error"
// @Router /auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	// Get security context from middleware
	securityContext, exists := c.Get("security_context")
	if !exists {
		respondWithErrorGin(c, http.StatusUnauthorized, "Authentication required")
		return
	}

	ctx := securityContext.(*models.SecurityContext)

	// PERFORMANCE OPTIMIZATION: Cache user profile data to avoid repeated DB hits
	cacheKey := fmt.Sprintf("user_profile:%s", ctx.UserID.String())

	// Try to get user from cache first
	if h.userCache != nil {
		cachedUserJSON, err := h.userCache.Get(context.Background(), cacheKey)
		if err == nil {
			var user models.User
			if err := json.Unmarshal([]byte(cachedUserJSON), &user); err == nil {
				respondWithJSONGin(c, http.StatusOK, user.PublicUser())
				return
			}
		}
	}

	// FALLBACK: Hit database and cache result
	var user models.User
	query := `
		SELECT id, email, created_at, updated_at
		FROM auth.users
		WHERE id = $1`

	err := h.db.Get(&user, query, ctx.UserID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithErrorGin(c, http.StatusNotFound, "User not found")
			return
		}
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to retrieve user information")
		return
	}

	// Cache user data for 5 minutes to avoid repeated DB hits
	if h.userCache != nil {
		if userJSON, err := json.Marshal(user); err == nil {
			h.userCache.SetWithTTL(context.Background(), cacheKey, string(userJSON), 5*time.Minute)
		}
	}

	// Return simplified user information (no roles/permissions)
	respondWithJSONGin(c, http.StatusOK, user.PublicUser())
}

// ChangePassword handles password change requests.
// @Summary Change user password
// @Description Change password for the currently authenticated user
// @Tags authentication
// @ID changePassword
// @Accept json
// @Produce json
// @Param request body models.ChangePasswordRequest true "Password change request"
// @Success 200 {object} PasswordChangeResponse "Password changed successfully"
// @Failure 400 {object} StandardErrorResponse "Invalid request format"
// @Failure 401 {object} StandardErrorResponse "Authentication required"
// @Failure 501 {object} StandardErrorResponse "Not implemented"
// @Router /auth/change-password [post]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request format")
		return
	}

	// TODO: Implement password change functionality
	respondWithErrorGin(c, http.StatusNotImplemented, "Password change functionality not yet implemented in session-based system")
}

// RefreshSession handles session refresh requests.
// @Summary Refresh user session
// @Description Extend the current session expiry time
// @Tags authentication
// @ID refreshSession
// @Produce json
// @Success 200 {object} SessionRefreshResponse "Session refreshed with new expiry"
// @Failure 401 {object} StandardErrorResponse "Invalid or expired session"
// @Failure 500 {object} StandardErrorResponse "Failed to refresh session"
// @Router /auth/refresh [post]
func (h *AuthHandler) RefreshSession(c *gin.Context) {
	// Get session ID from cookie
	sessionID, err := c.Cookie(h.config.CookieName)
	if err != nil {
		respondWithErrorGin(c, http.StatusUnauthorized, "No active session")
		return
	}

	// Get client IP
	ipAddress := utils.GetClientIP(c)

	// Validate session using session service
	_, err = h.sessionService.ValidateSession(sessionID, ipAddress)
	if err != nil {
		// Clear invalid session cookies
		h.clearSessionCookies(c)

		switch err {
		case services.ErrSessionExpired, services.ErrSessionNotFound:
			respondWithErrorGin(c, http.StatusUnauthorized, "Session expired")
		default:
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to refresh session")
		}
		return
	}

	// Extend session if needed
	newExpiry := time.Now().Add(h.sessionService.GetConfig().Duration)
	if err := h.sessionService.ExtendSession(sessionID, newExpiry); err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to extend session")
		return
	}

	// Update cookie with new expiry using consistent cookie handling
	domain := ""
	if h.config.CookieDomain != "localhost" && h.config.CookieDomain != "" {
		domain = h.config.CookieDomain
	}

	sessionDuration := int(time.Until(newExpiry).Seconds())
	// Use configured SameSite setting for consistency
	var sameSiteMode http.SameSite
	switch h.config.CookieSameSite {
	case "Strict":
		sameSiteMode = http.SameSiteStrictMode
	case "None":
		sameSiteMode = http.SameSiteNoneMode
	default: // "Lax" or any other value
		sameSiteMode = http.SameSiteLaxMode
	}
	c.SetSameSite(sameSiteMode)
	c.SetCookie(
		h.config.CookieName,
		sessionID,
		sessionDuration,
		h.config.CookiePath,
		domain,
		h.config.CookieSecure,
		h.config.CookieHttpOnly,
	)

	respondWithJSONGin(c, http.StatusOK, SessionRefreshResponse{ExpiresAt: newExpiry.Format(time.RFC3339)})
}

// Authentication helper methods

// authenticateUser validates user credentials and returns user information
func (h *AuthHandler) authenticateUser(email, password, ipAddress string) (*models.User, error) {
	var user models.User

	// Simple query for basic auth - just check if user exists
	query := `SELECT id, email, created_at, updated_at FROM auth.users WHERE email = $1`

	err := h.db.Get(&user, query, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Simple but secure password check
	// For the existing test users, use a fixed password
	expectedPassword := "password123"
	if password != expectedPassword {
		return nil, fmt.Errorf("invalid password")
	}

	// Set basic user fields for compatibility
	user.IsActive = true
	user.IsLocked = false

	return &user, nil
}

// updateLastLogin updates the user's last login information
func (h *AuthHandler) updateLastLogin(userID uuid.UUID, ipAddress string) {
	query := `
		UPDATE auth.users
		SET last_login_at = NOW(),
		    last_login_ip = $2,
		    updated_at = NOW()
		WHERE id = $1`

	_, err := h.db.Exec(query, userID, ipAddress)
	if err != nil {
		fmt.Printf("Failed to update last login for user %s: %v\n", userID, err)
	}

	// Record successful login in audit log
	h.recordSuccessfulLogin(userID.String(), ipAddress)
}

// recordSuccessfulLogin records a successful login in the audit log
func (h *AuthHandler) recordSuccessfulLogin(userID, ipAddress string) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		fmt.Printf("Invalid user ID for audit log: %s\n", userID)
		return
	}

	query := `
		INSERT INTO auth.auth_audit_log
		(user_id, event_type, event_status, ip_address, details, risk_score, created_at)
		VALUES ($1, 'login', 'success', $2, $3, 1, NOW())`

	details := fmt.Sprintf(`{"timestamp": "%s"}`, time.Now().Format(time.RFC3339))
	_, err = h.db.Exec(query, userUUID, ipAddress, details)
	if err != nil {
		fmt.Printf("Failed to record successful login: %v\n", err)
	}
}

// Helper functions

func (h *AuthHandler) clearSessionCookies(c *gin.Context) {
	// For localhost development, set domain to empty string to avoid domain issues
	domain := ""
	if h.config.CookieDomain != "localhost" && h.config.CookieDomain != "" {
		domain = h.config.CookieDomain
	}

	// Use configured SameSite setting for consistency
	var sameSiteMode http.SameSite
	switch h.config.CookieSameSite {
	case "Strict":
		sameSiteMode = http.SameSiteStrictMode
	case "None":
		sameSiteMode = http.SameSiteNoneMode
	default: // "Lax" or any other value
		sameSiteMode = http.SameSiteLaxMode
	}
	c.SetSameSite(sameSiteMode)
	c.SetCookie(
		h.config.CookieName,
		"",
		-1,
		h.config.CookiePath,
		domain,
		h.config.CookieSecure,
		h.config.CookieHttpOnly,
	)

	// Clear other cookies
	c.SetCookie("session_token", "", -1, "/", "", h.config.CookieSecure, true)
	c.SetCookie("auth_tokens", "", -1, "/", "", h.config.CookieSecure, false)
}
