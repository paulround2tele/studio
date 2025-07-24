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

// MiddlewareResponse represents simplified response format for middleware-only errors
// NOTE: Campaign handlers use the full APIResponse from api package
type MiddlewareResponse struct {
	Success   bool       `json:"success"`
	Error     *ErrorInfo `json:"error,omitempty"`
	RequestID string     `json:"requestId"`
}

// newErrorResponse creates an error response for middleware
func newErrorResponse(code ErrorCode, message string, requestID string, path string) *MiddlewareResponse {
	return &MiddlewareResponse{
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

	response := &MiddlewareResponse{
		Success: false,
		Error: &ErrorInfo{
			Code:      ErrorCodeRateLimitExceeded,
			Message:   "Rate limit exceeded",
			Timestamp: time.Now().UTC(),
			Path:      c.Request.URL.Path,
		},
		RequestID: requestID,
	}
	c.AbortWithStatusJSON(http.StatusTooManyRequests, response)
}
