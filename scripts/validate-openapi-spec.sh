#!/bin/bash
# Validate OpenAPI schema using swagger-cli
set -e
npx swagger-cli validate backend/docs/openapi.yaml
if [ -f backend/docs/openapi-fresh.yaml ]; then
  npx swagger-cli validate backend/docs/openapi-fresh.yaml
fi
