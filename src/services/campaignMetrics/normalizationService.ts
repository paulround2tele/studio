/**
 * Normalization Service (Phase 7)
 * Benchmark-based metric normalization with advanced caching and server-first integration
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';
import { capabilitiesService } from './capabilitiesService';
import { telemetryService } from './telemetryService';
import { fetchWithPolicy } from '@/lib/utils/fetchWithPolicy';
import { isBackendCanonical } from '@/lib/feature-flags-simple';

// Feature flag
const isNormalizationEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_NORMALIZATION !== 'false';

/**
 * Benchmark data structure from server (Phase 7 enhanced)
 */
export interface BenchmarkMetrics {
  version: string;
  generatedAt: string;
  expiresAt?: string; // Phase 7: Server-controlled cache expiry
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
 * Normalization configuration (Phase 7 enhanced)
 */
export interface NormalizationConfig {
  method: 'baseline' | 'zscore'; // baseline = raw/baseline, zscore = (raw-mean)/std
  preserveRaw: boolean;
  cacheTime: number; // milliseconds
  // Phase 7: Per-metric toggle support
  enabledMetrics?: {
    successRate?: boolean;
    avgLeadScore?: boolean;
    dnsSuccessRate?: boolean;
    httpSuccessRate?: boolean;
  };
}

/**
 * Phase 7: Normalization selection state
 */
export interface NormalizationSelection {
  successRate: boolean;
  avgLeadScore: boolean;
  dnsSuccessRate: boolean;
  httpSuccessRate: boolean;
}

const NORMALIZATION_SELECTION_KEY = 'normalization:selection';

/**
 * Default normalization configuration (Phase 7 enhanced)
 */
const DEFAULT_CONFIG: NormalizationConfig = {
  method: 'baseline',
  preserveRaw: true,
  cacheTime: 6 * 60 * 60 * 1000, // 6 hours
  enabledMetrics: {
    successRate: true,
    avgLeadScore: true,
    dnsSuccessRate: true,
    httpSuccessRate: true,
  }
};

/**
 * Cached benchmark data (Phase 7 enhanced)
 */
interface CachedBenchmarkData {
  data: BenchmarkMetrics;
  cachedAt: number;
  staleAt: number;
  version: string;
}

let cachedBenchmarks: CachedBenchmarkData | null = null;
const BENCHMARK_STORAGE_KEY = 'benchmarks:cache:v1';

/**
 * Fetch benchmarks from server with enhanced caching (Phase 7)
 * Implements stale-while-revalidate pattern
 */
export async function fetchBenchmarks(force: boolean = false): Promise<BenchmarkMetrics> {
  if (!isNormalizationEnabled()) {
    throw new Error('Normalization feature is disabled via configuration. Enable NEXT_PUBLIC_ENABLE_NORMALIZATION to use this feature.');
  }

  const now = Date.now();
  
  // Check memory cache first
  if (!force && cachedBenchmarks) {
    // Return fresh cache
    if (now < cachedBenchmarks.staleAt) {
      return cachedBenchmarks.data;
    }
    
    // Use stale cache while revalidating in background
    if (now < cachedBenchmarks.staleAt + (30 * 60 * 1000)) { // 30 min grace period
      setImmediate(() => {
        fetchBenchmarksFromServer(true).catch(err => 
          console.warn('[NormalizationService] Background revalidation failed:', err)
        );
      });
      return cachedBenchmarks.data;
    }
  }

  // Check localStorage cache
  if (!force && !cachedBenchmarks) {
    const storedCache = getStoredBenchmarkCache();
    if (storedCache && now < storedCache.staleAt) {
      cachedBenchmarks = storedCache;
      return storedCache.data;
    }
  }

  // Fetch fresh data from server
  return await fetchBenchmarksFromServer(force);
}

/**
 * Fetch benchmarks directly from server
 */
async function fetchBenchmarksFromServer(isRevalidation: boolean = false): Promise<BenchmarkMetrics> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('API URL not configured');
  }

  try {
    const response = await fetchWithPolicy<BenchmarkMetrics>(
      `${apiUrl}/benchmarks/metrics`,
      { method: 'GET' },
      {
        category: 'api',
        retries: 2,
        timeoutMs: 10000,
        enableETag: true,
      }
    );

    // Validate benchmark structure
    if (!validateBenchmarkData(response)) {
      throw new Error('Invalid benchmark data structure');
    }

    // Calculate cache expiry
    const now = Date.now();
    let staleAt: number;
    
    if (response.expiresAt) {
      // Use server-specified expiry
      staleAt = new Date(response.expiresAt).getTime();
    } else {
      // Fallback to default cache time
      staleAt = now + DEFAULT_CONFIG.cacheTime;
    }

    // Update cache
    const cacheData: CachedBenchmarkData = {
      data: response,
      cachedAt: now,
      staleAt,
      version: response.version,
    };

    cachedBenchmarks = cacheData;
    setBenchmarkCache(cacheData);

    return response;
  } catch (error) {
    // Emit domain validation failure if appropriate
    if (error instanceof Error && error.message.includes('validation')) {
      telemetryService.emitTelemetry('domain_validation_fail', {
        domain: 'benchmarks',
        reason: error.message,
      });
    }
    
    console.warn('[NormalizationService] Benchmark fetch failed:', error);
    
    // Return stale cache if available during revalidation
    if (isRevalidation && cachedBenchmarks) {
      console.warn('[NormalizationService] Using stale cache due to fetch failure');
      return cachedBenchmarks.data;
    }
    
    throw error;
  }
}

/**
 * Validate benchmark data structure
 */
function validateBenchmarkData(data: unknown): data is BenchmarkMetrics {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as {
    version?: unknown;
    generatedAt?: unknown;
    metrics?: Record<string, unknown> | undefined;
  };

  if (typeof candidate.version !== 'string') return false;
  if (typeof candidate.generatedAt !== 'string') return false;

  const metrics = candidate.metrics;
  if (!metrics || typeof metrics !== 'object') return false;

  return Object.keys(metrics).every(key => {
    const metric = metrics[key] as {
      baseline?: unknown;
      p25?: unknown;
      p75?: unknown;
      p90?: unknown;
      sampleSize?: unknown;
    } | undefined;

    return (
      metric !== undefined &&
      typeof metric.baseline === 'number' &&
      typeof metric.p25 === 'number' &&
      typeof metric.p75 === 'number' &&
      typeof metric.p90 === 'number' &&
      typeof metric.sampleSize === 'number'
    );
  });
}

/**
 * Get stored benchmark cache from localStorage
 */
function getStoredBenchmarkCache(): CachedBenchmarkData | null {
  try {
    const stored = localStorage.getItem(BENCHMARK_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    // Validate cache structure
    if (!parsed.data || !parsed.cachedAt || !parsed.staleAt || !parsed.version) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[NormalizationService] Failed to read stored cache:', error);
    localStorage.removeItem(BENCHMARK_STORAGE_KEY);
    return null;
  }
}

/**
 * Store benchmark cache in localStorage
 */
function setBenchmarkCache(cache: CachedBenchmarkData): void {
  try {
    localStorage.setItem(BENCHMARK_STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[NormalizationService] Failed to store cache:', error);
  }
}

/**
 * Phase 7: Get normalization selection from sessionStorage
 */
export function getNormalizationSelection(): NormalizationSelection {
  try {
    const stored = sessionStorage.getItem(NORMALIZATION_SELECTION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        successRate: parsed.successRate ?? true,
        avgLeadScore: parsed.avgLeadScore ?? true,
        dnsSuccessRate: parsed.dnsSuccessRate ?? true,
        httpSuccessRate: parsed.httpSuccessRate ?? true,
      };
    }
  } catch (error) {
    console.warn('[NormalizationService] Failed to read selection:', error);
  }

  // Default selection
  return {
    successRate: true,
    avgLeadScore: true,
    dnsSuccessRate: true,
    httpSuccessRate: true,
  };
}

/**
 * Phase 7: Set normalization selection in sessionStorage
 */
export function setNormalizationSelection(selection: Partial<NormalizationSelection>): void {
  try {
    const current = getNormalizationSelection();
    const updated = { ...current, ...selection };
    sessionStorage.setItem(NORMALIZATION_SELECTION_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[NormalizationService] Failed to save selection:', error);
  }
}

/**
 * Apply normalization to snapshot aggregates (Phase 7 enhanced)
 */
export async function applyNormalization(
  snapshot: AggregateSnapshot,
  config: NormalizationConfig = DEFAULT_CONFIG
): Promise<NormalizedSnapshot> {
  if (!isNormalizationEnabled()) {
    return snapshot;
  }

  // Phase 7: Use domain resolution for server vs client decision
  let resolution: 'server' | 'client-fallback' | 'skip' = 'client-fallback';
  
  if (isBackendCanonical()) {
    try {
      await capabilitiesService.initialize();
      resolution = capabilitiesService.resolveDomain('benchmarks');
    } catch (error) {
      console.warn('[applyNormalization] Failed to resolve domain, falling back to client:', error);
      resolution = 'client-fallback';
    }
  }

  if (resolution === 'skip') {
    return snapshot;
  }

  try {
    const benchmarks = await fetchBenchmarks();
    const selection = getNormalizationSelection();
    const normalizedAggregates = normalizeAggregates(snapshot.aggregates, benchmarks, config, selection);

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
 * Apply normalization to multiple snapshots (Phase 7 enhanced)
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
    const selection = getNormalizationSelection();
    
    return snapshots.map(snapshot => {
      const normalizedAggregates = normalizeAggregates(snapshot.aggregates, benchmarks, config, selection);

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
 * Normalize individual aggregate metrics (Phase 7 enhanced)
 */
function normalizeAggregates(
  aggregates: AggregateSnapshot['aggregates'],
  benchmarks: BenchmarkMetrics,
  config: NormalizationConfig,
  selection: NormalizationSelection
): AggregateSnapshot['aggregates'] {
  const normalized: AggregateSnapshot['aggregates'] = {
    totalDomains: aggregates.totalDomains, // Don't normalize counts
    successRate: selection.successRate 
      ? normalizeMetric(aggregates.successRate, benchmarks.metrics.successRate, config)
      : aggregates.successRate,
    avgLeadScore: selection.avgLeadScore
      ? normalizeMetric(aggregates.avgLeadScore, benchmarks.metrics.avgLeadScore, config)
      : aggregates.avgLeadScore,
    dnsSuccessRate: selection.dnsSuccessRate
      ? normalizeMetric(aggregates.dnsSuccessRate, benchmarks.metrics.dnsSuccessRate, config)
      : aggregates.dnsSuccessRate,
    httpSuccessRate: selection.httpSuccessRate
      ? normalizeMetric(aggregates.httpSuccessRate, benchmarks.metrics.httpSuccessRate, config)
      : aggregates.httpSuccessRate
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
 * Clear normalization cache (useful for testing or forced refresh) (Phase 7 enhanced)
 */
export function clearNormalizationCache(): void {
  cachedBenchmarks = null;
  
  // Clear localStorage cache
  try {
    localStorage.removeItem(BENCHMARK_STORAGE_KEY);
  } catch (error) {
    console.warn('[NormalizationService] Failed to clear stored cache:', error);
  }
}

/**
 * Get cached benchmark data (for debugging) (Phase 7 enhanced)
 */
export function getCachedBenchmarks(): BenchmarkMetrics | null {
  return cachedBenchmarks?.data || null;
}

/**
 * Get cache status for debugging
 */
export function getCacheStatus(): {
  hasCache: boolean;
  version?: string;
  cachedAt?: number;
  staleAt?: number;
  isStale: boolean;
} {
  if (!cachedBenchmarks) {
    return { hasCache: false, isStale: true };
  }

  const now = Date.now();
  return {
    hasCache: true,
    version: cachedBenchmarks.version,
    cachedAt: cachedBenchmarks.cachedAt,
    staleAt: cachedBenchmarks.staleAt,
    isStale: now > cachedBenchmarks.staleAt,
  };
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