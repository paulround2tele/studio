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

  const { patternType, characterSet, variableLength, prefixVariableLength, suffixVariableLength } = config as any;
  const charSetLength = characterSet?.length || 26;

  switch (patternType) {
    case 'prefix':
      return variableLength ? Math.pow(charSetLength, variableLength) : 0;
    case 'suffix':
      return variableLength ? Math.pow(charSetLength, variableLength) : 0;
    case 'both':
      // If explicit side lengths provided, use them; otherwise derive equally from variableLength
      const pvl = typeof prefixVariableLength === 'number' && prefixVariableLength >= 0
        ? prefixVariableLength
        : Math.floor((variableLength || 0) / 2);
      const svl = typeof suffixVariableLength === 'number' && suffixVariableLength >= 0
        ? suffixVariableLength
        : Math.ceil((variableLength || 0) / 2);
      const prefixCombos = pvl > 0 ? Math.pow(charSetLength, pvl) : 1;
      const suffixCombos = svl > 0 ? Math.pow(charSetLength, svl) : 1;
      return prefixCombos * suffixCombos;
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

  if (config.patternType === 'both') {
    const p = Number(config.prefixVariableLength ?? 0);
    const s = Number(config.suffixVariableLength ?? 0);
    if (p < 1 || s < 1) {
      errors.push('Both prefix and suffix variable lengths must be at least 1');
    }
  } else if (!config.variableLength || config.variableLength < 1) {
    errors.push('Variable length must be at least 1');
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
