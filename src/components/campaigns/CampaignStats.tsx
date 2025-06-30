/**
 * Enhanced campaign statistics component with number support (OpenAPI compatible)
 */

import React, { useMemo } from 'react';
import { CampaignViewModel } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignStatsProps {
  campaign: CampaignViewModel;
  className?: string;
  showDetailedStats?: boolean;
}

/**
 * Calculate percentage safely with number values
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
 * Main campaign statistics component
 */
export function CampaignStats({ 
  campaign, 
  className,
  showDetailedStats = true 
}: CampaignStatsProps) {
  const stats = useMemo(() => {
    const totalItems = campaign.totalItems || 0;
    const processedItems = campaign.processedItems || 0;
    const successfulItems = campaign.successfulItems || 0;
    const failedItems = campaign.failedItems || 0;
    
    // Calculate derived statistics
    const progressPercentage = calculatePercentage(processedItems, totalItems);
    const successRate = calculatePercentage(successfulItems, processedItems);
    const failureRate = calculatePercentage(failedItems, processedItems);
    const remainingItems = (() => {
      if (!totalItems || !processedItems) return 0;
      try {
        const totalNum = Number(totalItems);
        const processedNum = Number(processedItems);
        const remaining = totalNum - processedNum;
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
      remainingItems,
      progressPercentage,
      successRate,
      failureRate
    };
  }, [campaign]);

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
                {Number(stats.processedItems).toLocaleString()} / {Number(stats.totalItems).toLocaleString()}
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
                {Number(stats.totalItems).toLocaleString()}
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
}

/**
 * Compact campaign statistics for list views
 */
export function CampaignStatsCompact({ 
  campaign, 
  className 
}: Omit<CampaignStatsProps, 'showDetailedStats'>) {
  const progressPercentage = useMemo(() => {
    return calculatePercentage(campaign.processedItems, campaign.totalItems);
  }, [campaign.processedItems, campaign.totalItems]);

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-1" />
      </div>
      
      <div className="text-right text-xs">
        <span className="text-xs">
          {Number(campaign.processedItems || 0).toLocaleString()} / {Number(campaign.totalItems || 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/**
 * Campaign statistics summary for dashboards
 */
export function CampaignStatsSummary({ 
  campaign, 
  className 
}: Omit<CampaignStatsProps, 'showDetailedStats'>) {
  const stats = useMemo(() => ({
    progressPercentage: calculatePercentage(campaign.processedItems, campaign.totalItems),
    successRate: calculatePercentage(campaign.successfulItems, campaign.processedItems),
  }), [campaign]);

  return (
    <div className={cn('grid grid-cols-3 gap-4 text-center', className)}>
      <div>
        <div className="text-lg font-semibold">
          {Number(campaign.totalItems || 0).toLocaleString()}
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
