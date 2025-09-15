import { useCallback, useMemo, useRef, useState } from 'react';
import { useGetCampaignDomainsQuery } from '@/store/api/campaignApi';
import type { CampaignDomainsListResponse } from '@/lib/api-client/models/campaign-domains-list-response';

export interface UsePaginatedDomainsOptions {
  pageSize: number;
  infinite?: boolean; // start in infinite accumulation mode
  virtualizationThreshold?: number; // row count after which consumer should virtualize
  sortBy?: string; // future backend pass-through
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>; // future backend pass-through
}

export interface PaginatedDomainsState {
  page: number;
  pageSize: number;
  pageCount: number | undefined; // undefined when total not known
  total: number | undefined;
  items: any[]; // current page OR accumulated if infinite
  loading: boolean;
  error?: string;
  hasNext: boolean;
  hasPrev: boolean;
  infinite: boolean;
  shouldVirtualize: boolean;
  cursorMode: boolean; // using hasNextPage without reliable total
}

export interface PaginatedDomainsApi {
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  goTo: (p: number) => void;
  toggleInfinite: (v?: boolean) => void;
  setPageSize: (n: number) => void;
  refresh: () => void;
}

interface InternalPageCacheEntry {
  items: any[];
}

// Hook encapsulating numeric (offset/total) and cursor (hasNextPage) pagination.
export function usePaginatedDomains(campaignId: string, opts: UsePaginatedDomainsOptions): [PaginatedDomainsState, PaginatedDomainsApi] {
  const { pageSize: initialPageSize, infinite: initialInfinite = false, virtualizationThreshold = 2000 } = opts;
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [page, setPage] = useState(1);
  const [infinite, setInfinite] = useState(initialInfinite);
  const [version, setVersion] = useState(0); // bump to refetch current page

  const pageCache = useRef<Map<number, InternalPageCacheEntry>>(new Map());
  const accumulated = useRef<any[]>([]);

  // Compute offset for numeric paging
  const offset = (page - 1) * pageSize;

  const { data, isFetching, error, refetch } = useGetCampaignDomainsQuery(
    { campaignId, limit: pageSize, offset },
    { skip: !campaignId }
  );

  const total = data?.total ?? undefined;
  const pageInfo = (data as any)?.pageInfo;
  const cursorMode = !total && !!pageInfo; // heuristic: no total but have cursor metadata
  const hasNextFromCursor = cursorMode ? !!pageInfo?.hasNextPage : false;

  // Cache current page items
  const currentItems = data?.items || [];
  if (!isFetching && currentItems.length) {
    pageCache.current.set(page, { items: currentItems });
    if (infinite) {
      // Append new unique items (simple concat; could enhance with domain id uniqueness)
      const seen = new Set(accumulated.current.map((d: any) => d.id || d.domain));
      const appended = currentItems.filter(d => !seen.has(d.id || d.domain));
      if (appended.length) {
        accumulated.current = accumulated.current.concat(appended);
      }
    } else {
      accumulated.current = currentItems; // keep in sync for consumer simplicity
    }
  }

  const pageCount = total ? Math.max(1, Math.ceil(total / pageSize)) : (cursorMode ? undefined : 1);
  const hasNextNumeric = total ? page < (pageCount || 1) : false;
  const hasNext = cursorMode ? hasNextFromCursor : hasNextNumeric;
  const hasPrev = page > 1;

  const state: PaginatedDomainsState = {
    page,
    pageSize,
    pageCount,
    total,
    items: infinite ? accumulated.current : (pageCache.current.get(page)?.items || currentItems),
    loading: isFetching,
    error: error ? (error as any).message || 'Failed to load domains' : undefined,
    hasNext,
    hasPrev,
    infinite,
    shouldVirtualize: infinite && (accumulated.current.length >= virtualizationThreshold),
    cursorMode,
  };

  const goTo = useCallback((p: number) => {
    setPage(prev => {
      if (p === prev) return prev;
      return Math.max(1, pageCount ? Math.min(p, pageCount) : p);
    });
  }, [pageCount]);

  const next = useCallback(() => {
    if (state.loading) return;
    if (!state.hasNext && !cursorMode) return;
    setPage(p => p + 1);
  }, [state.loading, state.hasNext, cursorMode]);

  const prev = useCallback(() => {
    if (state.loading) return;
    setPage(p => Math.max(1, p - 1));
  }, [state.loading]);

  const first = useCallback(() => { if (!state.loading) setPage(1); }, [state.loading]);
  const last = useCallback(() => { if (!state.loading && pageCount) setPage(pageCount); }, [state.loading, pageCount]);

  const setPageSize = useCallback((n: number) => {
    setPageSizeState(n);
    setPage(1);
    pageCache.current.clear();
    accumulated.current = [];
  }, []);

  const toggleInfinite = useCallback((v?: boolean) => {
    setInfinite(prev => {
      const nextVal = v !== undefined ? v : !prev;
      if (!nextVal) {
        // Leaving infinite mode: keep only current page
        accumulated.current = pageCache.current.get(page)?.items || currentItems;
      }
      return nextVal;
    });
  }, [page, currentItems]);

  const refresh = useCallback(() => {
    pageCache.current.clear();
    if (!infinite) accumulated.current = [];
    setVersion(v => v + 1);
    refetch();
  }, [infinite, refetch]);

  const api: PaginatedDomainsApi = useMemo(() => ({
    next, prev, first, last, goTo, toggleInfinite, setPageSize, refresh
  }), [next, prev, first, last, goTo, toggleInfinite, setPageSize, refresh]);

  return [state, api];
}
