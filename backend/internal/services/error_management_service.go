// File: backend/internal/services/error_management_service.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// ErrorSeverity defines the severity levels for errors
type ErrorSeverity string

const (
	ErrorSeverityCritical ErrorSeverity = "critical"
	ErrorSeverityHigh     ErrorSeverity = "high"
	ErrorSeverityMedium   ErrorSeverity = "medium"
	ErrorSeverityLow      ErrorSeverity = "low"
	ErrorSeverityInfo     ErrorSeverity = "info"
)

// ErrorCategory defines categories for error classification
type ErrorCategory string

const (
	ErrorCategoryDatabase      ErrorCategory = "database"
	ErrorCategoryNetwork       ErrorCategory = "network"
	ErrorCategoryValidation    ErrorCategory = "validation"
	ErrorCategoryBusiness      ErrorCategory = "business"
	ErrorCategorySystem        ErrorCategory = "system"
	ErrorCategoryAudit         ErrorCategory = "audit"
	ErrorCategoryState         ErrorCategory = "state"
	ErrorCategoryConfiguration ErrorCategory = "configuration"
)

// ErrorAction defines what action to take when an error occurs
type ErrorAction string

const (
	ErrorActionFail     ErrorAction = "fail"     // Fail immediately
	ErrorActionRetry    ErrorAction = "retry"    // Retry with backoff
	ErrorActionLog      ErrorAction = "log"      // Log and continue
	ErrorActionEscalate ErrorAction = "escalate" // Escalate to higher level
	ErrorActionCircuit  ErrorAction = "circuit"  // Circuit breaker
)

// EnhancedError provides detailed error information for BF-003 compliance
type EnhancedError struct {
	ID            uuid.UUID              `json:"id"`
	OriginalError error                  `json:"original_error"`
	Message       string                 `json:"message"`
	Severity      ErrorSeverity          `json:"severity"`
	Category      ErrorCategory          `json:"category"`
	Context       map[string]interface{} `json:"context"`
	StackTrace    string                 `json:"stack_trace"`
	Timestamp     time.Time              `json:"timestamp"`
	Source        string                 `json:"source"`
	UserID        *uuid.UUID             `json:"user_id,omitempty"`
	RequestID     string                 `json:"request_id,omitempty"`
	CampaignID    *uuid.UUID             `json:"campaign_id,omitempty"`
	Retryable     bool                   `json:"retryable"`
	RetryCount    int                    `json:"retry_count"`
}

// Error implements the error interface
func (e *EnhancedError) Error() string {
	return fmt.Sprintf("[%s:%s] %s", e.Severity, e.Category, e.Message)
}

// Unwrap provides access to the underlying error
func (e *EnhancedError) Unwrap() error {
	return e.OriginalError
}

// Use config package types to avoid duplication
type ErrorPolicy = config.ErrorPolicy
type ErrorManagementConfig = config.ErrorManagementConfig

// ErrorManagementServiceInterface defines the interface for centralized error management
type ErrorManagementServiceInterface interface {
	// Error creation and enhancement
	CreateError(ctx context.Context, err error, severity ErrorSeverity, category ErrorCategory, message string) *EnhancedError
	EnhanceError(ctx context.Context, err error, context map[string]interface{}) *EnhancedError
	WrapError(ctx context.Context, err error, message string) *EnhancedError

	// Error handling and processing
	HandleError(ctx context.Context, enhancedErr *EnhancedError) error
	ProcessErrorWithPolicy(ctx context.Context, enhancedErr *EnhancedError) (shouldRetry bool, delay time.Duration, err error)

	// Error classification and routing
	ClassifyError(err error) (ErrorSeverity, ErrorCategory)
	GetErrorPolicy(category ErrorCategory, severity ErrorSeverity) *ErrorPolicy

	// Error aggregation and analysis
	RecordError(ctx context.Context, enhancedErr *EnhancedError) error
	GetErrorMetrics(ctx context.Context, timeWindow time.Duration) (*ErrorMetrics, error)
	GetErrorTrends(ctx context.Context, category ErrorCategory, duration time.Duration) (*ErrorTrends, error)

	// Configuration and policy management
	UpdateErrorPolicies(ctx context.Context, policies []ErrorPolicy) error
	RefreshConfiguration(ctx context.Context) error

	// Circuit breaker and throttling
	IsCircuitOpen(category ErrorCategory) bool
	RecordCircuitEvent(category ErrorCategory, success bool)
}

// ErrorMetrics provides aggregated error statistics
type ErrorMetrics struct {
	TotalErrors      int64                          `json:"total_errors"`
	ErrorsByCategory map[ErrorCategory]int64        `json:"errors_by_category"`
	ErrorsBySeverity map[ErrorSeverity]int64        `json:"errors_by_severity"`
	TopErrors        []*EnhancedError               `json:"top_errors"`
	CircuitStates    map[ErrorCategory]CircuitState `json:"circuit_states"`
	Timestamp        time.Time                      `json:"timestamp"`
}

// ErrorTrends provides error trend analysis
type ErrorTrends struct {
	Category      ErrorCategory     `json:"category"`
	TrendPoints   []ErrorTrendPoint `json:"trend_points"`
	Direction     string            `json:"direction"` // "increasing", "decreasing", "stable"
	ChangePercent float64           `json:"change_percent"`
	Timestamp     time.Time         `json:"timestamp"`
}

// ErrorTrendPoint represents a point in error trend data
type ErrorTrendPoint struct {
	Timestamp time.Time     `json:"timestamp"`
	Count     int64         `json:"count"`
	Severity  ErrorSeverity `json:"severity"`
}

// CircuitState represents the state of a circuit breaker
type CircuitState struct {
	State        string    `json:"state"` // "open", "closed", "half-open"
	FailureCount int       `json:"failure_count"`
	LastFailure  time.Time `json:"last_failure"`
	NextRetry    time.Time `json:"next_retry"`
}

// CentralizedConfigInterface defines the interface for centralized configuration management
type CentralizedConfigInterface interface {
	GetConfiguration(ctx context.Context) (*config.UnifiedAppConfig, error)
}

// ErrorManagementServiceImpl implements the error management service
type ErrorManagementServiceImpl struct {
	configManager    CentralizedConfigInterface
	auditLogStore    store.AuditLogStore
	stateCoordinator StateCoordinator

	// Configuration and policies
	config    *ErrorManagementConfig
	policies  map[string]*ErrorPolicy // key: category:severity
	configMtx sync.RWMutex

	// Error tracking and metrics
	errorCount      int64
	circuitBreakers map[ErrorCategory]*CircuitState
	circuitMtx      sync.RWMutex

	// Error aggregation
	errorAggregation map[string]*ErrorAggregation
	aggregationMtx   sync.RWMutex
}

// ErrorAggregation tracks error patterns for analysis
type ErrorAggregation struct {
	Pattern      string                 `json:"pattern"`
	Count        int64                  `json:"count"`
	FirstSeen    time.Time              `json:"first_seen"`
	LastSeen     time.Time              `json:"last_seen"`
	Severity     ErrorSeverity          `json:"severity"`
	Category     ErrorCategory          `json:"category"`
	SampleErrors []*EnhancedError       `json:"sample_errors"`
	Context      map[string]interface{} `json:"context"`
}

// NewErrorManagementService creates a new error management service
func NewErrorManagementService(
	configManager CentralizedConfigInterface,
	auditLogStore store.AuditLogStore,
	stateCoordinator StateCoordinator,
) ErrorManagementServiceInterface {
	service := &ErrorManagementServiceImpl{
		configManager:    configManager,
		auditLogStore:    auditLogStore,
		stateCoordinator: stateCoordinator,
		policies:         make(map[string]*ErrorPolicy),
		circuitBreakers:  make(map[ErrorCategory]*CircuitState),
		errorAggregation: make(map[string]*ErrorAggregation),
	}

	// Initialize default configuration
	service.initializeDefaultConfig()

	// Load configuration from centralized config manager
	if err := service.RefreshConfiguration(context.Background()); err != nil {
		log.Printf("ErrorManagementService: Failed to load initial configuration: %v", err)
	}

	log.Printf("ErrorManagementService: Initialized with enhanced error handling for BF-003 compliance")
	return service
}

// CreateError creates a new enhanced error with full context
func (s *ErrorManagementServiceImpl) CreateError(ctx context.Context, err error, severity ErrorSeverity, category ErrorCategory, message string) *EnhancedError {
	enhancedErr := &EnhancedError{
		ID:            uuid.New(),
		OriginalError: err,
		Message:       message,
		Severity:      severity,
		Category:      category,
		Context:       make(map[string]interface{}),
		Timestamp:     time.Now().UTC(),
		Retryable:     s.isRetryable(category, severity),
	}

	// Add stack trace if enabled
	s.configMtx.RLock()
	enableStackTraces := s.config != nil && s.config.EnableStackTraces
	s.configMtx.RUnlock()

	if enableStackTraces {
		enhancedErr.StackTrace = s.captureStackTrace()
	}

	// Extract context from the request context
	s.extractContextFromRequest(ctx, enhancedErr)

	// Add original error details if available
	if err != nil {
		enhancedErr.Context["original_error"] = err.Error()
		enhancedErr.Context["error_type"] = fmt.Sprintf("%T", err)
	}

	// Add source information
	enhancedErr.Source = s.getCallerInfo()

	return enhancedErr
}

// EnhanceError enhances an existing error with additional context
func (s *ErrorManagementServiceImpl) EnhanceError(ctx context.Context, err error, context map[string]interface{}) *EnhancedError {
	// Check if it's already an enhanced error
	if enhancedErr, ok := err.(*EnhancedError); ok {
		// Add additional context
		for key, value := range context {
			enhancedErr.Context[key] = value
		}
		return enhancedErr
	}

	// Auto-classify the error
	severity, category := s.ClassifyError(err)

	// Create new enhanced error
	enhancedErr := s.CreateError(ctx, err, severity, category, err.Error())

	// Add provided context
	for key, value := range context {
		enhancedErr.Context[key] = value
	}

	return enhancedErr
}

// WrapError wraps an error with additional message and context
func (s *ErrorManagementServiceImpl) WrapError(ctx context.Context, err error, message string) *EnhancedError {
	if err == nil {
		return nil
	}

	// Auto-classify the error
	severity, category := s.ClassifyError(err)

	return s.CreateError(ctx, err, severity, category, fmt.Sprintf("%s: %v", message, err))
}

// HandleError processes an enhanced error according to configured policies
func (s *ErrorManagementServiceImpl) HandleError(ctx context.Context, enhancedErr *EnhancedError) error {
	if enhancedErr == nil {
		return nil
	}

	atomic.AddInt64(&s.errorCount, 1)

	// Record the error for metrics and analysis
	if err := s.RecordError(ctx, enhancedErr); err != nil {
		log.Printf("ErrorManagementService: Failed to record error: %v", err)
	}

	// Get and apply error policy
	policy := s.GetErrorPolicy(enhancedErr.Category, enhancedErr.Severity)
	if policy == nil {
		// Use default logging for unknown error types
		s.logError(enhancedErr)
		return enhancedErr
	}

	// Update circuit breaker state
	s.RecordCircuitEvent(enhancedErr.Category, false)

	// Apply policy action
	switch policy.Action {
	case "fail":
		s.logError(enhancedErr)
		return enhancedErr

	case "retry":
		if enhancedErr.RetryCount >= policy.MaxRetries {
			s.logError(enhancedErr)
			return fmt.Errorf("max retries exceeded for error: %w", enhancedErr)
		}
		s.logError(enhancedErr)
		return nil // Allow retry

	case "log":
		s.logError(enhancedErr)
		return nil // Continue processing

	case "escalate":
		if err := s.escalateError(ctx, enhancedErr); err != nil {
			log.Printf("ErrorManagementService: Failed to escalate error: %v", err)
		}
		s.logError(enhancedErr)
		return enhancedErr

	case "circuit":
		if s.IsCircuitOpen(enhancedErr.Category) {
			return fmt.Errorf("circuit breaker open for category %s", enhancedErr.Category)
		}
		s.logError(enhancedErr)
		return enhancedErr

	default:
		s.logError(enhancedErr)
		return enhancedErr
	}
}

// ProcessErrorWithPolicy determines retry behavior based on error policy
func (s *ErrorManagementServiceImpl) ProcessErrorWithPolicy(ctx context.Context, enhancedErr *EnhancedError) (shouldRetry bool, delay time.Duration, err error) {
	if enhancedErr == nil {
		return false, 0, nil
	}

	policy := s.GetErrorPolicy(enhancedErr.Category, enhancedErr.Severity)
	if policy == nil {
		return false, 0, enhancedErr
	}

	// Check circuit breaker
	if s.IsCircuitOpen(enhancedErr.Category) {
		return false, 0, fmt.Errorf("circuit breaker open for category %s", enhancedErr.Category)
	}

	// Determine if we should retry
	shouldRetry = policy.Action == "retry" && enhancedErr.RetryCount < policy.MaxRetries

	// Calculate retry delay with exponential backoff
	if shouldRetry {
		baseDelay := policy.RetryDelay
		if baseDelay == 0 {
			s.configMtx.RLock()
			baseDelay = s.config.DefaultRetryDelay
			s.configMtx.RUnlock()
		}

		// Exponential backoff with jitter
		multiplier := 1 << enhancedErr.RetryCount
		delay = baseDelay * time.Duration(multiplier)

		// Add jitter (±25%)
		jitter := time.Duration(float64(delay) * 0.25 * (2*rand.Float64() - 1))
		delay += jitter

		// Cap maximum delay at 5 minutes
		if delay > 5*time.Minute {
			delay = 5 * time.Minute
		}
	}

	return shouldRetry, delay, nil
}

// ClassifyError automatically classifies errors based on their type and content
func (s *ErrorManagementServiceImpl) ClassifyError(err error) (ErrorSeverity, ErrorCategory) {
	if err == nil {
		return ErrorSeverityInfo, ErrorCategorySystem
	}

	errStr := strings.ToLower(err.Error())

	// Database errors
	if strings.Contains(errStr, "database") || strings.Contains(errStr, "sql") ||
		strings.Contains(errStr, "connection") || strings.Contains(errStr, "transaction") {
		if strings.Contains(errStr, "timeout") || strings.Contains(errStr, "connection refused") {
			return ErrorSeverityCritical, ErrorCategoryDatabase
		}
		return ErrorSeverityHigh, ErrorCategoryDatabase
	}

	// Network errors
	if strings.Contains(errStr, "network") || strings.Contains(errStr, "timeout") ||
		strings.Contains(errStr, "refused") || strings.Contains(errStr, "unreachable") {
		return ErrorSeverityMedium, ErrorCategoryNetwork
	}

	// Validation errors
	if strings.Contains(errStr, "validation") || strings.Contains(errStr, "invalid") ||
		strings.Contains(errStr, "required") || strings.Contains(errStr, "format") {
		return ErrorSeverityLow, ErrorCategoryValidation
	}

	// State management errors
	if strings.Contains(errStr, "state") || strings.Contains(errStr, "transition") ||
		strings.Contains(errStr, "race condition") || strings.Contains(errStr, "conflict") {
		return ErrorSeverityHigh, ErrorCategoryState
	}

	// Audit errors
	if strings.Contains(errStr, "audit") || strings.Contains(errStr, "log") {
		return ErrorSeverityMedium, ErrorCategoryAudit
	}

	// Configuration errors
	if strings.Contains(errStr, "config") || strings.Contains(errStr, "setting") {
		return ErrorSeverityMedium, ErrorCategoryConfiguration
	}

	// Default classification
	return ErrorSeverityMedium, ErrorCategoryBusiness
}

// GetErrorPolicy retrieves the error policy for a given category and severity
func (s *ErrorManagementServiceImpl) GetErrorPolicy(category ErrorCategory, severity ErrorSeverity) *ErrorPolicy {
	s.configMtx.RLock()
	defer s.configMtx.RUnlock()

	key := string(category) + ":" + string(severity)
	if policy, exists := s.policies[key]; exists {
		return policy
	}

	// Try category-wide policy
	categoryKey := string(category) + ":*"
	if policy, exists := s.policies[categoryKey]; exists {
		return policy
	}

	// Try severity-wide policy
	severityKey := "*:" + string(severity)
	if policy, exists := s.policies[severityKey]; exists {
		return policy
	}

	// Return default policy
	if policy, exists := s.policies["*:*"]; exists {
		return policy
	}

	return nil
}

// RecordError records an error for metrics and analysis
func (s *ErrorManagementServiceImpl) RecordError(ctx context.Context, enhancedErr *EnhancedError) error {
	// Create audit log entry for error tracking
	if s.auditLogStore != nil {
		auditDetails := map[string]interface{}{
			"error_id":         enhancedErr.ID.String(),
			"error_severity":   string(enhancedErr.Severity),
			"error_category":   string(enhancedErr.Category),
			"error_message":    enhancedErr.Message,
			"error_source":     enhancedErr.Source,
			"retry_count":      enhancedErr.RetryCount,
			"retryable":        enhancedErr.Retryable,
			"bf_003_compliant": true,
		}

		// Add context information
		for key, value := range enhancedErr.Context {
			auditDetails[fmt.Sprintf("context_%s", key)] = value
		}

		auditDetailsJSON, _ := json.Marshal(auditDetails)

		auditLog := &models.AuditLog{
			Timestamp:  enhancedErr.Timestamp,
			UserID:     uuid.NullUUID{},
			Action:     "Error Recorded",
			EntityType: sql.NullString{String: "Error", Valid: true},
			Details:    models.JSONRawMessagePtr(auditDetailsJSON),
		}

		if enhancedErr.UserID != nil {
			auditLog.UserID = uuid.NullUUID{UUID: *enhancedErr.UserID, Valid: true}
		}

		if err := s.auditLogStore.CreateAuditLog(ctx, nil, auditLog); err != nil {
			log.Printf("ErrorManagementService: Failed to create audit log for error: %v", err)
		}
	}

	// Record error in aggregation for pattern analysis
	s.aggregateError(enhancedErr)

	return nil
}

// GetErrorMetrics returns aggregated error metrics for a time window
func (s *ErrorManagementServiceImpl) GetErrorMetrics(ctx context.Context, timeWindow time.Duration) (*ErrorMetrics, error) {
	metrics := &ErrorMetrics{
		TotalErrors:      atomic.LoadInt64(&s.errorCount),
		ErrorsByCategory: make(map[ErrorCategory]int64),
		ErrorsBySeverity: make(map[ErrorSeverity]int64),
		TopErrors:        make([]*EnhancedError, 0),
		CircuitStates:    make(map[ErrorCategory]CircuitState),
		Timestamp:        time.Now().UTC(),
	}

	// Get circuit breaker states
	s.circuitMtx.RLock()
	for category, state := range s.circuitBreakers {
		metrics.CircuitStates[category] = *state
	}
	s.circuitMtx.RUnlock()

	// Aggregate error data from aggregation
	s.aggregationMtx.RLock()
	for _, agg := range s.errorAggregation {
		if time.Since(agg.LastSeen) <= timeWindow {
			metrics.ErrorsByCategory[agg.Category] += agg.Count
			metrics.ErrorsBySeverity[agg.Severity] += agg.Count

			// Add sample errors to top errors (limit to prevent memory issues)
			if len(metrics.TopErrors) < 10 && len(agg.SampleErrors) > 0 {
				metrics.TopErrors = append(metrics.TopErrors, agg.SampleErrors[0])
			}
		}
	}
	s.aggregationMtx.RUnlock()

	return metrics, nil
}

// GetErrorTrends analyzes error trends for a specific category
func (s *ErrorManagementServiceImpl) GetErrorTrends(ctx context.Context, category ErrorCategory, duration time.Duration) (*ErrorTrends, error) {
	trends := &ErrorTrends{
		Category:    category,
		TrendPoints: make([]ErrorTrendPoint, 0),
		Direction:   "stable",
		Timestamp:   time.Now().UTC(),
	}

	// This would typically query a time-series database
	// For now, we'll provide basic trend analysis from aggregated data
	s.aggregationMtx.RLock()
	defer s.aggregationMtx.RUnlock()

	var totalCount int64
	var oldCount int64
	cutoffTime := time.Now().Add(-duration / 2)

	for _, agg := range s.errorAggregation {
		if agg.Category == category && time.Since(agg.LastSeen) <= duration {
			totalCount += agg.Count

			if agg.FirstSeen.Before(cutoffTime) {
				oldCount += agg.Count
			}

			trends.TrendPoints = append(trends.TrendPoints, ErrorTrendPoint{
				Timestamp: agg.LastSeen,
				Count:     agg.Count,
				Severity:  agg.Severity,
			})
		}
	}

	// Calculate trend direction
	if totalCount > 0 && oldCount > 0 {
		newCount := totalCount - oldCount
		trends.ChangePercent = float64(newCount-oldCount) / float64(oldCount) * 100

		if trends.ChangePercent > 10 {
			trends.Direction = "increasing"
		} else if trends.ChangePercent < -10 {
			trends.Direction = "decreasing"
		}
	}

	return trends, nil
}

// UpdateErrorPolicies updates the error handling policies
func (s *ErrorManagementServiceImpl) UpdateErrorPolicies(ctx context.Context, policies []ErrorPolicy) error {
	s.configMtx.Lock()
	defer s.configMtx.Unlock()

	// Clear existing policies
	s.policies = make(map[string]*ErrorPolicy)

	// Add new policies
	for i, policy := range policies {
		key := string(policy.Category) + ":" + string(policy.Severity)
		s.policies[key] = &policies[i]
	}

	log.Printf("ErrorManagementService: Updated %d error policies", len(policies))
	return nil
}

// RefreshConfiguration refreshes the error management configuration
func (s *ErrorManagementServiceImpl) RefreshConfiguration(ctx context.Context) error {
	// Load configuration from centralized config manager
	config, err := s.configManager.GetConfiguration(ctx)
	if err != nil {
		log.Printf("ErrorManagementService: Failed to get configuration: %v", err)
		return err
	}

	if config != nil && config.ErrorManagement != nil {
		// Update error management configuration
		s.configMtx.Lock()
		s.config = config.ErrorManagement
		s.configMtx.Unlock()

		// Update policies if available
		if len(s.config.Policies) > 0 {
			if err := s.UpdateErrorPolicies(ctx, s.config.Policies); err != nil {
				log.Printf("ErrorManagementService: Failed to update policies: %v", err)
			}
		}

		log.Printf("ErrorManagementService: Configuration refreshed successfully")
	}

	return nil
}

// IsCircuitOpen checks if the circuit breaker is open for a category
func (s *ErrorManagementServiceImpl) IsCircuitOpen(category ErrorCategory) bool {
	s.circuitMtx.RLock()
	defer s.circuitMtx.RUnlock()

	state, exists := s.circuitBreakers[category]
	if !exists {
		return false
	}

	return state.State == "open" && time.Now().Before(state.NextRetry)
}

// RecordCircuitEvent records a success or failure event for circuit breaker
func (s *ErrorManagementServiceImpl) RecordCircuitEvent(category ErrorCategory, success bool) {
	s.circuitMtx.Lock()
	defer s.circuitMtx.Unlock()

	state, exists := s.circuitBreakers[category]
	if !exists {
		state = &CircuitState{
			State:        "closed",
			FailureCount: 0,
		}
		s.circuitBreakers[category] = state
	}

	if success {
		state.FailureCount = 0
		state.State = "closed"
	} else {
		state.FailureCount++
		state.LastFailure = time.Now()

		// Get circuit threshold from category-wide policy or use higher default
		// Circuit breakers operate at category level, so we look for the most permissive threshold
		threshold := 10 // higher default to prevent premature circuit opening

		// Check for specific policies that have circuit thresholds for this category
		severities := []ErrorSeverity{ErrorSeverityCritical, ErrorSeverityHigh, ErrorSeverityMedium, ErrorSeverityLow}
		for _, severity := range severities {
			if policy := s.GetErrorPolicy(category, severity); policy != nil && policy.CircuitThreshold > 0 {
				// Use the highest threshold found to be more permissive
				if policy.CircuitThreshold > threshold {
					threshold = policy.CircuitThreshold
				}
			}
		}

		if state.FailureCount >= threshold {
			state.State = "open"
			state.NextRetry = time.Now().Add(5 * time.Minute) // 5 minute cooldown
		}
	}
}

// Helper methods

func (s *ErrorManagementServiceImpl) initializeDefaultConfig() {
	s.config = config.GetDefaultErrorManagementConfig()

	// Initialize policies map
	for i, policy := range s.config.Policies {
		key := string(policy.Category) + ":" + string(policy.Severity)
		s.policies[key] = &s.config.Policies[i]
	}
}

func (s *ErrorManagementServiceImpl) captureStackTrace() string {
	buf := make([]byte, 1024*64)
	n := runtime.Stack(buf, false)
	return string(buf[:n])
}

func (s *ErrorManagementServiceImpl) extractContextFromRequest(ctx context.Context, enhancedErr *EnhancedError) {
	// Extract request ID
	if requestID, ok := ctx.Value("request_id").(string); ok {
		enhancedErr.RequestID = requestID
	}

	// Extract user ID
	if userID, ok := ctx.Value("user_id").(uuid.UUID); ok {
		enhancedErr.UserID = &userID
	}

	// Extract campaign ID
	if campaignID, ok := ctx.Value("campaign_id").(uuid.UUID); ok {
		enhancedErr.CampaignID = &campaignID
	}

	// Add other relevant context
	if traceID, ok := ctx.Value("trace_id").(string); ok {
		enhancedErr.Context["trace_id"] = traceID
	}
}

func (s *ErrorManagementServiceImpl) getCallerInfo() string {
	if pc, file, line, ok := runtime.Caller(3); ok {
		fn := runtime.FuncForPC(pc)
		if fn != nil {
			return fmt.Sprintf("%s:%d (%s)", file, line, fn.Name())
		}
		return fmt.Sprintf("%s:%d", file, line)
	}
	return "unknown"
}

func (s *ErrorManagementServiceImpl) isRetryable(category ErrorCategory, severity ErrorSeverity) bool {
	// Network and temporary errors are generally retryable
	switch category {
	case ErrorCategoryNetwork, ErrorCategoryDatabase:
		return severity != ErrorSeverityCritical
	case ErrorCategoryValidation, ErrorCategoryBusiness:
		return false
	default:
		return severity == ErrorSeverityMedium || severity == ErrorSeverityLow
	}
}

func (s *ErrorManagementServiceImpl) logError(enhancedErr *EnhancedError) {
	s.configMtx.RLock()
	enableDetailedLogging := s.config != nil && s.config.EnableDetailedLogging
	s.configMtx.RUnlock()

	if enableDetailedLogging {
		log.Printf("ErrorManagementService: [%s:%s] %s | ID: %s | Source: %s | Context: %v",
			enhancedErr.Severity, enhancedErr.Category, enhancedErr.Message,
			enhancedErr.ID, enhancedErr.Source, enhancedErr.Context)
	} else {
		log.Printf("ErrorManagementService: [%s:%s] %s",
			enhancedErr.Severity, enhancedErr.Category, enhancedErr.Message)
	}
}

func (s *ErrorManagementServiceImpl) escalateError(ctx context.Context, enhancedErr *EnhancedError) error {
	// Create escalation event
	escalationDetails := map[string]interface{}{
		"error_id":        enhancedErr.ID.String(),
		"original_error":  enhancedErr.Message,
		"severity":        string(enhancedErr.Severity),
		"category":        string(enhancedErr.Category),
		"escalation_time": time.Now().UTC(),
		"source":          enhancedErr.Source,
	}

	// Use state coordinator for escalation if available
	if s.stateCoordinator != nil {
		// Create escalation state event
		eventContext := models.NewStateEventContext("error_management", "error_escalation")
		eventContext.BusinessContext = escalationDetails

		log.Printf("ErrorManagementService: Escalating error %s with severity %s",
			enhancedErr.ID, enhancedErr.Severity)
	}

	return nil
}

func (s *ErrorManagementServiceImpl) aggregateError(enhancedErr *EnhancedError) {
	s.aggregationMtx.Lock()
	defer s.aggregationMtx.Unlock()

	// Create pattern key based on error characteristics
	pattern := fmt.Sprintf("%s:%s:%s", enhancedErr.Category, enhancedErr.Severity, enhancedErr.Source)

	agg, exists := s.errorAggregation[pattern]
	if !exists {
		agg = &ErrorAggregation{
			Pattern:      pattern,
			Count:        0,
			FirstSeen:    enhancedErr.Timestamp,
			Severity:     enhancedErr.Severity,
			Category:     enhancedErr.Category,
			SampleErrors: make([]*EnhancedError, 0, 5),
			Context:      make(map[string]interface{}),
		}
		s.errorAggregation[pattern] = agg
	}

	agg.Count++
	agg.LastSeen = enhancedErr.Timestamp

	// Keep sample errors (limit to prevent memory growth)
	if len(agg.SampleErrors) < 5 {
		agg.SampleErrors = append(agg.SampleErrors, enhancedErr)
	}
}
