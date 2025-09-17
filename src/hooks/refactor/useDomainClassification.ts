/**
 * Domain Classification Hook
 * Maps API domain data to classification features and applies classification logic
 */

import { useMemo } from 'react';
import type { DomainListItem } from '@/lib/api-client/models';
import type { DomainFeatures } from '@/lib/campaignMetrics/classification';

/**
 * Hook to transform API domain data to classification features
 */
export function useDomainClassification(domains: DomainListItem[]): DomainFeatures[] {
  return useMemo(() => {
    if (!domains || domains.length === 0) {
      return [];
    }

    return domains.map(domain => {
      const features = domain.features;
      const richness = features?.richness;
      
      // Extract classification features with safe defaults
      const domainFeatures: DomainFeatures = {
        richness: richness?.score ?? 0,
        gain: richness?.prominence_norm ?? 0, // Using prominence as gain proxy for now
        repetitionIndex: richness?.repetition_index ?? 0,
        anchorShare: richness?.anchor_share ?? 0,
        leadStatus: domain.leadStatus,
      };

      return domainFeatures;
    });
  }, [domains]);
}