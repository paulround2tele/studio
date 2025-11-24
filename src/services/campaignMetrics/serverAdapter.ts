/**
 * Server Adapter Service (Phase 3)
 * Transforms server responses to internal types with graceful fallbacks
 */

import { AggregateSnapshot, AggregateMetrics } from '@/types/campaignMetrics';

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
  const withDefault = <T>(value: T | undefined, fallback: T): T => (value === undefined ? fallback : value);

  // Extract aggregates with safe defaults
  const serverAggregates = response.aggregates || {};
  const aggregates: AggregateMetrics = {
    totalDomains: withDefault(serverAggregates.totalDomains, 0),
    successRate: withDefault(serverAggregates.successRate, 0),
    avgLeadScore: withDefault(serverAggregates.avgLeadScore, 0),
    dnsSuccessRate: withDefault(serverAggregates.dnsSuccessRate, 0),
    httpSuccessRate: withDefault(serverAggregates.httpSuccessRate, 0),
    runtime: serverAggregates.runtime === undefined ? undefined : serverAggregates.runtime
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
  defaultSnapshotCounter = (defaultSnapshotCounter + 1) % Number.MAX_SAFE_INTEGER;
  const uniqueSuffix = `${Date.now()}${defaultSnapshotCounter}`;
  
  return {
    id: `fallback-${uniqueSuffix}`,
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

let defaultSnapshotCounter = 0;