package analyzer

import (
	"encoding/json"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"mcp/internal/models"
)

// GetFrontendRoutes scans the src/app directory for Next.js routes with enhanced business domain detection
func GetFrontendRoutes(root string) ([]models.FrontendRoute, error) {
	var routes []models.FrontendRoute
	appDir := filepath.Join(root, "src", "app")
	
	_ = filepath.WalkDir(appDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		
		// Handle API routes (route.ts files)
		if !d.IsDir() && (strings.HasSuffix(path, "route.ts") || strings.HasSuffix(path, "route.js")) {
			rel := strings.TrimPrefix(strings.TrimPrefix(filepath.Dir(path), appDir), string(filepath.Separator))
			route := "/api/" + strings.ReplaceAll(rel, string(filepath.Separator), "/")
			route = strings.ReplaceAll(route, "[", ":")
			route = strings.ReplaceAll(route, "]", "")
			if strings.HasSuffix(route, "/api/") {
				route = strings.TrimSuffix(route, "/")
			}
			routes = append(routes, models.FrontendRoute{Path: route, File: path})
			return nil
		}
		
		// Handle page routes
		if !d.IsDir() {
			return nil
		}
		
		pageFile := ""
		for _, name := range []string{"page.tsx", "page.jsx", "page.ts", "page.js"} {
			p := filepath.Join(path, name)
			if _, err := os.Stat(p); err == nil {
				pageFile = p
				break
			}
		}
		
		if pageFile != "" {
			rel := strings.TrimPrefix(strings.TrimPrefix(path, appDir), string(filepath.Separator))
			route := "/" + strings.ReplaceAll(rel, string(filepath.Separator), "/")
			
			// Enhanced dynamic route detection for [id] patterns
			route = strings.ReplaceAll(route, "[", ":")
			route = strings.ReplaceAll(route, "]", "")
			
			if route == "//" {
				route = "/"
			}
			
			// Clean up double slashes
			route = strings.ReplaceAll(route, "//", "/")
			
			routes = append(routes, models.FrontendRoute{Path: route, File: pageFile})
		}
		return nil
	})
	
	return routes, nil
}

// GetComponentTree builds a sophisticated component import tree reflecting mature shadcn/ui implementation
func GetComponentTree(root string) ([]models.ComponentTreeNode, error) {
	var nodes []models.ComponentTreeNode
	componentDir := filepath.Join(root, "src", "components")
	componentMap := map[string]*models.ComponentTreeNode{}
	
	// Enhanced component discovery including business domain directories
	filepath.WalkDir(componentDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !(strings.HasSuffix(path, ".tsx") || strings.HasSuffix(path, ".jsx")) {
			return nil
		}
		
		name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
		
		// Extract domain context from path for better categorization
		relPath := strings.TrimPrefix(path, componentDir)
		parts := strings.Split(strings.Trim(relPath, string(filepath.Separator)), string(filepath.Separator))
		domain := ""
		if len(parts) > 1 {
			domain = parts[0] // e.g., "proxyPools", "ui", "auth", etc.
		}
		
		node := &models.ComponentTreeNode{
			Name: name,
			File: path,
		}
		
		// Add domain context as metadata in the name for sophisticated components
		if domain != "" && domain != "shared" {
			node.Name = domain + "/" + name
		}
		
		componentMap[path] = node
		nodes = append(nodes, *node)
		return nil
	})
	
	// Enhanced import analysis with better pattern matching
	importRegex := regexp.MustCompile(`(?m)^import\s+(?:[^"']*\s+from\s+)?["']([^"']+)["']`)
	componentRefRegex := regexp.MustCompile(`(?m)<([A-Z][A-Za-z0-9]*)[^>]*>`)
	
	for i := range nodes {
		data, err := os.ReadFile(nodes[i].File)
		if err != nil {
			continue
		}
		
		content := string(data)
		
		// Analyze imports
		matches := importRegex.FindAllStringSubmatch(content, -1)
		for _, m := range matches {
			imp := m[1]
			
			// Handle relative imports
			if strings.HasPrefix(imp, ".") {
				impPath := filepath.Join(filepath.Dir(nodes[i].File), imp)
				if f, err := filepath.Abs(impPath); err == nil {
					for p := range componentMap {
						if strings.HasPrefix(f, strings.TrimSuffix(p, filepath.Ext(p))) {
							nodes[i].Children = append(nodes[i].Children, componentMap[p].Name)
						}
					}
				}
			}
			
			// Handle shadcn/ui imports and other internal component references
			if strings.HasPrefix(imp, "@/components/") || strings.HasPrefix(imp, "~/components/") {
				// Extract component name from import path
				pathParts := strings.Split(imp, "/")
				if len(pathParts) > 0 {
					componentName := pathParts[len(pathParts)-1]
					nodes[i].Children = append(nodes[i].Children, "ui/"+componentName)
				}
			}
		}
		
		// Analyze component usage in JSX
		componentMatches := componentRefRegex.FindAllStringSubmatch(content, -1)
		for _, m := range componentMatches {
			componentName := m[1]
			// Add reference if it's likely a custom component (starts with uppercase)
			if componentName != "React" && componentName != "Fragment" {
				nodes[i].Children = append(nodes[i].Children, componentName)
			}
		}
		
		// Remove duplicates
		seen := make(map[string]bool)
		var uniqueChildren []string
		for _, child := range nodes[i].Children {
			if !seen[child] {
				seen[child] = true
				uniqueChildren = append(uniqueChildren, child)
			}
		}
		nodes[i].Children = uniqueChildren
	}
	
	return nodes, nil
}

// GetComponentPropsAndEvents extracts prop names and event handlers from sophisticated business domain components
func GetComponentPropsAndEvents(root string) ([]models.ComponentPropsAndEvents, error) {
	var result []models.ComponentPropsAndEvents
	componentDir := filepath.Join(root, "src", "components")
	
	// Enhanced regex patterns for modern TypeScript React patterns
	propRegex := regexp.MustCompile(`(?s)interface\s+(\w+Props)\s+{([^}]*)}`)
	typePropsRegex := regexp.MustCompile(`(?s)type\s+(\w+Props)\s+=\s+{([^}]*)}`)
	eventRegex := regexp.MustCompile(`(?m)\b(on[A-Z][A-Za-z0-9]+)\b`)
	handleRegex := regexp.MustCompile(`(?m)(?:function\s+|const\s+|let\s+|var\s+)(handle[A-Z][A-Za-z0-9]+)`)
	asyncHandleRegex := regexp.MustCompile(`(?m)(?:async\s+function\s+|const\s+|let\s+|var\s+)(handle[A-Z][A-Za-z0-9]+)`)
	
	// Patterns for WebSocket and error boundary handlers
	wsEventRegex := regexp.MustCompile(`(?m)\b(onWebSocket[A-Z][A-Za-z0-9]+)\b`)
	errorBoundaryRegex := regexp.MustCompile(`(?m)\b(onError|componentDidCatch|getDerivedStateFromError)\b`)
	
	filepath.WalkDir(componentDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !(strings.HasSuffix(path, ".tsx") || strings.HasSuffix(path, ".jsx")) {
			return nil
		}
		
		data, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		
		content := string(data)
		componentName := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
		
		// Add domain context for business components
		relPath := strings.TrimPrefix(path, componentDir)
		parts := strings.Split(strings.Trim(relPath, string(filepath.Separator)), string(filepath.Separator))
		if len(parts) > 1 {
			domain := parts[0]
			componentName = domain + "/" + componentName
		}
		
		cp := models.ComponentPropsAndEvents{
			Component: componentName,
			File:      path,
		}
		
		// Extract props from interface definitions
		if m := propRegex.FindStringSubmatch(content); len(m) > 2 {
			fields := strings.Split(m[2], "\n")
			for _, f := range fields {
				parts := strings.Fields(strings.TrimSpace(f))
				if len(parts) >= 1 {
					name := strings.TrimSuffix(strings.TrimSpace(parts[0]), ":")
					name = strings.TrimSuffix(name, "?") // Handle optional props
					if name != "" && name != "//" && !strings.HasPrefix(name, "//") {
						cp.Props = append(cp.Props, name)
					}
				}
			}
		}
		
		// Extract props from type definitions
		if m := typePropsRegex.FindStringSubmatch(content); len(m) > 2 {
			fields := strings.Split(m[2], "\n")
			for _, f := range fields {
				parts := strings.Fields(strings.TrimSpace(f))
				if len(parts) >= 1 {
					name := strings.TrimSuffix(strings.TrimSpace(parts[0]), ":")
					name = strings.TrimSuffix(name, "?") // Handle optional props
					if name != "" && name != "//" && !strings.HasPrefix(name, "//") {
						cp.Props = append(cp.Props, name)
					}
				}
			}
		}
		
		// Extract standard event handlers
		events := eventRegex.FindAllStringSubmatch(content, -1)
		for _, e := range events {
			cp.Events = append(cp.Events, e[1])
		}
		
		// Extract handle functions
		handles := handleRegex.FindAllStringSubmatch(content, -1)
		for _, h := range handles {
			cp.Events = append(cp.Events, h[1])
		}
		
		// Extract async handle functions
		asyncHandles := asyncHandleRegex.FindAllStringSubmatch(content, -1)
		for _, h := range asyncHandles {
			cp.Events = append(cp.Events, h[1])
		}
		
		// Extract WebSocket event handlers
		wsEvents := wsEventRegex.FindAllStringSubmatch(content, -1)
		for _, e := range wsEvents {
			cp.Events = append(cp.Events, e[1])
		}
		
		// Extract error boundary handlers
		errorEvents := errorBoundaryRegex.FindAllStringSubmatch(content, -1)
		for _, e := range errorEvents {
			cp.Events = append(cp.Events, e[1])
		}
		
		// Remove duplicates
		seen := make(map[string]bool)
		var uniqueProps []string
		for _, prop := range cp.Props {
			if !seen[prop] {
				seen[prop] = true
				uniqueProps = append(uniqueProps, prop)
			}
		}
		cp.Props = uniqueProps
		
		seen = make(map[string]bool)
		var uniqueEvents []string
		for _, event := range cp.Events {
			if !seen[event] {
				seen[event] = true
				uniqueEvents = append(uniqueEvents, event)
			}
		}
		cp.Events = uniqueEvents
		
		result = append(result, cp)
		return nil
	})
	
	return result, nil
}

// GetFrontendTestCoverage runs jest tests with coverage and parses the summary
func GetFrontendTestCoverage(root string) (models.TestCoverage, error) {
	var cov models.TestCoverage
	cmd := exec.Command("npm", "test", "--", "--coverage", "--silent", "--json", "--outputFile=coverage-summary.json")
	cmd.Dir = root
	if err := cmd.Run(); err != nil {
		return cov, err
	}
	sumFile := filepath.Join(root, "coverage-summary.json")
	data, err := os.ReadFile(sumFile)
	if err != nil {
		return cov, err
	}
	var summary map[string]interface{}
	if err := json.Unmarshal(data, &summary); err != nil {
		return cov, err
	}
	if t, ok := summary["total"].(map[string]interface{}); ok {
		if s, ok := t["lines"].(map[string]interface{}); ok {
			cov.TotalLines = int(s["total"].(float64))
			cov.LinesCovered = int(s["covered"].(float64))
			if cov.TotalLines > 0 {
				cov.OverallPercentage = float64(cov.LinesCovered) / float64(cov.TotalLines) * 100
			}
		}
		if s, ok := t["files"].(map[string]interface{}); ok {
			cov.TotalFiles = int(s["total"].(float64))
			cov.FilesCovered = int(s["covered"].(float64))
		}
	}
	os.Remove(sumFile)
	return cov, nil
}

// GetComponentToTestMap maps components to test files referencing them
func GetComponentToTestMap(root string) ([]models.ComponentTestMap, error) {
	var result []models.ComponentTestMap
	componentDir := filepath.Join(root, "src", "components")
	testDir := filepath.Join(root, "src")
	compFiles := map[string]string{}
	filepath.WalkDir(componentDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !(strings.HasSuffix(path, ".tsx") || strings.HasSuffix(path, ".jsx")) {
			return nil
		}
		name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
		compFiles[name] = path
		return nil
	})
	for name, file := range compFiles {
		var tests []string
		grep := exec.Command("grep", "-rl", name, testDir)
		out, err := grep.Output()
		if err == nil {
			lines := strings.Split(strings.TrimSpace(string(out)), "\n")
			for _, l := range lines {
				if strings.HasSuffix(l, ".test.tsx") || strings.HasSuffix(l, ".test.ts") || strings.Contains(l, "__tests__") {
					tests = append(tests, l)
				}
			}
		}
		result = append(result, models.ComponentTestMap{Component: name, File: file, Tests: tests})
	}
	return result, nil
}

// GetFrontendAPIClientAnalysis analyzes the sophisticated TypeScript API client structure
func GetFrontendAPIClientAnalysis(root string) (map[string]interface{}, error) {
	result := map[string]interface{}{
		"client_type":     "auto-generated",
		"api_classes":     []string{},
		"model_types":     []string{},
		"total_endpoints": 0,
		"client_features": []string{},
		"documentation":   []string{},
	}
	
	apiClientDir := filepath.Join(root, "src", "lib", "api-client")
	
	// Check if the API client directory exists
	if _, err := os.Stat(apiClientDir); os.IsNotExist(err) {
		result["status"] = "not_found"
		return result, nil
	}
	
	// Analyze API classes in the api/ directory
	apiDir := filepath.Join(apiClientDir, "api")
	if _, err := os.Stat(apiDir); err == nil {
		var apiClasses []string
		err := filepath.WalkDir(apiDir, func(path string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return nil
			}
			if strings.HasSuffix(path, "-api.ts") {
				className := strings.TrimSuffix(filepath.Base(path), ".ts")
				// Convert kebab-case to PascalCase for API class names
				parts := strings.Split(className, "-")
				var pascalParts []string
				for _, part := range parts {
					if part != "" {
						pascalParts = append(pascalParts, strings.Title(part))
					}
				}
				apiClasses = append(apiClasses, strings.Join(pascalParts, ""))
			}
			return nil
		})
		if err == nil {
			result["api_classes"] = apiClasses
		}
	}
	
	// Analyze model types in the models/ directory
	modelsDir := filepath.Join(apiClientDir, "models")
	if _, err := os.Stat(modelsDir); err == nil {
		var modelTypes []string
		err := filepath.WalkDir(modelsDir, func(path string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return nil
			}
			if strings.HasSuffix(path, ".ts") && !strings.HasSuffix(path, ".test.ts") {
				modelName := strings.TrimSuffix(filepath.Base(path), ".ts")
				if modelName != "index" {
					modelTypes = append(modelTypes, modelName)
				}
			}
			return nil
		})
		if err == nil {
			result["model_types"] = modelTypes
		}
	}
	
	// Analyze documentation in the docs/ directory
	docsDir := filepath.Join(apiClientDir, "docs")
	if _, err := os.Stat(docsDir); err == nil {
		var docFiles []string
		err := filepath.WalkDir(docsDir, func(path string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return nil
			}
			if strings.HasSuffix(path, ".md") {
				docName := strings.TrimSuffix(filepath.Base(path), ".md")
				docFiles = append(docFiles, docName)
			}
			return nil
		})
		if err == nil {
			result["documentation"] = docFiles
		}
	}
	
	// Detect client features by checking for key files
	var features []string
	
	// Check for TypeScript configuration
	if _, err := os.Stat(filepath.Join(apiClientDir, "tsconfig.json")); err == nil {
		features = append(features, "typescript")
	}
	
	// Check for configuration management
	if _, err := os.Stat(filepath.Join(apiClientDir, "configuration.ts")); err == nil {
		features = append(features, "configuration_management")
	}
	
	// Check for base client functionality
	if _, err := os.Stat(filepath.Join(apiClientDir, "base.ts")); err == nil {
		features = append(features, "base_client")
	}
	
	// Check for common utilities
	if _, err := os.Stat(filepath.Join(apiClientDir, "common.ts")); err == nil {
		features = append(features, "common_utilities")
	}
	
	// Check for custom types
	if _, err := os.Stat(filepath.Join(apiClientDir, "types.ts")); err == nil {
		features = append(features, "custom_types")
	}
	
	// Check for package.json (indicating standalone package)
	if _, err := os.Stat(filepath.Join(apiClientDir, "package.json")); err == nil {
		features = append(features, "standalone_package")
	}
	
	// Check for test files
	testDir := filepath.Join(apiClientDir, "__tests__")
	if _, err := os.Stat(testDir); err == nil {
		features = append(features, "comprehensive_testing")
	}
	
	// Check for git integration scripts
	if _, err := os.Stat(filepath.Join(apiClientDir, "git_push.sh")); err == nil {
		features = append(features, "git_integration")
	}
	
	// Check for OpenAPI generator configuration
	if _, err := os.Stat(filepath.Join(apiClientDir, ".openapi-generator-ignore")); err == nil {
		features = append(features, "openapi_generated")
	}
	
	result["client_features"] = features
	
	// Estimate total endpoints by counting API classes and methods
	totalEndpoints := 0
	for _ = range result["api_classes"].([]string) {
		// Each API class typically has multiple endpoints
		// Conservative estimate: 5-10 endpoints per API class
		totalEndpoints += 7 // Average estimate
	}
	result["total_endpoints"] = totalEndpoints
	
	// Set overall status
	if len(result["api_classes"].([]string)) > 10 {
		result["status"] = "sophisticated"
		result["complexity"] = "high"
	} else if len(result["api_classes"].([]string)) > 5 {
		result["status"] = "mature"
		result["complexity"] = "medium"
	} else {
		result["status"] = "basic"
		result["complexity"] = "low"
	}
	
	// Additional analysis for business domain detection
	businessDomains := []string{}
	for _, apiClass := range result["api_classes"].([]string) {
		className := strings.ToLower(apiClass)
		if strings.Contains(className, "keyword") {
			businessDomains = append(businessDomains, "keyword_management")
		}
		if strings.Contains(className, "campaign") {
			businessDomains = append(businessDomains, "campaign_management")
		}
		if strings.Contains(className, "proxy") {
			businessDomains = append(businessDomains, "proxy_management")
		}
		if strings.Contains(className, "persona") {
			businessDomains = append(businessDomains, "persona_management")
		}
		if strings.Contains(className, "auth") {
			businessDomains = append(businessDomains, "authentication")
		}
		if strings.Contains(className, "websocket") {
			businessDomains = append(businessDomains, "real_time_communication")
		}
	}
	
	// Remove duplicates from business domains
	seen := make(map[string]bool)
	var uniqueDomains []string
	for _, domain := range businessDomains {
		if !seen[domain] {
			seen[domain] = true
			uniqueDomains = append(uniqueDomains, domain)
		}
	}
	result["business_domains"] = uniqueDomains
	
	return result, nil
}

// Alias functions to match MCP server naming conventions

// frontend_nextjs_app_routes provides enhanced route detection for modern Next.js applications
func GetFrontendNextjsAppRoutes(root string) ([]models.FrontendRoute, error) {
	return GetFrontendRoutes(root)
}

// frontend_react_component_tree analyzes sophisticated component hierarchies with shadcn/ui integration
func GetFrontendReactComponentTree(root string) ([]models.ComponentTreeNode, error) {
	return GetComponentTree(root)
}

// frontend_react_component_props handles complex business domain component analysis
func GetFrontendReactComponentProps(root string) ([]models.ComponentPropsAndEvents, error) {
	return GetComponentPropsAndEvents(root)
}

// frontend_api_client_analysis provides sophisticated API client structure analysis
func GetFrontendApiClientAnalysis(root string) (map[string]interface{}, error) {
	return GetFrontendAPIClientAnalysis(root)
}
