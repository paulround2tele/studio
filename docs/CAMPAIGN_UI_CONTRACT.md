# Campaign UI Architecture Contract

**Version:** 1.0.0  
**Date:** 2025-12-22  
**Status:** Proposed  

---

## 1. Problem Analysis

### 1.1 Current State Assessment

The current `CampaignExperiencePage.tsx` exhibits **authority fragmentation** similar to the SSE state issues we fixed:

| Surface | Current Authority | Problem |
|---------|------------------|---------|
| Phase status | `statusSnapshot.phases[]` | Correct - single source |
| Phase controls | `selectedPhaseRuntimeControls` | Correct - backend-driven |
| Campaign controls | Derived from `pipelinePhases` | Mixed - local derivation |
| What's happening | PipelineBar + KPIs + Funnel | **Duplicated** - 3 surfaces show execution state |
| What can I do | 5 separate buttons + phase selector | **Scattered** - no clear hierarchy |
| What happened | Funnel + LeadResults + Warnings + Momentum | **Fragmented** - outcomes spread everywhere |
| Why it matters | KPIs + Recommendations | **Decoupled** - insights not linked to actions |

### 1.2 Conceptual Ownership Violations

**Problem 1: Execution State has 3 Competing Surfaces**
- `PipelineBar` → shows phase status + progress bars
- `KpiGrid` → shows "Total Analyzed" (also an execution metric)
- `FunnelSnapshot` → shows "Generated" (also execution state)

**Problem 2: Controls are Phase-Centric but UI is Campaign-Centric**
- User sees "Campaign Dashboard" header
- But controls operate on `selectedPhaseKey` (hidden concept)
- 5 buttons all visible simultaneously despite mutually exclusive semantics

**Problem 3: Inspection and Outcome are Mixed**
- `ConfigSummary` (inspection) and `PhaseConfigDisplay` (inspection) in left column
- `FunnelSnapshot` (outcome) also in left column
- `LeadResultsPanel` (outcome) also in left column
- No clear "inspection mode" vs "outcome mode"

**Problem 4: Empty States Consume Prime Real Estate**
- KPI grid shows zeros during early phases
- Funnel shows 0% bars during generation
- Recommendations often empty
- These belong in progressive disclosure, not static layout

---

## 2. Proposed UI Ownership Model

### 2.1 Authority Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAMPAIGN EXECUTION CONSOLE                    │
├─────────────────────────────────────────────────────────────────┤
│  TIER 1: EXECUTION STATE (What's Happening Now)                 │
│  ├─ Authority: statusSnapshot + controlPhase                    │
│  ├─ Surface: ExecutionHeader (single component)                 │
│  └─ Content: Active phase, progress, status, SSE indicator      │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2: CONTROLS (What Can I Do Now)                           │
│  ├─ Authority: runtimeControls from controlPhase                │
│  ├─ Surface: ControlDock (contextual, minimal)                  │
│  └─ Content: Only currently-valid actions                       │
├─────────────────────────────────────────────────────────────────┤
│  TIER 3: PIPELINE OVERVIEW (What Happened So Far)               │
│  ├─ Authority: statusSnapshot.phases[]                          │
│  ├─ Surface: PipelineTimeline (collapsed by default)            │
│  └─ Content: Phase sequence with status badges                  │
├─────────────────────────────────────────────────────────────────┤
│  TIER 4: OUTCOMES (Why It Matters)                              │
│  ├─ Authority: funnelData + domainsList + metricsData           │
│  ├─ Surface: OutcomePanel (progressive, phase-gated)            │
│  └─ Content: KPIs, Funnel, Leads - shown when meaningful        │
├─────────────────────────────────────────────────────────────────┤
│  TIER 5: INSPECTION (Audit Trail)                               │
│  ├─ Authority: phaseConfigsData                                 │
│  ├─ Surface: ConfigInspector (collapsible drawer/modal)         │
│  └─ Content: Phase configs, personas, keyword sets              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Layout Design

```
┌─────────────────────────────────────────────────────────────────┐
│ [ExecutionHeader]                                    [SSE: Live]│
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ HTTP Keyword Validation                         Running 67% │ │
│ │ ████████████████████░░░░░░░░░                               │ │
│ │ [Pause] [Stop Campaign]                    [⚙ View Config]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ [PipelineTimeline - Collapsed]                                  │
│ ✓ Generation → ✓ DNS → ● HTTP → ○ Analysis → ○ Leads           │
│                                               [Expand Details]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │ [OutcomePanel - Primary]│  │ [InsightPanel - Secondary]  │  │
│  │                         │  │                             │  │
│  │ Conversion Funnel       │  │ Quality Analysis            │  │
│  │ ██████████ 10,000 Gen   │  │ Warnings: 3 issues          │  │
│  │ ████████   8,200 DNS    │  │ • 12% keyword stuffing      │  │
│  │ ██████     6,100 HTTP   │  │                             │  │
│  │ ████       4,000 Kwd    │  │ Recommendations             │  │
│  │                         │  │ • Consider adding TLDs      │  │
│  │ Lead Results (142)      │  │                             │  │
│  │ [Table...]              │  │ [Momentum hidden - no data] │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Ownership Model

### 3.1 New Component Architecture

| Component | Responsibility | Data Authority | Renders When |
|-----------|---------------|----------------|--------------|
| `ExecutionHeader` | Current phase + progress + controls | `controlPhase`, `runtimeControls` | Always |
| `PipelineTimeline` | Phase sequence overview | `statusSnapshot.phases[]` | Always (collapsed) |
| `OutcomePanel` | Funnel + Leads + KPIs | `funnelData`, `domainsList` | After DNS completes |
| `InsightPanel` | Warnings + Recommendations | `metricsData`, `recommendationsData` | After HTTP completes |
| `ConfigInspector` | Phase configs audit | `phaseConfigsData` | On demand (drawer) |

### 3.2 Control Authority Model

```typescript
// Single source of truth for what actions are available
interface ControlState {
  // From statusSnapshot
  controlPhase: ApiPhase | null;         // What phase can be controlled
  campaignStatus: 'running' | 'paused' | 'completed' | 'failed' | 'draft';
  
  // From PhaseStatusResponse.runtimeControls for controlPhase
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  canRestart: boolean;
  
  // Derived (but from single authority)
  hasFailedPhases: boolean;
  isIdle: boolean;  // No phase running or paused
}

// Control rendering rules
const CONTROL_VISIBILITY: Record<string, (state: ControlState) => boolean> = {
  'pause':    (s) => s.canPause,
  'resume':   (s) => s.canResume,
  'stop':     (s) => s.canStop && !s.isIdle,
  'restart':  (s) => s.canRestart && s.isIdle,
  'retry':    (s) => s.hasFailedPhases && s.isIdle,
};
```

### 3.3 Progressive Disclosure Rules

| Content | Show Condition | Rationale |
|---------|---------------|-----------|
| Funnel | `funnelData.generated > 0` | No value at 0% |
| KPIs | `metricsData.totalAnalyzed > 0` | Zeros are noise |
| Leads | `funnelData.leads > 0 OR funnelData.httpValid > 0` | Need enrichment first |
| Warnings | `warningData.length > 0` | Only when issues exist |
| Momentum | `momentumData.moversUp?.length > 0` | Only when meaningful |
| Recommendations | `recommendations.length > 0` | Only when generated |

---

## 4. Removal / Downgrade Decisions

### 4.1 Remove from Primary View

| Item | Reason | Alternative |
|------|--------|-------------|
| `ConfigSummary` (basic) | Redundant with `PhaseConfigDisplay` | Merge into ConfigInspector drawer |
| Phase selector dropdown | Confusing UX - users don't think in phases | Use controlPhase automatically |
| "Retry Failed Phases" button | Edge case, clutters primary controls | Move to overflow menu |
| "Restart Campaign" button | Destructive, rarely needed | Move to overflow menu |
| Empty KPI cards | Visual noise | Progressive disclosure |
| Full funnel at 0% | Misleading | Show only after data exists |

### 4.2 Downgrade to Secondary/Collapsed

| Item | Current Location | New Location |
|------|-----------------|--------------|
| PipelineBar (full cards) | Primary, expanded | Collapsed timeline |
| Phase config details | Left column | Drawer/modal on demand |
| Momentum analysis | Bottom section | Collapsed section in InsightPanel |
| Histogram | Always visible | On-demand within Momentum |

### 4.3 Defer (Remove Entirely for Now)

| Item | Reason |
|------|--------|
| `ClassificationBuckets` | Unused (prefixed with `_`) |
| `MomentumPanel` | Unused (prefixed with `_`) |
| `WarningBar`, `WarningPills` | Redundant with WarningDistribution |
| `ConfigSummaryPanel` | Unused (prefixed with `_`) |

---

## 5. State Flow Contract

### 5.1 Data Fetching Strategy

```typescript
// Required for render (block UI until loaded)
const CRITICAL_QUERIES = ['getCampaignStatus', 'getCampaignEnriched'];

// Load on demand (show skeleton while loading)
const DEFERRED_QUERIES = [
  'getCampaignFunnel',      // After generation starts
  'getCampaignMetrics',     // After HTTP completes
  'getCampaignDomains',     // After leads exist
  'getCampaignPhaseConfigs' // On inspector open
];
```

### 5.2 SSE Event Handling

```typescript
// SSE events update specific UI regions only
const SSE_HANDLERS = {
  'phase_progress':    () => refetchStatusSnapshot(),  // ExecutionHeader
  'phase_completed':   () => { refetchStatusSnapshot(); refetchFunnel(); },
  'phase_failed':      () => refetchStatusSnapshot(),
  // DO NOT refetch metrics on every progress tick - too expensive
};
```

---

## 6. Refactor Plan

### Phase 1: Extract ExecutionHeader (Safe, No Regressions)
- Create `ExecutionHeader.tsx` with controlPhase-driven progress
- Extract control buttons into `ControlDock.tsx`
- Remove phase selector dropdown
- Keep existing PipelineBar as fallback

### Phase 2: Consolidate Controls (UI Simplification)
- Implement `ControlState` derivation hook
- Show only contextually-valid buttons
- Move secondary actions to overflow menu
- Remove "Run Selected Phase" concept

### Phase 3: Add Progressive Disclosure (Data-Driven)
- Wrap OutcomePanel in phase-gate conditions
- Implement empty state components
- Add collapse/expand for PipelineTimeline
- Defer config loading to drawer trigger

### Phase 4: Implement ConfigInspector Drawer
- Create slide-out drawer component
- Move ConfigSummary + PhaseConfigDisplay into it
- Add "View Configuration" button to ExecutionHeader
- Lazy-load phaseConfigsData on drawer open

### Phase 5: Clean Up Dead Code
- Remove unused component imports (prefixed with `_`)
- Delete redundant warning components
- Consolidate duplicate types

### Phase 6: Polish and Test
- Add loading skeletons for deferred content
- Test all phase transitions
- Verify SSE reconnection doesn't cause flicker
- Accessibility audit

---

## 7. Wireframe: ExecutionHeader

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  HTTP Keyword Validation                                    ● Live       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░  67%         │
│                                                                          │
│  4,892 of 7,300 domains processed • ~3 min remaining                     │
│                                                                          │
│  ┌─────────┐  ┌──────────────┐                    ┌─────────────────┐   │
│  │ ⏸ Pause │  │ ⏹ Stop Run   │                    │ ⚙ Configuration │   │
│  └─────────┘  └──────────────┘                    └─────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

When paused:
```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  HTTP Keyword Validation                                    ⏸ Paused     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░  67%         │
│                                                                          │
│  4,892 of 7,300 domains processed • Paused by user                       │
│                                                                          │
│  ┌──────────┐  ┌──────────────┐                   ┌─────────────────┐   │
│  │ ▶ Resume │  │ ⏹ Stop Run   │                   │ ⚙ Configuration │   │
│  └──────────┘  └──────────────┘                   └─────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

When idle (completed or ready):
```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Campaign Complete                                          ✓ Finished   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100%        │
│                                                                          │
│  7,300 domains processed • 142 leads identified                          │
│                                                                          │
│  ┌─────────────────┐  ┌────────────────┐         ┌─────────────────┐   │
│  │ ↻ Restart Run   │  │ 📥 Export CSV  │         │ ⚙ Configuration │   │
│  └─────────────────┘  └────────────────┘         └─────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Invariants (Must Always Hold)

1. **Single Control Authority**: `controlPhase` from `statusSnapshot` determines what can be controlled
2. **Button Visibility = runtimeControls**: Never show a button that `canX === false`
3. **No Phase Selector**: User doesn't pick phases; UI follows `controlPhase`
4. **Progressive Content**: Empty panels don't render, they're gated on data presence
5. **SSE Updates ExecutionHeader Only**: Other panels refresh on terminal events, not progress ticks
6. **Config is Inspection, Not Execution**: Config display is read-only, in a separate surface

---

## 9. Success Criteria

- [ ] ExecutionHeader answers "What's happening now?" in 1 second
- [ ] ControlDock shows ≤3 buttons at any time
- [ ] Pipeline timeline is collapsed by default, expandable
- [ ] Zero empty KPI cards or funnel bars visible
- [ ] Configuration is accessible but not in primary viewport
- [ ] No phase selector dropdown exists
- [ ] Page renders critical content in <500ms, defers secondary content
