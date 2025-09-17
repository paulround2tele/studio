/**
 * PipelineBar Component
 * Visual pipeline progress bar showing phase segments
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { usePipelinePhases, type PipelinePhase } from '@/hooks/refactor/usePipelinePhases';

interface PipelineBarProps {
  currentPhase?: string;
  phaseExecutions?: Record<string, any>;
  className?: string;
}

function PhaseSegment({ phase, isLast }: { phase: PipelinePhase; isLast: boolean }) {
  const getStatusStyles = (status: PipelinePhase['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'active':
        return 'bg-blue-500 text-white animate-pulse';
      case 'failed':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getConnectorStyles = (status: PipelinePhase['status']) => {
    return status === 'completed' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700';
  };

  return (
    <div className="flex items-center">
      <div
        className={cn(
          'flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
          getStatusStyles(phase.status)
        )}
        data-testid={`pipeline-phase-${phase.key}`}
      >
        {phase.label}
      </div>
      {!isLast && (
        <div
          className={cn(
            'w-8 h-1 mx-2 rounded transition-colors',
            getConnectorStyles(phase.status)
          )}
        />
      )}
    </div>
  );
}

export function PipelineBar({ currentPhase, phaseExecutions, className }: PipelineBarProps) {
  const { phases } = usePipelinePhases(currentPhase, phaseExecutions);

  return (
    <div 
      className={cn('flex items-center justify-center p-4', className)}
      data-testid="pipeline-bar"
    >
      <div className="flex items-center">
        {phases.map((phase, index) => (
          <PhaseSegment
            key={phase.key}
            phase={phase}
            isLast={index === phases.length - 1}
          />
        ))}
      </div>
    </div>
  );
}