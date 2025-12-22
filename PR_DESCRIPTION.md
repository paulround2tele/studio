# Refactor Campaign Experience (Phases 4-6)

## Overview
This PR completes the refactoring of the Campaign Experience page, implementing Phases 4, 5, and 6 of the UI Refactor Plan. The changes focus on progressive disclosure, performance optimization via lazy loading, and code cleanup.

## Changes

### Phase 4: Progressive Disclosure Gates
- **Data Gates**: Implemented `DataGate` and `FunnelGate` components to conditionally render UI sections based on data availability.
- **Placeholders**: Added phase-aware placeholder components (`WaitingForData`, `PhasePending`, etc.) to provide contextual feedback during empty states.
- **Integration**: Applied gates to `CampaignExperiencePage` to eliminate the "dead dashboard" appearance when data is missing or loading.

### Phase 5: ConfigInspector Drawer
- **Drawer Component**: Created `ConfigInspector` using the Sheet component to house configuration details.
- **Layout Cleanup**: Moved `ConfigSummary` and `PhaseConfigDisplay` out of the main layout to reduce clutter.
- **Lazy Loading**: Implemented lazy data fetching in `ConfigInspector` so configuration data is only loaded when the drawer is opened.
- **Header Integration**: Added a configuration trigger button to `ExecutionHeader`.

### Phase 6: Cleanup & Polish
- **Code Hygiene**: Removed unused imports, deprecated queries, and legacy component references from `CampaignExperiencePage`.
- **Type Consolidation**: Centralized `PipelinePhase` type definition in `PipelineTimeline.tsx` and removed dependency on the deprecated `PipelineBar`.
- **Accessibility**: Enhanced `ExecutionHeader` with semantic HTML (`<header>`) and ARIA attributes (`role="banner"`, `aria-label`, `aria-valuenow`).
- **Verification**: Ensured all changes pass `typecheck` and `lint` scripts.

## Verification
- **Tests**: Ran `phaseStatusUtils.test.ts` and `PipelineBar.test.tsx` - All Passed.
- **Linting**: `npm run lint` - Passed.
- **Type Check**: `npm run typecheck` - Passed.

## Next Steps
- A follow-up task will be created to delete the deprecated legacy components (`PipelineBar`, `ConfigSummaryPanel`, etc.) and add a mapping test to ensure full coverage of the new type definitions.
