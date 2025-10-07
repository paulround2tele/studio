/**
 * Server Adapter Service (Phase 3)
 * Transforms server responses to internal types with graceful fallbacks
 */

import { AggregateSnapshot, AggregateMetrics, ClassificationBuckets } from '@/types/campaignMetrics';

// Expected server response structure (adjust when actual endpoints are available)
export interface ServerMetricsResponse {
  aggregates?: {
    totalDomains?: number;
    successRate?: number;
    avgLeadScore?: number;
    dnsSuccessRate?: number;
    httpSuccessRate?: number;
    highPotentialCount?: number;
    leadsCount?: number;
    avgRichness?: number;
    warningRate?: number;
    keywordCoverage?: number;
    medianGain?: number;
    runtime?: number;
  };
  classification?: Record<string, number>;
  snapshotId?: string;
  timestamp?: string;
}

/**
 * Transform server response to internal AggregateSnapshot format
 * Provides safe defaults for missing fields
 */
export function transformServerResponse(
  response: ServerMetricsResponse
): AggregateSnapshot {
  const now = new Date().toISOString();
  
  // Extract aggregates with safe defaults
  const serverAggregates = response.aggregates || {};
  const aggregates: AggregateMetrics = {
    totalDomains: serverAggregates.totalDomains || 0,
    successRate: serverAggregates.successRate || 0,
    avgLeadScore: serverAggregates.avgLeadScore || 0,
    dnsSuccessRate: serverAggregates.dnsSuccessRate || 0,
    httpSuccessRate: serverAggregates.httpSuccessRate || 0,
    runtime: serverAggregates.runtime
  };

  // Add extended fields if available
  // Extend aggregates via widening type using intersection while avoiding 'any'
  type Extended = AggregateMetrics & {
    highPotentialCount?: number;
    leadsCount?: number;
    avgRichness?: number;
    warningRate?: number;
    keywordCoverage?: number;
    medianGain?: number;
  };
  const extended = aggregates as Extended;
  if (serverAggregates.highPotentialCount !== undefined) extended.highPotentialCount = serverAggregates.highPotentialCount;
  if (serverAggregates.leadsCount !== undefined) extended.leadsCount = serverAggregates.leadsCount;
  if (serverAggregates.avgRichness !== undefined) extended.avgRichness = serverAggregates.avgRichness;
  if (serverAggregates.warningRate !== undefined) extended.warningRate = serverAggregates.warningRate;
  if (serverAggregates.keywordCoverage !== undefined) extended.keywordCoverage = serverAggregates.keywordCoverage;
  if (serverAggregates.medianGain !== undefined) extended.medianGain = serverAggregates.medianGain;

  return {
    id: response.snapshotId || `snapshot-${Date.now()}`,
    timestamp: response.timestamp || now,
    aggregates,
    classifiedCounts: response.classification || {}
  };
}

/**
 * Validate server response structure
 * Returns true if response has minimum required fields
 */
export function validateServerResponse(response: unknown): response is ServerMetricsResponse {
  if (!response || typeof response !== 'object') {
    return false;
  }
  const r = response as Partial<ServerMetricsResponse>;
  return !!(r.aggregates || r.classification);
}

/**
 * Create safe defaults when server is unavailable
 * Used as fallback when server endpoints return errors
 */
export function createDefaultSnapshot(): AggregateSnapshot {
  const now = new Date().toISOString();
  
  return {
    id: `fallback-${Date.now()}`,
    timestamp: now,
    aggregates: {
      totalDomains: 0,
      successRate: 0,
      avgLeadScore: 0,
      dnsSuccessRate: 0,
      httpSuccessRate: 0
    },
    classifiedCounts: {}
  };
}

/**
 * Log server adapter warnings (only once per session to avoid spam)
 */
const loggedWarnings = new Set<string>();

export function logServerWarning(message: string, details?: unknown) {
  if (!loggedWarnings.has(message)) {
    if (details !== undefined) {
      console.warn(`[ServerAdapter] ${message}`, details);
    } else {
      console.warn(`[ServerAdapter] ${message}`);
    }
    loggedWarnings.add(message);
  }
}