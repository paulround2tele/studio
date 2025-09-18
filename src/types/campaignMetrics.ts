/**
 * Shared types for Campaign Metrics (Phase 2)
 */

// Input data from domains for metrics calculation
export interface DomainMetricsInput {
  id: string;
  domain_name: string;
  dns_status: 'pending' | 'ok' | 'error' | 'timeout';
  http_status: 'pending' | 'ok' | 'error' | 'timeout';
  lead_score: number;
  created_at: string;
  updated_at: string;
}

// Aggregated metrics output
export interface AggregateMetrics {
  totalDomains: number;
  successRate: number;
  avgLeadScore: number;
  dnsSuccessRate: number;
  httpSuccessRate: number;
  runtime?: number;
}

// Classification buckets for domain quality
export interface ClassificationBuckets {
  highQuality: {
    count: number;
    percentage: number;
  };
  mediumQuality: {
    count: number;
    percentage: number;
  };
  lowQuality: {
    count: number;
    percentage: number;
  };
}

// Recommendation object
export interface Recommendation {
  id: string;
  severity: 'info' | 'warn' | 'action';
  title: string;
  detail: string;
  rationale: string;
}

// Pipeline progress data
export interface PipelineProgress {
  totalDomains?: number;
  analyzedDomains?: number;
  progressPercentage: number;
  phase: string;
}

// Phase 3: Additional types for server metrics, deltas, and real-time progress

// Snapshot of aggregated metrics at a point in time
export interface AggregateSnapshot {
  id: string;
  timestamp: string;
  aggregates: AggregateMetrics;
  classifiedCounts: Record<string, number>;
}

// Delta metrics comparing two snapshots
export interface DeltaMetrics {
  key: string;
  absolute: number;
  percent: number;
  direction: 'up' | 'down' | 'flat';
}

// Top mover (gainer/decliner) in metrics
export interface Mover {
  domain: string;
  metric: 'richness' | 'gain';
  from: number;
  to: number;
  delta: number;
  direction: 'up' | 'down';
}

// Real-time progress update
export interface ProgressUpdate {
  phase: string;
  analyzedDomains?: number;
  totalDomains?: number;
  status?: string;
  updatedAt: string;
}

// Extended aggregate metrics with additional fields for Phase 3
export interface ExtendedAggregateMetrics extends AggregateMetrics {
  highPotentialCount?: number;
  leadsCount?: number;
  avgRichness?: number;
  warningRate?: number;
  keywordCoverage?: number;
  medianGain?: number;
}