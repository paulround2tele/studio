package tests

import (
	"fmt"
	"io/ioutil"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

// TestPhaseF_NoSuccessEnvelopeIn2xxResponses is a comprehensive test that validates
// the acceptance criteria for Phase F: "OpenAPI bundle has zero $ref to SuccessEnvelope in 2xx responses"
func TestPhaseF_NoSuccessEnvelopeIn2xxResponses(t *testing.T) {
	// Load the bundled OpenAPI spec
	specData, err := ioutil.ReadFile("../openapi/dist/openapi.yaml")
	if err != nil {
		t.Fatalf("failed to read openapi spec: %v", err)
	}

	var spec map[string]interface{}
	if err := yaml.Unmarshal(specData, &spec); err != nil {
		t.Fatalf("failed to parse openapi spec: %v", err)
	}

	paths, ok := spec["paths"].(map[string]interface{})
	if !ok {
		t.Fatalf("spec has no paths section")
	}

	var violations []string

	// Iterate through all paths and methods
	for pathName, pathItem := range paths {
		if pathItem == nil {
			continue
		}
		
		methods, ok := pathItem.(map[string]interface{})
		if !ok {
			continue
		}

		for methodName, methodItem := range methods {
			if methodItem == nil {
				continue
			}

			// Skip non-HTTP methods
			if !isHTTPMethod(methodName) {
				continue
			}

			method, ok := methodItem.(map[string]interface{})
			if !ok {
				continue
			}

			responses, ok := method["responses"].(map[string]interface{})
			if !ok {
				continue
			}

			operationId := ""
			if opId, exists := method["operationId"]; exists {
				operationId = fmt.Sprintf("%v", opId)
			}

			// Check all 2xx responses
			for responseCode, responseItem := range responses {
				if strings.HasPrefix(fmt.Sprintf("%v", responseCode), "2") {
					if hasSuccessEnvelopeRef(responseItem) {
						violation := fmt.Sprintf("%s %s (operationId: %s) response %s still references SuccessEnvelope", 
							strings.ToUpper(methodName), pathName, operationId, responseCode)
						violations = append(violations, violation)
					}
				}
			}
		}
	}

	// Report all violations
	if len(violations) > 0 {
		t.Errorf("Phase F Contract Violation: Found %d endpoints with SuccessEnvelope in 2xx responses:\n%s", 
			len(violations), strings.Join(violations, "\n"))
	}
}

// TestPhaseF_ErrorResponsesStillHaveEnvelopes ensures error responses maintain envelope structure
func TestPhaseF_ErrorResponsesStillHaveEnvelopes(t *testing.T) {
	// Load the bundled OpenAPI spec
	specData, err := ioutil.ReadFile("../openapi/dist/openapi.yaml")
	if err != nil {
		t.Fatalf("failed to read openapi spec: %v", err)
	}

	var spec map[string]interface{}
	if err := yaml.Unmarshal(specData, &spec); err != nil {
		t.Fatalf("failed to parse openapi spec: %v", err)
	}

	paths, ok := spec["paths"].(map[string]interface{})
	if !ok {
		t.Fatalf("spec has no paths section")
	}

	foundErrorEnvelope := false

	// Check that error responses still use ErrorEnvelope
	for _, pathItem := range paths {
		if pathItem == nil {
			continue
		}
		
		methods, ok := pathItem.(map[string]interface{})
		if !ok {
			continue
		}

		for methodName, methodItem := range methods {
			if methodItem == nil {
				continue
			}

			if !isHTTPMethod(methodName) {
				continue
			}

			method, ok := methodItem.(map[string]interface{})
			if !ok {
				continue
			}

			responses, ok := method["responses"].(map[string]interface{})
			if !ok {
				continue
			}

			// Check error responses (4xx, 5xx)
			for responseCode, responseItem := range responses {
				code := fmt.Sprintf("%v", responseCode)
				if strings.HasPrefix(code, "4") || strings.HasPrefix(code, "5") {
					if hasErrorEnvelopeRef(responseItem) {
						foundErrorEnvelope = true
						break
					}
				}
			}
			if foundErrorEnvelope {
				break
			}
		}
		if foundErrorEnvelope {
			break
		}
	}

	if !foundErrorEnvelope {
		t.Errorf("Expected to find ErrorEnvelope references in error responses, but found none")
	}
}

// Helper function to check if a response references SuccessEnvelope
func hasSuccessEnvelopeRef(responseItem interface{}) bool {
	return hasSchemaRef(responseItem, "SuccessEnvelope")
}

// Helper function to check if a response references ErrorEnvelope  
func hasErrorEnvelopeRef(responseItem interface{}) bool {
	return hasSchemaRef(responseItem, "ErrorEnvelope")
}

// Helper function to check if a response has a schema reference to a specific type
func hasSchemaRef(responseItem interface{}, refType string) bool {
	response, ok := responseItem.(map[string]interface{})
	if !ok {
		return false
	}

	content, ok := response["content"].(map[string]interface{})
	if !ok {
		return false
	}

	appJson, ok := content["application/json"].(map[string]interface{})
	if !ok {
		return false
	}

	schema, ok := appJson["schema"].(map[string]interface{})
	if !ok {
		return false
	}

	// Check direct $ref
	if ref, exists := schema["$ref"]; exists {
		if strings.Contains(fmt.Sprintf("%v", ref), refType) {
			return true
		}
	}

	// Check allOf for $ref
	if allOf, exists := schema["allOf"]; exists {
		if allOfSlice, ok := allOf.([]interface{}); ok {
			for _, item := range allOfSlice {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if ref, exists := itemMap["$ref"]; exists {
						if strings.Contains(fmt.Sprintf("%v", ref), refType) {
							return true
						}
					}
				}
			}
		}
	}

	return false
}

// Helper function to check if a string is an HTTP method
func isHTTPMethod(method string) bool {
	httpMethods := []string{"get", "post", "put", "delete", "patch", "head", "options"}
	for _, m := range httpMethods {
		if strings.ToLower(method) == m {
			return true
		}
	}
	return false
}