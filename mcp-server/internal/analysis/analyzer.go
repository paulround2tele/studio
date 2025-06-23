package analysis

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

// CodeAnalyzer provides AST-based code analysis capabilities
type CodeAnalyzer struct {
	fileSet *token.FileSet
	packages map[string]*ast.Package
	rootPath string
}

// NewCodeAnalyzer creates a new code analyzer
func NewCodeAnalyzer(rootPath string) *CodeAnalyzer {
	return &CodeAnalyzer{
		fileSet:  token.NewFileSet(),
		packages: make(map[string]*ast.Package),
		rootPath: rootPath,
	}
}

// ParseDirectory parses all Go files in a directory
func (ca *CodeAnalyzer) ParseDirectory(dir string) error {
	packages, err := parser.ParseDir(ca.fileSet, dir, nil, parser.ParseComments)
	if err != nil {
		return fmt.Errorf("failed to parse directory %s: %w", dir, err)
	}

	for name, pkg := range packages {
		ca.packages[name] = pkg
	}

	return nil
}

// ParseProject parses the entire project
func (ca *CodeAnalyzer) ParseProject() error {
	return filepath.Walk(ca.rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() && shouldSkipDir(info.Name()) {
			return filepath.SkipDir
		}

		if info.IsDir() && containsGoFiles(path) {
			return ca.ParseDirectory(path)
		}

		return nil
	})
}

// GetModels extracts struct definitions that likely represent data models
func (ca *CodeAnalyzer) GetModels() []ModelInfo {
	var models []ModelInfo

	for _, pkg := range ca.packages {
		for _, file := range pkg.Files {
			ast.Inspect(file, func(n ast.Node) bool {
				if typeSpec, ok := n.(*ast.TypeSpec); ok {
					if structType, ok := typeSpec.Type.(*ast.StructType); ok {
						model := ModelInfo{
							Name:    typeSpec.Name.Name,
							Package: pkg.Name,
							Fields:  extractFields(structType),
							Tags:    extractStructTags(structType),
						}
						models = append(models, model)
					}
				}
				return true
			})
		}
	}

	return models
}

// GetHandlers extracts HTTP handler functions
func (ca *CodeAnalyzer) GetHandlers() []HandlerInfo {
	var handlers []HandlerInfo

	for _, pkg := range ca.packages {
		for _, file := range pkg.Files {
			ast.Inspect(file, func(n ast.Node) bool {
				if funcDecl, ok := n.(*ast.FuncDecl); ok {
					if isHTTPHandler(funcDecl) {
						handler := HandlerInfo{
							Name:       funcDecl.Name.Name,
							Package:    pkg.Name,
							Parameters: extractFuncParams(funcDecl),
							Route:      extractRouteFromComments(funcDecl.Doc),
							Method:     extractMethodFromComments(funcDecl.Doc),
						}
						handlers = append(handlers, handler)
					}
				}
				return true
			})
		}
	}

	return handlers
}

// GetDependencies analyzes import dependencies
func (ca *CodeAnalyzer) GetDependencies() []DependencyInfo {
	var deps []DependencyInfo
	depMap := make(map[string]*DependencyInfo)

	for _, pkg := range ca.packages {
		for _, file := range pkg.Files {
			for _, imp := range file.Imports {
				path := strings.Trim(imp.Path.Value, `"`)
				if dep, exists := depMap[path]; exists {
					dep.UsageCount++
				} else {
					dep := &DependencyInfo{
						Path:       path,
						Alias:      getImportAlias(imp),
						IsInternal: isInternalPackage(path),
						UsageCount: 1,
					}
					depMap[path] = dep
					deps = append(deps, *dep)
				}
			}
		}
	}

	return deps
}

// GetCallGraph builds a basic call graph
func (ca *CodeAnalyzer) GetCallGraph() CallGraph {
	graph := CallGraph{
		Nodes: make(map[string]*CallNode),
		Edges: make([]CallEdge, 0),
	}

	// First pass: create nodes for all functions
	for _, pkg := range ca.packages {
		for _, file := range pkg.Files {
			ast.Inspect(file, func(n ast.Node) bool {
				if funcDecl, ok := n.(*ast.FuncDecl); ok {
					nodeID := fmt.Sprintf("%s.%s", pkg.Name, funcDecl.Name.Name)
					graph.Nodes[nodeID] = &CallNode{
						ID:      nodeID,
						Name:    funcDecl.Name.Name,
						Package: pkg.Name,
						Type:    getFunctionType(funcDecl),
					}
				}
				return true
			})
		}
	}

	// Second pass: create edges for function calls
	for _, pkg := range ca.packages {
		for _, file := range pkg.Files {
			ast.Inspect(file, func(n ast.Node) bool {
				if callExpr, ok := n.(*ast.CallExpr); ok {
					if ident, ok := callExpr.Fun.(*ast.Ident); ok {
						// Simple function call
						fromID := getCurrentFunction(n, pkg.Name)
						toID := fmt.Sprintf("%s.%s", pkg.Name, ident.Name)
						if fromID != "" && graph.Nodes[toID] != nil {
							graph.Edges = append(graph.Edges, CallEdge{
								From: fromID,
								To:   toID,
								Type: "direct",
							})
						}
					}
				}
				return true
			})
		}
	}

	return graph
}

// ModelInfo represents information about a data model
type ModelInfo struct {
	Name    string      `json:"name"`
	Package string      `json:"package"`
	Fields  []FieldInfo `json:"fields"`
	Tags    []string    `json:"tags"`
}

// FieldInfo represents information about a struct field
type FieldInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Tag  string `json:"tag"`
}

// HandlerInfo represents information about an HTTP handler
type HandlerInfo struct {
	Name       string   `json:"name"`
	Package    string   `json:"package"`
	Parameters []string `json:"parameters"`
	Route      string   `json:"route"`
	Method     string   `json:"method"`
}

// DependencyInfo represents information about a package dependency
type DependencyInfo struct {
	Path       string `json:"path"`
	Alias      string `json:"alias"`
	IsInternal bool   `json:"is_internal"`
	UsageCount int    `json:"usage_count"`
}

// CallGraph represents a function call graph
type CallGraph struct {
	Nodes map[string]*CallNode `json:"nodes"`
	Edges []CallEdge           `json:"edges"`
}

// CallNode represents a function in the call graph
type CallNode struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Package string `json:"package"`
	Type    string `json:"type"`
}

// CallEdge represents a function call relationship
type CallEdge struct {
	From string `json:"from"`
	To   string `json:"to"`
	Type string `json:"type"`
}

// Helper functions

func shouldSkipDir(name string) bool {
	skipDirs := []string{"vendor", ".git", "node_modules", "dist", "bin", ".vscode", ".idea"}
	for _, skip := range skipDirs {
		if name == skip {
			return true
		}
	}
	return false
}

func containsGoFiles(dir string) bool {
	files, err := os.ReadDir(dir)
	if err != nil {
		return false
	}

	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".go") {
			return true
		}
	}
	return false
}

func extractFields(structType *ast.StructType) []FieldInfo {
	var fields []FieldInfo

	for _, field := range structType.Fields.List {
		for _, name := range field.Names {
			fieldInfo := FieldInfo{
				Name: name.Name,
				Type: typeToString(field.Type),
			}
			if field.Tag != nil {
				fieldInfo.Tag = field.Tag.Value
			}
			fields = append(fields, fieldInfo)
		}
	}

	return fields
}

func extractStructTags(structType *ast.StructType) []string {
	var tags []string

	for _, field := range structType.Fields.List {
		if field.Tag != nil {
			tagValue := strings.Trim(field.Tag.Value, "`")
			if strings.Contains(tagValue, "json:") {
				tags = append(tags, "json")
			}
			if strings.Contains(tagValue, "db:") {
				tags = append(tags, "database")
			}
			if strings.Contains(tagValue, "validate:") {
				tags = append(tags, "validation")
			}
		}
	}

	return tags
}

func isHTTPHandler(funcDecl *ast.FuncDecl) bool {
	if funcDecl.Type.Params == nil || len(funcDecl.Type.Params.List) < 2 {
		return false
	}

	// Check for http.ResponseWriter and *http.Request parameters
	params := funcDecl.Type.Params.List
	if len(params) >= 2 {
		firstParam := typeToString(params[0].Type)
		secondParam := typeToString(params[1].Type)
		return strings.Contains(firstParam, "ResponseWriter") && strings.Contains(secondParam, "Request")
	}

	return false
}

func extractFuncParams(funcDecl *ast.FuncDecl) []string {
	var params []string

	if funcDecl.Type.Params != nil {
		for _, param := range funcDecl.Type.Params.List {
			paramType := typeToString(param.Type)
			for _, name := range param.Names {
				params = append(params, fmt.Sprintf("%s %s", name.Name, paramType))
			}
		}
	}

	return params
}

func extractRouteFromComments(doc *ast.CommentGroup) string {
	if doc == nil {
		return ""
	}

	for _, comment := range doc.List {
		text := comment.Text
		if strings.Contains(text, "@route") {
			parts := strings.Fields(text)
			for i, part := range parts {
				if part == "@route" && i+1 < len(parts) {
					return parts[i+1]
				}
			}
		}
	}

	return ""
}

func extractMethodFromComments(doc *ast.CommentGroup) string {
	if doc == nil {
		return ""
	}

	for _, comment := range doc.List {
		text := strings.ToUpper(comment.Text)
		if strings.Contains(text, "GET") {
			return "GET"
		}
		if strings.Contains(text, "POST") {
			return "POST"
		}
		if strings.Contains(text, "PUT") {
			return "PUT"
		}
		if strings.Contains(text, "DELETE") {
			return "DELETE"
		}
		if strings.Contains(text, "PATCH") {
			return "PATCH"
		}
	}

	return ""
}

func getImportAlias(imp *ast.ImportSpec) string {
	if imp.Name != nil {
		return imp.Name.Name
	}
	return ""
}

func isInternalPackage(path string) bool {
	return strings.Contains(path, "github.com/fntelecomllc/studio") ||
		strings.HasPrefix(path, "./") ||
		strings.HasPrefix(path, "../") ||
		!strings.Contains(path, ".")
}

func getFunctionType(funcDecl *ast.FuncDecl) string {
	if funcDecl.Recv != nil {
		return "method"
	}
	return "function"
}

func getCurrentFunction(node ast.Node, packageName string) string {
	// This is a simplified implementation
	// In a real implementation, you'd walk up the AST to find the containing function
	return ""
}

func typeToString(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		return "*" + typeToString(t.X)
	case *ast.ArrayType:
		return "[]" + typeToString(t.Elt)
	case *ast.SelectorExpr:
		return typeToString(t.X) + "." + t.Sel.Name
	case *ast.InterfaceType:
		return "interface{}"
	default:
		return "unknown"
	}
}