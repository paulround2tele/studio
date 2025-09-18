/**
 * Normalization Service (Phase 6)
 * Benchmark-based metric normalization with raw value preservation
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';

// Feature flag
const isNormalizationEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_NORMALIZATION !== 'false';

/**
 * Benchmark data structure from server
 */
export interface BenchmarkMetrics {
  version: string;
  generatedAt: string;
  metrics: {
    warningRate: BenchmarkData;
    avgRichness: BenchmarkData;
    leadsCount: BenchmarkData;
    highPotentialCount: BenchmarkData;
    successRate: BenchmarkData;
    avgLeadScore: BenchmarkData;
    dnsSuccessRate: BenchmarkData;
    httpSuccessRate: BenchmarkData;
  };
}

/**
 * Individual benchmark data point
 */
export interface BenchmarkData {
  baseline: number; // p50 median
  p25: number;
  p75: number;
  p90: number;
  mean?: number;
  std?: number;
  sampleSize: number;
}

/**
 * Normalized snapshot with both raw and normalized values
 */
export interface NormalizedSnapshot extends AggregateSnapshot {
  normalized?: {
    aggregates: AggregateSnapshot['aggregates'];
    benchmarkVersion: string;
    appliedAt: string;
  };
}

/**
 * Normalization configuration
 */
export interface NormalizationConfig {
  method: 'baseline' | 'zscore'; // baseline = raw/baseline, zscore = (raw-mean)/std
  preserveRaw: boolean;
  cacheTime: number; // milliseconds
}

/**
 * Default normalization configuration
 */
const DEFAULT_CONFIG: NormalizationConfig = {
  method: 'baseline',
  preserveRaw: true,
  cacheTime: 6 * 60 * 60 * 1000 // 6 hours
};

/**
 * Cached benchmark data
 */
let cachedBenchmarks: BenchmarkMetrics | null = null;
let cacheTimestamp: number = 0;

/**
 * Fetch benchmarks from server with caching
 */
export async function fetchBenchmarks(): Promise<BenchmarkMetrics> {
  if (!isNormalizationEnabled()) {
    throw new Error('Normalization disabled');
  }

  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedBenchmarks && (now - cacheTimestamp) < DEFAULT_CONFIG.cacheTime) {
    return cachedBenchmarks;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('API URL not configured');
  }

  try {
    const response = await fetch(`${apiUrl}/benchmarks/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=21600', // 6 hours
      },
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 501) {
        throw new Error('Benchmarks not available');
      }
      throw new Error(`Benchmark fetch failed: ${response.status}`);
    }

    const benchmarks = await response.json();
    
    // Validate benchmark structure
    if (!validateBenchmarkData(benchmarks)) {
      throw new Error('Invalid benchmark data structure');
    }

    // Cache the results
    cachedBenchmarks = benchmarks;
    cacheTimestamp = now;

    return benchmarks;
  } catch (error) {
    console.warn('[NormalizationService] Benchmark fetch failed:', error);
    throw error;
  }
}

/**
 * Validate benchmark data structure
 */
function validateBenchmarkData(data: any): data is BenchmarkMetrics {
  return (
    data &&
    typeof data.version === 'string' &&
    typeof data.generatedAt === 'string' &&
    data.metrics &&
    typeof data.metrics === 'object' &&
    Object.keys(data.metrics).every(key => {
      const metric = data.metrics[key];
      return (
        metric &&
        typeof metric.baseline === 'number' &&
        typeof metric.p25 === 'number' &&
        typeof metric.p75 === 'number' &&
        typeof metric.p90 === 'number' &&
        typeof metric.sampleSize === 'number'
      );
    })
  );
}

/**
 * Apply normalization to snapshot aggregates
 */
export async function applyNormalization(
  snapshot: AggregateSnapshot,
  config: NormalizationConfig = DEFAULT_CONFIG
): Promise<NormalizedSnapshot> {
  if (!isNormalizationEnabled()) {
    return snapshot;
  }

  try {
    const benchmarks = await fetchBenchmarks();
    const normalizedAggregates = normalizeAggregates(snapshot.aggregates, benchmarks, config);

    const normalizedSnapshot: NormalizedSnapshot = {
      ...snapshot,
      normalized: {
        aggregates: normalizedAggregates,
        benchmarkVersion: benchmarks.version,
        appliedAt: new Date().toISOString()
      }
    };

    return normalizedSnapshot;
  } catch (error) {
    console.warn('[NormalizationService] Normalization failed:', error);
    return snapshot; // Return original snapshot on failure
  }
}

/**
 * Apply normalization to multiple snapshots
 */
export async function applyNormalizationBatch(
  snapshots: AggregateSnapshot[],
  config: NormalizationConfig = DEFAULT_CONFIG
): Promise<NormalizedSnapshot[]> {
  if (!isNormalizationEnabled() || snapshots.length === 0) {
    return snapshots;
  }

  try {
    const benchmarks = await fetchBenchmarks();
    
    return snapshots.map(snapshot => {
      const normalizedAggregates = normalizeAggregates(snapshot.aggregates, benchmarks, config);

      return {
        ...snapshot,
        normalized: {
          aggregates: normalizedAggregates,
          benchmarkVersion: benchmarks.version,
          appliedAt: new Date().toISOString()
        }
      };
    });
  } catch (error) {
    console.warn('[NormalizationService] Batch normalization failed:', error);
    return snapshots; // Return original snapshots on failure
  }
}

/**
 * Normalize individual aggregate metrics
 */
function normalizeAggregates(
  aggregates: AggregateSnapshot['aggregates'],
  benchmarks: BenchmarkMetrics,
  config: NormalizationConfig
): AggregateSnapshot['aggregates'] {
  const normalized: AggregateSnapshot['aggregates'] = {
    totalDomains: aggregates.totalDomains, // Don't normalize counts
    successRate: normalizeMetric(aggregates.successRate, benchmarks.metrics.successRate, config),
    avgLeadScore: normalizeMetric(aggregates.avgLeadScore, benchmarks.metrics.avgLeadScore, config),
    dnsSuccessRate: normalizeMetric(aggregates.dnsSuccessRate, benchmarks.metrics.dnsSuccessRate, config),
    httpSuccessRate: normalizeMetric(aggregates.httpSuccessRate, benchmarks.metrics.httpSuccessRate, config)
  };

  return normalized;
}

/**
 * Normalize a single metric value
 */
function normalizeMetric(
  value: number,
  benchmark: BenchmarkData,
  config: NormalizationConfig
): number {
  if (isNaN(value) || value === 0) {
    return value; // Don't normalize invalid or zero values
  }

  switch (config.method) {
    case 'baseline':
      // Simple ratio normalization: raw / baseline
      return benchmark.baseline > 0 ? value / benchmark.baseline : value;
      
    case 'zscore':
      // Z-score normalization: (raw - mean) / std
      if (benchmark.mean !== undefined && benchmark.std !== undefined && benchmark.std > 0) {
        return (value - benchmark.mean) / benchmark.std;
      }
      // Fallback to baseline method if z-score data unavailable
      return benchmark.baseline > 0 ? value / benchmark.baseline : value;
      
    default:
      return value;
  }
}

/**
 * Get display values for normalized or raw metrics
 */
export function getDisplayAggregates(
  snapshot: NormalizedSnapshot,
  showNormalized: boolean
): AggregateSnapshot['aggregates'] {
  if (!showNormalized || !snapshot.normalized) {
    return snapshot.aggregates;
  }
  
  return snapshot.normalized.aggregates;
}

/**
 * Check if snapshot has normalization applied
 */
export function isNormalized(snapshot: AggregateSnapshot): snapshot is NormalizedSnapshot {
  return 'normalized' in snapshot;
}

/**
 * Get normalization metadata from snapshot
 */
export function getNormalizationMetadata(snapshot: NormalizedSnapshot): {
  version: string;
  appliedAt: string;
  method: string;
} | null {
  if (!snapshot.normalized) {
    return null;
  }

  return {
    version: snapshot.normalized.benchmarkVersion,
    appliedAt: snapshot.normalized.appliedAt,
    method: DEFAULT_CONFIG.method
  };
}

/**
 * Clear normalization cache (useful for testing or forced refresh)
 */
export function clearNormalizationCache(): void {
  cachedBenchmarks = null;
  cacheTimestamp = 0;
}

/**
 * Get cached benchmark data (for debugging)
 */
export function getCachedBenchmarks(): BenchmarkMetrics | null {
  return cachedBenchmarks;
}

/**
 * Create mock benchmark data for testing/fallback
 */
export function createMockBenchmarks(): BenchmarkMetrics {
  return {
    version: 'mock-1.0.0',
    generatedAt: new Date().toISOString(),
    metrics: {
      warningRate: {
        baseline: 0.15,
        p25: 0.08,
        p75: 0.25,
        p90: 0.35,
        mean: 0.16,
        std: 0.12,
        sampleSize: 1000
      },
      avgRichness: {
        baseline: 0.65,
        p25: 0.45,
        p75: 0.80,
        p90: 0.90,
        mean: 0.64,
        std: 0.18,
        sampleSize: 1000
      },
      leadsCount: {
        baseline: 850,
        p25: 400,
        p75: 1200,
        p90: 1800,
        mean: 820,
        std: 420,
        sampleSize: 1000
      },
      highPotentialCount: {
        baseline: 120,
        p25: 60,
        p75: 180,
        p90: 280,
        mean: 125,
        std: 75,
        sampleSize: 1000
      },
      successRate: {
        baseline: 0.78,
        p25: 0.65,
        p75: 0.88,
        p90: 0.94,
        mean: 0.77,
        std: 0.14,
        sampleSize: 1000
      },
      avgLeadScore: {
        baseline: 67.5,
        p25: 55.0,
        p75: 78.0,
        p90: 85.0,
        mean: 66.8,
        std: 12.5,
        sampleSize: 1000
      },
      dnsSuccessRate: {
        baseline: 0.92,
        p25: 0.88,
        p75: 0.96,
        p90: 0.98,
        mean: 0.91,
        std: 0.06,
        sampleSize: 1000
      },
      httpSuccessRate: {
        baseline: 0.84,
        p25: 0.76,
        p75: 0.90,
        p90: 0.95,
        mean: 0.83,
        std: 0.11,
        sampleSize: 1000
      }
    }
  };
}

/**
 * Check if normalization features are available
 */
export function isNormalizationAvailable(): boolean {
  return isNormalizationEnabled();
}