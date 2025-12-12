# Phase Runtime Control Implementation Plan

This version is an execution-ready checklist. Each task names the owning area, exact files to touch, and success criteria so an engineer can pick it up immediately.

---

## Task 1 – Wire Discovery (Domain Generation) Into Runtime Controls
- **Files:** `backend/internal/domain/services/domain_generation.go`, `backend/internal/application/orchestrator.go`, `backend/cmd/apiserver/handlers_campaigns.go`.
- **Steps:**
   1. Extract the control-watcher patterns from DNS validation into a reusable helper and add `AttachControlChannel` for domain generation. Execution structs need `controlCh`, `stopRequested`, and `ack` support just like enrichment.
   2. Replace the existing pause logic (which relies on context cancellation) with explicit handling of `ControlCommand{Signal: ControlSignalPause|Resume|Stop}` inside the main generation loop. Honor pause by blocking `waitWhilePaused`, honor stop by flushing the current batch, setting status=`failed` with `LastError="stopped by user"`, and returning.
   3. In `handlers_campaigns.go`, drop the discovery-specific `BadRequest` guard once Capabilities reports pause/stop support. Use `PhaseControlCapabilities` to validate requests generically.
- **Done When:** issuing pause/stop via API updates discovery status to `paused`/`failed` without throwing "runs offline" errors; SSE shows accurate transitions.

## Task 2 – Prevent Context-Canceled Persistence
- **Files:** `backend/internal/domain/services/domain_generation.go` (function `persistBatchWithGlobalOffset`), any shared store helpers under `backend/internal/store`.
- **Steps:**
   1. Split IO context from control context: derive `writeCtx := context.WithoutCancel(ctx)` (Go 1.21+) or `context.Background()` + timeout for DB writes so stop/pause does not cancel SQL operations mid-flight.
   2. When `stopRequested` is true, finish persisting the current batch, update offsets, then break out cleanly.
   3. Emit structured logs when a stop/pause is honored to aid debugging.
- **Done When:** stopping discovery mid-batch no longer logs `Failed to store domains: ... context canceled`; campaigns resume later without missing domains.

## Task 3 – Bring Extraction & Remaining Phases to Control Parity
- **Files:** `backend/internal/domain/services/extraction_*.go`, `backend/internal/domain/services/interfaces.go`.
- **Steps:**
   1. Audit each extraction-oriented service (reconciler, lead harvester, etc.) for `AttachControlChannel`; add the same watcher/command handling used by DNS/enrichment.
   2. Ensure `GetStatus` injects `runtime_controls` with accurate booleans and that each service flips status to `paused`/`failed` when commands arrive.
- **Done When:** `/campaigns/{id}/phases/{phase}/status` reports `canPause/canResume/canStop/canRestart=true` for all phases and manual pause/stop works without error.

## Task 4 – Scheduler & API Cohesion
- **Files:** `backend/internal/application/orchestrator.go`, `backend/cmd/apiserver/handlers_campaigns.go`, optional new helper under `backend/internal/application`.
- **Steps:**
   1. Ensure `attachControlChannel` is invoked for discovery/extraction after Task 1/3. Capture errors from control dispatch and surface them via logs/metrics.
   2. Add a `StopCampaign` orchestrator method that figures out the currently running phase (using `campaignExecutions`), issues a stop command, and marks the campaign status `cancelled`. Expose it via `POST /campaigns/{id}/stop`.
   3. Update existing phase stop handler to call either the new campaign stop when `phase == "current"` or the per-phase path when needed.
- **Done When:** a single API call can stop the active campaign, and the orchestrator prevents auto-advancing into later phases until `/restart` is called.

## Task 5 – Frontend Controls Refactor
- **Files:** `src/app/campaigns/page.tsx`, `src/components/refactor/campaign/CampaignExperiencePage.tsx`, `src/store/api/campaignApi.ts` (if new endpoint added).
- **Steps:**
   1. Fetch `useGetPhaseStatusStandaloneQuery` for the active phase on the list page and gate Pause/Stop buttons purely on `runtimeControls`.
   2. Rename buttons to match actual scope ("Pause Phase", "Stop Phase" today; switch to "Stop Campaign" once Task 4’s endpoint is live).
   3. If we add `/campaigns/{id}/stop`, create RTK Query mutation + hook, update both UIs to call it, and remove per-phase stop buttons when campaign-level stop is available.
- **Done When:** UI never enables a control the backend disallows, and discovery stop/pause buttons behave identically on both pages.

## Task 6 – Verification & Regression Tests
- **Backend:** add table-driven tests per phase for pause/resume/stop/restart (focus on discovery to prove persistence and restart behave). Location: `backend/internal/domain/services/*_test.go`.
- **Integration:** run `make test` and `scripts/smoke-e2e-campaign.sh`, explicitly pausing/stopping during each phase.
- **Frontend:** `npm run lint`, `npm run build`, and the targeted Playwright scenario for campaign controls.
- **Observability:** ensure logs include control signal receipt + outcome; consider metrics (counters for pause/stop success/fail).

## Ownership Guidance
- Backend phase owners handle Tasks 1–4, ideally in this order to keep changes scoped.
- Frontend team picks up Task 5 after runtime control metadata is trustworthy.
- QA/DevOps run Task 6 once backend/frontend patches land on the main branch.

## Tracking Checklist
- [ ] Discovery control bus + API guard removal completed.
- [ ] Persistence safe-stop implemented and validated.
- [ ] Extraction phases expose runtime controls.
- [ ] Campaign-level stop endpoint (or equivalent) in production.
- [ ] Frontend gating updated + button semantics aligned.
- [ ] Automated + manual tests executed with results documented.
