/**
 * DomainActionsSelection - Selection count and controls
 * 
 * Shows:
 * - Count of selected domains
 * - Select all (current page)
 * - Clear selection
 * 
 * @see Phase 7.4 Actions & Export
 */

'use client';

import React from 'react';
import { CloseIcon } from '@/icons';
import { cn } from '@/lib/utils';
import Button from '@/components/ta/ui/button/Button';

// ============================================================================
// TYPES
// ============================================================================

export interface DomainActionsSelectionProps {
  /** Number of currently selected domains */
  selectionCount: number;
  /** Whether all domains on current page are selected */
  isAllSelected: boolean;
  /** Total domains on current page */
  pageSize: number;
  /** Total domains in result set */
  totalDomains: number;
  /** Callback to select all on current page */
  onSelectAll: () => void;
  /** Callback to clear all selections */
  onDeselectAll: () => void;
  /** Additional className */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Selection indicator and controls
 * Shows count and provides select/deselect actions
 */
export const DomainActionsSelection = React.memo(function DomainActionsSelection({
  selectionCount,
  isAllSelected,
  pageSize,
  totalDomains,
  onSelectAll,
  onDeselectAll,
  className,
  disabled = false,
}: DomainActionsSelectionProps) {
  const hasSelection = selectionCount > 0;

  // Checkbox state: unchecked, indeterminate, or checked
  const checkboxState: boolean | 'indeterminate' = 
    selectionCount === 0 ? false :
    isAllSelected ? true : 
    'indeterminate';

  const handleCheckboxChange = () => {
    if (hasSelection) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  return (
    <div 
      className={cn("flex items-center gap-3", className)}
      data-testid="domain-actions-selection"
    >
      {/* Select all checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          ref={(el) => {
            if (el) {
              el.indeterminate = checkboxState === 'indeterminate';
            }
          }}
          checked={checkboxState === true}
          onChange={handleCheckboxChange}
          disabled={disabled || totalDomains === 0}
          aria-label={hasSelection ? 'Clear selection' : 'Select all on page'}
          title={hasSelection ? 'Clear selection' : `Select all ${Math.min(pageSize, totalDomains)} on page`}
          data-testid="domain-actions-select-all-checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Selection count */}
      {hasSelection && (
        <div 
          className="flex items-center gap-2 text-sm"
          data-testid="domain-actions-selection-count"
        >
          <span className="font-medium tabular-nums">
            {selectionCount.toLocaleString()}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {selectionCount === 1 ? 'domain selected' : 'domains selected'}
          </span>

          {/* Clear selection button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDeselectAll}
            disabled={disabled}
            data-testid="domain-actions-clear-selection"
            startIcon={<CloseIcon className="h-3.5 w-3.5" />}
          >
            Clear
          </Button>
        </div>
      )}

      {/* No selection hint */}
      {!hasSelection && totalDomains > 0 && (
        <span 
          className="text-sm text-gray-500 dark:text-gray-400"
          data-testid="domain-actions-selection-hint"
        >
          Select domains to enable actions
        </span>
      )}
    </div>
  );
});

DomainActionsSelection.displayName = 'DomainActionsSelection';
