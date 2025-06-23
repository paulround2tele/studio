// File: backend/internal/middleware/response_time_middleware.go
package middleware

import (
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ResponseTimeMiddleware tracks and analyzes API response times
type ResponseTimeMiddleware struct {
	db              *sqlx.DB
	thresholds      models.ResponseTimeThresholds
	enableAnalytics bool
	samplingRate    float64 // 0.0 to 1.0, for high-traffic endpoints
}

// NewResponseTimeMiddleware creates a new response time tracking middleware
func NewResponseTimeMiddleware(db *sqlx.DB) *ResponseTimeMiddleware {
	return &ResponseTimeMiddleware{
		db:              db,
		thresholds:      models.DefaultResponseTimeThresholds(),
		enableAnalytics: true,
		samplingRate:    1.0, // Track all requests by default
	}
}

// WithThresholds configures custom response time thresholds
func (rtm *ResponseTimeMiddleware) WithThresholds(thresholds models.ResponseTimeThresholds) *ResponseTimeMiddleware {
	rtm.thresholds = thresholds
	return rtm
}

// WithSamplingRate configures the sampling rate for high-traffic environments
func (rtm *ResponseTimeMiddleware) WithSamplingRate(rate float64) *ResponseTimeMiddleware {
	if rate >= 0.0 && rate <= 1.0 {
		rtm.samplingRate = rate
	}
	return rtm
}

// Middleware returns the Gin middleware function
func (rtm *ResponseTimeMiddleware) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip tracking for static assets and health checks
		if rtm.shouldSkipTracking(c.Request.RequestURI) {
			c.Next()
			return
		}

		startTime := time.Now()

		// Capture request context
		endpoint := rtm.normalizeEndpoint(c.FullPath())
		method := c.Request.Method
		userID := rtm.extractUserID(c)
		campaignID := rtm.extractCampaignID(c)

		// Process request
		c.Next()

		// Calculate response time
		responseTime := time.Since(startTime)
		responseTimeMs := float64(responseTime.Nanoseconds()) / 1e6

		// Add response time header for debugging
		c.Header("X-Response-Time", responseTime.String())

		// Get response size
		payloadSize := rtm.getResponseSize(c)
		statusCode := c.Writer.Status()

		// Check if we should record this request (sampling)
		if rtm.shouldSample() {
			// Record metrics asynchronously to avoid impacting response time
			go rtm.recordResponseMetrics(endpoint, method, responseTimeMs, payloadSize, userID, campaignID, statusCode)
		}

		// Add threshold violation warning header
		threshold := rtm.thresholds.GetThresholdForEndpoint(method, endpoint)
		if responseTime > threshold {
			c.Header("X-Response-Time-Warning", "Exceeded SLA threshold")
		}
	}
}

// shouldSkipTracking determines if we should skip tracking for certain endpoints
func (rtm *ResponseTimeMiddleware) shouldSkipTracking(uri string) bool {
	skipPrefixes := []string{
		"/static/",
		"/assets/",
		"/favicon.ico",
		"/health",
		"/metrics",
		"/debug/",
	}

	for _, prefix := range skipPrefixes {
		if strings.HasPrefix(uri, prefix) {
			return true
		}
	}

	return false
}

// normalizeEndpoint converts dynamic routes to normalized patterns
func (rtm *ResponseTimeMiddleware) normalizeEndpoint(path string) string {
	if path == "" {
		return "unknown"
	}

	// Replace common ID patterns with placeholders
	normalized := path

	// Replace UUID patterns
	uuidPattern := `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`
	normalized = replacePattern(normalized, uuidPattern, "{id}")

	// Replace numeric IDs
	normalized = replacePattern(normalized, `/\d+(/|$)`, "/{id}$1")

	return normalized
}

// extractUserID attempts to extract user ID from the request context
func (rtm *ResponseTimeMiddleware) extractUserID(c *gin.Context) *uuid.UUID {
	// Try to get from context (set by auth middleware)
	if userIDInterface, exists := c.Get("user_id"); exists {
		if userIDStr, ok := userIDInterface.(string); ok {
			if userID, err := uuid.Parse(userIDStr); err == nil {
				return &userID
			}
		}
		if userID, ok := userIDInterface.(uuid.UUID); ok {
			return &userID
		}
	}

	// Try to get from header
	if userIDHeader := c.GetHeader("X-User-ID"); userIDHeader != "" {
		if userID, err := uuid.Parse(userIDHeader); err == nil {
			return &userID
		}
	}

	return nil
}

// extractCampaignID attempts to extract campaign ID from request path or context
func (rtm *ResponseTimeMiddleware) extractCampaignID(c *gin.Context) *uuid.UUID {
	// Try to get from context
	if campaignIDInterface, exists := c.Get("campaign_id"); exists {
		if campaignIDStr, ok := campaignIDInterface.(string); ok {
			if campaignID, err := uuid.Parse(campaignIDStr); err == nil {
				return &campaignID
			}
		}
		if campaignID, ok := campaignIDInterface.(uuid.UUID); ok {
			return &campaignID
		}
	}

	// Try to get from path parameters
	if campaignIDParam := c.Param("id"); campaignIDParam != "" && strings.Contains(c.Request.URL.Path, "campaign") {
		if campaignID, err := uuid.Parse(campaignIDParam); err == nil {
			return &campaignID
		}
	}

	if campaignIDParam := c.Param("campaign_id"); campaignIDParam != "" {
		if campaignID, err := uuid.Parse(campaignIDParam); err == nil {
			return &campaignID
		}
	}

	return nil
}

// getResponseSize estimates the response payload size
func (rtm *ResponseTimeMiddleware) getResponseSize(c *gin.Context) int {
	// Try to get from Content-Length header
	if lengthHeader := c.GetHeader("Content-Length"); lengthHeader != "" {
		if size, err := strconv.Atoi(lengthHeader); err == nil {
			return size
		}
	}

	// For gin responses, we can get the size from the writer
	// gin.Context.Writer is a gin.ResponseWriter which has a Size() method
	if rw, ok := c.Writer.(interface{ Size() int }); ok {
		return rw.Size()
	}

	return 0
}

// shouldSample determines if this request should be sampled based on sampling rate
func (rtm *ResponseTimeMiddleware) shouldSample() bool {
	if rtm.samplingRate >= 1.0 {
		return true
	}
	if rtm.samplingRate <= 0.0 {
		return false
	}

	// Simple sampling based on time
	return time.Now().UnixNano()%100 < int64(rtm.samplingRate*100)
}

// recordResponseMetrics asynchronously records the response time metrics
func (rtm *ResponseTimeMiddleware) recordResponseMetrics(endpoint, method string, responseTimeMs float64, payloadSize int, userID, campaignID *uuid.UUID, statusCode int) {
	if !rtm.enableAnalytics {
		return
	}

	// Call the database function to record response time
	var metricID uuid.UUID
	err := rtm.db.QueryRow(`
		SELECT record_response_time($1, $2, $3, $4, $5, $6, $7)`,
		endpoint, method, responseTimeMs, payloadSize, userID, campaignID, statusCode,
	).Scan(&metricID)

	if err != nil {
		// Log error but don't fail the request
		// In production, you'd want proper logging here
		_ = err
	}
}

// GetResponseTimeAnalytics returns analytics for response times
func (rtm *ResponseTimeMiddleware) GetResponseTimeAnalytics(endpointFilter string, hoursBack int) ([]models.ResponseTimeAnalytics, error) {
	var analytics []models.ResponseTimeAnalytics

	err := rtm.db.Select(&analytics, `
		SELECT * FROM get_response_time_analytics($1, $2)`,
		endpointFilter, hoursBack,
	)

	return analytics, err
}

// GetSlowEndpoints returns endpoints that are consistently slow
func (rtm *ResponseTimeMiddleware) GetSlowEndpoints(thresholdMs float64, hoursBack int) ([]models.ResponseTimeAnalytics, error) {
	var slowEndpoints []models.ResponseTimeAnalytics

	err := rtm.db.Select(&slowEndpoints, `
		SELECT * FROM get_response_time_analytics(NULL, $2)
		WHERE avg_response_ms > $1
		ORDER BY avg_response_ms DESC`,
		thresholdMs, hoursBack,
	)

	return slowEndpoints, err
}

// GetOptimizationRecommendations returns recommendations for improving slow endpoints
func (rtm *ResponseTimeMiddleware) GetOptimizationRecommendations() ([]models.ResponseOptimizationRecommendation, error) {
	var recommendations []models.ResponseOptimizationRecommendation

	err := rtm.db.Select(&recommendations, `
		SELECT * FROM response_optimization_recommendations 
		WHERE implemented = false 
		ORDER BY priority DESC, current_avg_response_ms DESC`)

	return recommendations, err
}

// Helper function to replace patterns using regex
func replacePattern(s, pattern, replacement string) string {
	re, err := regexp.Compile(pattern)
	if err != nil {
		return s // Return original string if regex is invalid
	}
	return re.ReplaceAllString(s, replacement)
}
