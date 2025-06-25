package jsonrpc

import (
	"fmt"

	"github.com/google/uuid"
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

// callGetCampaignPipeline implements the get_campaign_pipeline tool
func (s *JSONRPCServer) callGetCampaignPipeline(args map[string]interface{}) (interface{}, error) {
	idStr, ok := args["campaignId"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "campaignId parameter is required",
				},
			},
		}, nil
	}

	campaignID, err := uuid.Parse(idStr)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("invalid campaignId: %v", err),
				},
			},
		}, nil
	}

	pipeline, err := s.bridge.GetCampaignPipeline(campaignID)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting campaign pipeline: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Campaign pipeline has %d steps", len(pipeline.Steps)),
			},
		},
	}, nil
}
