/**
 * Server Timeline Hook (Phase 5)
 * Progressive hydration and merging of server timeline data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AggregateSnapshot } from '@/types/campaignMetrics';
import { 
  fetchServerTimeline, 
  mergeTimelines, 
  integrateServerSnapshotBatch,
  getLastServerSync,
  setLastServerSync,
  isServerTimelineAvailable 
} from '@/services/campaignMetrics/timelineService';
import { addSnapshot } from '@/services/campaignMetrics/historyStore';
import { telemetryService } from '@/services/campaignMetrics/telemetryService';

/**
 * Server timeline hook options
 */
export interface UseServerTimelineOptions {
  autoFetch?: boolean;
  fetchInterval?: number;
  enabled?: boolean;
}

/**
 * Server timeline hook return type
 */
export interface UseServerTimelineReturn {
  timeline: AggregateSnapshot[];
  loading: boolean;
  error: string | null;
  lastSync: string | null;
  fetchServerData: () => Promise<void>;
  mergedCount: number;
  serverCount: number;
}

/**
 * Hook for server timeline integration with progressive hydration
 */
export function useServerTimeline(
  campaignId: string,
  localSnapshots: AggregateSnapshot[],
  options: UseServerTimelineOptions = {}
): UseServerTimelineReturn {
  const {
    autoFetch = true,
    fetchInterval = 300000, // 5 minutes
    enabled = true
  } = options;

  const [timeline, setTimeline] = useState<AggregateSnapshot[]>(localSnapshots);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSyncState] = useState<string | null>(null);
  const [mergedCount, setMergedCount] = useState(0);
  const [serverCount, setServerCount] = useState(0);
  
  const fetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  /**
   * Fetch server timeline data
   */
  const fetchServerData = useCallback(async () => {
    if (!enabled || !isServerTimelineAvailable() || !campaignId) {
      return;
    }

    setLoading(true);
    setError(null);
    
    const startTime = Date.now();

    try {
      const lastSyncTime = getLastServerSync(campaignId);
      const response = await fetchServerTimeline(
        campaignId, 
        lastSyncTime || undefined,
        50
      );

      if (!mountedRef.current) return;

      if (response.snapshots.length > 0) {
        // Merge server snapshots with local timeline
        const mergedTimeline = mergeTimelines(localSnapshots, response.snapshots);
        
        // Integrate server snapshots into history store
        const addedCount = integrateServerSnapshotBatch(
          campaignId,
          response.snapshots,
          addSnapshot
        );

        setTimeline(mergedTimeline);
        setMergedCount(mergedTimeline.length);
        setServerCount(response.snapshots.length);

        // Update last sync timestamp
        const syncTime = new Date().toISOString();
        setLastServerSync(campaignId, syncTime);
        setLastSyncState(syncTime);

        // Emit telemetry event
        const duration = Date.now() - startTime;
        telemetryService.emitTimelineHydrate({
          campaignId,
          serverCount: response.snapshots.length,
          mergedCount: mergedTimeline.length,
          durationMs: duration
        });

        console.log(`[useServerTimeline] Merged ${response.snapshots.length} server snapshots, ${addedCount} added to history`);
      } else {
        // No new server data, just use local snapshots
        setTimeline(localSnapshots);
        setMergedCount(localSnapshots.length);
        setServerCount(0);
      }
    } catch (fetchError) {
      if (!mountedRef.current) return;
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to fetch server timeline';
      setError(errorMessage);
      
      // Fallback to local snapshots on error
      setTimeline(localSnapshots);
      setMergedCount(localSnapshots.length);
      setServerCount(0);
      
      console.warn('[useServerTimeline] Fetch failed, using local snapshots:', errorMessage);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [campaignId, enabled, localSnapshots]);

  /**
   * Set up automatic fetching
   */
  useEffect(() => {
    if (!autoFetch || !enabled || !isServerTimelineAvailable()) {
      return;
    }

    // Initial fetch
    fetchServerData();

    // Set up interval for periodic fetching
    fetchIntervalRef.current = setInterval(fetchServerData, fetchInterval);

    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
    };
  }, [autoFetch, enabled, fetchInterval, fetchServerData]);

  /**
   * Update timeline when local snapshots change
   */
  useEffect(() => {
    if (!enabled || !isServerTimelineAvailable()) {
      setTimeline(localSnapshots);
      setMergedCount(localSnapshots.length);
      setServerCount(0);
      return;
    }

    // If we have server data, re-merge with new local snapshots
    if (serverCount > 0) {
      // Re-fetch to ensure consistency
      fetchServerData();
    } else {
      setTimeline(localSnapshots);
      setMergedCount(localSnapshots.length);
    }
  }, [localSnapshots, enabled, serverCount, fetchServerData]);

  /**
   * Initialize last sync state
   */
  useEffect(() => {
    if (campaignId) {
      const lastSyncTime = getLastServerSync(campaignId);
      setLastSyncState(lastSyncTime);
    }
  }, [campaignId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
    };
  }, []);

  return {
    timeline,
    loading,
    error,
    lastSync,
    fetchServerData,
    mergedCount,
    serverCount
  };
}

export default useServerTimeline;