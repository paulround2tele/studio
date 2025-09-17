/**
 * Domain Classification Logic
 * Classifies domains into buckets based on richness and gain values
 */

import {
  RICHNESS_HIGH,
  GAIN_HIGH,
  RICHNESS_EMERGING_MIN,
  RICHNESS_AT_RISK_MIN,
  RICHNESS_LOW_VALUE_MAX,
  GAIN_LOW_VALUE_MAX,
  REPETITION_INDEX_WARN,
  ANCHOR_SHARE_WARN
} from './thresholds';

export type DomainBucket = 
  | 'high_potential'
  | 'emerging' 
  | 'at_risk'
  | 'lead_candidate'
  | 'low_value'
  | 'other';

export interface DomainFeatures {
  richness?: number;
  gain?: number;
  repetitionIndex?: number;
  anchorShare?: number;
  leadStatus?: string;
}

export interface ClassificationCounts {
  high_potential: number;
  emerging: number;
  at_risk: number;
  lead_candidate: number;
  low_value: number;
  other: number;
}

/**
 * Classify a domain into a bucket based on its features
 */
export function classifyDomain(domain: DomainFeatures): DomainBucket {
  const richness = domain.richness ?? 0;
  const gain = domain.gain ?? 0;
  const leadStatus = domain.leadStatus;

  // Lead candidate (highest priority)
  if (leadStatus === 'match') {
    return 'lead_candidate';
  }

  // High potential
  if (richness >= RICHNESS_HIGH && gain >= GAIN_HIGH) {
    return 'high_potential';
  }

  // Low value
  if (richness <= RICHNESS_LOW_VALUE_MAX || gain <= GAIN_LOW_VALUE_MAX) {
    return 'low_value';
  }

  // Emerging (good richness, developing gain)
  if (richness >= RICHNESS_EMERGING_MIN) {
    return 'emerging';
  }

  // At risk (moderate richness but low performance)
  if (richness >= RICHNESS_AT_RISK_MIN) {
    return 'at_risk';
  }

  // Default bucket
  return 'other';
}

/**
 * Check if domain has warnings based on repetition index or anchor share
 */
export function hasWarnings(domain: DomainFeatures): boolean {
  const repetitionIndex = domain.repetitionIndex ?? 0;
  const anchorShare = domain.anchorShare ?? 0;

  return (
    repetitionIndex >= REPETITION_INDEX_WARN ||
    anchorShare >= ANCHOR_SHARE_WARN
  );
}