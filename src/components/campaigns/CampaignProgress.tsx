"use client";

import React, { memo, useMemo, useCallback } from 'react';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import type { PhaseExecution } from '@/lib/api-client/models/phase-execution';
import type { CampaignState } from '@/lib/api-client/models/campaign-state';
// Local phase literal union matching OpenAPI string literals
type CampaignPhase = 'discovery' | 'validation' | 'extraction' | 'analysis' | 'enrichment';
import { CheckCircleIcon, WarningTriangleIcon, ClockIcon, LoaderIcon, WorkflowIcon } from '@/icons';
import { cn } from '@/lib/utils';
import TooltipAdapter from "@/components/ta/adapters/TooltipAdapter";
import { getPhaseDisplayName } from '@/lib/utils/phaseMapping';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';

// Inline TailAdmin-style progress bar component
const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={cn("w-full bg-gray-200 rounded-full dark:bg-gray-700", className)}>
    <div
      className="h-2 rounded-full bg-brand-500 transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

interface CampaignProgressProps {
  campaign: Campaign;
  phaseExecutions?: PhaseExecution[];
  state?: CampaignState;
}

// PROFESSIONAL PHASE DISPLAY NAMES using ACTUAL OpenAPI ENUM VALUES
// Define phase order for progress calculation
const PHASE_ORDER: CampaignPhase[] = ['discovery','validation','extraction','analysis','enrichment'];

const phaseDisplayNames: Record<CampaignPhase, string> = PHASE_ORDER.reduce((acc, phase) => {
  acc[phase] = getPhaseDisplayName(phase);
  return acc;
}, {} as Record<CampaignPhase, string>);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  return isPlainObject(value) ? (value as Record<string, unknown>) : undefined;
};

const getStringField = (record: Record<string, unknown> | undefined, key: string): string | undefined => {
  if (!record) {
    return undefined;
  }
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
};

const getNestedRecord = (record: Record<string, unknown> | undefined, key: string): Record<string, unknown> | undefined => {
  if (!record) {
    return undefined;
  }
  return toRecord(record[key]);
};

interface FailureContext {
  phase: CampaignPhase | null;
  phaseLabel: string;
  code?: string;
  message?: string;
  hint?: string;
  details?: Record<string, unknown>;
  detailsJson?: string;
  timestamp?: string;
}

// Memoized phase status icon component for better performance  
type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'paused';
const PhaseStatusIcon = memo(({ status }: { status: PhaseStatus }) => {
  if (status === 'completed') {
    return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
  }
  
  if (status === 'failed') {
    return <WarningTriangleIcon className="w-5 h-5 text-red-500" />;
  }
  
  if (status === 'in_progress') {
    return <LoaderIcon className="w-5 h-5 text-blue-500 animate-spin" />;
  }
  
  if (status === 'paused' || status === 'not_started') {
    return <ClockIcon className="w-5 h-5 text-gray-400" />;
  }
  
  return <ClockIcon className="w-5 h-5 text-gray-400" />;
});

PhaseStatusIcon.displayName = 'PhaseStatusIcon';

export function CampaignProgress({ campaign, phaseExecutions, state: _state }: CampaignProgressProps) {
  const { currentPhase, status } = campaign;

  // Derive a per-phase status from overall status for UI continuity
  // Build a lookup from phase type to execution info when enriched data is provided
  const execByPhase = useMemo(() => {
    const map = new Map<CampaignPhase, PhaseExecution>();
    if (Array.isArray(phaseExecutions)) {
      for (const exec of phaseExecutions) {
        if (!exec || typeof exec.phaseType !== 'string') continue;
        const normalized = normalizeToApiPhase(exec.phaseType);
        if (!normalized) continue;
        if (!phaseDisplayNames[normalized as CampaignPhase]) continue;
        map.set(normalized as CampaignPhase, exec);
      }
    }
    return map;
  }, [phaseExecutions]);

  const phaseStatus: PhaseStatus | null = useMemo(() => {
    // Prefer execution-derived status for current phase when available
    if (currentPhase && execByPhase.has(currentPhase)) {
      const exec = execByPhase.get(currentPhase)!;
      switch (exec.status) {
        case 'completed': return 'completed';
        case 'failed': return 'failed';
        case 'paused': return 'paused';
        case 'in_progress':
          return 'in_progress';
        default:
          return 'not_started';
      }
    }
    // Fallback to campaign-level status
    switch (status) {
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      case 'paused': return 'paused';
      case 'running': return 'in_progress';
      case 'draft':
      default: return 'not_started';
    }
  }, [status, currentPhase, execByPhase]);

  const progressPercentage = useMemo(() => {
    if (!currentPhase) return 0;
    
    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    if (currentIndex === -1) return 0;
    
    // Prefer backend-provided percentComplete when available
    const apiPercent = campaign.progress?.percentComplete;
    if (typeof apiPercent === 'number') return Math.max(0, Math.min(100, apiPercent));

    // Next, prefer execution progress for the current phase
    if (currentPhase && execByPhase.has(currentPhase)) {
      const exec = execByPhase.get(currentPhase)!;
      if (typeof exec.progressPercentage === 'number') {
        // Compute an overall percentage based on phase position and intra-phase progress
        const completedPhases = Math.max(0, PHASE_ORDER.indexOf(currentPhase));
        const perPhaseShare = 100 / PHASE_ORDER.length;
        return Math.max(0, Math.min(100, (completedPhases * perPhaseShare) + (perPhaseShare * (exec.progressPercentage / 100))));
      }
    }

    const baseProgress = (currentIndex / PHASE_ORDER.length) * 100;
    if (phaseStatus === 'completed') return Math.min(((currentIndex + 1) / PHASE_ORDER.length) * 100, 100);
    if (phaseStatus === 'in_progress') return baseProgress + (25 / PHASE_ORDER.length);
    return baseProgress;
  }, [currentPhase, phaseStatus, campaign.progress?.percentComplete, execByPhase]);

  const currentPhaseDisplay = useMemo(() => {
    return currentPhase ? phaseDisplayNames[currentPhase] : 'Unknown Phase';
  }, [currentPhase]);

  const failureContext = useMemo<FailureContext | null>(() => {
    let failurePhase: CampaignPhase | null = null;
    let failureExec: PhaseExecution | undefined;

    if (currentPhase && execByPhase.has(currentPhase)) {
      const currentExec = execByPhase.get(currentPhase);
      if (currentExec?.status === 'failed') {
        failurePhase = currentPhase;
        failureExec = currentExec;
      }
    }

    if (!failureExec) {
      for (const [phase, exec] of execByPhase.entries()) {
        if (exec.status === 'failed') {
          failurePhase = phase;
          failureExec = exec;
          break;
        }
      }
    }

    if (!failureExec) {
      return null;
    }

    const errorRecord = toRecord(failureExec.errorDetails);
    const nestedDetails = getNestedRecord(errorRecord, 'details');
    const metricsRecord = toRecord(failureExec.metrics);

    const message =
      getStringField(errorRecord, 'message') ??
      getStringField(nestedDetails, 'message') ??
      getStringField(nestedDetails, 'reason') ??
      getStringField(nestedDetails, 'error') ??
      getStringField(metricsRecord, 'failureReason');

    const code =
      getStringField(errorRecord, 'code') ??
      getStringField(nestedDetails, 'code');

    const hint =
      getStringField(errorRecord, 'hint') ??
      getStringField(nestedDetails, 'hint');

    const detailsObject = errorRecord ?? nestedDetails;
    let detailsJson: string | undefined;
    if (detailsObject) {
      try {
        detailsJson = JSON.stringify(detailsObject, null, 2);
      } catch {
        detailsJson = undefined;
      }
    }

    return {
      phase: failurePhase,
      phaseLabel: failurePhase ? phaseDisplayNames[failurePhase] : currentPhaseDisplay,
      code,
      message,
      hint,
      details: detailsObject,
      detailsJson,
      timestamp: failureExec.failedAt ?? failureExec.updatedAt
    };
  }, [currentPhase, currentPhaseDisplay, execByPhase]);

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
    <>
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
          <ProgressBar value={progressPercentage} className="h-2" />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Phase Timeline</h4>
          <div className="space-y-2">
            {PHASE_ORDER.map((phase, index) => {
              const isCurrentPhase = phase === currentPhase;
              const isPastPhase = currentPhase && PHASE_ORDER.indexOf(currentPhase) > index;
              // Derive display status with enriched phase executions if present
              let displayStatus: PhaseStatus = 'not_started';
              const exec = execByPhase.get(phase);
              if (exec) {
                switch (exec.status) {
                  case 'completed': displayStatus = 'completed'; break;
                  case 'failed': displayStatus = 'failed'; break;
                  case 'paused': displayStatus = 'paused'; break;
                  case 'in_progress': displayStatus = 'in_progress'; break;
                  default: displayStatus = 'not_started';
                }
              } else if (isCurrentPhase) {
                displayStatus = phaseStatus ?? 'not_started';
              } else if (isPastPhase) {
                displayStatus = 'completed';
              }
              
              return (
                <TooltipAdapter
                  key={phase}
                  content={
                    <p className="text-sm">
                      Phase {index + 1} of {PHASE_ORDER.length}: {phaseDisplayNames[phase]}
                      {isCurrentPhase && phaseStatus && (
                        <>
                          <br />
                          Status: {phaseStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {execByPhase.get(phase)?.progressPercentage != null && (
                            <>
                              <br />
                              Phase Progress: {Math.round(execByPhase.get(phase)!.progressPercentage!)}%
                            </>
                          )}
                        </>
                      )}
                    </p>
                  }
                >
                  <div className={cn(
                    "flex items-center space-x-3 p-2 rounded-lg transition-colors",
                    isCurrentPhase && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
                    !isCurrentPhase && "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}>
                    <PhaseStatusIcon status={displayStatus} />
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
                </TooltipAdapter>
              );
            })}
          </div>
        </div>

        {phaseStatus === 'failed' ? (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <WarningTriangleIcon className="w-4 h-4 mt-0.5 text-red-600" />
              <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
                <p className="font-semibold">
                  {failureContext?.phaseLabel ?? currentPhaseDisplay} phase failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-200">
                  {failureContext?.message ?? 'The phase encountered an error. Check the backend logs for more details.'}
                </p>
                {failureContext?.code && (
                  <p className="text-xs uppercase tracking-wide text-red-600 dark:text-red-300">
                    Error Code: <code className="font-mono text-xs">{failureContext.code}</code>
                  </p>
                )}
                {failureContext?.hint && (
                  <p className="text-xs text-red-600 dark:text-red-300">{failureContext.hint}</p>
                )}
                {failureContext?.detailsJson && (
                  <details className="text-xs text-red-600 dark:text-red-300">
                    <summary className="cursor-pointer font-medium">
                      Technical details
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto rounded bg-white/80 p-2 font-mono text-[11px] leading-tight text-red-800 dark:bg-red-950/40 dark:text-red-100">
                      {failureContext.detailsJson}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ) : phaseStatus === 'in_progress' ? (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <LoaderIcon className="w-4 h-4 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-600 dark:text-blue-400">
                The {currentPhaseDisplay} phase is currently running.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default memo(CampaignProgress);
