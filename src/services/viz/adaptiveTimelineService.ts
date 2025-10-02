/**
 * Adaptive Timeline Service (Phase 11)
 * Dynamic downsampling with focus+context rendering and semantic emphasis
 */

import { useAdaptiveVisualization } from '../../lib/feature-flags-simple';
import { telemetryService } from '../campaignMetrics/telemetryService';
import { safeAt, safeFirst, safeLast, hasMinElements, isNonEmptyArray } from '@/lib/utils/arrayUtils';

// Feature flag check
const isAdaptiveVizEnabled = (): boolean => {
  return useAdaptiveVisualization();
};

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  metricKey: string;
  metadata?: Record<string, any>;
}

/**
 * Visualization options
 */
export interface VisualizationOptions {
  focusWindow?: {
    startTimestamp: number;
    endTimestamp: number;
  };
  maxPoints: number;
  preserveExtremes?: boolean;
  semanticHighlights?: boolean;
  resolutionLevels?: number[];
}

/**
 * Semantic highlight types
 */
export type SemanticHighlightType = 
  | 'causal_pivot'
  | 'experiment_switch'
  | 'intervention'
  | 'anomaly'
  | 'threshold_breach';

/**
 * Semantic highlight point
 */
export interface SemanticHighlight {
  timestamp: number;
  type: SemanticHighlightType;
  severity: 'low' | 'medium' | 'high';
  label: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Multi-resolution series data
 */
export interface MultiResolutionSeries {
  metricKey: string;
  resolutions: Map<number, TimeSeriesPoint[]>; // resolution level -> points
  highlights: SemanticHighlight[];
  focusWindow?: {
    startTimestamp: number;
    endTimestamp: number;
  };
  originalPointCount: number;
  downsampledPointCount: number;
  preservedExtremes: TimeSeriesPoint[];
}

/**
 * LTTB (Largest Triangle Three Buckets) downsampling algorithm
 */
class LTTBDownsampler {
  /**
   * Downsample time series using LTTB algorithm
   */
  static downsample(points: TimeSeriesPoint[], targetCount: number): TimeSeriesPoint[] {
    // Early return for insufficient data
    if (!hasMinElements(points, 1)) {
      return [];
    }
    
    if (points.length <= targetCount) {
      return [...points];
    }

    if (targetCount < 3) {
      return points.slice(0, targetCount);
    }

    const downsampled: TimeSeriesPoint[] = [];
    
    // Always include first point (safe access)
    const firstPoint = safeFirst(points);
    if (!firstPoint) {
      return [];
    }
    downsampled.push(firstPoint);
    
    const bucketSize = (points.length - 2) / (targetCount - 2);
    
    for (let i = 1; i < targetCount - 1; i++) {
      const bucketStart = Math.floor(i * bucketSize) + 1;
      const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;
      
      let maxTriangleArea = 0;
      let selectedPoint = safeAt(points, bucketStart);
      
      // Previous point for triangle calculation (safe access)
      const prevPoint = safeLast(downsampled);
      if (!prevPoint || !selectedPoint) {
        continue;
      }
      
      // Next bucket average for triangle calculation
      const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
      const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, points.length);
      
      let nextAvgTimestamp = 0;
      let nextAvgValue = 0;
      let nextBucketCount = 0;
      
      for (let j = nextBucketStart; j < nextBucketEnd; j++) {
        const point = safeAt(points, j);
        if (point) {
          nextAvgTimestamp += point.timestamp;
          nextAvgValue += point.value;
          nextBucketCount++;
        }
      }
      
      if (nextBucketCount > 0) {
        nextAvgTimestamp /= nextBucketCount;
        nextAvgValue /= nextBucketCount;
      }
      
      // Find point in current bucket that forms largest triangle
      for (let j = bucketStart; j < bucketEnd; j++) {
        const currentPoint = safeAt(points, j);
        if (!currentPoint) continue;
        
        // Calculate triangle area
        const area = Math.abs(
          (prevPoint.timestamp - nextAvgTimestamp) * (currentPoint.value - prevPoint.value) -
          (prevPoint.timestamp - currentPoint.timestamp) * (nextAvgValue - prevPoint.value)
        ) / 2;
        
        if (area > maxTriangleArea) {
          maxTriangleArea = area;
          selectedPoint = currentPoint;
        }
      }
      
      if (selectedPoint) {
        downsampled.push(selectedPoint);
      }
    }
    
    // Always include last point (safe access)
    const lastPoint = safeLast(points);
    if (lastPoint) {
      downsampled.push(lastPoint);
    }
    
    return downsampled;
  }
}

/**
 * Adaptive Timeline Service Implementation
 */
class AdaptiveTimelineService {
  private seriesCache = new Map<string, MultiResolutionSeries>();
  private readonly DEFAULT_RESOLUTION_LEVELS = [100, 500, 1000, 5000];

  /**
   * Prepare series data with adaptive downsampling
   */
  prepareSeries(
    metricKey: string,
    points: TimeSeriesPoint[],
    options: VisualizationOptions = { maxPoints: 1000 }
  ): MultiResolutionSeries {
    if (!isAdaptiveVizEnabled()) {
      // Return simple series without adaptive features
      return {
        metricKey,
        resolutions: new Map([[options.maxPoints, points.slice(0, options.maxPoints)]]),
        highlights: [],
        originalPointCount: points.length,
        downsampledPointCount: Math.min(points.length, options.maxPoints),
        preservedExtremes: []
      };
    }

    const startTime = performance.now();
    
    // Create cache key
    const cacheKey = this.createCacheKey(metricKey, points, options);
    
    // Check cache first
    const cached = this.seriesCache.get(cacheKey);
    if (cached) {
      telemetryService.emitTelemetry('viz_series_cache_hit', { metricKey });
      return cached;
    }

    // Determine resolution levels
    const resolutionLevels = options.resolutionLevels || this.DEFAULT_RESOLUTION_LEVELS;
    const resolutions = new Map<number, TimeSeriesPoint[]>();

    // Generate multi-resolution data
    for (const level of resolutionLevels) {
      if (level >= points.length) {
        resolutions.set(level, [...points]);
      } else {
        const downsampled = LTTBDownsampler.downsample(points, level);
        resolutions.set(level, downsampled);
      }
    }

    // Preserve extremes if requested
    const preservedExtremes = options.preserveExtremes 
      ? this.findExtremes(points)
      : [];

    // Generate semantic highlights
    const highlights = options.semanticHighlights
      ? this.generateSemanticHighlights(points, metricKey)
      : [];

    // Apply focus window if specified
    if (options.focusWindow) {
      this.applyFocusWindow(resolutions, options.focusWindow);
    }

    const series: MultiResolutionSeries = {
      metricKey,
      resolutions,
      highlights,
      focusWindow: options.focusWindow,
      originalPointCount: points.length,
      downsampledPointCount: resolutions.get(options.maxPoints)?.length || 0,
      preservedExtremes
    };

    // Cache the result
    this.seriesCache.set(cacheKey, series);

    const processingTimeMs = performance.now() - startTime;

    telemetryService.emitTelemetry('viz_series_prepared', {
      metricKey,
      inputPoints: points.length,
      outputPoints: series.downsampledPointCount,
      highlights: highlights.length,
      resolutionLevels: resolutionLevels.length,
      processingTimeMs
    });

    return series;
  }

  /**
   * Get optimal resolution for viewport
   */
  getOptimalResolution(
    series: MultiResolutionSeries,
    viewportWidth: number,
    pixelDensity: number = 1
  ): TimeSeriesPoint[] {
    if (!isAdaptiveVizEnabled()) {
      const firstResolution = Array.from(series.resolutions.values())[0];
      return firstResolution || [];
    }

    // Calculate optimal point density (2-3 points per pixel)
    const optimalPointCount = Math.floor(viewportWidth * pixelDensity * 2.5);
    
    // Find closest resolution level
    const resolutionLevels = Array.from(series.resolutions.keys());
    if (resolutionLevels.length === 0) {
      return [];
    }
    
    let bestResolution = resolutionLevels[0];
  if (bestResolution === undefined) return [];
  let bestDifference = Math.abs(bestResolution - optimalPointCount);

    for (const level of resolutionLevels) {
      const difference = Math.abs(level - optimalPointCount);
      if (difference < bestDifference) {
        bestDifference = difference;
        bestResolution = level;
      }
    }

  const selectedPoints = (bestResolution !== undefined ? series.resolutions.get(bestResolution) : undefined) || [];

    // Add preserved extremes if they fall within focus window
    const result = [...selectedPoints];
    
    if (series.focusWindow) {
      const focusExtremes = series.preservedExtremes.filter(point =>
        point.timestamp >= series.focusWindow!.startTimestamp &&
        point.timestamp <= series.focusWindow!.endTimestamp
      );
      
      // Merge extremes with selected points (avoid duplicates)
      for (const extreme of focusExtremes) {
        const exists = result.some(point => 
          Math.abs(point.timestamp - extreme.timestamp) < 1000 // Within 1 second
        );
        if (!exists) {
          result.push(extreme);
        }
      }
      
      // Sort by timestamp
      result.sort((a, b) => a.timestamp - b.timestamp);
    }

    telemetryService.emitTelemetry('viz_resolution_selected', {
      metricKey: series.metricKey,
      targetPoints: optimalPointCount,
      selectedLevel: bestResolution,
      actualPoints: result.length,
      viewportWidth
    });

    return result;
  }

  /**
   * Clear series cache
   */
  clearCache(): void {
    this.seriesCache.clear();
    telemetryService.emitTelemetry('viz_cache_cleared', {});
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    totalSeries: number;
  } {
    return {
      size: this.seriesCache.size,
      keys: Array.from(this.seriesCache.keys()),
      totalSeries: Array.from(this.seriesCache.values())
        .reduce((sum, series) => sum + series.resolutions.size, 0)
    };
  }

  /**
   * Create cache key for series
   */
  private createCacheKey(
    metricKey: string,
    points: TimeSeriesPoint[],
    options: VisualizationOptions
  ): string {
    const pointsHash = this.hashPoints(points);
    const optionsHash = JSON.stringify(options);
    return `${metricKey}_${pointsHash}_${this.simpleHash(optionsHash)}`;
  }

  /**
   * Simple hash function for points array
   */
  private hashPoints(points: TimeSeriesPoint[]): string {
    if (points.length === 0) return '0';
    
    const first = safeFirst(points);
    const last = safeLast(points);
    const middle = safeAt(points, Math.floor(points.length / 2));
    
    if (!first || !last || !middle) {
      return `${points.length}`;
    }
    
    return `${first.timestamp}_${last.timestamp}_${middle.timestamp}_${points.length}`;
  }

  /**
   * Simple hash function for strings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Find extreme values (peaks and valleys)
   */
  private findExtremes(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
    if (points.length < 3) return [...points];

    const extremes: TimeSeriesPoint[] = [];
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = safeAt(points, i - 1);
      const current = safeAt(points, i);
      const next = safeAt(points, i + 1);
      
      if (!prev || !current || !next) continue;
      
      // Local maximum
      if (current.value > prev.value && current.value > next.value) {
        extremes.push(current);
      }
      
      // Local minimum
      if (current.value < prev.value && current.value < next.value) {
        extremes.push(current);
      }
    }

    return extremes;
  }

  /**
   * Generate semantic highlights based on data patterns
   */
  private generateSemanticHighlights(
    points: TimeSeriesPoint[],
    metricKey: string
  ): SemanticHighlight[] {
    const highlights: SemanticHighlight[] = [];

    if (points.length < 5) return highlights;

    // Calculate moving average for anomaly detection
    const windowSize = Math.min(10, Math.floor(points.length / 5));
    const movingAverage: number[] = [];
    
    for (let i = windowSize; i < points.length; i++) {
      const windowSum = points.slice(i - windowSize, i)
        .reduce((sum, point) => sum + point.value, 0);
      movingAverage.push(windowSum / windowSize);
    }

    // Calculate standard deviation
    const avgValue = movingAverage.reduce((sum, val) => sum + val, 0) / movingAverage.length;
    const variance = movingAverage.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / movingAverage.length;
    const stdDev = Math.sqrt(variance);

    // Detect anomalies (points > 2 standard deviations from mean)
    for (let i = windowSize; i < points.length; i++) {
      const point = points[i];
      const expected = movingAverage[i - windowSize];
  if (!point || expected === undefined) continue;
  const deviation = Math.abs(point.value - expected);
      
      if (deviation > 2 * stdDev) {
        highlights.push({
          timestamp: point.timestamp,
          type: 'anomaly',
          severity: deviation > 3 * stdDev ? 'high' : 'medium',
          label: `Anomaly detected`,
          description: `Value ${point.value.toFixed(2)} deviates ${(deviation / stdDev).toFixed(1)}σ from expected ${expected.toFixed(2)}`,
          metadata: {
            expectedValue: expected,
            actualValue: point.value,
            deviationSigma: deviation / stdDev
          }
        });
      }
    }

    // Detect significant trend changes
    const trendWindow = Math.min(5, Math.floor(points.length / 10));
    for (let i = trendWindow * 2; i < points.length - trendWindow; i++) {
      const beforeTrend = this.calculateTrend(points.slice(i - trendWindow * 2, i - trendWindow));
      const afterTrend = this.calculateTrend(points.slice(i - trendWindow, i));
      
      const trendChange = Math.abs(afterTrend - beforeTrend);
      
      if (trendChange > stdDev) {
        highlights.push({
          timestamp: points[i]!.timestamp,
          type: 'causal_pivot',
          severity: trendChange > 2 * stdDev ? 'high' : 'medium',
          label: 'Trend change',
          description: `Trend shifted from ${beforeTrend.toFixed(2)} to ${afterTrend.toFixed(2)}`,
          metadata: {
            beforeTrend,
            afterTrend,
            trendChange
          }
        });
      }
    }

    return highlights;
  }

  /**
   * Calculate trend (slope) for a series of points
   */
  private calculateTrend(points: TimeSeriesPoint[]): number {
    if (points.length < 2) return 0;

    const n = points.length;
    const sumX = points.reduce((sum, point, index) => sum + index, 0);
    const sumY = points.reduce((sum, point) => sum + point.value, 0);
    const sumXY = points.reduce((sum, point, index) => sum + index * point.value, 0);
    const sumXX = points.reduce((sum, point, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  /**
   * Apply focus window to all resolutions
   */
  private applyFocusWindow(
    resolutions: Map<number, TimeSeriesPoint[]>,
    focusWindow: { startTimestamp: number; endTimestamp: number }
  ): void {
    const resolutionEntries = Array.from(resolutions.entries());
    for (const [level, points] of resolutionEntries) {
      const filteredPoints = points.filter(point =>
        point.timestamp >= focusWindow.startTimestamp &&
        point.timestamp <= focusWindow.endTimestamp
      );
      resolutions.set(level, filteredPoints);
    }
  }
}

// Export singleton instance
export const adaptiveTimelineService = new AdaptiveTimelineService();