//go:build legacy_gin
// +build legacy_gin

package middleware

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/logging"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/utils"
)

// RateLimitMiddleware provides rate limiting functionality
type RateLimitMiddleware struct {
	db     *sqlx.DB
	config config.RateLimiterConfig
}

// NewRateLimitMiddleware creates a new rate limiting middleware
func NewRateLimitMiddleware(db *sqlx.DB, cfg config.RateLimiterConfig) *RateLimitMiddleware {
	return &RateLimitMiddleware{db: db, config: cfg}
}

// RateLimitConfig defines rate limiting configuration
type RateLimitConfig struct {
	MaxRequests int                       // Maximum requests per window
	Window      time.Duration             // Time window
	KeyFunc     func(*gin.Context) string // Function to generate rate limit key
	Action      string                    // Action name for storage
}

// IPRateLimit applies rate limiting based on IP address
func (m *RateLimitMiddleware) IPRateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
	return m.RateLimit(RateLimitConfig{
		MaxRequests: maxRequests,
		Window:      window,
		KeyFunc: func(c *gin.Context) string {
			return utils.GetClientIP(c)
		},
		Action: "ip",
	})
}

// UserRateLimit applies rate limiting based on authenticated user
func (m *RateLimitMiddleware) UserRateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
	return m.RateLimit(RateLimitConfig{
		MaxRequests: maxRequests,
		Window:      window,
		KeyFunc: func(c *gin.Context) string {
			// Try to get user ID from context
			if userID, exists := c.Get("user_id"); exists {
				if uid, ok := userID.(string); ok {
					return uid
				}
			}
			// Fall back to IP if no user context
			return utils.GetClientIP(c)
		},
		Action: "user",
	})
}

// RateLimit applies general rate limiting with custom configuration
func (m *RateLimitMiddleware) RateLimit(config RateLimitConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		requestID := uuid.New().String()
		ipAddress := utils.GetClientIP(c)
		userAgent := c.GetHeader("User-Agent")

		limit := config.MaxRequests
		window := config.Window
		if limit <= 0 {
			limit = m.config.MaxRequests
		}
		if window <= 0 {
			window = time.Duration(m.config.WindowSeconds) * time.Second
		}
		if config.Action == "" {
			config.Action = c.FullPath()
		}

		rateLimitKey := config.KeyFunc(c)

		logging.LogMiddlewareExecution(
			"rate_limit",
			nil,
			nil,
			ipAddress,
			userAgent,
			requestID,
			0,
			true,
			0,
			map[string]interface{}{
				"method":         c.Request.Method,
				"path":           c.Request.URL.Path,
				"stage":          "start",
				"rate_limit_key": rateLimitKey,
				"action":         config.Action,
				"max_requests":   limit,
				"window":         window.String(),
			},
		)

		ctx := c.Request.Context()
		tx, err := m.db.BeginTxx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
		if err != nil {
			logging.LogMiddlewareExecution(
				"rate_limit",
				nil,
				nil,
				ipAddress,
				userAgent,
				requestID,
				time.Since(startTime),
				true,
				http.StatusOK,
				map[string]interface{}{"error": err.Error(), "stage": "tx_start"},
			)
			c.Next()
			return
		}

		defer tx.Rollback()

		var entry models.RateLimit
		query := `SELECT id, attempts, window_start, blocked_until FROM auth.rate_limits WHERE identifier=$1 AND action=$2 FOR UPDATE`
		err = tx.GetContext(ctx, &entry, query, rateLimitKey, config.Action)
		now := time.Now().UTC()
		allowed := true
		remaining := limit
		resetTime := now.Add(window)
		blocked := false

		if err != nil {
			if err == sql.ErrNoRows {
				insertQuery := `INSERT INTO auth.rate_limits (identifier, action, attempts, window_start) VALUES ($1,$2,1,$3)`
				if _, err = tx.ExecContext(ctx, insertQuery, rateLimitKey, config.Action, now); err == nil {
					remaining = limit - 1
					resetTime = now.Add(window)
				}
			} else {
				logging.LogMiddlewareExecution(
					"rate_limit",
					nil,
					nil,
					ipAddress,
					userAgent,
					requestID,
					time.Since(startTime),
					true,
					http.StatusOK,
					map[string]interface{}{"error": err.Error(), "stage": "select"},
				)
				c.Next()
				return
			}
		} else {
			windowEnd := entry.WindowStart.Add(window)
			if entry.BlockedUntil != nil && entry.BlockedUntil.After(now) {
				allowed = false
				blocked = true
				remaining = 0
				resetTime = *entry.BlockedUntil
				_, _ = tx.ExecContext(ctx, `UPDATE auth.rate_limits SET attempts = attempts + 1 WHERE id=$1`, entry.ID)
			} else if now.After(windowEnd) {
				_, err = tx.ExecContext(ctx, `UPDATE auth.rate_limits SET attempts=1, window_start=$1, blocked_until=NULL WHERE id=$2`, now, entry.ID)
				if err == nil {
					remaining = limit - 1
					resetTime = now.Add(window)
				}
			} else {
				entry.Attempts++
				var bu *time.Time
				if entry.Attempts > limit {
					allowed = false
					blocked = true
					t := windowEnd
					bu = &t
					remaining = 0
					resetTime = t
				} else {
					remaining = limit - entry.Attempts
					resetTime = windowEnd
				}
				_, err = tx.ExecContext(ctx, `UPDATE auth.rate_limits SET attempts=$1, blocked_until=$2 WHERE id=$3`, entry.Attempts, bu, entry.ID)
			}
			if err != nil {
				logging.LogMiddlewareExecution(
					"rate_limit",
					nil,
					nil,
					ipAddress,
					userAgent,
					requestID,
					time.Since(startTime),
					true,
					http.StatusOK,
					map[string]interface{}{"error": err.Error(), "stage": "update"},
				)
				c.Next()
				return
			}
		}

		if err = tx.Commit(); err != nil {
			logging.LogMiddlewareExecution(
				"rate_limit",
				nil,
				nil,
				ipAddress,
				userAgent,
				requestID,
				time.Since(startTime),
				true,
				http.StatusOK,
				map[string]interface{}{"error": err.Error(), "stage": "commit"},
			)
			c.Next()
			return
		}

		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))
		c.Header("X-RateLimit-Window", window.String())
		c.Header("X-RateLimit-Key", rateLimitKey)

		logging.LogRateLimitEvent(
			"rate_limit_check",
			rateLimitKey,
			ipAddress,
			limit-remaining,
			limit,
			entry.WindowStart,
			blocked,
			map[string]interface{}{"action": config.Action},
		)

		duration := time.Since(startTime)
		if !allowed {
			logging.LogMiddlewareExecution(
				"rate_limit",
				nil,
				nil,
				ipAddress,
				userAgent,
				requestID,
				duration,
				false,
				http.StatusTooManyRequests,
				map[string]interface{}{
					"method":         c.Request.Method,
					"path":           c.Request.URL.Path,
					"stage":          "blocked",
					"rate_limit_key": rateLimitKey,
					"action":         config.Action,
				},
			)
			c.Header("Retry-After", strconv.Itoa(int(time.Until(resetTime).Seconds())))
			respondWithRateLimitError(c, int(time.Until(resetTime).Seconds()), limit, remaining, resetTime)
			return
		}

		logging.LogMiddlewareExecution(
			"rate_limit",
			nil,
			nil,
			ipAddress,
			userAgent,
			requestID,
			duration,
			true,
			http.StatusOK,
			map[string]interface{}{
				"method":         c.Request.Method,
				"path":           c.Request.URL.Path,
				"stage":          "allowed",
				"rate_limit_key": rateLimitKey,
				"action":         config.Action,
			},
		)

		c.Next()
	}
}

// LoginRateLimit applies specific rate limiting for login attempts
func (m *RateLimitMiddleware) LoginRateLimit() gin.HandlerFunc {
	return m.RateLimit(RateLimitConfig{
		MaxRequests: m.config.MaxRequests,
		Window:      time.Duration(m.config.WindowSeconds) * time.Second,
		KeyFunc: func(c *gin.Context) string {
			return utils.GetClientIP(c)
		},
		Action: "login",
	})
}

// PasswordResetRateLimit applies specific rate limiting for password reset attempts
func (m *RateLimitMiddleware) PasswordResetRateLimit() gin.HandlerFunc {
	return m.RateLimit(RateLimitConfig{
		MaxRequests: m.config.MaxRequests,
		Window:      time.Duration(m.config.WindowSeconds) * time.Second,
		KeyFunc: func(c *gin.Context) string {
			return utils.GetClientIP(c)
		},
		Action: "password_reset",
	})
}

// Progressive rate limiting that increases delays based on failed attempts
func (m *RateLimitMiddleware) ProgressiveRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement progressive rate limiting
		// This would apply increasing delays: 1s, 2s, 4s, 8s, 16s, 30s
		c.Next()
	}
}
