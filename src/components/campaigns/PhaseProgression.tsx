'use client';

import React from 'react';
import { CheckCircle, Clock, Play, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Phase {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  order: number;
}

interface PhaseProgressionProps {
  phases: Phase[];
  currentPhaseId?: string;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  running: {
    icon: Play,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  failed: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
  paused: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
  },
};

export function PhaseProgression({ phases, currentPhaseId, className }: PhaseProgressionProps) {
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

  return (
    <div className={cn('flex items-center justify-center space-x-2 p-4', className)}>
      {sortedPhases.map((phase, index) => {
        const config = statusConfig[phase.status];
        const Icon = config.icon;
        const isActive = phase.id === currentPhaseId;
        const isLast = index === sortedPhases.length - 1;

        return (
          <React.Fragment key={phase.id}>
            {/* Phase node */}
            <div className="flex flex-col items-center space-y-2">
              <div
                className={cn(
                  'relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200',
                  config.bgColor,
                  config.borderColor,
                  isActive && 'ring-2 ring-blue-500 ring-opacity-50 scale-110'
                )}
              >
                <Icon className={cn('h-5 w-5', config.color)} />
                
                {/* Active pulse animation */}
                {isActive && phase.status === 'running' && (
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-20" />
                )}
              </div>
              
              {/* Phase name */}
              <div className="text-center">
                <div className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-blue-700' : 'text-gray-600'
                )}>
                  {phase.name}
                </div>
                <div className={cn(
                  'text-xs capitalize',
                  config.color
                )}>
                  {phase.status}
                </div>
              </div>
            </div>

            {/* Arrow connector */}
            {!isLast && (
              <div className="flex items-center">
                <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
