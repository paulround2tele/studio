/**
 * DomainDrawer - Main drawer container for domain inspection
 * 
 * SINGLE ENTRY POINT for domain detail drawer functionality.
 * 
 * STATE AUTHORITY:
 * - Consumes ONLY from useDomainsExplorer state (inspectedDomain, isDrawerOpen)
 * - NO parallel fetch logic - uses domain data from hook
 * - All drawer actions route through hook's closeDrawer action
 * 
 * MEMOIZATION:
 * - DomainDrawerContent is memoized to prevent grid re-renders
 * - Drawer open/close state changes don't propagate to grid
 * 
 * AUTHORITATIVE BREAKDOWN:
 * - When useAuthoritativeBreakdown flag is enabled, fetches score breakdown from backend
 * - Falls back to degraded state when flag is disabled or fetch fails
 * 
 * @see Phase 7.3 Drawer Integration
 */

'use client';

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { DomainRow } from '@/types/explorer/state';
import type { DomainDrawerData, DomainScoreBreakdown } from '@/types/explorer/drawer';
import { createDrawerData, mapApiScoreBreakdown } from '@/types/explorer/drawer';
import { useExplorerFeatureFlags } from '@/lib/features/explorerFlags';
import { useGetCampaignDomainScoreBreakdownQuery } from '@/store/api/campaignApi';
import { 
  DomainDrawerContent, 
  // DomainDrawerLoading - reserved for loading state when breakdown endpoint implemented
  DomainDrawerEmpty,
} from './DomainDrawerContent';

// ============================================================================
// TYPES
// ============================================================================

export interface DomainDrawerProps {
  /** Whether drawer is open (from useDomainsExplorer.isDrawerOpen) */
  isOpen: boolean;
  /** Domain being inspected (from useDomainsExplorer.inspectedDomain) */
  domain: DomainRow | null;
  /** Campaign ID for breakdown fetch */
  campaignId: string;
  /** Callback to close drawer (useDomainsExplorer.actions.closeDrawer) */
  onClose: () => void;
  /** Width variant */
  size?: 'default' | 'lg' | 'xl';
  /** Additional className for sheet */
  className?: string;
}

// ============================================================================
// SIZE CONFIGURATION
// ============================================================================

const SIZE_CLASSES: Record<NonNullable<DomainDrawerProps['size']>, string> = {
  default: 'w-[400px] sm:w-[450px]',
  lg: 'w-[500px] sm:w-[550px]',
  xl: 'w-[600px] sm:w-[700px]',
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Domain detail drawer
 * 
 * INVARIANTS ENFORCED:
 * 1. Consumes explorer state only (isOpen, domain from props)
 * 2. No internal useState for domain data
 * 3. No fetch hooks called inside this component
 * 4. Close action always calls onClose prop (routes to hook)
 * 5. Content memoized to prevent grid re-renders
 */
export function DomainDrawer({
  isOpen,
  domain,
  campaignId,
  onClose,
  size = 'default',
  className,
}: DomainDrawerProps) {
  // ========================================================================
  // FEATURE FLAGS
  // ========================================================================
  
  const { useAuthoritativeBreakdown } = useExplorerFeatureFlags();

  // ========================================================================
  // SCORE BREAKDOWN FETCH (when flag enabled)
  // ========================================================================
  
  // Only fetch when drawer is open, flag enabled, and domain selected
  const shouldFetchBreakdown = isOpen && useAuthoritativeBreakdown && !!domain;
  
  const { 
    data: breakdownResponse,
    isLoading: isLoadingBreakdown,
    error: breakdownError,
    refetch: refetchBreakdown,
  } = useGetCampaignDomainScoreBreakdownQuery(
    { campaignId, domain: domain?.domain ?? '' },
    { skip: !shouldFetchBreakdown }
  );

  // Map API response to internal type
  const scoreBreakdown: DomainScoreBreakdown | null = useMemo(() => {
    if (!breakdownResponse) return null;
    return mapApiScoreBreakdown(breakdownResponse);
  }, [breakdownResponse]);

  // ========================================================================
  // DRAWER DATA CONSTRUCTION
  // ========================================================================
  
  /**
   * Construct drawer data from domain and breakdown response
   * 
   * When useAuthoritativeBreakdown is enabled:
   * - Fetches breakdown from backend
   * - Sets isLoadingBreakdown during fetch
   * - Sets isBreakdownUnavailable on 404 (domain not analyzed)
   * - Sets breakdownError on other errors
   * 
   * When useAuthoritativeBreakdown is disabled:
   * - Falls back to degraded state (isBreakdownUnavailable=true)
   */
  const drawerData: DomainDrawerData | null = useMemo(() => {
    if (!domain) return null;
    
    // Create base drawer data
    const data = createDrawerData(domain);
    
    // When flag disabled, use degraded path
    if (!useAuthoritativeBreakdown) {
      return {
        ...data,
        isBreakdownUnavailable: true, // Degraded mode
      };
    }
    
    // When flag enabled, use fetch results
    const is404 = breakdownError && 'status' in breakdownError && breakdownError.status === 404;
    const errorMessage = breakdownError && !is404 
      ? ('data' in breakdownError && typeof breakdownError.data === 'object' && breakdownError.data !== null && 'message' in breakdownError.data 
          ? String(breakdownError.data.message) 
          : 'Failed to load breakdown')
      : null;
    
    return {
      ...data,
      scoreBreakdown: scoreBreakdown,
      isLoadingBreakdown: isLoadingBreakdown,
      isBreakdownUnavailable: is404 ?? false,
      breakdownError: errorMessage,
    };
  }, [domain, useAuthoritativeBreakdown, scoreBreakdown, isLoadingBreakdown, breakdownError]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  
  /**
   * Handle drawer close
   * Routes through onClose prop which should call hook's closeDrawer action
   */
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Handle open change from Sheet
   * Only responds to close events (open is controlled by isOpen prop)
   */
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleClose();
    }
  }, [handleClose]);

  /**
   * Retry breakdown fetch
   * Only works when useAuthoritativeBreakdown flag is enabled
   */
  const handleRetryBreakdown = useCallback(() => {
    if (useAuthoritativeBreakdown && shouldFetchBreakdown) {
      refetchBreakdown();
    } else {
      console.debug('[DomainDrawer] Breakdown retry requested but flag disabled or no domain');
    }
  }, [useAuthoritativeBreakdown, shouldFetchBreakdown, refetchBreakdown]);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="right"
        className={cn(
          SIZE_CLASSES[size],
          "flex flex-col p-0",
          className
        )}
        data-testid="domain-drawer"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              Domain Details
            </SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
                data-testid="domain-drawer-close"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* No domain selected */}
          {!domain && (
            <DomainDrawerEmpty />
          )}

          {/* Domain data available */}
          {domain && (
            <DomainDrawerContent
              domain={domain}
              drawerData={drawerData}
              onRetryBreakdown={handleRetryBreakdown}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

DomainDrawer.displayName = 'DomainDrawer';

// ============================================================================
// INTEGRATION EXAMPLE
// ============================================================================

/**
 * Example usage with useDomainsExplorer:
 * 
 * ```tsx
 * function DomainsPage({ campaignId }: { campaignId: string }) {
 *   const [state, actions] = useDomainsExplorer(campaignId);
 *   
 *   return (
 *     <>
 *       <DomainsGrid 
 *         campaignId={campaignId}
 *         onDomainClick={(id) => actions.inspectDomain(id)}
 *       />
 *       <DomainDrawer
 *         isOpen={state.isDrawerOpen}
 *         domain={state.inspectedDomain}
 *         campaignId={campaignId}
 *         onClose={actions.closeDrawer}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
