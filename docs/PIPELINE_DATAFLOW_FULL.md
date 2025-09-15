# End-to-End Campaign Pipeline & Data Flow (Authoritative Reference)

> Status: Draft v1 (derived directly from current backend & frontend source as of this commit). This document enumerates every phase, endpoint, payload, SSE event, UI state transition, error path, invariant, and edge case observed in the codebase. Use this as the single source of truth for debugging, E2E test authoring, performance tuning, and future refactors.

---
## 1. High-Level Lifecycle

Phases execute in conceptual order:
1. `discovery`  (domain generation)
2. `validation` (DNS validation)  
3. `extraction` (HTTP keyword validation / content probing + feature vector persistence)  
4. `analysis`   (scoring-only; reuses persisted HTTP feature vectors – no content fetch or keyword extraction)

Execution Modes:
- `step_by_step`: Each phase requires explicit user start.
- `full_sequence`: Automatic chaining; upon phase completion orchestrator auto-starts the next configured phase (emits `phase_auto_started`).

Prerequisites per phase:
- discovery: requires domain generation configuration (`patternType`, character config, counts, etc.)
- validation: requires DNS personas (`personaIds`) (proxy pool optional)
- extraction: requires HTTP personas (`personaIds`) + optional `keywordSetIds`, `adHocKeywords`, proxy pool
- analysis: (in current code) starts after prior phases— may rely on data completeness but minimal explicit config in reviewed code.

Persistence: Phase configurations stored in campaign row (JSONB) keyed by phase; status transitions persisted via orchestrator updates and progress monitors.

---
## 2. Core Data Models (Selected Fields)

`LeadGenerationCampaign` (backend `models.go`):
- `ID` (uuid)
- `Name`, `Description`
- `Mode` (execution mode)
- Per-phase config/status fields (JSON payload + timestamps + status enum)

`CampaignPhase` status enum (exposed via `PhaseStatusResponse.status`): `not_started | configured | running | paused | completed | failed`

`GeneratedDomain` (subset):
- `ID`, `Domain`
- Generation metadata (pattern indices)
- DNS result flags / validation status
- HTTP fetch metrics / keyword hits / scoring

`PhaseStatusResponse` (OpenAPI / TS model):
- `phase`: `discovery|validation|extraction|analysis`
- `status`: enum above
- `configuration`?: object (phase-specific config snapshot)
- `startedAt?`, `completedAt?` (ISO strings)
- `progress`: `{ current?: number; total?: number; percent?: number; ... }` (shape is generic; backend ensures presence)
- `errors?`: array of `{ code?: string; message?: string }`

`CampaignDomainsListResponse`:
- `campaignId`
- `items`: `DomainListItem[]`
- `total`: total domains in campaign (authoritative for pagination)
- `aggregates?`: grouped counters (dns/http/lead) & scoring stats
- `pageInfo?`: conventional pagination metadata

---
## 3. REST Endpoint Summary (Phase & Domains)

| Purpose | Method & Path | Frontend Hook | Tag Effects | Notes |
|---------|---------------|---------------|-------------|-------|
| Create campaign | POST `/api/v2/campaigns` | `useCreateCampaignMutation` | Invalidate `Campaign`, `CampaignList` | Returns `CampaignResponse` |
| Enriched detail | GET `/api/v2/campaigns/{id}/enriched` | `useGetCampaignEnrichedQuery` | Provides `Campaign`, `CampaignProgress` | Aggregated & denormalized |
| List campaigns | GET `/api/v2/campaigns` | `useGetCampaignsStandaloneQuery` | Provides `CampaignList` | |
| Domains list | GET `/api/v2/campaigns/{id}/domains?limit&offset` | `useGetCampaignDomainsQuery` | Provides `CampaignDomains` | Paginates with virtualization on UI |
| Progress | GET `/api/v2/campaigns/{id}/progress` | `useGetCampaignProgressStandaloneQuery` | Provides `CampaignProgress` | Also updated via SSE |
| Configure phase | POST `/api/v2/campaigns/{id}/phases/{phase}/configure` | `useConfigurePhaseStandaloneMutation` | Invalidate `Campaign`, `CampaignProgress`, `CampaignPhase` | Body: `{ configuration: {...}, proxyPoolId? }` |
| Start phase | POST `/api/v2/campaigns/{id}/phases/{phase}/start` | `useStartPhaseStandaloneMutation` | Invalidate `Campaign`, `CampaignProgress`, `CampaignDomains?`, `CampaignPhase` | Idempotent start |
| Phase status | GET `/api/v2/campaigns/{id}/phases/{phase}/status` | `useGetPhaseStatusStandaloneQuery` | Provides `CampaignProgress`, `CampaignPhase` | |
| Pattern offset utility | POST (?) `/api/v2/campaigns/domain-generation/pattern-offset` | `useGetPatternOffsetQuery` | None | Derived pattern metrics |
| Update mode | POST `/api/v2/campaigns/{id}/mode` | `useUpdateCampaignModeMutation` | Invalidate `Campaign`, `CampaignProgress` | Triggers `mode_changed` SSE |
| Domain score breakdown | GET `/api/v2/campaigns/{id}/domains/score-breakdown?domain=` | `useGetCampaignDomainScoreBreakdownQuery` | Provides `Campaign` | Runtime introspection |

SSE subscription endpoints:
- User scope: `/api/v2/sse/events`
- Campaign scope: `/api/v2/sse/campaigns/{id}/events`

---
## 4. Phase Configuration Forms (Frontend Fields)

### Discovery (`DiscoveryConfigForm`)
User Inputs: `patternType (prefix|suffix|both)`, `constantString`, `prefixLength`, `suffixLength`, `characterSet`, `numDomainsToGenerate`, `batchSize`, `tlds` (CSV -> array), derived `variableLength` & normalized single `tld` (first item).  
Normalization: If both prefix & suffix: sums lengths into single `variableLength` for backend compatibility.

### DNS Validation (`DNSValidationConfigForm`)
User Inputs: `name`, `personaIds[]` (required, max 5), optional `proxyPoolId`.  
Backend Config Payload: `{ dnsValidation: { personaIds, name } , proxyPoolId? }`.

### HTTP Extraction (`HTTPValidationConfigForm`)
User Inputs: `name`, `personaIds[]` (required, max 5), `keywordSetIds[]` (optional), `adHocKeywords[]` (optional), `proxyPoolId?`.  
Backend Config: `{ httpValidation: { personaIds, name, keywordSetIds, adHocKeywords }, proxyPoolId? }`.

### Analysis Phase
No dedicated config form located in scanned sources (likely implicit). If future config emerges, must extend `PhaseConfigurationRequest.configuration.analysis`.

---
## 5. SSE Events (Backend -> Frontend Contract)

Declared in `backend/internal/services/sse_service.go`:

| Event | Purpose | Payload (`data`) Keys | Frontend Consumers |
|-------|---------|-----------------------|--------------------|
| `keep_alive` | Connection heartbeat | `message` | Ignored silently |
| `campaign_progress` | Incremental progress | `campaign_id`, `progress` (arbitrary map) | `useCampaignSSE`, `useCampaignPhaseEvents` merge & invalidate |
| `phase_started` | Manual start ack | `campaign_id`, `phase`, `message` | Dispatch `phaseStarted`, invalidate tags, toast |
| `phase_auto_started` | Auto chain start | `campaign_id`, `phase`, `message` | (Handled as generic phase start via shared watchers; ensure parity if specialized UX needed) |
| `phase_completed` | Success transition | `campaign_id`, `phase`, `results?`, `message` | Dispatch `phaseCompleted`, invalidate, toast |
| `phase_failed` | Failure transition | `campaign_id`, `phase`, `error`, `message` | Dispatch `phaseFailed`, toast (destructive) |
| `campaign_completed` | All phases finished | `campaign_id`, `message`, meta extras | Invalidate campaign & domains, toast |
| `domain_generated` | New domain or interim status | Domain fields (id/domain/status etc.) | Optimistic multi-page cache patch + virtualization refresh |
| `domain_validated` | DNS validation batch update | Domain fields (id/domain/status etc.) | Same optimistic patch routine |
| `counters_reconciled` | Post reconciliation adjustments | Aggregated counters | (No explicit consumer yet) |
| `analysis_reuse_enrichment` | Analysis preflight succeeded; HTTP feature vectors being reused (scoring-only) | `campaignId`, `featureVectorCount`, `timestamp` | (NEW) Optional toast/log; can trigger progress jump |
| `analysis_failed` | Analysis preflight failed (no feature vectors) | `campaignId`, `error`, `errorCode`, `timestamp` | (NEW) Show structured error; guide user to run extraction |
| `analysis_completed` | Final analysis metrics ready | Analysis payload | Handled by hook; can refresh scoring views |
| `mode_changed` | Execution mode toggled | `campaign_id`, `mode`, `message` | `useCampaignSSE` triggers mode change handler |
| `error` | Generic channel error | `error` or `message` | Notifies UI error handler |

NOTES:
- `domain_generated` / `domain_validated` patch across cached domain pages for limits 25/50/100 via probing until cache miss or total coverage.
- No direct consumer for `counters_reconciled` in provided hooks (gap; consider invalidating domains + progress when received).

---
## 6. Frontend State / Caching Mechanics

Key Stores:
- RTK Query slice: `campaignApi` (cache entries keyed by endpoint args)
- Execution runtime slice: `pipelineExecSlice` (phases per campaign keyed by phase)
- UI guidance slice: `campaignUiSlice` (messaging— referenced for guidance messages)

Invalidation Strategy:
- Mutations (configure/start/mode) proactively invalidate relevant `Campaign`, `CampaignProgress`, and phase-specific tags so UI queries refetch.
- SSE events trigger additional `invalidateTags` or direct `updateQueryData` (progress + domain optimistic merges) reducing poll latency.

Optimistic Domain Patch Algorithm (Summarized):
1. For each active page size (25,50,100) attempt sequential page offsets.
2. Use `updateQueryData` to patch matching domain by `id` OR `domain`.
3. Stop probing on first cache miss or after computed page count (if `total` known) or hard cap (25 pages).

Virtualization: Domain lists (e.g., `DomainsList.tsx` / `DomainStreamingTable.tsx`) rely on dynamic virtualization to render only visible subset; ensures patch operations don't force full re-render cost at scale.

Execution Runtime Slice Transitions:
- `phaseStarted` sets `status=running` & `startedAt` (first time only)
- `phaseCompleted` sets `status=completed` & `completedAt`
- `phaseFailed` sets `status=failed`, stamps `error`
This runtime slice is independent from server authoritative status but updated to reflect SSE immediacy; eventual consistency achieved when underlying queries refetch.

---
## 7. Per-Phase Detailed Data Flows

### 7.1 Discovery Phase
User Action: Submit DiscoveryConfigForm -> call `configurePhase` (phase=`discovery`).  
Backend Handler (`CampaignsPhaseConfigure`):
1. Validate phase & campaign existence.
2. Normalize domain generation config (`mapToDomainGenerationConfig` – lenient key parsing; ensures `tld` dotted).
3. Persist config (updates campaign phase record, status => `configured`).
4. Build and return `PhaseStatusResponse`.
User Start: Press start (button or chained). Frontend mutation `startPhaseStandalone` -> POST start.
Orchestrator (`StartPhaseInternal`):
1. Idempotency: if already running/complete, short-circuit.
2. Validate required configuration exists else error (HTTP 409 `MissingPhaseConfigsError`).
3. Spawn background goroutine for generation; emit `phase_started` SSE.
4. Domain generation service yields domains => emits `domain_generated` events (observed by presence; emission logic in domain generation services file — not fully enumerated here but events present in constants).
5. On completion: emit `phase_completed`; persist `completedAt` and final status.
6. If mode is `full_sequence`: orchestrator automatically invokes next phase start -> `phase_auto_started`.
Frontend Reaction:
- SSE `phase_started` -> runtime slice update + invalidations.
- Domain events patch cached lists -> UI virtualization displays new rows.
- Completion triggers toast + invalidations (domains & progress reload for totals).

### 7.2 DNS Validation Phase
User Config: `DNSValidationConfigForm` (personas + optional proxy pool) -> configure mutation.
Backend Validate: Ensures `personaIds` non-empty (400 if missing). Proxy pool optional.
Start Logic: Similar orchestration path; DNS worker(s) validate domains in batches.
Events:
- May emit `domain_validated` (batch or per domain update) with enriched DNS status fields.
- Progress updates via `campaign_progress` as counters advance.
- Failures produce `phase_failed` with error message; on success `phase_completed`.
Frontend Reaction:
- `domain_validated` patches domain cache (status & validation results).
- `phase_completed` invalidates `CampaignDomains` to ensure aggregated counters (e.g., validated count) refresh.

### 7.3 HTTP Extraction Phase
User Config: `HTTPValidationConfigForm` specifying personas, keyword sets, ad hoc keywords, optional proxy.
Start Flow: Orchestrator identical pattern; HTTP fetch and keyword scanning executed per domain subset.
Events:
- Potentially reuses `domain_validated` or distinct events for HTTP enrichment (code shows only `domain_validated` constant; pattern implies separate event could be added— currently updates rely on same optimistic patch path because both events are handled together in `useCampaignPhaseEvents`).
- `campaign_progress` for processed vs total domains.
Scoring: Intermediate scoring fields updated in domain objects; reflected through domain list refetch / optimistic patch.

### 7.4 Analysis Phase (Refactored: Scoring-Only)
Start: Manual or auto-start after extraction (if `full_sequence`). Configuration currently optional/empty; legacy config fields retained for future weighting but content fetching & keyword extraction have been removed from this phase.

Preflight: Executes `SELECT COUNT(*) FROM generated_domains WHERE campaign_id=$1 AND feature_vector IS NOT NULL`. If the count is zero the phase fails immediately with structured error code `E_ANALYSIS_MISSING_FEATURES` and emits `analysis_failed` SSE (includes `errorCode`). This indicates HTTP extraction was skipped, failed, or produced no enrichments.

Processing: When feature vectors exist the service emits `analysis_reuse_enrichment` (with `featureVectorCount`) then jumps progress to 85%, performs scoring, advances to 99% when scoring completes, and finalizes at 100%. (Legacy 10–80% content fetching and 80–95% keyword extraction windows removed.)

Scoring Engine: Reads each domain's `feature_vector` JSON to compute `relevance_score` / `domain_score` using normalized weights (density, coverage, non-parked, content length quality, title keyword, freshness, optional TF-lite) and a parked penalty factor. Bulk updates persist scores back to `generated_domains`.

Events:
* `analysis_reuse_enrichment` – transparency event emitted once post-preflight.
* `domain_scored` – sample of domains + components (existing behavior; component detail flags still honored).
* `rescore_progress` – periodic progress for large sets.
* `analysis_failed` – structured preflight failure (`errorCode: E_ANALYSIS_MISSING_FEATURES`).
* `analysis_completed` – final success.
* `campaign_completed` – orchestrator emits after all phases end.

Frontend Reaction: Handle `analysis_reuse_enrichment` (optional toast/log) and map `analysis_failed` with `E_ANALYSIS_MISSING_FEATURES` to user guidance: "Run HTTP Extraction phase before Analysis". Progress bars should reflect jump semantics (85% at scoring start) without intermediate legacy steps.

---
## 8. Error & Retry Semantics

Configure Endpoint Errors (`/phases/{phase}/configure`):
- 400: invalid phase name; missing required config keys (e.g., missing `personaIds` for DNS / HTTP if required); invalid domain generation parameters (sanity checks in mapping function).
- 404: campaign not found.
- 500: internal persistence errors.

Start Endpoint Errors (`/phases/{phase}/start`):
- 400: invalid phase enum.
- 404: campaign or phase record absent.
- 409: phase missing configuration (raised by orchestrator `MissingPhaseConfigsError`).
- 500: internal error launching the background job.

Runtime Failures:
- On background failure orchestrator emits `phase_failed` with error text; state persisted as `failed` & UI shows toast.
- Manual retry: user re-clicks start after addressing configuration; orchestrator idempotency guard allows re-run if previously failed (status transitions observed in code branch patterns).

SSE Stream Errors:
- Network / transport: Hook reconnect attempts (autoReconnect= true, max attempts varies by hook: 5 vs 10). After exhaustion, UI can present degraded mode (not yet implemented). Potential improvement: add global offline state flag.

Optimistic Patch Risks:
- Domain not yet in cached page -> patch is silent no-op; eventual consistency resolved on next refetch or scroll.
- Duplicate events -> patch overwrites with same or newer status (idempotent).

---
## 9. Edge Cases & Invariants

| Category | Invariant / Edge Case | Current Handling | Risk / Gap |
|----------|-----------------------|------------------|------------|
| Idempotent Start | Repeated start calls for running/completed phase | Short-circuited in orchestrator | Need explicit 200 vs 409 distinction docs |
| Persona Requirements | DNS / HTTP require personaIds non-empty | Backend 400 validation | Need frontend pre-check to reduce round trips |
| Full Sequence Mode | Auto-chaining requires next phase configured | Orchestrator triggers `phase_auto_started` | If not configured -> potential fail fast (should emit failure) |
| Pagination Consistency | Offsets stable while domains append | Cache patch only updates existing pages | Late pages need user scroll or manual refetch |
| Multi-Limit Caches | 25/50/100 pages patched separately | Iterative probing until miss or total pages | Extra CPU vs selective targeted page caching |
| SSE Ordering | Events may arrive out of order under latency | Runtime slice overwrites status logically (completed after started) | Potential race if `phase_failed` then `phase_completed` emitted erroneously (not observed) |
| Counters Reconcile | `counters_reconciled` not consumed | No UI invalidation | Add handler to refresh domain + progress |
| Mode Change Sync | `mode_changed` updates UI via SSE | Handler validates mode string | Ensure persisted mode reflects after race with manual toggle |
| Large Domain Export | Bulk export loop (limit=1000) capped by 500 pages | Prevents runaway requests | Document memory usage for huge campaigns |

Performance Considerations:
- Virtualization + incremental SSE patches keep render cost low (<O(visibleRows)>).
- Optimistic patch algorithm worst case: 25 pages * 3 limit sets = 75 update attempts per domain event (bounded). Consider storing discovered page count in memo for next event.

---
## 10. Textual Sequence Diagrams

### Discovery (Step-by-Step Mode)
User Save Config -> POST configure -> 200 PhaseStatus(configured)
User Start -> POST start -> 200 PhaseStatus(running) + SSE `phase_started`
Background generation -> SSE `domain_generated` (n times) -> UI patch pages
Last domain produced -> SSE `phase_completed` -> UI invalidates & marks runtime completed

### DNS Validation (Full Sequence)
Prior phase completed -> Orchestrator auto-start -> SSE `phase_auto_started` (treated as started)
DNS workers validate batches -> SSE `domain_validated` events + progress updates
Completion -> SSE `phase_completed` -> Orchestrator may chain extraction

### Failure / Retry Path
During extraction, worker error -> SSE `phase_failed` -> runtime status=failed -> user adjusts config -> re-run start -> SSE `phase_started` again.

---
## 11. Known Gaps / Improvement Opportunities

1. (RESOLVED) `counters_reconciled` SSE now handled: invalidates Campaign, CampaignProgress, CampaignDomains + toast.
2. Analysis Config: No explicit configuration form; if future tunables exist, need uniform schema + UI.
3. Event Deduplication: Consider correlation IDs to tie `phase_started` / `phase_completed` pairs.
4. Domain Patch Efficiency: Track last known total & page counts per limit to reduce repeated probing per event.
5. Error Surface: Standardize error codes in `PhaseStatusResponse.errors[]` for automated UI guidance messaging.
6. Auto-Start Preconditions: Explicit SSE when auto-start skipped due to missing config (currently would fail start— ensure transparency).
7. SSE Backpressure: Consider buffering metrics for high-frequency `domain_generated` storms (batch events) to cut network chatter.

---
## 12. Validation Checklist (For Future E2E Test Authoring)

| Assertion | Mechanism |
|-----------|-----------|
| Discovery config persisted | GET phase status shows `configured` & config echo |
| Discovery start idempotent | Second start returns same or no-op status; no duplicate `phase_started` SSE |
| Domain streaming live | Receive at least 1 `domain_generated` before completion |
| DNS config gating | Attempt start w/o config -> 409 (MissingPhaseConfigsError) |
| Auto chaining | In `full_sequence` verify `phase_auto_started` appears for subsequent phases |
| Failure surfacing | Inject simulated error -> SSE `phase_failed`, runtime slice updated |
| Retry success | After failure reconfigure & start -> `phase_started` followed by `phase_completed` |
| Mode toggle event | Update mode -> SSE `mode_changed` & UI reflects new mode |
| Reconciliation event (future) | Emit synthetic `counters_reconciled` -> invalidations & refreshed aggregates |

---
## 13. Source Traceability Index

| Concern | Key Files |
|---------|-----------|
| Phase handlers | `backend/cmd/apiserver/handlers_campaigns.go` |
| Orchestrator | `backend/internal/application/orchestrator.go` (and related tests) |
| SSE Events | `backend/internal/services/sse_service.go` |
| Domain Events | `backend/internal/domain/services/*` (dns_validation.go etc.) |
| Client API | `src/store/api/campaignApi.ts` |
| SSE Hooks | `src/hooks/useCampaignSSE.ts`, `src/lib/hooks/useCampaignPhaseEvents.ts`, `src/hooks/useSSE.ts` |
| Runtime Slice | `src/store/slices/pipelineExecSlice.ts` |
| Config Forms | `DiscoveryConfigForm.tsx`, `DNSValidationConfigForm.tsx`, `HTTPValidationConfigForm.tsx` |
| Virtualization & Lists | `DomainsList.tsx`, `DomainStreamingTable.tsx` |

---
## 14. Summary

The pipeline architecture cleanly separates: (1) configuration (persisted + status `configured`), (2) asynchronous execution (background orchestrator + SSE for real-time UI), (3) incremental data hydration (domain list patching & progress), and (4) final aggregation (analysis + campaign completion). Idempotent start logic, optimistic UI updates, and virtualization strategies together support scale and responsiveness. Addressing enumerated improvement gaps will enhance resilience, reduce network overhead, and sharpen UX predictability.

---
## 15. Next Steps (Recommended Fast Wins)
1. Implement frontend handler for `counters_reconciled` SSE.
2. Add correlation/sequence IDs to phase events for stricter E2E validation.
3. Memoize discovered domain list pages per limit across event bursts.
4. Provide frontend pre-validation for required persona selection before POST configure.
5. Formalize analysis phase config (even if empty) for symmetry & future extensibility.

---
## 16. Authentication / Session Flow (For Test Scaffolding)

### 16.1 Overview
Authentication is cookie-based. The session cookie name (frontend & backend contract) is `domainflow_session` (see `middleware.ts`). Middleware enforces access control at the edge:
- Public routes: `/login`, `/signup` (plus their subpaths)
- All other non-API, non-static routes require an existing session cookie.

### 16.2 Middleware Logic (Summarized)
1. Skip for asset / internal paths and any `/api` routes (API calls bypass Next middleware for performance and rely on backend auth).
2. If a session cookie exists and user navigates to a public path → redirect `/dashboard`.
3. If no session cookie and user navigates to a protected path → redirect `/login`.
4. Always set a lightweight `auth_presence` (non-HTTPOnly) cookie to allow client-side conditional UI (e.g., hide login button when present) without exposing secure data.

Headers added: `x-auth-presence: 1|0` (diagnostics), `x-middleware: 1` (trace flag).

### 16.3 Login Endpoint
- Path: `POST /api/v2/auth/login` (backed by `/auth/login` at backend base, Next proxy rewrites keep `/api/v2`).
- Expected payload fields (inferred from tests & conventional naming): `{ email: string, password: string }`.
- Success: Sets `domainflow_session` cookie (HTTPOnly, server-managed). Frontend relies on middleware redirect on subsequent navigation.
- Failure: Returns non-2xx JSON; tests assert `.ok` status.

### 16.4 Logout
- Path: `POST /api/v2/auth/logout` (listed in README / route parity file if present) — clears cookie server-side.
- Frontend effect: Middleware will redirect next navigation to `/login`.

### 16.5 Test Scaffolding Patterns
Pattern A (Preferred UI Path):
1. Navigate to `/login`.
2. Fill `[data-testid=email]` / `[data-testid=password]` (or fallback to generic `input[type=email]` / `input[type=password]` selectors— confirm actual test IDs if added later).
3. Submit form, await redirect to `/dashboard` OR presence of `auth_presence=1` cookie.

Pattern B (Fallback Programmatic):
1. Issue `await page.evaluate(() => fetch('/api/v2/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) }))`.
2. Verify response `.ok`.
3. Manually `page.goto('/dashboard')` and assert HTTP 200 + session cookie retained.

Resilience Enhancements for Tests:
- Retry login fetch up to N times if initial attempt races backend startup.
- After login, poll for cookie existence `domainflow_session` before proceeding to pipeline steps.

### 16.6 Security / Consistency Invariants
- Session cookie must be present for SSE subscription endpoints; otherwise backend should respond 401/redirect (SSE hook currently assumes auth— tests should assert failure without cookie to prevent silent open).
- Middleware never blocks `/api` so tests calling REST endpoints directly must ensure cookie provisioning (use `context.addCookies` in Playwright if bypassing UI).

### 16.7 Suggested Test Utility Helpers
`loginViaUI(page, creds)` → returns `{ success, method: 'ui' | 'fallback' }`.
`ensureSession(page)` → waits for cookie, throws after timeout.
`withAuthenticatedPage(testFn)` → wrapper that logs in once in a fixture; caches storage state.

---
## 17. Personas & Keyword Sets (Acquisition & Constraints)

### 17.1 Personas API
- List Endpoint: `GET /api/v2/personas?enabled=true&type={dns|http}` (inferred from `PersonasApi.personasList(args...)` usage). Generated client call signature includes optional pagination & filters.
- Response Shape: `{ items: PersonaResponse[] }` where each `PersonaResponse` includes: `id`, `name`, `personaType` (`dns` or `http`), `isEnabled`, plus any capability metadata (not exhaustively enumerated here— retrieve dynamically in tests).

### 17.2 Proxy Pools
- List Endpoint: `GET /api/v2/proxy-pools` via `ProxyPoolsApi.proxyPoolsList()`.
- Filtering: Frontend filters by `isEnabled !== false`.
- Selection: Optional single `proxyPoolId` keyed onto phase configuration request.

### 17.3 Keyword Sets & Ad Hoc Keywords
- Keyword sets list: `GET /api/v2/keyword-sets` via `KeywordSetsApi.keywordSetsList()` returning `{ items: KeywordSetResponse[] }`.
- Each set includes an `id` & `name`; optional rules accessible through `keywordSetsRulesList` if deeper validation needed.
- Ad hoc keywords: Free-form array; deduplicated client-side.

### 17.4 Frontend Constraints & Validation (Observed)
- Max personas selectable per DNS or HTTP config form: 5 (`MAX_PERSONAS_SELECTED`).
- HTTP config allows zero keyword sets if `adHocKeywords` used or both empty (depending on backend validation— not explicitly enforced client-side for non-empty).
- DNS & HTTP forms do not pre-validate required personas before POST— improvement opportunity (Section 15 #4).

### 17.5 Test Data Strategy
Tests needing stable personas should:
1. Query personas list filtered by type.
2. If fewer than required, either skip test (soft fail) or dynamically create (if create API available— not observed in scanned subset) else mark as precondition.
3. Randomly sample up to limit 5 to avoid bias; store chosen IDs for later configuration.

### 17.6 Persona / Keyword Utilities (Proposed for Test Suite)
`fetchDnsPersonas(page)` → returns enabled DNS persona IDs.
`fetchHttpPersonas(page)` → returns enabled HTTP persona IDs.
`fetchKeywordSets(page)` → returns set IDs.
`selectPersonas(kind, minNeeded)` → picks stable subset, throws if unavailable.

### 17.7 Edge Cases
- Empty Persona Pool: Config attempts return 400; tests should deliberately attempt once with empty array to assert error messaging.
- Disabled Personas: Filtered out client-side; backend should also reject if submitted (confirm with negative test if needed).
- Oversubscription (>5 personas): UI prevents; add test ensuring extra click doesn’t increase selection count.

---
## 18. Integrated Auth + Personas Preflight Flow (Canonical Test Bootstrap)
1. Login (UI or fallback) → await session cookie.
2. Fetch DNS personas & ensure >=1 (skip / abort gracefully if none).
3. Fetch HTTP personas & ensure >=1.
4. Optionally fetch keyword sets (allow zero— still valid with ad hoc keywords fallback).
5. Create campaign.
6. Configure discovery → start discovery → await `phase_completed`.
7. Configure validation with selected DNS personas → start or auto-chain.
8. Configure extraction with HTTP personas + (keyword sets or ad hoc) → start/chain.
9. Await analysis completion & campaign completion events.
10. Assert final aggregates align with domain list counts.

Provide this as a single fixture to minimize login overhead across multiple pipeline scenario tests.

---
End of Document.
