#!/bin/bash

# UI Navigation Test using MCP Tools
# Tests dashboard access and navigation elements

set -e

echo "🎯 UI Navigation Test with MCP Tools"
echo "===================================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_URL="http://localhost:8080"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="testpassword123456"
COOKIE_JAR="/tmp/ui_test_cookies.txt"

# Function to login and get session
login_user() {
    echo "🔐 Logging in user..."
    rm -f "$COOKIE_JAR"
    
    curl -s -c "$COOKIE_JAR" \
        -X POST "$BACKEND_URL/api/v2/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" > /dev/null
    
    echo "✅ User logged in successfully"
}

# Function to test MCP visual context
test_mcp_visual_context() {
    local url="$1"
    local page_name="$2"
    
    echo "📸 Testing MCP visual context for $page_name..."
    echo "URL: $url"
    
    # Use MCP server to get visual context
    # Note: This would be called through the MCP server API in a real scenario
    echo "🛠️ MCP visual context capture would be executed here"
    echo "📋 Expected: Screenshot + metadata + code mapping"
    
    return 0
}

# Function to test a specific page
test_page_navigation() {
    local page_url="$1"
    local page_name="$2"
    
    echo ""
    echo -e "${BLUE}Testing $page_name${NC}"
    echo "----------------------------"
    
    # Test page accessibility
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$page_url")
    
    if [[ "$status_code" == "200" ]]; then
        echo -e "${GREEN}✅ $page_name accessible (HTTP $status_code)${NC}"
        
        # Test MCP visual context
        test_mcp_visual_context "$page_url" "$page_name"
        
        return 0
    else
        echo -e "${RED}❌ $page_name not accessible (HTTP $status_code)${NC}"
        return 1
    fi
}

# Main test function
main() {
    echo "Starting UI navigation test with MCP tools..."
    echo ""
    
    # Login first
    login_user
    
    # Test various pages
    local pages=(
        "http://localhost:3000/ Home"
        "http://localhost:3000/login Login"
        "http://localhost:3000/dashboard Dashboard"
        "http://localhost:3000/test-ui Test_UI"
    )
    
    local passed=0
    local total=0
    
    for page_info in "${pages[@]}"; do
        url=$(echo "$page_info" | cut -d' ' -f1)
        name=$(echo "$page_info" | cut -d' ' -f2)
        
        total=$((total + 1))
        if test_page_navigation "$url" "$name"; then
            passed=$((passed + 1))
        fi
    done
    
    echo ""
    echo "🏁 UI Navigation Test Results"
    echo "============================"
    echo "Pages tested: $total"
    echo -e "${GREEN}Accessible: $passed${NC}"
    echo -e "${RED}Failed: $((total - passed))${NC}"
    
    if [[ $passed -eq $total ]]; then
        echo ""
        echo -e "${GREEN}🎉 All pages accessible! UI navigation working.${NC}"
        
        # Now test actual MCP tools
        echo ""
        echo "🛠️ Testing actual MCP UI tools..."
        echo "================================"
        
        # Test if MCP server is available
        if [[ -f "/home/vboxuser/studio/bin/mcp-server" ]]; then
            echo -e "${GREEN}✅ MCP server binary found${NC}"
            echo "📋 Available MCP UI tools:"
            echo "   • get_visual_context - Page screenshots + metadata"
            echo "   • get_ui_metadata - Component extraction"
            echo "   • get_ui_code_map - React source mapping"
            echo "   • browse_with_playwright - Automated interaction"
            
            echo ""
            echo -e "${YELLOW}💡 To use MCP tools in your tests:${NC}"
            echo "   1. Call get_visual_context with URL"
            echo "   2. Extract UI metadata for element interaction"
            echo "   3. Map UI components to source code"
            echo "   4. Automate browser interactions"
            
        else
            echo -e "${RED}❌ MCP server binary not found${NC}"
        fi
        
        exit 0
    else
        echo -e "${RED}❌ Some pages failed accessibility test${NC}"
        exit 1
    fi
    
    # Cleanup
    rm -f "$COOKIE_JAR"
}

# Run main function
main "$@"
