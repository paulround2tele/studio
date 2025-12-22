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
import { FileSearch, Filter, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No domains match your filters</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Try adjusting or clearing your filters to see more results.
        </p>
        <Button 
          variant="outline" 
          onClick={onClearFilters}
          data-testid="domains-grid-clear-filters"
        >
          <FileSearch className="h-4 w-4 mr-2" />
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
      <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium mb-2">No domains yet</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Start the Discovery phase to generate domains for this campaign.
      </p>
    </div>
  );
}
