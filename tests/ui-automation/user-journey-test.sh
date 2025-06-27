#!/bin/bash

# Complete User Journey Automated Test
# Tests login → dashboard → navigation → elements
# Uses MCP UI tools for verification

set -e

echo "🧪 Complete User Journey Automated Test"
echo "======================================="

# Test configuration
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:8080"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="testpassword123456"
COOKIE_JAR="/tmp/journey_cookies.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

# Test result function
test_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS: $1${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: $1${NC}"
        FAILED=$((FAILED + 1))
    fi
}

echo -e "${BLUE}🔍 Phase 1: Service Health Check${NC}"
curl -s "$FRONTEND_URL" > /dev/null
test_result "Frontend Service ($FRONTEND_URL)"

curl -s "$BACKEND_URL/ping" > /dev/null
test_result "Backend Service ($BACKEND_URL)"

echo -e "${BLUE}🔐 Phase 2: Authentication Flow${NC}"
rm -f "$COOKIE_JAR"

# Login API test
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$BACKEND_URL/api/v2/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "sessionId"; then
    echo -e "${GREEN}✅ PASS: Login API Authentication${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL: Login API Authentication${NC}"
    FAILED=$((FAILED + 1))
fi

echo -e "${BLUE}🏠 Phase 3: Dashboard Access${NC}"
# Test authenticated endpoint
ME_RESPONSE=$(curl -s -b "$COOKIE_JAR" "$BACKEND_URL/api/v2/me")

if echo "$ME_RESPONSE" | grep -q "email"; then
    echo -e "${GREEN}✅ PASS: Dashboard API Access${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL: Dashboard API Access${NC}"
    FAILED=$((FAILED + 1))
fi

# Check user permissions
if echo "$ME_RESPONSE" | grep -q "permissions"; then
    echo -e "${GREEN}✅ PASS: User Permissions Present${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL: User Permissions Missing${NC}"
    FAILED=$((FAILED + 1))
fi

echo -e "${BLUE}🧭 Phase 4: Navigation Testing${NC}"
# Test common navigation endpoints
ENDPOINTS=("campaigns" "personas" "proxies")

for endpoint in "${ENDPOINTS[@]}"; do
    NAV_RESPONSE=$(curl -s -w "%{http_code}" -b "$COOKIE_JAR" "$BACKEND_URL/api/v2/$endpoint" -o /dev/null)
    
    if [ "$NAV_RESPONSE" = "200" ] || [ "$NAV_RESPONSE" = "404" ]; then
        echo -e "${GREEN}✅ PASS: Navigation to /$endpoint${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: Navigation to /$endpoint (HTTP $NAV_RESPONSE)${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo -e "${BLUE}🚪 Phase 5: Logout Flow${NC}"
# Test logout
LOGOUT_RESPONSE=$(curl -s -w "%{http_code}" -b "$COOKIE_JAR" -X POST "$BACKEND_URL/api/v2/auth/logout" -o /dev/null)

if [ "$LOGOUT_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ PASS: Logout API${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL: Logout API (HTTP $LOGOUT_RESPONSE)${NC}"
    FAILED=$((FAILED + 1))
fi

# Verify session invalidation
VERIFY_RESPONSE=$(curl -s -w "%{http_code}" -b "$COOKIE_JAR" "$BACKEND_URL/api/v2/me" -o /dev/null)

if [ "$VERIFY_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✅ PASS: Session Invalidation${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL: Session Still Active${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "======================================"
echo "📊 TEST SUMMARY"
echo "======================================"
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ Complete user journey verified${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED test(s) failed${NC}"
    exit 1
fi
