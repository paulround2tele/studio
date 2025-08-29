package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"golang.org/x/crypto/bcrypt"
)

// AuthLogin verifies credentials, creates a session, and returns a SessionResponse.
func (h *strictHandlers) AuthLogin(ctx context.Context, r gen.AuthLoginRequestObject) (gen.AuthLoginResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Session == nil {
		return gen.AuthLogin500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "authentication not available", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || strings.TrimSpace(string(r.Body.Email)) == "" || strings.TrimSpace(r.Body.Password) == "" {
		return gen.AuthLogin400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "email and password required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Lookup user by email
	var (
		id           uuid.UUID
		email        string
		isActive     bool
		isLocked     bool
		lockedUntil  sql.NullTime
		passwordHash string
		firstName    string
		lastName     string
	)
	q := `SELECT id, email, is_active, is_locked, locked_until, password_hash, first_name, last_name FROM auth.users WHERE LOWER(email) = LOWER($1) LIMIT 1`
	if err := h.deps.DB.QueryRowxContext(ctx, q, string(r.Body.Email)).Scan(&id, &email, &isActive, &isLocked, &lockedUntil, &passwordHash, &firstName, &lastName); err != nil {
		if err == sql.ErrNoRows {
			return gen.AuthLogin401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "invalid credentials", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.AuthLogin500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to query user", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	if !isActive {
		return gen.AuthLogin401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "account disabled", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if isLocked {
		if lockedUntil.Valid && lockedUntil.Time.After(time.Now()) {
			return gen.AuthLogin401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "account locked", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(r.Body.Password)); err != nil {
		return gen.AuthLogin401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "invalid credentials", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Create session (client IP/UA may not be available here; use empty strings)
	sd, err := h.deps.Session.CreateSession(id, "", "")
	if err != nil {
		return gen.AuthLogin500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create session", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Map user to API response
	username := deriveUsername(email, firstName, lastName)
	u := gen.UserPublicResponse{Email: openapi_types.Email(email), Id: openapi_types.UUID(id), IsActive: isActive, Username: username}
	data := gen.SessionResponse{Token: sd.ID, ExpiresAt: sd.ExpiresAt, User: u}
	return gen.AuthLogin200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// AuthLogout invalidates the current session.
func (h *strictHandlers) AuthLogout(ctx context.Context, r gen.AuthLogoutRequestObject) (gen.AuthLogoutResponseObject, error) {
	if h.deps == nil || h.deps.Session == nil {
		return gen.AuthLogout500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "session service unavailable", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	v := ctx.Value("session_id")
	if v == nil {
		return gen.AuthLogout401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "unauthorized", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	sid, _ := v.(string)
	if sid == "" {
		return gen.AuthLogout401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "unauthorized", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	_ = h.deps.Session.InvalidateSession(sid)
	msg := "logged out"
	return gen.AuthLogout200JSONResponse{Data: &struct {
		Message *string `json:"message,omitempty"`
	}{Message: &msg}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// AuthMe returns the current authenticated user's public profile.
func (h *strictHandlers) AuthMe(ctx context.Context, r gen.AuthMeRequestObject) (gen.AuthMeResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil {
		return gen.AuthMe500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	v := ctx.Value("user_id")
	if v == nil {
		return gen.AuthMe401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "unauthorized", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var uid uuid.UUID
	switch t := v.(type) {
	case string:
		var err error
		uid, err = uuid.Parse(t)
		if err != nil {
			return gen.AuthMe401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "invalid user context", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	case uuid.UUID:
		uid = t
	default:
		return gen.AuthMe401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "invalid user context", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	var email string
	var isActive bool
	var firstName, lastName string
	if err := h.deps.DB.QueryRowxContext(ctx, `SELECT email, is_active, first_name, last_name FROM auth.users WHERE id = $1`, uid).Scan(&email, &isActive, &firstName, &lastName); err != nil {
		if err == sql.ErrNoRows {
			return gen.AuthMe401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "user not found", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.AuthMe500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load user", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	username := deriveUsername(email, firstName, lastName)
	data := gen.UserPublicResponse{Email: openapi_types.Email(email), Id: openapi_types.UUID(uid), IsActive: isActive, Username: username}
	return gen.AuthMe200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// AuthRefresh extends the current session and returns an updated SessionResponse.
func (h *strictHandlers) AuthRefresh(ctx context.Context, r gen.AuthRefreshRequestObject) (gen.AuthRefreshResponseObject, error) {
	if h.deps == nil || h.deps.Session == nil || h.deps.DB == nil {
		return gen.AuthRefresh500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	sidVal := ctx.Value("session_id")
	uidVal := ctx.Value("user_id")
	if sidVal == nil || uidVal == nil {
		return gen.AuthRefresh401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "unauthorized", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	sid, _ := sidVal.(string)
	var uid uuid.UUID
	switch t := uidVal.(type) {
	case string:
		var err error
		uid, err = uuid.Parse(t)
		if err != nil {
			return gen.AuthRefresh401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "invalid user context", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	case uuid.UUID:
		uid = t
	default:
		return gen.AuthRefresh401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "invalid user context", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Extend session expiry
	// Use configured duration if available; else 2 hours default
	dur := 2 * time.Hour
	if h.deps.Config != nil && h.deps.Config.Server.AuthConfig != nil && h.deps.Config.Server.AuthConfig.SessionDuration > 0 {
		dur = h.deps.Config.Server.AuthConfig.SessionDuration
	}
	newExp := time.Now().Add(dur)
	if err := h.deps.Session.ExtendSession(sid, newExp); err != nil {
		return gen.AuthRefresh500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to extend session", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Load minimal user info
	var email string
	var isActive bool
	var firstName, lastName string
	if err := h.deps.DB.QueryRowxContext(ctx, `SELECT email, is_active, first_name, last_name FROM auth.users WHERE id = $1`, uid).Scan(&email, &isActive, &firstName, &lastName); err != nil {
		return gen.AuthRefresh500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load user", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	username := deriveUsername(email, firstName, lastName)
	u := gen.UserPublicResponse{Email: openapi_types.Email(email), Id: openapi_types.UUID(uid), IsActive: isActive, Username: username}
	data := gen.SessionResponse{Token: sid, ExpiresAt: newExp, User: u}
	return gen.AuthRefresh200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

// deriveUsername picks a reasonable username string for UserPublicResponse
func deriveUsername(email, firstName, lastName string) string {
	if firstName != "" || lastName != "" {
		full := strings.TrimSpace(strings.TrimSpace(firstName) + " " + strings.TrimSpace(lastName))
		if full != "" {
			return full
		}
	}
	if i := strings.Index(email, "@"); i > 0 {
		return email[:i]
	}
	return email
}

// AuthChangePassword allows an authenticated user to change their password.
func (h *strictHandlers) AuthChangePassword(ctx context.Context, r gen.AuthChangePasswordRequestObject) (gen.AuthChangePasswordResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil {
		return gen.AuthChangePassword500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Require authenticated user
	v := ctx.Value("user_id")
	if v == nil {
		return gen.AuthChangePassword401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "unauthorized", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	userIDStr, _ := v.(string)
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return gen.AuthChangePassword401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "invalid user context", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || strings.TrimSpace(r.Body.OldPassword) == "" || strings.TrimSpace(r.Body.NewPassword) == "" {
		return gen.AuthChangePassword400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "oldPassword and newPassword required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Enforce minimum length (fallback to default 12)
	minLen := 12
	if h.deps.Config != nil && h.deps.Config.Server.AuthConfig != nil && h.deps.Config.Server.AuthConfig.PasswordMinLength > 0 {
		minLen = h.deps.Config.Server.AuthConfig.PasswordMinLength
	}
	if len(r.Body.NewPassword) < minLen {
		return gen.AuthChangePassword400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: fmt.Sprintf("new password must be at least %d characters", minLen), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Fetch current password hash
	var storedHash string
	err = h.deps.DB.QueryRowContext(ctx, `SELECT password_hash FROM auth.users WHERE id = $1`, uid).Scan(&storedHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return gen.AuthChangePassword401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "user not found", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.AuthChangePassword500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch user", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(r.Body.OldPassword)); err != nil {
		return gen.AuthChangePassword401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "invalid credentials", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Hash new password
	cost := 12
	if h.deps.Config != nil && h.deps.Config.Server.AuthConfig != nil && h.deps.Config.Server.AuthConfig.BcryptCost > 0 {
		cost = h.deps.Config.Server.AuthConfig.BcryptCost
	}
	newHashBytes, err := bcrypt.GenerateFromPassword([]byte(r.Body.NewPassword), cost)
	if err != nil {
		return gen.AuthChangePassword500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to hash password", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	newHash := string(newHashBytes)
	// Update in DB
	if _, err := h.deps.DB.ExecContext(ctx, `UPDATE auth.users SET password_hash = $1, updated_at = now() WHERE id = $2`, newHash, uid); err != nil {
		return gen.AuthChangePassword500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update password", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Invalidate other sessions for this user (best-effort)
	if h.deps.Session != nil {
		_ = h.deps.Session.InvalidateAllUserSessions(uid)
	}
	return gen.AuthChangePassword200JSONResponse{Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
