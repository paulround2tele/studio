"use client";

/**
 * Phase 2: Execution Mode (Live Campaign Progress)
 * 
 * Displays per-phase execution status:
 *   - state (not_started / running / completed / failed)
 *   - start time
 *   - end time
 *   - duration
 *   - last error (if any)
 * 
 * Consumes backend state only (no timers, no inference).
 * Integrates SSE events for live updates.
 * Works for long-running campaigns (hours).
 * Uses generated TS types exclusively.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
/* TailAdmin migration: Badge/Skeleton/Progress replaced with inline Tailwind patterns */
import { cn } from '@/lib/utils';
import {
  useGetCampaignStatusQuery,
} from '@/store/api/campaignApi';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import type { CampaignPhasesStatusResponse } from '@/lib/api-client/models/campaign-phases-status-response';
import type { CampaignPhasesStatusResponsePhasesInner } from '@/lib/api-client/models/campaign-phases-status-response-phases-inner';
import {
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  CircleIcon,
  WarningTriangleIcon,
  LoaderIcon,
} from '@/icons';

// ============================================================================
// Types
// ============================================================================

interface ExecutionPanelProps {
  campaignId: string;
  className?: string;
}

type PhaseStatus = CampaignPhasesStatusResponsePhasesInner['status'];
type PhaseName = CampaignPhasesStatusResponsePhasesInner['phase'];

// Backend returns internal phase names, we need to handle both formats
// Internal -> API mapping (backend stores these in DB)
type InternalPhaseName = 'domain_generation' | 'dns_validation' | 'http_keyword_validation' | 'extraction' | 'analysis' | 'enrichment';

// Map internal backend phase names to display names
const INTERNAL_PHASE_DISPLAY_NAMES: Record<InternalPhaseName | PhaseName, string> = {
  // OpenAPI short names
  generation: 'Domain Generation',
  dns: 'DNS Validation',
  http: 'HTTP Validation',
  analysis: 'Analysis & Scoring',
  leads: 'Lead Extraction',
  // Internal backend names (in case backend doesn't translate)
  domain_generation: 'Domain Generation',
  dns_validation: 'DNS Validation',
  http_keyword_validation: 'HTTP Validation',
  extraction: 'Extraction',
  enrichment: 'Lead Enrichment',
};

// Canonical phase order for display (internal names as fallback)
const PHASE_ORDER_INTERNAL: string[] = [
  'domain_generation', 'dns_validation', 'http_keyword_validation', 
  'extraction', 'analysis', 'enrichment'
];

// Normalize phase name to get display name
function getPhaseDisplayName(phase: string): string {
  return INTERNAL_PHASE_DISPLAY_NAMES[phase as keyof typeof INTERNAL_PHASE_DISPLAY_NAMES] ?? phase;
}

// ============================================================================
// Duration Formatting (handles long campaigns - hours+)
// ============================================================================

/**
 * Format duration between two timestamps for display.
 * Handles long-running campaigns (hours, days).
 * Returns null if start time is not available.
 */
function formatDuration(
  startedAt: string | undefined,
  endedAt: string | undefined
): string | null {
  if (!startedAt) return null;

  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return null;

  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (isNaN(end)) return null;

  const durationMs = Math.max(0, end - start);
  return formatDurationMs(durationMs);
}

/**
 * Format milliseconds to human-readable duration.
 * Examples: "< 1s", "5s", "2m 30s", "1h 5m", "2d 3h"
 */
function formatDurationMs(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  if (seconds > 0) {
    return `${seconds}s`;
  }

  return '< 1s';
}

// ============================================================================
// Status Badge Component
// ============================================================================

interface StatusBadgeProps {
  status: PhaseStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = useMemo(() => {
    switch (status) {
      case 'not_started':
        return {
          label: '—',
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-500 border-gray-200',
          icon: CircleIcon,
        };
      case 'ready':
        return {
          label: 'Ready',
          variant: 'outline' as const,
          className: 'bg-blue-50 text-blue-600 border-blue-200',
          icon: CircleIcon,
        };
      case 'configured':
        return {
          label: 'Cfg',
          variant: 'outline' as const,
          className: 'bg-indigo-50 text-indigo-600 border-indigo-200',
          icon: CircleIcon,
        };
      case 'in_progress':
        return {
          label: 'Run',
          variant: 'outline' as const,
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: LoaderIcon,
          iconClassName: '',
        };
      case 'paused':
        return {
          label: 'Pause',
          variant: 'outline' as const,
          className: 'bg-orange-50 text-orange-600 border-orange-200',
          icon: PauseCircleIcon,
        };
      case 'completed':
        return {
          label: 'Done',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-700 border-green-200',
          icon: CheckCircleIcon,
        };
      case 'failed':
        return {
          label: 'Fail',
          variant: 'outline' as const,
          className: 'bg-red-50 text-red-700 border-red-200',
          icon: XCircleIcon,
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-600 border-gray-200',
          icon: CircleIcon,
        };
    }
  }, [status]);

  const Icon = config.icon;

  /* TailAdmin migration: Badge -> inline Tailwind span */
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium h-4 px-1 text-[10px] rounded border',
        config.className,
        className
      )}
    >
      <Icon className={cn('h-2.5 w-2.5', (config as { iconClassName?: string }).iconClassName)} />
      {config.label}
    </span>
  );
};

// ============================================================================
// Phase Row Component
// ============================================================================

interface PhaseRowProps {
  phase: CampaignPhasesStatusResponsePhasesInner;
  isActive: boolean;
}

const PhaseRow: React.FC<PhaseRowProps> = ({ phase, isActive }) => {
  // Use helper to handle both OpenAPI short names and internal backend names
  const displayName = getPhaseDisplayName(phase.phase);
  
  // Calculate end time - use completedAt or failedAt
  const endTime = phase.completedAt ?? phase.failedAt;
  
  // Format duration - for in_progress phases, duration updates based on current time
  const duration = useMemo(() => {
    return formatDuration(phase.startedAt, endTime);
  }, [phase.startedAt, endTime]);

  // For in_progress phases, recalculate duration periodically
  const [liveDuration, setLiveDuration] = useState<string | null>(null);
  
  useEffect(() => {
    if (phase.status !== 'in_progress' || !phase.startedAt) {
      setLiveDuration(null);
      return;
    }

    const updateDuration = () => {
      const dur = formatDuration(phase.startedAt, undefined);
      setLiveDuration(dur);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [phase.status, phase.startedAt]);

  const displayDuration = phase.status === 'in_progress' ? liveDuration : duration;

  return (
    <div
      className={cn(
        'px-2 py-1.5 rounded border transition-colors',
        isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white',
        phase.status === 'failed' && 'border-red-200 bg-red-50/50'
      )}
      data-testid={`phase-row-${phase.phase}`}
    >
      {/* Compact header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-medium text-xs truncate">{displayName}</span>
          <StatusBadge status={phase.status} className="h-4 text-[10px]" />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-shrink-0">
          {phase.status === 'in_progress' && phase.progressPercentage > 0 && (
            <span className="tabular-nums font-medium text-blue-600">
              {phase.progressPercentage.toFixed(0)}%
            </span>
          )}
          <span className="tabular-nums">{displayDuration ?? '—'}</span>
        </div>
      </div>

      {/* Progress Bar (only for running phases) - Tailwind pattern */}
      {phase.status === 'in_progress' && phase.progressPercentage > 0 && (
        <div className="h-1 mt-1 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-1 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${phase.progressPercentage}%` }}
          />
        </div>
      )}

      {/* Error Message - compact */}
      {phase.status === 'failed' && phase.errorMessage && (
        <div className="mt-1 px-1.5 py-1 rounded bg-red-50 border border-red-100 flex items-center gap-1.5">
          <WarningTriangleIcon className="h-3 w-3 text-red-500 flex-shrink-0" />
          <span className="text-[10px] text-red-700 truncate" title={phase.errorMessage}>
            {phase.errorMessage}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Compact Progress Header
// ============================================================================

interface ProgressHeaderProps {
  status: CampaignPhasesStatusResponse;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({ status }) => {
  // Count phases by status
  const counts = useMemo(() => {
    const result = { completed: 0, running: 0, failed: 0, total: status.phases.length };
    for (const phase of status.phases) {
      if (phase.status === 'completed') result.completed++;
      else if (phase.status === 'in_progress') result.running++;
      else if (phase.status === 'failed') result.failed++;
    }
    return result;
  }, [status.phases]);

  // Determine overall state
  const overallState = useMemo(() => {
    if (counts.failed > 0) return 'failed';
    if (counts.running > 0) return 'running';
    if (counts.completed === counts.total) return 'completed';
    return 'pending';
  }, [counts]);

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-700">Execution</span>
        {/* TailAdmin migration: Badge -> inline Tailwind span */}
        {overallState === 'running' && (
          <span className="inline-flex items-center rounded border bg-amber-50 text-amber-700 border-amber-200 h-4 px-1 text-[10px]">
            <LoaderIcon className="h-2.5 w-2.5 mr-0.5" />
            Running
          </span>
        )}
        {overallState === 'completed' && (
          <span className="inline-flex items-center rounded border bg-green-50 text-green-700 border-green-200 h-4 px-1 text-[10px]">
            <CheckCircleIcon className="h-2.5 w-2.5 mr-0.5" />
            Done
          </span>
        )}
        {overallState === 'failed' && (
          <span className="inline-flex items-center rounded border bg-red-50 text-red-700 border-red-200 h-4 px-1 text-[10px]">
            <XCircleIcon className="h-2.5 w-2.5 mr-0.5" />
            Failed
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="tabular-nums font-medium">
          {status.overallProgressPercentage.toFixed(0)}%
        </span>
        <span className="tabular-nums">
          {counts.completed}/{counts.total}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Main ExecutionPanel Component
// ============================================================================

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  campaignId,
  className,
}) => {
  // Fetch campaign status via RTK Query
  const {
    data: statusData,
    isLoading,
    error,
    refetch,
  } = useGetCampaignStatusQuery(campaignId, {
    pollingInterval: 0, // No polling - rely on SSE
  });

  // Subscribe to SSE events for live updates
  // Refetch on phase lifecycle events to get updated status
  const handlePhaseEvent = useCallback(
    (cid: string) => {
      if (cid === campaignId) {
        refetch();
      }
    },
    [campaignId, refetch]
  );

  const { isConnected } = useCampaignSSE({
    campaignId,
    autoConnect: true,
    events: {
      onPhaseStarted: handlePhaseEvent,
      onPhaseCompleted: handlePhaseEvent,
      onPhaseFailed: handlePhaseEvent,
      onProgress: handlePhaseEvent,
    },
  });

  // Sort phases in display order
  // Backend may return either short API names or internal names, so we handle both
  const sortedPhases = useMemo(() => {
    if (!statusData?.phases) return [];
    
    // Create map keyed by phase name (as-is from backend)
    const phaseMap = new Map<string, CampaignPhasesStatusResponsePhasesInner>();
    for (const phase of statusData.phases) {
      phaseMap.set(phase.phase, phase);
    }

    // Try internal phase order first (what backend actually returns)
    const orderedPhases: CampaignPhasesStatusResponsePhasesInner[] = [];
    for (const phaseName of PHASE_ORDER_INTERNAL) {
      const phase = phaseMap.get(phaseName);
      if (phase) {
        orderedPhases.push(phase);
        phaseMap.delete(phaseName);
      }
    }

    // Add any remaining phases not in our known order
    for (const phase of phaseMap.values()) {
      orderedPhases.push(phase);
    }

    return orderedPhases;
  }, [statusData?.phases]);

  // Determine active phase (control phase from backend)
  const activePhase = statusData?.controlPhase;

  if (isLoading) {
    return (
      <div className={cn('border rounded p-2 space-y-1', className)}>
        {/* TailAdmin migration: Skeleton -> animate-pulse div */}
        <div className="h-6 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-6 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-6 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (error || !statusData) {
    return (
      <div className={cn('border rounded p-2', className)}>
        <div className="flex items-center gap-1.5 text-red-500">
          <WarningTriangleIcon className="h-3.5 w-3.5" />
          <span className="text-xs">Failed to load status</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border rounded overflow-hidden', className)} data-testid="execution-panel">
      {/* Compact header with execution mode accent */}
      <div className="px-2 py-1.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-2">
        <ProgressHeader status={statusData} />
        {/* SSE indicator */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          <span className="hidden sm:inline">{isConnected ? 'Live' : '...'}</span>
        </div>
      </div>
      
      {/* Phase list */}
      <div className="p-1.5 space-y-1">
        {sortedPhases.map((phase) => (
          <PhaseRow
            key={phase.phase}
            phase={phase}
            isActive={phase.phase === activePhase}
          />
        ))}

        {/* Campaign-level error - compact */}
        {statusData.errorMessage && (
          <div className="px-2 py-1.5 rounded bg-red-50 border border-red-200 flex items-center gap-1.5">
            <XCircleIcon className="h-3 w-3 text-red-500 flex-shrink-0" />
            <span className="text-[10px] text-red-700 truncate" title={statusData.errorMessage}>
              {statusData.errorMessage}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionPanel;
