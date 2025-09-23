/**
 * History Store Tests (Phase 4)
 */

import { 
  addSnapshot, 
  getSnapshots, 
  getLatest, 
  getSnapshotCount,
  clearHistory,
  setMaxSnapshots,
  pinSnapshot,
  unpinSnapshot,
  getMemoryStats
} from '../historyStore';
import type { AggregateSnapshot } from '@/types/campaignMetrics';

// Mock environment variable
const originalEnv = process.env.NEXT_PUBLIC_ENABLE_TRENDS;

describe('historyStore', () => {
  const campaignId = 'test-campaign-123';
  
  const createMockSnapshot = (id: string, totalDomains: number = 100): AggregateSnapshot => ({
    id,
    timestamp: new Date().toISOString(),
    aggregates: {
      totalDomains,
      successRate: 95.5,
      avgLeadScore: 78.2,
      dnsSuccessRate: 98.1,
      httpSuccessRate: 93.4
    },
    classifiedCounts: {
      highQuality: 25,
      mediumQuality: 50,
      lowQuality: 25
    }
  });

  beforeEach(() => {
    // Enable trends for testing
    process.env.NEXT_PUBLIC_ENABLE_TRENDS = 'true';
    clearHistory(campaignId);
  });

  afterEach(() => {
    clearHistory(campaignId);
    process.env.NEXT_PUBLIC_ENABLE_TRENDS = originalEnv;
  });

  describe('basic operations', () => {
    it('should add and retrieve snapshots', () => {
      const snapshot1 = createMockSnapshot('snap-1');
      const snapshot2 = createMockSnapshot('snap-2');

      addSnapshot(campaignId, snapshot1);
      addSnapshot(campaignId, snapshot2);

      const snapshots = getSnapshots(campaignId);
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0]?.id).toBe('snap-1');
      expect(snapshots[1]?.id).toBe('snap-2');
    });

    it('should return latest snapshot', () => {
      const snapshot1 = createMockSnapshot('snap-1');
      const snapshot2 = createMockSnapshot('snap-2');

      addSnapshot(campaignId, snapshot1);
      addSnapshot(campaignId, snapshot2);

      const latest = getLatest(campaignId);
      expect(latest?.id).toBe('snap-2');
    });

    it('should return null for empty history', () => {
      const latest = getLatest(campaignId);
      expect(latest).toBeNull();
    });

    it('should count snapshots correctly', () => {
      expect(getSnapshotCount(campaignId)).toBe(0);

      addSnapshot(campaignId, createMockSnapshot('snap-1'));
      expect(getSnapshotCount(campaignId)).toBe(1);

      addSnapshot(campaignId, createMockSnapshot('snap-2'));
      expect(getSnapshotCount(campaignId)).toBe(2);
    });
  });

  describe('capacity management', () => {
    it('should enforce max snapshots limit', () => {
      // Add initial snapshot to create the history
      addSnapshot(campaignId, createMockSnapshot('snap-init'));
      
      // Set a small limit for testing
      setMaxSnapshots(campaignId, 3);

      // Add more snapshots than the limit
      for (let i = 1; i <= 5; i++) {
        addSnapshot(campaignId, createMockSnapshot(`snap-${i}`));
      }

      const snapshots = getSnapshots(campaignId);
      expect(snapshots).toHaveLength(3);
      
      // Should keep the most recent ones
      const lastSnapshot = snapshots[snapshots.length - 1];
      expect(lastSnapshot?.id).toBe('snap-5');
    });

    it('should preserve pinned snapshots during pruning', () => {
      // Add initial snapshot to create the history  
      addSnapshot(campaignId, createMockSnapshot('snap-init'));
      
      setMaxSnapshots(campaignId, 2);

      const snapshot1 = createMockSnapshot('snap-1');
      const snapshot2 = createMockSnapshot('snap-2');
      const snapshot3 = createMockSnapshot('snap-3');

      addSnapshot(campaignId, snapshot1, true); // pinned
      addSnapshot(campaignId, snapshot2);
      addSnapshot(campaignId, snapshot3);

      const snapshots = getSnapshots(campaignId);
      expect(snapshots).toHaveLength(2);
      
      // Should include the pinned snapshot
      expect(snapshots.find(s => s.id === 'snap-1')).toBeDefined();
    });
  });

  describe('pinning functionality', () => {
    it('should pin and unpin snapshots', () => {
      const snapshot = createMockSnapshot('snap-1');
      addSnapshot(campaignId, snapshot);

      expect(pinSnapshot(campaignId, 'snap-1')).toBe(true);
      expect(unpinSnapshot(campaignId, 'snap-1')).toBe(true);
    });

    it('should return false for non-existent snapshots', () => {
      expect(pinSnapshot(campaignId, 'non-existent')).toBe(false);
      expect(unpinSnapshot(campaignId, 'non-existent')).toBe(false);
    });
  });

  describe('memory statistics', () => {
    it('should provide memory usage stats', () => {
      addSnapshot(campaignId, createMockSnapshot('snap-1'));
      addSnapshot(campaignId, createMockSnapshot('snap-2'));

      const stats = getMemoryStats();
      expect(stats.campaignCount).toBe(1);
      expect(stats.totalSnapshots).toBe(2);
      expect(stats.estimatedSizeKB).toBeGreaterThan(0);
    });
  });

  describe('feature flag disabled', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_TRENDS = 'false';
    });

    it('should not store snapshots when trends disabled', () => {
      const snapshot = createMockSnapshot('snap-1');
      addSnapshot(campaignId, snapshot);

      expect(getSnapshots(campaignId)).toHaveLength(0);
      expect(getLatest(campaignId)).toBeNull();
    });
  });
});