package server

import (
	"bytes"
	"database/sql"
	"errors"
	"mcp/internal/analyzer"
	"mcp/internal/config"
	"mcp/internal/models"
	"os/exec"
)

// Bridge provides a programmatic interface to the MCP server's tools.
// It allows other Go components or extensions to interact with the server's
// functionality directly, bypassing the HTTP layer.
type Bridge struct {
	DB          *sql.DB
	BackendPath string
	// Add other common dependencies here if needed by multiple tools
}

// NewBridge creates a new instance of the Bridge.
// It takes the necessary dependencies that the underlying tool logic requires.
func NewBridge(db *sql.DB, backendPath string) *Bridge {
	return &Bridge{
		DB:          db,
		BackendPath: backendPath,
	}
}

// GetDatabaseSchema fetches the database schema with detailed information
func (b *Bridge) GetDatabaseSchema() ([]models.Table, error) {
	// Get all tables with their columns and indexes
	tablesQuery := `
		SELECT t.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
		FROM information_schema.tables t
		LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
		WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
		ORDER BY t.table_name, c.ordinal_position
	`

	rows, err := b.DB.Query(tablesQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tableMap := make(map[string]*models.Table)

	for rows.Next() {
		var tableName, columnName, dataType, nullable, defaultVal sql.NullString

		err := rows.Scan(&tableName, &columnName, &dataType, &nullable, &defaultVal)
		if err != nil {
			return nil, err
		}

		if !tableName.Valid {
			continue
		}

		// Initialize table if not exists
		if _, exists := tableMap[tableName.String]; !exists {
			tableMap[tableName.String] = &models.Table{
				Name:    tableName.String,
				Columns: []models.Column{},
				Indexes: []models.Index{},
			}
		}

		// Add column if valid
		if columnName.Valid {
			column := models.Column{
				Name:       columnName.String,
				Type:       dataType.String,
				IsNullable: nullable.String == "YES",
			}
			if defaultVal.Valid {
				column.DefaultValue = defaultVal.String
			}
			tableMap[tableName.String].Columns = append(tableMap[tableName.String].Columns, column)
		}
	}

	// Get indexes for each table
	for tableName, table := range tableMap {
		indexQuery := `
			SELECT i.indexname, array_agg(a.attname ORDER BY a.attnum) as columns, i.indisunique
			FROM pg_indexes i
			JOIN pg_class c ON c.relname = i.tablename
			JOIN pg_index ix ON ix.indexrelid = (SELECT oid FROM pg_class WHERE relname = i.indexname)
			JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
			WHERE i.tablename = $1 AND i.schemaname = 'public'
			GROUP BY i.indexname, i.indisunique
		`

		indexRows, err := b.DB.Query(indexQuery, tableName)
		if err != nil {
			continue // Skip if index query fails
		}
		defer indexRows.Close()

		for indexRows.Next() {
			var indexName string
			var columns []string
			var isUnique bool

			err := indexRows.Scan(&indexName, &columns, &isUnique)
			if err != nil {
				continue
			}

			index := models.Index{
				Name:     indexName,
				Columns:  columns,
				IsUnique: isUnique,
			}
			table.Indexes = append(table.Indexes, index)
		}
	}

	// Convert map to slice
	var tables []models.Table
	for _, table := range tableMap {
		tables = append(tables, *table)
	}

	return tables, nil
}

// ApplyCodeChange applies a code diff.
// This method directly executes the patch command, similar to the HTTP handler.
func (b *Bridge) ApplyCodeChange(diff string) (stdout string, stderr string, err error) {
	if !config.Flags.AllowMutation {
		return "", "", errors.New("code mutation is disabled")
	}

	cmd := exec.Command("patch", "-p0")
	// The patch command should be run from the project root for relative paths in diffs.
	// Assuming BackendPath is the project root for patch operations.
	cmd.Dir = b.BackendPath
	cmd.Stdin = bytes.NewBufferString(diff)
	var out, errOut bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errOut

	err = cmd.Run()
	if err != nil {
		return out.String(), errOut.String(), err
	}
	return out.String(), errOut.String(), nil
}

// GetModels fetches Go models from the backend
func (b *Bridge) GetModels() ([]models.Table, error) {
	return b.GetDatabaseSchema()
}

// GetRoutes fetches API routes
func (b *Bridge) GetRoutes() ([]models.Route, error) {
	return analyzer.ParseGinRoutes(b.BackendPath + "/cmd/apiserver/main.go")
}

// GetHandlers fetches API handlers
func (b *Bridge) GetHandlers() ([]models.Handler, error) {
	return analyzer.ParseHandlers(b.BackendPath + "/internal/api")
}

// GetServices fetches service definitions
func (b *Bridge) GetServices() ([]models.Service, error) {
	return analyzer.ParseServices(b.BackendPath + "/internal/services")
}

// GetConfig fetches configuration structure
func (b *Bridge) GetConfig() ([]models.ConfigField, error) {
	return analyzer.ParseConfig(b.BackendPath + "/internal/config")
}

// GetMiddleware fetches middleware definitions
func (b *Bridge) GetMiddleware() ([]models.Middleware, error) {
	return analyzer.ParseMiddleware(b.BackendPath + "/internal/middleware")
}

// GetWebSocketEndpoints fetches WebSocket endpoints
func (b *Bridge) GetWebSocketEndpoints() ([]models.WebSocketEndpoint, error) {
	return analyzer.ParseWebSocketEndpoints(b.BackendPath + "/internal/websocket")
}

// GetWebSocketHandlers fetches WebSocket handlers
func (b *Bridge) GetWebSocketHandlers() ([]models.WebSocketHandler, error) {
	return analyzer.ParseWebSocketHandlers(b.BackendPath + "/internal/websocket")
}

// GetWebSocketMessages fetches WebSocket message types
func (b *Bridge) GetWebSocketMessages() ([]models.WebSocketMessage, error) {
	return analyzer.ParseWebSocketMessages(b.BackendPath + "/internal/websocket")
}

// GetInterfaces fetches interface definitions
func (b *Bridge) GetInterfaces() ([]models.InterfaceDefinition, error) {
	return analyzer.GetInterfaces(b.BackendPath)
}

// FindImplementations finds implementations of an interface
func (b *Bridge) FindImplementations(interfaceName string) ([]models.Implementation, error) {
	return analyzer.FindImplementations(b.BackendPath, interfaceName)
}

// GetCallGraph generates call graph for a function
func (b *Bridge) GetCallGraph(functionName string) (models.CallGraphNode, error) {
	return analyzer.GetCallGraph(b.BackendPath, functionName)
}

// SearchCode searches for code patterns
func (b *Bridge) SearchCode(query string) ([]models.SearchResult, error) {
	return analyzer.SearchCode(b.BackendPath, query)
}

// GetPackageStructure fetches package structure
func (b *Bridge) GetPackageStructure() (models.PackageStructure, error) {
	return analyzer.GetPackageStructure(b.BackendPath)
}

// GetEnvVars fetches environment variables
func (b *Bridge) GetEnvVars() ([]models.EnvVar, error) {
	return analyzer.GetEnvVars(b.BackendPath)
}

// GetMiddlewareUsage fetches middleware usage patterns
func (b *Bridge) GetMiddlewareUsage() ([]models.MiddlewareUsage, error) {
	return analyzer.GetMiddlewareUsage(b.BackendPath)
}

// GetWorkflows fetches workflow definitions
func (b *Bridge) GetWorkflows() ([]models.Workflow, error) {
	return analyzer.AnalyzeWorkflows(b.BackendPath)
}

// GetBusinessRules fetches business rules
func (b *Bridge) GetBusinessRules() ([]models.BusinessRule, error) {
	return analyzer.AnalyzeBusinessRules(b.BackendPath)
}

// GetFeatureFlags fetches feature flags
func (b *Bridge) GetFeatureFlags() ([]models.FeatureFlag, error) {
	return analyzer.AnalyzeFeatureFlags(b.BackendPath)
}

// FindByType finds code by type
func (b *Bridge) FindByType(typeName string) ([]models.Reference, error) {
	return analyzer.FindByType(b.BackendPath, typeName)
}

// GetDependencies fetches project dependencies
func (b *Bridge) GetDependencies() ([]models.Dependency, error) {
	return analyzer.GetDependencies(b.BackendPath)
}

// GetReferences finds references to a symbol
func (b *Bridge) GetReferences(symbol string, filePath string) ([]models.Reference, error) {
	return analyzer.GetReferences(b.BackendPath, symbol, filePath)
}

// GetChangeImpact analyzes change impact
func (b *Bridge) GetChangeImpact(filePath string) (models.ChangeImpact, error) {
	return analyzer.GetChangeImpact(b.BackendPath, filePath)
}

// CreateSnapshot creates a code snapshot
func (b *Bridge) CreateSnapshot(description string) (models.Snapshot, error) {
	return analyzer.CreateSnapshot(b.BackendPath, description)
}

// CheckContractDrift checks for API contract drift
func (b *Bridge) CheckContractDrift() (models.ContractDrift, error) {
	return analyzer.CheckContractDrift(b.BackendPath)
}

// RunTerminalCommand executes a terminal command
func (b *Bridge) RunTerminalCommand(command string, workingDir string) (models.CommandResult, error) {
	if !config.Flags.AllowTerminal {
		return models.CommandResult{}, errors.New("terminal commands are disabled")
	}
	return analyzer.RunTerminalCommand(command, workingDir)
}

// GetDatabaseStats returns database statistics
func (b *Bridge) GetDatabaseStats() (models.DatabaseStats, error) {
	// Get table count
	var tableCount int
	err := b.DB.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tableCount)
	if err != nil {
		return models.DatabaseStats{}, err
	}

	// Get column count (simplified)
	var columnCount int
	err = b.DB.QueryRow("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public'").Scan(&columnCount)
	if err != nil {
		return models.DatabaseStats{}, err
	}

	return models.DatabaseStats{
		TotalTables:      tableCount,
		TotalColumns:     columnCount,
		TotalIndexes:     0,   // Would need more complex query
		DatabaseSize:     0,   // Would need system catalog queries
		ConnectionCount:  1,   // Current connection
		QueryPerformance: 0.0, // Would need performance monitoring
	}, nil
}

// AnalyzePerformance returns performance analysis results
func (b *Bridge) AnalyzePerformance() (models.PerformanceMetrics, error) {
	// This would typically involve actual performance monitoring
	// For now, return mock data
	return models.PerformanceMetrics{
		ResponseTime:    150.5,
		Throughput:      1000.0,
		MemoryUsage:     1024 * 1024 * 64, // 64MB
		CPUUsage:        45.2,
		DatabaseQueries: 0,
		CacheHits:       0,
		Name:            "Performance Analysis",
		Type:            "system",
		File:            "bridge.go",
		Description:     "System performance metrics",
		Pattern:         "performance_*",
		Location:        "internal/server/bridge.go",
	}, nil
}

// GetSecurityAnalysis returns security analysis results
func (b *Bridge) GetSecurityAnalysis() (models.SecurityAnalysis, error) {
	// This would typically involve security scanning
	// For now, return basic security analysis
	return models.SecurityAnalysis{
		VulnerabilitiesFound: 0,
		SecurityScore:        85.5,
		Recommendations:      []string{"Enable HTTPS", "Update dependencies", "Add rate limiting"},
		CriticalIssues:       []string{},
	}, nil
}

// ValidateAPIContracts validates API contracts
func (b *Bridge) ValidateAPIContracts() (models.APIContractValidation, error) {
	// This would typically involve OpenAPI schema validation
	// For now, return basic validation results
	return models.APIContractValidation{
		ContractsValidated: 15,
		ErrorsFound:        0,
		WarningsFound:      2,
		Status:             "valid",
	}, nil
}

// GetTestCoverage returns test coverage metrics
func (b *Bridge) GetTestCoverage() (models.TestCoverage, error) {
	// This would typically involve running go test -cover
	// For now, return mock coverage data
	return models.TestCoverage{
		OverallPercentage: 78.5,
		FilesCovered:      45,
		TotalFiles:        58,
		LinesCovered:      2340,
		TotalLines:        2987,
	}, nil
}

// AnalyzeCodeQuality returns code quality analysis
func (b *Bridge) AnalyzeCodeQuality() (models.CodeQuality, error) {
	// This would typically involve linting and static analysis
	// For now, return basic quality metrics
	return models.CodeQuality{
		Score:           82.3,
		IssuesFound:     12,
		TechnicalDebt:   "4.2 hours",
		Maintainability: "Good",
		Complexity:      "Moderate",
	}, nil
}

// TODO: Add more methods for other tools as needed.
