package main

import (
	"fmt"
	"log"
	"mcp/internal/analyzer"
	"os"
	"path/filepath"
)

func main() {
	backendPath := "/home/vboxuser/studio/backend"
	mainGoPath := filepath.Join(backendPath, "cmd/apiserver/main.go")

	fmt.Println("Testing route parsing...")
	routes, err := analyzer.ParseGinRoutes(mainGoPath)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Found %d routes:\n", len(routes))
	for i, route := range routes {
		if i < 10 { // Show first 10 routes
			fmt.Printf("  %s %s -> %s\n", route.Method, route.Path, route.Handler)
		}
	}
	if len(routes) > 10 {
		fmt.Printf("  ... and %d more routes\n", len(routes)-10)
	}

	// Test API schema detection
	fmt.Println("\nTesting API schema detection...")
	swaggerYaml := filepath.Join(backendPath, "docs/swagger.yaml")
	if _, err := os.Stat(swaggerYaml); err == nil {
		fmt.Println("✓ Found docs/swagger.yaml")
		content, err := os.ReadFile(swaggerYaml)
		if err == nil {
			contentStr := string(content)
			if len(contentStr) > 100 {
				fmt.Printf("  Content preview: %s...\n", contentStr[:100])
			}
		}
	}
}
