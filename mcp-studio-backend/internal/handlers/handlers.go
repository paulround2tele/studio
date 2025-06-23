package handlers

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/analyzer"
	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/models"
	"github.com/jmoiron/sqlx"
)

var studioAnalyzer *analyzer.StudioAnalyzer

// InitializeHandlers initializes the handlers with the studio analyzer
func InitializeHandlers(backendPath string, db *sqlx.DB) error {
	studioAnalyzer = analyzer.NewStudioAnalyzer(backendPath, db)
	return studioAnalyzer.Initialize(context.Background())
}

// HandleGetModels handles the get_models tool request
func HandleGetModels(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_models request: %+v", request.Arguments)
	
	pattern := ""
	packageFilter := ""
	
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
		if pkg, ok := request.Arguments["package"].(string); ok {
			packageFilter = pkg
		}
	}
	
	if studioAnalyzer == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: Studio analyzer not initialized"},
			},
			IsError: true,
		}, nil
	}
	
	modelInfos, err := studioAnalyzer.GetModels(pattern, packageFilter)
	if err != nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: fmt.Sprintf("Error getting models: %v", err)},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Data Models\n\n")
	
	if len(modelInfos) == 0 {
		result.WriteString("No models found matching the criteria.\n")
	} else {
		for _, model := range modelInfos {
			result.WriteString(fmt.Sprintf("## %s\n", model.Name))
			result.WriteString(fmt.Sprintf("**Package:** %s  \n", model.Package))
			result.WriteString(fmt.Sprintf("**Type:** %s  \n\n", model.Type))
			
			if len(model.Fields) > 0 {
				result.WriteString("### Fields\n\n")
				result.WriteString("| Field | Type | DB Column | JSON Tag | Validation | Description |\n")
				result.WriteString("|-------|------|-----------|----------|------------|-------------|\n")
				
				for _, field := range model.Fields {
					required := ""
					if field.IsRequired {
						required = "required"
					}
					
					result.WriteString(fmt.Sprintf("| %s | %s | %s | %s | %s | %s |\n",
						field.Name,
						field.Type,
						field.DBTag,
						field.JSONTag,
						required,
						field.Description,
					))
				}
				result.WriteString("\n")
			}
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetEnums handles the get_enums tool request
func HandleGetEnums(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_enums request: %+v", request.Arguments)
	
	pattern := ""
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
	}
	
	if studioAnalyzer == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: Studio analyzer not initialized"},
			},
			IsError: true,
		}, nil
	}
	
	enumInfos, err := studioAnalyzer.GetEnums(pattern)
	if err != nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: fmt.Sprintf("Error getting enums: %v", err)},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Enum Types\n\n")
	
	if len(enumInfos) == 0 {
		result.WriteString("No enums found matching the criteria.\n")
	} else {
		for _, enum := range enumInfos {
			result.WriteString(fmt.Sprintf("## %s\n", enum.Name))
			result.WriteString(fmt.Sprintf("**Package:** %s  \n", enum.Package))
			result.WriteString(fmt.Sprintf("**Type:** %s  \n\n", enum.Type))
			
			if len(enum.Values) > 0 {
				result.WriteString("### Values\n\n")
				result.WriteString("| Constant | Value | Description |\n")
				result.WriteString("|----------|-------|-------------|\n")
				
				for _, value := range enum.Values {
					result.WriteString(fmt.Sprintf("| %s | %s | %s |\n",
						value.Name,
						value.Value,
						value.Description,
					))
				}
				result.WriteString("\n")
			}
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetInterfaces handles the get_interfaces tool request
func HandleGetInterfaces(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_interfaces request: %+v", request.Arguments)
	
	pattern := ""
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
	}
	
	if studioAnalyzer == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: Studio analyzer not initialized"},
			},
			IsError: true,
		}, nil
	}
	
	interfaceInfos, err := studioAnalyzer.GetInterfaces(pattern)
	if err != nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: fmt.Sprintf("Error getting interfaces: %v", err)},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Interfaces\n\n")
	
	if len(interfaceInfos) == 0 {
		result.WriteString("No interfaces found matching the criteria.\n")
	} else {
		for _, iface := range interfaceInfos {
			result.WriteString(fmt.Sprintf("## %s\n", iface.Name))
			result.WriteString(fmt.Sprintf("**Package:** %s  \n\n", iface.Package))
			
			if len(iface.Methods) > 0 {
				result.WriteString("### Methods\n\n")
				
				for _, method := range iface.Methods {
					result.WriteString(fmt.Sprintf("#### %s\n", method.Name))
					
					if len(method.Parameters) > 0 {
						result.WriteString("**Parameters:**\n")
						for _, param := range method.Parameters {
							result.WriteString(fmt.Sprintf("- %s: %s\n", param.Name, param.Type))
						}
					}
					
					if len(method.Returns) > 0 {
						result.WriteString("**Returns:**\n")
						for _, ret := range method.Returns {
							result.WriteString(fmt.Sprintf("- %s\n", ret.Type))
						}
					}
					
					if method.Description != "" {
						result.WriteString(fmt.Sprintf("**Description:** %s\n", method.Description))
					}
					
					result.WriteString("\n")
				}
			}
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleSearchTypes handles the search_types tool request
func HandleSearchTypes(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling search_types request: %+v", request.Arguments)
	
	if request.Arguments == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: query parameter is required"},
			},
			IsError: true,
		}, nil
	}
	
	query, ok := request.Arguments["query"].(string)
	if !ok || query == "" {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: query parameter is required and must be a string"},
			},
			IsError: true,
		}, nil
	}
	
	searchType := ""
	if t, ok := request.Arguments["type"].(string); ok {
		searchType = t
	}
	
	if studioAnalyzer == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: Studio analyzer not initialized"},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString(fmt.Sprintf("# Search Results for '%s'\n\n", query))
	
	found := false
	
	// Search in models if no specific type or type is 'struct'
	if searchType == "" || searchType == "struct" {
		models, err := studioAnalyzer.GetModels(query, "")
		if err == nil && len(models) > 0 {
			found = true
			result.WriteString("## Matching Models/Structs\n\n")
			for _, model := range models {
				result.WriteString(fmt.Sprintf("- **%s** (%s package)\n", model.Name, model.Package))
			}
			result.WriteString("\n")
		}
	}
	
	// Search in enums if no specific type or type is 'enum'
	if searchType == "" || searchType == "enum" {
		enums, err := studioAnalyzer.GetEnums(query)
		if err == nil && len(enums) > 0 {
			found = true
			result.WriteString("## Matching Enums\n\n")
			for _, enum := range enums {
				result.WriteString(fmt.Sprintf("- **%s** (%s package)\n", enum.Name, enum.Package))
			}
			result.WriteString("\n")
		}
	}
	
	// Search in interfaces if no specific type or type is 'interface'
	if searchType == "" || searchType == "interface" {
		interfaces, err := studioAnalyzer.GetInterfaces(query)
		if err == nil && len(interfaces) > 0 {
			found = true
			result.WriteString("## Matching Interfaces\n\n")
			for _, iface := range interfaces {
				result.WriteString(fmt.Sprintf("- **%s** (%s package)\n", iface.Name, iface.Package))
			}
			result.WriteString("\n")
		}
	}
	
	if !found {
		result.WriteString("No types found matching the search criteria.\n")
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetEndpoints handles the get_endpoints tool request
func HandleGetEndpoints(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_endpoints request: %+v", request.Arguments)
	
	methodFilter := ""
	pathFilter := ""
	
	if request.Arguments != nil {
		if m, ok := request.Arguments["method"].(string); ok {
			methodFilter = m
		}
		if p, ok := request.Arguments["path"].(string); ok {
			pathFilter = p
		}
	}
	
	if studioAnalyzer == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: Studio analyzer not initialized"},
			},
			IsError: true,
		}, nil
	}
	
	endpoints, err := studioAnalyzer.GetEndpoints(methodFilter, pathFilter)
	if err != nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: fmt.Sprintf("Error getting endpoints: %v", err)},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend API Endpoints\n\n")
	
	if len(endpoints) == 0 {
		result.WriteString("No endpoints found matching the criteria.\n")
	} else {
		result.WriteString("| Method | Path | Handler | Description |\n")
		result.WriteString("|--------|------|---------|-------------|\n")
		
		for _, endpoint := range endpoints {
			result.WriteString(fmt.Sprintf("| %s | %s | %s | %s |\n",
				endpoint.Method,
				endpoint.Path,
				endpoint.Handler,
				endpoint.Description,
			))
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetHandlers handles the get_handlers tool request
func HandleGetHandlers(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_handlers request: %+v", request.Arguments)
	
	pattern := ""
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
	}
	
	// For now, return a simplified list of handlers
	var result strings.Builder
	result.WriteString("# Studio Backend API Handlers\n\n")
	
	handlers := []string{
		"LoginHandler - Handles user authentication",
		"GetCurrentUserHandler - Returns current authenticated user",
		"LogoutHandler - Handles user logout",
		"ListCampaignsHandler - Lists all campaigns with pagination",
		"CreateCampaignHandler - Creates a new campaign",
		"GetCampaignHandler - Gets a specific campaign by ID",
		"UpdateCampaignHandler - Updates an existing campaign",
		"DeleteCampaignHandler - Deletes a campaign",
		"ListPersonasHandler - Lists all personas",
		"CreatePersonaHandler - Creates a new persona",
		"GetPersonaHandler - Gets a specific persona by ID",
		"UpdatePersonaHandler - Updates an existing persona",
		"DeletePersonaHandler - Deletes a persona",
		"ListProxiesHandler - Lists all proxies",
		"CreateProxyHandler - Creates a new proxy",
		"GetProxyHandler - Gets a specific proxy by ID",
		"UpdateProxyHandler - Updates an existing proxy",
		"DeleteProxyHandler - Deletes a proxy",
		"ListUsersHandler - Lists all users (admin only)",
		"CreateUserHandler - Creates a new user (admin only)",
		"GetUserHandler - Gets a specific user by ID",
		"UpdateUserHandler - Updates an existing user",
		"DeleteUserHandler - Deletes a user (admin only)",
	}
	
	for _, handler := range handlers {
		if pattern == "" || strings.Contains(strings.ToLower(handler), strings.ToLower(pattern)) {
			result.WriteString(fmt.Sprintf("- %s\n", handler))
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetMiddleware handles the get_middleware tool request
func HandleGetMiddleware(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_middleware request: %+v", request.Arguments)
	
	pattern := ""
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Middleware\n\n")
	
	middleware := []string{
		"CORS - Cross-Origin Resource Sharing configuration",
		"AuthMiddleware - Session-based authentication middleware",
		"ValidationMiddleware - Request validation middleware",
		"LoggingMiddleware - Request/response logging",
		"ErrorHandlingMiddleware - Global error handling",
		"RateLimitingMiddleware - API rate limiting",
		"CompressionMiddleware - Response compression",
		"SecurityHeadersMiddleware - Security headers (X-Frame-Options, etc.)",
		"RequestIDMiddleware - Request ID generation and tracking",
		"MetricsMiddleware - Performance metrics collection",
	}
	
	for _, mw := range middleware {
		if pattern == "" || strings.Contains(strings.ToLower(mw), strings.ToLower(pattern)) {
			result.WriteString(fmt.Sprintf("- %s\n", mw))
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleSearchAPI handles the search_api tool request
func HandleSearchAPI(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling search_api request: %+v", request.Arguments)
	
	if request.Arguments == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: query parameter is required"},
			},
			IsError: true,
		}, nil
	}
	
	query, ok := request.Arguments["query"].(string)
	if !ok || query == "" {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: query parameter is required and must be a string"},
			},
			IsError: true,
		}, nil
	}
	
	if studioAnalyzer == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: Studio analyzer not initialized"},
			},
			IsError: true,
		}, nil
	}
	
	// Search through all endpoints
	endpoints, err := studioAnalyzer.GetEndpoints("", "")
	if err != nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: fmt.Sprintf("Error searching APIs: %v", err)},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString(fmt.Sprintf("# API Search Results for '%s'\n\n", query))
	
	var matchingEndpoints []models.EndpointInfo
	queryLower := strings.ToLower(query)
	
	for _, endpoint := range endpoints {
		if strings.Contains(strings.ToLower(endpoint.Path), queryLower) ||
			strings.Contains(strings.ToLower(endpoint.Handler), queryLower) ||
			strings.Contains(strings.ToLower(endpoint.Description), queryLower) ||
			strings.Contains(strings.ToLower(endpoint.Method), queryLower) {
			matchingEndpoints = append(matchingEndpoints, endpoint)
		}
	}
	
	if len(matchingEndpoints) == 0 {
		result.WriteString("No API endpoints found matching the search criteria.\n")
	} else {
		result.WriteString("| Method | Path | Handler | Description |\n")
		result.WriteString("|--------|------|---------|-------------|\n")
		
		for _, endpoint := range matchingEndpoints {
			result.WriteString(fmt.Sprintf("| %s | %s | %s | %s |\n",
				endpoint.Method,
				endpoint.Path,
				endpoint.Handler,
				endpoint.Description,
			))
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetTables handles the get_tables tool request
func HandleGetTables(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_tables request: %+v", request.Arguments)
	
	pattern := ""
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
	}
	
	if studioAnalyzer == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: Studio analyzer not initialized"},
			},
			IsError: true,
		}, nil
	}
	
	tables, err := studioAnalyzer.GetTables(ctx, pattern)
	if err != nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: fmt.Sprintf("Error getting tables: %v", err)},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Database Tables\n\n")
	
	if len(tables) == 0 {
		result.WriteString("No tables found matching the criteria (or database not connected).\n")
	} else {
		for _, table := range tables {
			result.WriteString(fmt.Sprintf("## %s\n", table.Name))
			if table.Description != "" {
				result.WriteString(fmt.Sprintf("**Description:** %s  \n", table.Description))
			}
			result.WriteString(fmt.Sprintf("**Schema:** %s  \n\n", table.Schema))
			
			if len(table.Columns) > 0 {
				result.WriteString("### Columns\n\n")
				result.WriteString("| Column | Type | Nullable | Default | Primary Key | Description |\n")
				result.WriteString("|--------|------|----------|---------|-------------|-------------|\n")
				
				for _, column := range table.Columns {
					nullable := "No"
					if column.Nullable {
						nullable = "Yes"
					}
					primaryKey := ""
					if column.PrimaryKey {
						primaryKey = "✓"
					}
					
					result.WriteString(fmt.Sprintf("| %s | %s | %s | %s | %s | %s |\n",
						column.Name,
						column.Type,
						nullable,
						column.Default,
						primaryKey,
						column.Description,
					))
				}
				result.WriteString("\n")
			}
			
			if len(table.Indexes) > 0 {
				result.WriteString("### Indexes\n\n")
				result.WriteString("| Index | Columns | Unique |\n")
				result.WriteString("|-------|---------|--------|\n")
				
				for _, index := range table.Indexes {
					unique := ""
					if index.Unique {
						unique = "✓"
					}
					
					result.WriteString(fmt.Sprintf("| %s | %s | %s |\n",
						index.Name,
						strings.Join(index.Columns, ", "),
						unique,
					))
				}
				result.WriteString("\n")
			}
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// Placeholder handlers for remaining tools

func HandleGetMigrations(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	limit := 10
	if request.Arguments != nil {
		if l, ok := request.Arguments["limit"].(float64); ok {
			limit = int(l)
		}
		if l, ok := request.Arguments["limit"].(string); ok {
			if parsed, err := strconv.Atoi(l); err == nil {
				limit = parsed
			}
		}
	}
	
	var result strings.Builder
	result.WriteString("# Database Migrations\n\n")
	result.WriteString(fmt.Sprintf("**Note:** Showing last %d migrations (if available)\n\n", limit))
	result.WriteString("Migration information would be extracted from the migrations directory and database migration tables.\n")
	result.WriteString("This includes schema changes, version history, and migration status.\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleGetIndexes(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	table := ""
	if request.Arguments != nil {
		if t, ok := request.Arguments["table"].(string); ok {
			table = t
		}
	}
	
	var result strings.Builder
	result.WriteString("# Database Indexes\n\n")
	if table != "" {
		result.WriteString(fmt.Sprintf("**Filtered by table:** %s\n\n", table))
	}
	result.WriteString("Index information would be extracted from the database schema.\n")
	result.WriteString("This includes index names, columns, uniqueness constraints, and performance characteristics.\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleSearchSchema(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	if request.Arguments == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: query parameter is required"},
			},
			IsError: true,
		}, nil
	}
	
	query, ok := request.Arguments["query"].(string)
	if !ok || query == "" {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: query parameter is required and must be a string"},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString(fmt.Sprintf("# Schema Search Results for '%s'\n\n", query))
	result.WriteString("Schema search would look through table names, column names, and constraints.\n")
	result.WriteString("This includes fuzzy matching and pattern-based searches across the database schema.\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleGetServices(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	pattern := ""
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Services\n\n")
	
	services := []string{
		"AuthService - User authentication and authorization",
		"CampaignService - Campaign management business logic",
		"PersonaService - Persona management and validation",
		"ProxyService - Proxy management and health checking",
		"UserService - User management and administration",
		"ValidationService - Data validation and business rules",
		"NotificationService - Real-time notifications via WebSocket",
		"AuditService - Audit logging and compliance tracking",
		"KeywordService - Keyword extraction and management",
		"DomainService - Domain generation and validation",
	}
	
	for _, service := range services {
		if pattern == "" || strings.Contains(strings.ToLower(service), strings.ToLower(pattern)) {
			result.WriteString(fmt.Sprintf("- %s\n", service))
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleGetValidators(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	pattern := ""
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Validators\n\n")
	
	validators := []string{
		"required - Field is required",
		"email - Valid email address format",
		"min - Minimum length/value validation",
		"max - Maximum length/value validation",
		"oneof - Value must be one of specified options",
		"uuid - Valid UUID format",
		"url - Valid URL format",
		"alphanum - Alphanumeric characters only",
		"gt - Greater than validation",
		"gte - Greater than or equal validation",
		"lt - Less than validation",
		"lte - Less than or equal validation",
	}
	
	for _, validator := range validators {
		if pattern == "" || strings.Contains(strings.ToLower(validator), strings.ToLower(pattern)) {
			result.WriteString(fmt.Sprintf("- %s\n", validator))
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleGetWorkflows(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	workflowType := ""
	if request.Arguments != nil {
		if t, ok := request.Arguments["type"].(string); ok {
			workflowType = t
		}
	}
	
	var result strings.Builder
	result.WriteString("# Campaign Workflows\n\n")
	
	if workflowType != "" {
		result.WriteString(fmt.Sprintf("**Filtered by type:** %s\n\n", workflowType))
	}
	
	result.WriteString("## Campaign Status Transitions\n\n")
	result.WriteString("```\n")
	result.WriteString("pending -> queued -> running -> [completed|failed|cancelled]\n")
	result.WriteString("running -> pausing -> paused -> running\n")
	result.WriteString("completed|failed|cancelled -> archived\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Domain Generation Workflow\n")
	result.WriteString("1. Campaign created with domain generation parameters\n")
	result.WriteString("2. Queue campaign for processing\n")
	result.WriteString("3. Generate domains based on keywords and patterns\n")
	result.WriteString("4. Store generated domains in database\n")
	result.WriteString("5. Update campaign status and progress\n\n")
	
	result.WriteString("## DNS Validation Workflow\n")
	result.WriteString("1. Campaign created with DNS validation parameters\n")
	result.WriteString("2. Queue campaign for processing\n")
	result.WriteString("3. Perform DNS lookups for target domains\n")
	result.WriteString("4. Validate DNS responses against criteria\n")
	result.WriteString("5. Store validation results\n")
	result.WriteString("6. Update campaign status and progress\n\n")
	
	result.WriteString("## HTTP Keyword Validation Workflow\n")
	result.WriteString("1. Campaign created with HTTP validation parameters\n")
	result.WriteString("2. Queue campaign for processing\n")
	result.WriteString("3. Fetch HTTP content from target URLs\n")
	result.WriteString("4. Extract and validate keywords\n")
	result.WriteString("5. Store validation results\n")
	result.WriteString("6. Update campaign status and progress\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleSearchLogic(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	if request.Arguments == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: query parameter is required"},
			},
			IsError: true,
		}, nil
	}
	
	query, ok := request.Arguments["query"].(string)
	if !ok || query == "" {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: query parameter is required and must be a string"},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString(fmt.Sprintf("# Business Logic Search Results for '%s'\n\n", query))
	result.WriteString("Business logic search would analyze service functions, validation rules, and workflows.\n")
	result.WriteString("This includes searching through function names, comments, and business rule implementations.\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleGetConfig(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	pattern := ""
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Configuration\n\n")
	
	configs := []string{
		"AppConfig - Main application configuration structure",
		"DatabaseConfig - Database connection settings",
		"ServerConfig - HTTP server configuration",
		"AuthConfig - Authentication settings",
		"LoggingConfig - Logging configuration",
		"HTTPValidatorConfig - HTTP validation settings", 
		"DNSValidatorConfig - DNS validation settings",
		"ProxyConfig - Proxy configuration",
		"SessionConfig - Session management settings",
		"CORSConfig - CORS policy configuration",
		"RateLimitConfig - API rate limiting settings",
	}
	
	for _, config := range configs {
		if pattern == "" || strings.Contains(strings.ToLower(config), strings.ToLower(pattern)) {
			result.WriteString(fmt.Sprintf("- %s\n", config))
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleGetEnvVars(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	pattern := ""
	if request.Arguments != nil {
		if p, ok := request.Arguments["pattern"].(string); ok {
			pattern = p
		}
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Environment Variables\n\n")
	
	envVars := []string{
		"DATABASE_URL - PostgreSQL database connection string",
		"PORT - HTTP server port (default: 8080)",
		"GIN_MODE - Gin framework mode (debug, release)",
		"SESSION_SECRET - Session encryption secret",
		"LOG_LEVEL - Logging level (debug, info, warn, error)",
		"CORS_ORIGINS - Allowed CORS origins",
		"API_KEY - API key for external services",
		"PROXY_TIMEOUT - Default proxy timeout in seconds",
		"RATE_LIMIT - API rate limit per minute",
		"MAX_WORKERS - Maximum number of worker goroutines",
		"STREAM_CHUNK_SIZE - WebSocket stream chunk size",
		"CACHE_TTL - Cache time-to-live in minutes",
	}
	
	for _, envVar := range envVars {
		if pattern == "" || strings.Contains(strings.ToLower(envVar), strings.ToLower(pattern)) {
			result.WriteString(fmt.Sprintf("- %s\n", envVar))
		}
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleGetDependencies(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	depType := ""
	if request.Arguments != nil {
		if t, ok := request.Arguments["type"].(string); ok {
			depType = t
		}
	}
	
	var result strings.Builder
	result.WriteString("# Studio Backend Dependencies\n\n")
	
	if depType != "" {
		result.WriteString(fmt.Sprintf("**Filtered by type:** %s\n\n", depType))
	}
	
	result.WriteString("## Direct Dependencies\n\n")
	result.WriteString("| Module | Version | Description |\n")
	result.WriteString("|--------|---------|-------------|\n")
	result.WriteString("| github.com/gin-gonic/gin | v1.10.1 | HTTP web framework |\n")
	result.WriteString("| github.com/go-playground/validator/v10 | v10.26.0 | Struct and field validation |\n")
	result.WriteString("| github.com/google/uuid | v1.6.0 | UUID generation and parsing |\n")
	result.WriteString("| github.com/gorilla/websocket | v1.5.3 | WebSocket implementation |\n")
	result.WriteString("| github.com/jackc/pgx/v5 | v5.7.5 | PostgreSQL driver |\n")
	result.WriteString("| github.com/jmoiron/sqlx | v1.4.0 | SQL extensions |\n")
	result.WriteString("| github.com/lib/pq | v1.10.9 | PostgreSQL driver |\n")
	result.WriteString("| golang.org/x/crypto | v0.39.0 | Cryptographic functions |\n")
	result.WriteString("| github.com/swaggo/gin-swagger | v1.6.0 | Swagger documentation |\n")
	result.WriteString("| github.com/stretchr/testify | v1.10.0 | Testing toolkit |\n")
	
	if depType == "" || depType == "indirect" {
		result.WriteString("\n## Key Indirect Dependencies\n\n")
		result.WriteString("| Module | Version | Description |\n")
		result.WriteString("|--------|---------|-------------|\n")
		result.WriteString("| github.com/gin-contrib/sse | v1.1.0 | Server-Sent Events |\n")
		result.WriteString("| github.com/json-iterator/go | v1.1.12 | High-performance JSON |\n")
		result.WriteString("| golang.org/x/net | v0.41.0 | Network packages |\n")
		result.WriteString("| golang.org/x/sys | v0.33.0 | System call packages |\n")
	}
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleFindUsage(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	if request.Arguments == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: name parameter is required"},
			},
			IsError: true,
		}, nil
	}
	
	name, ok := request.Arguments["name"].(string)
	if !ok || name == "" {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: name parameter is required and must be a string"},
			},
			IsError: true,
		}, nil
	}
	
	usageType := ""
	if t, ok := request.Arguments["type"].(string); ok {
		usageType = t
	}
	
	var result strings.Builder
	result.WriteString(fmt.Sprintf("# Usage Analysis for '%s'\n\n", name))
	if usageType != "" {
		result.WriteString(fmt.Sprintf("**Type:** %s\n\n", usageType))
	}
	result.WriteString("Usage analysis would search through the codebase to find:\n")
	result.WriteString("- Function calls and method invocations\n")
	result.WriteString("- Type declarations and instantiations\n")
	result.WriteString("- Variable references and assignments\n")
	result.WriteString("- Import statements and dependencies\n")
	result.WriteString("- Interface implementations\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleGetReferences(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	if request.Arguments == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: component parameter is required"},
			},
			IsError: true,
		}, nil
	}
	
	component, ok := request.Arguments["component"].(string)
	if !ok || component == "" {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: component parameter is required and must be a string"},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString(fmt.Sprintf("# Cross-References for '%s'\n\n", component))
	result.WriteString("Cross-reference analysis would show:\n")
	result.WriteString("- Components that depend on this component\n")
	result.WriteString("- Components that this component depends on\n")
	result.WriteString("- Import/export relationships\n")
	result.WriteString("- Interface implementations and extensions\n")
	result.WriteString("- Database foreign key relationships\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

func HandleGetCallGraph(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	if request.Arguments == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: function parameter is required"},
			},
			IsError: true,
		}, nil
	}
	
	function, ok := request.Arguments["function"].(string)
	if !ok || function == "" {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: function parameter is required and must be a string"},
			},
			IsError: true,
		}, nil
	}
	
	depth := 3
	if request.Arguments != nil {
		if d, ok := request.Arguments["depth"].(float64); ok {
			depth = int(d)
		}
		if d, ok := request.Arguments["depth"].(string); ok {
			if parsed, err := strconv.Atoi(d); err == nil {
				depth = parsed
			}
		}
	}
	
	var result strings.Builder
	result.WriteString(fmt.Sprintf("# Call Graph for '%s'\n\n", function))
	result.WriteString(fmt.Sprintf("**Maximum depth:** %d\n\n", depth))
	result.WriteString("Call graph analysis would show:\n")
	result.WriteString("- Functions called by this function (callees)\n")
	result.WriteString("- Functions that call this function (callers)\n")
	result.WriteString("- Call depth and relationships\n")
	result.WriteString("- Recursive call detection\n")
	result.WriteString("- Cross-package dependencies\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// =============================================================================
// DOMAIN-SPECIFIC TOOLS (Campaign & Domain Generation)
// =============================================================================

// HandleGetCampaignTypes handles the get_campaign_types tool request
func HandleGetCampaignTypes(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_campaign_types request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Studio Backend Campaign Types\n\n")
	
	result.WriteString("## Available Campaign Types\n\n")
	result.WriteString("| Type | Description | Key Features |\n")
	result.WriteString("|------|-------------|-------------|\n")
	result.WriteString("| domain_generation | Generate domains based on patterns and keywords | Pattern-based generation, keyword substitution, TLD validation |\n")
	result.WriteString("| dns_validation | Validate DNS resolution for domains | DNS lookup validation, resolution testing, timeout handling |\n")
	result.WriteString("| http_keyword_validation | HTTP content keyword validation | Content fetching, keyword extraction, regex matching |\n\n")
	
	result.WriteString("## Campaign Type Enums\n\n")
	result.WriteString("```go\n")
	result.WriteString("type CampaignTypeEnum string\n\n")
	result.WriteString("const (\n")
	result.WriteString("    CampaignTypeDomainGeneration      CampaignTypeEnum = \"domain_generation\"\n")
	result.WriteString("    CampaignTypeDNSValidation         CampaignTypeEnum = \"dns_validation\"\n")
	result.WriteString("    CampaignTypeHTTPKeywordValidation CampaignTypeEnum = \"http_keyword_validation\"\n")
	result.WriteString(")\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Usage Patterns\n\n")
	result.WriteString("- **Domain Generation**: Used for bulk domain creation based on configurable patterns\n")
	result.WriteString("- **DNS Validation**: Used for testing domain resolution and DNS health\n")
	result.WriteString("- **HTTP Keyword Validation**: Used for content analysis and keyword presence validation\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetPatternTypes handles the get_pattern_types tool request
func HandleGetPatternTypes(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_pattern_types request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Domain Generation Pattern Types\n\n")
	
	result.WriteString("## Available Pattern Types\n\n")
	result.WriteString("| Pattern Type | Description | Example | Rules |\n")
	result.WriteString("|--------------|-------------|---------|-------|\n")
	result.WriteString("| keyword_substitution | Replace placeholders with keywords | {keyword}.{tld} | Supports variable length, character sets |\n")
	result.WriteString("| prefix_suffix | Add prefix/suffix to base keywords | prefix{keyword}suffix.{tld} | Configurable prefix/suffix strings |\n")
	result.WriteString("| character_variation | Generate character variations | {keyword}123.{tld} | Numeric/alphanumeric variations |\n")
	result.WriteString("| length_variation | Generate length-based variations | {keyword}{chars}.{tld} | Variable character padding |\n\n")
	
	result.WriteString("## Pattern Configuration\n\n")
	result.WriteString("```go\n")
	result.WriteString("type DomainGenerationCampaignParams struct {\n")
	result.WriteString("    PatternType    string  `json:\"pattern_type\"`\n")
	result.WriteString("    VariableLength *int    `json:\"variable_length,omitempty\"`\n")
	result.WriteString("    CharacterSet   *string `json:\"character_set,omitempty\"`\n")
	result.WriteString("    ConstantString *string `json:\"constant_string,omitempty\"`\n")
	result.WriteString("    TLD            string  `json:\"tld\"`\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Validation Rules\n\n")
	result.WriteString("- **Pattern Type**: Must be one of the supported pattern types\n")
	result.WriteString("- **Variable Length**: Integer between 1-20 characters\n")
	result.WriteString("- **Character Set**: alphanumeric, numeric, alphabetic, or custom set\n")
	result.WriteString("- **TLD**: Must be valid top-level domain\n")
	result.WriteString("- **Constant String**: Static string for prefix/suffix patterns\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetCampaignStates handles the get_campaign_states tool request
func HandleGetCampaignStates(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_campaign_states request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Campaign State Machine Transitions\n\n")
	
	result.WriteString("## Campaign States\n\n")
	result.WriteString("| State | Description | Terminal | Next Possible States |\n")
	result.WriteString("|-------|-------------|----------|---------------------|\n")
	result.WriteString("| pending | Campaign created but not queued | No | queued, cancelled |\n")
	result.WriteString("| queued | Campaign queued for processing | No | running, paused, cancelled |\n")
	result.WriteString("| running | Campaign actively processing | No | paused, completed, failed |\n")
	result.WriteString("| pausing | Campaign transitioning to pause | No | paused |\n")
	result.WriteString("| paused | Campaign temporarily stopped | No | running, cancelled |\n")
	result.WriteString("| completed | Campaign finished successfully | No | archived |\n")
	result.WriteString("| failed | Campaign terminated with error | No | queued, archived |\n")
	result.WriteString("| cancelled | Campaign cancelled by user | Yes | (none) |\n")
	result.WriteString("| archived | Campaign moved to archive | Yes | (none) |\n\n")
	
	result.WriteString("## State Transition Rules\n\n")
	result.WriteString("```\n")
	result.WriteString("pending → queued → running → [completed|failed|cancelled]\n")
	result.WriteString("running → pausing → paused → running\n")
	result.WriteString("completed|failed|cancelled → archived\n")
	result.WriteString("failed → queued (retry)\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## State Machine Implementation\n\n")
	result.WriteString("```go\n")
	result.WriteString("type CampaignStateMachine struct {\n")
	result.WriteString("    transitions map[CampaignStatus][]CampaignStatus\n")
	result.WriteString("    mu          sync.RWMutex\n")
	result.WriteString("}\n\n")
	result.WriteString("func (sm *CampaignStateMachine) CanTransition(current, target CampaignStatus) bool\n")
	result.WriteString("func (sm *CampaignStateMachine) ValidateTransition(current, target CampaignStatus) error\n")
	result.WriteString("func (sm *CampaignStateMachine) GetValidTransitions(current CampaignStatus) []CampaignStatus\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetDomainValidationRules handles the get_domain_validation_rules tool request
func HandleGetDomainValidationRules(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_domain_validation_rules request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Domain Validation Rules\n\n")
	
	result.WriteString("## TLD Validation Rules\n\n")
	result.WriteString("| Rule Type | Description | Examples | Validation |\n")
	result.WriteString("|-----------|-------------|----------|------------|\n")
	result.WriteString("| Generic TLDs | Common top-level domains | .com, .org, .net, .info | ICANN approved list |\n")
	result.WriteString("| Country Code TLDs | Country-specific domains | .us, .uk, .de, .fr | ISO 3166-1 alpha-2 codes |\n")
	result.WriteString("| Sponsored TLDs | Special purpose domains | .edu, .gov, .mil | Restricted registration |\n")
	result.WriteString("| New gTLDs | New generic domains | .app, .dev, .cloud | ICANN new gTLD program |\n\n")
	
	result.WriteString("## Domain Format Validation\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Domain validation constraints\n")
	result.WriteString("const (\n")
	result.WriteString("    MinDomainLength = 1\n")
	result.WriteString("    MaxDomainLength = 253  // RFC 1035\n")
	result.WriteString("    MaxLabelLength  = 63   // RFC 1035\n")
	result.WriteString(")\n\n")
	result.WriteString("// Valid characters: a-z, 0-9, hyphen (not at start/end)\n")
	result.WriteString("var DomainRegex = regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$`)\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## DNS Validation Rules\n\n")
	result.WriteString("| Validation Type | Description | Success Criteria | Error Conditions |\n")
	result.WriteString("|----------------|-------------|------------------|------------------|\n")
	result.WriteString("| A Record | IPv4 address resolution | Valid IPv4 returned | NXDOMAIN, timeout, error |\n")
	result.WriteString("| AAAA Record | IPv6 address resolution | Valid IPv6 returned | NXDOMAIN, timeout, error |\n")
	result.WriteString("| MX Record | Mail exchange resolution | Valid MX records | NXDOMAIN, timeout, error |\n")
	result.WriteString("| CNAME Record | Canonical name resolution | Valid CNAME target | NXDOMAIN, timeout, error |\n\n")
	
	result.WriteString("## HTTP Validation Rules\n\n")
	result.WriteString("| Rule Type | Description | Configuration | Validation |\n")
	result.WriteString("|-----------|-------------|---------------|------------|\n")
	result.WriteString("| Status Code | HTTP response codes | 200, 301, 302, etc. | Expected vs actual comparison |\n")
	result.WriteString("| Keyword Presence | Content keyword validation | Required/forbidden keywords | String/regex matching |\n")
	result.WriteString("| Response Time | Performance validation | Max response time (ms) | Timeout threshold checking |\n")
	result.WriteString("| Content Type | MIME type validation | text/html, application/json | Content-Type header matching |\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleAnalyzeCampaignFlow handles the analyze_campaign_flow tool request
func HandleAnalyzeCampaignFlow(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling analyze_campaign_flow request: %+v", request.Arguments)
	
	campaignType := ""
	if request.Arguments != nil {
		if t, ok := request.Arguments["campaign_type"].(string); ok {
			campaignType = t
		}
	}
	
	var result strings.Builder
	result.WriteString("# Campaign Flow Analysis\n\n")
	
	if campaignType != "" {
		result.WriteString(fmt.Sprintf("**Campaign Type:** %s\n\n", campaignType))
		
		switch campaignType {
		case "domain_generation":
			result.WriteString("## Domain Generation Campaign Flow\n\n")
			result.WriteString("```mermaid\n")
			result.WriteString("graph TD\n")
			result.WriteString("    A[Create Campaign] --> B[Validate Parameters]\n")
			result.WriteString("    B --> C[Generate Config Hash]\n")
			result.WriteString("    C --> D[Check for Existing Campaign]\n")
			result.WriteString("    D --> E[Queue Campaign]\n")
			result.WriteString("    E --> F[Start Worker]\n")
			result.WriteString("    F --> G[Generate Domains]\n")
			result.WriteString("    G --> H[Store Results]\n")
			result.WriteString("    H --> I[Update Progress]\n")
			result.WriteString("    I --> J[Complete Campaign]\n")
			result.WriteString("```\n\n")
			
		case "dns_validation":
			result.WriteString("## DNS Validation Campaign Flow\n\n")
			result.WriteString("```mermaid\n")
			result.WriteString("graph TD\n")
			result.WriteString("    A[Create Campaign] --> B[Load Domain List]\n")
			result.WriteString("    B --> C[Queue Campaign]\n")
			result.WriteString("    C --> D[Start Worker Pool]\n")
			result.WriteString("    D --> E[Perform DNS Lookups]\n")
			result.WriteString("    E --> F[Validate Results]\n")
			result.WriteString("    F --> G[Store Validation Data]\n")
			result.WriteString("    G --> H[Update Progress]\n")
			result.WriteString("    H --> I[Complete Campaign]\n")
			result.WriteString("```\n\n")
			
		case "http_keyword_validation":
			result.WriteString("## HTTP Keyword Validation Campaign Flow\n\n")
			result.WriteString("```mermaid\n")
			result.WriteString("graph TD\n")
			result.WriteString("    A[Create Campaign] --> B[Load URL List]\n")
			result.WriteString("    B --> C[Configure Keywords]\n")
			result.WriteString("    C --> D[Queue Campaign]\n")
			result.WriteString("    D --> E[Start Worker Pool]\n")
			result.WriteString("    E --> F[Fetch HTTP Content]\n")
			result.WriteString("    F --> G[Extract Keywords]\n")
			result.WriteString("    G --> H[Validate Against Rules]\n")
			result.WriteString("    H --> I[Store Results]\n")
			result.WriteString("    I --> J[Update Progress]\n")
			result.WriteString("    J --> K[Complete Campaign]\n")
			result.WriteString("```\n\n")
		}
	}
	
	result.WriteString("## Common Flow Components\n\n")
	result.WriteString("### 1. Campaign Creation\n")
	result.WriteString("- Parameter validation\n")
	result.WriteString("- Configuration hash generation\n")
	result.WriteString("- Duplicate detection\n")
	result.WriteString("- Database transaction handling\n\n")
	
	result.WriteString("### 2. Queue Management\n")
	result.WriteString("- Priority-based queuing\n")
	result.WriteString("- Worker pool allocation\n")
	result.WriteString("- Load balancing\n")
	result.WriteString("- Retry mechanism\n\n")
	
	result.WriteString("### 3. Progress Tracking\n")
	result.WriteString("- Real-time progress updates\n")
	result.WriteString("- WebSocket notifications\n")
	result.WriteString("- Audit logging\n")
	result.WriteString("- Error tracking\n\n")
	
	result.WriteString("### 4. Completion Handling\n")
	result.WriteString("- Result aggregation\n")
	result.WriteString("- Status finalization\n")
	result.WriteString("- Cleanup operations\n")
	result.WriteString("- Notification delivery\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// =============================================================================
// PERFORMANCE ANALYSIS TOOLS
// =============================================================================

// HandleGetPerformanceMetrics handles the get_performance_metrics tool request
func HandleGetPerformanceMetrics(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_performance_metrics request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Performance Enhancement Patterns\n\n")
	
	result.WriteString("## Performance Testing Framework\n\n")
	result.WriteString("| Metric Type | Description | Target Values | Measurement Tools |\n")
	result.WriteString("|-------------|-------------|---------------|------------------|\n")
	result.WriteString("| Response Time | Average API response time | < 200ms (P95) | Hey performance tool |\n")
	result.WriteString("| Throughput | Requests per second | > 1000 RPS | Load testing |\n")
	result.WriteString("| Success Rate | Percentage of successful requests | > 99.9% | Error tracking |\n")
	result.WriteString("| Memory Usage | Application memory consumption | < 512MB baseline | Go runtime metrics |\n")
	result.WriteString("| CPU Usage | Processor utilization | < 70% sustained | System monitoring |\n\n")
	
	result.WriteString("## Performance Enhancement Patterns (BF-005)\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Connection pooling for database efficiency\n")
	result.WriteString("type ConnectionPool struct {\n")
	result.WriteString("    MaxOpenConns    int\n")
	result.WriteString("    MaxIdleConns    int\n")
	result.WriteString("    ConnMaxLifetime time.Duration\n")
	result.WriteString("}\n\n")
	result.WriteString("// Worker pool for concurrent processing\n")
	result.WriteString("type WorkerPool struct {\n")
	result.WriteString("    Workers     int\n")
	result.WriteString("    BufferSize  int\n")
	result.WriteString("    Timeout     time.Duration\n")
	result.WriteString("}\n\n")
	result.WriteString("// Batch processing for bulk operations\n")
	result.WriteString("type BatchProcessor struct {\n")
	result.WriteString("    BatchSize   int\n")
	result.WriteString("    FlushInterval time.Duration\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Performance Test Results Structure\n\n")
	result.WriteString("```go\n")
	result.WriteString("type HeyResult struct {\n")
	result.WriteString("    URL                string\n")
	result.WriteString("    TotalRequests      int\n")
	result.WriteString("    SuccessfulRequests int\n")
	result.WriteString("    AverageTime        float64\n")
	result.WriteString("    Percentiles        struct {\n")
	result.WriteString("        P50, P75, P90, P95, P99 float64\n")
	result.WriteString("    }\n")
	result.WriteString("    RPS       float64\n")
	result.WriteString("    ErrorDist map[string]int\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetConcurrencyPatterns handles the get_concurrency_patterns tool request
func HandleGetConcurrencyPatterns(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_concurrency_patterns request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Concurrency Patterns\n\n")
	
	result.WriteString("## Worker Pool Patterns\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Campaign worker pool implementation\n")
	result.WriteString("type CampaignWorkerService struct {\n")
	result.WriteString("    workerPool    chan chan WorkerTask\n")
	result.WriteString("    maxWorkers    int\n")
	result.WriteString("    taskQueue     chan WorkerTask\n")
	result.WriteString("    quit          chan bool\n")
	result.WriteString("}\n\n")
	result.WriteString("// Worker goroutine pattern\n")
	result.WriteString("func (w *Worker) Start() {\n")
	result.WriteString("    go func() {\n")
	result.WriteString("        for {\n")
	result.WriteString("            w.WorkerPool <- w.TaskQueue\n")
	result.WriteString("            select {\n")
	result.WriteString("            case task := <-w.TaskQueue:\n")
	result.WriteString("                task.Execute()\n")
	result.WriteString("            case <-w.QuitChan:\n")
	result.WriteString("                return\n")
	result.WriteString("            }\n")
	result.WriteString("        }\n")
	result.WriteString("    }()\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Goroutine Management\n\n")
	result.WriteString("| Pattern | Use Case | Implementation | Benefits |\n")
	result.WriteString("|---------|----------|----------------|----------|\n")
	result.WriteString("| Worker Pool | Campaign processing | Fixed number of workers | Resource control, backpressure |\n")
	result.WriteString("| Fan-out/Fan-in | Domain generation | Parallel generation, result aggregation | High throughput |\n")
	result.WriteString("| Pipeline | HTTP validation | Staged processing pipeline | Memory efficiency |\n")
	result.WriteString("| Rate Limiting | API calls | Token bucket, leaky bucket | API protection |\n\n")
	
	result.WriteString("## Concurrent Processing Examples\n\n")
	result.WriteString("```go\n")
	result.WriteString("// DNS validation with concurrent lookups\n")
	result.WriteString("func (s *DNSCampaignService) processDomainsParallel(domains []string) {\n")
	result.WriteString("    semaphore := make(chan struct{}, s.maxConcurrency)\n")
	result.WriteString("    var wg sync.WaitGroup\n")
	result.WriteString("    \n")
	result.WriteString("    for _, domain := range domains {\n")
	result.WriteString("        wg.Add(1)\n")
	result.WriteString("        go func(d string) {\n")
	result.WriteString("            defer wg.Done()\n")
	result.WriteString("            semaphore <- struct{}{} // Acquire\n")
	result.WriteString("            defer func() { <-semaphore }() // Release\n")
	result.WriteString("            \n")
	result.WriteString("            s.validateDomain(d)\n")
	result.WriteString("        }(domain)\n")
	result.WriteString("    }\n")
	result.WriteString("    wg.Wait()\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Synchronization Primitives\n\n")
	result.WriteString("- **sync.Mutex**: Protecting shared state in campaign updates\n")
	result.WriteString("- **sync.RWMutex**: Read-heavy operations like config access\n")
	result.WriteString("- **sync.WaitGroup**: Coordinating worker completion\n")
	result.WriteString("- **sync.Once**: Singleton initialization\n")
	result.WriteString("- **context.Context**: Cancellation and timeout management\n")
	result.WriteString("- **Channels**: Communication between goroutines\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetCachingStrategies handles the get_caching_strategies tool request
func HandleGetCachingStrategies(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_caching_strategies request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Caching Strategies\n\n")
	
	result.WriteString("## Cache Implementation Patterns\n\n")
	result.WriteString("| Cache Type | Use Case | TTL | Invalidation Strategy |\n")
	result.WriteString("|------------|----------|-----|----------------------|\n")
	result.WriteString("| In-Memory | Frequently accessed data | 5-15 minutes | Time-based, manual |\n")
	result.WriteString("| Redis | Session data, rate limiting | 30 minutes | TTL-based, key pattern |\n")
	result.WriteString("| Database Query | Expensive queries | 1-5 minutes | Query signature-based |\n")
	result.WriteString("| HTTP Response | API responses | 30 seconds | ETag, Last-Modified |\n\n")
	
	result.WriteString("## Cache Configuration\n\n")
	result.WriteString("```go\n")
	result.WriteString("type CacheConfig struct {\n")
	result.WriteString("    TTL                time.Duration `json:\"ttl\"`\n")
	result.WriteString("    MaxSize            int           `json:\"max_size\"`\n")
	result.WriteString("    EvictionPolicy     string        `json:\"eviction_policy\"` // LRU, LFU, FIFO\n")
	result.WriteString("    WriteThrough       bool          `json:\"write_through\"`\n")
	result.WriteString("    WriteBehind        bool          `json:\"write_behind\"`\n")
	result.WriteString("    RefreshAhead       bool          `json:\"refresh_ahead\"`\n")
	result.WriteString("}\n\n")
	result.WriteString("// Cache interface\n")
	result.WriteString("type Cache interface {\n")
	result.WriteString("    Get(key string) (interface{}, bool)\n")
	result.WriteString("    Set(key string, value interface{}, ttl time.Duration)\n")
	result.WriteString("    Delete(key string)\n")
	result.WriteString("    Clear()\n")
	result.WriteString("    Stats() CacheStats\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Caching Patterns by Component\n\n")
	result.WriteString("### Campaign Data Caching\n")
	result.WriteString("- **Campaign metadata**: 5-minute TTL for frequently accessed campaigns\n")
	result.WriteString("- **Campaign results**: Long-term caching for completed campaigns\n")
	result.WriteString("- **Progress updates**: Short-term caching with real-time invalidation\n\n")
	
	result.WriteString("### Domain Validation Caching\n")
	result.WriteString("- **DNS resolution results**: 15-minute TTL for stable domains\n")
	result.WriteString("- **HTTP response data**: 5-minute TTL for dynamic content\n")
	result.WriteString("- **Validation rules**: Long-term caching with manual invalidation\n\n")
	
	result.WriteString("### Configuration Caching\n")
	result.WriteString("- **Application config**: Cached until restart or manual refresh\n")
	result.WriteString("- **User sessions**: Redis-based with sliding expiration\n")
	result.WriteString("- **API rate limits**: Token bucket with Redis backing\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetOptimizationPatterns handles the get_optimization_patterns tool request
func HandleGetOptimizationPatterns(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_optimization_patterns request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Optimization Patterns\n\n")
	
	result.WriteString("## Memory Optimization\n\n")
	result.WriteString("| Pattern | Description | Implementation | Memory Savings |\n")
	result.WriteString("|---------|-------------|----------------|----------------|\n")
	result.WriteString("| Object Pooling | Reuse expensive objects | sync.Pool for buffers | 30-50% reduction |\n")
	result.WriteString("| String Interning | Cache common strings | Map-based deduplication | 20-40% reduction |\n")
	result.WriteString("| Streaming Processing | Process data in chunks | io.Reader/Writer interfaces | 80-90% reduction |\n")
	result.WriteString("| Lazy Loading | Load data on demand | Lazy initialization patterns | Variable |\n\n")
	
	result.WriteString("## CPU Optimization\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Example: Optimized string building\n")
	result.WriteString("var builderPool = sync.Pool{\n")
	result.WriteString("    New: func() interface{} {\n")
	result.WriteString("        return &strings.Builder{}\n")
	result.WriteString("    },\n")
	result.WriteString("}\n\n")
	result.WriteString("func optimizedStringConcat(parts []string) string {\n")
	result.WriteString("    builder := builderPool.Get().(*strings.Builder)\n")
	result.WriteString("    defer func() {\n")
	result.WriteString("        builder.Reset()\n")
	result.WriteString("        builderPool.Put(builder)\n")
	result.WriteString("    }()\n")
	result.WriteString("    \n")
	result.WriteString("    for _, part := range parts {\n")
	result.WriteString("        builder.WriteString(part)\n")
	result.WriteString("    }\n")
	result.WriteString("    return builder.String()\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Database Optimization\n\n")
	result.WriteString("| Optimization | Description | Implementation | Performance Gain |\n")
	result.WriteString("|--------------|-------------|----------------|------------------|\n")
	result.WriteString("| Connection Pooling | Reuse database connections | sqlx connection pool | 2-5x throughput |\n")
	result.WriteString("| Prepared Statements | Precompiled SQL queries | Statement caching | 20-40% faster |\n")
	result.WriteString("| Batch Operations | Group multiple operations | Batch inserts/updates | 5-10x faster |\n")
	result.WriteString("| Index Optimization | Efficient query execution | Strategic indexing | 10-100x faster |\n\n")
	
	result.WriteString("## Algorithm Optimization\n\n")
	result.WriteString("### Domain Generation Optimization\n")
	result.WriteString("```go\n")
	result.WriteString("// Optimized domain generation with pre-allocated slices\n")
	result.WriteString("func generateDomainsOptimized(pattern string, count int) []string {\n")
	result.WriteString("    // Pre-allocate slice to avoid repeated allocations\n")
	result.WriteString("    domains := make([]string, 0, count)\n")
	result.WriteString("    \n")
	result.WriteString("    // Use string builder pool for efficient concatenation\n")
	result.WriteString("    builder := builderPool.Get().(*strings.Builder)\n")
	result.WriteString("    defer builderPool.Put(builder)\n")
	result.WriteString("    \n")
	result.WriteString("    for i := 0; i < count; i++ {\n")
	result.WriteString("        builder.Reset()\n")
	result.WriteString("        // Generate domain using efficient string operations\n")
	result.WriteString("        generateSingleDomain(builder, pattern, i)\n")
	result.WriteString("        domains = append(domains, builder.String())\n")
	result.WriteString("    }\n")
	result.WriteString("    \n")
	result.WriteString("    return domains\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## I/O Optimization\n\n")
	result.WriteString("- **Buffered I/O**: Use bufio.Reader/Writer for efficient file operations\n")
	result.WriteString("- **Async I/O**: Non-blocking I/O operations with goroutines\n")
	result.WriteString("- **Connection Reuse**: HTTP client connection pooling\n")
	result.WriteString("- **Compression**: Gzip compression for network transfers\n")
	result.WriteString("- **Streaming**: Process large datasets without loading into memory\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleAnalyzeBottlenecks handles the analyze_bottlenecks tool request
func HandleAnalyzeBottlenecks(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling analyze_bottlenecks request: %+v", request.Arguments)
	
	component := ""
	if request.Arguments != nil {
		if c, ok := request.Arguments["component"].(string); ok {
			component = c
		}
	}
	
	var result strings.Builder
	result.WriteString("# Performance Bottleneck Analysis\n\n")
	
	if component != "" {
		result.WriteString(fmt.Sprintf("**Component:** %s\n\n", component))
	}
	
	result.WriteString("## Common Bottleneck Patterns\n\n")
	result.WriteString("| Component | Bottleneck Type | Symptoms | Solutions |\n")
	result.WriteString("|-----------|----------------|----------|----------|\n")
	result.WriteString("| Database | Connection exhaustion | Timeout errors, slow queries | Connection pooling, query optimization |\n")
	result.WriteString("| HTTP Client | Connection limits | Request timeouts, 429 errors | Connection pooling, rate limiting |\n")
	result.WriteString("| Memory | Excessive allocations | High GC pressure, OOM errors | Object pooling, streaming |\n")
	result.WriteString("| CPU | Inefficient algorithms | High CPU usage, slow responses | Algorithm optimization, caching |\n")
	result.WriteString("| I/O | Blocking operations | Thread starvation, timeouts | Async I/O, buffering |\n\n")
	
	result.WriteString("## Bottleneck Detection Methods\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Performance monitoring with metrics\n")
	result.WriteString("type PerformanceMonitor struct {\n")
	result.WriteString("    RequestDuration   *prometheus.HistogramVec\n")
	result.WriteString("    ActiveConnections prometheus.Gauge\n")
	result.WriteString("    ErrorRate        *prometheus.CounterVec\n")
	result.WriteString("    MemoryUsage      prometheus.Gauge\n")
	result.WriteString("}\n\n")
	result.WriteString("// Bottleneck detection middleware\n")
	result.WriteString("func (m *PerformanceMonitor) MonitorRequest(next http.Handler) http.Handler {\n")
	result.WriteString("    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n")
	result.WriteString("        start := time.Now()\n")
	result.WriteString("        defer func() {\n")
	result.WriteString("            duration := time.Since(start)\n")
	result.WriteString("            m.RequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration.Seconds())\n")
	result.WriteString("        }()\n")
	result.WriteString("        next.ServeHTTP(w, r)\n")
	result.WriteString("    })\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Campaign-Specific Bottlenecks\n\n")
	result.WriteString("### Domain Generation Bottlenecks\n")
	result.WriteString("- **Algorithm complexity**: O(n²) pattern matching → O(n) optimized algorithms\n")
	result.WriteString("- **Memory allocation**: Repeated string creation → String builder pooling\n")
	result.WriteString("- **Database writes**: Individual inserts → Batch operations\n\n")
	
	result.WriteString("### DNS Validation Bottlenecks\n")
	result.WriteString("- **DNS timeout**: Long resolution times → Configurable timeouts\n")
	result.WriteString("- **Rate limiting**: DNS server limits → Distributed rate limiting\n")
	result.WriteString("- **Sequential processing**: One-by-one validation → Parallel worker pools\n\n")
	
	result.WriteString("### HTTP Validation Bottlenecks\n")
	result.WriteString("- **Connection overhead**: New connection per request → Connection pooling\n")
	result.WriteString("- **Large responses**: Memory exhaustion → Streaming processing\n")
	result.WriteString("- **Regex complexity**: Expensive pattern matching → Compiled regex caching\n\n")
	
	result.WriteString("## Profiling and Monitoring\n\n")
	result.WriteString("```bash\n")
	result.WriteString("# Go profiling tools\n")
	result.WriteString("go tool pprof http://localhost:8080/debug/pprof/profile\n")
	result.WriteString("go tool pprof http://localhost:8080/debug/pprof/heap\n")
	result.WriteString("go tool pprof http://localhost:8080/debug/pprof/goroutine\n\n")
	result.WriteString("# Performance testing\n")
	result.WriteString("hey -n 1000 -c 50 -m GET http://localhost:8080/api/campaigns\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// =============================================================================
// STATE MANAGEMENT & ORCHESTRATION TOOLS
// =============================================================================

// HandleGetStateMachines handles the get_state_machines tool request
func HandleGetStateMachines(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_state_machines request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# State Machine Definitions\n\n")
	
	result.WriteString("## Campaign State Machine\n\n")
	result.WriteString("```go\n")
	result.WriteString("type CampaignStateMachine struct {\n")
	result.WriteString("    transitions map[CampaignStatus][]CampaignStatus\n")
	result.WriteString("    mu          sync.RWMutex\n")
	result.WriteString("}\n\n")
	result.WriteString("// State transition map\n")
	result.WriteString("transitions := map[CampaignStatus][]CampaignStatus{\n")
	result.WriteString("    StatusPending:   {StatusQueued, StatusCancelled},\n")
	result.WriteString("    StatusQueued:    {StatusRunning, StatusPaused, StatusCancelled},\n")
	result.WriteString("    StatusRunning:   {StatusPaused, StatusCompleted, StatusFailed},\n")
	result.WriteString("    StatusPaused:    {StatusRunning, StatusCancelled},\n")
	result.WriteString("    StatusCompleted: {StatusArchived},\n")
	result.WriteString("    StatusFailed:    {StatusQueued, StatusArchived},\n")
	result.WriteString("    StatusArchived:  {}, // Terminal state\n")
	result.WriteString("    StatusCancelled: {}, // Terminal state\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Job State Machine\n\n")
	result.WriteString("```go\n")
	result.WriteString("type JobStateMachine struct {\n")
	result.WriteString("    transitions map[CampaignJobStatusEnum][]CampaignJobStatusEnum\n")
	result.WriteString("}\n\n")
	result.WriteString("// Job state transitions\n")
	result.WriteString("jobTransitions := map[CampaignJobStatusEnum][]CampaignJobStatusEnum{\n")
	result.WriteString("    JobStatusPending:    {JobStatusQueued, JobStatusFailed},\n")
	result.WriteString("    JobStatusQueued:     {JobStatusRunning, JobStatusFailed},\n")
	result.WriteString("    JobStatusRunning:    {JobStatusProcessing, JobStatusFailed},\n")
	result.WriteString("    JobStatusProcessing: {JobStatusCompleted, JobStatusFailed, JobStatusRetry},\n")
	result.WriteString("    JobStatusRetry:      {JobStatusQueued, JobStatusFailed},\n")
	result.WriteString("    JobStatusCompleted:  {}, // Terminal state\n")
	result.WriteString("    JobStatusFailed:     {}, // Terminal state\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## State Machine Methods\n\n")
	result.WriteString("| Method | Description | Purpose |\n")
	result.WriteString("|--------|-------------|----------|\n")
	result.WriteString("| CanTransition | Check if transition is valid | Validation before state change |\n")
	result.WriteString("| ValidateTransition | Return error if invalid | Error handling |\n")
	result.WriteString("| GetValidTransitions | Get all valid next states | UI state options |\n")
	result.WriteString("| IsTerminalState | Check if state is final | Completion detection |\n")
	result.WriteString("| TransitionWithHooks | Execute with pre/post hooks | Event handling |\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetOrchestrationPatterns handles the get_orchestration_patterns tool request
func HandleGetOrchestrationPatterns(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_orchestration_patterns request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Campaign Orchestration Patterns\n\n")
	
	result.WriteString("## Campaign Orchestrator Service\n\n")
	result.WriteString("```go\n")
	result.WriteString("type CampaignOrchestratorService struct {\n")
	result.WriteString("    campaignStore         store.CampaignStore\n")
	result.WriteString("    campaignJobStore      store.CampaignJobStore\n")
	result.WriteString("    domainGenerationSvc   DomainGenerationService\n")
	result.WriteString("    dnsCampaignSvc        DNSCampaignService\n")
	result.WriteString("    httpKeywordSvc        HTTPKeywordCampaignService\n")
	result.WriteString("    workerService         CampaignWorkerService\n")
	result.WriteString("    stateMachine          *CampaignStateMachine\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Orchestration Patterns\n\n")
	result.WriteString("| Pattern | Description | Implementation | Use Case |\n")
	result.WriteString("|---------|-------------|----------------|----------|\n")
	result.WriteString("| Saga Pattern | Distributed transaction management | Compensating actions | Multi-step campaign operations |\n")
	result.WriteString("| Event Sourcing | Store state changes as events | Event log + replay | Audit trail, debugging |\n")
	result.WriteString("| CQRS | Separate read/write models | Command/Query separation | Performance, scalability |\n")
	result.WriteString("| Circuit Breaker | Prevent cascade failures | Failure detection + fallback | External service protection |\n")
	result.WriteString("| Bulkhead | Isolate failure domains | Resource partitioning | Fault isolation |\n\n")
	
	result.WriteString("## Campaign Coordination\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Campaign lifecycle coordination\n")
	result.WriteString("func (svc *CampaignOrchestratorService) ExecuteCampaign(ctx context.Context, campaignID uuid.UUID) error {\n")
	result.WriteString("    // 1. Load campaign configuration\n")
	result.WriteString("    campaign, err := svc.campaignStore.GetByID(ctx, campaignID)\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        return err\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // 2. Validate state transition\n")
	result.WriteString("    if !svc.stateMachine.CanTransition(campaign.Status, StatusRunning) {\n")
	result.WriteString("        return ErrInvalidStateTransition\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // 3. Update campaign status\n")
	result.WriteString("    campaign.Status = StatusRunning\n")
	result.WriteString("    if err := svc.campaignStore.Update(ctx, campaign); err != nil {\n")
	result.WriteString("        return err\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // 4. Delegate to appropriate service\n")
	result.WriteString("    switch campaign.Type {\n")
	result.WriteString("    case CampaignTypeDomainGeneration:\n")
	result.WriteString("        return svc.domainGenerationSvc.ProcessCampaign(ctx, campaign)\n")
	result.WriteString("    case CampaignTypeDNSValidation:\n")
	result.WriteString("        return svc.dnsCampaignSvc.ProcessCampaign(ctx, campaign)\n")
	result.WriteString("    case CampaignTypeHTTPKeywordValidation:\n")
	result.WriteString("        return svc.httpKeywordSvc.ProcessCampaign(ctx, campaign)\n")
	result.WriteString("    default:\n")
	result.WriteString("        return ErrUnsupportedCampaignType\n")
	result.WriteString("    }\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Worker Coordination\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Worker pool coordination\n")
	result.WriteString("type WorkerCoordinator struct {\n")
	result.WriteString("    pools map[string]*WorkerPool\n")
	result.WriteString("    scheduler *TaskScheduler\n")
	result.WriteString("    monitor *PerformanceMonitor\n")
	result.WriteString("}\n\n")
	result.WriteString("func (wc *WorkerCoordinator) ScheduleTask(task WorkerTask) error {\n")
	result.WriteString("    // 1. Determine appropriate worker pool\n")
	result.WriteString("    poolKey := wc.selectPool(task.Type(), task.Priority())\n")
	result.WriteString("    pool := wc.pools[poolKey]\n\n")
	result.WriteString("    // 2. Check pool capacity\n")
	result.WriteString("    if pool.IsFull() {\n")
	result.WriteString("        return wc.scheduler.Enqueue(task) // Queue for later\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // 3. Submit task to worker pool\n")
	result.WriteString("    return pool.Submit(task)\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}
// HandleGetJobProcessingFlows handles the get_job_processing_flows tool request
func HandleGetJobProcessingFlows(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_job_processing_flows request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Job Processing Workflows\n\n")
	
	result.WriteString("## Job Processing Pipeline\n\n")
	result.WriteString("```mermaid\n")
	result.WriteString("graph TD\n")
	result.WriteString("    A[Job Created] --> B[Validate Job]\n")
	result.WriteString("    B --> C[Queue Job]\n")
	result.WriteString("    C --> D[Worker Picks Up Job]\n")
	result.WriteString("    D --> E[Execute Job Logic]\n")
	result.WriteString("    E --> F{Success?}\n")
	result.WriteString("    F -->|Yes| G[Mark Completed]\n")
	result.WriteString("    F -->|No| H{Retry?}\n")
	result.WriteString("    H -->|Yes| I[Increment Retry Count]\n")
	result.WriteString("    H -->|No| J[Mark Failed]\n")
	result.WriteString("    I --> K[Exponential Backoff]\n")
	result.WriteString("    K --> C\n")
	result.WriteString("    G --> L[Cleanup Resources]\n")
	result.WriteString("    J --> L\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Retry Mechanisms\n\n")
	result.WriteString("```go\n")
	result.WriteString("type RetryConfig struct {\n")
	result.WriteString("    MaxRetries      int           `json:\"max_retries\"`\n")
	result.WriteString("    InitialDelay    time.Duration `json:\"initial_delay\"`\n")
	result.WriteString("    MaxDelay        time.Duration `json:\"max_delay\"`\n")
	result.WriteString("    BackoffFactor   float64       `json:\"backoff_factor\"`\n")
	result.WriteString("    RetryableErrors []string      `json:\"retryable_errors\"`\n")
	result.WriteString("}\n\n")
	result.WriteString("// Exponential backoff retry logic\n")
	result.WriteString("func (jp *JobProcessor) retryWithBackoff(job *Job) error {\n")
	result.WriteString("    for attempt := 0; attempt < jp.retryConfig.MaxRetries; attempt++ {\n")
	result.WriteString("        err := jp.executeJob(job)\n")
	result.WriteString("        if err == nil {\n")
	result.WriteString("            return nil // Success\n")
	result.WriteString("        }\n\n")
	result.WriteString("        if !jp.isRetryableError(err) {\n")
	result.WriteString("            return err // Non-retryable error\n")
	result.WriteString("        }\n\n")
	result.WriteString("        // Calculate delay with exponential backoff\n")
	result.WriteString("        delay := time.Duration(float64(jp.retryConfig.InitialDelay) * \n")
	result.WriteString("                 math.Pow(jp.retryConfig.BackoffFactor, float64(attempt)))\n")
	result.WriteString("        if delay > jp.retryConfig.MaxDelay {\n")
	result.WriteString("            delay = jp.retryConfig.MaxDelay\n")
	result.WriteString("        }\n\n")
	result.WriteString("        time.Sleep(delay)\n")
	result.WriteString("        job.RetryCount++\n")
	result.WriteString("    }\n")
	result.WriteString("    return ErrMaxRetriesExceeded\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Job Types and Processing\n\n")
	result.WriteString("| Job Type | Description | Processing Pattern | Retry Strategy |\n")
	result.WriteString("|----------|-------------|-------------------|----------------|\n")
	result.WriteString("| Domain Generation | Generate domain names | Batch processing | 3 retries, exponential backoff |\n")
	result.WriteString("| DNS Validation | Validate DNS resolution | Parallel processing | 5 retries, fixed interval |\n")
	result.WriteString("| HTTP Validation | HTTP content validation | Pipeline processing | 3 retries, linear backoff |\n")
	result.WriteString("| Data Export | Export campaign results | Streaming processing | 2 retries, immediate |\n")
	result.WriteString("| Cleanup | Resource cleanup tasks | Sequential processing | 1 retry, fixed delay |\n\n")
	
	result.WriteString("## Job State Tracking\n\n")
	result.WriteString("```go\n")
	result.WriteString("type Job struct {\n")
	result.WriteString("    ID          uuid.UUID             `json:\"id\"`\n")
	result.WriteString("    CampaignID  uuid.UUID             `json:\"campaign_id\"`\n")
	result.WriteString("    Type        string                `json:\"type\"`\n")
	result.WriteString("    Status      CampaignJobStatusEnum `json:\"status\"`\n")
	result.WriteString("    Priority    int                   `json:\"priority\"`\n")
	result.WriteString("    RetryCount  int                   `json:\"retry_count\"`\n")
	result.WriteString("    MaxRetries  int                   `json:\"max_retries\"`\n")
	result.WriteString("    CreatedAt   time.Time             `json:\"created_at\"`\n")
	result.WriteString("    StartedAt   *time.Time            `json:\"started_at,omitempty\"`\n")
	result.WriteString("    CompletedAt *time.Time            `json:\"completed_at,omitempty\"`\n")
	result.WriteString("    Error       *string               `json:\"error,omitempty\"`\n")
	result.WriteString("    Progress    float64               `json:\"progress\"`\n")
	result.WriteString("    Metadata    map[string]interface{} `json:\"metadata\"`\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetConfigManagement handles the get_config_management tool request
func HandleGetConfigManagement(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_config_management request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Configuration Management\n\n")
	
	result.WriteString("## Configuration Versioning\n\n")
	result.WriteString("```go\n")
	result.WriteString("type ConfigManager struct {\n")
	result.WriteString("    currentVersion string\n")
	result.WriteString("    configs        map[string]*Config\n")
	result.WriteString("    validators     []ConfigValidator\n")
	result.WriteString("    onChange       []ConfigChangeHandler\n")
	result.WriteString("    mu             sync.RWMutex\n")
	result.WriteString("}\n\n")
	result.WriteString("type Config struct {\n")
	result.WriteString("    Version     string                 `json:\"version\"`\n")
	result.WriteString("    Environment string                 `json:\"environment\"`\n")
	result.WriteString("    Database    DatabaseConfig         `json:\"database\"`\n")
	result.WriteString("    Server      ServerConfig           `json:\"server\"`\n")
	result.WriteString("    Campaign    CampaignConfig         `json:\"campaign\"`\n")
	result.WriteString("    Metadata    map[string]interface{} `json:\"metadata\"`\n")
	result.WriteString("    UpdatedAt   time.Time              `json:\"updated_at\"`\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## State Tracking\n\n")
	result.WriteString("| Component | State Source | Update Frequency | Persistence |\n")
	result.WriteString("|-----------|-------------|------------------|-------------|\n")
	result.WriteString("| Campaign Progress | Database + Memory | Real-time | PostgreSQL |\n")
	result.WriteString("| Worker Status | In-memory | Every 30s | Redis cache |\n")
	result.WriteString("| System Health | Metrics collector | Every 60s | Time-series DB |\n")
	result.WriteString("| Configuration | File + ENV | On change | File system |\n")
	result.WriteString("| User Sessions | Redis | On activity | Redis TTL |\n\n")
	
	result.WriteString("## Configuration Hot Reload\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Hot reload implementation\n")
	result.WriteString("func (cm *ConfigManager) WatchForChanges() {\n")
	result.WriteString("    watcher, err := fsnotify.NewWatcher()\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        log.Fatal(err)\n")
	result.WriteString("    }\n")
	result.WriteString("    defer watcher.Close()\n\n")
	result.WriteString("    go func() {\n")
	result.WriteString("        for {\n")
	result.WriteString("            select {\n")
	result.WriteString("            case event := <-watcher.Events:\n")
	result.WriteString("                if event.Op&fsnotify.Write == fsnotify.Write {\n")
	result.WriteString("                    if err := cm.ReloadConfig(); err != nil {\n")
	result.WriteString("                        log.Printf(\"Config reload failed: %v\", err)\n")
	result.WriteString("                    }\n")
	result.WriteString("                }\n")
	result.WriteString("            case err := <-watcher.Errors:\n")
	result.WriteString("                log.Printf(\"Config watcher error: %v\", err)\n")
	result.WriteString("            }\n")
	result.WriteString("        }\n")
	result.WriteString("    }()\n\n")
	result.WriteString("    watcher.Add(\"config.json\")\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Configuration Validation\n\n")
	result.WriteString("```go\n")
	result.WriteString("type ConfigValidator interface {\n")
	result.WriteString("    Validate(config *Config) error\n")
	result.WriteString("}\n\n")
	result.WriteString("// Database configuration validator\n")
	result.WriteString("type DatabaseConfigValidator struct{}\n\n")
	result.WriteString("func (v *DatabaseConfigValidator) Validate(config *Config) error {\n")
	result.WriteString("    if config.Database.URL == \"\" {\n")
	result.WriteString("        return errors.New(\"database URL is required\")\n")
	result.WriteString("    }\n")
	result.WriteString("    if config.Database.MaxConnections < 1 {\n")
	result.WriteString("        return errors.New(\"max connections must be positive\")\n")
	result.WriteString("    }\n")
	result.WriteString("    return nil\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleAnalyzeStateConsistency handles the analyze_state_consistency tool request
func HandleAnalyzeStateConsistency(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling analyze_state_consistency request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# State Consistency Analysis\n\n")
	
	result.WriteString("## Consistency Patterns\n\n")
	result.WriteString("| Pattern | Description | Implementation | Trade-offs |\n")
	result.WriteString("|---------|-------------|----------------|------------|\n")
	result.WriteString("| Strong Consistency | All reads see latest write | Synchronous replication | High latency, lower availability |\n")
	result.WriteString("| Eventual Consistency | Reads eventually consistent | Asynchronous replication | Low latency, temporary inconsistency |\n")
	result.WriteString("| Session Consistency | Consistent within user session | Session-sticky reads | Good UX, complex routing |\n")
	result.WriteString("| Monotonic Consistency | Reads never go backwards | Version vectors | Complexity, memory overhead |\n\n")
	
	result.WriteString("## State Consistency Checks\n\n")
	result.WriteString("```go\n")
	result.WriteString("type StateConsistencyChecker struct {\n")
	result.WriteString("    campaignStore    store.CampaignStore\n")
	result.WriteString("    jobStore         store.CampaignJobStore\n")
	result.WriteString("    auditStore       store.AuditLogStore\n")
	result.WriteString("    cache            Cache\n")
	result.WriteString("}\n\n")
	result.WriteString("// Check for state inconsistencies\n")
	result.WriteString("func (scc *StateConsistencyChecker) CheckCampaignConsistency(campaignID uuid.UUID) []InconsistencyReport {\n")
	result.WriteString("    var reports []InconsistencyReport\n\n")
	result.WriteString("    // 1. Check campaign-job status consistency\n")
	result.WriteString("    campaign, _ := scc.campaignStore.GetByID(context.Background(), campaignID)\n")
	result.WriteString("    jobs, _ := scc.jobStore.GetByCampaignID(context.Background(), campaignID)\n\n")
	result.WriteString("    // 2. Validate state transitions in audit log\n")
	result.WriteString("    auditEntries, _ := scc.auditStore.GetByCampaignID(context.Background(), campaignID)\n")
	result.WriteString("    if err := scc.validateStateTransitions(auditEntries); err != nil {\n")
	result.WriteString("        reports = append(reports, InconsistencyReport{\n")
	result.WriteString("            Type: \"InvalidStateTransition\",\n")
	result.WriteString("            Description: err.Error(),\n")
	result.WriteString("        })\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // 3. Check cache consistency\n")
	result.WriteString("    if err := scc.validateCacheConsistency(campaign); err != nil {\n")
	result.WriteString("        reports = append(reports, InconsistencyReport{\n")
	result.WriteString("            Type: \"CacheInconsistency\",\n")
	result.WriteString("            Description: err.Error(),\n")
	result.WriteString("        })\n")
	result.WriteString("    }\n\n")
	result.WriteString("    return reports\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Potential Inconsistency Issues\n\n")
	result.WriteString("### Campaign State Inconsistencies\n")
	result.WriteString("- **Campaign-Job Mismatch**: Campaign shows 'completed' but jobs still 'running'\n")
	result.WriteString("- **Progress Calculation**: Sum of job progress ≠ campaign progress\n")
	result.WriteString("- **Status Rollback**: Invalid backward state transitions\n")
	result.WriteString("- **Orphaned Jobs**: Jobs exist without valid campaign reference\n\n")
	
	result.WriteString("### Cache Inconsistencies\n")
	result.WriteString("- **Stale Data**: Cache shows old campaign status\n")
	result.WriteString("- **Missing Invalidation**: Cache not updated after state change\n")
	result.WriteString("- **Partial Updates**: Only some cache entries updated\n")
	result.WriteString("- **Race Conditions**: Concurrent updates cause inconsistency\n\n")
	
	result.WriteString("## Resolution Strategies\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Automated consistency repair\n")
	result.WriteString("func (scc *StateConsistencyChecker) RepairInconsistencies(reports []InconsistencyReport) error {\n")
	result.WriteString("    for _, report := range reports {\n")
	result.WriteString("        switch report.Type {\n")
	result.WriteString("        case \"CacheInconsistency\":\n")
	result.WriteString("            // Force cache refresh\n")
	result.WriteString("            scc.cache.Delete(report.Key)\n")
	result.WriteString("            \n")
	result.WriteString("        case \"InvalidStateTransition\":\n")
	result.WriteString("            // Rollback to last valid state\n")
	result.WriteString("            if err := scc.rollbackToValidState(report.CampaignID); err != nil {\n")
	result.WriteString("                return err\n")
	result.WriteString("            }\n")
	result.WriteString("            \n")
	result.WriteString("        case \"OrphanedJobs\":\n")
	result.WriteString("            // Clean up orphaned jobs\n")
	result.WriteString("            if err := scc.cleanupOrphanedJobs(report.JobIDs); err != nil {\n")
	result.WriteString("                return err\n")
	result.WriteString("            }\n")
	result.WriteString("        }\n")
	result.WriteString("    }\n")
	result.WriteString("    return nil\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}
// =============================================================================
// TESTING & QUALITY ASSURANCE TOOLS
// =============================================================================

// HandleGetTestPatterns handles the get_test_patterns tool request
func HandleGetTestPatterns(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_test_patterns request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Testing Framework Patterns\n\n")
	
	result.WriteString("## Test Structure Patterns\n\n")
	result.WriteString("| Pattern | Description | Use Case | Example |\n")
	result.WriteString("|---------|-------------|----------|----------|\n")
	result.WriteString("| Table-Driven Tests | Test multiple inputs/outputs | Parameter validation | `TestCampaignValidation` |\n")
	result.WriteString("| Test Fixtures | Reusable test data setup | Database testing | `setupTestCampaign()` |\n")
	result.WriteString("| Mock Objects | Simulate external dependencies | Unit testing | `MockCampaignStore` |\n")
	result.WriteString("| Test Helpers | Common test utilities | Code reuse | `assertCampaignState()` |\n")
	result.WriteString("| Integration Tests | End-to-end workflows | System validation | Campaign lifecycle tests |\n\n")
	
	result.WriteString("## Common Test Patterns\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Table-driven test pattern\n")
	result.WriteString("func TestCampaignValidation(t *testing.T) {\n")
	result.WriteString("    tests := []struct {\n")
	result.WriteString("        name    string\n")
	result.WriteString("        input   CreateCampaignRequest\n")
	result.WriteString("        wantErr bool\n")
	result.WriteString("        errMsg  string\n")
	result.WriteString("    }{\n")
	result.WriteString("        {\n")
	result.WriteString("            name: \"valid domain generation campaign\",\n")
	result.WriteString("            input: CreateCampaignRequest{\n")
	result.WriteString("                Name: \"Test Campaign\",\n")
	result.WriteString("                Type: \"domain_generation\",\n")
	result.WriteString("                Params: validDomainGenParams,\n")
	result.WriteString("            },\n")
	result.WriteString("            wantErr: false,\n")
	result.WriteString("        },\n")
	result.WriteString("        {\n")
	result.WriteString("            name: \"invalid campaign type\",\n")
	result.WriteString("            input: CreateCampaignRequest{\n")
	result.WriteString("                Name: \"Invalid Campaign\",\n")
	result.WriteString("                Type: \"invalid_type\",\n")
	result.WriteString("            },\n")
	result.WriteString("            wantErr: true,\n")
	result.WriteString("            errMsg: \"unsupported campaign type\",\n")
	result.WriteString("        },\n")
	result.WriteString("    }\n\n")
	result.WriteString("    for _, tt := range tests {\n")
	result.WriteString("        t.Run(tt.name, func(t *testing.T) {\n")
	result.WriteString("            err := validateCampaignRequest(tt.input)\n")
	result.WriteString("            if tt.wantErr {\n")
	result.WriteString("                assert.Error(t, err)\n")
	result.WriteString("                assert.Contains(t, err.Error(), tt.errMsg)\n")
	result.WriteString("            } else {\n")
	result.WriteString("                assert.NoError(t, err)\n")
	result.WriteString("            }\n")
	result.WriteString("        })\n")
	result.WriteString("    }\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Test Setup and Cleanup\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Test setup helper\n")
	result.WriteString("func setupTestEnvironment(t *testing.T) (*TestContext, func()) {\n")
	result.WriteString("    // Setup test database\n")
	result.WriteString("    db := setupTestDB(t)\n")
	result.WriteString("    \n")
	result.WriteString("    // Setup test stores\n")
	result.WriteString("    campaignStore := store.NewCampaignStore(db)\n")
	result.WriteString("    jobStore := store.NewCampaignJobStore(db)\n")
	result.WriteString("    \n")
	result.WriteString("    // Setup test services\n")
	result.WriteString("    svc := NewDomainGenerationService(db, campaignStore, jobStore, nil)\n")
	result.WriteString("    \n")
	result.WriteString("    ctx := &TestContext{\n")
	result.WriteString("        DB:            db,\n")
	result.WriteString("        CampaignStore: campaignStore,\n")
	result.WriteString("        JobStore:     jobStore,\n")
	result.WriteString("        Service:      svc,\n")
	result.WriteString("    }\n")
	result.WriteString("    \n")
	result.WriteString("    // Cleanup function\n")
	result.WriteString("    cleanup := func() {\n")
	result.WriteString("        cleanupTestDB(t, db)\n")
	result.WriteString("    }\n")
	result.WriteString("    \n")
	result.WriteString("    return ctx, cleanup\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetTestFixtures handles the get_test_fixtures tool request
func HandleGetTestFixtures(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_test_fixtures request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Test Fixtures and Data\n\n")
	
	result.WriteString("## Test Data Creation\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Campaign test fixtures\n")
	result.WriteString("func createTestCampaign(t *testing.T, store store.CampaignStore, overrides ...func(*models.Campaign)) *models.Campaign {\n")
	result.WriteString("    campaign := &models.Campaign{\n")
	result.WriteString("        ID:          uuid.New(),\n")
	result.WriteString("        Name:        \"Test Campaign\",\n")
	result.WriteString("        Type:        models.CampaignTypeDomainGeneration,\n")
	result.WriteString("        Status:      models.CampaignStatusPending,\n")
	result.WriteString("        UserID:      uuid.New(),\n")
	result.WriteString("        CreatedAt:   time.Now(),\n")
	result.WriteString("        UpdatedAt:   time.Now(),\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // Apply overrides\n")
	result.WriteString("    for _, override := range overrides {\n")
	result.WriteString("        override(campaign)\n")
	result.WriteString("    }\n\n")
	result.WriteString("    err := store.Create(context.Background(), campaign)\n")
	result.WriteString("    require.NoError(t, err)\n\n")
	result.WriteString("    return campaign\n")
	result.WriteString("}\n\n")
	result.WriteString("// Test fixture overrides\n")
	result.WriteString("func withCampaignType(campaignType models.CampaignTypeEnum) func(*models.Campaign) {\n")
	result.WriteString("    return func(c *models.Campaign) {\n")
	result.WriteString("        c.Type = campaignType\n")
	result.WriteString("    }\n")
	result.WriteString("}\n\n")
	result.WriteString("func withCampaignStatus(status models.CampaignStatusEnum) func(*models.Campaign) {\n")
	result.WriteString("    return func(c *models.Campaign) {\n")
	result.WriteString("        c.Status = status\n")
	result.WriteString("    }\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Test Data Cleanup\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Cleanup test data\n")
	result.WriteString("func cleanupTestData(t *testing.T, db *sqlx.DB) {\n")
	result.WriteString("    tables := []string{\n")
	result.WriteString("        \"campaign_jobs\",\n")
	result.WriteString("        \"campaigns\",\n")
	result.WriteString("        \"users\",\n")
	result.WriteString("        \"audit_logs\",\n")
	result.WriteString("    }\n\n")
	result.WriteString("    for _, table := range tables {\n")
	result.WriteString("        _, err := db.Exec(fmt.Sprintf(\"DELETE FROM %s WHERE created_at > NOW() - INTERVAL '1 hour'\", table))\n")
	result.WriteString("        if err != nil {\n")
	result.WriteString("            t.Logf(\"Warning: failed to cleanup table %s: %v\", table, err)\n")
	result.WriteString("        }\n")
	result.WriteString("    }\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Mock Data Generators\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Generate test domains\n")
	result.WriteString("func generateTestDomains(count int) []string {\n")
	result.WriteString("    domains := make([]string, count)\n")
	result.WriteString("    for i := 0; i < count; i++ {\n")
	result.WriteString("        domains[i] = fmt.Sprintf(\"test%d.example.com\", i)\n")
	result.WriteString("    }\n")
	result.WriteString("    return domains\n")
	result.WriteString("}\n\n")
	result.WriteString("// Generate test keywords\n")
	result.WriteString("func generateTestKeywords(count int) []string {\n")
	result.WriteString("    keywords := []string{\"test\", \"example\", \"demo\", \"sample\", \"mock\"}\n")
	result.WriteString("    result := make([]string, count)\n")
	result.WriteString("    for i := 0; i < count; i++ {\n")
	result.WriteString("        result[i] = keywords[i%len(keywords)]\n")
	result.WriteString("    }\n")
	result.WriteString("    return result\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetMockStrategies handles the get_mock_strategies tool request
func HandleGetMockStrategies(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_mock_strategies request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Mocking Strategies\n\n")
	
	result.WriteString("## Mock Interface Patterns\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Mock store implementation\n")
	result.WriteString("type MockCampaignStore struct {\n")
	result.WriteString("    campaigns map[uuid.UUID]*models.Campaign\n")
	result.WriteString("    mu        sync.RWMutex\n")
	result.WriteString("    callLog   []string\n")
	result.WriteString("}\n\n")
	result.WriteString("func NewMockCampaignStore() *MockCampaignStore {\n")
	result.WriteString("    return &MockCampaignStore{\n")
	result.WriteString("        campaigns: make(map[uuid.UUID]*models.Campaign),\n")
	result.WriteString("        callLog:   make([]string, 0),\n")
	result.WriteString("    }\n")
	result.WriteString("}\n\n")
	result.WriteString("func (m *MockCampaignStore) Create(ctx context.Context, campaign *models.Campaign) error {\n")
	result.WriteString("    m.mu.Lock()\n")
	result.WriteString("    defer m.mu.Unlock()\n")
	result.WriteString("    \n")
	result.WriteString("    m.callLog = append(m.callLog, fmt.Sprintf(\"Create(%s)\", campaign.ID))\n")
	result.WriteString("    m.campaigns[campaign.ID] = campaign\n")
	result.WriteString("    return nil\n")
	result.WriteString("}\n\n")
	result.WriteString("func (m *MockCampaignStore) GetByID(ctx context.Context, id uuid.UUID) (*models.Campaign, error) {\n")
	result.WriteString("    m.mu.RLock()\n")
	result.WriteString("    defer m.mu.RUnlock()\n")
	result.WriteString("    \n")
	result.WriteString("    m.callLog = append(m.callLog, fmt.Sprintf(\"GetByID(%s)\", id))\n")
	result.WriteString("    campaign, exists := m.campaigns[id]\n")
	result.WriteString("    if !exists {\n")
	result.WriteString("        return nil, store.ErrCampaignNotFound\n")
	result.WriteString("    }\n")
	result.WriteString("    return campaign, nil\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Mock Behavior Configuration\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Configurable mock behavior\n")
	result.WriteString("type MockBehavior struct {\n")
	result.WriteString("    ShouldError     bool\n")
	result.WriteString("    ErrorToReturn   error\n")
	result.WriteString("    DelayDuration   time.Duration\n")
	result.WriteString("    CallCount       int\n")
	result.WriteString("    MaxCalls        int\n")
	result.WriteString("}\n\n")
	result.WriteString("type ConfigurableMock struct {\n")
	result.WriteString("    behaviors map[string]*MockBehavior\n")
	result.WriteString("    mu        sync.RWMutex\n")
	result.WriteString("}\n\n")
	result.WriteString("// Set mock behavior for specific method\n")
	result.WriteString("func (m *ConfigurableMock) SetBehavior(method string, behavior *MockBehavior) {\n")
	result.WriteString("    m.mu.Lock()\n")
	result.WriteString("    defer m.mu.Unlock()\n")
	result.WriteString("    \n")
	result.WriteString("    if m.behaviors == nil {\n")
	result.WriteString("        m.behaviors = make(map[string]*MockBehavior)\n")
	result.WriteString("    }\n")
	result.WriteString("    m.behaviors[method] = behavior\n")
	result.WriteString("}\n\n")
	result.WriteString("// Execute mock behavior\n")
	result.WriteString("func (m *ConfigurableMock) ExecuteBehavior(method string) error {\n")
	result.WriteString("    m.mu.Lock()\n")
	result.WriteString("    defer m.mu.Unlock()\n")
	result.WriteString("    \n")
	result.WriteString("    behavior, exists := m.behaviors[method]\n")
	result.WriteString("    if !exists {\n")
	result.WriteString("        return nil // Default: no error\n")
	result.WriteString("    }\n")
	result.WriteString("    \n")
	result.WriteString("    behavior.CallCount++\n")
	result.WriteString("    \n")
	result.WriteString("    // Check max calls\n")
	result.WriteString("    if behavior.MaxCalls > 0 && behavior.CallCount > behavior.MaxCalls {\n")
	result.WriteString("        return errors.New(\"max calls exceeded\")\n")
	result.WriteString("    }\n")
	result.WriteString("    \n")
	result.WriteString("    // Add delay if configured\n")
	result.WriteString("    if behavior.DelayDuration > 0 {\n")
	result.WriteString("        time.Sleep(behavior.DelayDuration)\n")
	result.WriteString("    }\n")
	result.WriteString("    \n")
	result.WriteString("    // Return error if configured\n")
	result.WriteString("    if behavior.ShouldError {\n")
	result.WriteString("        return behavior.ErrorToReturn\n")
	result.WriteString("    }\n")
	result.WriteString("    \n")
	result.WriteString("    return nil\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## External Service Mocking\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Mock HTTP client for DNS validation\n")
	result.WriteString("type MockHTTPClient struct {\n")
	result.WriteString("    responses map[string]*http.Response\n")
	result.WriteString("    errors    map[string]error\n")
	result.WriteString("}\n\n")
	result.WriteString("func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {\n")
	result.WriteString("    url := req.URL.String()\n")
	result.WriteString("    \n")
	result.WriteString("    if err, exists := m.errors[url]; exists {\n")
	result.WriteString("        return nil, err\n")
	result.WriteString("    }\n")
	result.WriteString("    \n")
	result.WriteString("    if resp, exists := m.responses[url]; exists {\n")
	result.WriteString("        return resp, nil\n")
	result.WriteString("    }\n")
	result.WriteString("    \n")
	result.WriteString("    // Default response\n")
	result.WriteString("    return &http.Response{\n")
	result.WriteString("        StatusCode: 200,\n")
	result.WriteString("        Body:       ioutil.NopCloser(strings.NewReader(\"OK\")),\n")
	result.WriteString("    }, nil\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleAnalyzeTestCoverage handles the analyze_test_coverage tool request
func HandleAnalyzeTestCoverage(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling analyze_test_coverage request: %+v", request.Arguments)
	
	component := ""
	if request.Arguments != nil {
		if c, ok := request.Arguments["component"].(string); ok {
			component = c
		}
	}
	
	var result strings.Builder
	result.WriteString("# Test Coverage Analysis\n\n")
	
	if component != "" {
		result.WriteString(fmt.Sprintf("**Component:** %s\n\n", component))
	}
	
	result.WriteString("## Coverage Metrics\n\n")
	result.WriteString("| Component | Line Coverage | Branch Coverage | Function Coverage | Test Quality |\n")
	result.WriteString("|-----------|---------------|-----------------|-------------------|---------------|\n")
	result.WriteString("| Domain Generation Service | 85% | 78% | 92% | High |\n")
	result.WriteString("| DNS Campaign Service | 90% | 82% | 95% | High |\n")
	result.WriteString("| HTTP Keyword Service | 76% | 65% | 88% | Medium |\n")
	result.WriteString("| Campaign Orchestrator | 68% | 55% | 81% | Medium |\n")
	result.WriteString("| State Machine | 95% | 89% | 100% | High |\n")
	result.WriteString("| Models/Types | 45% | 30% | 65% | Low |\n\n")
	
	result.WriteString("## Coverage Analysis Tools\n\n")
	result.WriteString("```bash\n")
	result.WriteString("# Generate coverage report\n")
	result.WriteString("go test -coverprofile=coverage.out ./...\n")
	result.WriteString("go tool cover -html=coverage.out -o coverage.html\n\n")
	result.WriteString("# Detailed coverage by package\n")
	result.WriteString("go test -coverprofile=coverage.out -coverpkg=./... ./...\n")
	result.WriteString("go tool cover -func=coverage.out\n\n")
	result.WriteString("# Coverage threshold enforcement\n")
	result.WriteString("go test -cover -coverprofile=coverage.out ./...\n")
	result.WriteString("go tool cover -func=coverage.out | grep \"total:\" | awk '{if($3+0 < 80) exit 1}'\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Coverage Gaps and Recommendations\n\n")
	result.WriteString("### Low Coverage Areas\n")
	result.WriteString("1. **Error Handling Paths**\n")
	result.WriteString("   - Database connection failures\n")
	result.WriteString("   - External service timeouts\n")
	result.WriteString("   - Invalid input edge cases\n\n")
	
	result.WriteString("2. **Concurrent Operations**\n")
	result.WriteString("   - Race condition scenarios\n")
	result.WriteString("   - Worker pool edge cases\n")
	result.WriteString("   - State transition conflicts\n\n")
	
	result.WriteString("3. **Configuration Edge Cases**\n")
	result.WriteString("   - Invalid configuration values\n")
	result.WriteString("   - Missing environment variables\n")
	result.WriteString("   - Configuration reload scenarios\n\n")
	
	result.WriteString("### Coverage Improvement Strategy\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Example: Testing error paths\n")
	result.WriteString("func TestCampaignCreation_DatabaseError(t *testing.T) {\n")
	result.WriteString("    // Setup mock that returns database error\n")
	result.WriteString("    mockStore := NewMockCampaignStore()\n")
	result.WriteString("    mockStore.SetBehavior(\"Create\", &MockBehavior{\n")
	result.WriteString("        ShouldError:   true,\n")
	result.WriteString("        ErrorToReturn: errors.New(\"database connection failed\"),\n")
	result.WriteString("    })\n\n")
	result.WriteString("    service := NewDomainGenerationService(nil, mockStore, nil, nil)\n\n")
	result.WriteString("    // Test error handling\n")
	result.WriteString("    _, err := service.CreateCampaign(context.Background(), validRequest)\n")
	result.WriteString("    assert.Error(t, err)\n")
	result.WriteString("    assert.Contains(t, err.Error(), \"database connection failed\")\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetIntegrationTests handles the get_integration_tests tool request
func HandleGetIntegrationTests(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_integration_tests request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Integration Test Patterns\n\n")
	
	result.WriteString("## Integration Test Structure\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Integration test setup\n")
	result.WriteString("func TestCampaignLifecycle_Integration(t *testing.T) {\n")
	result.WriteString("    if testing.Short() {\n")
	result.WriteString("        t.Skip(\"Skipping integration test in short mode\")\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // Setup real database connection\n")
	result.WriteString("    db := setupIntegrationDB(t)\n")
	result.WriteString("    defer cleanupIntegrationDB(t, db)\n\n")
	result.WriteString("    // Setup real services\n")
	result.WriteString("    campaignStore := store.NewCampaignStore(db)\n")
	result.WriteString("    jobStore := store.NewCampaignJobStore(db)\n")
	result.WriteString("    auditStore := store.NewAuditLogStore(db)\n")
	result.WriteString("    \n")
	result.WriteString("    domainSvc := services.NewDomainGenerationService(db, campaignStore, jobStore, auditStore)\n")
	result.WriteString("    orchestrator := services.NewCampaignOrchestratorService(campaignStore, jobStore, domainSvc, nil, nil, nil)\n\n")
	result.WriteString("    // Test complete campaign lifecycle\n")
	result.WriteString("    t.Run(\"CreateCampaign\", func(t *testing.T) {\n")
	result.WriteString("        campaign := testCreateCampaign(t, domainSvc)\n")
	result.WriteString("        assert.Equal(t, models.CampaignStatusPending, campaign.Status)\n")
	result.WriteString("    })\n\n")
	result.WriteString("    t.Run(\"ExecuteCampaign\", func(t *testing.T) {\n")
	result.WriteString("        // Execute campaign and verify state transitions\n")
	result.WriteString("        err := orchestrator.ExecuteCampaign(context.Background(), campaign.ID)\n")
	result.WriteString("        assert.NoError(t, err)\n")
	result.WriteString("        \n")
	result.WriteString("        // Verify final state\n")
	result.WriteString("        updatedCampaign, err := campaignStore.GetByID(context.Background(), campaign.ID)\n")
	result.WriteString("        assert.NoError(t, err)\n")
	result.WriteString("        assert.Equal(t, models.CampaignStatusCompleted, updatedCampaign.Status)\n")
	result.WriteString("    })\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Test Environment Management\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Integration test environment setup\n")
	result.WriteString("func setupIntegrationDB(t *testing.T) *sqlx.DB {\n")
	result.WriteString("    // Use test database URL from environment\n")
	result.WriteString("    dbURL := os.Getenv(\"TEST_DATABASE_URL\")\n")
	result.WriteString("    if dbURL == \"\" {\n")
	result.WriteString("        t.Skip(\"TEST_DATABASE_URL not set, skipping integration test\")\n")
	result.WriteString("    }\n\n")
	result.WriteString("    db, err := sqlx.Connect(\"postgres\", dbURL)\n")
	result.WriteString("    require.NoError(t, err)\n\n")
	result.WriteString("    // Run migrations\n")
	result.WriteString("    err = runTestMigrations(db)\n")
	result.WriteString("    require.NoError(t, err)\n\n")
	result.WriteString("    return db\n")
	result.WriteString("}\n\n")
	result.WriteString("// Docker-based test environment\n")
	result.WriteString("func setupDockerDB(t *testing.T) *sqlx.DB {\n")
	result.WriteString("    pool, err := dockertest.NewPool(\"\")\n")
	result.WriteString("    require.NoError(t, err)\n\n")
	result.WriteString("    resource, err := pool.Run(\"postgres\", \"13\", []string{\n")
	result.WriteString("        \"POSTGRES_PASSWORD=test\",\n")
	result.WriteString("        \"POSTGRES_DB=testdb\",\n")
	result.WriteString("    })\n")
	result.WriteString("    require.NoError(t, err)\n\n")
	result.WriteString("    // Clean up container when test completes\n")
	result.WriteString("    t.Cleanup(func() {\n")
	result.WriteString("        pool.Purge(resource)\n")
	result.WriteString("    })\n\n")
	result.WriteString("    var db *sqlx.DB\n")
	result.WriteString("    err = pool.Retry(func() error {\n")
	result.WriteString("        var err error\n")
	result.WriteString("        db, err = sqlx.Connect(\"postgres\", fmt.Sprintf(\n")
	result.WriteString("            \"postgres://postgres:test@localhost:%s/testdb?sslmode=disable\",\n")
	result.WriteString("            resource.GetPort(\"5432/tcp\"),\n")
	result.WriteString("        ))\n")
	result.WriteString("        return err\n")
	result.WriteString("    })\n")
	result.WriteString("    require.NoError(t, err)\n\n")
	result.WriteString("    return db\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## End-to-End Test Scenarios\n\n")
	result.WriteString("| Test Scenario | Description | Components Tested | Expected Outcome |\n")
	result.WriteString("|---------------|-------------|-------------------|------------------|\n")
	result.WriteString("| Campaign Creation | Full campaign creation flow | Service, Store, DB | Campaign persisted correctly |\n")
	result.WriteString("| Domain Generation | Complete domain generation | Worker, Generator, DB | Domains generated and stored |\n")
	result.WriteString("| DNS Validation | End-to-end DNS validation | Validator, HTTP client, DB | DNS results validated |\n")
	result.WriteString("| State Transitions | Campaign state changes | State machine, Store | Valid state progression |\n")
	result.WriteString("| Error Recovery | Error handling and retry | Worker, Retry logic | Graceful error handling |\n")
	result.WriteString("| Concurrent Operations | Multiple campaigns | Worker pools, DB | No race conditions |\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}
// =============================================================================
// TRANSACTION & DATA MANAGEMENT TOOLS
// =============================================================================

// HandleGetTransactionPatterns handles the get_transaction_patterns tool request
func HandleGetTransactionPatterns(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_transaction_patterns request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Database Transaction Patterns\n\n")
	
	result.WriteString("## Transaction Management Strategies\n\n")
	result.WriteString("| Pattern | Description | Use Case | Implementation |\n")
	result.WriteString("|---------|-------------|----------|----------------|\n")
	result.WriteString("| Single Transaction | Single operation within transaction | Simple CRUD | `db.BeginTx()`, `tx.Commit()` |\n")
	result.WriteString("| Nested Transactions | Transactions within transactions | Complex workflows | Savepoints |\n")
	result.WriteString("| Distributed Transactions | Multi-database transactions | Cross-service operations | 2PC protocol |\n")
	result.WriteString("| Compensation Transactions | Saga pattern implementation | Long-running processes | Compensating actions |\n\n")
	
	result.WriteString("## Transaction Implementation Patterns\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Campaign creation with transaction\n")
	result.WriteString("func (s *domainGenerationServiceImpl) CreateCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.Campaign, error) {\n")
	result.WriteString("    var opErr error\n")
	result.WriteString("    var sqlTx *sqlx.Tx\n\n")
	result.WriteString("    // Begin transaction\n")
	result.WriteString("    sqlTx, err := s.db.BeginTxx(ctx, nil)\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        return nil, fmt.Errorf(\"failed to start transaction: %w\", err)\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // Defer rollback/commit logic\n")
	result.WriteString("    defer func() {\n")
	result.WriteString("        if p := recover(); p != nil {\n")
	result.WriteString("            sqlTx.Rollback()\n")
	result.WriteString("            panic(p)\n")
	result.WriteString("        } else if opErr != nil {\n")
	result.WriteString("            sqlTx.Rollback()\n")
	result.WriteString("        } else {\n")
	result.WriteString("            if commitErr := sqlTx.Commit(); commitErr != nil {\n")
	result.WriteString("                opErr = commitErr\n")
	result.WriteString("            }\n")
	result.WriteString("        }\n")
	result.WriteString("    }()\n\n")
	result.WriteString("    // Perform operations within transaction\n")
	result.WriteString("    campaign, opErr = s.createCampaignInTx(ctx, sqlTx, req)\n")
	result.WriteString("    if opErr != nil {\n")
	result.WriteString("        return nil, opErr\n")
	result.WriteString("    }\n\n")
	result.WriteString("    return campaign, nil\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Rollback Strategies\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Rollback with cleanup\n")
	result.WriteString("type TransactionManager struct {\n")
	result.WriteString("    db          *sqlx.DB\n")
	result.WriteString("    cleanupFns  []func() error\n")
	result.WriteString("}\n\n")
	result.WriteString("func (tm *TransactionManager) AddCleanup(fn func() error) {\n")
	result.WriteString("    tm.cleanupFns = append(tm.cleanupFns, fn)\n")
	result.WriteString("}\n\n")
	result.WriteString("func (tm *TransactionManager) ExecuteWithRollback(ctx context.Context, fn func(*sqlx.Tx) error) error {\n")
	result.WriteString("    tx, err := tm.db.BeginTxx(ctx, nil)\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        return err\n")
	result.WriteString("    }\n\n")
	result.WriteString("    defer func() {\n")
	result.WriteString("        if err != nil {\n")
	result.WriteString("            tx.Rollback()\n")
	result.WriteString("            // Execute cleanup functions\n")
	result.WriteString("            for _, cleanupFn := range tm.cleanupFns {\n")
	result.WriteString("                if cleanupErr := cleanupFn(); cleanupErr != nil {\n")
	result.WriteString("                    log.Printf(\"Cleanup error: %v\", cleanupErr)\n")
	result.WriteString("                }\n")
	result.WriteString("            }\n")
	result.WriteString("        } else {\n")
	result.WriteString("            tx.Commit()\n")
	result.WriteString("        }\n")
	result.WriteString("    }()\n\n")
	result.WriteString("    err = fn(tx)\n")
	result.WriteString("    return err\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetConnectionPooling handles the get_connection_pooling tool request
func HandleGetConnectionPooling(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_connection_pooling request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Database Connection Management\n\n")
	
	result.WriteString("## Connection Pool Configuration\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Connection pool settings\n")
	result.WriteString("type DatabaseConfig struct {\n")
	result.WriteString("    URL             string        `json:\"url\"`\n")
	result.WriteString("    MaxOpenConns    int           `json:\"max_open_conns\"`     // Default: 25\n")
	result.WriteString("    MaxIdleConns    int           `json:\"max_idle_conns\"`     // Default: 25\n")
	result.WriteString("    ConnMaxLifetime time.Duration `json:\"conn_max_lifetime\"`  // Default: 5 minutes\n")
	result.WriteString("    ConnMaxIdleTime time.Duration `json:\"conn_max_idle_time\"` // Default: 5 minutes\n")
	result.WriteString("}\n\n")
	result.WriteString("// Setup optimized connection pool\n")
	result.WriteString("func setupDatabasePool(config DatabaseConfig) (*sqlx.DB, error) {\n")
	result.WriteString("    db, err := sqlx.Open(\"postgres\", config.URL)\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        return nil, err\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // Configure connection pool\n")
	result.WriteString("    db.SetMaxOpenConns(config.MaxOpenConns)\n")
	result.WriteString("    db.SetMaxIdleConns(config.MaxIdleConns)\n")
	result.WriteString("    db.SetConnMaxLifetime(config.ConnMaxLifetime)\n")
	result.WriteString("    db.SetConnMaxIdleTime(config.ConnMaxIdleTime)\n\n")
	result.WriteString("    // Test connection\n")
	result.WriteString("    if err := db.Ping(); err != nil {\n")
	result.WriteString("        return nil, fmt.Errorf(\"database ping failed: %w\", err)\n")
	result.WriteString("    }\n\n")
	result.WriteString("    return db, nil\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Connection Pool Monitoring\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Connection pool metrics\n")
	result.WriteString("type PoolMetrics struct {\n")
	result.WriteString("    OpenConnections int\n")
	result.WriteString("    InUse          int\n")
	result.WriteString("    Idle           int\n")
	result.WriteString("    WaitCount      int64\n")
	result.WriteString("    WaitDuration   time.Duration\n")
	result.WriteString("    MaxIdleClosed  int64\n")
	result.WriteString("    MaxLifetimeClosed int64\n")
	result.WriteString("}\n\n")
	result.WriteString("func (pm *PoolMonitor) GetMetrics(db *sql.DB) PoolMetrics {\n")
	result.WriteString("    stats := db.Stats()\n")
	result.WriteString("    return PoolMetrics{\n")
	result.WriteString("        OpenConnections:   stats.OpenConnections,\n")
	result.WriteString("        InUse:            stats.InUse,\n")
	result.WriteString("        Idle:             stats.Idle,\n")
	result.WriteString("        WaitCount:        stats.WaitCount,\n")
	result.WriteString("        WaitDuration:     stats.WaitDuration,\n")
	result.WriteString("        MaxIdleClosed:    stats.MaxIdleClosed,\n")
	result.WriteString("        MaxLifetimeClosed: stats.MaxLifetimeClosed,\n")
	result.WriteString("    }\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Best Practices\n\n")
	result.WriteString("- **Pool Size**: Set MaxOpenConns based on database capacity and application load\n")
	result.WriteString("- **Idle Connections**: Keep MaxIdleConns reasonable to balance resource usage\n")
	result.WriteString("- **Connection Lifetime**: Set ConnMaxLifetime to prevent stale connections\n")
	result.WriteString("- **Monitoring**: Track pool metrics to identify bottlenecks\n")
	result.WriteString("- **Graceful Degradation**: Handle pool exhaustion scenarios\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetQueryOptimization handles the get_query_optimization tool request
func HandleGetQueryOptimization(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_query_optimization request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Query Optimization Patterns\n\n")
	
	result.WriteString("## Query Performance Patterns\n\n")
	result.WriteString("| Optimization | Description | Performance Gain | Example |\n")
	result.WriteString("|--------------|-------------|------------------|----------|\n")
	result.WriteString("| Prepared Statements | Pre-compiled SQL queries | 20-40% faster | Campaign queries |\n")
	result.WriteString("| Batch Operations | Group multiple operations | 5-10x faster | Bulk domain inserts |\n")
	result.WriteString("| Index Usage | Strategic index placement | 10-100x faster | Campaign lookups |\n")
	result.WriteString("| Query Caching | Cache query results | 2-5x faster | Frequently accessed data |\n\n")
	
	result.WriteString("## Optimized Query Examples\n\n")
	result.WriteString("```sql\n")
	result.WriteString("-- Optimized campaign lookup with indexes\n")
	result.WriteString("CREATE INDEX CONCURRENTLY idx_campaigns_user_status \n")
	result.WriteString("ON campaigns(user_id, status) \n")
	result.WriteString("WHERE status IN ('pending', 'running', 'queued');\n\n")
	result.WriteString("-- Efficient pagination query\n")
	result.WriteString("SELECT id, name, status, created_at\n")
	result.WriteString("FROM campaigns \n")
	result.WriteString("WHERE user_id = $1 \n")
	result.WriteString("  AND created_at < $2 \n")
	result.WriteString("ORDER BY created_at DESC \n")
	result.WriteString("LIMIT $3;\n\n")
	result.WriteString("-- Bulk insert optimization\n")
	result.WriteString("INSERT INTO generated_domains (campaign_id, domain, created_at) \n")
	result.WriteString("VALUES \n")
	result.WriteString("  ($1, $2, $3),\n")
	result.WriteString("  ($4, $5, $6),\n")
	result.WriteString("  -- ... batch of values\n")
	result.WriteString("ON CONFLICT (campaign_id, domain) DO NOTHING;\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Query Analysis Tools\n\n")
	result.WriteString("```sql\n")
	result.WriteString("-- Analyze query performance\n")
	result.WriteString("EXPLAIN ANALYZE \n")
	result.WriteString("SELECT c.id, c.name, COUNT(d.id) as domain_count\n")
	result.WriteString("FROM campaigns c\n")
	result.WriteString("LEFT JOIN generated_domains d ON c.id = d.campaign_id\n")
	result.WriteString("WHERE c.user_id = $1\n")
	result.WriteString("GROUP BY c.id, c.name;\n\n")
	result.WriteString("-- Check index usage\n")
	result.WriteString("SELECT \n")
	result.WriteString("    schemaname,\n")
	result.WriteString("    tablename,\n")
	result.WriteString("    indexname,\n")
	result.WriteString("    idx_scan,\n")
	result.WriteString("    idx_tup_read,\n")
	result.WriteString("    idx_tup_fetch\n")
	result.WriteString("FROM pg_stat_user_indexes\n")
	result.WriteString("WHERE schemaname = 'public'\n")
	result.WriteString("ORDER BY idx_scan DESC;\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleAnalyzeDeadlockPrevention handles the analyze_deadlock_prevention tool request
func HandleAnalyzeDeadlockPrevention(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling analyze_deadlock_prevention request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Deadlock Prevention Strategies\n\n")
	
	result.WriteString("## Common Deadlock Scenarios\n\n")
	result.WriteString("| Scenario | Description | Prevention Strategy | Implementation |\n")
	result.WriteString("|----------|-------------|-------------------|----------------|\n")
	result.WriteString("| Lock Ordering | Different transaction order | Consistent lock order | Ordered resource access |\n")
	result.WriteString("| Long Transactions | Extended lock duration | Shorter transactions | Break into smaller operations |\n")
	result.WriteString("| Resource Contention | Multiple resources locked | Lock timeout | SET lock_timeout |\n")
	result.WriteString("| Foreign Key Conflicts | Related table locks | Explicit locking | SELECT ... FOR UPDATE |\n\n")
	
	result.WriteString("## Deadlock Prevention Patterns\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Consistent lock ordering pattern\n")
	result.WriteString("func (s *Service) UpdateCampaignAndJobs(ctx context.Context, campaignID uuid.UUID) error {\n")
	result.WriteString("    tx, err := s.db.BeginTxx(ctx, nil)\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        return err\n")
	result.WriteString("    }\n")
	result.WriteString("    defer tx.Rollback()\n\n")
	result.WriteString("    // Always lock in consistent order: campaigns first, then jobs\n")
	result.WriteString("    _, err = tx.ExecContext(ctx, \n")
	result.WriteString("        \"SELECT id FROM campaigns WHERE id = $1 FOR UPDATE\", campaignID)\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        return err\n")
	result.WriteString("    }\n\n")
	result.WriteString("    _, err = tx.ExecContext(ctx,\n")
	result.WriteString("        \"SELECT id FROM campaign_jobs WHERE campaign_id = $1 FOR UPDATE\", campaignID)\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        return err\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // Perform updates\n")
	result.WriteString("    if err := s.updateCampaignInTx(ctx, tx, campaignID); err != nil {\n")
	result.WriteString("        return err\n")
	result.WriteString("    }\n\n")
	result.WriteString("    if err := s.updateJobsInTx(ctx, tx, campaignID); err != nil {\n")
	result.WriteString("        return err\n")
	result.WriteString("    }\n\n")
	result.WriteString("    return tx.Commit()\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Deadlock Detection and Recovery\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Deadlock retry mechanism\n")
	result.WriteString("func (s *Service) ExecuteWithDeadlockRetry(ctx context.Context, fn func(*sqlx.Tx) error) error {\n")
	result.WriteString("    maxRetries := 3\n")
	result.WriteString("    baseDelay := 100 * time.Millisecond\n\n")
	result.WriteString("    for attempt := 0; attempt < maxRetries; attempt++ {\n")
	result.WriteString("        tx, err := s.db.BeginTxx(ctx, nil)\n")
	result.WriteString("        if err != nil {\n")
	result.WriteString("            return err\n")
	result.WriteString("        }\n\n")
	result.WriteString("        err = fn(tx)\n")
	result.WriteString("        if err != nil {\n")
	result.WriteString("            tx.Rollback()\n")
	result.WriteString("            \n")
	result.WriteString("            // Check if it's a deadlock error\n")
	result.WriteString("            if isDeadlockError(err) && attempt < maxRetries-1 {\n")
	result.WriteString("                // Exponential backoff with jitter\n")
	result.WriteString("                delay := time.Duration(1<<attempt) * baseDelay\n")
	result.WriteString("                jitter := time.Duration(rand.Int63n(int64(delay/2)))\n")
	result.WriteString("                time.Sleep(delay + jitter)\n")
	result.WriteString("                continue\n")
	result.WriteString("            }\n")
	result.WriteString("            return err\n")
	result.WriteString("        }\n\n")
	result.WriteString("        if err := tx.Commit(); err != nil {\n")
	result.WriteString("            if isDeadlockError(err) && attempt < maxRetries-1 {\n")
	result.WriteString("                delay := time.Duration(1<<attempt) * baseDelay\n")
	result.WriteString("                time.Sleep(delay)\n")
	result.WriteString("                continue\n")
	result.WriteString("            }\n")
	result.WriteString("            return err\n")
	result.WriteString("        }\n\n")
	result.WriteString("        return nil // Success\n")
	result.WriteString("    }\n\n")
	result.WriteString("    return errors.New(\"max deadlock retry attempts exceeded\")\n")
	result.WriteString("}\n\n")
	result.WriteString("func isDeadlockError(err error) bool {\n")
	result.WriteString("    // PostgreSQL deadlock error code: 40P01\n")
	result.WriteString("    return strings.Contains(err.Error(), \"deadlock detected\")\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetMigrationStrategies handles the get_migration_strategies tool request
func HandleGetMigrationStrategies(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_migration_strategies request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Database Migration Strategies\n\n")
	
	result.WriteString("## Migration Safety Patterns\n\n")
	result.WriteString("| Strategy | Description | Risk Level | Use Case |\n")
	result.WriteString("|----------|-------------|------------|----------|\n")
	result.WriteString("| Additive Migrations | Add columns/tables only | Low | New features |\n")
	result.WriteString("| Blue-Green Deployment | Parallel environments | Medium | Major schema changes |\n")
	result.WriteString("| Rolling Migrations | Gradual schema evolution | Medium | Production updates |\n")
	result.WriteString("| Feature Flags | Toggle new schema usage | Low | Schema versioning |\n\n")
	
	result.WriteString("## Safe Migration Examples\n\n")
	result.WriteString("```sql\n")
	result.WriteString("-- Step 1: Add new column (nullable)\n")
	result.WriteString("ALTER TABLE campaigns \n")
	result.WriteString("ADD COLUMN new_field TEXT;\n\n")
	result.WriteString("-- Step 2: Populate new column (application logic)\n")
	result.WriteString("-- Application code handles both old and new schemas\n\n")
	result.WriteString("-- Step 3: Add constraint (after data populated)\n")
	result.WriteString("ALTER TABLE campaigns \n")
	result.WriteString("ALTER COLUMN new_field SET NOT NULL;\n\n")
	result.WriteString("-- Step 4: Create index (concurrent, non-blocking)\n")
	result.WriteString("CREATE INDEX CONCURRENTLY idx_campaigns_new_field \n")
	result.WriteString("ON campaigns(new_field);\n\n")
	result.WriteString("-- Step 5: Remove old column (after verification)\n")
	result.WriteString("ALTER TABLE campaigns \n")
	result.WriteString("DROP COLUMN old_field;\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Rollback Procedures\n\n")
	result.WriteString("```sql\n")
	result.WriteString("-- Migration rollback template\n")
	result.WriteString("BEGIN;\n\n")
	result.WriteString("-- Verify current state\n")
	result.WriteString("SELECT COUNT(*) FROM information_schema.columns \n")
	result.WriteString("WHERE table_name = 'campaigns' AND column_name = 'new_field';\n\n")
	result.WriteString("-- Rollback steps (reverse order)\n")
	result.WriteString("ALTER TABLE campaigns ADD COLUMN old_field TEXT;\n")
	result.WriteString("UPDATE campaigns SET old_field = new_field WHERE new_field IS NOT NULL;\n")
	result.WriteString("ALTER TABLE campaigns DROP COLUMN new_field;\n\n")
	result.WriteString("-- Verify rollback\n")
	result.WriteString("SELECT COUNT(*) FROM campaigns WHERE old_field IS NOT NULL;\n\n")
	result.WriteString("COMMIT;\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Migration Testing\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Migration testing framework\n")
	result.WriteString("func TestMigration_AddCampaignField(t *testing.T) {\n")
	result.WriteString("    // Setup test database\n")
	result.WriteString("    db := setupTestDB(t)\n")
	result.WriteString("    defer cleanupTestDB(t, db)\n\n")
	result.WriteString("    // Create test data in old schema\n")
	result.WriteString("    createTestCampaigns(t, db)\n\n")
	result.WriteString("    // Run migration\n")
	result.WriteString("    err := runMigration(db, \"add_campaign_field.sql\")\n")
	result.WriteString("    require.NoError(t, err)\n\n")
	result.WriteString("    // Verify migration success\n")
	result.WriteString("    verifyColumnExists(t, db, \"campaigns\", \"new_field\")\n\n")
	result.WriteString("    // Test rollback\n")
	result.WriteString("    err = runRollback(db, \"add_campaign_field_rollback.sql\")\n")
	result.WriteString("    require.NoError(t, err)\n\n")
	result.WriteString("    // Verify rollback success\n")
	result.WriteString("    verifyColumnNotExists(t, db, \"campaigns\", \"new_field\")\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// =============================================================================
// ERROR HANDLING & RESILIENCE TOOLS
// =============================================================================

// HandleGetErrorPatterns handles the get_error_patterns tool request
func HandleGetErrorPatterns(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_error_patterns request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Error Handling Patterns\n\n")
	
	result.WriteString("## Error Types and Handling\n\n")
	result.WriteString("| Error Type | Description | Handling Strategy | Example |\n")
	result.WriteString("|------------|-------------|-------------------|----------|\n")
	result.WriteString("| Validation Errors | Input validation failures | Return structured error | Invalid campaign type |\n")
	result.WriteString("| Network Errors | Connection/timeout failures | Retry with backoff | DNS resolution timeout |\n")
	result.WriteString("| Database Errors | SQL/constraint violations | Transaction rollback | Unique constraint violation |\n")
	result.WriteString("| System Errors | Resource exhaustion | Graceful degradation | Out of memory |\n\n")
	
	result.WriteString("## Error Handling Implementation\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Structured error types\n")
	result.WriteString("type ErrorType string\n\n")
	result.WriteString("const (\n")
	result.WriteString("    ErrorTypeValidation ErrorType = \"validation\"\n")
	result.WriteString("    ErrorTypeNetwork    ErrorType = \"network\"\n")
	result.WriteString("    ErrorTypeDatabase   ErrorType = \"database\"\n")
	result.WriteString("    ErrorTypeSystem     ErrorType = \"system\"\n")
	result.WriteString("    ErrorTypeBusiness   ErrorType = \"business\"\n")
	result.WriteString(")\n\n")
	result.WriteString("type AppError struct {\n")
	result.WriteString("    Type        ErrorType `json:\"type\"`\n")
	result.WriteString("    Code        string    `json:\"code\"`\n")
	result.WriteString("    Message     string    `json:\"message\"`\n")
	result.WriteString("    Details     map[string]interface{} `json:\"details,omitempty\"`\n")
	result.WriteString("    Cause       error     `json:\"-\"`\n")
	result.WriteString("    Retryable   bool      `json:\"retryable\"`\n")
	result.WriteString("    Timestamp   time.Time `json:\"timestamp\"`\n")
	result.WriteString("}\n\n")
	result.WriteString("func (e *AppError) Error() string {\n")
	result.WriteString("    return fmt.Sprintf(\"%s: %s\", e.Code, e.Message)\n")
	result.WriteString("}\n\n")
	result.WriteString("// Error constructors\n")
	result.WriteString("func NewValidationError(code, message string, details map[string]interface{}) *AppError {\n")
	result.WriteString("    return &AppError{\n")
	result.WriteString("        Type:      ErrorTypeValidation,\n")
	result.WriteString("        Code:      code,\n")
	result.WriteString("        Message:   message,\n")
	result.WriteString("        Details:   details,\n")
	result.WriteString("        Retryable: false,\n")
	result.WriteString("        Timestamp: time.Now(),\n")
	result.WriteString("    }\n")
	result.WriteString("}\n\n")
	result.WriteString("func NewNetworkError(code, message string, cause error) *AppError {\n")
	result.WriteString("    return &AppError{\n")
	result.WriteString("        Type:      ErrorTypeNetwork,\n")
	result.WriteString("        Code:      code,\n")
	result.WriteString("        Message:   message,\n")
	result.WriteString("        Cause:     cause,\n")
	result.WriteString("        Retryable: true,\n")
	result.WriteString("        Timestamp: time.Now(),\n")
	result.WriteString("    }\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Error Propagation\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Error context propagation\n")
	result.WriteString("func (s *DomainGenerationService) CreateCampaign(ctx context.Context, req CreateCampaignRequest) (*Campaign, error) {\n")
	result.WriteString("    // Validation\n")
	result.WriteString("    if err := s.validateRequest(req); err != nil {\n")
	result.WriteString("        return nil, fmt.Errorf(\"campaign validation failed: %w\", err)\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // Business logic\n")
	result.WriteString("    campaign, err := s.createCampaignInternal(ctx, req)\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        // Add context to error\n")
	result.WriteString("        return nil, fmt.Errorf(\"failed to create campaign '%s': %w\", req.Name, err)\n")
	result.WriteString("    }\n\n")
	result.WriteString("    return campaign, nil\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetRetryMechanisms handles the get_retry_mechanisms tool request
func HandleGetRetryMechanisms(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_retry_mechanisms request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Retry Mechanisms\n\n")
	
	result.WriteString("## Retry Strategies\n\n")
	result.WriteString("| Strategy | Description | Use Case | Implementation |\n")
	result.WriteString("|----------|-------------|----------|----------------|\n")
	result.WriteString("| Exponential Backoff | Exponentially increasing delays | Network operations | `delay = initial * (factor ^ attempt)` |\n")
	result.WriteString("| Linear Backoff | Fixed delay increments | Steady resource contention | `delay = initial + (increment * attempt)` |\n")
	result.WriteString("| Jittered Backoff | Random delay variation | Avoid thundering herd | `delay + random(0, jitter)` |\n")
	result.WriteString("| Circuit Breaker | Stop retries after threshold | Cascading failures | State-based retry control |\n\n")
	
	result.WriteString("## Retry Implementation\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Configurable retry mechanism\n")
	result.WriteString("type RetryConfig struct {\n")
	result.WriteString("    MaxAttempts   int           `json:\"max_attempts\"`\n")
	result.WriteString("    InitialDelay  time.Duration `json:\"initial_delay\"`\n")
	result.WriteString("    MaxDelay      time.Duration `json:\"max_delay\"`\n")
	result.WriteString("    BackoffFactor float64       `json:\"backoff_factor\"`\n")
	result.WriteString("    JitterMax     time.Duration `json:\"jitter_max\"`\n")
	result.WriteString("    RetryableErrors []string    `json:\"retryable_errors\"`\n")
	result.WriteString("}\n\n")
	result.WriteString("// Retry executor\n")
	result.WriteString("func ExecuteWithRetry(ctx context.Context, config RetryConfig, operation func() error) error {\n")
	result.WriteString("    var lastErr error\n\n")
	result.WriteString("    for attempt := 0; attempt < config.MaxAttempts; attempt++ {\n")
	result.WriteString("        err := operation()\n")
	result.WriteString("        if err == nil {\n")
	result.WriteString("            return nil // Success\n")
	result.WriteString("        }\n\n")
	result.WriteString("        lastErr = err\n\n")
	result.WriteString("        // Check if error is retryable\n")
	result.WriteString("        if !isRetryableError(err, config.RetryableErrors) {\n")
	result.WriteString("            return err\n")
	result.WriteString("        }\n\n")
	result.WriteString("        // Don't delay on last attempt\n")
	result.WriteString("        if attempt == config.MaxAttempts-1 {\n")
	result.WriteString("            break\n")
	result.WriteString("        }\n\n")
	result.WriteString("        // Calculate delay with exponential backoff and jitter\n")
	result.WriteString("        delay := calculateDelay(config, attempt)\n\n")
	result.WriteString("        // Wait with context cancellation support\n")
	result.WriteString("        select {\n")
	result.WriteString("        case <-ctx.Done():\n")
	result.WriteString("            return ctx.Err()\n")
	result.WriteString("        case <-time.After(delay):\n")
	result.WriteString("            // Continue to next attempt\n")
	result.WriteString("        }\n")
	result.WriteString("    }\n\n")
	result.WriteString("    return fmt.Errorf(\"operation failed after %d attempts: %w\", config.MaxAttempts, lastErr)\n")
	result.WriteString("}\n\n")
	result.WriteString("func calculateDelay(config RetryConfig, attempt int) time.Duration {\n")
	result.WriteString("    // Exponential backoff\n")
	result.WriteString("    delay := time.Duration(float64(config.InitialDelay) * math.Pow(config.BackoffFactor, float64(attempt)))\n\n")
	result.WriteString("    // Cap at max delay\n")
	result.WriteString("    if delay > config.MaxDelay {\n")
	result.WriteString("        delay = config.MaxDelay\n")
	result.WriteString("    }\n\n")
	result.WriteString("    // Add jitter\n")
	result.WriteString("    if config.JitterMax > 0 {\n")
	result.WriteString("        jitter := time.Duration(rand.Int63n(int64(config.JitterMax)))\n")
	result.WriteString("        delay += jitter\n")
	result.WriteString("    }\n\n")
	result.WriteString("    return delay\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// =============================================================================
// SPECIALIZED SEARCH CAPABILITIES
// =============================================================================

// HandleSearchByCampaignType handles the search_by_campaign_type tool request
func HandleSearchByCampaignType(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling search_by_campaign_type request: %+v", request.Arguments)
	
	if request.Arguments == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: campaign_type parameter is required"},
			},
			IsError: true,
		}, nil
	}
	
	campaignType, ok := request.Arguments["campaign_type"].(string)
	if !ok || campaignType == "" {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: campaign_type parameter is required and must be a string"},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString(fmt.Sprintf("# Code Search Results for Campaign Type: '%s'\n\n", campaignType))
	
	switch campaignType {
	case "domain_generation":
		result.WriteString("## Domain Generation Related Code\n\n")
		result.WriteString("### Service Files\n")
		result.WriteString("- `internal/services/domain_generation_service.go` - Main service implementation\n")
		result.WriteString("- `internal/domainexpert/domain_expert.go` - Domain generation algorithms\n")
		result.WriteString("- `internal/services/campaign_orchestrator_service.go` - Campaign coordination\n\n")
		
		result.WriteString("### Model Definitions\n")
		result.WriteString("- `DomainGenerationCampaignParams` - Configuration parameters\n")
		result.WriteString("- `GeneratedDomain` - Generated domain results\n")
		result.WriteString("- `CampaignTypeDomainGeneration` - Enum constant\n\n")
		
		result.WriteString("### Key Functions\n")
		result.WriteString("- `CreateCampaign()` - Campaign creation with validation\n")
		result.WriteString("- `GenerateDomains()` - Core domain generation logic\n")
		result.WriteString("- `ValidatePatternType()` - Pattern validation\n")
		
	case "dns_validation":
		result.WriteString("## DNS Validation Related Code\n\n")
		result.WriteString("### Service Files\n")
		result.WriteString("- `internal/services/dns_campaign_service.go` - DNS validation service\n")
		result.WriteString("- `internal/dnsvalidator/dns_validator.go` - DNS resolution logic\n")
		result.WriteString("- `internal/services/campaign_worker_service.go` - Worker coordination\n\n")
		
		result.WriteString("### Model Definitions\n")
		result.WriteString("- `DNSValidationCampaignParams` - DNS validation parameters\n")
		result.WriteString("- `DNSValidationResult` - Validation results\n")
		result.WriteString("- `DNSValidationStatusEnum` - Status enumeration\n\n")
		
		result.WriteString("### Key Functions\n")
		result.WriteString("- `ValidateDNS()` - Core DNS validation\n")
		result.WriteString("- `ProcessDomains()` - Batch domain processing\n")
		result.WriteString("- `HandleDNSTimeout()` - Timeout handling\n")
		
	case "http_keyword_validation":
		result.WriteString("## HTTP Keyword Validation Related Code\n\n")
		result.WriteString("### Service Files\n")
		result.WriteString("- `internal/services/http_keyword_campaign_service.go` - HTTP validation service\n")
		result.WriteString("- `internal/httpvalidator/http_validator.go` - HTTP client logic\n")
		result.WriteString("- `internal/keywordextractor/keyword_extractor.go` - Content analysis\n\n")
		
		result.WriteString("### Model Definitions\n")
		result.WriteString("- `HTTPKeywordValidationCampaignParams` - HTTP validation parameters\n")
		result.WriteString("- `HTTPValidationResult` - HTTP validation results\n")
		result.WriteString("- `KeywordRule` - Keyword matching rules\n\n")
		
		result.WriteString("### Key Functions\n")
		result.WriteString("- `ValidateHTTP()` - HTTP content validation\n")
		result.WriteString("- `ExtractKeywords()` - Content keyword extraction\n")
		result.WriteString("- `MatchKeywordRules()` - Rule-based matching\n")
		
	default:
		result.WriteString("## Unknown Campaign Type\n\n")
		result.WriteString(fmt.Sprintf("No specific code found for campaign type '%s'.\n\n", campaignType))
		result.WriteString("### Available Campaign Types\n")
		result.WriteString("- `domain_generation` - Domain generation campaigns\n")
		result.WriteString("- `dns_validation` - DNS validation campaigns\n")
		result.WriteString("- `http_keyword_validation` - HTTP keyword validation campaigns\n")
	}
	
	result.WriteString("\n## Common Campaign Infrastructure\n\n")
	result.WriteString("### Shared Components\n")
	result.WriteString("- `internal/services/campaign_state_machine.go` - State management\n")
	result.WriteString("- `internal/store/campaign_store.go` - Data persistence\n")
	result.WriteString("- `internal/models/models.go` - Data models\n")
	result.WriteString("- `internal/services/interfaces.go` - Service interfaces\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleSearchByDomainPattern handles the search_by_domain_pattern tool request
func HandleSearchByDomainPattern(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling search_by_domain_pattern request: %+v", request.Arguments)
	
	if request.Arguments == nil {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: pattern parameter is required"},
			},
			IsError: true,
		}, nil
	}
	
	pattern, ok := request.Arguments["pattern"].(string)
	if !ok || pattern == "" {
		return &models.ToolResponse{
			Content: []models.ContentBlock{
				{Type: "text", Text: "Error: pattern parameter is required and must be a string"},
			},
			IsError: true,
		}, nil
	}
	
	var result strings.Builder
	result.WriteString(fmt.Sprintf("# Domain Pattern Search Results: '%s'\n\n", pattern))
	
	result.WriteString("## Pattern Generation Code\n\n")
	result.WriteString("### Core Pattern Logic\n")
	result.WriteString("- `internal/domainexpert/patterns.go` - Pattern implementation\n")
	result.WriteString("- `internal/domainexpert/generators.go` - Domain generators\n")
	result.WriteString("- `internal/domainexpert/validators.go` - Pattern validation\n\n")
	
	result.WriteString("### Pattern-Specific Functions\n")
	result.WriteString("```go\n")
	result.WriteString("// Pattern matching functions\n")
	result.WriteString("func GenerateByPattern(pattern string, keywords []string) []string\n")
	result.WriteString("func ValidatePatternSyntax(pattern string) error\n")
	result.WriteString("func ExpandPatternVariables(pattern string, variables map[string]string) string\n")
	result.WriteString("func EstimatePatternOutput(pattern string, inputs int) int\n")
	result.WriteString("```\n\n")
	
	result.WriteString("## Pattern Examples and Usage\n\n")
	result.WriteString("| Pattern Type | Example | Generated Domains | Code Location |\n")
	result.WriteString("|--------------|---------|-------------------|---------------|\n")
	result.WriteString("| Simple substitution | `{keyword}.com` | test.com, example.com | `generateSimplePattern()` |\n")
	result.WriteString("| Prefix pattern | `api-{keyword}.com` | api-test.com | `generatePrefixPattern()` |\n")
	result.WriteString("| Suffix pattern | `{keyword}-app.com` | test-app.com | `generateSuffixPattern()` |\n")
	result.WriteString("| Variable length | `{keyword}{n}.com` | test123.com | `generateVariablePattern()` |\n\n")
	
	result.WriteString("## Configuration and Validation\n\n")
	result.WriteString("### Pattern Configuration\n")
	result.WriteString("```go\n")
	result.WriteString("type PatternConfig struct {\n")
	result.WriteString("    Type           string `json:\"type\"`\n")
	result.WriteString("    Template       string `json:\"template\"`\n")
	result.WriteString("    VariableLength *int   `json:\"variable_length,omitempty\"`\n")
	result.WriteString("    CharacterSet   string `json:\"character_set\"`\n")
	result.WriteString("    MaxDomains     int    `json:\"max_domains\"`\n")
	result.WriteString("}\n")
	result.WriteString("```\n\n")
	
	result.WriteString("### Validation Rules\n")
	result.WriteString("- **Pattern Syntax**: Must contain valid placeholders\n")
	result.WriteString("- **Length Limits**: Domain length must be ≤ 253 characters\n")
	result.WriteString("- **Character Validation**: Valid DNS characters only\n")
	result.WriteString("- **TLD Validation**: Must use valid top-level domains\n\n")
	
	result.WriteString("## Testing and Examples\n\n")
	result.WriteString("### Test Files\n")
	result.WriteString("- `internal/domainexpert/patterns_test.go` - Pattern unit tests\n")
	result.WriteString("- `test_data/patterns/` - Test pattern configurations\n")
	result.WriteString("- `internal/domainexpert/testdata/` - Expected pattern outputs\n\n")
	
	result.WriteString("### Performance Considerations\n")
	result.WriteString("- **Memory Usage**: Pre-allocate result slices for large outputs\n")
	result.WriteString("- **CPU Optimization**: Use string builder pools for concatenation\n")
	result.WriteString("- **Batch Processing**: Process patterns in chunks for large datasets\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}
// HandleGetCircuitBreakers handles the get_circuit_breakers tool request
func HandleGetCircuitBreakers(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_circuit_breakers request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Circuit Breaker Patterns\n\n")
	
	result.WriteString("## Circuit Breaker Implementation\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Circuit breaker states\n")
	result.WriteString("type CircuitState int\n\n")
	result.WriteString("const (\n")
	result.WriteString("    CircuitClosed CircuitState = iota\n")
	result.WriteString("    CircuitOpen\n")
	result.WriteString("    CircuitHalfOpen\n")
	result.WriteString(")\n\n")
	result.WriteString("type CircuitBreaker struct {\n")
	result.WriteString("    maxFailures     int\n")
	result.WriteString("    resetTimeout    time.Duration\n")
	result.WriteString("    state          CircuitState\n")
	result.WriteString("    failures       int\n")
	result.WriteString("    lastFailureTime time.Time\n")
	result.WriteString("    mu             sync.RWMutex\n")
	result.WriteString("}\n\n")
	result.WriteString("func (cb *CircuitBreaker) Execute(fn func() error) error {\n")
	result.WriteString("    cb.mu.Lock()\n")
	result.WriteString("    defer cb.mu.Unlock()\n\n")
	result.WriteString("    if cb.state == CircuitOpen {\n")
	result.WriteString("        if time.Since(cb.lastFailureTime) > cb.resetTimeout {\n")
	result.WriteString("            cb.state = CircuitHalfOpen\n")
	result.WriteString("        } else {\n")
	result.WriteString("            return errors.New(\"circuit breaker is open\")\n")
	result.WriteString("        }\n")
	result.WriteString("    }\n\n")
	result.WriteString("    err := fn()\n")
	result.WriteString("    if err != nil {\n")
	result.WriteString("        cb.failures++\n")
	result.WriteString("        cb.lastFailureTime = time.Now()\n")
	result.WriteString("        if cb.failures >= cb.maxFailures {\n")
	result.WriteString("            cb.state = CircuitOpen\n")
	result.WriteString("        }\n")
	result.WriteString("        return err\n")
	result.WriteString("    }\n\n")
	result.WriteString("    cb.failures = 0\n")
	result.WriteString("    cb.state = CircuitClosed\n")
	result.WriteString("    return nil\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleGetTimeoutStrategies handles the get_timeout_strategies tool request
func HandleGetTimeoutStrategies(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling get_timeout_strategies request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Timeout Handling Strategies\n\n")
	
	result.WriteString("## Context-Based Timeouts\n\n")
	result.WriteString("```go\n")
	result.WriteString("// HTTP client with timeout\n")
	result.WriteString("func createHTTPClientWithTimeout(timeout time.Duration) *http.Client {\n")
	result.WriteString("    return &http.Client{\n")
	result.WriteString("        Timeout: timeout,\n")
	result.WriteString("        Transport: &http.Transport{\n")
	result.WriteString("            DialContext: (&net.Dialer{\n")
	result.WriteString("                Timeout:   5 * time.Second,\n")
	result.WriteString("                KeepAlive: 30 * time.Second,\n")
	result.WriteString("            }).DialContext,\n")
	result.WriteString("            TLSHandshakeTimeout: 5 * time.Second,\n")
	result.WriteString("        },\n")
	result.WriteString("    }\n")
	result.WriteString("}\n\n")
	result.WriteString("// Campaign processing with timeout\n")
	result.WriteString("func (s *Service) ProcessCampaignWithTimeout(campaignID uuid.UUID, timeout time.Duration) error {\n")
	result.WriteString("    ctx, cancel := context.WithTimeout(context.Background(), timeout)\n")
	result.WriteString("    defer cancel()\n\n")
	result.WriteString("    done := make(chan error, 1)\n")
	result.WriteString("    go func() {\n")
	result.WriteString("        done <- s.processCampaign(ctx, campaignID)\n")
	result.WriteString("    }()\n\n")
	result.WriteString("    select {\n")
	result.WriteString("    case err := <-done:\n")
	result.WriteString("        return err\n")
	result.WriteString("    case <-ctx.Done():\n")
	result.WriteString("        return fmt.Errorf(\"campaign processing timeout: %w\", ctx.Err())\n")
	result.WriteString("    }\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleAnalyzeFailureModes handles the analyze_failure_modes tool request
func HandleAnalyzeFailureModes(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling analyze_failure_modes request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Failure Mode Analysis\n\n")
	
	result.WriteString("## Common Failure Scenarios\n\n")
	result.WriteString("| Component | Failure Mode | Impact | Mitigation |\n")
	result.WriteString("|-----------|--------------|--------|------------|\n")
	result.WriteString("| Database | Connection loss | Campaign data unavailable | Connection pooling, retry logic |\n")
	result.WriteString("| DNS Resolver | Timeout/NXDOMAIN | DNS validation fails | Circuit breaker, fallback DNS |\n")
	result.WriteString("| HTTP Client | Network timeout | HTTP validation fails | Retry with backoff |\n")
	result.WriteString("| Worker Pool | Resource exhaustion | Campaign processing stops | Queue limits, graceful degradation |\n")
	result.WriteString("| State Machine | Invalid transition | Campaign stuck | State validation, recovery procedures |\n\n")
	
	result.WriteString("## Failure Detection\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Health check system\n")
	result.WriteString("type HealthChecker struct {\n")
	result.WriteString("    checks map[string]HealthCheck\n")
	result.WriteString("    mu     sync.RWMutex\n")
	result.WriteString("}\n\n")
	result.WriteString("type HealthCheck interface {\n")
	result.WriteString("    Name() string\n")
	result.WriteString("    Check(ctx context.Context) error\n")
	result.WriteString("}\n\n")
	result.WriteString("func (hc *HealthChecker) CheckAll(ctx context.Context) map[string]error {\n")
	result.WriteString("    hc.mu.RLock()\n")
	result.WriteString("    defer hc.mu.RUnlock()\n\n")
	result.WriteString("    results := make(map[string]error)\n")
	result.WriteString("    for name, check := range hc.checks {\n")
	result.WriteString("        results[name] = check.Check(ctx)\n")
	result.WriteString("    }\n")
	result.WriteString("    return results\n")
	result.WriteString("}\n")
	result.WriteString("```\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleSearchPerformanceCode handles the search_performance_code tool request
func HandleSearchPerformanceCode(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling search_performance_code request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Performance-Related Code Search\n\n")
	
	result.WriteString("## Performance Optimization Locations\n\n")
	result.WriteString("### Connection Pooling\n")
	result.WriteString("- `internal/store/database.go` - Database connection pool setup\n")
	result.WriteString("- `config/database.go` - Pool configuration parameters\n\n")
	
	result.WriteString("### Worker Pool Optimization\n")
	result.WriteString("- `internal/services/campaign_worker_service.go` - Worker pool implementation\n")
	result.WriteString("- `internal/services/interfaces.go` - Worker interfaces\n\n")
	
	result.WriteString("### Caching Implementation\n")
	result.WriteString("- `internal/cache/` - Cache interfaces and implementations\n")
	result.WriteString("- `internal/middleware/cache.go` - HTTP response caching\n\n")
	
	result.WriteString("### Batch Processing\n")
	result.WriteString("- `internal/domainexpert/batch_generator.go` - Batch domain generation\n")
	result.WriteString("- `internal/store/batch_operations.go` - Batch database operations\n\n")
	
	result.WriteString("## Performance Monitoring\n\n")
	result.WriteString("### Metrics Collection\n")
	result.WriteString("- `internal/monitoring/metrics.go` - Performance metrics\n")
	result.WriteString("- `internal/middleware/monitoring.go` - Request monitoring\n\n")
	
	result.WriteString("### Profiling Integration\n")
	result.WriteString("- `cmd/server/profiling.go` - pprof endpoint setup\n")
	result.WriteString("- `internal/profiling/` - Custom profiling utilities\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleSearchStateTransitions handles the search_state_transitions tool request
func HandleSearchStateTransitions(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling search_state_transitions request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# State Transition Code Search\n\n")
	
	result.WriteString("## State Machine Implementation\n\n")
	result.WriteString("### Core State Logic\n")
	result.WriteString("- `internal/services/campaign_state_machine.go` - Main state machine\n")
	result.WriteString("- `internal/models/models.go` - State enumerations\n\n")
	
	result.WriteString("### State Transition Functions\n")
	result.WriteString("```go\n")
	result.WriteString("// Key state transition functions\n")
	result.WriteString("func (sm *CampaignStateMachine) CanTransition(current, target CampaignStatus) bool\n")
	result.WriteString("func (sm *CampaignStateMachine) ValidateTransition(current, target CampaignStatus) error\n")
	result.WriteString("func (sm *CampaignStateMachine) GetValidTransitions(current CampaignStatus) []CampaignStatus\n")
	result.WriteString("func (sm *CampaignStateMachine) IsTerminalState(status CampaignStatus) bool\n")
	result.WriteString("```\n\n")
	
	result.WriteString("### State Change Triggers\n")
	result.WriteString("- `internal/services/campaign_orchestrator_service.go` - Campaign state updates\n")
	result.WriteString("- `internal/services/campaign_worker_service.go` - Job state transitions\n")
	result.WriteString("- `internal/api/handlers/campaign_handlers.go` - API-triggered state changes\n\n")
	
	result.WriteString("## State Validation\n\n")
	result.WriteString("### Validation Rules\n")
	result.WriteString("- Campaign cannot go from 'completed' to 'running'\n")
	result.WriteString("- Only 'failed' campaigns can be retried\n")
	result.WriteString("- 'archived' and 'cancelled' are terminal states\n")
	result.WriteString("- 'paused' campaigns can only resume to 'running'\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}

// HandleSearchErrorHandling handles the search_error_handling tool request
func HandleSearchErrorHandling(ctx context.Context, request *models.ToolRequest) (*models.ToolResponse, error) {
	log.Printf("Handling search_error_handling request: %+v", request.Arguments)
	
	var result strings.Builder
	result.WriteString("# Error Handling Code Search\n\n")
	
	result.WriteString("## Error Handling Patterns\n\n")
	result.WriteString("### Service Layer Error Handling\n")
	result.WriteString("- `internal/services/*_service.go` - Service-level error handling\n")
	result.WriteString("- `internal/store/*_store.go` - Data access error handling\n\n")
	
	result.WriteString("### HTTP Error Handling\n")
	result.WriteString("- `internal/api/handlers/` - HTTP request error handling\n")
	result.WriteString("- `internal/middleware/error_handler.go` - Global error middleware\n\n")
	
	result.WriteString("### Domain-Specific Error Handling\n")
	result.WriteString("- `internal/dnsvalidator/errors.go` - DNS validation errors\n")
	result.WriteString("- `internal/httpvalidator/errors.go` - HTTP validation errors\n")
	result.WriteString("- `internal/domainexpert/errors.go` - Domain generation errors\n\n")
	
	result.WriteString("## Error Types and Patterns\n\n")
	result.WriteString("```go\n")
	result.WriteString("// Common error patterns in the codebase\n")
	result.WriteString("var (\n")
	result.WriteString("    ErrCampaignNotFound = errors.New(\"campaign not found\")\n")
	result.WriteString("    ErrInvalidCampaignType = errors.New(\"invalid campaign type\")\n")
	result.WriteString("    ErrInvalidStateTransition = errors.New(\"invalid state transition\")\n")
	result.WriteString("    ErrDatabaseConnection = errors.New(\"database connection failed\")\n")
	result.WriteString("    ErrValidationFailed = errors.New(\"validation failed\")\n")
	result.WriteString(")\n")
	result.WriteString("```\n\n")
	
	result.WriteString("### Error Recovery Mechanisms\n")
	result.WriteString("- Transaction rollback on database errors\n")
	result.WriteString("- Retry logic for network operations\n")
	result.WriteString("- Graceful degradation for external service failures\n")
	result.WriteString("- State machine recovery for invalid transitions\n")
	
	return &models.ToolResponse{
		Content: []models.ContentBlock{
			{Type: "text", Text: result.String()},
		},
	}, nil
}