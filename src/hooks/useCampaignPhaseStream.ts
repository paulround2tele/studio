/**
 * Campaign Phase Stream Hook (Phase B)
 * Real-time phase updates via SSE for UX refactor components
 */

import { useCallback, useEffect, useState } from 'react';
import { useSSE, type SSEEvent } from './useSSE';
import type { PipelinePhase } from '@/components/refactor/campaign/PipelineBar';

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

// Default phase configuration matching the expected 5-phase pipeline
const DEFAULT_PHASES: PipelinePhase[] = [
  {
    key: 'generation',
    label: 'Generation',
    status: 'not_started',
    progressPercentage: 0
  },
  {
    key: 'dns',
    label: 'DNS Validation',
    status: 'not_started',
    progressPercentage: 0
  },
  {
    key: 'http',
    label: 'HTTP Validation',
    status: 'not_started',
    progressPercentage: 0
  },
  {
    key: 'analysis',
    label: 'Analysis',
    status: 'not_started',
    progressPercentage: 0
  },
  {
    key: 'leads',
    label: 'Lead Extraction',
    status: 'not_started',
    progressPercentage: 0
  }
];

/**
 * Hook for real-time campaign phase updates via SSE
 * Connects to /api/v2/sse/campaigns/{id} and processes phaseUpdate events
 */
// Stream event discriminated union for stronger typing
type PhaseUpdateSSE = { type: 'phaseUpdate'; data: PhaseUpdateEvent };
type HeartbeatSSE = { type: 'heartbeat'; serverTime?: string };
type UnknownSSE = { type: string; [k: string]: unknown };
export type CampaignStreamEvent = PhaseUpdateSSE | HeartbeatSSE | UnknownSSE;

export function useCampaignPhaseStream(
  campaignId: string | null,
  options: UseCampaignPhaseStreamOptions = {}
): UseCampaignPhaseStreamReturn {
  const { enabled = true, onPhaseUpdate, onError } = options;

  const [phases, setPhases] = useState<PipelinePhase[]>(DEFAULT_PHASES);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  // Handle SSE events
  const handleSSEEvent = useCallback((raw: SSEEvent) => {
    // Map generic SSEEvent to discriminated union if possible
    let event: CampaignStreamEvent;
    if (raw.event === 'phaseUpdate' && raw.data && typeof raw.data === 'object') {
      event = { type: 'phaseUpdate', data: raw.data as PhaseUpdateEvent };
    } else if (raw.event === 'heartbeat') {
      event = { type: 'heartbeat', serverTime: (raw.data as any)?.serverTime };
    } else {
      event = { type: raw.event, ...raw } as UnknownSSE;
    }
    try {
      if (event.type === 'phaseUpdate' && (event as PhaseUpdateSSE).data) {
        const phaseEvent = (event as PhaseUpdateSSE).data;
        
        // Update the specific phase
        setPhases(prevPhases => 
          prevPhases.map(phase => 
            phase.key === phaseEvent.phase
              ? {
                  ...phase,
                  status: phaseEvent.status,
                  progressPercentage: phaseEvent.progressPercentage,
                  startedAt: phaseEvent.startedAt,
                  completedAt: phaseEvent.completedAt
                }
              : phase
          )
        );

        setLastUpdate(Date.now());
        onPhaseUpdate?.(phaseEvent);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process phase update';
      onError?.(errorMessage);
    }
  }, [onPhaseUpdate, onError]);

  const handleSSEError = useCallback((error: string) => {
    onError?.(error);
  }, [onError]);

  // Use the existing SSE hook
  const { readyState, lastEvent, error: sseHookError } = useSSE(
    campaignId ? `/api/v2/sse/campaigns/${campaignId}/events` : null,
    handleSSEEvent,
    {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 3000,
    }
  );

  const isConnected = readyState === 1; // EventSource.OPEN
  const error = sseHookError;

  // Reset phases to default when connecting
  useEffect(() => {
    if (readyState === 1 && campaignId) { // EventSource.OPEN
      setPhases(DEFAULT_PHASES);
    }
  }, [readyState, campaignId]);

  return {
    phases,
    isConnected,
    error,
    lastUpdate
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