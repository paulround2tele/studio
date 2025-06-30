#!/bin/bash
# =============================================================================
# Stop DomainFlow Test Application
# =============================================================================
# This script stops the test application services started by start-test-app.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping DomainFlow Test Environment${NC}"
echo "======================================="

# Function to kill process if running
kill_if_running() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}🔄 Stopping $name (PID: $pid)...${NC}"
        kill "$pid" 2>/dev/null || true
        
        # Wait a moment and force kill if needed
        sleep 3
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}⚡ Force killing $name...${NC}"
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ $name stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  $name not running or already stopped${NC}"
    fi
}

# Stop services using saved PIDs
if [ -f ".codex/backend.pid" ]; then
    BACKEND_PID=$(cat .codex/backend.pid)
    kill_if_running "$BACKEND_PID" "Backend"
    rm -f .codex/backend.pid
fi

if [ -f ".codex/frontend.pid" ]; then
    FRONTEND_PID=$(cat .codex/frontend.pid)
    kill_if_running "$FRONTEND_PID" "Frontend"
    rm -f .codex/frontend.pid
fi

# Also kill any processes on the test ports as fallback
echo -e "${BLUE}🧹 Cleaning up any remaining processes on test ports...${NC}"

# Backend port (8080)
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}🔄 Killing processes on port 8080...${NC}"
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
fi

# Frontend port (3000)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}🔄 Killing processes on port 3000...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}✅ DomainFlow Test Environment Stopped${NC}"
echo ""
echo -e "${BLUE}📝 Logs are still available:${NC}"
echo -e "   Backend: logs/backend-test.log"
echo -e "   Frontend: logs/frontend-test.log"
echo ""
echo -e "${YELLOW}💡 To restart:${NC} .codex/start-test-app.sh"
