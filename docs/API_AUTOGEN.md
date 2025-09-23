# API Autogeneration Pipeline

This repo no longer tolerates manual YAML acrobatics. Use the automated pipeline to bundle, validate, parity-check, and generate clients.

## One-shot run

- npm run api:autogen

Pipeline steps:
- Bundle modular spec -> backend/openapi/dist/openapi.yaml
- Validate with kin-openapi and Redocly (errors block, warnings allowed)
- Dump Gin routes via backend/dump_routes.go
- Check strict parity against bundled paths (fails on diff)
- Generate:
  - TypeScript types (openapi-typescript) -> src/lib/api-client/types.ts
  - typescript-axios client -> src/lib/api-client
  - Static docs -> src/lib/api-client/docs

## Type Safety and Import Guidelines

### Always use auto-generated types

**✅ GOOD:**
```typescript
// Import from barrel export for main types
import type { Campaign } from '@/lib/api-client';

// Import directly from model files for specific types to avoid barrel issues
import type { ModelsProxy } from '@/lib/api-client/models/models-proxy';
import type { ModelsProxyPool } from '@/lib/api-client/models/models-proxy-pool';
```

**❌ BAD:**
```typescript
// Manual type definitions
interface Campaign { /* ... */ }  // ESLint will block this

// Bridge/proxy imports (deprecated)
import { CampaignViewModel } from '@/lib/api-client/types-bridge';
import { Campaign } from '@/lib/api-client/professional-types';

// Barrel imports for certain types (can cause issues)
import { ModelsProxy } from '@/lib/api-client/models';
```

### ESLint Enforcement

The codebase enforces auto-generated type usage through:

1. **Restricted imports**: Blocks deprecated bridge/proxy type paths
2. **Direct import requirements**: Certain types must be imported directly
3. **Manual type prevention**: Blocks interface/type definitions that conflict with generated types

### Type Generation Commands

```bash
# Generate types only
npm run gen:types

# Generate full client + docs
npm run gen:all

# Quick regeneration (common workflow)
npm run api:regen:quick
```

## CI suggestion

Run these in CI:
- npm run api:bundle
- npm run api:validate-bundle
- bash -lc 'cd backend && go run ./dump_routes.go | tee routes.dump.txt'
- npm run api:check-routes
- npm run gen:types
- npm run gen:clients
- npm run gen:docs
- npm run lint  # Enforces type safety rules
- npm run typecheck

Any route mismatch will fail the build.

## Notes

- The Redocly localhost server URL warning is tolerated. You can change it if you need zero warnings.
- If Gin routes change, the autogen script re-dumps before checking. Keep dump_routes.go in sync with router registrations.
- ESLint rules prevent manual type definitions and enforce proper import patterns.
- Git hooks block manual edits to generated files in src/lib/api-client/.
