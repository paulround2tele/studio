"use client";
import React from 'react';
import type { DomainAnalysisFeatures } from '@/lib/api-client/models/domain-analysis-features';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const TopKeywordsList: React.FC<{ features?: DomainAnalysisFeatures | null; max?: number }> = ({ features, max = 3 }) => {
  const kws = features?.keywords?.top3 || [];
  if (!kws.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs font-medium truncate inline-block max-w-[160px]" data-testid="top-keywords-list">
            {kws.slice(0, max).join(', ')}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-sm">
          <div className="text-xs space-y-1">
            <div className="font-medium">Top Keywords</div>
            <div>{kws.join(', ')}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TopKeywordsList;
