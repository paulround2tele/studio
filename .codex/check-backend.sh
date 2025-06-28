#!/bin/bash
set -e

echo "Checking backend status..."

# Check if Go is installed
if ! command -v go >/dev/null 2>&1; then
  echo "✗ Go is not installed" >&2
  exit 1
fi
echo "✓ Go is installed: $(go version)"

# Check if backend directory exists
if [ ! -d "backend" ]; then
  echo "✗ Backend directory not found" >&2
  exit 1
fi
echo "✓ Backend directory found"

cd backend

# Check if go.mod exists
if [ ! -f "go.mod" ]; then
  echo "✗ go.mod not found in backend directory" >&2
  exit 1
fi
echo "✓ go.mod found"

# Check Go modules
echo "Checking Go modules..."
if go mod tidy && go mod download; then
  echo "✓ Go modules are up to date"
else
  echo "✗ Go modules check failed" >&2
  exit 1
fi

# Run Go vet
echo "Running go vet..."
if go vet ./...; then
  echo "✓ go vet passed"
else
  echo "✗ go vet failed" >&2
fi

# Run Go tests
echo "Running Go tests..."
if go test -v ./...; then
  echo "✓ All tests passed"
else
  echo "✗ Some tests failed" >&2
fi

# Check if binary can be built
echo "Testing build..."
if go build -o /tmp/test-apiserver ./cmd/apiserver 2>/dev/null; then
  echo "✓ Backend builds successfully"
  rm -f /tmp/test-apiserver
else
  echo "✗ Backend build failed" >&2
fi

echo "Backend check completed"
