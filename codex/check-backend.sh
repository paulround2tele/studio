#!/bin/bash
set -e

# Ensure Go is installed
if ! command -v go >/dev/null 2>&1; then
  echo "Go is not installed" >&2
  exit 1
fi

CONFIG_FILE="backend/config.json"
REQUIRED_VARS=(DATABASE_HOST DATABASE_PORT DATABASE_NAME DATABASE_USER DATABASE_PASSWORD)
MISSING=()

for V in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!V}" ]; then
    MISSING+=("$V")
  fi
done

if [ ${#MISSING[@]} -ne 0 ] && [ -f "$CONFIG_FILE" ]; then
  for V in "${MISSING[@]}"; do
    KEY=$(echo "$V" | sed 's/^DATABASE_//' | tr '[:upper:]' '[:lower:]')
    export "$V"=$(jq -r ".database.$KEY" "$CONFIG_FILE")
  done
  echo "Loaded database settings from $CONFIG_FILE"
fi

if [ ${#MISSING[@]} -ne 0 ] && [ ! -f "$CONFIG_FILE" ]; then
  echo "Missing environment variables: ${MISSING[*]}" >&2
  exit 1
fi

DSN="postgres://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?sslmode=disable"
export POSTGRES_DSN="$DSN"
export TEST_POSTGRES_DSN="$DSN"

cd backend

echo "Running go fmt..."
go fmt ./...

echo "Running go vet..."
go vet ./...

echo "Running go tests..."
set +e
go test ./...
TEST_STATUS=$?
set -e
if [ $TEST_STATUS -ne 0 ]; then
  echo "Go tests failed"
else
  echo "All Go tests passed"
fi

cd ..
