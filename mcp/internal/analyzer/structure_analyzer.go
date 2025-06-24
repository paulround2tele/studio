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
								strings.HasSuffix(serviceName, "Manager") {

								methods := extractMethodsForType(node, serviceName)
								services = append(services, models.Service{
									Name:      serviceName,
									File:      path,
									Methods:   methods,
									Interface: "",
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
