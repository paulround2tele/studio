/**
 * Campaign Phase Stream Hook (Phase B)
 * Real-time phase updates via SSE for UX refactor components
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
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
}

interface UseCampaignPhaseStreamOptions {
  enabled?: boolean;
  onPhaseUpdate?: (event: PhaseUpdateEvent) => void;
  onError?: (error: string) => void;
}

interface UseCampaignPhaseStreamReturn {
  phases: PipelinePhase[];
  isConnected: boolean;
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
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const shouldConnect = Boolean(_enabled && campaignId);

  const updatePhaseState = useCallback(
    (phaseKey: ApiPhase, updates: Partial<PipelinePhase>): PipelinePhase | null => {
      let updatedPhase: PipelinePhase | null = null;
      setPhases(prevPhases => {
        const phaseMap = new Map<string, PipelinePhase>();

        DEFAULT_PHASES.forEach(defaultPhase => {
          phaseMap.set(defaultPhase.key, { ...defaultPhase });
        });

        prevPhases.forEach(existing => {
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
        updatedPhase = nextPhase;

        const ordered = API_PHASE_ORDER
          .map(key => phaseMap.get(key))
          .filter((phase): phase is PipelinePhase => Boolean(phase))
          .map(phase => ({ ...phase }));

        const extras = Array.from(phaseMap.entries())
          .filter(([key]) => !API_PHASE_ORDER.includes(key as ApiPhase))
          .map(([, value]) => ({ ...value }));

        return [...ordered, ...extras];
      });

      return updatedPhase;
    },
    []
  );

  const emitPhaseUpdate = useCallback(
    (phase: ApiPhase, patch: Partial<PipelinePhase>, meta?: { message?: string }) => {
      const next = updatePhaseState(phase, patch);
      if (!campaignId || !next) {
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
        message: meta?.message,
      });
    },
    [campaignId, onPhaseUpdate, updatePhaseState]
  );

  const handleProgress = useCallback(
    (_id: string, progress: CampaignProgress) => {
      const normalizedPhase = normalizeToApiPhase(String(progress.current_phase || '').toLowerCase());
      if (!normalizedPhase) {
        return;
      }

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

      emitPhaseUpdate(normalizedPhase, updates, { message: progress.message });
    },
    [emitPhaseUpdate]
  );

  const handlePhaseStarted = useCallback(
    (_id: string, event: PhaseEvent) => {
      const normalizedPhase = normalizeToApiPhase(String(event.phase || '').toLowerCase());
      if (!normalizedPhase) {
        return;
      }

      const startedAt = extractTimestamp(event.results, ['started_at', 'startedAt']);

      emitPhaseUpdate(normalizedPhase, {
        status: 'in_progress',
        ...(startedAt ? { startedAt } : {}),
      }, { message: event.message });
    },
    [emitPhaseUpdate]
  );

  const handlePhaseCompleted = useCallback(
    (_id: string, event: PhaseEvent) => {
      const normalizedPhase = normalizeToApiPhase(String(event.phase || '').toLowerCase());
      if (!normalizedPhase) {
        return;
      }

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
        { message: event.message }
      );
    },
    [emitPhaseUpdate]
  );

  const handlePhaseFailed = useCallback(
    (_id: string, event: PhaseEvent) => {
      const normalizedPhase = normalizeToApiPhase(String(event.phase || '').toLowerCase());
      if (!normalizedPhase) {
        return;
      }

      emitPhaseUpdate(normalizedPhase, { status: 'failed' }, { message: event.message });
      if (event.results?.error && onError) {
        onError(String(event.results.error));
      }
    },
    [emitPhaseUpdate, onError]
  );

  const handleEventError = useCallback(
    (_id: string, errorMessage: string) => {
      onError?.(errorMessage);
    },
    [onError]
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

  const { isConnected, error: sseError } = useCampaignSSE({
    campaignId: shouldConnect ? campaignId ?? undefined : undefined,
    autoConnect: shouldConnect,
    events: sseHandlers,
  });

  useEffect(() => {
    setPhases(cloneDefaultPhases());
    setLastUpdate(null);
  }, [campaignId, shouldConnect]);

  useEffect(() => {
    if (sseError) {
      onError?.(sseError);
    }
  }, [sseError, onError]);

  return {
    phases,
    isConnected,
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