"use client";

import React, { useMemo, useState, useCallback } from 'react';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import { PhaseCard } from '@/components/campaigns/PhaseCard';
import DNSValidationConfigModal from '@/components/campaigns/modals/DNSValidationConfigModal';
import { useStartPhaseStandaloneMutation, useGetPhaseStatusStandaloneQuery } from '@/store/api/campaignApi';
import HTTPValidationConfigModal from '@/components/campaigns/modals/HTTPValidationConfigModal';
import AnalysisConfigModal from '@/components/campaigns/modals/AnalysisConfigModal';
import DiscoveryConfigModal from '@/components/campaigns/modals/DiscoveryConfigModal';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import { normalizeToApiPhase, apiToEnginePhase } from '@/lib/utils/phaseNames';
import { useToast } from '@/hooks/use-toast';

interface CampaignControlsProps {
  campaign: Campaign;
}

const CampaignControls: React.FC<CampaignControlsProps> = ({ campaign }) => {
  const [isDNSModalOpen, setDNSModalOpen] = useState(false);
  const [isHTTPModalOpen, setHTTPModalOpen] = useState(false);
  const [isDiscoveryModalOpen, setDiscoveryModalOpen] = useState(false);
  const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [startErrors, setStartErrors] = useState<{ [phase in 'discovery' | 'validation' | 'extraction' | 'analysis']?: string }>({});
  const [startPhase] = useStartPhaseStandaloneMutation();
  const { toast } = useToast();

  // Live progress via SSE
  const { lastProgress, isConnected } = useCampaignSSE({ campaignId: campaign.id });
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
    return {
      id: 'discovery',
      name: 'Discovery',
      status: toCardStatus(discoveryStatus?.status) || computePhaseStatus('discovery'),
      progress: Math.round(
        lastProgress?.current_phase === apiToEnginePhase('discovery')
          ? lastProgress.progress_pct
          : campaign?.progress?.percentComplete || 0
      ),
    } as const;
  }, [campaign, lastProgress, discoveryStatus?.status, computePhaseStatus, toCardStatus]);

  const dnsPhase = useMemo(() => {
    return {
      id: 'dns_validation',
      name: 'DNS Validation',
      status: toCardStatus(dnsStatus?.status) || computePhaseStatus('validation'),
      progress: Math.round(
        lastProgress?.current_phase === apiToEnginePhase('validation')
          ? lastProgress.progress_pct
          : campaign?.progress?.percentComplete || 0
      ),
    } as const;
  }, [campaign, lastProgress, dnsStatus?.status, computePhaseStatus, toCardStatus]);

  const httpPhase = useMemo(() => {
    return {
      id: 'http_keyword_validation',
      name: 'HTTP Validation',
      status: toCardStatus(httpStatus?.status) || computePhaseStatus('extraction'),
      progress: Math.round(
        lastProgress?.current_phase === apiToEnginePhase('extraction')
          ? lastProgress.progress_pct
          : campaign?.progress?.percentComplete || 0
      ),
    } as const;
  }, [campaign, lastProgress, httpStatus?.status, computePhaseStatus, toCardStatus]);

  const analysisPhase = useMemo(() => {
    return {
      id: 'analysis',
      name: 'Analysis',
      status: toCardStatus(analysisStatus?.status) || computePhaseStatus('analysis'),
      progress: Math.round(
        lastProgress?.current_phase === apiToEnginePhase('analysis')
          ? lastProgress.progress_pct
          : campaign?.progress?.percentComplete || 0
      ),
    } as const;
  }, [campaign, lastProgress, analysisStatus?.status, computePhaseStatus, toCardStatus]);

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
  const discoveryStartDisabledReason = discoveryConfigured ? undefined : 'Configure Discovery before starting domain generation.';
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
    setDNSModalOpen(true);
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
  setStartErrors((s) => ({ ...s, extraction: undefined }));
    } catch (e: any) {
  const msg = extractErrorMessage(e);
  setStartErrors((s) => ({ ...s, extraction: msg }));
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
  }, [campaign.id, startPhase, toast]);

  const handleStartAnalysis = useCallback(async () => {
    try {
      await startPhase({ campaignId: campaign.id, phase: 'analysis' as any }).unwrap();
      toast({ title: 'Analysis started', description: 'Phase transitioned to running.' });
  setStartErrors((s) => ({ ...s, analysis: undefined }));
    } catch (e: any) {
  const msg = extractErrorMessage(e);
  setStartErrors((s) => ({ ...s, analysis: msg }));
  toast({ title: 'Failed to start Analysis', description: msg, variant: 'destructive' });
    }
  }, [campaign.id, startPhase, toast]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <PhaseCard
        phase={discoveryPhase as any}
        isActive={campaign.currentPhase === 'discovery'}
  canStart={canStartDiscovery && discoveryConfigured}
  startDisabledReason={discoveryStartDisabledReason}
  canConfigure={true}
  isConfigured={discoveryConfigured}
  lastStartError={startErrors.discovery}
        onStart={handleStartDiscovery}
  onResume={handleStartDiscovery}
        onConfigure={() => setDiscoveryModalOpen(true)}
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
        onConfigure={() => setHTTPModalOpen(true)}
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
        onConfigure={() => setAnalysisModalOpen(true)}
        liveConnected={isConnected}
      />

  {/* Quick actions removed: unified into Phase cards */}

      {/* Discovery Configuration Modal */}
      <DiscoveryConfigModal
        isOpen={isDiscoveryModalOpen}
        onClose={() => setDiscoveryModalOpen(false)}
        campaignId={campaign.id}
        onConfigured={() => setDiscoveryModalOpen(false)}
      />

      {/* DNS Configuration Modal */}
      <DNSValidationConfigModal
        isOpen={isDNSModalOpen}
        onClose={() => setDNSModalOpen(false)}
        campaignId={campaign.id}
        onConfigured={() => setDNSModalOpen(false)}
      />

      {/* HTTP Configuration Modal */}
      <HTTPValidationConfigModal
        isOpen={isHTTPModalOpen}
        onClose={() => setHTTPModalOpen(false)}
        campaignId={campaign.id}
        onConfigured={() => setHTTPModalOpen(false)}
      />

      {/* Analysis Configuration Modal */}
      <AnalysisConfigModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        campaignId={campaign.id}
        onConfigured={() => setAnalysisModalOpen(false)}
      />
    </div>
  );
};

export default CampaignControls;
