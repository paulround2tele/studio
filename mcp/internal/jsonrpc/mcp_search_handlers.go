package jsonrpc

import (
	"context"
	"fmt"
)

// Search tool handlers

// callSearchCode implements the search_code tool
func (s *JSONRPCServer) callSearchCode(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	query, ok := args["query"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: query parameter is required and must be a string",
				},
			},
		}, nil
	}

	results, err := s.bridge.SearchCode(query)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error searching code: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d code matches for query: %s", len(results), query),
			},
		},
	}, nil
}

// callGetPackageStructure implements the get_package_structure tool
func (s *JSONRPCServer) callGetPackageStructure(ctx context.Context) (interface{}, error) {
	structure, err := s.bridge.GetPackageStructure()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting package structure: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Package structure analyzed: %s", structure),
			},
		},
	}, nil
}

// callGetDependencies implements the get_dependencies tool
func (s *JSONRPCServer) callGetDependencies(ctx context.Context) (interface{}, error) {
	dependencies, err := s.bridge.GetDependencies()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting dependencies: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d project dependencies", len(dependencies)),
			},
		},
	}, nil
}
