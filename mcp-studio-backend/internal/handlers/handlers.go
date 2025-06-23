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