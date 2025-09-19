/**
 * Anomaly Detection Service (Phase 5 + Phase 6)
 * Z-score based anomaly detection with server-provided anomaly preference
 */

import { AggregateSnapshot, ExtendedAggregateMetrics } from '@/types/campaignMetrics';

// Feature flag for anomaly detection
const isAnomalyDetectionEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES !== 'false';

/**
 * Anomaly detection configuration
 */
export interface AnomalyConfig {
  minSnapshots: number;
  zScoreThreshold: number;
  rollingWindowSize: number;
}

/**
 * Detected anomaly object (Phase 6: Added source tracking)
 */
export interface Anomaly {
  metric: string;
  value: number;
  zScore: number;
  severity: 'warning' | 'critical';
  timestamp: string;
  description: string;
  source?: 'client' | 'server'; // Phase 6: Track anomaly source
}

/**
 * Server-provided anomaly (Phase 6)
 */
export interface ServerAnomaly {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: string;
  description: string;
  confidence: number;
  modelVersion?: string;
}

/**
 * Metrics to monitor for anomalies
 */
const MONITORED_METRICS: (keyof ExtendedAggregateMetrics)[] = [
  'warningRate',
  'avgRichness',
  'leadsCount',
  'highPotentialCount',
  'medianGain',
  'keywordCoverage'
];

/**
 * Default anomaly detection configuration
 */
const DEFAULT_CONFIG: AnomalyConfig = {
  minSnapshots: 5, // Minimum snapshots needed for detection
  zScoreThreshold: 2.0, // Standard deviations from mean
  rollingWindowSize: 10, // Number of recent snapshots to analyze
};

/**
 * Detect anomalies in campaign timeline with server anomaly preference (Phase 6)
 */
export function detectAnomalies(
  snapshots: AggregateSnapshot[],
  serverAnomalies?: ServerAnomaly[],
  config: Partial<AnomalyConfig> = {}
): Anomaly[] {
  if (!isAnomalyDetectionEnabled()) {
    return [];
  }

  // Phase 6: Prefer server-provided anomalies when available
  if (serverAnomalies && serverAnomalies.length > 0) {
    return adaptServerAnomalies(serverAnomalies);
  }

  // Phase 5: Original client-side anomaly detection
  return detectClientAnomalies(snapshots, config);
}

/**
 * Phase 6: Adapt server anomalies to local format
 */
function adaptServerAnomalies(serverAnomalies: ServerAnomaly[]): Anomaly[] {
  return serverAnomalies.map(serverAnomaly => ({
    metric: serverAnomaly.metric,
    value: serverAnomaly.value,
    zScore: serverAnomaly.threshold, // Use threshold as z-score equivalent
    severity: serverAnomaly.severity,
    timestamp: serverAnomaly.timestamp,
    description: serverAnomaly.description,
    source: 'server'
  }));
}

/**
 * Phase 5: Original client-side anomaly detection
 */
function detectClientAnomalies(
  snapshots: AggregateSnapshot[],
  config: Partial<AnomalyConfig> = {}
): Anomaly[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Need minimum snapshots for statistical analysis
  if (snapshots.length < finalConfig.minSnapshots) {
    return [];
  }

  const anomalies: Anomaly[] = [];
  
  // Sort snapshots by timestamp
  const sortedSnapshots = [...snapshots].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Get the rolling window of recent snapshots
  const recentSnapshots = sortedSnapshots.slice(-finalConfig.rollingWindowSize);
  const latestSnapshot = recentSnapshots[recentSnapshots.length - 1];

  // Check each monitored metric for anomalies
  MONITORED_METRICS.forEach(metric => {
    if (!latestSnapshot) return;
    
    const anomaly = detectMetricAnomaly(
      recentSnapshots,
      latestSnapshot,
      metric,
      finalConfig
    );
    
    if (anomaly) {
      anomalies.push(anomaly);
    }
  });

  return anomalies;
}

/**
 * Detect anomaly for a specific metric
 */
function detectMetricAnomaly(
  snapshots: AggregateSnapshot[],
  latestSnapshot: AggregateSnapshot,
  metric: keyof ExtendedAggregateMetrics,
  config: AnomalyConfig
): Anomaly | null {
  const values = snapshots.map(s => getMetricValue(s.aggregates as ExtendedAggregateMetrics, metric))
    .filter(v => v !== null && v !== undefined) as number[];

  if (values.length < config.minSnapshots) {
    return null;
  }

  const currentValue = getMetricValue(latestSnapshot.aggregates as ExtendedAggregateMetrics, metric);
  if (currentValue === null || currentValue === undefined) {
    return null;
  }

  const zScore = calculateZScore(currentValue, values);
  
  if (Math.abs(zScore) >= config.zScoreThreshold) {
    const severity = Math.abs(zScore) >= 3.0 ? 'critical' : 'warning';
    const direction = zScore > 0 ? 'increased' : 'decreased';
    
    return {
      metric: metric as string,
      value: currentValue,
      zScore,
      severity,
      timestamp: latestSnapshot.timestamp,
      description: `${formatMetricName(metric)} has ${direction} significantly (${Math.abs(zScore).toFixed(2)}σ from normal)`,
      source: 'client' // Phase 6: Mark as client-generated
    };
  }

  return null;
}

/**
 * Calculate Z-score for a value against a dataset
 */
function calculateZScore(value: number, dataset: number[]): number {
  if (dataset.length < 2) return 0;
  
  const mean = dataset.reduce((sum, val) => sum + val, 0) / dataset.length;
  const variance = dataset.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (dataset.length - 1);
  const standardDeviation = Math.sqrt(variance);
  
  if (standardDeviation === 0) return 0;
  
  return (value - mean) / standardDeviation;
}

/**
 * Get metric value with type safety
 */
function getMetricValue(
  aggregates: ExtendedAggregateMetrics,
  metric: keyof ExtendedAggregateMetrics
): number | null {
  const value = aggregates[metric];
  return typeof value === 'number' ? value : null;
}

/**
 * Format metric name for display
 */
function formatMetricName(metric: string): string {
  const formatMap: Record<string, string> = {
    warningRate: 'Warning Rate',
    avgRichness: 'Average Richness',
    leadsCount: 'Leads Count',
    highPotentialCount: 'High Potential Count',
    medianGain: 'Median Gain',
    keywordCoverage: 'Keyword Coverage'
  };
  
  return formatMap[metric] || metric;
}

/**
 * Get configurable thresholds for anomaly detection
 */
export function getAnomalyThresholds(): AnomalyConfig {
  return {
    minSnapshots: parseInt(process.env.NEXT_PUBLIC_ANOMALY_MIN_SNAPSHOTS || '5'),
    zScoreThreshold: parseFloat(process.env.NEXT_PUBLIC_ANOMALY_Z_THRESHOLD || '2.0'),
    rollingWindowSize: parseInt(process.env.NEXT_PUBLIC_ANOMALY_WINDOW_SIZE || '10'),
  };
}

/**
 * Check if anomaly detection is available
 */
export function isAnomalyDetectionAvailable(): boolean {
  return isAnomalyDetectionEnabled();
}