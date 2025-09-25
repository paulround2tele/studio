"use client";
import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import RichnessBreakdownModal from './RichnessBreakdownModal';
import type { DomainAnalysisFeatures } from '@/lib/api-client/models/domain-analysis-features';

export const RichnessBadge: React.FC<{ features?: DomainAnalysisFeatures | null; className?: string; domain?: string }> = ({ features, className, domain }) => {
  const score = features?.richness?.score;
  const version = features?.richness?.version;
  const [open, setOpen] = React.useState(false);
  if (score == null) return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;
  const tier = score >= 0.85 ? 'emerald' : score >= 0.7 ? 'sky' : score >= 0.5 ? 'amber' : 'zinc';
  const bg = {
    emerald: 'bg-emerald-600/15 text-emerald-600 border-emerald-600/30',
    sky: 'bg-sky-600/15 text-sky-600 border-sky-600/30',
    amber: 'bg-amber-600/15 text-amber-600 border-amber-600/30',
    zinc: 'bg-zinc-600/15 text-zinc-600 border-zinc-600/30',
  }[tier];
  return (
    <>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={()=>setOpen(true)}
            onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); setOpen(true);} }}
            aria-haspopup="dialog"
            aria-label="Open richness breakdown"
            className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none select-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ring', bg, className)}
            data-testid="richness-badge"
          >
            {score.toFixed(2)}{version ? <span className="ml-0.5 opacity-60">v{version}</span> : null}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top" align="center">
          <div className="text-xs space-y-1">
            <div className="font-medium">Content Richness</div>
            <ul className="list-disc ml-4">
              <li>Diversity norm: {features?.richness?.diversity_norm ?? '—'}</li>
              <li>Prominence norm: {features?.richness?.prominence_norm ?? '—'}</li>
              <li>Enrichment norm: {features?.richness?.enrichment_norm ?? '—'}</li>
              {features?.richness?.applied_bonus != null && <li>Bonus: {features.richness?.applied_bonus}</li>}
              {features?.richness?.applied_deductions_total != null && <li>Deductions: {features.richness?.applied_deductions_total}</li>}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <RichnessBreakdownModal open={open} onClose={()=>setOpen(false)} features={features} domain={domain} />
    </>
  );
};

export default RichnessBadge;
