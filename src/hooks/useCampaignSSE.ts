// File: src/hooks/useCampaignSSE.ts
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSSE, type SSEEvent } from './useSSE';
import { useAppDispatch } from '@/store/hooks';
import { phaseStarted, phaseCompleted, phaseFailed, resetPipelineExec } from '@/store/slices/pipelineExecSlice';
import { campaignApi } from '@/store/api/campaignApi';
import type { CampaignPhasesStatusResponse } from '@/lib/api-client/models/campaign-phases-status-response';
import { PipelinePhase, PhaseRunStatus as _PhaseRunStatus } from '@/utils/phaseStatus';
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
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';

// ────────────────────────────────────────────────────────────────────────────
// P2 Contract: SSE Sequence Guards
// ────────────────────────────────────────────────────────────────────────────
// Per P2 Phase State Contract §5:
// - Track lastSequence from getCampaignStatus snapshot
// - Apply lifecycle SSE events only if event.sequence > lastSequence
// - Ignore stale/out-of-order lifecycle events
// - Progress events must not change lifecycle state when phase is paused/completed/failed
// - On SSE reconnect → refetch snapshot and reset lastSequence baseline

/** Lifecycle event types that carry a sequence number */
const LIFECYCLE_EVENT_TYPES = new Set([
  'phase_started',
  'phase_completed',
  'phase_failed',
  'phase_paused',
  'phase_resumed',
]);

/** Phase statuses that block progress updates from changing lifecycle state */
const TERMINAL_PHASE_STATUSES = new Set(['paused', 'completed', 'failed']);

/**
 * Extract sequence number from SSE event payload
 * Backend emits sequence in payload.sequence or envelope.sequence
 */
const extractEventSequence = (
  payload: Record<string, unknown> | undefined,
  envelope: Record<string, unknown> | undefined
): number | undefined => {
  const seq = payload?.sequence ?? envelope?.sequence ?? payload?.sequenceNumber ?? envelope?.sequenceNumber;
  if (typeof seq === 'number' && Number.isFinite(seq) && seq > 0) {
    return seq;
  }
  return undefined;
};

/**
 * Check if an SSE event is a lifecycle event that requires sequence validation
 */
const isLifecycleEvent = (eventType: string): boolean => {
  return LIFECYCLE_EVENT_TYPES.has(eventType);
};

/**
 * Check if a phase status blocks progress updates from mutating lifecycle
 */
const isTerminalPhaseStatus = (status: string | undefined): boolean => {
  return status ? TERMINAL_PHASE_STATUSES.has(status.toLowerCase()) : false;
};

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

const _normalizeSnapshotStatus = (status: string | undefined): string | undefined => {
  if (!status) return status;
  // Snapshot uses in_progress; SSE/phase-status may emit running.
  if (status === 'running') return 'in_progress';
  return status;
};

const patchCampaignStatusPhase = (
  draft: CampaignPhasesStatusResponse | undefined,
  phase: string,
  patch: { status?: string; progressPercentage?: number; errorMessage?: string }
): void => {
  if (!draft?.phases || !Array.isArray(draft.phases)) {
    return;
  }

  const normalizedTarget = normalizeToApiPhase(String(phase).toLowerCase());
  if (!normalizedTarget) {
    return;
  }

  for (const entry of draft.phases) {
    const normalizedEntry = normalizeToApiPhase(String((entry as unknown as { phase?: unknown })?.phase ?? '').toLowerCase());
    if (!normalizedEntry || normalizedEntry !== normalizedTarget) {
      continue;
    }
    if (typeof patch.status === 'string') {
      (entry as unknown as { status?: unknown }).status = patch.status;
    }
    if (typeof patch.progressPercentage === 'number' && Number.isFinite(patch.progressPercentage)) {
      (entry as unknown as { progressPercentage?: unknown }).progressPercentage = patch.progressPercentage;
    }
    if (typeof patch.errorMessage === 'string') {
      (entry as unknown as { errorMessage?: unknown }).errorMessage = patch.errorMessage;
    }
    break;
  }
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const unwrapEventPayload = (
  data: unknown
): {
  envelope?: Record<string, unknown>;
  payload?: Record<string, unknown>;
} => {
  if (!isPlainObject(data)) {
    return {};
  }
  const envelope = data as Record<string, unknown>;
  const canonical = isPlainObject(envelope.payload) ? (envelope.payload as Record<string, unknown>) : undefined;
  const legacyData = isPlainObject(envelope.data) ? (envelope.data as Record<string, unknown>) : undefined;
  const payload = canonical ?? legacyData ?? envelope;
  return { envelope, payload };
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const coerceString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const deriveCanonicalProgress = (
  payload: Record<string, unknown> | undefined,
  fallbackTimestamp?: string
): CampaignProgress | undefined => {
  if (!payload) {
    return undefined;
  }
  const overall = isPlainObject(payload.overall) ? (payload.overall as Record<string, unknown>) : undefined;
  if (!overall) {
    return undefined;
  }

  const timestamp = coerceString(payload.timestamp) || fallbackTimestamp || new Date().toISOString();
  const currentPhase =
    (payload.current_phase as CampaignPhase | string | undefined) ||
    (payload.currentPhase as CampaignPhase | string | undefined) ||
    (payload.phase as CampaignPhase | string | undefined) ||
    (overall.current_phase as CampaignPhase | string | undefined) ||
    (overall.currentPhase as CampaignPhase | string | undefined) ||
    'unknown';

  return {
    current_phase: (currentPhase as CampaignPhase) || ('unknown' as CampaignPhase),
    progress_pct: coerceNumber(overall.percentComplete) ?? coerceNumber(payload.progress_pct) ?? 0,
    items_processed: coerceNumber(overall.processedDomains) ?? coerceNumber(payload.items_processed) ?? 0,
    items_total: coerceNumber(overall.totalDomains) ?? coerceNumber(payload.items_total) ?? 0,
    status: coerceString(overall.status) ?? coerceString(payload.status) ?? 'unknown',
    message: coerceString(payload.message) ?? coerceString(overall.message),
    timestamp,
  };
};

const resolveCampaignId = (
  eventCampaignId: string | undefined,
  payload?: Record<string, unknown>,
  envelope?: Record<string, unknown>,
  fallback?: string
): string => {
  const candidates = [
    eventCampaignId,
    payload?.campaign_id,
    payload?.campaignId,
    payload?.campaignID,
    envelope?.campaign_id,
    envelope?.campaignId,
    fallback,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }
  return '';
};

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

export const CAMPAIGN_SSE_DEBUG_KEY = '__campaignSSEEvents';
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

  // ─────────────────────────────────────────────────────────────────────────
  // P2 Contract: Sequence tracking for SSE guards
  // ─────────────────────────────────────────────────────────────────────────
  // Track the lastSequence from snapshot to guard against stale/out-of-order events
  const lastSequenceRef = useRef<number>(0);
  
  // Query the campaign status to get the baseline lastSequence
  // Skip if no campaignId to avoid unnecessary queries
  const { data: statusSnapshot } = campaignApi.endpoints.getCampaignStatus.useQuery(
    campaignId ?? '',
    { skip: !campaignId }
  );
  
  // Update lastSequenceRef when snapshot changes (including on reconnect refetch)
  useEffect(() => {
    if (statusSnapshot?.lastSequence !== undefined) {
      const snapshotSeq = statusSnapshot.lastSequence;
      // Only update if snapshot has a higher sequence (authoritative)
      if (snapshotSeq >= lastSequenceRef.current) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[useCampaignSSE] sequence baseline updated from snapshot', {
            campaignId,
            previousSeq: lastSequenceRef.current,
            newSeq: snapshotSeq,
          });
        }
        lastSequenceRef.current = snapshotSeq;
      }
    }
  }, [statusSnapshot?.lastSequence, campaignId]);

  /**
   * Get current phase status from the cached snapshot
   * Used to guard progress events from changing lifecycle state of terminal phases
   */
  const getPhaseStatus = useCallback((phase: string): string | undefined => {
    if (!statusSnapshot?.phases) return undefined;
    const normalizedPhase = normalizeToApiPhase(phase.toLowerCase());
    if (!normalizedPhase) return undefined;
    
    const phaseEntry = statusSnapshot.phases.find((p) => {
      const entryPhase = normalizeToApiPhase(String((p as unknown as Record<string, unknown>).phase ?? '').toLowerCase());
      return entryPhase === normalizedPhase;
    });
    
    return (phaseEntry as unknown as Record<string, unknown> | undefined)?.status as string | undefined;
  }, [statusSnapshot]);

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
    const { envelope: dataObj, payload } = unwrapEventPayload(event.data);

    const payloadCampaignId = resolveCampaignId(
      typeof event.campaign_id === 'string' ? event.campaign_id : undefined,
      payload,
      dataObj,
      campaignId
    );

    const resolvedCampaignId = payloadCampaignId || '';

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

    // ─────────────────────────────────────────────────────────────────────────
    // P2 Contract: Sequence guard for lifecycle events
    // ─────────────────────────────────────────────────────────────────────────
    // For lifecycle events (phase_started, phase_completed, phase_failed, phase_paused, phase_resumed),
    // only apply if event.sequence > lastSequence. This prevents out-of-order/stale events.
    const eventSequence = extractEventSequence(payload, dataObj);
    const eventType = event.event ?? '';
    
    if (isLifecycleEvent(eventType)) {
      if (eventSequence !== undefined) {
        if (eventSequence <= lastSequenceRef.current) {
          // Stale/out-of-order lifecycle event - ignore
          captureDebugEvent('lifecycle_event_stale', {
            campaignId: resolvedCampaignId,
            eventType,
            eventSequence,
            lastSequence: lastSequenceRef.current,
          });
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[useCampaignSSE] Ignoring stale lifecycle event', {
              eventType,
              eventSequence,
              lastSequence: lastSequenceRef.current,
            });
          }
          return;
        }
        // Valid lifecycle event - update sequence baseline
        lastSequenceRef.current = eventSequence;
        captureDebugEvent('lifecycle_event_accepted', {
          campaignId: resolvedCampaignId,
          eventType,
          eventSequence,
        });
      }
      // If no sequence on lifecycle event, still process it (backwards compat)
      // but log a warning in dev
      else if (process.env.NODE_ENV !== 'production') {
        console.warn('[useCampaignSSE] Lifecycle event missing sequence number', {
          eventType,
          payload,
        });
      }
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
            : undefined) ||
          deriveCanonicalProgress(payload, typeof event.timestamp === 'string' ? event.timestamp : undefined);
        if (progressData) {
          setLastProgress(progressData);
          handlers.onProgress?.(resolvedCampaignId, progressData);
          
          // ─────────────────────────────────────────────────────────────────
          // P2 Contract: Guard progress events from changing terminal phase state
          // ─────────────────────────────────────────────────────────────────
          // Progress events must not change lifecycle state when phase is paused/completed/failed.
          // We can still update progress percentage, but NOT synthesize completion or change status.
          const rawPhase =
            progressData.current_phase ||
            (typeof payload?.current_phase === 'string' ? (payload.current_phase as string) : undefined);
          const phase = rawPhase ? mapPhase(rawPhase) : undefined;
          const currentPhaseStatus = phase ? getPhaseStatus(phase) : undefined;
          const isPhaseTerminal = isTerminalPhaseStatus(currentPhaseStatus);
          
          if (isPhaseTerminal) {
            // Phase is in terminal state - only update progress percentage, not lifecycle
            captureDebugEvent('progress_blocked_terminal', {
              campaignId: resolvedCampaignId,
              phase,
              status: currentPhaseStatus,
              percent: progressData.progress_pct,
            });
            if (process.env.NODE_ENV !== 'production') {
              console.log('[useCampaignSSE] Progress event blocked from changing terminal phase state', {
                phase,
                status: currentPhaseStatus,
                progress: progressData.progress_pct,
              });
            }
            // Still update progress percentage in cache (informational only)
            if (typeof progressData.progress_pct === 'number' && Number.isFinite(progressData.progress_pct) && phase) {
              dispatch(
                campaignApi.util.updateQueryData('getCampaignStatus', resolvedCampaignId, (draft) => {
                  if (!draft) return;
                  // Only update percentage, NOT status
                  patchCampaignStatusPhase(draft, phase, {
                    progressPercentage: progressData.progress_pct,
                  });
                })
              );
            }
          } else {
            // Phase is NOT terminal - allow normal processing including synthesized completion
            const pct = progressData.progress_pct;
            if (rawPhase && typeof pct === 'number' && pct >= 100) {
              if (!completedRef.current.has(`${resolvedCampaignId}:${phase}`)) {
                completedRef.current.add(`${resolvedCampaignId}:${phase}`);
                const pipelinePhase = toPipelinePhase(phase as string);
                if (pipelinePhase) {
                  dispatch(phaseCompleted({ campaignId: resolvedCampaignId, phase: pipelinePhase }));
                }
                dispatch(
                  campaignApi.util.updateQueryData('getCampaignStatus', resolvedCampaignId, (draft) => {
                    patchCampaignStatusPhase(draft, phase as string, { status: 'completed', progressPercentage: 100 });
                  })
                );
                synthesizedCompletion = true;
              }
            }

            // Snapshot-centric updates: patch overall + current phase progress.
            if (typeof progressData.progress_pct === 'number' && Number.isFinite(progressData.progress_pct)) {
              dispatch(
                campaignApi.util.updateQueryData('getCampaignStatus', resolvedCampaignId, (draft) => {
                  if (!draft) return;
                  draft.overallProgressPercentage = progressData.progress_pct;
                  if (phase) {
                    patchCampaignStatusPhase(draft, phase, {
                      progressPercentage: progressData.progress_pct,
                    });
                  }
                })
              );
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

        // Snapshot-centric: mark phase in progress.
        dispatch(
          campaignApi.util.updateQueryData('getCampaignStatus', resolvedCampaignId, (draft) => {
            patchCampaignStatusPhase(draft, phase, { status: 'in_progress' });
          })
        );
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
          dispatch(
            campaignApi.util.updateQueryData('getCampaignStatus', resolvedCampaignId, (draft) => {
              patchCampaignStatusPhase(draft, phase, { status: 'completed', progressPercentage: 100 });
            })
          );
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

        dispatch(
          campaignApi.util.updateQueryData('getCampaignStatus', resolvedCampaignId, (draft) => {
            patchCampaignStatusPhase(draft, phase, { status: 'failed', errorMessage: error });
          })
        );
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

      case 'phase_paused': {
        const backendPhase = (payload?.phase as string | undefined) || (dataObj?.phase as string | undefined);
        const phase = mapPhase(backendPhase);
        dispatch(
          campaignApi.util.updateQueryData('getCampaignStatus', resolvedCampaignId, (draft) => {
            patchCampaignStatusPhase(draft, phase, { status: 'paused' });
          })
        );
        captureDebugEvent('phase_paused', {
          campaignId: resolvedCampaignId,
          phase,
        });
        break;
      }

      case 'phase_resumed': {
        const backendPhase = (payload?.phase as string | undefined) || (dataObj?.phase as string | undefined);
        const phase = mapPhase(backendPhase);
        dispatch(
          campaignApi.util.updateQueryData('getCampaignStatus', resolvedCampaignId, (draft) => {
            patchCampaignStatusPhase(draft, phase, { status: 'in_progress' });
          })
        );
        captureDebugEvent('phase_resumed', {
          campaignId: resolvedCampaignId,
          phase,
        });
        break;
      }

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
  }, [dispatch, campaignId, captureDebugEvent, getPhaseStatus]);

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

  // P1 Fix: On SSE reconnect, force a fresh getCampaignStatus snapshot to ensure
  // we don't continue with stale cache data after a network interruption.
  const prevConnectedAtRef = useRef<string | null>(null);
  useEffect(() => {
    const currentConnectedAt = sseConnection.connectedAt;
    const previousConnectedAt = prevConnectedAtRef.current;

    // First connection - just store the timestamp
    if (!previousConnectedAt && currentConnectedAt) {
      prevConnectedAtRef.current = currentConnectedAt;
      return;
    }

    // Reconnection detected - connectedAt changed
    if (previousConnectedAt && currentConnectedAt && previousConnectedAt !== currentConnectedAt) {
      prevConnectedAtRef.current = currentConnectedAt;

      // If we have a campaignId, invalidate and refetch the status to resync
      if (campaignId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[useCampaignSSE] SSE reconnected, invalidating getCampaignStatus to resync', {
            campaignId,
            previousConnectedAt,
            currentConnectedAt,
          });
        }
        captureDebugEvent('reconnect_resync', {
          campaignId,
          previousConnectedAt,
          currentConnectedAt,
        });

        // Invalidate the campaign cache to force a fresh fetch
        dispatch(
          campaignApi.util.invalidateTags([{ type: 'Campaign', id: campaignId }])
        );

        // Also reset the pipelineExec slice to avoid parallel stale state
        dispatch(resetPipelineExec({ campaignId }));

        // Clear local deduplication state so we process fresh events
        completedRef.current.clear();
        
        // P2 Contract: Reset sequence baseline on reconnect
        // The snapshot refetch will restore it from the authoritative server state
        // This ensures we don't reject valid events after reconnect
        lastSequenceRef.current = 0;
        captureDebugEvent('sequence_baseline_reset', {
          campaignId,
          reason: 'sse_reconnect',
        });
      }
    }
  }, [sseConnection.connectedAt, campaignId, dispatch, captureDebugEvent]);

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
