package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"time"
)

type JSONRPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

func main() {
	// Start the MCP server
	cmd := exec.Command("./bin/mcp-server")
	cmd.Dir = "/home/vboxuser/studio/mcp"

	stdin, err := cmd.StdinPipe()
	if err != nil {
		log.Fatal(err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Fatal(err)
	}

	if err := cmd.Start(); err != nil {
		log.Fatal(err)
	}

	// Give the server a moment to start
	time.Sleep(time.Second)

	// Test 1: Initialize the MCP server
	initReq := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "initialize",
		Params: map[string]interface{}{
			"protocolVersion": "2024-11-05",
			"capabilities":    map[string]interface{}{},
			"clientInfo": map[string]interface{}{
				"name":    "test-client",
				"version": "1.0.0",
			},
		},
	}

	// Send initialize request
	reqData, _ := json.Marshal(initReq)
	_, err = stdin.Write(append(reqData, '\n'))
	if err != nil {
		log.Fatal(err)
	}

	// Read response
	scanner := bufio.NewScanner(stdout)
	if scanner.Scan() {
		var response JSONRPCResponse
		if err := json.Unmarshal(scanner.Bytes(), &response); err != nil {
			log.Printf("Failed to parse response: %v", err)
		} else {
			fmt.Printf("Initialize response: %+v\n", response)
		}
	}

	// Test 2: List tools
	toolsReq := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      2,
		Method:  "tools/list",
		Params:  map[string]interface{}{},
	}

	reqData, _ = json.Marshal(toolsReq)
	_, err = stdin.Write(append(reqData, '\n'))
	if err != nil {
		log.Fatal(err)
	}

	// Read response
	if scanner.Scan() {
		var response JSONRPCResponse
		if err := json.Unmarshal(scanner.Bytes(), &response); err != nil {
			log.Printf("Failed to parse tools response: %v", err)
		} else {
			if result, ok := response.Result.(map[string]interface{}); ok {
				if tools, ok := result["tools"].([]interface{}); ok {
					fmt.Printf("Found %d tools\n", len(tools))
					// Print first few tools
					for i, tool := range tools[:min(3, len(tools))] {
						if toolMap, ok := tool.(map[string]interface{}); ok {
							fmt.Printf("Tool %d: %s - %s\n", i+1, toolMap["name"], toolMap["description"])
						}
					}
				}
			}
		}
	}

	// Test 3: Call a tool
	callReq := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      3,
		Method:  "tools/call",
		Params: map[string]interface{}{
			"name":      "get_models",
			"arguments": map[string]interface{}{},
		},
	}

	reqData, _ = json.Marshal(callReq)
	_, err = stdin.Write(append(reqData, '\n'))
	if err != nil {
		log.Fatal(err)
	}

	// Read response
	if scanner.Scan() {
		var response JSONRPCResponse
		if err := json.Unmarshal(scanner.Bytes(), &response); err != nil {
			log.Printf("Failed to parse tool call response: %v", err)
		} else {
			fmt.Printf("Tool call response: %+v\n", response)
		}
	}

	// Clean up
	stdin.Close()
	cmd.Process.Kill()
	cmd.Wait()
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
