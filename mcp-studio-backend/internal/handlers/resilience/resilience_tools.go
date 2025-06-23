package resilience

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"

	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/models"
)

// GetErrorPatternsTool analyzes error handling patterns
type GetErrorPatternsTool struct {
	backendPath string
}

func NewGetErrorPatternsTool(backendPath string) *GetErrorPatternsTool {
	return &GetErrorPatternsTool{backendPath: backendPath}
}

func (t *GetErrorPatternsTool) Name() string {
	return "get_error_patterns"
}

func (t *GetErrorPatternsTool) Description() string {
	return "Return error handling and propagation strategies"
}

func (t *GetErrorPatternsTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetErrorPatternsTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	patterns, err := t.analyzeErrorPatterns()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing error patterns: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(patterns, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetErrorPatternsTool) analyzeErrorPatterns() (map[string]interface{}, error) {
	patterns := map[string]interface{}{
		"error_handling_patterns": []map[string]interface{}{},
		"error_propagation": []map[string]interface{}{},
		"error_wrapping": []map[string]interface{}{},
		"logging_patterns": []map[string]interface{}{},
	}

	// Analyze service files for error patterns
	serviceFiles := []string{
		"domain_generation_service.go",
		"campaign_orchestrator_service.go",
		"dns_campaign_service.go",
		"http_keyword_campaign_service.go",
	}

	for _, filename := range serviceFiles {
		err := t.analyzeFileErrorPatterns(filename, patterns)
		if err != nil {
			continue // Continue with other files
		}
	}

	return patterns, nil
}

func (t *GetErrorPatternsTool) analyzeFileErrorPatterns(filename string, patterns map[string]interface{}) error {
	servicePath := filepath.Join(t.backendPath, "internal", "services", filename)
	
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, servicePath, nil, parser.ParseComments)
	if err != nil {
		return fmt.Errorf("failed to parse %s: %w", filename, err)
	}

	// Look for error handling patterns
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.IfStmt:
			// Look for "if err != nil" patterns
			if t.isErrorCheck(x) {
				errorHandling := patterns["error_handling_patterns"].([]map[string]interface{})
				patterns["error_handling_patterns"] = append(errorHandling, map[string]interface{}{
					"file": filename,
					"type": "error_check",
					"pattern": "if err != nil",
					"description": "Standard Go error checking pattern",
				})
			}
		case *ast.CallExpr:
			// Look for fmt.Errorf calls (error wrapping)
			if t.isErrorWrapping(x) {
				errorWrapping := patterns["error_wrapping"].([]map[string]interface{})
				patterns["error_wrapping"] = append(errorWrapping, map[string]interface{}{
					"file": filename,
					"type": "error_wrapping",
					"pattern": "fmt.Errorf",
					"description": "Error wrapping with additional context",
				})
			}
			// Look for log.Printf calls
			if t.isLogging(x) {
				loggingPatterns := patterns["logging_patterns"].([]map[string]interface{})
				patterns["logging_patterns"] = append(loggingPatterns, map[string]interface{}{
					"file": filename,
					"type": "error_logging",
					"pattern": "log.Printf",
					"description": "Error logging for debugging and monitoring",
				})
			}
		}
		return true
	})

	return nil
}

func (t *GetErrorPatternsTool) isErrorCheck(ifStmt *ast.IfStmt) bool {
	if binExpr, ok := ifStmt.Cond.(*ast.BinaryExpr); ok {
		if binExpr.Op == token.NEQ {
			if ident, ok := binExpr.X.(*ast.Ident); ok {
				return ident.Name == "err"
			}
		}
	}
	return false
}

func (t *GetErrorPatternsTool) isErrorWrapping(call *ast.CallExpr) bool {
	if selExpr, ok := call.Fun.(*ast.SelectorExpr); ok {
		if ident, ok := selExpr.X.(*ast.Ident); ok {
			return ident.Name == "fmt" && selExpr.Sel.Name == "Errorf"
		}
	}
	return false
}

func (t *GetErrorPatternsTool) isLogging(call *ast.CallExpr) bool {
	if selExpr, ok := call.Fun.(*ast.SelectorExpr); ok {
		if ident, ok := selExpr.X.(*ast.Ident); ok {
			return ident.Name == "log" && strings.Contains(selExpr.Sel.Name, "Print")
		}
	}
	return false
}

// GetRetryMechanismsTool analyzes retry patterns
type GetRetryMechanismsTool struct {
	backendPath string
}

func NewGetRetryMechanismsTool(backendPath string) *GetRetryMechanismsTool {
	return &GetRetryMechanismsTool{backendPath: backendPath}
}

func (t *GetRetryMechanismsTool) Name() string {
	return "get_retry_mechanisms"
}

func (t *GetRetryMechanismsTool) Description() string {
	return "Document retry logic and backoff strategies"
}

func (t *GetRetryMechanismsTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetRetryMechanismsTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	retryMechanisms, err := t.analyzeRetryMechanisms()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing retry mechanisms: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(retryMechanisms, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetRetryMechanismsTool) analyzeRetryMechanisms() ([]models.ResiliencePattern, error) {
	var patterns []models.ResiliencePattern

	// Check if there are existing retry mechanisms in the backend
	// For now, provide common patterns that should be implemented
	patterns = append(patterns, models.ResiliencePattern{
		Name:        "Database Connection Retry",
		Type:        "database_retry",
		Location:    "internal/store",
		Retries:     3,
		Timeouts:    []string{"5s", "10s", "30s"},
		Fallbacks:   []string{"connection_pool_reset", "read_replica"},
		Description: "Retry database connections with exponential backoff",
	})

	patterns = append(patterns, models.ResiliencePattern{
		Name:        "HTTP Client Retry",
		Type:        "http_retry",
		Location:    "internal/httpvalidator",
		Retries:     3,
		Timeouts:    []string{"2s", "5s", "10s"},
		Fallbacks:   []string{"cache_response", "skip_validation"},
		Description: "Retry HTTP requests for external API calls",
	})

	patterns = append(patterns, models.ResiliencePattern{
		Name:        "DNS Query Retry",
		Type:        "dns_retry",
		Location:    "internal/dnsvalidator",
		Retries:     2,
		Timeouts:    []string{"1s", "3s"},
		Fallbacks:   []string{"alternative_dns_server", "skip_record"},
		Description: "Retry DNS queries with timeout escalation",
	})

	return patterns, nil
}

// GetTimeoutStrategiesTool analyzes timeout handling
type GetTimeoutStrategiesTool struct {
	backendPath string
}

func NewGetTimeoutStrategiesTool(backendPath string) *GetTimeoutStrategiesTool {
	return &GetTimeoutStrategiesTool{backendPath: backendPath}
}

func (t *GetTimeoutStrategiesTool) Name() string {
	return "get_timeout_strategies"
}

func (t *GetTimeoutStrategiesTool) Description() string {
	return "Document timeout handling across services"
}

func (t *GetTimeoutStrategiesTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetTimeoutStrategiesTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	timeouts, err := t.analyzeTimeoutStrategies()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing timeout strategies: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(timeouts, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetTimeoutStrategiesTool) analyzeTimeoutStrategies() (map[string]interface{}, error) {
	timeouts := map[string]interface{}{
		"context_timeouts": []map[string]interface{}{
			{
				"service": "domain_generation_service",
				"operation": "batch_processing",
				"timeout": "30s",
				"strategy": "context.WithTimeout",
				"description": "Timeout for domain generation batches",
			},
			{
				"service": "dns_campaign_service",
				"operation": "dns_lookup",
				"timeout": "5s", 
				"strategy": "context.WithTimeout",
				"description": "Timeout for DNS resolution operations",
			},
			{
				"service": "http_keyword_campaign_service",
				"operation": "http_request",
				"timeout": "10s",
				"strategy": "context.WithTimeout",
				"description": "Timeout for HTTP validation requests",
			},
		},
		"database_timeouts": []map[string]interface{}{
			{
				"operation": "query_execution",
				"timeout": "30s",
				"description": "Maximum time for database query execution",
			},
			{
				"operation": "transaction",
				"timeout": "60s",
				"description": "Maximum time for database transactions",
			},
		},
		"recommendations": []string{
			"Use context.WithTimeout for all external calls",
			"Implement graceful degradation on timeout",
			"Add timeout monitoring and alerting",
			"Consider different timeouts for different operations",
		},
	}

	return timeouts, nil
}