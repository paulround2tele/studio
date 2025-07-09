// Campaign Metrics Component - Progress bars and statistics
// Part of the modular architecture replacing the monolithic campaign details page

"use client";

import React from 'react';
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
import { cn } from '@/lib/utils';

export interface CampaignMetricsProps {
  campaign: CampaignViewModel;
  totalDomains?: number;
  streamingStats?: {
    domainsPerSecond: number;
    messagesReceived: number;
    connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  };
  className?: string;
}

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


export const CampaignMetrics: React.FC<CampaignMetricsProps> = ({
  campaign,
  totalDomains = 0,
  streamingStats,
  className
}) => {
  // CRITICAL FIX: Use consistent data sources - prefer WebSocket data over stale campaign data
  const progressPercentage = campaign.progressPercentage || campaign.progress || 0;
  const processedItems = totalDomains > 0 ? totalDomains : (campaign.processedItems || 0);
  const successfulItems = campaign.successfulItems || 0;
  const failedItems = campaign.failedItems || 0;
  const targetItems = campaign.totalItems || campaign.domainGenerationParams?.numDomainsToGenerate || 0;
  
  // Calculate rates based on actual processed items (from WebSocket data)
  const successRate = processedItems > 0 ? (successfulItems / processedItems) * 100 : 0;
  const failureRate = processedItems > 0 ? (failedItems / processedItems) * 100 : 0;
  
  const duration = formatDuration(campaign.startedAt, campaign.completedAt);
  const avgProcessingRate = campaign.avgProcessingRate || 0;

  return (
    <Card className={cn("shadow-xl border-2 bg-gradient-to-br from-card to-muted/10", className)}>
      <CardHeader className="pb-4 bg-gradient-to-r from-card to-muted/20 border-b">
        <CardTitle className="flex items-center gap-3 text-xl font-bold">
          <BarChart3 className="h-6 w-6 text-primary" />
          Campaign Metrics
        </CardTitle>
        <CardDescription className="text-base mt-1">
          Real-time progress and performance statistics
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-8 p-6">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <Badge variant="outline" className="text-xs">
              {progressPercentage.toFixed(1)}%
            </Badge>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatNumber(processedItems)} processed</span>
            <span>{formatNumber(targetItems)} target</span>
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
              {formatNumber(totalDomains || processedItems)}
            </div>
          </div>

          {/* Success Count */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Successful</span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatNumber(successfulItems)}
            </div>
          </div>

          {/* Failed Count */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium">Failed</span>
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {formatNumber(failedItems)}
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
        {processedItems > 0 && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-600">Success Rate</span>
                <span className="text-sm">{successRate.toFixed(1)}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-600">Failure Rate</span>
                <span className="text-sm">{failureRate.toFixed(1)}%</span>
              </div>
              <Progress value={failureRate} className="h-2" />
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
        {campaign.estimatedCompletionAt && campaign.status === 'running' && (
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
        {campaign.campaignType === 'domain_generation' && campaign.domainGenerationParams && (
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
};

export default CampaignMetrics;