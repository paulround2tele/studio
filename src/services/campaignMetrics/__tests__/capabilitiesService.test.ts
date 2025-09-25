/**
 * Tests for Capabilities Service (Phase 7)
 */

import { capabilitiesService } from '../capabilitiesService';
import type { ServerCapabilities } from '../capabilitiesService';

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
jest.mock('../telemetryService', () => ({
  telemetryService: {
    emitTelemetry: jest.fn(),
  },
}));

const mockCapabilities: ServerCapabilities = {
  versions: {
    metricsSchema: '1.0',
    anomaliesModel: '2.1',
    recModel: '1.5',
    forecastModel: '2.0',
  },
  features: {
    timeline: true,
    forecasting: true,
    anomalies: true,
    recommendations: true,
    benchmarks: true,
    pagination: true,
  },
};

describe('CapabilitiesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    capabilitiesService.clearCache();
  });

  describe('fetchCapabilities', () => {
    it('should fetch capabilities from server successfully', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCapabilities),
      });

      const result = await capabilitiesService.fetchCapabilities();
      
      expect(result).toEqual(mockCapabilities);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/meta/capabilities',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should use cached capabilities when still valid', async () => {
      // Pre-populate cache with proper structure
      const cachedData = {
        ...mockCapabilities,
        lastFetched: Date.now(),
        cacheExpiry: Date.now() + 10000, // 10 seconds in future
      };
      
      localStorageMock.setItem('capabilities:v1', JSON.stringify(cachedData));

      const result = await capabilitiesService.fetchCapabilities();
      
      // Result should only contain the capabilities data, not cache metadata
      expect(result).toEqual(mockCapabilities);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return fallback capabilities on error', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await capabilitiesService.fetchCapabilities();
      
      expect(result).toEqual({
        versions: {},
        features: {
          timeline: false,
          forecasting: false,
          anomalies: false,
          recommendations: false,
          benchmarks: false,
          pagination: false,
        },
      });
    });
  });

  describe('resolveDomain', () => {
    beforeEach(async () => {
      // Setup capabilities
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCapabilities),
      });
      
      await capabilitiesService.fetchCapabilities();
    });

    it('should resolve forecast domain to server when model version >= 2', () => {
      const resolution = capabilitiesService.resolveDomain('forecast');
      expect(resolution).toBe('server');
    });

    it('should resolve anomalies domain to server when model version >= 1', () => {
      const resolution = capabilitiesService.resolveDomain('anomalies');
      expect(resolution).toBe('server');
    });

    it('should resolve timeline domain to server when feature enabled', () => {
      const resolution = capabilitiesService.resolveDomain('timeline');
      expect(resolution).toBe('server');
    });

    it('should resolve to client-fallback when version insufficient', async () => {
      const lowVersionCapabilities = {
        ...mockCapabilities,
        versions: {
          ...mockCapabilities.versions,
          forecastModel: '1.0', // Below required version 2
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(lowVersionCapabilities),
      });

      await capabilitiesService.fetchCapabilities(true); // Force refresh
      
      const resolution = capabilitiesService.resolveDomain('forecast');
      expect(resolution).toBe('client-fallback');
    });

    it('should resolve to client-fallback when no capabilities available', () => {
      capabilitiesService.clearCache();
      
      const resolution = capabilitiesService.resolveDomain('forecast');
      expect(resolution).toBe('client-fallback');
    });
  });

  describe('version change detection', () => {
    it('should emit telemetry when version changes', async () => {
      const { telemetryService } = require('../telemetryService');
      
      // Initial fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCapabilities),
      });
      
      await capabilitiesService.fetchCapabilities();
      
      // Updated capabilities with version change
      const updatedCapabilities = {
        ...mockCapabilities,
        versions: {
          ...mockCapabilities.versions,
          forecastModel: '3.0', // Changed from 2.0
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedCapabilities),
      });

      await capabilitiesService.fetchCapabilities(true); // Force refresh
      
      expect(telemetryService.emitTelemetry).toHaveBeenCalledWith(
        'capability_version_change',
        {
          key: 'forecastModel',
          oldVersion: '2.0',
          newVersion: '3.0',
        }
      );
    });
  });

  describe('caching behavior', () => {
    it('should store capabilities in localStorage', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCapabilities),
      });

      await capabilitiesService.fetchCapabilities();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'capabilities:v1',
        expect.stringContaining('versions')
      );
    });

    it('should clear cache when requested', () => {
      localStorageMock.setItem('capabilities:v1', JSON.stringify(mockCapabilities));
      
      capabilitiesService.clearCache();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('capabilities:v1');
      expect(capabilitiesService.getCurrentCapabilities()).toBeNull();
    });
  });
});