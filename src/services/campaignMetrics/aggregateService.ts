/**
 * Aggregate Service for Campaign Metrics (Phase 2)
 * Pure functions for aggregate metric calculations
 */

import type { DomainMetricsInput, AggregateMetrics } from '@/types/campaignMetrics';

/**
 * Calculate aggregate metrics from domain data
 */
export function calculateAggregateMetrics(domains: DomainMetricsInput[]): AggregateMetrics {
  if (domains.length === 0) {
    return {
      totalDomains: 0,
      successRate: 0,
      avgLeadScore: 0,
      dnsSuccessRate: 0,
      httpSuccessRate: 0
    };
  }

  const totalDomains = domains.length;
  const dnsSuccessful = domains.filter(d => d.dns_status === 'ok').length;
  const httpSuccessful = domains.filter(d => d.http_status === 'ok').length;
  const overallSuccessful = domains.filter(d => d.dns_status === 'ok' && d.http_status === 'ok').length;
  
  // Calculate average lead score, handling undefined/null values  
  const allScores = domains.map(d => d.lead_score);
  const validScores = allScores.filter(score => score !== null && score !== undefined && !isNaN(score));
  const avgLeadScore = validScores.length > 0 
    ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
    : 0;

  return {
    totalDomains,
    successRate: Math.round((overallSuccessful / totalDomains) * 100),
    avgLeadScore,
    dnsSuccessRate: Math.round((dnsSuccessful / totalDomains) * 100),
    httpSuccessRate: Math.round((httpSuccessful / totalDomains) * 100)
  };
}

/**
 * Calculate median value from array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    const left = sorted[middle - 1];
    const right = sorted[middle];
    if (left !== undefined && right !== undefined) {
      return Math.round((left + right) / 2);
    }
    return 0;
  }
  
  const result = sorted[middle];
  return result !== undefined ? result : 0;
}

/**
 * Calculate lead score statistics
 */
export function calculateLeadScoreStats(domains: DomainMetricsInput[]) {
  const scores = domains.map(d => d.lead_score).filter(score => score !== null && score !== undefined && !isNaN(score));
  
  if (scores.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0
    };
  }

  const sum = scores.reduce((acc, score) => acc + score, 0);
  
  return {
    average: Math.round(sum / scores.length),
    median: calculateMedian(scores),
    min: Math.min(...scores),
    max: Math.max(...scores)
  };
}

/**
 * Calculate status distribution
 */
export function calculateStatusDistribution(domains: DomainMetricsInput[]) {
  const total = domains.length;
  
  if (total === 0) {
    return {
      dns: { ok: 0, error: 0, pending: 0, timeout: 0 },
      http: { ok: 0, error: 0, pending: 0, timeout: 0 }
    };
  }

  const dnsStats = domains.reduce((acc, domain) => {
    acc[domain.dns_status] = (acc[domain.dns_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const httpStats = domains.reduce((acc, domain) => {
    acc[domain.http_status] = (acc[domain.http_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    dns: {
      ok: dnsStats.ok || 0,
      error: dnsStats.error || 0,
      pending: dnsStats.pending || 0,
      timeout: dnsStats.timeout || 0
    },
    http: {
      ok: httpStats.ok || 0,
      error: httpStats.error || 0,
      pending: httpStats.pending || 0,
      timeout: httpStats.timeout || 0
    }
  };
}