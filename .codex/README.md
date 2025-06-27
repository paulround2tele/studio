# Codex Local Environment Setup

This folder contains helper scripts to configure the local development environment for DomainFlow without Docker.

## Quick Start

Run the complete setup with one command:
```bash
./.codex/setup.sh
```

## Manual Setup Steps

### 1. Install Dependencies
```bash
./.codex/setup.sh
```
This script:
- Installs Node.js, Go, PostgreSQL, and other system dependencies via `apt-get`
- Downloads all npm and Go modules
- Sets up the PostgreSQL service
- Builds the backend if a Makefile is present

### 2. Database Setup
```bash
./.codex/setup_db.sh
```
Or check/create database manually:
```bash
./.codex/check-db.sh
```
This ensures:
- PostgreSQL service is running
- Database `domainflow_production` exists (creates if missing)
- Connection credentials are properly configured
- Schema migrations table is present

### 3. Start Backend Server
```bash
cd ../backend
./apiserver
# or
make run
```
The backend server will:
- Start on port 8080 (configurable in `backend/config.json`)
- Connect to PostgreSQL database
- Serve API endpoints
- Handle WebSocket connections

### 4. Start Frontend Development Server
```bash
npm run dev
```
The frontend will:
- Start on port 3000
- Connect to backend API at localhost:8080
- Enable hot-reload for development
- Serve the Next.js application

## Verification Commands

Check system status:
```bash
./.codex/status.sh          # Overall system status
./.codex/check-db.sh        # Database connectivity
./.codex/check-backend.sh   # Backend linting and tests
```

## Configuration

### Network Access
The codex environment allows internet connections to any URL via:
- `"allowNetwork": true`
- `"allowedDomains": ["*"]`

### Database Configuration
Database credentials can be overridden with environment variables:
- `DATABASE_HOST` (default: localhost)
- `DATABASE_PORT` (default: 5432)
- `DATABASE_NAME` (default: domainflow_production)
- `DATABASE_USER` (default: domainflow)
- `DATABASE_PASSWORD` (from config.json)

If environment variables are not set, the system falls back to:
1. `backend/config.json`
2. `.db_connection` file (if present)

### Service Ports
- Backend API: 8080
- Frontend Dev Server: 3000
- PostgreSQL: 5432

## Troubleshooting

### Database Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL if needed
sudo systemctl restart postgresql

# Check database connection
./.codex/check-db.sh
```

### Backend Issues
```bash
# Check Go installation
go version

# Verify backend dependencies
cd ../backend && go mod tidy

# Build backend manually
cd ../backend && make build
```

### Frontend Issues
```bash
# Check Node.js installation
node --version && npm --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```
