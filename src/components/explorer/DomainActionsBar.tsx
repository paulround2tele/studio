/**
 * DomainActionsBar - Batch action toolbar for domain explorer
 * 
 * SINGLE ENTRY POINT for domain batch actions.
 * 
 * Features:
 * - Selection indicator with count
 * - Export to CSV/JSON
 * - Future: Exclusion (when backend ready)
 * 
 * STATE AUTHORITY:
 * - Receives selection state from useDomainsExplorer (no local state)
 * - Actions dispatch through hook's action creators
 * 
 * BACKEND READINESS:
 * - Export: Client-side only (no backend needed)
 * - Exclusion: NOT implemented (backend endpoint doesn't exist)
 * 
 * @see Phase 7.4 Actions & Export
 */

'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { DomainRow } from '@/types/explorer/state';
import { DomainActionsSelection } from './DomainActionsSelection';
import { DomainActionsExport } from './DomainActionsExport';

// ============================================================================
// TYPES
// ============================================================================

export interface DomainActionsBarProps {
  /** Campaign ID */
  campaignId: string;
  /** All domains on current page */
  domains: readonly DomainRow[];
  /** Set of selected domain IDs */
  selectedIds: ReadonlySet<string>;
  /** Count of selected domains */
  selectionCount: number;
  /** Whether all on page are selected */
  isAllSelected: boolean;
  /** Page size */
  pageSize: number;
  /** Total domains in filtered result */
  totalDomains: number;
  /** Callback to select all on page */
  onSelectAll: () => void;
  /** Callback to clear selection */
  onDeselectAll: () => void;
  /** Whether actions are disabled (loading, etc) */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Batch action toolbar for domain explorer
 * 
 * INVARIANTS:
 * 1. No local selection state - receives from props (hook state)
 * 2. Export is client-side only
 * 3. Exclusion NOT implemented (no backend endpoint)
 */
export function DomainActionsBar({
  campaignId,
  domains,
  selectedIds,
  selectionCount,
  isAllSelected,
  pageSize,
  totalDomains,
  onSelectAll,
  onDeselectAll,
  disabled = false,
  className,
}: DomainActionsBarProps) {
  // Derive selected domains for export
  const selectedDomains = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return domains.filter(d => d.id && selectedIds.has(d.id));
  }, [domains, selectedIds]);

  const hasSelection = selectionCount > 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 border-b bg-muted/30",
        className
      )}
      data-testid="domain-actions-bar"
    >
      {/* Left: Selection controls */}
      <DomainActionsSelection
        selectionCount={selectionCount}
        isAllSelected={isAllSelected}
        pageSize={pageSize}
        totalDomains={totalDomains}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
        disabled={disabled}
      />

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {/* Export button */}
        <DomainActionsExport
          domains={selectedDomains}
          selectionCount={selectionCount}
          campaignId={campaignId}
          disabled={disabled || !hasSelection}
        />

        {/* 
         * Future: Exclusion button
         * NOT IMPLEMENTED - backend endpoint doesn't exist
         * 
         * When backend adds POST /campaigns/{id}/domains/exclude:
         * <DomainActionsExclude
         *   domainIds={[...selectedIds]}
         *   campaignId={campaignId}
         *   onExcluded={onDeselectAll}
         *   disabled={disabled || !hasSelection}
         * />
         */}
      </div>
    </div>
  );
}

DomainActionsBar.displayName = 'DomainActionsBar';

// ============================================================================
// COMPACT VARIANT
// ============================================================================

export interface DomainActionsBarCompactProps {
  /** Selection count */
  selectionCount: number;
  /** Show export button */
  showExport?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Compact action indicator (for use in headers, etc)
 * Shows just the selection count badge
 */
export const DomainActionsBarCompact = React.memo(function DomainActionsBarCompact({
  selectionCount,
  showExport: _showExport = false,
  className,
}: DomainActionsBarCompactProps) {
  if (selectionCount === 0) return null;

  return (
    <div 
      className={cn("flex items-center gap-2", className)}
      data-testid="domain-actions-bar-compact"
    >
      <span className="text-sm font-medium tabular-nums bg-primary/10 text-primary px-2 py-0.5 rounded">
        {selectionCount} selected
      </span>
    </div>
  );
});

DomainActionsBarCompact.displayName = 'DomainActionsBarCompact';
