package jsonrpc

import (
	"context"
	"fmt"
)

// Browser tool handlers

// callBrowseWithPlaywright implements the browse_with_playwright tool
func (s *JSONRPCServer) callBrowseWithPlaywright(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	url, ok := args["url"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: url parameter is required and must be a string"},
			},
		}, nil
	}

	result, err := s.bridge.BrowseWithPlaywright(url)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": fmt.Sprintf("Error running Playwright: %v", err)},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{"type": "text", "text": fmt.Sprintf("Fetched %s - screenshot saved to %s", result.URL, result.Screenshot)},
		},
	}, nil
}
