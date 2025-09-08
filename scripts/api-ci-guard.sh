#!/usr/bin/env bash
set -euo pipefail

# CI Guard: ensure OpenAPI spec + generated artifacts are current.
# Steps:
# 1. Bundle spec
# 2. Validate spec
# 3. Generate backend server/types (make openapi)
# 4. Generate frontend clients/types/docs
# 5. Fail if git diff shows uncommitted changes

red() { printf "\e[31m%s\e[0m\n" "$*"; }
green() { printf "\e[32m%s\e[0m\n" "$*"; }

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"

echo "==> Bundling OpenAPI spec"
npm run api:bundle >/dev/null 2>&1 || bash scripts/bundle-openapi-spec.sh

if [[ ! -f backend/openapi/dist/openapi.yaml ]]; then
  red "Bundled spec missing: backend/openapi/dist/openapi.yaml"
  exit 1
fi

echo "==> Validating spec"
npm run api:validate-bundle >/dev/null 2>&1 || bash scripts/validate-openapi-spec.sh

echo "==> Regenerating backend server/types (oapi-codegen)"
( cd backend && make openapi ) >/dev/null 2>&1 || ( red "Backend oapi-codegen generation failed"; exit 1 )

echo "==> Regenerating frontend clients/types/docs"
npm run gen:all >/dev/null 2>&1 || ( red "Frontend client generation failed"; exit 1 )

echo "==> Checking for uncommitted diffs"
if ! git diff --quiet; then
  red "Generated artifacts out of date. Commit regenerated files.";
  git --no-pager diff --name-only | sed 's/^/ - /'
  exit 2
fi

green "Spec & generated artifacts are up to date."
