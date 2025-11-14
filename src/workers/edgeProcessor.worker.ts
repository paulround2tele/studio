/**
 * Edge Processor Worker (Phase 11)
 * Handles heavy numeric computation and causal recalculation in Web Worker
 */

// Types for worker communication
export interface WorkerTask {
  id: string;
  kind: 'causal_recompute' | 'forecast_blend' | 'simulation_projection';
  payload: unknown;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

export interface WorkerResponse {
  taskId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  processingTimeMs: number;
}

// Worker message handlers
const taskHandlers: Record<WorkerTask['kind'], (payload: unknown) => unknown> = {
  causal_recompute: (payload) => handleCausalRecompute(payload as Parameters<typeof handleCausalRecompute>[0]),
  forecast_blend: (payload) => handleForecastBlend(payload as Parameters<typeof handleForecastBlend>[0]),
  simulation_projection: (payload) => handleSimulationProjection(payload as Parameters<typeof handleSimulationProjection>[0])
};

/**
 * Main worker message handler
 */
self.onmessage = function(event) {
  const task: WorkerTask = event.data;
  const startTime = performance.now();

  try {
    const handler = taskHandlers[task.kind];
    if (!handler) {
      throw new Error(`Unknown task kind: ${task.kind}`);
    }

    const result = handler(task.payload);
    const processingTimeMs = performance.now() - startTime;

    const response: WorkerResponse = {
      taskId: task.id,
      success: true,
      result,
      processingTimeMs
    };

    self.postMessage(response);
  } catch (error) {
    const processingTimeMs = performance.now() - startTime;
    
    const response: WorkerResponse = {
      taskId: task.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs
    };

    self.postMessage(response);
  }
};

/**
 * Handle causal graph recomputation batch
 */
function handleCausalRecompute(payload: {
  observations: Array<{
    metricKey: string;
    value: number;
    timestamp: number;
    features: Record<string, unknown>;
  }>;
  existingGraph?: unknown;
}): unknown {
  // Simplified causal inference computation
  const { observations, existingGraph: _existingGraph } = payload;
  
  // Group observations by metric
  const metricGroups = new Map<string, typeof observations>();
  for (const obs of observations) {
    if (!metricGroups.has(obs.metricKey)) {
      metricGroups.set(obs.metricKey, []);
    }
    metricGroups.get(obs.metricKey)!.push(obs);
  }

  // Compute correlations between metrics (simplified)
  const correlations: Array<{
    metricA: string;
    metricB: string;
    correlation: number;
    confidence: number;
  }> = [];

  const metricKeys = Array.from(metricGroups.keys());
  for (let i = 0; i < metricKeys.length; i++) {
    for (let j = i + 1; j < metricKeys.length; j++) {
      const metricA = metricKeys[i];
      const metricB = metricKeys[j];
      
  if (!metricA || !metricB) continue;
  const groupA = metricGroups.get(metricA);
  const groupB = metricGroups.get(metricB);
  if (!groupA || !groupB) continue;
  const seriesA = groupA.map(obs => obs.value);
  const seriesB = groupB.map(obs => obs.value);
      
      const correlation = calculateCorrelation(seriesA, seriesB);
      const confidence = Math.min(seriesA.length, seriesB.length) / 100; // Simple confidence based on sample size
      
      correlations.push({
  metricA: metricA!,
  metricB: metricB!,
        correlation,
        confidence: Math.min(confidence, 1.0)
      });
    }
  }

  return {
    correlations,
    nodeCount: metricKeys.length,
    edgeCount: correlations.filter(c => Math.abs(c.correlation) > 0.3).length,
    computedAt: Date.now()
  };
}

/**
 * Handle forecast blend computation batch
 */
function handleForecastBlend(payload: {
  modelForecasts: Array<{
    modelId: string;
    points: Array<{ timestamp: number; value: number; lower?: number; upper?: number }>;
    weight: number;
  }>;
  metricKey: string;
  horizon: number;
}): unknown {
  const { modelForecasts, metricKey, horizon } = payload;
  
  if (modelForecasts.length === 0) {
    return { blendedPoints: [], weights: {}, metricKey, horizon };
  }

  // Find common time points
  const allTimestamps = new Set<number>();
  modelForecasts.forEach(forecast => {
    forecast.points.forEach(point => allTimestamps.add(point.timestamp));
  });

  const commonTimestamps = Array.from(allTimestamps).sort();
  
  // Blend forecasts at each time point
  const blendedPoints = commonTimestamps.map(timestamp => {
    let weightedSum = 0;
    let totalWeight = 0;
    let weightedLowerSum = 0;
    let weightedUpperSum = 0;
    let hasConfidenceIntervals = false;

    for (const forecast of modelForecasts) {
      const point = forecast.points.find(p => p.timestamp === timestamp);
      if (point) {
        weightedSum += point.value * forecast.weight;
        totalWeight += forecast.weight;

        if (point.lower !== undefined && point.upper !== undefined) {
          weightedLowerSum += point.lower * forecast.weight;
          weightedUpperSum += point.upper * forecast.weight;
          hasConfidenceIntervals = true;
        }
      }
    }

    const blendedValue = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const blendedLower = hasConfidenceIntervals && totalWeight > 0 ? weightedLowerSum / totalWeight : undefined;
    const blendedUpper = hasConfidenceIntervals && totalWeight > 0 ? weightedUpperSum / totalWeight : undefined;

    return {
      timestamp,
      value: blendedValue,
      lower: blendedLower,
      upper: blendedUpper
    };
  });

  // Compute final weights
  const weights: Record<string, number> = {};
  const totalModelWeight = modelForecasts.reduce((sum, f) => sum + f.weight, 0);
  modelForecasts.forEach(forecast => {
    weights[forecast.modelId] = totalModelWeight > 0 ? forecast.weight / totalModelWeight : 0;
  });

  return {
    blendedPoints,
    weights,
    metricKey,
    horizon,
    modelCount: modelForecasts.length
  };
}

/**
 * Handle scenario simulation projection batch
 */
function handleSimulationProjection(payload: {
  baselineMetrics: Record<string, number>;
  interventions: Array<{
    type: string;
    metricKey?: string;
    adjustment?: number;
    adjustmentType?: string;
  }>;
  seed: string;
}): unknown {
  const { baselineMetrics, interventions, seed } = payload;
  
  // Deterministic random based on seed
  const random = createSeededRandom(seed);
  
  const projectedMetrics: Record<string, {
    baseline: number;
    projected: number;
    confidence: number;
  }> = {};

  // Process each baseline metric
  for (const [metricKey, baselineValue] of Object.entries(baselineMetrics)) {
    let projectedValue = baselineValue;
    let totalConfidence = 1.0;

    // Apply interventions
    for (const intervention of interventions) {
      if (intervention.type === 'metric_shift' && intervention.metricKey === metricKey) {
        if (intervention.adjustmentType === 'percentage') {
          projectedValue += baselineValue * ((intervention.adjustment || 0) / 100);
        } else {
          projectedValue += intervention.adjustment || 0;
        }
        totalConfidence *= 0.9; // Direct interventions have high confidence
      } else {
        // Add some random correlation for other interventions
        const randomImpact = (random() - 0.5) * baselineValue * 0.1;
        projectedValue += randomImpact;
        totalConfidence *= 0.7; // Indirect effects have lower confidence
      }
    }

    projectedMetrics[metricKey] = {
      baseline: baselineValue,
      projected: projectedValue,
      confidence: Math.max(totalConfidence, 0.1) // Minimum 10% confidence
    };
  }

  return {
    projectedMetrics,
    interventionCount: interventions.length,
    seed,
    computedAt: Date.now()
  };
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;

  for (let i = 0; i < n; i++) {
  const vx = x[i];
  const vy = y[i];
  if (vx === undefined || vy === undefined) continue;
  const deltaX = vx - meanX;
  const deltaY = vy - meanY;
    
    numerator += deltaX * deltaY;
    sumXSquared += deltaX * deltaX;
    sumYSquared += deltaY * deltaY;
  }

  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Create seeded pseudo-random number generator
 */
function createSeededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Simple linear congruential generator
  let state = Math.abs(hash);
  
  return function() {
    state = (state * 1664525 + 1013904223) % 0x100000000;
    return (state & 0x7fffffff) / 0x7fffffff;
  };
}