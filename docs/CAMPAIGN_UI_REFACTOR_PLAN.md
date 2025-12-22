# Campaign UI Refactor Plan

**Reference:** [CAMPAIGN_UI_CONTRACT.md](./CAMPAIGN_UI_CONTRACT.md)  
**Target:** Transform stacked dashboard → professional operations console  

---

## Overview

This refactor follows the same systems-level approach as the SSE/phase-state hardening:
1. Identify the single source of truth for each concern
2. Eliminate competing authorities
3. Gate UI on data presence, not layout slots

**Estimated Effort:** 6 phases, ~2-3 hours each  
**Risk Level:** Medium (UI-only, no backend changes)  

---

## Phase 1: Create ExecutionHeader Component

**Goal:** Single surface for "What's happening now" + "What can I do"

### 1.1 Create `ExecutionHeader.tsx`

```typescript
// src/components/refactor/campaign/ExecutionHeader.tsx
interface ExecutionHeaderProps {
  campaignId: string;
  controlPhase: ApiPhase | null;
  phaseStatus: CampaignPhasesStatusResponsePhasesInner | null;
  runtimeControls: PhaseRuntimeControls | null;
  isConnected: boolean;
  sseError: string | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  onOpenConfig: () => void;
  isActionLoading: boolean;
}
```

**Key behaviors:**
- Shows active/paused phase name prominently
- Single progress bar (not 5 separate ones)
- Control buttons derived from `runtimeControls`
- SSE status indicator integrated

### 1.2 Create `useControlState` Hook

```typescript
// src/hooks/useControlState.ts
interface ControlState {
  controlPhase: ApiPhase | null;
  phaseLabel: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'idle';
  progress: number;
  processed: number;
  total: number;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  canRestart: boolean;
  hasFailedPhases: boolean;
}

function useControlState(
  statusSnapshot: CampaignPhasesStatusResponse | undefined,
  phaseStatusData: PhaseStatusResponse | undefined
): ControlState
```

### 1.3 Files Changed

| File | Action |
|------|--------|
| `src/components/refactor/campaign/ExecutionHeader.tsx` | **CREATE** |
| `src/hooks/useControlState.ts` | **CREATE** |
| `src/components/refactor/campaign/CampaignExperiencePage.tsx` | Add ExecutionHeader, keep PipelineBar for now |

### 1.4 Verification

- [ ] ExecutionHeader renders with mock data
- [ ] Control buttons appear based on runtimeControls
- [ ] Progress bar updates with SSE
- [ ] Existing PipelineBar still works (parallel deployment)

---

## Phase 2: Implement ControlDock Pattern

**Goal:** Contextual controls that only show valid actions

### 2.1 Create `ControlDock.tsx`

```typescript
// src/components/refactor/campaign/ControlDock.tsx
interface ControlDockProps {
  controls: ControlState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  onRetryFailed: () => void;
  isLoading: boolean;
}
```

**Button visibility rules:**
```typescript
const BUTTONS = [
  { id: 'pause',   show: (c) => c.canPause,   primary: true },
  { id: 'resume',  show: (c) => c.canResume,  primary: true },
  { id: 'stop',    show: (c) => c.canStop,    primary: true },
  { id: 'restart', show: (c) => c.canRestart && c.status === 'idle', primary: false },
  { id: 'retry',   show: (c) => c.hasFailedPhases && c.status === 'idle', primary: false },
];
```

### 2.2 Add Overflow Menu for Secondary Actions

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      More Actions
      <ChevronDown />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {showRestart && <DropdownMenuItem onClick={onRestart}>Restart Campaign</DropdownMenuItem>}
    {showRetry && <DropdownMenuItem onClick={onRetryFailed}>Retry Failed Phases</DropdownMenuItem>}
  </DropdownMenuContent>
</DropdownMenu>
```

### 2.3 Remove Phase Selector

**Current (remove):**
```tsx
<Select value={selectedPhaseKey} onValueChange={...}>
  <SelectTrigger>
    <SelectValue placeholder="Choose a phase" />
  </SelectTrigger>
  {/* ... */}
</Select>
```

**Rationale:** Users don't think in phases. The UI should follow `controlPhase` automatically.

### 2.4 Files Changed

| File | Action |
|------|--------|
| `src/components/refactor/campaign/ControlDock.tsx` | **CREATE** |
| `src/components/refactor/campaign/ExecutionHeader.tsx` | Integrate ControlDock |
| `src/components/refactor/campaign/CampaignExperiencePage.tsx` | Remove phase selector, remove 5-button row |

### 2.5 Verification

- [ ] ≤3 buttons visible at any time
- [ ] Pause shows only when canPause
- [ ] Resume shows only when canResume
- [ ] Secondary actions in overflow menu
- [ ] No phase selector dropdown

---

## Phase 3: Create PipelineTimeline (Collapsed)

**Goal:** Compact phase overview that expands on demand

### 3.1 Create `PipelineTimeline.tsx`

```typescript
// src/components/refactor/campaign/PipelineTimeline.tsx
interface PipelineTimelineProps {
  phases: PipelinePhase[];
  defaultExpanded?: boolean;
}
```

**Collapsed view:**
```
✓ Generation → ✓ DNS → ● HTTP → ○ Analysis → ○ Leads  [Expand]
```

**Expanded view:**
```
┌─────────────────────────────────────────────────────┐
│ ✓ Domain Generation    Completed    10,000 domains │
│   Started: 10:32 AM    Completed: 10:34 AM         │
├─────────────────────────────────────────────────────┤
│ ✓ DNS Validation       Completed    8,200 valid    │
│   Started: 10:34 AM    Completed: 10:41 AM         │
├─────────────────────────────────────────────────────┤
│ ● HTTP Validation      In Progress  67%            │
│   Started: 10:41 AM    4,892 / 7,300 processed     │
├─────────────────────────────────────────────────────┤
│ ○ Analysis             Not Started                 │
├─────────────────────────────────────────────────────┤
│ ○ Lead Extraction      Not Started                 │
└─────────────────────────────────────────────────────┘
```

### 3.2 Files Changed

| File | Action |
|------|--------|
| `src/components/refactor/campaign/PipelineTimeline.tsx` | **CREATE** |
| `src/components/refactor/campaign/CampaignExperiencePage.tsx` | Replace PipelineBar with PipelineTimeline |
| `src/components/refactor/campaign/PipelineBar.tsx` | **DEPRECATE** (keep for reference) |

### 3.3 Verification

- [ ] Timeline shows collapsed by default
- [ ] Expand button reveals full details
- [ ] Active phase highlighted
- [ ] Failed phase shows error inline
- [ ] Completed phases show checkmark

---

## Phase 4: Implement Progressive Disclosure

**Goal:** Show content only when meaningful

### 4.1 Create Gate Components

```typescript
// src/components/refactor/campaign/gates/FunnelGate.tsx
function FunnelGate({ funnelData, children }: { funnelData: FunnelData | undefined, children: ReactNode }) {
  if (!funnelData || funnelData.generated === 0) {
    return <FunnelPlaceholder message="Funnel data will appear after domain generation starts" />;
  }
  return <>{children}</>;
}

// src/components/refactor/campaign/gates/LeadsGate.tsx
function LeadsGate({ funnelData, children }: ...) {
  if (!funnelData || (funnelData.httpValid === 0 && funnelData.leads === 0)) {
    return <LeadsPlaceholder message="Lead results will appear after HTTP enrichment" />;
  }
  return <>{children}</>;
}
```

### 4.2 Create Placeholder Components

```typescript
// src/components/refactor/campaign/placeholders/FunnelPlaceholder.tsx
function FunnelPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-dashed border-2">
      <div className="text-center text-gray-500">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
```

### 4.3 Wrap Existing Panels

```tsx
// Before
<FunnelSnapshot data={funnelData} />

// After
<FunnelGate funnelData={funnelData}>
  <FunnelSnapshot data={funnelData!} />
</FunnelGate>
```

### 4.4 Remove Empty KPI Handling

**Current:** Shows 6 KPI cards with zeros  
**New:** Show loading skeleton until metricsData.totalAnalyzed > 0

### 4.5 Files Changed

| File | Action |
|------|--------|
| `src/components/refactor/campaign/gates/FunnelGate.tsx` | **CREATE** |
| `src/components/refactor/campaign/gates/LeadsGate.tsx` | **CREATE** |
| `src/components/refactor/campaign/gates/KpiGate.tsx` | **CREATE** |
| `src/components/refactor/campaign/placeholders/*.tsx` | **CREATE** |
| `src/components/refactor/campaign/CampaignExperiencePage.tsx` | Wrap panels in gates |
| `src/components/refactor/campaign/KpiGrid.tsx` | Use placeholder instead of zero cards |

### 4.6 Verification

- [ ] Funnel hidden until generated > 0
- [ ] Leads hidden until httpValid > 0
- [ ] KPIs hidden until totalAnalyzed > 0
- [ ] Placeholders show phase-appropriate messages
- [ ] No empty cards or 0% bars visible

---

## Phase 5: Create ConfigInspector Drawer

**Goal:** Audit trail in dedicated surface, not primary viewport

### 5.1 Create `ConfigInspector.tsx`

```typescript
// src/components/refactor/campaign/ConfigInspector.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface ConfigInspectorProps {
  campaignId: string;
  trigger: ReactNode;
}

function ConfigInspector({ campaignId, trigger }: ConfigInspectorProps) {
  const { data: phaseConfigs, isLoading } = useGetCampaignPhaseConfigsQuery(campaignId, {
    // Only fetch when drawer opens
    skip: !isOpen,
  });

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-[500px]">
        <SheetHeader>
          <SheetTitle>Campaign Configuration</SheetTitle>
        </SheetHeader>
        {isLoading ? <Skeleton /> : <PhaseConfigDisplay configs={...} />}
      </SheetContent>
    </Sheet>
  );
}
```

### 5.2 Integrate with ExecutionHeader

```tsx
<ExecutionHeader
  ...
  configButton={
    <ConfigInspector
      campaignId={campaignId}
      trigger={<Button variant="outline"><Settings /> Configuration</Button>}
    />
  }
/>
```

### 5.3 Remove from Main Layout

**Remove from left column:**
- `ConfigSummary`
- `PhaseConfigDisplay`

### 5.4 Files Changed

| File | Action |
|------|--------|
| `src/components/refactor/campaign/ConfigInspector.tsx` | **CREATE** |
| `src/components/refactor/campaign/ExecutionHeader.tsx` | Add config button slot |
| `src/components/refactor/campaign/CampaignExperiencePage.tsx` | Remove ConfigSummary, PhaseConfigDisplay |

### 5.5 Verification

- [ ] Configuration button in ExecutionHeader
- [ ] Drawer opens on click
- [ ] Config data loads lazily
- [ ] All phase configs visible in drawer
- [ ] No config in primary viewport

---

## Phase 6: Clean Up and Polish

**Goal:** Remove dead code, finalize layout

### 6.1 Remove Dead Imports

```typescript
// Remove from CampaignExperiencePage.tsx
- import { ConfigSummaryPanel as _ConfigSummaryPanel } from './ConfigSummaryPanel';
- import { MomentumPanel as _MomentumPanel } from './MomentumPanel';
- import { ClassificationBuckets as _ClassificationBuckets } from './ClassificationBuckets';
- import { WarningBar as _WarningBar } from './WarningBar';
- import { WarningPills as _WarningPills } from './WarningPills';
```

### 6.2 Delete Unused Components

| File | Action |
|------|--------|
| `ConfigSummaryPanel.tsx` | **DELETE** (unused) |
| `WarningBar.tsx` | **DELETE** (redundant with WarningDistribution) |
| `WarningPills.tsx` | **DELETE** (redundant) |

### 6.3 Update Layout Grid

```tsx
// Final layout structure
<div className="space-y-6">
  {/* Tier 1: Execution State */}
  <ExecutionHeader ... />
  
  {/* Tier 2: Pipeline Overview */}
  <PipelineTimeline phases={pipelinePhases} />
  
  {/* Tier 3-4: Outcomes and Insights */}
  <div className="grid gap-6 lg:grid-cols-2">
    {/* Left: Outcomes */}
    <div className="space-y-6">
      <FunnelGate funnelData={funnelData}>
        <FunnelSnapshot data={funnelData!} />
      </FunnelGate>
      <LeadsGate funnelData={funnelData}>
        <LeadResultsPanel ... />
      </LeadsGate>
    </div>
    
    {/* Right: Insights */}
    <div className="space-y-6">
      <KpiGate metricsData={metricsData}>
        <KpiGrid kpis={kpis} />
      </KpiGate>
      <WarningDistribution ... />
      <RecommendationPanel ... />
    </div>
  </div>
</div>
```

### 6.4 Files Changed

| File | Action |
|------|--------|
| `src/components/refactor/campaign/CampaignExperiencePage.tsx` | Final layout, remove dead code |
| `src/components/refactor/campaign/ConfigSummaryPanel.tsx` | **DELETE** |
| `src/components/refactor/campaign/WarningBar.tsx` | **DELETE** |
| `src/components/refactor/campaign/WarningPills.tsx` | **DELETE** |

### 6.5 Final Verification Checklist

- [ ] ExecutionHeader answers "What's happening now?" at top
- [ ] ≤3 control buttons visible
- [ ] Pipeline collapsed by default
- [ ] No empty panels visible
- [ ] Config in drawer, not main viewport
- [ ] No dead imports
- [ ] TypeScript compiles clean
- [ ] ESLint passes
- [ ] All phase transitions work
- [ ] SSE reconnection stable
- [ ] Page loads in <500ms

---

## Risk Mitigation

### Rollback Strategy

Each phase is additive - we can stop at any phase and have a working UI:
- Phase 1: ExecutionHeader exists alongside PipelineBar
- Phase 2: Controls consolidated, can revert to 5-button layout
- Phase 3: Timeline can coexist with old PipelineBar
- Phase 4: Gates can be removed to show all content
- Phase 5: Drawer can be removed, keep inline config
- Phase 6: Don't delete files until Phase 5 verified

### Testing Strategy

1. **Unit tests** for hooks (useControlState)
2. **Component tests** for ExecutionHeader, ControlDock
3. **E2E test** for full flow: create campaign → run phases → view leads
4. **Visual regression** for layout changes

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: ExecutionHeader | 2h | None |
| Phase 2: ControlDock | 1.5h | Phase 1 |
| Phase 3: PipelineTimeline | 1.5h | None (parallel with 2) |
| Phase 4: Progressive Disclosure | 2h | Phase 1-3 |
| Phase 5: ConfigInspector | 1.5h | Phase 4 |
| Phase 6: Cleanup | 1h | Phase 5 |

**Total:** ~10 hours

---

## Questions for Review

1. Should we keep any KPIs always visible (e.g., "High Potential" even at 0)?
2. Is the overflow menu acceptable for Restart/Retry, or should they be always visible?
3. Should PipelineTimeline default to expanded on desktop, collapsed on mobile?
4. Do we want animated transitions between states, or instant swaps?
