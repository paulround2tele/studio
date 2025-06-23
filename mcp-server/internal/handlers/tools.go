package handlers

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/fntelecomllc/studio/mcp-server/internal/analysis"
	"github.com/fntelecomllc/studio/mcp-server/internal/cache"
	"github.com/fntelecomllc/studio/mcp-server/internal/config"
)

// ToolResult represents the result of a tool execution
type ToolResult struct {
	Content []ContentBlock `json:"content"`
	IsError bool           `json:"is_error,omitempty"`
}

// ContentBlock represents a piece of content in the tool result
type ContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
	Data string `json:"data,omitempty"`
}

// MCPHandlers implements all MCP tool handlers
type MCPHandlers struct {
	config   *config.Config
	analyzer *analysis.CodeAnalyzer
	cache    *cache.MemoryCache
}

// NewMCPHandlers creates a new handlers instance
func NewMCPHandlers(cfg *config.Config, analyzer *analysis.CodeAnalyzer, cache *cache.MemoryCache) *MCPHandlers {
	return &MCPHandlers{
		config:   cfg,
		analyzer: analyzer,
		cache:    cache,
	}
}

// Context Awareness Tools

// GetSnapshot exports current context state for caching or preloading
func (h *MCPHandlers) GetSnapshot() (*ToolResult, error) {
	cacheKey := "context_snapshot"
	
	if cached, found := h.cache.Get(cacheKey); found {
		if result, ok := cached.(*ToolResult); ok {
			return result, nil
		}
	}

	// Build comprehensive context snapshot
	models := h.analyzer.GetModels()
	handlers := h.analyzer.GetHandlers()
	dependencies := h.analyzer.GetDependencies()
	callGraph := h.analyzer.GetCallGraph()

	snapshot := map[string]interface{}{
		"timestamp":    fmt.Sprintf("%d", getCurrentTimestamp()),
		"models":       models,
		"handlers":     handlers,
		"dependencies": dependencies,
		"call_graph":   callGraph,
		"config": map[string]interface{}{
			"backend_path": h.config.BackendPath,
			"read_only":    h.config.ReadOnly,
			"cache_enabled": h.config.EnableCache,
		},
	}

	snapshotJSON, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return &ToolResult{
			Content: []ContentBlock{{
				Type: "text",
				Text: fmt.Sprintf("Error creating snapshot: %v", err),
			}},
			IsError: true,
		}, err
	}

	result := &ToolResult{
		Content: []ContentBlock{{
			Type: "text",
			Text: fmt.Sprintf("Context Snapshot Generated\n\nTimestamp: %d\nModels: %d\nHandlers: %d\nDependencies: %d\nCall Graph Nodes: %d\n\nFull Data:\n%s",
				getCurrentTimestamp(),
				len(models),
				len(handlers),
				len(dependencies),
				len(callGraph.Nodes),
				string(snapshotJSON)),
		}},
	}

	// Cache the result
	h.cache.Set(cacheKey, result)
	
	return result, nil
}

// Schema Tools

// GetModels retrieves data models with enhanced filtering and pagination
func (h *MCPHandlers) GetModels(params map[string]interface{}) (*ToolResult, error) {
	filter := getStringParam(params, "filter", "")
	page := getIntParam(params, "page", 1)
	pageSize := getIntParam(params, "page_size", 50)
	
	cacheKey := fmt.Sprintf("models_%s_%d_%d", filter, page, pageSize)
	
	if cached, found := h.cache.Get(cacheKey); found {
		if result, ok := cached.(*ToolResult); ok {
			return result, nil
		}
	}

	models := h.analyzer.GetModels()
	
	// Apply filtering
	if filter != "" {
		filteredModels := make([]analysis.ModelInfo, 0)
		for _, model := range models {
			if strings.Contains(strings.ToLower(model.Name), strings.ToLower(filter)) ||
			   strings.Contains(strings.ToLower(model.Package), strings.ToLower(filter)) {
				filteredModels = append(filteredModels, model)
			}
		}
		models = filteredModels
	}

	// Apply pagination
	start := (page - 1) * pageSize
	end := start + pageSize
	if start >= len(models) {
		models = []analysis.ModelInfo{}
	} else if end > len(models) {
		models = models[start:]
	} else {
		models = models[start:end]
	}

	modelsJSON, err := json.MarshalIndent(models, "", "  ")
	if err != nil {
		return &ToolResult{
			Content: []ContentBlock{{
				Type: "text",
				Text: fmt.Sprintf("Error serializing models: %v", err),
			}},
			IsError: true,
		}, err
	}

	result := &ToolResult{
		Content: []ContentBlock{{
			Type: "text",
			Text: fmt.Sprintf("Found %d models (page %d, size %d)\n\n%s", len(models), page, pageSize, string(modelsJSON)),
		}},
	}

	h.cache.Set(cacheKey, result)
	return result, nil
}

// GetDatabaseSchema analyzes database-related structs and migrations
func (h *MCPHandlers) GetDatabaseSchema() (*ToolResult, error) {
	cacheKey := "database_schema"
	
	if cached, found := h.cache.Get(cacheKey); found {
		if result, ok := cached.(*ToolResult); ok {
			return result, nil
		}
	}

	models := h.analyzer.GetModels()
	dbModels := make([]analysis.ModelInfo, 0)

	for _, model := range models {
		// Check if model has database tags
		for _, tag := range model.Tags {
			if tag == "database" || tag == "json" {
				dbModels = append(dbModels, model)
				break
			}
		}
	}

	schemaJSON, err := json.MarshalIndent(dbModels, "", "  ")
	if err != nil {
		return &ToolResult{
			Content: []ContentBlock{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing database schema: %v", err),
			}},
			IsError: true,
		}, err
	}

	result := &ToolResult{
		Content: []ContentBlock{{
			Type: "text",
			Text: fmt.Sprintf("Database Schema Analysis\n\nFound %d database models:\n\n%s", len(dbModels), string(schemaJSON)),
		}},
	}

	h.cache.Set(cacheKey, result)
	return result, nil
}

// Advanced Code Intelligence Tools

// GetChangeImpact analyzes the impact of changes to a file or function
func (h *MCPHandlers) GetChangeImpact(params map[string]interface{}) (*ToolResult, error) {
	target := getStringParam(params, "target", "")
	if target == "" {
		return &ToolResult{
			Content: []ContentBlock{{
				Type: "text",
				Text: "Error: 'target' parameter is required (file path or function name)",
			}},
			IsError: true,
		}, fmt.Errorf("target parameter required")
	}

	cacheKey := fmt.Sprintf("change_impact_%s", target)
	
	if cached, found := h.cache.Get(cacheKey); found {
		if result, ok := cached.(*ToolResult); ok {
			return result, nil
		}
	}

	callGraph := h.analyzer.GetCallGraph()
	
	// Find affected components
	affectedNodes := findAffectedNodes(callGraph, target)
	affectedModels := findAffectedModels(h.analyzer.GetModels(), target)
	affectedHandlers := findAffectedHandlers(h.analyzer.GetHandlers(), target)

	impact := map[string]interface{}{
		"target":            target,
		"affected_functions": affectedNodes,
		"affected_models":    affectedModels,
		"affected_handlers":  affectedHandlers,
		"risk_level":        calculateRiskLevel(len(affectedNodes), len(affectedModels), len(affectedHandlers)),
		"recommendations":   generateRecommendations(affectedNodes, affectedModels, affectedHandlers),
	}

	impactJSON, err := json.MarshalIndent(impact, "", "  ")
	if err != nil {
		return &ToolResult{
			Content: []ContentBlock{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing change impact: %v", err),
			}},
			IsError: true,
		}, err
	}

	result := &ToolResult{
		Content: []ContentBlock{{
			Type: "text",
			Text: fmt.Sprintf("Change Impact Analysis for: %s\n\n%s", target, string(impactJSON)),
		}},
	}

	h.cache.Set(cacheKey, result)
	return result, nil
}

// API Tools

// GetEndpoints retrieves API endpoints with enhanced analysis
func (h *MCPHandlers) GetEndpoints(params map[string]interface{}) (*ToolResult, error) {
	method := getStringParam(params, "method", "")
	route := getStringParam(params, "route", "")
	
	cacheKey := fmt.Sprintf("endpoints_%s_%s", method, route)
	
	if cached, found := h.cache.Get(cacheKey); found {
		if result, ok := cached.(*ToolResult); ok {
			return result, nil
		}
	}

	handlers := h.analyzer.GetHandlers()
	filteredHandlers := make([]analysis.HandlerInfo, 0)

	for _, handler := range handlers {
		if method != "" && strings.ToUpper(handler.Method) != strings.ToUpper(method) {
			continue
		}
		if route != "" && !strings.Contains(handler.Route, route) {
			continue
		}
		filteredHandlers = append(filteredHandlers, handler)
	}

	endpointsJSON, err := json.MarshalIndent(filteredHandlers, "", "  ")
	if err != nil {
		return &ToolResult{
			Content: []ContentBlock{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing endpoints: %v", err),
			}},
			IsError: true,
		}, err
	}

	result := &ToolResult{
		Content: []ContentBlock{{
			Type: "text",
			Text: fmt.Sprintf("API Endpoints Analysis\n\nFound %d endpoints:\n\n%s", len(filteredHandlers), string(endpointsJSON)),
		}},
	}

	h.cache.Set(cacheKey, result)
	return result, nil
}

// Service Tools

// GetCallGraph retrieves the function call graph with visualization options
func (h *MCPHandlers) GetCallGraph(params map[string]interface{}) (*ToolResult, error) {
	format := getStringParam(params, "format", "json")
	focus := getStringParam(params, "focus", "")
	
	cacheKey := fmt.Sprintf("call_graph_%s_%s", format, focus)
	
	if cached, found := h.cache.Get(cacheKey); found {
		if result, ok := cached.(*ToolResult); ok {
			return result, nil
		}
	}

	callGraph := h.analyzer.GetCallGraph()
	
	// Apply focus filter if specified
	if focus != "" {
		filteredGraph := filterCallGraph(callGraph, focus)
		callGraph = filteredGraph
	}

	var output string
	var err error

	switch format {
	case "dot":
		output = generateDOTFormat(callGraph)
	case "json":
		jsonData, jsonErr := json.MarshalIndent(callGraph, "", "  ")
		if jsonErr != nil {
			err = jsonErr
		} else {
			output = string(jsonData)
		}
	default:
		output = generateTextFormat(callGraph)
	}

	if err != nil {
		return &ToolResult{
			Content: []ContentBlock{{
				Type: "text",
				Text: fmt.Sprintf("Error generating call graph: %v", err),
			}},
			IsError: true,
		}, err
	}

	result := &ToolResult{
		Content: []ContentBlock{{
			Type: "text",
			Text: fmt.Sprintf("Call Graph Analysis (%s format)\n\nNodes: %d, Edges: %d\n\n%s", 
				format, len(callGraph.Nodes), len(callGraph.Edges), output),
		}},
	}

	h.cache.Set(cacheKey, result)
	return result, nil
}

// Helper functions

func getStringParam(params map[string]interface{}, key, defaultValue string) string {
	if val, exists := params[key]; exists {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultValue
}

func getIntParam(params map[string]interface{}, key string, defaultValue int) int {
	if val, exists := params[key]; exists {
		if num, ok := val.(float64); ok {
			return int(num)
		}
		if num, ok := val.(int); ok {
			return num
		}
	}
	return defaultValue
}

func getCurrentTimestamp() int64 {
	// Simplified implementation - in real code use time.Now().Unix()
	return 1234567890
}

func findAffectedNodes(callGraph analysis.CallGraph, target string) []string {
	var affected []string
	
	// Find direct and indirect dependencies
	for _, edge := range callGraph.Edges {
		if strings.Contains(edge.From, target) || strings.Contains(edge.To, target) {
			affected = append(affected, edge.From, edge.To)
		}
	}
	
	return unique(affected)
}

func findAffectedModels(models []analysis.ModelInfo, target string) []string {
	var affected []string
	
	for _, model := range models {
		if strings.Contains(model.Name, target) || strings.Contains(model.Package, target) {
			affected = append(affected, model.Name)
		}
	}
	
	return affected
}

func findAffectedHandlers(handlers []analysis.HandlerInfo, target string) []string {
	var affected []string
	
	for _, handler := range handlers {
		if strings.Contains(handler.Name, target) || strings.Contains(handler.Package, target) {
			affected = append(affected, handler.Name)
		}
	}
	
	return affected
}

func calculateRiskLevel(nodes, models, handlers int) string {
	total := nodes + models + handlers
	if total > 20 {
		return "HIGH"
	} else if total > 10 {
		return "MEDIUM"
	} else if total > 0 {
		return "LOW"
	}
	return "NONE"
}

func generateRecommendations(nodes, models, handlers []string) []string {
	var recommendations []string
	
	if len(nodes) > 10 {
		recommendations = append(recommendations, "Consider breaking down large functions to reduce coupling")
	}
	
	if len(models) > 5 {
		recommendations = append(recommendations, "Review data model dependencies to ensure proper separation")
	}
	
	if len(handlers) > 3 {
		recommendations = append(recommendations, "Multiple handlers affected - ensure comprehensive testing")
	}
	
	if len(recommendations) == 0 {
		recommendations = append(recommendations, "Low impact change - standard testing should suffice")
	}
	
	return recommendations
}

func filterCallGraph(graph analysis.CallGraph, focus string) analysis.CallGraph {
	filtered := analysis.CallGraph{
		Nodes: make(map[string]*analysis.CallNode),
		Edges: make([]analysis.CallEdge, 0),
	}
	
	// Add nodes that match focus
	for id, node := range graph.Nodes {
		if strings.Contains(id, focus) {
			filtered.Nodes[id] = node
		}
	}
	
	// Add edges between filtered nodes
	for _, edge := range graph.Edges {
		if filtered.Nodes[edge.From] != nil && filtered.Nodes[edge.To] != nil {
			filtered.Edges = append(filtered.Edges, edge)
		}
	}
	
	return filtered
}

func generateDOTFormat(graph analysis.CallGraph) string {
	var builder strings.Builder
	builder.WriteString("digraph CallGraph {\n")
	builder.WriteString("  rankdir=LR;\n")
	builder.WriteString("  node [shape=box];\n\n")
	
	for _, edge := range graph.Edges {
		builder.WriteString(fmt.Sprintf("  \"%s\" -> \"%s\";\n", edge.From, edge.To))
	}
	
	builder.WriteString("}")
	return builder.String()
}

func generateTextFormat(graph analysis.CallGraph) string {
	var builder strings.Builder
	builder.WriteString("Call Graph Structure:\n\n")
	
	for id, node := range graph.Nodes {
		builder.WriteString(fmt.Sprintf("- %s (%s.%s)\n", id, node.Package, node.Name))
	}
	
	builder.WriteString("\nCall Relationships:\n\n")
	for _, edge := range graph.Edges {
		builder.WriteString(fmt.Sprintf("- %s -> %s\n", edge.From, edge.To))
	}
	
	return builder.String()
}

func unique(slice []string) []string {
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