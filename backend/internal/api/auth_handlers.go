package api

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

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
}

// NewAuthHandler creates a new authentication handler
func NewAuthHandler(sessionService *services.SessionService, sessionConfig *config.SessionSettings, db *sqlx.DB) *AuthHandler {
	return &AuthHandler{
		sessionService: sessionService,
		config:         sessionConfig,
		db:             db,
	}
}

// Login handles user login requests.
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

	// Set session cookie with SameSite attribute
	fmt.Printf("DEBUG: Setting session cookie with name: %s, value: %s\n", h.config.CookieName, sessionData.ID)

	// Build cookie manually to include SameSite attribute
	cookieValue := fmt.Sprintf("%s=%s; Path=%s; Max-Age=%d; HttpOnly",
		h.config.CookieName,
		sessionData.ID,
		h.config.CookiePath,
		int(time.Until(sessionData.ExpiresAt).Seconds()),
	)

	// Add domain if specified
	if h.config.CookieDomain != "" {
		cookieValue += fmt.Sprintf("; Domain=%s", h.config.CookieDomain)
	}

	// Add Secure if enabled
	if h.config.CookieSecure {
		cookieValue += "; Secure"
	}

	// Add SameSite=Lax for cross-origin compatibility in development
	cookieValue += "; SameSite=Lax"

	c.Header("Set-Cookie", cookieValue)
	fmt.Printf("DEBUG: Cookie set with value: %s\n", cookieValue)

	// Update last login information
	h.updateLastLogin(user.ID, ipAddress)

	// Create session data for response
	sessionResponse := map[string]interface{}{
		"user":      user.PublicUser(),
		"sessionId": sessionData.ID,
		"expiresAt": sessionData.ExpiresAt.Format(time.RFC3339),
	}

	// Return successful login response directly (unwrapped) to match OpenAPI spec
	c.JSON(http.StatusOK, sessionResponse)
}

// Logout handles user logout requests.
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get session ID from any of the possible cookie names
	sessionID, err := c.Cookie(h.config.CookieName)
	if err != nil {
		// Try legacy cookie name
		sessionID, err = c.Cookie(config.LegacySessionCookieName)
		if err != nil {
			// No active session - just clear cookies and return success
			h.clearSessionCookies(c)
			respondWithJSONGin(c, http.StatusOK, map[string]string{
				"message": "Logged out successfully",
			})
			return
		}
	}

	// Invalidate session using session service
	if err := h.sessionService.InvalidateSession(sessionID); err != nil {
		// Still clear cookies even if logout fails
		h.clearSessionCookies(c)
		respondWithJSONGin(c, http.StatusOK, map[string]string{"message": "Logged out successfully"})
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

	respondWithJSONGin(c, http.StatusOK, map[string]string{
		"message": "Logged out successfully",
	})
}

// Me returns current user information.
func (h *AuthHandler) Me(c *gin.Context) {
	// Get security context from middleware
	securityContext, exists := c.Get("security_context")
	if !exists {
		respondWithErrorGin(c, http.StatusUnauthorized, "Authentication required")
		return
	}

	ctx := securityContext.(*models.SecurityContext)

	// Fetch full user data from database
	var user models.User
	query := `
		SELECT id, email, email_verified, password_hash, password_pepper_version,
		       first_name, last_name, avatar_url, is_active, is_locked,
		       failed_login_attempts, locked_until, last_login_at, last_login_ip,
		       password_changed_at, must_change_password, created_at, updated_at
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

	// Return simplified user information (no roles/permissions)
	respondWithJSONGin(c, http.StatusOK, user.PublicUser())
}

// ChangePassword handles password change requests.
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
func (h *AuthHandler) RefreshSession(c *gin.Context) {
	// Get session ID from cookie
	sessionID, err := c.Cookie(h.config.CookieName)
	if err != nil {
		// Try legacy cookie name
		sessionID, err = c.Cookie(config.LegacySessionCookieName)
		if err != nil {
			respondWithErrorGin(c, http.StatusUnauthorized, "No active session")
			return
		}
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

	// Update cookie with new expiry
	c.SetCookie(
		h.config.CookieName,
		sessionID,
		int(time.Until(newExpiry).Seconds()),
		h.config.CookiePath,
		h.config.CookieDomain,
		h.config.CookieSecure,
		h.config.CookieHttpOnly,
	)

	respondWithJSONGin(c, http.StatusOK, map[string]string{
		"expiresAt": newExpiry.Format(time.RFC3339),
	})
}

// Authentication helper methods

// authenticateUser validates user credentials and returns user information
func (h *AuthHandler) authenticateUser(email, password, ipAddress string) (*models.User, error) {
	var user models.User

	// Query user by email (only fields that exist in the actual schema)
	query := `
		SELECT id, email, email_verified, password_hash, password_pepper_version,
		       first_name, last_name, avatar_url, is_active, is_locked,
		       failed_login_attempts, locked_until, last_login_at, last_login_ip,
		       password_changed_at, must_change_password, created_at, updated_at
		FROM auth.users
		WHERE email = $1`

	err := h.db.Get(&user, query, email)
	if err != nil {
		if err == sql.ErrNoRows {
			// Increment failed attempts for this IP to prevent enumeration
			h.recordFailedLogin("", ipAddress, "user not found")
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if account is locked
	if user.IsLocked && user.LockedUntil != nil && time.Now().Before(*user.LockedUntil) {
		h.recordFailedLogin(user.ID.String(), ipAddress, "account locked")
		return nil, fmt.Errorf("account locked")
	}

	// Check if account is active
	if !user.IsActive {
		h.recordFailedLogin(user.ID.String(), ipAddress, "account inactive")
		return nil, fmt.Errorf("account inactive")
	}

	// Verify password using pgcrypto
	var passwordValid bool
	passwordQuery := `SELECT crypt($1, $2) = $2 AS password_valid`
	err = h.db.Get(&passwordValid, passwordQuery, password, user.PasswordHash)
	if err != nil {
		return nil, fmt.Errorf("password verification error: %w", err)
	}

	if !passwordValid {
		// Increment failed login attempts
		h.incrementFailedAttempts(user.ID, ipAddress)
		return nil, fmt.Errorf("invalid password")
	}

	// Reset failed login attempts on successful authentication
	h.resetFailedAttempts(user.ID)

	// Check if account was temporarily locked and should be unlocked
	if user.IsLocked && user.LockedUntil != nil && time.Now().After(*user.LockedUntil) {
		h.unlockAccount(user.ID)
		user.IsLocked = false
	}

	return &user, nil
}

// incrementFailedAttempts increments failed login attempts and locks account if threshold reached
func (h *AuthHandler) incrementFailedAttempts(userID uuid.UUID, ipAddress string) {
	const maxFailedAttempts = 5
	const lockoutDuration = 30 * time.Minute

	query := `
		UPDATE auth.users
		SET failed_login_attempts = failed_login_attempts + 1,
		    is_locked = CASE
		        WHEN failed_login_attempts + 1 >= $2 THEN true
		        ELSE is_locked
		    END,
		    locked_until = CASE
		        WHEN failed_login_attempts + 1 >= $2 THEN NOW() + INTERVAL '%d minutes'
		        ELSE locked_until
		    END,
		    updated_at = NOW()
		WHERE id = $1`

	_, err := h.db.Exec(fmt.Sprintf(query, int(lockoutDuration.Minutes())), userID, maxFailedAttempts)
	if err != nil {
		// Log error but don't fail the authentication flow
		fmt.Printf("Failed to increment failed attempts for user %s: %v\n", userID, err)
	}

	h.recordFailedLogin(userID.String(), ipAddress, "invalid password")
}

// resetFailedAttempts resets failed login attempts on successful authentication
func (h *AuthHandler) resetFailedAttempts(userID uuid.UUID) {
	query := `
		UPDATE auth.users
		SET failed_login_attempts = 0,
		    updated_at = NOW()
		WHERE id = $1`

	_, err := h.db.Exec(query, userID)
	if err != nil {
		fmt.Printf("Failed to reset failed attempts for user %s: %v\n", userID, err)
	}
}

// unlockAccount unlocks a temporarily locked account
func (h *AuthHandler) unlockAccount(userID uuid.UUID) {
	query := `
		UPDATE auth.users
		SET is_locked = false,
		    locked_until = NULL,
		    failed_login_attempts = 0,
		    updated_at = NOW()
		WHERE id = $1`

	_, err := h.db.Exec(query, userID)
	if err != nil {
		fmt.Printf("Failed to unlock account for user %s: %v\n", userID, err)
	}
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

// recordFailedLogin records a failed login attempt in the audit log
func (h *AuthHandler) recordFailedLogin(userID, ipAddress, reason string) {
	var userUUID *uuid.UUID
	if userID != "" {
		if parsed, err := uuid.Parse(userID); err == nil {
			userUUID = &parsed
		}
	}

	query := `
		INSERT INTO auth.auth_audit_log
		(user_id, event_type, event_status, ip_address, details, risk_score, created_at)
		VALUES ($1, 'login', 'failure', $2, $3, 3, NOW())`

	details := fmt.Sprintf(`{"reason": "%s", "timestamp": "%s"}`, reason, time.Now().Format(time.RFC3339))
	_, err := h.db.Exec(query, userUUID, ipAddress, details)
	if err != nil {
		fmt.Printf("Failed to record failed login: %v\n", err)
	}
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
	// Clear new session cookie
	c.SetCookie(
		h.config.CookieName,
		"",
		-1,
		h.config.CookiePath,
		h.config.CookieDomain,
		h.config.CookieSecure,
		h.config.CookieHttpOnly,
	)

	// Clear legacy cookies for backward compatibility
	c.SetCookie("session_token", "", -1, "/", "", h.config.CookieSecure, true)
	c.SetCookie("auth_tokens", "", -1, "/", "", h.config.CookieSecure, false)
}
