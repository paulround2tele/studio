import { mapTargetingToAnalysis, mapTargetingToHTTPValidation } from '../phaseMapping';

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
