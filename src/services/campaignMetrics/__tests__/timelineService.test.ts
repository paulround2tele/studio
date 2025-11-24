/**
 * Timeline Service Tests (Phase 5)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  fetchServerTimeline, 
  mergeTimelines, 
  integrateServerSnapshotBatch 
} from '@/services/campaignMetrics/timelineService';
import { AggregateSnapshot } from '@/types/campaignMetrics';
const mockFetch = jest.fn();
// @ts-expect-error global assignment for tests
global.fetch = mockFetch;

// Mock environment
process.env.NEXT_PUBLIC_ENABLE_SERVER_TIMELINE = 'true';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080/api/v2';

describe('TimelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    process.env.NEXT_PUBLIC_ENABLE_SERVER_TIMELINE = 'true';
  });

  const mockSnapshot1: AggregateSnapshot = {
    id: 'snap1',
    timestamp: '2024-01-01T10:00:00Z',
    aggregates: {
      totalDomains: 100,
      successRate: 0.8,
      avgLeadScore: 75,
      dnsSuccessRate: 0.9,
      httpSuccessRate: 0.85
    },
    classifiedCounts: { high: 30, medium: 50, low: 20 }
  };

  const mockSnapshot2: AggregateSnapshot = {
    id: 'snap2',
    timestamp: '2024-01-01T11:00:00Z',
    aggregates: {
      totalDomains: 120,
      successRate: 0.82,
      avgLeadScore: 78,
      dnsSuccessRate: 0.91,
      httpSuccessRate: 0.87
    },
    classifiedCounts: { high: 35, medium: 60, low: 25 }
  };

  describe('fetchServerTimeline', () => {
    it('should fetch server timeline successfully', async () => {
      const mockResponse = {
        snapshots: [mockSnapshot1, mockSnapshot2],
        totalCount: 2,
        lastSync: '2024-01-01T12:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchServerTimeline('campaign1', undefined, 50);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v2/campaigns/campaign1/timeline?limit=50',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchServerTimeline('campaign1');

      expect(result).toEqual({
        snapshots: [],
        totalCount: 0
      });
    });

    it('should return empty result when feature disabled', async () => {
      process.env.NEXT_PUBLIC_ENABLE_SERVER_TIMELINE = 'false';

      const result = await fetchServerTimeline('campaign1');

      expect(result).toEqual({
        snapshots: [],
        totalCount: 0
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('mergeTimelines', () => {
    it('should merge local and server snapshots without duplicates', () => {
      const localSnapshots = [mockSnapshot1];
      const serverSnapshots = [mockSnapshot2, mockSnapshot1]; // Include duplicate

      const result = mergeTimelines(localSnapshots, serverSnapshots);

      expect(result).toHaveLength(2);
      expect(result.map(s => s.id)).toEqual(['snap1', 'snap2']);
      // Should be sorted by timestamp
      expect(result[0].id).toBe('snap1'); // Earlier timestamp
      expect(result[1].id).toBe('snap2'); // Later timestamp
    });

    it('should handle empty server snapshots', () => {
      const localSnapshots = [mockSnapshot1];
      const serverSnapshots: AggregateSnapshot[] = [];

      const result = mergeTimelines(localSnapshots, serverSnapshots);

      expect(result).toEqual(localSnapshots);
    });

    it('should prioritize local snapshots for duplicates', () => {
      const localSnapshot = { ...mockSnapshot1, aggregates: { ...mockSnapshot1.aggregates, totalDomains: 999 } };
      const serverSnapshot = mockSnapshot1; // Same ID

      const result = mergeTimelines([localSnapshot], [serverSnapshot]);

      expect(result).toHaveLength(1);
      expect(result[0].aggregates.totalDomains).toBe(999); // Local version kept
    });
  });

  describe('integrateServerSnapshotBatch', () => {
    it('should integrate server snapshots and return count', () => {
      const mockAddSnapshot = jest.fn();
      const serverSnapshots = [mockSnapshot1, mockSnapshot2];

      const result = integrateServerSnapshotBatch(
        'campaign1',
        serverSnapshots,
        mockAddSnapshot
      );

      expect(result).toBe(2);
      expect(mockAddSnapshot).toHaveBeenCalledTimes(2);
      expect(mockAddSnapshot).toHaveBeenCalledWith('campaign1', mockSnapshot1, true);
      expect(mockAddSnapshot).toHaveBeenCalledWith('campaign1', mockSnapshot2, true);
    });

    it('should handle integration errors gracefully', () => {
      const mockAddSnapshot = jest.fn().mockImplementation(() => {
        throw new Error('Add failed');
      });
      const serverSnapshots = [mockSnapshot1];

      const result = integrateServerSnapshotBatch(
        'campaign1',
        serverSnapshots,
        mockAddSnapshot
      );

      expect(result).toBe(0); // No snapshots successfully added
    });

    it('should return 0 when feature disabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_SERVER_TIMELINE = 'false';
      const mockAddSnapshot = jest.fn();

      const result = integrateServerSnapshotBatch(
        'campaign1',
        [mockSnapshot1],
        mockAddSnapshot
      );

      expect(result).toBe(0);
      expect(mockAddSnapshot).not.toHaveBeenCalled();
    });
  });
});