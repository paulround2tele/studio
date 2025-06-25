#!/bin/bash

# Run DomainFlow API Server without database connection
# Useful for API contract validation, OpenAPI spec serving, etc.

set -e

echo "🚀 Starting DomainFlow API Server (No Database Mode)"
echo "=================================================="

# Change to backend directory
cd "$(dirname "$0")"

# Set environment variables for no-db mode
export PORT="${PORT:-8080}"
export GIN_MODE="${GIN_MODE:-debug}"

echo "Configuration:"
echo "  - Port: $PORT"
echo "  - Mode: $GIN_MODE"
echo ""

# Build and run the no-db version
echo "Building no-database server..."
go build -o ../bin/apiserver-no-db ./cmd/apiserver-no-db

echo "Starting server..."
echo "Available at: http://localhost:$PORT"
echo ""
echo "Useful endpoints:"
echo "  - http://localhost:$PORT/ping"
echo "  - http://localhost:$PORT/health" 
echo "  - http://localhost:$PORT/api/openapi.yaml"
echo "  - http://localhost:$PORT/api/v2/contract/validate"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="

../bin/apiserver-no-db
