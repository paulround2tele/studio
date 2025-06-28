#!/bin/bash

echo "=== DomainFlow System Status ==="
echo

# Check PostgreSQL
echo "📊 PostgreSQL Service:"
if systemctl is-active --quiet postgresql; then
  echo "✓ PostgreSQL is running"
  if command -v psql >/dev/null 2>&1; then
    echo "✓ psql client available"
  else
    echo "✗ psql client not found"
  fi
else
  echo "✗ PostgreSQL is not running"
fi
echo

# Check database connection
echo "🗄️  Database Connection:"
if [ -f ".codex/check-db.sh" ]; then
  ./.codex/check-db.sh 2>/dev/null && echo "✓ Database check passed" || echo "✗ Database check failed"
else
  echo "⚠️  Database check script not found"
fi
echo

# Check backend
echo "🚀 Backend Status:"
if [ -d "backend" ]; then
  if [ -f "backend/bin/apiserver" ]; then
    echo "✓ Backend binary exists"
  else
    echo "⚠️  Backend binary not found (run: cd backend && make build)"
  fi
  
  if [ -f "backend/config.json" ]; then
    echo "✓ Backend config found"
  else
    echo "✗ Backend config missing"
  fi
  
  # Check if backend is running
  if pgrep -f "apiserver" >/dev/null; then
    echo "✓ Backend server is running"
    if curl -s http://localhost:8080/health >/dev/null 2>&1; then
      echo "✓ Backend API responding"
    else
      echo "⚠️  Backend API not responding on port 8080"
    fi
  else
    echo "⚠️  Backend server not running"
  fi
else
  echo "✗ Backend directory not found"
fi
echo

# Check frontend
echo "🌐 Frontend Status:"
if [ -f "package.json" ]; then
  echo "✓ package.json found"
  
  if [ -d "node_modules" ]; then
    echo "✓ Node modules installed"
  else
    echo "⚠️  Node modules not installed (run: npm install)"
  fi
  
  # Check if frontend dev server is running
  if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✓ Frontend dev server running on port 3000"
  else
    echo "⚠️  Frontend dev server not running (run: npm run dev)"
  fi
else
  echo "✗ package.json not found"
fi
echo

# Check system resources
echo "💻 System Resources:"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk: $(df -h . | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
echo "Load: $(uptime | awk -F'load average:' '{print $2}' | xargs)"
echo

# Check recent logs
echo "📋 Recent Logs:"
if [ -f "backend/backend.log" ]; then
  echo "Backend log (last 5 lines):"
  tail -5 backend/backend.log 2>/dev/null | sed 's/^/  /'
else
  echo "⚠️  Backend log not found"
fi

if [ -f "frontend.log" ]; then
  echo "Frontend log (last 5 lines):"
  tail -5 frontend.log 2>/dev/null | sed 's/^/  /'
fi

echo
echo "=== Status Check Complete ==="
