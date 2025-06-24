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

// GetDatabaseSchema fetches the database schema.
func (b *Bridge) GetDatabaseSchema() ([]models.Table, error) {
	rows, err := b.DB.Query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []models.Table
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}
		// For simplicity, not fetching columns/indexes here, just table names.
		// In a real scenario, you'd fetch full schema details.
		tables = append(tables, models.Table{Name: tableName})
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
	return analyzer.ParseGoFiles(b.BackendPath + "/internal/models")
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

// TODO: Add more methods for other tools as needed.
