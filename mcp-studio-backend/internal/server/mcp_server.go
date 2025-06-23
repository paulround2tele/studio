package server

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/models"
)

// MCPServer implements the Model Context Protocol server
type MCPServer struct {
	config   *models.Config
	tools    map[string]Tool
	handlers map[string]ToolHandler
}

// Tool represents an MCP tool
type Tool interface {
	Name() string
	Description() string
	Schema() models.ToolSchema
}

// ToolHandler handles tool execution
type ToolHandler func(args map[string]interface{}) (*models.ToolCallResponse, error)

// NewMCPServer creates a new MCP server instance
func NewMCPServer(config *models.Config) *MCPServer {
	return &MCPServer{
		config:   config,
		tools:    make(map[string]Tool),
		handlers: make(map[string]ToolHandler),
	}
}

// RegisterTool registers a tool with the server
func (s *MCPServer) RegisterTool(tool Tool, handler ToolHandler) {
	s.tools[tool.Name()] = tool
	s.handlers[tool.Name()] = handler
}

// Run starts the MCP server
func (s *MCPServer) Run() error {
	reader := bufio.NewReader(os.Stdin)
	
	for {
		line, err := reader.ReadBytes('\n')
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("error reading input: %w", err)
		}

		var request models.MCPRequest
		if err := json.Unmarshal(line, &request); err != nil {
			s.sendError(request.ID, -32700, "Parse error", nil)
			continue
		}

		s.handleRequest(&request)
	}

	return nil
}

// handleRequest processes incoming MCP requests
func (s *MCPServer) handleRequest(request *models.MCPRequest) {
	switch request.Method {
	case "initialize":
		s.handleInitialize(request)
	case "tools/list":
		s.handleToolsList(request)
	case "tools/call":
		s.handleToolCall(request)
	default:
		s.sendError(request.ID, -32601, "Method not found", nil)
	}
}

// handleInitialize handles the initialize request
func (s *MCPServer) handleInitialize(request *models.MCPRequest) {
	response := models.MCPResponse{
		Jsonrpc: "2.0",
		ID:      request.ID,
		Result: map[string]interface{}{
			"protocolVersion": "2024-11-05",
			"capabilities": map[string]interface{}{
				"tools": map[string]interface{}{},
			},
			"serverInfo": map[string]interface{}{
				"name":    "studio-backend-mcp",
				"version": "1.0.0",
			},
		},
	}

	s.sendResponse(&response)
}

// handleToolsList handles the tools list request
func (s *MCPServer) handleToolsList(request *models.MCPRequest) {
	var tools []models.Tool
	
	for _, tool := range s.tools {
		tools = append(tools, models.Tool{
			Name:        tool.Name(),
			Description: tool.Description(),
			InputSchema: tool.Schema(),
		})
	}

	response := models.MCPResponse{
		Jsonrpc: "2.0",
		ID:      request.ID,
		Result: map[string]interface{}{
			"tools": tools,
		},
	}

	s.sendResponse(&response)
}

// handleToolCall handles tool execution requests
func (s *MCPServer) handleToolCall(request *models.MCPRequest) {
	var params models.ToolCallRequest
	if err := json.Unmarshal(request.Params, &params); err != nil {
		s.sendError(request.ID, -32602, "Invalid params", nil)
		return
	}

	handler, exists := s.handlers[params.Name]
	if !exists {
		s.sendError(request.ID, -32601, fmt.Sprintf("Tool '%s' not found", params.Name), nil)
		return
	}

	result, err := handler(params.Arguments)
	if err != nil {
		s.sendError(request.ID, -32603, err.Error(), nil)
		return
	}

	response := models.MCPResponse{
		Jsonrpc: "2.0",
		ID:      request.ID,
		Result:  result,
	}

	s.sendResponse(&response)
}

// sendResponse sends a response to stdout
func (s *MCPServer) sendResponse(response *models.MCPResponse) {
	data, _ := json.Marshal(response)
	fmt.Println(string(data))
}

// sendError sends an error response
func (s *MCPServer) sendError(id interface{}, code int, message string, data interface{}) {
	response := models.MCPResponse{
		Jsonrpc: "2.0",
		ID:      id,
		Error: &models.MCPError{
			Code:    code,
			Message: message,
			Data:    data,
		},
	}

	s.sendResponse(&response)
}