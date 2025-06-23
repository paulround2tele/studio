package analyzer

import (
	"context"
	"database/sql"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"

	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/models"
	"github.com/fntelecomllc/studio/mcp-studio-backend/pkg/studio"
	"github.com/jmoiron/sqlx"
)

// StudioAnalyzer analyzes the Studio backend codebase
type StudioAnalyzer struct {
	backendPath string
	db          *sqlx.DB
	fileSet     *token.FileSet
	packages    map[string]*ast.Package
}

// NewStudioAnalyzer creates a new analyzer instance
func NewStudioAnalyzer(backendPath string, db *sqlx.DB) *StudioAnalyzer {
	return &StudioAnalyzer{
		backendPath: backendPath,
		db:          db,
		fileSet:     token.NewFileSet(),
		packages:    make(map[string]*ast.Package),
	}
}

// Initialize loads and parses the backend codebase
func (a *StudioAnalyzer) Initialize(ctx context.Context) error {
	// Parse all Go files in the backend
	err := filepath.Walk(a.backendPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if !strings.HasSuffix(path, ".go") || strings.Contains(path, "vendor/") {
			return nil
		}
		
		// Parse the file
		src, err := parser.ParseFile(a.fileSet, path, nil, parser.ParseComments)
		if err != nil {
			// Log error but continue processing other files
			return nil
		}
		
		// Group by package
		packageName := src.Name.Name
		if a.packages[packageName] == nil {
			a.packages[packageName] = &ast.Package{
				Name:  packageName,
				Files: make(map[string]*ast.File),
			}
		}
		a.packages[packageName].Files[path] = src
		
		return nil
	})
	
	return err
}

// GetModels extracts all data models from the backend
func (a *StudioAnalyzer) GetModels(pattern string, packageFilter string) ([]models.ModelInfo, error) {
	var modelInfos []models.ModelInfo
	
	// Get models using the bridge package
	backendModelTypes := studio.GetBackendModelTypes()
	
	for name, model := range backendModelTypes {
		// Apply filters
		if pattern != "" && !strings.Contains(strings.ToLower(name), strings.ToLower(pattern)) {
			continue
		}
		if packageFilter != "" && packageFilter != "models" {
			continue
		}
		
		modelInfo, err := studio.ExtractModelInfo(name, model)
		if err != nil || modelInfo == nil {
			continue // Skip models that can't be processed
		}
		
		// Convert to our internal models format
		internalModelInfo := models.ModelInfo{
			Name:        modelInfo.Name,
			Package:     modelInfo.Package,
			Type:        modelInfo.Type,
			Description: modelInfo.Description,
			Fields:      make([]models.FieldInfo, len(modelInfo.Fields)),
		}
		
		for i, field := range modelInfo.Fields {
			internalModelInfo.Fields[i] = models.FieldInfo{
				Name:         field.Name,
				Type:         field.Type,
				JSONTag:      field.JSONTag,
				DBTag:        field.DBTag,
				ValidateTag:  field.ValidateTag,
				Description:  field.Description,
				IsRequired:   field.IsRequired,
				IsPrimaryKey: field.IsPrimaryKey,
				IsReference:  field.IsReference,
				RefModel:     field.RefModel,
				ExtraTags:    field.ExtraTags,
			}
		}
		
		modelInfos = append(modelInfos, internalModelInfo)
	}
	
	return modelInfos, nil
}

// GetEnums extracts all enum types from the backend
func (a *StudioAnalyzer) GetEnums(pattern string) ([]models.EnumInfo, error) {
	var enumInfos []models.EnumInfo
	
	// Get enums from the bridge package
	enums := studio.GetEnumTypes()
	
	for enumName, values := range enums {
		// Apply pattern filter
		if pattern != "" && !strings.Contains(strings.ToLower(enumName), strings.ToLower(pattern)) {
			continue
		}
		
		enumInfo := models.EnumInfo{
			Name:    enumName,
			Package: "models",
			Type:    "string",
			Values:  make([]models.EnumValue, 0),
		}
		
		for constName, value := range values {
			enumInfo.Values = append(enumInfo.Values, models.EnumValue{
				Name:  constName,
				Value: value,
			})
		}
		
		enumInfos = append(enumInfos, enumInfo)
	}
	
	return enumInfos, nil
}

// GetInterfaces extracts all interface definitions from the backend
func (a *StudioAnalyzer) GetInterfaces(pattern string) ([]models.InterfaceInfo, error) {
	var interfaceInfos []models.InterfaceInfo
	
	// Get interfaces from the bridge package
	interfaces := studio.GetInterfaceTypes()
	
	for interfaceName, methods := range interfaces {
		// Apply pattern filter
		if pattern != "" && !strings.Contains(strings.ToLower(interfaceName), strings.ToLower(pattern)) {
			continue
		}
		
		interfaceInfo := models.InterfaceInfo{
			Name:    interfaceName,
			Package: "store",
			Methods: make([]models.Method, len(methods)),
		}
		
		// Convert from bridge types to internal types
		for i, method := range methods {
			interfaceInfo.Methods[i] = models.Method{
				Name:        method.Name,
				Description: method.Description,
				Parameters:  make([]models.Parameter, len(method.Parameters)),
				Returns:     make([]models.Parameter, len(method.Returns)),
			}
			
			for j, param := range method.Parameters {
				interfaceInfo.Methods[i].Parameters[j] = models.Parameter{
					Name: param.Name,
					Type: param.Type,
				}
			}
			
			for j, ret := range method.Returns {
				interfaceInfo.Methods[i].Returns[j] = models.Parameter{
					Name: ret.Name,
					Type: ret.Type,
				}
			}
		}
		
		interfaceInfos = append(interfaceInfos, interfaceInfo)
	}
	
	return interfaceInfos, nil
}

// GetEndpoints extracts all API endpoints from the backend
func (a *StudioAnalyzer) GetEndpoints(methodFilter string, pathFilter string) ([]models.EndpointInfo, error) {
	var endpoints []models.EndpointInfo
	
	// Hardcoded endpoints from analyzing the backend code (in a real implementation, this would be discovered via AST analysis of route definitions)
	endpointData := []models.EndpointInfo{
		{Method: "POST", Path: "/auth/login", Handler: "LoginHandler", Package: "api", Description: "User authentication endpoint"},
		{Method: "GET", Path: "/auth/me", Handler: "GetCurrentUserHandler", Package: "api", Description: "Get current authenticated user"},
		{Method: "POST", Path: "/auth/logout", Handler: "LogoutHandler", Package: "api", Description: "User logout endpoint"},
		{Method: "GET", Path: "/campaigns", Handler: "ListCampaignsHandler", Package: "api", Description: "List all campaigns"},
		{Method: "POST", Path: "/campaigns", Handler: "CreateCampaignHandler", Package: "api", Description: "Create a new campaign"},
		{Method: "GET", Path: "/campaigns/:id", Handler: "GetCampaignHandler", Package: "api", Description: "Get a specific campaign"},
		{Method: "PUT", Path: "/campaigns/:id", Handler: "UpdateCampaignHandler", Package: "api", Description: "Update a campaign"},
		{Method: "DELETE", Path: "/campaigns/:id", Handler: "DeleteCampaignHandler", Package: "api", Description: "Delete a campaign"},
		{Method: "GET", Path: "/personas", Handler: "ListPersonasHandler", Package: "api", Description: "List all personas"},
		{Method: "POST", Path: "/personas", Handler: "CreatePersonaHandler", Package: "api", Description: "Create a new persona"},
		{Method: "GET", Path: "/personas/:id", Handler: "GetPersonaHandler", Package: "api", Description: "Get a specific persona"},
		{Method: "PUT", Path: "/personas/:id", Handler: "UpdatePersonaHandler", Package: "api", Description: "Update a persona"},
		{Method: "DELETE", Path: "/personas/:id", Handler: "DeletePersonaHandler", Package: "api", Description: "Delete a persona"},
		{Method: "GET", Path: "/proxies", Handler: "ListProxiesHandler", Package: "api", Description: "List all proxies"},
		{Method: "POST", Path: "/proxies", Handler: "CreateProxyHandler", Package: "api", Description: "Create a new proxy"},
		{Method: "GET", Path: "/proxies/:id", Handler: "GetProxyHandler", Package: "api", Description: "Get a specific proxy"},
		{Method: "PUT", Path: "/proxies/:id", Handler: "UpdateProxyHandler", Package: "api", Description: "Update a proxy"},
		{Method: "DELETE", Path: "/proxies/:id", Handler: "DeleteProxyHandler", Package: "api", Description: "Delete a proxy"},
		{Method: "GET", Path: "/users", Handler: "ListUsersHandler", Package: "api", Description: "List all users"},
		{Method: "POST", Path: "/users", Handler: "CreateUserHandler", Package: "api", Description: "Create a new user"},
		{Method: "GET", Path: "/users/:id", Handler: "GetUserHandler", Package: "api", Description: "Get a specific user"},
		{Method: "PUT", Path: "/users/:id", Handler: "UpdateUserHandler", Package: "api", Description: "Update a user"},
		{Method: "DELETE", Path: "/users/:id", Handler: "DeleteUserHandler", Package: "api", Description: "Delete a user"},
	}
	
	for _, endpoint := range endpointData {
		// Apply filters
		if methodFilter != "" && !strings.EqualFold(endpoint.Method, methodFilter) {
			continue
		}
		if pathFilter != "" && !strings.Contains(endpoint.Path, pathFilter) {
			continue
		}
		
		endpoints = append(endpoints, endpoint)
	}
	
	return endpoints, nil
}

// GetTables extracts database table information
func (a *StudioAnalyzer) GetTables(ctx context.Context, pattern string) ([]models.TableInfo, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database connection not available")
	}
	
	// Query for table information
	query := `
		SELECT 
			t.table_name,
			t.table_schema,
			obj_description(c.oid, 'pg_class') as table_comment
		FROM information_schema.tables t
		LEFT JOIN pg_class c ON c.relname = t.table_name
		WHERE t.table_schema = 'public'
		ORDER BY t.table_name
	`
	
	rows, err := a.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()
	
	var tables []models.TableInfo
	for rows.Next() {
		var tableName, tableSchema string
		var tableComment sql.NullString
		
		if err := rows.Scan(&tableName, &tableSchema, &tableComment); err != nil {
			continue
		}
		
		// Apply pattern filter
		if pattern != "" && !strings.Contains(strings.ToLower(tableName), strings.ToLower(pattern)) {
			continue
		}
		
		table := models.TableInfo{
			Name:        tableName,
			Schema:      tableSchema,
			Description: tableComment.String,
		}
		
		// Get columns for this table
		columns, err := a.getTableColumns(ctx, tableName)
		if err == nil {
			table.Columns = columns
		}
		
		// Get indexes for this table
		indexes, err := a.getTableIndexes(ctx, tableName)
		if err == nil {
			table.Indexes = indexes
		}
		
		tables = append(tables, table)
	}
	
	return tables, nil
}

// getTableColumns gets column information for a specific table
func (a *StudioAnalyzer) getTableColumns(ctx context.Context, tableName string) ([]models.ColumnInfo, error) {
	query := `
		SELECT 
			column_name,
			data_type,
			is_nullable,
			column_default,
			character_maximum_length,
			numeric_precision,
			numeric_scale,
			col_description(pgc.oid, ordinal_position) as column_comment
		FROM information_schema.columns c
		LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
		WHERE table_name = $1 AND table_schema = 'public'
		ORDER BY ordinal_position
	`
	
	rows, err := a.db.QueryContext(ctx, query, tableName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var columns []models.ColumnInfo
	for rows.Next() {
		var columnName, dataType, isNullable string
		var columnDefault, columnComment sql.NullString
		var maxLength, precision, scale sql.NullInt64
		
		if err := rows.Scan(&columnName, &dataType, &isNullable, &columnDefault, &maxLength, &precision, &scale, &columnComment); err != nil {
			continue
		}
		
		column := models.ColumnInfo{
			Name:        columnName,
			Type:        dataType,
			Nullable:    isNullable == "YES",
			Default:     columnDefault.String,
			Description: columnComment.String,
		}
		
		if maxLength.Valid {
			column.Length = int(maxLength.Int64)
		}
		if precision.Valid {
			column.Precision = int(precision.Int64)
		}
		if scale.Valid {
			column.Scale = int(scale.Int64)
		}
		
		// Check if it's a primary key
		column.PrimaryKey = columnName == "id"
		
		columns = append(columns, column)
	}
	
	return columns, nil
}

// getTableIndexes gets index information for a specific table
func (a *StudioAnalyzer) getTableIndexes(ctx context.Context, tableName string) ([]models.IndexInfo, error) {
	query := `
		SELECT 
			i.indexname,
			i.indexdef,
			ix.indisunique
		FROM pg_indexes i
		JOIN pg_class c ON c.relname = i.tablename
		JOIN pg_index ix ON ix.indexrelid = (
			SELECT oid FROM pg_class WHERE relname = i.indexname
		)
		WHERE i.tablename = $1
		ORDER BY i.indexname
	`
	
	rows, err := a.db.QueryContext(ctx, query, tableName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var indexes []models.IndexInfo
	for rows.Next() {
		var indexName, indexDef string
		var isUnique bool
		
		if err := rows.Scan(&indexName, &indexDef, &isUnique); err != nil {
			continue
		}
		
		index := models.IndexInfo{
			Name:   indexName,
			Unique: isUnique,
			Type:   "btree", // Default PostgreSQL index type
		}
		
		// Parse column names from index definition (simplified)
		if strings.Contains(indexDef, "(") && strings.Contains(indexDef, ")") {
			start := strings.Index(indexDef, "(") + 1
			end := strings.Index(indexDef, ")")
			columnsPart := indexDef[start:end]
			index.Columns = strings.Split(strings.ReplaceAll(columnsPart, " ", ""), ",")
		}
		
		indexes = append(indexes, index)
	}
	
	return indexes, nil
}