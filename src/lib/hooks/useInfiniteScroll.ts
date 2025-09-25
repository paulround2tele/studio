/**
 * Infinite scroll hook for activity tables
 * Compatible with backend pagination structure
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PageInfo } from '@/lib/api-client/models/page-info';

export interface InfiniteScrollState {
  isLoading: boolean;
  hasMore: boolean;
  error?: string;
}

export interface InfiniteScrollActions {
  loadMore: () => void;
  reset: () => void;
  setError: (error?: string) => void;
}

export interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScrollActivity(
  // fetchFn returns cursor-based pageInfo (OpenAPI) or legacy numeric pagination fields
  fetchFn: (page: number) => Promise<{ data: any[]; pageInfo?: PageInfo & { current?: number; total?: number }; totalCount?: number }>,
  options: UseInfiniteScrollOptions = {}
) {
  const [data, setData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [state, setState] = useState<InfiniteScrollState>({
    isLoading: false,
    hasMore: true
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const result = await fetchFn(currentPage);
      
      setData(prev => [...prev, ...result.data]);
      setCurrentPage(prev => prev + 1);
      
      // Determine continuation:
      // 1. If cursor PageInfo exists, rely on hasNextPage.
      // 2. If numeric fallback fields (current/total) present, use them.
      // 3. Else if totalCount provided, compare accumulated length.
      // 4. Fallback: assume more if we received any data for this page.
      let hasMore = true;
      if (result.pageInfo) {
        if (typeof (result.pageInfo as any).hasNextPage === 'boolean') {
          hasMore = (result.pageInfo as any).hasNextPage;
        } else if ((result.pageInfo as any).current !== undefined && (result.pageInfo as any).total !== undefined) {
          hasMore = ((result.pageInfo as any).current) < ((result.pageInfo as any).total);
        }
      } else if (typeof result.totalCount === 'number') {
        hasMore = (data.length + result.data.length) < result.totalCount;
      } else {
        hasMore = result.data.length > 0;
      }
        
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasMore
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    }
  }, [fetchFn, currentPage, state.isLoading, state.hasMore]);

  const reset = useCallback(() => {
    setData([]);
    setCurrentPage(1);
    setState({ isLoading: false, hasMore: true });
  }, []);

  const actions: InfiniteScrollActions = {
    loadMore,
    reset,
    setError: (error?: string) => setState(prev => ({ ...prev, error }))
  };

  // Setup intersection observer
  useEffect(() => {
    if (!sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !state.isLoading && state.hasMore) {
          loadMore();
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px'
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, state.isLoading, state.hasMore, options.threshold, options.rootMargin]);

  return {
    data,
    state,
    actions,
    sentinelRef
  };
}