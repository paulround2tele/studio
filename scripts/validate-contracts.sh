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

# Validate committed OpenAPI specification
echo -e "${YELLOW}📋 Validating committed OpenAPI specification...${NC}"
if ! grep -q '^openapi:' backend/docs/openapi.yaml; then
    echo -e "${RED}❌ OpenAPI specification appears invalid${NC}"
    exit 1
fi
npm run --silent api:validate-spec

# Generate a fresh specification using the backend
echo -e "${YELLOW}📦 Generating fresh OpenAPI specification from backend...${NC}"
OPENAPI_OUT=backend/docs/openapi-fresh.yaml npm run --silent api:generate-spec
npm run --silent api:validate-spec

# Check if committed openapi.yaml exists
if [ ! -f "backend/docs/openapi.yaml" ]; then
    echo -e "${YELLOW}⚠️  No committed openapi.yaml found. This is the first generation.${NC}"
    mv backend/docs/openapi-fresh.yaml backend/docs/openapi.yaml
    echo -e "${GREEN}✅ Created initial openapi.yaml${NC}"
    exit 0
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
