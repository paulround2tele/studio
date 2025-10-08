"use client";

import React, { useMemo, useState, useCallback } from 'react';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import type { PhaseExecution } from '@/lib/api-client/models/phase-execution';
import type { CampaignState } from '@/lib/api-client/models/campaign-state';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import { useAppDispatch } from '@/store/hooks';
import { setFullSequenceMode, setLastFailedPhase, setGuidance } from '@/store/ui/campaignUiSlice';
import { FullSequencePreflightWizard } from './FullSequencePreflightWizard';
import { TimelineHistory } from './TimelineHistory';
import { ConversionCTA } from './ConversionCTA';
import { GuidanceBanner } from './GuidanceBanner';
import { PipelineWorkspace } from './PipelineWorkspace';
import { normalizeToApiPhase, apiToEnginePhase } from '@/lib/utils/phaseNames';
import { useToast } from '@/hooks/use-toast';

interface CampaignControlsProps {
  campaign: Campaign;
  phaseExecutions?: PhaseExecution[];
  state?: CampaignState;
}

const CampaignControls: React.FC<CampaignControlsProps> = ({ campaign, phaseExecutions, state }) => {
  const SHOW_PIPELINE_WORKSPACE = true; // Workspace is authoritative
  const [startErrors, setStartErrors] = useState<{ [phase in 'discovery' | 'validation' | 'extraction' | 'analysis']?: string }>({});
  const [startPhase] = useStartPhaseStandaloneMutation();
  const { toast } = useToast();

  const dispatch = useAppDispatch();
  // Live progress via SSE with extended callbacks
  const { lastProgress, isConnected } = useCampaignSSE({
    campaignId: campaign.id,
    events: {
      onModeChanged: (cid, mode) => {
        if (cid === campaign.id) dispatch(setFullSequenceMode({ campaignId: campaign.id, value: mode === 'full_sequence' }));
      },
      onPhaseFailed: (cid, ev) => {
        if (cid === campaign.id) {
          dispatch(setLastFailedPhase({ campaignId: campaign.id, phase: ev.phase }));
          dispatch(setGuidance({ campaignId: campaign.id, guidance: { message: `${ev.phase} failed: ${ev.error || ev.message}`, phase: ev.phase, severity: 'warn' } }));
        }
      }
    }
  });

  // Prefer enriched phase executions when available
  const execByPhase = useMemo(() => {
    const map = new Map<string, PhaseExecution>();
    if (Array.isArray(phaseExecutions)) {
      for (const exec of phaseExecutions) {
        map.set(exec.phaseType, exec);
      }
    }
    return map;
  }, [phaseExecutions]);

  // Helper to compute simple status for a given API-phase name
  const computePhaseStatus = useCallback((apiPhase: 'discovery' | 'validation' | 'extraction' | 'analysis') => {
    const enginePhase = apiToEnginePhase(apiPhase);
    if (campaign.status === 'running' && campaign.currentPhase === apiPhase) return 'running' as const;
    // Some payloads may report currentPhase in engine terms via SSE; reconcile by engine name
    if (campaign.status === 'running' && lastProgress?.current_phase === enginePhase) return 'running' as const;
    if (campaign.status === 'paused' && campaign.currentPhase === apiPhase) return 'paused' as const;
    if (campaign.status === 'failed') return 'failed' as const;
    if (campaign.status === 'completed') return 'completed' as const;
    return 'pending' as const;
  }, [campaign.status, campaign.currentPhase, lastProgress?.current_phase]);

  // Legacy PhaseCard & gating logic fully removed; selectors + workspace drive flow.

  const extractErrorMessage = (e: unknown): string => {
    // Try common shapes: RTK Query error with data.message, axios-style response.data, or plain message
    if (!e || typeof e !== 'object') {
      return typeof e === 'string' ? e : 'Unknown error';
    }

    // Check for data.message pattern (RTK Query)
    if ('data' in e && e.data && typeof e.data === 'object') {
      if ('message' in e.data && typeof e.data.message === 'string') {
        return e.data.message;
      }
      if ('error' in e.data && e.data.error && typeof e.data.error === 'object' && 'message' in e.data.error) {
        return String(e.data.error.message);
      }
    }

    // Check for response.data pattern (Axios)  
    if ('response' in e && e.response && typeof e.response === 'object' && 'data' in e.response) {
      const responseData = e.response.data;
      if (responseData && typeof responseData === 'object' && 'message' in responseData) {
        return String(responseData.message);
      }
    }

    // Check for direct error property
    if ('error' in e && typeof e.error === 'string') {
      return e.error;
    }

    // Check for direct message property
    if ('message' in e && typeof e.message === 'string') {
      return e.message;
    }

    return 'Unknown error';
  };

  // Legacy manual start handlers removed; handled by workspace primary action + auto-advance.

  return (
    <div className="flex flex-col gap-4">
  {/* Blocked banner removed under strict model */}
  <GuidanceBanner campaignId={campaign.id} />
      {SHOW_PIPELINE_WORKSPACE && (
        <PipelineWorkspace campaignId={campaign.id} />
      )}
      <FullSequencePreflightWizard campaignId={campaign.id} />
  <ConversionCTA campaignId={campaign.id} />
  {/* Timeline provides passive event history; no legacy PhaseCards remain. */}
  <TimelineHistory campaignId={campaign.id} />
    </div>
  );
};

export default CampaignControls;
