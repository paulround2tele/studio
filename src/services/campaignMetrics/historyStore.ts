/**
 * Campaign Metrics History Store (Phase 4)
 * In-memory capped ring buffer per campaignId with TTL-based pruning
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';

interface HistoryEntry {
  snapshot: AggregateSnapshot;
  timestamp: number;
  pinned: boolean;
}

interface CampaignHistory {
  entries: HistoryEntry[];
  maxSnapshots: number;
}

// In-memory store
const store = new Map<string, CampaignHistory>();

// Configuration
const DEFAULT_MAX_SNAPSHOTS = 50;
const DEFAULT_TTL_HOURS = 24;
const STORAGE_KEY_PREFIX = 'campaign_history_';
const MAX_LOCALSTORAGE_SNAPSHOTS = 10;

// Feature flags (checked at runtime)
const isEnabled = () => process.env.NEXT_PUBLIC_ENABLE_TRENDS !== 'false';
const ENABLE_LOCALSTORAGE = typeof window !== 'undefined' && window.localStorage;

/**
 * Add a new snapshot to the history
 */
export function addSnapshot(
  campaignId: string, 
  snapshot: AggregateSnapshot, 
  pinned: boolean = false
): void {
  if (!isEnabled()) return;

  const now = Date.now();
  const entry: HistoryEntry = {
    snapshot,
    timestamp: now,
    pinned
  };

  // Get or create campaign history
  let history = store.get(campaignId);
  if (!history) {
    history = {
      entries: [],
      maxSnapshots: DEFAULT_MAX_SNAPSHOTS
    };
    store.set(campaignId, history);
  }

  // Add new entry
  history.entries.push(entry);

  // Prune by size (keep pinned entries)
  if (history.entries.length > history.maxSnapshots) {
    const pinnedEntries = history.entries.filter(e => e.pinned);
    const unpinnedEntries = history.entries.filter(e => !e.pinned);
    
    // Calculate how many unpinned entries we can keep
    const maxUnpinned = Math.max(0, history.maxSnapshots - pinnedEntries.length);
    
    if (unpinnedEntries.length > maxUnpinned) {
      // Keep the most recent unpinned entries
      const sortedUnpinned = unpinnedEntries.sort((a, b) => b.timestamp - a.timestamp);
      const keepUnpinned = sortedUnpinned.slice(0, maxUnpinned);
      history.entries = [...pinnedEntries, ...keepUnpinned];
    }
  }

  // Prune by TTL
  pruneByTTL(campaignId);

  // Update localStorage if enabled
  if (ENABLE_LOCALSTORAGE) {
    updateLocalStorage(campaignId, history);
  }
}

/**
 * Get all snapshots for a campaign
 */
export function getSnapshots(campaignId: string): AggregateSnapshot[] {
  if (!isEnabled()) return [];

  const history = store.get(campaignId);
  if (!history) {
    // Try loading from localStorage
    if (ENABLE_LOCALSTORAGE) {
      loadFromLocalStorage(campaignId);
      const reloadedHistory = store.get(campaignId);
      if (reloadedHistory) {
        return reloadedHistory.entries
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(e => e.snapshot);
      }
    }
    return [];
  }

  // Prune before returning
  pruneByTTL(campaignId);

  return history.entries
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(e => e.snapshot);
}

/**
 * Get the latest snapshot for a campaign
 */
export function getLatest(campaignId: string): AggregateSnapshot | null {
  const snapshots = getSnapshots(campaignId);
  if (snapshots.length === 0) return null;
  
  const latest = snapshots[snapshots.length - 1];
  return latest || null;
}

/**
 * Get snapshots count for a campaign
 */
export function getSnapshotCount(campaignId: string): number {
  const snapshots = getSnapshots(campaignId);
  return snapshots.length;
}

/**
 * Clear history for a campaign
 */
export function clearHistory(campaignId: string): void {
  store.delete(campaignId);
  
  if (ENABLE_LOCALSTORAGE) {
    const key = STORAGE_KEY_PREFIX + campaignId;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear localStorage history:', error);
    }
  }
}

/**
 * Configure maximum snapshots for a campaign
 */
export function setMaxSnapshots(campaignId: string, maxSnapshots: number): void {
  const history = store.get(campaignId);
  if (history) {
    history.maxSnapshots = Math.max(1, maxSnapshots);
    // Re-prune if necessary
    if (history.entries.length > history.maxSnapshots) {
      const lastEntry = history.entries[history.entries.length - 1];
      if (lastEntry) {
        addSnapshot(campaignId, lastEntry.snapshot);
      }
    }
  }
}

/**
 * Pin a snapshot to prevent it from being pruned
 */
export function pinSnapshot(campaignId: string, snapshotId: string): boolean {
  const history = store.get(campaignId);
  if (!history) return false;

  const entry = history.entries.find(e => e.snapshot.id === snapshotId);
  if (entry) {
    entry.pinned = true;
    if (ENABLE_LOCALSTORAGE) {
      updateLocalStorage(campaignId, history);
    }
    return true;
  }
  return false;
}

/**
 * Unpin a snapshot
 */
export function unpinSnapshot(campaignId: string, snapshotId: string): boolean {
  const history = store.get(campaignId);
  if (!history) return false;

  const entry = history.entries.find(e => e.snapshot.id === snapshotId);
  if (entry) {
    entry.pinned = false;
    if (ENABLE_LOCALSTORAGE) {
      updateLocalStorage(campaignId, history);
    }
    return true;
  }
  return false;
}

/**
 * Prune entries older than TTL (unless pinned)
 */
function pruneByTTL(campaignId: string): void {
  const history = store.get(campaignId);
  if (!history) return;

  const ttlMs = DEFAULT_TTL_HOURS * 60 * 60 * 1000;
  const cutoff = Date.now() - ttlMs;

  const initialCount = history.entries.length;
  history.entries = history.entries.filter(entry => 
    entry.pinned || entry.timestamp > cutoff
  );

  // Update localStorage if entries were pruned
  if (ENABLE_LOCALSTORAGE && history.entries.length < initialCount) {
    updateLocalStorage(campaignId, history);
  }
}

/**
 * Update localStorage with compressed snapshot data
 */
function updateLocalStorage(campaignId: string, history: CampaignHistory): void {
  if (!ENABLE_LOCALSTORAGE) return;

  const key = STORAGE_KEY_PREFIX + campaignId;
  
  try {
    // Keep only the most recent snapshots for localStorage
    const recentEntries = history.entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_LOCALSTORAGE_SNAPSHOTS);

    const compressed = {
      entries: recentEntries.map(entry => ({
        snapshot: {
          id: entry.snapshot.id,
          timestamp: entry.snapshot.timestamp,
          // Only store essential aggregate data
          aggregates: {
            totalDomains: entry.snapshot.aggregates.totalDomains,
            avgLeadScore: entry.snapshot.aggregates.avgLeadScore,
            successRate: entry.snapshot.aggregates.successRate,
            // Add other essential fields as needed
          }
        },
        timestamp: entry.timestamp,
        pinned: entry.pinned
      })),
      version: 1
    };

    localStorage.setItem(key, JSON.stringify(compressed));
  } catch (error) {
    console.warn('Failed to save history to localStorage:', error);
  }
}

/**
 * Load history from localStorage
 */
function loadFromLocalStorage(campaignId: string): void {
  if (!ENABLE_LOCALSTORAGE) return;

  const key = STORAGE_KEY_PREFIX + campaignId;
  
  try {
    const data = localStorage.getItem(key);
    if (!data) return;

    const parsed = JSON.parse(data);
    if (parsed.version === 1 && Array.isArray(parsed.entries)) {
      const history: CampaignHistory = {
        entries: parsed.entries.map((entry: any) => ({
          snapshot: entry.snapshot as AggregateSnapshot,
          timestamp: entry.timestamp,
          pinned: entry.pinned || false
        })),
        maxSnapshots: DEFAULT_MAX_SNAPSHOTS
      };

      store.set(campaignId, history);
    }
  } catch (error) {
    console.warn('Failed to load history from localStorage:', error);
  }
}

/**
 * Get memory usage statistics
 */
export function getMemoryStats(): {
  campaignCount: number;
  totalSnapshots: number;
  estimatedSizeKB: number;
} {
  let totalSnapshots = 0;
  let estimatedSize = 0;

  for (const [campaignId, history] of store.entries()) {
    totalSnapshots += history.entries.length;
    // Rough estimate: each snapshot ~2KB
    estimatedSize += history.entries.length * 2;
  }

  return {
    campaignCount: store.size,
    totalSnapshots,
    estimatedSizeKB: estimatedSize
  };
}