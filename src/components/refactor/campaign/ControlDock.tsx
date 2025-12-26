/**
 * ControlDock Component
 * 
 * Contextual control buttons that only show valid actions.
 * Button visibility is strictly derived from backend runtimeControls.
 * 
 * Per CAMPAIGN_UI_REFACTOR_PLAN.md §2.1:
 * - ≤3 primary buttons visible at any time
 * - Secondary actions in overflow menu
 * - No local state - purely derived from ControlState
 */

'use client';

import React from 'react';
import { Loader2, Pause, Play, Square, RotateCcw, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ControlState } from '@/hooks/useControlState';

interface ControlDockProps {
  /** Control state derived from useControlState hook */
  controls: ControlState;
  
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
  
  /** Optional className for container */
  className?: string;
}

/**
 * Button configuration with visibility rules
 * Primary buttons: Always visible when applicable (max 3)
 * Secondary buttons: Overflow menu
 */
interface ButtonConfig {
  id: string;
  label: string;
  loadingLabel: string;
  description?: string; // Optional descriptive text shown below label
  icon: React.ReactNode;
  show: (c: ControlState) => boolean;
  variant: 'default' | 'outline' | 'destructive' | 'secondary';
  primary: boolean;
}

const BUTTON_CONFIGS: ButtonConfig[] = [
  {
    id: 'pause',
    label: 'Pause',
    loadingLabel: 'Pausing…',
    icon: <Pause className="w-4 h-4" />,
    show: (c) => c.canPause,
    variant: 'outline',
    primary: true,
  },
  {
    id: 'resume',
    label: 'Resume',
    loadingLabel: 'Resuming…',
    icon: <Play className="w-4 h-4" />,
    show: (c) => c.canResume,
    variant: 'default',
    primary: true,
  },
  {
    id: 'stop',
    label: 'Stop',
    loadingLabel: 'Stopping…',
    icon: <Square className="w-4 h-4" />,
    show: (c) => c.canStop,
    variant: 'destructive',
    primary: true,
  },
  {
    id: 'restart',
    label: 'Re-run Validations',
    loadingLabel: 'Re-running…',
    description: 'Discovery is preserved.',
    icon: <RotateCcw className="w-4 h-4" />,
    show: (c) => c.canRestart && c.isIdle,
    variant: 'secondary',
    primary: false,
  },
  {
    id: 'retry',
    label: 'Retry Failed Phases',
    loadingLabel: 'Retrying…',
    icon: <RefreshCw className="w-4 h-4" />,
    show: (c) => c.hasFailedPhases && c.isIdle,
    variant: 'secondary',
    primary: false,
  },
];

export function ControlDock({
  controls,
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
  className,
}: ControlDockProps) {
  const isAnyLoading = isPauseLoading || isResumeLoading || isStopLoading || isRestartLoading || isRetryLoading;

  // Determine which buttons to show
  const visibleButtons = BUTTON_CONFIGS.filter(btn => btn.show(controls));
  const primaryButtons = visibleButtons.filter(btn => btn.primary);
  const secondaryButtons = visibleButtons.filter(btn => !btn.primary);

  // Handler mapping
  const handlers: Record<string, (() => void) | undefined> = {
    pause: onPause,
    resume: onResume,
    stop: onStop,
    restart: onRestart,
    retry: onRetryFailed,
  };

  // Loading state mapping
  const loadingStates: Record<string, boolean> = {
    pause: isPauseLoading,
    resume: isResumeLoading,
    stop: isStopLoading,
    restart: isRestartLoading,
    retry: isRetryLoading,
  };

  // If no buttons to show, render nothing
  if (visibleButtons.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Primary buttons - always visible */}
      {primaryButtons.map((btn) => {
        const handler = handlers[btn.id];
        const isLoading = loadingStates[btn.id];
        
        return (
          <Button
            key={btn.id}
            variant={btn.variant}
            onClick={handler}
            disabled={isAnyLoading || !handler}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {btn.loadingLabel}
              </>
            ) : (
              <>
                {btn.icon}
                <span className="ml-2">{btn.label}</span>
              </>
            )}
          </Button>
        );
      })}

      {/* Secondary buttons in overflow menu */}
      {secondaryButtons.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isAnyLoading}
              className="min-w-[120px]"
            >
              More Actions
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondaryButtons.map((btn) => {
              const handler = handlers[btn.id];
              const isLoading = loadingStates[btn.id];
              
              return (
                <DropdownMenuItem
                  key={btn.id}
                  onClick={handler}
                  disabled={isLoading || !handler}
                  className="gap-2 flex-col items-start"
                >
                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      btn.icon
                    )}
                    {isLoading ? btn.loadingLabel : btn.label}
                  </div>
                  {btn.description && !isLoading && (
                    <span className="text-xs text-muted-foreground ml-6">{btn.description}</span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default ControlDock;
