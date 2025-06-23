package bridge

import (
	"fmt"
	"log"

	"github.com/fntelecomllc/studio/mcp-server/internal/config"
)

// MCPBridge provides a safe public API interface that prevents internal package leaks
// This implements the Bridge Pattern to isolate internal implementation details
type MCPBridge struct {
	config *config.Config
	
	// Private internal components - not exposed
	schemaService  schemaServiceInterface
	apiService     apiServiceInterface
	serviceService serviceServiceInterface
	businessService businessServiceInterface
	configService  configServiceInterface
	navService     navigationServiceInterface
}

// Tool represents an MCP tool definition
type Tool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"input_schema"`
}

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

// Public interfaces that hide internal implementations
type schemaServiceInterface interface {
	GetModels() (*ToolResult, error)
	GetDatabaseSchema() (*ToolResult, error)
	GetAPISchema() (*ToolResult, error)
}

type apiServiceInterface interface {
	GetEndpoints() (*ToolResult, error)
	GetRoutes() (*ToolResult, error)
	GetMiddleware() (*ToolResult, error)
}

type serviceServiceInterface interface {
	GetServices() (*ToolResult, error)
	GetDependencies() (*ToolResult, error)
	GetCallGraph() (*ToolResult, error)
}

type businessServiceInterface interface {
	GetWorkflows() (*ToolResult, error)
	GetBusinessRules() (*ToolResult, error)
	GetHandlers() (*ToolResult, error)
}

type configServiceInterface interface {
	GetEnvVars() (*ToolResult, error)
	GetConfig() (*ToolResult, error)
	GetFeatureFlags() (*ToolResult, error)
}

type navigationServiceInterface interface {
	FindByType(typeName string) (*ToolResult, error)
	SearchCode(query string) (*ToolResult, error)
	GetPackageStructure() (*ToolResult, error)
}

// NewMCPBridge creates a new MCP bridge with internal services
func NewMCPBridge(cfg *config.Config) (*MCPBridge, error) {
	bridge := &MCPBridge{
		config: cfg,
	}

	// Initialize internal services through the bridge
	if err := bridge.initializeServices(); err != nil {
		return nil, fmt.Errorf("failed to initialize services: %w", err)
	}

	return bridge, nil
}

// GetAvailableTools returns the list of available MCP tools
func (b *MCPBridge) GetAvailableTools() []Tool {
	tools := make([]Tool, 0)

	// Schema Tools
	if b.config.Tools.EnableSchemaTools {
		tools = append(tools, []Tool{
			{
				Name:        "get_models",
				Description: "Get database models and entity definitions from the codebase",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"include_fields": map[string]interface{}{
							"type":        "boolean",
							"description": "Include field definitions in the output",
							"default":     true,
						},
						"include_relationships": map[string]interface{}{
							"type":        "boolean", 
							"description": "Include relationship mappings",
							"default":     true,
						},
					},
				},
			},
			{
				Name:        "get_database_schema",
				Description: "Extract database schema information including tables, columns, and constraints",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"table_name": map[string]interface{}{
							"type":        "string",
							"description": "Specific table name to analyze (optional)",
						},
						"include_indexes": map[string]interface{}{
							"type":        "boolean",
							"description": "Include index information",
							"default":     true,
						},
					},
				},
			},
			{
				Name:        "get_api_schema",
				Description: "Get API schema definitions including OpenAPI specs and route definitions",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"format": map[string]interface{}{
							"type":        "string",
							"enum":        []string{"openapi", "json", "yaml"},
							"description": "Output format for the schema",
							"default":     "json",
						},
					},
				},
			},
		}...)
	}

	// API Tools
	if b.config.Tools.EnableAPITools {
		tools = append(tools, []Tool{
			{
				Name:        "get_endpoints",
				Description: "List all API endpoints with their HTTP methods and handler functions",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"method": map[string]interface{}{
							"type":        "string",
							"description": "Filter by HTTP method (GET, POST, PUT, DELETE, etc.)",
						},
						"path_pattern": map[string]interface{}{
							"type":        "string",
							"description": "Filter by path pattern (supports wildcards)",
						},
					},
				},
			},
			{
				Name:        "get_routes",
				Description: "Get detailed route information including middleware chain and parameter definitions",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"include_middleware": map[string]interface{}{
							"type":        "boolean",
							"description": "Include middleware chain information",
							"default":     true,
						},
					},
				},
			},
			{
				Name:        "get_middleware",
				Description: "Analyze middleware components and their execution order",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"trace_execution": map[string]interface{}{
							"type":        "boolean",
							"description": "Trace middleware execution paths",
							"default":     false,
						},
					},
				},
			},
		}...)
	}

	// Service Tools
	if b.config.Tools.EnableServiceTools {
		tools = append(tools, []Tool{
			{
				Name:        "get_services",
				Description: "List all services in the codebase with their interfaces and implementations",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"include_methods": map[string]interface{}{
							"type":        "boolean",
							"description": "Include method signatures",
							"default":     true,
						},
						"service_type": map[string]interface{}{
							"type":        "string",
							"description": "Filter by service type or pattern",
						},
					},
				},
			},
			{
				Name:        "get_dependencies",
				Description: "Analyze service dependencies and injection patterns",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"service_name": map[string]interface{}{
							"type":        "string",
							"description": "Specific service to analyze dependencies for",
						},
						"depth": map[string]interface{}{
							"type":        "integer",
							"description": "Dependency analysis depth",
							"default":     3,
						},
					},
				},
			},
			{
				Name:        "get_call_graph",
				Description: "Generate call graph showing function and method relationships",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"entry_point": map[string]interface{}{
							"type":        "string",
							"description": "Starting point for call graph analysis",
						},
						"max_depth": map[string]interface{}{
							"type":        "integer",
							"description": "Maximum depth for call graph traversal",
							"default":     5,
						},
					},
				},
			},
		}...)
	}

	// Business Logic Tools
	if b.config.Tools.EnableBusinessLogicTools {
		tools = append(tools, []Tool{
			{
				Name:        "get_workflows",
				Description: "Identify business workflows and process flows in the codebase",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"workflow_type": map[string]interface{}{
							"type":        "string",
							"description": "Type of workflow to analyze (e.g., 'campaign', 'domain', 'user')",
						},
					},
				},
			},
			{
				Name:        "get_business_rules",
				Description: "Extract business rules and validation logic from the codebase",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"domain": map[string]interface{}{
							"type":        "string",
							"description": "Business domain to focus on",
						},
					},
				},
			},
			{
				Name:        "get_handlers",
				Description: "List request handlers and their business logic implementations",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"handler_type": map[string]interface{}{
							"type":        "string",
							"description": "Type of handler (HTTP, WebSocket, etc.)",
						},
					},
				},
			},
		}...)
	}

	// Configuration Tools  
	if b.config.Tools.EnableConfigurationTools {
		tools = append(tools, []Tool{
			{
				Name:        "get_env_vars",
				Description: "List environment variables used throughout the codebase",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"include_defaults": map[string]interface{}{
							"type":        "boolean",
							"description": "Include default values",
							"default":     true,
						},
					},
				},
			},
			{
				Name:        "get_config",
				Description: "Get configuration structure and settings from config files",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"config_type": map[string]interface{}{
							"type":        "string",
							"description": "Type of configuration (app, database, security, etc.)",
						},
					},
				},
			},
			{
				Name:        "get_feature_flags",
				Description: "Identify feature flags and conditional logic in the codebase",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"include_conditions": map[string]interface{}{
							"type":        "boolean",
							"description": "Include flag condition logic",
							"default":     true,
						},
					},
				},
			},
		}...)
	}

	// Navigation Tools
	if b.config.Tools.EnableNavigationTools {
		tools = append(tools, []Tool{
			{
				Name:        "find_by_type",
				Description: "Find code elements by type (structs, interfaces, functions, etc.)",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"type_name": map[string]interface{}{
							"type":        "string",
							"description": "Name or pattern of the type to find",
							"required":    true,
						},
						"include_methods": map[string]interface{}{
							"type":        "boolean",
							"description": "Include methods for found types",
							"default":     false,
						},
					},
					"required": []string{"type_name"},
				},
			},
			{
				Name:        "search_code",
				Description: "Search for code patterns, functions, or text across the codebase",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"query": map[string]interface{}{
							"type":        "string",
							"description": "Search query (supports regex)",
							"required":    true,
						},
						"case_sensitive": map[string]interface{}{
							"type":        "boolean",
							"description": "Case sensitive search",
							"default":     false,
						},
						"file_pattern": map[string]interface{}{
							"type":        "string",
							"description": "File pattern to search within",
						},
					},
					"required": []string{"query"},
				},
			},
			{
				Name:        "get_package_structure",
				Description: "Get the package structure and organization of the codebase",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"depth": map[string]interface{}{
							"type":        "integer",
							"description": "Directory depth to analyze",
							"default":     3,
						},
						"include_files": map[string]interface{}{
							"type":        "boolean",
							"description": "Include file listings",
							"default":     false,
						},
					},
				},
			},
		}...)
	}

	return tools
}

// ExecuteTool executes a specific MCP tool with the given arguments
func (b *MCPBridge) ExecuteTool(toolName string, args map[string]interface{}) (*ToolResult, error) {
	switch toolName {
	// Schema Tools
	case "get_models":
		if !b.config.Tools.EnableSchemaTools {
			return nil, fmt.Errorf("schema tools are disabled")
		}
		return b.schemaService.GetModels()
	case "get_database_schema":
		if !b.config.Tools.EnableSchemaTools {
			return nil, fmt.Errorf("schema tools are disabled")
		}
		return b.schemaService.GetDatabaseSchema()
	case "get_api_schema":
		if !b.config.Tools.EnableSchemaTools {
			return nil, fmt.Errorf("schema tools are disabled")
		}
		return b.schemaService.GetAPISchema()

	// API Tools
	case "get_endpoints":
		if !b.config.Tools.EnableAPITools {
			return nil, fmt.Errorf("API tools are disabled")
		}
		return b.apiService.GetEndpoints()
	case "get_routes":
		if !b.config.Tools.EnableAPITools {
			return nil, fmt.Errorf("API tools are disabled")
		}
		return b.apiService.GetRoutes()
	case "get_middleware":
		if !b.config.Tools.EnableAPITools {
			return nil, fmt.Errorf("API tools are disabled")
		}
		return b.apiService.GetMiddleware()

	// Service Tools
	case "get_services":
		if !b.config.Tools.EnableServiceTools {
			return nil, fmt.Errorf("service tools are disabled")
		}
		return b.serviceService.GetServices()
	case "get_dependencies":
		if !b.config.Tools.EnableServiceTools {
			return nil, fmt.Errorf("service tools are disabled")
		}
		return b.serviceService.GetDependencies()
	case "get_call_graph":
		if !b.config.Tools.EnableServiceTools {
			return nil, fmt.Errorf("service tools are disabled")
		}
		return b.serviceService.GetCallGraph()

	// Business Logic Tools
	case "get_workflows":
		if !b.config.Tools.EnableBusinessLogicTools {
			return nil, fmt.Errorf("business logic tools are disabled")
		}
		return b.businessService.GetWorkflows()
	case "get_business_rules":
		if !b.config.Tools.EnableBusinessLogicTools {
			return nil, fmt.Errorf("business logic tools are disabled")
		}
		return b.businessService.GetBusinessRules()
	case "get_handlers":
		if !b.config.Tools.EnableBusinessLogicTools {
			return nil, fmt.Errorf("business logic tools are disabled")
		}
		return b.businessService.GetHandlers()

	// Configuration Tools
	case "get_env_vars":
		if !b.config.Tools.EnableConfigurationTools {
			return nil, fmt.Errorf("configuration tools are disabled")
		}
		return b.configService.GetEnvVars()
	case "get_config":
		if !b.config.Tools.EnableConfigurationTools {
			return nil, fmt.Errorf("configuration tools are disabled")
		}
		return b.configService.GetConfig()
	case "get_feature_flags":
		if !b.config.Tools.EnableConfigurationTools {
			return nil, fmt.Errorf("configuration tools are disabled")
		}
		return b.configService.GetFeatureFlags()

	// Navigation Tools
	case "find_by_type":
		if !b.config.Tools.EnableNavigationTools {
			return nil, fmt.Errorf("navigation tools are disabled")
		}
		typeName, ok := args["type_name"].(string)
		if !ok {
			return nil, fmt.Errorf("type_name parameter is required")
		}
		return b.navService.FindByType(typeName)
	case "search_code":
		if !b.config.Tools.EnableNavigationTools {
			return nil, fmt.Errorf("navigation tools are disabled")
		}
		query, ok := args["query"].(string)
		if !ok {
			return nil, fmt.Errorf("query parameter is required")
		}
		return b.navService.SearchCode(query)
	case "get_package_structure":
		if !b.config.Tools.EnableNavigationTools {
			return nil, fmt.Errorf("navigation tools are disabled")
		}
		return b.navService.GetPackageStructure()

	default:
		return nil, fmt.Errorf("unknown tool: %s", toolName)
	}
}

// Close cleans up bridge resources
func (b *MCPBridge) Close() error {
	log.Println("Cleaning up MCP bridge resources...")
	// Add any cleanup logic here
	return nil
}

// initializeServices initializes all internal services
// This method keeps the internal service creation logic private
func (b *MCPBridge) initializeServices() error {
	// Initialize services here - implementation will be added as we create the services
	log.Printf("Initializing MCP bridge services with backend path: %s", b.config.BackendPath)
	
	// TODO: Initialize actual service implementations
	// For now, create placeholder implementations
	b.schemaService = &placeholderSchemaService{}
	b.apiService = &placeholderAPIService{}
	b.serviceService = &placeholderServiceService{}
	b.businessService = &placeholderBusinessService{}
	b.configService = &placeholderConfigService{}
	b.navService = &placeholderNavigationService{}
	
	return nil
}

// Placeholder implementations - these will be replaced with real implementations
type placeholderSchemaService struct{}
func (s *placeholderSchemaService) GetModels() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Schema service not yet implemented"}},
	}, nil
}
func (s *placeholderSchemaService) GetDatabaseSchema() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Database schema service not yet implemented"}},
	}, nil
}
func (s *placeholderSchemaService) GetAPISchema() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "API schema service not yet implemented"}},
	}, nil
}

type placeholderAPIService struct{}
func (s *placeholderAPIService) GetEndpoints() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "API endpoints service not yet implemented"}},
	}, nil
}
func (s *placeholderAPIService) GetRoutes() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Routes service not yet implemented"}},
	}, nil
}
func (s *placeholderAPIService) GetMiddleware() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Middleware service not yet implemented"}},
	}, nil
}

type placeholderServiceService struct{}
func (s *placeholderServiceService) GetServices() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Services analysis not yet implemented"}},
	}, nil
}
func (s *placeholderServiceService) GetDependencies() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Dependencies analysis not yet implemented"}},
	}, nil
}
func (s *placeholderServiceService) GetCallGraph() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Call graph analysis not yet implemented"}},
	}, nil
}

type placeholderBusinessService struct{}
func (s *placeholderBusinessService) GetWorkflows() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Workflow analysis not yet implemented"}},
	}, nil
}
func (s *placeholderBusinessService) GetBusinessRules() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Business rules analysis not yet implemented"}},
	}, nil
}
func (s *placeholderBusinessService) GetHandlers() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Handlers analysis not yet implemented"}},
	}, nil
}

type placeholderConfigService struct{}
func (s *placeholderConfigService) GetEnvVars() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Environment variables analysis not yet implemented"}},
	}, nil
}
func (s *placeholderConfigService) GetConfig() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Configuration analysis not yet implemented"}},
	}, nil
}
func (s *placeholderConfigService) GetFeatureFlags() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Feature flags analysis not yet implemented"}},
	}, nil
}

type placeholderNavigationService struct{}
func (s *placeholderNavigationService) FindByType(typeName string) (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: fmt.Sprintf("Type search for '%s' not yet implemented", typeName)}},
	}, nil
}
func (s *placeholderNavigationService) SearchCode(query string) (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: fmt.Sprintf("Code search for '%s' not yet implemented", query)}},
	}, nil
}
func (s *placeholderNavigationService) GetPackageStructure() (*ToolResult, error) {
	return &ToolResult{
		Content: []ContentBlock{{Type: "text", Text: "Package structure analysis not yet implemented"}},
	}, nil
}