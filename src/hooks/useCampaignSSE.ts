// File: src/hooks/useCampaignSSE.ts
import React, { useCallback, useEffect, useState } from 'react';
import { useSSE, type SSEEvent } from './useSSE';
import { useAppDispatch } from '@/store/hooks';
import { phaseStarted, phaseCompleted, phaseFailed } from '@/store/slices/pipelineExecSlice';
import { campaignApi } from '@/store/api/campaignApi';
import type { 
  CampaignSSEEventHandlers, 
  RawSSEData 
} from '@/types/sse';
import type {
  CampaignProgress as ImportedCampaignProgress,
  PhaseEvent as ImportedPhaseEvent
} from '@/types/sse';
import type { CampaignPhase } from '@/types/domain';

// Map backend phase identifiers to internal pipeline phase keys used in selectors/ordering.
// Backend examples: domain_generation (discovery), dns_validation (validation), http_validation (extraction), analytics/analysis.
const BACKEND_TO_INTERNAL_PHASE: Record<string, CampaignPhase> = {
  domain_generation: 'generation',
  dns_validation: 'dns',
  http_validation: 'http',
  analysis: 'analysis',
  analytics: 'analysis'
};

const mapPhase = (raw: string | undefined): CampaignPhase | string => {
  if (!raw || typeof raw !== 'string') return raw || 'unknown';
  return BACKEND_TO_INTERNAL_PHASE[raw] || raw;
};

// Use types from the SSE module
export type CampaignProgress = ImportedCampaignProgress;
export type PhaseEvent = ImportedPhaseEvent;

export interface CampaignSSEEvents {
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
  /** Emitted when analysis preflight succeeds and feature vectors are being reused */
  onAnalysisReuseEnrichment?: (campaignId: string, data: { featureVectorCount?: number; raw: Record<string, unknown> }) => void;
  /** Emitted when analysis preflight fails before scoring (structured error code expected) */
  onAnalysisFailed?: (campaignId: string, data: { error?: string; errorCode?: string; raw: Record<string, unknown> }) => void;
}

export interface UseCampaignSSEOptions {
  /**
   * Specific campaign ID to watch. If not provided, listens to all campaigns for the user.
   */
  campaignId?: string;
  
  /**
   * Whether to automatically connect on mount
   * @default true
   */
  autoConnect?: boolean;
  
  /**
   * Event handlers for different campaign events
   */
  events?: CampaignSSEEvents;
}

export interface UseCampaignSSEReturn {
  /**
   * Current connection state
   */
  isConnected: boolean;
  
  /**
   * Connection error if any
   */
  error: string | null;
  
  /**
   * Last received campaign progress (cached for easy access)
   */
  lastProgress: CampaignProgress | null;
  
  /**
   * Last received event
   */
  lastEvent: SSEEvent | null;
  
  /**
   * Manually reconnect
   */
  reconnect: () => void;
  
  /**
   * Close the connection
   */
  disconnect: () => void;
  
  /**
   * Number of reconnection attempts
   */
  reconnectAttempts: number;
}

/**
 * Specialized SSE hook for campaign events with typed event handlers
 * 
 * @param options - Campaign SSE configuration options
 * @returns Campaign SSE connection state and control functions
 */
export function useCampaignSSE(options: UseCampaignSSEOptions = {}): UseCampaignSSEReturn {
  const { campaignId, autoConnect = true, events = {} } = options;
  const dispatch = useAppDispatch();
  
  const [lastProgress, setLastProgress] = useState<CampaignProgress | null>(null);
  // Track phases we've already marked completed to avoid double updates when both progress & phase_completed arrive.
  const completedRef = React.useRef<Set<string>>(new Set());
  
  // Construct the SSE URL based on whether we're watching a specific campaign
  const sseUrl = autoConnect 
    ? campaignId 
      ? `/api/v2/sse/campaigns/${campaignId}/events`
      : '/api/v2/sse/events'
    : null;

  // Event handler for all SSE events
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    const dataObj = (event.data && typeof event.data === 'object') ? (event.data as Record<string, unknown>) : undefined;
    const campaignIdFromEvent = event.campaign_id || (dataObj?.campaign_id as string | undefined);
    
    if (!campaignIdFromEvent) {
      console.warn('⚠️ Received SSE event without campaign_id:', event);
      return;
    }

    switch (event.event) {
      case 'campaign_progress': {
        const progressData = (dataObj?.progress as CampaignProgress | undefined) || 
                          (dataObj && 'current_phase' in dataObj ? dataObj as CampaignProgress : undefined);
        if (progressData) {
          setLastProgress(progressData);
          events.onProgress?.(campaignIdFromEvent, progressData);
          // If backend provides current_phase & 100% progress but no explicit phase_completed yet, synthesize completion.
          const rawPhase = progressData.current_phase || (dataObj?.current_phase as string | undefined);
          const pct = progressData.progress_pct;
          if (rawPhase && typeof pct === 'number' && pct >= 100) {
            const phase = mapPhase(rawPhase);
            if (!completedRef.current.has(`${campaignIdFromEvent}:${phase}`)) {
              completedRef.current.add(`${campaignIdFromEvent}:${phase}`);
              dispatch(phaseCompleted({ campaignId: campaignIdFromEvent, phase }));
              dispatch(campaignApi.util.updateQueryData('getPhaseStatusStandalone', { campaignId: campaignIdFromEvent, phase }, (draft) => 
                draft ? { ...draft, status: 'completed' } : { status: 'completed' }));
            }
          }
        }
        break; }

      case 'phase_started': {
        const backendPhase = dataObj?.phase as string | undefined;
        const phase = mapPhase(backendPhase);
        dispatch(phaseStarted({ campaignId: campaignIdFromEvent, phase }));
        // Update RTK Query cache: mark status running under internal key
        dispatch(campaignApi.util.updateQueryData('getPhaseStatusStandalone', { campaignId: campaignIdFromEvent, phase }, (draft) => 
          draft ? { ...draft, status: 'running' } : { status: 'running' }));
        events.onPhaseStarted?.(campaignIdFromEvent, {
          campaign_id: campaignIdFromEvent,
          phase: phase as string,
          message: (dataObj?.message as string) || 'Phase started',
          results: dataObj?.results as Record<string, unknown> | undefined
        });
        break; }

      case 'phase_completed': {
        const backendPhase = dataObj?.phase as string | undefined;
        const phase = mapPhase(backendPhase);
        if (!completedRef.current.has(`${campaignIdFromEvent}:${phase}`)) {
          completedRef.current.add(`${campaignIdFromEvent}:${phase}`);
          dispatch(phaseCompleted({ campaignId: campaignIdFromEvent, phase }));
          dispatch(campaignApi.util.updateQueryData('getPhaseStatusStandalone', { campaignId: campaignIdFromEvent, phase }, (draft) => 
            draft ? { ...draft, status: 'completed' } : { status: 'completed' }));
        }
        events.onPhaseCompleted?.(campaignIdFromEvent, {
          campaign_id: campaignIdFromEvent,
          phase: phase as string,
          message: (dataObj?.message as string) || 'Phase completed',
          results: dataObj?.results as Record<string, unknown> | undefined
        });
        break; }

      case 'phase_failed': {
        const backendPhase = dataObj?.phase as string | undefined;
        const phase = mapPhase(backendPhase);
        const error = (dataObj?.error as string | undefined) || 'Phase failed';
        dispatch(phaseFailed({ campaignId: campaignIdFromEvent, phase, error }));
        dispatch(campaignApi.util.updateQueryData('getPhaseStatusStandalone', { campaignId: campaignIdFromEvent, phase }, (draft) => 
          draft ? { ...draft, status: 'failed', error } : { status: 'failed', error }));
        events.onPhaseFailed?.(campaignIdFromEvent, {
          campaign_id: campaignIdFromEvent,
          phase: phase as string,
          message: (dataObj?.message as string) || 'Phase failed',
          error,
          results: dataObj?.results as Record<string, unknown> | undefined
        });
        break; }

      case 'domain_generated':
        events.onDomainGenerated?.(campaignIdFromEvent, (event.data || {}) as Record<string, unknown>);
        break;

      case 'domain_validated':
        events.onDomainValidated?.(campaignIdFromEvent, (event.data || {}) as Record<string, unknown>);
        break;

      case 'analysis_completed':
        events.onAnalysisCompleted?.(campaignIdFromEvent, (event.data || {}) as Record<string, unknown>);
        break;
      case 'analysis_reuse_enrichment': {
        // Provide normalized shape
        const featureVectorCount = (dataObj?.featureVectorCount as number | undefined) || (dataObj?.feature_vector_count as number | undefined);
        events.onAnalysisReuseEnrichment?.(campaignIdFromEvent, { featureVectorCount, raw: (event.data || {}) as Record<string, unknown> });
        break;
      }
      case 'analysis_failed': {
        const error = (dataObj?.error as string | undefined) || (dataObj?.message as string | undefined);
        const errorCode = dataObj?.errorCode as string | undefined;
        // Dispatch phaseFailed for analysis to integrate with existing runtime slice (phase field may be absent on backend custom event)
        dispatch(phaseFailed({ campaignId: campaignIdFromEvent, phase: 'analysis', error }));
        events.onAnalysisFailed?.(campaignIdFromEvent, { error, errorCode, raw: (event.data || {}) as Record<string, unknown> });
        break;
      }
      case 'counters_reconciled':
        // Provide callback, plus optionally consumer could choose to invalidate queries externally.
        events.onCountersReconciled?.(campaignIdFromEvent, (event.data || {}) as Record<string, unknown>);
        break;

      case 'mode_changed': {
        const mode = (dataObj?.mode as string | undefined);
        if (mode === 'full_sequence' || mode === 'step_by_step') {
          events.onModeChanged?.(campaignIdFromEvent, mode);
        } else {
          console.warn('⚠️ mode_changed event with invalid mode value', dataObj);
        }
        break;
      }


      case 'error':
        const errorMessage = (dataObj?.error as string | undefined) || (dataObj?.message as string | undefined) || 'Unknown error';
        events.onError?.(campaignIdFromEvent, errorMessage);
        break;

      case 'keep_alive':
        // Keep-alive events don't need special handling
        break;

      default:
        console.log('📡 Received unknown SSE event type:', event.event, event.data);
    }
  }, [events]);

  // Use the generic SSE hook
  const sseConnection = useSSE(sseUrl, handleSSEEvent, {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    withCredentials: true,
  });

  // Reset progress when campaign ID changes
  useEffect(() => {
    setLastProgress(null);
  }, [campaignId]);

  return {
    isConnected: sseConnection.isConnected,
    error: sseConnection.error,
    lastProgress,
    lastEvent: sseConnection.lastEvent,
    reconnect: sseConnection.reconnect,
    disconnect: sseConnection.close,
    reconnectAttempts: sseConnection.reconnectAttempts,
  };
}

/**
 * React component wrapper for campaign SSE events
 * Useful for declarative SSE event handling in components
 */
export function CampaignSSEProvider({ 
  children, 
  campaignId, 
  events 
}: { 
  children: React.ReactNode;
  campaignId?: string;
  events?: CampaignSSEEvents;
}) {
  useCampaignSSE({ campaignId, events });
  return React.createElement(React.Fragment, null, children);
}
