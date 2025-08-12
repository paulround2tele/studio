import { useState } from 'react';
import { CheckCircle, Play, Pause, Square, Settings, RotateCcw, AlertTriangle } from 'lucide-react';
import PhaseGateButton from './PhaseGateButton';
import { PhaseConfiguration } from './PhaseConfiguration';
import type { Campaign } from '@/lib/api-client/models';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import { useToast } from '@/hooks/use-toast';

interface CampaignControlsProps {
  campaign: Campaign;
  actionLoading: Record<string, boolean>;
  onStartPhase: (phaseType: string) => Promise<void>;
  onPausePhase: (phaseType: string) => Promise<void>;
  onResumePhase: (phaseType: string) => Promise<void>;
  onCancelPhase: (phaseType: string) => Promise<void>;
  className?: string;
}

export const CampaignControls: React.FC<CampaignControlsProps> = ({
  campaign,
  actionLoading,
  onStartPhase,
  onPausePhase,
  onResumePhase,
  onCancelPhase,
  className
}) => {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedPhaseType, setSelectedPhaseType] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Professional RTK Query mutation instead of amateur singleton API instantiation
  const [startPhaseStandalone, { isLoading: isStartingPhase }] = useStartPhaseStandaloneMutation();

  // Determine campaign mode
  const isFullSequenceMode = campaign.fullSequenceMode === true;
  const campaignMode = isFullSequenceMode ? 'Full Auto Sequence' : 'Step-by-Step';

  // Get current phase details
  const getCurrentPhase = () => {
    return campaign.phases?.find(phase => phase.status === 'in_progress' || phase.status === 'paused');
  };

  const currentPhase = getCurrentPhase();

  // Handle opening the configuration dialog
  const handleConfigurePhase = (phaseType: string) => {
    setSelectedPhaseType(phaseType);
    setConfigDialogOpen(true);
  };

  // Handle phase restart - use professional RTK Query instead of amateur singleton pattern
  const handleRestartPhase = async (phaseType: string) => {
    if (!campaign.id) {
      toast({
        title: "Error",
        description: "Campaign ID is missing",
        variant: "destructive"
      });
      return;
    }

    try {
      // Use RTK Query mutation with proper error handling
      await startPhaseStandalone({ 
        campaignId: campaign.id, 
        phase: phaseType as any // RTK Query handles type validation
      }).unwrap();

      toast({
        title: "Phase Started",
        description: `${phaseType.replace('_', ' ')} phase has been started successfully.`,
      });

      // Trigger campaign refresh through RTK Query cache invalidation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force_campaign_refresh', {
          detail: { campaignId: campaign.id }
        }));
      }
    } catch (error: any) {
      // RTK Query provides consistent error format
      const errorMessage = error?.data?.message || error?.message || 'Failed to start phase';
      toast({
        title: "Start Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Handle phase transition completion
  const handlePhaseStarted = async (campaignId: string) => {
    console.log('[DEBUG] Phase transition completed for campaign:', campaignId);
    
    // Force cache invalidation to get updated campaign state
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('force_campaign_refresh', {
        detail: { campaignId }
      }));
    }
    
    // Wait for phase transition to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Force additional cache refresh to ensure we have the latest phase data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('force_campaign_refresh', {
        detail: { campaignId }
      }));
    }
    
    console.log('[DEBUG] Campaign controls will refresh to show new phase state');
  };

  // BACKEND-DRIVEN: Just read the backend state and display appropriate UI
  const renderPhaseButtons = () => {
    // If current phase is running, show pause/cancel controls
    if (currentPhase?.status === "in_progress") {
      return (
        <div className="flex gap-2">
          <PhaseGateButton
            label="Pause"
            onClick={() => onPausePhase(currentPhase.phaseType!)}
            Icon={Pause}
            variant="secondary"
            isLoading={actionLoading.pause}
            disabled={!!actionLoading.pause}
          />
          <PhaseGateButton
            label="Cancel"
            onClick={() => onCancelPhase(currentPhase.phaseType!)}
            Icon={Square}
            variant="destructive"
            isLoading={actionLoading.cancel}
            disabled={!!actionLoading.cancel}
          />
        </div>
      );
    }

    // If current phase is paused, show resume/cancel controls
    if (currentPhase?.status === "paused") {
      return (
        <div className="flex gap-2">
          <PhaseGateButton
            label="Resume"
            onClick={() => onResumePhase(currentPhase.phaseType!)}
            Icon={Play}
            variant="default"
            isLoading={actionLoading.resume}
            disabled={!!actionLoading.resume}
          />
          <PhaseGateButton
            label="Cancel"
            onClick={() => onCancelPhase(currentPhase.phaseType!)}
            Icon={Square}
            variant="destructive"
            isLoading={actionLoading.cancel}
            disabled={!!actionLoading.cancel}
          />
        </div>
      );
    }

    // BACKEND-DRIVEN: If current phase is completed, determine next phase
    const completedPhase = campaign.phases?.find(phase => phase.status === 'completed');
    const allPhasesCompleted = campaign.phases?.every(phase =>
      phase.status === 'completed' || phase.status === 'not_started'
    ) && campaign.phases?.some(phase => phase.status === 'completed');

    if (completedPhase && !currentPhase) {
      // Get the next phase that needs to be started
      const phaseOrder = ['domain_generation', 'dns_validation', 'http_keyword_validation', 'analysis'];
      const completedPhases = campaign.phases?.filter(p => p.status === 'completed').map(p => p.phaseType) || [];
      const nextPhaseType = phaseOrder.find(phase => !completedPhases.includes(phase as any));
      
      if (!nextPhaseType || allPhasesCompleted) {
        // No next phase - campaign pipeline is fully complete
        return (
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-green-500 flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Campaign Pipeline Complete!
            </p>
            <p className="text-sm text-muted-foreground">
              All phases have been successfully executed for this campaign.
            </p>
          </div>
        );
      }

      // Phase display names mapping
      const getPhaseDisplayName = (phase: string) => {
        const names: Record<string, string> = {
          'domain_generation': 'Domain Generation',
          'dns_validation': 'DNS Validation',
          'http_keyword_validation': 'HTTP Keyword Validation',
          'analysis': 'Analysis'
        };
        return names[phase] || phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      const nextPhaseDisplayName = getPhaseDisplayName(nextPhaseType);
      const completedPhaseDisplayName = getPhaseDisplayName(completedPhase.phaseType!);

      // Check if this is an automated phase (like analysis)
      const isAutomatedPhase = nextPhaseType === 'analysis';
      
      // Check if restart is available for completed phase (except domain generation)
      const canRestartCompletedPhase = completedPhase.phaseType !== 'domain_generation';

      return (
        <div className="text-center space-y-3">
          {/* Campaign Mode Badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isFullSequenceMode
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {campaignMode}
            </span>
          </div>

          <p className="text-lg font-semibold text-green-500 flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6" />
            {completedPhaseDisplayName} Complete!
          </p>
          
          {/* Primary action: Next phase or configure next phase */}
          {isFullSequenceMode ? (
            // Full Auto Sequence: Show automatic progression info
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                ✨ In Full Auto Sequence mode, phases progress automatically
              </p>
              {nextPhaseType && (
                <PhaseGateButton
                  label={isAutomatedPhase ? `Start ${nextPhaseDisplayName}` : `Next: ${nextPhaseDisplayName}`}
                  onClick={() => {
                    if (isAutomatedPhase) {
                      onStartPhase(nextPhaseType);
                    } else {
                      handleConfigurePhase(nextPhaseType);
                    }
                  }}
                  Icon={isAutomatedPhase ? Play : Settings}
                  variant="default"
                  isLoading={actionLoading[`phase-${nextPhaseType}`]}
                  disabled={!!actionLoading[`phase-${nextPhaseType}`]}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                />
              )}
            </div>
          ) : (
            // Step-by-Step: Show manual configuration
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                🚀 Step-by-Step mode: Configure each phase manually
              </p>
              {nextPhaseType && (
                <PhaseGateButton
                  label={`Configure ${nextPhaseDisplayName}`}
                  onClick={() => handleConfigurePhase(nextPhaseType)}
                  Icon={Settings}
                  variant="default"
                  isLoading={actionLoading[`phase-${nextPhaseType}`]}
                  disabled={!!actionLoading[`phase-${nextPhaseType}`] ||
                    (nextPhaseType === 'http_keyword_validation' && !completedPhases.includes('dns_validation'))}
                  className="bg-green-600 hover:bg-green-700 text-white"
                />
              )}
              {nextPhaseType === 'http_keyword_validation' && !completedPhases.includes('dns_validation') && (
                <p className="text-xs text-amber-600 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  HTTP validation requires DNS validation completion
                </p>
              )}
            </div>
          )}

          {/* Restart completed phase button (except domain generation) */}
          {canRestartCompletedPhase && (
            <div className="border-t pt-3 mt-3">
              <PhaseGateButton
                label={`Restart ${completedPhaseDisplayName}`}
                onClick={() => handleRestartPhase(completedPhase.phaseType!)}
                Icon={RotateCcw}
                variant="outline"
                isLoading={actionLoading[`restart-${completedPhase.phaseType}`]}
                disabled={!!actionLoading[`restart-${completedPhase.phaseType}`]}
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Restart this phase with new configuration
              </p>
            </div>
          )}
        </div>
      );
    }

    // If campaign has no active phases, this indicates domain generation should have auto-started
    // Domain generation is auto-started at campaign creation, so this state shouldn't normally occur
    if (!currentPhase && !completedPhase) {
      return (
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground mb-2">
            ⚡ Domain generation should start automatically after campaign creation
          </p>
          <p className="text-xs text-muted-foreground">
            If you're seeing this, the campaign may still be initializing or there may be an issue.
          </p>
        </div>
      );
    }

    // If current phase failed, show restart option
    const failedPhase = campaign.phases?.find(phase => phase.status === 'failed');
    if (failedPhase) {
      const getPhaseDisplayName = (phase: string) => {
        const names: Record<string, string> = {
          'domain_generation': 'Domain Generation',
          'dns_validation': 'DNS Validation',
          'http_keyword_validation': 'HTTP Keyword Validation',
          'analysis': 'Analysis'
        };
        return names[phase] || phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      };
      
      const failedPhaseDisplayName = getPhaseDisplayName(failedPhase.phaseType!);
        
      return (
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-red-500 flex items-center justify-center gap-2">
            <Square className="h-6 w-6" />
            {failedPhaseDisplayName} Failed
          </p>
          
          <PhaseGateButton
            label={`Retry ${failedPhaseDisplayName}`}
            onClick={() => onStartPhase(failedPhase.phaseType!)}
            Icon={Play}
            variant="default"
            isLoading={actionLoading.start}
            disabled={!!actionLoading.start}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          />
          
          <p className="text-xs text-muted-foreground">
            Retry the failed phase with the same configuration
          </p>
        </div>
      );
    }

    // Default case - This shouldn't normally occur since domain generation auto-starts
    return (
      <div className="text-center p-4">
        <p className="text-sm text-muted-foreground mb-2">
          ⚠️ Unexpected campaign state detected
        </p>
        <p className="text-xs text-muted-foreground">
          Domain generation should have started automatically. Please refresh or contact support if this persists.
        </p>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {renderPhaseButtons()}
      
      {selectedPhaseType && (
        <PhaseConfiguration
          mode="dialog"
          isOpen={configDialogOpen}
          onClose={() => setConfigDialogOpen(false)}
          phaseType={selectedPhaseType}
          sourceCampaign={campaign as any}
          onPhaseStarted={handlePhaseStarted}
        />
      )}
    </div>
  );
};

export default CampaignControls;