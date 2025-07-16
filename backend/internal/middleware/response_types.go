package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ErrorCode represents standard error codes for the API
type ErrorCode string

const (
	ErrorCodeBadRequest        ErrorCode = "BAD_REQUEST"
	ErrorCodeUnauthorized      ErrorCode = "UNAUTHORIZED"
	ErrorCodeForbidden         ErrorCode = "FORBIDDEN"
	ErrorCodeInternalServer    ErrorCode = "INTERNAL_SERVER_ERROR"
	ErrorCodeRequestTooLarge   ErrorCode = "REQUEST_TOO_LARGE"
	ErrorCodeRateLimitExceeded ErrorCode = "RATE_LIMIT_EXCEEDED"
)

// ErrorInfo contains comprehensive error information
type ErrorInfo struct {
	Code      ErrorCode `json:"code"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	Path      string    `json:"path,omitempty"`
}

// APIResponse represents the unified response format
type APIResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     *ErrorInfo  `json:"error,omitempty"`
	RequestID string      `json:"requestId"`
}

// newErrorResponse creates an error API response for middleware
func newErrorResponse(code ErrorCode, message string, requestID string, path string) *APIResponse {
	return &APIResponse{
		Success: false,
		Error: &ErrorInfo{
			Code:      code,
			Message:   message,
			Timestamp: time.Now().UTC(),
			Path:      path,
		},
		RequestID: requestID,
	}
}

// respondWithErrorMiddleware sends a unified error response from middleware
func respondWithErrorMiddleware(c *gin.Context, code int, errorCode ErrorCode, message string) {
	requestID := c.GetHeader("X-Request-ID")
	if requestID == "" {
		requestID = uuid.New().String()
	}
	
	response := newErrorResponse(errorCode, message, requestID, c.Request.URL.Path)
	c.AbortWithStatusJSON(code, response)
}

// respondWithRateLimitError sends a unified rate limit error response with additional data
func respondWithRateLimitError(c *gin.Context, retryAfter, limit, remaining int, resetTime time.Time) {
	requestID := c.GetHeader("X-Request-ID")
	if requestID == "" {
		requestID = uuid.New().String()
	}
	
	response := &APIResponse{
		Success: false,
		Error: &ErrorInfo{
			Code:      ErrorCodeRateLimitExceeded,
			Message:   "Rate limit exceeded",
			Timestamp: time.Now().UTC(),
			Path:      c.Request.URL.Path,
		},
		Data: map[string]interface{}{
			"retryAfter": retryAfter,
			"limit":      limit,
			"remaining":  remaining,
			"resetTime":  resetTime.UTC().Format(time.RFC3339),
		},
		RequestID: requestID,
	}
	c.AbortWithStatusJSON(http.StatusTooManyRequests, response)
}