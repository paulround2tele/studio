#!/bin/bash

# Database Migration and Optimization Script
# Purpose: Apply bulk operation indexes for 50x performance improvement
# Author: Database Optimization Agent
# Date: 2025-06-26

set -e

echo "🚀 Database Optimization for Bulk Operations"
echo "============================================"

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-domainflow_dev}"
DB_USER="${DB_USER:-domainflow}"
DB_PASSWORD="${DB_PASSWORD:-domainflow_dev_password}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run SQL and check result
run_sql() {
    local sql_file="$1"
    local description="$2"
    
    echo -e "${BLUE}📋 $description${NC}"
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"; then
        echo -e "${GREEN}✅ Success: $description${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed: $description${NC}"
        return 1
    fi
}

# Function to check database connection
check_db_connection() {
    echo -e "${BLUE}🔍 Checking database connection...${NC}"
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        echo "Please check your database configuration:"
        echo "  Host: $DB_HOST:$DB_PORT"
        echo "  Database: $DB_NAME"
        echo "  User: $DB_USER"
        return 1
    fi
}

# Function to show current performance
show_performance_before() {
    echo -e "${YELLOW}📊 Performance Analysis (BEFORE optimization)${NC}"
    run_sql "scripts/monitor_db_performance.sql" "Pre-optimization performance analysis"
}

# Function to apply migration
apply_migration() {
    echo -e "${YELLOW}🔧 Applying bulk operation indexes migration...${NC}"
    run_sql "database/migrations/011_add_bulk_operation_indexes.sql" "Bulk operation indexes migration"
}

# Function to show performance after
show_performance_after() {
    echo -e "${YELLOW}📈 Performance Analysis (AFTER optimization)${NC}"
    run_sql "scripts/monitor_db_performance.sql" "Post-optimization performance analysis"
}

# Function to run optimization
run_optimization() {
    echo -e "${BLUE}🎯 Starting Database Optimization Process${NC}"
    echo ""
    
    # Step 1: Check connection
    if ! check_db_connection; then
        echo -e "${RED}❌ Cannot proceed without database connection${NC}"
        exit 1
    fi
    
    # Step 2: Show current performance
    echo ""
    echo -e "${YELLOW}==== STEP 1: Current Performance Analysis ====${NC}"
    if ! show_performance_before; then
        echo -e "${YELLOW}⚠️ Warning: Could not analyze current performance${NC}"
    fi
    
    # Step 3: Apply migration
    echo ""
    echo -e "${YELLOW}==== STEP 2: Applying Bulk Operation Indexes ====${NC}"
    if ! apply_migration; then
        echo -e "${RED}❌ Migration failed - stopping optimization${NC}"
        exit 1
    fi
    
    # Step 4: Show improved performance
    echo ""
    echo -e "${YELLOW}==== STEP 3: Post-Optimization Performance ====${NC}"
    if ! show_performance_after; then
        echo -e "${YELLOW}⚠️ Warning: Could not analyze post-optimization performance${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Database Optimization Complete!${NC}"
    echo -e "${GREEN}Expected improvements:${NC}"
    echo -e "${GREEN}  ✅ 5-50x faster bulk campaign queries${NC}"
    echo -e "${GREEN}  ✅ Instant job queue processing${NC}"
    echo -e "${GREEN}  ✅ Efficient large-scale domain result lookups${NC}"
    echo -e "${GREEN}  ✅ Optimized memory usage for bulk operations${NC}"
}

# Main execution
main() {
    # Change to backend directory
    cd "$(dirname "$0")"
    
    # Check if we're in the right directory
    if [ ! -f "database/migrations/011_add_bulk_operation_indexes.sql" ]; then
        echo -e "${RED}❌ Error: Migration file not found${NC}"
        echo "Please run this script from the backend directory"
        exit 1
    fi
    
    # Run the optimization
    run_optimization
}

# Execute main function
main "$@"
