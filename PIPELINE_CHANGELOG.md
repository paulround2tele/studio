# Unified Pipeline Changelog

Authoritative historical log of the unified multi‑phase campaign pipeline refactor (Domain Generation → DNS Validation → HTTP Keyword Validation → Analysis). Phases map to the refactor plan milestones; commit hashes elided for brevity.

## Legend
- Added: ✨  | Changed: ♻️ | Removed: 🔥 | Fixed: 🐛 | Docs: 📝 | Tests: ✅

---

## Pipeline Consolidation (January 2025)
- 🔥 **MAJOR**: Removed all dual-read comparison and variance telemetry code
  - Deleted `analysis_dualread_*` metrics, functions, and test files
  - Removed `ANALYSIS_DUAL_READ`, `ANALYSIS_READS_FEATURE_TABLE`, `DUAL_READ_VARIANCE_THRESHOLD` environment variables
  - Eliminated dual-read shadow comparison logic from analysis service
- ✨ **NEW**: Unified pipeline configuration system
  - Added `PipelineConfig` struct with environment-based configuration
  - Introduced dedicated pipeline configuration loading with validation and clamping
  - Consolidated scattered environment variable getters into single config structure
- ✨ **NEW**: Extraction reconciliation system
  - Added `ExtractionReconciler` service for handling stuck and failed extraction tasks
  - Implemented single-flight protection and configurable retry logic
  - Added support for stuck_running, stuck_pending, error_retryable, and missing_features categories
- ✨ **NEW**: Stale score detection system
  - Added `StaleScoreDetector` service for identifying outdated analysis scores
  - Automatic detection of scores older than features with rescore job enqueueing
  - Configurable thresholds and detection intervals
- ✨ **NEW**: Simplified metrics system
  - Added pipeline-specific Prometheus metrics for reconciliation and stale detection
  - Kept existing `analysis_feature_table_coverage_ratio` gauge as required
  - Removed all dual-read and variance metrics
- ✨ **NEW**: Clock abstraction for deterministic testing
  - Added `Clock` interface with real and mock implementations
  - Enables reliable time-based testing for reconciliation and detection logic
- ✅ **TESTS**: Comprehensive test suite for new components
  - Table-driven tests for extraction reconciler covering all reconciliation categories
  - Unit tests for stale score detection with boundary conditions
  - Single-flight protection and disabled reconciliation tests
- 📝 **DOCS**: Updated architecture and operational documentation
  - Rewrote `architecture.md` to reflect final steady-state pipeline
  - Updated `feature_flags.md` removing deleted flags and adding pipeline config
  - Added `docs/ops/alerts.md` with Prometheus alerting rule examples
- ♻️ **SIMPLIFIED**: Analysis service always uses unified feature extraction pipeline
  - Removed complex read path decision logic and coverage checking
  - Consolidated to single extraction approach eliminating fallback complexity
- 🔥 **CLEANUP**: Removed obsolete test files and legacy code paths
  - Deleted `analysis_read_switch_test.go` and related dual-read test infrastructure
  - Eliminated variance collection, threshold checking, and SSE variance events

---

## Phase 0 – Baseline Capture
- 📝 Recorded failing legacy tests & existing `chain_blocked` semantics.
- 📝 Tagged baseline (pre-unified) state.

## Phase 1 – Frontend Selector Foundations
- ✨ Introduced consolidated selectors for pipeline overview & nextUserAction.
- ✅ Added initial unit tests for overview & action derivation.

## Phase 2 – Backend Event & Gating Cleanup
- 🔥 Removed `chain_blocked` SSE event, metrics counter, and mid‑chain gating logic.
- ♻️ Enforced Strict Model A: all configs required before initial start; start otherwise returns 409.
- ✅ Updated integration tests ensuring absence of `chain_blocked` emissions.

## Phase 3 – Metrics Normalization
- ✨ Standardized metrics: phaseStarts, phaseAutoStarts, phaseCompletions, phaseFailures, campaignCompletions, phase durations.
- ✅ Added assertions for each metric in orchestrator integration tests.

## Phase 4 – Frontend Runtime State Hardening
- ♻️ Added defensive runtime fallback when RTK Query cache absent.
- ✅ Expanded selector tests for null/undefined edge cases.

## Phase 5 – Retry Semantics
- ✨ Implemented failure → retry flow; orchestrator resumes chain post successful retry.
- ✅ Added integration tests simulating forced phase failure then retry continuation.

## Phase 6 – Duration & Progress Enrichment
- ✨ Enriched overview with per-phase durationMs & aggregate progress calculations.
- ✅ Selector tests added for duration presence & ordering.

## Phase 7 – Legacy Prune & UI Alignment
- 🔥 Removed deprecated PhaseCard remnants & blocked banner code.
- ♻️ Simplified guidance model (generic messages, no blockedPhase state).
- ✅ Confirmed grep shows no active `chain_blocked` references outside historical docs.

## Phase 8 – Comprehensive QA (Metrics, SSE, Retry UI)
- ✅ Added SSE emission tests (success sequence & failure→retry path) covering: phase_started, phase_auto_started, phase_failed, phase_completed, campaign_progress, campaign_completed.
- ✅ Added frontend failure→retry selector tests (lastFailedPhase, retryEligiblePhases, nextUserAction transitions).
- 🐛 Fixed race in retry test by waiting for phaseFailures metric before clearing failure flag.
- 🐛 Resolved FK constraint in SSE tests by inserting user row pre-campaign creation.

## Phase 9 – Documentation & Rollout (In Progress)
- 📝 Updated campaign mode enhancement plan removing active `chain_blocked` semantics; added legacy appendix.
- 📝 Created this changelog.
- (Planned) README orchestration snippet & OpenAPI version pin alignment.

---
## Active Event & Metric Surface (Post Phase 8)
| Category | Items |
|----------|-------|
| SSE Events | phase_started, phase_auto_started, phase_failed, phase_completed, campaign_progress, campaign_completed, mode_changed |
| Metrics | phaseStarts, phaseAutoStarts, phaseFailures, phaseCompletions, campaignCompletions, phaseDuration (per phase) |

## Removed Artifacts
- `chain_blocked` event & blockedPhase UI state
- Mid-chain gating logic (replaced by pre-start readiness requirement)
- PhaseCard legacy component & derivative guidance coupling

## Testing Coverage Highlights
- Orchestrator integration: success chain, failure→retry, start failure metrics, SSE emissions
- Frontend selectors: overview, durations, failure state, retry path, next action derivation

## Outstanding (Next Iterations)
- OpenAPI spec version pin & stabilization (API Hygiene Plan alignment)
- Extended telemetry (throughput, average phase duration trends)
- Pause / resume semantics (future design)

---

## API Contract Modernization – Proxy Resource & Envelope Removal (October 2025)
### Summary
Refactored OpenAPI contract to eliminate the legacy SuccessEnvelope pattern for 2xx responses and introduced a first-class `Proxy` resource model replacing the narrow `ProxyDetailsResponse`. Frontend and backend now operate on rich proxy objects directly.

### Changes
- 🔥 Removed: SuccessEnvelope wrapping for proxy endpoints (list, create, update, status, bulk operations, health/test). Responses now return raw alias types (e.g., `[]Proxy`, `Proxy`, `BulkProxyOperationResponse`).
- ✨ Added: Comprehensive `Proxy` schema with operational, health, and metadata fields (id, name, address, protocol, isEnabled, isHealthy, latencyMs, lastCheckedAt, success/failure counts, notes, timestamps, etc.).
- ♻️ Updated: `ProxyStatusResponse` now references `Proxy` (indirectly via top-level status items) after schema consolidation; removed redundant duplicate schema definitions causing bundler validation errors.
- ♻️ Backend: `handlers_proxies.go` refactored to emit `gen.Proxy` objects (value fields rather than pointer envelope). 204 used for delete per spec.
- ♻️ Frontend: Replaced all imports of `ProxyDetailsResponse` with `Proxy`; updated hooks (`useCampaignFormData`, `useProxyHealth`) and RTK query slices to consume new model.
- ♻️ Regenerated: TypeScript client & Go server stubs after spec adjustments (OpenAPI 3.1 bundle, oapi-codegen v2).

### Rationale
- Removes redundant envelope boilerplate; simplifies client code (direct array / object handling, less unwrapping logic).
- Provides forward-compatible surface for advanced proxy health metrics & pooling features without further breaking changes.
- Aligns proxy endpoints with emerging resource consistency standards set in earlier campaign/domain refactors.

### Implementation Notes
- Transitional legacy `ProxyDetailsResponse` schema retained only for backward compatibility in spec components but no longer referenced by active proxy paths.
- Validation issues encountered (duplicate `ProxyStatusResponse`, incorrect $ref scope) resolved by:
  1. Consolidating `ProxyStatusResponse` into `all.yaml`.
  2. Correcting `$ref` paths in `status.yaml` and internal self-reference for `proxyDetails`.
- Handlers switched from constructing pointer-heavy minimal structs to full `Proxy` value initialization; optional DB NullString / nullable fields mapped via conditional assignment.

### Impact / Migration Guide
- Client code expecting `{ data, metadata }` must be updated to handle raw return types. A temporary compatibility extraction helper was removed—update call sites accordingly.
- Delete endpoint now returns 204 (no body). Ensure frontend ignores body parsing for delete.
- Status endpoint currently returns status metadata without embedding full proxy details; can be extended later using the same `Proxy` shape.

### Follow-Ups
- Add automated contract drift CI check to enforce absence of envelope regression.
- Populate additional health metrics fields (successCount, failureCount, latencyMs) once collection pipeline is finalized.
- Evaluate pruning of the legacy `ProxyDetailsResponse` component in a subsequent breaking change window.

*Logged October 2025.*

---
*End of changelog (updated through Phase 9 active edits).*
