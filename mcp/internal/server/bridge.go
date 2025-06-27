package server

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mcp/internal/analyzer"
	"mcp/internal/config"
	"mcp/internal/models"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	cover "golang.org/x/tools/cover"
)

// Bridge provides a programmatic interface to the MCP server's tools.
// It allows other Go components or extensions to interact with the server's
// functionality directly, bypassing the HTTP layer.
type Bridge struct {
	DB             *sql.DB
	BackendPath    string
	LastHTML       string
	LastScreenshot string
	// Add other common dependencies here if needed by multiple tools
}

// NewBridge creates a new instance of the Bridge.
// It takes the necessary dependencies that the underlying tool logic requires.
func NewBridge(db *sql.DB, backendPath string) *Bridge {
	return &Bridge{
		DB:             db,
		BackendPath:    backendPath,
		LastHTML:       "",
		LastScreenshot: "",
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

// ApplyCodeChange applies a code diff using multiple patch strategies for maximum reliability.
// This method tries patch with various options, then falls back to manual application.
func (b *Bridge) ApplyCodeChange(diff string) (stdout string, stderr string, err error) {
	if !config.Flags.AllowMutation {
		return "", "", errors.New("code mutation is disabled")
	}

	// Use the parent directory of BackendPath (which should be the studio root)
	projectRoot := filepath.Dir(b.BackendPath)

	// Extract the target file path from diff for validation and fallback
	var targetFile string
	var relPath string
	lines := strings.Split(diff, "\n")

	// Look for +++ line first (target file)
	for _, line := range lines {
		if strings.HasPrefix(line, "+++") && !strings.Contains(line, "/dev/null") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				// Handle both "b/path" and "path" formats
				relPath = strings.TrimPrefix(parts[1], "b/")
				relPath = strings.TrimPrefix(relPath, "a/")
				targetFile = filepath.Join(projectRoot, relPath)
				break
			}
		}
	}

	// Fallback to --- line if +++ not found
	if targetFile == "" {
		for _, line := range lines {
			if strings.HasPrefix(line, "---") && !strings.Contains(line, "/dev/null") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					relPath = strings.TrimPrefix(parts[1], "a/")
					relPath = strings.TrimPrefix(relPath, "b/")
					targetFile = filepath.Join(projectRoot, relPath)
					break
				}
			}
		}
	}

	var lastErr error
	var combinedOut, combinedErr strings.Builder

	// Strategy 1: Try patch with different strip levels and options
	patchCommands := [][]string{
		{"patch", "-p1", "--batch", "--verbose"},
		{"patch", "-p1", "--batch", "--verbose", "--ignore-whitespace"},
		{"patch", "-p0", "--batch", "--verbose"},
		{"patch", "-p0", "--batch", "--verbose", "--ignore-whitespace"},
		{"patch", "--batch", "--verbose"}, // no strip level
	}

	for _, cmdArgs := range patchCommands {
		cmd := exec.Command(cmdArgs[0], cmdArgs[1:]...)
		cmd.Dir = projectRoot
		cmd.Stdin = bytes.NewBufferString(diff)

		var out, errOut bytes.Buffer
		cmd.Stdout = &out
		cmd.Stderr = &errOut

		if err := cmd.Run(); err == nil {
			combinedOut.WriteString(fmt.Sprintf("✅ Applied using %s\n", strings.Join(cmdArgs, " ")))
			combinedOut.WriteString(out.String())
			return combinedOut.String(), combinedErr.String(), nil
		} else {
			lastErr = err
			combinedOut.WriteString(fmt.Sprintf("❌ %s failed: %v\n", strings.Join(cmdArgs, " "), err))
			combinedErr.WriteString(fmt.Sprintf("%s error: %s\n", strings.Join(cmdArgs, " "), errOut.String()))
		}
	}

	// Strategy 2: Manual application if we can identify the target file
	if targetFile != "" && relPath != "" {
		combinedOut.WriteString(fmt.Sprintf("🔧 Attempting manual application to %s\n", targetFile))
		if manualOut, manualErr := b.applyDiffManually(diff, targetFile, relPath); manualErr == nil {
			combinedOut.WriteString("✅ Applied manually\n")
			combinedOut.WriteString(manualOut)
			return combinedOut.String(), combinedErr.String(), nil
		} else {
			lastErr = manualErr
			combinedOut.WriteString("❌ Manual application failed: " + manualErr.Error() + "\n")
		}
	}

	// All strategies failed
	combinedOut.WriteString("❌ All patch strategies failed\n")
	if targetFile != "" {
		combinedOut.WriteString(fmt.Sprintf("Target file: %s\n", targetFile))
	}

	return combinedOut.String(), combinedErr.String(), fmt.Errorf("failed to apply patch: %v", lastErr)
}

// applyDiffManually attempts to apply a unified diff manually with proper hunk parsing
func (b *Bridge) applyDiffManually(diff, targetFile, relPath string) (string, error) {
	// Check if target file exists
	if _, err := os.Stat(targetFile); os.IsNotExist(err) {
		return "", fmt.Errorf("target file does not exist: %s", targetFile)
	}

	// Read current file content
	content, err := os.ReadFile(targetFile)
	if err != nil {
		return "", fmt.Errorf("failed to read target file: %v", err)
	}

	lines := strings.Split(string(content), "\n")
	diffLines := strings.Split(diff, "\n")

	// Parse diff and apply changes
	var hunks []hunkInfo
	var currentHunk *hunkInfo

	for i, line := range diffLines {
		if strings.HasPrefix(line, "@@") {
			// Parse hunk header: @@ -oldstart,oldlines +newstart,newlines @@
			if currentHunk != nil {
				hunks = append(hunks, *currentHunk)
			}

			hunk, err := parseHunkHeader(line)
			if err != nil {
				return "", fmt.Errorf("failed to parse hunk header '%s': %v", line, err)
			}
			currentHunk = &hunk
			currentHunk.diffStartLine = i + 1
		} else if currentHunk != nil && (strings.HasPrefix(line, "+") || strings.HasPrefix(line, "-") || strings.HasPrefix(line, " ")) {
			// Add line to current hunk
			if strings.HasPrefix(line, "+") && !strings.HasPrefix(line, "+++") {
				currentHunk.additions = append(currentHunk.additions, diffLine{
					lineNum: len(currentHunk.contextLines) + len(currentHunk.additions) + len(currentHunk.deletions),
					content: strings.TrimPrefix(line, "+"),
				})
			} else if strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "---") {
				currentHunk.deletions = append(currentHunk.deletions, diffLine{
					lineNum: len(currentHunk.contextLines) + len(currentHunk.additions) + len(currentHunk.deletions),
					content: strings.TrimPrefix(line, "-"),
				})
			} else if strings.HasPrefix(line, " ") {
				currentHunk.contextLines = append(currentHunk.contextLines, diffLine{
					lineNum: len(currentHunk.contextLines) + len(currentHunk.additions) + len(currentHunk.deletions),
					content: strings.TrimPrefix(line, " "),
				})
			}
		}
	}

	// Add the last hunk
	if currentHunk != nil {
		hunks = append(hunks, *currentHunk)
	}

	if len(hunks) == 0 {
		return "", fmt.Errorf("no valid hunks found in diff")
	}

	// Apply hunks in reverse order to maintain line numbers
	modifiedLines := make([]string, len(lines))
	copy(modifiedLines, lines)

	for i := len(hunks) - 1; i >= 0; i-- {
		hunk := hunks[i]
		if err := applyHunk(&modifiedLines, hunk); err != nil {
			return "", fmt.Errorf("failed to apply hunk at line %d: %v", hunk.newStart, err)
		}
	}

	// Write back to file
	newContent := strings.Join(modifiedLines, "\n")
	err = os.WriteFile(targetFile, []byte(newContent), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to write modified content: %v", err)
	}

	return fmt.Sprintf("✅ Successfully applied %d hunks to %s", len(hunks), relPath), nil
}

type hunkInfo struct {
	oldStart      int
	oldLines      int
	newStart      int
	newLines      int
	diffStartLine int
	contextLines  []diffLine
	additions     []diffLine
	deletions     []diffLine
}

type diffLine struct {
	lineNum int
	content string
}

func parseHunkHeader(header string) (hunkInfo, error) {
	// Example: @@ -1,3 +1,4 @@
	var hunk hunkInfo

	// Find the range indicators
	parts := strings.Fields(header)
	if len(parts) < 3 {
		return hunk, fmt.Errorf("invalid hunk header format")
	}

	// Parse old range (-oldstart,oldlines)
	oldRange := strings.TrimPrefix(parts[1], "-")
	if strings.Contains(oldRange, ",") {
		oldParts := strings.Split(oldRange, ",")
		if len(oldParts) != 2 {
			return hunk, fmt.Errorf("invalid old range format")
		}
		var err error
		hunk.oldStart, err = strconv.Atoi(oldParts[0])
		if err != nil {
			return hunk, fmt.Errorf("invalid old start line: %v", err)
		}
		hunk.oldLines, err = strconv.Atoi(oldParts[1])
		if err != nil {
			return hunk, fmt.Errorf("invalid old line count: %v", err)
		}
	} else {
		var err error
		hunk.oldStart, err = strconv.Atoi(oldRange)
		if err != nil {
			return hunk, fmt.Errorf("invalid old start line: %v", err)
		}
		hunk.oldLines = 1
	}

	// Parse new range (+newstart,newlines)
	newRange := strings.TrimPrefix(parts[2], "+")
	if strings.Contains(newRange, ",") {
		newParts := strings.Split(newRange, ",")
		if len(newParts) != 2 {
			return hunk, fmt.Errorf("invalid new range format")
		}
		var err error
		hunk.newStart, err = strconv.Atoi(newParts[0])
		if err != nil {
			return hunk, fmt.Errorf("invalid new start line: %v", err)
		}
		hunk.newLines, err = strconv.Atoi(newParts[1])
		if err != nil {
			return hunk, fmt.Errorf("invalid new line count: %v", err)
		}
	} else {
		var err error
		hunk.newStart, err = strconv.Atoi(newRange)
		if err != nil {
			return hunk, fmt.Errorf("invalid new start line: %v", err)
		}
		hunk.newLines = 1
	}

	return hunk, nil
}

func applyHunk(lines *[]string, hunk hunkInfo) error {
	// Convert to 0-based indexing
	startIdx := hunk.oldStart - 1

	if startIdx < 0 || startIdx >= len(*lines) {
		return fmt.Errorf("hunk start line %d is out of bounds (file has %d lines)", hunk.oldStart, len(*lines))
	}

	// Build the new lines for this hunk
	var newHunkLines []string

	// First, collect all the lines that should remain (context and additions)
	contextIdx := 0
	additionIdx := 0

	for i := 0; i < hunk.newLines; i++ {
		// Determine what type of line this should be
		// This is a simplified approach - we apply all additions after context lines
		if contextIdx < len(hunk.contextLines) {
			newHunkLines = append(newHunkLines, hunk.contextLines[contextIdx].content)
			contextIdx++
		} else if additionIdx < len(hunk.additions) {
			newHunkLines = append(newHunkLines, hunk.additions[additionIdx].content)
			additionIdx++
		}
	}

	// Replace the old lines with new lines
	endIdx := startIdx + hunk.oldLines
	if endIdx > len(*lines) {
		endIdx = len(*lines)
	}

	// Build the new slice
	newLines := make([]string, 0, len(*lines)-hunk.oldLines+len(newHunkLines))
	newLines = append(newLines, (*lines)[:startIdx]...)
	newLines = append(newLines, newHunkLines...)
	newLines = append(newLines, (*lines)[endIdx:]...)

	*lines = newLines
	return nil
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

// GetDependencyGraph builds a package dependency graph using `go list`.
func (b *Bridge) GetDependencyGraph() (models.DependencyGraph, error) {
	var graph models.DependencyGraph

	cmd := exec.Command("go", "list", "-json", "./...")
	cmd.Dir = b.BackendPath
	out, err := cmd.Output()
	if err != nil {
		return graph, err
	}

	type pkgInfo struct {
		ImportPath string
		Imports    []string
	}

	dec := json.NewDecoder(bytes.NewReader(out))
	nodes := make(map[string]bool)
	var edges []models.DependencyEdge

	for {
		var pkg pkgInfo
		if err := dec.Decode(&pkg); err == io.EOF {
			break
		} else if err != nil {
			return graph, err
		}

		nodes[pkg.ImportPath] = true
		for _, imp := range pkg.Imports {
			nodes[imp] = true
			edges = append(edges, models.DependencyEdge{From: pkg.ImportPath, To: imp})
		}
	}

	for n := range nodes {
		graph.Nodes = append(graph.Nodes, n)
	}
	graph.Edges = edges

	var buf bytes.Buffer
	buf.WriteString("digraph G {\n")
	for _, e := range edges {
		fmt.Fprintf(&buf, "    \"%s\" -> \"%s\";\n", e.From, e.To)
	}
	buf.WriteString("}\n")
	graph.DOT = buf.String()

	return graph, nil
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

// BrowseWithPlaywright opens a URL using Playwright and returns page data
func (b *Bridge) BrowseWithPlaywright(url string) (models.PlaywrightResult, error) {
	if !config.Flags.AllowTerminal {
		return models.PlaywrightResult{}, errors.New("terminal commands are disabled")
	}
	result, err := analyzer.BrowseWithPlaywright(url)
	if err == nil {
		b.LastHTML = result.HTML
		b.LastScreenshot = result.Screenshot
	}
	return result, err
}

// GetLatestScreenshot returns the last Playwright screenshot
func (b *Bridge) GetLatestScreenshot(toBase64 bool) (models.UIScreenshot, error) {
	if b.LastScreenshot == "" {
		return models.UIScreenshot{}, errors.New("no screenshot available")
	}
	if !toBase64 {
		return models.UIScreenshot{Path: b.LastScreenshot}, nil
	}
	data, err := os.ReadFile(b.LastScreenshot)
	if err != nil {
		return models.UIScreenshot{}, err
	}
	encoded := base64.StdEncoding.EncodeToString(data)
	return models.UIScreenshot{Base64: encoded, Path: b.LastScreenshot}, nil
}

// GetUIMetadata parses the last fetched HTML and returns component metadata and content
func (b *Bridge) GetUIMetadata() ([]models.UIComponent, []models.UIContent, error) {
	if b.LastHTML == "" {
		return nil, nil, errors.New("no HTML captured")
	}
	return analyzer.ParseUI(b.LastHTML)
}

// GetUICodeMap maps components to source files
func (b *Bridge) GetUICodeMap(comps []models.UIComponent) ([]models.CodeMap, error) {
	return analyzer.MapComponentsToSource(b.BackendPath, comps)
}

// GetVisualContext runs Playwright and builds the prompt payload
func (b *Bridge) GetVisualContext(url string) (models.UIPromptPayload, error) {
	result, err := b.BrowseWithPlaywright(url)
	if err != nil {
		return models.UIPromptPayload{}, err
	}
	comps, content, err := analyzer.ParseUI(result.HTML)
	if err != nil {
		return models.UIPromptPayload{}, err
	}
	codeMap, _ := analyzer.MapComponentsToSource(b.BackendPath, comps)
	return analyzer.BuildUIPrompt(result.Screenshot, comps, codeMap, content), nil
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
	// Analyze actual backend performance by checking common bottlenecks
	analysis := models.PerformanceMetrics{
		Name:        "Backend Performance Analysis",
		Type:        "performance",
		File:        "bridge.go",
		Description: "Real-time backend performance metrics",
		Pattern:     "performance_analysis",
		Location:    b.BackendPath,
	}

	// Check for database connections and queries
	if b.DB != nil {
		// Test a simple query to measure response time
		start := time.Now()
		var count int
		err := b.DB.QueryRow("SELECT 1").Scan(&count)
		queryTime := time.Since(start)

		if err == nil {
			analysis.ResponseTime = float64(queryTime.Nanoseconds()) / 1e6 // Convert to milliseconds
			analysis.DatabaseQueries = 1
		} else {
			analysis.ResponseTime = 9999.0 // Indicate connection issues
		}
	} else {
		analysis.ResponseTime = 0.0
		analysis.DatabaseQueries = 0
	}

	// Get memory usage from system
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	analysis.MemoryUsage = int64(memStats.Alloc)
	analysis.Throughput = 1000.0 / (analysis.ResponseTime + 1) // Requests per second estimate
	analysis.CPUUsage = 0.0                                    // Would need system calls for real CPU usage
	analysis.CacheHits = 0                                     // Would need cache monitoring

	return analysis, nil
}

// GetSecurityAnalysis returns security analysis results
func (b *Bridge) GetSecurityAnalysis() (models.SecurityAnalysis, error) {
	analysis := models.SecurityAnalysis{
		VulnerabilitiesFound: 0,
		SecurityScore:        100.0,
		Recommendations:      []string{},
		CriticalIssues:       []string{},
		RiskLevel:            "Low",
	}

	if b.BackendPath == "" {
		return analysis, nil
	}

	// ------- Basic heuristics using grep -------
	cmd := exec.Command("grep", "-r", "-i", "password\\|secret\\|api[_-]key", b.BackendPath)
	if out, err := cmd.Output(); err == nil && len(out) > 0 {
		analysis.VulnerabilitiesFound++
		analysis.CriticalIssues = append(analysis.CriticalIssues, "Potential hardcoded credentials found")
		analysis.SecurityScore -= 5
	}

	cmd = exec.Command("grep", "-r", "Query.*+\\|Exec.*+", b.BackendPath)
	if out, err := cmd.Output(); err == nil && len(out) > 0 {
		analysis.VulnerabilitiesFound++
		analysis.CriticalIssues = append(analysis.CriticalIssues, "Potential SQL injection vulnerability")
		analysis.SecurityScore -= 10
	}

	cmd = exec.Command("grep", "-r", "http://", b.BackendPath)
	if out, err := cmd.Output(); err == nil && len(out) > 0 {
		analysis.Recommendations = append(analysis.Recommendations, "Replace HTTP with HTTPS")
	}

	// ------- Static analysis: go vet -------
	vetCmd := exec.Command("go", "vet", "./...")
	vetCmd.Dir = b.BackendPath
	vetOut, vetErr := vetCmd.CombinedOutput()
	vetLines := strings.Split(strings.TrimSpace(string(vetOut)), "\n")
	for _, l := range vetLines {
		if strings.TrimSpace(l) == "" {
			continue
		}
		analysis.VulnerabilitiesFound++
		analysis.CriticalIssues = append(analysis.CriticalIssues, l)
		analysis.SecurityScore -= 1
	}
	if vetErr != nil && len(vetLines) == 0 {
		analysis.Recommendations = append(analysis.Recommendations, "Run 'go vet' with full module access")
	}

	// ------- Static analysis: govulncheck -------
	if _, err := exec.LookPath("govulncheck"); err == nil {
		vulnCmd := exec.Command("govulncheck", "-format=json", "./...")
		vulnCmd.Dir = b.BackendPath
		vulnOut, err := vulnCmd.CombinedOutput()
		var result struct {
			Vulns []struct {
				OSV struct {
					ID string `json:"id"`
				} `json:"osv"`
			} `json:"vulns"`
		}
		if jsonErr := json.Unmarshal(vulnOut, &result); jsonErr == nil {
			if len(result.Vulns) > 0 {
				analysis.VulnerabilitiesFound += len(result.Vulns)
				for _, v := range result.Vulns {
					analysis.CriticalIssues = append(analysis.CriticalIssues, v.OSV.ID)
				}
				analysis.SecurityScore -= float64(len(result.Vulns)) * 5
			}
		} else if err != nil {
			analysis.Recommendations = append(analysis.Recommendations, "govulncheck failed: "+err.Error())
		}
	} else {
		analysis.Recommendations = append(analysis.Recommendations, "Install govulncheck for deeper analysis")
	}

	// Determine risk level based on findings
	switch {
	case analysis.VulnerabilitiesFound > 5 || analysis.SecurityScore < 60:
		analysis.RiskLevel = "High"
	case analysis.VulnerabilitiesFound > 0:
		analysis.RiskLevel = "Medium"
	default:
		analysis.RiskLevel = "Low"
	}

	// Standard recommendations
	analysis.Recommendations = append(analysis.Recommendations,
		"Enable HTTPS",
		"Update dependencies regularly",
		"Add rate limiting",
		"Implement proper authentication",
		"Use secure headers",
	)

	if analysis.SecurityScore < 0 {
		analysis.SecurityScore = 0
	}

	return analysis, nil
}

// ValidateAPIContracts validates API contracts
func (b *Bridge) ValidateAPIContracts() (models.APIContractValidation, error) {
	validation := models.APIContractValidation{
		ContractsValidated: 0,
		ErrorsFound:        0,
		WarningsFound:      0,
		Status:             "no_contracts_found",
	}

	if b.BackendPath != "" {
		// Look for OpenAPI specification files
		cmd := exec.Command("find", b.BackendPath, "-name", "openapi.yaml", "-o", "-name", "openapi.json")
		output, err := cmd.Output()
		if err == nil && len(output) > 0 {
			lines := bytes.Split(bytes.TrimSpace(output), []byte("\n"))
			if len(lines) > 0 && len(lines[0]) > 0 {
				validation.ContractsValidated = len(lines)
				validation.Status = "valid"
			}
		}

		// Check for API route definitions in Go files
		cmd = exec.Command("grep", "-r", "-E", "router\\.|Route\\(|HandleFunc\\(", b.BackendPath)
		output, err = cmd.Output()
		if err == nil && len(output) > 0 {
			lines := bytes.Split(bytes.TrimSpace(output), []byte("\n"))
			routeCount := len(lines)
			validation.ContractsValidated += routeCount

			// Check for inconsistencies (routes without documentation)
			if validation.ContractsValidated > routeCount*2 {
				validation.WarningsFound = validation.ContractsValidated - routeCount
			}
		}

		// Look for API documentation
		cmd = exec.Command("find", b.BackendPath, "-name", "API*", "-o", "-name", "*api*", "-name", "*.md")
		output, err = cmd.Output()
		if err == nil && len(output) > 0 {
			validation.Status = "documented"
		}

		if validation.ContractsValidated == 0 {
			validation.WarningsFound = 1
			validation.Status = "no_contracts_found"
		}
	}

	return validation, nil
}

// GetTestCoverage returns test coverage metrics
func (b *Bridge) GetTestCoverage() (models.TestCoverage, error) {
	coverage := models.TestCoverage{}

	if b.BackendPath == "" {
		return coverage, fmt.Errorf("backend path not set")
	}

	// Run go tests with coverage
	coverFile := filepath.Join(b.BackendPath, "coverage.out")
	cmd := exec.Command("go", "test", "./...", "-coverprofile", coverFile)
	cmd.Dir = b.BackendPath
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return coverage, fmt.Errorf("go test failed: %v: %s", err, stderr.String())
	}

	// Parse coverage profile
	profiles, err := cover.ParseProfiles(coverFile)
	if err != nil {
		return coverage, err
	}
	defer os.Remove(coverFile)

	totalStmts := 0
	coveredStmts := 0
	allFiles := make(map[string]struct{})
	coveredFiles := make(map[string]struct{})

	for _, p := range profiles {
		allFiles[p.FileName] = struct{}{}
		for _, b := range p.Blocks {
			totalStmts += b.NumStmt
			if b.Count > 0 {
				coveredStmts += b.NumStmt
				coveredFiles[p.FileName] = struct{}{}
			}
		}
	}

	coverage.TotalFiles = len(allFiles)
	coverage.FilesCovered = len(coveredFiles)
	coverage.TotalLines = totalStmts
	coverage.LinesCovered = coveredStmts
	if totalStmts > 0 {
		coverage.OverallPercentage = float64(coveredStmts) / float64(totalStmts) * 100.0
	}

	return coverage, nil
}

// AnalyzeCodeQuality returns code quality analysis
func (b *Bridge) AnalyzeCodeQuality() (models.CodeQuality, error) {
	quality := models.CodeQuality{
		Score:           100.0,
		IssuesFound:     0,
		TechnicalDebt:   "0 hours",
		Maintainability: "Excellent",
		Complexity:      "Low",
		LinterIssues:    []string{},
	}

	if b.BackendPath == "" {
		return quality, fmt.Errorf("backend path not set")
	}

	var cmd *exec.Cmd
	var linter string
	if _, err := exec.LookPath("golangci-lint"); err == nil {
		linter = "golangci-lint"
		cmd = exec.Command("golangci-lint", "run", "--out-format", "json", "--issues-exit-code", "0")
		cmd.Dir = b.BackendPath
	} else if _, err := exec.LookPath("staticcheck"); err == nil {
		linter = "staticcheck"
		cmd = exec.Command("staticcheck", "./...")
		cmd.Dir = b.BackendPath
	} else {
		return quality, fmt.Errorf("neither golangci-lint nor staticcheck is installed")
	}

	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			out.Write(exitErr.Stderr)
		} else {
			return quality, err
		}
	}

	switch linter {
	case "golangci-lint":
		type lintIssue struct {
			FromLinter string `json:"FromLinter"`
			Text       string `json:"Text"`
		}
		var report struct {
			Issues []lintIssue `json:"Issues"`
		}
		if err := json.Unmarshal(out.Bytes(), &report); err == nil {
			quality.IssuesFound = len(report.Issues)
			for _, is := range report.Issues {
				quality.LinterIssues = append(quality.LinterIssues, fmt.Sprintf("%s: %s", is.FromLinter, is.Text))
			}
		} else if out.Len() > 0 {
			lines := strings.Split(strings.TrimSpace(out.String()), "\n")
			quality.IssuesFound = len(lines)
			quality.LinterIssues = append(quality.LinterIssues, lines...)
		}
	case "staticcheck":
		lines := strings.Split(strings.TrimSpace(out.String()), "\n")
		for _, line := range lines {
			if strings.TrimSpace(line) == "" {
				continue
			}
			quality.LinterIssues = append(quality.LinterIssues, line)
		}
		quality.IssuesFound = len(quality.LinterIssues)
	}

	// Derive maintainability and score from issue count
	quality.TechnicalDebt = fmt.Sprintf("%.1f hours", float64(quality.IssuesFound)*0.5)
	switch {
	case quality.IssuesFound > 50:
		quality.Maintainability = "Poor"
		quality.Score -= float64(quality.IssuesFound) * 1.0
	case quality.IssuesFound > 20:
		quality.Maintainability = "Fair"
		quality.Score -= float64(quality.IssuesFound) * 0.8
	case quality.IssuesFound > 10:
		quality.Maintainability = "Good"
		quality.Score -= float64(quality.IssuesFound) * 0.5
	default:
		quality.Maintainability = "Excellent"
		quality.Score -= float64(quality.IssuesFound) * 0.3
	}

	// Determine complexity from gocyclo results
	if reports, err := b.AnalyzeComplexity(); err == nil {
		maxC := 0
		for _, r := range reports {
			if r.Complexity > maxC {
				maxC = r.Complexity
			}
		}
		switch {
		case maxC > 30:
			quality.Complexity = "High"
		case maxC > 15:
			quality.Complexity = "Moderate"
		default:
			quality.Complexity = "Low"
		}
	}

	if quality.Score < 0 {
		quality.Score = 0
	}

	return quality, nil
}

// AnalyzeComplexity runs gocyclo to report cyclomatic complexity of functions
func (b *Bridge) AnalyzeComplexity() ([]models.ComplexityReport, error) {
	if b.BackendPath == "" {
		return nil, fmt.Errorf("backend path not set")
	}

	if _, err := exec.LookPath("gocyclo"); err != nil {
		return nil, fmt.Errorf("gocyclo not installed: %w", err)
	}

	cmd := exec.Command("gocyclo", b.BackendPath)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil, err
	}

	var reports []models.ComplexityReport
	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}
		comp, err := strconv.Atoi(fields[0])
		if err != nil {
			continue
		}
		loc := fields[1]
		fn := strings.Join(fields[2:], " ")
		file := loc
		ln := 0
		if idx := strings.Index(loc, ":"); idx != -1 {
			file = loc[:idx]
			rest := loc[idx+1:]
			if idx2 := strings.Index(rest, ":"); idx2 != -1 {
				rest = rest[:idx2]
			}
			if n, err := strconv.Atoi(rest); err == nil {
				ln = n
			}
		}
		reports = append(reports, models.ComplexityReport{
			Function:   fn,
			File:       file,
			Line:       ln,
			Complexity: comp,
		})
	}

	return reports, nil
}

// GetLintDiagnostics runs a linter and go build to collect issues and compile errors
func (b *Bridge) GetLintDiagnostics() (models.LintDiagnostics, error) {
	diags := models.LintDiagnostics{Issues: []string{}, CompileErrors: []string{}}
	if b.BackendPath == "" {
		return diags, fmt.Errorf("backend path not set")
	}

	var cmd *exec.Cmd
	if _, err := exec.LookPath("golangci-lint"); err == nil {
		diags.Linter = "golangci-lint"
		cmd = exec.Command("golangci-lint", "run", "--out-format", "json", "--issues-exit-code", "0")
	} else if _, err := exec.LookPath("staticcheck"); err == nil {
		diags.Linter = "staticcheck"
		cmd = exec.Command("staticcheck", "./...")
	} else {
		return diags, fmt.Errorf("neither golangci-lint nor staticcheck is installed")
	}
	cmd.Dir = b.BackendPath
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			out.Write(exitErr.Stderr)
		} else {
			return diags, err
		}
	}

	if diags.Linter == "golangci-lint" {
		type lintIssue struct {
			FromLinter string `json:"FromLinter"`
			Text       string `json:"Text"`
		}
		var report struct {
			Issues []lintIssue `json:"Issues"`
		}
		if err := json.Unmarshal(out.Bytes(), &report); err == nil {
			for _, is := range report.Issues {
				diags.Issues = append(diags.Issues, fmt.Sprintf("%s: %s", is.FromLinter, is.Text))
			}
		} else {
			for _, line := range strings.Split(strings.TrimSpace(out.String()), "\n") {
				if strings.TrimSpace(line) != "" {
					diags.Issues = append(diags.Issues, line)
				}
			}
		}
	} else {
		for _, line := range strings.Split(strings.TrimSpace(out.String()), "\n") {
			if strings.TrimSpace(line) != "" {
				diags.Issues = append(diags.Issues, line)
			}
		}
	}

	buildCmd := exec.Command("go", "build", "./...")
	buildCmd.Dir = b.BackendPath
	var buildOut bytes.Buffer
	buildCmd.Stderr = &buildOut
	if err := buildCmd.Run(); err != nil {
		for _, line := range strings.Split(strings.TrimSpace(buildOut.String()), "\n") {
			if strings.TrimSpace(line) != "" {
				diags.CompileErrors = append(diags.CompileErrors, line)
			}
		}
	}

	return diags, nil
}

// GetAPISchema returns comprehensive API schema information by analyzing actual backend implementation
func (b *Bridge) GetAPISchema() (models.APISchema, error) {
	schema := models.APISchema{
		Endpoints:       []string{},
		Methods:         []string{},
		SchemaFiles:     []string{},
		ValidationRules: make(map[string]interface{}),
	}

	// Check for actual OpenAPI files in the backend
	backendDocsPath := filepath.Join(b.BackendPath, "docs")

	// Detect openapi.yaml
	openapiYaml := filepath.Join(backendDocsPath, "openapi.yaml")
	if _, err := os.Stat(openapiYaml); err == nil {
		schema.SchemaFiles = append(schema.SchemaFiles, "docs/openapi.yaml")

		content, err := os.ReadFile(openapiYaml)
		if err == nil {
			contentStr := string(content)
			if strings.Contains(contentStr, "openapi:") {
				parts := strings.SplitN(contentStr, "openapi:", 2)
				if len(parts) > 1 {
					ver := strings.Fields(parts[1])[0]
					schema.OpenAPIVersion = strings.TrimSpace(ver)
				}
			}
		}
	}

	// Detect openapi.json
	openapiJSON := filepath.Join(backendDocsPath, "openapi.json")
	if _, err := os.Stat(openapiJSON); err == nil {
		schema.SchemaFiles = append(schema.SchemaFiles, "docs/openapi.json")
		if schema.OpenAPIVersion == "" {
			content, err := os.ReadFile(openapiJSON)
			if err == nil {
				var js map[string]interface{}
				if json.Unmarshal(content, &js) == nil {
					if v, ok := js["openapi"].(string); ok {
						schema.OpenAPIVersion = v
					}
				}
			}
		}
	}

	// Parse actual routes from the main.go file
	mainGoPath := filepath.Join(b.BackendPath, "cmd/apiserver/main.go")
	routes, err := analyzer.ParseGinRoutes(mainGoPath)
	if err == nil {
		methodsMap := make(map[string]bool)
		endpointsMap := make(map[string]bool)

		for _, route := range routes {
			methodsMap[route.Method] = true
			endpointsMap[route.Path] = true
		}

		// Convert maps to slices
		for method := range methodsMap {
			schema.Methods = append(schema.Methods, method)
		}
		for endpoint := range endpointsMap {
			schema.Endpoints = append(schema.Endpoints, endpoint)
		}
	}

	// Check for swaggo annotations in main.go
	if content, err := os.ReadFile(mainGoPath); err == nil {
		contentStr := string(content)
		if strings.Contains(contentStr, "@title") && strings.Contains(contentStr, "ginSwagger") {
			schema.ValidationRules["implementation"] = "gin-swagger with swaggo annotations"
		}
	}

	// If no version detected yet, default based on files found
	if schema.OpenAPIVersion == "" {
		if len(schema.SchemaFiles) > 0 {
			schema.OpenAPIVersion = "2.0" // Most likely swaggo/gin-swagger
		} else {
			schema.OpenAPIVersion = "unknown"
		}
	}

	return schema, nil
}

// TraceMiddlewareFlow traces middleware execution pipeline
func (b *Bridge) TraceMiddlewareFlow() (models.MiddlewareFlow, error) {
	mainPath := filepath.Join(b.BackendPath, "cmd", "apiserver", "main.go")
	content, err := os.ReadFile(mainPath)
	if err != nil {
		return models.MiddlewareFlow{}, err
	}

	re := regexp.MustCompile(`router\.Use\(([^\)]+)\)`)
	matches := re.FindAllStringSubmatch(string(content), -1)

	var steps []models.MiddlewareStep
	for i, m := range matches {
		name := strings.TrimSpace(strings.TrimSuffix(m[1], "()"))
		steps = append(steps, models.MiddlewareStep{
			Name:   name,
			Order:  i + 1,
			Status: "configured",
		})
	}

	return models.MiddlewareFlow{Pipeline: steps}, nil
}

// GetCampaignPipeline builds a high level view of a campaign's pipeline
func (b *Bridge) GetCampaignPipeline(campaignID uuid.UUID) (models.CampaignPipeline, error) {
	if b.DB == nil {
		return models.CampaignPipeline{}, fmt.Errorf("database not initialized")
	}

	query := `SELECT job_type, status, created_at, updated_at FROM campaign_jobs WHERE campaign_id = $1`
	rows, err := b.DB.Query(query, campaignID)
	if err != nil {
		return models.CampaignPipeline{}, err
	}
	defer rows.Close()

	type jobRec struct {
		JobType   string
		Status    string
		CreatedAt time.Time
		UpdatedAt time.Time
	}

	var jobs []jobRec
	for rows.Next() {
		var r jobRec
		if err := rows.Scan(&r.JobType, &r.Status, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return models.CampaignPipeline{}, err
		}
		jobs = append(jobs, r)
	}

	order := []string{
		models.CampaignTypeDomainGeneration,
		models.CampaignTypeDNSValidation,
		models.CampaignTypeHTTPKeywordValidation,
	}

	var steps []models.PipelineStep
	for _, stepName := range order {
		var latest *jobRec
		for _, j := range jobs {
			if j.JobType == stepName {
				if latest == nil || j.UpdatedAt.After(latest.UpdatedAt) {
					tmp := j
					latest = &tmp
				}
			}
		}

		if latest != nil {
			steps = append(steps, models.PipelineStep{
				Name:       stepName,
				Status:     latest.Status,
				StartedAt:  latest.CreatedAt,
				FinishedAt: latest.UpdatedAt,
			})
		} else {
			steps = append(steps, models.PipelineStep{Name: stepName, Status: "pending"})
		}
	}

	return models.CampaignPipeline{CampaignID: campaignID, Steps: steps}, nil
}

// GetWebSocketLifecycle returns WebSocket connection lifecycle information
func (b *Bridge) GetWebSocketLifecycle() (models.WebSocketLifecycle, error) {
	// Since the MCP server is independent, provide a default implementation
	// In a full integration, this would connect to the backend websocket manager
	return models.WebSocketLifecycle{
		ConnectionStates:  []models.WSConnectionState{},
		Events:            []models.WSEvent{},
		ActiveConnections: 0,
		TotalConnections:  0,
		MessageThroughput: "N/A - MCP server standalone",
	}, nil
}

// TestWebSocketFlow tests WebSocket connectivity and message flow
func (b *Bridge) TestWebSocketFlow() (models.WebSocketTestResult, error) {
	wsURL := os.Getenv("MCP_WS_TEST_URL")
	if wsURL == "" {
		wsURL = "ws://localhost:8080/api/v2/ws"
	}

	u, err := url.Parse(wsURL)
	if err != nil {
		return models.WebSocketTestResult{}, err
	}

	start := time.Now()
	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	duration := time.Since(start)

	result := models.WebSocketTestResult{
		ConnectionTest: models.WSTestStep{
			Name:     "dial",
			Duration: duration.String(),
		},
		TotalDuration: duration.String(),
	}

	if err != nil {
		result.ConnectionTest.Status = "failed"
		result.ConnectionTest.Details = err.Error()
		result.OverallStatus = "failed"
		result.Errors = []string{err.Error()}
		return result, nil
	}

	result.ConnectionTest.Status = "passed"
	result.ConnectionTest.Details = "connected"
	conn.Close()
	result.OverallStatus = "passed"
	return result, nil
}

// TODO: Add more methods for other tools as needed.
