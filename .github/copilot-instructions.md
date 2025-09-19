# DomainFlow Studio Development Instructions

**ALWAYS follow these instructions first and fallback to search or bash commands only when information here is incomplete or found to be in error.**

## Working Effectively

### Bootstrap, Build, and Test the Repository

**Prerequisites (verify first):**
- Node.js 20.19+ and npm 10+
- Go 1.24+ 
- PostgreSQL 16+
- Git

**Database Setup:**
```bash
# Start PostgreSQL service
sudo service postgresql start

# Create database and user
sudo -u postgres psql << 'EOF'
CREATE DATABASE domainflow_production;
CREATE USER domainflow WITH PASSWORD 'pNpTHxEWr2SmY270p1IjGn3dP';
GRANT ALL PRIVILEGES ON DATABASE domainflow_production TO domainflow;
ALTER USER domainflow CREATEDB;
\q
EOF

# Apply database schema (takes ~1.4 seconds)
cd backend && sudo -u postgres psql -d domainflow_production < database/schema.sql
```

**Backend Build Process:**
```bash
cd backend

# Install Go dependencies (takes ~1.9 seconds)
go mod download

# Build backend (takes ~2.0 seconds) - NEVER CANCEL
# Set timeout to 3+ minutes for safety
make build

# Run tests (takes ~16.5 seconds) - NEVER CANCEL  
# Set timeout to 30+ minutes for full test suite
make test

# Start backend server (runs on :8080)
./bin/apiserver
# OR for development with auto-reload:
air
```

**Frontend Build Process:**
```bash
# Install dependencies (takes ~33 seconds) - NEVER CANCEL
# Set timeout to 5+ minutes
npm install

# Generate API client from OpenAPI spec (takes ~11 seconds)
npm run gen:all

# Build frontend (takes ~32 seconds after fixes) - NEVER CANCEL
# Set timeout to 10+ minutes
npm run build

# Start development server
npm run dev
# Frontend runs on http://localhost:3000
```

## Validation

**ALWAYS run through at least one complete end-to-end scenario after making changes.**

**Backend Health Check:**
```bash
# Test backend is responding
curl -s http://localhost:8080/api/v2/health | jq .
# Expected: {"requestId": "", "success": true}
```

**E2E Smoke Test:**
```bash
# With backend running on :8080, validate core flows
scripts/smoke-e2e-campaign.sh
```

**Environment overrides:**
- `BASE_URL` (default http://localhost:8080/api/v2)
- `USER_EMAIL` (default test@example.com)  
- `USER_PASSWORD` (default password)

**ALWAYS run linting and type checking before committing:**
```bash
npm run lint
npm run typecheck
```

## Common Issues and Solutions

**Database Authentication Issues:**
- Ensure PostgreSQL is running: `sudo service postgresql status`
- Check credentials match .env file settings
- Default test users are included in schema.sql:
  - Admin: admin@domainflow.com / AdminPassword123!
  - Developer: dev@domainflow.com / DevPassword123!  
  - Test: test@example.com / password

**TypeScript Compilation Issues:**
- Common pattern: Add null checks for array access
  ```typescript
  // Instead of: snapshots[0].timestamp
  // Use: snapshots[0]?.timestamp ?? fallback
  ```
- Use safe destructuring with fallbacks
- Cast to `any` for complex type issues as last resort

**Backend Build Failures:**
- Check for syntax errors in Go files
- Ensure all imports are properly formatted
- Remove duplicate imports or function declarations

## Timing Expectations - NEVER CANCEL These Operations

**CRITICAL**: Set appropriate timeouts and wait for completion.

- **Database schema setup**: 1.4 seconds
- **Go dependencies download**: 1.9 seconds  
- **Backend build**: 2.0 seconds - Set timeout to 3+ minutes
- **Backend tests**: 16.5 seconds - Set timeout to 30+ minutes  
- **Frontend dependencies**: 33 seconds - Set timeout to 5+ minutes
- **API client generation**: 11 seconds
- **Frontend build**: 32+ seconds - Set timeout to 10+ minutes

## Key Projects in This Codebase

**Backend (Go):**
- `/backend/cmd/apiserver` - Main API server
- `/backend/internal/api` - HTTP handlers and routing
- `/backend/internal/services` - Business logic layer
- `/backend/internal/store` - Data access layer
- `/backend/database` - Schema and migrations

**Frontend (Next.js):**
- `/src/components` - React UI components  
- `/src/pages` - Next.js pages and API routes
- `/src/services` - Business logic and API clients
- `/src/lib` - Utilities and configurations
- `/src/store` - Redux state management

**Key Files:**
- `package.json` - Frontend dependencies and scripts
- `backend/go.mod` - Go dependencies
- `backend/Makefile` - Backend build commands
- `.env` - Environment configuration
- `backend/config.json` - Backend runtime configuration

## Architecture Notes

This is a full-stack TypeScript/Go application with:
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, Redux Toolkit
- **Backend**: Go with Chi framework, PostgreSQL database  
- **API**: OpenAPI 3.1 auto-generated client/server with strict validation
- **Real-time**: Server-Sent Events (SSE) for campaign updates
- **Testing**: Jest for frontend, Go tests for backend, Playwright for E2E

The application manages domain analysis campaigns with multi-phase workflows including domain generation, DNS/HTTP validation, and lead extraction.