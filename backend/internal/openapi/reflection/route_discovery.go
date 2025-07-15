package reflection

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"reflect"
	"regexp"
	"strings"

	"github.com/fntelecomllc/studio/backend/internal/openapi/config"
	"github.com/getkin/kin-openapi/openapi3"
)

// RouteDiscoverer discovers API routes by scanning Go source code
type RouteDiscoverer struct {
	config   *config.GenerationConfig
	fileSet  *token.FileSet
	packages map[string]*ast.Package
}

// DiscoveredRoute represents a discovered API route
type DiscoveredRoute struct {
	Method         string
	Path           string
	HandlerName    string
	FunctionName   string
	OperationID    string
	Summary        string
	Description    string
	Tags           []string
	Parameters     openapi3.Parameters
	RequestSchema  *openapi3.SchemaRef
	ResponseSchema *openapi3.SchemaRef
	HandlerInfo    *HandlerInfo
}

// HandlerInfo contains detailed information about a handler function
type HandlerInfo struct {
	FunctionDecl   *ast.FuncDecl
	RequestType    string
	ResponseType   string
	Documentation  []string
	PathParams     []string
	QueryParams    []string
	HasRequestBody bool
}

// BusinessEntity represents a discovered business entity struct
type BusinessEntity struct {
	Name       string
	Package    string
	Type       reflect.Type
	StructType *ast.StructType
	TypeSpec   *ast.TypeSpec
	IsExported bool
	JSONTags   map[string]string
	FilePath   string
}

// NewRouteDiscoverer creates a new route discoverer
func NewRouteDiscoverer(cfg *config.GenerationConfig) *RouteDiscoverer {
	return &RouteDiscoverer{
		config:   cfg,
		fileSet:  token.NewFileSet(),
		packages: make(map[string]*ast.Package),
	}
}

// DiscoverRoutes discovers all API routes from the specified package paths
func (rd *RouteDiscoverer) DiscoverRoutes(packagePaths []string) ([]DiscoveredRoute, error) {
	var allRoutes []DiscoveredRoute

	for _, pkgPath := range packagePaths {
		if rd.config.VerboseLogging {
			fmt.Printf("Scanning package: %s\n", pkgPath)
		}

		routes, err := rd.scanPackage(pkgPath)
		if err != nil {
			if rd.config.VerboseLogging {
				fmt.Printf("Warning: Failed to scan package %s: %v\n", pkgPath, err)
			}
			continue
		}

		allRoutes = append(allRoutes, routes...)
	}

	// Filter routes based on include/exclude patterns
	filteredRoutes := rd.filterRoutes(allRoutes)

	return filteredRoutes, nil
}

// DiscoverBusinessEntities discovers all business entity structs from the specified packages
func (rd *RouteDiscoverer) DiscoverBusinessEntities(packages []string) ([]BusinessEntity, error) {
	var allEntities []BusinessEntity

	// Define business entity packages to scan
	// ONLY include packages with API data models, NOT internal service implementations
	businessEntityPackages := []string{
		"./internal/models",   // Core business models (Campaign, Persona, Proxy, etc.)
		"./internal/api",      // API request/response types (CreateCampaignRequest, etc.)
		"./internal/services", // Service response types (DNSValidationResultsResponse, etc.)
	}

	// Use provided packages or default business entity packages
	packagesToScan := packages
	if len(packagesToScan) == 0 {
		packagesToScan = businessEntityPackages
	}

	for _, pkgPath := range packagesToScan {
		if rd.config.VerboseLogging {
			fmt.Printf("Scanning business entities in package: %s\n", pkgPath)
		}

		entities, err := rd.scanPackageForEntities(pkgPath)
		if err != nil {
			if rd.config.VerboseLogging {
				fmt.Printf("Warning: Failed to scan business entities in package %s: %v\n", pkgPath, err)
			}
			continue
		}

		allEntities = append(allEntities, entities...)
	}

	if rd.config.VerboseLogging {
		fmt.Printf("Discovered %d business entities\n", len(allEntities))
		for _, entity := range allEntities {
			fmt.Printf("  - %s (from %s)\n", entity.Name, entity.Package)
		}
	}

	return allEntities, nil
}

// scanPackageForEntities scans a single package for business entity struct definitions
func (rd *RouteDiscoverer) scanPackageForEntities(pkgPath string) ([]BusinessEntity, error) {
	// Parse the package directory
	packages, err := parser.ParseDir(rd.fileSet, pkgPath, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse package %s: %w", pkgPath, err)
	}

	var entities []BusinessEntity

	for pkgName, pkg := range packages {
		for filePath, file := range pkg.Files {
			fileEntities := rd.scanFileForEntities(file, pkgName, filePath)
			entities = append(entities, fileEntities...)
		}
	}

	return entities, nil
}

// scanFileForEntities scans a single Go file for struct definitions
func (rd *RouteDiscoverer) scanFileForEntities(file *ast.File, pkgName, filePath string) []BusinessEntity {
	var entities []BusinessEntity

	// Look for type declarations
	for _, decl := range file.Decls {
		if genDecl, ok := decl.(*ast.GenDecl); ok && genDecl.Tok == token.TYPE {
			for _, spec := range genDecl.Specs {
				if typeSpec, ok := spec.(*ast.TypeSpec); ok {
					if structType, ok := typeSpec.Type.(*ast.StructType); ok {
						entity := rd.extractBusinessEntity(typeSpec, structType, pkgName, filePath)
						if entity != nil {
							entities = append(entities, *entity)
						}
					}
				}
			}
		}
	}

	return entities
}

// extractBusinessEntity extracts business entity information from a struct type
func (rd *RouteDiscoverer) extractBusinessEntity(typeSpec *ast.TypeSpec, structType *ast.StructType, pkgName, filePath string) *BusinessEntity {
	entityName := typeSpec.Name.Name

	// Check if this is an exported struct (starts with uppercase)
	isExported := entityName[0] >= 'A' && entityName[0] <= 'Z'

	// Exclude internal implementation types that shouldn't be in API schema
	excludedTypes := []string{
		"AuthHandler", "ProxyManager", "DNSValidator", "DatabaseConnectionMetrics",
		"EfficientWorkerPool", "HealthCheckHandler", "StatusResponseWriter",
		"WebSocketHandler", "WorkerCoordinationService", "HTTPValidator",
		"ContentFetcher", "MemoryPoolManager", "CPUOptimizationConfig",
		"CampaignOrchestratorAPIHandler", "APIHandler", "ReflectionEngine",
	}

	for _, excludedType := range excludedTypes {
		if entityName == excludedType {
			return nil // Skip this type
		}
	}

	// Extract JSON tags for all fields
	jsonTags := make(map[string]string)
	if structType.Fields != nil {
		for _, field := range structType.Fields.List {
			for _, name := range field.Names {
				if field.Tag != nil {
					tag := strings.Trim(field.Tag.Value, "`")
					if jsonTag := extractJSONTag(tag); jsonTag != "" && jsonTag != "-" {
						jsonTags[name.Name] = jsonTag
					}
				}
			}
		}
	}

	// Check if this looks like a business entity
	if rd.isBusinessEntity(entityName, structType) {
		return &BusinessEntity{
			Name:       entityName,
			Package:    pkgName,
			StructType: structType,
			TypeSpec:   typeSpec,
			IsExported: isExported,
			JSONTags:   jsonTags,
			FilePath:   filePath,
		}
	}

	return nil
}

// isBusinessEntity determines if a struct is likely a business entity
func (rd *RouteDiscoverer) isBusinessEntity(name string, structType *ast.StructType) bool {
	// Skip if not exported
	if name[0] < 'A' || name[0] > 'Z' {
		return false
	}

	// Known business entity patterns
	businessEntityPatterns := []string{
		"Campaign", "User", "Persona", "Proxy", "GeneratedDomain", "DNSValidationResult",
		"HTTPKeywordResult", "LoginRequest", "LoginResponse", "CreateCampaignRequest",
		"UpdateCampaignRequest", "ProxyPool", "KeywordSet", "DomainGenerationParams",
		"HTTPPersona", "DNSPersona", "KeywordExtractionResult", "ValidationResult",
		"ProxyConfiguration", "CampaignMetrics", "PersonaConfiguration", "DomainValidator",
	}

	// Check exact matches first
	for _, pattern := range businessEntityPatterns {
		if name == pattern {
			return true
		}
	}

	// Check common suffixes that indicate business entities
	businessSuffixes := []string{
		"Request", "Response", "Result", "Config", "Configuration",
		"Params", "Parameters", "Metrics", "Stats", "Status", "Info",
		"Data", "Model", "Entity", "Record", "Item", "Set", "Pool",
	}

	for _, suffix := range businessSuffixes {
		if strings.HasSuffix(name, suffix) {
			return true
		}
	}

	// Check if struct has typical business entity fields
	if structType.Fields != nil && len(structType.Fields.List) > 0 {
		hasIDField := false
		hasTimestampField := false

		for _, field := range structType.Fields.List {
			for _, fieldName := range field.Names {
				fname := fieldName.Name
				// Check for ID fields
				if strings.Contains(strings.ToLower(fname), "id") {
					hasIDField = true
				}
				// Check for timestamp fields
				if strings.Contains(strings.ToLower(fname), "time") ||
					strings.Contains(strings.ToLower(fname), "date") ||
					fname == "CreatedAt" || fname == "UpdatedAt" {
					hasTimestampField = true
				}
			}
		}

		// If it has ID or timestamp fields, likely a business entity
		if hasIDField || hasTimestampField {
			return true
		}
	}

	return false
}

// scanPackage scans a single package for route definitions
func (rd *RouteDiscoverer) scanPackage(pkgPath string) ([]DiscoveredRoute, error) {
	// Parse the package directory
	packages, err := parser.ParseDir(rd.fileSet, pkgPath, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse package %s: %w", pkgPath, err)
	}

	var routes []DiscoveredRoute

	for _, pkg := range packages {
		for _, file := range pkg.Files {
			fileRoutes := rd.scanFile(file)
			routes = append(routes, fileRoutes...)
		}
	}

	return routes, nil
}

// scanFile scans a single Go file for route definitions
func (rd *RouteDiscoverer) scanFile(file *ast.File) []DiscoveredRoute {
	var routes []DiscoveredRoute

	// Look for function declarations with OpenAPI annotations
	for _, decl := range file.Decls {
		if funcDecl, ok := decl.(*ast.FuncDecl); ok {
			route := rd.extractRouteFromFunction(funcDecl)
			if route != nil {
				routes = append(routes, *route)
			}
		}
	}

	return routes
}

// extractRouteFromFunction extracts route information from a function declaration with OpenAPI annotations
func (rd *RouteDiscoverer) extractRouteFromFunction(funcDecl *ast.FuncDecl) *DiscoveredRoute {
	if funcDecl.Doc == nil {
		return nil
	}

	var route *DiscoveredRoute
	var summary, description, operationID string
	var tags []string
	var method, path string
	var parameters openapi3.Parameters
	var responseSchema *openapi3.SchemaRef

	// Parse OpenAPI annotations from function comments
	for _, comment := range funcDecl.Doc.List {
		text := strings.TrimSpace(strings.TrimPrefix(comment.Text, "//"))

		if strings.HasPrefix(text, "@Summary ") {
			summary = strings.TrimPrefix(text, "@Summary ")
		} else if strings.HasPrefix(text, "@Description ") {
			description = strings.TrimPrefix(text, "@Description ")
		} else if strings.HasPrefix(text, "@Tags ") {
			tagStr := strings.TrimPrefix(text, "@Tags ")
			tags = strings.Split(tagStr, ",")
			for i := range tags {
				tags[i] = strings.TrimSpace(tags[i])
			}
		} else if strings.HasPrefix(text, "@Router ") {
			// Parse @Router /path [method]
			routerStr := strings.TrimPrefix(text, "@Router ")
			if matches := regexp.MustCompile(`^(\S+)\s+\[(\w+)\]`).FindStringSubmatch(routerStr); len(matches) == 3 {
				path = matches[1]
				method = strings.ToUpper(matches[2])
			}
		} else if strings.HasPrefix(text, "@Param ") {
			// Parse @Param paramName paramType paramLocation required "description"
			param := rd.parseParamAnnotation(text)
			if param != nil {
				parameters = append(parameters, param)
			}
		} else if strings.HasPrefix(text, "@Success ") {
			// Parse @Success 200 {object} ResponseModel "description"
			responseSchema = rd.parseSuccessAnnotation(text)
		}
	}

	// Extract path parameters from URL path
	pathParams := rd.extractPathParameters(path)
	for _, pathParam := range pathParams {
		// Check if this parameter already exists in parsed @Param annotations
		found := false
		for _, param := range parameters {
			if param.Value.Name == pathParam.Value.Name {
				found = true
				break
			}
		}

		// If not found in @Param annotations, add the extracted parameter
		if !found {
			parameters = append(parameters, pathParam)
		}
	}

	// Only create route if we have both path and method
	if path != "" && method != "" {
		if operationID == "" {
			operationID = rd.generateOperationID(funcDecl.Name.Name, method)
		}

		route = &DiscoveredRoute{
			Method:         method,
			Path:           path,
			HandlerName:    funcDecl.Name.Name,
			FunctionName:   funcDecl.Name.Name,
			OperationID:    operationID,
			Summary:        summary,
			Description:    description,
			Tags:           tags,
			Parameters:     parameters,
			ResponseSchema: responseSchema,
			HandlerInfo: &HandlerInfo{
				FunctionDecl:  funcDecl,
				Documentation: rd.extractDocumentationFromComments(funcDecl.Doc),
			},
		}
	}

	return route
}

// extractDocumentationFromComments extracts documentation strings from function comments
func (rd *RouteDiscoverer) extractDocumentationFromComments(commentGroup *ast.CommentGroup) []string {
	if commentGroup == nil {
		return nil
	}

	var docs []string
	for _, comment := range commentGroup.List {
		text := strings.TrimSpace(strings.TrimPrefix(comment.Text, "//"))
		if text != "" && !strings.HasPrefix(text, "@") {
			docs = append(docs, text)
		}
	}
	return docs
}

// generateOperationID generates an OpenAPI operation ID from handler name and method
func (rd *RouteDiscoverer) generateOperationID(handlerName, method string) string {
	// Extract the actual function name
	funcName := extractFunctionName(handlerName)

	// Debug logging to understand what's happening
	fmt.Printf("DEBUG: generateOperationID - handlerName=%s, funcName=%s\n", handlerName, funcName)

	// Handle specific auth endpoint naming for TypeScript generator consistency
	if funcName == "Me" {
		fmt.Printf("DEBUG: Converting Me to getCurrentUser\n")
		return "getCurrentUser"
	}

	// Remove standard suffixes but preserve Gin for config endpoints to match TypeScript expectations
	fmt.Printf("DEBUG: Removing standard suffixes from: %s\n", funcName)
	if !strings.Contains(funcName, "Config") {
		fmt.Printf("DEBUG: Removing Gin suffix from %s\n", funcName)
		funcName = strings.TrimSuffix(funcName, "Gin")
	} else {
		fmt.Printf("DEBUG: Preserving Gin suffix for config endpoint %s\n", funcName)
	}
	funcName = strings.TrimSuffix(funcName, "Handler")
	funcName = strings.TrimSuffix(funcName, "Endpoint")

	// Convert to camelCase
	if len(funcName) > 0 {
		result := strings.ToLower(funcName[:1]) + funcName[1:]
		fmt.Printf("DEBUG: Final operationId: %s\n", result)
		return result
	}

	// Fallback to method-based naming
	fallback := strings.ToLower(method) + "Operation"
	fmt.Printf("DEBUG: Using fallback operationId: %s\n", fallback)
	return fallback
}


// extractPathParameters extracts path parameters from a route path
func (rd *RouteDiscoverer) extractPathParameters(path string) openapi3.Parameters {
	var params openapi3.Parameters

	// Find all :param patterns (Gin style)
	re1 := regexp.MustCompile(`:(\w+)`)
	matches1 := re1.FindAllStringSubmatch(path, -1)

	for _, match := range matches1 {
		if len(match) > 1 {
			paramName := match[1]
			param := &openapi3.Parameter{
				Name:        paramName,
				In:          "path",
				Required:    true,
				Description: fmt.Sprintf("%s parameter", strings.Title(paramName)),
				Schema: &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
					},
				},
			}

			// Special handling for ID parameters
			if strings.Contains(paramName, "Id") || strings.Contains(paramName, "ID") {
				param.Schema.Value.Format = "uuid"
				param.Description = fmt.Sprintf("%s UUID", strings.Title(paramName))
			}

			params = append(params, &openapi3.ParameterRef{Value: param})
		}
	}

	// Find all {param} patterns (OpenAPI style)
	re2 := regexp.MustCompile(`\{(\w+)\}`)
	matches2 := re2.FindAllStringSubmatch(path, -1)

	for _, match := range matches2 {
		if len(match) > 1 {
			paramName := match[1]

			// Check if this parameter already exists
			found := false
			for _, existingParam := range params {
				if existingParam.Value.Name == paramName {
					found = true
					break
				}
			}

			if !found {
				param := &openapi3.Parameter{
					Name:        paramName,
					In:          "path",
					Required:    true,
					Description: fmt.Sprintf("%s parameter", strings.Title(paramName)),
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"string"},
						},
					},
				}

				// Special handling for ID parameters
				if strings.Contains(paramName, "Id") || strings.Contains(paramName, "ID") {
					param.Schema.Value.Format = "uuid"
					param.Description = fmt.Sprintf("%s UUID", strings.Title(paramName))
				}

				params = append(params, &openapi3.ParameterRef{Value: param})
			}
		}
	}

	return params
}

// filterRoutes filters routes based on include/exclude patterns
func (rd *RouteDiscoverer) filterRoutes(routes []DiscoveredRoute) []DiscoveredRoute {
	// For now, just return all routes
	// TODO: Implement pattern-based filtering
	return routes
}

// Helper functions


// extractFunctionName extracts the function name from a handler identifier
func extractFunctionName(handlerName string) string {
	// Handle cases like "handler.FunctionName" or just "FunctionName"
	parts := strings.Split(handlerName, ".")
	if len(parts) > 1 {
		return parts[len(parts)-1]
	}
	return handlerName
}

// extractResourceFromPath extracts the resource name from a path
func extractResourceFromPath(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for _, part := range parts {
		if part != "api" && part != "v1" && part != "v2" &&
			!strings.Contains(part, ":") && !strings.Contains(part, "{") {
			return part
		}
	}
	return "resource"
}

// camelToSentence converts camelCase to sentence case
func camelToSentence(s string) string {
	if s == "" {
		return s
	}

	// Add spaces before capital letters
	re := regexp.MustCompile(`([a-z])([A-Z])`)
	s = re.ReplaceAllString(s, `$1 $2`)

	// Capitalize first letter and lowercase the rest appropriately
	words := strings.Fields(s)
	for i, word := range words {
		if i == 0 {
			words[i] = strings.Title(strings.ToLower(word))
		} else {
			words[i] = strings.ToLower(word)
		}
	}

	return strings.Join(words, " ")
}

// parseParamAnnotation parses a @Param annotation and returns an OpenAPI parameter
// Format: @Param paramName paramType paramLocation required "description"
func (rd *RouteDiscoverer) parseParamAnnotation(text string) *openapi3.ParameterRef {
	// Remove @Param prefix
	paramStr := strings.TrimPrefix(text, "@Param ")

	// Split by spaces, but handle quoted strings
	parts := make([]string, 0)
	current := ""
	inQuotes := false

	for _, char := range paramStr {
		if char == '"' {
			inQuotes = !inQuotes
		} else if char == ' ' && !inQuotes {
			if current != "" {
				parts = append(parts, current)
				current = ""
			}
		} else {
			current += string(char)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}

	if len(parts) < 4 {
		return nil // Invalid format
	}

	paramName := parts[0]
	paramLocation := parts[1] // Fixed: location comes before type in standard format
	paramType := parts[2]     // Fixed: type comes after location in standard format
	required := parts[3] == "true"
	description := ""
	if len(parts) > 4 {
		description = strings.Trim(parts[4], `"`)
	}

	// Skip body parameters - they should be handled as requestBody, not parameters
	// In OpenAPI 3.0, valid parameter locations are: query, header, path, cookie
	if paramLocation == "body" {
		return nil
	}

	// Create schema based on type
	var schema *openapi3.SchemaRef
	switch paramType {
	case "string":
		schema = &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"string"},
			},
		}
	case "int", "integer":
		schema = &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"integer"},
			},
		}
	case "bool", "boolean":
		schema = &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"boolean"},
			},
		}
	default:
		schema = &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"string"},
			},
		}
	}

	return &openapi3.ParameterRef{
		Value: &openapi3.Parameter{
			Name:        paramName,
			In:          paramLocation,
			Required:    required,
			Description: description,
			Schema:      schema,
		},
	}
}

// parseSuccessAnnotation parses a @Success annotation and returns an OpenAPI schema reference
// Format: @Success 200 {object} ResponseModel "description"
func (rd *RouteDiscoverer) parseSuccessAnnotation(text string) *openapi3.SchemaRef {
	// Remove @Success prefix
	successStr := strings.TrimPrefix(text, "@Success ")

	// Split by spaces, but handle quoted strings and curly braces
	parts := make([]string, 0)
	current := ""
	inQuotes := false

	for _, char := range successStr {
		if char == '"' {
			inQuotes = !inQuotes
		} else if char == ' ' && !inQuotes {
			if current != "" {
				parts = append(parts, current)
				current = ""
			}
		} else {
			current += string(char)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}

	if len(parts) < 3 {
		return nil // Invalid format
	}

	// Parse parts: statusCode, type, responseModel, [description]
	statusCode := parts[0]
	typeSpec := parts[1]      // e.g., "{object}"
	responseModel := parts[2] // e.g., "PasswordChangeResponse"

	// Only handle 200 responses for now
	if statusCode != "200" {
		return nil
	}

	// Only handle object types for now
	if !strings.Contains(typeSpec, "object") {
		return nil
	}

	// Handle generic Go types by mapping to standard response models
	if strings.Contains(responseModel, "map[string]") {
		responseModel = "StandardSuccessResponse"
	}

	// Strip package prefixes if present to match schema naming
	responseModel = strings.TrimPrefix(responseModel, "models.")
	responseModel = strings.TrimPrefix(responseModel, "config.")
	responseModel = strings.TrimPrefix(responseModel, "services.")
	responseModel = strings.TrimPrefix(responseModel, "api.")

	// Create schema reference to the response model
	return &openapi3.SchemaRef{
		Ref: "#/components/schemas/" + responseModel,
	}
}
