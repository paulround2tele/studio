#!/bin/bash

# MCP JSON-RPC Server Startup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Go is installed
if ! command -v go &> /dev/null; then
    print_error "Go is not installed. Please install Go to run the MCP server."
    exit 1
fi

print_status "Go version: $(go version)"

# Set default database connection if not provided
if [ -z "$DB_CONNECTION" ]; then
    export DB_CONNECTION="postgres://user:password@localhost/mcpdb?sslmode=disable"
    print_warning "DB_CONNECTION not set. Using default: $DB_CONNECTION"
fi

# Navigate to the MCP directory
cd "$(dirname "$0")"

print_status "Building MCP JSON-RPC server..."

# Build the server
if go build -o bin/mcp-server ./cmd/mcp-server; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

print_status "Starting MCP JSON-RPC 2.0 server..."
print_status "Server will communicate via stdin/stdout using JSON-RPC 2.0 protocol"
print_status "To test, send JSON-RPC messages to stdin"
print_status "Press Ctrl+C to stop the server"

# Start the server
./bin/mcp-server
