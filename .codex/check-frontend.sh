#!/bin/bash
set -e

echo "Checking frontend status..."

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js is not installed" >&2
  exit 1
fi
echo "✓ Node.js is installed: $(node --version)"

# Check if npm is installed
if ! command -v npm >/dev/null 2>&1; then
  echo "✗ npm is not installed" >&2
  exit 1
fi
echo "✓ npm is installed: $(npm --version)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "✗ package.json not found" >&2
  exit 1
fi
echo "✓ package.json found"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "✗ node_modules directory not found. Run: npm install" >&2
  exit 1
fi
echo "✓ node_modules directory found"

# Check if Next.js is available
if ! npx next --version >/dev/null 2>&1; then
  echo "✗ Next.js not found" >&2
  exit 1
fi
echo "✓ Next.js is available: $(npx next --version)"

# Check TypeScript configuration
if [ -f "tsconfig.json" ]; then
  echo "✓ TypeScript configuration found"
  # Check if TypeScript can compile without errors
  echo "Checking TypeScript compilation..."
  if npx tsc --noEmit --skipLibCheck; then
    echo "✓ TypeScript compilation successful"
  else
    echo "✗ TypeScript compilation failed" >&2
  fi
else
  echo "⚠️  No TypeScript configuration found"
fi

# Check Tailwind CSS configuration
if [ -f "tailwind.config.ts" ] || [ -f "tailwind.config.js" ]; then
  echo "✓ Tailwind CSS configuration found"
else
  echo "⚠️  Tailwind CSS configuration not found"
fi

# Check if frontend can build
echo "Testing frontend build..."
if npm run build >/dev/null 2>&1; then
  echo "✓ Frontend builds successfully"
else
  echo "✗ Frontend build failed" >&2
fi

# Check if frontend linting passes
echo "Running frontend linting..."
if npm run lint >/dev/null 2>&1; then
  echo "✓ Frontend linting passed"
else
  echo "⚠️  Frontend linting issues found (run: npm run lint for details)"
fi

# Check test configuration and run comprehensive test suite
echo "Checking test configuration..."
TEST_CONFIGURED=false
TEST_FRAMEWORKS=""

if [ -f "jest.config.ts" ]; then
  echo "✓ Jest config found (jest.config.ts)"
  TEST_CONFIGURED=true
  TEST_FRAMEWORKS="$TEST_FRAMEWORKS Jest"
fi

if [ -f "jest.config.js" ]; then
  echo "✓ Jest config found (jest.config.js)"
  TEST_CONFIGURED=true
  TEST_FRAMEWORKS="$TEST_FRAMEWORKS Jest"
fi

if [ -f "jest.setup.ts" ]; then
  echo "✓ Jest setup file found"
fi

if [ -f "playwright.config.ts" ]; then
  echo "✓ Playwright config found"
  TEST_CONFIGURED=true
  TEST_FRAMEWORKS="$TEST_FRAMEWORKS Playwright"
fi

# Check package.json test scripts
echo "Checking test scripts in package.json..."
if grep -q '"test"' package.json; then
  echo "✓ Test script found in package.json"
  TEST_SCRIPT=$(grep '"test"' package.json | sed 's/.*"test":\s*"\([^"]*\)".*/\1/')
  echo "  Test command: $TEST_SCRIPT"
  TEST_CONFIGURED=true
fi

if grep -q '"test:unit"' package.json; then
  echo "✓ Unit test script found"
  UNIT_TEST_SCRIPT=$(grep '"test:unit"' package.json | sed 's/.*"test:unit":\s*"\([^"]*\)".*/\1/')
  echo "  Unit test command: $UNIT_TEST_SCRIPT"
fi

if grep -q '"test:e2e"' package.json; then
  echo "✓ E2E test script found"
  E2E_TEST_SCRIPT=$(grep '"test:e2e"' package.json | sed 's/.*"test:e2e":\s*"\([^"]*\)".*/\1/')
  echo "  E2E test command: $E2E_TEST_SCRIPT"
fi

if grep -q '"test:watch"' package.json; then
  echo "✓ Watch test script found"
fi

if grep -q '"test:coverage"' package.json; then
  echo "✓ Coverage test script found"
fi

# Check for test directories and files
echo "Checking test files..."
TOTAL_TEST_FILES=0

if [ -d "tests" ]; then
  TEST_COUNT=$(find tests -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l)
  echo "✓ Tests directory found with $TEST_COUNT test files"
  TOTAL_TEST_FILES=$((TOTAL_TEST_FILES + TEST_COUNT))
fi

if [ -d "__tests__" ]; then
  TEST_COUNT=$(find __tests__ -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l)
  echo "✓ __tests__ directory found with $TEST_COUNT test files"
  TOTAL_TEST_FILES=$((TOTAL_TEST_FILES + TEST_COUNT))
fi

if [ -d "src" ]; then
  SRC_TEST_COUNT=$(find src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l)
  if [ "$SRC_TEST_COUNT" -gt 0 ]; then
    echo "✓ Found $SRC_TEST_COUNT test files in src directory"
    TOTAL_TEST_FILES=$((TOTAL_TEST_FILES + SRC_TEST_COUNT))
  fi
fi

if [ -d "app" ]; then
  APP_TEST_COUNT=$(find app -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l)
  if [ "$APP_TEST_COUNT" -gt 0 ]; then
    echo "✓ Found $APP_TEST_COUNT test files in app directory"
    TOTAL_TEST_FILES=$((TOTAL_TEST_FILES + APP_TEST_COUNT))
  fi
fi

echo "Total test files found: $TOTAL_TEST_FILES"

# Run tests if configured
if [ "$TEST_CONFIGURED" = true ]; then
  echo ""
  echo "Running comprehensive test suite..."
  echo "Configured frameworks:$TEST_FRAMEWORKS"
  
  # Run unit tests with detailed output
  if grep -q '"test:unit"' package.json; then
    echo ""
    echo "Running unit tests..."
    if npm run test:unit 2>&1; then
      echo "✓ Unit tests passed"
    else
      echo "✗ Unit tests failed"
    fi
  elif grep -q '"test"' package.json && ! grep -q '"test:e2e"' package.json; then
    echo ""
    echo "Running main test suite..."
    echo "Command: npm test -- --passWithNoTests --watchAll=false"
    
    # Run tests with timeout and capture output
    if timeout 300 npm test -- --passWithNoTests --watchAll=false --verbose 2>&1; then
      echo "✓ Frontend tests passed"
    else
      TEST_EXIT_CODE=$?
      echo "✗ Frontend tests failed (exit code: $TEST_EXIT_CODE)"
      echo ""
      echo "Re-running with detailed error output..."
      npm test -- --passWithNoTests --watchAll=false --verbose --no-coverage 2>&1 | tail -30 | sed 's/^/  /'
    fi
  fi
  
  # Check if coverage is available
  if grep -q '"test:coverage"' package.json; then
    echo ""
    echo "Running test coverage analysis..."
    if npm run test:coverage >/dev/null 2>&1; then
      echo "✓ Test coverage analysis completed"
      if [ -f "coverage/lcov-report/index.html" ]; then
        echo "  Coverage report: coverage/lcov-report/index.html"
      fi
    else
      echo "⚠️  Test coverage analysis failed"
    fi
  fi
  
  # Check if Playwright tests exist and can be run
  if [ -f "playwright.config.ts" ] && grep -q '"test:e2e"' package.json; then
    echo ""
    echo "E2E tests available but skipping (requires running servers)"
    echo "To run E2E tests manually:"
    echo "  1. Start backend: cd backend && ./bin/apiserver"
    echo "  2. Start frontend: npm run dev" 
    echo "  3. Run E2E tests: npm run test:e2e"
  fi
else
  echo "⚠️  No test configuration found"
fi

# Check key directories exist
echo "Checking project structure..."
if [ -d "src" ]; then
  echo "✓ src directory found"
elif [ -d "pages" ]; then
  echo "✓ pages directory found (Pages Router)"
elif [ -d "app" ]; then
  echo "✓ app directory found (App Router)"
else
  echo "⚠️  No standard Next.js directory structure found"
fi

if [ -d "public" ]; then
  echo "✓ public directory found"
else
  echo "⚠️  public directory not found"
fi

# Check if development server can start (quick test)
echo "Testing development server startup..."
timeout 10s npm run dev >/dev/null 2>&1 &
DEV_PID=$!
sleep 3

if kill -0 $DEV_PID 2>/dev/null; then
  echo "✓ Development server starts successfully"
  kill $DEV_PID 2>/dev/null || true
  wait $DEV_PID 2>/dev/null || true
else
  echo "✗ Development server failed to start" >&2
fi

echo "Frontend check completed"
