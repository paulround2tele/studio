# Professional API Client

Clean, type-safe API client generated from OpenAPI specifications with zero naming disasters.

## What Was Fixed

### Before (The Disaster)
- **3 competing code generation strategies** running in parallel
- **Duplicate models** with garbage names like `github-com-fntelecomllc-studio-backend-internal-models-bulk-delete-proxies-request.ts`
- **Post-processing scripts** trying to fix the mess after generation
- **Auto-generated chaos** with axios dependencies and configuration hell
- **Naming abominations** from OpenAPI Generator CLI package path resolution

### After (The Solution)
- **Single generation strategy** using `openapi-typescript`
- **Clean type-safe interface** without naming disasters
- **Professional API client** with proper error handling
- **Zero dependencies** beyond standard fetch
- **Maintainable codebase** that doesn't require janitor scripts

## Directory Structure

```
src/lib/api-client/
├── index.ts      # Professional API client with clean interfaces
├── types.ts      # Auto-generated types from OpenAPI (clean names)
└── .gitignore    # Only ignores auto-generated types.ts
```

## Usage

### Import the Client
```typescript
import { apiClient, api, type BulkDeleteProxiesRequest } from '@/lib/api-client';
```

### Use Convenience Methods
```typescript
// Login
const response = await api.login({ username: 'user', password: 'pass' });

// Proxies
const proxies = await api.getProxies();
const newProxy = await api.createProxy({ host: '1.2.3.4', port: 8080 });

// Bulk operations with clean types
const deleteRequest: BulkDeleteProxiesRequest = {
  proxyIds: ['uuid1', 'uuid2', 'uuid3']
};
await api.bulkDeleteProxies(deleteRequest);
```

### Use Raw Client for Advanced Operations
```typescript
// Direct API access with full type safety
const result = await apiClient.post<ApiResponse<SomeType>>('/custom/endpoint', data);
```

### Authentication
```typescript
// Set auth token
apiClient.setAuth('your-jwt-token');

// Clear auth
apiClient.clearAuth();
```

## Type Safety

All types are generated from the backend OpenAPI specification with clean names:

```typescript
// Clean, professional type exports
export type BulkDeleteProxiesRequest = components['schemas']['models.BulkDeleteProxiesRequest'];
export type Proxy = components['schemas']['models.Proxy'];
export type ApiResponse<T> = components['schemas']['api.APIResponse'] & { data?: T };
```

## Generation Workflow

### Single Command
```bash
npm run api:generate
```

This runs:
1. `cd backend && make openapi` - Generate OpenAPI spec from Go code
2. `openapi-typescript backend/docs/swagger.yaml -o src/lib/api-client/types.ts` - Generate clean TypeScript types

### No More Chaos
- ❌ No `openapi-generator-cli` creating naming disasters
- ❌ No post-processing scripts fixing broken generation
- ❌ No duplicate model files with different naming schemes
- ❌ No axios configuration hell
- ✅ Single source of truth from backend OpenAPI spec
- ✅ Clean TypeScript types with proper names
- ✅ Professional API client with error handling
- ✅ Zero maintenance overhead

## Error Handling

The API client includes proper error handling:

```typescript
try {
  const result = await api.getProxies();
} catch (error) {
  console.error(`API Error: ${error.message}`);
  // Error format: "API Error 400: Invalid request parameters"
}
```

## Adding New Endpoints

1. Add the endpoint to your Go backend with proper swagger annotations
2. Run `npm run api:generate` to regenerate types
3. Add convenience method to the `api` object in `index.ts` (optional)

Example:
```typescript
// Add to the api object
export const api = {
  // ...existing methods...
  
  // New method using generated types
  newEndpoint: (request: NewRequestType) => 
    apiClient.post<ApiResponse<NewResponseType>>('/new/endpoint', request),
};
```

## Benefits

- **Type Safety**: Full TypeScript safety from backend to frontend
- **Clean Names**: No more package path disasters in type names
- **Single Source**: One generation strategy, one source of truth
- **Maintainable**: No post-processing scripts or duplicate models
- **Professional**: Clean, documented API with proper error handling
- **Fast**: Minimal bundle size, no unnecessary dependencies
