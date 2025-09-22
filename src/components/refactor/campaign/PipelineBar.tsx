/**
 * Pipeline Bar Component (Phase B)
 * Live pipeline with 5 sequential phases and real-time updates
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Play, XCircle, AlertCircle } from 'lucide-react';

export interface PipelinePhase {
  key: string;
  label: string;
  status: 'not_started' | 'ready' | 'configured' | 'in_progress' | 'paused' | 'completed' | 'failed';
  progressPercentage: number;
  startedAt?: string;
  completedAt?: string;
}

interface PipelineBarProps {
  phases: PipelinePhase[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  compact?: boolean;
}

const statusConfig = {
  not_started: {
    icon: Clock,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    label: 'Not Started'
  },
  ready: {
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'Ready'
  },
  configured: {
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Configured'
  },
  in_progress: {
    icon: Play,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    label: 'In Progress'
  },
  paused: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    label: 'Paused'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    label: 'Completed'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    label: 'Failed'
  }
};

function PipelinePhaseCard({ phase, compact = false }: { phase: PipelinePhase; compact?: boolean }) {
  const config = statusConfig[phase.status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "relative p-3 rounded-lg border transition-all duration-200",
      config.bgColor,
      compact ? "min-w-0" : "min-w-32"
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", config.color)} />
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            "font-medium leading-tight",
            config.color,
            compact ? "text-xs" : "text-sm"
          )}>
            {phase.label}
          </h3>
          {!compact && (
            <p className="text-xs text-gray-500 mt-1">
              {config.label}
            </p>
          )}
        </div>
      </div>
      
      {phase.status === 'in_progress' && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(phase.progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${phase.progressPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function PipelineBar({ 
  phases, 
  className, 
  orientation = 'horizontal',
  compact = false 
}: PipelineBarProps) {
  const isVertical = orientation === 'vertical';

  return (
    <div className={cn(
      "flex gap-3",
      isVertical ? "flex-col" : "flex-row flex-wrap",
      className
    )}>
      {phases.map((phase, index) => (
        <React.Fragment key={phase.key}>
          <PipelinePhaseCard phase={phase} compact={compact} />
          {!isVertical && index < phases.length - 1 && (
            <div className="flex items-center justify-center min-w-4">
              <div className="w-6 h-0.5 bg-gray-300 dark:bg-gray-600" />
            </div>
          )}
          {isVertical && index < phases.length - 1 && (
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-600" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}