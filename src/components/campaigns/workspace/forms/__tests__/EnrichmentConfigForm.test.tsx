import { ENRICHMENT_DEFAULT_VALUES, normalizeEnrichmentValues } from '../EnrichmentConfigForm';

describe('normalizeEnrichmentValues', () => {
  it('clamps values to allowed ranges', () => {
    const result = normalizeEnrichmentValues({
      matchScoreThreshold: 2,
      lowScoreGraceThreshold: 1,
      minContentBytes: 100,
      parkedConfidenceFloor: -0.5,
      requireStructuralSignals: false,
    });

    expect(result.matchScoreThreshold).toBeCloseTo(0.95, 5);
    expect(result.lowScoreGraceThreshold).toBeCloseTo(0.6, 5);
    expect(result.minContentBytes).toBe(256);
    expect(result.parkedConfidenceFloor).toBeCloseTo(0, 5);
    expect(result.requireStructuralSignals).toBe(false);
  });

  it('respects match score when lowering grace threshold', () => {
    const result = normalizeEnrichmentValues({
      matchScoreThreshold: 0.1,
      lowScoreGraceThreshold: 0.2,
      minContentBytes: Number.NaN,
      parkedConfidenceFloor: Number.POSITIVE_INFINITY,
      requireStructuralSignals: true,
    });

    expect(result.matchScoreThreshold).toBeCloseTo(0.1, 5);
    expect(result.lowScoreGraceThreshold).toBeCloseTo(0.1, 5);
    expect(result.minContentBytes).toBe(256);
    expect(result.parkedConfidenceFloor).toBeCloseTo(1, 5);
  });

  it('leaves default values unchanged when already valid', () => {
    const copy = { ...ENRICHMENT_DEFAULT_VALUES };
    const result = normalizeEnrichmentValues(copy);
    expect(result).toEqual(ENRICHMENT_DEFAULT_VALUES);
  });
});
