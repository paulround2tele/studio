#!/bin/bash

# Contract validation script
# Tests API endpoints against OpenAPI specification without requiring database

set -e

echo "🔍 API Contract Validation (No Database Required)"
echo "================================================="

# Start the server in background
echo "Starting server..."
cd "$(dirname "$0")"

# Build if needed
if [ ! -f bin/apiserver ]; then
    echo "Building server..."
    make build
fi

# Start server in background
PORT=8080 ./bin/apiserver &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 2

# Function to cleanup server on exit
cleanup() {
    echo "Stopping server..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo "Server stopped."
}
trap cleanup EXIT

BASE_URL="http://localhost:8080"

echo "Testing endpoints..."
echo "==================="

# Test ping endpoint
echo -n "Testing /ping... "
response=$(curl -s "$BASE_URL/ping" || echo "FAILED")
if echo "$response" | grep -q "pong"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test health endpoint
echo -n "Testing /health... "
response=$(curl -s "$BASE_URL/health" || echo "FAILED")
if echo "$response" | grep -q "healthy"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test OpenAPI spec endpoint
echo -n "Testing /api/openapi.yaml... "
response=$(curl -s -I "$BASE_URL/api/openapi.yaml" | head -n1 || echo "FAILED")
if echo "$response" | grep -q "200 OK"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test contract validation endpoint
echo -n "Testing /api/v2/contract/validate... "
response=$(curl -s "$BASE_URL/api/v2/contract/validate" || echo "FAILED")
if echo "$response" | grep -q "openapi_version"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test mock auth endpoint
echo -n "Testing /api/v2/me... "
response=$(curl -s "$BASE_URL/api/v2/me" || echo "FAILED")
if echo "$response" | grep -q "mock_mode"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test mock campaigns endpoint
echo -n "Testing /api/v2/campaigns... "
response=$(curl -s "$BASE_URL/api/v2/campaigns" || echo "FAILED")
if echo "$response" | grep -q "campaigns"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

echo ""
echo "Contract validation complete!"
echo "OpenAPI spec available at: $BASE_URL/api/openapi.yaml"
echo "Contract validation at: $BASE_URL/api/v2/contract/validate"
