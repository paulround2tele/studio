package server

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/handlers"
	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/models"
)

// MCPServer represents the MCP server instance
type MCPServer struct {
	handlers map[string]ToolHandler
	ctx      context.Context
	cancel   context.CancelFunc
}

// ToolHandler represents a function that handles a specific tool
type ToolHandler func(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error)

// NewMCPServer creates a new MCP server instance
func NewMCPServer() *MCPServer {
	ctx, cancel := context.WithCancel(context.Background())
	
	server := &MCPServer{
		handlers: make(map[string]ToolHandler),
		ctx:      ctx,
		cancel:   cancel,
	}
	
	// Register all tool handlers
	server.registerHandlers()
	
	return server
}

// registerHandlers registers all available tool handlers
func (s *MCPServer) registerHandlers() {
	// Schema Introspection Tools
	s.handlers["get_models"] = handlers.HandleGetModels
	s.handlers["get_enums"] = handlers.HandleGetEnums
	s.handlers["get_interfaces"] = handlers.HandleGetInterfaces
	s.handlers["search_types"] = handlers.HandleSearchTypes
	
	// API Documentation Tools
	s.handlers["get_endpoints"] = handlers.HandleGetEndpoints
	s.handlers["get_handlers"] = handlers.HandleGetHandlers
	s.handlers["get_middleware"] = handlers.HandleGetMiddleware
	s.handlers["search_api"] = handlers.HandleSearchAPI
	
	// Database Tools
	s.handlers["get_tables"] = handlers.HandleGetTables
	s.handlers["get_migrations"] = handlers.HandleGetMigrations
	s.handlers["get_indexes"] = handlers.HandleGetIndexes
	s.handlers["search_schema"] = handlers.HandleSearchSchema
	
	// Business Logic Tools
	s.handlers["get_services"] = handlers.HandleGetServices
	s.handlers["get_validators"] = handlers.HandleGetValidators
	s.handlers["get_workflows"] = handlers.HandleGetWorkflows
	s.handlers["search_logic"] = handlers.HandleSearchLogic
	
	// Configuration Tools
	s.handlers["get_config"] = handlers.HandleGetConfig
	s.handlers["get_env_vars"] = handlers.HandleGetEnvVars
	s.handlers["get_dependencies"] = handlers.HandleGetDependencies
	
	// Code Navigation Tools
	s.handlers["find_usage"] = handlers.HandleFindUsage
	s.handlers["get_references"] = handlers.HandleGetReferences
	s.handlers["get_call_graph"] = handlers.HandleGetCallGraph
	
	// =============================================================================
	// DOMAIN-SPECIFIC TOOLS (Campaign & Domain Generation)
	// =============================================================================
	s.handlers["get_campaign_types"] = handlers.HandleGetCampaignTypes
	s.handlers["get_pattern_types"] = handlers.HandleGetPatternTypes
	s.handlers["get_campaign_states"] = handlers.HandleGetCampaignStates
	s.handlers["get_domain_validation_rules"] = handlers.HandleGetDomainValidationRules
	s.handlers["analyze_campaign_flow"] = handlers.HandleAnalyzeCampaignFlow
	
	// =============================================================================
	// PERFORMANCE ANALYSIS TOOLS
	// =============================================================================
	s.handlers["get_performance_metrics"] = handlers.HandleGetPerformanceMetrics
	s.handlers["get_concurrency_patterns"] = handlers.HandleGetConcurrencyPatterns
	s.handlers["get_caching_strategies"] = handlers.HandleGetCachingStrategies
	s.handlers["get_optimization_patterns"] = handlers.HandleGetOptimizationPatterns
	s.handlers["analyze_bottlenecks"] = handlers.HandleAnalyzeBottlenecks
	
	// =============================================================================
	// STATE MANAGEMENT & ORCHESTRATION TOOLS
	// =============================================================================
	s.handlers["get_state_machines"] = handlers.HandleGetStateMachines
	s.handlers["get_orchestration_patterns"] = handlers.HandleGetOrchestrationPatterns
	s.handlers["get_job_processing_flows"] = handlers.HandleGetJobProcessingFlows
	s.handlers["get_config_management"] = handlers.HandleGetConfigManagement
	s.handlers["analyze_state_consistency"] = handlers.HandleAnalyzeStateConsistency
	
	// =============================================================================
	// TESTING & QUALITY ASSURANCE TOOLS
	// =============================================================================
	s.handlers["get_test_patterns"] = handlers.HandleGetTestPatterns
	s.handlers["get_test_fixtures"] = handlers.HandleGetTestFixtures
	s.handlers["get_mock_strategies"] = handlers.HandleGetMockStrategies
	s.handlers["analyze_test_coverage"] = handlers.HandleAnalyzeTestCoverage
	s.handlers["get_integration_tests"] = handlers.HandleGetIntegrationTests
	
	// =============================================================================
	// TRANSACTION & DATA MANAGEMENT TOOLS
	// =============================================================================
	s.handlers["get_transaction_patterns"] = handlers.HandleGetTransactionPatterns
	s.handlers["get_connection_pooling"] = handlers.HandleGetConnectionPooling
	s.handlers["get_query_optimization"] = handlers.HandleGetQueryOptimization
	s.handlers["analyze_deadlock_prevention"] = handlers.HandleAnalyzeDeadlockPrevention
	s.handlers["get_migration_strategies"] = handlers.HandleGetMigrationStrategies
	
	// =============================================================================
	// ERROR HANDLING & RESILIENCE TOOLS
	// =============================================================================
	s.handlers["get_error_patterns"] = handlers.HandleGetErrorPatterns
	s.handlers["get_retry_mechanisms"] = handlers.HandleGetRetryMechanisms
	s.handlers["get_circuit_breakers"] = handlers.HandleGetCircuitBreakers
	s.handlers["get_timeout_strategies"] = handlers.HandleGetTimeoutStrategies
	s.handlers["analyze_failure_modes"] = handlers.HandleAnalyzeFailureModes
	
	// =============================================================================
	// ENHANCED SEARCH CAPABILITIES
	// =============================================================================
	s.handlers["search_by_campaign_type"] = handlers.HandleSearchByCampaignType
	s.handlers["search_by_domain_pattern"] = handlers.HandleSearchByDomainPattern
	s.handlers["search_performance_code"] = handlers.HandleSearchPerformanceCode
	s.handlers["search_state_transitions"] = handlers.HandleSearchStateTransitions
	s.handlers["search_error_handling"] = handlers.HandleSearchErrorHandling
}

// Run starts the MCP server and handles incoming requests
func (s *MCPServer) Run() error {
	log.Println("MCP Studio Backend Context Server starting...")
	
	// Send initialization response
	initResponse := map[string]interface{}{
		"protocolVersion": "2024-11-05",
		"capabilities": map[string]interface{}{
			"tools": map[string]interface{}{},
		},
		"serverInfo": map[string]interface{}{
			"name":    "studio-backend-context",
			"version": "1.0.0",
		},
	}
	
	if err := s.sendResponse(nil, initResponse, nil); err != nil {
		return fmt.Errorf("failed to send initialization response: %w", err)
	}
	
	// Start message loop
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		
		if err := s.handleMessage(line); err != nil {
			log.Printf("Error handling message: %v", err)
		}
	}
	
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading stdin: %w", err)
	}
	
	return nil
}

// handleMessage processes an incoming MCP message
func (s *MCPServer) handleMessage(message string) error {
	var request models.MCPRequest
	if err := json.Unmarshal([]byte(message), &request); err != nil {
		return s.sendError(nil, -32700, "Parse error", nil)
	}
	
	switch request.Method {
	case "initialize":
		return s.handleInitialize(&request)
	case "tools/call":
		return s.handleToolCall(&request)
	case "tools/list":
		return s.handleToolsList(&request)
	default:
		return s.sendError(request.ID, -32601, fmt.Sprintf("Method not found: %s", request.Method), nil)
	}
}

// handleInitialize handles the initialize request
func (s *MCPServer) handleInitialize(request *models.MCPRequest) error {
	result := map[string]interface{}{
		"protocolVersion": "2024-11-05",
		"capabilities": map[string]interface{}{
			"tools": map[string]interface{}{},
		},
		"serverInfo": map[string]interface{}{
			"name":    "studio-backend-context",
			"version": "1.0.0",
		},
	}
	
	return s.sendResponse(request.ID, result, nil)
}

// handleToolsList handles the tools/list request
func (s *MCPServer) handleToolsList(request *models.MCPRequest) error {
	tools := []map[string]interface{}{
		{
			"name":        "get_models",
			"description": "Return all data models with their fields, types, and validation tags",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter models",
					},
					"package": map[string]interface{}{
						"type":        "string",
						"description": "Optional package name to filter models",
					},
				},
			},
		},
		{
			"name":        "get_enums",
			"description": "Return all enum types and their possible values",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter enums",
					},
				},
			},
		},
		{
			"name":        "get_interfaces",
			"description": "Return all interface definitions and their methods",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter interfaces",
					},
				},
			},
		},
		{
			"name":        "search_types",
			"description": "Search for specific types or fields by name/pattern",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{
						"type":        "string",
						"description": "Search query for type or field names",
					},
					"type": map[string]interface{}{
						"type":        "string",
						"description": "Type of search: 'struct', 'interface', 'enum', 'field'",
					},
				},
				"required": []string{"query"},
			},
		},
		{
			"name":        "get_endpoints",
			"description": "Return all REST API endpoints with methods, paths, and handlers",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"method": map[string]interface{}{
						"type":        "string",
						"description": "Optional HTTP method filter",
					},
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Optional path pattern filter",
					},
				},
			},
		},
		{
			"name":        "get_handlers",
			"description": "Return handler function signatures and their business logic",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter handlers",
					},
				},
			},
		},
		{
			"name":        "get_middleware",
			"description": "Return middleware functions and their purposes",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter middleware",
					},
				},
			},
		},
		{
			"name":        "search_api",
			"description": "Search API endpoints by path, method, or functionality",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{
						"type":        "string",
						"description": "Search query for API endpoints",
					},
				},
				"required": []string{"query"},
			},
		},
		{
			"name":        "get_tables",
			"description": "Return database table structures and relationships",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter tables",
					},
				},
			},
		},
		{
			"name":        "get_migrations",
			"description": "Return migration history and schema changes",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"limit": map[string]interface{}{
						"type":        "integer",
						"description": "Optional limit on number of migrations to return",
					},
				},
			},
		},
		{
			"name":        "get_indexes",
			"description": "Return database indexes and constraints",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"table": map[string]interface{}{
						"type":        "string",
						"description": "Optional table name to filter indexes",
					},
				},
			},
		},
		{
			"name":        "search_schema",
			"description": "Search database schema by table/column names",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{
						"type":        "string",
						"description": "Search query for schema elements",
					},
				},
				"required": []string{"query"},
			},
		},
		{
			"name":        "get_services",
			"description": "Return service layer functions and their purposes",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter services",
					},
				},
			},
		},
		{
			"name":        "get_validators",
			"description": "Return validation rules and business constraints",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter validators",
					},
				},
			},
		},
		{
			"name":        "get_workflows",
			"description": "Return campaign workflows and state transitions",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"type": map[string]interface{}{
						"type":        "string",
						"description": "Optional workflow type filter",
					},
				},
			},
		},
		{
			"name":        "search_logic",
			"description": "Search business logic by functionality",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{
						"type":        "string",
						"description": "Search query for business logic",
					},
				},
				"required": []string{"query"},
			},
		},
		{
			"name":        "get_config",
			"description": "Return configuration structures and their documentation",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter configurations",
					},
				},
			},
		},
		{
			"name":        "get_env_vars",
			"description": "Return environment variables and their purposes",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"pattern": map[string]interface{}{
						"type":        "string",
						"description": "Optional pattern to filter environment variables",
					},
				},
			},
		},
		{
			"name":        "get_dependencies",
			"description": "Return Go module dependencies and their versions",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"type": map[string]interface{}{
						"type":        "string",
						"description": "Optional dependency type filter: 'direct' or 'indirect'",
					},
				},
			},
		},
		{
			"name":        "find_usage",
			"description": "Find where specific types/functions are used",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Name of the type or function to find usage for",
					},
					"type": map[string]interface{}{
						"type":        "string",
						"description": "Type of element: 'type', 'function', 'variable'",
					},
				},
				"required": []string{"name"},
			},
		},
		{
			"name":        "get_references",
			"description": "Get cross-references between components",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"component": map[string]interface{}{
						"type":        "string",
						"description": "Component name to get references for",
					},
				},
				"required": []string{"component"},
			},
		},
		{
			"name":        "get_call_graph",
			"description": "Get function call relationships",
			"inputSchema": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"function": map[string]interface{}{
						"type":        "string",
						"description": "Function name to get call graph for",
					},
					"depth": map[string]interface{}{
						"type":        "integer",
						"description": "Maximum depth for call graph analysis",
					},
				},
				"required": []string{"function"},
			},
		},
	}
	
	result := map[string]interface{}{
		"tools": tools,
	}
	
	return s.sendResponse(request.ID, result, nil)
}

// handleToolCall handles a tool call request
func (s *MCPServer) handleToolCall(request *models.MCPRequest) error {
	// Parse tool call parameters
	params, ok := request.Params.(map[string]interface{})
	if !ok {
		return s.sendError(request.ID, -32602, "Invalid params", nil)
	}
	
	name, ok := params["name"].(string)
	if !ok {
		return s.sendError(request.ID, -32602, "Missing tool name", nil)
	}
	
	arguments, _ := params["arguments"].(map[string]interface{})
	
	// Find and execute the tool handler
	handler, exists := s.handlers[name]
	if !exists {
		return s.sendError(request.ID, -32601, fmt.Sprintf("Tool not found: %s", name), nil)
	}
	
	toolRequest := &models.ToolRequest{
		Name:      name,
		Arguments: arguments,
	}
	
	response, err := handler(s.ctx, toolRequest)
	if err != nil {
		return s.sendError(request.ID, -32000, fmt.Sprintf("Tool execution error: %v", err), nil)
	}
	
	return s.sendResponse(request.ID, response, nil)
}

// sendResponse sends a successful response
func (s *MCPServer) sendResponse(id interface{}, result interface{}, error *models.MCPError) error {
	response := models.MCPResponse{
		JSONRPC: "2.0",
		ID:      id,
		Result:  result,
		Error:   error,
	}
	
	return s.writeMessage(response)
}

// sendError sends an error response
func (s *MCPServer) sendError(id interface{}, code int, message string, data interface{}) error {
	error := &models.MCPError{
		Code:    code,
		Message: message,
		Data:    data,
	}
	
	return s.sendResponse(id, nil, error)
}

// writeMessage writes a message to stdout
func (s *MCPServer) writeMessage(message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}
	
	if _, err := io.WriteString(os.Stdout, string(data)+"\n"); err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}
	
	return nil
}

// Stop gracefully stops the MCP server
func (s *MCPServer) Stop() {
	log.Println("Stopping MCP Studio Backend Context Server...")
	s.cancel()
}