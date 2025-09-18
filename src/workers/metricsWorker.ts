/**
 * Metrics Worker (Phase 4)
 * Web Worker for offloading heavy classification and aggregate computations
 */

// Import types for worker communication
interface WorkerMessage {
  type: 'compute' | 'computeAll' | 'forecastCompute' | 'result' | 'error' | 'cancel';
  id?: string;
  domains?: any[];
  previousDomains?: any[];
  includeMovers?: boolean;
  aggregates?: any;
  classifiedCounts?: any;
  movers?: any;
  deltas?: any;
  error?: string;
  timingMs?: number;
  // Phase 6: Forecast computation fields
  timeSeries?: Array<{ timestamp: number; value: number }>;
  horizon?: number;
  forecastOptions?: {
    method: 'holtWinters' | 'simpleExp';
    alpha?: number;
    beta?: number;
    gamma?: number;
    seasonLength?: number;
  };
  forecastPoints?: Array<{
    timestamp: string;
    metricKey: string;
    value: number;
    lower: number;
    upper: number;
  }>;
}

// Import the pure functions used for computation
// Note: These need to be worker-safe (no DOM dependencies)
let classifyDomains: (domains: any[]) => any;
let computeAggregates: (domains: any[]) => any;
let enrichAggregatesWithHighPotential: (aggregates: any, highPotentialCount: number) => any;
let computeMovers: (domains: any[], previousDomains?: any[]) => any;
let calculateDeltas: (current: any, previous?: any) => any;

// Fallback implementations for worker environment
function safeClassifyDomains(domains: any[]) {
  // Simplified classification logic for worker
  const total = domains.length;
  const highQuality = domains.filter(d => d.score && d.score > 80);
  const mediumQuality = domains.filter(d => d.score && d.score > 60 && d.score <= 80);
  const lowQuality = domains.filter(d => d.score && d.score <= 60);
  
  return {
    highPotential: highQuality,
    highQuality: { count: highQuality.length, percentage: (highQuality.length / total) * 100 },
    mediumQuality: { count: mediumQuality.length, percentage: (mediumQuality.length / total) * 100 },
    lowQuality: { count: lowQuality.length, percentage: (lowQuality.length / total) * 100 }
  };
}

function safeComputeAggregates(domains: any[]) {
  const total = domains.length;
  const scores = domains.map(d => d.score || 0).filter(s => s > 0);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  
  return {
    totalDomains: total,
    averageScore,
    scoredDomains: scores.length,
    validDomains: domains.filter(d => d.domain && d.domain.length > 0).length
  };
}

function safeEnrichAggregatesWithHighPotential(aggregates: any, highPotentialCount: number) {
  return {
    ...aggregates,
    highPotentialCount,
    highPotentialPercentage: aggregates.totalDomains > 0 ? 
      (highPotentialCount / aggregates.totalDomains) * 100 : 0
  };
}

function safeComputeMovers(domains: any[], previousDomains?: any[]) {
  if (!previousDomains || previousDomains.length === 0) {
    return { gainers: [], decliners: [] };
  }
  
  // Simple movers computation
  const previousMap = new Map(previousDomains.map(d => [d.id, d.score || 0]));
  const movers = domains.map(d => ({
    domain: d.domain || d.id,
    current: d.score || 0,
    previous: previousMap.get(d.id) || 0,
    delta: (d.score || 0) - (previousMap.get(d.id) || 0)
  })).filter(m => Math.abs(m.delta) > 0.1);
  
  return {
    gainers: movers.filter(m => m.delta > 0).slice(0, 5),
    decliners: movers.filter(m => m.delta < 0).slice(0, 5)
  };
}

function safeCalculateDeltas(current: any, previous?: any) {
  if (!previous) {
    return [];
  }
  
  // Simple delta calculation
  const metrics = ['totalDomains', 'averageScore', 'validDomains'];
  return metrics.map(metric => ({
    key: metric,
    absolute: (current[metric] || 0) - (previous[metric] || 0),
    percent: previous[metric] > 0 ? 
      ((current[metric] || 0) - (previous[metric] || 0)) / (previous[metric] || 0) * 100 : 0,
    direction: (current[metric] || 0) > (previous[metric] || 0) ? 'up' : 'down'
  }));
}

/**
 * Phase 6: Forecast computation in worker for large datasets
 */
function computeForecastInWorker(
  timeSeries: Array<{ timestamp: number; value: number }>,
  horizon: number,
  options?: {
    method?: 'holtWinters' | 'simpleExp';
    alpha?: number;
    beta?: number;
    gamma?: number;
    seasonLength?: number;
  }
): Array<{ timestamp: string; metricKey: string; value: number; lower: number; upper: number }> {
  if (timeSeries.length < 8) {
    return [];
  }

  const method = options?.method || 'simpleExp';
  const alpha = options?.alpha || 0.3;
  
  // Sort by timestamp
  const sortedSeries = [...timeSeries].sort((a, b) => a.timestamp - b.timestamp);
  const values = sortedSeries.map(p => p.value);
  
  if (method === 'holtWinters' && 
      options?.seasonLength && 
      options.seasonLength >= 5 && 
      values.length > 2 * options.seasonLength) {
    return computeHoltWintersInWorker(sortedSeries, horizon, options);
  } else {
    return computeSimpleExpSmoothingInWorker(sortedSeries, horizon, alpha);
  }
}

/**
 * Simple Exponential Smoothing in worker
 */
function computeSimpleExpSmoothingInWorker(
  series: Array<{ timestamp: number; value: number }>,
  horizon: number,
  alpha: number
): Array<{ timestamp: string; metricKey: string; value: number; lower: number; upper: number }> {
  const values = series.map(p => p.value);
  
  // Calculate smoothed values
  let smoothed = values[0];
  const smoothedValues = [smoothed];
  
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    smoothedValues.push(smoothed);
  }
  
  // Calculate residuals for confidence intervals
  const residuals = values.map((val, i) => val - smoothedValues[i]);
  const residualStdDev = calculateStdDev(residuals);
  
  // Generate forecast points
  const forecasts = [];
  const lastTimestamp = series[series.length - 1].timestamp;
  const timestampInterval = series.length > 1 ? 
    (series[series.length - 1].timestamp - series[series.length - 2].timestamp) : 
    86400000; // Default to 1 day
  
  const lastSmoothed = smoothedValues[smoothedValues.length - 1];
  
  for (let i = 1; i <= horizon; i++) {
    const forecastTimestamp = lastTimestamp + (i * timestampInterval);
    const forecastValue = lastSmoothed;
    const confidenceInterval = 1.96 * residualStdDev;
    
    forecasts.push({
      timestamp: new Date(forecastTimestamp).toISOString(),
      metricKey: 'forecast',
      value: forecastValue,
      lower: Math.max(0, forecastValue - confidenceInterval),
      upper: forecastValue + confidenceInterval
    });
  }
  
  return forecasts;
}

/**
 * Holt-Winters in worker (simplified additive)
 */
function computeHoltWintersInWorker(
  series: Array<{ timestamp: number; value: number }>,
  horizon: number,
  options: any
): Array<{ timestamp: string; metricKey: string; value: number; lower: number; upper: number }> {
  const alpha = options.alpha || 0.3;
  const beta = options.beta || 0.1;
  const gamma = options.gamma || 0.1;
  const seasonLength = options.seasonLength || 7;
  
  const values = series.map(p => p.value);
  const n = values.length;
  
  // Initialize components
  let level = values[0];
  let trend = (values[seasonLength] - values[0]) / seasonLength;
  const seasonal = new Array(seasonLength).fill(0);
  
  // Initialize seasonal indices
  for (let i = 0; i < seasonLength; i++) {
    seasonal[i] = values[i] - level;
  }
  
  const fitted = [];
  
  // Holt-Winters equations
  for (let i = 0; i < n; i++) {
    const seasonalIndex = seasonal[i % seasonLength];
    const predicted = level + trend + seasonalIndex;
    fitted.push(predicted);
    
    if (i < n - 1) {
      const newLevel = alpha * (values[i] - seasonalIndex) + (1 - alpha) * (level + trend);
      const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
      const newSeasonal = gamma * (values[i] - newLevel) + (1 - gamma) * seasonalIndex;
      
      level = newLevel;
      trend = newTrend;
      seasonal[i % seasonLength] = newSeasonal;
    }
  }
  
  // Calculate residuals
  const residuals = values.map((val, i) => val - fitted[i]);
  const residualStdDev = calculateStdDev(residuals);
  
  // Generate forecasts
  const forecasts = [];
  const lastTimestamp = series[series.length - 1].timestamp;
  const timestampInterval = series.length > 1 ? 
    (series[series.length - 1].timestamp - series[series.length - 2].timestamp) : 
    86400000;
  
  for (let i = 1; i <= horizon; i++) {
    const forecastTimestamp = lastTimestamp + (i * timestampInterval);
    const seasonalIndex = seasonal[(n + i - 1) % seasonLength];
    const forecastValue = level + (i * trend) + seasonalIndex;
    const confidenceInterval = 1.96 * residualStdDev * Math.sqrt(i);
    
    forecasts.push({
      timestamp: new Date(forecastTimestamp).toISOString(),
      metricKey: 'forecast',
      value: Math.max(0, forecastValue),
      lower: Math.max(0, forecastValue - confidenceInterval),
      upper: forecastValue + confidenceInterval
    });
  }
  
  return forecasts;
}

/**
 * Calculate standard deviation helper
 */
function calculateStdDev(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Try to import actual functions, fall back to safe versions
try {
  // In worker context, we might not have access to the full module system
  // These would need to be manually copied or bundled
  classifyDomains = safeClassifyDomains;
  computeAggregates = safeComputeAggregates;
  enrichAggregatesWithHighPotential = safeEnrichAggregatesWithHighPotential;
  computeMovers = safeComputeMovers;
  calculateDeltas = safeCalculateDeltas;
} catch (error) {
  console.warn('Using fallback functions in worker:', error);
  classifyDomains = safeClassifyDomains;
  computeAggregates = safeComputeAggregates;
  enrichAggregatesWithHighPotential = safeEnrichAggregatesWithHighPotential;
  computeMovers = safeComputeMovers;
  calculateDeltas = safeCalculateDeltas;
}

// Worker message handler
let currentTaskId: string | null = null;

self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, id, domains, previousDomains, includeMovers, timeSeries, horizon, forecastOptions } = event.data;
  
  // Handle cancellation
  if (type === 'cancel') {
    if (currentTaskId === id) {
      currentTaskId = null;
      const cancelResponse: WorkerMessage = {
        type: 'error',
        id,
        error: 'Task cancelled'
      };
      self.postMessage(cancelResponse);
    }
    return;
  }
  
  if (type === 'forecastCompute' && timeSeries && horizon) {
    currentTaskId = id || null;
    const startTime = performance.now();
    
    try {
      // Perform forecast computation in worker
      const forecastPoints = computeForecastInWorker(timeSeries, horizon, forecastOptions);
      const endTime = performance.now();
      const timingMs = endTime - startTime;
      
      // Check if task was cancelled during execution
      if (currentTaskId !== id) {
        return; // Task was cancelled, don't send result
      }
      
      // Send result back to main thread
      const response: WorkerMessage = {
        type: 'result',
        id,
        forecastPoints,
        timingMs
      };
      
      self.postMessage(response);
      currentTaskId = null;
      
    } catch (error) {
      currentTaskId = null;
      
      // Send error back to main thread
      const errorResponse: WorkerMessage = {
        type: 'error',
        id,
        error: error instanceof Error ? error.message : 'Forecast computation error'
      };
      
      self.postMessage(errorResponse);
    }
    return;
  }
  
  if ((type === 'compute' || type === 'computeAll') && domains) {
    currentTaskId = id || null;
    const startTime = performance.now();
    
    try {
      // Perform the heavy computations
      const classified = classifyDomains(domains);
      const aggregates = computeAggregates(domains);
      const enrichedAggregates = enrichAggregatesWithHighPotential(
        aggregates, 
        classified.highPotential ? classified.highPotential.length : 0
      );
      
      // Convert classification to counts format
      const classifiedCounts = {
        highQuality: classified.highQuality?.count || 0,
        mediumQuality: classified.mediumQuality?.count || 0,
        lowQuality: classified.lowQuality?.count || 0,
        total: domains.length
      };
      
      let movers = undefined;
      let deltas = undefined;
      
      // For computeAll, include additional computations
      if (type === 'computeAll') {
        if (includeMovers && previousDomains) {
          movers = computeMovers(domains, previousDomains);
        }
        
        if (previousDomains) {
          const previousAggregates = computeAggregates(previousDomains);
          deltas = calculateDeltas(enrichedAggregates, previousAggregates);
        }
      }
      
      const endTime = performance.now();
      const timingMs = endTime - startTime;
      
      // Check if task was cancelled during execution
      if (currentTaskId !== id) {
        return; // Task was cancelled, don't send result
      }
      
      // Send result back to main thread
      const response: WorkerMessage = {
        type: 'result',
        id,
        aggregates: enrichedAggregates,
        classifiedCounts,
        movers,
        deltas,
        timingMs
      };
      
      self.postMessage(response);
      currentTaskId = null;
      
    } catch (error) {
      currentTaskId = null;
      
      // Send error back to main thread
      const errorResponse: WorkerMessage = {
        type: 'error',
        id,
        error: error instanceof Error ? error.message : 'Unknown worker error'
      };
      
      self.postMessage(errorResponse);
    }
  }
};

// Handle worker errors
self.onerror = function(error) {
  const errorMessage = typeof error === 'string' ? error : 
                      (error instanceof Error ? error.message : 'Worker error');
  
  const errorResponse: WorkerMessage = {
    type: 'error',
    error: errorMessage
  };
  
  self.postMessage(errorResponse);
};

// Export for TypeScript (though this won't execute in worker context)
export {};