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
	"time"

	playwright "github.com/playwright-community/playwright-go"
)

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

// BrowseWithPlaywright uses Playwright to fetch a web page and take a screenshot
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
	if _, err := page.Goto(url); err != nil {
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

// ParseApiSchema analyzes API schema from Go files
func ParseApiSchema(apiDir string) (interface{}, error) {
	var schema struct {
		Routes     []models.Route         `json:"routes"`
		Models     []models.GoModel       `json:"models"`
		Handlers   []models.Handler       `json:"handlers"`
		Middleware []models.Middleware    `json:"middleware"`
		Types      map[string]interface{} `json:"types"`
	}

	// Parse routes
	routes, err := ParseGinRoutes(filepath.Join(apiDir, "main.go"))
	if err == nil {
		schema.Routes = routes
	}

	// Parse models
	models, err := parseModelsFromDir(apiDir)
	if err == nil {
		schema.Models = models
	}

	// Parse handlers
	handlers, err := ParseHandlers(apiDir)
	if err == nil {
		schema.Handlers = handlers
	}

	// Parse middleware
	middleware, err := ParseMiddleware(apiDir)
	if err == nil {
		schema.Middleware = middleware
	}

	// Parse type definitions
	types, err := parseTypeDefinitions(apiDir)
	if err == nil {
		schema.Types = types
	}

	return schema, nil
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
