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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronFirst, 
  ChevronLast, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
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
      className="flex items-center justify-between pt-4 border-t mt-4"
      data-testid="domains-grid-pagination"
    >
      {/* Left: Item count and page size */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground" data-testid="domains-grid-pagination-info">
          {total > 0 ? (
            <>
              Showing <strong>{startItem.toLocaleString()}</strong>–<strong>{endItem.toLocaleString()}</strong> of{' '}
              <strong>{total.toLocaleString()}</strong>
            </>
          ) : (
            'No results'
          )}
        </span>

        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onSetPageSize(parseInt(v, 10) as PageSize)}
            disabled={isLoading}
          >
            <SelectTrigger 
              className="h-8 w-[70px]"
              data-testid="domains-grid-page-size-trigger"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALID_PAGE_SIZES.map((size) => (
                <SelectItem 
                  key={size} 
                  value={String(size)}
                  data-testid={`domains-grid-page-size-${size}`}
                >
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: Navigation */}
      <div className="flex items-center gap-2">
        {/* Refresh button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          data-testid="domains-grid-refresh"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onGoToPage(1)}
            disabled={!hasPrevPage || isLoading}
            data-testid="domains-grid-first-page"
            aria-label="First page"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevPage}
            disabled={!hasPrevPage || isLoading}
            data-testid="domains-grid-prev-page"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page indicator */}
          <span 
            className="px-3 text-sm min-w-[80px] text-center"
            data-testid="domains-grid-page-indicator"
          >
            Page <strong>{page}</strong>
            {pageCount > 0 && <> of <strong>{pageCount}</strong></>}
          </span>

          {/* Next page */}
          <Button
            variant="outline"
            size="icon"
            onClick={onNextPage}
            disabled={!hasNextPage || isLoading}
            data-testid="domains-grid-next-page"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onGoToPage(pageCount)}
            disabled={!hasNextPage || isLoading || pageCount === 0}
            data-testid="domains-grid-last-page"
            aria-label="Last page"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
