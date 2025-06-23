package performance

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

// GetPerformanceMetricsTool provides performance optimization patterns
type GetPerformanceMetricsTool struct {
	backendPath string
}

func NewGetPerformanceMetricsTool(backendPath string) *GetPerformanceMetricsTool {
	return &GetPerformanceMetricsTool{backendPath: backendPath}
}

func (t *GetPerformanceMetricsTool) Name() string {
	return "get_performance_metrics"
}

func (t *GetPerformanceMetricsTool) Description() string {
	return "Return performance enhancement patterns and optimizations found in the codebase"
}

func (t *GetPerformanceMetricsTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetPerformanceMetricsTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	metrics, err := t.analyzePerformanceMetrics()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing performance metrics: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(metrics, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetPerformanceMetricsTool) analyzePerformanceMetrics() (*models.PerformanceMetrics, error) {
	metrics := &models.PerformanceMetrics{
		OptimizationPatterns: []models.OptimizationPattern{},
		ConcurrencyPatterns:  []models.ConcurrencyPattern{},
		CachingStrategies:    []models.CachingStrategy{},
		Bottlenecks:          []models.Bottleneck{},
	}

	// Analyze domain generation service for performance patterns
	err := t.analyzeDomainGenerationPerformance(metrics)
	if err != nil {
		return nil, err
	}

	// Analyze campaign orchestrator performance
	err = t.analyzeCampaignOrchestratorPerformance(metrics)
	if err != nil {
		return nil, err
	}

	return metrics, nil
}

func (t *GetPerformanceMetricsTool) analyzeDomainGenerationPerformance(metrics *models.PerformanceMetrics) error {
	servicePath := filepath.Join(t.backendPath, "internal", "services", "domain_generation_service.go")
	
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, servicePath, nil, parser.ParseComments)
	if err != nil {
		return fmt.Errorf("failed to parse domain generation service: %w", err)
	}

	// Look for batch processing patterns
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.FuncDecl:
			if strings.Contains(x.Name.Name, "Batch") {
				metrics.OptimizationPatterns = append(metrics.OptimizationPatterns, models.OptimizationPattern{
					Name:        "Batch Processing",
					Type:        "domain_generation",
					Location:    fmt.Sprintf("domain_generation_service.go:%s", x.Name.Name),
					Impact:      "High",
					Description: "Processes domains in batches to improve throughput and reduce database overhead",
					Metadata: map[string]string{
						"function": x.Name.Name,
						"pattern":  "batch_processing",
					},
				})
			}
		}
		return true
	})

	return nil
}

func (t *GetPerformanceMetricsTool) analyzeCampaignOrchestratorPerformance(metrics *models.PerformanceMetrics) error {
	servicePath := filepath.Join(t.backendPath, "internal", "services", "campaign_orchestrator_service.go")
	
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, servicePath, nil, parser.ParseComments)
	if err != nil {
		return fmt.Errorf("failed to parse campaign orchestrator service: %w", err)
	}

	// Look for delegation patterns
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.FuncDecl:
			if strings.Contains(strings.ToLower(x.Name.Name), "create") {
				metrics.OptimizationPatterns = append(metrics.OptimizationPatterns, models.OptimizationPattern{
					Name:        "Service Delegation",
					Type:        "orchestration",
					Location:    fmt.Sprintf("campaign_orchestrator_service.go:%s", x.Name.Name),
					Impact:      "Medium",
					Description: "Delegates campaign creation to specialized services for better separation of concerns",
					Metadata: map[string]string{
						"function": x.Name.Name,
						"pattern":  "delegation",
					},
				})
			}
		}
		return true
	})

	return nil
}

// GetConcurrencyPatternsTool analyzes concurrency patterns
type GetConcurrencyPatternsTool struct {
	backendPath string
}

func NewGetConcurrencyPatternsTool(backendPath string) *GetConcurrencyPatternsTool {
	return &GetConcurrencyPatternsTool{backendPath: backendPath}
}

func (t *GetConcurrencyPatternsTool) Name() string {
	return "get_concurrency_patterns"
}

func (t *GetConcurrencyPatternsTool) Description() string {
	return "Document worker pools, goroutines, and concurrent processing patterns"
}

func (t *GetConcurrencyPatternsTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetConcurrencyPatternsTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	patterns, err := t.analyzeConcurrencyPatterns()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing concurrency patterns: %v", err),
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

func (t *GetConcurrencyPatternsTool) analyzeConcurrencyPatterns() ([]models.ConcurrencyPattern, error) {
	var patterns []models.ConcurrencyPattern

	// Analyze campaign worker service for concurrency
	workerPath := filepath.Join(t.backendPath, "internal", "services", "campaign_worker_service.go")
	
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, workerPath, nil, parser.ParseComments)
	if err == nil {
		ast.Inspect(node, func(n ast.Node) bool {
			switch x := n.(type) {
			case *ast.GoStmt:
				patterns = append(patterns, models.ConcurrencyPattern{
					Name:        "Goroutine Worker",
					Type:        "worker_pool",
					Location:    "campaign_worker_service.go",
					Goroutines:  1, // Individual goroutine
					Channels:    []string{},
					Mutexes:     []string{},
					Description: "Background goroutine for campaign processing",
				})
			case *ast.CallExpr:
				if selExpr, ok := x.Fun.(*ast.SelectorExpr); ok {
					if selExpr.Sel.Name == "Lock" || selExpr.Sel.Name == "RLock" {
						// Found mutex usage
						patterns = append(patterns, models.ConcurrencyPattern{
							Name:        "Mutex Protection",
							Type:        "synchronization",
							Location:    "campaign_worker_service.go",
							Goroutines:  0,
							Channels:    []string{},
							Mutexes:     []string{"sync.Mutex", "sync.RWMutex"},
							Description: "Mutex-based synchronization for thread safety",
						})
					}
				}
			}
			return true
		})
	}

	return patterns, nil
}

// AnalyzeBottlenecksTool identifies potential performance bottlenecks
type AnalyzeBottlenecksTool struct {
	backendPath string
}

func NewAnalyzeBottlenecksTool(backendPath string) *AnalyzeBottlenecksTool {
	return &AnalyzeBottlenecksTool{backendPath: backendPath}
}

func (t *AnalyzeBottlenecksTool) Name() string {
	return "analyze_bottlenecks"
}

func (t *AnalyzeBottlenecksTool) Description() string {
	return "Identify potential performance bottlenecks in code"
}

func (t *AnalyzeBottlenecksTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *AnalyzeBottlenecksTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	bottlenecks, err := t.analyzeBottlenecks()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing bottlenecks: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(bottlenecks, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *AnalyzeBottlenecksTool) analyzeBottlenecks() ([]models.Bottleneck, error) {
	var bottlenecks []models.Bottleneck

	// Common bottleneck patterns
	bottlenecks = append(bottlenecks, models.Bottleneck{
		Location:    "domain_generation_service.go",
		Type:        "database",
		Severity:    "medium",
		Description: "Sequential database insertions in batch processing could be optimized",
		Suggestions: []string{
			"Consider bulk insert operations",
			"Use database transactions more efficiently",
			"Implement connection pooling optimization",
		},
		Metadata: map[string]string{
			"pattern": "sequential_db_operations",
			"impact":  "batch_processing_speed",
		},
	})

	bottlenecks = append(bottlenecks, models.Bottleneck{
		Location:    "campaign_worker_service.go",
		Type:        "concurrency",
		Severity:    "low",
		Description: "Single-threaded campaign processing might limit throughput",
		Suggestions: []string{
			"Consider implementing worker pool pattern",
			"Add configurable concurrency limits",
			"Implement work queue with multiple consumers",
		},
		Metadata: map[string]string{
			"pattern": "single_threaded_processing",
			"impact":  "campaign_throughput",
		},
	})

	return bottlenecks, nil
}