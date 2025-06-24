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

// ParseGoFiles parses all Go files in a directory and returns a list of models.
func ParseGoFiles(dirPath string) ([]models.Table, error) {
	var tables []models.Table
	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".go") {
			fileTables, err := parseAstFile(path)
			if err != nil {
				return err
			}
			tables = append(tables, fileTables...)
		}
		return nil
	})
	return tables, err
}

func parseAstFile(filePath string) ([]models.Table, error) {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, filePath, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	var tables []models.Table
	ast.Inspect(node, func(n ast.Node) bool {
		if ts, ok := n.(*ast.TypeSpec); ok {
			if st, ok := ts.Type.(*ast.StructType); ok {
				table := models.Table{
					Name: ts.Name.Name,
				}
				for _, field := range st.Fields.List {
					var typeName string
					switch t := field.Type.(type) {
					case *ast.Ident:
						typeName = t.Name
					case *ast.SelectorExpr:
						typeName = t.Sel.Name
					}
					table.Columns = append(table.Columns, models.Column{
						Name: field.Names[0].Name,
						Type: typeName,
					})
				}
				tables = append(tables, table)
			}
		}
		return true
	})

	return tables, nil
}