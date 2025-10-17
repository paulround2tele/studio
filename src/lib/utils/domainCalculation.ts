// src/lib/utils/domainCalculation.ts
// Production domain calculation utilities
// Uses backend OpenAPI types exclusively

// Generated services-domain-generation-phase-config model not present – structural substitute
interface DomainGenerationParams {
  patternType?: 'prefix' | 'suffix' | 'both';
  characterSet?: string;
  constantString?: string;
  variableLength?: number;
  tlds?: string[];
}
type DomainGenerationParamsExtended = DomainGenerationParams & {
  // Optional explicit per-side lengths when patternType is 'both'; not in backend yet
  prefixVariableLength?: number;
  suffixVariableLength?: number;
};

/**
 * Calculate maximum theoretical domains for a given configuration
 * Uses backend-defined types exclusively (when they exist)
 */
export function calculateMaxTheoreticalDomains(config: DomainGenerationParamsExtended): number {
  if (!config) return 0;

  const { patternType, characterSet, variableLength, prefixVariableLength, suffixVariableLength } = config;
  const charSetLength = characterSet?.length || 26;
  const legacy = variableLength ?? 0;
  const prefixLength = typeof prefixVariableLength === 'number'
    ? Math.max(0, prefixVariableLength)
    : patternType === 'prefix'
    ? legacy
    : patternType === 'both'
    ? Math.floor(legacy / 2)
    : 0;
  const suffixLength = typeof suffixVariableLength === 'number'
    ? Math.max(0, suffixVariableLength)
    : patternType === 'suffix'
    ? legacy
    : patternType === 'both'
    ? legacy - Math.floor(legacy / 2)
    : 0;

  switch (patternType) {
    case 'prefix':
      return prefixLength > 0 ? Math.pow(charSetLength, prefixLength) : 1;
    case 'suffix':
      return suffixLength > 0 ? Math.pow(charSetLength, suffixLength) : 1;
    case 'both': {
      const prefixCombos = prefixLength > 0 ? Math.pow(charSetLength, prefixLength) : 1;
      const suffixCombos = suffixLength > 0 ? Math.pow(charSetLength, suffixLength) : 1;
      return prefixCombos * suffixCombos;
    }
    default:
      return 0;
  }
}

/**
 * Calculate remaining domains in sequence for a configuration
 * This would typically check against backend state, but for now provides estimate
 */
export function calculateRemainingDomains(
  config: DomainGenerationParamsExtended,
  currentOffset: number = 0
): number {
  const maxTheoretical = calculateMaxTheoreticalDomains(config);
  return Math.max(0, maxTheoretical - currentOffset);
}

/**
 * Validate domain generation configuration using backend schema
 */
export function validateDomainConfig(config: DomainGenerationParamsExtended): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.constantString?.trim()) {
    errors.push('Constant string is required');
  }

  if (!config.characterSet?.trim()) {
    errors.push('Character set is required');
  }

  const legacy = config.variableLength ?? 0;
  const prefixLength = typeof config.prefixVariableLength === 'number' ? config.prefixVariableLength : legacy;
  const suffixLength = typeof config.suffixVariableLength === 'number' ? config.suffixVariableLength : legacy;

  if (config.patternType === 'both') {
    if ((config.prefixVariableLength ?? 0) < 1 || (config.suffixVariableLength ?? 0) < 1) {
      errors.push('Both prefix and suffix variable lengths must be at least 1');
    }
  } else if (config.patternType === 'prefix') {
    if (prefixLength < 1) {
      errors.push('Prefix variable length must be at least 1');
    }
  } else if (config.patternType === 'suffix') {
    if (suffixLength < 1) {
      errors.push('Suffix variable length must be at least 1');
    }
  }

  if (!config.tlds?.length || !config.tlds.some((tld: string) => tld.trim())) {
    errors.push('At least one valid TLD is required');
  }

  if (!config.patternType || !['prefix', 'suffix', 'both'].includes(config.patternType)) {
    errors.push('Pattern type must be prefix, suffix, or both');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
