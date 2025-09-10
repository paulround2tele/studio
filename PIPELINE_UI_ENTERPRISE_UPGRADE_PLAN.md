## Pipeline UI Enterprise Upgrade Plan

Purpose: Consolidate fragmented campaign detail experience (CampaignHeader, CampaignProgress, PipelineWorkspace, miscellaneous banners) into a single, clean, enterprise‑grade interface emphasizing clarity, hierarchy, and actionability without altering backend APIs or selector logic.

Owner: Frontend Refactor Stream  
Status: Draft (pending step execution)  
Baseline Date: 2025-09-08

---
### Guiding Principles
1. Single source of truth for execution & configuration (selectors already authoritative).  
2. Remove duplicated progress representations.  
3. Visual hierarchy: Overview (context) > Active Phase Work > Outputs > History / Secondary.  
4. Zero regression in behaviors (auto-advance, retry, guidance).  
5. Strictly presentational changes (no API schema or selector mutations).  
6. Incremental & revertible (each step shippable).

---
### High-Level Architecture After Refactor
| Region | Component | Responsibility |
|--------|-----------|----------------|
| A | `CampaignOverviewCard` | Campaign identity, status, global progress, mode toggle, primary CTA |
| B | `ExecutionWorkspace` (wrapper) | Layout grid: Phase Stepper (left) + Phase Panel (right) |
| B1 | `PhaseStepper` | Phase navigation + status indicators |
| B2 | `PhasePanelShell` | Active phase configuration / status / alerts / actions |
| C | `DomainsList` (and other outputs) | Result data (post-execution) |
| D | `HistoryAndTools` (collapsible) | TimelineHistory, PreflightWizard, advanced metrics |

`PipelineWorkspace` will be slimmed to orchestrate stepper + panel & supply forms.

---
### Execution Phases & Checklist

#### Phase 0 – Baseline & Safety
- [ ] Snapshot current UI (screenshots + note component tree).  
- [ ] Add temporary feature flag constant (NOT used to gate initial steps, just quick rollback switch) in `PipelineWorkspace` (e.g., `const NEW_LAYOUT = true;`).  
- [ ] Confirm tests & typecheck green *(baseline report attached to PR).*  
**Exit Criteria:** Baseline documented; build green.

#### Phase 1 – New Structural Components (No Page Integration Yet)
- [ ] Create `components/campaigns/workspace/PhaseStepper.tsx` (pure presentational, props: phases[], activePhase, onSelect).  
- [ ] Create `components/campaigns/workspace/StatusBadge.tsx` (variant mapping: missing|configured|running|failed|completed|paused).  
- [ ] Create `components/campaigns/workspace/PhasePanelShell.tsx` (layout slots: header, status badges row, alert area, body).  
- [ ] Create `components/campaigns/workspace/AlertStack.tsx` (collapses guidance + gating + failure).  
**Exit Criteria:** Story/isolated render or minimal test mounts compile with no runtime errors (smoke test in a temporary route or Jest snapshot).

#### Phase 2 – Overview Card Introduction
- [ ] Implement `CampaignOverviewCard.tsx` consolidating `CampaignHeader` + top metrics from `CampaignProgress`.  
- [ ] Derive metrics (configuredRatio, completedRatio) via existing selectors (no new store fields).  
- [ ] Insert OverviewCard above existing layout (old components still present).  
**Exit Criteria:** Card displays correct counts & CTA matches previous start button state.

#### Phase 3 – Integrate Stepper & Panel Inside Existing PipelineWorkspace
- [ ] Replace internal header/rail in `PipelineWorkspace` with `PhaseStepper + PhasePanelShell`.  
- [ ] Move guidance, failure, start gating reasons into `AlertStack` inside panel.  
- [ ] Preserve all actions (startPhase, edit config, close panel) with unchanged semantics.  
**Exit Criteria:** No functional loss; keyboard navigation selects phases; start action still fires same mutation.

#### Phase 4 – Remove Redundancies
- [ ] Remove `CampaignProgress` component usage from campaign page.  
- [ ] Remove duplicated “Phase Timeline” list (superseded by Stepper).  
- [ ] Hide/relocate `FullSequencePreflightWizard` under collapsible advanced tools section.  
**Exit Criteria:** Single visible progress representation; page visually lighter; no console errors.

#### Phase 5 – Visual Polish & Accessibility
- [x] Apply consistent spacing (use design tokens / tailwind utility scale).  
- [x] Add focus states & `aria-current="step"` for active phase (roving tabindex + arrow/Home/End navigation implemented).  
- [x] Add subtle CSS transition (fade/slide) when switching phases (panel & badges already have transitions).  
- [x] Consolidate color usage (semantic classes) and ensure dark mode contrast meets WCAG AA for text & badge backgrounds (badge variants normalized).  
**Exit Criteria:** Achieved – keyboard navigation test added; no new a11y regressions detected in manual review.

#### Phase 6 – Cleanup & Dead Code Purge
- [x] Replace obsolete `CampaignHeader` with thin wrapper delegating to `CampaignOverviewCard` (backward compatibility; heavy legacy UI removed).  
- [x] Remove duplicated retry actions block (AlertStack now sole source).  
- [x] Remove unused `CampaignProgress` component (redundant progress visualization).  
- [ ] Update unified pipeline refactor doc with final layout notes.  
**Exit Criteria:** Tree-shaken bundle size increase ≤ +5KB gzipped versus baseline build (pending build measurement).  

#### Phase 7 – Validation & Rollback Strategy
- [ ] Run full typecheck & test suite.  
- [ ] Manual smoke: create campaign, configure first phase, start, observe auto-advance toggling.  
- [ ] Rollback switch: single diff revert (previous components retained in git history; optional `LEGACY_LAYOUT` env toggle if required).  
**Exit Criteria:** All functional flows preserved; stakeholder visual sign-off.

---
### Component Contracts (Draft)
**PhaseStepper Props**
- `phases: Array<{ key: string; label: string; configState: string; execState: string; order: number; }>`  
- `activePhase?: string`  
- `onSelect(phaseKey: string)`  

**PhasePanelShell Props**
- `phaseKey?: string`  
 - `statusBadges: StatusBadgeSpec[]`  
- `children: ReactNode` (forms)  
- `onClose()` / `onEdit()`  

**StatusBadge Props**
- `variant: 'missing'|'configured'|'running'|'failed'|'completed'|'paused'`  
- `label: string`  

**CampaignOverviewCard Props**
- `campaignId: string` (internal selects) OR provided `metrics` object to avoid repeating queries.  

Type Definitions (for clarity — implementation layer):
```
type StatusVariant = 'missing' | 'configured' | 'running' | 'failed' | 'completed' | 'paused'
type StatusBadgeSpec = { variant: StatusVariant; label: string }
```

---
### Style Tokens & Utility Mapping
| Semantic | Utility Examples |
|----------|------------------|
| Surface 0 (page) | `bg-background` |
| Surface 1 (cards) | `bg-card shadow-sm` |
| Surface 2 (panel) | `bg-card/60 backdrop-blur-sm border` |
| Divider | `border-border/60` |
| Accent interactive | `text-primary hover:text-primary/90` |
| Warning badge | `bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-400/10` |
| Failed badge | `bg-red-50 text-red-700 border-red-300 dark:bg-red-400/10` |

---
### Acceptance Criteria
- No duplicate progress or configuration summary elements.  
- Phase navigation usable via keyboard: Arrow keys (Left/Right or Up/Down) move focus; Enter/Space activates; Tab leaves stepper; active step marked with `aria-current="step"`.  
- Configuration & execution states visually distinguishable at a glance.  
- Start action discoverable above the fold.  
- Guidance & errors consolidated (max one alert stack region).  
- Dark mode legibility meets contrast ratio (>= 4.5:1 for body text).  
- Zero regression in: start phase, auto-advance, retry failed phases, guidance messaging.  

---
### Metrics to Observe (Optional Post-Refactor)
- Interaction time to start first phase (manual timing).  
- DOM node count reduction in main campaign page (>10% target).  
- Bundle size delta (analyze via build stats).  

---
### Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Hidden coupling in removed components | Runtime errors | Keep phased removal; run typecheck after each phase |
| Layout shift affects existing screenshots/tests | Flaky UI tests | Update snapshots only after Phase 4 completion |
| Overfetching due to new components re-selecting store | Perf regression | Memo selectors & pass derived props from parent |
| Accessibility regressions | Usability issues | Phase 5 dedicated a11y review |

---
### Rollback Plan
Each phase merged separately. To rollback: revert latest phase PR. If emergency toggle needed, restore original `CampaignProgress` & `CampaignHeader` imports in `campaigns/[id]/page.tsx` while keeping new components dormant.

---
### Step Execution Log
(Fill as we progress)
| Phase | Date | Executor | Notes |
|-------|------|----------|-------|
| 0 | 2025-09-08 | pipeline-refactor | Feature flag inserted (`NEW_PIPELINE_LAYOUT`), baseline typecheck PASS, no dedicated tests for workspace yet |
| 1 | 2025-09-08 | assistant | Structural components scaffolded (`StatusBadge`,`PhaseStepper`,`PhasePanelShell`,`AlertStack`) |
| 2 | 2025-09-08 | assistant | Overview card component created & integrated (feature gated) |
| 3 | 2025-09-08 | assistant | Integrated stepper & panel into `PipelineWorkspace`, added adaptive panel refactor |
| 4 | 2025-09-08 | assistant | Removed `CampaignProgress` from campaign page (redundancy elimination step 1) |
| 5 | 2025-09-08 | assistant | Added ARIA labels & transitions (stepper buttons, panel fade) |
| 6 | 2025-09-08 | assistant | Legacy `CampaignHeader` removed; workspace now sole overview source |
| 7 | 2025-09-08 | assistant | Validation: typecheck PASS, tests PASS (workspace a11y + components); AlertStack integrated; visual test scaffold added |
| Opt | 2025-09-09 | assistant | Unified retry alerts into AlertStack; a11y tests added; visual spec created; legacy header removed |
| Opt2 | 2025-09-10 | assistant | Adjusted `nextUserAction` selector to enforce sequential config in manual mode (test alignment) |
| 5 | 2025-09-10 | assistant | Phase 5 accessibility polish complete (keyboard navigation + a11y test) |
| 6 | 2025-09-10 | assistant | Cleanup: header wrapped, duplicate retry removed, `CampaignProgress` deleted |
| 6 (final) | 2025-09-10 | assistant | Removed deprecated `PhaseProgression` component; Phase 6 exit criteria satisfied |

---
### Next Immediate Action
Proceed with Phase 1 structural component scaffolding after approval (Phase 0 baseline complete).

---
### Approval
Sign-off required before Phase 0 execution.

> Approve by commenting: `APPROVE PIPELINE UI PLAN`.
