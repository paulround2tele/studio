// Campaign Controls Component - Start/pause/resume/cancel buttons
// Part of the modular architecture replacing the monolithic campaign details page

"use client";

import React from 'react';
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
import type { CampaignViewModel, CampaignType } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CampaignControlsProps {
  campaign: CampaignViewModel;
  actionLoading: Record<string, boolean>;
  onStartPhase: (phaseToStart: CampaignType) => void;
  onPauseCampaign: () => void;
  onResumeCampaign: () => void;
  onStopCampaign: () => void;
  className?: string;
}

const phaseDisplayNames: Record<CampaignType, string> = {
  domain_generation: "Domain Generation",
  dns_validation: "DNS Validation",
  http_keyword_validation: "HTTP Validation",
};

const phaseIcons: Record<CampaignType, LucideIcon> = {
  domain_generation: Play,
  dns_validation: CheckCircle,
  http_keyword_validation: CheckCircle,
};

const getFirstPhase = (campaignType: CampaignType): CampaignType => {
  // For now, just return the same campaign type as the first phase
  return campaignType;
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
  const renderPhaseButtons = () => {
    // Campaign completed - show completion message
    if (campaign.status === "completed") {
      return (
        <p className="text-lg font-semibold text-green-500 flex items-center gap-2">
          <CheckCircle className="h-6 w-6" />
          Campaign Completed!
        </p>
      );
    }
    
    // Campaign failed - show retry option
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
          <PhaseGateButton
            label={`Retry ${failedPhaseName}`}
            onClick={() => campaign.campaignType && onStartPhase(campaign.campaignType)}
            Icon={RefreshCw}
            variant="destructive"
            isLoading={actionLoading[`phase-${campaign.campaignType}`]}
            disabled={!!actionLoading[`phase-${campaign.campaignType}`]}
          />
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
    
    // Campaign pending - show start button
    if (campaign.status === "pending") {
      const selectedType = campaign.campaignType;
      if (selectedType) {
        const firstPhase = getFirstPhase(selectedType);
        const phaseDisplayName = phaseDisplayNames[firstPhase] || firstPhase;
        const PhaseIcon = phaseIcons[firstPhase] || Play;
        
        return (
          <PhaseGateButton
            label={`Start ${phaseDisplayName}`}
            onClick={() => onStartPhase(firstPhase)}
            Icon={PhaseIcon}
            isLoading={actionLoading[`phase-${firstPhase}`]}
            disabled={!!actionLoading[`phase-${firstPhase}`]}
          />
        );
      }
    }
    
    // Campaign running - show progress text
    if (campaign.status === "running") {
      const currentPhaseName = campaign.campaignType 
        ? (phaseDisplayNames[campaign.campaignType] || campaign.campaignType) 
        : 'Unknown Phase';
      
      const progressText = `(${campaign.progressPercentage || 0}%)`;
      
      return (
        <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Current phase: {currentPhaseName} is in progress {progressText}...
        </p>
      );
    }
    
    return null;
  };

  const renderCampaignControlButtons = () => {
    if (!campaign || 
        campaign.status === 'completed' || 
        campaign.status === 'pending' || 
        campaign.status === 'failed') {
      return null;
    }
    
    return (
      <div className="flex gap-2 justify-center">
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
        
        {(campaign.status === 'running' || campaign.status === 'paused') && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onStopCampaign} 
            disabled={actionLoading['control-stop']}
            className="flex items-center gap-2"
          >
            <StopCircle className="h-4 w-4" />
            Cancel
            {actionLoading['control-stop'] && (
              <RefreshCw className="h-3 w-3 animate-spin ml-1" />
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
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
  );
};

export default CampaignControls;