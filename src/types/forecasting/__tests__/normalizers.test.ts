/**
 * Tests for forecasting normalizers
 * Phase 2: Model Alignment & Generic Cleanup
 */

import {
  normalizeForecastPoints,
  coerceModelScores,
  normalizeBlendResult,
  normalizeQualityMetrics,
  normalizeModelInfo,
  normalizeForecastResult,
  createForecastPoint,
  createBlendResult,
} from '../normalizers';

describe('Forecasting Normalizers', () => {
  describe('normalizeForecastPoints', () => {
    it('should handle empty input', () => {
      expect(normalizeForecastPoints([])).toEqual([]);
      expect(normalizeForecastPoints(null as unknown)).toEqual([]);
    });

    it('should normalize valid points', () => {
      const input = [
        { timestamp: '2024-01-01T00:00:00Z', value: 10, lower: 8, upper: 12 },
        { timestamp: '2024-01-02T00:00:00Z', value: 15, lower: 13, upper: 17 },
      ];

      const result = normalizeForecastPoints(input);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: '2024-01-01T00:00:00Z',
        value: 10,
        lower: 8,
        upper: 12,
        confidence: undefined,
      });
    });

    it('should handle missing lower/upper bounds', () => {
      const input = [{ timestamp: '2024-01-01T00:00:00Z', value: 10 }];
      const result = normalizeForecastPoints(input);
      
      expect(result[0].lower).toBe(10);
      expect(result[0].upper).toBe(10);
    });
  });

  describe('coerceModelScores', () => {
    it('should handle empty input', () => {
      const result = coerceModelScores({});
      expect(result).toEqual({
        model: 'unknown',
        mae: 0,
        mape: 0,
        confidence: 0.5,
      });
    });

    it('should coerce valid scores', () => {
      const input = { model: 'test-model', mae: 1.5, mape: 0.1, confidence: 0.8 };
      const result = coerceModelScores(input);
      
      expect(result).toEqual({
        model: 'test-model',
        mae: 1.5,
        mape: 0.1,
        confidence: 0.8,
      });
    });
  });

  describe('normalizeQualityMetrics', () => {
    it('should ensure required fields are present', () => {
      const result = normalizeQualityMetrics({});
      expect(result).toEqual({
        mae: 0,
        mape: 0,
        residualVariance: 0,
      });
    });

    it('should preserve existing values', () => {
      const input = { mae: 2.5, mape: 0.15, residualVariance: 1.2 };
      const result = normalizeQualityMetrics(input);
      expect(result).toEqual(input);
    });
  });

  describe('normalizeForecastResult', () => {
    it('should create fully normalized result', () => {
      const input = {
        horizon: 7,
        points: [{ timestamp: '2024-01-01T00:00:00Z', value: 10 }],
        method: 'client',
      };

      const result = normalizeForecastResult(input);
      
      expect(result.horizon).toBe(7);
      expect(result.method).toBe('client');
      expect(result.points).toHaveLength(1);
      expect(result.modelInfo).toBeDefined();
      expect(result.qualityMetrics).toBeDefined();
      expect(result.qualityMetrics.mae).toBe(0);
      expect(result.qualityMetrics.residualVariance).toBe(0);
    });
  });

  describe('factory functions', () => {
    it('should create forecast point with defaults', () => {
      const point = createForecastPoint('2024-01-01T00:00:00Z', 10);
      expect(point).toEqual({
        timestamp: '2024-01-01T00:00:00Z',
        value: 10,
        lower: 10,
        upper: 10,
        confidence: undefined,
      });
    });

    it('should create blend result', () => {
      const points = [createForecastPoint('2024-01-01T00:00:00Z', 10)];
      const weights = { model1: 0.6, model2: 0.4 };
      
      const result = createBlendResult(points, weights, 'avgLeadScore', 7);
      
      expect(result.blendedPoints).toEqual(points);
      expect(result.weights).toEqual(weights);
      expect(result.metricKey).toBe('avgLeadScore');
      expect(result.horizon).toBe(7);
      expect(result.fallback).toBe(false);
    });
  });
});