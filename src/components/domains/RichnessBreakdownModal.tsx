"use client";

/**
 * @deprecated Phase 7.5 - Use DomainDrawer from @/components/explorer instead
 * 
 * MIGRATION:
 * ```tsx
 * // Before:
 * import RichnessBreakdownModal from '@/components/domains/RichnessBreakdownModal';
 * <RichnessBreakdownModal open={open} onClose={onClose} domain={domain} features={features} />
 * 
 * // After:
 * import { DomainDrawer } from '@/components/explorer';
 * <DomainDrawer
 *   campaignId={campaignId}
 *   domainId={domainId}
 *   isOpen={isOpen}
 *   onClose={onClose}
 * />
 * ```
 * 
 * The new drawer provides:
 * - Full domain details (not just richness)
 * - All features (keywords, microcrawl, richness)
 * - Better layout with sections
 * - Loading and error states
 * - Degraded mode for missing features
 * 
 * @see Phase 7.5 Integration & Deprecation
 */

import React from 'react';
import type { DomainAnalysisFeatures } from '@/lib/api-client/models/domain-analysis-features';
import { cn } from '@/lib/utils';
import RichnessContributionBar, { RichnessMetrics } from '@/components/analysis/RichnessContributionBar';

interface Props {
  open: boolean;
  onClose: () => void;
  domain?: string;
  features?: DomainAnalysisFeatures | null;
}

const metricDefs: { key: keyof NonNullable<DomainAnalysisFeatures['richness']>; label: string; category: 'core' | 'bonus' | 'deduction' | 'penalty'; desc: string }[] = [
  { key: 'prominence_norm', label: 'Prominence', category: 'core', desc: 'Weighted average prominence of significant keywords (normalized 0-1).' },
  { key: 'diversity_norm', label: 'Diversity', category: 'core', desc: 'Effective unique keyword diversity (normalized) capturing breadth.' },
  { key: 'enrichment_norm', label: 'Enrichment', category: 'core', desc: 'Supplemental semantic / contextual enrichment indicators combined.' },
  { key: 'applied_bonus', label: 'Bonus', category: 'bonus', desc: 'Positive adjustments (e.g., multi-signal synergy) added to base score.' },
  { key: 'applied_deductions_total', label: 'Deductions', category: 'deduction', desc: 'Aggregate deductions (e.g., partial spam patterns) subtracted from score.' },
  { key: 'stuffing_penalty', label: 'Stuffing Penalty', category: 'penalty', desc: 'Penalty applied when keyword stuffing patterns detected.' },
  { key: 'repetition_index', label: 'Repetition Index', category: 'penalty', desc: 'Measure of repetitive keyword usage; higher indicates redundancy risk.' },
  { key: 'anchor_share', label: 'Anchor Share', category: 'core', desc: 'Proportion of anchor-like terms; extreme values may indicate template content.' },
];

const barColor: Record<string,string> = {
  core: 'bg-sky-500/70',
  bonus: 'bg-emerald-500/70',
  deduction: 'bg-rose-500/70',
  penalty: 'bg-amber-500/70'
};

/**
 * @deprecated Use DomainDrawer from @/components/explorer instead
 */
export const RichnessBreakdownModal: React.FC<Props> = ({ open, onClose, domain, features }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [showJSON, setShowJSON] = React.useState(false);
  const score = features?.richness?.score ?? null;
  React.useEffect(()=>{
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  React.useEffect(()=>{
    if (open && ref.current) {
      ref.current.focus();
    }
  }, [open]);
  if (!open) return null;
  const richness = features?.richness;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Richness breakdown modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} tabIndex={-1} className="relative bg-background border shadow-xl rounded-md w-[520px] max-h-[85vh] overflow-auto p-5 focus:outline-none" data-testid="richness-breakdown-modal">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold" data-testid="richness-breakdown-title">Richness Breakdown{domain ? ` – ${domain}` : ''}</h2>
            {score != null && <p className="text-xs text-muted-foreground" data-testid="richness-breakdown-score">Score: {score.toFixed(3)}{richness?.version != null && <span className="ml-1 opacity-60">v{richness.version}</span>}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close richness breakdown" className="text-xs px-2 py-1 rounded border hover:bg-muted" data-testid="richness-breakdown-close">Close</button>
        </div>
        <div className="mb-4" data-testid="richness-breakdown-contrib">
          <RichnessContributionBar richness={richness as RichnessMetrics | undefined} />
        </div>
        <div className="space-y-3" data-testid="richness-breakdown-bars">
          {metricDefs.map(md => {
            const rawVal = richness?.[md.key];
            if (rawVal == null) return null;
            // Normalize typical 0-1 metrics; for deductions/penalties keep absolute magnitude within [0,1] assumption.
            let val: number = typeof rawVal === 'number' ? rawVal : Number(rawVal);
            if (!Number.isFinite(val)) return null;
            // For deductions/penalties invert sign if negative so bar length shows magnitude; color communicates semantics.
            const magnitude = Math.min(Math.abs(val), 1);
            const descId = `richness-metric-desc-${md.key}`;
            return (
              <div key={md.key} className="space-y-1 group" data-testid={`richness-metric-${md.key}`} aria-label={`${md.label} ${val}`}>
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="inline-flex items-center gap-1">
                    <span>{md.label}</span>
                    <span
                      tabIndex={0}
                      aria-label={`${md.label} info`}
                      aria-describedby={descId}
                      data-testid={`richness-metric-info-${md.key}`}
                      className="w-3 h-3 rounded-full bg-muted text-[9px] flex items-center justify-center cursor-help select-none outline-none focus:ring-1 focus:ring-ring"
                      title={md.desc}
                    >i</span>
                  </span>
                  <span className="tabular-nums">{val.toFixed(3)}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded overflow-hidden" title={md.desc}>
                  <div className={cn('h-full transition-all', barColor[md.category])} style={{ width: `${magnitude*100}%` }} />
                </div>
                <div id={descId} role="tooltip" className="hidden group-focus-within:block group-hover:block text-[10px] text-muted-foreground leading-snug" data-testid={`richness-metric-desc-${md.key}`}>{md.desc}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <button type="button" className="text-xs underline" onClick={()=>setShowJSON(s=>!s)} data-testid="richness-breakdown-toggle-json" aria-expanded={showJSON}>Raw JSON</button>
          {showJSON && (
            <pre className="mt-2 max-h-64 overflow-auto text-[10px] bg-muted p-2 rounded" data-testid="richness-breakdown-raw-json">{JSON.stringify(features, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default RichnessBreakdownModal;
