# Unified Pipeline Changelog

Authoritative historical log of the unified multi‑phase campaign pipeline refactor (Domain Generation → DNS Validation → HTTP Keyword Validation → Analysis). Phases map to the refactor plan milestones; commit hashes elided for brevity.

## Legend
- Added: ✨  | Changed: ♻️ | Removed: 🔥 | Fixed: 🐛 | Docs: 📝 | Tests: ✅

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
*End of changelog (updated through Phase 9 active edits).*
