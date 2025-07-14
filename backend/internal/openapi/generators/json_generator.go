package generators

import (
	"encoding/json"
	"fmt"

	"github.com/getkin/kin-openapi/openapi3"
)

// JSONGenerator generates JSON output for OpenAPI specifications
type JSONGenerator struct {
	prettyPrint bool
	indent      string
}

// NewJSONGenerator creates a new JSON generator
func NewJSONGenerator(prettyPrint bool) *JSONGenerator {
	indent := ""
	if prettyPrint {
		indent = "  "
	}
	
	return &JSONGenerator{
		prettyPrint: prettyPrint,
		indent:      indent,
	}
}

// Generate generates JSON output from an OpenAPI specification
func (jg *JSONGenerator) Generate(spec *openapi3.T) ([]byte, error) {
	if spec == nil {
		return nil, fmt.Errorf("specification cannot be nil")
	}

	var jsonData []byte
	var err error

	if jg.prettyPrint {
		jsonData, err = json.MarshalIndent(spec, "", jg.indent)
	} else {
		jsonData, err = json.Marshal(spec)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to marshal to JSON: %w", err)
	}

	return jsonData, nil
}

// GenerateCompact generates compact JSON without formatting
func (jg *JSONGenerator) GenerateCompact(spec *openapi3.T) ([]byte, error) {
	if spec == nil {
		return nil, fmt.Errorf("specification cannot be nil")
	}

	jsonData, err := json.Marshal(spec)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal to compact JSON: %w", err)
	}

	return jsonData, nil
}

// GeneratePretty generates pretty-printed JSON with formatting
func (jg *JSONGenerator) GeneratePretty(spec *openapi3.T) ([]byte, error) {
	if spec == nil {
		return nil, fmt.Errorf("specification cannot be nil")
	}

	jsonData, err := json.MarshalIndent(spec, "", jg.indent)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal to pretty JSON: %w", err)
	}

	return jsonData, nil
}

// SetIndent sets the indentation string for pretty printing
func (jg *JSONGenerator) SetIndent(indent string) {
	jg.indent = indent
}

// ValidateJSON validates that the generated JSON is valid
func (jg *JSONGenerator) ValidateJSON(jsonData []byte) error {
	var temp interface{}
	return json.Unmarshal(jsonData, &temp)
}

// GenerateString generates JSON as a string
func (jg *JSONGenerator) GenerateString(spec *openapi3.T) (string, error) {
	jsonData, err := jg.Generate(spec)
	if err != nil {
		return "", err
	}
	return string(jsonData), nil
}

// GenerateWithCallback generates JSON and calls a callback function
func (jg *JSONGenerator) GenerateWithCallback(spec *openapi3.T, callback func([]byte) error) error {
	jsonData, err := jg.Generate(spec)
	if err != nil {
		return err
	}
	return callback(jsonData)
}