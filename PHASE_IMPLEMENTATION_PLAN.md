# Phase-Oriented Backend Fix Implementation Plan

This document tracks execution of backend response integrity & phase status improvements.

## Objectives
- Provide meaningful `requestId` and enriched `metadata` for every API response.
- Ensure each phase Configure call returns an immediate, accurate `configured` PhaseStatus with:
  - status = configured
  - configuration snapshot
  - itemsTotal (when derivable)
  - percentComplete = 0, processed = 0
  - no `startedAt` until execution actually begins
- Suppress zero-time (`0001-01-01T00:00:00Z`) timestamps; omit instead.
- Establish parity across Domain Generation, DNS Validation, HTTP Validation, Analysis.

## Phases
| Phase | Status | Summary |
|-------|--------|---------|
| 0 | In Progress | Baseline capture of current responses |
| 1 | Pending | Parity fixes applied to DNS/HTTP/Analysis services |
| 2 | Pending | Configure handler returns fresh status post-configure |
| 3 | Pending | Orchestrator pass-through semantics verified |
| 4 | Pending | Accurate ItemsTotal derivation across phases |
| 5 | Pending | Request ID propagation into logs |
| 6 | Pending | Error handling consistency & tests |
| 7 | Pending | Backend test suite additions |
| 8 | Pending | Frontend cache update & Start CTA instant availability |
| 9 | Pending | Documentation updates |
| 10 | Optional | Stretch enhancements (configHash, itemsRemaining, SSE) |

## Phase 0: Baseline Verification
Tasks:
- [ ] Capture raw JSON from each endpoint (configure + status) for all phases BEFORE additional changes (except already merged domain generation + metadata/requestId improvements).
- [ ] Store samples under `docs/baseline/phase_status/`.

Acceptance:
- Samples exist for: discovery, validation, extraction, analysis (configure response; status not-started; after configure where applicable).

## Phase 1: Service Parity Fixes
Tasks:
- [ ] DNS Validation `GetStatus`: omit zero StartedAt, include configuration map, keep Status=not_started vs configured logic consistent.
- [ ] DNS Validation `Configure`: ensure execution state stores Status=Configured (already does) and configuration snapshot derivable.
- [ ] HTTP Validation `Configure`: create in-memory execution entry with Status=Configured (currently only when executing). Provide placeholder ItemsTotal=0 (will set in Phase 4) and store configuration snapshot.
- [ ] HTTP Validation `GetStatus`: return configuration snapshot & omit zero StartedAt.
- [ ] Analysis `Configure`: already sets Status=Configured; add configuration snapshot storage.
- [ ] Analysis `GetStatus`: include configuration snapshot & omit zero StartedAt.

Acceptance:
- After configure (without starting) each phase returns: status=configured, configuration object present, StartedAt omitted.

## Follow-Up
Subsequent phases will proceed after verification of Phases 0–1.

---
Generated: 2025-09-09
