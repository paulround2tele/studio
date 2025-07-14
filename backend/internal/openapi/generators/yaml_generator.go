package generators

import (
	"fmt"

	"github.com/getkin/kin-openapi/openapi3"
	"gopkg.in/yaml.v3"
)

// YAMLGenerator generates YAML output for OpenAPI specifications
type YAMLGenerator struct {
	prettyPrint bool
	indent      int
}

// NewYAMLGenerator creates a new YAML generator
func NewYAMLGenerator(prettyPrint bool) *YAMLGenerator {
	return &YAMLGenerator{
		prettyPrint: prettyPrint,
		indent:      2,
	}
}

// Generate generates YAML output from an OpenAPI specification
func (yg *YAMLGenerator) Generate(spec *openapi3.T) ([]byte, error) {
	if spec == nil {
		return nil, fmt.Errorf("specification cannot be nil")
	}

	// Configure YAML encoder
	encoder := yaml.NewEncoder(nil)
	encoder.SetIndent(yg.indent)

	// Convert spec to YAML-friendly format
	specMap, err := yg.convertSpecToMap(spec)
	if err != nil {
		return nil, fmt.Errorf("failed to convert spec to map: %w", err)
	}

	// Marshal to YAML
	yamlData, err := yaml.Marshal(specMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal to YAML: %w", err)
	}

	return yamlData, nil
}

// convertSpecToMap converts an OpenAPI spec to a map for YAML serialization
func (yg *YAMLGenerator) convertSpecToMap(spec *openapi3.T) (map[string]interface{}, error) {
	// First convert to JSON, then to map
	jsonData, err := spec.MarshalJSON()
	if err != nil {
		return nil, err
	}

	var specMap map[string]interface{}
	err = yaml.Unmarshal(jsonData, &specMap)
	if err != nil {
		return nil, err
	}

	// Clean up the map for better YAML output
	yg.cleanupMap(specMap)

	return specMap, nil
}

// cleanupMap cleans up the map for better YAML representation
func (yg *YAMLGenerator) cleanupMap(m map[string]interface{}) {
	for key, value := range m {
		switch v := value.(type) {
		case map[string]interface{}:
			// Recursively clean nested maps
			yg.cleanupMap(v)
			// Remove empty maps
			if len(v) == 0 {
				delete(m, key)
			}
		case []interface{}:
			// Clean arrays
			yg.cleanupArray(v)
			// Remove empty arrays
			if len(v) == 0 {
				delete(m, key)
			}
		case string:
			// Remove empty strings
			if v == "" {
				delete(m, key)
			}
		case nil:
			// Remove nil values
			delete(m, key)
		}
	}
}

// cleanupArray cleans up arrays for better YAML representation
func (yg *YAMLGenerator) cleanupArray(arr []interface{}) {
	for _, item := range arr {
		if m, ok := item.(map[string]interface{}); ok {
			yg.cleanupMap(m)
		}
	}
}

// GenerateWithMetadata generates YAML with additional metadata comments
func (yg *YAMLGenerator) GenerateWithMetadata(spec *openapi3.T, metadata map[string]string) ([]byte, error) {
	yamlData, err := yg.Generate(spec)
	if err != nil {
		return nil, err
	}

	// Add metadata as comments at the top
	var result []byte
	
	// Add header comments
	if metadata != nil {
		for key, value := range metadata {
			comment := fmt.Sprintf("# %s: %s\n", key, value)
			result = append(result, []byte(comment)...)
		}
		result = append(result, []byte("\n")...)
	}

	// Add the YAML content
	result = append(result, yamlData...)

	return result, nil
}

// SetIndent sets the indentation level for YAML output
func (yg *YAMLGenerator) SetIndent(indent int) {
	if indent > 0 {
		yg.indent = indent
	}
}

// ValidateYAML validates that the generated YAML is valid
func (yg *YAMLGenerator) ValidateYAML(yamlData []byte) error {
	var temp interface{}
	return yaml.Unmarshal(yamlData, &temp)
}