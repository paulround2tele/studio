"use client";
import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { pipelineSelectors, selectRetryEligiblePhases } from '@/store/selectors/pipelineSelectors';
import { useAppDispatch } from '@/store/hooks';
import { setSelectedPhase } from '@/store/ui/campaignUiSlice';
import DiscoveryConfigForm from '@/components/campaigns/workspace/forms/DiscoveryConfigForm';
import DNSValidationConfigForm from '@/components/campaigns/workspace/forms/DNSValidationConfigForm';
import HTTPValidationConfigForm from '@/components/campaigns/workspace/forms/HTTPValidationConfigForm';
import AnalysisConfigForm from '@/components/campaigns/workspace/forms/AnalysisConfigForm';
import EnrichmentConfigForm from '@/components/campaigns/workspace/forms/EnrichmentConfigForm';
import Button from '@/components/ta/ui/button/Button';
import { PhaseStepper, PhasePanelShell, StatusBadge, CampaignOverviewCard, AlertStack } from '@/components/campaigns/workspace';
import { useStartPhaseStandaloneMutation, useGetCampaignStatusQuery } from '@/store/api/campaignApi';
import computeAutoStartPhase from '@/store/selectors/autoAdvanceLogic';
import type { PhaseStatusResponse } from '@/lib/api-client/models/phase-status-response';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';
import { getPhaseDisplayName } from '@/lib/utils/phaseMapping';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/utils/getApiErrorMessage';

type CampaignPhase = PhaseStatusResponse['phase'];

interface PipelineWorkspaceProps { campaignId: string; }

// Unified pipeline layout (legacy flag removed during final cleanup phase)

const friendlyPhaseLabel = (phaseKey: string): string => {
  const normalized = normalizeToApiPhase(phaseKey.toLowerCase());
  return normalized ? getPhaseDisplayName(normalized) : phaseKey;
};

export const PipelineWorkspace: React.FC<PipelineWorkspaceProps> = ({ campaignId }) => {
  // Snapshot-centric: keep campaign status in cache and let SSE patch it.
  useGetCampaignStatusQuery(campaignId, { skip: !campaignId });
  useCampaignSSE({ campaignId, autoConnect: Boolean(campaignId) });
  const selectOverview = React.useMemo(()=>pipelineSelectors.overview(campaignId),[campaignId]);
  const ov = useAppSelector(selectOverview);
  const { phases, mode, guidance, failures, nextAction } = ov;
  const selectedPhase = useAppSelector(React.useMemo(()=>pipelineSelectors.selectedPhase(campaignId),[campaignId]));
  const selectStartCTA = React.useMemo(()=>pipelineSelectors.startCTAState(campaignId),[campaignId]);
  const startCTA = useAppSelector(selectStartCTA);
  const retryEligible = useAppSelector(React.useMemo(()=>selectRetryEligiblePhases(campaignId),[campaignId]));
  const dispatch = useAppDispatch();
  const [startPhase] = useStartPhaseStandaloneMutation();
  const { toast } = useToast();
  const pendingAutoStarts = React.useRef<Set<string>>(new Set());
  const autoAdvanceAlerts = React.useMemo(() => {
    if (!mode.autoAdvance || !mode.hint) return [];
    return [{
      id: 'auto-advance-hint',
      tone: mode.state === 'blocked' ? 'warn' as const : 'info' as const,
      title: 'Auto Advance',
      message: mode.hint,
    }];
  }, [mode.autoAdvance, mode.hint, mode.state]);

  // Auto-advance effect: when in full sequence mode and a phase just completed, start next configured idle phase.
  React.useEffect(() => {
    if (!mode.autoAdvance) return;
    const nextAuto = computeAutoStartPhase(phases, mode.autoAdvance);
    if (!nextAuto || pendingAutoStarts.current.has(nextAuto)) {
      return;
    }
    pendingAutoStarts.current.add(nextAuto);
    startPhase({ campaignId, phase: nextAuto as CampaignPhase }).finally(() => {
      setTimeout(() => pendingAutoStarts.current.delete(nextAuto), 3000);
    });
  }, [campaignId, mode.autoAdvance, phases, startPhase]);

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
      case 'enrichment':
        return <EnrichmentConfigForm {...common} readOnly={isConfigured} />;
      default: return <div className="text-xs">Unknown phase: {phase}</div>;
    }
  };
  // Derive stepper model for new PhaseStepper (Phase 2 integration, non-destructive)
  const stepperPhases = React.useMemo(() => phases.map((p, idx) => ({
    key: p.key,
    label: friendlyPhaseLabel(p.key),
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
          title={panelPhase ? `${friendlyPhaseLabel(panelPhase)} ${isConfigured ? 'Configured' : 'Configuration'}` : 'Phase'}
          statusBadges={panelPhase && (
            <>
              <StatusBadge variant={isConfigured ? 'configured' : 'missing'} compact>{phaseMeta?.configState}</StatusBadge>
              {phaseMeta?.execState && <StatusBadge variant={phaseMeta.execState === 'failed' ? 'failed' : phaseMeta.execState === 'completed' ? 'completed' : phaseMeta.execState === 'running' ? 'running' : phaseMeta.execState === 'paused' ? 'paused' : 'idle'} compact>{phaseMeta.execState}</StatusBadge>}
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
                ...autoAdvanceAlerts,
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
                  <Button
                    key={p}
                    size="sm"
                    variant="outline"
                    className="text-[10px] py-1 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
                    onClick={async () => {
                      try {
                        await startPhase({ campaignId, phase: p as CampaignPhase }).unwrap();
                      } catch (e: unknown) {
                        toast({
                          title: 'Retry Failed',
                          description: getApiErrorMessage(e, `Failed to retry ${friendlyPhaseLabel(p)}`),
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    Retry {friendlyPhaseLabel(p)}
                  </Button>
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