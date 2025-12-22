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
 * DEGRADED STATE:
 * - Assumes score breakdown endpoint returns 500 (not implemented)
 * - Always surfaces isBreakdownUnavailable=true with explicit messaging
 * - Never silently hides missing data
 * 
 * @see Phase 7.3 Drawer Integration
 */

'use client';

import React, { useCallback, useMemo } from 'react';
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
import type { DomainDrawerData } from '@/types/explorer/drawer';
import { createDrawerData } from '@/types/explorer/drawer';
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
  onClose,
  size = 'default',
  className,
}: DomainDrawerProps) {
  // ========================================================================
  // DRAWER DATA CONSTRUCTION
  // ========================================================================
  
  /**
   * Construct drawer data from domain
   * 
   * Per Phase 7.3 directive: "Assume score breakdown may remain 500"
   * We default isBreakdownUnavailable=true since the endpoint isn't implemented.
   * 
   * This is NOT lazy loading - we're acknowledging the endpoint doesn't exist.
   * When backend implements it, we'll add the fetch logic here.
   */
  const drawerData: DomainDrawerData | null = useMemo(() => {
    if (!domain) return null;
    
    // Create base drawer data
    const data = createDrawerData(domain);
    
    // Mark breakdown as unavailable (backend returns 500)
    // TODO: When backend implements /domains/{id}/breakdown:
    // 1. Add lazy fetch logic here
    // 2. Set isLoadingBreakdown=true while fetching
    // 3. Set isBreakdownUnavailable based on response
    return {
      ...data,
      isBreakdownUnavailable: true, // Backend 500 for now
    };
  }, [domain]);

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
   * Retry breakdown fetch (placeholder for future implementation)
   * Currently no-op since breakdown endpoint isn't implemented
   */
  const handleRetryBreakdown = useCallback(() => {
    // TODO: Implement when backend supports breakdown endpoint
    // For now, this is a no-op since we can't actually retry
    console.debug('[DomainDrawer] Breakdown retry requested (no-op, endpoint not implemented)');
  }, []);

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
 *         onClose={actions.closeDrawer}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
