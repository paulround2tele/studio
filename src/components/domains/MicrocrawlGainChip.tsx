"use client";
import React from 'react';
import type { DomainAnalysisFeatures } from '@/lib/api-client/models/domain-analysis-features';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const MicrocrawlGainChip: React.FC<{ features?: DomainAnalysisFeatures | null; className?: string }> = ({ features, className }) => {
  const gain = features?.microcrawl?.gain_ratio;
  if (gain == null) return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;
  const color = gain >= 0.5 ? 'text-emerald-600 border-emerald-600/30 bg-emerald-600/10' : gain >= 0.2 ? 'text-sky-600 border-sky-600/30 bg-sky-600/10' : 'text-zinc-600 border-zinc-600/30 bg-zinc-600/10';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none select-none', color, className)} data-testid="microcrawl-gain-chip">
            +{(gain * 100).toFixed(0)}%
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="max-w-xs">
          <div className="text-xs space-y-1">
            <div className="font-medium">Microcrawl Gain Ratio</div>
            <p>Proportional keyword diversity improvement added by targeted microcrawl pages.</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MicrocrawlGainChip;
