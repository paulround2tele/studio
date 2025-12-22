/**
 * Phase 7: useDomainsExplorer Hook Tests
 * 
 * Tests for the main explorer hook state transitions and invariants.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { campaignApi } from '@/store/api/campaignApi';
import React from 'react';

// Mock nuqs
jest.mock('nuqs', () => ({
  useQueryState: jest.fn(() => [null, jest.fn()]),
  parseAsString: { withDefault: (v: unknown) => ({ parse: () => v, serialize: (x: unknown) => x }) },
  parseAsInteger: { withDefault: (v: unknown) => ({ parse: () => v, serialize: (x: unknown) => x }) },
  parseAsBoolean: { withDefault: (v: unknown) => ({ parse: () => v, serialize: (x: unknown) => x }) },
  createParser: (opts: { parse: (v: string) => unknown; serialize: (v: unknown) => string }) => ({
    ...opts,
    withDefault: () => opts,
  }),
}));

// Mock the filter hook for isolated testing
jest.mock('@/lib/hooks/explorer/useDomainFilters', () => ({
  useDomainFilters: () => ({
    filters: {},
    activeFilterCount: 0,
    setFilter: jest.fn(),
    setFilters: jest.fn(),
    clearFilter: jest.fn(),
    resetFilters: jest.fn(),
    isDefault: true,
  }),
}));

// Mock RTK Query
const mockDomains = [
  { id: 'domain-1', domain: 'example1.com', features: { richness: { score: 85 } } },
  { id: 'domain-2', domain: 'example2.com', features: { richness: { score: 72 } } },
  { id: 'domain-3', domain: 'example3.com', features: { richness: { score: 60 } } },
];

const mockResponse = {
  campaignId: 'test-campaign',
  items: mockDomains,
  total: 100,
  aggregates: {
    dns: { ok: 80, error: 10, pending: 10 },
    http: { ok: 70, error: 20, pending: 10 },
    lead: { match: 30, no_match: 40, pending: 30 },
  },
};

jest.mock('@/store/api/campaignApi', () => ({
  ...jest.requireActual('@/store/api/campaignApi'),
  useGetCampaignDomainsQuery: jest.fn(() => ({
    data: mockResponse,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// Import after mocks
import { useDomainsExplorer } from '@/lib/hooks/explorer/useDomainsExplorer';

describe('useDomainsExplorer', () => {
  const createWrapper = () => {
    const store = configureStore({
      reducer: {
        [campaignApi.reducerPath]: campaignApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(campaignApi.middleware),
    });

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    TestWrapper.displayName = 'TestWrapper';
    return TestWrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes with correct campaignId', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test-campaign-123'),
        { wrapper: createWrapper() }
      );

      const [state] = result.current;
      expect(state.campaignId).toBe('test-campaign-123');
    });

    it('initializes with default pagination', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      const [state] = result.current;
      expect(state.page).toBe(1);
      expect(state.pageSize).toBe(50);
    });

    it('initializes with default sort', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      const [state] = result.current;
      expect(state.sortKey).toBe('richness_score');
      expect(state.sortDir).toBe('desc');
    });

    it('initializes with empty selection', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      const [state] = result.current;
      expect(state.selectedIds.size).toBe(0);
      expect(state.selectionCount).toBe(0);
    });

    it('initializes with drawer closed', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      const [state] = result.current;
      expect(state.isDrawerOpen).toBe(false);
      expect(state.inspectedDomainId).toBeNull();
    });
  });

  describe('pagination actions', () => {
    it('goToPage updates page number', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].goToPage(3);
      });

      expect(result.current[0].page).toBe(2); // Capped at pageCount
    });

    it('nextPage increments page when hasNextPage', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      // Initial state should have hasNextPage true (100 total, 50 per page)
      act(() => {
        result.current[1].nextPage();
      });

      expect(result.current[0].page).toBe(2);
    });

    it('prevPage decrements page when hasPrevPage', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      // Go to page 2 first
      act(() => {
        result.current[1].goToPage(2);
      });

      act(() => {
        result.current[1].prevPage();
      });

      expect(result.current[0].page).toBe(1);
    });

    it('prevPage does nothing on page 1', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].prevPage();
      });

      expect(result.current[0].page).toBe(1);
    });

    it('setPageSize resets to page 1', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].goToPage(2);
      });

      act(() => {
        result.current[1].setPageSize(25);
      });

      expect(result.current[0].page).toBe(1);
      expect(result.current[0].pageSize).toBe(25);
    });

    it('setPageSize rejects invalid sizes', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].setPageSize(30 as 25 | 50 | 100); // Invalid
      });

      expect(result.current[0].pageSize).toBe(50); // Unchanged
    });
  });

  describe('sorting actions', () => {
    it('setSort updates sortKey and sortDir', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].setSort('keywords_unique', 'asc');
      });

      expect(result.current[0].sortKey).toBe('keywords_unique');
      expect(result.current[0].sortDir).toBe('asc');
    });

    it('setSort resets to page 1', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].goToPage(2);
      });

      act(() => {
        result.current[1].setSort('created_at');
      });

      expect(result.current[0].page).toBe(1);
    });

    it('toggleSort flips direction for same key', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      // Default is richness_score desc
      act(() => {
        result.current[1].toggleSort('richness_score');
      });

      expect(result.current[0].sortDir).toBe('asc');

      act(() => {
        result.current[1].toggleSort('richness_score');
      });

      expect(result.current[0].sortDir).toBe('desc');
    });

    it('toggleSort sets desc for different key', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].toggleSort('keywords_unique');
      });

      expect(result.current[0].sortKey).toBe('keywords_unique');
      expect(result.current[0].sortDir).toBe('desc');
    });
  });

  describe('selection actions', () => {
    it('selectDomain adds ID to selection', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].selectDomain('domain-1');
      });

      expect(result.current[0].selectedIds.has('domain-1')).toBe(true);
      expect(result.current[0].selectionCount).toBe(1);
    });

    it('deselectDomain removes ID from selection', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].selectDomain('domain-1');
        result.current[1].selectDomain('domain-2');
      });

      act(() => {
        result.current[1].deselectDomain('domain-1');
      });

      expect(result.current[0].selectedIds.has('domain-1')).toBe(false);
      expect(result.current[0].selectedIds.has('domain-2')).toBe(true);
    });

    it('toggleDomain toggles selection state', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].toggleDomain('domain-1');
      });

      expect(result.current[0].selectedIds.has('domain-1')).toBe(true);

      act(() => {
        result.current[1].toggleDomain('domain-1');
      });

      expect(result.current[0].selectedIds.has('domain-1')).toBe(false);
    });

    it('selectAll selects all domains on current page', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].selectAll();
      });

      expect(result.current[0].selectedIds.size).toBe(3);
      expect(result.current[0].isAllSelected).toBe(true);
    });

    it('deselectAll clears all selections', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].selectAll();
      });

      act(() => {
        result.current[1].deselectAll();
      });

      expect(result.current[0].selectedIds.size).toBe(0);
      expect(result.current[0].isAllSelected).toBe(false);
    });

    it('selectDomain rejects empty string', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].selectDomain('');
      });

      expect(result.current[0].selectionCount).toBe(0);
    });
  });

  describe('drawer actions', () => {
    it('inspectDomain opens drawer', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].inspectDomain('domain-1');
      });

      expect(result.current[0].inspectedDomainId).toBe('domain-1');
      expect(result.current[0].isDrawerOpen).toBe(true);
    });

    it('closeDrawer closes drawer', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].inspectDomain('domain-1');
      });

      act(() => {
        result.current[1].closeDrawer();
      });

      expect(result.current[0].inspectedDomainId).toBeNull();
      expect(result.current[0].isDrawerOpen).toBe(false);
    });

    it('inspectDomain rejects empty string', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].inspectDomain('');
      });

      expect(result.current[0].isDrawerOpen).toBe(false);
    });
  });

  describe('data from API', () => {
    it('populates domains from API response', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      const [state] = result.current;
      expect(state.domains).toHaveLength(3);
      expect(state.domains[0].domain).toBe('example1.com');
    });

    it('computes richnessScore from features', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      const [state] = result.current;
      expect(state.domains[0].richnessScore).toBe(85);
    });

    it('populates total from API response', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      expect(result.current[0].total).toBe(100);
    });

    it('populates aggregates from API response', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      expect(result.current[0].aggregates.dns).toBeDefined();
      expect(result.current[0].aggregates.http).toBeDefined();
    });
  });

  describe('derived state', () => {
    it('computes pageCount from total and pageSize', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      // 100 total / 50 per page = 2 pages
      expect(result.current[0].pageCount).toBe(2);
    });

    it('computes hasNextPage correctly', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      expect(result.current[0].hasNextPage).toBe(true);
    });

    it('finds inspectedDomain from domains array', () => {
      const { result } = renderHook(
        () => useDomainsExplorer('test'),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current[1].inspectDomain('domain-2');
      });

      expect(result.current[0].inspectedDomain?.domain).toBe('example2.com');
    });
  });
});
