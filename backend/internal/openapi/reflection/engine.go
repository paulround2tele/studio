package reflection

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/fntelecomllc/studio/backend/internal/openapi/config"
)

// ReflectionEngine is the main orchestrator for OpenAPI generation
type ReflectionEngine struct {
	config            *config.GenerationConfig
	routeDiscoverer   *RouteDiscoverer
	handlerAnalyzer   *HandlerAnalyzer
	schemaGenerator   *SchemaGenerator
	documentExtractor *DocumentationExtractor
	typeInspector     *TypeInspector
	spec              *openapi3.T
}

// NewReflectionEngine creates a new reflection engine with the given configuration
func NewReflectionEngine(cfg *config.GenerationConfig) *ReflectionEngine {
	if cfg == nil {
		cfg = config.DefaultConfig()
	}

	engine := &ReflectionEngine{
		config: cfg,
		spec:   createBaseSpec(cfg),
	}

	// Initialize components
	engine.routeDiscoverer = NewRouteDiscoverer(cfg)
	engine.handlerAnalyzer = NewHandlerAnalyzer(cfg)
	engine.schemaGenerator = NewSchemaGenerator(cfg)
	engine.documentExtractor = NewDocumentationExtractor(cfg)
	engine.typeInspector = NewTypeInspector(cfg)

	return engine
}

// GenerateSpec generates the complete OpenAPI specification
func (e *ReflectionEngine) GenerateSpec() (*openapi3.T, error) {
	if e.config.VerboseLogging {
		log.Println("Starting OpenAPI generation...")
	}

	// Step 1: Discover business entities from all relevant packages
	if e.config.VerboseLogging {
		log.Println("Discovering business entities...")
	}
	businessEntities, err := e.routeDiscoverer.DiscoverBusinessEntities(nil) // Use default packages
	if err != nil {
		return nil, fmt.Errorf("failed to discover business entities: %w", err)
	}

	if e.config.VerboseLogging {
		log.Printf("Found %d business entities", len(businessEntities))
	}

	// Pass business entities to schema generator
	e.schemaGenerator.SetBusinessEntities(businessEntities)

	// Step 2: Discover routes from source code
	if e.config.VerboseLogging {
		log.Println("Discovering routes...")
	}
	routes, err := e.routeDiscoverer.DiscoverRoutes(e.config.PackagePaths)
	if err != nil {
		return nil, fmt.Errorf("failed to discover routes: %w", err)
	}

	if e.config.VerboseLogging {
		log.Printf("Found %d routes", len(routes))
	}

	// Step 3: Analyze handlers for each route
	if e.config.VerboseLogging {
		log.Println("Analyzing handlers...")
	}
	for i := range routes {
		route := &routes[i]
		handlerInfo, err := e.handlerAnalyzer.AnalyzeHandler(route)
		if err != nil {
			if e.config.VerboseLogging {
				log.Printf("Warning: Failed to analyze handler for route %s %s: %v", route.Method, route.Path, err)
			}
			continue
		}
		route.HandlerInfo = handlerInfo
	}

	// Step 4: Generate OpenAPI operations for each route
	if e.config.VerboseLogging {
		log.Println("Generating OpenAPI operations...")
	}
	for _, route := range routes {
		if err := e.addRouteToSpec(route); err != nil {
			if e.config.VerboseLogging {
				log.Printf("Warning: Failed to add route %s %s to spec: %v", route.Method, route.Path, err)
			}
			continue
		}
	}

	// Step 5: Generate schemas for discovered types and business entities
	if e.config.VerboseLogging {
		log.Println("Generating schemas...")
	}
	if err := e.generateSchemas(); err != nil {
		return nil, fmt.Errorf("failed to generate schemas: %w", err)
	}

	// Step 6: Add security schemes
	e.addSecuritySchemes()

	// Step 7: Validate the specification if requested
	if e.config.StrictValidation {
		if e.config.VerboseLogging {
			log.Println("Validating specification...")
		}
		if err := e.validateSpec(); err != nil {
			return nil, fmt.Errorf("specification validation failed: %w", err)
		}
	}

	if e.config.VerboseLogging {
		log.Println("OpenAPI generation completed successfully")
		log.Printf("Generated specification with %d schemas", len(e.spec.Components.Schemas))
	}

	return e.spec, nil
}

// GenerateSpecWithGinEngine generates the complete OpenAPI specification using both reflection and Gin engine routes
func (e *ReflectionEngine) GenerateSpecWithGinEngine(engine *gin.Engine) (*openapi3.T, error) {
	if e.config.VerboseLogging {
		log.Println("Starting OpenAPI generation with Gin engine routes...")
	}

	// Step 1: Discover business entities from all relevant packages (keep existing functionality)
	if e.config.VerboseLogging {
		log.Println("Discovering business entities...")
	}
	businessEntities, err := e.routeDiscoverer.DiscoverBusinessEntities(nil) // Use default packages
	if err != nil {
		return nil, fmt.Errorf("failed to discover business entities: %w", err)
	}

	if e.config.VerboseLogging {
		log.Printf("Found %d business entities", len(businessEntities))
	}

	// Pass business entities to schema generator
	e.schemaGenerator.SetBusinessEntities(businessEntities)

	// Step 2: Discover routes from handler packages
	if e.config.VerboseLogging {
		log.Println("Discovering routes using reflection...")
	}
	
	// Use route discovery from API handler packages
	routes, err := e.routeDiscoverer.DiscoverRoutes(e.config.PackagePaths)
	if err != nil {
		return nil, fmt.Errorf("failed to discover routes: %w", err)
	}

	if e.config.VerboseLogging {
		log.Printf("Discovered %d routes", len(routes))
	}

	// Step 3: Analyze handlers for each route
	if e.config.VerboseLogging {
		log.Println("Analyzing handlers...")
	}
	for i, route := range routes {
		handlerInfo, err := e.handlerAnalyzer.AnalyzeHandler(&route)
		if err != nil {
			if e.config.VerboseLogging {
				log.Printf("Warning: Failed to analyze handler for route %s %s: %v", route.Method, route.Path, err)
			}
			continue
		}
		routes[i].HandlerInfo = handlerInfo
	}

	// Step 4: Generate OpenAPI operations for each route
	if e.config.VerboseLogging {
		log.Println("Generating OpenAPI operations...")
	}
	for _, route := range routes {
		if err := e.addRouteToSpec(route); err != nil {
			if e.config.VerboseLogging {
				log.Printf("Warning: Failed to add route %s %s to spec: %v", route.Method, route.Path, err)
			}
			continue
		}
	}

	if e.config.VerboseLogging {
		log.Printf("Generated %d paths with operations", len(e.spec.Paths.Map()))
	}

	// Step 3: Generate schemas for discovered types and business entities
	if e.config.VerboseLogging {
		log.Println("Generating schemas...")
	}
	if err := e.generateSchemas(); err != nil {
		return nil, fmt.Errorf("failed to generate schemas: %w", err)
	}

	// Step 4: Add security schemes
	e.addSecuritySchemes()

	// Step 5: Validate the specification if requested
	if e.config.StrictValidation {
		if e.config.VerboseLogging {
			log.Println("Validating specification...")
		}
		if err := e.validateSpec(); err != nil {
			return nil, fmt.Errorf("specification validation failed: %w", err)
		}
	}

	if e.config.VerboseLogging {
		log.Println("OpenAPI generation completed successfully")
		log.Printf("Generated specification with %d schemas and %d paths", len(e.spec.Components.Schemas), len(e.spec.Paths.Map()))
	}

	return e.spec, nil
}

// addRouteToSpec adds a discovered route to the OpenAPI specification
func (e *ReflectionEngine) addRouteToSpec(route DiscoveredRoute) error {
	// Convert route path to OpenAPI format
	openAPIPath := convertGinPathToOpenAPI(route.Path)

	// Get or create path item
	pathItem := e.spec.Paths.Find(openAPIPath)
	if pathItem == nil {
		pathItem = &openapi3.PathItem{}
		e.spec.Paths.Set(openAPIPath, pathItem)
	}

	// Debug: Log parameter information
	if e.config.VerboseLogging {
		log.Printf("Route %s %s has %d parameters", route.Method, route.Path, len(route.Parameters))
		for i, param := range route.Parameters {
			if param.Value != nil {
				schemaType := "unknown"
				if param.Value.Schema != nil && param.Value.Schema.Value != nil && param.Value.Schema.Value.Type != nil {
					schemaType = string((*param.Value.Schema.Value.Type)[0])
				}
				log.Printf("  Parameter %d: %s (in: %s, type: %s, required: %t)", i, param.Value.Name, param.Value.In, schemaType, param.Value.Required)
			}
		}
	}

	// Create operation
	operation := &openapi3.Operation{
		OperationID: route.OperationID,
		Summary:     route.Summary,
		Description: route.Description,
		Tags:        route.Tags,
		Parameters:  route.Parameters,
		Responses:   openapi3.NewResponses(),
	}

	// Add request body for non-GET methods
	if route.Method != "GET" && route.RequestSchema != nil {
		operation.RequestBody = &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: route.RequestSchema,
					},
				},
			},
		}
	}

	// Always add 200 success response
	successDesc := "Operation successful"
	successResponse := &openapi3.Response{
		Description: &successDesc,
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: route.ResponseSchema,
			},
		},
	}
	
	// If no response schema, use a generic success schema
	if route.ResponseSchema == nil {
		successResponse.Content["application/json"].Schema = &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"object"},
				Properties: map[string]*openapi3.SchemaRef{
					"message": {
						Value: &openapi3.Schema{
							Type:        &openapi3.Types{"string"},
							Description: "Success message",
						},
					},
					"data": {
						Value: &openapi3.Schema{
							Description: "Response data",
						},
					},
				},
			},
		}
	}
	
	operation.Responses.Set("200", &openapi3.ResponseRef{Value: successResponse})

	// Add standard error responses
	e.addStandardErrorResponses(operation)

	// Add security if not an auth endpoint
	if !isAuthEndpoint(route.Path) {
		operation.Security = &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		}
	}

	// Set operation on path item
	switch route.Method {
	case "GET":
		pathItem.Get = operation
	case "POST":
		pathItem.Post = operation
	case "PUT":
		pathItem.Put = operation
	case "DELETE":
		pathItem.Delete = operation
	case "PATCH":
		pathItem.Patch = operation
	}

	return nil
}

// generateSchemas generates OpenAPI schemas for all discovered types
func (e *ReflectionEngine) generateSchemas() error {
	// This will be implemented by the SchemaGenerator
	return e.schemaGenerator.GenerateSchemas(e.spec)
}

// addSecuritySchemes adds security schemes to the specification
func (e *ReflectionEngine) addSecuritySchemes() {
	if e.spec.Components.SecuritySchemes == nil {
		e.spec.Components.SecuritySchemes = make(openapi3.SecuritySchemes)
	}

	for name, scheme := range e.config.SecuritySchemes {
		secScheme := &openapi3.SecurityScheme{
			Type:         scheme.Type,
			Scheme:       scheme.Scheme,
			BearerFormat: scheme.BearerFormat,
			Description:  scheme.Description,
		}
		
		// Add In and Name for apiKey type
		if scheme.Type == "apiKey" {
			secScheme.In = scheme.In
			secScheme.Name = scheme.Name
		}
		
		e.spec.Components.SecuritySchemes[name] = &openapi3.SecuritySchemeRef{
			Value: secScheme,
		}
	}
}

// addStandardErrorResponses adds standard error responses to an operation
func (e *ReflectionEngine) addStandardErrorResponses(operation *openapi3.Operation) {
	// 400 Bad Request
	badRequestDesc := "Bad Request"
	operation.Responses.Set("400", &openapi3.ResponseRef{
		Value: &openapi3.Response{
			Description: &badRequestDesc,
			Content: map[string]*openapi3.MediaType{
				"application/json": {
					Schema: &openapi3.SchemaRef{
						Ref: "#/components/schemas/ErrorResponse",
					},
				},
			},
		},
	})

	// 401 Unauthorized (for protected routes)
	if operation.Security != nil && len(*operation.Security) > 0 {
		unauthorizedDesc := "Unauthorized"
		operation.Responses.Set("401", &openapi3.ResponseRef{
			Value: &openapi3.Response{
				Description: &unauthorizedDesc,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/ErrorResponse",
						},
					},
				},
			},
		})
	}

	// 500 Internal Server Error
	serverErrorDesc := "Internal Server Error"
	operation.Responses.Set("500", &openapi3.ResponseRef{
		Value: &openapi3.Response{
			Description: &serverErrorDesc,
			Content: map[string]*openapi3.MediaType{
				"application/json": {
					Schema: &openapi3.SchemaRef{
						Ref: "#/components/schemas/ErrorResponse",
					},
				},
			},
		},
	})
}

// validateSpec validates the OpenAPI specification
func (e *ReflectionEngine) validateSpec() error {
	loader := openapi3.NewLoader()
	return loader.ResolveRefsIn(e.spec, nil)
}

// createBaseSpec creates the base OpenAPI specification structure
func createBaseSpec(cfg *config.GenerationConfig) *openapi3.T {
	spec := &openapi3.T{
		OpenAPI: "3.0.3",
		Info: &openapi3.Info{
			Title:       cfg.APIInfo.Title,
			Version:     cfg.APIInfo.Version,
			Description: cfg.APIInfo.Description,
			Contact: &openapi3.Contact{
				Name:  cfg.APIInfo.Contact.Name,
				URL:   cfg.APIInfo.Contact.URL,
				Email: cfg.APIInfo.Contact.Email,
			},
		},
		Paths: &openapi3.Paths{},
		Components: &openapi3.Components{
			Schemas:         make(openapi3.Schemas),
			SecuritySchemes: make(openapi3.SecuritySchemes),
			Parameters:      make(openapi3.ParametersMap),
			RequestBodies:   make(openapi3.RequestBodies),
			Responses:       make(openapi3.ResponseBodies),
		},
	}

	// Add servers section with environment-based URL detection
	spec.Servers = buildServersList(cfg.ServerConfig)
	
	return spec
}

// buildServersList builds the OpenAPI servers list with environment detection
// Returns empty servers list if no environment-based URL is found,
// allowing clients to set base URLs at runtime
func buildServersList(serverConfig config.ServerConfig) openapi3.Servers {
	var servers openapi3.Servers

	// Only use environment-based URL detection - no hardcoded fallbacks
	if serverConfig.EnableEnvironmentDetection {
		if envURL := os.Getenv(serverConfig.BaseURL); envURL != "" {
			servers = append(servers, &openapi3.Server{
				URL:         envURL,
				Description: "Runtime environment server (from " + serverConfig.BaseURL + ")",
			})
		}
	}

	// No hardcoded fallback URLs - clients should set base URLs at runtime
	// This ensures frontend clients can dynamically configure API endpoints
	// based on their deployment environment

	return servers
}

// Helper functions

// convertGinPathToOpenAPI converts Gin-style path parameters to OpenAPI format
// Example: "/campaigns/:campaignId/results" -> "/campaigns/{campaignId}/results"
// Also handles paths that are already in OpenAPI format and leaves them unchanged
func convertGinPathToOpenAPI(ginPath string) string {
	// If path is already in OpenAPI format (contains {param}), return as-is
	if strings.Contains(ginPath, "{") && strings.Contains(ginPath, "}") {
		return ginPath
	}
	
	// Convert Gin-style :param to OpenAPI {param} format
	result := ginPath
	for i := 0; i < len(result); i++ {
		if result[i] == ':' {
			start := i
			i++
			for i < len(result) && (result[i] != '/' && result[i] != '?') {
				i++
			}
			paramName := result[start+1 : i]
			result = result[:start] + "{" + paramName + "}" + result[i:]
			i = start + len(paramName) + 2
		}
	}
	return result
}

// isAuthEndpoint checks if a path is an authentication endpoint
func isAuthEndpoint(path string) bool {
	return contains(path, "/auth/") || contains(path, "/login") || contains(path, "/logout")
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || (len(s) > len(substr) && 
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || 
		 containsSubstring(s, substr))))
}

// containsSubstring is a helper for the contains function
func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}