/**
 * Phase 7: Explorer State Tests
 * 
 * Tests for state creation, derivation, and validation utilities.
 */

import {
  createInitialExplorerState,
  deriveExplorerState,
  isValidPageSize,
  DEFAULT_SORT_KEY,
  DEFAULT_SORT_DIR,
  DEFAULT_PAGE_SIZE,
  VALID_PAGE_SIZES,
} from '../explorer/state';

import type { DomainRow, DomainSortKey, PageSize } from '../explorer/state';

describe('Explorer State', () => {
  describe('createInitialExplorerState', () => {
    it('creates state with correct campaignId', () => {
      const state = createInitialExplorerState('test-campaign-123');
      expect(state.campaignId).toBe('test-campaign-123');
    });

    it('initializes with empty domains', () => {
      const state = createInitialExplorerState('test');
      expect(state.domains).toEqual([]);
      expect(state.total).toBe(0);
    });

    it('initializes with loading true', () => {
      const state = createInitialExplorerState('test');
      expect(state.isLoading).toBe(true);
      expect(state.isRefetching).toBe(false);
      expect(state.error).toBeNull();
    });

    it('initializes pagination at page 1', () => {
      const state = createInitialExplorerState('test');
      expect(state.page).toBe(1);
      expect(state.pageSize).toBe(DEFAULT_PAGE_SIZE);
      expect(state.pageCount).toBe(0);
      expect(state.hasNextPage).toBe(false);
      expect(state.hasPrevPage).toBe(false);
    });

    it('initializes with default sort', () => {
      const state = createInitialExplorerState('test');
      expect(state.sortKey).toBe(DEFAULT_SORT_KEY);
      expect(state.sortDir).toBe(DEFAULT_SORT_DIR);
    });

    it('initializes with empty filters', () => {
      const state = createInitialExplorerState('test');
      expect(state.filters).toEqual({});
      expect(state.activeFilterCount).toBe(0);
    });

    it('initializes with empty selection', () => {
      const state = createInitialExplorerState('test');
      expect(state.selectedIds.size).toBe(0);
      expect(state.isAllSelected).toBe(false);
      expect(state.selectionCount).toBe(0);
    });

    it('initializes with closed drawer', () => {
      const state = createInitialExplorerState('test');
      expect(state.inspectedDomainId).toBeNull();
      expect(state.inspectedDomain).toBeNull();
      expect(state.isDrawerOpen).toBe(false);
    });
  });

  describe('deriveExplorerState', () => {
    const mockDomains: DomainRow[] = [
      { id: 'domain-1', domain: 'example1.com' },
      { id: 'domain-2', domain: 'example2.com' },
      { id: 'domain-3', domain: 'example3.com' },
    ];

    const baseState = {
      campaignId: 'test',
      domains: mockDomains,
      total: 100,
      aggregates: {},
      isLoading: false,
      isRefetching: false,
      error: null,
      page: 1,
      pageSize: 50 as PageSize,
      hasNextPage: true,
      cursor: null,
      sortKey: 'richness_score' as DomainSortKey,
      sortDir: 'desc' as const,
      filters: {},
      activeFilterCount: 0,
      selectedIds: new Set<string>(),
      inspectedDomainId: null,
    };

    it('derives pageCount from total and pageSize', () => {
      const derived = deriveExplorerState(baseState, mockDomains);
      expect(derived.pageCount).toBe(2); // 100 / 50 = 2
    });

    it('derives pageCount correctly for non-even division', () => {
      const derived = deriveExplorerState({ ...baseState, total: 75 }, mockDomains);
      expect(derived.pageCount).toBe(2); // ceil(75 / 50) = 2
    });

    it('derives hasPrevPage based on page', () => {
      expect(deriveExplorerState({ ...baseState, page: 1 }, mockDomains).hasPrevPage).toBe(false);
      expect(deriveExplorerState({ ...baseState, page: 2 }, mockDomains).hasPrevPage).toBe(true);
    });

    it('derives isAllSelected when all domains on page are selected', () => {
      const allSelected = new Set(['domain-1', 'domain-2', 'domain-3']);
      const derived = deriveExplorerState({ ...baseState, selectedIds: allSelected }, mockDomains);
      expect(derived.isAllSelected).toBe(true);
    });

    it('derives isAllSelected as false when not all selected', () => {
      const partialSelected = new Set(['domain-1', 'domain-2']);
      const derived = deriveExplorerState({ ...baseState, selectedIds: partialSelected }, mockDomains);
      expect(derived.isAllSelected).toBe(false);
    });

    it('derives selectionCount from selectedIds', () => {
      const selected = new Set(['domain-1', 'domain-2']);
      const derived = deriveExplorerState({ ...baseState, selectedIds: selected }, mockDomains);
      expect(derived.selectionCount).toBe(2);
    });

    it('derives isDrawerOpen from inspectedDomainId', () => {
      expect(deriveExplorerState({ ...baseState, inspectedDomainId: null }, mockDomains).isDrawerOpen).toBe(false);
      expect(deriveExplorerState({ ...baseState, inspectedDomainId: 'domain-1' }, mockDomains).isDrawerOpen).toBe(true);
    });

    it('finds inspectedDomain from domains array', () => {
      const derived = deriveExplorerState({ ...baseState, inspectedDomainId: 'domain-2' }, mockDomains);
      expect(derived.inspectedDomain).toEqual({ id: 'domain-2', domain: 'example2.com' });
    });

    it('returns null inspectedDomain if not found', () => {
      const derived = deriveExplorerState({ ...baseState, inspectedDomainId: 'nonexistent' }, mockDomains);
      expect(derived.inspectedDomain).toBeNull();
    });

    it('handles empty domains array', () => {
      const derived = deriveExplorerState({ ...baseState, total: 0 }, []);
      expect(derived.pageCount).toBe(0);
      expect(derived.isAllSelected).toBe(false);
    });
  });

  describe('isValidPageSize', () => {
    it('accepts valid page sizes', () => {
      expect(isValidPageSize(25)).toBe(true);
      expect(isValidPageSize(50)).toBe(true);
      expect(isValidPageSize(100)).toBe(true);
    });

    it('rejects invalid page sizes', () => {
      expect(isValidPageSize(10)).toBe(false);
      expect(isValidPageSize(200)).toBe(false);
      expect(isValidPageSize(0)).toBe(false);
      expect(isValidPageSize(-1)).toBe(false);
      expect(isValidPageSize('50')).toBe(false);
    });
  });

  describe('constants', () => {
    it('has correct defaults', () => {
      expect(DEFAULT_SORT_KEY).toBe('richness_score');
      expect(DEFAULT_SORT_DIR).toBe('desc');
      expect(DEFAULT_PAGE_SIZE).toBe(50);
    });

    it('has valid page sizes array', () => {
      expect(VALID_PAGE_SIZES).toEqual([25, 50, 100]);
    });
  });
});
