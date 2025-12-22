/**
 * Phase 7: Domains Explorer Hook
 * 
 * SINGLE SOURCE OF TRUTH for all domain exploration state.
 * This hook orchestrates all domain data - there is NO local state outside it.
 * 
 * INVARIANTS ENFORCED:
 * 1. domains array is ALWAYS server-sourced (no client-side filtering)
 * 2. sortKey/sortDir are CLIENT-ONLY until backend wires sort params
 *    - UI can sort, but results reflect server default order
 *    - TODO: Wire sort to API when GET /domains supports ?sort=&dir=
 * 3. filters object ALWAYS syncs bidirectionally with URL
 * 4. selectedIds is cleared when filters change (prevents stale selections)
 * 5. inspectedDomainId must exist in domains array OR trigger refetch
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

'use client';

import { useMemo, useReducer, useEffect, useRef } from 'react';
import { useGetCampaignDomainsQuery } from '@/store/api/campaignApi';
import { useDomainFilters } from './useDomainFilters';

import type { 
  DomainsExplorerState, 
  DomainRow,
  DomainSortKey,
  SortDirection,
  PageSize,
  DomainAggregates,
} from '@/types/explorer/state';

import {
  DEFAULT_SORT_KEY,
  DEFAULT_SORT_DIR,
  DEFAULT_PAGE_SIZE,
  VALID_PAGE_SIZES,
  deriveExplorerState,
} from '@/types/explorer/state';

import type { DomainsExplorerActions } from '@/types/explorer/actions';
import { validatePageNumber, isValidDomainId } from '@/types/explorer/actions';
import { filtersToApiParams } from '@/types/explorer/filters';

// ============================================================================
// INTERNAL STATE (Reducer pattern for complex state)
// ============================================================================

/**
 * Internal state managed by reducer
 * This is the "base" state before derivations
 */
interface InternalState {
  page: number;
  pageSize: PageSize;
  sortKey: DomainSortKey;
  sortDir: SortDirection;
  selectedIds: Set<string>;
  inspectedDomainId: string | null;
}

type Action =
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_PAGE_SIZE'; pageSize: PageSize }
  | { type: 'SET_SORT'; sortKey: DomainSortKey; sortDir: SortDirection }
  | { type: 'SELECT_DOMAIN'; id: string }
  | { type: 'DESELECT_DOMAIN'; id: string }
  | { type: 'TOGGLE_DOMAIN'; id: string }
  | { type: 'SELECT_ALL'; ids: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'CLEAR_SELECTION_ON_FILTER_CHANGE' }
  | { type: 'INSPECT_DOMAIN'; id: string }
  | { type: 'CLOSE_DRAWER' };

function createInitialInternalState(): InternalState {
  return {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortKey: DEFAULT_SORT_KEY,
    sortDir: DEFAULT_SORT_DIR,
    selectedIds: new Set(),
    inspectedDomainId: null,
  };
}

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.page };
      
    case 'SET_PAGE_SIZE':
      // Changing page size resets to page 1
      return { ...state, pageSize: action.pageSize, page: 1 };
      
    case 'SET_SORT':
      // Changing sort resets to page 1
      // NOTE: Sort is CLIENT-ONLY until backend supports ?sort=&dir= params.
      // Dispatching SET_SORT updates UI state but does NOT change server response order.
      // TODO: Wire to API when endpoint supports sorting.
      return { 
        ...state, 
        sortKey: action.sortKey, 
        sortDir: action.sortDir,
        page: 1,
      };
      
    case 'SELECT_DOMAIN': {
      const newSet = new Set(state.selectedIds);
      newSet.add(action.id);
      return { ...state, selectedIds: newSet };
    }
    
    case 'DESELECT_DOMAIN': {
      const newSet = new Set(state.selectedIds);
      newSet.delete(action.id);
      return { ...state, selectedIds: newSet };
    }
    
    case 'TOGGLE_DOMAIN': {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(action.id)) {
        newSet.delete(action.id);
      } else {
        newSet.add(action.id);
      }
      return { ...state, selectedIds: newSet };
    }
    
    case 'SELECT_ALL':
      return { ...state, selectedIds: new Set(action.ids) };
      
    case 'DESELECT_ALL':
      return { ...state, selectedIds: new Set() };
      
    case 'CLEAR_SELECTION_ON_FILTER_CHANGE':
      // INVARIANT: selectedIds cleared when filters change
      return { ...state, selectedIds: new Set(), page: 1 };
      
    case 'INSPECT_DOMAIN':
      return { ...state, inspectedDomainId: action.id };
      
    case 'CLOSE_DRAWER':
      return { ...state, inspectedDomainId: null };
      
    default:
      return state;
  }
}

// ============================================================================
// HOOK OPTIONS
// ============================================================================

export interface UseDomainsExplorerOptions {
  /** Whether to start with smart defaults (dns=ok, http=ok) */
  useSmartDefaults?: boolean;
  
  /** Skip initial fetch (for lazy loading) */
  skip?: boolean;
  
  /** Poll interval in ms (0 = no polling) */
  pollingInterval?: number;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook for managing domain exploration state
 * 
 * This is THE ONLY way to access and modify domain exploration state.
 * No component should maintain local domain state.
 * 
 * @param campaignId - Campaign to explore domains for
 * @param options - Optional configuration
 * @returns Tuple of [state, actions]
 */
export function useDomainsExplorer(
  campaignId: string,
  options: UseDomainsExplorerOptions = {}
): readonly [DomainsExplorerState, DomainsExplorerActions] {
  const { skip = false, pollingInterval = 0 } = options;
  
  // === Internal State ===
  const [internalState, dispatch] = useReducer(reducer, undefined, createInitialInternalState);
  
  // === URL-Synced Filters ===
  const {
    filters,
    activeFilterCount,
    setFilter: setUrlFilter,
    setFilters: setUrlFilters,
    resetFilters: resetUrlFilters,
    clearFilter: clearUrlFilter,
  } = useDomainFilters();
  
  // Track previous filters for change detection
  const prevFiltersRef = useRef(filters);
  
  // INVARIANT: Clear selection when filters change
  useEffect(() => {
    const prevFilters = prevFiltersRef.current;
    const filtersChanged = JSON.stringify(prevFilters) !== JSON.stringify(filters);
    
    if (filtersChanged) {
      dispatch({ type: 'CLEAR_SELECTION_ON_FILTER_CHANGE' });
      prevFiltersRef.current = filters;
    }
  }, [filters]);
  
  // === API Query Parameters ===
  // CRITICAL: These params form the RTK Query cache key.
  // All state that affects query results MUST be included.
  const apiParams = useMemo(() => {
    const filterParams = filtersToApiParams(filters);
    return {
      // Core identifiers
      campaignId,
      // Pagination (affects results)
      limit: internalState.pageSize,
      offset: (internalState.page - 1) * internalState.pageSize,
      // Sort (client-only until backend supports - included for cache key completeness)
      // TODO: Uncomment when backend supports: sort: internalState.sortKey, dir: internalState.sortDir,
      // Filters (all filter values)
      ...filterParams,
    };
  }, [campaignId, internalState.page, internalState.pageSize, filters]);
  
  // === RTK Query ===
  // NOTE: Query key encodes: campaignId + filters + page + pageSize
  // Sort is client-only, so not in key (would cause cache misses with no benefit)
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCampaignDomainsQuery(
    apiParams, // Full params object - RTK Query uses this as cache key
    { 
      skip: skip || !campaignId,
      pollingInterval: pollingInterval > 0 ? pollingInterval : undefined,
    }
  );
  
  // === Transform API Response ===
  const domains: readonly DomainRow[] = useMemo(() => {
    if (!data?.items) return [];
    
    // Map API items to DomainRow (add computed fields if needed)
    return data.items.map((item): DomainRow => ({
      ...item,
      richnessScore: item.features?.richness?.score,
    }));
  }, [data?.items]);
  
  const total = data?.total ?? 0;
  
  const aggregates: DomainAggregates = useMemo(() => ({
    dns: data?.aggregates?.dns,
    http: data?.aggregates?.http,
    lead: data?.aggregates?.lead,
  }), [data?.aggregates]);
  
  // === Derived State ===
  const derivedState = useMemo(() => 
    deriveExplorerState(
      {
        campaignId,
        domains,
        total,
        aggregates,
        isLoading,
        isRefetching: isFetching && !isLoading,
        error: error ? (error as { message?: string })?.message ?? 'Failed to load domains' : null,
        page: internalState.page,
        pageSize: internalState.pageSize,
        hasNextPage: internalState.page * internalState.pageSize < total,
        cursor: null, // TODO: Add cursor support
        sortKey: internalState.sortKey,
        sortDir: internalState.sortDir,
        isSortNonAuthoritative: true, // TODO: Set false when backend supports sort
        filters,
        activeFilterCount,
        selectedIds: internalState.selectedIds,
        inspectedDomainId: internalState.inspectedDomainId,
      },
      domains
    ),
    [
      campaignId, domains, total, aggregates, isLoading, isFetching, error,
      internalState, filters, activeFilterCount,
    ]
  );
  
  // === Complete State ===
  const state: DomainsExplorerState = useMemo(() => ({
    campaignId,
    domains,
    total,
    aggregates,
    isLoading,
    isRefetching: isFetching && !isLoading,
    error: error ? (error as { message?: string })?.message ?? 'Failed to load domains' : null,
    page: internalState.page,
    pageSize: internalState.pageSize,
    pageCount: derivedState.pageCount,
    hasNextPage: internalState.page * internalState.pageSize < total,
    hasPrevPage: derivedState.hasPrevPage,
    cursor: null,
    sortKey: internalState.sortKey,
    sortDir: internalState.sortDir,
    isSortNonAuthoritative: true, // TODO: Set false when backend supports ?sort=&dir=
    filters,
    activeFilterCount,
    selectedIds: internalState.selectedIds,
    isAllSelected: derivedState.isAllSelected,
    selectionCount: derivedState.selectionCount,
    inspectedDomainId: internalState.inspectedDomainId,
    inspectedDomain: derivedState.inspectedDomain,
    isDrawerOpen: derivedState.isDrawerOpen,
  }), [
    campaignId, domains, total, aggregates, isLoading, isFetching, error,
    internalState, filters, activeFilterCount, derivedState,
  ]);
  
  // === Actions ===
  const actions: DomainsExplorerActions = useMemo(() => ({
    // Pagination
    goToPage: (page: number) => {
      const validated = validatePageNumber(page, state.pageCount);
      dispatch({ type: 'SET_PAGE', page: validated });
    },
    
    nextPage: () => {
      if (state.hasNextPage) {
        dispatch({ type: 'SET_PAGE', page: state.page + 1 });
      }
    },
    
    prevPage: () => {
      if (state.hasPrevPage) {
        dispatch({ type: 'SET_PAGE', page: state.page - 1 });
      }
    },
    
    setPageSize: (size: PageSize) => {
      if (VALID_PAGE_SIZES.includes(size)) {
        dispatch({ type: 'SET_PAGE_SIZE', pageSize: size });
      }
    },
    
    // Sorting
    setSort: (key: DomainSortKey, dir?: SortDirection) => {
      dispatch({ 
        type: 'SET_SORT', 
        sortKey: key, 
        sortDir: dir ?? DEFAULT_SORT_DIR,
      });
    },
    
    toggleSort: (key: DomainSortKey) => {
      if (state.sortKey === key) {
        // Same key: toggle direction
        dispatch({
          type: 'SET_SORT',
          sortKey: key,
          sortDir: state.sortDir === 'asc' ? 'desc' : 'asc',
        });
      } else {
        // Different key: set with default desc
        dispatch({
          type: 'SET_SORT',
          sortKey: key,
          sortDir: 'desc',
        });
      }
    },
    
    // Filtering (delegated to URL sync hook)
    setFilter: setUrlFilter,
    setFilters: setUrlFilters,
    resetFilters: resetUrlFilters,
    clearFilter: clearUrlFilter,
    
    // Selection
    selectDomain: (id: string) => {
      if (isValidDomainId(id)) {
        dispatch({ type: 'SELECT_DOMAIN', id });
      }
    },
    
    deselectDomain: (id: string) => {
      dispatch({ type: 'DESELECT_DOMAIN', id });
    },
    
    toggleDomain: (id: string) => {
      if (isValidDomainId(id)) {
        dispatch({ type: 'TOGGLE_DOMAIN', id });
      }
    },
    
    selectAll: () => {
      const ids = domains
        .map(d => d.id)
        .filter((id): id is string => id !== undefined);
      dispatch({ type: 'SELECT_ALL', ids });
    },
    
    deselectAll: () => {
      dispatch({ type: 'DESELECT_ALL' });
    },
    
    selectAllMatching: async () => {
      // TODO: Implement when backend supports returning all matching IDs
      // For now, just select current page
      const ids = domains
        .map(d => d.id)
        .filter((id): id is string => id !== undefined);
      dispatch({ type: 'SELECT_ALL', ids });
    },
    
    // Drawer
    inspectDomain: (id: string) => {
      if (isValidDomainId(id)) {
        dispatch({ type: 'INSPECT_DOMAIN', id });
      }
    },
    
    closeDrawer: () => {
      dispatch({ type: 'CLOSE_DRAWER' });
    },
    
    // Data
    refresh: async () => {
      await refetch();
    },
    
    invalidate: () => {
      // RTK Query handles cache invalidation
      refetch();
    },
  }), [
    state.pageCount, state.page, state.hasNextPage, state.hasPrevPage,
    state.sortKey, state.sortDir, domains,
    setUrlFilter, setUrlFilters, resetUrlFilters, clearUrlFilter,
    refetch,
  ]);
  
  return [state, actions] as const;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export type { DomainsExplorerState, DomainsExplorerActions };
export { useDomainFilters };
