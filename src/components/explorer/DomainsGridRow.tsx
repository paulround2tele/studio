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
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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

function StatusBadge({ status, type }: StatusBadgeProps) {
  if (!status) {
    return <span className="text-muted-foreground">—</span>;
  }

  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ok: 'default',
    pending: 'secondary',
    error: 'destructive',
    timeout: 'outline',
    match: 'default',
    no_match: 'outline',
  };

  return (
    <Badge 
      variant={variants[status] ?? 'outline'} 
      className="text-xs"
      data-testid={`domain-status-${type}`}
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
    return <span className="text-muted-foreground">—</span>;
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
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-1" data-testid="domain-keywords">
      {count !== undefined && (
        <Badge variant="outline" className="text-xs">
          {count}
        </Badge>
      )}
      {topKeywords && topKeywords.length > 0 && (
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
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
    return <span className="text-muted-foreground">—</span>;
  }

  const formatted = gain >= 1 
    ? `${gain.toFixed(1)}x` 
    : `${(gain * 100).toFixed(0)}%`;

  return (
    <span 
      className={cn('text-sm', gain >= 1 ? 'text-green-600' : 'text-muted-foreground')}
      data-testid="domain-microcrawl"
    >
      {formatted}
    </span>
  );
}

// ============================================================================
// SKELETON ROW
// ============================================================================

function SkeletonRow({ enableSelection }: { enableSelection: boolean }) {
  return (
    <TableRow data-testid="domains-grid-row-skeleton">
      {enableSelection && (
        <TableCell className="w-10">
          <Skeleton className="h-4 w-4" />
        </TableCell>
      )}
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
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
        'cursor-pointer hover:bg-muted/50',
        isSelected && 'bg-primary/5'
      )}
      onClick={(e) => {
        // Don't trigger row click if clicking checkbox
        if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
          return;
        }
        onClick();
      }}
      data-testid="domains-grid-row"
      data-domain-id={domainId}
    >
      {/* Selection Checkbox */}
      {enableSelection && (
        <TableCell className="w-10 text-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            aria-label={`Select ${domain.domain}`}
            data-testid={`domains-grid-row-select-${domainId}`}
          />
        </TableCell>
      )}

      {/* Domain Name */}
      <TableCell 
        className="font-medium max-w-[200px] truncate"
        data-testid="domains-grid-cell-domain"
      >
        {domain.domain}
      </TableCell>

      {/* DNS Status */}
      <TableCell className="text-center" data-testid="domains-grid-cell-dns">
        <StatusBadge status={domain.dnsStatus} type="dns" />
      </TableCell>

      {/* HTTP Status */}
      <TableCell className="text-center" data-testid="domains-grid-cell-http">
        <StatusBadge status={domain.httpStatus} type="http" />
      </TableCell>

      {/* Richness Score */}
      <TableCell className="text-center" data-testid="domains-grid-cell-richness">
        <RichnessDisplay score={domain.features?.richness?.score} />
      </TableCell>

      {/* Keywords */}
      <TableCell data-testid="domains-grid-cell-keywords">
        <KeywordsDisplay keywords={domain.features?.keywords} />
      </TableCell>

      {/* Microcrawl Gain */}
      <TableCell className="text-center" data-testid="domains-grid-cell-microcrawl">
        <MicrocrawlDisplay gain={domain.features?.microcrawl?.gain_ratio} />
      </TableCell>

      {/* Lead Status */}
      <TableCell className="text-center" data-testid="domains-grid-cell-lead">
        <StatusBadge status={domain.leadStatus} type="lead" />
      </TableCell>
    </TableRow>
  );
});

DomainsGridRow.displayName = 'DomainsGridRow';
