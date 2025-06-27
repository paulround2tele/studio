#!/bin/bash

# Default Users Seeding Script
# This script seeds the database with default users for development and testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-domainflow_production}"
DB_USER="${DB_USER:-domainflow}"
DB_PASSWORD="${DB_PASSWORD}"

# Configuration file path
CONFIG_FILE="$(dirname "$0")/../config.json"

echo -e "${YELLOW}🌱 DomainFlow Default Users Seeder${NC}"
echo "=================================="

# Check if config file exists and extract database config
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${GREEN}📋 Reading database config from: $CONFIG_FILE${NC}"
    
    # Extract database configuration using jq if available
    if command -v jq &> /dev/null; then
        DB_HOST=$(jq -r '.database.host // "localhost"' "$CONFIG_FILE")
        DB_PORT=$(jq -r '.database.port // 5432' "$CONFIG_FILE")
        DB_NAME=$(jq -r '.database.name // "domainflow_production"' "$CONFIG_FILE")
        DB_USER=$(jq -r '.database.user // "domainflow"' "$CONFIG_FILE")
        DB_PASSWORD=$(jq -r '.database.password // ""' "$CONFIG_FILE")
    else
        echo -e "${YELLOW}⚠️  jq not available, using environment variables or defaults${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Config file not found at $CONFIG_FILE, using environment variables or defaults${NC}"
fi

# Validate required parameters
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Database password not found in config or environment${NC}"
    echo "Please set DB_PASSWORD environment variable or ensure config.json has database.password"
    exit 1
fi

echo "Database Config:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check database connectivity
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
export PGPASSWORD="$DB_PASSWORD"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo "Please ensure the database is running and credentials are correct"
    exit 1
fi
echo -e "${GREEN}✅ Database connection successful${NC}"

# Run the seed file
SEED_FILE="$(dirname "$0")/../database/seeds/001_default_users.sql"
if [ ! -f "$SEED_FILE" ]; then
    echo -e "${RED}❌ Seed file not found: $SEED_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}🌱 Running seed file: $SEED_FILE${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEED_FILE"; then
    echo -e "${GREEN}✅ Default users seeded successfully!${NC}"
    echo ""
    echo "Default Users Created:"
    echo "  👤 Admin User:"
    echo "     Email: admin@domainflow.com"
    echo "     Password: AdminPassword123!"
    echo "     Role: admin"
    echo ""
    echo "  👤 Test User:"
    echo "     Email: test@example.com"
    echo "     Password: TestPassword123!"
    echo "     Role: user"
    echo ""
    echo "  👤 Developer User:"
    echo "     Email: dev@domainflow.com"
    echo "     Password: DevPassword123!"
    echo "     Role: user"
    echo ""
    echo -e "${GREEN}🎉 Ready for development and automated testing!${NC}"
else
    echo -e "${RED}❌ Failed to seed default users${NC}"
    exit 1
fi
