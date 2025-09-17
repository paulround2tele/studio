/**
 * Campaign KPI Card Component
 * Displays key performance indicators for campaigns
 */

import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      return <ArrowUp className="w-4 h-4 text-green-500" />;
    case 'down':
      return <ArrowDown className="w-4 h-4 text-red-500" />;
    case 'stable':
    default:
      return <Minus className="w-4 h-4 text-gray-500" />;
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
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {kpi.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

export default CampaignKpiCard;