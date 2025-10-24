import { coerceFeatures } from '../domainAnalysisFeatures';

describe('coerceFeatures', () => {
  it('coerces numeric strings and filters top3', () => {
    const raw = {
      domain: 'example.com',
      keywords: {
        unique_count: '5',
        hits_total: '10',
        weight_sum: '3.5',
        top3: ['alpha', 123, 'beta', null],
        signal_distribution: { a: '1', b: 2, c: 'NaN' }
      },
      richness: {
        score: '0.75',
        version: 2,
        prominence_norm: '0.8',
        diversity_effective_unique: '4',
        diversity_norm: '0.5',
        enrichment_norm: '0.2',
        applied_bonus: '0.1',
        applied_deductions_total: '0.05',
        stuffing_penalty: '0',
        repetition_index: '0.02',
        anchor_share: '0.3'
      },
      microcrawl: { gain_ratio: '0.4' }
    };
    const coerced = coerceFeatures(raw)!;
    expect(coerced.keywords.unique_count).toBe(5);
    expect(coerced.keywords.hits_total).toBe(10);
    expect(coerced.keywords.weight_sum).toBe(3.5);
    expect(coerced.keywords.top3).toEqual(['alpha','beta']);
    expect(coerced.keywords.signal_distribution).toEqual({ a:1, b:2 });
    expect(coerced.richness.score).toBe(0.75);
    expect(coerced.richness.version).toBe(2);
    expect(coerced.microcrawl.gain_ratio).toBe(0.4);
  });

  it('returns null on invalid input', () => {
    expect(coerceFeatures(null as unknown)).toBeNull();
    expect(coerceFeatures(undefined as unknown)).toBeNull();
    expect(coerceFeatures('str' as unknown)).toBeNull();
  });
});
