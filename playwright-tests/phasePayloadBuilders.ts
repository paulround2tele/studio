// Central builders for minimal and extended phase configuration payloads
// Ensures all specs use authoritative shapes (flat configuration object)

export interface PhaseConfigPayload {
  configuration: Record<string, any>;
  personaIds?: { httpPersonaId?: string|null; dnsPersonaId?: string|null };
  proxyPoolId?: string;
  keywordSetIds?: string[];
}

// Discovery minimal payload (variableLength derives from prefix when prefix pattern)
export function buildDiscoveryConfig(options?: Partial<{ patternType: 'prefix'|'suffix'|'both'; constantString: string; characterSet: string; variableLength: number; tlds: string[]; numDomainsToGenerate: number; batchSize: number; prefixLength?: number; suffixLength?: number; }>): PhaseConfigPayload {
  const base = {
    patternType: 'prefix',
    constantString: 'brand',
    characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
    variableLength: 6,
    tlds: ['.com'],
    numDomainsToGenerate: 100,
    batchSize: 20,
    ...options,
  };
  // Align variableLength if prefix/suffix custom lengths supplied
  if (base.patternType === 'prefix' && typeof base.prefixLength === 'number') base.variableLength = base.prefixLength;
  if (base.patternType === 'suffix' && typeof base.suffixLength === 'number') base.variableLength = base.suffixLength;
  if (base.patternType === 'both') {
    const total = (base.prefixLength||0)+(base.suffixLength||0);
    if (total>0) base.variableLength = total;
  }
  return { configuration: { ...base } };
}

export function buildDnsValidationConfig(personaIds: string[], name = 'Auto DNS Config', proxyPoolId?: string): PhaseConfigPayload {
  return { configuration: { dnsValidation: { personaIds, name } }, ...(proxyPoolId? { proxyPoolId }: {}) };
}

export function buildHttpValidationConfig(personaIds: string[], name = 'Auto HTTP Config', keywordSetIds: string[] = [], adHocKeywords: string[] = [], proxyPoolId?: string): PhaseConfigPayload {
  return { configuration: { httpValidation: { personaIds, name, keywordSetIds, adHocKeywords } }, ...(proxyPoolId? { proxyPoolId }: {}) };
}

export function buildAnalysisConfig(name = 'Auto Analysis Config', analysisTypes: string[] = ['content'], enableSuggestions = true, customRules: string[] = []): PhaseConfigPayload {
  return { configuration: { analysis: { name, analysisTypes, enableSuggestions, customRules } } };
}

// Convenience map (used for generic iteration if needed)
export const phaseBuilders = {
  discovery: buildDiscoveryConfig,
  validation: buildDnsValidationConfig,
  extraction: buildHttpValidationConfig,
  analysis: buildAnalysisConfig,
};
