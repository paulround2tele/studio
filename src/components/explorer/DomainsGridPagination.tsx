/**
 * Phase 7.2: Domains Grid Pagination
 * 
 * Pagination controls for the domains grid.
 * 
 * INVARIANTS:
 * - All pagination state comes from props (useDomainsExplorer authority)
 * - NO local state for page, pageSize, etc.
 * - Callbacks delegate to parent
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

'use client';

import React from 'react';
import { 
  ChevronFirstIcon, 
  ChevronLastIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  RefreshIcon,
} from '@/icons';
import { VALID_PAGE_SIZES, type PageSize } from '@/types/explorer/state';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

export interface DomainsGridPaginationProps {
  /** Current page (1-indexed) */
  page: number;
  
  /** Items per page */
  pageSize: PageSize;
  
  /** Total pages */
  pageCount: number;
  
  /** Total items */
  total: number;
  
  /** Can go forward */
  hasNextPage: boolean;
  
  /** Can go backward */
  hasPrevPage: boolean;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Navigate to specific page */
  onGoToPage: (page: number) => void;
  
  /** Go to next page */
  onNextPage: () => void;
  
  /** Go to previous page */
  onPrevPage: () => void;
  
  /** Change page size */
  onSetPageSize: (size: PageSize) => void;
  
  /** Refresh data */
  onRefresh: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DomainsGridPagination
 * 
 * Pure presentation component for pagination controls.
 * All state comes from props (useDomainsExplorer authority).
 */
export function DomainsGridPagination({
  page,
  pageSize,
  pageCount,
  total,
  hasNextPage,
  hasPrevPage,
  isLoading,
  onGoToPage,
  onNextPage,
  onPrevPage,
  onSetPageSize,
  onRefresh,
}: DomainsGridPaginationProps) {
  // Calculate display range
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div 
      className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4"
      data-testid="domains-grid-pagination"
    >
      {/* Left: Item count and page size */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400" data-testid="domains-grid-pagination-info">
          {total > 0 ? (
            <>
              Showing <strong className="text-gray-800 dark:text-white">{startItem.toLocaleString()}</strong>–<strong className="text-gray-800 dark:text-white">{endItem.toLocaleString()}</strong> of{' '}
              <strong className="text-gray-800 dark:text-white">{total.toLocaleString()}</strong>
            </>
          ) : (
            'No results'
          )}
        </span>

        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Per page:</span>
          <select
            value={String(pageSize)}
            onChange={(e) => onSetPageSize(parseInt(e.target.value, 10) as PageSize)}
            disabled={isLoading}
            className="h-8 w-[70px] rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-800 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            data-testid="domains-grid-page-size-trigger"
          >
            {VALID_PAGE_SIZES.map((size) => (
              <option key={size} value={String(size)}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Navigation */}
      <div className="flex items-center gap-2">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          data-testid="domains-grid-refresh"
          aria-label="Refresh"
        >
          <RefreshIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => onGoToPage(1)}
            disabled={!hasPrevPage || isLoading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            data-testid="domains-grid-first-page"
            aria-label="First page"
          >
            <ChevronFirstIcon className="h-4 w-4" />
          </button>

          {/* Previous page */}
          <button
            onClick={onPrevPage}
            disabled={!hasPrevPage || isLoading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            data-testid="domains-grid-prev-page"
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {/* Page indicator */}
          <span 
            className="px-3 text-sm min-w-[80px] text-center text-gray-700 dark:text-gray-300"
            data-testid="domains-grid-page-indicator"
          >
            Page <strong className="text-gray-800 dark:text-white">{page}</strong>
            {pageCount > 0 && <> of <strong className="text-gray-800 dark:text-white">{pageCount}</strong></>}
          </span>

          {/* Next page */}
          <button
            onClick={onNextPage}
            disabled={!hasNextPage || isLoading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            data-testid="domains-grid-next-page"
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onGoToPage(pageCount)}
            disabled={!hasNextPage || isLoading || pageCount === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            data-testid="domains-grid-last-page"
            aria-label="Last page"
          >
            <ChevronLastIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
