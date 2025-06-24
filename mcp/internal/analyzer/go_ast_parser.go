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

	ast.Inspect(node, func(n ast.Node) bool {
		if callExpr, ok := n.(*ast.CallExpr); ok {
			if selExpr, ok := callExpr.Fun.(*ast.SelectorExpr); ok {
				// Look for router.GET, router.POST, etc.
				method := selExpr.Sel.Name
				if isHTTPMethod(method) && len(callExpr.Args) >= 2 {
					// First argument should be the path
					if pathLit, ok := callExpr.Args[0].(*ast.BasicLit); ok {
						path := strings.Trim(pathLit.Value, "\"")

						// Second argument should be the handler
						var handler string
						if ident, ok := callExpr.Args[1].(*ast.Ident); ok {
							handler = ident.Name
						} else if selExpr, ok := callExpr.Args[1].(*ast.SelectorExpr); ok {
							handler = selExpr.Sel.Name
						}

						routes = append(routes, models.Route{
							Method:  strings.ToUpper(method),
							Path:    path,
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
