#!/bin/bash

# Database Setup Script for DomainFlow Studio
# This script sets up a fresh database instance

set -e

# Default values
DB_NAME="${DB_NAME:-domainflow_production}"
DB_USER="${DB_USER:-domainflow}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if PostgreSQL is running
check_postgres() {
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) not found. Please install PostgreSQL."
        exit 1
    fi
    
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" &> /dev/null; then
        print_error "PostgreSQL server is not running or not accessible on $DB_HOST:$DB_PORT"
        exit 1
    fi
    
    print_status "PostgreSQL server is running"
}

# Function to create database and user
create_database() {
    print_status "Creating database and user..."
    
    # Check if database exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_warning "Database '$DB_NAME' already exists"
        read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Dropping existing database..."
            psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        else
            print_status "Using existing database"
            return 0
        fi
    fi
    
    # Create database and user
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
EOF
    
    print_status "Database '$DB_NAME' and user '$DB_USER' created successfully"
}

# Function to apply schema
apply_schema() {
    print_status "Applying database schema..."
    
    local connection_string="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable"
    
    if [ ! -f "database/schema.sql" ]; then
        print_error "Schema file not found: database/schema.sql"
        exit 1
    fi
    
    psql "$connection_string" < database/schema.sql
    print_status "Schema applied successfully"
}

# Function to load seed data
load_seed_data() {
    if [ "$1" == "--with-seed-data" ]; then
        print_status "Loading seed data..."
        
        local connection_string="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable"
        
        if [ -f "database/seed_data.sql" ]; then
            psql "$connection_string" < database/seed_data.sql
            print_status "Seed data loaded successfully"
        else
            print_warning "Seed data file not found: database/seed_data.sql"
        fi
    fi
}

# Function to create .env file
create_env_file() {
    local env_file=".env"
    
    if [ -f "$env_file" ]; then
        print_warning ".env file already exists"
        return 0
    fi
    
    print_status "Creating .env file..."
    
    cat > "$env_file" << EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_SSLMODE=disable

# Application Configuration
APP_ENV=development
LOG_LEVEL=info
EOF
    
    print_status ".env file created"
}

# Function to test connection
test_connection() {
    print_status "Testing database connection..."
    
    local connection_string="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable"
    
    if psql "$connection_string" -c "SELECT 'Connection successful!' as status;" &> /dev/null; then
        print_status "Database connection test successful!"
    else
        print_error "Database connection test failed"
        exit 1
    fi
}

# Main function
main() {
    echo "DomainFlow Studio Database Setup"
    echo "================================"
    echo
    
    # Parse arguments
    local with_seed_data=false
    for arg in "$@"; do
        case $arg in
            --with-seed-data)
                with_seed_data=true
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo
                echo "Options:"
                echo "  --with-seed-data    Load seed data after schema setup"
                echo "  --help, -h          Show this help message"
                echo
                echo "Environment variables:"
                echo "  DB_NAME             Database name (default: domainflow_production)"
                echo "  DB_USER             Database user (default: domainflow)"
                echo "  DB_PASSWORD         Database password (default: auto-generated)"
                echo "  DB_HOST             Database host (default: localhost)"
                echo "  DB_PORT             Database port (default: 5432)"
                exit 0
                ;;
        esac
    done
    
    # Check if we're in the right directory
    if [ ! -f "database/schema.sql" ]; then
        print_error "Please run this script from the backend directory"
        exit 1
    fi
    
    print_status "Database configuration:"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Password: $DB_PASSWORD"
    echo
    
    # Execute setup steps
    check_postgres
    create_database
    apply_schema
    
    if [ "$with_seed_data" == true ]; then
        load_seed_data --with-seed-data
    fi
    
    create_env_file
    test_connection
    
    echo
    print_status "Database setup completed successfully!"
    echo
    echo "Connection string:"
    echo "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable"
    echo
    echo "You can now start the application with: go run ./cmd/apiserver"
}

# Run main function with all arguments
main "$@"
