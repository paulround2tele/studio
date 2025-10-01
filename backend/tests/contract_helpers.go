package tests

import (
	"strings"
)

// Shared helper functions for contract tests

func isHTTPMethod(method string) bool {
	httpMethods := []string{"get", "post", "put", "delete", "patch", "head", "options", "trace"}
	for _, m := range httpMethods {
		if strings.ToLower(method) == m {
			return true
		}
	}
	return false
}

func getOperationId(method map[string]interface{}) string {
	if opId, ok := method["operationId"].(string); ok {
		return opId
	}
	return "unknown"
}

func hasSchemaRef(responseItem interface{}, refType string) bool {
	// Convert to map
	responseMap, ok := responseItem.(map[string]interface{})
	if !ok {
		return false
	}

	// Check content
	content, ok := responseMap["content"].(map[string]interface{})
	if !ok {
		return false
	}

	// Check application/json
	appJson, ok := content["application/json"].(map[string]interface{})
	if !ok {
		return false
	}

	// Check schema
	schema, ok := appJson["schema"].(map[string]interface{})
	if !ok {
		return false
	}

	// Recursively check for the ref type
	return checkSchemaForRef(schema, refType)
}

func checkSchemaForRef(schema interface{}, refType string) bool {
	schemaMap, ok := schema.(map[string]interface{})
	if !ok {
		return false
	}

	// Check direct $ref
	if ref, ok := schemaMap["$ref"].(string); ok {
		return strings.Contains(ref, refType)
	}

	// Check allOf, anyOf, oneOf
	for _, key := range []string{"allOf", "anyOf", "oneOf"} {
		if schemas, ok := schemaMap[key].([]interface{}); ok {
			for _, subSchema := range schemas {
				if checkSchemaForRef(subSchema, refType) {
					return true
				}
			}
		}
	}

	// Check properties
	if properties, ok := schemaMap["properties"].(map[string]interface{}); ok {
		for _, prop := range properties {
			if checkSchemaForRef(prop, refType) {
				return true
			}
		}
	}

	// Check items (for arrays)
	if items, ok := schemaMap["items"]; ok {
		if checkSchemaForRef(items, refType) {
			return true
		}
	}

	return false
}