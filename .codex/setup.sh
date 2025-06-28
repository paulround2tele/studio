#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Determine repository root (directory containing this script's parent)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$REPO_ROOT"

log_info "Starting DomainFlow development environment setup..."

# Update package lists
log_info "Updating package lists..."
sudo apt-get update -y

# Install system dependencies
log_info "Installing system dependencies..."

# Check if nodejs/npm are already installed
if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    log_info "Node.js and npm already installed, skipping..."
    NODEJS_PACKAGES=""
else
    NODEJS_PACKAGES="nodejs npm"
fi

sudo apt-get install -y \
    postgresql \
    postgresql-contrib \
    postgresql-client \
    $NODEJS_PACKAGES \
    golang-go \
    jq \
    curl \
    git \
    build-essential \
    ca-certificates

# Verify installations
log_info "Verifying installations..."
node --version || log_error "Node.js installation failed"
npm --version || log_error "npm installation failed"
go version || log_error "Go installation failed"
psql --version || log_error "PostgreSQL installation failed"

# Setup database
log_info "Setting up PostgreSQL database..."
if [ -f "$(dirname "$0")/setup_db.sh" ]; then
    "$(dirname "$0")/setup_db.sh"
else
    log_warn "setup_db.sh not found, skipping database setup"
fi

# Install npm dependencies
log_info "Installing npm dependencies..."
if [ -f "package.json" ]; then
    npm install
    log_info "npm dependencies installed successfully"
else
    log_warn "package.json not found, skipping npm install"
fi

# Setup Go backend
log_info "Setting up Go backend..."
if [ -d "backend" ]; then
    cd "$REPO_ROOT/backend"
    
    # Download Go modules
    log_info "Downloading Go modules..."
    go mod download
    
    # Build backend if Makefile exists
    if [ -f "Makefile" ]; then
        log_info "Building backend..."
        make build
    else
        log_info "Building backend with go build..."
        go build -o bin/apiserver ./cmd/apiserver
    fi
    
    cd "$REPO_ROOT"
else
    log_warn "backend directory not found, skipping Go setup"
fi

# Apply database schema
log_info "Applying database schema..."
if [ -f "backend/database/schema.sql" ]; then
    # Apply current schema to production database
    if [ -f "backend/config.json" ]; then
        log_info "Applying schema to production database..."
        PGPASSWORD="$(jq -r '.database.password' backend/config.json)" psql -h "$(jq -r '.database.host' backend/config.json)" -p "$(jq -r '.database.port' backend/config.json)" -U "$(jq -r '.database.user' backend/config.json)" -d "$(jq -r '.database.name' backend/config.json)" < backend/database/schema.sql >/dev/null 2>&1 || {
            log_warn "Failed to apply schema to production database - may already be applied"
        }
    fi

    # Apply schema to test database if it exists
    if [ -f ".codex/test.env" ]; then
        source .codex/test.env
        if [ -n "$TEST_POSTGRES_DSN" ]; then
            log_info "Applying schema to test database..."
            PGPASSWORD=studio psql -h localhost -p 5432 -U studio -d studio_test < backend/database/schema.sql >/dev/null 2>&1 || {
                log_warn "Failed to apply schema to test database - may already be applied"
            }
        fi
    fi
else
    log_warn "Database schema file not found at backend/database/schema.sql"
fi

# Run database check to ensure everything is working
log_info "Verifying database connection..."
if [ -f ".codex/check-db.sh" ]; then
    chmod +x .codex/check-db.sh
    ./.codex/check-db.sh || log_warn "Database check failed, you may need to configure it manually"
fi

log_info "Setup completed successfully!"
log_info ""
log_info "Next steps:"
log_info "1. Start backend server: cd backend && ./bin/apiserver"
log_info "2. Start frontend server: npm run dev"
log_info "3. Open http://localhost:3000 in your browser"
