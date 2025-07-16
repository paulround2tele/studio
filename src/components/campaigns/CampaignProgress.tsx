"use client";

import React, { memo, useMemo, useCallback } from 'react';
import type { CampaignViewModel, CampaignPhase, CampaignPhaseStatus } from '@/lib/types';
import { CAMPAIGN_PHASES_ORDERED } from '@/lib/constants';
import { CheckCircle, AlertTriangle, Clock, Loader2, WorkflowIcon, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CampaignProgressProps {
  campaign: CampaignViewModel;
}

const phaseDisplayNames: Record<NonNullable<CampaignPhase>, string> = {
  setup: "Campaign Setup",
  generation: "Domain Generation",
  dns_validation: "DNS Validation",
  http_validation: "HTTP Validation",
  analysis: "Analysis",
  cleanup: "Cleanup",
};

// Memoized phase status icon component for better performance
const PhaseStatusIcon = memo(({ phase, status, isActivePhase, isCampaignIdle }: {
  phase: CampaignPhase;
  status: CampaignPhaseStatus;
  isActivePhase: boolean;
  isCampaignIdle: boolean;
}) => {
  if (isCampaignIdle && phase === "setup") return <Play className="h-5 w-5 text-blue-500" />;
  if (status === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === 'failed') return <AlertTriangle className="h-5 w-5 text-destructive" />;
  if (status === 'in_progress' && isActivePhase) return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
  if (status === 'not_started' && (isActivePhase || isCampaignIdle)) return <Clock className="h-5 w-5 text-muted-foreground" />;
  return <WorkflowIcon className="h-5 w-5 text-muted-foreground/50" />; // Default for phases not yet active or completed
});

PhaseStatusIcon.displayName = 'PhaseStatusIcon';

// Memoized phase item component to prevent unnecessary re-renders
const PhaseItem = memo(({
  phase,
  campaign,
  displayPhases,
  operationalPhasesForType: _operationalPhasesForType,
  isActivePhaseNode,
  isCampaignIdle,
  nodeStatus
}: {
  phase: CampaignPhase;
  campaign: CampaignViewModel;
  displayPhases: CampaignPhase[];
  operationalPhasesForType: CampaignPhase[];
  isActivePhaseNode: boolean;
  isCampaignIdle: boolean;
  nodeStatus: CampaignPhaseStatus;
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "relative z-10 flex flex-col items-center text-center group",
           // Adjust width distribution; might need fine-tuning based on max phases
          displayPhases.length <= 4 ? "w-1/4" : "w-1/5",
          (nodeStatus === 'completed' || (isActivePhaseNode && nodeStatus !== 'not_started' && nodeStatus !== 'failed') || (isCampaignIdle && phase === "setup")) ? "text-foreground" : "text-muted-foreground"
        )}>
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
            nodeStatus === 'completed' ? "bg-primary border-primary text-primary-foreground" :
            (isActivePhaseNode && nodeStatus === 'in_progress') ? "bg-blue-500 border-blue-500 text-white" :
            (isActivePhaseNode && nodeStatus === 'failed') ? "bg-destructive border-destructive text-destructive-foreground" :
            (isCampaignIdle && phase === "setup") ? "bg-blue-500 border-blue-500 text-white" : // Special for Idle start
            "bg-secondary border-border group-hover:border-muted-foreground"
          )}>
            <PhaseStatusIcon phase={phase} status={nodeStatus} isActivePhase={isActivePhaseNode} isCampaignIdle={isCampaignIdle && phase === "setup"} />
          </div>
          <p className={cn(
              "mt-2 text-xs sm:text-sm font-medium transition-all duration-300",
               (nodeStatus === 'completed' || (isActivePhaseNode && nodeStatus !== 'not_started' && nodeStatus !== 'failed') || (isCampaignIdle && phase === "setup")) ? "font-semibold" : "font-normal"
           )}>
             {phase ? phaseDisplayNames[phase] : 'Unknown'}
           </p>
           {isActivePhaseNode && campaign.phaseStatus !== "completed" && campaign.phaseStatus !== "failed" && <p className="text-xs text-muted-foreground">{campaign.phaseStatus}</p>}
         </div>
       </TooltipTrigger>
       <TooltipContent>
         <p>{phase ? phaseDisplayNames[phase] : 'Unknown'}</p>
        Status: { isActivePhaseNode && phase !== "setup" ? campaign.phaseStatus : nodeStatus}
      </TooltipContent>
    </Tooltip>
  );
});

PhaseItem.displayName = 'PhaseItem';

// Helper function to get appropriate width class for progress
const getProgressWidthClass = (width: number): string => {
  if (width === 0) return 'campaign-progress-fill-0';
  if (width <= 25) return 'campaign-progress-fill-25';
  if (width <= 33) return 'campaign-progress-fill-33';
  if (width <= 50) return 'campaign-progress-fill-50';
  if (width <= 66) return 'campaign-progress-fill-66';
  if (width <= 75) return 'campaign-progress-fill-75';
  return 'campaign-progress-fill-100';
};

// Memoized main component for optimal performance
const CampaignProgress = memo(({ campaign }: CampaignProgressProps) => {
  const selectedType = campaign.selectedType || campaign.campaignType;
  
  // Memoize display phases calculation to prevent recalculation on every render
  const displayPhases = useMemo(() => {
    const orderedPhases = (selectedType && CAMPAIGN_PHASES_ORDERED[selectedType] ? CAMPAIGN_PHASES_ORDERED[selectedType] : []) as CampaignPhase[];
    return (campaign.currentPhase as any) === "setup" ?
      ["setup" as CampaignPhase, ...orderedPhases] :
      orderedPhases;
  }, [campaign.currentPhase, selectedType]);
  
  // Memoize operational phases for the selected type
  const operationalPhasesForType = useMemo(() => {
    return (selectedType && CAMPAIGN_PHASES_ORDERED[selectedType] ? CAMPAIGN_PHASES_ORDERED[selectedType] : []) as CampaignPhase[];
  }, [selectedType]);

  // Memoize current operational phase calculations
  const { currentOperationalPhase: _currentOperationalPhase, currentOperationalPhaseIndex: _currentOperationalPhaseIndex } = useMemo(() => {
    const currentPhase = (campaign.currentPhase as any) === "setup" ? null : campaign.currentPhase;
    const phaseIndex = currentPhase ? displayPhases.indexOf(currentPhase) : -1;
    return {
      currentOperationalPhase: currentPhase,
      currentOperationalPhaseIndex: phaseIndex
    };
  }, [campaign.currentPhase, displayPhases]);

  // Simplified and fixed node status calculation
  const getNodeStatus = useCallback((phase: CampaignPhase): CampaignPhaseStatus => {
    const isActivePhaseNode = phase === campaign.currentPhase;
    const isCampaignIdle = (campaign.currentPhase as any) === "setup";
    const operationalPhaseIndexInType = operationalPhasesForType.indexOf(phase);
    const currentPhaseIndex = campaign.currentPhase ? operationalPhasesForType.indexOf(campaign.currentPhase) : -1;

    // Handle idle campaigns (setup phase)
    if (isCampaignIdle) {
      return phase === "setup" ? "not_started" : "not_started";
    }

    // Handle completed campaigns
    if (campaign.status === "completed" || (campaign.currentPhase as any) === "completed") {
      // All operational phases should be completed for completed campaigns
      if (operationalPhaseIndexInType !== -1) {
        return 'completed';
      }
      return 'not_started'; // Setup phase for completed campaigns
    }

    // Handle current active phase
    if (isActivePhaseNode) {
      // Use the actual phase status from campaign data
      const phaseStatus = campaign.phaseStatus;
      if (phaseStatus === 'failed') return 'failed';
      if (phaseStatus === 'in_progress') return 'in_progress';
      if (phaseStatus === 'completed') return 'completed';
      if (phaseStatus === 'paused') return 'not_started'; // Treat paused as not_started visually
      return 'in_progress'; // Default for active phase
    }

    // Handle phases before the current phase (should be completed)
    if (operationalPhaseIndexInType !== -1 && currentPhaseIndex !== -1 && operationalPhaseIndexInType < currentPhaseIndex) {
      return 'completed';
    }

    // Handle phases after the current phase (not started yet)
    return 'not_started';
  }, [campaign.currentPhase, campaign.phaseStatus, campaign.status, operationalPhasesForType]);

  // Memoize progress calculation - FIXED: Use actual campaign progress values like CampaignListItem
  const progressWidth = useMemo(() => {
    // Use progressPercentage first, then progress, then calculate based on items
    let progressValue = campaign.progressPercentage ?? campaign.progress ?? 0;
    
    // If no direct progress, try to calculate from processed vs total items
    if (progressValue === 0 && campaign.totalItems && campaign.processedItems) {
      progressValue = Math.floor((campaign.processedItems / campaign.totalItems) * 100);
    }

    if ((campaign.currentPhase as any) === "completed" || campaign.status === "completed") return 100;
    if ((campaign.currentPhase as any) === "setup") return 0;
    
    // For paused or failed campaigns, return the actual progress where it stopped
    if ((campaign.phaseStatus as any) === "paused" || (campaign.phaseStatus as any) === "failed") {
      return Math.max(0, progressValue);
    }

    // For active campaigns, use actual progress value
    return Math.max(0, Math.min(100, progressValue));
  }, [campaign.currentPhase, campaign.status, campaign.phaseStatus, campaign.progressPercentage, campaign.progress, campaign.totalItems, campaign.processedItems]);
  
  return (
    <div className="space-y-6">
      {/* Single TooltipProvider wrapping all phase items for better performance */}
      <TooltipProvider>
        <div className="relative flex justify-between items-center mx-4"> {/* Added margin for edge nodes */}
          {displayPhases.map((phase: CampaignPhase) => {
            const isActivePhaseNode = phase === campaign.currentPhase;
            const isCampaignIdle = (campaign.currentPhase as any) === "setup";
            const nodeStatus = getNodeStatus(phase);

            return (
              <PhaseItem
                key={phase}
                phase={phase}
                campaign={campaign}
                displayPhases={displayPhases}
                operationalPhasesForType={operationalPhasesForType}
                isActivePhaseNode={isActivePhaseNode}
                isCampaignIdle={isCampaignIdle}
                nodeStatus={nodeStatus}
              />
            );
          })}
          {displayPhases.length > 1 && (
              <div 
                className="absolute top-5 left-0 right-0 h-1 bg-border -z-0 campaign-progress-line"
                data-phase-count={displayPhases.length}
              >
              <div
                  className={cn(
                    "h-full bg-primary transition-all duration-500",
                    getProgressWidthClass(progressWidth)
                  )}
              />
              </div>
          )}
        </div>
      </TooltipProvider>

      {(((campaign.phaseStatus as any) === 'in_progress' || (campaign.phaseStatus as any) === 'completed') && campaign.currentPhase !== "setup") || campaign.status === "completed" ? (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>
              {campaign.status === "completed" ? 'Campaign Completed' :
               (campaign.phaseStatus as any) === 'completed' ? 'Phase Completed' : 'Current Phase Progress'}
              {campaign.status !== "completed" && `(${campaign.currentPhase ? phaseDisplayNames[campaign.currentPhase] : 'Unknown'})`}
            </span>
            <span>{campaign.status === "completed" ? '100' : (campaign.progressPercentage || campaign.progress || 0)}%</span>
          </div>
          <Progress
            value={(campaign.currentPhase as any) === "completed" ? 100 : (campaign.progressPercentage || campaign.progress || 0)}
            className="w-full h-3"
            indicatorVariant={
              ((campaign.phaseStatus as any) === 'completed' && (campaign.progress === 100 || (campaign.currentPhase as any) === "completed"))
                ? "success" // Green when phase succeeded
                : "info"    // Blue during progress
            }
          />
        </div>
      ) : null}
       {(campaign.currentPhase as any) === "completed" && (
        <div className="mt-4 text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-md border border-green-200 dark:border-green-700">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400 mx-auto mb-2"/>
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Campaign Completed</h3>
          <p className="text-sm text-green-600 dark:text-green-400">All phases for &quot;{campaign.name}&quot; finished successfully.</p>
        </div>
      )}
      {(campaign.phaseStatus as any) === 'Failed' && campaign.currentPhase !== "setup" && (
         <div className="mt-4 text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-700">
          <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400 mx-auto mb-2"/>
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">Phase Failed</h3>
          <p className="text-sm text-red-600 dark:text-red-400">The {campaign.currentPhase ? phaseDisplayNames[campaign.currentPhase] : 'Unknown'} phase encountered an error.</p>
        </div>
      )}
    </div>
  );
});

CampaignProgress.displayName = 'CampaignProgress';

export default CampaignProgress;
