import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { campaignApi } from '@/store/api/campaignApi';

// ---------------------------------------------
// Phase & Model Types
// ---------------------------------------------
export const PIPELINE_PHASE_ORDER = ['discovery','validation','extraction','analysis'] as const;
export type PipelinePhaseKey = typeof PIPELINE_PHASE_ORDER[number];

type BackendStatus = 'not_started' | 'configured' | 'running' | 'in_progress' | 'paused' | 'completed' | 'failed' | string | undefined;

export interface UIPipelinePhase {
  key: PipelinePhaseKey;
  configState: 'missing' | 'valid';
  execState: 'idle' | 'running' | 'completed' | 'failed';
  statusRaw?: BackendStatus;
  lastError?: string;
}

// ---------------------------------------------
// Base Accessors
// ---------------------------------------------
const selectCampaignUiSlice = (s: RootState) => s.campaignUI;
const selectCampaignUIById = (id: string) => createSelector(selectCampaignUiSlice, slice => slice.byId?.[id]);
// Access RTK Query slice with explicit indexing to avoid 'as unknown'
// RootState is declared in store; if campaignApi slice typing is missing, extend RootState accordingly instead of casting.
// For now, treat unknown to keep zero 'any' usage and refine at call sites.
type CampaignApiSliceState = RootState[typeof campaignApi.reducerPath];

const selectCampaignApiState = (s: RootState): CampaignApiSliceState => s[campaignApi.reducerPath];

interface MinimalQuerySubstate {
  queryCacheKey?: string;
  endpointName?: string;
  originalArgs?: unknown;
  data?: { status?: BackendStatus } | undefined;
}

interface MinimalCampaignApiState {
  queries?: Record<string, MinimalQuerySubstate>;
}

// Direct RTK Query data selectors per phase to avoid O(N) scans over query cache.
// Each call to campaignApi.endpoints.getPhaseStatusStandalone.select(arg) returns a selector (RootState)=>QuerySubstate.
// We wrap it to surface only the data/status field while maintaining memoization.
const _phaseStatusSelectorCache = new WeakMap<object, Map<string, (state: RootState) => { status?: BackendStatus } | undefined>>();

const selectPhaseStatusQuery = (campaignId: string, phase: PipelinePhaseKey) => {
  // Use campaignApi as the root cache key (since endpoints are stable singletons)
  let campaignCache = _phaseStatusSelectorCache.get(campaignApi);
  if (!campaignCache) {
    campaignCache = new Map();
    _phaseStatusSelectorCache.set(campaignApi, campaignCache);
  }
  const cacheKey = `${campaignId}:${phase}`;
  if (campaignCache.has(cacheKey)) {
    return campaignCache.get(cacheKey)!;
  }
  const base = campaignApi.endpoints.getPhaseStatusStandalone?.select({ campaignId, phase });
  const selector = (state: RootState): { status?: BackendStatus } | undefined => {
    // Prefer the generated endpoint selector when available (runtime path).
    if (base) {
      const sub = base(state);
      const data = (sub as unknown as { data?: { status?: BackendStatus } }).data;
      if (data) return data;
    }

    // Fallback for tests or legacy stores that construct queries manually.
    const apiState = selectCampaignApiState(state) as MinimalCampaignApiState | undefined;
    const queryMap = apiState?.queries;
    if (!queryMap) return undefined;
    const match = Object.values(queryMap).find((entry) => {
      if (!entry) return false;
      if (entry.endpointName !== 'getPhaseStatusStandalone') return false;
      const args = entry.originalArgs as { campaignId?: string; phase?: string } | undefined;
      return args?.campaignId === campaignId && args?.phase === phase;
    });
    return match?.data as { status?: BackendStatus } | undefined;
  };
  campaignCache.set(cacheKey, selector);
  return selector;
};

// ---------------------------------------------
// Core Phase List
// ---------------------------------------------
export const makeSelectPipelinePhases = (campaignId: string) => {
  const perPhaseSelectors = PIPELINE_PHASE_ORDER.map(phase => selectPhaseStatusQuery(campaignId, phase));
  // We build a selector whose inputs are the per-phase data objects.
  return createSelector(
    perPhaseSelectors,
    (...statuses: ({ status?: BackendStatus } | undefined)[]): UIPipelinePhase[] => {
      return PIPELINE_PHASE_ORDER.map((key, idx) => {
        const status = statuses[idx]?.status;
        const configured = !!status && status !== 'not_started';
        let execState: UIPipelinePhase['execState'] = 'idle';
        if (status === 'running' || status === 'in_progress' || status === 'paused') execState = 'running';
        else if (status === 'completed') execState = 'completed';
        else if (status === 'failed') execState = 'failed';
        return { key, configState: configured ? 'valid' : 'missing', execState, statusRaw: status };
      });
    }
  );
};

export const makeSelectPhase = (campaignId: string, phase: PipelinePhaseKey) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => phases.find(p => p.key === phase)
);

export const makeSelectPhaseIndex = (campaignId: string, phase: PipelinePhaseKey) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => phases.findIndex(p => p.key === phase)
);

// ---------------------------------------------
// Configuration & Gating
// ---------------------------------------------
export const makeSelectMissingPhases = (campaignId: string) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => phases.filter(p => p.configState === 'missing').map(p => p.key)
);

export const makeSelectAllConfigured = (campaignId: string) => createSelector(
  makeSelectMissingPhases(campaignId),
  missing => missing.length === 0
);

export const makeSelectFirstUnconfigured = (campaignId: string) => createSelector(
  makeSelectMissingPhases(campaignId),
  missing => missing[0]
);

export const makeSelectConfigProgress = (campaignId: string) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => {
    const total = phases.length;
    const configured = phases.filter(p => p.configState === 'valid').length;
    return { configured, total, percent: total ? Math.round((configured/total)*100) : 0 };
  }
);

// Internal helper: reasons pipeline cannot start. In manual mode we allow starting the first
// configured phase even if later phases are missing. In auto (full sequence) mode we still
// require all phases configured before starting.
const makeSelectStartBlockingReasons = (campaignId: string) => createSelector(
  [
    makeSelectMissingPhases(campaignId),
    makeSelectPipelinePhases(campaignId),
    makeSelectAutoAdvanceEnabled(campaignId),
    makeSelectNextRunnablePhase(campaignId)
  ],
  (missing, phases, autoAdvance, nextRunnable) => {
    const reasons: string[] = [];
    if (autoAdvance) {
      if (missing.length) reasons.push(`Missing configuration: ${missing.join(', ')}`);
    } else {
      // manual mode: only block if no runnable phase OR an earlier phase is missing than the next runnable
      if (!nextRunnable) {
        reasons.push('No configured phase ready to start');
      } else if (missing.length) {
        const firstMissing = missing[0] as PipelinePhaseKey; // safe due to length check
        const firstMissingIdx = PIPELINE_PHASE_ORDER.indexOf(firstMissing);
  const runnableIdx = PIPELINE_PHASE_ORDER.indexOf(nextRunnable.key);
        if (firstMissingIdx > -1 && firstMissingIdx < runnableIdx) {
          reasons.push(`Configure earlier phase: ${firstMissing}`);
        }
      }
    }
    const first = phases[0];
    if (first && first.execState !== 'idle' && !autoAdvance) {
      // If first phase already started and we're manual, we might still allow starting next later phase
      // but only if it is configured and earlier phases completed. Keep informational reason otherwise.
      if (first.execState === 'running') reasons.push('First phase already running');
    }
    return reasons;
  }
);

export const makeSelectCanStartFullSequence = (campaignId: string) => createSelector(
  makeSelectStartBlockingReasons(campaignId),
  reasons => reasons.length === 0
);

// ---------------------------------------------
// Execution State & Progress
// ---------------------------------------------
export const makeSelectExecSummary = (campaignId: string) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => phases.reduce<Record<string, number>>((acc, p) => {
    acc[p.execState] = (acc[p.execState] || 0) + 1;
    return acc;
  }, { idle:0, running:0, completed:0, failed:0 })
);

// Exec runtime selectors
// Use a frozen empty object to keep referential stability when slice absent
const EMPTY_EXEC_RUNTIME: Record<string, { startedAt?: number; completedAt?: number; status?: string }> = Object.freeze({});
export const selectExecState = (campaignId: string) => (state: RootState) =>
  (state as unknown as {
    pipelineExec?: { byCampaign?: Record<string, Record<string, { startedAt?: number; completedAt?: number; status?: string }>> };
  }).pipelineExec?.byCampaign?.[campaignId] || EMPTY_EXEC_RUNTIME;
export const selectPhaseExecRuntime = (campaignId: string, phase: PipelinePhaseKey) => (state: RootState) => {
  return (state as unknown as {
    pipelineExec?: { byCampaign?: Record<string, Record<string, { startedAt?: number; completedAt?: number; status?: string }>> };
  }).pipelineExec?.byCampaign?.[campaignId]?.[phase];
};

export const selectRetryEligiblePhases = (campaignId: string) => (state: RootState): PipelinePhaseKey[] => {
  const execContainer = (state as unknown as {
    pipelineExec?: { byCampaign?: Record<string, Record<string, { status?: string }>> };
  }).pipelineExec?.byCampaign?.[campaignId];
  if (!execContainer) return [];
  return (Object.keys(execContainer) as PipelinePhaseKey[]).filter(p => execContainer[p]?.status === 'failed');
};

export const makeSelectActiveExecutionPhase = (campaignId: string) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => phases.find(p => p.execState === 'running')
);

export const makeSelectNextRunnablePhase = (campaignId: string) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => {
    // Phase is runnable if it is configured, idle, and all previous phases are either completed or failed (allow retry logic separately)
    return phases.find((p, idx) => {
      if (!(p.configState === 'valid' && p.execState === 'idle')) return false;
      const prev = phases.slice(0, idx);
      return prev.every(pr => pr.configState === 'valid' && (pr.execState === 'completed' || pr.execState === 'failed'));
    });
  }
);

export const makeSelectRemainingRunnableCount = (campaignId: string) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => phases.filter(p => p.configState === 'valid' && p.execState === 'idle').length
);

export const makeSelectOverallProgress = (campaignId: string) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => {
    const total = phases.length;
    const completed = phases.filter(p => p.execState === 'completed').length;
    return { completed, total, percent: total ? Math.round((completed/total)*100) : 0 };
  }
);

export const makeSelectPhaseProgressMap = (campaignId: string) => createSelector(
  makeSelectPipelinePhases(campaignId),
  phases => phases.reduce<Record<PipelinePhaseKey, { percent: number; statusRaw?: string }>>((acc, p) => {
    // For now we only know discrete states; treat completed=100, running=50 (placeholder), otherwise 0.
    const percent = p.execState === 'completed' ? 100 : p.execState === 'running' ? 50 : 0;
    acc[p.key] = { percent, statusRaw: p.statusRaw };
    return acc;
  }, {} as Record<PipelinePhaseKey, { percent: number; statusRaw?: string }>)
);

// ---------------------------------------------
// Failures & Retry
// ---------------------------------------------
export const makeSelectLastFailedPhase = (campaignId: string) => createSelector(
  selectCampaignUIById(campaignId), ui => ui?.lastFailedPhase
);

export const makeSelectFailedPhases = (campaignId: string) => createSelector(
  makeSelectPipelinePhases(campaignId), phases => phases.filter(p => p.execState === 'failed')
);

export const makeSelectRetryEligiblePhases = (campaignId: string) => createSelector(
  makeSelectFailedPhases(campaignId), failed => failed.filter(f => f.configState === 'valid')
);

// ---------------------------------------------
// Mode & Workflow
// ---------------------------------------------
export const makeSelectAutoAdvanceEnabled = (campaignId: string) => createSelector(
  selectCampaignUIById(campaignId), ui => !!ui?.fullSequenceMode
);

export const makeSelectModeDescriptor = (campaignId: string) => createSelector(
  makeSelectAutoAdvanceEnabled(campaignId),
  autoAdvance => ({ autoAdvance, label: autoAdvance ? 'Full Sequence' : 'Step by Step' })
);

export const makeSelectNextUserAction = (campaignId: string) => createSelector(
  [
    makeSelectPipelinePhases(campaignId),
    makeSelectMissingPhases(campaignId),
    makeSelectAutoAdvanceEnabled(campaignId),
    makeSelectActiveExecutionPhase(campaignId),
    makeSelectNextRunnablePhase(campaignId)
  ],
  (phases, missing, auto, activeExec, nextRunnable) => {
    let fallbackPhase = PIPELINE_PHASE_ORDER[PIPELINE_PHASE_ORDER.length-1] as PipelinePhaseKey;
    if (phases.length) {
      const last = phases[phases.length-1];
      if (last) fallbackPhase = last.key;
    }
    // Manual (step-by-step) mode:
    // Allow starting the earliest runnable configured phase even if later phases are still unconfigured.
    // Only force configuration if the earliest missing phase precedes the runnable phase.
    if (!auto) {
      if (activeExec) return { type: 'watch', phase: activeExec.key } as const;
      if (nextRunnable) {
        if (missing.length) {
          const firstMissing = missing[0] as PipelinePhaseKey; // safe due to length check
          const firstMissingIdx = PIPELINE_PHASE_ORDER.indexOf(firstMissing);
          const runnableIdx = PIPELINE_PHASE_ORDER.indexOf(nextRunnable.key);
          if (firstMissingIdx > -1 && firstMissingIdx < runnableIdx) {
            return { type: 'configure', phase: firstMissing, reason: 'Configure earlier phase' } as const;
          }
        }
        return { type: 'start', phase: nextRunnable.key } as const;
      }
      if (missing.length) {
        return { type: 'configure', phase: missing[0], reason: 'Configuration required' } as const;
      }
      return { type: 'wait', phase: fallbackPhase } as const;
    }
    // Auto mode strict requirement.
    if (missing.length) return { type: 'configure', phase: missing[0], reason: 'Configuration required' } as const;
    if (activeExec) return { type: 'watch', phase: activeExec.key } as const;
    if (nextRunnable) return { type: 'start', phase: nextRunnable.key } as const;
    return { type: 'wait', phase: fallbackPhase } as const;
  }
);

// ---------------------------------------------
// Guidance & Messaging
// ---------------------------------------------
export const makeSelectGuidanceQueue = (campaignId: string) => createSelector(
  selectCampaignUIById(campaignId), ui => ui?.guidanceMessages || []
);
export const makeSelectLatestGuidance = (campaignId: string) => createSelector(
  makeSelectGuidanceQueue(campaignId), list => list[0]
);
export const makeSelectGuidanceCount = (campaignId: string) => createSelector(
  makeSelectGuidanceQueue(campaignId), list => list.length
);
export const makeSelectGuidanceForPhase = (campaignId: string, phase: PipelinePhaseKey) => createSelector(
  makeSelectGuidanceQueue(campaignId), list => list.filter(m => m.phase === phase)
);

// ---------------------------------------------
// Start UX
// ---------------------------------------------
export const makeSelectPreflightStatus = (campaignId: string) => createSelector(
  [selectCampaignUIById(campaignId), makeSelectAllConfigured(campaignId), makeSelectMissingPhases(campaignId)],
  (ui, allConfigured, missing) => ({ open: !!ui?.preflightOpen, allConfigured, missing })
);

export const makeSelectStartCTAState = (campaignId: string) => createSelector(
  [makeSelectStartBlockingReasons(campaignId)],
  reasons => ({ disabled: reasons.length > 0, reasons })
);

// ---------------------------------------------
// Aggregated Overview
// ---------------------------------------------
export const makeSelectPipelineOverview = (campaignId: string) => createSelector(
  [
    makeSelectPipelinePhases(campaignId),
  selectExecState(campaignId),
    makeSelectConfigProgress(campaignId),
    makeSelectAllConfigured(campaignId),
    makeSelectMissingPhases(campaignId),
    makeSelectFirstUnconfigured(campaignId),
    makeSelectExecSummary(campaignId),
    makeSelectOverallProgress(campaignId),
    makeSelectActiveExecutionPhase(campaignId),
    makeSelectAutoAdvanceEnabled(campaignId),
    makeSelectLastFailedPhase(campaignId),
    makeSelectFailedPhases(campaignId),
    makeSelectGuidanceQueue(campaignId),
    makeSelectLatestGuidance(campaignId),
    makeSelectStartBlockingReasons(campaignId),
    makeSelectCanStartFullSequence(campaignId),
    makeSelectNextUserAction(campaignId)
  ],
  (
    phases,
    runtime,
    configProgress,
    allConfigured,
    missing,
    firstMissing,
    execSummary,
    overallProgress,
    activeExec,
    autoAdvance,
    lastFailed,
    failedList,
    guidanceQueue,
    latestGuidance,
    startReasons,
    canStartFull,
    nextAction
  ) => {
    const phasesEnriched = phases.map(p => {
      const r = (runtime as Record<string, { startedAt?: number; completedAt?: number }>)[p.key];
      let durationMs: number | undefined;
      if (r?.startedAt && r?.completedAt) durationMs = r.completedAt - r.startedAt;
      return { ...p, startedAt: r?.startedAt, completedAt: r?.completedAt, durationMs };
    });
    return {
      phases,
      phasesEnriched,
      config: { allConfigured, firstMissing, missing, progress: configProgress },
      exec: { summary: execSummary, active: activeExec, progress: overallProgress },
      mode: { autoAdvance },
      failures: { lastFailed, failedList },
      guidance: { queue: guidanceQueue, latest: latestGuidance, count: guidanceQueue.length },
      start: { canStart: canStartFull, reasons: startReasons },
      nextAction
    };
  }
);

// ---------------------------------------------
// Export Namespace
// ---------------------------------------------
export const pipelineSelectors = {
  phases: makeSelectPipelinePhases,
  phase: makeSelectPhase,
  phaseIndex: makeSelectPhaseIndex,
  missingPhases: makeSelectMissingPhases,
  allConfigured: makeSelectAllConfigured,
  firstUnconfigured: makeSelectFirstUnconfigured,
  configProgress: makeSelectConfigProgress,
  canStartFullSequence: makeSelectCanStartFullSequence,
  execSummary: makeSelectExecSummary,
  activeExecutionPhase: makeSelectActiveExecutionPhase,
  nextRunnablePhase: makeSelectNextRunnablePhase,
  remainingRunnableCount: makeSelectRemainingRunnableCount,
  overallProgress: makeSelectOverallProgress,
  phaseProgressMap: makeSelectPhaseProgressMap,
  lastFailedPhase: makeSelectLastFailedPhase,
  failedPhases: makeSelectFailedPhases,
  retryEligiblePhases: makeSelectRetryEligiblePhases,
  autoAdvanceEnabled: makeSelectAutoAdvanceEnabled,
  modeDescriptor: makeSelectModeDescriptor,
  nextUserAction: makeSelectNextUserAction,
  // selected phase picked by user (added Phase 5)
  selectedPhase: (campaignId: string) => createSelector(selectCampaignUIById(campaignId), ui => ui?.selectedPhase),
  guidanceQueue: makeSelectGuidanceQueue,
  latestGuidance: makeSelectLatestGuidance,
  guidanceCount: makeSelectGuidanceCount,
  guidanceForPhase: makeSelectGuidanceForPhase,
  preflightStatus: makeSelectPreflightStatus,
  startCTAState: makeSelectStartCTAState,
  overview: makeSelectPipelineOverview,
};

export default pipelineSelectors;
