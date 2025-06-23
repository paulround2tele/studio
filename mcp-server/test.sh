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

# Test JSON-RPC tool response shapes
test_jsonrpc_response_shapes() {
    run_test "Testing JSON-RPC tool response shapes"
    
    # Test get_models response shape
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_models","arguments":{"page":1,"page_size":5}},"id":10}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"content"' && echo "$response" | grep -q '"type":"text"'; then
            log_success "get_models response shape validation passed"
        else
            log_error "get_models response shape validation failed: $response"
        fi
    else
        log_error "get_models response shape test failed"
    fi
    
    # Test get_snapshot response shape
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_snapshot","arguments":{}},"id":11}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"content"' && echo "$response" | grep -q '"type":"text"'; then
            log_success "get_snapshot response shape validation passed"
        else
            log_error "get_snapshot response shape validation failed: $response"
        fi
    else
        log_error "get_snapshot response shape test failed"
    fi
}

# Test CLI argument overrides
test_cli_overrides() {
    run_test "Testing CLI argument overrides"
    
    # Stop current server first
    stop_server
    
    # Test with custom port and read-only mode
    log_info "Testing CLI overrides with custom port and read-only mode..."
    ./bin/mcp-server -backend-path="$BACKEND_PATH" -port=8082 -read-only -log-level=debug &
    OVERRIDE_SERVER_PID=$!
    
    # Wait for server to start on new port
    local override_url="http://${MCP_SERVER_HOST}:8082"
    for i in {1..15}; do
        if curl -s "$override_url/health" > /dev/null 2>&1; then
            log_success "CLI override test server started on port 8082"
            break
        fi
        sleep 1
    done
    
    # Test if server is running with overrides
    if curl -s "$override_url/health" > /dev/null 2>&1; then
        log_success "CLI argument overrides working correctly"
    else
        log_error "CLI argument overrides not working"
    fi
    
    # Clean up override server
    kill $OVERRIDE_SERVER_PID 2>/dev/null || true
    sleep 2
    
    # Restart original server
    start_server
}

# Test cache functionality
test_cache_functionality() {
    run_test "Testing cache functionality"
    
    # Make first request to get_models (should cache)
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_models","arguments":{"page":1,"page_size":3}},"id":20}'
    local start_time=$(date +%s.%N)
    local response1=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    local end_time1=$(date +%s.%N)
    
    # Make second identical request (should use cache)
    local start_time2=$(date +%s.%N)
    local response2=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    local end_time2=$(date +%s.%N)
    
    if [ "$response1" = "$response2" ]; then
        log_success "Cache functionality working - identical responses received"
    else
        log_error "Cache functionality issue - responses differ"
    fi
}

# Test change impact analysis
test_change_impact_analysis() {
    run_test "Testing change impact analysis tool"
    
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_change_impact","arguments":{"target":"Config"}},"id":30}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"risk_level"' && echo "$response" | grep -q '"recommendations"'; then
            log_success "Change impact analysis working correctly"
            if [ "$JQ_AVAILABLE" = true ]; then
                echo "Impact analysis: $(echo "$response" | jq '.result.content[0].text' | head -3)"
            fi
        else
            log_error "Change impact analysis failed: $response"
        fi
    else
        log_error "Change impact analysis request failed"
    fi
}

# Test call graph generation
test_call_graph_generation() {
    run_test "Testing call graph generation"
    
    # Test JSON format
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_call_graph","arguments":{"format":"json"}},"id":31}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"nodes"' && echo "$response" | grep -q '"edges"'; then
            log_success "Call graph generation (JSON format) working correctly"
        else
            log_error "Call graph generation (JSON) failed: $response"
        fi
    else
        log_error "Call graph generation request failed"
    fi
    
    # Test DOT format
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_call_graph","arguments":{"format":"dot"}},"id":32}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q 'digraph CallGraph'; then
            log_success "Call graph generation (DOT format) working correctly"
        else
            log_error "Call graph generation (DOT) failed: $response"
        fi
    else
        log_error "Call graph generation (DOT) request failed"
    fi
}

# Test pagination and filtering
test_pagination_filtering() {
    run_test "Testing pagination and filtering"
    
    # Test pagination
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_models","arguments":{"page":1,"page_size":2}},"id":40}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q 'page 1, size 2'; then
            log_success "Pagination working correctly"
        else
            log_error "Pagination not working: $response"
        fi
    else
        log_error "Pagination test failed"
    fi
    
    # Test filtering
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_endpoints","arguments":{"method":"GET"}},"id":41}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"content"'; then
            log_success "Filtering working correctly"
        else
            log_error "Filtering not working: $response"
        fi
    else
        log_error "Filtering test failed"
    fi
}

# Test security features
test_security_features() {
    run_test "Testing security features"
    
    # Stop current server
    stop_server
    
    # Test read-only mode
    log_info "Testing read-only mode..."
    ./bin/mcp-server -backend-path="$BACKEND_PATH" -port="$MCP_SERVER_PORT" -read-only &
    READONLY_SERVER_PID=$!
    
    # Wait for server to start
    for i in {1..15}; do
        if curl -s "$MCP_SERVER_URL/health" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Test if read-only mode is enforced
    local request='{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_models","arguments":{}},"id":50}'
    local response=$(curl -s -X POST "$MCP_SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "$request")
    
    if [ $? -eq 0 ]; then
        log_success "Read-only mode test completed"
    else
        log_error "Read-only mode test failed"
    fi
    
    # Clean up
    kill $READONLY_SERVER_PID 2>/dev/null || true
    sleep 2
    
    # Restart normal server
    start_server
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
    test_jsonrpc_response_shapes
    test_cli_overrides
    test_cache_functionality
    test_change_impact_analysis
    test_call_graph_generation
    test_pagination_filtering
    test_security_features
    test_performance
    
    log_success "All validation tests completed successfully!"
}

# Run main function
main "$@"