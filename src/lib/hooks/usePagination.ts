/**
 * Pagination hooks compatible with backend PageInfo structure
 * Uses backend-generated types instead of custom pagination types
 */

import { useState, useMemo } from 'react';

// Simple local pagination types
interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

interface PaginationActions {
  goToPage: (page: number) => void;
  changePageSize: (size: number) => void;
  reset: () => void;
}

interface PaginationHook {
  state: PaginationState;
  actions: PaginationActions;
  params: {
    current: number;
    pageSize: number;
    total: number;
  };
}

type PaginationContext = 'table' | 'list' | 'default' | 'dashboard' | 'detail';

function getDefaultPageSize(context?: PaginationContext): number {
  switch (context) {
    case 'table': return 50;
    case 'list': return 25;
    default: return 20;
  }
}

// Base pagination hook
export function usePagination(
  totalCount: number, 
  context?: PaginationContext
): PaginationHook {
  const defaultPageSize = getDefaultPageSize(context);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const state: PaginationState = useMemo(() => ({
    currentPage,
    pageSize,
    totalCount
  }), [currentPage, pageSize, totalCount]);

  const actions: PaginationActions = useMemo(() => ({
    goToPage: (page: number) => setCurrentPage(Math.max(1, page)),
    changePageSize: (size: number) => {
      setPageSize(size);
      setCurrentPage(1); // Reset to first page when changing size
    },
    reset: () => {
      setCurrentPage(1);
      setPageSize(defaultPageSize);
    }
  }), [defaultPageSize]);

  const params = useMemo(() => ({
    current: currentPage,
    pageSize: pageSize,
    total: totalCount,
    count: Math.min(pageSize, Math.max(0, totalCount - ((currentPage - 1) * pageSize)))
  }), [currentPage, pageSize, totalCount]);

  return { state, actions, params };
}

// Campaign-specific pagination hook
export function useCampaignPagination(
  totalCount: number, 
  context: PaginationContext = 'dashboard'
): PaginationHook {
  return usePagination(totalCount, context);
}

// Domain-specific pagination hook  
export function useDomainPagination(
  totalCount: number,
  context: PaginationContext = 'detail'
): PaginationHook {
  return usePagination(totalCount, context);
}