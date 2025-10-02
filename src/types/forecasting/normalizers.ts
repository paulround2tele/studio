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
export function normalizeForecastPoints(points: any[]): ForecastPoint[] {
  if (!Array.isArray(points)) {
    return [];
  }

  return points.map(point => ({
    timestamp: point.timestamp || new Date().toISOString(),
    value: Number(point.value) || 0,
    lower: Number(point.lower) || Number(point.value) || 0,
    upper: Number(point.upper) || Number(point.value) || 0,
    confidence: point.confidence ? Number(point.confidence) : undefined,
  }));
}

/**
 * Coerce model scores to standard format
 */
export function coerceModelScores(scores: any): ModelScore {
  return {
    model: String(scores?.model || 'unknown'),
    mae: Number(scores?.mae) || 0,
    mape: Number(scores?.mape) || 0,
    confidence: Number(scores?.confidence) || 0.5,
  };
}

/**
 * Normalize blend result structure
 */
export function normalizeBlendResult(result: any): BlendResult {
  return {
    blendedPoints: normalizeForecastPoints(result?.blendedPoints || []),
    weights: result?.weights || {},
    metricKey: String(result?.metricKey || 'unknown'),
    horizon: Number(result?.horizon) || 0,
    fallback: Boolean(result?.fallback),
    qualityScore: result?.qualityScore ? Number(result.qualityScore) : undefined,
  };
}

/**
 * Normalize quality metrics with required fields
 */
export function normalizeQualityMetrics(metrics: any): QualityMetrics {
  return {
    mae: Number(metrics?.mae) || 0,
    mape: Number(metrics?.mape) || 0,
    residualVariance: Number(metrics?.residualVariance) || 0,
  };
}

/**
 * Normalize model info structure
 */
export function normalizeModelInfo(info: any): ModelInfo {
  return {
    selectedModel: String(info?.selectedModel || 'unknown'),
    arbitrationScores: info?.arbitrationScores ? coerceModelScores(info.arbitrationScores) : undefined,
    alternativeModels: Array.isArray(info?.alternativeModels) 
      ? info.alternativeModels.map((model: any) => ({
          name: String(model?.name || 'unknown'),
          mae: Number(model?.mae) || 0,
          mape: Number(model?.mape) || 0,
        }))
      : [],
  };
}

/**
 * Main forecast result normalizer
 */
export function normalizeForecastResult(result: any): NormalizedForecastResult {
  return {
    horizon: Number(result?.horizon) || 0,
    generatedAt: result?.generatedAt || new Date().toISOString(),
    method: result?.method || 'client',
    points: normalizeForecastPoints(result?.points || []),
    timingMs: Number(result?.timingMs) || 0,
    error: result?.error ? String(result.error) : undefined,
    modelInfo: normalizeModelInfo(result?.modelInfo || {}),
    qualityMetrics: normalizeQualityMetrics(result?.qualityMetrics || {}),
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