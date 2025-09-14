import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { usePaginatedDomains } from '@/lib/hooks/usePaginatedDomains';

// Mock campaignApi slice endpoint selector & hook
jest.mock('@/store/api/campaignApi', () => {
  let pages: Record<number, { items: any[]; total: number }> = {};
  return {
    __esModule: true,
    __setPages: (p: typeof pages) => { pages = p; },
    useGetCampaignDomainsQuery: ({ limit, offset }: any) => {
      const page = Math.floor(offset / limit) + 1;
      const data = pages[page];
      return { data: data ? { items: data.items, total: data.total } : { items: [], total: Object.values(pages)[0]?.total || 0 }, isFetching: false, error: undefined, refetch: () => {} };
    }
  };
});

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = configureStore({ reducer: { campaignApi: (s = {}) => s } });
  return <Provider store={store}>{children}</Provider>;
};

describe('usePaginatedDomains', () => {
  const { __setPages } = require('@/store/api/campaignApi');

  beforeEach(() => {
    __setPages({
      1: { items: [{ id: 1 }, { id: 2 }], total: 5 },
      2: { items: [{ id: 3 }, { id: 4 }], total: 5 },
      3: { items: [{ id: 5 }], total: 5 }
    });
  });

  it('navigates pages and respects pageCount', () => {
    const { result } = renderHook(() => usePaginatedDomains('cmp1', { pageSize: 2 }), { wrapper });
    expect(result.current[0].items.length).toBe(2);
    act(() => { result.current[1].next(); });
    expect(result.current[0].page).toBe(2);
    act(() => { result.current[1].last(); });
    expect(result.current[0].page).toBe(3);
    act(() => { result.current[1].prev(); });
    expect(result.current[0].page).toBe(2);
  });

  it('toggles infinite mode and accumulates', () => {
    const { result } = renderHook(() => usePaginatedDomains('cmp1', { pageSize: 2 }), { wrapper });
    act(() => { result.current[1].toggleInfinite(true); });
    act(() => { result.current[1].next(); }); // page 2
    expect(result.current[0].items.length).toBe(4);
  });
});
