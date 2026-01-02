/**
 * Phase 7.2: Domains Grid Header
 * 
 * Renders sortable column headers with non-authoritative indicators.
 * 
 * INVARIANTS:
 * - Sort indicators reflect current state (not server truth when isSortNonAuthoritative)
 * - Non-authoritative sort MUST show visual indicator per directive
 * - No client-side sort logic - only fires callbacks
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

'use client';

import React from 'react';
import { TableCell } from '@/components/ta/ui/table';
import { ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon, WarningTriangleIcon } from '@/icons';
import { cn } from '@/lib/utils';
import type { DomainSortKey, SortDirection } from '@/types/explorer/state';
import { COLUMN_SPECS, COLUMN_IDS } from '@/types/explorer/columns';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

export interface DomainsGridHeaderProps {
  /** Current sort column */
  sortKey: DomainSortKey;
  
  /** Current sort direction */
  sortDir: SortDirection;
  
  /** Whether sort is client-only (backend doesn't support sort params yet) */
  isSortNonAuthoritative: boolean;
  
  /** Enable selection checkbox in header */
  enableSelection: boolean;
  
  /** Whether all rows are selected */
  isAllSelected: boolean;
  
  /** Sort click callback */
  onSortClick: (key: DomainSortKey) => void;
  
  /** Select all toggle callback */
  onSelectAllChange: () => void;
}

// ============================================================================
// SORT INDICATOR COMPONENT
// ============================================================================

interface SortIndicatorProps {
  isActive: boolean;
  direction: SortDirection;
  isNonAuthoritative: boolean;
}

function SortIndicator({ isActive, direction, isNonAuthoritative }: SortIndicatorProps) {
  if (!isActive) {
    return <ArrowUpDownIcon className="h-4 w-4 text-gray-400" />;
  }

  const Arrow = direction === 'asc' ? ArrowUpIcon : ArrowDownIcon;
  
  if (isNonAuthoritative) {
    // Show warning indicator for non-authoritative sort
    return (
      <span 
        className="inline-flex items-center gap-0.5" 
        title="Client-only sort. Results order may not match server. Backend sort params not yet implemented."
      >
        <Arrow className="h-4 w-4 text-amber-500" />
        <WarningTriangleIcon className="h-3 w-3 text-amber-500" />
      </span>
    );
  }

  return <Arrow className="h-4 w-4 text-gray-800 dark:text-white" />;
}

// ============================================================================
// COLUMN HEADER COMPONENT
// ============================================================================

interface ColumnHeaderProps {
  spec: typeof COLUMN_SPECS[number];
  sortKey: DomainSortKey;
  sortDir: SortDirection;
  isSortNonAuthoritative: boolean;
  onSortClick: (key: DomainSortKey) => void;
}

function ColumnHeader({
  spec,
  sortKey,
  sortDir,
  isSortNonAuthoritative,
  onSortClick,
}: ColumnHeaderProps) {
  const isSortable = !!spec.sortKey;
  const isActive = isSortable && spec.sortKey === sortKey;
  
  const handleClick = () => {
    if (isSortable && spec.sortKey) {
      onSortClick(spec.sortKey);
    }
  };

  return (
    <TableCell
      isHeader
      className={cn(
        'px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400',
        spec.align === 'center' && 'text-center',
        spec.align === 'right' && 'text-right',
        isSortable && 'cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800'
      )}
    >
      <span 
        className="inline-flex items-center gap-1"
        style={{
          minWidth: spec.minWidth,
          width: spec.flex ? undefined : spec.minWidth,
        }}
        onClick={isSortable ? handleClick : undefined}
        data-testid={`domains-grid-header-${spec.id}`}
        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {spec.header}
        {isSortable && (
          <SortIndicator
            isActive={isActive}
            direction={sortDir}
            isNonAuthoritative={isSortNonAuthoritative}
          />
        )}
      </span>
    </TableCell>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DomainsGridHeader
 * 
 * Renders all column headers with appropriate sort indicators.
 * Respects isSortNonAuthoritative per Phase 7.2 directive.
 */
export function DomainsGridHeader({
  sortKey,
  sortDir,
  isSortNonAuthoritative,
  enableSelection,
  isAllSelected,
  onSortClick,
  onSelectAllChange,
}: DomainsGridHeaderProps) {
  // Filter columns to display (exclude hidden)
  const visibleColumns = COLUMN_SPECS.filter(
    (spec) => spec.visible !== false
  );

  return (
    <>
      {/* Selection checkbox column */}
      {enableSelection && (
        <TableCell 
          isHeader
          className="w-10 text-center px-4 py-3"
        >
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onSelectAllChange}
            aria-label="Select all domains"
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
            data-testid="domains-grid-select-all"
          />
        </TableCell>
      )}

      {/* Data columns */}
      {visibleColumns.map((spec) => (
        // Skip the select column (handled above)
        spec.id === COLUMN_IDS.SELECT ? null : (
          <ColumnHeader
            key={spec.id}
            spec={spec}
            sortKey={sortKey}
            sortDir={sortDir}
            isSortNonAuthoritative={isSortNonAuthoritative}
            onSortClick={onSortClick}
          />
        )
      ))}
    </>
  );
}
