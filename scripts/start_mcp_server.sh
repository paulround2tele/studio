#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Building MCP server..."
(cd mcp && go build -o bin/mcp-server cmd/mcp-server/main.go)
echo "Build complete."

# Read DB_URL from .db_connection file
DB_URL=$(cat .db_connection)

echo "Starting MCP server..."
./mcp/bin/mcp-server -db-url "$DB_URL" -allow-terminal -allow-mutation


