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