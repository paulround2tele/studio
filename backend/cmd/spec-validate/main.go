package main

import (
	"fmt"
	"os"

	"github.com/getkin/kin-openapi/openapi3"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: spec-validate <path-to-openapi.yaml|json>")
		os.Exit(2)
	}
	path := os.Args[1]
	loader := &openapi3.Loader{IsExternalRefsAllowed: true}
	doc, err := loader.LoadFromFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load spec: %v\n", err)
		os.Exit(1)
	}
	if err := doc.Validate(loader.Context); err != nil {
		fmt.Fprintf(os.Stderr, "spec validation failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Spec %s is valid. OpenAPI version: %s\n", path, doc.OpenAPI)
}
