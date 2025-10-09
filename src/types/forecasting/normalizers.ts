/**
 * Normalizer functions for forecast model alignment
 * Phase 2: Model Alignment & Generic Cleanup
 */

import { 
  ForecastPoint, 
  ModelScore, 
  BlendResult, 
  QualityMetrics, 
  ModelInfo, 
  NormalizedForecastResult 
} from './index';

/**
 * Normalize forecast points to ensure consistent structure
 */
export function normalizeForecastPoints(points: unknown[]): ForecastPoint[] {
  if (!Array.isArray(points)) return [];
  return points.filter(p => p && typeof p === 'object').map(p => {
    const point = p as Record<string, unknown>;
    const value = typeof point.value === 'number' ? point.value : Number(point.value) || 0;
    const lower = typeof point.lower === 'number' ? point.lower : (typeof point.value === 'number' ? point.value : value);
    const upper = typeof point.upper === 'number' ? point.upper : (typeof point.value === 'number' ? point.value : value);
    const confidence = typeof point.confidence === 'number' ? point.confidence : (point.confidence !== undefined ? Number(point.confidence) : undefined);
    return {
      timestamp: typeof point.timestamp === 'string' ? point.timestamp : new Date().toISOString(),
      value,
      lower,
      upper,
      confidence,
    };
  });
}

/**
 * Coerce model scores to standard format
 */
export function coerceModelScores(scores: unknown): ModelScore {
  const rec = (scores && typeof scores === 'object') ? (scores as Record<string, unknown>) : {};
  return {
    model: typeof rec.model === 'string' ? rec.model : 'unknown',
    mae: typeof rec.mae === 'number' ? rec.mae : Number(rec.mae) || 0,
    mape: typeof rec.mape === 'number' ? rec.mape : Number(rec.mape) || 0,
    confidence: typeof rec.confidence === 'number' ? rec.confidence : Number(rec.confidence) || 0.5,
  };
}

/**
 * Normalize blend result structure
 */
export function normalizeBlendResult(result: unknown): BlendResult {
  const rec = (result && typeof result === 'object') ? (result as Record<string, unknown>) : {};
  return {
    blendedPoints: normalizeForecastPoints(Array.isArray(rec.blendedPoints) ? rec.blendedPoints : []),
    weights: (rec.weights && typeof rec.weights === 'object') ? rec.weights as Record<string, number> : {},
    metricKey: typeof rec.metricKey === 'string' ? rec.metricKey : 'unknown',
    horizon: typeof rec.horizon === 'number' ? rec.horizon : Number(rec.horizon) || 0,
    fallback: Boolean(rec.fallback),
    qualityScore: typeof rec.qualityScore === 'number' ? rec.qualityScore : (rec.qualityScore !== undefined ? Number(rec.qualityScore) : undefined),
  };
}

/**
 * Normalize quality metrics with required fields
 */
export function normalizeQualityMetrics(metrics: unknown): QualityMetrics {
  const rec = (metrics && typeof metrics === 'object') ? (metrics as Record<string, unknown>) : {};
  return {
    mae: typeof rec.mae === 'number' ? rec.mae : Number(rec.mae) || 0,
    mape: typeof rec.mape === 'number' ? rec.mape : Number(rec.mape) || 0,
    residualVariance: typeof rec.residualVariance === 'number' ? rec.residualVariance : Number(rec.residualVariance) || 0,
  };
}

/**
 * Normalize model info structure
 */
export function normalizeModelInfo(info: unknown): ModelInfo {
  const rec = (info && typeof info === 'object') ? (info as Record<string, unknown>) : {};
  const alt = (rec.alternativeModels && Array.isArray(rec.alternativeModels)) ? rec.alternativeModels : [];
  return {
    selectedModel: typeof rec.selectedModel === 'string' ? rec.selectedModel : 'unknown',
    arbitrationScores: rec.arbitrationScores ? coerceModelScores(rec.arbitrationScores) : undefined,
    alternativeModels: alt.filter(m => m && typeof m === 'object').map(m => {
      const model = m as Record<string, unknown>;
      return {
        name: typeof model.name === 'string' ? model.name : 'unknown',
        mae: typeof model.mae === 'number' ? model.mae : Number(model.mae) || 0,
        mape: typeof model.mape === 'number' ? model.mape : Number(model.mape) || 0,
      };
    }),
  };
}

/**
 * Main forecast result normalizer
 */
export function normalizeForecastResult(result: unknown): NormalizedForecastResult {
  const rec = (result && typeof result === 'object') ? (result as Record<string, unknown>) : {};
  return {
    horizon: typeof rec.horizon === 'number' ? rec.horizon : Number(rec.horizon) || 0,
    generatedAt: typeof rec.generatedAt === 'string' ? rec.generatedAt : new Date().toISOString(),
    method: ((): NormalizedForecastResult['method'] => {
      const m = rec.method;
      return m === 'client' || m === 'server' || m === 'insufficient-data' || m === 'skipped' || m === 'client-worker'
        ? m
        : 'client';
    })(),
    points: normalizeForecastPoints(Array.isArray(rec.points) ? rec.points : []),
    timingMs: typeof rec.timingMs === 'number' ? rec.timingMs : Number(rec.timingMs) || 0,
    error: rec.error ? String(rec.error) : undefined,
    modelInfo: normalizeModelInfo(rec.modelInfo),
    qualityMetrics: normalizeQualityMetrics(rec.qualityMetrics),
  };
}

/**
 * Factory function for creating forecast points
 */
export function createForecastPoint(
  timestamp: string,
  value: number,
  lower?: number,
  upper?: number,
  confidence?: number
): ForecastPoint {
  return {
    timestamp,
    value,
    lower: lower ?? value,
    upper: upper ?? value,
    confidence,
  };
}

/**
 * Factory function for creating blend results
 */
export function createBlendResult(
  points: ForecastPoint[],
  weights: Record<string, number>,
  metricKey: string,
  horizon: number
): BlendResult {
  return {
    blendedPoints: points,
    weights,
    metricKey,
    horizon,
    fallback: false,
  };
}