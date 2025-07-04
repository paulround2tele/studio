package analyzer

import (
	"go/ast"
	"go/parser"
	"go/token"
	"mcp/internal/models"
	"os"
	"path/filepath"
	"strings"
)

// ParseHandlers analyzes Go files to extract handler functions
func ParseHandlers(dirPath string) ([]models.Handler, error) {
	var handlers []models.Handler

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		ast.Inspect(node, func(n ast.Node) bool {
			if fn, ok := n.(*ast.FuncDecl); ok && fn.Name != nil {
				// Look for handler functions (functions that take http.ResponseWriter)
				if fn.Type.Params != nil {
					for _, param := range fn.Type.Params.List {
						if selExpr, ok := param.Type.(*ast.SelectorExpr); ok {
							if selExpr.Sel.Name == "ResponseWriter" {
								handlers = append(handlers, models.Handler{
									Name: fn.Name.Name,
									File: path,
								})
								break
							}
						}
					}
				}
			}
			return true
		})

		return nil
	})

	return handlers, err
}

// ParseServices analyzes Go files to extract service definitions
func ParseServices(dirPath string) ([]models.Service, error) {
	var services []models.Service

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		// Look for struct types that might be services
		ast.Inspect(node, func(n ast.Node) bool {
			if genDecl, ok := n.(*ast.GenDecl); ok && genDecl.Tok == token.TYPE {
				for _, spec := range genDecl.Specs {
					if typeSpec, ok := spec.(*ast.TypeSpec); ok {
						if structType, ok := typeSpec.Type.(*ast.StructType); ok {
							// Check if it has methods (service-like)
							serviceName := typeSpec.Name.Name
							if strings.HasSuffix(serviceName, "Service") ||
								strings.HasSuffix(serviceName, "Handler") ||
								strings.HasSuffix(serviceName, "Manager") ||
								strings.HasSuffix(serviceName, "Scanner") ||
								strings.HasSuffix(serviceName, "Extractor") ||
								strings.Contains(strings.ToLower(serviceName), "keywordextractor") ||
								strings.Contains(strings.ToLower(serviceName), "keywordscanner") ||
								strings.Contains(strings.ToLower(serviceName), "proxymanager") {
	
								methods := extractMethodsForType(node, serviceName)
								
								// Determine service category based on name and path
								category := determineServiceCategory(serviceName, path)
								
								services = append(services, models.Service{
									Name:      serviceName,
									File:      path,
									Methods:   methods,
									Interface: "",
									Category:  category,
								})
							}
							_ = structType // Mark as used
						}
					}
				}
			}
			return true
		})

		return nil
	})

	return services, err
}

// extractMethodsForType finds methods for a given type
func extractMethodsForType(node *ast.File, typeName string) []string {
	var methods []string

	ast.Inspect(node, func(n ast.Node) bool {
		if fn, ok := n.(*ast.FuncDecl); ok && fn.Name != nil && fn.Recv != nil {
			// Check if this is a method for our type
			for _, recv := range fn.Recv.List {
				var recvType string
				if starExpr, ok := recv.Type.(*ast.StarExpr); ok {
					if ident, ok := starExpr.X.(*ast.Ident); ok {
						recvType = ident.Name
					}
				} else if ident, ok := recv.Type.(*ast.Ident); ok {
					recvType = ident.Name
				}

				if recvType == typeName {
					methods = append(methods, fn.Name.Name)
				}
			}
		}
		return true
	})

	return methods
}

// GetInterfaces analyzes Go files to extract interface definitions
func GetInterfaces(dirPath string) ([]models.InterfaceDefinition, error) {
	var interfaces []models.InterfaceDefinition

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		ast.Inspect(node, func(n ast.Node) bool {
			if genDecl, ok := n.(*ast.GenDecl); ok && genDecl.Tok == token.TYPE {
				for _, spec := range genDecl.Specs {
					if typeSpec, ok := spec.(*ast.TypeSpec); ok {
						if interfaceType, ok := typeSpec.Type.(*ast.InterfaceType); ok {
							methods := extractInterfaceMethods(interfaceType)
							interfaces = append(interfaces, models.InterfaceDefinition{
								Name:    typeSpec.Name.Name,
								File:    path,
								Methods: methods,
							})
						}
					}
				}
			}
			return true
		})

		return nil
	})

	return interfaces, err
}

// extractInterfaceMethods extracts method names from an interface type
func extractInterfaceMethods(interfaceType *ast.InterfaceType) []string {
	var methods []string

	for _, method := range interfaceType.Methods.List {
		if len(method.Names) > 0 {
			methods = append(methods, method.Names[0].Name)
		}
	}

	return methods
}

// FindImplementations finds types that implement a given interface
func FindImplementations(dirPath string, interfaceName string) ([]models.Implementation, error) {
	var implementations []models.Implementation

	// First, get the interface definition
	interfaces, err := GetInterfaces(dirPath)
	if err != nil {
		return nil, err
	}

	var targetInterface *models.InterfaceDefinition
	for _, iface := range interfaces {
		if iface.Name == interfaceName {
			targetInterface = &iface
			break
		}
	}

	if targetInterface == nil {
		return implementations, nil // Interface not found
	}

	// Find types that implement all methods of the interface
	services, err := ParseServices(dirPath)
	if err != nil {
		return nil, err
	}

	for _, service := range services {
		if implementsInterface(service.Methods, targetInterface.Methods) {
			implementations = append(implementations, models.Implementation{
				TypeName:      service.Name,
				InterfaceName: interfaceName,
				File:          service.File,
			})
		}
	}

	return implementations, nil
}

// implementsInterface checks if a type implements all methods of an interface
func implementsInterface(typeMethods, interfaceMethods []string) bool {
	for _, ifaceMethod := range interfaceMethods {
		found := false
		for _, typeMethod := range typeMethods {
			if typeMethod == ifaceMethod {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return len(interfaceMethods) > 0 // Must have at least one method to implement
}

// GetCallGraph analyzes function calls to build a call graph
func GetCallGraph(dirPath string, functionName string) (models.CallGraphNode, error) {
	var callGraph models.CallGraphNode
	callGraph.FunctionName = functionName
	callGraph.Calls = []string{}

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		// Find the target function
		ast.Inspect(node, func(n ast.Node) bool {
			if fn, ok := n.(*ast.FuncDecl); ok && fn.Name != nil && fn.Name.Name == functionName {
				callGraph.Package = node.Name.Name
				callGraph.File = path

				// Find all function calls within this function
				ast.Inspect(fn, func(innerNode ast.Node) bool {
					if callExpr, ok := innerNode.(*ast.CallExpr); ok {
						if ident, ok := callExpr.Fun.(*ast.Ident); ok {
							callGraph.Calls = append(callGraph.Calls, ident.Name)
						} else if selExpr, ok := callExpr.Fun.(*ast.SelectorExpr); ok {
							callGraph.Calls = append(callGraph.Calls, selExpr.Sel.Name)
						}
					}
					return true
				})
			}
			return true
		})

		return nil
	})

	callGraph.CallCount = len(callGraph.Calls)
	return callGraph, err
}

// ParseMiddleware analyzes Go files to extract middleware definitions
func ParseMiddleware(dirPath string) ([]models.Middleware, error) {
	var middlewares []models.Middleware

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		ast.Inspect(node, func(n ast.Node) bool {
			if fn, ok := n.(*ast.FuncDecl); ok && fn.Name != nil {
				// Look for middleware functions (typically return http.Handler or similar)
				funcName := fn.Name.Name
				if strings.Contains(strings.ToLower(funcName), "middleware") ||
					strings.Contains(strings.ToLower(funcName), "auth") ||
					strings.Contains(strings.ToLower(funcName), "cors") ||
					strings.Contains(strings.ToLower(funcName), "logger") ||
					strings.Contains(strings.ToLower(funcName), "validation") ||
					strings.Contains(strings.ToLower(funcName), "security") ||
					strings.Contains(strings.ToLower(funcName), "ratelimit") ||
					strings.Contains(strings.ToLower(funcName), "session") {

					pos := fset.Position(fn.Pos())
					
					// Determine middleware type based on function name and path
					middlewareType := determineMiddlewareType(funcName, path)
					
					middlewares = append(middlewares, models.Middleware{
						Name:           funcName,
						File:           path,
						Line:           pos.Line,
						Type:           middlewareType,
						BusinessDomain: extractBusinessDomainFromPath(path),
					})
				}
			}
			return true
		})

		return nil
	})

	return middlewares, err
}

// ParseWebSocketEndpoints analyzes Go files to extract WebSocket endpoints
func ParseWebSocketEndpoints(dirPath string) ([]models.WebSocketEndpoint, error) {
	var endpoints []models.WebSocketEndpoint

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			// Look for WebSocket upgrade patterns
			if strings.Contains(strings.ToLower(line), "websocket") &&
				(strings.Contains(strings.ToLower(line), "upgrade") ||
					strings.Contains(strings.ToLower(line), "conn")) {

				// Extract route information if available
				endpoints = append(endpoints, models.WebSocketEndpoint{
					Method:  "GET",
					Path:    "/ws", // Default, would need more sophisticated parsing
					Handler: "WebSocketHandler",
				})
				break // Only add one per file to avoid duplicates
			}
		}

		return nil
	})

	return endpoints, err
}

// ParseWebSocketHandlers analyzes Go files to extract WebSocket handlers
func ParseWebSocketHandlers(dirPath string) ([]models.WebSocketHandler, error) {
	var handlers []models.WebSocketHandler

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		ast.Inspect(node, func(n ast.Node) bool {
			if fn, ok := n.(*ast.FuncDecl); ok && fn.Name != nil {
				funcName := fn.Name.Name
				// Look for WebSocket handler functions
				if strings.Contains(strings.ToLower(funcName), "websocket") ||
					strings.Contains(strings.ToLower(funcName), "ws") {

					handlers = append(handlers, models.WebSocketHandler{
						Name: funcName,
						File: path,
					})
				}
			}
			return true
		})

		return nil
	})

	return handlers, err
}

// ParseWebSocketMessages analyzes Go files to extract WebSocket message types
func ParseWebSocketMessages(dirPath string) ([]models.WebSocketMessage, error) {
	var messages []models.WebSocketMessage

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		ast.Inspect(node, func(n ast.Node) bool {
			if genDecl, ok := n.(*ast.GenDecl); ok && genDecl.Tok == token.TYPE {
				for _, spec := range genDecl.Specs {
					if typeSpec, ok := spec.(*ast.TypeSpec); ok {
						typeName := typeSpec.Name.Name
						if strings.Contains(strings.ToLower(typeName), "message") ||
							strings.Contains(strings.ToLower(typeName), "msg") ||
							strings.Contains(strings.ToLower(typeName), "request") ||
							strings.Contains(strings.ToLower(typeName), "response") {

							messages = append(messages, models.WebSocketMessage{
								Name: typeName,
								File: path,
								Type: "message",
							})
						}
					}
				}
			}
			return true
		})

		return nil
	})

	return messages, err
}

// determineServiceCategory categorizes services based on their name and location
func determineServiceCategory(serviceName, filePath string) string {
	serviceLower := strings.ToLower(serviceName)
	pathLower := strings.ToLower(filePath)
	
	// New business domain services
	if strings.Contains(serviceLower, "keyword") || strings.Contains(pathLower, "keyword") {
		if strings.Contains(serviceLower, "extractor") || strings.Contains(pathLower, "extractor") {
			return "keyword-extraction"
		}
		if strings.Contains(serviceLower, "scanner") || strings.Contains(pathLower, "scanner") {
			return "keyword-scanning"
		}
		return "keyword-management"
	}
	
	if strings.Contains(serviceLower, "proxy") || strings.Contains(pathLower, "proxy") {
		if strings.Contains(serviceLower, "manager") || strings.Contains(pathLower, "manager") {
			return "proxy-management"
		}
		if strings.Contains(serviceLower, "pool") || strings.Contains(pathLower, "pool") {
			return "proxy-pools"
		}
		return "proxy-orchestration"
	}
	
	// Traditional categories
	if strings.Contains(serviceLower, "campaign") || strings.Contains(pathLower, "campaign") {
		return "campaign-management"
	}
	
	if strings.Contains(serviceLower, "persona") || strings.Contains(pathLower, "persona") {
		return "persona-management"
	}
	
	if strings.Contains(serviceLower, "auth") || strings.Contains(pathLower, "auth") {
		return "authentication"
	}
	
	// Database and tooling services
	if strings.Contains(pathLower, "migration") || strings.Contains(pathLower, "schema") {
		return "database-tooling"
	}
	
	if strings.Contains(pathLower, "websocket") {
		return "real-time-communication"
	}
	
	return "core-service"
}

// determineMiddlewareType determines the type of middleware based on function name and path
func determineMiddlewareType(funcName, filePath string) string {
	funcLower := strings.ToLower(funcName)
	pathLower := strings.ToLower(filePath)
	
	if strings.Contains(funcLower, "auth") || strings.Contains(funcLower, "session") {
		return "authentication"
	}
	
	if strings.Contains(funcLower, "cors") {
		return "cors"
	}
	
	if strings.Contains(funcLower, "validation") || strings.Contains(funcLower, "validate") {
		return "validation"
	}
	
	if strings.Contains(funcLower, "security") || strings.Contains(funcLower, "secure") {
		return "security"
	}
	
	if strings.Contains(funcLower, "rate") || strings.Contains(funcLower, "limit") {
		return "rate-limiting"
	}
	
	if strings.Contains(funcLower, "log") {
		return "logging"
	}
	
	// Business domain specific middleware
	if strings.Contains(pathLower, "keyword") {
		return "keyword-processing"
	}
	
	if strings.Contains(pathLower, "proxy") {
		return "proxy-handling"
	}
	
	return "generic"
}

// extractBusinessDomainFromPath extracts business domain from file path
func extractBusinessDomainFromPath(filePath string) string {
	pathLower := strings.ToLower(filePath)
	
	if strings.Contains(pathLower, "keyword") {
		return "keyword-management"
	}
	
	if strings.Contains(pathLower, "proxy") {
		return "proxy-management"
	}
	
	if strings.Contains(pathLower, "campaign") {
		return "campaign-management"
	}
	
	if strings.Contains(pathLower, "persona") {
		return "persona-management"
	}
	
	if strings.Contains(pathLower, "auth") {
		return "authentication"
	}
	
	return "core"
}

// ParseBusinessDomains analyzes Go files to extract business domain structures
func ParseBusinessDomains(dirPath string) ([]models.BusinessDomain, error) {
	var domains []models.BusinessDomain
	
	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}
		
		pathLower := strings.ToLower(path)
		
		// Detect keyword management domain
		if strings.Contains(pathLower, "keyword") {
			if strings.Contains(pathLower, "extractor") {
				domains = append(domains, models.BusinessDomain{
					Name:        "keyword-extraction",
					Description: "HTML content parsing and keyword extraction services",
					Path:        path,
					Services:    []string{"KeywordExtractor"},
					APIs:        []string{"/api/extract/keywords"},
				})
			}
			
			if strings.Contains(pathLower, "scanner") {
				domains = append(domains, models.BusinessDomain{
					Name:        "keyword-scanning",
					Description: "Content scanning and pattern matching services",
					Path:        path,
					Services:    []string{"KeywordScanner"},
					APIs:        []string{"/api/keywords/scan"},
				})
			}
			
			if strings.Contains(pathLower, "sets") || strings.Contains(pathLower, "keyword-sets") {
				domains = append(domains, models.BusinessDomain{
					Name:        "keyword-sets",
					Description: "Keyword set management and rule configuration",
					Path:        path,
					Services:    []string{"KeywordSetService"},
					APIs:        []string{"/api/keywords/sets", "/api/keywords/sets/{setId}"},
				})
			}
		}
		
		// Detect proxy management domain
		if strings.Contains(pathLower, "proxy") {
			if strings.Contains(pathLower, "manager") {
				domains = append(domains, models.BusinessDomain{
					Name:        "proxy-management",
					Description: "Proxy health monitoring and load balancing services",
					Path:        path,
					Services:    []string{"ProxyManager"},
					APIs:        []string{"/api/proxies", "/api/proxies/health"},
				})
			}
			
			if strings.Contains(pathLower, "pool") || strings.Contains(pathLower, "proxy-pools") {
				domains = append(domains, models.BusinessDomain{
					Name:        "proxy-pools",
					Description: "Proxy pool orchestration and management",
					Path:        path,
					Services:    []string{"ProxyPoolService"},
					APIs:        []string{"/api/proxy-pools", "/api/proxy-pools/{poolId}"},
				})
			}
		}
		
		return nil
	})
	
	return domains, err
}

// ParseAdvancedTooling analyzes advanced database and development tooling
func ParseAdvancedTooling(dirPath string) ([]models.AdvancedTool, error) {
	var tools []models.AdvancedTool
	
	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}
		
		pathLower := strings.ToLower(path)
		
		// Database tooling
		if strings.Contains(pathLower, "migration") && strings.Contains(pathLower, "verifier") {
			tools = append(tools, models.AdvancedTool{
				Name:        "migration_verifier",
				Type:        "database-tooling",
				Description: "Database migration verification and rollback safety checks",
				Path:        path,
				Category:    "data-integrity",
			})
		}
		
		if strings.Contains(pathLower, "schema") && strings.Contains(pathLower, "validator") {
			tools = append(tools, models.AdvancedTool{
				Name:        "schema_validator",
				Type:        "database-tooling",
				Description: "Database schema validation and compatibility checks",
				Path:        path,
				Category:    "data-integrity",
			})
		}
		
		// API and contract tooling
		if strings.Contains(pathLower, "contract") && strings.Contains(pathLower, "tester") {
			tools = append(tools, models.AdvancedTool{
				Name:        "api_contract_tester",
				Type:        "api-tooling",
				Description: "API contract validation and testing automation",
				Path:        path,
				Category:    "api-reliability",
			})
		}
		
		// Security tooling
		if strings.Contains(pathLower, "security") && strings.Contains(pathLower, "scanner") {
			tools = append(tools, models.AdvancedTool{
				Name:        "security_scanner",
				Type:        "security-tooling",
				Description: "Automated security vulnerability scanning",
				Path:        path,
				Category:    "security-analysis",
			})
		}
		
		return nil
	})
	
	return tools, err
}
