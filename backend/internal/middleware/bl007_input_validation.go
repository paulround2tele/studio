// File: backend/internal/middleware/bl007_input_validation.go
package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// BL007InputValidationMiddleware provides comprehensive input validation with PostgreSQL integration
type BL007InputValidationMiddleware struct {
	db *sqlx.DB
}

// NewBL007InputValidationMiddleware creates a new input validation middleware
func NewBL007InputValidationMiddleware(db *sqlx.DB) *BL007InputValidationMiddleware {
	return &BL007InputValidationMiddleware{
		db: db,
	}
}

// ValidationRule represents a validation rule from the database
type ValidationRule struct {
	ID               uuid.UUID       `db:"id"`
	EndpointPattern  string          `db:"endpoint_pattern"`
	HTTPMethod       string          `db:"http_method"`
	FieldName        string          `db:"field_name"`
	ValidationType   string          `db:"validation_type"`
	ValidationConfig json.RawMessage `db:"validation_config"`
	ErrorMessage     string          `db:"error_message"`
	IsRequired       bool            `db:"is_required"`
}

// SuspiciousPattern represents a suspicious input pattern
type SuspiciousPattern struct {
	ID          uuid.UUID `db:"id"`
	PatternName string    `db:"pattern_name"`
	Pattern     string    `db:"pattern"`
	Category    string    `db:"category"`
	Severity    string    `db:"severity"`
	IsEnabled   bool      `db:"is_enabled"`
}

// ValidationViolation represents a validation violation to be logged
type ValidationViolation struct {
	UserID          *uuid.UUID `db:"user_id"`
	SessionID       *string    `db:"session_id"`
	EndpointPattern string     `db:"endpoint_pattern"`
	HTTPMethod      string     `db:"http_method"`
	FieldName       string     `db:"field_name"`
	ViolationType   string     `db:"violation_type"`
	ProvidedValue   *string    `db:"provided_value"`
	ExpectedFormat  *string    `db:"expected_format"`
	ValidationRule  *string    `db:"validation_rule"`
	ErrorMessage    string     `db:"error_message"`
	SourceIP        *string    `db:"source_ip"`
	UserAgent       *string    `db:"user_agent"`
	RequestID       *string    `db:"request_id"`
}

// SuspiciousInputAlert represents a suspicious input alert to be logged
type SuspiciousInputAlert struct {
	UserID          *uuid.UUID `db:"user_id"`
	SessionID       *string    `db:"session_id"`
	EndpointPattern string     `db:"endpoint_pattern"`
	HTTPMethod      string     `db:"http_method"`
	FieldName       string     `db:"field_name"`
	PatternName     string     `db:"pattern_name"`
	ProvidedValue   string     `db:"provided_value"`
	PatternMatched  string     `db:"pattern_matched"`
	Category        string     `db:"category"`
	Severity        string     `db:"severity"`
	SourceIP        *string    `db:"source_ip"`
	UserAgent       *string    `db:"user_agent"`
	RequestID       *string    `db:"request_id"`
}

// ValidateRequest provides comprehensive input validation middleware
func (m *BL007InputValidationMiddleware) ValidateRequest() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Skip validation for GET and DELETE requests (read-only operations)
		if c.Request.Method == "GET" || c.Request.Method == "DELETE" {
			c.Next()
			return
		}

		// Only validate JSON requests
		contentType := c.GetHeader("Content-Type")
		if !strings.Contains(contentType, "application/json") {
			c.Next()
			return
		}

		// Read and preserve request body
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			m.handleValidationError(c, "request_body_read_error", "", "Failed to read request body", err.Error())
			return
		}

		// Restore the request body for downstream handlers
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		// Skip validation for empty requests
		if len(bodyBytes) == 0 {
			c.Next()
			return
		}

		// Parse JSON payload
		var requestData map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &requestData); err != nil {
			m.handleValidationError(c, "invalid_json", "", "Invalid JSON format", err.Error())
			return
		}

		// Get validation rules for this endpoint
		endpointPattern := m.normalizeEndpointPattern(c.FullPath())
		validationRules, err := m.getValidationRules(c.Request.Context(), endpointPattern, c.Request.Method)
		if err != nil {
			// Log error but continue - don't block requests due to validation rule retrieval errors
			fmt.Printf("Warning: Failed to retrieve validation rules for %s %s: %v\n", c.Request.Method, endpointPattern, err)
			c.Next()
			return
		}

		// Perform suspicious pattern detection on all string values
		suspiciousPatterns, err := m.getSuspiciousPatterns(c.Request.Context())
		if err != nil {
			fmt.Printf("Warning: Failed to retrieve suspicious patterns: %v\n", err)
		} else {
			m.detectSuspiciousPatterns(c, requestData, suspiciousPatterns, endpointPattern)
		}

		// Validate each field according to rules
		violations := []string{}
		for _, rule := range validationRules {
			if violation := m.validateField(c, requestData, rule, endpointPattern); violation != "" {
				violations = append(violations, violation)
			}
		}

		// If there are validation violations, return error response
		if len(violations) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      "Validation failed",
				"code":       "BL007_VALIDATION_FAILED",
				"violations": violations,
				"request_id": m.getRequestID(c),
			})
			c.Abort()
			return
		}

		c.Next()
	})
}

// getValidationRules retrieves validation rules from PostgreSQL
func (m *BL007InputValidationMiddleware) getValidationRules(ctx context.Context, endpointPattern, httpMethod string) ([]ValidationRule, error) {
	query := `
		SELECT id, endpoint_pattern, http_method, field_name, validation_type, 
		       validation_config, error_message, is_required
		FROM input_validation_rules 
		WHERE endpoint_pattern = $1 AND http_method = $2
	`

	var rules []ValidationRule
	err := m.db.SelectContext(ctx, &rules, query, endpointPattern, httpMethod)
	return rules, err
}

// getSuspiciousPatterns retrieves enabled suspicious patterns from PostgreSQL
func (m *BL007InputValidationMiddleware) getSuspiciousPatterns(ctx context.Context) ([]SuspiciousPattern, error) {
	query := `
		SELECT id, pattern_name, pattern, category, severity, is_enabled
		FROM suspicious_input_patterns 
		WHERE is_enabled = true
	`

	var patterns []SuspiciousPattern
	err := m.db.SelectContext(ctx, &patterns, query)
	return patterns, err
}

// validateField validates a single field according to its rule
func (m *BL007InputValidationMiddleware) validateField(c *gin.Context, requestData map[string]interface{}, rule ValidationRule, endpointPattern string) string {
	fieldValue, exists := requestData[rule.FieldName]

	// Check required fields
	if rule.IsRequired && (!exists || fieldValue == nil || fieldValue == "") {
		m.logValidationViolation(c, rule, endpointPattern, "required_field_missing", nil, "Field is required")
		return fmt.Sprintf("Field '%s' is required", rule.FieldName)
	}

	// Skip validation for non-existent optional fields
	if !exists || fieldValue == nil {
		return ""
	}

	// Validate based on rule type
	switch rule.ValidationType {
	case "string_length":
		return m.validateStringLength(c, fieldValue, rule, endpointPattern)
	case "integer_range":
		return m.validateIntegerRange(c, fieldValue, rule, endpointPattern)
	case "enum":
		return m.validateEnum(c, fieldValue, rule, endpointPattern)
	case "boolean":
		return m.validateBoolean(c, fieldValue, rule, endpointPattern)
	case "array_validation":
		return m.validateArray(c, fieldValue, rule, endpointPattern)
	case "json_schema":
		return m.validateJSONSchema(c, fieldValue, rule, endpointPattern)
	default:
		return ""
	}
}

// validateStringLength validates string length constraints
func (m *BL007InputValidationMiddleware) validateStringLength(c *gin.Context, fieldValue interface{}, rule ValidationRule, endpointPattern string) string {
	str, ok := fieldValue.(string)
	if !ok {
		m.logValidationViolation(c, rule, endpointPattern, "type_mismatch", &str, "Expected string")
		return fmt.Sprintf("Field '%s' must be a string", rule.FieldName)
	}

	var config struct {
		MinLength int `json:"min_length"`
		MaxLength int `json:"max_length"`
	}

	if err := json.Unmarshal(rule.ValidationConfig, &config); err != nil {
		return ""
	}

	if len(str) < config.MinLength || len(str) > config.MaxLength {
		violation := fmt.Sprintf("length out of range: %d (min: %d, max: %d)", len(str), config.MinLength, config.MaxLength)
		m.logValidationViolation(c, rule, endpointPattern, "string_length_violation", &str, violation)
		return rule.ErrorMessage
	}

	return ""
}

// validateIntegerRange validates integer range constraints
func (m *BL007InputValidationMiddleware) validateIntegerRange(c *gin.Context, fieldValue interface{}, rule ValidationRule, endpointPattern string) string {
	var value int64
	var ok bool

	// Handle different numeric types
	switch v := fieldValue.(type) {
	case int:
		value = int64(v)
		ok = true
	case int64:
		value = v
		ok = true
	case float64:
		value = int64(v)
		ok = true
	case string:
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			value = parsed
			ok = true
		}
	}

	if !ok {
		str := fmt.Sprintf("%v", fieldValue)
		m.logValidationViolation(c, rule, endpointPattern, "type_mismatch", &str, "Expected integer")
		return fmt.Sprintf("Field '%s' must be an integer", rule.FieldName)
	}

	var config struct {
		Min int64 `json:"min"`
		Max int64 `json:"max"`
	}

	if err := json.Unmarshal(rule.ValidationConfig, &config); err != nil {
		return ""
	}

	if value < config.Min || value > config.Max {
		str := fmt.Sprintf("%d", value)
		violation := fmt.Sprintf("value out of range: %d (min: %d, max: %d)", value, config.Min, config.Max)
		m.logValidationViolation(c, rule, endpointPattern, "integer_range_violation", &str, violation)
		return rule.ErrorMessage
	}

	return ""
}

// validateEnum validates enum constraints
func (m *BL007InputValidationMiddleware) validateEnum(c *gin.Context, fieldValue interface{}, rule ValidationRule, endpointPattern string) string {
	str, ok := fieldValue.(string)
	if !ok {
		valueStr := fmt.Sprintf("%v", fieldValue)
		m.logValidationViolation(c, rule, endpointPattern, "type_mismatch", &valueStr, "Expected string")
		return fmt.Sprintf("Field '%s' must be a string", rule.FieldName)
	}

	var config struct {
		AllowedValues []string `json:"allowed_values"`
	}

	if err := json.Unmarshal(rule.ValidationConfig, &config); err != nil {
		return ""
	}

	for _, allowed := range config.AllowedValues {
		if str == allowed {
			return ""
		}
	}

	violation := fmt.Sprintf("invalid enum value: %s (allowed: %v)", str, config.AllowedValues)
	m.logValidationViolation(c, rule, endpointPattern, "enum_violation", &str, violation)
	return rule.ErrorMessage
}

// validateBoolean validates boolean values
func (m *BL007InputValidationMiddleware) validateBoolean(c *gin.Context, fieldValue interface{}, rule ValidationRule, endpointPattern string) string {
	_, ok := fieldValue.(bool)
	if !ok {
		str := fmt.Sprintf("%v", fieldValue)
		m.logValidationViolation(c, rule, endpointPattern, "type_mismatch", &str, "Expected boolean")
		return fmt.Sprintf("Field '%s' must be a boolean", rule.FieldName)
	}
	return ""
}

// validateArray validates array constraints
func (m *BL007InputValidationMiddleware) validateArray(c *gin.Context, fieldValue interface{}, rule ValidationRule, endpointPattern string) string {
	array, ok := fieldValue.([]interface{})
	if !ok {
		str := fmt.Sprintf("%v", fieldValue)
		m.logValidationViolation(c, rule, endpointPattern, "type_mismatch", &str, "Expected array")
		return fmt.Sprintf("Field '%s' must be an array", rule.FieldName)
	}

	var config struct {
		MinItems int    `json:"min_items"`
		MaxItems int    `json:"max_items"`
		ItemType string `json:"item_type"`
	}

	if err := json.Unmarshal(rule.ValidationConfig, &config); err != nil {
		return ""
	}

	if len(array) < config.MinItems || len(array) > config.MaxItems {
		str := fmt.Sprintf("%v", fieldValue)
		violation := fmt.Sprintf("array length out of range: %d (min: %d, max: %d)", len(array), config.MinItems, config.MaxItems)
		m.logValidationViolation(c, rule, endpointPattern, "array_length_violation", &str, violation)
		return rule.ErrorMessage
	}

	return ""
}

// validateJSONSchema validates JSON schema constraints (basic implementation)
func (m *BL007InputValidationMiddleware) validateJSONSchema(c *gin.Context, fieldValue interface{}, rule ValidationRule, endpointPattern string) string {
	// Basic JSON schema validation - could be extended with a proper JSON schema validator
	if fieldValue == nil {
		str := "null"
		m.logValidationViolation(c, rule, endpointPattern, "json_schema_violation", &str, "Invalid JSON structure")
		return rule.ErrorMessage
	}
	return ""
}

// detectSuspiciousPatterns checks for suspicious input patterns
func (m *BL007InputValidationMiddleware) detectSuspiciousPatterns(c *gin.Context, requestData map[string]interface{}, patterns []SuspiciousPattern, endpointPattern string) {
	for fieldName, fieldValue := range requestData {
		if str, ok := fieldValue.(string); ok {
			for _, pattern := range patterns {
				if matched, _ := regexp.MatchString(pattern.Pattern, str); matched {
					m.logSuspiciousInput(c, fieldName, str, pattern, endpointPattern)
				}
			}
		}
	}
}

// logValidationViolation logs a validation violation to the database
func (m *BL007InputValidationMiddleware) logValidationViolation(c *gin.Context, rule ValidationRule, endpointPattern, violationType string, providedValue *string, expectedFormat string) {
	violation := ValidationViolation{
		UserID:          m.getUserID(c),
		SessionID:       m.getSessionID(c),
		EndpointPattern: endpointPattern,
		HTTPMethod:      c.Request.Method,
		FieldName:       rule.FieldName,
		ViolationType:   violationType,
		ProvidedValue:   providedValue,
		ExpectedFormat:  &expectedFormat,
		ErrorMessage:    rule.ErrorMessage,
		SourceIP:        m.getSourceIP(c),
		UserAgent:       m.getUserAgent(c),
		RequestID:       m.getRequestID(c),
	}

	// Log to database asynchronously
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		query := `
			INSERT INTO input_validation_violations 
			(user_id, session_id, endpoint_pattern, http_method, field_name, 
			 violation_type, provided_value, expected_format, error_message, 
			 source_ip, user_agent, request_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`

		_, err := m.db.ExecContext(ctx, query,
			violation.UserID, violation.SessionID, violation.EndpointPattern,
			violation.HTTPMethod, violation.FieldName, violation.ViolationType,
			violation.ProvidedValue, violation.ExpectedFormat, violation.ErrorMessage,
			violation.SourceIP, violation.UserAgent, violation.RequestID)

		if err != nil {
			fmt.Printf("Failed to log validation violation: %v\n", err)
		}
	}()
}

// logSuspiciousInput logs suspicious input patterns to the database
func (m *BL007InputValidationMiddleware) logSuspiciousInput(c *gin.Context, fieldName, providedValue string, pattern SuspiciousPattern, endpointPattern string) {
	alert := SuspiciousInputAlert{
		UserID:          m.getUserID(c),
		SessionID:       m.getSessionID(c),
		EndpointPattern: endpointPattern,
		HTTPMethod:      c.Request.Method,
		FieldName:       fieldName,
		PatternName:     pattern.PatternName,
		ProvidedValue:   providedValue,
		PatternMatched:  pattern.Pattern,
		Category:        pattern.Category,
		Severity:        pattern.Severity,
		SourceIP:        m.getSourceIP(c),
		UserAgent:       m.getUserAgent(c),
		RequestID:       m.getRequestID(c),
	}

	// Log to database asynchronously
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		query := `
			INSERT INTO suspicious_input_alerts 
			(user_id, session_id, endpoint_pattern, http_method, field_name, 
			 pattern_name, provided_value, pattern_matched, category, severity, 
			 source_ip, user_agent, request_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		`

		_, err := m.db.ExecContext(ctx, query,
			alert.UserID, alert.SessionID, alert.EndpointPattern,
			alert.HTTPMethod, alert.FieldName, alert.PatternName,
			alert.ProvidedValue, alert.PatternMatched, alert.Category,
			alert.Severity, alert.SourceIP, alert.UserAgent, alert.RequestID)

		if err != nil {
			fmt.Printf("Failed to log suspicious input alert: %v\n", err)
		}
	}()
}

// Helper functions for extracting context information

func (m *BL007InputValidationMiddleware) getUserID(c *gin.Context) *uuid.UUID {
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(uuid.UUID); ok {
			return &id
		}
		if idStr, ok := userID.(string); ok {
			if parsed, err := uuid.Parse(idStr); err == nil {
				return &parsed
			}
		}
	}
	return nil
}

func (m *BL007InputValidationMiddleware) getSessionID(c *gin.Context) *string {
	if sessionID, exists := c.Get("session_id"); exists {
		if id, ok := sessionID.(string); ok {
			return &id
		}
	}
	return nil
}

func (m *BL007InputValidationMiddleware) getSourceIP(c *gin.Context) *string {
	ip := c.ClientIP()
	if ip != "" {
		return &ip
	}
	return nil
}

func (m *BL007InputValidationMiddleware) getUserAgent(c *gin.Context) *string {
	ua := c.GetHeader("User-Agent")
	if ua != "" {
		return &ua
	}
	return nil
}

func (m *BL007InputValidationMiddleware) getRequestID(c *gin.Context) *string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return &id
		}
	}
	// Generate a request ID if none exists
	requestID := uuid.New().String()
	c.Set("request_id", requestID)
	return &requestID
}

func (m *BL007InputValidationMiddleware) normalizeEndpointPattern(fullPath string) string {
	// Convert Gin path patterns to our database format
	// e.g., "/campaigns/:campaignId" -> "/api/campaigns/:id"
	
	// Basic pattern normalization - could be enhanced
	if strings.Contains(fullPath, ":campaignId") {
		fullPath = strings.ReplaceAll(fullPath, ":campaignId", ":id")
	}
	if strings.Contains(fullPath, ":personaId") {
		fullPath = strings.ReplaceAll(fullPath, ":personaId", ":id")
	}
	
	// Ensure API prefix
	if !strings.HasPrefix(fullPath, "/api") {
		fullPath = "/api" + fullPath
	}
	
	return fullPath
}

func (m *BL007InputValidationMiddleware) handleValidationError(c *gin.Context, errorType, fieldName, message, details string) {
	c.JSON(http.StatusBadRequest, gin.H{
		"error":      message,
		"code":       "BL007_" + strings.ToUpper(errorType),
		"field":      fieldName,
		"details":    details,
		"request_id": m.getRequestID(c),
	})
	c.Abort()
}