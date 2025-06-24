#!/bin/bash
# Build script for MCP server - always builds to the same location

cd /home/vboxuser/studio/mcp

echo "Building MCP server..."
go build -o bin/mcp-server ./cmd/mcp-server

if [ $? -eq 0 ]; then
    echo "✅ MCP server built successfully at: $(pwd)/bin/mcp-server"
    ls -la bin/mcp-server
else
    echo "❌ Build failed"
    exit 1
fi
