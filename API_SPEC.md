# DomainFlow API Documentation

The authoritative API definition is **automatically generated** from Go source code and maintained in:

```
backend/docs/openapi-3.yaml
```

## 🚀 Automated Generation Pipeline

1. **Source**: Go backend code with annotations
2. **Generator**: `cmd/generate-openapi/main.go`
3. **Output**: `backend/docs/openapi-3.yaml` (OpenAPI 3.0.3)
4. **TypeScript Types**: Auto-generated to `src/lib/api-client/types.ts`

## Commands

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
- WebSocket push model eliminates need for frequent API polling
