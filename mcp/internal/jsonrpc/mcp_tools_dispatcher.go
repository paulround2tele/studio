package jsonrpc

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"mcp/internal/models"
)

// ToolRegistry manages all available MCP tools
type ToolRegistry struct {
	tools map[string]models.MCPTool
}

// NewToolRegistry creates a new tool registry with all available tools
func NewToolRegistry() *ToolRegistry {
	registry := &ToolRegistry{
		tools: make(map[string]models.MCPTool),
	}
	registry.registerAllTools()
	return registry
}

// GetAllTools returns all registered tools
func (tr *ToolRegistry) GetAllTools() []models.MCPTool {
	tools := make([]models.MCPTool, 0, len(tr.tools))
	for _, tool := range tr.tools {
		tools = append(tools, tool)
	}
	return tools
}

// GetTool returns a specific tool by name
func (tr *ToolRegistry) GetTool(name string) (models.MCPTool, bool) {
	tool, exists := tr.tools[name]
	return tool, exists
}

// registerAllTools registers all available tools
func (tr *ToolRegistry) registerAllTools() {
	// Database Tools
	tr.registerDatabaseTools()
	
	// Code Analysis Tools
	tr.registerCodeAnalysisTools()
	
	// Configuration Tools
	tr.registerConfigurationTools()
	
	// Search Tools
	tr.registerSearchTools()
	
	// WebSocket Tools
	tr.registerWebSocketTools()
	
	// Business Logic Tools
	tr.registerBusinessLogicTools()
	
	// Advanced Tools
	tr.registerAdvancedTools()
	
	// Interactive Tools
	tr.registerInteractiveTools()
	
	// UI Tools
	tr.registerUITools()
	
	// Analysis Tools
	tr.registerAnalysisTools()
	
	// Frontend Tools
	tr.registerFrontendTools()
	
	// Business Domain Tools
	tr.registerBusinessDomainTools()
	
	// Enhanced Analysis Tools
	tr.registerEnhancedAnalysisTools()
}

// Schema helpers for common patterns
func noParamsSchema() map[string]interface{} {
	return map[string]interface{}{
		"type":       "object",
		"properties": map[string]interface{}{},
	}
}

func stringParamSchema(name, description string, required bool) map[string]interface{} {
	schema := map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			name: map[string]interface{}{
				"type":        "string",
				"description": description,
			},
		},
	}
	if required {
		schema["required"] = []string{name}
	}
	return schema
}

func urlParamSchema() map[string]interface{} {
	return stringParamSchema("url", "URL to visit", true)
}

// Tool registration methods
func (tr *ToolRegistry) registerDatabaseTools() {
	tr.tools["get_database_schema"] = models.MCPTool{
		Name:        "get_database_schema",
		Description: "Get the database schema including tables, columns, and indexes",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_backend_openapi_schema"] = models.MCPTool{
		Name:        "get_backend_openapi_schema",
		Description: "Get OpenAPI schema including specifications and route definitions",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_database_stats"] = models.MCPTool{
		Name:        "get_database_stats",
		Description: "Get database performance statistics and metrics",
		InputSchema: noParamsSchema(),
	}
}

func (tr *ToolRegistry) registerCodeAnalysisTools() {
	tr.tools["get_backend_data_models"] = models.MCPTool{
		Name:        "get_backend_data_models",
		Description: "Get all backend data models and their structures",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_backend_api_routes"] = models.MCPTool{
		Name:        "get_backend_api_routes",
		Description: "Get all API routes and endpoints",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_backend_api_endpoints"] = models.MCPTool{
		Name:        "get_backend_api_endpoints",
		Description: "Get all API endpoints (alias for get_backend_api_routes)",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_backend_request_handlers"] = models.MCPTool{
		Name:        "get_backend_request_handlers",
		Description: "Get all backend request handlers",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_backend_services"] = models.MCPTool{
		Name:        "get_backend_services",
		Description: "Get all backend service definitions and interfaces",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_interfaces"] = models.MCPTool{
		Name:        "get_interfaces",
		Description: "Get all interfaces and their methods",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["find_implementations"] = models.MCPTool{
		Name:        "find_implementations",
		Description: "Find implementations of interfaces",
		InputSchema: stringParamSchema("interface", "Interface name to find implementations for", true),
	}
	
	tr.tools["get_call_graph"] = models.MCPTool{
		Name:        "get_call_graph",
		Description: "Get call graph analysis of functions",
		InputSchema: stringParamSchema("function", "Function name to analyze (optional, defaults to 'main')", false),
	}
}

func (tr *ToolRegistry) registerConfigurationTools() {
	tr.tools["get_config"] = models.MCPTool{
		Name:        "get_config",
		Description: "Get application configuration structure",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_middleware"] = models.MCPTool{
		Name:        "get_middleware",
		Description: "Get middleware configuration and usage",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_env_vars"] = models.MCPTool{
		Name:        "get_env_vars",
		Description: "Get environment variables used in the application",
		InputSchema: noParamsSchema(),
	}
}

func (tr *ToolRegistry) registerSearchTools() {
	tr.tools["search_code"] = models.MCPTool{
		Name:        "search_code",
		Description: "Search for code patterns and implementations",
		InputSchema: stringParamSchema("query", "Search query for code", true),
	}
	
	tr.tools["get_package_structure"] = models.MCPTool{
		Name:        "get_package_structure",
		Description: "Get the package and module structure",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_dependencies"] = models.MCPTool{
		Name:        "get_dependencies",
		Description: "Get project dependencies and their relationships",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_dependency_graph"] = models.MCPTool{
		Name:        "get_dependency_graph",
		Description: "Get project package dependency graph",
		InputSchema: noParamsSchema(),
	}
}

func (tr *ToolRegistry) registerWebSocketTools() {
	tr.tools["get_websocket_endpoints"] = models.MCPTool{
		Name:        "get_websocket_endpoints",
		Description: "Get WebSocket endpoints and their configurations",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_websocket_handlers"] = models.MCPTool{
		Name:        "get_websocket_handlers",
		Description: "Get WebSocket message handlers",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_websocket_messages"] = models.MCPTool{
		Name:        "get_websocket_messages",
		Description: "Get WebSocket message types and structures",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_websocket_lifecycle"] = models.MCPTool{
		Name:        "get_websocket_lifecycle",
		Description: "Get WebSocket connection lifecycle and state management",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["test_websocket_flow"] = models.MCPTool{
		Name:        "test_websocket_flow",
		Description: "Test WebSocket message flow and connectivity",
		InputSchema: noParamsSchema(),
	}
}

func (tr *ToolRegistry) registerBusinessLogicTools() {
	tr.tools["get_middleware_usage"] = models.MCPTool{
		Name:        "get_middleware_usage",
		Description: "Get middleware usage patterns and analysis",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["trace_middleware_flow"] = models.MCPTool{
		Name:        "trace_middleware_flow",
		Description: "Trace middleware execution flow and pipeline",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_workflows"] = models.MCPTool{
		Name:        "get_workflows",
		Description: "Get business workflows and processes",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_business_rules"] = models.MCPTool{
		Name:        "get_business_rules",
		Description: "Get business rules and validation logic",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_feature_flags"] = models.MCPTool{
		Name:        "get_feature_flags",
		Description: "Get feature flags and their configurations",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_campaign_pipeline"] = models.MCPTool{
		Name:        "get_campaign_pipeline",
		Description: "Get the pipeline status for a campaign",
		InputSchema: stringParamSchema("campaignId", "Campaign UUID", true),
	}
}

func (tr *ToolRegistry) registerAdvancedTools() {
	tr.tools["find_by_type"] = models.MCPTool{
		Name:        "find_by_type",
		Description: "Find code elements by type",
		InputSchema: stringParamSchema("type", "Type to search for", true),
	}
	
	tr.tools["get_references"] = models.MCPTool{
		Name:        "get_references",
		Description: "Get references and usages of code elements",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"symbol": map[string]interface{}{
					"type":        "string",
					"description": "Symbol to find references for",
				},
				"filePath": map[string]interface{}{
					"type":        "string",
					"description": "File path context (optional)",
				},
			},
			"required": []string{"symbol"},
		},
	}
	
	tr.tools["get_change_impact"] = models.MCPTool{
		Name:        "get_change_impact",
		Description: "Analyze the impact of code changes",
		InputSchema: stringParamSchema("file", "File to analyze impact for", true),
	}
	
	tr.tools["snapshot"] = models.MCPTool{
		Name:        "snapshot",
		Description: "Create a snapshot of the current codebase state",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["contract_drift_check"] = models.MCPTool{
		Name:        "contract_drift_check",
		Description: "Check for API contract drift and inconsistencies",
		InputSchema: noParamsSchema(),
	}
}

func (tr *ToolRegistry) registerInteractiveTools() {
	tr.tools["run_terminal_command"] = models.MCPTool{
		Name:        "run_terminal_command",
		Description: "Execute terminal commands in the project context",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"command": map[string]interface{}{
					"type":        "string",
					"description": "Command to execute",
				},
				"workingDir": map[string]interface{}{
					"type":        "string",
					"description": "Working directory for command execution (optional)",
				},
			},
			"required": []string{"command"},
		},
	}
	
	tr.tools["apply_code_change"] = models.MCPTool{
		Name:        "apply_code_change",
		Description: "Apply a code change using diff/patch",
		InputSchema: stringParamSchema("diff", "The diff to apply", true),
	}
}

func (tr *ToolRegistry) registerUITools() {
	tr.tools["browse_with_playwright"] = models.MCPTool{
		Name:        "browse_with_playwright",
		Description: "Fetch a URL in a headless browser and capture a screenshot",
		InputSchema: urlParamSchema(),
	}
	
	tr.tools["browse_with_playwright_incremental"] = models.MCPTool{
		Name:        "browse_with_playwright_incremental",
		Description: "Browse with incremental UI state streaming for optimized token usage",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"url": map[string]interface{}{
					"type":        "string",
					"description": "URL to visit",
				},
				"sessionId": map[string]interface{}{
					"type":        "string",
					"description": "Session ID for incremental state tracking (optional)",
				},
				"streamingMode": map[string]interface{}{
					"type":        "string",
					"description": "Streaming mode: 'full', 'incremental', or 'adaptive'",
					"enum":        []string{"full", "incremental", "adaptive"},
				},
			},
			"required": []string{"url"},
		},
	}
	
	// Additional UI tools...
	tr.tools["get_latest_screenshot"] = models.MCPTool{
		Name:        "get_latest_screenshot",
		Description: "Return the most recent Playwright screenshot",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"base64": map[string]interface{}{
					"type":        "boolean",
					"description": "Return base64 encoded data",
				},
			},
		},
	}
	
	tr.tools["get_ui_metadata"] = models.MCPTool{
		Name:        "get_ui_metadata",
		Description: "Extract component metadata from the last HTML capture",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_visual_context"] = models.MCPTool{
		Name:        "get_visual_context",
		Description: "Run Playwright and assemble screenshot, metadata and code mapping",
		InputSchema: urlParamSchema(),
	}
	
	tr.tools["generate_ui_test_prompt_with_actions"] = models.MCPTool{
		Name:        "generate_ui_test_prompt_with_actions",
		Description: "Run Playwright with scripted actions and return visual context",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"url": map[string]interface{}{
					"type":        "string",
					"description": "Initial URL",
				},
				"actions": map[string]interface{}{
					"type":        "array",
					"description": "List of UI actions",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"action": map[string]interface{}{
								"type":        "string",
								"description": "Type of action to perform",
								"enum":        []string{"click", "type", "hover", "scroll", "navigate", "wait", "moveto", "clickat", "doubleclickat", "rightclickat", "dragfrom", "hoverat", "scrollat", "gesture"},
							},
							"selector": map[string]interface{}{
								"type":        "string",
								"description": "CSS selector for the target element",
							},
							"text": map[string]interface{}{
								"type":        "string",
								"description": "Text to type or search for",
							},
							"url": map[string]interface{}{
								"type":        "string",
								"description": "URL to navigate to",
							},
							"timeout": map[string]interface{}{
								"type":        "integer",
								"description": "Timeout in milliseconds",
								"minimum":     0,
							},
							"x": map[string]interface{}{
								"type":        "number",
								"description": "X coordinate for action",
							},
							"y": map[string]interface{}{
								"type":        "number",
								"description": "Y coordinate for action",
							},
						},
						"required": []string{"action"},
					},
				},
			},
			"required": []string{"url", "actions"},
		},
	}
	
	tr.tools["process_ui_action_incremental"] = models.MCPTool{
		Name:        "process_ui_action_incremental",
		Description: "Process UI action with incremental state updates",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"sessionId": map[string]interface{}{
					"type":        "string",
					"description": "Session ID for incremental state tracking",
				},
				"action": map[string]interface{}{
					"type":        "string",
					"description": "Type of action to perform",
					"enum":        []string{"click", "type", "hover", "scroll", "navigate", "wait", "moveto", "clickat", "doubleclickat", "rightclickat", "dragfrom", "hoverat", "scrollat", "gesture"},
				},
				"selector": map[string]interface{}{
					"type":        "string",
					"description": "CSS selector for the target element",
				},
				"text": map[string]interface{}{
					"type":        "string",
					"description": "Text to type (for type action)",
				},
				"url": map[string]interface{}{
					"type":        "string",
					"description": "URL to navigate to (for navigate action)",
				},
				"timeout": map[string]interface{}{
					"type":        "integer",
					"description": "Timeout in milliseconds",
					"minimum":     0,
				},
				"x": map[string]interface{}{
					"type":        "number",
					"description": "X coordinate for action",
				},
				"y": map[string]interface{}{
					"type":        "number",
					"description": "Y coordinate for action",
				},
			},
			"required": []string{"sessionId", "action"},
		},
	}
	
	tr.tools["get_incremental_ui_state"] = models.MCPTool{
		Name:        "get_incremental_ui_state",
		Description: "Get current incremental UI state for a session",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"sessionId": map[string]interface{}{
					"type":        "string",
					"description": "Session ID for incremental state tracking",
				},
				"includeScreenshot": map[string]interface{}{
					"type":        "boolean",
					"description": "Include screenshot in response",
				},
				"includeDeltas": map[string]interface{}{
					"type":        "boolean",
					"description": "Include DOM deltas in response",
				},
			},
			"required": []string{"sessionId"},
		},
	}
	
	tr.tools["set_streaming_mode"] = models.MCPTool{
		Name:        "set_streaming_mode",
		Description: "Set streaming mode for incremental UI updates",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"sessionId": map[string]interface{}{
					"type":        "string",
					"description": "Session ID for incremental state tracking",
				},
				"mode": map[string]interface{}{
					"type":        "string",
					"description": "Streaming mode to set",
					"enum":        []string{"full", "incremental", "adaptive"},
				},
				"adaptiveThreshold": map[string]interface{}{
					"type":        "number",
					"description": "Token usage threshold for adaptive mode (optional)",
					"minimum":     0,
				},
			},
			"required": []string{"sessionId", "mode"},
		},
	}
	
	tr.tools["get_stream_stats"] = models.MCPTool{
		Name:        "get_stream_stats",
		Description: "Get streaming statistics and performance metrics",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"sessionId": map[string]interface{}{
					"type":        "string",
					"description": "Session ID for incremental state tracking (optional)",
				},
			},
		},
	}
	
	tr.tools["cleanup_incremental_session"] = models.MCPTool{
		Name:        "cleanup_incremental_session",
		Description: "Clean up incremental session and free resources",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"sessionId": map[string]interface{}{
					"type":        "string",
					"description": "Session ID to clean up",
				},
			},
			"required": []string{"sessionId"},
		},
	}
	
	tr.tools["get_incremental_debug_info"] = models.MCPTool{
		Name:        "get_incremental_debug_info",
		Description: "Get debug information for incremental streaming session",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"sessionId": map[string]interface{}{
					"type":        "string",
					"description": "Session ID for debug information",
				},
				"includeDetailedState": map[string]interface{}{
					"type":        "boolean",
					"description": "Include detailed internal state information",
				},
			},
			"required": []string{"sessionId"},
		},
	}
}

func (tr *ToolRegistry) registerAnalysisTools() {
	tr.tools["analyze_performance"] = models.MCPTool{
		Name:        "analyze_performance",
		Description: "Analyze application performance bottlenecks",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_security_analysis"] = models.MCPTool{
		Name:        "get_security_analysis",
		Description: "Perform security analysis of the codebase",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["validate_api_contracts"] = models.MCPTool{
		Name:        "validate_api_contracts",
		Description: "Validate API contracts and OpenAPI specifications",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_test_coverage"] = models.MCPTool{
		Name:        "get_test_coverage",
		Description: "Get test coverage analysis and metrics",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["analyze_code_quality"] = models.MCPTool{
		Name:        "analyze_code_quality",
		Description: "Analyze code quality metrics and technical debt",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["analyze_complexity"] = models.MCPTool{
		Name:        "analyze_complexity",
		Description: "Run gocyclo to report function complexity",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_lint_diagnostics"] = models.MCPTool{
		Name:        "get_lint_diagnostics",
		Description: "Run golangci-lint or staticcheck and go build",
		InputSchema: noParamsSchema(),
	}
}

func (tr *ToolRegistry) registerFrontendTools() {
	tr.tools["frontend_nextjs_app_routes"] = models.MCPTool{
		Name:        "frontend_nextjs_app_routes",
		Description: "[Frontend] List Next.js app router routes",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["frontend_react_component_tree"] = models.MCPTool{
		Name:        "frontend_react_component_tree",
		Description: "[Frontend] Get React component import tree and dependencies",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["frontend_api_client_analysis"] = models.MCPTool{
		Name:        "frontend_api_client_analysis",
		Description: "[Frontend] Analyze sophisticated TypeScript API client structure and capabilities",
		InputSchema: noParamsSchema(),
	}
}

func (tr *ToolRegistry) registerBusinessDomainTools() {
	tr.tools["get_business_domains"] = models.MCPTool{
		Name:        "get_business_domains",
		Description: "Analyze business domains within the backend architecture",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_advanced_tooling"] = models.MCPTool{
		Name:        "get_advanced_tooling",
		Description: "Analyze advanced development and database tooling",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_business_domain_middleware"] = models.MCPTool{
		Name:        "get_business_domain_middleware",
		Description: "Analyze middleware specific to business domains",
		InputSchema: noParamsSchema(),
	}
}

func (tr *ToolRegistry) registerEnhancedAnalysisTools() {
	tr.tools["get_enhanced_dependencies"] = models.MCPTool{
		Name:        "get_enhanced_dependencies",
		Description: "Get enhanced dependency analysis with business domain mapping",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_enhanced_security_analysis"] = models.MCPTool{
		Name:        "get_enhanced_security_analysis",
		Description: "Get enhanced security analysis for business domains",
		InputSchema: noParamsSchema(),
	}
	
	tr.tools["get_enhanced_api_schema"] = models.MCPTool{
		Name:        "get_enhanced_api_schema",
		Description: "Get enhanced API schema analysis with business domain awareness",
		InputSchema: noParamsSchema(),
	}
}

// handleListTools handles MCP tools/list request
func (s *JSONRPCServer) handleListTools(ctx context.Context, params json.RawMessage) (interface{}, error) {
	if s.toolRegistry == nil {
		s.toolRegistry = NewToolRegistry()
	}
	
	tools := s.toolRegistry.GetAllTools()
	log.Printf("Returning %d MCP tools", len(tools))
	
	return map[string]interface{}{
		"tools": tools,
	}, nil
}

// handleCallTool handles MCP tools/call request
func (s *JSONRPCServer) handleCallTool(ctx context.Context, params json.RawMessage) (interface{}, error) {
	var toolCall models.MCPToolCall
	if err := json.Unmarshal(params, &toolCall); err != nil {
		return nil, fmt.Errorf("failed to unmarshal tool call: %w", err)
	}

	log.Printf("MCP tool call: %s", toolCall.Name)

	// Validate tool exists
	if s.toolRegistry == nil {
		s.toolRegistry = NewToolRegistry()
	}
	
	if _, exists := s.toolRegistry.GetTool(toolCall.Name); !exists {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Unknown tool: %s", toolCall.Name),
				},
			},
		}, nil
	}

	// Route to appropriate handler
	return s.routeToolCall(ctx, toolCall)
}

// routeToolCall routes tool calls to appropriate handlers
func (s *JSONRPCServer) routeToolCall(ctx context.Context, toolCall models.MCPToolCall) (interface{}, error) {
	switch toolCall.Name {
	// Database Tools
	case "get_database_schema":
		return s.callGetDatabaseSchema()
	case "get_backend_openapi_schema":
		return s.callGetAPISchema()
	case "get_database_stats":
		return s.callGetDatabaseStats()

	// Code Analysis Tools
	case "get_backend_data_models":
		return s.callGetModels()
	case "get_backend_api_routes", "get_backend_api_endpoints":
		return s.callGetRoutes()
	case "get_backend_request_handlers":
		return s.callGetHandlers()
	case "get_backend_services":
		return s.callGetServices()
	case "get_interfaces":
		return s.callGetInterfaces()
	case "find_implementations":
		return s.callFindImplementations(toolCall.Arguments)
	case "get_call_graph":
		return s.callGetCallGraph(toolCall.Arguments)

	// Configuration Tools
	case "get_config":
		return s.callGetConfig()
	case "get_middleware":
		return s.callGetMiddleware()
	case "get_env_vars":
		return s.callGetEnvVars()
	case "trace_middleware_flow":
		return s.callTraceMiddlewareFlow()

	// Search Tools
	case "search_code":
		return s.callSearchCode(ctx, toolCall.Arguments)
	case "get_package_structure":
		return s.callGetPackageStructure(ctx)
	case "get_dependencies":
		return s.callGetDependencies(ctx)
	case "get_dependency_graph":
		return s.callGetDependencyGraph(ctx)

	// WebSocket Tools
	case "get_websocket_endpoints":
		return s.callGetWebSocketEndpoints(ctx)
	case "get_websocket_handlers":
		return s.callGetWebSocketHandlers(ctx)
	case "get_websocket_messages":
		return s.callGetWebSocketMessages(ctx)
	case "get_websocket_lifecycle":
		return s.callGetWebSocketLifecycle(ctx)
	case "test_websocket_flow":
		return s.callTestWebSocketFlow(ctx)

	// Business Logic Tools
	case "get_middleware_usage":
		return s.callGetMiddlewareUsage()
	case "get_workflows":
		return s.callGetWorkflows()
	case "get_business_rules":
		return s.callGetBusinessRules()
	case "get_feature_flags":
		return s.callGetFeatureFlags()
	case "get_campaign_pipeline":
		return s.callGetCampaignPipeline(toolCall.Arguments)

	// Advanced Tools
	case "find_by_type":
		return s.callFindByType(toolCall.Arguments)
	case "get_references":
		return s.callGetReferences(toolCall.Arguments)
	case "get_change_impact":
		return s.callGetChangeImpact(toolCall.Arguments)
	case "snapshot":
		return s.callCreateSnapshot()
	case "contract_drift_check":
		return s.callCheckContractDrift()

	// Interactive Tools
	case "run_terminal_command":
		return s.callRunTerminalCommand(ctx, toolCall.Arguments)
	case "apply_code_change":
		return s.callApplyCodeChange(ctx, toolCall.Arguments)

	// UI Tools
	case "browse_with_playwright":
		return s.callBrowseWithPlaywright(ctx, toolCall.Arguments)
	case "browse_with_playwright_incremental":
		return s.callBrowseWithPlaywrightIncremental(ctx, toolCall.Arguments)
	case "get_latest_screenshot":
		return s.callGetLatestScreenshot(ctx, toolCall.Arguments)
	case "get_ui_metadata":
		return s.callGetUIMetadata(ctx)
	case "get_visual_context":
		return s.callGetVisualContext(ctx, toolCall.Arguments)
	case "generate_ui_test_prompt_with_actions":
		return s.callGenerateUITestPromptWithActions(ctx, toolCall.Arguments)
	case "process_ui_action_incremental":
		return s.callProcessUIActionIncremental(ctx, toolCall.Arguments)
	case "get_incremental_ui_state":
		return s.callGetIncrementalUIState(ctx, toolCall.Arguments)
	case "set_streaming_mode":
		return s.callSetStreamingMode(ctx, toolCall.Arguments)
	case "get_stream_stats":
		return s.callGetStreamStats(ctx, toolCall.Arguments)
	case "cleanup_incremental_session":
		return s.callCleanupIncrementalSession(ctx, toolCall.Arguments)
	case "get_incremental_debug_info":
		return s.callGetIncrementalDebugInfo(ctx, toolCall.Arguments)

	// Analysis Tools
	case "analyze_performance":
		return s.callAnalyzePerformance()
	case "get_security_analysis":
		return s.callGetSecurityAnalysis()
	case "validate_api_contracts":
		return s.callValidateAPIContracts()
	case "get_test_coverage":
		return s.callGetTestCoverage()
	case "analyze_code_quality":
		return s.callAnalyzeCodeQuality()
	case "analyze_complexity":
		return s.callAnalyzeComplexity()
	case "get_lint_diagnostics":
		return s.callGetLintDiagnostics()

	// Frontend Tools
	case "frontend_nextjs_app_routes":
		return s.callGetFrontendRoutes()
	case "frontend_react_component_tree":
		return s.callGetComponentTree()
	case "frontend_api_client_analysis":
		return s.callGetFrontendAPIClientAnalysis()

	// Business Domain Tools
	case "get_business_domains":
		return s.callGetBusinessDomains()
	case "get_advanced_tooling":
		return s.callGetAdvancedTooling()
	case "get_business_domain_middleware":
		return s.callGetBusinessDomainMiddleware()

	// Enhanced Analysis Tools
	case "get_enhanced_dependencies":
		return s.callGetEnhancedDependencies()
	case "get_enhanced_security_analysis":
		return s.callGetEnhancedSecurityAnalysis()
	case "get_enhanced_api_schema":
		return s.callGetEnhancedAPISchema()

	default:
		return nil, fmt.Errorf("tool handler not implemented: %s", toolCall.Name)
	}
}
