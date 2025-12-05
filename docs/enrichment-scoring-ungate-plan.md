# Enrichment & Scoring Ungating Plan

## Objectives
- Allow campaigns to progress into enrichment and analysis (scoring) without manual backend intervention or placeholder gating.
- Provide UI controls so operators can configure these phases when desired while still supporting sensible backend defaults.
- Preserve offline friendliness: no new external API dependencies or long-running cloud calls.

## Affected Areas
- `backend/internal/application/orchestrator.go`
  - Remove hard gating that blocks full-sequence starts when enrichment/analysis configs do not exist.
  - Optionally auto-initialize default configs for these phases when absent.
- `backend/cmd/apiserver/handlers_campaigns.go`
  - Align error handling/messaging with updated orchestrator behavior; ensure phase start 409s are no longer triggered for enrichment/analysis defaults.
- `backend/internal/domain/services/enrichment.go`
  - Confirm defaults are applied when configs are missing; expose sanitization helpers so UI-driven overrides persist cleanly.
- `backend/internal/domain/services/analysis.go`
  - Ensure default personas/keyword rules are optional; provide helpers for persona lookup caching once the UI can submit IDs.
- `src/types/forms/index.ts`
  - Define strong form value types for enrichment and updated analysis payloads.
- `src/components/campaigns/workspace/forms/AnalysisConfigForm.tsx`
  - Replace placeholder UI with actual persona selection + keyword rule management that matches backend contract.
- `src/components/campaigns/workspace/forms/EnrichmentConfigForm.tsx` (new)
  - Collect threshold inputs (score floor, grace %, structural signals, etc.) and submit via `useConfigurePhaseStandalone`.
- `src/components/campaigns/PipelineWorkspace.tsx`
  - Render the real enrichment form; ensure analysis form uses new props and remove placeholder copy.
- `src/store/selectors/pipelineSelectors.ts`
  - Update gating logic so “missing configuration” warnings respect new defaults (e.g., don’t block domain generation when enrichment/analysis configs are absent but eligible for defaults).
- `src/store/selectors/autoAdvanceLogic.ts` & `src/store/ui/campaignUiSlice.ts`
  - Verify next-action calculations and guidance messaging reflect the new phases’ behavior.
- Tests: `backend/internal/application/orchestrator_integration_test.go`, selector/form unit tests under `src/components/campaigns/__tests__` or equivalent.

## Implementation Steps
1. **Backend Gating Update**
   - In `StartPhaseInternal`, limit the full-sequence blocking list to the phases that truly require pre-configuration (discovery + validation stages). Document why enrichment/analysis now rely on defaults if config is missing.
   - Add helper(s) to auto-persist default configs for enrichment/analysis the first time `ConfigurePhase` or `StartPhaseInternal` touches them to keep DB state consistent.
2. **API Handler Alignment**
   - Update `CampaignsPhaseStart` to drop the 409 path for enrichment/analysis when defaults cover config gaps; adjust logging to reflect new flow.
3. **Service Enhancements**
   - `enrichment.go`: expose typed default payload + validation service so UI-submitted overrides are clamped and persisted; ensure `Validate` enforces sane ranges for user input.
   - `analysis.go`: extend `AnalysisConfig` to accept persona IDs, keyword rules, and toggles surfaced by the new form while keeping backwards-compatible defaults; provide persona lookup caching for the form’s suggestions when necessary.
4. **Frontend Type + API Shape**
   - Update `src/types/forms/index.ts` with `EnrichmentConfigFormValues` and a richer `AnalysisConfigFormValues` (persona IDs, keyword rule descriptors, toggles, metadata for UI-only fields).
5. **Analysis Form Rewrite**
   - Fetch available personas/keyword sets (reuse logic from HTTP validation form) and allow selection with limits.
   - Provide UI for keyword rules (pattern, type, context chars) and toggles such as `includeExternal` / `generateReports`.
   - Submit payload via `useConfigurePhaseStandalone` ensuring it maps to backend expectations (flattened root keys + optional persona metadata for display-only mode).
6. **Introduce Enrichment Form**
   - Build a new form component capturing thresholds (match score, low-score grace, min bytes, parked confidence, structural signal toggle) with default values derived from `enrichmentDefault*` constants.
   - Hook the form into `PipelineWorkspace` and support read-only rendering similar to other phases.
7. **Pipeline Workspace & Selector Updates**
   - Wire the new forms into `renderPhaseForm` for `enrichment` and keep `analysis` referencing the updated component.
   - Adjust selector gating so phases that can run with defaults don’t block `makeSelectStartCTAState`; e.g., treat them as "virtually configured" once backend reports `not_started` but default-ready, or flip their `configState` to valid when config is optional.
8. **Testing & Validation**
   - Extend orchestrator integration tests to cover the new behavior (full-sequence start succeeds without enrichment/analysis configs; enrichment/analysis phases still respect user-provided overrides).
   - Add frontend tests for the new forms (snapshot + submit payload shape) and selector tests validating gating changes.
   - Manually verify end-to-end via `npm run backend:build`, `make test`, `npm run lint`, and a smoke walkthrough configuring + starting all phases.

## Open Questions / Follow-Ups
- Do we need persona suggestions inside enrichment as well (future enhancement)?
- Should we record in campaign history when defaults auto-configure a phase vs. user-edited config? Track via metadata field if product wants transparency.
- When auto-configuring defaults, do we mark the phase as `configured` immediately or only once the user edits? (Current plan: mark as configured once defaults are persisted to keep pipeline progression smooth.)
