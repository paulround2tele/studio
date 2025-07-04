package jsonrpc

import (
	"context"
	"fmt"
)

// WebSocket tool handlers

// callGetWebSocketEndpoints implements the get_websocket_endpoints tool
func (s *JSONRPCServer) callGetWebSocketEndpoints(_ context.Context) (interface{}, error) {
	endpoints, err := s.bridge.GetWebSocketEndpoints()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting WebSocket endpoints: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d WebSocket endpoints", len(endpoints)),
			},
		},
	}, nil
}

// callGetWebSocketHandlers implements the get_websocket_handlers tool
func (s *JSONRPCServer) callGetWebSocketHandlers(_ context.Context) (interface{}, error) {
	handlers, err := s.bridge.GetWebSocketHandlers()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting WebSocket handlers: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d WebSocket handlers", len(handlers)),
			},
		},
	}, nil
}

// callGetWebSocketMessages implements the get_websocket_messages tool
func (s *JSONRPCServer) callGetWebSocketMessages(_ context.Context) (interface{}, error) {
	messages, err := s.bridge.GetWebSocketMessages()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting WebSocket messages: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d WebSocket message types", len(messages)),
			},
		},
	}, nil
}

// callGetWebSocketLifecycle returns runtime statistics about WebSocket connections
func (s *JSONRPCServer) callGetWebSocketLifecycle(_ context.Context) (interface{}, error) {
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

	lifecycle, err := s.bridge.GetWebSocketLifecycle()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting WebSocket lifecycle: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("WebSocket Lifecycle Analysis:\n%+v", lifecycle),
			},
		},
	}, nil
}

// callTestWebSocketFlow actively dials the configured WebSocket endpoint to verify connectivity
func (s *JSONRPCServer) callTestWebSocketFlow(_ context.Context) (interface{}, error) {
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

	result, err := s.bridge.TestWebSocketFlow()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error testing WebSocket flow: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("WebSocket Flow Test Results:\n%+v", result),
			},
		},
	}, nil
}
