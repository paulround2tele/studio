package utils

import "mcp/internal/analyzer"

// GetApiSchema fetches and parses the API schema.
func GetApiSchema() (interface{}, error) {
	return analyzer.ParseApiSchema("backend/internal/api")
}