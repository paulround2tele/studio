package middleware

import (
	"database/sql"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// RateLimitConfig holds configuration for rate limiting
type RateLimitConfig struct {
	// Login endpoint limits
	LoginMaxAttempts   int           // Max login attempts per window
	LoginWindow        time.Duration // Time window for login attempts
	LoginBlockDuration time.Duration // Duration to block after exceeding limit

	// Logout endpoint limits
	LogoutMaxAttempts int           // Max logout attempts per window
	LogoutWindow      time.Duration // Time window for logout attempts

	// General API limits
	GeneralMaxRequests int           // Max requests per window for general endpoints
	GeneralWindow      time.Duration // Time window for general requests
}

// DefaultRateLimitConfig returns default rate limiting configuration
func DefaultRateLimitConfig() *RateLimitConfig {
	return &RateLimitConfig{
		LoginMaxAttempts:   5,
		LoginWindow:        time.Minute,
		LoginBlockDuration: 5 * time.Minute,
		LogoutMaxAttempts:  10,
		LogoutWindow:       time.Minute,
		GeneralMaxRequests: 1000,
		GeneralWindow:      15 * time.Minute,
	}
}

// RateLimiter provides rate limiting for API endpoints
type RateLimiter struct {
	db       *sqlx.DB
	config   *RateLimitConfig
	inMemory *InMemoryRateLimiter
}

// InMemoryRateLimiter provides fast in-memory rate limiting
type InMemoryRateLimiter struct {
	attempts map[string]*RateLimitEntry
	mu       sync.RWMutex
}

// RateLimitEntry tracks rate limit state for an IP
type RateLimitEntry struct {
	Attempts     int
	WindowStart  time.Time
	BlockedUntil time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(db *sqlx.DB, config *RateLimitConfig) *RateLimiter {
	if config == nil {
		config = DefaultRateLimitConfig()
	}
	return &RateLimiter{
		db:     db,
		config: config,
		inMemory: &InMemoryRateLimiter{
			attempts: make(map[string]*RateLimitEntry),
		},
	}
}

// RateLimitMiddleware returns an HTTP middleware for rate limiting
func (rl *RateLimiter) RateLimitMiddleware(endpointType string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			clientIP := rl.getClientIP(r)

			// Check if blocked
			if rl.isBlocked(clientIP, endpointType) {
				rl.respondRateLimited(w, r, clientIP, endpointType)
				return
			}

			// Check rate limit
			if !rl.checkRateLimit(clientIP, endpointType) {
				rl.respondRateLimited(w, r, clientIP, endpointType)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// getClientIP extracts the client IP from the request
func (rl *RateLimiter) getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for reverse proxies)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Take the first IP in the chain
		if idx := strings.Index(xff, ","); idx != -1 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}

	// Fall back to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// isBlocked checks if an IP is currently blocked
func (rl *RateLimiter) isBlocked(clientIP, endpointType string) bool {
	key := rl.makeKey(clientIP, endpointType)

	rl.inMemory.mu.RLock()
	entry, exists := rl.inMemory.attempts[key]
	rl.inMemory.mu.RUnlock()

	if !exists {
		return false
	}

	if time.Now().Before(entry.BlockedUntil) {
		return true
	}

	return false
}

// checkRateLimit checks if a request is within rate limits
func (rl *RateLimiter) checkRateLimit(clientIP, endpointType string) bool {
	key := rl.makeKey(clientIP, endpointType)
	now := time.Now()

	maxAttempts, window, blockDuration := rl.getLimits(endpointType)

	rl.inMemory.mu.Lock()
	defer rl.inMemory.mu.Unlock()

	entry, exists := rl.inMemory.attempts[key]
	if !exists {
		rl.inMemory.attempts[key] = &RateLimitEntry{
			Attempts:    1,
			WindowStart: now,
		}
		return true
	}

	// Reset window if expired
	if now.Sub(entry.WindowStart) > window {
		entry.Attempts = 1
		entry.WindowStart = now
		entry.BlockedUntil = time.Time{}
		return true
	}

	// Increment attempts
	entry.Attempts++

	// Check if exceeded
	if entry.Attempts > maxAttempts {
		entry.BlockedUntil = now.Add(blockDuration)
		// Log to database if available
		if rl.db != nil {
			go rl.logRateLimitEvent(clientIP, endpointType, entry.Attempts)
		}
		return false
	}

	return true
}

// getLimits returns the rate limits for an endpoint type
func (rl *RateLimiter) getLimits(endpointType string) (maxAttempts int, window, blockDuration time.Duration) {
	switch endpointType {
	case "login":
		return rl.config.LoginMaxAttempts, rl.config.LoginWindow, rl.config.LoginBlockDuration
	case "logout":
		return rl.config.LogoutMaxAttempts, rl.config.LogoutWindow, time.Minute
	default:
		return rl.config.GeneralMaxRequests, rl.config.GeneralWindow, time.Minute
	}
}

// makeKey creates a cache key for rate limiting
func (rl *RateLimiter) makeKey(clientIP, endpointType string) string {
	return endpointType + ":" + clientIP
}

// respondRateLimited sends a 429 Too Many Requests response
func (rl *RateLimiter) respondRateLimited(w http.ResponseWriter, _ *http.Request, _ string, _ string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Retry-After", "60") // Suggest retry after 60 seconds
	w.WriteHeader(http.StatusTooManyRequests)

	response := map[string]interface{}{
		"success":   false,
		"requestId": uuid.New().String(),
		"error": map[string]interface{}{
			"code":      "RATE_LIMIT_EXCEEDED",
			"message":   "Too many requests. Please try again later.",
			"timestamp": time.Now().Format(time.RFC3339),
		},
	}

	_ = json.NewEncoder(w).Encode(response)
}

// logRateLimitEvent logs a rate limit event to the audit log
func (rl *RateLimiter) logRateLimitEvent(clientIP, endpointType string, attempts int) {
	if rl.db == nil {
		return
	}

	query := `
		INSERT INTO auth.auth_audit_logs (
			id, event_type, event_status, ip_address, 
			event_metadata, risk_score, created_at
		) VALUES (
			$1, 'RATE_LIMIT_EXCEEDED', 'WARNING', $2,
			$3, $4, NOW()
		)`

	metadata, _ := json.Marshal(map[string]interface{}{
		"endpoint_type": endpointType,
		"attempts":      attempts,
	})

	// Calculate risk score based on attempts
	riskScore := float64(attempts) / 10.0
	if riskScore > 1.0 {
		riskScore = 1.0
	}

	_, _ = rl.db.Exec(query, uuid.New(), clientIP, string(metadata), riskScore)
}

// RecordLoginAttempt records a login attempt (for persistent tracking)
func (rl *RateLimiter) RecordLoginAttempt(clientIP string, _ bool) {
	if rl.db == nil {
		return
	}

	query := `
		INSERT INTO auth.rate_limits (id, identifier, identifier_type, action, attempt_count, first_attempt_at, last_attempt_at)
		VALUES ($1, $2, 'ip', 'login', 1, NOW(), NOW())
		ON CONFLICT (identifier, identifier_type, action)
		DO UPDATE SET 
			attempt_count = CASE 
				WHEN auth.rate_limits.first_attempt_at < NOW() - INTERVAL '1 hour' THEN 1
				ELSE auth.rate_limits.attempt_count + 1
			END,
			first_attempt_at = CASE 
				WHEN auth.rate_limits.first_attempt_at < NOW() - INTERVAL '1 hour' THEN NOW()
				ELSE auth.rate_limits.first_attempt_at
			END,
			last_attempt_at = NOW()`

	_, _ = rl.db.Exec(query, uuid.New(), clientIP)
}

// IsIPBlockedFromLogin checks if an IP is blocked from login attempts in the database
func (rl *RateLimiter) IsIPBlockedFromLogin(clientIP string) (bool, time.Time) {
	if rl.db == nil {
		return false, time.Time{}
	}

	query := `
		SELECT blocked_until 
		FROM auth.rate_limits 
		WHERE identifier = $1 AND identifier_type = 'ip' AND action = 'login'
		AND blocked_until > NOW()`

	var blockedUntil sql.NullTime
	err := rl.db.Get(&blockedUntil, query, clientIP)
	if err != nil || !blockedUntil.Valid {
		return false, time.Time{}
	}

	return true, blockedUntil.Time
}

// Cleanup removes expired entries from in-memory cache
func (rl *RateLimiter) Cleanup() {
	rl.inMemory.mu.Lock()
	defer rl.inMemory.mu.Unlock()

	now := time.Now()
	for key, entry := range rl.inMemory.attempts {
		// Remove entries older than 1 hour or unblocked entries
		if now.Sub(entry.WindowStart) > time.Hour {
			delete(rl.inMemory.attempts, key)
		}
	}
}
