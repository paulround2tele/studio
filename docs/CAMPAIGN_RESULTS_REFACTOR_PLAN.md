# DomainFlow Studio Campaign Results Refactor Plan
## Source of Truth — v2.0

**Status**: 🔒 LOCKED  
**Last Updated**: 2024-12-27  
**Owner**: Engineering Team  

> ⚠️ **Lock-in Directive**: This plan is the source of truth for the Campaign Results refactor. Any deviation must be reviewed against it. Changes = plan updates first, code second. No silent scope drift.

---

## Table of Contents

1. [System Understanding](#1️⃣-system-understanding)
   - [§1A: Type-Safety Principles](#§1a-type-safety-principles-non-negotiable)
2. [User Modes](#2️⃣-user-modes)
3. [Information Hierarchy](#3️⃣-information-hierarchy)
4. [UI Shape](#4️⃣-ui-shape-conceptual)
5. [Keyboard Navigation](#5️⃣-keyboard-navigation-p0)
6. [Backend Contracts](#6️⃣-backend-contracts)
7. [SSE Reconnection Strategy](#7️⃣-sse-reconnection-strategy)
8. [Export Rules](#8️⃣-export-rules)
9. [Lead Exploration Model](#9️⃣-lead-exploration-model)
10. [Transparency & Audit](#🔟-transparency--audit)
11. [Failure & Degradation Strategy](#1️⃣1️⃣-failure--degradation-strategy)
12. [Component Disposition](#1️⃣2️⃣-component-disposition)
13. [Phased Execution Plan](#1️⃣3️⃣-phased-execution-plan)
14. [Phase 0 Tickets](#1️⃣4️⃣-phase-0-tickets-backend-contracts)
15. [Acceptance Criteria](#1️⃣5️⃣-acceptance-criteria)
16. [Risks & Mitigations](#1️⃣6️⃣-risks--mitigations)
17. [Directive Traceability](#1️⃣7️⃣-directive-traceability)
18. [Future Polish](#1️⃣8️⃣-future-polish-out-of-scope)

---

## 1️⃣ System Understanding

### Product Interpretation

DomainFlow Studio is a **lead generation pipeline** that transforms a vast, noisy domain space into a small set of high-quality, actionable leads. The system operates on the principle of **progressive filtering**:

```
10,000+ domains → DNS filter → HTTP filter → Keyword filter → Scoring → Leads (50-200)
```

**Key insight**: This is not a dashboard product. It is an **operations console** for running multi-phase data processing campaigns where:

1. **Backend is the single source of truth** — all counters, states, scores, and lineage originate from persisted database records and are exposed via authoritative endpoints
2. **Each campaign is a unit of work** — not a collection of domains. The campaign has a lifecycle (`draft` → `running` → `paused` → `completed` → `failed`)
3. **Phases are sequential gates** — Discovery → Validation (DNS+HTTP) → Extraction → Analysis → Enrichment. Each phase has configuration, execution, and completion status
4. **Lineage is immutable** — campaigns share discovery configurations via `config_hash`, domains have `offset_index` positions. **Discovery offsets are automatic and never user-overridable**
5. **Trust is the product** — if users can't trust the numbers, they can't act on the leads

### The Audit Equation (Non-Negotiable)

Backend and UI must guarantee:

```
analyzed = qualified + rejected + no_keyword + error + timeout
```

**Rules:**
- Computed backend-side
- Validated in tests
- UI warns if violated

This is the math of trust.

### Stats Truth > Pipeline UI

**Directive**: Stats endpoint is the single business truth. Pipeline progress = observability only. If they disagree → bug. UI must never let pipeline visuals override stats.

### §1A: Type-Safety Principles (Non-Negotiable)

All API contracts must use **strong, named types/enums** — no raw strings for business states.

**Rules:**
1. **Backend types are the source of truth** — all enums defined in `backend/internal/models/`
2. **Frontend consumes auto-generated types** from OpenAPI/Swagger — no hand-rolled guessing
3. **All filters use strong types** — e.g., `*DomainRejectionReasonEnum`, not `*string`
4. **Parse and validate at boundaries** — use `ParseRejectionReason()` to validate string inputs
5. **No legacy/ambiguous values** — all rows must map deterministically to defined states

**Any new field or enum must be added to:**
- Backend models (`backend/internal/models/`)
- OpenAPI spec (`backend/api/openapi.yaml`)
- Generated frontend types (`npm run gen:all`)
- End-to-end usage (handlers, store, UI)

**Example (rejection_reason):**
```go
// Backend: Strong enum type
type DomainRejectionReasonEnum string
const (
    DomainRejectionReasonQualified   DomainRejectionReasonEnum = "qualified"
    DomainRejectionReasonDNSTimeout  DomainRejectionReasonEnum = "dns_timeout"
    // ...
)

// Filter uses enum, not string
type ListCampaignDomainsFilter struct {
    RejectionReason *DomainRejectionReasonEnum // NOT *string
}

// Parse and validate at API boundary
reason, err := ParseRejectionReason(queryParam)
if err != nil {
    return BadRequest("invalid rejection_reason")
}
```

---

## 2️⃣ User Modes

### Mode Determination (Backend-Driven, Non-Negotiable)

Mode is derived from backend state, never URL-controlled or user-selected.

```
Execution Mode:
  campaign.status ∈ {running, paused}
  OR any phase.status = in_progress
  OR stats.completeness ≠ 'complete'

Results Mode:
  stats.completeness = 'complete'
  AND campaign.status ∈ {completed, failed, cancelled}
  AND no phase.status = in_progress
```

**URL may reflect mode but never override it.** If URL says `?mode=results` but backend says running → UI shows Execution Mode.

### Execution Mode Behavior

**Mental model**: "What is happening right now? Is it working?"

| Element | Behavior |
|---------|----------|
| **Live phase rows** | Show each phase with status, start/end times, duration |
| **Progress counts** | Real-time items processed/total from SSE |
| **Errors visible** | Inline, prominent, not hidden in tooltips |
| **"Leads so far"** | Optional preview, **clearly marked PARTIAL** |
| **Controls** | Pause/Resume/Stop visible and active |
| **Pipeline** | Primary visual, expanded by default |

### Results Mode Behavior

**Mental model**: "What did I get? Should I trust it? What do I do next?"

| Element | Behavior |
|---------|----------|
| **Verdict** | "127 leads from 10,542 domains" — immediate answer |
| **Sticky stats** | Authoritative funnel + KPIs from stats endpoint |
| **Command center** | Lead table with filters, sort, drill-down |
| **Pipeline** | Collapsed to audit view (expand on demand) |
| **Controls** | Disabled or hidden (Re-run Analysis available) |

### Mode Transition & Cache

When transitioning Execution → Results:
1. **Invalidate stats query** — force refetch
2. **Invalidate domain lists** — force refetch
3. Do not rely on stale SSE-patched cache for final truth

```typescript
// On mode transition
dispatch(campaignApi.util.invalidateTags([
  { type: 'CampaignStats', id: campaignId },
  { type: 'CampaignDomains', id: campaignId },
  { type: 'CampaignFunnel', id: campaignId },
]));
```

---

## 3️⃣ Information Hierarchy

### Execution Mode Hierarchy

| Tier | What | Why | Location |
|------|------|-----|----------|
| **1. Campaign Identity** | Name, status badge, EXECUTION mode indicator | Anchor context | Top bar (sticky) |
| **2. Active Phase** | Current phase name, progress %, items processed/total, duration, last error | Answer "what's happening now" | Primary content |
| **3. Phase Timeline** | All 5 phases with status, start/end times, live progress | Pipeline observability | Vertical list (mobile) or horizontal stepper (desktop) |
| **4. Phase Controls** | Pause/Resume/Stop buttons | Enable intervention | Context rail (desktop) or bottom bar (mobile) |
| **5. Realtime Counters** | DNS ok/error/timeout, HTTP ok/error/timeout (live) | Operational health | Inline with phases or side panel |
| **6. Partial Leads Preview** | "~45 leads so far" with ⚠️ PARTIAL badge | Optional progress hint | Below pipeline, de-emphasized |

### Results Mode Hierarchy

| Tier | What | Why | Location |
|------|------|-----|----------|
| **1. Verdict Banner** | "Campaign Complete: 127 leads from 10,542 domains" | Answer "what did I get" instantly | Top (sticky on scroll) |
| **2. Sticky Stats** | Authoritative funnel + conversion KPIs from `/stats` endpoint | Prove pipeline added value | Below verdict, always visible |
| **3. Command Center** | Lead table with filters, sort, virtualized rows | Explore results | Main content (split-pane) |
| **4. Detail Pane** | Domain detail, score breakdown, keywords, warnings | Audit individual lead | Right pane (desktop) or full-screen (mobile) |
| **5. Rejection Audit** | Breakdown by reason with counts, drill-down links | Transparency | Tab in command center |
| **6. Pipeline Audit** | Collapsed timeline with timing, configs on expand | Historical context | Collapsible section at bottom |
| **7. Export Actions** | Primary: Leads CSV. Advanced: Rejected, No-keyword | Action | Top-right actions |

---

## 4️⃣ UI Shape (Conceptual)

### Desktop Layout (≥1024px)

```
┌────────────────────────────────────────────────────────────────────────┐
│  STICKY HEADER BAR                                                      │
│  [Campaign Name]      [Status Badge]      [Mode: EXECUTION/RESULTS]     │
│                                                                         │
│  (Execution: "Discovery phase running...")                              │
│  (Results: "127 leads from 10,542 domains")                             │
├─────────────────────────────────────────────────┬──────────────────────┤
│  MAIN CONTENT (scrollable)                      │  CONTEXT RAIL        │
│                                                 │  (fixed, right)      │
│  [Execution Mode]:                              │                      │
│    - Phase Timeline (vertical list)             │  Phase Controls      │
│      • Discovery [●] 2.1s                       │  ├─ Pause            │
│      • Validation [◐] 45% (4,521/10,000)        │  ├─ Stop             │
│      • Extraction [ ] waiting                   │  └─ Restart          │
│      • Analysis [ ] waiting                     │                      │
│      • Enrichment [ ] waiting                   │  Quick Stats         │
│    - Error Alert (if failed)                    │  ├─ DNS: 8,234 ok    │
│    - Partial Preview (optional)                 │  ├─ HTTP: 6,102 ok   │
│                                                 │  └─ Leads: ~45       │
│  [Results Mode]:                                │                      │
│    - Sticky Stats Bar                           │  Export              │
│      [Generated] → [DNS] → [HTTP] → [Leads]     │  ├─ Leads CSV        │
│    - Command Center (split-pane)                │  └─ Advanced...      │
│      ┌─────────────────┬───────────────┐        │                      │
│      │  Lead Table     │  Detail Pane  │        │  Keyboard            │
│      │  (virtualized)  │  (drawer)     │        │  j/k ↑/↓             │
│      │                 │               │        │  Enter → select      │
│      │  [Filters]      │  Score: 87    │        │  Esc → clear         │
│      │  [Sort: Score▼] │  Keywords...  │        │  Tab → switch pane   │
│      └─────────────────┴───────────────┘        │                      │
│                                                 │                      │
├─────────────────────────────────────────────────┴──────────────────────┤
│  COLLAPSED PIPELINE AUDIT (expand to see timing, configs)              │
│  [▶] Discovery 2.1s → Validation 45.3s → Extraction 12.1s → ...        │
└────────────────────────────────────────────────────────────────────────┘
```

### Tablet/Mobile Layout

**Responsive-first design with power UX preserved on desktop.**

```
┌─────────────────────────────────┐
│  STICKY HEADER (compact)        │
│  [Campaign] [Status] [Mode]     │
├─────────────────────────────────┤
│  STACKED CONTENT (scrollable)   │
│                                 │
│  [Execution Mode]:              │
│    - Phase Timeline (vertical)  │
│    - Active Phase Card          │
│    - Error Alert                │
│                                 │
│  [Results Mode]:                │
│    - Verdict Card               │
│    - Funnel (compact)           │
│    - Lead List (full-width)     │
│      └─ Tap row → full-screen   │
│         detail overlay          │
│                                 │
├─────────────────────────────────┤
│  BOTTOM ACTION BAR (sticky)     │
│  [Pause] [Stop] | [Export ▼]    │
└─────────────────────────────────┘
```

**Mobile-specific requirements:**

| Requirement | Implementation |
|-------------|----------------|
| Split-pane collapses to stacked | List view → tap → full-screen detail |
| Toggle between list ↔ detail | Back button or swipe gesture |
| Touch-friendly row sizes | Min 48px tap targets, 16px padding |
| No hover-only affordances | All actions via tap/long-press |
| Minimal sticky bar height | Header ≤ 56px, bottom bar ≤ 64px |

### Dark Mode

**Optional but supported.** Not blocking refactor.

| Requirement | Implementation |
|-------------|----------------|
| Keep dark mode compatibility | Use existing Tailwind `dark:` variants |
| New components respect theme tokens | Use `text-foreground`, `bg-background`, etc. |
| No hardcoded colors | All colors via CSS variables |

---

## 5️⃣ Keyboard Navigation (P0)

**Implement in workspace skeleton phase, not polish.**

### Required Bindings

| Key | Action | Context |
|-----|--------|---------|
| `↑` / `k` | Move selection up | Lead table |
| `↓` / `j` | Move selection down | Lead table |
| `Enter` | Focus/select domain → open detail | Lead table |
| `Esc` | Clear selection / close detail | Global |
| `Tab` | Switch focus: list ↔ detail pane | Command center |
| `Shift+Tab` | Reverse focus switch | Command center |
| `/` | Focus filter input | Command center |
| `e` | Export leads | Global (results mode) |
| `?` | Show keyboard shortcuts | Global |

### Implementation Requirements

| Requirement | Implementation |
|-------------|----------------|
| Works with virtualization | Focus management via `react-window` scroll-to-index |
| Works with pagination | Cursor moves to next page automatically |
| Visible focus ring | 2px ring on focused row |
| Screen reader support | ARIA roles, live regions for status |

---

## 6️⃣ Backend Contracts

### Required Endpoints

| Endpoint | Purpose | Status | Changes Needed |
|----------|---------|--------|----------------|
| `GET /campaigns/{id}/stats` | Authoritative business truth | ✅ Exists | Add `completeness` field |
| `GET /campaigns/{id}/progress` | Per-phase progress (observability) | ✅ Exists | None |
| `GET /campaigns/{id}/status` | All phases with status, timing, error | ✅ Exists | Ensure `errorDetails` populated |
| `GET /campaigns/{id}/funnel` | 7-stage funnel counts | ✅ Exists | None |
| `GET /campaigns/{id}/domains` | Paginated domain list with filters | ✅ Exists | Add `rejectionReason` filter |
| `GET /campaigns/{id}/domains/{domain}/score-breakdown` | Component scores | ✅ Exists | Return structured state |
| `POST /campaigns/{id}/phases/analysis/restart` | Re-run analysis only | 🆕 Needed | New endpoint |
| `GET /campaigns/{id}/lineage` | Discovery config, offset range | 🆕 Needed | New endpoint |
| `GET /campaigns/{id}/rejection-summary` | Aggregated rejection breakdown | 🆕 Needed | New endpoint |

### Schema: Rejection Summary

```yaml
GET /campaigns/{id}/rejection-summary
Response:
  qualified: 127
  rejected: 1834
  no_keyword: 2156
  error: 68
  timeout: 23
  _checksum: 4208  # Must equal analyzed count
```

### Schema: Lineage

```yaml
GET /campaigns/{id}/lineage
Response:
  configHash: "sha256:abc123..."
  offsetStart: 45000
  offsetEnd: 55542
  totalGenerated: 10542
  relatedCampaigns:
    - id: "uuid-1"
      name: "Prior SaaS Campaign"
      offsetRange: "0-45000"
      createdAt: "2024-12-20T..."
```

### Schema: Score Breakdown (Structured State)

**Never return 500. Always return structured state.**

```yaml
GET /campaigns/{id}/domains/{domain}/score-breakdown
Response:
  state: 'ok' | 'partial' | 'unavailable'
  reason: null | 'feature_vector_missing' | 'profile_not_found' | 'analysis_pending'
  domain: "example.com"
  final: 87.5  # null if unavailable
  components:
    density: { value: 0.85, state: 'ok' }
    coverage: { value: 0.72, state: 'ok' }
    non_parked: { value: 1.0, state: 'ok' }
    content_length: { value: 0.65, state: 'ok' }
    title_keyword: { value: null, state: 'unavailable', reason: 'field_missing' }
    freshness: { value: null, state: 'unavailable', reason: 'field_missing' }
  weights: { ... }
  parkedPenaltyFactor: 0.5
```

### High Potential Threshold

Backend-defined, not percentile. UI must not compute.

```yaml
# In stats response
highPotentialThreshold: 75.0
highPotentialCount: 89
```

---

## 7️⃣ SSE Reconnection Strategy

### Exponential Backoff

```typescript
const SSE_BACKOFF = {
  initial: 1000,      // 1s
  multiplier: 2,
  max: 30000,         // 30s cap
  jitter: 0.2,        // ±20% randomization
};

// Sequence: 1s → 2s → 4s → 8s → 16s → 30s → 30s → ...
```

### Reconnection Behavior

| State | UI Behavior |
|-------|-------------|
| Connected | Green dot, no banner |
| Disconnected (< 5s) | Silent retry |
| Disconnected (≥ 5s) | Show "Reconnecting..." banner |
| Reconnected | Force refetch of progress snapshot, clear banner |
| Failed (> 5 attempts) | Show "Connection lost. Refresh to continue." |

---

## 8️⃣ Export Rules

### Export Tiers

| Tier | Action | Contents |
|------|--------|----------|
| **Primary CTA** | "Export Leads" button | Qualified leads only |
| **Advanced Menu** | Dropdown with options | Rejected, No-keyword, Errors, Full dataset |

### Export Behavior

| Dataset Size | Behavior |
|--------------|----------|
| ≤ 10,000 rows | Synchronous download (CSV) |
| > 10,000 rows | Async job → email/download link |

### Bulk Actions (This Refactor)

| Action | Allowed |
|--------|---------|
| ✅ Bulk export (qualified leads) | Yes |
| ✅ Bulk export (rejected/no-keyword) | Yes |
| ❌ Bulk exclude | No (future) |
| ❌ Bulk rescore | No (future) |
| ❌ Bulk mutate domain state | No (future) |

---

## 9️⃣ Lead Exploration Model

### Lead Table Columns

| Column | Source | Sortable | Filterable |
|--------|--------|----------|------------|
| Domain | `domain` | ✅ | ✅ (search) |
| Score | `domainScore` | ✅ (default desc) | ✅ (range) |
| Keywords | `features.keywords.top3` | ✅ | ✅ (has/none) |
| Richness | `features.richness.score` | ✅ | ✅ (range) |
| Warnings | `warnings[]` | ✅ | ✅ (has/none) |
| Lead Status | `leadStatus` | ❌ | ✅ |
| Rejection Reason | `rejectionReason` | ❌ | ✅ |

### Filters (Inside Workspace, No Separate Page)

| Filter | Options |
|--------|---------|
| Status | All, Leads Only, Rejected, Errors |
| Score Range | 0-100 slider |
| Has Keywords | Yes/No/Any |
| Has Warnings | Yes/No/Any |
| Rejection Reason | low_score, no_keywords, parked, dns_error, http_error |

### Pagination

- **Default**: Cursor-based for infinite scroll
- **Jump-to-page**: Offset-based on demand
- **Design for 10k baseline, handle higher gracefully**

---

## 🔟 Transparency & Audit

### Audit Equation Display

```
┌────────────────────────────────────────────────┐
│  Domain Breakdown (analyzed: 4,208)            │
├────────────────────────────────────────────────┤
│  ✅ Qualified (leads)    127    (3.0%)         │
│  ⛔ Rejected (low score) 1,834  (43.6%)        │
│  🔇 No Keywords Found    2,156  (51.2%)        │
│  ❌ Errors               68     (1.6%)         │
│  ⏱️ Timeouts             23     (0.5%)         │
├────────────────────────────────────────────────┤
│  Σ = 4,208 ✓                                   │
└────────────────────────────────────────────────┘
```

**If sum ≠ analyzed, show warning.**

### Lineage Display

**Discovery offset is automatic, immutable, never user-overridable.**

```
┌────────────────────────────────────────────────┐
│  Discovery Lineage                             │
├────────────────────────────────────────────────┤
│  Config Hash: sha256:abc123...def              │
│  Offset Range: 45,000 → 55,542 (10,542 total)  │
│                                                │
│  Related Campaigns:                            │
│  • Prior SaaS Campaign (0 → 45,000)            │
│  • This Campaign (45,000 → 55,542)             │
└────────────────────────────────────────────────┘
```

**If lineage missing → refuse to render summaries, show error.**

---

## 1️⃣1️⃣ Failure & Degradation Strategy

### Principles

1. **Never hide errors** — if backend returns 4xx/5xx, show it
2. **Never fake data** — if endpoint fails, show "Unable to load" not zeros
3. **Never crash on breakdown** — always return structured state
4. **Graceful ≠ invisible** — reduced functionality is shown, not hidden

### Specific Scenarios

| Scenario | Required Behavior |
|----------|-------------------|
| `/score-breakdown` missing data | Return `state: 'unavailable'` with reason |
| SSE disconnects | Show banner, exponential backoff, force refresh on reconnect |
| `/stats` returns 500 | Show "Stats unavailable" placeholder with retry |
| Phase fails mid-execution | Red badge + inline error card with message |
| Audit equation violated | Warning banner: "⚠️ Counts don't match" |
| Lineage missing | Refuse to render summaries, show error |
| Scoring profile stale | Badge: "⚠️ Score may be outdated" |

---

## 1️⃣2️⃣ Component Disposition

### Current Components → Disposition

| Component | Decision | Justification |
|-----------|----------|---------------|
| `CampaignProgress.tsx` | 🔴 DELETE | Replaced by `PipelineTimeline` |
| `CampaignStatistics.tsx` | 🔴 DELETE | Replaced by `StickyStats` |
| `CampaignProgressMonitor.tsx` | 🟡 MERGE | SSE logic into `useCampaignSSE` |
| `DomainsList.tsx` | 🔴 DELETE | Replaced by `LeadTable` |
| `DomainStreamingTable.tsx` | 🟡 MERGE | Into `LeadTable` |
| `CampaignOverviewCard.tsx` | 🔴 DELETE | Replaced by `CampaignHeader` |
| `PhaseStepper.tsx` | 🔴 DELETE | Replaced by `PipelineTimeline` |
| `PhaseDashboard.tsx` | 🔴 DELETE | Placeholder logic removed |

### Refactor Components → Disposition

| Component | Decision | Justification |
|-----------|----------|---------------|
| `FunnelSnapshot.tsx` | 🟢 KEEP | Refactor to use stats endpoint |
| `AnalysisSummary.tsx` | 🟡 MERGE | Into `RejectionAudit` |
| `LeadResultsPanel.tsx` | 🟡 MERGE | Into `CommandCenter` |
| `PipelineTimeline.tsx` | 🟢 KEEP | Primary execution mode component |
| `DomainDetailDrawer.tsx` | 🟢 KEEP | Detail pane |
| `KpiGrid.tsx` | 🔴 DELETE | Replaced by `StickyStats` |
| `ExecutionHeader.tsx` | 🟡 MERGE | Into `CampaignHeader` |
| `CampaignCompletionBanner.tsx` | 🟡 MERGE | Into `VerdictBanner` |
| `CampaignKpiCard.tsx` | 🔴 DELETE | Duplicates KPIs |
| `WarningDistribution.tsx` | 🟢 KEEP | Useful for audit |
| `RecommendationPanel.tsx` | ⏸️ DEFER | Nice-to-have |
| `MoverList.tsx` | 🔴 DELETE | Not needed |
| `Histogram.tsx` | 🔴 DELETE | Not needed |
| `CohortComparisonPanel.tsx` | 🔴 DELETE | Not needed |

### Summary

| Decision | Count |
|----------|-------|
| 🟢 KEEP | 5 |
| 🟡 MERGE | 6 |
| 🔴 DELETE | 12 |
| ⏸️ DEFER | 1 |

**Net reduction: 12 components eliminated.**

---

## 1️⃣3️⃣ Phased Execution Plan

### Gating Rule

> ⚠️ **Frontend work is gated on Phase 0 completion.** No UI work begins until backend contracts are implemented and tested.

### Phase 0: Backend Contracts (1 week)

See [§1️⃣4️⃣ Phase 0 Tickets](#1️⃣4️⃣-phase-0-tickets-backend-contracts) for detailed breakdown.

### Phase 1: Skeleton & Keyboard (1.5 weeks)

| Task | Effort |
|------|--------|
| Create `useCampaignMode()` hook (backend-driven) | 1d |
| Create `useCampaignKeyboard()` hook | 2d |
| Create responsive layout skeleton | 2d |
| Create `CampaignHeader` component | 1d |
| Create `ContextRail` / `BottomBar` | 1.5d |
| Focus management for virtualized list | 1d |
| SSE exponential backoff + banner | 1d |

### Phase 2: Execution Mode (1.5 weeks)

| Task | Effort |
|------|--------|
| Create `PipelineTimeline` | 2d |
| Create `ActivePhaseCard` | 1.5d |
| Create `PhaseControls` | 1.5d |
| Wire SSE to new components | 1d |
| Create `PartialPreview` | 0.5d |
| Error prominence | 1d |
| Mobile execution layout | 1d |

### Phase 3: Results Mode - Core (2 weeks)

| Task | Effort |
|------|--------|
| Create `VerdictBanner` | 1d |
| Create `StickyStats` | 1.5d |
| Create `CommandCenter` layout | 2d |
| Create virtualized `LeadTable` | 3d |
| Implement filters | 2d |
| Create `DetailPane` | 2d |
| Cache invalidation on mode switch | 0.5d |
| Mobile stacked layout | 1d |

### Phase 4: Results Mode - Audit (1 week)

| Task | Effort |
|------|--------|
| Create `RejectionAudit` | 1.5d |
| Add rejection reason filter | 1d |
| Create `LineagePanel` | 1d |
| Audit equation validation | 0.5d |
| Stale score badges | 0.5d |
| Re-run Analysis button | 0.5d |

### Phase 5: Export & Actions (0.5 weeks)

| Task | Effort |
|------|--------|
| Create `ExportButton` | 1d |
| Create `ExportMenu` | 1d |
| Sync/async handling | 0.5d |

### Phase 6: Degradation & Polish (1 week)

| Task | Effort |
|------|--------|
| Degradation components | 1.5d |
| API call handlers | 1.5d |
| SSE disconnect banner | 0.5d |
| Dark mode audit | 0.5d |
| E2E failure testing | 1d |

### Phase 7: Cleanup & Deletion (1 week)

| Task | Effort |
|------|--------|
| Delete 12 components | 1d |
| Merge 6 components | 2d |
| Update imports | 1d |
| E2E test updates | 1.5d |
| Performance audit | 0.5d |

**Total: 9.5 weeks**

---

## 1️⃣4️⃣ Phase 0 Tickets (Backend Contracts)

### Execution Order

```
P0-1 (Schema) → P0-2 (Schema) → P0-3 (Migration) → P0-4 (Endpoint) → P0-5 (Endpoint) → P0-6 (Endpoint) → P0-7 (Endpoint) → P0-8 (Endpoint)
```

---

### P0-1: Schema — Add rejection_reason Column

**Type**: Database Schema  
**Priority**: P0 (Blocking)  
**Estimated Effort**: 0.5d  
**Depends On**: None

**Description**:
Add `rejection_reason` column to `generated_domains` table to track why each domain was excluded from leads.

**⚠️ Type-Safety Requirements** (see §1A below):
- Backend enum is the source of truth
- All API filters use strong `DomainRejectionReasonEnum` type, not strings
- Frontend consumes auto-generated types from OpenAPI
- Column is NOT NULL after backfill

**Enum Values** (9 total, NO legacy/timeout):
| Value | Description |
|-------|-------------|
| `qualified` | Not rejected, became a lead |
| `low_score` | Keywords found but score below threshold |
| `no_keywords` | HTTP OK but no keyword matches found |
| `parked` | Domain is parked/placeholder |
| `dns_error` | DNS validation returned error |
| `dns_timeout` | DNS validation timed out |
| `http_error` | HTTP validation returned error |
| `http_timeout` | HTTP validation timed out |
| `pending` | Validation not yet complete |

**Migration SQL**:
```sql
-- Migration: 000072_add_rejection_reason.up.sql

-- Step 1: Create enum (NO legacy, split timeouts)
CREATE TYPE public.domain_rejection_reason_enum AS ENUM (
    'qualified',
    'low_score',
    'no_keywords',
    'parked',
    'dns_error',
    'dns_timeout',
    'http_error',
    'http_timeout',
    'pending'
);

-- Step 2: Add column (initially nullable for backfill)
ALTER TABLE public.generated_domains 
ADD COLUMN rejection_reason public.domain_rejection_reason_enum;

-- Step 3: Create composite index
CREATE INDEX idx_generated_domains_rejection_reason 
ON public.generated_domains(campaign_id, rejection_reason);

-- Step 4: Backfill deterministically (order matters!)
UPDATE public.generated_domains SET rejection_reason = 
  CASE
    -- 1. Qualified leads
    WHEN lead_status = 'match' THEN 'qualified'::domain_rejection_reason_enum
    -- 2. DNS timeout (specific)
    WHEN dns_status = 'timeout' THEN 'dns_timeout'::domain_rejection_reason_enum
    -- 3. DNS error
    WHEN dns_status = 'error' THEN 'dns_error'::domain_rejection_reason_enum
    -- 4. HTTP timeout (specific)
    WHEN http_status = 'timeout' THEN 'http_timeout'::domain_rejection_reason_enum
    -- 5. HTTP error
    WHEN http_status = 'error' THEN 'http_error'::domain_rejection_reason_enum
    -- 6. Parked
    WHEN is_parked = true AND http_status = 'ok' THEN 'parked'::domain_rejection_reason_enum
    -- 7. Low score (has keywords but below threshold) - BEFORE no_keywords!
    WHEN lead_status = 'no_match' AND http_status = 'ok' 
         AND http_keywords IS NOT NULL AND http_keywords != '' 
         AND lead_score < 50 
    THEN 'low_score'::domain_rejection_reason_enum
    -- 8. No keywords
    WHEN lead_status = 'no_match' AND http_status = 'ok'
         AND (http_keywords IS NULL OR http_keywords = '')
    THEN 'no_keywords'::domain_rejection_reason_enum
    -- 9. Pending (still processing)
    ELSE 'pending'::domain_rejection_reason_enum
  END
WHERE rejection_reason IS NULL;

-- Step 5: Enforce NOT NULL after backfill
ALTER TABLE public.generated_domains
ALTER COLUMN rejection_reason SET NOT NULL;

-- Step 6: Partial indexes for common queries
CREATE INDEX idx_generated_domains_qualified 
ON public.generated_domains(campaign_id) WHERE rejection_reason = 'qualified';

CREATE INDEX idx_generated_domains_pending 
ON public.generated_domains(campaign_id, created_at) WHERE rejection_reason = 'pending';

ANALYZE public.generated_domains;
```

**Down Migration**:
```sql
-- Migration: 000072_add_rejection_reason.down.sql
DROP INDEX IF EXISTS public.idx_generated_domains_pending;
DROP INDEX IF EXISTS public.idx_generated_domains_qualified;
DROP INDEX IF EXISTS public.idx_generated_domains_rejection_reason;
ALTER TABLE public.generated_domains DROP COLUMN IF EXISTS rejection_reason;
DROP TYPE IF EXISTS public.domain_rejection_reason_enum;
```

**Acceptance Criteria**:
- [ ] Migration applies without errors
- [ ] Existing data is backfilled correctly (0 NULL values)
- [ ] Column is NOT NULL
- [ ] All indexes created
- [ ] Down migration works cleanly
- [ ] Backend uses strong enum types in filters (not strings)
- [ ] Tests pass

---

### P0-2: Schema — Add completeness Field to Stats

**Type**: Database Schema / Response Schema  
**Priority**: P0 (Blocking)  
**Estimated Effort**: 0.5d  
**Depends On**: None

**Description**:
Add `completeness` field to campaign stats to indicate whether campaign has finished processing.

**Schema Changes**:

Add to `campaign_states` table or compute in stats query:
```sql
-- Option 1: Computed view (preferred)
CREATE OR REPLACE VIEW campaign_stats_v2 AS
SELECT 
  c.id as campaign_id,
  -- existing fields...
  CASE
    WHEN c.status IN ('completed', 'failed', 'cancelled') 
      AND NOT EXISTS (
        SELECT 1 FROM campaign_phases cp 
        WHERE cp.campaign_id = c.id 
        AND cp.status = 'in_progress'
      )
    THEN 'complete'
    WHEN c.status = 'running' OR EXISTS (
        SELECT 1 FROM campaign_phases cp 
        WHERE cp.campaign_id = c.id 
        AND cp.status = 'in_progress'
      )
    THEN 'partial'
    ELSE 'pending'
  END as completeness
FROM lead_generation_campaigns c;
```

**API Response Update**:
```go
type CampaignStatsResponse struct {
    // existing fields...
    Completeness string `json:"completeness"` // 'complete' | 'partial' | 'pending'
}
```

**Acceptance Criteria**:
- [ ] Stats endpoint returns `completeness` field
- [ ] Value is 'complete' only when campaign is done and no phases running
- [ ] Value is 'partial' when campaign is running
- [ ] Value is 'pending' when campaign is draft

---

### P0-3: Migration — Populate rejection_reason in Pipelines

**Type**: Backend Logic  
**Priority**: P0 (Blocking)  
**Estimated Effort**: 1.5d  
**Depends On**: P0-1

**Description**:
Update validation and analysis phase handlers to populate `rejection_reason` when excluding domains.

**Files to Modify**:
- `backend/internal/domain/services/dns_validator.go`
- `backend/internal/domain/services/http_validator.go`
- `backend/internal/domain/services/analysis_service.go`
- `backend/internal/domain/services/extraction_service.go`

**Logic**:

```go
// In DNS validation failure handler
func (s *DNSValidator) handleFailure(ctx context.Context, domain *Domain, err error) {
    domain.DNSStatus = "error"
    domain.DNSReason = err.Error()
    domain.RejectionReason = "dns_error" // NEW
    s.store.UpdateDomain(ctx, domain)
}

// In HTTP validation failure handler
func (s *HTTPValidator) handleFailure(ctx context.Context, domain *Domain, err error) {
    domain.HTTPStatus = "error"
    domain.HTTPReason = err.Error()
    domain.RejectionReason = "http_error" // NEW
    s.store.UpdateDomain(ctx, domain)
}

// In analysis scoring handler
func (s *AnalysisService) scoreDomain(ctx context.Context, domain *Domain, score float64) {
    domain.DomainScore = score
    if score < s.profile.HighPotentialThreshold {
        domain.RejectionReason = "low_score" // NEW
    } else {
        domain.RejectionReason = "qualified" // NEW
    }
    s.store.UpdateDomain(ctx, domain)
}

// In keyword extraction handler
func (s *ExtractionService) handleNoKeywords(ctx context.Context, domain *Domain) {
    domain.LeadStatus = "no_match"
    domain.RejectionReason = "no_keywords" // NEW
    s.store.UpdateDomain(ctx, domain)
}

// In parked domain detection
func (s *AnalysisService) handleParkedDomain(ctx context.Context, domain *Domain) {
    domain.IsParked = true
    domain.RejectionReason = "parked" // NEW
    s.store.UpdateDomain(ctx, domain)
}
```

**Acceptance Criteria**:
- [ ] DNS errors set `rejection_reason = 'dns_error'`
- [ ] HTTP errors set `rejection_reason = 'http_error'`
- [ ] No keywords set `rejection_reason = 'no_keywords'`
- [ ] Low score set `rejection_reason = 'low_score'`
- [ ] Parked set `rejection_reason = 'parked'`
- [ ] Qualified leads set `rejection_reason = 'qualified'`
- [ ] Tests validate all paths

---

### P0-4: Endpoint — GET /campaigns/{id}/rejection-summary

**Type**: New Endpoint  
**Priority**: P0 (Blocking)  
**Estimated Effort**: 1d  
**Depends On**: P0-1, P0-3

**Description**:
Create endpoint that returns aggregated rejection breakdown for a campaign.

**OpenAPI Spec Addition**:
```yaml
/campaigns/{campaignId}/rejection-summary:
  get:
    operationId: campaigns_rejection_summary
    summary: Get rejection breakdown for campaign
    parameters:
      - $ref: '../parameters/all.yaml#/CampaignIdPath'
    responses:
      '200':
        description: Rejection summary
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RejectionSummaryResponse'

RejectionSummaryResponse:
  type: object
  required: [qualified, rejected, noKeyword, error, timeout, analyzed]
  properties:
    qualified:
      type: integer
      description: Domains that became leads
    rejected:
      type: integer
      description: Domains rejected due to low score
    noKeyword:
      type: integer
      description: Domains with no keyword matches
    error:
      type: integer
      description: Domains with DNS/HTTP errors
    timeout:
      type: integer
      description: Domains that timed out
    analyzed:
      type: integer
      description: Total domains analyzed (must equal sum of above)
    _valid:
      type: boolean
      description: True if sum equals analyzed
```

**Handler Implementation**:
```go
func (h *strictHandlers) CampaignsRejectionSummary(
    ctx context.Context, 
    r gen.CampaignsRejectionSummaryRequestObject,
) (gen.CampaignsRejectionSummaryResponseObject, error) {
    
    campaignID := uuid.UUID(r.CampaignId)
    
    query := `
        SELECT 
            COUNT(*) FILTER (WHERE rejection_reason = 'qualified') as qualified,
            COUNT(*) FILTER (WHERE rejection_reason = 'low_score') as rejected,
            COUNT(*) FILTER (WHERE rejection_reason = 'no_keywords') as no_keyword,
            COUNT(*) FILTER (WHERE rejection_reason IN ('dns_error', 'http_error')) as error,
            COUNT(*) FILTER (WHERE rejection_reason = 'timeout') as timeout,
            COUNT(*) FILTER (WHERE rejection_reason IS NOT NULL) as analyzed
        FROM generated_domains
        WHERE campaign_id = $1
    `
    
    var result RejectionSummary
    err := h.deps.DB.QueryRow(ctx, query, campaignID).Scan(
        &result.Qualified,
        &result.Rejected,
        &result.NoKeyword,
        &result.Error,
        &result.Timeout,
        &result.Analyzed,
    )
    if err != nil {
        return gen.CampaignsRejectionSummary500JSONResponse{...}, nil
    }
    
    sum := result.Qualified + result.Rejected + result.NoKeyword + result.Error + result.Timeout
    result.Valid = (sum == result.Analyzed)
    
    return gen.CampaignsRejectionSummary200JSONResponse(result), nil
}
```

**Acceptance Criteria**:
- [ ] Endpoint returns correct counts per rejection reason
- [ ] `_valid` is true when sum equals analyzed
- [ ] Returns 404 for non-existent campaign
- [ ] Query is optimized with index scan

---

### P0-5: Endpoint — GET /campaigns/{id}/lineage

**Type**: New Endpoint  
**Priority**: P0 (Blocking)  
**Estimated Effort**: 1d  
**Depends On**: None

**Description**:
Create endpoint that returns discovery lineage information.

**OpenAPI Spec Addition**:
```yaml
/campaigns/{campaignId}/lineage:
  get:
    operationId: campaigns_lineage
    summary: Get discovery lineage for campaign
    responses:
      '200':
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CampaignLineageResponse'

CampaignLineageResponse:
  type: object
  required: [configHash, offsetStart, offsetEnd, totalGenerated]
  properties:
    configHash:
      type: string
      description: SHA-256 hash of discovery configuration
    offsetStart:
      type: integer
      format: int64
    offsetEnd:
      type: integer
      format: int64
    totalGenerated:
      type: integer
    relatedCampaigns:
      type: array
      items:
        type: object
        properties:
          id:
            type: string
            format: uuid
          name:
            type: string
          offsetRange:
            type: string
          createdAt:
            type: string
            format: date-time
```

**Handler Implementation**:
```go
func (h *strictHandlers) CampaignsLineage(
    ctx context.Context,
    r gen.CampaignsLineageRequestObject,
) (gen.CampaignsLineageResponseObject, error) {
    
    campaignID := uuid.UUID(r.CampaignId)
    
    // Get current campaign's lineage
    campaign, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, campaignID)
    if err != nil {
        return gen.CampaignsLineage404JSONResponse{...}, nil
    }
    
    if campaign.DiscoveryConfigHash == "" {
        return gen.CampaignsLineage404JSONResponse{
            Message: "Lineage not available for this campaign",
        }, nil
    }
    
    // Get related campaigns with same config hash
    related, err := h.deps.Stores.Campaign.GetCampaignsByConfigHash(
        ctx, h.deps.DB, campaign.DiscoveryConfigHash,
    )
    
    return gen.CampaignsLineage200JSONResponse{
        ConfigHash:       campaign.DiscoveryConfigHash,
        OffsetStart:      campaign.DiscoveryOffsetStart,
        OffsetEnd:        campaign.DiscoveryOffsetEnd,
        TotalGenerated:   campaign.DiscoveryOffsetEnd - campaign.DiscoveryOffsetStart,
        RelatedCampaigns: mapRelatedCampaigns(related),
    }, nil
}
```

**Acceptance Criteria**:
- [ ] Returns config hash, offset range, total
- [ ] Returns related campaigns with same config hash
- [ ] Returns 404 with message if lineage unavailable
- [ ] Does not expose internal IDs

---

### P0-6: Endpoint — Refactor Score Breakdown Response

**Type**: Endpoint Modification  
**Priority**: P0 (Blocking)  
**Estimated Effort**: 1d  
**Depends On**: None

**Description**:
Modify `/campaigns/{id}/domains/{domain}/score-breakdown` to return structured state instead of zeros on error.

**Changes to Existing Handler**:
```go
func (h *strictHandlers) CampaignsDomainScoreBreakdown(
    ctx context.Context,
    r gen.CampaignsDomainScoreBreakdownRequestObject,
) (gen.CampaignsDomainScoreBreakdownResponseObject, error) {
    
    // ... existing validation ...
    
    breakdown, err := h.deps.Orchestrator.ScoreBreakdown(ctx, campaignID, domain)
    if err != nil {
        // CHANGED: Return structured unavailable state instead of zeros
        if strings.Contains(err.Error(), "no rows") {
            return gen.CampaignsDomainScoreBreakdown200JSONResponse{
                State:  "unavailable",
                Reason: ptr("domain_not_found"),
                Domain: domain,
            }, nil
        }
        if strings.Contains(err.Error(), "feature_vector") {
            return gen.CampaignsDomainScoreBreakdown200JSONResponse{
                State:  "unavailable", 
                Reason: ptr("feature_vector_missing"),
                Domain: domain,
            }, nil
        }
        return gen.CampaignsDomainScoreBreakdown200JSONResponse{
            State:  "unavailable",
            Reason: ptr("analysis_pending"),
            Domain: domain,
        }, nil
    }
    
    // Build component-level states
    components := buildComponentStates(breakdown)
    
    // Determine overall state
    state := "ok"
    for _, c := range components {
        if c.State == "unavailable" {
            state = "partial"
            break
        }
    }
    
    return gen.CampaignsDomainScoreBreakdown200JSONResponse{
        State:      state,
        Domain:     domain,
        Final:      breakdown["final"] * 100,
        Components: components,
        Weights:    getWeights(),
    }, nil
}
```

**Schema Update**:
```yaml
DomainScoreBreakdownResponse:
  type: object
  required: [state, domain]
  properties:
    state:
      type: string
      enum: [ok, partial, unavailable]
    reason:
      type: string
      nullable: true
    domain:
      type: string
    final:
      type: number
      nullable: true
    components:
      type: object
      additionalProperties:
        type: object
        properties:
          value:
            type: number
            nullable: true
          state:
            type: string
            enum: [ok, unavailable]
          reason:
            type: string
            nullable: true
```

**Acceptance Criteria**:
- [ ] Never returns 500 for breakdown requests
- [ ] Returns `state: 'unavailable'` with reason when data missing
- [ ] Returns `state: 'partial'` when some components missing
- [ ] Returns `state: 'ok'` with full breakdown when available
- [ ] Component-level states match overall state

---

### P0-7: Endpoint — POST /campaigns/{id}/phases/analysis/restart

**Type**: New Endpoint  
**Priority**: P0 (Blocking)  
**Estimated Effort**: 0.5d  
**Depends On**: None

**Description**:
Create endpoint to restart analysis phase only (re-score without re-running discovery/validation).

**OpenAPI Spec Addition**:
```yaml
/campaigns/{campaignId}/phases/analysis/restart:
  post:
    operationId: campaigns_analysis_restart
    summary: Re-run analysis phase only
    description: |
      Restarts the analysis phase without affecting discovery, DNS, HTTP, or keyword data.
      Uses existing analyzed domains with updated scoring profile.
    responses:
      '200':
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                affectedDomains:
                  type: integer
                estimatedDuration:
                  type: string
```

**Handler Implementation**:
```go
func (h *strictHandlers) CampaignsAnalysisRestart(
    ctx context.Context,
    r gen.CampaignsAnalysisRestartRequestObject,
) (gen.CampaignsAnalysisRestartResponseObject, error) {
    
    campaignID := uuid.UUID(r.CampaignId)
    
    // Count domains that will be re-scored
    count, err := h.deps.Stores.Domain.CountAnalyzedDomains(ctx, h.deps.DB, campaignID)
    if err != nil {
        return gen.CampaignsAnalysisRestart500JSONResponse{...}, nil
    }
    
    // Reset analysis phase status
    err = h.deps.Orchestrator.ResetPhase(ctx, campaignID, "analysis")
    if err != nil {
        return gen.CampaignsAnalysisRestart500JSONResponse{...}, nil
    }
    
    // Queue analysis job
    err = h.deps.Orchestrator.QueuePhase(ctx, campaignID, "analysis")
    if err != nil {
        return gen.CampaignsAnalysisRestart500JSONResponse{...}, nil
    }
    
    return gen.CampaignsAnalysisRestart200JSONResponse{
        Message:          "Analysis phase restarted",
        AffectedDomains:  count,
        EstimatedDuration: estimateDuration(count),
    }, nil
}
```

**Acceptance Criteria**:
- [ ] Resets only analysis phase, not earlier phases
- [ ] Does not touch discovery/DNS/HTTP/keyword data
- [ ] Returns count of affected domains
- [ ] Queues analysis job correctly
- [ ] Returns 409 if campaign is not in valid state

---

### P0-8: Endpoint — Add rejectionReason Filter to Domains List

**Type**: Endpoint Modification  
**Priority**: P0 (Blocking)  
**Estimated Effort**: 0.5d  
**Depends On**: P0-1

**Description**:
Add `rejectionReason` query parameter to `/campaigns/{id}/domains` endpoint.

**OpenAPI Spec Update**:
```yaml
# In parameters
RejectionReasonFilter:
  name: rejectionReason
  in: query
  description: Filter by rejection reason
  schema:
    type: string
    enum: [qualified, low_score, no_keywords, dns_error, http_error, parked, timeout]

# In domains list endpoint
parameters:
  - $ref: '../parameters/all.yaml#/RejectionReasonFilter'
```

**Handler Update**:
```go
func (h *strictHandlers) CampaignsDomainsList(
    ctx context.Context,
    r gen.CampaignsDomainsListRequestObject,
) (gen.CampaignsDomainsListResponseObject, error) {
    
    // ... existing code ...
    
    // Add rejection reason filter
    if r.Params.RejectionReason != nil {
        filters.RejectionReason = *r.Params.RejectionReason
    }
    
    // ... rest of handler ...
}
```

**Acceptance Criteria**:
- [ ] Filter parameter works correctly
- [ ] Returns only domains with matching rejection reason
- [ ] Works with pagination
- [ ] Works with other filters (AND logic)

---

### Phase 0 Completion Gate

**All tickets must pass before Phase 1 begins.**

| Ticket | Status | Reviewer | Merged |
|--------|--------|----------|--------|
| P0-1: Schema - rejection_reason | ⬜ Pending | | |
| P0-2: Schema - completeness | ⬜ Pending | | |
| P0-3: Migration - populate rejection_reason | ⬜ Pending | | |
| P0-4: Endpoint - rejection-summary | ⬜ Pending | | |
| P0-5: Endpoint - lineage | ⬜ Pending | | |
| P0-6: Endpoint - score-breakdown refactor | ⬜ Pending | | |
| P0-7: Endpoint - analysis/restart | ⬜ Pending | | |
| P0-8: Endpoint - rejectionReason filter | ⬜ Pending | | |

**Gate Review**: After all P0 tickets merged, team review against acceptance criteria before Phase 1.

---

## 1️⃣5️⃣ Acceptance Criteria

> ⚠️ Review at the end of each phase against these criteria.

### Phase 0 Criteria (Backend)

- [ ] `rejection_reason` column exists and is populated
- [ ] `/rejection-summary` endpoint returns valid equation
- [ ] `/lineage` endpoint returns config hash and offsets
- [ ] `/score-breakdown` never returns 500
- [ ] `/domains?rejectionReason=` filter works
- [ ] `completeness` field in stats response
- [ ] Analysis restart endpoint works

### Phase 1 Criteria (Skeleton)

- [ ] Mode detection works from backend state
- [ ] Keyboard navigation (j/k/Enter/Esc) works
- [ ] Layout responsive on mobile/tablet
- [ ] SSE reconnection with backoff works
- [ ] Focus management works with virtualization

### Phase 2 Criteria (Execution Mode)

- [ ] Phase timeline shows all 5 phases with status, timing
- [ ] Active phase displays live SSE progress
- [ ] Errors display inline, not hidden
- [ ] Partial leads preview shows with PARTIAL badge
- [ ] Pause/Resume/Stop controls work
- [ ] Mobile layout is usable

### Phase 3 Criteria (Results Mode Core)

- [ ] Verdict banner displays immediately
- [ ] Stats come from authoritative endpoint
- [ ] Funnel shows all 7 stages
- [ ] Lead table is virtualized (10k+ rows)
- [ ] Keyboard navigation works
- [ ] Detail pane shows score breakdown
- [ ] Cache invalidates on mode switch
- [ ] Mobile tap-to-detail works

### Phase 4 Criteria (Audit)

- [ ] Rejection audit displays equation
- [ ] Audit equation validation warns on mismatch
- [ ] Rejection filter works in table
- [ ] Lineage displays when available
- [ ] Re-run Analysis button works

### Phase 5 Criteria (Export)

- [ ] Primary export (leads CSV) works
- [ ] Advanced export menu works
- [ ] Sync/async handling works

### Phase 6 Criteria (Degradation)

- [ ] No 500s crash UI
- [ ] Score breakdown shows structured state
- [ ] SSE disconnect shows banner
- [ ] Missing data shows placeholder
- [ ] Dark mode works

### Phase 7 Criteria (Cleanup)

- [ ] 12 deprecated components deleted
- [ ] No duplicate components remain
- [ ] Bundle size reduced ≥10%
- [ ] E2E tests pass

---

## 1️⃣6️⃣ Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SSE latency under load | Medium | High | Batch events; debounce updates |
| Virtualized table + keyboard conflict | Medium | Medium | Test focus management extensively |
| Mobile layout performance | Low | Medium | Profile on real iOS devices |
| Score breakdown change breaks clients | Medium | High | Version API; feature flag |
| Rejection backfill for old data | Medium | Low | Use deterministic mapping to `pending` for unmappable rows |

---

## 1️⃣7️⃣ Directive Traceability

| Directive | Section | Status |
|-----------|---------|--------|
| A) Platform Support | §4 | ✅ Incorporated |
| B) Dark Mode | §4 | ✅ Incorporated |
| C) Keyboard Navigation | §5 | ✅ Incorporated |
| D) Bulk Actions | §8 | ✅ Incorporated |
| E) Cache on Mode Switch | §2 | ✅ Incorporated |
| F) SSE Backoff | §7 | ✅ Incorporated |
| G) Export Rules | §8 | ✅ Incorporated |
| H) High Potential | §6 | ✅ Incorporated |
| I) Re-Scoring | §6 | ✅ Incorporated |
| J) Campaign Size | §9 | ✅ Incorporated |
| K) Discovery Offset | §6, §10 | ✅ Incorporated |
| L) Mode Determination | §2 | ✅ Incorporated |
| M) Keyword View | §9 | ✅ Incorporated |
| N) Audit Equation | §10 | ✅ Incorporated |
| O) Score Breakdown | §6, §11 | ✅ Incorporated |
| P) Stats > Pipeline | §1 | ✅ Incorporated |
| Q) Ruthless Deletion | §12 | ✅ Incorporated |
| R) Execution vs Results | §2, §3 | ✅ Incorporated |

---

## 1️⃣8️⃣ Future Polish (Out of Scope)

These items are logged for future work. **Do not delay for these.**

| Item | Description | Priority |
|------|-------------|----------|
| **Phase timeline density** | In execution mode, ensure timeline stays compact for long runs (20+ phases). Consider accordion or progressive disclosure for very long campaigns. | Low |
| **Verdict language tuning** | Keep copy focused on value delta, not just counts. E.g., "127 leads (1.2% conversion)" vs just "127 leads from 10,542 domains". Consider A/B testing copy. | Low |
| **Saved views** | Power users will want saved filter/sort configurations. E.g., "My Lead Review" view with score > 80, no warnings. Out of scope for this refactor. | Medium (future) |
| **Bulk mutate actions** | Bulk exclude, bulk rescore, bulk state changes. Deferred to future phase. | Medium (future) |
| **Advanced keyboard shortcuts** | Vim-style extended navigation, command palette. | Low |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-27 | Engineering | Initial plan |
| 1.1 | 2024-12-27 | Engineering | Revisions 1-7, elite features |
| 2.0 | 2024-12-27 | Engineering | **Source of Truth**: Incorporated directives A-R, added Phase 0 tickets, execution order, gating rules |

---

**🔒 END OF SOURCE OF TRUTH**

> This plan (v2.0) is the source of truth for the Campaign Results refactor. Any deviation must be reviewed against it.
