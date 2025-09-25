/**
 * Campaign Metrics Hook (Phase 2)
 * Composites classification + aggregates from services
 */

import { useMemo } from 'react';
import type { DomainMetricsInput } from '@/types/campaignMetrics';
import {
  classifyDomains,
  classificationToUiBuckets,
  calculateWarningRate,
  calculateAggregateMetrics,
  getRecommendations
} from '@/services/campaignMetrics';

export function useCampaignMetrics(domains: DomainMetricsInput[]) {
  return useMemo(() => {
    const aggregates = calculateAggregateMetrics(domains);
    const classification = classifyDomains(domains);
    const warningRate = calculateWarningRate(domains);
    const uiBuckets = classificationToUiBuckets(classification);
    
    const recommendations = getRecommendations({
      aggregates,
      classification,
      warningRate,
      targetDomains: 100 // Could be made configurable
    });

    return {
      aggregates,
      classification,
      warningRate,
      uiBuckets,
      recommendations
    };
  }, [domains]);
}