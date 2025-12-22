/**
 * DomainDrawerContent - Main content layout for domain drawer
 * 
 * MEMOIZATION BOUNDARY: This component is memoized to prevent
 * grid re-renders when drawer content changes.
 * 
 * Layout:
 * - Header (domain name, statuses)
 * - Richness score section
 * - Features section (keywords, microcrawl)
 * 
 * @see Phase 7.3 directive: "Drawer open/close must not cause full grid re-renders"
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { DomainRow } from '@/types/explorer/state';
import type { DomainDrawerData } from '@/types/explorer/drawer';
import { DomainDrawerHeader } from './DomainDrawerHeader';
import { DomainDrawerRichness } from './DomainDrawerRichness';
import { DomainDrawerFeatures } from './DomainDrawerFeatures';
import { DomainDrawerSkeleton } from './DomainDrawerSkeleton';

// ============================================================================
// COMPONENT
// ============================================================================

export interface DomainDrawerContentProps {
  /** Domain data from explorer state */
  domain: DomainRow;
  /** Extended drawer data (breakdown, loading states) */
  drawerData?: DomainDrawerData | null;
  /** Callback to retry breakdown fetch */
  onRetryBreakdown?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Domain drawer content layout
 * 
 * INVARIANT: Renders from explorer state only - no independent data fetching.
 * 
 * MEMOIZATION: This component is the key boundary preventing grid re-renders.
 * Parent (DomainDrawer) may re-render on drawer open/close, but this
 * component only re-renders when domain data actually changes.
 */
export const DomainDrawerContent = React.memo(function DomainDrawerContent({
  domain,
  drawerData,
  onRetryBreakdown,
  className,
}: DomainDrawerContentProps) {
  // Extract breakdown state from drawerData (if provided)
  // Default to degraded state if drawerData not available
  const scoreBreakdown = drawerData?.scoreBreakdown ?? null;
  const isLoadingBreakdown = drawerData?.isLoadingBreakdown ?? false;
  const isBreakdownUnavailable = drawerData?.isBreakdownUnavailable ?? true; // Default to unavailable
  const breakdownError = drawerData?.breakdownError ?? null;

  return (
    <div 
      className={cn("flex flex-col gap-6 p-6 overflow-y-auto", className)}
      data-testid="domain-drawer-content"
    >
      {/* Header: domain name, statuses, timestamp */}
      <DomainDrawerHeader domain={domain} />

      {/* Richness score with breakdown */}
      <DomainDrawerRichness
        domain={domain}
        scoreBreakdown={scoreBreakdown}
        isLoadingBreakdown={isLoadingBreakdown}
        isBreakdownUnavailable={isBreakdownUnavailable}
        breakdownError={breakdownError}
        onRetryBreakdown={onRetryBreakdown}
      />

      {/* Features: keywords, microcrawl */}
      <DomainDrawerFeatures domain={domain} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  // Only re-render if domain data actually changed
  return (
    prevProps.domain.id === nextProps.domain.id &&
    prevProps.domain.domain === nextProps.domain.domain &&
    prevProps.domain.dnsStatus === nextProps.domain.dnsStatus &&
    prevProps.domain.httpStatus === nextProps.domain.httpStatus &&
    prevProps.domain.features === nextProps.domain.features &&
    prevProps.drawerData?.scoreBreakdown === nextProps.drawerData?.scoreBreakdown &&
    prevProps.drawerData?.isLoadingBreakdown === nextProps.drawerData?.isLoadingBreakdown &&
    prevProps.drawerData?.isBreakdownUnavailable === nextProps.drawerData?.isBreakdownUnavailable &&
    prevProps.drawerData?.breakdownError === nextProps.drawerData?.breakdownError
  );
});

DomainDrawerContent.displayName = 'DomainDrawerContent';

// ============================================================================
// LOADING STATE
// ============================================================================

export interface DomainDrawerLoadingProps {
  className?: string;
}

/**
 * Loading state for drawer when domain data is being fetched
 */
export const DomainDrawerLoading = React.memo(function DomainDrawerLoading({
  className,
}: DomainDrawerLoadingProps) {
  return (
    <div className={cn("", className)} data-testid="domain-drawer-loading">
      <DomainDrawerSkeleton variant="full" />
    </div>
  );
});

DomainDrawerLoading.displayName = 'DomainDrawerLoading';

// ============================================================================
// EMPTY STATE
// ============================================================================

export interface DomainDrawerEmptyProps {
  message?: string;
  className?: string;
}

/**
 * Empty state when no domain is selected
 */
export const DomainDrawerEmpty = React.memo(function DomainDrawerEmpty({
  message = 'Select a domain to view details',
  className,
}: DomainDrawerEmptyProps) {
  return (
    <div 
      className={cn(
        "flex items-center justify-center h-full text-muted-foreground p-6",
        className
      )}
      data-testid="domain-drawer-empty"
    >
      <p className="text-sm">{message}</p>
    </div>
  );
});

DomainDrawerEmpty.displayName = 'DomainDrawerEmpty';
