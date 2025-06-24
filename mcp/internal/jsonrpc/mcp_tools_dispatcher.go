package jsonrpc

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"mcp/internal/models"
)

// handleListTools handles MCP tools/list request
func (s *JSONRPCServer) handleListTools(ctx context.Context, params json.RawMessage) (interface{}, error) {
	tools := []models.MCPTool{
		// Database Tools (1)
		{
			Name:        "get_database_schema",
			Description: "Get the database schema including tables, columns, and indexes",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_api_schema",
			Description: "Get API schema including OpenAPI specifications and route definitions",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Code Analysis Tools (7)
		{
			Name:        "get_models",
			Description: "Get all data models and their structures",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_routes",
			Description: "Get all API routes and endpoints",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_endpoints",
			Description: "Get all API endpoints (alias for get_routes)",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_handlers",
			Description: "Get all request handlers",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_services",
			Description: "Get all service definitions and interfaces",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_interfaces",
			Description: "Get all interfaces and their methods",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "find_implementations",
			Description: "Find implementations of interfaces",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"interface": map[string]interface{}{
						"type":        "string",
						"description": "Interface name to find implementations for",
					},
				},
			},
		},
		{
			Name:        "get_call_graph",
			Description: "Get call graph analysis of functions",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"function": map[string]interface{}{
						"type":        "string",
						"description": "Function name to analyze (optional, defaults to 'main')",
					},
				},
			},
		},

		// Configuration Tools (3)
		{
			Name:        "get_config",
			Description: "Get application configuration structure",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_middleware",
			Description: "Get middleware configuration and usage",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_env_vars",
			Description: "Get environment variables used in the application",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Search Tools (3)
		{
			Name:        "search_code",
			Description: "Search for code patterns and implementations",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{
						"type":        "string",
						"description": "Search query for code",
					},
				},
				"required": []string{"query"},
			},
		},
		{
			Name:        "get_package_structure",
			Description: "Get the package and module structure",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_dependencies",
			Description: "Get project dependencies and their relationships",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// WebSocket Tools (3)
		{
			Name:        "get_websocket_endpoints",
			Description: "Get WebSocket endpoints and their configurations",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_websocket_handlers",
			Description: "Get WebSocket message handlers",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_websocket_messages",
			Description: "Get WebSocket message types and structures",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_websocket_lifecycle",
			Description: "Get WebSocket connection lifecycle and state management",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "test_websocket_flow",
			Description: "Test WebSocket message flow and connectivity",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Business Logic Tools (4)
		{
			Name:        "get_middleware_usage",
			Description: "Get middleware usage patterns and analysis",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "trace_middleware_flow",
			Description: "Trace middleware execution flow and pipeline",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_workflows",
			Description: "Get business workflows and processes",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_business_rules",
			Description: "Get business rules and validation logic",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_feature_flags",
			Description: "Get feature flags and their configurations",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Advanced Tools (5)
		{
			Name:        "find_by_type",
			Description: "Find code elements by type",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"type": map[string]interface{}{
						"type":        "string",
						"description": "Type to search for",
					},
				},
				"required": []string{"type"},
			},
		},
		{
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
		},
		{
			Name:        "get_change_impact",
			Description: "Analyze the impact of code changes",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"file": map[string]interface{}{
						"type":        "string",
						"description": "File to analyze impact for",
					},
				},
				"required": []string{"file"},
			},
		},
		{
			Name:        "snapshot",
			Description: "Create a snapshot of the current codebase state",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "contract_drift_check",
			Description: "Check for API contract drift and inconsistencies",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Interactive Tools (2)
		{
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
		},
		{
			Name:        "apply_code_change",
			Description: "Apply a code change using diff/patch",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"diff": map[string]interface{}{
						"type":        "string",
						"description": "The diff to apply",
					},
				},
				"required": []string{"diff"},
			},
		},

		// New Tools (6 additional to reach 34)
		{
			Name:        "get_database_stats",
			Description: "Get database performance statistics and metrics",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "analyze_performance",
			Description: "Analyze application performance bottlenecks",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_security_analysis",
			Description: "Perform security analysis of the codebase",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "validate_api_contracts",
			Description: "Validate API contracts and OpenAPI specifications",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_test_coverage",
			Description: "Get test coverage analysis and metrics",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "analyze_code_quality",
			Description: "Analyze code quality metrics and technical debt",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
	}

	log.Printf("Returning %d MCP tools", len(tools))

	return map[string]interface{}{
		"tools": tools,
	}, nil
}

// handleCallTool handles MCP tools/call request
func (s *JSONRPCServer) handleCallTool(ctx context.Context, params json.RawMessage) (interface{}, error) {
	var toolCall models.MCPToolCall
	if err := json.Unmarshal(params, &toolCall); err != nil {
		return nil, err
	}

	log.Printf("MCP tool call: %s", toolCall.Name)

	switch toolCall.Name {
	// Database Tools
	case "get_database_schema":
		return s.callGetDatabaseSchema()
	case "get_api_schema":
		return s.callGetAPISchema()
	case "get_database_stats":
		return s.callGetDatabaseStats()

	// Code Analysis Tools
	case "get_models":
		return s.callGetModels()
	case "get_routes", "get_endpoints":
		return s.callGetRoutes()
	case "get_handlers":
		return s.callGetHandlers()
	case "get_services":
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

	// New Tools
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

	default:
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Unknown tool: %s", toolCall.Name),
				},
			},
		}, nil
	}
}
