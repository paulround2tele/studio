package jsonrpc

import (
	"fmt"
)

// Business logic tool handlers

// callGetMiddlewareUsage implements the get_middleware_usage tool
func (s *JSONRPCServer) callGetMiddlewareUsage() (interface{}, error) {
	usage, err := s.bridge.GetMiddlewareUsage()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting middleware usage: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Middleware usage analysis: %s", usage),
			},
		},
	}, nil
}

// callGetWorkflows implements the get_workflows tool
func (s *JSONRPCServer) callGetWorkflows() (interface{}, error) {
	workflows, err := s.bridge.GetWorkflows()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting workflows: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d business workflows", len(workflows)),
			},
		},
	}, nil
}

// callGetBusinessRules implements the get_business_rules tool
func (s *JSONRPCServer) callGetBusinessRules() (interface{}, error) {
	rules, err := s.bridge.GetBusinessRules()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting business rules: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d business rules", len(rules)),
			},
		},
	}, nil
}

// callGetFeatureFlags implements the get_feature_flags tool
func (s *JSONRPCServer) callGetFeatureFlags() (interface{}, error) {
	flags, err := s.bridge.GetFeatureFlags()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting feature flags: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d feature flags", len(flags)),
			},
		},
	}, nil
}
