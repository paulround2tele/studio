Got it. Here’s a clear, phased plan to split the adapter and keep migrating handlers systematically without changing behavior first.

## Phase 0 — Baseline and guardrails
- Confirm current build and codegen are green.
- Keep Chi as default; Gin behind USE_GIN=1 until full parity.
- Rule: use generated success models and error alias types (BadRequestJSONResponse, InternalServerErrorJSONResponse) only.

Success criteria:
- make -C backend build passes
- No changes in runtime behavior

## Phase 1 — File split (no behavior change)
Goal: modularize handler implementations by domain while keeping one strictHandlers type.

Edits (same package: cmd/apiserver):
- chi_handlers.go: unchanged (wiring only)
- dependencies.go: unchanged (AppDeps)
- Create:
  - handlers_strict_types.go: defines strictHandlers, boolPtr, okMeta, reqID, toMap
  - handlers_health.go: HealthCheck, HealthLive, HealthReady, Ping
  - handlers_config.go: DNS/HTTP/Logging/RateLimiter/Server/Worker
  - handlers_feature_flags.go
  - handlers_proxy_manager.go
  - handlers_stubs.go: temporarily hold all remaining unimplemented methods
- Move the methods from strict_adapter.go into above files and delete strict_adapter.go

Success criteria:
- Build passes
- No behavior diffs (health and implemented config endpoints still work)

## Phase 2 — Bulk domains migration
Goal: replace legacy bulk handler logic with strict methods.

Endpoints to implement in handlers_bulk.go:
- BulkAnalyzeDomains
- BulkGenerateDomains
- BulkValidateDNS
- BulkValidateHTTP
- CancelBulkOperation
- GetBulkOperationStatus
- AllocateBulkResources
- GetBulkResourceStatus

Steps:
- Lift needed services/stores from main.go (Gin path) into AppDeps (DB handle, stores, bulk services).
- Port logic from internal/api/bulk_domains_handlers.go respecting:
  - Request/response shapes from gen.* types
  - Standard envelopes and error aliases
- Minimal happy-path tests or a tiny local smoke for each endpoint.

Success criteria:
- Build passes
- Bulk endpoints return valid envelopes and plausible data paths
- Legacy bulk file becomes unused

## Phase 3 — Personas
handlers_personas.go:
- PersonasList, PersonasCreate, PersonasGet, PersonasUpdate, PersonasDelete
- PersonasGetDns, PersonasGetHttp, PersonasTest

Steps: same as Phase 2 (wire services into AppDeps, port logic, validate types).

Success criteria:
- Build passes
- Personas endpoints functional

## Phase 4 — Proxies and Proxy Pools
handlers_proxies.go and handlers_proxy_pools.go:
- ProxiesList/Create/Update/Delete/Status/Test/HealthCheck*
- ProxiesBulk* (Delete/Test/Update)
- ProxyPoolsList/Create/Update/Delete/AddProxy/RemoveProxy

Success criteria:
- Build passes
- Basic smoke OK

## Phase 5 — Campaigns and Bulk Ops
handlers_campaigns.go:
- CampaignsList/Create/Get/Update/Delete
- CampaignsProgress
- CampaignsPhase* (Configure/Start/Status/Stop)
- CampaignsBulkOperationsList

Success criteria:
- Build passes
- Progress/phase endpoints return envelopes

## Phase 6 — Monitoring
handlers_monitoring.go:
- Monitoring* endpoints (Health, Stats, Performance*, Resources*, Dashboard*, Cleanup*)

Success criteria:
- Build passes
- Monitoring reads from deps; no panics

## Phase 7 — SSE
handlers_sse.go:
- SseEventsAll, SseEventsStats, SseEventsCampaign
- Keep SSE; avoid websockets

Success criteria:
- SSE streams work
- No websocket usage remains

## Phase 8 — Cleanup and removal
- Remove corresponding legacy Gin files once their strict equivalents are live:
  - internal/api/bulk_domains_handlers.go (after Phase 2)
  - internal/api/feature_flags_handlers.go (already replaced)
  - other domain files as each phase completes
- Remove USE_GIN toggle when all endpoints are ported
- Remove legacy Swagger fossils and monolithic openapi.yaml remnants already targeted

Success criteria:
- Repo builds without Gin code paths
- No Swagger artifacts
- One OpenAPI source of truth (modular -> bundled -> codegen)

## Phase 9 — Hardening
- Quality gates: build, lint, unit smoke, e2e focus paths
- Update docs (docs/), Makefile targets, and any ops scripts
- Optional: clean S1002 in main.go and small lints in new files

Success criteria:
- CI green
- Developer docs reflect new structure

## Risks and mitigations
- Type mismatches with generated models → always check gen.* response wrappers; use alias types for errors.
- Hidden deps in Gin init → trace main.go, move to AppDeps, keep constructor funcs side-effect free.
- Envelope drift → rely only on generated 200/400/500 models; never hand-roll shapes.

## PR slicing
- PR1: Phase 1 split (no behavior change).
- PR2: Phase 2 bulk endpoints + AppDeps additions.
- PR3+: One domain per PR (personas, proxies, campaigns, monitoring, SSE).
- Final PR: Cleanup removal and toggle elimination.

Ready to proceed with Phase 1 split as described.