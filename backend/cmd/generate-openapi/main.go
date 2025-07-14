package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/fntelecomllc/studio/backend/internal/openapi/config"
	"github.com/fntelecomllc/studio/backend/internal/openapi/generators"
	"github.com/fntelecomllc/studio/backend/internal/openapi/reflection"
)

func main() {
	// Command line flags
	var (
		outputPath = flag.String("output", "docs", "Output directory path")
		format     = flag.String("format", "both", "Output format: yaml, json, or both")
		validate   = flag.Bool("validate", true, "Validate the generated specification")
		verbose    = flag.Bool("verbose", false, "Enable verbose logging")
		help       = flag.Bool("help", false, "Show help message")
	)
	flag.Parse()

	if *help {
		showHelp()
		return
	}

	if *verbose {
		log.Println("Starting OpenAPI generation using reflection-based system...")
	}

	// Create configuration
	cfg := config.CLIConfig(*outputPath, *format, *verbose)

	// Create reflection engine
	engine := reflection.NewReflectionEngine(cfg)

	// Generate OpenAPI specification
	spec, err := engine.GenerateSpec()
	if err != nil {
		log.Fatalf("Failed to generate OpenAPI specification: %v", err)
	}

	if *verbose {
		log.Printf("Generated OpenAPI specification with %d paths", len(spec.Paths.Map()))
	}

	// Validate specification if requested
	if *validate {
		if *verbose {
			log.Println("Validating OpenAPI specification...")
		}
		validator := generators.NewValidator(false)
		if err := validator.Validate(spec); err != nil {
			log.Fatalf("OpenAPI specification validation failed: %v", err)
		}
		if *verbose {
			log.Println("✓ OpenAPI specification validation passed")
		}
	}

	// Create output directory if it doesn't exist
	if err := os.MkdirAll(*outputPath, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

	// Generate outputs based on format
	switch *format {
	case "yaml":
		if err := generateYAML(spec, *outputPath, *verbose); err != nil {
			log.Fatalf("Failed to generate YAML: %v", err)
		}
	case "json":
		if err := generateJSON(spec, *outputPath, *verbose); err != nil {
			log.Fatalf("Failed to generate JSON: %v", err)
		}
	case "both":
		if err := generateYAML(spec, *outputPath, *verbose); err != nil {
			log.Fatalf("Failed to generate YAML: %v", err)
		}
		if err := generateJSON(spec, *outputPath, *verbose); err != nil {
			log.Fatalf("Failed to generate JSON: %v", err)
		}
	default:
		log.Fatalf("Invalid format: %s. Must be yaml, json, or both", *format)
	}

	fmt.Println("✓ OpenAPI specification generated successfully")
	
	if *verbose {
		fmt.Printf("Output files:\n")
		if *format == "yaml" || *format == "both" {
			fmt.Printf("  - %s\n", filepath.Join(*outputPath, "openapi-3.yaml"))
		}
		if *format == "json" || *format == "both" {
			fmt.Printf("  - %s\n", filepath.Join(*outputPath, "openapi-3.json"))
		}
	}
}

// generateYAML generates YAML output
func generateYAML(spec interface{}, outputPath string, verbose bool) error {
	generator := generators.NewYAMLGenerator(true)
	
	// Convert spec to the expected type
	openAPISpec, ok := spec.(*openapi3.T)
	if !ok {
		return fmt.Errorf("invalid spec type")
	}
	
	yamlData, err := generator.Generate(openAPISpec)
	if err != nil {
		return fmt.Errorf("failed to generate YAML: %w", err)
	}

	outputFile := filepath.Join(outputPath, "openapi-3.yaml")
	if err := os.WriteFile(outputFile, yamlData, 0644); err != nil {
		return fmt.Errorf("failed to write YAML file: %w", err)
	}

	if verbose {
		log.Printf("✓ Generated YAML: %s (%d bytes)", outputFile, len(yamlData))
	}

	return nil
}

// generateJSON generates JSON output
func generateJSON(spec interface{}, outputPath string, verbose bool) error {
	generator := generators.NewJSONGenerator(true)
	
	// Convert spec to the expected type
	openAPISpec, ok := spec.(*openapi3.T)
	if !ok {
		return fmt.Errorf("invalid spec type")
	}
	
	jsonData, err := generator.Generate(openAPISpec)
	if err != nil {
		return fmt.Errorf("failed to generate JSON: %w", err)
	}

	outputFile := filepath.Join(outputPath, "openapi-3.json")
	if err := os.WriteFile(outputFile, jsonData, 0644); err != nil {
		return fmt.Errorf("failed to write JSON file: %w", err)
	}

	if verbose {
		log.Printf("✓ Generated JSON: %s (%d bytes)", outputFile, len(jsonData))
	}

	return nil
}

// showHelp displays help information
func showHelp() {
	fmt.Println("OpenAPI Generator - Reflection-based OpenAPI 3.0 specification generator")
	fmt.Println()
	fmt.Println("USAGE:")
	fmt.Println("  go run backend/cmd/generate-openapi/main.go [flags]")
	fmt.Println()
	fmt.Println("FLAGS:")
	fmt.Println("  -output string")
	fmt.Println("        Output directory path (default \"backend/docs\")")
	fmt.Println("  -format string")
	fmt.Println("        Output format: yaml, json, or both (default \"both\")")
	fmt.Println("  -validate")
	fmt.Println("        Validate the generated specification (default true)")
	fmt.Println("  -verbose")
	fmt.Println("        Enable verbose logging (default false)")
	fmt.Println("  -help")
	fmt.Println("        Show this help message")
	fmt.Println()
	fmt.Println("EXAMPLES:")
	fmt.Println("  # Generate both YAML and JSON with validation")
	fmt.Println("  go run backend/cmd/generate-openapi/main.go")
	fmt.Println()
	fmt.Println("  # Generate only YAML with verbose output")
	fmt.Println("  go run backend/cmd/generate-openapi/main.go -format yaml -verbose")
	fmt.Println()
	fmt.Println("  # Generate to custom directory without validation")
	fmt.Println("  go run backend/cmd/generate-openapi/main.go -output /tmp/openapi -validate=false")
	fmt.Println()
	fmt.Println("PACKAGE PATHS SCANNED:")
	cfg := config.DefaultConfig()
	for _, path := range cfg.PackagePaths {
		fmt.Printf("  - %s\n", path)
	}
	fmt.Println()
	fmt.Println("This tool scans Go source code using AST analysis to automatically")
	fmt.Println("discover API routes and generate OpenAPI 3.0 specifications without")
	fmt.Println("requiring a running server.")
}