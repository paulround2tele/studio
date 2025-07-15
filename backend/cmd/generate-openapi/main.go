package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/fntelecomllc/studio/backend/internal/openapi/config"
	"github.com/fntelecomllc/studio/backend/internal/openapi/reflection"
	"github.com/fntelecomllc/studio/backend/internal/openapi/generators"
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
		log.Println("Starting OpenAPI generation using reflection engine...")
	}

	// Use reflection engine to generate OpenAPI spec
	err := generateWithReflection(*outputPath, *verbose)
	if err != nil {
		log.Fatalf("Failed to generate OpenAPI specification: %v", err)
	}

	if *verbose {
		log.Println("OpenAPI specification generated successfully")
	}
}

func generateWithReflection(outputPath string, verbose bool) error {
	// Create output directory if it doesn't exist
	err := os.MkdirAll(outputPath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Create configuration for OpenAPI generation
	cfg := config.DefaultConfig()
	cfg.VerboseLogging = verbose
	cfg.OutputPath = outputPath

	// Create reflection engine
	reflectionEngine := reflection.NewReflectionEngine(cfg)

	// Generate the specification
	spec, err := reflectionEngine.GenerateSpec()
	if err != nil {
		return fmt.Errorf("reflection engine failed: %w", err)
	}

	// Generate YAML output
	yamlGenerator := generators.NewYAMLGenerator(true) // Enable pretty printing
	yamlData, err := yamlGenerator.Generate(spec)
	if err != nil {
		return fmt.Errorf("failed to generate YAML: %w", err)
	}

	// Write YAML file
	yamlPath := filepath.Join(outputPath, "openapi-3.yaml")
	err = os.WriteFile(yamlPath, yamlData, 0644)
	if err != nil {
		return fmt.Errorf("failed to write YAML file: %w", err)
	}

	// Generate JSON output
	jsonData, err := spec.MarshalJSON()
	if err != nil {
		return fmt.Errorf("failed to generate JSON: %w", err)
	}

	// Write JSON file
	jsonPath := filepath.Join(outputPath, "openapi-3.json")
	err = os.WriteFile(jsonPath, jsonData, 0644)
	if err != nil {
		return fmt.Errorf("failed to write JSON file: %w", err)
	}

	if verbose {
		log.Printf("Generated OpenAPI specification:")
		log.Printf("  YAML: %s", yamlPath)
		log.Printf("  JSON: %s", jsonPath)
		log.Printf("  Schemas: %d", len(spec.Components.Schemas))
		log.Printf("  Paths: %d", len(spec.Paths.Map()))
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