#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TEST_DB="studio_test"
TEST_USER="studio"
TEST_PASSWORD="studio"
TEST_PORT=5432
TEST_HOST="localhost"

# Install PostgreSQL and start service
sudo apt-get update -y
sudo apt-get install -y postgresql postgresql-contrib
sudo service postgresql start

# Create user if it doesn't exist
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${TEST_USER}'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE USER ${TEST_USER} WITH PASSWORD '${TEST_PASSWORD}'"
fi

# Create database if it doesn't exist
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${TEST_DB}'" | grep -q 1; then
  sudo -u postgres createdb -O ${TEST_USER} ${TEST_DB}
fi

TEST_DSN="postgres://${TEST_USER}:${TEST_PASSWORD}@${TEST_HOST}:${TEST_PORT}/${TEST_DB}?sslmode=disable"

# Write DSN to env file for Codex
echo "TEST_POSTGRES_DSN=${TEST_DSN}" > "$REPO_ROOT/.codex/test.env"

# Also write to a convenience file used by tests if env var not set
echo "${TEST_DSN}" > "$REPO_ROOT/.db_connection.test"

echo "PostgreSQL test database ready: $TEST_DSN"
