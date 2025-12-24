/**
 * Phase 7.5: Campaign Domains Explorer Integration
 * 
 * Entry point for integrating the new DomainsGrid into the campaign page.
 * Provides SSE integration and results overview wrapper.
 * 
 * ARCHITECTURE:
 * - DomainsGrid manages its own useDomainsExplorer state internally
 * - This wrapper provides SSE integration and overview
 * - Feature flag support for gradual rollout
 * 
 * @see Phase 7.5 Integration & Deprecation
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Phase 7 Explorer Components
import { DomainsGrid } from './DomainsGrid';

// SSE Hook
import { useExplorerSse } from '@/lib/hooks/explorer/useExplorerSse';

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignDomainsExplorerProps {
  /** Campaign ID to explore */
  campaignId: string;
  /** Whether SSE is enabled */
  sseEnabled?: boolean;
  /** Show results overview */
  showOverview?: boolean;
  /** Initial page size */
  initialPageSize?: number;
  /** Show actions bar (selection, export) */
  enableActions?: boolean;
  /** Poll interval in ms (0 = no polling) */
  pollingInterval?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Campaign Domains Explorer
 * 
 * Wrapper component that integrates:
 * - DomainsGrid (with internal state management)
 * - SSE updates for real-time refresh
 * - Optional ResultsOverview
 * 
 * DomainsGrid manages its own useDomainsExplorer hook internally.
 * This component provides the integration layer for SSE and overview.
 */
export function CampaignDomainsExplorer({
  campaignId,
  sseEnabled = true,
  showOverview: _showOverview = false,
  enableActions = true,
  pollingInterval = 0,
  className,
}: CampaignDomainsExplorerProps) {
  // SSE Integration
  const { error: sseError } = useExplorerSse({
    campaignId,
    enabled: sseEnabled,
    onRefresh: () => {
      // DomainsGrid handles its own refresh via RTK Query
      // SSE events will trigger refetch via RTK cache invalidation
    },
  });

  return (
    <div 
      className={cn("space-y-4", className)}
      data-testid="campaign-domains-explorer"
    >
      {/* SSE Connection Status (debug mode only) */}
      {process.env.NODE_ENV === 'development' && sseError && (
        <div className="text-xs text-amber-600 dark:text-amber-400">
          SSE: {sseError}
        </div>
      )}

      {/* Domains Grid - manages its own state via useDomainsExplorer */}
      <DomainsGrid
        campaignId={campaignId}
        title="Domain Results"
        enableSelection={enableActions}
        pollingInterval={pollingInterval}
      />
    </div>
  );
}

// ============================================================================
// LIGHTWEIGHT VARIANT
// ============================================================================

export interface CampaignDomainsExplorerCompactProps {
  /** Campaign ID */
  campaignId: string;
  /** Maximum rows to show */
  maxRows?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact variant for embedding in dashboards
 * Shows limited rows without full controls
 */
export function CampaignDomainsExplorerCompact({
  campaignId,
  maxRows: _maxRows = 5,
  className,
}: CampaignDomainsExplorerCompactProps) {
  return (
    <div 
      className={cn("", className)}
      data-testid="campaign-domains-explorer-compact"
    >
      <DomainsGrid
        campaignId={campaignId}
        title="Recent Domains"
        enableSelection={false}
      />
    </div>
  );
}

export default CampaignDomainsExplorer;
