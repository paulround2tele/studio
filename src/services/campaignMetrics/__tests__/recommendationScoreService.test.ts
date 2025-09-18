/**
 * Recommendation Score Service Tests (Phase 4)
 */

import {
  scoreAndGroupRecommendations,
  getRecommendationsV2,
  explainScoring
} from '../recommendationScoreService';
import type { Recommendation, AggregateMetrics } from '@/types/campaignMetrics';

// Mock environment variable
const originalEnv = process.env.NEXT_PUBLIC_RECOMMENDATION_SCORING_V2;

describe('recommendationScoreService', () => {
  const mockAggregates: AggregateMetrics = {
    totalDomains: 1000,
    successRate: 85.5,
    avgLeadScore: 72.3,
    dnsSuccessRate: 95.2,
    httpSuccessRate: 89.8
  };

  const mockClassification = {
    highQuality: { count: 50, percentage: 5 },
    mediumQuality: { count: 300, percentage: 30 },
    lowQuality: { count: 650, percentage: 65 }
  };

  const createMockRecommendation = (
    id: string, 
    severity: 'info' | 'warn' | 'action' = 'warn'
  ): Recommendation => ({
    id,
    severity,
    title: `Test Recommendation ${id}`,
    detail: `Detail for ${id}`,
    rationale: `Rationale for ${id}`
  });

  beforeEach(() => {
    process.env.NEXT_PUBLIC_RECOMMENDATION_SCORING_V2 = 'true';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_RECOMMENDATION_SCORING_V2 = originalEnv;
  });

  describe('scoring and grouping', () => {
    it('should score recommendations correctly', () => {
      const recommendations = [
        createMockRecommendation('low-high-quality', 'action'),
        createMockRecommendation('high-warning-rate', 'warn'),
        createMockRecommendation('info-tip', 'info')
      ];

      const groups = scoreAndGroupRecommendations(recommendations, {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      expect(groups).toHaveLength(3);
      
      // Should be sorted by priority (action > warn > info)
      expect(groups[0].mergedRecommendation.severity).toBe('action');
      expect(groups[1].mergedRecommendation.severity).toBe('warn');
      expect(groups[2].mergedRecommendation.severity).toBe('info');
    });

    it('should group similar recommendations by canonical cause', () => {
      const recommendations = [
        createMockRecommendation('low-high-quality', 'action'),
        createMockRecommendation('charset-optimization', 'warn'),
        createMockRecommendation('length-optimization', 'warn')
      ];

      const groups = scoreAndGroupRecommendations(recommendations, {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      // charset-optimization and length-optimization should be grouped under 'generation-optimization'
      const optimizationGroup = groups.find(g => g.canonicalCause === 'generation-optimization');
      expect(optimizationGroup).toBeDefined();
      expect(optimizationGroup?.recommendations).toHaveLength(2);
    });

    it('should merge rationales for grouped recommendations', () => {
      const recommendations = [
        createMockRecommendation('charset-optimization', 'warn'),
        createMockRecommendation('length-optimization', 'info')
      ];

      const groups = scoreAndGroupRecommendations(recommendations, {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      const group = groups[0];
      expect(group.mergedRecommendation.rationale).toContain('Rationale for charset-optimization');
      expect(group.mergedRecommendation.rationale).toContain('Rationale for length-optimization');
    });

    it('should filter out low-priority recommendations', () => {
      const recommendations = [
        { ...createMockRecommendation('high-priority', 'action'), id: 'high-impact' },
        { ...createMockRecommendation('low-priority', 'info'), id: 'minor-tip' }
      ];

      const groups = scoreAndGroupRecommendations(recommendations, {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      // Should include high priority but potentially filter low priority based on threshold
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].totalPriority).toBeGreaterThan(0.08); // Above threshold
    });
  });

  describe('scoring calculation', () => {
    it('should calculate composite priority correctly', () => {
      const recommendation = createMockRecommendation('test', 'action');
      
      const groups = scoreAndGroupRecommendations([recommendation], {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      const scored = groups[0].mergedRecommendation;
      
      expect(scored.rawScore).toBeGreaterThan(0);
      expect(scored.severityWeight).toBe(1.0); // action severity
      expect(scored.recencyFactor).toBeGreaterThan(0);
      expect(scored.compositePriority).toBe(
        scored.severityWeight * scored.rawScore * scored.recencyFactor
      );
    });

    it('should weight severity correctly', () => {
      const actionRec = createMockRecommendation('test-action', 'action');
      const warnRec = createMockRecommendation('test-warn', 'warn');
      const infoRec = createMockRecommendation('test-info', 'info');

      const groups = scoreAndGroupRecommendations([actionRec, warnRec, infoRec], {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      const actionGroup = groups.find(g => g.mergedRecommendation.severity === 'action');
      const warnGroup = groups.find(g => g.mergedRecommendation.severity === 'warn');
      const infoGroup = groups.find(g => g.mergedRecommendation.severity === 'info');

      expect(actionGroup?.mergedRecommendation.severityWeight).toBe(1.0);
      expect(warnGroup?.mergedRecommendation.severityWeight).toBe(0.7);
      expect(infoGroup?.mergedRecommendation.severityWeight).toBe(0.4);
    });
  });

  describe('explain scoring', () => {
    it('should provide scoring breakdown', () => {
      const recommendation = createMockRecommendation('test', 'action');
      
      const groups = scoreAndGroupRecommendations([recommendation], {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      const scored = groups[0].mergedRecommendation;
      const explanation = explainScoring(scored);

      expect(explanation.breakdown).toEqual(expect.arrayContaining([
        expect.stringContaining('Raw Score:'),
        expect.stringContaining('Severity Weight:'),
        expect.stringContaining('Recency Factor:'),
        expect.stringContaining('Composite Priority:')
      ]));
      expect(explanation.finalScore).toBe(scored.compositePriority);
    });
  });

  describe('feature flag disabled', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_RECOMMENDATION_SCORING_V2 = 'false';
    });

    it('should use fallback grouping when disabled', () => {
      const recommendations = [
        createMockRecommendation('test-1', 'action'),
        createMockRecommendation('test-2', 'warn')
      ];

      const groups = scoreAndGroupRecommendations(recommendations, {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      // Should still work but use simpler logic
      expect(groups).toHaveLength(2);
      expect(groups[0].mergedRecommendation).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty recommendations array', () => {
      const groups = scoreAndGroupRecommendations([], {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      expect(groups).toHaveLength(0);
    });

    it('should handle single recommendation', () => {
      const recommendation = createMockRecommendation('single', 'warn');
      
      const groups = scoreAndGroupRecommendations([recommendation], {
        aggregates: mockAggregates,
        classification: mockClassification
      });

      expect(groups).toHaveLength(1);
      expect(groups[0].recommendations).toHaveLength(1);
      expect(groups[0].mergedRecommendation.id).toBe('single');
    });
  });
});