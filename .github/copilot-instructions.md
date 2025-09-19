# DomainFlow Studio - GitHub Copilot Instructions

**ALWAYS follow these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Repository Overview

DomainFlow Studio is a sophisticated full-stack application for intelligent domain generation, validation, and lead extraction campaigns. Built with Next.js 15 frontend (TypeScript) and Go backend, featuring real-time Server-Sent Events (SSE), multi-phase campaign orchestration, and advanced domain status tracking.

## Working Effectively

### Prerequisites & Installation
- **Node.js** 18+ and npm 10+ (verified compatible with Node.js 20.19.5, npm 10.8.2)
- **Go** 1.22+ (verified compatible with Go 1.24.7)
- **PostgreSQL** 14+ (required for integration tests and full application functionality)
- **Git**

### Bootstrap Setup (Required Before Any Development)
Run these commands in order. NEVER CANCEL long-running commands:

```bash
# 1. Install frontend dependencies 
npm install
# Expected time: ~45 seconds. NEVER CANCEL. Set timeout to 90+ seconds.

# 2. Install backend dependencies
cd backend && go mod download
# Expected time: ~15 seconds. Set timeout to 60+ seconds.

# 3. Setup environment files
cp .env.example .env.local
cd backend && cp config.template.json config.json
# Edit .env.local: Set NEXT_PUBLIC_API_URL=http://localhost:8080/api/v2
# Edit config.json: Configure database credentials if using PostgreSQL

# 4. Generate API client (CRITICAL - must run after backend changes)
cd .. && npm run gen:all
# Expected time: ~15 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
```

### Building the Application
**CRITICAL TIMING WARNINGS:**

```bash
# Frontend build
npm run build
# Expected time: 45-60 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
# NOTE: May fail with TypeScript errors - this is expected in current state

# Backend build  
cd backend && make build
# Expected time: 55-65 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
```

### Running Tests
**CRITICAL TIMING WARNINGS:**

```bash
# Frontend tests
npm test
# Expected time: 70-80 seconds. NEVER CANCEL. Set timeout to 180+ seconds.
# NOTE: Some tests may fail due to missing test configuration - this is expected

# Backend tests
cd backend && make test  
# Expected time: 60-70 seconds. NEVER CANCEL. Set timeout to 180+ seconds.
# NOTE: Integration tests require PostgreSQL database and may fail without it
```

### Development Server Startup

**Backend (Required First):**
```bash
cd backend
air
# Backend runs on http://localhost:8080
# Uses Air for hot reload - much faster than manual restarts
```

**Frontend:**
```bash
npm run dev
# Frontend runs on http://localhost:3000
# Proxies API calls to backend at localhost:8080
```

## Validation & Testing

### Manual Validation Requirements
**ALWAYS test actual functionality after making changes. Simply starting/stopping is NOT sufficient.**

1. **Basic Application Flow:**
   - Navigate to http://localhost:3000
   - Login (if authentication is working)
   - Create a test campaign
   - Verify campaign appears in dashboard
   - Check that API calls are working via browser dev tools

2. **API Validation:**
   - Test API endpoints directly: `curl http://localhost:8080/api/v2/health`
   - Verify OpenAPI spec generation: Check `backend/openapi/dist/openapi.yaml` exists
   - Validate generated client types: Check `src/lib/api-client/types.ts` is current

3. **Build Validation:**
   - Always run `npm run typecheck` to catch TypeScript errors
   - Always run `npm run lint` before committing (expect some warnings)
   - Always run `npm run gen:all` after backend API changes

### End-to-End Smoke Test
```bash
# With backend running on :8080, validate core flows:
scripts/smoke-e2e-campaign.sh
# Expected time: 10-30 seconds depending on backend responsiveness
```

## Common Commands & Timing

### API Code Generation (CRITICAL WORKFLOW)
```bash
# After ANY backend API changes, ALWAYS run:
npm run gen:all
# Expected time: ~15 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
# Generates: TypeScript types, API clients, documentation

# Individual generation commands:
npm run gen:types        # OpenAPI -> TypeScript types (~3s)
npm run gen:clients      # OpenAPI -> Axios client (~10s) 
npm run gen:docs         # OpenAPI -> HTML docs (~2s)
```

### Backend API Development
```bash
# Generate OpenAPI server code from spec:
cd backend && make openapi
# Expected time: 10-20 seconds. NEVER CANCEL. Set timeout to 60+ seconds.

# Validate OpenAPI spec:
npm run api:validate-spec
# Expected time: ~5 seconds
```

### Linting & Code Quality
```bash
# Frontend linting (expect warnings, NOT errors):
npm run lint
# Expected time: ~10 seconds

# Type checking (expect MANY errors currently):
npm run typecheck  
# Expected time: ~15 seconds
# NOTE: Repository currently has 381 TypeScript errors - this is known state
```

## Project Structure Key Locations

### Frontend (Next.js 15 + TypeScript)
```
src/
├── app/                    # Next.js App Router pages & layouts
├── components/             # React components (campaigns, dashboard, ui)
├── lib/api-client/         # AUTO-GENERATED - do not edit manually
├── store/                  # Redux Toolkit + RTK Query API state
├── hooks/                  # Custom React hooks
├── services/               # Business logic services
└── types/                  # TypeScript type definitions
```

### Backend (Go 1.22+)
```
backend/
├── cmd/apiserver/          # Main API server entry point
├── internal/api/           # HTTP handlers and routes  
├── internal/services/      # Business logic services
├── internal/store/         # Database access layer
├── database/migrations/    # Database schema migrations
├── openapi/               # OpenAPI 3.1 specification (modular)
└── config.json            # Runtime configuration
```

## Technology Stack Deep Dive

### Frontend Technologies
- **Next.js 15** with App Router (not Pages Router)
- **TypeScript** with strict type checking
- **Redux Toolkit (RTK) + RTK Query** for API state management
- **Tailwind CSS + shadcn/ui** for styling and components
- **Server-Sent Events (SSE)** for real-time updates
- **React Hook Form + Zod** for form validation

### Backend Technologies  
- **Go 1.22+** with Chi web framework
- **oapi-codegen** for strict OpenAPI 3.1 server generation
- **PostgreSQL** with GORM ORM
- **Server-Sent Events (SSE)** for real-time streaming
- **golang-migrate** for database migrations
- **Prometheus metrics** for monitoring

## Critical Warnings & Timeouts

**NEVER CANCEL these commands - they take significant time:**
- `npm install`: 45+ seconds → Set timeout: 90+ seconds
- `npm run build`: 50+ seconds → Set timeout: 120+ seconds  
- `npm test`: 75+ seconds → Set timeout: 180+ seconds
- `make build` (backend): 60+ seconds → Set timeout: 120+ seconds
- `make test` (backend): 65+ seconds → Set timeout: 180+ seconds

**Expected Failures (DO NOT try to fix unless specifically working on these):**
- TypeScript build errors: 381 known errors in current codebase state
- Frontend test failures: Some tests expect missing configuration data
- Backend integration test failures: Require PostgreSQL database setup
- Lint warnings: Expected - focus only on errors

## Database Requirements

### PostgreSQL Setup (For Full Integration)
```bash
# Create database
createdb domainflow

# Run migrations (if database available)
cd backend && go run cmd/migrate/main.go up
```

**Without PostgreSQL:**
- Frontend development works with API mocking
- Backend builds and basic tests work
- Integration tests will fail (expected)

## Common Troubleshooting

### Build Failures
1. **TypeScript errors**: Run `npm run typecheck` to see all errors - many are expected
2. **Missing dependencies**: Run `npm install` in root, `go mod download` in backend
3. **Stale API client**: Run `npm run gen:all` after backend changes
4. **Environment issues**: Verify `.env.local` and `backend/config.json` are configured

### Runtime Issues
1. **API connection failures**: Ensure backend is running on :8080, frontend on :3000
2. **CORS errors**: Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. **Database connection errors**: Expected if PostgreSQL not configured
4. **Missing API types**: Run `npm run gen:all` to regenerate client

### Performance Notes
- **Frontend build**: Slow due to large codebase and TypeScript complexity
- **Backend build**: Slower due to Go compilation and large dependency tree
- **Test suites**: Comprehensive but some fail without full infrastructure
- **API generation**: Fast once working, but sensitive to OpenAPI spec changes

## Development Workflow Best Practices

1. **Always start backend first**: `cd backend && air`
2. **Always regenerate API client after backend changes**: `npm run gen:all`
3. **Always run type checking before committing**: `npm run typecheck`
4. **Always test manual user scenarios after changes**
5. **Never edit `src/lib/api-client/` manually** - it's auto-generated
6. **Set appropriate timeouts for all build/test commands**
7. **Expect some test failures and TypeScript errors in current state**

## Key Files to Monitor
- `backend/openapi/dist/openapi.yaml` - Generated API specification
- `src/lib/api-client/types.ts` - Generated TypeScript API types
- `.env.local` - Frontend environment configuration
- `backend/config.json` - Backend runtime configuration
- `package.json` - Frontend build scripts and dependencies
- `backend/go.mod` - Backend dependencies

## Support Information
For complex issues or when these instructions are insufficient, search the repository for additional context or use bash commands to explore further. Always validate any commands found through search before adding them to development workflow.