// File: backend/internal/models/response_time.go
package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ResponseTimeMetric represents a response time measurement
type ResponseTimeMetric struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	EndpointPath     string     `json:"endpoint_path" db:"endpoint_path"`
	HTTPMethod       string     `json:"http_method" db:"http_method"`
	ResponseTimeMs   float64    `json:"response_time_ms" db:"response_time_ms"`
	PayloadSizeBytes int        `json:"payload_size_bytes" db:"payload_size_bytes"`
	UserID           *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	CampaignID       *uuid.UUID `json:"campaign_id,omitempty" db:"campaign_id"`
	StatusCode       int        `json:"status_code" db:"status_code"`
	RecordedAt       time.Time  `json:"recorded_at" db:"recorded_at"`
}

// ResponseOptimizationRecommendation represents optimization suggestions for slow endpoints
type ResponseOptimizationRecommendation struct {
	ID                     uuid.UUID       `json:"id" db:"id"`
	EndpointPath           string          `json:"endpoint_path" db:"endpoint_path"`
	CurrentAvgResponseMs   float64         `json:"current_avg_response_ms" db:"current_avg_response_ms"`
	TargetResponseMs       float64         `json:"target_response_ms" db:"target_response_ms"`
	OptimizationStrategies json.RawMessage `json:"optimization_strategies" db:"optimization_strategies"`
	Priority               string          `json:"priority" db:"priority"`
	Implemented            bool            `json:"implemented" db:"implemented"`
	ImplementationNotes    *string         `json:"implementation_notes,omitempty" db:"implementation_notes"`
	CreatedAt              time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt              time.Time       `json:"updated_at" db:"updated_at"`
}

// AsyncTaskStatus represents the status of a background task
type AsyncTaskStatus struct {
	ID                    uuid.UUID  `json:"id" db:"id"`
	TaskID                string     `json:"task_id" db:"task_id"`
	TaskType              string     `json:"task_type" db:"task_type"`
	Status                string     `json:"status" db:"status"`
	ProgressPercentage    float64    `json:"progress_percentage" db:"progress_percentage"`
	TotalItems            int        `json:"total_items" db:"total_items"`
	ProcessedItems        int        `json:"processed_items" db:"processed_items"`
	UserID                *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	CampaignID            *uuid.UUID `json:"campaign_id,omitempty" db:"campaign_id"`
	ErrorMessage          *string    `json:"error_message,omitempty" db:"error_message"`
	StartedAt             time.Time  `json:"started_at" db:"started_at"`
	CompletedAt           *time.Time `json:"completed_at,omitempty" db:"completed_at"`
	EstimatedCompletionAt *time.Time `json:"estimated_completion_at,omitempty" db:"estimated_completion_at"`
}

// ResponseTimeAnalytics represents aggregated response time metrics
type ResponseTimeAnalytics struct {
	EndpointPath  string  `json:"endpoint_path" db:"endpoint_path"`
	HTTPMethod    string  `json:"http_method" db:"http_method"`
	AvgResponseMs float64 `json:"avg_response_ms" db:"avg_response_ms"`
	P95ResponseMs float64 `json:"p95_response_ms" db:"p95_response_ms"`
	TotalRequests int64   `json:"total_requests" db:"total_requests"`
	SlowRequests  int64   `json:"slow_requests" db:"slow_requests"`
	ErrorRate     float64 `json:"error_rate" db:"error_rate"`
}

// TaskProgress represents progress information for async tasks
type TaskProgress struct {
	TaskID            string     `json:"task_id"`
	Progress          float64    `json:"progress"`
	ProcessedItems    int        `json:"processed_items"`
	TotalItems        int        `json:"total_items"`
	Status            string     `json:"status"`
	EstimatedComplete *time.Time `json:"estimated_complete,omitempty"`
	ErrorMessage      *string    `json:"error_message,omitempty"`
}

// OptimizationStrategy represents a strategy for improving response times
type OptimizationStrategy struct {
	Strategies      []string `json:"strategies"`
	CurrentAvgMs    float64  `json:"current_avg_ms"`
	SamplesAnalyzed int      `json:"samples_analyzed"`
	Priority        string   `json:"priority"`
	ExpectedGain    float64  `json:"expected_gain_percentage"`
}

// ResponseTimeThresholds defines performance thresholds for different endpoint types
type ResponseTimeThresholds struct {
	List   time.Duration // List endpoints (e.g., /api/campaigns)
	Detail time.Duration // Detail endpoints (e.g., /api/campaigns/{id})
	Create time.Duration // Create operations
	Update time.Duration // Update operations
	Delete time.Duration // Delete operations
	Search time.Duration // Search operations
}

// DefaultResponseTimeThresholds returns the default SLA thresholds
func DefaultResponseTimeThresholds() ResponseTimeThresholds {
	return ResponseTimeThresholds{
		List:   500 * time.Millisecond,
		Detail: 800 * time.Millisecond,
		Create: 1000 * time.Millisecond,
		Update: 800 * time.Millisecond,
		Delete: 500 * time.Millisecond,
		Search: 1200 * time.Millisecond,
	}
}

// GetThresholdForEndpoint returns the appropriate threshold for an endpoint
func (rt ResponseTimeThresholds) GetThresholdForEndpoint(method, path string) time.Duration {
	switch method {
	case "GET":
		if isListEndpoint(path) {
			return rt.List
		}
		if isSearchEndpoint(path) {
			return rt.Search
		}
		return rt.Detail
	case "POST":
		return rt.Create
	case "PUT", "PATCH":
		return rt.Update
	case "DELETE":
		return rt.Delete
	default:
		return rt.Detail
	}
}

// Helper functions to classify endpoints
func isListEndpoint(path string) bool {
	// Simple heuristic: list endpoints typically don't have path parameters
	return !containsPathParam(path)
}

func isSearchEndpoint(path string) bool {
	return containsString(path, "search")
}

func containsPathParam(path string) bool {
	return containsString(path, "{") || containsString(path, ":")
}

func containsString(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr || (len(s) > len(substr) &&
			(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
				contains(s, substr))))
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
