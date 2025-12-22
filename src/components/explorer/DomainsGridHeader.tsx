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
import { TableHead } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUp, ArrowDown, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
  }

  const Arrow = direction === 'asc' ? ArrowUp : ArrowDown;
  
  if (isNonAuthoritative) {
    // Show warning indicator for non-authoritative sort
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-0.5">
              <Arrow className="h-4 w-4 text-amber-500" />
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">
              <strong>Client-only sort.</strong> Results order may not match server.
              Backend sort params not yet implemented.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <Arrow className="h-4 w-4 text-foreground" />;
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
    <TableHead
      style={{
        minWidth: spec.minWidth,
        width: spec.flex ? undefined : spec.minWidth,
      }}
      className={cn(
        spec.align === 'center' && 'text-center',
        spec.align === 'right' && 'text-right',
        isSortable && 'cursor-pointer select-none hover:bg-muted/50'
      )}
      onClick={isSortable ? handleClick : undefined}
      data-testid={`domains-grid-header-${spec.id}`}
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="inline-flex items-center gap-1">
        {spec.header}
        {isSortable && (
          <SortIndicator
            isActive={isActive}
            direction={sortDir}
            isNonAuthoritative={isSortNonAuthoritative}
          />
        )}
      </span>
    </TableHead>
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
        <TableHead 
          className="w-10 text-center"
          data-testid="domains-grid-header-select"
        >
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onSelectAllChange}
            aria-label="Select all domains"
            data-testid="domains-grid-select-all"
          />
        </TableHead>
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
