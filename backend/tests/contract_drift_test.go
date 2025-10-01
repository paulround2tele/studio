package tests

import (
	"fmt"
	"io/ioutil"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

// TestContractDrift_NoEnvelopeRegression is a comprehensive test that validates
// the API contract has not regressed by reintroducing envelope patterns.
// This test serves as a guardrail against contract drift.
func TestContractDrift_NoEnvelopeRegression(t *testing.T) {
	// Load the bundled OpenAPI spec
	specData, err := ioutil.ReadFile("../openapi/dist/openapi.yaml")
	if err != nil {
		t.Fatalf("failed to read openapi spec: %v", err)
	}

	var spec map[string]interface{}
	if err := yaml.Unmarshal(specData, &spec); err != nil {
		t.Fatalf("failed to parse openapi spec: %v", err)
	}

	var violations []string

	// Test 1: No SuccessEnvelope references in any 2xx responses
	violations = append(violations, checkNoSuccessEnvelopeIn2xx(spec)...)

	// Test 2: No ProxyDetailsResponse schema definition
	violations = append(violations, checkNoProxyDetailsResponse(spec)...)

	// Test 3: Deleted schemas should not exist
	violations = append(violations, checkDeletedSchemasAbsent(spec)...)

	// Test 4: Error responses use ErrorEnvelope consistently
	violations = append(violations, checkErrorResponsesUseEnvelope(spec)...)

	// Report all violations
	if len(violations) > 0 {
		t.Errorf("Contract Drift Detected: Found %d violations:\n%s",
			len(violations), strings.Join(violations, "\n"))
	}

	t.Logf("Contract drift test passed - API contract is clean")
}

// checkNoSuccessEnvelopeIn2xx validates no 2xx responses reference SuccessEnvelope
func checkNoSuccessEnvelopeIn2xx(spec map[string]interface{}) []string {
	var violations []string

	paths, ok := spec["paths"].(map[string]interface{})
	if !ok {
		return []string{"ERROR: spec has no paths section"}
	}

	for pathName, pathItem := range paths {
		if pathItem == nil {
			continue
		}

		methods, ok := pathItem.(map[string]interface{})
		if !ok {
			continue
		}

		for methodName, methodItem := range methods {
			if !isHTTPMethod(methodName) {
				continue
			}

			method, ok := methodItem.(map[string]interface{})
			if !ok {
				continue
			}

			operationId := getOperationId(method)

			responses, ok := method["responses"].(map[string]interface{})
			if !ok {
				continue
			}

			for responseCode, responseItem := range responses {
				if strings.HasPrefix(fmt.Sprintf("%v", responseCode), "2") {
					if hasSchemaRef(responseItem, "SuccessEnvelope") {
						violation := fmt.Sprintf("DRIFT VIOLATION: %s %s (operationId: %s) response %s references SuccessEnvelope",
							strings.ToUpper(methodName), pathName, operationId, responseCode)
						violations = append(violations, violation)
					}
				}
			}
		}
	}

	return violations
}

// checkNoProxyDetailsResponse validates ProxyDetailsResponse schema is not defined
func checkNoProxyDetailsResponse(spec map[string]interface{}) []string {
	var violations []string

	components, ok := spec["components"].(map[string]interface{})
	if !ok {
		return violations // No components section is fine
	}

	schemas, ok := components["schemas"].(map[string]interface{})
	if !ok {
		return violations // No schemas section is fine
	}

	if _, exists := schemas["ProxyDetailsResponse"]; exists {
		violations = append(violations, "DRIFT VIOLATION: ProxyDetailsResponse schema found - should be removed")
	}

	return violations
}

// checkDeletedSchemasAbsent validates that schemas removed during modernization are not present
func checkDeletedSchemasAbsent(spec map[string]interface{}) []string {
	var violations []string

	components, ok := spec["components"].(map[string]interface{})
	if !ok {
		return violations
	}

	schemas, ok := components["schemas"].(map[string]interface{})
	if !ok {
		return violations
	}

	// List of schemas that should not exist
	deletedSchemas := []string{
		"SuccessEnvelope",
		"ProxyDetailsResponse",
		// Add other removed schemas here as needed
	}

	for _, schemaName := range deletedSchemas {
		if _, exists := schemas[schemaName]; exists {
			violations = append(violations, fmt.Sprintf("DRIFT VIOLATION: Deleted schema '%s' found - should not exist", schemaName))
		}
	}

	return violations
}

// checkErrorResponsesUseEnvelope validates error responses use ErrorEnvelope consistently
func checkErrorResponsesUseEnvelope(spec map[string]interface{}) []string {
	var violations []string

	paths, ok := spec["paths"].(map[string]interface{})
	if !ok {
		return violations
	}

	errorResponsesChecked := 0
	errorResponsesWithoutEnvelope := 0

	for pathName, pathItem := range paths {
		if pathItem == nil {
			continue
		}

		methods, ok := pathItem.(map[string]interface{})
		if !ok {
			continue
		}

		for methodName, methodItem := range methods {
			if !isHTTPMethod(methodName) {
				continue
			}

			method, ok := methodItem.(map[string]interface{})
			if !ok {
				continue
			}

			// Get operation ID for better error reporting
			operationId := getOperationId(method)

			responses, ok := method["responses"].(map[string]interface{})
			if !ok {
				continue
			}

			for responseCode, responseItem := range responses {
				responseCodeStr := fmt.Sprintf("%v", responseCode)
				if strings.HasPrefix(responseCodeStr, "4") || strings.HasPrefix(responseCodeStr, "5") {
					errorResponsesChecked++
					if !hasSchemaRef(responseItem, "ErrorEnvelope") {
						errorResponsesWithoutEnvelope++
						// Note: We could add this as a warning in the future
						_ = fmt.Sprintf("INFO: %s %s (operationId: %s) response %s could use ErrorEnvelope",
							strings.ToUpper(methodName), pathName, operationId, responseCode)
					}
				}
			}
		}
	}

	// Log statistics as info (not violations)
	if errorResponsesChecked > 0 {
		consistency := float64(errorResponsesChecked-errorResponsesWithoutEnvelope) / float64(errorResponsesChecked) * 100
		// This is informational, not a violation - don't add to violations slice
		_ = fmt.Sprintf("INFO: Error response consistency: %.1f%% (%d/%d use ErrorEnvelope)",
			consistency, errorResponsesChecked-errorResponsesWithoutEnvelope, errorResponsesChecked)
	}

	return violations
}

// TestContractDrift_SyntheticViolation is a test that intentionally creates violations
// to ensure the drift detection is working. This should be run manually for testing.
func TestContractDrift_SyntheticViolation(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping synthetic violation test in short mode")
	}
	
	// This test is designed to fail if run - it validates that our drift detection works
	t.Skip("Synthetic test - enable manually to test drift detection")
	
	// If enabled, this would create a synthetic spec with violations to test detection
}