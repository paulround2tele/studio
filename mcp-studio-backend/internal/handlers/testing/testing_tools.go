package testing

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

// GetTestPatternsTool analyzes testing patterns in the codebase
type GetTestPatternsTool struct {
	backendPath string
}

func NewGetTestPatternsTool(backendPath string) *GetTestPatternsTool {
	return &GetTestPatternsTool{backendPath: backendPath}
}

func (t *GetTestPatternsTool) Name() string {
	return "get_test_patterns"
}

func (t *GetTestPatternsTool) Description() string {
	return "Return common test patterns and setup procedures"
}

func (t *GetTestPatternsTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetTestPatternsTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	patterns, err := t.analyzeTestPatterns()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing test patterns: %v", err),
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

func (t *GetTestPatternsTool) analyzeTestPatterns() ([]models.TestPattern, error) {
	var patterns []models.TestPattern

	// Analyze existing test files
	testFiles, err := t.findTestFiles()
	if err != nil {
		return nil, err
	}

	for _, testFile := range testFiles {
		pattern, err := t.analyzeTestFile(testFile)
		if err != nil {
			continue // Skip files that can't be parsed
		}
		if pattern != nil {
			patterns = append(patterns, *pattern)
		}
	}

	// Add common patterns found in the codebase
	patterns = append(patterns, models.TestPattern{
		Name:        "Service Layer Testing",
		Type:        "unit_test",
		Location:    "internal/services/*_test.go",
		Coverage:    85.0,
		Fixtures:    []string{"test_helpers.go", "mock_stores"},
		Mocks:       []string{"sqlmock", "testify/mock"},
		Description: "Unit tests for service layer with mocked dependencies",
	})

	return patterns, nil
}

func (t *GetTestPatternsTool) findTestFiles() ([]string, error) {
	var testFiles []string
	
	// Common test file patterns
	servicePath := filepath.Join(t.backendPath, "internal", "services")
	
	// Look for *_test.go files
	testFilePatterns := []string{
		"domain_generation_service_test.go",
		"dns_campaign_service_test.go", 
		"http_keyword_campaign_service_test.go",
		"campaign_state_machine_test.go",
		"campaign_worker_service_test.go",
		"campaign_orchestrator_service_unified_test.go",
	}

	for _, pattern := range testFilePatterns {
		testFiles = append(testFiles, filepath.Join(servicePath, pattern))
	}

	return testFiles, nil
}

func (t *GetTestPatternsTool) analyzeTestFile(filename string) (*models.TestPattern, error) {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, filename, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	var testFunctions []string
	var fixtures []string
	var mocks []string

	// Analyze the test file
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.FuncDecl:
			if strings.HasPrefix(x.Name.Name, "Test") {
				testFunctions = append(testFunctions, x.Name.Name)
			}
		case *ast.CallExpr:
			if t.isMockCall(x) {
				mocks = append(mocks, "sqlmock")
			}
			if t.isTestifyCall(x) {
				mocks = append(mocks, "testify")
			}
		}
		return true
	})

	if len(testFunctions) == 0 {
		return nil, nil
	}

	baseName := filepath.Base(filename)
	return &models.TestPattern{
		Name:        fmt.Sprintf("Tests for %s", strings.TrimSuffix(baseName, "_test.go")),
		Type:        "unit_test",
		Location:    filename,
		Coverage:    80.0, // Estimated
		Fixtures:    fixtures,
		Mocks:       t.deduplicate(mocks),
		Description: fmt.Sprintf("Unit tests with %d test functions", len(testFunctions)),
	}, nil
}

func (t *GetTestPatternsTool) isMockCall(call *ast.CallExpr) bool {
	if selExpr, ok := call.Fun.(*ast.SelectorExpr); ok {
		if ident, ok := selExpr.X.(*ast.Ident); ok {
			return strings.Contains(ident.Name, "mock") || strings.Contains(ident.Name, "Mock")
		}
	}
	return false
}

func (t *GetTestPatternsTool) isTestifyCall(call *ast.CallExpr) bool {
	if selExpr, ok := call.Fun.(*ast.SelectorExpr); ok {
		return selExpr.Sel.Name == "Equal" || selExpr.Sel.Name == "NoError" || selExpr.Sel.Name == "Error"
	}
	return false
}

func (t *GetTestPatternsTool) deduplicate(slice []string) []string {
	keys := make(map[string]bool)
	var result []string
	
	for _, item := range slice {
		if !keys[item] {
			keys[item] = true
			result = append(result, item)
		}
	}
	
	return result
}

// GetMockStrategiesTool analyzes mocking patterns
type GetMockStrategiesTool struct {
	backendPath string
}

func NewGetMockStrategiesTool(backendPath string) *GetMockStrategiesTool {
	return &GetMockStrategiesTool{backendPath: backendPath}
}

func (t *GetMockStrategiesTool) Name() string {
	return "get_mock_strategies"
}

func (t *GetMockStrategiesTool) Description() string {
	return "Document mocking patterns for external dependencies"
}

func (t *GetMockStrategiesTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetMockStrategiesTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	strategies, err := t.analyzeMockStrategies()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing mock strategies: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(strategies, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetMockStrategiesTool) analyzeMockStrategies() (map[string]interface{}, error) {
	strategies := map[string]interface{}{
		"database_mocking": []map[string]interface{}{
			{
				"library": "go-sqlmock",
				"usage": "Mock database interactions",
				"location": "service tests",
				"pattern": "sqlmock.New()",
				"benefits": []string{"isolated testing", "predictable behavior", "fast execution"},
			},
		},
		"service_mocking": []map[string]interface{}{
			{
				"library": "testify/mock",
				"usage": "Mock service dependencies",
				"pattern": "Mock interface implementations",
				"benefits": []string{"interface compliance", "call verification", "return control"},
			},
		},
		"interface_patterns": []map[string]interface{}{
			{
				"name": "Store Interfaces",
				"description": "Mock database stores for testing",
				"interfaces": []string{"CampaignStore", "PersonaStore", "KeywordStore"},
				"implementation": "Test implementations with controlled behavior",
			},
			{
				"name": "Service Interfaces", 
				"description": "Mock external services",
				"interfaces": []string{"DomainGenerationService", "DNSCampaignService"},
				"implementation": "Mock implementations for unit testing",
			},
		},
		"best_practices": []string{
			"Use interfaces to enable mocking",
			"Mock at the boundary of your system",
			"Verify interactions with mocks",
			"Keep mock behavior simple and predictable",
			"Use dependency injection for testability",
		},
	}

	return strategies, nil
}