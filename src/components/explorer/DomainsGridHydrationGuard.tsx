/**
 * Phase 7.2: Domains Grid Hydration Guard
 * 
 * Ensures grid content renders only after client-side hydration.
 * Prevents SSR/CSR mismatch with nuqs URL state.
 * 
 * @see docs/PHASE_7_RESULTS_EXPLORATION_ARCHITECTURE.md
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

export interface DomainsGridHydrationGuardProps {
  /** Content to render after hydration */
  children: React.ReactNode;
  
  /** Custom fallback during hydration */
  fallback?: React.ReactNode;
}

// ============================================================================
// DEFAULT FALLBACK
// ============================================================================

function DefaultHydrationFallback() {
  return (
    <div 
      className="space-y-4 p-4" 
      data-testid="domains-grid-hydrating"
      aria-busy="true"
      aria-label="Loading grid..."
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      
      {/* Table header skeleton */}
      <div className="flex gap-4 border-b pb-2">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      {/* Table rows skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 py-2">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
      
      {/* Pagination skeleton */}
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DomainsGridHydrationGuard
 * 
 * Delays rendering of grid content until after hydration to prevent
 * SSR/CSR mismatches with URL-synced filter state from nuqs.
 * 
 * HOW IT WORKS:
 * 1. Server render: Shows fallback skeleton
 * 2. Client hydration: Still shows fallback (isHydrated = false)
 * 3. After useEffect: Shows children (isHydrated = true)
 * 
 * This ensures nuqs has read URL params before grid renders with filters.
 */
export function DomainsGridHydrationGuard({
  children,
  fallback,
}: DomainsGridHydrationGuardProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark hydrated after first client render
    // nuqs will have parsed URL by this point
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <>{fallback ?? <DefaultHydrationFallback />}</>;
  }

  return <>{children}</>;
}
