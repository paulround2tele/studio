import { useState } from 'react';
import { CheckCircle, Play, Pause, Square, Settings } from 'lucide-react';
import PhaseGateButton from './PhaseGateButton';
import { PhaseConfiguration } from './PhaseConfiguration';
import { Campaign } from '@/lib/types';

interface CampaignControlsProps {
  campaign: Campaign;
  actionLoading: Record<string, boolean>;
  onStartPhase: (phaseType: string) => Promise<void>;
  onPauseCampaign: () => void;
  onResumeCampaign: () => void;
  onStopCampaign: () => void;
  className?: string;
}

export const CampaignControls: React.FC<CampaignControlsProps> = ({
  campaign,
  actionLoading,
  onStartPhase,
  onPauseCampaign,
  onResumeCampaign,
  onStopCampaign,
  className
}) => {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedPhaseType, setSelectedPhaseType] = useState<string | null>(null);

  // Handle opening the configuration dialog
  const handleConfigurePhase = (phaseType: string) => {
    setSelectedPhaseType(phaseType);
    setConfigDialogOpen(true);
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
    // If current phase is running, show pause/stop controls
    if (campaign.phaseStatus === "in_progress") {
      return (
        <div className="flex gap-2">
          <PhaseGateButton
            label="Pause"
            onClick={onPauseCampaign}
            Icon={Pause}
            variant="secondary"
            isLoading={actionLoading.pause}
            disabled={!!actionLoading.pause}
          />
          <PhaseGateButton
            label="Stop"
            onClick={onStopCampaign}
            Icon={Square}
            variant="destructive"
            isLoading={actionLoading.stop}
            disabled={!!actionLoading.stop}
          />
        </div>
      );
    }

    // If current phase is paused, show resume/stop controls
    if (campaign.phaseStatus === "paused") {
      return (
        <div className="flex gap-2">
          <PhaseGateButton
            label="Resume"
            onClick={onResumeCampaign}
            Icon={Play}
            variant="default"
            isLoading={actionLoading.resume}
            disabled={!!actionLoading.resume}
          />
          <PhaseGateButton
            label="Stop"
            onClick={onStopCampaign}
            Icon={Square}
            variant="destructive"
            isLoading={actionLoading.stop}
            disabled={!!actionLoading.stop}
          />
        </div>
      );
    }

    // BACKEND-DRIVEN: If current phase is completed, determine next phase
    if (campaign.phaseStatus === "completed") {
      // Determine next phase based on current phase
      const getNextPhase = (currentPhase: string): string | null => {
        const phaseOrder = ['setup', 'generation', 'dns_validation', 'http_keyword_validation', 'analysis'];
        const currentIndex = phaseOrder.indexOf(currentPhase);
        if (currentIndex !== -1 && currentIndex < phaseOrder.length - 1) {
          const nextPhase = phaseOrder[currentIndex + 1];
          return nextPhase || null;
        }
        return null;
      };

      const nextPhase = campaign.currentPhase ? getNextPhase(campaign.currentPhase) : 'generation';
      
      if (!nextPhase) {
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
          'setup': 'Campaign Setup',
          'generation': 'Domain Generation', 
          'dns_validation': 'DNS Validation',
          'http_keyword_validation': 'HTTP Keyword Validation', 
          'analysis': 'Analysis'
        };
        return names[phase] || phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      const nextPhaseDisplayName = getPhaseDisplayName(nextPhase);
      const currentPhaseDisplayName = getPhaseDisplayName(campaign.currentPhase || 'unknown');

      // Check if this is an automated phase (like analysis)
      const isAutomatedPhase = nextPhase === 'analysis';

      return (
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-green-500 flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6" />
            {currentPhaseDisplayName} Complete!
          </p>
          
          <PhaseGateButton
            label={isAutomatedPhase ? `Start ${nextPhaseDisplayName}` : `Configure ${nextPhaseDisplayName}`}
            onClick={() => {
              if (isAutomatedPhase) {
                // Start automated phase directly
                onStartPhase(nextPhase);
              } else {
                // Open configuration dialog for manual phases
                handleConfigurePhase(nextPhase);
              }
            }}
            Icon={isAutomatedPhase ? Play : Settings}
            variant="default"
            isLoading={actionLoading[`phase-${nextPhase}`]}
            disabled={!!actionLoading[`phase-${nextPhase}`]}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          />
          
          <p className="text-xs text-muted-foreground">
            {isAutomatedPhase 
              ? 'Start the final analysis phase'
              : 'Configure and start the next phase of the campaign pipeline'
            }
          </p>
        </div>
      );
    }

    // If campaign is not started or in setup phase, show start button
    if (campaign.phaseStatus === "not_started" || campaign.currentPhase === "setup") {
      return (
        <PhaseGateButton
          label="Start Campaign"
          onClick={() => onStartPhase('generation')} // Always start with generation phase
          Icon={Play}
          variant="default"
          isLoading={actionLoading.start}
          disabled={!!actionLoading.start}
          className="bg-green-600 hover:bg-green-700 text-white"
        />
      );
    }

    // If current phase failed, show restart option
    if (campaign.phaseStatus === "failed") {
      const currentPhaseDisplayName = campaign.currentPhase 
        ? campaign.currentPhase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        : 'Current Phase';
        
      return (
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-red-500 flex items-center justify-center gap-2">
            <Square className="h-6 w-6" />
            {currentPhaseDisplayName} Failed
          </p>
          
          <PhaseGateButton
            label={`Retry ${currentPhaseDisplayName}`}
            onClick={() => onStartPhase(campaign.currentPhase || 'generation')}
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

    // Default case - show generic start button for current phase
    return (
      <PhaseGateButton
        label="Start Phase"
        onClick={() => onStartPhase(campaign.currentPhase || 'generation')}
        Icon={Play}
        variant="default"
        isLoading={actionLoading.start}
        disabled={!!actionLoading.start}
      />
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
          sourceCampaign={campaign}
          onPhaseStarted={handlePhaseStarted}
        />
      )}
    </div>
  );
};

export default CampaignControls;