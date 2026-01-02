/**
 * Phase 7.2: DomainsGrid Main Container
 * 
 * INVARIANTS:
 * - useDomainsExplorer is the ONLY state authority
 * - NO local state for pagination, sorting, or filtering
 * - Respects isHydrated before rendering data
 * - Surfaces isSortNonAuthoritative to header components
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

'use client';

import React from 'react';
import { useDomainsExplorer } from '@/lib/hooks/explorer/useDomainsExplorer';
import { DomainsGridTable } from './DomainsGridTable';
import { DomainsGridPagination } from './DomainsGridPagination';
import { DomainsGridHydrationGuard } from './DomainsGridHydrationGuard';
import { DomainsGridEmptyState } from './DomainsGridEmptyState';
import Alert from '@/components/ta/ui/alert/Alert';
import { RefreshIcon } from '@/icons';
import Button from '@/components/ta/ui/button/Button';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

export interface DomainsGridProps {
  /** Campaign ID to display domains for */
  campaignId: string;
  
  /** Optional title override */
  title?: string;
  
  /** Optional description override */
  description?: string;
  
  /** Enable row selection */
  enableSelection?: boolean;
  
  /** Callback when domain row clicked (opens drawer) */
  onDomainClick?: (domainId: string) => void;
  
  /** Skip initial fetch (for lazy loading) */
  skip?: boolean;
  
  /** Poll interval in ms (0 = no polling) */
  pollingInterval?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DomainsGrid - Main container for domain exploration grid
 * 
 * This component is the ONLY entry point for rendering domain grids.
 * It delegates ALL state to useDomainsExplorer hook.
 * 
 * NO LOCAL STATE for:
 * - Pagination (page, pageSize, pageCount)
 * - Sorting (sortKey, sortDir)
 * - Filtering (filters)
 * - Selection (selectedIds)
 * - Drawer state (inspectedDomainId)
 * 
 * All of the above comes from useDomainsExplorer.
 */
export function DomainsGrid({
  campaignId,
  title = 'Domain Results',
  description,
  enableSelection = true,
  onDomainClick,
  skip = false,
  pollingInterval = 0,
}: DomainsGridProps) {
  // === SINGLE SOURCE OF TRUTH ===
  // This is the ONLY state authority. No useState() for data concerns.
  const [state, actions] = useDomainsExplorer(campaignId, {
    skip,
    pollingInterval,
  });

  // === DERIVED VALUES FROM STATE ===
  const {
    domains,
    total,
    aggregates,
    isLoading,
    isRefetching,
    error,
    page,
    pageSize,
    pageCount,
    hasNextPage,
    hasPrevPage,
    sortKey,
    sortDir,
    isSortNonAuthoritative,
    // filters - reserved for future filter UI
    activeFilterCount,
    selectedIds,
    isAllSelected,
    selectionCount,
    // inspectedDomainId - used by drawer component (Phase 7.3)
    // isDrawerOpen - used by drawer component (Phase 7.3)
  } = state;

  // === HYDRATION GUARD ===
  // useDomainFilters exposes isHydrated, but useDomainsExplorer consumes it internally.
  // For grid display safety, we check isLoading on first render.
  // The hydration guard component handles SSR → CSR transition gracefully.

  // === DESCRIPTION DERIVATION ===
  const gridDescription = description ?? (
    total !== undefined 
      ? `${total.toLocaleString()} domains${activeFilterCount > 0 ? ` • ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : ''}`
      : 'Loading...'
  );

  // === ERROR STATE ===
  if (error && !isLoading && domains.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" data-testid="domains-grid-error">
        <div className="p-6">
          <Alert
            variant="error"
            title="Error"
            message={`Failed to load domains: ${error}`}
          />
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={actions.refresh}
              startIcon={<RefreshIcon className="h-4 w-4" />}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DomainsGridHydrationGuard>
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" data-testid="domains-grid">
        {/* Header */}
        <div className="p-6 pb-4" data-testid="domains-grid-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white" data-testid="domains-grid-title">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="domains-grid-description">
                {gridDescription}
              </p>
            </div>
            
            {/* Aggregates Summary */}
            {aggregates && (
              <div className="text-xs text-muted-foreground flex gap-4" data-testid="domains-grid-aggregates">
                {aggregates.dns && (
                  <span data-testid="domains-grid-agg-dns">
                    DNS: {aggregates.dns.ok ?? 0} ok / {aggregates.dns.error ?? 0} err
                  </span>
                )}
                {aggregates.http && (
                  <span data-testid="domains-grid-agg-http">
                    HTTP: {aggregates.http.ok ?? 0} ok / {aggregates.http.error ?? 0} err
                  </span>
                )}
                {aggregates.lead && (
                  <span data-testid="domains-grid-agg-lead">
                    Leads: {aggregates.lead.match ?? 0} match
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Selection summary */}
          {enableSelection && selectionCount > 0 && (
            <div 
              className="mt-2 text-sm text-brand-500 flex items-center gap-2"
              data-testid="domains-grid-selection-summary"
            >
              <span>{selectionCount} domain{selectionCount > 1 ? 's' : ''} selected</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={actions.deselectAll}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          {/* Empty State */}
          {!isLoading && domains.length === 0 ? (
            <DomainsGridEmptyState 
              hasFilters={activeFilterCount > 0}
              onClearFilters={actions.resetFilters}
            />
          ) : (
            <>
              {/* Main Table */}
              <DomainsGridTable
                domains={domains}
                sortKey={sortKey}
                sortDir={sortDir}
                isSortNonAuthoritative={isSortNonAuthoritative}
                selectedIds={selectedIds}
                isAllSelected={isAllSelected}
                isLoading={isLoading}
                isRefetching={isRefetching}
                enableSelection={enableSelection}
                onSort={actions.setSort}
                onSelectDomain={actions.selectDomain}
                onDeselectDomain={actions.deselectDomain}
                onToggleDomain={actions.toggleDomain}
                onSelectAll={actions.selectAll}
                onDeselectAll={actions.deselectAll}
                onRowClick={onDomainClick ?? actions.inspectDomain}
              />

              {/* Pagination */}
              <DomainsGridPagination
                page={page}
                pageSize={pageSize}
                pageCount={pageCount}
                total={total}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
                isLoading={isLoading}
                onGoToPage={actions.goToPage}
                onNextPage={actions.nextPage}
                onPrevPage={actions.prevPage}
                onSetPageSize={actions.setPageSize}
                onRefresh={actions.refresh}
              />
            </>
          )}
        </div>
      </div>
    </DomainsGridHydrationGuard>
  );
}
