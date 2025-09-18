/**
 * Timeline Service (Phase 5)
 * Server historical timeline integration with local history merging
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';

// Feature flag for server timeline
const isServerTimelineEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_SERVER_TIMELINE !== 'false';

/**
 * Server timeline response structure
 */
export interface ServerTimelineResponse {
  snapshots: AggregateSnapshot[];
  totalCount: number;
  lastSync?: string;
}

/**
 * Fetch server timeline snapshots for a campaign
 */
export async function fetchServerTimeline(
  campaignId: string,
  since?: string,
  limit: number = 50
): Promise<ServerTimelineResponse> {
  if (!isServerTimelineEnabled()) {
    return { snapshots: [], totalCount: 0 };
  }

  try {
    // TODO: Replace with actual API endpoint when available
    const url = new URL(`/api/v2/campaigns/${campaignId}/timeline`, process.env.NEXT_PUBLIC_API_URL || '');
    if (since) {
      url.searchParams.set('since', since);
    }
    url.searchParams.set('limit', limit.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch server timeline: ${response.status}`);
    }

    const data = await response.json();
    return {
      snapshots: data.snapshots || [],
      totalCount: data.totalCount || 0,
      lastSync: data.lastSync,
    };
  } catch (error) {
    console.warn('[TimelineService] Failed to fetch server timeline:', error);
    // Graceful fallback - return empty timeline
    return { snapshots: [], totalCount: 0 };
  }
}

/**
 * Merge server snapshots with local timeline, removing duplicates
 */
export function mergeTimelines(
  localSnapshots: AggregateSnapshot[],
  serverSnapshots: AggregateSnapshot[]
): AggregateSnapshot[] {
  if (serverSnapshots.length === 0) {
    return localSnapshots;
  }

  // Create a Map for deduplication by ID
  const mergedMap = new Map<string, AggregateSnapshot>();

  // Add local snapshots first (they take precedence for duplicates)
  localSnapshots.forEach(snapshot => {
    mergedMap.set(snapshot.id, snapshot);
  });

  // Add server snapshots that don't conflict
  serverSnapshots.forEach(snapshot => {
    if (!mergedMap.has(snapshot.id)) {
      mergedMap.set(snapshot.id, snapshot);
    }
  });

  // Sort by timestamp (oldest to newest)
  return Array.from(mergedMap.values()).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Integrate server snapshot batch into local history store
 * Returns the count of newly added snapshots
 */
export function integrateServerSnapshotBatch(
  campaignId: string,
  serverSnapshots: AggregateSnapshot[],
  addSnapshotFn: (campaignId: string, snapshot: AggregateSnapshot, pinned?: boolean) => void
): number {
  if (!isServerTimelineEnabled() || serverSnapshots.length === 0) {
    return 0;
  }

  let addedCount = 0;

  serverSnapshots.forEach(snapshot => {
    try {
      // Add to history store with pinned = true to prevent pruning
      addSnapshotFn(campaignId, snapshot, true);
      addedCount++;
    } catch (error) {
      console.warn('[TimelineService] Failed to integrate snapshot:', snapshot.id, error);
    }
  });

  return addedCount;
}

/**
 * Check if server timeline integration is available
 */
export function isServerTimelineAvailable(): boolean {
  return isServerTimelineEnabled() && !!process.env.NEXT_PUBLIC_API_URL;
}

/**
 * Get the last server sync timestamp for a campaign
 */
export function getLastServerSync(campaignId: string): string | null {
  // This would typically be stored in metadata or localStorage
  const key = `campaign_timeline_sync_${campaignId}`;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Set the last server sync timestamp for a campaign
 */
export function setLastServerSync(campaignId: string, timestamp: string): void {
  const key = `campaign_timeline_sync_${campaignId}`;
  try {
    localStorage.setItem(key, timestamp);
  } catch (error) {
    console.warn('[TimelineService] Failed to save sync timestamp:', error);
  }
}