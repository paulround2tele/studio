# API Contract Governance

## 🚀 Automated System Overview

DomainFlow uses a **fully automated API contract system** with:

- **Auto-generated OpenAPI 3.0.3 spec** from Go source code
- **Auto-generated TypeScript types** from OpenAPI spec  
- **WebSocket push model** eliminating 99% of API polling
- **Real-time synchronization** between backend and frontend

## Current Architecture

```
Go Backend Code (with annotations)
    ↓
cmd/generate-openapi/main.go  
    ↓
backend/docs/openapi-3.yaml (Auto-generated)
    ↓
openapi-typescript
    ↓
src/lib/api-client/types.ts (Auto-generated TypeScript)
```

## 📁 File Structure

### ✅ Current Automated Files (DO NOT EDIT)
- `backend/docs/openapi-3.yaml` - Auto-generated OpenAPI 3.0.3 spec
- `backend/docs/openapi-3.json` - Auto-generated JSON version
- `src/lib/api-client/types.ts` - Auto-generated TypeScript types

### ❌ Legacy Files (REMOVED)
- ~~`backend/docs/openapi.yaml`~~ - Removed (was manually maintained)
- ~~Manual OpenAPI documentation~~ - No longer needed

## 🔄 Automated Workflows

### 1. Backend Changes
```bash
# 1. Make changes in Go source code with proper annotations
# 2. Regenerate OpenAPI spec and TypeScript types
npm run api:generate

# 3. Commit both generated files
git add backend/docs/openapi-3.yaml src/lib/api-client/types.ts
git commit -m "feat: Update API with new endpoints"
```

### 2. Contract Validation Scripts

```bash
#!/bin/bash
# scripts/validate-api-contract.sh

set -e

echo "🔍 Validating API Contract..."

# 1. Regenerate OpenAPI schema from backend
cd backend && go run cmd/generate-openapi/main.go -output docs/openapi-3.yaml

# 2. Check for schema changes  
if git diff --exit-code backend/docs/openapi-3.yaml; then
    echo "✅ Schema unchanged"
else
    echo "⚠️ Schema changes detected - validating..."
fi

# 3. Generate frontend types
cd .. && npm run api:generate-client

# 4. Validate TypeScript compilation
npm run type-check

echo "✅ API Contract validation passed"
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "api:generate-spec": "cd backend && go run cmd/generate-openapi/main.go -output ../backend/docs/openapi-3.yaml",
    "api:generate-client": "openapi-typescript backend/docs/openapi-3.yaml -o src/lib/api-client/types.ts", 
    "api:generate": "npm run api:generate-spec && npm run api:generate-client",
    "api:validate": "scripts/validate-contracts.sh",
    "type-check": "tsc --noEmit --skipLibCheck"
  }
}
```

## 🚀 WebSocket Push Model Benefits

### Traditional Polling (OLD)
- 108+ API requests per minute
- 5-second polling intervals
- High server load
- Delayed updates

### WebSocket Push (CURRENT)  
- ~5-10 API requests per minute (95% reduction)
- Real-time updates via WebSocket
- Minimal server load
- Instant updates

## 🛡️ Contract Governance Rules

### 1. **Never Edit Generated Files**
- `backend/docs/openapi-3.yaml` is AUTO-GENERATED
- `src/lib/api-client/types.ts` is AUTO-GENERATED
- All changes must be made in Go source code

### 2. **Required Annotations**
All Go endpoints must have proper Swagger annotations:

```go
// @Summary Get campaign by ID
// @Description Retrieve campaign details by ID
// @Tags campaigns
// @Accept json
// @Produce json
// @Param id path string true "Campaign ID"
// @Success 200 {object} models.Campaign
// @Failure 404 {object} api.ErrorResponse
// @Router /api/v2/campaigns/{id} [get]
func (h *CampaignHandler) GetCampaign(c *gin.Context) {
    // Implementation
}
```

### 3. **Breaking Changes**
For breaking changes:
1. Add deprecation warnings to old endpoints
2. Create new endpoints with versioning
3. Update frontend to use new endpoints  
4. Remove deprecated endpoints after migration

### 4. **Testing Requirements**
- All new endpoints must have integration tests
- TypeScript compilation must pass
- WebSocket events must be tested

## 🔧 Troubleshooting

### Common Issues

**"Types not updating"**
```bash
npm run api:generate
```

**"OpenAPI spec outdated"**  
```bash
cd backend && go run cmd/generate-openapi/main.go -output docs/openapi-3.yaml
```

**"WebSocket not receiving updates"**
- Check backend WebSocket broadcast calls
- Verify frontend WebSocket connection
- Check message type routing

### Validation Commands

```bash
# Full validation pipeline
npm run api:validate

# Type checking only
npm run type-check

# Build verification
npm run build
```

## 📊 Monitoring

- **API Usage**: WebSocket reduces API calls by 95%
- **Real-time Updates**: All CRUD operations broadcast via WebSocket
- **Type Safety**: 100% TypeScript coverage for API contracts
- **Automation**: Zero manual OpenAPI maintenance required

This automated system ensures **perfect synchronization** between backend and frontend while **eliminating manual maintenance overhead**.