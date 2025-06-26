#!/bin/bash
set -e

ROOT_DIR="$(dirname "$0")/.."
cd "$ROOT_DIR"

echo "== Database Check =="
if ./codex/check-db.sh > /tmp/db_check.log 2>&1; then
  echo "Database check passed"
else
  echo "Database check failed"
fi
cat /tmp/db_check.log

echo
echo "== Backend Check =="
if ./codex/check-backend.sh > /tmp/backend_check.log 2>&1; then
  echo "Backend checks passed"
else
  echo "Backend checks failed"
fi
# Show last 10 lines of backend check
tail -n 10 /tmp/backend_check.log

echo
echo "== Frontend Tests =="
if npm test --silent > /tmp/frontend_check.log 2>&1; then
  echo "Frontend tests passed"
else
  echo "Frontend tests failed"
fi
# Show last 10 lines of frontend test output
tail -n 10 /tmp/frontend_check.log

# List npm scripts for reference
echo
echo "Available npm scripts:"
jq -r '.scripts | to_entries[] | "- \(.key)"' package.json

# Print recent backend log lines if available
if [ -f backend/backend.log ]; then
  echo
  echo "== Recent Backend Log =="
  tail -n 20 backend/backend.log
fi
