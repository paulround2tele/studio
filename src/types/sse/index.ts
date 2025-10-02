// Phase 3: SSE Event type definitions for eliminating any/unsafe casts
// Define discriminated union for Server-Sent Events

import type { CampaignPhase } from '@/types/domain';

/**
 * Base SSE event structure
 */
interface BaseSSEEvent {
  campaign_id: string;
  timestamp: string;
}

/**
 * Campaign progress event from SSE stream
 */
export interface SseProgressEvent extends BaseSSEEvent {
  type: 'progress';
  current_phase: CampaignPhase;
  progress_pct: number;
  items_processed: number;
  items_total: number;
  status: string;
  message?: string;
}

/**
 * Phase started event from SSE stream
 */
export interface SsePhaseStartedEvent extends BaseSSEEvent {
  type: 'phase_started';
  phase: CampaignPhase;
  message: string;
  results?: Record<string, unknown>;
}

/**
 * Phase completed event from SSE stream
 */
export interface SsePhaseCompletedEvent extends BaseSSEEvent {
  type: 'phase_completed';
  phase: CampaignPhase;
  message: string;
  results?: Record<string, unknown>;
}

/**
 * Phase failed event from SSE stream
 */
export interface SsePhaseFailedEvent extends BaseSSEEvent {
  type: 'phase_failed';
  phase: CampaignPhase;
  message: string;
  error: string;
}

/**
 * Domain generated event from SSE stream
 */
export interface SseDomainGeneratedEvent extends BaseSSEEvent {
  type: 'domain_generated';
  domain: string;
  count: number;
  batch_id?: string;
}

/**
 * Domain validated event from SSE stream
 */
export interface SseDomainValidatedEvent extends BaseSSEEvent {
  type: 'domain_validated';
  domain: string;
  dns_status: string;
  http_status?: string;
  validation_results?: Record<string, unknown>;
}

/**
 * Domain scored event from SSE stream
 */
export interface SseDomainScoredEvent extends BaseSSEEvent {
  type: 'domain_scored';
  domain: string;
  score: number;
  scoring_details?: Record<string, unknown>;
}

/**
 * Analysis completed event from SSE stream
 */
export interface SseAnalysisCompletedEvent extends BaseSSEEvent {
  type: 'analysis_completed';
  phase: CampaignPhase;
  total_domains: number;
  analyzed_domains: number;
  results?: Record<string, unknown>;
}

/**
 * Analysis reuse enrichment event from SSE stream
 */
export interface SseAnalysisReuseEnrichmentEvent extends BaseSSEEvent {
  type: 'analysis_reuse_enrichment';
  featureVectorCount?: number;
  raw: Record<string, unknown>;
}

/**
 * Analysis preflight error event from SSE stream
 */
export interface SseAnalysisPreflightErrorEvent extends BaseSSEEvent {
  type: 'analysis_preflight_error';
  error: string;
  code?: string;
}

/**
 * Counters reconciled event from SSE stream
 */
export interface SseCountersReconciledEvent extends BaseSSEEvent {
  type: 'counters_reconciled';
  counters: Record<string, number>;
}

/**
 * Campaign mode changed event from SSE stream
 */
export interface SseModeChangedEvent extends BaseSSEEvent {
  type: 'mode_changed';
  mode: 'full_sequence' | 'step_by_step';
}

/**
 * Generic error event from SSE stream
 */
export interface SseErrorEvent extends BaseSSEEvent {
  type: 'error';
  error: string;
  code?: string;
}

/**
 * Discriminated union of all SSE event types
 */
export type CampaignSSEEvent = 
  | SseProgressEvent
  | SsePhaseStartedEvent
  | SsePhaseCompletedEvent
  | SsePhaseFailedEvent
  | SseDomainGeneratedEvent
  | SseDomainValidatedEvent
  | SseDomainScoredEvent
  | SseAnalysisCompletedEvent
  | SseAnalysisReuseEnrichmentEvent
  | SseAnalysisPreflightErrorEvent
  | SseCountersReconciledEvent
  | SseModeChangedEvent
  | SseErrorEvent;

/**
 * Legacy event interfaces for backwards compatibility
 * TODO: Migrate existing code to use discriminated union above
 */
export interface CampaignProgress {
  current_phase: string;
  progress_pct: number;
  items_processed: number;
  items_total: number;
  status: string;
  message?: string;
  timestamp: string;
}

export interface PhaseEvent {
  campaign_id: string;
  phase: string;
  message: string;
  results?: Record<string, unknown>;
  error?: string;
}

/**
 * Event handler function signatures
 */
export interface CampaignSSEEventHandlers {
  onProgress?: (campaignId: string, progress: CampaignProgress) => void;
  onPhaseStarted?: (campaignId: string, event: PhaseEvent) => void;
  onPhaseCompleted?: (campaignId: string, event: PhaseEvent) => void;
  onPhaseFailed?: (campaignId: string, event: PhaseEvent) => void;
  onDomainGenerated?: (campaignId: string, data: Record<string, unknown>) => void;
  onDomainValidated?: (campaignId: string, data: Record<string, unknown>) => void;
  onAnalysisCompleted?: (campaignId: string, data: Record<string, unknown>) => void;
  onCountersReconciled?: (campaignId: string, data: Record<string, unknown>) => void;
  onError?: (campaignId: string, error: string) => void;
  onModeChanged?: (campaignId: string, mode: 'full_sequence' | 'step_by_step') => void;
  onAnalysisReuseEnrichment?: (campaignId: string, data: { featureVectorCount?: number; raw: Record<string, unknown> }) => void;
  onAnalysisPreflightError?: (campaignId: string, data: { error: string; code?: string }) => void;
}

/**
 * Raw SSE data structure from server
 */
export interface RawSSEData {
  type: string;
  campaign_id?: string;
  [key: string]: unknown;
}

// Type guards for discriminated union
export const isSseProgressEvent = (event: CampaignSSEEvent): event is SseProgressEvent => {
  return event.type === 'progress';
};

export const isSsePhaseEvent = (event: CampaignSSEEvent): event is SsePhaseStartedEvent | SsePhaseCompletedEvent | SsePhaseFailedEvent => {
  return ['phase_started', 'phase_completed', 'phase_failed'].includes(event.type);
};

export const isSseDomainEvent = (event: CampaignSSEEvent): event is SseDomainGeneratedEvent | SseDomainValidatedEvent | SseDomainScoredEvent => {
  return ['domain_generated', 'domain_validated', 'domain_scored'].includes(event.type);
};

export const isSseErrorEvent = (event: CampaignSSEEvent): event is SseErrorEvent => {
  return event.type === 'error';
};