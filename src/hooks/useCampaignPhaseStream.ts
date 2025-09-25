/**
 * Campaign Phase Stream Hook (Phase B)
 * Real-time phase updates via SSE for UX refactor components
 */

import { useCallback, useEffect, useState } from 'react';
import { useSSE } from './useSSE';
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
export function useCampaignPhaseStream(
  campaignId: string | null,
  options: UseCampaignPhaseStreamOptions = {}
): UseCampaignPhaseStreamReturn {
  const { enabled = true, onPhaseUpdate, onError } = options;

  const [phases, setPhases] = useState<PipelinePhase[]>(DEFAULT_PHASES);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  // Handle SSE events
  const handleSSEEvent = useCallback((event: any) => {
    try {
      if (event.type === 'phaseUpdate' && event.data) {
        const phaseEvent = event.data as PhaseUpdateEvent;
        
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process phase update';
      onError?.(errorMessage);
    }
  }, [onPhaseUpdate, onError]);

  const handleSSEError = useCallback((error: string) => {
    onError?.(error);
  }, [onError]);

  // Use the existing SSE hook
  const { readyState, lastEvent } = useSSE(
    campaignId ? `/api/v2/sse/campaigns/${campaignId}/events` : null,
    handleSSEEvent,
    {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 3000
    }
  );

  const isConnected = readyState === 1; // EventSource.OPEN
  const error = readyState === 2 ? 'Connection failed' : null; // EventSource.CLOSED

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