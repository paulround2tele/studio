# API Inventory & Contract Decisions

- Global defaults
  - Envelope: SuccessEnvelope/ErrorEnvelope via allOf on 200/4xx/5xx (no naked models)
  - Auth: cookieAuth default (HttpOnly, Secure in prod, SameSite=Lax). bearerAuth path-scoped only where required
  - OperationId: present and unique for every operation
  - Pagination: shared params Limit/Offset/Page/PageSize/Sort; only indexed filters allowed
  - Dates: RFC3339 strings; nullable: true where applicable
  - SSE: Canonical events [ping, extraction_progress, extraction_complete, job_progress, job_complete]; heartbeat (ping) + retry semantics documented
  - Error model: ErrorCode enum locked; details[].field uses JSONPointer paths

- Health
  - GET /api/v2/health → envelope JSON
  - GET /api/v2/health/ready → 200/503 envelopes
  - GET /api/v2/health/live → envelope JSON
  - GET /ping → envelope JSON (aligned style)

- Config (idempotent updates) under /api/v2/config
  - GET/PUT /dns, /http, /worker, /rate-limit, /auth, /logging, /proxy-manager, /server
  - GET/PUT /features

- Personas
  - CRUD + type-specific GETs
  - Filters: personaType, isEnabled (indexed)

- Proxies
  - CRUD + status, health-check, bulk update/delete/test
  - Filters: protocol, countryCode, isEnabled (indexed)

- Proxy Pools
  - CRUD + membership add/remove

- Keyword Sets & Rules
  - Sets: CRUD + list with includeRules; list rules per set
  - Rules: query with indexed filters (keyword_set_id, rule_type, category, is_case_sensitive, pattern prefix only)

- Extraction
  - POST /extract/keywords (batch)
  - GET /extract/keywords/stream (SSE) with canonical events and heartbeat/retry

- Database
  - POST /database/query, POST /database/stats (requires X-Requested-With: XMLHttpRequest)

- Tooling & CI
  - Spec source: modular files under backend/openapi (root: openapi.root.yaml; bundled: dist/openapi.yaml)
  - Swagger fossils purged (imports, UI route, backend/docs/*)
  - CI: scripts/validate-openapi-spec.sh runs kin-openapi + redocly; PRs fail on warnings/errors
  - Legacy monolith files (backend/openapi/openapi.yaml, backend/openapi/openapi_backup.yaml) removed; do not reintroduce.

# Contract Inventory and Decisions

## Lint Policy
- All Redocly warnings are targeted for zero. Any temporary tolerated items are listed here with justification.

### Temporarily tolerated
- None. Current spec aims for zero warnings. If any reappear (e.g., dev server localhost), ensure a production server URL remains present to silence the rule.
