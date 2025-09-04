# Unified Pipeline Workspace Refactor Plan

Strict Model A (All configs present before start) + Level 2 Progressive Reveal UI

## Executive Summary
We replace the multi-card phase layout and legacy blocked/banner logic with a single adaptive Pipeline Workspace: one large dynamic panel that cycles through configuration and execution states for each phase while a unified phase rail communicates order and progress. Mode becomes a simple auto-advance flag (Full Sequence) vs manual progression (Step by Step) with identical structural UI. We remove mid-chain missing-config blocking logic and all associated frontend/backend artifacts.

---
## Goals
1. Single adaptive UI surface for phases (no 4 distinct cards).
2. Strict pre-start gating: cannot start until all phase configs valid.
3. Identical rendering path for both modes; only auto-advance behavior differs.
4. Remove chain_blocked / blockedPhase legacy model entirely.
5. Inline configuration forms with real-time validation (no modal clutter).
6. Clean state model: configState + execState per phase; derived active indices.
7. Low-regret extensibility for future metrics/logs/audit.

---
## Out of Scope (Explicit)
- Pause/Resume advanced orchestration beyond existing basic states.
- Draft template saving.
- Dynamic insertion/removal of phases.
- Multi-user concurrent editing conflict resolution (assume last write wins for now).

---
## Phase Overview
| Phase | Name | Primary Output | Depends On |
|-------|------|----------------|-----------|
| 0 | Baseline Capture | Snapshot of current relevant files & test pass confirmation | None |
| 1 | Data & State Contract Simplification | New phase model, remove blockedPhase | 0 |
| 2 | Backend Cleanup | Remove chain_blocked emission & metrics | 1 |
| 3 | Frontend Store Refactor | New selectors + remove legacy UI slice fields | 1 |
| 4 | Pipeline Workspace Shell | New `PipelineWorkspace` + phase rail + ribbon | 3 |
| 5 | Inline Config Forms Migration | Replace modal/config buttons with embedded forms | 4 |
| 6 | Execution Flow & Auto-Advance Logic | Unified start / auto chain; remove old PhaseCards | 5 |
| 7 | Deletion & Dead Code Purge | Remove old components, SSE handlers, docs lines | 6 |
| 8 | QA & Tests | Unit + integration tests updated; visual smoke | 7 |
| 9 | Documentation & Rollout | Update README/docs + migration note | 8 |

---
## Detailed Phases

### Phase 0: Baseline Capture
Tasks:
- Record current git diff (should be clean or commit WIP first).
- Run existing test suite (jest + any Go tests if feasible) and note pass status.
- Inventory files to be touched (list). 
Success Criteria:
- Written baseline section appended to this doc.
- No uncommitted surprises before refactor begins.
Risk: Low.

### Phase 1: Data & State Contract Simplification
Tasks:
- Define `PhaseConfigState = 'missing' | 'valid'` and `PhaseExecState = 'idle' | 'running' | 'completed' | 'failed'`.
- Create TypeScript model `UIPipelinePhase` with combined view fields.
- Remove `blockedPhase` from Redux slice; strip actions (`setBlockedPhase`, `clearBlockedPhase`).
- Adjust `usePhaseReadiness` → rename to `usePipelineState` returning: `{ phases, allConfigured, activeConfigIndex, canStartFullSequence }`.
Success Criteria:
- Type errors resolved; app compiles; no references to blockedPhase remain.
Risk: Hidden coupling with components expecting old hook shape.
Mitigation: Introduce adapter temporarily then remove in Phase 7 if needed.

### Phase 2: Backend Cleanup
Tasks:
- In `orchestrator.go`: remove mid-chain config gating block; eliminate `chain_blocked` emission.
- Remove SSE event constant & factory for chain_blocked.
- Remove metrics counter increment & export fields for chain_blocked.
- Update docs: remove chain_blocked description, adjust 409 semantics to “initial start only”.
- Ensure start-phase 409 path still enforced if missing config at initial start.
Success Criteria:
- Backend builds; no references to chain_blocked in Go code except in migration history or changelog.
Risk: Tests relying on chain_blocked break.
Mitigation: Patch tests in Phase 8.

### Phase 3: Frontend Store Refactor
Tasks:
- Add lightweight selector utilities for phase ordering & progress index.
- Remove guidance triggers tied exclusively to chain_blocked (retain generic guidance system if multi-use).
- Simplify mode flag naming internally (`fullSequenceMode` retained for persistence but treat as autoAdvance boolean in selectors).
Success Criteria:
- Store compiles; existing UI still renders (temporarily with PhaseCards) while new hook feeds dummy data.
Risk: Partial dual state.
Mitigation: Keep old `PhaseCard` until Phase 6 then delete.

### Phase 4: Pipeline Workspace Shell
Tasks:
- Create `PipelineWorkspace.tsx` containing layout sections: header ribbon, main adaptive panel, phase rail.
- Implement phase rail (progress bar + lock icons) using derived indices.
- Integrate mode toggle into header.
Success Criteria:
- Page renders new shell alongside old cards (feature flag) to allow incremental migration.
Risk: Visual clutter during overlap.
Mitigation: Temporary env or local boolean `SHOW_PIPELINE_WORKSPACE`.

### Phase 5: Inline Config Forms Migration
Tasks:
- Extract form contents from existing per-phase configure modals/components into dedicated subcomponents: `DiscoveryConfigForm`, `DNSValidationConfigForm`, `HTTPValidationConfigForm`, `AnalysisConfigForm`.
- Each form fires onChange events updating local draft, with debounce/persist on save.
- Real-time field completeness tracking triggers form checklist state.
Success Criteria:
- Active phase shows inline form; saving persists; readiness recalculates instantly.
Risk: Regression in validation edge cases.
Mitigation: Reuse existing validation logic / schemas.

### Phase 6: Execution Flow & Auto-Advance Logic
Tasks:
- Implement Start buttons logic: manual vs full sequence (single start action at phase 1 only in full sequence mode).
- SSE handling for `phase_started`, `phase_completed`, `phase_failed` updates execState in pipeline store.
- Auto-advance: when a phase completes and mode=full sequence, mark next phase execState running if backend starts it; rely on SSE for authoritative state.
- Replace old PhaseCards list with `<PipelineWorkspace />` as sole render path (remove feature flag).
Success Criteria:
- Manual mode: user must click Start for each phase (after config) and pipeline advances fluidly.
- Full sequence mode: after Start Full Sequence, phases run through without further clicks.
Risk: Race conditions if SSE arrives before local state update.
Mitigation: Always trust SSE; derive execState from server events.

### Phase 7: Deletion & Dead Code Purge
Tasks:
- Delete: `PhaseCard.tsx`, `SequenceBlockedBanner.tsx`, timeline variants if superseded, guidance code tied only to chain_blocked, unused actions.
- Remove `usePhaseReadiness` old file (if replaced) & any adapter.
- Strip docs referencing removed components.
Success Criteria:
- Repo search for removed symbol names returns only historical docs / commit messages.
Risk: Accidental removal of shared utility.
Mitigation: Conservative diff review before commit.

### Phase 8: QA & Tests
Tasks:
- Update or add tests: pipeline state derivation, start gating (strict), auto-advance, failure retry.
- Run Jest + Go unit/integration tests.
- Manual smoke: configure all → start full sequence → ensure no UI path references blocked.
Success Criteria:
- All tests green; manual smoke passes.
Risk: Hidden reliance on removed banner in an e2e test.
Mitigation: Update e2e selectors to new workspace elements.

### Phase 9: Documentation & Rollout
Tasks:
- Update `campaign_mode_enhancement_plan.md` with final state notes.
- Add `PIPELINE_CHANGELOG.md` describing migration for internal teams.
- README snippet showcasing new workflow.
Success Criteria:
- Docs reference unified pipeline only; no chain_blocked or PhaseCard language.
Risk: Overlooked doc in /docs.
Mitigation: Final grep for `PhaseCard` and `chain_blocked`.

---
## Risk Matrix
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SSE timing mismatches | Medium | Medium | Always trust server event; idempotent reducers |
| Missed deletion causing dead code | Low | Medium | Grep + lint + tree-shake build |
| Form validation regressions | High | Low | Reuse existing schemas/tests |
| Developer confusion during overlap | Low | Medium | Short-lived feature flag only Phase 4–5 |

---
## Rollback Strategy
If issues arise post Phase 6:
- Revert to commit tagged `pre-unified-pipeline` captured in Phase 0.
- Restore PhaseCards rendering block (kept as patch file until Phase 7 deletion).
- Re-enable chain_blocked only if mid-chain gating becomes mandatory again (out-of-scope).

---
## Metrics / Success Signals
- Reduction in component count (N old to 1 primary workspace + subforms).
- Time-to-start clarity: fewer user clicks for full sequence start.
- Support tickets referencing “blocked banner” drop to zero (it’s gone).

---
## Acceptance Criteria (Global)
- No references to `blockedPhase` or `chain_blocked` in active code.
- Single workspace component drives entire phase management UI.
- Starting full sequence impossible until all configs validated; 409 path still functional.
- Manual mode requires explicit user Start per phase; auto mode does not after initial start.
- All tests pass.

---
## Implementation Sequence Notes
We commit after each Phase with prefix `[Pipeline P#]` and short description.

---
## Phase 0 Baseline Checklist (To Execute Next)
- [ ] Ensure working tree clean (or commit WIP) 
- [ ] Run frontend tests
- [ ] Run backend build/tests (fast subset) 
- [ ] Tag baseline commit

---
*End of plan.*
\n+---\n+### Phase 0 Baseline Execution (Completed)\n+Date: 2025-09-04\n+Commit: `b14984750f9708f62a9a56f8aa1bab8c025f5126` (branch `main`)\n+Working Tree Status: clean (no staged/unstaged changes before proceeding).\n+\n+Frontend Jest Tests:\n+- Result: PASS (3 suites, 51 tests).\n+- Coverage (summary): Statements 77.58%, Branches 70.51%, Functions 73.52%, Lines 77.58%.\n+\n+Backend Go Tests:\n+- Overall: Build/test run produced one failing package due to build errors in `internal/domain/services/test` (persona_proxy_resolution_test.go).\n+- Errors (abridged): undefined types `models.HTTPKeywordParams`; missing interface methods (`AppendDomainsData`, `BeginTxx`), undefined `services.HTTPValidationServiceImplForTest`.\n+- Other packages under `internal/application` and several config/service packages passed.\n+\n+Baseline Notes:\n+- The failing test package appears to reference deprecated or removed model/service symbols; will reassess during Phase 2 backend cleanup.\n+- No chain_blocked removal yet; references still present (expected pre-Phase 2).\n+\n+Actions Deferred:\n+- Do **not** fix the failing test now; handle after backend event cleanup to avoid double churn.\n+- Tagging baseline commit implicitly via this hash (optional lightweight tag can be added later: `git tag pre-unified-pipeline b149847`).\n+\n+Checklist Status Update:\n+- [x] Ensure working tree clean\n+- [x] Run frontend tests\n+- [x] Run backend build/tests (recorded failures)\n+- [x] Tag baseline commit (hash recorded; tag pending optional)\n+\n+---\n+*Baseline appended; proceed to Phase 1.*
