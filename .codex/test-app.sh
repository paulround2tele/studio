#!/bin/bash
# =============================================================================
# DomainFlow Application Test Suite
# =============================================================================
# Comprehensive testing script for session-based authentication and core features
# Tests both frontend and backend functionality
# =============================================================================

set -e

# Load test environment
source "$(dirname "$0")/test.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${CYAN}🧪 Test $TOTAL_TESTS: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASS: $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL: $test_name${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to make HTTP request with proper error handling
http_test() {
    local method="$1"
    local url="$2"
    local expected_status="$3"
    local data="$4"
    local headers="$5"
    
    local cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ -n "$headers" ]; then
        cmd="$cmd $headers"
    fi
    
    if [ -n "$data" ]; then
        cmd="$cmd -d '$data'"
    fi
    
    cmd="$cmd '$url'"
    
    local response=$(eval "$cmd")
    local status_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        return 0
    else
        echo -e "${RED}Expected status $expected_status, got $status_code${NC}"
        echo -e "${RED}Response: $body${NC}"
        return 1
    fi
}

echo -e "${BLUE}🧪 DomainFlow Application Test Suite${NC}"
echo "====================================="
echo ""

# Test 1: Database Connection
run_test "Database Connection" \
    "PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c '\\q' 2>/dev/null"

# Test 2: Backend Health Check
run_test "Backend Health Check" \
    "http_test GET http://localhost:$SERVER_PORT/api/health 200"

# Test 3: Frontend Health Check
run_test "Frontend Accessibility" \
    "curl -s http://localhost:$FRONTEND_PORT > /dev/null"

# Test 4: API Authentication Endpoint
run_test "API Auth Endpoint Available" \
    "http_test POST http://localhost:$SERVER_PORT/api/auth/login 400"

# Test 5: Database Schema Verification
run_test "Database Schema - Users Table" \
    "PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c '\\d auth.users' | grep -q 'email'"

# Test 6: Database Schema - Sessions Table
run_test "Database Schema - Sessions Table" \
    "PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c '\\d auth.sessions' | grep -q 'user_id'"

# Test 7: No Permission Tables (Cleanup Verification)
run_test "No Permission Tables (Clean Schema)" \
    "! PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c '\\dt auth.*' | grep -q 'permissions'"

# Test 8: API CORS Headers
run_test "API CORS Headers" \
    "curl -s -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: POST' -X OPTIONS http://localhost:$SERVER_PORT/api/auth/login | grep -q 'Access-Control-Allow-Origin'"

# Test 9: Session-based Auth (No Role/Permission in Response)
run_test "Session Auth - No Role/Permission Fields" \
    "! curl -s -X POST http://localhost:$SERVER_PORT/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"invalid\",\"password\":\"invalid\"}' | grep -q 'role\\|permission'"

# Test 10: Frontend Build Assets
run_test "Frontend Build Assets Exist" \
    "test -f .next/static/chunks/main-*.js"

# Test 11: Backend Compilation
run_test "Backend Compilation" \
    "cd backend && go build -o test-binary cmd/apiserver/main.go && rm -f test-binary"

# Test 12: Environment Variables Loading
run_test "Environment Variables Loaded" \
    "test -n '$DATABASE_NAME' && test -n '$SERVER_PORT' && test -n '$FRONTEND_PORT'"

# Test 13: WebSocket Endpoint
run_test "WebSocket Endpoint Available" \
    "curl -s -H 'Connection: Upgrade' -H 'Upgrade: websocket' http://localhost:$SERVER_PORT/api/v2/ws | grep -q 'Bad Request\\|Upgrade Required'"

# Test 14: API Rate Limiting Disabled in Test
run_test "Rate Limiting Disabled in Test" \
    "test '$RATE_LIMIT_ENABLED' = 'false'"

# Test 15: Test User Credentials Configured
run_test "Test User Credentials Configured" \
    "test -n '$TEST_USER_EMAIL' && test -n '$TEST_USER_PASSWORD'"

echo ""
echo "======================================="
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "======================================="
echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
echo -e "${YELLOW}📋 Total:  $TOTAL_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Application is ready for testing.${NC}"
    echo ""
    echo -e "${BLUE}🔗 Application URLs:${NC}"
    echo -e "   Frontend: http://localhost:$FRONTEND_PORT"
    echo -e "   Backend:  http://localhost:$SERVER_PORT"
    echo -e "   API Health: http://localhost:$SERVER_PORT/api/health"
    echo ""
    echo -e "${YELLOW}👤 Test Credentials:${NC}"
    echo -e "   Email: $TEST_USER_EMAIL"
    echo -e "   Password: $TEST_USER_PASSWORD"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some tests failed. Please check the application setup.${NC}"
    echo ""
    exit 1
fi
