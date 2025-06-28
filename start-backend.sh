#!/bin/bash
# DomainFlow Backend Startup Script
# Sources environment variables and starts the backend server

set -e

# Source environment variables from .env file
if [ -f ".env" ]; then
    echo "Loading environment variables from .env..."
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
    echo "✓ Environment variables loaded"
else
    echo "Warning: .env file not found in current directory"
fi

# Start the backend server
echo "Starting DomainFlow API Server..."
exec ./backend/apiserver "$@"
