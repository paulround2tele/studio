import { buildRulePayload, makeDefaultValues } from '../AnalysisConfigForm';
import type { AnalysisKeywordRuleFormValue } from '@/types/forms';

describe('makeDefaultValues', () => {
  it('returns opinionated defaults ready for submission', () => {
    const defaults = makeDefaultValues();

    expect(defaults.personaIds).toEqual([]);
    expect(defaults.analysisTypes).toEqual(['content']);
    expect(defaults.includeExternal).toBe(false);
    expect(defaults.enableSuggestions).toBe(true);
    expect(defaults.generateReports).toBe(true);
    expect(defaults.keywordRules).toHaveLength(0);
    expect(defaults.name).toContain('Analysis - ');
  });
});

describe('buildRulePayload', () => {
  const makeRule = (rule: Partial<AnalysisKeywordRuleFormValue>): AnalysisKeywordRuleFormValue => ({
    id: rule.id ?? 'rule',
    pattern: rule.pattern ?? '',
    ruleType: rule.ruleType ?? 'string',
    contextChars: rule.contextChars ?? 0,
  });

  it('trims patterns, rounds context, and filters blanks', () => {
    const rules: AnalysisKeywordRuleFormValue[] = [
      makeRule({ id: 'a', pattern: '  lead  ', ruleType: 'string', contextChars: 15.8 }),
      makeRule({ id: 'b', pattern: '', ruleType: 'regex', contextChars: 10 }),
      makeRule({ id: 'c', pattern: 'regex-rule', ruleType: 'regex', contextChars: -5 }),
      makeRule({ id: 'd', pattern: 'score', ruleType: 'string', contextChars: Number.POSITIVE_INFINITY }),
    ];

    const payload = buildRulePayload(rules);

    expect(payload).toEqual([
      { pattern: 'lead', ruleType: 'string', contextChars: 16 },
      { pattern: 'regex-rule', ruleType: 'regex', contextChars: 0 },
      { pattern: 'score', ruleType: 'string', contextChars: 0 },
    ]);
  });
});
