/**
 * Unified Campaign Statistics Component
 * Consolidates CampaignMetrics.tsx and CampaignStats.tsx functionality
 * Provides real-time metrics, progress tracking, and multiple display variants
 */

"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Target,
  TrendingUp,
  Activity
} from 'lucide-react';
import type { CampaignViewModel } from '@/lib/types';
import type { CampaignPhase } from '@/lib/api-client/models';
import { cn } from '@/lib/utils';

// Unified interfaces combining both original components
export interface CampaignStatisticsProps {
  campaign: CampaignViewModel;
  totalDomains?: number;
  streamingStats?: {
    domainsPerSecond: number;
    messagesReceived: number;
    connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  };
  className?: string;
  showDetailedStats?: boolean;
  variant?: 'default' | 'enhanced' | 'compact' | 'summary';
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
    const totalItems = campaign.totalItems || 0;
    const processedItems = Math.max(
      totalDomains,
      campaign.processedItems || 0,
      // Calculate from progress if available
      campaign.totalItems ? Math.floor(((campaign.progressPercentage || 0) / 100) * campaign.totalItems) : 0
    );
    const successfulItems = campaign.successfulItems || 0;
    const failedItems = campaign.failedItems || 0;
    const targetItems = Math.max(
      totalItems,
      campaign.domainGenerationParams?.numDomainsToGenerate || 0,
      processedItems // Use processed as minimum target
    );

    // Enhanced progress calculation
    const progressPercentage = Math.max(
      campaign.progressPercentage || 0,
      0,
      calculatePercentage(processedItems, targetItems)
    );

    // Calculate derived statistics
    const successRate = calculatePercentage(successfulItems, processedItems);
    const failureRate = calculatePercentage(failedItems, processedItems);
    const remainingItems = (() => {
      if (!targetItems || !processedItems) return 0;
      try {
        const remaining = targetItems - processedItems;
        return remaining > 0 ? remaining : 0;
      } catch {
        return 0;
      }
    })();

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
  const avgProcessingRate = campaign.avgProcessingRate || 0;
  
  // Real-time connection status
  const connectionStatus = streamingStats?.connectionStatus || 'disconnected';
  const isConnected = connectionStatus === 'connected';

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{stats.progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={stats.progressPercentage} className="h-1" />
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
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        
        <div>
          <div className="text-lg font-semibold">
            {stats.progressPercentage.toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">Progress</div>
        </div>
        
        <div>
          <div className="text-lg font-semibold">
            {stats.successRate.toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">Success</div>
        </div>
      </div>
    );
  }

  // Enhanced variant (CampaignMetrics style)
  if (variant === 'enhanced') {
    return (
      <Card className={cn("shadow-xl border-2 bg-gradient-to-br from-card to-muted/10", className)}>
        <CardHeader className="pb-4 bg-gradient-to-r from-card to-muted/20 border-b">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <BarChart3 className="h-6 w-6 text-primary" />
            Campaign Metrics
            {/* Real-time connection indicator */}
            <div className={`ml-auto flex items-center gap-2 text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isConnected ? 'Live' : 'Disconnected'}
            </div>
          </CardTitle>
          <CardDescription className="text-base mt-1">
            Real-time progress and performance statistics
            {streamingStats && isConnected && (
              <span className="ml-2 text-xs text-green-600">
                • {streamingStats.messagesReceived || 0} updates received
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 p-6">
          {/* Main Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <Badge variant="outline" className="text-xs">
                {stats.progressPercentage.toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={stats.progressPercentage} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatNumber(stats.processedItems)} processed</span>
              <span>{formatNumber(stats.targetItems)} target</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Total Domains */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Total Domains</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(totalDomains || stats.processedItems)}
              </div>
            </div>

            {/* Success Count */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Successful</span>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatNumber(stats.successfulItems)}
              </div>
            </div>

            {/* Failed Count */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium">Failed</span>
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {formatNumber(stats.failedItems)}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
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
                <Progress value={stats.successRate} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-red-600">Failure Rate</span>
                  <span className="text-sm">{stats.failureRate.toFixed(1)}%</span>
                </div>
                <Progress value={stats.failureRate} className="h-2" />
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            {/* Processing Rate */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Avg. Processing Rate</span>
              </div>
              <div className="text-sm font-medium">
                {avgProcessingRate > 0 ? `${avgProcessingRate.toFixed(1)}/min` : 'N/A'}
              </div>
            </div>

            {/* Real-time Streaming Stats */}
            {streamingStats && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs">Streaming Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {streamingStats.domainsPerSecond.toFixed(1)}/sec
                  </span>
                  <Badge 
                    variant={streamingStats.connectionStatus === 'connected' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {streamingStats.connectionStatus}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Estimated Completion */}
          {campaign.estimatedCompletionAt && campaign.phaseStatus === 'in_progress' && (
            <div className="pt-4 border-t">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Estimated Completion</div>
                <div className="text-sm font-medium">
                  {new Date(campaign.estimatedCompletionAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Campaign Type Specific Metrics */}
          {campaign.currentPhase === 'domain_generation' && campaign.domainGenerationParams && (
            <div className="pt-4 border-t">
              <div className="text-xs text-muted-foreground mb-2">Domain Generation Settings</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Pattern:</span>
                  <span className="font-mono text-xs">{campaign.domainGenerationParams.patternType}</span>
                </div>
                <div className="flex justify-between">
                  <span>TLD:</span>
                  <span className="font-mono text-xs">{campaign.domainGenerationParams.tld}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant (CampaignStats style)
  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Campaign Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{stats.progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={stats.progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Successful
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-green-600">
                  {Number(stats.successfulItems).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({stats.successRate.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4 text-red-500" />
                Failed
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-red-600">
                  {Number(stats.failedItems).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({stats.failureRate.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Statistics */}
      {showDetailedStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4" />
                Total Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(stats.targetItems).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Items to process
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Processed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(stats.processedItems).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Items completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.successRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Of processed items
              </p>
            </CardContent>
          </Card>
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