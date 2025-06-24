package main

import (
	"encoding/json"
	"fmt"
	"log"
	"mcp/pkg/lsptypes"
	"os"
)

func main() {
	// Prepare the initialize message
	processID := os.Getpid()
	rootPath := "/home/vboxuser/studio"
	params := lsptypes.InitializeParams{
		ProcessID:    &processID,
		RootPath:     &rootPath,
		Capabilities: json.RawMessage(`{}`),
	}
	paramsJSON, err := json.Marshal(params)
	if err != nil {
		log.Fatalf("Failed to marshal params: %v", err)
	}

	msg := lsptypes.LSPMessage{
		JSONRPC: "2.0",
		ID:      pointy(1),
		Method:  "initialize",
		Params:  paramsJSON,
	}

	// Send the message
	sendLSPMessage(os.Stdout, msg)
}

func sendLSPMessage(writer *os.File, msg lsptypes.LSPMessage) {
	jsonMsg, err := json.Marshal(msg)
	if err != nil {
		log.Fatalf("Error marshaling LSP message: %v", err)
	}

	fmt.Fprintf(writer, "Content-Length: %d\r\n", len(jsonMsg))
	fmt.Fprintf(writer, "Content-Type: application/json\r\n\r\n")
	writer.Write(jsonMsg)
}

func pointy(i int) *int {
	return &i
}
