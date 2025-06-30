#!/bin/bash
# =============================================================================
# Start DomainFlow Application in Test Mode
# =============================================================================
# This script starts both frontend and backend with test configuration
# Uses the test.env file for environment variables
# =============================================================================

set -e

# Load test environment
source "$(dirname "$0")/test.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting DomainFlow in Test Mode${NC}"
echo "=================================="

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - waiting for $service_name...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name failed to start within timeout${NC}"
    return 1
}

# Check database connection
echo -e "${BLUE}🔍 Checking database connection...${NC}"
if PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please ensure PostgreSQL is running and credentials are correct"
    exit 1
fi

# Kill any existing processes on our ports
echo -e "${BLUE}🧹 Cleaning up existing processes...${NC}"
if check_port $SERVER_PORT; then
    echo -e "${YELLOW}⚠️  Killing process on port $SERVER_PORT${NC}"
    lsof -ti:$SERVER_PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if check_port $FRONTEND_PORT; then
    echo -e "${YELLOW}⚠️  Killing process on port $FRONTEND_PORT${NC}"
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start backend
echo -e "${BLUE}🔧 Starting backend server...${NC}"
cd "$(dirname "$0")/../backend"

# Export environment variables for backend
export DATABASE_HOST DATABASE_PORT DATABASE_NAME DATABASE_USER DATABASE_PASSWORD DATABASE_SSL_MODE
export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD DB_SSLMODE
export SERVER_PORT GIN_MODE API_KEY LOG_LEVEL

# Start backend in background
go run cmd/apiserver/main.go > ../logs/backend-test.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
if ! wait_for_service "http://localhost:$SERVER_PORT/api/health" "Backend"; then
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend
echo -e "${BLUE}🎨 Starting frontend server...${NC}"
cd "$(dirname "$0")/.."

# Create logs directory if it doesn't exist
mkdir -p logs

# Start frontend in background
npm run dev > logs/frontend-test.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to be ready
if ! wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend"; then
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 DomainFlow Test Environment Ready!${NC}"
echo "======================================"
echo -e "${BLUE}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo -e "${BLUE}Backend:${NC}  http://localhost:$SERVER_PORT"
echo -e "${BLUE}API Health:${NC} http://localhost:$SERVER_PORT/api/health"
echo ""
echo -e "${YELLOW}💡 Test User Credentials:${NC}"
echo -e "   Email: $TEST_USER_EMAIL"
echo -e "   Password: $TEST_USER_PASSWORD"
echo ""
echo -e "${YELLOW}📋 Process IDs:${NC}"
echo -e "   Backend PID: $BACKEND_PID"
echo -e "   Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   Backend: logs/backend-test.log"
echo -e "   Frontend: logs/frontend-test.log"
echo ""
echo -e "${YELLOW}⚡ To stop services:${NC}"
echo -e "   kill $BACKEND_PID $FRONTEND_PID"
echo -e "   or run: .codex/stop-test-app.sh"
echo ""
echo -e "${GREEN}🧪 Ready for testing!${NC}"

# Save PIDs for cleanup script
echo $BACKEND_PID > .codex/backend.pid
echo $FRONTEND_PID > .codex/frontend.pid
