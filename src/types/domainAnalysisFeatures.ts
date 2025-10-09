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

export function coerceFeatures(raw: unknown): DomainAnalysisFeatures | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const safeNum = (v: unknown): number | null => (typeof v === 'number' ? v : v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const keywords = (obj.keywords && typeof obj.keywords === 'object') ? obj.keywords as Record<string, unknown> : {};
  const topRaw = (keywords.top3 && Array.isArray(keywords.top3)) ? keywords.top3 : [];
  const top3 = topRaw.filter(x => typeof x === 'string') as string[];
  const sigDist: Record<string, number> = {};
  if (keywords.signal_distribution && typeof keywords.signal_distribution === 'object') {
    Object.entries(keywords.signal_distribution as Record<string, unknown>).forEach(([k, v]) => {
      const n = safeNum(v);
      if (typeof n === 'number') sigDist[k] = n;
    });
  }
  const richness = (obj.richness && typeof obj.richness === 'object') ? obj.richness as Record<string, unknown> : {};
  const microcrawl = (obj.microcrawl && typeof obj.microcrawl === 'object') ? obj.microcrawl as Record<string, unknown> : {};
  return {
    domain: String(obj.domain || ''),
    keywords: {
      unique_count: safeNum(keywords.unique_count),
      hits_total: safeNum(keywords.hits_total),
      weight_sum: safeNum(keywords.weight_sum),
      top3,
      signal_distribution: sigDist,
    },
    richness: {
      score: safeNum(richness.score),
      version: safeNum(richness.version),
      prominence_norm: safeNum(richness.prominence_norm),
      diversity_effective_unique: safeNum(richness.diversity_effective_unique),
      diversity_norm: safeNum(richness.diversity_norm),
      enrichment_norm: safeNum(richness.enrichment_norm),
      applied_bonus: safeNum(richness.applied_bonus),
      applied_deductions_total: safeNum(richness.applied_deductions_total),
      stuffing_penalty: safeNum(richness.stuffing_penalty),
      repetition_index: safeNum(richness.repetition_index),
      anchor_share: safeNum(richness.anchor_share),
    },
    microcrawl: {
      gain_ratio: safeNum(microcrawl.gain_ratio),
    },
  };
}