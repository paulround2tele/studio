/**
 * Tests for FetchWithPolicy (Phase 7)
 */

import { FetchWithPolicy, fetchWithPolicy } from '../fetchWithPolicy';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Mock telemetry service
jest.mock('../../../services/campaignMetrics/telemetryService', () => ({
  telemetryService: {
    emitTelemetry: jest.fn(),
  },
}));

describe('FetchWithPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should execute successful fetch', async () => {
      const mockData = { success: true, data: 'test' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        json: () => Promise.resolve(mockData),
      });

      const result = await FetchWithPolicy.execute('https://api.example.com/test');
      
      expect(result.data).toEqual(mockData);
      expect(result.status).toBe(200);
      expect(result.fromCache).toBe(false);
    });

    it('should retry on server errors', async () => {
      const mockData = { success: true };
      
      // First call fails, second succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map(),
          json: () => Promise.resolve(mockData),
        });

      const result = await FetchWithPolicy.execute('https://api.example.com/test', {}, {
        retries: 2,
        timeoutMs: 5000,
      });
      
      expect(result.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client errors (4xx)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
      });

      await expect(
        FetchWithPolicy.execute('https://api.example.com/test')
      ).rejects.toThrow('HTTP 404: Not Found');
      
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              headers: new Map(),
              json: () => Promise.resolve({}),
            });
          }, 15000); // 15 seconds (longer than timeout)
        });
      });

      const fetchPromise = FetchWithPolicy.execute('https://api.example.com/test', {}, {
        timeoutMs: 1000, // 1 second timeout
      });

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1000);

      await expect(fetchPromise).rejects.toThrow('Request timeout');
    });
  });

  describe('convenience function', () => {
    it('should work with fetchWithPolicy helper', async () => {
      const mockData = { test: true };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchWithPolicy('https://api.example.com/test');
      
      expect(result).toEqual(mockData);
    });
  });
});