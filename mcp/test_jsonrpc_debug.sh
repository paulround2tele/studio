#!/bin/bash

# Better test script for MCP JSON-RPC server
cd "$(dirname "$0")"

echo "🧪 Testing MCP JSON-RPC Server Tools..."

# Set environment variables
export DB_CONNECTION="postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"

# Function to send JSON-RPC request with proper formatting
send_jsonrpc() {
    local method="$1"
    local params="$2"
    local id="$3"
    
    if [ -z "$params" ] || [ "$params" = "null" ]; then
        local message='{"jsonrpc":"2.0","method":"'$method'","id":'$id'}'
    else
        local message='{"jsonrpc":"2.0","method":"'$method'","params":'$params',"id":'$id'}'
    fi
    
    local content_length=${#message}
    
    echo "📤 Sending: $method"
    echo "📝 Message: $message"
    echo "📏 Length: $content_length"
    
    # Create a temporary file with the complete message
    local temp_file=$(mktemp)
    printf "Content-Length: %d\r\n\r\n%s" "$content_length" "$message" > "$temp_file"
    
    echo "📄 Full message:"
    cat "$temp_file" | od -c
    
    # Send to server
    timeout 3s ./mcp-server < "$temp_file" 2>&1
    rm "$temp_file"
    echo ""
}

echo ""
echo "1️⃣ Testing LSP Initialize..."
send_jsonrpc "initialize" '{"processId":123,"rootPath":"/home/vboxuser/studio","capabilities":{}}' 1

echo ""
echo "2️⃣ Testing MCP Get Database Schema..."
send_jsonrpc "mcp/get_database_schema" '{}' 2
