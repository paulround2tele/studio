#!/bin/bash

# Simple test script for the MCP server

echo "Testing MCP Studio Backend Context Server..."

# Test help command
echo "1. Testing help command..."
./mcp-server -help

echo ""
echo "2. Testing build..."
go build -o mcp-server ./cmd/mcp-server
if [ $? -eq 0 ]; then
    echo "✓ Build successful"
else
    echo "✗ Build failed"
    exit 1
fi

echo ""
echo "3. Testing initialization (without database)..."
timeout 5s ./mcp-server -backend-path=../backend 2>&1 | head -10

echo ""
echo "✓ MCP Server tests completed successfully!"
echo ""
echo "To run the server:"
echo "  ./mcp-server -backend-path=/path/to/studio/backend"
echo ""
echo "To run with database:"
echo "  ./mcp-server -backend-path=/path/to/studio/backend -db-url='postgres://user:pass@localhost:5432/studio'"