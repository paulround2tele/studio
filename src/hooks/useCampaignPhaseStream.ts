/**
 * Campaign Phase Stream Hook (Phase B)
 * Real-time phase updates via SSE for UX refactor components
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useCampaignSSE,
  type CampaignProgress,
  type PhaseEvent,
  type CampaignSSEEvents,
} from './useCampaignSSE';
import type { PipelinePhase } from '@/components/refactor/campaign/PipelineBar';
import { getPhaseDisplayName } from '@/lib/utils/phaseMapping';
import { API_PHASE_ORDER, normalizeToApiPhase, type ApiPhase } from '@/lib/utils/phaseNames';

export interface PhaseUpdateEvent {
  campaignId: string;
  phase: string;
  status: 'not_started' | 'ready' | 'configured' | 'in_progress' | 'paused' | 'completed' | 'failed';
  progressPercentage: number;
  startedAt?: string;
  completedAt?: string;
  message?: string;
  lastMessage?: string;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  lastEventAt?: string;
  failedAt?: string;
}

interface UseCampaignPhaseStreamOptions {
  enabled?: boolean;
  onPhaseUpdate?: (event: PhaseUpdateEvent) => void;
  onError?: (error: string) => void;
}

interface UseCampaignPhaseStreamReturn {
  phases: PipelinePhase[];
  isConnected: boolean;
  hasEverConnected: boolean;
  readyState: number;
  connectedAt: string | null;
  error: string | null;
  lastUpdate: number | null;
}

const buildDefaultPhase = (phase: ApiPhase): PipelinePhase => ({
  key: phase,
  label: getPhaseDisplayName(phase),
  status: 'not_started',
  progressPercentage: 0,
});

// Default phase configuration matching canonical API order
export const DEFAULT_PHASES: PipelinePhase[] = API_PHASE_ORDER.map(buildDefaultPhase);

const SAFE_PROGRESS_MAX = 100;
const PHASE_META_STORAGE_PREFIX = 'campaignPhaseMeta:';
const PHASE_DEBUG_HISTORY_LIMIT = 200;
const PHASE_DEBUG_UPDATES_KEY = '__phaseStreamUpdates';

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

const pushPhaseDebugEntry = (key: string, entry: unknown, limit: number): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const win = window as unknown as Record<string, unknown>;
  const history = Array.isArray(win[key]) ? (win[key] as unknown[]) : [];
  win[key] = [...history, entry].slice(-limit);
};

type PersistedPhaseMeta = Pick<PipelinePhase, 'lastMessage' | 'errorMessage' | 'lastEventAt' | 'failedAt'> & {
  errorDetails?: Record<string, unknown>;
};

interface PhaseStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getPhaseMetaStorage(): PhaseStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage ?? null;
  } catch (error) {
    console.warn('Campaign phase metadata storage unavailable', error);
    return null;
  }
}

function serializePhaseMeta(phases: PipelinePhase[]): Record<string, PersistedPhaseMeta> {
  return phases.reduce<Record<string, PersistedPhaseMeta>>((acc, phase) => {
    const meta: PersistedPhaseMeta = {};
    if (typeof phase.lastMessage === 'string' && phase.lastMessage.length > 0) {
      meta.lastMessage = phase.lastMessage;
    }
    if (typeof phase.errorMessage === 'string' && phase.errorMessage.length > 0) {
      meta.errorMessage = phase.errorMessage;
    }
    if (isNonEmptyRecord(phase.errorDetails)) {
      meta.errorDetails = { ...phase.errorDetails };
    }
    if (typeof phase.lastEventAt === 'string' && phase.lastEventAt.length > 0) {
      meta.lastEventAt = phase.lastEventAt;
    }
    if (typeof phase.failedAt === 'string' && phase.failedAt.length > 0) {
      meta.failedAt = phase.failedAt;
    }
    if (Object.keys(meta).length > 0) {
      acc[phase.key] = meta;
    }
    return acc;
  }, {});
}

function persistPhaseMeta(campaignId: string, phases: PipelinePhase[]): void {
  const storage = getPhaseMetaStorage();
  if (!storage) {
    return;
  }

  const payload = serializePhaseMeta(phases);
  const storageKey = `${PHASE_META_STORAGE_PREFIX}${campaignId}`;

  try {
    if (Object.keys(payload).length > 0) {
      storage.setItem(storageKey, JSON.stringify({ phases: payload }));
    } else {
      storage.removeItem(storageKey);
    }
  } catch (error) {
    console.warn('Failed to persist campaign phase metadata', error);
  }
}

function loadPersistedPhaseMeta(campaignId: string): Record<string, PersistedPhaseMeta> | null {
  const storage = getPhaseMetaStorage();
  if (!storage) {
    return null;
  }

  const storageKey = `${PHASE_META_STORAGE_PREFIX}${campaignId}`;
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { phases?: Record<string, PersistedPhaseMeta> } | null;
    if (!parsed || typeof parsed !== 'object' || !parsed.phases || typeof parsed.phases !== 'object') {
      return null;
    }

    const normalizedEntries = Object.entries(parsed.phases).reduce<Record<string, PersistedPhaseMeta>>(
      (acc, [key, value]) => {
        if (!value || typeof value !== 'object') {
          return acc;
        }
        const metaCandidate = value as Record<string, unknown>;
        const normalized: PersistedPhaseMeta = {};
        if (typeof metaCandidate.lastMessage === 'string' && metaCandidate.lastMessage.length > 0) {
          normalized.lastMessage = metaCandidate.lastMessage;
        }
        if (typeof metaCandidate.errorMessage === 'string' && metaCandidate.errorMessage.length > 0) {
          normalized.errorMessage = metaCandidate.errorMessage;
        }
        if (isNonEmptyRecord(metaCandidate.errorDetails)) {
          normalized.errorDetails = { ...(metaCandidate.errorDetails as Record<string, unknown>) };
        }
        if (typeof metaCandidate.lastEventAt === 'string' && metaCandidate.lastEventAt.length > 0) {
          normalized.lastEventAt = metaCandidate.lastEventAt;
        }
        if (typeof metaCandidate.failedAt === 'string' && metaCandidate.failedAt.length > 0) {
          normalized.failedAt = metaCandidate.failedAt;
        }
        if (Object.keys(normalized).length > 0) {
          acc[key] = normalized;
        }
        return acc;
      },
      {}
    );

    return Object.keys(normalizedEntries).length > 0 ? normalizedEntries : null;
  } catch (error) {
    console.warn('Failed to load campaign phase metadata', error);
    return null;
  }
}

function applyPersistedPhaseMeta(
  phases: PipelinePhase[],
  meta: Record<string, PersistedPhaseMeta> | null
): PipelinePhase[] {
  if (!meta) {
    return phases;
  }

  return phases.map(phase => {
    const patch = meta[phase.key];
    if (!patch) {
      return phase;
    }
    return { ...phase, ...patch };
  });
}

/**
 * Hook for real-time campaign phase updates via SSE
 * Connects to /api/v2/sse/campaigns/{id} and reconciles backend event types
 */

export function useCampaignPhaseStream(
  campaignId: string | null,
  options: UseCampaignPhaseStreamOptions = {}
): UseCampaignPhaseStreamReturn {
  const { enabled: _enabled = true, onPhaseUpdate, onError } = options;

  const [phases, setPhases] = useState<PipelinePhase[]>(cloneDefaultPhases());
  const phasesRef = useRef<PipelinePhase[]>(phases);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  useEffect(() => {
    phasesRef.current = phases;
  }, [phases]);

  const shouldConnect = Boolean(_enabled && campaignId);

  const logRawEvent = useCallback(
    (eventType: string, payload: unknown) => {
      if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
        return;
      }

      const entry = {
        timestamp: new Date().toISOString(),
        campaignId,
        eventType,
        payload,
      };

      const win = window as unknown as Record<string, unknown>;
      const historyKey = '__phaseStreamRawEvents';
      const history = Array.isArray(win[historyKey]) ? (win[historyKey] as unknown[]) : [];
      const nextHistory = [...history, entry].slice(-100);
      win[historyKey] = nextHistory;

      console.debug('[useCampaignPhaseStream] raw event', entry);
    },
    [campaignId]
  );

  const recordPhaseUpdateDebug = useCallback(
    (label: string, detail: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
        return;
      }
      const entry = {
        timestamp: new Date().toISOString(),
        campaignId,
        label,
        detail: sanitizeDebugPayload(detail),
      };
      pushPhaseDebugEntry(PHASE_DEBUG_UPDATES_KEY, entry, PHASE_DEBUG_HISTORY_LIMIT);
      (window as typeof window & { __phaseStreamLastEntry?: typeof entry }).__phaseStreamLastEntry = entry;
      if (process.env.NEXT_PUBLIC_SSE_DEBUG === 'verbose') {
        console.debug('[useCampaignPhaseStream] phase update', entry);
      }
    },
    [campaignId]
  );

  const updatePhaseState = useCallback(
    (phaseKey: ApiPhase, updates: Partial<PipelinePhase>): PipelinePhase | null => {
      const { nextPhases, updatedPhase } = reconcilePhaseUpdate(phasesRef.current, phaseKey, updates);
      phasesRef.current = nextPhases;
      setPhases(nextPhases);
      if (campaignId) {
        persistPhaseMeta(campaignId, nextPhases);
      }
      return updatedPhase ?? null;
    },
    [campaignId]
  );

  const emitPhaseUpdate = useCallback(
    (
      phase: ApiPhase,
      patch: Partial<PipelinePhase>,
      meta?: { message?: string; errorMessage?: string; errorDetails?: Record<string, unknown>; timestamp?: string }
    ) => {
      const patchWithMeta: Partial<PipelinePhase> = { ...patch };
      const timestamp = meta?.timestamp ?? new Date().toISOString();
      const hasMessage = typeof meta?.message === 'string' && meta.message.length > 0;
      const isFailure = patch.status === 'failed';
      const explicitError = typeof patch.errorMessage === 'string' && patch.errorMessage.length > 0 ? patch.errorMessage : undefined;

      if (hasMessage) {
        patchWithMeta.lastMessage = meta?.message;
        patchWithMeta.lastEventAt = timestamp;
      }

      if (typeof patch.failedAt === 'string' && patch.failedAt.length > 0) {
        patchWithMeta.failedAt = patch.failedAt;
      }
      if (isFailure && !patchWithMeta.failedAt) {
        patchWithMeta.failedAt = meta?.timestamp ?? timestamp;
      } else if (patch.status && patch.status !== 'failed' && typeof patch.failedAt === 'undefined') {
        patchWithMeta.failedAt = undefined;
      }

      const resolvedErrorDetails = ensureErrorDetails(
        patch.errorDetails ?? meta?.errorDetails,
        explicitError ?? meta?.errorMessage ?? meta?.message ?? (isFailure ? 'Phase failed' : undefined)
      );
      const resolvedErrorMessage =
        explicitError ??
        meta?.errorMessage ??
        extractDetailsMessage(resolvedErrorDetails) ??
        meta?.message ??
        (isFailure ? 'Phase failed' : undefined);

      if (resolvedErrorMessage) {
        patchWithMeta.errorMessage = resolvedErrorMessage;
        patchWithMeta.lastEventAt = timestamp;
      } else if (patch.status && patch.status !== 'failed') {
        patchWithMeta.errorMessage = undefined;
      }

      if (resolvedErrorDetails) {
        patchWithMeta.errorDetails = resolvedErrorDetails;
      } else if (patch.status && patch.status !== 'failed') {
        patchWithMeta.errorDetails = undefined;
      }

      const next = updatePhaseState(phase, patchWithMeta);
      recordPhaseUpdateDebug('phase_patch', {
        phase,
        patch: patchWithMeta,
        meta: meta ? sanitizeDebugPayload(meta) : undefined,
        nextSnapshot: next ? sanitizeDebugPayload(next) : null,
      });
      if (!campaignId || !next) {
        recordPhaseUpdateDebug('phase_patch_skipped', {
          phase,
          reason: 'missing_campaign_or_phase',
          hasCampaignId: Boolean(campaignId),
        });
        return;
      }
      setLastUpdate(Date.now());
      onPhaseUpdate?.({
        campaignId,
        phase,
        status: next.status,
        progressPercentage: next.progressPercentage,
        startedAt: next.startedAt,
        completedAt: next.completedAt,
        message: meta?.message ?? next.lastMessage,
        lastMessage: next.lastMessage,
        errorMessage: next.errorMessage,
        errorDetails: next.errorDetails,
        lastEventAt: next.lastEventAt,
        failedAt: next.failedAt,
      });
      recordPhaseUpdateDebug('phase_patch_committed', {
        phase,
        status: next.status,
        progressPercentage: next.progressPercentage,
        lastMessage: next.lastMessage,
        errorMessage: next.errorMessage,
      });
    },
    [campaignId, onPhaseUpdate, recordPhaseUpdateDebug, updatePhaseState]
  );

  const handleProgress = useCallback(
    (_id: string, progress: CampaignProgress) => {
      logRawEvent('campaign_progress', { eventId: _id, payload: progress });
      const normalizedPhase = normalizeToApiPhase(String(progress.current_phase || '').toLowerCase());
      if (!normalizedPhase) {
        return;
      }

      recordPhaseUpdateDebug('progress_event', {
        campaignId,
        phase: normalizedPhase,
        status: progress.status,
        percent: progress.progress_pct,
        message: progress.message,
      });

      const updates: Partial<PipelinePhase> = {};
      const mappedStatus = mapBackendStatus(progress.status);
      if (mappedStatus) {
        updates.status = mappedStatus;
      }

      const progressRecord =
        typeof progress === 'object' && progress !== null
          ? (progress as unknown as Record<string, unknown>)
          : undefined;
      if (progressRecord) {
        const value = extractProgressPercentage(progressRecord);
        if (value !== null) {
          updates.progressPercentage = clampProgress(value);
        }
      }

      emitPhaseUpdate(normalizedPhase, updates, {
        message: progress.message,
        timestamp: (progress as { timestamp?: string }).timestamp,
      });
    },
    [campaignId, emitPhaseUpdate, logRawEvent, recordPhaseUpdateDebug]
  );

  const handlePhaseStarted = useCallback(
    (_id: string, event: PhaseEvent) => {
      logRawEvent('phase_started', { eventId: _id, payload: event });
      const normalizedPhase = normalizeToApiPhase(String(event.phase || '').toLowerCase());
      if (!normalizedPhase) {
        return;
      }

      recordPhaseUpdateDebug('phase_started_event', {
        campaignId,
        phase: normalizedPhase,
        status: event.status,
        message: event.message,
      });

      const startedAt = extractTimestamp(event.results, ['started_at', 'startedAt']);
      const backendStatus = mapBackendStatus(event.status);
      const nextStatus: PipelinePhase['status'] = backendStatus ?? 'in_progress';

      emitPhaseUpdate(
        normalizedPhase,
        {
          status: nextStatus,
          ...(startedAt ? { startedAt } : {}),
        },
        {
          message: event.message,
          timestamp: (event as { timestamp?: string }).timestamp,
        }
      );
    },
    [campaignId, emitPhaseUpdate, logRawEvent, recordPhaseUpdateDebug]
  );

  const handlePhaseCompleted = useCallback(
    (_id: string, event: PhaseEvent) => {
      logRawEvent('phase_completed', { eventId: _id, payload: event });
      const normalizedPhase = normalizeToApiPhase(String(event.phase || '').toLowerCase());
      if (!normalizedPhase) {
        return;
      }

      recordPhaseUpdateDebug('phase_completed_event', {
        campaignId,
        phase: normalizedPhase,
        message: event.message,
      });

      const progressValue = extractProgressPercentage(event.results ?? {});
      const startedAt = extractTimestamp(event.results, ['started_at', 'startedAt']);
      const completedAt = extractTimestamp(event.results, ['completed_at', 'completedAt']);

      emitPhaseUpdate(
        normalizedPhase,
        {
          status: 'completed',
          progressPercentage: clampProgress(progressValue ?? SAFE_PROGRESS_MAX),
          ...(startedAt ? { startedAt } : {}),
          ...(completedAt ? { completedAt } : {}),
        },
        {
          message: event.message,
          timestamp: (event as { timestamp?: string }).timestamp,
        }
      );
    },
    [campaignId, emitPhaseUpdate, logRawEvent, recordPhaseUpdateDebug]
  );

  const handlePhaseFailed = useCallback(
    (_id: string, event: PhaseEvent) => {
      logRawEvent('phase_failed', { eventId: _id, payload: event });
      const normalizedPhase = normalizeToApiPhase(String(event.phase || '').toLowerCase());
      if (!normalizedPhase) {
        return;
      }

      recordPhaseUpdateDebug('phase_failed_event', {
        campaignId,
        phase: normalizedPhase,
        message: event.message,
        error: event.error,
      });

      const failedAt =
        extractTimestamp(event.results, ['failed_at', 'failedAt']) ||
        (event as { timestamp?: string }).timestamp;
      const errorPayload = event.error ?? (event.results?.error ? String(event.results.error) : undefined);
      const errorDetails = extractErrorDetailsFromResults(event.results);

      emitPhaseUpdate(
        normalizedPhase,
        {
          status: 'failed',
          ...(failedAt ? { failedAt } : {}),
        },
        {
          message: event.message,
          errorMessage: errorPayload,
          errorDetails,
          timestamp: failedAt ?? (event as { timestamp?: string }).timestamp,
        }
      );
      if (errorPayload && onError) {
        onError(String(errorPayload));
      }
    },
    [campaignId, emitPhaseUpdate, logRawEvent, onError, recordPhaseUpdateDebug]
  );

  const handleEventError = useCallback(
    (_id: string, errorMessage: string) => {
      logRawEvent('stream_error', { eventId: _id, errorMessage });
      onError?.(errorMessage);
    },
    [logRawEvent, onError]
  );

  const sseHandlers = useMemo<CampaignSSEEvents | undefined>(() => {
    if (!shouldConnect) {
      return undefined;
    }

    return {
      onProgress: handleProgress,
      onPhaseStarted: handlePhaseStarted,
      onPhaseCompleted: handlePhaseCompleted,
      onPhaseFailed: handlePhaseFailed,
      onError: handleEventError,
    };
  }, [shouldConnect, handleProgress, handlePhaseStarted, handlePhaseCompleted, handlePhaseFailed, handleEventError]);

  const {
    isConnected,
    hasEverConnected,
    readyState,
    connectedAt,
    error: sseError,
  } = useCampaignSSE({
    campaignId: shouldConnect ? campaignId ?? undefined : undefined,
    autoConnect: shouldConnect,
    events: sseHandlers,
  });

  const isLive = isConnected || hasEverConnected;

  useEffect(() => {
    setLastUpdate(null);
    const base = cloneDefaultPhases();
    const next = campaignId ? applyPersistedPhaseMeta(base, loadPersistedPhaseMeta(campaignId)) : base;
    phasesRef.current = next;
    setPhases(next);
  }, [campaignId, shouldConnect]);

  useEffect(() => {
    if (sseError) {
      onError?.(sseError);
    }
  }, [sseError, onError]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
      return;
    }
    const snapshot = {
      campaignId,
      isConnected: isLive,
      hasEverConnected,
      readyState,
      error: sseError,
      lastUpdate,
    };
    const win = window as unknown as Record<string, unknown>;
    win.__phaseStreamState = snapshot;
    const history = Array.isArray(win.__phaseStreamHistory) ? (win.__phaseStreamHistory as unknown[]) : [];
    history.push(snapshot);
    win.__phaseStreamHistory = history.slice(-20);
    console.log('[useCampaignPhaseStream] connection state', snapshot);
  }, [campaignId, isLive, hasEverConnected, readyState, sseError, lastUpdate]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
      return;
    }
    const win = window as typeof window & {
      __phaseStreamPhases?: PipelinePhase[];
      __phaseStreamLastUpdateTs?: number | null;
    };
    win.__phaseStreamPhases = phases.map(phase => ({ ...phase }));
    win.__phaseStreamLastUpdateTs = lastUpdate;
  }, [phases, lastUpdate]);

  return {
    phases,
    isConnected: isLive,
    hasEverConnected,
    readyState,
    connectedAt,
    error: sseError,
    lastUpdate,
  };
}

/**
 * Hook to get overall progress percentage from phases
 */
export function useOverallProgress(phases: PipelinePhase[]): number {
  const totalProgress = phases.reduce((sum, phase) => sum + phase.progressPercentage, 0);
  return phases.length > 0 ? totalProgress / phases.length : 0;
}

/**
 * Hook to get the current active phase
 */
export function useCurrentPhase(phases: PipelinePhase[]): PipelinePhase | null {
  return phases.find(phase => phase.status === 'in_progress') || 
         phases.find(phase => phase.status === 'ready') ||
         phases.find(phase => phase.status === 'configured') ||
         null;
}

function cloneDefaultPhases(): PipelinePhase[] {
  return DEFAULT_PHASES.map(phase => ({ ...phase }));
}

function reconcilePhaseUpdate(
  currentPhases: PipelinePhase[],
  phaseKey: ApiPhase,
  updates: Partial<PipelinePhase>
): { nextPhases: PipelinePhase[]; updatedPhase: PipelinePhase } {
  const phaseMap = new Map<string, PipelinePhase>();

  DEFAULT_PHASES.forEach(defaultPhase => {
    phaseMap.set(defaultPhase.key, { ...defaultPhase });
  });

  currentPhases.forEach(existing => {
    const current = phaseMap.get(existing.key);
    if (current) {
      phaseMap.set(existing.key, { ...current, ...existing });
    } else {
      phaseMap.set(existing.key, { ...existing });
    }
  });

  const baseline = phaseMap.get(phaseKey) ?? buildDefaultPhase(phaseKey);
  const nextPhase = { ...baseline, ...updates, key: phaseKey };
  phaseMap.set(phaseKey, nextPhase);

  const ordered = API_PHASE_ORDER
    .map(key => phaseMap.get(key))
    .filter((phase): phase is PipelinePhase => Boolean(phase))
    .map(phase => ({ ...phase }));

  const extras = Array.from(phaseMap.entries())
    .filter(([key]) => !API_PHASE_ORDER.includes(key as ApiPhase))
    .map(([, value]) => ({ ...value }));

  const nextPhases = [...ordered, ...extras];
  return { nextPhases, updatedPhase: nextPhase };
}

function isNonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length > 0;
}

function normalizeErrorDetailsCandidate(value: unknown): Record<string, unknown> | undefined {
  if (!isNonEmptyRecord(value)) {
    return undefined;
  }
  return { ...(value as Record<string, unknown>) };
}

function extractDetailsMessage(details?: Record<string, unknown>): string | undefined {
  if (!details) {
    return undefined;
  }
  const candidate = details['message'];
  if (typeof candidate !== 'string') {
    return undefined;
  }
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function ensureErrorDetails(details?: Record<string, unknown>, fallbackMessage?: string): Record<string, unknown> | undefined {
  const normalizedMessage = typeof fallbackMessage === 'string' ? fallbackMessage.trim() : '';
  const normalizedDetails = normalizeErrorDetailsCandidate(details);
  if (normalizedDetails) {
    if (!extractDetailsMessage(normalizedDetails) && normalizedMessage) {
      return { ...normalizedDetails, message: normalizedMessage };
    }
    return normalizedDetails;
  }
  if (!normalizedMessage) {
    return undefined;
  }
  return { message: normalizedMessage };
}

function extractErrorDetailsFromResults(results?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!results) {
    return undefined;
  }
  const payload = results['errorDetails'] ?? results['error_details'];
  return normalizeErrorDetailsCandidate(payload);
}
function clampProgress(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value > SAFE_PROGRESS_MAX) {
    return SAFE_PROGRESS_MAX;
  }
  return value;
}

function mapBackendStatus(status?: unknown): PipelinePhase['status'] | null {
  const value = typeof status === 'string' ? status.toLowerCase() : '';
  switch (value) {
    case 'not_started':
    case 'pending':
      return 'not_started';
    case 'ready':
      return 'ready';
    case 'configured':
      return 'configured';
    case 'in_progress':
    case 'running':
    case 'started':
      return 'in_progress';
    case 'paused':
      return 'paused';
    case 'completed':
    case 'complete':
    case 'done':
      return 'completed';
    case 'failed':
    case 'error':
    case 'errored':
      return 'failed';
    default:
      return null;
  }
}

function extractProgressPercentage(source: Record<string, unknown>): number | null {
  const keys = ['progress_pct', 'progressPct', 'percent_complete', 'percentComplete'];
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function extractTimestamp(
  source: Record<string, unknown> | undefined,
  keys: string[]
): string | undefined {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];
    if (!value) {
      continue;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      // Assume milliseconds when the magnitude is large, otherwise seconds.
      const coerced = value > 1e12 ? new Date(value) : new Date(value * 1000);
      if (!Number.isNaN(coerced.getTime())) {
        return coerced.toISOString();
      }
    }
  }

  return undefined;
}