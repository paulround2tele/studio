#!/bin/bash

# test.sh - MCP Server Validation Script
# This script validates the MCP server implementation

set -e

echo "🧪 MCP Server Validation Script"
echo "================================"

# Configuration
MCP_SERVER_PORT=${MCP_SERVER_PORT:-8081}
MCP_SERVER_HOST=${MCP_SERVER_HOST:-localhost}
MCP_SERVER_URL="http://${MCP_SERVER_HOST}:${MCP_SERVER_PORT}"
BACKEND_PATH=${BACKEND_PATH:-"../backend"}
TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

run_test() {
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "\n${BLUE}Test $TESTS_RUN: $1${NC}"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v go &> /dev/null; then
        log_error "Go is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed - JSON responses will not be formatted"
        JQ_AVAILABLE=false
    else
        JQ_AVAILABLE=true
    fi
    
    log_success "Dependencies check passed"
}

# Build the MCP server
build_server() {
    run_test "Building MCP server"
    
    if go build -o bin/mcp-server ./cmd/mcp-server; then
        log_success "MCP server built successfully"
    else
        log_error "Failed to build MCP server"
        exit 1
    fi
}

# Start the MCP server
start_server() {
    run_test "Starting MCP server"
    
    log_info "Starting MCP server on port $MCP_SERVER_PORT..."
    
    # Start server in background
    ./bin/mcp-server -backend-path="$BACKEND_PATH" -port="$MCP_SERVER_PORT" -log-level=info &
    SERVER_PID=$!
    
    # Wait for server to start
    log_info "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s "$MCP_SERVER_URL/health" > /dev/null 2>&1; then
            log_success "MCP server started (PID: $SERVER_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "MCP server failed to start within timeout"
    exit 1
}

# Stop the MCP server
stop_server() {
    if [ ! -z "$SERVER_PID" ]; then
        log_info "Stopping MCP server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        sleep 2
        log_success "MCP server stopped"
    fi
}

# Test health endpoint
test_health_endpoint() {
    run_test "Testing health endpoint"
    
    local response=$(curl -s "$MCP_SERVER_URL/health")
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"status":"ok"'; then
            log_success "Health endpoint working correctly"
        else
            log_error "Health endpoint returned unexpected response: $response"
        fi
    else
        log_error "Health endpoint is not accessible"
    fi
}

# Test JSON-RPC ping
test_jsonrpc_ping() {
    run_test "Testing JSON-RPC ping method"
    
    local request='{"jsonrpc":"2.0","method":"ping","id":1}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"result"'; then
            log_success "JSON-RPC ping successful"
            if [ "$JQ_AVAILABLE" = true ]; then
                echo "Response: $(echo "$response" | jq .)"
            fi
        else
            log_error "JSON-RPC ping failed: $response"
        fi
    else
        log_error "JSON-RPC ping request failed"
    fi
}

# Test initialize method
test_initialize() {
    run_test "Testing MCP initialize method"
    
    local request='{"jsonrpc":"2.0","method":"initialize","params":{"client_name":"test-client","client_version":"1.0.0"},"id":2}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"capabilities"'; then
            log_success "MCP initialize successful"
            if [ "$JQ_AVAILABLE" = true ]; then
                echo "Server capabilities: $(echo "$response" | jq '.result.capabilities')"
            fi
        else
            log_error "MCP initialize failed: $response"
        fi
    else
        log_error "MCP initialize request failed"
    fi
}

# Test tools list
test_tools_list() {
    run_test "Testing tools/list method"
    
    local request='{"jsonrpc":"2.0","method":"tools/list","id":3}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"tools"'; then
            local tool_count=$(echo "$response" | grep -o '"name"' | wc -l)
            log_success "Tools list retrieved successfully - Found $tool_count tools"
            if [ "$JQ_AVAILABLE" = true ]; then
                echo "Available tools: $(echo "$response" | jq '.result.tools[].name')"
            fi
        else
            log_error "Tools list failed: $response"
        fi
    else
        log_error "Tools list request failed"
    fi
}

# Test package structure tool
test_package_structure_tool() {
    run_test "Testing get_package_structure tool"
    
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_package_structure","arguments":{"depth":2}},"id":4}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"content"'; then
            log_success "Package structure tool executed successfully"
            if [ "$JQ_AVAILABLE" = true ]; then
                echo "Tool response: $(echo "$response" | jq '.result')"
            fi
        else
            log_error "Package structure tool failed: $response"
        fi
    else
        log_error "Package structure tool request failed"
    fi
}

# Test find by type tool
test_find_by_type_tool() {
    run_test "Testing find_by_type tool"
    
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"find_by_type","arguments":{"type_name":"Config"}},"id":5}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"content"'; then
            log_success "Find by type tool executed successfully"
            if [ "$JQ_AVAILABLE" = true ]; then
                echo "Tool response: $(echo "$response" | jq '.result')"
            fi
        else
            log_error "Find by type tool failed: $response"
        fi
    else
        log_error "Find by type tool request failed"
    fi
}

# Test error handling
test_error_handling() {
    run_test "Testing error handling"
    
    # Test invalid method
    local request='{"jsonrpc":"2.0","method":"invalid_method","id":6}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"error"' && echo "$response" | grep -q '"code":-32601'; then
            log_success "Error handling working correctly for invalid method"
        else
            log_error "Error handling not working correctly: $response"
        fi
    else
        log_error "Error handling test request failed"
    fi
    
    # Test invalid JSON
    local invalid_json='{"jsonrpc":"2.0","method":"ping"'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$invalid_json")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"error"' && echo "$response" | grep -q '"code":-32700'; then
            log_success "Error handling working correctly for invalid JSON"
        else
            log_error "Error handling not working correctly for invalid JSON: $response"
        fi
    else
        log_error "Invalid JSON test request failed"
    fi
}

# Test configuration loading
test_configuration() {
    run_test "Testing configuration validation"
    
    # Test with valid backend path
    if [ -d "$BACKEND_PATH" ]; then
        log_success "Backend path validation passed"
    else
        log_error "Backend path does not exist: $BACKEND_PATH"
    fi
    
    # Test config file loading
    if [ -f "config/config.json" ]; then
        log_success "Default config file exists"
    else
        log_error "Default config file not found"
    fi
    
    # Test .copilot config file
    if [ -f ".copilot/config.json" ]; then
        log_success ".copilot/config.json exists"
    else
        log_warning ".copilot/config.json not found"
    fi
}

# Test performance
test_performance() {
    run_test "Testing basic performance"
    
    log_info "Running 10 concurrent ping requests..."
    local start_time=$(date +%s.%N)
    
    for i in {1..10}; do
        (curl -s -X POST "$MCP_SERVER_URL/mcp" \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"ping","id":'$i'}' > /dev/null) &
    done
    wait
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
    
    if [ $? -eq 0 ]; then
        log_success "Performance test completed in ${duration}s"
    else
        log_warning "Performance test completed (timing unavailable)"
    fi
}

# Cleanup function
cleanup() {
    echo ""
    log_info "Cleaning up..."
    stop_server
    
    # Clean up build artifacts
    rm -f bin/mcp-server
    
    # Print test summary
    echo ""
    echo "🏁 Test Summary"
    echo "==============="
    echo "Tests run: $TESTS_RUN"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "\n${RED}❌ Some tests failed. Please check the output above.${NC}"
        exit 1
    else
        echo -e "\n${GREEN}✅ All tests passed!${NC}"
        exit 0
    fi
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    echo "Backend path: $BACKEND_PATH"
    echo "Server URL: $MCP_SERVER_URL"
    echo ""
    
    check_dependencies
    test_configuration
    build_server
    start_server
    
    # Give server a moment to fully initialize
    sleep 2
    
    test_health_endpoint
    test_jsonrpc_ping
    test_initialize
    test_tools_list
    test_package_structure_tool
    test_find_by_type_tool
    test_error_handling
    test_performance
    
    log_success "All validation tests completed successfully!"
}

# Run main function
main "$@"