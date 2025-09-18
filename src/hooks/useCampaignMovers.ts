/**
 * Campaign Movers Hook (Phase 3)
 * Wraps moversService for React consumption
 */

import { useMemo } from 'react';
import { Mover, DomainMetricsInput } from '@/types/campaignMetrics';
import { 
  extractMovers, 
  groupMoversByDirection, 
  createSyntheticMovers 
} from '@/services/campaignMetrics/moversService';

// Feature flag check
const ENABLE_MOVERS_PANEL = process.env.NEXT_PUBLIC_ENABLE_MOVERS_PANEL !== 'false';

export interface UseCampaignMoversOptions {
  /**
   * Maximum number of movers to return
   * @default 5
   */
  maxMovers?: number;
  
  /**
   * Whether to create synthetic movers if no previous data
   * @default true
   */
  createSynthetic?: boolean;
}

export interface UseCampaignMoversReturn {
  /**
   * All movers (gainers and decliners)
   */
  movers: Mover[];
  
  /**
   * Movers grouped by direction
   */
  grouped: {
    gainers: Mover[];
    decliners: Mover[];
  };
  
  /**
   * Whether movers feature is enabled
   */
  isEnabled: boolean;
  
  /**
   * Whether we have actual previous data or synthetic
   */
  hasPreviousData: boolean;
  
  /**
   * Whether movers were artificially created
   */
  isSynthetic: boolean;
  
  /**
   * Whether there are any movers to display
   */
  hasMovers: boolean;
}

/**
 * Hook for calculating campaign domain movers
 */
export function useCampaignMovers(
  currentDomains: DomainMetricsInput[],
  previousDomains: DomainMetricsInput[],
  options: UseCampaignMoversOptions = {}
): UseCampaignMoversReturn {
  const {
    maxMovers = 5,
    createSynthetic = true
  } = options;

  return useMemo(() => {
    // Return empty state if movers are disabled
    if (!ENABLE_MOVERS_PANEL) {
      return {
        movers: [],
        grouped: { gainers: [], decliners: [] },
        isEnabled: false,
        hasPreviousData: false,
        isSynthetic: false,
        hasMovers: false
      };
    }

    let movers: Mover[] = [];
    let isSynthetic = false;
    let hasPreviousData = previousDomains.length > 0;

    if (currentDomains.length === 0) {
      // No current domains - return empty
      return {
        movers: [],
        grouped: { gainers: [], decliners: [] },
        isEnabled: true,
        hasPreviousData,
        isSynthetic: false,
        hasMovers: false
      };
    }

    if (hasPreviousData) {
      // Calculate real movers from previous vs current
      movers = extractMovers(currentDomains, previousDomains, maxMovers);
    } else if (createSynthetic) {
      // Create synthetic movers for demo/initial display
      movers = createSyntheticMovers(currentDomains);
      isSynthetic = true;
    }

    const grouped = groupMoversByDirection(movers);

    return {
      movers,
      grouped,
      isEnabled: true,
      hasPreviousData,
      isSynthetic,
      hasMovers: movers.length > 0
    };
  }, [currentDomains, previousDomains, maxMovers, createSynthetic]);
}

/**
 * Hook for filtering movers by metric type
 */
export function useMoversByMetric(
  movers: Mover[],
  metric: 'richness' | 'gain' | 'all' = 'all'
): Mover[] {
  return useMemo(() => {
    if (metric === 'all') {
      return movers;
    }
    return movers.filter(mover => mover.metric === metric);
  }, [movers, metric]);
}

/**
 * Hook for getting top N movers by direction
 */
export function useTopMovers(
  movers: Mover[],
  direction: 'up' | 'down' | 'all' = 'all',
  limit = 3
): Mover[] {
  return useMemo(() => {
    let filtered = movers;
    
    if (direction !== 'all') {
      filtered = movers.filter(mover => mover.direction === direction);
    }
    
    // Sort by absolute delta magnitude
    const sorted = filtered.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    
    return sorted.slice(0, limit);
  }, [movers, direction, limit]);
}

/**
 * Hook for movers summary statistics
 */
export function useMoversSummary(movers: Mover[]) {
  return useMemo(() => {
    if (movers.length === 0) {
      return {
        totalMovers: 0,
        gainersCount: 0,
        declinersCount: 0,
        topGainer: null,
        topDecliner: null,
        richnessMovers: 0,
        gainMovers: 0
      };
    }

    const gainers = movers.filter(m => m.direction === 'up');
    const decliners = movers.filter(m => m.direction === 'down');
    const richnessMovers = movers.filter(m => m.metric === 'richness');
    const gainMovers = movers.filter(m => m.metric === 'gain');

    const topGainer = gainers.reduce((max, mover) => 
      !max || Math.abs(mover.delta) > Math.abs(max.delta) ? mover : max, 
      null as Mover | null
    );

    const topDecliner = decliners.reduce((max, mover) => 
      !max || Math.abs(mover.delta) > Math.abs(max.delta) ? mover : max, 
      null as Mover | null
    );

    return {
      totalMovers: movers.length,
      gainersCount: gainers.length,
      declinersCount: decliners.length,
      topGainer,
      topDecliner,
      richnessMovers: richnessMovers.length,
      gainMovers: gainMovers.length
    };
  }, [movers]);
}

/**
 * Hook to check if movers panel should be visible
 */
export function useMoversVisibility(
  hasMovers: boolean,
  hasDeltas: boolean
): boolean {
  return useMemo(() => {
    return ENABLE_MOVERS_PANEL && hasDeltas && hasMovers;
  }, [hasMovers, hasDeltas]);
}