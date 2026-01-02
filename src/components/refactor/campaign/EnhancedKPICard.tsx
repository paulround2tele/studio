/**
 * Enhanced KPI Card with Sparkline Support (Phase 4 Integration Example)
 * Shows how to integrate Phase 4 features with existing components
 */

import React, { useMemo } from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/refactor/campaign/Sparkline';
import { getSnapshots, getSnapshotCount } from '@/services/campaignMetrics/historyStore';
import type { AggregateSnapshot } from '@/types/campaignMetrics';

// Feature flags
const ENABLE_TRENDS = process.env.NEXT_PUBLIC_ENABLE_TRENDS !== 'false';
const MIN_SNAPSHOTS_FOR_TRENDS = 3;

interface EnhancedKPICardProps {
  title: string;
  value: number | string;
  delta?: number;
  deltaDirection?: 'up' | 'down' | 'flat';
  subtitle?: string;
  unit?: string;
  campaignId?: string;
  metricKey?: keyof AggregateSnapshot['aggregates']; // e.g., 'totalDomains', 'avgLeadScore'
  invertTrend?: boolean; // For metrics where up is bad (e.g., error rates)
  threshold?: number;
  className?: string;
}

/**
 * Extract metric values from snapshots for sparkline
 */
function extractMetricValues(
  snapshots: AggregateSnapshot[], 
  metricKey: keyof AggregateSnapshot['aggregates']
): number[] {
  return snapshots
    .map(snapshot => snapshot.aggregates[metricKey])
    .filter((value): value is number => typeof value === 'number' && !isNaN(value));
}

/**
 * Enhanced KPI Card with integrated sparkline and historical trend support
 */
export const EnhancedKPICard: React.FC<EnhancedKPICardProps> = ({
  title,
  value,
  delta,
  deltaDirection = 'flat',
  subtitle,
  unit,
  campaignId,
  metricKey,
  invertTrend = false,
  threshold,
  className
}) => {
  // Get historical data for sparkline
  const { sparklineData, hasEnoughData } = useMemo(() => {
    if (!ENABLE_TRENDS || !campaignId || !metricKey) {
      return { sparklineData: [], hasEnoughData: false };
    }

    const snapshots = getSnapshots(campaignId);
    const snapshotCount = getSnapshotCount(campaignId);
    
    if (snapshotCount < MIN_SNAPSHOTS_FOR_TRENDS) {
      return { sparklineData: [], hasEnoughData: false };
    }

    const values = extractMetricValues(snapshots, metricKey);
    return { 
      sparklineData: values, 
      hasEnoughData: values.length >= MIN_SNAPSHOTS_FOR_TRENDS 
    };
  }, [campaignId, metricKey]);

  // Format the main value
  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      } else if (value % 1 !== 0) {
        return value.toFixed(1);
      }
      return value.toString();
    }
    return value;
  }, [value]);

  // Delta styling
  const deltaClasses = useMemo(() => {
    if (!delta || deltaDirection === 'flat') return 'text-gray-500';
    
    const isPositive = deltaDirection === 'up';
    const isGoodChange = invertTrend ? !isPositive : isPositive;
    
    return isGoodChange ? 'text-green-600' : 'text-red-600';
  }, [delta, deltaDirection, invertTrend]);

  const deltaIcon = useMemo(() => {
    if (!delta || deltaDirection === 'flat') return '→';
    return deltaDirection === 'up' ? '↗' : '↘';
  }, [delta, deltaDirection]);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]', className)}>
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-600">
            {title}
          </h3>
          
          {/* Sparkline in header if available */}
          {hasEnoughData && (
            <div className="flex items-center gap-2">
              <Sparkline
                values={sparklineData}
                width={40}
                height={16}
                invert={invertTrend}
                threshold={threshold}
                annotateLast={false}
                className="opacity-75"
              />
              <Badge color="light" size="sm">
                {sparklineData.length}
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      <div className="px-6 pb-6 pt-0">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight">
              {formattedValue}
              {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
            </div>
            
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Delta and larger sparkline */}
          <div className="flex flex-col items-end gap-1">
            {delta !== undefined && (
              <div className={cn('flex items-center gap-1 text-sm font-medium', deltaClasses)}>
                <span className="text-xs">{deltaIcon}</span>
                <span>{Math.abs(delta).toFixed(1)}{unit}</span>
              </div>
            )}
            
            {/* Larger sparkline for detailed view */}
            {hasEnoughData && (
              <div className="flex items-center gap-1">
                <Sparkline
                  values={sparklineData}
                  width={60}
                  height={20}
                  invert={invertTrend}
                  threshold={threshold}
                  annotateLast={true}
                  className="opacity-90"
                />
                <span className="text-xs text-gray-400">
                  {sparklineData.length}d
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Trend indicator for accessibility */}
        {hasEnoughData && (
          <div className="sr-only">
            Historical trend based on {sparklineData.length} data points.
            {delta && ` Current change: ${delta > 0 ? 'increase' : 'decrease'} of ${Math.abs(delta)}${unit || ''}.`}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedKPICard;