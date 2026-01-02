/**
 * Unified Campaign Statistics Component
 * Consolidates CampaignMetrics.tsx and CampaignStats.tsx functionality
 * Provides real-time metrics, progress tracking, and multiple display variants
 */

'use client';

import React, { useMemo } from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import { 
  BarChart3Icon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  TargetIcon,
  TrendingUpIcon,
  ActivityIcon
} from '@/icons';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import { cn } from '@/lib/utils';

// Inline TailAdmin-style progress bar component
const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={cn("w-full bg-gray-200 rounded-full dark:bg-gray-700", className)}>
    <div
      className="h-2 rounded-full bg-brand-500 transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

// Streaming statistics interface for real-time updates
interface StreamingStats {
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  messagesReceived?: number;
  domainsPerSecond: number;
}

// Unified interfaces combining both original components
interface CampaignStatisticsProps {
  campaign: Campaign;
  className?: string;
  totalDomains?: number;
  streamingStats?: StreamingStats;
  showDetailedStats?: boolean;
  variant?: 'default' | 'compact' | 'summary' | 'enhanced';
}

// Utility functions from both components
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatDuration = (startedAt?: string, completedAt?: string): string => {
  if (!startedAt) return 'Not started';
  
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/**
 * Calculate percentage safely with number values (from CampaignStats)
 */
function calculatePercentage(current: unknown, total: unknown): number {
  if (!current || !total) return 0;
  
  try {
    const currentNum = Number(current);
    const totalNum = Number(total);
    
    if (totalNum === 0 || isNaN(currentNum) || isNaN(totalNum)) return 0;
    
    const percent = (currentNum / totalNum) * 100;
    return Math.min(100, Math.max(0, percent));
  } catch {
    return 0;
  }
}

/**
 * Main unified campaign statistics component
 */
export const CampaignStatistics: React.FC<CampaignStatisticsProps> = ({
  campaign,
  totalDomains = 0,
  streamingStats,
  className,
  showDetailedStats = true,
  variant = 'default'
}) => {
  // Enhanced data calculations combining both approaches
  const stats = useMemo(() => {
    const totalItems = campaign.progress?.totalDomains ?? 0;
    const processedItems = Math.max(
      totalDomains,
      campaign.progress?.processedDomains ?? 0
    );
    const successfulItems = campaign.progress?.successfulDomains ?? 0;
    const failedItems = campaign.progress?.failedDomains ?? 0;
    const targetItems = Math.max(totalItems, processedItems);

    // Prefer backend-provided percentComplete if present
    const percentFromBackend = campaign.progress?.percentComplete ?? 0;
    const computedPercent = calculatePercentage(processedItems, targetItems);
    const progressPercentage = Math.max(percentFromBackend, computedPercent);

    const successRate = calculatePercentage(successfulItems, processedItems);
    const failureRate = calculatePercentage(failedItems, processedItems);
    const remainingItems = targetItems > processedItems ? targetItems - processedItems : 0;

    return {
      totalItems,
      processedItems,
      successfulItems,
      failedItems,
      targetItems,
      remainingItems,
      progressPercentage,
      successRate,
      failureRate
    };
  }, [campaign, totalDomains]);

  const duration = formatDuration(campaign.startedAt, campaign.completedAt);
  const avgProcessingRate = 0;
  
  // Real-time connection status
  const connectionStatus = streamingStats?.connectionStatus || 'disconnected';
  const isConnected = connectionStatus === 'connected';

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Progress</span>
            <span className="font-medium">{stats.progressPercentage.toFixed(0)}%</span>
          </div>
          <ProgressBar value={stats.progressPercentage} className="h-1" />
        </div>
        
        <div className="text-right text-xs">
          <span className="text-xs">
            {Number(stats.processedItems).toLocaleString()} / {Number(stats.targetItems).toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  // Render summary variant
  if (variant === 'summary') {
    return (
      <div className={cn('grid grid-cols-3 gap-4 text-center', className)}>
        <div>
          <div className="text-lg font-semibold">
            {Number(stats.targetItems).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
        </div>
        
        <div>
          <div className="text-lg font-semibold">
            {stats.progressPercentage.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Progress</div>
        </div>
        
        <div>
          <div className="text-lg font-semibold">
            {stats.successRate.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Success</div>
        </div>
      </div>
    );
  }

  // Enhanced variant (CampaignMetrics style)
  if (variant === 'enhanced') {
    return (
      <div className={cn("rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800", className)}>
        <div className="border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-white to-gray-50 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
          <h3 className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
            <BarChart3Icon className="h-6 w-6 text-brand-500" />
            Campaign Metrics
            {/* Real-time connection indicator */}
            <div className={`ml-auto flex items-center gap-2 text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isConnected ? 'Live' : 'Disconnected'}
            </div>
          </h3>
          <p className="text-base mt-1 text-gray-600 dark:text-gray-400">
            Real-time progress and performance statistics
            {streamingStats && isConnected && (
              <span className="ml-2 text-xs text-green-600">
                • {streamingStats.messagesReceived || 0} updates received
              </span>
            )}
          </p>
        </div>
        
        <div className="space-y-8 p-6">
          {/* Main Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <Badge variant="light" color="light">
                {stats.progressPercentage.toFixed(1)}%
              </Badge>
            </div>
            <ProgressBar 
              value={stats.progressPercentage} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{formatNumber(stats.processedItems)} processed</span>
              <span>{formatNumber(stats.targetItems)} target</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Total Domains */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <TargetIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Total Domains</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {formatNumber(totalDomains || stats.processedItems)}
              </div>
            </div>

            {/* Success Count */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Successful</span>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatNumber(stats.successfulItems)}
              </div>
            </div>

            {/* Failed Count */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <XCircleIcon className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium">Failed</span>
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {formatNumber(stats.failedItems)}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <ClockIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {duration}
              </div>
            </div>
          </div>

          {/* Success/Failure Rates */}
          {stats.processedItems > 0 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-600">Success Rate</span>
                  <span className="text-sm">{stats.successRate.toFixed(1)}%</span>
                </div>
                <ProgressBar value={stats.successRate} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-red-600">Failure Rate</span>
                  <span className="text-sm">{stats.failureRate.toFixed(1)}%</span>
                </div>
                <ProgressBar value={stats.failureRate} className="h-2" />
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            {/* Processing Rate */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <TrendingUpIcon className="h-4 w-4" />
                <span className="text-xs">Avg. Processing Rate</span>
              </div>
              <div className="text-sm font-medium">
                {avgProcessingRate > 0 ? `${avgProcessingRate.toFixed(1)}/min` : 'N/A'}
              </div>
            </div>

            {/* Real-time Streaming Stats */}
            {streamingStats && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <ActivityIcon className="h-4 w-4" />
                  <span className="text-xs">Streaming Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {streamingStats.domainsPerSecond.toFixed(1)}/sec
                  </span>
                  <Badge 
                    color={streamingStats.connectionStatus === 'connected' ? 'success' : 'error'}
                    size="sm"
                  >
                    {streamingStats.connectionStatus}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Estimated Completion intentionally omitted */}

          {/* Phase-centric architecture: detailed configuration stored in phase records */}
            {campaign.currentPhase === 'discovery' && (
            <div className="pt-4 border-t">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current Phase</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Phase:</span>
                  <span className="font-mono text-xs">{campaign.currentPhase}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant (CampaignStats style)
  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Progress Card */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            <ActivityIcon className="h-5 w-5" />
            Campaign Progress
          </h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Progress</span>
              <span className="font-medium">{stats.progressPercentage.toFixed(1)}%</span>
            </div>
            <ProgressBar value={stats.progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {Number(stats.processedItems).toLocaleString()} / {Number(stats.targetItems).toLocaleString()}
              </span>
              <span>
                {Number(stats.remainingItems).toLocaleString()} remaining
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                Successful
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-green-600">
                  {Number(stats.successfulItems).toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({stats.successRate.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <XCircleIcon className="h-4 w-4 text-red-500" />
                Failed
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-red-600">
                  {Number(stats.failedItems).toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({stats.failureRate.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      {showDetailedStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h4 className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-white/90">
                <TargetIcon className="h-4 w-4" />
                Total Items
              </h4>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {Number(stats.targetItems).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Items to process
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h4 className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-white/90">
                <ClockIcon className="h-4 w-4" />
                Processed
              </h4>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {Number(stats.processedItems).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Items completed
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h4 className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-white/90">
                <TrendingUpIcon className="h-4 w-4" />
                Success Rate
              </h4>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {stats.successRate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Of processed items
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact campaign statistics for list views
 * Maintains backward compatibility with CampaignStats
 */
export const CampaignStatisticsCompact: React.FC<Omit<CampaignStatisticsProps, 'showDetailedStats' | 'variant'>> = ({ 
  campaign, 
  className,
  ...props
}) => (
  <CampaignStatistics 
    campaign={campaign} 
    className={className} 
    variant="compact" 
    {...props} 
  />
);

/**
 * Campaign statistics summary for dashboards
 * Maintains backward compatibility with CampaignStats
 */
export const CampaignStatisticsSummary: React.FC<Omit<CampaignStatisticsProps, 'showDetailedStats' | 'variant'>> = ({ 
  campaign, 
  className,
  ...props
}) => (
  <CampaignStatistics 
    campaign={campaign} 
    className={className} 
    variant="summary" 
    {...props} 
  />
);

// Backward compatibility exports
export const CampaignMetrics = (props: CampaignStatisticsProps) => 
  <CampaignStatistics {...props} variant="enhanced" />;

export const CampaignStats = (props: CampaignStatisticsProps) => 
  <CampaignStatistics {...props} variant="default" />;

export const CampaignStatsCompact = CampaignStatisticsCompact;
export const CampaignStatsSummary = CampaignStatisticsSummary;

export default CampaignStatistics;