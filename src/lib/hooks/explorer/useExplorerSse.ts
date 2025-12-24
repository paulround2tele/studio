/**
 * Phase 7.5: Hook for integrating SSE updates with Domain Explorer
 * 
 * Bridges useCampaignSSE events to explorer refresh callbacks.
 * 
 * ARCHITECTURE:
 * - Subscribes to relevant SSE events (phase completion, progress)
 * - Debounces refresh calls to avoid excessive API requests
 * - Provides connection status for UI indicators
 * 
 * @see Phase 7.5 Integration & Deprecation
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';

// ============================================================================
// TYPES
// ============================================================================

export interface UseExplorerSseOptions {
  /** Campaign ID to subscribe to */
  campaignId: string;
  /** Whether to auto-connect SSE */
  enabled?: boolean;
  /** Callback when domains should be refreshed */
  onRefresh?: () => void;
  /** Debounce interval in ms for refresh calls */
  refreshDebounceMs?: number;
}

export interface UseExplorerSseResult {
  /** Whether SSE is connected */
  isConnected: boolean;
  /** SSE error message if any */
  error: string | null;
  /** Manually trigger a refresh */
  triggerRefresh: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for SSE integration with domain explorer
 */
export function useExplorerSse({
  campaignId,
  enabled = true,
  onRefresh,
  refreshDebounceMs = 2000,
}: UseExplorerSseOptions): UseExplorerSseResult {
  const lastRefreshRef = useRef<number>(0);
  const pendingRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced refresh handler
  const debouncedRefresh = useCallback(() => {
    if (!onRefresh) return;
    
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    
    // If enough time has passed, refresh immediately
    if (timeSinceLastRefresh >= refreshDebounceMs) {
      lastRefreshRef.current = now;
      onRefresh();
      return;
    }
    
    // Otherwise, schedule a debounced refresh
    if (pendingRefreshRef.current) {
      clearTimeout(pendingRefreshRef.current);
    }
    
    const delay = refreshDebounceMs - timeSinceLastRefresh;
    pendingRefreshRef.current = setTimeout(() => {
      lastRefreshRef.current = Date.now();
      onRefresh();
      pendingRefreshRef.current = null;
    }, delay);
  }, [onRefresh, refreshDebounceMs]);

  // Clean up pending refresh on unmount
  useEffect(() => {
    return () => {
      if (pendingRefreshRef.current) {
        clearTimeout(pendingRefreshRef.current);
      }
    };
  }, []);

  // SSE event handlers
  const handlePhaseCompleted = useCallback(() => {
    debouncedRefresh();
  }, [debouncedRefresh]);

  const handlePhaseFailed = useCallback(() => {
    debouncedRefresh();
  }, [debouncedRefresh]);

  const handleProgress = useCallback(() => {
    // Progress updates don't necessarily mean new domains
    // Only refresh on significant progress milestones
    // For now, skip refresh on progress - let phase completion handle it
  }, []);

  const handleAnalysisCompleted = useCallback(() => {
    debouncedRefresh();
  }, [debouncedRefresh]);

  // Subscribe to SSE
  const { isConnected, error } = useCampaignSSE({
    campaignId,
    autoConnect: enabled && Boolean(campaignId),
    events: {
      onPhaseCompleted: handlePhaseCompleted,
      onPhaseFailed: handlePhaseFailed,
      onProgress: handleProgress,
      onAnalysisCompleted: handleAnalysisCompleted,
      onAnalysisFailed: handlePhaseFailed,
    },
  });

  // Manual trigger
  const triggerRefresh = useCallback(() => {
    if (onRefresh) {
      lastRefreshRef.current = Date.now();
      onRefresh();
    }
  }, [onRefresh]);

  return {
    isConnected,
    error,
    triggerRefresh,
  };
}

export default useExplorerSse;
