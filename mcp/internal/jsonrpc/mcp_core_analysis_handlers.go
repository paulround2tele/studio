package jsonrpc

import (
	"fmt"
	"strings"
)

// Core analysis tool handlers

// callGetModels implements the get_backend_data_models tool
func (s *JSONRPCServer) callGetModels() (interface{}, error) {
	models, err := s.bridge.GetModels()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting models: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d models in the codebase", len(models)),
			},
		},
	}, nil
}

// callGetRoutes implements the get_backend_api_routes tool
func (s *JSONRPCServer) callGetRoutes() (interface{}, error) {
	routes, err := s.bridge.GetRoutes()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting routes: %v", err),
				},
			},
		}, nil
	}

	// Build route summary with essential information
	var routeLines []string
	routeLines = append(routeLines, fmt.Sprintf("Found %d API routes:\n", len(routes)))
	
	for _, route := range routes {
		routeLine := fmt.Sprintf("  %s %s -> %s", route.Method, route.Path, route.Handler)
		routeLines = append(routeLines, routeLine)
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": strings.Join(routeLines, "\n"),
			},
		},
	}, nil
}

// callGetHandlers implements the get_backend_request_handlers tool
func (s *JSONRPCServer) callGetHandlers() (interface{}, error) {
	handlers, err := s.bridge.GetHandlers()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting handlers: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d request handlers", len(handlers)),
			},
		},
	}, nil
}

// callGetServices implements the get_backend_services tool
func (s *JSONRPCServer) callGetServices() (interface{}, error) {
	services, err := s.bridge.GetServices()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting services: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d service definitions", len(services)),
			},
		},
	}, nil
}

// callGetInterfaces implements the get_interfaces tool
func (s *JSONRPCServer) callGetInterfaces() (interface{}, error) {
	interfaces, err := s.bridge.GetInterfaces()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting interfaces: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d interfaces", len(interfaces)),
			},
		},
	}, nil
}

// callFindImplementations implements the find_implementations tool
func (s *JSONRPCServer) callFindImplementations(args map[string]interface{}) (interface{}, error) {
	interfaceName, ok := args["interface"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: interface parameter is required and must be a string",
				},
			},
		}, nil
	}

	implementations, err := s.bridge.FindImplementations(interfaceName)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error finding implementations: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Found %d implementations of interface %s", len(implementations), interfaceName),
			},
		},
	}, nil
}

// callGetCallGraph implements the get_call_graph tool
func (s *JSONRPCServer) callGetCallGraph(args map[string]interface{}) (interface{}, error) {
	functionName, ok := args["function"].(string)
	if !ok {
		functionName = "main" // default function if not specified
	}

	callGraph, err := s.bridge.GetCallGraph(functionName)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting call graph: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Call graph analysis completed for function %s. Found %d relationships", functionName, callGraph.CallCount),
			},
		},
	}, nil
}
