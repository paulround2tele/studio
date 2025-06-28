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

// GetFrontendRoutes scans the src/app directory for Next.js routes
func GetFrontendRoutes(root string) ([]models.FrontendRoute, error) {
	var routes []models.FrontendRoute
	appDir := filepath.Join(root, "src", "app")
	_ = filepath.WalkDir(appDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || !d.IsDir() {
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
			route = strings.ReplaceAll(route, "[", ":")
			route = strings.ReplaceAll(route, "]", "")
			if route == "//" {
				route = "/"
			}
			routes = append(routes, models.FrontendRoute{Path: route, File: pageFile})
		}
		return nil
	})
	return routes, nil
}

// GetComponentTree builds a simple component import tree
func GetComponentTree(root string) ([]models.ComponentTreeNode, error) {
	var nodes []models.ComponentTreeNode
	componentDir := filepath.Join(root, "src", "components")
	componentMap := map[string]*models.ComponentTreeNode{}
	filepath.WalkDir(componentDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !(strings.HasSuffix(path, ".tsx") || strings.HasSuffix(path, ".jsx")) {
			return nil
		}
		name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
		node := &models.ComponentTreeNode{Name: name, File: path}
		componentMap[path] = node
		nodes = append(nodes, *node)
		return nil
	})
	importRegex := regexp.MustCompile(`(?m)^import\s+(?:.+\s+from\s+)?["'](.+)["']`)
	for i := range nodes {
		data, err := os.ReadFile(nodes[i].File)
		if err != nil {
			continue
		}
		matches := importRegex.FindAllStringSubmatch(string(data), -1)
		for _, m := range matches {
			imp := m[1]
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
		}
	}
	return nodes, nil
}

// GetComponentPropsAndEvents extracts prop names and event handlers from components
func GetComponentPropsAndEvents(root string) ([]models.ComponentPropsAndEvents, error) {
	var result []models.ComponentPropsAndEvents
	componentDir := filepath.Join(root, "src", "components")
	propRegex := regexp.MustCompile(`(?s)interface\s+(\w+Props)\s+{([^}]*)}`)
	eventRegex := regexp.MustCompile(`(?m)\b(on[A-Z][A-Za-z0-9]+)\b`)
	handleRegex := regexp.MustCompile(`(?m)function\s+(handle[A-Z][A-Za-z0-9]+)`)
	filepath.WalkDir(componentDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !(strings.HasSuffix(path, ".tsx") || strings.HasSuffix(path, ".jsx")) {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		cp := models.ComponentPropsAndEvents{Component: strings.TrimSuffix(filepath.Base(path), filepath.Ext(path)), File: path}
		if m := propRegex.FindStringSubmatch(string(data)); len(m) > 2 {
			fields := strings.Split(m[2], "\n")
			for _, f := range fields {
				parts := strings.Fields(strings.TrimSpace(f))
				if len(parts) >= 1 {
					name := strings.TrimSuffix(strings.TrimSpace(parts[0]), ":")
					if name != "" {
						cp.Props = append(cp.Props, name)
					}
				}
			}
		}
		events := eventRegex.FindAllStringSubmatch(string(data), -1)
		for _, e := range events {
			cp.Events = append(cp.Events, e[1])
		}
		handles := handleRegex.FindAllStringSubmatch(string(data), -1)
		for _, h := range handles {
			cp.Events = append(cp.Events, h[1])
		}
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
