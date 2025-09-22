/**
 * KPI Grid Component (Phase B)
 * Displays high-level metrics grid for campaign performance
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CampaignKpiCard } from './CampaignKpiCard';
import type { CampaignKpi } from '../types';

interface KpiGridProps {
  kpis: CampaignKpi[];
  className?: string;
  loading?: boolean;
}

// Loading skeleton for KPI cards
const KpiSkeleton = () => (
  <div className="space-y-3">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
  </div>
);

export function KpiGrid({ kpis, className, loading = false }: KpiGridProps) {
  if (loading) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <KpiSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (!kpis || kpis.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-gray-500", className)}>
        <div className="text-center">
          <h3 className="text-lg font-medium">No KPI data available</h3>
          <p className="text-sm">Metrics will appear once campaign data is processed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {kpis.map((kpi, index) => (
        <CampaignKpiCard 
          key={`${kpi.label}-${index}`} 
          kpi={kpi}
        />
      ))}
    </div>
  );
}