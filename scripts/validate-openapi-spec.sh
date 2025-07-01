#!/bin/bash
# Validate OpenAPI schema using openapi-typescript
set -e
echo "Validating OpenAPI schema..."
npx openapi-typescript backend/docs/openapi.yaml --output /dev/null
if [ -f backend/docs/openapi-fresh.yaml ]; then
  echo "Validating fresh OpenAPI schema..."
  npx openapi-typescript backend/docs/openapi-fresh.yaml --output /dev/null
fi
echo "OpenAPI validation completed successfully!"
