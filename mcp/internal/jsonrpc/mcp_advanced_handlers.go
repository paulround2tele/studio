package jsonrpc

import (
	"fmt"
)

// Advanced tool handlers

// callFindByType implements the find_by_type tool
func (s *JSONRPCServer) callFindByType(args map[string]interface{}) (interface{}, error) {
	typeName, ok := args["type"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: type parameter is required and must be a string",
				},
			},
		}, nil
	}

	results, err := s.bridge.FindByType(typeName)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error finding by type: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d elements of type %s", len(results), typeName),
			},
		},
	}, nil
}

// callGetReferences implements the get_references tool
func (s *JSONRPCServer) callGetReferences(args map[string]interface{}) (interface{}, error) {
	symbol, ok := args["symbol"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: symbol parameter is required and must be a string",
				},
			},
		}, nil
	}

	// Use current working directory as default file path
	filePath := "."
	if fp, exists := args["filePath"].(string); exists {
		filePath = fp
	}

	references, err := s.bridge.GetReferences(symbol, filePath)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting references: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d references to symbol %s", len(references), symbol),
			},
		},
	}, nil
}

// callGetChangeImpact implements the get_change_impact tool
func (s *JSONRPCServer) callGetChangeImpact(args map[string]interface{}) (interface{}, error) {
	file, ok := args["file"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: file parameter is required and must be a string",
				},
			},
		}, nil
	}

	impact, err := s.bridge.GetChangeImpact(file)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error analyzing change impact: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Change impact analysis for %s: Files affected: %d, Severity: %s",
					file, impact.FilesAffected, impact.Severity),
			},
		},
	}, nil
}

// callCreateSnapshot implements the snapshot tool
func (s *JSONRPCServer) callCreateSnapshot() (interface{}, error) {
	snapshot, err := s.bridge.CreateSnapshot("MCP Server Snapshot")
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error creating snapshot: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Codebase snapshot created: %s", snapshot.ID),
			},
		},
	}, nil
}

// callCheckContractDrift implements the contract_drift_check tool
func (s *JSONRPCServer) callCheckContractDrift() (interface{}, error) {
	results, err := s.bridge.CheckContractDrift()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error checking contract drift: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Contract drift check completed: %d issues found, Status: %s",
					results.IssuesFound, results.Status),
			},
		},
	}, nil
}
