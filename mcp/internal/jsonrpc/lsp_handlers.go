package jsonrpc

import (
	"context"
	"encoding/json"
	"log"

	"mcp/pkg/lsptypes"
)

// registerLSPHandlers registers standard LSP protocol handlers
func (s *JSONRPCServer) registerLSPHandlers() {
	s.handlers["initialize"] = s.handleInitialize
	s.handlers["initialized"] = s.handleInitialized
	s.handlers["shutdown"] = s.handleShutdown
	s.handlers["exit"] = s.handleExit
}

// handleInitialize handles the LSP initialize request
func (s *JSONRPCServer) handleInitialize(ctx context.Context, params json.RawMessage) (interface{}, error) {
	var initParams lsptypes.InitializeParams
	if err := json.Unmarshal(params, &initParams); err != nil {
		return nil, err
	}

	log.Printf("Initialize request from client with capabilities")

	// Enable full text document synchronization
	textDocSync := 1
	hoverProvider := true

	result := lsptypes.InitializeResult{
		Capabilities: lsptypes.ServerCapabilities{
			TextDocumentSync: &textDocSync,
			HoverProvider:    &hoverProvider,
			CompletionProvider: &lsptypes.CompletionOptions{
				TriggerCharacters: []string{".", "/", "@"},
				ResolveProvider:   &[]bool{false}[0],
			},
			ExecuteCommandProvider: &lsptypes.ExecuteCommandOptions{
				Commands: []string{
					"mcp.getDatabaseSchema",
					"mcp.applyCodeChange",
					"mcp.getModels",
					"mcp.getEndpoints",
					"mcp.searchCode",
					"mcp.getConfig",
				},
			},
			Experimental: map[string]interface{}{
				"mcpServerCapabilities": map[string]interface{}{
					"databaseSchema": true,
					"codeChanges":    true,
					"modelAnalysis":  true,
					"endpointQuery":  true,
					"codeSearch":     true,
					"configAccess":   true,
				},
			},
		},
		ServerInfo: &lsptypes.ServerInfo{
			Name:    "MCP Language Server",
			Version: "1.0.0",
		},
	}

	return result, nil
}

// handleInitialized handles the LSP initialized notification
func (s *JSONRPCServer) handleInitialized(ctx context.Context, params json.RawMessage) (interface{}, error) {
	log.Println("Client initialized successfully")
	return nil, nil
}

// handleShutdown handles the LSP shutdown request
func (s *JSONRPCServer) handleShutdown(ctx context.Context, params json.RawMessage) (interface{}, error) {
	log.Println("Shutdown request received")
	return nil, nil
}

// handleExit handles the LSP exit notification
func (s *JSONRPCServer) handleExit(ctx context.Context, params json.RawMessage) (interface{}, error) {
	log.Println("Exit notification received")
	s.Shutdown()
	return nil, nil
}
