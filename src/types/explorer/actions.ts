/**
 * Phase 7: Explorer Actions Contract
 * 
 * All state mutations go through these actions.
 * Actions are the ONLY way to modify DomainsExplorerState.
 * 
 * INVARIANTS:
 * - Actions are idempotent where possible
 * - Async actions return promises for error handling
 * - Filter changes reset page to 1
 * - Selection changes don't trigger refetch
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md Section 8.5
 */

import type { DomainFilters } from './filters';
import type { DomainSortKey, SortDirection, PageSize } from './state';

// ============================================================================
// ACTIONS INTERFACE
// ============================================================================

/**
 * Actions available from useDomainsExplorer hook
 * All state mutations MUST go through these actions
 */
export interface DomainsExplorerActions {
  // === Pagination Actions ===
  
  /** Navigate to specific page (1-indexed) */
  goToPage: (page: number) => void;
  
  /** Navigate to next page (no-op if at last page) */
  nextPage: () => void;
  
  /** Navigate to previous page (no-op if at first page) */
  prevPage: () => void;
  
  /** Change page size (resets to page 1) */
  setPageSize: (size: PageSize) => void;
  
  // === Sorting Actions ===
  
  /** Set sort key and optional direction */
  setSort: (key: DomainSortKey, dir?: SortDirection) => void;
  
  /** Toggle sort direction for a key (or set key with default desc if different) */
  toggleSort: (key: DomainSortKey) => void;
  
  // === Filter Actions ===
  
  /** Set a single filter value */
  setFilter: <K extends keyof DomainFilters>(key: K, value: DomainFilters[K]) => void;
  
  /** Set multiple filters at once */
  setFilters: (filters: Partial<DomainFilters>) => void;
  
  /** Reset all filters to defaults */
  resetFilters: () => void;
  
  /** Clear a specific filter (set to undefined) */
  clearFilter: (key: keyof DomainFilters) => void;
  
  // === Selection Actions ===
  
  /** Add domain to selection */
  selectDomain: (id: string) => void;
  
  /** Remove domain from selection */
  deselectDomain: (id: string) => void;
  
  /** Toggle domain selection state */
  toggleDomain: (id: string) => void;
  
  /** Select all domains on current page */
  selectAll: () => void;
  
  /** Clear all selections */
  deselectAll: () => void;
  
  /** Select all domains matching current filter (async - may be large) */
  selectAllMatching: () => Promise<void>;
  
  // === Drawer Actions ===
  
  /** Open drawer for specific domain */
  inspectDomain: (id: string) => void;
  
  /** Close drawer */
  closeDrawer: () => void;
  
  // === Data Actions ===
  
  /** Force refresh data from server */
  refresh: () => Promise<void>;
  
  /** Invalidate cache (force refetch on next render) */
  invalidate: () => void;
}

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

/**
 * Return type for useDomainsExplorer hook
 * Tuple of [state, actions] for familiar React pattern
 */
export type UseDomainsExplorerReturn = readonly [
  /** Current explorer state (read-only) */
  DomainsExplorerState,
  /** Actions to mutate state */
  DomainsExplorerActions,
];

// Import state type for complete return type
import type { DomainsExplorerState } from './state';

// ============================================================================
// ACTION CREATORS (for testing)
// ============================================================================

/**
 * No-op actions for testing and initial state
 */
export const NOOP_ACTIONS: DomainsExplorerActions = {
  goToPage: () => {},
  nextPage: () => {},
  prevPage: () => {},
  setPageSize: () => {},
  setSort: () => {},
  toggleSort: () => {},
  setFilter: () => {},
  setFilters: () => {},
  resetFilters: () => {},
  clearFilter: () => {},
  selectDomain: () => {},
  deselectDomain: () => {},
  toggleDomain: () => {},
  selectAll: () => {},
  deselectAll: () => {},
  selectAllMatching: async () => {},
  inspectDomain: () => {},
  closeDrawer: () => {},
  refresh: async () => {},
  invalidate: () => {},
};

// ============================================================================
// ACTION VALIDATION
// ============================================================================

/**
 * Validate page number is within bounds
 */
export function validatePageNumber(page: number, pageCount: number): number {
  if (page < 1) return 1;
  if (pageCount > 0 && page > pageCount) return pageCount;
  return Math.floor(page);
}

/**
 * Validate domain ID format
 * Returns true if ID appears valid (non-empty string)
 */
export function isValidDomainId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0;
}
