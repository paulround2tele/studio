package jsonrpc

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
)

//nolint:unparam // ctx parameter may be used in future implementations

// MCPRequest represents a generic MCP request
type MCPRequest struct {
	Method string          `json:"method"`
	Params json.RawMessage `json:"params,omitempty"`
}

// MCPResponse represents a generic MCP response
type MCPResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// registerMCPHandlers registers MCP-specific method handlers
func (s *JSONRPCServer) registerMCPHandlers() {
	// MCP protocol methods
	s.handlers["initialize"] = s.handleMCPInitialize
	s.handlers["notifications/initialized"] = s.handleMCPInitialized

	// MCP tools
	s.handlers["tools/list"] = s.handleListTools
	s.handlers["tools/call"] = s.handleCallTool
}

// MCPInitializeParams represents MCP initialize parameters
type MCPInitializeParams struct {
	ProtocolVersion string                 `json:"protocolVersion"`
	Capabilities    map[string]interface{} `json:"capabilities"`
	ClientInfo      struct {
		Name    string `json:"name"`
		Version string `json:"version"`
	} `json:"clientInfo"`
}

// MCPInitializeResult represents MCP initialize result
type MCPInitializeResult struct {
	ProtocolVersion string                 `json:"protocolVersion"`
	Capabilities    map[string]interface{} `json:"capabilities"`
	ServerInfo      struct {
		Name    string `json:"name"`
		Version string `json:"version"`
	} `json:"serverInfo"`
}

// handleMCPInitialize handles MCP initialize request
func (s *JSONRPCServer) handleMCPInitialize(ctx context.Context, params json.RawMessage) (interface{}, error) {
	var initParams MCPInitializeParams
	if err := json.Unmarshal(params, &initParams); err != nil {
		return nil, err
	}

	log.Printf("MCP Initialize request from client: %s %s", initParams.ClientInfo.Name, initParams.ClientInfo.Version)

	result := MCPInitializeResult{
		ProtocolVersion: "2025-03-26",
		Capabilities: map[string]interface{}{
			"tools": map[string]interface{}{},
		},
		ServerInfo: struct {
			Name    string `json:"name"`
			Version string `json:"version"`
		}{
			Name:    "MCP Go Server",
			Version: "1.0.0",
		},
	}

	return result, nil
}

// handleMCPInitialized handles MCP initialized notification
func (s *JSONRPCServer) handleMCPInitialized(ctx context.Context, params json.RawMessage) (interface{}, error) {
	log.Println("MCP client initialized successfully")
	return nil, nil
}

// MCPTool represents an MCP tool
type MCPTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

// handleListTools handles MCP tools/list request
func (s *JSONRPCServer) handleListTools(ctx context.Context, params json.RawMessage) (interface{}, error) {
	tools := []MCPTool{
		// Database Tools
		{
			Name:        "get_database_schema",
			Description: "Get the database schema including tables, columns, and indexes",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Code Analysis Tools
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
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Configuration Tools
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

		// Search Tools
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

		// WebSocket Tools
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

		// Business Logic Tools
		{
			Name:        "get_middleware_usage",
			Description: "Get middleware usage patterns and analysis",
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

		// Advanced Tools
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

		// Interactive Tools
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
	}

	return map[string]interface{}{
		"tools": tools,
	}, nil
}

// MCPToolCall represents a tool call request
type MCPToolCall struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

// handleCallTool handles MCP tools/call request
func (s *JSONRPCServer) handleCallTool(ctx context.Context, params json.RawMessage) (interface{}, error) {
	var toolCall MCPToolCall
	if err := json.Unmarshal(params, &toolCall); err != nil {
		return nil, err
	}

	log.Printf("MCP tool call: %s", toolCall.Name)

	switch toolCall.Name {
	// Database Tools
	case "get_database_schema":
		return s.callGetDatabaseSchema()

	// Code Analysis Tools
	case "get_models":
		return s.callGetModels(ctx)
	case "get_routes", "get_endpoints":
		return s.callGetRoutes(ctx)
	case "get_handlers":
		return s.callGetHandlers(ctx)
	case "get_services":
		return s.callGetServices(ctx)
	case "get_interfaces":
		return s.callGetInterfaces(ctx)
	case "find_implementations":
		return s.callFindImplementations(ctx, toolCall.Arguments)
	case "get_call_graph":
		return s.callGetCallGraph(ctx)

	// Configuration Tools
	case "get_config":
		return s.callGetConfig(ctx)
	case "get_middleware":
		return s.callGetMiddleware(ctx)
	case "get_env_vars":
		return s.callGetEnvVars(ctx)

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

	// Business Logic Tools
	case "get_middleware_usage":
		return s.callGetMiddlewareUsage(ctx)
	case "get_workflows":
		return s.callGetWorkflows(ctx)
	case "get_business_rules":
		return s.callGetBusinessRules(ctx)
	case "get_feature_flags":
		return s.callGetFeatureFlags(ctx)
	case "find_by_type":
		return s.callFindByType(ctx, toolCall.Arguments)

	// Advanced Tools
	case "get_references":
		return s.callGetReferences(ctx, toolCall.Arguments)
	case "get_change_impact":
		return s.callGetChangeImpact(ctx, toolCall.Arguments)
	case "snapshot":
		return s.callSnapshot(ctx)
	case "contract_drift_check":
		return s.callContractDriftCheck(ctx)

	// Interactive Tools
	case "run_terminal_command":
		return s.callRunTerminalCommand(ctx, toolCall.Arguments)
	case "apply_code_change":
		return s.callApplyCodeChange(ctx, toolCall.Arguments)

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

// callGetDatabaseSchema implements the get_database_schema tool
func (s *JSONRPCServer) callGetDatabaseSchema() (interface{}, error) {
	tables, err := s.bridge.GetDatabaseSchema()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting database schema: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Database schema retrieved successfully. Found %d tables.", len(tables)),
			},
		},
	}, nil
}

// callApplyCodeChange implements the apply_code_change tool
func (s *JSONRPCServer) callApplyCodeChange(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	diff, ok := args["diff"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: diff parameter is required and must be a string",
				},
			},
		}, nil
	}

	stdout, stderr, err := s.bridge.ApplyCodeChange(diff)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error applying code change: %v\nStdout: %s\nStderr: %s", err, stdout, stderr),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Code change applied successfully.\nOutput: %s", stdout),
			},
		},
	}, nil
}

// callGetModels implements the get_models tool
func (s *JSONRPCServer) callGetModels(ctx context.Context) (interface{}, error) {
	_ = ctx // Context not used in this implementation
	models, err := s.bridge.GetModels()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting models: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d models in the codebase", len(models)),
			},
		},
	}, nil
}

// callGetRoutes implements the get_routes/get_endpoints tool
func (s *JSONRPCServer) callGetRoutes(ctx context.Context) (interface{}, error) {
	routes, err := s.bridge.GetRoutes()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting routes: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d API routes", len(routes)),
			},
		},
	}, nil
}

// callGetHandlers implements the get_handlers tool
func (s *JSONRPCServer) callGetHandlers(ctx context.Context) (interface{}, error) {
	handlers, err := s.bridge.GetHandlers()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting handlers: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d request handlers", len(handlers)),
			},
		},
	}, nil
}

// callGetServices implements the get_services tool
func (s *JSONRPCServer) callGetServices(ctx context.Context) (interface{}, error) {
	services, err := s.bridge.GetServices()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting services: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d service definitions", len(services)),
			},
		},
	}, nil
}

// callGetInterfaces implements the get_interfaces tool
func (s *JSONRPCServer) callGetInterfaces(ctx context.Context) (interface{}, error) {
	interfaces, err := s.bridge.GetInterfaces()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting interfaces: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d interfaces", len(interfaces)),
			},
		},
	}, nil
}

// callFindImplementations implements the find_implementations tool
func (s *JSONRPCServer) callFindImplementations(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	interfaceName, ok := args["interface"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: interface parameter is required and must be a string",
				},
			},
		}, nil
	}

	implementations, err := s.bridge.FindImplementations(interfaceName)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error finding implementations: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d implementations of interface %s", len(implementations), interfaceName),
			},
		},
	}, nil
}

// callGetCallGraph implements the get_call_graph tool
func (s *JSONRPCServer) callGetCallGraph(ctx context.Context) (interface{}, error) {
	// Default to analyzing the main function - in a real implementation, this could be a parameter
	functionName := "main"
	callGraph, err := s.bridge.GetCallGraph(functionName)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting call graph: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Call graph analysis completed for function: %s", callGraph.FunctionName),
			},
		},
	}, nil
}

// callGetConfig implements the get_config tool
func (s *JSONRPCServer) callGetConfig(ctx context.Context) (interface{}, error) {
	config, err := s.bridge.GetConfig()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting config: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Configuration retrieved: %s", config),
			},
		},
	}, nil
}

// callGetMiddleware implements the get_middleware tool
func (s *JSONRPCServer) callGetMiddleware(ctx context.Context) (interface{}, error) {
	middleware, err := s.bridge.GetMiddleware()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting middleware: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d middleware configurations", len(middleware)),
			},
		},
	}, nil
}

// callGetEnvVars implements the get_env_vars tool
func (s *JSONRPCServer) callGetEnvVars(ctx context.Context) (interface{}, error) {
	envVars, err := s.bridge.GetEnvVars()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting environment variables: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d environment variables", len(envVars)),
			},
		},
	}, nil
}

// callSearchCode implements the search_code tool
func (s *JSONRPCServer) callSearchCode(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	query, ok := args["query"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: query parameter is required and must be a string",
				},
			},
		}, nil
	}

	results, err := s.bridge.SearchCode(query)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error searching code: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d code matches for query: %s", len(results), query),
			},
		},
	}, nil
}

// callGetPackageStructure implements the get_package_structure tool
func (s *JSONRPCServer) callGetPackageStructure(ctx context.Context) (interface{}, error) {
	structure, err := s.bridge.GetPackageStructure()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting package structure: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Package structure analyzed: %s", structure),
			},
		},
	}, nil
}

// callGetDependencies implements the get_dependencies tool
func (s *JSONRPCServer) callGetDependencies(ctx context.Context) (interface{}, error) {
	dependencies, err := s.bridge.GetDependencies()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting dependencies: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d project dependencies", len(dependencies)),
			},
		},
	}, nil
}

// callGetWebSocketEndpoints implements the get_websocket_endpoints tool
func (s *JSONRPCServer) callGetWebSocketEndpoints(ctx context.Context) (interface{}, error) {
	endpoints, err := s.bridge.GetWebSocketEndpoints()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting WebSocket endpoints: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d WebSocket endpoints", len(endpoints)),
			},
		},
	}, nil
}

// callGetWebSocketHandlers implements the get_websocket_handlers tool
func (s *JSONRPCServer) callGetWebSocketHandlers(ctx context.Context) (interface{}, error) {
	handlers, err := s.bridge.GetWebSocketHandlers()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting WebSocket handlers: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d WebSocket handlers", len(handlers)),
			},
		},
	}, nil
}

// callGetWebSocketMessages implements the get_websocket_messages tool
func (s *JSONRPCServer) callGetWebSocketMessages(ctx context.Context) (interface{}, error) {
	messages, err := s.bridge.GetWebSocketMessages()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting WebSocket messages: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d WebSocket message types", len(messages)),
			},
		},
	}, nil
}

// callGetMiddlewareUsage implements the get_middleware_usage tool
func (s *JSONRPCServer) callGetMiddlewareUsage(ctx context.Context) (interface{}, error) {
	usage, err := s.bridge.GetMiddlewareUsage()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting middleware usage: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Middleware usage analysis: %s", usage),
			},
		},
	}, nil
}

// callGetWorkflows implements the get_workflows tool
func (s *JSONRPCServer) callGetWorkflows(ctx context.Context) (interface{}, error) {
	workflows, err := s.bridge.GetWorkflows()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting workflows: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d business workflows", len(workflows)),
			},
		},
	}, nil
}

// callGetBusinessRules implements the get_business_rules tool
func (s *JSONRPCServer) callGetBusinessRules(ctx context.Context) (interface{}, error) {
	rules, err := s.bridge.GetBusinessRules()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting business rules: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d business rules", len(rules)),
			},
		},
	}, nil
}

// callGetFeatureFlags implements the get_feature_flags tool
func (s *JSONRPCServer) callGetFeatureFlags(ctx context.Context) (interface{}, error) {
	flags, err := s.bridge.GetFeatureFlags()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting feature flags: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d feature flags", len(flags)),
			},
		},
	}, nil
}

// callFindByType implements the find_by_type tool
func (s *JSONRPCServer) callFindByType(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	typeName, ok := args["type"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: type parameter is required and must be a string",
				},
			},
		}, nil
	}

	results, err := s.bridge.FindByType(typeName)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error finding by type: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d elements of type %s", len(results), typeName),
			},
		},
	}, nil
}

// callGetReferences implements the get_references tool
func (s *JSONRPCServer) callGetReferences(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	symbol, ok := args["symbol"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: symbol parameter is required and must be a string",
				},
			},
		}, nil
	}

	references, err := s.bridge.GetReferences(symbol, "")
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting references: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d references to symbol %s", len(references), symbol),
			},
		},
	}, nil
}

// callGetChangeImpact implements the get_change_impact tool
func (s *JSONRPCServer) callGetChangeImpact(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	file, ok := args["file"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: file parameter is required and must be a string",
				},
			},
		}, nil
	}

	_, err := s.bridge.GetChangeImpact(file)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error analyzing change impact: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Change impact analysis for %s completed", file),
			},
		},
	}, nil
}

// callSnapshot implements the snapshot tool
func (s *JSONRPCServer) callSnapshot(ctx context.Context) (interface{}, error) {
	snapshot, err := s.bridge.CreateSnapshot("MCP snapshot")
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error creating snapshot: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Codebase snapshot created: %s", snapshot),
			},
		},
	}, nil
}

// callContractDriftCheck implements the contract_drift_check tool
func (s *JSONRPCServer) callContractDriftCheck(ctx context.Context) (interface{}, error) {
	_, err := s.bridge.CheckContractDrift()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error checking contract drift: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": "Contract drift check completed successfully",
			},
		},
	}, nil
}

// callRunTerminalCommand implements the run_terminal_command tool
func (s *JSONRPCServer) callRunTerminalCommand(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	command, ok := args["command"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: command parameter is required and must be a string",
				},
			},
		}, nil
	}

	result, err := s.bridge.RunTerminalCommand(command, s.bridge.BackendPath)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error running terminal command: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Command executed successfully.\nOutput: %s\nError: %s", result.Stdout, result.Stderr),
			},
		},
	}, nil
}
