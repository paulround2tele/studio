/**
 * ExecutionHeader Component
 * 
 * Primary execution surface for the campaign operations console.
 * Answers: "What's happening now?" and "What can I do?"
 * 
 * Per CAMPAIGN_UI_CONTRACT.md §2.1 Tier 1 and §7 Wireframes
 * 
 * Responsibilities:
 * - Shows active/paused phase name prominently
 * - Single progress bar (not 5 separate ones)
 * - Control buttons derived from runtimeControls
 * - SSE status indicator integrated
 */

'use client';

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ControlDock } from './ControlDock';
import type { ControlState, ExecutionStatus } from '@/hooks/useControlState';

interface ExecutionHeaderProps {
  /** Control state derived from useControlState hook */
  controlState: ControlState;
  
  /** SSE connection status */
  isConnected: boolean;
  sseError: string | null;
  
  /** Action handlers */
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart?: () => void;
  onRetryFailed?: () => void;
  
  /** Loading states for actions */
  isPauseLoading: boolean;
  isResumeLoading: boolean;
  isStopLoading: boolean;
  isRestartLoading?: boolean;
  isRetryLoading?: boolean;
  
  /** Optional: Configuration button slot */
  configButton?: React.ReactNode;
  
  className?: string;
}

const STATUS_CONFIG: Record<ExecutionStatus, {
  label: string;
  color: string;
  bgColor: string;
  pulseColor?: string;
}> = {
  running: {
    label: 'Running',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    pulseColor: 'bg-emerald-500',
  },
  paused: {
    label: 'Paused',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
  completed: {
    label: 'Completed',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  idle: {
    label: 'Idle',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
  },
};

function formatProgressPercent(progress: number): string {
  if (progress === 0) return '';
  return `${Math.round(progress)}% complete`;
}

export function ExecutionHeader({
  controlState,
  isConnected,
  sseError,
  onPause,
  onResume,
  onStop,
  onRestart,
  onRetryFailed,
  isPauseLoading,
  isResumeLoading,
  isStopLoading,
  isRestartLoading = false,
  isRetryLoading = false,
  configButton,
  className,
}: ExecutionHeaderProps) {
  const {
    phaseLabel,
    status,
    progress,
    errorMessage,
  } = controlState;

  const statusConfig = STATUS_CONFIG[status];
  const progressText = formatProgressPercent(progress);

  // SSE status indicator
  const sseStatusLabel = (() => {
    if (sseError) return `Disconnected`;
    if (isConnected) return 'Live';
    return 'Connecting…';
  })();

  const sseStatusColor = (() => {
    if (sseError) return 'bg-red-500';
    if (isConnected) return 'bg-emerald-500';
    return 'bg-amber-400';
  })();

  return (
    <header
      className={cn(
        "rounded-xl border bg-white dark:bg-gray-900 shadow-md overflow-hidden",
        className
      )}
      role="banner"
      aria-label="Campaign execution status"
    >
      {/* Main content area */}
      <div className="p-6 md:p-8">
        {/* Header row: Phase name + Status badge + SSE indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {phaseLabel}
            </h2>
            <Badge
              variant="secondary"
              className={cn(
                "font-semibold px-3 py-1 text-sm shadow-sm",
                statusConfig.color,
                statusConfig.bgColor
              )}
              aria-label={`Status: ${statusConfig.label}`}
            >
              {status === 'running' && (
                <span className={cn("w-2.5 h-2.5 rounded-full mr-2 animate-pulse", statusConfig.pulseColor)} aria-hidden="true" />
              )}
              {statusConfig.label}
            </Badge>
          </div>
          
          {/* SSE Status Indicator */}
          <div 
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-800"
            role="status"
            aria-label={`Connection: ${sseStatusLabel}`}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-400" aria-hidden="true" />
            )}
            <div className={cn("w-2 h-2 rounded-full", sseStatusColor)} aria-hidden="true" />
            <span>{sseStatusLabel}</span>
          </div>
        </div>

        {/* Progress bar - only show when running or paused with progress */}
        {(status === 'running' || status === 'paused') && (
          <div className="mb-6" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`${phaseLabel} progress`}>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide font-semibold">
                {progressText || 'Processing...'}
              </span>
              <span className="font-mono text-gray-900 dark:text-gray-100 text-base">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-200 dark:border-gray-700">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out shadow-sm",
                  status === 'running' 
                    ? "bg-emerald-500" 
                    : "bg-amber-500"
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message for failed state */}
        {status === 'failed' && errorMessage && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        )}

        {/* Completed state summary */}
        {status === 'completed' && progress === 100 && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Phase completed successfully
          </div>
        )}

        {/* Control buttons via ControlDock */}
        <div className="flex items-center justify-between">
          <ControlDock
            controls={controlState}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onRestart={onRestart}
            onRetryFailed={onRetryFailed}
            isPauseLoading={isPauseLoading}
            isResumeLoading={isResumeLoading}
            isStopLoading={isStopLoading}
            isRestartLoading={isRestartLoading}
            isRetryLoading={isRetryLoading}
          />

          {/* Configuration button slot */}
          {configButton && (
            <div className="flex items-center">
              {configButton}
            </div>
          )}
        </div>

        {/* Idle state message - show when no controls available */}
        {controlState.isIdle && !controlState.canRestart && !controlState.hasFailedPhases && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {status === 'completed' 
              ? 'Campaign finished successfully'
              : status === 'failed'
                ? 'Review errors above'
                : 'No active phase'
            }
          </div>
        )}
      </div>
    </header>
  );
}

export default ExecutionHeader;
