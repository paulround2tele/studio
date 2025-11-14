/**
 * Movers Service (Phase 3)
 * Extracts top gainers and decliners from domain-level changes
 */

import { Mover, DomainMetricsInput } from '@/types/campaignMetrics';

// Minimum baseline for including a domain in movers analysis
const MIN_BASELINE_RICHNESS = 1;
const MIN_BASELINE_GAIN = 0.1;

/**
 * Generate movers analysis from current and previous domain sets
 * Returns top N gainers and decliners by magnitude of change
 */
export function extractMovers(
  currentDomains: DomainMetricsInput[],
  previousDomains: DomainMetricsInput[],
  maxMovers = 5
): Mover[] {
  const movers: Mover[] = [];
  
  // Create lookup map for previous domain metrics
  const previousMap = new Map<string, DomainMetricsInput>();
  previousDomains.forEach(domain => {
    previousMap.set(domain.domain_name, domain);
  });

  // Calculate changes for each current domain
  for (const currentDomain of currentDomains) {
    const previousDomain = previousMap.get(currentDomain.domain_name);
    
    if (!previousDomain) {
      continue; // Skip new domains
    }

    // Calculate richness movers (using lead_score as proxy)
    const richnessMover = calculateRichnessMover(currentDomain, previousDomain);
    if (richnessMover) {
      movers.push(richnessMover);
    }

    // Calculate gain movers (synthetic metric for demo)
    const gainMover = calculateGainMover(currentDomain, previousDomain);
    if (gainMover) {
      movers.push(gainMover);
    }
  }

  // Sort by absolute delta magnitude and take top N
  return movers
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, maxMovers * 2) // Allow for both richness and gain movers
    .filter(mover => Math.abs(mover.delta) > getMinimumThreshold(mover.metric));
}

/**
 * Calculate richness change for a domain
 * Uses lead_score as the richness metric
 */
function calculateRichnessMover(
  current: DomainMetricsInput,
  previous: DomainMetricsInput
): Mover | null {
  const currentRichness = current.lead_score;
  const previousRichness = previous.lead_score;
  
  // Skip if previous value is below minimum baseline
  if (previousRichness < MIN_BASELINE_RICHNESS) {
    return null;
  }

  const delta = currentRichness - previousRichness;
  
  // Skip insignificant changes
  if (Math.abs(delta) < 1) {
    return null;
  }

  return {
    domain: current.domain_name,
    metric: 'richness',
    from: previousRichness,
    to: currentRichness,
    delta,
    direction: delta > 0 ? 'up' : 'down'
  };
}

/**
 * Calculate gain change for a domain
 * Synthetic metric based on combination of factors
 */
function calculateGainMover(
  current: DomainMetricsInput,
  previous: DomainMetricsInput
): Mover | null {
  // Create synthetic gain metric (combination of lead score and status success)
  const currentGain = calculateSyntheticGain(current);
  const previousGain = calculateSyntheticGain(previous);
  
  // Skip if previous value is below minimum baseline
  if (previousGain < MIN_BASELINE_GAIN) {
    return null;
  }

  const delta = currentGain - previousGain;
  
  // Skip insignificant changes
  if (Math.abs(delta) < 0.1) {
    return null;
  }

  return {
    domain: current.domain_name,
    metric: 'gain',
    from: previousGain,
    to: currentGain,
    delta,
    direction: delta > 0 ? 'up' : 'down'
  };
}

/**
 * Calculate synthetic gain metric for a domain
 * Combines lead score with status success indicators
 */
function calculateSyntheticGain(domain: DomainMetricsInput): number {
  let gain = domain.lead_score * 0.01; // Scale down lead score
  
  // Add bonus for successful statuses
  if (domain.dns_status === 'ok') {
    gain += 0.2;
  }
  if (domain.http_status === 'ok') {
    gain += 0.3;
  }
  
  // Add some random variation for demo purposes
  gain += (Math.random() - 0.5) * 0.1;
  
  return Math.max(0, gain);
}

/**
 * Get minimum threshold for including a mover
 */
function getMinimumThreshold(metric: 'richness' | 'gain'): number {
  switch (metric) {
    case 'richness':
      return 2; // Minimum lead score change of 2 points
    case 'gain':
      return 0.15; // Minimum gain change of 0.15
    default:
      return 0.1;
  }
}

/**
 * Group movers by direction for UI display
 */
export function groupMoversByDirection(movers: Mover[]): {
  gainers: Mover[];
  decliners: Mover[];
} {
  const gainers = movers.filter(mover => mover.direction === 'up');
  const decliners = movers.filter(mover => mover.direction === 'down');
  
  return { gainers, decliners };
}

/**
 * Format mover value for display
 */
export function formatMoverValue(mover: Mover): string {
  const { metric, from, to, delta } = mover;
  
  switch (metric) {
    case 'richness':
      return `${from.toFixed(0)} → ${to.toFixed(0)} (${delta > 0 ? '+' : ''}${delta.toFixed(0)})`;
    case 'gain':
      return `${from.toFixed(2)} → ${to.toFixed(2)} (${delta > 0 ? '+' : ''}${delta.toFixed(2)})`;
    default:
      return `${from} → ${to}`;
  }
}

/**
 * Get mover display color based on direction and metric
 */
export function getMoverColor(mover: Mover): string {
  switch (mover.direction) {
    case 'up':
      return '#10b981'; // green
    case 'down':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Create synthetic movers for demo when no previous data exists
 */
export function createSyntheticMovers(domains: DomainMetricsInput[]): Mover[] {
  if (domains.length === 0) {
    return [];
  }

  const movers: Mover[] = [];
  
  // Create a few synthetic movers based on top-scoring domains
  const topDomains = domains
    .sort((a, b) => b.lead_score - a.lead_score)
    .slice(0, 3);

  topDomains.forEach((domain) => {
    // Create richness mover
    const richnessChange = (Math.random() - 0.3) * 20; // Bias toward positive
    movers.push({
      domain: domain.domain_name,
      metric: 'richness',
      from: domain.lead_score - richnessChange,
      to: domain.lead_score,
      delta: richnessChange,
      direction: richnessChange > 0 ? 'up' : 'down'
    });

    // Create gain mover
    const gainChange = (Math.random() - 0.4) * 0.5; // Bias toward positive
    const currentGain = calculateSyntheticGain(domain);
    movers.push({
      domain: domain.domain_name,
      metric: 'gain',
      from: currentGain - gainChange,
      to: currentGain,
      delta: gainChange,
      direction: gainChange > 0 ? 'up' : 'down'
    });
  });

  return movers.filter(mover => Math.abs(mover.delta) > getMinimumThreshold(mover.metric));
}