package server

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/fntelecomllc/studio/mcp-server/internal/config"
	"github.com/fntelecomllc/studio/mcp-server/pkg/bridge"
)

// MCPServer implements JSON-RPC 2.0 protocol for Model Context Protocol
type MCPServer struct {
	config *config.Config
	bridge *bridge.MCPBridge
}

// JSONRPCRequest represents a JSON-RPC 2.0 request
type JSONRPCRequest struct {
	Jsonrpc string                 `json:"jsonrpc"`
	Method  string                 `json:"method"`
	Params  map[string]interface{} `json:"params,omitempty"`
	ID      interface{}            `json:"id"`
}

// JSONRPCResponse represents a JSON-RPC 2.0 response
type JSONRPCResponse struct {
	Jsonrpc string      `json:"jsonrpc"`
	Result  interface{} `json:"result,omitempty"`
	Error   *JSONRPCError `json:"error,omitempty"`
	ID      interface{} `json:"id"`
}

// JSONRPCError represents a JSON-RPC 2.0 error
type JSONRPCError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Standard JSON-RPC 2.0 error codes
const (
	ParseError     = -32700
	InvalidRequest = -32600
	MethodNotFound = -32601
	InvalidParams  = -32602
	InternalError  = -32603
)

// MCP-specific methods
const (
	MethodInitialize = "initialize"
	MethodListTools  = "tools/list"
	MethodCallTool   = "tools/call"
	MethodPing       = "ping"
)

// NewMCPServer creates a new MCP server instance
func NewMCPServer(cfg *config.Config, mcpBridge *bridge.MCPBridge) (*MCPServer, error) {
	return &MCPServer{
		config: cfg,
		bridge: mcpBridge,
	}, nil
}

// HandleRequest processes HTTP requests and routes them to appropriate JSON-RPC handlers
func (s *MCPServer) HandleRequest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeErrorResponse(w, nil, ParseError, "Failed to read request body", err)
		return
	}
	defer r.Body.Close()

	// Parse JSON-RPC request
	var req JSONRPCRequest
	if err := json.Unmarshal(body, &req); err != nil {
		s.writeErrorResponse(w, nil, ParseError, "Invalid JSON", err)
		return
	}

	// Validate JSON-RPC version
	if req.Jsonrpc != "2.0" {
		s.writeErrorResponse(w, req.ID, InvalidRequest, "Invalid JSON-RPC version", nil)
		return
	}

	// Route to appropriate handler
	var result interface{}
	var rpcErr *JSONRPCError

	switch req.Method {
	case MethodInitialize:
		result, rpcErr = s.handleInitialize(req.Params)
	case MethodListTools:
		result, rpcErr = s.handleListTools(req.Params)
	case MethodCallTool:
		result, rpcErr = s.handleCallTool(req.Params)
	case MethodPing:
		result, rpcErr = s.handlePing(req.Params)
	default:
		rpcErr = &JSONRPCError{
			Code:    MethodNotFound,
			Message: fmt.Sprintf("Method not found: %s", req.Method),
		}
	}

	// Write response
	if rpcErr != nil {
		s.writeErrorResponse(w, req.ID, rpcErr.Code, rpcErr.Message, rpcErr.Data)
	} else {
		s.writeSuccessResponse(w, req.ID, result)
	}
}

// handleInitialize handles the MCP initialize method
func (s *MCPServer) handleInitialize(params map[string]interface{}) (interface{}, *JSONRPCError) {
	log.Println("MCP Server initialization requested")
	
	// Extract client info if provided
	clientInfo := make(map[string]interface{})
	if params != nil {
		if name, ok := params["client_name"].(string); ok {
			clientInfo["client_name"] = name
		}
		if version, ok := params["client_version"].(string); ok {
			clientInfo["client_version"] = version
		}
	}

	// Return server capabilities
	return map[string]interface{}{
		"protocol_version": "2024-11-05",
		"capabilities": map[string]interface{}{
			"tools": map[string]interface{}{
				"list_changed": false, // Tools list is static for now
			},
			"resources": map[string]interface{}{},
			"prompts":   map[string]interface{}{},
		},
		"server_info": map[string]interface{}{
			"name":    "studio-mcp-server",
			"version": "1.0.0",
		},
		"client_info": clientInfo,
	}, nil
}

// handleListTools handles the tools/list method
func (s *MCPServer) handleListTools(params map[string]interface{}) (interface{}, *JSONRPCError) {
	log.Println("MCP Tools list requested")
	
	tools := s.bridge.GetAvailableTools()
	
	return map[string]interface{}{
		"tools": tools,
	}, nil
}

// handleCallTool handles the tools/call method
func (s *MCPServer) handleCallTool(params map[string]interface{}) (interface{}, *JSONRPCError) {
	// Extract tool name
	toolName, ok := params["name"].(string)
	if !ok {
		return nil, &JSONRPCError{
			Code:    InvalidParams,
			Message: "Tool name is required",
		}
	}

	// Extract arguments
	args, ok := params["arguments"].(map[string]interface{})
	if !ok {
		args = make(map[string]interface{})
	}

	log.Printf("MCP Tool call requested: %s", toolName)

	// Execute tool through bridge
	result, err := s.bridge.ExecuteTool(toolName, args)
	if err != nil {
		return nil, &JSONRPCError{
			Code:    InternalError,
			Message: fmt.Sprintf("Tool execution failed: %v", err),
		}
	}

	return result, nil
}

// handlePing handles the ping method for health checks
func (s *MCPServer) handlePing(params map[string]interface{}) (interface{}, *JSONRPCError) {
	return map[string]interface{}{
		"status": "ok",
		"timestamp": "2024-01-01T00:00:00Z", // In a real implementation, use time.Now()
	}, nil
}

// writeSuccessResponse writes a successful JSON-RPC response
func (s *MCPServer) writeSuccessResponse(w http.ResponseWriter, id interface{}, result interface{}) {
	response := JSONRPCResponse{
		Jsonrpc: "2.0",
		Result:  result,
		ID:      id,
	}

	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}

// writeErrorResponse writes an error JSON-RPC response
func (s *MCPServer) writeErrorResponse(w http.ResponseWriter, id interface{}, code int, message string, data interface{}) {
	rpcError := &JSONRPCError{
		Code:    code,
		Message: message,
		Data:    data,
	}

	response := JSONRPCResponse{
		Jsonrpc: "2.0",
		Error:   rpcError,
		ID:      id,
	}

	// Set appropriate HTTP status code based on JSON-RPC error
	var httpStatus int
	switch code {
	case ParseError, InvalidRequest, InvalidParams:
		httpStatus = http.StatusBadRequest
	case MethodNotFound:
		httpStatus = http.StatusNotFound
	case InternalError:
		httpStatus = http.StatusInternalServerError
	default:
		httpStatus = http.StatusInternalServerError
	}

	w.WriteHeader(httpStatus)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode error response: %v", err)
	}
}

// ValidateJSONRPCRequest validates that a request conforms to JSON-RPC 2.0 spec
func ValidateJSONRPCRequest(req *JSONRPCRequest) error {
	if req.Jsonrpc != "2.0" {
		return fmt.Errorf("invalid jsonrpc version: %s", req.Jsonrpc)
	}
	
	if strings.TrimSpace(req.Method) == "" {
		return fmt.Errorf("method is required")
	}
	
	// ID can be string, number, or null, but not missing for non-notification requests
	// For simplicity, we'll require ID to be present
	if req.ID == nil {
		return fmt.Errorf("id is required")
	}
	
	return nil
}