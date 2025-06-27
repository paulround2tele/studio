#!/bin/bash
set -e

CONFIG_FILE="backend/config.json"

# Ensure jq is available for parsing JSON
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed" >&2
  exit 1
fi

# Load configuration from environment or fallback file
DB_HOST="${DATABASE_HOST}"
DB_PORT="${DATABASE_PORT}"
DB_NAME="${DATABASE_NAME}"
DB_USER="${DATABASE_USER}"
DB_PASSWORD="${DATABASE_PASSWORD}"

if [ -z "$DB_HOST" ] && [ -f "$CONFIG_FILE" ]; then
  DB_HOST=$(jq -r '.database.host' "$CONFIG_FILE")
  DB_PORT=$(jq -r '.database.port' "$CONFIG_FILE")
  DB_NAME=$(jq -r '.database.name' "$CONFIG_FILE")
  DB_USER=$(jq -r '.database.user' "$CONFIG_FILE")
  DB_PASSWORD=$(jq -r '.database.password' "$CONFIG_FILE")
fi

# Fallback to .db_connection DSN if available and still missing
if [ -z "$DB_HOST" ] && [ -f .db_connection ]; then
  DSN=$(cat .db_connection)
  DB_HOST=$(echo "$DSN" | sed -E 's|.*://[^@]*@([^:/]*):([0-9]+)/([^?]*).*|\1|')
  DB_PORT=$(echo "$DSN" | sed -E 's|.*://[^@]*@([^:/]*):([0-9]+)/([^?]*).*|\2|')
  DB_NAME=$(echo "$DSN" | sed -E 's|.*://[^@]*@([^:/]*):([0-9]+)/([^?]*).*|\3|')
  DB_USER=$(echo "$DSN" | sed -E 's|.*://([^:]*):([^@]*)@.*|\1|')
  DB_PASSWORD=$(echo "$DSN" | sed -E 's|.*://([^:]*):([^@]*)@.*|\2|')
fi

if [ -z "$DB_HOST" ]; then
  echo "Database configuration not found. Set DATABASE_* variables or provide $CONFIG_FILE" >&2
  exit 1
fi

echo "Checking PostgreSQL connection to $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"

# First, check if we can connect to the PostgreSQL server (using postgres database)
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c '\q' >/dev/null 2>&1; then
  echo "✗ Cannot connect to PostgreSQL server at $DB_HOST:$DB_PORT as $DB_USER" >&2
  exit 1
fi

echo "✓ PostgreSQL server is reachable"

# Check if the target database exists
DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")

if [ "$DB_EXISTS" = "1" ]; then
  echo "✓ Database '$DB_NAME' exists"
else
  echo "Database '$DB_NAME' does not exist. Attempting to create it..."
  if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE \"$DB_NAME\";" >/dev/null 2>&1; then
    echo "✓ Database '$DB_NAME' created successfully"
  else
    echo "✗ Failed to create database '$DB_NAME'. Check user permissions." >&2
    exit 1
  fi
fi

# Now test connection to the target database
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' >/dev/null 2>&1; then
  echo "✓ Database '$DB_NAME' is reachable"
else
  echo "✗ Database connection failed" >&2
  exit 1
fi

SCHEMA_PRESENT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='schema_migrations';")
if [ "$SCHEMA_PRESENT" = "1" ]; then
  echo "✓ schema_migrations table found"
else
  echo "✗ schema_migrations table missing" >&2
fi

if [ "$1" = "--migrate" ]; then
  DSN="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
  echo "Running migrations..."
  go run ./backend/cmd/migrate -dsn "$DSN" || echo "Migration command failed or no migrations needed"
fi
