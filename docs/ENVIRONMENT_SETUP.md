# Environment Configuration Guide

## Overview
This project uses environment-based configuration to support multiple development environments without hardcoded URLs.

## Environment Files (in order of precedence)

1. **`.env.local`** - Active development overrides (not committed to git)
   - Contains: `NEXT_PUBLIC_API_URL=http://localhost:8080`
   - Used for: Local development

2. **`.env.production.local`** - Production configuration (not committed to git)
   - Contains: `NEXT_PUBLIC_API_URL=https://api.domainflow.local`
   - Used for: Production deployments

3. **`.env.example`** - Template with all available options
   - Copy to `.env.local` and customize for your environment

4. **`.env.local.example`** - Minimal development template
   - Quick start template for new developers

## Quick Setup

For new development environments:

```bash
# Copy the local template
cp .env.local.example .env.local

# Or copy the full template and customize
cp .env.example .env.local

# Edit the URLs for your environment
# Default: NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Environment Variables

### Required
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., http://localhost:8080)
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (e.g., ws://localhost:8080/api/v2/ws)

### Optional
- `NODE_ENV` - Environment mode (development/production)
- `DATABASE_*` - Database connection settings (backend only)

## URL Configuration

The application automatically detects the backend URL in this order:
1. `NEXT_PUBLIC_API_URL` environment variable
2. `API_URL` environment variable (fallback)
3. `http://localhost:8080` (default fallback)

## Cross-Environment Usage

### Local Development
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Docker/Container
```bash
NEXT_PUBLIC_API_URL=http://backend:8080
```

### Remote Backend
```bash
NEXT_PUBLIC_API_URL=https://your-api-server.com
```

### Different Port
```bash
NEXT_PUBLIC_API_URL=http://localhost:9000
```

## Notes

- All hardcoded URLs have been removed from the codebase
- Environment files are ignored by git (except `.example` files)
- Changes take effect after restarting the development server
- Production builds use `.env.production` or `.env.production.local`
