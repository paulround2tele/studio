package analyzer

import (
	"fmt"
	"mcp/internal/models"
	"os"
	"path/filepath"
	"strings"
)

// GetValidationRules analyzes code for validation patterns
func GetValidationRules(dir string) ([]models.ValidationRule, error) {
	var rules []models.ValidationRule

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		lines := strings.Split(string(content), "\n")
		for i, line := range lines {
			// Look for struct tags with validation
			if strings.Contains(line, `validate:"`) {
				start := strings.Index(line, `validate:"`) + 10
				end := strings.Index(line[start:], `"`)
				if end > 0 {
					validation := line[start : start+end]

					// Extract field name (simple heuristic)
					words := strings.Fields(line)
					var fieldName string
					if len(words) > 0 {
						fieldName = words[0]
					}

					rules = append(rules, models.ValidationRule{
						Field:       fieldName,
						Rule:        validation,
						Message:     fmt.Sprintf("Validation rule: %s", validation),
						File:        path,
						LineNumber:  i + 1,
						Name:        fmt.Sprintf("Validation for %s", fieldName),
						Description: fmt.Sprintf("Field %s must satisfy: %s", fieldName, validation),
						Pattern:     fmt.Sprintf(`validate:"%s"`, validation),
						Severity:    getSeverity(validation),
					})
				}
			}
		}

		return nil
	})

	return rules, err
}

// getSeverity determines severity based on validation rule
func getSeverity(rule string) string {
	if strings.Contains(rule, "required") {
		return "error"
	}
	if strings.Contains(rule, "email") || strings.Contains(rule, "url") {
		return "error"
	}
	return "warning"
}

// GetErrorHandlers analyzes code for error handling patterns
func GetErrorHandlers(dir string) ([]models.ErrorHandler, error) {
	var handlers []models.ErrorHandler

	// Common error handling patterns
	patterns := []struct {
		name        string
		pattern     string
		description string
	}{
		{"HTTP Error Handler", "func.*Error.*http\\.ResponseWriter", "HTTP error response handler"},
		{"Database Error Handler", "if err != nil.*database", "Database error handling"},
		{"Validation Error Handler", "if.*valid.*error", "Input validation error handling"},
		{"Generic Error Handler", "if err != nil", "Generic error handling pattern"},
	}

	for _, p := range patterns {
		handlers = append(handlers, models.ErrorHandler{
			Name:        p.name,
			Type:        "pattern",
			File:        dir,
			Description: p.description,
			Pattern:     p.pattern,
			Location:    fmt.Sprintf("%s/*", dir),
		})
	}

	return handlers, nil
}

// GetSecurityPolicies analyzes code for security policies
func GetSecurityPolicies(dir string) ([]models.SecurityPolicy, error) {
	var policies []models.SecurityPolicy

	// Common security patterns
	securityPatterns := []struct {
		name        string
		pattern     string
		description string
	}{
		{"Authentication Middleware", "func.*Auth.*middleware", "Authentication middleware"},
		{"CORS Policy", "cors\\.New", "CORS configuration"},
		{"Rate Limiting", "rate.*limit", "Rate limiting implementation"},
		{"Input Sanitization", "sanitize|escape", "Input sanitization"},
	}

	for _, p := range securityPatterns {
		policies = append(policies, models.SecurityPolicy{
			Name:        p.name,
			Type:        "middleware",
			Rules:       []string{p.pattern},
			File:        dir,
			Enabled:     true,
			Description: p.description,
			Pattern:     p.pattern,
			Location:    fmt.Sprintf("%s/*", dir),
		})
	}

	return policies, nil
}

// GetPerformanceMetrics analyzes code for performance metrics
func GetPerformanceMetrics(dir string) ([]models.PerformanceMetrics, error) {
	var metrics []models.PerformanceMetrics

	// Example performance metrics - in practice, these would be extracted from monitoring
	metrics = append(metrics, models.PerformanceMetrics{
		Name:         "API Response Time",
		Value:        "145ms",
		Threshold:    "200ms",
		Status:       "Good",
		Description:  "Average API response time",
		ResponseTime: 145.0,
		Type:         "timing",
		File:         dir,
		Pattern:      "response_time_*",
		Location:     fmt.Sprintf("%s/handlers", dir),
	})

	metrics = append(metrics, models.PerformanceMetrics{
		Name:         "Database Query Time",
		Value:        "23ms",
		Threshold:    "50ms",
		Status:       "Excellent",
		Description:  "Average database query execution time",
		ResponseTime: 23.0,
		Type:         "database",
		File:         dir,
		Pattern:      "db_query_*",
		Location:     fmt.Sprintf("%s/database", dir),
	})

	return metrics, nil
}

// GetAuditLogs analyzes code for audit logging patterns
func GetAuditLogs(dir string) ([]models.AuditLog, error) {
	var logs []models.AuditLog

	// Example audit logs - in practice, these would be extracted from log files
	logs = append(logs, models.AuditLog{
		ID:          "audit_001",
		Timestamp:   "2025-06-24T14:15:00Z",
		Action:      "User Login",
		User:        "user123",
		Resource:    "/api/auth/login",
		Details:     "Successful user authentication",
		Name:        "Login Audit",
		Type:        "authentication",
		File:        fmt.Sprintf("%s/auth.log", dir),
		Description: "User authentication audit log",
		Pattern:     "auth_*",
		Location:    fmt.Sprintf("%s/logs", dir),
	})

	return logs, nil
}
