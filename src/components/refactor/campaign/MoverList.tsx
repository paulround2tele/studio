/**
 * MoverList Component (Phase C)
 * List of top up/down domains - standalone version
 */

import React from 'react';
import { TrendingUpIcon, TrendingDownIcon, ArrowUpRightIcon, ArrowDownRightIcon } from '@/icons';
import Badge from '@/components/ta/ui/badge/Badge';
import { cn } from '@/lib/utils';

export interface MoverData {
  domain: string;
  delta: number;
  previousScore?: number;
  currentScore?: number;
  rank?: number;
  change?: 'up' | 'down' | 'new' | 'stable';
}

interface MoverListProps {
  movers: MoverData[];
  type: 'up' | 'down';
  title?: string;
  maxItems?: number;
  className?: string;
  showScores?: boolean;
  showRanks?: boolean;
  compact?: boolean;
}

const typeConfig = {
  up: {
    icon: TrendingUpIcon,
    arrowIcon: ArrowUpRightIcon,
    title: 'Top Gainers',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
    badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  },
  down: {
    icon: TrendingDownIcon,
    arrowIcon: ArrowDownRightIcon,
    title: 'Top Decliners',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700',
    badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }
};

export function MoverList({ 
  movers, 
  type, 
  title,
  maxItems = 10,
  className,
  showScores = true,
  showRanks = false,
  compact = false
}: MoverListProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const ArrowIcon = config.arrowIcon;
  
  const displayTitle = title || config.title;
  const displayMovers = movers.slice(0, maxItems);
  
  if (movers.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", className)}>
        <div className={cn("p-6", compact ? "pb-3" : "")}>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icon className={cn("w-5 h-5", config.color)} />
            {displayTitle}
          </h3>
        </div>
        <div className={cn("px-6 pb-6", compact ? "pt-0" : "")}>
          <div className="text-center py-6">
            <Icon className={cn("w-8 h-8 mx-auto mb-2 opacity-50", config.color)} />
            <p className="text-sm text-gray-500">
              No significant {type === 'up' ? 'gainers' : 'decliners'} found
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", className)}>
      <div className={cn("p-6", compact ? "pb-3" : "")}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icon className={cn("w-5 h-5", config.color)} />
            {displayTitle}
          </h3>
          <Badge color="light" size="sm">
            {movers.length} movers
          </Badge>
        </div>
      </div>
      <div className={cn("px-6 pb-6", compact ? "pt-0" : "")}>
        <div className="space-y-3">
          {displayMovers.map((mover, index) => (
            <div 
              key={`${mover.domain}-${index}`}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50",
                config.borderColor
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {showRanks && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium">
                    {index + 1}
                  </div>
                )}
                
                <ArrowIcon className={cn("w-4 h-4 shrink-0", config.color)} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {mover.domain}
                    </span>
                    {mover.change && mover.change !== 'stable' && (
                      <Badge color="light" size="sm">
                        {mover.change}
                      </Badge>
                    )}
                  </div>
                  
                  {showScores && (mover.previousScore !== undefined || mover.currentScore !== undefined) && (
                    <div className="text-xs text-gray-500">
                      {mover.previousScore !== undefined && mover.currentScore !== undefined ? (
                        `${mover.previousScore.toFixed(3)} → ${mover.currentScore.toFixed(3)}`
                      ) : mover.currentScore !== undefined ? (
                        `Score: ${mover.currentScore.toFixed(3)}`
                      ) : (
                        `Previous: ${mover.previousScore?.toFixed(3)}`
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right shrink-0 ml-3">
                <div className={cn(
                  "text-sm font-bold flex items-center gap-1",
                  config.color
                )}>
                  {type === 'up' ? '+' : ''}{mover.delta.toFixed(3)}
                </div>
                {mover.rank && (
                  <div className="text-xs text-gray-500">
                    Rank #{mover.rank}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {movers.length > maxItems && (
            <div className="text-center py-2">
              <p className="text-xs text-gray-500">
                +{movers.length - maxItems} more {type === 'up' ? 'gainers' : 'decliners'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MoverList;