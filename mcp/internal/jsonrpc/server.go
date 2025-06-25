package jsonrpc

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"

	"mcp/internal/server"
	"mcp/pkg/lsptypes"
)

// JSONRPCServer handles JSON-RPC 2.0 communication
type JSONRPCServer struct {
	bridge   *server.Bridge
	reader   *bufio.Reader
	writer   *bufio.Writer
	ctx      context.Context
	cancel   context.CancelFunc
	mu       sync.Mutex
	handlers map[string]Handler
	shutdown bool
}

// Handler represents a JSON-RPC method handler
type Handler func(ctx context.Context, params json.RawMessage) (interface{}, error)

// NewJSONRPCServer creates a new JSON-RPC server
func NewJSONRPCServer(bridge *server.Bridge, reader io.Reader, writer io.Writer) *JSONRPCServer {
	ctx, cancel := context.WithCancel(context.Background())

	srv := &JSONRPCServer{
		bridge:   bridge,
		reader:   bufio.NewReader(reader),
		writer:   bufio.NewWriter(writer),
		ctx:      ctx,
		cancel:   cancel,
		handlers: make(map[string]Handler),
	}

	// Register standard LSP methods
	srv.registerLSPHandlers()
	// Register MCP-specific methods
	srv.registerMCPHandlers()

	return srv
}

// Run starts the JSON-RPC server
func (s *JSONRPCServer) Run() error {
	log.SetOutput(os.Stderr) // Log to stderr so it doesn't interfere with stdout JSON-RPC messages
	log.Println("MCP JSON-RPC 2.0 server starting...")

	for !s.shutdown {
		select {
		case <-s.ctx.Done():
			return s.ctx.Err()
		default:
			if err := s.handleMessage(); err != nil {
				if err == io.EOF {
					log.Println("Client disconnected")
					return nil
				}
				log.Printf("Error handling message: %v", err)
				continue
			}
		}
	}
	return nil
}

// handleMessage processes a single JSON-RPC message
func (s *JSONRPCServer) handleMessage() error {
	// Try to read a line first to see if it's a Content-Length header (LSP style)
	// or direct JSON (MCP style)
	line, err := s.reader.ReadString('\n')
	if err != nil {
		return err
	}

	// Check if it's LSP-style with Content-Length header
	if strings.HasPrefix(line, "Content-Length:") {
		return s.handleLSPMessage(line)
	}

	// Otherwise, it's direct JSON (MCP style)
	return s.handleMCPMessage(line)
}

// handleLSPMessage handles LSP-style messages with Content-Length headers
func (s *JSONRPCServer) handleLSPMessage(firstLine string) error {
	lengthStr := strings.TrimSpace(strings.TrimPrefix(firstLine, "Content-Length:"))
	contentLength, err := strconv.Atoi(lengthStr)
	if err != nil {
		return fmt.Errorf("invalid Content-Length: %v", err)
	}

	// Read empty line after headers
	_, err = s.reader.ReadString('\n')
	if err != nil {
		return err
	}

	// Read message body
	body := make([]byte, contentLength)
	_, err = io.ReadFull(s.reader, body)
	if err != nil {
		return err
	}

	return s.processJSONMessage(body)
}

// handleMCPMessage handles direct JSON messages (MCP style)
func (s *JSONRPCServer) handleMCPMessage(jsonLine string) error {
	// The line already contains the JSON message
	jsonLine = strings.TrimSpace(jsonLine)
	if jsonLine == "" {
		return nil // Empty line, ignore
	}

	return s.processJSONMessage([]byte(jsonLine))
}

// processJSONMessage processes the actual JSON message
func (s *JSONRPCServer) processJSONMessage(body []byte) error {
	var msg lsptypes.LSPMessage
	if err := json.Unmarshal(body, &msg); err != nil {
		s.sendErrorResponse(nil, -32700, fmt.Sprintf("Parse Error: %v", err))
		return nil
	}

	log.Printf("Received method: %s", msg.Method)

	// Handle the message
	if handler, exists := s.handlers[msg.Method]; exists {
		go s.processRequest(msg, handler)
	} else {
		s.sendErrorResponse(msg.ID, -32601, fmt.Sprintf("Method not found: %s", msg.Method))
	}

	return nil
}

// processRequest handles a JSON-RPC request
func (s *JSONRPCServer) processRequest(msg lsptypes.LSPMessage, handler Handler) {
	result, err := handler(s.ctx, msg.Params)
	if err != nil {
		s.sendErrorResponse(msg.ID, -32000, err.Error())
		return
	}

	// For notifications (no ID), don't send a response
	if msg.ID == nil {
		return
	}

	s.sendResponse(msg.ID, result)
}

// sendResponse sends a successful JSON-RPC response
func (s *JSONRPCServer) sendResponse(id *int, result interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var resultBytes json.RawMessage
	if result != nil {
		data, err := json.Marshal(result)
		if err != nil {
			s.sendErrorResponse(id, -32000, fmt.Sprintf("Internal error: %v", err))
			return
		}
		resultBytes = data
	}

	resp := lsptypes.LSPMessage{
		JSONRPC: "2.0",
		ID:      id,
		Result:  resultBytes,
	}

	s.sendMessage(resp)
}

// sendErrorResponse sends an error JSON-RPC response
func (s *JSONRPCServer) sendErrorResponse(id *int, code int, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	errObj := lsptypes.LSPError{
		Code:    code,
		Message: message,
	}

	resp := lsptypes.LSPMessage{
		JSONRPC: "2.0",
		ID:      id,
		Error:   &errObj,
	}

	s.sendMessage(resp)
}

// sendMessage sends a JSON-RPC message (MCP style - direct JSON)
func (s *JSONRPCServer) sendMessage(msg lsptypes.LSPMessage) {
	jsonMsg, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	// Send direct JSON for MCP protocol
	s.writer.Write(jsonMsg)
	s.writer.Write([]byte("\n"))
	s.writer.Flush()
}

// Shutdown gracefully shuts down the server
func (s *JSONRPCServer) Shutdown() {
	s.shutdown = true
	s.cancel()
}
