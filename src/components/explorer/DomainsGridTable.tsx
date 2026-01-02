/**
 * Phase 7.2: Domains Grid Table
 * 
 * Renders the table structure with sortable headers.
 * Delegates to DomainsGridHeader for column headers with sort indicators.
 * 
 * INVARIANTS:
 * - NO client-side sorting - all sort state comes from props
 * - Respects isSortNonAuthoritative for UI indicators
 * - Selection state is read-only from props
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

'use client';

import React from 'react';
import { Table, TableBody, TableHeader, TableRow } from '@/components/ta/ui/table';
import { DomainsGridHeader } from './DomainsGridHeader';
import { DomainsGridRow } from './DomainsGridRow';
import type { DomainRow, DomainSortKey, SortDirection } from '@/types/explorer/state';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

export interface DomainsGridTableProps {
  /** Domain data to display */
  domains: readonly DomainRow[];
  
  /** Current sort column */
  sortKey: DomainSortKey;
  
  /** Current sort direction */
  sortDir: SortDirection;
  
  /** Whether sort is client-only (not reflected in server response) */
  isSortNonAuthoritative: boolean;
  
  /** Currently selected domain IDs */
  selectedIds: ReadonlySet<string>;
  
  /** Whether all visible domains are selected */
  isAllSelected: boolean;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Refetching state */
  isRefetching: boolean;
  
  /** Enable row selection */
  enableSelection: boolean;
  
  /** Sort change callback */
  onSort: (key: DomainSortKey, dir: SortDirection) => void;
  
  /** Select single domain */
  onSelectDomain: (id: string) => void;
  
  /** Deselect single domain */
  onDeselectDomain: (id: string) => void;
  
  /** Toggle domain selection */
  onToggleDomain: (id: string) => void;
  
  /** Select all visible domains */
  onSelectAll: () => void;
  
  /** Deselect all domains */
  onDeselectAll: () => void;
  
  /** Row click callback (for drawer) */
  onRowClick: (domainId: string) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DomainsGridTable
 * 
 * Pure presentation component for the domain table.
 * All state comes from props (useDomainsExplorer authority).
 */
export function DomainsGridTable({
  domains,
  sortKey,
  sortDir,
  isSortNonAuthoritative,
  selectedIds,
  isAllSelected,
  isLoading,
  isRefetching,
  enableSelection,
  onSort,
  // onSelectDomain - reserved for multi-select enhancement
  // onDeselectDomain - reserved for multi-select enhancement  
  onToggleDomain,
  onSelectAll,
  onDeselectAll,
  onRowClick,
}: DomainsGridTableProps) {
  // Handle sort toggle
  const handleSortClick = (key: DomainSortKey) => {
    if (key === sortKey) {
      // Toggle direction
      onSort(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to desc
      onSort(key, 'desc');
    }
  };

  // Handle select all toggle
  const handleSelectAllChange = () => {
    if (isAllSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  return (
    <div 
      className="rounded-md border relative"
      data-testid="domains-grid-table-container"
    >
      {/* Refetch overlay */}
      {isRefetching && (
        <div 
          className="absolute inset-0 bg-background/50 flex items-center justify-center z-10"
          data-testid="domains-grid-refetching"
          aria-live="polite"
        >
          <span className="text-sm text-muted-foreground">Updating...</span>
        </div>
      )}

      <Table data-testid="domains-grid-table">
        <TableHeader>
          <TableRow>
            <DomainsGridHeader
              sortKey={sortKey}
              sortDir={sortDir}
              isSortNonAuthoritative={isSortNonAuthoritative}
              enableSelection={enableSelection}
              isAllSelected={isAllSelected}
              onSortClick={handleSortClick}
              onSelectAllChange={handleSelectAllChange}
            />
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {isLoading && domains.length === 0 ? (
            // Loading skeleton rows
            Array.from({ length: 5 }).map((_, i) => (
              <DomainsGridRow
                key={`skeleton-${i}`}
                domain={null}
                isSelected={false}
                enableSelection={enableSelection}
                isLoading={true}
                onToggle={() => {}}
                onClick={() => {}}
              />
            ))
          ) : (
            domains.map((domain) => {
              const domainId = domain.id ?? domain.domain ?? '';
              const isSelected = selectedIds.has(domainId);
              
              return (
                <DomainsGridRow
                  key={domainId}
                  domain={domain}
                  isSelected={isSelected}
                  enableSelection={enableSelection}
                  isLoading={false}
                  onToggle={() => onToggleDomain(domainId)}
                  onClick={() => onRowClick(domainId)}
                />
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
