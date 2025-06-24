#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Building MCP server..."
(cd mcp && go build -o ../mcp-server cmd/mcpserver/main.go)
echo "Build complete."

echo "Starting MCP server..."
# Read DB_URL from .db_connection file
DB_URL=$(cat .db_connection)

# Execute the server with the required flags
./mcp-server -db-url "$DB_URL" -allow-terminal -allow-mutation