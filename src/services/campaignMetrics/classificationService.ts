/**
 * Classification Service for Campaign Metrics (Phase 2)
 * Pure functions for domain classification logic
 */

import type { DomainMetricsInput, ClassificationBuckets } from '@/types/campaignMetrics';

/**
 * Classify domains into quality buckets based on lead score
 */
export function classifyDomains(domains: DomainMetricsInput[]): ClassificationBuckets {
  if (domains.length === 0) {
    return {
      highQuality: { count: 0, percentage: 0 },
      mediumQuality: { count: 0, percentage: 0 },
      lowQuality: { count: 0, percentage: 0 }
    };
  }

  const highQuality = domains.filter(d => d.lead_score >= 70).length;
  const mediumQuality = domains.filter(d => d.lead_score >= 30 && d.lead_score < 70).length;
  const lowQuality = domains.filter(d => d.lead_score < 30).length;
  const total = domains.length;

  return {
    highQuality: {
      count: highQuality,
      percentage: Math.round((highQuality / total) * 100)
    },
    mediumQuality: {
      count: mediumQuality,
      percentage: Math.round((mediumQuality / total) * 100)
    },
    lowQuality: {
      count: lowQuality,
      percentage: Math.round((lowQuality / total) * 100)
    }
  };
}

/**
 * Convert classification buckets to the UI format expected by existing components
 */
export function classificationToUiBuckets(classification: ClassificationBuckets) {
  return [
    {
      label: 'High Quality',
      count: classification.highQuality.count,
      percentage: classification.highQuality.percentage,
      color: '#10b981'
    },
    {
      label: 'Medium Quality',
      count: classification.mediumQuality.count,
      percentage: classification.mediumQuality.percentage,
      color: '#f59e0b'
    },
    {
      label: 'Low Quality',
      count: classification.lowQuality.count,
      percentage: classification.lowQuality.percentage,
      color: '#ef4444'
    }
  ].filter(bucket => bucket.count > 0);
}

/**
 * Get warning rate based on status failures
 */
export function calculateWarningRate(domains: DomainMetricsInput[]): number {
  if (domains.length === 0) return 0;
  
  const warningDomains = domains.filter(d => 
    d.dns_status === 'error' || 
    d.http_status === 'error' || 
    d.dns_status === 'timeout' || 
    d.http_status === 'timeout'
  ).length;
  
  return Math.round((warningDomains / domains.length) * 100);
}