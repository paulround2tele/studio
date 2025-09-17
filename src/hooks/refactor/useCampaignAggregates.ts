/**
 * Campaign Aggregates Hook
 * Computes aggregated metrics and classification counts for a campaign
 */

import { useMemo } from 'react';
import { classifyDomain, hasWarnings, type DomainFeatures, type ClassificationCounts } from '@/lib/campaignMetrics/classification';

export interface CampaignAggregates {
  meanRichness: number;
  medianGain: number;
  totalDomains: number;
  leads: number;
  warningRate: number;
  classification: ClassificationCounts;
}

export interface CampaignAggregate {
  campaignId: string;
  aggregates: CampaignAggregates;
}

/**
 * Hook to compute campaign aggregates from domain data
 */
export function useCampaignAggregates(domains: DomainFeatures[]): CampaignAggregates {
  return useMemo(() => {
    if (!domains || domains.length === 0) {
      return {
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
      };
    }

    // Calculate mean richness
    const richnessValues = domains.map(d => d.richness ?? 0).filter(r => r > 0);
    const meanRichness = richnessValues.length > 0 
      ? richnessValues.reduce((sum, r) => sum + r, 0) / richnessValues.length 
      : 0;

    // Calculate median gain
    const gainValues = domains.map(d => d.gain ?? 0).filter(g => g > 0);
    const sortedGains = gainValues.sort((a, b) => a - b);
    const medianGain = sortedGains.length > 0
      ? sortedGains.length % 2 === 0
        ? ((sortedGains[Math.floor(sortedGains.length / 2) - 1] || 0) + (sortedGains[Math.floor(sortedGains.length / 2)] || 0)) / 2
        : (sortedGains[Math.floor(sortedGains.length / 2)] || 0)
      : 0;

    // Count leads
    const leads = domains.filter(d => d.leadStatus === 'match').length;

    // Calculate warning rate
    const domainsWithMetrics = domains.filter(d => 
      (d.richness !== undefined && d.richness > 0) || 
      (d.gain !== undefined && d.gain > 0)
    );
    const domainsWithWarnings = domainsWithMetrics.filter(hasWarnings);
    const warningRate = domainsWithMetrics.length > 0 
      ? domainsWithWarnings.length / domainsWithMetrics.length 
      : 0;

    // Classification counts
    const classification: ClassificationCounts = {
      high_potential: 0,
      emerging: 0,
      at_risk: 0,
      lead_candidate: 0,
      low_value: 0,
      other: 0,
    };

    domains.forEach(domain => {
      const bucket = classifyDomain(domain);
      classification[bucket]++;
    });

    return {
      meanRichness,
      medianGain,
      totalDomains: domains.length,
      leads,
      warningRate,
      classification,
    };
  }, [domains]);
}