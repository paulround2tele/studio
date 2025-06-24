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

// ParseConfig analyzes Go files to extract configuration fields
func ParseConfig(dirPath string) ([]models.ConfigField, error) {
	var configFields []models.ConfigField

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
						if structType, ok := typeSpec.Type.(*ast.StructType); ok {
							// Look for config-like structs
							structName := typeSpec.Name.Name
							if strings.Contains(strings.ToLower(structName), "config") {
								fields := extractStructFields(structType)
								configFields = append(configFields, fields...)
							}
						}
					}
				}
			}
			return true
		})

		return nil
	})

	return configFields, err
}

// extractStructFields extracts fields from a struct type
func extractStructFields(structType *ast.StructType) []models.ConfigField {
	var fields []models.ConfigField

	for _, field := range structType.Fields.List {
		for _, name := range field.Names {
			fieldType := getTypeString(field.Type)
			jsonTag := getJSONTag(field.Tag)

			fields = append(fields, models.ConfigField{
				Name:    name.Name,
				Type:    fieldType,
				JSONTag: jsonTag,
			})
		}
	}

	return fields
}

// getTypeString converts an ast.Expr to a type string
func getTypeString(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.SelectorExpr:
		return getTypeString(t.X) + "." + t.Sel.Name
	case *ast.StarExpr:
		return "*" + getTypeString(t.X)
	case *ast.ArrayType:
		return "[]" + getTypeString(t.Elt)
	default:
		return "unknown"
	}
}

// getJSONTag extracts JSON tag from struct field tag
func getJSONTag(tag *ast.BasicLit) string {
	if tag == nil {
		return ""
	}

	tagStr := strings.Trim(tag.Value, "`")
	if strings.Contains(tagStr, "json:") {
		start := strings.Index(tagStr, "json:\"") + 6
		if start > 5 {
			end := strings.Index(tagStr[start:], "\"")
			if end > 0 {
				return tagStr[start : start+end]
			}
		}
	}

	return ""
}
