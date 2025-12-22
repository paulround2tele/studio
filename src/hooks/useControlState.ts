/**
 * useControlState Hook
 * 
 * Single source of truth for campaign execution state and control availability.
 * Derives all control decisions from:
 * - statusSnapshot.controlPhase (what can be controlled)
 * - PhaseStatusResponse.runtimeControls (what actions are allowed)
 * 
 * Per CAMPAIGN_UI_CONTRACT.md §2.2 and §3.2
 */

import { useMemo } from 'react';
import type { CampaignPhasesStatusResponse } from '@/lib/api-client/models/campaign-phases-status-response';
import type { CampaignPhasesStatusResponsePhasesInner } from '@/lib/api-client/models/campaign-phases-status-response-phases-inner';
import type { PhaseRuntimeControls } from '@/lib/api-client/models/phase-runtime-controls';
import { getPhaseDisplayName } from '@/lib/utils/phaseMapping';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';
import type { ApiPhase } from '@/lib/utils/phaseNames';

export type ExecutionStatus = 'running' | 'paused' | 'completed' | 'failed' | 'idle';

export interface ControlState {
  // Core execution state
  controlPhase: ApiPhase | null;
  phaseLabel: string;
  status: ExecutionStatus;
  /** Progress percentage (0-100) */
  progress: number;
  
  // Runtime controls (from backend authority)
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  canRestart: boolean;
  
  // Derived states
  hasFailedPhases: boolean;
  isIdle: boolean;
  
  // Phase snapshot for additional context
  activePhaseSnapshot: CampaignPhasesStatusResponsePhasesInner | null;
  
  // Error context
  errorMessage: string | null;
}

/**
 * Derives the overall execution status from phase snapshots
 */
function deriveExecutionStatus(
  phases: CampaignPhasesStatusResponsePhasesInner[] | undefined,
  _controlPhase: string | null
): ExecutionStatus {
  if (!phases || phases.length === 0) {
    return 'idle';
  }

  // Check if any phase is running
  const hasRunning = phases.some(p => p.status === 'in_progress');
  if (hasRunning) {
    return 'running';
  }

  // Check if any phase is paused
  const hasPaused = phases.some(p => p.status === 'paused');
  if (hasPaused) {
    return 'paused';
  }

  // Check if any phase failed
  const hasFailed = phases.some(p => p.status === 'failed');
  if (hasFailed) {
    return 'failed';
  }

  // Check if all phases completed
  const allCompleted = phases.every(p => p.status === 'completed');
  if (allCompleted) {
    return 'completed';
  }

  return 'idle';
}

/**
 * Finds the phase snapshot matching controlPhase
 */
function findControlPhaseSnapshot(
  phases: CampaignPhasesStatusResponsePhasesInner[] | undefined,
  controlPhase: string | null | undefined
): CampaignPhasesStatusResponsePhasesInner | null {
  if (!phases || !controlPhase) {
    return null;
  }

  const normalizedControl = normalizeToApiPhase(controlPhase.toLowerCase());
  if (!normalizedControl) {
    return null;
  }

  return phases.find(p => {
    const normalizedPhase = normalizeToApiPhase(String(p.phase ?? '').toLowerCase());
    return normalizedPhase === normalizedControl;
  }) ?? null;
}

/**
 * Finds the currently active (running or paused) phase snapshot
 */
function findActivePhaseSnapshot(
  phases: CampaignPhasesStatusResponsePhasesInner[] | undefined
): CampaignPhasesStatusResponsePhasesInner | null {
  if (!phases) {
    return null;
  }

  // Priority: running > paused (only 'in_progress' is a valid running status)
  const running = phases.find(p => p.status === 'in_progress');
  if (running) {
    return running;
  }

  const paused = phases.find(p => p.status === 'paused');
  if (paused) {
    return paused;
  }

  return null;
}

/**
 * Hook to derive unified control state from campaign status and runtime controls
 * 
 * @param statusSnapshot - Campaign phases status from getCampaignStatusQuery
 * @param runtimeControls - Runtime controls from getPhaseStatusStandaloneQuery
 * @param isControlsLoading - Whether runtime controls are still loading
 */
export function useControlState(
  statusSnapshot: CampaignPhasesStatusResponse | undefined,
  runtimeControls: PhaseRuntimeControls | undefined,
  isControlsLoading: boolean = false
): ControlState {
  return useMemo(() => {
    const phases = statusSnapshot?.phases;
    const controlPhaseRaw = statusSnapshot?.controlPhase;
    
    // Normalize controlPhase to ApiPhase
    const controlPhase = controlPhaseRaw 
      ? normalizeToApiPhase(controlPhaseRaw.toLowerCase()) as ApiPhase | null
      : null;

    // Find the active phase snapshot (running or paused)
    const activePhaseSnapshot = findActivePhaseSnapshot(phases);
    
    // Find the control phase snapshot (what backend says is controllable)
    const controlPhaseSnapshot = findControlPhaseSnapshot(phases, controlPhaseRaw);
    
    // Use control phase snapshot if available, otherwise active phase
    const displaySnapshot = controlPhaseSnapshot ?? activePhaseSnapshot;
    
    // Derive execution status
    const status = deriveExecutionStatus(phases, controlPhaseRaw ?? null);
    
    // Phase label - handle backend phase names like 'generation', 'dns', 'http', 'leads'
    let phaseLabel: string;
    if (displaySnapshot?.phase) {
      const normalized = normalizeToApiPhase(String(displaySnapshot.phase).toLowerCase());
      // Use normalized name if available, otherwise format the raw phase name
      phaseLabel = normalized 
        ? getPhaseDisplayName(normalized as Parameters<typeof getPhaseDisplayName>[0])
        : String(displaySnapshot.phase).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    } else if (status === 'completed') {
      phaseLabel = 'Campaign Complete';
    } else if (status === 'failed') {
      phaseLabel = 'Campaign Failed';
    } else {
      phaseLabel = 'No Active Phase';
    }

    // Progress metrics
    const progress = displaySnapshot?.progressPercentage ?? 0;

    // Check for failed phases
    const hasFailedPhases = phases?.some(p => p.status === 'failed') ?? false;

    // Idle means no phase is running or paused
    const isIdle = status === 'idle' || status === 'completed' || status === 'failed';

    // Runtime controls - only valid if not loading and controls exist
    // When loading, disable all controls to prevent stale state
    const canPause = !isControlsLoading && (runtimeControls?.canPause ?? false);
    const canResume = !isControlsLoading && (runtimeControls?.canResume ?? false);
    const canStop = !isControlsLoading && (runtimeControls?.canStop ?? false);
    const canRestart = !isControlsLoading && (runtimeControls?.canRestart ?? false);

    // Error message from active/failed phase
    const errorMessage = displaySnapshot?.errorMessage ?? statusSnapshot?.errorMessage ?? null;

    return {
      controlPhase,
      phaseLabel,
      status,
      progress,
      canPause,
      canResume,
      canStop,
      canRestart,
      hasFailedPhases,
      isIdle,
      activePhaseSnapshot: displaySnapshot,
      errorMessage,
    };
  }, [statusSnapshot, runtimeControls, isControlsLoading]);
}

export default useControlState;
