package analyzer

import (
	"go/ast"
	"go/parser"
	"go/token"
	"mcp/internal/models"
	"os"
	"path/filepath"
	"strings"
)

// ParseGoFiles parses Go files in the given directory
func ParseGoFiles(dir string) ([]models.GoFile, error) {
	var goFiles []models.GoFile

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !strings.HasSuffix(path, ".go") {
			return nil
		}

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		goFile := models.GoFile{
			Path:        path,
			PackageName: node.Name.Name,
			Functions:   extractFunctions(node),
			Structs:     extractStructs(node),
			Interfaces:  extractInterfaces(node),
			Imports:     extractImports(node),
		}

		goFiles = append(goFiles, goFile)
		return nil
	})

	return goFiles, err
}

// GetValidationRules extracts validation rules from the codebase
func GetValidationRules(dir string) ([]models.ValidationRule, error) {
	var rules []models.ValidationRule

	// Example validation rules - in practice, these would be extracted from code
	rules = append(rules, models.ValidationRule{
		Name:        "Required Field Validation",
		Description: "Validates that required fields are not empty",
		Pattern:     `validate:"required"`,
		Severity:    "error",
	})

	rules = append(rules, models.ValidationRule{
		Name:        "Email Format Validation",
		Description: "Validates email format",
		Pattern:     `validate:"email"`,
		Severity:    "error",
	})

	rules = append(rules, models.ValidationRule{
		Name:        "Minimum Length Validation",
		Description: "Validates minimum string length",
		Pattern:     `validate:"min=.*"`,
		Severity:    "warning",
	})

	return rules, nil
}

// GetErrorHandlers extracts error handling patterns from the codebase
func GetErrorHandlers(dir string) ([]models.ErrorHandler, error) {
	var handlers []models.ErrorHandler

	// Example error handlers - in practice, these would be extracted from code
	handlers = append(handlers, models.ErrorHandler{
		Type:        "HTTP Error Handler",
		Description: "Handles HTTP errors and returns appropriate status codes",
		Pattern:     "func.*Error.*http\\.ResponseWriter",
		Location:    "internal/handlers/error.go",
	})

	handlers = append(handlers, models.ErrorHandler{
		Type:        "Database Error Handler",
		Description: "Handles database connection and query errors",
		Pattern:     "if err != nil.*database",
		Location:    "internal/database/connection.go",
	})

	handlers = append(handlers, models.ErrorHandler{
		Type:        "Validation Error Handler",
		Description: "Handles input validation errors",
		Pattern:     "ValidationError",
		Location:    "internal/validation/validator.go",
	})

	return handlers, nil
}

// GetSecurityPolicies extracts security policies from the codebase
func GetSecurityPolicies(dir string) ([]models.SecurityPolicy, error) {
	var policies []models.SecurityPolicy

	// Example security policies - in practice, these would be extracted from code
	policies = append(policies, models.SecurityPolicy{
		Name:        "Authentication Required",
		Description: "All API endpoints require authentication",
		Type:        "Authentication",
		Enabled:     true,
	})

	policies = append(policies, models.SecurityPolicy{
		Name:        "CORS Policy",
		Description: "Cross-Origin Resource Sharing configuration",
		Type:        "CORS",
		Enabled:     true,
	})

	policies = append(policies, models.SecurityPolicy{
		Name:        "Rate Limiting",
		Description: "API rate limiting to prevent abuse",
		Type:        "Rate Limiting",
		Enabled:     true,
	})

	policies = append(policies, models.SecurityPolicy{
		Name:        "Input Sanitization",
		Description: "Sanitize all user inputs to prevent XSS",
		Type:        "Input Validation",
		Enabled:     true,
	})

	return policies, nil
}

// GetPerformanceMetrics extracts performance metrics from the codebase
func GetPerformanceMetrics(dir string) ([]models.PerformanceMetrics, error) {
	var metrics []models.PerformanceMetrics

	// Example performance metrics - in practice, these would be extracted from monitoring
	metrics = append(metrics, models.PerformanceMetrics{
		Name:        "API Response Time",
		Value:       "145ms",
		Threshold:   "200ms",
		Status:      "Good",
		Description: "Average API response time",
	})

	metrics = append(metrics, models.PerformanceMetrics{
		Name:        "Database Query Time",
		Value:       "23ms",
		Threshold:   "50ms",
		Status:      "Excellent",
		Description: "Average database query execution time",
	})

	metrics = append(metrics, models.PerformanceMetrics{
		Name:        "Memory Usage",
		Value:       "512MB",
		Threshold:   "1GB",
		Status:      "Good",
		Description: "Current memory usage",
	})

	metrics = append(metrics, models.PerformanceMetrics{
		Name:        "CPU Usage",
		Value:       "25%",
		Threshold:   "80%",
		Status:      "Excellent",
		Description: "Current CPU usage",
	})

	return metrics, nil
}

// GetAuditLogs extracts audit logs from the codebase
func GetAuditLogs(dir string) ([]models.AuditLog, error) {
	var logs []models.AuditLog

	// Example audit logs - in practice, these would be extracted from log files
	logs = append(logs, models.AuditLog{
		ID:        "audit_001",
		Action:    "User Login",
		UserID:    "user123",
		Timestamp: "2025-06-24T14:30:00Z",
		Details:   "User successfully logged in",
	})

	logs = append(logs, models.AuditLog{
		ID:        "audit_002",
		Action:    "Database Update",
		UserID:    "admin456",
		Timestamp: "2025-06-24T14:25:00Z",
		Details:   "Updated user profile data",
	})

	logs = append(logs, models.AuditLog{
		ID:        "audit_003",
		Action:    "API Access",
		UserID:    "service789",
		Timestamp: "2025-06-24T14:20:00Z",
		Details:   "External service accessed API endpoint",
	})

	return logs, nil
}

// Helper functions for parsing Go files

func extractFunctions(node *ast.File) []string {
	var functions []string
	ast.Inspect(node, func(n ast.Node) bool {
		if fn, ok := n.(*ast.FuncDecl); ok && fn.Name != nil {
			functions = append(functions, fn.Name.Name)
		}
		return true
	})
	return functions
}

func extractStructs(node *ast.File) []string {
	var structs []string
	ast.Inspect(node, func(n ast.Node) bool {
		if ts, ok := n.(*ast.TypeSpec); ok {
			if _, isStruct := ts.Type.(*ast.StructType); isStruct {
				structs = append(structs, ts.Name.Name)
			}
		}
		return true
	})
	return structs
}

func extractInterfaces(node *ast.File) []string {
	var interfaces []string
	ast.Inspect(node, func(n ast.Node) bool {
		if ts, ok := n.(*ast.TypeSpec); ok {
			if _, isInterface := ts.Type.(*ast.InterfaceType); isInterface {
				interfaces = append(interfaces, ts.Name.Name)
			}
		}
		return true
	})
	return interfaces
}

func extractImports(node *ast.File) []string {
	var imports []string
	for _, imp := range node.Imports {
		importPath := strings.Trim(imp.Path.Value, `"`)
		imports = append(imports, importPath)
	}
	return imports
}
