/**
 * Momentum Panel Component (Phase C)
 * Top movers and momentum analysis with histogram
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

export interface MomentumMover {
  domain: string;
  delta: number;
  previousScore?: number;
  currentScore?: number;
}

export interface MomentumHistogramBin {
  bucket: string;
  count: number;
}

interface MomentumPanelProps {
  moversUp: MomentumMover[];
  moversDown: MomentumMover[];
  histogram?: MomentumHistogramBin[];
  className?: string;
  maxMovers?: number;
}

function MoverList({ 
  movers, 
  type, 
  maxItems = 5 
}: { 
  movers: MomentumMover[]; 
  type: 'up' | 'down'; 
  maxItems?: number; 
}) {
  const Icon = type === 'up' ? TrendingUp : TrendingDown;
  const colorClass = type === 'up' ? 'text-green-600' : 'text-red-600';
  const bgClass = type === 'up' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';

  if (!movers || movers.length === 0) {
    return (
      <div className={cn("p-4 rounded-lg", bgClass)}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={cn("w-4 h-4", colorClass)} />
          <h4 className="font-medium">
            {type === 'up' ? 'Top Gainers' : 'Top Decliners'}
          </h4>
        </div>
        <p className="text-sm text-gray-500">No significant movers</p>
      </div>
    );
  }

  return (
    <div className={cn("p-4 rounded-lg", bgClass)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("w-4 h-4", colorClass)} />
        <h4 className="font-medium">
          {type === 'up' ? 'Top Gainers' : 'Top Decliners'}
        </h4>
      </div>
      
      <div className="space-y-2">
        {movers.slice(0, maxItems).map((mover, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {mover.domain}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", colorClass)}>
                {type === 'up' ? '+' : ''}{mover.delta.toFixed(3)}
              </span>
              {mover.currentScore !== undefined && (
                <span className="text-xs text-gray-500">
                  ({mover.currentScore.toFixed(2)})
                </span>
              )}
            </div>
          </div>
        ))}
        {movers.length > maxItems && (
          <div className="text-xs text-gray-500 pt-1">
            +{movers.length - maxItems} more
          </div>
        )}
      </div>
    </div>
  );
}

function Histogram({ bins }: { bins: MomentumHistogramBin[] }) {
  if (!bins || bins.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-600" />
          <h4 className="font-medium">Delta Distribution</h4>
        </div>
        <p className="text-sm text-gray-500">No histogram data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...bins.map(b => b.count));

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-gray-600" />
        <h4 className="font-medium">Delta Distribution</h4>
      </div>
      
      <div className="space-y-2">
        {bins.map((bin, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-16 text-right">
              {bin.bucket}
            </span>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${maxCount > 0 ? (bin.count / maxCount) * 100 : 0}%`,
                  minWidth: bin.count > 0 ? '2px' : '0'
                }}
              />
            </div>
            <span className="text-xs text-gray-600 w-8">
              {bin.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MomentumPanel({ 
  moversUp, 
  moversDown, 
  histogram, 
  className, 
  maxMovers = 5 
}: MomentumPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Momentum Analysis
      </h3>
      
      <div className="grid gap-4 lg:grid-cols-2">
        <MoverList movers={moversUp} type="up" maxItems={maxMovers} />
        <MoverList movers={moversDown} type="down" maxItems={maxMovers} />
      </div>
      
      {histogram && (
        <Histogram bins={histogram} />
      )}
    </div>
  );
}