package jsonrpc

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"sync"

	"mcp/internal/server"
	"mcp/pkg/lsptypes"
)

// JSONRPCServer handles JSON-RPC 2.0 communication
type JSONRPCServer struct {
	bridge       *server.Bridge
	reader       *bufio.Reader
	writer       *bufio.Writer
	ctx          context.Context
	cancel       context.CancelFunc
	mu           sync.Mutex
	handlers     map[string]Handler
	shutdown     bool
	toolRegistry *ToolRegistry
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

	// Register MCP-specific methods only (not LSP)
	srv.registerMCPHandlers()

	return srv
}

// Run starts the JSON-RPC server and handles incoming messages
func (s *JSONRPCServer) Run() error {
	log.Printf("Starting JSON-RPC server...")

	// Enhanced debug logging to confirm stdin reading and message processing
	log.Printf("DEBUG: Entering message loop, waiting for input...")

	for {
		select {
		case <-s.ctx.Done():
			log.Printf("Server context cancelled, shutting down...")
			return nil
		default:
			// Read and process messages
			message, err := s.readMessage()
			if err != nil {
				if err == io.EOF {
					log.Printf("Client disconnected")
					return nil
				}
				log.Printf("Error reading message: %v", err)
				continue
			}

			log.Printf("DEBUG: Received message: %s", string(message))

			// Process the message
			s.processJSONMessage(message)
		}
	}
}

// readMessage reads a JSON-RPC 2.0 message from stdin
func (s *JSONRPCServer) readMessage() ([]byte, error) {
	// Read a single line (JSON-RPC 2.0 message)
	line, err := s.reader.ReadString('\n')
	if err != nil {
		return nil, err
	}

	// Log the raw line read from stdin
	log.Printf("DEBUG: Raw input line: %s", line)

	line = strings.TrimSpace(line)
	if line == "" {
		// Empty line, try again
		return s.readMessage()
	}

	return []byte(line), nil
}

// processJSONMessage processes the actual JSON message
func (s *JSONRPCServer) processJSONMessage(body []byte) error {
	var msg lsptypes.LSPMessage
	if err := json.Unmarshal(body, &msg); err != nil {
		s.sendErrorResponse(nil, -32700, fmt.Sprintf("Parse Error: %v", err))
		return nil
	}

	log.Printf("Received method: %s", msg.Method)

	// Log the parsed JSON message
	log.Printf("DEBUG: Parsed JSON message: %+v", msg)

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
