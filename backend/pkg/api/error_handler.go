package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// StandardErrorResponse is returned for all API errors.
type StandardErrorResponse struct {
	Error   ErrorDetail `json:"error"`
	TraceID string      `json:"trace_id"`
	Meta    ErrorMeta   `json:"meta,omitempty"`
}

// ErrorDetail describes a particular error.
type ErrorDetail struct {
	Code        string            `json:"code"`
	Message     string            `json:"message"`
	Details     string            `json:"details,omitempty"`
	Fields      map[string]string `json:"fields,omitempty"`
	Suggestions []string          `json:"suggestions,omitempty"`
}

// ErrorMeta contains metadata about an error response.
type ErrorMeta struct {
	Timestamp  time.Time `json:"timestamp"`
	Path       string    `json:"path"`
	Method     string    `json:"method"`
	UserAgent  string    `json:"user_agent,omitempty"`
	APIVersion string    `json:"api_version"`
}

// ErrorHandler provides standardized error responses.
type ErrorHandler struct {
	logger *log.Logger
}

// NewErrorHandler creates a new handler with the provided logger.
func NewErrorHandler(logger *log.Logger) *ErrorHandler {
	if logger == nil {
		logger = log.Default()
	}
	return &ErrorHandler{logger: logger}
}

// HandleError writes a standardized error response.
func (eh *ErrorHandler) HandleError(ctx context.Context, err error, req *http.Request, w http.ResponseWriter) {
	traceID := eh.getTraceID(ctx)
	status, detail := eh.classifyError(err)
	resp := StandardErrorResponse{
		Error:   detail,
		TraceID: traceID,
		Meta: ErrorMeta{
			Timestamp:  time.Now(),
			Path:       req.URL.Path,
			Method:     req.Method,
			UserAgent:  req.Header.Get("User-Agent"),
			APIVersion: eh.extractAPIVersion(req),
		},
	}

	eh.logError(status, resp, err)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Trace-ID", traceID)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(resp)
}

func (eh *ErrorHandler) classifyError(err error) (int, ErrorDetail) {
	switch e := err.(type) {
	case *ValidationError:
		return http.StatusBadRequest, ErrorDetail{
			Code:        "VALIDATION_ERROR",
			Message:     "Request validation failed",
			Details:     e.Error(),
			Fields:      e.FieldErrors,
			Suggestions: e.Suggestions,
		}
	case *AuthenticationError:
		return http.StatusUnauthorized, ErrorDetail{
			Code:        "AUTHENTICATION_ERROR",
			Message:     "Authentication required",
			Details:     e.Error(),
			Suggestions: []string{"Provide valid authentication credentials"},
		}
	case *AuthorizationError:
		return http.StatusForbidden, ErrorDetail{
			Code:        "AUTHORIZATION_ERROR",
			Message:     "Insufficient permissions",
			Details:     e.Error(),
			Suggestions: []string{"Contact administrator for required permissions"},
		}
	case *NotFoundError:
		return http.StatusNotFound, ErrorDetail{
			Code:        "RESOURCE_NOT_FOUND",
			Message:     "Requested resource not found",
			Details:     e.Error(),
			Suggestions: []string{"Check resource ID", "Ensure resource exists"},
		}
	case *ConflictError:
		return http.StatusConflict, ErrorDetail{
			Code:        "RESOURCE_CONFLICT",
			Message:     "Resource conflict detected",
			Details:     e.Error(),
			Suggestions: []string{"Refresh resource state", "Resolve conflicts manually"},
		}
	case *RateLimitError:
		return http.StatusTooManyRequests, ErrorDetail{
			Code:        "RATE_LIMIT_EXCEEDED",
			Message:     "Rate limit exceeded",
			Details:     e.Error(),
			Suggestions: []string{"Reduce request rate", "Implement exponential backoff"},
		}
	default:
		return http.StatusInternalServerError, ErrorDetail{
			Code:        "INTERNAL_SERVER_ERROR",
			Message:     "An internal server error occurred",
			Details:     "Contact support if the issue persists",
			Suggestions: []string{"Retry the request", "Contact support"},
		}
	}
}

// Middleware returns a standard HTTP middleware that recovers from panics and handles errors.
func (eh *ErrorHandler) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					err := fmt.Errorf("panic recovered: %v", rec)
					eh.HandleError(r.Context(), err, r, w)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// dummy helpers and error types for demonstration
func (eh *ErrorHandler) getTraceID(ctx context.Context) string      { return "trace" }
func (eh *ErrorHandler) extractAPIVersion(req *http.Request) string { return "v1" }
func (eh *ErrorHandler) logError(status int, resp StandardErrorResponse, err error) {
	eh.logger.Printf("%d %s: %v", status, resp.Error.Code, err)
}

type ValidationError struct {
	FieldErrors map[string]string
	Suggestions []string
	err         error
}

func (e *ValidationError) Error() string { return e.err.Error() }

type AuthenticationError struct{ err error }

func (e *AuthenticationError) Error() string { return e.err.Error() }

type AuthorizationError struct{ err error }

func (e *AuthorizationError) Error() string { return e.err.Error() }

type NotFoundError struct{ err error }

func (e *NotFoundError) Error() string { return e.err.Error() }

type ConflictError struct{ err error }

func (e *ConflictError) Error() string { return e.err.Error() }

type RateLimitError struct{ err error }

func (e *RateLimitError) Error() string { return e.err.Error() }
