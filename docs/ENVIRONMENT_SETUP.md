# Environment Configuration Guide

## Overview
This project uses environment-based configuration to support multiple development environments. The `.env` file is shared across all development machines for consistency, while `.env.local` provides machine-specific overrides.

## Environment Files (in order of precedence)

1. **`.env.local`** - Machine-specific overrides (not committed to git)
   - Contains: Custom settings for your specific machine
   - Used for: Overriding shared development settings
   - Example: Different ports, custom hostnames, etc.

2. **`.env`** - Shared development configuration (committed to git)
   - Contains: `NEXT_PUBLIC_API_URL=http://localhost:8080`
   - Used for: Consistent defaults across all development machines
   - Shared across the team for consistent development experience

3. **`.env.production.local`** - Production configuration (not committed to git)
   - Contains: `NEXT_PUBLIC_API_URL=https://api.domainflow.local`
   - Used for: Production deployments

4. **`.env.example`** - Template with all available options
   - Full reference of all available environment variables

## Quick Setup

For new development environments:

```bash
# 1. Clone the repository (includes shared .env)
git clone <repository>
cd domainflow

# 2. Install dependencies
npm install

# 3. (Optional) Create machine-specific overrides
cp .env.local.example .env.local
# Edit .env.local if you need custom settings

# 4. Start development
npm run dev
```

## Machine-Specific Overrides

If you need different settings for your specific machine, create `.env.local`:

```bash
# .env.local (not committed to git)
NEXT_PUBLIC_API_URL=http://your-custom-host:9000
NEXT_PUBLIC_WS_URL=ws://your-custom-host:9000/api/v2/ws
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
