package analyzer

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"mcp/internal/models"
	"os"
	"path/filepath"
	"strings"
)

// ParseGoFiles analyzes Go source files and extracts detailed information
func ParseGoFiles(dir string) ([]models.GoFile, error) {
	var goFiles []models.GoFile

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		goFile := models.GoFile{
			Name:        filepath.Base(path),
			Path:        path,
			Package:     node.Name.Name,
			PackageName: node.Name.Name,
			Functions:   extractFunctions(node),
			Structs:     extractStructs(node),
			Interfaces:  extractInterfaces(node),
			Imports:     extractImports(node),
			Types:       extractTypes(node),
		}

		goFiles = append(goFiles, goFile)
		return nil
	})

	return goFiles, err
}

// extractFunctions extracts function names from AST
func extractFunctions(node *ast.File) []string {
	var functions []string

	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.FuncDecl:
			if x.Name != nil {
				funcName := x.Name.Name
				if x.Recv != nil && len(x.Recv.List) > 0 {
					// Method - include receiver type
					if len(x.Recv.List) > 0 {
						if starExpr, ok := x.Recv.List[0].Type.(*ast.StarExpr); ok {
							if ident, ok := starExpr.X.(*ast.Ident); ok {
								funcName = fmt.Sprintf("(%s) %s", ident.Name, funcName)
							}
						} else if ident, ok := x.Recv.List[0].Type.(*ast.Ident); ok {
							funcName = fmt.Sprintf("(%s) %s", ident.Name, funcName)
						}
					}
				}
				functions = append(functions, funcName)
			}
		}
		return true
	})

	return functions
}

// extractStructs extracts struct names from AST
func extractStructs(node *ast.File) []string {
	var structs []string

	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.GenDecl:
			if x.Tok == token.TYPE {
				for _, spec := range x.Specs {
					if typeSpec, ok := spec.(*ast.TypeSpec); ok {
						if _, ok := typeSpec.Type.(*ast.StructType); ok {
							structs = append(structs, typeSpec.Name.Name)
						}
					}
				}
			}
		}
		return true
	})

	return structs
}

// extractInterfaces extracts interface names from AST
func extractInterfaces(node *ast.File) []string {
	var interfaces []string

	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.GenDecl:
			if x.Tok == token.TYPE {
				for _, spec := range x.Specs {
					if typeSpec, ok := spec.(*ast.TypeSpec); ok {
						if _, ok := typeSpec.Type.(*ast.InterfaceType); ok {
							interfaces = append(interfaces, typeSpec.Name.Name)
						}
					}
				}
			}
		}
		return true
	})

	return interfaces
}

// extractImports extracts import paths from AST
func extractImports(node *ast.File) []string {
	var imports []string

	for _, imp := range node.Imports {
		if imp.Path != nil {
			importPath := strings.Trim(imp.Path.Value, "\"")
			imports = append(imports, importPath)
		}
	}

	return imports
}

// extractTypes extracts all type names from AST
func extractTypes(node *ast.File) []string {
	var types []string

	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.GenDecl:
			if x.Tok == token.TYPE {
				for _, spec := range x.Specs {
					if typeSpec, ok := spec.(*ast.TypeSpec); ok {
						types = append(types, typeSpec.Name.Name)
					}
				}
			}
		}
		return true
	})

	return types
}

// ParseGinRoutes analyzes Go files to extract Gin routes
func ParseGinRoutes(filePath string) ([]models.Route, error) {
	var routes []models.Route

	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, filePath, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	// Track router groups and their prefixes
	routerGroups := make(map[string]string)

	ast.Inspect(node, func(n ast.Node) bool {
		if callExpr, ok := n.(*ast.CallExpr); ok {
			if selExpr, ok := callExpr.Fun.(*ast.SelectorExpr); ok {
				method := selExpr.Sel.Name

				// Check for router group definitions: router.Group("/path")
				if method == "Group" && len(callExpr.Args) >= 1 {
					if pathLit, ok := callExpr.Args[0].(*ast.BasicLit); ok {
						groupPath := strings.Trim(pathLit.Value, "\"")
						// Store group path for potential future use
						routerGroups["group"] = groupPath
					}
				}

				// Check for HTTP method calls
				if isHTTPMethod(method) && len(callExpr.Args) >= 2 {
					// First argument should be the path
					if pathLit, ok := callExpr.Args[0].(*ast.BasicLit); ok {
						path := strings.Trim(pathLit.Value, "\"")

						// Find the handler (last argument that's a function)
						var handler string
						for i := len(callExpr.Args) - 1; i >= 1; i-- {
							arg := callExpr.Args[i]
							if ident, ok := arg.(*ast.Ident); ok {
								handler = ident.Name
								break
							} else if selExpr, ok := arg.(*ast.SelectorExpr); ok {
								// Build full selector path (e.g., apiHandler.ListUsersGin)
								if x, ok := selExpr.X.(*ast.Ident); ok {
									handler = x.Name + "." + selExpr.Sel.Name
								} else {
									handler = selExpr.Sel.Name
								}
								break
							}
						}

						// Determine if this is part of a group by checking the receiver
						var fullPath string
						if x, ok := selExpr.X.(*ast.Ident); ok {
							// Check common group patterns
							switch x.Name {
							case "authRoutes":
								fullPath = "/api/v2/auth" + path
							case "apiV2":
								fullPath = "/api/v2" + path
							case "adminRoutes":
								fullPath = "/api/v2/admin" + path
							case "personaGroup":
								fullPath = "/api/v2/personas" + path
							case "proxyGroup":
								fullPath = "/api/v2/proxies" + path
							case "configGroup":
								fullPath = "/api/v2/config" + path
							case "keywordSetGroup":
								fullPath = "/api/v2/keywords/sets" + path
							case "extractGroup":
								fullPath = "/api/v2/extract/keywords" + path
							case "newCampaignRoutesGroup":
								fullPath = "/api/v2/campaigns" + path
							case "dnsPersonaGroup":
								fullPath = "/api/v2/personas/dns" + path
							case "httpPersonaGroup":
								fullPath = "/api/v2/personas/http" + path
							case "campaignApiV2":
								fullPath = "/api/v2" + path
							case "router":
								fullPath = path
							default:
								// Fallback to just the path
								fullPath = path
							}
						} else {
							fullPath = path
						}

						routes = append(routes, models.Route{
							Method:  strings.ToUpper(method),
							Path:    fullPath,
							Handler: handler,
						})
					}
				}
			}
		}
		return true
	})

	return routes, nil
}

// isHTTPMethod checks if a string is an HTTP method
func isHTTPMethod(method string) bool {
	httpMethods := []string{"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"}
	method = strings.ToUpper(method)
	for _, m := range httpMethods {
		if m == method {
			return true
		}
	}
	return false
}

// FindByType finds references to a specific type
func FindByType(dirPath string, typeName string) ([]models.Reference, error) {
	var references []models.Reference

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
			// Look for type usage in various contexts
			switch x := n.(type) {
			case *ast.Ident:
				if x.Name == typeName {
					pos := fset.Position(x.Pos())
					references = append(references, models.Reference{
						Name: typeName,
						File: path,
						Line: pos.Line,
						Type: "identifier",
					})
				}
			case *ast.SelectorExpr:
				if x.Sel.Name == typeName {
					pos := fset.Position(x.Sel.Pos())
					references = append(references, models.Reference{
						Name: typeName,
						File: path,
						Line: pos.Line,
						Type: "selector",
					})
				}
			}
			return true
		})

		return nil
	})

	return references, err
}
