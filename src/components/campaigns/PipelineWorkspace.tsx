"use client";
import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { pipelineSelectors, selectRetryEligiblePhases } from '@/store/selectors/pipelineSelectors';
import { useAppDispatch } from '@/store/hooks';
import { setFullSequenceMode, setSelectedPhase } from '@/store/ui/campaignUiSlice';
import DiscoveryConfigForm from '@/components/campaigns/workspace/forms/DiscoveryConfigForm';
import DNSValidationConfigForm from '@/components/campaigns/workspace/forms/DNSValidationConfigForm';
import HTTPValidationConfigForm from '@/components/campaigns/workspace/forms/HTTPValidationConfigForm';
import AnalysisConfigForm from '@/components/campaigns/workspace/forms/AnalysisConfigForm';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PhaseStepper, PhasePanelShell, StatusBadge, CampaignOverviewCard, AlertStack } from '@/components/campaigns/workspace';
import { useStartPhaseStandaloneMutation, useGetPhaseStatusStandaloneQuery, campaignApi } from '@/store/api/campaignApi';
import computeAutoStartPhase from '@/store/selectors/autoAdvanceLogic';

interface PipelineWorkspaceProps { campaignId: string; }

// Unified pipeline layout (legacy flag removed during final cleanup phase)

const railColor = (p:any) => {
  if (p.execState === 'failed') return 'border-red-500 bg-red-50';
  if (p.execState === 'completed') return 'border-green-500 bg-green-50';
  if (p.execState === 'running') return 'border-blue-500 bg-blue-50';
  if (p.configState === 'valid') return 'border-gray-400 bg-gray-50';
  return 'border-gray-300';
};

export const PipelineWorkspace: React.FC<PipelineWorkspaceProps> = ({ campaignId }) => {
  // Actively subscribe to per-phase status so selectors receive data+invalidations
  useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'discovery' });
  useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'validation' });
  useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'extraction' });
  useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'analysis' });
  const selectOverview = React.useMemo(()=>pipelineSelectors.overview(campaignId),[campaignId]);
  const ov = useAppSelector(selectOverview);
  const { phases, config, exec, mode, guidance, failures, nextAction } = ov;
  const selectedPhase = useAppSelector(React.useMemo(()=>pipelineSelectors.selectedPhase(campaignId),[campaignId]));
  const selectStartCTA = React.useMemo(()=>pipelineSelectors.startCTAState(campaignId),[campaignId]);
  const startCTA = useAppSelector(selectStartCTA);
  const retryEligible = useAppSelector(React.useMemo(()=>selectRetryEligiblePhases(campaignId),[campaignId]));
  const dispatch = useAppDispatch();
  const [startPhase, { isLoading: startLoading }] = useStartPhaseStandaloneMutation();
  const pendingAutoStarts = React.useRef<Set<string>>(new Set());

  const toggleMode = (val: boolean) => {
    dispatch(setFullSequenceMode({ campaignId, value: val }));
  };

  const handlePrimaryAction = async () => {
    if (!nextAction) return;
    if (nextAction.type === 'start') {
      await startPhase({ campaignId, phase: nextAction.phase as any });
      // Force immediate status refetch for the started phase
      dispatch(campaignApi.endpoints.getPhaseStatusStandalone.initiate({ campaignId, phase: nextAction.phase } as any));
    }
    // configure path will be handled in Phase 5 when inline forms introduced
  };

  // Auto-advance effect: when in full sequence mode and a phase just completed, start next configured idle phase.
  React.useEffect(() => {
    const nextAuto = computeAutoStartPhase(phases, mode.autoAdvance);
    if (nextAuto) {
      if (pendingAutoStarts.current.has(nextAuto)) return; // suppression: already dispatched
      pendingAutoStarts.current.add(nextAuto);
      startPhase({ campaignId, phase: nextAuto as any }).finally(()=> {
        // Allow retry only if phase failed later; removal when we detect phase started
        setTimeout(()=>pendingAutoStarts.current.delete(nextAuto), 3000);
      });
    }
  }, [phases.map(p=>p.execState).join(','), phases.map(p=>p.configState).join(','), mode.autoAdvance, campaignId]);

  const handlePhaseClick = (phaseKey: string) => {
    dispatch(setSelectedPhase({ campaignId, phase: phaseKey }));
  };

  // Derive which phase panel should show: explicit selection first, else next configure target
  const panelPhase = selectedPhase || (nextAction?.type === 'configure' ? nextAction.phase : undefined);

  const phaseMeta = panelPhase ? phases.find(p=>p.key===panelPhase) : undefined;
  const isConfigured = phaseMeta?.configState === 'valid';

  const renderPhaseForm = (phase: string) => {
    const common = { campaignId, onConfigured: () => { /* after config we let selectors recompute; keep panel open */ }, } as const;
    switch (phase) {
      case 'discovery': return <DiscoveryConfigForm {...common} readOnly={isConfigured} />;
      case 'validation': return <DNSValidationConfigForm {...common} readOnly={isConfigured} />;
      case 'extraction': return <HTTPValidationConfigForm {...common} readOnly={isConfigured} />;
      case 'analysis': return <AnalysisConfigForm {...common} readOnly={isConfigured} />;
      default: return <div className="text-xs">Unknown phase: {phase}</div>;
    }
  };
  // Derive stepper model for new PhaseStepper (Phase 2 integration, non-destructive)
  const stepperPhases = React.useMemo(() => phases.map((p, idx) => ({
    key: p.key,
    label: p.key,
    order: idx,
    configState: p.configState,
    execState: p.execState,
  })), [phases]);

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-6" data-pipeline-workspace data-testid="pipeline-workspace">
      <CampaignOverviewCard campaignId={campaignId} />
      <PhaseStepper
        phases={stepperPhases}
        activePhase={panelPhase}
        onPhaseSelect={handlePhaseClick}
        className="w-full"
        data-testid="pipeline-phase-stepper"
        orientation="horizontal"
      />
      {/* Adaptive Panel */}
        <PhasePanelShell
          phaseKey={panelPhase}
          title={panelPhase ? `${panelPhase} ${isConfigured ? 'Configured' : 'Configuration'}` : 'Phase'}
          statusBadges={panelPhase && (
            <>
              <StatusBadge variant={isConfigured ? 'configured' : 'missing'} compact>{phaseMeta?.configState}</StatusBadge>
              {phaseMeta?.execState && <StatusBadge variant={phaseMeta.execState === 'failed' ? 'failed' : phaseMeta.execState === 'completed' ? 'completed' : phaseMeta.execState === 'running' ? 'running' : 'idle'} compact>{phaseMeta.execState}</StatusBadge>}
            </>
          )}
          actions={panelPhase && (
            <div className="flex items-center gap-2">
              {isConfigured && (
                <Button size="sm" variant="outline" onClick={()=>dispatch(setSelectedPhase({campaignId, phase: panelPhase}))}>Edit</Button>
              )}
            </div>
          )}
          onClose={panelPhase ? () => dispatch(setSelectedPhase({campaignId, phase: undefined})) : undefined}
          alerts={<>
            <AlertStack
              items={[
                ...(startCTA.disabled && startCTA.reasons.length > 0 ? [{
                  id: 'start-gating',
                  tone: 'warn' as const,
                  title: 'Cannot start full sequence',
                  message: startCTA.reasons.join('; '),
                }] : []),
                ...(failures.lastFailed ? [{
                  id: 'last-failed',
                  tone: 'error' as const,
                  title: 'Last Failed Phase',
                  message: failures.lastFailed,
                }] : []),
                ...(guidance.latest ? [{
                  id: 'guidance',
                  tone: 'info' as const,
                  title: 'Guidance',
                  message: guidance.latest.message,
                }] : []),
                ...(retryEligible.length > 0 ? [{
                  id: 'retry-failed',
                  tone: 'error' as const,
                  title: 'Retry Failed Phases',
                  message: retryEligible.join(', '),
                  dismissible: false,
                }] : []),
              ]}
            />
            {retryEligible.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1" aria-label="Retry failed phase buttons">
                {retryEligible.map(p => (
                  <Button key={p} size="sm" variant="destructive" className="text-[10px] py-1" onClick={()=>startPhase({ campaignId, phase: p as any })}>Retry {p}</Button>
                ))}
              </div>
            )}
          </>}
        >
          {!panelPhase && (
            <div className="text-gray-600 text-sm" data-testid="pipeline-phase-placeholder">Select a phase or follow the next action guidance. Inline forms will render here.</div>
          )}
          {panelPhase && (
            <div className="space-y-3" data-testid={`pipeline-phase-panel-${panelPhase}`}>
              {renderPhaseForm(panelPhase)}
            </div>
          )}
          {retryEligible.length > 0 && (
            <div className="sr-only" aria-hidden="true">Retry actions duplicated in AlertStack removed</div>
          )}
  </PhasePanelShell>
    </div>
  );
};

export default PipelineWorkspace;