/**
 * Movers Service Tests (Phase 3)
 */

import { 
  extractMovers, 
  groupMoversByDirection, 
  formatMoverValue, 
  getMoverColor,
  createSyntheticMovers 
} from '../moversService';
import { DomainMetricsInput, Mover } from '@/types/campaignMetrics';

// Mock domain data for testing
const mockCurrentDomains: DomainMetricsInput[] = [
  {
    id: '1',
    domain_name: 'example1.com',
    dns_status: 'ok',
    http_status: 'ok',
    lead_score: 85,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '2',
    domain_name: 'example2.com',
    dns_status: 'ok',
    http_status: 'ok',
    lead_score: 40,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    domain_name: 'example3.com',
    dns_status: 'error',
    http_status: 'ok',
    lead_score: 75,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

const mockPreviousDomains: DomainMetricsInput[] = [
  {
    id: '1',
    domain_name: 'example1.com',
    dns_status: 'ok',
    http_status: 'ok',
    lead_score: 70, // Increased by 15
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  },
  {
    id: '2',
    domain_name: 'example2.com',
    dns_status: 'ok',
    http_status: 'ok',
    lead_score: 55, // Decreased by 15
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  },
  {
    id: '3',
    domain_name: 'example3.com',
    dns_status: 'ok',
    http_status: 'error',
    lead_score: 74, // Slight increase
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  }
];

describe('moversService', () => {
  describe('extractMovers', () => {
    it('should extract movers correctly', () => {
      const movers = extractMovers(mockCurrentDomains, mockPreviousDomains, 10);
      
      // Should have movers for richness changes
      expect(movers.length).toBeGreaterThan(0);
      
      // Check example1.com (richness gainer)
      const example1Richness = movers.find(m => 
        m.domain === 'example1.com' && m.metric === 'richness'
      );
      expect(example1Richness).toEqual({
        domain: 'example1.com',
        metric: 'richness',
        from: 70,
        to: 85,
        delta: 15,
        direction: 'up'
      });
      
      // Check example2.com (richness decliner)
      const example2Richness = movers.find(m => 
        m.domain === 'example2.com' && m.metric === 'richness'
      );
      expect(example2Richness).toEqual({
        domain: 'example2.com',
        metric: 'richness',
        from: 55,
        to: 40,
        delta: -15,
        direction: 'down'
      });
    });

    it('should respect minimum thresholds', () => {
      // Create domains with small changes
      const smallChangeDomains = [
        { ...mockCurrentDomains[0]!, lead_score: 71 } as DomainMetricsInput
      ];
      const previousSmallChange = [
        { ...mockPreviousDomains[0]!, lead_score: 70 } as DomainMetricsInput
      ];
      
      const movers = extractMovers(smallChangeDomains, previousSmallChange, 10);
      
      // Small change (1 point) should be filtered out
      expect(movers.length).toBe(0);
    });

    it('should skip domains below minimum baseline', () => {
      // Create domains with low baseline scores
      const lowBaselineDomains = [
        { ...mockCurrentDomains[0]!, lead_score: 5 } as DomainMetricsInput
      ];
      const previousLowBaseline = [
        { ...mockPreviousDomains[0]!, lead_score: 0.5 } as DomainMetricsInput
      ];
      
      const movers = extractMovers(lowBaselineDomains, previousLowBaseline, 10);
      
      // Should skip domains with previous score below baseline
      expect(movers.length).toBe(0);
    });

    it('should sort by absolute delta magnitude', () => {
      const movers = extractMovers(mockCurrentDomains, mockPreviousDomains, 10);
      
      // Movers should be sorted by absolute delta (largest first)
      for (let i = 1; i < movers.length; i++) {
        const prevMover = movers[i-1];
        const currentMover = movers[i];
        if (prevMover && currentMover) {
          expect(Math.abs(prevMover.delta)).toBeGreaterThanOrEqual(
            Math.abs(currentMover.delta)
          );
        }
      }
    });

    it('should handle missing previous domains', () => {
      const movers = extractMovers(mockCurrentDomains, [], 10);
      
      // Should return empty when no previous data
      expect(movers).toEqual([]);
    });

    it('should limit results to maxMovers', () => {
      const movers = extractMovers(mockCurrentDomains, mockPreviousDomains, 1);
      
      // Should respect the limit (though may be less due to filtering)
      expect(movers.length).toBeLessThanOrEqual(1);
    });
  });

  describe('groupMoversByDirection', () => {
    it('should group movers correctly', () => {
      const movers: Mover[] = [
        {
          domain: 'gainer1.com',
          metric: 'richness',
          from: 50,
          to: 70,
          delta: 20,
          direction: 'up'
        },
        {
          domain: 'gainer2.com',
          metric: 'gain',
          from: 0.3,
          to: 0.5,
          delta: 0.2,
          direction: 'up'
        },
        {
          domain: 'decliner1.com',
          metric: 'richness',
          from: 80,
          to: 60,
          delta: -20,
          direction: 'down'
        }
      ];

      const grouped = groupMoversByDirection(movers);
      
      expect(grouped.gainers).toHaveLength(2);
      expect(grouped.decliners).toHaveLength(1);
      expect(grouped.gainers[0]?.domain).toBe('gainer1.com');
      expect(grouped.decliners[0]?.domain).toBe('decliner1.com');
    });

    it('should handle empty movers array', () => {
      const grouped = groupMoversByDirection([]);
      
      expect(grouped.gainers).toEqual([]);
      expect(grouped.decliners).toEqual([]);
    });
  });

  describe('formatMoverValue', () => {
    it('should format richness values correctly', () => {
      const mover: Mover = {
        domain: 'example.com',
        metric: 'richness',
        from: 70.5,
        to: 85.2,
        delta: 14.7,
        direction: 'up'
      };
      
      expect(formatMoverValue(mover)).toBe('71 → 85 (+15)');
    });

    it('should format gain values correctly', () => {
      const mover: Mover = {
        domain: 'example.com',
        metric: 'gain',
        from: 0.35,
        to: 0.52,
        delta: 0.17,
        direction: 'up'
      };
      
      expect(formatMoverValue(mover)).toBe('0.35 → 0.52 (+0.17)');
    });

    it('should handle negative deltas', () => {
      const mover: Mover = {
        domain: 'example.com',
        metric: 'richness',
        from: 80,
        to: 65,
        delta: -15,
        direction: 'down'
      };
      
      expect(formatMoverValue(mover)).toBe('80 → 65 (-15)');
    });
  });

  describe('getMoverColor', () => {
    it('should return correct colors for directions', () => {
      const upMover: Mover = {
        domain: 'test.com',
        metric: 'richness',
        from: 50,
        to: 70,
        delta: 20,
        direction: 'up'
      };
      
      const downMover: Mover = {
        domain: 'test.com',
        metric: 'richness',
        from: 70,
        to: 50,
        delta: -20,
        direction: 'down'
      };
      
      expect(getMoverColor(upMover)).toBe('#10b981'); // green
      expect(getMoverColor(downMover)).toBe('#ef4444'); // red
    });
  });

  describe('createSyntheticMovers', () => {
    it('should create synthetic movers', () => {
      const syntheticMovers = createSyntheticMovers(mockCurrentDomains);
      
      expect(syntheticMovers.length).toBeGreaterThan(0);
      
      // All movers should have valid properties
      syntheticMovers.forEach(mover => {
        expect(mover.domain).toBeTruthy();
        expect(['richness', 'gain']).toContain(mover.metric);
        expect(['up', 'down']).toContain(mover.direction);
        expect(typeof mover.from).toBe('number');
        expect(typeof mover.to).toBe('number');
        expect(typeof mover.delta).toBe('number');
      });
    });

    it('should return empty array for no domains', () => {
      const syntheticMovers = createSyntheticMovers([]);
      
      expect(syntheticMovers).toEqual([]);
    });

    it('should filter by minimum thresholds', () => {
      const syntheticMovers = createSyntheticMovers(mockCurrentDomains);
      
      // All returned movers should meet minimum thresholds
      syntheticMovers.forEach(mover => {
        if (mover.metric === 'richness') {
          expect(Math.abs(mover.delta)).toBeGreaterThanOrEqual(2);
        } else if (mover.metric === 'gain') {
          expect(Math.abs(mover.delta)).toBeGreaterThanOrEqual(0.15);
        }
      });
    });
  });
});