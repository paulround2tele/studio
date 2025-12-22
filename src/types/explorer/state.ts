/**
 * Phase 7: Domains Explorer State Contract
 * 
 * INVARIANTS (MUST be enforced by useDomainsExplorer):
 * 1. domains array is ALWAYS server-sourced (no client-side filtering)
 * 2. sortKey/sortDir are CLIENT-ONLY until backend wires sort params
 *    - isSortNonAuthoritative flag indicates this condition
 * 3. filters object ALWAYS syncs bidirectionally with URL
 * 4. selectedIds is cleared when filters change (prevents stale selections)
 * 5. inspectedDomainId must exist in domains array OR trigger refetch
 * 6. No local state outside the hook. Ever.
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md Section 8.1
 */

import type { 
  DomainListItem,
  CampaignDomainsListResponseAggregates,
  CampaignDomainsListResponseAggregatesDns,
  CampaignDomainsListResponseAggregatesLead,
} from '@/lib/api-client/models';
import type { DomainFilters } from './filters';

// ============================================================================
// DOMAIN ROW TYPE (Extended from API)
// ============================================================================

/**
 * Domain row for grid display
 * Extends API type with computed UI properties
 */
export interface DomainRow extends DomainListItem {
  /** Computed richness score for sorting/display (0-100) */
  readonly richnessScore?: number;
}

// ============================================================================
// AGGREGATES TYPE
// ============================================================================

/**
 * Domain aggregates from campaign counters
 * Used for summary displays and filter count badges
 */
export interface DomainAggregates {
  readonly dns?: CampaignDomainsListResponseAggregatesDns;
  readonly http?: CampaignDomainsListResponseAggregatesDns;
  readonly lead?: CampaignDomainsListResponseAggregatesLead;
}

// ============================================================================
// SORT CONFIGURATION
// ============================================================================

/**
 * Available sort keys - must map to backend sort params
 * 
 * Backend sort param mapping:
 * - richness_score → sort=richness_score (features.richness.score)
 * - microcrawl_gain → sort=microcrawl_gain (features.microcrawl.gain_ratio)
 * - keywords_unique → sort=keywords_unique (features.keywords.unique_count)
 * - domain_score → sort=domain_score (domain_score column)
 * - created_at → sort=created_at (generated_at timestamp)
 */
export type DomainSortKey = 
  | 'richness_score'    
  | 'microcrawl_gain'   
  | 'keywords_unique'   
  | 'domain_score'      
  | 'created_at';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Default sort configuration (noise → signal)
 * High richness scores first = most actionable domains on top
 */
export const DEFAULT_SORT_KEY: DomainSortKey = 'richness_score';
export const DEFAULT_SORT_DIR: SortDirection = 'desc';

// ============================================================================
// PAGE SIZE OPTIONS
// ============================================================================

/**
 * Allowed page sizes
 * Balance between load time and scroll convenience
 */
export type PageSize = 25 | 50 | 100;

/**
 * Default page size
 */
export const DEFAULT_PAGE_SIZE: PageSize = 50;

/**
 * Valid page sizes for validation
 */
export const VALID_PAGE_SIZES: readonly PageSize[] = [25, 50, 100] as const;

/**
 * Type guard for page size
 */
export function isValidPageSize(value: unknown): value is PageSize {
  return typeof value === 'number' && VALID_PAGE_SIZES.includes(value as PageSize);
}

// ============================================================================
// MAIN STATE INTERFACE
// ============================================================================

/**
 * Single source of truth for all domain exploration state.
 * 
 * This interface is the complete contract for useDomainsExplorer.
 * Components read from this state; mutations go through actions only.
 */
export interface DomainsExplorerState {
  // === Campaign Context ===
  /** Campaign ID this explorer is bound to (immutable after creation) */
  readonly campaignId: string;
  
  // === Domain Data (server-sourced) ===
  /** Current page of domains from server */
  readonly domains: readonly DomainRow[];
  /** Total domain count (from server or counters) */
  readonly total: number;
  /** Aggregated counts by status */
  readonly aggregates: DomainAggregates;
  /** Initial load in progress */
  readonly isLoading: boolean;
  /** Background refetch in progress */
  readonly isRefetching: boolean;
  /** Error message if fetch failed */
  readonly error: string | null;
  
  // === Pagination ===
  /** Current page number (1-indexed) */
  readonly page: number;
  /** Items per page */
  readonly pageSize: PageSize;
  /** Total pages (derived: ceil(total / pageSize)) */
  readonly pageCount: number;
  /** Can navigate forward */
  readonly hasNextPage: boolean;
  /** Can navigate backward */
  readonly hasPrevPage: boolean;
  /** Cursor token for cursor-based pagination (optional) */
  readonly cursor: string | null;
  
  // === Sorting (server-side only) ===
  /** Current sort column */
  readonly sortKey: DomainSortKey;
  /** Current sort direction */
  readonly sortDir: SortDirection;
  /** 
   * True when sort is client-only (backend does not yet support sort params).
   * UI should indicate sort is non-authoritative when this is true.
   * TODO: Set to false when GET /domains supports ?sort=&dir=
   */
  readonly isSortNonAuthoritative: boolean;
  
  // === Filtering (URL-synced) ===
  /** Active filters (always synced with URL) */
  readonly filters: DomainFilters;
  /** Count of non-default filters (derived) */
  readonly activeFilterCount: number;
  
  // === Selection ===
  /** Set of selected domain IDs */
  readonly selectedIds: ReadonlySet<string>;
  /** Whether all domains on current page are selected */
  readonly isAllSelected: boolean;
  /** Count of selected domains (derived: selectedIds.size) */
  readonly selectionCount: number;
  
  // === Drawer State ===
  /** ID of domain being inspected (null = drawer closed) */
  readonly inspectedDomainId: string | null;
  /** Full data for inspected domain (from domains array or separate fetch) */
  readonly inspectedDomain: DomainRow | null;
  /** Whether drawer is open (derived: inspectedDomainId !== null) */
  readonly isDrawerOpen: boolean;
}

// ============================================================================
// STATE FACTORY
// ============================================================================

/**
 * Default aggregates structure
 */
const EMPTY_AGGREGATES: DomainAggregates = {
  dns: undefined,
  http: undefined,
  lead: undefined,
};

/**
 * Create initial explorer state for a campaign
 * Ensures consistent initialization across all usage sites
 */
export function createInitialExplorerState(campaignId: string): DomainsExplorerState {
  return {
    // Campaign context
    campaignId,
    
    // Domain data
    domains: [],
    total: 0,
    aggregates: EMPTY_AGGREGATES,
    isLoading: true,
    isRefetching: false,
    error: null,
    
    // Pagination
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    cursor: null,
    
    // Sorting
    sortKey: DEFAULT_SORT_KEY,
    sortDir: DEFAULT_SORT_DIR,
    isSortNonAuthoritative: true, // TODO: Set to false when backend supports sort params
    
    // Filtering
    filters: {}, // Will be populated from URL or defaults
    activeFilterCount: 0,
    
    // Selection
    selectedIds: new Set(),
    isAllSelected: false,
    selectionCount: 0,
    
    // Drawer
    inspectedDomainId: null,
    inspectedDomain: null,
    isDrawerOpen: false,
  };
}

// ============================================================================
// STATE DERIVATIONS
// ============================================================================

/**
 * Derive computed properties from base state
 * Used internally by useDomainsExplorer to compute derived fields
 */
export function deriveExplorerState(
  base: Omit<DomainsExplorerState, 'pageCount' | 'hasPrevPage' | 'isAllSelected' | 'selectionCount' | 'isDrawerOpen' | 'inspectedDomain'>,
  domains: readonly DomainRow[]
): Pick<DomainsExplorerState, 'pageCount' | 'hasPrevPage' | 'isAllSelected' | 'selectionCount' | 'isDrawerOpen' | 'inspectedDomain'> {
  const pageCount = base.total > 0 ? Math.ceil(base.total / base.pageSize) : 0;
  const hasPrevPage = base.page > 1;
  
  // Selection derived state
  const domainIds = new Set(domains.map(d => d.id).filter((id): id is string => id !== undefined));
  const selectedOnPage = [...base.selectedIds].filter(id => domainIds.has(id));
  const isAllSelected = domains.length > 0 && selectedOnPage.length === domains.length;
  const selectionCount = base.selectedIds.size;
  
  // Drawer derived state
  const isDrawerOpen = base.inspectedDomainId !== null;
  const inspectedDomain = base.inspectedDomainId 
    ? (domains.find(d => d.id === base.inspectedDomainId) ?? null)
    : null;
  
  return {
    pageCount,
    hasPrevPage,
    isAllSelected,
    selectionCount,
    isDrawerOpen,
    inspectedDomain,
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Re-export aggregates types for convenience
export type {
  CampaignDomainsListResponseAggregates,
  CampaignDomainsListResponseAggregatesDns,
  CampaignDomainsListResponseAggregatesLead,
};
