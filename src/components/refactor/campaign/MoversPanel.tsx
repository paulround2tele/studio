/**
 * Movers Panel Component (Phase 3)
 * Shows top domain gainers and decliners with collapsible interface
 */

import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, TrendingUpIcon, TrendingDownIcon, TargetIcon, ZapIcon } from '@/icons';
import Badge from '@/components/ta/ui/badge/Badge';
import { cn } from '@/lib/utils';
import { Mover } from '@/types/campaignMetrics';
import { formatMoverValue, getMoverColor } from '@/services/campaignMetrics/moversService';

export interface MoversPanelProps {
  /**
   * Array of movers to display
   */
  movers: Mover[];
  
  /**
   * Panel title
   */
  title?: string;
  
  /**
   * Whether panel is initially collapsed
   */
  initiallyCollapsed?: boolean;
  
  /**
   * Maximum number of movers to show
   */
  maxDisplay?: number;
  
  /**
   * Whether this data is synthetic (for demo)
   */
  isSynthetic?: boolean;
  
  /**
   * Custom className
   */
  className?: string;
}

export function MoversPanel({
  movers,
  title = "Top Movers",
  initiallyCollapsed = false,
  maxDisplay = 6,
  isSynthetic = false,
  className
}: MoversPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);

  // Group movers by direction
  const gainers = movers.filter(mover => mover.direction === 'up');
  const decliners = movers.filter(mover => mover.direction === 'down');

  // Limit display
  const displayedMovers = movers.slice(0, maxDisplay);
  const hasMore = movers.length > maxDisplay;

  if (movers.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", className)}>
      <div 
        className="p-6 cursor-pointer select-none" 
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            {isSynthetic && (
              <Badge color="light" size="sm">
                Demo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="text-green-600 font-medium">{gainers.length}</span>
              <TrendingUpIcon className="w-4 h-4 text-green-600" />
              <span className="text-red-600 font-medium">{decliners.length}</span>
              <TrendingDownIcon className="w-4 h-4 text-red-600" />
            </div>
            {isCollapsed ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {displayedMovers.map((mover, index) => (
              <MoverItem 
                key={`${mover.domain}-${mover.metric}-${index}`} 
                mover={mover}
              />
            ))}
            
            {hasMore && (
              <div className="text-center pt-2 border-t">
                <span className="text-sm text-gray-500">
                  +{movers.length - maxDisplay} more movers
                </span>
              </div>
            )}
            
            {movers.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No significant movers found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual mover item component
 */
interface MoverItemProps {
  mover: Mover;
}

function MoverItem({ mover }: MoverItemProps) {
  const { domain, metric, direction, delta } = mover;
  const color = getMoverColor(mover);
  const formattedValue = formatMoverValue(mover);
  
  // Get icon based on metric and direction
  const IconComponent = direction === 'up' ? TrendingUpIcon : TrendingDownIcon;
  const MetricIcon = metric === 'richness' ? TargetIcon : ZapIcon;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div 
          className="flex items-center justify-center w-8 h-8 rounded-full"
          style={{ backgroundColor: `${color}15` }}
        >
          <span style={{ color }}>
            <MetricIcon className="w-4 h-4" />
          </span>
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate" title={domain}>
            {domain}
          </div>
          <div className="text-xs text-gray-500 capitalize">
            {metric} • {formattedValue}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ 
            border: `1px solid ${color}`,
            color 
          }}
        >
          <IconComponent className="w-3 h-3" />
          {Math.abs(delta).toFixed(metric === 'richness' ? 0 : 2)}
        </span>
      </div>
    </div>
  );
}

/**
 * Simplified movers panel for compact displays
 */
export function CompactMoversPanel({
  movers,
  className,
  ...props
}: Omit<MoversPanelProps, 'initiallyCollapsed' | 'maxDisplay'>) {
  return (
    <MoversPanel
      movers={movers}
      initiallyCollapsed={false}
      maxDisplay={3}
      className={cn('', className)}
      {...props}
    />
  );
}

/**
 * Movers summary component - shows just the counts
 */
export interface MoversSummaryProps {
  movers: Mover[];
  className?: string;
}

export function MoversSummary({ movers, className }: MoversSummaryProps) {
  const gainers = movers.filter(m => m.direction === 'up');
  const decliners = movers.filter(m => m.direction === 'down');

  if (movers.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      <div className="flex items-center gap-1">
        <TrendingUpIcon className="w-4 h-4 text-green-600" />
        <span className="font-medium text-green-600">{gainers.length}</span>
        <span className="text-gray-500">gainers</span>
      </div>
      <div className="flex items-center gap-1">
        <TrendingDownIcon className="w-4 h-4 text-red-600" />
        <span className="font-medium text-red-600">{decliners.length}</span>
        <span className="text-gray-500">decliners</span>
      </div>
    </div>
  );
}

export default MoversPanel;