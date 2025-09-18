/**
 * Forecast Service (Phase 6)
 * Server-first forecast with client fallback using exponential smoothing/Holt-Winters
 */

import { AggregateSnapshot } from '@/types/campaignMetrics';

// Feature flags
const isForecastsEnabled = () => 
  process.env.NEXT_PUBLIC_ENABLE_FORECASTS !== 'false';

const getForecastHorizon = () => 
  parseInt(process.env.NEXT_PUBLIC_FORECAST_HORIZON_DAYS || '7', 10);

/**
 * Server forecast response structure
 */
export interface ServerForecastResponse {
  horizon: number;
  generatedAt: string;
  method: 'server';
  points: ForecastPoint[];
}

/**
 * Individual forecast point with confidence interval
 */
export interface ForecastPoint {
  timestamp: string;
  metricKey: string;
  value: number;
  lower: number;
  upper: number;
}

/**
 * Client forecast computation options
 */
export interface ClientForecastOptions {
  method: 'holtWinters' | 'simpleExp';
  alpha?: number;
  beta?: number;
  gamma?: number;
  seasonLength?: number;
}

/**
 * Unified forecast result
 */
export interface ForecastResult {
  horizon: number;
  generatedAt: string;
  method: 'server' | 'client';
  points: ForecastPoint[];
  timingMs?: number;
  error?: string;
}

/**
 * Time series data point for computation
 */
interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

/**
 * Fetch server-provided forecast for a campaign
 */
export async function getServerForecast(
  campaignId: string,
  horizon: number = getForecastHorizon()
): Promise<ServerForecastResponse> {
  if (!isForecastsEnabled()) {
    throw new Error('Forecasting feature is disabled via configuration. Enable NEXT_PUBLIC_ENABLE_FORECASTS to use this feature.');
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('API URL not configured');
  }

  const response = await fetch(`${apiUrl}/campaigns/${campaignId}/forecast?horizon=${horizon}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 501) {
      throw new Error('Server forecast not available');
    }
    throw new Error(`Server forecast failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Compute client-side forecast using exponential smoothing or Holt-Winters
 */
export function computeClientForecast(
  series: TimeSeriesPoint[],
  horizon: number = getForecastHorizon(),
  options: ClientForecastOptions = { method: 'simpleExp', alpha: 0.3 }
): ForecastPoint[] {
  if (!isForecastsEnabled() || series.length < 8) {
    return [];
  }

  // Sort series by timestamp
  const sortedSeries = [...series].sort((a, b) => a.timestamp - b.timestamp);
  
  if (options.method === 'holtWinters' && 
      options.seasonLength && 
      options.seasonLength >= 5 && 
      sortedSeries.length > 2 * options.seasonLength) {
    return computeHoltWinters(sortedSeries, horizon, options);
  } else {
    return computeSimpleExponentialSmoothing(sortedSeries, horizon, options);
  }
}

/**
 * Simple Exponential Smoothing implementation
 */
function computeSimpleExponentialSmoothing(
  series: TimeSeriesPoint[],
  horizon: number,
  options: ClientForecastOptions
): ForecastPoint[] {
  const alpha = options.alpha || 0.3;
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
  const residualStdDev = calculateStandardDeviation(residuals);
  
  // Generate forecast points
  const forecasts: ForecastPoint[] = [];
  const lastTimestamp = series[series.length - 1].timestamp;
  const timestampInterval = series.length > 1 ? 
    (series[series.length - 1].timestamp - series[series.length - 2].timestamp) : 
    86400000; // Default to 1 day
  
  const lastSmoothed = smoothedValues[smoothedValues.length - 1];
  
  for (let i = 1; i <= horizon; i++) {
    const forecastTimestamp = lastTimestamp + (i * timestampInterval);
    const forecastValue = lastSmoothed; // SES produces flat forecast
    const confidenceInterval = 1.96 * residualStdDev; // 95% confidence
    
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
 * Holt-Winters additive implementation (simplified)
 */
function computeHoltWinters(
  series: TimeSeriesPoint[],
  horizon: number,
  options: ClientForecastOptions
): ForecastPoint[] {
  const alpha = options.alpha || 0.3;
  const beta = options.beta || 0.1;
  const gamma = options.gamma || 0.1;
  const seasonLength = options.seasonLength || 7;
  
  const values = series.map(p => p.value);
  const n = values.length;
  
  // Initialize level, trend, and seasonal components
  let level = values[0];
  let trend = (values[seasonLength] - values[0]) / seasonLength;
  const seasonal: number[] = new Array(seasonLength).fill(0);
  
  // Initialize seasonal indices
  for (let i = 0; i < seasonLength; i++) {
    seasonal[i] = values[i] - level;
  }
  
  const fitted: number[] = [];
  
  // Holt-Winters equations
  for (let i = 0; i < n; i++) {
    const seasonalIndex = seasonal[i % seasonLength];
    const predicted = level + trend + seasonalIndex;
    fitted.push(predicted);
    
    if (i < n - 1) { // Don't update on last observation
      const newLevel = alpha * (values[i] - seasonalIndex) + (1 - alpha) * (level + trend);
      const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
      const newSeasonal = gamma * (values[i] - newLevel) + (1 - gamma) * seasonalIndex;
      
      level = newLevel;
      trend = newTrend;
      seasonal[i % seasonLength] = newSeasonal;
    }
  }
  
  // Calculate residuals for confidence intervals
  const residuals = values.map((val, i) => val - fitted[i]);
  const residualStdDev = calculateStandardDeviation(residuals);
  
  // Generate forecast points
  const forecasts: ForecastPoint[] = [];
  const lastTimestamp = series[series.length - 1].timestamp;
  const timestampInterval = series.length > 1 ? 
    (series[series.length - 1].timestamp - series[series.length - 2].timestamp) : 
    86400000;
  
  for (let i = 1; i <= horizon; i++) {
    const forecastTimestamp = lastTimestamp + (i * timestampInterval);
    const seasonalIndex = seasonal[(n + i - 1) % seasonLength];
    const forecastValue = level + (i * trend) + seasonalIndex;
    const confidenceInterval = 1.96 * residualStdDev * Math.sqrt(i); // Increasing uncertainty
    
    forecasts.push({
      timestamp: new Date(forecastTimestamp).toISOString(),
      metricKey: 'forecast',
      value: Math.max(0, forecastValue), // Ensure non-negative
      lower: Math.max(0, forecastValue - confidenceInterval),
      upper: forecastValue + confidenceInterval
    });
  }
  
  return forecasts;
}

/**
 * Calculate standard deviation of residuals
 */
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Merge forecast points into existing snapshot series
 */
export function mergeForecastIntoSeries(
  snapshots: AggregateSnapshot[],
  forecastPoints: ForecastPoint[]
): AggregateSnapshot[] {
  if (forecastPoints.length === 0) {
    return snapshots;
  }

  // Create forecast snapshots
  const forecastSnapshots: AggregateSnapshot[] = forecastPoints.map((point, index) => ({
    id: `forecast-${index}`,
    timestamp: point.timestamp,
    aggregates: {
      totalDomains: 0,
      successRate: 0,
      avgLeadScore: point.value,
      dnsSuccessRate: 0,
      httpSuccessRate: 0
    },
    classifiedCounts: {
      highQuality: 0,
      mediumQuality: 0,
      lowQuality: 0,
      total: 0
    },
    forecast: {
      value: point.value,
      lower: point.lower,
      upper: point.upper,
      isForecast: true
    }
  }));

  return [...snapshots, ...forecastSnapshots];
}

/**
 * Extract time series from snapshots for forecasting
 */
export function extractTimeSeriesFromSnapshots(
  snapshots: AggregateSnapshot[],
  metricKey: keyof AggregateSnapshot['aggregates']
): TimeSeriesPoint[] {
  return snapshots
    .filter(snapshot => !('forecast' in snapshot)) // Exclude existing forecasts
    .map(snapshot => ({
      timestamp: new Date(snapshot.timestamp).getTime(),
      value: snapshot.aggregates[metricKey] as number
    }))
    .filter(point => !isNaN(point.value))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Check if forecast features are available
 */
export function isForecastAvailable(): boolean {
  return isForecastsEnabled();
}

/**
 * Get default forecast horizon
 */
export function getDefaultHorizon(): number {
  return getForecastHorizon();
}