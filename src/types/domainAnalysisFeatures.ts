export interface DomainAnalysisFeatures {
  domain: string;
  keywords: {
    unique_count: number | null;
    hits_total: number | null;
    weight_sum: number | null;
    top3: string[];
    signal_distribution: Record<string, number>;
  };
  richness: {
    score: number | null;
    version: number | null;
    prominence_norm: number | null;
    diversity_effective_unique: number | null;
    diversity_norm: number | null;
    enrichment_norm: number | null;
    applied_bonus: number | null;
    applied_deductions_total: number | null;
    stuffing_penalty: number | null;
    repetition_index: number | null;
    anchor_share: number | null;
  };
  microcrawl: {
    gain_ratio: number | null;
  };
}

export function coerceFeatures(raw: any): DomainAnalysisFeatures | null {
  if (!raw || typeof raw !== 'object') return null;
  const safeNum = (v: any): number | null => (typeof v === 'number' ? v : v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const top3 = Array.isArray(raw.keywords?.top3) ? raw.keywords.top3.filter((x: any) => typeof x === 'string') : [];
  const sigDist: Record<string, number> = {};
  if (raw.keywords?.signal_distribution && typeof raw.keywords.signal_distribution === 'object') {
    Object.entries(raw.keywords.signal_distribution).forEach(([k, v]) => {
      const n = safeNum(v);
      if (typeof n === 'number') sigDist[k] = n;
    });
  }
  return {
    domain: String(raw.domain || ''),
    keywords: {
      unique_count: safeNum(raw.keywords?.unique_count),
      hits_total: safeNum(raw.keywords?.hits_total),
      weight_sum: safeNum(raw.keywords?.weight_sum),
      top3,
      signal_distribution: sigDist,
    },
    richness: {
      score: safeNum(raw.richness?.score),
      version: safeNum(raw.richness?.version),
      prominence_norm: safeNum(raw.richness?.prominence_norm),
      diversity_effective_unique: safeNum(raw.richness?.diversity_effective_unique),
      diversity_norm: safeNum(raw.richness?.diversity_norm),
      enrichment_norm: safeNum(raw.richness?.enrichment_norm),
      applied_bonus: safeNum(raw.richness?.applied_bonus),
      applied_deductions_total: safeNum(raw.richness?.applied_deductions_total),
      stuffing_penalty: safeNum(raw.richness?.stuffing_penalty),
      repetition_index: safeNum(raw.richness?.repetition_index),
      anchor_share: safeNum(raw.richness?.anchor_share),
    },
    microcrawl: {
      gain_ratio: safeNum(raw.microcrawl?.gain_ratio),
    },
  };
}