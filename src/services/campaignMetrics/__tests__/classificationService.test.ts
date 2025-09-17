/**
 * Tests for Classification Service (Phase 2)
 */

import {
  classifyDomains,
  classificationToUiBuckets,
  calculateWarningRate
} from '../classificationService';
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
    lead_score: 15,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    domain_name: 'example4.com',
    dns_status: 'timeout',
    http_status: 'timeout',
    lead_score: 75,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

describe('Classification Service', () => {
  describe('classifyDomains', () => {
    it('should return empty classification for no domains', () => {
      const result = classifyDomains([]);
      expect(result).toEqual({
        highQuality: { count: 0, percentage: 0 },
        mediumQuality: { count: 0, percentage: 0 },
        lowQuality: { count: 0, percentage: 0 }
      });
    });

    it('should classify domains by lead score correctly', () => {
      const result = classifyDomains(mockDomains);
      expect(result).toEqual({
        highQuality: { count: 2, percentage: 50 }, // scores 85, 75
        mediumQuality: { count: 1, percentage: 25 }, // score 45
        lowQuality: { count: 1, percentage: 25 } // score 15
      });
    });

    it('should handle edge cases for lead score boundaries', () => {
      const edgeCaseDomains: DomainMetricsInput[] = [
        { id: '1', domain_name: 'test1.com', dns_status: 'ok', http_status: 'ok', lead_score: 70, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }, // exactly high quality threshold
        { id: '2', domain_name: 'test2.com', dns_status: 'ok', http_status: 'ok', lead_score: 30, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }, // exactly medium quality threshold
        { id: '3', domain_name: 'test3.com', dns_status: 'ok', http_status: 'ok', lead_score: 29, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }, // just below medium quality
      ];

      const result = classifyDomains(edgeCaseDomains);
      expect(result).toEqual({
        highQuality: { count: 1, percentage: 33 },
        mediumQuality: { count: 1, percentage: 33 },
        lowQuality: { count: 1, percentage: 33 }
      });
    });
  });

  describe('classificationToUiBuckets', () => {
    it('should convert classification to UI format', () => {
      const classification = {
        highQuality: { count: 2, percentage: 50 },
        mediumQuality: { count: 1, percentage: 25 },
        lowQuality: { count: 1, percentage: 25 }
      };

      const result = classificationToUiBuckets(classification);
      expect(result).toEqual([
        {
          label: 'High Quality',
          count: 2,
          percentage: 50,
          color: '#10b981'
        },
        {
          label: 'Medium Quality',
          count: 1,
          percentage: 25,
          color: '#f59e0b'
        },
        {
          label: 'Low Quality',
          count: 1,
          percentage: 25,
          color: '#ef4444'
        }
      ]);
    });

    it('should filter out buckets with zero count', () => {
      const classification = {
        highQuality: { count: 3, percentage: 100 },
        mediumQuality: { count: 0, percentage: 0 },
        lowQuality: { count: 0, percentage: 0 }
      };

      const result = classificationToUiBuckets(classification);
      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('High Quality');
    });
  });

  describe('calculateWarningRate', () => {
    it('should return 0 for empty domains', () => {
      const result = calculateWarningRate([]);
      expect(result).toBe(0);
    });

    it('should calculate warning rate correctly', () => {
      const result = calculateWarningRate(mockDomains);
      // 3 domains have error/timeout status out of 4 total = 75%
      expect(result).toBe(75);
    });

    it('should handle domains with all ok status', () => {
      const okDomains = mockDomains.map(d => ({
        ...d,
        dns_status: 'ok' as const,
        http_status: 'ok' as const
      }));

      const result = calculateWarningRate(okDomains);
      expect(result).toBe(0);
    });
  });
});