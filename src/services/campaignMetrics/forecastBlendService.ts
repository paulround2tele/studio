/**
 * Forecast Blend Service (Phase 9)
 * Bayesian model blending with adaptive weight updates
 */

import { telemetryService } from './telemetryService';
import type { ForecastPoint } from '@/lib/api-client/models';

// Adapt loosely typed incoming point objects into a canonical internal shape
interface RawForecastPointLike { timestamp: string; value?: number; predictedValue?: number; lower?: number; upper?: number }
function adaptRawPoint(metricKey: string, p: RawForecastPointLike): ForecastPoint & { value: number; lower?: number; upper?: number } {
  const predicted = (typeof p.predictedValue === 'number' ? p.predictedValue : p.value) ?? 0;
  const lower = typeof p.lower === 'number' ? p.lower : predicted;
  const upper = typeof p.upper === 'number' ? p.upper : predicted;
  return {
    metricKey,
    timestamp: p.timestamp,
    predictedValue: predicted,
    // augmented fields retained for internal blending math
    value: predicted,
    lower,
    upper
  } as ForecastPoint & { value: number; lower?: number; upper?: number };
}

/**
 * Model registration info
 */
export interface ModelRegistration {
  modelId: string;
  kind: 'server' | 'client';
  priorWeight: number;
  decayHalfLifeMs: number;
  registeredAt: number;
}

/**
 * Performance tracking entry
 */
interface PerformanceEntry {
  metricKey: string;
  modelId: string;
  actual: number;
  predicted: number;
  error: number;
  timestamp: number;
}

/**
 * Model performance statistics
 */
export interface ModelPerformanceStats {
  modelId: string;
  sampleCount: number;
  meanAbsoluteError: number;
  meanAbsolutePercentageError: number;
  rollingMeanActual: number;
  confidence: number;
  lastUpdated: number;
}

/**
 * Blended forecast result
 */
export interface BlendedForecast {
  metricKey: string;
  horizon: number;
  blendedPoints: Array<{
    timestamp: string;
    value: number;
    lower: number;
    upper: number;
    contributors: Array<{
      modelId: string;
      weight: number;
      value: number;
    }>;
  }>;
  posteriorWeights: Map<string, number>;
  blendMethod: 'bayesian' | 'arbitration_fallback';
  generatedAt: string;
  qualityScore: number;
}

/**
 * Minimum sample threshold for Bayesian blending
 */
const MIN_SAMPLE_THRESHOLD = 5;

/**
 * Forecast blend service class
 */
class ForecastBlendService {
  private models = new Map<string, ModelRegistration>();
  private performanceHistory = new Map<string, PerformanceEntry[]>();
  private performanceStats = new Map<string, ModelPerformanceStats>();

  /**
   * Register a model for blending
   */
  registerModel(
    modelId: string,
    kind: 'server' | 'client',
    priorWeight: number = 1.0,
    decayHalfLifeMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days default
  ): void {
    if (priorWeight <= 0 || priorWeight > 10) {
      throw new Error('Prior weight must be between 0 and 10');
    }

    if (decayHalfLifeMs <= 0) {
      throw new Error('Decay half-life must be positive');
    }

    const registration: ModelRegistration = {
      modelId,
      kind,
      priorWeight,
      decayHalfLifeMs,
      registeredAt: Date.now(),
    };

    this.models.set(modelId, registration);

    telemetryService.emitTelemetry('model_registered', {
      modelId,
      kind,
      priorWeight,
      decayHalfLifeMs,
    });
  }

  /**
   * Update model performance with actual vs predicted values
   */
  updatePerformance(
    metricKey: string,
    modelId: string,
    actual: number,
    predicted: number
  ): void {
    if (!this.models.has(modelId)) {
      console.warn(`[ForecastBlendService] Model ${modelId} not registered`);
      return;
    }

    if (!Number.isFinite(actual) || !Number.isFinite(predicted)) {
      console.warn(`[ForecastBlendService] Invalid actual/predicted values for ${modelId}`);
      return;
    }

    const error = Math.abs(actual - predicted);
    const entry: PerformanceEntry = {
      metricKey,
      modelId,
      actual,
      predicted,
      error,
      timestamp: Date.now(),
    };

    const key = `${metricKey}:${modelId}`;
    const history = this.performanceHistory.get(key) || [];
    history.push(entry);

    // Keep only recent entries (max 100 per model-metric combination)
    if (history.length > 100) {
      history.shift();
    }

    this.performanceHistory.set(key, history);
    this.updatePerformanceStats(key, history);

    telemetryService.emitTelemetry('model_performance_updated', {
      metricKey,
      modelId,
      error,
      sampleCount: history.length,
    });
  }

  /**
   * Compute blended forecast using Bayesian weight updates
   */
  computeBlend(
    metricKey: string,
    horizon: number,
    modelForecasts: Array<{
      modelId: string;
      points: Array<{
        timestamp: string;
        value: number;
        lower?: number;
        upper?: number;
      }>;
    }>
  ): BlendedForecast {
    // Adapt raw point shape to ForecastPoint (add metricKey & predictedValue aliasing value)
    const adaptedForecasts: Array<{ modelId: string; points: (ForecastPoint & { value: number; lower?: number; upper?: number })[] }> = modelForecasts.map(f => ({
      modelId: f.modelId,
      points: f.points.map(p => adaptRawPoint(metricKey, p))
    }));
    const startTime = Date.now();

    // Check if we have sufficient performance data for Bayesian blending
    const sufficientData = adaptedForecasts.every(forecast => {
      const key = `${metricKey}:${forecast.modelId}`;
      const history = this.performanceHistory.get(key);
      return history && history.length >= MIN_SAMPLE_THRESHOLD;
    });

    if (!sufficientData) {
      return this.fallbackToArbitration(metricKey, horizon, adaptedForecasts);
    }

    // Calculate posterior weights using Bayesian updates
  const posteriorWeights = this.calculatePosteriorWeights(metricKey, adaptedForecasts);

    // Blend forecasts using weighted averaging
  const blendedPoints = this.blendForecasts(adaptedForecasts, posteriorWeights);

    const qualityScore = this.calculateBlendQuality(metricKey, posteriorWeights);

    telemetryService.emitTelemetry('forecast_blended', {
      metricKey,
      horizon,
      modelCount: adaptedForecasts.length,
      blendMethod: 'bayesian',
      qualityScore,
      timingMs: Date.now() - startTime,
    });

    return {
      metricKey,
      horizon,
      blendedPoints,
      posteriorWeights,
      blendMethod: 'bayesian',
      generatedAt: new Date().toISOString(),
      qualityScore,
    };
  }

  /**
   * Calculate posterior weights using exponential error weighting
   */
  private calculatePosteriorWeights(
    metricKey: string,
  modelForecasts: Array<{ modelId: string; points: ForecastPoint[] }>
  ): Map<string, number> {
    const weights = new Map<string, number>();
    const currentTime = Date.now();

    for (const forecast of modelForecasts) {
      const { modelId } = forecast;
      const registration = this.models.get(modelId);
      const stats = this.performanceStats.get(`${metricKey}:${modelId}`);

      if (!registration || !stats) {
        // Use prior weight if no performance data
        weights.set(modelId, registration?.priorWeight || 1.0);
        continue;
      }

      // Apply time decay to performance metrics
      const ageMs = currentTime - stats.lastUpdated;
      const decayFactor = Math.exp(-Math.log(2) * ageMs / registration.decayHalfLifeMs);

      // Calculate error normalization
      const errNorm = stats.rollingMeanActual > 0 
        ? stats.meanAbsoluteError / stats.rollingMeanActual
        : stats.meanAbsoluteError;

      // Exponential weight update: w' = w * exp(-errNorm * k) with decay
      const k = 2.0; // Error sensitivity parameter
      const rawWeight = registration.priorWeight * Math.exp(-errNorm * k) * decayFactor;
      
      weights.set(modelId, Math.max(0.001, rawWeight)); // Minimum weight threshold
    }

    // Normalize weights to sum to 1
    const totalWeight = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
    if (totalWeight > 0) {
      const weightEntries = Array.from(weights.entries());
      for (const [modelId, weight] of weightEntries) {
        weights.set(modelId, weight / totalWeight);
      }
    }

    return weights;
  }

  /**
   * Blend forecasts using weighted averaging
   */
  private blendForecasts(
    modelForecasts: Array<{ modelId: string; points: ForecastPoint[] }>,
    weights: Map<string, number>
  ): BlendedForecast['blendedPoints'] {
    if (modelForecasts.length === 0) return [];

  const maxPoints = Math.max(...modelForecasts.map(f => f.points.length));
    const blendedPoints: BlendedForecast['blendedPoints'] = [];

    for (let i = 0; i < maxPoints; i++) {
      let weightedValue = 0;
      let weightedLower = 0;
      let weightedUpper = 0;
      let totalWeight = 0;
      const contributors: Array<{ modelId: string; weight: number; value: number }> = [];

      // Get timestamp from first available model
      const timestamp = modelForecasts.find(f => f.points[i])?.points[i]?.timestamp || 
        new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString();

      for (const forecast of modelForecasts) {
        const point = forecast.points[i];
        if (!point) continue;

        const weight = weights.get(forecast.modelId) || 0;
        
  // point may have predictedValue (canonical) plus augmented raw fields
    const pv = (point as { predictedValue?: number; value?: number }).predictedValue ?? (point as { value?: number }).value ?? 0;
    const lower = (point as { lower?: number }).lower ?? pv;
    const upper = (point as { upper?: number }).upper ?? pv;
  weightedValue += pv * weight;
  weightedLower += lower * weight;
  weightedUpper += upper * weight;
        totalWeight += weight;

        contributors.push({
          modelId: forecast.modelId,
          weight,
          value: pv,
        });
      }

      if (totalWeight > 0) {
        blendedPoints.push({
          timestamp,
          value: weightedValue / totalWeight,
          lower: weightedLower / totalWeight,
          upper: weightedUpper / totalWeight,
          contributors,
        });
      }
    }

    return blendedPoints;
  }

  /**
   * Calculate blend quality score based on weight distribution and model reliability
   */
  private calculateBlendQuality(
    metricKey: string,
    weights: Map<string, number>
  ): number {
    const weightValues = Array.from(weights.values());
    
    // Entropy-based diversity score (higher entropy = more diverse = potentially better)
    const entropy = -weightValues.reduce((sum, w) => 
      w > 0 ? sum + w * Math.log(w) : sum, 0
    );
    
    // Normalize entropy to 0-1 scale
    const maxEntropy = Math.log(weightValues.length);
    const diversityScore = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Average model confidence
    let avgConfidence = 0;
    let modelCount = 0;

    const weightEntries = Array.from(weights.entries());
    for (const [modelId, weight] of weightEntries) {
      const stats = this.performanceStats.get(`${metricKey}:${modelId}`);
      if (stats) {
        avgConfidence += stats.confidence * weight;
        modelCount++;
      }
    }

    if (modelCount === 0) return 0.5; // Default score

    // Combine diversity and confidence (50/50 weight)
    return Math.min(1.0, (diversityScore * 0.5) + (avgConfidence * 0.5));
  }

  /**
   * Fallback to Phase 8 arbitration when insufficient Bayesian data
   */
  private fallbackToArbitration(
    metricKey: string,
    horizon: number,
  modelForecasts: Array<{ modelId: string; points: ForecastPoint[] }>
  ): BlendedForecast {
    // Simple arbitration: pick best performing model or default to first
    let bestModelId: string | undefined = modelForecasts[0]?.modelId;
    let bestScore = Infinity;

    for (const forecast of modelForecasts) {
      if (!forecast?.modelId) continue;
      const key = `${metricKey}:${forecast.modelId}`;
      const stats = this.performanceStats.get(key);
      if (stats && stats.meanAbsoluteError < bestScore) {
        bestScore = stats.meanAbsoluteError;
        bestModelId = forecast.modelId;
      }
    }

    // Defensive default if still undefined
    if (!bestModelId) {
      bestModelId = 'unknown_model';
    }
  const bestForecast = modelForecasts.find(f => f.modelId === bestModelId) || modelForecasts[0];
    if (!bestForecast) {
      throw new Error('No valid forecast found for arbitration');
    }

    const weights = new Map<string, number>();
    weights.set(bestModelId, 1.0);

    const blendedPoints: BlendedForecast['blendedPoints'] = bestForecast.points.map(point => {
  const pv = (point as { predictedValue?: number; value?: number }).predictedValue ?? (point as { value?: number }).value ?? 0;
  const lower = (point as { lower?: number }).lower ?? pv;
  const upper = (point as { upper?: number }).upper ?? pv;
      return {
        timestamp: String(point.timestamp),
        value: Number(pv) || 0,
        lower: Number(lower) || Number(pv) || 0,
        upper: Number(upper) || Number(pv) || 0,
      contributors: [{
        modelId: bestModelId as string,
        weight: 1.0,
          value: Number(pv) || 0,
        }],
      };
    });

    telemetryService.emitTelemetry('forecast_blend_fallback', {
      metricKey,
      selectedModel: bestModelId,
      reason: 'insufficient_bayesian_data',
    });

    return {
      metricKey,
      horizon,
      blendedPoints,
      posteriorWeights: weights,
      blendMethod: 'arbitration_fallback',
      generatedAt: new Date().toISOString(),
      qualityScore: 0.7, // Default arbitration score
    };
  }

  /**
   * Update performance statistics for a model-metric combination
   */
  private updatePerformanceStats(key: string, history: PerformanceEntry[]): void {
    if (history.length === 0) return;

    const errors = history.map(entry => entry.error);
    const actuals = history.map(entry => entry.actual);
    const predictions = history.map(entry => entry.predicted);

    const meanAbsoluteError = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    const rollingMeanActual = actuals.reduce((sum, val) => sum + val, 0) / actuals.length;

    // Calculate MAPE (avoiding division by zero)
    const mapeValues = history.map(entry => 
      entry.actual !== 0 ? Math.abs((entry.actual - entry.predicted) / entry.actual) : 0
    );
    const meanAbsolutePercentageError = mapeValues.reduce((sum, val) => sum + val, 0) / mapeValues.length;

    // Calculate confidence based on consistency (lower variance = higher confidence)
    const variance = errors.reduce((sum, err) => {
      const diff = err - meanAbsoluteError;
      return sum + diff * diff;
    }, 0) / errors.length;
    
    const confidence = Math.max(0, Math.min(1, 1 - (Math.sqrt(variance) / (rollingMeanActual + 1))));

    const split = key.split(':');
    const derivedModelId = split.length > 1 ? split[1] : split[0];
    const stats: ModelPerformanceStats = {
      modelId: derivedModelId || 'unknown_model',
      sampleCount: history.length,
      meanAbsoluteError,
      meanAbsolutePercentageError,
      rollingMeanActual,
      confidence,
      lastUpdated: Date.now(),
    };

    this.performanceStats.set(key, stats);
  }

  /**
   * Get performance statistics for a model-metric combination
   */
  getPerformanceStats(metricKey: string, modelId: string): ModelPerformanceStats | undefined {
    return this.performanceStats.get(`${metricKey}:${modelId}`);
  }

  /**
   * Get all registered models
   */
  getRegisteredModels(): ModelRegistration[] {
    return Array.from(this.models.values());
  }

  /**
   * Clear performance history (useful for testing)
   */
  clearPerformanceHistory(): void {
    this.performanceHistory.clear();
    this.performanceStats.clear();
  }
}

// Export singleton instance
export const forecastBlendService = new ForecastBlendService();