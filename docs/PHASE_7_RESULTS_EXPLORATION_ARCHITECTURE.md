# Phase 7: Results Exploration & Domain Intelligence

## Architecture Design Document

**Author**: Copilot  
**Date**: 2025-01-21  
**Updated**: 2025-12-22  
**Status**: APPROVED — contracts locked, awaiting backend confirmation  
**Scope**: Domain exploration UI, filtering, drill-down, and lead intelligence workflows

---

## 0. Backend Dependency Status Report

### Score Breakdown Endpoint

**Status**: 🔴 BLOCKING  
**Endpoint**: `GET /campaigns/{campaignId}/domains/{domain}/score-breakdown`  
**Current State**: Handler exists at `handlers_strict_types.go:25` but returns 500 with message "score breakdown service not yet implemented"

**Backend Infrastructure Available**:
- `AdvancedScoringService` exists at `internal/domain/services/advanced_scoring_service.go`
- `ScoringProfile` struct has all required fields: `OverallScore`, `KeywordRelevance`, `ContentQuality`, `ComponentBreakdown`, etc.
- `ComputeAdvancedScore()` method computes comprehensive scores
- Feature flag: `IsAnalysisRescoringEnabled()` gates the service

**Required Work**:
1. Wire `AdvancedScoringService.ComputeAdvancedScore()` to the handler
2. Map `ScoringProfile` → `DomainScoreBreakdownResponse` API schema
3. Enable feature flag or remove gate for Phase 7

**Ownership**: Backend team — needs explicit timeline commitment  
**Estimate**: 1-2 days (infrastructure exists, just wiring needed)

### Advanced Filters Flag

**Status**: 🟡 MEDIUM PRIORITY  
**Flag**: `ENABLE_ADVANCED_FILTERS` environment variable  
**Current State**: Gates `minScore`, `notParked`, `hasContact`, `keyword`, cursor pagination

**Recommendation**: Remove flag entirely OR enable by default for Phase 7  
**Ownership**: Backend team (trivial change)  
**Estimate**: < 1 hour

### Domain Exclusion Mutation

**Status**: 🟠 NEEDS DESIGN DECISION  
**Options**:
1. **Soft exclude**: Add `excluded_at` timestamp column, filter in queries
2. **Status flag**: Add `excluded` to `domain_lead_status_enum`
3. **Hard delete**: DELETE from `generated_domains` (loses audit trail)

**Recommendation**: Option 1 (soft exclude with timestamp) — preserves data, enables "restore" later  
**Ownership**: Backend team + Product decision  
**Estimate**: 2-3 days including migration

### Summary Table

| Dependency | Status | Owner | Blocking? | Estimate |
|------------|--------|-------|-----------|----------|
| Score Breakdown | 🔴 | Backend | YES - blocks drawer | 1-2 days |
| Filters Flag | 🟡 | Backend | No - can fallback | < 1 hour |
| Domain Exclusion | 🟠 | Backend + Product | No - batch actions can wait | 2-3 days |

---

## 1. Executive Summary

Phase 7 reimagines how users inspect, filter, and reason about campaign results. Current UX spreads domain data across `DomainsList`, `LeadResultsPanel`, and isolated utility components (`RichnessBadge`, `TopKeywordsList`, `MicrocrawlGainChip`). This phase unifies results exploration into a cohesive, scalable pattern that handles 100k+ domains without degrading UX.

### Design Principles (Locked)
- **Noise → Signal**: Default views surface only high-value domains
- **Progressive Disclosure**: Summary → Grid → Drawer → Raw
- **Scalable by default**: 100k+ domains without UI choke
- **Campaign-centric**: Results belong to campaigns, not isolated tables
- **Action-oriented**: Every view answers "What should I do with this?"

---

## 2. Current State Analysis

### 2.1 Existing Components

| Component | Location | Purpose | Pain Points |
|-----------|----------|---------|-------------|
| `DomainsList` | `src/components/campaigns/DomainsList.tsx` | Full domain table with pagination, sorting, warnings filter | 361 lines, complex state, mixes view + control, client-side sorting fallback, virtualization at 2000 rows |
| `LeadResultsPanel` | `src/components/refactor/campaign/LeadResultsPanel.tsx` | Lead-focused summary with status aggregates | 347 lines, hardcoded row limit (8), no drill-down capability, limited filtering |
| `RichnessBadge` | `src/components/domains/RichnessBadge.tsx` | Score badge with modal breakdown | Opens modal but no navigation context |
| `RichnessBreakdownModal` | `src/components/domains/RichnessBreakdownModal.tsx` | Detailed richness metrics | Modal-only, no drawer integration, isolated from domain list |
| `TopKeywordsList` | `src/components/domains/TopKeywordsList.tsx` | Top 3 keywords tooltip | Read-only, no filtering action |
| `MicrocrawlGainChip` | `src/components/domains/MicrocrawlGainChip.tsx` | Microcrawl gain ratio display | No drill-down or action |

### 2.2 Data Models

**API Models (auto-generated from OpenAPI)**:
- `DomainListItem` — core domain with status, features, scores
- `DomainAnalysisFeatures` — nested richness, keywords, microcrawl
- `DomainAnalysisFeaturesRichness` — score, penalties, norms
- `DomainAnalysisFeaturesKeywords` — unique_count, hits_total, top3
- `CampaignDomainsListResponse` — paginated response with aggregates
- `DomainScoreBreakdownResponse` — detailed scoring components (NOT YET IMPLEMENTED in backend)

**Frontend Types**:
- `DomainRow` extends `DomainListItem` — UI display type
- `DomainFull` extends `DomainListItem` — detailed view type
- `DomainWarning` — { key, label, title } for warnings display
- `DomainAggregates` extends API aggregates

### 2.3 Identified Pain Points

1. **Component Sprawl**: Domain display logic split across 6+ components with no shared context
2. **Dual Pagination**: `DomainsList` uses `usePaginatedDomains`, `LeadResultsPanel` receives props externally
3. **No Domain Detail Surface**: No drawer/page for single-domain deep dive
4. **Client Sorting Overhead**: Default client-side sort on potentially large datasets
5. **Export Gap**: No domain-specific export (only snapshot CSV exists)
6. **Filtering UX Fragmented**: Warnings filter in table header, status filters in URL, no combined filter panel
7. **Score Breakdown Dead End**: API endpoint defined but not wired to UI
8. **No Keyword-Centric View**: Can't explore "all domains matching keyword X"
9. **No Batch Actions**: No select + action pattern for domain sets
10. **SSE Integration Incomplete**: Domain events trigger refresh but no optimistic updates

---

## 3. Proposed Architecture

### 3.1 Component Hierarchy

```
ResultsExplorer/
├── ResultsOverview.tsx          # Campaign-level summary (replaces LeadResultsPanel header)
├── DomainFilters.tsx            # Unified filter bar (status, score, warnings, keywords)
├── DomainDataGrid.tsx           # Primary list with virtualization + infinite scroll
├── DomainDetailDrawer.tsx       # Right drawer for single-domain deep dive
├── DomainScoreBreakdown.tsx     # Score breakdown visualization (from drawer)
├── DomainKeywordsPanel.tsx      # Keyword distribution + filtering actions
├── DomainContactsPanel.tsx      # Contact signals extraction display
├── DomainActionsBar.tsx         # Batch actions (export, exclude, tag)
├── ExportDomainsDialog.tsx      # Export configuration modal
└── hooks/
    ├── useDomainsExplorer.ts    # Unified state management
    ├── useDomainFilters.ts      # Filter state + URL sync
    ├── useDomainSelection.ts    # Multi-select state
    └── useDomainExport.ts       # Export generation + download
```

### 3.2 Data Ownership Model

**Single Source of Truth**: `useDomainsExplorer` hook orchestrates all domain data

No secondary local states. No hidden derivations. This mirrors what we did with `controlPhase` for execution.

### 3.3 Smart Defaults

**Default View Configuration**:
- Sort: `richness DESC` (surface highest signal first)
- Filter: `dnsStatus=ok, httpStatus=ok` (hide failed/pending noise)
- Page size: 50 (balance between load time and scroll)
- Auto-collapse low-score domains (< 0.3) into summary count

**Progressive Disclosure Layers**:
1. **Summary**: Aggregate counts + high-potential sample (current LeadResultsPanel concept)
2. **Grid**: Full list with inline metrics, click-to-expand row
3. **Drawer**: Complete domain analysis, score breakdown, keywords, contacts
4. **Raw**: JSON dump for power users (existing in RichnessBreakdownModal)

### 3.4 Scalability Strategy

**For 100k+ domains**:
1. **Server-side pagination**: Always use backend pagination (no infinite client accumulation)
2. **Server-side sorting**: Enable `sort` param, set `X-Domains-Sort-Version` header
3. **Server-side filtering**: Push all filters to backend params
4. **Virtualized rendering**: Use `react-window` for visible rows only
5. **Aggregates from counters**: Use `campaign_domain_counters` table for totals (O(1) vs O(n))
6. **Cursor pagination**: Switch to `first`/`after` for consistent paging under concurrent writes

---

## 4. Component Specifications

### 4.1 ResultsOverview

**Purpose**: Campaign-level intelligence summary replacing LeadResultsPanel header

**Data**: 
- Aggregates from `getCampaignDomains` response
- Funnel data from `getCampaignFunnel`
- Classifications from `getCampaignClassifications`

**UI Elements**:
- Status distribution bar (DNS/HTTP/Lead status counts)
- High-potential count with sample domains
- Average score indicator
- "Explore all results" CTA

### 4.2 DomainFilters

**Purpose**: Unified filter bar replacing fragmented controls

**UI Elements**:
- Status dropdowns (DNS, HTTP, Lead) with count badges
- Score range slider (0-100)
- Parked domain toggle
- Contact signal toggle
- Keyword search input
- Warnings filter dropdown
- Reset all button
- Active filter pills

### 4.3 DomainDataGrid

**Purpose**: Primary domain list with performance optimizations

**Features**:
- Column-based sorting (click header)
- Row selection (checkbox column)
- Row click → open drawer
- Inline expandable row (optional — shows keywords/contacts preview)
- Virtualized rendering via react-window at >500 rows
- Infinite scroll in "explore" mode
- Page controls in "paginated" mode

### 4.4 DomainDetailDrawer

**Purpose**: Deep-dive into single domain — THE core UX surface

**Sections**:
1. **Header**: Domain name, quick stats (score, status, created)
2. **Validation**: DNS/HTTP status with reason codes
3. **Score Breakdown**: Visual breakdown of scoring components
4. **Keywords**: Full keyword list with hits, weights, distribution
5. **Contacts**: Extracted contact signals
6. **Microcrawl**: Secondary pages examined, gain ratio
7. **Raw Data**: Collapsible JSON view
8. **Actions**: Copy domain, export, exclude from campaign, open in new tab

No more isolated modals like `RichnessBreakdownModal`.

### 4.5 DomainActionsBar

**Purpose**: Batch actions for selected domains

**Visibility**: Shows when `selectedIds.size > 0`

**Actions**:
- Export selected (CSV/JSON)
- Exclude selected from campaign
- Clear selection
- Select all on page / all matching filter

---

## 5. Implementation Plan (Refined)

### Phase 7.1: Foundation — State Authority (2-3 days)

**Entry Criteria**:
- Architecture document approved ✅
- Backend confirms score breakdown timeline
- All contracts in this document locked

**Deliverables**:
1. `useDomainsExplorer` hook — single source of truth
2. `useDomainFilters` hook — URL sync with nuqs
3. Type definitions in `src/types/explorer/`
4. Unit tests for state transitions

**Exit Criteria**:
- Hook can fetch, filter, sort, paginate domains
- URL reflects filter state (bookmarkable)
- Tests pass for all state transitions
- No local state outside hook

**Demo**: Filter domains by status, see URL update, refresh page, state restored

**Rollback**: Feature-flagged, no production impact

---

### Phase 7.2: Grid Refactor (2-3 days)

**Entry Criteria**:
- Phase 7.1 complete and merged
- `useDomainsExplorer` stable

**Deliverables**:
1. `DomainDataGrid` component using DataTable base
2. Column definitions with proper typing
3. Row selection integration
4. Virtualization at 500+ rows threshold
5. Server-side sorting enabled (remove client fallback)

**Exit Criteria**:
- Grid renders 10k domains without jank (< 2s)
- Sorting triggers API call (not client sort)
- Selection state flows through explorer hook
- Existing `DomainsList` still works (parallel path)

**Demo**: Load campaign with 1000+ domains, sort by richness, select 5 domains

**Rollback**: Feature flag `NEXT_PUBLIC_RESULTS_EXPLORER_V2`

---

### Phase 7.3: Detail Drawer (2-3 days)

**Entry Criteria**:
- Phase 7.2 complete
- **Score Breakdown endpoint implemented** (HARD BLOCKER)

**Deliverables**:
1. `DomainDetailDrawer` sheet component
2. `DomainScoreBreakdown` visualization
3. `DomainKeywordsPanel` full keyword view
4. `DomainContactsPanel` contact signals
5. Drawer state in `useDomainsExplorer`

**Exit Criteria**:
- Click row → drawer opens with full domain data
- Score breakdown loads lazily
- Keywords expanded with hit counts
- Contacts displayed if present
- Close drawer → back to grid state preserved

**Demo**: Click domain row, see score breakdown with component bars, view all keywords

**Rollback**: Drawer disabled, row click does nothing

---

### Phase 7.4: Actions & Export (1-2 days)

**Entry Criteria**:
- Phase 7.3 complete
- Domain exclusion API decision made

**Deliverables**:
1. `DomainActionsBar` for batch operations
2. `ExportDomainsDialog` with format selection
3. CSV/JSON export generation
4. Exclusion mutation (if backend ready)

**Exit Criteria**:
- Select domains → action bar appears
- Export generates valid CSV/JSON
- Exclusion updates domain status (if implemented)

**Demo**: Select 10 domains, export as CSV, verify file contents

**Rollback**: Actions bar hidden, export only

---

### Phase 7.5: Integration & Deprecation (2-3 days)

**Entry Criteria**:
- Phases 7.1-7.4 complete
- All tests passing
- Performance benchmarks met

**Deliverables**:
1. `ResultsOverview` summary component
2. Campaign page integration
3. SSE real-time updates wired
4. Legacy component deprecation
5. Migration guide documentation

**Exit Criteria**:
- New explorer is default for campaigns
- `DomainsList` marked deprecated
- `LeadResultsPanel` replaced or adapted
- No regressions in existing functionality
- Accessibility audit passes

**Demo**: Full flow — land on campaign, see overview, filter, drill into domain, export selection

**Rollback**: Feature flag reverts to legacy components

---

## 6. Migration Map

### Component Lifecycle

```
Phase 7.1 (Foundation)
├── CREATE: useDomainsExplorer
├── CREATE: useDomainFilters  
├── CREATE: src/types/explorer/
└── KEEP: DomainsList (unchanged)

Phase 7.2 (Grid)
├── CREATE: DomainDataGrid
├── CREATE: DomainFilters (component)
├── DEPRECATE: usePaginatedDomains (soft)
└── KEEP: DomainsList (parallel)

Phase 7.3 (Drawer)
├── CREATE: DomainDetailDrawer
├── CREATE: DomainScoreBreakdown
├── CREATE: DomainKeywordsPanel
├── CREATE: DomainContactsPanel
├── DEPRECATE: RichnessBreakdownModal
└── KEEP: RichnessBadge (inline still useful)

Phase 7.4 (Actions)
├── CREATE: DomainActionsBar
├── CREATE: ExportDomainsDialog
└── KEEP: ExportActions (for snapshots)

Phase 7.5 (Integration)
├── CREATE: ResultsOverview
├── DELETE: DomainsList (after flag rollout)
├── DELETE: LeadResultsPanel (replaced by ResultsOverview)
├── DELETE: usePaginatedDomains
├── DELETE: RichnessBreakdownModal
└── ARCHIVE: Old imports in campaign page
```

### File Death Schedule

| File | Phase | Action | Replacement |
|------|-------|--------|-------------|
| `src/components/campaigns/DomainsList.tsx` | 7.5 | DELETE | `DomainDataGrid` |
| `src/components/refactor/campaign/LeadResultsPanel.tsx` | 7.5 | DELETE | `ResultsOverview` |
| `src/lib/hooks/usePaginatedDomains.ts` | 7.5 | DELETE | `useDomainsExplorer` |
| `src/components/domains/RichnessBreakdownModal.tsx` | 7.5 | DELETE | `DomainDetailDrawer` |

### No Zombie Paths Guarantee

At any point:
- Only ONE way to render domain list (flag-controlled)
- Only ONE source of domain state (explorer hook)
- Old components wrapped in deprecation warnings during 7.2-7.4

---

## 7. Architectural Risks

### Risk 1: Score Breakdown Endpoint Delay
**Severity**: HIGH  
**Impact**: Phase 7.3 cannot complete — drawer is hollow without scores  
**Mitigation**: 
- Start 7.3 with placeholder "Score breakdown loading..." 
- Backend prioritizes endpoint before 7.3 completion
- Fallback: show existing `features.richness` data only

### Risk 2: Server Sorting Performance at Scale
**Severity**: MEDIUM  
**Impact**: 100k domains with complex sort may timeout  
**Mitigation**:
- Indexes exist for score/recency sorts
- Add query timeout handling
- Paginate aggressively (max 100 per page)

### Risk 3: URL State Explosion
**Severity**: LOW  
**Impact**: Too many filter params make URLs unwieldy  
**Mitigation**:
- Use nuqs for compact URL encoding
- Provide "reset filters" button
- Consider localStorage for non-shareable prefs

### Risk 4: Drawer State + Grid Selection Conflict
**Severity**: MEDIUM  
**Impact**: Opening drawer while selection active may confuse UX  
**Mitigation**:
- Design decision: Keep independent — drawer is "inspect", selection is "batch"
- Clear visual distinction between inspected row and selected rows

### Risk 5: Legacy Component Regression
**Severity**: MEDIUM  
**Impact**: Deleting old components breaks untested paths  
**Mitigation**:
- Feature flag entire phase
- Run full E2E suite before deletion
- 1-week bake time after flag enabled

---

## 8. TypeScript Contracts

### 8.1 DomainsExplorerState

```typescript
/**
 * Single source of truth for all domain exploration state.
 * 
 * INVARIANTS:
 * - domains array is ALWAYS server-sourced (no client-side filtering)
 * - sortKey/sortDir ALWAYS reflect server sort params
 * - filters object ALWAYS syncs bidirectionally with URL
 * - selectedIds is cleared when filters change (prevents stale selections)
 * - inspectedDomainId must exist in domains array OR trigger refetch
 */
export interface DomainsExplorerState {
  // === Campaign Context ===
  readonly campaignId: string;
  
  // === Domain Data (server-sourced) ===
  readonly domains: DomainRow[];
  readonly total: number;
  readonly aggregates: DomainAggregates;
  readonly isLoading: boolean;
  readonly isRefetching: boolean;
  readonly error: string | null;
  
  // === Pagination ===
  readonly page: number;              // 1-indexed
  readonly pageSize: number;          // 25 | 50 | 100
  readonly pageCount: number;         // derived: ceil(total / pageSize)
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
  readonly cursor: string | null;     // for cursor pagination mode
  
  // === Sorting (server-side only) ===
  readonly sortKey: DomainSortKey;
  readonly sortDir: 'asc' | 'desc';
  
  // === Filtering (URL-synced) ===
  readonly filters: DomainFilters;
  readonly activeFilterCount: number; // derived: count of non-default filters
  
  // === Selection ===
  readonly selectedIds: ReadonlySet<string>;
  readonly isAllSelected: boolean;    // all on current page
  readonly selectionCount: number;    // derived: selectedIds.size
  
  // === Drawer ===
  readonly inspectedDomainId: string | null;
  readonly inspectedDomain: DomainRow | null; // derived from domains or separate fetch
  readonly isDrawerOpen: boolean;     // derived: inspectedDomainId !== null
}

export type DomainSortKey = 
  | 'richness_score'    // features.richness.score
  | 'microcrawl_gain'   // features.microcrawl.gain_ratio
  | 'keywords_unique'   // features.keywords.unique_count
  | 'domain_score'      // domain_score column
  | 'created_at';       // generated_at timestamp

/**
 * Default state factory - ensures consistent initialization
 */
export const createInitialExplorerState = (campaignId: string): DomainsExplorerState => ({
  campaignId,
  domains: [],
  total: 0,
  aggregates: { dns: {}, http: {}, lead: {} },
  isLoading: true,
  isRefetching: false,
  error: null,
  page: 1,
  pageSize: 50,
  pageCount: 0,
  hasNextPage: false,
  hasPrevPage: false,
  cursor: null,
  sortKey: 'richness_score',
  sortDir: 'desc',
  filters: createDefaultFilters(),
  activeFilterCount: 0,
  selectedIds: new Set(),
  isAllSelected: false,
  selectionCount: 0,
  inspectedDomainId: null,
  inspectedDomain: null,
  isDrawerOpen: false,
});
```

### 8.2 DomainFilters Schema

```typescript
/**
 * Filter state schema - all fields optional, absent = no filter
 * 
 * INVARIANTS:
 * - Filters are ANDed together (all must match)
 * - Empty string values treated as unset
 * - URL serialization uses compact keys (dns, http, min, etc.)
 * - Changing any filter resets page to 1
 */
export interface DomainFilters {
  // Status filters (enum-constrained)
  dnsStatus?: DomainStatusFilter;
  httpStatus?: DomainStatusFilter;
  leadStatus?: LeadStatusFilter;
  
  // Score filters
  minScore?: number;        // 0-100, inclusive
  maxScore?: number;        // 0-100, inclusive
  
  // Boolean filters
  notParked?: boolean;      // exclude is_parked=true
  hasContact?: boolean;     // require contacts JSONB not empty
  hasKeywords?: boolean;    // require keywords.unique_count > 0
  
  // Text search
  keyword?: string;         // substring match in keywords
  domainSearch?: string;    // ILIKE %search% on domain_name
  
  // Reason filters (for debugging)
  dnsReason?: string;       // exact match: NXDOMAIN, SERVFAIL, etc.
  httpReason?: string;      // exact match: TIMEOUT, TLS_ERROR, etc.
  
  // Warnings filter
  warnings?: 'all' | 'has' | 'none';
}

export type DomainStatusFilter = 'pending' | 'ok' | 'error' | 'timeout';
export type LeadStatusFilter = 'pending' | 'match' | 'no_match' | 'error' | 'timeout';

/**
 * Smart defaults that surface high-signal domains
 * Users see quality results immediately, can expand manually
 */
export const createDefaultFilters = (): DomainFilters => ({
  dnsStatus: 'ok',       // Hide DNS failures
  httpStatus: 'ok',      // Hide HTTP failures
  warnings: 'all',       // Show all (user can filter)
  // Everything else undefined = no filter
});

/**
 * URL serialization keys (compact for cleaner URLs)
 */
export const FILTER_URL_KEYS: Record<keyof DomainFilters, string> = {
  dnsStatus: 'dns',
  httpStatus: 'http',
  leadStatus: 'lead',
  minScore: 'min',
  maxScore: 'max',
  notParked: 'np',
  hasContact: 'hc',
  hasKeywords: 'hk',
  keyword: 'kw',
  domainSearch: 'q',
  dnsReason: 'dr',
  httpReason: 'hr',
  warnings: 'w',
};
```

### 8.3 Drawer Data Contract

```typescript
/**
 * Complete domain data for drawer display
 * Combines DomainRow with lazy-loaded breakdown
 * 
 * INVARIANTS:
 * - base is always populated when drawer opens
 * - scoreBreakdown loaded lazily on drawer open
 * - scoreBreakdown can be null if endpoint fails or not implemented
 */
export interface DomainDrawerData {
  // Base domain info (from list response)
  readonly base: DomainRow;
  
  // Score breakdown (lazy loaded)
  readonly scoreBreakdown: DomainScoreBreakdown | null;
  readonly isLoadingBreakdown: boolean;
  readonly breakdownError: string | null;
}

/**
 * Score breakdown from backend API
 * Maps to DomainScoreBreakdownResponse schema
 */
export interface DomainScoreBreakdown {
  readonly campaignId: string;
  readonly domain: string;
  readonly final: number;                    // 0-100 final score
  
  // Component scores (each 0-1 normalized)
  readonly components: ScoreComponents;
  
  // Applied weights (from scoring profile)
  readonly weights?: Record<string, number>;
  
  // Penalties
  readonly parkedPenaltyFactor?: number;     // 0-1, multiplied against final
}

export interface ScoreComponents {
  readonly density: number;          // Keyword density in content
  readonly coverage: number;         // Keyword coverage across page
  readonly non_parked: number;       // Inverse of parked confidence
  readonly content_length: number;   // Normalized content length
  readonly title_keyword: number;    // Keyword presence in title
  readonly freshness: number;        // Content freshness indicator
  readonly tf_lite?: number;         // Experimental TF component
}

/**
 * Expanded keyword view for drawer
 */
export interface DomainKeywordDetail {
  readonly keyword: string;
  readonly hits: number;
  readonly weight: number;
  readonly positions: string[];       // 'title' | 'h1' | 'body' | 'meta'
  readonly sentiment?: 'positive' | 'neutral' | 'negative';
}

/**
 * Contact signals for drawer
 */
export interface DomainContactSignal {
  readonly type: 'email' | 'phone' | 'social' | 'form';
  readonly value: string;
  readonly confidence: number;        // 0-1
  readonly source: string;            // where found on page
}
```

### 8.4 Grid Column Contract

```typescript
/**
 * Column definitions for DomainDataGrid
 * Each column specifies data access, rendering, and behavior
 * 
 * INVARIANTS:
 * - Sortable columns MUST use server-side sorting (no client sort)
 * - Cell renderers receive strongly-typed row data
 * - Column widths are responsive (minWidth, flex)
 */
export interface DomainGridColumn {
  readonly id: string;
  readonly header: string;
  readonly accessor: keyof DomainRow | ((row: DomainRow) => unknown);
  readonly cell?: (row: DomainRow) => React.ReactNode;
  readonly sortKey?: DomainSortKey;   // undefined = not sortable
  readonly minWidth: number;
  readonly flex?: number;             // flex-grow factor
  readonly align?: 'left' | 'center' | 'right';
  readonly visible?: boolean;         // default true
}

/**
 * Standard column set for domain grid
 */
export const DOMAIN_GRID_COLUMNS: readonly DomainGridColumn[] = [
  {
    id: 'select',
    header: '',
    accessor: 'id',
    // cell: SelectCheckbox component
    minWidth: 40,
    align: 'center',
  },
  {
    id: 'domain',
    header: 'Domain',
    accessor: 'domain',
    // cell: DomainCell with status icons
    minWidth: 200,
    flex: 1,
  },
  {
    id: 'richness',
    header: 'Richness',
    accessor: (row) => row.features?.richness?.score,
    // cell: RichnessBadge
    sortKey: 'richness_score',
    minWidth: 80,
    align: 'center',
  },
  {
    id: 'keywords',
    header: 'Keywords',
    accessor: (row) => row.features?.keywords?.unique_count,
    // cell: TopKeywordsList
    sortKey: 'keywords_unique',
    minWidth: 120,
  },
  {
    id: 'microcrawl',
    header: 'Microcrawl',
    accessor: (row) => row.features?.microcrawl?.gain_ratio,
    // cell: MicrocrawlGainChip
    sortKey: 'microcrawl_gain',
    minWidth: 80,
    align: 'center',
  },
  {
    id: 'lead',
    header: 'Lead',
    accessor: 'leadStatus',
    // cell: LeadStatusBadge
    minWidth: 80,
    align: 'center',
  },
  {
    id: 'warnings',
    header: 'Warnings',
    accessor: (row) => getDomainWarnings(row.features?.richness),
    // cell: WarningsIcons
    minWidth: 60,
    align: 'center',
  },
  {
    id: 'actions',
    header: '',
    accessor: 'id',
    // cell: RowActionsMenu
    minWidth: 40,
    align: 'center',
  },
] as const;
```

### 8.5 Explorer Actions Contract

```typescript
/**
 * Actions available from useDomainsExplorer hook
 * All state mutations go through these actions
 * 
 * INVARIANTS:
 * - Actions are idempotent where possible
 * - Async actions return promises for error handling
 * - Filter changes reset page to 1
 * - Selection changes don't trigger refetch
 */
export interface DomainsExplorerActions {
  // === Pagination ===
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: 25 | 50 | 100) => void;
  
  // === Sorting ===
  setSort: (key: DomainSortKey, dir?: 'asc' | 'desc') => void;
  toggleSort: (key: DomainSortKey) => void;  // flip direction if same key
  
  // === Filtering ===
  setFilter: <K extends keyof DomainFilters>(key: K, value: DomainFilters[K]) => void;
  setFilters: (filters: Partial<DomainFilters>) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof DomainFilters) => void;
  
  // === Selection ===
  selectDomain: (id: string) => void;
  deselectDomain: (id: string) => void;
  toggleDomain: (id: string) => void;
  selectAll: () => void;                     // all on current page
  deselectAll: () => void;
  selectAllMatching: () => Promise<void>;    // all matching filter (may be large)
  
  // === Drawer ===
  inspectDomain: (id: string) => void;
  closeDrawer: () => void;
  
  // === Data ===
  refresh: () => Promise<void>;
  invalidate: () => void;                    // force refetch on next render
}

/**
 * Hook return type
 */
export type UseDomainsExplorer = [
  DomainsExplorerState,
  DomainsExplorerActions,
];
```

---

## 9. Testing Strategy

### Unit Tests
- `useDomainsExplorer`: Filter application, pagination state, selection
- `useDomainFilters`: URL sync, reset behavior
- `DomainFilters`: Filter control rendering, change callbacks
- `DomainDataGrid`: Column rendering, sorting, selection

### Integration Tests
- Filter + Grid: Applying filters updates grid content
- Grid + Drawer: Row click opens drawer with correct domain
- Selection + Actions: Batch actions apply to selected domains
- Export: Generated file contains expected data

### Performance Tests
- Render 10k domains with virtualization (FPS > 30)
- Filter application < 100ms
- Page load with 100 domains < 1s

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first meaningful paint | < 500ms | Lighthouse |
| Filter application latency | < 100ms | Performance timing |
| Drawer open latency | < 200ms | Performance timing |
| 10k domain render (virtualized) | < 2s | Jest performance test |
| Accessibility score | > 90 | axe-core audit |
| Code coverage | > 80% | Jest coverage report |

---

## 11. Open Questions (To Resolve Before 7.1)

1. ~~Score Breakdown Backend~~ → Ownership confirmed needed
2. ~~Domain Exclusion~~ → Recommend soft exclude with timestamp
3. **Keyword-Centric View**: Separate page or filter-based? → Recommend filter-based for 7.x
4. **Comparison Mode**: Compare 2+ domains side-by-side? → Defer to Phase 8
5. **Export Limits**: Max domains per export? → Recommend 10k with warning, async for larger

---

## Appendix A: Existing Backend Indexes

```sql
-- Campaign + score sorting
CREATE INDEX idx_generated_domains_campaign_domain_score_desc
    ON generated_domains (campaign_id, domain_score DESC);

-- Campaign + recency sorting  
CREATE INDEX idx_generated_domains_campaign_last_http_fetched_at_desc
    ON generated_domains (campaign_id, last_http_fetched_at DESC);

-- Unique offset per campaign
CREATE UNIQUE INDEX idx_generated_domains_campaign_offset_unique
    ON generated_domains (campaign_id, offset_index);
```

## Appendix B: Current Filter Parameter Schema

```yaml
# From backend/openapi/paths/campaigns/domains-list.yaml
parameters:
  - name: dnsStatus      # enum: pending|ok|error|timeout
  - name: httpStatus     # enum: pending|ok|error|timeout
  - name: dnsReason      # string: NXDOMAIN, SERVFAIL, etc.
  - name: httpReason     # string: TIMEOUT, NOT_FOUND, etc.
  - name: minScore       # float: minimum domain score
  - name: notParked      # boolean: exclude parked domains
  - name: hasContact     # boolean: require contact signals
  - name: keyword        # string: keyword match filter
  - name: sort           # enum: richness_score|microcrawl_gain|keywords_unique
  - name: dir            # enum: asc|desc
  - name: warnings       # enum: has|none
  - name: first          # int: cursor page size
  - name: after          # string: cursor token
```

---

**END OF DOCUMENT**

*Architecture APPROVED. Contracts LOCKED. Awaiting backend dependency confirmation before Phase 7.1 begins.*
