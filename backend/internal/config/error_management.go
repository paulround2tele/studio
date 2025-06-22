// File: backend/internal/config/error_management.go
package config

import (
	"fmt"
	"time"
)

// ErrorManagementConfig holds configuration for the error management system
type ErrorManagementConfig struct {
	EnableDetailedLogging  bool          `json:"enable_detailed_logging" mapstructure:"enable_detailed_logging"`
	EnableStackTraces      bool          `json:"enable_stack_traces" mapstructure:"enable_stack_traces"`
	EnableErrorAggregation bool          `json:"enable_error_aggregation" mapstructure:"enable_error_aggregation"`
	DefaultRetryDelay      time.Duration `json:"default_retry_delay" mapstructure:"default_retry_delay"`
	MaxContextSize         int           `json:"max_context_size" mapstructure:"max_context_size"`
	ErrorRetentionDays     int           `json:"error_retention_days" mapstructure:"error_retention_days"`
	AlertingEnabled        bool          `json:"alerting_enabled" mapstructure:"alerting_enabled"`
	MetricsEnabled         bool          `json:"metrics_enabled" mapstructure:"metrics_enabled"`
	CircuitBreakerEnabled  bool          `json:"circuit_breaker_enabled" mapstructure:"circuit_breaker_enabled"`
	Policies               []ErrorPolicy `json:"policies" mapstructure:"policies"`
}

// ErrorPolicy defines how to handle specific types of errors
type ErrorPolicy struct {
	Category         string        `json:"category" mapstructure:"category"` // database, network, validation, business, system, audit, state, configuration
	Severity         string        `json:"severity" mapstructure:"severity"` // critical, high, medium, low, info
	Action           string        `json:"action" mapstructure:"action"`     // fail, retry, log, escalate, circuit
	MaxRetries       int           `json:"max_retries" mapstructure:"max_retries"`
	RetryDelay       time.Duration `json:"retry_delay" mapstructure:"retry_delay"`
	EscalateAfter    time.Duration `json:"escalate_after" mapstructure:"escalate_after"`
	CircuitThreshold int           `json:"circuit_threshold" mapstructure:"circuit_threshold"`
	AlertThreshold   int           `json:"alert_threshold" mapstructure:"alert_threshold"`
}

// GetDefaultErrorManagementConfig returns the default error management configuration
func GetDefaultErrorManagementConfig() *ErrorManagementConfig {
	return &ErrorManagementConfig{
		EnableDetailedLogging:  true,
		EnableStackTraces:      true,
		EnableErrorAggregation: true,
		DefaultRetryDelay:      1 * time.Second,
		MaxContextSize:         1024 * 1024, // 1MB
		ErrorRetentionDays:     30,
		AlertingEnabled:        true,
		MetricsEnabled:         true,
		CircuitBreakerEnabled:  true,
		Policies: []ErrorPolicy{
			// Critical database errors - fail immediately
			{
				Category:       "database",
				Severity:       "critical",
				Action:         "fail",
				MaxRetries:     0,
				AlertThreshold: 1,
			},
			// High database errors - retry with circuit breaker
			{
				Category:         "database",
				Severity:         "high",
				Action:           "circuit",
				MaxRetries:       3,
				RetryDelay:       2 * time.Second,
				CircuitThreshold: 5,
				AlertThreshold:   3,
			},
			// Network errors - retry with backoff
			{
				Category:       "network",
				Severity:       "medium",
				Action:         "retry",
				MaxRetries:     5,
				RetryDelay:     1 * time.Second,
				AlertThreshold: 10,
			},
			// Audit errors - log and continue (BF-003 compliance)
			{
				Category:       "audit",
				Severity:       "medium",
				Action:         "log",
				MaxRetries:     3,
				RetryDelay:     5 * time.Second,
				AlertThreshold: 5,
			},
			// State management errors - escalate
			{
				Category:       "state",
				Severity:       "high",
				Action:         "escalate",
				MaxRetries:     2,
				RetryDelay:     3 * time.Second,
				EscalateAfter:  5 * time.Minute,
				AlertThreshold: 2,
			},
			// Configuration errors - escalate and circuit break
			{
				Category:         "configuration",
				Severity:         "high",
				Action:           "escalate",
				MaxRetries:       2,
				RetryDelay:       10 * time.Second,
				EscalateAfter:    2 * time.Minute,
				CircuitThreshold: 3,
				AlertThreshold:   1,
			},
			// Validation errors - log only
			{
				Category:       "validation",
				Severity:       "low",
				Action:         "log",
				MaxRetries:     0,
				AlertThreshold: 50,
			},
			// Business logic errors - retry with escalation
			{
				Category:       "business",
				Severity:       "medium",
				Action:         "retry",
				MaxRetries:     3,
				RetryDelay:     2 * time.Second,
				EscalateAfter:  10 * time.Minute,
				AlertThreshold: 10,
			},
			// System errors - circuit breaker
			{
				Category:         "system",
				Severity:         "high",
				Action:           "circuit",
				MaxRetries:       2,
				RetryDelay:       5 * time.Second,
				CircuitThreshold: 3,
				AlertThreshold:   2,
			},
		},
	}
}

// ValidateErrorManagementConfig validates the error management configuration
func ValidateErrorManagementConfig(config *ErrorManagementConfig) error {
	if config == nil {
		return fmt.Errorf("error management config cannot be nil")
	}

	if config.DefaultRetryDelay < 0 {
		return fmt.Errorf("default retry delay must be non-negative")
	}

	if config.MaxContextSize <= 0 {
		return fmt.Errorf("max context size must be positive")
	}

	if config.ErrorRetentionDays <= 0 {
		return fmt.Errorf("error retention days must be positive")
	}

	// Validate policies
	for i, policy := range config.Policies {
		if err := validateErrorPolicy(&policy); err != nil {
			return fmt.Errorf("invalid error policy at index %d: %w", i, err)
		}
	}

	return nil
}

// validateErrorPolicy validates an individual error policy
func validateErrorPolicy(policy *ErrorPolicy) error {
	if policy == nil {
		return fmt.Errorf("policy cannot be nil")
	}

	// Validate category
	validCategories := []string{"database", "network", "validation", "business", "system", "audit", "state", "configuration", "*"}
	if !contains(validCategories, policy.Category) {
		return fmt.Errorf("invalid category: %s", policy.Category)
	}

	// Validate severity
	validSeverities := []string{"critical", "high", "medium", "low", "info", "*"}
	if !contains(validSeverities, policy.Severity) {
		return fmt.Errorf("invalid severity: %s", policy.Severity)
	}

	// Validate action
	validActions := []string{"fail", "retry", "log", "escalate", "circuit"}
	if !contains(validActions, policy.Action) {
		return fmt.Errorf("invalid action: %s", policy.Action)
	}

	// Validate retry settings
	if policy.MaxRetries < 0 {
		return fmt.Errorf("max retries must be non-negative")
	}

	if policy.RetryDelay < 0 {
		return fmt.Errorf("retry delay must be non-negative")
	}

	if policy.CircuitThreshold < 0 {
		return fmt.Errorf("circuit threshold must be non-negative")
	}

	if policy.AlertThreshold < 0 {
		return fmt.Errorf("alert threshold must be non-negative")
	}

	return nil
}

// contains checks if a slice contains a specific string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
