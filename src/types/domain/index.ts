// Phase 1: Domain type definitions for eliminating any/unsafe casts
// Based on generated API client types and UI requirements

import type { 
  DomainListItem,
  DomainAnalysisFeatures,
  ScoringProfile,
  CampaignDomainsListResponseAggregates
} from '@/lib/api-client/models';

/**
 * Lightweight domain row for list/streaming table display
 * Maps to DomainListItem from generated API
 */
export interface DomainRow extends DomainListItem {
  // All properties inherited from DomainListItem
  // Additional computed properties for UI display
  score?: number;
}

/**
 * Complete domain object mirroring backend response  
 * For detailed views and full domain data
 */
export interface DomainFull extends DomainListItem {
  // Extended properties for full domain view
  analysisFeatures?: DomainAnalysisFeatures;
  enrichedAt?: string;
  validatedAt?: string;
}

/**
 * Lightweight scoring profile for UI display
 * Subset of full ScoringProfile for performance
 */
export interface ScoringProfileLite {
  id: string;
  name: string;
  description?: string;
}

/**
 * Campaign phase union type from generated enum
 * Replaces string literals throughout the app
 */
export type CampaignPhase = 'discovery' | 'validation' | 'extraction' | 'analysis';

/**
 * Phase status type from generated enum
 * For consistent status handling across components
 */
export type PhaseStatus = 'not_started' | 'configured' | 'running' | 'paused' | 'completed' | 'failed';

/**
 * Phase status response shape
 * Used by getPhaseStatusStandalone and related functions
 */
export interface PhaseStatusResponse {
  phase: CampaignPhase;
  status: PhaseStatus;
  progressPercentage: number;
  startedAt?: string;
  completedAt?: string;
}

/**
 * UI-derived lifecycle state classification
 * Replaces opaque string any patterns in domain status display
 */
export type LifecycleState = 
  | 'not_started'
  | 'generating' 
  | 'validating_dns'
  | 'validating_http'
  | 'analyzing'
  | 'extracting_leads'
  | 'completed'
  | 'failed'
  | 'paused';

/**
 * Domain aggregate data structure
 * For campaign overview statistics
 */
export interface DomainAggregates extends CampaignDomainsListResponseAggregates {
  // Additional computed aggregates can be added here
  totalValidated?: number;
  averageScore?: number;
}

/**
 * Domain warning indicator for UI display
 * Used in getDomainWarnings utility function
 */
export interface DomainWarning {
  key: string;
  label: string;
  title: string;
}

/**
 * Metric value with optional comparison data
 * For domain metrics display in tables
 */
export interface MetricValue {
  current: number;
  previous?: number;
  change?: number;
  changePercent?: number;
}

// Re-export relevant generated types for convenience
export type { 
  DomainListItem,
  DomainAnalysisFeatures,
  ScoringProfile,
  CampaignDomainsListResponseAggregates
};

// Utility type guards
export const isValidLifecycleState = (state: unknown): state is LifecycleState => {
  return typeof state === 'string' && [
    'not_started', 'generating', 'validating_dns', 'validating_http', 
    'analyzing', 'extracting_leads', 'completed', 'failed', 'paused'
  ].includes(state);
};

export const isValidCampaignPhase = (phase: unknown): phase is CampaignPhase => {
  return typeof phase === 'string' && ['discovery','validation','extraction','analysis'].includes(phase);
};

export const isValidPhaseStatus = (status: unknown): status is PhaseStatus => {
  return typeof status === 'string' && [
    'not_started', 'configured', 'running', 'paused', 'completed', 'failed'
  ].includes(status);
};