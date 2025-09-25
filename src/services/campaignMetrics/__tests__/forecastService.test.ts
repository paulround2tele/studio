/**
 * Tests for Forecast Service (Phase 6)
 */

import {
  computeClientForecast,
  extractTimeSeriesFromSnapshots,
  mergeForecastIntoSeries,
  isForecastAvailable
} from '../forecastService';
import type { AggregateSnapshot } from '@/types/campaignMetrics';

// Mock environment variable
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

// Test data
const mockSnapshots: AggregateSnapshot[] = [
  {
    id: '1',
    timestamp: '2024-01-01T00:00:00Z',
    aggregates: { totalDomains: 100, successRate: 0.85, avgLeadScore: 67.5, dnsSuccessRate: 0.92, httpSuccessRate: 0.88 },
    classifiedCounts: { highQuality: 30, mediumQuality: 40, lowQuality: 30, total: 100 }
  },
  {
    id: '2',
    timestamp: '2024-01-02T00:00:00Z',
    aggregates: { totalDomains: 105, successRate: 0.82, avgLeadScore: 65.2, dnsSuccessRate: 0.91, httpSuccessRate: 0.85 },
    classifiedCounts: { highQuality: 32, mediumQuality: 42, lowQuality: 31, total: 105 }
  },
  {
    id: '3',
    timestamp: '2024-01-03T00:00:00Z',
    aggregates: { totalDomains: 110, successRate: 0.87, avgLeadScore: 69.1, dnsSuccessRate: 0.93, httpSuccessRate: 0.89 },
    classifiedCounts: { highQuality: 35, mediumQuality: 45, lowQuality: 30, total: 110 }
  },
  {
    id: '4',
    timestamp: '2024-01-04T00:00:00Z',
    aggregates: { totalDomains: 115, successRate: 0.84, avgLeadScore: 66.8, dnsSuccessRate: 0.90, httpSuccessRate: 0.86 },
    classifiedCounts: { highQuality: 38, mediumQuality: 47, lowQuality: 30, total: 115 }
  },
  {
    id: '5',
    timestamp: '2024-01-05T00:00:00Z',
    aggregates: { totalDomains: 120, successRate: 0.86, avgLeadScore: 68.3, dnsSuccessRate: 0.94, httpSuccessRate: 0.88 },
    classifiedCounts: { highQuality: 40, mediumQuality: 48, lowQuality: 32, total: 120 }
  },
  {
    id: '6',
    timestamp: '2024-01-06T00:00:00Z',
    aggregates: { totalDomains: 125, successRate: 0.83, avgLeadScore: 67.9, dnsSuccessRate: 0.92, httpSuccessRate: 0.87 },
    classifiedCounts: { highQuality: 42, mediumQuality: 50, lowQuality: 33, total: 125 }
  },
  {
    id: '7',
    timestamp: '2024-01-07T00:00:00Z',
    aggregates: { totalDomains: 130, successRate: 0.88, avgLeadScore: 70.1, dnsSuccessRate: 0.95, httpSuccessRate: 0.90 },
    classifiedCounts: { highQuality: 45, mediumQuality: 52, lowQuality: 33, total: 130 }
  },
  {
    id: '8',
    timestamp: '2024-01-08T00:00:00Z',
    aggregates: { totalDomains: 135, successRate: 0.85, avgLeadScore: 68.7, dnsSuccessRate: 0.93, httpSuccessRate: 0.88 },
    classifiedCounts: { highQuality: 47, mediumQuality: 54, lowQuality: 34, total: 135 }
  }
];

describe('Forecast Service', () => {
  describe('isForecastAvailable', () => {
    it('should return true when forecasts are enabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_FORECASTS = 'true';
      expect(isForecastAvailable()).toBe(true);
    });

    it('should return false when forecasts are disabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_FORECASTS = 'false';
      expect(isForecastAvailable()).toBe(false);
    });

    it('should default to enabled', () => {
      delete process.env.NEXT_PUBLIC_ENABLE_FORECASTS;
      expect(isForecastAvailable()).toBe(true);
    });
  });

  describe('extractTimeSeriesFromSnapshots', () => {
    it('should extract time series data correctly', () => {
      const timeSeries = extractTimeSeriesFromSnapshots(mockSnapshots, 'avgLeadScore');
      
      expect(timeSeries).toHaveLength(8);
      expect(timeSeries[0]).toEqual({
        timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
        value: 67.5
      });
      expect(timeSeries[7]).toEqual({
        timestamp: new Date('2024-01-08T00:00:00Z').getTime(),
        value: 68.7
      });
    });

    it('should exclude forecast snapshots', () => {
      const snapshotsWithForecast = [
        ...mockSnapshots,
        {
          id: 'forecast-1',
          timestamp: '2024-01-09T00:00:00Z',
          aggregates: { totalDomains: 0, successRate: 0, avgLeadScore: 70.0, dnsSuccessRate: 0, httpSuccessRate: 0 },
          classifiedCounts: { highQuality: 0, mediumQuality: 0, lowQuality: 0, total: 0 },
          forecast: { value: 70.0, lower: 65.0, upper: 75.0, isForecast: true }
        } as any
      ];

      const timeSeries = extractTimeSeriesFromSnapshots(snapshotsWithForecast, 'avgLeadScore');
      expect(timeSeries).toHaveLength(8); // Should exclude the forecast snapshot
    });

    it('should filter out NaN values', () => {
      const invalidSnapshots = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          aggregates: { totalDomains: 100, successRate: 0.85, avgLeadScore: NaN, dnsSuccessRate: 0.92, httpSuccessRate: 0.88 },
          classifiedCounts: { highQuality: 30, mediumQuality: 40, lowQuality: 30, total: 100 }
        },
        ...mockSnapshots.slice(1)
      ];

      const timeSeries = extractTimeSeriesFromSnapshots(invalidSnapshots, 'avgLeadScore');
      expect(timeSeries).toHaveLength(7); // Should exclude the NaN value
    });
  });

  describe('computeClientForecast', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_FORECASTS = 'true';
    });

    it('should return empty array for insufficient data', () => {
      const shortTimeSeries = [
        { timestamp: Date.now(), value: 67.5 },
        { timestamp: Date.now() + 86400000, value: 68.0 }
      ];

      const forecast = computeClientForecast(shortTimeSeries, 7);
      expect(forecast).toEqual([]);
    });

    it('should compute simple exponential smoothing forecast', () => {
      const timeSeries = extractTimeSeriesFromSnapshots(mockSnapshots, 'avgLeadScore');
      const forecast = computeClientForecast(timeSeries, 3, { method: 'simpleExp', alpha: 0.3 });

      expect(forecast).toHaveLength(3);
      
      // Check forecast structure
      expect(forecast[0]).toMatchObject({
        timestamp: expect.any(String),
        metricKey: 'forecast',
        value: expect.any(Number),
        lower: expect.any(Number),
        upper: expect.any(Number)
      });

      // Confidence bands should be properly ordered
      expect(forecast[0].lower).toBeLessThanOrEqual(forecast[0].value);
      expect(forecast[0].value).toBeLessThanOrEqual(forecast[0].upper);
    });

    it('should compute Holt-Winters forecast when conditions are met', () => {
      // Create longer time series with seasonal pattern
      const longTimeSeries = [];
      const baseValue = 68;
      for (let i = 0; i < 30; i++) {
        const seasonalEffect = Math.sin((i / 7) * 2 * Math.PI) * 2; // Weekly pattern
        longTimeSeries.push({
          timestamp: new Date('2024-01-01').getTime() + (i * 86400000),
          value: baseValue + seasonalEffect + (i * 0.1) // Trend + seasonal
        });
      }

      const forecast = computeClientForecast(longTimeSeries, 7, { 
        method: 'holtWinters', 
        seasonLength: 7,
        alpha: 0.3,
        beta: 0.1,
        gamma: 0.1
      });

      expect(forecast).toHaveLength(7);
      expect(forecast[0].value).toBeGreaterThan(0);
    });

    it('should fallback to simple exponential smoothing for short seasonal data', () => {
      const shortSeasonalTimeSeries = [];
      for (let i = 0; i < 10; i++) {
        shortSeasonalTimeSeries.push({
          timestamp: new Date('2024-01-01').getTime() + (i * 86400000),
          value: 68 + Math.sin(i) * 2
        });
      }

      const forecast = computeClientForecast(shortSeasonalTimeSeries, 3, { 
        method: 'holtWinters', 
        seasonLength: 7 
      });

      expect(forecast).toHaveLength(3);
      // Should use simple exponential smoothing as fallback
    });

    it('should handle forecast when disabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_FORECASTS = 'false';
      
      const timeSeries = extractTimeSeriesFromSnapshots(mockSnapshots, 'avgLeadScore');
      const forecast = computeClientForecast(timeSeries, 3);

      expect(forecast).toEqual([]);
    });
  });

  describe('mergeForecastIntoSeries', () => {
    it('should merge forecast points into snapshots', () => {
      const forecastPoints = [
        {
          timestamp: '2024-01-09T00:00:00Z',
          metricKey: 'forecast',
          value: 69.5,
          lower: 65.0,
          upper: 74.0
        },
        {
          timestamp: '2024-01-10T00:00:00Z',
          metricKey: 'forecast',
          value: 70.0,
          lower: 65.5,
          upper: 74.5
        }
      ];

      const merged = mergeForecastIntoSeries(mockSnapshots, forecastPoints);
      
      expect(merged).toHaveLength(10); // 8 original + 2 forecast
      
      // Check that forecast snapshots are properly formatted
      const forecastSnapshot = merged[8];
      expect(forecastSnapshot).toMatchObject({
        id: 'forecast-0',
        timestamp: '2024-01-09T00:00:00Z',
        forecast: {
          value: 69.5,
          lower: 65.0,
          upper: 74.0,
          isForecast: true
        }
      });
    });

    it('should return original snapshots when no forecast points', () => {
      const merged = mergeForecastIntoSeries(mockSnapshots, []);
      expect(merged).toEqual(mockSnapshots);
    });
  });

  describe('performance requirements', () => {
    it('should compute forecast in under 25ms for 200 points', () => {
      // Generate 200 data points
      const largeSeries = [];
      for (let i = 0; i < 200; i++) {
        largeSeries.push({
          timestamp: new Date('2024-01-01').getTime() + (i * 86400000),
          value: 68 + Math.random() * 10
        });
      }

      const startTime = performance.now();
      const forecast = computeClientForecast(largeSeries, 7);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(25);
      expect(forecast).toHaveLength(7);
    });

    it('should compute forecast in under 60ms for 600 points', () => {
      // Generate 600 data points
      const largeSeries = [];
      for (let i = 0; i < 600; i++) {
        largeSeries.push({
          timestamp: new Date('2024-01-01').getTime() + (i * 86400000),
          value: 68 + Math.random() * 10
        });
      }

      const startTime = performance.now();
      const forecast = computeClientForecast(largeSeries, 7);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(60);
      expect(forecast).toHaveLength(7);
    });
  });
});