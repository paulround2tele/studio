// Campaign Controls Component - Start/pause/resume/cancel buttons
// Part of the modular architecture replacing the monolithic campaign details page

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Play,
  PauseCircle,
  PlayCircle,
  StopCircle,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import PhaseGateButton from '@/components/campaigns/PhaseGateButton';
import PhaseConfigurationPanel from '@/components/campaigns/PhaseConfigurationPanel';
import type { CampaignViewModel, CampaignType } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CampaignControlsProps {
  campaign: CampaignViewModel;
  actionLoading: Record<string, boolean>;
  onStartPhase: (phaseToStart: CampaignType) => Promise<void>;
  onPauseCampaign: () => void;
  onResumeCampaign: () => void;
  onStopCampaign: () => void;
  className?: string;
}

const phaseDisplayNames: Record<string, string> = {
  domain_generation: "Domain Generation",
  dns_validation: "DNS Validation",
  http_keyword_validation: "HTTP Validation",
};

const phaseIcons: Record<string, LucideIcon> = {
  domain_generation: Play,
  dns_validation: CheckCircle,
  http_keyword_validation: CheckCircle,
};

const getFirstPhase = (campaignType: CampaignType): CampaignType => {
  // For now, just return the same campaign type as the first phase
  return campaignType;
};

// ✅ CAMPAIGN ORCHESTRATION PIPELINE: Define the sequential workflow
const getNextPhaseConfig = (completedPhase: CampaignType | undefined): {
  phaseType: CampaignType;
  displayName: string;
  icon: LucideIcon;
} | null => {
  switch (completedPhase) {
    case 'domain_generation':
      return {
        phaseType: 'dns_validation',
        displayName: 'DNS Validation',
        icon: CheckCircle
      };
    case 'dns_validation':
      return {
        phaseType: 'http_keyword_validation',
        displayName: 'HTTP Keyword Validation',
        icon: CheckCircle
      };
    case 'http_keyword_validation':
      // Final phase - no next phase
      return null;
    default:
      return null;
  }
};

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
  const [selectedPhaseType, setSelectedPhaseType] = useState<CampaignType | null>(null);

  // Handle opening the configuration dialog
  const handleConfigurePhase = (phaseType: CampaignType) => {
    setSelectedPhaseType(phaseType);
    setConfigDialogOpen(true);
  };

  // Handle phase started from dialog
  const handlePhaseStarted = (_campaignId: string) => {
    // Refresh the parent page or navigate to the new campaign
    window.location.reload();
  };
  const renderPhaseButtons = () => {
    // 🔧 CRITICAL FIX: Match backend behavior - domain generation auto-completes
    
    // Campaign completed - show next phase button or completion message
    if (campaign.status === "completed") {
      // ✅ AUTOMATIC PHASE PROGRESSION: Show next phase buttons when campaign completes
      const nextPhaseConfig = getNextPhaseConfig(campaign.campaignType);
      
      if (nextPhaseConfig) {
        return (
          <div className="text-center space-y-3">
            <p className="text-lg font-semibold text-green-500 flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6" />
              {campaign.campaignType ? phaseDisplayNames[campaign.campaignType] : 'Campaign'} Completed!
            </p>
            
            <PhaseGateButton
              label={`Configure ${nextPhaseConfig.displayName}`}
              onClick={() => handleConfigurePhase(nextPhaseConfig.phaseType)}
              Icon={nextPhaseConfig.icon}
              variant="default"
              isLoading={actionLoading[`phase-${nextPhaseConfig.phaseType}`]}
              disabled={!!actionLoading[`phase-${nextPhaseConfig.phaseType}`]}
              className="bg-green-600 hover:bg-green-700 text-white"
            />
            
            <p className="text-xs text-muted-foreground">
              Configure personas, proxies, and tuning parameters for the next phase
            </p>
          </div>
        );
      } else {
        // Final phase completed - show completion message
        return (
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-green-500 flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Campaign Orchestration Complete!
            </p>
            <p className="text-sm text-muted-foreground">
              All phases of the campaign pipeline have been successfully executed.
            </p>
          </div>
        );
      }
    }
    
    // Campaign failed - show retry option only for non-domain-generation campaigns
    if (campaign.status === "failed") {
      const failedPhaseName = campaign.campaignType
        ? (phaseDisplayNames[campaign.campaignType] || campaign.campaignType)
        : 'Unknown Phase';
      
      return (
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive mb-2">
            Failed: {failedPhaseName}
          </p>
          {campaign.errorMessage && (
            <p className="text-sm text-muted-foreground mb-3">
              Error: {campaign.errorMessage}
            </p>
          )}
          {/* Only show retry for campaigns that can be manually restarted */}
          {campaign.campaignType !== 'domain_generation' && (
            <PhaseGateButton
              label={`Retry ${failedPhaseName}`}
              onClick={() => {
                if (campaign.campaignType) {
                  onStartPhase(campaign.campaignType);
                }
              }}
              Icon={RefreshCw}
              variant="destructive"
              isLoading={actionLoading[`phase-${campaign.campaignType}`]}
              disabled={!!actionLoading[`phase-${campaign.campaignType}`]}
            />
          )}
        </div>
      );
    }
    
    // Campaign paused - show resume option
    if (campaign.status === "paused") {
      const pausedPhaseName = campaign.campaignType
        ? (phaseDisplayNames[campaign.campaignType] || campaign.campaignType)
        : 'Unknown Phase';
      
      return (
        <PhaseGateButton
          label={`Resume ${pausedPhaseName}`}
          onClick={onResumeCampaign}
          Icon={PlayCircle}
          isLoading={actionLoading['control-resume']}
          disabled={!!actionLoading['control-resume']}
        />
      );
    }
    
    // Campaign queued - show queued status
    if (campaign.status === "queued") {
      const queuedPhaseName = campaign.campaignType
        ? (phaseDisplayNames[campaign.campaignType] || campaign.campaignType)
        : 'Unknown Phase';
      
      return (
        <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {queuedPhaseName} is queued to start...
        </p>
      );
    }
    
    // Campaign running - show progress text
    if (campaign.status === "running") {
      // CRITICAL: Use currentPhase instead of campaignType to show the actual running phase
      const currentPhaseName = campaign.currentPhase
        ? (phaseDisplayNames[campaign.currentPhase] || campaign.currentPhase)
        : campaign.campaignType
          ? (phaseDisplayNames[campaign.campaignType] || campaign.campaignType)
          : 'Unknown Phase';
      
      const progressText = campaign.progressPercentage ? `(${campaign.progressPercentage}%)` : '';
      
      return (
        <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {currentPhaseName} in progress {progressText}...
        </p>
      );
    }
    
    // Campaign pending - show start button only for non-auto campaigns
    if (campaign.status === "pending") {
      const selectedType = campaign.campaignType;
      if (selectedType && selectedType !== 'domain_generation') {
        // Only show manual start for DNS and HTTP campaigns
        const firstPhase = getFirstPhase(selectedType);
        const phaseDisplayName = firstPhase ? (phaseDisplayNames[firstPhase] || firstPhase) : 'Unknown';
        const PhaseIcon = firstPhase ? (phaseIcons[firstPhase] || Play) : Play;
        
        return (
          <PhaseGateButton
            label={`Start ${phaseDisplayName}`}
            onClick={() => onStartPhase(firstPhase)}
            Icon={PhaseIcon}
            isLoading={actionLoading[`phase-${firstPhase}`]}
            disabled={!!actionLoading[`phase-${firstPhase}`]}
          />
        );
      } else if (selectedType === 'domain_generation') {
        // Domain generation auto-starts, show processing message
        return (
          <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Domain generation processing...
          </p>
        );
      }
    }
    
    return null;
  };

  const renderCampaignControlButtons = () => {
    // 🔧 CRITICAL FIX: Show control buttons for active campaigns, hide for completed
    
    // Hide buttons for terminal states (completed, failed, cancelled)
    if (!campaign ||
        campaign.status === 'completed' ||
        campaign.status === 'failed' ||
        campaign.status === 'cancelled') {
      return null;
    }
    
    // Show control buttons for active states (running, paused, queued)
    const isActiveState = ['running', 'paused', 'queued'].includes(campaign.status || '');
    
    if (!isActiveState) {
      return null;
    }
    
    return (
      <div className="flex gap-2 justify-center">
        {/* Pause button - only for running campaigns */}
        {campaign.status === 'running' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPauseCampaign}
            disabled={actionLoading['control-pause']}
            className="flex items-center gap-2"
          >
            <PauseCircle className="h-4 w-4" />
            Pause
            {actionLoading['control-pause'] && (
              <RefreshCw className="h-3 w-3 animate-spin ml-1" />
            )}
          </Button>
        )}
        
        {/* Resume button - only for paused campaigns */}
        {campaign.status === 'paused' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResumeCampaign}
            disabled={actionLoading['control-resume']}
            className="flex items-center gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Resume
            {actionLoading['control-resume'] && (
              <RefreshCw className="h-3 w-3 animate-spin ml-1" />
            )}
          </Button>
        )}
        
        {/* Stop/Cancel button - for running, paused, and queued campaigns */}
        {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'queued') && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onStopCampaign}
            disabled={actionLoading['control-stop']}
            className="flex items-center gap-2"
          >
            <StopCircle className="h-4 w-4" />
            {campaign.status === 'queued' ? 'Cancel' : 'Stop'}
            {actionLoading['control-stop'] && (
              <RefreshCw className="h-3 w-3 animate-spin ml-1" />
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className={cn("shadow-lg", className)}>
        <CardHeader>
          <CardTitle>Campaign Actions</CardTitle>
          <CardDescription>
            Control campaign execution and monitor progress
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center min-h-[80px] space-y-3">
          {renderPhaseButtons()}
          {renderCampaignControlButtons()}
          
          {/* API endpoint information */}
          <div className="text-xs text-muted-foreground pt-2 text-center">
            <p>Phase Trigger API: POST /api/v2/campaigns/{campaign.id}/start</p>
            <p>Control APIs: /pause, /resume, /cancel</p>
          </div>
        </CardContent>
      </Card>

      {/* Phase Configuration Panel */}
      {selectedPhaseType && (
        <PhaseConfigurationPanel
          isOpen={configDialogOpen}
          onClose={() => setConfigDialogOpen(false)}
          sourceCampaign={campaign}
          phaseType={selectedPhaseType}
          onPhaseStarted={handlePhaseStarted}
        />
      )}
    </>
  );
};

export default CampaignControls;