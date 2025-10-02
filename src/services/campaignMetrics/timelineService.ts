/**
 * Timeline Service (Phase 7)
 * Server historical timeline integration with pagination and canonical resolution
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';
import { capabilitiesService } from './capabilitiesService';
import { telemetryService } from './telemetryService';
import { fetchWithPolicy } from '@/lib/utils/fetchWithPolicy';
// Alias feature flag helpers to avoid react-hooks lint violations in non-React service file
import { useBackendCanonical as backendCanonicalEnabled, useTimelinePagination as timelinePaginationEnabled } from '@/lib/feature-flags-simple';

// Feature flag for server timeline
const isServerTimelineEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_SERVER_TIMELINE !== 'false';

/**
 * Server timeline response structure (Phase 7 enhanced)
 */
export interface ServerTimelineResponse {
  snapshots: AggregateSnapshot[];
  totalCount: number;
  lastSync?: string;
  // Phase 7: Pagination support
  cursor?: string;
  hasMore?: boolean;
  nextCursor?: string;
}

/**
 * Timeline pagination options
 */
export interface TimelinePaginationOptions {
  cursor?: string;
  before?: string;
  limit?: number;
}

/**
 * Fetch server timeline snapshots for a campaign (Phase 7 enhanced)
 */
export async function fetchServerTimeline(
  campaignId: string,
  since?: string,
  limit: number = 50,
  paginationOptions?: TimelinePaginationOptions
): Promise<ServerTimelineResponse> {
  if (!isServerTimelineEnabled()) {
    return { snapshots: [], totalCount: 0 };
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error('API URL not configured');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (since) params.set('since', since);
    params.set('limit', limit.toString());
    
    // Phase 7: Add pagination parameters
  if (timelinePaginationEnabled() && paginationOptions) {
      if (paginationOptions.cursor) params.set('cursor', paginationOptions.cursor);
      if (paginationOptions.before) params.set('before', paginationOptions.before);
      if (paginationOptions.limit) params.set('limit', paginationOptions.limit.toString());
    }

    const url = `${apiUrl}/campaigns/${campaignId}/timeline?${params.toString()}`;

    const response = await fetchWithPolicy<ServerTimelineResponse>(
      url,
      { method: 'GET' },
      {
        category: 'api',
        retries: 2,
        timeoutMs: 10000,
      }
    );

    // Validate response structure
    if (!response.snapshots || !Array.isArray(response.snapshots)) {
      throw new Error('Invalid timeline response structure');
    }

    return response;
  } catch (error) {
    console.warn('[TimelineService] Failed to fetch server timeline:', error);
    
    // Emit domain validation failure if appropriate
    if (error instanceof Error && error.message.includes('validation')) {
      telemetryService.emitTelemetry('domain_validation_fail', {
        domain: 'timeline',
        reason: error.message,
      });
    }
    
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

/**
 * Fetch next page of timeline data (Phase 7)
 */
export async function fetchNextTimelinePage(
  campaignId: string,
  cursor: string,
  limit: number = 50
): Promise<ServerTimelineResponse> {
  if (!timelinePaginationEnabled()) {
    throw new Error('Timeline pagination is disabled');
  }

  return fetchServerTimeline(campaignId, undefined, limit, {
    cursor,
    limit,
  });
}

/**
 * Unified timeline fetch with domain resolution (Phase 7)
 */
export async function getTimeline(
  campaignId: string,
  since?: string,
  limit: number = 50
): Promise<ServerTimelineResponse> {
  // Phase 7: Use domain resolution for server vs client decision
  let resolution: 'server' | 'client-fallback' | 'skip' = 'client-fallback';
  
  if (backendCanonicalEnabled()) {
    try {
      // Ensure capabilities are loaded
      await capabilitiesService.initialize();
      resolution = capabilitiesService.resolveDomain('timeline');
    } catch (error) {
      console.warn('[getTimeline] Failed to resolve domain, falling back to client:', error);
      resolution = 'client-fallback';
    }
  }

  // Try server timeline if resolution indicates server
  if (resolution === 'server') {
    try {
      return await fetchServerTimeline(campaignId, since, limit);
    } catch (error) {
      console.warn('[getTimeline] Server timeline failed, falling back:', error);
      // Fall through to client fallback
    }
  }

  // Client fallback or skip
  if (resolution === 'skip') {
    return { snapshots: [], totalCount: 0 };
  }

  // Return empty timeline as client fallback
  // In a real implementation, this might return locally stored snapshots
  return { snapshots: [], totalCount: 0 };
}