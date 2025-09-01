'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Play, Pause, AlertCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimpleTooltip } from '@/components/ui/tooltip';

interface PhaseCardProps {
  phase: {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'configured';
    progress?: number;
    duration?: string;
    itemsProcessed?: number;
    totalItems?: number;
    errorMessage?: string;
  };
  isActive: boolean;
  canStart: boolean;
  canConfigure: boolean;
  configureDisabledReason?: string;
  startDisabledReason?: string;
  isConfigured?: boolean;
  lastStartError?: string;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onConfigure?: () => void;
  className?: string;
  liveConnected?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    badgeVariant: 'secondary' as const,
  },
  running: {
    icon: Play,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    badgeVariant: 'default' as const,
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    badgeVariant: 'outline' as const,
  },
  failed: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    badgeVariant: 'destructive' as const,
  },
  paused: {
    icon: Pause,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100',
    badgeVariant: 'outline' as const,
  },
  configured: {
    icon: Settings,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
    badgeVariant: 'secondary' as const,
  },
};

export function PhaseCard({
  phase,
  isActive,
  canStart,
  canConfigure,
  configureDisabledReason,
  startDisabledReason,
  isConfigured = false,
  lastStartError,
  onStart,
  onPause,
  onResume,
  onConfigure,
  className,
  liveConnected = false,
}: PhaseCardProps) {
  const config = statusConfig[phase.status];
  const Icon = config.icon;

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      isActive && 'ring-2 ring-blue-500 ring-opacity-50',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className={cn('p-2 rounded-full', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            {phase.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {liveConnected && (
              <Badge className="bg-green-100 text-green-700 border-green-200">Live</Badge>
            )}
            {phase.status === 'pending' && isConfigured && (
              <Badge variant="secondary">Configured</Badge>
            )}
            <Badge variant={config.badgeVariant}>
              {phase.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Inline last start error for quick visibility */}
        {lastStartError && (phase.status === 'pending' || phase.status === 'configured') && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            <strong>Start failed:</strong> {lastStartError}
          </div>
        )}
        {/* Progress bar for running phases */}
        {phase.status === 'running' && phase.progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{phase.progress}%</span>
            </div>
            <Progress value={phase.progress} className="h-2" />
            {phase.itemsProcessed !== undefined && phase.totalItems !== undefined && (
              <div className="text-xs text-gray-500">
                {phase.itemsProcessed.toLocaleString()} / {phase.totalItems.toLocaleString()} items
              </div>
            )}
          </div>
        )}

        {/* Duration for completed phases */}
        {phase.status === 'completed' && phase.duration && (
          <div className="text-sm text-gray-600">
            <strong>Duration:</strong> {phase.duration}
          </div>
        )}

        {/* Error message for failed phases */}
        {phase.status === 'failed' && phase.errorMessage && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            <strong>Error:</strong> {phase.errorMessage}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {(phase.status === 'pending' || phase.status === 'configured') && (
            canStart ? (
              <Button size="sm" onClick={onStart} className="flex-1">
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
            ) : (
              <SimpleTooltip
                disabled={!startDisabledReason}
                content={startDisabledReason || ''}
                side="top"
              >
                <Button size="sm" className="flex-1" disabled>
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </Button>
              </SimpleTooltip>
            )
          )}
          
          {phase.status === 'running' && onPause && (
            <Button
              size="sm"
              variant="outline"
              onClick={onPause}
              className="flex-1"
            >
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </Button>
          )}

          {phase.status === 'paused' && onResume && (
            <Button
              size="sm"
              onClick={onResume}
              className="flex-1"
            >
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
          )}
          
          {canConfigure ? (
            <Button size="sm" variant="outline" onClick={onConfigure}>
              <Settings className="h-3 w-3 mr-1" />
              Configure
            </Button>
          ) : (
            <SimpleTooltip
              disabled={!configureDisabledReason}
              content={configureDisabledReason || ''}
              side="top"
            >
              <Button size="sm" variant="outline" disabled>
                <Settings className="h-3 w-3 mr-1" />
                Configure
              </Button>
            </SimpleTooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
