/**
 * Tests for Recommendation Service (Phase 2)
 */

import {
  generateRecommendations,
  generateAllClearRecommendation,
  getRecommendations
} from '../recommendationService';
import type { AggregateMetrics, ClassificationBuckets } from '@/types/campaignMetrics';

describe('Recommendation Service', () => {
  describe('generateRecommendations', () => {
    it('should generate low high-quality domain recommendation', () => {
      const input = {
        aggregates: {
          totalDomains: 150,
          successRate: 80,
          avgLeadScore: 45,
          dnsSuccessRate: 90,
          httpSuccessRate: 85
        } as AggregateMetrics,
        classification: {
          highQuality: { count: 2, percentage: 10 },
          mediumQuality: { count: 50, percentage: 33 },
          lowQuality: { count: 98, percentage: 65 }
        } as ClassificationBuckets,
        warningRate: 15,
        targetDomains: 100
      };

      const recommendations = generateRecommendations(input);
      const lowQualityRec = recommendations.find(r => r.id === 'low-high-quality');
      
      expect(lowQualityRec).toBeDefined();
      expect(lowQualityRec?.severity).toBe('action');
      expect(lowQualityRec?.title).toContain('Low High-Quality Domain Count');
    });

    it('should generate high warning rate recommendation', () => {
      const input = {
        aggregates: {
          totalDomains: 100,
          successRate: 50,
          avgLeadScore: 45,
          dnsSuccessRate: 60,
          httpSuccessRate: 70
        } as AggregateMetrics,
        classification: {
          highQuality: { count: 30, percentage: 30 },
          mediumQuality: { count: 40, percentage: 40 },
          lowQuality: { count: 30, percentage: 30 }
        } as ClassificationBuckets,
        warningRate: 35, // Above 25% threshold
        targetDomains: 100
      };

      const recommendations = generateRecommendations(input);
      const warningRec = recommendations.find(r => r.id === 'high-warning-rate');
      
      expect(warningRec).toBeDefined();
      expect(warningRec?.severity).toBe('warn');
      expect(warningRec?.title).toContain('High Warning Rate');
    });

    it('should generate no leads recommendation', () => {
      const input = {
        aggregates: {
          totalDomains: 100,
          successRate: 80,
          avgLeadScore: 0, // No leads
          dnsSuccessRate: 90,
          httpSuccessRate: 85
        } as AggregateMetrics,
        classification: {
          highQuality: { count: 0, percentage: 0 },
          mediumQuality: { count: 20, percentage: 20 },
          lowQuality: { count: 80, percentage: 80 }
        } as ClassificationBuckets,
        warningRate: 10,
        targetDomains: 100
      };

      const recommendations = generateRecommendations(input);
      const noLeadsRec = recommendations.find(r => r.id === 'no-leads-generated');
      
      expect(noLeadsRec).toBeDefined();
      expect(noLeadsRec?.severity).toBe('action');
      expect(noLeadsRec?.title).toContain('No Leads Generated');
    });

    it('should generate low DNS success recommendation', () => {
      const input = {
        aggregates: {
          totalDomains: 50,
          successRate: 40,
          avgLeadScore: 45,
          dnsSuccessRate: 60, // Below 70% threshold
          httpSuccessRate: 80
        } as AggregateMetrics,
        classification: {
          highQuality: { count: 10, percentage: 20 },
          mediumQuality: { count: 20, percentage: 40 },
          lowQuality: { count: 20, percentage: 40 }
        } as ClassificationBuckets,
        warningRate: 20,
        targetDomains: 100
      };

      const recommendations = generateRecommendations(input);
      const dnsRec = recommendations.find(r => r.id === 'low-dns-success');
      
      expect(dnsRec).toBeDefined();
      expect(dnsRec?.severity).toBe('warn');
      expect(dnsRec?.title).toContain('Low DNS Resolution Success');
    });

    it('should generate good performance recommendation', () => {
      const input = {
        aggregates: {
          totalDomains: 100,
          successRate: 90,
          avgLeadScore: 75,
          dnsSuccessRate: 95,
          httpSuccessRate: 90
        } as AggregateMetrics,
        classification: {
          highQuality: { count: 45, percentage: 45 }, // Above 40%
          mediumQuality: { count: 35, percentage: 35 },
          lowQuality: { count: 20, percentage: 20 }
        } as ClassificationBuckets,
        warningRate: 5, // Below 10%
        targetDomains: 100
      };

      const recommendations = generateRecommendations(input);
      const goodPerfRec = recommendations.find(r => r.id === 'good-performance');
      
      expect(goodPerfRec).toBeDefined();
      expect(goodPerfRec?.severity).toBe('info');
      expect(goodPerfRec?.title).toContain('Excellent Campaign Performance');
    });

    it('should return empty array when no rules triggered', () => {
      const input = {
        aggregates: {
          totalDomains: 50,
          successRate: 80,
          avgLeadScore: 45,
          dnsSuccessRate: 80,
          httpSuccessRate: 80
        } as AggregateMetrics,
        classification: {
          highQuality: { count: 15, percentage: 30 },
          mediumQuality: { count: 20, percentage: 40 },
          lowQuality: { count: 15, percentage: 30 }
        } as ClassificationBuckets,
        warningRate: 15,
        targetDomains: 100
      };

      const recommendations = generateRecommendations(input);
      expect(recommendations).toHaveLength(0);
    });
  });

  describe('generateAllClearRecommendation', () => {
    it('should generate all clear recommendation', () => {
      const recommendation = generateAllClearRecommendation();
      
      expect(recommendation).toEqual({
        id: 'all-clear',
        severity: 'info',
        title: 'All Systems Operational',
        detail: 'Your campaign metrics look good. No immediate action required.',
        rationale: 'All performance indicators are within acceptable ranges.'
      });
    });
  });

  describe('getRecommendations', () => {
    it('should return specific recommendations when available', () => {
      const input = {
        aggregates: {
          totalDomains: 150,
          successRate: 80,
          avgLeadScore: 45,
          dnsSuccessRate: 90,
          httpSuccessRate: 85
        } as AggregateMetrics,
        classification: {
          highQuality: { count: 2, percentage: 10 },
          mediumQuality: { count: 50, percentage: 33 },
          lowQuality: { count: 98, percentage: 65 }
        } as ClassificationBuckets,
        warningRate: 15,
        targetDomains: 100
      };

      const recommendations = getRecommendations(input);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.find(r => r.id === 'all-clear')).toBeUndefined();
    });

    it('should return all clear when no specific recommendations', () => {
      const input = {
        aggregates: {
          totalDomains: 50,
          successRate: 80,
          avgLeadScore: 45,
          dnsSuccessRate: 80,
          httpSuccessRate: 80
        } as AggregateMetrics,
        classification: {
          highQuality: { count: 15, percentage: 30 },
          mediumQuality: { count: 20, percentage: 40 },
          lowQuality: { count: 15, percentage: 30 }
        } as ClassificationBuckets,
        warningRate: 15,
        targetDomains: 100
      };

      const recommendations = getRecommendations(input);
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]?.id).toBe('all-clear');
    });
  });
});