/**
 * Phase 7.2: Domains Grid Empty State
 * 
 * Displays appropriate messaging when no domains match filters
 * or when campaign has no domains yet.
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

'use client';

import React from 'react';
import { FileSearchIcon, FilterIcon, DatabaseIcon } from '@/icons';
import Button from '@/components/ta/ui/button/Button';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

export interface DomainsGridEmptyStateProps {
  /** Whether filters are currently active */
  hasFilters: boolean;
  
  /** Callback to clear all filters */
  onClearFilters: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DomainsGridEmptyState
 * 
 * Shows contextual empty state based on filter status.
 */
export function DomainsGridEmptyState({
  hasFilters,
  onClearFilters,
}: DomainsGridEmptyStateProps) {
  if (hasFilters) {
    // Empty due to filters
    return (
      <div 
        className="flex flex-col items-center justify-center py-12 text-center"
        data-testid="domains-grid-empty-filtered"
      >
        <FilterIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">No domains match your filters</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
          Try adjusting or clearing your filters to see more results.
        </p>
        <Button 
          variant="outline" 
          onClick={onClearFilters}
          startIcon={<FileSearchIcon className="h-4 w-4" />}
        >
          Clear Filters
        </Button>
      </div>
    );
  }

  // Empty campaign (no domains generated yet)
  return (
    <div 
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid="domains-grid-empty"
    >
      <DatabaseIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">No domains yet</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        Start the Discovery phase to generate domains for this campaign.
      </p>
    </div>
  );
}
