/**
 * Snapshot Compaction Service (Phase 8)
 * Performance optimization for large timelines with configurable downsample strategies
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';
import { telemetryService } from './telemetryService';

// Feature flag for snapshot compaction
const isSnapshotCompactionEnabled = () => 
  process.env.NEXT_PUBLIC_SNAPSHOT_COMPACTION !== 'false';

/**
 * Compaction strategies
 */
export type CompactionStrategy = 'lttb' | 'rolling_average' | 'time_interval';

/**
 * Compaction configuration
 */
export interface CompactionConfig {
  strategy: CompactionStrategy;
  targetPoints: number; // Target number of points after compaction
  preserveRecent: number; // Number of recent points to always preserve
  preserveImportant: boolean; // Preserve points with significant changes
  importanceThreshold: number; // Percentage change threshold for importance
}

/**
 * Compaction result
 */
export interface CompactionResult {
  originalPoints: number;
  compactedPoints: number;
  compressionRatio: number;
  compactionTimeMs: number;
  strategy: CompactionStrategy;
  compactedSnapshots: AggregateSnapshot[];
  preservedIndices: number[]; // Indices from original array that were preserved
  metadata: {
    avgInterval: number; // Average time interval between preserved points
    dataLoss: number; // Estimated percentage of information lost
    qualityScore: number; // 0-100 quality score of compaction
  };
}

/**
 * LTTB (Largest Triangle Three Buckets) point for algorithm
 */
interface LTTBPoint {
  x: number; // timestamp
  y: number; // value
  originalIndex: number;
}

/**
 * Snapshot compaction service
 */
class SnapshotCompactionService {
  private defaultConfig: CompactionConfig = {
    strategy: 'lttb',
    targetPoints: 500,
    preserveRecent: 50,
    preserveImportant: true,
    importanceThreshold: 5.0 // 5% change threshold
  };

  /**
   * Compact snapshots for visualization optimization
   */
  compactSnapshots(
    snapshots: AggregateSnapshot[],
    config: Partial<CompactionConfig> = {}
  ): CompactionResult {
    const startTime = Date.now();
    const fullConfig: CompactionConfig = { ...this.defaultConfig, ...config };

    if (!isSnapshotCompactionEnabled()) {
      return this.createNoOpResult(snapshots, startTime);
    }

    // Don't compact if already small enough
    if (snapshots.length <= fullConfig.targetPoints) {
      return this.createNoOpResult(snapshots, startTime);
    }

    let compactedSnapshots: AggregateSnapshot[];
    let preservedIndices: number[];

    switch (fullConfig.strategy) {
      case 'lttb':
        ({ compactedSnapshots, preservedIndices } = this.compactWithLTTB(snapshots, fullConfig));
        break;
      case 'rolling_average':
        ({ compactedSnapshots, preservedIndices } = this.compactWithRollingAverage(snapshots, fullConfig));
        break;
      case 'time_interval':
        ({ compactedSnapshots, preservedIndices } = this.compactWithTimeInterval(snapshots, fullConfig));
        break;
      default:
        throw new Error(`Unknown compaction strategy: ${fullConfig.strategy}`);
    }

    const result: CompactionResult = {
      originalPoints: snapshots.length,
      compactedPoints: compactedSnapshots.length,
      compressionRatio: snapshots.length / compactedSnapshots.length,
      compactionTimeMs: Date.now() - startTime,
      strategy: fullConfig.strategy,
      compactedSnapshots,
      preservedIndices,
      metadata: this.calculateCompactionMetadata(snapshots, compactedSnapshots, preservedIndices)
    };

    // Emit telemetry
    telemetryService.emitTelemetry('snapshot_compaction', {
      originalPoints: result.originalPoints,
      compactedPoints: result.compactedPoints,
      compressionRatio: result.compressionRatio,
      compactionTimeMs: result.compactionTimeMs,
      strategy: result.strategy
    });

    return result;
  }

  /**
   * Compact using Largest Triangle Three Buckets (LTTB) algorithm
   * This algorithm preserves the visual characteristics of the data
   */
  private compactWithLTTB(
    snapshots: AggregateSnapshot[],
    config: CompactionConfig
  ): { compactedSnapshots: AggregateSnapshot[]; preservedIndices: number[] } {
    // Use avgLeadScore as the primary metric for LTTB
    const points: LTTBPoint[] = snapshots.map((snapshot, index) => ({
      x: new Date(snapshot.timestamp).getTime(),
      y: snapshot.aggregates.avgLeadScore || 0,
      originalIndex: index
    }));

    const bucketSize = Math.max(1, Math.floor(points.length / config.targetPoints));
    const selectedIndices: number[] = [];

    // Always include first point
    selectedIndices.push(0);

    // Process buckets
    for (let bucket = 1; bucket < config.targetPoints - 1; bucket++) {
      const bucketStart = bucket * bucketSize;
      const bucketEnd = Math.min((bucket + 1) * bucketSize, points.length);
      
      if (bucketStart >= bucketEnd) break;

      // Calculate average point of next bucket for triangle calculation
      let avgX = 0, avgY = 0;
      const nextBucketStart = bucketEnd;
      const nextBucketEnd = Math.min(nextBucketStart + bucketSize, points.length);
      
      if (nextBucketStart < points.length) {
        for (let i = nextBucketStart; i < nextBucketEnd; i++) {
          const point = points[i];
          if (point) {
            avgX += point.x;
            avgY += point.y;
          }
        }
        avgX /= (nextBucketEnd - nextBucketStart);
        avgY /= (nextBucketEnd - nextBucketStart);
      } else {
        // Use last point if no next bucket
        const lastPoint = points[points.length - 1];
        if (lastPoint) {
          avgX = lastPoint.x;
          avgY = lastPoint.y;
        }
      }

      // Find point in current bucket that forms largest triangle
      let maxArea = -1;
      let selectedIndex = bucketStart;
      const prevIndex = selectedIndices[selectedIndices.length - 1];
      
      if (prevIndex === undefined) {
        // Fallback if no previous index
        selectedIndices.push(bucketStart);
        continue;
      }

      for (let i = bucketStart; i < bucketEnd; i++) {
        const prevPoint = points[prevIndex];
        const currentPoint = points[i];
        
        if (!prevPoint || !currentPoint) continue;
        
        const area = Math.abs(
          (prevPoint.x - avgX) * (currentPoint.y - prevPoint.y) -
          (prevPoint.x - currentPoint.x) * (avgY - prevPoint.y)
        );

        if (area > maxArea) {
          maxArea = area;
          selectedIndex = i;
        }
      }

      selectedIndices.push(selectedIndex);
    }

    // Always include last point
    if (selectedIndices[selectedIndices.length - 1] !== points.length - 1) {
      selectedIndices.push(points.length - 1);
    }

    // Preserve recent points if specified
    if (config.preserveRecent > 0) {
      const recentStart = Math.max(0, snapshots.length - config.preserveRecent);
      for (let i = recentStart; i < snapshots.length; i++) {
        if (!selectedIndices.includes(i)) {
          selectedIndices.push(i);
        }
      }
    }

    // Preserve important points (significant changes)
    if (config.preserveImportant) {
      this.addImportantPoints(snapshots, selectedIndices, config.importanceThreshold);
    }

    // Sort and deduplicate indices
    const uniqueIndices = [...new Set(selectedIndices)].sort((a, b) => a - b);
    
    return {
      compactedSnapshots: uniqueIndices.map(i => snapshots[i]).filter((snapshot): snapshot is AggregateSnapshot => snapshot !== undefined),
      preservedIndices: uniqueIndices
    };
  }

  /**
   * Compact using rolling average strategy
   */
  private compactWithRollingAverage(
    snapshots: AggregateSnapshot[],
    config: CompactionConfig
  ): { compactedSnapshots: AggregateSnapshot[]; preservedIndices: number[] } {
    const windowSize = Math.max(1, Math.floor(snapshots.length / config.targetPoints));
    const compactedSnapshots: AggregateSnapshot[] = [];
    const preservedIndices: number[] = [];

    for (let i = 0; i < snapshots.length; i += windowSize) {
      const windowEnd = Math.min(i + windowSize, snapshots.length);
      const window = snapshots.slice(i, windowEnd);
      
      if (window.length === 1) {
        const snapshot = window[0];
        if (snapshot) {
          compactedSnapshots.push(snapshot);
          preservedIndices.push(i);
        }
      } else {
        // Create averaged snapshot
        const avgSnapshot = this.averageSnapshots(window, i, windowEnd - 1);
        compactedSnapshots.push(avgSnapshot);
        preservedIndices.push(Math.floor((i + windowEnd - 1) / 2)); // Middle index as representative
      }
    }

    // Preserve recent points
    if (config.preserveRecent > 0) {
      const recentStart = Math.max(0, snapshots.length - config.preserveRecent);
      for (let i = recentStart; i < snapshots.length; i++) {
        if (!preservedIndices.includes(i)) {
          const snapshot = snapshots[i];
          if (snapshot) {
            compactedSnapshots.push(snapshot);
            preservedIndices.push(i);
          }
        }
      }
    }

    // Sort by timestamp
    const combined = compactedSnapshots.map((snapshot, idx) => ({ snapshot, originalIndex: preservedIndices[idx] }));
    combined.sort((a, b) => new Date(a.snapshot.timestamp).getTime() - new Date(b.snapshot.timestamp).getTime());

    return {
      compactedSnapshots: combined.map(c => c.snapshot),
      preservedIndices: combined.map(c => c.originalIndex)
    };
  }

  /**
   * Compact using fixed time interval strategy
   */
  private compactWithTimeInterval(
    snapshots: AggregateSnapshot[],
    config: CompactionConfig
  ): { compactedSnapshots: AggregateSnapshot[]; preservedIndices: number[] } {
    if (snapshots.length === 0) {
      return { compactedSnapshots: [], preservedIndices: [] };
    }

    const startTime = new Date(snapshots[0].timestamp).getTime();
    const endTime = new Date(snapshots[snapshots.length - 1].timestamp).getTime();
    const interval = (endTime - startTime) / config.targetPoints;

    const compactedSnapshots: AggregateSnapshot[] = [];
    const preservedIndices: number[] = [];

    for (let i = 0; i < config.targetPoints; i++) {
      const targetTime = startTime + (i * interval);
      
      // Find closest snapshot to target time
      let closestIndex = 0;
      let closestDistance = Math.abs(new Date(snapshots[0].timestamp).getTime() - targetTime);

      for (let j = 1; j < snapshots.length; j++) {
        const distance = Math.abs(new Date(snapshots[j].timestamp).getTime() - targetTime);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = j;
        }
      }

      if (!preservedIndices.includes(closestIndex)) {
        compactedSnapshots.push(snapshots[closestIndex]);
        preservedIndices.push(closestIndex);
      }
    }

    return { compactedSnapshots, preservedIndices };
  }

  /**
   * Add important points (those with significant changes) to preserved indices
   */
  private addImportantPoints(
    snapshots: AggregateSnapshot[],
    selectedIndices: number[],
    threshold: number
  ): void {
    for (let i = 1; i < snapshots.length - 1; i++) {
      if (selectedIndices.includes(i)) continue;

      const current = snapshots[i].aggregates.avgLeadScore || 0;
      const prev = snapshots[i - 1].aggregates.avgLeadScore || 0;
      const next = snapshots[i + 1].aggregates.avgLeadScore || 0;

      // Check for significant change
      const changeFromPrev = prev > 0 ? Math.abs((current - prev) / prev) * 100 : 0;
      const changeToNext = current > 0 ? Math.abs((next - current) / current) * 100 : 0;

      if (changeFromPrev > threshold || changeToNext > threshold) {
        selectedIndices.push(i);
      }
    }
  }

  /**
   * Average multiple snapshots into one
   */
  private averageSnapshots(
    snapshots: AggregateSnapshot[],
    startIndex: number,
    endIndex: number
  ): AggregateSnapshot {
    if (snapshots.length === 1) return snapshots[0];

    // Use middle timestamp
    const middleIndex = Math.floor(snapshots.length / 2);
    const timestamp = snapshots[middleIndex].timestamp;

    // Average numeric aggregates
    const aggregates: any = {};
    const firstAgg = snapshots[0].aggregates;
    
    Object.keys(firstAgg).forEach(key => {
      const values = snapshots
        .map(s => s.aggregates[key as keyof typeof s.aggregates])
        .filter(v => v != null && typeof v === 'number') as number[];
      
      if (values.length > 0) {
        aggregates[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      } else {
        aggregates[key] = firstAgg[key as keyof typeof firstAgg];
      }
    });

    return {
      timestamp,
      aggregates,
      // Preserve other fields from middle snapshot
      ...snapshots[middleIndex],
      aggregates // Override with averaged aggregates
    };
  }

  /**
   * Calculate compaction metadata
   */
  private calculateCompactionMetadata(
    original: AggregateSnapshot[],
    compacted: AggregateSnapshot[],
    preservedIndices: number[]
  ): CompactionResult['metadata'] {
    let avgInterval = 0;
    if (compacted.length > 1) {
      const totalTime = new Date(compacted[compacted.length - 1].timestamp).getTime() - 
                       new Date(compacted[0].timestamp).getTime();
      avgInterval = totalTime / (compacted.length - 1);
    }

    // Estimate data loss based on missing important points
    const dataLoss = Math.max(0, 100 - (compacted.length / original.length) * 100);
    
    // Quality score based on preservation of trends and recent data
    let qualityScore = 100;
    qualityScore -= dataLoss * 0.5; // Penalize data loss
    if (compacted.length < 10) qualityScore -= 20; // Penalize very aggressive compression
    
    return {
      avgInterval,
      dataLoss,
      qualityScore: Math.max(0, Math.min(100, qualityScore))
    };
  }

  /**
   * Create no-op result when compaction is not needed or disabled
   */
  private createNoOpResult(snapshots: AggregateSnapshot[], startTime: number): CompactionResult {
    return {
      originalPoints: snapshots.length,
      compactedPoints: snapshots.length,
      compressionRatio: 1,
      compactionTimeMs: Date.now() - startTime,
      strategy: 'lttb',
      compactedSnapshots: snapshots,
      preservedIndices: snapshots.map((_, i) => i),
      metadata: {
        avgInterval: 0,
        dataLoss: 0,
        qualityScore: 100
      }
    };
  }

  /**
   * Get recommended compaction strategy based on data characteristics
   */
  getRecommendedStrategy(snapshots: AggregateSnapshot[]): CompactionStrategy {
    if (snapshots.length < 100) return 'time_interval';
    if (snapshots.length > 5000) return 'lttb';
    
    // Analyze data variability to choose strategy
    const values = snapshots.map(s => s.aggregates.avgLeadScore || 0);
    const variance = this.calculateVariance(values);
    
    // High variance data benefits from LTTB
    if (variance > 100) return 'lttb';
    
    // Low variance data can use rolling average
    return 'rolling_average';
  }

  /**
   * Calculate variance of a numeric array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }
}

// Export singleton instance
export const snapshotCompactionService = new SnapshotCompactionService();

/**
 * Compact snapshots for visualization (convenience function)
 */
export function compactSnapshots(
  snapshots: AggregateSnapshot[],
  config?: Partial<CompactionConfig>
): CompactionResult {
  return snapshotCompactionService.compactSnapshots(snapshots, config);
}

/**
 * Check if snapshot compaction is available
 */
export function isSnapshotCompactionAvailable(): boolean {
  return isSnapshotCompactionEnabled();
}

/**
 * Get recommended compaction strategy (convenience function)
 */
export function getRecommendedCompactionStrategy(snapshots: AggregateSnapshot[]): CompactionStrategy {
  return snapshotCompactionService.getRecommendedStrategy(snapshots);
}