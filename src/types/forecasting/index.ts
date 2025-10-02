/**
 * Centralized forecasting types for model alignment
 * Phase 2: Model Alignment & Generic Cleanup
 */

/**
 * Standardized forecast point structure
 */
export interface ForecastPoint {
  timestamp: string;
  value: number;
  lower: number;
  upper: number;
  confidence?: number;
  /** Optional metric key when points are tied to a specific aggregate */
  metricKey?: string;
}

/**
 * Model performance score structure
 */
export interface ModelScore {
  model: string;
  mae: number;
  mape: number;
  confidence: number;
}

/**
 * Standardized blend result structure
 */
export interface BlendResult {
  blendedPoints: ForecastPoint[];
  weights: Record<string, number>;
  metricKey: string;
  horizon: number;
  fallback?: boolean;
  qualityScore?: number;
}

/**
 * Quality metrics for forecast validation
 */
export interface QualityMetrics {
  mae: number;
  mape: number;
  residualVariance: number;
}

/**
 * Model information metadata
 */
export interface ModelInfo {
  selectedModel: string;
  arbitrationScores?: ModelScore;
  alternativeModels?: Array<{
    name: string;
    mae: number;
    mape: number;
  }>;
}

/**
 * Normalized forecast result with guaranteed shape
 */
export interface NormalizedForecastResult {
  horizon: number;
  generatedAt: string;
  method: 'server' | 'client' | 'insufficient-data' | 'skipped' | 'client-worker';
  points: ForecastPoint[];
  timingMs: number;
  error?: string;
  modelInfo: ModelInfo;
  qualityMetrics: QualityMetrics;
}

// Re-export normalizer + factory utilities so consumers can import from '@/types/forecasting'
export * from './normalizers';