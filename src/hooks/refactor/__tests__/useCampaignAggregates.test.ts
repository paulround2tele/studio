/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { useCampaignAggregates } from '../useCampaignAggregates';
import type { DomainFeatures } from '@/lib/campaignMetrics/classification';

describe('useCampaignAggregates', () => {
  it('calculates aggregates for empty domain list', () => {
    const { result } = renderHook(() => useCampaignAggregates([]));
    
    expect(result.current).toEqual({
      meanRichness: 0,
      medianGain: 0,
      totalDomains: 0,
      leads: 0,
      warningRate: 0,
      classification: {
        high_potential: 0,
        emerging: 0,
        at_risk: 0,
        lead_candidate: 0,
        low_value: 0,
        other: 0,
      },
    });
  });

  it('calculates aggregates for sample domains', () => {
    const domains: DomainFeatures[] = [
      { richness: 0.8, gain: 0.3, leadStatus: 'match' }, // lead_candidate
      { richness: 0.6, gain: 0.2 }, // emerging 
      { richness: 0.4, gain: 0.15 }, // other
      { richness: 0.2, gain: 0.05 }, // low_value
    ];

    const { result } = renderHook(() => useCampaignAggregates(domains));
    
    expect(result.current.totalDomains).toBe(4);
    expect(result.current.leads).toBe(1);
    expect(result.current.meanRichness).toBeCloseTo(0.5, 2); // (0.8 + 0.6 + 0.4 + 0.2) / 4
    expect(result.current.classification.lead_candidate).toBe(1);
    expect(result.current.classification.low_value).toBe(1);
    expect(result.current.classification.emerging).toBe(1);
    expect(result.current.classification.other).toBe(1);
  });

  it('handles domains with missing features gracefully', () => {
    const domains: DomainFeatures[] = [
      { richness: undefined, gain: undefined },
      { richness: 0.5 },
      { gain: 0.2 },
    ];

    const { result } = renderHook(() => useCampaignAggregates(domains));
    
    expect(result.current.totalDomains).toBe(3);
    expect(result.current.meanRichness).toBe(0.5); // Only counting non-zero richness values
    expect(result.current.medianGain).toBe(0.2); // Only counting non-zero gain values
  });
});