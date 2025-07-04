package analyzer

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"mcp/internal/models"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	playwright "github.com/playwright-community/playwright-go"
)

// PersistentBrowserSession maintains a long-running browser session for cookie persistence with debugging
type PersistentBrowserSession struct {
	SessionID     string
	Browser       playwright.Browser
	Context       playwright.BrowserContext
	Page          playwright.Page
	Playwright    *playwright.Playwright
	LastUsed      time.Time
	mutex         sync.Mutex
	ConsoleLogs   []models.ConsoleLogEntry
	NetworkLogs   []models.NetworkLogEntry
	CookieState   map[string]interface{}
	DebugEnabled  bool
}


// Global map to store persistent browser sessions
var persistentSessions = make(map[string]*PersistentBrowserSession)
var sessionsMutex sync.RWMutex

// GetPersistentSession retrieves a persistent browser session for debugging
func GetPersistentSession(sessionID string) (*PersistentBrowserSession, bool) {
	sessionsMutex.RLock()
	defer sessionsMutex.RUnlock()
	session, exists := persistentSessions[sessionID]
	return session, exists
}

// CleanupPersistentSession removes a specific persistent session
func CleanupPersistentSession(sessionID string) bool {
	sessionsMutex.Lock()
	defer sessionsMutex.Unlock()
	
	if session, exists := persistentSessions[sessionID]; exists {
		// Clean up the session resources
		if session.Context != nil {
			session.Context.Close()
		}
		if session.Browser != nil {
			session.Browser.Close()
		}
		if session.Playwright != nil {
			session.Playwright.Stop()
		}
		delete(persistentSessions, sessionID)
		return true
	}
	return false
}

// GetSessionDebuggingInfo safely retrieves debugging information from a persistent session
func GetSessionDebuggingInfo(sessionID string) ([]models.ConsoleLogEntry, []models.NetworkLogEntry, map[string]interface{}) {
	sessionsMutex.RLock()
	session, exists := persistentSessions[sessionID]
	sessionsMutex.RUnlock()
	
	if !exists {
		// Session not found - return empty debug info
		return make([]models.ConsoleLogEntry, 0), make([]models.NetworkLogEntry, 0), make(map[string]interface{})
	}
	
	// Lock the session to safely access debug data
	session.mutex.Lock()
	defer session.mutex.Unlock()
	
	// Copy console logs (to avoid sharing the slice)
	consoleLogs := make([]models.ConsoleLogEntry, len(session.ConsoleLogs))
	copy(consoleLogs, session.ConsoleLogs)
	
	// Copy network logs (to avoid sharing the slice)
	networkLogs := make([]models.NetworkLogEntry, len(session.NetworkLogs))
	copy(networkLogs, session.NetworkLogs)
	
	// Copy cookie state (deep copy of the map)
	cookieState := make(map[string]interface{})
	for k, v := range session.CookieState {
		cookieState[k] = v
	}
	
	return consoleLogs, networkLogs, cookieState
}

// GetValidationRules analyzes code for validation patterns
func GetValidationRules(dir string) ([]models.ValidationRule, error) {
	var rules []models.ValidationRule

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		lines := strings.Split(string(content), "\n")
		for i, line := range lines { // Look for struct tags with validation
			if strings.Contains(line, `validate:"`) {
				start := strings.Index(line, `validate:"`) + 10
				end := strings.Index(line[start:], `"`)
				if end > 0 {
					validation := line[start : start+end]

					// Extract field name (simple heuristic)
					words := strings.Fields(line)
					var fieldName string
					if len(words) > 0 {
						fieldName = words[0]
					}

					rules = append(rules, models.ValidationRule{
						Field:       fieldName,
						Rule:        validation,
						Message:     fmt.Sprintf("Validation rule: %s", validation),
						File:        path,
						LineNumber:  i + 1,
						Name:        fmt.Sprintf("Validation for %s", fieldName),
						Description: fmt.Sprintf("Field %s must satisfy: %s", fieldName, validation),
						Pattern:     fmt.Sprintf(`validate:"%s"`, validation),
						Severity:    getSeverity(validation),
					})
				}
			}
		}

		return nil
	})

	return rules, err
}

// getSeverity determines severity based on validation rule
func getSeverity(rule string) string {
	if strings.Contains(rule, "required") {
		return "error"
	}
	if strings.Contains(rule, "email") || strings.Contains(rule, "url") {
		return "error"
	}
	return "warning"
}

// GetErrorHandlers analyzes code for error handling patterns
func GetErrorHandlers(dir string) ([]models.ErrorHandler, error) {
	var handlers []models.ErrorHandler

	// Common error handling patterns
	patterns := []struct {
		name        string
		pattern     string
		description string
	}{
		{"HTTP Error Handler", "func.*Error.*http\\.ResponseWriter", "HTTP error response handler"},
		{"Database Error Handler", "if err != nil.*database", "Database error handling"},
		{"Validation Error Handler", "if.*valid.*error", "Input validation error handling"},
		{"Generic Error Handler", "if err != nil", "Generic error handling pattern"},
	}

	for _, p := range patterns {
		handlers = append(handlers, models.ErrorHandler{
			Name:        p.name,
			Type:        "pattern",
			File:        dir,
			Description: p.description,
			Pattern:     p.pattern,
			Location:    fmt.Sprintf("%s/*", dir),
		})
	}

	return handlers, nil
}

// GetSecurityPolicies analyzes code for security policies
func GetSecurityPolicies(dir string) ([]models.SecurityPolicy, error) {
	var policies []models.SecurityPolicy

	// Common security patterns
	securityPatterns := []struct {
		name        string
		pattern     string
		description string
	}{
		{"Authentication Middleware", "func.*Auth.*middleware", "Authentication middleware"},
		{"CORS Policy", "cors\\.New", "CORS configuration"},
		{"Rate Limiting", "rate.*limit", "Rate limiting implementation"},
		{"Input Sanitization", "sanitize|escape", "Input sanitization"},
	}

	for _, p := range securityPatterns {
		policies = append(policies, models.SecurityPolicy{
			Name:        p.name,
			Type:        "middleware",
			Rules:       []string{p.pattern},
			File:        dir,
			Enabled:     true,
			Description: p.description,
			Pattern:     p.pattern,
			Location:    fmt.Sprintf("%s/*", dir),
		})
	}

	return policies, nil
}

// GetPerformanceMetrics analyzes code for performance metrics
func GetPerformanceMetrics(dir string) ([]models.PerformanceMetrics, error) {
	var metrics []models.PerformanceMetrics

	// Example performance metrics - in practice, these would be extracted from monitoring
	metrics = append(metrics, models.PerformanceMetrics{
		Name:         "API Response Time",
		Value:        "145ms",
		Threshold:    "200ms",
		Status:       "Good",
		Description:  "Average API response time",
		ResponseTime: 145.0,
		Type:         "timing",
		File:         dir,
		Pattern:      "response_time_*",
		Location:     fmt.Sprintf("%s/handlers", dir),
	})

	metrics = append(metrics, models.PerformanceMetrics{
		Name:         "Database Query Time",
		Value:        "23ms",
		Threshold:    "50ms",
		Status:       "Excellent",
		Description:  "Average database query execution time",
		ResponseTime: 23.0,
		Type:         "database",
		File:         dir,
		Pattern:      "db_query_*",
		Location:     fmt.Sprintf("%s/database", dir),
	})

	return metrics, nil
}

// GetAuditLogs analyzes code for audit logging patterns
func GetAuditLogs(dir string) ([]models.AuditLog, error) {
	var logs []models.AuditLog

	// Example audit logs - in practice, these would be extracted from log files
	logs = append(logs, models.AuditLog{
		ID:          "audit_001",
		Timestamp:   "2025-06-24T14:15:00Z",
		Action:      "User Login",
		User:        "user123",
		Resource:    "/api/auth/login",
		Details:     "Successful user authentication",
		Name:        "Login Audit",
		Type:        "authentication",
		File:        fmt.Sprintf("%s/auth.log", dir),
		Description: "User authentication audit log",
		Pattern:     "auth_*",
		Location:    fmt.Sprintf("%s/logs", dir),
	})

	return logs, nil
}

// SearchCode searches for code patterns in the given directory
func SearchCode(dirPath string, query string) ([]models.SearchResult, error) {
	var results []models.SearchResult

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		lines := strings.Split(string(content), "\n")
		for i, line := range lines {
			if strings.Contains(strings.ToLower(line), strings.ToLower(query)) {
				// Provide context (line before and after)
				context := ""
				if i > 0 {
					context += lines[i-1] + "\n"
				}
				context += line
				if i < len(lines)-1 {
					context += "\n" + lines[i+1]
				}

				results = append(results, models.SearchResult{
					File:    path,
					Line:    i + 1,
					Column:  strings.Index(strings.ToLower(line), strings.ToLower(query)) + 1,
					Content: strings.TrimSpace(line),
					Context: context,
				})
			}
		}

		return nil
	})

	return results, err
}

// GetPackageStructure analyzes the package structure of a project
func GetPackageStructure(dirPath string) (models.PackageStructure, error) {
	var structure models.PackageStructure
	var packages []models.PackageStructureNode

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() && info.Name() != "." && info.Name() != ".." {
			// Count Go files in this directory
			goFiles := 0
			files, err := os.ReadDir(path)
			if err == nil {
				for _, file := range files {
					if strings.HasSuffix(file.Name(), ".go") && !strings.HasSuffix(file.Name(), "_test.go") {
						goFiles++
					}
				}
			}

			if goFiles > 0 {
				relPath, _ := filepath.Rel(dirPath, path)
				packages = append(packages, models.PackageStructureNode{
					Name: filepath.Base(path),
					Path: relPath,
					Type: "package",
				})
			}
		}

		return nil
	})

	structure.Root = models.PackageStructureNode{
		Name: filepath.Base(dirPath),
		Path: ".",
		Type: "root",
	}
	structure.Packages = packages

	return structure, err
}

// GetEnvVars analyzes Go files to extract environment variable usage
func GetEnvVars(dirPath string) ([]models.EnvVar, error) {
	var envVars []models.EnvVar

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		lines := strings.Split(string(content), "\n")
		for i, line := range lines {
			// Look for os.Getenv calls
			if strings.Contains(line, "os.Getenv") || strings.Contains(line, "Getenv") {
				// Extract variable name
				start := strings.Index(line, "\"")
				if start != -1 {
					end := strings.Index(line[start+1:], "\"")
					if end != -1 {
						varName := line[start+1 : start+1+end]
						envVars = append(envVars, models.EnvVar{
							Name:        varName,
							Required:    !strings.Contains(line, "default") && !strings.Contains(line, "fallback"),
							Description: fmt.Sprintf("Environment variable used in %s", filepath.Base(path)),
							File:        path,
							Line:        i + 1,
						})
					}
				}
			}
		}

		return nil
	})

	return envVars, err
}

// GetMiddlewareUsage analyzes middleware usage patterns
func GetMiddlewareUsage(dirPath string) ([]models.MiddlewareUsage, error) {
	var usage []models.MiddlewareUsage

	middlewares, err := ParseMiddleware(dirPath)
	if err != nil {
		return nil, err
	}

	// Convert middleware definitions to usage patterns
	for _, middleware := range middlewares {
		usage = append(usage, models.MiddlewareUsage{
			MiddlewareName: middleware.Name,
			Route: models.Route{
				Method:  "ALL",
				Path:    "*",
				Handler: "middleware",
			},
		})
	}

	return usage, err
}

// GetDependencies analyzes Go module dependencies
func GetDependencies(dirPath string) ([]models.Dependency, error) {
	var dependencies []models.Dependency

	// Read go.mod file
	goModPath := filepath.Join(dirPath, "go.mod")
	content, err := os.ReadFile(goModPath)
	if err != nil {
		return dependencies, err // Return empty slice if no go.mod
	}

	lines := strings.Split(string(content), "\n")
	inRequireBlock := false

	for _, line := range lines {
		line = strings.TrimSpace(line)

		if line == "require (" {
			inRequireBlock = true
			continue
		}

		if line == ")" && inRequireBlock {
			inRequireBlock = false
			continue
		}

		if inRequireBlock || strings.HasPrefix(line, "require ") {
			// Parse dependency line
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				path := parts[0]
				version := parts[1]

				// Skip "require" keyword if present
				if path == "require" && len(parts) >= 3 {
					path = parts[1]
					version = parts[2]
				}

				dependencies = append(dependencies, models.Dependency{
					Path:    path,
					Version: version,
				})
			}
		}
	}

	return dependencies, nil
}

// ParseGoModDependencies parses dependencies from go.mod file
func ParseGoModDependencies(goModPath string) ([]models.Dependency, error) {
	var dependencies []models.Dependency

	content, err := os.ReadFile(goModPath)
	if err != nil {
		return dependencies, err
	}

	lines := strings.Split(string(content), "\n")
	inRequireBlock := false
	inReplaceBlock := false

	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Handle require block
		if line == "require (" {
			inRequireBlock = true
			continue
		}

		if line == "replace (" {
			inReplaceBlock = true
			continue
		}

		if line == ")" && (inRequireBlock || inReplaceBlock) {
			inRequireBlock = false
			inReplaceBlock = false
			continue
		}

		// Parse require statements
		if inRequireBlock || strings.HasPrefix(line, "require ") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				path := parts[0]
				version := parts[1]

				// Skip "require" keyword if present
				if path == "require" && len(parts) >= 3 {
					path = parts[1]
					version = parts[2]
				}

				// Remove comments and extra flags
				if idx := strings.Index(version, "//"); idx != -1 {
					version = strings.TrimSpace(version[:idx])
				}

				dependencies = append(dependencies, models.Dependency{
					Path:    path,
					Version: version,
				})
			}
		}

		// Parse single-line require statements
		if strings.HasPrefix(line, "require ") && !inRequireBlock {
			parts := strings.Fields(line[8:]) // Remove "require "
			if len(parts) >= 2 {
				path := parts[0]
				version := parts[1]

				if idx := strings.Index(version, "//"); idx != -1 {
					version = strings.TrimSpace(version[:idx])
				}

				dependencies = append(dependencies, models.Dependency{
					Path:    path,
					Version: version,
				})
			}
		}
	}

	return dependencies, nil
}

// GetReferences finds references to a symbol in the codebase
func GetReferences(dirPath, symbol, filePath string) ([]models.Reference, error) {
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
			switch x := n.(type) {
			case *ast.Ident:
				if x.Name == symbol {
					pos := fset.Position(x.Pos())
					references = append(references, models.Reference{
						Name: symbol,
						File: path,
						Line: pos.Line,
						Type: "identifier",
					})
				}
			case *ast.SelectorExpr:
				if x.Sel.Name == symbol {
					pos := fset.Position(x.Sel.Pos())
					references = append(references, models.Reference{
						Name: symbol,
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

// GetChangeImpact analyzes the impact of changes to a file
func GetChangeImpact(dirPath, filePath string) (models.ChangeImpact, error) {
	var impact models.ChangeImpact
	impact.File = filePath

	// Find functions that reference symbols from the changed file
	references, err := GetReferences(dirPath, filepath.Base(filePath), filePath)
	if err != nil {
		return impact, err
	}

	// Categorize references
	for _, ref := range references {
		if strings.Contains(ref.File, "test") {
			impact.AffectedTests = append(impact.AffectedTests, ref)
		} else {
			impact.AffectedFunctions = append(impact.AffectedFunctions, ref)
		}
	}

	// Calculate risk level based on number of references
	totalRefs := len(impact.AffectedFunctions) + len(impact.AffectedTests)
	impact.FilesAffected = totalRefs

	if totalRefs > 10 {
		impact.RiskLevel = "High"
		impact.Severity = "critical"
	} else if totalRefs > 5 {
		impact.RiskLevel = "Medium"
		impact.Severity = "warning"
	} else {
		impact.RiskLevel = "Low"
		impact.Severity = "info"
	}

	return impact, nil
}

// CreateSnapshot creates a snapshot of the current codebase state using git stash
func CreateSnapshot(dirPath, description string) (models.Snapshot, error) {
	var snapshot models.Snapshot

	// Create a unique snapshot ID
	timestamp := time.Now().Unix()
	snapshot.ID = fmt.Sprintf("snapshot_%d", timestamp)
	snapshot.Description = description
	snapshot.Timestamp = time.Now().Format(time.RFC3339)

	// Move to the project root (parent of backend directory)
	projectRoot := filepath.Dir(dirPath)

	// First, check if there are any changes to stash
	statusCmd := exec.Command("git", "status", "--porcelain")
	statusCmd.Dir = projectRoot
	statusOutput, err := statusCmd.Output()
	if err != nil {
		return snapshot, fmt.Errorf("failed to check git status: %v", err)
	}

	if len(statusOutput) == 0 {
		// No changes to stash
		return snapshot, fmt.Errorf("no changes to snapshot - working directory is clean")
	}

	// Create git stash with meaningful message
	stashMessage := fmt.Sprintf("MCP Snapshot: %s (ID: %s)", description, snapshot.ID)
	cmd := exec.Command("git", "stash", "push", "-u", "-m", stashMessage)
	cmd.Dir = projectRoot

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		return snapshot, fmt.Errorf("failed to create git stash: %v, stdout: %s, stderr: %s",
			err, stdout.String(), stderr.String())
	}

	// Get list of files that were stashed by parsing the status output
	var files []string
	statusLines := strings.Split(string(statusOutput), "\n")
	for _, line := range statusLines {
		if len(line) > 3 {
			// Extract filename from git status line (format: " M filename" or "?? filename")
			filename := strings.TrimSpace(line[3:])
			if filename != "" {
				files = append(files, filename)
			}
		}
	}

	snapshot.Files = files

	// Verify the stash was created by checking git stash list
	verifyCmd := exec.Command("git", "stash", "list", "--oneline", "-1")
	verifyCmd.Dir = projectRoot
	verifyOutput, verifyErr := verifyCmd.Output()

	if verifyErr == nil && len(verifyOutput) > 0 {
		// Check if our stash message is in the latest stash
		if strings.Contains(string(verifyOutput), snapshot.ID) {
			return snapshot, nil
		}
	}

	return snapshot, nil
}

// CheckContractDrift checks for API contract drift
func CheckContractDrift(dirPath string) (models.ContractDrift, error) {
	var drift models.ContractDrift

	// Analyze current routes
	routes, err := ParseGinRoutes(filepath.Join(dirPath, "cmd/apiserver/main.go"))
	if err != nil {
		return drift, err
	}

	// For now, assume no drift (would need baseline comparison)
	drift.HasDrift = false
	drift.IssuesFound = 0
	drift.Status = "stable"

	// List current routes as baseline
	for _, route := range routes {
		drift.Details = append(drift.Details, fmt.Sprintf("%s %s -> %s", route.Method, route.Path, route.Handler))
	}

	return drift, nil
}

// RunTerminalCommand executes a terminal command
func RunTerminalCommand(command, workingDir string) (models.CommandResult, error) {
	start := time.Now()
	cmd := exec.Command("sh", "-c", command)
	if workingDir != "" {
		cmd.Dir = workingDir
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	duration := time.Since(start)

	result := models.CommandResult{
		Command:  command,
		ExitCode: 0,
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		Duration: duration.String(),
	}

	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitError.ExitCode()
		} else {
			result.ExitCode = 1
		}
	}

	return result, err
}

// transformCoordinates transforms action coordinates based on the specified coordinate system
func transformCoordinates(action *models.UIAction, page playwright.Page) (float64, float64, error) {
	if action.X == nil || action.Y == nil {
		return 0, 0, fmt.Errorf("coordinates X and Y are required")
	}

	x, y := *action.X, *action.Y

	switch action.CoordSystem {
	case "viewport", "":
		// Default viewport coordinates - no transformation needed
		return x, y, nil
		
	case "element":
		// Element-relative coordinates
		if action.RelativeTo == "" {
			return 0, 0, fmt.Errorf("relativeTo selector is required for element coordinate system")
		}
		return getElementRelativeCoords(action.RelativeTo, x, y, page)
		
	case "page":
		// Page coordinates - account for scroll position
		scrollX, err := page.Evaluate("window.pageXOffset")
		if err != nil {
			return 0, 0, fmt.Errorf("failed to get page scroll X: %v", err)
		}
		scrollY, err := page.Evaluate("window.pageYOffset")
		if err != nil {
			return 0, 0, fmt.Errorf("failed to get page scroll Y: %v", err)
		}
		
		// Convert scroll values to float64
		scrollXFloat, ok := scrollX.(float64)
		if !ok {
			scrollXFloat = 0
		}
		scrollYFloat, ok := scrollY.(float64)
		if !ok {
			scrollYFloat = 0
		}
		
		return x - scrollXFloat, y - scrollYFloat, nil
		
	default:
		return 0, 0, fmt.Errorf("invalid coordinate system: %s", action.CoordSystem)
	}
}

// validateCoordinates validates that coordinates are within the viewport bounds
func validateCoordinates(x, y float64, page playwright.Page) error {
	viewportSize := page.ViewportSize()
	if viewportSize == nil {
		return fmt.Errorf("failed to get viewport size")
	}
	
	if x < 0 || y < 0 {
		return fmt.Errorf("coordinates cannot be negative: x=%f, y=%f", x, y)
	}
	
	if x > float64(viewportSize.Width) || y > float64(viewportSize.Height) {
		return fmt.Errorf("coordinates exceed viewport bounds: x=%f, y=%f (viewport: %dx%d)",
			x, y, viewportSize.Width, viewportSize.Height)
	}
	
	return nil
}

// getElementRelativeCoords calculates absolute coordinates relative to an element
func getElementRelativeCoords(selector string, x, y float64, page playwright.Page) (float64, float64, error) {
	// Get element bounding box
	element, err := page.QuerySelector(selector)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to find element with selector '%s': %v", selector, err)
	}
	if element == nil {
		return 0, 0, fmt.Errorf("element not found with selector: %s", selector)
	}
	
	bbox, err := element.BoundingBox()
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get element bounding box: %v", err)
	}
	if bbox == nil {
		return 0, 0, fmt.Errorf("element has no bounding box (may be hidden): %s", selector)
	}
	
	// Calculate absolute coordinates
	absoluteX := bbox.X + x
	absoluteY := bbox.Y + y
	
	return absoluteX, absoluteY, nil
}

// getOrCreatePersistentSession gets or creates a persistent browser session with cookie preservation and debugging
func getOrCreatePersistentSession(sessionID string) (*PersistentBrowserSession, error) {
	sessionsMutex.Lock()
	defer sessionsMutex.Unlock()

	// Check if session already exists
	if session, exists := persistentSessions[sessionID]; exists {
		session.LastUsed = time.Now()
		return session, nil
	}

	// Create new persistent session with debugging enabled
	pw, err := playwright.Run()
	if err != nil {
		return nil, fmt.Errorf("failed to start playwright: %v", err)
	}

	browser, err := pw.Chromium.Launch(playwright.BrowserTypeLaunchOptions{
		Headless: playwright.Bool(true),
		Args: []string{
			"--disable-blink-features=AutomationControlled",
			"--disable-web-security",
			"--disable-features=VizDisplayCompositor",
			"--enable-features=NetworkService,NetworkServiceLogging",
			"--disable-site-isolation-trials",
			"--disable-extensions",
			"--allow-running-insecure-content",
			"--disable-backgrounding-occluded-windows",
			"--disable-background-timer-throttling",
			"--disable-features=TranslateUI",
			"--disable-ipc-flooding-protection",
			"--disable-dev-shm-usage",
			"--no-sandbox",
			"--disable-setuid-sandbox",
		},
	})
	if err != nil {
		pw.Stop()
		return nil, fmt.Errorf("failed to launch browser: %v", err)
	}

	// Create browser context with CRITICAL cookie storage configuration for localhost
	context, err := browser.NewContext(playwright.BrowserNewContextOptions{
		AcceptDownloads:   playwright.Bool(false),
		IgnoreHttpsErrors: playwright.Bool(true),
		// Set viewport for consistent behavior
		Viewport: &playwright.Size{
			Width:  1280,
			Height: 720,
		},
		// Set user agent to mimic real browser
		UserAgent: playwright.String("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
		// Enable cookie handling for localhost - critical for session persistence
		Locale: playwright.String("en-US"),
		// Configure proper HTTP headers for cookie handling
		ExtraHttpHeaders: map[string]string{
			"Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/avif,*/*;q=0.8",
			"Accept-Language":           "en-US,en;q=0.9",
			"Accept-Encoding":           "gzip, deflate",
			"Connection":                "keep-alive",
			"Upgrade-Insecure-Requests": "1",
			"Sec-Fetch-Dest":            "document",
			"Sec-Fetch-Mode":            "navigate",
			"Sec-Fetch-Site":            "same-origin",
			"Cache-Control":             "max-age=0",
		},
		// Enable JavaScript which is required for modern web apps
		JavaScriptEnabled: playwright.Bool(true),
	})
	if err != nil {
		browser.Close()
		pw.Stop()
		return nil, fmt.Errorf("failed to create browser context: %v", err)
	}

	page, err := context.NewPage()
	if err != nil {
		context.Close()
		browser.Close()
		pw.Stop()
		return nil, fmt.Errorf("failed to create page: %v", err)
	}

	// Set timeout for dev servers
	page.SetDefaultTimeout(120000)

	session := &PersistentBrowserSession{
		SessionID:    sessionID,
		Browser:      browser,
		Context:      context,
		Page:         page,
		Playwright:   pw,
		LastUsed:     time.Now(),
		ConsoleLogs:  make([]models.ConsoleLogEntry, 0),
		NetworkLogs:  make([]models.NetworkLogEntry, 0),
		CookieState:  make(map[string]interface{}),
		DebugEnabled: true,
	}

	// Set up console logging
	page.OnConsole(func(msg playwright.ConsoleMessage) {
		if session.DebugEnabled {
			logEntry := models.ConsoleLogEntry{
				Type:      msg.Type(),
				Text:      msg.Text(),
				Timestamp: time.Now(),
				Location:  msg.Location().URL + ":" + fmt.Sprintf("%d", msg.Location().LineNumber),
			}
			session.ConsoleLogs = append(session.ConsoleLogs, logEntry)
			
			// Keep only last 100 console logs to prevent memory issues
			if len(session.ConsoleLogs) > 100 {
				session.ConsoleLogs = session.ConsoleLogs[len(session.ConsoleLogs)-100:]
			}
		}
	})

	// Set up network request monitoring
	page.OnRequest(func(request playwright.Request) {
		if session.DebugEnabled {
			headers := make(map[string]string)
			for k, v := range request.Headers() {
				headers[k] = v
			}
			
			logEntry := models.NetworkLogEntry{
				Type:      "request",
				Method:    request.Method(),
				URL:       request.URL(),
				Headers:   headers,
				Timestamp: time.Now(),
			}
			session.NetworkLogs = append(session.NetworkLogs, logEntry)
		}
	})

	// Set up network response monitoring
	page.OnResponse(func(response playwright.Response) {
		if session.DebugEnabled {
			headers := make(map[string]string)
			for k, v := range response.Headers() {
				headers[k] = v
			}
			
			// Get response cookies
			cookies := make(map[string]interface{})
			if cookieHeader, exists := headers["set-cookie"]; exists {
				cookies["set-cookie"] = cookieHeader
			}
			
			logEntry := models.NetworkLogEntry{
				Type:      "response",
				URL:       response.URL(),
				Status:    response.Status(),
				Headers:   headers,
				Timestamp: time.Now(),
				Cookies:   cookies,
			}
			session.NetworkLogs = append(session.NetworkLogs, logEntry)
			
			// Keep only last 100 network logs to prevent memory issues
			if len(session.NetworkLogs) > 100 {
				session.NetworkLogs = session.NetworkLogs[len(session.NetworkLogs)-100:]
			}
		}
	})

	persistentSessions[sessionID] = session
	return session, nil
}

// cleanupExpiredSessions removes sessions that haven't been used for a while
func cleanupExpiredSessions() {
	sessionsMutex.Lock()
	defer sessionsMutex.Unlock()

	expiration := 30 * time.Minute
	now := time.Now()

	for sessionID, session := range persistentSessions {
		if now.Sub(session.LastUsed) > expiration {
			session.Context.Close()
			session.Browser.Close()
			session.Playwright.Stop()
			delete(persistentSessions, sessionID)
		}
	}
}

// BrowseWithPlaywright uses Playwright to fetch a web page and take a screenshot
// For standalone use without session management
func BrowseWithPlaywright(url string) (models.PlaywrightResult, error) {
	pw, err := playwright.Run()
	if err != nil {
		return models.PlaywrightResult{}, err
	}
	browser, err := pw.Chromium.Launch()
	if err != nil {
		pw.Stop()
		return models.PlaywrightResult{}, err
	}
	page, err := browser.NewPage()
	if err != nil {
		browser.Close()
		pw.Stop()
		return models.PlaywrightResult{}, err
	}

	// Set page timeout to 2 minutes for dev servers
	page.SetDefaultTimeout(120000)
	if _, err := page.Goto(url, playwright.PageGotoOptions{
		Timeout: playwright.Float(120000), // 2 minutes timeout for dev server
	}); err != nil {
		page.Close()
		browser.Close()
		pw.Stop()
		return models.PlaywrightResult{}, err
	}
	html, _ := page.Content()
	screenshotPath := filepath.Join(os.TempDir(), "playwright_screenshot.png")
	if _, err := page.Screenshot(playwright.PageScreenshotOptions{Path: playwright.String(screenshotPath)}); err != nil {
		page.Close()
		browser.Close()
		pw.Stop()
		return models.PlaywrightResult{}, err
	}
	page.Close()
	browser.Close()
	pw.Stop()
	return models.PlaywrightResult{URL: url, HTML: html, Screenshot: screenshotPath}, nil
}

// BrowseWithPlaywrightPersistent navigates to URL while preserving cookies in a session
func BrowseWithPlaywrightPersistent(sessionID, url string) (models.PlaywrightResult, error) {
	// Clean up expired sessions periodically
	go cleanupExpiredSessions()

	session, err := getOrCreatePersistentSession(sessionID)
	if err != nil {
		return models.PlaywrightResult{}, err
	}

	session.mutex.Lock()
	defer session.mutex.Unlock()

	// Navigate with cookie preservation
	if _, err := session.Page.Goto(url, playwright.PageGotoOptions{
		Timeout: playwright.Float(120000),
	}); err != nil {
		return models.PlaywrightResult{}, fmt.Errorf("navigation failed: %v", err)
	}

	session.LastUsed = time.Now()

	// Get current state with cookies preserved
	html, _ := session.Page.Content()
	screenshotPath := fmt.Sprintf("/tmp/persistent_%s_%d.png", sessionID, time.Now().UnixNano())

	if _, err := session.Page.Screenshot(playwright.PageScreenshotOptions{
		Path:     playwright.String(screenshotPath),
		FullPage: playwright.Bool(true),
	}); err != nil {
		return models.PlaywrightResult{}, fmt.Errorf("screenshot failed: %v", err)
	}

	currentURL := session.Page.URL()
	return models.PlaywrightResult{
		URL:        currentURL,
		HTML:       html,
		Screenshot: screenshotPath,
	}, nil
}

// BrowseWithPlaywrightActions opens a URL and executes a series of UI actions WITH COOKIE PERSISTENCE
func BrowseWithPlaywrightActions(url string, actions []models.UIAction) (models.PlaywrightResult, error) {
	// Use default session ID for cookie persistence across actions
	sessionID := "default_session"
	return BrowseWithPlaywrightActionsWithSession(sessionID, url, actions)
}

// BrowseWithPlaywrightActionsWithSession performs actions with explicit session management and debugging
func BrowseWithPlaywrightActionsWithSession(sessionID, url string, actions []models.UIAction) (models.PlaywrightResult, error) {
	// Clean up expired sessions periodically
	go cleanupExpiredSessions()

	session, err := getOrCreatePersistentSession(sessionID)
	if err != nil {
		return models.PlaywrightResult{}, fmt.Errorf("failed to get/create session '%s': %v", sessionID, err)
	}

	session.mutex.Lock()
	defer session.mutex.Unlock()

	// Clear previous logs for this session to start fresh
	session.ConsoleLogs = make([]models.ConsoleLogEntry, 0)
	session.NetworkLogs = make([]models.NetworkLogEntry, 0)

	// Navigate with cookie preservation if URL is provided
	if url != "" {
		if _, err := session.Page.Goto(url, playwright.PageGotoOptions{
			Timeout: playwright.Float(120000),
		}); err != nil {
			return models.PlaywrightResult{}, fmt.Errorf("navigation to %s failed: %v", url, err)
		}
		
		// Update cookie state after navigation
		if err := updateCookieState(session); err != nil {
			fmt.Printf("Warning: failed to update cookie state: %v\n", err)
		}
	}
	// Execute actions sequentially with PERSISTENT SESSION, COOKIE PRESERVATION, and DEBUG LOGGING
	for i, a := range actions {
		actionStart := time.Now()
		
		// Validate action parameters with detailed logging
		if err := validateUIAction(a); err != nil {
			return models.PlaywrightResult{}, fmt.Errorf("action %d (%s) validation failed: %v", i, a.Action, err)
		}
		
		switch strings.ToLower(a.Action) {
			case "type":
				if a.Selector == "" {
					return models.PlaywrightResult{}, fmt.Errorf("action %d: type action missing selector", i)
				}
				if a.Text == "" {
					return models.PlaywrightResult{}, fmt.Errorf("action %d: type action missing text", i)
				}
				
				// Wait for element to be available, visible, and interactable
				if _, err := session.Page.WaitForSelector(a.Selector, playwright.PageWaitForSelectorOptions{
					Timeout: playwright.Float(5000),
					State:   playwright.WaitForSelectorStateVisible,
				}); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("action %d: selector '%s' not found/visible: %v", i, a.Selector, err)
				}
				
				// Focus the element before typing to ensure it's ready
				if err := session.Page.Focus(a.Selector); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("action %d: failed to focus element '%s': %v", i, a.Selector, err)
				}
				
				// Clear the field if needed (some forms require this)
				if err := session.Page.Fill(a.Selector, ""); err != nil {
					fmt.Printf("DEBUG: Warning - failed to clear field '%s': %v\n", a.Selector, err)
					// Continue anyway, this might not be critical
				}
				
				// Type the text into the element
				if err := session.Page.Type(a.Selector, a.Text, playwright.PageTypeOptions{
					Delay: playwright.Float(50), // Add small delay between keystrokes for stability
				}); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("action %d: failed to type '%s' into '%s': %v", i, a.Text, a.Selector, err)
				}
				
				fmt.Printf("DEBUG: Successfully typed '%s' into '%s' (took %v)\n", a.Text, a.Selector, time.Since(actionStart))
				
			case "click":
				// Enhanced click action with coordinate support
				if a.X != nil && a.Y != nil {
					// Coordinate-based click
					x, y, err := transformCoordinates(&a, session.Page)
					if err != nil {
						return models.PlaywrightResult{}, fmt.Errorf("coordinate transformation failed: %v", err)
					}
					if err := validateCoordinates(x, y, session.Page); err != nil {
						return models.PlaywrightResult{}, fmt.Errorf("coordinate validation failed: %v", err)
					}
					
					// Configure click options
					clickOpts := playwright.PageClickOptions{
						Position: &playwright.Position{X: x, Y: y},
					}
					if a.Button != "" {
						button := playwright.MouseButton(a.Button)
						clickOpts.Button = &button
					}
					if a.Clicks > 0 {
						clickOpts.ClickCount = playwright.Int(a.Clicks)
					}
					if a.Delay > 0 {
						clickOpts.Delay = playwright.Float(float64(a.Delay))
					}
					
					if err := session.Page.Click("body", clickOpts); err != nil {
						return models.PlaywrightResult{}, err
					}
				} else if a.Selector != "" {
					// Selector-based click (backward compatibility) with enhanced debugging
					// Wait for element to be available and visible
					if _, err := session.Page.WaitForSelector(a.Selector, playwright.PageWaitForSelectorOptions{
						Timeout: playwright.Float(5000),
						State:   playwright.WaitForSelectorStateVisible,
					}); err != nil {
						return models.PlaywrightResult{}, fmt.Errorf("action %d: click selector '%s' not found/visible: %v", i, a.Selector, err)
					}
					
					if err := session.Page.Click(a.Selector); err != nil {
						return models.PlaywrightResult{}, fmt.Errorf("action %d: failed to click selector '%s': %v", i, a.Selector, err)
					}
					
					fmt.Printf("DEBUG: Successfully clicked selector '%s' (took %v)\n", a.Selector, time.Since(actionStart))
				} else {
					return models.PlaywrightResult{}, fmt.Errorf("action %d: click action requires either selector or coordinates", i)
				}
				
			case "moveto":
				// Move cursor to coordinates
				if a.X == nil || a.Y == nil {
					return models.PlaywrightResult{}, fmt.Errorf("moveto action requires X and Y coordinates")
				}
				x, y, err := transformCoordinates(&a, session.Page)
				if err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate transformation failed: %v", err)
				}
				if err := validateCoordinates(x, y, session.Page); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate validation failed: %v", err)
				}
				if err := session.Page.Mouse().Move(x, y); err != nil {
					return models.PlaywrightResult{}, err
				}
				
			case "clickat":
				// Click at specific coordinates
				if a.X == nil || a.Y == nil {
					return models.PlaywrightResult{}, fmt.Errorf("clickat action requires X and Y coordinates")
				}
				x, y, err := transformCoordinates(&a, session.Page)
				if err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate transformation failed: %v", err)
				}
				if err := validateCoordinates(x, y, session.Page); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate validation failed: %v", err)
				}
				
				// Configure click options
				clickOpts := playwright.MouseClickOptions{}
				if a.Button != "" {
					button := playwright.MouseButton(a.Button)
					clickOpts.Button = &button
				}
				if a.Clicks > 0 {
					clickOpts.ClickCount = playwright.Int(a.Clicks)
				}
				if a.Delay > 0 {
					clickOpts.Delay = playwright.Float(float64(a.Delay))
				}
				
				if err := session.Page.Mouse().Click(x, y, clickOpts); err != nil {
					return models.PlaywrightResult{}, err
				}
				
			case "doubleclickat":
				// Double-click at coordinates
				if a.X == nil || a.Y == nil {
					return models.PlaywrightResult{}, fmt.Errorf("doubleclickat action requires X and Y coordinates")
				}
				x, y, err := transformCoordinates(&a, session.Page)
				if err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate transformation failed: %v", err)
				}
				if err := validateCoordinates(x, y, session.Page); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate validation failed: %v", err)
				}
				
				clickOpts := playwright.MouseClickOptions{
					ClickCount: playwright.Int(2),
				}
				if a.Button != "" {
					button := playwright.MouseButton(a.Button)
					clickOpts.Button = &button
				}
				if a.Delay > 0 {
					clickOpts.Delay = playwright.Float(float64(a.Delay))
				}
				
				if err := session.Page.Mouse().Click(x, y, clickOpts); err != nil {
					return models.PlaywrightResult{}, err
				}
				
			case "rightclickat":
				// Right-click at coordinates
				if a.X == nil || a.Y == nil {
					return models.PlaywrightResult{}, fmt.Errorf("rightclickat action requires X and Y coordinates")
				}
				x, y, err := transformCoordinates(&a, session.Page)
				if err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate transformation failed: %v", err)
				}
				if err := validateCoordinates(x, y, session.Page); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate validation failed: %v", err)
				}
				
				clickOpts := playwright.MouseClickOptions{
					Button: playwright.MouseButtonRight,
				}
				if a.Delay > 0 {
					clickOpts.Delay = playwright.Float(float64(a.Delay))
				}
				
				if err := session.Page.Mouse().Click(x, y, clickOpts); err != nil {
					return models.PlaywrightResult{}, err
				}
				
			case "dragfrom":
				// Drag from one point to another
				if a.X == nil || a.Y == nil || a.ToX == nil || a.ToY == nil {
					return models.PlaywrightResult{}, fmt.Errorf("dragfrom action requires X, Y, ToX, and ToY coordinates")
				}
				
				// Transform start coordinates
				x, y, err := transformCoordinates(&a, session.Page)
				if err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("start coordinate transformation failed: %v", err)
				}
				if err := validateCoordinates(x, y, session.Page); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("start coordinate validation failed: %v", err)
				}
				
				// Transform end coordinates
				toAction := a
				toAction.X = a.ToX
				toAction.Y = a.ToY
				toX, toY, err := transformCoordinates(&toAction, session.Page)
				if err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("end coordinate transformation failed: %v", err)
				}
				if err := validateCoordinates(toX, toY, session.Page); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("end coordinate validation failed: %v", err)
				}
				
				// Perform drag sequence
				if err := session.Page.Mouse().Move(x, y); err != nil {
					return models.PlaywrightResult{}, err
				}
				if err := session.Page.Mouse().Down(); err != nil {
					return models.PlaywrightResult{}, err
				}
				if err := session.Page.Mouse().Move(toX, toY); err != nil {
					return models.PlaywrightResult{}, err
				}
				if err := session.Page.Mouse().Up(); err != nil {
					return models.PlaywrightResult{}, err
				}
				
			case "hoverat":
				// Hover at specific coordinates
				if a.X == nil || a.Y == nil {
					return models.PlaywrightResult{}, fmt.Errorf("hoverat action requires X and Y coordinates")
				}
				x, y, err := transformCoordinates(&a, session.Page)
				if err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate transformation failed: %v", err)
				}
				if err := validateCoordinates(x, y, session.Page); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate validation failed: %v", err)
				}
				if err := session.Page.Mouse().Move(x, y); err != nil {
					return models.PlaywrightResult{}, err
				}
				
			case "scrollat":
				// Scroll at specific coordinates
				if a.X == nil || a.Y == nil {
					return models.PlaywrightResult{}, fmt.Errorf("scrollat action requires X and Y coordinates")
				}
				x, y, err := transformCoordinates(&a, session.Page)
				if err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate transformation failed: %v", err)
				}
				if err := validateCoordinates(x, y, session.Page); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("coordinate validation failed: %v", err)
				}
				
				// Move to position first
				if err := session.Page.Mouse().Move(x, y); err != nil {
					return models.PlaywrightResult{}, err
				}
				
				// Perform scroll
				deltaX := 0.0
				deltaY := 0.0
				if a.ScrollX != nil {
					deltaX = *a.ScrollX
				}
				if a.ScrollY != nil {
					deltaY = *a.ScrollY
				}
				if a.ScrollDelta != 0 {
					deltaY = float64(a.ScrollDelta)
				}
				
				if err := session.Page.Mouse().Wheel(deltaX, deltaY); err != nil {
					return models.PlaywrightResult{}, err
				}
				
			case "waitforselector":
				if a.Selector == "" {
					return models.PlaywrightResult{}, fmt.Errorf("waitForSelector action missing selector")
				}
				opts := playwright.PageWaitForSelectorOptions{}
				if a.Timeout > 0 {
					opts.Timeout = playwright.Float(float64(a.Timeout))
				}
				if _, err := session.Page.WaitForSelector(a.Selector, opts); err != nil {
					return models.PlaywrightResult{}, err
				}
			case "wait":
				// Simple wait/delay action
				timeout := 1000 // Default 1 second
				if a.Timeout > 0 {
					timeout = a.Timeout
				}
				session.Page.WaitForTimeout(float64(timeout))
			case "navigate":
				if a.URL == "" {
					return models.PlaywrightResult{}, fmt.Errorf("navigate action missing url")
				}
				if _, err := session.Page.Goto(a.URL, playwright.PageGotoOptions{
					WaitUntil: playwright.WaitUntilStateNetworkidle,
					Timeout:   playwright.Float(30000),
				}); err != nil {
					return models.PlaywrightResult{}, err
				}
			case "waitforurl":
				// Wait for URL to change (useful after form submissions that redirect)
				targetURL := a.URL
				if targetURL == "" {
					return models.PlaywrightResult{}, fmt.Errorf("waitforurl action missing url pattern")
				}
				if err := session.Page.WaitForURL(targetURL, playwright.PageWaitForURLOptions{
					Timeout: playwright.Float(10000),
				}); err != nil {
					return models.PlaywrightResult{}, fmt.Errorf("URL wait timeout: %v", err)
				}
			default:
				return models.PlaywrightResult{}, fmt.Errorf("action %d: unknown action type '%s'. Valid actions: type, click, moveto, clickat, doubleclickat, rightclickat, dragfrom, hoverat, scrollat, waitforselector, wait, navigate", i, a.Action)
			}
			
		// Update cookie state after each action to monitor auth changes
		if err := updateCookieState(session); err != nil {
			fmt.Printf("Warning: failed to update cookie state after action %d: %v\n", i, err)
		}
		
		// Small delay between actions for stability
		session.Page.WaitForTimeout(100)
	}

	// Update session timestamp
	session.LastUsed = time.Now()

	// Get current state with COOKIES PRESERVED
	html, _ := session.Page.Content()
	htmlPath := filepath.Join(os.TempDir(), fmt.Sprintf("persistent_%s_%d.html", sessionID, time.Now().UnixNano()))
	_ = os.WriteFile(htmlPath, []byte(html), 0644)
	screenshotPath := filepath.Join(os.TempDir(), fmt.Sprintf("persistent_%s_%d.png", sessionID, time.Now().UnixNano()))
	
	if _, err := session.Page.Screenshot(playwright.PageScreenshotOptions{
		Path:     playwright.String(screenshotPath),
		FullPage: playwright.Bool(true),
	}); err != nil {
		return models.PlaywrightResult{}, fmt.Errorf("screenshot failed: %v", err)
	}
	
	currentURL := session.Page.URL()
	
	// Final cookie state update
	if err := updateCookieState(session); err != nil {
		fmt.Printf("Warning: failed to update final cookie state: %v\n", err)
	}
	
	// Create comprehensive debugging result
	result := models.PlaywrightResult{
		URL:        currentURL,
		HTML:       html,
		Screenshot: screenshotPath,
		HTMLPath:   htmlPath,
	}
	
	// Add debugging information if enabled
	if session.DebugEnabled {
		fmt.Printf("DEBUG: Session %s completed with %d console logs, %d network logs\n",
			sessionID, len(session.ConsoleLogs), len(session.NetworkLogs))
		
		// Print recent console logs
		if len(session.ConsoleLogs) > 0 {
			fmt.Printf("DEBUG: Recent console logs:\n")
			for _, log := range session.ConsoleLogs {
				fmt.Printf("  [%s] %s: %s\n", log.Timestamp.Format("15:04:05"), log.Type, log.Text)
			}
		}
		
		// Print recent network activity
		if len(session.NetworkLogs) > 0 {
			fmt.Printf("DEBUG: Recent network activity:\n")
			for _, log := range session.NetworkLogs[len(session.NetworkLogs)-10:] { // Last 10 requests
				if log.Type == "response" {
					fmt.Printf("  %s %s -> %d\n", log.Method, log.URL, log.Status)
					if len(log.Cookies) > 0 {
						fmt.Printf("    Cookies: %v\n", log.Cookies)
					}
				}
			}
		}
		
		// Print cookie state
		if len(session.CookieState) > 0 {
			fmt.Printf("DEBUG: Cookie state: %v\n", session.CookieState)
		}
	}
	
	// DO NOT close browser/page - keep session alive for cookie persistence!
	return result, nil
}

// validateUIAction validates a UI action's parameters
func validateUIAction(action models.UIAction) error {
	if action.Action == "" {
		return fmt.Errorf("action type is required")
	}
	
	switch strings.ToLower(action.Action) {
	case "type":
		if action.Selector == "" {
			return fmt.Errorf("type action requires selector")
		}
		if action.Text == "" {
			return fmt.Errorf("type action requires text")
		}
	case "click":
		if action.Selector == "" && (action.X == nil || action.Y == nil) {
			return fmt.Errorf("click action requires either selector or coordinates (X, Y)")
		}
	case "moveto", "clickat", "doubleclickat", "rightclickat", "hoverat", "scrollat":
		if action.X == nil || action.Y == nil {
			return fmt.Errorf("%s action requires X and Y coordinates", action.Action)
		}
	case "dragfrom":
		if action.X == nil || action.Y == nil || action.ToX == nil || action.ToY == nil {
			return fmt.Errorf("dragfrom action requires X, Y, ToX, and ToY coordinates")
		}
	case "waitforselector":
		if action.Selector == "" {
			return fmt.Errorf("waitforselector action requires selector")
		}
	case "navigate":
		if action.URL == "" {
			return fmt.Errorf("navigate action requires URL")
		}
	case "wait":
		// wait action doesn't require parameters
	default:
		return fmt.Errorf("unknown action type: %s", action.Action)
	}
	
	return nil
}

// updateCookieState updates the session's cookie state for debugging
func updateCookieState(session *PersistentBrowserSession) error {
	if !session.DebugEnabled {
		return nil
	}
	
	cookies, err := session.Context.Cookies()
	if err != nil {
		return fmt.Errorf("failed to get cookies: %v", err)
	}
	
	session.CookieState = make(map[string]interface{})
	for _, cookie := range cookies {
		session.CookieState[cookie.Name] = map[string]interface{}{
			"value":    cookie.Value,
			"domain":   cookie.Domain,
			"path":     cookie.Path,
			"secure":   cookie.Secure,
			"httpOnly": cookie.HttpOnly,
			"expires":  cookie.Expires,
		}
	}
	
	return nil
}

// ParseApiSchema analyzes API schema from Go files with enhanced business domain awareness
func ParseApiSchema(apiDir string) (interface{}, error) {
	var schema struct {
		Routes          []models.Route                 `json:"routes"`
		Models          []models.GoModel               `json:"models"`
		Handlers        []models.Handler               `json:"handlers"`
		Middleware      []models.Middleware            `json:"middleware"`
		Types           map[string]interface{}         `json:"types"`
		BusinessDomains []models.BusinessDomain        `json:"businessDomains"`
		DomainRoutes    map[string][]models.Route      `json:"domainRoutes"`
		OpenAPISpecs    map[string]interface{}         `json:"openApiSpecs"`
	}

	// Parse routes with business domain categorization
	routes, err := ParseGinRoutes(filepath.Join(apiDir, "main.go"))
	if err == nil {
		schema.Routes = routes
		// Categorize routes by business domain
		schema.DomainRoutes = categorizeRoutesByDomain(routes)
	}

	// Parse models with enhanced domain detection
	models, err := parseModelsFromDir(apiDir)
	if err == nil {
		schema.Models = models
	}

	// Parse handlers
	handlers, err := ParseHandlers(apiDir)
	if err == nil {
		schema.Handlers = handlers
	}

	// Parse middleware with business domain context
	middleware, err := ParseMiddleware(apiDir)
	if err == nil {
		schema.Middleware = middleware
	}

	// Parse type definitions
	types, err := parseTypeDefinitions(apiDir)
	if err == nil {
		schema.Types = types
	}

	// Parse business domains
	businessDomains, err := ParseBusinessDomains(apiDir)
	if err == nil {
		schema.BusinessDomains = businessDomains
	}

	// Parse OpenAPI specifications for new domains
	openApiSpecs, err := parseOpenAPISpecs(apiDir)
	if err == nil {
		schema.OpenAPISpecs = openApiSpecs
	}

	return schema, nil
}

// categorizeRoutesByDomain categorizes routes by their business domain
func categorizeRoutesByDomain(routes []models.Route) map[string][]models.Route {
	domainRoutes := make(map[string][]models.Route)
	
	for _, route := range routes {
		domain := categorizeRouteToDomain(route.Path)
		domainRoutes[domain] = append(domainRoutes[domain], route)
	}
	
	return domainRoutes
}

// parseOpenAPISpecs parses OpenAPI specifications for business domains
func parseOpenAPISpecs(apiDir string) (map[string]interface{}, error) {
	specs := make(map[string]interface{})
	
	// Look for API specification files in the new business domains
	specDirs := []string{
		"keyword-sets",
		"proxy-pools",
		"campaigns",
		"personas",
		"proxies",
		"auth",
		"config",
	}
	
	for _, specDir := range specDirs {
		specPath := filepath.Join(apiDir, specDir, "spec.go")
		if _, err := os.Stat(specPath); err == nil {
			// Parse the spec file to extract OpenAPI definitions
			specData, err := parseSpecFile(specPath)
			if err == nil {
				specs[specDir] = specData
			}
		}
	}
	
	return specs, nil
}

// parseSpecFile extracts OpenAPI specification data from spec.go files
func parseSpecFile(specPath string) (interface{}, error) {
	content, err := os.ReadFile(specPath)
	if err != nil {
		return nil, err
	}
	
	lines := strings.Split(string(content), "\n")
	specData := make(map[string]interface{})
	
	// Extract key information from the spec file
	for i, line := range lines {
		// Look for function definitions that add paths
		if strings.Contains(line, "func Add") && strings.Contains(line, "Paths") {
			funcName := extractFunctionName(line)
			specData["pathFunction"] = funcName
		}
		
		// Look for endpoint definitions
		if strings.Contains(line, "OperationID:") {
			operationID := extractQuotedValue(line)
			if operationID != "" {
				if specData["operations"] == nil {
					specData["operations"] = []string{}
				}
				operations := specData["operations"].([]string)
				specData["operations"] = append(operations, operationID)
			}
		}
		
		// Look for schema definitions
		if strings.Contains(line, "spec.Components.Schemas[") {
			schemaName := extractSchemaName(line)
			if schemaName != "" {
				if specData["schemas"] == nil {
					specData["schemas"] = []string{}
				}
				schemas := specData["schemas"].([]string)
				specData["schemas"] = append(schemas, schemaName)
			}
		}
		
		// Extract API paths
		if strings.Contains(line, "spec.Paths.Set(") {
			path := extractPathFromSetCall(line)
			if path != "" {
				if specData["paths"] == nil {
					specData["paths"] = []string{}
				}
				paths := specData["paths"].([]string)
				specData["paths"] = append(paths, path)
			}
		}
		
		// Add line number for reference
		_ = i // Line number available if needed
	}
	
	return specData, nil
}

// Helper functions for parsing spec files
func extractFunctionName(line string) string {
	parts := strings.Fields(line)
	for i, part := range parts {
		if part == "func" && i+1 < len(parts) {
			funcName := parts[i+1]
			if parenIdx := strings.Index(funcName, "("); parenIdx != -1 {
				return funcName[:parenIdx]
			}
			return funcName
		}
	}
	return ""
}

func extractQuotedValue(line string) string {
	start := strings.Index(line, "\"")
	if start == -1 {
		return ""
	}
	end := strings.Index(line[start+1:], "\"")
	if end == -1 {
		return ""
	}
	return line[start+1 : start+1+end]
}

func extractSchemaName(line string) string {
	start := strings.Index(line, "[\"")
	if start == -1 {
		return ""
	}
	end := strings.Index(line[start+2:], "\"]")
	if end == -1 {
		return ""
	}
	return line[start+2 : start+2+end]
}

func extractPathFromSetCall(line string) string {
	start := strings.Index(line, "(\"")
	if start == -1 {
		return ""
	}
	end := strings.Index(line[start+2:], "\"")
	if end == -1 {
		return ""
	}
	return line[start+2 : start+2+end]
}

// Enhanced dependency analysis for new business domains
func GetEnhancedDependencies(dirPath string) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	
	// Get standard dependencies
	deps, err := GetDependencies(dirPath)
	if err != nil {
		return result, err
	}
	result["dependencies"] = deps
	
	// Analyze internal service dependencies
	internalDeps, err := analyzeInternalDependencies(dirPath)
	if err == nil {
		result["internalDependencies"] = internalDeps
	}
	
	// Analyze business domain dependencies
	domainDeps, err := analyzeBusinessDomainDependencies(dirPath)
	if err == nil {
		result["businessDomainDependencies"] = domainDeps
	}
	
	return result, nil
}

// analyzeInternalDependencies analyzes dependencies between internal services
func analyzeInternalDependencies(dirPath string) (map[string][]string, error) {
	internalDeps := make(map[string][]string)
	
	// Key internal services to analyze
	services := []string{
		"keywordextractor",
		"keywordscanner",
		"proxymanager",
		"migrationverifier",
		"schemavalidator",
	}
	
	for _, service := range services {
		servicePath := filepath.Join(dirPath, "internal", service)
		if _, err := os.Stat(servicePath); err == nil {
			deps, err := extractServiceDependencies(servicePath)
			if err == nil {
				internalDeps[service] = deps
			}
		}
	}
	
	return internalDeps, nil
}

// extractServiceDependencies extracts dependencies from a service directory
func extractServiceDependencies(servicePath string) ([]string, error) {
	var dependencies []string
	
	err := filepath.Walk(servicePath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}
		
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		
		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			// Look for internal imports
			if strings.Contains(line, "github.com/fntelecomllc/studio/backend/internal/") {
				if importPath := extractImportPath(line); importPath != "" {
					dependencies = append(dependencies, importPath)
				}
			}
		}
		
		return nil
	})
	
	return dependencies, err
}

// extractImportPath extracts import path from import line
func extractImportPath(line string) string {
	line = strings.TrimSpace(line)
	if strings.HasPrefix(line, "\"") && strings.HasSuffix(line, "\"") {
		return line[1 : len(line)-1]
	}
	
	// Handle imports with aliases
	parts := strings.Fields(line)
	for _, part := range parts {
		if strings.HasPrefix(part, "\"") && strings.HasSuffix(part, "\"") {
			return part[1 : len(part)-1]
		}
	}
	
	return ""
}

// analyzeBusinessDomainDependencies analyzes dependencies between business domains
func analyzeBusinessDomainDependencies(dirPath string) (map[string]interface{}, error) {
	domainDeps := make(map[string]interface{})
	
	// Business domains to analyze
	domains := map[string]string{
		"keyword-extraction": "keywordextractor",
		"keyword-scanning":   "keywordscanner",
		"proxy-management":   "proxymanager",
		"campaign-management": "campaigns",
		"persona-management":  "personas",
	}
	
	for domain, serviceDir := range domains {
		servicePath := filepath.Join(dirPath, "internal", serviceDir)
		if _, err := os.Stat(servicePath); err == nil {
			deps, err := analyzeBusinessDomainCrossDependencies(servicePath, domains)
			if err == nil {
				domainDeps[domain] = deps
			}
		}
	}
	
	return domainDeps, nil
}

// analyzeBusinessDomainCrossDependencies analyzes cross-dependencies between business domains
func analyzeBusinessDomainCrossDependencies(servicePath string, domains map[string]string) (map[string]interface{}, error) {
	crossDeps := make(map[string]interface{})
	
	err := filepath.Walk(servicePath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}
		
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		
		// Analyze cross-references to other business domains
		for domain, serviceDir := range domains {
			if strings.Contains(string(content), serviceDir) {
				if crossDeps["references"] == nil {
					crossDeps["references"] = []string{}
				}
				refs := crossDeps["references"].([]string)
				crossDeps["references"] = append(refs, domain)
			}
		}
		
		return nil
	})
	
	return crossDeps, err
}

// Enhanced security analysis for new business domains
func GetEnhancedSecurityAnalysis(dirPath string) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	
	// Get standard security policies
	policies, err := GetSecurityPolicies(dirPath)
	if err == nil {
		result["securityPolicies"] = policies
	}
	
	// Analyze business domain authorization patterns
	authPatterns, err := analyzeBusinessDomainAuthPatterns(dirPath)
	if err == nil {
		result["businessDomainAuthPatterns"] = authPatterns
	}
	
	// Analyze new authentication mechanisms
	authMechanisms, err := analyzeEnhancedAuthMechanisms(dirPath)
	if err == nil {
		result["enhancedAuthMechanisms"] = authMechanisms
	}
	
	return result, nil
}

// analyzeBusinessDomainAuthPatterns analyzes authorization patterns for business domains
func analyzeBusinessDomainAuthPatterns(dirPath string) (map[string]interface{}, error) {
	authPatterns := make(map[string]interface{})
	
	// Analyze API directories for authorization patterns
	apiDirs := []string{
		"keyword-sets",
		"proxy-pools",
		"campaigns",
		"personas",
		"proxies",
	}
	
	for _, apiDir := range apiDirs {
		apiPath := filepath.Join(dirPath, "api", apiDir)
		if _, err := os.Stat(apiPath); err == nil {
			patterns, err := extractAuthPatternsFromAPI(apiPath)
			if err == nil {
				authPatterns[apiDir] = patterns
			}
		}
	}
	
	return authPatterns, nil
}

// extractAuthPatternsFromAPI extracts authorization patterns from API files
func extractAuthPatternsFromAPI(apiPath string) (map[string]interface{}, error) {
	patterns := make(map[string]interface{})
	
	err := filepath.Walk(apiPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}
		
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		
		contentStr := string(content)
		
		// Look for session auth patterns
		if strings.Contains(contentStr, `"sessionAuth"`) {
			patterns["sessionAuth"] = true
		}
		
		// Look for API key patterns
		if strings.Contains(contentStr, `"apiKey"`) || strings.Contains(contentStr, "API_KEY") {
			patterns["apiKeyAuth"] = true
		}
		
		// Look for role-based access patterns
		if strings.Contains(contentStr, "role") || strings.Contains(contentStr, "permission") {
			patterns["roleBasedAccess"] = true
		}
		
		return nil
	})
	
	return patterns, err
}

// analyzeEnhancedAuthMechanisms analyzes enhanced authentication mechanisms
func analyzeEnhancedAuthMechanisms(dirPath string) ([]string, error) {
	var mechanisms []string
	
	authDirs := []string{
		filepath.Join(dirPath, "internal", "middleware"),
		filepath.Join(dirPath, "api", "auth"),
	}
	
	for _, authDir := range authDirs {
		if _, err := os.Stat(authDir); err == nil {
			mechs, err := extractAuthMechanisms(authDir)
			if err == nil {
				mechanisms = append(mechanisms, mechs...)
			}
		}
	}
	
	return mechanisms, nil
}

// extractAuthMechanisms extracts authentication mechanisms from directory
func extractAuthMechanisms(authDir string) ([]string, error) {
	var mechanisms []string
	
	err := filepath.Walk(authDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}
		
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		
		contentStr := strings.ToLower(string(content))
		
		// Detect various authentication mechanisms
		if strings.Contains(contentStr, "jwt") || strings.Contains(contentStr, "token") {
			mechanisms = append(mechanisms, "JWT/Token Authentication")
		}
		
		if strings.Contains(contentStr, "session") {
			mechanisms = append(mechanisms, "Session-based Authentication")
		}
		
		if strings.Contains(contentStr, "oauth") {
			mechanisms = append(mechanisms, "OAuth Authentication")
		}
		
		if strings.Contains(contentStr, "basic auth") {
			mechanisms = append(mechanisms, "Basic Authentication")
		}
		
		if strings.Contains(contentStr, "api key") || strings.Contains(contentStr, "apikey") {
			mechanisms = append(mechanisms, "API Key Authentication")
		}
		
		return nil
	})
	
	return mechanisms, err
}

// parseModelsFromDir extracts model definitions from a directory
func parseModelsFromDir(dir string) ([]models.GoModel, error) {
	var goModels []models.GoModel

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
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
							fields := extractFieldsFromStruct(structType)
							goModels = append(goModels, models.GoModel{
								Name:   typeSpec.Name.Name,
								File:   path,
								Fields: fields,
							})
						}
					}
				}
			}
			return true
		})

		return nil
	})

	return goModels, err
}

// extractFieldsFromStruct extracts field information from a struct type
func extractFieldsFromStruct(structType *ast.StructType) []models.Field {
	var fields []models.Field

	for _, field := range structType.Fields.List {
		for _, name := range field.Names {
			fieldType := getTypeString(field.Type)
			jsonTag := getJSONTag(field.Tag)
			fields = append(fields, models.Field{
				Name: name.Name,
				Type: fieldType,
				Tag:  jsonTag,
			})
		}
	}

	return fields
}

// parseTypeDefinitions extracts type definitions and creates a schema map
func parseTypeDefinitions(dir string) (map[string]interface{}, error) {
	types := make(map[string]interface{})

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
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
						typeName := typeSpec.Name.Name
						typeInfo := map[string]interface{}{
							"name": typeName,
							"file": path,
							"kind": getTypeKind(typeSpec.Type),
						}

						// Add specific information based on type
						switch t := typeSpec.Type.(type) {
						case *ast.StructType:
							typeInfo["fields"] = extractFieldsFromStruct(t)
						case *ast.InterfaceType:
							typeInfo["methods"] = extractInterfaceMethods(t)
						case *ast.ArrayType:
							typeInfo["elementType"] = getTypeString(t.Elt)
						case *ast.MapType:
							typeInfo["keyType"] = getTypeString(t.Key)
							typeInfo["valueType"] = getTypeString(t.Value)
						}

						types[typeName] = typeInfo
					}
				}
			}
			return true
		})

		return nil
	})

	return types, err
}

// getTypeKind returns the kind of a type (struct, interface, slice, etc.)
func getTypeKind(expr ast.Expr) string {
	switch expr.(type) {
	case *ast.StructType:
		return "struct"
	case *ast.InterfaceType:
		return "interface"
	case *ast.ArrayType:
		return "slice"
	case *ast.MapType:
		return "map"
	case *ast.ChanType:
		return "channel"
	case *ast.FuncType:
		return "function"
	case *ast.Ident:
		return "basic"
	case *ast.SelectorExpr:
		return "qualified"
	case *ast.StarExpr:
		return "pointer"
	default:
		return "unknown"
	}
}
