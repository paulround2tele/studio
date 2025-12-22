import { 
  mapTargetingToAnalysis, 
  mapTargetingToHTTPValidation,
  apiPhaseToInternal,
  internalPhaseToAPI
} from '../phaseMapping';

describe('phaseMapping keyword normalization', () => {
  it('merges include and ad-hoc keywords for HTTP validation config', () => {
    const config = mapTargetingToHTTPValidation({
      includeKeywords: ['Alpha', ' beta '],
      adHocKeywords: ['beta', 'Gamma', ' '],
      httpPersonas: ['persona-1'],
      keywordSetIds: [' set-1 ', '', 'set-2'],
    });

    expect(config.keywords).toEqual(['Alpha', 'beta', 'Gamma']);
    expect(config.adHocKeywords).toEqual(['beta', 'Gamma']);
    expect(config.keywordSetIds).toEqual(['set-1', 'set-2']);
  });

  it('propagates ad-hoc keywords into analysis rules', () => {
    const config = mapTargetingToAnalysis({
      analysisPersonas: ['analysis-persona'],
      includeKeywords: ['Alpha'],
      adHocKeywords: ['Gamma', 'Alpha'],
    });

    expect(config).not.toBeNull();
    expect(config?.keywordRules).toEqual([
      { pattern: 'Alpha', ruleType: 'string' },
      { pattern: 'Gamma', ruleType: 'string' },
    ]);
  });
});

describe('Phase Name Mapping', () => {
  it('correctly maps API phases to internal phases', () => {
    expect(apiPhaseToInternal('discovery')).toBe('domain_generation');
    expect(apiPhaseToInternal('validation')).toBe('dns_validation');
    expect(apiPhaseToInternal('extraction')).toBe('http_keyword_validation');
    expect(apiPhaseToInternal('enrichment')).toBe('enrichment');
    expect(apiPhaseToInternal('analysis')).toBe('analysis');
  });

  it('correctly maps internal phases to API phases', () => {
    expect(internalPhaseToAPI('domain_generation')).toBe('discovery');
    expect(internalPhaseToAPI('dns_validation')).toBe('validation');
    expect(internalPhaseToAPI('http_keyword_validation')).toBe('extraction');
    expect(internalPhaseToAPI('enrichment')).toBe('enrichment');
    expect(internalPhaseToAPI('analysis')).toBe('analysis');
  });
});

