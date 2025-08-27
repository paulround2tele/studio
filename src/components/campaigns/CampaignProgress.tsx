"use client";

import React, { memo, useMemo, useCallback } from 'react';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import { CampaignResponseCurrentPhaseEnum as CampaignCurrentPhaseEnum } from '@/lib/api-client/models';
import { CheckCircle, AlertTriangle, Clock, Loader2, WorkflowIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CampaignProgressProps { campaign: Campaign }

// PROFESSIONAL PHASE DISPLAY NAMES using ACTUAL OpenAPI ENUM VALUES
const phaseDisplayNames: Record<CampaignCurrentPhaseEnum, string> = {
  [CampaignCurrentPhaseEnum.discovery]: 'Discovery',
  [CampaignCurrentPhaseEnum.validation]: 'Validation',
  [CampaignCurrentPhaseEnum.extraction]: 'Extraction',
  [CampaignCurrentPhaseEnum.analysis]: 'Analysis',
} as const;

// Define phase order for progress calculation
const PHASE_ORDER: CampaignCurrentPhaseEnum[] = [
  CampaignCurrentPhaseEnum.discovery,
  CampaignCurrentPhaseEnum.validation,
  CampaignCurrentPhaseEnum.extraction,
  CampaignCurrentPhaseEnum.analysis,
];

// Memoized phase status icon component for better performance  
type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'paused';
const PhaseStatusIcon = memo(({ status }: { status: PhaseStatus }) => {
  if (status === 'completed') {
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  }
  
  if (status === 'failed') {
    return <AlertTriangle className="w-5 h-5 text-red-500" />;
  }
  
  if (status === 'in_progress') {
    return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
  }
  
  if (status === 'paused' || status === 'not_started') {
    return <Clock className="w-5 h-5 text-gray-400" />;
  }
  
  return <Clock className="w-5 h-5 text-gray-400" />;
});

PhaseStatusIcon.displayName = 'PhaseStatusIcon';

export function CampaignProgress({ campaign }: CampaignProgressProps) {
  const { currentPhase, status } = campaign;

  // Derive a per-phase status from overall status for UI continuity
  const phaseStatus: PhaseStatus | null = useMemo(() => {
    switch (status) {
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      case 'paused': return 'paused';
      case 'running': return 'in_progress';
      case 'draft':
      default: return 'not_started';
    }
  }, [status]);

  const progressPercentage = useMemo(() => {
    if (!currentPhase) return 0;
    
    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    if (currentIndex === -1) return 0;
    
    // Prefer backend-provided percentComplete when available
    const apiPercent = campaign.progress?.percentComplete;
    if (typeof apiPercent === 'number') return Math.max(0, Math.min(100, apiPercent));

    const baseProgress = (currentIndex / PHASE_ORDER.length) * 100;
    if (phaseStatus === 'completed') return Math.min(((currentIndex + 1) / PHASE_ORDER.length) * 100, 100);
    if (phaseStatus === 'in_progress') return baseProgress + (25 / PHASE_ORDER.length);
    return baseProgress;
  }, [currentPhase, phaseStatus, campaign.progress?.percentComplete]);

  const currentPhaseDisplay = useMemo(() => {
    return currentPhase ? phaseDisplayNames[currentPhase] : 'Unknown Phase';
  }, [currentPhase]);

  const getStatusColor = useCallback((status: PhaseStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'paused':
      case 'not_started':
      default:
        return 'text-gray-600';
    }
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <WorkflowIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Campaign Progress
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {currentPhase && phaseStatus && (
              <PhaseStatusIcon status={phaseStatus} />
            )}
            <span className={cn(
              "text-sm font-medium",
              phaseStatus ? getStatusColor(phaseStatus) : 'text-gray-600'
            )}>
              {currentPhaseDisplay}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Phase Timeline</h4>
          <div className="space-y-2">
            {PHASE_ORDER.map((phase, index) => {
              const isCurrentPhase = phase === currentPhase;
              const isPastPhase = currentPhase && PHASE_ORDER.indexOf(currentPhase) > index;
              const displayStatus = isCurrentPhase ? phaseStatus : (isPastPhase ? 'completed' : 'not_started');
              
              return (
                <Tooltip key={phase} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center space-x-3 p-2 rounded-lg transition-colors",
                      isCurrentPhase && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
                      !isCurrentPhase && "hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}>
                      <PhaseStatusIcon status={displayStatus as PhaseStatus} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "text-sm font-medium",
                            isCurrentPhase ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"
                          )}>
                            {phaseDisplayNames[phase]}
                          </span>
                          {isCurrentPhase && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">
                      Phase {index + 1} of {PHASE_ORDER.length}: {phaseDisplayNames[phase]}
                      {isCurrentPhase && phaseStatus && (
                        <>
                          <br />
                          Status: {phaseStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </>
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {phaseStatus === 'failed' ? (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600 dark:text-red-400">
                The {currentPhaseDisplay} phase encountered an error.
              </p>
            </div>
          </div>
        ) : phaseStatus === 'in_progress' ? (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-600 dark:text-blue-400">
                The {currentPhaseDisplay} phase is currently running.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

export default memo(CampaignProgress);
