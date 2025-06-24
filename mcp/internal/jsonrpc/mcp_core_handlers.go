package jsonrpc

import (
	"context"
	"encoding/json"
	"log"
	"mcp/internal/models"
)

// registerMCPHandlers registers MCP-specific method handlers
func (s *JSONRPCServer) registerMCPHandlers() {
	// MCP protocol methods
	s.handlers["initialize"] = s.handleMCPInitialize
	s.handlers["notifications/initialized"] = s.handleMCPInitialized

	// MCP tools
	s.handlers["tools/list"] = s.handleListTools
	s.handlers["tools/call"] = s.handleCallTool
}

// handleMCPInitialize handles MCP initialize request
func (s *JSONRPCServer) handleMCPInitialize(ctx context.Context, params json.RawMessage) (interface{}, error) {
	var initParams models.MCPInitializeParams
	if err := json.Unmarshal(params, &initParams); err != nil {
		return nil, err
	}

	log.Printf("MCP Initialize request from client: %s %s", initParams.ClientInfo.Name, initParams.ClientInfo.Version)

	result := models.MCPInitializeResult{
		ProtocolVersion: "2025-03-26",
		Capabilities: map[string]interface{}{
			"tools": map[string]interface{}{},
		},
		ServerInfo: struct {
			Name    string `json:"name"`
			Version string `json:"version"`
		}{
			Name:    "MCP Go Server",
			Version: "1.0.0",
		},
	}

	return result, nil
}

// handleMCPInitialized handles MCP initialized notification
func (s *JSONRPCServer) handleMCPInitialized(ctx context.Context, params json.RawMessage) (interface{}, error) {
	log.Println("MCP client initialized successfully")
	return nil, nil
}
