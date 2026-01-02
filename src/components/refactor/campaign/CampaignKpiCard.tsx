/**
 * Campaign KPI Card Component
 * Displays key performance indicators for campaigns
 */

import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@/icons';
// Card import removed - using inline TailAdmin card pattern
import { cn } from '@/lib/utils';
import type { CampaignKpi } from '../types';

interface CampaignKpiCardProps {
  kpi: CampaignKpi;
  className?: string;
}

function formatValue(value: string | number, format?: CampaignKpi['format']): string {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'percentage':
      return `${value}%`;
    case 'currency':
      return `$${value.toLocaleString()}`;
    case 'duration':
      return `${value}s`;
    case 'number':
    default:
      return value.toLocaleString();
  }
}

function getTrendIcon(direction: 'up' | 'down' | 'stable') {
  switch (direction) {
    case 'up':
      return <ArrowUpIcon className="w-4 h-4 text-green-500" />;
    case 'down':
      return <ArrowDownIcon className="w-4 h-4 text-red-500" />;
    case 'stable':
    default:
      return <MinusIcon className="w-4 h-4 text-gray-500" />;
  }
}

function getTrendColor(direction: 'up' | 'down' | 'stable'): string {
  switch (direction) {
    case 'up':
      return 'text-green-600 dark:text-green-400';
    case 'down':
      return 'text-red-600 dark:text-red-400';
    case 'stable':
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

export function CampaignKpiCard({ kpi, className }: CampaignKpiCardProps) {
  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", className)}>
      <div className="p-6 pb-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {kpi.label}
        </h3>
      </div>
      <div className="px-6 pb-6 pt-0">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatValue(kpi.value, kpi.format)}
          </div>
          {kpi.trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm",
              getTrendColor(kpi.trend.direction)
            )}>
              {getTrendIcon(kpi.trend.direction)}
              <span>{kpi.trend.percentage}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignKpiCard;