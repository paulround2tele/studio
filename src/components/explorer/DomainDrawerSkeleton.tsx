/**
 * DomainDrawerSkeleton - Loading skeleton for drawer
 * 
 * Shows placeholder content while drawer content loads.
 * Used during initial render and breakdown loading.
 * 
 * @see Phase 7.3 Drawer Integration
 */

import React from 'react';

export interface DomainDrawerSkeletonProps {
  /** Show full skeleton (initial load) vs partial (breakdown loading) */
  variant?: 'full' | 'breakdown-only';
}

/**
 * Loading skeleton for drawer content
 * Provides visual continuity during data loading
 */
export const DomainDrawerSkeleton = React.memo(function DomainDrawerSkeleton({
  variant = 'full',
}: DomainDrawerSkeletonProps) {
  if (variant === 'breakdown-only') {
    return (
      <div 
        className="space-y-3 animate-pulse"
        data-testid="domain-drawer-skeleton-breakdown"
        aria-label="Loading score breakdown..."
      >
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-3 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 animate-pulse p-6"
      data-testid="domain-drawer-skeleton"
      aria-label="Loading domain details..."
    >
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded w-2/3" />
        <div className="flex gap-2">
          <div className="h-5 bg-muted rounded w-16" />
          <div className="h-5 bg-muted rounded w-16" />
          <div className="h-5 bg-muted rounded w-16" />
        </div>
      </div>

      {/* Richness score skeleton */}
      <div className="p-4 border rounded-lg space-y-3">
        <div className="h-5 bg-muted rounded w-1/3" />
        <div className="h-16 bg-muted rounded" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Features skeleton */}
      <div className="p-4 border rounded-lg space-y-3">
        <div className="h-5 bg-muted rounded w-1/4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
});

DomainDrawerSkeleton.displayName = 'DomainDrawerSkeleton';
