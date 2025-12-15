// File: src/hooks/useCampaignSSE.ts
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSSE, type SSEEvent } from './useSSE';
import { useAppDispatch } from '@/store/hooks';
import { phaseStarted, phaseCompleted, phaseFailed } from '@/store/slices/pipelineExecSlice';
import { campaignApi } from '@/store/api/campaignApi';
import type { PhaseStatusResponse } from '@/lib/api-client/models';
import { ensurePhaseStatus, PipelinePhase, PhaseRunStatus as _PhaseRunStatus } from '@/utils/phaseStatus';
import type { PipelinePhaseKey } from '@/store/selectors/pipelineSelectors';
import type { 
  CampaignSSEEventHandlers as _CampaignSSEEventHandlers, 
  RawSSEData as _RawSSEData,
  CampaignSSEEvent,
  SseProgressEvent,
  SsePhaseStartedEvent,
  SsePhaseCompletedEvent,
  SsePhaseFailedEvent
} from '@/types/sse';
import type {
  CampaignProgress as ImportedCampaignProgress,
  PhaseEvent as ImportedPhaseEvent
} from '@/types/sse';
import type { CampaignPhase } from '@/types/domain';
import { getApiBasePath } from '@/lib/api/config';

const joinUrl = (base: string, path: string): string => {
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedPath}`;
};

const tryParseOrigin = (raw?: string | null): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return trimmed.replace(/\/$/, '');
  }
};

const getExplicitBackendOrigin = (): string | null => {
  const directOriginCandidates = [process.env.NEXT_PUBLIC_SSE_ORIGIN];
  for (const candidate of directOriginCandidates) {
    const parsed = tryParseOrigin(candidate);
    if (parsed) {
      return parsed;
    }
  }

  const urlCandidates = [process.env.NEXT_PUBLIC_SSE_URL, process.env.NEXT_PUBLIC_API_URL];
  for (const candidate of urlCandidates) {
    const parsed = tryParseOrigin(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const inferBackendOrigin = (): string | null => {
  const explicit = getExplicitBackendOrigin();
  if (explicit) {
    return explicit;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const { protocol, hostname, port } = window.location;

  if (hostname.endsWith('.app.github.dev')) {
    const altHost = hostname.replace('-3000.', '-8080.');
    if (altHost !== hostname) {
      return `${protocol}//${altHost}`;
    }
    return `${protocol}//${hostname}`;
  }

  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '3000') {
    return `${protocol}//${hostname}:8080`;
  }

  if (port) {
    return `${protocol}//${hostname}:${port}`;
  }

  return `${protocol}//${hostname}`;
};

const resolveSseBasePath = (): string => {
  let base = process.env.NEXT_PUBLIC_SSE_URL?.trim();
  let hasExplicitOverride = Boolean(base);

  if (!base) {
    base = '/api/v2';
    try {
      const resolved = getApiBasePath();
      if (resolved) {
        base = resolved;
      }
    } catch (error) {
      console.warn('Failed to resolve API base path for SSE, defaulting to /api/v2', error);
    }
  }

  const trimmed = base.replace(/\/$/, '');
  const isAbsolute = /^https?:\/\//i.test(trimmed);

  if (typeof window === 'undefined') {
    if (isAbsolute) {
      return trimmed;
    }
    const explicitOrigin = getExplicitBackendOrigin();
    if (explicitOrigin) {
      const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return joinUrl(explicitOrigin, normalizedPath).replace(/\/$/, '');
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  if (isAbsolute) {
    try {
      const parsed = new URL(trimmed);
      const isMixedContent = window.location.protocol === 'https:' && parsed.protocol === 'http:';

      if (isMixedContent) {
        const backendOrigin = inferBackendOrigin();
        if (backendOrigin) {
          return joinUrl(backendOrigin, parsed.pathname).replace(/\/$/, '');
        }
        const secureOrigin = `https://${parsed.host}`;
        return joinUrl(secureOrigin, parsed.pathname).replace(/\/$/, '');
      }

      // Respect explicit overrides even in local dev; otherwise Chi will handle CORS for us.
      if (hasExplicitOverride) {
        return trimmed;
      }
    } catch (error) {
      console.warn('Failed to normalize SSE base path, falling back to resolved value', error);
    }
    return trimmed;
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const backendOrigin = inferBackendOrigin();
  if (backendOrigin) {
    return joinUrl(backendOrigin, normalized).replace(/\/$/, '');
  }
  return normalized.replace(/\/$/, '');
};

// Map backend phase identifiers to internal pipeline phase keys used in selectors/ordering.
// Backend examples: domain_generation (discovery), dns_validation (validation), http_validation (extraction), analytics/analysis.
// Map backend raw identifiers to generated enum phases (falling back if unknown)
const BACKEND_TO_INTERNAL_PHASE: Record<string, PipelinePhase> = {
  domain_generation: 'discovery',
  dns_validation: 'validation',
  http_validation: 'extraction',
  http_keyword_validation: 'extraction',
  analysis: 'analysis',
  enrichment: 'enrichment',
  analytics: 'analysis',
};

const mapPhase = (raw: string | undefined): PipelinePhase | string => {
  if (!raw || typeof raw !== 'string') return raw || 'unknown';
  return BACKEND_TO_INTERNAL_PHASE[raw] || raw;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Coerce backend mapped phase to internal pipeline phase union when possible.
const toPipelinePhase = (phase: string | PipelinePhase): PipelinePhaseKey | undefined => {
  switch (phase) {
    case 'analysis':
      return 'analysis';
    case 'discovery':
      return 'discovery';
    case 'validation':
      return 'validation';
    case 'enrichment':
      return 'enrichment';
    case 'extraction':
      return 'extraction';
    default:
      return undefined;
  }
};

const CAMPAIGN_SSE_DEBUG_KEY = '__campaignSSEEvents';
const CAMPAIGN_SSE_DEBUG_LIMIT = 200;

const sanitizeDebugPayload = (value: unknown): unknown => {
  if (value === undefined || value === null) {
    return value;
  }
  const primitive = typeof value;
  if (primitive === 'string' || primitive === 'number' || primitive === 'boolean') {
    return value;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { __debug: 'unserializable' };
  }
};

const pushDebugEntry = (key: string, entry: unknown, limit: number): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const win = window as unknown as Record<string, unknown>;
  const history = Array.isArray(win[key]) ? (win[key] as unknown[]) : [];
  win[key] = [...history, entry].slice(-limit);
};

// Narrow a value to CampaignProgress (runtime shape heuristic)
type ProgressDraft = {
  current_phase?: CampaignPhase | string;
  progress_pct?: number;
  items_processed?: number;
  items_total?: number;
  status?: string;
  message?: string;
};
const isCampaignProgress = (val: object | null): val is CampaignProgress => {
  if (!val) return false;
  return 'current_phase' in val && 'progress_pct' in val;
};

// Use types from the SSE module
export type CampaignProgress = ImportedCampaignProgress;
export type PhaseEvent = ImportedPhaseEvent;

// Local extension for phase status to include optional error (frontend convenience)
interface PhaseStatusWithError extends PhaseStatusResponse { error?: string }

// Convert raw SSEEvent into discriminated union CampaignSSEEvent (no raw any)
function _mapRawToCampaignSSE(event: SSEEvent): CampaignSSEEvent | undefined {
  const campaignId = event.campaign_id || (
    typeof event.data === 'object' && event.data !== null && 'campaign_id' in event.data
      ? (event.data as { campaign_id?: string }).campaign_id
      : undefined
  );
  const base = { campaign_id: campaignId || '', timestamp: event.timestamp } as const;
  try {
    switch (event.event) {
      case 'campaign_progress': {
        const rawObj = ((): object | null => {
          if (event.data && typeof event.data === 'object') {
            const withProgress = event.data as { progress?: object };
            if (withProgress.progress && typeof withProgress.progress === 'object') return withProgress.progress;
            return event.data as object;
          }
          return null;
        })();
        if (!rawObj) return undefined;
        const p = rawObj as ProgressDraft;
        return {
          type: 'progress',
          current_phase: (p.current_phase as CampaignPhase) || ('' as CampaignPhase),
          progress_pct: p.progress_pct ?? 0,
          items_processed: p.items_processed ?? 0,
          items_total: p.items_total ?? 0,
          status: p.status ?? 'unknown',
          message: p.message,
          ...base
        } as SseProgressEvent;
      }
      case 'phase_started': {
        if (!(event.data && typeof event.data === 'object')) return undefined;
        const payload = event.data as { phase?: CampaignPhase | string; message?: string; status?: string; results?: Record<string, unknown> };
        const status = typeof payload.status === 'string' ? payload.status : undefined;
        return {
          type: 'phase_started',
          phase: (payload.phase as CampaignPhase) || ('' as CampaignPhase),
          message: payload.message || 'Phase started',
          status,
          results: payload.results,
          ...base,
        } as SsePhaseStartedEvent;
      }
      case 'phase_completed': {
        if (!(event.data && typeof event.data === 'object')) return undefined;
        const payload = event.data as { phase?: CampaignPhase | string; message?: string; status?: string; results?: Record<string, unknown> };
        const status = typeof payload.status === 'string' ? payload.status : undefined;
        return {
          type: 'phase_completed',
          phase: (payload.phase as CampaignPhase) || ('' as CampaignPhase),
          message: payload.message || 'Phase completed',
          status,
          results: payload.results,
          ...base,
        } as SsePhaseCompletedEvent;
      }
      case 'phase_failed': {
        if (!(event.data && typeof event.data === 'object')) return undefined;
        const payload = event.data as { phase?: CampaignPhase | string; message?: string; error?: string; status?: string };
        const status = typeof payload.status === 'string' ? payload.status : undefined;
        return {
          type: 'phase_failed',
          phase: (payload.phase as CampaignPhase) || ('' as CampaignPhase),
          message: payload.message || 'Phase failed',
          error: payload.error || 'Phase failed',
          status,
          ...base,
        } as SsePhaseFailedEvent;
      }
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

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
   * Whether we have ever opened a connection in this lifecycle
   */
  hasEverConnected: boolean;

  /**
   * Underlying EventSource readyState
   */
  readyState: number;

  /**
   * Timestamp of the last successful connection
   */
  connectedAt: string | null;
  
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
  const eventsRef = useRef<CampaignSSEEvents>({ ...events });
  const [fallbackApplied, setFallbackApplied] = useState(false);

  useEffect(() => {
    eventsRef.current = { ...events };
  }, [events]);

  const captureDebugEvent = useCallback(
    (label: string, detail: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
        return;
      }
      const entry = {
        timestamp: new Date().toISOString(),
        campaignId: (detail.campaignId as string) || campaignId || null,
        label,
        detail: sanitizeDebugPayload(detail),
      };
      pushDebugEntry(CAMPAIGN_SSE_DEBUG_KEY, entry, CAMPAIGN_SSE_DEBUG_LIMIT);
      (window as typeof window & { __campaignSSELastEvent?: typeof entry }).__campaignSSELastEvent = entry;
      if (process.env.NEXT_PUBLIC_SSE_DEBUG === 'verbose') {
        console.debug('[useCampaignSSE] event trace', entry);
      }
    },
    [campaignId]
  );

  const [sseBasePath, setSseBasePath] = useState<string | null>(() => (typeof window === 'undefined' ? null : resolveSseBasePath()));

  useEffect(() => {
    const resolved = resolveSseBasePath();
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      console.log('[useCampaignSSE] resolved SSE base path', resolved);
    }
    setSseBasePath(prev => (prev === resolved ? prev : resolved));
  }, []);

  const buildSseUrl = useCallback((suffix: string) => joinUrl(sseBasePath ?? '/api/v2', suffix), [sseBasePath]);
  
  // Construct the SSE URL based on whether we're watching a specific campaign
  const sseUrl = autoConnect && sseBasePath
    ? campaignId 
      ? buildSseUrl(`/sse/campaigns/${campaignId}/events`)
      : buildSseUrl('/sse/events')
    : null;

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    console.log('[useCampaignSSE] configuration', {
      campaignId,
      autoConnect,
      sseBasePath,
      sseUrl,
    });
  }

  // Event handler for all SSE events
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    const dataObj = isPlainObject(event.data) ? (event.data as Record<string, unknown>) : undefined;
    const payload = isPlainObject(dataObj?.data)
      ? (dataObj!.data as Record<string, unknown>)
      : dataObj;

    const payloadCampaignId =
      typeof event.campaign_id === 'string'
        ? event.campaign_id
        : typeof payload?.campaign_id === 'string'
          ? payload.campaign_id
          : typeof dataObj?.campaign_id === 'string'
            ? dataObj.campaign_id
            : '';

    const resolvedCampaignId = payloadCampaignId || campaignId || '';

    captureDebugEvent('incoming_event', {
      campaignId: resolvedCampaignId,
      eventType: event.event,
      payloadCampaignId,
    });

    if (!resolvedCampaignId) {
      console.warn('⚠️ Received SSE event without campaign_id:', event);
      captureDebugEvent('missing_campaign_id', {
        eventType: event.event,
      });
      return;
    }

    const handlers = eventsRef.current;

    switch (event.event) {
      case 'campaign_progress': {
        let synthesizedCompletion = false;
        const progressCandidate = isPlainObject(payload?.progress) ? (payload?.progress as object) : null;
        const progressData =
          (progressCandidate && isCampaignProgress(progressCandidate)
            ? (progressCandidate as CampaignProgress)
            : undefined) ||
          (payload && isCampaignProgress(payload as object)
            ? (payload as unknown as CampaignProgress)
            : undefined);
        if (progressData) {
          setLastProgress(progressData);
          handlers.onProgress?.(resolvedCampaignId, progressData);
          // If backend provides current_phase & 100% progress but no explicit phase_completed yet, synthesize completion.
          const rawPhase =
            progressData.current_phase ||
            (typeof payload?.current_phase === 'string' ? (payload.current_phase as string) : undefined);
          const pct = progressData.progress_pct;
          if (rawPhase && typeof pct === 'number' && pct >= 100) {
            const phase = mapPhase(rawPhase);
            if (!completedRef.current.has(`${resolvedCampaignId}:${phase}`)) {
              completedRef.current.add(`${resolvedCampaignId}:${phase}`);
                            const pipelinePhase = toPipelinePhase(phase);
                            if (pipelinePhase) {
                              dispatch(phaseCompleted({ campaignId: resolvedCampaignId, phase: pipelinePhase }));
                            }
                            dispatch(campaignApi.util.updateQueryData(
                              'getPhaseStatusStandalone',
                              { campaignId: resolvedCampaignId, phase },
                              (draft) => {
                                const ps = ensurePhaseStatus(draft as PhaseStatusResponse | undefined, phase as PipelinePhase, 'completed');
                                if (!ps.progress) {
                                  ps.progress = { totalItems: 0, processedItems: 0, successfulItems: 0, failedItems: 0, percentComplete: 100 };
                                } else {
                                  ps.progress.percentComplete = 100;
                                }
                                return ps;
                              }
                            ));
              synthesizedCompletion = true;
            }
          }
        }
        captureDebugEvent('campaign_progress', {
          campaignId: resolvedCampaignId,
          hasPayload: Boolean(progressData),
          phase: (progressData?.current_phase as string) || (payload?.current_phase as string) || undefined,
          percent: progressData?.progress_pct,
          status: progressData?.status,
          synthesizedCompletion,
        });
        break; }

      case 'phase_started': {
        const backendPhase = (payload?.phase as string | undefined) || (dataObj?.phase as string | undefined);
        const phase = mapPhase(backendPhase);
                const pipelinePhase = toPipelinePhase(phase);
                if (pipelinePhase) {
                  dispatch(phaseStarted({ campaignId: resolvedCampaignId, phase: pipelinePhase }));
                }
        // Update RTK Query cache: mark status running under internal key
                dispatch(campaignApi.util.updateQueryData(
                  'getPhaseStatusStandalone',
                  { campaignId: resolvedCampaignId, phase },
                  (draft) => {
                    const ps = ensurePhaseStatus(draft as PhaseStatusResponse | undefined, phase as PipelinePhase, 'running');
                    if (!ps.progress) {
                      ps.progress = { totalItems: 0, processedItems: 0, successfulItems: 0, failedItems: 0, percentComplete: 0 };
                    }
                    return ps;
                  }
                ));
        handlers.onPhaseStarted?.(resolvedCampaignId, {
          campaign_id: resolvedCampaignId,
          phase: phase as string,
          message: (payload?.message as string) || (dataObj?.message as string) || 'Phase started',
          results: (payload?.results as Record<string, unknown> | undefined) || (dataObj?.results as Record<string, unknown> | undefined)
        });
        captureDebugEvent('phase_started', {
          campaignId: resolvedCampaignId,
          phase,
          message: payload?.message ?? dataObj?.message,
        });
        break; }

      case 'phase_completed': {
        const backendPhase = (payload?.phase as string | undefined) || (dataObj?.phase as string | undefined);
        const phase = mapPhase(backendPhase);
        if (!completedRef.current.has(`${resolvedCampaignId}:${phase}`)) {
          completedRef.current.add(`${resolvedCampaignId}:${phase}`);
                    const pipelinePhase = toPipelinePhase(phase);
                    if (pipelinePhase) {
                      dispatch(phaseCompleted({ campaignId: resolvedCampaignId, phase: pipelinePhase }));
                    }
                    dispatch(campaignApi.util.updateQueryData(
                      'getPhaseStatusStandalone',
                      { campaignId: resolvedCampaignId, phase },
                      (draft) => {
                        const ps = ensurePhaseStatus(draft as PhaseStatusResponse | undefined, phase as PipelinePhase, 'completed');
                        if (!ps.progress) {
                          ps.progress = { totalItems: 0, processedItems: 0, successfulItems: 0, failedItems: 0, percentComplete: 100 };
                        } else {
                          ps.progress.percentComplete = 100;
                        }
                        return ps;
                      }
                    ));
        }
        handlers.onPhaseCompleted?.(resolvedCampaignId, {
          campaign_id: resolvedCampaignId,
          phase: phase as string,
          message: (payload?.message as string) || (dataObj?.message as string) || 'Phase completed',
          results: (payload?.results as Record<string, unknown> | undefined) || (dataObj?.results as Record<string, unknown> | undefined)
        });
        captureDebugEvent('phase_completed', {
          campaignId: resolvedCampaignId,
          phase,
          message: payload?.message ?? dataObj?.message,
        });
        break; }

      case 'phase_failed': {
        const backendPhase = (payload?.phase as string | undefined) || (dataObj?.phase as string | undefined);
        const phase = mapPhase(backendPhase);
        const error =
          (payload?.error as string | undefined) ||
          (dataObj?.error as string | undefined) ||
          'Phase failed';
                const pipelinePhase = toPipelinePhase(phase);
                if (pipelinePhase) {
                  dispatch(phaseFailed({ campaignId: resolvedCampaignId, phase: pipelinePhase, error }));
                }
                dispatch(campaignApi.util.updateQueryData(
                  'getPhaseStatusStandalone',
                  { campaignId: resolvedCampaignId, phase },
                  (draft) => {
                    const ps = ensurePhaseStatus(draft as PhaseStatusWithError | undefined, phase as PipelinePhase, 'failed') as PhaseStatusWithError;
                    ps.error = error;
                    if (!ps.progress) {
                      ps.progress = { totalItems: 0, processedItems: 0, successfulItems: 0, failedItems: 0, percentComplete: 0 };
                    }
                    return ps;
                  }
                ));
        handlers.onPhaseFailed?.(resolvedCampaignId, {
          campaign_id: resolvedCampaignId,
          phase: phase as string,
          message: (payload?.message as string) || (dataObj?.message as string) || 'Phase failed',
          error,
          results: (payload?.results as Record<string, unknown> | undefined) || (dataObj?.results as Record<string, unknown> | undefined)
        });
        captureDebugEvent('phase_failed', {
          campaignId: resolvedCampaignId,
          phase,
          error,
        });
        break; }

      case 'domain_generated':
        handlers.onDomainGenerated?.(
          resolvedCampaignId,
          (payload || dataObj || {}) as Record<string, unknown>
        );
        break;

      case 'domain_validated':
        handlers.onDomainValidated?.(
          resolvedCampaignId,
          (payload || dataObj || {}) as Record<string, unknown>
        );
        break;

      case 'analysis_completed':
        handlers.onAnalysisCompleted?.(
          resolvedCampaignId,
          (payload || dataObj || {}) as Record<string, unknown>
        );
        captureDebugEvent('analysis_completed', {
          campaignId: resolvedCampaignId,
        });
        break;
      case 'analysis_reuse_enrichment': {
        // Provide normalized shape
        const featureVectorCount =
          (payload?.featureVectorCount as number | undefined) ||
          (payload?.feature_vector_count as number | undefined) ||
          (dataObj?.featureVectorCount as number | undefined) ||
          (dataObj?.feature_vector_count as number | undefined);
        handlers.onAnalysisReuseEnrichment?.(resolvedCampaignId, {
          featureVectorCount,
          raw: (payload || dataObj || {}) as Record<string, unknown>,
        });
        captureDebugEvent('analysis_reuse_enrichment', {
          campaignId: resolvedCampaignId,
          featureVectorCount,
        });
        break;
      }
      case 'analysis_failed': {
        const error =
          (payload?.error as string | undefined) ||
          (payload?.message as string | undefined) ||
          (dataObj?.error as string | undefined) ||
          (dataObj?.message as string | undefined);
        const errorCode =
          (payload?.errorCode as string | undefined) ||
          (dataObj?.errorCode as string | undefined);
        // Dispatch phaseFailed for analysis to integrate with existing runtime slice (phase field may be absent on backend custom event)
        dispatch(phaseFailed({ campaignId: resolvedCampaignId, phase: 'analysis', error }));
        handlers.onAnalysisFailed?.(resolvedCampaignId, {
          error,
          errorCode,
          raw: (payload || dataObj || {}) as Record<string, unknown>,
        });
        captureDebugEvent('analysis_failed', {
          campaignId: resolvedCampaignId,
          error,
          errorCode,
        });
        break;
      }
      case 'counters_reconciled':
        // Provide callback, plus optionally consumer could choose to invalidate queries externally.
        handlers.onCountersReconciled?.(
          resolvedCampaignId,
          (payload || dataObj || {}) as Record<string, unknown>
        );
        captureDebugEvent('counters_reconciled', {
          campaignId: resolvedCampaignId,
        });
        break;

      case 'mode_changed': {
        const mode =
          (payload?.mode as string | undefined) ||
          (dataObj?.mode as string | undefined);
        if (mode === 'full_sequence' || mode === 'step_by_step') {
          handlers.onModeChanged?.(resolvedCampaignId, mode);
          captureDebugEvent('mode_changed', {
            campaignId: resolvedCampaignId,
            mode,
          });
        } else {
          console.warn('⚠️ mode_changed event with invalid mode value', dataObj);
          captureDebugEvent('mode_changed_invalid', {
            campaignId: resolvedCampaignId,
          });
        }
        break;
      }


      case 'error':
        const errorMessage =
          (payload?.error as string | undefined) ||
          (payload?.message as string | undefined) ||
          (dataObj?.error as string | undefined) ||
          (dataObj?.message as string | undefined) ||
          'Unknown error';
        handlers.onError?.(resolvedCampaignId, errorMessage);
        captureDebugEvent('stream_error_event', {
          campaignId: resolvedCampaignId,
          error: errorMessage,
        });
        break;

      case 'keep_alive':
        // Keep-alive events don't need special handling
        break;

      default:
        console.log('📡 Received unknown SSE event type:', event.event, event.data);
        captureDebugEvent('unknown_event', {
          campaignId: resolvedCampaignId,
          eventType: event.event,
        });
    }
  }, [dispatch, campaignId, captureDebugEvent]);

  // Use the generic SSE hook
  const sseConnection = useSSE(sseUrl, handleSSEEvent, {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    withCredentials: true,
  });

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    const win = window as typeof window & { __campaignSSESnapshots?: Array<Record<string, unknown>> };
    const history = Array.isArray(win.__campaignSSESnapshots) ? win.__campaignSSESnapshots : [];
    history.push({
      timestamp: new Date().toISOString(),
      campaignId,
      autoConnect,
      sseBasePath,
      sseUrl,
      fallbackApplied,
      readyState: sseConnection.readyState,
      isConnected: sseConnection.isConnected,
      hasEverConnected: sseConnection.hasEverConnected,
      error: sseConnection.error,
    });
    win.__campaignSSESnapshots = history.slice(-25);
  }

  useEffect(() => {
    if (!sseConnection.error) {
      return;
    }
    captureDebugEvent('connection_error', {
      campaignId,
      error: sseConnection.error,
      readyState: sseConnection.readyState,
      reconnectAttempts: sseConnection.reconnectAttempts,
    });
  }, [campaignId, captureDebugEvent, sseConnection.error, sseConnection.readyState, sseConnection.reconnectAttempts]);

  useEffect(() => {
    if (fallbackApplied) return;
    if (!autoConnect) return;
    if (sseConnection.hasEverConnected) return;
    const backendOrigin = inferBackendOrigin();
    if (!backendOrigin) return;

    const isRelativeBase = !sseBasePath || !/^https?:\/\//i.test(sseBasePath);
    if (!isRelativeBase) return;

    const timer = setTimeout(() => {
      if (sseConnection.isConnected) return;
      if (sseConnection.readyState === 1) return;
      const fallbackBase = joinUrl(backendOrigin, sseBasePath || '/api/v2').replace(/\/$/, '');
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useCampaignSSE] falling back to backend origin for SSE', {
          previous: sseBasePath,
          fallbackBase,
        });
      }
      setSseBasePath(fallbackBase);
      setFallbackApplied(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [autoConnect, fallbackApplied, sseBasePath, sseConnection.hasEverConnected, sseConnection.isConnected, sseConnection.readyState]);

  const reconnectAfterFallback = sseConnection.reconnect;
  useEffect(() => {
    if (!fallbackApplied) return;
    if (!autoConnect) return;
    if (!sseUrl) return;
    reconnectAfterFallback();
  }, [fallbackApplied, autoConnect, sseUrl, reconnectAfterFallback]);

  // Reset progress when campaign ID changes
  useEffect(() => {
    setLastProgress(null);
  }, [campaignId]);

  return {
    isConnected: sseConnection.isConnected,
    hasEverConnected: sseConnection.hasEverConnected,
    readyState: sseConnection.readyState,
    connectedAt: sseConnection.connectedAt,
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
