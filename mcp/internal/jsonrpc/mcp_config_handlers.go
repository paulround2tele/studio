package jsonrpc

import (
	"fmt"
)

// Configuration tool handlers

// callGetConfig implements the get_config tool
func (s *JSONRPCServer) callGetConfig() (interface{}, error) {
	config, err := s.bridge.GetConfig()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting config: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Configuration retrieved: %s", config),
			},
		},
	}, nil
}

// callGetMiddleware implements the get_middleware tool
func (s *JSONRPCServer) callGetMiddleware() (interface{}, error) {
	middleware, err := s.bridge.GetMiddleware()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting middleware: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d middleware configurations", len(middleware)),
			},
		},
	}, nil
}

// callGetEnvVars implements the get_env_vars tool
func (s *JSONRPCServer) callGetEnvVars() (interface{}, error) {
	envVars, err := s.bridge.GetEnvVars()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting environment variables: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d environment variables", len(envVars)),
			},
		},
	}, nil
}

// callTraceMiddlewareFlow traces the configured middleware order by inspecting the router
func (s *JSONRPCServer) callTraceMiddlewareFlow() (interface{}, error) {
	if s.bridge == nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Bridge not initialized",
				},
			},
		}, nil
	}

	flow, err := s.bridge.TraceMiddlewareFlow()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error tracing middleware flow: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Middleware Flow Trace:\n%+v", flow),
			},
		},
	}, nil
}
