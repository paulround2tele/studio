package reflection

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"strings"

	"github.com/fntelecomllc/studio/backend/internal/openapi/config"
)

// HandlerAnalyzer analyzes handler function signatures and extracts type information
type HandlerAnalyzer struct {
	config   *config.GenerationConfig
	fileSet  *token.FileSet
	packages map[string]*ast.Package
}

// NewHandlerAnalyzer creates a new handler analyzer
func NewHandlerAnalyzer(cfg *config.GenerationConfig) *HandlerAnalyzer {
	return &HandlerAnalyzer{
		config:   cfg,
		fileSet:  token.NewFileSet(),
		packages: make(map[string]*ast.Package),
	}
}

// AnalyzeHandler analyzes a handler function and extracts detailed information
func (ha *HandlerAnalyzer) AnalyzeHandler(route *DiscoveredRoute) (*HandlerInfo, error) {
	// Find the handler function in the source code
	funcDecl, err := ha.findHandlerFunction(route.FunctionName, route.HandlerName)
	if err != nil {
		return nil, fmt.Errorf("failed to find handler function %s: %w", route.FunctionName, err)
	}

	if funcDecl == nil {
		// Return basic handler info if we can't find the function
		return &HandlerInfo{
			FunctionDecl:   nil,
			RequestType:    "",
			ResponseType:   "",
			Documentation:  []string{},
			PathParams:     ha.extractPathParamsFromRoute(route.Path),
			QueryParams:    []string{},
			HasRequestBody: route.Method != "GET", // Allow DELETE methods to have request bodies
		}, nil
	}

	// Analyze the function
	handlerInfo := &HandlerInfo{
		FunctionDecl:   funcDecl,
		PathParams:     ha.extractPathParamsFromRoute(route.Path),
		QueryParams:    []string{},
		HasRequestBody: false, // Will be set to true by analyzeHandlerBody if ShouldBindJSON is detected
	}

	// Extract documentation
	handlerInfo.Documentation = ha.extractDocumentation(funcDecl)

	// Analyze function body for request/response types
	ha.analyzeHandlerBody(funcDecl, handlerInfo)

	return handlerInfo, nil
}

// findHandlerFunction finds a handler function declaration in the parsed packages
func (ha *HandlerAnalyzer) findHandlerFunction(funcName, _ string) (*ast.FuncDecl, error) {
	// First, make sure we have parsed the relevant packages
	if len(ha.packages) == 0 {
		err := ha.parsePackages()
		if err != nil {
			return nil, err
		}
	}

	// Search for the function in all packages
	for _, pkg := range ha.packages {
		for _, file := range pkg.Files {
			for _, decl := range file.Decls {
				if funcDecl, ok := decl.(*ast.FuncDecl); ok {
					if funcDecl.Name != nil && funcDecl.Name.Name == funcName {
						// Verify this is a Gin handler (takes *gin.Context as parameter)
						if ha.isGinHandler(funcDecl) {
							return funcDecl, nil
						}
					}
				}
			}
		}
	}

	return nil, nil // Not finding the function is not necessarily an error
}

// parsePackages parses all configured packages
func (ha *HandlerAnalyzer) parsePackages() error {
	for _, pkgPath := range ha.config.PackagePaths {
		packages, err := parser.ParseDir(ha.fileSet, pkgPath, nil, parser.ParseComments)
		if err != nil {
			if ha.config.VerboseLogging {
				fmt.Printf("Warning: Failed to parse package %s: %v\n", pkgPath, err)
			}
			continue
		}

		for name, pkg := range packages {
			ha.packages[name] = pkg
		}
	}
	return nil
}

// isGinHandler checks if a function is a Gin handler (takes *gin.Context as first parameter)
func (ha *HandlerAnalyzer) isGinHandler(fn *ast.FuncDecl) bool {
	if fn.Type.Params == nil || len(fn.Type.Params.List) == 0 {
		return false
	}

	// Check if first parameter is *gin.Context
	for _, param := range fn.Type.Params.List {
		if starExpr, ok := param.Type.(*ast.StarExpr); ok {
			if selExpr, ok := starExpr.X.(*ast.SelectorExpr); ok {
				if ident, ok := selExpr.X.(*ast.Ident); ok {
					if ident.Name == "gin" && selExpr.Sel.Name == "Context" {
						return true
					}
				}
			}
		}
	}

	return false
}

// extractDocumentation extracts documentation from function comments
func (ha *HandlerAnalyzer) extractDocumentation(fn *ast.FuncDecl) []string {
	var docs []string

	if fn.Doc != nil {
		for _, comment := range fn.Doc.List {
			text := strings.TrimPrefix(comment.Text, "//")
			text = strings.TrimSpace(text)
			if text != "" {
				docs = append(docs, text)
			}
		}
	}

	return docs
}

// analyzeHandlerBody analyzes the handler function body to extract request/response types
func (ha *HandlerAnalyzer) analyzeHandlerBody(fn *ast.FuncDecl, info *HandlerInfo) {
	if fn.Body == nil {
		fmt.Printf("[DEBUG] analyzeHandlerBody: function body is nil for %s\n", fn.Name.Name)
		return
	}

	fmt.Printf("[DEBUG] analyzeHandlerBody: analyzing function %s\n", fn.Name.Name)

	// First pass: collect variable type mappings
	varTypes := make(map[string]string)
	ast.Inspect(fn.Body, func(n ast.Node) bool {
		if declStmt, ok := n.(*ast.DeclStmt); ok {
			if genDecl, ok := declStmt.Decl.(*ast.GenDecl); ok && genDecl.Tok == token.VAR {
				for _, spec := range genDecl.Specs {
					if valueSpec, ok := spec.(*ast.ValueSpec); ok && valueSpec.Type != nil {
						var typeName string

						// Handle simple types (e.g., LoginRequest)
						if ident, ok := valueSpec.Type.(*ast.Ident); ok {
							typeName = ident.Name
						}
						// Handle qualified types (e.g., models.LoginRequest, config.LoggingConfig)
						if selExpr, ok := valueSpec.Type.(*ast.SelectorExpr); ok {
							if pkgIdent, ok := selExpr.X.(*ast.Ident); ok {
								// Use just the type name without package prefix for schema generation
								typeName = selExpr.Sel.Name
								fmt.Printf("[DEBUG] analyzeHandlerBody: found qualified type %s.%s, using type name: %s\n", pkgIdent.Name, selExpr.Sel.Name, typeName)
							}
						}

						if typeName != "" {
							for _, name := range valueSpec.Names {
								varTypes[name.Name] = typeName
								fmt.Printf("[DEBUG] analyzeHandlerBody: found variable mapping %s -> %s\n", name.Name, typeName)
							}
						}
					}
				}
			}
		}
		return true
	})

	fmt.Printf("[DEBUG] analyzeHandlerBody: collected %d variable type mappings\n", len(varTypes))

	// Second pass: analyze calls and assignments with type context
	ast.Inspect(fn.Body, func(n ast.Node) bool {
		switch node := n.(type) {
		case *ast.CallExpr:
			ha.analyzeCallExpression(node, info)
			ha.analyzeCallExpressionWithTypes(node, info, varTypes)
		case *ast.AssignStmt:
			ha.analyzeAssignment(node, info)
		}
		return true
	})

	fmt.Printf("[DEBUG] analyzeHandlerBody: final result - HasRequestBody: %v, RequestType: %s\n", info.HasRequestBody, info.RequestType)
}

// analyzeCallExpression analyzes function calls within the handler
func (ha *HandlerAnalyzer) analyzeCallExpression(call *ast.CallExpr, info *HandlerInfo) {
	if selExpr, ok := call.Fun.(*ast.SelectorExpr); ok {
		methodName := selExpr.Sel.Name

		switch methodName {
		case "ShouldBindJSON", "BindJSON", "ShouldBind", "Bind":
			// This suggests a request body binding
			info.HasRequestBody = true
			if len(call.Args) > 0 {
				// Try to extract the type being bound to
				if unaryExpr, ok := call.Args[0].(*ast.UnaryExpr); ok {
					if ident, ok := unaryExpr.X.(*ast.Ident); ok {
						info.RequestType = ident.Name
					}
				}
			}

		case "JSON", "YAML", "XML":
			// This suggests a response type
			if len(call.Args) >= 2 {
				// Second argument is typically the response data
				info.ResponseType = ha.extractTypeFromExpression(call.Args[1])
			}

		case "Query", "Param":
			// This suggests query or path parameters
			if len(call.Args) > 0 {
				if basicLit, ok := call.Args[0].(*ast.BasicLit); ok {
					paramName := strings.Trim(basicLit.Value, `"`)
					if methodName == "Query" {
						info.QueryParams = append(info.QueryParams, paramName)
					}
					// Path params are already extracted from the route
				}
			}
		}
	}
}

// analyzeCallExpressionWithTypes analyzes function calls with variable type context
func (ha *HandlerAnalyzer) analyzeCallExpressionWithTypes(call *ast.CallExpr, info *HandlerInfo, varTypes map[string]string) {
	if selExpr, ok := call.Fun.(*ast.SelectorExpr); ok {
		methodName := selExpr.Sel.Name

		switch methodName {
		case "ShouldBindJSON", "BindJSON", "ShouldBind", "Bind":
			fmt.Printf("[DEBUG] analyzeCallExpressionWithTypes: found %s call\n", methodName)
			// This suggests a request body binding
			info.HasRequestBody = true
			if len(call.Args) > 0 {
				// Try to extract the type being bound to
				if unaryExpr, ok := call.Args[0].(*ast.UnaryExpr); ok {
					if ident, ok := unaryExpr.X.(*ast.Ident); ok {
						varName := ident.Name
						fmt.Printf("[DEBUG] analyzeCallExpressionWithTypes: variable name: %s\n", varName)
						// Look up the actual type from our variable mapping
						if typeName, exists := varTypes[varName]; exists {
							info.RequestType = typeName
							fmt.Printf("[DEBUG] analyzeCallExpressionWithTypes: resolved type from mapping: %s -> %s\n", varName, typeName)
						} else {
							// Fallback to variable name if type not found
							info.RequestType = varName
							fmt.Printf("[DEBUG] analyzeCallExpressionWithTypes: no type mapping found, using variable name: %s\n", varName)
						}
					}
				}
			}
		}
	}
}

// analyzeAssignment analyzes variable assignments within the handler
func (ha *HandlerAnalyzer) analyzeAssignment(assign *ast.AssignStmt, info *HandlerInfo) {
	// Look for patterns like: var request RequestType
	// Only set RequestType if it hasn't already been detected from ShouldBindJSON calls
	if info.RequestType != "" && info.HasRequestBody {
		// RequestType already correctly detected from ShouldBindJSON, don't override
		fmt.Printf("[DEBUG] analyzeAssignment: skipping assignment analysis, RequestType already detected: %s\n", info.RequestType)
		return
	}

	for i, lhs := range assign.Lhs {
		if ident, ok := lhs.(*ast.Ident); ok {
			if strings.Contains(strings.ToLower(ident.Name), "request") && i < len(assign.Rhs) {
				if rhs := assign.Rhs[i]; rhs != nil {
					extractedType := ha.extractTypeFromExpression(rhs)
					fmt.Printf("[DEBUG] analyzeAssignment: found variable %s containing 'request', extracted type: %s, setting RequestType: %s\n", ident.Name, extractedType, extractedType)
					info.RequestType = extractedType
				}
			}
		}
	}
}

// extractTypeFromExpression extracts type information from an AST expression
func (ha *HandlerAnalyzer) extractTypeFromExpression(expr ast.Expr) string {
	switch e := expr.(type) {
	case *ast.Ident:
		return e.Name
	case *ast.SelectorExpr:
		if ident, ok := e.X.(*ast.Ident); ok {
			return ident.Name + "." + e.Sel.Name
		}
	case *ast.CompositeLit:
		if ident, ok := e.Type.(*ast.Ident); ok {
			return ident.Name
		}
		if selExpr, ok := e.Type.(*ast.SelectorExpr); ok {
			if ident, ok := selExpr.X.(*ast.Ident); ok {
				return ident.Name + "." + selExpr.Sel.Name
			}
		}
	case *ast.UnaryExpr:
		return ha.extractTypeFromExpression(e.X)
	case *ast.CallExpr:
		// Handle function calls that return typed values
		if ident, ok := e.Fun.(*ast.Ident); ok {
			return ident.Name
		}
	}
	return ""
}

// extractPathParamsFromRoute extracts path parameter names from a route path
func (ha *HandlerAnalyzer) extractPathParamsFromRoute(path string) []string {
	var params []string
	parts := strings.Split(path, "/")

	for _, part := range parts {
		if strings.HasPrefix(part, ":") {
			paramName := strings.TrimPrefix(part, ":")
			params = append(params, paramName)
		}
	}

	return params
}

// GetRequestResponseTypes attempts to infer request and response types for a handler
func (ha *HandlerAnalyzer) GetRequestResponseTypes(handlerInfo *HandlerInfo) (requestType, responseType string) {
	if handlerInfo == nil {
		return "", ""
	}

	// Use extracted types if available
	if handlerInfo.RequestType != "" {
		requestType = handlerInfo.RequestType
	}

	if handlerInfo.ResponseType != "" {
		responseType = handlerInfo.ResponseType
	}

	// If no types found, use generic types based on presence of request body
	if requestType == "" && handlerInfo.HasRequestBody {
		requestType = "object"
	}

	if responseType == "" {
		responseType = "object"
	}

	return requestType, responseType
}
