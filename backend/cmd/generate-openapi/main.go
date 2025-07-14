package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	// Command line flags
	var (
		outputPath = flag.String("output", "docs", "Output directory path")
		verbose    = flag.Bool("verbose", false, "Enable verbose logging")
		help       = flag.Bool("help", false, "Show help message")
	)
	flag.Parse()

	if *help {
		showHelp()
		return
	}

	if *verbose {
		log.Println("Starting OpenAPI generation using swag...")
	}

	// Use swag init to generate OpenAPI spec
	err := generateWithSwag(*outputPath, *verbose)
	if err != nil {
		log.Fatalf("Failed to generate OpenAPI specification: %v", err)
	}

	if *verbose {
		log.Println("OpenAPI specification generated successfully")
	}
}

func generateWithSwag(outputPath string, verbose bool) error {
	// Create output directory if it doesn't exist
	err := os.MkdirAll(outputPath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Run swag init command
	cmd := exec.Command("swag", "init",
		"--dir", "./cmd/apiserver,./internal/api,./internal/models",
		"--generalInfo", "main.go",
		"--output", outputPath,
		"--ot", "json,yaml,go",
		"--parseInternal",
		"--parseDependency",
		"--parseDepth", "1",
		"--v3.1",
	)
	
	if verbose {
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
	}
	
	err = cmd.Run()
	if err != nil {
		return fmt.Errorf("swag init failed: %w", err)
	}
	
	// Rename the generated files to match expected names
	err = renameGeneratedFiles(outputPath)
	if err != nil {
		return fmt.Errorf("failed to rename generated files: %w", err)
	}
	
	return nil
}

func renameGeneratedFiles(outputPath string) error {
	// Rename swagger.yaml to openapi-3.yaml
	yamlSrc := filepath.Join(outputPath, "swagger.yaml")
	yamlDst := filepath.Join(outputPath, "openapi-3.yaml")
	if _, err := os.Stat(yamlSrc); err == nil {
		err = os.Rename(yamlSrc, yamlDst)
		if err != nil {
			return fmt.Errorf("failed to rename yaml file: %w", err)
		}
	}
	
	// Rename swagger.json to openapi-3.json
	jsonSrc := filepath.Join(outputPath, "swagger.json")
	jsonDst := filepath.Join(outputPath, "openapi-3.json")
	if _, err := os.Stat(jsonSrc); err == nil {
		err = os.Rename(jsonSrc, jsonDst)
		if err != nil {
			return fmt.Errorf("failed to rename json file: %w", err)
		}
	}
	
	return nil
}

func showHelp() {
	fmt.Println("OpenAPI Generator using Swag")
	fmt.Println("")
	fmt.Println("Usage:")
	fmt.Println("  generate-openapi [flags]")
	fmt.Println("")
	fmt.Println("Flags:")
	fmt.Println("  -output string")
	fmt.Println("        Output directory path (default \"docs\")")
	fmt.Println("  -verbose")
	fmt.Println("        Enable verbose logging")
	fmt.Println("  -help")
	fmt.Println("        Show help message")
	fmt.Println("")
	fmt.Println("Examples:")
	fmt.Println("  generate-openapi -output docs -verbose")
	fmt.Println("  generate-openapi -help")
}