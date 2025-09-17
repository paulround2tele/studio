/**
 * Tests for Aggregate Service (Phase 2)
 */

import {
  calculateAggregateMetrics,
  calculateMedian,
  calculateLeadScoreStats,
  calculateStatusDistribution
} from '../aggregateService';
import type { DomainMetricsInput } from '@/types/campaignMetrics';

// Test data
const mockDomains: DomainMetricsInput[] = [
  {
    id: '1',
    domain_name: 'example1.com',
    dns_status: 'ok',
    http_status: 'ok',
    lead_score: 85,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    domain_name: 'example2.com',
    dns_status: 'ok',
    http_status: 'error',
    lead_score: 45,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    domain_name: 'example3.com',
    dns_status: 'error',
    http_status: 'pending',
    lead_score: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    domain_name: 'example4.com',
    dns_status: 'pending',
    http_status: 'pending',
    lead_score: 75,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

describe('Aggregate Service', () => {
  describe('calculateAggregateMetrics', () => {
    it('should return zero metrics for empty domains', () => {
      const result = calculateAggregateMetrics([]);
      expect(result).toEqual({
        totalDomains: 0,
        successRate: 0,
        avgLeadScore: 0,
        dnsSuccessRate: 0,
        httpSuccessRate: 0
      });
    });

    it('should calculate aggregate metrics correctly', () => {
      const result = calculateAggregateMetrics(mockDomains);
      expect(result).toEqual({
        totalDomains: 4,
        successRate: 25, // 1 domain with both dns and http 'ok' out of 4 = 25%
        avgLeadScore: 51, // (85 + 45 + 0 + 75) / 4 = 51.25, rounded to 51
        dnsSuccessRate: 50, // 2 domains with dns 'ok' out of 4 = 50%
        httpSuccessRate: 25 // 1 domain with http 'ok' out of 4 = 25%
      });
    });

    it('should handle undefined lead scores', () => {
      const domainsWithUndefinedScores: DomainMetricsInput[] = [
        { id: '1', domain_name: 'test1.com', dns_status: 'ok', http_status: 'ok', lead_score: 100, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: '2', domain_name: 'test2.com', dns_status: 'ok', http_status: 'ok', lead_score: NaN, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: '3', domain_name: 'test3.com', dns_status: 'ok', http_status: 'ok', lead_score: 0, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: '4', domain_name: 'test4.com', dns_status: 'ok', http_status: 'ok', lead_score: 0, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
      ];

      const result = calculateAggregateMetrics(domainsWithUndefinedScores);
      expect(result.avgLeadScore).toBe(33); // (100 + 0 + 0) / 3 = 33.33, rounded to 33
    });
  });

  describe('calculateMedian', () => {
    it('should return 0 for empty array', () => {
      const result = calculateMedian([]);
      expect(result).toBe(0);
    });

    it('should calculate median for odd number of values', () => {
      const result = calculateMedian([1, 3, 5]);
      expect(result).toBe(3);
    });

    it('should calculate median for even number of values', () => {
      const result = calculateMedian([1, 2, 3, 4]);
      expect(result).toBe(3); // (2 + 3) / 2 = 2.5, rounded to 3
    });

    it('should handle single value', () => {
      const result = calculateMedian([42]);
      expect(result).toBe(42);
    });

    it('should sort values before calculating median', () => {
      const result = calculateMedian([5, 1, 3, 2, 4]);
      expect(result).toBe(3);
    });
  });

  describe('calculateLeadScoreStats', () => {
    it('should return zero stats for empty domains', () => {
      const result = calculateLeadScoreStats([]);
      expect(result).toEqual({
        average: 0,
        median: 0,
        min: 0,
        max: 0
      });
    });

    it('should calculate lead score statistics correctly', () => {
      const result = calculateLeadScoreStats(mockDomains);
      expect(result).toEqual({
        average: 51, // (85 + 45 + 0 + 75) / 4 = 51.25, rounded to 51
        median: 60, // [0, 45, 75, 85] -> (45 + 75) / 2 = 60
        min: 0,
        max: 85
      });
    });

    it('should filter out NaN scores', () => {
      const domainsWithNaN: DomainMetricsInput[] = [
        { id: '1', domain_name: 'test1.com', dns_status: 'ok', http_status: 'ok', lead_score: 100, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: '2', domain_name: 'test2.com', dns_status: 'ok', http_status: 'ok', lead_score: NaN, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: '3', domain_name: 'test3.com', dns_status: 'ok', http_status: 'ok', lead_score: 50, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
      ];

      const result = calculateLeadScoreStats(domainsWithNaN);
      expect(result).toEqual({
        average: 75, // (100 + 50) / 2 = 75
        median: 75, // [50, 100] -> (50 + 100) / 2 = 75
        min: 50,
        max: 100
      });
    });
  });

  describe('calculateStatusDistribution', () => {
    it('should return zero distribution for empty domains', () => {
      const result = calculateStatusDistribution([]);
      expect(result).toEqual({
        dns: { ok: 0, error: 0, pending: 0, timeout: 0 },
        http: { ok: 0, error: 0, pending: 0, timeout: 0 }
      });
    });

    it('should calculate status distribution correctly', () => {
      const result = calculateStatusDistribution(mockDomains);
      expect(result).toEqual({
        dns: { ok: 2, error: 1, pending: 1, timeout: 0 },
        http: { ok: 1, error: 1, pending: 2, timeout: 0 }
      });
    });

    it('should handle domains with all same status', () => {
      const sameStatusDomains = mockDomains.map(d => ({
        ...d,
        dns_status: 'ok' as const,
        http_status: 'error' as const
      }));

      const result = calculateStatusDistribution(sameStatusDomains);
      expect(result).toEqual({
        dns: { ok: 4, error: 0, pending: 0, timeout: 0 },
        http: { ok: 0, error: 4, pending: 0, timeout: 0 }
      });
    });
  });
});