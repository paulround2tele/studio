API Stabilization and Spec Hygiene Plan
Let’s turn this contract chaos into something a generator won’t cry over. Clean phases, ruthless outcomes.

Phase 0 — Ground Rules
Pin toolchain versions in package.json and go.mod to stop drift.
Treat the OpenAPI as the source of truth. No “it returns something like this.”
Stop merging if the pipeline warns. Warnings are just errors that haven’t grown up yet.
Exit criteria:

All generator and swag versions pinned; pipeline is reproducible.
Phase 1 — Envelope Alignment (Spec ⇄ Runtime)
Update all Swagger annotations to document the unified envelope:
Success: APIResponse{data=Type} or APIResponse{data=[]Type}
Failure: APIResponse{error=ErrorInfo}
Fix files that lie: persona_handlers.go, proxy_handlers.go, keyword_set_handlers.go, proxy_pool_handlers.go, etc.
Remove any success annotations that expose bare models while respondWithJSONGin wraps them.
Exit criteria:

No endpoint in the spec returns a bare payload; all are documented as APIResponse{...}.
Phase 2 — Stable operationIds
Add @ID to every endpoint with a consistent naming scheme:
personas: listPersonas, createPersona, getPersona, updatePersona, deletePersona, testPersona
proxies: listProxies, createProxy, updateProxy, deleteProxy, healthCheckProxy, bulkUpdateProxies, bulkDeleteProxies, bulkTestProxies
keyword-sets: createKeywordSet, listKeywordSets, getKeywordSet, updateKeywordSet, deleteKeywordSet, listKeywordRules, queryKeywordRules
Cover all remaining resources (proxy-pools, ping, SSE/WS, campaigns).
Exit criteria:

Codegen shows zero “empty operationId” or auto-generated names.
Phase 3 — Router Path Normalization
The server base is /api/v2 in main.go. Therefore:
Use relative @Router paths everywhere (no /api/v2 prefix in annotations).
Fix offenders in keyword_set_handlers.go and anywhere else.
Exit criteria:

Spec paths are clean; no double /api/v2/api/v2 nonsense.
Phase 4 — Response Wrapping Sanity
Kill double-wrapping: never pass NewSuccessResponse(...) into respondWithJSONGin.
If you already built an APIResponse, write it with c.JSON directly.
Exit criteria:

No cases of envelope-inside-envelope in the server.
Phase 5 — DTO Boundary and Enum Hygiene
Create API-local DTOs/enums in api (e.g., PersonaType).
Replace references to models.PersonaTypeEnum in public schemas.
Map at the boundary in handlers (internal ↔ API types).
Exit criteria:

OpenAPI references only API-local types; no internal model packages leak into the schema.
Phase 6 — “Any” Taming (Schema Specificity)
Keep runtime APIResponse.Data as json.RawMessage, but:
Ensure each endpoint annotation specifies APIResponse{data=ConcreteType} so the schema is typed.
Keep ErrorDetail.Context and Metadata.Extra documented as object (not any).
Exit criteria:

Codegen warnings about “no Type” drop for success payloads.
Phase 7 — SSE and Logging Cleanups
Replace deprecated CloseNotify() with c.Request.Context().Done() in sse_handlers.go.
Remove or env-gate the spammy debug logs in respondWithJSONGin.
Exit criteria:

No CloseNotify() usage; normal traffic doesn’t flood logs.
Phase 8 — REST Verb/Path Normalization
Collections: GET list, POST create.
Items: GET read, PUT/PATCH update, DELETE delete.
Bulk: /resource/bulk/{action} with consistent verbs across personas, proxies, keyword-sets.
Exit criteria:

Resource routes are consistent; no snowflake verbs or random paths.
Phase 9 — OpenAPI Version Decision + Pinning (COMPLETED)
Decision: Remain on OpenAPI 3.1.0 to leverage enhanced JSON Schema alignment; stability acceptable with current toolchain.
Pinned Toolchain:
- oapi-codegen v2.5.0 (pinned in Makefile install line)
- openapi-generator-cli 7.14.0 (pinned in root & backend openapitools.json)
Actions Executed:
- Confirmed all bundled spec roots declare `openapi: 3.1.0`.
- Ensured no fallback / drift to earlier spec versions in scripts.
Exit criteria:
- All generation invokes 3.1.0 spec without warnings blocking CI.
- Re-generation is reproducible (validated via `make openapi`).
Phase 10 — CI Gates to Prevent Relapse
CI runs npm run gen:openapi and npm run gen:all.
Fail the build on:
Auto-generated operationIds
Reserved-name renames (e.g., “Error” → “ModelError”)
/api/v2 appearing inside @Router
Envelope mismatch (grep for success responses not using APIResponse{data=...})
Exit criteria:

PRs can’t reintroduce this mess without being publicly shamed by CI.
Phase 11 — Docs + Swagger UI
Regenerate HTML docs, ensure Swagger UI remains gated to non-prod or SWAGGER_ENABLED=true.
Exit criteria:

Updated docs reflect the corrected contract; UI exposure follows environment policy.