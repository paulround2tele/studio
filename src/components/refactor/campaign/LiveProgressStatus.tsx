/**
 * Live Progress Status Component (Phase 3)
 * Shows real-time progress updates with connection status and animation
 */

import React from 'react';
import { Wifi, WifiOff, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProgressUpdate } from '@/types/campaignMetrics';
import { useFormattedPhase } from '@/hooks/useCampaignProgress';

export interface LiveProgressStatusProps {
  /**
   * Latest progress update
   */
  progress: ProgressUpdate | null;
  
  /**
   * Whether stream is connected
   */
  isConnected: boolean;
  
  /**
   * Whether progress tracking is enabled
   */
  isEnabled: boolean;
  
  /**
   * Whether campaign has completed
   */
  isCompleted: boolean;
  
  /**
   * Latest error
   */
  error: Error | null;
  
  /**
   * Progress statistics
   */
  stats: {
    percentage: number;
    analyzedDomains: number;
    totalDomains: number;
    estimatedTimeRemaining?: string;
  };
  
  /**
   * Whether to show detailed stats
   */
  showStats?: boolean;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Custom className
   */
  className?: string;
}

const sizeStyles = {
  sm: {
    container: 'gap-2 text-xs',
    icon: 'w-3 h-3',
    badge: 'text-xs px-2 py-1'
  },
  md: {
    container: 'gap-3 text-sm',
    icon: 'w-4 h-4',
    badge: 'text-sm px-3 py-1'
  },
  lg: {
    container: 'gap-4 text-base',
    icon: 'w-5 h-5',
    badge: 'text-base px-4 py-2'
  }
};

export function LiveProgressStatus({
  progress,
  isConnected,
  isEnabled,
  isCompleted,
  error,
  stats,
  showStats = true,
  size = 'md',
  className
}: LiveProgressStatusProps) {
  const styles = sizeStyles[size];
  const formattedPhase = useFormattedPhase(progress?.phase || '');

  // Don't render if real-time progress is not enabled
  if (!isEnabled) {
    return null;
  }

  // Determine status and styling
  const status = getStatus(isConnected, isCompleted, error);
  const { icon: StatusIcon, color, bgColor, label } = getStatusConfig(status);

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      bgColor,
      className
    )}>
      <div className={cn("flex items-center", styles.container)}>
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <StatusIcon 
            className={cn(styles.icon, color, {
              'animate-spin': status === 'connecting' || (status === 'connected' && !isCompleted)
            })} 
          />
          <span className={cn("font-medium", color)}>
            {label}
          </span>
        </div>

        {/* Phase Information */}
        {progress && (
          <Badge 
            variant="outline" 
            className={cn(styles.badge, "font-normal")}
          >
            {formattedPhase}
          </Badge>
        )}

        {/* Last Update Time */}
        {progress && (
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className={cn(styles.icon)} />
            <span className={styles.container}>
              {formatLastUpdate(progress.updatedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Progress Stats */}
      {showStats && progress && stats.totalDomains > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="font-medium">
              {stats.analyzedDomains} / {stats.totalDomains}
            </div>
            <div className="text-gray-500">
              {stats.percentage}% complete
            </div>
          </div>
          
          {stats.estimatedTimeRemaining && !isCompleted && (
            <div className="text-right">
              <div className="text-gray-500">ETA:</div>
              <div className="font-medium">
                {stats.estimatedTimeRemaining}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Determine current status based on connection and completion state
 */
type Status = 'connected' | 'disconnected' | 'connecting' | 'completed' | 'error';

function getStatus(
  isConnected: boolean, 
  isCompleted: boolean, 
  error: Error | null
): Status {
  if (error) return 'error';
  if (isCompleted) return 'completed';
  if (isConnected) return 'connected';
  return 'disconnected';
}

/**
 * Get status configuration for styling and icons
 */
function getStatusConfig(status: Status) {
  const configs = {
    connected: {
      icon: Wifi,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      label: 'Live Updates'
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 border-gray-200',
      label: 'Disconnected'
    },
    connecting: {
      icon: Loader2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      label: 'Connecting...'
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      label: 'Completed'
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      label: 'Connection Error'
    }
  };

  return configs[status];
}

/**
 * Format last update timestamp for display
 */
function formatLastUpdate(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) {
      return diffSecs <= 5 ? 'just now' : `${diffSecs}s ago`;
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  } catch {
    return 'unknown';
  }
}

/**
 * Compact version for small spaces
 */
export function CompactLiveProgressStatus({
  isConnected,
  isEnabled,
  error,
  className,
  ...props
}: Omit<LiveProgressStatusProps, 'size' | 'showStats'>) {
  return (
    <LiveProgressStatus
      isConnected={isConnected}
      isEnabled={isEnabled}
      error={error}
      size="sm"
      showStats={false}
      className={cn('p-2', className)}
      {...props}
    />
  );
}

/**
 * Progress indicator with just the animated icon
 */
export interface ProgressIndicatorProps {
  isEnabled: boolean;
  isConnected: boolean;
  isCompleted: boolean;
  error: Error | null;
  className?: string;
}

export function ProgressIndicator({
  isEnabled,
  isConnected,
  isCompleted,
  error,
  className
}: ProgressIndicatorProps) {
  if (!isEnabled) {
    return null;
  }

  const status = getStatus(isConnected, isCompleted, error);
  const { icon: StatusIcon, color } = getStatusConfig(status);

  return (
    <StatusIcon 
      className={cn(
        'w-4 h-4',
        color,
        {
          'animate-spin': status === 'connecting' || (status === 'connected' && !isCompleted),
          'animate-pulse': status === 'connected' && !isCompleted
        },
        className
      )}
      title={getStatusConfig(status).label}
    />
  );
}

export default LiveProgressStatus;