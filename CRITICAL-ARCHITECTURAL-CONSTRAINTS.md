# 🚨 CRITICAL ARCHITECTURAL CONSTRAINTS

## Unified API Response Structure Requirement

**MANDATORY:** All implementation MUST respect existing sophisticated API architecture:

### ✅ Required Patterns
- **Use existing APIResponse unified structure** - No custom response types
- **Follow existing OpenAPI auto-generation CLI** - No manual API definitions  
- **Leverage existing models.go patterns** - Extend existing enums and structures
- **Use existing middleware/response_types.go** - No custom response handling
- **Follow existing API endpoint patterns** - Match existing handler structure

### ❌ Forbidden Practices
- Creating manual response types outside existing APIResponse structure
- Writing custom API response handling that bypasses unified system
- Manual OpenAPI definitions that don't follow auto-generation patterns
- Custom middleware that conflicts with existing response handling
- Breaking existing API client auto-generation workflow

### 🏗️ Implementation Strategy
1. **Study existing APIResponse structure** in `backend/internal/models/api_responses.go`
2. **Follow existing endpoint patterns** in `backend/internal/api/campaign_orchestrator_handlers.go`
3. **Use existing OpenAPI patterns** in `backend/docs/openapi-3.yaml`
4. **Leverage existing API client** in `src/lib/api-client/`
5. **Extend existing models** in `backend/internal/models/models.go`

### 📋 Validation Checklist
- [ ] All new endpoints use existing APIResponse wrapper
- [ ] All new models follow existing patterns in models.go
- [ ] All OpenAPI documentation follows auto-generation patterns
- [ ] Frontend uses existing API client without modifications
- [ ] No custom response handling outside unified structure

This constraint ensures consistency with the sophisticated, unified API architecture already established throughout the application.