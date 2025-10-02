"use client";
import React from 'react';

export interface RichnessMetrics {
  prominence_norm?: number;
  diversity_norm?: number;
  enrichment_norm?: number;
  applied_bonus?: number;
  applied_deductions_total?: number;
  stuffing_penalty?: number;
  repetition_index?: number;
  anchor_share?: number;
  score?: number;
  version?: number;
}

interface Props {
  richness?: RichnessMetrics | null;
  bonusCap?: number;
  dedCap?: number;
}

const POSITIVE_COLORS: Record<string,string> = {
  prominence: '#2563eb',
  diversity: '#0891b2',
  enrichment: '#6366f1',
  bonus: '#16a34a',
};
const NEGATIVE_COLOR = '#dc2626';
const NEGATIVE_BORDER = '#991b1b';

export const RichnessContributionBar: React.FC<Props> = ({ richness, bonusCap = 0.30, dedCap = 0.50 }) => {
  const data = React.useMemo(() => {
    if (!richness) return null;
    const clamp = (v: unknown, min: number, max: number) => {
      const n = typeof v === 'number' && isFinite(v) ? v : 0; return Math.min(Math.max(n, min), max);
    };
    const prominence = clamp(richness.prominence_norm, 0, 1);
    const diversity = clamp(richness.diversity_norm, 0, 1);
    const enrichment = clamp(richness.enrichment_norm, 0, 1);
    const bonus = clamp(richness.applied_bonus, 0, bonusCap);

    const deductions = clamp(richness.applied_deductions_total, 0, dedCap);
    const stuffing = clamp(richness.stuffing_penalty, 0, 1);
    const repetition = clamp(richness.repetition_index, 0, 1);
    const anchor = clamp(richness.anchor_share, 0, 1);

    const positivesRaw = [
      { key: 'prominence', label: 'Prominence', value: prominence },
      { key: 'diversity', label: 'Diversity', value: diversity },
      { key: 'enrichment', label: 'Enrichment', value: enrichment },
      { key: 'bonus', label: 'Bonus', value: bonus },
    ].filter(p => p.value > 0);

    const negativesRaw = [
      { key: 'deductions', label: 'Deductions', value: deductions },
      { key: 'stuffing', label: 'Stuffing', value: stuffing },
      { key: 'repetition', label: 'Repetition', value: repetition },
      { key: 'anchor', label: 'Anchor', value: anchor },
    ].filter(n => n.value > 0);

    const totalPositive = positivesRaw.reduce((a,b)=>a+b.value,0);
    const totalNegative = negativesRaw.reduce((a,b)=>a+b.value,0);
    const totalMagnitude = totalPositive + totalNegative;

    return { positivesRaw, negativesRaw, totalPositive, totalNegative, totalMagnitude };
  }, [richness, bonusCap, dedCap]);

  if (!data || data.totalMagnitude === 0) {
    return <div className="text-xs text-muted-foreground" data-testid="richness-contrib-empty">No components available.</div>;
  }

  const { positivesRaw, negativesRaw, totalPositive, totalNegative, totalMagnitude } = data;

  const MIN_PCT = 3; // minimum visible percent
  const pct = (value: number) => (value / totalMagnitude) * 100;
  const positiveSegments = positivesRaw.map(p => ({ ...p, pct: Math.max(pct(p.value), p.value > 0 ? MIN_PCT : 0) }));
  const negativePct = Math.max(pct(totalNegative), totalNegative > 0 ? MIN_PCT : 0);

  // Adjust if sum exceeds 100 due to minimums
  const totalAssigned = positiveSegments.reduce((a,b)=>a+b.pct,0) + negativePct;
  const scale = totalAssigned > 100 ? (100 / totalAssigned) : 1;

  // Prepare tooltip content for negatives
  const negativeBreakdown = negativesRaw
    .map(n => `${n.label} ${n.value.toFixed(2)}`)
    .join(', ');

  return (
    <div className="space-y-1" data-testid="richness-contrib-wrapper" aria-label="Richness contribution breakdown">
      <div className="relative w-full h-4 rounded bg-muted overflow-hidden border border-border" data-testid="richness-contrib-bar">
        <div className="flex h-full w-full">
          {positiveSegments.map(seg => (
            <div
              key={seg.key}
              className="h-full" role="presentation"
              style={{ width: `${seg.pct * scale}%`, background: POSITIVE_COLORS[seg.key] }}
              aria-label={`${seg.label} ${seg.value.toFixed(2)} (${((seg.value/totalMagnitude)*100).toFixed(1)}% of total magnitude)`}
              data-testid={`richness-seg-${seg.key}`}
            >
              <span className="sr-only">{seg.label}</span>
            </div>
          ))}
          {totalNegative > 0 && (
            <div
              tabIndex={0}
              className="h-full relative focus:outline-none"
              style={{ width: `${negativePct * scale}%`, background: NEGATIVE_COLOR, borderLeft: `1px solid ${NEGATIVE_BORDER}` }}
              aria-describedby="richness-negatives-tooltip"
              aria-label={`Penalties ${totalNegative.toFixed(2)} total (${negativeBreakdown})`}
              data-testid="richness-seg-penalties"
            >
            </div>
          )}
        </div>
        {totalNegative > 0 && (
          <div
            id="richness-negatives-tooltip"
            role="tooltip"
            className="pointer-events-none absolute z-10 hidden md:group-hover:block group-focus-within:block bg-popover text-popover-foreground text-[10px] rounded px-2 py-1 shadow"
          >
            {negativesRaw.map(n => (
              <div key={n.key}>{n.label}: {n.value.toFixed(2)}</div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 items-center text-[10px]" data-testid="richness-contrib-legend">
        {positiveSegments.map(s => (
          <div key={s.key} className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: POSITIVE_COLORS[s.key] }} />{s.label}</div>
        ))}
        {totalNegative > 0 && <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: NEGATIVE_COLOR, border: `1px solid ${NEGATIVE_BORDER}` }} />Penalties</div>}
      </div>
    </div>
  );
};

export default RichnessContributionBar;
