#!/bin/bash

# Contract Validation Script for CI/CD Pipeline
# Compares committed OpenAPI spec with spec served by a running backend instance

set -e

echo "🔍 Starting contract validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure we are at project root
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Must be run from the project root directory${NC}"
    exit 1
fi

# Fetch latest spec from running server
echo -e "${YELLOW}📋 Fetching OpenAPI specification from server...${NC}"
if ! curl -sf http://localhost:8080/api/openapi.yaml -o backend/docs/openapi-fresh.yaml; then
    echo -e "${RED}❌ Failed to retrieve OpenAPI spec from server${NC}"
    exit 1
fi

# Compare the specs
echo -e "${YELLOW}🔍 Comparing server spec with committed spec...${NC}"
if diff -q backend/docs/openapi.yaml backend/docs/openapi-fresh.yaml > /dev/null; then
    echo -e "${GREEN}✅ Contract validation passed - specs are identical${NC}"
    rm backend/docs/openapi-fresh.yaml
    exit 0
else
    echo -e "${RED}❌ Contract validation failed - specs differ!${NC}"
    echo ""
    diff backend/docs/openapi.yaml backend/docs/openapi-fresh.yaml || true
    rm backend/docs/openapi-fresh.yaml
    exit 1
fi
