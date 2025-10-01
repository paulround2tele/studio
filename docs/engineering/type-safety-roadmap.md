# Type Safety Roadmap

> **Status**: Active Initiative  
> **Start Date**: October 1, 2024  
> **Target Completion**: October 22, 2024  
> **Current Phase**: Phase 0 - Infrastructure Setup

## Overview

This document tracks the systematic elimination of all 296 TypeScript errors in the DomainFlow Studio codebase without using suppressions, while preserving or strengthening compiler strictness.

## Current Compiler Configuration

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "noImplicitOverride": true,
  "skipLibCheck": true,
  "allowJs": true
}
```

## Error Baseline (October 1, 2024)

- **Total Errors**: 296
- **Target**: 0 errors
- **Approach**: No suppressions, 8-phase remediation

### Error Distribution by Type

| Error Code | Count | Description | Priority |
|------------|-------|-------------|----------|
| TS2532 | 71 | Object is possibly undefined | High |
| TS18048 | 70 | Property is possibly undefined | High |
| TS2307 | 45 | Cannot find module | High |
| TS2345 | 25 | Argument type mismatch | Medium |
| TS2322 | 25 | Type assignment incompatibility | Medium |
| TS2538 | 20 | Type cannot be used as index | Medium |
| TS2339 | 16 | Property does not exist | Medium |
| Others | 24 | Various types | Low |

### Error Distribution by Category

| Category | Count | Phase Target |
|----------|-------|--------------|
| Optional chain / possibly undefined access | 141 | Phase 1-2 |
| Missing API client imports | 45 | Phase 7 |
| Unsafe assignments | 50 | Phase 3-4 |
| Property access issues | 36 | Phase 5-6 |
| Miscellaneous | 24 | Phase 8 |

## Remediation Strategy

### Phase 0: Infrastructure & Tracking Setup ✅ (Current)
**Timeline**: October 1, 2024  
**Target Reduction**: 0 errors (infrastructure only)

#### Deliverables
- [x] `scripts/type-health-report.mjs` - Automated error tracking
- [x] `type-safety-baseline.json` - Baseline error catalog
- [x] `docs/engineering/type-safety-roadmap.md` - This document
- [ ] CI job for regression prevention
- [ ] `.gitignore` updates for generated reports

#### Success Criteria
- Automated reporting system functional
- Baseline established and tracked
- CI prevents regression introduction

---

### Phase 1: Safety Nets & Core Algorithms 📋 (Planned)
**Timeline**: October 2-4, 2024  
**Target Reduction**: 60 errors  
**Focus Areas**: Algorithmic modules where runtime correctness matters

#### Primary Targets
- `src/services/campaignMetrics/snapshotCompactionService.ts`
- `src/services/viz/adaptiveTimelineService.ts`
- `src/services/campaignMetrics/wasmAccelerationService.ts`

#### Key Changes
- Introduce `safeAt<T>(arr: T[], index: number): T | undefined` utility
- Convert LTTB/compaction functions to early-return on insufficient length
- Replace chained indexing with destructuring guards
- Add minimal helper types for algorithmic invariants

#### Success Criteria
- All array access patterns use safe indexing
- LTTB and compaction algorithms handle edge cases
- No runtime crashes on empty/minimal datasets

---

### Phase 2: Metrics & Forecasting Stability 📋 (Planned)
**Timeline**: October 4-6, 2024  
**Target Reduction**: 50 errors  
**Focus Areas**: Mathematical operations and forecasting

#### Primary Targets
- `src/services/campaignMetrics/forecastService.ts`
- `src/workers/metricsWorker.ts`
- `src/services/campaignMetrics/forecastBlendService.ts`

#### Key Changes
- Introduce `NonEmptyArray<T>` domain type
- Harden all math operations against undefined values
- Extract shared math operations into pure, typed helpers
- Add comprehensive guards for time series calculations

#### Success Criteria
- No calculations performed on undefined values
- Robust handling of degenerate time series
- All forecasting functions require minimum data points

---

### Phase 3: Stream & Event Pipeline 📋 (Planned)
**Timeline**: October 6-8, 2024  
**Target Reduction**: 40 errors  
**Focus Areas**: Data mutation and event streaming

#### Primary Targets
- `src/services/campaignMetrics/streamPool.ts`
- `src/workers/metricsWorker.ts` (event handling)
- Stream mutation logic

#### Key Changes
- Rework mutation logic to avoid possibly undefined keys
- Implement typed reducer for patch operations
- Create discriminated union for change operation types
- Fix readonly/mutable mismatches through proper cloning

#### Success Criteria
- All stream operations properly typed
- Event mutations handle all operation types
- No readonly/mutable type conflicts

---

### Phase 4: Privacy/Security/Policy 📋 (Planned)
**Timeline**: October 8-10, 2024  
**Target Reduction**: 20 errors  
**Focus Areas**: Data sanitization and policy enforcement

#### Primary Targets
- `src/services/campaignMetrics/securityHardeningService.ts`
- `src/services/campaignMetrics/privacyRedactionService.ts`
- `src/services/campaignMetrics/policyEngine.ts`

#### Key Changes
- Consolidate duplicate `redactValue` implementations
- Add stricter types for `PrivacyRule` transformations
- Implement narrowed `action` type with validator
- Fix generic write constraints (TS2862 errors)

#### Success Criteria
- No duplicate function implementations
- All policy transformations properly typed
- Security validations handle all input types

---

### Phase 5: Experimentation & Bandit Logic 📋 (Planned)
**Timeline**: October 10-12, 2024  
**Target Reduction**: 15 errors  
**Focus Areas**: Random selections and experimentation

#### Primary Targets
- `src/services/campaignMetrics/banditService.ts`
- Random arm selection logic
- A/B testing components

#### Key Changes
- Guard random arm selection with invariants
- Introduce `selectRandom<T>(arr: NonEmptyArray<T>): T` utility
- Normalize optional fields in experiment configuration
- Surface errors early in bandit logic

#### Success Criteria
- All random selections properly guarded
- Experiment configuration fully validated
- No runtime errors in bandit algorithms

---

### Phase 6: Scheduling/Task/Queue Systems 📋 (Planned)
**Timeline**: October 12-14, 2024  
**Target Reduction**: 20 errors  
**Focus Areas**: Task lifecycle and queue management

#### Primary Targets
- `src/services/campaignMetrics/taskSchedulerService.ts`
- Queue lookup operations
- Task lifecycle management

#### Key Changes
- Wrap all queue lookups with safety checks
- Define comprehensive `QueuedTask` shape with lifecycle state
- Incorporate explicit `TaskTimeoutError` type
- Add task state transition validation

#### Success Criteria
- All queue operations safely typed
- Task lifecycle properly managed
- Timeout handling fully implemented

---

### Phase 7: API Model Alignment 📋 (Planned)
**Timeline**: October 14-16, 2024  
**Target Reduction**: 46 errors  
**Focus Areas**: Import resolution and API model consistency

#### Primary Targets
- `src/store/campaigns/campaignSlice.ts`
- Missing API client imports (45 TS2307 errors)
- Model barrel exports

#### Key Changes
- Fix all missing imports from `@/lib/api-client`
- Verify model barrel `@/lib/api-client/index-app` completeness
- Remove stray ambient `any` types
- Add comprehensive type guards file

#### Success Criteria
- All API imports resolve correctly
- Model types properly exported
- No ambient `any` types remain

---

### Phase 8: Final Hardening 📋 (Planned)
**Timeline**: October 16-22, 2024  
**Target Reduction**: 45 errors (remaining)  
**Focus Areas**: Final cleanup and optional strictness

#### Primary Targets
- Remaining miscellaneous errors
- Generic mutation utilities
- Optional compiler strictness improvements

#### Key Changes
- Narrow generic mutation utilities in security/seed services
- Trial `exactOptionalPropertyTypes` on feature branch
- Consider disabling `allowJs` if JS files fully migrated
- Final comprehensive error elimination

#### Success Criteria
- Zero TypeScript errors (`tsc --noEmit` passes)
- No suppressions introduced
- Optional strictness improvements adopted if beneficial
- CI gate prevents future regressions

## Tracking and Metrics

### Automated Reporting
- **Script**: `scripts/type-health-report.mjs`
- **Schedule**: Run on every commit via CI
- **Output**: JSON report + human-readable table
- **Regression Policy**: Fail CI if error count increases

### Progress Tracking
- **Baseline File**: `type-safety-baseline.json`
- **Current Status**: Updated after each phase completion
- **Metrics**: Error count by type, category, and file
- **Trend Analysis**: Track error reduction velocity

### Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Algorithm changes introduce subtle bugs | High | Add unit tests for before/after snapshots |
| Large PR review overhead | Medium | Enforce small, phased PRs (<400 LOC) |
| Parallel development conflicts | Medium | Lock affected files with labels |
| Performance regressions | Low | Benchmark critical math functions |

## Utilities and Patterns

### New Utility Types
- `NonEmptyArray<T>` - Arrays guaranteed to have elements
- `safeAt<T>(arr: T[], index: number): T | undefined` - Safe array access
- Invariant helpers for algorithmic preconditions
- Comprehensive type guards for API models

### Common Patterns
1. **Safe Array Access**: Always check length before indexing
2. **Early Returns**: Validate inputs before processing
3. **Type Guards**: Use runtime validation for external data
4. **Destructuring Guards**: Prefer destructuring with fallbacks
5. **Explicit Undefined Handling**: Never assume properties exist

## Success Metrics

### Quantitative Goals
- ✅ Zero TypeScript errors on `main` branch
- ✅ Zero new suppressions introduced
- ✅ CI prevents regression (error count increases fail builds)
- ✅ All phases completed within 3-week timeline

### Qualitative Goals
- ✅ Runtime semantics preserved (no behavior changes)
- ✅ Code readability maintained or improved
- ✅ Developer experience enhanced through better types
- ✅ Documentation and patterns established for future development

---

## Notes

- **No Suppressions Policy**: No `@ts-ignore`, `@ts-expect-error`, or config loosening
- **Backward Compatibility**: All changes preserve existing runtime behavior
- **Testing Strategy**: Add tests for algorithmic changes, leverage existing test suite
- **Documentation**: Update relevant docs as type safety improves

---

*Last Updated: October 1, 2024*  
*Next Review: After each phase completion*