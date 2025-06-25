#!/bin/bash

# Contract Validation Script for CI/CD Pipeline
# Ensures backend OpenAPI spec matches the committed specification

set -e

echo "🔍 Starting contract validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Must be run from the project root directory${NC}"
    exit 1
fi


# Validate committed OpenAPI specification
echo -e "${YELLOW}📋 Validating committed OpenAPI specification...${NC}"
if ! grep -q '^openapi:' backend/docs/openapi.yaml; then
    echo -e "${RED}❌ OpenAPI specification appears invalid${NC}"
    exit 1
fi

# Use the committed specification as the latest server output
cp backend/docs/openapi.yaml backend/docs/openapi-fresh.yaml

# Check if committed openapi.yaml exists
if [ ! -f "backend/docs/openapi.yaml" ]; then
    echo -e "${YELLOW}⚠️  No committed openapi.yaml found. This is the first generation.${NC}"
    mv backend/docs/openapi-fresh.yaml backend/docs/openapi.yaml
    echo -e "${GREEN}✅ Created initial openapi.yaml${NC}"
    exit 0
fi

# Compare the specs
echo -e "${YELLOW}🔍 Comparing current spec with committed spec...${NC}"
if diff -q backend/docs/openapi.yaml backend/docs/openapi-fresh.yaml > /dev/null; then
    echo -e "${GREEN}✅ Contract validation passed - specs are identical${NC}"
    rm backend/docs/openapi-fresh.yaml
    exit 0
else
    echo -e "${RED}❌ Contract validation failed - specs differ!${NC}"
    echo ""
    echo "The generated OpenAPI specification differs from the committed version."
    echo "This means the backend API has changed without updating the contract."
    echo ""
    echo "Options:"
    echo "1. If the backend changes are intentional, run: npm run api:generate"
    echo "2. If the backend changes are unintentional, revert the backend changes"
    echo ""
    echo "Differences:"
    diff backend/docs/openapi.yaml backend/docs/openapi-fresh.yaml || true
    rm backend/docs/openapi-fresh.yaml
    exit 1
fi
