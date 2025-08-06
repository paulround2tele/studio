// Package api provides unified response types for API endpoints
package api

import (
	"time"
)

// ErrorCode represents standard error codes for the API
type ErrorCode string

const (
	// Client errors (4xx)
	ErrorCodeBadRequest        ErrorCode = "BAD_REQUEST"
	ErrorCodeUnauthorized      ErrorCode = "UNAUTHORIZED"
	ErrorCodeForbidden         ErrorCode = "FORBIDDEN"
	ErrorCodeNotFound          ErrorCode = "NOT_FOUND"
	ErrorCodeConflict          ErrorCode = "CONFLICT"
	ErrorCodeValidation        ErrorCode = "VALIDATION_ERROR"
	ErrorCodeRequired          ErrorCode = "REQUIRED_FIELD"
	ErrorCodeRateLimitExceeded ErrorCode = "RATE_LIMIT_EXCEEDED"
	ErrorCodeRequestTimeout    ErrorCode = "REQUEST_TIMEOUT"
	ErrorCodeNotImplemented    ErrorCode = "NOT_IMPLEMENTED"

	// Server errors (5xx)
	ErrorCodeInternalServer     ErrorCode = "INTERNAL_SERVER_ERROR"
	ErrorCodeDatabaseError      ErrorCode = "DATABASE_ERROR"
	ErrorCodeServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"
	ErrorCodeGatewayTimeout     ErrorCode = "GATEWAY_TIMEOUT"

	// Business logic errors
	ErrorCodeCampaignInProgress ErrorCode = "CAMPAIGN_IN_PROGRESS"
	ErrorCodeQuotaExceeded      ErrorCode = "QUOTA_EXCEEDED"
	ErrorCodeInvalidState       ErrorCode = "INVALID_STATE"
)

// ErrorDetail provides detailed information about a specific error
type ErrorDetail struct {
	Field   string      `json:"field,omitempty"`   // Field that caused the error (for validation)
	Code    ErrorCode   `json:"code"`              // Error code
	Message string      `json:"message"`           // Human-readable error message
	Context interface{} `json:"context,omitempty"` // Additional context data
}

// APIResponse represents the unified response format for all API endpoints
// @Description Standard API response envelope used by all endpoints
type APIResponse struct {
	Success   bool        `json:"success" example:"true"`                   // Indicates if the request was successful
	Data      interface{} `json:"data,omitempty" swaggertype:"object"`      // Response data (only present on success)
	Error     *ErrorInfo  `json:"error,omitempty"`                          // Error information (only present on failure)
	Metadata  *Metadata   `json:"metadata,omitempty"`                       // Optional metadata
	RequestID string      `json:"requestId" example:"req_1234567890abcdef"` // Unique request identifier for tracing
}

// ErrorInfo contains comprehensive error information
// @Description Detailed error information structure
type ErrorInfo struct {
	Code      ErrorCode     `json:"code" example:"VALIDATION_ERROR"`                     // Primary error code
	Message   string        `json:"message" example:"Invalid input parameters"`          // Primary error message
	Details   []ErrorDetail `json:"details,omitempty"`                                   // Detailed error information
	Timestamp time.Time     `json:"timestamp" example:"2023-01-01T12:00:00Z"`            // When the error occurred
	Path      string        `json:"path,omitempty" example:"/api/v2/campaigns/validate"` // API path that generated the error
}

// Metadata contains optional response metadata
// @Description Optional metadata attached to API responses
type Metadata struct {
	Page       *PageInfo              `json:"page,omitempty"`       // Pagination info
	RateLimit  *RateLimitInfo         `json:"rateLimit,omitempty"`  // Rate limiting info
	Processing *ProcessingInfo        `json:"processing,omitempty"` // Processing time info
	Extra      map[string]interface{} `json:"extra,omitempty"`      // Additional metadata
}

// PageInfo contains pagination metadata
type PageInfo struct {
	Current  int `json:"current"`  // Current page number
	Total    int `json:"total"`    // Total number of pages
	PageSize int `json:"pageSize"` // Items per page
	Count    int `json:"count"`    // Total item count
}

// RateLimitInfo contains rate limiting information
type RateLimitInfo struct {
	Limit     int       `json:"limit"`     // Request limit
	Remaining int       `json:"remaining"` // Remaining requests
	Reset     time.Time `json:"reset"`     // When the limit resets
}

// ProcessingInfo contains request processing metadata
type ProcessingInfo struct {
	Duration string `json:"duration"` // Processing duration (e.g., "125ms")
	Version  string `json:"version"`  // API version
}

// NewSuccessResponse creates a successful API response
func NewSuccessResponse(data interface{}, requestID string) *APIResponse {
	return &APIResponse{
		Success:   true,
		Data:      data,
		RequestID: requestID,
	}
}

// NewErrorResponse creates an error API response
func NewErrorResponse(code ErrorCode, message string, requestID string, path string) *APIResponse {
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

// NewValidationErrorResponse creates a validation error response with field details
func NewValidationErrorResponse(errors []ErrorDetail, requestID string, path string) *APIResponse {
	return &APIResponse{
		Success: false,
		Error: &ErrorInfo{
			Code:      ErrorCodeValidation,
			Message:   "Validation failed",
			Details:   errors,
			Timestamp: time.Now().UTC(),
			Path:      path,
		},
		RequestID: requestID,
	}
}

// WithMetadata adds metadata to the response
func (r *APIResponse) WithMetadata(metadata *Metadata) *APIResponse {
	r.Metadata = metadata
	return r
}

// AddErrorDetail adds an error detail to an error response
func (r *APIResponse) AddErrorDetail(detail ErrorDetail) *APIResponse {
	if r.Error != nil {
		r.Error.Details = append(r.Error.Details, detail)
	}
	return r
}
