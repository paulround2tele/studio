package api

import (
	"fmt"

	"github.com/getkin/kin-openapi/openapi3"
)

// OpenAPIValidator validates OpenAPI specifications.
type OpenAPIValidator struct{}

// ValidateFile loads and validates the specification at the given path.
func (v *OpenAPIValidator) ValidateFile(path string) error {
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromFile(path)
	if err != nil {
		return fmt.Errorf("failed to load spec: %w", err)
	}
	if err := doc.Validate(loader.Context); err != nil {
		return fmt.Errorf("spec validation failed: %w", err)
	}
	return nil
}
