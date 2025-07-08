# DomainFlow API Documentation

The authoritative API definition is **automatically generated** from Go source code and maintained in:

```
backend/docs/openapi-3.yaml
```

## 🏗️ API Architecture

All API endpoints are **standardized under `/api/v2`** for consistency:

### Current API Structure
```
/api/v2/auth/*           # Authentication endpoints
/api/v2/campaigns/*      # Campaign management  
/api/v2/personas/*       # Persona management
/api/v2/proxies/*        # Proxy management
/api/v2/proxy-pools/*    # Proxy pool management
/api/v2/keyword-sets/*   # Keyword set management
/api/v2/me               # User profile
/api/v2/health/*         # Health checks
```

### Legacy Compatibility
- `/auth/*` routes maintained for backward compatibility
- All new development uses `/api/v2` prefix

## 🔄 Generation Process

1. **Source**: Go backend code with OpenAPI annotations
2. **Generator**: `cmd/generate-openapi/main.go`
3. **Output**: `backend/docs/openapi-3.yaml` (OpenAPI 3.0.3)
4. **TypeScript Types**: Auto-generated to `src/lib/api-client/types.ts`

## 🚀 Usage

```bash
# Generate OpenAPI spec + TypeScript types
npm run api:generate

# Generate spec only
npm run api:generate-spec

# Generate TypeScript client only
npm run api:generate-client
```

## ⚠️ Important Notes

- **DO NOT** manually edit `openapi-3.yaml` - it's auto-generated
- All API changes must be made in Go source code with proper annotations
- TypeScript types are automatically synced with backend changes
- All routes use consistent `/api/v2` prefix for predictable client behavior

## 🏠 Frontend Integration

### API Client
The frontend uses auto-generated TypeScript clients that automatically target the correct `/api/v2` endpoints:

```typescript
// All API calls automatically use /api/v2 prefix
await enhancedApiClient.auth.authLoginPost(credentials);
await enhancedApiClient.campaigns.campaignsGet();
await enhancedApiClient.personas.personasGet();
await enhancedApiClient.proxies.proxiesGet();
```

### URL Configuration
Base URLs are automatically configured to include `/api/v2`:
- Development: `http://localhost:8080/api/v2`
- Production: `https://api.domainflow.com/api/v2`

## 📋 Example Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/auth/login` | POST | User authentication |
| `/api/v2/auth/logout` | POST | User logout |
| `/api/v2/me` | GET | Get current user |
| `/api/v2/campaigns` | GET | List campaigns |
| `/api/v2/campaigns` | POST | Create campaign |
| `/api/v2/personas` | GET | List personas |
| `/api/v2/proxies` | GET | List proxies |
| `/api/v2/proxy-pools` | GET | List proxy pools |
| `/api/v2/keyword-sets` | GET | List keyword sets |
| `/api/v2/health` | GET | Health check |

## 🔧 Real-time Updates

WebSocket connections provide real-time updates, eliminating the need for frequent API polling:
- **99%+ reduction** in API requests achieved
- **Zero 429 rate limiting errors** from polling elimination
- Real-time campaign progress, domain generation, and validation updates

## 📚 Additional Resources

- **OpenAPI Spec**: `backend/docs/openapi-3.yaml`
- **TypeScript Types**: `src/lib/api-client/types.ts`
- **Generated Clients**: `src/lib/api-client/api/`
- **Enhanced Client**: `src/lib/utils/enhancedApiClientFactory.ts`
