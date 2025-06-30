package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/fntelecomllc/studio/backend/api"
	"gopkg.in/yaml.v3"
)

func main() {
	var (
		outputFile = flag.String("output", "backend/docs/openapi-3.yaml", "Output file path")
		format     = flag.String("format", "yaml", "Output format (yaml or json)")
		validate   = flag.Bool("validate", true, "Validate the specification")
	)
	flag.Parse()

	// Generate OpenAPI specification
	spec := api.GenerateOpenAPISpec()

	// Validate specification if requested
	if *validate {
		if err := api.ValidateSpec(); err != nil {
			log.Fatalf("OpenAPI specification validation failed: %v", err)
		}
		fmt.Println("OpenAPI specification validation passed ✓")
	}

	// Generate output based on format
	var output []byte
	var err error

	switch *format {
	case "yaml":
		output, err = yaml.Marshal(spec)
		if err != nil {
			log.Fatalf("Failed to marshal OpenAPI spec to YAML: %v", err)
		}
	case "json":
		output, err = spec.MarshalJSON()
		if err != nil {
			log.Fatalf("Failed to marshal OpenAPI spec to JSON: %v", err)
		}
	default:
		log.Fatalf("Unsupported format: %s (supported: yaml, json)", *format)
	}

	// Write to file
	if err := os.WriteFile(*outputFile, output, 0644); err != nil {
		log.Fatalf("Failed to write OpenAPI spec to file: %v", err)
	}

	fmt.Printf("OpenAPI 3.0.3 specification generated successfully: %s\n", *outputFile)
	fmt.Printf("Format: %s\n", *format)
	fmt.Printf("File size: %d bytes\n", len(output))
}