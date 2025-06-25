#!/bin/bash

# Test script for MCP JSON-RPC 2.0 Server

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Build the server first
echo "Building MCP server..."
cd "$(dirname "$0")"
go build -o mcp-server ./cmd/mcp-server

# Set test environment
export DB_CONNECTION="postgres://user:password@localhost/mcpdb?sslmode=disable"

# Function to send JSON-RPC request and get response
send_jsonrpc() {
    local request="$1"
    local timeout="${2:-5}"
    
    echo -e "$request" | timeout "$timeout" ./mcp-server
}

# Test 1: Initialize request
print_test "Testing initialize request"
INIT_REQUEST='Content-Length: 100\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"processId":null,"capabilities":{}}}'

if response=$(send_jsonrpc "$INIT_REQUEST" 3); then
    if echo "$response" | grep -q '"result"'; then
        print_success "Initialize request successful"
    else
        print_error "Initialize request failed - no result in response"
        echo "Response: $response"
    fi
else
    print_error "Initialize request timed out or failed"
fi

# Test 2: MCP method request
print_test "Testing MCP get_database_schema request"
SCHEMA_REQUEST='Content-Length: 120\r\n\r\n{"jsonrpc":"2.0","id":2,"method":"mcp/get_database_schema","params":{}}'

# Note: This might fail if no database is available, but we should get a proper JSON-RPC error response
if response=$(send_jsonrpc "$SCHEMA_REQUEST" 3); then
    if echo "$response" | grep -q '"jsonrpc":"2.0"'; then
        print_success "MCP schema request returned valid JSON-RPC response"
    else
        print_error "MCP schema request failed - invalid JSON-RPC response"
        echo "Response: $response"
    fi
else
    print_error "MCP schema request timed out or failed"
fi

# Test 3: Invalid method request
print_test "Testing invalid method request"
INVALID_REQUEST='Content-Length: 105\r\n\r\n{"jsonrpc":"2.0","id":3,"method":"invalid_method","params":{}}'

if response=$(send_jsonrpc "$INVALID_REQUEST" 3); then
    if echo "$response" | grep -q '"error"' && echo "$response" | grep -q '-32601'; then
        print_success "Invalid method request properly returned method not found error"
    else
        print_error "Invalid method request did not return proper error"
        echo "Response: $response"
    fi
else
    print_error "Invalid method request timed out or failed"
fi

echo ""
echo "JSON-RPC 2.0 testing completed!"
echo ""
echo "To manually test the server:"
echo "1. Start the server: ./start-mcp-server.sh"
echo "2. Send JSON-RPC messages via stdin"
echo ""
echo "Example manual test:"
echo 'echo -e "Content-Length: 100\\r\\n\\r\\n{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"processId\":null,\"capabilities\":{}}}" | ./mcp-server'
