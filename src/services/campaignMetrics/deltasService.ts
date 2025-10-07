/**
 * Deltas Service (Phase 3)
 * Computes delta metrics between snapshots with safe math operations
 */

import { AggregateSnapshot, DeltaMetrics, ExtendedAggregateMetrics } from '@/types/campaignMetrics';

// Keys to track for delta calculation
const DELTA_KEYS: (keyof ExtendedAggregateMetrics)[] = [
  'totalDomains',
  'successRate', 
  'avgLeadScore',
  'dnsSuccessRate',
  'httpSuccessRate',
  'highPotentialCount',
  'leadsCount',
  'avgRichness',
  'warningRate',
  'keywordCoverage',
  'medianGain'
];

// Metrics where lower values are better (inverted color logic)
const INVERTED_METRICS = new Set(['warningRate']);

/**
 * Calculate delta between two snapshots
 * Returns array of DeltaMetrics with safe division and clamping
 */
export function calculateDeltas(
  current: AggregateSnapshot,
  previous: AggregateSnapshot
): DeltaMetrics[] {
  const deltas: DeltaMetrics[] = [];

  for (const key of DELTA_KEYS) {
    const currentValue = getMetricValue(current.aggregates, key);
    const previousValue = getMetricValue(previous.aggregates, key);
    
    // Skip if either value is undefined/null
    if (currentValue == null || previousValue == null) {
      continue;
    }

    const absoluteDelta = currentValue - previousValue;
    const percentDelta = safeDividePercent(absoluteDelta, previousValue);
    
    let direction: 'up' | 'down' | 'flat' = 'flat';
    if (Math.abs(absoluteDelta) > 0.001) { // Threshold for "flat"
      if (absoluteDelta > 0) {
        direction = INVERTED_METRICS.has(key) ? 'down' : 'up';
      } else {
        direction = INVERTED_METRICS.has(key) ? 'up' : 'down';
      }
    }

    deltas.push({
      key,
      absolute: absoluteDelta,
      percent: percentDelta,
      direction
    });
  }

  return deltas;
}

/**
 * Get metric value from aggregates object with type safety
 */
function getMetricValue(
  aggregates: ExtendedAggregateMetrics, 
  key: keyof ExtendedAggregateMetrics
): number | undefined {
  const value = aggregates[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Safe percentage calculation with zero-division protection
 * Clamps to reasonable bounds and handles edge cases
 */
function safeDividePercent(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return numerator === 0 ? 0 : (numerator > 0 ? 100 : -100);
  }
  
  const percent = (numerator / Math.abs(denominator)) * 100;
  
  // Clamp to reasonable bounds
  return Math.min(Math.max(percent, -999), 999);
}

/**
 * Filter deltas by significance threshold
 * Removes noise from very small changes
 */
export function filterSignificantDeltas(
  deltas: DeltaMetrics[],
  minAbsoluteThreshold = 0.1,
  minPercentThreshold = 1
): DeltaMetrics[] {
  return deltas.filter(delta => 
    Math.abs(delta.absolute) >= minAbsoluteThreshold ||
    Math.abs(delta.percent) >= minPercentThreshold
  );
}

/**
 * Get delta direction color for UI components
 * Handles inverted logic for metrics where lower is better
 */
export function getDeltaColor(delta: DeltaMetrics): string {
  switch (delta.direction) {
    case 'up':
      return '#10b981'; // green
    case 'down':
      return '#ef4444'; // red
    case 'flat':
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Format delta value for display
 * Handles different formatting needs for different metric types
 */
export function formatDeltaValue(delta: DeltaMetrics): string {
  const { key, absolute, percent } = delta;
  
  // For percentage-based metrics, show absolute change
  if (key.includes('Rate') || key.includes('Coverage')) {
    return `${absolute >= 0 ? '+' : ''}${absolute.toFixed(1)}%`;
  }
  
  // For count-based metrics, show absolute change
  if (key.includes('Count') || key === 'totalDomains' || key === 'leadsCount') {
    return `${absolute >= 0 ? '+' : ''}${Math.round(absolute)}`;
  }
  
  // For score-based metrics, show with decimal precision
  if (key.includes('Score') || key.includes('Richness') || key.includes('Gain')) {
    return `${absolute >= 0 ? '+' : ''}${absolute.toFixed(2)}`;
  }
  
  // Default: show percent change
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

/**
 * Create a synthetic previous snapshot for initial baseline
 * Used when no previous snapshot exists for delta calculation
 */
export function createBaselineSnapshot(current: AggregateSnapshot): AggregateSnapshot {
  const baselineAggregates = { ...current.aggregates };
  
  // Reduce values slightly to create artificial baseline for demo purposes
  for (const key of DELTA_KEYS) {
    const value = getMetricValue(baselineAggregates as ExtendedAggregateMetrics, key);
    if (value != null && value > 0) {
      // Reduce by 5-15% to create meaningful deltas
      const reduction = 0.05 + Math.random() * 0.1;
  (baselineAggregates as Record<string, unknown>)[key] = Math.max(0, value * (1 - reduction));
    }
  }
  
  return {
    id: `baseline-${current.id}`,
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    aggregates: baselineAggregates,
    classifiedCounts: current.classifiedCounts
  };
}