/**
 * PipelineTimeline Component
 * 
 * Compact, collapsible phase overview for the campaign operations console.
 * Purely historical/status - no control logic.
 * 
 * Per CAMPAIGN_UI_REFACTOR_PLAN.md §3.1
 * 
 * Responsibilities:
 * - Show all phases in a compact inline format (collapsed default)
 * - Expand to show detailed timing and progress
 * - Highlight active phase
 * - Show failed phases with inline error context
 * - No buttons or controls - this is Tier 3 (Pipeline) not Tier 2 (Controls)
 */

'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  XCircle, 
  Loader2, 
  PauseCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * PipelinePhase type - shared interface for pipeline phase status
 * Moved here from PipelineBar.tsx during Phase 6 cleanup
 */
export interface PipelinePhase {
  key: string;
  label: string;
  status: 'not_started' | 'ready' | 'configured' | 'in_progress' | 'paused' | 'completed' | 'failed';
  progressPercentage: number;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  lastMessage?: string;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  lastEventAt?: string;
}

interface PipelineTimelineProps {
  phases: PipelinePhase[];
  defaultExpanded?: boolean;
  className?: string;
}

// Status configuration for icons and colors
const STATUS_CONFIG = {
  not_started: {
    icon: Circle,
    iconColor: 'text-gray-300 dark:text-gray-600',
    label: 'Not Started',
    dotColor: 'bg-gray-300 dark:bg-gray-600',
    animate: false,
  },
  ready: {
    icon: Circle,
    iconColor: 'text-blue-400 dark:text-blue-500',
    label: 'Ready',
    dotColor: 'bg-blue-400 dark:bg-blue-500',
    animate: false,
  },
  configured: {
    icon: Settings2,
    iconColor: 'text-blue-500 dark:text-blue-400',
    label: 'Configured',
    dotColor: 'bg-blue-500 dark:bg-blue-400',
    animate: false,
  },
  in_progress: {
    icon: Loader2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    label: 'Running',
    dotColor: 'bg-emerald-500 dark:bg-emerald-400',
    animate: true,
  },
  paused: {
    icon: PauseCircle,
    iconColor: 'text-amber-500 dark:text-amber-400',
    label: 'Paused',
    dotColor: 'bg-amber-500 dark:bg-amber-400',
    animate: false,
  },
  completed: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    label: 'Completed',
    dotColor: 'bg-emerald-500 dark:bg-emerald-400',
    animate: false,
  },
  failed: {
    icon: XCircle,
    iconColor: 'text-red-500 dark:text-red-400',
    label: 'Failed',
    dotColor: 'bg-red-500 dark:bg-red-400',
    animate: false,
  },
} as const;

type PhaseStatus = keyof typeof STATUS_CONFIG;

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as PhaseStatus] ?? STATUS_CONFIG.not_started;
}

// Format timestamp for display
function formatTime(timestamp?: string): string | null {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

// Calculate duration between two timestamps
function formatDuration(start?: string, end?: string): string | null {
  if (!start) return null;
  try {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    
    if (diffMs < 0) return null;
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  } catch {
    return null;
  }
}

// Get error message from phase
function getErrorMessage(phase: PipelinePhase): string | null {
  if (phase.errorMessage) return phase.errorMessage;
  if (phase.errorDetails) {
    const details = phase.errorDetails as Record<string, unknown>;
    return (details.message ?? details.error ?? details.reason) as string | null;
  }
  return phase.lastMessage ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Collapsed View: Inline phase indicators with arrows
// ═══════════════════════════════════════════════════════════════════════════════

interface CollapsedViewProps {
  phases: PipelinePhase[];
}

function CollapsedView({ phases }: CollapsedViewProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {phases.map((phase, index) => {
        const config = getStatusConfig(phase.status);
        const Icon = config.icon;
        const isActive = phase.status === 'in_progress' || phase.status === 'paused';
        const isFailed = phase.status === 'failed';
        
        return (
          <React.Fragment key={phase.key}>
            <div 
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                isActive && "bg-emerald-50 dark:bg-emerald-900/20",
                isFailed && "bg-red-50 dark:bg-red-900/20"
              )}
              title={`${phase.label}: ${config.label}${phase.status === 'in_progress' ? ` (${Math.round(phase.progressPercentage)}%)` : ''}`}
            >
              <Icon 
                className={cn(
                  "w-4 h-4",
                  config.iconColor,
                  config.animate && "animate-spin"
                )} 
              />
              <span className={cn(
                "text-sm font-medium",
                isActive ? "text-emerald-700 dark:text-emerald-300" :
                isFailed ? "text-red-700 dark:text-red-300" :
                phase.status === 'completed' ? "text-emerald-600 dark:text-emerald-400" :
                "text-gray-500 dark:text-gray-400"
              )}>
                {phase.label}
              </span>
              {phase.status === 'in_progress' && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                  {Math.round(phase.progressPercentage)}%
                </span>
              )}
            </div>
            {index < phases.length - 1 && (
              <span className="text-gray-300 dark:text-gray-600 mx-0.5">→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Expanded View: Detailed phase cards with timing
// ═══════════════════════════════════════════════════════════════════════════════

interface ExpandedPhaseRowProps {
  phase: PipelinePhase;
  isLast: boolean;
}

function ExpandedPhaseRow({ phase, isLast }: ExpandedPhaseRowProps) {
  const config = getStatusConfig(phase.status);
  const Icon = config.icon;
  const isActive = phase.status === 'in_progress' || phase.status === 'paused';
  const isFailed = phase.status === 'failed';
  const isCompleted = phase.status === 'completed';
  
  const startTime = formatTime(phase.startedAt);
  const duration = formatDuration(
    phase.startedAt, 
    phase.completedAt ?? phase.failedAt ?? (isActive ? undefined : phase.startedAt)
  );
  const errorMessage = isFailed ? getErrorMessage(phase) : null;

  return (
    <div className="relative pl-2">
      {/* Vertical connector line */}
      {!isLast && (
        <div 
          className={cn(
            "absolute left-[1.35rem] top-7 w-0.5 h-full -ml-px",
            isCompleted ? "bg-emerald-500/30 dark:bg-emerald-500/30" : "bg-gray-200 dark:bg-gray-800"
          )} 
        />
      )}
      
      <div className={cn(
        "flex gap-3 py-2 rounded-lg transition-colors items-start border-l-2",
        isActive 
          ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-500 pl-3 shadow-sm" 
          : "border-transparent pl-3.5"
      )}>
        {/* Status icon */}
        <div className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5",
          isActive ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" :
          isFailed ? "bg-red-100 dark:bg-red-900/30 text-red-600" :
          isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" :
          "bg-gray-100 dark:bg-gray-800 text-gray-400"
        )}>
          <Icon 
            className={cn(
              "w-3.5 h-3.5",
              config.animate && "animate-spin"
            )} 
          />
        </div>
        
        {/* Phase details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className={cn(
                "font-medium text-sm",
                isActive ? "text-emerald-700 dark:text-emerald-300" :
                isFailed ? "text-red-700 dark:text-red-300" :
                isCompleted ? "text-emerald-600 dark:text-emerald-400" :
                "text-gray-600 dark:text-gray-400"
              )}>
                {phase.label}
              </h4>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                isActive ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" :
                isFailed ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" :
                isCompleted ? "text-emerald-600 dark:text-emerald-400" :
                "text-gray-400 dark:text-gray-500"
              )}>
                {config.label}
              </span>
            </div>
            
            {/* Timing info - simplified */}
            {(duration || startTime) && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                {duration || startTime}
              </span>
            )}
          </div>
          
          {/* Progress bar for active phases */}
          {isActive && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    phase.status === 'paused' ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, phase.progressPercentage))}%` }}
                />
              </div>
              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300">
                {Math.round(phase.progressPercentage)}%
              </span>
            </div>
          )}
          
          {/* Error message for failed phases */}
          {errorMessage && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpandedView({ phases }: { phases: PipelinePhase[] }) {
  return (
    <div className="space-y-1">
      {phases.map((phase, index) => (
        <ExpandedPhaseRow 
          key={phase.key} 
          phase={phase} 
          isLast={index === phases.length - 1} 
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function PipelineTimeline({ 
  phases, 
  defaultExpanded = false,
  className 
}: PipelineTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Summary stats for header
  const completedCount = phases.filter(p => p.status === 'completed').length;
  const failedCount = phases.filter(p => p.status === 'failed').length;
  const activePhase = phases.find(p => p.status === 'in_progress' || p.status === 'paused');

  return (
    <div className={cn("rounded-lg border bg-white dark:bg-gray-900 overflow-hidden", className)}>
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Pipeline
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {completedCount}/{phases.length}
            </span>
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                <XCircle className="w-3.5 h-3.5" />
                {failedCount} failed
              </span>
            )}
            {activePhase && isExpanded && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {activePhase.label}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-8 px-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Expand
            </>
          )}
        </Button>
      </div>

      {/* Content area */}
      <div className="p-4">
        {isExpanded ? (
          <ExpandedView phases={phases} />
        ) : (
          <CollapsedView phases={phases} />
        )}
      </div>
    </div>
  );
}

export default PipelineTimeline;
