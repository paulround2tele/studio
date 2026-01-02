/**
 * Phase 7.2: Domains Grid Row
 * 
 * Renders a single domain row with selection and click handling.
 * 
 * INVARIANTS:
 * - Pure presentation component - no local state
 * - Selection state is read-only from props
 * - Click handler delegates to parent (for drawer opening)
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

'use client';

import React, { memo } from 'react';
import { TableCell, TableRow } from '@/components/ta/ui/table';
import Badge from '@/components/ta/ui/badge/Badge';
import { cn } from '@/lib/utils';
import type { DomainRow } from '@/types/explorer/state';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

export interface DomainsGridRowProps {
  /** Domain data (null for loading skeleton) */
  domain: DomainRow | null;
  
  /** Whether this row is selected */
  isSelected: boolean;
  
  /** Enable selection checkbox */
  enableSelection: boolean;
  
  /** Loading state (shows skeleton) */
  isLoading: boolean;
  
  /** Selection toggle callback */
  onToggle: () => void;
  
  /** Row click callback */
  onClick: () => void;
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

interface StatusBadgeProps {
  status: string | undefined | null;
  type: 'dns' | 'http' | 'lead';
}

function StatusBadge({ status, type: _type }: StatusBadgeProps) {
  if (!status) {
    return <span className="text-gray-400">—</span>;
  }

  const colorMap: Record<string, 'success' | 'warning' | 'error' | 'light'> = {
    ok: 'success',
    pending: 'warning',
    error: 'error',
    timeout: 'light',
    match: 'success',
    no_match: 'light',
  };

  return (
    <Badge 
      color={colorMap[status] ?? 'light'} 
      size="sm"
    >
      {status}
    </Badge>
  );
}

// ============================================================================
// RICHNESS DISPLAY
// ============================================================================

function RichnessDisplay({ score }: { score: number | undefined | null }) {
  if (score === undefined || score === null) {
    return <span className="text-gray-400">—</span>;
  }

  // Color based on score
  const color = score >= 70 
    ? 'text-green-600' 
    : score >= 40 
      ? 'text-amber-600' 
      : 'text-red-600';

  return (
    <span className={cn('font-medium', color)} data-testid="domain-richness">
      {score.toFixed(0)}
    </span>
  );
}

// ============================================================================
// KEYWORDS DISPLAY
// ============================================================================

interface KeywordsFeatures {
  unique_count?: number;
  top_keywords?: Array<{ keyword: string; count?: number }>;
}

function KeywordsDisplay({ 
  keywords 
}: { 
  keywords: KeywordsFeatures | undefined | null;
}) {
  const count = keywords?.unique_count;
  const topKeywords = keywords?.top_keywords?.slice(0, 3);

  if (!count && !topKeywords?.length) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <div className="flex items-center gap-1" data-testid="domain-keywords">
      {count !== undefined && (
        <Badge color="light" size="sm">
          {count}
        </Badge>
      )}
      {topKeywords && topKeywords.length > 0 && (
        <span className="text-xs text-gray-500 truncate max-w-[120px]">
          {topKeywords.map((k) => k.keyword).join(', ')}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// MICROCRAWL DISPLAY
// ============================================================================

function MicrocrawlDisplay({ gain }: { gain: number | undefined | null }) {
  if (gain === undefined || gain === null) {
    return <span className="text-gray-400">—</span>;
  }

  const formatted = gain >= 1 
    ? `${gain.toFixed(1)}x` 
    : `${(gain * 100).toFixed(0)}%`;

  return (
    <span 
      className={cn('text-sm', gain >= 1 ? 'text-green-600' : 'text-gray-500')}
      data-testid="domain-microcrawl"
    >
      {formatted}
    </span>
  );
}

// ============================================================================
// SKELETON ROW
// ============================================================================

function SkeletonCell({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4", className)} />
  );
}

function SkeletonRow({ enableSelection }: { enableSelection: boolean }) {
  return (
    <TableRow>
      {enableSelection && (
        <TableCell className="w-10 px-4 py-3">
          <SkeletonCell className="h-4 w-4" />
        </TableCell>
      )}
      <TableCell className="px-4 py-3"><SkeletonCell className="w-32" /></TableCell>
      <TableCell className="px-4 py-3"><SkeletonCell className="w-12" /></TableCell>
      <TableCell className="px-4 py-3"><SkeletonCell className="w-12" /></TableCell>
      <TableCell className="px-4 py-3"><SkeletonCell className="w-10" /></TableCell>
      <TableCell className="px-4 py-3"><SkeletonCell className="w-24" /></TableCell>
      <TableCell className="px-4 py-3"><SkeletonCell className="w-12" /></TableCell>
      <TableCell className="px-4 py-3"><SkeletonCell className="w-12" /></TableCell>
    </TableRow>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DomainsGridRow
 * 
 * Memoized row component for performance with large datasets.
 * Pure presentation - all data from props.
 */
export const DomainsGridRow = memo(function DomainsGridRow({
  domain,
  isSelected,
  enableSelection,
  isLoading,
  onToggle,
  onClick,
}: DomainsGridRowProps) {
  if (isLoading || !domain) {
    return <SkeletonRow enableSelection={enableSelection} />;
  }

  const domainId = domain.id ?? domain.domain ?? '';

  return (
    <TableRow
      className={cn(
        'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
        isSelected && 'bg-brand-50 dark:bg-brand-900/20'
      )}
    >
      {/* Selection Checkbox */}
      {enableSelection && (
        <TableCell className="w-10 text-center px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle()}
            aria-label={`Select ${domain.domain}`}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
            data-testid={`domains-grid-row-select-${domainId}`}
          />
        </TableCell>
      )}

      {/* Domain Name */}
      <TableCell 
        className="font-medium max-w-[200px] truncate px-4 py-3 text-gray-800 dark:text-white"
      >
        <span 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="cursor-pointer hover:text-brand-500"
        >
          {domain.domain}
        </span>
      </TableCell>

      {/* DNS Status */}
      <TableCell className="text-center px-4 py-3">
        <StatusBadge status={domain.dnsStatus} type="dns" />
      </TableCell>

      {/* HTTP Status */}
      <TableCell className="text-center px-4 py-3">
        <StatusBadge status={domain.httpStatus} type="http" />
      </TableCell>

      {/* Richness Score */}
      <TableCell className="text-center px-4 py-3">
        <RichnessDisplay score={domain.features?.richness?.score} />
      </TableCell>

      {/* Keywords */}
      <TableCell className="px-4 py-3">
        <KeywordsDisplay keywords={domain.features?.keywords} />
      </TableCell>

      {/* Microcrawl Gain */}
      <TableCell className="text-center px-4 py-3">
        <MicrocrawlDisplay gain={domain.features?.microcrawl?.gain_ratio} />
      </TableCell>

      {/* Lead Status */}
      <TableCell className="text-center px-4 py-3">
        <StatusBadge status={domain.leadStatus} type="lead" />
      </TableCell>
    </TableRow>
  );
});

DomainsGridRow.displayName = 'DomainsGridRow';
