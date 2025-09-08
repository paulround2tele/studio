"use client";

import React, { useMemo, useState, useCallback } from 'react';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import type { PhaseExecution } from '@/lib/api-client/models/phase-execution';
import type { CampaignState } from '@/lib/api-client/models/campaign-state';
import { PhaseCard } from '@/components/campaigns/PhaseCard';
import { useStartPhaseStandaloneMutation, useGetPhaseStatusStandaloneQuery } from '@/store/api/campaignApi';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import { useAppDispatch } from '@/store/hooks';
import { setFullSequenceMode, setLastFailedPhase, setGuidance } from '@/store/ui/campaignUiSlice';
import { FullSequencePreflightWizard } from './FullSequencePreflightWizard';
import { NextActionPanel } from './NextActionPanel';
import { PhaseStepper } from './PhaseStepper';
import { TimelineHistory } from './TimelineHistory';
import { FailureContinuationPanel } from './FailureContinuationPanel';
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
  const SHOW_PIPELINE_WORKSPACE = true; // Phase 4 feature flag (remove after Phase 6)
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
      onChainBlocked: (cid, data) => {
  // chain_blocked deprecated under strict model; ignoring event if received.
      }
      ,onPhaseFailed: (cid, ev) => {
        if (cid === campaign.id) {
          dispatch(setLastFailedPhase({ campaignId: campaign.id, phase: ev.phase }));
          dispatch(setGuidance({ campaignId: campaign.id, guidance: { message: `${ev.phase} failed: ${ev.error || ev.message}`, phase: ev.phase, severity: 'warn' } }));
        }
      }
    }
  });
  const { data: discoveryStatus } = useGetPhaseStatusStandaloneQuery({ campaignId: campaign.id, phase: 'discovery' as any });
  const { data: dnsStatus } = useGetPhaseStatusStandaloneQuery({ campaignId: campaign.id, phase: 'validation' as any });
  const { data: httpStatus } = useGetPhaseStatusStandaloneQuery({ campaignId: campaign.id, phase: 'extraction' as any });
  const { data: analysisStatus } = useGetPhaseStatusStandaloneQuery({ campaignId: campaign.id, phase: 'analysis' as any });

  // Map backend phase status -> UI status expected by PhaseCard
  const toCardStatus = useCallback((s?: string): 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'configured' => {
    switch (s) {
      case 'not_started':
        return 'pending';
      case 'configured':
        return 'configured';
      case 'in_progress':
        return 'running';
      case 'running':
        return 'running';
      case 'paused':
        return 'paused';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }, []);

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

  const discoveryPhase = useMemo(() => {
    const exec = execByPhase.get('discovery');
    const status = exec ? toCardStatus(exec.status as any) : (toCardStatus(discoveryStatus?.status) || computePhaseStatus('discovery'));
    return {
      id: 'discovery',
      name: 'Discovery',
      status,
      progress: Math.round(
        exec?.progressPercentage != null
          ? exec.progressPercentage
          : lastProgress?.current_phase === apiToEnginePhase('discovery')
            ? lastProgress.progress_pct
            : campaign?.progress?.percentComplete || 0
      ),
    } as const;
  }, [campaign, lastProgress, discoveryStatus?.status, computePhaseStatus, toCardStatus, execByPhase]);

  const dnsPhase = useMemo(() => {
    const exec = execByPhase.get('validation');
    const status = exec ? toCardStatus(exec.status as any) : (toCardStatus(dnsStatus?.status) || computePhaseStatus('validation'));
    return {
      id: 'dns_validation',
      name: 'DNS Validation',
      status,
      progress: Math.round(
        exec?.progressPercentage != null
          ? exec.progressPercentage
          : lastProgress?.current_phase === apiToEnginePhase('validation')
            ? lastProgress.progress_pct
            : campaign?.progress?.percentComplete || 0
      ),
    } as const;
  }, [campaign, lastProgress, dnsStatus?.status, computePhaseStatus, toCardStatus, execByPhase]);

  const httpPhase = useMemo(() => {
    const exec = execByPhase.get('extraction');
    const status = exec ? toCardStatus(exec.status as any) : (toCardStatus(httpStatus?.status) || computePhaseStatus('extraction'));
    return {
      id: 'http_keyword_validation',
      name: 'HTTP Validation',
      status,
      progress: Math.round(
        exec?.progressPercentage != null
          ? exec.progressPercentage
          : lastProgress?.current_phase === apiToEnginePhase('extraction')
            ? lastProgress.progress_pct
            : campaign?.progress?.percentComplete || 0
      ),
    } as const;
  }, [campaign, lastProgress, httpStatus?.status, computePhaseStatus, toCardStatus, execByPhase]);

  const analysisPhase = useMemo(() => {
    const exec = execByPhase.get('analysis');
    const status = exec ? toCardStatus(exec.status as any) : (toCardStatus(analysisStatus?.status) || computePhaseStatus('analysis'));
    return {
      id: 'analysis',
      name: 'Analysis',
      status,
      progress: Math.round(
        exec?.progressPercentage != null
          ? exec.progressPercentage
          : lastProgress?.current_phase === apiToEnginePhase('analysis')
            ? lastProgress.progress_pct
            : campaign?.progress?.percentComplete || 0
      ),
    } as const;
  }, [campaign, lastProgress, analysisStatus?.status, computePhaseStatus, toCardStatus, execByPhase]);

  // Simple backend-order guards: assume validation must run before http_keyword_validation completes
  const canStartDiscovery = useMemo(() => {
    const s = discoveryStatus?.status;
    return s === 'not_started' || s === 'configured' || s === 'paused';
  }, [discoveryStatus?.status]);
  const discoveryCompleted = discoveryStatus?.status === 'completed';
  // Heuristic: discovery configured if we have any domain generation config in lastProgress or campaign metadata
  const discoveryConfigured = useMemo(() => {
    const st = discoveryStatus?.status;
    return st === 'configured' || st === 'running' || st === 'completed' || st === 'paused';
  }, [discoveryStatus]);
  const discoveryStartDisabledReason = undefined;
  const dnsConfigured = useMemo(() => {
    const st = dnsStatus?.status;
    return st === 'configured' || st === 'running' || st === 'completed' || st === 'paused';
  }, [dnsStatus]);
  const httpConfigured = useMemo(() => {
    const st = httpStatus?.status;
    return st === 'configured' || st === 'running' || st === 'completed' || st === 'paused';
  }, [httpStatus]);
  const analysisConfigured = useMemo(() => {
    const st = analysisStatus?.status;
    return st === 'configured' || st === 'running' || st === 'completed' || st === 'paused';
  }, [analysisStatus]);
  const canStartDNS = useMemo(() => {
    const s = dnsStatus?.status;
    return (s === 'not_started' || s === 'configured' || s === 'paused') && discoveryCompleted;
  }, [dnsStatus?.status, discoveryCompleted]);
  const validationCompleted = dnsStatus?.status === 'completed';
  const canStartHTTP = useMemo(() => {
    const s = httpStatus?.status;
    return (s === 'not_started' || s === 'configured' || s === 'paused') && validationCompleted;
  }, [httpStatus?.status, validationCompleted]);
  const httpCompleted = httpStatus?.status === 'completed';
  const canStartAnalysis = useMemo(() => {
    const s = analysisStatus?.status;
    return (s === 'not_started' || s === 'configured' || s === 'paused') && httpCompleted;
  }, [analysisStatus?.status, httpCompleted]);
  const canConfigure = true;

  const httpConfigureDisabledReason = validationCompleted ? undefined : 'Complete DNS Validation before configuring HTTP Validation.';
  const httpStartDisabledReason = validationCompleted ? undefined : 'DNS Validation must be completed before starting HTTP Validation.';
  const analysisConfigureDisabledReason = httpCompleted ? undefined : 'Complete HTTP Validation before configuring Analysis.';
  const analysisStartDisabledReason = httpCompleted ? undefined : 'HTTP Validation must be completed before starting Analysis.';

  const handleConfigure = useCallback(() => {
    // Placeholder: inline config handled via PipelineWorkspace (Phase 5). PhaseCards deprecated Phase 6.
  }, []);

  const extractErrorMessage = (e: any): string => {
    // Try common shapes: RTK Query error with data.message, axios-style response.data, or plain message
    return (
      e?.data?.message ||
      e?.error ||
      e?.message ||
      e?.data?.error?.message ||
      e?.response?.data?.message ||
      'Unknown error'
    );
  };

  const handleStartDNS = useCallback(async () => {
    try {
      await startPhase({ campaignId: campaign.id, phase: 'validation' as any }).unwrap();
      toast({ title: 'DNS Validation started', description: 'Phase transitioned to running.' });
      setStartErrors((s) => ({ ...s, validation: undefined }));
    } catch (e: any) {
      const msg = extractErrorMessage(e);
      setStartErrors((s) => ({ ...s, validation: msg }));
      toast({ title: 'Failed to start DNS Validation', description: msg, variant: 'destructive' });
    }
  }, [campaign.id, startPhase, toast]);

  const handleStartHTTP = useCallback(async () => {
    try {
      await startPhase({ campaignId: campaign.id, phase: 'extraction' as any }).unwrap();
      toast({ title: 'HTTP Validation started', description: 'Phase transitioned to running.' });
    } catch (e: any) {
  const msg = extractErrorMessage(e);
        // setDNSModalOpen(true); // Removed modal usage
  toast({ title: 'Failed to start HTTP Validation', description: msg, variant: 'destructive' });
    }
  }, [campaign.id, startPhase, toast]);

  const handleStartDiscovery = useCallback(async () => {
    try {
      await startPhase({ campaignId: campaign.id, phase: 'discovery' as any }).unwrap();
      toast({ title: 'Discovery started', description: 'Domain generation has begun. Domains will appear below as they are persisted.' });
      setStartErrors((s) => ({ ...s, discovery: undefined }));
    } catch (e: any) {
      const msg = extractErrorMessage(e);
      setStartErrors((s) => ({ ...s, discovery: msg }));
      toast({ title: 'Failed to start Discovery', description: msg, variant: 'destructive' });
    }
  }, [campaign.id, startPhase, toast, discoveryConfigured]);

  const handleStartAnalysis = useCallback(async () => {
    try {
      await startPhase({ campaignId: campaign.id, phase: 'analysis' as any }).unwrap();
      toast({ title: 'Analysis started', description: 'Phase transitioned to running.' });
    } catch (e: any) {
  const msg = extractErrorMessage(e);
  setStartErrors((s) => ({ ...s, analysis: msg }));
  toast({ title: 'Failed to start Analysis', description: msg, variant: 'destructive' });
    }
  }, [campaign.id, startPhase, toast]);

  return (
    <div className="flex flex-col gap-4">
  {/* Blocked banner removed under strict model */}
  <GuidanceBanner campaignId={campaign.id} />
      {SHOW_PIPELINE_WORKSPACE && (
        <PipelineWorkspace campaignId={campaign.id} />
      )}
      <FullSequencePreflightWizard campaignId={campaign.id} />
      <NextActionPanel campaignId={campaign.id} />
  <PhaseStepper campaignId={campaign.id} />
  <FailureContinuationPanel campaignId={campaign.id} />
  <ConversionCTA campaignId={campaign.id} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <PhaseCard
  phase={discoveryPhase as any}
        isActive={campaign.currentPhase === 'discovery'}
  canStart={canStartDiscovery}
  startDisabledReason={discoveryStartDisabledReason}
  canConfigure={true}
  isConfigured={discoveryConfigured}
  lastStartError={startErrors.discovery}
        onStart={handleStartDiscovery}
  onResume={handleStartDiscovery}
          onConfigure={handleConfigure}
        liveConnected={isConnected}
  />

      <PhaseCard
        phase={dnsPhase as any}
        isActive={campaign.currentPhase === 'validation'}
        canStart={canStartDNS}
        canConfigure={canConfigure}
  isConfigured={dnsConfigured}
  lastStartError={startErrors.validation}
        onStart={handleStartDNS}
  onResume={handleStartDNS}
        onConfigure={handleConfigure}
  liveConnected={isConnected}
  />

      <PhaseCard
        phase={httpPhase as any}
        isActive={campaign.currentPhase === 'extraction'}
        canStart={canStartHTTP}
  canConfigure={validationCompleted}
  startDisabledReason={httpStartDisabledReason}
  configureDisabledReason={httpConfigureDisabledReason}
  isConfigured={httpConfigured}
  lastStartError={startErrors.extraction}
        onStart={handleStartHTTP}
  onResume={handleStartHTTP}
          onConfigure={handleConfigure}
  liveConnected={isConnected}
  />

      <PhaseCard
        phase={analysisPhase as any}
        isActive={campaign.currentPhase === 'analysis'}
        canStart={canStartAnalysis}
  canConfigure={httpCompleted}
  startDisabledReason={analysisStartDisabledReason}
  configureDisabledReason={analysisConfigureDisabledReason}
  isConfigured={analysisConfigured}
  lastStartError={startErrors.analysis}
        onStart={handleStartAnalysis}
  onResume={handleStartAnalysis}
          onConfigure={handleConfigure}
        liveConnected={isConnected}
  />

  {/* Quick actions removed & modals replaced by inline forms (handled in PipelineWorkspace) */}
      </div>
  <TimelineHistory campaignId={campaign.id} />
    </div>
  );
};

export default CampaignControls;
